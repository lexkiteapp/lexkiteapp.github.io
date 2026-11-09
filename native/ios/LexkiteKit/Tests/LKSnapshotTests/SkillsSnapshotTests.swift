import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P06 Listening & Reading screens (Stitch listen-hub … reader-result): every state in four variants (1.5×, PR image budget): en-light, vi-light, ar-light (RTL), de-dark.
/// Content = the bundled IELTS parts / readings, fixed learner state, fixed clock, in-memory data, no sound, no network. References live in __Snapshots__; CI records missing ones.
@MainActor
final class SkillsSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static let variants: [(String, ColorScheme)] = [("en", .light), ("vi", .light), ("ar", .light), ("de", .dark)]
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    // MARK: fixtures
    static let content = SkillsContext.content
    static func game(_ extra: [String: JSON] = [:]) -> JSON {
        var g = StudyGame.empty.object ?? [:]
        for (k, v) in extra { g[k] = v }
        return .object(g)
    }
    /// a learner with a best band on test 1, two parts done and a reading finished
    static var learnerGame: JSON {
        game(["listenBest": ["1": 7], "listenDone": ["t1p1": 8, "t1p3": 10], "readDone": ["urban-farming": "4/5"]])
    }
    func ctx(_ lang: String, game: JSON? = nil, data: SkillsData? = nil) -> SkillsContext {
        let game = game ?? SkillsSnapshotTests.learnerGame, data = data ?? SkillsSnapshotTests.content
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: game)), voice: voice, calendar: Self.cal, now: { SkillsSnapshotTests.now })
        return SkillsContext(core: core, lang: lang, data: data, defaults: UserDefaults(suiteName: "lk.skills.snapshot.\(lang)") ?? .standard)
    }
    func part(_ id: String) -> JSON { Self.content.part(id) ?? .null }
    /// answers: every question right (`rightEvery` = 1), every second one wrong (2), none (0)
    func answers(_ p: JSON, _ rightEvery: Int) -> QAnswers {
        var a = QAnswers(), i = 0
        for (gi, g) in p.list("groups").enumerated() {
            if g.s("type") == "multi" { a.multi[gi] = rightEvery == 0 ? [] : g.strs("a"); continue }
            for it in g.list("items") {
                i += 1
                let n = it.i("n"), right = rightEvery == 1 || (rightEvery == 2 && i % 2 == 1)
                guard rightEvery != 0 else { continue }
                switch g.s("type") {
                case "mcq": a.one[n] = String(right ? it.i("a") : (it.i("a") + 1) % 3)
                case "tfng", "ynng": a.one[n] = right ? it.s("a") : (it.s("a") == "TRUE" || it.s("a") == "YES" ? QE.tf[g.s("type")]![1] : QE.tf[g.s("type")]![0])
                case "match": a.one[n] = right ? it.s("a") : ""
                default: a.one[n] = right ? (it.strs("a").first ?? "") : "zzz"
                }
            }
        }
        return a
    }

    func shoot<V: View>(testName: String = #function, _ make: (String) async -> V) async {
        for (lang, scheme) in Self.variants {
            let v = await make(lang)
            assertSnapshot(of: SnapshotFixtures.host(v, lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: 1.5)),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }

    // MARK: #/listening
    func testListeningHub() async {
        await shoot { lang in
            let m = ListenHubModel(ctx: self.ctx(lang), query: [:]); await m.load()
            return ListenHubView(model: m)
        }
    }
    func testListeningHubEmpty() async {
        await shoot { lang in
            let m = ListenHubModel(ctx: self.ctx(lang, data: SkillsData()), query: [:]); await m.load()
            return ListenHubView(model: m)
        }
    }

    // MARK: #/listen/<part>
    func testListenPractice() async {
        await shoot { lang in
            let c = self.ctx(lang), p = self.part("t1p1")
            let m = ListenPartModel.fixture(ctx: c, part: p, exam: false)
            m.answers = self.answers(p, 2)
            return ListenPartView(model: m)
        }
    }
    func testListenPracticeResult() async {
        await shoot { lang in
            let c = self.ctx(lang), p = self.part("t1p2")
            let m = ListenPartModel.fixture(ctx: c, part: p, exam: false)
            m.fixtureSubmit(self.answers(p, 2))
            return ListenPartView(model: m, showResultOnly: true)
        }
    }
    /// "Làm lại câu sai": the wrong questions come back empty, then after "Kiểm tra" re-marked (the results-by-type card is part of the result above)
    func testListenPracticeRetake() async {
        await shoot { lang in
            let c = self.ctx(lang), p = self.part("t1p2")
            let m = ListenPartModel.fixture(ctx: c, part: p, exam: false)
            m.fixtureSubmit(self.answers(p, 2)); m.startRetake()
            return ListenPartView(model: m, questionsAndResult: true)
        }
    }
    func testListenPracticeRetakeChecked() async {
        await shoot { lang in
            let c = self.ctx(lang), p = self.part("t1p2")
            let m = ListenPartModel.fixture(ctx: c, part: p, exam: false)
            m.fixtureSubmit(self.answers(p, 2)); m.startRetake(); m.answers = self.answers(p, 1); m.recheck()
            return ListenPartView(model: m, questionsAndResult: true)
        }
    }
    func testListenExam() async {
        await shoot { lang in
            let c = self.ctx(lang), p = self.part("t1p4")
            return ListenPartView(model: ListenPartModel.fixture(ctx: c, part: p, exam: true))
        }
    }
    func testListenWordPopup() async {
        await shoot { lang in
            let f = WordPopup.Found(entry: .null, word: "membership", pos: "noun", level: "B1", ipa: "/ˈmem.bə.ʃɪp/", mean: "tư cách hội viên", def: "the state of belonging to a group", saved: false,
                                    sentence: "Oh, hello. I'd like to sign up for a membership, if that's possible over the phone.", ctxWord: "membership", detailsHref: "#/dict/membership")
            let c = self.ctx(lang), p = self.part("t1p1")
            let m = ListenPartModel.fixture(ctx: c, part: p, exam: false); m.answers = self.answers(p, 2)
            return SheetOver(screen: ListenPartView(model: m), sheet: WordPopupView(model: .fixture(.found(f), word: "membership", sentence: f.sentence), onClose: {}))
        }
    }

    // MARK: #/listen-test/<n>
    func testListenTestIntro() async {
        await shoot { lang in ListenTestView(model: ListenTestModel(ctx: self.ctx(lang), test: 1, io: SilentListenIO())) }
    }
    func testListenTestReading() async {
        await shoot { lang in
            let m = ListenTestModel(ctx: self.ctx(lang), test: 1, io: SilentListenIO()); m.fixturePart(0, phase: .reading)
            return ListenTestView(model: m)
        }
    }
    func testListenTestPlaying() async {
        await shoot { lang in
            let m = ListenTestModel(ctx: self.ctx(lang), test: 1, io: SilentListenIO()); m.fixturePart(1, phase: .playing)
            return ListenTestView(model: m)
        }
    }
    func testListenTestBlocked() async {
        await shoot { lang in
            let m = ListenTestModel(ctx: self.ctx(lang), test: 1, io: SilentListenIO()); m.fixturePart(0, phase: .blocked)
            return ListenTestView(model: m)
        }
    }
    func testListenTestResult() async {
        await shoot { lang in
            let c = self.ctx(lang), m = ListenTestModel(ctx: c, test: 1, io: SilentListenIO())
            m.fixtureResult((1...4).map { self.answers(self.part("t1p\($0)"), 2) })
            return ListenTestView(model: m)
        }
    }

    // MARK: #/dictation/<part>
    func testDictationFill() async {
        await shoot { lang in
            let c = self.ctx(lang), p = self.part("t1p1")
            let m = DictationModel.fixture(ctx: c, part: p, mode: "mid")
            let w = m.session.words
            let typed = m.session.cells.enumerated().compactMap { _, cell -> String? in if case .hole(let i, _, _, _) = cell { return Dictation.answer(w[i]) }; return nil }
            m.holes = typed.enumerated().map { $0.offset % 3 == 2 ? "x" : $0.element }
            m.fixtureCheck(.holes(m.holes))
            return DictationView(model: m)
        }
    }
    func testDictationDiff() async {
        await shoot { lang in
            let c = self.ctx(lang), p = self.part("t1p1"), m = DictationModel.fixture(ctx: c, part: p, mode: "full", k: 2)
            let text = m.session.lines[2].text
            m.full = text.split(separator: " ").enumerated().filter { $0.offset != 3 }.map(\.element).joined(separator: " ") + " really"
            m.fixtureCheck(.full(m.full))
            return DictationView(model: m)
        }
    }
    func testDictationDone() async {
        await shoot { lang in
            let c = self.ctx(lang), m = DictationModel.fixture(ctx: c, part: self.part("t1p1"), mode: "mid")
            m.fixtureFinished(12)
            return DictationView(model: m)
        }
    }

    // MARK: #/reading, #/read/<id>
    func testReadingList() async {
        await shoot { lang in
            let m = ReadingListModel(ctx: self.ctx(lang), query: [:]); await m.load()
            return ReadingListView(model: m)
        }
    }
    func testReadingListEmpty() async {
        await shoot { lang in
            let m = ReadingListModel(ctx: self.ctx(lang, data: SkillsData()), query: [:]); await m.load()
            return ReadingListView(model: m)
        }
    }
    func testReader() async {
        await shoot { lang in ReaderView(model: ReaderModel(ctx: self.ctx(lang), reading: Self.content.reading("urban-farming") ?? .null)) }
    }
    func testReaderWordPopup() async {
        await shoot { lang in
            let f = WordPopup.Found(entry: .null, word: "sustainable", pos: "adj", level: "B2", ipa: "/səˈsteɪ.nə.bəl/", mean: "bền vững", def: "able to continue over a long period of time", saved: true,
                                    sentence: "Supporters argue that this can reduce pollution and help cities become more sustainable.", ctxWord: "sustainable", detailsHref: "#/dict/sustainable")
            let r = Self.content.reading("urban-farming") ?? .null
            return SheetOver(screen: ReaderView(model: ReaderModel(ctx: self.ctx(lang), reading: r)), sheet: WordPopupView(model: .fixture(.found(f), word: "sustainable", sentence: f.sentence, saved: true), onDetails: { _ in }, onClose: {}))
        }
    }
    func testReaderResult() async {
        await shoot { lang in
            let r = Self.content.reading("urban-farming") ?? .null, m = ReaderModel(ctx: self.ctx(lang), reading: r)
            m.fixtureGrade(["FALSE", "TRUE", "TRUE", "1", "3"])
            return ReaderView(model: m, onlyQuestions: true)
        }
    }
}

/// A bottom sheet over the real screen with the design's veil (`bg-on-surface/35`), token colours only
struct SheetOver<Screen: View, Sheet: View>: View {
    let screen: Screen, sheet: Sheet
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        ZStack(alignment: .bottom) {
            screen
            LKColor.onSurface.resolve(scheme).opacity(0.35).ignoresSafeArea()
            sheet.clipShape(UnevenRoundedRectangle(topLeadingRadius: 24, topTrailingRadius: 24, style: .continuous))
        }
    }
}
