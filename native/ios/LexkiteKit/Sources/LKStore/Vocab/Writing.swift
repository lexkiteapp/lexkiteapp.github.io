import Foundation
import LKSync

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
        public struct Card: Sendable { public var id: String, tone: String, draftWords: Int?, titleVi: String, situation: String }
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

extension Verbs {
    /// all matches of `re` as capture arrays (group 0 first)
    static func matchesAll(_ s: String, _ re: String) -> [[String]] { Dict.matches(s, re) }
}
