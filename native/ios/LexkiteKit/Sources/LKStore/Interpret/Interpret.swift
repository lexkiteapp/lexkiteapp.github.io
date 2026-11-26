import Foundation
import NaturalLanguage

/// P14 – Interpreter (#/interpret) pure core: a port of web/cpack/interpret/core.js (same rules, same stored shape `lk.interp.v1`) = the Android `Interpret.kt`.
/// No microphone, no model, no network: tested by InterpretTests (testParityP14). Spec: docs/INTERPRET.md.
public enum Interpret {
    /// UI language → recogniser / voice locale (web `LOC`), in the order of the language chooser.
    public static let codes: [String] = ["en", "vi", "es", "pt", "fr", "de", "id", "th", "zh", "ja", "ko", "hi", "ar", "ru", "tr"]
    public static let LOC: [String: String] = [
        "en": "en-US", "vi": "vi-VN", "es": "es-ES", "pt": "pt-BR", "fr": "fr-FR", "de": "de-DE", "id": "id-ID", "th": "th-TH",
        "zh": "zh-CN", "ja": "ja-JP", "ko": "ko-KR", "hi": "hi-IN", "ar": "ar-SA", "ru": "ru-RU", "tr": "tr-TR",
    ]
    public static let maxConv = 30
    public static let maxTurn = 200
    /// A detected language this sure (or more) decides who spoke.
    public static let sure = 0.6

    public static func base(_ l: String?) -> String {
        let b = (l ?? "").lowercased().split(separator: "-", maxSplits: 1, omittingEmptySubsequences: false).first.map(String.init) ?? ""
        return b == "iw" ? "he" : b == "in" ? "id" : b
    }
    public static func ok(_ l: String?) -> Bool { codes.contains(base(l)) }
    public static func rtl(_ l: String?) -> Bool { base(l) == "ar" }

    /// The pair of the two people: `a` sits at the bottom, `b` at the top (turned 180°).
    public struct Pair2: Hashable, Sendable {
        public var a: String, b: String
        public init(_ a: String, _ b: String) { self.a = a; self.b = b }
    }
    public static func defaultPair(_ me: String) -> Pair2 { let a = ok(me) ? base(me) : "en"; return Pair2(a, a == "en" ? "es" : "en") }
    /// A stored / picked pair → a valid one (both known, different); anything else → `defaultPair`.
    public static func fixPair(_ a: String?, _ b: String?, _ me: String) -> Pair2 { ok(a) && ok(b) && base(a) != base(b) ? Pair2(base(a), base(b)) : defaultPair(me) }
    /// Picking `lang` for `side` ("a"|"b"): when it equals the other side's, the two swap (web `onchange`).
    public static func pick(_ p: Pair2, side: String, lang: String) -> Pair2 {
        let l = base(lang); if !ok(l) { return p }
        return side == "a" ? (l == p.b ? Pair2(l, p.a) : Pair2(l, p.b)) : (l == p.a ? Pair2(p.b, l) : Pair2(p.a, l))
    }
    public static func other(_ side: String) -> String { side == "a" ? "b" : "a" }
    public static func lang(_ p: Pair2, _ side: String) -> String { side == "a" ? p.a : p.b }

    public struct Detected: Hashable, Sendable {
        public var lang: String, confidence: Double
        public init(_ lang: String, _ confidence: Double) { self.lang = lang; self.confidence = confidence }
    }
    /// Who spoke? `side` = whose mic was tapped; a sure detection that belongs to exactly one side of the pair names the speaker (the other person borrowed the mic).
    public static func speaker(_ det: Detected?, _ p: Pair2, _ side: String) -> String {
        if let det, !base(det.lang).isEmpty, det.confidence >= sure {
            let d = base(det.lang)
            if d == base(p.a) { return "a" }
            if d == base(p.b) { return "b" }
        }
        return side
    }

    public struct Turn: Codable, Hashable, Sendable {
        public var from: String, src: String, dst: String, tx: String, ts: Int64
        public init(_ from: String, _ src: String, _ dst: String, _ tx: String, _ ts: Int64) { self.from = from; self.src = src; self.dst = dst; self.tx = tx; self.ts = ts }
    }
    public struct Conv: Codable, Hashable, Sendable {
        public var id: String, t: Int64, a: String, b: String, turns: [Turn]
        public init(_ id: String, _ t: Int64, _ a: String, _ b: String, _ turns: [Turn] = []) { self.id = id; self.t = t; self.a = a; self.b = b; self.turns = turns }
        enum CodingKeys: String, CodingKey { case id, t, a, b, turns }
        public init(from d: Decoder) throws {
            let c = try d.container(keyedBy: CodingKeys.self)
            id = try c.decode(String.self, forKey: .id); t = try c.decode(Int64.self, forKey: .t); a = try c.decode(String.self, forKey: .a); b = try c.decode(String.self, forKey: .b)
            turns = (try c.decodeIfPresent([Turn].self, forKey: .turns)) ?? []
        }
    }
    public struct History: Codable, Hashable, Sendable {
        public var convs: [Conv]
        public init(_ convs: [Conv] = []) { self.convs = convs }
    }

    /// Stored shape = the web's `lk.interp.v1`: {convs:[{id,t,a,b,turns:[{from,src,dst,tx,ts}]}]}; anything unreadable = empty.
    public static func parse(_ s: String?) -> History {
        guard let d = s?.data(using: .utf8), let h = try? JSONDecoder().decode(History.self, from: d) else { return History() }
        return h
    }
    public static func encode(_ h: History) -> String {
        let e = JSONEncoder(); e.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
        return (try? e.encode(h)).flatMap { String(data: $0, encoding: .utf8) } ?? "{\"convs\":[]}"
    }

    /// Adds `turn` to conversation `id` (created first when new): newest conversation first, ≤ `maxConv` conversations × `maxTurn` turns.
    public static func addTurn(_ h: History, id: String, pair p: Pair2, turn: Turn) -> History {
        var list = h.convs
        if let i = list.firstIndex(where: { $0.id == id }) {
            // an existing conversation keeps its place (web mutates in place)
            list[i].turns.append(turn); if list[i].turns.count > maxTurn { list[i].turns.removeFirst(list[i].turns.count - maxTurn) }
        } else {
            list.insert(Conv(id, turn.ts, base(p.a), base(p.b), [turn]), at: 0)
        }
        return History(Array(list.prefix(maxConv)))
    }

    // MARK: key words
    private static func isLetterOrDigit(_ u: Unicode.Scalar) -> Bool {
        switch u.properties.generalCategory {
        case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter, .decimalNumber: return true
        default: return false
        }
    }
    private static func isLetterOrMark(_ u: Unicode.Scalar) -> Bool {
        switch u.properties.generalCategory {
        case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter, .nonspacingMark, .spacingMark, .enclosingMark: return true
        default: return false
        }
    }
    /// runs of letters / marks (web `/[\p{L}\p{M}]+/gu`)
    private static func letterRuns(_ s: String) -> [String] {
        var out: [String] = [], cur = String.UnicodeScalarView()
        for u in s.lowercased().unicodeScalars { if isLetterOrMark(u) { cur.append(u) } else if !cur.isEmpty { out.append(String(cur)); cur = .init() } }
        if !cur.isEmpty { out.append(String(cur)) }
        return out
    }
    private static func segment(_ s: String, _ l: String) -> [String] {
        let tk = NLTokenizer(unit: .word); tk.string = s; tk.setLanguage(NLLanguage(rawValue: l))
        var out: [String] = []
        tk.enumerateTokens(in: s.startIndex..<s.endIndex) { r, _ in
            let w = String(s[r]); if w.unicodeScalars.contains(where: isLetterOrDigit) { out.append(w) }
            return true
        }
        return out
    }
    /// Words worth learning from `texts` in `lang`: ≥ 4 letters (CJK / Thai: ≥ 2), no repeats of known words, most frequent then longest first.
    public static func keyWords(_ texts: [String], lang: String, n: Int = 8, known: Set<String> = []) -> [String] {
        let l = base(lang), seg = ["zh", "ja", "th"].contains(l)
        var cnt: [String: Int] = [:], order: [String] = []
        for tx in texts {
            for w in (seg ? segment(tx, l) : letterRuns(tx)) {
                if w.unicodeScalars.count < (seg ? 2 : 4) || known.contains(w) { continue }
                if cnt[w] == nil { order.append(w); cnt[w] = 0 }
                cnt[w]! += 1
            }
        }
        let ranked = order.enumerated().sorted { x, y in
            let cx = cnt[x.element]!, cy = cnt[y.element]!
            if cx != cy { return cx > cy }
            let lx = x.element.unicodeScalars.count, ly = y.element.unicodeScalars.count
            return lx != ly ? lx > ly : x.offset < y.offset
        }
        return ranked.prefix(n).map(\.element)
    }

    // MARK: recap cards
    /// A card of the recap: `word` = the foreign phrase, `def` = its meaning in the learner's language, `lang` = the foreign language.
    public struct Card: Hashable, Sendable {
        public var word: String, def: String, lang: String
        public init(_ word: String, _ def: String, _ lang: String) { self.word = word; self.def = def; self.lang = lang }
    }
    /// The turns whose phrase is in a language OTHER than `me` (the learner's), with the meaning in `me`; no repeats.
    public static func cards(_ conv: Conv, me: String) -> [Card] {
        let m = base(me); var out: [Card] = [], seen = Set<String>()
        for t in conv.turns {
            let srcL = t.from == "a" ? conv.a : conv.b, dstL = t.from == "a" ? conv.b : conv.a
            let (w, d, wl) = srcL == m ? (t.tx, t.src, dstL) : (t.src, t.tx, srcL)
            if wl == m || w.isEmpty || !seen.insert(w).inserted { continue }
            out.append(Card(w, d, wl))
        }
        return out
    }

    // MARK: say-back score
    private static func clean(_ s: String) -> [Unicode.Scalar] { s.lowercased().unicodeScalars.filter(isLetterOrDigit) }
    /// Similarity 0…1: Levenshtein over the letters / digits of any script (case-folded).
    public static func sim(_ a: String, _ b: String) -> Double {
        let x = clean(a), y = clean(b)
        if x.isEmpty && y.isEmpty { return 1 }
        var prev = Array(0...y.count)
        if !x.isEmpty {
            for i in 1...x.count {
                var cur = [Int](repeating: 0, count: y.count + 1); cur[0] = i
                if !y.isEmpty { for j in 1...y.count { cur[j] = min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] == y[j - 1] ? 0 : 1)) } }
                prev = cur
            }
        }
        return 1 - Double(prev[y.count]) / Double(max(x.count, y.count))
    }
    /// Pronunciation score 0…100 of the learner's say-back: the best of the recogniser's alternatives vs `expected`.
    public static func score(_ expected: String, heard: [String]) -> (n: Int, heard: String) {
        var best: String?, bs = -1.0
        for h in heard { let s = sim(h, expected); if s > bs { bs = s; best = h } }   // first of equals wins, like maxByOrNull
        guard let best else { return (0, "") }
        return (Int((sim(best, expected) * 100 + 0.5).rounded(.down)), best)
    }

    // MARK: phrasebook
    /// Travel phrasebook (generated native/shared/gen/interpret/phrases.json from web/cpack/interpret/phrases.js): groups in `order`; each item = the same sentence in every language.
    public struct Phrases: Sendable {
        public var order: [String]
        public var items: [(group: String, text: [String: String])]
        public func group(_ g: String) -> [[String: String]] { items.filter { $0.group == g }.map(\.text) }
    }
    public static func parsePhrases(_ data: Data) -> Phrases? {
        guard let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], let order = o["order"] as? [String], let raw = o["items"] as? [[Any]] else { return nil }
        var items: [(group: String, text: [String: String])] = []
        for e in raw { guard e.count == 2, let g = e[0] as? String, let t = e[1] as? [String: String] else { return nil }; items.append((g, t)) }
        return Phrases(order: order, items: items)
    }
    /// The bundled phrasebook (Resources/interpret-phrases.json).
    public static func bundledPhrases() -> Phrases? {
        Bundle.module.url(forResource: "interpret-phrases", withExtension: "json").flatMap { try? Data(contentsOf: $0) }.flatMap(parsePhrases)
    }
}

/// Device-only storage of the Interpreter (web localStorage keys, never synced): history `lk.interp.v1` + the language pair `lk.interp.pair` ({"a","b"}).
public struct InterpretStore: @unchecked Sendable {
    public static let historyKey = "lk.interp.v1", pairKey = "lk.interp.pair"
    public let defaults: UserDefaults
    public init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    public func history() -> Interpret.History { Interpret.parse(defaults.string(forKey: Self.historyKey)) }
    public func saveHistory(_ h: Interpret.History) { defaults.set(Interpret.encode(h), forKey: Self.historyKey) }
    public func clearHistory() { defaults.removeObject(forKey: Self.historyKey) }
    public func pair(me: String) -> Interpret.Pair2 {
        let o = defaults.string(forKey: Self.pairKey).flatMap { $0.data(using: .utf8) }.flatMap { try? JSONSerialization.jsonObject(with: $0) } as? [String: Any]
        return Interpret.fixPair(o?["a"] as? String, o?["b"] as? String, me)
    }
    public func savePair(_ p: Interpret.Pair2) { defaults.set("{\"a\":\"\(p.a)\",\"b\":\"\(p.b)\"}", forKey: Self.pairKey) }
}
