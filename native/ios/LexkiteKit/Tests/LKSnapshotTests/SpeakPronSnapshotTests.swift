import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P07 #/pron screens (Stitch pron-hub, pron-sound, pron-pairs, pron-result, pron-rhythm): every state in four variants (1.5×): en-light, vi-light, ar-light (RTL), de-dark.
/// Content = the bundled starter pack (6 vowels, th-sounds, weak-forms, every pair / coach table), fixed learner state, fixed clock, in-memory data, no sound, no microphone,
/// no network. Each state sits on its own small page so the frame shows it (a card is never below the fold). References live in __Snapshots__; CI records missing ones.
@MainActor
final class SpeakPronSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }
    static let variants: [(String, ColorScheme)] = [("en", .light), ("vi", .light), ("ar", .light), ("de", .dark)]
    static let content = PronContent()
    static func game() -> JSON { var g = StudyGame.empty.object ?? [:]; g["pronDone"] = ["iː": 90, "ɪ": 72, "th-sounds": 60, "weak-forms": 100]; return .object(g) }

    func ctx(_ lang: String, game: JSON? = nil) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: SkillsSnapshotTests.Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "uk"], game: game ?? Self.game())), voice: voice,
                             calendar: SkillsSnapshotTests.cal, now: { SkillsSnapshotTests.now })
        let d = UserDefaults(suiteName: "lk.pron.snapshot.\(lang)") ?? .standard
        d.removePersistentDomain(forName: "lk.pron.snapshot.\(lang)")
        return SkillsContext(core: core, lang: lang, defaults: d)
    }
    func lesson(_ id: String) -> JSON { Self.content.lesson(id) ?? .null }
    func shoot<V: View>(testName: String = #function, _ make: (String) async -> V) async {
        for (lang, scheme) in SnapshotFixtures.speakVariants(testName) {
            let v = await make(lang)
            assertSnapshot(of: SnapshotFixtures.host(v, lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: SnapshotFixtures.speakScale(testName, lang))),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }
    /// a card on its own page, titled like the lesson
    func page<C: View>(_ title: String, @ViewBuilder _ c: () -> C) -> some View { StudyPage(title: title) { c() } }
    var th: [PronContrast] { Self.content.pairs.forSkill("th-sounds") }

    // MARK: pron-hub
    func testPronHub() async {
        await shoot { lang in let m = PronHubModel(ctx: self.ctx(lang)); await m.load(); return PronHubView(model: m) }
    }
    func testPronHubEmpty() async {
        await shoot { lang in let m = PronHubModel(ctx: self.ctx(lang), content: PronContent(pack: SpeakPack())); await m.load(); return PronHubView(model: m) }
    }

    // MARK: pron-sound (vowel with the mouth figure; Vietnamese-errors lesson with rules)
    func testPronSoundVowel() async {
        await shoot { lang in let m = PronLessonModel.fixture(ctx: self.ctx(lang), lesson: self.lesson("iː")); return PronLessonView(model: m) }
    }
    func testPronSoundRules() async {
        await shoot { lang in let m = PronLessonModel.fixture(ctx: self.ctx(lang), lesson: self.lesson("th-sounds")); return PronLessonView(model: m) }
    }
    func testPronWordPractice() async {
        await shoot { lang in
            let m = PronLessonModel.fixture(ctx: self.ctx(lang), lesson: self.lesson("iː"), scores: [0: 92, 1: 70, 2: 48], hint: .heard("leave"))
            return self.page(m.lesson.s("ipa")) { PronWordsCard(model: m) }
        }
    }
    func testPronWordPracticeMicError() async {
        await shoot { lang in
            let m = PronLessonModel.fixture(ctx: self.ctx(lang), lesson: self.lesson("iː"), scores: [0: 92], hint: .error("not-allowed"), listening: "w1")
            return self.page(m.lesson.s("ipa")) { PronWordsCard(model: m) }
        }
    }
    func testPronQuizAnswered() async {
        await shoot { lang in
            let m = PronLessonModel.fixture(ctx: self.ctx(lang), lesson: self.lesson("th-sounds"), picks: [1, 0])
            return self.page(m.lesson.s("ipa")) { PronQuizCard(model: m) }
        }
    }

    // MARK: pron-pairs (listen & choose) and its result
    func testPronPairsIntro() async {
        await shoot { lang in
            let l = self.lesson("iː"), m = PronPairGameModel(ctx: self.ctx(lang), pairs: l.list("pairs").map { ($0.array ?? []).compactMap(\.string) }, io: .scripted())
            return self.page(l.s("ipa")) { PronPairsCard(model: m, lesson: l) }
        }
    }
    func testPronPairsRound() async {
        await shoot { lang in
            let l = self.lesson("iː"), pairs = l.list("pairs").map { ($0.array ?? []).compactMap(\.string) }
            let m = PronPairGameModel.fixture(ctx: self.ctx(lang), pairs: pairs, index: 2, ok: 1, picked: 1)   // a wrong pick: the right word is shown too
            return PronPairsFocus(model: m, lesson: l)
        }
    }
    func testPronPairsResultGood() async {
        await shoot { lang in
            let l = self.lesson("iː"), pairs = l.list("pairs").map { ($0.array ?? []).compactMap(\.string) }
            return PronPairsFocus(model: PronPairGameModel.fixture(ctx: self.ctx(lang), pairs: pairs, index: 8, ok: 7, finished: true), lesson: l)
        }
    }
    func testPronPairsResultRetry() async {
        await shoot { lang in
            let l = self.lesson("iː"), pairs = l.list("pairs").map { ($0.array ?? []).compactMap(\.string) }
            return PronPairsFocus(model: PronPairGameModel.fixture(ctx: self.ctx(lang), pairs: pairs, index: 8, ok: 4, finished: true), lesson: l)
        }
    }

    // MARK: "Nói thử" (say the word of the pair) – intro, right, wrong word + tip, retry, blocked microphone, result
    func say(_ lang: String, _ phase: PronSayModel.Phase, _ outcomes: [PronSaySession.Outcome] = [], stats: PronStats = [:]) -> PronSayModel {
        PronSayModel.fixture(ctx: ctx(lang), pairs: Self.content.pairs, contrasts: th, phase: phase, outcomes: outcomes, stats: stats)
    }
    func testPronSayIntro() async {
        let stats: PronStats = ["th-s": PronStat(ok: 1, n: 5), "dh-d": PronStat(ok: 5, n: 5)]
        await shoot { lang in self.page(self.lesson("th-sounds").s("ipa")) { PronSayCard(model: self.say(lang, .intro, stats: stats)) } }
    }
    func testPronSayRight() async {
        await shoot { lang in PronSayFocus(model: self.say(lang, .running, [.good])) }
    }
    func testPronSayOtherWord() async {
        await shoot { lang in PronSayFocus(model: self.say(lang, .running, [.other])) }
    }
    func testPronSayRetry() async {
        await shoot { lang in PronSayFocus(model: self.say(lang, .running, [.neither])) }
    }
    func testPronSayBlocked() async {
        await shoot { lang in self.page(self.lesson("th-sounds").s("ipa")) { PronSayCard(model: self.say(lang, .blocked("not-allowed"))) } }
    }
    func testPronSayResult() async {
        let o: [PronSaySession.Outcome] = [.good, .good, .other, .good, .good, .good, .other, .good, .good, .good]
        await shoot { lang in PronSayFocus(model: self.say(lang, .done, o)) }
    }

    // MARK: pron-rhythm (sentence rhythm & shadowing)
    func rhythm(_ lang: String, _ phase: PronRhythmModel.Phase, k: Int = 0, best: [Int: Int] = [:]) -> PronRhythmModel {
        PronRhythmModel.fixture(ctx: ctx(lang), content: Self.content, skill: "weak-forms", k: k, best: best, phase: phase)
    }
    func result(_ score: Int, heard: String, content: [String] = [], weak: [String] = [], best: [Int: Int]) -> PronRhythmModel.Phase {
        .result(.init(score: score, band: PronCoach.band(score), heard: heard, missingContent: content, missingWeak: weak,
                      suggestions: Self.content.coach.next(pairs: Self.content.pairs, stats: [:], rhythm: best, skill: "weak-forms")))
    }
    func testPronRhythmReady() async {
        await shoot { lang in self.page(self.lesson("weak-forms").s("ipa")) { PronRhythmCard(model: self.rhythm(lang, .idle, k: 1, best: [0: 90])) } }
    }
    func testPronRhythmGreat() async {
        await shoot { lang in self.page(self.lesson("weak-forms").s("ipa")) { PronRhythmCard(model: self.rhythm(lang, self.result(94, heard: "I want go the shop", weak: ["to", "to"], best: [0: 94]), best: [0: 94])) } }
    }
    func testPronRhythmClose() async {
        await shoot { lang in self.page(self.lesson("weak-forms").s("ipa")) { PronRhythmCard(model: self.rhythm(lang, self.result(60, heard: "I want to the shop", content: ["go"], best: [:]))) } }
    }
}
