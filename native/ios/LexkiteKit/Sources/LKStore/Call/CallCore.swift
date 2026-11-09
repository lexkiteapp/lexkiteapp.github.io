import Foundation
import LKSync
import LKCore
import LKStrings

/// M4 P08 – #/call (Call Ama & Carlos): the engine of web/js/call/engine.js and the pure parts of web/js/call.js, as an exact port.
/// No UI, no clock, no microphone, no network. Every table (irregular verbs, fillers, stop words, pair lists, score weights, XP, the rude-word lists, the
/// names of the calls) comes from the content pack (`call-pack.json`, bundled starter `call-content.json`) – nothing is typed in twice. The ONLY code
/// constants are the grammar RULES themselves (patterns that are code on the web, too) and the Vietnamese-key ids of their explanations.
/// Verified against vectors/call.json (CallVectorTests): `engine.*`, `list`, `ring`, `flow`, `rewards`, `progress`.

// MARK: - JS-compatible helpers

enum CallJS {
    static func regex(_ source: String, _ flags: String = "") -> NSRegularExpression? {
        try? NSRegularExpression(pattern: source, options: flags.contains("i") ? [.caseInsensitive] : [])
    }
    static func regexJSON(_ j: JSON?) -> NSRegularExpression? { j.flatMap { regex($0.s("source"), $0.s("flags")) } }
    static func full(_ s: String) -> NSRange { NSRange(location: 0, length: (s as NSString).length) }
    static func test(_ re: NSRegularExpression?, _ s: String) -> Bool { re?.firstMatch(in: s, range: full(s)) != nil }
    static func count(_ re: NSRegularExpression?, _ s: String) -> Int { re?.numberOfMatches(in: s, range: full(s)) ?? 0 }
    static func all(_ re: NSRegularExpression?, _ s: String) -> [String] {
        guard let re else { return [] }
        let ns = s as NSString
        return re.matches(in: s, range: full(s)).map { ns.substring(with: $0.range) }
    }
    /// `String.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()`
    static func fold(_ s: String) -> String {
        var out = String.UnicodeScalarView()
        for u in s.decomposedStringWithCanonicalMapping.unicodeScalars where !(u.value >= 0x300 && u.value <= 0x36F) { out.append(u) }
        return String(out).lowercased()
    }
    static func group(_ m: NSTextCheckingResult, _ i: Int, _ ns: NSString) -> String? {
        let r = m.range(at: i)
        return r.location == NSNotFound ? nil : ns.substring(with: r)
    }
    /// `s.replace(/re/, template)` WITHOUT the g flag: the first match only
    static func replaceFirst(_ s: String, _ re: NSRegularExpression?, _ template: String) -> String {
        guard let re, let m = re.firstMatch(in: s, range: full(s)) else { return s }
        return (s as NSString).replacingCharacters(in: m.range, with: re.replacementString(for: m, in: s, offset: 0, template: template))
    }
    static func replaceFirst(_ s: String, _ re: NSRegularExpression?, _ f: (NSTextCheckingResult, NSString) -> String) -> String {
        guard let re, let m = re.firstMatch(in: s, range: full(s)) else { return s }
        let ns = s as NSString
        return ns.replacingCharacters(in: m.range, with: f(m, ns))
    }
    /// `s.replace(/re/g, fn)`
    static func replaceAll(_ s: String, _ re: NSRegularExpression?, _ f: (NSTextCheckingResult, NSString) -> String) -> String {
        guard let re else { return s }
        let ns = s as NSString
        var out = "", last = 0
        for m in re.matches(in: s, range: full(s)) {
            out += ns.substring(with: NSRange(location: last, length: m.range.location - last))
            out += f(m, ns)
            last = m.range.location + m.range.length
        }
        return out + ns.substring(from: last)
    }
    /// `/^[A-Z]/.test(from) ? to[0].toUpperCase() + to.slice(1) : to`
    static func keepCase(_ from: String, _ to: String) -> String {
        guard let f = from.unicodeScalars.first, f.value >= 65 && f.value <= 90, let t = to.first else { return to }
        return String(t).uppercased() + to.dropFirst()
    }
    static func mmss(_ s: Int) -> String {
        func pad(_ n: Int) -> String { n >= 0 && n < 10 ? "0\(n)" : String(n) }
        return pad(Int(floor(Double(s) / 60))) + ":" + pad(max(0, s) % 60)
    }
    /// `s.split(/(?<=\.)\s/)` first two pieces joined by a space + " …" (a long turn shows only its first two sentences)
    static func firstTwoSentences(_ s: String) -> String {
        guard let re = regex("(?<=\\.)\\s") else { return s + " …" }
        let ns = s as NSString
        var pieces: [String] = [], last = 0
        for m in re.matches(in: s, range: full(s)) {
            pieces.append(ns.substring(with: NSRange(location: last, length: m.range.location - last)))
            last = m.range.location + m.range.length
        }
        pieces.append(ns.substring(from: last))
        return pieces.prefix(2).joined(separator: " ") + " …"
    }
}

/// The keys of the JSON object that follows `marker` in the TEXT of a document, in the order they were written (a Swift dictionary has none). Used for the
/// order of the extra pair lists (it decides which pair a heard word is reported with) and for "first node" of a graph without `start`.
public enum CallJSONOrder {
    public static func keys(in text: String, after marker: String) -> [String] {
        guard let r = text.range(of: marker) else { return [] }
        let u = Array(text[r.upperBound...].utf8)
        let quote = UInt8(ascii: "\""), open = UInt8(ascii: "{"), close = UInt8(ascii: "}"), aOpen = UInt8(ascii: "["), aClose = UInt8(ascii: "]"), colon = UInt8(ascii: ":"), slash = UInt8(ascii: "\\")
        var i = 0
        while i < u.count, u[i] != open { i += 1 }
        var depth = 0, out: [String] = []
        while i < u.count {
            let c = u[i]
            if c == quote {
                var j = i + 1, bytes: [UInt8] = []
                while j < u.count, u[j] != quote {
                    if u[j] == slash, j + 1 < u.count { bytes.append(u[j]); bytes.append(u[j + 1]); j += 2 } else { bytes.append(u[j]); j += 1 }
                }
                var k = j + 1
                while k < u.count, u[k] == 0x20 || u[k] == 0x0A || u[k] == 0x0D || u[k] == 0x09 { k += 1 }
                if depth == 1, k < u.count, u[k] == colon {
                    out.append(String(decoding: bytes, as: UTF8.self))
                }
                i = j + 1
                continue
            }
            if c == open || c == aOpen { depth += 1 }
            if c == close || c == aClose { depth -= 1; if depth == 0 { break } }
            i += 1
        }
        return out
    }
}

// MARK: - results

public struct CallFix: Equatable, Sendable {
    public var bad: String, good: String
    /// the first reason, and all of them (ids of the strings; the web passes the Vietnamese text to `t()`)
    public var why: L10nKey
    public var whys: [L10nKey]
}
public struct CallSlip: Equatable, Sendable { public var said: String, meant: String, id: String, skill: String }
public struct CallFluency: Equatable, Sendable { public var words: Int, fillers: Int, short: Bool, link: Bool, wpm: Int }

/// A fluency note of the summary (web `NOTE[id]`)
public enum CallNote: Equatable, Sendable {
    case short(Int), link, fillers(Int), slips, slow(Int), speak, good
    public var id: String {
        switch self {
        case .short: return "short"
        case .link: return "link"
        case .fillers: return "fillers"
        case .slips: return "slips"
        case .slow: return "slow"
        case .speak: return "speak"
        case .good: return "good"
        }
    }
    public func text(_ t: L10n) -> String {
        switch self {
        case .short(let n): return t(.callUiCoNCauTra, ["n": n])
        case .link: return t(.callUiDungThemTuNoi)
        case .fillers(let n): return t(.callUiBanDungNTu, ["n": n])
        case .slips: return t(.callUiCoTuNgheThanh)
        case .slow(let w): return t(.callUiTocDoKhoangWpm, ["wpm": w])
        case .speak: return t(.callUiLanSauHayThu)
        case .good: return t(.callUiCauTraLoiDay)
        }
    }
}
public enum CallBand: String, Equatable, Sendable {
    case great, good, keep
    public var key: L10nKey { self == .great ? .revExcellent : (self == .good ? .callUiTotLamTienBo : .callUiKhoiDauTotLuyen) }
}
public struct CallTurn: Equatable, Sendable {
    public var id: String, m: String?, text: String, picked: Bool
    public var fix: CallFix?, slips: [CallSlip], fl: CallFluency
    public var weak: Bool
    public var model: String
}
public struct CallRecap: Equatable, Sendable {
    public var turns: [CallTurn], spoken: Int, picked: Int, words: Int, uniq: Int, fillers: Int, wpm: Int
    public var used: [String], target: [String], notes: [CallNote], weak: [String], score: Int, band: CallBand
}
/// One answer of the learner (web `log` entry)
public struct CallLogEntry: Equatable, Sendable {
    public var id: String, text: String, picked: Bool, secs: Double
    public var asr: Int?, typed = false
    public init(id: String, text: String, picked: Bool, secs: Double = 0, asr: Int? = nil, typed: Bool = false) {
        self.id = id; self.text = text; self.picked = picked; self.secs = secs; self.asr = asr; self.typed = typed
    }
}

// MARK: - the graph

public struct CallNode: Sendable {
    public struct Branch: Sendable { public var re: String, line: String, hasTo: Bool, to: String? }
    public var id: String
    public var m: String, o: [String], re: String, next: String?, br: [Branch]
    public var min: Int, long: Bool, prep: Int
    /// `cue` is shown when present (even empty) or when the turn is long
    public var cue: [String]?, kw: [String]
    public init(id: String, json j: JSON) {
        self.id = id
        m = j.s("m"); o = j.strs("o"); re = j.s("re")
        let nx = j.s("next"); next = nx.isEmpty ? nil : nx
        br = j.list("br").map { b in
            let a = b.array ?? []
            return Branch(re: a.first?.string ?? "", line: a.count > 1 ? (a[1].string ?? "") : "", hasTo: a.count > 2, to: a.count > 2 ? a[2].string : nil)
        }
        min = j.i("min"); long = j.t("long"); prep = j.i("prep")
        if let a = j["cue"]?.array { cue = a.compactMap(\.string) } else { cue = nil }
        kw = j.strs("kw")
    }
    public var hasCue: Bool { cue != nil || long }
}

public struct CallScript: Sendable {
    public struct Phrase: Equatable, Sendable { public var phrase: String, meaning: String }
    public let json: JSON
    public let nodes: [String: CallNode]
    let nodesJSON: [String: JSON]
    public let start: String?
    /// `prep(c)`: the old `turns[]` shape becomes nodes t0, t1, … chained by `next`; no `start` ⇒ the first node. `order` = node ids as written (only needed
    /// for a graph without `start`; calls of the pack always have one). nil for anything that is not an object.
    public init?(json j: JSON, order: [String]? = nil) {
        guard j.isObject else { return nil }
        var nj: [String: JSON] = [:], first: String?
        let ok = j.t("_ok")
        if let n = j["nodes"]?.object {
            nj = n
            first = j.t("start") ? j.s("start") : (ok ? nil : (order?.first ?? n.keys.sorted().first))
        } else if ok {
            first = j.t("start") ? j.s("start") : nil
        } else {
            let turns = j.list("turns")
            for (k, x) in turns.enumerated() {
                var t = x.object ?? [:]
                t["next"] = k + 1 < turns.count ? JSON.string("t\(k + 1)") : JSON.null
                nj["t\(k)"] = JSON.object(t)
            }
            first = "t0"
        }
        self.json = j; self.nodesJSON = nj
        self.nodes = Dictionary(nj.map { ($0.key, CallNode(id: $0.key, json: $0.value)) }, uniquingKeysWith: { a, _ in a })
        self.start = first
    }
    public var id: String { json.s("id") }
    public var em: String { json.s("em") }
    public var lv: String { json.s("lv") }
    public var title: String { json.s("title") }
    public var role: String { json.s("role") }
    public var who: String { json.s("who") }
    public var exam: String { json.s("exam") }
    public var tl: String { json.s("tl") }
    public var end: String { json.s("end") }
    public var words: [String] { json.strs("words") }
    public var retry: Bool { json.t("retry") }
    public var phrases: [Phrase] { json.list("phrases").map { let a = $0.array ?? []; return Phrase(phrase: a.first?.string ?? "", meaning: a.count > 1 ? (a[1].string ?? "") : "") } }
    /// the pack keeps English calls without `tl`
    public var isEnglish: Bool { tl.isEmpty || tl == "en" }
    public func node(_ id: String?) -> CallNode? { id.flatMap { nodes[$0] } }
    /// "Ama" / "Carlos" (`Chars.name`)
    public var teacherName: String { CallTeacher.name(who) }
}
public enum CallTeacher {
    public static func name(_ who: String) -> String { who.isEmpty ? "" : who.prefix(1).uppercased() + who.dropFirst() }
}

// MARK: - rules (everything the pack carries)

public final class CallRules: @unchecked Sendable {
    public struct Score: Sendable {
        public var base = 40.0, doneWeight = 20.0, shareWeight = 20.0, cleanWeight = 20.0, max = 100.0, great = 85.0, good = 70.0, slowWpm = 70.0, fillerShare = 0.08, fillerMinWords = 20.0, maxSlips = 2
    }
    struct Rule {
        var past: Bool, own: Bool, why: L10nKey, fix: (String) -> String
        init(past: Bool = false, own: Bool = false, why: L10nKey, fix: @escaping (String) -> String) { self.past = past; self.own = own; self.why = why; self.fix = fix }
    }
    public let score: Score
    public let xpBase: Int, xpPerTurn: Int, xpPerVoiced: Int, xpUsedWords: Int, pctMax: Int, longSeconds: Int
    /// card title key of a call (Vietnamese web key; "" = none, the English title is shown)
    public let names: [String: String]
    let unsafe: [String: NSRegularExpression]
    let past: [String: String], s3: [String: String], past3: [String: String], v3to2: [String: String]
    let modal: NSRegularExpression?, pastPrompt: NSRegularExpression?, pastOwn: NSRegularExpression?, filler: NSRegularExpression?, link: NSRegularExpression?
    let tlFiller: [String: NSRegularExpression], tlLink: [String: NSRegularExpression]
    let stop: Set<String>
    let contrasts: [JSON]
    let extra: [(id: String, pairs: String)]
    let perfAux: NSRegularExpression?
    var rules: [Rule] = []
    private let wordRe = CallJS.regex("[a-z][a-z']*"), letterRe = CallJS.regex("[a-z]+"), stemRe = CallJS.regex("(ies|es|s|ed|ing)$")
    private var index: [String: [(w: String, id: String)]]?

    /// `consts` = `{engine, call}` of the pack, `contrasts` = `pron.contrasts`, `extraOrder` = the written order of `engine.extraPairs`
    public init(consts: JSON, contrasts: [JSON], extraOrder: [String] = []) {
        let e = consts["engine"] ?? .null, c = consts["call"] ?? .null
        func map(_ k: String) -> [String: String] { (e[k]?.object ?? [:]).compactMapValues(\.string) }
        past = map("past"); s3 = map("s3"); past3 = map("past3"); v3to2 = map("v3to2")
        modal = CallJS.regexJSON(e["modal"]); pastPrompt = CallJS.regexJSON(e["pastPrompt"]); pastOwn = CallJS.regexJSON(e["pastOwn"])
        filler = CallJS.regexJSON(e["filler"]); link = CallJS.regexJSON(e["link"])
        var tf: [String: NSRegularExpression] = [:], tk: [String: NSRegularExpression] = [:]
        for (k, v) in e["tl"]?.object ?? [:] { if let a = CallJS.regexJSON(v["filler"]), let b = CallJS.regexJSON(v["link"]) { tf[k] = a; tk[k] = b } }
        tlFiller = tf; tlLink = tk
        stop = Set(e.strs("stop")); self.contrasts = contrasts
        let ep = e["extraPairs"]?.object ?? [:]
        let ordered = extraOrder.filter { ep[$0] != nil } + ep.keys.filter { !extraOrder.contains($0) }.sorted()
        extra = ordered.map { (id: $0, pairs: ep[$0]?.string ?? "") }
        var sc = Score(); let s = e["score"] ?? .null
        sc.base = s.d("base") ?? sc.base; sc.doneWeight = s.d("doneWeight") ?? sc.doneWeight; sc.shareWeight = s.d("shareWeight") ?? sc.shareWeight
        sc.cleanWeight = s.d("cleanWeight") ?? sc.cleanWeight; sc.max = s.d("max") ?? sc.max; sc.great = s.d("great") ?? sc.great; sc.good = s.d("good") ?? sc.good
        sc.slowWpm = s.d("slowWpm") ?? sc.slowWpm; sc.fillerShare = s.d("fillerShare") ?? sc.fillerShare; sc.fillerMinWords = s.d("fillerMinWords") ?? sc.fillerMinWords
        sc.maxSlips = s["maxSlips"].map { Int(JSON.orZero($0)) } ?? sc.maxSlips
        score = sc
        let x = c["xp"] ?? .null
        xpBase = x.i("base"); xpPerTurn = x.i("perTurn"); xpPerVoiced = x.i("perVoiced"); xpUsedWords = x.i("usedWords")
        pctMax = c["pctMax"].map { Int(JSON.orZero($0)) } ?? 95; longSeconds = c["longSeconds"].map { Int(JSON.orZero($0)) } ?? 120
        names = (c["names"]?.object ?? [:]).compactMapValues(\.string)
        var un: [String: NSRegularExpression] = [:]
        for (k, v) in c["unsafe"]?.object ?? [:] { if let r = CallJS.regexJSON(v) { un[k] = r } }
        unsafe = un
        let v3p = "[a-z]+ed|been|" + v3to2.keys.sorted().joined(separator: "|")
        perfAux = CallJS.regex("^\\s+(?:" + v3p + ")\\b", "i")
        rules = Self.makeRules(self, uncountable: e.s("uncountable"), v3p: v3p)
    }
    public convenience init(pack: CallPack) { self.init(consts: pack.consts, contrasts: pack.contrasts, extraOrder: pack.extraOrder) }

    // MARK: the grammar rules (web RULES, in the same order)
    private static func makeRules(_ R: CallRules, uncountable unc: String, v3p: String) -> [Rule] {
        let i = "i", gi = "i"   // all flags only differ by `g`; global rules use replaceAll, the others the first match only
        let rAgree = CallJS.regex("\\b(I|we|they|you)\\s+(am|are|'m|'re)\\s+agree\\b", i)
        let rDont = CallJS.regex("\\b(he|she|it)\\s+don'?t\\b", i)
        let rModalTo = CallJS.regex("\\b(can|could|should|will|must)\\s+to\\s+(\\w+)", i)
        let rMore = CallJS.regex("\\bmore\\s+(better|easier|faster|bigger|cheaper|closer|worse)\\b", i)
        let rUnc = CallJS.regex("\\b(?:(too|so|how)\\s+many|(many)|(an?))\\s+" + unc + "s?\\b|\\b" + unc + "s\\b", gi)
        let rVery = CallJS.regex("\\bI\\s+very\\s+(like|love|want|enjoy)\\b", i)
        let rWant = CallJS.regex("\\b(want|need|would like|'d like)\\s+(go|eat|buy|see|try|have|book|make|visit|ask|join|pay|come)\\b", i)
        let rJob = CallJS.regex("\\b(I'm|I am)\\s+(engineer|teacher|student|developer|designer|manager|doctor|nurse|accountant|intern)\\b", i)
        let rThird = CallJS.regex("\\b(he|she)\\s+(" + R.s3.keys.sorted().joined(separator: "|") + ")\\b", gi)
        let rPerfect = CallJS.regex("\\b(I|we|they|you|he|she|it)(?:\\s+(have|has)|'ve)\\s+(" + v3p + ")\\b", gi)
        let rPast = CallJS.regex("\\b(I|we|they|he|she|and)\\s+(" + R.past.keys.sorted().joined(separator: "|") + ")\\b", gi)
        let rPast3 = CallJS.regex("\\b(he|she|it)\\s+(" + R.past3.keys.sorted().joined(separator: "|") + ")\\b", gi)
        let rVowel = CallJS.regex("^[aeiou]", "i"), rHave = CallJS.regex("^have$", "i"), rSubj = CallJS.regex("^(I|he|she|it)$", "i")
        let modal = R.modal, s3 = R.s3, past = R.past, past3 = R.past3, v3to2 = R.v3to2, perfAux = R.perfAux   // captured by value: no cycle with `R.rules`
        func modalBefore(_ ns: NSString, _ loc: Int) -> Bool { CallJS.test(modal, ns.substring(to: loc)) }
        return [
            Rule(why: .callEngAgreeDaLaDong) { CallJS.replaceFirst($0, rAgree, "$1 agree") },
            Rule(why: .callEngVoiHeSheIt) { CallJS.replaceFirst($0, rDont, "$1 doesn't") },
            Rule(why: .callEngSauCanCouldShould) { CallJS.replaceFirst($0, rModalTo, "$1 $2") },
            Rule(why: .callEngTuSoSanhHon) { CallJS.replaceFirst($0, rMore, "$1") },
            Rule(why: .callEngDanhTuKhongDem) { s in
                CallJS.replaceAll(s, rUnc) { m, ns in
                    let q = CallJS.group(m, 1, ns), many = CallJS.group(m, 2, ns), a = CallJS.group(m, 3, ns)
                    let u1 = CallJS.group(m, 4, ns) ?? "", u2 = CallJS.group(m, 5, ns) ?? ""
                    if let q { return q + " much " + u1 }
                    if let many { return CallJS.keepCase(many, "a lot of") + " " + u1 }
                    return a != nil ? u1 : u2
                }
            },
            Rule(why: .callEngVeryKhongDungTruoc) { CallJS.replaceFirst($0, rVery, "I really $1") },
            Rule(why: .callEngSauWantNeedWould) { CallJS.replaceFirst($0, rWant, "$1 to $2") },
            Rule(why: .callEngTruocNgheNghiepSo) { s in
                CallJS.replaceFirst(s, rJob) { m, ns in
                    let p = CallJS.group(m, 1, ns) ?? "", w = CallJS.group(m, 2, ns) ?? ""
                    return p + (CallJS.test(rVowel, w) ? " an " : " a ") + w
                }
            },
            Rule(why: .callEngVoiHeSheIt2) { s in
                CallJS.replaceAll(s, rThird) { m, ns in
                    let whole = ns.substring(with: m.range), p = CallJS.group(m, 1, ns) ?? "", v = CallJS.group(m, 2, ns) ?? ""
                    if modalBefore(ns, m.range.location) { return whole }
                    return p + " " + CallJS.keepCase(v, s3[v.lowercased()] ?? v)
                }
            },
            Rule(past: true, own: true, why: .callEngCoMocThoiGian) { s in
                CallJS.replaceAll(s, rPerfect) { m, ns in
                    let p = CallJS.group(m, 1, ns) ?? "", v = (CallJS.group(m, 3, ns) ?? "").lowercased()
                    let to = v == "been" ? (CallJS.test(rSubj, p) ? "was" : "were") : (v3to2[v] ?? v)
                    return p + " " + to
                }
            },
            Rule(past: true, why: .callEngChuyenDaXayRa) { s in
                CallJS.replaceAll(s, rPast) { m, ns in
                    let whole = ns.substring(with: m.range), p = CallJS.group(m, 1, ns) ?? "", v = CallJS.group(m, 2, ns) ?? ""
                    let after = ns.substring(from: m.range.location + m.range.length)
                    if modalBefore(ns, m.range.location) || (CallJS.test(rHave, v) && CallJS.test(perfAux, after)) { return whole }
                    return p + " " + CallJS.keepCase(v, past[v.lowercased()] ?? v)
                }
            },
            Rule(past: true, own: true, why: .callEngChuyenDaXayRa) { s in
                CallJS.replaceAll(s, rPast3) { m, ns in
                    let p = CallJS.group(m, 1, ns) ?? "", v = CallJS.group(m, 2, ns) ?? ""
                    return p + " " + (past3[v.lowercased()] ?? v)
                }
            },
        ]
    }

    /// `5 + turns·2 + voiced·2 + (a topic word used ? 3 : 0)` – the numbers are the pack's
    public func xp(turns: Int, voiced: Int, usedWords: Int) -> Int { xpBase + turns * xpPerTurn + voiced * xpPerVoiced + (usedWords > 0 ? xpUsedWords : 0) }

    func isUnsafe(_ text: String, tl: String) -> Bool {
        return CallJS.test(unsafe[tl] ?? unsafe["en"], text)
    }
    /// the fixed line the teacher says before re-asking (the web's own English / Spanish text)
    public static func unsafeLine(tl: String) -> String { tl == "es" ? "Mantengamos la charla amable y en el tema." : "Let's keep our chat friendly and on topic!" }

    // MARK: words
    func words(_ s: String, tl: Bool = false) -> [String] {
        if tl { return CallJS.all(letterRe, CallJS.fold(s)) }
        return CallJS.all(wordRe, s.lowercased().replacingOccurrences(of: "\u{2019}", with: "'"))
    }
    func stem(_ w: String) -> String { stemRe.map { CallJS.replaceFirst(w, $0, "") } ?? w }

    // MARK: pair index (slips)
    func pairIndex() -> [String: [(w: String, id: String)]] {
        if let index { return index }
        var idx: [String: [(w: String, id: String)]] = [:]
        func add(_ a: String, _ b: String, _ id: String) {
            if a.isEmpty || b.isEmpty || a == b { return }
            idx[a, default: []].append((b, id)); idx[b, default: []].append((a, id))
        }
        func pairs(_ s: String, _ id: String, strip: Bool) {
            for p in s.split(whereSeparator: { $0.isWhitespace }) {
                let ab = p.split(separator: "/", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
                var b = ab.count > 1 ? ab[1] : ""
                if strip, let eq = b.firstIndex(of: "=") { b = String(b[..<eq]) }
                add(ab[0], b, id)
            }
        }
        for c in contrasts { pairs(c.s("pairs"), c.s("id"), strip: true) }
        for (id, p) in extra { pairs(p, id, strip: false) }
        index = idx
        return idx
    }
    /// id of a contrast → the pronunciation lesson to open (#/pron/<skill>): first skill of the first contrast, else final-consonants
    func skillOf(_ id: String) -> String { contrasts.first { $0.s("id") == id }?.strs("skills").first ?? "final-consonants" }
}

// MARK: - engine

public struct CallEngine: Sendable {
    public let rules: CallRules
    public init(rules: CallRules) { self.rules = rules }

    // MARK: graph
    /// longest path in nodes (a node on the current path counts 0 again, a missing node counts 0)
    public func depth(_ c: CallScript) -> Int {
        var seen = Set<String>()
        func d(_ id: String?) -> Int {
            guard let id, let n = c.nodes[id], !seen.contains(id) else { return 0 }
            seen.insert(id)
            let outs = ([n.next] + n.br.map(\.to)).compactMap { $0 }.filter { !$0.isEmpty }
            let r = 1 + (outs.map(d).max() ?? 0)
            seen.remove(id)
            return r
        }
        return d(c.start)
    }
    public struct Step: Equatable, Sendable { public var react: String, next: String?, br: Int }
    /// the first branch whose pattern matches (a word start, case-insensitive) wins; no match ⇒ the node's default
    public func step(_ c: CallScript, _ id: String?, _ text: String) -> Step {
        guard let n = c.node(id) else { return Step(react: "", next: nil, br: -1) }
        let tl = !c.tl.isEmpty
        let s = tl ? CallJS.fold(text) : text
        for (k, b) in n.br.enumerated() {
            if CallJS.test(CallJS.regex("\\b(" + (tl ? CallJS.fold(b.re) : b.re) + ")", "i"), s) {   // a broken pattern compiles to nil ⇒ skipped
                return Step(react: b.line, next: b.hasTo ? b.to.flatMap { $0.isEmpty ? nil : $0 } : n.next, br: k)
            }
        }
        return Step(react: n.re, next: n.next, br: -1)
    }

    // MARK: gentle grammar fixes
    public func correct(_ text: String, prompt: String? = nil) -> CallFix? {
        let own = CallJS.test(rules.pastOwn, text), past = own || CallJS.test(rules.pastPrompt, prompt ?? "")
        var good = text, whys: [L10nKey] = []
        for r in rules.rules {
            if (r.past && !past) || (r.own && !own) { continue }
            let g2 = r.fix(good)
            if g2 != good { good = g2; if !whys.contains(r.why) { whys.append(r.why) } }
        }
        return good != text ? CallFix(bad: text, good: good, why: whys[0], whys: whys) : nil
    }

    // MARK: sound-pair slips (bread ≠ breast)
    public func slips(_ text: String, _ c: CallScript?, _ n: CallNode?) -> [CallSlip] {
        let R = rules
        var heard: [String] = []
        for w in R.words(text) where !heard.contains(w) { heard.append(w) }
        let idx = R.pairIndex()
        // `[...kw, ...call.words].flatMap(words)`: the JS callback is `words(value, index)`, so every item after the first is read as a target-language
        // word (letters only, accents folded) – the same quirk here, to give the same words
        var exp = Set<String>()
        for (k, w) in ((n?.kw ?? []) + (c?.words ?? [])).enumerated() { R.words(w, tl: k > 0).forEach { exp.insert($0) } }
        R.words((n?.o ?? []).joined(separator: " ")).filter { $0.count >= 5 && !R.stop.contains($0) }.forEach { exp.insert($0) }
        var out: [CallSlip] = []
        for w in heard {
            if exp.contains(w) || exp.contains(where: { R.stem($0) == R.stem(w) }) { continue }
            for (p, id) in idx[w] ?? [] where exp.contains(p) && !heard.contains(p) && !out.contains(where: { $0.meant == p }) {
                out.append(CallSlip(said: w, meant: p, id: id, skill: R.skillOf(id)))
            }
        }
        return Array(out.prefix(R.score.maxSlips))
    }

    // MARK: fluency
    public func fluency(_ text: String, min: Int = 0, secs: Double = 0, tl: String = "") -> CallFluency {
        let R = rules, tlOn = !tl.isEmpty
        let ws = R.words(text, tl: tlOn)
        let fillers: Int, link: Bool
        if tlOn, let f = R.tlFiller[tl], let k = R.tlLink[tl] {
            let folded = CallJS.fold(text)
            fillers = CallJS.count(f, folded); link = CallJS.test(k, folded)
        } else {
            fillers = CallJS.count(R.filler, text); link = CallJS.test(R.link, text)
        }
        let real = ws.count - fillers
        return CallFluency(words: real, fillers: fillers, short: min != 0 && real < min, link: link, wpm: secs > 1 ? Vocab.round(Double(real) / secs * 60) : 0)
    }

    // MARK: recap
    public func recap(_ c: CallScript, _ log: [CallLogEntry]) -> CallRecap {
        let R = rules, S = R.score, tl = c.tl, tlOn = !tl.isEmpty
        let exam = c.exam.hasPrefix("ielts")
        let turns: [CallTurn] = log.map { x in
            let n = c.node(x.id)
            let fix = x.picked || tlOn ? nil : correct(x.text, prompt: n?.m)
            let sl = x.picked || tlOn ? [] : slips(x.text, c, n)
            let fl = fluency(x.text, min: n?.min ?? 0, secs: x.secs, tl: tl)
            let weak = !x.picked && (fix != nil || !sl.isEmpty || fl.short)   // the recogniser's score is not used: a free sentence that differs from the model is still a good one
            return CallTurn(id: x.id, m: n?.m, text: x.text, picked: x.picked, fix: fix, slips: sl, fl: fl, weak: weak, model: n?.o.first ?? "")
        }
        let spoken = turns.filter { !$0.picked }
        let allSpoken = spoken.flatMap { R.words($0.text, tl: tlOn) }
        let said = Set(allSpoken.map(R.stem))
        var target: [String] = []
        for w in c.words.map({ $0.lowercased() }) where !target.contains(w) { target.append(w) }
        let used = target.filter { w in (tlOn ? CallJS.fold(w) : w).split(whereSeparator: { $0.isWhitespace }).allSatisfy { said.contains(R.stem(String($0))) } }
        let allWords = spoken.reduce(0) { $0 + $1.fl.words }, fillers = spoken.reduce(0) { $0 + $1.fl.fillers }
        let uniq = Set(allSpoken).count
        var notes: [CallNote] = []
        let shortN = spoken.filter { $0.fl.short }.count
        if shortN > 0 { notes.append(.short(shortN)) }
        if spoken.count >= 2 && exam && !spoken.contains(where: { $0.fl.link }) { notes.append(.link) }
        if Double(allWords) >= S.fillerMinWords && Double(fillers) / Double(Swift.max(1, allWords)) > S.fillerShare { notes.append(.fillers(fillers)) }
        if spoken.contains(where: { !$0.slips.isEmpty }) { notes.append(.slips) }
        let wpms = spoken.map { $0.fl.wpm }.filter { $0 != 0 }
        let wpm = wpms.isEmpty ? 0 : Vocab.round(Double(wpms.reduce(0, +)) / Double(wpms.count))
        if wpm != 0 && Double(wpm) < S.slowWpm { notes.append(.slow(wpm)) }
        if spoken.isEmpty && !turns.isEmpty { notes.append(.speak) }
        if notes.isEmpty && !spoken.isEmpty { notes.append(.good) }
        let k = Double(Swift.max(1, depth(c))), done = Swift.min(1, Double(turns.count) / k)
        let share = turns.isEmpty ? 0 : Double(spoken.count) / Double(turns.count)
        let clean = spoken.isEmpty ? 0 : Double(spoken.filter { !$0.weak }.count) / Double(spoken.count)
        let score = turns.isEmpty ? 0 : Vocab.round(Swift.max(S.base, Swift.min(S.max, S.base + done * S.doneWeight + share * S.shareWeight + clean * S.cleanWeight)))
        return CallRecap(turns: turns, spoken: spoken.count, picked: turns.count - spoken.count, words: allWords, uniq: uniq, fillers: fillers, wpm: wpm,
                         used: used, target: target, notes: notes, weak: turns.filter(\.weak).map(\.id), score: score,
                         band: Double(score) >= S.great ? .great : (Double(score) >= S.good ? .good : .keep))
    }

    /// the retry call: only the weak nodes, chained in a straight line; question, model sentences, topic words and phrases stay
    public func retry(_ c: CallScript, _ ids: [String]) -> CallScript {
        var keep: [String] = []
        for id in ids where c.nodes[id] != nil && !keep.contains(id) { keep.append(id) }
        var nodes: [String: JSON] = [:]
        for (k, id) in keep.enumerated() {
            var n = c.nodesJSON[id]?.object ?? [:]
            n["br"] = JSON.array((c.nodes[id]?.br ?? []).map { b in JSON.array([.string(b.re), .string(b.line)]) })
            n["next"] = k + 1 < keep.count ? JSON.string(keep[k + 1]) : JSON.null
            nodes[id] = JSON.object(n)
        }
        var j = c.json.object ?? [:]
        j["retry"] = JSON.bool(true); j["nodes"] = JSON.object(nodes); j["_ok"] = JSON.bool(true)
        if let s = keep.first { j["start"] = JSON.string(s) } else { j.removeValue(forKey: "start") }
        return CallScript(json: .object(j)) ?? c
    }
}

// MARK: - recognition path

public enum CallAsr {
    public enum Mode: String, Equatable, Sendable { case local, whisper, cloud, ask, tap }
    /// the web chooser (`asrMode(env)`): on the device first, the cloud only when the learner chose it
    public static func mode(local: Bool, sr: Bool, media: Bool, ext: Bool, whisper: Bool, pref: String?) -> Mode {
        if pref == "tap" { return .tap }
        if local && sr { return .local }
        if pref == "cloud" && sr { return .cloud }
        if media && !ext { return whisper ? .whisper : (pref == "device" ? .whisper : .ask) }
        return sr ? (pref == "cloud" ? .cloud : .ask) : .tap
    }
    /// native: an on-device recogniser ⇒ `local` (private, never asked); only the system (cloud) one ⇒ ask first, `cloud` once accepted; none ⇒ tap
    public static func modeNative(onDevice: Bool, system: Bool, pref: String?) -> Mode {
        if pref == "tap" { return .tap }
        if onDevice && system { return .local }
        if pref == "cloud" && system { return .cloud }
        return system ? .ask : .tap
    }
    /// What the phone shows for a web key: the web says "browser" for the cloud recogniser, the phone says "system" (vectors keep the web key, tests compare it).
    public static func shown(_ k: L10nKey) -> L10nKey {
        switch k { case .callUiDangDungNhanDang: return .callUiDangDungHeThongNative; case .callUiDungDichVuCua: return .callUiDungHeThongNative; default: return k }
    }
    /// the privacy line of a mode: (icon, text id)
    public static func privacy(_ m: Mode) -> (icon: String, key: L10nKey) {
        switch m {
        case .local, .whisper: return ("🔒", .callUiNhanDangNgayTren)
        case .cloud: return ("☁️", .callUiDangDungNhanDang)
        case .ask: return ("🔒", .callUiMacDinhLexkiteKhong)
        case .tap: return ("⌨️", .callUiTraLoiBangCach)
        }
    }
}

// MARK: - summary, rewards, cards

public struct CallSummary: Sendable {
    public let script: CallScript
    public let recap: CallRecap
    public let secs: Int
    /// answers that were neither tapped nor typed
    public let voiced: Int
    public let xp: Int
    /// `App.reward({ spoken, xp })`
    public var reward: [String: Int] { ["spoken": voiced, "xp": xp] }

    public static func make(script: CallScript, log: [CallLogEntry], secs: Int, engine: CallEngine) -> CallSummary {
        let r = engine.recap(script, log), R = engine.rules
        let voiced = log.filter { !$0.picked && !$0.typed }.count
        let xp = R.xp(turns: r.turns.count, voiced: voiced, usedWords: r.used.count)
        return CallSummary(script: script, recap: r, secs: secs, voiced: voiced, xp: xp)
    }
    /// the cards of "Thêm vào thẻ ôn": the phrases, then the grammar fixes (`App.addWord(entry, context, { silent: true })`)
    public var cards: [(entry: JSON, context: JSON)] {
        let title = "Call " + script.teacherName + ": " + script.title
        let phrases = script.phrases.map { p in
            (entry: JSON.obj([("word", .string(p.phrase)), ("def", .string(p.meaning)), ("pos", .string("phrase")), ("emoji", .string("📞")), ("topic", .string("call"))]),
             context: JSON.obj([("text", .string(p.meaning)), ("title", .string(title))]))
        }
        let fixes = recap.turns.compactMap(\.fix).map { f in
            (entry: JSON.obj([("word", .string(f.good)), ("pos", .string("phrase")), ("ex", .string(f.good)), ("emoji", .string("📞")), ("topic", .string("call"))]),
             context: JSON.obj([("text", .string(f.good)), ("title", .string(title))]))
        }
        return phrases + fixes
    }
    /// the weak turns of this call become the retry call
    public func retryScript(engine: CallEngine, base: CallScript) -> CallScript { engine.retry(base, recap.weak) }
}

public enum CallProgress {
    /// `min(95, round(logged / depth · 100))`, 100 when the call is over
    public static func percent(logged: Int, depth: Int, ended: Bool, max pctMax: Int = 95) -> Int {
        ended ? 100 : Swift.min(pctMax, Vocab.round(Double(logged) / Double(Swift.max(1, depth)) * 100))
    }
}

// MARK: - the list and the ring

public enum CallList {
    public static let groups = ["all", "ielts", "toeic", "everyday"]
    /// exam "ielts…" ⇒ ielts, "toeic" ⇒ toeic, else everyday
    public static func groupOf(_ c: CallScript) -> String { c.exam.hasPrefix("ielts") ? "ielts" : (c.exam == "toeic" ? "toeic" : "everyday") }
    public static func filtered(_ list: [CallScript], _ flt: String) -> [CallScript] { flt == "all" ? list : list.filter { groupOf($0) == flt } }
    /// stored `vb.call.flt`: one of the four groups, else all
    public static func filter(stored: String?) -> String { groups.contains(stored ?? "") ? stored! : "all" }
    public static let fltKey = "vb.call.flt", asrKey = "vb.call.asr", trKey = "vb.call.tr"
}

// MARK: - the pack

/// https://lexkite.com/data/call-pack.json `{schema, v, calls[], pron{contrasts}, consts{engine, call}}`, bundled starter `call-content.json` (8 calls).
public struct CallPack: Sendable {
    public var json: JSON
    /// the written order of `consts.engine.extraPairs`
    public var extraOrder: [String]
    public init(json: JSON = .null, extraOrder: [String] = []) { self.json = json; self.extraOrder = extraOrder }
    public var calls: [JSON] { json.list("calls") }
    public var consts: JSON { json["consts"] ?? .null }
    public var contrasts: [JSON] { json["pron"]?.list("contrasts") ?? [] }
    public var isEmpty: Bool { calls.isEmpty }
    public var v: String { json["v"]?.string ?? "" }
    /// the English calls, prepared, in pack order
    public var scripts: [CallScript] { calls.compactMap { CallScript(json: $0) }.filter(\.isEnglish) }
    public var rules: CallRules { CallRules(pack: self) }

    public static func decode(_ text: String) -> CallPack? {
        guard let j = try? JSON.parse(text) else { return nil }
        let p = CallPack(json: j, extraOrder: CallJSONOrder.keys(in: text, after: "\"extraPairs\""))
        return p.isEmpty ? nil : p
    }
    /// The bundled starter (LKStore resource). Nil only if the resource is missing (a packaging bug the tests catch).
    public static func bundled() -> CallPack? {
        guard let url = Bundle.module.url(forResource: "call-content", withExtension: "json"), let d = try? Data(contentsOf: url), let text = String(data: d, encoding: .utf8) else { return nil }
        return decode(text)
    }
}
