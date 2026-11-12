import Foundation
import XCTest
@testable import LKSync
@testable import LKStore
@testable import LKCore
import LKStrings

/// M4 P07 – #/pron logic (LKStore/Speak/PronCore.swift) against vectors/speak.json `pron.*`, produced by running the REAL web code
/// (scripts/native/gen-speak.mjs; docs/specs/native-m4-vectors.md). One test per key of the file, every case checked. Microphone, speech, audio and timers are
/// inputs of each case (heard text, alternatives, error codes, random numbers); the sound-effect names and CSS class lists are the only fields not asserted
/// (they name web DOM, the port has its own views). The full 62-lesson pack is read from web/data/speak-pack.json of the same checkout.
@MainActor
final class SpeakPronVectorTests: XCTestCase {
    struct PronR {
        var checked = 0
        var failures: [String] = []
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) { checked += 1; if !ok { if failures.count < 25 { failures.append(s()) } else if failures.count == 25 { failures.append("…") } } }
        mutating func eq<T: Equatable>(_ a: T, _ b: T, _ label: String) { check(a == b, "\(label): \(a) ≠ \(b)") }
        mutating func near(_ a: Double, _ b: Double, _ label: String) { check(abs(a - b) < 1e-6, "\(label): \(a) ≠ \(b)") }
        mutating func diff(_ a: JSON?, _ b: JSON?, _ label: String) { let d = jsonDiff(a, b); check(d == nil, "\(label): \(d ?? "")") }
    }
    func finish(_ r: PronR, _ name: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThan(r.checked, 0, "\(name): nothing checked", file: file, line: line)
        XCTAssertTrue(r.failures.isEmpty, "\(name): \(r.failures.count) of \(r.checked) failed:\n" + r.failures.joined(separator: "\n"), file: file, line: line)
    }

    // MARK: fixtures
    static var cachedV: JSON?, cachedPack: SpeakPack?
    func vec() throws -> JSON { if let v = Self.cachedV { return v }; let v = try Vectors.load("speak.json"); Self.cachedV = v; return v }
    func pack() throws -> SpeakPack {
        if let p = Self.cachedPack { return p }
        let url = Vectors.dir.appendingPathComponent("../../../../web/data/speak-pack.json").standardized
        let p = SpeakPack(json: try JSON.parse(try Data(contentsOf: url)))
        XCTAssertEqual(p.pron.list("lessons").count, 62)
        Self.cachedPack = p; return p
    }
    func pairs() throws -> PronPairs { PronPairs(json: try pack().pron["pairs"] ?? .null) }
    func coach() throws -> PronCoach { let p = try pack(); return PronCoach(coach: p.pron["coach"] ?? .null, weak: p.consts["weak"] ?? .null) }
    func lessons() throws -> [JSON] { try pack().pron.list("lessons") }
    func P(_ V: JSON) -> JSON { V["pron"] ?? .null }
    /// the vector's random numbers, cycled
    func cycle(_ a: [JSON]) -> () -> Double {
        let n = a.map { $0.double ?? 0 }
        var i = 0
        return { let v = n[i % n.count]; i += 1; return v }
    }
    func stats(_ j: JSON?) -> PronStats { PronPairs.stats(j ?? .object([:])) }
    func round9(_ d: Double) -> Double { (d * 1e9).rounded() / 1e9 }
    func rhythm(_ j: JSON?) -> [Int: Int] { var r: [Int: Int] = [:]; for (k, v) in j?.object ?? [:] { if let i = Int(k) { r[i] = Int(JSON.orZero(v)) } }; return r }

    // MARK: parity
    /// P07 #/pron: the lesson best is saved only with ≥ min(5, n) scored words and never lowers; pair practice and its tips are en-US; the lesson text is Vietnamese
    /// only, so a language without a translation shows the English summary of the Vietnamese key (never a raw key for the UI chrome).
    func testParityP07Pron() throws {
        // ≥ min(5, n) words, never lowers
        XCTAssertNil(PronLessonRules.savedBest(scores: [0: 90, 1: 90, 2: 90, 3: 90], wordCount: 8, old: 0))
        XCTAssertEqual(PronLessonRules.savedBest(scores: [0: 90, 1: 70, 2: 50, 3: 85, 4: 65], wordCount: 8, old: 0), 72)
        XCTAssertNil(PronLessonRules.savedBest(scores: [0: 70, 1: 70, 2: 70, 3: 70, 4: 70], wordCount: 8, old: 95))
        XCTAssertEqual(PronLessonRules.savedBest(scores: [0: 80, 1: 80], wordCount: 2, old: 0), 80)   // min(5, 2) = 2
        XCTAssertEqual(PronLessonRules.quizFinish(right: 3, n: 5, old: 90).best, nil)
        XCTAssertEqual(PronLessonRules.quizFinish(right: 5, n: 5, old: 90).best, 100)
        // the pack's pair words are the same ones everywhere (one source)
        let pr = try pairs()
        XCTAssertFalse(pr.contrasts.isEmpty)
        for c in pr.contrasts { XCTAssertFalse(pr.pairsOf(c).isEmpty, c.id); XCTAssertEqual(pr.tips[c.id]?.count, 2, "tips of \(c.id)"); XCTAssertNotNil(pr.labels[c.id], c.id) }
        // every lesson of the pack has the fields the screen reads
        for l in try lessons() { XCTAssertFalse(l.s("title").isEmpty, l.s("id")); XCTAssertFalse(l.list("words").isEmpty, l.s("id")) }
        // vi-only text: a language other than vi/en renders the Vietnamese key through the English table (L10n.translate maps the key text to its id)
        let de = L10n(lang: "de"), en = L10n(lang: "en")
        for key in ["Nghe mẫu", "Luyện nói cặp từ", "hữu thanh (rung cổ)"] { XCTAssertEqual(SpeakText.render(.string(key), en), en.translate(source: key)) }
        XCTAssertEqual(SpeakText.render(.string("Một câu chỉ có tiếng Việt"), de), "Một câu chỉ có tiếng Việt")   // data the tables do not know stays as it is
        // "Nói thử" decides on en-US words only through its own table and keeps the contrast order of the lesson
        let ss = PronSaySession(pairs: pr, contrasts: pr.forSkill("th-sounds"), stats: [:], random: { 0.5 })
        XCTAssertEqual(ss.queue.count, PronSaySession.size)
        XCTAssertEqual(Set(ss.queue.map(\.c)).subtracting(pr.forSkill("th-sounds").map(\.id)), [])
    }

    // MARK: pron.mouth
    func testPronMouth() throws {
        var r = PronR()
        for (i, c) in P(try vec()).list("mouth").enumerated() {
            guard let m = PronLessonRules.mouth(c["input"] ?? .null) else { r.check(false, "mouth[\(i)] nil"); continue }
            let o = c["out"] ?? .null
            for (name, got) in [("outerLip", m.outer), ("innerMouth", m.inner), ("tongue", m.tongue)] {
                let want = o.list(name).map { $0.double ?? .nan }
                r.eq(got.count, want.count, "mouth[\(i)].\(name).count")
                for (a, b) in zip(got, want) { r.near(a, b, "mouth[\(i)].\(name)") }
            }
            r.eq("\(m.lipsKey) · \(m.jawKey)", o.s("caption"), "mouth[\(i)].caption")
        }
        r.check(PronLessonRules.mouth(["tongue": "front"]) == nil, "no lips ⇒ no diagram")
        finish(r, "pron.mouth")
    }

    // MARK: pron.hub
    func testPronHub() throws {
        var r = PronR()
        for c in P(try vec()).list("hub") {
            let id = c.s("id"), o = c["out"] ?? .null
            let h = PronHub.build(lessons: try lessons(), pronDone: c["input"]?["pronDone"] ?? .object([:]))
            r.eq(h.ring, o.i("ring"), "\(id).ring"); r.eq(h.ringLabel, o.s("ringLabel"), "\(id).ringLabel"); r.eq(h.lessonCount, o.i("lessonCount"), "\(id).lessonCount")
            let og = o.list("groups")
            r.eq(h.groupList.count, og.count, "\(id).groups")
            for (g, w) in zip(h.groupList, og) {
                r.eq(g.titleKey, w["title"]?.s("k") ?? "", "\(id).\(g.id).title"); r.eq(g.descKey, w["desc"]?.s("k") ?? "", "\(id).\(g.id).desc")
                r.eq(g.chart, w.t("chart"), "\(id).\(g.id).chart")
                // the vector lists the first lessons and "…" for a long group
                let want = w.strs("lessons")
                if want.last == "…" { r.eq(Array(g.lessons.prefix(want.count - 1)), Array(want.dropLast()), "\(id).\(g.id).lessons") } else { r.eq(g.lessons, want, "\(id).\(g.id).lessons") }
                r.eq(Array(g.done.keys).sorted(), (w["done"]?.object ?? [:]).keys.sorted(), "\(id).\(g.id).done keys")
                for (k, v) in w["done"]?.object ?? [:] { r.eq(v == .bool(true) ? g.chart : g.done[k] == Int(JSON.orZero(v)), true, "\(id).\(g.id).done[\(k)]") }
                r.eq(g.unvoiced, w.strs("unvoiced"), "\(id).\(g.id).unvoiced")
                r.eq(g.lessons.count, o["counts"]?.i(g.titleKey) ?? -1, "\(id).\(g.id).count")
            }
        }
        finish(r, "pron.hub")
    }

    // MARK: pron.lesson (render, word/sentence microphone, quick quiz)
    func testPronLesson() throws {
        var r = PronR()
        let all = try lessons(), pr = try pairs()
        for c in P(try vec()).list("lesson") {
            let id = c.s("id"), inp = c["input"] ?? .null, o = c["out"] ?? .null
            let lid = inp.s("lesson")
            guard let i = all.firstIndex(where: { $0.s("id") == lid }) else { r.check(o.t("hub"), "\(id): unknown lesson ⇒ hub"); continue }
            let x = all[i]
            if o["back"] != nil {
                r.eq("#/pron", o.s("back"), "\(id).back"); r.eq(x.s("ipa"), o.s("ipa"), "\(id).ipa"); r.eq(x.s("title"), o.s("title"), "\(id).title")
                r.eq(PronLessonRules.chips(x["mouth"] ?? .null), o.list("chips").map { $0.s("k") }, "\(id).chips")
                r.eq(PronLessonRules.mouth(x["mouth"] ?? .null) != nil, o.t("hasMouth"), "\(id).hasMouth")
                r.eq(x.list("rules").count, o.i("rules"), "\(id).rules"); r.eq(x.list("words").count, o.i("words"), "\(id).words")
                r.eq(x.list("pairs").count, o.i("pairs"), "\(id).pairs"); r.eq(x.list("sentences").count, o.i("sentences"), "\(id).sentences"); r.eq(x.list("quiz").count, o.i("quiz"), "\(id).quiz")
                let sec = o["sections"] ?? .null
                r.eq(!pr.forSkill(lid).isEmpty, sec.t("sayIt"), "\(id).sayIt"); r.eq(PronLessonRules.rhythm.contains(lid), sec.t("rhythm"), "\(id).rhythm")
                r.eq(!x.list("pairs").isEmpty, sec.t("pairGame"), "\(id).pairGame")
                r.eq(i > 0 ? PronLessonRules.href(all[i - 1].s("id")) : nil, o["prev"]?.string, "\(id).prev")
                r.eq(i + 1 < all.count ? PronLessonRules.href(all[i + 1].s("id")) : "#/pron", o["next"]?.string ?? "#/pron", "\(id).next")
                let fw = o.list("firstWordSpoken").first
                r.eq(x.list("words").first?.s("w"), fw?.s("word"), "\(id).firstWord"); r.eq(inp.s("accent"), fw?.s("accent") ?? "", "\(id).accent")
                r.eq(o.list("waits").first?.array?.last?.double ?? -1, Double(PronLessonRules.firstWordDelayMs), "\(id).wait")
            } else if inp["picks"] != nil {
                // quick quiz
                var q = PronLessonRules.Quiz(answers: (inp["answers"]?.array ?? []).map { Int($0.double ?? 0) })
                let answers = x.list("quiz").map { Int($0["answer"]?.double ?? 0) }
                r.eq(q.answers, answers, "\(id).answers = the lesson's")
                var old = Int(JSON.orZero(inp["pronDone"]?[lid]))
                var rewards: [[String: Int]] = [], writes: [Int] = []
                for (step, w) in o.list("steps").enumerated() {
                    let pick = Int(inp.list("picks")[step].double ?? 0)
                    let ok = q.pick(step, pick)
                    r.eq(ok, w.t("ok"), "\(id).step\(step).ok"); r.eq(pick, w.i("picked"), "\(id).step\(step).picked"); r.eq(q.answers[step], w.i("answer"), "\(id).step\(step).answer")
                    r.eq(w["mark"]?.string, ok == true ? "✅ " : "❌ ", "\(id).step\(step).mark")
                    var rw: [[String: Int]] = []
                    if q.finished { let f = PronLessonRules.quizFinish(right: q.right, n: q.answers.count, old: old); rw = [f.reward]; if let b = f.best { writes.append(b); old = b } }
                    r.eq(rw, w.list("rewards").map(intMap), "\(id).step\(step).rewards")
                }
                r.eq(q.pick(0, 0), nil, "\(id): a tap on a locked question is ignored")
                r.eq(writes, o.list("writes").compactMap { $0[lid]?.double }.map(Int.init), "\(id).writes")
            } else {
                // word / sentence microphone
                let words = x.list("words").map { $0.s("w") }, sentences = x.strs("sentences")
                r.eq(words, inp.strs("words"), "\(id).words"); r.eq(sentences, inp.strs("sentences"), "\(id).sentences")
                var scores: [Int: Int] = [:], old = Int(JSON.orZero(inp["pronDone"]?[lid]))
                for (step, w) in o.list("steps").enumerated() {
                    let s = inp.list("script")[step], k = s.i("k"), score = s.i("score"), sentence = s.t("sentence")
                    let target = sentence ? sentences[k] : words[k]
                    r.eq(target, w.s("target"), "\(id).step\(step).target"); r.eq(sentence, w.t("sentence"), "\(id).step\(step).sentence")
                    r.eq("--" + PronLessonRules.tone(score).rawValue, w.s("colour"), "\(id).step\(step).colour")
                    let rw = sentence ? PronLessonRules.sentenceReward(score) : PronLessonRules.wordReward(score)
                    r.eq(rw.map { [$0] } ?? [], w.list("rewards").map(intMap), "\(id).step\(step).rewards")
                    r.eq(PronLessonRules.sound(score).map { [$0] } ?? [], w.strs("sounds"), "\(id).step\(step).sounds")
                    var wr: [Int] = []
                    if !sentence { scores[k] = max(scores[k] ?? 0, score); if let b = PronLessonRules.savedBest(scores: scores, wordCount: words.count, old: old) { wr = [b]; old = b } }
                    r.eq(wr, w.list("writes").compactMap { $0["game:pronDone"]?[lid]?.double }.map(Int.init), "\(id).step\(step).writes")
                    r.eq(PronLessonRules.clean(target), target.replacingOccurrences(of: "  ", with: " "), "\(id).step\(step).clean")
                }
            }
        }
        r.eq(PronLessonRules.clean("Hello ↗ there ‿ / ok"), "Hello there ok", "clean ↗ ↘ ‿ and ' / '")
        finish(r, "pron.lesson")
    }
    func intMap(_ j: JSON) -> [String: Int] { (j.object ?? [:]).mapValues { Int(JSON.orZero($0)) } }

    // MARK: pron.pairGame
    func testPronPairGame() throws {
        var r = PronR()
        for c in P(try vec()).list("pairGame") {
            let id = c.s("id"), inp = c["input"] ?? .null, o = c["out"] ?? .null
            let pairs = (inp["pairs"]?.array ?? []).map { ($0.array ?? []).compactMap(\.string) }
            let pl = (try lessons()).first { $0.s("id") == inp.s("lesson") }
            r.eq(pairs, (pl?.list("pairs") ?? []).map { ($0.array ?? []).compactMap(\.string) }, "\(id).pairs = the lesson's")
            let rounds = PronLessonRules.pairRounds(pairs, shuffle: { $0 }, random: cycle(inp.list("random")))   // the web harness leaves the order alone: only the sides use the numbers
            r.eq(rounds.count, 8, "\(id).8 rounds")
            var ok = 0
            for (n, w) in o.list("rounds").enumerated() {
                let rd = rounds[n], right = inp.list("rights")[n].truthy
                r.eq(rd.options, w.strs("options"), "\(id).round\(n).options"); r.eq(rd.options[rd.answer], w.s("spoken"), "\(id).round\(n).spoken"); r.eq(rd.answer, w.i("answerIndex"), "\(id).round\(n).answer")
                let picked = right ? rd.answer : 1 - rd.answer
                r.eq(picked, w.i("picked"), "\(id).round\(n).picked"); r.eq(picked == rd.answer, w.t("right"), "\(id).round\(n).right")
                if picked == rd.answer { ok += 1 }
            }
            let f = PronLessonRules.pairFinish(ok: ok)
            r.eq(f.good, o.t("good"), "\(id).good"); r.eq([f.reward], o.list("rewards").map(intMap), "\(id).rewards")
            r.eq(o.list("final").first?["v"]?.i("ok"), ok, "\(id).final ok")
        }
        finish(r, "pron.pairGame")
    }

    // MARK: pron.say ("Nói thử")
    func testPronSay() throws {
        var r = PronR()
        let pr = try pairs()
        for c in P(try vec()).list("say") {
            let id = c.s("id"), inp = c["input"] ?? .null, o = c["out"] ?? .null
            let cs = inp.strs("contrasts").compactMap { pr.contrast($0) }
            r.eq(cs.map(\.id), pr.forSkill(inp.s("lesson")).map(\.id), "\(id).contrasts = forSkill")
            var s = PronSaySession(pairs: pr, contrasts: cs, stats: stats(inp["stats"]), random: cycle(inp.list("random")))
            r.eq(Array(o.list("intro").dropFirst().map { $0.s("k") }), Array(cs.map { pr.label($0) }.prefix(o.list("intro").count - 1)), "\(id).intro chips (the vector lists the first three)")
            let script = inp.list("script")
            var n = 0, blocked = false
            r.eq(Array(s.queue.prefix(o.strs("spoken").count).map(\.target)), o.strs("spoken"), "\(id).spoken")
            for w in o.list("steps") {
                guard let it = s.item else { r.check(false, "\(id): session over early"); break }
                let sc = script[n % script.count]; n += 1
                var step: PronSaySession.Step
                if let err = sc["error"]?.string {
                    step = s.apply(PronSaySession.outcome(forError: err))
                } else {
                    switch sc.s("o") {
                    case "good": step = s.answer(alts: [it.target])
                    case "other": step = s.answer(alts: [it.other])
                    default: step = s.answer(alts: ["blah"])
                    }
                }
                r.eq(step.index, w.s("index"), "\(id).step\(n).index"); r.eq(step.target, w.s("target"), "\(id).step\(n).target"); r.eq(step.other, w.s("other"), "\(id).step\(n).other")
                r.eq(step.labelKey + (step.retryTag ? " · Thử lại" : ""), w.s("label"), "\(id).step\(n).label")
                let outcome: String
                switch step.outcome { case .good: outcome = "good"; case .other: outcome = "other"; case .blocked: outcome = "blocked"; case .neither: outcome = sc["error"]?.string ?? "neither" }
                r.eq(outcome, w.s("outcome"), "\(id).step\(n).outcome")
                switch step.kind {
                case .good: r.eq(w["state"]?.s("k") ?? "", "Chính xác!", "\(id).step\(n).state")
                case .other:
                    r.eq(w["state"]?.s("k") ?? "", "Máy nghe thành “{heard}” – từ còn lại trong cặp.", "\(id).step\(n).state"); r.eq(w["state"]?["v"]?.s("heard") ?? "", step.other, "\(id).step\(n).heard")
                    r.check(step.tip.map { t in (w["tip"]?.string).map { t.hasPrefix($0) || $0.hasPrefix(t) } ?? false } ?? false, "\(id).step\(n).tip")
                case .retry: r.eq(w["state"]?.s("k") ?? "", "Chưa nghe rõ – thử lại nhé (không trừ điểm).", "\(id).step\(n).state")
                case .skip: r.eq(w["state"]?.s("k") ?? "", "Vẫn chưa rõ – chuyển sang từ tiếp theo.", "\(id).step\(n).state")
                case .blocked: r.eq(w["blocked"]?.array?.first?.s("k") ?? "", PronSaySession.blockedKey(sc.s("error")), "\(id).step\(n).blocked")
                }
                if step.kind != .other { r.check(w["tip"] == nil || w["tip"] == .null, "\(id).step\(n).no tip") }
                if step.kind != .blocked {
                    r.eq(step.heard.isEmpty ? false : step.kind == .retry, w.t("retryHeard"), "\(id).step\(n).retryHeard")
                    r.eq(step.nextButton, w.t("nextButton"), "\(id).step\(n).nextButton"); r.eq(step.micDisabled, w.t("micDisabled"), "\(id).step\(n).micDisabled")
                }
                if step.kind == .blocked { blocked = true; break }
                if step.nextButton { s.next() }
            }
            if blocked {
                r.check(o["final"] == nil || o["final"] == .null, "\(id).final null when blocked"); r.eq(o.i("fallbackCalled"), 1, "\(id).fallback")
            } else {
                r.check(s.done, "\(id).session done"); r.eq(o.i("fallbackCalled"), 0, "\(id).fallback")
                let rw = s.finish(day: "2026-01-05"), f = o["final"] ?? .null
                r.eq(f["score"]?["v"]?.i("ok"), s.ok, "\(id).final ok"); r.eq(f["score"]?["v"]?.i("n"), s.scored, "\(id).final n")
                r.eq(s.sess.map { pr.contrast($0.id).map(pr.label) ?? "" }, f.list("chips").map { $0.s("contrast") }, "\(id).chips")
                for (m, ch) in zip(s.sess, f.list("chips")) { r.eq(m.ok, ch.i("ok"), "\(id).chip ok"); r.eq(m.n, ch.i("n"), "\(id).chip n"); r.eq(m.ok == m.n, ch.t("all"), "\(id).chip all") }
                r.eq([rw], o.list("rewards").map(intMap), "\(id).rewards")
                r.diff(PronPairs.json(s.stats), o.list("writes").first, "\(id).writes")
            }
        }
        r.eq(PronSaySession.outcome(forError: "audio-capture"), .blocked("audio-capture"), "audio-capture blocks")
        r.eq(PronSaySession.outcome(forError: "whisper"), .neither, "whisper retries")
        finish(r, "pron.say")
    }

    // MARK: pron.rhythm (shadowing)
    func testPronRhythm() throws {
        var r = PronR()
        let co = try coach(), pr = try pairs(), all = try lessons()
        for c in P(try vec()).list("rhythm") {
            let id = c.s("id"), inp = c["input"] ?? .null, o = c["out"] ?? .null
            var done = rhythm(inp["doneBefore"])
            let k = co.first(done), s = co.sentences[k]
            r.eq(String(k), o["init"]?.s("picked") ?? "", "\(id).picked"); r.eq(k, inp.i("sentence"), "\(id).sentence = first below 85")
            r.eq(co.sentences.indices.map { (done[$0] ?? 0) >= 85 ? "✓" : String($0 + 1) }, o["init"]?.strs("marks") ?? [], "\(id).marks")
            let plan = co.plan(s.s, forced: s.w, accent: inp.s("accent"))
            for (p, w) in zip(plan, o["init"]?.list("plan") ?? []) { r.eq(p.w, w.s("w"), "\(id).plan.w"); r.eq(p.stress, w.t("stress"), "\(id).plan.stress"); if let wk = w["weak"]?.string { r.eq(p.weak, wk, "\(id).plan.weak") } }
            r.eq(plan.count, o["init"]?.list("plan").count ?? -1, "\(id).plan count")
            r.eq(s.s, o["shadowingTts"]?.s("text") ?? "", "\(id).tts"); r.eq(inp.s("accent"), o["shadowingTts"]?.s("accent") ?? "", "\(id).tts accent"); r.eq(s.s, o.s("recognizeTarget"), "\(id).target")
            let heard = inp.s("heard"), alts = inp.strs("alts")
            let sim = max(0, alts.map { LessonEngine.similarity($0, s.s) }.max() ?? LessonEngine.similarity(heard, s.s))
            let d = co.diff(heard: heard, target: s.s), sc = PronCoach.score(sim: sim, d), band = PronCoach.band(sc)
            r.eq(sc, o.i("score"), "\(id).score")
            let verdict = ["great": "Rất giống giọng mẫu – nhịp tự nhiên!", "close": "Gần rồi! Nghe lại mẫu chậm rồi nói theo một lần nữa.", "again": "Chưa sao – nghe chậm, nhấn đúng các từ to rồi thử lại nhé."][band.rawValue]
            r.eq(verdict, o["verdict"]?.s("k"), "\(id).verdict")
            var tips: [String] = []
            if !d.missingContent.isEmpty { tips.append("Nhấn rõ hơn các từ chính: " + d.missingContent.joined(separator: ", ")) }
            else if !d.missingWeak.isEmpty { tips.append("Máy nghe sót từ nhỏ: " + d.missingWeak.joined(separator: ", ") + " – vẫn đọc nhẹ nhưng đừng bỏ hẳn.") }
            r.eq(tips, o.list("tips").map { t in (t["k"]?.string ?? "").replacingOccurrences(of: "{w}", with: t["v"]?.s("w") ?? "") }, "\(id).tips")
            r.eq(heard, o.s("heardShown"), "\(id).heardShown"); r.eq(band != .again ? "ok" : "no", o.s("feedbackClass"), "\(id).class")
            r.eq(PronCoach.reward(score: sc).map { [$0] } ?? [], o.list("rewards").map(intMap), "\(id).rewards")
            done[k] = max(done[k] ?? 0, sc)
            r.eq(done.map { "\($0.key)=\($0.value)" }.sorted(), (o["saved"]?.object ?? [:]).map { "\($0.key)=\(Int(JSON.orZero($0.value)))" }.sorted(), "\(id).saved")
            let sug = co.next(pairs: pr, stats: [:], rhythm: done, skill: "weak-forms")
            let want = o.list("suggestions")
            r.eq(sug.count, want.count, "\(id).suggestions count")
            for (a, w) in zip(sug, want) {
                switch a {
                case .rhythm(let n): r.eq(w.s("kind"), "rhythm", "\(id).kind"); r.eq(n, w.i("k"), "\(id).k")
                case .skill(let sid):
                    r.eq(w.s("kind"), "link", "\(id).kind"); r.eq(sid, w.s("href"), "\(id).href"); r.eq(all.first { $0.s("id") == sid }?.s("title"), w["label"]?.string, "\(id).label")
                case .pair: r.check(false, "\(id): no pair suggestion expected without stats")
                }
            }
            r.eq(false, o.t("mineButtons"), "\(id).mineButtons (recordings are never kept)")
        }
        finish(r, "pron.rhythm")
    }

    // MARK: pron.logic.pairs
    func testPronLogicPairs() throws {
        var r = PronR()
        let pr = try pairs(), L = P(try vec())["logic"]?["pairs"] ?? .null
        for c in L.list("norm") { r.eq(pr.norm(c["input"]?.string ?? ""), c.strs("out"), "norm \(c["input"]?.stableString ?? "")") }
        for c in L.list("decide") {
            let inp = c["input"] ?? .null
            let alts: [String] = inp["alts"]?.string.map { [$0] } ?? (inp["alts"]?.array ?? []).compactMap { $0.string }
            let d = pr.decide(alts, target: inp.s("target"), other: inp.s("other"))
            r.eq(d.res, c["out"]?.s("res") ?? "", "\(c.s("id")).res"); r.eq(d.heard, c["out"]?.s("heard") ?? "", "\(c.s("id")).heard")
        }
        for c in L.list("pairsOf") {
            guard let k = pr.contrast(c["input"]?.s("contrast") ?? "") else { r.check(false, "contrast"); continue }
            let got = Array(pr.pairsOf(k).prefix(c.list("out").count)), want = c.list("out")
            r.check(pr.pairsOf(k).count >= want.count, "\(c.s("id")).count (the vector lists the first four)")
            for (g, w) in zip(got, want) { r.eq(g.words, w.strs("words"), "\(c.s("id")).words"); r.eq(g.ipa, w.strs("ipa"), "\(c.s("id")).ipa"); r.eq(g.c, w.s("c"), "\(c.s("id")).c") }
        }
        for c in L.list("forSkill") { r.eq(pr.forSkill(c["input"]?.string ?? "").map(\.id), c.strs("out"), "forSkill \(c["input"]?.string ?? "")") }
        func items(_ j: [JSON]) -> [PronItem] { j.map { PronItem(c: $0.s("c"), words: $0.strs("words"), ipa: [], side: $0.i("side"), retry: $0.t("retry")) } }
        for c in L.list("sessions") {
            let inp = c["input"] ?? .null, got = pr.buildSession(inp.strs("contrasts").compactMap { pr.contrast($0) }, stats: stats(inp["stats"]), n: inp.i("n"), random: cycle(inp.list("random")))
            let want = items(c.list("out"))
            r.eq(got.map { "\($0.c):\($0.words.joined(separator: "/")):\($0.side)" }, want.map { "\($0.c):\($0.words.joined(separator: "/")):\($0.side)" }, c.s("id"))
        }
        for c in L.list("adapt") {
            let inp = c["input"] ?? .null
            var q = items(inp.list("queue"))
            let idx = inp.i("index")
            // the web re-reads the pair table: restore the IPA of each queued item
            for i in q.indices { if let k = pr.contrast(q[i].c), let p = pr.pairsOf(k).first(where: { $0.words == q[i].words }) { q[i].ipa = p.ipa } }
            pr.adapt(&q, at: idx, q[idx])
            let want = items(c.list("out"))
            r.eq(q.map { "\($0.c):\($0.words.joined(separator: "/")):\($0.side):\($0.retry)" }, want.map { "\($0.c):\($0.words.joined(separator: "/")):\($0.side):\($0.retry)" }, c.s("id"))
        }
        for c in L.list("stats") {
            let inp = c["input"] ?? .null, o = c["out"] ?? .null
            var st: PronStats = [:]
            for op in inp.list("ops") { PronPairs.record(&st, op.array?[0].string ?? "", ok: op.array?[1].truthy ?? false) }
            r.diff(PronPairs.json(st), o["stats"], "stats after ops")
            for (k, v) in o["acc"]?.object ?? [:] { if v == .null { r.check(st[k]?.acc == nil, "acc \(k) nil") } else { r.near(round9(st[k]?.acc ?? -1), v.double ?? .nan, "acc \(k)") } }
            r.eq(PronPairs.weak(st, ids: pr.contrasts.map(\.id)), o.strs("weak"), "weak"); r.eq(PronPairs.weak(st), o.strs("weakAllKeys"), "weak all keys")
            var ended = st
            PronPairs.endSession(&ended, inp["session"]?.object?.sorted { $0.key > $1.key }.map { (id: $0.key, ok: $0.value.i("ok"), n: $0.value.i("n")) } ?? [], day: inp.s("day"))
            r.diff(PronPairs.json(ended), o["afterEnd"], "afterEnd")
            var cap: PronStats = ["x": PronStat(ok: 1, n: 1, hist: (1...11).map { .init(d: "d\($0)", ok: 1, n: 1) })]
            PronPairs.endSession(&cap, [(id: "x", ok: 1, n: 1)], day: "new")
            r.eq(cap["x"]?.hist.count, 12, "hist 12"); r.eq(cap["x"]?.hist.first?.d, "d1", "hist first"); r.eq(cap["x"]?.hist.last?.d, "new", "hist last")
            PronPairs.endSession(&cap, [(id: "x", ok: 1, n: 1)], day: "newer")
            r.eq(cap["x"]?.hist.count, 12, "hist capped"); r.eq(cap["x"]?.hist.first?.d, "d2", "oldest dropped")
        }
        for c in L.list("storage") {
            let o = c["out"] ?? .null
            r.eq(JSON.object(["a": .int(1)]).stableString, o.s("saved"), "storage saved"); r.diff(PronPairs.load(o.s("saved")), o["loaded"], "storage loaded")
            r.diff(PronPairs.load("{nope"), o["corrupt"], "storage corrupt"); r.diff(PronPairs.load("[1]"), o["nonObject"], "storage non-object"); r.eq(PronPairs.storeKey, c["input"]?.s("key") ?? "", "storage key")
            let d = UserDefaults(suiteName: "lk.pron.vector") ?? .standard
            d.removePersistentDomain(forName: "lk.pron.vector")
            PronPairs.save(["th-s": PronStat(ok: 1, n: 2)], d)
            r.eq(PronPairs.load(d)["th-s"], PronStat(ok: 1, n: 2), "defaults round trip")
        }
        finish(r, "pron.logic.pairs")
    }

    // MARK: pron.logic.coach
    func testPronLogicCoach() throws {
        var r = PronR()
        let co = try coach(), pr = try pairs(), L = P(try vec())["logic"]?["coach"] ?? .null
        for c in L.list("plan") {
            let inp = c["input"] ?? .null
            let sentence = inp["sentence"]?.string ?? inp["sentence"]?.s("s") ?? "", forced = inp["sentence"]?["w"]?.array?.compactMap(\.string)
            let got = co.plan(sentence, forced: forced, accent: inp.s("accent")), want = c.list("out")
            r.eq(got.count, want.count, "\(c.s("id")).count")
            for (g, w) in zip(got, want) { r.eq(g.w, w.s("w"), "\(c.s("id")).w"); r.eq(g.stress, w.t("stress"), "\(c.s("id")).stress"); r.eq(g.weak, w.s("weak"), "\(c.s("id")).weak"); r.eq(g.light, w.t("light"), "\(c.s("id")).light") }
        }
        for c in L.list("diff") {
            let d = co.diff(heard: c["input"]?.s("heard") ?? "", target: c["input"]?.s("target") ?? ""), o = c["out"] ?? .null
            r.eq(d.missing, o.strs("missing"), "\(c.s("id")).missing"); r.eq(d.missingContent, o.strs("missingContent"), "\(c.s("id")).content"); r.eq(d.missingWeak, o.strs("missingWeak"), "\(c.s("id")).weak")
            r.eq(d.extra, o.strs("extra"), "\(c.s("id")).extra"); r.near(round9(d.cover), o.d("cover") ?? .nan, "\(c.s("id")).cover")
        }
        for c in L.list("band") { r.eq(PronCoach.band(c["input"]?.i("score") ?? 0).rawValue, c["out"]?.string ?? "", "band \(c["input"]?.i("score") ?? -1)") }
        for c in L.list("score") {
            let inp = c["input"] ?? .null, d = co.diff(heard: inp.s("heard"), target: inp.s("target"))
            r.eq(d.missingContent.count, c["out"]?["diff"]?.i("missingContent") ?? -1, "\(c.s("id")).missingContent"); r.eq(d.missingWeak.count, c["out"]?["diff"]?.i("missingWeak") ?? -1, "\(c.s("id")).missingWeak")
            r.eq(PronCoach.score(sim: inp.d("sim") ?? 0, d), c["out"]?.i("score") ?? -1, "\(c.s("id")).score")
        }
        for c in L.list("next") {
            let inp = c["input"] ?? .null
            let got = co.next(pairs: inp.t("usePairs") ? pr : nil, stats: stats(inp["stats"]), rhythm: rhythm(inp["rhythm"]), skill: inp.s("skill")), want = c.list("out")
            r.eq(got.count, want.count, "\(c.s("id")).count")
            for (g, w) in zip(got, want) {
                switch g {
                case .pair(let i, let s): r.eq("pair:\(i):\(s)", "\(w.s("kind")):\(w.s("id")):\(w.s("skill"))", c.s("id"))
                case .rhythm(let k): r.eq("rhythm:\(k)", "\(w.s("kind")):\(w.i("k"))", c.s("id"))
                case .skill(let i): r.eq("skill:\(i)", "\(w.s("kind")):\(w.s("id"))", c.s("id"))
                }
            }
        }
        finish(r, "pron.logic.coach")
    }
}

