import Foundation
import XCTest
@testable import LKFeatures
import LKStore
import LKSync
import LKStrings
import LKCore

/// P09 end to end (writing & grammar): the ten routes are wired, the rule engine fixes a draft, a grammar lesson answered right is stored (grammarDone, XP, mistakes), the style quiz saves the
/// result, the confidence daily rating is stored and rewarded. Numbers and texts of the pure parts are gated by LKSyncTests/LearnVectorTests + WriteVectorTests (vectors from the web code).
@MainActor
final class ParityP09Tests: XCTestCase {
    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    func ctx(_ n: String) -> (SkillsContext, MemoryVocabData, UserDefaults) {
        let d = UserDefaults(suiteName: "lk.test.p09.\(n)")!
        d.removePersistentDomain(forName: "lk.test.p09.\(n)")
        let data = MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: ["accent": "us"], game: StudyGame.empty))
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: FakeTransport(failing: { _ in true }), cacheDirectory: nil))
        let core = StudyCore(data: data, voice: voice, calendar: Self.cal, now: { Self.now })
        return (SkillsContext(core: core, lang: "en", defaults: d), data, d)
    }

    func testParityP09() async throws {
        // 1. every P09 route is wired (pushed, #/quick full screen) and known to the router
        let all = ["write", "task1", "qstats", "criteria", "fix", "grammar", "method", "style", "confidence", "quick"]
        XCTAssertEqual(WriteRoutes.innerRoutes.union(WriteRoutes.focusRoutes), Set(all))
        for r in all { XCTAssertEqual(AppRoute.parseHash("#/\(r)")?.name, r, r); XCTAssertEqual(AppRoute.parseHash("#/\(r)")?.tab, "skills", r) }
        XCTAssertEqual(AppRoute.parseHash("#/quick")?.presentation, .focus)
        XCTAssertEqual(AppRoute.parseHash("#/grammar/mix?ch=3&n=40")?.query["n"], "40")

        // 2. #/fix: the draft is checked offline and "Sửa nhanh" writes the fixed text
        let d = UserDefaults(suiteName: "lk.test.p09.fix")!
        d.removePersistentDomain(forName: "lk.test.p09.fix")
        let fix = FixModel(defaults: d)
        XCTAssertNotNil(fix.engine)
        fix.text = "i am agree with you."
        fix.recheck()
        XCTAssertEqual(fix.issues.map(\.rule), ["lk:i-lower", "lk:be-agree"])
        XCTAssertEqual(fix.safeCount, 2)
        fix.applyAll()
        XCTAssertEqual(fix.text, "I agree with you.")
        fix.undoLast()
        XCTAssertEqual(fix.text, "i am agree with you.")

        // 3. #/grammar: the offline starter lists every lesson; a lesson answered right stores the best result, XP and the day counters; a wrong answer goes to the mistake book
        let pack = try XCTUnwrap(GrammarPack.bundled())
        XCTAssertEqual(pack.index.count, 80); XCTAssertNotNil(pack.lessons["present-simple"])
        let (c1, data1, _) = ctx("grammar")
        let lesson = GrammarLessonModel(ctx: c1, id: "present-simple", full: false, pack: pack, shuffle: false)
        await lesson.load()
        XCTAssertEqual(lesson.steps.last, .quiz); XCTAssertEqual(lesson.quiz.count, 12)
        for (i, q) in lesson.quiz.enumerated() { await lesson.pickQuiz(i, i == 0 ? (q.i("answer") + 1) % max(1, q.strs("options").count) : q.i("answer")) }
        let sum = try XCTUnwrap(lesson.quizSummary)
        XCTAssertEqual(sum.right, 11); XCTAssertEqual(sum.pct, 92); XCTAssertEqual(sum.xp, GrammarCore.quizXP(11))
        let b1 = await data1.load()
        XCTAssertEqual(Int(JSON.orZero(b1.game["grammarDone"]?["present-simple"])), 92)
        XCTAssertEqual(Int(JSON.orZero(b1.game["xp"])), sum.xp)
        XCTAssertEqual(b1.mistakes.count, 1); XCTAssertEqual(b1.mistakes.first?.s("kind"), "grammar"); XCTAssertEqual(b1.mistakes.first?.s("ref"), "present-simple")

        // 4. #/style: the six picks give the winner and settings.englishStyle = {id, date}
        let (c2, data2, _) = ctx("style")
        let style = StyleModel(ctx: c2)
        for _ in 0..<6 { await style.pick(1) }
        XCTAssertEqual(style.winner, "precision")
        let b2 = await data2.load()
        XCTAssertEqual(b2.settings["englishStyle"]?.s("id"), "precision")

        // 5. #/confidence daily challenge: the self rating stores today's record and pays 10 XP once
        let (c3, data3, d3) = ctx("conf")
        let conf = ConfidenceModel(ctx: c3, page: .daily, io: .scripted(), defaults: d3)
        conf.finishDaily(120)
        XCTAssertNotNil(conf.metrics)
        await conf.rate(4)
        XCTAssertEqual(conf.daily.count, 1); XCTAssertEqual(conf.dailyScore, conf.daily.first?.i("score"))
        await conf.rate(5)
        XCTAssertEqual(conf.daily.count, 1, "re-rating the same challenge replaces it")
        let b3 = await data3.load()
        XCTAssertEqual(Int(JSON.orZero(b3.game["xp"])), 10)
        XCTAssertEqual(Confidence.load(d3).list("daily").count, 1)
    }
}
