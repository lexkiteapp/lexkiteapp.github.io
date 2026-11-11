import Foundation
import LKSync
import LKCore
import LKStrings

public enum ListenClipResult: Equatable, Sendable {
    case ended
    /// the clip could not be played; `played` = it had already started (then it is no strike against the CDN)
    case failed(played: Bool)
    /// the system refused to start sound without a tap (iOS)
    case blocked
}

/// The sound and the clock under `ListenPlayer`. The app implements it with AVAudioPlayer / AVSpeechSynthesizer (LKFeatures/Skills/ListenAudio.swift),
/// the vector test with a recorder. All calls return when the thing is done; `stop()` must make a pending call return at once.
@MainActor
public protocol ListenIO: AnyObject {
    var canSpeak: Bool { get }
    /// play the mp3 of `key`; `onPlaying` when sound really starts
    func clip(_ key: String, rate: Double, onPlaying: @escaping () -> Void) async -> ListenClipResult
    func preload(_ key: String)
    /// speak the pieces one after the other with the cast voice; `onStart` when the first one starts
    func speak(_ pieces: [String], voice: CastVoice, rate: Double, onStart: @escaping () -> Void) async
    func wait(ms: Int) async
    func stop()
}

/// web `Player` (listening.js:56): plays the lines of a part in order – clip when the CDN has one, else the cast device voice –
/// with the pauses, the gaps, rewinding and the fallbacks. Event order, waits and rates are verified by vectors `listen.player`.
@MainActor
public final class ListenPlayer {
    public struct Config {
        /// settings.hqVoice !== false
        public var hqEnabled = true
        /// the clips that exist (nil = unknown: try every line, an error falls back to the device voice)
        public var clipKeys: Set<String>?
        public var rate: () -> Double = { ListenRules.defaultRate }
        public var skipNarrator = false
        public init(hqEnabled: Bool = true, clipKeys: Set<String>? = nil, rate: @escaping () -> Double = { ListenRules.defaultRate }, skipNarrator: Bool = false) {
            self.hqEnabled = hqEnabled; self.clipKeys = clipKeys; self.rate = rate; self.skipNarrator = skipNarrator
        }
    }
    struct Line { var i: Int, say: String?, pause: Double?, s: String, t: String? }

    public var onLine: (Int) -> Void = { _ in }
    public var onState: (Bool) -> Void = { _ in }
    public var onEnd: () -> Void = {}
    public var onSound: () -> Void = {}
    /// nil → the toast "Chạm ▶ để nghe"
    public var onBlocked: (() -> Void)?
    public var onToast: (L10nKey) -> Void = { _ in }

    public private(set) var pos = 0, playing = false
    /// a run is in progress (a held clip counts)
    public private(set) var running = false
    public let cast: [String: CastVoice]
    private let kv: [String: String], q: [Line], io: ListenIO, config: Config
    private var seq = 0, audioDown = 0, heard = false
    private var task: Task<Void, Never>?

    public init(_ part: JSON, cast: [String: CastVoice], io: ListenIO, config: Config = Config()) {
        self.cast = cast; self.io = io; self.config = config; kv = KVoice.voices(part)
        q = part.list("script").enumerated().map { Line(i: $0.offset, say: $0.element.t("say") ? $0.element.s("say") : nil, pause: $0.element["pause"]?.double, s: $0.element.s("s"), t: $0.element.t("t") ? $0.element.s("t") : nil) }
    }

    private var hqOn: Bool { config.hqEnabled && (config.clipKeys.map { !$0.isEmpty } ?? true) && audioDown < 3 }
    private func hqKey(_ l: Line) -> String? {
        guard hqOn else { return nil }
        let k = VoiceCore.lineKey(voice: l.say != nil ? KVoice.narrator : (kv[l.s] ?? KVoice.narrator), text: l.say ?? l.t ?? "")
        return config.clipKeys.map { $0.contains(k) } ?? true ? k : nil
    }
    private func stopNow() { seq += 1; task?.cancel(); io.stop() }
    private func sound() { if !heard { heard = true; onSound() } }
    private func start() {
        seq += 1; let my = seq
        running = true
        task = Task { @MainActor [weak self] in await self?.run(my); if self?.seq == my { self?.running = false } }
    }

    /// `from` = a script line index (a line that does not exist → the start)
    public func play(from: Int? = nil) {
        let anyClip = config.clipKeys.map { !$0.isEmpty } ?? true
        if !io.canSpeak && !anyClip { onToast(.skillListenTrinhDuyetKhongHo); return }
        stopNow()
        if let from { pos = max(0, q.firstIndex { $0.i == from } ?? -1) }
        playing = true; onState(true); start()
    }
    public func pause() { stopNow(); running = false; playing = false; onState(false) }
    public func stop() { stopNow(); running = false; playing = false; pos = 0; onState(false) }
    /// back to the previous spoken line (pauses and narrator lines are skipped, never below 0); restarts when playing, else only highlights
    public func back() {
        let was = playing
        stopNow()
        var k = pos - 1
        while k > 0 && (q[k].pause != nil || q[k].say != nil) { k -= 1 }
        pos = max(0, k)
        if was { playing = true; start() } else { running = false; onLine(q[pos].i) }
    }

    private func blockedAt() { playing = false; running = false; onState(false); if let onBlocked { onBlocked() } else { onToast(ListenRules.toastBlocked) } }

    private func run(_ my: Int) async {
        while my == seq {
            if pos >= q.count { playing = false; running = false; onLine(-1); onEnd(); return }
            let l = q[pos]
            onLine(l.i)
            if let p = l.pause {
                await io.wait(ms: Int(min(ListenRules.pauseCapSeconds, p) * 1000))
                guard my == seq else { return }
                pos += 1; continue
            }
            if l.say != nil && config.skipNarrator { pos += 1; continue }
            var done = false
            if let key = hqKey(l) {
                if let nx = q[(pos + 1)...].first(where: { $0.t != nil || $0.say != nil }), let nk = hqKey(nx) { io.preload(nk) }
                let rate = l.say != nil ? 1 : min(ListenRules.clipRateMax, max(ListenRules.clipRateMin, config.rate() / ListenRules.defaultRate))
                let r = await io.clip(key, rate: rate) { [weak self] in self?.audioDown = 0; self?.sound() }
                guard my == seq else { return }
                switch r {
                case .ended: done = true
                case .blocked: blockedAt(); return
                case .failed(let played): if !played { audioDown += 1 }
                }
            }
            if !done {
                if io.canSpeak {
                    let c = l.say != nil ? cast["_narrator"] : (cast[l.s] ?? cast["_narrator"])
                    await io.speak(VoiceCore.split(l.say ?? l.t ?? ""), voice: c ?? CastVoice(voice: nil, lang: "en-GB", pitch: 1), rate: l.say != nil ? ListenRules.narratorRate : config.rate()) { [weak self] in self?.sound() }
                    guard my == seq else { return }
                    await io.wait(ms: l.say != nil ? ListenRules.narratorGapMs : ListenRules.lineGapMs)
                } else {
                    await io.wait(ms: ListenRules.noSpeechGapMs)
                }
            } else {
                await io.wait(ms: l.say != nil ? ListenRules.narratorGapMs : ListenRules.lineGapMs)
            }
            guard my == seq else { return }
            pos += 1
        }
    }

    /// One line on its own (the dictation's 🔊 and 🐢): the speaker's clip at normal speed (0.7 slow, pitch kept), else the cast voice at the learner's rate (0.7 slow).
    /// `onEnd` fires when the line has been heard (not when it was stopped).
    public func say(line i: Int, slow: Bool) {
        guard let l = q.first(where: { $0.i == i }), let text = l.t else { return }
        stopNow(); running = true
        seq += 1; let my = seq
        task = Task { @MainActor [weak self] in
            guard let self else { return }
            var heard = false
            if let key = self.hqKey(l) {
                let r = await self.io.clip(key, rate: slow ? ListenRules.slowRate : 1) { [weak self] in self?.audioDown = 0 }
                guard my == self.seq else { return }
                switch r {
                case .ended: heard = true
                case .blocked: self.running = false; return
                case .failed(let played): if !played { self.audioDown += 1 }
                }
            }
            if !heard && self.io.canSpeak {
                await self.io.speak(VoiceCore.split(text), voice: self.cast[l.s] ?? self.cast["_narrator"] ?? CastVoice(voice: nil, lang: "en-GB", pitch: 1),
                                    rate: slow ? ListenRules.slowRate : self.config.rate()) {}
                guard my == self.seq else { return }
            }
            self.running = false
            self.onEnd()
        }
    }
}
