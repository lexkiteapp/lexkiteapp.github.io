import Foundation
import XCTest
@testable import LKSync
@testable import LKStore
import LKStrings

/// M4 P09 part 2 – #/fix #/style #/quick #/confidence #/method #/grammar (LKStore/Skills/FixEngine.swift + LearnCore.swift) against vectors/learn.json, produced by running the REAL web code
/// (scripts/native/gen-learn.mjs). One test per vector key, every case checked, nothing skipped.
final class LearnVectorTests: XCTestCase {
    struct R {
        var checked = 0
        var failures: [String] = []
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) { checked += 1; if !ok { if failures.count < 25 { failures.append(s()) } else if failures.count == 25 { failures.append("…") } } }
        mutating func eq<T: Equatable>(_ a: T, _ b: T, _ label: String) { check(a == b, "\(label): \(a) ≠ \(b)") }
    }
    func finish(_ r: R, _ name: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThan(r.checked, 0, "\(name): nothing checked", file: file, line: line)
        XCTAssertTrue(r.failures.isEmpty, "\(name): \(r.failures.count) of \(r.checked) failed:\n" + r.failures.joined(separator: " ¦ "), file: file, line: line)
    }
    static var cachedV: JSON?
    func vec() throws -> JSON { if let v = Self.cachedV { return v }; let v = try Vectors.load("learn.json"); Self.cachedV = v; return v }
    static let root = Vectors.dir.appendingPathComponent("../../../..").standardized
    func content() -> LearnContent { LearnContent.shared }

    // MARK: fix
    func testFixRules() throws {
        let V = try vec(), eng = try XCTUnwrap(content().fix, "learn-content.json carries the fix rules")
        var r = R()
        r.eq(eng.rules.count, 40, "rule count")
        for c in V["fix"]?.list("cases") ?? [] {
            let id = c.s("id"), text = c.s("text"), want = c.list("issues"), got = eng.check(text)
            r.eq(got.count, want.count, "\(id) issues")
            for (a, b) in zip(got, want) {
                r.check(a.s == b.i("s") && a.e == b.i("e") && a.type == b.s("type") && a.reps == b.strs("reps") && a.rule == b.s("rule") && a.title == b.s("title") && a.why == b.s("why") && a.lesson == b.s("lesson") && (a.levels ?? []) == b.strs("levels"),
                        "\(id) issue \(b.s("rule")) @\(b.i("s"))–\(b.i("e")): got \(a.rule) @\(a.s)–\(a.e) \(a.reps)")
            }
            r.eq(FixEngine.fixed(text, got), c.s("fixed"), "\(id) fixed text")
        }
        finish(r, "fix")
    }

    // MARK: style
    func testStyle() throws {
        let V = try vec(), qs = content().style.list("questions")
        var r = R()
        for c in V["style"]?.list("cases") ?? [] {
            let picks = (c["picks"]?.array ?? []).enumerated().map { qs[$0.offset].list("opts")[Int($0.element.double ?? 0)].s("style") }
            r.eq(StyleQuiz.winner(picks), c.s("winner"), "\(c.s("id")) winner")
        }
        r.eq(qs.count, 6, "six questions"); r.eq(content().style["styles"]?.object?.count ?? 0, 4, "four styles")
        finish(r, "style")
    }

    // MARK: quick
    func testQuick() throws {
        let Q = try vec()["quick"] ?? .null
        var r = R()
        r.eq(Quick.limit, Q.i("limit"), "limit"); r.eq(Quick.count, Q.i("n"), "n"); r.eq(Quick.holdRightMs, Q.i("holdRightMs"), "hold right"); r.eq(Quick.holdWrongMs, Q.i("holdWrongMs"), "hold wrong"); r.eq(Quick.goodPct, Q.i("goodPct"), "good")
        for c in Q.list("cases") {
            let x = Quick.result(right: c.i("right"), total: c.i("total"), timedOut: c.t("timedOut"), elapsed: JSON.orZero(c["elapsed"]))
            r.check(x.pct == c.i("pct") && x.good == c.t("good") && x.xp == c.i("xp") && x.secs == c.i("secs"), "quick \(c.i("right"))/\(c.i("total")): \(x)")
        }
        finish(r, "quick")
    }

    // MARK: confidence
    func testConfidence() throws {
        let V = try vec()["conf"] ?? .null, conf = content().conf
        var r = R()
        for c in V.list("score") {
            let m = c["m"] ?? .null, s = c["self"]?.double.map { Int($0) }
            r.eq(Confidence.score(secs: JSON.orZero(m["secs"]), wpm: JSON.orZero(m["wpm"]), pausesPerMin: JSON.orZero(m["pausesPerMin"]), phrases: m.i("phrases"), selfRating: s), c.i("out"), "score \(m.stableString) self \(String(describing: s))")
        }
        for c in V.list("norm") { r.eq(Confidence.norm(c.s("in")), c.s("norm"), "norm"); r.eq(Confidence.toks(c.s("in")), c.strs("toks"), "toks") }
        for c in V.list("fillers") { r.eq(Confidence.fillers(c.s("in")), c.i("n"), "fillers \(c.s("in"))") }
        let all = Confidence.allPhrases(conf)
        r.eq(all.count, V["counts"]?.i("phrases") ?? 0, "phrase count")
        for c in V.list("used") { r.eq(Confidence.used(c.s("said"), phrases: all), c.strs("used"), "used phrases") }
        for c in V.list("streak") { r.eq(Confidence.streak(c.strs("days"), today: c.s("today"), calendar: { var k = Calendar(identifier: .gregorian); k.timeZone = TimeZone(identifier: "UTC")!; return k }()), c.i("out"), "streak \(c.strs("days"))") }
        for c in V.list("blank") { r.eq(Confidence.blank(c.s("say"), gap: c.s("gap")), c.s("out"), "blank \(c.s("say"))") }
        for c in V.list("shadow") {
            let m = Confidence.marks(c.s("say"), heard: c.s("heard")).map { $0.heard == nil ? "" : $0.heard! ? "y" : "n" }
            r.eq(m, c.strs("marks"), "shadow \(c.s("say"))")
        }
        for c in V.list("rpLevel") { let x = Confidence.rpLevel(c.s("level")); r.check(x.0 == c.i("L") && x.1 == c.strs("lv"), "rpLevel \(c.s("level"))") }
        for c in V.list("dailyIdx") { r.eq(Confidence.dailyIndex(now: Int64(c.i("epochDay")) * 86_400_000, tzOffsetMinutes: 0, count: conf.list("daily").count), c.i("idx"), "daily index") }
        r.eq(conf.units.count, V["counts"]?.i("units") ?? 0, "units"); r.eq(conf.list("toolkit").count, V["counts"]?.i("toolkit") ?? 0, "toolkit"); r.eq(conf.list("daily").count, V["counts"]?.i("daily") ?? 0, "daily")
        // the role-play scenario of a unit has every line for the three levels
        for u in conf.units { let s = Confidence.roleplayScript(u); r.check(s.list("turns").allSatisfy { $0.list("a").count == 3 && $0.list("h").count == 3 } && s.list("end").count == 3, "roleplay script \(u.s("id"))") }
        finish(r, "confidence")
    }

    // MARK: method
    func testMethod() throws {
        let V = try vec()["method"] ?? .null, ct = content()
        let now: Int64 = 1_767_603_600_000, day: Int64 = 86_400_000
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "UTC")!
        let clock = VocabClock(calendar: cal)
        var r = R()
        for c in V.list("cases") {
            let i = c["input"] ?? .null, id = c.s("id"), o = c["out"] ?? .null
            var days: [String: JSON] = [:]
            for (k, v) in i["days"]?.object ?? [:] { days[clock.todayKey(now - Int64(k)! * day)] = v }
            var game: [String: JSON] = ["xp": .number(100), "days": .object(days), "readDone": i["readDone"] ?? .object([:]), "listenDone": i["listenDone"] ?? .object([:]), "grammarDone": i["grammarDone"] ?? .object([:]), "pronDone": i["pronDone"] ?? .object([:])]
            game["total"] = .object([:])
            let cards: [JSON] = i.list("cards").map { c in
                JSON.obj([("word", c["word"] ?? .null), ("srs", c["srs"] ?? .null), ("contexts", .array(c.strs("ctx").map { .obj([("title", .string($0)), ("at", .number(Double(now - day)))]) }))])
            }
            let inp = Method.Input(now: now, clock: clock, cards: cards, reviewDays: .object([:]), game: .object(game), settings: i["settings"] ?? .object([:]), essayPrompts: i.list("essays").map { $0.s("prompt") },
                                   mistakes: i.list("mistakes").filter { !$0.t("fixed") }.count, readings: ["r1", "r2", "r3"], listening: ["l1", "l2"], grammar: ["g1", "g2"], prompts: ["p1", "p2", "p3"])
            let m = Method.compute(inp)
            r.eq(m.loopDone, o.i("loopDone"), "\(id) loopDone")
            for (k, w) in o.list("loop").enumerated() where k < m.loop.count {
                let s = m.loop[k]
                r.check(s.done == w.t("done") && s.href == w.s("href") && s.sub.key == w["sub"]?.s("k") && s.sub.vars == (w["sub"]?["v"]?.object ?? [:]).mapValues { $0.string ?? $0.jsToString }, "\(id) loop \(k): \(s) ≠ \(w.stableString)")
            }
            r.eq(m.loop.count, o.list("loop").count, "\(id) loop count")
            let strandTitle = ["in": "Đầu vào có nghĩa", "out": "Đầu ra có nghĩa", "lang": "Tập trung ngôn ngữ", "flu": "Luyện trôi chảy"]
            for (k, w) in o.list("strands").enumerated() where k < m.strands.count {
                r.check(strandTitle[m.strands[k].id] == w["title"]?.s("k") && m.strands[k].pct == w.i("pct") && m.strands[k].weak == w.t("weak"), "\(id) strand \(k): \(m.strands[k]) ≠ \(w.stableString)")
            }
            r.eq(m.weakest.flatMap { strandTitle[$0] }, o["weakest"]?.string, "\(id) weakest")
            let ms = o.list("mstats")
            if ms.isEmpty { r.check(!m.memory.any && m.memory.learning == 0, "\(id) no memory") } else {
                r.eq(String(m.memory.remembered), ms[0].s("v"), "\(id) remembered"); r.eq("\(Vocab.round(m.memory.at(0) * 100))%", ms[1].s("v"), "\(id) average recall")
                r.eq(String(m.memory.due), ms[2].s("v"), "\(id) due"); r.eq(String(m.memory.learning), ms[3].s("v"), "\(id) learning")
            }
            // plan: the stage chooses the plan of the bundled content
            let st = ["s0", "s1", "s2", "s3"].contains(m.stage ?? "") ? m.stage! : "s1", plan = ct.method["plans"]?[st] ?? .null
            r.eq(plan["name"]?["v"]?.s("name") ?? "", o["planName"]?["v"]?.s("name") ?? "", "\(id) plan name")
            r.eq(plan.list("items").map { "\($0.s("href"))|\($0.i("min"))|\($0["label"]?.s("k") ?? "")" }, o.list("plan").map { "\($0.s("href"))|\($0.i("min"))|\($0["label"]?.s("k") ?? "")" }, "\(id) plan items")
            // the 12 principles: stat key + vars
            for (k, p) in o.list("prin").enumerated() where k < m.stats.count {
                var want = (p["stat"]?["v"]?.object ?? [:]).mapValues { $0.string ?? $0.jsToString }, have = m.stats[k].vars
                if k == 11 { want["n"] = nil; have["n"] = nil }   // the streak is App.streak() of the page (review days of the learner), a platform input
                r.check(m.stats[k].key == p["stat"]?.s("k") && have == want, "\(id) principle \(k) stat: \(m.stats[k]) ≠ \(p["stat"]?.stableString ?? "")")
            }
            r.eq(m.stats.count, o.list("prin").count, "\(id) principle count")
        }
        r.eq(ct.method.list("principles").count, 12, "twelve principles"); r.eq(ct.method.list("faq").count, 5, "faq"); r.eq(ct.method.list("loop").count, 6, "loop")
        finish(r, "method")
    }

    // MARK: grammar
    func testGrammar() throws {
        let V = try vec()["grammar"] ?? .null
        let text = try String(contentsOf: Self.root.appendingPathComponent("web/data/grammar-pack.json"), encoding: .utf8)
        let pack = try XCTUnwrap(GrammarPack(text: text), "web/data/grammar-pack.json is a grammar pack")
        var r = R()
        for c in V.list("answers") { r.eq(GrammarCore.matches(c.s("given"), c.strs("answers")), c.t("ok"), "answer \(c.s("given"))") }
        for c in V.list("dnorm2") { r.eq(GrammarCore.dnorm2(c.s("in")), c.s("out"), "dnorm2 \(c.s("in"))") }
        for c in V.list("own") { r.eq(GrammarCore.ownHit(c.s("sentence"), pattern: c.s("src")), c.s("hit"), "own sentence \(c.s("id"))") }
        let want = V.list("order")
        let got = pack.order
        r.eq(got.count, want.count, "order count")
        for (a, b) in zip(got, want) { r.check(a.lesson.s("id") == b.s("id") && a.chapter.i("n") == b.i("chapter"), "order \(a.lesson.s("id")) vs \(b.s("id"))") }
        r.eq(pack.index.count, V["counts"]?.i("lessons") ?? 0, "lessons"); r.eq(pack.lessons.count, pack.index.count, "every lesson has its body")
        for s in V.list("shape") { let l = pack.lessons[s.s("id")]; r.check(l?.list("quiz").count == s.i("quiz") && l?.list("drills").count == s.i("drills") && l?.list("blocks").map { $0.s("type") } == s.strs("blocks"), "shape \(s.s("id"))") }
        r.eq(pack.l1.count, 14, "L1 languages"); r.eq(pack.check.count, V["counts"]?.i("check") ?? 0, "check regexes")
        // the offline start: every lesson listed, three complete
        let starter = try XCTUnwrap(GrammarPack.bundled(), "grammar-content.json is bundled")
        r.eq(starter.index.count, pack.index.count, "starter lists every lesson"); r.eq(starter.lessons.count, 3, "starter has three lessons")
        // the quiz / drill rewards
        r.eq(GrammarCore.quizXP(4), 22, "quiz xp"); r.eq(GrammarCore.drillXP(4), 26, "drill xp"); r.eq(GrammarCore.mixXP(4), 18, "mix xp")
        finish(r, "grammar")
    }
}
