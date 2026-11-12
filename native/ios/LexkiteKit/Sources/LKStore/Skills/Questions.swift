import Foundation
import LKSync

/// web/js/qengine.js (grading, band) + qtips.js (`kindOf`, `record`) + the transcript of listening.js – the pure part, shared by Listening and Reading.
/// Question groups are the content JSON: `{type form|note|table|summary|sentence|mcq|match|multi|tfng|ynng, instr, title?, limit?, items[{n,text|q,a,options?,cue,explain}], options?, n?, a?}`.
public struct QAnswers: Equatable, Sendable {
    /// question number → picked option index ("0", "1"…) · TRUE/FALSE/… · option letter · typed gap text
    public var one: [Int: String] = [:]
    /// group index → picked letters of a "choose 2" group
    public var multi: [Int: [String]] = [:]
    public init(one: [Int: String] = [:], multi: [Int: [String]] = [:]) { self.one = one; self.multi = multi }
    /// the answered state of one question (progress bar)
    public func answered(_ n: Int) -> Bool { !(one[n] ?? "").trimmingCharacters(in: .whitespaces).isEmpty }
}

public struct QResult: Equatable, Sendable {
    public var n: Int, ok: Bool
    public var over = false
    public var given: String, answer: String, cue: String, q: String
    public var type: String, kind: String
    public var alts: [String] = []
    public var limit: Int?
}

public enum QE {
    public static let letters = Array("ABCDEFGH").map(String.init)
    public static let tf: [String: [String]] = ["tfng": ["TRUE", "FALSE", "NOT GIVEN"], "ynng": ["YES", "NO", "NOT GIVEN"]]
    /// raw score → band: first row with raw ≥ min (published scales, reference only)
    static var bandRows: [String: [(Int, Double)]] { SkillsConsts.current.band }
    public static func bandOf(_ raw: Int, skill: String = "listening") -> Double { (bandRows[skill] ?? []).first { raw >= $0.0 }?.1 ?? 0 }
    /// IELTS overall: mean of the bands, .25 → .5, .75 → next whole
    public static func overall(_ bands: [Double]) -> Double {
        let avg = bands.reduce(0, +) / Double(bands.count), f = avg - avg.rounded(.down)
        return avg.rounded(.down) + (f >= 0.75 ? 1 : f >= 0.25 ? 0.5 : 0)
    }

    // MARK: grading
    private static func sub(_ s: String, _ p: String, _ t: String) -> String { s.replacingOccurrences(of: p, with: t, options: .regularExpression) }
    public static func norm(_ s: String) -> String {
        var x = s.lowercased()
        for c in ["\u{2019}", "\u{2018}", "`"] { x = x.replacingOccurrences(of: c, with: "'") }
        x = sub(x, "[£$€]", "")
        x = sub(x, "(\\d),(\\d{3})", "$1$2")
        x = sub(x, "[.,!?;:\"\u{201C}\u{201D}()]", " ")
        x = x.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        return sub(x, "^(the|a|an) ", "")
    }
    /// a decimal / time / date number (7.45, 10:30, 1/11) counts as ONE word
    public static func words(_ s: String) -> Int { norm(sub(s, "(\\d)[.:/](\\d)", "$1$2")).split(separator: " ").count }
    public static func gradeGap(a: [String], limit: Int?, given: String) -> (ok: Bool, over: Bool, empty: Bool) {
        if given.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return (false, false, true) }
        let over = (limit ?? 0) > 0 && words(given) > limit!
        return (!over && a.contains { norm($0) == norm(given) }, over, false)
    }
    /// first space-separated token of an option ("E must be booked") and the rest
    public static func code(_ o: String) -> String { String(o.split(separator: " ", maxSplits: 1, omittingEmptySubsequences: false).first ?? "") }
    public static func label(_ o: String) -> String { String(o.dropFirst(code(o).count + 1)) }

    /// qtips.js `kindOf`: the detailed question type of a group
    public static func kindOf(_ gr: JSON) -> String {
        if gr.t("photo") { return "p1" }
        let type = gr.s("type"), opts = gr.strs("options"), ins = gr.s("instr") + " " + gr.s("title")
        func has(_ p: String, _ s: String) -> Bool { s.range(of: p, options: [.regularExpression, .caseInsensitive]) != nil }
        if ["tfng", "ynng", "mcq", "multi"].contains(type) { return type }
        if type == "match" {
            if has("heading", ins) || opts.map(code).contains(where: { has("^[ivx]+$", $0) }) { return "headings" }
            if has("correct ending", ins) { return "endings" }
            if has("where is|located|\\bmap\\b|\\bplan\\b|diagram", ins) { return "map" }
            if has("which (paragraph|text|advertisement|plan|section)", ins) { return "info" }
            if has("from the (passage|text)|list of (people|researchers|res)", ins) || has("Look at the following", ins) { return "features" }
            return opts.allSatisfy({ label($0).isEmpty }) ? "info" : "lmatch"
        }
        if has("\\bmap\\b|\\bplan\\b|diagram", ins) { return "map" }
        if type == "summary" { return "summary" }
        if type == "sentence" { return "sentence" }
        return has("choose .*from the (passage|text)", ins) ? "rnotes" : "notes"
    }

    /// The question numbers of a part, in order
    public static func numbers(_ p: JSON) -> [Int] {
        p.list("groups").flatMap { g -> [Int] in g.s("type") == "multi" ? g.list("n").map { Int(JSON.orZero($0)) } : g.list("items").map { $0.i("n") } }
    }

    /// `collect`: one result per question number
    public static func collect(_ p: JSON, _ ans: QAnswers) -> [Int: QResult] {
        var res: [Int: QResult] = [:]
        for (gi, gr) in p.list("groups").enumerated() {
            let type = gr.s("type"), kind = kindOf(gr)
            if type == "multi" {
                let picked = ans.multi[gi] ?? [], right = gr.strs("a")
                let correct = picked.filter { right.contains($0) }
                for (k, nj) in gr.list("n").enumerated() {
                    let n = Int(JSON.orZero(nj))
                    res[n] = QResult(n: n, ok: k < correct.count, given: picked.joined(separator: ", "), answer: right.joined(separator: ", "), cue: gr.s("cue"), q: gr.s("q"), type: "multi", kind: kind, alts: right)
                }
                continue
            }
            for it in gr.list("items") {
                let n = it.i("n"), given = ans.one[n]
                if type == "mcq" {
                    let opts = it.strs("options"), a = it.i("a"), g = given.flatMap { Int($0) }
                    res[n] = QResult(n: n, ok: g == a, given: g.map { letters[min($0, 7)] } ?? "", answer: letters[min(a, 7)] + ". " + (a < opts.count ? opts[a] : ""), cue: it.s("cue"), q: it.s("q"), type: "mcq", kind: kind, alts: [String(a)])
                } else if tf[type] != nil {
                    let g = given ?? ""
                    res[n] = QResult(n: n, ok: g == it.s("a"), given: g, answer: it.s("a"), cue: it.s("cue"), q: it.s("text"), type: type, kind: kind, alts: [it.s("a")])
                } else if type == "match" {
                    let v = given ?? "", a = it.s("a"), opt = gr.strs("options").first { code($0) == a }
                    let lb = opt.map(label) ?? ""
                    res[n] = QResult(n: n, ok: v == a, given: v, answer: a + (lb.isEmpty ? "" : " – " + lb), cue: it.s("cue"), q: it.s("text"), type: "match", kind: kind, alts: [a])
                } else {
                    let v = (given ?? "").trimmingCharacters(in: .whitespacesAndNewlines), limit = gr["limit"].flatMap { $0.double }.map { Int($0) }
                    let r = gradeGap(a: it.strs("a"), limit: limit, given: v)
                    res[n] = QResult(n: n, ok: r.ok, over: r.over, given: v, answer: it.strs("a").first ?? "", cue: it.s("cue"), q: it.s("text"), type: "gap", kind: kind, alts: it.strs("a"), limit: limit)
                }
            }
        }
        return res
    }

    // MARK: results by question type + retake
    public struct KindStat: Equatable, Sendable {
        public var kind: String, ok: Int, all: Int, wrong: [Int]
        public var pct: Int { Vocab.round(Double(ok) / Double(max(1, all)) * 100) }
        public var name: String { SkillsConsts.current.names[kind] ?? kind }
    }
    /// `QE.stats`: per kind right / all and the numbers of the wrong ones, in order of first appearance
    public static func stats(_ results: [QResult]) -> [KindStat] {
        var out: [KindStat] = []
        for r in results.sorted(by: { $0.n < $1.n }) {
            let k = r.kind.isEmpty ? r.type : r.kind
            var i = out.firstIndex { $0.kind == k }
            if i == nil { out.append(KindStat(kind: k, ok: 0, all: 0, wrong: [])); i = out.count - 1 }
            let at = i!
            out[at].all += 1
            if r.ok { out[at].ok += 1 } else { out[at].wrong.append(r.n) }
        }
        return out
    }
    /// `QT.summary` (mock-test result): weakest kind first; the first kind under 75 % gets its tip
    public static func summary(_ results: [QResult]) -> (rows: [KindStat], weak: String?) {
        let rows = Vocab.stableSorted(stats(results)) { Double($0.ok) / Double($0.all) < Double($1.ok) / Double($1.all) }
        return (rows, rows.first { Double($0.ok) / Double($0.all) < 0.75 }?.kind)
    }
    /// The item numbers (first number of a "choose 2" group) that were not fully right, and every number of those items
    public static func wrongItems(_ p: JSON, _ res: [Int: QResult]) -> [[Int]] {
        p.list("groups").flatMap { g -> [[Int]] in
            if g.s("type") == "multi" { let ns = g.list("n").map { Int(JSON.orZero($0)) }; return ns.allSatisfy { res[$0]?.ok == true } ? [] : [ns] }
            return g.list("items").map { [$0.i("n")] }.filter { res[$0[0]]?.ok != true }
        }
    }
    /// "Kiểm tra" of a retake: the new answer against the stored accepted answers
    public static func recheck(_ r: QResult, picked: [String], text: String) -> Bool {
        switch r.type {
        case "multi": return picked.count == r.alts.count && picked.allSatisfy { r.alts.contains($0) }
        case "mcq", "tfng", "ynng", "match": return text == (r.alts.first ?? "\u{0}")
        default: return gradeGap(a: r.alts, limit: r.limit, given: text).ok
        }
    }

    // MARK: progress record (qtips.js `record`)
    /// `game.qstat["<skill>:<kind>"] += {r, t, s, d}`; `secs` is spread over the kinds by their question count
    public static func record(_ game: JSON, skill: String, results: [QResult], secs: Int = 0, now: Int64) -> JSON {
        var tally: [String: (r: Int, t: Int)] = [:], order: [String] = []
        for r in results.sorted(by: { $0.n < $1.n }) {
            let k = r.kind.isEmpty ? "mcq" : r.kind
            if tally[k] == nil { order.append(k) }
            var x = tally[k] ?? (0, 0); x.t += 1; if r.ok { x.r += 1 }; tally[k] = x
        }
        let tot = tally.values.reduce(0) { $0 + $1.t }
        guard tot > 0 else { return game }
        var g = game, q = game["qstat"]?.object ?? [:]
        for k in order {
            let v = tally[k]!, key = skill + ":" + k, o = q[key] ?? .obj([("r", 0), ("t", 0), ("s", 0)])
            q[key] = .obj([("r", .int(o.i("r") + v.r)), ("t", .int(o.i("t") + v.t)), ("s", .int(o.i("s") + Vocab.round(Double(secs * v.t) / Double(tot)))), ("d", .number(Double(now)))])
        }
        g["qstat"] = .object(q)
        return g
    }
}

/// The rows of the transcript card: narrator lines in italics, speaker lines as Lexis tokens, and (after submit) the line each question's cue is in.
public enum Transcript {
    public struct Row: Equatable, Sendable {
        public var i: Int
        public var say: String?
        public var speaker = ""
        public var tokens: [Lexis.Piece] = []
        /// question labels pointing at this line: "7" or "25–26"
        public var ev: [String] = []
    }
    /// first script line whose text includes `cue`
    public static func cueLine(_ p: JSON, _ cue: String) -> Int? {
        guard !cue.isEmpty else { return nil }
        return p.list("script").firstIndex { $0.s("t").contains(cue) && $0.t("t") }
    }
    public static func rows(_ p: JSON, lexis: Lexis, evidence: Bool) -> [Row] {
        var ev: [Int: [String]] = [:]
        if evidence {
            for g in p.list("groups") {
                let refs: [(String, String)] = g.s("type") == "multi" ? [(g.list("n").map { String(Int(JSON.orZero($0))) }.joined(separator: "–"), g.s("cue"))] : g.list("items").map { (String($0.i("n")), $0.s("cue")) }
                for (n, cue) in refs { if let i = cueLine(p, cue) { ev[i, default: []].append(n) } }
            }
        }
        let speakers = p["speakers"] ?? .null
        return p.list("script").enumerated().compactMap { i, l in
            if l["pause"] != nil { return nil }
            if l.t("say") { return Row(i: i, say: l.s("say")) }
            let name = speakers[l.s("s")]?.s("name") ?? l.s("s")
            return Row(i: i, speaker: name, tokens: lexis.mark(l.s("t")), ev: ev[i] ?? [])
        }
    }
    /// "Nghe đoạn có đáp án": play from the cue line, one line earlier when that one is speech too → (cue line, start line)
    public static func hearStart(_ p: JSON, cue: String) -> (cueLine: Int, startsAt: Int)? {
        guard let i = cueLine(p, cue) else { return nil }
        let script = p.list("script")
        return (i, i > 0 && script[i - 1].t("t") ? i - 1 : i)
    }
}
