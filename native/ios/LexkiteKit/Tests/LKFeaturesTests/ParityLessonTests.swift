import XCTest
import SwiftUI
import AVFoundation
@testable import LKFeatures
import LKStrings
import LKDesign
import LKCore
import LKStore

/// Deterministic fake recognizer: returns the scores in order.
@MainActor final class FakeScorer: SpeechScoring {
    var outcomes: [SpeechOutcome]
    init(_ o: [SpeechOutcome]) { outcomes = o }
    func listen(target: String) async -> SpeechOutcome { outcomes.isEmpty ? .noSpeech : outcomes.removeFirst() }
    func cancel() {}
}

final class FakeTransport: VoiceTransport, @unchecked Sendable {
    let lock = NSLock()
    var log: [String] = []
    let failing: (URL) -> Bool
    init(failing: @escaping (URL) -> Bool) { self.failing = failing }
    func data(from url: URL, timeout: TimeInterval) async throws -> Data {
        lock.lock(); log.append(url.absoluteString); lock.unlock()
        if failing(url) { throw URLError(.badServerResponse) }
        return Data([1, 2, 3])
    }
}

/// P03 (lesson player) and C04 (audio) behaviour. The engine / audio numbers are gated by LKSyncTests (lesson.json, audio.json vectors);
/// this checks the app layer on top: the player flow, hints, retries, results, exit rule, failover order, voices, rendering.
@MainActor
final class ParityLessonTests: XCTestCase {

    // MARK: P03
    func testParityP03() async throws {
        let m = await LessonFixtures.model()
        XCTAssertEqual(m.phase, .question)
        XCTAssertFalse(m.items.isEmpty)
        XCTAssertGreaterThanOrEqual(Set(m.items.map(\.type)).count, 3, "mixed exercise kinds")
        XCTAssertFalse(m.canCheck, "Check is disabled until the learner answers")
        XCTAssertFalse(m.needsConfirmToExit, "nothing to lose before the first answer")
        let total = m.session.total

        // play right until the first choice exercise (the engine never opens with gap/match – web build order), then answer it wrong
        var g0 = 0
        while let c = m.cur, c.type != "gap", c.type != "mean", m.phase != .done, g0 < 60 {
            g0 += 1
            if m.phase == .feedback { m.next(); continue }
            LessonFixtures.answerRight(m)
            if m.phase == .feedback { m.next() }
        }
        XCTAssertTrue(m.cur?.type == "gap" || m.cur?.type == "mean", "a choice exercise comes up")
        // wrong answer: sheet shows, combo 0, the item is requeued as a past mistake
        if let it = m.cur, it.type == "gap" || it.type == "mean" {
            m.pick = it.options?.first { $0 != it.answer }
            XCTAssertTrue(m.canCheck); m.submit()
            XCTAssertEqual(m.phase, .feedback); XCTAssertFalse(m.lastOK); XCTAssertEqual(m.session.combo, 0); XCTAssertTrue(m.requeued)
            XCTAssertEqual(m.wrongTick, 1)
            XCTAssertTrue(m.needsConfirmToExit == false || m.session.solved > 0)
            m.next()
            XCTAssertEqual(m.session.q.last?.retry, 1, "wrong answers come back")
        }
        // hints: fifty-fifty hides a wrong option, never the answer; first tile; letter + bank
        if let g = m.items.first(where: { $0.type == "gap" }) {
            while m.cur?.id != g.id, m.phase == .question { LessonFixtures.answerRight(m); m.next() }
            if m.cur?.id == g.id, let h = m.nextHint(g) {
                XCTAssertEqual(h, "fifty"); m.useHint(h)
                XCTAssertEqual(m.hidden.count, 1); XCTAssertFalse(m.hidden.contains(g.answer ?? ""))
            }
        }
        // run the rest correctly
        var guardN = 0
        while m.phase != .done, guardN < 200 {
            guardN += 1
            if m.phase == .feedback { m.next(); continue }
            if m.cur?.type == "build", m.canCheck == false { XCTAssertEqual(m.nextHint(m.cur!), "first"); m.useHint("first"); XCTAssertEqual(m.tiles.count, 1); m.tiles = [] }
            LessonFixtures.answerRight(m)
        }
        XCTAssertEqual(m.phase, .done)
        XCTAssertGreaterThan(m.summary.xp, 10); XCTAssertGreaterThan(m.summary.best, 0)
        XCTAssertFalse(m.summary.perfect, "one wrong answer → not a perfect lesson")
        XCTAssertLessThan(m.summary.accuracy, 100)
        XCTAssertEqual(m.session.total, total)
        XCTAssertGreaterThanOrEqual(m.doneTick, 1)

        // type exercise: letter hint then the letter bank (typed word = picked tiles)
        let t = await LessonFixtures.model(seed: 21)
        if let ty = t.items.first(where: { $0.type == "type" }) {
            while t.cur?.id != ty.id, t.phase != .done { LessonFixtures.answerRight(t); if t.phase == .feedback { t.next() } }
            XCTAssertEqual(t.nextHint(ty), "letter"); t.useHint("letter"); XCTAssertEqual(t.letters, 1)
            t.useHint("bank"); XCTAssertTrue(t.useBank)
            for l in ty.answer ?? "" { if let i = ty.bank?.indices.first(where: { ty.bank?[$0] == String(l) && !t.bankPicks.contains($0) }) { t.bankTap(i) } }
            XCTAssertEqual(t.typed, ty.answer); XCTAssertTrue(t.canCheck)
            t.bankBack(); XCTAssertEqual(t.typed.count, (ty.answer ?? "").count - 1)
        }

        // "can't listen now" switches to exercises without sound; "can't speak now" replaces speaking
        let s = await LessonFixtures.model(seed: 3)
        s.cantSpeak()
        XCTAssertFalse(s.session.q.contains { $0.type == "say" && $0.spoke != true }, "no speaking left after 'can't speak now'")
        s.cantListen()
        XCTAssertTrue(s.session.q.allSatisfy { $0.noAudio == true })

        // speaking: ≥ 70 passes at once; two weak attempts in a row submit anyway (web rule)
        let sp = await LessonFixtures.model(seed: 5, scorer: FakeScorer([.heard(text: "x", score: 40), .heard(text: "y", score: 50), .heard(text: "z", score: 90)]))
        while sp.cur?.type != "say", sp.phase != .done { LessonFixtures.answerRight(sp); if sp.phase == .feedback { sp.next() } }
        if sp.cur?.type == "say" {
            sp.tapToSpeak(); try await Task.sleep(nanoseconds: 100_000_000)
            XCTAssertEqual(sp.phase, .question); XCTAssertTrue(sp.unclear, "first weak attempt → try again")
            sp.tapToSpeak(); try await Task.sleep(nanoseconds: 100_000_000)
            XCTAssertEqual(sp.phase, .feedback); XCTAssertFalse(sp.lastOK, "second miss is submitted")
        }

        // results → saved callback: wrong words get grade 0, never grade for words answered only right (when not due)
        let r = await LessonFixtures.model(seed: 9)
        var got: [LessonEngine.Result] = []
        r.saved = { res, _, _ in got = res }
        var n = 0
        while let it = r.cur, !(it.type == "gap" || it.type == "mean"), n < 50 { n += 1; LessonFixtures.answerRight(r); if r.phase == .feedback { r.next() } }
        if let it = r.cur { r.pick = it.options?.first { $0 != it.answer }; r.submit(); r.next() }
        n = 0
        while r.phase != .done, n < 200 { n += 1; if r.phase == .feedback { r.next() } else { LessonFixtures.answerRight(r) } }
        try await Task.sleep(nanoseconds: 100_000_000)
        XCTAssertTrue(got.contains { $0.grade == 0 }, "the missed word is reviewed as Again")
        XCTAssertTrue(got.allSatisfy { [0, 2].contains($0.grade) })

        // story: lines are progress only, checks are graded
        let story = LessonStory.parseScript("""
        self.LESSON_STORIES = [{"id":"t","kind":"story","lines":[{"who":"carlos","en":"Hi! What can I get for you?"},{"who":"ama","en":"A coffee, please."}],
        "checks":[{"at":1,"type":"q","q":"What does Ama want?","options":["Tea","Coffee"],"answer":1,"keep":true}]}];
        """)?.first
        XCTAssertNotNil(story)
        let sm = LessonModel(uiLang: "en", voice: LKVoicePlayer(resolver: VoiceResolver(transport: LessonFixtures.Offline(), cacheDirectory: nil)),
                             defaults: UserDefaults(suiteName: "lk.test.story")!, remote: LessonFixtures.NoText(), reduceMotion: true)
        sm.autoPlay = false
        await sm.start(LessonModel.Source(story: story), kind: "story", seed: 2)
        XCTAssertTrue(sm.isStory); XCTAssertNotNil(sm.teacher2)
        XCTAssertEqual(sm.cur?.type, "line"); sm.continueLine(); XCTAssertEqual(sm.session.n, 0, "lines are not graded")
        XCTAssertEqual(sm.log.count, 2)
        sm.continueLine(); XCTAssertEqual(sm.cur?.type, "q"); sm.pick = "Coffee"; sm.submit(); XCTAssertTrue(sm.lastOK); sm.next(); XCTAssertEqual(sm.phase, .done)

        // the screens render (question, feedback, done) in LTR and RTL without a crash
        for lang in ["en", "ar"] {
            let v = await LessonFixtures.model(lang: lang, teacher: TeacherController.frozen(who: "ama"))
            for step in 0..<3 {
                let services = AppServices.preview(snapshot: TodaySnapshot(), lang: lang)
                let host = UIHostingController(rootView: LessonView(model: v).environment(services).environment(\.l10n, services.l10n)
                    .environment(\.layoutDirection, services.l10n.isRTL ? .rightToLeft : .leftToRight))
                host.view.frame = CGRect(x: 0, y: 0, width: 390, height: 844)
                host.view.layoutIfNeeded()
                XCTAssertEqual(host.view.bounds.width, 390)
                if step == 0 { LessonFixtures.answerRight(v) }                // → feedback
                if step == 1 { var k = 0; while v.phase != .done, k < 200 { k += 1; if v.phase == .feedback { v.next() } else { LessonFixtures.answerRight(v) } } }
            }
        }
        // every key the player uses exists in all 15 languages (generated IDs only)
        for l in L10nLangs.all { let tt = L10n(lang: l); for k in [L10nKey.lessonQGap, .lessonRight, .lessonWrong, .lessonWhy, .lessonDone, .lessonExitAsk, .lessonNoSpeak] { XCTAssertTrue(tt.has(k), "\(l) \(k)") } }
    }

    // MARK: C04
    func testParityC04() async throws {
        // CDN failover: first origin fails → second plays; every failure counts; the next request starts at a healthier origin
        let key = VoiceCore.lineKey(voice: "af_heart", text: "Hello there.")
        let tr = FakeTransport { $0.host == "audio.lexkite.com" }
        let res = VoiceResolver(transport: tr, cacheDirectory: nil)
        let hit = await res.fetch(kind: .sentence, key: key)
        XCTAssertEqual(hit?.url?.host, "lexkiteapp.github.io"); XCTAssertEqual(tr.log.count, 2, "origin 1 failed, origin 2 served")
        let fails1 = await res.fails; XCTAssertEqual(fails1, 1)
        _ = await res.fetch(kind: .sentence, key: key)
        let fails2 = await res.fails; XCTAssertEqual(fails2, 2)
        _ = await res.fetch(kind: .sentence, key: key)
        XCTAssertEqual(tr.log.last.flatMap { URL(string: $0)?.host }, "lexkiteapp.github.io", "after two failures the first origin is skipped")
        // everything fails → nil (the player then uses the system voice)
        let none = VoiceResolver(transport: FakeTransport { _ in true }, cacheDirectory: nil)
        let miss = await none.fetch(kind: .word, key: "abc")
        XCTAssertNil(miss)
        // disk cache: second request needs no network
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("lk-voice-\(UUID().uuidString)")
        let tr2 = FakeTransport { _ in false }
        let cached = VoiceResolver(transport: tr2, cacheDirectory: dir)
        let h1 = await cached.fetch(kind: .sentence, key: key); let h2 = await cached.fetch(kind: .sentence, key: key)
        XCTAssertEqual(h1?.cached, false); XCTAssertEqual(h2?.cached, true); XCTAssertEqual(tr2.log.count, 1)
        try? FileManager.default.removeItem(at: dir)
        // word files live under /audio/w/
        let wt = FakeTransport { _ in false }
        _ = await VoiceResolver(transport: wt, cacheDirectory: nil).fetch(kind: .word, key: VoiceCore.wordKey(voice: "af_heart", headword: "consider"))
        XCTAssertTrue(wt.log.first?.contains("/audio/w/") == true)

        // voices: Ama female (af_heart), Carlos male (am_michael); the system fallback never picks the wrong gender when the right one exists
        XCTAssertEqual(LKVoicePlayer.voiceID("ama"), "af_heart"); XCTAssertEqual(LKVoicePlayer.voiceID("carlos"), "am_michael")
        XCTAssertEqual(VoiceCore.genderFor("ama"), "f"); XCTAssertEqual(VoiceCore.genderFor("carlos"), "m")
        for (who, want) in [("ama", "f"), ("carlos", "m")] {
            let all = AVSpeechSynthesisVoice.speechVoices().map { LKVoicePlayer.displayName($0) }
            if all.contains(where: { VoiceCore.genderOf($0) == want }), let v = LKVoicePlayer.systemVoice(who: who, accent: "en-US") {
                XCTAssertNotEqual(VoiceCore.genderOf(LKVoicePlayer.displayName(v)), want == "f" ? "m" : "f", "\(who) must not get the opposite gender")
            }
        }
        // the player is the teacher's lip-sync clock
        let p = LKVoicePlayer(resolver: res)
        XCTAssertFalse(p.isPlaying); XCTAssertEqual(p.time, 0)
        // reading text is cleaned like the web (IPA / labels / emoji never spoken)
        XCTAssertEqual(VoiceCore.ttsClean("📚 curriculum /kəˈrɪkjələm/ UK US n 💬 Ví dụ Many people have a curriculum."), "Many people have a curriculum.")
        XCTAssertEqual(VoiceCore.split("One. Two! Three?"), ["One.", "Two!", "Three?"])
    }
}
