import XCTest
import SwiftUI
import SnapshotTesting
@testable import LKFeatures
import LKCore
import LKStore
import LKSync

/// P03 lesson player: question (gap · build · match · type), feedback (right · wrong), completion and a story line,
/// light/dark × en/vi/ar(RTL)/de at 390 pt = 8 states × 8 = 64 images. Fixed cards + seed, frozen teacher, no sound, no network.
/// References live in __Snapshots__; CI records missing ones (SNAPSHOT_RECORD=missing, all with =1) and verifies after.
@MainActor
final class LessonSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Double = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    static func card(_ ref: String, _ word: String, _ pos: String, vi: String, def: String, ex: String, ipa: String) -> LessonCard {
        let due = now - 86_400_000
        return LessonCard(ref: ref, word: word, pos: pos, ipa: ipa, ipaUS: ipa, vi: vi, def: def, ex: ex,
                          sentences: [LessonSentence(en: ex, vi: "")], srs: LessonSRS(reps: 2, lapses: 0, due: due, last: due - 3 * 86_400_000))
    }
    static let cards = [
        card("a", "consider", "verb", vi: "cân nhắc", def: "to think carefully about something", ex: "We are considering moving to a new city.", ipa: "/kənˈsɪdər/"),
        card("b", "afraid", "adjective", vi: "sợ", def: "feeling fear", ex: "She is afraid of the dark.", ipa: "/əˈfreɪd/"),
        card("c", "salary", "noun", vi: "tiền lương", def: "money you get every month", ex: "Her salary is paid every month.", ipa: "/ˈsæləri/"),
        card("d", "decide", "verb", vi: "quyết định", def: "to choose after thinking", ex: "We decided to stay at home tonight.", ipa: "/dɪˈsaɪd/"),
    ]
    struct NoText: LessonTextSource { func text(_ path: String) async -> String? { nil } }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    /// A running lesson restricted to one exercise kind (so the screen is the one named by the test).
    func model(_ only: [String], lang: String, pose: String? = nil, matchFirst: Bool = false) -> LessonModel {
        let m = LessonModel(uiLang: lang, voice: LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil)),
                            defaults: UserDefaults(suiteName: "lk.snap.lesson")!, remote: NoText(), reduceMotion: true,
                            teacher: TeacherController.frozen(who: "ama", pose: pose), clock: { Date(timeIntervalSince1970: Self.now / 1000) })
        m.calendar = Self.cal; m.autoPlay = false
        let picks = LessonEngine.pickWords(Self.cards, .init(n: 4, now: Self.now), calendar: Self.cal)
        var o = LessonEngine.BuildOptions(seed: 11, pool: Self.cards, only: only, calm: true, match: only.contains("match"))
        o.mean = { c in lang == "vi" ? c.vi : "" }
        var items = LessonEngine.build(picks, o)
        if matchFirst, let i = items.firstIndex(where: { $0.type == "match" }) { items.swapAt(0, i) }
        m.begin(items, kind: "lesson")
        return m
    }

    func shoot(_ make: (String) -> LessonModel, testName: String = #function) {
        for lang in SnapshotFixtures.langs {
            for scheme in SnapshotFixtures.schemes {
                let m = make(lang)
                assertSnapshot(of: SnapshotFixtures.host(LessonView(model: m), lang: lang, scheme: scheme), as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98),
                               named: SnapshotFixtures.name(lang, scheme), testName: testName)
            }
        }
    }

    func testQuestionGap() {
        shoot { lang in let m = self.model(["gap"], lang: lang); m.pick = m.cur?.options?.first { $0 != m.cur?.answer }; return m }
    }
    func testQuestionBuild() {
        shoot { lang in let m = self.model(["build"], lang: lang); m.tiles = [0, 2]; return m }
    }
    func testQuestionMatch() { shoot { lang in self.model(["gap", "match"], lang: lang, matchFirst: true) } }
    func testQuestionType() {
        shoot { lang in let m = self.model(["type"], lang: lang); m.typed = String((m.cur?.answer ?? "").prefix(3)); return m }
    }
    func testFeedbackCorrect() {
        shoot { lang in
            let m = self.model(["gap"], lang: lang, pose: "cheer"); m.pick = m.cur?.answer; m.submit(); return m
        }
    }
    func testFeedbackWrong() {
        shoot { lang in
            let m = self.model(["gap"], lang: lang, pose: "concern"); m.pick = m.cur?.options?.first { $0 != m.cur?.answer }; m.submit(); return m
        }
    }
    func testComplete() {
        shoot { lang in
            let m = self.model(["gap"], lang: lang, pose: "cheer")
            var n = 0
            while m.phase != .done, n < 100 { n += 1; if m.phase == .feedback { m.next() } else { m.pick = m.cur?.answer; m.submit() } }
            return m
        }
    }
    func testStoryLine() {
        shoot { lang in
            let story = LessonStory.parseScript("""
            self.LESSON_STORIES = [{"id":"t","kind":"story","lines":[{"who":"carlos","en":"Hi! What can I get for you?"},{"who":"ama","en":"Hi! A large coffee, please."}]}];
            """)!.first!
            let m = LessonModel(uiLang: lang, voice: LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil)),
                                defaults: UserDefaults(suiteName: "lk.snap.story")!, remote: NoText(), reduceMotion: true,
                                teacher: TeacherController.frozen(who: "ama"), clock: { Date(timeIntervalSince1970: Self.now / 1000) })
            m.autoPlay = false
            m.teacher2 = TeacherController.frozen(who: "carlos")
            m.begin(LessonEngine.storyItems(story, lang: lang, seed: 2), kind: "story")
            m.continueLine()
            return m
        }
    }
}
