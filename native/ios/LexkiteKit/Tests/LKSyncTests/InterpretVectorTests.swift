import Foundation
import XCTest
@testable import LKSync
@testable import LKStore

/// Phiên dịch – LKStore/Interpret/InterpretCore against vectors/interpret.json, produced by running the REAL web core (web/cpack/interpret/core.js,
/// scripts/native/gen-interpret.mjs): language ↔ locale, who spoke, key words, review cards and the history caps. Every case of every group is checked.
final class InterpretVectorTests: XCTestCase {
    func vec() throws -> JSON { try Vectors.load("interpret.json") }
    func turn(_ j: JSON) -> InterpTurn { InterpTurn(from: j.s("from"), src: j.s("src"), dst: j.s("dst"), tx: j.s("tx"), ts: j["ts"]?.int64 ?? 0) }

    func testLanguagesAndLocales() throws {
        let V = try vec()
        let langs = try XCTUnwrap(V["langs"]?.object)
        XCTAssertEqual(Set(langs.keys), Set(Interp.codes), "the 15 interface languages")
        for (l, loc) in langs { XCTAssertEqual(Interp.locale(l), loc.string, l) }
        XCTAssertEqual(Set(V.list("rtl").compactMap(\.string)), Set(Interp.codes.filter { Interp.isRTL($0) }))
        XCTAssertEqual(V["maxConv"]?.int64, Int64(Interp.maxConv)); XCTAssertEqual(V["maxTurn"]?.int64, Int64(Interp.maxTurn))
        XCTAssertEqual(Interp.base("zh-Hans"), "zh"); XCTAssertTrue(Interp.supported("es-MX")); XCTAssertFalse(Interp.supported("xx"))
    }

    func testSpeaker() throws {
        let cases = try vec().list("speaker"); XCTAssertFalse(cases.isEmpty)
        for c in cases {
            let det: Interp.Detected? = c["det"]?.isObject == true ? Interp.Detected(lang: c["det"]!.s("lang"), confidence: c["det"]!["confidence"]?.double ?? 0) : nil
            let pair = InterpPair(a: c["pair"]!.s("a"), b: c["pair"]!.s("b"))
            XCTAssertEqual(Interp.speaker(det, pair: pair, side: InterpSide(rawValue: c.s("side"))!).rawValue, c.s("out"), c.s("id"))
        }
    }

    func testKeyWords() throws {
        let cases = try vec().list("keyWords"); XCTAssertFalse(cases.isEmpty)
        for c in cases {
            let out = Interp.keyWords(c.list("texts").compactMap(\.string), lang: c.s("lang"), n: Int(c["n"]?.int64 ?? 8), known: Set(c.list("known").compactMap(\.string)))
            XCTAssertEqual(out, c.list("out").compactMap(\.string), c.s("id"))
        }
    }

    func testCards() throws {
        let cases = try vec().list("cards"); XCTAssertFalse(cases.isEmpty)
        for c in cases {
            let cv = c["conv"]!
            let conv = InterpConv(id: "x", t: 0, a: cv.s("a"), b: cv.s("b"), turns: cv.list("turns").map(turn))
            let out = Interp.cards(conv, me: c.s("me")).map { [$0.word, $0.def, $0.lang] }
            XCTAssertEqual(out, c.list("out").map { [$0.s("word"), $0.s("def"), $0.s("lang")] }, c.s("id"))
        }
    }

    func testHistory() throws {
        let pair = InterpPair(a: "en-US", b: "es-ES")
        for c in try vec().list("history") {
            let suite = "lk.test.interp.\(c.s("id"))"
            let d = UserDefaults(suiteName: suite)!; d.removePersistentDomain(forName: suite)
            let h = InterpHistory(defaults: d)
            switch c.s("id") {
            case "new-conv-base-codes": h.addTurn(id: "c1", pair: pair, InterpTurn(from: "a", src: "hi", dst: "es", tx: "hola", ts: 100))
            case "append-same-conv":
                h.addTurn(id: "c1", pair: pair, InterpTurn(from: "a", src: "hi", dst: "es", tx: "hola", ts: 100)); h.addTurn(id: "c1", pair: pair, InterpTurn(from: "b", src: "hola", dst: "en", tx: "hi", ts: 101))
            case "newest-first":
                h.addTurn(id: "c1", pair: pair, InterpTurn(from: "a", src: "one", dst: "es", tx: "uno", ts: 1)); h.addTurn(id: "c2", pair: pair, InterpTurn(from: "a", src: "two", dst: "es", tx: "dos", ts: 2))
            case "cap-turns": for i in 0..<205 { h.addTurn(id: "c1", pair: pair, InterpTurn(from: "a", src: "s\(i)", dst: "es", tx: "t\(i)", ts: Int64(i + 1))) }
            case "cap-convs": for i in 0..<33 { h.addTurn(id: "c\(i)", pair: pair, InterpTurn(from: "a", src: "s\(i)", dst: "es", tx: "t\(i)", ts: Int64(i + 1))) }
            default: XCTFail("unknown history case \(c.s("id"))")
            }
            let got = h.load(), want = c.list("out")
            XCTAssertEqual(got.count, want.count, c.s("id"))
            for (g, w) in zip(got, want) {
                XCTAssertEqual([g.id, g.a, g.b, g.turns.first?.src, g.turns.last?.src], [w.s("id"), w.s("a"), w.s("b"), w.s("first"), w.s("last")], c.s("id"))
                XCTAssertEqual(g.t, w["t"]?.int64, c.s("id")); XCTAssertEqual(g.turns.count, Int(w["n"]?.int64 ?? -1), c.s("id"))
            }
        }
    }

    /// the phrasebook is the generated copy of web/cpack/interpret/phrases.js: 22 phrases × 15 languages, none empty
    func testPhrasebook() {
        let p = InterpPhrases.bundled
        XCTAssertEqual(p.order, ["hi", "go", "eat", "stay", "sos"]); XCTAssertEqual(p.items.count, 22)
        for it in p.items { for l in Interp.codes { XCTAssertFalse((it.t[l] ?? "").isEmpty, "\(it.g) \(l)") } }
    }

    func testScoreAndHistoryJSONCompat() {
        XCTAssertEqual(Interp.score(target: "¿Dónde está el baño?", heard: "donde esta el bano", lang: "es"), 100)
        XCTAssertEqual(Interp.score(target: "Where is the station", heard: "where is station", lang: "en"), 86)
        XCTAssertEqual(Interp.score(target: "Hello", heard: "", lang: "en"), 0)
        XCTAssertEqual(Interp.score(target: "你好吗", heard: "你好", lang: "zh"), 80)
        // the web's localStorage JSON is read as it is
        let d = UserDefaults(suiteName: "lk.test.interp.compat")!; d.removePersistentDomain(forName: "lk.test.interp.compat")
        d.set(#"{"convs":[{"id":"c9","t":5,"a":"en","b":"vi","turns":[{"from":"a","src":"hi","dst":"vi","tx":"chào","ts":5}]}]}"#, forKey: Interp.historyKey)
        XCTAssertEqual(InterpHistory(defaults: d).conv("c9")?.turns.first?.tx, "chào")
    }
}
