import Foundation
import LKSync

/// M4 P06 – the content of #/listening … #/read and the word marker of web/js/lexis.js (docs/specs/native-m4-vectors.md).
/// Verified against native/shared/gen/vectors/skills.json (SkillsVectorTests); the content is `Resources/skills-content.json` = that file's `data`.
public struct SkillsData: Sendable {
    public var parts: [JSON]
    public var readings: [JSON]
    public var lexis: LexisData
    public init(parts: [JSON] = [], readings: [JSON] = [], lexis: LexisData = LexisData()) { self.parts = parts; self.readings = readings; self.lexis = lexis }
    public init(json: JSON) { self.init(parts: json.list("listening"), readings: json.list("readings"), lexis: LexisData(json["lexis"] ?? .null)) }

    /// The bundled content (LKStore resource). Nil only if the resource is missing (a packaging bug the tests catch).
    public static func bundled() -> SkillsData? {
        guard let url = Bundle.module.url(forResource: "skills-content", withExtension: "json"), let d = try? Data(contentsOf: url), let j = try? JSON.parse(d) else { return nil }
        return SkillsData(json: j)
    }
    public func part(_ id: String) -> JSON? { parts.first { $0.s("id") == id } }
    public func reading(_ id: String) -> JSON? { readings.first { $0.s("id") == id } }
    /// listening test numbers, ascending
    public var tests: [Int] { Array(Set(parts.map { $0.i("test") })).sorted() }
    /// the parts of one test, by part number
    public func parts(of test: Int) -> [JSON] { Vocab.stableSorted(parts.filter { $0.i("test") == test }) { $0.i("part") < $1.i("part") } }
}

public struct LexisData: Sendable {
    public var awl: Set<String> = [], link: Set<String> = []
    /// longest first (as the web sorts them): regex alternatives match in this order
    public var phrases: [(text: String, type: String)] = []
    public init() {}
    public init(_ j: JSON) {
        awl = Set(j.strs("awl")); link = Set(j.strs("link"))
        phrases = j.list("phrases").map { ($0.s("text"), $0.s("type")) }
    }
}

/// The constants of the web code that the ports must not retype (qengine BAND, kvoice POOL / NARRATOR, listening STOPW): `consts` of the content pack (or of the bundled starter).
public struct SkillsConsts: Sendable {
    public var band: [String: [(Int, Double)]] = [:]
    public var narrator = "", pools: [String: [String]] = [:], stopwords: Set<String> = []
    /// question-type names (qtips NAME): exam terms, shown untranslated in every language like the web
    public var names: [String: String] = [:]
    public init() {}
    public init(_ j: JSON) {
        band = (j["band"]?.object ?? [:]).mapValues { $0.array?.map { (Int(JSON.orZero($0.array?.first)), JSON.orZero($0.array?.last)) } ?? [] }
        narrator = j["kvoice"]?.s("narrator") ?? ""
        pools = (j["kvoice"]?["pools"]?.object ?? [:]).mapValues { ($0.array ?? []).compactMap(\.string) }
        stopwords = Set(j.strs("stopwords"))
        names = (j["names"]?.object ?? [:]).compactMapValues(\.string)
    }
    /// the active constants: the bundled starter until a pack is installed
    nonisolated(unsafe) public static var current: SkillsConsts = {
        guard let url = Bundle.module.url(forResource: "skills-content", withExtension: "json"), let d = try? Data(contentsOf: url), let j = try? JSON.parse(d) else { return SkillsConsts() }
        return SkillsConsts(j["consts"] ?? .null)
    }()
    public static func install(_ j: JSON?) { if let c = j, c.isObject { current = SkillsConsts(c) } }
}

/// web `Lexis`: AWL / linking words / phrases of a text, as tappable word tokens.
public final class Lexis: @unchecked Sendable {
    public enum Piece: Equatable, Sendable {
        case text(String)
        /// `shown` keeps the case of the text, `w` is lower-case with ’ → ', `cls` = space-joined classes (kw · link|col · awl · mine), `ph` = the phrase the word belongs to
        case word(shown: String, w: String, cls: String, ph: String?)
        public var isWord: Bool { if case .word = self { return true }; return false }
    }

    let data: LexisData
    private let phraseRe: NSRegularExpression?
    private let phraseType: [String: String]
    private static let wordRe = try! NSRegularExpression(pattern: "^([^A-Za-z]*)([A-Za-z][A-Za-z'\u{2019}-]*[A-Za-z]|[A-Za-z])([^A-Za-z]*)$")
    private static let sentRe = try! NSRegularExpression(pattern: "[^.!?]+[.!?]+[\"\u{201D}\u{2019})]*\\s*|[^.!?]+\\z")
    private static let paraRe = try! NSRegularExpression(pattern: "\\n\\s*\\n")

    public init(_ d: LexisData) {
        data = d
        phraseType = Dictionary(d.phrases.map { ($0.text, $0.type) }, uniquingKeysWith: { a, _ in a })
        // web: \b(p1|p2|…)\b, spaces → \s+, case-insensitive
        let alt = d.phrases.map { p in p.text.map { "\\^$.*+?()[]{}|".contains($0) ? "\\\($0)" : ($0 == " " ? "\\s+" : String($0)) }.joined() }.joined(separator: "|")
        phraseRe = alt.isEmpty ? nil : try? NSRegularExpression(pattern: "\\b(\(alt))\\b", options: [.caseInsensitive])
    }

    // MARK: classify
    /// web `bases(w)`: the possible dictionary forms of an (inflected) word
    public static func bases(_ w: String) -> [String] {
        let c = Array(w), n = c.count
        func cut(_ k: Int) -> String { String(c.prefix(max(0, n - k))) }
        var out = [w]
        if w.hasSuffix("ies") { out.append(cut(3) + "y") }
        if w.hasSuffix("es") { out.append(cut(2)) }
        if w.hasSuffix("s") { out.append(cut(1)) }
        if w.hasSuffix("ied") { out.append(cut(3) + "y") }
        if w.hasSuffix("ed") { out += [cut(2), cut(1)]; if n >= 4, c[n - 4] == c[n - 3] { out.append(cut(3)) } }
        if w.hasSuffix("ing") { out += [cut(3), cut(3) + "e"]; if n >= 5, c[n - 5] == c[n - 4] { out.append(cut(4)) } }
        if w.hasSuffix("ly") { out += [cut(2), cut(2) + "e"] }
        if w.hasSuffix("ation") { out += [cut(5) + "e", cut(5)] }
        if w.hasSuffix("ity") { out += [cut(3), cut(3) + "e"] }
        if w.hasSuffix("ment") { out.append(cut(4)) }
        if w.hasSuffix("ise") || w.hasSuffix("ize") {
            out.append(w.replacingFirst("iz", with: "is")); out.append(w.replacingFirst("is", with: "iz"))
        }
        return out
    }
    public func classify(_ word: String) -> (awl: String?, link: String?) {
        let w = word.lowercased()
        return (Self.bases(w).first { data.awl.contains($0) }, data.link.contains(w) ? w : nil)
    }

    // MARK: marking
    /// web `markSentence`: tokens split on whitespace; a token that is a word becomes a tappable `.word`, punctuation around it stays text.
    public func mark(_ s: String, keywords: Set<String> = [], mine: (String) -> Bool = { _ in false }) -> [Piece] {
        let ns = s as NSString
        var ranges: [(a: Int, b: Int, type: String, text: String)] = []
        phraseRe?.enumerateMatches(in: s, range: NSRange(location: 0, length: ns.length)) { m, _, _ in
            guard let m else { return }
            let text = ns.substring(with: m.range).lowercased().split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
            ranges.append((m.range.location, m.range.location + m.range.length, phraseType[text] ?? "col", text))
        }
        var out: [Piece] = []
        func text(_ t: String) {
            guard !t.isEmpty else { return }
            if case .text(let p)? = out.last { out[out.count - 1] = .text(p + t) } else { out.append(.text(t)) }
        }
        var pos = 0
        var tok = "", ws: Bool?
        func flush() {
            guard !tok.isEmpty else { return }
            let start = pos; pos += tok.utf16.count
            defer { tok = "" }
            let t = tok as NSString
            guard let m = Self.wordRe.firstMatch(in: tok, range: NSRange(location: 0, length: t.length)) else { text(tok); return }
            let shown = t.substring(with: m.range(at: 2))
            let w = shown.lowercased().replacingOccurrences(of: "\u{2019}", with: "'")
            let ph = ranges.first { start >= $0.a && start < $0.b }
            let c = classify(w)
            var cls: [String] = []
            if keywords.contains(w) { cls.append("kw") }
            if let ph { cls.append(ph.type == "link" ? "link" : "col") } else if c.link != nil { cls.append("link") }
            if c.awl != nil { cls.append("awl") }
            if mine(w) { cls.append("mine") }
            text(t.substring(with: m.range(at: 1)))
            out.append(.word(shown: shown, w: w, cls: cls.joined(separator: " "), ph: ph?.text))
            text(t.substring(with: m.range(at: 3)))
        }
        for ch in s {
            let isWS = ch.isWhitespace
            if let ws, ws != isWS { flush() }
            ws = isWS; tok.append(ch)
        }
        flush()
        return out
    }

    /// web `sentencesOf`: `[^.!?]+[.!?]+["”’)]*\s*` runs, the rest as one piece
    public static func sentences(of p: String) -> [String] {
        let ns = p as NSString
        let ms = sentRe.matches(in: p, range: NSRange(location: 0, length: ns.length)).map { ns.substring(with: $0.range) }
        return ms.isEmpty ? [p] : ms
    }
    /// paragraphs split on blank lines (web `/\n\s*\n/`)
    public static func paragraphs(of text: String) -> [String] {
        let ns = text as NSString
        var out: [String] = [], at = 0
        for m in paraRe.matches(in: text, range: NSRange(location: 0, length: ns.length)) { out.append(ns.substring(with: NSRange(location: at, length: m.range.location - at))); at = m.range.location + m.range.length }
        out.append(ns.substring(from: at))
        return out
    }
    /// web `markText`: paragraphs → sentences → tokens
    public func markText(_ text: String, keywords: Set<String> = [], mine: (String) -> Bool = { _ in false }) -> [[[Piece]]] {
        Self.paragraphs(of: text).map { p in Self.sentences(of: p).map { mark($0, keywords: keywords, mine: mine) } }
    }

    /// The highlight counters of the reader: distinct words (by phrase when the token has one) per class; `link` counts link + col.
    public static func counts(_ passage: [[[Piece]]]) -> [String: Int] {
        var sets: [String: Set<String>] = ["kw": [], "awl": [], "link": [], "mine": []]
        for p in passage { for s in p { for piece in s {
            guard case .word(_, let w, let cls, let ph) = piece else { continue }
            let c = Set(cls.split(separator: " ").map(String.init)), id = ph ?? w
            if c.contains("kw") { sets["kw"]!.insert(id) }
            if c.contains("awl") { sets["awl"]!.insert(id) }
            if c.contains("link") || c.contains("col") { sets["link"]!.insert(id) }
            if c.contains("mine") { sets["mine"]!.insert(id) }
        } } }
        return sets.mapValues(\.count)
    }
}

extension String {
    /// JS `s.replace("x", "y")` (first occurrence only)
    func replacingFirst(_ of: String, with: String) -> String {
        guard let r = range(of: of) else { return self }
        return replacingCharacters(in: r, with: with)
    }
}

public extension Lexis {
    /// web `Lexis.analyze(text)` in full (the report of #/write): `stop` = the STOP table of lexis.js (write-pack `lexis.stop`), `indexed` = membership of the word library (IELTS_DATA.INDEX).
    func essay(_ text: String, stop: Set<String>, indexed: (String) -> Bool) -> Essay.Analysis {
        let clean = text.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        let sents = clean.isEmpty ? [] : Self.sentences(of: clean).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        let words = Essay.tokens(clean)
        let content = words.filter { !stop.contains($0) && $0.utf16.count > 2 }
        var freq = Essay.Counter(), awl = Essay.Counter(), link = Essay.Counter(), phrases = Essay.Counter()
        for w in content { freq.add(Self.bases(w).first(where: indexed) ?? w) }
        for w in words {
            let c = classify(w)
            if let a = c.awl { awl.add(a) }
            if let l = c.link { link.add(l) }
        }
        if let re = phraseRe {
            for m in re.matches(in: clean, range: NSRange(location: 0, length: (clean as NSString).length)) {
                let k = (clean as NSString).substring(with: m.range).lowercased().split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
                phrases.add(k)
                if phraseType[k] == "link" { link.add(k) }
            }
        }
        let lens = sents.map { Essay.words($0) }
        let avg = lens.isEmpty ? 0 : Double(lens.reduce(0, +)) / Double(lens.count)
        let sd = lens.isEmpty ? 0 : (lens.reduce(0.0) { $0 + pow(Double($1) - avg, 2) } / Double(lens.count)).squareRoot()
        let diversity = content.isEmpty ? 0 : Double(Set(content.map { Self.bases($0).last ?? $0 }).count) / Double(content.count)
        let overused = Vocab.stableSorted(freq.entries.filter { $0.n >= 4 && !data.awl.contains($0.w) && !data.link.contains($0.w) }) { $0.n > $1.n }.prefix(8)
        let awlRatio = words.isEmpty ? 0 : Double(awl.total) / Double(words.count)
        return Essay.Analysis(words: words.count, sentences: sents.count, avg: avg, sd: sd, diversity: diversity, awl: awl.entries, link: link.entries, phrases: phrases.entries,
                              overused: Array(overused), awlRatio: awlRatio, band: Essay.lexicalBand(words: words.count, awlRatio: awlRatio, phrases: phrases.count, link: link.count, diversity: diversity, overused: overused.count))
    }
}
