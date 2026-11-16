import Foundation
import LKSync

/// The "Hiểu sâu" block of a word (web/js/wordcard.js): hand-written notes `js/notes/<letter>.json` → `{m: mnemonic, e: mistakes, u: exam use, f: family}`.
/// Port of the parsers: wrong → right pairs, family chips, exam-tagged lines. The explanations are Vietnamese learning content shown as authored.
public enum DeepNotes {
    public struct Pair: Equatable, Sendable { public var wrong: String, right: String, wrongNote: String, rightNote: String }
    public struct Errors: Equatable, Sendable { public var pairs: [Pair], notes: [String] }
    public struct Family: Equatable, Sendable { public var word: String?; public var pos: String; public var text: String
        public init(word: String?, pos: String, text: String) { self.word = word; self.pos = pos; self.text = text } }
    public struct Usage: Equatable, Sendable { public var tag: String, text: String }

    private static let vi = "[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]"
    private static func has(_ re: NSRegularExpression, _ s: String) -> Bool { re.firstMatch(in: s, range: NSRange(location: 0, length: (s as NSString).length)) != nil }
    private static let viRE = try! NSRegularExpression(pattern: vi, options: .caseInsensitive)
    static func isVi(_ s: String) -> Bool { has(viRE, s) }

    private static let wrong = "(?:(?:phát âm|nhấn(?: âm)?|viết|chính tả|dùng|ngữ pháp)\\s+)?sai|nhầm|wrong|incorrect|mistake|✗|❌|×"
    private static let right = "đúng|thường dùng|nên dùng|nên nói|right|correct|better|✓|✅"
    private static let lbl = try! NSRegularExpression(pattern: "(^|[\\s.;!?(])(?:" + wrong + ")\\s*:", options: .caseInsensitive)
    private static let wl = try! NSRegularExpression(pattern: "^(?:" + wrong + ")\\s*:\\s*", options: .caseInsensitive)
    private static let rl = try! NSRegularExpression(pattern: "^(?:" + right + ")\\s*:\\s*", options: .caseInsensitive)
    private static let arrow = try! NSRegularExpression(pattern: "\\s*(?:→|->|=>|⇒)\\s*")
    private static let tailRE = try! NSRegularExpression(pattern: "^(.*\\S)\\s*(\\([^()]*\\))$")

    private static func sub(_ s: String, _ r: NSRange) -> String { (s as NSString).substring(with: r) }
    private static func replace(_ re: NSRegularExpression, _ s: String, _ with: String) -> String { re.stringByReplacingMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length), withTemplate: with) }

    /// "analyse the data (không dùng about)" → ("analyse the data", "(không dùng about)")
    static func tail(_ s0: String) -> (String, String) {
        let s = s0.trimmingCharacters(in: .whitespacesAndNewlines)
        if let m = tailRE.firstMatch(in: s, range: NSRange(location: 0, length: (s as NSString).length)) {
            let a = sub(s, m.range(at: 1)), b = sub(s, m.range(at: 2))
            if isVi(b) && !isVi(a) { return (a, b) }
        }
        return (s, "")
    }
    static func sentences(_ s: String) -> [String] {
        let marked = try! NSRegularExpression(pattern: "([.!?])\\s+").stringByReplacingMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length), withTemplate: "$1\u{1F}")
        let lead = try! NSRegularExpression(pattern: "^[.;,\\s]+"), junk = try! NSRegularExpression(pattern: "[.;\\s]")
        return marked.components(separatedBy: "\u{1F}").map { replace(lead, $0.trimmingCharacters(in: .whitespacesAndNewlines), "") }
            .filter { replace(junk, $0, "").utf16.count > 1 }
    }
    /// end of the correct sentence inside `s` (the rest is a Vietnamese explanation)
    static func rightEnd(_ s: String) -> Int {
        let u = Array(s.utf16), n = u.count
        func isUpper(_ x: String) -> Bool { x.range(of: "^[A-ZĐ]", options: .regularExpression) != nil }
        var depth = 0, i = 0
        while i < n {
            let ch = u[i]
            if ch == 40 { depth += 1 } else if ch == 41 { depth = max(0, depth - 1) }
            else if depth == 0, [46, 63, 33, 8230, 59].contains(ch) {   // . ? ! … ;
                var j = i
                while j < n, [46, 63, 33, 8230, 59].contains(u[j]) { j += 1 }
                if j < n, !(u[j] == 32 || u[j] == 10 || u[j] == 9) { i = j; continue }
                let rest = String(decoding: u[j...], as: UTF16.self).trimmingCharacters(in: .whitespacesAndNewlines)
                let before = String(decoding: u[..<i], as: UTF16.self)
                let abbr = before.range(of: "(?:^|\\s)(?:Mr|Mrs|Ms|Dr|St|vs|etc|e\\.g|i\\.e)$", options: [.regularExpression, .caseInsensitive]) != nil
                let firstChunk = rest.split(omittingEmptySubsequences: false, whereSeparator: { ".?!".contains($0) }).first.map(String.init) ?? ""
                if ch == 59 || (!abbr && (isUpper(rest) || isVi(firstChunk))) { return ch == 59 || (ch == 46 && j - i == 1) ? i : j }
                i = j; continue
            }
            i += 1
        }
        return n
    }
    private static func unquote(_ s: String) -> String {
        var t = s
        let q: Set<Character> = ["\"", "'", "“", "‘", "”", "’"]
        if let f = t.first, q.contains(f) { t.removeFirst() }
        if let l = t.last, q.contains(l) { t.removeLast() }
        return t
    }
    public static func parseErrors(_ text: String) -> Errors {
        let s = text.trimmingCharacters(in: .whitespacesAndNewlines)
        var pairs: [Pair] = [], notes: [String] = []
        if s.isEmpty { return Errors(pairs: pairs, notes: notes) }
        let ns = s as NSString
        let cuts = lbl.matches(in: s, range: NSRange(location: 0, length: ns.length)).map { $0.range.location + $0.range(at: 1).length }
        if cuts.isEmpty { return Errors(pairs: [], notes: [s]) }
        notes += sentences(ns.substring(to: cuts[0]))
        for (i, c) in cuts.enumerated() {
            let end = i + 1 < cuts.count ? cuts[i + 1] : ns.length
            let raw = ns.substring(with: NSRange(location: c, length: end - c))
            let seg = replace(wl, raw, "")
            let sn = seg as NSString
            guard let a = arrow.firstMatch(in: seg, range: NSRange(location: 0, length: sn.length)) else { notes += sentences(raw); continue }
            let rest = replace(rl, sn.substring(from: a.range.location + a.range.length), "")
            let rn = rest as NSString
            let e = min(rightEnd(rest), rn.length)
            var rightText = rn.substring(to: e).trimmingCharacters(in: CharacterSet(charactersIn: " \t\n;"))
            if rightText.hasSuffix("."), !rightText.hasSuffix("..") { rightText.removeLast() }
            let (w, wn) = tail(sn.substring(to: a.range.location)), (r, rnote) = tail(rightText)
            if w.isEmpty || r.isEmpty { notes += sentences(raw); continue }
            pairs.append(Pair(wrong: unquote(w), right: unquote(r), wrongNote: wn, rightNote: rnote))
            notes += sentences(rn.substring(from: e))
        }
        return pairs.isEmpty ? Errors(pairs: [], notes: [s]) : Errors(pairs: pairs, notes: notes)
    }
    /// "curriculum (n), curricula (pl)" → chips; commas inside brackets do not split
    public static func parseFamily(_ text: String, head: String) -> [Family] {
        var parts: [String] = [], cur = "", depth = 0
        for ch in text {
            if ch == "(" { depth += 1 }
            if ch == ")" { depth = max(0, depth - 1) }
            if (ch == "," || ch == ";") && depth == 0 { parts.append(cur); cur = "" } else { cur.append(ch) }
        }
        parts.append(cur)
        let h = head.lowercased()
        let re = try! NSRegularExpression(pattern: "^(.+?)\\s*(?:\\(([^()]*)\\))?\\.?$")
        var out: [Family] = []
        for (idx, p0) in parts.enumerated() {
            let p = p0.trimmingCharacters(in: .whitespacesAndNewlines)
            if p.isEmpty { continue }
            var f = Family(word: nil, pos: "", text: p)
            if let m = re.firstMatch(in: p, range: NSRange(location: 0, length: (p as NSString).length)) {
                let w = sub(p, m.range(at: 1)).trimmingCharacters(in: .whitespaces)
                if !isVi(w) && w.count <= 40 {
                    f = Family(word: w, pos: m.range(at: 2).location == NSNotFound ? "" : sub(p, m.range(at: 2)).trimmingCharacters(in: .whitespaces), text: "")
                }
            }
            if idx == 0, let w = f.word, w.lowercased() == h { continue }
            out.append(f)
        }
        return out
    }
    private static let exam = try! NSRegularExpression(pattern: "^((?:IELTS|TOEIC|TOEFL|VSTEP)?\\s*(?:(?:Academic |General )?(?:Writing|Speaking|Listening|Reading)(?:\\s+(?:Task|Part)\\s*\\d(?:\\s*[/&-]\\s*\\d)?)?|Part\\s*\\d|Task\\s*\\d)|IELTS|TOEIC|TOEFL|VSTEP)\\s*[:–-]?\\s*", options: .caseInsensitive)
    public static func parseUsage(_ text: String) -> [Usage] {
        sentences(text).map { x in
            let ns = x as NSString
            if let m = exam.firstMatch(in: x, range: NSRange(location: 0, length: ns.length)) {
                let tag = sub(x, m.range(at: 1)).trimmingCharacters(in: .whitespaces)
                if !tag.isEmpty && ns.length > m.range.length { return Usage(tag: tag, text: ns.substring(from: m.range.length)) }
            }
            return Usage(tag: "", text: x)
        }
    }
    /// the note object of a word out of one letter file (`js/notes/<c>.json`)
    public static func note(_ letterFile: JSON, word: String) -> JSON? {
        let w = word.lowercased()
        guard let n = letterFile.object?[w], n.isObject else { return nil }
        return n
    }
    /// which letter file holds a word
    public static func file(for word: String) -> String {
        let c = word.lowercased().first.map(String.init) ?? "_"
        return c.range(of: "^[a-z]$", options: .regularExpression) != nil ? c : "_"
    }
}
