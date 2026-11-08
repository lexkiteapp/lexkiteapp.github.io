import Foundation
import AVFoundation
import LKCore
import LKDesign

/// C04 – the one voice channel of the app: Kokoro files from the CDN (Ama = af_heart, Carlos = am_michael) with disk cache and origin failover,
/// the system voice (right gender) as the last resort. It is also the clock of the teacher's lip sync (`TeacherSpeechSource`).
/// Playback category is `.playback` (a learning app must be audible with the silent switch on; other apps' audio is ducked).
/// Call from the main thread; completions run on the main thread.
public final class LKVoicePlayer: NSObject, TeacherSpeechSource, AVAudioPlayerDelegate, AVSpeechSynthesizerDelegate, @unchecked Sendable {
    public let resolver: VoiceResolver
    /// web SENT_GAP: pause between sentences (ms) at normal speed
    public static let sentenceGap: Double = 280
    /// Slow playback rate of files (web: teacher rate < 0.9 → 0.75×); the system voice uses the same factor.
    public static let slowRate: Float = 0.75
    /// Metering threshold (dB) above which the file counts as "voiced" for the live lip cursor.
    static let voicedDB: Float = -40

    private var player: AVAudioPlayer?
    private let synth = AVSpeechSynthesizer()
    private var token = 0
    private var piece: CheckedContinuation<Void, Never>?
    private var ttsAt: Date?
    private var ttsSpeaking = false
    /// Teacher whose mouth follows what is spoken (nil = audio only).
    public weak var teacher: TeacherController?
    public private(set) var lastSource = "" // "cache" | "cdn" | "system" – for diagnostics / tests

    public init(resolver: VoiceResolver = VoiceResolver()) {
        self.resolver = resolver
        super.init()
        synth.delegate = self
    }

    // MARK: TeacherSpeechSource
    public var time: Double {
        if let p = player { return max(0, p.currentTime - Self.outputLatency) }
        if let t = ttsAt { return max(0, Date().timeIntervalSince(t)) }
        return 0
    }
    public var isPlaying: Bool { player?.isPlaying ?? ttsSpeaking }
    public var isVoiced: Bool {
        guard let p = player else { return ttsSpeaking }
        p.updateMeters()
        return p.averagePower(forChannel: 0) > Self.voicedDB
    }
    static var outputLatency: Double {
        #if os(iOS)
        return AVAudioSession.sharedInstance().outputLatency
        #else
        return 0
        #endif
    }

    // MARK: API
    /// A sentence / line spoken by a teacher (`who` = ama | carlos). `slow` = the turtle button.
    @MainActor public func speak(_ text: String, who: String, accent: String = "en-US", slow: Bool = false, onEnd: (() -> Void)? = nil) {
        let clean = VoiceCore.ttsClean(text)
        run(text: clean, who: who, accent: accent, slow: slow, onEnd: onEnd) { [resolver] t, voice in
            await resolver.fetch(kind: .sentence, key: VoiceCore.lineKey(voice: voice, text: t))
        }
    }
    /// A dictionary headword (exact casing); no file → system voice.
    @MainActor public func speakWord(_ word: String, who: String = "ama", accent: String = "en-US", slow: Bool = false, onEnd: (() -> Void)? = nil) {
        let w = VoiceCore.ttsClean(word)
        run(text: w, who: who, accent: accent, slow: slow, onEnd: onEnd, perSentence: false) { [resolver] t, _ in
            await resolver.fetch(kind: .word, key: VoiceCore.wordKey(voice: VoiceCore.wordVoice(accent: accent), headword: t))
        }
    }
    @MainActor public func stop() {
        token += 1
        endPiece(); teacher?.quiet()
        player?.stop(); player = nil
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
        ttsSpeaking = false; ttsAt = nil
    }
    /// The Kokoro voice id of a teacher (rig.json people.<who>.voice).
    public static func voiceID(_ who: String) -> String { TeacherRigStore.shared.def.people[who]?.voice ?? (VoiceCore.genderFor(who) == "m" ? "am_michael" : "af_heart") }

    // MARK: flow
    @MainActor private func run(text: String, who: String, accent: String, slow: Bool, onEnd: (() -> Void)?, perSentence: Bool = true,
                     fetch: @escaping (String, String) async -> VoiceResolver.Hit?) {
        stop()
        guard !text.isEmpty else { onEnd?(); return }
        let my = token
        let voice = Self.voiceID(who)
        configureSession()
        Task { @MainActor [weak self] in
            guard let self else { return }
            func alive() -> Bool { self.token == my }
            if let hit = await fetch(text, voice) {
                guard alive() else { return }
                if await self.playData(hit, text: text, slow: slow, my: my) == false { await self.say(text, who: who, accent: accent, slow: slow, my: my) }
            } else {
                guard alive() else { return }
                let segs = perSentence ? VoiceCore.split(text) : [text]
                if segs.count > 1 {
                    for (i, s) in segs.enumerated() {
                        guard alive() else { return }
                        if let hit = await fetch(s, voice), await self.playData(hit, text: s, slow: slow, my: my) { /* played */ }
                        else { guard alive() else { return }; await self.say(s, who: who, accent: accent, slow: slow, my: my) }
                        if i < segs.count - 1 { try? await Task.sleep(nanoseconds: UInt64(Self.sentenceGap / Double(slow ? Self.slowRate : 1) * 1_000_000)) }
                    }
                } else { await self.say(text, who: who, accent: accent, slow: slow, my: my) }
            }
            guard alive() else { return }
            self.teacher?.quiet()
            self.player = nil; self.ttsAt = nil
            onEnd?()
        }
    }

    /// Plays mp3 bytes to the end. false = the bytes could not be played (caller falls back).
    @MainActor private func playData(_ hit: VoiceResolver.Hit, text: String, slow: Bool, my: Int) async -> Bool {
        guard let p = try? AVAudioPlayer(data: hit.data) else { return false }
        p.delegate = self; p.enableRate = true; p.isMeteringEnabled = true
        p.rate = slow ? Self.slowRate : 1
        guard p.prepareToPlay() else { return false }
        player = p; lastSource = hit.cached ? "cache" : "cdn"
        teacher?.speak(text: text, duration: p.duration / Double(p.rate), source: self)
        guard p.play() else { player = nil; return false }
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in piece = c }
        return true
    }

    /// System voice, gender-correct (Ama female / Carlos male).
    @MainActor private func say(_ text: String, who: String, accent: String, slow: Bool, my: Int) async {
        guard token == my else { return }
        let u = AVSpeechUtterance(string: text)
        u.voice = Self.systemVoice(who: who, accent: accent)
        u.rate = AVSpeechUtteranceDefaultSpeechRate * (slow ? Self.slowRate : 1)
        lastSource = "system"; ttsSpeaking = true; ttsAt = Date(); player = nil
        teacher?.speak(text: text, duration: nil, source: self)
        synth.speak(u)
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in piece = c }
        ttsSpeaking = false
    }

    /// Name the system voice is ranked under: "Samantha (Premium)" – the quality tags feed `VoiceCore.voiceScore`.
    static func displayName(_ v: AVSpeechSynthesisVoice) -> String {
        v.name + (v.quality == .premium ? " (Premium)" : v.quality == .enhanced ? " (Enhanced)" : "")
    }
    static func systemVoice(who: String, accent: String) -> AVSpeechSynthesisVoice? {
        var by: [String: AVSpeechSynthesisVoice] = [:]
        let list = AVSpeechSynthesisVoice.speechVoices().map { v -> VoiceCore.SystemVoice in
            let n = displayName(v); by[n] = v
            return VoiceCore.SystemVoice(name: n, lang: v.language)
        }
        if let pick = VoiceCore.pickVoice(list, accent: accent, gender: VoiceCore.genderFor(who)), let v = by[pick.name] { return v }
        return AVSpeechSynthesisVoice(language: accent)
    }

    private func endPiece() { let c = piece; piece = nil; c?.resume() }
    private func configureSession() {
        #if os(iOS)
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? s.setActive(true)
        #endif
    }

    // MARK: delegates
    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) { endPiece() }
    public func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) { endPiece() }
    public func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) { endPiece() }
    public func speechSynthesizer(_ s: AVSpeechSynthesizer, didCancel u: AVSpeechUtterance) { endPiece() }
}
