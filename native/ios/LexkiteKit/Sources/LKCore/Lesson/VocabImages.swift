import Foundation

/// Lesson "pic" pictures – a port of the pure parts of web/js/vocab-img.js (VImg v3): exact word#pos key, FNV shard, staged rollout, which pictures may be shown.
/// Verified against native/shared/gen/vectors/vimg.json. Loading (head + shards, disk cache) is in LKFeatures/Lesson/PictureIndex.swift.
public enum VocabImages {
    /// Same rules as scripts/lexicon/lib.mjs normPos (+ the Vietnamese part-of-speech names of user cards).
    public static func pos(_ p: String?) -> String {
        let s = (p ?? "").lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        func m(_ re: String) -> Bool { s.range(of: re, options: .regularExpression) != nil }
        if m("^(n|noun)\\b|^danh") { return "n" }
        if m("^(phr ?v|phrasal)|^cụm động") { return "phrv" }
        if m("^(v|verb)\\b|^động") { return "v" }
        if m("^adj|^tính") { return "adj" }
        if m("^adv|^trạng") { return "adv" }
        return s
    }
    /// Exact word#pos – never a picture of another part of speech.
    public static func key(_ word: String, _ pos: String?) -> String { word.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() + "#" + Self.pos(pos) }

    /// Shard of a word: FNV-1a 32-bit over the code points of the lowercased word, modulo the shard count (web `SH`).
    public static func shard(_ word: String, count n: Int) -> Int {
        guard n > 0 else { return 0 }
        var h: UInt32 = 0x811c9dc5
        for u in word.trimmingCharacters(in: .whitespacesAndNewlines).lowercased().unicodeScalars { h ^= u.value; h = h &* 0x01000193 }
        return Int(h % UInt32(n))
    }

    /// Rollout: 1 = on · 0 = off · −1 = automatic (on when the index says `on`). `flag` = Remote Config `vocab_img` ("on" / "off" / "" or true/false/"1"/"0"),
    /// `pct` = `vocab_img_pct` (nil → `defaultPct`), `bucket` = fixed per-device number 0–99.
    public static let defaultPct = 10
    public static func mode(flag: String?, pct: Int?, bucket: Int) -> Int {
        let f = (flag ?? "").lowercased()
        if ["false", "0", "off"].contains(f) { return 0 }
        if ["true", "1", "on"].contains(f) { return 1 }
        let p = max(0, min(100, pct ?? defaultPct))
        return bucket < p ? -1 : 0
    }

    public struct Head: Decodable, Sendable, Equatable {
        public var base: String, n: Int, on: Bool
        private enum K: String, CodingKey { case v, base, on, n }
        public init(base: String, n: Int, on: Bool) { self.base = base; self.n = n; self.on = on }
        public init(from d: Decoder) throws {
            let c = try d.container(keyedBy: K.self)
            base = (try? c.decodeIfPresent(String.self, forKey: .base)) ?? ""
            n = (try? c.decodeIfPresent(Int.self, forKey: .n)) ?? 0
            on = (try? c.decodeIfPresent(Bool.self, forKey: .on)) ?? false
        }
    }
    /// js/vimg/NN.json: `m` word#pos → hash · `s` keys whose picture is a scene (needs its example sentence) · `a` keys with a transparent background.
    public struct Shard: Decodable, Sendable {
        public var m: [String: String], s: Set<String>, a: Set<String>
        private enum K: String, CodingKey { case m, s, a }
        public init(m: [String: String] = [:], s: Set<String> = [], a: Set<String> = []) { self.m = m; self.s = s; self.a = a }
        public init(from d: Decoder) throws {
            let c = try d.container(keyedBy: K.self)
            m = (try? c.decodeIfPresent([String: String].self, forKey: .m)) ?? [:]
            s = Set((try? c.decodeIfPresent([String].self, forKey: .s)) ?? [])
            a = Set((try? c.decodeIfPresent([String].self, forKey: .a)) ?? [])
        }
    }

    public struct Picture: Equatable, Sendable { public var url: URL, scene: Bool, transparent: Bool }

    /// Pictures of the words of one lesson, ready before the exercises are built (the engine's `hasImg` is synchronous).
    public struct Snapshot: Sendable {
        public let enabled: Bool, head: Head?, shards: [Int: Shard]
        public init(enabled: Bool, head: Head?, shards: [Int: Shard]) { self.enabled = enabled; self.head = head; self.shards = shards }
        public static let none = Snapshot(enabled: false, head: nil, shards: [:])
        public func picture(_ word: String, _ pos: String?) -> Picture? {
            guard enabled, let head, head.n > 0, let sh = shards[VocabImages.shard(word, count: head.n)] else { return nil }
            let k = VocabImages.key(word, pos)
            guard let h = sh.m[k], let u = URL(string: head.base + h + ".webp") else { return nil }
            return Picture(url: u, scene: sh.s.contains(k), transparent: sh.a.contains(k))
        }
        /// The lesson "pic" exercise needs a picture that is not a scene; in dark mode only transparent ones (cream backgrounds are hidden).
        public func usable(_ word: String, _ pos: String?, dark: Bool) -> Picture? {
            guard let p = picture(word, pos), !p.scene, !dark || p.transparent else { return nil }
            return p
        }
    }
}
