import Foundation
import XCTest
@testable import LKSync
@testable import LKStore
@testable import LKCore
import LKStrings

/// M4 P07 (fork A) – Speaking logic against vectors/speak.json, produced by running the REAL web code (scripts/native/gen-speak.mjs; schema docs/specs/native-m4-vectors.md):
/// `shared.recognize`, `shared.speak`, `speak.{situation,drill,fill}`, `speaking.{render,timer,analyse,shadow}`. One test per key, every case checked.
/// What the platform does is an input of each case (heard text, ms, errors); a field with no native counterpart is named where it is left out.
@MainActor
final class SpeakSpeakingVectorTests: XCTestCase {
    struct R {
        var checked = 0
        var failures: [String] = []
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) { checked += 1; if !ok { if failures.count < 25 { failures.append(s()) } else if failures.count == 25 { failures.append("…") } } }
        mutating func diff(_ a: JSON?, _ b: JSON?, _ label: String) { let d = jsonDiff(a, b); check(d == nil, "\(label): \(d ?? "")") }
        mutating func eq<T: Equatable>(_ a: T, _ b: T, _ label: String) { check(a == b, "\(label): \(a) ≠ \(b)") }
    }
    func finish(_ r: R, _ name: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThan(r.checked, 0, "\(name): nothing checked", file: file, line: line)
        XCTAssertTrue(r.failures.isEmpty, "\(name): \(r.failures.count) of \(r.checked) failed:\n" + r.failures.joined(separator: "\n"), file: file, line: line)
    }

    // MARK: fixtures
    static var cachedV: JSON?
    func vec() throws -> JSON { if let v = Self.cachedV { return v }; let v = try Vectors.load("speak.json"); Self.cachedV = v; return v }
    static let root = Vectors.dir.appendingPathComponent("../../../..").standardized
    /// a web `{k}` / `{k, v}` text: a key without variables is just the key
    func key(_ j: JSON?) -> JSON? {
        if let o = j?.object, o.count == 1, let k = o["k"] { return k }
        return j
    }
    func tz() -> Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    func now(_ V: JSON) -> Int64 { Int64(V["now"]?.double ?? 0) }
    /// the real content pack (web/data/speak-pack.json = https://lexkite.com/data/speak-pack.json)
    func pack() throws -> SpeakPack {
        let d = try Data(contentsOf: Self.root.appendingPathComponent("web/data/speak-pack.json"))
        return SpeakPack(json: try JSON.parse(d))
    }
    /// a situation exactly as the app builds it: the base file + the Vietnamese translation file of web/cpack/speak/s
    func situation(_ id: String, lang: String = "vi") throws -> JSON {
        let dir = Self.root.appendingPathComponent("web/cpack/speak/s")
        let base = try String(contentsOf: dir.appendingPathComponent("\(id).js"), encoding: .utf8)
        let tr = try? String(contentsOf: dir.appendingPathComponent("\(id).\(lang).js"), encoding: .utf8)
        return try XCTUnwrap(SpeakSit.situation(base: base, translation: tr, lang: lang))
    }
    func lexis(_ V: JSON) throws -> Lexis {
        let sk = try Vectors.load("skills.json")
        return Lexis(SkillsData(json: sk["data"] ?? .null).lexis)
    }

    // MARK: parity (P07, #/speak + #/speaking)
    /// The rules the owner named for P07 that no single vector case states by itself.
    func testParityP07() throws {
        let V = try vec(), P = try pack()
        // pack: the real content has 40 topics, 3 parts with targets from the pack, fillers pattern present
        XCTAssertEqual(Speaking.bank(P).count, 40)
        XCTAssertEqual(Speaking.parts(P).map(\.target), [[20, 40], [90, 120], [40, 70]])
        XCTAssertEqual(Speaking.part("p2", P).prep, 60)
        // the starter that ships in the app opens #/speaking offline
        let starter = try XCTUnwrap(SpeakPack.bundled())
        XCTAssertEqual(Speaking.bank(starter).count, 8)
        XCTAssertFalse(starter.speaking.s("fillers").isEmpty)
        // shadowing: the average divides by the NUMBER OF SENTENCES, a skipped one adds 0
        var sh = Speaking.Shadow(["a", "b", "c"])
        sh.scored(100); sh.skip(); sh.scored(100)
        XCTAssertTrue(sh.finished); XCTAssertEqual(sh.average, 67)
        XCTAssertEqual(Speaking.Shadow.reward, ["spoken": 3, "xp": 10])
        // a drill without a mic: tap the words in order, at most 1 star, the line is recorded but nothing is rewarded
        let s = try situation("cafe")
        var d = SpeakDrill(s, lang: "vi", stage: nil, store: .object([:]), week: SpeakSit.weekKey(now(V), calendar: tz()), shuffle: { $0 })
        _ = d.attempt(SpeakScore.result(target: d.target, heard: "", platformScore: 0, seconds: 0, error: "not-allowed"), nowMs: 0)
        XCTAssertTrue(d.noMic)
        var fx = SpeakDrill.Effect()
        for k in 0..<d.target.split(separator: " ").count { fx = d.tap(k) }
        XCTAssertEqual(d.res?.stars, 1)
        XCTAssertNil(fx.reward); XCTAssertTrue(fx.wrote); XCTAssertTrue(fx.speakLine)
        // three beats: the stars never exceed 1 without a mic, even on the memory beat; still no reward
        for _ in 0..<2 {
            _ = d.next()
            for k in 0..<d.target.split(separator: " ").count { fx = d.tap(k) }
            XCTAssertEqual(d.res?.stars, 1); XCTAssertNil(fx.reward)
        }
        XCTAssertEqual(d.b, 2)
        // a drill WITH a mic earns the reward `spoken 1, xp 2·stars`
        var m = SpeakDrill(s, lang: "vi", stage: nil, store: .object([:]), week: "2026-W2", shuffle: { $0 })
        m.micStarted(nowMs: 0)
        let ok = m.attempt(SpeakScore.result(target: m.target, heard: m.target, platformScore: 100, seconds: 2), nowMs: 2000)
        XCTAssertEqual(ok.reward, ["spoken": 1, "xp": 2])
        XCTAssertEqual(m.store["cafe"]?["lines"]?["o1"]?.i("stars"), 1)
        XCTAssertEqual(Int(JSON.orZero(m.store["week"]?["2026-W2"])), 1)
    }

    // MARK: shared.recognize
    func testSharedRecognizeBest() throws {
        let V = try vec(); var r = R()
        for c in V["shared"]?["recognize"]?.list("best") ?? [] {
            let i = c["input"]!, o = c["out"]!, id = c.s("id")
            let b = Recognize.best(target: i.s("target"), alts: i.strs("alts"))
            r.eq(b.heard, o.s("heard"), "\(id) heard"); r.eq(b.score, o.i("score"), "\(id) score")
        }
        finish(r, "shared.recognize.best")
    }

    // MARK: shared.speak
    func testSharedSpeak() throws {
        let V = try vec(); var r = R()
        let sp = V["shared"]?["speak"] ?? .null
        r.eq(SpeakScore.cal.a, sp["cal"]?.d("a") ?? 0, "cal.a"); r.eq(SpeakScore.cal.b, sp["cal"]?.d("b") ?? 0, "cal.b")
        for c in sp.list("align") {
            let i = c["input"]!, id = c.s("id")
            let got = SpeakScore.align(i.s("target"), i.s("heard")), want = c.list("out")
            r.eq(got.count, want.count, "\(id) count")
            for (k, w) in want.enumerated() where k < got.count { r.eq(got[k].w, w.s("w"), "\(id)[\(k)].w"); r.eq(got[k].ok, w.t("ok"), "\(id)[\(k)].ok") }
        }
        for c in sp.list("pass") {
            var res: SpeakScore.Result?
            if let i = c["input"], i.isObject { res = SpeakScore.Result(text: i.d("text") ?? 0, words: [], wpm: 0, conf: 0, heard: ""); res?.unclear = i.t("unclear") }
            r.eq(SpeakScore.pass(res), c["out"]?.truthy ?? false, "pass \(c["input"]?.stableString ?? "nil")")
        }
        for c in sp.list("intentOf") {
            let i = c["input"]!
            let intents = i.list("intents").map { (id: $0.s("id"), keywords: $0.strs("keywords")) }
            r.eq(SpeakScore.intentOf(i.s("heard"), intents), c["out"]?.string, "intentOf \(i.s("heard"))")
        }
        for c in sp.list("toks") { r.eq(SpeakScore.toks(c["input"]?.string ?? ""), (c["out"]?.array ?? []).compactMap(\.string), "toks \(c["input"]?.string ?? "")") }
        // the scripted flows: Speak.score over the platform events (start / result / error); the clock is the events' `at`
        for c in sp.list("flows") {
            let id = c.s("id"), o = c["opts"] ?? c["input"]?["opts"] ?? .null, script = c["input"]?.list("script") ?? []
            let target = o.s("target")
            let begin = script.first { $0.s("ev") == "start" }?.d("at") ?? 0
            var res: SpeakScore.Result
            if let ev = script.first(where: { $0.s("ev") == "result" || $0.s("ev") == "error" }) {
                let at = ev.d("at") ?? 0
                let intents: [(id: String, keywords: [String])]? = o["intents"]?.array?.map { (id: $0.s("id"), keywords: $0.strs("keywords")) }
                if ev.s("ev") == "result" {
                    let b = Recognize.best(target: target, alts: [ev.s("heard")])
                    res = SpeakScore.result(target: target, heard: ev.s("heard"), platformScore: ev.i("score"), seconds: (at - begin) / 1000, intents: intents)
                    r.eq(b.heard, ev.s("heard").trimmingCharacters(in: .whitespaces), "\(id) best.heard")
                } else {
                    res = SpeakScore.result(target: target, heard: "", platformScore: nil, seconds: (at - begin) / 1000, error: ev.s("code"), intents: intents)
                }
            } else {
                res = SpeakScore.result(target: target, heard: "", platformScore: nil, seconds: 0, error: "unsupported")
            }
            let want = c["out"]?["result"] ?? .null
            r.check(abs(res.text - (want.d("text") ?? -1)) < 1e-8, "\(id) text \(res.text) vs \(want.d("text") ?? -1)")
            r.eq(res.wpm, want["fluency"]?.i("wpm") ?? -1, "\(id) wpm")
            r.check(abs(res.conf - (want.d("conf") ?? -1)) < 1e-9, "\(id) conf")
            r.eq(res.heard, want.s("heard"), "\(id) heard")
            r.eq(res.unclear, want.t("unclear"), "\(id) unclear")
            r.eq(res.error, want["error"]?.string, "\(id) error")
            r.eq(res.intent, want["intent"]?.string, "\(id) intent")
            let wantWords = want.list("words")
            r.eq(res.words.map(\.w), wantWords.map { $0.s("w") }, "\(id) words"); r.eq(res.words.map(\.ok), wantWords.map { $0.t("ok") }, "\(id) ok")
        }
        finish(r, "shared.speak")
    }

    // MARK: speak.situation
    func testSpeakSituation() throws {
        let V = try vec(); var r = R()
        for c in V["speak"]?.list("situation") ?? [] {
            let id = c.s("id"), i = c["input"]!, o = c["out"]!
            guard o["nodes"] != nil else { continue }   // the redirect / flag cases are routing (SpeakParityTests in LKFeaturesTests)
            let s = try situation(i.s("arg"))
            let store = i["progress"] ?? .object([:])
            let expectIpa = Dictionary(o.list("addon").map { ($0.s("w"), $0.s("ipa")) }, uniquingKeysWith: { a, _ in a })
            let cards: [JSON] = i.strs("cards").map { n in n == "please" ? .obj([("w", .string(n))]) : .obj([("word", .string(n)), ("ipa", .string(expectIpa[n] ?? ""))]) }
            let h = SpeakSit.hub(s, lang: "vi", store: store, week: SpeakSit.weekKey(now(V), calendar: tz()), cards: cards)
            r.eq(h.title, o.s("title"), "\(id) title"); r.eq("Luyện nói theo câu • \(h.cefr)", o.s("sub"), "\(id) sub"); r.eq(h.mission, o.s("mission"), "\(id) mission")
            r.eq(h.stageN, o["stage"]?["v"]?.i("n") ?? -1, "\(id) stage n"); r.eq(h.stageM, o["stage"]?["v"]?.i("m") ?? -1, "\(id) stage m")
            let nodes = o.list("nodes")
            r.eq(h.nodes.count, nodes.count, "\(id) nodes")
            for (k, n) in nodes.enumerated() where k < h.nodes.count {
                r.eq(h.nodes[k].label, n.s("label"), "\(id) node label"); r.eq(h.nodes[k].state, n.s("st"), "\(id) node st"); r.eq(h.nodes[k].stars, n.i("stars"), "\(id) node stars")
                r.eq("#/speak/\(s.s("id"))/drill?stage=\(h.nodes[k].stageId)", n.s("href"), "\(id) node href")
                r.eq(n["starsAria"]?["v"]?.i("n"), h.nodes[k].stars, "\(id) aria")
            }
            let tasks = o.list("tasks")
            r.eq(h.tasks.count, tasks.count, "\(id) tasks")
            for (k, t) in tasks.enumerated() where k < h.tasks.count {
                r.eq(h.tasks[k].title, t.s("title"), "\(id) task title"); r.eq(h.tasks[k].example, t.s("ex"), "\(id) task ex"); r.eq(h.tasks[k].done, t.t("done"), "\(id) task done"); r.eq(h.tasks[k].state, t.s("st"), "\(id) task st")
            }
            r.eq(h.tasks.filter(\.done).count, o["taskDone"]?["v"]?.i("n") ?? -1, "\(id) taskDone n"); r.eq(h.tasks.count, o["taskDone"]?["v"]?.i("m") ?? -1, "\(id) taskDone m")
            r.eq("\(h.mastered) / \(h.total)", o.s("mastered"), "\(id) mastered"); r.eq(h.pct, o.i("pct"), "\(id) pct")
            r.eq(h.remaining, o["remain"]?["v"]?.i("n") ?? -1, "\(id) remain"); r.eq(h.week, o["week"]?["v"]?.i("n") ?? -1, "\(id) week"); r.eq(SpeakSit.weekGoal, o["week"]?["v"]?.i("m") ?? -1, "\(id) goal")
            r.eq(h.addon.map(\.w), o.list("addon").map { $0.s("w") }, "\(id) addon w"); r.eq(h.addon.map(\.ipa), o.list("addon").map { $0.s("ipa") }, "\(id) addon ipa")
            r.eq(h.culture, o.s("culture"), "\(id) culture")
            r.eq(o.s("back"), "#/skills", "\(id) back"); r.eq(o.s("start"), "#/speak/\(s.s("id"))/drill", "\(id) start"); r.eq(o.s("rp"), "#/roleplay", "\(id) rp")
        }
        finish(r, "speak.situation")
    }

    // MARK: speak.drill
    func testSpeakDrill() throws {
        let V = try vec(); var r = R()
        let s = try situation("cafe")
        let wk = SpeakSit.weekKey(now(V), calendar: tz())
        func beats(_ b: Int) -> [String] { ["listen", "shadow", "memory"].enumerated().map { $0.element + ($0.offset == b ? "*" : ($0.offset < b ? "+" : "")) } }
        func state(_ d: SpeakDrill, _ t: JSON, _ label: String, _ r: inout R) {
            r.eq(d.i + 1, t["line"]?["v"]?.i("n") ?? -1, "\(label) line n"); r.eq(d.count, t["line"]?["v"]?.i("m") ?? -1, "\(label) line m")
            r.eq(d.progressPct, t.i("pct"), "\(label) pct"); r.eq(d.i, t.i("done"), "\(label) done"); r.eq(d.count, t.i("total"), "\(label) total")
            r.eq(beats(d.b), t.strs("beats"), "\(label) beats")
            r.diff(.string(d.say.key), key(t["say"]), "\(label) say")
            r.eq(d.gloss, t.s("hint"), "\(label) hint")
            r.eq(d.wordList.map { ($0.pending ? "P" : "") + ($0.bad ? "X" : "") + $0.w }.joined(separator: " "), t.s("words"), "\(label) words")
            r.eq(d.res != nil, t.t("res"), "\(label) res"); r.eq(d.res.map { String($0.score) } ?? "0", t.s("score"), "\(label) score")
            r.diff(d.res.map { .string($0.verdictKey) } ?? .string(""), key(t["verdict"]) ?? .string(""), "\(label) verdict")
            r.diff(d.res?.sub ?? .string(""), key(t["sub"]) ?? .string(""), "\(label) sub")
            r.eq(d.res?.stars ?? 0, t.i("stars"), "\(label) stars"); r.eq(d.canNext, t.t("canNext"), "\(label) canNext"); r.eq(d.noMic, t.t("noMic"), "\(label) noMic")
            r.diff(.string(d.altKey), key(t["alt"]), "\(label) alt")
            let want = t["tip"]?.string?.replacingOccurrences(of: "&#39;", with: "'").replacingOccurrences(of: "&quot;", with: "\"")
            r.eq(d.tip?.html.replacingOccurrences(of: "&#39;", with: "'"), want, "\(label) tip")
        }
        for c in V["speak"]?.list("drill") ?? [] {
            let id = c.s("id"), i = c["input"]!, trace = c["out"]?.list("trace") ?? []
            var query = [String: String]()
            for kv in i.s("query").split(separator: "&") { let p = kv.split(separator: "=", maxSplits: 1).map(String.init); if p.count == 2 { query[p[0]] = p[1] } }
            var d = SpeakDrill(s, lang: "vi", stage: query["stage"], store: i["progress"] ?? .object([:]), week: wk, shuffle: { $0 })
            state(d, trace[0], "\(id) open", &r)
            var clock: Int64 = 100_000
            for (k, step) in i.list("script").enumerated() {
                let t = trace[k + 1], label = "\(id) step \(k + 1) (\(t.s("step")))"
                var fx = SpeakDrill.Effect()
                if let mic = step["mic"] {
                    d.micStarted(nowMs: clock)
                    let ms = Int64(mic.d("ms") ?? 0); clock += ms
                    let heard = mic.s("heard") == "=" ? d.target : mic.s("heard")
                    let sc = SpeakScore.result(target: d.target, heard: heard, platformScore: mic["error"] == nil ? (mic["score"]?.double.map { Int($0) } ?? 100) : nil, seconds: Double(ms) / 1000, error: mic["error"]?.string)
                    fx = d.attempt(sc, nowMs: clock)
                } else if let tap = step["tap"]?.double { fx = d.tap(Int(tap)) }
                else if step.s("act") == "spkNext" { fx = d.next() }
                else if step.s("act") == "spkRetry" { fx = d.retry() }
                else { r.check(false, "\(label): unknown step") }
                if let fin = t["toasts"]?.array?.first { r.eq(fx.finishedCount, fin["v"]?.i("n"), "\(label) finished") }
                else { r.eq(fx.finishedCount, nil, "\(label) not finished"); state(d, t, label, &r) }
                if let w = t["writes"]?.array { r.eq(fx.wrote ? 1 : 0, w.count, "\(label) writes"); if let first = w.first { r.diff(d.store, first["lk.spk"], "\(label) lk.spk") } }
                if let rw = t["rewards"]?.array { r.eq(fx.reward != nil ? 1 : 0, rw.count, "\(label) rewards"); if let first = rw.first, let got = fx.reward { r.diff(.obj(got.map { ($0.key, .int($0.value)) }), first, "\(label) reward") } }
                if let tts = t["tts"]?.array { r.eq(fx.speakLine ? 1 : 0, tts.count, "\(label) tts"); if let f = tts.first { r.eq(d.target, f.s("text"), "\(label) tts text"); r.eq("en-US", f.s("accent"), "\(label) tts accent") } }
            }
        }
        finish(r, "speak.drill")
    }

    // MARK: speak.fill
    func testSpeakFill() throws {
        let V = try vec(); var r = R()
        for c in V["speak"]?.list("fill") ?? [] {
            let i = c["input"]!
            // the base in the order the web file writes it (SPK_fill walks keys in insertion order); the vector's own JSON is unordered here
            let text = #"{"title":{"en":"A"},"lines":[{"en":"x","gloss":{"en":"g"},"pitfalls":[{"note":{"en":"n"}}]}],"plain":"keep"}"#
            let base = try XCTUnwrap(SpeakSit.Ordered.parse(text))
            r.diff(base.json, i["base"], "base")
            r.diff(SpeakSit.fill(base, i.list("arr"), lang: i.s("lang")), c["out"], "fill")
        }
        // the real files: the same key order in the text decides which translation goes where
        let cafe = try situation("cafe")
        r.eq(cafe["title"]?.s("vi"), "Quán cà phê & nhà hàng", "cafe vi title")
        r.eq(cafe.list("lines").first?["gloss"]?.s("vi"), "Cho tôi một ly latte cỡ vừa nhé.", "cafe vi gloss")
        finish(r, "speak.fill")
    }

    // MARK: speaking.render
    func testSpeakingRender() throws {
        let V = try vec(), P = try pack(); var r = R()
        let bank = Speaking.bank(P)
        for c in V["speaking"]?.list("render") ?? [] {
            let id = c.s("id"), i = c["input"]!, o = c["out"]!
            if i["taps"] != nil || i["select"] != nil { continue }   // next-question / navigation: below
            let ro = Speaking.route(i.s("arg"), bankCount: bank.count), topic = bank[ro.topic], part = Speaking.part(ro.part, P)
            r.eq(o.list("tabs").filter { $0.t("on") }.map { $0.s("part") }, [ro.part], "\(id) tab")
            r.eq(o.list("tabs").map { $0.s("part") }, Speaking.partIds, "\(id) tabs")
            r.eq(o.list("tabs").map { $0["label"]?.s("k") ?? "" }, Speaking.parts(P).map(\.name), "\(id) labels")
            r.eq(o["desc"]?.s("k"), part.desc, "\(id) desc")
            r.eq(o["clockHint"]?["v"]?.i("a"), part.lo, "\(id) lo"); r.eq(o["clockHint"]?["v"]?.i("b"), part.hi, "\(id) hi")
            let qs = Speaking.questions(topic, part: ro.part)
            r.eq(o["topicCount"]?["v"]?.i("n"), bank.count, "\(id) topics"); r.eq(o["hasNext"]?.truthy, qs.count > 1, "\(id) hasNext")
            if qs.count > 1 { r.eq(o["qIdx"]?["v"]?.i("n"), qs.count, "\(id) qIdx n") }
            let ask = Speaking.askText(topic, part: ro.part, question: qs[0])
            // the vector's text is the page text (cue card pieces glued); the examiner's own sentence is `spoken`
            r.eq(o.list("spoken").first?.s("text"), ask, "\(id) spoken")
            if ro.part != "p2" { r.eq(o.s("question"), qs[0], "\(id) question") } else { r.check(o.s("question").hasPrefix(topic["p2"]?.s("q") ?? "?"), "\(id) cue card") }
            // the vector's tips are the page text (tags stripped); the pack keeps the web key with its <i>
            r.eq(o.list("tips").map { $0.s("k") }, Speaking.tips(P, part: ro.part).map { $0.replacingOccurrences(of: "<[^>]*>", with: "", options: .regularExpression) }, "\(id) tips")
            r.eq(Int(o["bankSize"]?.double ?? -1), bank.count, "\(id) bank")
            r.eq(o.list("spoken").first?.s("accent"), i.s("accent"), "\(id) accent")
            if let w = o.list("waits").first?.array?.last?.double { r.eq(Speaking.openSpeakDelayMs, Int(w), "\(id) wait") }
            r.eq(o["recHint"]?.s("k"), ro.part == "p2" ? "Bấm micro để trả lời (sẽ có 1 phút chuẩn bị)" : "Bấm micro để trả lời", "\(id) recHint")
            // the sample box exists exactly when a sample answer is stored under the question (Part 2: the cue card)
            let key = ro.part == "p2" ? (topic["p2"]?.s("q") ?? "") : qs[0]
            r.eq(o["sampleBox"]?.string?.isEmpty == false, Speaking.sample(P, key: key) != nil, "\(id) sampleBox")
        }
        // next question: qi wraps over the questions
        let nq = (V["speaking"]?.list("render") ?? []).first { $0.s("id") == "next-question" }
        if let nq {
            let ro = Speaking.route(nq["input"]?.s("arg"), bankCount: bank.count), qs = Speaking.questions(bank[ro.topic], part: ro.part)
            let n = Int(nq["input"]?.d("taps") ?? 0)
            r.eq((1...n).map { qs[$0 % qs.count] }, nq["out"]?.strs("spoken") ?? [], "next-question spoken")
        } else { r.check(false, "next-question case missing") }
        // navigation: hash targets
        if let nav = (V["speaking"]?.list("render") ?? []).first(where: { $0.s("id") == "navigation" }) {
            let sel = Int(nav["input"]?.d("select") ?? -1), o = nav["out"]!
            r.eq("#/speaking/p1/\(sel)", o.s("afterSelect"), "nav select")
            r.eq(Speaking.route("p2/0", bankCount: bank.count).part, "p2", "nav part"); r.eq("#/speaking/p2/\(Speaking.route("p2/0", bankCount: bank.count).topic)", o.s("afterPartTab"), "nav part tab")
        } else { r.check(false, "navigation case missing") }
        finish(r, "speaking.render")
    }

    // MARK: speaking.analyse
    func testSpeakingAnalyse() throws {
        let V = try vec(), P = try pack(), L = try lexis(V); var r = R()
        for c in V["speaking"]?.list("analyse") ?? [] {
            let id = c.s("id"), i = c["input"]!, o = c["out"]!
            guard i["seconds"] != nil else { continue }   // mic-denied / no-recognizer: platform paths, below
            let ro = Speaking.route(i.s("arg"), bankCount: Speaking.bank(P).count), part = Speaking.part(i.s("part"), P)
            // what the recogniser delivered: one final string, a list (the last entry is still interim) or nothing
            var finals: [String] = [], interim = ""
            if let s = i["recognised"]?.string { finals = [s] } else if let a = i["recognised"]?.array?.compactMap(\.string), !a.isEmpty { finals = Array(a.dropLast()); interim = a.last ?? "" }
            let text = Speaking.transcript(final: finals, interim: interim)
            let secs = i.d("seconds") ?? 0
            // the topic words found: the candidates are the chips the web shows plus words that do not occur
            let candidates = o.list("chips").filter { $0.s("kind") == "ok" }.map { $0.s("text") } + ["zzzword"]
            let found = Speaking.topicWordsFound(in: text, words: candidates)
            let a = Speaking.analyse(text: text, seconds: secs, part: part, fillers: P.speaking.s("fillers"), lexis: L, topicWords: found)
            let stats = o.list("stats")
            r.eq(["\(a.seconds)s", Speaking.wpmShown(a), String(a.words), String(a.fillers)], stats.map { $0.s("value") }, "\(id) stats")
            r.eq(a.notes.count, o.list("notes").count, "\(id) notes count")
            for (k, n) in o.list("notes").enumerated() where k < a.notes.count { r.diff(a.notes[k], n, "\(id) note \(k)") }
            r.eq(a.chips.map { $0.kind + ":" + $0.text }, o.list("chips").map { $0.s("kind") + ":" + $0.s("text") }, "\(id) chips")
            r.eq(!a.transcript.isEmpty, o.t("hasTranscript"), "\(id) transcript")
            r.eq(Speaking.live(final: finals, interim: interim), o.s("live"), "\(id) live")
            r.diff(a.reward.map { .obj($0.map { ($0.key, .int($0.value)) }) }, o.list("rewards").first, "\(id) reward")
            r.eq(ro.part, i.s("part"), "\(id) part")
            // `hasAudio` (the recorded clip) and `aiAttached` (web AI helper) have no native counterpart: nothing is stored, the AI is M6
        }
        finish(r, "speaking.analyse")
    }

    // MARK: speaking.timer
    func testSpeakingTimer() throws {
        let V = try vec(), P = try pack(); var r = R()
        for c in V["speaking"]?.list("timer") ?? [] {
            let id = c.s("id"), i = c["input"]!, o = c["out"]!, part = Speaking.part(i.s("part"), P)
            if id == "p2-prep" {
                let prep = part.prep ?? 0
                r.eq(prep, i.i("prepSeconds"), "\(id) prep")
                r.eq(Speaking.clock(Double(prep)), o.s("initial"), "\(id) initial")
                r.eq([Speaking.clock(Double(prep - 1)), Speaking.clock(1), Speaking.clock(0)], o.strs("ticks"), "\(id) ticks")
                r.eq(Speaking.prepTickMs, 1000, "\(id) tick")
                continue
            }
            r.eq(o.t("continuous"), true, "\(id) continuous"); r.eq(o.s("srLang"), "en-GB", "\(id) lang")
            var stopped = false
            for st in o.list("steps") {
                let secs = st.d("secs") ?? 0
                r.eq(Speaking.clock(secs), st.s("text"), "\(id) clock \(secs)")
                let tone = Speaking.tone(secs, part)
                r.eq(tone == .again ? "var(--again)" : (tone == .good ? "var(--good)" : ""), st.s("color"), "\(id) tone \(secs)")
                if Speaking.autoStop(secs, part) { stopped = true }
            }
            r.eq(stopped, o.t("stoppedAutomatically"), "\(id) autostop")
            r.eq(Speaking.clockTickMs, 250, "\(id) tick ms")
        }
        finish(r, "speaking.timer")
    }

    // MARK: speaking.shadow
    func testSpeakingShadow() throws {
        let V = try vec(), P = try pack(); var r = R()
        for c in V["speaking"]?.list("shadow") ?? [] {
            let id = c.s("id"), i = c["input"]!, o = c["out"]!
            let smp = try XCTUnwrap(Speaking.sample(P, key: i.s("question")), id)
            if id == "sample-box" {
                r.eq(smp.sentences, o.strs("expectedSentences"), "\(id) sentences"); r.eq(smp.sentences, o.strs("sentences"), "\(id) sentences (web)")
                r.eq(smp.vocab.map { [$0.en, $0.vi] }, o.list("vocab").map { ($0.array ?? []).compactMap(\.string) }, "\(id) vocab")
                continue
            }
            var sh = Speaking.Shadow(i.strs("sentences"))
            r.eq(sh.sentences, smp.sentences, "\(id) sentences = the sample's")
            for (k, step) in i.list("script").enumerated() {
                let want = o.list("steps")[k]
                r.eq(sh.current, want.s("sentence"), "\(id) sentence \(k)")
                if step.t("skip") { r.eq(want.s("action"), "skip", "\(id) action"); sh.skip() }
                else {
                    let score = step.i("score")
                    r.eq(score, want.i("score"), "\(id) score")
                    let v = Speaking.verdict(score)
                    r.eq(v == .good ? "--good" : (v == .medium ? "--hard" : "--again"), want.s("verdictColor"), "\(id) colour")
                    sh.scored(score)
                }
            }
            r.check(sh.finished, "\(id) finished")
            r.eq(sh.average, o.list("final").first?["v"]?.i("pct") ?? -1, "\(id) average")
            r.diff(.obj(Speaking.Shadow.reward.map { ($0.key, .int($0.value)) }), o.list("rewards").first, "\(id) reward")
        }
        finish(r, "speaking.shadow")
    }
}
