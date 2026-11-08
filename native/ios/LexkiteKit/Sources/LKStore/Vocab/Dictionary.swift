import Foundation
import CryptoKit
import LKSync

/// Network for the dictionary sources – GET a URL, return the parsed JSON or nil (timeout / non-200 / bad body). Injectable like LKHTTP.
public protocol DictNetwork: Sendable { func json(_ url: String, timeout: TimeInterval) async -> JSON? }
/// Persistent lookup cache (`dc2:<word>`, newest 150): the entry JSON as stored by `DictionaryService`.
public protocol DictCache: Sendable {
    func get(_ word: String) async -> JSON?
    func set(_ word: String, _ entry: JSON) async
}

public struct DictConfig: Sendable {
    public var base = "https://lexkite.com"
    /// meaning language (settings): "vi" or another; everything not "vi" never shows Vietnamese
    public var meanLang = "vi", learnLang = "vi"
    /// web `VI_TYPO` (hỏi/ngã fixes of Google's Vietnamese): set it from `Dict.viTypo(from:)` (verbs.json); empty = no fixes
    public var viTypo: [String: String] = [:]
    public var translate: @Sendable (String, JSON?) -> String = { k, v in MistakesEngine.fill(k, v) }
    public var now: @Sendable () -> Int64 = { Int64(Date().timeIntervalSince1970 * 1000) }
    public init() {}
    var wantVi: Bool { meanLang == "vi" }
}

/// web/js/dictionary.js – pure parts: normWord, fixVi, ipaFor, fixSenses, buildEntry, forLang.
public enum Dict {
    static let viDia = "[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]"
    static let viPos = ["danh từ": "noun", "động từ": "verb", "tính từ": "adjective", "trạng từ": "adverb", "giới từ": "preposition", "liên từ": "conjunction", "đại từ": "pronoun", "thán từ": "interjection", "từ hạn định": "determiner", "viết tắt": "abbreviation", "cụm từ": "phrase", "tiền tố": "prefix", "hậu tố": "suffix"]
    static let posFull = ["n": "noun", "v": "verb", "adj": "adjective", "adv": "adverb", "danh từ": "noun", "động từ": "verb", "tính từ": "adjective", "trạng từ": "adverb"]
    static let posShort = ["noun": "n", "verb": "v", "adjective": "adj", "adverb": "adv", "preposition": "prep", "conjunction": "conj", "pronoun": "pron", "interjection": "excl", "danh từ": "n", "động từ": "v", "tính từ": "adj", "trạng từ": "adv", "giới từ": "prep", "liên từ": "conj", "đại từ": "pron", "thán từ": "excl"]
    static let tato = ["vi": "vie", "es": "spa", "pt": "por", "fr": "fra", "de": "deu", "id": "ind", "th": "tha", "zh": "cmn", "ja": "jpn", "ko": "kor", "hi": "hin", "ar": "ara", "ru": "rus", "tr": "tur"]

    /// Latin letters with accents kept (café, naïve); everything else dropped
    public static func normWord(_ raw: String?) -> String {
        var s = (raw ?? "").precomposedStringWithCanonicalMapping.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        s = s.replacingOccurrences(of: "\u{2019}", with: "'").replacingOccurrences(of: "\u{D7}", with: "").replacingOccurrences(of: "\u{F7}", with: "")
        var out = String.UnicodeScalarView()
        for u in s.unicodeScalars {
            let v = u.value
            if (v >= 97 && v <= 122) || (v >= 0xC0 && v <= 0x24F) || v == 39 || v == 45 || CharacterSet.whitespacesAndNewlines.contains(u) { out.append(u) }
        }
        return String(out).split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
    }
    /// JS encodeURIComponent
    public static func enc(_ s: String) -> String {
        s.addingPercentEncoding(withAllowedCharacters: CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.!~*'()")) ?? s
    }
    static func rx(_ s: String, _ re: String, _ with: String) -> String { s.replacingOccurrences(of: re, with: with, options: .regularExpression) }
    static func test(_ s: String, _ re: String, ci: Bool = false) -> Bool { s.range(of: re, options: ci ? [.regularExpression, .caseInsensitive] : .regularExpression) != nil }
    static func lower(_ j: JSON?) -> String { (j?.string ?? "").lowercased() }

    /// web `VI_TYPO` from the generated tables (native/shared/gen/verbs.json, key `VI_TYPO`) → `DictConfig.viTypo`
    public static func viTypo(from tables: JSON) -> [String: String] { (tables["VI_TYPO"]?.object ?? [:]).compactMapValues { $0.string } }
    /// hỏi/ngã spelling fixes on Vietnamese text; `table` = web VI_TYPO
    public static func fixVi(_ s: String, _ table: [String: String]) -> String {
        var x = s.precomposedStringWithCanonicalMapping
        if !table.isEmpty, let re = try? NSRegularExpression(pattern: "[a-zA-ZÀ-ỹđĐ]+") {
            var out = "", last = x.startIndex
            for m in re.matches(in: x, range: NSRange(x.startIndex..., in: x)) {
                guard let r = Range(m.range, in: x) else { continue }
                out += x[last..<r.lowerBound]
                let w = String(x[r]), fixed = table[w.lowercased()]
                if let fixed, let f = w.first {
                    out += f.isUppercase ? (fixed.prefix(1).uppercased() + fixed.dropFirst()) : fixed
                } else { out += w }
                last = r.upperBound
            }
            out += x[last...]; x = out
        }
        return x.replacingOccurrences(of: "\\bcọng chung\\b", with: "cộng chung", options: [.regularExpression, .caseInsensitive])
    }
    public static func fixDeep(_ j: JSON, _ table: [String: String]) -> JSON {
        switch j {
        case .string(let s): return .string(fixVi(s, table))
        case .array(let a): return .array(a.map { fixDeep($0, table) })
        case .object(let o): return .object(o.mapValues { fixDeep($0, table) })
        default: return j
        }
    }
    static func posEn(_ p: JSON?) -> JSON { if case .string(let s)? = p { return .string(viPos[s.precomposedStringWithCanonicalMapping.lowercased().trimmingCharacters(in: .whitespaces)] ?? s) }; return p ?? .null }

    static func matches(_ s: String, _ pat: String, ci: Bool = false) -> [[String]] {
        guard let re = try? NSRegularExpression(pattern: pat, options: ci ? [.caseInsensitive] : []) else { return [] }
        return re.matches(in: s, range: NSRange(s.startIndex..., in: s)).map { m in
            (0..<m.numberOfRanges).map { i in Range(m.range(at: i), in: s).map { String(s[$0]) } ?? "" } }
    }
    /// split at every match of `pat` (the match text is dropped) – JS `split(regex)` without capture groups
    static func split(_ s: String, _ pat: String) -> [String] {
        guard let re = try? NSRegularExpression(pattern: pat) else { return [s] }
        var out: [String] = [], last = s.startIndex
        for m in re.matches(in: s, range: NSRange(s.startIndex..., in: s)) {
            guard let r = Range(m.range, in: s) else { continue }
            out.append(String(s[last..<r.lowerBound])); last = r.upperBound
        }
        out.append(String(s[last...])); return out
    }
    // MARK: ipa by part of speech
    /// Wiktionary pronunciation entries `[{acc, pos[], ipa}]` → the IPA that matches the entry's part of speech (overall adj ≠ noun)
    public static func ipaFor(_ wk: JSON?, _ posRaw: String, _ acc: String) -> String {
        guard let wk else { return "" }
        guard let entries = wk["entries"]?.array else { return acc == "US" ? wk.s("ipaUS") : wk.s("ipa") }
        let pos = posFull[posRaw] ?? posRaw
        func hasOther(_ e: JSON) -> Bool { e.strs("pos").contains("other") }
        var E = entries.filter { !hasOther($0) && $0.s("acc") != "X" }
        if E.isEmpty { E = entries }
        var C = E.filter { !pos.isEmpty && $0.strs("pos").contains(pos) }
        if C.isEmpty { C = E.filter { $0.strs("pos").isEmpty } }
        if C.isEmpty { C = E }
        if C.contains(where: { $0.strs("pos").count != 1 }), ["noun", "verb", "adjective"].contains(pos) {
            func ini(_ e: JSON) -> Bool { e.s("ipa").hasPrefix("/ˈ") }
            let S = C.filter { pos == "verb" ? (!ini($0) && $0.s("ipa").contains("ˈ")) : ini($0) }
            if !S.isEmpty { C = S }
        }
        let withAcc = C.first(where: { $0.s("acc").split(separator: ",").map(String.init).contains(acc) })
        let noAcc = C.first(where: { $0.s("acc").isEmpty })
        return (withAcc ?? noAcc ?? C.first)?.s("ipa") ?? ""
    }

    static let posSense = posFull
    static func senseKey(_ p: JSON?) -> String { let l = lower(p); return posSense[l] ?? l }
    /// entry.more[] – extra parts of speech of a multi-POS lexicon entry
    static func moreOf(_ local: JSON?) -> [JSON] { (local?.list("more") ?? []).filter { $0.t("pos") && ($0.t("vi") || $0.t("def")) } }
    /// the lexicon's own meaning leads its part of speech; Google's single contradicting sense is dropped
    public static func fixSenses(_ senses: [JSON], _ local: JSON?) -> [JSON] {
        guard let local, local.t("vi"), local.t("pos"), let lp = posSense[local.s("pos").lowercased()] else { return senses }
        let mine = rx(local.s("vi"), "[,;]\\s*", "\u{0}").split(separator: "\u{0}", omittingEmptySubsequences: false)
            .map { rx(String($0), "\\(.*?\\)", "").trimmingCharacters(in: .whitespacesAndNewlines) }.filter { !$0.isEmpty }
        var out = senses
        guard let i = out.firstIndex(where: { senseKey($0["pos"]) == lp }) else {
            return [JSON.obj([("pos", .string(lp)), ("terms", .strings(mine))])] + out
        }
        let terms = out[i].strs("terms")
        let agree = terms.contains { t in mine.contains { t.contains($0) || $0.contains(t) } }
        var seen = Set<String>(), merged: [String] = []
        for x in mine + terms where seen.insert(x).inserted { merged.append(x) }
        out[i]["terms"] = .strings(terms.count <= 1 && !agree ? mine : Array(merged.prefix(6)))
        return out
    }

    // MARK: build
    /// Assemble the dictionary entry from the lexicon entry (`local`) and the network sources (all optional JSON: gg Google, fd dictionaryapi, wk Wiktionary, img, sents)
    public static func buildEntry(_ word: String, local: JSON?, gg g0: JSON?, fd: JSON?, wk: JSON?, img: JSON?, sents: [JSON]) -> JSON {
        var gg = g0
        if gg != nil, local != nil { gg!["senses"] = .array(fixSenses(gg!.list("senses"), local)) }
        if gg != nil {
            for m in moreOf(local) {
                let lp = posSense[m.s("pos")] ?? ""
                let cur = gg!.list("senses")
                let had = cur.contains { senseKey($0["pos"]) == lp }
                let s2 = fixSenses(cur, m)
                var next = s2
                if !had, let f = s2.first, f.s("pos") == lp { next = Array(s2.dropFirst()) + [f] }
                gg!["senses"] = .array(next)
            }
        }
        let ggDefs = gg?.list("defs") ?? [], ggSenses = gg?.list("senses") ?? []
        let fdMeanings = fd?.list("meanings") ?? []
        let gFirst = ggDefs.first?.list("defs").first, fFirst = fdMeanings.first
        let anyEx = ggDefs.flatMap { $0.list("defs") }.first { $0.t("ex") } ?? fdMeanings.flatMap { $0.list("defs") }.first { $0.t("ex") }
        let senseVi = ggSenses.isEmpty ? "" : ggSenses.map { $0.strs("terms").prefix(3).joined(separator: ", ") }.joined(separator: "; ")
        let posRaw: String = {
            for c in [ggSenses.first?["pos"], ggDefs.first?["pos"], fFirst?["pos"]] { if let s = c?.string, !s.isEmpty { return s.precomposedStringWithCanonicalMapping.lowercased() } }
            return ""
        }()
        var oxford = ggDefs
        if gg != nil, !fdMeanings.isEmpty, !oxford.isEmpty {
            func key(_ p: JSON?) -> String { let l = (p?.string ?? "").precomposedStringWithCanonicalMapping.lowercased(); return posShort[l] ?? l }
            var have = Set(oxford.map { key($0["pos"]) })
            let want = Set(ggSenses.map { key($0["pos"]) })
            for m in fdMeanings {
                let k = key(m["pos"]), defs = m.list("defs").filter { $0.t("def") }
                if want.contains(k) && !have.contains(k) && !defs.isEmpty { have.insert(k); oxford.append(JSON.obj([("pos", m["pos"] ?? .null), ("defs", .array(Array(defs.prefix(3))))])) }
            }
        }
        func addDef(_ src: JSON, front: Bool) {
            let lp = posFull[src.s("pos").lowercased()] ?? (src.t("pos") ? src.s("pos") : "noun")
            let curDef = JSON.obj([("def", .string(src.s("def"))), ("ex", .string(src.s("ex")))])
            if let i = oxford.firstIndex(where: { (posFull[$0.s("pos").lowercased()] ?? $0.s("pos")) == lp }) {
                let rest = oxford[i].list("defs").filter { $0.s("def") != src.s("def") && !src.s("def").contains($0.s("def")) }
                oxford[i]["defs"] = .array(Array(([curDef] + rest).prefix(3)))
            } else if front { oxford.insert(JSON.obj([("pos", .string(lp)), ("defs", .array([curDef]))]), at: 0) }
            else { oxford.append(JSON.obj([("pos", .string(lp)), ("defs", .array([curDef]))])) }
        }
        if let local, local.t("def") { addDef(local, front: true) }
        for m in moreOf(local) where m.t("def") { addDef(m, front: false) }

        func first(_ xs: String...) -> String { xs.first { !$0.isEmpty } ?? "" }
        let localPos = local?.s("pos") ?? ""
        let ipa = first(local?.s("ipa") ?? "", ipaFor(wk, first(localPos, posRaw), "UK"), fd?.s("ipa") ?? "")
        let ipaUS = local?.t("ipa") == true ? (local?.s("ipaUS") ?? "") : first(ipaFor(wk, posRaw, "US"), fd?.s("ipaUS") ?? "")
        let ggVi = gg?.s("vi") ?? ""
        let viGoogle = !ggVi.isEmpty && ggVi.lowercased() != word ? ggVi : ""
        var syn: JSON = .array([])
        if let l = local, !l.list("syn").isEmpty { syn = l["syn"]! }
        else if let g = gg, !g.list("syn").isEmpty { syn = g["syn"]! }
        else if let f = fd, let fs = f["syn"] { syn = fs }
        var e: [String: JSON] = [:]
        e["word"] = .string(word); e["found"] = true
        e["ipa"] = .string(ipa); e["ipaUS"] = .string(ipaUS)
        e["audio"] = .string(first(fd?.s("audio") ?? "", wk?.s("audioUK") ?? "")); e["audioUS"] = .string(first(fd?.s("audioUS") ?? "", wk?.s("audioUS") ?? ""))
        e["pos"] = .string(first(localPos, posShort[posRaw] ?? "", posRaw))
        e["vi"] = .string(first(local?.s("vi") ?? "", viGoogle, senseVi))
        e["def"] = .string(first(local?.s("def") ?? "", gFirst?.s("def") ?? "", fFirst?.list("defs").first?.s("def") ?? ""))
        e["ex"] = .string(first(local?.s("ex") ?? "", anyEx?.s("ex") ?? "", sents.first?.s("en") ?? ""))
        e["col"] = local?["col"] ?? .array([]); e["syn"] = syn
        e["level"] = .string(local?.s("level") ?? ""); e["emoji"] = .string(local?.s("emoji") ?? ""); e["topic"] = .string(first(local?.s("topic") ?? "", "mine"))
        e["image"] = .string(img?.s("src") ?? "")
        e["imageCredit"] = img.map { JSON.obj([("text", .string($0.s("credit"))), ("link", .string($0.s("link")))]) } ?? .null
        e["senses"] = .array(ggSenses); e["oxford"] = .array(oxford); e["meanings"] = .array(fdMeanings); e["sentences"] = .array(sents)
        return .object(e)
    }

    // MARK: language filter
    static func sentsOk(_ list: [JSON], _ L: String) -> [JSON] { list.filter { ($0.t("l") ? $0.s("l") : "vi") == L && (L == "vi" || !test($0.s("vi"), viDia, ci: true)) } }
    static func cleanDefs(_ ms: JSON?) -> JSON {
        .array((ms?.array ?? []).map { m in
            var o = m
            o["pos"] = posEn(m["pos"])
            o["defs"] = .array(m.list("defs").filter { !test($0.s("def"), viDia, ci: true) }.map { d in
                var d = d; if d.t("ex"), test(d.s("ex"), viDia, ci: true) { d["ex"] = .string("") }; return d })
            return o
        })
    }
    /// entries for learners who do not read Vietnamese: English POS names, no Vietnamese senses / definitions / sentences
    public static func forLang(_ e: JSON?, wantVi: Bool, sentLang: String) -> JSON? {
        guard var o = e, !wantVi, o["found"] != JSON.bool(false) else { return e }
        o["pos"] = posEn(o["pos"]); o["oxford"] = cleanDefs(o["oxford"]); o["meanings"] = cleanDefs(o["meanings"]); o["senses"] = .array([])
        for k in ["ex", "def"] { if case .string(let s)? = o[k], test(s, viDia, ci: true) { o[k] = .string("") } }
        o["syn"] = .strings(o.strs("syn").filter { !test($0, viDia, ci: true) })
        o["col"] = .array(o.list("col").filter { !test($0.jsToString, viDia, ci: true) })
        o["sentences"] = .array(sentsOk(o.list("sentences"), sentLang))
        return o
    }
}

/// The lookup pipeline: lexicon entry first (shown at once), then Google / dictionaryapi / Wiktionary / Tatoeba / image via `DictNetwork`.
public actor DictionaryService {
    static let dataVersion = 7.0
    static let fresh: Int64 = 14 * 86_400_000
    let net: DictNetwork, lex: LexStore, cache: DictCache?, cfg: DictConfig
    private var mem: [String: JSON] = [:], quickMem: [String: JSON] = [:], wikiPages: [String: Bool] = [:]

    public init(network: DictNetwork, lex: LexStore, cache: DictCache? = nil, config: DictConfig = DictConfig()) { net = network; self.lex = lex; self.cache = cache; cfg = config }

    var sentLang: String { cfg.wantVi ? "vi" : (cfg.learnLang.isEmpty ? "en" : cfg.learnLang) }
    var dl: String { cfg.base + "/api/dictlookup" }
    func gtx(_ sl: String, _ tl: String, _ extra: String = "") -> String { "\(dl)?src=gtx&sl=\(Dict.enc(sl))&tl=\(Dict.enc(tl))\(extra)" }
    func dapi(_ w: String) -> String { "\(dl)?src=dapi&w=\(Dict.enc(w))" }
    func isPhrase(_ w: String) -> Bool { w.trimmingCharacters(in: .whitespacesAndNewlines).contains(where: { $0.isWhitespace }) }
    func fv(_ s: String) -> String { Dict.fixVi(s, cfg.viTypo) }

    func wikiHas(_ word: String) async -> Bool {
        if !isPhrase(word) { return true }
        if let v = wikiPages[word] { return v }
        guard let d = await net.json("https://en.wiktionary.org/w/api.php?action=query&titles=\(Dict.enc(word))&format=json&formatversion=2&origin=*", timeout: 4),
              let p = d["query"]?["pages"]?.array?.first else { return false }
        let ok = !p.t("missing") && !p.t("invalid")
        wikiPages[word] = ok
        return ok
    }

    // MARK: sources
    func fromGoogle(_ word: String) async -> JSON? {
        let base = cfg.wantVi ? gtx("en", "vi", "&hl=vi&dj=1") : gtx("en", "en", "&hl=en&dj=1")
        guard let d = await net.json("\(base)&dt=t&dt=bd&dt=md&dt=ex&dt=ss&q=\(Dict.enc(word))", timeout: 4), d.isObject else { return nil }
        let vi = fv(d.list("sentences").map { $0.s("trans") }.joined().trimmingCharacters(in: .whitespacesAndNewlines))
        let senses = d.list("dict").map { x -> JSON in
            var seen = Set<String>(), terms: [String] = []
            for t in x.strs("terms").map(fv) where seen.insert(t).inserted { terms.append(t) }
            return JSON.obj([("pos", x["pos"] ?? .null), ("terms", .strings(Array(terms.prefix(6))))])
        }
        var exById: [String: String] = [:]
        for e in d["examples"]?.list("example") ?? [] { exById[e.s("definition_id")] = Dict.rx(e.s("text"), "</?b>", "") }
        func cleanDef(_ s: String) -> String { Dict.rx(s.trimmingCharacters(in: .whitespacesAndNewlines), "^[0-9a-zA-Z]\\.\\s+", "") }
        let defs = d.list("definitions").map { x -> JSON in
            var list: [JSON] = []
            for e in x.list("entry") {
                if e.t("gloss") { list.append(.obj([("def", .string(cleanDef(e.s("gloss")))), ("ex", .string(e.t("example") ? e.s("example") : (exById[e.s("definition_id")] ?? "")))])) }
                for sub in e.list("subentries") where sub.t("gloss") { list.append(.obj([("def", .string(cleanDef(sub.s("gloss")))), ("ex", .string(sub.t("example") ? sub.s("example") : (exById[sub.s("definition_id")] ?? "")))])) }
            }
            return .obj([("pos", x["pos"] ?? .null), ("defs", .array(Array(list.filter { $0.s("def").utf16.count > 3 }.prefix(4))))])
        }
        var syn: [String] = []
        for s in d.list("synsets") { for e in s.list("entry") { for y in e.strs("synonym") where !syn.contains(y) { syn.append(y) } } }
        let base1 = d.list("dict").first?.s("base_form") ?? ""
        let baseForm = !base1.isEmpty ? base1 : (d.list("definitions").first?.s("base_form") ?? "")
        return .obj([("vi", .string(vi)), ("senses", .array(senses)), ("defs", .array(defs)), ("syn", .strings(Array(syn.prefix(8)))), ("base", .string(baseForm))])
    }

    func fromFreeDict(_ word: String) async -> JSON? {
        if isPhrase(word) { return nil }
        guard let data = await net.json(dapi(word), timeout: 3.5)?.array, !data.isEmpty else { return nil }
        var ipa = "", ipaUS = "", audio = "", audioUS = "", meanings: [JSON] = [], syn: [String] = []
        for entry in data {
            for p in entry.list("phonetics") {
                let a = p.s("audio")
                if a.hasSuffix("-uk.mp3") && audio.isEmpty { audio = a; if p.t("text") { ipa = p.s("text") } }
                else if a.hasSuffix("-us.mp3") && audioUS.isEmpty { audioUS = a; if p.t("text") { ipaUS = p.s("text") } }
            }
            if ipa.isEmpty { ipa = entry.t("phonetic") ? entry.s("phonetic") : (entry.list("phonetics").map { $0.s("text") }.first { !$0.isEmpty } ?? "") }
            for m in entry.list("meanings") {
                meanings.append(.obj([("pos", m["partOfSpeech"] ?? .null), ("defs", .array(m.list("definitions").prefix(3).map { .obj([("def", $0["definition"] ?? .null), ("ex", .string($0.s("example")))]) }))]))
                syn.append(contentsOf: m.strs("synonyms"))
            }
        }
        if audio.isEmpty { audio = audioUS }
        var seen = Set<String>(), uniq: [String] = []
        for s in syn where seen.insert(s).inserted { uniq.append(s) }
        return .obj([("ipa", .string(ipa)), ("ipaUS", .string(ipaUS)), ("audio", .string(audio)), ("audioUS", .string(audioUS)), ("meanings", .array(meanings)), ("syn", .strings(Array(uniq.prefix(6))))])
    }

    static func md5hex(_ s: String) -> String { Insecure.MD5.hash(data: Data(s.utf8)).map { String(format: "%02x", $0) }.joined() }
    static func commonsURL(_ f: String) -> String {
        let n = f.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: " ", with: "_")
        let name = n.prefix(1).uppercased() + n.dropFirst(), h = md5hex(String(name))
        return "https://upload.wikimedia.org/wikipedia/commons/\(h.prefix(1))/\(h.prefix(2))/\(Dict.enc(String(name)))"
    }
    /// Wiktionary pronunciation by part of speech + accent, with Commons audio
    func wiktIPA(_ word: String) async -> JSON? {
        if !(await wikiHas(word)) { return nil }
        guard let d = await net.json("https://en.wiktionary.org/w/api.php?action=parse&page=\(Dict.enc(word))&prop=wikitext&format=json&formatversion=2&origin=*", timeout: 6),
              let text = d["parse"]?["wikitext"]?.string, !text.isEmpty else { return nil }
        let en = Dict.split(text, "\\n==(?!=)").first { $0.hasPrefix("English==") } ?? text
        func acc(_ x: String) -> String { Dict.test(x, "^(UK|RP|Received Pronunciation|British|England)$", ci: true) ? "UK" : Dict.test(x, "^(US|GA|General American|America)$", ci: true) ? "US" : "" }
        func posOf(_ x: String) -> String {
            let l = x.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
            return Dict.test(l, "^(noun|verb|adjective|adverb|preposition|conjunction|pronoun|interjection|determiner)s?$", ci: true) ? Dict.rx(l, "s$", "") : ""
        }
        func fix(_ x: String) -> String { Dict.rx(x.replacingOccurrences(of: "ɹ", with: "r").replacingOccurrences(of: ".", with: ""), "[\u{032F}\u{0306}\u{031A}\u{0361}]", "") }
        var entries: [JSON] = []
        // split before every "===Etymology" heading
        var blocks: [String] = []
        if let re = try? NSRegularExpression(pattern: "\\n(?====Etymology)") {
            var last = en.startIndex
            for m in re.matches(in: en, range: NSRange(en.startIndex..., in: en)) { if let r = Range(m.range, in: en) { blocks.append(String(en[last..<r.lowerBound])); last = r.upperBound } }
            blocks.append(String(en[last...]))
        } else { blocks = [en] }
        for blk in blocks {
            let blockPos = Dict.matches(blk, "\\n====?(Noun|Verb|Adjective|Adverb|Preposition|Conjunction|Pronoun|Interjection|Determiner)====?").map { $0[1].lowercased() }
            var parent: [String]?
            for line in blk.components(separatedBy: "\n") {
                var toks = Dict.matches(line, "\\{\\{(?:a|q|qualifier|i)\\|(?:en\\|)?([^}]+)\\}\\}").flatMap { $0[1].split(separator: "|", omittingEmptySubsequences: false).map(String.init) }
                toks += Dict.matches(line, "\\|a=([^|}]*)").flatMap { Dict.split($0[1], "[,;]") }
                let ipaM = Dict.matches(line, "\\{\\{IPA\\|en\\|([^}|]+)")
                let level1 = line.hasPrefix("* ") || line.hasPrefix("*\t"), level2 = line.hasPrefix("**")
                guard let m = ipaM.first else {
                    if level1 && !toks.isEmpty { parent = toks } else if level1 { parent = nil }
                    continue
                }
                if level1 { parent = nil }
                let all = toks + (level2 ? (parent ?? []) : [])
                let ipa0 = Dict.rx(m[1].trimmingCharacters(in: .whitespacesAndNewlines), "<[^>]*>", "")
                if !ipa0.hasPrefix("/") { continue }
                var accs: [String] = []
                for x in all.map(acc) where !x.isEmpty && !accs.contains(x) { accs.append(x) }
                let otherAcc = all.contains { Dict.test($0.trimmingCharacters(in: .whitespacesAndNewlines), "^(AU|NZ|CA|Canada|Australia|New Zealand|Scotland|Scottish|Ireland|Irish|India|Indian|South Africa|Northern England|cot-caught|.*dialects.*)$", ci: true) }
                let accS = !accs.isEmpty ? accs.joined(separator: ",") : (otherAcc ? "X" : "")
                var pos = all.map(posOf).filter { !$0.isEmpty }
                if pos.isEmpty, level2, let p = parent, !p.contains(where: { !acc($0).isEmpty || !posOf($0).isEmpty }) { pos = ["other"] }
                if pos.isEmpty { pos = blockPos }
                entries.append(.obj([("acc", .string(accS)), ("pos", .strings(pos)), ("ipa", .string(fix(ipa0)))]))
            }
        }
        var aud = ["UK": "", "US": ""]
        for m in Dict.matches(en, "\\{\\{audio\\|en\\|([^|}]+\\.(?:ogg|oga|mp3|wav|opus))([^}]*)\\}\\}", ci: true) {
            let f = m[1].trimmingCharacters(in: .whitespacesAndNewlines)
            let a = (Dict.matches(m[2], "a=([^|}]*)").first?[1] ?? "") + " " + f
            let ac = Dict.test(a, "\\b(UK|RP|British|England|London)\\b|en-uk|\\(eng\\)", ci: true) ? "UK" : Dict.test(a, "\\b(US|GA|General American|America)\\b|en-us", ci: true) ? "US" : ""
            if !ac.isEmpty && aud[ac]!.isEmpty { aud[ac] = Self.commonsURL(f) }
        }
        if entries.isEmpty { return nil }
        func pick(_ acc: String) -> String {
            let notOther = entries.filter { !$0.strs("pos").contains("other") }
            let e = notOther.first { $0.s("acc").split(separator: ",").map(String.init).contains(acc) } ?? notOther.first { $0.s("acc").isEmpty } ?? entries[0]
            return e.s("ipa")
        }
        return .obj([("ipa", .string(pick("UK"))), ("ipaUS", .string(pick("US"))), ("entries", .array(entries)), ("audioUK", .string(aud["UK"]!)), ("audioUS", .string(aud["US"]!))])
    }

    /// bilingual example sentences from Tatoeba (≥ 5 words, closest to 70 chars first)
    public func sentences(_ word: String, limit: Int = 4, lang: String? = nil) async -> [JSON] {
        let L = lang ?? sentLang, tl = Dict.tato[L]
        let url = "https://api.tatoeba.org/unstable/sentences?lang=eng&q=\(Dict.enc(word))\(tl.map { "&trans:lang=\($0)" } ?? "")&sort=relevance&limit=20&showtrans=\(tl != nil ? "matching" : "none")"
        guard let d = await net.json(url, timeout: 3.5), let data = d["data"]?.array else { return [] }
        let items: [(en: String, vi: String)] = data.map { x in
            let flat = x.list("translations").flatMap { $0.array ?? [$0] }
            let tr = tl != nil ? (flat.first { $0.s("lang") == tl }?.s("text") ?? "") : ""
            return (x.s("text"), tr)
        }.filter { ($0.vi.isEmpty == false || tl == nil) && $0.en.split(separator: " ").count >= 5 }
        let sorted = Vocab.stableSorted(items) { abs($0.en.utf16.count - 70) < abs($1.en.utf16.count - 70) }
        return sorted.prefix(limit).map { JSON.obj([("en", .string($0.en)), ("vi", .string($0.vi)), ("l", .string(L))]) }
    }

    enum ImageResult { case got(JSON), absent, retry }
    func freeImage(_ word: String) async -> ImageResult {
        guard let r = await net.json("\(cfg.base)/api/img?w=\(Dict.enc(word.lowercased()))", timeout: 12) else { return .retry }
        if r.t("retry") { return .retry }
        if r.t("none") || !r.s("src").hasPrefix("https://") { return .absent }
        let via = r.t("via") ? r.s("via") : "Openverse"
        let vars: JSON = .obj([("title", .string(r.t("title") ? r.s("title") : word)), ("creator", .string(r.t("creator") ? r.s("creator") : cfg.translate("không rõ tác giả", nil))), ("license", .string(r.s("license")))])
        let credit = cfg.translate("“{title}” – {creator} · {license} · qua Openverse", vars).replacingOccurrences(of: "Openverse", with: via)
        return .got(.obj([("src", r["src"] ?? .null), ("link", r["link"] ?? .null), ("license", r["license"] ?? .null), ("credit", .string(credit))]))
    }

    // MARK: translate (network path only; on-device translators belong to the UI layer)
    public func myMemory(_ text: String, tl: String = "vi", sl: String = "en") async -> String {
        guard let d = await net.json("https://api.mymemory.translated.net/get?q=\(Dict.enc(text))&langpair=\(Dict.enc(sl))|\(Dict.enc(tl))", timeout: 8) else { return "" }
        let t = d["responseData"]?["translatedText"]?.string ?? ""
        if t.isEmpty || Dict.test(t, "MYMEMORY WARNING|INVALID", ci: true) { return "" }
        return tl == "vi" ? fv(t) : t.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    public func translateVi(_ text: String) async -> String {
        let d = await net.json("\(gtx("en", "vi", "&hl=vi&dj=1"))&dt=t&q=\(Dict.enc(text))", timeout: 8)
        let t = d.map { fv($0.list("sentences").map { $0.s("trans") }.joined().trimmingCharacters(in: .whitespacesAndNewlines)) } ?? ""
        return !t.isEmpty ? t : await myMemory(text, tl: "vi", sl: "en")
    }
    public func translateTo(_ text: String, tl: String, sl: String = "en") async -> String {
        if text.isEmpty || tl.isEmpty || tl == sl { return "" }
        if tl == "vi" && sl == "en" { return await translateVi(text) }
        let d = await net.json("\(gtx(sl, tl))&dj=1&dt=t&q=\(Dict.enc(text))", timeout: 8)
        let r = d.map { $0.list("sentences").map { $0.s("trans") }.joined().trimmingCharacters(in: .whitespacesAndNewlines) } ?? ""
        return !r.isEmpty ? r : await myMemory(text, tl: tl, sl: sl)
    }

    // MARK: rare words (Wiktionary REST → WordNet via Datamuse)
    static let posEn = ["Noun": "noun", "Verb": "verb", "Adjective": "adjective", "Adverb": "adverb", "Proper noun": "noun", "Preposition": "preposition", "Conjunction": "conjunction", "Pronoun": "pronoun", "Interjection": "interjection", "n": "noun", "v": "verb", "adj": "adjective", "adv": "adverb"]
    func rareDefs(_ word: String) async -> JSON? {
        func strip(_ h: String) -> String {
            var s = Dict.rx(h, "<[^>]+>", "").replacingOccurrences(of: "&nbsp;", with: " ").replacingOccurrences(of: "&amp;", with: "&")
            s = s.split(whereSeparator: { $0.isWhitespace }).joined(separator: " "); return s
        }
        let wk = (await wikiHas(word)) ? await net.json("https://en.wiktionary.org/api/rest_v1/page/definition/\(Dict.enc(word))", timeout: 3.5) : nil
        if let en = wk?["en"]?.array, !en.isEmpty {
            let meanings: [JSON] = en.prefix(4).compactMap { m in
                let p = Self.posEn[m.s("partOfSpeech")] ?? m.s("partOfSpeech").lowercased()
                let defs: [JSON] = m.list("definitions").compactMap { d in
                    let def = strip(d.s("definition")); if def.isEmpty { return nil }
                    return .obj([("def", .string(def)), ("ex", .string(strip(d.list("examples").first?.jsToString ?? "")))]) }
                return defs.isEmpty ? nil : .obj([("pos", .string(p)), ("defs", .array(Array(defs.prefix(3))))])
            }
            if !meanings.isEmpty { return .obj([("ipa", ""), ("ipaUS", ""), ("audio", ""), ("audioUS", ""), ("meanings", .array(meanings)), ("syn", .array([])), ("src", "Wiktionary")]) }
        }
        let wn = await net.json("https://api.datamuse.com/words?sp=\(Dict.enc(word))&md=dp&max=1&o=\(Dict.enc(cfg.base))", timeout: 3)
        if let row = wn?.array?.first, row.s("word") == word.lowercased(), !row.list("defs").isEmpty {
            var by: [(String, [JSON])] = []
            for x in row.strs("defs") {
                let p = x.components(separatedBy: "\t"), pos = Self.posEn[p[0]] ?? p[0], d = JSON.obj([("def", .string(p.count > 1 ? p[1] : "")), ("ex", "")])
                if let i = by.firstIndex(where: { $0.0 == pos }) { by[i].1.append(d) } else { by.append((pos, [d])) }
            }
            return .obj([("ipa", ""), ("ipaUS", ""), ("audio", ""), ("audioUS", ""), ("meanings", .array(by.map { .obj([("pos", .string($0.0)), ("defs", .array(Array($0.1.prefix(3))))]) })), ("syn", .array([])), ("src", "WordNet")])
        }
        return nil
    }

    // MARK: quick / lookup
    func localOf(_ word: String) async -> (local: JSON?, from: String) {
        guard let r = await lex.get(word) else { return (nil, "") }
        return (r.entry, r.via == "exact" || r.via == "fold" ? "" : (r.from.isEmpty ? word : r.from))
    }
    static let localFields = ["ipa", "pos", "vi", "def", "ex", "col", "syn", "level", "emoji", "topic"]
    func overlay(_ e: JSON?, _ local: JSON?) -> JSON? {
        guard var o = e, let local else { return e }
        for f in Self.localFields { if let v = local[f], v != .null, v != .string(""), v != .array([]) { o[f] = v } }
        o["ipaUS"] = local.t("ipaUS") ? local["ipaUS"]! : (local.t("ipa") ? .string("") : (o["ipaUS"] ?? .null))
        return o
    }
    func saved(_ word: String) async -> JSON? {
        guard let x = await cache?.get(word), x.d("_v") == Self.dataVersion, (x.t("_ml") ? x.s("_ml") : "vi") == (cfg.wantVi ? "vi" : "en") else { return nil }
        return Dict.fixDeep(x, cfg.viTypo)
    }
    func wrap(_ e: JSON?) -> JSON? { Dict.forLang(e, wantVi: cfg.wantVi, sentLang: sentLang) }

    /// quick lookup (no network when the word is in the lexicon): partial entry to show at once
    public func quick(_ raw: String) async -> JSON? { wrap(await quickRaw(raw)) }
    func quickRaw(_ raw: String) async -> JSON? {
        let word = Dict.normWord(raw)
        if word.isEmpty { return nil }
        if let h = mem[word] { return h }
        if let h = quickMem[word] { return h }
        let (local, from) = await localOf(word)
        let now = cfg.now()
        if let s = await saved(word), now - Int64(s.d("_t") ?? 0) < Self.fresh { let s2 = overlay(s, local); mem[word] = s2; return s2 }
        if let local {
            var e = Dict.buildEntry(from.isEmpty ? word : local.s("word"), local: local, gg: nil, fd: nil, wk: nil, img: nil, sents: [])
            e["partial"] = true; e["from"] = .string(from)
            quickMem[word] = e; return e
        }
        async let g = fromGoogle(word); async let w = wiktIPA(word)
        let (gg, wk) = await (g, w)
        let hasGoogle = gg.map { !$0.list("senses").isEmpty || !$0.list("defs").isEmpty } ?? false
        if !hasGoogle { return nil }
        var e = Dict.buildEntry(word, local: nil, gg: gg, fd: nil, wk: wk, img: nil, sents: [])
        e["partial"] = true
        quickMem[word] = e; return e
    }

    /// translated sentences of the lexicon/Oxford examples when Tatoeba has too few
    func relang(_ e: JSON?, _ word: String, _ examples: Bool) async -> JSON? {
        guard var o = e, o.t("found"), examples else { return e }
        let L = sentLang, list = o.list("sentences"), ok = Dict.sentsOk(list, L)
        if ok.count == list.count && (!ok.isEmpty || o.s("_sl") == L) { return e }
        o["sentences"] = .array(ok.isEmpty ? await sentences(word, limit: 4, lang: L) : ok); o["_sl"] = .string(L)
        return o
    }

    /// full lookup: + audio, image, bilingual sentences, extra definitions. nil for an empty word; `{word, found:false, vi}` when nothing knows it.
    public func lookup(_ raw: String, image: Bool = true, examples: Bool = true) async -> JSON? { wrap(await lookupRaw(raw, image: image, examples: examples)) }
    func lookupRaw(_ raw: String, image: Bool, examples: Bool) async -> JSON? {
        let word = Dict.normWord(raw)
        if word.isEmpty { return nil }
        if let hit = mem[word], !hit.t("partial"), hit.t("image") || !image || hit["_imgTry"] != nil {
            let h2 = await relang(hit, word, examples); if let h2 { mem[word] = h2 }; return h2
        }
        let (local, from) = await localOf(word)
        let now = cfg.now()
        if var s = overlay(await saved(word), local), now - Int64(s.d("_t") ?? 0) < Self.fresh {
            if image, !s.t("image"), Dict.test(s.t("pos") ? s.s("pos") : "n", "^n|danh"), now - Int64(s.d("_imgTry") ?? 0) > 6 * 3_600_000 {
                switch await freeImage(word) {
                case .retry: s["_imgTry"] = 0
                case .absent: s["_imgTry"] = .number(Double(now))
                case .got(let im): s["_imgTry"] = .number(Double(now)); s["image"] = im["src"]; s["imageCredit"] = .obj([("text", im["credit"] ?? .null), ("link", im["link"] ?? .null)])
                }
                await cache?.set(word, s)
            }
            let s2 = await relang(s, word, examples); mem[word] = s2; return s2
        }
        async let gA = fromGoogle(word)
        async let fA = fromFreeDict(word)
        async let wA = wiktIPA(word)
        async let iA: ImageResult? = image ? freeImage(word) : nil
        async let sA: [JSON] = examples ? sentences(word) : []
        let gg = await gA
        var fd = await fA, wk = await wA
        var img = await iA
        var sents = await sA
        let base = gg.map { $0.s("base") }.flatMap { $0 != word && !$0.isEmpty ? $0 : nil } ?? ""
        if image, !base.isEmpty {
            var haveImage = false
            if case .got? = img { haveImage = true }
            if !haveImage {
                let ib = await freeImage(base)
                if case .got = ib { img = ib } else if case .retry? = img { img = ib }
            }
        }
        if !base.isEmpty, fd == nil || (wk == nil && !(local?.t("ipa") ?? false)) {
            let fd0 = fd, wk0 = wk
            let fb = fd0 == nil ? await fromFreeDict(base) : fd0
            let wb = wk0 == nil ? await wiktIPA(base) : wk0
            fd = fb; wk = wb
        }
        let hasGoogle = gg.map { !$0.list("senses").isEmpty || !$0.list("defs").isEmpty } ?? false
        if hasGoogle, fd == nil, gg!.list("defs").isEmpty, !(local?.t("def") ?? false), let rd = await rareDefs(word) { fd = rd; fd!["ipa"] = ""; fd!["ipaUS"] = "" }
        if local == nil, fd == nil, !hasGoogle {
            fd = await rareDefs(word)
            if fd == nil {
                let gv = gg?.s("vi") ?? ""
                return .obj([("word", .string(word)), ("found", false), ("vi", .string(!gv.isEmpty && gv != word ? gv : await myMemory(word)))])
            }
            if let wk { fd!["ipa"] = wk["ipa"] ?? ""; fd!["ipaUS"] = wk["ipaUS"] ?? "" }
        }
        let SL = sentLang
        if examples, sents.count < 2, gg != nil, SL != "en" {
            let have = Set(sents.map { $0.s("en") })
            let exs = Array(gg!.list("defs").flatMap { $0.list("defs") }.map { $0.s("ex") }.filter { !$0.isEmpty && !Dict.test($0, Dict.viDia, ci: true) && !have.contains($0) }.prefix(3 - sents.count))
            if !exs.isEmpty {
                let joined = exs.joined(separator: "\n")
                let tr = (SL == "vi" ? await translateVi(joined) : await translateTo(joined, tl: SL)).components(separatedBy: "\n")
                for (i, en) in exs.enumerated() {
                    let v = (i < tr.count ? tr[i] : "").trimmingCharacters(in: .whitespacesAndNewlines)
                    if !v.isEmpty && (SL == "vi" || !Dict.test(v, Dict.viDia, ci: true)) {
                        sents.append(.obj([("en", .string(en.prefix(1).uppercased() + en.dropFirst())), ("vi", .string(v.prefix(1).uppercased() + v.dropFirst())), ("auto", true), ("l", .string(SL))]))
                    }
                }
            }
        }
        var imgJSON: JSON?
        if case .got(let j)? = img { imgJSON = j }
        var entry = Dict.buildEntry(from.isEmpty ? word : (local?.s("word") ?? word), local: local, gg: gg, fd: fd, wk: wk, img: imgJSON, sents: sents)
        if !from.isEmpty { entry["from"] = .string(from) }
        if examples { entry["_sl"] = .string(SL) }
        if entry.t("image"), !Dict.test(entry.s("pos"), "^n|danh") { entry["image"] = .string(""); entry["imageCredit"] = .null }
        if image, !entry.t("image") { if case .retry? = img { entry["_imgTry"] = 0 } else { entry["_imgTry"] = .number(Double(now)) } }
        mem[word] = entry
        if image && examples {
            var stored = entry
            stored["meanings"] = .array(entry.list("oxford").isEmpty ? Array(entry.list("meanings").prefix(2)) : [])
            stored["_t"] = .number(Double(now)); stored["_v"] = .number(Self.dataVersion); stored["_ml"] = .string(cfg.wantVi ? "vi" : "en")
            await cache?.set(word, stored)
        }
        return entry
    }

    /// IPA for a word that has no dictionary entry (compound: fair+trade) by joining the IPA of two parts
    public func ipaGuess(_ raw: String) async -> JSON? {
        let word = raw.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        if let full = await lookup(word, image: false, examples: false), full.t("ipa") { return .obj([("ipa", full["ipa"]!), ("ipaUS", .string(full.s("ipaUS"))), ("guess", false)]) }
        guard Dict.test(word, "^[a-z]{6,}$") else { return nil }
        func strip(_ x: String) -> String { Dict.rx(x, "^/|/$", "").trimmingCharacters(in: .whitespacesAndNewlines) }
        var cuts = Array(3...(word.count - 3))
        cuts = Vocab.stableSorted(cuts) { min($0, word.count - $0) > min($1, word.count - $1) }
        for i in cuts.prefix(4) {
            let a = String(word.prefix(i)), b = String(word.dropFirst(i))
            async let ia = wiktIPA(a), ib = wiktIPA(b)
            let (x, y) = await (ia, ib)
            if let x, let y, x.t("ipa"), y.t("ipa") {
                func join(_ p: String, _ q: String) -> String {
                    let pp = strip(p), qq = Dict.rx(Dict.rx(strip(q), "^ˈ", ""), "ˈ", "ˌ")
                    return "/" + (pp.hasPrefix("ˈ") ? pp : "ˈ" + pp) + "ˌ" + Dict.rx(qq, "^ˌ", "") + "/"
                }
                return .obj([("ipa", .string(join(x.s("ipa"), y.s("ipa")))), ("ipaUS", .string(join(x.t("ipaUS") ? x.s("ipaUS") : x.s("ipa"), y.t("ipaUS") ? y.s("ipaUS") : y.s("ipa")))), ("guess", true), ("parts", .strings([a, b]))])
            }
        }
        return nil
    }
}

/// #/dict/<word> page model (web/js/dict-page.js `paint`): what the UI shows, from one dictionary entry.
public enum DictPage {
    public struct PosBlock: Equatable, Sendable {
        /// English POS key (noun…); `viName` = the Vietnamese name when the UI language is Vietnamese
        public var pos: String, viName: String?
        public var vi: [String]
        public var defs: [(def: String, ex: String)]
        public static func == (a: PosBlock, b: PosBlock) -> Bool { a.pos == b.pos && a.vi == b.vi && a.defs.map { $0.def + "|" + $0.ex } == b.defs.map { $0.def + "|" + $0.ex } }
    }
    public struct Model: Sendable {
        public var word: String, meaning: String, def: String
        public var example: String?
        /// translation of the main example when the sentence store has that exact sentence, and whether it is machine-translated Oxford
        public var exampleTranslation: (vi: String, auto: Bool)?
        public var posBlocks: [PosBlock]
        /// "Định nghĩa bổ sung" count (dictionaryapi, only when Oxford definitions exist too)
        public var extraMeanings: Int
        /// bilingual sentence list (the main example is not repeated)
        public var bilingual: [(en: String, vi: String, auto: Bool)]
        public var canQuickSave: Bool, saved: Bool
        public var practiceSpeak: String, verb: String?, usage: String?
    }
    static let vip = ["danh từ": "noun", "động từ": "verb", "tính từ": "adjective", "trạng từ": "adverb", "giới từ": "preposition", "liên từ": "conjunction", "đại từ": "pronoun", "thán từ": "interjection", "từ hạn định": "determiner", "viết tắt": "abbreviation", "cụm từ": "phrase"]
    /// - Parameters: `saved` = the word is already a card · `uiLang`/`meanLang` as in settings · `verbs` / `usage` decide the "Chia động từ" / "Cách dùng" buttons
    public static func model(_ e: JSON, saved: Bool, uiLang: String = "vi", meanLang: String = "vi", verbs: Verbs? = nil, hasUsage: (String) -> Bool = { _ in false }) -> Model {
        let ex0 = (e["ex"]?.array?.first?.jsToString ?? (e.t("ex") ? e.s("ex") : "")).trimmingCharacters(in: .whitespacesAndNewlines)
        func same(_ x: String) -> Bool { x.trimmingCharacters(in: .whitespacesAndNewlines).lowercased() == ex0.lowercased() }
        let all = e.list("sentences")
        let exS = ex0.isEmpty ? nil : all.first { same($0.s("en")) }
        func key(_ p: String) -> String { let l = p.lowercased(); return vip[l] ?? l }
        var order: [String] = [], by: [String: (vi: [String], defs: [JSON])] = [:]
        func grp(_ p: String) { if by[p] == nil { order.append(p); by[p] = ([], []) } }
        if meanLang == "vi" { for x in e.list("senses") { let k = key(x.s("pos")); grp(k); by[k]!.vi = x.strs("terms") } }
        for m in e.list("oxford") { let k = key(m.s("pos")); grp(k); by[k]!.defs += m.list("defs") }
        if e.list("oxford").isEmpty { for m in e.list("meanings") { let k = key(m.s("pos")); grp(k); by[k]!.defs += Array(m.list("defs").prefix(3)) } }
        let blocks = order.filter { !(by[$0]!.vi.isEmpty && by[$0]!.defs.isEmpty) }.map { k -> PosBlock in
            let g = by[k]!
            let defs = g.defs.prefix(4).map { d -> (def: String, ex: String) in (d.s("def"), d.t("ex") && !same(d.s("ex")) ? d.s("ex") : "") }
            return PosBlock(pos: k, viName: uiLang == "vi" ? (vip.first { $0.value == k }?.key ?? k) : nil, vi: g.vi, defs: defs)
        }
        let word = e.s("word")
        let verb = verbs.map { $0.verbOf(e) }.flatMap { $0.isEmpty ? nil : $0 }
        return Model(word: word, meaning: e.s("vi"), def: e.s("def"), example: ex0.isEmpty ? nil : ex0,
                     exampleTranslation: exS.map { ($0.s("vi"), $0.t("auto")) }, posBlocks: blocks,
                     extraMeanings: !e.list("meanings").isEmpty && !e.list("oxford").isEmpty ? e.list("meanings").count : 0,
                     bilingual: all.filter { $0 != exS }.map { ($0.s("en"), $0.s("vi"), $0.t("auto")) },
                     canQuickSave: !saved, saved: saved, practiceSpeak: "#/practice/speak?w=" + Dict.enc(word), verb: verb.map { "#/verb/" + Dict.enc($0) },
                     usage: hasUsage(word.lowercased()) ? "#/usage/" + Dict.enc(word.lowercased()) : nil)
    }
    /// the context a "Lưu vào flashcard" with a pasted sentence stores
    public static func saveContext(text: String, vi: String) -> JSON? {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        return t.isEmpty ? nil : .obj([("text", .string(t)), ("vi", .string(vi)), ("source", ""), ("title", "Ghi chú của bạn")])
    }
    /// `Store 'recent'`: newest first, no duplicates, 8 kept
    public static func recent(_ list: [String], adding w: String) -> [String] { Array(([w] + list.filter { $0 != w }).prefix(8)) }
    /// the lookup counts as a "lookups" reward once per word per day
    public static func lookupKey(day: String, word: String) -> String { day + ":" + word }
    /// the six sample words of the empty search page and the 8-chip recent list live in the content pack; this is the list the web page shows
    public static let sampleWords = ["resilient", "mitigate", "phenomenon", "detrimental", "ubiquitous", "paradigm"]
}
