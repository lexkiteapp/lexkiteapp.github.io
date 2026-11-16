import Foundation
#if !AUDIO_DRIVER
import XCTest
@testable import LKSync
import LKCore
#endif

/// C04 audio logic: LKCore/Audio/VoiceCore against vectors/audio.json, produced by the REAL web code (scripts/native/gen-audio.mjs).
enum AudioVectorCheck {
    struct Report {
        var checked = 0
        var failures: [String] = []
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) {
            checked += 1
            if !ok { if failures.count < 25 { failures.append(s()) } else if failures.count == 25 { failures.append("…") } }
        }
    }
    static func voices(_ j: JSON?) -> [VoiceCore.SystemVoice] {
        (j?.array ?? []).map { VoiceCore.SystemVoice(name: $0["name"]?.string ?? "", lang: $0["lang"]?.string ?? "", localService: $0["localService"].flatMap { v -> Bool? in if case .bool(let b) = v { return b }; return nil }) }
    }
    static func strs(_ u: [URL]) -> [String] { u.map(\.absoluteString) }
    static func arr(_ j: JSON?) -> [String] { (j?.array ?? []).compactMap(\.string) }

    static func run(_ V: JSON) -> Report {
        var r = Report()
        r.check(VoiceCore.bases == arr(V["bases"]), "bases")
        r.check(VoiceCore.wordSuffix == V["wordSuffix"]?.string, "word suffix")
        for c in V["urls"]?.array ?? [] {
            let kind: VoiceCore.Kind = c["kind"]?.string == "w" ? .word : .sentence
            let got = strs(VoiceCore.urls(kind: kind, key: c["key"]?.string ?? "", fails: Int(c["fails"]?.double ?? 0), s2: Set(arr(c["s2"]))))
            r.check(got == arr(c["urls"]), "urls \(c.stableString.prefix(120)): \(got)")
        }
        for c in V["fnv36"]?.array ?? [] { r.check(VoiceCore.fnv36(c["in"]?.string ?? "") == c["out"]?.string, "fnv36 \(c["in"]?.string ?? "")") }
        for (who, voice) in V["voices"]?.object ?? [:] { r.check(VoiceCore.genderFor(who) == VoiceCore.kokoro(voice.string)?.gender, "voice gender \(who)") }
        for c in V["sentence"]?.array ?? [] {
            let key = VoiceCore.lineKey(voice: c["voice"]?.string ?? "", text: c["text"]?.string ?? "")
            r.check(key == c["key"]?.string, "lineKey \(c["text"]?.string ?? "")")
            r.check(strs(VoiceCore.urls(kind: .sentence, key: key, fails: 0)) == arr(c["urls"]), "sentence urls")
            r.check(strs(VoiceCore.urls(kind: .sentence, key: key + "-ls", fails: 0)) == arr(c["cueUrls"]), "cue urls")
        }
        for c in V["split"]?.array ?? [] { r.check(VoiceCore.split(c["text"]?.string ?? "") == arr(c["out"]), "split \(c["text"]?.string?.prefix(30) ?? "")") }
        for c in V["word"]?.array ?? [] {
            let accent = c["accent"]?.string ?? "", voice = VoiceCore.wordVoice(accent: accent)
            let key = VoiceCore.wordKey(voice: voice, headword: c["word"]?.string ?? "")
            r.check(voice == c["voice"]?.string && key == c["key"]?.string, "word \(accent) \(c["word"]?.string ?? "")")
            r.check(strs(VoiceCore.urls(kind: .word, key: key, fails: 0)) == arr(c["urls"]), "word urls")
        }
        for c in V["ttsClean"]?.array ?? [] { r.check(VoiceCore.ttsClean(c["in"]?.string ?? "") == c["out"]?.string, "ttsClean \(c["in"]?.string ?? "") → \(VoiceCore.ttsClean(c["in"]?.string ?? ""))") }
        for c in V["genderOf"]?.array ?? [] { r.check(VoiceCore.genderOf(c["name"]?.string) == c["out"]?.string, "genderOf \(c["name"]?.string ?? "")") }
        for c in V["kokoro"]?.array ?? [] {
            let k = VoiceCore.kokoro(c["id"]?.string)
            r.check(k?.accent == c["out"]?["accent"]?.string && k?.gender == c["out"]?["gender"]?.string, "kokoro \(c["id"]?.stableString ?? "")")
        }
        for c in V["genderFor"]?.array ?? [] { r.check(VoiceCore.genderFor(c["who"]?.string) == c["out"]?.string, "genderFor \(c["who"]?.stableString ?? "")") }
        let sample = voices(V["sampleVoices"])
        for c in V["rank"]?.array ?? [] {
            r.check(VoiceCore.rank(sample, accent: c["accent"]?.string ?? "", gender: c["gender"]?.string ?? "").map(\.name) == arr(c["out"]), "rank \(c["accent"]?.string ?? "") \(c["gender"]?.string ?? "")")
        }
        for c in V["pick"]?.array ?? [] {
            let p = VoiceCore.pickVoice(sample, accent: c["accent"]?.string ?? "", gender: c["gender"]?.string ?? "", want: c["want"]?.string)
            r.check(p?.name == c["out"]?.string, "pick \(c.stableString)")
        }
        for c in V["score"]?.array ?? [] {
            let v = sample.first { $0.name == c["name"]?.string } ?? VoiceCore.SystemVoice(name: c["name"]?.string ?? "", lang: "en-US")
            r.check(Double(VoiceCore.voiceScore(v, accent: c["accent"]?.string ?? "", gender: c["gender"]?.string ?? "")) == c["out"]?.double, "score \(c.stableString)")
        }
        return r
    }
}

#if !AUDIO_DRIVER
final class AudioVectorTests: XCTestCase {
    func testAudioVectors() throws {
        let r = AudioVectorCheck.run(try Vectors.load("audio.json"))
        XCTAssertGreaterThanOrEqual(r.checked, 150, "too few checks ran")
        XCTAssert(r.failures.isEmpty, r.failures.joined(separator: "\n"))
    }
}
#endif
