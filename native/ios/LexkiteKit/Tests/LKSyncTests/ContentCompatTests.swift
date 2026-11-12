import XCTest
@testable import LKSync
import LKCore

/// Signed server content (§4 "updates without store review"): the Swift reader must give exactly the result of the reference reader
/// (scripts/native/content-schema.mjs) for every case of vectors/compat.json – new app reads old JSON, old app reads new JSON,
/// unknown fields ignored, missing/wrong fields → defaults, unknown components skipped, bad signature / tampering / code refused.
final class ContentCompatTests: XCTestCase {
    lazy var v: JSON = (try? Vectors.load("compat.json")) ?? .null

    func apps() -> [String: SignedContent.AppSchema] {
        var out: [String: SignedContent.AppSchema] = [:]
        for (ver, a) in v["apps"]?.object ?? [:] {
            out[ver] = SignedContent.AppSchema(maxSchema: (a["maxSchema"]?.object ?? [:]).mapValues { Int(JSON.num($0)) },
                                               blocks: (a["blocks"]?.array ?? []).compactMap(\.string))
        }
        return out
    }

    func testAllCompatCases() throws {
        let key = try XCTUnwrap(Data(base64Encoded: v["testKeySpki"]?.string ?? ""), "testKeySpki")
        let apps = apps()
        let cases = v["cases"]?.array ?? []
        XCTAssertGreaterThanOrEqual(cases.count, 20)
        for c in cases {
            let name = "\(c["name"]?.string ?? "?") @\(c["app"]?.string ?? "?")"
            guard let ver = c["app"]?.string, let app = apps[ver], let doc = c["doc"]?.string, let exp = c["expect"] else { XCTFail("bad case \(name)"); continue }
            let r = SignedContent.read(doc, app: app, appVersion: ver, publicKeySPKI: key)
            XCTAssertEqual(r.ok, exp["ok"]?.truthy ?? false, name)
            if let reason = exp["reason"]?.string { XCTAssertEqual(r.reason?.rawValue, reason, name) }
            if exp["ok"]?.truthy == true {
                XCTAssertEqual(r.schemaNewer, exp["schemaNewer"]?.truthy ?? false, name)
                if let d = jsonDiff(r.value, exp["value"]) { XCTFail("\(name): \(d)") }
            }
        }
    }

    /// The build's own snapshot must equal the shipped 2.0.0 snapshot in the vectors (append-only history).
    func testThisBuildSnapshotMatchesShipped() {
        XCTAssertEqual(apps()[SignedContent.thisVersion], SignedContent.thisBuild)
    }

    func testTodayModuleOrder() {
        XCTAssertEqual(TodayModule.order(from: nil), TodayModule.webOrder)
        let doc: JSON = ["blocks": [["type": "review"], ["type": "streak"], ["type": "unknown"]]]
        let o = TodayModule.order(from: doc)
        XCTAssertEqual(Array(o.prefix(2)), [.review, .streak])
        XCTAssertEqual(Set(o), Set(TodayModule.allCases), "no section is ever dropped")
    }

    func testRemoteConfigDefaultsAndBounds() {
        let rc = DefaultRemoteConfig([.syncPushEveryMs: 5, .adsEnabled: true])
        XCTAssertEqual(rc.int(.syncPushEveryMs), 600_000, "out of range → safe default")
        XCTAssertTrue(rc.bool(.adsEnabled))
        XCTAssertFalse(DefaultRemoteConfig().bool(.adsEnabled))
        XCTAssertEqual(DefaultRemoteConfig().string(.minSupportedApp), "2.0.0")
        var cfg = SyncConfig(); cfg.apply(DefaultRemoteConfig([.syncDriveEnabled: false]))
        XCTAssertFalse(cfg.driveOnNative)
        XCTAssertEqual(cfg.d1Every, 600)
    }
}
