import Foundation
import LKSync
import LKCore
import LKStrings

/// M4 P07 – shared logic of the speaking screens (#/speak #/speaking #/pron #/say #/reflex #/rtype #/roleplay #/handsfree), ports of the pure parts of
/// web/js/speak/score.js and ui.js `recognize`. Every function takes its platform input (heard text, alternatives, elapsed ms, random numbers) as an
/// argument; nothing here reads a clock, a microphone or a random generator. Verified against vectors/speak.json (SpeakVectorTests).

/// The speaking content pack (https://lexkite.com/data/speak-pack.json, bundled starter `speak-content.json`): `{speaking, pron, roleplay, consts}`.
public struct SpeakPack: Sendable {
    public var json: JSON
    public init(json: JSON = .null) { self.json = json }
    public var speaking: JSON { json["speaking"] ?? .null }
    public var pron: JSON { json["pron"] ?? .null }
    public var roleplay: JSON { json["roleplay"] ?? .null }
    public var consts: JSON { json["consts"] ?? .null }
    public var isEmpty: Bool { speaking.list("bank").isEmpty && pron.list("lessons").isEmpty }

    /// The bundled starter (LKStore resource). Nil only if the resource is missing (a packaging bug the tests catch).
    public static func bundled() -> SpeakPack? {
        guard let url = Bundle.module.url(forResource: "speak-content", withExtension: "json"), let d = try? Data(contentsOf: url), let j = try? JSON.parse(d) else { return nil }
        return SpeakPack(json: j)
    }
    /// A fetched pack; nil when it is not a pack.
    public static func decode(_ text: String) -> SpeakPack? {
        guard let j = try? JSON.parse(text) else { return nil }
        let p = SpeakPack(json: j)
        return p.isEmpty ? nil : p
    }
}

/// What the web passes to `t()`: a Vietnamese key, or `{k, v}` with variables whose values may be keys or `{k, v}` themselves (translated inside-out).
public enum SpeakText {
    public static func render(_ j: JSON?, _ l10n: L10n) -> String {
        guard let j else { return "" }
        switch j {
        case .string(let s): return l10n.translate(source: s) ?? s
        case .object(let o):
            guard let k = o["k"]?.string else { return "" }
            var vars: [String: String] = [:]
            for (n, v) in o["v"]?.object ?? [:] { vars[n] = value(v, l10n) }
            return l10n.translate(source: k, vars) ?? fill(k, vars)
        case .null: return ""
        default: return j.jsToString
        }
    }
    /// a variable: a nested `{k, v}`, a key that has a translation, else the value as it is (a word, a number)
    private static func value(_ v: JSON, _ l10n: L10n) -> String {
        switch v {
        case .object: return render(v, l10n)
        case .string(let s): return l10n.translate(source: s) ?? s
        default: return v.jsToString
        }
    }
    public static func fill(_ k: String, _ vars: [String: String]) -> String {
        var s = k
        for (n, v) in vars { s = s.replacingOccurrences(of: "{\(n)}", with: v) }
        return s
    }
}

/// Platform ASR → what the screens get (`ui.js recognize()`): the alternative closest to the TARGET wins (ties: the first), `score = round(similarity·100)`.
public enum Recognize {
    public struct Best: Equatable, Sendable { public var heard: String, score: Int }
    public static func best(target: String, alts: [String]) -> Best {
        var top: (String, Double)?
        for a in alts where !a.trimmingCharacters(in: .whitespaces).isEmpty {
            let s = LessonEngine.similarity(a, target)
            if top == nil || s > top!.1 { top = (a, s) }
        }
        guard let top else { return Best(heard: "", score: 0) }
        return Best(heard: top.0, score: Vocab.round(top.1 * 100))
    }
    /// codes after which a drill falls back to tapping the words
    public static let micBlocked: Set<String> = ["not-allowed", "service-not-allowed", "unsupported"]
}

/// `Speak` of web/js/speak/score.js
public enum SpeakScore {
    public static let cal = (a: 12.0, b: -9.6)
    public struct Word: Equatable, Sendable { public var w: String, ok: Bool }
    public struct Result: Equatable, Sendable {
        public var text: Double, words: [Word], wpm: Int, conf: Double, heard: String
        public var unclear = false, error: String?, intent: String?
    }
    /// lower-case, ’ → ', everything outside a-z 0-9 ' becomes a space, trimmed
    public static func norm(_ s: String) -> String {
        var out = ""
        for u in s.lowercased().replacingOccurrences(of: "\u{2019}", with: "'").unicodeScalars {
            if (u.value >= 97 && u.value <= 122) || (u.value >= 48 && u.value <= 57) || u == "'" { out.unicodeScalars.append(u) } else { out.append(" ") }
        }
        return out.trimmingCharacters(in: .whitespaces)
    }
    public static func toks(_ s: String) -> [String] { norm(s).split(separator: " ").map(String.init) }

    /// LCS alignment of the target words (shown with their punctuation) against what was heard
    public static func align(_ target: String, _ heard: String) -> [Word] {
        let shown = target.split(whereSeparator: { $0.isWhitespace }).map(String.init)
        let a = shown.map { norm($0).replacingOccurrences(of: " ", with: "") }, b = toks(heard)
        let n = a.count, m = b.count
        var L = Array(repeating: Array(repeating: 0, count: m + 1), count: n + 1)
        if n > 0 && m > 0 {
            for i in stride(from: n - 1, through: 0, by: -1) { for j in stride(from: m - 1, through: 0, by: -1) {
                L[i][j] = (!a[i].isEmpty && a[i] == b[j]) ? L[i + 1][j + 1] + 1 : max(L[i + 1][j], L[i][j + 1])
            } }
        }
        var ok = Array(repeating: false, count: n)
        var i = 0, j = 0
        while i < n && j < m {
            if !a[i].isEmpty && a[i] == b[j] { ok[i] = true; i += 1; j += 1 } else if L[i + 1][j] >= L[i][j + 1] { i += 1 } else { j += 1 }
        }
        return shown.enumerated().map { Word(w: $0.element, ok: ok[$0.offset] || a[$0.offset].isEmpty) }
    }
    public static func intentOf(_ heard: String, _ intents: [(id: String, keywords: [String])]) -> String? {
        let h = " " + toks(heard).joined(separator: " ") + " "
        for it in intents where it.keywords.contains(where: { h.contains(" " + toks($0).joined(separator: " ") + " ") }) { return it.id }
        return nil
    }
    /// `!unclear && σ(12·text − 9.6) ≥ 0.5` ⇔ text ≥ 0.8
    public static func pass(_ r: Result?) -> Bool {
        guard let r, !r.unclear else { return false }
        return 1 / (1 + exp(-(cal.a * r.text + cal.b))) >= 0.5
    }
    /// What `Speak.score` builds when the platform answers. `seconds` = max(1 ms, (end || now) − (start || call)) / 1000, measured by the platform layer
    /// (the web clamps the MILLISECONDS to ≥ 1, not the seconds: 2 words in 400 ms = 300 wpm).
    public static func result(target: String, heard: String, platformScore: Int?, seconds: Double, error: String? = nil,
                              intents: [(id: String, keywords: [String])]? = nil) -> Result {
        let words = align(target, heard), okN = words.filter(\.ok).count, n = toks(heard).count
        var r = Result(text: words.isEmpty ? 0 : Double(okN) / Double(words.count), words: words,
                       wpm: n > 0 ? Vocab.round(Double(n) / max(0.001, seconds) * 60) : 0, conf: Double(platformScore ?? 0) / 100, heard: heard)
        if heard.isEmpty { r.unclear = true; r.error = error }
        if let intents { r.intent = intentOf(heard, intents) }
        return r
    }
}

/// The accent of the learner's voices and recogniser (web `settings.accent`, default en-GB); #/speak, #/say and pair practice always use en-US.
public enum SpeakAccent {
    public static func locale(_ settings: JSON) -> String { settings.s("accent") == "us" ? "en-US" : "en-GB" }
    public static let us = "en-US"
    /// teacher names of the web → voice owner of `LKVoicePlayer`
    public static let ama = "ama", carlos = "carlos"
}
