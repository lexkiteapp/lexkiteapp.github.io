import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P07 #/speak and #/speaking screens (Stitch pas-sit, pas-drill, speaking-hub, speaking-record, speaking-result): every state in four variants (1.5×):
/// en-light, vi-light, ar-light (RTL), de-dark. Content = the café situation of web/cpack/speak/s (with the language's translation file when there is one) and the bundled
/// speaking starter pack; fixed learner state, fixed clock, scripted microphone, frozen teacher, no sound, no network. Result states use a taller frame so the whole card is in the image.
/// 15 states × 4 variants = 60 images. References live in __Snapshots__; CI records missing ones.
@MainActor
final class SpeakSpeakingSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }
    static let variants: [(String, ColorScheme)] = [("en", .light), ("vi", .light), ("ar", .light), ("de", .dark)]
    static let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../..").standardized
    static let tall = CGSize(width: 390, height: 900)   // PR image budget: the top of every state in frame
    static let progress: JSON = (try? JSON.parse(#"{"cafe":{"lines":{"o1":{"best":0.9,"stars":2},"o2":{"best":0.9,"stars":1},"o3":{"best":1,"stars":3},"o4":{"best":1,"stars":2},"p1":{"best":1,"stars":2}},"tasks":{"two-drinks":true}},"week":{"2026-W2":7}}"#)) ?? .null
    struct Nothing: LessonTextSource { func text(_ path: String) async -> String? { nil } }

    /// the café exactly as the app builds it: base file + the translation file of the UI language (English when there is none)
    static func situation(_ lang: String) -> JSON {
        let dir = root.appendingPathComponent("web/cpack/speak/s")
        let base = (try? String(contentsOf: dir.appendingPathComponent("cafe.js"), encoding: .utf8)) ?? ""
        let tr = try? String(contentsOf: dir.appendingPathComponent("cafe.\(lang).js"), encoding: .utf8)
        return SpeakSit.situation(base: base, translation: tr, lang: lang) ?? .null
    }
    func ctx(_ lang: String, progress: JSON? = nil, cards: [JSON] = []) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: SkillsSnapshotTests.Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: cards, stats: .object([:]), settings: ["accent": "uk"], game: StudyGame.empty)), voice: voice,
                             calendar: SkillsSnapshotTests.cal, now: { SkillsSnapshotTests.now })
        let d = UserDefaults(suiteName: "lk.speak.snapshot.\(lang)") ?? .standard
        d.removePersistentDomain(forName: "lk.speak.snapshot.\(lang)")
        if let progress { SpeakSitStore.save(progress, d) }
        return SkillsContext(core: core, lang: lang, defaults: d)
    }
    func shoot<V: View>(testName: String = #function, size: CGSize? = nil, _ make: (String) async -> V) async {
        for (lang, scheme) in SnapshotFixtures.speakVariants(testName) {
            let v = await make(lang)
            assertSnapshot(of: SnapshotFixtures.host(v, lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, size: size, traits: UITraitCollection(displayScale: SnapshotFixtures.speakScale(testName, lang))),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }
    func teacher(_ pose: String = "talk") -> TeacherController { TeacherController.frozen(who: "ama", pose: pose) }
    func said(_ d: SpeakDrillModel, _ heard: String) -> SpeakScore.Result { SpeakScore.result(target: d.drill.target, heard: heard, platformScore: 100, seconds: 2) }

    // MARK: #/speak/cafe  (pas-sit)
    func testSpeakSituationHub() async {
        let cards: [JSON] = [.obj([("word", "latte"), ("ipa", "/ˈlɑːteɪ/")]), .obj([("word", "please")])]
        await shoot(size: CGSize(width: 390, height: 1200)) { lang in
            let m = SpeakSituationModel(ctx: self.ctx(lang, progress: Self.progress, cards: cards), id: "cafe", situation: Self.situation(lang), teacher: self.teacher("point"))
            await m.load()
            return SpeakSituationView(model: m)
        }
    }
    func testSpeakSituationFresh() async {
        await shoot(size: CGSize(width: 390, height: 1100)) { lang in
            let m = SpeakSituationModel(ctx: self.ctx(lang), id: "cafe", situation: Self.situation(lang), teacher: self.teacher("point"))
            m.cultureOpen = true
            await m.load()
            return SpeakSituationView(model: m)
        }
    }
    /// the situation could not be downloaded: the retry card (web: toast + back to the skills tab)
    func testSpeakSituationOffline() async {
        await shoot { lang in
            let m = SpeakSituationModel(ctx: self.ctx(lang), id: "cafe", source: Nothing(), teacher: self.teacher())
            await m.load()
            return SpeakSituationView(model: m)
        }
    }

    // MARK: #/speak/cafe/drill  (pas-drill)
    func drill(_ lang: String, _ stage: String? = nil) -> SpeakDrillModel {
        SpeakDrillModel(ctx: ctx(lang), io: .scripted(random: { 0.5 }), situation: Self.situation(lang), stage: stage, teacher: teacher())
    }
    func testSpeakDrillListen() async {
        await shoot(size: Self.tall) { lang in SpeakDrillView(model: self.drill(lang)) }
    }
    func testSpeakDrillListening() async {
        await shoot(size: Self.tall) { lang in
            let m = self.drill(lang); m.fixtureRecording()
            return SpeakDrillView(model: m)
        }
    }
    func testSpeakDrillShadowPassed() async {
        await shoot(size: CGSize(width: 390, height: 1000)) { lang in
            let m = self.drill(lang)
            m.fixtureAttempt(self.said(m, m.drill.target)); await m.next()
            m.fixtureAttempt(self.said(m, m.drill.target))
            return SpeakDrillView(model: m)
        }
    }
    func testSpeakDrillMemory() async {
        await shoot(size: Self.tall) { lang in
            let m = self.drill(lang)
            m.fixtureAttempt(self.said(m, m.drill.target)); await m.next()
            m.fixtureAttempt(self.said(m, m.drill.target)); await m.next()
            return SpeakDrillView(model: m)
        }
    }
    func testSpeakDrillTryAgain() async {
        await shoot(size: CGSize(width: 390, height: 1100)) { lang in
            let m = self.drill(lang)
            m.fixtureAttempt(SpeakScore.result(target: m.drill.target, heard: "could I get latte", platformScore: 52, seconds: 3))
            return SpeakDrillView(model: m)
        }
    }
    /// no microphone: the words are tapped in order, two are placed
    func testSpeakDrillTapInOrder() async {
        await shoot(size: Self.tall) { lang in
            let m = self.drill(lang)
            m.fixtureMicBlocked(); m.fixtureTap(2)
            return SpeakDrillView(model: m)
        }
    }

    // MARK: #/speaking
    func speaking(_ lang: String, _ arg: String) -> SpeakingModel {
        SpeakingModel(ctx: ctx(lang), io: .scripted(random: { 0.5 }), pack: SpeakPack.bundled(), lexis: SkillsContext.sharedLexis, arg: arg, catalog: StudyCatalog.bundled(), teacher: teacher())
    }
    func testSpeakingHubPart1() async {
        await shoot(size: Self.tall) { lang in SpeakingView(model: self.speaking(lang, "p1/0")) }
    }
    func testSpeakingHubPart2() async {
        await shoot(size: Self.tall) { lang in SpeakingView(model: self.speaking(lang, "p2/0")) }
    }
    func testSpeakingPrepare() async {
        await shoot { lang in
            let m = self.speaking(lang, "p2/0"); m.fixturePrep(left: 42)
            return SpeakingView(model: m)
        }
    }
    func testSpeakingRecording() async {
        await shoot { lang in
            let m = self.speaking(lang, "p2/0")
            m.fixtureRecording(seconds: 72, live: "Well, when I think about a teacher who influenced me, I immediately think of Mrs Lan, who taught me literature at high school")
            return SpeakingView(model: m)
        }
    }
    func testSpeakingResult() async {
        await shoot(size: CGSize(width: 390, height: 1200)) { lang in
            let m = self.speaking(lang, "p1/0")
            m.analyse(text: "However, I think living in a big city is a good thing. For example, there are many opportunities for young people. In addition, public transport is convenient. As a result, many residents prefer the urban lifestyle because it offers significant benefits and a sustainable future for everyone.", seconds: 24)
            return SpeakingView(model: m)
        }
    }
    func testSpeakingShadowing() async {
        await shoot(size: CGSize(width: 390, height: 1100)) { lang in
            let m = self.speaking(lang, "p1/0")
            m.sampleOpen = true; m.startShadow(); m.fixtureShadow(at: 1, score: 85)
            return SpeakingView(model: m)
        }
    }
}
