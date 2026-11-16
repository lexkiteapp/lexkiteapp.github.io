import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P09 #/write · #/task1 · #/qstats · #/criteria (Stitch write-room, write-report, task1-room, task1-report, qstats, criteria): six states in four variants – en-light, vi-light,
/// ar-light (RTL), de-dark – = 24 images (en and de at 1.5×, vi and ar at 1×). The texts come from the vectors of the REAL web code (vectors/write.json: the band-6.5 model essay
/// and the Task 1 answer the vectors score), the tables from web/data/write-pack.json; fixed learner state, in-memory data, no network, no clock. References live in __Snapshots__;
/// CI records missing ones.
@MainActor
final class WriteSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    static let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../..").standardized
    static let vector: JSON = (try? JSON.parse(try Data(contentsOf: root.appendingPathComponent("native/shared/gen/vectors/write.json")))) ?? .null
    static let pack: WritePack = WritePack(text: (try? String(contentsOf: root.appendingPathComponent("web/data/write-pack.json"), encoding: .utf8)) ?? "") ?? WritePack()
    static func analyzeText(_ id: String) -> String { (Self.vector["write"]?.list("analyze") ?? []).first { $0.s("id") == id }?["input"]?.s("text") ?? "" }
    static func task1Text(_ id: String) -> String { (Self.vector["task1"]?.list("score") ?? []).first { $0.s("id") == id }?["input"]?.s("text") ?? "" }
    static let prompts: [JSON] = [
        ["id": "p1", "type": "Agree/Disagree", "topic": "education", "text": "Some people believe that university education should be free for all students. To what extent do you agree or disagree?"],
        ["id": "p2", "type": "Discussion", "topic": "technology", "text": "Some people think that technology has made our lives more complicated, while others believe it has made life easier. Discuss both views and give your own opinion."],
    ]
    static let sets: [JSON] = [
        ["id": "energy", "type": "line", "title": "The line graph shows the percentage of households in one European country that used three main types of energy for heating between 1990 and 2020.",
         "x": ["1990", "1995", "2000", "2005", "2010", "2015", "2020"], "unit": "%",
         "series": [["Gas", [62, 64, 61, 55, 48, 41, 35]], ["Electricity", [25, 24, 27, 30, 33, 34, 33]], ["Renewables", [3, 4, 6, 10, 15, 22, 31]]],
         "overview": "Overall, gas remained the most common heating source for most of the period, but its share fell steadily, while renewable energy rose dramatically."],
        ["id": "leisure", "type": "bar", "title": "The bar chart compares the average number of hours per week that four age groups spent on three leisure activities in 2022.", "x": ["16–24", "25–44"], "unit": "hours",
         "series": [["Social media", [14, 9]], ["Reading", [2, 3]]], "overview": "Overall, younger people spent more time on social media."],
    ]

    func ctx(_ lang: String) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty)), voice: voice, calendar: Self.cal, now: { Self.now })
        let suite = "lk.write.snapshot.\(lang)"
        UserDefaults(suiteName: suite)?.removePersistentDomain(forName: suite)
        return SkillsContext(core: core, lang: lang, data: SkillsData(), defaults: UserDefaults(suiteName: suite) ?? .standard)
    }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }
    func essay(_ lang: String, _ kind: EssayModel.Kind, id: String, text: String = "", analysed: Bool = false) -> EssayModel {
        EssayModel.fixture(ctx: ctx(lang), kind: kind, pack: Self.pack, prompts: Self.prompts, sets: Self.sets, current: id, text: text, analysed: analysed,
                           saved: [["prompt": "p3", "text": "x", "words": 202, "band": 6], ["prompt": "p2", "text": "y", "words": 251, "band": 7.5]], left: kind == .task2 ? 2400 : 1200)
    }

    func shoot<V: View>(testName: String = #function, _ make: (String) -> V) {
        for (lang, scheme) in SnapshotFixtures.callVariants(testName) {
            assertSnapshot(of: SnapshotFixtures.host(make(lang), lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: SnapshotFixtures.callScale(testName, lang))),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }

    // MARK: states
    func testWriteFixtureData() {
        XCTAssertFalse(Self.pack.outline.isEmpty, "web/data/write-pack.json is read")
        XCTAssertGreaterThan(Self.analyzeText("band-6.5-essay").count, 500, "the essay comes from the vector")
        XCTAssertGreaterThan(Self.task1Text("good-line").count, 500, "the Task 1 answer comes from the vector")
    }
    func testWriteRoom() {
        shoot { lang in EssayView(model: self.essay(lang, .task2, id: "p1", text: "Some people believe that university education should be free")) }
    }
    func testWriteReport() {
        shoot { lang in EssayView(model: self.essay(lang, .task2, id: "p1", text: Self.analyzeText("band-6.5-essay"), analysed: true), only: .report) }
    }
    func testTask1Room() {
        shoot { lang in EssayView(model: self.essay(lang, .task1, id: "energy", text: "The line graph shows how the percentage of households")) }
    }
    func testTask1Report() {
        shoot { lang in EssayView(model: self.essay(lang, .task1, id: "energy", text: Self.task1Text("good-line"), analysed: true), only: .report) }
    }
    func testQStats() {
        shoot { lang in
            let game: JSON = ["qstat": (Self.vector["qstats"]?.list("cases") ?? []).first { $0.s("id") == "listening-reading" }?["input"]?["qstat"] ?? .null]
            return QStatsView(model: QStatsModel.fixture(ctx: self.ctx(lang), pack: Self.pack, game: game))
        }
    }
    func testCriteria() {
        shoot { lang in CriteriaView(model: CriteriaModel.fixture(ctx: self.ctx(lang), pack: Self.pack, skill: "writing")) }
    }
}
