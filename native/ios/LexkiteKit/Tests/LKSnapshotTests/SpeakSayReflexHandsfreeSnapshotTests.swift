import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P07 (fork C) – #/say · #/reflex · #/handsfree (Stitch say-list, say-front, say-back, reflex-run, reflex-result, handsfree-run): every state in four variants (1.5×, PR image budget):
/// en-light, vi-light, ar-light (RTL), de-dark. 15 screens × 4 = 60 images. Fixed series / lines / words, fixed learner state, silent device, no network.
/// Each fixture sets its state before the view is built, so the frame shows it (no loading shot): the screens' own `.task` loads are no-ops for fixtures.
@MainActor
final class SpeakSayReflexHandsfreeSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }
    static let now: Int64 = 1_767_603_600_000
    static let variants: [(String, ColorScheme)] = [("en", .light), ("vi", .light), ("ar", .light), ("de", .dark)]
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }

    // MARK: fixtures
    static let series: [JSON] = (try? JSON.parse("""
    [{"id":"say-no","title":"Say No Nicely","teacher":"ama","items":[
      {"id":"not-my-cup-of-tea","say":"It's not my cup of tea.","ipa":"/nɑːt maɪ ˈkʌp əv tiː/","reg":"polite","def":"a polite way to say you don't enjoy something","mean":"I don't really enjoy it.","when":"A friend invites you to a horror movie.","swap":{"text":"It's not really my thing.","reg":"neutral"},"dont":{"reg":"blunt","text":"That's boring!","masked":false},"pose":"thinking","m":{"vi":"không phải sở thích của tôi","de":"nicht mein Ding","ar":"ليس من ذوقي"}},
      {"id":"cant-stand","say":"I can't stand it.","ipa":"/aɪ kænt stænd ɪt/","reg":"casual","def":"to dislike something very much","mean":"I really, really don't like it.","when":"Your roommate plays loud music at night.","swap":{"text":"It's not for me.","reg":"neutral"},"dont":{"reg":"rude","text":"I h••• y••!","masked":true},"pose":"empathy","m":{"vi":"không chịu nổi","de":"ich kann es nicht ausstehen","ar":"لا أطيقه"}},
      {"id":"not-really-my-thing","say":"It's not really my thing.","ipa":"/nɑːt ˈrɪli maɪ ˈθɪŋ/","reg":"neutral","def":"a polite way to say you do not enjoy something","mean":"I don't like it very much.","when":"Someone asks you to go dancing.","swap":null,"dont":null,"pose":"happy","m":{"vi":"không hẳn là sở thích của tôi"}}]},
     {"id":"not-fine","title":"Better Than \\"I'm Fine\\"","teacher":"carlos","items":[
      {"id":"over-the-moon","say":"I'm over the moon!","ipa":"/aɪm ˈəʊvər ðə muːn/","reg":"casual","def":"very happy","mean":"I'm extremely happy.","when":"You got the job.","swap":null,"dont":null,"pose":"cheer","m":{"vi":"vui sướng tột độ"}}]}]
    """))?.array ?? []
    func ctx(_ lang: String, settings: JSON = ["accent": "us"], seen: [String] = []) -> SkillsContext {
        let data = MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: settings, game: StudyGame.empty))
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let core = StudyCore(data: data, voice: voice, calendar: Self.cal, now: { Self.now })
        let name = "lk.p07c.snapshot.\(lang)"
        let d = UserDefaults(suiteName: name) ?? .standard
        d.removePersistentDomain(forName: name)
        for k in seen { SayCore.markSeen(k, in: d) }
        return SkillsContext(core: core, lang: lang, defaults: d)
    }
    func shoot<V: View>(testName: String = #function, _ make: (String) -> V) {
        for (lang, scheme) in SnapshotFixtures.speakVariants(testName) {
            assertSnapshot(of: SnapshotFixtures.host(make(lang), lang: lang, scheme: scheme),
                           as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: SnapshotFixtures.speakScale(testName, lang))),
                           named: SnapshotFixtures.name(lang, scheme), testName: testName)
        }
    }
    /// the learner language of the card meaning follows the UI language here (vi / de / ar have a meaning in the fixture, en reads the English one)
    func say(_ lang: String, arg: String? = nil, flipped: Bool = false, mic: (score: Int, heard: String)? = nil, seen: [String] = []) -> SayView {
        SayView(model: SayModel.fixture(ctx: ctx(lang, seen: seen), series: Self.series, arg: arg, flipped: flipped, mic: mic))
    }

    // MARK: #/say
    func testSayList() { shoot { self.say($0, seen: ["say-no/not-my-cup-of-tea"]) } }
    func testSayFront() { shoot { self.say($0, arg: "say-no/not-my-cup-of-tea") } }
    func testSayFrontHeard() { shoot { self.say($0, arg: "say-no/not-my-cup-of-tea", mic: (91, "it is not my cup of tea")) } }
    func testSayBack() { shoot { self.say($0, arg: "say-no/not-my-cup-of-tea", flipped: true) } }
    func testSayBackMaskedRudeLine() { shoot { self.say($0, arg: "say-no/cant-stand", flipped: true) } }
    func testSayError() { shoot { SayView(model: SayModel.fixture(ctx: self.ctx($0), series: [])) } }

    // MARK: #/reflex
    static let lines = ["I like to read the news every morning.", "She walks to school with her best friend today.", "It's not a big deal, is it?"]
    static var items: [ReflexCore.Item] { lines.map { ReflexCore.Item(text: $0, source: .clip) } }
    func reflex(_ lang: String, _ stage: ReflexModel.Stage, left: Int, history: [ReflexModel.Round] = [], items: [ReflexCore.Item]? = nil) -> ReflexView {
        ReflexView(model: ReflexModel.fixture(ctx: ctx(lang), items: items ?? Self.items, stage: stage, left: left, history: history))
    }
    static func round(_ i: Int, heard: String) -> ReflexModel.Round {
        let c = ReflexCore.colorize(lines[i], heard)
        return ReflexModel.Round(words: c.words, heard: c.shown, pct: c.pct)
    }
    func testReflexRunHearing() { shoot { self.reflex($0, .hearing(embed: nil), left: 42) } }
    func testReflexRunSpeaking() { shoot { self.reflex($0, .speaking, left: 38) } }
    func testReflexRunScored() {
        let c = ReflexCore.colorize(Self.lines[1], "she walks school")
        shoot { self.reflex($0, .scored(words: c.words, heard: c.shown, pct: c.pct), left: 31, history: [Self.round(1, heard: "she walks school")]) }
    }
    func testReflexResult() {
        let rounds = [Self.round(0, heard: "I like to read the news every morning"), Self.round(1, heard: "she walks school"), Self.round(2, heard: "its not a big deal is it")]
        shoot { self.reflex($0, .finished(ReflexCore.Summary(n: 3, p: 83, reward: ["spoken": 3, "xp": 11])), left: 0, history: rounds) }
    }
    func testReflexEmpty() { shoot { self.reflex($0, .idle, left: 60, items: []) } }

    // MARK: #/handsfree
    static let words: [JSON] = [
        .obj([("word", "resilient"), ("ipa", "/rɪˈzɪliənt/"), ("vi", "kiên cường, phục hồi nhanh"), ("ex", "Children are often more resilient than adults expect.")]),
        .obj([("word", "commute"), ("ipa", "/kəˈmjuːt/"), ("vi", "đi lại hằng ngày"), ("ex", "My commute takes about forty minutes.")]),
        .obj([("word", "pursue"), ("vi", "theo đuổi"), ("ex", "She decided to pursue a career in medicine.")])]
    func hf(_ lang: String, playing: Bool = false, ambient: Bool = false, words: [JSON]? = nil) -> HandsfreeView {
        HandsfreeView(model: HandsfreeModel.fixture(ctx: ctx(lang), words: words ?? Self.words, title: SayMsg(.speakHfTuDenHanOn), playing: playing, ambient: ambient, index: 1))
    }
    func testHandsfreePlaying() { shoot { self.hf($0, playing: true) } }
    func testHandsfreePaused() { shoot { self.hf($0) } }
    func testHandsfreeDarkScreen() { shoot { self.hf($0, playing: true, ambient: true) } }
    func testHandsfreeEmpty() { shoot { self.hf($0, words: []) } }
}
