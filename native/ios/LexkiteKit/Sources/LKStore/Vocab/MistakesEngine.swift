import Foundation
import LKSync

/// #/mistakes – port of web/js/plan.js (logMistake, migrate, mistakeView, list / tabs / retry / settle). The book is the array stored
/// under `Store 'mistakes'` (device only, never synced): `{kind,q,qK?,given,givenK?,explain,explainK?,answer,ref,key,n,at,fixed}`.
public enum MistakesEngine {
    /// `t(key, vars)` of the UI language; the default only fills `{name}` (Vietnamese keys are their own text).
    public typealias Translate = (String, JSON?) -> String
    public static let defaultTranslate: Translate = { k, v in fill(k, v) }
    public static let kinds = ["vocab", "grammar", "reading", "listening"]
    public static let maxRecords = 300
    /// XP: "Đã hiểu" 2 · right in retry 3
    public static let xpUnderstood = 2, xpRetryRight = 3
    static let lz = ["q", "given", "explain"]
    static let listenQ = "Gõ lại từ bạn nghe được"
    static let wordQ = "Nghĩa của “{word}”?"
    /// templates the old (text-only) records are recognised by
    static let templates = ["{title} – câu {n}: {q}", "{title} – Câu {n}: {q}", "Test {t} – Câu {n}: {q}", "Thi thử – câu {n}: {q}", "Từ tiếng Anh nghĩa là “{vi}”?", "Điền từ: {sentence}", wordQ, listenQ, "(bỏ trống)", "Nghe: “…{cue}…”", "Tham khảo: “…{cue}…”"]

    /// web `t()` interpolation: every `{name}` replaced by the variable's text
    public static func fill(_ template: String, _ vars: JSON?) -> String {
        var s = template
        for (k, v) in vars?.object ?? [:] { s = s.replacingOccurrences(of: "{" + k + "}", with: v.jsToString) }
        return s
    }
    static func tr(_ x: JSON, _ f: String, _ t: Translate) -> String {
        if let k = x[f + "K"], k.truthy { return t(k.s("k"), k["v"]) }
        return x[f]?.jsToString ?? ""
    }
    static func keyText(_ qK: JSON) -> String { qK.s("k") + (qK["v"].map { $0.stableString } ?? "undefined") }

    /// App.logMistake: same key → updated in place (n+1, at, reopened); new → on top; newest 300 kept.
    public static func log(_ list: [JSON], _ mistake: JSON, now: Int64, translate t: Translate = defaultTranslate) -> [JSON] {
        var m = mistake.object ?? [:]
        for f in lz { if let v = m[f], case .object = v { m[f + "K"] = v; m[f] = .string(t(v.s("k"), v["v"])) } }
        let mj = JSON.object(m)
        let key = mj.s("kind") + "|" + (mj["qK"].map { $0.truthy ? keyText($0) : mj.s("q") } ?? mj.s("q"))
        var out = list
        if let i = out.firstIndex(where: { $0.s("key") == key }) {
            out[i]["n"] = .number((JSON.truthy(out[i]["n"]) ? JSON.orZero(out[i]["n"]) : 1) + 1)
            out[i]["at"] = .number(Double(now)); out[i]["fixed"] = false
        } else {
            m["key"] = .string(key); m["n"] = 1; m["at"] = .number(Double(now)); m["fixed"] = false
            out.insert(.object(m), at: 0)
        }
        return Array(out.prefix(maxRecords))
    }

    /// recover `qK/givenK/explainK` of old records from the known templates; returns how many fields changed.
    /// `alternatives(template)` lets the UI add the same template in the English / current UI language.
    @discardableResult
    public static func migrate(_ list: inout [JSON], alternatives: (String) -> [String] = { _ in [] }) -> Int {
        var changed = 0
        for i in list.indices {
            for f in lz {
                guard case .string(let text)? = list[i][f], list[i][f + "K"] == nil else { continue }
                if let o = unkey(text, alternatives) { list[i][f + "K"] = o; changed += 1 }
            }
        }
        return changed
    }
    static func unkey(_ s: String, _ alternatives: (String) -> [String]) -> JSON? {
        for k in templates {
            var pats: [String] = []
            for p in [k] + alternatives(k) where !pats.contains(p) { pats.append(p) }
            for pat in pats {
                var names: [String] = [], re = "^"
                var i = pat.startIndex
                while i < pat.endIndex {
                    if pat[i] == "{", let close = pat[i...].firstIndex(of: "}"), pat[pat.index(after: i)..<close].allSatisfy({ $0.isLetter || $0.isNumber || $0 == "_" }), close > pat.index(after: i) {
                        names.append(String(pat[pat.index(after: i)..<close])); re += "([\\s\\S]*?)"; i = pat.index(after: close)
                    } else { re += NSRegularExpression.escapedPattern(for: String(pat[i])); i = pat.index(after: i) }
                }
                re += "$"
                guard let rx = try? NSRegularExpression(pattern: re), let m = rx.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { continue }
                var vars: [String: JSON] = [:]
                for (n, name) in names.enumerated() { if let r = Range(m.range(at: n + 1), in: s) { vars[name] = .string(String(s[r])) } }
                return .obj([("k", .string(k)), ("v", .object(vars))])
            }
        }
        return nil
    }

    public struct View: Equatable, Sendable { public var q = "", qSay = "", qIpa = "", given = "", ans = "", ansSay = "", ansIpa = "", tip = "" }

    static func norm(_ s: String) -> String { s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ").lowercased() }
    static func matches(_ s: String, _ re: String) -> Bool { s.range(of: re, options: [.regularExpression, .caseInsensitive]) != nil }
    /// App.mistakeView: one IPA + one speaker per word; `tip` = the explanation minus what the card already shows.
    public static func view(_ x: JSON, translate t: Translate = defaultTranslate) -> View {
        let ref = x.s("ref")
        let word = x.s("kind") == "vocab" && !ref.isEmpty && matches(ref, "^[a-z][a-z' .-]*$") ? ref : ""
        let ans = (x["answer"].map { $0.truthy ? $0.jsToString : "" } ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        var q = tr(x, "q", t), qK = x["qK"]?["k"]?.string
        let qW = (qK == wordQ ? (x["qK"]?["v"]?["word"].map { $0.truthy ? $0.jsToString : "" } ?? "") : "")
        if !qW.isEmpty && norm(qW) == norm(ans) { qK = listenQ; q = t(listenQ, nil) }
        var v = View()
        v.q = q; v.given = JSON.truthy(x["given"]) ? tr(x, "given", t) : ""; v.ans = ans
        let en = !ans.isEmpty && matches(ans, "[a-z]{2}") && ans.range(of: "^[\\x20-\\x7E\u{2018}\u{2019}\u{201C}\u{201D}\u{2013}\u{2014}\u{2026}]+$", options: .regularExpression) != nil && ans.range(of: "_{2,}", options: .regularExpression) == nil
        let short = x.s("kind") == "vocab" && ans.split(whereSeparator: { $0.isWhitespace }).count <= 3
        if qK == listenQ { v.qSay = !word.isEmpty ? word : (en ? ans : ""); if en && short { v.ansIpa = ans } }
        else if !qW.isEmpty { v.qSay = qW; v.qIpa = qW }
        else if en { v.ansSay = ans; if short { v.ansIpa = ans } }
        var tip = tr(x, "explain", t).trimmingCharacters(in: .whitespacesAndNewlines)
        var auto: String?
        if !word.isEmpty, let rx = try? NSRegularExpression(pattern: "^" + NSRegularExpression.escapedPattern(for: word) + "\\s*(/[^/]*/)?\\s*=\\s*([\\s\\S]+)$", options: [.caseInsensitive]),
           let m = rx.firstMatch(in: tip, range: NSRange(tip.startIndex..., in: tip)), let r = Range(m.range(at: 2), in: tip) {
            auto = String(tip[r]).trimmingCharacters(in: .whitespacesAndNewlines); tip = auto!
        }
        let shown = norm([v.q, v.given, v.ans].joined(separator: " | "))
        if !tip.isEmpty && (norm(tip) == norm(ans) || (auto != nil && shown.contains(norm(tip)))) { tip = "" }
        v.tip = tip
        return v
    }

    // MARK: list / tabs / retry
    public static func open(_ list: [JSON]) -> [JSON] { list.filter { !$0.t("fixed") } }
    /// tab counts: "all" + one per kind (open records only)
    public static func counts(_ list: [JSON]) -> [String: Int] {
        let o = open(list)
        var c = ["all": o.count]
        for k in kinds { c[k] = o.filter { $0.s("kind") == k }.count }
        return c
    }
    /// rows of a tab ("" = all) – newest first as stored; in retry mode the most-missed first (stable)
    public static func rows(_ list: [JSON], kind: String = "", retry: Bool = false) -> [JSON] {
        let r = open(list).filter { kind.isEmpty || $0.s("kind") == kind }
        guard retry else { return r }
        func n(_ x: JSON) -> Double { JSON.truthy(x["n"]) ? JSON.orZero(x["n"]) : 1 }
        return Vocab.stableSorted(r) { n($0) > n($1) }
    }
    /// retry: a short answer (≤ 4 words) is typed, a long one is revealed and self-graded
    public static func isShortAnswer(_ x: JSON) -> Bool { x.s("answer").split(whereSeparator: { $0.isWhitespace }).count <= 4 }
    /// typed retry answer – compared with `PracticeEngine.qeNorm` like the web when qengine is loaded
    public static func isRight(typed: String, answer: String) -> Bool { PracticeEngine.qeNorm(typed) == PracticeEngine.qeNorm(answer) }

    public struct Settled: Sendable { public var list: [JSON]; public var xp: Int }
    /// right → fixed (+3 XP); wrong → n+1
    public static func settle(_ list: [JSON], key: String, right: Bool) -> Settled {
        var out = list
        if let i = out.firstIndex(where: { $0.s("key") == key }) {
            if right { out[i]["fixed"] = true } else { out[i]["n"] = .number((JSON.truthy(out[i]["n"]) ? JSON.orZero(out[i]["n"]) : 1) + 1) }
        }
        return Settled(list: out, xp: right ? xpRetryRight : 0)
    }
    /// "Đã hiểu" (+2 XP)
    public static func understood(_ list: [JSON], key: String) -> Settled {
        var out = list
        if let i = out.firstIndex(where: { $0.s("key") == key }) { out[i]["fixed"] = true }
        return Settled(list: out, xp: xpUnderstood)
    }
    /// "Dọn lỗi đã sửa"
    public static func clearFixed(_ list: [JSON]) -> [JSON] { list.filter { !$0.t("fixed") } }
}
