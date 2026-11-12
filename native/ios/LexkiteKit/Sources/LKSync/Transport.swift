import Foundation
import LKCore

/// Minimal HTTP seam so transports are testable with a fake server (scripts/test/sync-cross-client.mjs scenarios, XCTest fakes).
public protocol LKHTTP: Sendable {
    func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse)
}

public struct URLSessionHTTP: LKHTTP {
    let session: URLSession
    public init(session: URLSession = .shared) { self.session = session }
    public func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) {
        let (d, r) = try await session.data(for: request)
        guard let h = r as? HTTPURLResponse else { throw SyncError.http(0) }
        return (d, h)
    }
}

public enum SyncError: Error, Equatable, Sendable {
    case http(Int)
    case quota(retry: Double)      // D1 daily quota → pause, data stays on device
    case tooFast(wait: Double)
    case busy                      // server 409 after 3 conflicting writes – retry next round
    case blocked                   // account sync blocked by admin
    case auth
    case decode
}

/// Endpoints and cadence – same values as web/js/firebase-config.js `LK_SYNC` and the live app.
public struct SyncConfig: Sendable {
    public var syncURL = URL(string: "https://lexkite.com/api/sync")!
    public var accountURL = URL(string: "https://lexkite.com/api/account")!
    /// `LK_SYNC.mode`: auto | off
    public var enabled = true
    /// Drive appDataFolder as primary store (flag `sync_drive_enabled`, native/shared/flags.json); Google accounts only.
    public var driveOnNative = FlagDefaults.syncDriveEnabled
    /// D1 /api/sync fallback allowed (flag `sync_d1_fallback`)
    public var d1Fallback = FlagDefaults.syncD1Fallback
    /// `LK_SYNC.d1Every` / flag `sync_push_every_ms` (batch writes; push immediately when the app goes to background)
    public var d1Every: TimeInterval = Double(FlagDefaults.syncPushEveryMs) / 1000
    /// `LK_SYNC.every` (Drive batch)
    public var driveEvery: TimeInterval = Double(FlagDefaults.syncPushEveryMs) / 1000
    /// Apply Remote Config values (generated keys) on top of the safe defaults.
    public mutating func apply(_ rc: LKRemoteConfig) {
        driveOnNative = rc.bool(.syncDriveEnabled); d1Fallback = rc.bool(.syncD1Fallback)
        d1Every = Double(rc.int(.syncPushEveryMs)) / 1000; driveEvery = d1Every
    }
    /// Drive per-device daily API budget `LK_SYNC.cap`, renew limits, staleness – sync-drive.js cfg()
    public var driveCap = 1200, staleMs: Double = 12 * 3600e3, bridgeDays: Double = 30
    /// Server's platform bucket (functions/api/sync.js maps capacitor://localhost → 'ios'); also allowed by its CORS list.
    public var origin = "capacitor://localhost"
    public init() {}
}

// MARK: - D1 /api/sync

/// `{ op: 'pull', have }` → `{ docs }` and `{ op: 'push', docs }` → `{ ok }` exactly like web/js/sync.js api().
public struct D1Client: Sendable {
    let http: LKHTTP, auth: LKAuth, config: SyncConfig
    let sleep: @Sendable (Double) async throws -> Void
    public init(http: LKHTTP, auth: LKAuth, config: SyncConfig, sleep: @escaping @Sendable (Double) async throws -> Void = { try await Task.sleep(nanoseconds: UInt64($0 * 1e9)) }) {
        self.http = http; self.auth = auth; self.config = config; self.sleep = sleep
    }

    public func pull(have: [String: String]) async throws -> [String: JSON] {
        let r = try await call(["op": "pull", "have": .object(have.mapValues { .string($0) })])
        return r["docs"]?.object ?? [:]
    }
    public func push(docs: [String: JSON]) async throws {
        _ = try await call(["op": "push", "docs": .object(docs)])
    }

    func call(_ body: JSON, tries: Int = 0) async throws -> JSON {
        var rq = URLRequest(url: config.syncURL)
        rq.httpMethod = "POST"
        rq.setValue("application/json", forHTTPHeaderField: "Content-Type")
        rq.setValue(config.origin, forHTTPHeaderField: "Origin")
        rq.setValue("Bearer " + (try await auth.idToken(forceRefresh: false)), forHTTPHeaderField: "Authorization")
        rq.httpBody = body.data
        rq.timeoutInterval = 60
        let (d, res) = try await http.send(rq)
        let j = (try? JSON.parse(d)) ?? [:]
        switch res.statusCode {
        case 200..<300: return j
        case 429:
            let err = j["error"]?.string, msg = j["msg"]?.string
            if (err == "too-fast" || msg == "quota.burst") && tries < 2 {
                let w = JSON.truthy(j["wait"]) ? JSON.num(j["wait"]) : 5
                try await sleep(min(30, (w.isNaN ? 5 : w) + 1))
                return try await call(body, tries: tries + 1)
            }
            let retry = JSON.num(j["retry"])
            throw SyncError.quota(retry: retry.isNaN ? 0 : retry)
        case 401: throw SyncError.auth
        case 403 where j["error"]?.string == "blocked": throw SyncError.blocked
        case 409: throw SyncError.busy
        default: throw SyncError.http(res.statusCode)
        }
    }
}

// MARK: - /api/account (delete)

public struct AccountClient: Sendable {
    let http: LKHTTP, config: SyncConfig
    public init(http: LKHTTP, config: SyncConfig) { self.http = http; self.config = config }
    /// `{ op: 'delete', confirm: 'DELETE' }` → `{ ok, firebase?: 'deleted' }` or `{ error: 'reauth' }`
    public func delete(token: String) async throws -> JSON {
        var rq = URLRequest(url: config.accountURL)
        rq.httpMethod = "POST"
        rq.setValue("application/json", forHTTPHeaderField: "Content-Type")
        rq.setValue(config.origin, forHTTPHeaderField: "Origin")
        rq.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        rq.httpBody = (["op": "delete", "confirm": "DELETE"] as JSON).data
        let (d, res) = try await http.send(rq)
        var j = (try? JSON.parse(d)) ?? [:]
        j["status"] = .number(Double(res.statusCode))
        return j
    }
}

// MARK: - Google Drive appDataFolder (web/js/sync-drive.js)

/// Per-account Drive sync state, same fields as sync-drive.js `load()`.
public struct DriveState: Codable, Sendable, Equatable {
    public var fileId = "", ver = "", hash = "", day = ""
    public var units = 0, fail = 0, renews = 0
    public var nextAt: Double = 0, okAt: Double = 0, at: Double = 0, lastD1: Double = 0, d1SafeAt: Double = 0
    public var on = 0, listed = 0, newer = 0, pendingRestore = 0, d1Had = 0
    public var bak: [String: String] = [:]
    public var bakDay = "", scope = ""
    public init() {}
}

public struct DriveClient: Sendable {
    public static let scope = "https://www.googleapis.com/auth/drive.appdata"
    public static let name = "lexkite-sync.v2.json.gz", corrupt = "lexkite-sync.corrupt.json.gz", prefix = "lexkite-sync", nbak = 3
    public static func bak(_ i: Int) -> String { "lexkite-sync.bak\(i).v2.json.gz" }
    /// developers.google.com/workspace/drive/api/guides/limits – same weights as web
    public static let cost = ["list": 100, "get": 5, "download": 200, "create": 50, "update": 50, "delete": 50]
    static let files = "https://www.googleapis.com/drive/v3/files", upload = "https://www.googleapis.com/upload/drive/v3/files"

    public struct DriveHTTPError: Error, Equatable { public let status: Int; public let reason: String }
    public struct Budget: Error, Equatable {}
    public struct PartialWrite: Error, Equatable { public let id: String? }

    let http: LKHTTP, cap: Int
    let today: @Sendable () -> String
    public init(http: LKHTTP, cap: Int, today: @escaping @Sendable () -> String = { ISO8601DateFormatter.day(Date()) }) { self.http = http; self.cap = cap; self.today = today }

    func spend(_ st: inout DriveState, _ op: String) throws {
        if st.day != today() { st.day = today(); st.units = 0; st.renews = 0 }
        let c = Self.cost[op] ?? 0
        if st.units + c > cap { throw Budget() }
        st.units += c
    }

    func call(_ url: String, method: String = "GET", headers: [String: String] = [:], body: Data? = nil, token: String) async throws -> Data {
        var rq = URLRequest(url: URL(string: url)!)
        rq.httpMethod = method
        for (k, v) in headers { rq.setValue(v, forHTTPHeaderField: k) }
        rq.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        rq.httpBody = body
        let (d, r) = try await http.send(rq)
        if (200..<300).contains(r.statusCode) { return d }
        let j = try? JSON.parse(d)
        let reason = j?["error"]?["errors"]?.array?.first?["reason"]?.string ?? j?["error"]?["status"]?.string ?? ""
        throw DriveHTTPError(status: r.statusCode, reason: reason)
    }

    public func list(_ st: inout DriveState, token: String) async throws {
        try spend(&st, "list")
        let q = "name contains '\(Self.prefix)' and trashed=false".addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? ""
        let j = try JSON.parse(try await call("\(Self.files)?spaces=appDataFolder&q=\(q)&fields=files(id,name,version)&pageSize=50", token: token))
        let fs = j["files"]?.array ?? []
        let main = fs.filter { $0["name"]?.string == Self.name }.max { JSON.num($0["version"]) < JSON.num($1["version"]) }
        st.fileId = main?["id"]?.string ?? ""; st.ver = ""; st.bak = [:]
        for i in 0..<Self.nbak { if let f = fs.first(where: { $0["name"]?.string == Self.bak(i) }), let id = f["id"]?.string { st.bak[String(i)] = id } }
        st.listed = 1
    }
    public func version(_ st: inout DriveState, token: String) async throws -> String {
        try spend(&st, "get")
        let j = try JSON.parse(try await call("\(Self.files)/\(st.fileId)?fields=version", token: token))
        return j["version"].map { $0.string ?? $0.jsToString } ?? ""
    }
    public func download(_ st: inout DriveState, id: String, token: String) async throws -> Data {
        try spend(&st, "download")
        return try await call("\(Self.files)/\(id)?alt=media", token: token)
    }
    /// Write + verify (Drive returns the stored size; a mismatch = partial write → error, next round repairs).
    public func write(_ st: inout DriveState, id: String, name: String, body: Data, token: String) async throws -> (id: String, version: String) {
        let d: Data
        if !id.isEmpty {
            try spend(&st, "update")
            d = try await call("\(Self.upload)/\(id)?uploadType=media&fields=id,version,size", method: "PATCH", headers: ["Content-Type": "application/gzip"], body: body, token: token)
        } else {
            try spend(&st, "create")
            let b = "lk" + UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased().prefix(11)
            let meta = (["name": .string(name), "parents": ["appDataFolder"], "mimeType": "application/gzip"] as JSON).stableString
            var mp = Data("--\(b)\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n\(meta)\r\n--\(b)\r\nContent-Type: application/gzip\r\n\r\n".utf8)
            mp.append(body); mp.append(Data("\r\n--\(b)--".utf8))
            d = try await call("\(Self.upload)?uploadType=multipart&fields=id,version,size", method: "POST", headers: ["Content-Type": "multipart/related; boundary=\(b)"], body: mp, token: token)
        }
        let j = try? JSON.parse(d)
        guard let fid = j?["id"]?.string else { throw PartialWrite(id: nil) }
        if let s = j?["size"], s != .null, Int(JSON.num(s)) != body.count { throw PartialWrite(id: fid) }
        return (fid, j?["version"].map { $0.string ?? $0.jsToString } ?? "")
    }
    public func rename(_ st: inout DriveState, id: String, to name: String, token: String) async throws {
        try spend(&st, "update")
        _ = try await call("\(Self.files)/\(id)?fields=id", method: "PATCH", headers: ["Content-Type": "application/json"], body: (["name": .string(name)] as JSON).data, token: token)
    }
    /// Account deletion: remove every sync file (best effort).
    public func wipe(token: String) async {
        let q = "name contains '\(Self.prefix)'".addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? ""
        guard let d = try? await call("\(Self.files)?spaces=appDataFolder&q=\(q)&fields=files(id)&pageSize=50", token: token), let j = try? JSON.parse(d) else { return }
        for f in j["files"]?.array ?? [] { if let id = f["id"]?.string { _ = try? await call("\(Self.files)/\(id)", method: "DELETE", token: token) } }
    }
}

extension ISO8601DateFormatter {
    /// `new Date().toISOString().slice(0, 10)` (UTC day)
    public static func day(_ d: Date) -> String {
        let f = ISO8601DateFormatter(); f.formatOptions = [.withFullDate]; f.timeZone = TimeZone(identifier: "UTC")
        return f.string(from: d)
    }
}
