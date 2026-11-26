import Foundation
import XCTest
@testable import LKSync
@testable import LKStore

/// M4 P12 – Learn from YouTube video (LKStore/Watch) against vectors/watch.json, produced by running the REAL web code (scripts/native/gen-watch.mjs):
/// ytParse, fmt, buildQ (→ myLevel), forYou, the rates and the duration rule. Every case is checked; nothing is skipped.
final class WatchVectorTests: XCTestCase {
    func fail(_ f: inout [String], _ s: @autoclosure () -> String) { if f.count < 25 { f.append(s()) } }

    /// P12: every case of watch.json replayed, the bundled topics and player page present.
    func testParityP12() throws {
        let V = try Vectors.load("watch.json")
        var failures: [String] = [], checked = 0

        // rates
        let rates = (V["rates"]?.array ?? []).compactMap(\.double)
        checked += 1; if rates != Watch.rates { fail(&failures, "rates \(rates) ≠ \(Watch.rates)") }

        // ytParse
        for c in V.list("parse") {
            checked += 1
            let got = Watch.ytParse(c.s("in")), want = c["out"]
            if let w = want, w.isObject {
                if got?.id != w.s("id") || got?.t != w.i("t") { fail(&failures, "parse \(c.s("in")): \(String(describing: got)) ≠ \(w.stableString)") }
            } else if got != nil { fail(&failures, "parse \(c.s("in")): expected nil, got \(String(describing: got))") }
        }
        // fmt
        for c in V.list("fmt") {
            checked += 1
            let got = Watch.fmt(c["s"]?.double ?? 0)
            if got != c.s("out") { fail(&failures, "fmt \(c["s"]?.stableString ?? ""): \(got) ≠ \(c.s("out"))") }
        }
        // buildQ (the level comes from f.lv or myLevel(placement))
        for c in V.list("buildQ") {
            checked += 1
            let f = c["f"] ?? .null
            let got = Watch.buildQ(c.s("base"), filters: WatchFilters(lv: f.i("lv"), acc: f.s("acc"), pace: f.s("pace")), placement: c["placement"])
            if got != c.s("out") { fail(&failures, "buildQ \(c.s("base")) \(c.stableString.prefix(90)): \(got) ≠ \(c.s("out"))") }
        }
        // forYou
        for c in V.list("forYou") {
            checked += 1
            let lv0 = c.i("lv"), level = lv0 != 0 ? lv0 : Watch.myLevel(c["placement"])
            let got = Watch.forYou(goal: c.s("goal"), level: level, deckWords: Set(c.strs("words")), historyTopics: c.list("history").map { $0.s("topic") }).map(\.id)
            if got != c.strs("out") { fail(&failures, "forYou \(c.s("goal")): \(got) ≠ \(c.strs("out"))") }
        }
        // duration rule: short < 240 · medium 240…1200 · long > 1200 · unknown length always passes
        let rule = V["durRule"] ?? .null
        checked += 1
        if rule.i("max") != Watch.maxResults { fail(&failures, "max \(rule.i("max")) ≠ \(Watch.maxResults)") }
        for (dur, sec, ok) in [("short", 239, true), ("short", 240, false), ("medium", 239, false), ("medium", 240, true), ("medium", 1200, true), ("medium", 1201, false), ("long", 1200, false), ("long", 1201, true), ("long", 0, true), ("", 5000, true)] {
            checked += 1
            if Watch.durOK(sec, dur) != ok { fail(&failures, "durOK \(dur) \(sec) ≠ \(ok)") }
        }
        XCTAssertGreaterThan(checked, 0)
        XCTAssertTrue(failures.isEmpty, "\(failures.count) of \(checked) failed:\n" + failures.joined(separator: "\n"))

        // bundled content
        let T = WatchTopics.shared
        XCTAssertEqual(T.levels, ["A1", "A2", "B1", "B2", "C1", "C2"])
        XCTAssertFalse(T.topics.isEmpty); XCTAssertEqual(T.lvQ.count, 6)
        XCTAssertEqual(T.options("dur").count, 4)
        XCTAssertTrue(Watch.playerHTML.contains("lk.cmd") || Watch.playerHTML.contains("window.lk"))
    }

    func testMergeAndFilter() {
        func it(_ id: String, _ title: String = "t", _ sec: Int = 0) -> WatchItem { WatchItem(id: id, title: title, sec: sec) }
        let tp = WatchTopic(id: "x", ic: "", lv: [1, 6], goals: ["all"], name: "", desc: "", q: [], ch: [], kw: ["grammar"], vocab: [])
        // search first, duplicates and invalid ids dropped, #shorts removed
        var out = Watch.merge(search: [it("aaaaaaaaaaa")], feed: [it("aaaaaaaaaaa"), it("bbbbbbbbbbb", "Fun #Shorts"), it("ccccccccccc"), it("bad")], topic: nil, dur: "")
        XCTAssertEqual(out.map(\.id), ["aaaaaaaaaaa", "ccccccccccc"])
        // keyword filter keeps the hits only from 4 hits on
        let few = (0..<3).map { it("k\($0)aaaaaaaaa", "English grammar \($0)") } + [it("zzzzzzzzzzz", "cooking")]
        XCTAssertEqual(Watch.merge(search: [], feed: few, topic: tp, dur: "").count, 4)
        let many = (0..<4).map { it("k\($0)aaaaaaaaa", "English grammar \($0)") } + [it("zzzzzzzzzzz", "cooking")]
        XCTAssertEqual(Watch.merge(search: [], feed: many, topic: tp, dur: "").count, 4)
        XCTAssertFalse(Watch.merge(search: [], feed: many, topic: tp, dur: "").contains { $0.id == "zzzzzzzzzzz" })
        // duration rule and the 24 cap
        out = Watch.merge(search: [it("aaaaaaaaaaa", "a", 100), it("bbbbbbbbbbb", "b", 500)], feed: [], topic: nil, dur: "short")
        XCTAssertEqual(out.map(\.id), ["aaaaaaaaaaa"])
        let big = (0..<40).map { it(String(format: "v%010d", $0)) }
        XCTAssertEqual(Watch.merge(search: big, feed: [], topic: nil, dur: "").count, 24)
    }

    func testLoopAndStore() {
        var l = WatchLoop()
        XCTAssertFalse(l.toggle())                       // no A/B → the hint
        l.setA(10)
        XCTAssertEqual(l.setB(20), 10); XCTAssertTrue(l.on)
        XCTAssertEqual(l.label, "0:10 → 0:20")
        XCTAssertEqual(l.jump(at: 20.1), 10); XCTAssertNil(l.jump(at: 15))
        XCTAssertTrue(l.toggle()); XCTAssertFalse(l.on)
        var m = WatchLoop(); XCTAssertEqual(m.setB(30), 25)   // B alone: A = B − 5
        var n = WatchLoop(); n.setA(10); XCTAssertNil(n.setB(10.2))

        let d = UserDefaults(suiteName: "lk.watch.test")!; d.removePersistentDomain(forName: "lk.watch.test")
        let s = WatchStore(defaults: d)
        for i in 0..<35 { s.remember(WatchHistory(id: String(format: "v%010d", i), title: "t", pos: i)) }
        s.remember(WatchHistory(id: String(format: "v%010d", 3), title: "again"))
        XCTAssertEqual(s.history.count, 30); XCTAssertEqual(s.history.first?.title, "again")
        s.setNotes("aaaaaaaaaaa", [WatchNote(t: 9, text: "b"), WatchNote(t: 2, text: "a")])
        XCTAssertEqual(s.notes("aaaaaaaaaaa").map(\.t), [2, 9])
        s.filters = WatchFilters(lv: 3, dur: "short"); XCTAssertEqual(s.filters.lv, 3); XCTAssertTrue(s.filters.cc)
    }
}
