import Foundation
#if !LESSON_DRIVER
import XCTest
@testable import LKSync
import LKCore
#endif

/// P03 lesson engine: the native port (LKCore/Lesson) against vectors/lesson.json, produced by running the REAL web engine
/// (scripts/native/gen-lesson.mjs; schema docs/specs/native-m2-vectors.md §1). Everything is compared exactly (numbers 1e-9, items as JSON).
enum LessonVectorCheck {
    struct Report {
        var checked = 0
        var failures: [String] = []
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) {
            checked += 1
            if !ok { if failures.count < 25 { failures.append(s()) } else if failures.count == 25 { failures.append("…") } }
        }
        mutating func diff(_ a: JSON?, _ b: JSON?, _ label: String) { let d = jsonDiff(a, b); check(d == nil, "\(label): \(d ?? "")") }
    }

    static var utc: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }

    final class Ctx {
        let V: JSON
        let cards: [LessonCard], starter: [LessonCard], now: Double
        var byRef: [String: LessonCard] = [:]
        var imgWords: Set<String>, gloss: [String: String]
        var built: [String: [LessonItem]] = [:]
        init(_ V: JSON) {
            self.V = V
            func load(_ a: JSON?, _ p: String) -> [LessonCard] {
                (a?.array ?? []).enumerated().map { i, j in
                    var c = (try? JSONDecoder().decode(LessonCard.self, from: j.data)) ?? LessonCard(word: "?")
                    c.ref = "\(p):\(i)"; return c
                }
            }
            cards = load(V["inputs"]?["cards"], "c"); starter = load(V["inputs"]?["starter"], "s")
            for c in cards + starter { byRef[c.ref] = c }
            now = V["now"]?.double ?? 0
            imgWords = Set((V["inputs"]?["imgWords"]?.array ?? []).compactMap(\.string))
            gloss = (V["inputs"]?["gloss"]?.object ?? [:]).compactMapValues(\.string)
        }
        func poolFor(_ kind: String) -> [LessonCard] {
            switch kind {
            case "all": return cards
            case "new": return cards.filter { $0.srs.map { $0.reps == 0 && ($0.last ?? 0) == 0 } ?? false }
            case "noex": return cards.filter { $0.ex.isEmpty && $0.ctx.isEmpty && $0.sentences.isEmpty }
            default: return []
            }
        }
    }

    static func j(_ it: LessonItem) -> JSON { (try? JSON.parse(try JSONEncoder().encode(it))) ?? .null }
    static func b(_ x: Bool) -> JSON { .bool(x) }

    static func picks(_ cx: Ctx, _ c: JSON) -> [LessonPick] {
        let o = c["opts"]
        let opts = LessonEngine.PickOptions(n: Int(o?["n"]?.double ?? 6), now: o?["now"]?.double ?? cx.now, mode: o?["mode"]?.string, starter: c["starter"]?.truthy == true ? cx.starter : [])
        return LessonEngine.pickWords(cx.poolFor(c["cards"]?.string ?? ""), opts, calendar: utc)
    }
    static func pickJSON(_ p: [LessonPick]) -> JSON { .array(p.map { ["card": .string($0.card.ref), "why": .string($0.why)] }) }

    static func pickWords(_ cx: Ctx) -> Report {
        var r = Report()
        for c in cx.V["pickWords"]?.array ?? [] { r.diff(pickJSON(picks(cx, c)), c["out"], "pickWords \(c["id"]?.string ?? "")") }
        return r
    }

    static func buildAll(_ cx: Ctx, _ r: inout Report) {
        let pw = Dictionary(uniqueKeysWithValues: (cx.V["pickWords"]?.array ?? []).compactMap { c in c["id"]?.string.map { ($0, c) } })
        for c in cx.V["build"]?.array ?? [] {
            guard let id = c["id"]?.string, let pc = pw[c["pick"]?.string ?? ""] else { r.check(false, "build case without pick"); continue }
            var o = LessonEngine.BuildOptions(seed: c["seed"]?.double ?? 1, pool: cx.cards + cx.starter)
            o.off = LessonOff(listen: c["off"]?["listen"]?.truthy == true, speak: c["off"]?["speak"]?.truthy == true)
            o.only = c["only"]?.array?.compactMap(\.string); o.calm = c["calm"]?.truthy == true
            if let p = c["perWord"]?.double { o.perWord = Int(p) }
            if c["match"]?.truthy == false, c["match"] != nil { o.match = false }
            let img = c["img"]?.truthy == true, gl = c["gloss"]?.truthy == true, vi = c["mean"]?.string == "vi"
            if img { o.hasImg = { w, _ in cx.imgWords.contains(w) } }
            if gl { o.gloss = { _, en in cx.gloss[en] ?? "" } }
            o.mean = { vi ? $0.vi : "" }
            let items = LessonEngine.build(picks(cx, pc), o)
            cx.built[id] = items
            let want = c["out"]?.array ?? []
            r.check(items.count == want.count, "build \(id): \(items.count) items ≠ \(want.count)")
            for (i, (g, w)) in zip(items, want).enumerated() { r.diff(j(g), w, "build \(id)[\(i)]") }
        }
    }
    static func build(_ cx: Ctx) -> Report { var r = Report(); buildAll(cx, &r); return r }

    static func adapt(_ cx: Ctx) -> Report {
        var r = Report()
        var r0 = Report(); buildAll(cx, &r0)
        let all = cx.built.values.flatMap { $0 }
        let offs = cx.V["adapt"]?["offs"]?.array ?? []
        r.check(offs.count == 4, "4 off combinations")
        for (ci, c) in (cx.V["adapt"]?["cases"]?.array ?? []).enumerated() {
            guard let it = all.first(where: { jsonDiff(j($0), c["in"]) == nil }) else { r.check(false, "adapt case \(ci): input not among built items"); continue }
            for o in c["outs"]?.array ?? [] {
                let off = LessonOff(listen: o["off"]?["listen"]?.truthy == true, speak: o["off"]?["speak"]?.truthy == true)
                r.diff(j(LessonEngine.adapt(it, off)), o["out"], "adapt case \(ci) \(o["off"]?.stableString ?? "")")
            }
        }
        return r
    }

    static func given(_ a: JSON?) -> Answer.Given {
        switch a {
        case .string(let s)?: return .text(s)
        case .number(let n)?: return .score(n)
        case .bool(let v)?: return .matched(v)
        case .array(let x)?: return .words(x.compactMap(\.string))
        default: return .text("")
        }
    }
    static func check(_ cx: Ctx) -> Report {
        var r = Report()
        for c in cx.V["check"]?.array ?? [] {
            var it = LessonItem(id: 0, type: c["item"]?["type"]?.string ?? "", word: "x")
            it.answer = c["item"]?["answer"]?.string; it.choice = c["item"]?["choice"]?.truthy == true ? true : nil
            for k in c["cases"]?.array ?? [] {
                r.check(LessonEngine.check(it, given(k["ans"])) == (k["ok"]?.truthy == true), "check \(it.type) \(k.stableString)")
            }
        }
        return r
    }

    // MARK: session
    static func stepJSON(_ op: String, _ res: LessonSession.Answered?, _ s: LessonSession, story: Bool) -> JSON {
        var o: [String: JSON] = ["op": .string(op)]
        var rr: JSON = .null
        if let res {
            var x: [String: JSON] = ["ok": b(res.ok), "combo": .number(Double(res.combo))]
            if let q = res.requeued { x["requeued"] = b(q) }
            if res.free == true { x["free"] = true }
            rr = .object(x)
        }
        o["res"] = rr
        o["solved"] = .number(Double(s.solved)); o["progress"] = .number(s.progress); o["combo"] = .number(Double(s.combo)); o["best"] = .number(Double(s.best))
        o["n"] = .number(Double(s.n)); o["ok1"] = .number(Double(s.ok1)); o["accuracy"] = .number(Double(s.accuracy)); o["done"] = b(s.done)
        o["q"] = .array(s.q.map { [.number(Double($0.id)), .number(Double($0.retry))] })
        if !story {
            o["cur"] = s.cur.map { .number(Double($0.id)) } ?? .null
            o["curRetry"] = s.cur.map { .number(Double($0.retry)) } ?? .null
            o["miss"] = .number(Double(s.miss))
        }
        return .object(o)
    }

    static func session(_ cx: Ctx) -> Report {
        var r = Report()
        buildAll(cx, &r)
        for c in cx.V["session"]?.array ?? [] {
            let id = c["id"]?.string ?? ""
            guard let items = cx.built[c["build"]?.string ?? ""] else { r.check(false, "session \(id): no build"); continue }
            var s = LessonSession(items, maxRetry: Int(c["opts"]?["maxRetry"]?.double ?? 2), ease: c["opts"]?["ease"]?.truthy == true)
            r.check(s.total == Int(c["start"]?["total"]?.double ?? -1), "session \(id) total")
            let script = Array(c["script"]?.string ?? ""), steps = c["steps"]?.array ?? []
            var k = 0
            while !s.done && k < 500 {
                let ch: Character? = k < script.count ? script[k] : nil
                var res: LessonSession.Answered?, op = "right"
                if ch == "s" { s.skip(); op = "skip" }
                else { let ok = ch != "0"; res = s.answer(ok); op = ok ? "right" : "wrong" }
                if k < steps.count { r.diff(stepJSON(op, res, s, story: false), steps[k], "session \(id) step \(k)") }
                k += 1
            }
            r.check(k == steps.count, "session \(id): \(k) steps ≠ \(steps.count)")
            let log: [JSON] = s.log.map { l in
                var o: [String: JSON] = ["id": .number(Double(l.id)), "type": .string(l.type), "word": .string(l.word)]
                if let ok = l.ok { o["ok"] = b(ok) }
                if let rt = l.retry { o["retry"] = .number(Double(rt)) }
                if l.skip == true { o["skip"] = true }
                return .object(o)
            }
            r.diff(.array(log), c["log"], "session \(id) log")
            r.diff(.object(s.wrong.mapValues { .number(Double($0)) }), c["wrong"], "session \(id) wrong")
            r.diff(.array(s.firstOk.map { .string($0) }), c["firstOk"], "session \(id) firstOk")
            let res = LessonEngine.results(s, items, cards: cx.cards, now: c["resultsNow"]?.double ?? cx.now, calendar: utc)
            let rj: [JSON] = res.map { ["word": .string($0.word), "grade": .number(Double($0.grade)), "add": b($0.add), "card": $0.card.map { .string($0.ref) } ?? .null] }
            r.diff(.array(rj), c["results"], "session \(id) results")
        }
        return r
    }

    // MARK: small pure functions
    static func pure(_ cx: Ctx) -> Report {
        var r = Report()
        let V = cx.V
        for c in V["rng"]?.array ?? [] {
            var g = LessonEngine.RNG(seed: c["seed"]?.double ?? 0)
            let got: [JSON] = (0..<8).map { _ in .number((g.next() * 1e6).rounded() / 1e6) }
            let want = c["out"]?.array ?? []
            for (i, (a, w)) in zip(got, want).enumerated() { r.check(abs((a.double ?? 9) - (w.double ?? -9)) < 2e-6, "rng seed \(c["seed"]?.stableString ?? "")[\(i)]") }
        }
        for c in V["shuffle"]?.array ?? [] {
            var g = LessonEngine.RNG(seed: c["seed"]?.double ?? 0)
            r.diff(.array(LessonEngine.shuffle((c["in"]?.array ?? []).compactMap(\.string), &g).map { .string($0) }), c["out"], "shuffle seed \(c["seed"]?.stableString ?? "")")
        }
        for c in V["letterBank"]?.array ?? [] {
            var g = LessonEngine.RNG(seed: c["seed"]?.double ?? 0)
            r.diff(.array(LessonEngine.letterBank((c["word"]?.string ?? "").lowercased(), &g).map { .string($0) }), c["out"], "letterBank \(c["word"]?.string ?? "")")
        }
        for c in V["toks"]?.array ?? [] { r.diff(.array(LessonEngine.toks(c["in"]?.string ?? "").map { .string($0) }), c["out"], "toks") }
        for c in V["norm"]?.array ?? [] { r.check(LessonEngine.norm(c["in"]?.string ?? "") == c["out"]?.string, "norm \(c["in"]?.stableString ?? "")") }
        func blankJSON(_ x: LessonBlank?) -> JSON {
            guard let x else { return .null }
            return ["i": .number(Double(x.i)), "n": .number(Double(x.n)), "toks": .array(x.toks.map { .string($0) }), "form": .string(x.form)]
        }
        for c in V["findWord"]?.array ?? [] { r.diff(blankJSON(LessonEngine.findWord(c["sentence"]?.string ?? "", c["word"]?.string ?? "")), c["out"], "findWord \(c["sentence"]?.string ?? "")") }
        for c in V["sentenceOf"]?.array ?? [] {
            var out: JSON = .null
            if let card = cx.byRef[c["card"]?.string ?? ""], let s = LessonEngine.sentenceOf(card) {
                var o: [String: JSON] = ["text": .string(s.text), "own": b(s.own), "at": blankJSON(s.at)]
                if let tr = s.tr { o["tr"] = .string(tr) }
                out = .object(o)
            }
            r.diff(out, c["out"], "sentenceOf \(c["card"]?.string ?? "")")
        }
        for c in V["stress"]?.array ?? [] {
            let s = LessonEngine.stress(c["ipa"]?.string ?? "")
            r.diff(s.map { ["syl": .number(Double($0.syl)), "of": .number(Double($0.of))] } ?? .null, c["out"], "stress \(c["ipa"]?.string ?? "")")
        }
        for c in V["usuk"]?.array ?? [] {
            let card = LessonCard(word: "x", ipa: c["card"]?["ipa"]?.string ?? "", ipaUS: c["card"]?["ipaUS"]?.string ?? "")
            r.diff(LessonEngine.usuk(card).map { ["uk": .string($0.uk), "us": .string($0.us)] } ?? .null, c["out"], "usuk")
        }
        for c in V["visemes"]?.array ?? [] {
            let cues = LessonEngine.visemes(c["text"]?.string ?? "", dur: c["dur"]?.double)
            r.diff(.array(cues.map { [.number($0.0), .string($0.1)] }), c["out"], "visemes \(c["text"]?.string ?? "")")
        }
        for c in V["isDue"]?.array ?? [] {
            if let card = cx.byRef[c["card"]?.string ?? ""] {
                r.check(LessonEngine.isDue(card, c["now"]?.double ?? 0, calendar: utc) == (c["isDue"]?.truthy == true), "isDue \(c["card"]?.string ?? "")")
                r.check(LessonEngine.fromExt(card) == (c["fromExt"]?.truthy == true), "fromExt \(c["card"]?.string ?? "")")
            } else { r.check(false, "isDue card ref") }
        }
        for c in V["plans"]?.array ?? [] {
            let now = c["now"]?.double ?? 0
            var map: [LessonCard]
            switch c["cards"]?.string ?? "" {
            case "mixed": map = cx.cards
            case "many-due": map = cx.cards.map { var x = $0; x.srs = LessonSRS(reps: 2, lapses: 1, due: cx.now - 2 * LessonEngine.day, last: cx.now - 5 * LessonEngine.day); return x }
            default: map = []
            }
            func has(_ h: JSON?) -> LessonEngine.Has {
                LessonEngine.Has(story: h?["story"]?.truthy == true, radio: h?["radio"]?.truthy == true, odd: h?["odd"]?.truthy == true, exam: h?["exam"]?.truthy == true)
            }
            for p in c["path"]?.array ?? [] { r.diff(.array(LessonEngine.pathPlan(map, now: now, has: has(p["has"]), calendar: utc).map { .string($0) }), p["out"], "pathPlan \(p["has"]?.stableString ?? "")") }
            for p in c["unit"]?.array ?? [] { r.diff(.array(LessonEngine.unitPlan(map, now: now, has: has(p["has"]), calendar: utc).map { .string($0) }), p["out"], "unitPlan \(p["has"]?.stableString ?? "")") }
        }
        for c in V["nextKind"]?.array ?? [] {
            let acc = c["ctx"]?["acc"]?.double, due = c["ctx"]?["due"]?.truthy == true
            r.check(LessonEngine.nextKind(c["kind"]?.string ?? "", acc: acc, due: due) == c["out"]?.string, "nextKind \(c.stableString)")
        }
        for c in V["hard"]?.array ?? [] {
            var it = LessonItem(id: 0, type: c["item"]?["type"]?.string ?? "", word: "x")
            it.spoke = c["item"]?["spoke"]?.truthy == true ? true : nil; it.choice = c["item"]?["choice"]?.truthy == true ? true : nil
            r.check(LessonEngine.isHard(it) == (c["out"]?.truthy == true), "hard \(c.stableString)")
        }
        let cin = (V["calm"]?["in"]?.array ?? []).map { x -> LessonItem in
            var it = LessonItem(id: Int(x["id"]?.double ?? 0), type: x["type"]?.string ?? "", word: x["word"]?.string ?? "")
            it.spoke = x["spoke"]?.truthy == true ? true : nil; it.choice = x["choice"]?.truthy == true ? true : nil
            return it
        }
        r.diff(.array(LessonEngine.calm(cin).map { .number(Double($0.id)) }), V["calm"]?["out"], "calm")
        let sim = V["similarity"]
        r.check(Double(LessonEngine.speechPass) == sim?["pass"]?.double && Double(LessonEngine.speechRetries) == sim?["retriesBeforeSubmit"]?.double, "speech pass / retries")
        for c in sim?["cases"]?.array ?? [] {
            let got = LessonEngine.similarity(c["heard"]?.string ?? "", c["target"]?.string ?? "")
            r.check(abs(got - (c["sim"]?.double ?? -1)) < 1e-9, "similarity \(c.stableString)")
            r.check(Int((got * 100 + 0.5).rounded(.down)) == Int(c["score"]?.double ?? -1), "score \(c.stableString)")
        }
        r.check(V["consts"]?["DAY"]?.double == LessonEngine.day, "DAY")
        for (k, v) in V["consts"]?["HINTS"]?.object ?? [:] { r.diff(.array((LessonEngine.hints[k] ?? []).map { .string($0) }), v, "HINTS \(k)") }
        return r
    }

    // MARK: stories
    static func stories(_ cx: Ctx, scriptPath: String) -> Report {
        var r = Report()
        guard let text = try? String(contentsOfFile: scriptPath, encoding: .utf8), let all = LessonStory.parseScript(text) else { r.check(false, "stories.js not readable at \(scriptPath)"); return r }
        let byID = Dictionary(uniqueKeysWithValues: all.map { ($0.id, $0) })
        for c in cx.V["storyItems"]?.array ?? [] {
            guard let st = byID[c["story"]?.string ?? ""] else { r.check(false, "story \(c["story"]?.string ?? "")"); continue }
            let items = LessonEngine.storyItems(st, lang: c["lang"]?.string ?? "en", seed: c["seed"]?.double ?? 1)
            let want = c["out"]?.array ?? []
            r.check(items.count == want.count, "storyItems \(st.id): \(items.count) ≠ \(want.count)")
            for (i, (g, w)) in zip(items, want).enumerated() { r.diff(j(g), w, "storyItems \(st.id)/\(c["lang"]?.string ?? "")[\(i)]") }
        }
        let ss = cx.V["storySession"]
        if let st = byID[ss?["story"]?.string ?? ""] {
            var s = LessonSession(LessonEngine.storyItems(st, lang: ss?["lang"]?.string ?? "en", seed: ss?["seed"]?.double ?? 1))
            let steps = ss?["steps"]?.array ?? []
            var i = 0
            while let cur = s.cur, i < 500 {
                let op = cur.free == true ? "line" : "check"
                let res = s.answer(cur.free == true ? true : i % 4 != 0)
                var js = stepJSON(op, res, s, story: true)
                js["type"] = .string(cur.type)
                if i < steps.count { r.diff(js, steps[i], "storySession step \(i)") }
                i += 1
            }
            r.check(i == steps.count, "storySession: \(i) steps ≠ \(steps.count)")
        } else { r.check(false, "storySession story") }
        return r
    }

    static func storiesPath(_ file: String = #filePath) -> String {
        URL(fileURLWithPath: file).deletingLastPathComponent().appendingPathComponent("../../../../../web/cpack/lesson/stories.js").standardized.path
    }
}

#if !LESSON_DRIVER
final class LessonVectorTests: XCTestCase {
    var cx: LessonVectorCheck.Ctx!
    override func setUpWithError() throws { cx = LessonVectorCheck.Ctx(try Vectors.load("lesson.json")) }
    func assertReport(_ r: LessonVectorCheck.Report, min: Int, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThanOrEqual(r.checked, min, "too few checks ran", file: file, line: line)
        XCTAssert(r.failures.isEmpty, r.failures.joined(separator: "\n"), file: file, line: line)
    }
    func testPickWords() { assertReport(LessonVectorCheck.pickWords(cx), min: 8) }
    func testBuild() { assertReport(LessonVectorCheck.build(cx), min: 100) }
    func testAdapt() { assertReport(LessonVectorCheck.adapt(cx), min: 28) } // 7 vector cases × 4 off-states (every case must run)
    func testCheck() { assertReport(LessonVectorCheck.check(cx), min: 30) }
    func testSession() { assertReport(LessonVectorCheck.session(cx), min: 100) }
    func testPureFunctions() { assertReport(LessonVectorCheck.pure(cx), min: 100) }
    func testStories() { assertReport(LessonVectorCheck.stories(cx, scriptPath: LessonVectorCheck.storiesPath()), min: 20) }
}
#endif
