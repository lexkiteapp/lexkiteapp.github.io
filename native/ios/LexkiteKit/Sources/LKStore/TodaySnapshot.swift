import Foundation
import LKSync

/// The learner numbers the Today screen shows, computed from local data with the web definitions:
/// `Cards.dueCount` (core.js), `activeDays` / `streak` (app.js), `homeBase` (ux1.js: goal ring, XP, 7-day strip, target).
public struct TodaySnapshot: Sendable, Equatable {
    public struct Day: Sendable, Equatable { public enum State: Sendable { case done, now, off }; public let key: String; public let date: Date; public let active: Bool; public let state: State }

    public var due = 0, newCount = 0
    /// `dueCount().total` – what Today calls "words to review"
    public var total: Int { due + newCount }
    public var reviewsToday = 0, dailyGoal = 20
    public var streak = 0
    public var xp = 0, xpToday = 0
    public var mistakes = 0
    /// settings.examTarget (e.g. "6.5"); empty = no goal picked yet
    public var target = ""
    public var week: [Day] = []
    public var weekDone: Int { week.filter(\.active).count }
    public var goalProgress: Double { dailyGoal > 0 ? min(1, Double(reviewsToday) / Double(dailyGoal)) : 0 }
    public var hour = 12

    public init() {}

    /// `todayKey(d)`: local calendar date YYYY-MM-DD
    public static func dayKey(_ d: Date, _ cal: Calendar) -> String {
        let c = cal.dateComponents([.year, .month, .day], from: d)
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    public static func compute(doc: SyncDoc, mistakes: Int, now: Date, calendar cal: Calendar) -> TodaySnapshot {
        var s = TodaySnapshot()
        let today = dayKey(now, cal)
        let start = cal.startOfDay(for: now)
        let end = Int64((start.timeIntervalSince1970 * 1000).rounded()) + 86_400_000 - 1   // endOfToday()
        var newAvail = 0
        for c in doc.cards.values {
            let srs = c["srs"], reps = JSON.orZero(srs?["reps"]), seen = JSON.truthy(srs?["last"])
            if (reps > 0 || seen) && JSON.num(srs?["due"]) <= Double(end) { s.due += 1 }
            if reps == 0 && !seen { newAvail += 1 }
        }
        let settings = doc.settings
        let dailyNew = JSON.truthy(settings?["dailyNew"]) ? Int(JSON.num(settings?["dailyNew"])) : 10
        let nt = doc.stats?["newToday"]
        let introduced = nt?["day"]?.string == today ? Int(JSON.orZero(nt?["n"])) : 0
        s.newCount = min(newAvail, max(0, dailyNew - introduced))
        s.reviewsToday = Int(JSON.orZero(doc.stats?["days"]?[today]))
        s.dailyGoal = JSON.truthy(settings?["dailyGoal"]) ? Int(JSON.num(settings?["dailyGoal"])) : 20
        s.xp = Int(JSON.orZero(doc.game?["xp"]))
        s.xpToday = Int(JSON.orZero(doc.game?["days"]?[today]?["xp"]))
        s.mistakes = mistakes
        s.target = settings?["examTarget"].map { $0.string ?? ($0.isNumber ? $0.jsToString : "") } ?? ""
        s.hour = cal.component(.hour, from: now)

        // activeDays(): reviewed, earned XP, or frozen (streak freeze)
        var active = Set<String>()
        for (k, v) in doc.stats?["days"]?.object ?? [:] where v.toNumber > 0 { active.insert(k) }
        for (k, v) in doc.game?["days"]?.object ?? [:] where JSON.num(v["xp"]) > 0 { active.insert(k) }
        for k in (doc.game?["frozen"]?.object ?? [:]).keys { active.insert(k) }
        var d = now
        if !active.contains(today) { d = cal.date(byAdding: .day, value: -1, to: d)! }
        while active.contains(dayKey(d, cal)) { s.streak += 1; d = cal.date(byAdding: .day, value: -1, to: d)! }

        // Monday-first week strip (homeBase)
        var noon = cal.date(bySettingHour: 12, minute: 0, second: 0, of: now) ?? now
        let wd = cal.component(.weekday, from: noon)        // 1 = Sunday
        noon = cal.date(byAdding: .day, value: -((wd + 5) % 7), to: noon)!
        s.week = (0..<7).map { i in
            let day = cal.date(byAdding: .day, value: i, to: noon)!, key = dayKey(day, cal), on = active.contains(key)
            return Day(key: key, date: day, active: on, state: key == today ? .now : on && day < now ? .done : .off)
        }
        return s
    }
}
