import Foundation
import FirebaseRemoteConfig
import LKCore
import LKSync

/// Firebase Remote Config behind LKRemoteConfig. Keys and SAFE offline defaults come from the generated Flags.swift
/// (native/shared/flags.json); a value counts only when it came from the server (never fetched / failed → defaults).
final class FirebaseRemoteFlags: LKRemoteConfig, @unchecked Sendable {
    private let rc = RemoteConfig.remoteConfig()

    init() {
        var d: [String: NSObject] = [:]
        for (k, v) in FlagDefaults.all {
            switch v {
            case let b as Bool: d[k.rawValue] = NSNumber(value: b)
            case let i as Int: d[k.rawValue] = NSNumber(value: i)
            case let s as String: d[k.rawValue] = s as NSString
            default: break
            }
        }
        rc.setDefaults(d)
        let s = RemoteConfigSettings()
        s.minimumFetchInterval = 3600
        rc.configSettings = s
    }

    func value(_ key: FlagKey) -> JSON? {
        let v = rc.configValue(forKey: key.rawValue)
        guard v.source == .remote else { return nil }
        switch FlagDefaults.all[key] {
        case is Bool: return .bool(v.boolValue)
        case is Int: return .number(((v.numberValue as NSNumber?) ?? NSNumber(value: 0)).doubleValue)
        case is String: return .string((v.stringValue as String?) ?? "")
        default: return nil
        }
    }

    func refresh() async { _ = try? await rc.fetchAndActivate() }
}
