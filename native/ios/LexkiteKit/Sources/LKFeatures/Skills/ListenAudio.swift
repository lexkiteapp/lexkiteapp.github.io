import Foundation
import AVFoundation
import LKCore
import LKStore

/// The sound under `ListenPlayer` on the device: the Kokoro clip of a line from the CDN (`VoiceResolver`: disk cache, origin failover) played with AVAudioPlayer at the wanted rate
/// (pitch kept), else the cast system voice (AVSpeechSynthesizer: voice, pitch, rate). Same playback category as `LKVoicePlayer`: audible with the silent switch on.
@MainActor
final class LiveListenIO: NSObject, ListenIO, AVAudioPlayerDelegate, AVSpeechSynthesizerDelegate {
    private let resolver: VoiceResolver
    private let synth = AVSpeechSynthesizer()
    private var player: AVAudioPlayer?
    private var piece: CheckedContinuation<Void, Never>?
    private var onStart: (() -> Void)?
    private var token = 0
    private var clipOK = true
    private var preloaded = Set<String>()

    init(resolver: VoiceResolver = VoiceResolver()) {
        self.resolver = resolver
        super.init()
        synth.delegate = self
    }
    var canSpeak: Bool { !AVSpeechSynthesisVoice.speechVoices().isEmpty }

    /// accent → system voice names, best first (the cast picks by gender from this list)
    static func deviceVoices() -> [String: [String]] {
        let all = AVSpeechSynthesisVoice.speechVoices()
        var out: [String: [String]] = [:]
        for accent in ["en-GB", "en-US", "en-AU"] {
            let list = all.filter { $0.language == accent }.map { VoiceCore.SystemVoice(name: LKVoicePlayer.displayName($0), lang: $0.language) }
            out[accent] = VoiceCore.rank(list, accent: accent, gender: "").map(\.name)
        }
        return out
    }
    private static func voice(named name: String?, lang: String) -> AVSpeechSynthesisVoice? {
        if let name, let v = AVSpeechSynthesisVoice.speechVoices().first(where: { LKVoicePlayer.displayName($0) == name }) { return v }
        return AVSpeechSynthesisVoice(language: lang)
    }
    private func configureSession() {
        #if os(iOS)
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? s.setActive(true)
        #endif
    }

    // MARK: ListenIO
    func clip(_ key: String, rate: Double, onPlaying: @escaping () -> Void) async -> ListenClipResult {
        let my = token
        guard let hit = await resolver.fetch(kind: .sentence, key: key) else { return .failed(played: false) }
        guard my == token else { return .ended }
        guard let p = try? AVAudioPlayer(data: hit.data) else { return .failed(played: false) }
        p.enableRate = true; p.rate = Float(rate); p.delegate = self
        configureSession()
        guard p.prepareToPlay(), p.play() else { return .failed(played: false) }
        player = p; clipOK = true
        onPlaying()
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in piece = c }
        return clipOK ? .ended : .failed(played: true)
    }
    func preload(_ key: String) {
        guard preloaded.insert(key).inserted else { return }
        Task { [resolver] in _ = await resolver.fetch(kind: .sentence, key: key) }
    }
    func speak(_ pieces: [String], voice: CastVoice, rate: Double, onStart: @escaping () -> Void) async {
        let my = token
        configureSession()
        for (i, text) in pieces.enumerated() {
            guard my == token else { return }
            let u = AVSpeechUtterance(string: text)
            u.voice = Self.voice(named: voice.voice, lang: voice.lang)
            u.pitchMultiplier = Float(min(2, max(0.5, voice.pitch)))
            u.rate = min(AVSpeechUtteranceMaximumSpeechRate, max(AVSpeechUtteranceMinimumSpeechRate, AVSpeechUtteranceDefaultSpeechRate * Float(rate)))
            self.onStart = i == 0 ? onStart : nil
            await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in piece = c; synth.speak(u) }
        }
    }
    func wait(ms: Int) async { try? await Task.sleep(nanoseconds: UInt64(max(0, ms)) * 1_000_000) }
    func stop() {
        token += 1
        player?.stop(); player = nil
        onStart = nil
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
        endPiece()
    }

    private func endPiece() { let c = piece; piece = nil; c?.resume() }
    private func clipDone(_ ok: Bool) { clipOK = ok; player = nil; endPiece() }

    // MARK: delegates
    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) { Task { @MainActor in self.clipDone(flag) } }
    nonisolated func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) { Task { @MainActor in self.clipDone(false) } }
    nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didStart u: AVSpeechUtterance) { Task { @MainActor in let f = self.onStart; self.onStart = nil; f?() } }
    nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) { Task { @MainActor in self.endPiece() } }
    nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didCancel u: AVSpeechUtterance) { Task { @MainActor in self.endPiece() } }
}

/// Fixtures and previews: nothing is played, every wait returns at once.
@MainActor
final class SilentListenIO: ListenIO {
    var canSpeak: Bool { true }
    func clip(_ key: String, rate: Double, onPlaying: @escaping () -> Void) async -> ListenClipResult { .failed(played: false) }
    func preload(_ key: String) {}
    func speak(_ pieces: [String], voice: CastVoice, rate: Double, onStart: @escaping () -> Void) async {}
    func wait(ms: Int) async {}
    func stop() {}
}
