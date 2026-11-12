import XCTest
@testable import LKSync

/// Fake signed-in account (no Firebase, no network).
final class FakeAuth: LKAuth, @unchecked Sendable {
    var user: LKUser?
    init(_ uid: String? = "uid-test-1", providers: [String] = ["apple.com"]) { user = uid.map { LKUser(uid: $0, providers: providers) } }
    func currentUser() async -> LKUser? { user }
    func userChanges() -> AsyncStream<LKUser?> { let u = user; return AsyncStream { $0.yield(u); $0.finish() } }
    @MainActor func signIn(_ method: LKSignInMethod) async throws -> LKUser { throw LKAuthError.cancelled }
    func signOut() async throws { user = nil }
    func idToken(forceRefresh: Bool) async throws -> String { guard user != nil else { throw LKAuthError.notSignedIn }; return "test-token" }
    func driveAccessToken(interactive: Bool) async throws -> String? { nil }
    @MainActor func reauthenticate() async throws -> String { "test-token-2" }
    func deleteUser() async throws { user = nil }
}

/// In-memory /api/sync with the semantics of functions/api/sync.js (docs keyed meta / cards_N, pull returns only docs whose hash differs).
actor FakeD1: LKHTTP {
    var docs: [String: (h: String, body: String)] = [:]
    var pulls = 0, pushes = 0
    var queue: [(Int, JSON)] = []   // scripted responses first (status, body)
    func script(_ status: Int, _ body: JSON) { queue.append((status, body)) }
    nonisolated func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) { try await handle(request) }
    func handle(_ r: URLRequest) throws -> (Data, HTTPURLResponse) {
        func res(_ s: Int, _ j: JSON) -> (Data, HTTPURLResponse) { (j.data, HTTPURLResponse(url: r.url!, statusCode: s, httpVersion: nil, headerFields: nil)!) }
        XCTAssertEqual(r.value(forHTTPHeaderField: "Authorization"), "Bearer test-token")
        if !queue.isEmpty { let (s, j) = queue.removeFirst(); return res(s, j) }
        let body = try JSON.parse(r.httpBody ?? Data())
        switch body["op"]?.string {
        case "pull":
            pulls += 1
            let have = body["have"]?.object ?? [:]
            var out: [String: JSON] = [:]
            for (k, d) in docs where have[k]?.string != d.h { out[k] = try JSON.parse(d.body) }
            return res(200, ["docs": .object(out)])
        case "push":
            pushes += 1
            for (k, d) in body["docs"]?.object ?? [:] { docs[k] = (d["h"]!.string!, d["body"]!.string!) }
            return res(200, ["ok": true])
        default: return res(400, ["error": "op"])
        }
    }
    /// The account Doc the server holds, decoded like a client would.
    func accountCards() throws -> [String: JSON] {
        var cards: [String: JSON] = [:]
        for (k, d) in docs where k.hasPrefix("cards_") {
            let txt = try SyncCodec.docText(try JSON.parse(d.body))
            for (w, c) in try JSON.parse(txt.isEmpty ? "{}" : txt).object ?? [:] { cards[w] = c }
        }
        return cards
    }
}

final class SyncEngineTests: XCTestCase {
    let t0: Double = 1_772_366_400_000
    func card(_ w: String, mod: Double, note: String = "") -> JSON {
        ["word": .string(w), "added": .number(mod - 1000), "mod": .number(mod), "note": .string(note),
         "srs": ["ef": 2.5, "interval": 0, "reps": 0, "lapses": 0, "due": .number(mod), "last": .null, "step": 0]]
    }
    func engine(_ store: MemoryStore, _ http: FakeD1, auth: FakeAuth = FakeAuth(), now: Double? = nil, ask: @escaping SyncEngine.AccountSwitch = { _, _ in true }) -> SyncEngine {
        var cfg = SyncConfig(); cfg.driveOnNative = false
        let n = now ?? t0
        return SyncEngine(auth: auth, store: store, config: cfg, http: http, now: { n }, random: { 0.5 }, sleep: { _ in }, accountSwitch: ask)
    }

    /// Two devices through the same D1 account: edits on A reach B, B's later edit + delete reach A; nothing lost, no duplicate writes.
    func testTwoDevicesThroughD1() async throws {
        let server = FakeD1()
        let a = MemoryStore(SyncDoc(cards: ["alpha": card("alpha", mod: t0 - 5000)], stats: SyncDoc.emptyStats))
        let b = MemoryStore(SyncDoc(cards: ["beta": card("beta", mod: t0 - 4000)], stats: SyncDoc.emptyStats))
        let ea = engine(a, server), eb = engine(b, server)
        await ea.start()
        await eb.start()
        await ea.pullMerge()
        let da = try await a.snapshot(), db = try await b.snapshot()
        XCTAssertEqual(Set(da.cards.keys), ["alpha", "beta"])
        XCTAssertEqual(Set(db.cards.keys), ["alpha", "beta"])
        // B edits alpha later and deletes beta
        try await b.mutate { d in d.cards["alpha"] = self.card("alpha", mod: self.t0 - 100, note: "B wins"); d.cards["beta"] = nil; d.deleted["beta"] = self.t0 - 50 }
        await eb.push()
        await ea.pullMerge()
        let a2 = try await a.snapshot()
        XCTAssertEqual(a2.cards["alpha"]?["note"], "B wins")
        XCTAssertNil(a2.cards["beta"], "tombstone from B removes the card on A")
        XCTAssertEqual(a2.deleted["beta"], t0 - 50)
        let acct = try await server.accountCards()
        XCTAssertEqual(Set(acct.keys), ["alpha"])
        // an unchanged round sends nothing new for the cards
        await ea.push()
        let docsAfter = await server.docs.count
        XCTAssertEqual(docsAfter, 33, "meta + 32 chunks")
    }

    /// Daily D1 quota (429 quota) pauses sync until the reset (+ spread) and keeps all data local.
    func testQuotaPausesSync() async throws {
        let server = FakeD1()
        await server.script(429, ["error": "quota", "retry": 3600])
        let s = MemoryStore(SyncDoc(cards: ["x": card("x", mod: t0)], stats: SyncDoc.emptyStats))
        let e = engine(s, server)
        await e.pullMerge()
        let m = await s.loadMeta()
        XCTAssertEqual(m.syncPausedUntil, t0 + SyncEngine.pauseMs(3600, rnd: 0.5))
        XCTAssertEqual(SyncEngine.pauseMs(3600, rnd: 0.5), (3600 + 60 + 600) * 1000)
        XCTAssertEqual(SyncEngine.pauseMs(0, rnd: 0.9), 6 * 3600e3)
        let st = await e.status
        XCTAssertEqual(st, .paused)
        let pulls = await server.pulls
        await e.pullMerge()                    // still paused → no request
        let pulls2 = await server.pulls
        XCTAssertEqual(pulls2, pulls)
        let kept = try await s.snapshot().cards["x"]
        XCTAssertNotNil(kept)
    }

    /// 429 too-fast is retried (up to 2×) instead of failing.
    func testTooFastIsRetried() async throws {
        let server = FakeD1()
        await server.script(429, ["error": "too-fast", "wait": 1])
        let e = engine(MemoryStore(SyncDoc(stats: SyncDoc.emptyStats)), server)
        await e.pullMerge()
        let pulls = await server.pulls, st = await e.status
        XCTAssertEqual(pulls, 1)
        XCTAssertEqual(st, .ok)
    }

    /// Signing into another account with local data asks first; "use only this account" backs the old data up and clears it.
    func testAccountSwitchReplaceKeepsBackup() async throws {
        let server = FakeD1()
        let s = MemoryStore(SyncDoc(cards: ["mine": card("mine", mod: t0)], stats: SyncDoc.emptyStats))
        var m = SyncMetaState(); m.lastUid = "old-uid"; await s.saveMeta(m)
        let asked = Box()
        let e = engine(s, server, ask: { old, new in asked.v = "\(old)>\(new)"; return false })
        await e.pullMerge()
        XCTAssertEqual(asked.v, "old-uid>uid-test-1")
        let now = try await s.snapshot().cards["mine"], backup = await s.backup?.doc.cards["mine"], last = await s.loadMeta().lastUid
        XCTAssertNil(now)
        XCTAssertNotNil(backup, "old account data kept as backup")
        XCTAssertEqual(last, "uid-test-1")
    }

    /// Guest (no account): the engine never calls the network.
    func testGuestNeverSyncs() async throws {
        let server = FakeD1()
        let e = engine(MemoryStore(), server, auth: FakeAuth(nil))
        await e.start(); await e.push(); await e.pullMerge()
        let pulls = await server.pulls, pushes = await server.pushes
        XCTAssertEqual(pulls, 0); XCTAssertEqual(pushes, 0)
    }
}

final class Box: @unchecked Sendable { var v = "" }
