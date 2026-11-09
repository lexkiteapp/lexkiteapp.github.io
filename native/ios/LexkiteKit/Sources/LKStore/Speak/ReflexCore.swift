import Foundation
import LKSync
import LKCore
import LKStrings

/// M4 P07 – #/reflex (web/js/reflex.js): the sentence pool, the left-to-right word colouring and the 60-second game. Pure; the clock is `tick()`, the
/// microphone result is `heard`, shuffling and the clip check come in as closures. Verified against vectors/speak.json `reflex.*`.
public enum ReflexCore {
    public static let seconds = 60, poolMax = 40, lookAhead = 4, embedLead = 1, embedLength = 5, embedWaitMs = 5600, maxClipMisses = 3
    /// ≥ 80 % is a "right" answer sound
    public static let goodPct = 80

    // MARK: pool
    public enum Source: Equatable, Sendable { case youtube(id: String, t: Int), clip }
    public struct Item: Equatable, Sendable {
        public var text: String, source: Source
        public init(text: String, source: Source) { self.text = text; self.source = source }
    }

    /// reflex `norm` + `.split(' ')`: JS `''.split(' ')` is `['']`
    static func words(_ s: String) -> [String] { let t = SpeakScore.toks(s); return t.isEmpty ? [""] : t }
    static func count(_ s: String) -> Int { words(s).count }

    /// `ytOf`: youtube.com/watch?v=<id> or youtu.be/<id>, id `[\w-]{6,15}`, start = ?t seconds (a trailing `s` allowed)
    public static func youtube(_ src: String) -> (id: String, t: Int)? {
        guard let u = URLComponents(string: src), let host = u.host else { return nil }
        let id: String?
        if host.hasSuffix("youtu.be") { id = String(u.path.dropFirst()) } else { id = u.queryItems?.first { $0.name == "v" }?.value }
        guard let id, id.range(of: "^[A-Za-z0-9_-]{6,15}$", options: .regularExpression) != nil else { return nil }
        var tv = u.queryItems?.first { $0.name == "t" }?.value ?? "0"
        if tv.hasSuffix("s") { tv.removeLast() }
        let digits = tv.prefix { $0.isNumber }
        return (id, Int(digits) ?? 0)
    }
    /// (1) saved YouTube contexts, (2) library examples of 4–14 words that have a clip, (3) only below 40: reading sentences of 5–14 words with a clip; shuffled, cut to 40
    public static func pool(cards: [JSON], examples: [String], readings: [String], hasClip: (String) -> Bool, split: (String) -> [String],
                            shuffle: ([Item]) -> [Item]) -> [Item] {
        var out: [Item] = []
        for c in cards { for x in c.list("contexts") {
            let text = x.s("text"), n = count(text)
            if let src = x["source"]?.string, !src.isEmpty, let y = youtube(src), n >= 3 && n <= 16 { out.append(Item(text: text, source: .youtube(id: y.id, t: y.t))) }
        } }
        for ex in examples { let n = count(ex); if n >= 4 && n <= 14 && hasClip(ex) { out.append(Item(text: ex, source: .clip)) } }
        if out.count < poolMax {
            for r in readings { for sen in split(r) { let n = count(sen); if n >= 5 && n <= 14 && hasClip(sen) { out.append(Item(text: sen, source: .clip)) } } }
        }
        return Array(shuffle(out).prefix(poolMax))
    }
    /// the 5-second embed: starts at max(0, t − 1), ends 5 s later
    public static func embedURL(id: String, t: Int) -> String {
        let s = max(0, t - embedLead)
        return "https://www.youtube-nocookie.com/embed/\(id)?start=\(s)&end=\(s + embedLength)&autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1"
    }

    // MARK: colouring
    public struct Coloured: Equatable, Sendable { public var words: [SpeakScore.Word], pct: Int, shown: String }
    /// words matched left → right, looking at most 4 heard words ahead of the last match; apostrophes are kept ("it's" ≠ "its")
    public static func colorize(_ target: String, _ heard: String) -> Coloured {
        let want = words(target), got = words(heard)
        var j = 0, ok = 0
        let toks = target.split(whereSeparator: { $0.isWhitespace }).map(String.init)
        var out: [SpeakScore.Word] = []
        for (i, tok) in toks.enumerated() {
            let w = i < want.count ? want[i] : ""
            var hit = false
            var k = j
            while k < min(got.count, j + lookAhead) { if got[k] == w { hit = true; j = k + 1; break }; k += 1 }
            if hit { ok += 1 }
            out.append(SpeakScore.Word(w: tok, ok: hit))
        }
        return Coloured(words: out, pct: Vocab.round(Double(ok) / Double(max(1, want.count)) * 100), shown: heard.isEmpty ? "…" : heard)
    }

    // MARK: the game
    public struct Summary: Equatable, Sendable {
        public var n: Int, p: Int
        public var reward: [String: Int]?
        public init(n: Int, p: Int, reward: [String: Int]? = nil) { self.n = n; self.p = p; self.reward = reward }
    }
    public struct Game: Sendable {
        public private(set) var left = ReflexCore.seconds, index = 0, score = 0, done = 0, misses = 0
        public private(set) var running = false, finished = false
        public let items: [Item]
        public init(items: [Item]) { self.items = items }
        public var current: Item? { items.isEmpty ? nil : items[index % items.count] }
        public mutating func start() { index = 0; left = ReflexCore.seconds; score = 0; done = 0; misses = 0; running = true; finished = false }
        /// one second: false when time is up
        public mutating func tick() -> Bool { guard running else { return false }; left -= 1; if left <= 0 { left = max(0, left); return false }; return true }
        /// a scored attempt (mic result)
        public mutating func result(target: String, heard: String) -> Coloured {
            let c = ReflexCore.colorize(target, heard); score += c.pct; done += 1; return c
        }
        public mutating func skip() { index += 1 }
        /// a clip that did not load: skip it, up to 3 in a row; the 4th goes to the recogniser anyway. `true` = skip
        public mutating func clipFailed() -> Bool { misses += 1; if misses > ReflexCore.maxClipMisses { return false }; index += 1; return true }
        public mutating func clipEnded() { misses = 0 }
        /// "{n} lines · average {p}%" and the reward `{spoken:n, xp:5+2n}` only when n > 0
        public mutating func finish() -> Summary {
            running = false; finished = true
            let p = done > 0 ? Vocab.round(Double(score) / Double(done)) : 0
            return Summary(n: done, p: p, reward: done > 0 ? ["spoken": done, "xp": 5 + done * 2] : nil)
        }
    }
}
