import Foundation
import LKSync

/// Entry test (#/placement, part of P10) – the pure parts of web/js/placement.js: 3-parameter-light IRT (difficulty = CEFR level, guess = 1/options, weak prior),
/// EAP posterior on a −2…5 grid, band RANGE (≈ 68 %), CEFR, adaptive next level, the `settings.placement` record, and the bundled question bank (Resources/placement-bank.json).
/// Verified against native/shared/gen/vectors/placement.json (PlacementVectorTests.testPlacementParity). Spec: docs/specs/upgrade-2026-11.md #7.

/// One answered question: kind = vocab | grammar, r = right | wrong | idk, c = chance of a lucky guess (nil = 0.25 like the web).
public struct PlaceResp: Equatable, Sendable {
    public var kind: String, lv: String, r: String
    public var c: Double?
    public init(kind: String, lv: String, r: String, c: Double? = nil) { self.kind = kind; self.lv = lv; self.r = r; self.c = c }
}
public struct PlacePost: Equatable, Sendable { public var theta: Double, se: Double }
public struct PlaceSkill: Equatable, Sendable { public var band: Double, theta: Double; public var cefr: String }
/// web `Placement.estimate`: band strings like "6.5"; `range` = "6.0–7.0" or one band when the interval collapses.
public struct PlaceEstimate: Equatable, Sendable {
    public var band: String, lo: String, hi: String, range: String
    public var theta: Double, se: Double
    public var vocab: PlaceSkill, grammar: PlaceSkill
    public var weak: String, stage: String
    public var n: Int, right: Int, idk: Int
}

public struct PlaceVocab: Codable, Hashable, Sendable { public var id: String, lv: String, w: String, pos: String, vi: String, def: String }
public struct PlaceGrammar: Codable, Hashable, Sendable { public var id: String, lv: String, q: String, options: [String], answer: Int }

/// content-pack/placement-bank.json: 90 vocabulary + 50 grammar items per level A2…C1.
public struct PlaceBank: Codable, Sendable {
    public var n: Int
    public var ladder: [String]
    public var vocab: [PlaceVocab]
    public var grammar: [PlaceGrammar]
    public static let shared: PlaceBank = {
        guard let url = Bundle.module.url(forResource: "placement-bank", withExtension: "json"), let d = try? Data(contentsOf: url), let b = try? decode(d) else { return PlaceBank(n: Placement.N, ladder: Placement.ladder, vocab: [], grammar: []) }
        return b
    }()
    public static func decode(_ d: Data) throws -> PlaceBank { try JSONDecoder().decode(PlaceBank.self, from: d) }
}

/// A question as shown: `text` = the word (vocab) or the sentence with a gap (grammar); `c` = chance of a lucky guess = 1 / options.
public struct PlaceQuestion: Equatable, Sendable {
    public var id: String, kind: String, lv: String, text: String
    public var options: [String]
    public var correct: Int
    public var c: Double { 1.0 / Double(options.count) }
    public var isVocab: Bool { kind == "vocab" }
}

public enum Placement {
    public static let A = 1.7, MU = 1.5, SD = 1.2
    public static let N = 20
    public static let ladder = ["A2", "B1", "B2", "C1"]
    private static let B: [String: Double] = ["A1": -0.7, "A2": 0, "B1": 1, "B2": 2, "C1": 3, "C2": 3.7]

    private static func sig(_ x: Double) -> Double { 1 / (1 + exp(-x)) }
    /// JS `Math.round` (halves go up)
    private static func jsRound(_ x: Double) -> Double { (x + 0.5).rounded(.down) }
    /// JS `Number.prototype.toFixed(2)` read back as a number
    private static func fix2(_ x: Double) -> Double { (x < 0 ? -1 : 1) * ((abs(x) * 100).rounded(.toNearestOrAwayFromZero) / 100) }
    private static func f1(_ b: Double) -> String { String(format: "%.1f", locale: Locale(identifier: "en_US_POSIX"), b) }

    public static func posterior(_ resp: [PlaceResp]) -> PlacePost {
        var ths = [Double](repeating: 0, count: 351), ls = [Double](repeating: 0, count: 351), mx = -Double.infinity
        for k in 0...350 {
            let th = -2 + Double(k) * 0.02
            var l = -((th - MU) * (th - MU)) / (2 * SD * SD)
            for r in resp {
                let p = sig(A * (th - (B[r.lv] ?? 1))), c = r.c ?? 0.25
                l += log(r.r == "right" ? c + (1 - c) * p : r.r == "wrong" ? (1 - c) * (1 - p) : 1 - p)
            }
            ths[k] = th; ls[k] = l; if l > mx { mx = l }
        }
        var sw = 0.0, s1 = 0.0, s2 = 0.0
        for k in 0...350 { let w = exp(ls[k] - mx); sw += w; s1 += w * ths[k]; s2 += w * ths[k] * ths[k] }
        let m = s1 / sw
        return PlacePost(theta: m, se: max(0, s2 / sw - m * m).squareRoot())
    }

    /// θ = 1 ↔ 50 % of B1 right. CEFR ↔ IELTS (Cambridge): B1 ≈ 4.0–5.0, B2 ≈ 5.5–6.5, C1 ≈ 7.0–8.0
    public static func bandOf(_ th: Double) -> Double { min(8.5, max(3, jsRound((2.25 + 1.5 * th) * 2) / 2)) }
    public static func cefrOf(_ b: Double) -> String { b < 4 ? "A2" : b < 5.5 ? "B1" : b < 7 ? "B2" : b < 8.5 ? "C1" : "C2" }
    public static func stageOf(_ b: Double) -> String { b <= 5 ? "s0" : b <= 6 ? "s1" : b <= 6.5 ? "s2" : "s3" }

    public static func estimate(_ resp: [PlaceResp]) -> PlaceEstimate {
        let all = posterior(resp), v = posterior(resp.filter { $0.kind == "vocab" }), gr = posterior(resp.filter { $0.kind == "grammar" })
        let band = bandOf(all.theta), lo = min(band, bandOf(all.theta - all.se)), hi = max(band, bandOf(all.theta + all.se))
        func skill(_ p: PlacePost) -> PlaceSkill { let b = bandOf(p.theta); return PlaceSkill(band: b, theta: fix2(p.theta), cefr: cefrOf(b)) }
        return PlaceEstimate(band: f1(band), lo: f1(lo), hi: f1(hi), range: lo == hi ? f1(band) : "\(f1(lo))–\(f1(hi))", theta: fix2(all.theta), se: fix2(all.se),
                             vocab: skill(v), grammar: skill(gr), weak: v.theta <= gr.theta ? "vocab" : "grammar", stage: stageOf(band), n: resp.count,
                             right: resp.filter { $0.r == "right" }.count, idk: resp.filter { $0.r == "idk" }.count)
    }

    /// the level of the next question: a little below the current estimate (stable over 20 questions, starts at B1)
    public static func nextLevel(_ resp: [PlaceResp]) -> String { ladder[min(ladder.count - 1, max(0, Int(jsRound(posterior(resp).theta - 0.2))))] }

    /// one unused item of the level nearest to `level` (the level itself, then below, then above, widening); `rnd` is called once
    public static func take<T>(_ pool: [T], _ level: String, used: inout Set<String>, rnd: () -> Double, lv lvOf: (T) -> String, id idOf: (T) -> String) -> T? {
        let want = ladder.firstIndex(of: level) ?? -1
        for d in 0..<ladder.count {
            for s in (d != 0 ? [-1, 1] : [0]) {
                let i = want + d * s
                guard ladder.indices.contains(i) else { continue }
                let c = pool.filter { lvOf($0) == ladder[i] && !used.contains(idOf($0)) }
                if !c.isEmpty { let x = c[min(c.count - 1, Int((rnd() * Double(c.count)).rounded(.down)))]; used.insert(idOf(x)); return x }
            }
        }
        return nil
    }

    /// what the web writes to `settings.placement` when the test ends (synced; the day plan and the path read it)
    public static func record(_ e: PlaceEstimate, now: Int64) -> JSON {
        .obj([("v", .int(2)), ("band", .string(e.band)), ("lo", .string(e.lo)), ("hi", .string(e.hi)), ("vocab", .number(e.vocab.band)), ("grammar", .number(e.grammar.band)),
              ("vCefr", .string(e.vocab.cefr)), ("gCefr", .string(e.grammar.cefr)), ("weak", .string(e.weak)), ("stage", .string(e.stage)), ("n", .int(e.n)), ("idk", .int(e.idk)),
              ("se", .number(e.se)), ("pct", .int(Int(jsRound(Double(e.right) / Double(max(1, e.n)) * 100)))), ("at", .number(Double(now)))])
    }

    /// x = x*1664525 + 1013904223 mod 2^32, value = x / 2^32 (the generator of the vector scenarios; also a cheap shuffle source)
    public static func lcg(_ seed: UInt32) -> () -> Double {
        var x = seed
        return { x = x &* 1664525 &+ 1013904223; return Double(x) / 4294967296.0 }
    }
}

/// The ask() loop of the route: 20 questions alternating vocabulary / grammar (even index = vocabulary), the level of each from the estimate of THAT kind;
/// "I don't know" = `answer(-1)` (counts as not knowing, no guess). `rnd` only picks the item (so scenarios replay); `seed` shuffles the options.
/// `meaningVi` = show the Vietnamese meaning (UI language vi), else the English definition.
public final class PlaceSession {
    public let bank: PlaceBank
    private let rnd: () -> Double
    private let seed: UInt64
    private let meaningVi: Bool
    private var used = Set<String>()
    public private(set) var resp: [PlaceResp] = []
    public private(set) var current: PlaceQuestion?
    public var n: Int { bank.n }

    public init(bank: PlaceBank, rnd: @escaping () -> Double, seed: UInt64, meaningVi: Bool) { self.bank = bank; self.rnd = rnd; self.seed = seed; self.meaningVi = meaningVi }

    private func mean(_ w: PlaceVocab) -> String { meaningVi ? (w.vi.isEmpty ? w.def : w.vi) : (w.def.isEmpty ? w.vi : w.def) }

    /// the next question, or nil when the test is over (n answered, or the bank ran dry)
    @discardableResult public func next() -> PlaceQuestion? {
        current = nil
        if resp.count >= bank.n { return nil }
        let kind = bank.grammar.isEmpty ? "vocab" : bank.vocab.isEmpty ? "grammar" : resp.count % 2 == 1 ? "grammar" : "vocab"
        let want = Placement.nextLevel(resp.filter { $0.kind == kind })
        let q: PlaceQuestion?
        if kind == "vocab" { q = Placement.take(bank.vocab, want, used: &used, rnd: rnd, lv: { $0.lv }, id: { $0.id }).map(vocabQuestion) }
        else { q = Placement.take(bank.grammar, want, used: &used, rnd: rnd, lv: { $0.lv }, id: { $0.id }).map { PlaceQuestion(id: $0.id, kind: "grammar", lv: $0.lv, text: $0.q, options: $0.options, correct: $0.answer) } }
        current = q
        return q
    }

    /// `k` = the option index, -1 = "I don't know"; ignored when no question is open
    public func answer(_ k: Int) {
        guard let q = current else { return }
        current = nil
        resp.append(PlaceResp(kind: q.kind, lv: q.lv, r: k < 0 ? "idk" : k == q.correct ? "right" : "wrong", c: q.c))
    }

    private func vocabQuestion(_ w: PlaceVocab) -> PlaceQuestion {
        let own = mean(w), rng = Placement.lcg(UInt32(truncatingIfNeeded: seed &+ UInt64(resp.count) &* 7919 &+ 1))
        let lvIdx: (String) -> Int = { Placement.ladder.firstIndex(of: $0) ?? -1 }
        // distractors: same part of speech, nearest level and similar length first; never the same meaning
        var ranked: [(x: PlaceVocab, score: Double, i: Int)] = []
        for (i, x) in bank.vocab.enumerated() where x.id != w.id && !mean(x).isEmpty && mean(x) != own {
            ranked.append((x, (x.pos == w.pos ? 0 : 100) + Double(abs(lvIdx(x.lv) - lvIdx(w.lv))) * 10 + Double(abs(mean(x).count - own.count)) / 8 + rng(), i))
        }
        ranked.sort { $0.score != $1.score ? $0.score < $1.score : $0.i < $1.i }
        var picks: [PlaceVocab] = [], seen: Set<String> = []
        for r in ranked { if picks.count >= 3 { break }; if seen.insert(mean(r.x)).inserted { picks.append(r.x) } }
        var all = [w] + picks
        if all.count > 1 { for i in stride(from: all.count - 1, through: 1, by: -1) { let j = min(i, Int((rng() * Double(i + 1)).rounded(.down))); all.swapAt(i, j) } }
        return PlaceQuestion(id: w.id, kind: "vocab", lv: w.lv, text: w.w, options: all.map(mean), correct: all.firstIndex(of: w) ?? 0)
    }
}
