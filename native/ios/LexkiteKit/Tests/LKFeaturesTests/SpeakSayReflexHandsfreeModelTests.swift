import Foundation
import XCTest
@testable import LKFeatures
import LKStore
import LKSync
import LKStrings
import LKCore

/// P07 (fork C): the three screens' models with a scripted microphone, a silent voice and a recording device. The numbers and texts are gated by
/// LKSyncTests/SpeakSayReflexHandsfreeVectorTests (vectors from the web code); this walks the flows end to end.
@MainActor
final class SpeakSayReflexHandsfreeModelTests: XCTestCase {
    static let now: Int64 = 1_767_603_600_000
    static var cal: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    static let series: [JSON] = (try? JSON.parse("""
    [{"id":"say-no","title":"Say No Nicely","teacher":"ama","items":[
      {"id":"not-my-cup-of-tea","say":"It's not my cup of tea.","ipa":"/nɑːt maɪ ˈkʌp əv tiː/","reg":"polite","def":"a polite way to say you don't enjoy something","mean":"I don't really enjoy it.","when":"A friend invites you to a horror movie.","swap":{"text":"It's not really my thing.","reg":"neutral"},"dont":{"reg":"blunt","text":"That's boring!","masked":false},"pose":"thinking","m":{"vi":"không phải sở thích của tôi"}},
      {"id":"cant-stand","say":"I can't stand it.","ipa":"/aɪ kænt stænd ɪt/","reg":"casual","def":"to dislike something very much","mean":"I really, really don't like it.","when":"Your roommate plays loud music at night.","swap":{"text":"It's not for me.","reg":"neutral"},"dont":{"reg":"rude","text":"I h••• y••!","masked":true},"pose":"empathy","m":{"vi":"không chịu nổi"}}]},
     {"id":"office","title":"Office English","teacher":"carlos","items":[{"id":"call-it-a-day","say":"Let's call it a day.","ipa":"/lets kɔːl ɪt ə deɪ/","reg":"neutral","def":"stop working","mean":"Let's stop for today.","when":"After a long meeting.","swap":null,"dont":null,"pose":"happy","m":{"vi":"hôm nay thế là đủ"}}]}]
    """))?.array ?? []
    func suite(_ n: String) -> UserDefaults { let d = UserDefaults(suiteName: "lk.test.p07c.\(n)")!; d.removePersistentDomain(forName: "lk.test.p07c.\(n)"); return d }
    func ctx(_ n: String, settings: JSON = ["accent": "us"], lang: String = "vi") -> (SkillsContext, MemoryVocabData) {
        let data = MemoryVocabData(VocabBundle(cards: [], stats: .object([:]), settings: settings, game: StudyGame.empty))
        let voice = LKVoicePlayer(resolver: VoiceResolver(transport: FakeTransport(failing: { _ in true }), cacheDirectory: nil))
        let core = StudyCore(data: data, voice: voice, calendar: Self.cal, now: { Self.now })
        return (SkillsContext(core: core, lang: lang, defaults: suite(n)), data)
    }
    func eventually(_ ok: @escaping () async -> Bool) async -> Bool {
        for _ in 0..<150 { if await ok() { return true }; try? await Task.sleep(nanoseconds: 20_000_000) }
        return false
    }

    // MARK: #/say
    func testParityP07SayModel() async throws {
        let (c, _) = ctx("say")
        var heard: [(String, String, String, Bool)] = []
        let io = SpeakIO(recognizer: ScriptedRecognizer([.heard("it is not my cup of tea"), .failed("not-allowed")]),
                         say: { t, who, accent, slow, end in heard.append((t, who, accent, slow)); end?() })
        let m = SayModel.fixture(ctx: c, series: Self.series, io: io)
        XCTAssertEqual(m.phase, .list)
        XCTAssertEqual(m.rows.map(\.firstCard), ["not-my-cup-of-tea", "call-it-a-day"])
        m.openFirst(m.rows[0])
        XCTAssertEqual(m.phase, .card)
        XCTAssertFalse(m.flipped)
        XCTAssertTrue(m.seen.contains("say-no/not-my-cup-of-tea"), "opening a card marks it seen")
        XCTAssertEqual(m.rows[0].firstCard, "cant-stand", "the first unseen card moves on")
        m.speak(slow: false); m.speak(slow: true)
        XCTAssertEqual(heard.map(\.0), ["It's not my cup of tea.", "It's not my cup of tea."])
        XCTAssertEqual(heard.map(\.1), ["ama", "ama"])
        XCTAssertEqual(heard.map(\.2), ["en-US", "en-US"])
        XCTAssertEqual(heard.map(\.3), [false, true])
        await m.toggleMic()
        let best = Recognize.best(target: "It's not my cup of tea.", alts: ["it is not my cup of tea"])
        XCTAssertEqual(m.micLine, SayCore.micResult(score: best.score, heard: best.heard).text)
        XCTAssertEqual(m.micHeard, "it is not my cup of tea")
        await m.toggleMic()
        XCTAssertEqual(m.micLine, SayCore.micError("not-allowed"))
        m.flip()
        XCTAssertTrue(m.flipped)
        m.nextCard()
        XCTAssertEqual(m.item.s("id"), "cant-stand")
        // a rude line: the card is masked, only the sentence is ever spoken, the share text has no "don't say" line
        heard = []; m.speak(slow: false)
        XCTAssertEqual(heard.map(\.0), ["I can't stand it."])
        XCTAssertFalse(m.shareText.text(L10n(lang: "en")).contains("h•••"))
        XCTAssertTrue(m.shareURL.hasSuffix("/say-no/cant-stand"))
        XCTAssertTrue(m.back())
        XCTAssertEqual(m.phase, .list)
        XCTAssertFalse(m.back(), "back on the list closes the screen")
    }
    func testSayErrorPanelWhenSeriesCannotBeLoaded() {
        let (c, _) = ctx("sayerr")
        let m = SayModel.fixture(ctx: c, series: [])
        XCTAssertEqual(m.phase, .error)   // web: "Không tải được – thử lại sau" + Thử lại
    }
    func testSayUnknownCardReplacedByTheFirst() {
        let (c, _) = ctx("sayrep")
        let m = SayModel.fixture(ctx: c, series: Self.series, arg: "say-no/zzz")
        XCTAssertEqual(m.phase, .card); XCTAssertEqual(m.item.s("id"), "not-my-cup-of-tea")
        XCTAssertEqual(SayModel.fixture(ctx: c, series: Self.series, arg: "nope").phase, .list)
    }

    // MARK: #/reflex
    func testParityP07ReflexModel() async throws {
        let (c, data) = ctx("reflex", settings: .object([:]))
        let items = ["I like to read the news every morning.", "She walks to school with her best friend today."].map { ReflexCore.Item(text: $0, source: .clip) }
        let io = SpeakIO(recognizer: ScriptedRecognizer([.heard("I like to read the news every morning"), .failed("no-speech")]), say: { _, _, _, _, end in end?() })
        let m = ReflexModel(ctx: c, io: io, items: items, live: false)
        XCTAssertEqual(m.left, 60)
        m.start()
        let ok = await eventually { if case .scored = m.stage { return true }; return false }
        XCTAssertTrue(ok)
        if case .scored(_, _, let pct) = m.stage { XCTAssertEqual(pct, 100) }
        XCTAssertTrue(m.nextVisible)
        m.next()
        let ok2 = await eventually { m.stage == .noHear }
        XCTAssertTrue(ok2)
        XCTAssertTrue(m.nextVisible, "a recogniser error shows Next, no score counted")
        for _ in 0..<60 { m.tick() }
        guard case .finished(let s) = m.stage else { return XCTFail("time is up ⇒ the summary") }
        XCTAssertEqual(s.n, 1); XCTAssertEqual(s.p, 100)
        let xp = await eventually { JSON.orZero(await data.load().game["xp"]) == 7 }
        XCTAssertTrue(xp, "reward xp 5 + 2·1")
        // leaving ends every late callback
        let m2 = ReflexModel(ctx: c, io: io, items: items, live: false)
        m2.start(); m2.leave()
        XCTAssertEqual(m2.history.count, 0)
        // nothing to practise: no start
        let empty = ReflexModel(ctx: c, io: io, items: [], live: false)
        empty.start()
        XCTAssertTrue(empty.isEmpty); XCTAssertFalse(empty.running)
    }

    // MARK: #/handsfree
    @MainActor final class Rec: HandsfreeDevice, HandsfreeNowPlaying {
        var screenOff = false
        var tracks: [HFTrack] = [], spoken: [String] = []
        var limit = 14, count = 0, cancels = 0, awake = false, cleared = false
        var handler: ((HFRemote) -> Void)?
        var published: [String] = []
        func play(_ t: HFTrack, finished: @escaping () -> Void) { tracks.append(t); step(finished) }
        func speak(_ text: String, lang: String, rate: Double, finished: @escaping () -> Void) { spoken.append(text); step(finished) }
        private func step(_ f: @escaping () -> Void) { count += 1; if count < limit { f() } }
        func cancel() { cancels += 1 }
        func keepAwake(_ on: Bool) { awake = on }
        func publish(title: String, artist: String, album: String, playing: Bool) { published.append(title) }
        func bind(_ h: @escaping (HFRemote) -> Void) { handler = h }
        func clear() { cleared = true; handler = nil }
    }
    func words() -> [JSON] {
        [.obj([("word", "alpha"), ("vi", "chữ cái đầu"), ("ex", "Alpha is the first letter.")]), .obj([("word", "beta"), ("vi", "chữ cái thứ hai"), ("ex", "Beta is the second.")])]
    }
    func hfModel(_ c: SkillsContext, _ d: Rec, clip: @escaping (String) -> Bool = { _ in false }) -> HandsfreeModel {
        HandsfreeModel(ctx: c, queue: HandsfreeCore.Queue(title: SayMsg(.speakHfTuDenHanOn), words: words()), device: d, nowPlaying: d, meaningLang: { _ in "vi-VN" }, clip: clip, sleep: { _ in })
    }

    func testParityP07HandsfreeModel() async throws {
        let (c, data) = ctx("hf", settings: .object([:]))
        // screen off: no speech, no timer – only audio, chained on `ended`
        let off = Rec(); off.screenOff = true
        let m = hfModel(c, off, clip: { $0 == "alpha" })
        m.start(); m.setPlay(true)
        XCTAssertTrue(m.playing); XCTAssertTrue(off.awake)
        XCTAssertTrue(off.spoken.isEmpty, "no speech synthesis with the screen off")
        XCTAssertEqual(off.tracks.count, 14)
        XCTAssertTrue(m.log.allSatisfy { if case .audio = $0 { return true }; return false }, "no timer, no speech")
        XCTAssertTrue(off.tracks.contains(.silence))
        // screen on: the waits are timers (instant here), meanings and examples are spoken
        let on = Rec()
        let m2 = hfModel(c, on)
        m2.start(); m2.setPlay(true)
        let seen = await eventually { m2.log.contains(.wait(2200)) && on.spoken.contains("Alpha is the first letter.") }
        XCTAssertTrue(seen)
        XCTAssertTrue(m2.log.contains(.wait(900)))
        XCTAssertTrue(on.spoken.contains("chữ cái đầu"))
        XCTAssertFalse(on.tracks.contains(.silence))
        m2.leave()
        // lock-screen / headset: the six actions
        XCTAssertEqual(HFRemote.allCases.count, 6)
        let d3 = Rec(); d3.limit = 0
        let m3 = hfModel(c, d3)
        m3.start()
        XCTAssertNotNil(d3.handler)
        d3.handler?(.nextTrack); XCTAssertEqual(m3.index, 1)
        d3.handler?(.seekForward); XCTAssertEqual(m3.index, 0, "seek forward = next (wraps)")
        d3.handler?(.previousTrack); XCTAssertEqual(m3.index, 1)
        d3.handler?(.seekBackward); XCTAssertEqual(m3.index, 0)
        d3.handler?(.play); XCTAssertTrue(m3.playing)
        d3.handler?(.pause); XCTAssertFalse(m3.playing); XCTAssertFalse(d3.awake)
        XCTAssertTrue(d3.published.contains("alpha"))
        // the two switches are saved in settings.hf
        m3.setEx(false)
        let saved = await eventually { await data.load().settings["hf"]?["ex"] == JSON.bool(false) }
        XCTAssertTrue(saved)
        let hf = await data.load().settings["hf"]
        XCTAssertEqual(hf?["gap"]?.double, 900)
        // leaving clears the controls and stops the sound
        m3.leave()
        XCTAssertTrue(d3.cleared); XCTAssertFalse(d3.awake); XCTAssertGreaterThan(d3.cancels, 0)
        // nothing to play
        let e = HandsfreeModel(ctx: c, queue: HandsfreeCore.Queue(title: SayMsg(.speakHfTuDenHanOn), words: []), device: Rec(), nowPlaying: Rec(), meaningLang: { _ in "en-GB" })
        XCTAssertTrue(e.isEmpty); e.setPlay(true); XCTAssertTrue(e.log.isEmpty)
    }
}
