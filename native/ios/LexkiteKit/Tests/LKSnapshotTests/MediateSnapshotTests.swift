import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P13 Mediation: the list (best scores), a lesson (B2 source with the text hidden – listen first – and the live count) and the result card, in en / vi / ar / de × light / dark.
/// No network, no microphone, no sound. References live in __Snapshots__; CI records missing ones.
@MainActor
final class MediateSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    func ctx(_ lang: String) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty)), voice: voice, calendar: Self.cal, now: { MediateSnapshotTests.now })
        return SkillsContext(core: core, lang: lang, data: SkillsData(), defaults: UserDefaults(suiteName: "lk.mediate.snapshot.\(lang)") ?? .standard)
    }
    func store(_ lang: String) -> MediateStore {
        let d = UserDefaults(suiteName: "lk.mediate.snapshot.store.\(lang)") ?? .standard
        d.removePersistentDomain(forName: "lk.mediate.snapshot.store.\(lang)")
        return MediateStore(defaults: d)
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
    /// the first lesson of a level (a B2 one hides its text), the way the app builds it
    func lesson(_ lang: String, level: String, store st: MediateStore) -> MediateLessonModel {
        let it = Mediation.shared.items(level: level)[0]
        return MediateLessonModel(ctx: ctx(lang), item: it, io: .scripted(), voice: nil, store: st)
    }

    // MARK: #/mediate
    func testMediateList() async {
        await shoot { lang in
            let st = self.store(lang)
            let xs = Mediation.shared.items
            st.record(xs[0].id, ok: 3, of: xs[0].points.count); st.record(xs[1].id, ok: 2, of: xs[1].points.count)
            return MediateListView(model: MediateListModel(ctx: self.ctx(lang), store: st))
        }
    }

    // MARK: #/mediate/<id>
    func testMediateLesson() async {
        await shoot { lang in
            let m = self.lesson(lang, level: "B2", store: self.store(lang))
            m.preview(text: "Hi, the meeting moved to Thursday at ten and you need to bring the report.", textShown: false)
            return MediateLessonView(model: m)
        }
    }
    func testMediateLessonA2Chart() async {
        await shoot { lang in
            let st = self.store(lang)
            let it = Mediation.shared.items.first { $0.source.kind == "chart" }!
            let m = MediateLessonModel(ctx: self.ctx(lang), item: it, io: .scripted(), voice: nil, store: st)
            m.preview(text: "", textShown: true)
            return MediateLessonView(model: m)
        }
    }
    func testMediateResult() async {
        await shoot { lang in
            let m = self.lesson(lang, level: "A2", store: self.store(lang))
            m.preview(text: m.item.model)
            m.check()
            return MediateLessonView(model: m)
        }
    }
}
