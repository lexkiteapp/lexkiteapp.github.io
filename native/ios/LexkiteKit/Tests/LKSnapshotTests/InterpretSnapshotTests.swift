import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// Phiên dịch (#/interpret): the face-to-face screen (idle, and after a turn: the translation in the half of the other person, the upper half turned 180°),
/// the travel phrasebook, the history and the new-word recap – each in en · vi · ar (RTL) · de × light · dark = 8 images per state. The phrases are the real
/// bundled phrasebook (web/cpack/interpret/phrases.js); fixed learner state, in-memory data, scripted devices: no microphone, no sound, no network.
/// References live in __Snapshots__; CI records missing ones.
@MainActor
final class InterpretSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }
    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    func defaults(_ lang: String) -> UserDefaults {
        let suite = "lk.interp.snapshot.\(lang)"
        let d = UserDefaults(suiteName: suite)!; d.removePersistentDomain(forName: suite)
        return d
    }
    func ctx(_ lang: String, _ d: UserDefaults) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty)), voice: voice, calendar: Self.cal, now: { Self.now })
        return SkillsContext(core: core, lang: lang, data: SkillsData(), defaults: d)
    }
    /// my language ⇄ English (Spanish for an English learner); `foreign` = the other side
    func pair(_ lang: String) -> InterpPair { InterpPair.initial(me: lang) }
    /// phrase `i` of the real phrasebook in a language
    func phrase(_ group: String, _ i: Int, _ lang: String) -> String { InterpPhrases.bundled.items(in: group)[i].t[lang] ?? "" }
    func io() -> InterpIO { InterpIO.scripted() }

    func talk(_ lang: String, turn: Bool) -> InterpretView {
        let d = defaults(lang), p = pair(lang)
        let t: InterpTurn? = turn ? InterpTurn(from: "b", src: phrase("go", 1, p.b), dst: p.a, tx: phrase("go", 1, p.a), ts: Self.now) : nil
        let c = ctx(lang, d)
        let m = InterpretTalkModel.fixture(ctx: c, io: io(), defaults: d, pair: p, turn: t)
        return InterpretView(model: InterpretHubModel(section: .talk, talk: m, phrases: InterpretPhrasesModel(ctx: c, io: io(), group: nil, defaults: d),
                                                       history: InterpretHistoryModel(ctx: c, io: io(), defaults: d)))
    }

    func shoot<V: View>(testName: String = #function, _ make: (String) -> V) {
        for lang in SnapshotFixtures.langs {
            for scheme in SnapshotFixtures.schemes {
                assertSnapshot(of: SnapshotFixtures.host(make(lang), lang: lang, scheme: scheme),
                               as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: 1)),
                               named: SnapshotFixtures.name(lang, scheme), testName: testName)
            }
        }
    }

    func testInterpretTalkIdle() { shoot { self.talk($0, turn: false) } }
    func testInterpretTalkTranslated() { shoot { self.talk($0, turn: true) } }
    func testInterpretPhrases() {
        shoot { lang in
            let d = self.defaults(lang)
            let hub = InterpretHubModel(ctx: self.ctx(lang, d), io: self.io(), arg: "phrases/eat", defaults: d)
            return InterpretView(model: hub)
        }
    }
    func testInterpretHistory() {
        shoot { lang in
            let d = self.defaults(lang), p = self.pair(lang), h = InterpHistory(defaults: d)
            for (i, id) in ["c1", "c2", "c3"].enumerated() {
                h.addTurn(id: id, pair: p, InterpTurn(from: "a", src: self.phrase("hi", i, p.a), dst: p.b, tx: self.phrase("hi", i, p.b), ts: Self.now - Int64(i) * 86_400_000))
            }
            let hub = InterpretHubModel(ctx: self.ctx(lang, d), io: self.io(), arg: "history", defaults: d)
            return InterpretView(model: hub)
        }
    }
    func testInterpretRecap() {
        shoot { lang in
            let d = self.defaults(lang), p = self.pair(lang), h = InterpHistory(defaults: d)
            for i in 0..<3 {
                h.addTurn(id: "c1", pair: p, InterpTurn(from: i % 2 == 0 ? "a" : "b", src: self.phrase("eat", i, i % 2 == 0 ? p.a : p.b), dst: i % 2 == 0 ? p.b : p.a, tx: self.phrase("eat", i, i % 2 == 0 ? p.b : p.a), ts: Self.now + Int64(i)))
            }
            return InterpretRecapView(model: InterpretRecapModel(ctx: self.ctx(lang, d), io: self.io(), id: "c1", defaults: d))
        }
    }
}
