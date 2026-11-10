import Foundation
import LKSync

/// M4 P09 – #/fix: the offline rule engine `LK_WRITE.check` of web/js/writecheck-rules.js.
/// The rule table (regex source, flags, type, title, why, lesson) and the word tables come from `learn-content.json` (`fix`, generated from the web file);
/// only the per-rule replacement functions are ported here. Verified against vectors/learn.json `fix` (LearnVectorTests). Offsets are UTF-16, like JS.
public struct FixIssue: Equatable, Sendable {
    public var s: Int, e: Int
    public var type: String
    public var reps: [String]
    public var levels: [String]?
    public var rule: String, title: String, why: String, lesson: String
    /// the learner can apply it with one tap ("Sửa nhanh"): exactly one replacement and not a style hint
    public var safe: Bool { reps.count == 1 && type != "style" }
}

private final class RxCache: @unchecked Sendable {
    private var m: [String: NSRegularExpression] = [:]
    private let lock = NSLock()
    func get(_ p: String, _ opts: NSRegularExpression.Options) -> NSRegularExpression {
        lock.lock(); defer { lock.unlock() }
        let k = "\(opts.rawValue):" + p
        if let r = m[k] { return r }
        let r = (try? NSRegularExpression(pattern: p, options: opts)) ?? (try! NSRegularExpression(pattern: "(?!)"))
        m[k] = r
        return r
    }
}

public final class FixEngine: @unchecked Sendable {
    struct Rule { var id: String, re: NSRegularExpression, type: String, title: String, why: String, lesson: String }
    struct Hit { var s: Int, e: Int, reps: [String], levels: [String]? = nil }
    struct M {
        let ns: NSString, r: NSTextCheckingResult
        var index: Int { r.range.location }
        var end: Int { r.range.location + r.range.length }
        func g(_ i: Int) -> String { let rg = r.range(at: i); return rg.location == NSNotFound ? "" : ns.substring(with: rg) }
        var all: String { g(0) }
    }
    private static let cache = RxCache()
    let rules: [Rule]
    let spell: [String: String], v3: [String: String], base: [String: String]
    let upg: [String: [[String]]]
    public let types: [(String, String)]
    public let sample: String
    public let maxLen: Int

    public init?(json: JSON?) {
        guard let j = json, j.isObject else { return nil }
        var rs: [Rule] = []
        for r in j.list("rules") {
            let flags = r.s("flags")
            var o: NSRegularExpression.Options = []
            if flags.contains("i") { o.insert(.caseInsensitive) }
            guard let re = try? NSRegularExpression(pattern: r.s("re"), options: o) else { return nil }
            rs.append(Rule(id: r.s("id"), re: re, type: r.s("type"), title: r.s("title"), why: r.s("why"), lesson: r.s("lesson")))
        }
        rules = rs
        func map(_ k: String) -> [String: String] { (j[k]?.object ?? [:]).compactMapValues(\.string) }
        spell = map("spell"); v3 = map("v3"); base = map("base")
        upg = (j["upg"]?.object ?? [:]).mapValues { ($0.array ?? []).map { $0.array?.compactMap(\.string) ?? [] } }
        types = j.list("types").map { ($0.array?.first?.string ?? "", $0.array?.last?.string ?? "") }
        sample = j.s("sample"); maxLen = max(1, j.i("maxLen"))
    }

    // MARK: JS helpers
    private static func rx(_ p: String, _ ci: Bool = false) -> NSRegularExpression { cache.get(p, ci ? [.caseInsensitive] : []) }
    static func test(_ p: String, _ s: String, ci: Bool = false) -> Bool {
        rx(p, ci).firstMatch(in: s, range: NSRange(location: 0, length: (s as NSString).length)) != nil
    }
    /// `s.replace(/p/, with)` (first match; the patterns used are anchored with `$`)
    static func sub(_ s: String, _ p: String, _ with: String) -> String {
        let r = rx(p), n = (s as NSString).length
        guard let m = r.firstMatch(in: s, range: NSRange(location: 0, length: n)) else { return s }
        return (s as NSString).replacingCharacters(in: m.range, with: r.replacementString(for: m, in: s, offset: 0, template: with))
    }
    /// JS `t.slice(a, b)` on UTF-16 offsets
    static func slice(_ ns: NSString, _ a: Int, _ b: Int? = nil) -> String {
        let n = ns.length
        let from = a < 0 ? max(0, n + a) : min(a, n)
        let to = b == nil ? n : (b! < 0 ? max(0, n + b!) : min(b!, n))
        return from < to ? ns.substring(with: NSRange(location: from, length: to - from)) : ""
    }
    static func len(_ s: String) -> Int { (s as NSString).length }
    static func cap(_ src: String, _ rep: String) -> String {
        guard let f = src.unicodeScalars.first, f.value >= 65, f.value <= 90, let r = rep.first else { return rep }
        return String(r).uppercased() + rep.dropFirst()
    }
    static func ing(_ v0: String) -> String {
        let v = v0.lowercased()
        if test("ie$", v) { return slice(v as NSString, 0, -2) + "ying" }
        if test("[^aeiou]e$", v) && v != "be" { return slice(v as NSString, 0, -1) + "ing" }
        if test("^(stop|run|swim|get|sit|plan|shop|put|cut|set|begin|travel)$", v) { return v + (v == "travel" ? "ling" : String(v.last!) + "ing") }
        return v + "ing"
    }
    static func s3(_ v0: String) -> String {
        let v = v0.lowercased()
        if v == "have" { return "has" }
        if v == "be" { return "is" }
        if v == "do" || v == "go" { return v + "es" }
        if test("[^aeiou]y$", v) { return slice(v as NSString, 0, -1) + "ies" }
        if test("(s|sh|ch|x|z|o)$", v) { return v + "es" }
        return v + "s"
    }

    // MARK: the replacement function of every rule (the web `fn`)
    private func fn(_ id: String, _ m: M, _ t: NSString) -> Hit? {
        typealias F = FixEngine
        let a0 = m.all, end = m.end, i = m.index
        func whole(_ reps: [String]) -> Hit { Hit(s: i, e: end, reps: reps) }
        func tail(_ n: Int, _ reps: [String], keepLen: Int? = nil) -> Hit { let s = end - n; return Hit(s: s, e: keepLen.map { s + $0 } ?? end, reps: reps) }
        switch id {
        case "spell":
            guard let w = spell[a0.lowercased()] else { return nil }
            return whole([F.cap(a0, w)])
        case "i-lower":
            let s = i + F.len(m.g(1))
            if F.test("^i\\.e\\b", F.slice(t, s), ci: true) { return nil }
            return Hit(s: s, e: s + 1, reps: ["I"])
        case "a-an":
            let art = m.g(1).lowercased(), w = m.g(2).lowercased()
            if F.test("^[A-Z]{2,}", m.g(2)) || F.len(w) < 2 || F.test("^(informations|advices|equipments|furnitures|knowledges|evidences|homeworks)$", w) { return nil }
            let silentH = F.test("^(hour|honest|honou?r|heir)", w), yu = F.test("^(uni|use|usu|uti|ura|ure|eu|ewe|one\\b|once|ubiq|ukr|ufo)", w)
            let vowel = silentH || (F.test("^[aeiou]", w) && !yu)
            if art == "a" && vowel { return Hit(s: i, e: i + F.len(m.g(1)), reps: [F.cap(m.g(1), "an")]) }
            if art == "an" && !vowel { return Hit(s: i, e: i + F.len(m.g(1)), reps: [F.cap(m.g(1), "a")]) }
            return nil
        case "dup":
            return F.test("^(had|that|is|do|very|bye|so|ha|no|knock|tut|bla|blah|can|will)$", m.g(1), ci: true) ? nil : whole([m.g(1)])
        case "sva-3":
            if F.test("\\b(does|did|will|would|can|could|should|must|may|might|to|let|make|help|see|hear|watch)\\s+$", F.slice(t, max(0, i - 12), i), ci: true) { return nil }
            let v = m.g(2).lowercased(), r = ["are": "is", "were": "was", "don't": "doesn't"][v] ?? F.s3(v)
            return tail(F.len(m.g(2)), [r])
        case "sva-pl":
            let v = m.g(2).lowercased()
            let r = ["is": "are", "was": "were", "has": "have", "does": "do", "doesn't": "don't", "goes": "go"][v] ?? F.sub(F.sub(v, "ies$", "y"), "s$", "")
            return tail(F.len(m.g(2)), [r])
        case "sva-i":
            let v = m.g(1), r = ["is": "am", "has": "have", "does": "do", "was not": "was not", "goes": "go"][v] ?? F.sub(v, "s$", "")
            if r == v { return nil }
            let s = i + 2
            return Hit(s: s, e: s + F.len(v), reps: [r])
        case "sva-every":
            let r = ["are": "is", "have": "has", "were": "was", "do": "does"][m.g(2).lowercased()] ?? ""
            let s = end - F.len(m.g(2))
            return Hit(s: s, e: s + F.len(m.g(2)), reps: [r])
        case "modal-to": return whole([m.g(1) + " "])
        case "modal-s":
            let v = m.g(3).lowercased()
            let r = ["goes": "go", "has": "have", "does": "do", "is": "be", "was": "be", "went": "go", "did": "do", "came": "come"][v] ?? F.sub(v, "s$", "")
            return tail(F.len(m.g(3)), [r], keepLen: F.len(v))
        case "modal-of": return tail(2, ["have"], keepLen: 2)
        case "perf-v2":
            let v = m.g(3).lowercased()
            return tail(F.len(m.g(3)), [v3[v] ?? ""], keepLen: F.len(v))
        case "did-v2":
            if F.test("^(did|does)$", m.g(1), ci: true) && !F.test("[?]", F.slice(t, i, i + 80)) { return nil }
            let v = m.g(2).lowercased()
            let r = base[v] ?? ["goes": "go", "has": "have"][v] ?? F.sub(v, "s$", "")
            return tail(F.len(m.g(2)), [r], keepLen: F.len(v))
        case "do-subj-s":
            let v = m.g(3).lowercased()
            var r = base[v] ?? ["goes": "go", "has": "have", "studied": "study"][v]
            if r == nil { r = F.sub(F.sub(F.sub(F.sub(v, "ied$", "y"), "(liv|lik)ed$", "$1e"), "ed$", ""), "s$", "") }
            return tail(F.len(m.g(3)), [r ?? v], keepLen: F.len(v))
        case "make-to": return tail(3, [""], keepLen: 3)
        case "ger":
            if F.test("^(the|a|an|my|your|his|her|our|their|this|that|me|him|them|us|it)$", m.g(3), ci: true) { return nil }
            return Hit(s: end - F.len(m.g(3)) - 3, e: end, reps: [F.ing(m.g(3))])
        case "look-fwd": return tail(F.len(m.g(2)), [F.ing(m.g(2))])
        case "be-agree": return whole([m.g(2)])
        case "if-will":
            let p = m.g(2).lowercased(), v = m.g(3).lowercased(), third = F.test("^(he|she|it)$", p)
            let r = v == "be" ? (p == "i" ? "am" : third ? "is" : "are") : third ? F.s3(v) : v
            return Hit(s: end - F.len(m.g(3)) - 5, e: end, reps: [r])
        case "uncount":
            let r = F.sub(F.sub(a0.lowercased(), "ies$", "y"), "s$", "")
            return whole([F.cap(a0, r)])
        case "more-er": return whole([m.g(2)])
        case "then-than":
            let w = m.g(1)
            if F.test("^(other|rather|more|less|better|worse)$", w, ci: true) { return nil }
            if F.test("er$", w, ci: true) && !F.test("^(after|never|whether|ever|over|under|together|however|either|neither|order|offer|enter|answer|consider|remember|wonder|matter|number|water|paper|later|layer|player|teacher|user|power|computer)$", w, ci: true) {
                return Hit(s: end - 4, e: end, reps: ["than"])
            }
            return nil
        case "since-for": return Hit(s: i, e: i + 5, reps: [F.cap(a0, "for")])
        case "discuss-about":
            let v = m.g(1).lowercased(), p = m.g(2).lowercased()
            if F.test("^(enter|entered)$", v) && p != "to" { return nil }
            if F.test("^marr", v) && p != "with" { return nil }
            if F.test("^lack", v) && p != "of" { return nil }
            if F.test("^reach", v) && p != "to" { return nil }
            if F.test("^mention", v) && p != "about" { return nil }
            if F.test("^discuss", v) && p != "about" { return nil }
            if F.test("^lack", v) && F.test("\\b(a|the)\\s+$", F.slice(t, max(0, i - 6), i), ci: true) { return nil }
            return Hit(s: i + F.len(m.g(1)), e: end, reps: [""])
        case "dep-prep":
            let w0 = m.g(1).lowercased()
            let v = F.test("^(interested|famous|married|responsible|different|similar|good)$", w0) ? w0 : F.sub(F.sub(w0, "(s|ed|ing)$", ""), "^arriv$", "arrive")
            let p = m.g(2).lowercased()
            let ok: [String: [String]] = ["depend": ["on"], "interested": ["in"], "famous": ["for"], "responsible": ["for", "to"], "married": ["to"], "different": ["from", "to"], "similar": ["to"], "consist": ["of", "in"], "arrive": ["at", "in"], "good": ["at"]]
            guard let o = ok[v], !o.contains(p), v != "good" else { return nil }
            return Hit(s: end - F.len(m.g(2)), e: end, reps: [o[0]])
        case "other-hand": return Hit(s: i, e: i + 2, reps: [F.cap(a0, "on")])
        case "despite-of": return Hit(s: i + 7, e: end, reps: [""])
        case "although-but": return Hit(s: i + F.lastIndexOf(a0, ",") + 1, e: end, reps: [""])
        case "because-so":
            if F.test("^(as|since)$", m.g(1), ci: true) { return nil }
            return Hit(s: i + F.lastIndexOf(a0, ",") + 1, e: end, reps: [""])
        case "explain-me": return Hit(s: i + F.len(m.g(1)) + 1, e: end, reps: ["to " + m.g(2)])
        case "your-welcome": return Hit(s: i, e: i + 4, reps: [F.cap(a0, "you're")])
        case "its-a": return Hit(s: i, e: i + 3, reps: [F.cap(a0, "it's")])
        case "there-their": return Hit(s: i, e: i + 5, reps: [F.cap(a0, "their")])
        case "sp-before":
            let nx = end < t.length ? String(utf16CodeUnits: [t.character(at: end)], count: 1) : ""
            if F.test("[A-Za-z]", nx) {
                return F.test("[,;!?]", m.g(3)) && F.test("[A-Za-z]", m.g(1)) ? Hit(s: i + 1, e: end, reps: [m.g(3) + " "]) : nil
            }
            if (m.g(3) == "." && F.test("\\.\\s*$", m.g(1))) || (F.test("[:;]", m.g(3)) && F.test("[=(]", nx)) { return nil }
            return Hit(s: i + 1, e: i + 1 + F.len(m.g(2)), reps: [""])
        case "sp-after": let s = i + F.len(m.g(1)); return Hit(s: s, e: s + 1, reps: [m.g(2) + " "])
        case "dbl-space": return Hit(s: i + 1, e: i + 1 + F.len(m.g(2)), reps: [" "])
        case "cap-start":
            let s = i + F.len(m.g(1))
            let before = F.slice(t, max(0, i - 6), i + 1).trimmingCharacters(in: .whitespacesAndNewlines)
            if !m.g(1).isEmpty && (F.test("\\b(e\\.g|i\\.e|etc|vs|Mr|Mrs|Ms|Dr|St|No|approx|p|pp|cf|al|fig|ca)\\.$", before, ci: true) || F.test("\\.\\.\\.?$", before) || F.test("\\d\\.$", before)) { return nil }
            if m.g(1).isEmpty && i != 0 { return nil }
            func ch(_ k: Int) -> String { k >= 0 && k < t.length ? String(utf16CodeUnits: [t.character(at: k)], count: 1) : "" }
            if ch(s + 1 + F.len(m.g(3))) == "." && F.len(m.g(3)) < 3 { return nil }
            if F.test("^(http|www|https)$", m.g(2) + m.g(3), ci: true) || F.test("[@/:]", ch(s + F.len(m.g(2)) + F.len(m.g(3)))) { return nil }
            return Hit(s: s, e: s + 1, reps: [m.g(2).uppercased()])
        case "linker-comma": let s = end - F.len(m.g(2)); return Hit(s: s, e: end, reps: [m.g(2) + ","])
        case "redund":
            let k = F.sub(a0.lowercased(), ",", "")
            let tbl = ["return back": "return", "repeat again": "repeat", "revert back": "revert", "in my opinion i think": "in my opinion", "i personally think": "I think", "free gift": "gift", "end result": "result", "past history": "history",
                       "future plans": "plans", "each and every": "every", "join together": "join", "combine together": "combine", "true fact": "fact", "final conclusion": "conclusion", "still continue": "continue"]
            guard let r = tbl[k] else { return nil }
            return whole([F.cap(a0, r)])
        case "upgrade":
            let k = F.sub(a0.lowercased(), "\\s+", " ")
            let k2 = k.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
            guard let opts = upg[k2], !opts.isEmpty else { return nil }
            return Hit(s: i, e: end, reps: opts.map { F.cap(a0, $0.first ?? "") }, levels: opts.map { $0.count > 1 ? $0[1] : "" })
        default: return nil
        }
    }
    private static func lastIndexOf(_ s: String, _ sub: String) -> Int {
        let r = (s as NSString).range(of: sub, options: .backwards)
        return r.location == NSNotFound ? -1 : r.location
    }

    // MARK: check
    private static let prio = ["spelling": 0, "grammar": 1, "punct": 2, "style": 3]
    /// `LK_WRITE.check(text)`: issues sorted by position, overlaps resolved (spelling > grammar > punctuation > style, then the earlier one)
    public func check(_ text0: String) -> [FixIssue] {
        let text = Vocab.prefix(text0, maxLen), t = text as NSString
        var out: [FixIssue] = []
        for r in rules {
            let ms = r.re.matches(in: text, range: NSRange(location: 0, length: t.length)).prefix(400)
            for mt in ms {
                if mt.range.length == 0 { continue }
                guard let x = fn(r.id, M(ns: t, r: mt), t), x.e > x.s, x.s >= 0 else { continue }
                if x.reps.count == 1 && x.reps[0] == FixEngine.slice(t, x.s, x.e) { continue }
                out.append(FixIssue(s: x.s, e: x.e, type: r.type, reps: x.reps, levels: x.levels, rule: "lk:" + r.id, title: r.title, why: r.why, lesson: r.lesson))
            }
        }
        out = Vocab.stableSorted(out) { (FixEngine.prio[$0.type] ?? 9, $0.s) < (FixEngine.prio[$1.type] ?? 9, $1.s) }
        var keep: [FixIssue] = []
        for x in out where !keep.contains(where: { x.s < $0.e && $0.s < x.e }) { keep.append(x) }
        return Vocab.stableSorted(keep) { $0.s < $1.s }
    }

    /// what the "Sửa nhanh" button writes: every safe issue's first replacement, applied from the end so earlier offsets stay valid
    public static func fixed(_ text: String, _ issues: [FixIssue]) -> String {
        var s = text as NSString
        let order = Vocab.stableSorted(issues.filter(\.safe)) { $0.s > $1.s }
        for x in order where x.e <= s.length { s = s.replacingCharacters(in: NSRange(location: x.s, length: x.e - x.s), with: x.reps[0]) as NSString }
        return s as String
    }
    /// replace one issue (or several, from the end) in `text`
    public static func apply(_ text: String, _ list: [(FixIssue, String)]) -> String {
        var s = text as NSString
        let order = Vocab.stableSorted(list) { $0.0.s > $1.0.s }
        for (x, rep) in order where x.e <= s.length { s = s.replacingCharacters(in: NSRange(location: x.s, length: x.e - x.s), with: rep) as NSString }
        return s as String
    }
    /// the key of an ignored issue: rule + the wrong text, lower-cased
    public static func key(_ x: FixIssue, _ text: String) -> String { x.rule + "|" + slice(text as NSString, x.s, x.e).lowercased() }
    /// the web "{n} từ" counter of #/fix
    public static func wordCount(_ s: String) -> Int { Essay.words(s) }
}
