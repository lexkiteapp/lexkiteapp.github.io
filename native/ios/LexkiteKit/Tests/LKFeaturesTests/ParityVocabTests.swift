import XCTest
@testable import LKFeatures
import LKStore
import LKSync

/// P04 (review + practice + mistakes + deck) and P05 (dictionary + word book) behaviour on the real models with in-memory data.
/// The FSRS / dictionary numbers are gated by LKSyncTests/VocabVectorTests (vectors from the web code); this walks the flows end to end.
@MainActor
final class ParityVocabTests: XCTestCase {
    static let now: Int64 = 1_767_603_600_000
    static let day = 86_400_000.0
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }

    func core(_ b: VocabBundle) -> (StudyCore, MemoryVocabData) {
        let data = MemoryVocabData(b)
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: FakeTransport(failing: { _ in true }), cacheDirectory: nil))
        return (StudyCore(data: data, voice: voice, calendar: Self.cal, now: { ParityVocabTests.now }), data)
    }
    /// commits are fire-and-forget tasks: wait until the stored data satisfies `ok`
    func eventually(_ ok: @escaping () async -> Bool) async -> Bool {
        for _ in 0..<150 { if await ok() { return true }; try? await Task.sleep(nanoseconds: 20_000_000) }
        return false
    }
    func srs(_ data: MemoryVocabData, _ word: String) async -> JSON? {
        await data.load().cards.first { $0.s("word") == word }?["srs"]
    }

    func testParityP04() async throws {
        let n = Double(Self.now)
        let srsState: JSON = .obj([("ef", 2.5), ("interval", 3), ("reps", 2), ("lapses", 0), ("step", 0), ("due", .number(n - Self.day)), ("last", .number(n - 4 * Self.day)), ("S", 6), ("D", 5)])
        let card: JSON = .obj([("word", "consider"), ("vi", "cân nhắc"), ("ipa", "/kənˈsɪdər/"), ("pos", "verb"), ("ex", "We are considering moving."), ("def", ""), ("level", "B1"),
                               ("topic", "education"), ("emoji", "🤔"), ("col", .array([])), ("syn", .array([])), ("sentences", .array([])), ("contexts", .array([])), ("note", ""),
                               ("image", ""), ("added", .number(n - 9 * Self.day)), ("srs", srsState)])
        let (c, data) = core(VocabBundle(cards: [card], stats: .object([:]), settings: ["dailyNew": 10, "dailyGoal": 20, "reviewMode": "flip", "accent": "us"], game: StudyGame.empty))
        let m = StudyReviewModel(core: c); m.autoPlay = false
        await m.load()
        XCTAssertEqual(m.phase, .card, "one due card opens the review")
        XCTAssertEqual(m.current?.s("word"), "consider")
        let before = await srs(data, "consider")
        XCTAssertEqual(before?.d("S"), 6)

        // grade Good: FSRS state is rewritten (stability, difficulty, repetitions, due, last review)
        m.flip()
        m.grade(2)
        let wrote = await eventually { await self.srs(data, "consider")?.i("reps") == 3 }
        XCTAssertTrue(wrote, "the graded card is stored")
        let after = await srs(data, "consider")
        XCTAssertGreaterThan(after?.d("S") ?? 0, 0)
        XCTAssertNotEqual(after?.d("S"), before?.d("S"), "stability moved")
        XCTAssertNotNil(after?.d("D"))
        XCTAssertGreaterThan(after?.d("due") ?? 0, n, "next review is in the future")
        XCTAssertEqual(after?.d("last"), n, "last review = now")
        XCTAssertTrue(m.canUndo)

        // undo restores the previous schedule exactly
        m.undo()
        let restored = await eventually { await self.srs(data, "consider")?.i("reps") == 2 }
        XCTAssertTrue(restored, "undo writes the old state back")
        let back = await srs(data, "consider")
        XCTAssertEqual(back?.d("S"), before?.d("S"))
        XCTAssertEqual(back?.d("D"), before?.d("D"))
        XCTAssertEqual(back?.d("due"), before?.d("due"))
        XCTAssertEqual(back?.d("last"), before?.d("last"))
        XCTAssertEqual(m.current?.s("word"), "consider", "the card is back in front of the learner")
    }

    func testParityP05() async throws {
        let (c, data) = core(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty))
        let m = DictModel(uiLang: "en", network: DictOfflineNetwork(), cache: nil, loader: nil, defaults: UserDefaults(suiteName: "lk.parity.p05") ?? .standard, live: true)
        var shard = LexShard()
        shard.e["consider"] = .obj([("word", "consider"), ("ipa", "/kənˈsɪdər/"), ("pos", "verb"), ("vi", "cân nhắc"), ("def", "to think carefully about something"),
                                    ("ex", "We are considering moving to a new city."), ("level", "B1"), ("emoji", "🤔"), ("topic", "education")])
        await m.lex.setFallback(shard)
        m.cardSource = { await c.data.load().cards }
        m.saveCard = { entry, ctx in
            var b = await c.data.load()
            let card = c.addWord(entry, context: ctx, into: &b)
            await c.commit(VocabEdit(upsert: [card]))
        }

        // 1. look the word up (local lexicon, no network)
        await m.open("consider")
        XCTAssertEqual(m.entry?.s("word"), "consider")
        XCTAssertEqual(m.entry?.s("pos"), "verb")
        XCTAssertNil(m.card, "not saved yet")

        // 2. save it
        await m.save()
        XCTAssertNotNil(m.card, "the word card now shows as saved")
        XCTAssertEqual(m.savedNote, "saved")

        // 3. it appears in the word book (deck) with a fresh review schedule
        let deck = DeckModel(core: c); await deck.load(query: [:])
        XCTAssertTrue(deck.cards.contains { $0.s("word") == "consider" })
        XCTAssertTrue(deck.matched.contains { $0.s("word") == "consider" })
        let stored = await data.load().cards.first { $0.s("word") == "consider" }
        XCTAssertEqual(stored?.s("vi"), "cân nhắc")
        XCTAssertEqual(stored?["srs"]?.i("reps"), 0, "a new card starts unreviewed")
    }
}
