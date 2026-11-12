import Foundation
import LKCore

/// Keeps the last VALID signed content document per type ("today", "modules", "banner") on disk and refreshes it from the CDN.
/// A downloaded document is cached only after it verifies (SignedContent.read); a bad one never replaces the cache. The cache is re-verified
/// on every read (a tampered file on disk is ignored). No key / no URL / flag off → nothing remote: the bundled defaults apply.
public actor ContentStore {
    public struct Config: Sendable {
        /// SPKI (base64) of the content signing key = web/js/ota-key.js LK_OTA_KEY (empty → every document rejected, safe default)
        public var publicKeySPKI: String
        /// e.g. https://lexkite.com/native/content/ – `<type>.json` is fetched below it
        public var baseURL: URL?
        public var app: SignedContent.AppSchema = SignedContent.thisBuild
        public var appVersion = SignedContent.thisVersion
        public init(publicKeySPKI: String, baseURL: URL?) { self.publicKeySPKI = publicKeySPKI; self.baseURL = baseURL }
    }
    let config: Config, dir: URL, http: LKHTTP, remote: LKRemoteConfig
    public init(config: Config, dir: URL, http: LKHTTP = URLSessionHTTP(), remote: LKRemoteConfig) {
        self.config = config; self.dir = dir; self.http = http; self.remote = remote
    }
    var key: Data { Data(base64Encoded: config.publicKeySPKI) ?? Data() }
    func file(_ type: String) -> URL { dir.appendingPathComponent("content-\(type).json") }

    public func cached(_ type: String) -> SignedContent.Result? {
        guard let d = try? Data(contentsOf: file(type)), let s = String(data: d, encoding: .utf8) else { return nil }
        let r = SignedContent.read(s, app: config.app, appVersion: config.appVersion, publicKeySPKI: key)
        return r.ok && r.type == type ? r : nil
    }

    /// Fetch + verify + cache. Returns the document now in effect (new if valid, else the previous cache, else nil).
    @discardableResult
    public func refresh(_ type: String) async -> SignedContent.Result? {
        guard remote.bool(.contentRemoteEnabled), let base = config.baseURL, !key.isEmpty else { return cached(type) }
        var rq = URLRequest(url: base.appendingPathComponent("\(type).json"))
        rq.cachePolicy = .reloadRevalidatingCacheData
        rq.timeoutInterval = 20
        guard let (d, res) = try? await http.send(rq), res.statusCode == 200, let s = String(data: d, encoding: .utf8) else { return cached(type) }
        let r = SignedContent.read(s, app: config.app, appVersion: config.appVersion, publicKeySPKI: key)
        guard r.ok, r.type == type else { return cached(type) }   // badsig / corrupt / minApp → keep last valid cache
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        try? d.write(to: file(type), options: .atomic)
        return r
    }
}
