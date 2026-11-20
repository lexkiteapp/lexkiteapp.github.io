import Foundation
import LKCore
@testable import LKFeatures

/// Fixed lesson data for the parity tests and snapshots (no network, no clock): the engine builds the same exercises every run.
enum LessonFixtures {
    static let now: Double = 1_767_603_600_000   // 2026-01-05T09:00:00Z
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }

    static func card(_ ref: String, _ word: String, _ pos: String, vi: String, def: String, ex: String, ipa: String = "", due: Double = now - 86_400_000, reps: Double = 2) -> LessonCard {
        LessonCard(ref: ref, word: word, pos: pos, ipa: ipa, ipaUS: ipa, vi: vi, def: def, ex: ex,
                   sentences: [LessonSentence(en: ex, vi: "Câu ví dụ.")], srs: LessonSRS(reps: reps, lapses: 0, due: due, last: due - 3 * 86_400_000))
    }
    static let cards: [LessonCard] = [
        card("a", "consider", "verb", vi: "cân nhắc", def: "to think carefully about something", ex: "We are considering moving to a new city.", ipa: "/kənˈsɪdər/"),
        card("b", "afraid", "adjective", vi: "sợ", def: "feeling fear", ex: "She is afraid of the dark.", ipa: "/əˈfreɪd/"),
        card("c", "salary", "noun", vi: "tiền lương", def: "money you get every month", ex: "Her salary is paid every month.", ipa: "/ˈsæləri/"),
        card("d", "decide", "verb", vi: "quyết định", def: "to choose after thinking", ex: "We decided to stay at home tonight.", ipa: "/dɪˈsaɪd/"),
        card("e", "listening", "noun", vi: "sự lắng nghe", def: "paying attention to sound", ex: "I like listening to music.", ipa: "/ˈlɪsənɪŋ/"),
    ]

    struct NoText: LessonTextSource { func text(_ path: String) async -> String? { nil } }

    @MainActor static func model(lang: String = "en", seed: Double = 7, kind: String = "lesson", teacher: TeacherController? = nil, scorer: SpeechScoring? = nil,
                                 defaults: UserDefaults? = nil) async -> LessonModel {
        let d = defaults ?? UserDefaults(suiteName: "lk.test.lesson.\(UUID().uuidString)")!
        let m = LessonModel(uiLang: lang, voice: LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil)), defaults: d, scorer: scorer,
                            remote: NoText(), reduceMotion: true, teacher: teacher, clock: { Date(timeIntervalSince1970: now / 1000) })
        m.calendar = cal
        m.autoPlay = false
        await m.start(LessonModel.Source(cards: cards), kind: kind, seed: seed)
        return m
    }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    /// Answers the current item correctly like a learner would (taps / typing / score).
    @MainActor static func answerRight(_ m: LessonModel) {
        guard let it = m.cur else { return }
        switch it.type {
        case "build", "tr":
            var used: [Int] = []
            for w in LessonEngine.toks(it.answer ?? "") { if let i = it.tiles?.indices.first(where: { !used.contains($0) && it.tiles?[$0] == w }) { used.append(i) } }
            m.tiles = used; m.submit()
        case "type": m.typed = it.answer ?? ""; m.submit()
        case "match": m.submit(matched: true)
        case "say": m.submit(score: 0.9, heard: it.answer ?? "")
        case "pic" where it.choice != true: m.submit(score: 0.9, heard: it.answer ?? "")
        case "line": m.continueLine()
        default: m.pick = it.answer; m.submit()
        }
    }
}
