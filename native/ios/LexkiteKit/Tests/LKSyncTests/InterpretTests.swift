import XCTest
@testable import LKStore

/// Interpreter (#/interpret) logic: the same rules as web/cpack/interpret/core.js and the Android InterpretTest.kt, on the shared phrasebook. No microphone, no model, no network.
final class InterpretTests: XCTestCase {
    typealias I = Interpret
    let p = Interpret.Pair2("vi", "en")
    func phrases() throws -> Interpret.Phrases {
        let url = Vectors.dir.deletingLastPathComponent().appendingPathComponent("interpret/phrases.json")
        return try XCTUnwrap(Interpret.parsePhrases(try Data(contentsOf: url)))
    }

    func testSpeakerFollowsASureDetection() {
        XCTAssertEqual(I.speaker(Interpret.Detected("en", 0.9), p, "a"), "b")      // the foreign person borrowed the learner's mic
        XCTAssertEqual(I.speaker(Interpret.Detected("vi-VN", 0.8), p, "b"), "a")
        XCTAssertEqual(I.speaker(Interpret.Detected("en", 0.4), p, "a"), "a")      // unsure → the mic that was tapped
        XCTAssertEqual(I.speaker(Interpret.Detected("fr", 0.99), p, "b"), "b")     // a language outside the pair → the tapped mic
        XCTAssertEqual(I.speaker(nil, p, "a"), "a")
    }

    func testPairRules() {
        XCTAssertEqual(I.defaultPair("vi"), .init("vi", "en")); XCTAssertEqual(I.defaultPair("en"), .init("en", "es")); XCTAssertEqual(I.defaultPair("xx"), .init("en", "es"))
        XCTAssertEqual(I.fixPair("de", "en", "vi"), .init("de", "en")); XCTAssertEqual(I.fixPair("en", "en", "vi"), .init("vi", "en")); XCTAssertEqual(I.fixPair(nil, "zz", "vi"), .init("vi", "en"))
        XCTAssertEqual(I.pick(p, side: "a", lang: "en"), .init("en", "vi"))   // picking the other side's language swaps the two
        XCTAssertEqual(I.pick(p, side: "b", lang: "fr"), .init("vi", "fr")); XCTAssertEqual(I.pick(p, side: "b", lang: "xx"), .init("vi", "en"))
        XCTAssertTrue(I.rtl("ar-SA")); XCTAssertFalse(I.rtl("en")); XCTAssertEqual(I.codes.count, 15); XCTAssertEqual(Set(I.LOC.keys), Set(I.codes))
    }

    func testHistoryKeepsTheLastConversationsAndTurns() {
        var h = Interpret.History()
        for i in 1...(I.maxTurn + 5) { h = I.addTurn(h, id: "c1", pair: p, turn: .init("a", "s\(i)", "en", "t\(i)", 1_000 + Int64(i))) }
        XCTAssertEqual(h.convs.count, 1); XCTAssertEqual(h.convs[0].turns.count, I.maxTurn); XCTAssertEqual(h.convs[0].turns.first?.src, "s6"); XCTAssertEqual(h.convs[0].a, "vi")
        for i in 2...(I.maxConv + 3) { h = I.addTurn(h, id: "c\(i)", pair: p, turn: .init("b", "x", "vi", "y", 9_000 + Int64(i))) }
        XCTAssertEqual(h.convs.count, I.maxConv); XCTAssertEqual(h.convs[0].id, "c\(I.maxConv + 3)")   // newest first
        XCTAssertEqual(I.parse(I.encode(h)), h); XCTAssertEqual(I.parse("not json"), Interpret.History())
        // the stored shape is the web's {convs:[{id,t,a,b,turns:[{from,src,dst,tx,ts}]}]}
        let one = I.encode(Interpret.History([.init("c", 5, "vi", "en", [.init("a", "x", "en", "y", 6)])]))
        XCTAssertEqual(one, #"{"convs":[{"a":"vi","b":"en","id":"c","t":5,"turns":[{"dst":"en","from":"a","src":"x","ts":6,"tx":"y"}]}]}"#)
        XCTAssertEqual(I.parse(#"{"convs":[{"id":"w","t":1,"a":"vi","b":"en"}]}"#).convs.first?.turns.count, 0)   // a web conversation without turns
        // an older conversation keeps its place when it gets another turn
        let k = h.convs[5].id; XCTAssertEqual(I.addTurn(h, id: k, pair: p, turn: .init("a", "z", "en", "z", 1)).convs[5].id, k)
    }

    func testRecapCardsAreTheForeignPhrases() {
        let conv = Interpret.Conv("c", 1, "vi", "en", [.init("a", "Cảm ơn", "en", "Thank you", 1), .init("b", "Where is the station?", "vi", "Nhà ga ở đâu?", 2), .init("a", "Cảm ơn", "en", "Thank you", 3)])
        XCTAssertEqual(I.cards(conv, me: "vi"), [.init("Thank you", "Cảm ơn", "en"), .init("Where is the station?", "Nhà ga ở đâu?", "en")])
        XCTAssertEqual(I.cards(conv, me: "en"), [.init("Cảm ơn", "Thank you", "vi"), .init("Nhà ga ở đâu?", "Where is the station?", "vi")])
        XCTAssertTrue(I.cards(.init("d", 1, "en", "en", [.init("a", "x", "en", "x", 1)]), me: "en").isEmpty)
    }

    func testKeyWordsFavourRepeatedLongWords() {
        XCTAssertEqual(I.keyWords(["Where is the station?", "The station is near the pharmacy", "where is it"], lang: "en", n: 3, known: ["near"]), ["station", "where", "pharmacy"])
        XCTAssertEqual(I.keyWords(["station station"], lang: "en"), ["station"])   // ≥ 4 letters, no repeats of a word
        XCTAssertTrue(I.keyWords(["a an the"], lang: "en").isEmpty)
        XCTAssertFalse(I.keyWords(["pharmacy pharmacy hotel"], lang: "en", n: 8, known: ["pharmacy"]).contains("pharmacy"), "known words are skipped")
    }

    func testSayBackScoreIsUnicodeAware() {
        let r = I.score("¿Dónde está la farmacia?", heard: ["dónde está la farmacia"]); XCTAssertEqual(r.n, 100); XCTAssertEqual(r.heard, "dónde está la farmacia")
        XCTAssertEqual(I.score("hello", heard: []).n, 0); XCTAssertGreaterThanOrEqual(I.score("thank you very much", heard: ["thank you", "tank you very much"]).n, 90)
        XCTAssertEqual(I.score("ありがとうございます", heard: ["ありがとうございます"]).n, 100)
    }

    func testPhrasebookHasEveryGroupInEveryLanguage() throws {
        let b = try phrases(); XCTAssertEqual(b.order, ["hi", "go", "eat", "stay", "sos"])
        for g in b.order {
            XCTAssertFalse(b.group(g).isEmpty, g)
            for o in b.group(g) { for l in I.codes { XCTAssertFalse((o[l] ?? "").trimmingCharacters(in: .whitespaces).isEmpty, "\(g) \(l)") } }
        }
    }

    /// the copy bundled with the app is the shared phrasebook (gen.mjs writes both)
    func testBundledPhrasebookIsTheSharedOne() throws {
        let shared = try phrases(), bundled = try XCTUnwrap(Interpret.bundledPhrases())
        XCTAssertEqual(bundled.order, shared.order); XCTAssertEqual(bundled.items.count, shared.items.count)
        XCTAssertEqual(bundled.group("go").first, shared.group("go").first)
    }

    func testStoreKeepsHistoryAndPairOnTheDevice() throws {
        let d = try XCTUnwrap(UserDefaults(suiteName: "lk.interpret.test")); d.removePersistentDomain(forName: "lk.interpret.test")
        let s = InterpretStore(defaults: d)
        XCTAssertEqual(s.pair(me: "vi"), .init("vi", "en")); s.savePair(.init("de", "fr")); XCTAssertEqual(s.pair(me: "vi"), .init("de", "fr"))
        XCTAssertEqual(d.string(forKey: "lk.interp.pair"), #"{"a":"de","b":"fr"}"#)
        XCTAssertTrue(s.history().convs.isEmpty)
        s.saveHistory(I.addTurn(s.history(), id: "c1", pair: p, turn: .init("a", "x", "en", "y", 1))); XCTAssertEqual(s.history().convs.count, 1)
        s.clearHistory(); XCTAssertTrue(s.history().convs.isEmpty)
    }

    /// P14: a face-to-face talk – the foreign person borrows the learner's mic, both turns are kept, and the recap offers only the foreign phrases for the word list.
    func testParityP14() throws {
        let b = try phrases(), q = try XCTUnwrap(b.group("go").first), me = "vi", pair = I.fixPair("vi", "en", me)
        // the learner taps ITS mic and says Vietnamese → translated into English for the other half
        var h = I.addTurn(Interpret.History(), id: "c1", pair: pair, turn: .init(I.speaker(Interpret.Detected("vi", 0.95), pair, "a"), q["vi"]!, "en", q["en"]!, 1_000))
        // the foreign person answers into the learner's mic: language id says English → the speaker is side "b"
        let who = I.speaker(Interpret.Detected("en", 0.9), pair, "a"); XCTAssertEqual(who, "b")
        h = I.addTurn(h, id: "c1", pair: pair, turn: .init(who, q["en"]!, "vi", q["vi"]!, 2_000))
        let conv = try XCTUnwrap(h.convs.first); XCTAssertEqual(h.convs.count, 1); XCTAssertEqual(conv.turns.count, 2)
        let cards = I.cards(conv, me: me); XCTAssertEqual(cards.map(\.word), [q["en"]!]); XCTAssertEqual(cards.first?.def, q["vi"]); XCTAssertEqual(cards.first?.lang, "en")
        XCTAssertNotNil(I.LOC["en"])
    }
}
