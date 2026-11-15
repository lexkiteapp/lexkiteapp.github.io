import Foundation
import LKSync

/// Tolerant reader of the JS literals the web content scripts use (strings, numbers, arrays, objects, `null`, and `() => t('…')` / `t('…')`
/// call wrappers). Pure Swift on UTF-8 bytes: the app never runs JavaScript (spec), it reads the same script files as data.
/// Port of Android core/vocab/WebWords.kt `JsLit`; offsets are UTF-8 byte offsets.
public struct JsLit {
    public let b: [UInt8]
    public var i: Int
    public init(_ text: String, at: Int = 0) { b = Array(text.utf8); i = at }
    public init(bytes: [UInt8], at: Int = 0) { b = bytes; i = at }

    private var c: UInt8 { i < b.count ? b[i] : 0 }
    private static func isSpace(_ x: UInt8) -> Bool { x == 32 || x == 9 || x == 10 || x == 13 || x == 11 || x == 12 }
    private static func isWord(_ x: UInt8) -> Bool { (x >= 48 && x <= 57) || (x >= 65 && x <= 90) || (x >= 97 && x <= 122) || x == 95 }
    private static func isDigit(_ x: UInt8) -> Bool { x >= 48 && x <= 57 }

    // MARK: scanning helpers (byte offsets)
    /// Offsets just after each occurrence of `needle`. `lineStart`: the needle must begin a line. `boundary`: the byte before must not be a word character.
    /// `next`: the byte after the needle must be this one (a lookahead).
    public static func scan(_ needle: String, in b: [UInt8], lineStart: Bool = false, boundary: Bool = true, next: UInt8? = nil) -> [Int] {
        let n = Array(needle.utf8)
        guard !n.isEmpty, b.count >= n.count else { return [] }
        var out: [Int] = []
        var p = 0
        let last = b.count - n.count
        while p <= last {
            if b[p] == n[0] {
                var ok = true
                var k = 1
                while k < n.count { if b[p + k] != n[k] { ok = false; break }; k += 1 }
                if ok {
                    if lineStart && p > 0 && b[p - 1] != 10 { ok = false }
                    if ok && boundary && !lineStart && p > 0 && isWord(b[p - 1]) { ok = false }
                    if ok, let nx = next, !(p + n.count < b.count && b[p + n.count] == nx) { ok = false }
                    if ok { out.append(p + n.count); p += n.count; continue }
                }
            }
            p += 1
        }
        return out
    }
    public static func find(_ needle: String, in b: [UInt8], from: Int = 0) -> Int? {
        let n = Array(needle.utf8)
        guard !n.isEmpty, b.count >= n.count, from <= b.count - n.count else { return nil }
        var p = max(0, from)
        while p <= b.count - n.count {
            if b[p] == n[0] {
                var k = 1
                while k < n.count && b[p + k] == n[k] { k += 1 }
                if k == n.count { return p }
            }
            p += 1
        }
        return nil
    }
    public func hasPrefix(_ s: String) -> Bool {
        let n = Array(s.utf8)
        guard i + n.count <= b.count else { return false }
        for k in 0..<n.count where b[i + k] != n[k] { return false }
        return true
    }

    // MARK: reader
    private mutating func ws() {
        while i < b.count {
            if JsLit.isSpace(b[i]) { i += 1 }
            else if hasPrefix("//") { while i < b.count && b[i] != 10 { i += 1 } }
            else if hasPrefix("/*") { if let e = JsLit.find("*/", in: b, from: i + 2) { i = e + 2 } else { i = b.count } }
            else { break }
        }
    }
    private func hex4(_ at: Int) -> UInt32? {
        guard at + 4 <= b.count else { return nil }
        var v: UInt32 = 0
        for k in 0..<4 {
            let h = b[at + k]
            let d: UInt32
            switch h { case 48...57: d = UInt32(h - 48); case 65...70: d = UInt32(h - 55); case 97...102: d = UInt32(h - 87); default: return nil }
            v = v * 16 + d
        }
        return v
    }
    private mutating func str() -> String {
        let q = c; i += 1
        var out: [UInt8] = []
        func put(_ sc: UInt32) { out.append(contentsOf: Array((Unicode.Scalar(sc) ?? "\u{FFFD}").description.utf8)) }
        while i < b.count && b[i] != q {
            let x = b[i]; i += 1
            if x != 92 { out.append(x); continue }
            guard i < b.count else { break }
            let e = b[i]; i += 1
            switch e {
            case 110: out.append(10)
            case 116: out.append(9)
            case 114: out.append(13)
            case 117:
                if let u = hex4(i) {
                    i += 4
                    if u >= 0xD800 && u < 0xDC00, i + 6 <= b.count, b[i] == 92, b[i + 1] == 117, let lo = hex4(i + 2), lo >= 0xDC00 && lo < 0xE000 {
                        i += 6; put(0x10000 + ((u - 0xD800) << 10) + (lo - 0xDC00))
                    } else { put(u) }
                }
            case 10: break // line continuation
            default: out.append(e)
            }
        }
        i += 1
        return String(decoding: out, as: UTF8.self)
    }
    private mutating func key() -> String {
        ws()
        if c == 39 || c == 34 { return str() }
        let st = i
        while i < b.count && (JsLit.isWord(b[i]) || b[i] == 36) { i += 1 }
        return String(decoding: b[st..<i], as: UTF8.self)
    }
    public mutating func value() -> JSON {
        ws()
        switch c {
        case 39, 34, 96: return .string(str())
        case 123:
            i += 1
            var m: [String: JSON] = [:]
            while i < b.count {
                ws()
                if c == 125 { i += 1; break }
                let before = i
                let k = key(); ws()
                if c == 58 { i += 1 }
                m[k] = value(); ws()
                if c == 44 { i += 1 }
                if i == before { i += 1 }
            }
            return .object(m)
        case 91:
            i += 1
            var out: [JSON] = []
            while i < b.count {
                ws()
                if c == 93 { i += 1; break }
                let before = i
                out.append(value()); ws()
                if c == 44 { i += 1 }
                if i == before { i += 1 }
            }
            return .array(out)
        case 40: // () => t('…')
            if let e = JsLit.find("=>", in: b, from: i) { i = e + 2 } else { i += 1 }
            return value()
        case 45, 48...57:
            let st = i; i += 1
            while i < b.count && (JsLit.isDigit(b[i]) || b[i] == 46) { i += 1 }
            return .number(Double(String(decoding: b[st..<i], as: UTF8.self)) ?? 0)
        default:
            let st = i
            while i < b.count && JsLit.isWord(b[i]) { i += 1 }
            if i == st { i += 1; return .null }
            switch String(decoding: b[st..<i], as: UTF8.self) {
            case "null", "undefined": return .null
            case "true": return .bool(true)
            case "false": return .bool(false)
            default:
                ws()
                if c == 40 {
                    i += 1
                    let a = value(); ws()
                    while i < b.count && c != 41 { i += 1; ws(); _ = value(); ws() }
                    i += 1
                    return a
                }
                return .null
            }
        }
    }
    /// Arguments of a call whose `(` is already consumed; stops after `)`.
    public mutating func args() -> [JSON] {
        var out: [JSON] = []
        while i < b.count {
            ws()
            if c == 41 { i += 1; break }
            let before = i
            out.append(value()); ws()
            if c == 44 { i += 1 }
            if i == before { i += 1 }
        }
        return out
    }
}

/// Library word packs: `web/js/data.js` + `web/js/lib/*.js` rows → topics, groups (port of Android `WebWords`).
public enum WebWords {
    private static func row(_ r: [JSON], _ id: String) -> JSON {
        func g(_ n: Int) -> String { n < r.count ? (r[n].string ?? "") : "" }
        func list(_ n: Int) -> JSON { .array(g(n).isEmpty ? [] : g(n).components(separatedBy: "|").map { .string($0) }) }
        return .object(["word": .string(g(0)), "ipa": .string(g(1)), "pos": .string(g(2)), "vi": .string(g(3)), "def": .string(g(4)), "ex": .string(g(5)),
                        "col": list(6), "syn": list(7), "level": .string(g(8)), "emoji": .string(g(9)), "ipaUS": .string(g(10)), "topic": .string(id)])
    }
    /// Topics declared in one script (`T(...)` in data.js, `add(...)` in js/lib/*.js), in file order.
    public static func parseTopics(_ text: String) -> [TopicCatalog.Topic] {
        let b = Array(text.utf8)
        var hits: [(Int, Bool)] = JsLit.scan("add(", in: b, lineStart: true).map { ($0, false) } + JsLit.scan("T(", in: b, lineStart: true).map { ($0, true) }
        hits.sort { $0.0 < $1.0 }
        var out: [TopicCatalog.Topic] = []
        for (at, isT) in hits {
            var p = JsLit(bytes: b, at: at)
            let a = p.args()
            guard a.count > 4, let rows = a[4].array else { continue }
            let id = a[0].string ?? ""
            var group = a.count > 5 ? (a[5].string ?? "") : ""
            if group.isEmpty { group = "topics" }
            if isT && (id == "task1" || id == "task2") { group = "writing" }
            out.append(TopicCatalog.Topic(id: id, group: group, name: a[1].string ?? "", emoji: a[2].string ?? "", desc: a[3].string ?? "",
                                          words: rows.map { row($0.array ?? [], id) }))
        }
        return out
    }
    private static let groupName = try! NSRegularExpression(pattern: "name(?:\\(\\) \\{ return t\\('((?:\\\\'|[^'])*)'\\); \\}|: '([^']*)')")
    private static let groupDesc = try! NSRegularExpression(pattern: "desc\\(\\) \\{ return t\\('((?:\\\\'|[^'])*)'\\); \\}")
    private static let groupEmoji = try! NSRegularExpression(pattern: "emoji: '([^']+)'")
    private static let groupID = try! NSRegularExpression(pattern: "^\\{ id: '(\\w+)'")
    private static func cap(_ re: NSRegularExpression, _ s: String, _ n: Int = 1) -> String? {
        guard let m = re.firstMatch(in: s, range: NSRange(s.startIndex..., in: s)), m.range(at: n).location != NSNotFound, let r = Range(m.range(at: n), in: s) else { return nil }
        return String(s[r])
    }
    /// GROUPS of data.js (id, name key, emoji, description key).
    public static func parseGroups(_ dataJs: String) -> [TopicCatalog.Group] {
        var out: [TopicCatalog.Group] = []
        for sub in dataJs.split(separator: "\n", omittingEmptySubsequences: true) where sub.hasPrefix("{ id: '") {
            let line = String(sub)
            guard let id = cap(groupID, line) else { continue }
            let name = cap(groupName, line, 1).flatMap { $0.isEmpty ? nil : $0 } ?? cap(groupName, line, 2) ?? ""
            out.append(.init(id: id, name: name.replacingOccurrences(of: "\\'", with: "'"), emoji: cap(groupEmoji, line) ?? "",
                             desc: (cap(groupDesc, line) ?? "").replacingOccurrences(of: "\\'", with: "'")))
        }
        return out
    }
    /// data.js first, then the lib files in the order the app loads them; later duplicates of an id are ignored (like the web `add`).
    public static func catalog(dataJs: String, libs: [String]) -> TopicCatalog {
        var all = parseTopics(dataJs)
        var seen = Set(all.map(\.id))
        for l in libs { for t in parseTopics(l) where seen.insert(t.id).inserted { all.append(t) } }
        return TopicCatalog(topics: all, groups: parseGroups(dataJs))
    }
}

/// The writing content the web ships as scripts, read as data (port of Android `WritingData`).
public enum WritingData {
    private static func arrayAt(_ b: [UInt8], _ i: Int) -> [JSON] { var p = JsLit(bytes: b, at: i); return p.value().array ?? [] }
    private static func objs(_ l: [JSON]) -> [JSON] { l.filter { $0.isObject } }
    private static func after(_ marker: String, _ b: [UInt8]) -> Int? { JsLit.find(marker, in: b).map { $0 + marker.utf8.count } }

    public static func ideas(_ text: String) -> [JSON] { let b = Array(text.utf8); return after("IDEAS = ", b).map { objs(arrayAt(b, $0)) } ?? [] }
    /// `[[question, paraphrase], …]` as the arrays the screens read.
    public static func paraphrase(_ text: String) -> [JSON] {
        let b = Array(text.utf8)
        return after("PARAPHRASE = ", b).map { arrayAt(b, $0).filter { $0.array != nil } } ?? []
    }
    /// `X = (X || []).concat([ … ])` / `X = X.concat([ … ])` / `X = [ … ].concat(X || [])` blocks of one script, applied to `cur` the way the web evaluates them.
    public static func concatInto(_ name: String, cur: [JSON], text: String) -> [JSON] {
        let b = Array(text.utf8)
        var out = cur
        for at in JsLit.scan(name + " = ", in: b) {
            if at < b.count && b[at] == 91 {
                var p = JsLit(bytes: b, at: at)
                let own = objs(p.value().array ?? [])
                out = p.hasPrefix(".concat(") ? own + out : own
            } else if let k = JsLit.find(".concat(", in: b, from: at) {
                out += objs(arrayAt(b, k + 8))
            }
        }
        return out
    }
    /// Task 2 prompts: `T('id','type','topic','text')` rows of write.js, then `WRITE_MORE` rows `[id,type,topic,text]` (ids already present are skipped).
    public static func prompts(writeJs: String, more: [String]) -> [JSON] {
        var out: [JSON] = []; var ids = Set<String>()
        func add(_ a: [JSON]) {
            guard let id = a.first?.string, ids.insert(id).inserted else { return }
            func g(_ n: Int) -> JSON { n < a.count ? a[n] : .null }
            out.append(.obj([("id", .string(id)), ("type", g(1)), ("topic", g(2)), ("text", g(3))]))
        }
        let wb = Array(writeJs.utf8)
        for at in JsLit.scan("T(", in: wb, next: 39) { var p = JsLit(bytes: wb, at: at); add(p.args()) }
        for t in more {
            let b = Array(t.utf8)
            guard let i = after("WRITE_MORE = ", b), let k = JsLit.find(".concat(", in: b, from: i) else { continue }
            for r in arrayAt(b, k + 8) { if let a = r.array { add(a) } }
        }
        return out
    }
    /// Task 1 sets: `const SETS = [ … ]` of task1.js + `TASK1_MORE` blocks (duplicates by id skipped).
    public static func task1(task1Js: String, more: [String]) -> [JSON] {
        let b = Array(task1Js.utf8)
        var out = after("const SETS = ", b).map { objs(arrayAt(b, $0)) } ?? []
        var extra: [JSON] = []
        for t in more { extra = concatInto("TASK1_MORE", cur: extra, text: t) }
        var ids = Set(out.map { $0.s("id") })
        out += extra.filter { ids.insert($0.s("id")).inserted }
        return out
    }
    /// The DSL text of one usage script: the template literal of `LK_USAGE_SRC.<kind> = (…) + \`…\`` and its kind letter.
    public static func usageSource(_ text: String) -> (kind: String, body: String)? {
        guard let re = try? NSRegularExpression(pattern: "S\\.([a-z]) = \\(S\\.[a-z] \\|\\| ''\\)"),
              let m = re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)), let kr = Range(m.range(at: 1), in: text),
              let a = text.firstIndex(of: "`"), let z = text.lastIndex(of: "`"), a < z else { return nil }
        return (String(text[kr]), String(text[text.index(after: a)..<z]))
    }
}
