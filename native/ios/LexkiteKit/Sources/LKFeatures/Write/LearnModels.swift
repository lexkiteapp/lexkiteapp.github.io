import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

// MARK: - #/quick – "Chơi nhanh 15 giây"
@MainActor @Observable
final class QuickModel {
    struct Q: Equatable { var word: String, ipa: String, pos: String, options: [String], correct: Int }
    enum Stage: Equatable { case loading, empty, playing, done(Quick.Result) }
    let ctx: SkillsContext
    private(set) var stage: Stage = .loading
    private(set) var questions: [Q] = []
    private(set) var index = 0, score = 0, secondsLeft = Quick.limit
    private(set) var picked: Int?
    private(set) var busy = false
    private var picks: [JSON] = []
    private var others: [JSON] = []
    private var started = Date(), paused = 0.0
    private let rng: () -> Double

    init(ctx: SkillsContext, rng: @escaping () -> Double = { Double.random(in: 0..<1) }) { self.ctx = ctx; self.rng = rng }
    static func fixture(ctx: SkillsContext, questions: [Q], index: Int = 0, picked: Int? = nil, stage: Stage = .playing, score: Int = 0) -> QuickModel {
        let m = QuickModel(ctx: ctx)
        m.questions = questions; m.index = index; m.picked = picked; m.stage = stage; m.score = score
        return m
    }
    var total: Int { questions.count }
    var current: Q? { index < questions.count ? questions[index] : nil }
    var progress: Double { total == 0 ? 0 : Double(index) / Double(total) }

    private func mean(_ w: JSON) -> String { Vocab.meanOf(w, meanLang: ctx.lang == "vi" ? "vi" : "en") }
    private func uniq(_ a: [JSON]) -> [JSON] {
        var seen = Set<String>(), out: [JSON] = []
        for w in a { let k = w.s("word").lowercased(); if k.isEmpty || seen.contains(k) || mean(w).isEmpty { continue }; seen.insert(k); out.append(w) }
        return out
    }
    private func shuffled<T>(_ a: [T]) -> [T] { var a = a; var i = a.count - 1; while i > 0 { let j = Int(rng() * Double(i + 1)); a.swapAt(i, j); i -= 1 }; return a }

    func load() async {
        await ctx.reload()
        let bank = uniq(ctx.bundle.catalog.topics.flatMap(\.words))
        let cards = uniq(ctx.bundle.cards.filter { !$0.s("word").isEmpty })
        let horizon = ctx.now + 86_400_000
        let due = cards.filter { c in guard let d = (c["srs"] ?? .null).d("due") else { return false }; return Int64(d) <= horizon }
        let pool = due.count >= Quick.count ? due : cards.count >= Quick.count ? cards : bank
        others = bank.count >= 10 ? bank : uniq(cards + bank)
        guard pool.count >= Quick.minPool, others.count >= Quick.minPool else { stage = .empty; return }
        picks = Array(shuffled(pool).prefix(Quick.count))
        questions = picks.map(build)
        index = 0; score = 0; picked = nil; busy = false; paused = 0; secondsLeft = Quick.limit
        started = Date(); stage = .playing
    }
    /// 3 options: the right meaning and two distractors whose meaning differs clearly (not equal to, nor containing, the right one)
    private func build(_ w: JSON) -> Q {
        let right = mean(w), rl = right.lowercased()
        func ok(_ x: JSON) -> Bool { let m = mean(x).lowercased(); return x.s("word").lowercased() != w.s("word").lowercased() && !m.isEmpty && m != rl && !m.contains(rl) && !rl.contains(m) }
        let near = others.filter(ok).filter { $0.s("pos") == w.s("pos") }
        let ds = Array((shuffled(near) + shuffled(others.filter(ok))).reduce(into: [JSON]()) { acc, x in if !acc.contains(where: { $0.s("word") == x.s("word") }) { acc.append(x) } }.prefix(2))
        let opts = shuffled([right] + ds.map(mean))
        return Q(word: w.s("word"), ipa: w.s("ipa"), pos: w.s("pos"), options: opts, correct: opts.firstIndex(of: right) ?? 0)
    }
    private var used: Double { Date().timeIntervalSince(started) - paused }
    func tick() {
        guard stage == .playing else { return }
        secondsLeft = max(0, Int((Double(Quick.limit) - used).rounded(.up)))
        if used >= Double(Quick.limit) && !busy { Task { await end(timedOut: true) } }
    }
    func answer(_ i: Int) async {
        guard stage == .playing, !busy, picked == nil, let q = current else { return }
        busy = true; picked = i
        let right = i == q.correct
        if right { score += 1 }
        let hold = right ? Quick.holdRightMs : Quick.holdWrongMs
        paused += Double(hold) / 1000
        try? await Task.sleep(nanoseconds: UInt64(hold) * 1_000_000)
        guard stage == .playing else { return }
        index += 1; picked = nil; busy = false
        if index >= total { await end(timedOut: false) } else if used >= Double(Quick.limit) { await end(timedOut: true) }
    }
    private func end(timedOut: Bool) async {
        guard stage == .playing else { return }
        let r = Quick.result(right: score, total: total, timedOut: timedOut, elapsed: Date().timeIntervalSince(started))
        stage = .done(r)
        if r.xp > 0 { await ctx.commit(reward: ["xp": r.xp]) }
    }
    func speak() { if let q = current { ctx.core.speak(q.word, settings: ctx.settings) } }
    func again() async { stage = .loading; await load() }
}

// MARK: - #/style – "Phong cách tiếng Anh của bạn"
@MainActor @Observable
final class StyleModel {
    let ctx: SkillsContext
    let styles: [String: JSON], questions: [JSON]
    private(set) var index = 0
    private(set) var picks: [String] = []
    private(set) var chosen: Int?
    private(set) var winner: String?
    init(ctx: SkillsContext, content: LearnContent = .shared) {
        self.ctx = ctx
        styles = content.style["styles"]?.object ?? [:]; questions = content.style.list("questions")
    }
    static func fixture(ctx: SkillsContext, index: Int = 0, picks: [String] = [], winner: String? = nil) -> StyleModel {
        let m = StyleModel(ctx: ctx); m.index = index; m.picks = picks; m.winner = winner
        return m
    }
    var current: JSON? { index < questions.count ? questions[index] : nil }
    var result: JSON? { winner.flatMap { styles[$0] } }
    func pick(_ k: Int) async {
        guard winner == nil, chosen == nil, let q = current, k < q.list("opts").count else { return }
        chosen = k; picks.append(q.list("opts")[k].s("style"))
        try? await Task.sleep(nanoseconds: 240_000_000)
        chosen = nil; index += 1
        if index >= questions.count {
            let w = StyleQuiz.winner(picks)
            winner = w
            await ctx.reload()
            await ctx.setSetting("englishStyle", .obj([("id", .string(w)), ("date", .number(Double(ctx.now)))]))
        }
    }
    func restart() { index = 0; picks = []; winner = nil; chosen = nil }
}

// MARK: - #/method – "Phương pháp học của Lexkite"
@MainActor @Observable
final class MethodModel {
    let ctx: SkillsContext
    let content: LearnContent
    private(set) var result: Method.Result?
    var days = 7.0
    private var defaults: UserDefaults
    init(ctx: SkillsContext, content: LearnContent = .shared, defaults: UserDefaults = .standard) { self.ctx = ctx; self.content = content; self.defaults = defaults }
    static func fixture(ctx: SkillsContext, input: Method.Input, days: Double = 7) -> MethodModel {
        let m = MethodModel(ctx: ctx)
        m.result = Method.compute(input); m.days = days
        return m
    }
    func load() async {
        await ctx.reload()
        async let prompts = WritingRemoteContent.shared.prompts()
        let essays = EssayStore.read(EssayStore.essaysKey, defaults)?.array ?? []
        let b = ctx.bundle
        await GrammarStore.refresh()
        var inp = Method.Input(now: ctx.now, clock: ctx.core.clock, cards: b.cards.filter { !$0.s("word").isEmpty }, reviewDays: b.stats["days"] ?? .object([:]), game: b.game, settings: b.settings,
                               essayPrompts: essays.map { $0.s("prompt") }, mistakes: b.mistakes.filter { !$0.t("fixed") }.count,
                               readings: ctx.data.readings.map { $0.s("id") }, listening: ctx.data.parts.map { $0.s("id") }, grammar: GrammarStore.pack.index.map { $0.s("id") }, prompts: await prompts.map { $0.s("id") })
        inp.speakBank = 0
        result = Method.compute(inp)
    }
    var stage: String { result?.stage.flatMap { ["s0", "s1", "s2", "s3"].contains($0) ? $0 : nil } ?? "s1" }
    var hasPlacement: Bool { ctx.settings["placement"]?.isObject == true }
    var band: String { ctx.settings["placement"]?.s("band") ?? "" }
    /// the next item in a principle link: the web passes `hR` / `hL` / `hSpeak` / `hWrite` (the fall-backs are the list pages)
    func resolve(_ href: String) -> String {
        guard let r = result else { return href }
        switch href { case "#/reading": return r.hrefs.reading; case "#/listening": return r.hrefs.listening; case "#/speaking": return r.hrefs.speak; case "#/write": return r.hrefs.write; default: return href }
    }
    var retention: Int { Vocab.round(SRSParams.fsrs5.retentionTarget * 100) }
}
