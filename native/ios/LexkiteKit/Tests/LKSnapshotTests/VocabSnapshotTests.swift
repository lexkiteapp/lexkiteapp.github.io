import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M3 P04/P05 vocabulary screens: review (front · answer with the four grades), practice (a quiz question with its feedback), mistakes,
/// word book (deck), library and topic. Four variants each (1.5×, PR image budget): en-light, vi-light, ar-light (RTL), de-dark (long text) = 7 × 5 = 35 images at 2×.
/// Fixed cards, fixed clock, in-memory data, no sound, no network. References live in __Snapshots__; CI records missing ones (SNAPSHOT_RECORD=missing).
@MainActor
final class VocabSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static let day = 86_400_000.0
    static let variants: [(String, ColorScheme)] = [("en", .light), ("vi", .light), ("ar", .light), ("de", .dark)]
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    struct VocabOffline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    // MARK: fixtures
    static func card(_ word: String, vi: String, ipa: String, pos: String, ex: String, reps: Int, lapses: Int = 0, due: Double, last: Double?, topic: String = "education",
                     level: String = "B1", emoji: String = "📘", added: Double, extra: [String: JSON] = [:]) -> JSON {
        let n = Double(now)
        var srs: [String: JSON] = ["ef": 2.5, "interval": .number(reps > 0 ? 3 : 0), "reps": .number(Double(reps)), "lapses": .number(Double(lapses)), "step": 0, "due": .number(n + due * day)]
        srs["last"] = last.map { .number(n - $0 * day) } ?? .null
        if reps > 0 { srs["S"] = 6; srs["D"] = 5 }
        var o: [String: JSON] = ["word": .string(word), "vi": .string(vi), "ipa": .string(ipa), "pos": .string(pos), "ex": .string(ex), "def": .string(""), "level": .string(level), "topic": .string(topic),
                                 "emoji": .string(emoji), "col": ["take into account"], "syn": [], "sentences": [], "contexts": [], "note": "", "image": "", "added": .number(n - added * day), "srs": .object(srs)]
        for (k, v) in extra { o[k] = v }
        return .object(o)
    }
    static var cards: [JSON] {
        [card("consider", vi: "cân nhắc", ipa: "/kənˈsɪdər/", pos: "verb", ex: "We are considering moving to a new city.", reps: 2, due: -1, last: 4, emoji: "🤔", added: 9,
              extra: ["def": "to think carefully about something", "syn": ["contemplate"], "contexts": [["text": "Please consider my offer carefully.", "title": "Câu của tôi", "source": ""]]]),
         card("afraid", vi: "sợ", ipa: "/əˈfreɪd/", pos: "adjective", ex: "She is afraid of the dark.", reps: 2, due: -0.5, last: 3, level: "A2", emoji: "😨", added: 8),
         card("salary", vi: "tiền lương", ipa: "/ˈsæləri/", pos: "noun", ex: "Her salary is paid every month.", reps: 3, lapses: 3, due: 0.2, last: 5, topic: "work", emoji: "💰", added: 7),
         card("decide", vi: "quyết định", ipa: "/dɪˈsaɪd/", pos: "verb", ex: "We decided to stay at home tonight.", reps: 0, due: 0, last: nil, emoji: "✅", added: 3),
         card("recruit", vi: "tuyển dụng", ipa: "/rɪˈkruːt/", pos: "verb", ex: "The company will recruit ten new staff.", reps: 0, due: 0, last: nil, topic: "work", level: "B2", emoji: "🧑‍💼", added: 2),
         card("curriculum", vi: "chương trình học", ipa: "/kəˈrɪkjələm/", pos: "noun", ex: "The curriculum includes science.", reps: 4, due: 12, last: 2, level: "B2", emoji: "📚", added: 20)]
    }
    static var catalog: TopicCatalog {
        func w(_ word: String, _ vi: String, _ pos: String, _ level: String, _ ipa: String) -> JSON {
            .obj([("word", .string(word)), ("vi", .string(vi)), ("pos", .string(pos)), ("level", .string(level)), ("ipa", .string(ipa)), ("ex", .string("")), ("def", .string("")), ("col", .array([])), ("syn", .array([])), ("emoji", .string("📘"))])
        }
        let education = TopicCatalog.Topic(id: "education", group: "topics", name: "Education", emoji: "🎓", desc: "School, study and learning",
                                           words: [cards[0], cards[3], cards[5], w("lecture", "bài giảng", "noun", "B2", "/ˈlektʃər/"), w("exam", "kỳ thi", "noun", "A2", "/ɪɡˈzæm/"), w("degree", "bằng cấp", "noun", "B1", "/dɪˈɡriː/")])
        let work = TopicCatalog.Topic(id: "work", group: "topics", name: "Work", emoji: "💼", desc: "Jobs and the workplace",
                                      words: [cards[2], cards[4], w("manager", "quản lý", "noun", "A2", "/ˈmænɪdʒər/"), w("deadline", "hạn chót", "noun", "B1", "/ˈdedlaɪn/")])
        let travel = TopicCatalog.Topic(id: "travel", group: "topics", name: "Travel", emoji: "✈️", desc: "Trips, tickets and hotels",
                                        words: [w("luggage", "hành lý", "noun", "A2", "/ˈlʌɡɪdʒ/"), w("passport", "hộ chiếu", "noun", "A2", "/ˈpæspɔːt/"), w("itinerary", "lịch trình", "noun", "C1", "/aɪˈtɪnərəri/")])
        return TopicCatalog(topics: [education, work, travel], groups: [.init(id: "topics", name: "Topics", emoji: "📘", desc: "Everyday and academic topics")])
    }
    static var mistakes: [JSON] {
        let n = Double(now)
        func m(_ kind: String, _ q: JSON, _ given: String, _ answer: String, _ explain: String, _ ref: String, count: Double) -> JSON {
            let key = kind + "|" + (q.object != nil ? q["k"]!.string! + (q["v"]?.stableString ?? "undefined") : q.string ?? "")
            return .obj([("kind", .string(kind)), ("q", q.object != nil ? .string(q["k"]!.string!) : q), ("qK", q.object != nil ? q : .null), ("given", .string(given)), ("answer", .string(answer)),
                         ("explain", .string(explain)), ("ref", .string(ref)), ("key", .string(key)), ("n", .number(count)), ("at", .number(n)), ("fixed", .bool(false))])
        }
        return [m("vocab", .obj([("k", .string("Nghĩa của “{word}”?")), ("v", .obj([("word", .string("consider"))]))]), "sợ", "cân nhắc", "consider /kənˈsɪdər/ = cân nhắc", "consider", count: 3),
                m("grammar", .string("He ___ to school yesterday."), "goes", "went", "Past simple: yesterday needs the past form.", "past-simple", count: 1),
                m("listening", .string("Where will they meet?"), "At the station", "In front of the library", "", "l-12", count: 2),
                m("reading", .string("The writer’s main purpose is to…"), "describe", "persuade", "Look for the opinion words in the last paragraph.", "r-4", count: 1)]
    }
    static func bundle() -> VocabBundle {
        VocabBundle(cards: cards, stats: ["days": ["2026-01-04": 12, "2026-01-03": 9], "newToday": ["day": "2026-01-05", "n": 0]],
                    settings: ["dailyNew": 10, "dailyGoal": 20, "reviewMode": "flip", "accent": "us"], game: StudyGame.empty, mistakes: mistakes, catalog: catalog)
    }
    func core(_ lang: String) -> StudyCore {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: VocabOffline(), cacheDirectory: nil))
        return StudyCore(data: MemoryVocabData(Self.bundle()), voice: voice, calendar: Self.cal, now: { VocabSnapshotTests.now })
    }

    func shoot<V: View>(testName: String = #function, _ make: (String) async -> V) async {
        for (lang, scheme) in Self.variants {
            let v = await make(lang)
            assertSnapshot(of: SnapshotFixtures.host(v, lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: 1.5)),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }

    // MARK: states
    static let ankiText = "#separator:tab\n#html:true\n#deck:Demo deck\nconsider\tcân nhắc\nafraid\tsợ\nbrand-new\tmới tinh\nsalary\ttiền lương\n"
    func testAnkiExport() async {
        await shoot { lang in
            let deck = DeckModel(core: self.core(lang)); deck.autoPlay = false
            await deck.load(query: [:])
            return AnkiSheet(model: AnkiModel(deck: deck, tab: .export))
        }
    }
    func testAnkiImport() async {
        await shoot { lang in
            let deck = DeckModel(core: self.core(lang)); deck.autoPlay = false
            await deck.load(query: [:])
            let m = AnkiModel(deck: deck, tab: .importing)
            await m.load(data: Data(Self.ankiText.utf8), name: "Demo")
            return AnkiSheet(model: m)
        }
    }

    func testReviewFront() async {
        await shoot { lang in
            let m = StudyReviewModel(core: self.core(lang)); m.autoPlay = false
            await m.load()
            return StudyReviewView(model: m)
        }
    }

    func testReviewAnswer() async {
        await shoot { lang in
            let m = StudyReviewModel(core: self.core(lang)); m.autoPlay = false
            await m.load()
            m.flip()
            return StudyReviewView(model: m)
        }
    }

    func testPractice() async {
        await shoot { lang in
            let m = StudyPracticeModel(core: self.core(lang)); m.autoPlay = false
            await m.load(mode: nil, src: "deck")
            return StudyPracticeView(model: m, mode: nil)
        }
    }

    func testMistakes() async {
        await shoot { lang in
            let c = self.core(lang)
            let m = StudyMistakesModel(core: c); m.translate = c.translator(L10n(lang: lang)); m.autoPlay = false
            await m.load(retry: false)
            return StudyMistakesView(model: m)
        }
    }

    func testDeck() async {
        await shoot { lang in
            let m = DeckModel(core: self.core(lang)); m.autoPlay = false
            await m.load(query: [:])
            return DeckView(model: m)
        }
    }

    func testLibrary() async {
        await shoot { lang in
            let m = LibraryModel(core: self.core(lang))
            await m.load(query: ["g": "topics"])
            return LibraryView(model: m)
        }
    }

    func testTopic() async {
        await shoot { lang in
            let m = LibraryTopicModel(core: self.core(lang), id: "education")
            await m.load(level: nil)
            return LibraryTopicView(model: m)
        }
    }
}
