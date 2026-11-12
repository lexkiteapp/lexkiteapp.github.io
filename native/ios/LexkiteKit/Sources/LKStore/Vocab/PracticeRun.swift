import Foundation
import LKSync
import LKCore

/// #/practice sessions – port of web/js/study.js runLearn / runQuiz / renderQuestion and study-games.js runMatch / runSpeak (the parts the
/// vectors do not cover: question choice, distractors, stages, XP, bands). Pure and deterministic: all randomness comes from the injected generator.
public struct SplitMix64: RandomNumberGenerator, Sendable {
    var state: UInt64
    public init(seed: UInt64) { state = seed }
    public mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }
}

public struct PracticeQuestion: Equatable, Sendable {
    public enum Kind: String, Sendable { case mcqVi = "mcq-vi", mcqEn = "mcq-en", typeCloze = "type-cloze", typeListen = "type-listen", typeVi = "type-vi", typeSpell = "type-spell" }
    public var kind: Kind
    /// normalized card (`PracticeEngine.word`)
    public var word: JSON
    /// multiple choice: the shown texts (right one among them)
    public var options: [String] = []
    /// what a typed answer must match / the right option text
    public var answer: String
    /// the sentence with the blank ("_____"), for a cloze that can be built
    public var blanked: String?
    public var hard = false
    public var retried = false
    public var w: String { word.s("word") }
    public var mean: String { word.s("vi") }
    public var isMultipleChoice: Bool { kind == .mcqVi || kind == .mcqEn }
    public var isCloze: Bool { kind == .typeCloze && blanked != nil }
}

public struct SpellSlot: Equatable, Sendable { public var ch: String, isLetter: Bool, isSpace: Bool, shown: Bool }

public enum PracticeVerdict: Equatable, Sendable {
    case right(marks: [PracticeEngine.Typo.Mark])
    /// one slip: the learner may retry once
    case nearMiss
    case wrong
}

public enum PracticeRun {
    public static let quizSize = 10, testSize = 20, learnSize = 8, matchSize = 6
    /// XP: right answer 3 (hard mode 6) · quiz end 5 / perfect 15 · learn step 2 / end 20 · speak ≥ 85 → 5 else 3, end 5 · match 10 (+10 < 25 s, +5 < 40 s)
    public static let xpCorrect = 3, xpCorrectHard = 6, xpLearnStep = 2, xpLearnDone = 20, xpQuizDone = 5, xpQuizPerfect = 15, xpSpeakDone = 5, xpMatchBase = 10
    public static let speakGood = 65, speakGreat = 85

    public static func shuffled<T>(_ a: [T], _ rng: inout SplitMix64) -> [T] { a.shuffled(using: &rng) }
    static func rx(_ s: String, _ p: String, _ with: String) -> String { PracticeEngine.rx(s, p, with) }

    // MARK: cloze helpers (UI.cloze / UI.clozeAnswer)
    public static func cloze(_ text: String, _ word: String) -> String? {
        guard let re = StudyModes.wordRegex(word), re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil else { return nil }
        return re.stringByReplacingMatches(in: text, range: NSRange(text.startIndex..., in: text), withTemplate: "_____")
    }
    public static func clozeAnswer(_ text: String, _ word: String) -> String {
        guard let re = StudyModes.wordRegex(word), let m = re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)), let r = Range(m.range, in: text) else { return word }
        return String(text[r])
    }

    // MARK: question kinds
    public static func kinds(mode: String) -> [PracticeQuestion.Kind] {
        switch mode {
        case "cloze": return [.typeCloze]
        case "listen": return [.typeListen]
        case "test": return [.mcqVi, .mcqEn, .typeCloze, .typeListen, .typeVi]
        default: return [.mcqVi]
        }
    }
    public static let learnStages: [PracticeQuestion.Kind] = [.mcqVi, .typeListen, .typeSpell]

    /// 3 wrong options: other words with a different text, same part of speech and similar length first.
    public static func distractors(for w: JSON, in list: [JSON], key: String, rng: inout SplitMix64) -> [String] {
        let right = w.s(key)
        let pos = w.s("pos"), len = w.s(key).count
        var seen: Set<String> = [right.lowercased()]
        var pool: [JSON] = []
        for x in list where x.s("word") != w.s("word") && !x.s(key).isEmpty && !seen.contains(x.s(key).lowercased()) { seen.insert(x.s(key).lowercased()); pool.append(x) }
        let ranked = Vocab.stableSorted(pool.shuffled(using: &rng)) { a, b in
            let pa = a.s("pos") == pos ? 0 : 1, pb = b.s("pos") == pos ? 0 : 1
            if pa != pb { return pa < pb }
            return abs(a.s(key).count - len) < abs(b.s(key).count - len)
        }
        return ranked.prefix(3).map { $0.s(key) }
    }

    public static func question(_ kind: PracticeQuestion.Kind, word w: JSON, list: [JSON], rng: inout SplitMix64) -> PracticeQuestion {
        switch kind {
        case .mcqVi, .mcqEn:
            let key = kind == .mcqVi ? "vi" : "word"
            let opts = shuffled([w.s(key)] + distractors(for: w, in: list, key: key, rng: &rng), &rng)
            return PracticeQuestion(kind: kind, word: w, options: opts, answer: w.s(key))
        case .typeCloze:
            let ex = w.s("ex")
            if !ex.isEmpty, let b = cloze(ex, w.s("word")) { return PracticeQuestion(kind: kind, word: w, answer: clozeAnswer(ex, w.s("word")), blanked: b) }
            return PracticeQuestion(kind: kind, word: w, answer: w.s("word"))
        default:
            return PracticeQuestion(kind: kind, word: w, answer: w.s("word"))
        }
    }

    /// runQuiz: 10 questions (test: 20, kinds rotate and are mixed)
    public static func makeQuiz(mode: String, pool: [JSON], rng: inout SplitMix64) -> [PracticeQuestion] {
        let n = mode == "test" ? testSize : quizSize
        let items = Array(shuffled(pool, &rng).prefix(min(n, pool.count)))
        let ks = kinds(mode: mode)
        var qs: [PracticeQuestion] = []
        for (i, w) in items.enumerated() { qs.append(question(ks[i % ks.count], word: w, list: pool, rng: &rng)) }
        return mode == "test" ? shuffled(qs, &rng) : qs
    }
    /// 8 correct in a row → offer the hard mode: the rest are typed, with fewer hints, +6 XP
    public static func harden(_ qs: [PracticeQuestion], rng: inout SplitMix64) -> [PracticeQuestion] {
        qs.map { q in
            var x = q
            x.hard = true
            if q.isMultipleChoice { x.kind = .typeVi; x.options = []; x.answer = q.w }
            return x
        }
    }

    /// spell hint: about a quarter of the letters shown ("_ h _ _ _ _ t _ _")
    public static func spellMask(_ word: String) -> [SpellSlot] {
        let chars = Array(word).map(String.init)
        let letters = chars.indices.filter { chars[$0].range(of: "[A-Za-z]", options: .regularExpression) != nil }
        let shown: Set<Int> = letters.count <= 3 ? Set(letters.prefix(1)) : Set(letters.enumerated().filter { $0.offset % 4 == 1 }.map { $0.element })
        return chars.enumerated().map { i, c in SpellSlot(ch: c, isLetter: letters.contains(i), isSpace: c == " ", shown: shown.contains(i)) }
    }

    // MARK: answer check
    /// typed answer → verdict (ChoiceKit.accept, LessonFx.typo, one retry for a near miss)
    public static func judge(_ q: PracticeQuestion, typed: String, isWord: ((String) -> Bool)? = nil) -> PracticeVerdict {
        let a = typed.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ").lowercased()
        if a.isEmpty { return .wrong }
        let target = q.answer
        if a == q.w.lowercased() || a == target.lowercased() || PracticeEngine.accept(typed, target).ok || PracticeEngine.accept(typed, q.w).ok { return .right(marks: []) }
        let strict = q.kind == .typeSpell || (q.isCloze && target.lowercased() != q.w.lowercased())
        let ty = PracticeEngine.typo(a, target, strict: strict, isWord: isWord)
        if ty.ok { return .right(marks: ty.typo ? ty.marks : []) }
        if !q.retried && LessonEngine.similarity(a, target) >= 0.8 { return .nearMiss }
        return .wrong
    }

    /// App.logMistake payload of a wrong quiz answer
    public static func mistake(_ q: PracticeQuestion, given: String) -> JSON {
        let w = q.word
        let qk: JSON
        switch q.kind {
        case .typeListen: qk = .obj([("k", .string("Gõ lại từ bạn nghe được"))])
        case .mcqVi: qk = .obj([("k", .string("Nghĩa của “{word}”?")), ("v", .obj([("word", .string(q.w))]))])
        case .typeCloze where !w.s("ex").isEmpty:
            qk = .obj([("k", .string("Điền từ: {sentence}")), ("v", .obj([("sentence", .string(rx(w.s("ex"), "\\b" + NSRegularExpression.escapedPattern(for: q.w) + "[a-z]*\\b", "___")))]))])
        default: qk = .obj([("k", .string("Từ tiếng Anh nghĩa là “{vi}”?")), ("v", .obj([("vi", .string(q.mean))]))])
        }
        return .obj([("kind", .string("vocab")), ("q", qk), ("answer", .string(q.kind == .mcqVi ? w.s("vi") : q.answer)), ("given", .string(given)),
                     ("explain", .string("\(q.w) \(w.s("ipa")) = \(q.mean)")), ("ref", .string(q.w))])
    }

    /// quiz end
    public struct QuizResult: Equatable, Sendable {
        public var score: Int, total: Int, percent: Int, perfect: Bool, xp: Int
        public var band: String?
    }
    public static func quizResult(mode: String, score: Int, total: Int, answerXP: Int) -> QuizResult {
        let pct = Vocab.round(Double(score) / Double(max(1, total)) * 100)
        let perfect = pct == 100
        return QuizResult(score: score, total: total, percent: pct, perfect: perfect, xp: answerXP + (perfect ? xpQuizPerfect : xpQuizDone), band: mode == "test" ? PracticeEngine.band(percent: pct) : nil)
    }

    // MARK: learn
    public enum LearnStep: Equatable, Sendable { case intro(JSON), question(PracticeQuestion), finished }
    public struct LearnRun: Sendable {
        public var items: [JSON]
        public var stage: [String: Int]
        public var queue: [JSON]
        public var introduced: Set<String> = []
        public var rank: [String: Int]
        public var mistakes = 0, answered = 0
        /// words the learner marked as known ("Mình đã biết từ này")
        public var known: Set<String> = []
        public var list: [JSON]
        /// 8 words, least known first; `rank` = SRS mastery of the saved card (−1 = not saved)
        public init(pool: [JSON], rank: [String: Int], rng: inout SplitMix64) {
            list = pool; self.rank = rank
            func r(_ w: JSON) -> Int { rank[w.s("word").lowercased()] ?? -1 }
            items = Array(Vocab.stableSorted(PracticeRun.shuffled(pool, &rng)) { r($0) < r($1) }.prefix(min(PracticeRun.learnSize, pool.count)))
            stage = Dictionary(items.map { ($0.s("word"), 0) }, uniquingKeysWith: { a, _ in a })
            queue = PracticeRun.shuffled(items, &rng)
        }
        public var wordsDone: Int { stage.values.filter { $0 >= 3 }.count }
        public var stepsDone: Int { stage.values.reduce(0, +) }
        public var stepsTotal: Int { items.count * 3 }
        public func needsIntro(_ w: JSON) -> Bool { stage[w.s("word")] == 0 && !introduced.contains(w.s("word")) && (rank[w.s("word").lowercased()] ?? -1) <= 0 }
        public mutating func advance(rng: inout SplitMix64) -> LearnStep {
            queue = queue.filter { (stage[$0.s("word")] ?? 3) < 3 }
            guard !queue.isEmpty else { return .finished }
            let w = queue.removeFirst()
            if needsIntro(w) { introduced.insert(w.s("word")); return .intro(w) }
            let st = min(2, stage[w.s("word")] ?? 0)
            return .question(PracticeRun.question(PracticeRun.learnStages[st], word: w, list: list, rng: &rng))
        }
        public mutating func introDone(_ w: JSON) { queue.insert(w, at: 0) }
        public mutating func markKnown(_ w: JSON) { stage[w.s("word")] = 3; known.insert(w.s("word")) }
        /// returns the XP of the step
        public mutating func answer(_ q: PracticeQuestion, ok: Bool, rng: inout SplitMix64) -> Int {
            let k = q.w, st = stage[k] ?? 0
            answered += 1
            if ok { stage[k] = st + 1 } else { mistakes += 1; stage[k] = max(0, st - 1) }
            if (stage[k] ?? 0) < 3 { queue.insert(q.word, at: min(queue.count, 2 + Int.random(in: 0...1, using: &rng))) }
            return ok ? PracticeRun.xpLearnStep : 0
        }
    }

    // MARK: match
    public struct MatchTile: Equatable, Sendable, Identifiable { public var id: Int, key: String, label: String, isEnglish: Bool }
    /// 6 words → 12 tiles, shuffled; nil when fewer than 3 words have a meaning
    public static func matchTiles(pool: [JSON], rng: inout SplitMix64) -> (items: [JSON], tiles: [MatchTile])? {
        let items = Array(shuffled(pool.filter { $0.t("vi") }, &rng).prefix(matchSize))
        if items.count < 3 { return nil }
        let raw = items.map { (key: $0.s("word"), label: $0.s("word"), en: true) } + items.map { (key: $0.s("word"), label: $0.s("vi"), en: false) }
        return (items, shuffled(raw, &rng).enumerated().map { MatchTile(id: $0.offset, key: $0.element.key, label: $0.element.label, isEnglish: $0.element.en) })
    }
    public static func matchXP(time: Double) -> Int { xpMatchBase + (time < 25 ? 10 : time < 40 ? 5 : 0) }
    /// shown time = elapsed seconds + 1 s per wrong pair, one decimal
    public static func matchTime(elapsed: Double, misses: Int) -> Double { ((elapsed + Double(misses)) * 10).rounded() / 10 }

    // MARK: speak
    public static func speakXP(score: Int) -> Int { score >= speakGreat ? 5 : 3 }
}
