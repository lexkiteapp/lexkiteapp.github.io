import Foundation

/// Persistent sync bookkeeping (SwiftData `SyncMeta` in LKStore). Same keys as the web IndexedDB entries.
public struct SyncMetaState: Codable, Sendable, Equatable {
    /// `pulledHashes[uid]` – hashes of the server documents this device has merged
    public var pulledHashes: [String: [String: String]] = [:]
    public var lastUid = ""
    public var syncPausedUntil: Double = 0
    /// `driveSync[uid]`
    public var drive: [String: DriveState] = [:]
    public var lastSync: Double = 0
    public init() {}
}

/// The local, offline-first store the engine merges into (SwiftData in the app, in-memory in tests).
/// `mutate` must be atomic with respect to local edits (web `Cards.mutate` lock): review answers written while a pull is in flight are never lost.
public protocol SyncLocalStore: Sendable {
    func snapshot() async throws -> SyncDoc
    @discardableResult func mutate(_ f: @escaping @Sendable (inout SyncDoc) -> Void) async throws -> (before: SyncDoc, after: SyncDoc)
    func loadMeta() async -> SyncMetaState
    func saveMeta(_ m: SyncMetaState) async
    /// Account switch → "use only this account's data": keep a backup of the old account's data (web `acctBackup`), then clear cards/stats/game/deleted.
    func backupAndReset(oldUid: String, now: Double) async throws
}

/// In-memory store (tests, previews).
public actor MemoryStore: SyncLocalStore {
    public var doc: SyncDoc
    public var meta = SyncMetaState()
    public var backup: (uid: String, doc: SyncDoc)?
    public init(_ doc: SyncDoc = SyncDoc()) { self.doc = doc }
    public func snapshot() async throws -> SyncDoc { doc }
    public func mutate(_ f: @escaping @Sendable (inout SyncDoc) -> Void) async throws -> (before: SyncDoc, after: SyncDoc) {
        let b = doc; f(&doc); return (b, doc)
    }
    public func loadMeta() async -> SyncMetaState { meta }
    public func saveMeta(_ m: SyncMetaState) async { meta = m }
    public func backupAndReset(oldUid: String, now: Double) async throws {
        backup = (oldUid, doc)
        doc.cards = [:]; doc.stats = ["days": [:], "newToday": ["day": "", "n": 0]]; doc.game = nil; doc.deleted = [:]
    }
}

public enum SyncStatus: Equatable, Sendable {
    case idle, syncing, ok, paused, error(String)
}
public enum SyncMode: String, Sendable { case off, d1, drive }

/// Two-way sync with the shared backend (docs/specs/native-apps.md §4): D1 /api/sync documents or the user's own Drive appDataFolder,
/// a straight port of web/js/sync.js (pullMerge, push, mergeIn) + sync-drive.js (cycle). Local data is the truth: remote data is only MERGED in.
public actor SyncEngine {
    public typealias AccountSwitch = @Sendable (_ oldUid: String, _ newUid: String) async -> Bool  // true = merge this device's data into the account

    let auth: LKAuth, store: SyncLocalStore, config: SyncConfig, http: LKHTTP
    let now: @Sendable () -> Double
    let random: @Sendable () -> Double
    let accountSwitch: AccountSwitch
    let crash: LKCrash?
    private let d1: D1Client
    private let drive: DriveClient

    public private(set) var status: SyncStatus = .idle
    public private(set) var mode: SyncMode = .d1
    public private(set) var dirty = false
    private var sentHashes: [String: String] = [:]   // in memory like web: "sent since launch"
    private var needPull = false, netN = 0
    private var pushTask: Task<Void, Never>?, retryTask: Task<Void, Never>?, timer: Task<Void, Never>?
    private var pushing = false, pushAgain = false
    private var listeners: [UUID: AsyncStream<SyncStatus>.Continuation] = [:]

    public init(auth: LKAuth, store: SyncLocalStore, config: SyncConfig = SyncConfig(), http: LKHTTP = URLSessionHTTP(), crash: LKCrash? = nil,
                now: @escaping @Sendable () -> Double = { Date().timeIntervalSince1970 * 1000 },
                random: @escaping @Sendable () -> Double = { Double.random(in: 0..<1) },
                sleep: @escaping @Sendable (Double) async throws -> Void = { try await Task.sleep(nanoseconds: UInt64($0 * 1e9)) },
                accountSwitch: @escaping AccountSwitch = { _, _ in true }) {
        self.auth = auth; self.store = store; self.config = config; self.http = http; self.crash = crash
        self.now = now; self.random = random; self.accountSwitch = accountSwitch
        d1 = D1Client(http: http, auth: auth, config: config, sleep: sleep)
        drive = DriveClient(http: http, cap: config.driveCap)
    }

    public func statusUpdates() -> AsyncStream<SyncStatus> {
        let (stream, c) = AsyncStream<SyncStatus>.makeStream(bufferingPolicy: .bufferingNewest(1))
        let id = UUID()
        c.yield(status)
        listeners[id] = c
        c.onTermination = { [weak self] _ in Task { await self?.dropListener(id) } }
        return stream
    }
    private func dropListener(_ id: UUID) { listeners[id] = nil }
    private func set(_ s: SyncStatus) { status = s; for c in listeners.values { c.yield(s) } }

    // MARK: start (sign-in / launch)
    /// web `start()`: pick Drive (Google + allowed) or D1, bridge D1 → Drive once, then sync.
    public func start() async {
        guard let u = await auth.currentUser() else { return }
        guard config.enabled else { mode = .off; set(.paused); return }
        guard config.driveOnNative, u.isGoogle else {
            guard config.d1Fallback else { mode = .off; set(.paused); return }
            mode = .d1; await pullMerge(); return
        }
        var meta = await store.loadMeta()
        let st = meta.drive[u.uid] ?? DriveState()
        let token = try? await auth.driveAccessToken(interactive: false)
        if st.scope == "no" || (st.on == 0 && (token ?? "").isEmpty) {
            guard config.d1Fallback else { mode = .off; set(.paused); return }
            mode = .d1; await pullMerge(); return
        }
        mode = .drive
        let nowMs: Double = now(), bridgeWindow: Double = config.bridgeDays * 864e5, d1Gap: Double = 20 * 3600e3
        let bridge: Bool = st.d1Had != 0 && (nowMs - st.at) < bridgeWindow && (nowMs - st.lastD1) > d1Gap
        if st.on == 0 || bridge {
            if let had = await pullMerge(migrate: true) {
                meta = await store.loadMeta()
                var cur = meta.drive[u.uid] ?? DriveState()
                if st.on != 0 { cur.lastD1 = now() } else { cur.on = 1; cur.d1Had = had ? 1 : 0; cur.at = now(); cur.lastD1 = now() }
                meta.drive[u.uid] = cur; await store.saveMeta(meta)
            }
        }
        _ = await driveRun(why: "start")
    }

    /// A local change happened (review, new card, settings): batch it like web `Sync.schedule()`.
    public func markDirty() {
        dirty = true
        guard timer == nil else { return }
        let wait = mode == .drive ? config.driveEvery : config.d1Every
        timer = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(wait * 1e9))
            await self?.fireTimer()
        }
    }
    private func fireTimer() async {
        timer = nil
        if dirty { if mode == .drive { _ = await driveRun(why: "push") } else { await push() } }
    }
    /// App goes to background: push now (web pushes on pagehide).
    public func flush() async {
        timer?.cancel(); timer = nil
        guard dirty, await auth.currentUser() != nil else { return }
        if mode == .drive { _ = await driveRun(why: "hide") } else { await push() }
    }
    public func syncNow() async {
        if mode == .drive { _ = await driveRun(why: "manual") } else { await pullMerge() }
    }
    public func signedOut() {
        timer?.cancel(); timer = nil; retryTask?.cancel(); retryTask = nil
        sentHashes = [:]; needPull = false; netN = 0; dirty = false; set(.idle)
    }

    // MARK: D1 pull + merge (web pullMerge0)
    /// Returns (for `migrate`) whether the server had data; nil on error/paused.
    @discardableResult
    public func pullMerge(migrate: Bool = false) async -> Bool? {
        guard let u = await auth.currentUser() else { return nil }
        set(.syncing)
        do {
            var meta = await store.loadMeta()
            if now() < meta.syncPausedUntil { set(.paused); return nil }
            let docs = try await d1.pull(have: meta.pulledHashes[u.uid] ?? [:])
            let hs = docs["meta"]?["hs"]?.object?.compactMapValues(\.string) ?? [:]
            // signed into a different account than last time → ask before merging this device's data into it
            let hasLocal = !(try await store.snapshot()).cards.isEmpty
            if !meta.lastUid.isEmpty, meta.lastUid != u.uid, hasLocal {
                let keep = await accountSwitch(meta.lastUid, u.uid)
                if !keep { try await store.backupAndReset(oldUid: meta.lastUid, now: now()) }
            }
            meta = await store.loadMeta()
            meta.lastUid = u.uid
            await store.saveMeta(meta)
            if let m = docs["meta"] {
                var remoteCards: [String: JSON] = [:]
                let chunks = Int(JSON.orZero(m["chunks"]))
                for i in 0..<max(0, chunks) {
                    let k = "cards_\(i)"
                    guard let d = docs[k] else { if let h = hs[k] { sentHashes[k] = h }; continue }   // unchanged chunk: this device has it
                    let txt = try SyncCodec.docText(d)
                    let part = try JSON.parse(txt.isEmpty ? "{}" : txt)
                    for (w, v) in part.object ?? [:] { remoteCards[w] = v }
                    sentHashes[k] = SyncCodec.hash(txt)
                }
                let mt = try SyncCodec.docText(m)
                var remote = SyncDoc(json: try JSON.parse(mt.isEmpty ? "{}" : mt))
                remote.cards = remoteCards
                try await mergeIn(remote)
                if !hs.isEmpty { meta = await store.loadMeta(); meta.pulledHashes[u.uid] = hs; await store.saveMeta(meta) }
            }
            if migrate { if docs["meta"] != nil { await push() } else { set(.ok) }; return docs["meta"] != nil }
            await push()
            needPull = false
            return docs["meta"] != nil
        } catch {
            if case SyncError.quota(let retry) = error { await pause(retry); return nil }
            needPull = true
            await netFail(error)
            return nil
        }
    }

    /// web `mergeIn`: merge one remote document (D1 meta or Drive snapshot) into the local store, atomically.
    func mergeIn(_ remote: SyncDoc) async throws {
        let t = now()
        try await store.mutate { local in local = SyncMerge.merge(local: local, remote: remote, now: t) }
    }

    // MARK: D1 push (web push0)
    public func push() async {
        if pushing { pushAgain = true; return }
        pushing = true
        repeat { pushAgain = false; await push0() } while pushAgain
        pushing = false
    }

    private func push0() async {
        guard let u = await auth.currentUser(), mode != .off else { return }
        var meta = await store.loadMeta()
        if now() < meta.syncPausedUntil { return }
        set(.syncing)
        do {
            let doc = try await store.snapshot()
            let (docs, pending, hs) = Self.buildPush(doc, sent: sentHashes, now: now())
            if !docs.isEmpty { try await d1.push(docs: docs) }
            if !docs.isEmpty { meta = await store.loadMeta(); meta.pulledHashes[u.uid] = hs; await store.saveMeta(meta) }
            sentHashes.merge(pending) { $1 }   // only after the server committed
            dirty = false
            meta = await store.loadMeta(); meta.lastSync = now(); await store.saveMeta(meta)
            netN = 0; retryTask?.cancel(); retryTask = nil
            set(.ok)
        } catch {
            if case SyncError.quota(let retry) = error { await pause(retry); return }
            await netFail(error)
        }
    }

    /// The exact D1 push payload of web push0: 32 chunks by FNV bucket (sorted keys), unchanged chunks skipped by hash,
    /// meta `{ stats, game: {...game, questsDone: {}}, settings, settingsAt, deleted }` hashed with the chunk count.
    public static func buildPush(_ doc: SyncDoc, sent: [String: String], now: Double) -> (docs: [String: JSON], pending: [String: String], hs: [String: String]) {
        var parts = Array(repeating: [String: JSON](), count: SyncCodec.buckets)
        for (k, c) in doc.cards { parts[SyncCodec.bucketOf(k)][k] = SyncCodec.slim(c) }
        var out: [String: JSON] = [:], pending: [String: String] = [:]
        for i in 0..<SyncCodec.buckets {
            let json = JSON.object(parts[i]).stableString, h = SyncCodec.hash(json), k = "cards_\(i)"
            if sent[k] == h { continue }
            var d: JSON = ["h": .string(h), "body": .string(SyncCodec.docBody(json).stableString)]
            if parts[i].values.contains(where: { JSON.truthy($0["ctx"]) }) { d["x"] = 1 }
            out[k] = d; pending[k] = h
        }
        var hs: [String: String] = [:]
        for i in 0..<SyncCodec.buckets { let k = "cards_\(i)"; hs[k] = pending[k] ?? sent[k] ?? "" }
        let metaText = metaJSON(doc, now: now).stableString
        let mh = SyncCodec.hash(metaText + String(SyncCodec.buckets))
        if sent["meta"] != mh || !out.isEmpty {
            var body = SyncCodec.docBody(metaText).object ?? [:]
            body["chunks"] = .number(Double(SyncCodec.buckets)); body["updated"] = .number(now)
            body["hs"] = .object(hs.mapValues { .string($0) })
            out["meta"] = ["h": .string(mh), "body": .string(JSON.object(body).stableString)]
            pending["meta"] = mh
        }
        return (out, pending, hs)
    }
    static func metaJSON(_ doc: SyncDoc, now: Double) -> JSON {
        var game = JSON.spread(doc.game); game["questsDone"] = [:]
        return ["stats": doc.stats ?? SyncDoc.emptyStats, "game": .object(game), "settings": doc.settings ?? [:],
                "settingsAt": .number(doc.settingsAt), "deleted": .object(SyncMerge.pruneDeleted(doc.deleted, now: now).mapValues { .number($0) })]
    }

    /// Drive snapshot (web snapLocal): `{ v: 2, at, cards, deleted, stats, game: {...game, questsDone: {}} | null, settings, settingsAt }`
    public static func snapshotJSON(_ doc: SyncDoc, now: Double) -> JSON {
        var game: JSON = .null
        if let g = doc.game, g.truthy { var o = JSON.spread(g); o["questsDone"] = [:]; game = .object(o) }
        return ["v": 2, "at": .number(now), "cards": .object(doc.cards.mapValues(SyncCodec.slim)), "deleted": .object(SyncMerge.pruneDeleted(doc.deleted, now: now).mapValues { .number($0) }),
                "stats": doc.stats ?? SyncDoc.emptyStats, "game": game, "settings": doc.settings ?? [:], "settingsAt": .number(doc.settingsAt)]
    }
    /// `snapHash(s) = hash(stable({...s, at: 0}))`
    public static func snapHash(_ snap: JSON) -> String { var s = snap; s["at"] = 0; return SyncCodec.hash(s.stableString) }

    // MARK: Drive cycle (sync-drive.js once)
    public enum DriveResult: String, Sendable { case ok, wait, newer, noToken = "no-token", noScope = "no-scope", budget, retry }

    @discardableResult
    func driveRun(why: String) async -> DriveResult {
        guard let u = await auth.currentUser(), mode == .drive else { return .wait }
        set(.syncing)
        let r = await driveOnce(uid: u.uid, why: why)
        switch r {
        case .ok:
            dirty = false
            var meta = await store.loadMeta(); meta.lastSync = now(); await store.saveMeta(meta)
            set(.ok)
        case .noScope, .newer:
            mode = .d1; await pullMerge()          // Drive box unticked / file written by a newer app → D1 until updated
        default:
            set(.paused)
            if r == .retry {
                let st = (await store.loadMeta()).drive[u.uid] ?? DriveState()
                let wait = max(30e3, st.nextAt - now())
                retryTask?.cancel()
                retryTask = Task { [weak self] in try? await Task.sleep(nanoseconds: UInt64(wait * 1e6)); _ = await self?.driveRun(why: "retry") }
                if st.fail >= 5 && now() - st.d1SafeAt > 6 * 3600e3 {   // Drive keeps failing → one safety round through D1
                    var meta = await store.loadMeta(); var s2 = meta.drive[u.uid] ?? st; s2.d1SafeAt = now(); meta.drive[u.uid] = s2; await store.saveMeta(meta)
                    mode = .d1; await pullMerge(); mode = .drive
                }
            }
        }
        return r
    }

    func driveOnce(uid: String, why: String) async -> DriveResult {
        var meta = await store.loadMeta()
        var st = meta.drive[uid] ?? DriveState()
        func save() async { meta = await store.loadMeta(); meta.drive[uid] = st; await store.saveMeta(meta) }
        if st.nextAt > now() && why != "manual" { return .wait }
        if st.newer != 0 && why != "manual" { return .newer }
        guard let token = try? await auth.driveAccessToken(interactive: false), !token.isEmpty else { return .noToken }
        do {
            if st.listed == 0 { try await drive.list(&st, token: token) }
            var remoteVer = "", remoteHash = "", repair = false
            if st.pendingRestore != 0 { try await restore(&st, token: token); repair = true }
            if !st.fileId.isEmpty {
                do { remoteVer = try await drive.version(&st, token: token) }
                catch let e as DriveClient.DriveHTTPError where e.status == 404 { st.fileId = ""; st.ver = "" }  // file deleted in Drive › Manage apps → recreate
            }
            if !st.fileId.isEmpty && remoteVer != st.ver {
                do {
                    let snap = try SyncCodec.driveUnpack(try await drive.download(&st, id: st.fileId, token: token))
                    try await mergeIn(SyncDoc(json: snap)); remoteHash = Self.snapHash(snap); st.ver = remoteVer
                } catch SyncCodec.CodecError.newer(let v) {
                    st.newer = v; await save(); return .newer
                } catch is SyncCodec.CodecError {
                    if !st.fileId.isEmpty { try await drive.rename(&st, id: st.fileId, to: DriveClient.corrupt, token: token) }  // keep the broken file, never delete
                    st.fileId = ""; st.ver = ""; st.pendingRestore = 1; await save()
                    try await restore(&st, token: token); repair = true
                }
            }
            st.newer = 0
            let snap = Self.snapshotJSON(try await store.snapshot(), now: now()), h = Self.snapHash(snap)
            if h == remoteHash { st.hash = h }
            if repair || st.fileId.isEmpty || h != st.hash {
                let body = SyncCodec.drivePack(snap)
                do {
                    let w = try await drive.write(&st, id: st.fileId, name: DriveClient.name, body: body, token: token)
                    st.fileId = w.id; st.ver = w.version; st.hash = h
                } catch let e as DriveClient.PartialWrite {
                    if let id = e.id { st.fileId = id; st.ver = "partial" }
                    throw e
                }
                let today = ISO8601DateFormatter.day(Date(timeIntervalSince1970: now() / 1000))
                if st.bakDay != today {   // rotating daily backups bak0..2
                    let slot = String(Int(floor(now() / 864e5)) % DriveClient.nbak)
                    do { let b = try await drive.write(&st, id: st.bak[slot] ?? "", name: DriveClient.bak(Int(slot)!), body: body, token: token); st.bak[slot] = b.id; st.bakDay = today }
                    catch let e as DriveClient.DriveHTTPError where e.status == 401 { throw e }
                    catch {}
                }
            }
            st.fail = 0; st.nextAt = 0; st.okAt = now(); st.scope = "ok"
            await save()
            return .ok
        } catch is DriveClient.Budget {
            await save(); return .budget
        } catch let e as DriveClient.DriveHTTPError where e.status == 401 {
            await save(); return .noToken
        } catch let e as DriveClient.DriveHTTPError where e.status == 403 && e.reason.range(of: "insufficient|PERMISSION_DENIED", options: [.regularExpression, .caseInsensitive]) != nil {
            st.scope = "no"; await save(); return .noScope
        } catch {
            st.fail += 1
            let backoff: Double = min(6 * 3600e3, 30e3 * pow(2.0, Double(max(0, st.fail - 1))))
            let jitter: Double = 0.75 + random() * 0.5
            st.nextAt = now() + backoff * jitter
            await save()
            return .retry
        }
    }

    /// Merge every readable backup (merge is commutative + idempotent → merging all is safe).
    private func restore(_ st: inout DriveState, token: String) async throws {
        for (i, id) in st.bak.sorted(by: { $0.key < $1.key }) {
            do { try await mergeIn(SyncDoc(json: try SyncCodec.driveUnpack(try await drive.download(&st, id: id, token: token)))) }
            catch let e as DriveClient.DriveHTTPError where e.status == 404 { st.bak[i] = nil }
            catch is SyncCodec.CodecError { continue }
        }
        st.pendingRestore = 0
    }

    // MARK: failure handling
    private func pause(_ retry: Double) async {
        var meta = await store.loadMeta()
        meta.syncPausedUntil = now() + Self.pauseMs(retry, rnd: random())
        await store.saveMeta(meta)
        set(.paused)
    }
    /// `pauseMs`: until the D1 quota resets (+1–21 min spread), else 6 h.
    public static func pauseMs(_ retry: Double, rnd: Double) -> Double {
        retry > 0 ? min(6 * 3600e3, (retry + 60 + rnd * 1200) * 1000) : 6 * 3600e3
    }
    private func netFail(_ e: Error) async {
        crash?.log("sync: \(e)")
        retryLater()
        // offline → "paused – data is still on this device"; anything else is reported, still retried with back-off
        if e is URLError { set(.paused) } else { set(.error(String(describing: e))) }
    }
    private func retryLater() {
        guard retryTask == nil, mode == .d1 else { return }
        let ms: Double = min(600_000.0, 30_000.0 * pow(2.0, Double(netN))); netN += 1
        retryTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(ms * 1e6))
            await self?.retryFire()
        }
    }
    private func retryFire() async {
        retryTask = nil
        if needPull { await pullMerge() } else { await push() }
    }
}
