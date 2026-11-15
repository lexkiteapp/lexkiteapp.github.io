import Foundation
import LKSync
import LKCore
import LKStrings

/// M4 P07 – #/handsfree (web/js/handsfree.js): which words, the options, and the playback chain as a state machine. The machine never sleeps, plays or speaks:
/// it answers every event with the NEXT thing the platform must do (an `HFEffect`), and `hidden` (screen off) is an input of every call – with the screen off it
/// never asks for speech or a timer, only for audio (a 1 s silent track fills the gaps) and advances at once on `ended`. Verified against vectors `handsfree.*`.
public enum HFTrack: Equatable, Sendable {
    /// the Kokoro clip of this text
    case clip(String)
    /// a dictionary audio URL kept on the card
    case url(String)
    /// the 1 s silent WAV that keeps the playback session alive
    case silence
}
public enum HFEffect: Equatable, Sendable {
    case audio(HFTrack)
    /// a timer (screen on only)
    case wait(Int)
    /// system speech: text, BCP-47 language, rate (0.95)
    case speak(String, lang: String, rate: Double)
}

public enum HandsfreeCore {
    public static let defaultGap = 900, thinkMs = 2200, listMax = 60, speechRate = 0.95, silenceSeconds = 1.0, silenceRate = 8000
    public static let dayMs: Int64 = 86_400_000
    /// web LANG: the voice language of a meaning in each UI language
    public static let langs: [String: String] = ["vi": "vi-VN", "en": "en-GB", "zh": "zh-CN", "ja": "ja-JP", "ko": "ko-KR", "es": "es-ES", "pt": "pt-BR", "fr": "fr-FR",
                                                  "de": "de-DE", "id": "id-ID", "th": "th-TH", "hi": "hi-IN", "ar": "ar-SA", "ru": "ru-RU", "tr": "tr-TR"]

    // MARK: options (settings.hf)
    /// `Object.assign({ex:true, mean:true, gap:900}, settings.hf)`
    public static func options(_ hf: JSON?) -> JSON {
        var o: [String: JSON] = ["ex": .bool(true), "mean": .bool(true), "gap": .number(Double(defaultGap))]
        for (k, v) in hf?.object ?? [:] { o[k] = v }
        return .object(o)
    }

    // MARK: which words
    public struct Topic: Sendable { public var id: String, name: String, words: [JSON]; public init(id: String, name: String, words: [JSON]) { self.id = id; self.name = name; self.words = words } }
    public struct Queue: Sendable {
        public var title: SayMsg, words: [JSON]
        public init(title: SayMsg, words: [JSON]) { self.title = title; self.words = words }
    }
    /// session queue → topic → due ≤ 24 h (≤ 60) → the learner's book (≤ 60) → topic ngsl1
    public static func queue(arg: String?, cards: [JSON], topics: [Topic], session: [String]?, now: Int64) -> Queue {
        if arg == "session", let q = session, !q.isEmpty {
            let byKey = Dictionary(cards.map { (Vocab.cardKey($0), $0) }, uniquingKeysWith: { a, _ in a })
            let words = q.compactMap { byKey[$0] }
            if !words.isEmpty { return Queue(title: SayMsg(.speakHfPhienOnTapN, ["n": String(words.count)]), words: words) }
        }
        if let arg, !arg.isEmpty, let tp = topics.first(where: { $0.id == arg }) { return Queue(title: SayMsg(raw: tp.name), words: tp.words) }
        let due = Vocab.stableSorted(cards.filter { c in
            let s = Vocab.srs(c)
            return c["srs"] != nil && (s.reps > 0 || s.last != nil) && s.due <= now + dayMs
        }) { Vocab.srs($0).due < Vocab.srs($1).due }
        if !due.isEmpty { return Queue(title: SayMsg(.speakHfTuDenHanOn), words: Array(due.prefix(listMax))) }
        if !cards.isEmpty {
            let book = Vocab.stableSorted(cards) { JSON.orZero($0["added"]) > JSON.orZero($1["added"]) }
            return Queue(title: SayMsg(.vocabYourWords), words: Array(book.prefix(listMax)))
        }
        let tp = topics.first { $0.id == "ngsl1" }
        return Queue(title: SayMsg(raw: tp?.name ?? "Lexkite"), words: Array((tp?.words ?? []).prefix(listMax)))
    }

    /// the lock-screen / headset metadata: title = word, artist = "<ipa> · <meaning>" (missing parts dropped), album = "Lexkite · <list>"
    public static func nowPlaying(_ w: JSON, meaning: String, list: String) -> (title: String, artist: String, album: String) {
        (w.s("word"), [w.s("ipa"), meaning].filter { !$0.isEmpty }.joined(separator: " · "), "Lexkite · " + list)
    }
}

/// The playback chain. `cont` = what to do when the effect in flight finishes.
public final class HandsfreeMachine {
    public let words: [JSON]
    public private(set) var index = 0, step = 0, playing = false
    public var options: JSON
    private let clip: (String) -> Bool
    private let meaning: (JSON) -> String
    private let meaningLang: (JSON) -> String
    private let accent: () -> String
    /// the card was drawn (word, ipa, meaning, example, position; MediaSession metadata)
    public var onDraw: (Int) -> Void = { _ in }
    private enum Cont { case none, advance, run, think }
    private var cont = Cont.none

    public init(words: [JSON], options: JSON, clip: @escaping (String) -> Bool, meaning: @escaping (JSON) -> String, meaningLang: @escaping (JSON) -> String, accent: @escaping () -> String) {
        self.words = words; self.options = options; self.clip = clip; self.meaning = meaning; self.meaningLang = meaningLang; self.accent = accent
    }
    public var word: JSON { words.isEmpty ? .null : words[index] }
    public var position: String { words.isEmpty ? "" : "\(index + 1)/\(words.count)" }
    var gap: Int { let g = JSON.orZero(options["gap"]); return g.isFinite ? Int(g) : HandsfreeCore.defaultGap }
    var optEx: Bool { options["ex"]?.truthy == true }
    var optMean: Bool { options["mean"]?.truthy == true }

    /// card audio kept on the card: en-US ⇒ audioUS || audio, otherwise audio || audioUS
    func wordAudio(_ w: JSON) -> HFTrack? {
        if clip(w.s("word")) { return .clip(w.s("word")) }
        let a = w.s("audio"), u = w.s("audioUS")
        let pick = accent() == "en-US" ? (u.isEmpty ? a : u) : (a.isEmpty ? u : a)
        return pick.isEmpty ? nil : .url(pick)
    }
    private func tts(_ text: String, _ lang: String, hidden: Bool) -> HFEffect? {
        let t = VoiceCore.ttsClean(text)
        return t.isEmpty || hidden ? nil : .speak(t, lang: lang, rate: HandsfreeCore.speechRate)
    }

    // MARK: events
    /// play / pause. The effect to perform now (nil when paused or nothing to do).
    public func setPlay(_ on: Bool, hidden: Bool) -> HFEffect? {
        playing = on; cont = .none
        return on ? run(hidden) : nil
    }
    /// the effect in flight finished: audio `ended` / `error`, the timer fired, speech ended
    public func done(hidden: Bool) -> HFEffect? {
        guard playing else { return nil }
        let c = cont; cont = .none
        switch c {
        case .advance: return advance(hidden)
        case .run: return run(hidden)
        case .think:
            if optMean, !hidden, !words.isEmpty, case let m = meaning(word), !m.isEmpty, let e = tts(m, meaningLang(word), hidden: hidden) { cont = .advance; return e }
            return advance(hidden)
        case .none: return nil
        }
    }
    public func next(hidden: Bool) -> HFEffect? {
        guard !words.isEmpty else { return nil }
        index = (index + 1) % words.count; step = 0; cont = .none; onDraw(index)
        return playing ? run(hidden) : nil
    }
    public func previous(hidden: Bool) -> HFEffect? {
        guard !words.isEmpty else { return nil }
        index = (index - 1 + words.count) % words.count; step = 0; cont = .none; onDraw(index)
        return playing ? run(hidden) : nil
    }
    public func setOption(_ key: String, _ on: Bool) { options[key] = .bool(on) }

    // MARK: chain
    private func advance(_ hidden: Bool) -> HFEffect? {
        guard playing else { return nil }
        if hidden { return run(hidden) }
        cont = .run
        return .wait(gap)
    }
    private func run(_ hidden: Bool) -> HFEffect? {
        guard playing, !words.isEmpty else { return nil }
        let w = words[index]
        switch step {
        case 0:
            onDraw(index); step = 1
            cont = .advance
            if let u = wordAudio(w) { return .audio(u) }
            if hidden { return .audio(.silence) }
            if let e = tts(w.s("word"), accent(), hidden: hidden) { return e }
            return advance(hidden)
        case 1:
            step = 2
            if hidden { cont = .advance; return .audio(.silence) }
            cont = .think
            return .wait(HandsfreeCore.thinkMs)
        case 2:
            step = 3
            let ex = w.s("ex")
            if optEx && !ex.isEmpty {
                if clip(ex) { cont = .advance; return .audio(.clip(ex)) }
                if !hidden, let e = tts(ex, accent(), hidden: hidden) { cont = .advance; return e }
            }
            return advance(hidden)
        default:
            index = (index + 1) % words.count; step = 0
            return run(hidden)
        }
    }
}

public extension HandsfreeCore {
    /// The 1 s silent WAV (8000 Hz, 8-bit, mono) that keeps the playback session alive with the screen off: 44-byte header + `rate · seconds` bytes of 128.
    static func silenceWAV() -> Data {
        let rate = silenceRate, samples = Int(Double(rate) * silenceSeconds)
        var d = Data()
        func s(_ t: String) { d.append(contentsOf: Array(t.utf8)) }
        func w32(_ n: Int) { d.append(contentsOf: [UInt8(n & 255), UInt8((n >> 8) & 255), UInt8((n >> 16) & 255), UInt8((n >> 24) & 255)]) }
        func w16(_ n: Int) { d.append(contentsOf: [UInt8(n & 255), UInt8((n >> 8) & 255)]) }
        s("RIFF"); w32(36 + samples); s("WAVE"); s("fmt "); w32(16); w16(1); w16(1); w32(rate); w32(rate); w16(1); w16(8); s("data"); w32(samples)
        d.append(Data(repeating: 128, count: samples))
        return d
    }
}
