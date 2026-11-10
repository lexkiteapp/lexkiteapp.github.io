import Foundation
import LKSync
import LKCore
import LKStrings

/// M4 P09 part 2 – the pure parts of #/fix #/style #/quick #/confidence #/method #/grammar (web/js/fixer.js, quick.js, confidence.js, method.js, grammar.js).
/// Verified against native/shared/gen/vectors/learn.json (LearnVectorTests). Content = `learn-content.json` (bundled) and `grammar-pack.json` (download, `grammar-content.json` offline).

public extension L10n {
    /// A web source key (the Vietnamese text a web `t()` receives) in the UI language, `{name}` variables filled; unknown keys stay as they are, like the web.
    func lv(_ key: String, _ vars: [String: CustomStringConvertible] = [:]) -> String {
        var s = translate(source: key) ?? key
        for (k, v) in vars { s = s.replacingOccurrences(of: "{\(k)}", with: v.description) }
        return s
    }
    /// A `{k, v}` pair of the vectors / bundled content (`v` values are strings or numbers)
    func lvj(_ j: JSON?) -> String {
        guard let j else { return "" }
        if let s = j.string { return lv(s) }
        var vars: [String: String] = [:]
        for (k, v) in j["v"]?.object ?? [:] { vars[k] = v.string ?? v.jsToString }
        return lv(j.s("k"), vars)
    }
}

public final class LearnContent: @unchecked Sendable {
    public let json: JSON
    public let fix: FixEngine?
    public init(json: JSON) { self.json = json; fix = FixEngine(json: json["fix"]) }
    public static let shared: LearnContent = {
        guard let url = Bundle.module.url(forResource: "learn-content", withExtension: "json"), let d = try? Data(contentsOf: url), let j = try? JSON.parse(d) else { return LearnContent(json: .null) }
        return LearnContent(json: j)
    }()
    public var style: JSON { json["style"] ?? .null }
    public var conf: JSON { json["conf"] ?? .null }
    public var method: JSON { json["method"] ?? .null }
    public var units: [JSON] { conf.list("units") }
}

// MARK: - #/style
public enum StyleQuiz {
    public static let ids = ["natural", "precision", "pragmatic", "curious"]
    /// the winner of the six picks (style ids): most picks; a tie goes to the most recent pick among the leaders; none = natural
    public static func winner(_ picks: [String]) -> String {
        var score: [String: Int] = [:]
        for p in picks { score[p, default: 0] += 1 }
        let mx = score.values.max() ?? 0
        return picks.reversed().first { score[$0] == mx } ?? "natural"
    }
}

// MARK: - #/quick
public enum Quick {
    public static let limit = 15, count = 4, minPool = 3
    public static let holdRightMs = 320, holdWrongMs = 900, goodPct = 75
    public struct Result: Equatable, Sendable { public var pct: Int, xp: Int, secs: Int, good: Bool, timedOut: Bool, right: Int, total: Int }
    public static func result(right: Int, total: Int, timedOut: Bool, elapsed: Double) -> Result {
        let pct = total == 0 ? 0 : Vocab.round(Double(right) / Double(total) * 100)
        return Result(pct: pct, xp: right * 2, secs: min(limit, max(1, Vocab.round(elapsed))), good: pct >= goodPct, timedOut: timedOut, right: right, total: total)
    }
}

// MARK: - #/confidence
public enum Confidence {
    public static let levels = ["A1", "A2", "B1", "B2"]
    public static let dailySeconds = 120, pauseGapMs = 1200
    private static func rx(_ p: String, _ o: NSRegularExpression.Options = []) -> NSRegularExpression { try! NSRegularExpression(pattern: p, options: o) }
    private static func rep(_ s: String, _ re: NSRegularExpression, _ t: String) -> String { re.stringByReplacingMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length), withTemplate: t) }
    private static let reNorm = rx("[^a-z0-9' ]+"), reSpaces = rx("\\s+"), reFill = rx("\\b(um+|uh+|er+|erm|ah+|you know|i mean|like)\\b", [.caseInsensitive])
    /// `norm` of confidence.js: lower-case, ’ → ', everything but a-z 0-9 ' and space → space, collapse, trim
    public static func norm(_ s: String) -> String {
        var t = s.lowercased().replacingOccurrences(of: "\u{2019}", with: "'")
        t = rep(t, reNorm, " "); t = rep(t, reSpaces, " ")
        return t.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    public static func toks(_ s: String) -> [String] { norm(s).split(separator: " ").map(String.init).filter { !$0.isEmpty } }
    public static func fillers(_ s: String) -> Int { reFill.numberOfMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length)) }
    /// the confidence score 0–100 of one daily challenge (`scoreOf`)
    public static func score(secs: Double, wpm: Double, pausesPerMin: Double, phrases: Int, selfRating: Int?) -> Int {
        let wpmS: Double? = wpm == 0 ? nil : (wpm >= 90 && wpm <= 160) ? 100 : wpm < 90 ? max(20, Double(Vocab.round(wpm / 90 * 100))) : max(50, 100 - (wpm - 160))
        let pauseS = max(20, 100 - max(0, pausesPerMin - 2) * 12) * min(1, secs / 60)
        let flu = wpmS == nil ? pauseS : (wpmS! + pauseS) / 2
        let phr = min(100, Double(phrases) * 25), sf = (Double(selfRating ?? 3) - 1) / 4 * 100
        return Vocab.round(flu * 0.35 + phr * 0.25 + sf * 0.4)
    }
    /// every phrase of the units and the toolkit, normalised, with ≥ 2 words (the text before "…")
    public static func allPhrases(_ conf: JSON) -> [String] {
        let a = conf.list("units").flatMap { $0.list("phrases") } + conf.list("toolkit").flatMap { $0.list("phrases") }
        return a.map { norm(($0.s("say").components(separatedBy: "…").first) ?? "") }.filter { $0.split(separator: " ").count >= 2 }
    }
    /// the learned phrases found in what the learner said (distinct, in phrase order)
    public static func used(_ said: String, phrases: [String]) -> [String] {
        let ns = " " + norm(said) + " "
        var seen = Set<String>(), out: [String] = []
        for p in phrases where ns.contains(" " + p + " ") && seen.insert(p).inserted { out.append(p) }
        return out
    }
    /// consecutive days (yyyy-MM-dd) ending today, or yesterday when today has none yet
    public static func streak(_ days: [String], today: String, calendar: Calendar = Calendar(identifier: .gregorian)) -> Int {
        let set = Set(days)
        let f = DateFormatter(); f.calendar = calendar; f.dateFormat = "yyyy-MM-dd"; f.timeZone = calendar.timeZone; f.locale = Locale(identifier: "en_US_POSIX")
        guard var d = f.date(from: today) else { return 0 }
        if !set.contains(today) { d = calendar.date(byAdding: .day, value: -1, to: d) ?? d }
        var n = 0
        while set.contains(f.string(from: d)) { n += 1; d = calendar.date(byAdding: .day, value: -1, to: d) ?? d; if n > 400 { break } }
        return n
    }
    /// "fill the blank": the gap word of the phrase replaced by ___ (first whole-word match, any case)
    public static func blank(_ say: String, gap: String) -> String {
        guard let re = try? NSRegularExpression(pattern: "\\b" + NSRegularExpression.escapedPattern(for: gap) + "\\b", options: [.caseInsensitive]) else { return say }
        let ns = say as NSString
        guard let m = re.firstMatch(in: say, range: NSRange(location: 0, length: ns.length)) else { return say }
        return ns.replacingCharacters(in: m.range, with: "___")
    }
    /// shadowing feedback per word of `say`: true = heard, false = missed, nil = not a word
    public static func marks(_ say: String, heard: String) -> [(word: String, heard: Bool?)] {
        let got = Set(toks(heard))
        return say.split(whereSeparator: { $0.isWhitespace }).map { w in let n = norm(String(w)); return (String(w), n.isEmpty ? nil : got.contains(n)) }
    }
    /// unit level → the role-play level (0–2) and the three CEFR labels
    public static func rpLevel(_ level: String) -> (Int, [String]) {
        let b2 = level == "B2"
        return (b2 ? 2 : (["A1": 0, "A2": 1, "B1": 2][level] ?? 0), b2 ? ["A2", "B1", "B2"] : ["A1", "A2", "B1"])
    }
    /// the question of the day: epochDay = floor((now − tzOffset) / 864e5), index = epochDay % count
    public static func dailyIndex(now: Int64, tzOffsetMinutes: Int, count: Int) -> Int {
        guard count > 0 else { return 0 }
        let day = Int((Double(now) - Double(tzOffsetMinutes) * 60_000) / 86_400_000)
        return ((day % count) + count) % count
    }
    /// `vb.conf` = {done:{unit:{at,sh,rp}}, daily:[{d,at,score,wpm,pauses,fillers,phrases,self,secs}]}, device-only like the web's localStorage
    public static let key = "vb.conf"
    public static func load(_ d: UserDefaults = .standard) -> JSON {
        let j = d.string(forKey: key).flatMap { try? JSON.parse($0) } ?? .null
        return .obj([("done", j["done"] ?? .object([:])), ("daily", .array(j.list("daily")))])
    }
    public static func save(_ j: JSON, _ d: UserDefaults = .standard) { d.set(j.stableString, forKey: key) }
}

// MARK: - #/grammar
public struct GrammarPack: Sendable {
    public var units: [JSON] = [], chapters: [JSON] = [], index: [JSON] = []
    public var fallback: [String: Int] = [:], focus: [String: [String]] = [:]
    public var lessons: [String: JSON] = [:], check: [String: [String]] = [:], l1: [String: JSON] = [:]
    public var v = ""
    public init() {}
    public init?(text: String) {
        guard let j = try? JSON.parse(text), !j.list("index").isEmpty else { return nil }
        self.init(json: j)
    }
    public init(json j: JSON) {
        units = j.list("units"); chapters = j.list("chapters"); index = j.list("index"); v = j.s("v")
        fallback = (j["fallback"]?.object ?? [:]).mapValues { Int($0.double ?? 0) }
        focus = (j["focus"]?.object ?? [:]).mapValues { $0.array?.compactMap(\.string) ?? [] }
        for l in j.list("lessons") { lessons[l.s("id")] = l }
        check = (j["check"]?.object ?? [:]).mapValues { $0.array?.compactMap(\.string) ?? [] }
        l1 = j["l1"]?.object ?? [:]
    }
    public static func bundled() -> GrammarPack? {
        guard let url = Bundle.module.url(forResource: "grammar-content", withExtension: "json"), let d = try? Data(contentsOf: url), let j = try? JSON.parse(d) else { return nil }
        return GrammarPack(json: j)
    }
    public func entry(_ id: String) -> JSON? { index.first { $0.s("id") == id } }
    /// `chapterOf`: the chapter listing the lesson, else the chapter of its unit's fallback number, else chapter 7
    public func chapter(of id: String) -> JSON {
        if let c = chapters.first(where: { $0.strs("ids").contains(id) }) { return c }
        let unit = entry(id)?.s("unit") ?? ""
        return chapters.first { $0.i("n") == fallback[unit] } ?? (chapters.count > 6 ? chapters[6] : chapters.first ?? .null)
    }
    /// `lessonsOf`: the chapter's listed lessons, then lessons no chapter lists that fall back to it
    public func lessons(of c: JSON) -> [JSON] {
        let listed = c.strs("ids").compactMap { entry($0) }
        let extra = index.filter { x in !chapters.contains { $0.strs("ids").contains(x.s("id")) } && chapter(of: x.s("id")).i("n") == c.i("n") }
        return listed + extra
    }
    public var order: [(lesson: JSON, chapter: JSON)] { chapters.flatMap { c in lessons(of: c).map { ($0, c) } } }
    public func unit(_ id: String) -> JSON { units.first { $0.s("id") == id } ?? units.first ?? .null }
}

public enum GrammarCore {
    public static let passPct = 80
    private static func rx(_ p: String, _ o: NSRegularExpression.Options = []) -> NSRegularExpression { try! NSRegularExpression(pattern: p, options: o) }
    private static func rep(_ s: String, _ re: NSRegularExpression, _ t: String) -> String { re.stringByReplacingMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length), withTemplate: t) }
    private static let quotes = rx("[\u{2019}\u{2018}`]"), wont = rx("won't"), cant = rx("can't|can not"), nt = rx("n't\\b"), re = rx("'re\\b"), ve = rx("'ve\\b"), ll = rx("'ll\\b"), am = rx("'m\\b")
    private static let punct = rx("[.,!?;:\"\u{201C}\u{201D}()]"), ws = rx("\\s+"), thousands = rx("(\\d),(?=\\d{3}\\b)"), hyphen = rx("([a-z])-(?=[a-z])", [.caseInsensitive])
    private static let iz = rx("(\\w)iz(e|ed|es|ing|ation|ations)\\b"), pc = rx("(\\d)\\s*(?:per cent|percent)\\b"), sp = rx("\\s+%"), d1 = rx("'d\\b", [.caseInsensitive])
    private static let is1 = rx("\\b(it|he|she|that|there|what|who|where|here|this)'s\\b", [.caseInsensitive])
    /// `dnorm`: lower-case, contractions spelt out, punctuation → space, wrapped in spaces
    public static func dnorm(_ s: String) -> String {
        var t = s.lowercased()
        t = rep(t, quotes, "'"); t = rep(t, wont, "will not"); t = rep(t, cant, "cannot"); t = rep(t, nt, " not"); t = rep(t, re, " are"); t = rep(t, ve, " have"); t = rep(t, ll, " will"); t = rep(t, am, " am")
        t = rep(t, punct, " "); t = rep(t, ws, " ")
        return " " + t.trimmingCharacters(in: .whitespacesAndNewlines) + " "
    }
    /// `dnorm2`: also 2,000 = 2000, three-fold = threefold, -ize = -ise, "10 per cent" = "10%"
    public static func dnorm2(_ s: String) -> String {
        var t = dnorm(rep(rep(s, thousands, "$1"), hyphen, "$1"))
        t = rep(t, iz, "$1is$2"); t = rep(t, pc, "$1%"); t = rep(t, sp, "%")
        return t
    }
    /// 'd = would / had, 's = is / has: every reading of the learner's sentence
    static func variants(_ given: String) -> [String] {
        var out = [rep(given, quotes, "'")]
        out = out.flatMap { v -> [String] in
            guard d1.firstMatch(in: v, range: NSRange(location: 0, length: (v as NSString).length)) != nil else { return [v] }
            return [rep(v, d1, " would"), rep(v, d1, " had")]
        }
        for _ in 0..<3 {
            out = out.flatMap { v -> [String] in
                let ns = v as NSString
                guard let m = is1.firstMatch(in: v, range: NSRange(location: 0, length: ns.length)) else { return [v] }
                let whole = ns.substring(with: m.range), who = ns.substring(with: m.range(at: 1))
                func first(_ w: String) -> String { let r = ns.range(of: whole); return r.location == NSNotFound ? v : ns.replacingCharacters(in: r, with: w) }
                return [first(who + " is"), first(who + " has")]
            }
        }
        return out.map(dnorm2)
    }
    /// `matchAnswer(given, answers)`
    public static func matches(_ given: String, _ answers: [String]) -> Bool {
        let vs = variants(given)
        return answers.contains { a in let n = dnorm2(a); return vs.contains(n) || variants(a).contains { vs.contains($0) } }
    }
    /// "Thử thách tự đặt câu": the first match of the lesson's structure regex in the sentence ("" = none)
    public static func ownHit(_ sentence: String, pattern: String) -> String {
        guard let re = try? NSRegularExpression(pattern: pattern, options: [.caseInsensitive]) else { return "" }
        let ns = sentence as NSString
        guard let m = re.firstMatch(in: sentence, range: NSRange(location: 0, length: ns.length)) else { return "" }
        return ns.substring(with: m.range)
    }
    /// the reward of a graded set (quiz: 10 + 3 per right, drills: 10 + 4, mix test: 10 + 2)
    public static func quizXP(_ right: Int) -> Int { 10 + right * 3 }
    public static func drillXP(_ right: Int) -> Int { 10 + right * 4 }
    public static func mixXP(_ right: Int) -> Int { 10 + right * 2 }
    public static func pct(_ right: Int, _ total: Int) -> Int { total == 0 ? 0 : Vocab.round(Double(right) / Double(total) * 100) }
}

// MARK: - #/method
public enum StudyMethod {
    public struct Input: Sendable {
        public var now: Int64, clock: VocabClock
        public var cards: [JSON], reviewDays: JSON, game: JSON, settings: JSON
        public var essayPrompts: [String], mistakes: Int
        public var readings: [String], listening: [String], grammar: [String], prompts: [String]
        public var speakBank = 0
        public init(now: Int64, clock: VocabClock, cards: [JSON], reviewDays: JSON, game: JSON, settings: JSON, essayPrompts: [String], mistakes: Int, readings: [String], listening: [String], grammar: [String], prompts: [String]) {
            self.now = now; self.clock = clock; self.cards = cards; self.reviewDays = reviewDays; self.game = game; self.settings = settings
            self.essayPrompts = essayPrompts; self.mistakes = mistakes; self.readings = readings; self.listening = listening; self.grammar = grammar; self.prompts = prompts
        }
    }
    public struct Line: Equatable, Sendable { public var key: String, vars: [String: String] = [:] }
    public struct LoopStep: Equatable, Sendable { public var href: String, done: Bool, sub: Line }
    public struct Strand: Equatable, Sendable { public var id: String, pct: Int, weak: Bool }
    public struct Memory: Sendable {
        public var remembered: Int, learning: Int, due: Int
        let cards: [(S: Double, last: Int64)]
        let now: Int64
        /// average chance of recall after `days` more days without review
        public func at(_ days: Double) -> Double {
            guard !cards.isEmpty else { return 0 }
            return cards.reduce(0) { $0 + StudyMethod.recall(max(0, Double(now - $1.last) / 86_400_000) + days, $1.S) } / Double(cards.count)
        }
        public var any: Bool { !cards.isEmpty }
    }
    public struct Result: Sendable {
        public var loop: [LoopStep], loopDone: Int
        public var strands: [Strand], weakest: String?
        public var stage: String?, memory: Memory
        public var stats: [Line], forgetting: Int, dueNow: Int
        public var hrefs: (grammar: String, reading: String, listening: String, speak: String, write: String)
    }
    static let day: Int64 = 86_400_000
    /// FSRS retrievability R(t, S)
    public static func recall(_ t: Double, _ s: Double) -> Double { pow(1 + SRSParams.fsrs5.FACTOR * t / s, SRSParams.fsrs5.DECAY) }
    /// the interval at which retrievability falls to `keep`
    public static func interval(_ s: Double, _ keep: Double) -> Double { s / SRSParams.fsrs5.FACTOR * (pow(keep, 1 / SRSParams.fsrs5.DECAY) - 1) }

    static func counters(_ game: JSON, _ clock: VocabClock, _ now: Int64, _ keys: [String], n: Int = 7) -> Int {
        var t = 0
        for i in 0..<n {
            let k = clock.todayKey(now - Int64(i) * day)
            let x = game["days"]?[k] ?? .null
            for m in keys { t += x.i(m) }
        }
        return t
    }
    static func reviewsIn(_ days: JSON, _ clock: VocabClock, _ now: Int64, _ n: Int) -> Int {
        var t = 0
        for i in 0..<n { t += days[clock.todayKey(now - Int64(i) * day)]?.double.map { Int($0) } ?? 0 }
        return t
    }
    static func isOwn(_ x: JSON) -> Bool { x.s("title") == "Câu của tôi" }

    public static func compute(_ inp: Input) -> Result {
        let now = inp.now, clock = inp.clock, g = inp.game, today = clock.todayKey(now)
        let d = g["days"]?[today] ?? .null
        let target = SRSParams.fsrs5.retentionTarget
        // memory: the cards that have been reviewed on a daily schedule
        let reviewed = inp.cards.filter { c in let s = c["srs"] ?? .null; return s.t("last") && s.d("reps").map { $0 > 0 } ?? false }
        let mem = Memory(remembered: reviewed.count, learning: inp.cards.filter { c in let s = c["srs"] ?? .null; return s.t("last") && !(s.d("reps").map { $0 > 0 } ?? false) }.count,
                         due: 0, cards: reviewed.map { c in let s = c["srs"] ?? .null; let sv = s.d("S"); return (sv ?? max(0.5, s.t("interval") ? s.d("interval") ?? 1 : 1), Int64(s.d("last") ?? 0)) }, now: now)
        let dueNow = inp.cards.filter { c in let s = c["srs"] ?? .null; return ((s.d("reps") ?? 0) > 0 || s.t("last")) && Int64(s.d("due") ?? 0) <= now }.count
        let forget = inp.cards.filter { Vocab.isForgetting($0, now: now, clock: clock) }.count
        var memory = mem; memory.due = dueNow
        let nextG = inp.grammar.first { g["grammarDone"]?[$0] == nil || g["grammarDone"]?[$0] == .null }
        let nextR = inp.readings.first { g["readDone"]?[$0] == nil || g["readDone"]?[$0] == .null }
        let nextL = inp.listening.first { g["listenDone"]?[$0] == nil || g["listenDone"]?[$0] == .null }
        let hG = nextG.map { "#/grammar/" + $0 } ?? "#/grammar", hR = nextR.map { "#/read/" + $0 } ?? "#/reading", hL = nextL.map { "#/listen/" + $0 } ?? "#/listening"
        let hSpeak = inp.speakBank > 0 ? "#/speaking/p1/\(Int(now / day) % inp.speakBank)" : "#/speaking"
        let done = Set(inp.essayPrompts)
        let wp = inp.prompts.first { !done.contains($0) } ?? (inp.prompts.isEmpty ? nil : inp.prompts[Int(now / day) % inp.prompts.count])
        let hWrite = wp.map { "#/write/" + $0 } ?? "#/write"
        let todayReviews = Int(inp.reviewDays[today]?.double ?? 0)
        let n = { (k: String) in d.i(k) }
        let loop = [
            LoopStep(href: "#/review", done: dueNow == 0 && todayReviews > 0, sub: dueNow > 0 ? Line(key: "{n} thẻ đang ở thời điểm vàng", vars: ["n": String(dueNow)]) : Line(key: "Không còn thẻ đến hạn")),
            LoopStep(href: n("readings") > n("listens") ? hL : hR, done: n("readings") + n("listens") > 0, sub: Line(key: "Đầu vào dễ hiểu, hơi vượt trình độ")),
            LoopStep(href: hR, done: n("newWords") >= 5, sub: Line(key: "Hôm nay: {n} từ", vars: ["n": String(n("newWords"))])),
            LoopStep(href: hG, done: n("grammar") > 0, sub: Line(key: "Học từng bước + tự luận")),
            LoopStep(href: n("spoken") > 0 ? hWrite : hSpeak, done: n("spoken") + n("writes") > 0, sub: Line(key: "Dùng lại từ vừa học")),
            LoopStep(href: "#/mistakes", done: inp.mistakes == 0, sub: inp.mistakes > 0 ? Line(key: "{n} lỗi chưa xem lại", vars: ["n": String(inp.mistakes)]) : Line(key: "Không có lỗi tồn đọng")),
        ]
        // the four strands, last 7 days, in ~10-minute sessions
        let own7 = inp.cards.reduce(0) { a, c in a + c.list("contexts").filter { isOwn($0) && Double(now) - ($0.d("at") ?? 0) < Double(7 * day) }.count }
        let spoken7 = counters(g, clock, now, ["spoken"])
        let raw: [(String, Double)] = [
            ("in", Double(counters(g, clock, now, ["readings"]) + counters(g, clock, now, ["listens"]))),
            ("out", Double(Vocab.round(Double(spoken7) / 3)) + Double(counters(g, clock, now, ["writes"])) + Double(own7) / 3),
            ("lang", Double(Vocab.round(Double(reviewsIn(inp.reviewDays, clock, now, 7)) / 20)) + Double(counters(g, clock, now, ["grammar", "pron"]))),
            ("flu", Double(counters(g, clock, now, ["matches", "dictations"]))),
        ]
        let vals = raw.map { ($0.0, Vocab.round($0.1)) }
        let total = vals.reduce(0) { $0 + $1.1 }
        let weakest = total > 0 ? Vocab.stableSorted(vals) { $0.1 < $1.1 }.first?.0 : nil
        let strands = vals.map { Strand(id: $0.0, pct: total > 0 ? Vocab.round(Double($0.1) / Double(total) * 100) : 0, weak: weakest == $0.0) }
        // the 12 principles' own numbers
        let nCtx = inp.cards.filter { c in c.list("contexts").contains { !isOwn($0) } }.count
        let mine = inp.cards.reduce(0) { $0 + $1.list("contexts").filter { isOwn($0) }.count }
        let phrases = inp.cards.filter { Vocab.isPhrase($0) }.count
        let started = inp.cards.filter { ($0["srs"] ?? .null).t("last") }.count
        let rd = (g["readDone"]?.object ?? [:]).count, ld = (g["listenDone"]?.object ?? [:]).count, gd = (g["grammarDone"]?.object ?? [:]).count, pd = (g["pronDone"]?.object ?? [:]).count
        let totalReviews = inp.reviewDays.object?.values.reduce(0) { $0 + Int($1.double ?? 0) } ?? 0
        let stats: [Line] = [
            forget > 0 ? Line(key: "{n} từ đang sắp quên", vars: ["n": String(forget)]) : Line(key: "Chưa có từ nào sắp quên"),
            Line(key: "{due} thẻ đến hạn · {total} lượt ôn đã làm", vars: ["due": String(dueNow), "total": String(totalReviews)]),
            Line(key: "{n} từ đã học", vars: ["n": String(started)]),
            Line(key: "Đã đọc {read}/{readTotal} bài · nghe {listen}/{listenTotal} phần", vars: ["read": String(rd), "readTotal": String(inp.readings.count), "listen": String(ld), "listenTotal": String(inp.listening.isEmpty ? 20 : inp.listening.count)]),
            Line(key: "{n} từ đã lưu kèm ngữ cảnh thật", vars: ["n": String(nCtx)]),
            Line(key: "{n} câu tự đặt", vars: ["n": String(mine)]),
            Line(key: "{n} bài phát âm đã học", vars: ["n": String(pd)]),
            Line(key: "{n} bài ngữ pháp đã làm", vars: ["n": String(gd)]),
            Line(key: "{essays} bài viết · {spoken} điểm nói (30 ngày)", vars: ["essays": String(inp.essayPrompts.count), "spoken": String(counters(g, clock, now, ["spoken"], n: 30))]),
            Line(key: "{n} cụm từ đã lưu", vars: ["n": String(phrases)]),
            inp.mistakes > 0 ? Line(key: "{n} lỗi chưa xem lại", vars: ["n": String(inp.mistakes)]) : Line(key: "Không có lỗi tồn đọng"),
            Line(key: "Chuỗi {n} ngày · {xp} XP", vars: ["n": String(Vocab.streak(.obj([("days", inp.reviewDays)]), now: now, clock: clock)), "xp": String(g.i("xp"))]),
        ]
        _ = target
        return Result(loop: loop, loopDone: loop.filter(\.done).count, strands: strands, weakest: weakest, stage: inp.settings["placement"]?.s("stage"), memory: memory, stats: stats, forgetting: forget, dueNow: dueNow,
                      hrefs: (hG, hR, hL, hSpeak, hWrite))
    }
}

// MARK: - grammar exercises
public enum DrillOutcome: Equatable, Sendable {
    case tooShort
    case graded(ok: Bool, given: String, answer: String, typo: [PracticeEngine.Typo.Mark]?)
}

public extension GrammarCore {
    /// `gradeDrill` of grammar.js: verb / form / fill / rewrite / combine (matchAnswer, one letter slip allowed in words the learner had to produce), error (the part picked), own (the lesson's structure regex).
    /// nil = nothing to grade yet (empty input, or the unchanged `start` of a rewrite).
    static func grade(_ d: JSON, given raw: String, picked: Int?, pattern: String?, isWord: ((String) -> Bool)? = nil) -> DrillOutcome? {
        let t = d.s("t")
        let answers = d.strs("a")
        if t == "error" {
            guard let p = picked else { return nil }
            let parts = d.strs("parts"), w = d.i("w")
            guard p >= 0, p < parts.count, w < parts.count else { return nil }
            return .graded(ok: p == w, given: parts[p], answer: parts[w] + " → " + d.s("fix"), typo: nil)
        }
        let given = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        if t == "own" {
            if given.isEmpty { return nil }
            let sentence = given.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
            if sentence.split(separator: " ").count < 4 || sentence.range(of: "[A-Za-z]", options: .regularExpression) == nil { return .tooShort }
            let hit = pattern.map { ownHit(sentence, pattern: $0) } ?? ""
            return .graded(ok: pattern != nil ? !hit.isEmpty : matches(sentence, answers), given: sentence, answer: answers.first ?? "", typo: nil)
        }
        if given.isEmpty { return nil }
        if !d.s("start").isEmpty && dnorm(given) == dnorm(d.s("start")) { return nil }
        if matches(given, answers) { return .graded(ok: true, given: given, answer: answers.first ?? "", typo: nil) }
        // a slip in a word copied from the question still counts; words the learner has to produce must be exact
        let seen = Set(PracticeEngine.fxNorm(d.s("q") + " " + d.s("start")).split(whereSeparator: { !($0.isLetter || $0 == "'") }).map(String.init))
        for a in answers {
            let protect = PracticeEngine.fxNorm(a).split(separator: " ").map(String.init).filter { w in !seen.contains(w.filter { $0.isLetter || $0 == "'" }) }
            let r = PracticeEngine.typo(given, a, protect: protect, isWord: isWord)
            if r.ok { return .graded(ok: true, given: given, answer: a, typo: r.typo ? r.marks : nil) }
        }
        return .graded(ok: false, given: given, answer: answers.first ?? "", typo: nil)
    }
    /// the mistake record of a wrong drill / quiz answer (App.logMistake payload)
    static func mistake(q: String, answer: String, given: String, explain: String, ref: String) -> JSON {
        .obj([("kind", .string("grammar")), ("q", .string(q)), ("answer", .string(answer)), ("given", .string(given)), ("explain", .string(explain)), ("ref", .string(ref))])
    }
    /// "…[[target]]…" → the plain sentence (what is read aloud and arranged)
    static func plain(_ s: String) -> String { s.replacingOccurrences(of: "[[", with: "").replacingOccurrences(of: "]]", with: "") }
    static func tokens(_ s: String) -> [String] { s.replacingOccurrences(of: "\u{201C}", with: "").replacingOccurrences(of: "\u{201D}", with: "").replacingOccurrences(of: "\"", with: "").split(whereSeparator: { $0.isWhitespace }).map(String.init) }
}

public extension Confidence {
    /// the web's `RP.chat` scenario of a unit's "Hội thoại ngắn" step: the same script shape as the role-play pack (every line given for the three levels)
    static func roleplayScript(_ u: JSON) -> JSON {
        let r = u["roleplay"] ?? .null
        func x3(_ v: JSON?) -> JSON { .array([v ?? .null, v ?? .null, v ?? .null]) }
        return .obj([("id", .string("cf-" + u.s("id"))), ("em", u["em"] ?? .null), ("title", u["titleEn"] ?? .null), ("name", u["title"] ?? .null), ("kind", .string("everyday")), ("lv", .strings(rpLevel(u.s("level")).1)),
                     ("ai", r["ai"] ?? .null), ("you", r["you"] ?? .null), ("vocab", .array([])),
                     ("turns", .array(r.list("turns").map { .obj([("a", x3($0["a"])), ("h", x3($0["h"])), ("br", $0["br"] ?? .null)]) })), ("end", x3(r["end"]))])
    }
}
