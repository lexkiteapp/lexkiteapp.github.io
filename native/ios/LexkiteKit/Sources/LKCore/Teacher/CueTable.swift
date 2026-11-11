import Foundation

/// Pre-generated mouth cues (`teach/cues.json` = web `window.LK_CUES`): `k[lineKey(voice, text)]` → packed `[ms, cues, env?]` (→ `LipSync.unpack`);
/// `dict` = pronunciation dictionary for `fromText` / `fromEnv` (web `LipSync.setDict`).
public struct CueTable: Sendable {
    private let k: [String: (ms: Double, cues: String, env: String?)]
    public let dictText: String
    public var count: Int { k.count }
    public var keys: [String] { Array(k.keys) }

    public init?(data: Data) {
        guard let o = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any], let raw = o["k"] as? [String: Any] else { return nil }
        var t: [String: (ms: Double, cues: String, env: String?)] = [:]
        for (key, v) in raw {
            // web `k[key] || null`: lines without cues are stored as 0 → skipped (a strict [String: [Any]] cast would drop the whole table)
            guard let e = v as? [Any], e.count >= 2, let ms = (e[0] as? NSNumber)?.doubleValue, let c = e[1] as? String else { continue }
            t[key] = (ms, c, e.count > 2 ? e[2] as? String : nil)
        }
        k = t; dictText = o["dict"] as? String ?? ""
    }

    /// The unpacked entry for `key`, or nil when the line has no pre-generated cues.
    public func unpacked(_ key: String) -> LipSync.Unpacked? { k[key].map { LipSync.unpack(ms: $0.ms, cues: $0.cues, env: $0.env) } }
}
