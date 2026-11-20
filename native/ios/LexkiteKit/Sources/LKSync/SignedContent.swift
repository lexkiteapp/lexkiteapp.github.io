import Foundation
import CryptoKit
import LKCore

/// Server-driven content WITHOUT store review (docs/specs/native-apps.md §4): Today config, module order, banners as signed JSON data,
/// rendered only with native components already in the app – never code. Port of the reference reader `read()` in
/// scripts/native/content-schema.mjs, verified against native/shared/gen/vectors/compat.json:
/// ECDSA P-256 / SHA-256 (raw r‖s, base64) over `["lexkite-content-v1", type, schema, minApp, version, sha256hex(stable(body))].join("\n")`,
/// same key as web OTA (web/js/ota-key.js). Bad signature / broken JSON / minApp too new → rejected (caller keeps the last cache or the
/// starter pack); unknown fields ignored; missing or wrong-typed fields → defaults; unknown block types skipped.
public enum SignedContent {
    public static let kind = "lexkite-content-v1"

    /// What one app build understands (append-only snapshots, like `APPS` in content-schema.mjs).
    public struct AppSchema: Sendable, Equatable {
        public var maxSchema: [String: Int]
        public var blocks: [String]
        public init(maxSchema: [String: Int], blocks: [String]) { self.maxSchema = maxSchema; self.blocks = blocks }
    }
    /// This build (2.0.0): the four Today blocks it renders natively.
    public static let thisBuild = AppSchema(maxSchema: ["today": 1, "modules": 1, "banner": 1], blocks: ["streak", "goal", "continue", "review"])
    public static let thisVersion = "2.0.0"

    public enum Reason: String, Sendable { case corrupt, kind, type, badsig, minApp }
    public struct Result: Sendable, Equatable {
        public var ok: Bool, reason: Reason?, schemaNewer = false, value: JSON?, type: String?, version: String?
    }

    enum F { case string(String), int(Int), bool(Bool), strings([String]), blocks }
    static let fields: [String: [(String, F)]] = [
        "today": [("greetingKey", .string("home.greeting")), ("blocks", .blocks), ("maxBlocks", .int(8))],
        "modules": [("order", .strings(["home", "vocab", "skills", "tests", "me"])), ("hidden", .strings([]))],
        "banner": [("id", .string("")), ("kind", .string("info")), ("titleKey", .string("")), ("bodyKey", .string("")), ("route", .string("")),
                   ("from", .int(0)), ("to", .int(0)), ("priority", .int(0)), ("dismissible", .bool(true))],
    ]
    static let blockCommon: [(String, F)] = [("id", .string("")), ("type", .string("")), ("titleKey", .string("")), ("route", .string(""))]
    static let blockExtra: [String: [(String, F)]] = ["word": [("word", .string(""))], "banner": [("bannerId", .string(""))], "goal": [("target", .int(20))]]

    static func coerce(_ f: F, _ v: JSON?) -> JSON {
        switch f {
        case .string(let d): if case .string(let s)? = v { return .string(s) }; return .string(d)
        case .int(let d): if case .number(let n)? = v, n.isFinite, n.rounded() == n { return .number(n) }; return .number(Double(d))
        case .bool(let d): if case .bool(let b)? = v { return .bool(b) }; return .bool(d)
        case .strings(let d):
            if case .array(let a)? = v, a.allSatisfy({ $0.string != nil }) { return .array(a) }
            return .array(d.map { .string($0) })
        case .blocks: return .array([])
        }
    }

    static func model(_ type: String, _ body: JSON, _ app: AppSchema) -> JSON {
        var out: [String: JSON] = [:]
        for (k, f) in fields[type] ?? [] {
            guard case .blocks = f else { out[k] = coerce(f, body[k]); continue }
            let list = body[k]?.array ?? []
            out[k] = .array(list.compactMap { b -> JSON? in
                guard b.isObject, let t = b["type"]?.string, app.blocks.contains(t) else { return nil }
                var o: [String: JSON] = [:]
                for (bk, bf) in blockCommon + (blockExtra[t] ?? []) { o[bk] = coerce(bf, b[bk]) }
                return .object(o)
            })
        }
        if type == "today" {
            let n = max(0, Int(out["maxBlocks"]?.double ?? 8))
            out["blocks"] = .array(Array((out["blocks"]?.array ?? []).prefix(n)))
        }
        if type == "modules" {
            let known = ["home", "vocab", "skills", "tests", "me"]
            var seen = Set<String>(), order: [String] = []
            for m in (out["order"]?.array ?? []).compactMap(\.string) where known.contains(m) && !seen.contains(m) { seen.insert(m); order.append(m) }
            for m in known where !seen.contains(m) { order.append(m) }
            out["order"] = .array(order.map { .string($0) })
            out["hidden"] = .array((out["hidden"]?.array ?? []).compactMap(\.string).filter { known.contains($0) && $0 != "home" }.map { .string($0) })
        }
        return .object(out)
    }

    /// `cmpVer(a, b)`: compare x.y.z numerically
    public static func cmpVer(_ a: String, _ b: String) -> Int {
        func p(_ s: String) -> [Int] { Array(s.split(whereSeparator: { $0 == "." || $0 == "-" }).prefix(3).map { Int($0.prefix { $0.isNumber }) ?? 0 }) }
        let x = p(a), y = p(b)
        for i in 0..<3 { let u = i < x.count ? x[i] : 0, v = i < y.count ? y[i] : 0; if u != v { return u < v ? -1 : 1 } }
        return 0
    }

    public static func canon(_ e: JSON) -> String {
        let body = e["body"] ?? .null
        let digest = SHA256.hash(data: Data(body.stableString.utf8)).map { String(format: "%02x", $0) }.joined()
        // Array.prototype.join writes undefined / null as ""
        func part(_ k: String) -> String { guard let v = e[k], v != .null else { return "" }; return v.jsToString }
        return [kind, part("type"), part("schema"), part("minApp"), part("version"), digest].joined(separator: "\n")
    }

    public static func verify(_ e: JSON, publicKeySPKI: Data) -> Bool {
        guard let sigB64 = e["signature"]?.string, let sig = Data(base64Encoded: sigB64),
              let key = try? P256.Signing.PublicKey(derRepresentation: publicKeySPKI),
              let s = try? P256.Signing.ECDSASignature(rawRepresentation: sig) else { return false }
        return key.isValidSignature(s, for: Data(canon(e).utf8))
    }

    /// Reference reader: raw JSON text → result.
    public static func read(_ text: String, app: AppSchema = thisBuild, appVersion: String = thisVersion, publicKeySPKI: Data) -> Result {
        func no(_ r: Reason) -> Result { Result(ok: false, reason: r, value: nil, type: nil, version: nil) }
        guard let e = try? JSON.parse(text) else { return no(.corrupt) }
        guard e.isObject, e["kind"]?.string == kind else { return no(.kind) }
        guard let type = e["type"]?.string, fields[type] != nil else { return no(.type) }
        guard case .number(let sc)? = e["schema"], sc.rounded() == sc, sc >= 1, let minApp = e["minApp"]?.string, let version = e["version"]?.string,
              let body = e["body"], body.isObject else { return no(.corrupt) }
        guard verify(e, publicKeySPKI: publicKeySPKI) else { return no(.badsig) }
        if cmpVer(minApp, appVersion) > 0 { return no(.minApp) }
        return Result(ok: true, reason: nil, schemaNewer: Int(sc) > (app.maxSchema[type] ?? 0), value: model(type, body, app), type: type, version: version)
    }
}

/// Today module order (P02) from the signed `today` document. Blocks map to native sections; sections the document does not mention keep
/// the web order after them (never dropped – no cuts). Invalid / missing document → the built-in web order.
public enum TodayModule: String, CaseIterable, Sendable {
    case stats, bubble, focus, plan, review, quick, readiness, stories, streak, path
    public static let webOrder: [TodayModule] = allCases
    static let fromBlock: [String: TodayModule] = ["streak": .streak, "goal": .stats, "continue": .focus, "review": .review]

    public static func order(from today: JSON?) -> [TodayModule] {
        var out: [TodayModule] = []
        for b in today?["blocks"]?.array ?? [] {
            if let t = b["type"]?.string, let m = fromBlock[t], !out.contains(m) { out.append(m) }
        }
        guard !out.isEmpty else { return webOrder }
        // header modules (stats + teacher bubble) stay on top like the web frame unless the document moves them
        return out + webOrder.filter { !out.contains($0) }
    }
}

// MARK: - Remote Config (feature flags)

/// Firebase Remote Config behind a protocol (app target implements it). Keys + SAFE offline defaults are generated from
/// native/shared/flags.json into LKCore/Generated/Flags.swift – never written by hand.
public protocol LKRemoteConfig: AnyObject, Sendable {
    func value(_ key: FlagKey) -> JSON?
    func refresh() async
}
public extension LKRemoteConfig {
    func bool(_ k: FlagKey) -> Bool { if case .bool(let b)? = value(k) { return b }; return FlagDefaults.all[k] as? Bool ?? false }
    func int(_ k: FlagKey) -> Int {
        let d = FlagDefaults.all[k] as? Int ?? 0
        guard case .number(let n)? = value(k), n.isFinite else { return d }
        let v = Int(n)
        if let r = FlagDefaults.bounds[k], !r.contains(v) { return d }   // out of range → safe default
        return v
    }
    func string(_ k: FlagKey) -> String { value(k)?.string ?? FlagDefaults.all[k] as? String ?? "" }
}
/// Defaults only (tests, previews, offline first launch).
public final class DefaultRemoteConfig: LKRemoteConfig, @unchecked Sendable {
    private let lock = NSLock()
    private var overrides: [FlagKey: JSON]
    public init(_ overrides: [FlagKey: JSON] = [:]) { self.overrides = overrides }
    public func value(_ key: FlagKey) -> JSON? { lock.withLock { overrides[key] } }
    public func refresh() async {}
}
