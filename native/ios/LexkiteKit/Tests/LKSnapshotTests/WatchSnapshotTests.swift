import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// M4 P12 Learn from YouTube video: the hub (fixed results + one history item) and the player (web view replaced by a fixed placeholder) in en / vi / ar / de × light / dark.
/// No network, no web view, no sound. References live in __Snapshots__; CI records missing ones.
@MainActor
final class WatchSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    struct Offline: VoiceTransport { func data(from url: URL, timeout: TimeInterval) async throws -> Data { throw URLError(.notConnectedToInternet) } }
    struct NoNet: WatchAPI { func get(_ op: String, _ params: [String: String]) async -> WatchReply { WatchReply(offline: true) } }

    func ctx(_ lang: String) -> SkillsContext {
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: Offline(), cacheDirectory: nil))
        let settings: JSON = ["accent": "us", "exam": "ielts", "placement": ["vCefr": "B1"]]
        let core = StudyCore(data: MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: settings, game: StudyGame.empty)), voice: voice, calendar: Self.cal, now: { WatchSnapshotTests.now })
        return SkillsContext(core: core, lang: lang, data: SkillsData(), defaults: UserDefaults(suiteName: "lk.watch.snapshot.\(lang)") ?? .standard)
    }
    func store(_ lang: String) -> WatchStore {
        let d = UserDefaults(suiteName: "lk.watch.snapshot.store.\(lang)") ?? .standard
        d.removePersistentDomain(forName: "lk.watch.snapshot.store.\(lang)")
        return WatchStore(defaults: d)
    }

    func shoot<V: View>(testName: String = #function, _ make: (String) async -> V) async {
        for lang in SnapshotFixtures.langs {
            for scheme in SnapshotFixtures.schemes {
                let v = await make(lang)
                assertSnapshot(of: SnapshotFixtures.host(v, lang: lang, scheme: scheme),
                               as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98, traits: UITraitCollection(displayScale: 1.5)),
                               named: SnapshotFixtures.name(lang, scheme), testName: testName)
            }
        }
    }

    static let items: [WatchItem] = [
        WatchItem(id: "dQw4w9WgXcQ", title: "Ordering coffee in English: easy phrases", ch: "Easy English", sec: 312, cc: true),
        WatchItem(id: "abcdefghijk", title: "Small talk for beginners", ch: "Daily English", sec: 845, cc: true),
        WatchItem(id: "lmnopqrstuv", title: "How to ask for directions", ch: "English Class 101", sec: 193, cc: false),
        WatchItem(id: "wxyzABCDEFG", title: "Shopping dialogues with subtitles", ch: "Learn English", sec: 1260, cc: true),
    ]

    // MARK: #/watch
    func testWatchHub() async {
        await shoot { lang in
            let st = self.store(lang)
            st.remember(WatchHistory(id: "dQw4w9WgXcQ", title: "Ordering coffee in English: easy phrases", ch: "Easy English", topic: "daily", pos: 120, len: 312, at: 1_767_600_000_000))
            let m = WatchHubModel(ctx: self.ctx(lang), api: NoNet(), store: st)
            await m.load()
            m.preview(run: WatchHubModel.Run(q: "everyday english conversation", label: "Hội thoại đời sống", topic: "daily", items: Self.items, loading: false, offline: false, yt: Watch.youtubeSearchURL("everyday english")))
            return WatchHubView(model: m)
        }
    }

    // MARK: #/watch/<id>
    func testWatchPlayer() async {
        await shoot { lang in
            let st = self.store(lang)
            st.pick = WatchPick(id: "dQw4w9WgXcQ", title: "Ordering coffee in English: easy phrases", ch: "Easy English", topic: "daily")
            let m = WatchPlayerModel(id: "dQw4w9WgXcQ", ctx: self.ctx(lang), api: NoNet(), store: st)
            var loop = WatchLoop(); loop.setA(70); loop.setB(80)
            let found = WordPopup.Found(entry: ["word": "latte"], word: "latte", pos: "n", level: "B1", ipa: "/ˈlɑːteɪ/", mean: "cà phê sữa", def: "", saved: false, sentence: "", ctxWord: "latte", detailsHref: "#/dict/latte")
            m.preview(ready: true, playing: false, pos: 75, len: 312, loop: loop, lookup: WordPopupModel.fixture(.found(found), word: "latte", sentence: ""))
            m.addNote("Useful phrase: can I get a…")
            return WatchPlayerView(model: m, web: { _ in AnyView(Self.placeholder) })
        }
    }
    /// stands in for the web view: a fixed dark 16:9 frame
    static var placeholder: some View {
        ZStack { Color(white: 0.08); Image(systemName: "play.fill").font(.system(size: 36)).foregroundStyle(Color(white: 0.8)) }
    }
}
