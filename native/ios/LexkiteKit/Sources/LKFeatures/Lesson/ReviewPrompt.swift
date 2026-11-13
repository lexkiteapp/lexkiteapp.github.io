import Foundation

/// In-app rating prompt policy (native/shared/review-prompt.json – the constants below are checked against it by scripts/test/rate-prompt.mjs).
/// Happy moment = lesson-complete screen with accuracy ≥ 80. Never in the first days, never after a weak lesson, ≥ 90 days apart, ≤ 3 times in total.
/// The system decides whether the dialog really shows (Apple caps it); there is no custom "rate us" gate and nothing is rewarded for a rating.
public enum ReviewPolicy {
    public static let minAccuracy = 80
    public static let minLessons = 5
    public static let minDaysSinceInstall = 3.0
    public static let gapDays = 90.0
    public static let maxAsks = 3
    private static let day: TimeInterval = 86_400

    public static func shouldAsk(accuracy: Int, lessons: Int, now: Date, firstUse: Date, lastAsk: Date?, asks: Int) -> Bool {
        guard accuracy >= minAccuracy, lessons >= minLessons, asks < maxAsks else { return false }
        guard now.timeIntervalSince(firstUse) >= minDaysSinceInstall * day else { return false }
        if let last = lastAsk, now.timeIntervalSince(last) < gapDays * day { return false }
        return true
    }
}

/// Counters kept on the device only (UserDefaults): finished lessons, first-use date, last ask, number of asks.
public struct ReviewLedger {
    private let d: UserDefaults
    public init(_ d: UserDefaults = .standard) { self.d = d }

    /// Call once per finished lesson. Returns true when the system review prompt should be requested now (and records the ask).
    public func lessonFinished(accuracy: Int, now: Date = Date()) -> Bool {
        let lessons = d.integer(forKey: "lk.rate.lessons") + 1
        d.set(lessons, forKey: "lk.rate.lessons")
        if d.object(forKey: "lk.rate.first") == nil { d.set(now, forKey: "lk.rate.first") }
        let first = (d.object(forKey: "lk.rate.first") as? Date) ?? now
        let ask = ReviewPolicy.shouldAsk(accuracy: accuracy, lessons: lessons, now: now, firstUse: first, lastAsk: d.object(forKey: "lk.rate.last") as? Date, asks: d.integer(forKey: "lk.rate.asks"))
        if ask { d.set(now, forKey: "lk.rate.last"); d.set(d.integer(forKey: "lk.rate.asks") + 1, forKey: "lk.rate.asks") }
        return ask
    }
}
