// Plugin Capacitor "LexAI": AI có sẵn trên iPhone (miễn phí, chạy trên máy). Gọi từ web/js/ai-local.js (chỉ trong app gốc).
// - Apple Foundation Models (iOS 26+, máy có Apple Intelligence): prompt / summarize / proofread.
// - Apple Translation: iOS 26 dùng TranslationSession(installedSource:target:) (không cần SwiftUI, chỉ gói đã cài);
//   iOS 18–25 hoặc cần tải gói → view SwiftUI ẩn 1×1 với .translationTask (tải chỉ khi JS gửi allowDownload sau khi người dùng bấm).
// - NaturalLanguage NLLanguageRecognizer: dò ngôn ngữ (mọi iOS).
// Biên dịch được với deployment target 15 và cả SDK cũ (#if canImport + #available); framework mới được weak-link (OTHER_LDFLAGS).
// Mọi hàm không throw: lỗi/không có/quá giờ → resolve(["unavailable": true]). Xem docs/AI-LOCAL.md.
import Foundation
import Capacitor
import NaturalLanguage
import SwiftUI
#if canImport(Translation)
import Translation
#endif
#if canImport(FoundationModels)
import FoundationModels
#endif

// Chạy tác vụ async có giới hạn thời gian; quá giờ / lỗi → nil. Trả ngay khi hết giờ (không chờ tác vụ không huỷ được).
private final class LexOnce<T>: @unchecked Sendable {
    private let lock = NSLock(); private var done = false; private let c: CheckedContinuation<T?, Never>
    init(_ c: CheckedContinuation<T?, Never>) { self.c = c }
    func fire(_ v: T?) { lock.lock(); defer { lock.unlock() }; if done { return }; done = true; c.resume(returning: v) }
}
private func lexRun<T>(_ seconds: Double, _ work: @escaping () async throws -> T?) async -> T? {
    await withCheckedContinuation { (c: CheckedContinuation<T?, Never>) in
        let once = LexOnce(c)
        let job = Task { let v = try? await work(); once.fire(v) }
        Task { try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000)); job.cancel(); once.fire(nil) }
    }
}

@objc(LexAIPlugin)
public class LexAIPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LexAIPlugin"
    public let jsName = "LexAI"
    public let pluginMethods: [CAPPluginMethod] = ["caps", "prompt", "translate", "detect", "proofread", "summarize", "download"].map {
        CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise)
    }

    private func none(_ why: String = "") -> [String: Any] { ["unavailable": true, "reason": why] }
    private func secs(_ call: CAPPluginCall, _ def: Double) -> Double { min(max(Double(call.getInt("timeout") ?? Int(def * 1000)) / 1000, 0.5), 60) }

    // ---------- Foundation Models ----------
    private func lmStatus() -> String {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            switch SystemLanguageModel.default.availability {
            case .available: return "available"
            case .unavailable(.modelNotReady): return "downloading" // hệ thống tự tải khi bật Apple Intelligence
            default: return "unavailable"
            }
        }
        #endif
        return "unavailable"
    }

    private func lmRespond(_ text: String, system: String?, maxTokens: Int, timeout: Double) async -> String? {
        #if canImport(FoundationModels)
        if #available(iOS 26.0, *) {
            guard case .available = SystemLanguageModel.default.availability else { return nil }
            return await lexRun(timeout) {
                let s = (system?.isEmpty == false) ? LanguageModelSession(instructions: system!) : LanguageModelSession()
                let r = try await s.respond(to: String(text.prefix(12_000)), options: GenerationOptions(temperature: 0.3, maximumResponseTokens: max(16, min(maxTokens, 1024))))
                let out = r.content.trimmingCharacters(in: .whitespacesAndNewlines)
                return out.isEmpty ? nil : out
            }
        }
        #endif
        return nil
    }

    // ---------- Translation ----------
    private func trStatus() async -> String {
        #if canImport(Translation)
        if #available(iOS 18.0, *) { return "downloadable" }
        #endif
        return "unavailable"
    }

    @objc func caps(_ call: CAPPluginCall) {
        Task {
            let lm = lmStatus()
            let tr = await trStatus()
            call.resolve(["native": true, "platform": "ios", "prompt": lm, "summarize": lm, "proofread": lm, "rewrite": lm, "write": lm,
                          "translate": tr, "detect": "available", "metered": false])
        }
    }

    @objc func prompt(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else { call.resolve(none("text")); return }
        let system = call.getString("system"), maxT = call.getInt("maxTokens") ?? 256, t = secs(call, 20)
        Task {
            if let out = await lmRespond(text, system: system, maxTokens: maxT, timeout: t) { call.resolve(["text": out]) } else { call.resolve(none()) }
        }
    }

    @objc func summarize(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else { call.resolve(none("text")); return }
        let t = secs(call, 20)
        Task {
            let sys = "Summarize the user's text in English in at most three short bullet points. Output only the summary."
            if let out = await lmRespond(text, system: sys, maxTokens: 300, timeout: t) { call.resolve(["text": out]) } else { call.resolve(none()) }
        }
    }

    @objc func proofread(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else { call.resolve(none("text")); return }
        let t = secs(call, 15)
        Task {
            let sys = "You are an English proofreader. Fix grammar, spelling and punctuation with minimal changes. Output only the corrected text, nothing else."
            if let out = await lmRespond(String(text.prefix(1000)), system: sys, maxTokens: 600, timeout: t) { call.resolve(["corrected": out]) } else { call.resolve(none()) }
        }
    }

    @objc func translate(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty, text.count <= 5000,
              let from = call.getString("from"), let to = call.getString("to"), from != to else { call.resolve(none("input")); return }
        let allow = call.getBool("allowDownload") ?? false, t = secs(call, allow ? 600 : 10)
        #if canImport(Translation)
        if #available(iOS 18.0, *) {
            Task { call.resolve(await self.translate18(text, from: from, to: to, allowDownload: allow, timeout: t)) }
            return
        }
        #endif
        call.resolve(none("os"))
    }

    #if canImport(Translation)
    @available(iOS 18.0, *)
    private func translate18(_ text: String, from: String, to: String, allowDownload: Bool, timeout: Double) async -> [String: Any] {
        let src = Locale.Language(identifier: from), dst = Locale.Language(identifier: to)
        let st = await LanguageAvailability().status(from: src, to: dst)
        if st == .unsupported { return none("unsupported") }
        if st != .installed && !allowDownload { var r = none("downloadable"); r["status"] = "downloadable"; return r }
        #if canImport(FoundationModels) // SDK iOS 26: có TranslationSession(installedSource:target:) – không cần SwiftUI
        if #available(iOS 26.0, *), st == .installed {
            let out: String? = await lexRun(timeout) {
                let s = TranslationSession(installedSource: src, target: dst)
                return try await s.translate(text).targetText
            }
            if let o = out?.trimmingCharacters(in: .whitespacesAndNewlines), !o.isEmpty { return ["text": o] }
            return none()
        }
        #endif
        let out = await LexTranslateHost.run(text: text, src: src, dst: dst, prepare: st != .installed, bridge: bridge, timeout: timeout)
        if let o = out?.trimmingCharacters(in: .whitespacesAndNewlines), !o.isEmpty { return ["text": o] }
        return none()
    }
    #endif

    @objc func detect(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { call.resolve(none("text")); return }
        DispatchQueue.global(qos: .userInitiated).async {
            let r = NLLanguageRecognizer()
            r.processString(String(text.prefix(2000)))
            let hyp = r.languageHypotheses(withMaximum: 3).sorted { $0.value > $1.value }
            guard let top = hyp.first, top.key != .undetermined else { call.resolve(self.none("und")); return }
            call.resolve(["lang": top.key.rawValue, "confidence": top.value,
                          "all": hyp.map { ["lang": $0.key.rawValue, "confidence": $0.value] }])
        }
    }

    // Tải gói dịch (iOS hiện hộp thoại hệ thống). Mô hình Apple Intelligence do hệ thống quản lý → không tải từ app.
    @objc func download(_ call: CAPPluginCall) {
        let kind = call.getString("kind") ?? "prompt"
        #if canImport(Translation)
        if kind == "translate", #available(iOS 18.0, *) {
            let src = Locale.Language(identifier: call.getString("from") ?? "en"), dst = Locale.Language(identifier: call.getString("to") ?? "")
            Task {
                let ok = await LexTranslateHost.run(text: nil, src: src, dst: dst, prepare: true, bridge: self.bridge, timeout: 600)
                call.resolve(ok != nil ? ["ok": true] : self.none())
            }
            return
        }
        #endif
        call.resolve(lmStatus() == "available" ? ["ok": true] : none("system"))
    }
}

#if canImport(Translation)
// View SwiftUI ẩn 1×1 gắn vào bridge để lấy TranslationSession qua .translationTask (cách Apple hỗ trợ trên iOS 18–25)
@available(iOS 18.0, *)
private struct LexTranslateView: View {
    let config: TranslationSession.Configuration
    let work: (TranslationSession) async -> Void
    var body: some View {
        Color.clear.frame(width: 1, height: 1).allowsHitTesting(false).translationTask(config) { s in await work(s) }
    }
}

@available(iOS 18.0, *)
private enum LexTranslateHost {
    // text = nil → chỉ chuẩn bị/tải gói; trả "" khi xong
    @MainActor
    static func run(text: String?, src: Locale.Language, dst: Locale.Language, prepare: Bool, bridge: CAPBridgeProtocol?, timeout: Double) async -> String? {
        guard let host = bridge?.viewController else { return nil }
        var hc: UIHostingController<LexTranslateView>?
        let out: String? = await lexRun(timeout) {
            try await withCheckedThrowingContinuation { (cont: CheckedContinuation<String?, Error>) in
                Task { @MainActor in
                    let v = LexTranslateView(config: .init(source: src, target: dst)) { s in
                        do {
                            if prepare { try await s.prepareTranslation() }
                            if let t = text { cont.resume(returning: try await s.translate(t).targetText) } else { cont.resume(returning: "") }
                        } catch { cont.resume(returning: nil) }
                    }
                    let c = UIHostingController(rootView: v)
                    c.view.frame = CGRect(x: 0, y: 0, width: 1, height: 1)
                    c.view.isUserInteractionEnabled = false
                    c.view.backgroundColor = .clear
                    host.addChild(c); host.view.addSubview(c.view); c.didMove(toParent: host)
                    hc = c
                }
            }
        }
        if let c = hc { c.willMove(toParent: nil); c.view.removeFromSuperview(); c.removeFromParent() }
        return out
    }
}
#endif
