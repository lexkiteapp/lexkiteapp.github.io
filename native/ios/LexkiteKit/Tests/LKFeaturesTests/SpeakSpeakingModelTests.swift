import Foundation
import XCTest
@testable import LKFeatures
import LKStore
import LKSync
import LKStrings
import LKCore

/// P07 (fork A): #/speak and #/speaking on the real models with a scripted microphone and in-memory data. The rules and texts are gated by
/// LKSyncTests/SpeakSpeakingVectorTests (vectors from the web code); this walks the flows end to end.
@MainActor
final class SpeakSpeakingModelTests: XCTestCase {
    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    func suite(_ n: String) -> UserDefaults { let d = UserDefaults(suiteName: "lk.test.p07a.\(n)")!; d.removePersistentDomain(forName: "lk.test.p07a.\(n)"); return d }
    func ctx(_ n: String) -> (SkillsContext, MemoryVocabData) {
        let data = MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty))
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: FakeTransport(failing: { _ in true }), cacheDirectory: nil))
        let core = StudyCore(data: data, voice: voice, calendar: Self.cal, now: { Self.now })
        return (SkillsContext(core: core, lang: "en", defaults: suite(n)), data)
    }
    func eventually(_ ok: @escaping () async -> Bool) async -> Bool {
        for _ in 0..<150 { if await ok() { return true }; try? await Task.sleep(nanoseconds: 20_000_000) }
        return false
    }
    func xp(_ data: MemoryVocabData) async -> Int { Int(JSON.orZero(await data.load().game["xp"])) }
    static let situation: JSON = (try? JSON.parse(#"""
    {"id":"zz","cefr":"A2","title":{"en":"Test & more"},"goal":{"en":"Goal"},"stages":[{"id":"a","title":{"en":"A"},"lines":["l1","l2"]}],
     "lines":[{"id":"l1","en":"Hello there friend","gloss":{"en":"Greet"},"pitfalls":[]},{"id":"l2","en":"How are you","gloss":{"en":"Ask"},"pitfalls":[]}],
     "mission":{"tasks":[{"id":"t1","title":{"en":"Greet"},"intents":["l1"]}]},"culture":{"en":"c"}}
    """#)) ?? .null

    final class Files: LessonTextSource, @unchecked Sendable {
        let files: [String: String]
        let lock = NSLock()
        var asked: [String] = []
        init(_ f: [String: String]) { files = f }
        func text(_ path: String) async -> String? { lock.lock(); asked.append(path); lock.unlock(); return files[path] }
    }

    // MARK: #/speak
    func testParityP07SpeakModels() async throws {
        // the route is behind the `speak_pack` flag, off by default
        let d = suite("flag")
        XCTAssertFalse(SpeakRoutes.speakPackOn(d))
        d.set(true, forKey: SpeakRoutes.speakPackKey)
        XCTAssertTrue(SpeakRoutes.speakPackOn(d))

        // the platform answer → Speak.score: the closest alternative, the platform score, the accent asked for
        let rec = ScriptedRecognizer([RecognizeOutcome(alts: ["hello their friend", "hello there friend"], elapsedMs: 2000), .failed("no-speech")])
        let io = SpeakIO(recognizer: rec)
        let ok = await io.attempt(target: "Hello there friend", locale: "en-US")
        XCTAssertEqual(ok.heard, "hello there friend"); XCTAssertEqual(ok.conf, 1); XCTAssertEqual(ok.text, 1); XCTAssertEqual(ok.wpm, 90)
        let none = await io.attempt(target: "Hello there friend", locale: "en-US")
        XCTAssertTrue(none.unclear); XCTAssertEqual(none.error, "no-speech")
        XCTAssertEqual(rec.calls, ["en-US", "en-US"])

        // a drill with a mic: the pass is recorded in lk.spk and rewarded spoken 1 · xp 2·stars
        let (c1, data1) = ctx("mic")
        let m1 = SpeakDrillModel(ctx: c1, io: .scripted([.heard("Hello there friend")]), situation: Self.situation, stage: nil)
        XCTAssertEqual(m1.drill.target, "Hello there friend")
        await m1.mic()
        XCTAssertEqual(m1.drill.res?.stars, 1)
        let stored = try XCTUnwrap(JSON.parse(c1.defaults.string(forKey: SpeakSit.storeKey) ?? "{}"))
        XCTAssertEqual(stored["zz"]?["lines"]?["l1"]?.i("stars"), 1)
        XCTAssertEqual(stored["zz"]?["tasks"]?["t1"], .bool(true), "the mission task that names the line is done")
        XCTAssertEqual(Int(JSON.orZero(stored["week"]?[SpeakSit.weekKey(Self.now, calendar: Self.cal)])), 1)
        let got = await eventually { await self.xp(data1) == 2 }
        XCTAssertTrue(got, "reward xp 2·1 star")

        // no mic: the words are tapped in order, at most 1 star, the line is recorded but nothing is rewarded
        let (c2, data2) = ctx("nomic")
        let m2 = SpeakDrillModel(ctx: c2, io: .scripted([.failed("not-allowed")]), situation: Self.situation, stage: nil)
        await m2.mic()
        XCTAssertTrue(m2.drill.noMic)
        await m2.tap(1)                    // wrong first word
        XCTAssertEqual(m2.drill.built, [])
        for k in 0..<3 { await m2.tap(k) }
        XCTAssertEqual(m2.drill.res?.stars, 1); XCTAssertEqual(m2.drill.res?.pass, true)
        let stored2 = try XCTUnwrap(JSON.parse(c2.defaults.string(forKey: SpeakSit.storeKey) ?? "{}"))
        XCTAssertEqual(stored2["zz"]?["lines"]?["l1"]?.i("stars"), 1)
        try? await Task.sleep(nanoseconds: 200_000_000)
        let none2 = await xp(data2)
        XCTAssertEqual(none2, 0, "no reward without a mic")
        await m2.retry()   // after a result: the same line again
        await m2.retry()   // before one: back to the mic, remembered
        XCTAssertFalse(m2.drill.noMic)
        XCTAssertEqual(JSON.orZero(try XCTUnwrap(JSON.parse(c2.defaults.string(forKey: SpeakSit.storeKey) ?? "{}"))["nomic"]), 0)

        // situations are fetched when opened: an id the index does not know is unknown, a file that is missing fails, the files asked for are the base + translation
        let src = Files(["js/speak/data.js": "self.SPK_IDX = {\"zz-fetch\":{\"g\":\"food\",\"c\":\"A2\",\"l\":\"vi\"},\"zz-gone\":{\"g\":\"food\",\"c\":\"A2\",\"l\":\"\"}};\nself.SPK_P = {};\n",
                         "cpack/speak/s/zz-fetch.js": "(self.SPK_B || (self.SPK_B = {}))[\"zz-fetch\"] = {\"id\":\"zz-fetch\",\"title\":{\"en\":\"T\"},\"stages\":[],\"lines\":[]};\nself.SPK_L = {};",
                         "cpack/speak/s/zz-fetch.vi.js": "(self.SPK_T || (self.SPK_T = {}))[\"zz-fetch.vi\"] = [\"Tiêu đề\"];"])
        if case .found(let s) = await SpeakSitSource.load("zz-fetch", lang: "vi", source: src) { XCTAssertEqual(s["title"]?.s("vi"), "Tiêu đề") } else { XCTFail("not found") }
        XCTAssertEqual(src.asked, ["js/speak/data.js", "cpack/speak/s/zz-fetch.js", "cpack/speak/s/zz-fetch.vi.js"])
        if case .unknown = await SpeakSitSource.load("zzz", lang: "vi", source: src) {} else { XCTFail("unknown id") }
        if case .failed = await SpeakSitSource.load("zz-gone", lang: "en", source: src) {} else { XCTFail("failed download") }
    }

    // MARK: #/speaking
    func testParityP07SpeakingModels() async throws {
        let (c, data) = ctx("speaking")
        await c.reload()   // SkillsHost loads the learner data (settings.accent = us) before it builds a model
        let said = SayLog()
        let io = SpeakIO(recognizer: ScriptedRecognizer(),
                         say: { t, who, accent, slow, end in said.lines.append((t, accent, slow)); end?() }, random: { 0 })
        let m = SpeakingModel(ctx: c, io: io, pack: SpeakPack.bundled(), lexis: Lexis(LexisData()), arg: "p2/abc")
        XCTAssertEqual(m.partId, "p2"); XCTAssertEqual(m.topicIndex, 0, "a topic that is not a number opens the first one")
        m.select(part: "p1")
        XCTAssertEqual(m.question, "Do you work or are you a student?")
        m.hear()
        XCTAssertEqual(said.lines.last?.0, "Do you work or are you a student?"); XCTAssertEqual(said.lines.last?.1, "en-US", "the accent of settings.accent (us here)")
        m.randomTopic()
        XCTAssertNotEqual(m.topicIndex, 0, "the dice never repeats the current topic")
        m.select(topic: 0); m.select(part: "p3"); m.nextQuestion()
        XCTAssertEqual(m.qi, 1); XCTAssertEqual(m.stage, .ready)

        // an answer: the analysis, the reward spoken min(10, round(words/10)) · quizzes 1 · xp 15, only from 10 words on
        m.analyse(text: "I think it is a good idea because there are many reasons for it today", seconds: 30)
        XCTAssertEqual(m.stage, .result); XCTAssertEqual(m.analysis?.words, 15)
        let got = await eventually { await self.xp(data) == 15 }
        XCTAssertTrue(got)
        m.analyse(text: "I like it", seconds: 5)
        try? await Task.sleep(nanoseconds: 200_000_000)
        let still = await xp(data)
        XCTAssertEqual(still, 15, "under 10 words earns nothing")

        // Part 2 asks for a minute of preparation first; the second tap records at once
        m.select(part: "p2")
        m.micTapped()
        XCTAssertEqual(m.stage, .prep); XCTAssertEqual(m.prepLeft, 60)
        m.skipPrep()
        XCTAssertEqual(m.stage, .recording)
        m.discard()
        XCTAssertEqual(m.stage, .ready)

        // shadowing: the average divides by the number of sentences, the reward comes once at the end
        m.select(part: "p1")
        m.startShadow()
        let sentences = m.sample?.sentences ?? []
        XCTAssertEqual(sentences.count, 3)
        io.recognizer = ScriptedRecognizer([.heard(sentences[0], ms: 1000), .heard(sentences[2], ms: 1000)])
        await m.shadowSpeak(); XCTAssertEqual(m.shadowLast?.score, 100)
        await m.shadowNext()
        await m.shadowSkip()
        await m.shadowSpeak(); await m.shadowNext()
        XCTAssertEqual(m.shadowDone, 67, "(100 + 0 + 100) / 3 sentences")
        let more = await eventually { await self.xp(data) == 25 }
        XCTAssertTrue(more, "shadowing reward xp 10")
    }
    final class SayLog: @unchecked Sendable { var lines: [(String, String, Bool)] = [] }
}
