import SwiftUI
import SwiftData
import LKSync
import LKStore
import LKCore

/// Everything the vocabulary screens read and write, behind one injectable protocol (tests/previews use `MemoryVocabData`, the app `RepoVocabData`).
/// Cards, stats, game and settings are the sync document; the mistakes book and the "new cards already shown" map stay on the device.
public struct VocabBundle: Sendable {
    public var cards: [JSON] = []
    public var stats: JSON = .object([:])
    public var settings: JSON = .object([:])
    public var game: JSON = StudyGame.empty
    public var mistakes: [JSON] = []
    public var seen: [String: Double] = [:]
    public var catalog = TopicCatalog()
    public init() {}
    public init(cards: [JSON], stats: JSON = .object([:]), settings: JSON = .object([:]), game: JSON = StudyGame.empty, mistakes: [JSON] = [], seen: [String: Double] = [:], catalog: TopicCatalog = TopicCatalog()) {
        self.cards = cards; self.stats = stats; self.settings = settings; self.game = game; self.mistakes = mistakes; self.seen = seen; self.catalog = catalog
    }
}

/// One write: only what changed.
public struct VocabEdit: Sendable {
    public var upsert: [JSON] = []
    /// card keys (`Vocab.cardKey`) removed – a tombstone is written
    public var removed: [String] = []
    public var stats: JSON?
    public var game: JSON?
    public var mistakes: [JSON]?
    public var seen: [String: Double]?
    public init(upsert: [JSON] = [], removed: [String] = [], stats: JSON? = nil, game: JSON? = nil, mistakes: [JSON]? = nil, seen: [String: Double]? = nil) {
        self.upsert = upsert; self.removed = removed; self.stats = stats; self.game = game; self.mistakes = mistakes; self.seen = seen
    }
}

public protocol VocabDataSource: Sendable {
    func load() async -> VocabBundle
    func commit(_ edit: VocabEdit, now: Int64) async
}

/// The offline fallback word library: the bundled onboarding pack (content-pack/starter.json). The full catalog is `WordCatalogRemote`.
public enum StudyCatalog {
    public static func bundled() -> TopicCatalog {
        guard let pack = StarterDeck.bundled() else { return TopicCatalog() }
        let ids = pack.topics.keys.sorted()
        let topics = ids.map { id in
            TopicCatalog.Topic(id: id, group: "topics", name: id.replacingOccurrences(of: "-", with: " ").capitalized, emoji: pack.topics[id]?.first?.s("emoji") ?? "", words: pack.topics[id] ?? [])
        }
        return TopicCatalog(topics: topics, groups: [.init(id: "topics", name: "")])
    }
}

/// Production data: the SwiftData repository (serial writes, same lock as a sync merge).
public struct RepoVocabData: VocabDataSource {
    let repo: LKRepository
    let catalog: @Sendable () async -> TopicCatalog
    static let seenKey = "lk.newSeen"
    public init(repo: LKRepository, catalog: @escaping @Sendable () async -> TopicCatalog = { await WordCatalogRemote.shared.catalog() }) { self.repo = repo; self.catalog = catalog }

    public func load() async -> VocabBundle {
        var b = VocabBundle()
        if let doc = try? await repo.snapshot() {
            b.cards = doc.cards.keys.sorted().compactMap { doc.cards[$0] }
            b.cards = Vocab.stableSorted(b.cards) { ($0.d("added") ?? 0) < ($1.d("added") ?? 0) }
            b.stats = doc.stats ?? .object([:])
            b.settings = doc.settings ?? .object([:])
            b.game = doc.game ?? StudyGame.empty
        }
        b.mistakes = await repo.legacyStore("mistakes")?.array ?? []
        if let s = UserDefaults.standard.string(forKey: Self.seenKey), let j = try? JSON.parse(s) {
            b.seen = (j.object ?? [:]).compactMapValues(\.double)
        }
        b.catalog = await catalog()
        return b
    }

    public func commit(_ e: VocabEdit, now: Int64) async {
        if !e.upsert.isEmpty || !e.removed.isEmpty || e.stats != nil || e.game != nil {
            let edit = e
            _ = try? await repo.mutate { doc in
                for c in edit.upsert { let k = Vocab.cardKey(c); doc.cards[k] = c; doc.deleted[k] = nil }
                for k in edit.removed { doc.cards[k] = nil; doc.deleted[k] = Double(now) }
                if let s = edit.stats { doc.stats = s }
                if let g = edit.game { doc.game = g }
            }
        }
        if let m = e.mistakes { await repo.storeLegacy("mistakes", .array(m)) }
        if let s = e.seen { UserDefaults.standard.set(JSON.object(s.mapValues { JSON.number($0) }).stableString, forKey: Self.seenKey) }
    }
}

extension LKRepository {
    /// A device-only Store key (web `Store.set('mistakes', …)`): written where `legacyStore` reads it, so the Today count stays right.
    func storeLegacy(_ key: String, _ value: JSON) {
        let k = "ls:ielts." + key
        let payload = JSON.string(value.stableString)
        var d = FetchDescriptor<LegacyKV>(predicate: #Predicate { $0.key == k }); d.fetchLimit = 1
        if let row = (try? modelContext.fetch(d))?.first { row.payload = payload.data } else { modelContext.insert(LegacyKV(key: k, value: payload)) }
        try? modelContext.save()
    }
}

/// In-memory data (previews, snapshot tests, guest without a store).
public final class MemoryVocabData: VocabDataSource, @unchecked Sendable {
    private let lock = NSLock()
    private var bundle: VocabBundle
    public init(_ b: VocabBundle = VocabBundle()) { bundle = b }
    public func load() async -> VocabBundle { read() }
    public func commit(_ e: VocabEdit, now: Int64) async { write(e) }
    private func read() -> VocabBundle { lock.lock(); defer { lock.unlock() }; return bundle }
    private func write(_ e: VocabEdit) {
        lock.lock(); defer { lock.unlock() }
        for c in e.upsert {
            let k = Vocab.cardKey(c)
            if let i = bundle.cards.firstIndex(where: { Vocab.cardKey($0) == k }) { bundle.cards[i] = c } else { bundle.cards.append(c) }
        }
        for k in e.removed { bundle.cards.removeAll { Vocab.cardKey($0) == k } }
        if let s = e.stats { bundle.stats = s }
        if let g = e.game { bundle.game = g }
        if let m = e.mistakes { bundle.mistakes = m }
        if let s = e.seen { bundle.seen = s }
    }
}

private struct VocabDataKey: EnvironmentKey { static let defaultValue: VocabDataSource? = nil }
public extension EnvironmentValues { var vocabData: VocabDataSource? { get { self[VocabDataKey.self] } set { self[VocabDataKey.self] = newValue } } }

/// `App.reward({...})` of web/js/game.js without quests/badges (those land with the Me screens): per-day counters, totals, XP, best match time.
public struct StudyDelta: Sendable, Equatable {
    public var xp = 0
    public var counters: [String: Int] = [:]
    public var matchTime: Double?
    public init(xp: Int = 0, counters: [String: Int] = [:], matchTime: Double? = nil) { self.xp = xp; self.counters = counters; self.matchTime = matchTime }
    public init(_ r: ReviewReward) {
        xp = r.xp
        counters = ["reviews": r.reviews]
        if r.newWords > 0 { counters["newWords"] = r.newWords }
        if r.again > 0 { counters["again"] = r.again }
    }
}

public enum StudyGame {
    public static let empty: JSON = .obj([("xp", .int(0)), ("days", .object([:])),
        ("total", .obj([("reviews", .int(0)), ("newWords", .int(0)), ("quizzes", .int(0)), ("perfect", .int(0)), ("matches", .int(0)), ("spoken", .int(0)), ("readings", .int(0)), ("lookups", .int(0))])),
        ("best", .object([:])), ("badges", .object([:])), ("questsDone", .object([:]))])

    public static func apply(_ game: JSON, _ d: StudyDelta, now: Int64, clock: VocabClock) -> JSON {
        var g = game.object ?? [:]
        let k = clock.todayKey(now)
        var days = g["days"]?.object ?? [:]
        var day = days[k]?.object ?? [:]
        var total = g["total"]?.object ?? [:]
        for (m, v) in d.counters {
            day[m] = .number(JSON.orZero(day[m]) + Double(v))
            if total[m] != nil { total[m] = .number(JSON.orZero(total[m]) + Double(v)) }
        }
        day["xp"] = .number(JSON.orZero(day["xp"]) + Double(d.xp))
        days[k] = .object(day)
        let keys = days.keys.sorted()
        if keys.count > 400 { for x in keys.prefix(keys.count - 400) { days[x] = nil } }
        g["xp"] = .number(JSON.orZero(g["xp"]) + Double(d.xp))
        g["days"] = .object(days)
        g["total"] = .object(total)
        if let t = d.matchTime {
            var best = g["best"]?.object ?? [:]
            if !JSON.truthy(best["match"]) || t < JSON.orZero(best["match"]) { best["match"] = .number(t) }
            g["best"] = .object(best)
        }
        return .object(g)
    }
}
