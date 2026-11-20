import Foundation
import LKSync
import LKCore
import LKStrings

/// M4 P07 – #/say (web/js/say.js): the series list, the two faces of a card, the microphone verdict, the actions and the share text. Pure: the seen set,
/// the learner language and the series data come in as values; sound, microphone and the share sheet are the screens' business. Verified against vectors/speak.json `say.*`.

/// A web `t()` call: a typed string id with its variables, or a piece of data that is shown as it is.
public struct SayMsg: Equatable, Sendable {
    public var key: L10nKey?
    public var vars: [String: String]
    public var raw: String
    public init(_ key: L10nKey, _ vars: [String: String] = [:]) { self.key = key; self.vars = vars; raw = "" }
    public init(raw: String) { key = nil; vars = [:]; self.raw = raw }
    public static let empty = SayMsg(raw: "")
    public func text(_ t: L10n) -> String { key.map { t($0, vars) } ?? raw }
    public var isEmpty: Bool { key == nil && raw.isEmpty }
}

public enum SayCore {
    public static let site = "https://lexkite.com/app/#/say"
    public static let seenKey = "lk.say.seen"
    /// the verdict thresholds of the microphone line
    public static let great = 85, near = 60
    /// the "listen slowly" button
    public static let slowRate = 0.7

    // MARK: seen cards (localStorage lk.say.seen = {"series/card": 1})
    public static func seen(_ d: UserDefaults) -> Set<String> {
        guard let s = d.string(forKey: seenKey), let j = try? JSON.parse(s), let o = j.object else { return [] }
        return Set(o.filter { $0.value.truthy }.keys)
    }
    public static func markSeen(_ key: String, in d: UserDefaults) {
        var o: [String: JSON] = [:]
        for k in seen(d) { o[k] = .number(1) }
        o[key] = .number(1)
        d.set(JSON.object(o).stableString, forKey: seenKey)
    }

    // MARK: the list
    public struct Row: Equatable, Sendable {
        public var series: String, firstCard: String, title: String, teacher: String
        public var n: Int, total: Int, pct: Int
    }
    /// per series: the first card not seen yet (all seen ⇒ the first card), n seen, bar % = round(100·n/total)
    public static func rows(_ series: [JSON], seen: Set<String>) -> [Row] {
        series.map { s in
            let items = s.list("items"), sid = s.s("id")
            let n = items.filter { seen.contains(sid + "/" + $0.s("id")) }.count
            let first = items.first { !seen.contains(sid + "/" + $0.s("id")) } ?? items.first
            return Row(series: sid, firstCard: first?.s("id") ?? "", title: s.s("title"), teacher: s.s("teacher"), n: n, total: items.count,
                       pct: items.isEmpty ? 0 : Vocab.round(100 * Double(n) / Double(items.count)))
        }
    }
    public static func progress(_ r: Row, teacherName: String) -> SayMsg {
        SayMsg(.speakSayNTotalTheVoi, ["n": String(r.n), "total": String(r.total), "name": teacherName])
    }

    // MARK: the route
    public enum Route: Equatable, Sendable {
        case list
        /// known series, no / unknown card → `#/say/<series>/<first card>`
        case replace(series: String, card: String)
        case card(series: Int, item: Int)
    }
    public static func route(_ arg: String, _ series: [JSON]) -> Route {
        let parts = arg.split(separator: "/", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
        guard let si = series.firstIndex(where: { $0.s("id") == parts.first }) else { return .list }
        let s = series[si], items = s.list("items")
        guard !items.isEmpty else { return .list }
        let iid = parts.count > 1 ? parts[1] : ""
        let i = max(0, items.firstIndex { $0.s("id") == iid } ?? 0)
        if iid.isEmpty || items[i].s("id") != iid { return .replace(series: s.s("id"), card: items[i].s("id")) }
        return .card(series: si, item: i)
    }

    // MARK: register / reaction / why labels
    public static func register(_ reg: String) -> SayMsg {
        switch reg {
        case "polite": return SayMsg(.speakSayLichSu)
        case "neutral": return SayMsg(.speakSaySacThaiTrungTinh)
        case "casual": return SayMsg(.lettersInformal)
        case "blunt": return SayMsg(.speakSayCocLoc)
        case "rude": return SayMsg(.speakSayThoLo)
        default: return SayMsg(raw: reg)
        }
    }
    static func reaction(_ reg: String) -> SayMsg {
        switch reg {
        case "polite": return SayMsg(.speakSayKheoLamKhongAi)
        case "neutral": return SayMsg(.speakSayRoRangMaVan)
        case "casual": return SayMsg(.speakSayThoaiMaiHopNoi)
        default: return .empty
        }
    }
    static func why(_ reg: String) -> SayMsg {
        switch reg {
        case "blunt": return SayMsg(.speakSayNgheGayGat)
        case "rude": return SayMsg(.speakSayXucPhamNguoiNghe)
        case "polite": return SayMsg(.speakSayGiuHoaKhi)
        case "neutral": return SayMsg(.speakSayTuNhienDeNghe)
        case "casual": return SayMsg(.speakSayGanGui)
        default: return .empty
        }
    }

    // MARK: the two faces
    public struct Front: Equatable, Sendable {
        public var say: String, regLbl: SayMsg, series: String, step: SayMsg, ipa: String, pct: Double, n: Int, total: Int
        public var teacher: String, pose: String
    }
    public static func front(_ s: JSON, _ i: Int) -> Front {
        let items = s.list("items"), it = items[i], total = items.count
        var ipa = it.s("ipa")
        if !ipa.isEmpty {
            if ipa.hasPrefix("/") { ipa.removeFirst() }
            if ipa.hasSuffix("/") { ipa.removeLast() }
            ipa = "/" + ipa + "/"
        }
        return Front(say: it.s("say"), regLbl: register(it.s("reg")), series: "\(s.s("title")) · \(i + 1)/\(total)",
                     step: SayMsg(.speakSayTheNTotal, ["n": String(i + 1), "total": String(total)]), ipa: ipa,
                     pct: Double(Vocab.round(Double(i + 1) / Double(total) * 1000)) / 10, n: i + 1, total: total, teacher: s.s("teacher"), pose: it.s("pose"))
    }

    public struct Back: Equatable, Sendable {
        public var say: String, regLbl: SayMsg, react: SayMsg, def: String, mLbl: SayMsg, mLang: String, meaning: String, real: SayMsg, when: String
        public var dont: String, dontReg: SayMsg, dontWhy: SayMsg, dontAria: SayMsg, dontMasked: Bool
        public var swap: String, swapReg: SayMsg, swapWhy: SayMsg, next: String
        public var teacher: String, pose: String
    }
    /// `learnLang` = the learner's language; `langName` = its name in the interface language (Intl.DisplayNames)
    public static func back(_ s: JSON, _ i: Int, learnLang l: String, langName: (String) -> String) -> Back {
        let items = s.list("items"), it = items[i], total = items.count
        let next = items[(i + 1) % total]
        let m = it["m"]?[l]?.string ?? ""
        let meaning = l != "en" && !m.isEmpty ? m : it.s("mean")
        let mLang = meaning == it.s("mean") ? "en" : l
        let dont = it["dont"], swap = it["swap"]
        let hasDont = dont?.truthy == true && dont?.isObject == true, hasSwap = swap?.truthy == true && swap?.isObject == true
        return Back(say: it.s("say"), regLbl: register(it.s("reg")), react: reaction(it.s("reg")), def: it.s("def"),
                    mLbl: mLang == "en" ? SayMsg(.speakSayNghiaDeHieu) : SayMsg(.speakSayNghiaLang, ["lang": langName(l)]), mLang: mLang, meaning: meaning,
                    real: mLang == "en" ? .empty : SayMsg(.speakSayThucRaLaS, ["s": it.s("mean")]), when: it.s("when"),
                    dont: hasDont ? dont!.s("text") : "", dontReg: hasDont ? register(dont!.s("reg")) : .empty, dontWhy: hasDont ? why(dont!.s("reg")) : .empty,
                    dontAria: hasDont ? (dont!.t("masked") ? SayMsg(.speakSayCauThoLoDa) : SayMsg(raw: dont!.s("text"))) : .empty, dontMasked: hasDont && dont!.t("masked"),
                    swap: hasSwap ? swap!.s("text") : "", swapReg: hasSwap ? register(swap!.s("reg")) : .empty, swapWhy: hasSwap ? why(swap!.s("reg")) : .empty,
                    next: "#/say/" + s.s("id") + "/" + next.s("id"), teacher: s.s("teacher"), pose: it.s("pose"))
    }
    public static func cardKey(_ s: JSON, _ i: Int) -> String { s.s("id") + "/" + (s.list("items")[i].s("id")) }

    // MARK: actions
    /// What 🔊 / 🎧 speak: always the card sentence (en-US, the series teacher), never the "don't say" line – raw and rude lines are not speakable at all.
    public static func speakable(_ line: JSON?) -> Bool { line != nil && line?.t("masked") != true && line?.s("reg") != "rude" }
    public static let accent = "en-US"

    // MARK: the microphone line
    public enum Verdict: Equatable, Sendable { case great, near, far }
    public static func verdict(_ score: Int) -> Verdict { score >= great ? .great : (score >= near ? .near : .far) }
    /// after a result: verdict text, then `· “heard”` when something was heard
    public static func micResult(score: Int, heard: String) -> (text: SayMsg, heardAppended: Bool) {
        let p = ["p": String(score)]
        switch verdict(score) {
        case .great: return (SayMsg(.speakSayChuanNhuNguoiBan, p), !heard.isEmpty)
        case .near: return (SayMsg(.speakSayGanDungRoiP, p), !heard.isEmpty)
        case .far: return (SayMsg(.speakSayChuaGiongLamP, p), !heard.isEmpty)
        }
    }
    public static func micError(_ code: String) -> SayMsg {
        code == "not-allowed" ? SayMsg(.speakSayHayChoPhepDung) : (code == "unsupported" ? SayMsg(.speakSayTrinhDuyetNayChua) : SayMsg(.speakSayKhongNgheRoThu))
    }
    public static let listening = SayMsg(.speakSayDangNgheHayNoi)

    // MARK: share
    public static func url(_ s: JSON, _ it: JSON) -> String { "\(site)/\(s.s("id"))/\(it.s("id"))" }
    public static func shareText(_ s: JSON, _ it: JSON) -> SayMsg { SayMsg(.speakSaySNoiNhuNguoi, ["s": it.s("say"), "url": url(s, it)]) }
    public static func fileName(_ it: JSON, tall: Bool) -> String { "lexkite-say-\(it.s("id"))-\(tall ? "4x5" : "1x1").png" }
    /// 1080 × 1080 (1:1) or 1080 × 1350 (4:5)
    public static func imageSize(tall: Bool) -> (w: Int, h: Int) { (1080, tall ? 1350 : 1080) }
}
