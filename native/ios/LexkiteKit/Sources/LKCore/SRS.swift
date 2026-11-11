import Foundation

/// FSRS-5 scheduler – a port of web/js/core.js SRS.review. Constants and behaviour are verified against
/// native/shared/gen/vectors/scoring.json (generated from the JS reference) in LKCoreTests; never tune here.
public struct SRSCard: Codable, Equatable, Sendable {
    public var ef = 2.5, interval = 0, reps = 0, lapses = 0, step = 0
    public var due: Int64, last: Int64? = nil
    public var S: Double? = nil, D: Double? = nil
    public init(due: Int64) { self.due = due }
}

public struct SRSParams: Codable, Sendable {
    public var W: [Double], DECAY: Double, FACTOR: Double, MAX_IVL: Int, retentionTarget: Double, dayRolloverHour: Int
    public static let fsrs5 = SRSParams(
        W: [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621],
        DECAY: -0.5, FACTOR: 19.0 / 81.0, MAX_IVL: 3650, retentionTarget: 0.9, dayRolloverHour: 4)
}

public struct SRS: Sendable {
    public let p: SRSParams
    public var calendar: Calendar
    static let MIN: Int64 = 60_000, DAY: Int64 = 86_400_000
    public init(params: SRSParams = .fsrs5, calendar: Calendar = .current) { p = params; self.calendar = calendar }

    func clampD(_ d: Double) -> Double { min(10, max(1, d)) }
    func R(_ t: Double, _ S: Double) -> Double { pow(1 + p.FACTOR * t / S, p.DECAY) }
    func ivl(_ S: Double, _ r: Double) -> Double { S / p.FACTOR * (pow(r, 1 / p.DECAY) - 1) }
    func D0(_ G: Int) -> Double { clampD(p.W[4] - exp(p.W[5] * Double(G - 1)) + 1) }
    func nextD(_ D: Double, _ G: Int) -> Double { let d1 = D + (-p.W[6] * Double(G - 3)) * (10 - D) / 9; return clampD(p.W[7] * D0(4) + (1 - p.W[7]) * d1) }
    func recallS(_ D: Double, _ S: Double, _ R: Double, _ G: Int) -> Double {
        S * (exp(p.W[8]) * (11 - D) * pow(S, -p.W[9]) * (exp(p.W[10] * (1 - R)) - 1) * (G == 2 ? p.W[15] : 1) * (G == 4 ? p.W[16] : 1) + 1)
    }
    func forgetS(_ D: Double, _ S: Double, _ R: Double) -> Double { min(S, p.W[11] * pow(D, -p.W[12]) * (pow(S + 1, p.W[13]) - 1) * exp(p.W[14] * (1 - R))) }
    func shortS(_ S: Double, _ G: Int) -> Double { S * exp(p.W[17] * (Double(G) - 3 + p.W[18])) }
    /// JS Math.round (half up, also for negatives)
    static func jsRound(_ x: Double) -> Double { (x + 0.5).rounded(.down) }

    /// grade: 0 Again · 1 Hard · 2 Good · 3 Easy. `now` in ms since epoch. No fuzz (fuzz is a UI-side nicety applied separately).
    public func review(_ card: SRSCard, grade: Int, now: Int64) -> SRSCard {
        var s = card
        if s.S == nil || s.D == nil, s.reps > 0 { s.S = max(0.5, Double(s.interval == 0 ? 1 : s.interval)); s.D = clampD(10 - (s.ef - 1.3) * 5) }
        let G = grade + 1, r = p.retentionTarget
        func toDay(_ days: Int) {
            s.interval = min(p.MAX_IVL, max(1, days))
            var c = calendar.dateComponents(in: calendar.timeZone, from: Date(timeIntervalSince1970: Double(now) / 1000))
            c.hour = p.dayRolloverHour; c.minute = 0; c.second = 0; c.nanosecond = 0
            let base = Int64((calendar.date(from: c)!.timeIntervalSince1970 * 1000).rounded())
            s.due = base + Int64(s.interval) * Self.DAY
        }
        if s.reps == 0 {
            if s.S == nil { s.S = p.W[G - 1]; s.D = D0(G) }
            else if s.last != nil { s.S = max(0.1, shortS(s.S!, G)); s.D = nextD(s.D!, G) }
            if grade == 0 { s.step = 0; s.due = now + Self.MIN }
            else if grade == 1 { s.due = now + (s.step == 0 ? 6 : 10) * Self.MIN }
            else if grade == 2 && s.step == 0 { s.step = 1; s.due = now + 10 * Self.MIN }
            else { s.reps = 1; s.step = 0; toDay(max(grade == 3 ? 2 : 1, Int(Self.jsRound(ivl(s.S!, r))))) }
        } else if grade == 0 {
            let t = max(0, Double(now - (s.last ?? now)) / Double(Self.DAY))
            s.S = max(0.1, forgetS(s.D!, s.S!, R(t, s.S!))); s.D = nextD(s.D!, G)
            s.lapses += 1; s.reps = 0; s.step = 0; s.interval = 0; s.due = now + Self.MIN
        } else {
            let t = max(0, Double(now - (s.last ?? now)) / Double(Self.DAY)), Rn = R(t, s.S!)
            var out: [Int: (S: Double, ivl: Int)] = [:]
            for g in [2, 3, 4] { let S = recallS(s.D!, s.S!, Rn, g); out[g] = (S, min(p.MAX_IVL, max(1, Int(Self.jsRound(ivl(S, r)))))) }
            out[2]!.ivl = min(out[2]!.ivl, out[3]!.ivl)
            out[3]!.ivl = max(out[3]!.ivl, out[2]!.ivl + 1)
            out[4]!.ivl = max(out[4]!.ivl, out[3]!.ivl + 1)
            s.S = out[G]!.S; s.D = nextD(s.D!, G); toDay(out[G]!.ivl); s.reps += 1
        }
        s.S = Self.jsRound(s.S! * 1000) / 1000; s.D = Self.jsRound(s.D! * 1000) / 1000
        s.last = now
        return s
    }
}

// MARK: scheduling helpers shared by review / deck / practice (ports of web/js/core.js SRS.retention / level5 / mastery / preview)
public enum SRSPreview: Equatable, Sendable {
    case minutes(Int), oneDay, days(Int), months(Int), years(Double)
}

extension SRSCard {
    /// JS `!s.last` – a missing, null or zero last-review time all mean "never reviewed"
    public var hasLast: Bool { (last ?? 0) != 0 }
}

extension SRS {
    /// Probability of recall now (forgetting curve); nil when the card was never reviewed.
    public func retention(_ s: SRSCard, now: Int64) -> Double? {
        guard s.hasLast, let last = s.last else { return nil }
        if s.reps == 0 { return max(0.3, pow(0.9, Double(now - last) / Double(10 * Self.MIN))) }
        let t = max(0, Double(now - last) / Double(Self.DAY))
        if let S = s.S { return R(t, S) }
        return pow(0.9, t / Double(max(1, s.interval)))
    }
    /// A card is "forgetting" when reps > 0 and retention < min(0.85, target − 0.05) (web App.forgetting).
    public func isForgetting(_ s: SRSCard, now: Int64) -> Bool {
        guard s.reps > 0, let r = retention(s, now: now) else { return false }
        return r < min(0.85, p.retentionTarget - 0.05)
    }
    /// 0 never learned · 1 < 1 day · 2 ≤ 3 days · 3 ≤ 10 · 4 ≤ 30 · 5 longer
    public static func level5(_ s: SRSCard) -> Int {
        if !s.hasLast { return 0 }
        if s.reps == 0 { return 1 }
        return s.interval <= 3 ? 2 : s.interval <= 10 ? 3 : s.interval <= 30 ? 4 : 5
    }
    /// 0 new · 1 learning · 2 known · 3 mastered
    public static func mastery(_ s: SRSCard) -> Int {
        if s.reps == 0 { return s.hasLast ? 1 : 0 }
        if s.interval >= 21 { return 3 }
        if s.interval >= 4 { return 2 }
        return 1
    }
    /// The next-interval label under the grade buttons (no fuzz).
    public func preview(_ s: SRSCard, grade: Int, now: Int64) -> SRSPreview {
        if s.reps == 0 {
            if grade == 0 { return .minutes(1) }
            if grade == 1 { return .minutes(s.step == 0 ? 6 : 10) }
            if grade == 2 && !(s.step > 0) { return .minutes(10) }
        } else if grade == 0 { return .minutes(1) }
        let n = review(s, grade: grade, now: now)
        let d = Int(Self.jsRound(Double(n.due - now) / Double(Self.DAY)))
        if d <= 1 { return .oneDay }
        if d < 30 { return .days(d) }
        if d < 365 { return .months(Int(Self.jsRound(Double(d) / 30))) }
        return .years(Double(d) / 365)
    }
}
