import Foundation
import SwiftData
import LKSync

/// The single offline-first store of the app. All writes go through this actor (serial = the web `Cards.mutate` lock),
/// so a sync merge can never overwrite an answer saved while the network call was in flight.
public actor LKRepository: ModelActor, SyncLocalStore {
    public nonisolated let modelContainer: ModelContainer
    public nonisolated let modelExecutor: any ModelExecutor

    public init(modelContainer: ModelContainer) {
        self.modelContainer = modelContainer
        modelExecutor = DefaultSerialModelExecutor(modelContext: ModelContext(modelContainer))
    }
    /// In-memory store (tests, previews).
    public static func inMemory() throws -> LKRepository { LKRepository(modelContainer: try LKSchema.container(inMemory: true)) }

    // MARK: rows
    private func metaRow() throws -> SyncMeta {
        if let m = try modelContext.fetch(FetchDescriptor<SyncMeta>()).first { return m }
        let m = SyncMeta(); modelContext.insert(m); return m
    }
    private func settingsRow() throws -> Settings? { try modelContext.fetch(FetchDescriptor<Settings>()).first }
    private static func parse(_ d: Data?) -> JSON? { d.flatMap { try? JSON.parse($0) } }

    // MARK: SyncLocalStore
    public func snapshot() async throws -> SyncDoc { try read() }

    func read() throws -> SyncDoc {
        var doc = SyncDoc()
        for c in try modelContext.fetch(FetchDescriptor<CardModel>()) { doc.cards[c.key] = c.json }
        let m = try metaRow()
        var stats = JSON.spread(Self.parse(m.statsExtra))
        var days: [String: JSON] = [:]
        for d in try modelContext.fetch(FetchDescriptor<StatDay>()) { days[d.day] = .number(d.reviews) }
        stats["days"] = .object(days)
        doc.stats = .object(stats)
        doc.game = Self.parse(m.game).flatMap { $0 == .null ? nil : $0 }
        doc.deleted = (Self.parse(m.tombstones)?.object ?? [:]).compactMapValues(\.double)
        if let s = try settingsRow() { doc.settings = s.json; doc.settingsAt = s.settingsAt }
        return doc
    }

    @discardableResult
    public func mutate(_ f: @escaping @Sendable (inout SyncDoc) -> Void) async throws -> (before: SyncDoc, after: SyncDoc) {
        let before = try read()
        var after = before
        f(&after)
        try write(before: before, after: after)
        return (before, after)
    }

    /// Write only what changed (a merge touching 3 cards of 20 000 writes 3 rows).
    func write(before: SyncDoc, after: SyncDoc) throws {
        if before.cards != after.cards {
            var rows: [String: CardModel] = [:]
            for c in try modelContext.fetch(FetchDescriptor<CardModel>()) { rows[c.key] = c }
            for (k, c) in after.cards where before.cards[k] != c {
                if let r = rows[k] { r.update(c) } else { modelContext.insert(CardModel(key: k, card: c)) }
            }
            for k in before.cards.keys where after.cards[k] == nil { if let r = rows[k] { modelContext.delete(r) } }
        }
        let m = try metaRow()
        if before.stats != after.stats {
            var st = JSON.spread(after.stats)
            let days = JSON.spread(st["days"]); st["days"] = nil
            m.statsExtra = JSON.object(st).data
            let old = JSON.spread(before.stats?["days"])
            var rows: [String: StatDay] = [:]
            for d in try modelContext.fetch(FetchDescriptor<StatDay>()) { rows[d.day] = d }
            for (k, v) in days where old[k] != v || rows[k] == nil {
                let n = v.toNumber.isNaN ? 0 : v.toNumber
                if let r = rows[k] { r.reviews = n } else { modelContext.insert(StatDay(day: k, reviews: n)) }
            }
            for k in rows.keys where days[k] == nil { modelContext.delete(rows[k]!) }
        }
        if before.game != after.game { m.game = after.game.map(\.data) }
        if before.deleted != after.deleted { m.tombstones = JSON.object(after.deleted.mapValues { .number($0) }).data }
        if before.settings != after.settings || before.settingsAt != after.settingsAt {
            let payload = (after.settings ?? .object([:])).data
            if let s = try settingsRow() { s.payload = payload; s.settingsAt = after.settingsAt }
            else { modelContext.insert(Settings(payload: payload, settingsAt: after.settingsAt)) }
        }
        try modelContext.save()
    }

    public func loadMeta() async -> SyncMetaState {
        guard let m = try? metaRow() else { return SyncMetaState() }
        return (try? JSONDecoder().decode(SyncMetaState.self, from: m.state)) ?? SyncMetaState()
    }
    public func saveMeta(_ s: SyncMetaState) async {
        guard let m = try? metaRow(), let d = try? JSONEncoder().encode(s) else { return }
        m.state = d
        try? modelContext.save()
    }

    public func backupAndReset(oldUid: String, now: Double) async throws {
        let doc = try read()
        let m = try metaRow()
        m.accountBackup = (["uid": .string(oldUid), "at": .number(now), "cards": .object(doc.cards), "stats": doc.stats ?? SyncDoc.emptyStats,
                            "game": doc.game ?? .null, "deleted": .object(doc.deleted.mapValues { .number($0) })] as JSON).data
        var after = doc
        after.cards = [:]; after.stats = ["days": [:], "newToday": ["day": "", "n": 0]]; after.game = nil; after.deleted = [:]
        try write(before: doc, after: after)
    }
    /// web `Sync.restoreBackup()`: merge the backed-up account data back in.
    public func restoreAccountBackup(now: Double) async throws -> Bool {
        let m = try metaRow()
        guard let b = Self.parse(m.accountBackup), b.truthy else { return false }
        let remote = SyncDoc(json: b)
        let before = try read()
        try write(before: before, after: SyncMerge.merge(local: before, remote: remote, now: now))
        m.accountBackup = nil
        try modelContext.save()
        return true
    }

    // MARK: legacy keys (C03)
    public func legacy(_ key: String) -> JSON? {
        var d = FetchDescriptor<LegacyKV>(predicate: #Predicate { $0.key == key }); d.fetchLimit = 1
        return (try? modelContext.fetch(d))?.first?.json
    }
    public func migratedAt() -> Double? { try? metaRow().migratedAt }
    /// A 1.x Store key that is not part of the sync document (e.g. "mistakes"): localStorage 'ielts.<key>' JSON, else IndexedDB.
    public func legacyStore(_ key: String) -> JSON? {
        if let s = legacy("ls:ielts.\(key)")?.string { return try? JSON.parse(s) }
        return legacy("idb:lexkite/ielts.\(key)")
    }

    /// Import a Capacitor export (C03). Idempotent: a second import merges (never duplicates or drops data).
    public func importLegacy(_ imp: MigrationImport, now: Double) async throws {
        let before = try read()
        // fresh install → exact copy (zero loss, no merge artefacts); data already here → merge like a sync
        let fresh = before.cards.isEmpty && before.game == nil && before.settings == nil && before.deleted.isEmpty
            && (before.stats?["days"]?.object ?? [:]).isEmpty
        var after = fresh ? imp.doc : SyncMerge.merge(local: before, remote: imp.doc, now: nil)
        if after.stats == nil { after.stats = before.stats }
        try write(before: before, after: after)
        var rows: [String: LegacyKV] = [:]
        for r in try modelContext.fetch(FetchDescriptor<LegacyKV>()) { rows[r.key] = r }
        for (k, v) in imp.legacy {
            if let r = rows[k] { r.payload = v.data } else { modelContext.insert(LegacyKV(key: k, value: v)) }
        }
        if !imp.syncMeta.lastUid.isEmpty || !imp.syncMeta.pulledHashes.isEmpty {
            var s = await loadMeta()
            if s.lastUid.isEmpty { s.lastUid = imp.syncMeta.lastUid }
            for (u, h) in imp.syncMeta.pulledHashes where s.pulledHashes[u] == nil { s.pulledHashes[u] = h }
            if s.syncPausedUntil < imp.syncMeta.syncPausedUntil { s.syncPausedUntil = imp.syncMeta.syncPausedUntil }
            await saveMeta(s)
        }
        let mr = try metaRow(); mr.migratedAt = now
        try modelContext.save()
    }

    // MARK: Today (P02)
    public func today(now: Date = Date(), calendar: Calendar = .current) throws -> TodaySnapshot {
        let doc = try read()
        let mistakes = (legacyStore("mistakes")?.array ?? []).filter { !JSON.truthy($0["fixed"]) }.count
        return TodaySnapshot.compute(doc: doc, mistakes: mistakes, now: now, calendar: calendar)
    }
}
