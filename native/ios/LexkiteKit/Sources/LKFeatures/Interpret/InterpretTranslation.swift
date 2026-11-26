import SwiftUI
import Observation
import LKStore
#if os(iOS) && canImport(Translation)
import Translation
#endif

// P14 – on-device translation through Apple's Translation framework (iOS 18+). Its `TranslationSession` exists only inside a SwiftUI `.translationTask`, so the translator is a
// bridge: a request is parked in `job`, the screen's `.interpretTranslation(…)` host runs it in the session of the pair and answers. Below iOS 18 `available` is false and the
// screens show `interpret.unsupported` (the mics stay off). Nothing is downloaded except from `download`, which the "offline pack" tap calls (the system asks for the language packs).

/// The translator of the app for this OS (nil bridge below iOS 18 → `UnsupportedTranslator`).
@MainActor enum InterpretTranslator {
    static func make() -> InterpretTranslating {
        #if os(iOS) && canImport(Translation)
        if #available(iOS 18.0, *) { return AppleTranslationBridge() }
        #endif
        return UnsupportedTranslator()
    }
}

@MainActor final class UnsupportedTranslator: InterpretTranslating {
    var available: Bool { false }
    func translate(_ text: String, from: String, to: String) async -> InterpretTranslated? { nil }
    func download(_ a: String, _ b: String) async -> Bool { false }
}

extension View {
    /// attaches the session host of the translator to the screen (no-op for any other translator)
    @ViewBuilder func interpretTranslation(_ translator: InterpretTranslating) -> some View {
        #if os(iOS) && canImport(Translation)
        if #available(iOS 18.0, *), let b = translator as? AppleTranslationBridge { modifier(AppleTranslationHost(bridge: b)) } else { self }
        #else
        self
        #endif
    }
}

#if os(iOS) && canImport(Translation)
@available(iOS 18.0, *)
@MainActor @Observable
final class AppleTranslationBridge: InterpretTranslating {
    var available: Bool { true }
    /// drives `.translationTask`: a new value (or `invalidate()`) starts the task again
    var config: TranslationSession.Configuration?
    private enum Kind { case translate(String), prepare }
    private struct Job { var id: Int; var kind: Kind; var done: (String?) -> Void }
    @ObservationIgnored private var job: Job?
    @ObservationIgnored private var seq = 0
    /// a translation answers within 8 s; a pack download waits for the person at the system sheet (10 min)
    private static func timeout(_ k: Kind) -> UInt64 { if case .prepare = k { return 600_000_000_000 }; return 8_000_000_000 }

    /// app language code → the language of the framework (Chinese = simplified, Portuguese = Brazil)
    static func language(_ l: String) -> Locale.Language {
        let b = Interpret.base(l)
        return Locale.Language(identifier: b == "zh" ? "zh-Hans" : b == "pt" ? "pt-BR" : b)
    }
    private func installed(_ a: String, _ b: String) async -> Bool { await LanguageAvailability().status(from: Self.language(a), to: Self.language(b)) == .installed }

    func translate(_ text: String, from: String, to: String) async -> InterpretTranslated? {
        if Interpret.base(from) == Interpret.base(to) { return InterpretTranslated(text: text, local: true) }
        guard await installed(from, to) else { return nil }   // translate never downloads: no pack → nil, like the Android route
        return await submit(.translate(text), from, to).map { InterpretTranslated(text: $0, local: true) }
    }
    func download(_ a: String, _ b: String) async -> Bool {
        for (x, y) in [(a, b), (b, a)] {
            if await installed(x, y) { continue }
            _ = await submit(.prepare, x, y)
        }
        let ab = await installed(a, b), ba = await installed(b, a)
        return ab && ba
    }

    private func submit(_ kind: Kind, _ from: String, _ to: String) async -> String? {
        seq += 1; let id = seq
        let cfg = TranslationSession.Configuration(source: Self.language(from), target: Self.language(to))
        return await withCheckedContinuation { (c: CheckedContinuation<String?, Never>) in
            job = Job(id: id, kind: kind, done: { c.resume(returning: $0) })
            if var cur = config, cur == cfg { cur.invalidate(); config = cur } else { config = cfg }
            Task { [weak self] in try? await Task.sleep(nanoseconds: Self.timeout(kind)); self?.finish(id, nil) }
        }
    }
    /// answers the job once (the session, or the timeout of a screen that is gone)
    private func finish(_ id: Int, _ value: String?) {
        guard let j = job, j.id == id else { return }
        job = nil; j.done(value)
    }
    /// called by the host with the session of the current configuration
    func run(_ session: TranslationSession) async {
        guard let j = job else { return }
        switch j.kind {
        case .translate(let text):
            do { finish(j.id, try await session.translate(text).targetText) } catch { finish(j.id, nil) }
        case .prepare:
            do { try await session.prepareTranslation(); finish(j.id, "") } catch { finish(j.id, nil) }
        }
    }
}

@available(iOS 18.0, *)
struct AppleTranslationHost: ViewModifier {
    let bridge: AppleTranslationBridge
    func body(content: Content) -> some View {
        content.translationTask(bridge.config) { session in await bridge.run(session) }
    }
}
#endif
