import Foundation
import AVFoundation
import LKStore
import LKCore
import LKStrings
#if os(iOS)
import UIKit
import MediaPlayer
#endif

// The device side of #/handsfree. The chain itself is `HandsfreeMachine` (LKStore); here every `HFEffect` becomes sound, and the lock-screen controls are bound.
// Both sit behind protocols so tests and fixtures need no audio session, no speech synthesizer and no lock screen.

/// What plays one step. `finished` is called exactly once when the step ends (audio ended OR failed, speech done); `cancel` drops it silently.
@MainActor protocol HandsfreeDevice: AnyObject {
    /// the screen is off / the app is in the background: no speech synthesis then
    var screenOff: Bool { get }
    func play(_ track: HFTrack, finished: @escaping () -> Void)
    func speak(_ text: String, lang: String, rate: Double, finished: @escaping () -> Void)
    func cancel()
    /// no auto-lock while the chain runs
    func keepAwake(_ on: Bool)
}

/// The six lock-screen / headset actions of the web MediaSession
enum HFRemote: CaseIterable, Sendable { case play, pause, nextTrack, previousTrack, seekBackward, seekForward }

@MainActor protocol HandsfreeNowPlaying: AnyObject {
    func publish(title: String, artist: String, album: String, playing: Bool)
    func bind(_ handler: @escaping (HFRemote) -> Void)
    func clear()
}

/// Silent, instant: fixtures and tests that look at the screen only
@MainActor final class SilentHandsfreeDevice: HandsfreeDevice, HandsfreeNowPlaying {
    var screenOff = false
    var published: (title: String, artist: String, album: String, playing: Bool)?
    var bound = false
    func play(_ track: HFTrack, finished: @escaping () -> Void) {}
    func speak(_ text: String, lang: String, rate: Double, finished: @escaping () -> Void) {}
    func cancel() {}
    func keepAwake(_ on: Bool) {}
    func publish(title: String, artist: String, album: String, playing: Bool) { published = (title, artist, album, playing) }
    func bind(_ handler: @escaping (HFRemote) -> Void) { bound = true }
    func clear() { published = nil; bound = false }
}

#if os(iOS)
/// The app: Kokoro clips through `LKVoicePlayer` (cache first, system voice as the last resort), dictionary audio by URL, the 1 s silent WAV, system speech
/// (screen on only), MPNowPlayingInfoCenter + MPRemoteCommandCenter.
@MainActor final class LiveHandsfreeDevice: NSObject, HandsfreeDevice, HandsfreeNowPlaying, AVAudioPlayerDelegate, AVSpeechSynthesizerDelegate {
    private let voice: LKVoicePlayer
    private let accent: () -> String
    private var player: AVAudioPlayer?
    private var stream: AVPlayer?
    private var observers: [NSObjectProtocol] = []
    private let synth = AVSpeechSynthesizer()
    private var done: (() -> Void)?
    private var token = 0
    private var handler: ((HFRemote) -> Void)?

    init(voice: LKVoicePlayer, accent: @escaping () -> String) { self.voice = voice; self.accent = accent; super.init(); synth.delegate = self }

    var screenOff: Bool { UIApplication.shared.applicationState != .active }

    private func session() {
        let s = AVAudioSession.sharedInstance()
        try? s.setCategory(.playback, mode: .spokenAudio, options: [])
        try? s.setActive(true)
    }
    private func arm(_ finished: @escaping () -> Void) -> Int { cancel(); token += 1; done = finished; return token }
    private func fire(_ my: Int) { guard my == token, let d = done else { return }; done = nil; d() }

    func play(_ track: HFTrack, finished: @escaping () -> Void) {
        session()
        let my = arm(finished)
        switch track {
        case .clip(let text):
            let isWord = !text.contains(" ")
            if isWord { voice.speakWord(text, who: SpeakAccent.ama, accent: accent()) { [weak self] in self?.fire(my) } }
            else { voice.speak(text, who: SpeakAccent.ama, accent: accent()) { [weak self] in self?.fire(my) } }
        case .url(let s):
            guard let u = URL(string: s) else { fire(my); return }
            let item = AVPlayerItem(url: u)
            for n in [Notification.Name.AVPlayerItemDidPlayToEndTime, .AVPlayerItemFailedToPlayToEndTime] {
                observers.append(NotificationCenter.default.addObserver(forName: n, object: item, queue: .main) { [weak self] _ in Task { @MainActor in self?.fire(my) } })
            }
            stream = AVPlayer(playerItem: item); stream?.play()
        case .silence:
            guard let p = try? AVAudioPlayer(data: HandsfreeCore.silenceWAV()) else { fire(my); return }
            p.delegate = self; player = p
            if !p.play() { fire(my) }
        }
    }
    func speak(_ text: String, lang: String, rate: Double, finished: @escaping () -> Void) {
        session()
        _ = arm(finished)
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: lang)
        u.rate = AVSpeechUtteranceDefaultSpeechRate * Float(rate)
        synth.speak(u)
    }
    func cancel() {
        token += 1; done = nil
        voice.stop(); player?.stop(); player = nil; stream?.pause(); stream = nil
        for o in observers { NotificationCenter.default.removeObserver(o) }
        observers = []
        if synth.isSpeaking { synth.stopSpeaking(at: .immediate) }
    }
    func keepAwake(_ on: Bool) { UIApplication.shared.isIdleTimerDisabled = on }

    nonisolated func audioPlayerDidFinishPlaying(_ p: AVAudioPlayer, successfully ok: Bool) { Task { @MainActor in self.fire(self.token) } }
    nonisolated func audioPlayerDecodeErrorDidOccur(_ p: AVAudioPlayer, error: Error?) { Task { @MainActor in self.fire(self.token) } }
    nonisolated func speechSynthesizer(_ s: AVSpeechSynthesizer, didFinish u: AVSpeechUtterance) { Task { @MainActor in self.fire(self.token) } }

    // MARK: lock screen
    func publish(title: String, artist: String, album: String, playing: Bool) {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = [MPMediaItemPropertyTitle: title, MPMediaItemPropertyArtist: artist, MPMediaItemPropertyAlbumTitle: album,
                                                            MPNowPlayingInfoPropertyPlaybackRate: playing ? 1.0 : 0.0]
        MPNowPlayingInfoCenter.default().playbackState = playing ? .playing : .paused
    }
    func bind(_ h: @escaping (HFRemote) -> Void) {
        handler = h
        let c = MPRemoteCommandCenter.shared()
        func on(_ cmd: MPRemoteCommand, _ r: HFRemote) { cmd.isEnabled = true; cmd.addTarget { [weak self] _ in Task { @MainActor in self?.handler?(r) }; return .success } }
        on(c.playCommand, .play); on(c.pauseCommand, .pause); on(c.nextTrackCommand, .nextTrack); on(c.previousTrackCommand, .previousTrack)
        on(c.skipBackwardCommand, .seekBackward); on(c.skipForwardCommand, .seekForward)
    }
    func clear() {
        handler = nil
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        let c = MPRemoteCommandCenter.shared()
        for cmd in [c.playCommand, c.pauseCommand, c.nextTrackCommand, c.previousTrackCommand, c.skipBackwardCommand, c.skipForwardCommand] as [MPRemoteCommand] { cmd.removeTarget(nil) }
    }
}
#endif
