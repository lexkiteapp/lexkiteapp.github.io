import Foundation
import NaturalLanguage

/// Phiên dịch (#/interpret) – the pure core, a port of web/cpack/interpret/core.js (one source: vectors/interpret.json is generated from the real web code).
/// Language ↔ speech locale, who spoke, the on-device history (`lk.interp.v1`, same JSON as the web's localStorage), key words and review cards.
/// Nothing here touches the microphone, the translator or the network.
public enum Interp {
    public static let codes = ["en", "vi", "es", "pt", "fr", "de", "id", "th", "zh", "ja", "ko", "hi", "ar", "ru", "tr"]
    public static let locales: [String: String] = ["en": "en-US", "vi": "vi-VN", "es": "es-ES", "pt": "pt-BR", "fr": "fr-FR", "de": "de-DE", "id": "id-ID", "th": "th-TH",
                                                    "zh": "zh-CN", "ja": "ja-JP", "ko": "ko-KR", "hi": "hi-IN", "ar": "ar-SA", "ru": "ru-RU", "tr": "tr-TR"]
    public static let maxConv = 30, maxTurn = 200
    public static let historyKey = "lk.interp.v1"

    /// `es-MX` → `es`, `zh-Hans` → `zh`
    public static func base(_ l: String) -> String { String(l.lowercased().split(separator: "-").first ?? "") }
    public static func supported(_ l: String) -> Bool { codes.contains(base(l)) }
    public static func isRTL(_ l: String) -> Bool { base(l) == "ar" }
    public static func locale(_ l: String) -> String { locales[base(l)] ?? "en-US" }
    /// the language written in itself ("Español", "日本語") – each person of the pair reads their own name
    public static func endonym(_ l: String) -> String {
        let b = base(l)
        return Locale(identifier: b).localizedString(forLanguageCode: b)?.localizedCapitalized ?? b
    }

    public struct Detected: Equatable, Sendable {
        public var lang: String, confidence: Double
        public init(lang: String, confidence: Double) { self.lang = lang; self.confidence = confidence }
    }
    /// Who spoke? `side` = the side whose mic was tapped; a confident (≥ 0.6) detection that belongs to exactly one side of the pair wins
    /// (the other person borrowed the mic).
    public static func speaker(_ det: Detected?, pair: InterpPair, side: InterpSide) -> InterpSide {
        guard let det else { return side }
        let d = base(det.lang)
        if !d.isEmpty, det.confidence >= 0.6 {
            if d == base(pair.a) { return .a }
            if d == base(pair.b) { return .b }
        }
        return side
    }

    // MARK: key words + review cards
    private static func isWordScalar(_ s: Unicode.Scalar) -> Bool {
        switch s.properties.generalCategory {
        case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter, .nonspacingMark, .spacingMark, .enclosingMark: return true
        default: return false
        }
    }
    static func words(_ text: String, lang: String, segment: Bool) -> [String] {
        if segment {
            let tk = NLTokenizer(unit: .word); tk.string = text; tk.setLanguage(NLLanguage(rawValue: lang))
            var out: [String] = []
            tk.enumerateTokens(in: text.startIndex..<text.endIndex) { r, _ in out.append(String(text[r])); return true }
            return out
        }
        var out: [String] = [], cur = String.UnicodeScalarView()
        for u in text.lowercased().unicodeScalars {
            if isWordScalar(u) { cur.append(u) } else if !cur.isEmpty { out.append(String(cur)); cur = .init() }
        }
        if !cur.isEmpty { out.append(String(cur)) }
        return out
    }
    /// Words worth learning in one language: ≥ 4 letters (CJK/Thai ≥ 2), no repeats, frequent first then long; `known` = words already in the deck.
    public static func keyWords(_ texts: [String], lang: String, n: Int = 8, known: Set<String> = []) -> [String] {
        let l = base(lang), seg = ["zh", "ja", "th"].contains(l)
        var count: [String: Int] = [:], order: [String] = []
        for tx in texts {
            for w in words(tx, lang: l, segment: seg) {
                if w.unicodeScalars.count < (seg ? 2 : 4) || known.contains(w) { continue }
                if count[w] == nil { order.append(w) }
                count[w, default: 0] += 1
            }
        }
        let idx = Dictionary(uniqueKeysWithValues: order.enumerated().map { ($1, $0) })
        return Array(order.sorted { a, b in
            if count[a]! != count[b]! { return count[a]! > count[b]! }
            if a.unicodeScalars.count != b.unicodeScalars.count { return a.unicodeScalars.count > b.unicodeScalars.count }
            return idx[a]! < idx[b]!
        }.prefix(n))
    }
    /// The turns for review cards: the phrase in the language that is NOT mine, with its meaning in mine.
    public static func cards(_ conv: InterpConv, me: String) -> [InterpCard] {
        let m = base(me)
        var out: [InterpCard] = [], seen = Set<String>()
        for t in conv.turns {
            let srcL = t.from == "a" ? conv.a : conv.b, dstL = t.from == "a" ? conv.b : conv.a
            let (w, d, wl) = srcL == m ? (t.tx, t.src, dstL) : (t.src, t.tx, srcL)
            if wl == m || w.isEmpty || seen.contains(w) { continue }
            seen.insert(w); out.append(InterpCard(word: w, def: d, lang: wl))
        }
        return out
    }

    // MARK: pronunciation ("say it back")
    /// 0…100: how much of the phrase was heard (word overlap in order; characters for zh/ja/th). Accents and case do not count against the learner.
    public static func score(target: String, heard: String, lang: String) -> Int {
        let seg = ["zh", "ja", "th"].contains(base(lang))
        func toks(_ s: String) -> [String] {
            let f = s.folding(options: [.diacriticInsensitive, .caseInsensitive, .widthInsensitive], locale: nil)
            let w = words(f, lang: base(lang), segment: false)
            return seg ? w.flatMap { $0.map(String.init) } : w
        }
        let a = toks(target), b = toks(heard)
        guard !a.isEmpty, !b.isEmpty else { return 0 }
        var dp = [[Int]](repeating: [Int](repeating: 0, count: b.count + 1), count: a.count + 1)
        for i in 1...a.count { for j in 1...b.count { dp[i][j] = a[i - 1] == b[j - 1] ? dp[i - 1][j - 1] + 1 : max(dp[i - 1][j], dp[i][j - 1]) } }
        let lcs = Double(dp[a.count][b.count])
        let p = lcs / Double(b.count), r = lcs / Double(a.count)
        return p + r == 0 ? 0 : Int((200 * p * r / (p + r)).rounded())
    }
}

public enum InterpSide: String, Codable, Sendable { case a, b
    public var other: InterpSide { self == .a ? .b : .a }
}
public struct InterpPair: Equatable, Codable, Sendable {
    public var a: String, b: String
    public init(a: String, b: String) { self.a = a; self.b = b }
    public subscript(_ s: InterpSide) -> String { get { s == .a ? a : b } set { if s == .a { a = newValue } else { b = newValue } } }
    /// the pair a new device starts with: my language ⇄ English (Spanish when mine is English)
    public static func initial(me: String) -> InterpPair { let m = Interp.supported(me) ? Interp.base(me) : "en"; return InterpPair(a: m, b: m == "en" ? "es" : "en") }
    public var valid: Bool { Interp.supported(a) && Interp.supported(b) && a != b }
}
public struct InterpCard: Equatable, Sendable {
    public var word: String, def: String, lang: String
    public init(word: String, def: String, lang: String) { self.word = word; self.def = def; self.lang = lang }
}
public struct InterpTurn: Codable, Equatable, Sendable {
    public var from: String, src: String, dst: String, tx: String, ts: Int64
    public init(from: String, src: String, dst: String, tx: String, ts: Int64) { self.from = from; self.src = src; self.dst = dst; self.tx = tx; self.ts = ts }
}
public struct InterpConv: Codable, Equatable, Sendable, Identifiable {
    public var id: String, t: Int64, a: String, b: String, turns: [InterpTurn]
    public init(id: String, t: Int64, a: String, b: String, turns: [InterpTurn]) { self.id = id; self.t = t; self.a = a; self.b = b; self.turns = turns }
}

/// The history of this device only (never synced, never sent): `lk.interp.v1` = `{convs:[{id,t,a,b,turns:[{from,src,dst,tx,ts}]}]}` ≤ 30 conversations × 200 turns.
public struct InterpHistory {
    private let defaults: UserDefaults
    public init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    private struct Doc: Codable { var convs: [InterpConv] }
    public func load() -> [InterpConv] {
        guard let d = defaults.string(forKey: Interp.historyKey)?.data(using: .utf8), let doc = try? JSONDecoder().decode(Doc.self, from: d) else { return [] }
        return doc.convs
    }
    private func save(_ c: [InterpConv]) {
        guard let d = try? JSONEncoder().encode(Doc(convs: c)), let s = String(data: d, encoding: .utf8) else { return }
        defaults.set(s, forKey: Interp.historyKey)
    }
    @discardableResult
    public func addTurn(id: String, pair: InterpPair, _ turn: InterpTurn) -> InterpConv {
        var all = load()
        if let i = all.firstIndex(where: { $0.id == id }) { all[i].turns.append(turn) }
        else { all.insert(InterpConv(id: id, t: turn.ts, a: Interp.base(pair.a), b: Interp.base(pair.b), turns: [turn]), at: 0) }
        let k = all.firstIndex(where: { $0.id == id }) ?? 0
        if all[k].turns.count > Interp.maxTurn { all[k].turns.removeFirst(all[k].turns.count - Interp.maxTurn) }
        save(Array(all.prefix(Interp.maxConv)))
        return all[k]
    }
    public func conv(_ id: String) -> InterpConv? { load().first { $0.id == id } }
    public func clear() { defaults.removeObject(forKey: Interp.historyKey) }
}

/// The travel phrasebook (native/shared/gen/interpret/phrases.json, generated from web/cpack/interpret/phrases.js: 22 phrases × 15 languages, written by people, never machine-translated; a copy is bundled).
public struct InterpPhrases: Decodable, Sendable {
    /// one phrase: `[group, {lang: sentence}]` (the shared native/shared/gen/interpret/phrases.json)
    public struct Item: Decodable, Sendable {
        public var g: String, t: [String: String]
        public init(g: String, t: [String: String]) { self.g = g; self.t = t }
        public init(from decoder: Decoder) throws {
            var c = try decoder.unkeyedContainer()
            g = try c.decode(String.self); t = try c.decode([String: String].self)
        }
    }
    public var order: [String]
    public var items: [Item]
    public func items(in group: String) -> [Item] { items.filter { $0.g == group } }
    public static let bundled: InterpPhrases = {
        guard let u = Bundle.module.url(forResource: "interpret-phrases", withExtension: "json"), let d = try? Data(contentsOf: u),
              let p = try? JSONDecoder().decode(InterpPhrases.self, from: d) else { return InterpPhrases(order: [], items: []) }
        return p
    }()
}
