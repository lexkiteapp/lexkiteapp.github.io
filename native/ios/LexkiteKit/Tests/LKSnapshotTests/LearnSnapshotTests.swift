import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P09 part 2 – #/fix #/grammar #/method #/quick #/style #/confidence (Stitch write-fix, grammar-hub, grammar-lesson, write-info, quick-play, confidence): the screens in four variants –
/// en-light, vi-light, ar-light (RTL), de-dark. Texts and tables come from the REAL web code (vectors/learn.json, learn-content.json, web/data/grammar-pack.json); fixed learner state, in-memory data,
/// no network, no clock. References live in __Snapshots__; CI records missing ones.
@MainActor
final class LearnSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    static let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../..").standardized
    static let grammar: GrammarPack = GrammarPack(text: (try? String(contentsOf: root.appendingPathComponent("web/data/grammar-pack.json"), encoding: .utf8)) ?? "") ?? GrammarPack()
    static let doneGame: JSON = ["xp": 340, "days": [:], "total": [:], "grammarDone": ["be-am-is-are": 100, "present-simple": 90, "present-continuous": 60], "readDone": [:], "listenDone": [:]]

    func ctx(_ lang: String, game: JSON = LearnSnapshotTests.doneGame, cards: [JSON] = []) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: cards, stats: .object([:]), settings: ["accent": "us"], game: game)), voice: voice, calendar: Self.cal, now: { Self.now })
        let suite = "lk.learn.snapshot.\(lang)"
        UserDefaults(suiteName: suite)?.removePersistentDomain(forName: suite)
        return SkillsContext(core: core, lang: lang, data: SkillsData(), defaults: UserDefaults(suiteName: suite) ?? .standard)
    }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    func shoot<V: View>(testName: String = #function, _ make: (String) -> V) {
        for (lang, scheme) in SnapshotFixtures.callVariants(testName) {
            assertSnapshot(of: SnapshotFixtures.host(make(lang), lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: SnapshotFixtures.callScale(testName, lang))),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }

    // MARK: states
    func testLearnFixtureData() {
        XCTAssertGreaterThan(Self.grammar.lessons.count, 70, "web/data/grammar-pack.json is read")
        XCTAssertNotNil(LearnContent.shared.fix, "learn-content.json is bundled")
        XCTAssertEqual(LearnContent.shared.units.count > 20, true, "confidence units are bundled")
    }
    func testFixResult() {
        shoot { lang in FixView(model: FixModel.fixture(text: LearnContent.shared.fix?.sample ?? "", selected: 1)) }
    }
    func testGrammarHub() {
        shoot { lang in GrammarHubView(model: GrammarHubModel.fixture(ctx: self.ctx(lang), pack: Self.grammar)) }
    }
    func testGrammarLesson() {
        shoot { lang in GrammarLessonView(model: GrammarLessonModel.fixture(ctx: self.ctx(lang), pack: Self.grammar, id: "present-simple", full: false, step: 0)) }
    }
    func testGrammarQuiz() {
        shoot { lang in
            let m = GrammarLessonModel.fixture(ctx: self.ctx(lang), pack: Self.grammar, id: "present-simple", full: false)
            let q = m.steps.firstIndex(of: .quiz) ?? 0
            return GrammarLessonView(model: GrammarLessonModel.fixture(ctx: self.ctx(lang), pack: Self.grammar, id: "present-simple", full: false, step: q))
        }
    }
    func testGrammarMix() {
        shoot { lang in GrammarMixView(model: GrammarMixModel.fixture(ctx: self.ctx(lang), pack: Self.grammar, chapter: 1, count: 5, at: 1)) }
    }
    func testMethod() {
        shoot { lang in
            let clock = VocabClock(calendar: Self.cal)
            func key(_ d: Int64) -> String { clock.todayKey(Self.now - d * 86_400_000) }
            let srs: (Int64, Double) -> JSON = { d, s in ["last": .number(Double(Self.now - d * 86_400_000)), "S": .number(s), "reps": 3, "interval": .number(s), "due": .number(Double(Self.now - 1))] }
            let cards: [JSON] = ["alpha", "beta", "gamma", "delta"].enumerated().map { ["word": .string($0.element), "srs": srs(Int64($0.offset + 1), Double($0.offset + 2))] }
            let game: JSON = ["xp": 340, "days": [key(0): ["readings": 1, "newWords": 6, "grammar": 1], key(1): ["listens": 2, "spoken": 3]], "total": [:], "readDone": ["r1": 1], "listenDone": [:], "grammarDone": ["g1": 90], "pronDone": [:]]
            let inp = StudyMethod.Input(now: Self.now, clock: clock, cards: cards, reviewDays: [key(0): 12], game: game, settings: ["placement": ["stage": "s2", "band": "6.0"]], essayPrompts: ["p1"], mistakes: 3,
                                   readings: ["r1", "r2"], listening: ["l1", "l2"], grammar: ["g1", "g2"], prompts: ["p1", "p2"])
            return MethodView(model: MethodModel.fixture(ctx: self.ctx(lang), input: inp))
        }
    }
    func testQuickPlay() {
        shoot { lang in QuickView(model: QuickModel.fixture(ctx: self.ctx(lang), questions: [
            .init(word: "abandon", ipa: "/əˈbændən/", pos: "v", options: ["bỏ rơi", "tiếp tục", "thu thập"], correct: 0), .init(word: "gather", ipa: "", pos: "v", options: ["a", "b", "c"], correct: 1)], index: 0, picked: 1, score: 0)) }
    }
    func testQuickResult() {
        shoot { lang in QuickView(model: QuickModel.fixture(ctx: self.ctx(lang), questions: [.init(word: "abandon", ipa: "", pos: "v", options: ["a", "b", "c"], correct: 0)], stage: .done(Quick.result(right: 3, total: 4, timedOut: false, elapsed: 11)))) }
    }
    func testStyleQuestion() {
        shoot { lang in StyleView(model: StyleModel.fixture(ctx: self.ctx(lang), index: 2, picks: ["natural", "precision"])) }
    }
    func testStyleResult() {
        shoot { lang in StyleView(model: StyleModel.fixture(ctx: self.ctx(lang), index: 6, picks: ["natural", "natural", "precision", "natural", "curious", "natural"], winner: "natural")) }
    }
    func testConfidenceOverview() {
        shoot { lang in
            let daily: [JSON] = [["d": "2026-01-03", "at": "1", "score": 52], ["d": "2026-01-04", "at": "2", "score": 61], ["d": "2026-01-05", "at": "3", "score": 70]]
            return ConfidenceView(model: ConfidenceModel.fixture(ctx: self.ctx(lang), page: .overview, progress: ["done": ["greetings": ["at": 1, "sh": 80]], "daily": .array(daily)]))
        }
    }
    func testConfidenceDaily() {
        shoot { lang in ConfidenceView(model: ConfidenceModel.fixture(ctx: self.ctx(lang), page: .daily, metrics: .init(secs: 118, wpm: 112, pauses: 3, fillers: 4, used: ["nice to meet you"], ppm: 1.5), rating: 4)) }
    }
}
