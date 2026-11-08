import Foundation
import SQLite3
import Compression
import CryptoKit
import LKSync

/// Anki interchange (port of the core of web/js/anki.js): a real `.apkg` (SQLite "collection.anki2", schema 11 + ZIP) with the branded "Lexkite (EN)" note type, and reading
/// `.apkg` / `.colpkg` / loose `collection.anki2`. Everything stays on the device. The note type id and the field list never change (a later export updates the same notes);
/// guids are fixed per word, so exporting again only updates the cards in Anki.
public enum AnkiKit {
    public enum Failure: Error, Equatable { case notAnki, newFormat, damaged, tooBig }

    public static let modelID: Int64 = 1_729_000_000_101
    public static let fieldNames = ["Word", "IPA", "Meaning", "Definition", "Example", "ExampleMeaning", "Collocations", "Audio"]
    /// the collection was "created" 10 years ago, so "today" = day 3650 and overdue cards keep a positive due
    public static let crtBack = 3650

    /// one card prepared for export
    public struct Item: Sendable {
        public var word: String, ipa: String, meaning: String, def: String, ex: String, exMeaning: String
        public var col: [String], tags: [String]
        public var srs: JSON?
        public init(word: String, ipa: String = "", meaning: String = "", def: String = "", ex: String = "", exMeaning: String = "", col: [String] = [], tags: [String] = [], srs: JSON? = nil) {
            self.word = word; self.ipa = ipa; self.meaning = meaning; self.def = def; self.ex = ex; self.exMeaning = exMeaning; self.col = col; self.tags = tags; self.srs = srs
        }
    }

    /// web `itemOf`: a saved card → the fields of the Anki note (`viMeanings`: the learner's meaning language is Vietnamese)
    public static func item(_ c: JSON, viMeanings: Bool) -> Item {
        let meaning = Vocab.meanOf(c)
        let ctx = c.list("contexts").first { $0.t("text") }, sent = c.list("sentences").first
        var ex = "", exMeaning = ""
        if let ctx {
            let t = ctx.s("text"); ex = t.count > 300 ? String(t.prefix(300)) + "…" : t
            exMeaning = viMeanings ? ctx.s("vi") : ""
        } else if c.t("ex") {
            ex = c.s("ex")
            exMeaning = viMeanings && sent?.s("en") == ex ? (sent?.s("vi") ?? "") : ""
        } else if let sent, sent.t("en") {
            ex = sent.s("en"); exMeaning = viMeanings ? sent.s("vi") : ""
        }
        let topic = c.s("topic")
        let tags = ["lexkite", topic != "mine" ? topic : "", c.s("level"), c.t("deck") ? "anki:" + c.s("deck") : ""].filter { !$0.isEmpty }
        return Item(word: c.s("word"), ipa: c.s("ipa"), meaning: meaning, def: c.t("def") && c.s("def") != meaning ? c.s("def") : "", ex: ex, exMeaning: exMeaning,
                    col: c.strs("col"), tags: tags, srs: c["srs"])
    }

    // MARK: small helpers
    static func escHtml(_ s: String) -> String {
        var o = ""
        for ch in s { switch ch { case "&": o += "&amp;"; case "<": o += "&lt;"; case ">": o += "&gt;"; case "\"": o += "&quot;"; default: o.append(ch) } }
        return o
    }
    static func fnv(_ s: String, seed: UInt32 = 0x811c9dc5) -> UInt32 { var h = seed; for u in s.utf16 { h ^= UInt32(u); h = h &* 0x01000193 }; return h }
    static func b62(_ n0: UInt32) -> String {
        let t = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz")
        var n = UInt64(n0), s = ""
        repeat { s = String(t[Int(n % 62)]) + s; n /= 62 } while n > 0
        return s
    }
    public static func guid(_ key: String) -> String { "lk" + b62(fnv(key)) + b62(fnv(key, seed: 0x9747b28c)) }
    static func deckID(_ name: String) -> Int64 { 1_600_000_000_000 + Int64(fnv("deck:" + name)) }
    static func tagSafe(_ s: String) -> String {
        let t = s.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\\s+", with: "_", options: .regularExpression).replacingOccurrences(of: "\"", with: "")
        return String(t.prefix(60))
    }
    static func highlight(_ ex: String, _ word: String) -> String {
        let e = escHtml(ex)
        guard !word.isEmpty, let re = try? NSRegularExpression(pattern: "\\b(" + NSRegularExpression.escapedPattern(for: escHtml(word)) + "\\w*)", options: .caseInsensitive) else { return e }
        return re.stringByReplacingMatches(in: e, range: NSRange(location: 0, length: (e as NSString).length), withTemplate: "<b>$1</b>")
    }
    static func checksum(_ s: String) -> Int64 {
        let h = Array(Insecure.SHA1.hash(data: Data(s.utf8)))
        return Int64((UInt32(h[0]) << 24) | (UInt32(h[1]) << 16) | (UInt32(h[2]) << 8) | UInt32(h[3]))
    }
    /// days since 1970 of the Anki day (a new day starts at 04:00 local time)
    static func ankiDay(_ ms: Int64, _ cal: Calendar) -> Int {
        let d = Date(timeIntervalSince1970: Double(ms - 4 * 3_600_000) / 1000)
        let c = cal.dateComponents([.year, .month, .day], from: d)
        var utc = Calendar(identifier: .gregorian); utc.timeZone = TimeZone(identifier: "UTC") ?? .current
        return Int(((utc.date(from: c) ?? d).timeIntervalSince1970 / 86_400).rounded())
    }

    struct Sched { var type = 0, queue = 0, due = 0, ivl = 0, factor = 0, reps = 0, lapses = 0; var data = "" }
    /// Lexkite review state → Anki card. A card still in learning steps (not yet in the day schedule) stays a new card.
    static func sched(_ srs: JSON?, now: Int64, pos: Int, retention: Double, cal: Calendar) -> Sched {
        guard let j = srs, j.isObject else { return Sched(due: pos) }
        let c = Vocab.srs(state: j)
        func r4(_ x: Double) -> Double { (x * 1e4).rounded() / 1e4 }
        let mem = c.S != nil && c.D != nil ? JSON.obj([("s", .number(r4(c.S ?? 0))), ("d", .number(r4(c.D ?? 0))), ("dr", .number(retention))]).stableString : ""
        if c.reps > 0 || (c.lapses > 0 && c.S != nil) {
            let today = ankiDay(now, cal), dueDay = c.reps > 0 ? ankiDay(c.due != 0 ? c.due : now, cal) : today
            let base = c.reps > 0 ? (c.interval > 0 ? Double(c.interval) : (c.S ?? 1)) : max(1, c.S ?? 1)
            let ef = c.D.map { 1.3 + (10 - $0) / 5 } ?? (c.ef > 0 ? c.ef : 2.5)
            return Sched(type: 2, queue: 2, due: crtBack + (dueDay - today), ivl: max(1, Int(base.rounded())), factor: Int((min(3.1, max(1.3, ef)) * 1000).rounded()),
                         reps: c.reps + c.lapses, lapses: c.lapses, data: mem)
        }
        return Sched(due: pos)
    }

    // MARK: export
    private static let css = #"""
.card{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;font-size:20px;line-height:1.5;text-align:center;color:rgb(23,24,39);background:rgb(255,247,234);margin:0;padding:12px}
.lk-card,.lk-back{max-width:560px;margin:12px auto;background:rgb(255,255,255);border-radius:22px;box-shadow:0 10px 30px rgba(15,61,62,.12);box-sizing:border-box}
.lk-card{padding:22px 20px 18px;border-top:6px solid rgb(15,61,62)}
.lk-brand{font-size:.62em;font-weight:800;letter-spacing:.04em;color:rgb(15,61,62);opacity:.6;margin-bottom:8px}.lk-brand b{color:rgb(204,63,28)}
.lk-word{font-size:2.1em;font-weight:800;color:rgb(15,61,62);line-height:1.15;word-break:break-word}
.lk-ipa{font-family:"Lucida Sans Unicode","Arial Unicode MS","Segoe UI",sans-serif;color:rgb(78,82,107);margin-top:6px;font-size:.95em}
.lk-audio{margin-top:8px}
hr#answer{border:0;height:0;margin:0}
.lk-back{padding:18px 20px;text-align:start}
.lk-meaning{font-size:1.3em;font-weight:800;color:rgb(176,55,24);text-align:center;word-break:break-word}
.lk-def{color:rgb(78,82,107);font-size:.82em;text-align:center;margin-top:4px}
.lk-ex{margin-top:14px;padding:10px 14px;border-left:4px solid rgb(255,176,84);background:rgb(255,247,234);border-radius:10px;font-size:.88em}
.lk-ex-en{font-style:italic}.lk-ex-en b{color:rgb(13,105,100);font-style:normal}
.lk-ex-tr{color:rgb(78,82,107);margin-top:4px;font-size:.92em}
.lk-col{margin-top:12px;font-size:.84em}
.lk-lbl{display:inline-block;font-size:.72em;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:rgb(13,105,100);background:rgb(221,241,238);padding:2px 9px;border-radius:99px;margin-right:6px;vertical-align:1px}
.nightMode.card,.night_mode.card,.nightMode .card,.night_mode .card{background:rgb(16,25,27);color:rgb(243,248,248)}
.nightMode .lk-card,.night_mode .lk-card,.nightMode .lk-back,.night_mode .lk-back{background:rgb(23,36,39);box-shadow:none;border-color:rgb(95,208,196)}
.nightMode .lk-word,.night_mode .lk-word,.nightMode .lk-brand,.night_mode .lk-brand{color:rgb(95,208,196)}
.nightMode .lk-brand b,.night_mode .lk-brand b{color:rgb(255,132,102)}
.nightMode .lk-ipa,.night_mode .lk-ipa,.nightMode .lk-def,.night_mode .lk-def,.nightMode .lk-ex-tr,.night_mode .lk-ex-tr{color:rgb(163,185,183)}
.nightMode .lk-meaning,.night_mode .lk-meaning{color:rgb(255,132,102)}
.nightMode .lk-ex,.night_mode .lk-ex{background:rgb(30,47,51)}
.nightMode .lk-ex-en b,.night_mode .lk-ex-en b{color:rgb(95,208,196)}
.nightMode .lk-lbl,.night_mode .lk-lbl{color:rgb(95,208,196);background:rgb(30,47,51)}
"""#
    private static let qfmt = #"<div class="lk-card"><div class="lk-brand">lex<b>kite</b></div><div class="lk-word">{{Word}}</div>{{#IPA}}<div class="lk-ipa">{{IPA}}</div>{{/IPA}}<div class="lk-audio">{{#Audio}}{{Audio}}{{/Audio}}{{^Audio}}{{tts en_GB:Word}}{{/Audio}}</div></div>"#
    private static func afmt(_ label: String) -> String {
        #"{{FrontSide}}<hr id="answer"><div class="lk-back"><div class="lk-meaning">{{Meaning}}</div>{{#Definition}}<div class="lk-def">{{Definition}}</div>{{/Definition}}{{#Example}}<div class="lk-ex"><div class="lk-ex-en">{{Example}}</div>{{#ExampleMeaning}}<div class="lk-ex-tr">{{ExampleMeaning}}</div>{{/ExampleMeaning}}</div>{{/Example}}{{#Collocations}}<div class="lk-col"><span class="lk-lbl">"# + escHtml(label) + #"</span>{{Collocations}}</div>{{/Collocations}}</div>"#
    }

    private enum Bind { case int(Int64), text(String) }
    private static let transient = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    private final class DB {
        var h: OpaquePointer?
        init(path: String, readOnly: Bool) throws {
            let flags = readOnly ? SQLITE_OPEN_READONLY : (SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE)
            guard sqlite3_open_v2(path, &h, flags, nil) == SQLITE_OK else { sqlite3_close(h); throw Failure.damaged }
        }
        deinit { sqlite3_close(h) }
        func exec(_ sql: String) throws { guard sqlite3_exec(h, sql, nil, nil, nil) == SQLITE_OK else { throw Failure.damaged } }
        func insert(_ table: String, _ rows: [[Bind]]) throws {
            guard let first = rows.first else { return }
            var st: OpaquePointer?
            guard sqlite3_prepare_v2(h, "INSERT INTO \(table) VALUES (" + Array(repeating: "?", count: first.count).joined(separator: ",") + ")", -1, &st, nil) == SQLITE_OK else { throw Failure.damaged }
            defer { sqlite3_finalize(st) }
            for r in rows {
                sqlite3_reset(st); sqlite3_clear_bindings(st)
                for (i, v) in r.enumerated() {
                    switch v {
                    case .int(let n): sqlite3_bind_int64(st, Int32(i + 1), n)
                    case .text(let s): sqlite3_bind_text(st, Int32(i + 1), s, -1, AnkiKit.transient)
                    }
                }
                guard sqlite3_step(st) == SQLITE_DONE else { throw Failure.damaged }
            }
        }
        /// every row as strings (NULL → "")
        func rows(_ sql: String) -> [[String]] {
            var st: OpaquePointer?
            guard sqlite3_prepare_v2(h, sql, -1, &st, nil) == SQLITE_OK else { return [] }
            defer { sqlite3_finalize(st) }
            var out: [[String]] = []
            while sqlite3_step(st) == SQLITE_ROW {
                out.append((0..<sqlite3_column_count(st)).map { i in sqlite3_column_text(st, i).map { String(cString: $0) } ?? "" })
            }
            return out
        }
        func tables() -> Set<String> { Set(rows("SELECT name FROM sqlite_master WHERE type='table'").compactMap { $0.first }) }
    }
    private static func tempPath(_ ext: String) -> String { NSTemporaryDirectory() + "lk-" + UUID().uuidString + "." + ext }

    /// Build the `.apkg` bytes. `progress` is called with 0…1.
    public static func buildApkg(_ items: [Item], deckName: String = "Lexkite", keepProgress: Bool = false, retention: Double = 0.9, collocationsLabel: String = "Collocations",
                                 now: Int64, calendar: Calendar = .current, progress: ((Double) -> Void)? = nil) throws -> (data: Data, count: Int) {
        let sec = now / 1000, did = deckID(deckName)
        var crt = calendar.date(byAdding: .day, value: -crtBack, to: Date(timeIntervalSince1970: Double(now - 4 * 3_600_000) / 1000)) ?? Date()
        crt = calendar.date(bySettingHour: 12, minute: 0, second: 0, of: crt) ?? crt
        var seen = Set<String>(), id = now - Int64(items.count) * 2 - 10
        var notes: [[Bind]] = [], cards: [[Bind]] = []
        for (i, it) in items.enumerated() {
            let word = it.word.trimmingCharacters(in: .whitespacesAndNewlines)
            let key = word.lowercased()
            guard !word.isEmpty, seen.insert(key).inserted else { continue }
            let flds = [escHtml(word), escHtml(it.ipa), escHtml(it.meaning), escHtml(it.def), highlight(it.ex, word), escHtml(it.exMeaning), it.col.map(escHtml).joined(separator: " · "), ""]
            id += 1; let nid = id; id += 1; let cid = id
            var tags: [String] = []
            for t in it.tags.map(tagSafe) where !t.isEmpty && !tags.contains(t) { tags.append(t) }
            notes.append([.int(nid), .text(guid(key)), .int(modelID), .int(sec), .int(-1), .text(tags.isEmpty ? "" : " " + tags.joined(separator: " ") + " "),
                          .text(flds.joined(separator: "\u{1F}")), .text(word), .int(checksum(word)), .int(0), .text("")])
            let sc = sched(keepProgress ? it.srs : nil, now: now, pos: notes.count, retention: retention, cal: calendar)
            cards.append([.int(cid), .int(nid), .int(did), .int(0), .int(sec), .int(-1), .int(Int64(sc.type)), .int(Int64(sc.queue)), .int(Int64(sc.due)), .int(Int64(sc.ivl)), .int(Int64(sc.factor)),
                          .int(Int64(sc.reps)), .int(Int64(sc.lapses)), .int(0), .int(0), .int(0), .int(0), .text(sc.data)])
            if i % 500 == 0 { progress?(Double(i) / Double(max(1, items.count))) }
        }
        func num(_ n: Int) -> JSON { .number(Double(n)) }
        let tz = calendar.timeZone
        let conf = JSON.obj([("activeDecks", .array([.number(Double(did))])), ("curDeck", .number(Double(did))), ("newSpread", num(0)), ("collapseTime", num(1200)), ("timeLim", num(0)), ("estTimes", .bool(true)),
                             ("dueCounts", .bool(true)), ("curModel", .number(Double(modelID))), ("nextPos", num(notes.count + 1)), ("sortType", "noteFld"), ("sortBackwards", .bool(false)), ("addToCur", .bool(true)),
                             ("schedVer", num(2)), ("sched2021", .bool(true)), ("rollover", num(4)), ("creationOffset", num(-tz.secondsFromGMT(for: crt) / 60)), ("localOffset", num(-tz.secondsFromGMT(for: Date(timeIntervalSince1970: Double(sec))) / 60))])
        let flds: [JSON] = fieldNames.enumerated().map { (ord, name) in
            .obj([("name", .string(name)), ("ord", num(ord)), ("sticky", .bool(false)), ("rtl", .bool(false)), ("font", "Arial"), ("size", num(20)), ("media", .array([])), ("description", "")])
        }
        let tmpl: JSON = .obj([("name", "Word → Meaning"), ("ord", num(0)), ("qfmt", .string(qfmt)), ("afmt", .string(afmt(collocationsLabel))), ("bqfmt", ""), ("bafmt", ""), ("did", .null), ("bfont", ""), ("bsize", num(0))])
        let model = JSON.obj([("id", .number(Double(modelID))), ("name", "Lexkite (EN)"), ("type", num(0)), ("mod", .number(Double(sec))), ("usn", num(-1)), ("sortf", num(0)), ("did", .number(Double(did))),
                              ("tags", .array([])), ("vers", .array([])), ("req", .array([.array([num(0), "any", .array([num(0)])])])), ("latexsvg", .bool(false)),
                              ("latexPre", "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n"),
                              ("latexPost", "\\end{document}"), ("flds", .array(flds)), ("tmpls", .array([tmpl])), ("css", .string(css))])
        func deck(_ i: Int64, _ name: String) -> JSON {
            .obj([("id", .number(Double(i))), ("name", .string(name)), ("mod", .number(Double(sec))), ("usn", num(-1)), ("lrnToday", .array([num(0), num(0)])), ("revToday", .array([num(0), num(0)])),
                  ("newToday", .array([num(0), num(0)])), ("timeToday", .array([num(0), num(0)])), ("collapsed", .bool(false)), ("browserCollapsed", .bool(false)), ("desc", ""), ("dyn", num(0)), ("conf", num(1)),
                  ("extendNew", num(0)), ("extendRev", num(0))])
        }
        let dconf = JSON.obj([("1", .obj([("id", num(1)), ("name", "Default"), ("mod", num(0)), ("usn", num(0)), ("maxTaken", num(60)), ("autoplay", .bool(true)), ("timer", num(0)), ("replayq", .bool(true)), ("dyn", .bool(false)),
            ("new", .obj([("delays", .array([num(1), num(10)])), ("ints", .array([num(1), num(4), num(0)])), ("initialFactor", num(2500)), ("order", num(1)), ("perDay", num(20)), ("bury", .bool(false))])),
            ("lapse", .obj([("delays", .array([num(10)])), ("mult", num(0)), ("minInt", num(1)), ("leechFails", num(8)), ("leechAction", num(1))])),
            ("rev", .obj([("perDay", num(200)), ("ease4", .number(1.3)), ("ivlFct", num(1)), ("maxIvl", num(36500)), ("bury", .bool(false)), ("hardFactor", .number(1.2))]))]))])
        let decks = JSON.obj([("1", deck(1, "Default")), (String(did), deck(did, deckName))])
        let path = tempPath("anki2")
        defer { try? FileManager.default.removeItem(atPath: path) }
        do {
            let db = try DB(path: path, readOnly: false)
            try db.exec("PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; BEGIN;")
            try db.exec("CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null)")
            try db.exec("CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null)")
            try db.exec("CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null)")
            try db.exec("CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null)")
            try db.exec("CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null)")
            try db.insert("col", [[.int(1), .int(Int64(crt.timeIntervalSince1970)), .int(now), .int(now), .int(11), .int(0), .int(0), .int(0), .text(conf.stableString),
                                   .text(JSON.obj([(String(modelID), model)]).stableString), .text(decks.stableString), .text(dconf.stableString), .text("{}")]])
            try db.insert("notes", notes)
            try db.insert("cards", cards)
            try db.exec("COMMIT;")
        }
        progress?(1)
        guard let bytes = try? Data(contentsOf: URL(fileURLWithPath: path)) else { throw Failure.damaged }
        return (zipWrite([("collection.anki2", bytes), ("media", Data("{}".utf8))], now: now), notes.count)
    }

    /// CSV for spreadsheets (BOM so Excel reads UTF-8)
    public static func csv(_ items: [Item], head: [String]? = nil) -> String {
        func cell(_ s: String) -> String { s.contains(where: { "\",\n\r".contains($0) }) || s != s.trimmingCharacters(in: .whitespaces) ? "\"" + s.replacingOccurrences(of: "\"", with: "\"\"") + "\"" : s }
        let h = head ?? ["Word", "IPA", "Meaning", "Definition", "Example", "Example meaning", "Collocations", "Tags"]
        let rows = items.filter { !$0.word.isEmpty }.map { [$0.word, $0.ipa, $0.meaning, $0.def, $0.ex, $0.exMeaning, $0.col.joined(separator: "; "), $0.tags.map(tagSafe).joined(separator: " ")].map(cell).joined(separator: ",") }
        return "\u{FEFF}" + h.map(cell).joined(separator: ",") + "\r\n" + rows.joined(separator: "\r\n") + "\r\n"
    }

    // MARK: ZIP
    static let crcTable: [UInt32] = (0..<256).map { n -> UInt32 in var c = UInt32(n); for _ in 0..<8 { c = c & 1 != 0 ? 0xEDB88320 ^ (c >> 1) : c >> 1 }; return c }
    static func crc32(_ d: Data) -> UInt32 { var c: UInt32 = 0xFFFF_FFFF; for b in d { c = crcTable[Int((c ^ UInt32(b)) & 0xFF)] ^ (c >> 8) }; return c ^ 0xFFFF_FFFF }
    /// ZIP with stored entries (the media of a Lexkite package is empty; the collection is small)
    public static func zipWrite(_ files: [(name: String, data: Data)], now: Int64) -> Data {
        let d = Date(timeIntervalSince1970: Double(now) / 1000)
        let c = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute, .second], from: d)
        let hh = c.hour ?? 0, mi = c.minute ?? 0, se = c.second ?? 0, yy = min(127, max(0, (c.year ?? 1980) - 1980)), mo = c.month ?? 1, dd = c.day ?? 1
        let dosTime = UInt16((hh << 11) | (mi << 5) | (se >> 1)), dosDate = UInt16((yy << 9) | (mo << 5) | dd)
        var out = Data(), central = Data()
        func le16(_ v: UInt16) -> [UInt8] { [UInt8(v & 0xFF), UInt8(v >> 8)] }
        func le32(_ v: UInt32) -> [UInt8] { [UInt8(v & 0xFF), UInt8((v >> 8) & 0xFF), UInt8((v >> 16) & 0xFF), UInt8(v >> 24)] }
        func pack(_ parts: [UInt8]...) -> Data { Data(parts.flatMap { $0 }) }
        for f in files {
            let name = Data(f.name.utf8), crc = crc32(f.data), off = UInt32(out.count), size = UInt32(f.data.count), nl = UInt16(name.count)
            out.append(pack(le32(0x04034b50), le16(20), le16(0x0800), le16(0), le16(dosTime), le16(dosDate), le32(crc), le32(size), le32(size), le16(nl), le16(0)))
            out.append(name); out.append(f.data)
            central.append(pack(le32(0x02014b50), le16(20), le16(20), le16(0x0800), le16(0), le16(dosTime), le16(dosDate), le32(crc), le32(size), le32(size),
                                le16(nl), le16(0), le16(0), le16(0), le16(0), le32(0), le32(off)))
            central.append(name)
        }
        let cdOff = UInt32(out.count)
        out.append(central)
        out.append(pack(le32(0x06054b50), le16(0), le16(0), le16(UInt16(files.count)), le16(UInt16(files.count)), le32(UInt32(central.count)), le32(cdOff), le16(0)))
        return out
    }
    /// the named entries of a ZIP (stored or deflated); nil when it is not a ZIP
    public static func zipRead(_ zip: Data, only names: Set<String>) -> [String: Data]? {
        let b = [UInt8](zip)
        func u16(_ p: Int) -> Int { Int(b[p]) | Int(b[p + 1]) << 8 }
        func u32(_ p: Int) -> Int { Int(b[p]) | Int(b[p + 1]) << 8 | Int(b[p + 2]) << 16 | Int(b[p + 3]) << 24 }
        guard b.count >= 22 else { return nil }
        var e = -1, p = b.count - 22
        while p >= max(0, b.count - 65_557) { if u32(p) == 0x06054b50 { e = p; break }; p -= 1 }
        guard e >= 0 else { return nil }
        let count = u16(e + 10), cdOff = u32(e + 16)
        var out: [String: Data] = [:], q = cdOff
        for _ in 0..<count {
            guard q + 46 <= b.count, u32(q) == 0x02014b50 else { break }
            let method = u16(q + 10), csize = u32(q + 20), usize = u32(q + 24), nl = u16(q + 28), xl = u16(q + 30), cl = u16(q + 32), lho = u32(q + 42)
            guard q + 46 + nl <= b.count else { break }
            let name = String(decoding: b[(q + 46)..<(q + 46 + nl)], as: UTF8.self)
            q += 46 + nl + xl + cl
            guard names.contains(name), lho + 30 <= b.count, u32(lho) == 0x04034b50 else { continue }
            let start = lho + 30 + u16(lho + 26) + u16(lho + 28)
            guard start + csize <= b.count, usize < 400_000_000 else { continue }
            let raw = Data(b[start..<(start + csize)])
            if method == 0 { out[name] = raw }
            else if method == 8 {
                let cap = max(1, usize)
                var dst = [UInt8](repeating: 0, count: cap)
                let n = raw.withUnsafeBytes { src -> Int in
                    guard let sp = src.bindMemory(to: UInt8.self).baseAddress else { return 0 }
                    return compression_decode_buffer(&dst, cap, sp, raw.count, nil, COMPRESSION_ZLIB)
                }
                if n > 0 { out[name] = Data(dst.prefix(n)) }
            }
        }
        return out
    }

    // MARK: import
    /// notes of an Anki collection, ready for column mapping
    public struct NoteSet: Sendable {
        public var deck: String
        /// field names of the most common note type
        public var columns: [String]
        public var rows: [Row]
        public struct Row: Sendable { public var cells: [String], tags: [String], deck: String }
    }
    public static func parsePackage(_ data: Data) throws -> NoteSet {
        let raw: Data
        if data.starts(with: Array("SQLite".utf8)) { raw = data }
        else {
            guard let z = zipRead(data, only: ["collection.anki21b", "collection.anki21", "collection.anki2"]) else { throw Failure.notAnki }
            if let d = z["collection.anki21"] ?? z["collection.anki2"] { raw = d }
            else if z["collection.anki21b"] != nil { throw Failure.newFormat }
            else { throw Failure.notAnki }
        }
        let path = tempPath("anki2")
        defer { try? FileManager.default.removeItem(atPath: path) }
        guard (try? raw.write(to: URL(fileURLWithPath: path))) != nil else { throw Failure.damaged }
        let db = try DB(path: path, readOnly: true)
        guard db.tables().contains("notes") else { throw Failure.notAnki }
        var models: [Int64: [String]] = [:], decks: [Int64: String] = [:]
        if let col = db.rows("SELECT models, decks FROM col").first, col.count == 2 {
            if let m = (try? JSON.parse(col[0]))?.object {
                for (_, v) in m { if let id = v.int64 ?? Int64(v.s("id")) { models[id] = v.list("flds").sorted { $0.i("ord") < $1.i("ord") }.map { $0.s("name") } } }
            }
            if let d = (try? JSON.parse(col[1]))?.object { for (_, v) in d { if let id = v.int64 ?? Int64(v.s("id")) { decks[id] = v.s("name") } } }
        }
        var deckOfNote: [Int64: Int64] = [:]
        for r in db.rows("SELECT nid, did, odid FROM cards") where r.count == 3 {
            if let nid = Int64(r[0]), deckOfNote[nid] == nil { let odid = Int64(r[2]) ?? 0; deckOfNote[nid] = odid != 0 ? odid : Int64(r[1]) }
        }
        let notes = db.rows("SELECT id, mid, tags, flds FROM notes")
        var perModel: [Int64: Int] = [:], perDeck: [String: Int] = [:]
        var rows: [NoteSet.Row] = []
        for n in notes where n.count == 4 {
            let nid = Int64(n[0]) ?? 0, mid = Int64(n[1]) ?? 0
            perModel[mid, default: 0] += 1
            let dn = deckOfNote[nid].flatMap { decks[$0] } ?? ""
            if !dn.isEmpty { perDeck[dn, default: 0] += 1 }
            rows.append(NoteSet.Row(cells: n[3].components(separatedBy: "\u{1F}"), tags: n[2].split(whereSeparator: { $0.isWhitespace }).map(String.init), deck: dn))
        }
        let main = perModel.max { $0.value < $1.value }?.key
        let fields = main.flatMap { models[$0] } ?? []
        let width = max(fields.count, rows.prefix(500).map { $0.cells.count }.max() ?? 0)
        let deck = perDeck.filter { $0.key != "Default" }.max { $0.value < $1.value }?.key ?? ""
        return NoteSet(deck: deck, columns: (0..<width).map { $0 < fields.count ? fields[$0] : "" }, rows: rows)
    }

    /// which column holds the word / meaning / example / IPA (names first, then the first free columns)
    public struct ColumnMap: Equatable, Sendable { public var word = -1; public var mean = -1; public var ex = -1; public var ipa = -1
        public init() {} }
    public static func guessMap(_ columns: [String]) -> ColumnMap {
        let cols = columns.map { $0.lowercased() }
        func find(_ re: String) -> Int { cols.firstIndex { $0.range(of: re, options: .regularExpression) != nil } ?? -1 }
        var m = ColumnMap()
        m.word = find("^(word|words|term|front|vocab|vocabulary|english|expression|headword|từ|từ vựng|单词|単語|단어)$"); if m.word < 0 { m.word = find("word|front|term|vocab|expression|từ") }
        m.mean = find("^(meaning|meanings|back|definition|translation|nghĩa|vietnamese|tiếng việt)$"); if m.mean < 0 { m.mean = find("mean|back|defin|transl|nghĩa") }
        m.ex = find("example|sentence|context|ví dụ|câu")
        m.ipa = find("^(ipa|pronunciation|phonetic|phonetics|reading|phiên âm)$")
        func free() -> Int { (0..<cols.count).first { ![m.word, m.mean, m.ex, m.ipa].contains($0) } ?? -1 }
        if m.word < 0 { m.word = free() }
        if m.mean < 0 { m.mean = free() }
        if m.word == m.mean { m.mean = -1 }
        if m.ex == m.word || m.ex == m.mean { m.ex = -1 }
        if m.ipa == m.word || m.ipa == m.mean { m.ipa = -1 }
        return m
    }
    /// card HTML → plain text (tags, sounds and cloze marks removed; line breaks become " · ")
    public static func htmlToText(_ s0: String, sep: String = " · ") -> String {
        var s = String(s0.prefix(20_000))
        func rx(_ re: String, _ w: String) { s = s.replacingOccurrences(of: re, with: w, options: [.regularExpression, .caseInsensitive]) }
        rx("<(script|style|template|iframe|object|svg|math|noscript|head|title)\\b[\\s\\S]*?</\\1\\s*>", " ")
        rx("<!--[\\s\\S]*?(-->|$)", " ")
        rx("<br\\s*/?>|</(div|p|li|tr|h[1-6]|blockquote)\\s*>|<(li|tr)\\b[^>]*>", "\n")
        rx("</?[a-z!/?][^>]*>", ""); rx("<[a-z!/?][^>]*$", "")
        rx("\\[sound:[^\\]]*\\]", "")
        rx("\\{\\{c\\d+::([\\s\\S]*?)(?:::[\\s\\S]*?)?\\}\\}", "$1")
        for (a, b) in [("&nbsp;", " "), ("&amp;", "&"), ("&lt;", "‹"), ("&gt;", "›"), ("&quot;", "\""), ("&#39;", "'"), ("&apos;", "'")] { s = s.replacingOccurrences(of: a, with: b) }
        return s.components(separatedBy: .newlines).map { $0.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ") }.filter { !$0.isEmpty }.joined(separator: sep)
    }
    public struct Plan: Sendable { public var entries: [JSON]; public var duplicates: Int; public var invalid: Int
        public init(entries: [JSON], duplicates: Int, invalid: Int) { self.entries = entries; self.duplicates = duplicates; self.invalid = invalid } }
    /// the words that would be imported (web `planImport`): valid, not yet saved, not repeated in the file
    public static func plan(_ set: NoteSet, map: ColumnMap, existing: Set<String>, limit: Int = 20_000) -> Plan {
        var out: [JSON] = [], seen = Set<String>(), dup = 0, bad = 0
        func cell(_ r: NoteSet.Row, _ k: Int) -> String { k >= 0 && k < r.cells.count ? htmlToText(r.cells[k]) : "" }
        for r in set.rows {
            let word = cell(r, map.word).components(separatedBy: " · ").first?.trimmingCharacters(in: .whitespaces) ?? ""
            if word.isEmpty || word.count > 80 || word.range(of: "[a-z]", options: [.regularExpression, .caseInsensitive]) == nil { bad += 1; continue }
            let key = Vocab.keyOf(word)
            if existing.contains(key) || seen.contains(key) { dup += 1; continue }
            if out.count >= limit { bad += 1; continue }
            seen.insert(key)
            out.append(.obj([("word", .string(word)), ("vi", .string(String(cell(r, map.mean).prefix(300)))), ("ex", .string(String(cell(r, map.ex).prefix(400)))),
                             ("ipa", .string(String(cell(r, map.ipa).prefix(80)))), ("topic", "anki"), ("deck", .string(set.deck))]))
        }
        return Plan(entries: out, duplicates: dup, invalid: bad)
    }
}
