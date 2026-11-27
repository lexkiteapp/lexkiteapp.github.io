import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// P14 Interpreter: face to face (translation shown on the turned top half, source badge, last-turn actions, say-back score), phrasebook, history and recap in four variants –
/// en-light, vi-light, ar-light (RTL), de-dark (vi and ar at 1×, see `SnapshotFixtures.callScale`). Data = the real phrasebook (native/shared/gen/interpret/phrases.json, bundled copy);
/// no microphone, no model, no network, no sound. References live in __Snapshots__; CI records missing ones.
@MainActor
final class InterpretSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static let book = Interpret.bundledPhrases()!

    func store(_ lang: String) -> InterpretStore {
        let d = UserDefaults(suiteName: "lk.interpret.snapshot.\(lang)") ?? .standard
        d.removePersistentDomain(forName: "lk.interpret.snapshot.\(lang)")
        return InterpretStore(defaults: d)
    }
    func env(_ lang: String, store st: InterpretStore) -> InterpretEnv {
        InterpretEnv(me: lang, io: .scripted(), translator: ScriptedTranslator(), langId: ScriptedLangID(), voice: SilentVoice(), store: st, loadPhrases: { Self.book }, now: { Self.now })
    }
    func shoot<V: View>(testName: String = #function, _ make: (String) -> V) {
        for (lang, scheme) in SnapshotFixtures.callVariants(testName) {
            assertSnapshot(of: SnapshotFixtures.host(make(lang), lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: SnapshotFixtures.callScale(testName, lang))),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }

    /// two turns of a conversation of the learner's language with its default partner: a question asked, a phrase of the menu answered
    func conv(_ lang: String) -> Interpret.Conv {
        let p = Interpret.defaultPair(lang), q = Self.book.group("go")[0], e = Self.book.group("eat")[0]
        return Interpret.Conv("c1", Self.now, p.a, p.b, [Interpret.Turn("a", q[p.a]!, p.b, q[p.b]!, Self.now), Interpret.Turn("b", e[p.b]!, p.a, e[p.a]!, Self.now + 60_000)])
    }

    func testInterpretTalk() {
        shoot { lang in
            let p = Interpret.defaultPair(lang), q = Self.book.group("go")[0]
            let m = InterpretTalkModel(env: self.env(lang, store: self.store(lang)))
            m.preview(pair: p, heard: ["b": q[p.b]!], live: ["a": q[p.a]!], last: Interpret.Turn("a", q[p.a]!, p.b, q[p.b]!, Self.now), badge: (side: "b", local: true),
                      score: InterpretMsg(key: .interpretScore, vars: ["n": "86", "h": q[p.b]!]))
            return InterpretTalkView(model: m)
        }
    }
    func testInterpretPhrases() {
        shoot { lang in
            let st = self.store(lang)
            return InterpretPhrasesView(model: InterpretPhrasesModel(env: self.env(lang, store: st), group: "go"))
        }
    }
    func testInterpretHistory() {
        shoot { lang in
            let st = self.store(lang); st.saveHistory(Interpret.History([self.conv(lang)]))
            return InterpretHistoryView(model: InterpretHistoryModel(env: self.env(lang, store: st), id: nil))
        }
    }
    func testInterpretRecap() {
        shoot { lang in
            let st = self.store(lang); st.saveHistory(Interpret.History([self.conv(lang)]))
            return InterpretRecapView(model: InterpretHistoryModel(env: self.env(lang, store: st), id: "c1"))
        }
    }
}
