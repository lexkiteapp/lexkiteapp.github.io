import Foundation
import LKSync

/// One slider of the settings "study" / "sound" pages: the web `<input type="range">` bounds (web/js/settings.js).
public struct SettingRange: Sendable, Equatable {
    public let min: Double, max: Double, step: Double
    public init(_ min: Double, _ max: Double, _ step: Double) { self.min = min; self.max = max; self.step = step }
    /// Clamp + snap to the step from `min`, like a browser range input. NaN → `min`.
    public func snap(_ v: Double) -> Double {
        if v.isNaN { return min }
        let n = ((Swift.min(Swift.max(v, min), max) - min) / step).rounded()
        let s = Swift.min(Swift.max(min + n * step, min), max)
        return (s * 100).rounded() / 100
    }
    public var steps: Int { Int(((max - min) / step).rounded()) }
}

/// P11 – the synced learner settings the native settings pages edit, read from the shared `settings` document with the web defaults
/// (core.js DEFAULT_SETTINGS + app.js load: sfx true, retention 0.9, ttsRate 0.92). Same model as Android `LearnSettings`.
/// Device-only choices (UI language, theme, haptics) live in `AppServices`, never here.
public struct LearnSettings: Sendable, Equatable {
    public var dailyNew = 10, dailyGoal = 20, sessionCap = 50
    public var retention = 0.9
    public var accent = "en-GB"
    public var ttsRate = 0.92
    public var autoSpeak = true, sfx = true

    public init(dailyNew: Int = 10, dailyGoal: Int = 20, sessionCap: Int = 50, retention: Double = 0.9, accent: String = "en-GB", ttsRate: Double = 0.92, autoSpeak: Bool = true, sfx: Bool = true) {
        self.dailyNew = dailyNew; self.dailyGoal = dailyGoal; self.sessionCap = sessionCap; self.retention = retention
        self.accent = accent; self.ttsRate = ttsRate; self.autoSpeak = autoSpeak; self.sfx = sfx
    }

    public static let dailyNewRange = SettingRange(0, 50, 1)
    public static let dailyGoalRange = SettingRange(5, 200, 5)
    public static let sessionCapRange = SettingRange(0, 200, 10)
    public static let retentionRange = SettingRange(0.8, 0.95, 0.01)
    public static let ttsRateRange = SettingRange(0.6, 1.2, 0.02)

    /// Missing / wrong-typed keys fall back to the web default; `0`/`false` stored by web are kept (only `retention`/`ttsRate`/`dailyGoal` use `||` like web).
    public init(from settings: JSON?) {
        self.init()
        guard let o = settings?.object else { return }
        func num(_ k: String) -> Double? {
            guard let v = o[k] else { return nil }
            switch v {
            case .string, .array, .object: return nil
            default: let n = v.toNumber; return n.isNaN ? nil : n
            }
        }
        func int(_ k: String) -> Int? { num(k).map { Int(Swift.max(-1e9, Swift.min(1e9, $0))) } }
        func bool(_ k: String, _ def: Bool) -> Bool {
            switch o[k] {
            case .bool(let b)?: return b
            case .number?: return o[k]!.truthy
            case .null?: return false
            default: return def
            }
        }
        dailyNew = int("dailyNew") ?? dailyNew
        dailyGoal = int("dailyGoal").flatMap { $0 > 0 ? $0 : nil } ?? dailyGoal
        sessionCap = int("sessionCap") ?? sessionCap
        retention = num("retention").flatMap { $0 > 0 ? $0 : nil } ?? retention
        accent = o["accent"]?.string == "en-US" ? "en-US" : "en-GB"
        ttsRate = num("ttsRate").flatMap { $0 > 0 ? $0 : nil } ?? ttsRate
        autoSpeak = bool("autoSpeak", autoSpeak)
        sfx = bool("sfx", sfx)
    }
    public static func from(_ settings: JSON?) -> LearnSettings { LearnSettings(from: settings) }

    /// Writes one web key into the document (other keys kept) and stamps `settingsAt` so sync carries it (web saveSettings).
    public static func put(_ doc: SyncDoc, key: String, value: JSON, now: Double) -> SyncDoc {
        var d = doc
        d.settings = .object(JSON.spread(doc.settings).merging([key: value]) { _, new in new })
        d.settingsAt = now
        return d
    }
}
