import Foundation
import LKSync

/// C03 – the import half of the Capacitor → native migration. The export half is native/shared/gen/migration-export.js, run once in a hidden
/// WKWebView at the old origin (capacitor://localhost) by `LegacyWebExporter` (LKFeatures). Its result
/// `{ kind: 'lexkite-capacitor-export', v, origin, at, prefix: 'ielts.', idb: { lexkite: {kv…}, vocaband: {kv…} }, ls: {key: string}, skipped, errors }`
/// is turned into the sync document exactly like web/js/core.js would read it back (Store.get + bigGet + migrateOldDb + Cards.normalize +
/// Game.get), checked against native/shared/gen/vectors/migration.json. Zero loss: every other key is kept verbatim as LegacyKV.
public struct MigrationImport: Sendable, Equatable {
    public var doc: SyncDoc
    /// "ls:<key>" (raw localStorage string) / "idb:<db>/<key>" (IndexedDB value) for everything that is not part of the sync document
    public var legacy: [String: JSON]
    public var syncMeta: SyncMetaState
    public var skipped = 0
    public var errors: [String] = []

    public static let kind = "lexkite-capacitor-export"
    /// Store keys that ARE the sync document / sync bookkeeping (core.js Store.get keys, without the 'ielts.' prefix)
    static let docKeys: Set<String> = ["cards", "stats", "game", "settings", "settingsAt", "deleted", "pulledHashes", "lastUid", "syncPausedUntil"]
    /// Game.get(): `{ ...EMPTY(), ...s, total: { ...EMPTY().total, ...s.total } }` (web/js/game.js)
    public static let emptyGame: JSON = ["xp": 0, "days": [:], "total": ["reviews": 0, "newWords": 0, "quizzes": 0, "perfect": 0, "matches": 0, "spoken": 0, "readings": 0, "lookups": 0],
                                         "best": [:], "badges": [:], "questsDone": [:]]

    public init(export: JSON, now: Double) throws {
        guard export.isObject else { throw SyncCodec.CodecError.shape }
        if let k = export["kind"]?.string, k != Self.kind { throw SyncCodec.CodecError.envelope }
        let prefix = export["prefix"]?.string ?? "ielts."
        let idb = export["idb"]?.object ?? [:]
        let ls = (export["ls"]?.object ?? [:]).compactMapValues { $0.string ?? ($0 == .null ? nil : $0.stableString) }
        skipped = Int(JSON.orZero(export["skipped"]))
        errors = (export["errors"]?.array ?? []).compactMap(\.string)

        // migrateOldDb: rows of the old "vocaband" DB only fill keys missing in "lexkite"
        var kv = idb["vocaband"]?.object ?? [:]
        for (k, v) in idb["lexkite"]?.object ?? [:] { kv[k] = v }

        // Store.get(key, fallback): localStorage JSON (broken JSON → fallback)
        func lsGet(_ key: String) -> JSON? {
            guard let raw = ls[prefix + key], !raw.isEmpty else { return nil }
            return try? JSON.parse(raw)
        }
        // bigGet('cards'): IndexedDB value, merged with a newer copy left in localStorage (per card: higher mod wins)
        var cardsVal: JSON? = kv[prefix + "cards"]
        if let raw = ls[prefix + "cards"], !raw.isEmpty, let old = try? JSON.parse(raw) {
            if case .object(var v)? = cardsVal, case .object(let o) = old {
                for (k, c) in o where v[k] == nil || !JSON.truthy(v[k]) || JSON.orZero(c["mod"]) > JSON.orZero(v[k]?["mod"]) { v[k] = c }
                cardsVal = .object(v)
            } else { cardsVal = old }
        }

        var doc = SyncDoc()
        doc.cards = Self.normalize(cardsVal?.object ?? [:], now: now)
        let stats = lsGet("stats")
        doc.stats = stats.flatMap { $0 == .null ? nil : $0 } ?? SyncDoc.emptyStats
        let g = lsGet("game")
        var game = JSON.spread(Self.emptyGame)
        if let g, g.truthy {
            for (k, v) in JSON.spread(g) { game[k] = v }
            game["total"] = .object(JSON.spread(Self.emptyGame["total"]).merging(JSON.spread(g["total"])) { _, b in b })
        }
        game["questsDone"] = [:]   // snapLocal: { ...game, questsDone: {} }
        doc.game = .object(game)
        doc.settings = lsGet("settings").flatMap { $0 == .null ? nil : $0 } ?? [:]
        doc.settingsAt = lsGet("settingsAt").map { JSON.orZero($0) } ?? 0
        let del = (lsGet("deleted")?.object ?? [:]).compactMapValues { $0.isNumber ? $0.double : nil }
        doc.deleted = SyncMerge.pruneDeleted(del, now: now)
        self.doc = doc

        var meta = SyncMetaState()
        meta.lastUid = lsGet("lastUid")?.string ?? ""
        for (u, h) in lsGet("pulledHashes")?.object ?? [:] { meta.pulledHashes[u] = h.object?.compactMapValues(\.string) ?? [:] }
        meta.syncPausedUntil = lsGet("syncPausedUntil").map { JSON.orZero($0) } ?? 0
        syncMeta = meta

        var legacy: [String: JSON] = [:]
        for (db, rows) in idb {
            for (k, v) in rows.object ?? [:] where !(k.hasPrefix(prefix) && Self.docKeys.contains(String(k.dropFirst(prefix.count)))) { legacy["idb:\(db)/\(k)"] = v }
        }
        for (k, v) in ls where !(k.hasPrefix(prefix) && Self.docKeys.contains(String(k.dropFirst(prefix.count)))) { legacy["ls:" + k] = .string(v) }
        self.legacy = legacy
    }

    /// The export reported nothing to migrate (fresh install of 2.0, or the web view had no data).
    public var isEmpty: Bool { doc.cards.isEmpty && legacy.isEmpty && (doc.stats?["days"]?.object ?? [:]).isEmpty && JSON.orZero(doc.game?["xp"]) == 0 }

    // MARK: core.js keys + normalize
    /// `keyOf(w)`: lower-case, curly quotes → ', collapse whitespace, trim
    public static func keyOf(_ w: JSON?) -> String {
        let s: String = JSON.truthy(w) ? (w!.string ?? w!.jsToString) : ""
        var o = s.lowercased()
        for q in ["\u{2019}", "\u{2018}", "`"] { o = o.replacingOccurrences(of: q, with: "'") }
        o = o.replacingOccurrences(of: #"\s+"#, with: " ", options: .regularExpression)
        return o.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    /// `tlKey(w, tl)`
    public static func tlKey(_ w: JSON?, _ tl: JSON?) -> String {
        let t = JSON.truthy(tl) ? (tl!.string ?? tl!.jsToString) : ""
        return (!t.isEmpty && t != "en" ? t + ":" : "") + keyOf(w)
    }
    static func activityOf(_ c: JSON) -> Double { JSON.jsMax(JSON.orZero(c["srs"]?["last"]), JSON.orZero(c["mod"]), JSON.orZero(c["added"])) }
    static func unionContexts(_ a: JSON?, _ b: JSON?) -> JSON {
        let x = a?.array ?? [], y = b?.array ?? []
        return .array(Array((x + y.filter { c in !x.contains { $0["text"] == c["text"] } }).prefix(5)))
    }
    public static func newState(_ now: Double) -> JSON { ["ef": 2.5, "interval": 0, "reps": 0, "lapses": 0, "due": .number(now), "last": .null, "step": 0] }

    /// `Cards.normalize(map)`: drop entries without a word, re-key to `tlKey` (duplicates keep the most recent activity, contexts merged),
    /// default arrays + SRS state + `added`, drop unlicensed Wikipedia images.
    public static func normalize(_ input: [String: JSON], now: Double) -> [String: JSON] {
        var map = input
        // JS object order: array-index keys ascending, then the rest (insertion order is not available after JSON decoding → UTF-16 order)
        for (k, _) in JSON.orderedKeys(input) {
            guard let c0 = map[k] else { continue }
            guard c0.truthy, JSON.truthy(c0["word"]) else { map[k] = nil; continue }
            var c = c0
            let nk = tlKey(c["word"], c["tl"])
            if nk != k {
                let other = map[nk]
                map[k] = nil
                if var o = other, activityOf(o) >= activityOf(c) {
                    o["contexts"] = unionContexts(o["contexts"], c["contexts"]); map[nk] = o; continue
                }
                if let o = other { c["contexts"] = unionContexts(c["contexts"], o["contexts"]) }
            }
            for f in ["contexts", "col", "syn", "sentences"] where c[f]?.array == nil { c[f] = [] }
            var srs = JSON.spread(newState(now)); for (sk, sv) in JSON.spread(c["srs"]) { srs[sk] = sv }
            c["srs"] = .object(srs)
            if !JSON.truthy(c["added"]) { c["added"] = .number(now) }
            if let img = c["image"]?.string, !img.isEmpty, !JSON.truthy(c["imageCredit"]), img.range(of: "wikipedia|wikimedia", options: .regularExpression) != nil { c["image"] = "" }
            map[nk] = c
        }
        return map
    }
}
