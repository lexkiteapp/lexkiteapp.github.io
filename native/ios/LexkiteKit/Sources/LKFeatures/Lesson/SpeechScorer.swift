import Foundation
import LKCore
#if os(iOS)
import Speech
import AVFoundation
#endif

/// What came back from one "tap to speak" attempt.
public enum SpeechOutcome: Equatable, Sendable {
    /// `score` 0…100 (web: similarity × 100)
    case heard(text: String, score: Int)
    case noSpeech
    /// no permission, no recognizer, or recognition not available on this device → the lesson offers "can't speak now"
    case unsupported
}

/// Speech recognition for the `say` exercise. The lesson only sees this protocol; tests inject a fixed score.
public protocol SpeechScoring: AnyObject {
    @MainActor func listen(target: String) async -> SpeechOutcome
    @MainActor func cancel()
}

#if os(iOS)
/// SFSpeechRecognizer (en-US) + microphone. Asks for permission on the first tap; stops by itself after the learner pauses.
@MainActor public final class SFSpeechScorer: NSObject, SpeechScoring {
    private let engine = AVAudioEngine()
    private var request: SFSpeechAudioBufferRecognitionRequest?
    private var task: SFSpeechRecognitionTask?
    private var finish: ((SpeechOutcome) -> Void)?
    /// seconds of silence after speech, and the longest a single attempt may take
    static let maxSeconds: Double = 8

    public override init() { super.init() }

    public func listen(target: String) async -> SpeechOutcome {
        cancel()
        guard await Self.authorized(), let rec = SFSpeechRecognizer(locale: Locale(identifier: "en-US")), rec.isAvailable else { return .unsupported }
        return await withCheckedContinuation { (c: CheckedContinuation<SpeechOutcome, Never>) in
            var done = false
            let end: (SpeechOutcome) -> Void = { [weak self] o in
                guard !done else { return }
                done = true; self?.teardown(); c.resume(returning: o)
            }
            finish = end
            let req = SFSpeechAudioBufferRecognitionRequest()
            req.shouldReportPartialResults = true
            req.requiresOnDeviceRecognition = false
            request = req
            let s = AVAudioSession.sharedInstance()
            do { try s.setCategory(.playAndRecord, mode: .measurement, options: [.duckOthers, .defaultToSpeaker]); try s.setActive(true, options: .notifyOthersOnDeactivation) }
            catch { end(.unsupported); return }
            let input = engine.inputNode
            input.removeTap(onBus: 0)
            input.installTap(onBus: 0, bufferSize: 1024, format: input.outputFormat(forBus: 0)) { buf, _ in req.append(buf) }
            engine.prepare()
            do { try engine.start() } catch { end(.unsupported); return }
            var best = ""
            task = rec.recognitionTask(with: req) { result, error in
                if let result {
                    best = result.bestTranscription.formattedString
                    if result.isFinal {
                        let alts = result.transcriptions.map(\.formattedString)
                        end(Self.score(alts.isEmpty ? [best] : alts, target))
                        return
                    }
                }
                if error != nil { end(best.isEmpty ? .noSpeech : Self.score([best], target)) }
            }
            // end the audio after the time limit or when the learner has paused: the recognizer then reports the final result
            DispatchQueue.main.asyncAfter(deadline: .now() + Self.maxSeconds) { [weak self] in
                guard let self, self.finish != nil else { return }
                req.endAudio()
                DispatchQueue.main.asyncAfter(deadline: .now() + 2) { end(best.isEmpty ? .noSpeech : Self.score([best], target)) }
            }
        }
    }

    public func cancel() { let f = finish; teardown(); f?(.noSpeech) }

    private func teardown() {
        finish = nil
        if engine.isRunning { engine.stop() }
        engine.inputNode.removeTap(onBus: 0)
        request?.endAudio(); request = nil
        task?.cancel(); task = nil
        try? AVAudioSession.sharedInstance().setCategory(.playback, mode: .spokenAudio, options: [.duckOthers])
    }

    /// Best alternative wins (web: `alts` sorted by similarity).
    nonisolated static func score(_ alts: [String], _ target: String) -> SpeechOutcome {
        guard let best = alts.map({ ($0, LessonEngine.similarity($0, target)) }).max(by: { $0.1 < $1.1 }), !best.0.isEmpty else { return .noSpeech }
        return .heard(text: best.0, score: Int((best.1 * 100 + 0.5).rounded(.down)))
    }

    private static func authorized() async -> Bool {
        let speech: Bool = await withCheckedContinuation { c in
            SFSpeechRecognizer.requestAuthorization { c.resume(returning: $0 == .authorized) }
        }
        guard speech else { return false }
        return await withCheckedContinuation { c in AVAudioApplication.requestRecordPermission { c.resume(returning: $0) } }
    }
}
#endif
