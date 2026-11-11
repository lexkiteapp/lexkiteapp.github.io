import Foundation
import LKSync
import LKCore

/// M3 vocabulary logic (parity P04/P05): ports of the pure parts of web/js/{core,study,study-modes,plan,app,dictionary,lex,...}.js.
/// Cards, stats and game are the sync contract's schemaless `JSON` (unknown fields round-trip untouched); every function takes `now`
/// and a `VocabClock` so results are deterministic. Verified against native/shared/gen/vectors/vocab.json (VocabVectorTests).
public struct VocabClock: Sendable {
    public var calendar: Calendar
    public init(calendar: Calendar = .current) { self.calendar = calendar }
    public static let day: Int64 = 86_400_000
    func date(_ now: Int64) -> Date { Date(timeIntervalSince1970: Double(now) / 1000) }
    /// web `todayKey()` – YYYY-MM-DD in the device zone
    public func todayKey(_ now: Int64) -> String {
        let c = calendar.dateComponents([.year, .month, .day], from: date(now))
        return String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }
    public func startOfToday(_ now: Int64) -> Int64 { Int64((calendar.startOfDay(for: date(now)).timeIntervalSince1970 * 1000).rounded()) }
    /// 23:59:59.999 local
    public func endOfToday(_ now: Int64) -> Int64 { startOfToday(now) + Self.day - 1 }
    public func hour(_ now: Int64) -> Int { calendar.component(.hour, from: date(now)) }
    public func srs() -> SRS { SRS(calendar: calendar) }
}

public extension JSON {
    /// string field or ""
    func s(_ k: String) -> String { self[k]?.string ?? "" }
    /// number field (nil when absent / not a number)
    func d(_ k: String) -> Double? { self[k]?.double }
    func i(_ k: String) -> Int { let v = JSON.orZero(self[k]); return v.isFinite && abs(v) < 9e15 ? Int(v) : 0 }
    func t(_ k: String) -> Bool { self[k]?.truthy ?? false }
    func list(_ k: String) -> [JSON] { self[k]?.array ?? [] }
    func strs(_ k: String) -> [String] { list(k).compactMap(\.string) }
    static func obj(_ pairs: [(String, JSON)]) -> JSON { .object(Dictionary(pairs, uniquingKeysWith: { _, b in b })) }
    static func strings(_ a: [String]) -> JSON { .array(a.map { .string($0) }) }
    static func int(_ n: Int) -> JSON { .number(Double(n)) }
}

public enum Vocab {
    // MARK: JS helpers
    /// JS `Array.prototype.sort` is stable; Swift's `sorted` is not guaranteed to be – tie-break by position.
    public static func stableSorted<T>(_ a: [T], _ less: (T, T) -> Bool) -> [T] {
        a.enumerated().sorted { x, y in less(x.element, y.element) ? true : (less(y.element, x.element) ? false : x.offset < y.offset) }.map(\.element)
    }
    /// JS `Math.round` for a Double → Int
    public static func round(_ x: Double) -> Int { Int((x + 0.5).rounded(.down)) }

    /// JS `s.slice(0, n)` (UTF-16 units)
    public static func prefix(_ s: String, _ n: Int) -> String { let u = Array(s.utf16); return u.count <= n ? s : String(utf16CodeUnits: Array(u.prefix(n)), count: n) }

    /// web `keyOf(w)`: lower-case, ’‘` → ', collapse whitespace, trim
    public static func keyOf(_ w: String?) -> String {
        var s = (w ?? "").lowercased()
        for c in ["\u{2019}", "\u{2018}", "`"] { s = s.replacingOccurrences(of: c, with: "'") }
        return s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
    /// web `cardKey(c)` = tlKey(word, tl)
    public static func cardKey(_ c: JSON) -> String {
        let tl = c.s("tl")
        return (!tl.isEmpty && tl != "en" ? tl + ":" : "") + keyOf(c.s("word"))
    }

    // MARK: SRS bridge (card JSON ⇄ typed SRSCard)
    public static func srs(_ card: JSON) -> SRSCard { srs(state: card["srs"]) }
    public static func srs(state j: JSON?) -> SRSCard {
        var c = SRSCard(due: j?.int64 ?? 0)
        if let d = j?["due"]?.double { c.due = Int64(d) }
        c.ef = j?.d("ef") ?? 2.5
        c.interval = j?.i("interval") ?? 0; c.reps = j?.i("reps") ?? 0; c.lapses = j?.i("lapses") ?? 0; c.step = j?.i("step") ?? 0
        c.last = j?["last"]?.double.map { Int64($0) }
        c.S = j?.d("S"); c.D = j?.d("D")
        return c
    }
    /// Merge a typed SRS state over the card's own srs object (keeps unknown keys).
    public static func srsJSON(_ c: SRSCard, over base: JSON? = nil) -> JSON {
        var o = base?.object ?? [:]
        o["ef"] = .number(c.ef); o["interval"] = .int(c.interval); o["reps"] = .int(c.reps); o["lapses"] = .int(c.lapses); o["step"] = .int(c.step)
        o["due"] = .number(Double(c.due)); o["last"] = c.last.map { .number(Double($0)) } ?? .null
        if let S = c.S { o["S"] = .number(S) }
        if let D = c.D { o["D"] = .number(D) }
        return .object(o)
    }
    /// A brand-new state (web `SRS.newState`)
    public static func newState(now: Int64) -> JSON {
        .obj([("ef", 2.5), ("interval", 0), ("reps", 0), ("lapses", 0), ("due", .number(Double(now))), ("last", .null), ("step", 0)])
    }
    /// vector view of a card's schedule: `srsView`
    public static func srsView(_ c: JSON) -> JSON {
        let s = c["srs"]
        func nn(_ k: String) -> JSON { if let v = s?[k], v != .null { return v }; return .null }
        return .obj([("reps", .int(s?.i("reps") ?? 0)), ("lapses", .int(s?.i("lapses") ?? 0)), ("step", .int(s?.i("step") ?? 0)), ("interval", .int(s?.i("interval") ?? 0)),
                     ("S", nn("S")), ("D", nn("D")), ("due", nn("due")), ("last", nn("last"))])
    }
    public static func isNew(_ c: JSON) -> Bool { let s = srs(c); return s.reps == 0 && !s.hasLast }
    static func hasHistory(_ c: JSON) -> Bool { let s = srs(c); return s.reps > 0 || s.hasLast }

    /// App.meanOf as the native build sees it for the learner's meaning language "vi": `vi || def`
    public static func meanOf(_ c: JSON?, meanLang: String = "vi") -> String {
        guard let c else { return "" }
        let vi = c.s("vi")
        return !vi.isEmpty ? vi : c.s("def")
    }

    // MARK: origin / phrases (web/js/app.js ORIGINS, origin(); phrases.js isPhrase)
    /// ids in display order
    public static let originKeys = ["youtube", "web", "reading", "dict", "library", "anki"]
    public static func origin(_ c: JSON) -> String {
        if c.t("deck") || c.s("topic") == "anki" { return "anki" }
        let ctxs = c.list("contexts")
        let ctx = ctxs.first(where: { $0.t("source") }) ?? ctxs.last
        let src = ctx?.s("source") ?? ""
        if !src.isEmpty, src.range(of: "youtube\\.com|youtu\\.be|netflix|vimeo|ted\\.com", options: .regularExpression) != nil { return "youtube" }
        if !src.isEmpty, src.range(of: "^https?:", options: .regularExpression) != nil { return "web" }
        if let ctx, ctx.s("title").hasPrefix("Bài đọc") { return "reading" }
        if c.s("topic") == "mine" || !c.t("topic") { return "dict" }
        return "library"
    }
    public static func isPhrase(_ c: JSON) -> Bool {
        c.s("word").trimmingCharacters(in: .whitespacesAndNewlines).contains(where: { $0.isWhitespace }) || c.s("pos") == "phrase" || c.s("topic") == "phrases"
    }
    public static func isForgetting(_ c: JSON, now: Int64, clock: VocabClock) -> Bool { clock.srs().isForgetting(srs(c), now: now) }
    public static func retention(_ c: JSON, now: Int64, clock: VocabClock) -> Double? { clock.srs().retention(srs(c), now: now) }
    public static func mastery(_ c: JSON) -> Int { SRS.mastery(srs(c)) }

    // MARK: stats (web Stats.logReview)
    /// Returns the new stats object after one review. `isNew`: the card was new.
    public static func logReview(_ stats: JSON, isNew: Bool, now: Int64, clock: VocabClock) -> JSON {
        var s = stats.object ?? [:]
        let k = clock.todayKey(now)
        var days = s["days"]?.object ?? [:]
        days[k] = .number(JSON.orZero(days[k]) + 1)
        var hours = s["hours"]?.array?.count == 24 ? s["hours"]!.array! : [JSON](repeating: .number(0), count: 24)
        let h = clock.hour(now)
        hours[h] = .number(JSON.orZero(hours[h]) + 1)
        if hours.reduce(0, { $0 + JSON.orZero($1) }) > 600 { hours = hours.map { .number(Double(Int(JSON.orZero($0)) >> 1)) } }
        s["hours"] = .array(hours)
        let ks = days.keys.sorted()
        if ks.count > 400 { for x in ks.prefix(ks.count - 400) { days[x] = nil } }
        s["days"] = .object(days)
        if isNew {
            var nt = s["newToday"]?.object ?? [:]
            if (nt["day"]?.string ?? "") != k { nt = ["day": .string(k), "n": 0] }
            nt["n"] = .number(JSON.orZero(nt["n"]) + 1)
            s["newToday"] = .object(nt)
        }
        return .object(s)
    }
    /// consecutive days with reviews ending today (or yesterday when today has none)
    public static func streak(_ stats: JSON, now: Int64, clock: VocabClock) -> Int {
        let days = stats["days"]?.object ?? [:]
        var n = 0, t = now
        if !(days[clock.todayKey(t)]?.truthy ?? false) { t -= VocabClock.day }
        while days[clock.todayKey(t)]?.truthy ?? false { n += 1; t -= VocabClock.day }
        return n
    }
}
