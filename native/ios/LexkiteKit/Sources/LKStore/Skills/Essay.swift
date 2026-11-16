import Foundation
import LKSync
import LKStrings

/// M4 P09 – the pure part of #/write, #/task1 and #/qstats (web/js/write.js, task1.js, lexis.js `analyze`, qtips.js).
/// Verified against native/shared/gen/vectors/write.json (WriteVectorTests); the tables the web keeps in closures (outline, trends, STOP, SKILL …) come from `web/data/write-pack.json`.
public enum Essay {
    public static let minWords = 250, minToAnalyse = 40, keepSaved = 20, showSaved = 6, clockMinutes = 40, warnSeconds = 300
    /// `App.reward({ quizzes: 1, writes: 1, xp: 25 })`
    public static let reward: [String: Int] = ["quizzes": 1, "writes": 1, "xp": 25]

    private static let wordRe = try! NSRegularExpression(pattern: "[A-Za-z][A-Za-z'\u{2019}-]*")
    /// `(text.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length`
    public static func words(_ s: String) -> Int { wordRe.numberOfMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length)) }
    /// the same tokens, lower-cased with ’ → '
    public static func tokens(_ s: String) -> [String] {
        let ns = s as NSString
        return wordRe.matches(in: s, range: NSRange(location: 0, length: ns.length)).map { ns.substring(with: $0.range).lowercased().replacingOccurrences(of: "\u{2019}", with: "'") }
    }

    public struct Count: Equatable, Sendable { public var w: String, n: Int }
    /// a JS `Map<string, number>` in insertion order
    public struct Counter: Sendable {
        var order: [String] = [], map: [String: Int] = [:]
        public init() {}
        mutating func add(_ k: String) { if map[k] == nil { order.append(k); map[k] = 0 }; map[k]! += 1 }
        public var count: Int { order.count }
        public var entries: [Count] { order.map { Count(w: $0, n: map[$0] ?? 0) } }
        public var total: Int { map.values.reduce(0, +) }
    }
    public struct Analysis: Equatable, Sendable {
        public var words = 0, sentences = 0
        public var avg = 0.0, sd = 0.0, diversity = 0.0
        public var awl: [Count] = [], link: [Count] = [], phrases: [Count] = [], overused: [Count] = []
        public var awlRatio = 0.0, band = 4.0
        public var awlTotal: Int { awl.reduce(0) { $0 + $1.n } }
    }
    /// lexis.js: score = 4.5 + AWL density + collocations + linking variety + diversity − repetition − short text; caps for short essays
    static func lexicalBand(words: Int, awlRatio: Double, phrases: Int, link: Int, diversity: Double, overused: Int) -> Double {
        var score = 4.5
        score += min(1.5, awlRatio * 20)
        score += min(1, Double(phrases) * 0.2)
        score += min(0.8, Double(link) * 0.1)
        score += diversity > 0.75 ? 0.7 : diversity > 0.6 ? 0.4 : 0
        score -= min(1, Double(overused) * 0.25)
        if words < 250 { score -= 0.5 }
        var band = max(4, min(8.5, Double(Vocab.round(score * 2)) / 2))
        if words < 150 { band = min(band, 5) } else if words < 250 { band = min(band, 6) }
        return band
    }

    // MARK: report of #/write
    public enum Tip: Equatable, Sendable { case short(Int), awl, link, phrases, even, long, repeated, good }
    /// the "Nhận xét" list of the report, in the web's order
    public static func tips(_ a: Analysis) -> [Tip] {
        var t: [Tip] = []
        if a.words < minWords { t.append(.short(a.words)) }
        if a.awlRatio < 0.04 { t.append(.awl) }
        if a.link.count < 4 { t.append(.link) }
        if a.phrases.count < 2 { t.append(.phrases) }
        if a.sd < 4 && a.sentences > 4 { t.append(.even) }
        if a.avg > 30 { t.append(.long) }
        if !a.overused.isEmpty { t.append(.repeated) }
        return t.isEmpty ? [.good] : t
    }
    /// the string of a tip (the report shows `t.rich(key, vars)`)
    public static func key(_ t: Tip) -> (key: L10nKey, vars: [String: Int]) {
        switch t {
        case .short(let n): return (.writeWriteBaiMoiCoN, ["n": n])
        case .awl: return (.writeWriteTangTuHocThuat, [:])
        case .link: return (.writeWriteDaDangTuNoi, [:])
        case .phrases: return (.writeWriteDungThemCollocationTu, [:])
        case .even: return (.writeWriteCauCoDoDai, [:])
        case .long: return (.writeWriteCauTrungBinhHoi, [:])
        case .repeated: return (.writeWriteMotSoTuBi, [:])
        case .good: return (.writeWriteTuVungDaDang, [:])
        }
    }
    /// ring fill 0…100 and the colour name (good ≥ 7, hard ≥ 6, else again)
    public static func ring(band: Double, span: Double) -> (pct: Double, tone: Tone) { ((band - 4) / span * 100, band >= 7 ? .good : band >= 6 ? .hard : .again) }
    public enum Tone: String, Sendable { case good, hard, again }
    /// "AWL (n %)" – `(awlRatio * 100).toFixed(1)`
    public static func pct1(_ r: Double) -> String { String(format: "%.1f", (r * 1000).rounded(.toNearestOrAwayFromZero) / 10) }

    // MARK: saved essays (Store "essays": newest first, 20 kept)
    public static func saving(_ saved: [JSON], prompt: String, text: String, words: Int, band: Double, at: Int64) -> [JSON] {
        let one = JSON.object(["prompt": .string(prompt), "text": .string(text), "words": .number(Double(words)), "band": .number(band), "at": .number(Double(at))])
        return Array(([one] + saved).prefix(keepSaved))
    }
    public static func sessionNumber(_ prompt: String) -> String { String(prompt.dropFirst()) }

    // MARK: Task 1 (task1.js `score`)
    public static let task1MinWords = 150, task1MinToAnalyse = 30, task1Clock = 20, task1Warn = 180
    public static let task1Reward: [String: Int] = ["quizzes": 1, "writes": 1, "xp": 20]
    public enum Task1Note: Equatable, Sendable { case short(Int), noOverview, fewNumbers, fewTrend, fewCompare, passiveProcess, passiveMap, opinion, fewParagraphs, good }
    public struct Task1Score: Equatable, Sendable { public var band: Double, words: Int, overview: Int, numbers: Int, trend: Int, compare: Int, notes: [Task1Note] }
    private static func rx(_ p: String) -> NSRegularExpression { try! NSRegularExpression(pattern: p, options: [.caseInsensitive]) }
    private static let reOverview = rx("\\b(overall|in general|generally|it is clear that|it is evident that|as can be seen|in summary)\\b")
    private static let reNumbers = rx("\\b\\d+([.,]\\d+)?\\s?(%|per cent|percent|thousand|million|hours?)?")
    private static let reTrend = rx("\\b(increas|ris|rose|grow|grew|fell|fall|declin|decreas|drop|fluctuat|peak|plateau|level(l)?ed off|remain|surg|plummet|doubl|halv|overt(a|oo)k)\\w*")
    private static let reCompare = rx("\\b(than|whereas|while|compared (to|with)|by contrast|in contrast|similarly|the highest|the lowest|the largest|the smallest|twice|respectively|in comparison)\\b")
    private static let reOpinion = rx("\\b(I think|I believe|in my opinion|I feel)\\b")
    private static let rePassive = rx("\\b(is|are|was|were|has been|have been)\\s+\\w+ed\\b")
    private static func has(_ re: NSRegularExpression, _ s: String) -> Int { re.numberOfMatches(in: s, range: NSRange(location: 0, length: (s as NSString).length)) }
    /// `type` = line · bar · pie · table · process · map
    public static func task1Score(_ text: String, type: String) -> Task1Score {
        let words = Essay.words(text), overview = has(reOverview, text), numbers = has(reNumbers, text), trend = has(reTrend, text), compare = has(reCompare, text)
        let opinion = has(reOpinion, text), passive = has(rePassive, text)
        let paras = Lexis.paragraphs(of: text).filter { !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }.count
        let flow = type == "process" || type == "map"
        var notes: [Task1Note] = []
        if words < task1MinWords { notes.append(.short(words)) }
        if overview == 0 { notes.append(.noOverview) }
        if !flow && numbers < 4 { notes.append(.fewNumbers) }
        if ["line", "table", "pie"].contains(type) && trend < 3 { notes.append(.fewTrend) }
        if compare < 2 && type != "process" { notes.append(.fewCompare) }
        if flow && passive < 3 { notes.append(type == "process" ? .passiveProcess : .passiveMap) }
        if opinion > 0 { notes.append(.opinion) }
        if paras < 3 { notes.append(.fewParagraphs) }
        var score = 5.0
        if words >= task1MinWords { score += 0.5 }
        if overview > 0 { score += 1 }
        if numbers >= 4 || flow { score += 0.5 }
        if trend >= 3 || ["bar", "map", "process"].contains(type) { score += 0.5 }
        if compare >= 2 { score += 0.5 }
        if paras >= 3 { score += 0.5 }
        if opinion > 0 { score -= 0.5 }
        var band = max(4, min(8, score))
        if words < 100 { band = min(band, 4.5) } else if words < task1MinWords { band = min(band, 5.5) }
        return Task1Score(band: band, words: words, overview: overview, numbers: numbers, trend: trend, compare: compare, notes: notes.isEmpty ? [.good] : notes)
    }

    public static func key(_ n: Task1Note) -> (key: L10nKey, vars: [String: Int]) {
        switch n {
        case .short(let w): return (.writeTask1BaiCoNTu, ["n": w])
        case .noOverview: return (.writeTask1ThieuDoanTongQuan, [:])
        case .fewNumbers: return (.writeTask1DanChungSoLieu, [:])
        case .fewTrend: return (.writeTask1DungThemTuChi, [:])
        case .fewCompare: return (.writeTask1TangSoSanhWhereas, [:])
        case .passiveProcess: return (.writeTask1VoiQuyTrinhNen, [:])
        case .passiveMap: return (.writeTask1VoiBanDoNen, [:])
        case .opinion: return (.writeTask1Task1KhongNeu, [:])
        case .fewParagraphs: return (.writeTask1ChiaBaiThanh3, [:])
        case .good: return (.writeTask1BaiCoDuCac, [:])
        }
    }

    // MARK: #/qstats (qtips.js)
    public struct QRow: Equatable, Sendable { public var kind: String, right: Int, total: Int, secs: Int
        public var pct: Int { Vocab.round(Double(right) / Double(total) * 100) }
        /// bar class: ok ≥ 75, no < 50
        public var tone: Tone? { pct >= 75 ? .good : pct < 50 ? .again : nil }
        public var secsEach: Int? { secs > 0 ? Vocab.round(Double(secs) / Double(total)) : nil } }
    public struct QCard: Equatable, Sendable { public var skill: String, rows: [QRow], right: Int, total: Int, secs: Int, weak: String?
        public var pct: Int { Vocab.round(Double(right) / Double(total) * 100) }
        public var secsEach: Int? { secs > 0 ? Vocab.round(Double(secs) / Double(total)) : nil } }
    /// `game.qstat["<skill>:<kind>"] = {r, t, s, d}` → one card per known skill (in `order`), rows weakest first, `weak` = first row with ≥ 3 answers under 75 %
    public static func qstatCards(_ game: JSON?, order: [String]) -> [QCard] {
        var by: [String: [QRow]] = [:]
        for (key, v) in JSON.entries(game?["qstat"]) {
            let p = key.split(separator: ":", maxSplits: 1, omittingEmptySubsequences: false).map(String.init)
            guard p.count == 2, order.contains(p[0]), JSON.orZero(v["t"]) > 0 else { continue }
            by[p[0], default: []].append(QRow(kind: p[1], right: Int(JSON.orZero(v["r"])), total: Int(JSON.orZero(v["t"])), secs: Int(JSON.orZero(v["s"]))))
        }
        return order.compactMap { sk in
            guard let all = by[sk] else { return nil }
            let rows = Vocab.stableSorted(all) { Double($0.right) / Double($0.total) < Double($1.right) / Double($1.total) }
            let weak = rows.first { $0.total >= 3 && Double($0.right) / Double($0.total) < 0.75 }?.kind
            return QCard(skill: sk, rows: rows, right: rows.reduce(0) { $0 + $1.right }, total: rows.reduce(0) { $0 + $1.total }, secs: rows.reduce(0) { $0 + $1.secs }, weak: weak)
        }
    }
    /// the practice link of a row (`practiceLink`): `#/rtype/<type>` · `#/toefl-p/<kind>` · the skill's own link
    public static func practiceRoute(skill: String, kind: String, skills: [String: [String]], rtype: [String: String], named: Bool) -> String {
        if skill == "ir", let r = rtype[kind] { return "#/rtype/" + r }
        if skill.hasPrefix("f") && named { return "#/toefl-p/" + (kind == "sentenceB" ? "sentence" : kind) }
        return skills[skill]?.last ?? ""
    }
}

/// `web/data/write-pack.json` (https://lexkite.com/data/write-pack.json): criteria data, the STOP table of Lexis.analyze and the page tables of write / task1 / qstats.
public struct WritePack: Sendable {
    public var criteria: JSON = .null, stop: Set<String> = [], outline: [String: [String]] = [:], trends: JSON = .null, connectors: [String] = [], vocab: [String: [String]] = [:]
    public var skills: [(id: String, icon: String, name: String, link: String)] = [], rtype: [String: String] = [:], scoreKeys: [String: [String]] = [:]
    public init() {}
    public init?(text: String) {
        guard let j = try? JSON.parse(text), j["criteria"]?.isObject == true else { return nil }
        criteria = j["criteria"] ?? .null
        stop = Set(j["lexis"]?.strs("stop") ?? [])
        outline = (j["write"]?["outline"]?.object ?? [:]).mapValues { ($0.array ?? []).compactMap(\.string) }
        trends = j["write"]?["trends"] ?? .null
        connectors = j["write"]?.strs("connectors") ?? []
        vocab = (j["task1"]?["vocab"]?.object ?? [:]).mapValues { ($0.array ?? []).compactMap(\.string) }
        skills = (j["qstats"]?["skills"]?.array ?? []).map { r in let a = (r.array ?? []).map { $0.string ?? "" } + ["", "", "", ""]; return (a[0], a[1], a[2], a[3]) }
        scoreKeys = (j["scoreKeys"]?.object ?? [:]).mapValues { ($0.array ?? []).compactMap(\.string) }
        rtype = (j["qstats"]?["rtype"]?.object ?? [:]).compactMapValues(\.string)
    }
    public func skill(_ id: String) -> (icon: String, name: String, link: String)? { skills.first { $0.id == id }.map { ($0.icon, $0.name, $0.link) } }
}
