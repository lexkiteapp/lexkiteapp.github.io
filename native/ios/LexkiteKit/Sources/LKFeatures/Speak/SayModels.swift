import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings
#if canImport(UIKit)
import UIKit
#endif

/// #/say: the series list → a card (front / back). The route changes of the web (`#/say/<series>/<card>`) are state here: the screen stays one focus screen,
/// "back" on a card returns to the list (web: `#/say`), on the list it closes. Sound, microphone and clock come from `SpeakIO`; the seen set is `lk.say.seen`.
@MainActor @Observable
final class SayModel {
    enum Phase: Equatable { case loading, error, list, card }
    let ctx: SkillsContext
    let io: SpeakIO
    private(set) var phase: Phase = .loading
    private(set) var series: [JSON] = []
    private(set) var seen: Set<String> = []
    private(set) var si = 0
    private(set) var ii = 0
    private(set) var flipped = false
    private(set) var mic: SpeakMic.State = .idle
    private(set) var micLine: SayMsg?
    private(set) var micHeard = ""
    /// what was spoken, in order (tests and fixtures read it; the web has no such log)
    private(set) var spoken: [(text: String, slow: Bool)] = []
    var showShare = false
    var shareTall = false
    private(set) var notice: SayMsg?
    private let arg: String
    private let preset: [JSON]?

    init(ctx: SkillsContext, io: SpeakIO, arg: String?, series: [JSON]? = nil) {
        self.ctx = ctx; self.io = io; self.arg = arg ?? ""; preset = series
    }
    /// fixed state for fixtures: the list, or a card on a face
    static func fixture(ctx: SkillsContext, series: [JSON], arg: String? = nil, flipped: Bool = false, mic: (score: Int, heard: String)? = nil, io: SpeakIO? = nil) -> SayModel {
        let m = SayModel(ctx: ctx, io: io ?? .scripted(), arg: arg, series: series)
        m.series = series; m.seen = SayCore.seen(ctx.defaults)
        if series.isEmpty { m.phase = .error; return m }
        m.apply(SayCore.route(arg ?? "", series))
        m.flipped = flipped
        if let mic { let r = SayCore.micResult(score: mic.score, heard: mic.heard); m.micLine = r.text; m.micHeard = r.heardAppended ? mic.heard : "" }
        return m
    }

    func load() async {
        guard phase == .loading else { return }
        await ctx.reload()
        if let preset { series = preset } else {
            await SpeakContentStore.refresh()
            series = SpeakContentStore.say.list("series")
        }
        if series.isEmpty { phase = .error; return }
        seen = SayCore.seen(ctx.defaults)
        apply(SayCore.route(arg, series))
    }
    func retry() { phase = .loading; Task { await load() } }

    private func apply(_ r: SayCore.Route) {
        switch r {
        case .list: phase = .list
        case .replace(let s, let c):
            if let a = series.firstIndex(where: { $0.s("id") == s }), let b = series[a].list("items").firstIndex(where: { $0.s("id") == c }) { open(a, b) } else { phase = .list }
        case .card(let a, let b): open(a, b)
        }
    }
    func open(_ a: Int, _ b: Int) {
        si = a; ii = b; flipped = false; mic = .idle; micLine = nil; micHeard = ""; phase = .card
        SayCore.markSeen(SayCore.cardKey(series[a], b), in: ctx.defaults)
        seen = SayCore.seen(ctx.defaults)
    }
    func openFirst(_ r: SayCore.Row) { if let a = series.firstIndex(where: { $0.s("id") == r.series }), let b = series[a].list("items").firstIndex(where: { $0.s("id") == r.firstCard }) { open(a, b) } }
    func nextCard() { let n = series[si].list("items").count; open(si, (ii + 1) % n) }
    func flip() { stopAll(); flipped.toggle() }
    /// back: card → list; list → false (the screen closes)
    func back() -> Bool { if phase == .card { stopAll(); phase = .list; return true }; return false }

    // MARK: derived
    var rows: [SayCore.Row] { SayCore.rows(series, seen: seen) }
    var current: JSON { series[si] }
    var item: JSON { series[si].list("items")[ii] }
    var front: SayCore.Front { SayCore.front(current, ii) }
    func back(langName: @escaping (String) -> String) -> SayCore.Back { SayCore.back(current, ii, learnLang: ctx.lang, langName: langName) }
    var teacher: String { current.s("teacher") }

    // MARK: actions
    /// 🔊 and 🎧: the card sentence with the series teacher, en-US; the "don't say" line is never spoken
    func speak(slow: Bool) {
        let text = item.s("say")
        spoken.append((text, slow))
        io.say(text, teacher, SayCore.accent, slow, nil)
    }
    func stopAll() { io.stopSay(); io.recognizer.cancel(); mic = .idle }
    func toggleMic() async {
        if mic == .listening { io.recognizer.cancel(); return }
        mic = .listening; micLine = SayCore.listening; micHeard = ""
        let o = await io.recognizer.listen(locale: SayCore.accent, maxSeconds: 8, onPartial: nil)
        mic = .idle
        if let e = o.error { micLine = SayCore.micError(e); return }
        let b = Recognize.best(target: item.s("say"), alts: o.alts)
        let r = SayCore.micResult(score: b.score, heard: b.heard)
        micLine = r.text; micHeard = r.heardAppended ? b.heard : ""
    }
    var shareText: SayMsg { SayCore.shareText(current, item) }
    var shareURL: String { SayCore.url(current, item) }
    func copyLink() {
        #if canImport(UIKit)
        UIPasteboard.general.string = shareURL
        #endif
        notice = SayMsg(.speakSayDaChepLink)
    }
    /// the card image as a PNG file for the share sheet (1:1 or 4:5), drawn on the device
    func shareFile(tall: Bool, view: some View) -> URL? {
        #if os(iOS)
        let r = ImageRenderer(content: view)
        r.scale = 1
        guard let data = r.uiImage?.pngData() else { return nil }
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(SayCore.fileName(item, tall: tall))
        return (try? data.write(to: url)) != nil ? url : nil
        #else
        return nil
        #endif
    }
}
