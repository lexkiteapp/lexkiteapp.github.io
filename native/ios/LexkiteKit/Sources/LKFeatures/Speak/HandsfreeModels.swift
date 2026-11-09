import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

/// #/handsfree: the model drives `HandsfreeMachine` with a device. Every effect of the machine is started here and, when it ends, answered with `done`;
/// the 900 / 2200 ms waits are timers (`wait`), only ever asked for with the screen on. A generation counter drops late callbacks after pause / skip / leave.
@MainActor @Observable
final class HandsfreeModel {
    let ctx: SkillsContext
    let title: SayMsg
    let machine: HandsfreeMachine
    private let device: HandsfreeDevice
    private let nowPlaying: HandsfreeNowPlaying
    private(set) var playing = false
    private(set) var index = 0
    var ambient = false
    /// the soundwave moves (off in fixtures)
    var animate = true
    private(set) var ex: Bool
    private(set) var mean: Bool
    private var gen = 0
    private var waitTask: Task<Void, Never>?
    /// the effects started, in order (tests read it; the web has no such log)
    private(set) var log: [HFEffect] = []
    private let sleepNs: (Int) async -> Void
    private let l10n: L10n

    init(ctx: SkillsContext, queue: HandsfreeCore.Queue, device: HandsfreeDevice, nowPlaying: HandsfreeNowPlaying, meaningLang: @escaping (JSON) -> String,
         clip: @escaping (String) -> Bool = { _ in true }, sleep: @escaping (Int) async -> Void = { ms in try? await Task.sleep(nanoseconds: UInt64(ms) * 1_000_000) }) {
        self.ctx = ctx; l10n = L10n(lang: ctx.lang); title = queue.title; self.device = device; self.nowPlaying = nowPlaying; sleepNs = sleep
        let opts = HandsfreeCore.options(ctx.settings["hf"])
        ex = opts["ex"]?.truthy == true; mean = opts["mean"]?.truthy == true
        machine = HandsfreeMachine(words: queue.words.filter { !$0.s("word").isEmpty }, options: opts, clip: clip, meaning: { Vocab.meanOf($0) }, meaningLang: meaningLang,
                                   accent: { SpeakAccent.locale(ctx.settings) })
        machine.onDraw = { [weak self] i in self?.drew(i) }
    }

    /// the words of the app: due cards → book → NGSL 1 (`WordCatalogRemote`), or the topic of the route
    static func make(ctx: SkillsContext, arg: String?, voice: LKVoicePlayer) async -> HandsfreeModel {
        await ctx.reload()
        let cat = await WordCatalogRemote.shared.catalog()
        let topics = cat.topics.map { HandsfreeCore.Topic(id: $0.id, name: $0.name, words: $0.words) }
        let q = HandsfreeCore.queue(arg: arg, cards: ctx.bundle.cards, topics: topics, session: nil, now: ctx.now)
        #if os(iOS)
        let live = LiveHandsfreeDevice(voice: voice, accent: { SpeakAccent.locale(ctx.settings) })
        let device: HandsfreeDevice = live, np: HandsfreeNowPlaying = live
        #else
        let silent = SilentHandsfreeDevice()
        let device: HandsfreeDevice = silent, np: HandsfreeNowPlaying = silent
        #endif
        return HandsfreeModel(ctx: ctx, queue: q, device: device, nowPlaying: np, meaningLang: { c in
            // the meaning shown is `vi || def` (Vocab.meanOf): Vietnamese when the card has it, else the English definition
            c.s("vi").isEmpty ? SpeakAccentLang.english : (HandsfreeCore.langs["vi"] ?? SpeakAccentLang.english)
        })
    }
    static func fixture(ctx: SkillsContext, words: [JSON], title: SayMsg, playing: Bool = false, ambient: Bool = false, index: Int = 0) -> HandsfreeModel {
        let d = SilentHandsfreeDevice()
        let m = HandsfreeModel(ctx: ctx, queue: HandsfreeCore.Queue(title: title, words: words), device: d, nowPlaying: d, meaningLang: { _ in SpeakAccentLang.english })
        m.index = index; m.playing = playing; m.ambient = ambient; m.animate = false
        return m
    }

    // MARK: derived
    var words: [JSON] { machine.words }
    var isEmpty: Bool { machine.words.isEmpty }
    var word: JSON { machine.words.isEmpty ? .null : machine.words[min(index, machine.words.count - 1)] }
    var position: String { machine.words.isEmpty ? "" : "\(index + 1)/\(machine.words.count)" }
    var progress: Double { machine.words.isEmpty ? 0 : Double(index + 1) / Double(machine.words.count) }
    var meaning: String { Vocab.meanOf(word) }

    // MARK: control
    func start() {
        guard !isEmpty else { return }
        nowPlaying.bind { [weak self] r in self?.remote(r) }
        drew(machine.index)
    }
    func toggle() { setPlay(!playing) }
    func setPlay(_ on: Bool) {
        cancelStep()
        playing = on; device.keepAwake(on)
        publish()
        go(machine.setPlay(on, hidden: device.screenOff))
    }
    func next() { cancelStep(); go(machine.next(hidden: device.screenOff)) }
    func previous() { cancelStep(); go(machine.previous(hidden: device.screenOff)) }
    func setEx(_ on: Bool) { ex = on; machine.setOption("ex", on); Task { await ctx.setSetting("hf", machine.options) } }
    func setMean(_ on: Bool) { mean = on; machine.setOption("mean", on); Task { await ctx.setSetting("hf", machine.options) } }
    /// leaving: audio and speech stop, the lock-screen controls and metadata go, the screen may lock again
    func leave() { cancelStep(); playing = false; _ = machine.setPlay(false, hidden: false); device.keepAwake(false); nowPlaying.clear() }

    func remote(_ r: HFRemote) {
        switch r {
        case .play: setPlay(true)
        case .pause: setPlay(false)
        case .nextTrack, .seekForward: next()
        case .previousTrack, .seekBackward: previous()
        }
    }

    // MARK: chain
    private func cancelStep() { gen += 1; waitTask?.cancel(); waitTask = nil; device.cancel() }
    private func drew(_ i: Int) {
        index = i
        guard !machine.words.isEmpty else { return }
        let n = HandsfreeCore.nowPlaying(machine.words[i], meaning: Vocab.meanOf(machine.words[i]), list: title.text(l10n))
        nowPlaying.publish(title: n.title, artist: n.artist, album: n.album, playing: playing)
    }
    private func publish() { drew(machine.index) }
    private func go(_ e: HFEffect?) {
        guard let e else { return }
        log.append(e)
        let my = gen
        let finished: () -> Void = { [weak self] in
            guard let self, self.gen == my else { return }
            self.go(self.machine.done(hidden: self.device.screenOff))
        }
        switch e {
        case .audio(let t): device.play(t, finished: finished)
        case .speak(let text, let lang, let rate): device.speak(text, lang: lang, rate: rate, finished: finished)
        case .wait(let ms): waitTask = Task { [sleepNs] in await sleepNs(ms); if !Task.isCancelled { finished() } }
        }
    }
}

/// the English voice language (web: `en-GB`)
enum SpeakAccentLang { static let english = "en-GB" }
