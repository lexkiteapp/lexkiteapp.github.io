import SwiftUI
import Observation
import AVFoundation
import NaturalLanguage
import LKStore
#if canImport(Translation)
import Translation
#endif

// Phiên dịch – the platform side behind small protocols, so the screen model runs in tests with no microphone, no translator, no sound and no network.
// Free everywhere: Speech framework (recognise), NLLanguageRecognizer (who spoke), Translation framework (iOS 18+, on the device; a free online fallback
// for older systems), AVSpeechSynthesizer / the Kokoro teacher voice (read aloud).

public struct InterpTranslation: Equatable, Sendable {
    public var text: String, local: Bool
    public init(text: String, local: Bool) { self.text = text; self.local = local }
}

@MainActor public protocol InterpTranslating: AnyObject {
    /// nil = could not translate (no pack, no network)
    func translate(_ text: String, from: String, to: String) async -> InterpTranslation?
    /// download the offline pack of one direction; false = this device cannot
    func prepare(from: String, to: String) async -> Bool
}

public protocol InterpDetecting: Sendable {
    func detect(_ text: String) -> Interp.Detected?
}

@MainActor public protocol InterpSpeaking: AnyObject {
    func speak(_ text: String, lang: String, slow: Bool)
    func stop()
}

/// What the interpreter screen needs from the device.
@MainActor public final class InterpIO {
    public var recognizer: SpeakRecognizing
    public var translator: InterpTranslating
    public var detector: InterpDetecting
    public var speaker: InterpSpeaking
    public var clock: () -> Int64
    public var newId: () -> String
    public init(recognizer: SpeakRecognizing, translator: InterpTranslating, detector: InterpDetecting, speaker: InterpSpeaking,
                clock: @escaping () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }, newId: @escaping () -> String = { "c" + String(Int64(Date().timeIntervalSince1970 * 1000)) }) {
        self.recognizer = recognizer; self.translator = translator; self.detector = detector; self.speaker = speaker; self.clock = clock; self.newId = newId
    }
}

// MARK: - language detection (NLLanguageRecognizer, on the device)
public struct NLInterpDetector: InterpDetecting {
    public init() {}
    public func detect(_ text: String) -> Interp.Detected? {
        let r = NLLanguageRecognizer()
        r.languageConstraints = Interp.codes.map { NLLanguage(rawValue: $0) }
        r.processString(text)
        guard let top = r.languageHypotheses(withMaximum: 1).first else { return nil }
        return Interp.Detected(lang: Interp.base(top.key.rawValue), confidence: top.value)
    }
}

// MARK: - reading aloud
/// English → the Kokoro teacher voice (one voice everywhere); every other language → the system voice of that language.
@MainActor public final class AVInterpSpeaker: InterpSpeaking {
    private let synth = AVSpeechSynthesizer()
    private let voice: LKVoicePlayer?
    public init(voice: LKVoicePlayer? = nil) { self.voice = voice }
    public func speak(_ text: String, lang: String, slow: Bool) {
        stop()
        if Interp.base(lang) == "en", let voice { voice.speak(text, who: "ama", accent: "en-US", slow: slow); return }
        let u = AVSpeechUtterance(string: text)
        u.voice = AVSpeechSynthesisVoice(language: Interp.locale(lang))
        u.rate = AVSpeechUtteranceDefaultSpeechRate * (slow ? 0.55 : 1)
        #if os(iOS)
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        #endif
        synth.speak(u)
    }
    public func stop() { voice?.stop(); if synth.isSpeaking { synth.stopSpeaking(at: .immediate) } }
}

// MARK: - translation
/// Translation framework (iOS 18+) when the pair is supported, else the free online fallback (the dictionary service, like the web).
@MainActor public final class AppleInterpTranslator: InterpTranslating {
    private let fallback: (String, String, String) async -> String
    #if canImport(Translation)
    /// the SwiftUI side: `.interpTranslation(...)` on the screen runs the session this object asks for (iOS 18 hands out a session only from a view)
    public private(set) var bridge: AnyObject?
    #endif
    public init(fallback: @escaping (String, String, String) async -> String) {
        self.fallback = fallback
        #if canImport(Translation)
        if #available(iOS 18.0, macOS 15.0, *) { bridge = TranslationBridge() }
        #endif
    }
    public func translate(_ text: String, from: String, to: String) async -> InterpTranslation? {
        if from == to { return InterpTranslation(text: text, local: true) }
        #if canImport(Translation)
        if #available(iOS 18.0, macOS 15.0, *), let b = bridge as? TranslationBridge, await b.supports(from: from, to: to) {
            if let r = await b.run(text: text, from: from, to: to, prepareOnly: false) { return InterpTranslation(text: r, local: true) }
        }
        #endif
        let r = await fallback(text, from, to)
        return r.isEmpty ? nil : InterpTranslation(text: r, local: false)
    }
    public func prepare(from: String, to: String) async -> Bool {
        #if canImport(Translation)
        if #available(iOS 18.0, macOS 15.0, *), let b = bridge as? TranslationBridge, await b.supports(from: from, to: to) {
            return await b.run(text: "", from: from, to: to, prepareOnly: true) != nil
        }
        #endif
        return false
    }
}

#if canImport(Translation)
/// One job at a time (the model serialises): set → the view's `.translationTask` fires → the session translates (or downloads the pack) → the continuation resumes.
@available(iOS 18.0, macOS 15.0, *)
@MainActor @Observable final class TranslationBridge {
    struct Job { var text: String, prepareOnly: Bool, cont: CheckedContinuation<String?, Never> }
    var configuration: TranslationSession.Configuration?
    private var job: Job?

    func supports(from: String, to: String) async -> Bool {
        let st = await LanguageAvailability().status(from: Locale.Language(identifier: from), to: Locale.Language(identifier: to))
        return st != .unsupported
    }
    func run(text: String, from: String, to: String, prepareOnly: Bool) async -> String? {
        cancel()
        return await withCheckedContinuation { (c: CheckedContinuation<String?, Never>) in
            job = Job(text: text, prepareOnly: prepareOnly, cont: c)
            let cfg = TranslationSession.Configuration(source: Locale.Language(identifier: from), target: Locale.Language(identifier: to))
            if configuration == cfg { configuration?.invalidate() } else { configuration = cfg }
        }
    }
    /// called by `.translationTask`
    func perform(_ session: TranslationSession) async {
        guard let j = job else { return }
        job = nil
        do {
            if j.prepareOnly { try await session.prepareTranslation(); j.cont.resume(returning: "") }
            else { j.cont.resume(returning: try await session.translate(j.text).targetText) }
        } catch { j.cont.resume(returning: nil) }
    }
    func cancel() { if let j = job { job = nil; j.cont.resume(returning: nil) } }
}
#endif

extension View {
    /// Attach the Translation framework's session host (iOS 18+); a no-op elsewhere.
    @ViewBuilder func interpTranslation(_ translator: InterpTranslating) -> some View {
        #if canImport(Translation)
        if #available(iOS 18.0, macOS 15.0, *), let t = translator as? AppleInterpTranslator, let b = t.bridge as? TranslationBridge {
            self.translationTask(b.configuration) { session in await b.perform(session) }
                .onDisappear { b.cancel() }
        } else { self }
        #else
        self
        #endif
    }
}

// MARK: - tests / fixtures
@MainActor public final class ScriptedTranslator: InterpTranslating {
    public var table: [String: InterpTranslation]
    public var prepared = true
    public private(set) var calls: [String] = []
    public init(_ table: [String: InterpTranslation] = [:]) { self.table = table }
    public func translate(_ text: String, from: String, to: String) async -> InterpTranslation? { calls.append("\(from)>\(to):\(text)"); return table[text] }
    public func prepare(from: String, to: String) async -> Bool { prepared }
}
public struct ScriptedDetector: InterpDetecting {
    public var answers: [String: Interp.Detected]
    public init(_ answers: [String: Interp.Detected] = [:]) { self.answers = answers }
    public func detect(_ text: String) -> Interp.Detected? { answers[text] }
}
@MainActor public final class SilentSpeaker: InterpSpeaking {
    public private(set) var said: [(text: String, lang: String, slow: Bool)] = []
    public init() {}
    public func speak(_ text: String, lang: String, slow: Bool) { said.append((text, lang, slow)) }
    public func stop() {}
}
extension InterpIO {
    /// silent, scripted: fixtures and tests
    static func scripted(heard: [RecognizeOutcome] = [], translations: [String: InterpTranslation] = [:], detections: [String: Interp.Detected] = [:]) -> InterpIO {
        var n = 0
        return InterpIO(recognizer: ScriptedRecognizer(heard), translator: ScriptedTranslator(translations), detector: ScriptedDetector(detections), speaker: SilentSpeaker(),
                        clock: { 1_767_603_600_000 }, newId: { n += 1; return "c\(n)" })
    }
}
