import Foundation

/// Answer checking – port of web/js/lesson/engine.js norm/check, verified by the shared conformance vectors.
public enum Answer {
    public static func norm(_ s: String) -> String {
        var x = s.lowercased().replacingOccurrences(of: "\u{2019}", with: "'").replacingOccurrences(of: "\u{2018}", with: "'")
        // JS: replace(/[^a-z0-9' -]+/g, ' ') on UTF-16 units – keep only ASCII letters/digits/apostrophe/space/hyphen
        var kept = String.UnicodeScalarView()
        let space: Unicode.Scalar = " "
        for c in x.unicodeScalars {
            let v: UInt32 = c.value   // a-z 97…122 · 0-9 48…57 · ' 39 · space 32 · - 45
            let keep: Bool = (v >= 97 && v <= 122) || (v >= 48 && v <= 57) || v == 39 || v == 32 || v == 45
            kept.append(keep ? c : space)
        }
        x = String(kept)
        x = x.replacingOccurrences(of: "-", with: " ")
        return x.split(whereSeparator: { $0 == " " || $0 == "\t" || $0 == "\n" }).joined(separator: " ")
    }
    public static func same(_ a: String, _ b: String) -> Bool { norm(a) == norm(b) }

    public enum Given { case text(String), words([String]), score(Double), matched(Bool) }
    public struct Item { public let type: String, answer: String, choice: Bool
        public init(type: String, answer: String, choice: Bool = false) { self.type = type; self.answer = answer; self.choice = choice } }

    public static func check(_ it: Item, _ ans: Given) -> Bool {
        if it.type == "say" || (it.type == "pic" && !it.choice) {
            if case .score(let v) = ans { return v >= 0.7 }
            if case .text(let t) = ans { return same(t, it.answer) }
            return false
        }
        if it.type == "build" || it.type == "tr" {
            switch ans { case .words(let w): return same(w.joined(separator: " "), it.answer); case .text(let t): return same(t, it.answer); default: return false }
        }
        if it.type == "match" { if case .matched(let m) = ans { return m }; return false }
        if case .text(let t) = ans { return same(t, it.answer) }
        return false
    }
}
