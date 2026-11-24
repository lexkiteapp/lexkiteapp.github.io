import Foundation
import LKSync

/// M4 P12 – "Learn from YouTube video" (#/watch, #/watch/<id>): the pure parts of web/js/watch.js + watch-topics.js.
/// Verified against native/shared/gen/vectors/watch.json (WatchVectorTests.testParityP12). Rules of docs/specs/video-learn.md §2: official IFrame player only.

public struct WatchItem: Codable, Hashable, Sendable, Identifiable {
    public var id: String
    public var title: String
    public var ch: String
    public var sec: Int
    public var cc: Bool
    public init(id: String, title: String = "", ch: String = "", sec: Int = 0, cc: Bool = false) { self.id = id; self.title = title; self.ch = ch; self.sec = sec; self.cc = cc }
    enum K: String, CodingKey { case id, title, ch, sec, cc }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        id = (try? c.decode(String.self, forKey: .id)) ?? ""
        title = (try? c.decode(String.self, forKey: .title)) ?? ""
        ch = (try? c.decode(String.self, forKey: .ch)) ?? ""
        sec = (try? c.decode(Double.self, forKey: .sec)).map { $0.isFinite ? Int($0) : 0 } ?? 0
        cc = (try? c.decode(Bool.self, forKey: .cc)) ?? false
    }
}

public struct WatchTopic: Codable, Hashable, Sendable, Identifiable {
    public var id: String
    public var ic: String
    public var lv: [Int]
    public var goals: [String]
    public var name: String
    public var desc: String
    public var q: [String]
    public var ch: [String]
    public var kw: [String]
    public var vocab: [String]
}

public struct WatchTopics: Codable, Sendable {
    public var levels: [String]
    /// dur / acc / pace → [value, Vietnamese label key]
    public var filters: [String: [[String]]]
    public var accQ: [String: String]
    public var paceQ: [String: String]
    public var lvQ: [String]
    public var topics: [WatchTopic]

    public static let shared: WatchTopics = {
        guard let url = Bundle.module.url(forResource: "watch-topics", withExtension: "json"), let d = try? Data(contentsOf: url),
              let t = try? JSONDecoder().decode(WatchTopics.self, from: d) else { return WatchTopics(levels: [], filters: [:], accQ: [:], paceQ: [:], lvQ: [], topics: []) }
        return t
    }()
    public func topic(_ id: String) -> WatchTopic? { topics.first { $0.id == id } }
    public func options(_ key: String) -> [(value: String, label: String)] { (filters[key] ?? []).compactMap { $0.count == 2 ? (value: $0[0], label: $0[1]) : nil } }
}

/// device-only filters (`wt.f`)
public struct WatchFilters: Codable, Equatable, Sendable {
    public var lv = 0, dur = "", acc = "", pace = "", cc = true
    public init() {}
    public init(lv: Int = 0, dur: String = "", acc: String = "", pace: String = "", cc: Bool = true) { self.lv = lv; self.dur = dur; self.acc = acc; self.pace = pace; self.cc = cc }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        lv = (try? c.decode(Int.self, forKey: .lv)) ?? 0; dur = (try? c.decode(String.self, forKey: .dur)) ?? ""
        acc = (try? c.decode(String.self, forKey: .acc)) ?? ""; pace = (try? c.decode(String.self, forKey: .pace)) ?? ""; cc = (try? c.decode(Bool.self, forKey: .cc)) ?? true
    }
    enum K: String, CodingKey { case lv, dur, acc, pace, cc }
}

/// a watched video (`wt.h`, newest first, ≤ 30)
public struct WatchHistory: Codable, Equatable, Sendable, Identifiable {
    public var id: String
    public var title = "", ch = "", topic = ""
    public var pos = 0, len = 0
    public var at: Double = 0
    public init(id: String, title: String = "", ch: String = "", topic: String = "", pos: Int = 0, len: Int = 0, at: Double = 0) {
        self.id = id; self.title = title; self.ch = ch; self.topic = topic; self.pos = pos; self.len = len; self.at = at
    }
    enum K: String, CodingKey { case id, title, ch, topic, pos, len, at }
    public init(from d: Decoder) throws {
        let c = try d.container(keyedBy: K.self)
        id = (try? c.decode(String.self, forKey: .id)) ?? ""; title = (try? c.decode(String.self, forKey: .title)) ?? ""
        ch = (try? c.decode(String.self, forKey: .ch)) ?? ""; topic = (try? c.decode(String.self, forKey: .topic)) ?? ""
        pos = (try? c.decode(Int.self, forKey: .pos)) ?? 0; len = (try? c.decode(Int.self, forKey: .len)) ?? 0; at = (try? c.decode(Double.self, forKey: .at)) ?? 0
    }
    /// card progress bar 0…1 (`pos / max(1, len || pos)`)
    public var progress: Double { pos > 0 ? min(1, Double(pos) / Double(max(1, len > 0 ? len : pos))) : 0 }
}

/// a note at a moment of a video (`wt.n.<id>`, ≤ 200, sorted by t)
public struct WatchNote: Codable, Equatable, Sendable {
    public var t: Int; public var text: String
    public init(t: Int, text: String) { self.t = t; self.text = text }
}

/// The "pick" of the web (`wt.pick`): what the tapped card knew about the video (op=info only when it is unknown).
public struct WatchPick: Codable, Equatable, Sendable {
    public var id: String
    public var title: String, ch: String, topic: String
    public init(id: String, title: String = "", ch: String = "", topic: String = "") { self.id = id; self.title = title; self.ch = ch; self.topic = topic }
}

public enum Watch {
    public static let rates: [Double] = [0.5, 0.75, 0.9, 1, 1.25, 1.5]
    public static let maxResults = 24
    static let vid = try! NSRegularExpression(pattern: "^[A-Za-z0-9_-]{11}$")
    public static func validID(_ s: String) -> Bool { vid.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)) != nil }

    // MARK: links
    /// Every YouTube link form → (id, start seconds): watch?v= · youtu.be/ · shorts/ embed/ live/ v/ · m. music. nocookie · &t=1m30s · ?start= · #t=
    public static func ytParse(_ input: String) -> (id: String, t: Int)? {
        let s = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if validID(s) { return (s, 0) }
        let hasScheme = s.range(of: "^[A-Za-z]+://", options: .regularExpression) != nil
        guard !s.isEmpty, let u = URLComponents(string: hasScheme ? s : "https://" + s), let host = u.host?.lowercased() else { return nil }
        guard ["youtube.com", "youtube-nocookie.com", "youtu.be"].contains(where: { host == $0 || host.hasSuffix("." + $0) }) else { return nil }
        func q(_ k: String) -> String { u.queryItems?.first { $0.name == k }?.value ?? "" }
        var id = host == "youtu.be" || host.hasSuffix(".youtu.be") ? (u.path.split(separator: "/", omittingEmptySubsequences: false).dropFirst().first.map(String.init) ?? "") : q("v")
        if id.isEmpty, let m = u.path.range(of: "^/(?:shorts|embed|live|v)/([^/?#]+)", options: .regularExpression) {
            id = String(u.path[m].split(separator: "/").dropFirst().first ?? "")
        }
        guard validID(id) else { return nil }
        var tt = q("t"); if tt.isEmpty { tt = q("start") }
        if tt.isEmpty, let f = u.fragment, let m = f.range(of: "t=([^&]+)", options: .regularExpression) { tt = String(f[m].dropFirst(2)) }
        return (id, seconds(tt))
    }
    /// `^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$` → seconds, 0 when it does not match
    static func seconds(_ tt: String) -> Int {
        guard let re = try? NSRegularExpression(pattern: "^(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s?)?$"),
              let m = re.firstMatch(in: tt, range: NSRange(tt.startIndex..., in: tt)) else { return 0 }
        func g(_ i: Int) -> Int { Range(m.range(at: i), in: tt).flatMap { Int(tt[$0]) } ?? 0 }
        return g(1) * 3600 + g(2) * 60 + g(3)
    }
    /// m:ss · h:mm:ss
    public static func fmt(_ sec: Double) -> String {
        let s = sec.isFinite ? Int(max(0, sec.rounded(.down))) : 0
        func two(_ n: Int) -> String { n < 10 ? "0\(n)" : "\(n)" }
        let h = s / 3600, m = s / 60 % 60
        return h > 0 ? "\(h):\(two(m)):\(two(s % 60))" : "\(m):\(two(s % 60))"
    }
    public static func ytURL(_ id: String, at: Double = 0) -> URL {
        URL(string: "https://www.youtube.com/watch?v=\(id)" + (at >= 1 ? "&t=\(Int(at))s" : ""))!
    }
    public static func thumb(_ id: String) -> URL? { URL(string: "https://i.ytimg.com/vi/\(id)/mqdefault.jpg") }

    // MARK: level, query, suggestions
    /// the learner's level 1…6: CEFR vCefr|gCefr, else the band (≥7 → 5, ≥5.5 → 4, ≥4.5 → 3, else 2), no placement → 2
    public static func myLevel(_ placement: JSON?, topics: WatchTopics = .shared) -> Int {
        let p = placement ?? .null
        let c = p["vCefr"].flatMap { $0.truthy ? $0 : nil } ?? p["gCefr"].flatMap { $0.truthy ? $0 : nil }
        if let c {
            let key = String(c.jsToString.uppercased().prefix(2))
            if let i = topics.levels.firstIndex(of: key) { return i + 1 }
        }
        if let b = p["band"], b.truthy { let n = b.toNumber; return n >= 7 ? 5 : n >= 5.5 ? 4 : n >= 4.5 ? 3 : 2 }
        return 2
    }
    /// the search text = topic phrase + level / accent / pace tails, duplicate words dropped
    public static func buildQ(_ base: String, filters f: WatchFilters, placement: JSON?, topics: WatchTopics = .shared) -> String {
        let lv = f.lv != 0 ? f.lv : myLevel(placement, topics: topics)
        let tail = lv >= 1 && lv <= topics.lvQ.count ? topics.lvQ[lv - 1] : ""
        let text = [base, tail, topics.accQ[f.acc] ?? "", topics.paceQ[f.pace] ?? ""].joined(separator: " ")
        var seen = Set<Substring>(), out: [Substring] = []
        for w in text.split(whereSeparator: { $0.isWhitespace }) where seen.insert(w).inserted { out.append(w) }
        return out.joined(separator: " ")
    }
    /// "Picked for you": goal + level match, +1 per deck word in the topic vocab, +1 per topic hit in the 10 newest history rows; score > 0, top 6 (stable)
    public static func forYou(goal: String, level: Int, deckWords: Set<String>, historyTopics: [String], topics: WatchTopics = .shared) -> [WatchTopic] {
        let hist = historyTopics.prefix(10)
        var scored: [(Int, Int, WatchTopic)] = []
        for (i, tp) in topics.topics.enumerated() {
            var s = (tp.lv.count == 2 && tp.lv[0] <= level && level <= tp.lv[1]) ? 3 : -2
            if tp.goals.contains(goal) { s += 3 } else if !tp.goals.contains("all") { s -= 4 }
            for v in tp.vocab where deckWords.contains(v) { s += 1 }
            for h in hist where h == tp.id { s += 1 }
            scored.append((s, i, tp))
        }
        return scored.filter { $0.0 > 0 }.sorted { $0.0 != $1.0 ? $0.0 > $1.0 : $0.1 < $1.1 }.prefix(6).map { $0.2 }
    }
    /// settings.exam → settings.goal.exam → "ielts" (App.exam)
    public static func goal(_ settings: JSON) -> String {
        let e = settings.t("exam") ? settings.s("exam") : (settings["goal"]?.s("exam") ?? "")
        return ["ielts", "ieltsgt", "toeic", "toefl", "general"].contains(e) ? e : "ielts"
    }

    // MARK: results
    /// search first, then the feed (no #shorts; the topic keywords when ≥ 4 titles match); valid unique ids; the duration rule; at most 24
    public static func merge(search: [WatchItem], feed: [WatchItem], topic: WatchTopic?, dur: String) -> [WatchItem] {
        var feed = feed.filter { $0.title.range(of: "#shorts", options: .caseInsensitive) == nil }
        if let kw = topic?.kw, !kw.isEmpty, let re = try? NSRegularExpression(pattern: "\\b(" + kw.joined(separator: "|") + ")", options: .caseInsensitive) {
            let hit = feed.filter { re.firstMatch(in: $0.title, range: NSRange($0.title.startIndex..., in: $0.title)) != nil }
            if hit.count >= 4 { feed = hit }
        }
        var seen = Set<String>()
        return (search + feed).filter { validID($0.id) && seen.insert($0.id).inserted && durOK($0.sec, dur) }.prefix(maxResults).map { $0 }
    }
    public static func durOK(_ sec: Int, _ dur: String) -> Bool {
        if dur.isEmpty || sec == 0 { return true }
        switch dur { case "short": return sec < 240; case "medium": return sec >= 240 && sec <= 1200; default: return sec > 1200 }
    }
    public static func youtubeSearchURL(_ q: String) -> URL {
        var c = URLComponents(string: "https://www.youtube.com/results")!; c.queryItems = [URLQueryItem(name: "search_query", value: q)]; return c.url!
    }
}

/// A–B loop of the player (web `A`, `B`, `loop`): A at the current time, B closes the loop and jumps back to A.
public struct WatchLoop: Equatable, Sendable {
    public var a: Double?, b: Double?, on = false
    public init() {}
    public mutating func setA(_ now: Double) { a = now; if let b, b <= now { self.b = nil } }
    /// returns the time to seek to (A) when the loop starts
    @discardableResult public mutating func setB(_ now: Double) -> Double? {
        if a == nil { a = max(0, now - 5) }
        if let a, now > a + 0.5 { b = now; on = true; return a }
        return nil
    }
    /// false when A or B is missing (the hint is shown)
    public mutating func toggle() -> Bool { guard a != nil, b != nil else { return false }; on.toggle(); return true }
    /// a time event: where to seek when the loop reached B
    public func jump(at t: Double) -> Double? { if on, let a, let b, t >= b { return a }; return nil }
    public var label: String? { a == nil ? nil : "\(Watch.fmt(a ?? 0)) → " + (b.map { Watch.fmt($0) } ?? "…") }
}

/// Device-only storage of the web's `localStorage` wt.* (never synced).
public struct WatchStore: @unchecked Sendable {
    public let defaults: UserDefaults
    public init(defaults: UserDefaults = .standard) { self.defaults = defaults }
    private func read<T: Decodable>(_ k: String, _ d: T) -> T { defaults.data(forKey: "wt." + k).flatMap { try? JSONDecoder().decode(T.self, from: $0) } ?? d }
    private func write<T: Encodable>(_ k: String, _ v: T) { if let d = try? JSONEncoder().encode(v) { defaults.set(d, forKey: "wt." + k) } }
    public var filters: WatchFilters { get { read("f", WatchFilters()) } nonmutating set { write("f", newValue) } }
    public var history: [WatchHistory] { get { read("h", [WatchHistory]()).filter { Watch.validID($0.id) } } nonmutating set { write("h", Array(newValue.prefix(30))) } }
    public var pick: WatchPick? { get { read("pick", WatchPick?.none) } nonmutating set { write("pick", newValue) } }
    public func notes(_ id: String) -> [WatchNote] { read("n." + id, [WatchNote]()) }
    public func setNotes(_ id: String, _ n: [WatchNote]) { write("n." + id, Array(n.sorted { $0.t < $1.t }.suffix(200))) }
    /// `remember`: this video to the front of the history
    public func remember(_ h: WatchHistory) { history = [h] + history.filter { $0.id != h.id } }
}

// MARK: - network

public struct WatchReply: Sendable {
    public var items: [WatchItem] = []
    public var fallback: String?, title: String?, ch: String?
    public var embeddable: Bool?
    public var offline = false
    public init(items: [WatchItem] = [], fallback: String? = nil, title: String? = nil, ch: String? = nil, embeddable: Bool? = nil, offline: Bool = false) {
        self.items = items; self.fallback = fallback; self.title = title; self.ch = ch; self.embeddable = embeddable; self.offline = offline
    }
}
/// GET https://lexkite.com/api/watch?op=search|feed|info – errors give `{items: [], offline: true}`, a bad status `{items: []}` (like the web `get`)
public protocol WatchAPI: Sendable { func get(_ op: String, _ params: [String: String]) async -> WatchReply }

public struct LiveWatchAPI: WatchAPI {
    public init() {}
    public func get(_ op: String, _ params: [String: String]) async -> WatchReply {
        var c = URLComponents(string: "https://lexkite.com/api/watch")!
        c.queryItems = [URLQueryItem(name: "op", value: op)] + params.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) }
        guard let url = c.url else { return WatchReply() }
        var r = URLRequest(url: url, timeoutInterval: 15); r.httpShouldHandleCookies = false
        do {
            let (d, resp) = try await URLSession.shared.data(for: r)
            guard (resp as? HTTPURLResponse).map({ (200..<300).contains($0.statusCode) }) ?? false, let j = try? JSON.parse(d) else { return WatchReply() }
            let items = j.list("items").compactMap { x -> WatchItem? in (try? JSONEncoder().encode(x)).flatMap { try? JSONDecoder().decode(WatchItem.self, from: $0) } }
            return WatchReply(items: items, fallback: j["fallback"]?.string, title: j["title"]?.string, ch: j["ch"]?.string, embeddable: j["embeddable"].flatMap { if case .bool(let b) = $0 { return b }; return nil })
        } catch { return WatchReply(offline: true) }
    }
}

public extension Watch {
    /// the player page of the web view (Resources/watch-player.html, contract in its header)
    static var playerHTML: String {
        guard let u = Bundle.module.url(forResource: "watch-player", withExtension: "html"), let s = try? String(contentsOf: u, encoding: .utf8) else { return "" }
        return s
    }
    /// the page base URL the web view loads the player with (`?id=&start=&hl=`)
    static func playerBase(id: String, start: Int, lang: String) -> URL {
        var c = URLComponents(string: "https://lexkite.com/watch-player")!
        c.queryItems = [URLQueryItem(name: "id", value: id), URLQueryItem(name: "start", value: String(start)), URLQueryItem(name: "hl", value: lang)]
        return c.url!
    }
}
