import Foundation
import SwiftData
import LKSync

/// SwiftData schema = the web `Core.Cards.make` / IndexedDB 'lexkite'.kv contract (docs/specs/native-apps.md §4).
/// Every model keeps the exact JSON it was synced with (`payload`) so fields this build does not know (added by web or a newer client)
/// round-trip untouched; the scalar columns are denormalised from it for fast queries (due counts on Today, review queue).
@Model
public final class CardModel {
    /// Card key = `tlKey(word, tl)` – the key of `cards` in the sync document.
    @Attribute(.unique) public var key: String
    public var word: String
    /// FSRS state (`srs.due/last/reps`) – ms since epoch, like web
    public var due: Int64
    public var last: Int64?
    public var reps: Int
    /// `activity(c)` – last activity used by the merge
    public var activity: Double
    /// has a meaning (`vi`) – practicable for the 'due' source
    public var hasMeaning: Bool
    /// slim card JSON (sync.js slim()), lossless
    public var payload: Data

    public init(key: String, card: JSON) {
        self.key = key; word = ""; due = 0; last = nil; reps = 0; activity = 0; hasMeaning = false; payload = Data()
        update(card)
    }
    public func update(_ card: JSON) {
        word = card["word"]?.string ?? key
        let srs = card["srs"]
        due = srs?["due"]?.int64 ?? 0
        last = srs?["last"]?.int64
        reps = Int(JSON.orZero(srs?["reps"]))
        activity = SyncMerge.activity(card)
        hasMeaning = JSON.truthy(card["vi"])
        payload = card.data
    }
    public var json: JSON { (try? JSON.parse(payload)) ?? .object([:]) }
}

/// One day of review counts (`stats.days[YYYY-MM-DD]`).
@Model
public final class StatDay {
    @Attribute(.unique) public var day: String
    public var reviews: Double
    public init(day: String, reviews: Double) { self.day = day; self.reviews = reviews }
}

/// The learner's settings object (web `Store 'settings'`) + `settingsAt` (last edit, wins in the merge).
@Model
public final class Settings {
    @Attribute(.unique) public var id: String
    public var payload: Data
    public var settingsAt: Double
    public init(payload: Data, settingsAt: Double) { id = "main"; self.payload = payload; self.settingsAt = settingsAt }
    public var json: JSON? { try? JSON.parse(payload) }
}

/// Everything else the sync document carries + engine bookkeeping (one row).
@Model
public final class SyncMeta {
    @Attribute(.unique) public var id: String
    /// `stats` without `days` (newToday, hours, …)
    public var statsExtra: Data
    /// `game` (XP, days, freezes, badges, …) – null when none
    public var game: Data?
    /// tombstones = sync doc `deleted[key] = ms`. NOT named `deleted`: that is an NSManagedObject property (isDeleted) –
    /// Core Data aborts on save (crash in LKRepository.write); guarded by SchemaTests.testNoReservedAttributeNames
    public var tombstones: Data
    /// SyncMetaState (pulledHashes, lastUid, syncPausedUntil, Drive state)
    public var state: Data
    /// C03: when the Capacitor (IndexedDB) data was imported; nil = not yet
    public var migratedAt: Double?
    /// web `acctBackup` (account switch → "use only this account's data")
    public var accountBackup: Data?
    public init() {
        id = "main"; statsExtra = Data("{}".utf8); game = nil; tombstones = Data("{}".utf8); state = (try? JSONEncoder().encode(SyncMetaState())) ?? Data()
    }
}

/// Every other key of the Capacitor app's IndexedDB `kv` store and its localStorage (mistakes, path progress, lesson stars, …),
/// kept verbatim by the C03 migration so no learner data is lost before the screen that uses it is ported.
@Model
public final class LegacyKV {
    /// "idb:<key>" or "ls:<key>"
    @Attribute(.unique) public var key: String
    public var payload: Data
    public init(key: String, value: JSON) { self.key = key; payload = value.data }
    public var json: JSON? { try? JSON.parse(payload) }
}

public enum LKSchema {
    public static let models: [any PersistentModel.Type] = [CardModel.self, StatDay.self, Settings.self, SyncMeta.self, LegacyKV.self]
    public static func container(inMemory: Bool = false) throws -> ModelContainer {
        let schema = Schema(models)
        let cfg = ModelConfiguration("Lexkite", schema: schema, isStoredInMemoryOnly: inMemory)
        return try ModelContainer(for: schema, configurations: [cfg])
    }
}
