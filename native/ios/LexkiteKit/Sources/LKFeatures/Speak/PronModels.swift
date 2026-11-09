import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

// M4 P07 – #/pron screen models. The rules live in LKStore/Speak/PronCore.swift (vector-tested); these models hold the screen state, talk to `SpeakIO`
// (microphone, voice, clock, random numbers) and write the learner's data through `SkillsContext` (game.pronDone, rewards) and UserDefaults
// (`lk.pronPairs`, `vb.pron.rhythm`, device-only like the web's localStorage). Recordings are never kept.

/// what the pack gives every pron screen
@MainActor struct PronContent {
    let lessons: [JSON], pairs: PronPairs, coach: PronCoach
    init(pack: SpeakPack? = nil) {
        let pack = pack ?? SpeakContentStore.pack
        lessons = pack.pron.list("lessons"); pairs = PronPairs(json: pack.pron["pairs"] ?? .null)
        coach = PronCoach(coach: pack.pron["coach"] ?? .null, weak: pack.consts["weak"] ?? .null)
    }
    func lesson(_ id: String) -> JSON? { lessons.first { $0.s("id") == id } }
}

// MARK: - hub

@MainActor @Observable
final class PronHubModel {
    let ctx: SkillsContext
    let content: PronContent
    private(set) var hub: PronHub
    init(ctx: SkillsContext, content: PronContent? = nil) {
        let content = content ?? PronContent()
        self.ctx = ctx; self.content = content
        hub = PronHub.build(lessons: content.lessons, pronDone: ctx.game["pronDone"] ?? .object([:]))
    }
    func load() async { await ctx.reload(); hub = PronHub.build(lessons: content.lessons, pronDone: ctx.game["pronDone"] ?? .object([:])) }
    func lesson(_ id: String) -> JSON? { content.lesson(id) }
}

// MARK: - lesson

@MainActor @Observable
final class PronLessonModel {
    enum Hint: Equatable { case none, heard(String), error(String) }
    let ctx: SkillsContext
    let lesson: JSON
    let content: PronContent
    let io: SpeakIO
    /// best score per word; the last score of each sentence
    private(set) var scores: [Int: Int] = [:]
    private(set) var sentenceScores: [Int: Int] = [:]
    private(set) var hint: Hint = .none
    /// "w3" / "s1" while that microphone is open
    private(set) var listening: String?
    private(set) var quiz: PronLessonRules.Quiz
    private(set) var quizDone = false
    let pairGame: PronPairGameModel?
    let say: PronSayModel?
    let rhythm: PronRhythmModel?
    var onFallbackToPairs: () -> Void = {}

    init(ctx: SkillsContext, lesson: JSON, content: PronContent? = nil, io: SpeakIO) {
        let content = content ?? PronContent()
        self.ctx = ctx; self.lesson = lesson; self.content = content; self.io = io
        quiz = PronLessonRules.Quiz(answers: lesson.list("quiz").map { Int($0["answer"]?.double ?? 0) })
        let id = lesson.s("id")
        pairGame = lesson.list("pairs").isEmpty ? nil : PronPairGameModel(ctx: ctx, pairs: lesson.list("pairs").map { ($0.array ?? []).compactMap(\.string) }, io: io)
        say = content.pairs.forSkill(id).isEmpty ? nil : PronSayModel(ctx: ctx, pairs: content.pairs, contrasts: content.pairs.forSkill(id), io: io)
        rhythm = PronLessonRules.rhythm.contains(id) ? PronRhythmModel(ctx: ctx, content: content, skill: id, io: io) : nil
        say?.onFallback = { [weak self] in self?.onFallbackToPairs() }
    }

    var id: String { lesson.s("id") }
    var words: [JSON] { lesson.list("words") }
    var sentences: [String] { lesson.strs("sentences") }
    var accent: String { SpeakAccent.locale(ctx.settings) }
    var index: Int { content.lessons.firstIndex { $0.s("id") == id } ?? 0 }
    var prev: JSON? { index > 0 ? content.lessons[index - 1] : nil }
    var next: JSON? { index + 1 < content.lessons.count ? content.lessons[index + 1] : nil }
    var mouth: PronMouthShape? { PronLessonRules.mouth(lesson["mouth"] ?? .null) }
    var old: Int { Int(JSON.orZero(ctx.game["pronDone"]?[id])) }

    func load() async {
        await ctx.reload()
        try? await Task.sleep(nanoseconds: UInt64(PronLessonRules.firstWordDelayMs) * 1_000_000)
        if let w = words.first?.s("w"), !w.isEmpty { io.say(w, SpeakAccent.ama, accent, false, nil) }
    }
    func stop() { io.recognizer.cancel(); io.stopSay() }

    // MARK: words and sentences
    func hear(_ text: String, slow: Bool = false) { io.say(PronLessonRules.clean(text), SpeakAccent.ama, accent, slow, nil) }
    func micWord(_ k: Int) async {
        guard listening == nil, words.indices.contains(k) else { return }
        listening = "w\(k)"
        let r = await listen(words[k].s("w"))
        listening = nil
        guard let r else { return }
        scores[k] = max(scores[k] ?? 0, r)
        var game = ctx.game
        if let best = PronLessonRules.savedBest(scores: scores, wordCount: words.count, old: old) { game = Self.setBest(game, id, best) }
        await ctx.commit(game: game, reward: PronLessonRules.wordReward(r))
    }
    func micSentence(_ k: Int) async {
        guard listening == nil, sentences.indices.contains(k) else { return }
        listening = "s\(k)"
        let r = await listen(sentences[k])
        listening = nil
        guard let r else { return }
        sentenceScores[k] = r
        await ctx.commit(reward: PronLessonRules.sentenceReward(r))
    }
    /// one recognised attempt → its score (hint updated); nil on a platform error
    private func listen(_ target: String) async -> Int? {
        let o = await io.recognizer.listen(locale: accent, maxSeconds: 8, onPartial: nil)
        if let e = o.error { hint = .error(e); return nil }
        let b = Recognize.best(target: PronLessonRules.clean(target), alts: o.alts)
        hint = .heard(b.heard)
        return b.score
    }
    static func setBest(_ game: JSON, _ id: String, _ pct: Int) -> JSON {
        var g = game, d = g["pronDone"] ?? .object([:])
        if !d.isObject { d = .object([:]) }
        d[id] = .int(pct); g["pronDone"] = d
        return g
    }

    // MARK: quick quiz
    func pick(_ q: Int, _ v: Int) async {
        guard quiz.pick(q, v) != nil else { return }
        if quiz.finished && !quizDone {
            quizDone = true
            let f = PronLessonRules.quizFinish(right: quiz.right, n: quiz.answers.count, old: old)
            await ctx.commit(game: f.best.map { Self.setBest(ctx.game, id, $0) }, reward: f.reward)
        }
    }

    // MARK: fixtures
    static func fixture(ctx: SkillsContext, lesson: JSON, content: PronContent? = nil, scores: [Int: Int] = [:], sentenceScores: [Int: Int] = [:], hint: Hint = .none,
                        listening: String? = nil, picks: [Int] = []) -> PronLessonModel {
        let m = PronLessonModel(ctx: ctx, lesson: lesson, content: content, io: .scripted())
        m.scores = scores; m.sentenceScores = sentenceScores; m.hint = hint; m.listening = listening
        for (q, v) in picks.enumerated() { _ = m.quiz.pick(q, v) }
        m.quizDone = m.quiz.finished
        return m
    }
}

// MARK: - pair listening game

@MainActor @Observable
final class PronPairGameModel {
    let ctx: SkillsContext
    let pairs: [[String]]
    let io: SpeakIO
    private(set) var rounds: [PronLessonRules.Round] = []
    private(set) var index = 0
    private(set) var ok = 0
    /// the option tapped in this round (the round is locked while it is set)
    private(set) var picked: Int?
    private(set) var finished: (pct: Int, good: Bool, ok: Int)?
    private var advance: Task<Void, Never>?
    var started: Bool { !rounds.isEmpty }
    /// the teacher slot of the focus screen (drawn, never speaks by itself)
    var teacher = TeacherController(who: SpeakAccent.ama)
    /// the X of the focus screen: back to the lesson page
    func quit() { advance?.cancel(); rounds = []; index = 0; ok = 0; picked = nil; finished = nil }
    var current: PronLessonRules.Round? { rounds.indices.contains(index) ? rounds[index] : nil }
    var accent: String { SpeakAccent.locale(ctx.settings) }

    init(ctx: SkillsContext, pairs: [[String]], io: SpeakIO) { self.ctx = ctx; self.pairs = pairs; self.io = io }

    func start() {
        advance?.cancel()
        rounds = PronLessonRules.pairRounds(pairs, shuffle: { $0.shuffled() }, random: io.random)
        index = 0; ok = 0; picked = nil; finished = nil
        play(after: 200)
    }
    func play(after ms: Int = 0, slow: Bool = false) {
        guard let r = current else { return }
        Task { @MainActor [weak self] in
            if ms > 0 { try? await Task.sleep(nanoseconds: UInt64(ms) * 1_000_000) }
            guard let self else { return }
            self.io.say(r.options[r.answer], SpeakAccent.ama, self.accent, slow, nil)
        }
    }
    func pick(_ k: Int) {
        guard let r = current, picked == nil else { return }
        picked = k
        if k == r.answer { ok += 1 }
        advance = Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: 900_000_000)
            guard !Task.isCancelled else { return }
            await self?.next()
        }
    }
    private func next() async {
        index += 1; picked = nil
        if index >= rounds.count {
            let f = PronLessonRules.pairFinish(ok: ok, n: rounds.count)
            finished = (f.pct, f.good, ok)
            await ctx.commit(reward: f.reward)
        } else { play(after: 200) }
    }
    static func fixture(ctx: SkillsContext, pairs: [[String]], index: Int, ok: Int, picked: Int? = nil, finished: Bool = false) -> PronPairGameModel {
        let m = PronPairGameModel(ctx: ctx, pairs: pairs, io: .scripted())
        m.teacher = TeacherController.frozen(who: "ama", pose: "talk")
        m.rounds = PronLessonRules.pairRounds(pairs, shuffle: { $0 }, random: { 0.2 })
        m.index = finished ? m.rounds.count : index; m.ok = ok; m.picked = picked
        if finished { let f = PronLessonRules.pairFinish(ok: ok, n: m.rounds.count); m.finished = (f.pct, f.good, ok) }
        return m
    }
}

// MARK: - "Nói thử": minimal-pair speaking

@MainActor @Observable
final class PronSayModel {
    enum Phase: Equatable { case intro, running, blocked(String), done }
    let ctx: SkillsContext
    let pairs: PronPairs
    let contrasts: [PronContrast]
    let io: SpeakIO
    private(set) var phase: Phase = .intro
    private(set) var session: PronSaySession?
    /// the feedback of the attempt just scored (nil while waiting for the microphone)
    private(set) var step: PronSaySession.Step?
    private(set) var listening = false
    private(set) var processing = false
    private(set) var summary: (ok: Int, n: Int, good: Bool, chips: [(label: String, ok: Int, n: Int)])?
    private(set) var stats: PronStats
    var onFallback: () -> Void = {}
    var locale: String { SpeakAccent.us }
    /// the teacher slot of the focus screen
    var teacher = TeacherController(who: SpeakAccent.ama)
    /// the X of the focus screen: back to the intro card (the score of a finished session is already saved)
    func quit() { io.recognizer.cancel(); io.stopSay(); listening = false; session = nil; step = nil; summary = nil; phase = .intro }

    init(ctx: SkillsContext, pairs: PronPairs, contrasts: [PronContrast], io: SpeakIO) {
        self.ctx = ctx; self.pairs = pairs; self.contrasts = contrasts; self.io = io
        stats = PronPairs.load(ctx.defaults)
    }
    var total: Int { contrasts.reduce(0) { $0 + pairs.pairsOf($1).count } }
    /// the contrasts practised before, weakest first (all practised ones when none is below 80 %)
    var weakIds: [String] {
        let ids = contrasts.map(\.id), w = PronPairs.weak(stats, ids: ids)
        return w.isEmpty ? ids.filter { (stats[$0]?.n ?? 0) > 0 } : w
    }
    var item: PronItem? { session?.item }

    func start() {
        stats = PronPairs.load(ctx.defaults)
        session = PronSaySession(pairs: pairs, contrasts: contrasts, stats: stats, random: io.random)
        step = nil; summary = nil; phase = .running
        speakModel(after: 250)
    }
    func hear(slow: Bool = false) { if let t = item?.target { io.say(t, SpeakAccent.ama, locale, slow, nil) } }
    private func speakModel(after ms: Int) {
        guard let it = item else { return }
        Task { @MainActor [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(ms) * 1_000_000)
            guard let self, self.item == it, self.step == nil else { return }
            self.hear()
        }
    }
    /// the microphone button: listen, decide, show the feedback
    func tapMic() async {
        guard phase == .running, session != nil, !listening else { return }
        if step != nil, step?.micDisabled == true || step?.kind == .skip { return }
        listening = true; step = nil
        let o = await io.recognizer.listen(locale: locale, maxSeconds: 8, onPartial: nil)
        listening = false
        if let e = o.error {
            let outcome = PronSaySession.outcome(forError: e)
            if case .blocked(let code) = outcome { phase = .blocked(code); return }
            step = session!.apply(outcome)
        } else { step = session!.answer(alts: o.alts) }
    }
    func next() async {
        guard var s = session else { return }
        s.next(); session = s; step = nil
        if s.done { await finish() } else { speakModel(after: 250) }
    }
    private func finish() async {
        guard var s = session else { return }
        let reward = s.finish(day: ctx.core.clock.todayKey(ctx.now))
        session = s; stats = s.stats
        PronPairs.save(s.stats, ctx.defaults)
        summary = (s.ok, s.scored, s.good, s.sess.map { (label: pairs.contrast($0.id).map(pairs.label) ?? $0.id, ok: $0.ok, n: $0.n) })
        phase = .done
        await ctx.commit(reward: reward)
    }
    func retryFromBlocked() { start() }

    static func fixture(ctx: SkillsContext, pairs: PronPairs, contrasts: [PronContrast], phase: Phase, outcomes: [PronSaySession.Outcome] = [], stats: PronStats = [:]) -> PronSayModel {
        let m = PronSayModel(ctx: ctx, pairs: pairs, contrasts: contrasts, io: .scripted(random: { 0.3 }))
        m.teacher = TeacherController.frozen(who: "ama", pose: "talk")
        m.stats = stats
        var s = PronSaySession(pairs: pairs, contrasts: contrasts, stats: stats, random: { 0.3 })
        for (n, o) in outcomes.enumerated() {
            let st = s.apply(o)
            if st.nextButton && n < outcomes.count - 1 { s.next() } else { m.step = st }
        }
        if phase == .done {
            s.next(); _ = s.finish(day: "2026-01-05"); m.step = nil
            m.summary = (s.ok, s.scored, s.good, s.sess.map { (label: pairs.contrast($0.id).map(pairs.label) ?? $0.id, ok: $0.ok, n: $0.n) })
            m.stats = s.stats
        }
        m.session = s; m.phase = phase
        return m
    }
}

// MARK: - rhythm & shadowing

@MainActor @Observable
final class PronRhythmModel {
    struct Result: Equatable {
        var score: Int, band: PronCoach.Band, heard: String
        var missingContent: [String], missingWeak: [String]
        var suggestions: [PronSuggestion]
    }
    enum Phase: Equatable { case idle, model, listening, result(Result), error(String) }
    let ctx: SkillsContext
    let content: PronContent
    let skill: String
    let io: SpeakIO
    private(set) var k: Int
    private(set) var best: [Int: Int]
    private(set) var phase: Phase = .idle
    var accent: String { SpeakAccent.locale(ctx.settings) }
    var sentence: PronCoach.Sentence { content.coach.sentences[k] }
    var plan: [PronCoach.PlanWord] { content.coach.plan(sentence.s, forced: sentence.w, accent: accent) }

    init(ctx: SkillsContext, content: PronContent, skill: String, io: SpeakIO) {
        self.ctx = ctx; self.content = content; self.skill = skill; self.io = io
        let saved = PronCoach.loadRhythm(ctx.defaults)
        best = saved
        k = content.coach.first(saved)
    }
    func pick(_ i: Int) { guard content.coach.sentences.indices.contains(i) else { return }; io.recognizer.cancel(); io.stopSay(); k = i; phase = .idle }
    func hear(slow: Bool = false) { io.say(sentence.s, SpeakAccent.ama, accent, slow, nil) }
    /// model at 0.9×, THEN the microphone opens with the sentence as target; score = coach score, saved best = max(old, new)
    func shadow() async {
        guard phase != .model, phase != .listening else { return }
        phase = .model
        let s = sentence.s
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in io.say(s, SpeakAccent.ama, accent, false) { c.resume() } }
        phase = .listening
        let o = await io.recognizer.listen(locale: accent, maxSeconds: 10, onPartial: nil)
        if let e = o.error { phase = .error(e); return }
        let heard = o.alts.first ?? "", co = content.coach
        let sim = max(0, o.alts.map { LessonEngine.similarity($0, s) }.max() ?? LessonEngine.similarity(heard, s))
        let d = co.diff(heard: heard, target: s), sc = PronCoach.score(sim: sim, d)
        best[k] = max(best[k] ?? 0, sc)
        PronCoach.saveRhythm(best, ctx.defaults)
        let sug = co.next(pairs: content.pairs, stats: PronPairs.load(ctx.defaults), rhythm: best, skill: skill)
        phase = .result(Result(score: sc, band: PronCoach.band(sc), heard: heard, missingContent: d.missingContent, missingWeak: d.missingWeak, suggestions: sug))
        await ctx.commit(reward: PronCoach.reward(score: sc))
    }
    static func fixture(ctx: SkillsContext, content: PronContent, skill: String, k: Int, best: [Int: Int], phase: Phase) -> PronRhythmModel {
        let m = PronRhythmModel(ctx: ctx, content: content, skill: skill, io: .scripted())
        m.k = k; m.best = best; m.phase = phase
        return m
    }
}
