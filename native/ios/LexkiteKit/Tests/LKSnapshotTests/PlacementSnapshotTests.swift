import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M5 P10 (part) Entry test (#/placement): the intro, a vocabulary question (3 of 20), a grammar question and the result (band range, CEFR per skill, weak skill, path stage),
/// in en / vi / ar / de × light / dark. Fixed bank + fixed random numbers, no network, no sound. References live in __Snapshots__; CI records missing ones.
@MainActor
final class PlacementSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    func ctx(_ lang: String) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty)), voice: voice, calendar: Self.cal, now: { PlacementSnapshotTests.now })
        return SkillsContext(core: core, lang: lang, data: SkillsData(), defaults: UserDefaults(suiteName: "lk.placement.snapshot.\(lang)") ?? .standard)
    }

    func shoot<V: View>(testName: String = #function, _ make: (String) async -> V) async {
        for lang in SnapshotFixtures.langs {
            for scheme in SnapshotFixtures.schemes {
                let v = await make(lang)
                assertSnapshot(of: SnapshotFixtures.host(v, lang: lang, scheme: scheme),
                               as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: 1.5)),
                               named: SnapshotFixtures.name(lang, scheme), testName: testName)
            }
        }
    }

    /// the question after `skip` correct answers of a replayed session (even index = vocabulary, odd = grammar)
    func question(_ lang: String, skip: Int) -> PlaceQuestion {
        let s = PlaceSession(bank: .shared, rnd: Placement.lcg(3), seed: 99, meaningVi: lang == "vi")
        var q = s.next()!
        for _ in 0..<skip { s.answer(q.correct); q = s.next()! }
        return q
    }
    func model(_ lang: String) -> PlacementModel { PlacementModel(ctx: ctx(lang)) }

    // MARK: #/placement
    func testPlacementIntro() async {
        await shoot { lang in PlacementView(model: self.model(lang)) }
    }
    func testPlacementVocabQuestion() async {
        await shoot { lang in
            let m = self.model(lang); m.preview(question: self.question(lang, skip: 2), answered: 2)
            return PlacementView(model: m)
        }
    }
    func testPlacementGrammarQuestion() async {
        await shoot { lang in
            let m = self.model(lang); m.preview(question: self.question(lang, skip: 3), answered: 3)
            return PlacementView(model: m)
        }
    }
    func testPlacementResult() async {
        await shoot { lang in
            let m = self.model(lang)
            m.preview(result: (0..<20).map { i in PlaceResp(kind: i % 2 == 0 ? "vocab" : "grammar", lv: Placement.ladder[(i * 3) % 4], r: ["right", "wrong", "idk", "right", "right"][i % 5], c: i % 2 == 0 ? 0.25 : 1.0 / 3) })
            return PlacementView(model: m)
        }
    }
}
