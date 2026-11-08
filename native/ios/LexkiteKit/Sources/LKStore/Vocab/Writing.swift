import Foundation
import LKSync
import LKCore

/// Writing screens (parity P05): #/ideas, #/letters, #/paraphrase, #/models, #/model, #/phrases. Ports of web/js/{ideas,letters,paraphrase,phrases-model}.js.
/// Content (`IDEAS`, `GT_LETTERS`, `PARAPHRASE`, `MODELS`, `WRITE_PROMPTS`, Task 1 sets) is loaded like the web does and passed in as JSON.
public enum WritingEngine {
    static func rx(_ s: String, _ re: String, _ w: String) -> String { s.replacingOccurrences(of: re, with: w, options: .regularExpression) }

    // MARK: #/ideas
    public struct IdeasView: Sendable {
        /// all topic ids (chips) and the chosen one (unknown / none → the first)
        public var topics: [String], selected: String
        public var topic: JSON
        public var issues: [JSON] { topic.list("issues") }
        /// "ideas" of an issue = supporting + opposing arguments
        public func ideaCount(_ issue: JSON) -> Int { issue.list("for").count + issue.list("against").count }
        public var vocabCount: Int { topic.list("vocab").count }
        /// Task 2 prompts of this topic (at most 5 are listed)
        public var prompts: [String]
    }
    public static func ideas(_ all: [JSON], topic: String?, prompts: [JSON] = []) -> IdeasView? {
        guard let first = all.first else { return nil }
        let tp = all.first { $0.s("topic") == topic } ?? first
        return IdeasView(topics: all.map { $0.s("topic") }, selected: tp.s("topic"), topic: tp, prompts: prompts.filter { $0.s("topic") == tp.s("topic") }.prefix(5).map { $0.s("id") })
    }
    /// tap on a chunk chip "en|vi": what the save dialog receives (the Vietnamese gloss only for Vietnamese learners)
    public static func ideaChunkSave(_ chunk: String, example: String, learnLang: String) -> (phrase: String, vi: String, sentence: String) {
        let p = chunk.split(separator: "|", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
        return (p[0], learnLang == "vi" && p.count > 1 ? p[1] : "", example)
    }

    // MARK: #/letters
    public static let tones = ["formal", "semi-formal", "informal"]
    public static let letterMinWords = 150, letterMinutes = 20
    /// words as the counter sees them: runs of letters, digits, ' ’ -
    public static func wordCount(_ s: String) -> Int {
        guard let re = try? NSRegularExpression(pattern: "[A-Za-z0-9'\u{2019}-]+") else { return 0 }
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
        return re.numberOfMatches(in: t, range: NSRange(t.startIndex..., in: t))
    }
    public struct LetterList: Sendable {
        public struct Tab: Sendable { public var tone: String, n: Int }
        public struct Card: Sendable { public var id: String, tone: String; public var draftWords: Int? = nil; public var titleVi: String, situation: String }
        public var tabs: [Tab], cards: [Card]
        /// the tone tip is shown when a tone is selected
        public var tip: Bool
    }
    /// `?tone=` (unknown → all), `drafts` = Store 'letterDrafts' {id: text}; situation cut at 137 chars + "…" when longer than 140
    public static func letters(_ all: [JSON], tone t: String?, drafts: JSON) -> LetterList {
        let tone = t.flatMap { tones.contains($0) ? $0 : nil } ?? "all"
        let tabs = [LetterList.Tab(tone: "all", n: all.count)] + tones.map { k in LetterList.Tab(tone: k, n: all.filter { $0.s("tone") == k }.count) }
        let cards = all.filter { tone == "all" || $0.s("tone") == tone }.map { x -> LetterList.Card in
            let d = drafts[x.s("id")]?.string ?? ""
            let sit = x.s("situation")
            return .init(id: x.s("id"), tone: x.s("tone"), draftWords: d.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : wordCount(d),
                         titleVi: x.t("titleVi") ? x.s("titleVi") : x.s("topic"), situation: sit.utf16.count > 140 ? Vocab.prefix(sit, 137) + "…" : sit)
        }
        return LetterList(tabs: tabs, cards: cards, tip: tone != "all")
    }
    public struct LetterCheck: Equatable, Sendable {
        public enum Kind: String, Sendable { case length, greeting, closing, paragraphs, contractions }
        public var kind: Kind, ok: Bool
        /// words (length) or contraction count
        public var n: Int
    }
    /// "Kiểm tra": ≥ 150 words · greeting starts like the prompt's · closing phrase present · ≥ 4 paragraphs · (formal) no contractions
    public static func checkLetter(_ x: JSON, text: String) -> [LetterCheck] {
        let s = text.trimmingCharacters(in: .whitespacesAndNewlines), n = wordCount(s), low = s.lowercased()
        let first = s.components(separatedBy: "\n").first ?? ""
        let openWord = x.s("open").lowercased().split(whereSeparator: { $0.isWhitespace }).first.map(String.init) ?? ""
        var closeWord = x.s("close").lowercased(); if closeWord.hasSuffix(",") { closeWord.removeLast() }
        let paragraphs = Dict.split(s, "\\n\\s*\\n").filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }.count
        let contractions = (try? NSRegularExpression(pattern: "\\b\\w+'(m|re|s|t|ll|ve|d)\\b", options: [.caseInsensitive]))?.numberOfMatches(in: s, range: NSRange(s.startIndex..., in: s)) ?? 0
        var rows = [LetterCheck(kind: .length, ok: n >= letterMinWords, n: n),
                    LetterCheck(kind: .greeting, ok: first.trimmingCharacters(in: .whitespacesAndNewlines).lowercased().hasPrefix(openWord), n: 0),
                    LetterCheck(kind: .closing, ok: closeWord.isEmpty || low.contains(closeWord), n: 0),
                    LetterCheck(kind: .paragraphs, ok: paragraphs >= 4, n: paragraphs)]
        if x.s("tone") == "formal" { rows.append(LetterCheck(kind: .contractions, ok: contractions == 0, n: contractions)) }
        return rows
    }
    /// AI feedback is offered from 50 words on
    public static func letterAIEligible(_ text: String) -> Bool { wordCount(text) >= 50 }

    // MARK: #/paraphrase
    static let stop: Set<String> = Set("more less than that this with from their have been which about into over some such them they were will would".split(separator: " ").map(String.init))
    static func keyw(_ s: String) -> [String] {
        guard let re = try? NSRegularExpression(pattern: "[a-z]+") else { return [] }
        let l = s.lowercased()
        return re.matches(in: l, range: NSRange(l.startIndex..., in: l)).compactMap { Range($0.range, in: l).map { String(l[$0]) } }.filter { $0.count > 3 && !stop.contains($0) }
    }
    /// a (question phrase, passage phrase) pair is usable unless it has gaps / slashes, is long, or nearly repeats the question's words
    public static func paraphraseUsable(_ q: String, _ p: String) -> Bool {
        if Verbs.m(q + p, "_{2,}|\\.\\.\\.|…|/") || p.utf16.count > 90 { return false }
        let a = Set(keyw(q)), b = keyw(p)
        if b.isEmpty { return true }
        return Double(b.filter { a.contains($0) }.count) / Double(min(max(a.count, 1), b.count)) < 0.6
    }
    public static func paraphrasePairs(_ data: [JSON]) -> [(q: String, p: String)] {
        data.compactMap { x in guard let a = x.array, a.count >= 2, let q = a[0].string, let p = a[1].string, paraphraseUsable(q, p) else { return nil }; return (q, p) }
    }
    public static let paraphraseRound = 10
    /// options of one question: the right phrase + 3 other usable phrases of similar length (shuffled by the caller's `shuffle`)
    public static func paraphraseOptions(_ it: (q: String, p: String), all: [(q: String, p: String)], shuffle: ([String]) -> [String] = { $0 }) -> [String] {
        let others = all.filter { $0.p != it.p && $0.q != it.q && abs($0.p.utf16.count - it.p.utf16.count) < 40 }.map(\.p)
        return shuffle([it.p] + Array(shuffle(others).prefix(3)))
    }
    /// end of round: percent and the reward (quizzes 1, xp 5 + 2·right)
    public static func paraphraseFinish(right: Int, total: Int) -> (percent: Int, xp: Int) { (Vocab.round(Double(right) / Double(total) * 100), 5 + right * 2) }

    // MARK: annotated model text
    public enum Segment: Equatable, Sendable {
        case text(String)
        /// [[phrase|gloss]] – tap to save
        case chunk(en: String, vi: String)
        /// {{linking word}}
        case linker(String)
        /// <<Role>> inside the paragraph
        case role(String)
    }
    public struct Paragraph: Equatable, Sendable {
        /// <<Role>> at the start of the paragraph → label above it
        public var head: String?
        public var segments: [Segment]
    }
    /// `[[phrase|gloss]]`, `{{linker}}`, `<<Role>>` markup → paragraphs (split on blank lines). Text is plain – the UI never needs HTML escaping.
    public static func annotated(_ text: String) -> [Paragraph] {
        let roleRe = "<<([^&<>\"']+?)>>\\s*"
        return Dict.split(text, "\\n\\s*\\n").map { raw in
            var p = raw.trimmingCharacters(in: .whitespacesAndNewlines), head: String?
            if let m = Verbs.groups(p, "^" + roleRe), let r = p.range(of: "^" + roleRe, options: .regularExpression) { head = m[1]; p.removeSubrange(r) }
            var segs: [Segment] = []
            let pat = roleRe + "|\\[\\[([^|\\]]+)\\|([^\\]]+)\\]\\]|\\{\\{([^}]+)\\}\\}"
            var last = p.startIndex
            if let re = try? NSRegularExpression(pattern: pat) {
                for m in re.matches(in: p, range: NSRange(p.startIndex..., in: p)) {
                    guard let r = Range(m.range, in: p) else { continue }
                    if r.lowerBound > last { segs.append(.text(String(p[last..<r.lowerBound]))) }
                    func g(_ i: Int) -> String? { Range(m.range(at: i), in: p).map { String(p[$0]) } }
                    if let role = g(1) { segs.append(.role(role)) }
                    else if let en = g(2), let vi = g(3) { segs.append(.chunk(en: en, vi: vi)) }
                    else if let l = g(4) { segs.append(.linker(l)) }
                    last = r.upperBound
                }
            }
            if last < p.endIndex { segs.append(.text(String(p[last...]))) }
            return Paragraph(head: head, segments: segs)
        }
    }
    /// the text without markup (read aloud / sentence lookup)
    public static func plain(_ t: String) -> String {
        rx(rx(rx(t, "<<[^>]*>>", ""), "\\[\\[([^|\\]]*)\\|[^\\]]*\\]\\]", "$1"), "\\{\\{([^}]*)\\}\\}", "$1")
    }
    public static func chunks(_ text: String) -> [(en: String, vi: String)] { Verbs.matchesAll(text, "\\[\\[([^|\\]]+)\\|([^\\]]+)\\]\\]").map { ($0[1], $0[2]) } }
    public static func linkers(_ text: String) -> [String] {
        var seen = Set<String>(), out: [String] = []
        for m in Verbs.matchesAll(text, "\\{\\{([^}]+)\\}\\}") where seen.insert(m[1]).inserted { out.append(m[1]) }
        return out
    }
    /// the sentence of the plain text that contains the phrase (context saved with the phrase card)
    public static func sentence(containing en: String, in text: String) -> String {
        let p = plain(text)
        let sents = Verbs.matchesAll(p, "[^.!?]+[.!?]+").map { $0[0] }
        return (sents.first { $0.contains(en) } ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    }
    /// the phrase card a "+" tap writes: {word, vi, pos phrase, ex = sentence, emoji 🧩, topic phrases} + context {text, title "Bài mẫu Task n"}
    public static func phraseEntry(en: String, vi: String, sentence: String, task: String) -> (entry: JSON, context: JSON?) {
        let entry = JSON.obj([("word", .string(en)), ("vi", .string(vi)), ("pos", "phrase"), ("ex", .string(sentence)), ("emoji", "🧩"), ("topic", "phrases")])
        return (entry, sentence.isEmpty ? nil : .obj([("text", .string(sentence)), ("title", .string("Bài mẫu Task " + task))]))
    }

    // MARK: gap exercises (vocab = phrases, link = linking words)
    public static func gapNorm(_ x: String) -> String {
        rx(rx(rx(x.lowercased(), "[\u{2019}']", "'"), "[^a-z0-9' ]", " "), "\\s+", " ").trimmingCharacters(in: .whitespacesAndNewlines)
    }
    public struct Gap: Sendable {
        /// the answer of each blank in text order; `bank` = unique answers (shuffle for display)
        public var answers: [String], bank: [String]
        public init(model text: String, kind: String) {
            let body = Dict.split(text, "\\n\\s*\\n").map { WritingEngine.rx($0, "<<[^>]*>>\\s*", "") }.joined(separator: "\n\n")
            answers = (kind == "vocab" ? WritingEngine.chunks(body).map(\.en) : WritingEngine.linkers(body))
            if kind == "link" { answers = Verbs.matchesAll(body, "\\{\\{([^}]+)\\}\\}").map { $0[1] } }
            var seen = Set<String>(), b: [String] = []
            for a in answers where seen.insert(a).inserted { b.append(a) }
            bank = b
        }
        /// check: right = blanks whose normalised input equals the normalised answer
        public func check(_ inputs: [String]) -> (right: Int, marks: [Bool]) {
            let marks = answers.enumerated().map { (i, a) in WritingEngine.gapNorm(i < inputs.count ? inputs[i] : "") == WritingEngine.gapNorm(a) }
            return (marks.filter { $0 }.count, marks)
        }
    }
    public struct ModelResult: Equatable, Sendable { public var percent: Int, xp: Int, perfect: Bool, markDone: Bool }
    /// finish(kind, right, total): reward {quizzes 1, perfect, xp 5 + 2·right}; ≥ 70 % marks the mode done (✓ on its tab)
    public static func modelFinish(right: Int, total: Int) -> ModelResult {
        let pct = total > 0 ? Vocab.round(Double(right) / Double(total) * 100) : 0
        return ModelResult(percent: pct, xp: 5 + right * 2, perfect: pct == 100, markDone: pct >= 70)
    }
    public static let modelModes = ["read", "vocab", "gram", "link", "copy", "write"]

    // MARK: #/models and #/model/<id>
    public struct ModelRow: Equatable, Sendable { public var id: String, title: String, kind: String, topic: String, words: Int?, band: String }
    /// default tab: "gt" for the General Training exam, else "2"
    public static func modelsTab(query t: String?, exam: String) -> String { t.flatMap { $0.isEmpty ? nil : $0 } ?? (exam == "ieltsgt" ? "gt" : "2") }
    /// rows of a tab, filtered by "title kind topic" containing the lower-case search, sorted by kind then title.
    /// `info(model)` gives title / kind / topic (Task 2: prompt text + type + topic; Task 1: set title + chart type; gt: letter title + tone).
    public static func models(_ all: [JSON], tab: String, q rawQ: String, info: (JSON) -> (title: String, kind: String, topic: String)) -> [ModelRow] {
        let q = rawQ.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let rows = all.filter { $0["task"]?.jsToString == tab }.map { m -> ModelRow in
            let i = info(m)
            return ModelRow(id: m.s("id"), title: i.title, kind: i.kind, topic: i.topic, words: m.t("words") ? m.i("words") : nil, band: m["band"]?.jsToString ?? "")
        }.filter { q.isEmpty || ($0.title + " " + $0.kind + " " + $0.topic).lowercased().contains(q) }
        return Vocab.stableSorted(rows) { a, b in
            let c = a.kind.localizedCompare(b.kind)
            return c != .orderedSame ? c == .orderedAscending : a.title.localizedCompare(b.title) == .orderedAscending
        }
    }
    /// web TYPE_VI / TONE: the Vietnamese source strings of the chart types and letter tones (the UI translates them; the list sorts by them)
    public static let chartTypeKey = ["line": "Biểu đồ đường", "bar": "Biểu đồ cột", "pie": "Biểu đồ tròn", "table": "Bảng số liệu", "process": "Quy trình", "map": "Bản đồ"]
    public static let toneKey = ["formal": "Trang trọng", "semi-formal": "Bán trang trọng", "informal": "Thân mật"]
    /// the `info` of `models(_:tab:q:info:)`: Task 1 = chart set title + type, gt = letter title + tone, Task 2 = prompt text + type + topic (looked up by `ref`)
    public static func modelInfo(_ m: JSON, prompts: [JSON], task1: [JSON], letters: [JSON]) -> (title: String, kind: String, topic: String) {
        let ref = m.s("ref")
        switch m["task"]?.jsToString ?? "" {
        case "1": let d = task1.first { $0.s("id") == ref }; return (d?.s("title") ?? ref, d.map { chartTypeKey[$0.s("type")] ?? $0.s("type") } ?? "Task 1", "")
        case "gt": let l = letters.first { $0.s("id") == ref }; return (l?.s("titleVi") ?? ref, l.map { toneKey[$0.s("tone")] ?? $0.s("tone") } ?? "Viết thư", "")
        default: let p = prompts.first { $0.s("id") == ref }; return (p?.s("text") ?? ref, p?.s("type") ?? "Task 2", p?.s("topic") ?? "")
        }
    }
    /// where "back to the prompt" goes
    public static func modelBack(_ m: JSON) -> String {
        let task = m["task"]?.jsToString ?? ""
        if task == "gt" { return "#/letters/" + m.s("ref") }
        return task == "1" ? "#/task1/" + m.s("ref") : "#/write/" + m.s("ref")
    }
    public static func modelBadge(_ m: JSON) -> String { m["task"]?.jsToString == "gt" ? "General · Task 1" : "Writing Task " + (m["task"]?.jsToString ?? "") }

    // MARK: #/phrases
    /// "Thêm nhanh 20 cụm": every [[phrase|gloss]] of every model (≥ 2 words, ≤ 48 chars), most frequent first (stable), not already saved, 20 at most
    public static func starterPhrases(models: [JSON], alreadySaved: (String) -> Bool, limit: Int = 20) -> [(entry: JSON, context: JSON?)] {
        struct E { var en: String, vi: String, n: Int, sent: String, task: String }
        var order: [String] = [], seen: [String: E] = [:]
        for m in models {
            let text = m.s("text")
            let stripped = rx(rx(text, "<<[^>]+>>", ""), "\\{\\{([^}]+)\\}\\}", "$1")
            let sents = Dict.split(stripped, "(?<=[.!?])\\s+")
            for x in Verbs.matchesAll(text, "\\[\\[([^|\\]]+)\\|([^\\]]+)\\]\\]") {
                let en = x[1].trimmingCharacters(in: .whitespacesAndNewlines), k = en.lowercased()
                if en.split(separator: " ").count < 2 || en.utf16.count > 48 { continue }
                let sent = rx(sents.first { $0.contains("[[" + x[1]) } ?? "", "\\[\\[([^|\\]]+)\\|[^\\]]+\\]\\]", "$1")
                if var e = seen[k] { e.n += 1; seen[k] = e }
                else { order.append(k); seen[k] = E(en: en, vi: x[2].trimmingCharacters(in: .whitespacesAndNewlines), n: 1, sent: sent, task: m["task"]?.jsToString ?? "") }
            }
        }
        let top = Vocab.stableSorted(order.compactMap { seen[$0] }.filter { !alreadySaved($0.en) }) { $0.n > $1.n }.prefix(limit)
        return top.map { phraseEntry(en: $0.en, vi: $0.vi, sentence: $0.sent.trimmingCharacters(in: .whitespacesAndNewlines), task: $0.task) }
    }
    /// phrase cards (has a space, pos phrase or topic phrases), newest first; "Học các cụm" from 4
    public static func phraseBook(_ cards: [JSON]) -> (list: [JSON], canLearn: Bool) {
        let l = Vocab.stableSorted(cards.filter { Vocab.isPhrase($0) }) { ($0.d("added") ?? 0) > ($1.d("added") ?? 0) }
        return (l, l.count >= 4)
    }
}

// MARK: practice modes generated from a model (web/js/phrases-model.js): gram · copy · write, and the lemmatizer they share
/// web phrases.js `App.lemma` (dictionary form of an inflected word) with its irregular-verb tables `App.lemmaT` (PAST, BASE).
/// Tables = verbs.json `LEMMA` {IRR, BASE_EXTRA, KEEP}; `known(word)` = the word index (web IELTS_DATA.INDEX, `TopicCatalog.index`), lower-case.
public struct Lemmatizer: Sendable {
    public let past: [String: String], base: [String: String]
    let keep: Set<String>
    let lookup: @Sendable (String) -> Bool
    public init(tables t: JSON, known: @escaping @Sendable (String) -> Bool) {
        let l = t["LEMMA"] ?? .null
        var past: [String: String] = [:], base: [String: String] = [:]
        for row in l.s("IRR").split(separator: "|") {
            let f = row.split(separator: " ").map(String.init)
            guard f.count >= 3 else { continue }
            past[f[0]] = f[1]
            if f[1] != f[0] { base[f[1]] = f[0] }
            if f[2] != f[0] { base[f[2]] = f[0] }
        }
        for (k, v) in l["BASE_EXTRA"]?.object ?? [:] { if let x = v.string { base[k] = x } }
        self.past = past; self.base = base; keep = Set(l.strs("KEEP")); lookup = known
    }
    public func known(_ w: String) -> Bool { lookup(w) }
    public func lemma(_ w: String) -> String {
        let l = w.lowercased()
        if let b = base[l] { return b }
        if keep.contains(l) || l.count < 4 || (known(l) && !Verbs.m(l, "(ies|es|s|ed|ing|er|est)$")) { return l }
        func cut(_ n: Int) -> String { String(l.dropLast(n)) }
        func tryB(_ a: [String?]) -> String? { a.compactMap { $0 }.first { !$0.isEmpty && known($0) } }
        func dbl(_ re: String, _ n: Int) -> String? { Verbs.m(l, re) ? cut(n) : nil }
        var b: String?
        if Verbs.m(l, "ies$") { b = tryB([cut(3) + "y"]) }
        if b == nil, Verbs.m(l, "ves$") { b = tryB([cut(3) + "f", cut(3) + "fe"]) }
        if b == nil, Verbs.m(l, "(ss|x|z|ch|sh|o)es$") { b = tryB([cut(2)]) }
        if b == nil, Verbs.m(l, "[^s]s$") { b = tryB([cut(1)]) }
        if b == nil, Verbs.m(l, "ied$") { b = tryB([cut(3) + "y"]) }
        if b == nil, Verbs.m(l, "ed$") { b = tryB([cut(1), cut(2), dbl("(.)\\1ed$", 3)]) }
        if b == nil, Verbs.m(l, "ing$") { b = tryB([cut(3), cut(3) + "e", dbl("(.)\\1ing$", 4)]) }
        if b == nil, Verbs.m(l, "iest$") { b = tryB([cut(4) + "y"]) }
        if b == nil, Verbs.m(l, "est$") { b = tryB([cut(3), cut(2), dbl("(.)\\1est$", 4)]) }
        if b == nil, Verbs.m(l, "ier$") { b = tryB([cut(3) + "y"]) }
        if b == nil, Verbs.m(l, "er$"), !known(l) { b = tryB([cut(2), cut(1), dbl("(.)\\1er$", 3)]) }
        return b ?? l
    }
}

public extension WritingEngine {
    static func paras(_ t: String) -> [String] { Dict.split(t, "\\n\\s*\\n") }
    static func stripRole(_ p: String) -> String { rx(p, "<<[^>]*>>\\s*", "") }
    static func roleOf(_ p: String) -> String { Verbs.groups(p, "<<([^>]*)>>")?[1] ?? "" }
    /// JS `s.split(/(\s+)/)`: the pieces AND the whitespace runs between them
    static func splitKeep(_ p: String) -> [String] {
        guard let re = try? NSRegularExpression(pattern: "\\s+") else { return [p] }
        var out: [String] = [], last = p.startIndex
        for m in re.matches(in: p, range: NSRange(p.startIndex..., in: p)) {
            guard let r = Range(m.range, in: p) else { continue }
            out.append(String(p[last..<r.lowerBound])); out.append(String(p[r])); last = r.upperBound
        }
        out.append(String(p[last...])); return out
    }
    private static func capLike(_ w: String, _ x: String) -> String { (w.first?.isUppercase ?? false) && !x.isEmpty ? x.prefix(1).uppercased() + x.dropFirst() : x }

    /// "gram" mode as the web shows it (errExercise): real errors are planted in the model text, the learner types the right form. `wrong` "" = a word is missing (an article).
    struct ErrItem: Equatable, Sendable { public var i: Int, pre: String, post: String, ans: String, wrong: String, why: String }
    /// Candidates come from the lemmatizer and the word index (`index(word)` = web IELTS_DATA.INDEX): missing article, past tense of an irregular verb, was/were, -ed verb, -ly adverb, plural noun,
    /// comparative; at most 12, at least 6 tokens apart. `random` nil = the vector run (Math.random 0.5: no article dropped, no shuffle). nil result = fewer than 5 errors could be
    /// planted (the page then shows the "choose the form" exercise = `gram`). `why` is the Vietnamese key of the hint.
    static func errors(_ m: JSON, lem: Lemmatizer, index: (String) -> JSON?, random: (() -> Double)? = nil, shuffle: ([ErrItem]) -> [ErrItem] = { $0 }) -> [ErrItem]? {
        let text = paras(plain(stripRole(m.s("text")))).joined(separator: "\n\n")
        var cand: [ErrItem] = []
        for (i, tok) in splitKeep(text).enumerated() {
            guard let mm = Verbs.groups(tok, "^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$") else { continue }
            let w = mm[2], l = w.lowercased(), lm = lem.lemma(l), e = index(lm)
            var wrong: String?, why = ""
            if Verbs.m(l, "^(the|a|an)$"), (random?() ?? 0.5) < 0.5 { wrong = ""; why = "Thiếu mạo từ" }
            else if let b = lem.base[l], lem.past[b] == l, !Verbs.m(l, "^(was|were|had|did)$") { wrong = b; why = "Sai thì (cần quá khứ)" }
            else if l == "was" || l == "were" { wrong = l == "was" ? "were" : "was"; why = "Sai hòa hợp chủ – vị" }
            else if Verbs.m(l, "ed$"), lm != l, let e, (e.s("pos").isEmpty ? "v" : e.s("pos")).contains("v") { wrong = lm; why = "Sai thì / thiếu -ed" }
            else if Verbs.m(l, "ly$"), lem.known(String(l.dropLast(2))), l.count > 5 {
                let x = rx(rx(rx(l, "ily$", "y"), "ally$", "al"), "ly$", "")
                if lem.known(x) { wrong = x; why = "Cần trạng từ (-ly)" }
            }
            else if Verbs.m(l, "[^s]s$"), lm != l, let e, e.s("pos").hasPrefix("n") { wrong = lm; why = "Danh từ số nhiều" }
            else if Verbs.m(l, "(er|est)$"), lm != l, !lem.known(l) { wrong = lm; why = "Thiếu so sánh hơn/nhất" }
            if let wr = wrong, wr != l { cand.append(ErrItem(i: i, pre: mm[1], post: mm[3], ans: w, wrong: capLike(w, wr), why: why)) }
        }
        var pick: [ErrItem] = []
        for c in shuffle(cand) where pick.count < 12 && !pick.contains(where: { abs($0.i - c.i) < 6 }) { pick.append(c) }
        return pick.count < 5 ? nil : pick
    }
    static func errScore(_ items: [ErrItem], typed: [String]) -> Int { items.indices.filter { gapNorm($0 < typed.count ? typed[$0] : "") == gapNorm(items[$0].ans) }.count }

    /// "gram" fallback: pick the right form of a word at up to 12 places. `forms` = verbs.json `FORMS`.
    struct GramSlot: Equatable, Sendable { public var pre: String, answer: String, options: [String], post: String }
    enum GramTok: Equatable, Sendable { case plain(String), slot(Int, GramSlot) }
    static func gram(_ m: JSON, forms: [[String]], random: (() -> Double)? = nil, shuffle: ([String]) -> [String] = { $0 }) -> [[GramTok]] {
        let text = paras(plain(m.s("text"))).joined(separator: "\n\n")
        var picked = 0, n = 0
        return text.components(separatedBy: "\n\n").map { p in
            splitKeep(p).map { tok -> GramTok in
                let mm = Verbs.groups(tok, "^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$")
                guard let mm, let f = forms.first(where: { $0.contains(mm[2].lowercased()) }), picked < 12, (random?() ?? 0.5) >= 0.45 else { return .plain(tok) }
                picked += 1
                let w = mm[2], idx = n, opts = shuffle(f).map { o in (w.first?.isUppercase ?? false) ? o.prefix(1).uppercased() + o.dropFirst() : o }
                n += 1
                return .slot(idx, GramSlot(pre: mm[1], answer: w, options: opts, post: mm[3]))
            }
        }
    }
    static func gramScore(_ answers: [String], picks: [String]) -> Int { answers.indices.filter { ($0 < picks.count ? picks[$0] : "").lowercased() == answers[$0].lowercased() }.count }

    /// "copy" mode: every word is a box (length = word length); punctuation stays.
    static func tokens(_ s: String) -> [String] { Verbs.matchesAll(s, "[A-Za-z][A-Za-z'’-]*|\\d+(?:[.,]\\d+)*%?|[^\\sA-Za-z\\d]").map { $0[0] } }
    struct SlotBlock: Equatable, Sendable { public var role: String, toks: [String] }
    static func slots(_ m: JSON) -> (blocks: [SlotBlock], answers: [String]) {
        let blocks = paras(m.s("text")).map { SlotBlock(role: roleOf($0), toks: tokens(plain(stripRole($0)))) }
        return (blocks, blocks.flatMap { $0.toks.filter { !Verbs.m($0, "^[^A-Za-z\\d]$") } })
    }
    static func slotScore(_ answers: [String], inputs: [String]) -> Int { answers.indices.filter { gapNorm($0 < inputs.count ? inputs[$0] : "") == gapNorm(answers[$0]) }.count }

    /// "write" mode: each sentence is given as lemmas, the learner rewrites it. `lemma` = `Lemmatizer.lemma`.
    struct ModelSentence: Equatable, Sendable { public var s: String, role: String }
    static func sentencesOf(_ m: JSON) -> [ModelSentence] {
        paras(m.s("text")).flatMap { p -> [ModelSentence] in
            let role = roleOf(p)
            return Verbs.matchesAll(plain(stripRole(p)), "[^.!?]+[.!?]+").enumerated().map { ModelSentence(s: $1[0].trimmingCharacters(in: .whitespacesAndNewlines), role: $0 == 0 ? role : "") }
        }
    }
    static func lemmaPrompt(_ s: String, lemma: (String) -> String) -> String {
        tokens(s).enumerated().map { (k, t) -> String in
            guard Verbs.m(t, "^[A-Za-z]") else { return t }
            if (t.first?.isUppercase ?? false), k > 0, t != "I" { return t }
            if t.contains("'") { return Dict.split(t, "['’]").enumerated().map { j, x in j > 0 ? "'" + x : lemma(x) }.joined(separator: " / ") }
            return lemma(t)
        }.joined(separator: " / ")
    }
    /// right = exact (normalised) or ≥ 95 % similar
    static func lemmaRight(_ typed: String, _ target: String) -> Bool {
        let a = gapNorm(typed), b = gapNorm(target)
        return a == b || Vocab.round(LessonEngine.similarity(a, b) * 100) >= 95
    }
}

extension Verbs {
    /// all matches of `re` as capture arrays (group 0 first)
    static func matchesAll(_ s: String, _ re: String) -> [[String]] { Dict.matches(s, re) }
}
