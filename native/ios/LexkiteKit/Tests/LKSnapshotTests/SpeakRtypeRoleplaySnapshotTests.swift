import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P07 #/rtype and #/roleplay screens (Stitch rtype-hub … roleplay-result): every state in four variants (1.5×): en-light, vi-light, ar-light (RTL), de-dark.
/// 11 states × 4 = 44 images. Content = the real records of vectors/speak.json `data.readtests` (cut down further so the state under test is in the frame:
/// one passage paragraph, two questions, shortened explanations) and the bundled roleplay starter (script "cafe"); fixed learner state, fixed clock, in-memory data,
/// no sound, no network, a scripted recogniser. References live in __Snapshots__; CI records missing ones.
@MainActor
final class SpeakRtypeRoleplaySnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static let variants: [(String, ColorScheme)] = [("en", .light), ("vi", .light), ("ar", .light), ("de", .dark)]
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    // MARK: fixtures
    /// the reading tests of the vector file (the P09 pack has no fixed copy in the app yet)
    static let vector: JSON = {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../shared/gen/vectors/speak.json").standardized
        return (try? JSON.parse(try Data(contentsOf: url))) ?? .null
    }()
    static var tests: RtypeContent { RtypeContent(json: vector["data"]?["readtests"] ?? .null) }
    /// the first group of `kind` with a one-paragraph passage, `items` questions and short explanations
    static func trimmed(kind: String, items: Int) -> RtypeContent {
        guard let u = tests.units.first(where: { $0.kind == kind }) else { return RtypeContent() }
        var g = u.group
        g["items"] = .array(Array(u.group.list("items").prefix(items)))
        var p = u.passage
        p["groups"] = .array([g])
        p["paras"] = .array(Array(u.passage.list("paras").prefix(1)).map { para in
            var x = para; x["t"] = .string(String(para.s("t").prefix(150)) + "…"); return x
        })
        var t = u.test
        t["passages"] = .array([p])
        var ex: [String: JSON] = [:]
        for it in g.list("items") { let n = String(it.i("n")); ex[n] = .obj([("why", .string(String((tests.explain[u.test.s("id")]?[n]?.s("why") ?? "").prefix(90)) + "…"))]) }
        return RtypeContent(tests: [t], explain: .obj([(u.test.s("id"), .object(ex))]))
    }
    static var rtypeGame: JSON { var g = StudyGame.empty.object ?? [:]; g["rtype"] = ["completion": ["r": 9, "t": 12], "tfng": ["r": 5, "t": 10], "mcq": ["r": 3, "t": 3]]; return .object(g) }

    func ctx(_ lang: String, game: JSON? = nil) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: game ?? Self.rtypeGame)), voice: voice, calendar: Self.cal, now: { Self.now })
        let suite = "lk.speak.rtyperp.snapshot.\(lang)"
        UserDefaults(suiteName: suite)?.removePersistentDomain(forName: suite)
        return SkillsContext(core: core, lang: lang, data: SkillsData(), defaults: UserDefaults(suiteName: suite) ?? .standard)
    }
    var cafe: JSON { SpeakContentStore.pack.roleplay.list("scripts").first { $0.s("id") == "cafe" } ?? .null }
    var rules: RoleplayRules { RoleplayRules(pack: SpeakContentStore.pack.roleplay) }

    func shoot<V: View>(testName: String = #function, _ make: (String) async -> V) async {
        for (lang, scheme) in SnapshotFixtures.speakVariants(testName) {
            let v = await make(lang)
            assertSnapshot(of: SnapshotFixtures.host(v, lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: SnapshotFixtures.speakScale(testName, lang))),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }
    func rtype(_ lang: String, _ c: RtypeContent, kind: String?, answers: QAnswers = QAnswers(), checked: Bool = false, index: Int = 0) async -> RtypeView {
        let m = RtypeModel.fixture(ctx: ctx(lang), content: c, kind: kind, index: index, answers: answers, checked: checked)
        await m.load()
        return RtypeView(model: m)
    }

    // MARK: #/rtype
    func testRtypeHub() async {
        XCTAssertFalse(Self.tests.tests.isEmpty, "the vector data must carry the reading tests")
        await shoot { lang in await self.rtype(lang, Self.tests, kind: nil) }
    }
    func testRtypeRun() async {
        let c = Self.trimmed(kind: "tfng", items: 2)
        var a = QAnswers(); if let n = c.units.first?.group.list("items").first?.i("n") { a.one[n] = "FALSE" }
        await shoot { lang in await self.rtype(lang, c, kind: "tfng", answers: a) }
    }
    func testRtypeResult() async {
        let c = Self.trimmed(kind: "tfng", items: 2)
        var a = QAnswers()
        for (i, it) in (c.units.first?.group.list("items") ?? []).enumerated() { a.one[it.i("n")] = i == 0 ? it.s("a") : (it.s("a") == "TRUE" ? "FALSE" : "TRUE") }
        await shoot { lang in await self.rtype(lang, c, kind: "tfng", answers: a, checked: true) }
    }
    func testRtypeFinished() async {
        let c = Self.trimmed(kind: "mcq", items: 1)
        await shoot { lang in await self.rtype(lang, c, kind: "mcq", index: 1) }
    }
    func testRtypeEmpty() async {
        await shoot { lang in await self.rtype(lang, RtypeContent(), kind: nil) }
    }

    // MARK: #/roleplay
    func testRoleplayList() async {
        await shoot { lang in
            let m = RoleplayListModel(ctx: self.ctx(lang), signedIn: false, scripts: SpeakContentStore.pack.roleplay.list("scripts"), rules: self.rules)
            return RoleplayListView(model: m)
        }
    }
    func testRoleplayBrief() async {
        await shoot { lang in
            let m = RoleplayBriefModel(ctx: self.ctx(lang), script: self.cafe, rules: self.rules)
            m.fixtureSaved(0)
            return RoleplayBriefView(model: m)
        }
    }
    func testRoleplayChatTyping() async {
        await shoot { lang in
            let m = await RoleplayChatModel.fixture(ctx: self.ctx(lang), script: self.cafe, rules: self.rules,
                                                    say: ["Could I get a medium latte with oat milk, please?", "A medium, please – not too hot, if possible."], typing: true)
            return RoleplayChatView(model: m)
        }
    }
    func testRoleplayChatHint() async {
        await shoot { lang in
            let m = await RoleplayChatModel.fixture(ctx: self.ctx(lang), script: self.cafe, rules: self.rules, say: ["Could I get a medium latte with oat milk, please?"], hint: true)
            return RoleplayChatView(model: m)
        }
    }
    func testRoleplayResult() async {
        await shoot { lang in
            let m = await RoleplayChatModel.fixture(ctx: self.ctx(lang), script: self.cafe, rules: self.rules,
                                                    say: ["Could I get a medium latte with oat milk, please?", "Medium, please.", "I'll have it here, thanks."], end: true)
            return RoleplayChatView(model: m)
        }
    }
    func testRoleplayResultEmpty() async {
        await shoot { lang in
            let m = await RoleplayChatModel.fixture(ctx: self.ctx(lang), script: self.cafe, rules: self.rules, say: [], end: true)
            return RoleplayChatView(model: m)
        }
    }
}
