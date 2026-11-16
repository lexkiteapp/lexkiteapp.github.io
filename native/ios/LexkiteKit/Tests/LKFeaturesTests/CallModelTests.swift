import Foundation
import XCTest
@testable import LKFeatures
import LKStore
import LKSync
import LKStrings
import LKCore

/// P08: the flow model of #/call on the real session with a silent voice and in-memory data. The numbers and texts of the engine and of every call flow are
/// gated by LKSyncTests/CallVectorTests (vectors from the web code); this walks list → ring → call → summary → retry end to end, with what is stored.
@MainActor
final class CallModelTests: XCTestCase {
    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    func ctx(_ n: String) -> (SkillsContext, MemoryVocabData, UserDefaults) {
        let d = UserDefaults(suiteName: "lk.test.p08.\(n)")!
        d.removePersistentDomain(forName: "lk.test.p08.\(n)")
        let data = MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty))
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: FakeTransport(failing: { _ in true }), cacheDirectory: nil))
        let core = StudyCore(data: data, voice: voice, calendar: Self.cal, now: { Self.now })
        return (SkillsContext(core: core, lang: "en", defaults: d), data, d)
    }
    func eventually(_ ok: @escaping () async -> Bool) async -> Bool {
        for _ in 0..<200 { if await ok() { return true }; try? await Task.sleep(nanoseconds: 20_000_000) }
        return false
    }
    func xp(_ data: MemoryVocabData) async -> Int { Int(JSON.orZero(await data.load().game["xp"])) }

    func testParityP08Models() async throws {
        let (c, data, defaults) = ctx("flow")
        let content = CallContentStore.Content(try XCTUnwrap(CallPack.bundled()))
        XCTAssertEqual(content.scripts.count, 8, "the bundled starter works offline")
        let f = CallFlowModel(ctx: c, arg: nil, caps: CallCaps(onDevice: true, system: true), io: { SpeakIO.scripted() }, content: content)
        // the list: the filter is remembered on the device, the privacy line follows the recogniser of the phone
        XCTAssertEqual(f.mode, .local)
        XCTAssertEqual(f.filter, "all"); XCTAssertEqual(f.shown.count, 8)
        f.setFilter("toeic")
        XCTAssertEqual(defaults.string(forKey: CallList.fltKey), "toeic")
        XCTAssertTrue(f.shown.allSatisfy { CallList.groupOf($0) == "toeic" })
        let again = CallFlowModel(ctx: c, arg: nil, caps: CallCaps(onDevice: false, system: true), io: { SpeakIO.scripted() }, content: content)
        XCTAssertEqual(again.filter, "toeic"); XCTAssertEqual(again.mode, .ask, "only the system recogniser: the learner is asked first, never silently the cloud")
        defaults.set("cloud", forKey: CallList.asrKey)
        XCTAssertEqual(CallFlowModel(ctx: c, arg: nil, caps: CallCaps(onDevice: false, system: true), io: { SpeakIO.scripted() }, content: content).mode, .cloud)
        again.resetAsr()
        XCTAssertNil(defaults.string(forKey: CallList.asrKey)); XCTAssertTrue(again.asrNotice)
        // an unknown id shows the list, a known one the ring
        if case .list = CallFlowModel(ctx: c, arg: "zzz", caps: f.caps, io: { SpeakIO.scripted() }, content: content).screen {} else { XCTFail("an unknown id shows the list") }
        let s = try XCTUnwrap(content.scripts.first)
        guard case .ring(let ringed) = CallFlowModel(ctx: c, arg: s.id, caps: f.caps, io: { SpeakIO.scripted() }, content: content).screen else { return XCTFail("the ring") }
        XCTAssertEqual(ringed.id, s.id)
        // a call answered by typing: the first answer has a grammar slip; hanging up is not needed, the last answer ends it
        f.setFilter("all")
        f.startCall(s)
        let run = try XCTUnwrap(f.run)
        let depth = content.engine.depth(s)
        for k in 0..<depth { run.session.submitTyped(k == 0 ? "I am agree, yes please" : "Yes please") }
        let ended = await eventually { f.summary != nil }
        XCTAssertTrue(ended, "the summary opens 900 ms after the last answer")
        let sum = try XCTUnwrap(f.summary)
        XCTAssertEqual(sum.recap.turns.count, depth)
        XCTAssertEqual(sum.summary.voiced, 0, "typed answers are not voiced")
        XCTAssertFalse(sum.recap.weak.isEmpty, "the slip makes the first turn weak")
        let got = await eventually { await self.xp(data) == sum.summary.xp }
        XCTAssertTrue(got, "App.reward({ spoken, xp }) once, when the summary opens")
        // add to review cards: the phrases and the fixes, topic call
        await sum.save()
        XCTAssertEqual(sum.savedCount, sum.summary.cards.count)
        let cards = await data.load().cards
        XCTAssertFalse(cards.isEmpty)
        // retry the weak lines: a call of only those turns, same teacher
        f.retryWeak()
        let r = try XCTUnwrap(f.run)
        XCTAssertTrue(r.script.retry); XCTAssertEqual(r.script.who, s.who); XCTAssertEqual(r.script.nodes.count, sum.recap.weak.count)
        // hanging up before any answer goes back to the list, no summary
        r.session.hang()
        if case .list = f.screen {} else { XCTFail("hang up with no answer ⇒ the list") }
        XCTAssertNil(f.summary)
    }
}
