import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P08 #/call screens (Stitch call-list, call-ring, teacher-call, call-result): six states in four variants – en-light, vi-light, ar-light (RTL), de-dark –
/// = 24 images (en and de at 1.5×, vi and ar at 1× – see `SnapshotFixtures.callScale`). Content = the real calls of vectors/call.json `data.calls` (cut down to
/// five for the list so its footer is inside the frame); the call states are replayed through the REAL session (silent voice, frozen teacher, a clock that is a
/// number); the summary is built by the real engine from the answers of the vector flow `voice-fix-slip-retry`. Fixed learner state, in-memory data, no
/// sound, no network. References live in __Snapshots__; CI records missing ones.
@MainActor
final class CallSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    // MARK: fixtures
    static let vectorURL = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../shared/gen/vectors/call.json").standardized
    static let vector: JSON = (try? JSON.parse(try Data(contentsOf: vectorURL))) ?? .null
    static let pack: CallPack = {
        let text = (try? String(contentsOf: vectorURL, encoding: .utf8)) ?? ""
        var j: [String: JSON] = [:]
        j["calls"] = .array(Array((vector["data"]?.list("calls") ?? []).prefix(5)))
        j["pron"] = .obj([("contrasts", .array(vector["data"]?["pron"]?.list("contrasts") ?? []))])
        j["consts"] = CallPack.bundled()?.consts ?? .null
        j["v"] = "fixture"
        return CallPack(json: .object(j), extraOrder: CallJSONOrder.keys(in: text, after: "\"extraPairs\""))
    }()
    static let content = CallContentStore.Content(pack)
    static func script(_ id: String) -> CallScript { content.scripts.first { $0.id == id } ?? content.scripts[0] }
    /// the answers of the vector flow up to its first summary (bakery: by voice with a sound-pair slip and a grammar slip, typed, tapped)
    static let bakeryLog: [CallLogEntry] = {
        var out: [CallLogEntry] = []
        guard let f = vector["flow"]?.array?.first(where: { $0.s("id") == "voice-fix-slip-retry" }) else { return out }
        for st in f["out"]?.list("steps") ?? [] {
            for e in st.list("log") {
                out.append(CallLogEntry(id: e.s("id"), text: e.s("text"), picked: e.t("picked"), secs: e.d("secs") ?? 0, asr: e["asr"].map { Int(JSON.orZero($0)) }, typed: e.t("typed")))
            }
            if st["summary"] != nil { break }
        }
        return out
    }()

    func ctx(_ lang: String) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty)), voice: voice, calendar: Self.cal, now: { Self.now })
        let suite = "lk.call.snapshot.\(lang)"
        UserDefaults(suiteName: suite)?.removePersistentDomain(forName: suite)
        return SkillsContext(core: core, lang: lang, data: SkillsData(), defaults: UserDefaults(suiteName: suite) ?? .standard)
    }
    func flow(_ lang: String, arg: String? = nil) -> CallFlowModel {
        CallFlowModel(ctx: ctx(lang), arg: arg, caps: CallCaps(onDevice: true, system: true), io: { SpeakIO.scripted() }, content: Self.content)
    }
    func run(_ lang: String, _ id: String, taps: [Int] = [], talking: Bool = false, chunks: [String] = [], advanceMs: Int64 = 0, elapsed: Int) -> CallRunModel {
        let m = CallRunModel.fixture(ctx: ctx(lang), script: Self.script(id), engine: Self.content.engine, taps: taps, talking: talking, chunks: chunks, advanceMs: advanceMs)
        m.fixtureElapsed(elapsed)
        return m
    }
    func summary(_ lang: String) -> (CallFlowModel, CallSummaryModel) {
        let f = flow(lang), bakery = Self.script("bakery")
        let s = CallSummary.make(script: bakery, log: Self.bakeryLog, secs: 41, engine: Self.content.engine)
        return (f, CallSummaryModel(ctx: ctx(lang), summary: s))
    }

    func shoot<V: View>(testName: String = #function, _ make: (String) -> V) {
        for (lang, scheme) in SnapshotFixtures.callVariants(testName) {
            assertSnapshot(of: SnapshotFixtures.host(make(lang), lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: SnapshotFixtures.callScale(testName, lang))),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }

    // MARK: states
    func testCallFixtureData() {
        XCTAssertEqual(Self.content.scripts.count, 5, "the vector carries the calls of the fixtures")
        XCTAssertGreaterThanOrEqual(Self.bakeryLog.count, 4, "the bakery answers come from the vector flow")
    }
    func testCallList() {
        shoot { lang in
            let m = self.flow(lang)
            m.setFilter("all")
            return CallListView(model: m)
        }
    }
    func testCallRing() {
        shoot { lang in
            let m = self.flow(lang, arg: "ielts-p2-place")
            return CallRingView(model: m, script: Self.script("ielts-p2-place"))
        }
    }
    func testCallTalk() {
        shoot { lang in CallRunView(model: self.run(lang, "coffee", talking: true, elapsed: 41)) }
    }
    func testCallLongTurn() {
        shoot { lang in
            CallRunView(model: self.run(lang, "ielts-p2-place", taps: [0],
                                        chunks: ["I’d like to talk about Hoi An, an old town that is located in central Vietnam. It takes about forty minutes to get there from Da Nang by bus."],
                                        advanceMs: 43_000, elapsed: 104))
        }
    }
    func testCallSummaryTop() {
        shoot { lang in
            let (f, m) = self.summary(lang)
            return CallSummaryView(model: m, flow: f)
        }
    }
    func testCallSummaryTranscript() {
        shoot { lang in
            let (f, m) = self.summary(lang)
            return CallSummaryView(model: m, flow: f, startAt: .transcript)
        }
    }
}
