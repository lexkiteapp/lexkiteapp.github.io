import Foundation

/// ONE reward rule for XP – Swift port of `Game.xpFor` / `Game.repCut` / `Game.XPR` (web/js/game.js). Conformance: vectors/rewards.json
/// (RewardsVectorTests). Integer semantics follow JS: `|0` truncation, Math.round = floor(x+0.5), Math.min/Math.max order kept.
public enum RewardRules {
    public static let pick = 2, type = 3, write = 4, say = 3, hard = 3, set = 10, exam = 40, sec = 30, perfect = 5, min = 5
    public static let talk = 10, essay = 20, learn = 20, step = 2, great = 85, pass = 65, cap = 150, game = 40
    /// card XP by [again, review, new]
    public static let card = [2, 5, 8]

    /// Per-answer XP of a mode (unknown → pick), like `XPR[r.mode] || XPR.pick`.
    public static func perAnswer(_ mode: String?) -> Int {
        switch mode { case "pick": return pick; case "type": return type; case "write": return write; case "say": return say
        case "hard": return hard; case "set": return set; case "exam": return exam; case "sec": return sec; case "perfect": return perfect
        case "min": return min; case "talk": return talk; case "essay": return essay; case "learn": return learn; case "step": return step
        default: return pick }
    }

    @inline(__always) static func jsRound(_ x: Double) -> Int { Int((x + 0.5).rounded(.down)) }

    /// xp = xpFor(kind, args). Every argument is optional, exactly like the JS `r = {}` object.
    public static func xp(_ kind: String, right: Int = 0, total: Int = 0, mode: String? = nil, hard hardQ: Bool = false, hints: Int = 0,
                          score: Double? = nil, paid: Bool = false, words: Double = 0, sections: Int = 0, isNew: Bool = false, again: Bool = false) -> Int {
        let n = Swift.max(0, right), per = perAnswer(mode), h = Swift.min(hints, n)
        let full = total >= 3 && n >= total ? perfect : 0
        let x: Int
        switch kind {
        case "answer": x = per + (hardQ ? hard : 0)
        case "say":
            if let sc = score { x = sc >= Double(great) ? 5 : sc >= Double(pass) ? 3 : 0 } else { x = say }
        case "card": x = card[again ? 0 : isNew ? 2 : 1]
        case "talk": x = Swift.max(min, talk + say * n - h)
        case "essay": x = essay
        case "learn": x = learn
        case "output": x = Swift.min(60, jsRound(words / 5))
        case "exam": x = exam + per * n + sec * sections + full
        case "set", "game": x = Swift.max(min, set + (paid ? 0 : per * n) + full - h)
        default: x = step
        }
        return Swift.min(kind == "game" ? game : cap, Swift.max(0, x))
    }

    /// XP for the count-th completion of the same src on one local day.
    public static func repCut(xp x: Int, count c: Int) -> Int {
        c >= 5 ? Swift.min(x, step) : c >= 3 ? jsRound(Double(x) / 2) : x
    }

    /// Per-day, per-device anti-repeat ledger (web key "xprep" = {k: day, m: {src: count}}, not synced).
    public struct RepeatLedger: Codable, Equatable, Sendable {
        public var k = "", m: [String: Int] = [:]
        public init() {}
        /// Counts one completion of `src` on `day` (a new day starts a fresh ledger) and returns the XP after repCut.
        public mutating func cut(xp: Int, src: String, day: String) -> Int {
            if k != day { k = day; m = [:] }
            let c = (m[src] ?? 0) + 1
            m[src] = c
            return RewardRules.repCut(xp: xp, count: c)
        }
    }
}
