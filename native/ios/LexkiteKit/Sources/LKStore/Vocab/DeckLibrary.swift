import Foundation
import LKSync
import LKCore

/// web/js/ctx.js – cleaned learner sentence (`card.ctx`) and its source host (`card.src`)
public enum Ctx {
    public static func text(_ s: String?) -> String {
        guard var t = s else { return "" }
        t = PracticeEngine.rx(t, "<[^>]*>", " ")
        t = PracticeEngine.rx(t, "[<>]", " ")
        t = PracticeEngine.rx(t, "[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069\\ufeff]", " ")
        t = PracticeEngine.collapse(t)
        if t.isEmpty || t.range(of: "[^\\s@<>]+@[^\\s@<>]+\\.[a-z]{2,}", options: [.regularExpression, .caseInsensitive]) != nil { return "" }
        if let rx = try? NSRegularExpression(pattern: "\\+?\\d[\\d\\s().-]{7,}\\d") {
            for m in rx.matches(in: t, range: NSRange(t.startIndex..., in: t)) {
                if let r = Range(m.range, in: t), t[r].filter(\.isNumber).count >= 9 { return "" }
            }
        }
        var u = Array(t.utf16)
        if u.count > 200 {
            u = Array(u.prefix(200))
            if let l = u.last, l >= 0xD800 && l <= 0xDBFF { u.removeLast() }
            t = String(utf16CodeUnits: u, count: u.count).trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return t
    }
    public static func host(_ s: String?) -> String {
        guard let s else { return "" }
        let l = s.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        guard let rx = try? NSRegularExpression(pattern: "^(?:[a-z][a-z0-9+.-]*://)?(?:[^/?#@]*@)?([^/?#:]+)(?=$|[/?#]|:\\d)"),
              let m = rx.firstMatch(in: l, range: NSRange(l.startIndex..., in: l)), let r = Range(m.range(at: 1), in: l) else { return "" }
        var h = String(l[r])
        h = PracticeEngine.rx(PracticeEngine.rx(h, "^www\\.", ""), "\\.$", "")
        let okName = h.range(of: "^[a-z0-9-]+(\\.[a-z0-9-]+)*$", options: .regularExpression) != nil
        let isIP = h.range(of: "^\\d+(\\.\\d+){3}$", options: .regularExpression) != nil
        return h.utf16.count <= 64 && okName && !isIP ? h : ""
    }
}

/// The learner's saved words: `Cards` of web/js/core.js + `addWord` / `editCard` of app.js. Cards keyed by `Vocab.cardKey`.
public struct WordBook: Sendable {
    public var cards: [String: JSON]
    /// insertion order (web `Object.values(state.cards)`)
    public var order: [String]
    /// tombstones `deleted[key] = ms`, kept 90 days
    public var deleted: [String: Double]
    public init(cards list: [JSON] = [], deleted: [String: Double] = [:]) {
        cards = [:]; order = []; self.deleted = deleted
        for c in list { let k = Vocab.cardKey(c); if cards[k] == nil { order.append(k) }; cards[k] = Self.normalize(c, now: 0) }
    }
    public var list: [JSON] { order.compactMap { cards[$0] } }
    public func contains(_ word: String) -> Bool { cards[word.lowercased()] != nil }

    /// Cards.normalize for one card: arrays present, full srs state, `added` set
    static func normalize(_ card: JSON, now: Int64) -> JSON {
        var c = card.object ?? [:]
        for k in ["contexts", "col", "syn", "sentences"] where c[k]?.array == nil { c[k] = .array([]) }
        var srs = Vocab.newState(now: now).object ?? [:]
        for (k, v) in card["srs"]?.object ?? [:] { srs[k] = v }
        c["srs"] = .object(srs)
        if !JSON.truthy(c["added"]) { c["added"] = .number(Double(now)) }
        return .object(c)
    }

    /// Cards.make(entry)
    public static func make(_ entry: JSON, now: Int64) -> JSON {
        func s(_ k: String, _ d: String = "") -> JSON { .string(entry.t(k) ? entry.s(k) : d) }
        var c: [String: JSON] = [:]
        c["word"] = entry["word"] ?? JSON.string("")
        for k in ["ipa", "ipaUS", "pos", "vi", "def", "ex", "level", "image", "audio"] { c[k] = s(k) }
        c["col"] = entry["col"] ?? JSON.array([]); c["syn"] = entry["syn"] ?? JSON.array([])
        c["topic"] = s("topic", "mine"); c["emoji"] = s("emoji", "📘")
        c["imageCredit"] = entry.t("imageCredit") ? (entry["imageCredit"] ?? JSON.null) : JSON.null
        c["sentences"] = .array(Array(entry.list("sentences").prefix(2)))
        c["contexts"] = .array([]); c["note"] = .string("")
        c["added"] = .number(Double(now)); c["srs"] = Vocab.newState(now: now)
        if entry.t("tl"), entry.s("tl") != "en" { c["tl"] = entry["tl"] }
        return .object(c)
    }

    /// Cards.add + app.js addWord: merge into the existing card or create it; `context` = {text, source, title}. Returns the stored card.
    @discardableResult
    public mutating func add(_ entry: JSON, context: JSON? = nil, now: Int64) -> JSON {
        let key = Vocab.cardKey(entry)
        var card: JSON
        if let ex = cards[key] {
            card = ex
            if !card.t("image") && entry.t("image") { card["imageCredit"] = entry.t("imageCredit") ? (entry["imageCredit"] ?? JSON.null) : JSON.null }
            for k in ["ipa", "ipaUS", "pos", "vi", "def", "ex", "image", "audio", "level"] where !card.t(k) && entry.t(k) { card[k] = entry[k] }
            if card.list("sentences").isEmpty, entry.t("sentences") { card["sentences"] = .array(Array(entry.list("sentences").prefix(2))) }
        } else { card = Self.make(entry, now: now) }
        if let context, context.t("text"), !card.list("contexts").contains(where: { $0.s("text") == context.s("text") }) {
            var ctx = context.object ?? [:]; ctx["at"] = .number(Double(now))
            card["contexts"] = .array(Array(([JSON.object(ctx)] + card.list("contexts")).prefix(5)))
            let cx = Ctx.text(context.s("text"))
            if !cx.isEmpty {
                card["ctx"] = .string(cx)
                let h = Ctx.host(context.s("source"))
                if h.isEmpty { var o = card.object ?? [:]; o["src"] = nil; card = .object(o) } else { card["src"] = .string(h) }
            }
        }
        card["mod"] = .number(Double(now))
        store(card, key: key)
        deleted[key] = nil
        return card
    }
    mutating func store(_ card: JSON, key: String) { if cards[key] == nil { order.append(key) }; cards[key] = card }

    /// Cards.update(card)
    public mutating func update(_ card: JSON, now: Int64) {
        var c = card; c["mod"] = .number(Double(now)); store(c, key: Vocab.cardKey(c))
    }
    /// Cards.remove(word) – writes the tombstone and drops tombstones older than 90 days
    public mutating func remove(_ word: String, now: Int64) {
        let k = Vocab.keyOf(word)
        cards[k] = nil; order.removeAll { $0 == k }
        deleted[k] = Double(now)
        let cut = Double(now - 90 * VocabClock.day)
        for (key, at) in deleted where at < cut { deleted[key] = nil }
    }
    /// editCard "Lưu": vi, ipa, ex, note, image (trimmed)
    public mutating func edit(_ word: String, vi: String, ipa: String, ex: String, note: String, image: String, now: Int64) {
        guard var c = cards[word.lowercased()] else { return }
        let t = { (s: String) in JSON.string(s.trimmingCharacters(in: .whitespacesAndNewlines)) }
        c["vi"] = t(vi); c["ipa"] = t(ipa); c["ex"] = t(ex); c["note"] = t(note); c["image"] = t(image)
        update(c, now: now)
    }
    /// editCard "Học lại": back to a brand-new schedule
    public mutating func reset(_ word: String, now: Int64) {
        guard var c = cards[word.lowercased()] else { return }
        c["srs"] = Vocab.newState(now: now); update(c, now: now)
    }
}

// MARK: #/deck
public struct DeckFilter: Equatable, Sendable {
    public var q = "", topic = "", from = "", m = ""
    public init(q: String = "", topic: String = "", from: String = "", m: String = "") { self.q = q; self.topic = topic; self.from = from; self.m = m }
    /// options of the mastery selector
    public static let masteryValues = ["", "0", "12", "1", "2", "3"]
    /// `#/deck?from=&m=` – `m` only when it is one of the options
    public init(query from: String?, m: String?) { self.from = from ?? ""; if let m, !m.isEmpty, Self.masteryValues.contains(m) { self.m = m } }
}
public struct DeckRow: Equatable, Sendable {
    public var word: String, ipa: String, mean: String
    /// thumbnail: the image URL when there is one, else the emoji
    public var thumb: String, hasImage: Bool
    /// first saved sentence (≤110 chars, `moreContext` when cut) or else the definition (≤110)
    public var contextText: String?, definition: String, contextCut: Bool
    public var retentionPercent: Int?
    public var mastery: Int
}
public enum DeckEngine {
    public static let maxRows = 400
    public static func masteredCount(_ cards: [JSON]) -> Int { cards.filter { Vocab.mastery($0) == 3 }.count }
    /// own deck names for the topic selector ("deck:<name>"), sorted
    public static func deckNames(_ cards: [JSON]) -> [String] { Array(Set(cards.map { $0.s("deck") }.filter { !$0.isEmpty })).sorted() }

    /// rows after the AND of all filters; sorted by added DESC (by retention ASC for "Sắp quên")
    public static func filter(_ cards: [JSON], _ f: DeckFilter, now: Int64, clock: VocabClock) -> [JSON] {
        let q = f.q.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let forget = Set(cards.filter { Vocab.isForgetting($0, now: now, clock: clock) }.map { $0.s("word") })
        let rows = cards.filter { c in
            if !q.isEmpty && !(c.s("word").contains(q) || c.s("vi").lowercased().contains(q)) { return false }
            if !f.topic.isEmpty && !(f.topic.hasPrefix("deck:") ? c.s("deck") == String(f.topic.dropFirst(5)) : c.s("topic") == f.topic) { return false }
            if !f.m.isEmpty {
                let s = Vocab.srs(c)
                if f.m == "12" { if !((s.reps > 0 || s.hasLast) && SRS.mastery(s) < 3) { return false } }
                else if SRS.mastery(s) != Int(f.m) { return false }
            }
            if !f.from.isEmpty && !(f.from == "forget" ? forget.contains(c.s("word")) : Vocab.origin(c) == f.from) { return false }
            return true
        }
        if f.from == "forget" {
            func r(_ c: JSON) -> Double { Vocab.retention(c, now: now, clock: clock) ?? 0 }
            return Vocab.stableSorted(rows) { r($0) < r($1) }
        }
        return Vocab.stableSorted(rows) { ($0.d("added") ?? 0) > ($1.d("added") ?? 0) }
    }
    public static func row(_ c: JSON, now: Int64, clock: VocabClock) -> DeckRow {
        let ctx0 = c.list("contexts").first?.s("text")
        let def = Vocab.prefix(c.s("def"), 110)
        let ctxCut = (ctx0?.utf16.count ?? 0) > 110
        let ret = Vocab.retention(c, now: now, clock: clock)
        return DeckRow(word: c.s("word"), ipa: c.s("ipa"), mean: Vocab.meanOf(c), thumb: c.t("image") ? c.s("image") : c.s("emoji"), hasImage: c.t("image"),
                       contextText: ctx0.map { Vocab.prefix($0, 110) }, definition: def, contextCut: ctxCut, retentionPercent: ret.map { Vocab.round($0 * 100) }, mastery: Vocab.mastery(c))
    }
}

// MARK: #/library and #/topic
public enum LibraryEngine {
    public struct Section: Equatable, Sendable {
        public enum Kind: Equatable, Sendable { case group(String), myCollections, learningTopics }
        public var kind: Kind
        /// topic ids (the link carries `?lv=` when a level is chosen)
        public var topics: [String] = []
        /// "Xem cả n bộ": group id and total, when the tab "all" cut the group at 6
        public var viewAll: (group: String, count: Int)?
        public var collections: [Collection] = []
        public static func == (a: Section, b: Section) -> Bool { a.kind == b.kind && a.topics == b.topics && a.viewAll?.group == b.viewAll?.group && a.viewAll?.count == b.viewAll?.count && a.collections == b.collections }
    }
    public struct Collection: Equatable, Sendable { public var origin: String, count: Int, due: Int, mastered: Int }
    public enum Empty: Equatable, Sendable { case noCards, noMatch }
    public struct View: Equatable, Sendable { public var tab: String, sections: [Section], empty: Empty? }

    public static let levels = ["", "A1", "A2", "B1", "B2", "C1", "C2"]
    public static func validLevel(_ s: String?) -> String { levels.contains(s ?? "") ? (s ?? "") : "" }
    /// default tab: `?g=`, else "mine" with ≥10 saved words, else by exam
    public static func defaultTab(g: String?, cardCount: Int, exam: String) -> String {
        if let g, !g.isEmpty { return g }
        if cardCount >= 10 { return "mine" }
        return ["toeic": "toeic", "toefl": "exam", "general": "core"][exam] ?? "topics"
    }
    /// ≥ 5 words (or ≥ 30 %) at the level
    public static func hasLevel(_ tp: TopicCatalog.Topic, _ lv: String) -> Bool {
        if lv.isEmpty { return true }
        let n = tp.words.filter { $0.s("level") == lv }.count
        return n >= 5 || (Double(n) >= Double(tp.words.count) * 0.3 && n > 0)
    }
    public static func collections(_ cards: [JSON], now: Int64, clock: VocabClock) -> [Collection] {
        var groups: [String: [JSON]] = [:]
        for c in cards { groups[Vocab.origin(c), default: []].append(c) }
        let end = clock.endOfToday(now)
        return Vocab.originKeys.compactMap { k in
            guard let l = groups[k] else { return nil }
            return Collection(origin: k, count: l.count, due: l.filter { let s = Vocab.srs($0); return (s.reps > 0 || s.hasLast) && s.due <= end }.count, mastered: l.filter { Vocab.mastery($0) == 3 }.count)
        }
    }
    /// the draw() of routes.library for a tab / search text / CEFR level
    public static func view(tab: String, q rawQ: String, level lv: String, catalog: TopicCatalog, cards: [JSON], now: Int64, clock: VocabClock) -> View {
        let q = rawQ.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let have = Set(cards.map { Vocab.cardKey($0) })
        func inDeck(_ w: JSON) -> Bool { have.contains(w.s("word").lowercased()) }
        func match(_ t: TopicCatalog.Topic) -> Bool {
            hasLevel(t, lv) && (q.isEmpty || t.name.lowercased().contains(q) || t.desc.lowercased().contains(q) || t.words.contains { $0.s("word").lowercased() == q })
        }
        var sections: [Section] = []
        let ids: [String] = tab == "all" ? catalog.groups.map(\.id) : tab == "mine" ? ["mine"] : catalog.groups.filter { $0.id == tab }.map(\.id)
        for gid in ids {
            let ts = catalog.topics.filter { (gid == "mine" ? $0.words.contains(where: inDeck) : $0.group == gid) && match($0) }
            let mine = gid == "mine" ? collections(cards, now: now, clock: clock) : []
            if ts.isEmpty {
                if gid == "mine" && !mine.isEmpty { sections.append(Section(kind: .myCollections, collections: mine)) }
                continue
            }
            if !mine.isEmpty {
                sections.append(Section(kind: .myCollections, collections: mine))
                sections.append(Section(kind: .learningTopics, topics: ts.map(\.id)))
                continue
            }
            let cut = tab == "all" && q.isEmpty && ts.count > 6
            var s = Section(kind: .group(gid), topics: (cut ? Array(ts.prefix(6)) : ts).map(\.id))
            if cut { s.viewAll = (gid, ts.count) }
            sections.append(s)
        }
        let empty: Empty? = sections.isEmpty ? (tab == "mine" ? .noCards : .noMatch) : nil
        return View(tab: tab, sections: sections, empty: empty)
    }
    /// `#/topic/<id>?lv=` link a topic card carries
    public static func topicLink(_ id: String, level: String) -> String { "#/topic/" + id + (level.isEmpty ? "" : "?lv=" + level) }
}

/// #/topic/<id>
public struct TopicPage: Sendable {
    public var topic: TopicCatalog.Topic
    public var levels: [String]
    public var level: String
    /// words missing from the deck ("+ Thêm n từ")
    public var missing: [JSON]
    public var addedCount: Int { topic.words.count - missing.count }
    public var canAddAll: Bool { !missing.isEmpty }
    /// links under the title (Học / Ghép thẻ / Kiểm tra / Nghe rảnh tay)
    public var links: [String] { ["#/practice/learn?src=topic:" + topic.id, "#/practice/match?src=topic:" + topic.id, "#/practice/test?src=topic:" + topic.id, "#/handsfree/" + topic.id] }
    /// level tabs only when the topic has more than one level
    public var showsLevelTabs: Bool { levels.count > 1 }

    /// nil = unknown topic → the caller shows the library
    public static func open(_ id: String, level q0: String?, catalog: TopicCatalog, cards: [JSON]) -> TopicPage? {
        guard let tp = catalog.topic(id) else { return nil }
        let have = Set(cards.map { Vocab.cardKey($0) })
        let levels = tp.levels
        let lv = levels.count > 1 && levels.contains(q0 ?? "") ? (q0 ?? "") : ""
        return TopicPage(topic: tp, levels: levels, level: lv, missing: tp.words.filter { !have.contains($0.s("word").lowercased()) })
    }
    /// words shown for the chosen level, with whether each is already saved
    public func words(level lv: String, cards: [JSON]) -> [(word: JSON, inDeck: Bool)] {
        let have = Set(cards.map { Vocab.cardKey($0) })
        return topic.words.filter { lv.isEmpty || $0.s("level") == lv }.map { ($0, have.contains($0.s("word").lowercased())) }
    }
    /// "Thêm tất cả": every missing word added silently, in topic order
    public func addAll(into book: inout WordBook, now: Int64) { for w in missing { book.add(w, context: nil, now: now) } }
}
