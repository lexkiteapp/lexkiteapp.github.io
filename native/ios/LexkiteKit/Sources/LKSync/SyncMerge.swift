import Foundation

/// The sync document every client exchanges (docs/specs/native-apps.md §4 data contract):
/// `{ cards: {key: slimCard}, deleted: {key: ms}, stats, game, settings, settingsAt }`.
/// Field-for-field the same as the web snapshot (web/js/sync.js snapLocal / meta), so vectors in native/shared/gen/vectors/sync.json
/// decode straight into it.
public struct SyncDoc: Sendable, Equatable {
    public var cards: [String: JSON]
    public var deleted: [String: Double]
    public var stats: JSON?
    public var game: JSON?
    public var settings: JSON?
    public var settingsAt: Double

    public init(cards: [String: JSON] = [:], deleted: [String: Double] = [:], stats: JSON? = nil, game: JSON? = nil, settings: JSON? = nil, settingsAt: Double = 0) {
        self.cards = cards; self.deleted = deleted; self.stats = stats; self.game = game; self.settings = settings; self.settingsAt = settingsAt
    }

    /// Default stats exactly like web `Core.Stats.get()` when nothing is stored.
    public static let emptyStats: JSON = ["days": [:], "newToday": ["day": "", "n": 0]]

    public init(json: JSON) {
        cards = json["cards"]?.object ?? [:]
        deleted = (json["deleted"]?.object ?? [:]).compactMapValues { $0.double }
        stats = json["stats"].flatMap { $0 == .null ? nil : $0 }
        game = json["game"].flatMap { $0 == .null ? nil : $0 }
        settings = json["settings"].flatMap { $0 == .null ? nil : $0 }
        settingsAt = json["settingsAt"]?.double ?? 0
    }
    public var json: JSON {
        var o: [String: JSON] = ["cards": .object(cards), "deleted": .object(deleted.mapValues { .number($0) }), "settingsAt": .number(settingsAt)]
        if let stats { o["stats"] = stats }
        o["game"] = game ?? .null
        if let settings { o["settings"] = settings }
        return .object(o)
    }
}

/// Bit-exact port of the merge functions in web/js/sync.js (mergeCards, mergeStats0, mergeGame0, mergeRet, maxMerge, ord, pruneDel).
/// Deterministic, commutative and idempotent like the reference; verified on CI against vectors generated from the JS itself.
public enum SyncMerge {
    public static let tombstoneDays: Double = 90

    // MARK: cards
    /// `activity(c) = Math.max(c.srs && c.srs.last || 0, c.added || 0, c.mod || 0)`
    public static func activity(_ c: JSON) -> Double {
        let last: Double = JSON.truthy(c["srs"]) ? JSON.orZero(c["srs"]?["last"]) : 0
        return JSON.jsMax(last, JSON.orZero(c["added"]), JSON.orZero(c["mod"]))
    }

    public static func mergeCards(_ a: [String: JSON], _ b: [String: JSON], deleted: [String: Double] = [:]) -> [String: JSON] {
        var out = a
        for (k, c) in b {
            guard let mine = out[k] else { out[k] = c; continue }
            let ac = activity(c), am = activity(mine)
            // tie on activity → compare the stable JSON text so two devices merging in any order agree
            let remoteWins = ac > am || (ac == am && JSON.utf16Less(mine.stableString, c.stableString))
            var win = JSON.spread(remoteWins ? c : mine)
            let lose = remoteWins ? mine : c
            // `[...(win.contexts || []), ...(lose.contexts || []).filter(x => !(win.contexts || []).some(y => y.text === x.text))].slice(0, 5)`
            let winCtx = win["contexts"]?.array ?? [], lc = lose["contexts"]?.array ?? []
            let extra = lc.filter { x in !winCtx.contains { y in textOf(y) == textOf(x) } }
            win["contexts"] = .array(Array((winCtx + extra).prefix(5)))
            out[k] = .object(win)
        }
        // deleted on any device after the card's last activity → drop
        for (k, t) in deleted { if let c = out[k], activity(c) < t { out[k] = nil } }
        return out
    }
    /// `x.text` (undefined for non-objects) – compared with `===`
    private static func textOf(_ v: JSON) -> JSON? { v["text"] }

    // MARK: stats
    /// `ord(f)`: call f with the two sides in a canonical order (stable text) so the result is commutative.
    static func ord(_ a: JSON?, _ b: JSON?, _ f: (JSON?, JSON?) -> JSON?) -> JSON? {
        if let a, let b, a.truthy, b.truthy, JSON.utf16Less(b.stableString, a.stableString) { return f(b, a) }
        return f(a, b)
    }
    public static func mergeStats(_ a: JSON?, _ b: JSON?) -> JSON? { ord(a, b, mergeStats0) }

    static func mergeStats0(_ a: JSON?, _ b: JSON?) -> JSON? {
        var days = JSON.spread(a?["days"])
        for (k, v) in JSON.entries(b?["days"]) { days[k] = JSON.n(JSON.jsMax(JSON.orZero(days[k]), v.toNumber)) }
        let an = a?["newToday"], bn = b?["newToday"]
        let nt: JSON?
        if JSON.truthy(an), JSON.truthy(bn), an?["day"] == bn?["day"] {
            var o: [String: JSON] = ["n": JSON.n(JSON.jsMax(JSON.num(an?["n"]), JSON.num(bn?["n"])))]
            o["day"] = an?["day"]   // undefined day → key dropped like JSON.stringify
            nt = .object(o)
        } else if JSON.truthy(an), JSON.jsGreater(an?["day"], JSON.truthy(bn) ? bn?["day"] : nil) {
            nt = an
        } else {
            nt = JSON.truthy(bn) ? bn : an
        }
        let ha = a?["hours"]?.array ?? [], hb = b?["hours"]?.array ?? []
        var o: [String: JSON] = ["days": .object(days)]
        if let nt { o["newToday"] = nt }
        if !ha.isEmpty || !hb.isEmpty {
            o["hours"] = .array((0..<24).map { i in
                JSON.n(JSON.jsMax(i < ha.count ? JSON.orZero(ha[i]) : 0, i < hb.count ? JSON.orZero(hb[i]) : 0))
            })
        }
        return .object(o)
    }

    // MARK: game
    /// `maxMerge(x = {}, y = {})`: keep the best score per item
    static func maxMerge(_ x: JSON?, _ y: JSON?) -> JSON {
        var o = JSON.spread(x)
        for (k, v) in JSON.entries(y) {
            if v.isNumber, let cur = o[k], cur.isNumber { o[k] = JSON.n(JSON.jsMax(cur.toNumber, v.toNumber)) }
            else if let cur = o[k], cur != .null { o[k] = cur }
            else { o[k] = v }
        }
        return .object(o)
    }

    static func mergeRet(_ a: JSON?, _ b: JSON?) -> JSON? {
        guard JSON.truthy(b) else { return a }
        guard JSON.truthy(a) else { return b }
        var ev: [String: [JSON]] = [:]
        for src in [a?["ev"], b?["ev"]] {
            for (id, arr) in JSON.entries(JSON.truthy(src) ? src : nil) {
                var seen: [JSON] = []
                for x in (ev[id] ?? []) + (arr.array ?? []) where !seen.contains(where: { sameValueZero($0, x) }) { seen.append(x) }
                ev[id] = Array(jsDefaultSort(seen).prefix(7))
            }
        }
        let lead = plusOr0(b?["frameAt"]) > plusOr0(a?["frameAt"]) ? b : a
        func merged(_ k: String) -> JSON { .object(JSON.spread(b?[k]).merging(JSON.spread(a?[k])) { _, x in x }) }
        let frame: JSON = JSON.truthy(lead?["frame"]) ? lead!["frame"]! : ""
        return .object([
            "ms": merged("ms"), "own": merged("own"), "evDone": merged("evDone"),
            "ev": .object(ev.mapValues { .array($0) }),
            "opened": JSON.n(JSON.jsMax(plusOr0(a?["opened"]), plusOr0(b?["opened"]))),
            "frame": frame,
            "frameAt": JSON.n(plusOr0(lead?["frameAt"])),
        ])
    }
    /// `+x || 0`
    private static func plusOr0(_ v: JSON?) -> Double { let x = JSON.num(v); return x.isNaN || x == 0 ? 0 : x }
    /// `[...new Set(xs)]` equality (SameValueZero; objects by identity → never equal after a JSON round trip unless same text – treated as distinct)
    private static func sameValueZero(_ a: JSON, _ b: JSON) -> Bool {
        switch (a, b) {
        case (.number(let x), .number(let y)): return x == y || (x.isNaN && y.isNaN)
        case (.string, .string), (.bool, .bool), (.null, .null): return a == b
        default: return false
        }
    }
    /// `Array.prototype.sort()` with no comparator: by String(x) in UTF-16 order, stable, undefined last (none in JSON).
    static func jsDefaultSort(_ xs: [JSON]) -> [JSON] {
        xs.enumerated().sorted { l, r in
            let a = l.element.jsToString, b = r.element.jsToString
            return a == b ? l.offset < r.offset : JSON.utf16Less(a, b)
        }.map(\.element)
    }

    public static func mergeGame(_ a: JSON?, _ b: JSON?) -> JSON? { ord(a, b, mergeGame0) }

    static func mergeGame0(_ a: JSON?, _ b: JSON?) -> JSON? {
        guard JSON.truthy(b) else { return a }
        guard JSON.truthy(a) else { return b }
        let A = a!, B = b!
        var days = JSON.spread(A["days"])
        for (k, v) in JSON.entries(B["days"]) {
            var d = JSON.spread(days[k].flatMap { $0.truthy ? $0 : nil })
            for (m, n) in JSON.entries(v) { d[m] = JSON.n(JSON.jsMax(JSON.orZero(d[m]), n.toNumber)) }
            days[k] = .object(d)
        }
        var total = JSON.spread(A["total"])
        for (m, n) in JSON.entries(B["total"]) { total[m] = JSON.n(JSON.jsMax(JSON.orZero(total[m]), n.toNumber)) }
        var best = JSON.spread(A["best"])
        if JSON.truthy(B["best"]), JSON.truthy(B["best"]?["match"]) {
            let cur: Double = JSON.truthy(best["match"]) ? JSON.num(best["match"]) : 1e9
            best["match"] = JSON.n(JSON.jsMin(cur, JSON.num(B["best"]?["match"])))
        }
        var unitDone = JSON.spread(JSON.truthy(B["unitDone"]) ? B["unitDone"] : nil)
        for (k, v) in JSON.entries(A["unitDone"]) { unitDone[k] = JSON.n(JSON.jsMax(JSON.orZero(unitDone[k]), v.toNumber)) }
        let lead = JSON.orZero(B["xp"]) > JSON.orZero(A["xp"]) ? B : A
        func over(_ k: String) -> JSON {
            .object(JSON.spread(JSON.truthy(B[k]) ? B[k] : nil).merging(JSON.spread(JSON.truthy(A[k]) ? A[k] : nil)) { _, x in x })
        }
        var rtype = JSON.spread(JSON.truthy(B["rtype"]) ? B["rtype"] : nil)
        for (k, v) in JSON.entries(A["rtype"]) {
            if !JSON.truthy(rtype[k]) || JSON.jsGreater(v["t"], rtype[k]?["t"]) { rtype[k] = v }
        }
        let at = JSON.truthy(A["toeicBest"]) ? A["toeicBest"]?["total"] : nil
        let bt = JSON.truthy(B["toeicBest"]) ? B["toeicBest"]?["total"] : nil
        let toeicBest = JSON.jsGreater(at, .number(JSON.orZero(bt)), orEqual: true) ? A["toeicBest"] : B["toeicBest"]

        var o = JSON.spread(B).merging(JSON.spread(A)) { _, x in x }
        o["xp"] = JSON.n(JSON.jsMax(JSON.orZero(A["xp"]), JSON.orZero(B["xp"])))
        o["days"] = .object(days)
        o["total"] = .object(total)
        o["best"] = .object(best)
        o["unitDone"] = .object(unitDone)
        o["freezes"] = JSON.truthy(lead["freezes"]) ? lead["freezes"]! : 0
        o["freezeAt"] = JSON.n(JSON.jsMax(JSON.orZero(A["freezeAt"]), JSON.orZero(B["freezeAt"])))
        o["frozen"] = .object(JSON.spread(B["frozen"]).merging(JSON.spread(A["frozen"])) { _, x in x })
        o["listenDone"] = maxMerge(A["listenDone"], B["listenDone"])
        o["grammarDone"] = maxMerge(A["grammarDone"], B["grammarDone"])
        o["pronDone"] = maxMerge(A["pronDone"], B["pronDone"])
        o["listenBest"] = maxMerge(A["listenBest"], B["listenBest"])
        o["rtype"] = .object(rtype)
        o["toeicBest"] = toeicBest   // nil (undefined) → key dropped, like JSON.stringify
        o["badges"] = .object(JSON.spread(B["badges"]).merging(JSON.spread(A["badges"])) { _, x in x })
        o["readDone"] = over("readDone")
        o["questsDone"] = over("questsDone")
        if JSON.truthy(A["ret"]) || JSON.truthy(B["ret"]) { o["ret"] = mergeRet(A["ret"], B["ret"]) ?? .null }
        return .object(o)
    }

    // MARK: tombstones
    /// `pruneDel`: forget tombstones older than 90 days.
    public static func pruneDeleted(_ d: [String: Double], now: Double) -> [String: Double] {
        let cut = now - tombstoneDays * 864e5
        return d.filter { !($0.value < cut) }
    }
    /// web mergeIn: `deleted = {...remote.deleted}; for (k, t) of local: deleted[k] = Math.max(deleted[k] || 0, t)`
    public static func unionDeleted(_ remote: [String: Double], _ local: [String: Double]) -> [String: Double] {
        var d = remote
        for (k, t) in local { let cur = d[k] ?? 0; d[k] = JSON.jsMax(cur.isNaN ? 0 : cur, t) }
        return d
    }

    // MARK: whole document (web mergeIn)
    /// Merge a remote document into the local one exactly like web `mergeIn` (sync.js): tombstones = max-union (pruned when `now` is given),
    /// cards by last activity per card, stats / game by mergeStats / mergeGame, settings from the side edited last (`settingsAt`).
    public static func merge(local: SyncDoc, remote: SyncDoc, now: Double? = nil) -> SyncDoc {
        var deleted = unionDeleted(remote.deleted, local.deleted)
        if let now { deleted = pruneDeleted(deleted, now: now) }
        var out = local
        out.deleted = deleted
        out.cards = mergeCards(local.cards, remote.cards, deleted: deleted)
        out.stats = mergeStats(local.stats ?? SyncDoc.emptyStats, remote.stats ?? ["days": [:]])
        out.game = mergeGame(local.game, remote.game)
        if let rs = remote.settings, rs.truthy, remote.settingsAt > local.settingsAt { out.settings = rs; out.settingsAt = remote.settingsAt }
        return out
    }
}
