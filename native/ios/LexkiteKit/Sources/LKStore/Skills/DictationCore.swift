import Foundation
import LKSync

/// #/dictation/<part> (web listening.js:351): fill-in-the-gaps (≈35 % / ≈65 % of the words) or copy the whole sentence; verified by vectors `dictation.*`.
public enum Dictation {
    public static let modes = ["mid", "hard", "full"]
    static let ratios = ["mid": 0.35, "hard": 0.65]
    /// words that are never picked while enough content words exist
    static var stop: Set<String> { SkillsConsts.current.stopwords }
    /// the sentences to copy: speaker lines of ≥ 4 words (whitespace separated), in order → (script index, speaker key, text)
    public static func lines(_ p: JSON) -> [(i: Int, speaker: String, text: String)] {
        p.list("script").enumerated().compactMap { i, l in
            l.t("t") && l.s("t").split(whereSeparator: { $0.isWhitespace }).count >= 4 ? (i, l.s("s"), l.s("t")) : nil
        }
    }
    /// `?m=` beats the setting, default mid
    public static func mode(query: [String: String], settings: JSON) -> String { (query["m"].flatMap { $0.isEmpty ? nil : $0 }) ?? (settings.t("dictMode") ? settings.s("dictMode") : "mid") }
    public static func nextMode(_ m: String) -> String { m == "mid" ? "hard" : "full" }

    public static func toks(_ s: String) -> [String] {
        s.replacingOccurrences(of: "\u{2019}", with: "'").replacingOccurrences(of: "\u{2018}", with: "'").split(whereSeparator: { $0.isWhitespace }).map(String.init)
    }
    /// lower-case, only [a-z0-9'%]
    public static func clean(_ w: String) -> String { String(w.lowercased().unicodeScalars.filter { ("a"..."z").contains($0) || ("0"..."9").contains($0) || $0 == "'" || $0 == "%" }.map(Character.init)) }

    /// `holes(words, ratio)`: content words first, spread evenly (step = pool / need)
    public static func holes(_ words: [String], ratio: Double) -> [Int] {
        let idx = words.enumerated().map { ($0.offset, clean($0.element)) }.filter { !$0.1.isEmpty }
        let content = idx.filter { !stop.contains($0.1) }
        let need = max(1, Vocab.round(Double(idx.count) * ratio))
        let pool = content.count >= need ? content : idx
        let step = Double(pool.count) / Double(need)
        var pick = Set<Int>()
        var j = 0
        while j < need && j < pool.count { pick.insert(pool[Int((Double(j) * step).rounded(.down))].0); j += 1 }
        return pick.sorted()
    }

    public enum Cell: Equatable, Sendable {
        case word(String)
        /// a gap: the word's own punctuation stays outside, `size` = max(3, letters)
        case hole(index: Int, pre: String, size: Int, post: String)
    }
    private static let holeRe = try! NSRegularExpression(pattern: "^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9%']*)$")
    public static func cells(_ words: [String], mode: String) -> [Cell] {
        guard let ratio = ratios[mode] else { return words.map { .word($0) } }
        let h = Set(holes(words, ratio: ratio))
        return words.enumerated().map { i, w in
            guard h.contains(i) else { return .word(w) }
            let ns = w as NSString
            guard let m = holeRe.firstMatch(in: w, range: NSRange(location: 0, length: ns.length)) else { return .hole(index: i, pre: "", size: max(3, w.utf16.count), post: "") }
            let core = ns.substring(with: m.range(at: 2))
            return .hole(index: i, pre: ns.substring(with: m.range(at: 1)), size: max(3, core.utf16.count), post: ns.substring(with: m.range(at: 3)))
        }
    }
    /// what a gap is compared with and what "Đáp án" fills in
    public static func answer(_ word: String) -> String { word.replacingOccurrences(of: "^[^A-Za-z0-9]*|[^A-Za-z0-9%']*$", with: "", options: .regularExpression) }

    // MARK: checking
    public enum Mark: String, Equatable, Sendable { case ok, miss, extra }
    /// full sentence: LCS over the cleaned tokens → each target word ok / miss and each typed word that matched nothing extra; pct = LCS / target tokens
    public static func diff(target: String, given: String) -> (items: [(mark: Mark, text: String)], pct: Double) {
        let a = toks(target), b = toks(given).map(clean).filter { !$0.isEmpty }, A = a.map(clean)
        var dp = Array(repeating: Array(repeating: 0, count: b.count + 1), count: A.count + 1)
        if !A.isEmpty && !b.isEmpty {
            for x in stride(from: A.count - 1, through: 0, by: -1) { for y in stride(from: b.count - 1, through: 0, by: -1) {
                dp[x][y] = A[x] == b[y] ? dp[x + 1][y + 1] + 1 : max(dp[x + 1][y], dp[x][y + 1])
            } }
        }
        var out: [(Mark, String)] = [], x = 0, y = 0
        while x < A.count {
            if y < b.count && A[x] == b[y] { out.append((.ok, a[x])); x += 1; y += 1 }
            else if y < b.count && dp[x][y + 1] >= dp[x + 1][y] { out.append((.extra, b[y])); y += 1 }
            else { out.append((.miss, a[x])); x += 1 }
        }
        while y < b.count { out.append((.extra, b[y])); y += 1 }
        let n = A.filter { !$0.isEmpty }.count
        return (out.map { (mark: $0.0, text: $0.1) }, n > 0 ? Double(dp[0][0]) / Double(n) : 0)
    }

    public enum Typed: Equatable, Sendable { case holes([String]), full(String) }
    public struct Feedback: Equatable, Sendable {
        /// 0…1
        public var pct: Double
        public var percent: Int { Vocab.round(pct * 100) }
        public var ok: Bool { pct >= 0.9 }
        /// gaps: right of total; full: nil
        public var right: Int?
        public var of: Int?
        /// per gap: correct? and the word to show when not
        public var gaps: [(ok: Bool, answer: String)] = []
        public var diff: [(mark: Mark, text: String)] = []
        public static func == (a: Feedback, b: Feedback) -> Bool { a.pct == b.pct && a.right == b.right && a.of == b.of && a.gaps.map(\.ok) == b.gaps.map(\.ok) && a.diff.map(\.text) == b.diff.map(\.text) }
    }

    /// One sitting: the sentences, the mode, the score so far. `check` is the first press of the button, `advance` the second (or "Câu sau").
    public struct Session: Sendable {
        public let part: JSON
        public let lines: [(i: Int, speaker: String, text: String)]
        public private(set) var mode: String
        public private(set) var k = 0, done = 0
        public private(set) var score = 0.0
        public private(set) var feedback: Feedback?
        public init(part: JSON, mode: String) { self.part = part; self.mode = mode; lines = Dictation.lines(part) }
        public var finished: Bool { k >= lines.count }
        public var words: [String] { finished ? [] : Dictation.toks(lines[k].text) }
        public var cells: [Cell] { Dictation.cells(words, mode: mode) }
        public var checked: Bool { feedback != nil }
        /// the mode select: the same sentence is drawn again
        public mutating func setMode(_ m: String) { mode = m; feedback = nil }
        public mutating func previous() { if k > 0 { k -= 1; feedback = nil } }
        public mutating func skip() { k += 1; feedback = nil }
        /// "Xóa hết"
        public mutating func clear() { feedback = nil }
        public mutating func check(_ typed: Typed) {
            guard !finished, feedback == nil else { return }
            let text = lines[k].text, w = words
            var f: Feedback
            if mode == "full" {
                guard case .full(let g) = typed else { return }
                let d = Dictation.diff(target: text, given: g)
                f = Feedback(pct: d.pct, diff: d.items)
            } else {
                guard case .holes(let g) = typed else { return }
                let hs = cells.compactMap { c -> Int? in if case .hole(let i, _, _, _) = c { return i }; return nil }
                var gaps: [(Bool, String)] = []
                for (j, i) in hs.enumerated() { let ok = Dictation.clean(j < g.count ? g[j] : "") == Dictation.clean(w[i]); gaps.append((ok, ok ? "" : w[i])) }
                let r = gaps.filter(\.0).count
                f = Feedback(pct: hs.isEmpty ? 1 : Double(r) / Double(hs.count), right: r, of: hs.count, gaps: gaps.map { (ok: $0.0, answer: $0.1) })
            }
            done += 1; score += f.pct; feedback = f
        }
        /// the second press: next sentence
        public mutating func advance() { if feedback != nil { k += 1; feedback = nil } }

        public struct Finish: Sendable {
            public var pct: Int, count: Int
            public var reward: [String: Int], links: [String]
            public var dictDone: Double
        }
        /// the end page: round(Σ pct / done · 100), the reward and the links; `old` = game.dictDone[part]
        public func finish(old: Double?) -> Finish {
            let pct = done > 0 ? Vocab.round(score / Double(done) * 100) : 0, id = part.s("id")
            return Finish(pct: pct, count: done, reward: ["quizzes": 1, "dictations": 1, "xp": 10 + Vocab.round(Double(pct) / 5)],
                          links: ["#/listen/\(id)", "#/dictation/\(id)?m=\(Dictation.nextMode(mode))", "#/listening"], dictDone: max(Double(pct), old ?? 0))
        }
    }
}
