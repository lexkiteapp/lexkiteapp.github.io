import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

// M4 P08 – #/call · what the four screens (list, ring, call, summary) read and write. The rules, the pack and the call itself live in LKStore/Call
// (CallCore, CallSession, tested against vectors/call.json); this file adds the device: the voice + teacher face, the recogniser, the stored choices
// (`vb.call.*`, device-only like the web's localStorage), timers. Everything heavy is injected, so fixtures need no sound, no microphone and no clock.

/// The pack in use: the bundled starter (8 calls) until https://lexkite.com/data/call-pack.json (35 calls) is fetched and cached on disk by `LessonRemote`.
@MainActor
enum CallContentStore {
    struct Content {
        let pack: CallPack, engine: CallEngine, scripts: [CallScript]
        init(_ p: CallPack) { pack = p; engine = CallEngine(rules: p.rules); scripts = p.scripts }
    }
    static let packPath = "data/call-pack.json"
    private(set) static var content = Content(CallPack.bundled() ?? CallPack())
    private static var fetched = false
    static func refresh(source: LessonTextSource = LessonRemote.shared) async {
        guard !fetched else { return }
        fetched = true
        if let text = await source.text(packPath), let p = CallPack.decode(text) { content = Content(p) } else { fetched = false }
    }
    /// fixtures
    static func install(_ p: CallPack) { content = Content(p) }
}

/// What the OS can recognise: on the device (private) / at all (the system may use the cloud, so the learner is asked first)
struct CallCaps: Equatable {
    var onDevice: Bool, system: Bool
    @MainActor static func probe(_ io: SpeakIO, locale: String = SpeakAccent.us) -> CallCaps {
        CallCaps(onDevice: io.recognizer.supportsOnDevice(locale: locale), system: io.recognizer.systemAvailable(locale: locale))
    }
}

/// The device side of one call.
@MainActor
final class CallDevice: CallPlatform {
    let io: SpeakIO
    let defaults: UserDefaults
    var teacher: TeacherController?
    var onToast: (CallToast) -> Void = { _ in }
    var onEnd: (CallEnd) -> Void = { _ in }
    weak var session: CallSession?
    /// fixtures: no real recogniser task, no end-of-line timer (a request is only recorded)
    var live = true
    private(set) var lastRequest: CallListenRequest?
    private var reactToken = 0

    init(io: SpeakIO, defaults: UserDefaults, teacher: TeacherController?) { self.io = io; self.defaults = defaults; self.teacher = teacher }

    func callNow() -> Int64 { io.clock() }
    func callSpeak(_ text: String, who: String, accent: String, onEnd: @escaping () -> Void) {
        var fired = false
        let once: () -> Void = { if !fired { fired = true; onEnd() } }
        io.say(text, who, accent, false, once)
        if live { callAfter(CallSession.fallbackMs(text)) { once() } }   // the player does not always report the end
    }
    func callStopSpeaking() { io.stopSay() }
    func callReact(_ pose: String, ms: Int) {
        guard let teacher else { return }
        reactToken += 1
        let token = reactToken
        teacher.setEmotion(pose)
        callAfter(ms) { [weak self] in
            guard let self, self.reactToken == token, !(self.session?.listening ?? false) else { return }
            teacher.setEmotion("neutral")
        }
    }
    func callTeacherListening(_ on: Bool) { teacher?.listen(on) }
    func callStartListening(_ r: CallListenRequest) -> Bool {
        lastRequest = r
        guard live else { return true }
        let rec = io.recognizer
        Task { @MainActor [weak self] in
            self?.session?.recognizerStarted(r.id)
            let o = await rec.listen(locale: r.accent, maxSeconds: r.continuous == false ? 28 : 15, onDevice: r.processLocally, phrases: r.phrases, onPartial: nil)
            guard let s = self?.session else { return }
            if o.alts.isEmpty, let e = o.error {
                s.recognizerError(r.id, code: e)
            } else {
                let b = Recognize.best(target: r.target, alts: o.alts)   // the closest to the model sentence wins; the score is its similarity
                s.recognizerResult(r.id, heard: b.heard, score: b.score)
            }
            s.recognizerEnded(r.id)
        }
        return true
    }
    func callStopListening() { io.recognizer.stop() }
    func callAfter(_ ms: Int, _ block: @escaping @MainActor () -> Void) {
        guard live else { return }   // fixtures: no timers
        Task { @MainActor in
            try? await Task.sleep(nanoseconds: UInt64(max(0, ms)) * 1_000_000)
            block()
        }
    }
    func callPhase(_ phase: CallPhase) {}
    func callToast(_ toast: CallToast) { onToast(toast) }
    func callPref(_ key: String) -> String? { defaults.string(forKey: key) }
    func callSetPref(_ key: String, _ value: String?) { if let value { defaults.set(value, forKey: key) } else { defaults.removeObject(forKey: key) } }
    func callEnded(_ end: CallEnd) { onEnd(end) }
}

// MARK: - the call

@MainActor @Observable
final class CallRunModel {
    let script: CallScript
    let session: CallSession
    let teacher: TeacherController
    let device: CallDevice
    var input = ""
    private(set) var toast: CallToast?
    private(set) var translations: [String: String] = [:]
    private(set) var canTranslate: Bool
    private(set) var elapsed = 0
    var onEnd: (CallEnd) -> Void = { _ in }
    @ObservationIgnored private var ticker: Task<Void, Never>?
    private let ctx: SkillsContext

    init(ctx: SkillsContext, script: CallScript, engine: CallEngine, caps: CallCaps, io: SpeakIO, teacher: TeacherController? = nil, live: Bool = true) {
        self.ctx = ctx; self.script = script
        let tc = teacher ?? TeacherController(who: script.who)
        self.teacher = tc
        let d = CallDevice(io: io, defaults: ctx.defaults, teacher: tc)
        d.live = live
        device = d
        let defaults = ctx.defaults
        canTranslate = ctx.lang != "en"
        session = CallSession(script: script, engine: engine, l10n: L10n(lang: ctx.lang), canTranslate: ctx.lang != "en", platform: d,
                              mode: { CallAsr.modeNative(onDevice: caps.onDevice, system: caps.system, pref: defaults.string(forKey: CallList.asrKey)) })
        d.session = session
        d.onToast = { [weak self] t in self?.toast = t }
        d.onEnd = { [weak self] e in self?.finished(e) }
        if live { ctx.core.voice.teacher = tc }   // the mouth follows the voice (lip sync)
    }

    /// the call begins: the teacher's first line, the clock, the subtitles
    func start() {
        session.begin()
        ticker = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 500_000_000)
                guard let self, !self.session.ended else { return }
                self.session.tick(); self.elapsed = self.session.elapsed
            }
        }
        if canTranslate { Task { await loadTranslations() } }
    }
    /// leaving the screen without ending (back, app closed)
    func stop() { ticker?.cancel(); session.abandon(); device.callStopSpeaking(); device.io.recognizer.cancel() }
    private func finished(_ e: CallEnd) { ticker?.cancel(); onEnd(e) }

    func clearToast() { toast = nil }
    func fixtureElapsed(_ s: Int) { elapsed = s }
    func send() { let v = input; guard !v.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }; input = ""; session.submitTyped(v) }

    // MARK: subtitles – every teacher line translated ONCE; the same number of lines back, or none (web `Dict.translateTo`)
    var pieces: [String] {
        var out: [String] = [], seen = Set<String>()
        for id in script.nodes.keys.sorted() {
            guard let n = script.nodes[id] else { continue }
            for p in [n.m, n.re] + n.br.map(\.line) where !p.isEmpty && seen.insert(p).inserted { out.append(p) }
        }
        if !script.end.isEmpty, seen.insert(script.end).inserted { out.append(script.end) }
        return out
    }
    private func loadTranslations() async {
        let ps = pieces
        guard !ps.isEmpty else { return }
        let out = await ctx.translate(ps.joined(separator: "\n"), with: ctx.makeService())
        let ls = out.components(separatedBy: "\n")
        guard ls.count == ps.count else { return }
        for (p, l) in zip(ps, ls) { translations[p] = l }
    }
    /// the second caption line: only when every shown line has its translation
    var translatedLine: String? {
        guard session.showTranslation, !session.captions.isEmpty, session.captions.allSatisfy({ translations[$0] != nil }) else { return nil }
        return session.captions.compactMap { translations[$0] }.joined(separator: " ")
    }

    /// fixtures: a call replayed through the real session with a silent voice and a scripted answer list; `chunks` are heard by the recogniser
    static func fixture(ctx: SkillsContext, script: CallScript, engine: CallEngine, caps: CallCaps = CallCaps(onDevice: true, system: true), taps: [Int] = [],
                        talking: Bool = false, chunks: [String] = [], advanceMs: Int64 = 0) -> CallRunModel {
        var t: Int64 = 1_767_603_600_000
        let io = SpeakIO(recognizer: ScriptedRecognizer(), say: { _, _, _, _, end in if !talking { end?() } }, stopSay: {}, clock: { t })
        let m = CallRunModel(ctx: ctx, script: script, engine: engine, caps: caps, io: io, teacher: TeacherController.frozen(who: script.who, pose: "talk"), live: false)
        m.session.begin()
        for k in taps { m.session.tapOption(k) }
        if !chunks.isEmpty {
            m.session.micPressed()
            for c in chunks {
                if let id = m.device.lastRequest?.id { m.session.recognizerResult(id, heard: c, score: nil); m.session.recognizerEnded(id) }
            }
        }
        if advanceMs > 0 { t += advanceMs; m.session.tick() }   // the clock of the long turn / the prep countdown
        return m
    }
}

// MARK: - the summary

@MainActor @Observable
final class CallSummaryModel {
    let ctx: SkillsContext
    let summary: CallSummary
    private(set) var savedCount: Int?
    private(set) var saving = false
    init(ctx: SkillsContext, summary: CallSummary) { self.ctx = ctx; self.summary = summary }
    var script: CallScript { summary.script }
    var recap: CallRecap { summary.recap }
    /// "Thêm vào thẻ ôn": the phrases, then the grammar fixes (topic call, 📞)
    func save() async {
        guard savedCount == nil, !saving else { return }
        saving = true
        let cards = summary.cards
        for c in cards { await ctx.addWord(c.entry, context: c.context) }
        savedCount = cards.count; saving = false
    }
    func say(_ text: String, slow: Bool = false) { ctx.core.voice.speak(text, who: script.who, accent: SpeakAccent.us, slow: slow) }
    func sayWord(_ w: String) { ctx.core.voice.speakWord(w, who: script.who, accent: SpeakAccent.us) }
    func fixtureSaved(_ n: Int) { savedCount = n }
}

// MARK: - the flow: list → ring → call → summary (one pushed route, like the web's #/call and #/call/<id>)

@MainActor @Observable
final class CallFlowModel {
    enum Screen { case list, ring(CallScript), call, summary }
    let ctx: SkillsContext
    private(set) var content: CallContentStore.Content
    let caps: CallCaps
    private var pendingArg: String?
    private(set) var screen: Screen = .list
    private(set) var filter: String
    private(set) var asrPref: String?
    private(set) var asrNotice = false
    private(set) var run: CallRunModel?
    private(set) var summary: CallSummaryModel?
    private let io: () -> SpeakIO
    /// the route asked to close (the list's back, or a call without answers when it was opened from outside)
    var close: () -> Void = {}
    /// open another route (a sound pair's lesson)
    var route: (AppRoute) -> Void = { _ in }

    init(ctx: SkillsContext, arg: String?, caps: CallCaps, io: @escaping () -> SpeakIO, content: CallContentStore.Content? = nil) {
        self.ctx = ctx; self.caps = caps; self.io = io
        self.content = content ?? CallContentStore.content
        pendingArg = arg
        filter = CallList.filter(stored: ctx.defaults.string(forKey: CallList.fltKey))
        asrPref = ctx.defaults.string(forKey: CallList.asrKey)
        if let id = arg, let s = self.content.scripts.first(where: { $0.id == id }) { screen = .ring(s) }   // an unknown id ⇒ the list
    }
    /// the full pack arrived: use it, unless a call is going on; a call asked for by id that only the full pack has opens now
    func adopt(_ c: CallContentStore.Content) {
        guard run == nil, summary == nil else { return }
        content = c
        if case .list = screen, let id = pendingArg, let s = c.scripts.first(where: { $0.id == id }) { screen = .ring(s); pendingArg = nil }
    }
    var scripts: [CallScript] { content.scripts }
    var engine: CallEngine { content.engine }
    var shown: [CallScript] { CallList.filtered(scripts, filter) }
    var mode: CallAsr.Mode { CallAsr.modeNative(onDevice: caps.onDevice, system: caps.system, pref: asrPref) }
    /// the Vietnamese key the web passes to `t()` for the title of a call; "" = the English title
    func nameKey(_ s: CallScript) -> String { engine.rules.names[s.id] ?? "" }

    func setFilter(_ g: String) { filter = g; ctx.defaults.set(g, forKey: CallList.fltKey) }
    /// "Đổi cách nhận dạng": the next call asks again
    func resetAsr() { ctx.defaults.removeObject(forKey: CallList.asrKey); asrPref = nil; asrNotice = true }
    func clearNotice() { asrNotice = false }
    func openRing(_ s: CallScript) { screen = .ring(s) }
    func toList() { pendingArg = nil; run?.stop(); run = nil; summary = nil; asrPref = ctx.defaults.string(forKey: CallList.asrKey); screen = .list }

    func startCall(_ s: CallScript) {
        let r = CallRunModel(ctx: ctx, script: s, engine: engine, caps: caps, io: io())
        r.onEnd = { [weak self] e in self?.ended(e) }
        run = r; screen = .call
        r.start()
    }
    private func ended(_ e: CallEnd) {
        switch e {
        case .exit: toList()   // hung up before any answer: back to #/call, no reward, no summary
        case .summary(let s):
            let m = CallSummaryModel(ctx: ctx, summary: s)
            summary = m; run = nil; screen = .summary
            Task { [ctx] in await ctx.commit(reward: s.reward) }   // `App.reward({ spoken, xp })` once, when the summary opens
        }
    }
    /// "Luyện lại n câu yếu": a retry call of the weak turns, same teacher
    func retryWeak() {
        guard let s = summary?.summary else { return }
        let base = scripts.first { $0.id == s.script.id } ?? s.script
        startCall(engine.retry(base, s.recap.weak))
    }
    /// "Gọi lại"
    func callAgain() { if let s = summary?.script { let base = scripts.first { $0.id == s.id } ?? s; run = nil; summary = nil; screen = .ring(base) } }
    func hang() { run?.session.hang() }
    func leave() { run?.stop(); run = nil }

    /// fixtures
    func fixtureShow(_ screen: Screen, run: CallRunModel? = nil, summary: CallSummaryModel? = nil) { self.screen = screen; self.run = run; self.summary = summary }
    func fixtureAsr(_ pref: String?) { asrPref = pref }
}
