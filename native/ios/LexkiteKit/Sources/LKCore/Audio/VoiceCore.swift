import Foundation

/// C04 – pure audio logic: a port of web/js/audio.js (voice choice), web/js/ui.js (CDN origins, file keys, ttsClean) and web/js/listen/kvoice.js (line key, split).
/// Verified against native/shared/gen/vectors/audio.json (generated from the real JS). Playback itself lives in LKFeatures (LKVoicePlayer).
public enum VoiceCore {
    // MARK: file keys
    /// FNV-1a 32-bit over UTF-16 code units, base 36 (web `fnv36` / `KVoice.lineKey` hash).
    public static func fnv36(_ s: String) -> String {
        var h: UInt32 = 0x811c9dc5
        for u in s.utf16 { h ^= UInt32(u); h = h &* 0x01000193 }
        return String(h, radix: 36)
    }
    /// Sentence file key: `KVoice.lineKey(voice, text)`.
    public static func lineKey(voice: String, text: String) -> String { fnv36(voice + "|" + text.trimmingCharacters(in: .whitespacesAndNewlines)) }
    /// Single-word file key (web ui.js speak(): `fnv36(voice + '|' + headword.trim() + WAV)`).
    public static let wordSuffix = "|s3"
    public static func wordKey(voice: String, headword: String) -> String { fnv36(voice + "|" + headword.trimmingCharacters(in: .whitespacesAndNewlines) + wordSuffix) }
    /// Default Kokoro word voice per accent (web `Target.wordVoice` for English).
    public static func wordVoice(accent: String) -> String { accent == "en-US" ? "af_heart" : "bf_emma" }

    // MARK: CDN origins
    /// Priority order of the audio origins (web `AUDIO_BASES`). Each origin gets two failures before the next one becomes the first choice.
    public static let bases = ["https://audio.lexkite.com/audio/l/", "https://lexkiteapp.github.io/lexkite-media-2/audio/l/", "https://lexkiteapp.github.io/audio/l/"]
    public enum Kind: String, Sendable { case sentence = "l", word = "w" }
    /// URLs to try in order for `key`, given the number of accumulated failures (web `audioUrls`). `s2` = keys re-rendered through the ASR gate (sentences only; empty natively).
    public static func urls(kind: Kind, key: String, fails: Int, s2: Set<String> = []) -> [URL] {
        let at = min(bases.count - 1, max(0, fails) >> 1)
        return bases[at...].compactMap { b in
            let base = kind == .word ? String(b.dropLast(2)) + "w/" : b
            return URL(string: base + (kind == .sentence && s2.contains(key) ? key + "-s2" : key) + ".mp3")
        }
    }

    // MARK: text
    /// `KVoice.split`: one file per sentence, pieces ≤ 220 characters.
    public static func split(_ text: String) -> [String] {
        let flat = text.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        let re = try! NSRegularExpression(pattern: "[^.!?;:]+[.!?;:]+[\"\u{201D}\u{2019})]*|[^.!?;:]+$")
        let ns = flat as NSString
        var parts = re.matches(in: flat, range: NSRange(location: 0, length: ns.length)).map { ns.substring(with: $0.range) }
        if parts.isEmpty { parts = [text] }
        var out: [String] = []
        for raw in parts {
            var p = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            if p.isEmpty { continue }
            while p.utf16.count > 220 {
                let u = Array(p.utf16)
                func last(_ ch: UInt16) -> Int? { u[0...200].lastIndex(of: ch) }
                var cut: Int
                if let c = last(44), c > 60 { cut = c + 1 } else { cut = last(32) ?? -1 }
                if cut < 0 { cut = u.count + cut + 1 }   // JS slice(0, -1) semantics when no space (never happens with real text)
                out.append(String(utf16CodeUnits: Array(u[0..<cut]), count: cut).trimmingCharacters(in: .whitespacesAndNewlines))
                p = String(utf16CodeUnits: Array(u[cut...]), count: u.count - cut).trimmingCharacters(in: .whitespacesAndNewlines)
            }
            out.append(p)
        }
        return out
    }

    private static let emo = try! NSRegularExpression(pattern: "[\\p{Extended_Pictographic}\\x{1F1E6}-\\x{1F1FF}\\x{1F3FB}-\\x{1F3FF}\\x{FE0E}\\x{FE0F}\\x{200D}\\x{20E3}]+")
    private static let ipa = try! NSRegularExpression(pattern: "(^|\\s)/[^\\s/](?:[^/\\n]{0,78}[^\\s/])?/(?=[\\s,.;:!?)]|$)")
    private static let posAlt = "n|v|adj|adv|det|prep|pron|conj|int|num|aux|modal|phr\\.? ?v|noun|verb|adjective|adverb|determiner|preposition|pronoun|conjunction|phrasal verb|idiom"
    private static let labels = ["Ví dụ", "Example", "Câu ví dụ", "Câu của bạn", "Your sentence", "Ngữ cảnh của bạn", "Định nghĩa", "Definition"]
    private static func rx(_ p: String, _ ci: Bool = false) -> NSRegularExpression { try! NSRegularExpression(pattern: p, options: ci ? [.caseInsensitive] : []) }
    private static func has(_ re: NSRegularExpression, _ s: String) -> Bool { re.firstMatch(in: s, range: NSRange(location: 0, length: (s as NSString).length)) != nil }
    private static func squash(_ s: String) -> String { s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ") }

    /// Clean a string before it is read aloud: drop emoji, /IPA/, UK/US, part of speech and card section labels
    /// ("📚 curriculum /kəˈrɪkjələm/ UK US n 💬 Ví dụ Many people…" → the English sentence). Ordinary sentences stay unchanged.
    public static func ttsClean(_ text: String) -> String {
        var s = squash(text)
        if s.isEmpty || !(has(emo, s) || has(ipa, s)) { return s }
        let M = "\u{1}"
        func lb(_ l: [String]) -> String { l.map { NSRegularExpression.escapedPattern(for: $0) }.joined(separator: "|") }
        func full(_ x: String) -> NSRange { NSRange(location: 0, length: (x as NSString).length) }
        s = emo.stringByReplacingMatches(in: s, range: full(s), withTemplate: " \(M) ")
        s = ipa.stringByReplacingMatches(in: s, range: full(s), withTemplate: "$1\(M) ")
        // text after the LAST section label ("💬 Ví dụ") is the sentence to read
        let sep = rx("\(M)\\s*(?:\(lb(Array(labels[0..<5]))))\\s*:?", true)
        let ns = s as NSString
        var pieces: [String] = [], at = 0
        for m in sep.matches(in: s, range: full(s)) { pieces.append(ns.substring(with: NSRange(location: at, length: m.range.location - at))); at = m.range.location + m.range.length }
        pieces.append(ns.substring(from: at))
        if pieces.count > 1, let l = pieces.last, l.range(of: "[A-Za-z]", options: .regularExpression) != nil { s = l }
        let tag = rx("\(M)\\s*(?:UK|US|BrE|AmE|(?:\(posAlt))\\.?|\(lb(labels)))(?=[\\s:.,\(M)]|$)\\s*:?", true)
        var i = 0
        while i < 16, let m = tag.firstMatch(in: s, range: full(s)) { s = (s as NSString).replacingCharacters(in: m.range, with: M); i += 1 }
        s = squash(s.components(separatedBy: M).joined(separator: " "))
        s = rx("\\s+([,.;:!?])").stringByReplacingMatches(in: s, range: full(s), withTemplate: "$1")
        s = rx("^[\\s,.;:·•|–—-]+|[\\s,;:·•|–—-]+$").stringByReplacingMatches(in: s, range: full(s), withTemplate: "")
        return s.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    // MARK: system voices
    private static let fem = rx("\\b(Female|Samantha|Ava|Allison|Susan|Zoe|Serena|Kate|Martha|Libby|Sonia|Jenny|Aria|Ana|Karen|Moira|Tessa|Fiona|Victoria|Joanna|Salli|Kimberly|Ivy|Kendra|Emma|Amy|Hazel|Zira|Catherine|Nicky|Stephanie|Michelle|Emily|Olivia|Sara|Nancy|Heather|Jane|Ashley|Cora|Elizabeth|Maisie|Bella|Abbi|Hollie|Shelley|Sandy|Flo|Grandma|Kathy|Vicki)\\b", true)
    private static let male = rx("\\b(Male|Daniel|Oliver|Arthur|Tom|Evan|Alex|Fred|Ryan|Guy|Davis|Christopher|Eric|Brian|Matthew|Joey|Justin|George|David|Mark|James|Aaron|Rishi|Reed|Rocko|Eddy|Gordon|Lee|Nathan|Thomas|Andrew|Roger|Steffan|Tony|Jason|Ralph|Albert|Junior|Grandpa|Alfie|Elliot|Noah|Ethan|William|Jacob|Bruce)\\b", true)
    /// "f" | "m" | "" from an OS voice name.
    public static func genderOf(_ name: String?) -> String {
        let n = name ?? ""
        let f = has(fem, n), m = has(male, n)
        if f && !m { return "f" }
        if m && !f { return "m" }
        if n.range(of: "Female", options: .caseInsensitive) != nil { return "f" }
        if n.range(of: "Male", options: .caseInsensitive) != nil { return "m" }
        return ""
    }
    /// Kokoro voice id (af_heart, am_michael, bf_emma, bm_george) → accent + gender.
    public static func kokoro(_ id: String?) -> (accent: String, gender: String)? {
        guard let id, id.count >= 3 else { return nil }
        let c = Array(id)
        guard (c[0] == "a" || c[0] == "b"), (c[1] == "f" || c[1] == "m"), c[2] == "_" else { return nil }
        return (c[0] == "a" ? "en-US" : "en-GB", String(c[1]))
    }
    /// Speaker (ama / carlos / Kokoro id / "f" / "m") → wanted gender. Ama = af_heart (f), Carlos = am_michael (m).
    public static func genderFor(_ who: String?) -> String {
        guard let who else { return "" }
        if who == "f" || who == "m" { return who }
        if let k = kokoro(who) { return k.gender }
        return who == "carlos" ? "m" : who == "ama" ? "f" : ""
    }

    public struct SystemVoice: Equatable, Sendable {
        public var name: String, lang: String, localService: Bool?
        public init(name: String, lang: String, localService: Bool? = nil) { self.name = name; self.lang = lang; self.localService = localService }
    }
    private static func test(_ p: String, _ s: String, _ ci: Bool = true) -> Bool { s.range(of: p, options: ci ? [.regularExpression, .caseInsensitive] : .regularExpression) != nil }
    /// Ranking score of a system voice (web `voiceScore`); −1 = unusable. English only (the web has no other target table).
    public static func voiceScore(_ v: SystemVoice, accent: String, gender: String) -> Int {
        var s = 0
        let n = v.name, lang = v.lang.replacingOccurrences(of: "_", with: "-")
        if lang == accent { s += 100 } else if lang.hasPrefix("en") { s += 10 } else { return -1 }
        if test("Natural|Neural|Online", n) { s += 60 }
        if test("^Google (UK|US) English", n) { s += 50 }
        if test("Premium|Enhanced|Siri", n) { s += 45 }
        if test("Daniel|Serena|Kate|Oliver|Arthur|Martha|Samantha|Ava|Evan|Zoe|Allison|Tom|Susan", n) { s += 20 }
        if test("Fred|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Zarvox|Trinoids|Whisper|Junior|Ralph|Kathy|Jester|Organ|Superstar|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley", n) { s -= 200 }
        if v.localService == false { s += 5 }
        if !gender.isEmpty {
            let gv = genderOf(n)
            if gv == gender { s += 150 } else if !gv.isEmpty { s -= 150 }
        }
        return s
    }
    public static func rank(_ voices: [SystemVoice], accent: String, gender: String) -> [SystemVoice] {
        let scored = voices.enumerated().map { ($0.offset, $0.element, voiceScore($0.element, accent: accent, gender: gender)) }.filter { $0.2 > 0 }
        return scored.sorted { $0.2 != $1.2 ? $0.2 > $1.2 : $0.0 < $1.0 }.map { $0.1 }
    }
    /// The learner's chosen voice if it has the wanted gender, otherwise the best scoring one.
    public static func pickVoice(_ voices: [SystemVoice], accent: String, gender: String, want: String? = nil) -> SystemVoice? {
        let list = rank(voices, accent: accent, gender: gender)
        if let want, !want.isEmpty, let mine = list.first(where: { $0.name == want }) {
            let g = genderOf(mine.name)
            if gender.isEmpty || g.isEmpty || g == gender { return mine }
        }
        return list.first
    }
}
