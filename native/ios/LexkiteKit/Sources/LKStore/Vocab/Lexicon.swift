import Foundation
import LKSync

/// The word store (web/js/lex.js): one entry per normalised key, accent-folded and irregular-form maps, rule-based stemming, phrasal-verb heads.
/// Shards come from the CDN behind `LexShardLoader` (`/data/lex-index.json`, `/data/lex/c/<hash>.json`); without a loader the in-memory
/// `fallback` shard (the bundled word library + irregular verb forms) answers with the same normalisation, like the web INDEX fallback.
public struct LexShard: Sendable {
    /// key → entry
    public var e: [String: JSON] = [:]
    /// accent-folded key → key
    public var f: [String: String] = [:]
    /// irregular form → base key
    public var r: [String: String] = [:]
    /// keys that have audio
    public var a: Set<String> = []
    /// key → [[phrase, vi, example]…]
    public var p: [String: JSON] = [:]
    public init() {}
    public init(json: JSON) {
        for (k, v) in json["e"]?.object ?? [:] { e[k] = v }
        for (k, v) in json["f"]?.object ?? [:] { if let s = v.string { f[k] = s } }
        for (k, v) in json["r"]?.object ?? [:] { if let s = v.string { r[k] = s } }
        a = Set(json.strs("a"))
        for (k, v) in json["p"]?.object ?? [:] { p[k] = v }
    }
    /// build the fallback shard from a word library the way lex.js fbShard() does
    public init(library: [JSON], irregular: [String: String] = [:]) {
        for w in library {
            let n = Lexicon.norm(w.s("word"))
            if e[n] == nil { e[n] = w }
            let fd = Lexicon.fold(n)
            if fd != n && f[fd] == nil { f[fd] = n }
        }
        for (form, base) in irregular where e[form] == nil && e[base] != nil { r[form] = base }
    }
}

/// `/data/lex-index.json`: `{v, g, c:[[firstKey, hash]…], l, top, n}`
public struct LexIndex: Sendable {
    public var version: String
    public var chunks: [(first: String, hash: String)]
    public init(json: JSON) {
        version = json.s("v")
        chunks = json.list("c").compactMap { c in
            guard let a = c.array, a.count >= 2, let f = a[0].string, let h = a[1].string else { return nil }
            return (f, h)
        }
    }
    /// binary search: the last chunk whose first key ≤ k
    func chunk(for k: String) -> Int {
        var lo = 0, hi = chunks.count - 1, ans = 0
        while lo <= hi { let m = (lo + hi) >> 1; if chunks[m].first <= k { ans = m; lo = m + 1 } else { hi = m - 1 } }
        return ans
    }
}

public protocol LexShardLoader: Sendable {
    func index() async throws -> JSON
    func shard(hash: String) async throws -> JSON
}

public struct LexHit: Sendable {
    public var entry: JSON, key: String
    /// exact · fold · irregular · rule · phrasal
    public var via: String
    public var from: String
    public var hasAudio: Bool
}

public enum Lexicon {
    // MARK: normalisation (shared with the shard builder – never copy elsewhere)
    public static func norm(_ s: String?) -> String {
        var x = (s ?? "").precomposedStringWithCanonicalMapping.lowercased()
        x = x.replacingOccurrences(of: "[\u{2019}\u{2018}\u{2BC}`\u{B4}\u{2032}]", with: "'", options: .regularExpression)
        x = x.replacingOccurrences(of: "[\u{2010}\u{2011}\u{2012}\u{2013}\u{2014}\u{2015}\u{2212}]", with: "-", options: .regularExpression)
        x = x.replacingOccurrences(of: "[\\s\u{A0}\u{200B}]+", with: " ", options: .regularExpression)
        return x.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    /// café → cafe
    public static func fold(_ s: String) -> String {
        var out = String.UnicodeScalarView()
        for u in s.decomposedStringWithCanonicalMapping.unicodeScalars where !(u.value >= 0x300 && u.value <= 0x36F) { out.append(u) }
        return String(out).precomposedStringWithCanonicalMapping
    }
    /// "(word)." → word
    public static func edge(_ s: String) -> String { s.replacingOccurrences(of: "^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+$", with: "", options: .regularExpression) }

    static func m(_ s: String, _ re: String) -> Bool { s.range(of: re, options: .regularExpression) != nil }
    static func cut(_ s: String, _ n: Int) -> String { String(s.dropLast(n)) }
    /// candidate base forms by suffix rules (irregulars live in the shard data)
    public static func stems(_ w: String) -> [String] {
        var out: [String] = []
        func add(_ x: String) { if x.count > 1 && x != w && !out.contains(x) { out.append(x) } }
        let dbl = "([b-df-hj-np-tv-z])\\1$"
        if m(w, "[^aeiou]ies$") { add(cut(w, 3) + "y") }
        if m(w, "(s|x|z|ch|sh|o)es$") { add(cut(w, 2)) }
        if m(w, "[^s]s$") && !m(w, "(us|is|ss)$") { add(cut(w, 1)) }
        if m(w, "ves$") { add(cut(w, 3) + "f"); add(cut(w, 3) + "fe") }
        if m(w, "[^aeiou]ied$") { add(cut(w, 3) + "y") }
        if m(w, "ed$") { let s = cut(w, 2); if m(s, dbl) { add(cut(s, 1)) }; add(cut(w, 1)); add(s) }
        if m(w, "ing$") && w.count > 4 { let s = cut(w, 3); if m(s, dbl) { add(cut(s, 1)) }; add(s); add(s + "e"); if m(s, "y$") { add(cut(s, 1) + "ie") } }
        if m(w, "[^aeiou]ier$") { add(cut(w, 3) + "y") }
        if m(w, "[^aeiou]iest$") { add(cut(w, 4) + "y") }
        if m(w, "er$") && w.count > 4 { let s = cut(w, 2); if m(s, dbl) { add(cut(s, 1)) }; add(s); add(cut(w, 1)) }
        if m(w, "est$") && w.count > 5 { let s = cut(w, 3); if m(s, dbl) { add(cut(s, 1)) }; add(s); add(cut(w, 2)) }
        if m(w, "'s$") { add(cut(w, 2)) }
        return out
    }
    /// past / participle forms of one irregular-verb row ("a/b:UK" strings or {w, tag}) – used to build the irregular map
    public static func formsOf(past: [String], pp: [String]) -> [String] {
        (past + pp).flatMap { $0.split(separator: "/").map(String.init) }.map { x in
            var t = x; if let i = t.firstIndex(of: ":") { t = String(t[..<i]) }
            return t.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        }.filter { !$0.isEmpty }
    }
    static let object = "^(it|them|him|her|me|us|you|this|that|something|someone|sth|sb)$"

    /// lex.js resolve(): exact → accent fold → irregular → rule stems → phrasal-verb heads. `shard(key)` returns the shard that holds the key.
    public static func resolve(_ raw: String, shard: (String) async -> LexShard?) async -> LexHit? {
        func L(_ k: String) async -> (sh: LexShard?, entry: JSON?) { let sh = await shard(k); return (sh, sh?.e[k]) }
        func hit(_ e: JSON, _ k: String, _ via: String, _ from: String, _ sh: LexShard?) -> LexHit { LexHit(entry: e, key: k, via: via, from: from, hasAudio: sh?.a.contains(k) ?? false) }
        let b = norm(raw)
        if b.isEmpty { return nil }
        var tries = [b]
        let e2 = edge(b)
        if !e2.isEmpty && e2 != b { tries.append(e2) }
        for k in tries {
            let (sh, entry) = await L(k)
            if let entry { return hit(entry, k, "exact", "", sh) }
            if let kk = sh?.f[fold(k)] { let r = await L(kk); if let e = r.entry { return hit(e, kk, "fold", "", r.sh) } }
            let fk = fold(k)
            if fk != k { let r = await L(fk); if let e = r.entry { return hit(e, fk, "fold", "", r.sh) } }
            if let base = sh?.r[k] { let r = await L(base); if let e = r.entry { return hit(e, base, "irregular", k, r.sh) } }
        }
        let w = e2.isEmpty ? b : e2
        let parts = w.split(separator: " ", omittingEmptySubsequences: false).map(String.init)
        if parts.count == 1 {
            for s in stems(w) { let r = await L(s); if let e = r.entry { return hit(e, s, "rule", w, r.sh) } }
            return nil
        }
        if parts.count <= 4 {
            let tail = Array(parts.dropFirst())
            let rest = tail.enumerated().filter { !(m($0.element, object) && $0.offset < tail.count - 1) }.map(\.element)
            var heads = [parts[0]]
            let h = await L(parts[0])
            if let base = h.sh?.r[parts[0]] { heads.append(base) }
            heads.append(contentsOf: stems(parts[0]))
            for hd in heads { for t in [rest, tail] {
                let k = ([hd] + t).joined(separator: " ")
                if k == w { continue }
                let r = await L(k)
                if let e = r.entry { return hit(e, k, "phrasal", w, r.sh) }
            } }
        }
        return nil
    }
}

/// Lex.get / Lex.suggest / Lex.phrases over CDN shards (cached in memory) or the in-memory fallback shard.
public actor LexStore {
    private let loader: LexShardLoader?
    private var fallback: LexShard
    private var idx: LexIndex?
    private var mem: [String: LexShard] = [:]
    private var memo: [String: LexHit?] = [:]

    public init(loader: LexShardLoader? = nil, fallback: LexShard = LexShard()) { self.loader = loader; self.fallback = fallback }
    public func setFallback(_ s: LexShard) { fallback = s; memo.removeAll() }

    private func ensureIndex() async {
        if idx == nil, let loader, let j = try? await loader.index() { let i = LexIndex(json: j); if !i.chunks.isEmpty { idx = i } }
    }
    private func loadShard(_ hash: String) async -> LexShard? {
        if let s = mem[hash] { return s }
        guard let loader, let j = try? await loader.shard(hash: hash) else { return nil }
        let s = LexShard(json: j); mem[hash] = s; return s
    }
    private func shard(for k: String, useFallback: Bool) async -> LexShard? {
        if let idx, !useFallback { return await loadShard(idx.chunks[idx.chunk(for: k)].hash) }
        return fallback
    }

    public func get(_ raw: String) async -> LexHit? {
        let mk = Lexicon.norm(raw)
        if let v = memo[mk] { return v }
        await ensureIndex()
        var r = await Lexicon.resolve(raw) { await self.shard(for: $0, useFallback: false) }
        if r == nil && idx != nil { r = await Lexicon.resolve(raw) { await self.shard(for: $0, useFallback: true) } }
        memo[mk] = r
        return r
    }
    /// keys that START with the normalised query, sorted, at most `n` – `{key, word, vi, pos, entry}`
    public func suggest(_ q: String, _ n: Int = 6) async -> [(key: String, entry: JSON)] {
        let k = Lexicon.norm(q)
        if k.isEmpty { return [] }
        await ensureIndex()
        var out: [(key: String, entry: JSON)] = []
        func push(_ key: String, _ e: JSON) { if key.hasPrefix(k) && out.count < n && !out.contains(where: { $0.key == key }) { out.append((key, e)) } }
        if let idx {
            var i = idx.chunk(for: k)
            while i < idx.chunks.count && out.count < n {
                if let sh = await loadShard(idx.chunks[i].hash) { for key in sh.e.keys.sorted(by: JSON.utf16Less) { push(key, sh.e[key]!) } }
                i += 1
                if !(i < idx.chunks.count && idx.chunks[i].first.hasPrefix(k)) { break }
            }
        } else {
            for key in fallback.e.keys.filter({ $0.hasPrefix(k) }).sorted(by: JSON.utf16Less).prefix(n) { push(key, fallback.e[key]!) }
        }
        return out
    }
    /// phrases containing the word (≤ 8, from its shard): `[{word, vi, ex}]`; nil without shards
    public func phrases(_ raw: String) async -> [JSON]? {
        await ensureIndex()
        guard idx != nil else { return nil }
        guard let r = await Lexicon.resolve(raw, shard: { await self.shard(for: $0, useFallback: false) }), let sh = await shard(for: r.key, useFallback: false) else { return [] }
        func at(_ v: JSON, _ i: Int) -> JSON { if let a = v.array, a.count > i { return a[i] }; return .null }
        return (sh.p[r.key]?.array ?? []).map { v in JSON.obj([("word", at(v, 0)), ("vi", at(v, 1)), ("ex", at(v, 2))]) }
    }
}
