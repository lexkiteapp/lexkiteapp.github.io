import Foundation
import LKSync

/// #/deck sharing, backup and Anki text – port of web/js/app.js packDeck / unpackDeck / importData and the plain-text part of anki.js / export.js.
/// The share link carries the deflate-raw, base64url-packed word list (no server); a backup is the full JSON of cards + stats + game + settings.
public enum DeckTransfer {
    public static let maxShared = 300, shareBase = "https://lexkite.com/app/#/deck?share="

    public struct Shared: Equatable, Sendable { public var name: String, words: [JSON] }

    static func b64u(_ d: Data) -> String {
        d.base64EncodedString().replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }
    static func unb64u(_ s: String) -> Data? {
        var t = s.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while t.count % 4 != 0 { t += "=" }
        return Data(base64Encoded: t)
    }

    /// `{v:1,n,w:[[word,ipa,pos,vi,def,ex≤160]…≤300]}` → deflate-raw → base64url
    public static func pack(name: String, cards: [JSON]) -> String? {
        let rows: [JSON] = cards.prefix(maxShared).map { c in
            .array([.string(c.s("word")), .string(c.s("ipa")), .string(c.s("pos")), .string(c.s("vi")), .string(c.s("def")), .string(Vocab.prefix(c.s("ex"), 160))])
        }
        let doc = JSON.obj([("v", .int(1)), ("n", .string(Vocab.prefix(name, 80))), ("w", .array(rows))])
        guard let z = try? (doc.data as NSData).compressed(using: .zlib) else { return nil }
        return b64u(z as Data)
    }
    public static func link(code: String) -> String { shareBase + code }

    /// nil = "Link bộ thẻ không hợp lệ"
    public static func unpack(_ code: String) -> Shared? {
        guard let raw = unb64u(code), let inflated = try? (raw as NSData).decompressed(using: .zlib), let d = try? JSON.parse(inflated as Data), let w = d["w"]?.array else { return nil }
        let name = d.t("n") ? d.s("n") : "Lexkite"
        let words: [JSON] = w.compactMap { r in
            guard let a = r.array, let first = a.first?.string, !first.isEmpty else { return nil }
            func at(_ i: Int) -> JSON { .string(a.count > i ? (a[i].string ?? "") : "") }
            return .obj([("word", .string(Vocab.prefix(first, 60))), ("ipa", at(1)), ("pos", at(2)), ("vi", at(3)), ("def", at(4)), ("ex", at(5))])
        }
        return Shared(name: name, words: words)
    }

    // MARK: backup (Export.backup) and import (importData)
    public static func backup(cards: [JSON], stats: JSON, game: JSON, settings: JSON, now: Int64) -> Data {
        var map: [String: JSON] = [:]
        for c in cards { map[Vocab.cardKey(c)] = c }
        let iso = ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: Double(now) / 1000))
        return JSON.obj([("app", .string("ielts-lexi")), ("version", .int(2)), ("exported", .string(iso)), ("cards", .object(map)), ("stats", stats), ("game", game), ("settings", settings)]).data
    }
    public struct Imported: Sendable { public var cards: [JSON]; public var stats: JSON? = nil; public var game: JSON? = nil }
    /// gộp `cards` vào kho, `stats.days` lấy max, `game` nếu xp lớn hơn. nil = "File không hợp lệ"
    public static func importBackup(_ data: Data, stats: JSON, game: JSON) -> Imported? {
        guard let d = try? JSON.parse(data), let cards = d["cards"]?.object else { return nil }
        var out = Imported(cards: cards.keys.sorted().compactMap { cards[$0] })
        if let days = d["stats"]?["days"]?.object {
            var s = stats.object ?? [:]
            var cur = s["days"]?.object ?? [:]
            for (k, v) in days { cur[k] = .number(max(JSON.orZero(cur[k]), JSON.orZero(v))) }
            s["days"] = .object(cur)
            out.stats = .object(s)
        }
        if let g = d["game"], JSON.orZero(g["xp"]) > JSON.orZero(game["xp"]) { out.game = g }
        return out
    }

    // MARK: Anki plain text (.txt / .tsv / .csv)
    static func clean(_ s: String) -> String { s.replacingOccurrences(of: "[\\t\\r\\n]+", with: " ", options: .regularExpression).trimmingCharacters(in: .whitespacesAndNewlines) }
    static func cell(_ s: String) -> String { s.contains("\"") || s.contains("\n") || s.contains("\t") ? "\"" + s.replacingOccurrences(of: "\"", with: "\"\"") + "\"" : s }
    /// "Notes in Plain Text" for Anki: Front = word, Back = ipa · meaning · example (HTML)
    public static func ankiText(cards: [JSON], deck: String) -> String {
        let rows = cards.filter { $0.t("word") }.map { c -> String in
            var back: [String] = []
            if c.t("ipa") { back.append(clean(c.s("ipa"))) }
            let m = Vocab.meanOf(c)
            if !m.isEmpty { back.append("<b>" + clean(m) + "</b>") }
            if c.t("ex") { back.append("<i>" + clean(c.s("ex")) + "</i>") }
            return [cell(clean(c.s("word"))), cell(back.joined(separator: "<br>"))].joined(separator: "\t")
        }
        return "#separator:tab\n#html:true\n#notetype:Basic\n#deck:" + clean(deck) + "\n#columns:Front\tBack\n" + rows.joined(separator: "\n") + "\n"
    }
    static func stripHTML(_ s: String) -> String {
        var t = s.replacingOccurrences(of: "<br\\s*/?>", with: " · ", options: [.regularExpression, .caseInsensitive])
        t = t.replacingOccurrences(of: "<[^>]*>", with: "", options: .regularExpression)
        for (a, b) in [("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "<"), ("&gt;", ">"), ("&quot;", "\"")] { t = t.replacingOccurrences(of: a, with: b) }
        return clean(t)
    }
    static func split(_ line: String, _ sep: Character) -> [String] {
        var out: [String] = [], cur = "", q = false
        var it = line.makeIterator()
        var pending: Character?
        while true {
            guard let ch = pending ?? it.next() else { break }
            pending = nil
            if q {
                if ch == "\"" { if let nx = it.next() { if nx == "\"" { cur.append("\"") } else { q = false; pending = nx } } else { q = false } } else { cur.append(ch) }
            } else if ch == "\"" && cur.isEmpty { q = true } else if ch == sep { out.append(cur); cur = "" } else { cur.append(ch) }
        }
        out.append(cur)
        return out
    }
    /// entries `{word, vi, def?, topic:"anki", deck}` from an Anki text / TSV / CSV export (first column = front, second = back); nothing else is kept.
    public static func parseAnki(_ text: String, defaultDeck: String) -> [JSON] {
        var deck = defaultDeck, sep: Character?
        var rows: [String] = []
        for raw in text.replacingOccurrences(of: "\r\n", with: "\n").split(separator: "\n", omittingEmptySubsequences: true) {
            let l = String(raw)
            if l.hasPrefix("#") {
                if l.hasPrefix("#separator:") {
                    switch l.dropFirst(11).lowercased() { case "tab": sep = "\t"; case "comma": sep = ","; case "semicolon": sep = ";"; case "pipe": sep = "|"; default: break }
                } else if l.hasPrefix("#deck:") { let d = clean(String(l.dropFirst(6))); if !d.isEmpty { deck = d } }
                continue
            }
            rows.append(l)
        }
        if sep == nil {
            var best: Character = "\t", bestScore = 0
            let sample = rows.prefix(20)
            for c in ["\t", ";", ",", "|"] as [Character] {
                let counts = sample.map { $0.filter { $0 == c }.count }
                let hit = counts.filter { $0 > 0 }.count
                let score = hit * 10 - Set(counts).count
                if hit > 0 && score > bestScore { best = c; bestScore = score }
            }
            sep = best
        }
        var seen = Set<String>(), out: [JSON] = []
        for (i, l) in rows.enumerated() {
            let cols = split(l, sep ?? "\t").map(stripHTML)
            guard let word = cols.first, !word.isEmpty, word.count <= 60 else { continue }
            if i == 0, ["word", "front", "từ"].contains(word.lowercased()) { continue }   // header row of a CSV
            let k = Vocab.keyOf(word)
            if seen.contains(k) { continue }
            seen.insert(k)
            out.append(.obj([("word", .string(word)), ("vi", .string(cols.count > 1 ? cols[1] : "")), ("topic", .string("anki")), ("deck", .string(deck))]))
        }
        return out
    }
}
