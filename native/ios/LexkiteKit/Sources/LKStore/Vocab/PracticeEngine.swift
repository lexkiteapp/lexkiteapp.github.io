import Foundation
import LKSync
import LKCore

/// Word catalog of the library (web `IELTS_DATA.TOPICS` / `GROUPS`): loaded like the web does (content pack + CDN), injected so tests need no network.
public struct TopicCatalog: Sendable {
    public struct Group: Sendable { public var id: String, name: String, emoji: String, desc: String
        public init(id: String, name: String, emoji: String = "", desc: String = "") { self.id = id; self.name = name; self.emoji = emoji; self.desc = desc } }
    public struct Topic: Sendable {
        public var id: String, group: String, name: String, emoji: String, desc: String
        /// `{word,ipa,ipaUS,pos,vi,def,ex,col[],syn[],level,emoji,topic}`
        public var words: [JSON]
        public init(id: String, group: String = "topics", name: String = "", emoji: String = "", desc: String = "", words: [JSON]) {
            self.id = id; self.group = group; self.name = name; self.emoji = emoji; self.desc = desc; self.words = words }
        public var levels: [String] { Array(Set(words.map { $0.s("level") }.filter { !$0.isEmpty })).sorted() }
    }
    public var topics: [Topic], groups: [Group]
    public init(topics: [Topic] = [], groups: [Group] = []) { self.topics = topics; self.groups = groups }
    /// `{groups:[{id,name,emoji,desc}], topics:[{id,group,name,emoji,desc,words}]}` – vectors/vocab.json `data.catalog` (the real library, cut down)
    public init(json: JSON) {
        self.init(topics: json.list("topics").map { Topic(id: $0.s("id"), group: $0.s("group"), name: $0.s("name"), emoji: $0.s("emoji"), desc: $0.s("desc"), words: $0.list("words")) },
                  groups: json.list("groups").map { Group(id: $0.s("id"), name: $0.s("name"), emoji: $0.s("emoji"), desc: $0.s("desc")) })
    }
    /// web `IELTS_DATA.INDEX`: lower-case word → entry; the set with the smallest group rank wins, ties go to the set loaded first
    public var index: [String: JSON] {
        let rank = ["topics": 0, "writing": 1, "speaking": 2, "awl": 3, "core": 4, "office": 5, "toeic": 6, "domain": 7, "exam": 8, "nawl": 9, "bsl": 10]
        var out: [String: JSON] = [:], at: [String: Int] = [:]
        for t in topics {
            let r = rank[t.group] ?? 99
            for w in t.words { let k = w.s("word").lowercased(); if out[k] == nil || r < (at[k] ?? 99) { out[k] = w; at[k] = r } }
        }
        return out
    }
    /// the first topic with this id wins (web topicOf)
    public func topic(_ id: String) -> Topic? { topics.first { $0.id == id } }
    public var wordCount: Int { var seen = Set<String>(); for t in topics { for w in t.words { seen.insert(Vocab.keyOf(w.s("word"))) } }; return seen.count }
}

/// #/practice – port of web/js/study.js sourceList()/pool() and the typed-answer kits (choice-kit.js accept, qengine.js norm, lesson-fx.js typo).
public enum PracticeEngine {
    /// the pickable word sources, in menu order: deck, due, forgetting, phrases, weak, level:1..5, origin:*, topic:<id>…
    public static func sourceValues(topicIDs: [String]) -> [String] {
        ["deck", "due", "forgetting", "phrases", "weak"] + (1...5).map { "level:\($0)" } + Vocab.originKeys.map { "origin:\($0)" } + topicIDs.map { "topic:\($0)" }
    }
    /// practice modes of the hub
    public static let modes = ["learn", "mcq", "cloze", "listen", "test", "match", "speak"]

    /// study.js `norm`: the card shape every mode works on
    public static func word(_ w: JSON) -> JSON {
        func nz(_ k: String, _ d: String = "") -> JSON { .string(w.t(k) ? w.s(k) : d) }
        return .obj([("word", nz("word")), ("ipa", nz("ipa")), ("vi", .string(Vocab.meanOf(w))), ("ex", nz("ex")), ("def", nz("def")), ("pos", nz("pos")), ("emoji", nz("emoji", "📘")),
                     ("image", nz("image")), ("audio", nz("audio")), ("level", nz("level")), ("topic", nz("topic"))])
    }

    /// pool(src) – `cards` in deck order (web `Object.values(state.cards)`).
    public static func pool(_ src: String?, cards all: [JSON], catalog: TopicCatalog = TopicCatalog(), now: Int64, clock: VocabClock,
                            shuffle: ([JSON]) -> [JSON] = { $0 }) -> [JSON] {
        let cards = all.filter { $0.t("vi") }
        let end = clock.endOfToday(now)
        var list: [JSON]
        switch src ?? "" {
        case "due": list = cards.filter { let s = Vocab.srs($0); return (s.reps > 0 || s.hasLast) && s.due <= end }
        case "weak":
            list = cards.filter { c in
                let s = c["srs"]
                if s?.i("lapses") ?? 0 > 0 { return true }
                if let D = s?.d("D") { return D >= 7 }
                return JSON.truthy(s?["ef"]) && JSON.orZero(s?["ef"]) < 2.3
            }
        case "forgetting": list = all.filter { Vocab.isForgetting($0, now: now, clock: clock) }
        case "phrases": list = cards.filter { Vocab.isPhrase($0) }
        case let s where s.hasPrefix("level:"): let n = Int(s.dropFirst(6)) ?? -1; list = cards.filter { SRS.level5(Vocab.srs($0)) == n }
        case let s where s.hasPrefix("origin:"): let o = String(s.dropFirst(7)); list = cards.filter { Vocab.origin($0) == o }
        case let s where s.hasPrefix("topic:"): list = catalog.topic(String(s.dropFirst(6)))?.words ?? []
        default: list = cards
        }
        if list.count < 4 && (src == nil || src == "" || src == "deck") {
            list = Array(shuffle(catalog.topics.filter { $0.group == "topics" }.flatMap(\.words)).prefix(120))
        }
        return list.map(word)
    }

    // MARK: ChoiceKit.accept
    public struct Accept: Equatable, Sendable { public var ok: Bool, how: String, want: String }
    static let contractions: [(String, String)] = [("\\bcan't\\b", "cannot"), ("\\bcan not\\b", "cannot"), ("\\bwon't\\b", "will not"), ("\\bshan't\\b", "shall not"), ("\\bain't\\b", "is not"), ("n't\\b", " not"),
        ("\\bi'm\\b", "i am"), ("'re\\b", " are"), ("'ve\\b", " have"), ("'ll\\b", " will"), ("\\blet's\\b", "let us"), ("\\b(it|he|she|that|there|what|who|where|here)'s\\b", "$1 is"), ("'d\\b", " would")]
    static func rx(_ s: String, _ pat: String, _ with: String) -> String { s.replacingOccurrences(of: pat, with: with, options: .regularExpression) }
    static func collapse(_ s: String) -> String { s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ") }
    /// forgiving form of a typed answer: case, curly quotes, outer quotes/brackets, final punctuation, contractions
    public static func canon(_ s: String?) -> String {
        var x = collapse((s ?? "").precomposedStringWithCanonicalMapping.lowercased()
            .replacingOccurrences(of: "\u{2019}", with: "'").replacingOccurrences(of: "\u{2018}", with: "'").replacingOccurrences(of: "`", with: "'").replacingOccurrences(of: "\u{B4}", with: "'")
            .replacingOccurrences(of: "\u{201C}", with: "\"").replacingOccurrences(of: "\u{201D}", with: "\""))
        x = rx(x, "^[\"'(]+|[\"')]+$", "")
        x = rx(x, "[.!?,;:\u{2026}]+$", "")
        x = rx(x, "\\s+([.,!?;:])", "$1").trimmingCharacters(in: .whitespacesAndNewlines)
        for (re, to) in contractions { x = rx(x, re, to) }
        return collapse(x)
    }
    /// edit distance with adjacent swaps counted once; > 1 apart in length = 2
    static func lev(_ a: String, _ b: String) -> Int {
        let x = Array(a.utf16), y = Array(b.utf16)
        if abs(x.count - y.count) > 1 { return 2 }
        var D = [[Int]](repeating: [Int](repeating: 0, count: y.count + 1), count: x.count + 1)
        for i in 0...x.count { D[i][0] = i }
        for j in 0...y.count { D[0][j] = j }
        if x.isEmpty || y.isEmpty { return D[x.count][y.count] }
        for i in 1...x.count { for j in 1...y.count {
            D[i][j] = min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (x[i - 1] == y[j - 1] ? 0 : 1))
            if i > 1 && j > 1 && x[i - 1] == y[j - 2] && x[i - 2] == y[j - 1] { D[i][j] = min(D[i][j], D[i - 2][j - 2] + 1) }
        } }
        return D[x.count][y.count]
    }
    /// accept(given, answer, {alts, typo}) → exact · variant · typo (≤ 1 slip in words of ≥ 5 letters)
    public static func accept(_ given: String?, _ answer: String, alts: [String] = [], typo: Bool = false) -> Accept {
        let want = ([answer] + alts).filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }
        let raw = (given ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        if raw.isEmpty { return Accept(ok: false, how: "", want: want.first ?? "") }
        for w in want where raw == w.trimmingCharacters(in: .whitespacesAndNewlines) { return Accept(ok: true, how: "exact", want: w) }
        let c = canon(raw)
        for w in want where c == canon(w) { return Accept(ok: true, how: "variant", want: w) }
        if typo {
            for w in want {
                let A = c.split(separator: " ", omittingEmptySubsequences: false).map(String.init), B = canon(w).split(separator: " ", omittingEmptySubsequences: false).map(String.init)
                if A.count != B.count { continue }
                var slips = 0, fine = true
                for (i, b) in B.enumerated() {
                    if A[i] == b { continue }
                    if rx(b, "[^a-z]", "").count >= 5 && lev(A[i], b) == 1 { slips += 1 } else { fine = false; break }
                }
                if fine && slips > 0 { return Accept(ok: true, how: "typo", want: w) }
            }
        }
        return Accept(ok: false, how: "", want: want.first ?? "")
    }

    // MARK: QE.norm
    /// qengine.js norm: lower-case, quotes, currency dropped, 1,000 → 1000, punctuation → space, leading the/a/an dropped
    public static func qeNorm(_ s: String?) -> String {
        var x = (s ?? "").lowercased()
        for q in ["\u{2019}", "\u{2018}", "`"] { x = x.replacingOccurrences(of: q, with: "'") }
        for c in ["\u{A3}", "$", "\u{20AC}"] { x = x.replacingOccurrences(of: c, with: "") }
        x = rx(x, "(\\d),(\\d{3})", "$1$2")
        x = rx(x, "[.,!?;:\"\u{201C}\u{201D}()]", " ")
        x = collapse(x)
        return rx(x, "^(the|a|an) ", "")
    }

    // MARK: LessonFx.typo
    public struct Typo: Equatable, Sendable {
        public struct Mark: Equatable, Sendable { public var w: String, fix: Bool }
        public var ok: Bool, typo: Bool, marks: [Mark]
    }
    /// letter-slip distance of web LessonFx: UI.similarity scaled by the longer letter count
    public static let similarityDist: (String, String) -> Int = { a, b in
        func letters(_ s: String) -> Int { s.unicodeScalars.filter { ($0.value >= 97 && $0.value <= 122) || $0.value == 32 }.count }
        return Vocab.round((1 - LessonEngine.similarity(a, b)) * Double(max(letters(a), letters(b))))
    }
    static func fxNorm(_ s: String) -> String {
        var x = s.lowercased()
        for q in ["\u{2019}", "\u{2018}", "`"] { x = x.replacingOccurrences(of: q, with: "'") }
        return rx(collapse(x), "[.!?,;:]+$", "")
    }
    /// ≤ 1 slip per word of ≥ 4 letters is accepted (marks[].fix = the corrected word); `strict` = none; `isWord` blocks a slip that is another word.
    public static func typo(_ given: String, _ target: String, strict: Bool = false, protect: [String] = [], isWord: ((String) -> Bool)? = nil, dist: (String, String) -> Int = similarityDist) -> Typo {
        let a = fxNorm(given), b = fxNorm(target)
        let no = Typo(ok: false, typo: false, marks: [])
        if a.isEmpty || b.isEmpty { return no }
        let shown = collapse(rx(target.trimmingCharacters(in: .whitespacesAndNewlines), "[.!?,;:]+$", "")).split(separator: " ").map(String.init)
        if a == b { return Typo(ok: true, typo: false, marks: shown.map { .init(w: $0, fix: false) }) }
        if strict { return no }
        let A = a.split(separator: " ").map(String.init), B = b.split(separator: " ").map(String.init)
        if A.count != B.count || shown.count != B.count { return no }
        let keep = Set(protect.map(fxNorm))
        var marks: [Typo.Mark] = []
        for i in B.indices {
            if A[i] == B[i] { marks.append(.init(w: shown[i], fix: false)); continue }
            let letters = B[i].unicodeScalars.filter { $0.value >= 97 && $0.value <= 122 }.count
            if keep.contains(B[i]) || letters < 4 || dist(A[i], B[i]) > 1 || (isWord?(A[i]) ?? false) { return no }
            marks.append(.init(w: shown[i], fix: true))
        }
        return Typo(ok: true, typo: true, marks: marks)
    }

    // MARK: quiz bands (runQuiz)
    /// estimated IELTS band label of a #/practice/test score in percent
    public static func band(percent p: Int) -> String { p >= 95 ? "8.5+" : p >= 85 ? "7.5–8.0" : p >= 70 ? "6.5–7.0" : p >= 50 ? "5.5–6.0" : "< 5.5" }
}
