import Foundation
import LKSync
import LKCore

/// M4 P07 – #/rtype: IELTS Reading practice by question type (web/js/rtype.js). Marking is the P06 engine (`QE`); this file only groups the groups of all tests by
/// kind, keeps the cumulative `game.rtype[kind] = {r, t}` and writes what "Kiểm tra" writes. Verified against vectors/speak.json `rtype.*` (SpeakRtypeRoleplayVectorTests).
public enum Rtype {
    public static let order = ["completion", "tfng", "ynng", "mcq", "multi", "headings", "info", "features"]
    /// "reached the goal" (hub chip, note) and the feedback tone of a check: right / total ≥ 75 %
    public static let goalPct = 75
    /// the web test of the same constant is `pct >= 75` (hub) and `right / tot >= 0.75` (feedback)
    public static let goalRatio = 0.75

    /// web `kindOf(g)`: the hub kind of a question group
    public static func kindOf(_ g: JSON) -> String {
        switch g.s("type") {
        case "tfng", "ynng", "mcq", "multi": return g.s("type")
        case "match":
            let opts = g.strs("options")
            if opts.map(QE.code).contains(where: { $0.range(of: "^[ivx]+$", options: [.regularExpression, .caseInsensitive]) != nil }) { return "headings" }
            if opts.allSatisfy({ QE.label($0).isEmpty }) { return "info" }
            return "features"
        default: return "completion"
        }
    }

    /// one question group with its passage and test
    public struct Unit: Equatable, Sendable {
        public var test: JSON, passage: JSON, group: JSON
        public var gi: Int, kind: String
        public var id: String { "\(test.s("id")):\(passage.i("n")):\(gi)" }
        /// the group as the question engine takes a part
        public var part: JSON { .obj([("groups", .array([group]))]) }
        public var title: String { passage.s("title") }
        public var questions: Int { QE.numbers(part).count }
    }
    public static func units(_ tests: [JSON]) -> [Unit] {
        var out: [Unit] = []
        for t in tests { for p in t.list("passages") { for (gi, g) in p.list("groups").enumerated() { out.append(Unit(test: t, passage: p, group: g, gi: gi, kind: kindOf(g))) } } }
        return out
    }

    // MARK: hub
    public struct Card: Equatable, Sendable {
        public var kind: String
        /// nil = not started
        public var pct: Int?
        public var reached: Bool { (pct ?? 0) >= Rtype.goalPct }
        public var bar: Int { pct ?? 0 }
        public var questions: Int, groups: Int
    }
    /// one card per kind that has a group; `pct = round(100·r/t)` of `game.rtype[kind]`
    public static func hub(_ units: [Unit], rtype: JSON) -> [Card] {
        order.compactMap { k in
            let u = units.filter { $0.kind == k }
            guard !u.isEmpty else { return nil }
            let s = rtype[k] ?? .null, r = s.i("r"), t = s.i("t")
            return Card(kind: k, pct: t > 0 ? Vocab.round(Double(r) / Double(t) * 100) : nil, questions: u.reduce(0) { $0 + $1.questions }, groups: u.count)
        }
    }

    // MARK: check
    public struct Outcome: Equatable, Sendable {
        public var results: [QResult]
        public var right: Int, total: Int
        /// cumulative r/t of the kind after this check, and its percentage
        public var cumulative: (r: Int, t: Int)
        public var pct: Int
        public var ok: Bool
        public var reward: [String: Int]
        public var game: JSON, mistakes: [JSON]
        public static func == (a: Outcome, b: Outcome) -> Bool { a.results == b.results && a.game == b.game && a.mistakes == b.mistakes && a.reward == b.reward }
    }
    /// The "(bỏ trống)" of the mistakes book and its question key (web `I18N.tk` keys; shared with the Vietnamese sync keys)
    static let blank = "(bỏ trống)", mistakeQ = "{title} – câu {n}: {q}"
    /// "Kiểm tra": `game.rtype[kind] += {r, t}`, `game.qstat["ir:<kind>"]`, a mistake for each wrong question, `reward({quizzes:1, readings:1, xp: 5 + 2·right})`.
    /// `explain` = the test's `READ_EXPLAIN[test.id]` ({ "<n>": {why} }).
    public static func check(_ u: Unit, answers: QAnswers, explain: JSON, game: JSON, mistakes: [JSON], now: Int64) -> Outcome {
        let res = QE.collect(u.part, answers), list = res.keys.sorted().compactMap { res[$0] }
        let right = list.filter(\.ok).count, total = list.count
        var g = QE.record(game, skill: "ir", results: list, now: now)
        var rt = g["rtype"]?.object ?? [:]
        let old = rt[u.kind] ?? .null
        let r = old.i("r") + right, t = old.i("t") + total
        rt[u.kind] = .obj([("r", .int(r)), ("t", .int(t))])
        g["rtype"] = .object(rt)
        var log = mistakes
        for q in list where !q.ok {
            log = MistakesEngine.log(log, mistake(u, q, why: explain[String(q.n)]?.s("why") ?? ""), now: now)
        }
        return Outcome(results: list, right: right, total: total, cumulative: (r, t), pct: t > 0 ? Vocab.round(Double(r) / Double(t) * 100) : 0,
                       ok: total > 0 && Double(right) / Double(total) >= goalRatio, reward: ["quizzes": 1, "readings": 1, "xp": 5 + right * 2], game: g, mistakes: log)
    }
    public static func mistake(_ u: Unit, _ r: QResult, why: String) -> JSON {
        let q = JSON.obj([("k", .string(mistakeQ)), ("v", .obj([("title", .string(u.title)), ("n", .string(String(r.n))), ("q", .string(r.q))]))])
        return .obj([("kind", .string("reading")), ("q", q), ("answer", .string(r.answer)),
                     ("given", r.given.isEmpty ? .obj([("k", .string(blank))]) : .string(r.given)), ("explain", .string(why)), ("ref", .string(""))])
    }
    /// the group copy shown on screen: every item carries its explanation (web `QE.explainHtml(ex[n])`)
    public static func withExplanations(_ g: JSON, explain: JSON) -> JSON {
        var out = g
        if g.s("type") != "multi" {
            out["items"] = .array(g.list("items").map { it in
                var x = it
                if let why = explain[String(it.i("n"))]?.string ?? explain[String(it.i("n"))]?["why"]?.string, !why.isEmpty { x["explain"] = .string(why) }
                return x
            })
        }
        return out
    }
}

/// The reading tests of #/rtype (the P09 pack, shape of vectors `data.readtests`: `{tests:[{id, passages:[{n,title,paras:[{k,t}],groups}]}], explain:{<testId>:{<n>:{why}}}}`).
/// There is no fetchable file for them yet (web/js/readtest/*.js are scripts, shipped with the P09 pack), so the store stays empty until `install`.
public struct RtypeContent: Sendable {
    public var tests: [JSON] = [], explain: JSON = .null
    public init(tests: [JSON] = [], explain: JSON = .null) { self.tests = tests; self.explain = explain }
    public init(json: JSON) { self.init(tests: json.list("tests"), explain: json["explain"] ?? .null) }
    public var units: [Rtype.Unit] { Rtype.units(tests) }
    public func explain(for u: Rtype.Unit) -> JSON { explain[u.test.s("id")] ?? .null }
}
