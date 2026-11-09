import Foundation
import LKSync

/// #/usage – port of web/js/usage-core.js. Data = the DSL text per kind (`web/js/usage/*.js` → `LK_USAGE_SRC[kind]`, loaded like the web does) and
/// the index `LK_USAGE_IDX {w, id}` (word → kinds that cover it). Entries are `JSON` shaped like the web objects.
public struct UsageStore: Sendable {
    public static let kinds = ["p", "v", "a", "s", "c"]
    public static let subs: [String: [String]] = ["p": ["a", "v", "n"], "v": ["v"], "a": ["irr", "freq", "deg", "time", "link", "focus", "view", "man"], "s": ["s"], "c": ["c"]]
    public static let preps = ["in", "on", "at", "for", "to", "of", "with", "about", "from", "by", "into", "against", "over", "towards", "between", "among", "after"]
    public static let quizPreps = ["in", "on", "at", "for", "to", "of", "with", "about", "from", "by"]
    public static let vcodes = ["to", "ing", "oto", "obare", "bare", "that", "sub", "oing", "ov3", "wh", "pass", "ping", "oo", "o"]

    /// word → letters of the kinds covering it, in index order (the index file's key order decides the suggestions' tie order)
    public let wordKeys: [String]
    let w: [String: String], id: [String: String]
    let entries: [String: [JSON]]
    let verbs: Verbs?

    /// - Parameters: `sources` kind → DSL text; `index` = text of `LK_USAGE_IDX` JSON (`{"w":{…},"id":{…}}`); `verbs` for the conjugation helpers
    public init(sources: [String: String], indexJSON: String, verbs: Verbs? = nil) {
        var e: [String: [JSON]] = [:]
        for k in Self.kinds { if let s = sources[k] { e[k] = Self.parse(k, s).entries } }
        entries = e; self.verbs = verbs
        let (wk, wm) = Self.orderedMap(indexJSON, key: "w"), (_, im) = Self.orderedMap(indexJSON, key: "id")
        wordKeys = wk; w = wm; id = im
    }
    /// `{"w":{"a":"b",…}}` → keys in file order + map (values are plain strings)
    static func orderedMap(_ text: String, key: String) -> ([String], [String: String]) {
        let u = Array(text.utf8)
        guard let r = text.range(of: "\"\(key)\":{") else { return ([], [:]) }
        var i = text.utf8.distance(from: text.utf8.startIndex, to: r.upperBound)
        var keys: [String] = [], map: [String: String] = [:]
        func str() -> String? {
            guard i < u.count, u[i] == 34 else { return nil }
            i += 1; var b: [UInt8] = []
            while i < u.count, u[i] != 34 { if u[i] == 92, i + 1 < u.count { i += 1 }; b.append(u[i]); i += 1 }
            i += 1; return String(decoding: b, as: UTF8.self)
        }
        while i < u.count, u[i] != 125 {
            if u[i] == 44 { i += 1; continue }
            guard let k = str(), i < u.count, u[i] == 58 else { break }
            i += 1
            guard let v = str() else { break }
            keys.append(k); map[k] = v
        }
        return (keys, map)
    }

    // MARK: text helpers
    public static func norm(_ s: String?) -> String {
        (s ?? "").lowercased().replacingOccurrences(of: "\u{2019}", with: "'").split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
    static func splitBar(_ s: String) -> [String] {
        Dict.split(s, "\\s+\\|\\s+").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
    }
    static func splitComma(_ s: String) -> [String] { Dict.split(s, "\\s*,\\s*").filter { !$0.isEmpty } }

    /// "She stopped [to buy|buying|buy] water." → {pre, ans, alts, post, text, raw}
    public static func example(_ src: String?) -> JSON {
        let s = src ?? ""
        guard let a = s.firstIndex(of: "["), let b = s[a...].firstIndex(of: "]") else {
            return .obj([("pre", .string(s)), ("ans", ""), ("alts", .array([])), ("post", ""), ("text", .string(s)), ("raw", .string(s))])
        }
        let parts = s[s.index(after: a)..<b].split(separator: "|", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
        let pre = String(s[..<a]), post = String(s[s.index(after: b)...])
        return .obj([("pre", .string(pre)), ("ans", .string(parts[0])), ("alts", .strings(parts.dropFirst().filter { !$0.isEmpty })), ("post", .string(post)), ("text", .string(pre + parts[0] + post)), ("raw", .string(s))])
    }

    /// one group of the DSL → entries + diagnostics (never throws)
    public static func parse(_ kind: String, _ src: String?) -> (entries: [JSON], errors: [String]) {
        var out: [JSON] = [], errors: [String] = []
        var cur: Int?, item: Int?
        for (i, line) in (src ?? "").components(separatedBy: "\n").enumerated() {
            let L = line.trimmingCharacters(in: .whitespacesAndNewlines)
            if L.isEmpty || L.hasPrefix("//") { continue }
            let tag = String(L.first!), rest = String(L.dropFirst()).trimmingCharacters(in: .whitespacesAndNewlines)
            func err(_ m: String) { errors.append("\(kind):\(i + 1): \(m)") }
            if tag == "@" {
                guard let m = Verbs.groups(rest, "^(\\S+)\\s+(.+)$") else { err("thiếu khóa"); continue }
                let sub = m[1]
                out.append(.obj([("kind", .string(kind)), ("sub", .string(sub)), ("key", .string(m[2].trimmingCharacters(in: .whitespacesAndNewlines))), ("items", .array([])), ("ex", .array([])), ("notes", .array([])),
                                 ("mis", .array([])), ("col", .array([])), ("lessons", .array([])), ("reg", .array([])), ("quiz", .array([])), ("k", .array([])), ("pos", .array([])), ("rel", .array([])), ("f", "")]))
                cur = out.count - 1; item = nil
                if !(subs[kind] ?? []).contains(sub) { err("loại không hợp lệ: " + sub) }
                continue
            }
            guard let c = cur else { err("dòng nằm ngoài mục"); continue }
            func append(_ key: String, _ v: JSON) { var a = out[c].list(key); a.append(v); out[c][key] = .array(a) }
            func appendAll(_ key: String, _ v: [String]) { out[c][key] = .array(out[c].list(key) + v.map { JSON.string($0) }) }
            switch tag {
            case "+":
                let p = splitBar(rest)
                let it = JSON.obj([("h", .string(p.first ?? "")), ("vi", .string(p.count > 1 ? p[1] : "")), ("en", .string(p.count > 2 ? p[2] : "")), ("ex", .array(p.count > 3 && !p[3].isEmpty ? [.string(p[3])] : []))])
                append("items", it); item = out[c].list("items").count - 1
            case "x":
                if let ix = item { var items = out[c].list("items"); items[ix]["ex"] = .array(items[ix].list("ex") + [.string(rest)]); out[c]["items"] = .array(items) } else { append("ex", .string(rest)) }
            case "#":
                let p = splitBar(rest); append("notes", .obj([("vi", .string(p.first ?? "")), ("en", .string(p.count > 1 ? p[1] : ""))]))
            case "!":
                let p = splitBar(rest), pair = p.first ?? ""
                let wr = Dict.split(pair, "\\s*=>\\s*")
                let w = wr[0], r = wr.count > 1 ? wr[1] : ""
                if r.isEmpty { err("lỗi thiếu =>") }
                append("mis", .obj([("w", .string(w)), ("r", .string(r)), ("vi", .string(p.count > 1 ? p[1] : "")), ("en", .string(p.count > 2 ? p[2] : ""))]))
            case "=": appendAll("col", splitComma(rest))
            case ">": appendAll("lessons", splitComma(rest))
            case "~":
                let p = splitBar(rest); append("reg", .obj([("r", .string(p.first ?? "")), ("vi", .string(p.count > 1 ? p[1] : "")), ("en", .string(p.count > 2 ? p[2] : ""))]))
            case "?": append("quiz", .string(rest))
            case "f": out[c]["f"] = .string(rest)
            case "k": appendAll("k", splitComma(rest).map { norm($0) }.filter { !$0.isEmpty })
            case "^": appendAll("pos", Dict.split(rest, "[\\s,]+").filter { !$0.isEmpty })
            case "&": appendAll("rel", splitComma(rest).map { norm($0) }.filter { !$0.isEmpty })
            default: err("ký hiệu lạ: " + tag)
            }
        }
        return (out, errors)
    }

    // MARK: store
    public func has(_ kind: String) -> Bool { entries[kind] != nil }
    public func load(_ kind: String) -> [JSON] { entries[kind] ?? [] }
    public func list(_ kind: String, sub: String? = nil) -> [JSON] { load(kind).filter { sub == nil || $0.s("sub") == sub } }
    public func byId(_ kind: String, _ id: String) -> JSON? { load(kind).first { $0.s("key") == id } }
    public func counts() -> JSON {
        .object(Dictionary(uniqueKeysWithValues: Self.kinds.map { (k: String) -> (String, JSON) in
            let es = load(k)
            let n = es.reduce(0) { $0 + $1.list("items").count }
            return (k, JSON.obj([("entries", .int(es.count)), ("items", .int(n))])) }))
    }
    /// words an entry covers: key + heads (adverbs / pairs) + structure keywords
    public func words(_ e: JSON) -> [String] {
        var out: [String] = []
        func add(_ x: String) { if !out.contains(x) { out.append(x) } }
        let kind = e.s("kind")
        if ["p", "v", "a"].contains(kind) { add(Self.norm(e.s("key"))) }
        if kind == "a" { for x in e.list("items") { let h = Self.norm(x.s("h")); if Verbs.m(h, "^[a-z][a-z' -]*$") && h.split(separator: " ").count <= 2 { add(h) } } }
        if kind == "c" { for x in e.list("items") { add(Self.norm(Dict.rx(x.s("h"), "\\s*\\(.*\\)$", ""))) } }
        if kind == "s" { for x in e.strs("k") { add(x) } }
        return out
    }
    public func lookup(_ key: String) -> JSON {
        let k = Self.norm(key)
        var o: [String: JSON] = ["key": .string(k)]
        var count = 0
        for kind in Self.kinds {
            let hits = load(kind).filter { Self.norm($0.s("key")) == k || words($0).contains(k) }
            o[kind] = .array(hits); count += hits.count
        }
        o["count"] = .int(count)
        return .object(o)
    }

    // MARK: index
    public func chunksOf(_ key: String) -> String { (w[key] ?? "") + (id[key] ?? "") }
    public var indexCounts: (words: Int, ids: Int) { (w.count, id.count) }
    /// bring an inflected form to an index key (interests → interest, relied → rely, arriving → arrive)
    public func resolve(_ q: String) -> String? {
        var s = Self.norm(q)
        s = Dict.rx(s, "^to\\s+", ""); s = Dict.rx(s, "[.?!,;:\"\u{201C}\u{201D}]+$", "")
        if s.isEmpty { return nil }
        if w[s] != nil || id[s] != nil { return s }
        var cands: [String] = []
        func add(_ x: String) { if !x.isEmpty { cands.append(x) } }
        func cut(_ x: String, _ n: Int) -> String { String(x.dropLast(n)) }
        if let v = verbs, Verbs.m(s, "^[a-z]+$"), let r = v.resolve(s), r.t("base") { add(r.s("base")) }
        if Verbs.m(s, "ies$") { add(cut(s, 3) + "y") }
        if Verbs.m(s, "ied$") { add(cut(s, 3) + "y") }
        if Verbs.m(s, "es$") { add(cut(s, 2)) }
        if Verbs.m(s, "s$") { add(cut(s, 1)) }
        if Verbs.m(s, "ed$") { add(cut(s, 2)); add(cut(s, 1)); if Verbs.m(s, "(.)\\1ed$") { add(cut(s, 3)) } }
        if Verbs.m(s, "ing$") { add(cut(s, 3)); add(cut(s, 3) + "e"); if Verbs.m(s, "(.)\\1ing$") { add(cut(s, 4)) } }
        if Verbs.m(s, "\\s") {
            let f = s.split(separator: " ").first.map(String.init) ?? ""
            add(f); if Verbs.m(f, "s$") { add(cut(f, 1)) }
            if Verbs.m(f, "ed$") { add(cut(f, 2)); add(cut(f, 1)) }
        }
        return cands.first { w[$0] != nil || id[$0] != nil }
    }
    /// resolved key first, then keys starting with the text (shortest first), then keys containing it
    public func suggest(_ q: String, _ n: Int = 8) -> [String] {
        let s = Self.norm(q)
        if s.isEmpty { return [] }
        let r = resolve(s)
        let a = Vocab.stableSorted(wordKeys.filter { $0.hasPrefix(s) }) { $0.utf16.count != $1.utf16.count ? $0.utf16.count < $1.utf16.count : JSON.utf16Less($0, $1) }
        let b = Vocab.stableSorted(wordKeys.filter { !$0.hasPrefix(s) && $0.contains(s) }) { $0.utf16.count < $1.utf16.count }
        var out: [String] = [], seen = Set<String>()
        for k in (r.flatMap { w[$0] != nil ? [$0] : nil } ?? []) + a + b where seen.insert(k).inserted { out.append(k) }
        return Array(out.prefix(n))
    }
    /// typo-tolerant: edit distance ≤ 2
    public func near(_ q: String, _ n: Int = 6) -> [String] {
        let s = Array(Self.norm(q).utf16)
        func d(_ a: [UInt16], _ b: [UInt16]) -> Int {
            if abs(a.count - b.count) > 2 { return 9 }
            var m = Array(0...b.count)
            for i in 0..<a.count {
                var cur = [i + 1]
                for j in 0..<b.count { cur.append(min(m[j + 1] + 1, cur[j] + 1, m[j] + (a[i] == b[j] ? 0 : 1))) }
                m = cur
            }
            return m[b.count]
        }
        let scored = wordKeys.map { ($0, d(s, Array($0.utf16))) }.filter { $0.1 <= 2 }
        return Vocab.stableSorted(scored) { $0.1 < $1.1 }.prefix(n).map(\.0)
    }

    // MARK: practice
    static func rng(_ seed: Double) -> () -> Double {
        var x = UInt64(UInt32(truncatingIfNeeded: Int64(seed))); if x == 0 { x = 1 }
        return { x = (x &* 1_664_525 &+ 1_013_904_223) & 0xFFFF_FFFF; return Double(x) / 4_294_967_296 }
    }
    static func shuffle<T>(_ arr: [T], _ r: () -> Double) -> [T] {
        var a = arr
        var i = a.count - 1
        while i > 0 { let j = Int((r() * Double(i + 1)).rounded(.down)); a.swapAt(i, j); i -= 1 }
        return a
    }
    func verbAlts(_ code: String, _ ans: String) -> [String]? {
        guard let V = verbs else { return nil }
        let a = Self.norm(ans)
        if (code == "to" || code == "oto") && Verbs.m(a, "^to [a-z]+$") { let b = String(a.dropFirst(3)); return [V.forms(b)["ing"]?.array?.first?.s("w") ?? "", b] }
        if code == "ing" && Verbs.m(a, "^[a-z]+ing$") { guard let r = V.resolve(a), r.s("from") == "ing" else { return nil }; return ["to " + r.s("base"), r.s("base")] }
        if (code == "obare" || code == "bare") && Verbs.m(a, "^[a-z]+$") { return ["to " + a, V.forms(a)["ing"]?.array?.first?.s("w") ?? ""] }
        return nil
    }
    /// every practice sentence of an entry: {pre, ans, post, choices, key, kind, item}
    public func quizItems(_ e: JSON) -> [JSON] {
        var out: [JSON] = []
        let items = e.list("items"), codes = Set(items.map { $0.s("h") })
        let amb: [String: [String]] = ["to": ["ing", "bare"], "ing": ["to"], "bare": ["to", "oto"], "oto": ["obare", "oing"], "obare": ["oto", "oing"]]
        func push(_ ex: JSON, _ item: JSON?, _ alts: [String]?) {
            guard ex.t("ans"), let alts, !alts.isEmpty else { return }
            var seen = Set<String>(), ch: [String] = []
            for c in [ex.s("ans")] + alts where seen.insert(c).inserted { ch.append(c) }
            if ch.count < 2 { return }
            out.append(.obj([("pre", .string(ex.s("pre"))), ("ans", .string(ex.s("ans"))), ("post", .string(ex.s("post"))), ("choices", .strings(ch)), ("key", .string(e.s("key"))), ("kind", .string(e.s("kind"))), ("item", item ?? .null)]))
        }
        for item in items { for s in item.strs("ex") {
            let ex = Self.example(s), alts = ex.strs("alts")
            if !alts.isEmpty { push(ex, item, alts); continue }
            if e.s("kind") == "p" {
                let own = Set(items.map { Self.norm($0.s("h")).split(separator: " ").last.map(String.init) ?? "" })
                push(ex, item, Array(Self.quizPreps.filter { !own.contains($0) && $0 != Self.norm(ex.s("ans")) }.prefix(6))); continue
            }
            if e.s("kind") == "v", !(amb[item.s("h")] ?? []).contains(where: { codes.contains($0) }) { push(ex, item, verbAlts(item.s("h"), ex.s("ans"))) }
        } }
        for s in e.strs("ex") + e.strs("quiz") { let ex = Self.example(s); if !ex.strs("alts").isEmpty { push(ex, nil, ex.strs("alts")) } }
        return out
    }
    /// n questions across entries; spread evenly, deterministic for a seed (LCG)
    public func quiz(_ entries: [JSON], n: Int = 5, seed: Double) -> [JSON] {
        let r = Self.rng(seed)
        let all = entries.flatMap { quizItems($0) }
        var picked: [JSON] = [], seen = Set<String>()
        for q in Self.shuffle(all, r) { let k = q.s("key") + "|" + q.s("pre") + q.s("ans"); if seen.insert(k).inserted { picked.append(q) } }
        var order: [String] = [], byKey: [String: [JSON]] = [:]
        for q in picked { let k = q.s("key"); if byKey[k] == nil { order.append(k) }; byKey[k, default: []].append(q) }
        var res: [JSON] = [], round = 0
        while res.count < n && order.contains(where: { (byKey[$0]?.count ?? 0) > round }) {
            for k in order { if let l = byKey[k], l.count > round, res.count < n { res.append(l[round]) } }
            round += 1
        }
        return res.map { q in
            var o = q
            let rest = Array(Self.shuffle(q.strs("choices").filter { $0 != q.s("ans") }, r).prefix(3))
            o["choices"] = .strings(Self.shuffle([q.s("ans")] + rest, r))
            return o
        }
    }
    /// stable id of a practice question → its explanation file
    public static func xid(_ q: JSON) -> String { "\(q.s("kind"))|\(q.s("key"))|" + (q["item"].flatMap { $0 == .null ? nil : $0 }.map { $0.s("h") } ?? "@" + q.s("ans")) }
}
