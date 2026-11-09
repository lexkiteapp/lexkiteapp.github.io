import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

// MARK: - situation content + the learner's `lk.spk`

/// `localStorage lk.spk` of the web (progress of #/speak, on the device only): one JSON text in UserDefaults.
enum SpeakSitStore {
    static func load(_ d: UserDefaults) -> JSON {
        guard let s = d.string(forKey: SpeakSit.storeKey), let j = try? JSON.parse(s), j.isObject else { return .object([:]) }
        return j
    }
    static func save(_ j: JSON, _ d: UserDefaults) { d.set(j.stableString, forKey: SpeakSit.storeKey) }
}

/// A situation is fetched when opened (`cpack/speak/s/<id>.js` + the UI language's `<id>.<lang>.js`), like the web; an id that is not in the index is unknown.
@MainActor
enum SpeakSitSource {
    enum Loaded { case found(JSON), unknown, failed }
    private static var memo: [String: JSON] = [:]
    private static var ids: [String: Set<String>]?   // id → languages that have a translation
    static func path(_ id: String, lang: String? = nil) -> String { "cpack/speak/s/\(id)\(lang.map { "." + $0 } ?? "").js" }
    /// `SPK_IDX` of web/js/speak/data.js: {id: {g, c, l: "vi es …"}}
    static func index(_ source: LessonTextSource) async -> [String: Set<String>]? {
        if let ids { return ids }
        guard let js = await source.text("js/speak/data.js"), let r = js.range(of: "SPK_IDX = "), let end = js[r.upperBound...].range(of: ";\n"),
              let j = try? JSON.parse(String(js[r.upperBound..<end.lowerBound])), let o = j.object else { return nil }
        ids = o.mapValues { Set($0.s("l").split(separator: " ").map(String.init)) }
        return ids
    }
    static func load(_ id: String, lang: String, source: LessonTextSource = LessonRemote.shared) async -> Loaded {
        let key = id + "." + lang
        if let m = memo[key] { return .found(m) }
        let ix = await index(source)
        if let ix, ix[id] == nil { return .unknown }
        guard let base = await source.text(path(id)) else { return .failed }
        var tr: String?
        if lang != "en", ix?[id]?.contains(lang) ?? true { tr = await source.text(path(id, lang: lang)) }
        guard let s = SpeakSit.situation(base: base, translation: tr, lang: lang) else { return .failed }
        memo[key] = s
        return .found(s)
    }
}

// MARK: - #/speak/<id>  (Stitch pas-sit)

@MainActor @Observable
final class SpeakSituationModel {
    enum Phase: Equatable { case loading, ready, failed, unknown }
    let ctx: SkillsContext
    let id: String
    let teacher: TeacherController
    private(set) var phase: Phase = .loading
    private(set) var situation: JSON = .null
    private(set) var hub: SpeakSit.Hub?
    var cultureOpen = false
    private let source: LessonTextSource

    init(ctx: SkillsContext, id: String, situation: JSON? = nil, source: LessonTextSource = LessonRemote.shared, teacher: TeacherController? = nil) {
        self.ctx = ctx; self.id = id; self.source = source
        self.teacher = teacher ?? TeacherController(who: SpeakAccent.ama)
        if let situation { self.situation = situation; phase = .ready; rebuild() }
    }
    func rebuild() {
        let week = SpeakSit.weekKey(ctx.now, calendar: ctx.core.clock.calendar)
        hub = SpeakSit.hub(situation, lang: ctx.lang, store: SpeakSitStore.load(ctx.defaults), week: week, cards: ctx.bundle.cards)
    }
    func load() async {
        await ctx.reload()
        if phase == .ready { rebuild(); return }
        switch await SpeakSitSource.load(id, lang: ctx.lang, source: source) {
        case .found(let s): situation = s; phase = .ready; rebuild()
        case .unknown: phase = .unknown
        case .failed: phase = .failed
        }
    }
}

// MARK: - #/speak/<id>/drill  (Stitch pas-drill)

@MainActor @Observable
final class SpeakDrillModel {
    let ctx: SkillsContext
    let io: SpeakIO
    let teacher: TeacherController
    private(set) var drill: SpeakDrill
    private(set) var recording = false
    private(set) var finishedCount: Int?
    private(set) var phase: SpeakSituationModel.Phase = .ready

    init(ctx: SkillsContext, io: SpeakIO, situation: JSON, stage: String?, teacher: TeacherController? = nil) {
        self.ctx = ctx; self.io = io
        self.teacher = teacher ?? TeacherController(who: SpeakAccent.ama)
        let week = SpeakSit.weekKey(ctx.now, calendar: ctx.core.clock.calendar)
        drill = SpeakDrill(situation, lang: ctx.lang, stage: stage, store: SpeakSitStore.load(ctx.defaults), week: week, shuffle: { a in
            var r = a, k = r.count
            while k > 1 { k -= 1; let j = Int(io.random() * Double(k + 1)); r.swapAt(k, min(j, k)) }
            return r
        })
    }
    /// a model that opens the drill when the situation arrives (the route fetches it first)
    var target: String { drill.target }

    func play(slow: Bool = false) { io.say(drill.target, SpeakAccent.ama, SpeakAccent.us, slow, nil) }

    func mic() async {
        if recording { io.recognizer.cancel(); return }
        io.stopSay()
        recording = true
        drill.micStarted(nowMs: io.clock())
        let r = await io.attempt(target: drill.target, locale: SpeakAccent.us)
        recording = false
        await apply(drill.attempt(r, nowMs: io.clock()))
    }
    func tap(_ k: Int) async { await apply(drill.tap(k)) }
    func next() async { await apply(drill.next()) }
    func retry() async { await apply(drill.retry()) }

    private func apply(_ fx: SpeakDrill.Effect) async {
        if fx.wrote { SpeakSitStore.save(drill.store, ctx.defaults) }
        if let r = fx.reward { await ctx.commit(reward: r) }
        if fx.speakLine { io.say(drill.target, SpeakAccent.ama, SpeakAccent.us, false, nil) }
        if let n = fx.finishedCount { finishedCount = n }
    }

    /// fixtures: the drill after one attempt the platform scored
    func fixtureAttempt(_ r: SpeakScore.Result) { drill.micStarted(nowMs: 0); _ = drill.attempt(r, nowMs: 1000) }
    func fixtureMicBlocked() { drill.micStarted(nowMs: 0); _ = drill.attempt(SpeakScore.result(target: drill.target, heard: "", platformScore: 0, seconds: 0, error: "not-allowed"), nowMs: 0) }
    func fixtureTap(_ count: Int) { for _ in 0..<count { _ = drill.tap(drill.built.count) } }
    func fixtureRecording() { recording = true }
}
