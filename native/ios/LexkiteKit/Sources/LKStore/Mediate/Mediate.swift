import Foundation
import LKSync

/// M4 P13 – Mediation (#/mediate, #/mediate/<id>): the pure parts of web/js/mediate-core.js + the bundled lessons (Resources/mediation.json).
/// Verified against native/shared/gen/vectors/mediate.json (MediateVectorTests.testParityP13). Spec: docs/specs/mediation.md.

public struct MediateLine: Codable, Hashable, Sendable {
    public var s: String, t: String
    public init(s: String, t: String) { self.s = s; self.t = t }
}

/// One source: kind announcement | text | email | notice | talk (paragraphs) · dialogue (lines) · chart (caption, cols, rows, unit, note)
public struct MediateSource: Codable, Hashable, Sendable {
    public var kind: String
    public var paragraphs: [String] = []
    public var lines: [MediateLine] = []
    public var caption = "", unit = "", note = ""
    public var cols: [String] = []
    /// chart rows: label then the numbers, already written as the web shows them
    public var rows: [[String]] = []
    public init(kind: String, paragraphs: [String] = [], lines: [MediateLine] = [], caption: String = "", unit: String = "", note: String = "", cols: [String] = [], rows: [[String]] = []) {
        self.kind = kind; self.paragraphs = paragraphs; self.lines = lines; self.caption = caption; self.unit = unit; self.note = note; self.cols = cols; self.rows = rows
    }
    enum K: String, CodingKey { case kind, text, lines, caption, unit, note, cols, rows }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        kind = (try? c.decode(String.self, forKey: .kind)) ?? "text"
        if let a = try? c.decode([String].self, forKey: .text) { paragraphs = a } else if let s = try? c.decode(String.self, forKey: .text) { paragraphs = [s] }
        lines = (try? c.decode([MediateLine].self, forKey: .lines)) ?? []
        caption = (try? c.decode(String.self, forKey: .caption)) ?? ""; unit = (try? c.decode(String.self, forKey: .unit)) ?? ""; note = (try? c.decode(String.self, forKey: .note)) ?? ""
        cols = (try? c.decode([String].self, forKey: .cols)) ?? []
        let raw = (try? c.decode([JSON].self, forKey: .rows)) ?? []
        rows = raw.map { r in (r.array ?? []).map { $0.string ?? $0.jsToString } }
    }
    public func encode(to e: Encoder) throws {
        var c = e.container(keyedBy: K.self)
        try c.encode(kind, forKey: .kind); try c.encode(paragraphs, forKey: .text); try c.encode(lines, forKey: .lines)
        try c.encode(caption, forKey: .caption); try c.encode(unit, forKey: .unit); try c.encode(note, forKey: .note); try c.encode(cols, forKey: .cols); try c.encode(rows, forKey: .rows)
    }
}

public struct MediateTask: Codable, Hashable, Sendable {
    public var mode: String, audience: String, prompt: String
    public var minWords: Int
    /// 0 = no upper limit
    public var maxWords: Int
    public var speak: Bool { mode == "speak" }
    /// "35–60" or "35+" (web `range`)
    public var range: String { maxWords > 0 ? "\(minWords)–\(maxWords)" : "\(minWords)+" }
    enum K: String, CodingKey { case mode, audience, prompt, minWords = "min_words", maxWords = "max_words" }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        mode = (try? c.decode(String.self, forKey: .mode)) ?? "write"; audience = (try? c.decode(String.self, forKey: .audience)) ?? ""; prompt = (try? c.decode(String.self, forKey: .prompt)) ?? ""
        minWords = (try? c.decode(Int.self, forKey: .minWords)) ?? 0; maxWords = (try? c.decode(Int.self, forKey: .maxWords)) ?? 0
    }
    public init(mode: String = "write", audience: String = "", prompt: String = "", minWords: Int = 0, maxWords: Int = 0) { self.mode = mode; self.audience = audience; self.prompt = prompt; self.minWords = minWords; self.maxWords = maxWords }
}

/// a key idea (`points`) or an optional extra (`leave_out`): met when EVERY group of `checks` has at least one phrase in the text
public struct MediatePoint: Codable, Hashable, Sendable {
    public var id: String, idea: String
    public var checks: [[String]]
    enum K: String, CodingKey { case id, idea, checks }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        id = (try? c.decode(String.self, forKey: .id)) ?? ""; idea = (try? c.decode(String.self, forKey: .idea)) ?? ""; checks = (try? c.decode([[String]].self, forKey: .checks)) ?? []
    }
    public init(id: String = "", idea: String, checks: [[String]]) { self.id = id; self.idea = idea; self.checks = checks }
}

public struct MediateItem: Codable, Hashable, Sendable, Identifiable {
    public var id: String, level: String, activity: String, title: String, scenario: String
    public var source: MediateSource
    public var task: MediateTask
    public var points: [MediatePoint], leaveOut: [MediatePoint]
    public var model: String
    public var useful: [String], tips: [String]
    public var explain: String
    enum K: String, CodingKey { case id, level, activity, title, scenario, source, task, points, leaveOut = "leave_out", model, useful, tips, explain }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        id = (try? c.decode(String.self, forKey: .id)) ?? ""; level = (try? c.decode(String.self, forKey: .level)) ?? ""; activity = (try? c.decode(String.self, forKey: .activity)) ?? ""
        title = (try? c.decode(String.self, forKey: .title)) ?? ""; scenario = (try? c.decode(String.self, forKey: .scenario)) ?? ""
        source = (try? c.decode(MediateSource.self, forKey: .source)) ?? MediateSource(kind: "text"); task = (try? c.decode(MediateTask.self, forKey: .task)) ?? MediateTask()
        points = (try? c.decode([MediatePoint].self, forKey: .points)) ?? []; leaveOut = (try? c.decode([MediatePoint].self, forKey: .leaveOut)) ?? []
        model = (try? c.decode(String.self, forKey: .model)) ?? ""; useful = (try? c.decode([String].self, forKey: .useful)) ?? []; tips = (try? c.decode([String].self, forKey: .tips)) ?? []
        explain = (try? c.decode(String.self, forKey: .explain)) ?? ""
    }
    public init(id: String, level: String, activity: String = "relay", title: String, scenario: String = "", source: MediateSource, task: MediateTask, points: [MediatePoint] = [], leaveOut: [MediatePoint] = [],
                model: String = "", useful: [String] = [], tips: [String] = [], explain: String = "") {
        self.id = id; self.level = level; self.activity = activity; self.title = title; self.scenario = scenario; self.source = source; self.task = task
        self.points = points; self.leaveOut = leaveOut; self.model = model; self.useful = useful; self.tips = tips; self.explain = explain
    }
}

/// the bundled 30 lessons (order = level, then id – as the web index)
public struct Mediation: Codable, Sendable {
    public var levels: [String]
    public var listenFirst: [String]
    public var copyRun: Int
    public var items: [MediateItem]

    public static let shared: Mediation = {
        guard let url = Bundle.module.url(forResource: "mediation", withExtension: "json"), let d = try? Data(contentsOf: url),
              let m = try? JSONDecoder().decode(Mediation.self, from: d) else { return Mediation(levels: [], listenFirst: [], copyRun: 8, items: []) }
        return m
    }()
    public init(levels: [String], listenFirst: [String], copyRun: Int, items: [MediateItem]) { self.levels = levels; self.listenFirst = listenFirst; self.copyRun = copyRun; self.items = items }
    public func item(_ id: String) -> MediateItem? { items.first { $0.id == id } }
    public func items(level: String) -> [MediateItem] { items.filter { $0.level == level } }
    /// the lesson after `id`, wrapping round (web `next`)
    public func next(after id: String) -> MediateItem? {
        guard !items.isEmpty else { return nil }
        let i = items.firstIndex { $0.id == id } ?? -1
        return items[(i + 1) % items.count]
    }
}

/// one checked answer (web `MediateCore.check`)
public struct MediateResult: Equatable, Sendable {
    public struct Point: Equatable, Sendable { public var id: String, idea: String; public var ok: Bool }
    public var n: Int
    public var inRange: Bool
    public var points: [Point]
    public var extra: [String]
    public var copied: String
    public var got: Int { points.filter(\.ok).count }
    public var of: Int { points.count }
}

public enum Mediate {
    public static let copyRun = 8
    private static let wordRE = try! NSRegularExpression(pattern: "[A-Za-z0-9][A-Za-z0-9'’:%.-]*")
    private static let spaceRE = try! NSRegularExpression(pattern: "\\s+")

    /// tokens (keeps It's, 14:50, 15%); trailing dots stripped
    public static func words(_ s: String) -> [String] {
        wordRE.matches(in: s, range: NSRange(s.startIndex..., in: s)).compactMap { m in
            guard let r = Range(m.range, in: s) else { return nil }
            var w = String(s[r])
            while w.hasSuffix(".") { w.removeLast() }
            return w.isEmpty ? nil : w
        }
    }
    /// ' ' + lower-case, curly quotes and dashes flattened, runs of space collapsed + ' '
    public static func norm(_ s: String) -> String {
        var t = s.lowercased()
        t = t.replacingOccurrences(of: "’", with: "'").replacingOccurrences(of: "‘", with: "'").replacingOccurrences(of: "–", with: "-").replacingOccurrences(of: "—", with: "-")
        t = spaceRE.stringByReplacingMatches(in: t, range: NSRange(t.startIndex..., in: t), withTemplate: " ")
        return " " + t + " "
    }
    /// met when EVERY group has at least one phrase in the text (case-insensitive); no groups → false
    public static func hit(_ text: String, _ checks: [[String]]) -> Bool {
        let t = norm(text)
        return !checks.isEmpty && checks.allSatisfy { g in g.contains { t.contains($0.lowercased()) } }
    }
    /// the readable text of a source (paragraphs / dialogue turns / chart caption, cells and note) for the copy check
    public static func sourceText(_ s: MediateSource) -> String {
        switch s.kind {
        case "chart": return ([s.caption] + s.cols + s.rows.flatMap { $0 } + [s.note]).filter { !$0.isEmpty }.joined(separator: " ")
        case "dialogue": return s.lines.map(\.t).joined(separator: " ")
        default: return s.paragraphs.joined(separator: " ")
        }
    }
    /// the first run of ≥ n consecutive words of `a` that is verbatim in `source` ("" if none)
    public static func copied(_ a: String, _ source: String, n: Int = copyRun) -> String {
        let m = words(a).map { $0.lowercased() }
        let s = " " + words(source).map { $0.lowercased() }.joined(separator: " ") + " "
        guard n > 0, m.count >= n else { return "" }
        for i in 0...(m.count - n) {
            let run = m[i..<(i + n)].joined(separator: " ")
            if s.contains(" " + run + " ") { return run }
        }
        return ""
    }
    public static func check(_ item: MediateItem, _ text: String) -> MediateResult {
        let n = words(text).count, t = item.task
        return MediateResult(n: n, inRange: n >= t.minWords && (t.maxWords == 0 || n <= t.maxWords),
                             points: item.points.map { .init(id: $0.id, idea: $0.idea, ok: hit(text, $0.checks)) },
                             extra: item.leaveOut.filter { hit(text, $0.checks) }.map(\.idea),
                             copied: copied(text, sourceText(item.source)))
    }

    // MARK: voices
    private static let pool: [String: [String]] = ["f": ["bf_isabella", "bf_lily", "bf_alice"], "m": ["bm_lewis", "bm_daniel", "bm_fable"]]
    public static let narrator = "bf_emma"
    private static func rx(_ p: String, _ o: NSRegularExpression.Options = []) -> NSRegularExpression { try! NSRegularExpression(pattern: p, options: o) }
    private static let reFem = rx("^(Ms|Mrs|Miss)\\b"), reMr = rx("^Mr\\b"), reNeutral = rx("^(Dr|Professor|Prof)\\b|^(Customer|Shop|Speaker)"), reName = rx("(a|ei|ie)$", .caseInsensitive)
    private static func matches(_ r: NSRegularExpression, _ s: String) -> Bool { r.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) != nil }
    /// fixed Kokoro (British) voices of a source: `_narrator` + one voice per speaker (web `MediateCore.voices`)
    public static func voices(_ src: MediateSource) -> [String: String] {
        var out: [String: String] = ["_narrator": narrator], used = ["f": 0, "m": 0]
        var who: [String] = []
        for l in src.lines where !who.contains(l.s) { who.append(l.s) }
        for (i, s) in who.enumerated() {
            let g = matches(reFem, s) ? "f" : matches(reMr, s) ? "m" : matches(reNeutral, s) ? (i % 2 == 1 ? "f" : "m") : matches(reName, s) ? "f" : "m"
            out[s] = pool[g]![used[g]! % 3]; used[g]! += 1
        }
        return out
    }

    // MARK: rules of the screen
    /// B2 / C1 / C2 except charts: the text is hidden until the source was heard or "Show text" was tapped
    public static func listenFirst(_ item: MediateItem, in m: Mediation = .shared) -> Bool { m.listenFirst.contains(item.level) && item.source.kind != "chart" }
    /// kind → (SF Symbol, L10n key name suffix) shown on the source card
    public static let kinds = ["announcement", "text", "email", "notice", "talk", "dialogue", "chart"]
}

/// device-only state: the draft of each lesson (`lk.medDraft.<id>`) and the best score (`game.medBest` of the web; kept on the device here, like the Watch notes/history)
public struct MediateStore: @unchecked Sendable {
    public struct Best: Codable, Equatable, Sendable { public var ok: Int, of: Int; public init(ok: Int, of: Int) { self.ok = ok; self.of = of } }
    public let defaults: UserDefaults
    public init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    public func draft(_ id: String) -> String { defaults.string(forKey: "lk.medDraft." + id) ?? "" }
    public func setDraft(_ id: String, _ text: String) { if text.isEmpty { defaults.removeObject(forKey: "lk.medDraft." + id) } else { defaults.set(text, forKey: "lk.medDraft." + id) } }
    public var best: [String: Best] {
        get { defaults.data(forKey: "lk.medBest").flatMap { try? JSONDecoder().decode([String: Best].self, from: $0) } ?? [:] }
        nonmutating set { if let d = try? JSONEncoder().encode(newValue) { defaults.set(d, forKey: "lk.medBest") } }
    }
    /// keeps the higher score (web: `got > prev.ok`)
    public func record(_ id: String, ok: Int, of: Int) {
        var b = best
        if b[id] == nil || ok > b[id]!.ok { b[id] = Best(ok: ok, of: of); best = b }
    }
}
