import Foundation

/// Runtime strings for the 15 UI languages. Same semantics as web t(): `{name}` placeholders, fallback → en → key.
public final class L10n: @unchecked Sendable {
    public let lang: String
    private let table: [String: String], fallback: [String: String]
    public init(lang: String) {
        let l = L10nLangs.all.contains(lang) ? lang : "en"
        self.lang = l
        table = Self.load(l); fallback = l == "en" ? [:] : Self.load("en")
    }
    public var isRTL: Bool { L10nLangs.rtl.contains(lang) }
    public func callAsFunction(_ key: L10nKey, _ vars: [String: CustomStringConvertible] = [:]) -> String {
        var s = table[key.rawValue] ?? fallback[key.rawValue] ?? key.rawValue
        for (k, v) in vars { s = s.replacingOccurrences(of: "{\(k)}", with: v.description) }
        return s
    }
    public func has(_ key: L10nKey) -> Bool { table[key.rawValue] != nil }
    /// Source text (the Vietnamese key a web `t()` call receives) → id, built once from the Vietnamese table.
    private static let sourceIndex: [String: String] = Dictionary(load("vi").map { ($0.value, $0.key) }, uniquingKeysWith: { a, _ in a })
    /// Translate a stored web key such as `{k:"Nghĩa của “{word}”?", v:{word}}` (mistakes book); nil when no id carries that text.
    public func translate(source k: String, _ vars: [String: String] = [:]) -> String? {
        guard let id = Self.sourceIndex[k], var s = table[id] ?? fallback[id] else { return nil }
        for (n, v) in vars { s = s.replacingOccurrences(of: "{\(n)}", with: v) }
        return s
    }
    /// Best UI language for the device's preferred languages (zh-Hans → zh, pt-BR → pt…).
    public static func preferred(_ prefs: [String] = Locale.preferredLanguages) -> String {
        for p in prefs { let base = String(p.prefix(2)).lowercased(); if L10nLangs.all.contains(base) { return base } }
        return "en"
    }
    static func load(_ l: String) -> [String: String] {
        guard let url = Bundle.module.url(forResource: l, withExtension: "json", subdirectory: "strings"),
              let d = try? Data(contentsOf: url), let o = try? JSONDecoder().decode([String: String].self, from: d) else { return [:] }
        return o
    }
}
