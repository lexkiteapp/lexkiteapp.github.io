import SwiftUI
import Observation
import AVFoundation
import LKSync
import LKStore
import LKCore
import LKStrings
#if os(iOS)
import Speech
#endif

// M4 P07 – what every speaking screen reads and writes. The learner's data goes through `SkillsContext` (same game / settings / mistakes / cards path as
// Listening & Reading, `SkillsHost` builds it); this file adds the platform side as ONE injectable `SpeakIO` (recogniser, voice, clock, random numbers) so
// fixtures and tests need no microphone, no sound, no clock and no network.

/// One attempt of the learner at saying something, as the platform delivers it (web `UI.recognize` events collapsed into a value).
public struct RecognizeOutcome: Equatable, Sendable {
    public var alts: [String]
    /// platform error code (`not-allowed`, `no-speech`, `unsupported`, `audio-capture`, `network`, …); nil = a result arrived
    public var error: String?
    /// ms from the first sound to the result (`max(1000, …)` is applied by `SpeakScore.result`)
    public var elapsedMs: Int
    public init(alts: [String], error: String? = nil, elapsedMs: Int = 0) { self.alts = alts; self.error = error; self.elapsedMs = elapsedMs }
    public static func heard(_ s: String, ms: Int = 2000) -> RecognizeOutcome { RecognizeOutcome(alts: [s], elapsedMs: ms) }
    public static func failed(_ code: String) -> RecognizeOutcome { RecognizeOutcome(alts: [], error: code) }
}

/// The microphone behind a protocol: SFSpeechRecognizer in the app, a script in tests.
@MainActor public protocol SpeakRecognizing: AnyObject {
    /// `locale` = en-US | en-GB … (settings.accent; the learner's language for non-English recognition); `onPartial` = the text heard so far
    func listen(locale: String, maxSeconds: Double, onPartial: ((String) -> Void)?) async -> RecognizeOutcome
    /// P08 (calls): `onDevice` ⇒ the audio never leaves the phone (`requiresOnDeviceRecognition`; unsupported ⇒ `unsupported`, never the cloud silently);
    /// `phrases` ⇒ the words of the turn as contextual strings
    func listen(locale: String, maxSeconds: Double, onDevice: Bool, phrases: [String], onPartial: ((String) -> Void)?) async -> RecognizeOutcome
    func cancel()
    /// stop listening softly: what was heard so far is still delivered (default = cancel)
    func stop()
    /// the OS can recognise this locale on the device / at all (system = may use the cloud)
    func supportsOnDevice(locale: String) -> Bool
    func systemAvailable(locale: String) -> Bool
}
extension SpeakRecognizing {
    public func listen(locale: String, maxSeconds: Double, onDevice: Bool, phrases: [String], onPartial: ((String) -> Void)?) async -> RecognizeOutcome {
        if onDevice && !supportsOnDevice(locale: locale) { return .failed("unsupported") }
        return await listen(locale: locale, maxSeconds: maxSeconds, onPartial: onPartial)
    }
    public func stop() { cancel() }
    public func supportsOnDevice(locale: String) -> Bool { false }
    public func systemAvailable(locale: String) -> Bool { true }
}

/// Test / fixture recogniser: answers from a queue, then `no-speech`.
@MainActor public final class ScriptedRecognizer: SpeakRecognizing {
    public var queue: [RecognizeOutcome]
    public private(set) var calls: [String] = []
    public init(_ queue: [RecognizeOutcome] = []) { self.queue = queue }
    public func listen(locale: String, maxSeconds: Double, onPartial: ((String) -> Void)?) async -> RecognizeOutcome {
        calls.append(locale)
        let o = queue.isEmpty ? RecognizeOutcome.failed("no-speech") : queue.removeFirst()
        if let h = o.alts.first { onPartial?(h) }
        return o
    }
    public func cancel() {}
}

#if os(iOS)
/// SFSpeechRecognizer + microphone: up to 5 alternatives, partial results, stops on the final result or after `maxSeconds`.
/// Permission is asked on the first tap (usage strings are in project.yml); every failure is reported as the web's error code.
@MainActor public final class SFSpeakRecognizer: SpeakRecognizing {
    private let engine = AVAudioEngine()
    private var task: SFSpeechRecognitionTask?
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var finish: ((RecognizeOutcome) -> Void)?
    public init() {}

    public func listen(locale: String, maxSeconds: Double, onPartial: ((String) -> Void)?) async -> RecognizeOutcome {
        await listen(locale: locale, maxSeconds: maxSeconds, onDevice: false, phrases: [], onPartial: onPartial)
    }
    public func supportsOnDevice(locale: String) -> Bool { SFSpeechRecognizer(locale: Locale(identifier: locale))?.supportsOnDeviceRecognition ?? false }
    public func systemAvailable(locale: String) -> Bool { SFSpeechRecognizer(locale: Locale(identifier: locale))?.isAvailable ?? false }
    public func stop() { request?.endAudio() }
    public func listen(locale: String, maxSeconds: Double, onDevice: Bool, phrases: [String], onPartial: ((String) -> Void)?) async -> RecognizeOutcome {
        cancel()
        guard await SFSpeechScorer.authorized() else { return .failed("not-allowed") }
        guard let rec = SFSpeechRecognizer(locale: Locale(identifier: locale)), rec.isAvailable else { return .failed("unsupported") }
        if onDevice && !rec.supportsOnDeviceRecognition { return .failed("unsupported") }
        return await withCheckedContinuation { (c: CheckedContinuation<RecognizeOutcome, Never>) in
            var done = false
            let started = Date()
            let end: (RecognizeOutcome) -> Void = { [weak self] o in
                guard !done else { return }
                done = true; self?.teardown(); c.resume(returning: o)
            }
            finish = end
            let req = SFSpeechAudioBufferRecognitionRequest()
            req.shouldReportPartialResults = true
            if onDevice { req.requiresOnDeviceRecognition = true }
            if !phrases.isEmpty { req.contextualStrings = phrases }
            request = req
            let s = AVAudioSession.sharedInstance()
            do { try s.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker]); try s.setActive(true, options: .notifyOthersOnDeactivation) }
            catch { end(.failed("audio-capture")); return }
            let input = engine.inputNode
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buf, _ in req.append(buf) }
            engine.prepare()
            do { try engine.start() } catch { end(.failed("audio-capture")); return }
            var best = "", alts: [String] = [], firstSound: Date?
            let ms: () -> Int = { Int(Date().timeIntervalSince(firstSound ?? started) * 1000) }
            task = rec.recognitionTask(with: req) { result, error in
                if let result {
                    best = result.bestTranscription.formattedString
                    if firstSound == nil, !best.isEmpty { firstSound = Date() }
                    if !best.isEmpty { onPartial?(best) }
                    if result.isFinal {
                        alts = result.transcriptions.prefix(5).map(\.formattedString)
                        end(RecognizeOutcome(alts: alts.isEmpty ? [best] : alts, error: best.isEmpty ? "no-speech" : nil, elapsedMs: ms()))
                        return
                    }
                }
                if error != nil { end(best.isEmpty ? .failed("no-speech") : RecognizeOutcome(alts: [best], elapsedMs: ms())) }
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + maxSeconds) {
                guard !done else { return }
                req.endAudio()
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { end(best.isEmpty ? .failed("no-speech") : RecognizeOutcome(alts: [best], elapsedMs: ms())) }
            }
        }
    }
    public func cancel() { let f = finish; teardown(); f?(.failed("no-speech")) }
    private func teardown() {
        finish = nil
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio(); request = nil
        task?.cancel(); task = nil
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
    }
}
#endif

/// Everything a speaking screen needs from the device.
@MainActor public final class SpeakIO {
    public var recognizer: SpeakRecognizing
    /// speak a line with a teacher: (text, who = ama | carlos, accent, slow, onEnd)
    public var say: (String, String, String, Bool, (() -> Void)?) -> Void
    public var stopSay: () -> Void
    /// monotonic ms (the clocks of the speaking timers; tests pass a fixed one)
    public var clock: () -> Int64
    /// 0..<1 (shuffles and the "random topic"; tests pass the vector's numbers)
    public var random: () -> Double

    public init(recognizer: SpeakRecognizing, say: @escaping (String, String, String, Bool, (() -> Void)?) -> Void = { _, _, _, _, end in end?() },
                stopSay: @escaping () -> Void = {}, clock: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) },
                random: @escaping () -> Double = { Double.random(in: 0..<1) }) {
        self.recognizer = recognizer; self.say = say; self.stopSay = stopSay; self.clock = clock; self.random = random
    }
    /// silent, scripted: fixtures and tests
    public static func scripted(_ outcomes: [RecognizeOutcome] = [], clock: @escaping () -> Int64 = { 0 }, random: @escaping () -> Double = { 0.5 }) -> SpeakIO {
        SpeakIO(recognizer: ScriptedRecognizer(outcomes), clock: clock, random: random)
    }
    /// the app: Kokoro voices through LKVoicePlayer, SFSpeechRecognizer
    public static func live(voice: LKVoicePlayer) -> SpeakIO {
        #if os(iOS)
        let rec: SpeakRecognizing = SFSpeakRecognizer()
        #else
        let rec: SpeakRecognizing = ScriptedRecognizer()
        #endif
        return SpeakIO(recognizer: rec, say: { text, who, accent, slow, end in voice.speak(text, who: who, accent: accent, slow: slow, onEnd: end) }, stopSay: { voice.stop() })
    }
    /// one scored attempt: listen, keep the alternative closest to the target, build the `Speak.score` result
    public func attempt(target: String, locale: String, maxSeconds: Double = 8, intents: [(id: String, keywords: [String])]? = nil,
                        onPartial: ((String) -> Void)? = nil) async -> SpeakScore.Result {
        let o = await recognizer.listen(locale: locale, maxSeconds: maxSeconds, onPartial: onPartial)
        let b = Recognize.best(target: target, alts: o.alts)
        return SpeakScore.result(target: target, heard: b.heard, platformScore: o.error == nil ? b.score : 0, seconds: Double(o.elapsedMs) / 1000, error: o.error, intents: intents)
    }
}

/// The P07 packs: the bundled starter at first, the full https://lexkite.com/data/speak-pack.json and say.json once fetched (cached on disk by `LessonRemote`).
@MainActor
public enum SpeakContentStore {
    public static let packPath = "data/speak-pack.json", sayPath = "data/say.json"
    public private(set) static var pack: SpeakPack = SpeakPack.bundled() ?? SpeakPack()
    /// `say.json` = {v, series:[…]}; empty until fetched (not bundled)
    public private(set) static var say: JSON = .null
    private static var fetched = false
    public static func refresh(source: LessonTextSource = LessonRemote.shared) async {
        guard !fetched else { return }
        fetched = true
        if let text = await source.text(packPath), let p = SpeakPack.decode(text) { pack = p }
        if let text = await source.text(sayPath), let j = try? JSON.parse(text), !j.list("series").isEmpty { say = j }
        else if say == .null { fetched = false }
    }
    /// fixtures
    static func install(pack: SpeakPack? = nil, say: JSON? = nil) { if let pack { self.pack = pack }; if let say { self.say = say } }
}
