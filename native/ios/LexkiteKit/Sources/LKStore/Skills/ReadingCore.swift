import Foundation
import LKSync
import LKCore
import LKStrings

public enum ReadingRules {
    /// the keyword chip scrolls to its word, then opens the popup after this
    public static let keywordPopupDelayMs = 350
    public static let defaultHighlights = "kw awl link mine"
    public static let highlightKeys = ["kw", "awl", "link", "mine"]
    /// minutes = max(2, round(words / 140))
    public static let wordsPerMinute = 140.0
}

// MARK: - #/reading

public struct ReadingList: Equatable, Sendable {
    public enum SummaryKind: String, Equatable, Sendable { case text, en, translate }
    public struct Tab: Equatable, Sendable { public var lv: String, n: Int, selected: Bool }
    public struct Card: Equatable, Sendable {
        public var id: String, emoji: String, title: String, level: String
        public var summary: String, kind: SummaryKind
        /// the English text kept for the on-demand translation (`translate` kind)
        public var summaryEn: String
        public var minutes: Int, questions: Int
        public var done: String?
    }
    public var tabs: [Tab] = [], cards: [Card] = []
    public var selected: String?
    public init() {}
    /// the value written to `vb.readLv`
    public var persistedLevel = "all"

    public static func minutes(_ r: JSON) -> Int { max(2, Vocab.round(Double(r.s("text").split(whereSeparator: { $0.isWhitespace }).count) / ReadingRules.wordsPerMinute)) }
    /// `App.viHtml(vi, en)` for the learner's language
    public static func summary(_ r: JSON, learnLang: String) -> (String, SummaryKind) {
        let vi = r.s("summaryVi"), en = r.s("summaryEn")
        if vi.isEmpty || learnLang == "vi" { return (vi.isEmpty ? en : vi, .text) }
        if learnLang == "en" && !en.isEmpty { return (en, .en) }
        return (vi, .translate)
    }

    /// What the screens show: web machine-translates the Vietnamese summary at runtime; native has no translator yet, so other languages read the English one.
    public static func shownSummary(_ r: JSON, learnLang: String) -> String { let s = summary(r, learnLang: learnLang), en = r.s("summaryEn"); return s.1 == .translate && !en.isEmpty ? en : s.0 }

    /// `remembered` = localStorage `vb.readLv`
    public static func build(_ data: SkillsData, query: [String: String], remembered: String?, game: JSON, learnLang: String) -> ReadingList {
        let lvs = Array(Set(data.readings.map { $0.s("level") }.filter { !$0.isEmpty })).sorted()
        var lv = query["lv"].flatMap { $0.isEmpty ? nil : $0 } ?? (remembered.flatMap { $0.isEmpty ? nil : $0 } ?? "all")
        if lv != "all" && !lvs.contains(lv) { lv = "all" }
        var out = ReadingList(); out.persistedLevel = lv
        if lvs.count > 1 {
            out.tabs = [Tab(lv: "all", n: data.readings.count, selected: lv == "all")] + lvs.map { l in Tab(lv: l, n: data.readings.filter { $0.s("level") == l }.count, selected: lv == l) }
            out.selected = lv
        }
        let done = game["readDone"] ?? .null
        out.cards = data.readings.filter { lv == "all" || $0.s("level") == lv }.map { r in
            let s = summary(r, learnLang: learnLang), d = done[r.s("id")]
            return Card(id: r.s("id"), emoji: r.s("emoji"), title: r.s("title"), level: r.s("level"), summary: s.0, kind: s.1, summaryEn: r.s("summaryEn"),
                        minutes: minutes(r), questions: r.list("questions").count, done: d.flatMap { JSON.truthy($0) ? $0.jsToString : nil })
        }
        return out
    }
}

// MARK: - #/read/<id>

public struct ReaderPage: Sendable {
    public let reading: JSON
    public let passage: [[[Lexis.Piece]]]
    public var counts: [String: Int] { Lexis.counts(passage) }
    public var paragraphs: Int { passage.count }
    public var sentences: [[Lexis.Piece]] { passage.flatMap { $0 } }
    public var words: Int { sentences.reduce(0) { $0 + $1.filter(\.isWord).count } }
    public var keywords: [String] { reading.strs("keywords") }

    public init(_ r: JSON, lexis: Lexis, inDeck: (String) -> Bool) {
        reading = r
        passage = lexis.markText(r.s("text"), keywords: Set(r.strs("keywords").map { $0.lowercased() }), mine: inDeck)
    }
    /// the text of a sentence: tokens joined, whitespace collapsed, trimmed (the context saved with a word)
    public static func plain(_ s: [Lexis.Piece]) -> String {
        s.map { p -> String in switch p { case .text(let t): return t; case .word(let shown, _, _, _): return shown } }.joined().split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
    /// settings.hl → the chips that are on; an empty / missing setting means all four
    public static func highlights(_ settings: JSON) -> [String] {
        (settings.t("hl") ? settings.s("hl") : ReadingRules.defaultHighlights).split(separator: " ").map(String.init)
    }
    /// a chip toggled: the new setting (chips on, in the order kw awl link mine)
    public static func toggled(_ on: [String], _ k: String) -> [String] {
        let s = Set(on); let t = s.contains(k) ? s.subtracting([k]) : s.union([k])
        return ReadingRules.highlightKeys.filter(t.contains)
    }
    /// the token a keyword chip scrolls to: the exact word, else the first word starting with the keyword's first five letters → (sentence index, piece index)
    public func firstToken(for keyword: String) -> (sentence: Int, piece: Int)? {
        let k = keyword.lowercased(), pre = String(k.prefix(5)), all = sentences
        func find(_ ok: (String) -> Bool) -> (Int, Int)? {
            for (si, s) in all.enumerated() { for (pi, p) in s.enumerated() { if case .word(_, let w, _, _) = p, ok(w) { return (si, pi) } } }
            return nil
        }
        return find { $0 == k } ?? find { $0.hasPrefix(pre) }
    }
    /// "Nghe cả bài": every displayed sentence split like the audio does → which displayed sentence each spoken piece belongs to
    public var aloud: (text: String, sentenceOf: [Int]) {
        let ss = sentences.map { Self.plain($0) }
        var idx: [Int] = []
        for (i, s) in ss.enumerated() { for _ in VoiceCore.split(s) { idx.append(i) } }
        return (ss.joined(separator: " "), idx)
    }

    /// "+ Lưu tất cả từ khóa": every keyword not yet a card → the library entry or `{word, topic: "mine", emoji}`, with the first sentence that has the word
    public func saveAllKeywords(inDeck: (String) -> Bool, index: (String) -> JSON?) -> [(entry: JSON, ctx: JSON?)] {
        keywords.compactMap { k in
            if inDeck(k) { return nil }
            let sentence = firstToken(exact: k.lowercased()).map { Self.plain(sentences[$0]) } ?? ""
            let entry = index(k.lowercased()) ?? .obj([("word", .string(k)), ("topic", "mine"), ("emoji", .string(reading.s("emoji")))])
            return (entry, sentence.isEmpty ? nil : .obj([("text", .string(sentence)), ("title", .string(ReaderPage.contextTitle(reading.s("title"))))]))
        }
    }
    func firstToken(exact w: String) -> Int? {
        sentences.firstIndex { $0.contains { if case .word(_, let x, _, _) = $0 { return x == w }; return false } }
    }
    /// the context title is a key translated when drawn (web study.js ctxTitle)
    public static func contextTitle(_ title: String) -> String { "Bài đọc: " + title }
}

// MARK: - the word popup (listening transcript and reader)

public enum WordPopup {
    public struct Found: Equatable, Sendable {
        public var entry: JSON
        public var word: String, pos: String, level: String
        public var ipa: String, mean: String, def: String
        /// the word is a card already → "Thêm ngữ cảnh"
        public var saved: Bool
        /// the context box: the sentence with this word in bold
        public var sentence: String, ctxWord: String
        public var detailsHref: String
        public init(entry: JSON, word: String, pos: String, level: String, ipa: String, mean: String, def: String, saved: Bool, sentence: String, ctxWord: String, detailsHref: String) {
            self.entry = entry; self.word = word; self.pos = pos; self.level = level; self.ipa = ipa; self.mean = mean; self.def = def; self.saved = saved; self.sentence = sentence; self.ctxWord = ctxWord; self.detailsHref = detailsHref
        }
    }
    public enum Phase: Equatable, Sendable {
        case notFound(word: String, translation: String?)
        case found(Found)
    }
    /// `Dict.quick(w)` then `Dict.lookup(w, {examples:false, image:false})`; `calls` records what was asked (vector `dictCalls`)
    public static func resolve(_ word: String, sentence: String, deck: (String) -> Bool, quick: (String) async -> JSON?, lookup: (String) async -> JSON?, calls: inout [String]) async -> Phase {
        calls.append("quick")
        var e = await quick(word)
        if e == nil || e!["found"] == JSON.bool(false) { calls.append("lookup"); e = await lookup(word) }
        guard let d = e, d["found"] != JSON.bool(false), d.t("word") else {
            let vi = Vocab.meanOf(e)
            return .notFound(word: word, translation: vi.isEmpty ? nil : vi)
        }
        let w = d.s("word"), mean = Vocab.meanOf(d)
        return .found(Found(entry: d, word: w, pos: d.s("pos"), level: d.s("level"), ipa: d.s("ipa"), mean: mean, def: d.s("def") != mean ? d.s("def") : "", saved: deck(w),
                            sentence: sentence, ctxWord: w, detailsHref: "#/dict/" + (w.addingPercentEncoding(withAllowedCharacters: uriComponent) ?? w)))
    }
    /// `encodeURIComponent`: the dictionary words go to `#/dict/<word>`
    static let uriComponent = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_.!~*'()"))
    public static func saveLabel(_ f: Found) -> L10nKey { f.saved ? .dictAddContext : .dictSaveFlashcard }
}

// MARK: - questions of a reading

public struct ReadingGrade: Sendable {
    public struct Item: Sendable { public var chosen: String?; public var right: String; public var ok: Bool; public var explain: String }
    public var score: Int, n: Int, pct: Int, xp: Int
    public var ok: Bool { pct >= 60 }
    public var items: [Item]
    public var reward: [String: Int], game: JSON, mistakes: [JSON]
    public var links: [String] { ["#/reading", "#/practice/learn?src=deck"] }

    /// blank answers → the learner is asked first ("Bạn chưa trả lời hết. Vẫn chấm điểm?"); declining writes nothing
    public static func needsConfirm(_ r: JSON, picks: [String?]) -> Bool { picks.compactMap { $0 }.count < r.list("questions").count }
    /// the options of a question: TRUE / FALSE / NOT GIVEN (value = the word) or A… (value = the index)
    public static func options(_ q: JSON) -> [(value: String, text: String)] {
        q.s("type") == "tfng" ? QE.tf["tfng"]!.map { ($0, $0) } : q.strs("options").enumerated().map { (String($0.offset), $0.element) }
    }

    /// `picks[i]` = the chosen value of question i (nil = blank). Writes `readDone`, XP 10 + 4·score, a mistake per wrong answer.
    public static func grade(_ r: JSON, picks: [String?], game: JSON, mistakes: [JSON], now: Int64) -> ReadingGrade {
        let qs = r.list("questions"), id = r.s("id")
        var score = 0, log = mistakes, items: [Item] = []
        for (i, q) in qs.enumerated() {
            let right = q["answer"]?.jsToString ?? "", got = i < picks.count ? picks[i] : nil, ok = got == right
            if ok { score += 1 } else {
                let tf = q.s("type") == "tfng", opts = q.strs("options")
                func text(_ v: String) -> String { tf ? v : (Int(v).flatMap { $0 < opts.count ? opts[$0] : nil } ?? "") }
                let m = JSON.obj([("kind", "reading"), ("q", .string("\(r.s("title")): \(q.s("q"))")), ("answer", .string(text(right))),
                                  ("given", got == nil ? .obj([("k", .string(SkillsKeys.blank))]) : .string(text(got!))), ("explain", .string(q.s("explain"))), ("ref", .string(id))])
                log = MistakesEngine.log(log, m, now: now)
            }
            items.append(Item(chosen: got, right: right, ok: ok, explain: q.s("explain")))
        }
        let pct = Vocab.round(Double(score) / Double(max(1, qs.count)) * 100), first = !JSON.truthy(game["readDone"]?[id])
        var g = game, done = g["readDone"]?.object ?? [:]
        done[id] = .string("\(score)/\(qs.count)"); g["readDone"] = .object(done)
        let xp = 10 + score * 4
        return ReadingGrade(score: score, n: qs.count, pct: pct, xp: xp, items: items, reward: ["readings": first ? 1 : 0, "quizzes": 1, "perfect": pct == 100 ? 1 : 0, "xp": xp], game: g, mistakes: log)
    }
}
