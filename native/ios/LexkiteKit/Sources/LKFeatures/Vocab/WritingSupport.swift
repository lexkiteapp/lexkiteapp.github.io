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

/// web `App.lemma`: plural → singular, past / participle → infinitive, comparative → adjective. Irregular forms come from the verb tables;
/// "known word" is the set of words the exercise itself shows plus the known verbs (the web asks its whole word library).
struct WritingLemma {
    let verbs: Verbs?
    let known: Set<String>
    static let keep: Set<String> = Set("as was has is his its this thus us yes less unless across perhaps whereas always sometimes nevertheless upon bus gas status focus plus process business analysis basis crisis".split(separator: " ").map(String.init))
    static let irregularOther = ["is": "be", "are": "be", "am": "be", "was": "be", "were": "be", "been": "be", "being": "be", "has": "have", "had": "have", "having": "have", "does": "do", "did": "do", "done": "do",
                                 "better": "good", "best": "good", "worse": "bad", "worst": "bad", "further": "far", "farther": "far", "children": "child", "men": "man", "women": "woman", "feet": "foot",
                                 "teeth": "tooth"]
    private func isKnown(_ w: String) -> Bool { known.contains(w) || (verbs?.isKnown(w) ?? false) }
    func lemma(_ w: String) -> String {
        let l = w.lowercased()
        if let b = Self.irregularOther[l] { return b }
        if let v = verbs, l.range(of: "^[a-z]+$", options: .regularExpression) != nil, let r = v.resolve(l), r.s("from") == "past" || r.s("from") == "pp", r.s("base") != l, !r.t("guess") { return r.s("base") }
        if Self.keep.contains(l) || l.count < 4 || (isKnown(l) && l.range(of: "(ies|es|s|ed|ing|er|est)$", options: .regularExpression) == nil) { return l }
        func cut(_ n: Int) -> String { String(l.dropLast(n)) }
        func has(_ re: String) -> Bool { l.range(of: re, options: .regularExpression) != nil }
        func tryB(_ c: [String?]) -> String? { c.compactMap { $0 }.first { !$0.isEmpty && isKnown($0) } }
        var b: String?
        if has("ies$") { b = tryB([cut(3) + "y"]) }
        if b == nil, has("ves$") { b = tryB([cut(3) + "f", cut(3) + "fe"]) }
        if b == nil, has("(ss|x|z|ch|sh|o)es$") { b = tryB([cut(2)]) }
        if b == nil, has("[^s]s$") { b = tryB([cut(1)]) }
        if b == nil, has("ied$") { b = tryB([cut(3) + "y"]) }
        if b == nil, has("ed$") { b = tryB([cut(1), cut(2), has("(.)\\1ed$") ? cut(3) : nil]) }
        if b == nil, has("ing$") { b = tryB([cut(3), cut(3) + "e", has("(.)\\1ing$") ? cut(4) : nil]) }
        if b == nil, has("iest$") { b = tryB([cut(4) + "y"]) }
        if b == nil, has("est$") { b = tryB([cut(3), cut(2), has("(.)\\1est$") ? cut(4) : nil]) }
        if b == nil, has("ier$") { b = tryB([cut(3) + "y"]) }
        if b == nil, has("er$"), !isKnown(l) { b = tryB([cut(2), cut(1), has("(.)\\1er$") ? cut(3) : nil]) }
        return b ?? l
    }
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
}
