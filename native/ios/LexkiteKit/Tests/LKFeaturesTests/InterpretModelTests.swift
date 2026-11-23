import Foundation
import XCTest
@testable import LKFeatures
import LKStore
import LKSync
import LKStrings

/// Phiên dịch: the screen models on scripted microphone / translator / detector / voice and in-memory data – listen → detect → translate → show → read aloud → history,
/// the language pair, save to the word list, say-it-back, the phrasebook, the history and the recap. (Core numbers: LKSyncTests/InterpretVectorTests.)
@MainActor
final class InterpretModelTests: XCTestCase {
    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    func make(_ n: String, me: String = "vi") -> (SkillsContext, MemoryVocabData, UserDefaults) {
        let d = UserDefaults(suiteName: "lk.test.interp.model.\(n)")!
        d.removePersistentDomain(forName: "lk.test.interp.model.\(n)")
        let data = MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty))
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: FakeTransport(failing: { _ in true }), cacheDirectory: nil))
        let core = StudyCore(data: data, voice: voice, calendar: Self.cal, now: { Self.now })
        return (SkillsContext(core: core, lang: me, defaults: d), data, d)
    }
    func io(_ heard: [RecognizeOutcome], _ tr: [String: InterpTranslation], det: [String: Interp.Detected] = [:]) -> (InterpIO, SilentSpeaker, ScriptedTranslator) {
        let sp = SilentSpeaker(), t = ScriptedTranslator(tr)
        return (InterpIO(recognizer: ScriptedRecognizer(heard), translator: t, detector: ScriptedDetector(det), speaker: sp, clock: { Self.now }, newId: { "c1" }), sp, t)
    }

    func testPairStartsAsMyLanguageAndEnglish() {
        XCTAssertEqual(InterpPair.initial(me: "vi"), InterpPair(a: "vi", b: "en"))
        XCTAssertEqual(InterpPair.initial(me: "en"), InterpPair(a: "en", b: "es"))
        XCTAssertEqual(InterpPair.initial(me: "xx"), InterpPair(a: "en", b: "es"))
    }

    func testFaceToFaceTurn() async {
        let (c, _, d) = make("turn")
        let (x, speaker, tr) = io([.heard("Xin chào, nhà vệ sinh ở đâu?")], ["Xin chào, nhà vệ sinh ở đâu?": InterpTranslation(text: "Hello, where is the toilet?", local: true)],
                                   det: ["Xin chào, nhà vệ sinh ở đâu?": .init(lang: "vi", confidence: 0.95)])
        let m = InterpretTalkModel(ctx: c, io: x, defaults: d)
        XCTAssertEqual(m.pair, InterpPair(a: "vi", b: "en"))
        await m.tap(.a)
        XCTAssertEqual(tr.calls, ["vi>en:Xin chào, nhà vệ sinh ở đâu?"])
        XCTAssertEqual(m.heard[.b], "Hello, where is the toilet?")           // the translation appears in the OTHER half
        XCTAssertEqual(m.badge?.side, .b); XCTAssertEqual(m.badge?.local, true)
        XCTAssertEqual(speaker.said.last?.text, "Hello, where is the toilet?"); XCTAssertEqual(speaker.said.last?.lang, "en")
        XCTAssertNil(m.note); XCTAssertTrue(m.hasTurn); XCTAssertNil(m.listening)
        XCTAssertEqual(InterpHistory(defaults: d).load().first?.turns.count, 1, "stored on the device")
        m.replay(slow: true)
        XCTAssertEqual(speaker.said.last?.slow, true)
        XCTAssertEqual(m.end(), "c1")
    }

    func testBorrowedMicSwitchesSpeaker() async {
        let (c, _, d) = make("borrow")
        let (x, _, tr) = io([.heard("Where is the station?")], ["Where is the station?": InterpTranslation(text: "Ga ở đâu?", local: false)], det: ["Where is the station?": .init(lang: "en", confidence: 0.9)])
        let m = InterpretTalkModel(ctx: c, io: x, defaults: d)
        await m.tap(.a)                                                         // side A (vi) tapped, but English was spoken → side B spoke
        XCTAssertEqual(tr.calls, ["en>vi:Where is the station?"]); XCTAssertEqual(m.heard[.a], "Ga ở đâu?"); XCTAssertEqual(m.badge?.local, false)
        XCTAssertEqual(m.last?.from, "b")
    }

    func testNothingHeardMicDeniedAndTranslationFailure() async {
        let (c, _, d) = make("errors")
        let (x, _, _) = io([.failed("no-speech"), .failed("not-allowed"), .failed("network"), .heard("   "), .heard("Hola")], [:])
        let m = InterpretTalkModel(ctx: c, io: x, defaults: d)
        await m.tap(.a); XCTAssertEqual(m.note, .nothingHeard)
        await m.tap(.a); XCTAssertEqual(m.note, .micDenied)
        await m.tap(.a); XCTAssertEqual(m.note, .recogErr("network"))
        await m.tap(.a); XCTAssertEqual(m.note, .nothingHeard)
        await m.tap(.b); XCTAssertEqual(m.note, .failed); XCTAssertFalse(m.hasTurn); XCTAssertNil(m.end(), "nothing said → the history")
    }

    func testLanguageSwapSaveAndSayBack() async {
        let (c, data, d) = make("save")
        let (x, _, _) = io([.heard("Hello"), .heard("hello there")], ["Hello": InterpTranslation(text: "Xin chào", local: true)], det: ["Hello": .init(lang: "en", confidence: 0.9)])
        let m = InterpretTalkModel(ctx: c, io: x, defaults: d)
        m.setLang(.b, "vi")                                                       // the other side's language → the two swap
        XCTAssertEqual(m.pair, InterpPair(a: "en", b: "vi"))
        XCTAssertEqual(InterpPairStore(defaults: d).load(me: "vi"), InterpPair(a: "en", b: "vi"), "kept on the device")
        m.swap(); XCTAssertEqual(m.pair, InterpPair(a: "vi", b: "en"))
        await m.saveLast(); XCTAssertNil(m.note, "nothing to save before a turn")
        await m.tap(.a)                                                           // English heard, translated to Vietnamese
        await m.saveLast(); XCTAssertEqual(m.note, .saved)
        let card = await data.load().cards.first
        XCTAssertEqual(card?.s("word"), "Hello"); XCTAssertEqual(card?.s("def"), "Xin chào")
        await m.sayBack()
        XCTAssertEqual(m.note, .score(67, "hello there"))                          // 2 words heard, 1 right: precision 0.5, recall 1
    }

    func testSameLanguageHasNothingToSave() async {
        let (c, _, d) = make("same", me: "en")
        let (x, _, _) = io([.heard("Hola")], ["Hola": InterpTranslation(text: "Hello", local: true)], det: ["Hola": .init(lang: "es", confidence: 0.9)])
        let m = InterpretTalkModel(ctx: c, io: x, defaults: d)                    // en ⇄ es; Spanish spoken, translated INTO my language
        await m.tap(.b)
        XCTAssertEqual(m.last?.tx, "Hello")
        await m.saveLast(); XCTAssertEqual(m.note, .saved, "the Spanish phrase is the card")
        await m.sayBack(); XCTAssertEqual(m.note, .nothingHeard, "the scripted microphone has nothing left to hear")
    }

    func testDownloadPack() async {
        let (c, _, d) = make("pack")
        let (x, _, t) = io([], [:])
        let m = InterpretTalkModel(ctx: c, io: x, defaults: d)
        await m.downloadPack(); XCTAssertEqual(m.note, .ready)
        t.prepared = false
        await m.downloadPack(); XCTAssertEqual(m.note, .unsupported)
    }

    func testPhrasebook() async {
        let (c, data, d) = make("phrases")
        let (x, speaker, _) = io([.heard("donde esta el bano")], [:])
        let m = InterpretPhrasesModel(ctx: c, io: x, group: "go", defaults: d)
        XCTAssertEqual(m.group, "go"); XCTAssertEqual(m.items.count, 4)
        m.setLang(.b, "es")
        XCTAssertEqual(m.text(m.items[0], .b), "¿Dónde está el baño?")
        m.play(0); XCTAssertEqual(speaker.said.last?.lang, "es"); m.play(0, slow: true); XCTAssertEqual(speaker.said.last?.slow, true)
        await m.save(0)
        let card = await data.load().cards.first
        XCTAssertEqual(card?.s("word"), "¿Dónde está el baño?"); XCTAssertEqual(card?.s("def"), "Nhà vệ sinh ở đâu?")   // the foreign phrase, its meaning in MY language (vi)
        await m.sayBack(0)
        XCTAssertEqual(m.note, .score(100, "donde esta el bano"))
        m.select("nope"); XCTAssertEqual(m.group, "go", "an unknown group is ignored")
        XCTAssertEqual(InterpretPhrasesModel(ctx: c, io: x, group: "zzz", defaults: d).group, "hi", "an unknown group → the first")
    }

    func testHistoryAndRecap() async {
        let (c, data, d) = make("recap", me: "en")
        let h = InterpHistory(defaults: d)
        h.addTurn(id: "c1", pair: InterpPair(a: "en", b: "es"), InterpTurn(from: "a", src: "Where is the station?", dst: "es", tx: "¿Dónde está la estación?", ts: 1))
        h.addTurn(id: "c1", pair: InterpPair(a: "en", b: "es"), InterpTurn(from: "b", src: "La estación está cerca.", dst: "en", tx: "The station is close.", ts: 2))
        let (x, speaker, _) = io([], [:])
        let hist = InterpretHistoryModel(ctx: c, io: x, defaults: d)
        XCTAssertEqual(hist.convs.count, 1)
        let r = InterpretRecapModel(ctx: c, io: x, id: "c1", defaults: d)
        await r.load()
        XCTAssertEqual(r.cards.map(\.word), ["¿Dónde está la estación?", "La estación está cerca."])
        XCTAssertEqual(r.foreign, "es"); XCTAssertTrue(r.keywords.contains("estación"))
        r.play(0); XCTAssertEqual(speaker.said.last?.lang, "es")
        await r.saveAll(); XCTAssertEqual(r.note, .saved)
        let cards = await data.load().cards
        XCTAssertEqual(cards.count, 2)
        XCTAssertNil(InterpretRecapModel(ctx: c, io: x, id: "nope", defaults: d).conv)
        hist.clear(); XCTAssertTrue(hist.convs.isEmpty); XCTAssertTrue(h.load().isEmpty)
    }

    func testHubSections() {
        let (c, _, d) = make("hub")
        let (x, _, _) = io([], [:])
        XCTAssertEqual(InterpretHubModel(ctx: c, io: x, arg: nil, defaults: d).section, .talk)
        let m = InterpretHubModel(ctx: c, io: x, arg: "phrases/eat", defaults: d)
        XCTAssertEqual(m.section, .phrases); XCTAssertEqual(m.phrases.group, "eat")
        m.select(.history); XCTAssertEqual(m.section, .history)
        XCTAssertEqual(InterpretHubModel(ctx: c, io: x, arg: "history", defaults: d).section, .history)
    }

    func testRoute() {
        XCTAssertEqual(AppRoute.parseHash("#/interpret/recap/c1")?.arg, "recap/c1")
        XCTAssertEqual(AppRoute("interpret").tab, "skills"); XCTAssertEqual(AppRoute("interpret").presentation, .push)
    }
}
