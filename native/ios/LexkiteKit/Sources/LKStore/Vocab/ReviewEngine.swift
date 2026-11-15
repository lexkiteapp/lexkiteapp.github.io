import Foundation
import LKSync
import LKCore

/// #/review – port of web/js/study.js (buildQueue, routes.review, grade, undo, reviewDone) and web/js/study-modes.js.
public enum ReviewStart: String, Equatable, Sendable { case empty, redirectForgetting, allDone, card }

public struct ReviewReward: Equatable, Sendable { public var reviews = 1, newWords = 0, again = 0, xp = 0 }

public struct ReviewSession: Sendable {
    public var queue: [String]
    public var done = 0, again = 0, xp = 0, total = 0
    public var missed: [String] = []
    public var g = [0, 0, 0, 0]
    public var startedAt: Int64
    public var reverse = false
    struct Snapshot: Sendable { var key: String; var srs: JSON; var queue: [String]; var done: Int; var again: Int; var missed: [String]; var wasNew: Bool; var g: Int; var xp: Int }
    var last: Snapshot?
    /// the grade just given can still be undone (key Z) – once, only the latest
    public var canUndo: Bool { last != nil }
    public init(queue: [String], startedAt: Int64) { self.queue = queue; total = queue.count; self.startedAt = startedAt }
}

/// What undo took back, so the caller can reverse the game counters (`ReviewEngine.undoGame`).
public struct ReviewUndo: Equatable, Sendable { public var xp: Int, wasNew: Bool }

public struct ReviewSummary: Equatable, Sendable {
    public var done = 0, xp = 0, accuracy = 0, streak = 0, minutes = 0
    /// "win" (≥90 % or nothing to do) · "happy" (≥60 %) · "cheer"
    public var mood = "cheer"
    public var hitGoal = false
    public var gradeMix = [0, 0, 0, 0]
    /// hardest missed word (highest lapses; ties → first) and the other missed words
    public var hardest: String?
    public var others: [String] = []
    /// cards due per day for the next 7 days after today (index 0 = tomorrow)
    public var forecast = [Int](repeating: 0, count: 7)
    public var nextDue: Int64?
    /// cards due in the next 2 days ("Ôn trước")
    public var soon = 0
    public var canBrag = false
    public init() {}
}

/// Cards + stats + session of one #/review visit. Pure: persist `cards`/`stats` after each call; add `ReviewReward` to the game (App.reward).
public struct ReviewState: Sendable {
    public private(set) var cards: [String: JSON]
    public private(set) var order: [String]
    public var stats: JSON
    public var session: ReviewSession
    public let clock: VocabClock

    public init(cards list: [JSON], stats: JSON, session: ReviewSession, clock: VocabClock) {
        var m: [String: JSON] = [:], o: [String] = []
        for c in list { let k = Vocab.cardKey(c); if m[k] == nil { o.append(k) }; m[k] = c }
        cards = m; order = o; self.stats = stats; self.session = session; self.clock = clock
    }
    public var cardList: [JSON] { order.compactMap { cards[$0] } }
    /// the card on top; unknown keys are dropped like web showCard()
    public mutating func current() -> JSON? {
        while let k = session.queue.first {
            if let c = cards[k] { return c }
            session.queue.removeFirst()
        }
        return nil
    }

    /// grade 0 Again · 1 Hard · 2 Good · 3 Easy. nil when there is no card on top.
    @discardableResult
    public mutating func grade(_ g: Int, now: Int64) -> ReviewReward? {
        guard let c0 = current(), let key = session.queue.first else { return nil }
        var c = c0
        let wasNew = Vocab.isNew(c)
        let xp = g == 0 ? 2 : wasNew ? 8 : 5
        session.last = ReviewSession.Snapshot(key: key, srs: c["srs"] ?? .null, queue: session.queue, done: session.done, again: session.again, missed: session.missed, wasNew: wasNew, g: g, xp: xp)
        let next = clock.srs().review(Vocab.srs(c), grade: g, now: now)
        c["srs"] = Vocab.srsJSON(next, over: c["srs"])
        c["mod"] = .number(Double(now))
        cards[key] = c
        stats = Vocab.logReview(stats, isNew: wasNew, now: now, clock: clock)
        session.xp += xp
        session.g[g] += 1
        session.queue.removeFirst()
        session.done += 1
        if next.reps == 0 { session.queue.insert(key, at: min(session.queue.count, g == 0 ? 3 : 6)) }
        if g == 0 {
            session.again += 1
            let w = c.s("word")
            if !session.missed.contains(w) { session.missed.append(w) }
        }
        return ReviewReward(reviews: 1, newWords: wasNew ? 1 : 0, again: g == 0 ? 1 : 0, xp: xp)
    }

    /// Z: restore the last grade (schedule, queue, counters, XP, today's review count). nil when nothing to undo.
    @discardableResult
    public mutating func undo(now: Int64) -> ReviewUndo? {
        guard let L = session.last else { return nil }
        session.last = nil
        if var c = cards[L.key] { c["srs"] = L.srs; c["mod"] = .number(Double(now)); cards[L.key] = c }
        session.queue = L.queue; session.done = L.done; session.again = L.again; session.missed = L.missed
        session.xp = max(0, session.xp - L.xp)
        if session.g[L.g] > 0 { session.g[L.g] -= 1 }
        var st = stats.object ?? [:]
        let k = clock.todayKey(now)
        var days = st["days"]?.object ?? [:]
        let cur = days[k].map { JSON.orZero($0) } ?? 0
        days[k] = .number(max(0, (cur == 0 ? 1 : cur) - 1))
        st["days"] = .object(days)
        if L.wasNew, var nt = st["newToday"]?.object, nt["day"]?.string == k { nt["n"] = .number(max(0, JSON.orZero(nt["n"]) - 1)); st["newToday"] = .object(nt) }
        stats = .object(st)
        return ReviewUndo(xp: L.xp, wasNew: L.wasNew)
    }
}

public enum ReviewEngine {
    /// `?src=forgetting&ahead=N&w=word` of #/review
    public struct Query: Sendable {
        public var ahead = 0
        public var pin: String?
        public var forgetting = false
        public init(ahead: Int = 0, pin: String? = nil, forgetting: Bool = false) { self.ahead = ahead; self.pin = pin; self.forgetting = forgetting }
        public init(_ qs: String) {
            var m: [String: String] = [:]
            for part in qs.split(separator: "&") {
                let kv = part.split(separator: "=", maxSplits: 1, omittingEmptySubsequences: false)
                let k = String(kv[0]).removingPercentEncoding ?? String(kv[0])
                m[k] = kv.count > 1 ? (String(kv[1]).replacingOccurrences(of: "+", with: " ").removingPercentEncoding ?? String(kv[1])) : ""
            }
            let a = Double(m["ahead"] ?? "") ?? 0
            ahead = a.isFinite ? Int(min(7, max(0, a))) : 0
            pin = m["w"].map { $0.lowercased() }.flatMap { $0.isEmpty ? nil : $0 }
            forgetting = m["src"] == "forgetting"
        }
    }

    /// Cards.newToday – new cards for today: unseen first, then oldest added; at most dailyNew − introduced today.
    public static func newToday(_ cards: [JSON], settings: JSON, stats: JSON, seen: [String: Double], now: Int64, clock: VocabClock) -> [JSON] {
        let daily = settings["dailyNew"]?.double ?? 10
        let introduced = stats["newToday"]?["day"]?.string == clock.todayKey(now) ? JSON.orZero(stats["newToday"]?["n"]) : 0
        let pool = cards.filter { Vocab.isNew($0) }
        let n = Int(min(Double(pool.count), max(0, daily - introduced)))
        func at(_ c: JSON) -> Double { seen[c.s("word").lowercased()] ?? 0 }
        let sorted = Vocab.stableSorted(pool) { a, b in at(a) != at(b) ? at(a) < at(b) : (a.d("added") ?? 0) < (b.d("added") ?? 0) }
        return Array(sorted.prefix(n))
    }

    /// study.js buildQueue(ahead): due cards by due time, new cards spliced in at 1, 4, 7…, cut to sessionCap AFTER splicing.
    public static func buildQueue(cards: [JSON], settings: JSON, stats: JSON, seen: [String: Double] = [:], ahead: Int = 0, now: Int64, clock: VocabClock) -> [String] {
        let end = clock.endOfToday(now) + Int64(ahead) * VocabClock.day
        let due = Vocab.stableSorted(cards.filter { c in let s = Vocab.srs(c); return (s.reps > 0 || s.hasLast) && s.due <= end }) { Vocab.srs($0).due < Vocab.srs($1).due }
        let fresh = ahead > 0 ? [] : newToday(cards, settings: settings, stats: stats, seen: seen, now: now, clock: clock)
        var q = due
        for (i, c) in fresh.enumerated() { q.insert(c, at: min(q.count, i * 3 + 1)) }
        let cap = Int(JSON.orZero(settings["sessionCap"]))
        let cut = cap > 0 ? Array(q.prefix(cap)) : q
        return cut.map { $0.s("word").lowercased() }
    }

    /// routes.review: decides what the screen shows and builds the session.
    public static func open(cards: [JSON], settings: JSON, stats: JSON, seen: [String: Double] = [:], query: Query = Query(), previous: ReviewSession? = nil, now: Int64, clock: VocabClock) -> (start: ReviewStart, state: ReviewState) {
        func state(_ q: [String]) -> ReviewState {
            var s = ReviewSession(queue: q, startedAt: now)
            s.reverse = previous?.reverse ?? false
            return ReviewState(cards: cards, stats: stats, session: s, clock: clock)
        }
        if query.forgetting, cards.contains(where: { Vocab.isForgetting($0, now: now, clock: clock) }) { return (.redirectForgetting, state([])) }
        if cards.isEmpty { return (.empty, state([])) }
        var q = buildQueue(cards: cards, settings: settings, stats: stats, seen: seen, ahead: query.ahead, now: now, clock: clock)
        if let pin = query.pin, cards.contains(where: { Vocab.cardKey($0) == pin }) { q = [pin] + q.filter { $0 != pin } }
        var st = state(q)
        st.session.total = q.count
        return (q.isEmpty ? .allDone : .card, st)
    }

    /// Reverse the game counters of an undone grade (study.js undo → Game.mutate).
    public static func undoGame(_ game: JSON, undo u: ReviewUndo, now: Int64, clock: VocabClock) -> JSON {
        var gs = game.object ?? [:]
        let k = clock.todayKey(now)
        gs["xp"] = .number(max(0, JSON.orZero(gs["xp"]) - Double(u.xp)))
        var days = gs["days"]?.object ?? [:]
        if var d = days[k]?.object {
            d["xp"] = .number(max(0, JSON.orZero(d["xp"]) - Double(u.xp)))
            d["reviews"] = .number(max(0, JSON.orZero(d["reviews"]) - 1))
            if u.wasNew { d["newWords"] = .number(max(0, JSON.orZero(d["newWords"]) - 1)) }
            days[k] = .object(d)
            gs["days"] = .object(days)
        }
        if var tot = gs["total"]?.object, JSON.truthy(gs["total"]) {
            tot["reviews"] = .number(max(0, JSON.orZero(tot["reviews"]) - 1))
            if u.wasNew { tot["newWords"] = .number(max(0, JSON.orZero(tot["newWords"]) - 1)) }
            gs["total"] = .object(tot)
        }
        return .object(gs)
    }

    /// reviewDone(): the numbers behind the summary screen.
    public static func summary(_ state: ReviewState, settings: JSON, nothing: Bool, now: Int64) -> ReviewSummary {
        let clock = state.clock, ses = state.session, cards = state.cardList
        var r = ReviewSummary()
        let end = clock.endOfToday(now)
        r.done = ses.done; r.xp = ses.xp; r.gradeMix = ses.g
        r.accuracy = ses.done > 0 ? Vocab.round(Double(ses.done - ses.again) / Double(ses.done) * 100) : 0
        r.streak = Vocab.streak(state.stats, now: now, clock: clock)
        let goal = JSON.truthy(settings["dailyGoal"]) ? JSON.orZero(settings["dailyGoal"]) : 10
        r.hitGoal = JSON.orZero(state.stats["days"]?[clock.todayKey(now)]) >= goal
        r.mood = nothing || r.accuracy >= 90 ? "win" : r.accuracy >= 60 ? "happy" : "cheer"
        r.minutes = max(1, Vocab.round(Double(now - ses.startedAt) / 6e4))
        var uniq: [String] = []
        for w in ses.missed where !uniq.contains(w) { uniq.append(w) }
        if !nothing, var w = uniq.first {
            func lapses(_ x: String) -> Int { (state.cards[x.lowercased()] ?? state.cards[x]).map { Vocab.srs($0).lapses } ?? 0 }
            for x in uniq.dropFirst() where lapses(x) > lapses(w) { w = x }
            r.hardest = w; r.others = uniq.filter { $0 != w }
        }
        r.nextDue = cards.map { Vocab.srs($0).due }.filter { $0 > end }.min()
        for c in cards {
            let s = Vocab.srs(c)
            let d = Int(((Double(s.due - end)) / 864e5).rounded(.down))
            if s.hasLast, d >= 0, d < 7 { r.forecast[d] += 1 }
            if s.hasLast, s.due > end, s.due <= end + 2 * VocabClock.day { r.soon += 1 }
        }
        r.canBrag = !nothing && ((r.accuracy >= 80 && r.done >= 5) || r.hitGoal || [3, 7, 14, 30, 100].contains(r.streak))
        return r
    }
}

/// web/js/study-modes.js – which way a review card is asked, and how typing / listening map to a 0–3 grade.
public enum StudyModes {
    public static let modes = ["auto", "flip", "type", "audio"]
    public struct Options: Equatable, Sendable { public var all: [String]; public var right: Int }

    /// Levenshtein distance (UTF-16 like JS indexing)
    public static func dist(_ a: String, _ b: String) -> Int {
        let x = Array(a.utf16), y = Array(b.utf16)
        if x.isEmpty { return y.count }
        if y.isEmpty { return x.count }
        var prev = Array(0...y.count)
        for i in 1...x.count {
            var cur = [i]
            for j in 1...y.count { cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (x[i - 1] == y[j - 1] ? 0 : 1))) }
            prev = cur
        }
        return prev[y.count]
    }
    /// typing compare: strip accents, lower-case, ’‘`´ → ', - ‐ ‑ – — _ / → space, drop .,!?;:"“”(), collapse spaces
    public static func norm(_ s: String?) -> String {
        var out = String.UnicodeScalarView()
        for u in (s ?? "").decomposedStringWithCanonicalMapping.unicodeScalars where !(u.value >= 0x300 && u.value <= 0x36F) { out.append(u) }
        var t = String(out).lowercased()
        for q in ["\u{2019}", "\u{2018}", "`", "\u{B4}"] { t = t.replacingOccurrences(of: q, with: "'") }
        t = t.replacingOccurrences(of: "[-\u{2010}\u{2011}\u{2013}\u{2014}_/]+", with: " ", options: .regularExpression)
        t = t.replacingOccurrences(of: "[.,!?;:\"\u{201C}\u{201D}()]+", with: "", options: .regularExpression)
        return t.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
    static func tol(_ n: Int) -> Int { n >= 8 ? 2 : n >= 4 ? 1 : 0 }

    /// typed answer → grade. dist: typos · len: word length · hints used · ms taken · gaveUp: "I don't remember"
    public static func gradeType(dist: Int, len: Int, hints: Int, ms: Double, gaveUp: Bool) -> Int {
        if gaveUp || dist > tol(len) { return 0 }
        if dist > 0 || hints >= 2 { return 1 }
        if hints == 0 && ms < 2500 + 350 * Double(len) { return 3 }
        return 2
    }
    public static func gradeAudio(ok: Bool, replays: Int, ms: Double) -> Int {
        if !ok { return 0 }
        if replays >= 2 { return 1 }
        if replays == 0 && ms < 5000 { return 3 }
        return 2
    }

    /// Mode chosen by FSRS difficulty and lapses: hard → flip, easy → type/audio.
    public static func auto(_ c: JSON) -> String {
        let s = c["srs"]
        let D: Double = s?.d("D") ?? (JSON.truthy(s?["ef"]) ? (3 - JSON.orZero(s?["ef"])) * 6 : 5)
        let lap = s?.i("lapses") ?? 0, reps = s?.i("reps") ?? 0
        if lap >= 3 || D >= 7.5 { return "flip" }
        if reps >= 2 && D <= 5 && lap <= 1 { return reps % 3 == 1 ? "audio" : "type" }
        return "audio"
    }
    public static func canType(_ c: JSON, settings: JSON) -> Bool {
        let w = c.s("word")
        return w.utf16.count <= 30 && w.range(of: "[a-zA-Z]", options: .regularExpression) != nil && settings["typeReview"] != JSON.bool(false)
    }
    /// 3 wrong meanings: same part of speech first, then any card, then library words; duplicates (after `norm`) dropped. nil → not enough.
    public static func options(for c: JSON, cards: [JSON], library: [JSON] = [], mix: ([JSON]) -> [JSON] = { $0 }, mixAll: ([String]) -> [String] = { $0 }) -> Options? {
        let right = Vocab.meanOf(c)
        var seen: Set<String> = [norm(right)], out: [String] = []
        func take(_ list: [JSON]) {
            for x in list {
                if out.count >= 3 { break }
                let m = x.s("word") != c.s("word") ? Vocab.meanOf(x) : ""
                if !m.isEmpty && !seen.contains(norm(m)) { seen.insert(norm(m)); out.append(m) }
            }
        }
        let pos = c.s("pos")
        take(mix(cards.filter { !pos.isEmpty && $0.s("pos") == pos }))
        take(mix(cards))
        if out.count < 3 { take(mix(Array(library.prefix(400)))) }
        if out.count < 3 { return nil }
        let all = mixAll([right] + out)
        return Options(all: all, right: all.firstIndex(of: right) ?? 0)
    }
    /// flip · type · audio. new cards and the reverse direction always flip.
    public static func pick(_ c: JSON, want: String?, reverse: Bool, cards: [JSON], settings: JSON = [:], library: [JSON] = [], mix: ([JSON]) -> [JSON] = { $0 }, mixAll: ([String]) -> [String] = { $0 }) -> (mode: String, options: Options?) {
        if reverse || Vocab.isNew(c) { return ("flip", nil) }
        var m = (want != nil && want != "" && want != "auto") ? want! : auto(c)
        if m == "type" && !canType(c, settings: settings) { m = "audio" }
        var opt: Options?
        if m == "audio" { opt = options(for: c, cards: cards, library: library, mix: mix, mixAll: mixAll); if opt == nil { m = "flip" } }
        return (m, m == "audio" ? opt : nil)
    }

    /// web UI.wordRegex: the word and its inflections (recruit → recruited), phrases match whole.
    public static func wordRegex(_ word: String) -> NSRegularExpression? {
        let w = word.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        func esc(_ s: String) -> String { NSRegularExpression.escapedPattern(for: s) }
        if w.range(of: "[\\s-]", options: .regularExpression) != nil {
            let parts = w.split(whereSeparator: { $0.isWhitespace }).map(String.init)
            let f0 = parts.first ?? ""
            let first = f0.utf16.count > 3 ? esc(f0.replacingOccurrences(of: "(e|y)$", with: "", options: .regularExpression)) + "[a-z]*" : esc(f0)
            return try? NSRegularExpression(pattern: "\\b(" + ([first] + parts.dropFirst().map(esc)).joined(separator: "\\s+") + ")\\b", options: [.caseInsensitive])
        }
        let stem = w.utf16.count > 4 ? w.replacingOccurrences(of: "(e|y|s)$", with: "", options: .regularExpression) : w
        return try? NSRegularExpression(pattern: "\\b(" + esc(stem) + "[a-z]*)\\b", options: [.caseInsensitive])
    }

    /// Soft cut around the word (≤ max chars, on word boundaries, "…" at cut ends).
    public static func trim(_ text: String?, word: String, max: Int = 200) -> String {
        let s = (text ?? "").split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        let u = Array(s.utf16)
        if u.count <= max { return s }
        var at = 0
        if let re = wordRegex(word), let m = re.firstMatch(in: s, range: NSRange(location: 0, length: u.count)) { at = m.range.location }
        let wl = word.utf16.count
        var a = Swift.max(0, at - (max - wl) / 2), b = Swift.min(u.count, a + max)
        a = Swift.max(0, b - max)
        func indexOf(_ ch: UInt16, from: Int) -> Int { var i = from; while i < u.count { if u[i] == ch { return i }; i += 1 }; return -1 }
        func lastIndexOf(_ ch: UInt16, from: Int) -> Int { var i = Swift.min(from, u.count - 1); while i >= 0 { if u[i] == ch { return i }; i -= 1 }; return -1 }
        if a > 0 { let sp = indexOf(32, from: a); if sp > 0 && sp < at { a = sp + 1 } }
        if b < u.count { let sp = lastIndexOf(32, from: b); if sp > at + wl { b = sp } }
        return (a > 0 ? "…" : "") + String(utf16CodeUnits: Array(u[a..<b]), count: b - a) + (b < u.count ? "…" : "")
    }
    /// source host shown under "Câu của bạn"
    public static func host(_ s: String?) -> String {
        var t = (s ?? "").replacingOccurrences(of: "^[a-zA-Z][\\w+.-]*://", with: "", options: .regularExpression)
        t = String(t.split(omittingEmptySubsequences: false, whereSeparator: { "/?# \t\n".contains($0) }).first ?? "")
        t = t.replacingOccurrences(of: "^www\\.", with: "", options: .regularExpression)
        return String(t.prefix(60))
    }
}
