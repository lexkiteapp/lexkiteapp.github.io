import SwiftUI
import Observation
import LKCore
import LKStore
import LKSync
import LKStrings

/// #/practice – hub, learn, quiz (mcq · cloze · listen · test), match and speak (port of web/js/study.js + study-games.js).
@MainActor @Observable
final class StudyPracticeModel {
    enum Phase: Equatable { case loading, hub, empty, intro, question, quizDone, learnDone, match, matchDone, speak, speakDone }
    struct Feedback: Equatable { var ok: Bool, marks: [PracticeEngine.Typo.Mark], answer: String, given: String }
    enum SpeakNotice: Equatable { case none, noSpeech, unsupported }

    private(set) var phase: Phase = .loading
    private(set) var bundle = VocabBundle()
    var src = "deck"
    private(set) var mode: String?
    private(set) var pool: [JSON] = []

    // question state (quiz + learn)
    private(set) var question: PracticeQuestion?
    private(set) var intro: JSON?
    private(set) var feedback: Feedback?
    var typed = ""
    private(set) var picked: String?
    private(set) var nearMiss = false
    private(set) var qi = 0
    private(set) var total = 0
    private(set) var score = 0
    private(set) var runXP = 0
    private(set) var streak = 0
    private(set) var wrong: [JSON] = []
    private(set) var result: PracticeRun.QuizResult?
    private(set) var learn: PracticeRun.LearnRun?
    private(set) var learnAdded = false
    private(set) var wrongAdded = false
    private(set) var tick = 0
    private(set) var wrongTick = 0
    private(set) var doneTick = 0
    /// 8 correct in a row → "this looks too easy" screen (once per run, never in the test)
    private(set) var offeringHard = false
    @ObservationIgnored private var hardOffered = false
    static let hardAt = 8

    // match
    private(set) var tiles: [PracticeRun.MatchTile] = []
    private(set) var matchItems: [JSON] = []
    private(set) var selected: Int?
    private(set) var gone: Set<Int> = []
    private(set) var bad: Set<Int> = []
    private(set) var misses = 0
    private(set) var matchStart: Int64 = 0
    private(set) var matchTime = 0.0
    private(set) var matchXP = 0
    private(set) var matchBest: Double?
    private(set) var newRecord = false

    // speak
    private(set) var speakItems: [JSON] = []
    private(set) var si = 0
    private(set) var good = 0
    private(set) var heard = ""
    private(set) var speakScore: Int?
    private(set) var listening = false
    private(set) var speakNotice: SpeakNotice = .none
    @ObservationIgnored private var scored = false
    @ObservationIgnored var scorer: SpeechScoring?
    /// `?w=word` of #/practice/speak: one word only
    @ObservationIgnored var singleWord: String?
    @ObservationIgnored var translate: MistakesEngine.Translate = MistakesEngine.defaultTranslate
    @ObservationIgnored var autoPlay = true

    let core: StudyCore
    @ObservationIgnored private var rng: SplitMix64

    init(core: StudyCore) {
        self.core = core
        rng = SplitMix64(seed: UInt64(truncatingIfNeeded: core.now()))
    }

    // MARK: open
    func load(mode m: String?, src s: String?) async {
        bundle = await core.data.load()
        if let s, !s.isEmpty { src = s }
        if let m, PracticeEngine.modes.contains(m) { start(m) } else { mode = nil; phase = .hub }
    }
    var settings: JSON { bundle.settings }
    var topicIDs: [String] { bundle.catalog.topics.map(\.id) }
    func sourceValues() -> [String] { PracticeEngine.sourceValues(topicIDs: topicIDs) }
    func topicName(_ id: String) -> String { bundle.catalog.topic(id)?.name ?? id }
    func count(_ value: String) -> Int { poolFor(value).count }
    private func poolFor(_ value: String) -> [JSON] {
        var g = SplitMix64(seed: 7)
        return PracticeEngine.pool(value, cards: bundle.cards, catalog: bundle.catalog, now: core.now(), clock: core.clock, shuffle: { $0.shuffled(using: &g) })
    }
    func changeSource(_ v: String) { src = v }

    func backToHub() {
        core.voice.stop()
        mode = nil; phase = .hub; question = nil; intro = nil; feedback = nil; result = nil; learn = nil
    }

    func start(_ m: String) {
        mode = m
        pool = poolFor(src)
        question = nil; intro = nil; feedback = nil; result = nil; picked = nil; typed = ""; nearMiss = false
        qi = 0; score = 0; runXP = 0; streak = 0; wrong = []; wrongAdded = false; learnAdded = false; offeringHard = false; hardOffered = false
        switch m {
        case "learn": startLearn()
        case "match": startMatch()
        case "speak": startSpeak()
        default: startQuiz(m)
        }
    }

    // MARK: quiz
    private func startQuiz(_ m: String) {
        let qs = PracticeRun.makeQuiz(mode: m, pool: pool, rng: &rng)
        guard !qs.isEmpty else { phase = .empty; return }
        quiz = qs; total = qs.count
        showQuestion(qs[0])
    }
    @ObservationIgnored private var quiz: [PracticeQuestion] = []

    private func showQuestion(_ q: PracticeQuestion) {
        question = q; intro = nil; feedback = nil; picked = nil; typed = ""; nearMiss = false
        phase = .question
        if autoPlay && (q.kind == .typeListen || q.kind == .mcqVi) { speakWord() }
    }

    func choose(_ text: String) {
        guard phase == .question, feedback == nil, let q = question, q.isMultipleChoice else { return }
        picked = text
        settle(ok: text == q.answer, given: text, marks: [])
    }
    func submitTyped() {
        guard phase == .question, feedback == nil, var q = question, !q.isMultipleChoice else { return }
        let isWord: (String) -> Bool = { [bundle] x in x != q.answer.lowercased() && bundle.cards.contains { $0.s("word").lowercased() == x } }
        switch PracticeRun.judge(q, typed: typed, isWord: isWord) {
        case .right(let marks): settle(ok: true, given: typed, marks: marks)
        case .nearMiss: q.retried = true; question = q; nearMiss = true; wrongTick += 1
        case .wrong: settle(ok: false, given: typed, marks: [])
        }
    }
    func giveUp() { guard phase == .question, feedback == nil else { return }; settle(ok: false, given: "", marks: []) }
    /// the listening question when audio is paused → ask for the meaning instead (web 🔇 button)
    func switchToMeaning() { guard var q = question, q.kind == .typeListen else { return }; q.kind = .typeVi; q.answer = q.w; question = q }

    private func settle(ok: Bool, given: String, marks: [PracticeEngine.Typo.Mark]) {
        guard let q = question else { return }
        feedback = Feedback(ok: ok, marks: marks, answer: q.answer, given: given)
        tick += 1
        if !ok {
            wrongTick += 1
            bundle.mistakes = MistakesEngine.log(bundle.mistakes, PracticeRun.mistake(q, given: given), now: core.now(), translate: translate)
            let m = bundle.mistakes
            Task { await core.commit(VocabEdit(mistakes: m)) }
        }
        if autoPlay && (!ok || !q.isMultipleChoice) { speakWord() }
    }

    func next() {
        guard let fb = feedback, let q = question else { return }
        if mode == "learn" {
            var l = learn!
            let xp = l.answer(q, ok: fb.ok, rng: &rng)
            learn = l
            if xp > 0 { reward(StudyDelta(xp: xp)) }
            advanceLearn()
            return
        }
        if fb.ok {
            score += 1; streak += 1
            let xp = q.hard ? PracticeRun.xpCorrectHard : PracticeRun.xpCorrect
            runXP += xp; reward(StudyDelta(xp: xp))
        } else { wrong.append(q.word); streak = 0 }
        qi += 1
        if qi >= quiz.count { finishQuiz(); return }
        if mode != "test", !hardOffered, !quiz.contains(where: \.hard), streak >= Self.hardAt, quiz.count - qi >= 2 {
            hardOffered = true; offeringHard = true; question = nil; feedback = nil
            return
        }
        showQuestion(quiz[qi])
    }
    /// answer of the hard-mode offer: yes → the remaining questions become typed ones with fewer hints
    func answerHardOffer(_ yes: Bool) {
        offeringHard = false
        if yes { var g = rng; let rest = PracticeRun.harden(Array(quiz[qi...]), rng: &g); rng = g; quiz.replaceSubrange(qi..., with: rest) }
        showQuestion(quiz[qi])
    }

    private func finishQuiz() {
        let r = PracticeRun.quizResult(mode: mode ?? "mcq", score: score, total: quiz.count, answerXP: runXP)
        result = r
        reward(StudyDelta(xp: r.perfect ? PracticeRun.xpQuizPerfect : PracticeRun.xpQuizDone, counters: ["quizzes": 1, "perfect": r.perfect ? 1 : 0]))
        phase = .quizDone; doneTick += 1
    }

    /// "Đưa các từ sai vào flashcard"
    func addWrongToDeck() { addAll(wrong); wrongAdded = true }
    private func addAll(_ words: [JSON]) {
        var cards: [JSON] = []
        for w in words where !inDeck(w.s("word")) { cards.append(core.addWord(w, into: &bundle)) }
        guard !cards.isEmpty else { return }
        let c = cards
        Task { await core.commit(VocabEdit(upsert: c)) }
    }
    func inDeck(_ word: String) -> Bool { bundle.cards.contains { Vocab.cardKey($0) == word.lowercased() } }

    // MARK: learn
    private func startLearn() {
        guard !pool.isEmpty else { phase = .empty; return }
        var rank: [String: Int] = [:]
        for c in bundle.cards { rank[c.s("word").lowercased()] = Vocab.mastery(c) }
        learn = PracticeRun.LearnRun(pool: pool, rank: rank, rng: &rng)
        advanceLearn()
    }
    private func advanceLearn() {
        guard var l = learn else { return }
        let step = l.advance(rng: &rng)
        learn = l
        switch step {
        case .finished: finishLearn()
        case .intro(let w): intro = w; question = nil; feedback = nil; phase = .intro; if autoPlay { core.speak(w.s("word"), settings: bundle.settings) }
        case .question(let q): showQuestion(q)
        }
    }
    func introContinue() { guard var l = learn, let w = intro else { return }; l.introDone(w); learn = l; advanceLearn() }
    /// "Mình đã biết từ này": saved with a far schedule (S 30, interval 30 days)
    func introKnown() {
        guard var l = learn, let w = intro else { return }
        var card = core.addWord(w, into: &bundle)
        let now = core.now()
        var srs = Vocab.newState(now: now).object ?? [:]
        srs["reps"] = 2; srs["S"] = 30; srs["D"] = 3; srs["interval"] = 30; srs["last"] = .number(Double(now)); srs["due"] = .number(Double(now) + 30 * 864e5); srs["step"] = 0
        card["srs"] = .object(srs); card["mod"] = .number(Double(now))
        if let i = bundle.cards.firstIndex(where: { Vocab.cardKey($0) == Vocab.cardKey(card) }) { bundle.cards[i] = card }
        let out = card
        Task { await core.commit(VocabEdit(upsert: [out])) }
        l.markKnown(w); learn = l
        advanceLearn()
    }
    private func finishLearn() {
        guard let l = learn else { return }
        let notIn = l.items.filter { !inDeck($0.s("word")) }
        reward(StudyDelta(xp: PracticeRun.xpLearnDone, counters: ["quizzes": 1, "perfect": l.mistakes == 0 ? 1 : 0, "newWords": notIn.count]))
        phase = .learnDone; doneTick += 1
    }
    var learnNotInDeck: [JSON] { (learn?.items ?? []).filter { !inDeck($0.s("word")) } }
    func addLearned() { addAll(learn?.items ?? []); learnAdded = true }

    // MARK: match
    private func startMatch() {
        guard let m = PracticeRun.matchTiles(pool: pool, rng: &rng) else { phase = .empty; return }
        tiles = m.tiles; matchItems = m.items
        selected = nil; gone = []; bad = []; misses = 0; newRecord = false
        matchStart = core.now()
        matchBest = bundle.game["best"]?["match"]?.double
        phase = .match
    }
    func tap(_ id: Int) {
        guard phase == .match, !gone.contains(id), let t = tiles.first(where: { $0.id == id }) else { return }
        if t.isEnglish { core.speak(t.label, settings: bundle.settings) }
        guard let s = selected else { selected = id; tick += 1; return }
        if s == id { selected = nil; return }
        guard let a = tiles.first(where: { $0.id == s }) else { selected = nil; return }
        selected = nil
        if a.key == t.key && a.isEnglish != t.isEnglish {
            gone.insert(s); gone.insert(id); tick += 1
            if gone.count == tiles.count { finishMatch() }
        } else {
            misses += 1; wrongTick += 1; bad = [s, id]
            Task { try? await Task.sleep(nanoseconds: 400_000_000); self.bad = [] }
        }
    }
    func elapsed() -> Double { Double(core.now() - matchStart) / 1000 }
    private func finishMatch() {
        matchTime = PracticeRun.matchTime(elapsed: elapsed(), misses: misses)
        matchXP = PracticeRun.matchXP(time: matchTime)
        newRecord = matchBest == nil || matchTime < (matchBest ?? .infinity)
        reward(StudyDelta(xp: matchXP, counters: ["matches": 1, "quizzes": 1, "perfect": misses == 0 ? 1 : 0], matchTime: matchTime))
        phase = .matchDone; doneTick += 1
    }

    // MARK: speak
    private func startSpeak() {
        if let one = singleWord, !one.isEmpty {
            let k = one.lowercased()
            let src = bundle.cards.first { $0.s("word").lowercased() == k } ?? bundle.catalog.topics.lazy.flatMap(\.words).first { $0.s("word").lowercased() == k } ?? JSON.obj([("word", .string(one))])
            speakItems = [PracticeEngine.word(src)]
        } else {
            speakItems = Array(PracticeRun.shuffled(pool, &rng).prefix(PracticeRun.quizSize))
        }
        guard !speakItems.isEmpty else { phase = .empty; return }
        si = 0; good = 0; total = speakItems.count
        showSpeak()
    }
    private func showSpeak() {
        heard = ""; speakScore = nil; speakNotice = .none; scored = false; listening = false
        phase = .speak
        if autoPlay, let w = speakCurrent?.s("word") { core.speak(w, settings: bundle.settings) }
    }
    var speakCurrent: JSON? { si < speakItems.count ? speakItems[si] : nil }
    func listen() async {
        guard phase == .speak, !listening, let w = speakCurrent?.s("word") else { return }
        guard let scorer else { speakNotice = .unsupported; return }
        listening = true; speakNotice = .none
        let out = await scorer.listen(target: w)
        listening = false
        switch out {
        case .heard(let text, let score):
            heard = text; speakScore = score
            if score >= PracticeRun.speakGood && !scored {
                scored = true; good += 1
                reward(StudyDelta(xp: PracticeRun.speakXP(score: score), counters: ["spoken": 1]))
            } else if score < PracticeRun.speakGood { wrongTick += 1 }
        case .noSpeech: speakNotice = .noSpeech
        case .unsupported: speakNotice = .unsupported
        }
    }
    func nextSpeak() {
        si += 1
        if si >= speakItems.count {
            reward(StudyDelta(xp: PracticeRun.xpSpeakDone, counters: ["quizzes": 1]))
            phase = .speakDone; doneTick += 1
        } else { showSpeak() }
    }
    func stopListening() { scorer?.cancel(); listening = false }

    // MARK: shared
    func speakWord(slow: Bool = false) {
        if let w = (question?.w ?? speakCurrent?.s("word")), !w.isEmpty { core.speak(w, settings: bundle.settings, slow: slow) }
    }
    func speakText(_ s: String) { core.speakSentence(s, settings: bundle.settings) }
    private func reward(_ d: StudyDelta) {
        bundle.game = StudyGame.apply(bundle.game, d, now: core.now(), clock: core.clock)
        let g = bundle.game
        Task { await core.commit(VocabEdit(game: g)) }
    }
    var progress: Double {
        switch phase {
        case .question, .intro:
            if let l = learn { return Double(l.stepsDone) / Double(max(1, l.stepsTotal)) }
            return Double(qi) / Double(max(1, quiz.count))
        case .match: return Double(gone.count) / Double(max(1, tiles.count))
        case .speak: return Double(si) / Double(max(1, total))
        case .quizDone, .learnDone, .matchDone, .speakDone: return 1
        default: return 0
        }
    }
    /// display position "3/10"
    var position: String { "\(min(qi + 1, max(1, quiz.count)))/\(max(1, quiz.count))" }
}
