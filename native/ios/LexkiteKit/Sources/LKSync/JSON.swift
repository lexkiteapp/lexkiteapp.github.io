import Foundation

/// A JSON value with JavaScript semantics where the web merge (web/js/sync.js) depends on them:
/// truthiness, `+x` / `Math.max` number coercion, object spread, `JSON.stringify` text (number format, escaping, key order).
/// The sync data contract is schemaless JSON on purpose: cards, stats and game carry fields this app does not know yet
/// (added by web or a newer client) and they must round-trip untouched – zero loss.
public enum JSON: Sendable, Hashable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSON])
    case object([String: JSON])

    // MARK: accessors
    public subscript(key: String) -> JSON? {
        get { if case .object(let o) = self { return o[key] }; return nil }
        set {
            guard case .object(var o) = self else { return }
            o[key] = newValue
            self = .object(o)
        }
    }
    public var object: [String: JSON]? { if case .object(let o) = self { return o }; return nil }
    public var array: [JSON]? { if case .array(let a) = self { return a }; return nil }
    public var string: String? { if case .string(let s) = self { return s }; return nil }
    public var double: Double? { if case .number(let n) = self { return n }; return nil }
    public var int64: Int64? { if case .number(let n) = self, n.isFinite, n.rounded() == n, abs(n) < 9.2e18 { return Int64(n) }; return nil }
    public var isObject: Bool { if case .object = self { return true }; return false }
    public var isNumber: Bool { if case .number = self { return true }; return false }

    // MARK: JavaScript semantics
    /// JS truthiness (`if (x)`, `x || y`).
    public var truthy: Bool {
        switch self {
        case .null: false
        case .bool(let b): b
        case .number(let n): !(n == 0 || n.isNaN)
        case .string(let s): !s.isEmpty
        case .array, .object: true
        }
    }
    /// JS ToNumber (`+x`, operands of `Math.max`, `>`). `undefined` (Swift nil) is NaN; use `JSON.num(nil)`.
    public var toNumber: Double {
        switch self {
        case .null: return 0
        case .bool(let b): return b ? 1 : 0
        case .number(let n): return n
        case .string(let s):
            let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
            if t.isEmpty { return 0 }
            if t.hasPrefix("0x") || t.hasPrefix("0X") { return UInt64(t.dropFirst(2), radix: 16).map { Double($0) } ?? Double.nan }
            if t == "Infinity" || t == "+Infinity" { return .infinity }
            if t == "-Infinity" { return -.infinity }
            // JS does not accept "inf"/"nan" words that Double(_:) does
            if t.contains(where: { $0.isLetter && $0 != "e" && $0 != "E" }) { return .nan }
            return Double(t) ?? .nan
        case .array(let a):
            if a.isEmpty { return 0 }
            if a.count == 1 { return JSON.string(a[0].jsToString).toNumber }
            return .nan
        case .object: return .nan
        }
    }
    public static func num(_ v: JSON?) -> Double { v?.toNumber ?? .nan }
    public static func truthy(_ v: JSON?) -> Bool { v?.truthy ?? false }
    /// `x || 0` as a number (the web merge uses this everywhere): falsy → 0, else ToNumber.
    public static func orZero(_ v: JSON?) -> Double { truthy(v) ? num(v) : 0 }

    /// JS `String(x)` (used by the default `Array.prototype.sort` comparator).
    public var jsToString: String {
        switch self {
        case .null: "null"
        case .bool(let b): b ? "true" : "false"
        case .number(let n): JSON.jsNumberString(n)
        case .string(let s): s
        case .array(let a): a.map { $0 == .null ? "" : $0.jsToString }.joined(separator: ",")
        case .object: "[object Object]"
        }
    }

    /// Own enumerable properties as object spread `{...x}` sees them (undefined/null/numbers/bools → none).
    public static func spread(_ v: JSON?) -> [String: JSON] {
        switch v {
        case .object(let o)?: return o
        case .array(let a)?: return Dictionary(uniqueKeysWithValues: a.enumerated().map { (String($0.offset), $0.element) as (String, JSON) })
        case .string(let s)?: return Dictionary(uniqueKeysWithValues: s.utf16.enumerated().map { (String($0.offset), JSON.string(String(utf16CodeUnits: [$0.element], count: 1))) })
        default: return [:]
        }
    }
    /// `Object.entries(x || {})`
    public static func entries(_ v: JSON?) -> [(String, JSON)] {
        guard truthy(v) else { return [] }
        return JSON.orderedKeys(spread(v)).map { ($0.0, $0.1) }
    }

    /// JS `Math.max(...)`: NaN if any operand is NaN, else the largest (+0 beats −0 like JS).
    public static func jsMax(_ xs: Double...) -> Double {
        var m = -Double.infinity
        for x in xs { if x.isNaN { return .nan }; if x > m || (x == 0 && m == 0 && m.sign == .minus) { m = x } }
        return m
    }
    public static func jsMin(_ xs: Double...) -> Double {
        var m = Double.infinity
        for x in xs { if x.isNaN { return .nan }; if x < m || (x == 0 && m == 0 && x.sign == .minus) { m = x } }
        return m
    }
    /// A JS number result as JSON (`JSON.stringify` writes NaN/±Infinity as null).
    public static func n(_ d: Double) -> JSON { d.isFinite ? .number(d) : .null }

    /// JS `a > b` / `a >= b` for two values that may be undefined (nil) – strings compare by UTF-16 code units, everything else numerically.
    public static func jsGreater(_ a: JSON?, _ b: JSON?, orEqual: Bool = false) -> Bool {
        if case .string(let x)? = a, case .string(let y)? = b {
            return orEqual ? !JSON.utf16Less(x, y) : JSON.utf16Less(y, x)
        }
        let x = num(a), y = num(b)
        if x.isNaN || y.isNaN { return false }
        return orEqual ? x >= y : x > y
    }

    // MARK: JSON.stringify
    /// `JSON.stringify(v)` with keys in the order a JS engine enumerates a key-sorted object – i.e. exactly the web `stable()` text
    /// (array-index keys first in numeric order, then the remaining keys in UTF-16 order).
    public var stableString: String { var s = ""; JSON.write(self, into: &s); return s }
    public var data: Data { Data(stableString.utf8) }

    static func write(_ v: JSON, into s: inout String) {
        switch v {
        case .null: s += "null"
        case .bool(let b): s += b ? "true" : "false"
        case .number(let n): s += n.isFinite ? jsNumberString(n) : "null"
        case .string(let str): writeString(str, into: &s)
        case .array(let a):
            s += "["
            for (i, x) in a.enumerated() { if i > 0 { s += "," }; write(x, into: &s) }
            s += "]"
        case .object(let o):
            s += "{"
            for (i, (k, x)) in orderedKeys(o).enumerated() { if i > 0 { s += "," }; writeString(k, into: &s); s += ":"; write(x, into: &s) }
            s += "}"
        }
    }
    static func writeString(_ str: String, into s: inout String) {
        s += "\""
        for u in str.unicodeScalars {
            switch u {
            case "\"": s += "\\\""
            case "\\": s += "\\\\"
            case "\u{08}": s += "\\b"
            case "\u{0C}": s += "\\f"
            case "\n": s += "\\n"
            case "\r": s += "\\r"
            case "\t": s += "\\t"
            default:
                if u.value < 0x20 { s += "\\u" + String(format: "%04x", u.value) } else { s.unicodeScalars.append(u) }
            }
        }
        s += "\""
    }
    /// Key order of a JS object built by inserting keys in UTF-16-sorted order.
    public static func orderedKeys(_ o: [String: JSON]) -> [(String, JSON)] {
        var idx: [(UInt32, String)] = [], rest: [String] = []
        for k in o.keys { if let i = arrayIndex(k) { idx.append((i, k)) } else { rest.append(k) } }
        idx.sort { $0.0 < $1.0 }
        rest.sort(by: utf16Less)
        return idx.map { ($0.1, o[$0.1]!) } + rest.map { ($0, o[$0]!) }
    }
    static func arrayIndex(_ k: String) -> UInt32? {
        guard let f = k.utf8.first, k.utf8.count <= 10, k.utf8.allSatisfy({ $0 >= 48 && $0 <= 57 }) else { return nil }
        if f == 48 && k.utf8.count > 1 { return nil }
        guard let v = UInt64(k), v < 4_294_967_295 else { return nil }
        return UInt32(v)
    }
    public static func utf16Less(_ a: String, _ b: String) -> Bool { a.utf16.lexicographicallyPrecedes(b.utf16) }

    /// ECMAScript Number::toString(10) for finite doubles (shortest round-trip digits, JS exponent rules).
    public static func jsNumberString(_ d: Double) -> String {
        if d.isNaN { return "NaN" }
        if d.isInfinite { return d < 0 ? "-Infinity" : "Infinity" }
        if d == 0 { return "0" }
        let neg = d < 0
        // Swift's description is the shortest round-trip representation; re-shape it to the JS layout.
        let desc = String(describing: abs(d))
        var mant = Substring(desc), exp = 0
        if let e = desc.firstIndex(where: { $0 == "e" || $0 == "E" }) {
            mant = desc[..<e]; exp = Int(desc[desc.index(after: e)...].replacingOccurrences(of: "+", with: "")) ?? 0
        }
        var intPart = mant, frac: Substring = ""
        if let dot = mant.firstIndex(of: ".") { intPart = mant[..<dot]; frac = mant[mant.index(after: dot)...] }
        var digits = Array(intPart + frac)
        var n = intPart.count + exp
        while digits.first == "0" { digits.removeFirst(); n -= 1 }
        while digits.last == "0" { digits.removeLast() }
        if digits.isEmpty { return "0" }
        let k = digits.count, ds = String(digits)
        var out: String
        if k <= n && n <= 21 { out = ds + String(repeating: "0", count: n - k) }
        else if 0 < n && n <= 21 { out = String(digits[0..<n]) + "." + String(digits[n...]) }
        else if -6 < n && n <= 0 { out = "0." + String(repeating: "0", count: -n) + ds }
        else {
            let e = n - 1, es = (e < 0 ? "-" : "+") + String(abs(e))
            out = k == 1 ? ds + "e" + es : String(digits[0]) + "." + String(digits[1...]) + "e" + es
        }
        return neg ? "-" + out : out
    }

    // MARK: parse
    public static func parse(_ text: String) throws -> JSON { try parse(Data(text.utf8)) }
    public static func parse(_ data: Data) throws -> JSON { try JSONDecoder().decode(JSON.self, from: data) }
}

extension JSON: Codable {
    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        if c.decodeNil() { self = .null }
        else if let b = try? c.decode(Bool.self) { self = .bool(b) }
        else if let n = try? c.decode(Double.self) { self = .number(n) }
        else if let s = try? c.decode(String.self) { self = .string(s) }
        else if let a = try? c.decode([JSON].self) { self = .array(a) }
        else { self = .object(try c.decode([String: JSON].self)) }
    }
    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        switch self {
        case .null: try c.encodeNil()
        case .bool(let b): try c.encode(b)
        case .number(let n): if n.isFinite { try c.encode(n) } else { try c.encodeNil() }
        case .string(let s): try c.encode(s)
        case .array(let a): try c.encode(a)
        case .object(let o): try c.encode(o)
        }
    }
}

extension JSON: ExpressibleByStringLiteral, ExpressibleByFloatLiteral, ExpressibleByIntegerLiteral, ExpressibleByBooleanLiteral,
                ExpressibleByArrayLiteral, ExpressibleByDictionaryLiteral {
    public init(stringLiteral v: String) { self = .string(v) }
    public init(floatLiteral v: Double) { self = .number(v) }
    public init(integerLiteral v: Int) { self = .number(Double(v)) }
    public init(booleanLiteral v: Bool) { self = .bool(v) }
    public init(arrayLiteral e: JSON...) { self = .array(e) }
    public init(dictionaryLiteral e: (String, JSON)...) { self = .object(Dictionary(e, uniquingKeysWith: { _, b in b })) }
}
