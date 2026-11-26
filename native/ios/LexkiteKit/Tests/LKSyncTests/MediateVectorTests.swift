import Foundation
import XCTest
@testable import LKSync
@testable import LKStore

/// M4 P13 – Mediation (LKStore/Mediate) against vectors/mediate.json, produced by running the REAL web core (scripts/native/gen-mediate.mjs):
/// words, hit, copied, sourceText, check (n / inRange / points / extra / copied) and the Kokoro voices over the 30 bundled lessons. Every case is checked; nothing is skipped.
final class MediateVectorTests: XCTestCase {
    func fail(_ f: inout [String], _ s: @autoclosure () -> String) { if f.count < 25 { f.append(s()) } }

    /// P13: every case of mediate.json replayed, the bundled lessons present.
    func testParityP13() throws {
        let V = try Vectors.load("mediate.json")
        let M = Mediation.shared
        var failures: [String] = [], checked = 0

        for c in V.list("words") {
            checked += 1
            let got = Mediate.words(c.s("in")), want = c.strs("out")
            if got != want { fail(&failures, "words \(c.s("in")): \(got) ≠ \(want)") }
        }
        for c in V.list("hit") {
            checked += 1
            let checks = c.list("checks").map { ($0.array ?? []).compactMap(\.string) }
            let got = Mediate.hit(c.s("text"), checks), want = c["out"]?.truthy ?? false
            if got != want { fail(&failures, "hit \(c.s("text")) \(c["checks"]?.stableString ?? ""): \(got) ≠ \(want)") }
        }
        for c in V.list("sourceText") {
            checked += 1
            guard let it = M.item(c.s("id")) else { fail(&failures, "sourceText: unknown lesson \(c.s("id"))"); continue }
            let got = Mediate.sourceText(it.source)
            if got != c.s("out") { fail(&failures, "sourceText \(c.s("id")): \(got.prefix(80)) ≠ \(c.s("out").prefix(80))") }
        }
        for c in V.list("copied") {
            checked += 1
            guard let it = M.item(c.s("id")) else { fail(&failures, "copied: unknown lesson \(c.s("id"))"); continue }
            let got = Mediate.copied(c.s("text"), Mediate.sourceText(it.source), n: c.i("n"))
            if got != c.s("out") { fail(&failures, "copied \(c.s("id")): '\(got)' ≠ '\(c.s("out"))'") }
        }
        for c in V.list("check") {
            checked += 1
            guard let it = M.item(c.s("id")) else { fail(&failures, "check: unknown lesson \(c.s("id"))"); continue }
            let r = Mediate.check(it, c.s("text")), w = c["out"] ?? .null, tag = "check \(c.s("id")) \(c.s("kind"))"
            if r.n != w.i("n") { fail(&failures, "\(tag): n \(r.n) ≠ \(w.i("n"))") }
            if r.inRange != w.t("inRange") { fail(&failures, "\(tag): inRange \(r.inRange) ≠ \(w.t("inRange"))") }
            let wp = w.list("points")
            if r.points.count != wp.count { fail(&failures, "\(tag): points \(r.points.count) ≠ \(wp.count)") }
            else { for (a, b) in zip(r.points, wp) where a.id != b.s("id") || a.idea != b.s("idea") || a.ok != b.t("ok") { fail(&failures, "\(tag): point \(a.id) ok \(a.ok) ≠ \(b.t("ok"))") } }
            if r.extra != w.strs("extra") { fail(&failures, "\(tag): extra \(r.extra) ≠ \(w.strs("extra"))") }
            if r.copied != w.s("copied") { fail(&failures, "\(tag): copied '\(r.copied)' ≠ '\(w.s("copied"))'") }
        }
        for c in V.list("voices") {
            checked += 1
            guard let it = M.item(c.s("id")) else { fail(&failures, "voices: unknown lesson \(c.s("id"))"); continue }
            let got = Mediate.voices(it.source), want = (c["out"]?.object ?? [:]).compactMapValues(\.string)
            if got != want { fail(&failures, "voices \(c.s("id")): \(got) ≠ \(want)") }
        }
        XCTAssertGreaterThan(checked, 0)
        XCTAssertTrue(failures.isEmpty, "\(failures.count) of \(checked) failed:\n" + failures.joined(separator: "\n"))

        // bundled lessons
        XCTAssertEqual(M.items.count, 30)
        XCTAssertEqual(M.levels, ["A2", "B1", "B2", "C1", "C2"])
        XCTAssertEqual(M.listenFirst, ["B2", "C1", "C2"])
        XCTAssertEqual(M.copyRun, Mediate.copyRun)
        XCTAssertTrue(M.items.allSatisfy { !$0.points.isEmpty && $0.task.minWords > 0 })
    }

    func testListenFirstAndStore() {
        let M = Mediation.shared
        for it in M.items { XCTAssertEqual(Mediate.listenFirst(it), ["B2", "C1", "C2"].contains(it.level) && it.source.kind != "chart", it.id) }
        XCTAssertEqual(M.next(after: M.items.last!.id)?.id, M.items.first!.id)   // wraps round

        let d = UserDefaults(suiteName: "lk.mediate.test")!; d.removePersistentDomain(forName: "lk.mediate.test")
        let s = MediateStore(defaults: d)
        s.setDraft("m01", "hello"); XCTAssertEqual(s.draft("m01"), "hello")
        s.setDraft("m01", ""); XCTAssertEqual(s.draft("m01"), "")
        s.record("m01", ok: 2, of: 4); s.record("m01", ok: 1, of: 4); XCTAssertEqual(s.best["m01"], .init(ok: 2, of: 4))   // only a higher score replaces
        s.record("m01", ok: 3, of: 4); XCTAssertEqual(s.best["m01"]?.ok, 3)
    }
}
