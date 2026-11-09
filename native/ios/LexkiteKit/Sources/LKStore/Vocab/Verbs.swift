import Foundation
import LKSync

/// #/verb – port of web/js/verbs-core.js (resolve, forms, table, mistakes, suggest, verbOf, irregularList, modal).
/// Word lists come from native/shared/gen/verbs.json (`Verbs(tables:)`, never typed here); the English example tables (OBJ, COMP, TIME, SUBJ, MIS, …) and the web key order of the modals are in the same file.
/// Results are `JSON` shaped exactly like the web objects (vectors/vocab.json `verb.*`); the UI translates the rule / pronunciation codes with L10n.
public struct Verbs: Sendable {
    public struct Form: Equatable, Sendable { public var w: String; public var tag: String? = nil
        var json: JSON { tag.map { JSON.obj([("w", .string(w)), ("tag", .string($0))]) } ?? .obj([("w", .string(w))]) } }
    struct Sound { var ipa: String, why: String, end: String
        var json: JSON { .obj([("ipa", .string(ipa)), ("why", .string(why)), ("end", .string(end))]) } }
    /// the five forms of a verb in one region (what `table` and the examples are built from)
    struct VF {
        var base: String, irregular: Bool, partial: Bool
        var past: [Form], pp: [Form], ing: [Form], s: [Form]
        var rules: (ed: String, ing: String, s: String)
        var P: String, PP: String, ING: String, S: String
        var ed: Sound?, sz: Sound
        var transitive: Bool, passive: Bool, stative: Bool, dual: Bool, known: Bool, region: String
        var json: JSON {
            .obj([("base", .string(base)), ("irregular", .bool(irregular)), ("partial", .bool(partial)),
                  ("past", .array(past.map(\.json))), ("pp", .array(pp.map(\.json))), ("ing", .array(ing.map(\.json))), ("s", .array(s.map(\.json))),
                  ("rules", .obj([("ed", .string(rules.ed)), ("ing", .string(rules.ing)), ("s", .string(rules.s))])),
                  ("P", .string(P)), ("PP", .string(PP)), ("ING", .string(ING)), ("S", .string(S)),
                  ("ed", ed?.json ?? .null), ("sz", sz.json), ("transitive", .bool(transitive)), ("passive", .bool(passive)), ("stative", .bool(stative)),
                  ("dual", .bool(dual)), ("known", .bool(known)), ("region", .string(region))])
        }
    }

    let irr: [String: (past: [Form], pp: [Form])]
    let irrOrder: [String]
    let rev: [String: [String]]
    let common: [String]
    public let modals: [String: [String]]
    /// JSON objects are unordered: the web `Object.keys(MODALS)` order (suggest lists modals in it)
    let modalOrder: [String]
    let intrans, stative, dual, doubleSet, lBoth, lNone, lUkx, noPass, ukDouble, seS, ghF, kEnd: Set<String>
    let order: [String]
    var extra: Set<String> = []
    let data: JSON

    public init(tables t: JSON) {
        func set(_ k: String) -> Set<String> { Set(t.strs(k)) }
        func parseVar(_ s: String) -> [Form] { s.split(separator: "/").map { x in let p = x.split(separator: ":", maxSplits: 1).map(String.init); return Form(w: p[0], tag: p.count > 1 ? p[1] : nil) } }
        var irr: [String: (past: [Form], pp: [Form])] = [:], ord: [String] = [], rev: [String: [String]] = [:]
        for row in t.s("IRR").split(separator: "|") {
            let f = row.split(separator: " ").map(String.init)
            guard f.count >= 3 else { continue }
            let b = f[0]
            if irr[b] == nil { ord.append(b) }
            irr[b] = (parseVar(f[1]), parseVar(f[2]))
            for v in irr[b]!.past + irr[b]!.pp where v.w != b { if !(rev[v.w] ?? []).contains(b) { rev[v.w, default: []].append(b) } }
        }
        self.irr = irr; irrOrder = ord; self.rev = rev
        common = t.strs("COMMON")
        var m: [String: [String]] = [:]
        for (k, v) in t["MODALS"]?.object ?? [:] { m[k] = v.array?.map { $0.string ?? "" } ?? [] }
        modals = m; modalOrder = t.strs("MODALS_ORDER")
        intrans = set("INTRANS"); stative = set("STATIVE"); dual = set("DUAL"); doubleSet = set("DOUBLE"); lBoth = set("L_BOTH"); lNone = set("L_NONE"); lUkx = set("L_UKX")
        noPass = set("NOPASS"); ukDouble = set("UK_DOUBLE"); seS = set("SE_S"); ghF = set("GH_F"); kEnd = set("K_END")
        var seen = Set<String>(), o: [String] = []
        for v in common + ord where seen.insert(v).inserted { o.append(v) }
        order = o
        data = t
    }
    /// words of the learner's library that are verbs (web addKnown)
    public mutating func addKnown(_ list: [String]) { for w in list { let x = w.lowercased(); if x.count > 1, x.range(of: "^[a-z]+$", options: .regularExpression) != nil { extra.insert(x) } } }

    // MARK: helpers
    static func m(_ s: String, _ re: String) -> Bool { s.range(of: re, options: .regularExpression) != nil }
    static func cap(_ s: String) -> String { s.prefix(1).uppercased() + s.dropFirst() }
    static func join(_ a: [String]) -> String { a.filter { !$0.isEmpty }.joined(separator: " ").split(whereSeparator: { $0.isWhitespace }).joined(separator: " ") }
    static func cut(_ s: String, _ n: Int) -> String { String(s.dropLast(n)) }
    static func groups(_ s: String, _ re: String) -> [String]? {
        guard let rx = try? NSRegularExpression(pattern: re), let mm = rx.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) else { return nil }
        return (0..<mm.numberOfRanges).map { Range(mm.range(at: $0), in: s).map { String(s[$0]) } ?? "" }
    }
    func known(_ w: String) -> Bool { common.contains(w) || irr[w] != nil || extra.contains(w) }
    public func isKnown(_ w: String) -> Bool { known(w) || modals[w] != nil }
    public func isIrregular(_ b: String) -> Bool { irr[b] != nil }
    static func cvc(_ w: String) -> Bool { m(w, "(^|[^aeiou]|qu)[aeiou][^aeiouwxy]$") && !m(w, "(^|[^q])[aeiou]{2}[^aeiou]$") }
    static func syllables(_ w: String) -> Int {
        let s = w.replacingOccurrences(of: "e$", with: "", options: .regularExpression).replacingOccurrences(of: "qu", with: "q")
        guard let rx = try? NSRegularExpression(pattern: "[aeiouy]+") else { return 1 }
        return max(1, rx.numberOfMatches(in: s, range: NSRange(s.startIndex..., in: s)))
    }

    // MARK: spelling
    func doubling(_ b: String) -> String {
        if doubleSet.contains(b) { return "both" }
        if lUkx.contains(b) { return "uk" }
        if !Self.cvc(b) { return "" }
        if b.hasSuffix("l") { if lNone.contains(b) { return "" }; if Self.syllables(b) == 1 || lBoth.contains(b) { return "both" }; return "uk" }
        if ukDouble.contains(b) { return "uk" }
        return Self.syllables(b) == 1 ? "both" : ""
    }
    func suffix(_ b: String, _ suf: String) -> (list: [Form], rule: String) {
        let ed = suf == "ed"
        func f(_ w: String, _ t: String? = nil) -> Form { Form(w: w, tag: t) }
        if b == "be" { return ([f(ed ? "been" : "being")], "") }
        if Self.m(b, "ic$") { return ([f(b + "k" + suf)], "ic") }
        if ed {
            if Self.m(b, "e$") { return ([f(b + "d")], "e") }
            if Self.m(b, "[^aeiou]y$") { return ([f(Self.cut(b, 1) + "ied")], "y") }
        } else {
            if Self.m(b, "ie$") { return ([f(Self.cut(b, 2) + "ying")], "ie") }
            if Self.m(b, "(ee|oe|ye)$") || Self.m(b, "^(singe|whinge|swinge|tinge)$") { return ([f(b + "ing")], "keep-e") }
            if b == "age" { return ([f("ageing", "UK"), f("aging", "US")], "e") }
            if b == "queue" { return ([f("queuing"), f("queueing")], "e") }
            if Self.m(b, "e$") { return ([f(Self.cut(b, 1) + "ing")], "e") }
        }
        let d = doubling(b), last = String(b.suffix(1))
        if d == "both" { return ([f(b + last + suf)], "double") }
        if d == "uk" { return ([f(b + last + suf, "UK"), f(b + suf, "US")], "double-uk") }
        return ([f(b + suf)], "")
    }
    func third(_ b: String) -> (list: [Form], rule: String) {
        if b == "be" { return ([Form(w: "is")], "irr") }
        if b == "have" { return ([Form(w: "has")], "irr") }
        if Self.m(b, "^(quiz|whiz)$") { return ([Form(w: b + "zes")], "es") }
        if Self.m(b, "[^aeiou]y$") { return ([Form(w: Self.cut(b, 1) + "ies")], "y") }
        if Self.m(b, "(s|sh|ch|x|z)$") && !Self.m(b, "^stomach$") { return ([Form(w: b + "es")], "es") }
        if Self.m(b, "[^aeiou]o$") { return ([Form(w: b + "es")], "es") }
        return ([Form(w: b + "s")], "")
    }
    public func finalSound(_ b: String) -> String {
        if kEnd.contains(b) { return "k" }
        let ms: [(String, String)] = [("tch$|ch$", "ch"), ("sh$", "sh"), ("dge$|ge$", "j"), ("ce$", "s"), ("the$", "th1"), ("th$", "th0"), ("gh$", ghF.contains(b) ? "f" : "voiced"), ("ph$", "f"), ("que$", "k"), ("(ze|zz|z)$", "z"), ("x$", "s"), ("ss$", "s")]
        for (re, s) in ms where Self.m(b, re) { return s }
        if Self.m(b, "se$") { if seS.contains(b) { return "s" }; if Self.m(b, "[^aeiouwy]se$") && b != "cleanse" { return "s" }; return "z" }
        if Self.m(b, "s$") { return "s" }
        if Self.m(b, "(ff|fe|f)$") { return "f" }
        if Self.m(b, "ve$") { return "v" }
        if Self.m(b, "(pe|p)$") { return "p" }
        if Self.m(b, "(ke|ck|k|c)$") { return "k" }
        if Self.m(b, "(te|tt|t)$") { return "t" }
        if Self.m(b, "(de|dd|d)$") { return "d" }
        return "voiced"
    }
    func edSound(_ b: String) -> Sound {
        let s = finalSound(b)
        if s == "t" || s == "d" { return Sound(ipa: "/ɪd/", why: "td", end: s) }
        return Self.m(s, "^(s|sh|ch|p|k|f|th0)$") ? Sound(ipa: "/t/", why: "vl", end: s) : Sound(ipa: "/d/", why: "vd", end: s)
    }
    func sSound(_ b: String) -> Sound {
        let s = finalSound(b)
        if Self.m(s, "^(s|z|sh|ch|j)$") { return Sound(ipa: "/ɪz/", why: "sib", end: s) }
        return Self.m(s, "^(p|t|k|f|th0)$") ? Sound(ipa: "/s/", why: "vl", end: s) : Sound(ipa: "/z/", why: "vd", end: s)
    }
    public func endIpa(_ f: String) -> String { data["IPA_END"]?.s(f) ?? "" }

    // MARK: resolve
    static func clean(_ s: String?) -> String {
        var x = (s ?? "").lowercased().replacingOccurrences(of: "\u{2019}", with: "'").replacingOccurrences(of: "`", with: "'")
        x = x.replacingOccurrences(of: "[^a-z' -]", with: " ", options: .regularExpression)
        x = x.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        return x.replacingOccurrences(of: "^to ", with: "", options: .regularExpression)
    }
    func past(of b: String, _ w: String) -> String { irr[b]?.past.contains(where: { $0.w == w }) == true ? "past" : "pp" }
    func alt(_ b: String, _ from: String) -> JSON { .obj([("base", .string(b)), ("from", .string(from))]) }
    func lemma(_ w: String) -> [String: JSON] {
        func r(_ b: String, _ from: String, _ extra: [(String, JSON)] = []) -> [String: JSON] {
            var o: [String: JSON] = ["base": .string(b), "from": .string(from)]
            for (k, v) in extra { o[k] = v }
            return o
        }
        if data["BE"]?[w] != nil { return r("be", w == "been" ? "pp" : w == "being" ? "ing" : Self.m(w, "^(was|were)") ? "past" : "present") }
        if let a = data["AUX"]?[w]?.string { return r(a, Self.m(w, "^(had|did)") ? "past" : Self.m(w, "ing$") ? "ing" : w == "done" ? "pp" : Self.m(w, "^(has|does)") ? "s" : "base") }
        if modals[w] != nil { return r(w, "base") }
        if known(w) && !(rev[w] != nil && irr[w] == nil) {
            return r(w, "base", [("alts", .array((rev[w] ?? []).map { alt($0, past(of: $0, w)) }))])
        }
        if let bs = rev[w] {
            var alts = bs.dropFirst().map { alt($0, past(of: $0, w)) }
            if known(w) { alts.append(alt(w, "base")) }
            return r(bs[0], past(of: bs[0], w), [("alts", .array(alts))])
        }
        var tries: [(String, String)] = []
        if let m = Self.groups(w, "^(.+)ies$") { tries += [(m[1] + "y", "s"), (m[1] + "ie", "s")] }
        else if let m = Self.groups(w, "^(.+)es$") { tries += [(m[1] + "e", "s"), (m[1], "s"), (m[1].replacingOccurrences(of: "zz$", with: "z", options: .regularExpression), "s")] }
        else if let m = Self.groups(w, "^(.+[^s'])s$") { tries.append((m[1], "s")) }
        if let m = Self.groups(w, "^(.+)ied$") { tries += [(m[1] + "y", "past"), (m[1] + "ie", "past")] }
        else if let m = Self.groups(w, "^(.+)cked$") { tries += [(m[1] + "c", "past"), (m[1] + "ck", "past")] }
        else if let m = Self.groups(w, "^(.+)ed$") { let s = m[1]; tries += [(s + "e", "past"), (s, "past")]; if Self.m(s, "([bdfgklmnprstvz])\\1$") { tries.append((Self.cut(s, 1), "past")) } }
        if let m = Self.groups(w, "^(.+)ying$") { tries += [(m[1] + "ie", "ing"), (m[1] + "y", "ing")] }
        else if let m = Self.groups(w, "^(.+)cking$") { tries += [(m[1] + "c", "ing"), (m[1] + "ck", "ing")] }
        else if let m = Self.groups(w, "^(.+)ing$") {
            let s = m[1]
            if Self.m(s, "([bdfgklmnprstvz])\\1$") { tries += [(Self.cut(s, 1), "ing"), (s, "ing")] }
            else if Self.cvc(s) && Self.syllables(s) == 1 { tries += [(s + "e", "ing"), (s, "ing")] }
            else { tries += [(s, "ing"), (s + "e", "ing")] }
        }
        for (b, from) in tries where known(b) { return r(b, from) }
        if let (b0, from) = tries.first {
            var b = b0
            if from == "ing" || from == "past" {
                let s = from == "ing" ? Self.cut(w, 3) : w.replacingOccurrences(of: "e?d$", with: "", options: .regularExpression)
                if Self.m(s, "([bdgmnprt])\\1$") { b = Self.cut(s, 1) }
                else if Self.m(s, "(v|z|[^aeiou]c|dg|u|[bcdfgkptz]l)$") || (Self.cvc(s) && Self.syllables(s) == 1) { b = s + "e" }
                else { b = s }
                if from == "past" && Self.m(Self.cut(w, 2), "[^aeiou]i$") { b = Self.cut(w, 3) + "y" }
            }
            if from == "s" { b = Self.m(w, "(s|sh|ch|x|z|[^aeiou]o)es$") ? Self.cut(w, 2) : Self.m(w, "[^aeiou]ies$") ? Self.cut(w, 3) + "y" : Self.cut(w, 1) }
            return r(b, from, [("guess", true)])
        }
        return r(w, "base", [("unknown", .bool(!known(w)))])
    }
    /// resolve("went") → {base:"go", from:"past", …}; nil for an empty input
    public func resolve(_ input: String?) -> JSON? {
        let s = Self.clean(input)
        if s.isEmpty { return nil }
        if modals[s] != nil { return .obj([("base", .string(s)), ("from", "base"), ("modal", true), ("tail", "")]) }
        let parts = s.split(separator: " ").map(String.init), head = parts[0] == "ought" ? "ought to" : parts[0]
        if head == "ought to" { return .obj([("base", "ought to"), ("from", "base"), ("modal", true), ("tail", "")]) }
        var o = lemma(head)
        o["alts"] = o["alts"] ?? .array([])
        o["tail"] = .string(parts.dropFirst().joined(separator: " "))
        o["modal"] = .bool(modals[o["base"]?.string ?? ""] != nil)
        o["input"] = .string(s)
        return .object(o)
    }

    // MARK: forms
    func pickReg(_ list: [Form], _ region: String) -> String { (list.first { $0.tag == nil || $0.tag == region } ?? list[0]).w }
    func vforms(_ base: String, region r: String = "UK") -> VF {
        let region = r == "US" ? "US" : "UK"
        let i = irr[base], ing = suffix(base, "ing"), s3 = third(base), reg = suffix(base, "ed")
        func isReg(_ x: Form) -> Bool { reg.list.contains { $0.w == x.w } }
        let past = i?.past ?? reg.list, pp = i?.pp ?? reg.list
        let irregular = base == "be" || (i != nil && (past.contains { !isReg($0) } || pp.contains { !isReg($0) }))
        let hasReg = i == nil || past.contains(where: isReg)
        let say = data["SAY_S"]?.string_(s3.list[0].w)
        return VF(base: base, irregular: irregular, partial: irregular && hasReg && base != "be", past: past, pp: pp, ing: ing.list, s: s3.list,
                  rules: (hasReg && base != "be" ? reg.rule : "", ing.rule, s3.rule),
                  P: pickReg(past, region), PP: pickReg(pp, region), ING: pickReg(ing.list, region), S: pickReg(s3.list, region),
                  ed: hasReg && base != "be" ? edSound(base) : nil, sz: say.map { Sound(ipa: $0, why: "irr", end: "") } ?? sSound(base),
                  transitive: !intrans.contains(base) && base != "be" && modals[base] == nil, passive: !intrans.contains(base) && !noPass.contains(base) && base != "be",
                  stative: stative.contains(base), dual: dual.contains(base), known: known(base) || i != nil, region: region)
    }
    public func forms(_ base: String, region: String = "UK") -> JSON { vforms(base, region: region).json }

    // MARK: table
    struct Tense {
        var id: String, g: String, en: String, lesson: String, fa: String, fp: String
        var act: (String, VF) -> [String]
        var pas: ((String) -> [String])?
        var simple: String?, cont = false, modal: String?
    }
    func tenses() -> [Tense] {
        let bePres = { (p: String) in self.data["BE_PRES"]?.s(p) ?? "" }, bePast = { (p: String) in self.data["BE_PAST"]?.s(p) ?? "" }
        let have = { (p: String) in p == "3s" ? "has" : "have" }
        var t: [Tense] = [
            Tense(id: "ps", g: "present", en: "Present simple", lesson: "present-simple", fa: "S + V(s/es)", fp: "S + am/is/are + V3", act: { p, v in v.base == "be" ? [bePres(p)] : [p == "3s" ? v.S : v.base] }, pas: { [bePres($0)] }, simple: "pres"),
            Tense(id: "pc", g: "present", en: "Present continuous", lesson: "present-continuous", fa: "S + am/is/are + V-ing", fp: "S + am/is/are + being + V3", act: { p, v in [bePres(p), v.ING] }, pas: { [bePres($0), "being"] }, cont: true),
            Tense(id: "pp", g: "present", en: "Present perfect", lesson: "present-perfect", fa: "S + have/has + V3", fp: "S + have/has + been + V3", act: { p, v in [have(p), v.PP] }, pas: { [have($0), "been"] }),
            Tense(id: "ppc", g: "present", en: "Present perfect continuous", lesson: "present-perfect-continuous", fa: "S + have/has + been + V-ing", fp: "", act: { p, v in [have(p), "been", v.ING] }, pas: nil, cont: true),
            Tense(id: "pas", g: "past", en: "Past simple", lesson: "past-simple", fa: "S + V2/-ed", fp: "S + was/were + V3", act: { p, v in v.base == "be" ? [bePast(p)] : [v.P] }, pas: { [bePast($0)] }, simple: "past"),
            Tense(id: "pac", g: "past", en: "Past continuous", lesson: "past-continuous", fa: "S + was/were + V-ing", fp: "S + was/were + being + V3", act: { p, v in [bePast(p), v.ING] }, pas: { [bePast($0), "being"] }, cont: true),
            Tense(id: "pap", g: "past", en: "Past perfect", lesson: "past-perfect", fa: "S + had + V3", fp: "S + had + been + V3", act: { _, v in ["had", v.PP] }, pas: { _ in ["had", "been"] }),
            Tense(id: "papc", g: "past", en: "Past perfect continuous", lesson: "past-perfect-continuous", fa: "S + had + been + V-ing", fp: "", act: { _, v in ["had", "been", v.ING] }, pas: nil, cont: true),
            Tense(id: "fs", g: "future", en: "Future simple", lesson: "future-forms", fa: "S + will + V", fp: "S + will + be + V3", act: { _, v in ["will", v.base] }, pas: { _ in ["will", "be"] }),
            Tense(id: "gt", g: "future", en: "be going to", lesson: "future-forms", fa: "S + am/is/are + going to + V", fp: "S + am/is/are + going to + be + V3", act: { p, v in [bePres(p), "going to", v.base] }, pas: { [bePres($0), "going to", "be"] }),
            Tense(id: "fc", g: "future", en: "Future continuous", lesson: "future-continuous-perfect", fa: "S + will + be + V-ing", fp: "", act: { _, v in ["will", "be", v.ING] }, pas: nil, cont: true),
            Tense(id: "fp", g: "future", en: "Future perfect", lesson: "future-continuous-perfect", fa: "S + will + have + V3", fp: "S + will + have + been + V3", act: { _, v in ["will", "have", v.PP] }, pas: { _ in ["will", "have", "been"] }),
            Tense(id: "fpc", g: "future", en: "Future perfect continuous", lesson: "future-continuous-perfect", fa: "S + will + have + been + V-ing", fp: "", act: { _, v in ["will", "have", "been", v.ING] }, pas: nil, cont: true),
            Tense(id: "fip", g: "future", en: "Future in the past (would)", lesson: "future-in-past", fa: "S + would + V", fp: "S + would + be + V3", act: { _, v in ["would", v.base] }, pas: { _ in ["would", "be"] }),
            Tense(id: "fipg", g: "future", en: "Future in the past (was going to)", lesson: "future-in-past", fa: "S + was/were + going to + V", fp: "S + was/were + going to + be + V3", act: { p, v in [bePast(p), "going to", v.base] }, pas: { [bePast($0), "going to", "be"] }),
        ]
        for m in ["should", "could", "would", "might", "may", "must"] {
            let lesson = ["must", "might", "may", "could"].contains(m) ? "modals-deduction" : m == "would" ? "conditionals-2-3" : "modals-obligation-advice"
            t.append(Tense(id: "m-" + m, g: "modal", en: Self.cap(m) + " have + V3", lesson: lesson, fa: "S + \(m) + have + V3", fp: "S + \(m) + have + been + V3", act: { _, v in [m, "have", v.PP] }, pas: { _ in [m, "have", "been"] }, modal: m))
        }
        return t
    }
    public static let tenseGroups = ["present", "past", "future", "modal"]

    struct Sent { var aff = "", affC: String?, neg = "", negC: String?, q = ""
        var rowFields: [(String, JSON)] { var o: [(String, JSON)] = [("aff", .string(aff))]; if let a = affC { o.append(("affC", .string(a))) }; o.append(("neg", .string(neg))); if let n = negC { o.append(("negC", .string(n))) }; o.append(("q", .string(q))); return o } }
    func neg(_ k: String) -> String { data["NEG"]?[k]?.string ?? "" }
    func sentence(_ subj: String, _ p: String, _ chain: [String], base: String, simple: String?, tail: String) -> Sent {
        let t = tail.isEmpty ? "" : " " + tail
        var aux = Array(chain.dropLast()), main = chain.last ?? ""
        if chain.count == 1 && base == "be" && simple != nil { aux = chain; main = "" }
        var out = Sent()
        if aux.isEmpty {
            let d = simple == "past" ? "did" : p == "3s" ? "does" : "do"
            out.aff = Self.join([subj, main]) + t
            out.neg = Self.join([subj, d, "not", base]) + t; out.negC = Self.join([subj, neg(d), base]) + t
            out.q = Self.join([Self.cap(d), subj, base]) + t + "?"
            return out
        }
        let op = aux[0], rest = Array(aux.dropFirst())
        out.aff = Self.join([subj] + aux + [main]) + t
        if let c = data["CON"]?[op]?.string { out.affC = Self.join([subj + c] + rest + [main]) + t }
        out.neg = Self.join([subj, op, "not"] + rest + [main]) + t
        if op == "am" { out.negC = Self.join([subj + "'m", "not"] + rest + [main]) + t }
        else if !neg(op).isEmpty { out.negC = Self.join([subj, neg(op)] + rest + [main]) + t }
        out.q = Self.join([Self.cap(op), subj] + rest + [main]) + t + "?"
        return out
    }
    static let persons: [(String, String)] = [("I", "1s"), ("you", "2"), ("he", "3s"), ("we", "1p"), ("they", "3p")]

    /// `table("take", region)` → 4 tense groups × tenses × 5 persons × affirmative / negative / question (+ passive); nil for a modal or an empty input
    public func table(_ input: String, region: String = "UK") -> JSON? { guard let r = resolve(input) else { return nil }; return table(resolved: r, region: region) }
    public func table(resolved r: JSON, region: String = "UK") -> JSON? {
        if r.t("modal") { return nil }
        let v = vforms(r.s("base"), region: region), tail = r.s("tail")
        let passiveOk = v.passive && tail.isEmpty
        func row(_ sj: String, _ p: String, _ s: Sent) -> JSON {
            var fields: [(String, JSON)] = [("p", .string(p)), ("subj", .string(sj == "he" ? "he/she/it" : sj))]
            fields += s.rowFields
            return .obj(fields)
        }
        let all = tenses()
        return .array(Self.tenseGroups.map { (gid: String) -> JSON in
            .obj([("id", .string(gid)), ("tenses", .array(all.filter { $0.g == gid }.map { (x: Tense) -> JSON in
                if v.base == "be", Self.m(x.id, "^(ppc|papc|fc|fpc)$") {
                    return .obj([("id", .string(x.id)), ("en", .string(x.en)), ("lesson", .string(x.lesson)), ("formula", .string(x.fa)), ("formulaP", ""), ("rare", true), ("rows", .array([])), ("passive", .null), ("example", .obj([("en", ""), ("passive", "")]))])
                }
                var rows: [(String, String, Sent)] = Self.persons.map { (sj, p) in (sj, p, sentence(sj, p, x.act(p, v), base: v.base, simple: x.simple, tail: tail)) }
                if x.modal == "must" { rows = rows.map { var s = $0.2; s.negC = s.neg.replacingOccurrences(of: "must not", with: "can't"); s.q = ""; return ($0.0, $0.1, s) } }
                if x.modal == "may" { rows = rows.map { var s = $0.2; s.q = ""; return ($0.0, $0.1, s) } }
                var passive: JSON = .null
                if passiveOk {
                    if let pas = x.pas { passive = .array(Self.persons.map { (sj, p) in row(sj, p, sentence(sj, p, pas(p) + [v.PP], base: "be", simple: nil, tail: "")) }) } else { passive = "rare" }
                }
                return .obj([("id", .string(x.id)), ("en", .string(x.en)), ("lesson", .string(x.lesson)), ("formula", .string(x.fa)), ("formulaP", .string(x.fp)), ("cont", .bool(x.cont)),
                             ("stative", .bool(x.cont && v.stative)), ("dual", .bool(x.cont && v.dual && !v.stative && v.base != "be")), ("mustNote", .bool(x.modal == "must")),
                             ("rows", .array(rows.map { row($0.0, $0.1, $0.2) })), ("passive", passive), ("example", example(x, v, tail))])
            }))])
        })
    }

    func example(_ x: Tense, _ v: VF, _ tail: String) -> JSON {
        let subjP = data["SUBJ"]?[x.id]?.strs_ ?? ["She", "3s"]
        let sj = subjP[0], p = subjP[1], b = v.base
        let objT = data["OBJ"]?[b]?.string, compT = data["COMP"]?[b]?.string
        let obj = !tail.isEmpty ? tail : (v.transitive ? (objT ?? compT ?? "it") : (compT ?? ""))
        let chain = x.act(p, v), s = sentence(sj, p, chain, base: b, simple: x.simple, tail: "")
        var core = Self.join([s.aff, obj])
        if b == "be" && x.cont { core = Self.join([sj] + chain + ["very careful"]) }
        let time = data["TIME"]?[x.id]?.string ?? ""
        let tm = time.isEmpty ? "" : " " + time
        let en: String
        switch x.id {
        case "fip": en = "She said \(core)\(tm)."
        case "fipg": en = "\(core), but there was no time."
        case "m-would": en = "\(core) if I had known."
        default: en = "\(core)\(tm)."
        }
        var pas = ""
        if v.passive && tail.isEmpty && x.pas != nil && (objT != nil || compT == nil) {
            let o = objT ?? "it", subj = o == "it" ? "It" : Self.cap(o)
            let plural = Self.m(o, "[^su]s$") && !Self.m(o, "news$") && o != "maths"
            let pp = plural ? "3p" : "3s"
            let ps = sentence(subj, pp, x.pas!(pp) + [v.PP], base: "be", simple: nil, tail: "")
            switch x.id {
            case "fip":
                var first = ps.aff
                if let sp = first.firstIndex(of: " ") { first = first[..<sp].lowercased() + first[sp...] } else { first = first.lowercased() }
                pas = "She said \(first)\(tm)."
            case "fipg": pas = "\(ps.aff), but there was no time."
            case "m-would": pas = "\(ps.aff) if I had known."
            default: pas = "\(ps.aff)\(tm)."
            }
        }
        func tidy(_ s: String) -> String { Self.rx(Self.rx(s, "\\s+", " "), "\\s+([,.?])", "$1") }
        return .obj([("en", .string(tidy(en))), ("passive", .string(pas))])
    }
    static func rx(_ s: String, _ re: String, _ w: String) -> String { s.replacingOccurrences(of: re, with: w, options: .regularExpression) }

    // MARK: mistakes / lists
    public func mistakes(_ base: String) -> JSON {
        func mk(_ w: String, _ r: String, _ c: String, _ arg: String? = nil) -> JSON { arg.map { JSON.obj([("wrong", .string(w)), ("right", .string(r)), ("code", .string(c)), ("arg", .string($0))]) } ?? .obj([("wrong", .string(w)), ("right", .string(r)), ("code", .string(c))]) }
        if modals[base] != nil { return .array(data.list("MODAL_MIS").map { mk($0.array?[0].string ?? "", $0.array?[1].string ?? "", $0.array?[2].string ?? "") }) }
        let f = vforms(base), irr = self.irr[base]
        var out: [JSON] = []
        func add(_ w: String, _ r: String, _ c: String, _ arg: String? = nil) { if w != r && !out.contains(where: { $0.s("wrong") == w }) { out.append(mk(w, r, c, arg)) } }
        for x in data["MIS"]?[base]?.array ?? [] { if let a = x.array, a.count >= 3 { add(a[0].string ?? "", a[1].string ?? "", a[2].string ?? "") } }
        if base == "be" { return .array(out) }
        let reg = suffix(base, "ed").list[0].w
        if let irr, !irr.past.contains(where: { $0.w == reg }) { add("Yesterday I \(reg) …", "Yesterday I \(f.past[0].w) …", "overreg", reg) }
        if stative.contains(base) { add("I am \(f.ING) …", "I \(base) …", "stative") }
        if irr != nil && f.P != f.PP && base != "have" { add("I have \(f.P) …", "I have \(f.PP) …", "have-v2") }
        if irr == nil, f.rules.ed == "double" || f.rules.ed == "y" { add(base + "ed", f.past[0].w, "sp-" + f.rules.ed) }
        let si: String? = ["e": base + "ing", "ie": Self.rx(base, "e$", "") + "eing", "double": base + "ing", "ic": base + "ing"][f.rules.ing]
        if let si { add(si, f.ing[0].w, "sp-" + f.rules.ing) }
        if f.rules.s == "y" { add(base + "s", f.s[0].w, "sp-ys") }
        if f.P != base { add("Did you \(f.P) …?", "Did you \(base) …?", "did-v2") }
        if base != "have" { add("He doesn't \(f.S) …", "He doesn't \(base) …", "doesnt-s") }
        return .array(Array(out.prefix(6)))
    }
    func pattern(_ b: String) -> String {
        let r = irr[b]!, p = r.past[0].w, pp = r.pp[0].w
        return p == b && pp == b ? "AAA" : p == pp ? "ABB" : pp == b ? "ABA" : "ABC"
    }
    /// irregular verbs for the landing table: `[{base, past[], pp[], pattern}]`
    public func irregularList() -> JSON {
        .array(irrOrder.filter { vforms($0).irregular }.map { b in
            .obj([("base", .string(b)), ("past", .array(irr[b]!.past.map(\.json))), ("pp", .array(irr[b]!.pp.map(\.json))), ("pattern", .string(pattern(b)))]) })
    }
    /// landing filter: pattern chip (AAA / ABB / ABA / ABC or "") AND base or any past / pp form starts with the prefix
    public func landing(pattern pat: String, prefix q: String) -> [String] {
        irregularList().array!.filter { x in
            (pat.isEmpty || x.s("pattern") == pat) && (q.isEmpty || ([x.s("base")] + x.list("past").map { $0.s("w") } + x.list("pp").map { $0.s("w") }).contains { $0.hasPrefix(q) })
        }.map { $0.s("base") }
    }
    /// search-box list: `[{base, via?}]`
    public func suggest(_ q: String, _ n: Int = 8) -> JSON {
        let s = Self.clean(q)
        if s.isEmpty { return .array([]) }
        var out: [JSON] = [], seen = Set<String>()
        func push(_ base: String, _ via: String? = nil) { if !seen.contains(base) && out.count < n { seen.insert(base); out.append(via.map { JSON.obj([("base", .string(base)), ("via", .string($0))]) } ?? .obj([("base", .string(base))])) } }
        let head = s.split(separator: " ").first.map(String.init) ?? ""
        if let r = resolve(s), r.s("base") != head, known(r.s("base")) || modals[r.s("base")] != nil { push(r.s("base"), head) }
        for m in modalOrder where m.hasPrefix(s) { push(m) }
        for v in order where v.hasPrefix(s) { push(v) }
        for v in extra.sorted() where v.hasPrefix(s) { push(v) }
        return .array(out)
    }
    /// modal → [negative, contraction, past, alternative]
    public func modal(_ base: String) -> [String]? { modals[base] }
    /// base verb to open the conjugation page for a dictionary entry (went → go); "" when the entry is not a verb
    public func verbOf(_ e: JSON) -> String {
        guard e.t("word") else { return "" }
        let w = Self.clean(e.s("word"))
        if w.isEmpty || w.split(separator: " ").count > 3 { return "" }
        var posParts = [e.s("pos")]
        for k in ["oxford", "meanings", "senses"] { posParts += e.list(k).map { $0.s("pos") } }
        let pos = posParts.joined(separator: " ").lowercased()
        guard let r = resolve(w) else { return "" }
        if r.t("modal") { return r.s("base") }
        if Self.m(pos, "(^|[^a-z])(v|verb)([^a-z]|$)|động từ") || (r.s("from") != "base" && known(r.s("base"))) { return r.s("base") + (r.t("tail") ? " " + r.s("tail") : "") }
        return ""
    }
}

private extension JSON {
    func string_(_ k: String) -> String? { self[k]?.string }
    var strs_: [String]? { array.map { $0.compactMap(\.string) } }
}
