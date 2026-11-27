import Foundation
import XCTest
@testable import LKSync
@testable import LKStore

/// Entry test (#/placement, part of P10): every case of vectors/placement.json – posterior, estimate, nextLevel, bandOf, cefrOf, stageOf, take, record and the 20-question
/// scenarios over the bundled bank – replayed against LKStore/Placement, which was produced by running the REAL web/js/placement.js (scripts/native/gen-placement.mjs). Nothing is skipped.
final class PlacementVectorTests: XCTestCase {
    func fail(_ f: inout [String], _ s: @autoclosure () -> String) { if f.count < 25 { f.append(s()) } }
    func resp(_ j: JSON?) -> [PlaceResp] { (j?.array ?? []).map { PlaceResp(kind: $0.s("kind"), lv: $0.s("lv"), r: $0.s("r"), c: $0["c"]?.double) } }
    func near(_ a: Double?, _ b: Double, _ eps: Double = 1e-9) -> Bool { a.map { abs($0 - b) <= eps } ?? false }
    func skillOK(_ w: JSON?, _ g: PlaceSkill) -> Bool { near(w?.d("band"), g.band) && w?.s("cefr") == g.cefr && near(w?.d("theta"), g.theta, 0.0051) }
    func same(_ tag: String, _ w: JSON, _ e: PlaceEstimate, _ f: inout [String]) {
        if e.band != w.s("band") || e.lo != w.s("lo") || e.hi != w.s("hi") || e.range != w.s("range") { fail(&f, "\(tag): band \(e.band) \(e.lo) \(e.hi) \(e.range) ≠ \(w.s("band")) \(w.s("lo")) \(w.s("hi")) \(w.s("range"))") }
        if !near(w.d("theta"), e.theta, 0.0051) || !near(w.d("se"), e.se, 0.0051) { fail(&f, "\(tag): theta/se \(e.theta) \(e.se) ≠ \(w.d("theta") ?? -99) \(w.d("se") ?? -99)") }
        if !skillOK(w["vocab"], e.vocab) { fail(&f, "\(tag): vocab \(e.vocab) ≠ \(String(describing: w["vocab"]))") }
        if !skillOK(w["grammar"], e.grammar) { fail(&f, "\(tag): grammar \(e.grammar) ≠ \(String(describing: w["grammar"]))") }
        if e.weak != w.s("weak") || e.stage != w.s("stage") || e.n != w.i("n") || e.right != w.i("right") || e.idk != w.i("idk") { fail(&f, "\(tag): weak/stage/counts differ") }
    }

    func testPlacementParity() throws {
        let V = try Vectors.load("placement.json")
        let bank = PlaceBank.shared
        var f: [String] = [], checked = 0

        for c in V.list("posterior") {
            checked += 1; let r = Placement.posterior(resp(c["resp"])), o = c["out"]
            if !near(o?.d("theta"), r.theta) || !near(o?.d("se"), r.se) { fail(&f, "posterior \(c.s("name")): \(r) ≠ \(String(describing: o))") }
        }
        for c in V.list("estimate") { checked += 1; same("estimate \(c.s("name"))", c["out"] ?? .null, Placement.estimate(resp(c["resp"])), &f) }
        for c in V.list("nextLevel") { checked += 1; let g = Placement.nextLevel(resp(c["resp"])); if g != c.s("out") { fail(&f, "nextLevel \(c.s("name")): \(g) ≠ \(c.s("out"))") } }
        for c in V.list("bandOf") { checked += 1; if !near(c["out"]?.double, Placement.bandOf(c["in"]?.double ?? .nan)) { fail(&f, "bandOf \(String(describing: c["in"]))") } }
        for c in V.list("cefrOf") { checked += 1; let g = Placement.cefrOf(c["in"]?.double ?? .nan); if g != c.s("out") { fail(&f, "cefrOf \(String(describing: c["in"])): \(g) ≠ \(c.s("out"))") } }
        for c in V.list("stageOf") { checked += 1; let g = Placement.stageOf(c["in"]?.double ?? .nan); if g != c.s("out") { fail(&f, "stageOf \(String(describing: c["in"])): \(g) ≠ \(c.s("out"))") } }

        for c in V.list("take") {
            checked += 1
            let pool = c.list("pool").map { ($0.s("id"), $0.s("lv")) }
            var used = Set(c.strs("used"))
            let rs = c.list("rnd").map { $0.double ?? 0 }; var k = 0
            let got = Placement.take(pool, c.s("lv"), used: &used, rnd: { defer { k += 1 }; return rs[k % rs.count] }, lv: { $0.1 }, id: { $0.0 })
            let want = c["out"]?.string
            if got?.0 != want { fail(&f, "take \(c.s("name")): \(String(describing: got?.0)) ≠ \(String(describing: want))") }
            if used != Set(c.strs("usedAfter")) { fail(&f, "take \(c.s("name")): used set differs") }
        }
        for c in V.list("record") {
            checked += 1
            let got = Placement.record(Placement.estimate(resp(c["resp"])), now: Int64(c.d("now") ?? 0))
            if let d = jsonDiff(got, c["out"]) { fail(&f, "record \(c.s("name")): \(d)") }
        }

        for c in V.list("scenarios") {
            checked += 1
            let tag = "seed \(c.i("seed")) \(c.s("policy"))"
            let s = PlaceSession(bank: bank, rnd: Placement.lcg(UInt32(c.i("seed"))), seed: 1234, meaningVi: true)
            let steps = c.list("steps")
            for (i, st) in steps.enumerated() {
                guard let q = s.next() else { fail(&f, "\(tag): ended early at \(i)"); break }
                if q.id != st.s("id") || q.kind != st.s("kind") || q.lv != st.s("lv") { fail(&f, "\(tag) step \(i): \(q.id) \(q.kind) \(q.lv) ≠ \(st.s("id")) \(st.s("kind")) \(st.s("lv"))") }
                if !near(st.d("c"), q.c) { fail(&f, "\(tag) step \(i): c \(q.c) ≠ \(st.d("c") ?? -1)") }
                if q.options.count != (q.isVocab ? 4 : bank.grammar.first { $0.id == q.id }?.options.count ?? -1) || Set(q.options).count != q.options.count { fail(&f, "\(tag) step \(i): options \(q.options)") }
                s.answer(st.s("r") == "right" ? q.correct : st.s("r") == "wrong" ? (q.correct + 1) % q.options.count : -1)
            }
            if s.next() != nil { fail(&f, "\(tag): did not end after \(steps.count)") }
            same(tag, c["estimate"] ?? .null, Placement.estimate(s.resp), &f)
            if let d = jsonDiff(Placement.record(Placement.estimate(s.resp), now: Int64(c.d("now") ?? 0)), c["record"]) { fail(&f, "\(tag) record: \(d)") }
        }
        XCTAssertGreaterThan(checked, 0)
        XCTAssertTrue(f.isEmpty, "\(f.count) of \(checked) failed:\n" + f.joined(separator: "\n"))

        // the bundled bank
        XCTAssertEqual(bank.n, 20); XCTAssertEqual(bank.ladder, ["A2", "B1", "B2", "C1"])
        for lv in bank.ladder { XCTAssertEqual(bank.vocab.filter { $0.lv == lv }.count, 90); XCTAssertEqual(bank.grammar.filter { $0.lv == lv }.count, 50) }
        XCTAssertEqual(Set(bank.vocab.map(\.id)).count, bank.vocab.count); XCTAssertEqual(Set(bank.grammar.map(\.id)).count, bank.grammar.count)
        XCTAssertTrue(bank.vocab.allSatisfy { !$0.w.isEmpty && !$0.vi.isEmpty && !$0.def.isEmpty })
        XCTAssertTrue(bank.grammar.allSatisfy { $0.options.count >= 3 && $0.options.indices.contains($0.answer) })
    }

    /// session rules: alternation, "I don't know" counts as not knowing, an answer without an open question is ignored, the test ends after 20
    func testSession() {
        let s = PlaceSession(bank: .shared, rnd: Placement.lcg(11), seed: 5, meaningVi: false)
        var i = 0
        while let q = s.next() {
            XCTAssertEqual(q.kind, i % 2 == 0 ? "vocab" : "grammar")
            if q.isVocab { XCTAssertEqual(q.options[q.correct], PlaceBank.shared.vocab.first { $0.id == q.id }?.def) }
            if i == 3 { s.answer(-1); s.answer(0) } else { s.answer(q.correct) }
            i += 1
        }
        XCTAssertEqual(i, 20); XCTAssertEqual(s.resp.count, 20)
        XCTAssertEqual(s.resp.filter { $0.r == "idk" }.count, 1); XCTAssertEqual(s.resp.filter { $0.r == "right" }.count, 19)
        XCTAssertGreaterThanOrEqual(Double(Placement.estimate(s.resp).band) ?? 0, 5.5)
    }
}
