import Foundation
import LKSync
import LKCore

/// M4 P07 – #/speaking ("Phòng luyện Speaking": Part 1/2/3, the examiner reads the question, record, transcript, analysis, sample answer + shadowing).
/// Port of the pure parts of web/js/speaking.js; the recording, the recogniser and the clocks are platform inputs (vectors/speak.json `speaking.*`).
/// The numbers (targets, preparation time, fillers pattern) come from the content pack (`speaking.parts`, `speaking.fillers`), not from code.
public enum Speaking {
    public static let clockTickMs = 250, prepTickMs = 1000, openSpeakDelayMs = 400
    /// rate of the examiner / the sample (`tts(..., 0.95)`) and of the slow shadowing turtle
    public static let askRate = 0.95, slowRate = 0.7
    /// an answer shorter than this many words earns no reward, longer ones count `min(10, round(words / 10))` spoken
    public static let minRewardWords = 10

    public struct Part: Equatable, Sendable {
        public var id: String, name: String, desc: String, target: [Int], prep: Int?
        public var lo: Int { target.first ?? 0 }
        public var hi: Int { target.last ?? 0 }
    }
    public static let partIds = ["p1", "p2", "p3"]
    public static func part(_ id: String, _ pack: SpeakPack) -> Part {
        let p = pack.speaking["parts"]?[id] ?? .null
        return Part(id: id, name: p.s("name"), desc: p.s("desc"), target: p.list("target").map { Vocab.round($0.double ?? 0) }, prep: p["prep"]?.double.map { Vocab.round($0) })
    }
    public static func parts(_ pack: SpeakPack) -> [Part] { partIds.map { part($0, pack) } }

    /// `#/speaking/<part>/<topic>`: an unknown part ⇒ p1, a topic that is not a number or out of range ⇒ 0
    public static func route(_ arg: String?, bankCount: Int) -> (part: String, topic: Int) {
        let seg = (arg ?? "").split(separator: "/", omittingEmptySubsequences: false).map(String.init)
        let part = seg.first.map { partIds.contains($0) ? $0 : "p1" } ?? "p1"
        if seg.count > 1, !seg[1].isEmpty, seg[1].allSatisfy({ $0.isASCII && $0.isNumber }), let n = Int(seg[1]), n < bankCount { return (part, n) }
        return (part, 0)
    }
    public static func bank(_ pack: SpeakPack) -> [JSON] { pack.speaking.list("bank") }
    public static func questions(_ topic: JSON, part: String) -> [String] { part == "p2" ? [topic["p2"]?.s("q") ?? ""] : topic.strs(part) }
    /// what the examiner says: Part 2 reads the cue card
    public static func askText(_ topic: JSON, part: String, question: String) -> String {
        part == "p2" ? "\(topic["p2"]?.s("q") ?? "") You should say: \((topic["p2"]?.strs("points") ?? []).joined(separator: ", "))." : question
    }
    public static func tips(_ pack: SpeakPack, part: String) -> [String] { (pack.speaking["tips"]?.strs(part)) ?? [] }
    /// the sample answer of a question (key = the question; Part 2 = the cue card's first line) with its sentences and vocabulary chips
    public static func sample(_ pack: SpeakPack, key: String) -> (sentences: [String], vocab: [(en: String, vi: String)], text: String)? {
        guard let s = pack.speaking["samples"]?[key], !s.s("a").isEmpty else { return nil }
        return (VoiceCore.split(s.s("a")), s.list("vocab").map { ($0.array?.first?.string ?? "", $0.array?.dropFirst().first?.string ?? "") }, s.s("a"))
    }

    // MARK: clock
    public static func clock(_ seconds: Double) -> String {
        let s = max(0, seconds)
        return String(format: "%02d:%02d", Int(s / 60), Int(s.truncatingRemainder(dividingBy: 60)))
    }
    public enum Tone: Equatable, Sendable { case neutral, good, again }
    /// red above the end of the target zone, green from its start, neutral below
    public static func tone(_ seconds: Double, _ p: Part) -> Tone { seconds > Double(p.hi) ? .again : (seconds >= Double(p.lo) ? .good : .neutral) }
    /// Part 2 stops itself at the end of the zone (2 minutes)
    public static func autoStop(_ seconds: Double, _ p: Part) -> Bool { p.id == "p2" && seconds >= Double(p.hi) }

    // MARK: analysis
    public struct Chip: Equatable, Sendable { public var kind: String, text: String }
    public struct Analysis: Equatable, Sendable {
        public var seconds: Int, wpm: Int, words: Int, fillers: Int
        public var notes: [JSON]
        public var chips: [Chip]
        public var transcript: String
        public var reward: [String: Int]?
    }
    static let wordRe = try! NSRegularExpression(pattern: "[A-Za-z][A-Za-z'\u{2019}-]*")
    public static func wordCount(_ s: String) -> Int { wordRe.numberOfMatches(in: s, range: NSRange(s.startIndex..., in: s)) }
    /// `analyse(text, secs)`: `lexis` classifies the words (AWL, linking words, phrases), `topicWords` are the words of the topic found in the transcript
    public static func analyse(text: String, seconds: Double, part: Part, fillers: String, lexis: Lexis, topicWords: [String]) -> Analysis {
        let words = wordCount(text)
        let wpm = seconds > 3 ? Vocab.round(Double(words) / (seconds / 60)) : 0
        let fill = (try? NSRegularExpression(pattern: fillers, options: [.caseInsensitive])).map { $0.numberOfMatches(in: text, range: NSRange(text.startIndex..., in: text)) } ?? 0
        let a = text.isEmpty ? nil : lexis.analyze(text)
        var notes: [JSON] = []
        func note(_ k: String, _ v: [(String, JSON)] = []) { notes.append(v.isEmpty ? .obj([("k", .string(k))]) : .obj([("k", .string(k)), ("v", .obj(v))])) }
        if text.isEmpty { note("Không nhận được chữ nào – thử nói to, rõ hơn hoặc dùng Chrome/Edge để bật chuyển giọng nói thành chữ.") }
        if seconds < Double(part.lo) { note("Câu trả lời hơi ngắn ({s} giây). Hãy mở rộng: <b>nêu ý → giải thích lý do → ví dụ cụ thể</b>.", [("s", .int(Vocab.round(seconds)))]) }
        if seconds > Double(part.hi + 15) && part.id != "p2" { note("Câu trả lời khá dài – ở phần này nên trả lời gọn, đi thẳng vào ý.") }
        if wpm > 0 && wpm < 90 { note("Tốc độ {wpm} từ/phút hơi chậm – luyện nói liền mạch hơn, bớt ngắt quãng (mức tự nhiên ~110–160 từ/phút).", [("wpm", .int(wpm))]) }
        if wpm > 180 { note("Tốc độ {wpm} từ/phút khá nhanh – nói chậm lại để phát âm rõ và nhấn trọng âm đúng.", [("wpm", .int(wpm))]) }
        if fill >= 3 { note("Dùng {n} từ đệm (um, uh, like, you know…) – thay bằng cụm câu giờ tự nhiên: <i>“That's an interesting question…”, “Let me think…”</i>", [("n", .int(fill))]) }
        if let a, a.link.count < 2 && words > 30 { note("Thêm từ nối để mạch lạc: <i>Firstly, On top of that, For example, As a result…</i>") }
        if let a, a.phrases.isEmpty && words > 30 { note("Thử dùng 1–2 collocation hoặc idiom tự nhiên để tăng điểm Lexical Resource.") }
        if notes.isEmpty { note("Rất tốt! Độ dài, tốc độ và từ vựng đều ổn – hãy thử câu khác hoặc chủ đề khác.") }
        var chips = topicWords.map { Chip(kind: "ok", text: $0) }
        if let a { chips += a.awl.map { Chip(kind: "lv", text: $0) } + a.link.map { Chip(kind: "link", text: $0) } }
        return Analysis(seconds: Vocab.round(seconds), wpm: wpm, words: words, fillers: fill, notes: notes, chips: chips, transcript: text,
                        reward: words >= minRewardWords ? ["spoken": min(10, Vocab.round(Double(words) / 10)), "quizzes": 1, "xp": 15] : nil)
    }
    /// "Từ/phút" shown as "—" when there was nothing to measure
    public static func wpmShown(_ a: Analysis) -> String { a.wpm > 0 ? String(a.wpm) : "—" }
    /// the transcript the recogniser built: final results joined with a space, then the last interim text
    public static func transcript(final: [String], interim: String) -> String { (final.map { $0 + " " }.joined() + " " + interim).trimmingCharacters(in: .whitespaces) }
    /// the "live" line while recording: the last 160 characters of the final results (each followed by a space) and the interim text
    public static func live(final: [String], interim: String) -> String { String((final.map { $0 + " " }.joined() + interim).suffix(160)) }
    public static func live(_ s: String) -> String { String(s.suffix(160)) }
    /// the words of the topic found in the transcript (the word and its inflections, `UI.wordRegex`)
    public static func topicWordsFound(in text: String, words: [String]) -> [String] {
        guard !text.isEmpty else { return [] }
        let r = NSRange(text.startIndex..., in: text)
        return words.filter { w in StudyModes.wordRegex(w).map { $0.firstMatch(in: text, range: r) != nil } ?? false }
    }

    // MARK: shadowing of the sample
    public enum Verdict: Equatable, Sendable { case good, medium, again }
    public static func verdict(_ score: Int) -> Verdict { score >= 80 ? .good : (score >= 60 ? .medium : .again) }
    /// one run of the sample: the sum of the scores divided by the NUMBER OF SENTENCES (a skipped sentence adds 0)
    public struct Shadow: Equatable, Sendable {
        public let sentences: [String]
        public private(set) var k = 0, total = 0
        public init(_ sentences: [String]) { self.sentences = sentences }
        public var finished: Bool { k >= sentences.count }
        public var current: String { sentences[k] }
        public mutating func scored(_ score: Int) { total += score; k += 1 }
        public mutating func skip() { k += 1 }
        public var average: Int { sentences.isEmpty ? 0 : Vocab.round(Double(total) / Double(sentences.count)) }
        /// `reward({spoken:3, xp:10})` once the last sentence is done
        public static let reward: [String: Int] = ["spoken": 3, "xp": 10]
    }
}

public extension Lexis {
    /// `Lexis.analyze(text)` reduced to what Speaking uses: AWL words, linking words (single words, then linking phrases) in order of first use, and the phrase count
    struct Analysis: Sendable { public var awl: [String] = [], link: [String] = [], phrases: [String] = [] }
    func analyze(_ text: String) -> Analysis {
        var out = Analysis()
        let clean = text.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        for m in Speaking.wordRe.matches(in: clean, range: NSRange(clean.startIndex..., in: clean)) {
            let w = (clean as NSString).substring(with: m.range).lowercased().replacingOccurrences(of: "\u{2019}", with: "'")
            let c = classify(w)
            if let a = c.awl, !out.awl.contains(a) { out.awl.append(a) }
            if let l = c.link, !out.link.contains(l) { out.link.append(l) }
        }
        // the phrases in the order they occur in the text (web: `clean.replace(phraseRe, …)`)
        let types = Dictionary(data.phrases.map { ($0.text, $0.type) }, uniquingKeysWith: { a, _ in a })
        let alt = data.phrases.map { p in p.text.map { "\\^$.*+?()[]{}|".contains($0) ? "\\\($0)" : ($0 == " " ? "\\s+" : String($0)) }.joined() }.joined(separator: "|")
        if !alt.isEmpty, let re = try? NSRegularExpression(pattern: "\\b(\(alt))\\b", options: [.caseInsensitive]) {
            for m in re.matches(in: clean, range: NSRange(clean.startIndex..., in: clean)) {
                let k = (clean as NSString).substring(with: m.range).lowercased().split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
                if !out.phrases.contains(k) { out.phrases.append(k) }
                if types[k] == "link", !out.link.contains(k) { out.link.append(k) }
            }
        }
        return out
    }
}
