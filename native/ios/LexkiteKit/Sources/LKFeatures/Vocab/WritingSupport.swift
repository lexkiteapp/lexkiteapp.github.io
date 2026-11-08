import Foundation
import LKSync
import LKStore
import LKCore

/// Small pure helpers of the writing screens: a seedable shuffle (fixed seed in tests, time seed in the app), the Levenshtein
/// similarity of web `UI.similarity`, the lemmatiser of web `App.lemma` (phrases.js) and the XP write of `App.reward`.
struct WritingRNG {
    private var x: UInt64
    init(seed: UInt64) { x = seed == 0 ? 1 : seed & 0xFFFF_FFFF }
    static func timeSeeded() -> WritingRNG { WritingRNG(seed: UInt64(Date().timeIntervalSince1970 * 1000) % 4_294_967_291) }
    mutating func next() -> Double { x = (x &* 1_664_525 &+ 1_013_904_223) & 0xFFFF_FFFF; return Double(x) / 4_294_967_296 }
    mutating func shuffled<T>(_ a: [T]) -> [T] {
        var out = a
        var i = out.count - 1
        while i > 0 { let j = Int(next() * Double(i + 1)); out.swapAt(i, j); i -= 1 }
        return out
    }
}

enum WritingSimilarity {
    /// 0…1, letters and spaces only, case-insensitive (web `UI.similarity`)
    static func ratio(_ a0: String, _ b0: String) -> Double {
        func clean(_ s: String) -> [Character] { Array(s.lowercased().filter { ($0 >= "a" && $0 <= "z") || $0 == " " }.trimmingCharacters(in: .whitespaces)) }
        let a = clean(a0), b = clean(b0)
        if a.isEmpty && b.isEmpty { return 1 }
        var m = Array(0...b.count)
        for i in 0..<a.count {
            var cur = [i + 1]
            for j in 0..<b.count { cur.append(min(m[j + 1] + 1, cur[j] + 1, m[j] + (a[i] == b[j] ? 0 : 1))) }
            m = cur
        }
        return 1 - Double(m[b.count]) / Double(max(a.count, b.count))
    }
    /// web `norm` of phrases-model.js
    static func norm(_ x: String) -> String { WritingEngine.gapNorm(x) }
}

/// web `App.reward({xp})` for the writing screens: XP into `game.xp` and `game.days[today].xp`, written through the serial repository.
@MainActor
enum WritingReward {
    static func xp(_ n: Int, services: AppServices, now: Date = Date(), calendar: Calendar = .current) async {
        guard n > 0, let repo = services.repo else { return }
        let day = TodaySnapshot.dayKey(now, calendar)
        _ = try? await repo.mutate { doc in
            var g = doc.game ?? .object([:])
            g["xp"] = .number(JSON.orZero(g["xp"]) + Double(n))
            var days = JSON.spread(g["days"])
            var d = JSON.spread(days[day]); d["xp"] = .number(JSON.orZero(d["xp"]) + Double(n))
            days[day] = .object(d); g["days"] = .object(days)
            doc.game = g
        }
        services.localChange()
    }
    /// web dict page: one "lookups" count per word per day (game.days[today].lookups and the lifetime total when the game has it)
    static func lookup(services: AppServices, now: Date = Date(), calendar: Calendar = .current) async {
        guard let repo = services.repo else { return }
        let ms = Int64(now.timeIntervalSince1970 * 1000), clock = VocabClock(calendar: calendar)
        _ = try? await repo.mutate { doc in doc.game = StudyGame.apply(doc.game ?? StudyGame.empty, StudyDelta(counters: ["lookups": 1]), now: ms, clock: clock) }
        services.localChange()
    }
}
