import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

/// #/reflex: 60 seconds · hear a short line → repeat it at once → every word coloured (right / missing). The rules are `ReflexCore`; the clock is `tick()`
/// (a once-a-second task in the app, called directly by tests), the microphone is `SpeakIO`.
@MainActor @Observable
final class ReflexModel {
    enum Stage: Equatable {
        case idle
        /// "Listen carefully…" (clip playing, or the 5 s embed)
        case hearing(embed: String?)
        /// "Repeat what you just heard…" – the recogniser is open
        case speaking
        case scored(words: [SpeakScore.Word], heard: String, pct: Int)
        /// the recogniser failed: the hint and Next
        case noHear
        case finished(ReflexCore.Summary)
    }
    struct Round: Equatable { var words: [SpeakScore.Word], heard: String, pct: Int }

    let ctx: SkillsContext
    let io: SpeakIO
    private(set) var game: ReflexCore.Game
    private(set) var stage: Stage = .idle
    private(set) var history: [Round] = []
    /// the teacher slot (Stitch reflex-run / reflex-result): drawn, silent
    var teacher = TeacherController(who: SpeakAccent.ama)
    private var timer: Task<Void, Never>?
    private var playTask: Task<Void, Never>?
    private var dead = false
    private let live: Bool
    private var loaded = false

    init(ctx: SkillsContext, io: SpeakIO, items: [ReflexCore.Item] = [], live: Bool = true) {
        self.ctx = ctx; self.io = io; self.live = live; game = ReflexCore.Game(items: items); loaded = !live
    }
    /// pool of the app: saved YouTube lines, library examples, reading sentences (nothing is checked for a clip: the voice player falls back to the system voice)
    func load() async {
        guard !loaded else { return }
        loaded = true
        await ctx.reload()
        let cat = await WordCatalogRemote.shared.catalog()
        let examples = cat.topics.flatMap { $0.words.map { $0.s("ex") } }.filter { !$0.isEmpty }
        let readings = ctx.data.readings.map { $0.s("text") }
        let items = ReflexCore.pool(cards: ctx.bundle.cards, examples: examples, readings: readings, hasClip: { _ in true }, split: { VoiceCore.split($0) },
                                    shuffle: { [io] a in var a = a; for i in stride(from: a.count - 1, to: 0, by: -1) { a.swapAt(i, Int(io.random() * Double(i + 1))) }; return a })
        game = ReflexCore.Game(items: items)
    }

    var left: Int { game.left }
    var isEmpty: Bool { game.items.isEmpty }
    var running: Bool { game.running }
    var progress: Double { Double(ReflexCore.seconds - game.left) / Double(ReflexCore.seconds) }
    var locale: String { SpeakAccent.locale(ctx.settings) }
    var nextVisible: Bool { if case .scored = stage { return true }; return stage == .noHear }

    // MARK: game
    func start() {
        guard !game.items.isEmpty else { return }
        stop(); dead = false; history = []
        game.start(); stage = .idle
        if live { timer = Task { [weak self] in
            while !Task.isCancelled { try? await Task.sleep(nanoseconds: 1_000_000_000); if Task.isCancelled { return }; self?.tick() }
        } }
        play()
    }
    /// one second of the clock
    func tick() {
        guard game.running else { return }
        if !game.tick() { finish() }
    }
    func next() { game.skip(); play() }

    private func stop() { timer?.cancel(); playTask?.cancel(); io.stopSay(); io.recognizer.cancel() }
    /// leaving the screen ends every late callback (mic, sound, timers)
    func leave() { dead = true; stop() }

    func finish() {
        guard game.running, !dead else { return }
        stop()
        let s = game.finish()
        stage = .finished(s)
        if let r = s.reward { Task { await ctx.commit(reward: r) } }
    }

    private func play() {
        guard game.running, !dead, let it = game.current else { return }
        playTask?.cancel(); io.stopSay()
        switch it.source {
        case .youtube(let id, let t):
            stage = .hearing(embed: ReflexCore.embedURL(id: id, t: t))
            playTask = Task { [weak self] in
                try? await Task.sleep(nanoseconds: UInt64(ReflexCore.embedWaitMs) * 1_000_000)
                if Task.isCancelled { return }
                await self?.listen(it)
            }
        case .clip:
            stage = .hearing(embed: nil)
            io.say(it.text, SpeakAccent.ama, locale, false) { [weak self] in
                Task { @MainActor in self?.game.clipEnded(); await self?.listen(it) }
            }
        }
    }
    /// the recogniser: a result is scored and coloured, an error leaves the hint and Next
    func listen(_ it: ReflexCore.Item) async {
        guard game.running, !dead else { return }
        stage = .speaking
        let o = await io.recognizer.listen(locale: locale, maxSeconds: 8, onPartial: nil)
        guard game.running, !dead else { return }
        if o.error != nil { stage = .noHear; return }
        let heard = Recognize.best(target: it.text, alts: o.alts).heard
        let c = game.result(target: it.text, heard: heard)
        history.append(Round(words: c.words, heard: c.shown, pct: c.pct))
        stage = .scored(words: c.words, heard: c.shown, pct: c.pct)
    }
    /// a clip that failed to play: skip it (up to 3 in a row), else go to the recogniser
    func clipFailed() { guard let it = game.current else { return }; if game.clipFailed() { play() } else { Task { await listen(it) } } }

    // MARK: fixtures
    static func fixture(ctx: SkillsContext, items: [ReflexCore.Item], stage: Stage, left: Int = 60, history: [Round] = []) -> ReflexModel {
        let m = ReflexModel(ctx: ctx, io: .scripted(), items: items, live: false)
        m.teacher = TeacherController.frozen(who: "ama", pose: "talk")
        m.game.start(); for _ in 0..<(ReflexCore.seconds - left) { _ = m.game.tick() }
        if case .finished = stage { _ = m.game.finish() }
        m.stage = stage; m.history = history
        return m
    }
}
