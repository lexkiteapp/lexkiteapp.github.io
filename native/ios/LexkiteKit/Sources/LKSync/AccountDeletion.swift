import Foundation

/// Account deletion (App Store 5.1.1(v), Google Play account deletion) – the flow of web/js/account-delete.js:
/// Apple accounts re-authenticate first (fresh authorization code → token revoked), POST /api/account { op: 'delete' },
/// server answers `reauth` (login older than 10 min) → re-authenticate once and retry, delete the Firebase user if the server could not,
/// wipe the Drive appDataFolder copy (best effort), stop sync, optionally clear this device's study data.
public struct AccountDeletion: Sendable {
    public enum Step: Sendable, Equatable { case reauth, deleting, done }
    let auth: LKAuth, client: AccountClient, drive: DriveClient, engine: SyncEngine, store: SyncLocalStore

    public init(auth: LKAuth, http: LKHTTP = URLSessionHTTP(), config: SyncConfig = SyncConfig(), engine: SyncEngine, store: SyncLocalStore) {
        self.auth = auth; client = AccountClient(http: http, config: config); drive = DriveClient(http: http, cap: config.driveCap)
        self.engine = engine; self.store = store
    }

    public func run(wipeLocal: Bool, progress: @escaping @Sendable (Step) async -> Void) async throws {
        guard let u = await auth.currentUser() else { throw LKAuthError.notSignedIn }
        if u.isApple { await progress(.reauth); _ = try await auth.reauthenticate(); await progress(.deleting) }
        else { await progress(.deleting) }
        var res = try await client.delete(token: try await auth.idToken(forceRefresh: false))
        if res["error"]?.string == "reauth" {
            await progress(.reauth)
            res = try await client.delete(token: try await auth.reauthenticate())
            await progress(.deleting)
        }
        guard res["ok"]?.truthy == true else { throw LKAuthError.failed(res["error"]?.string ?? "server") }
        if res["firebase"]?.string != "deleted" {
            do { try await auth.deleteUser() }
            catch LKAuthError.requiresRecentLogin { _ = try await auth.reauthenticate(); try await auth.deleteUser() }
        }
        if let t = try? await auth.driveAccessToken(interactive: false), !t.isEmpty { await drive.wipe(token: t) }
        await engine.signedOut()
        var meta = await store.loadMeta(); meta.drive[u.uid] = nil; meta.pulledHashes[u.uid] = nil; await store.saveMeta(meta)
        if wipeLocal {
            try await store.mutate { d in d.cards = [:]; d.stats = SyncDoc.emptyStats; d.game = nil }
        }
        try? await auth.signOut()
        await progress(.done)
    }
}
