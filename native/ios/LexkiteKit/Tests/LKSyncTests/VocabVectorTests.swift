import Foundation
import XCTest
@testable import LKSync
@testable import LKStore
@testable import LKCore

/// M3 vocabulary logic (parity P04/P05): the native port (LKStore/Vocab) against vectors/vocab.json, produced by running the REAL web code
/// (scripts/native/gen-vocab.mjs; schema docs/specs/native-m2-vectors.md "M3 vectors"). One test per key of the file.
/// The real records the screens need are carried by the vectors themselves (`data.catalog` = mini word library, `data.writing` = ideas/letters/paraphrase/models/prompts/task1 sets);
/// the rest comes from the repo: content-pack/starter.json, web/js/usage/*.js, native/shared/gen/verbs.json (conjugation + example tables, VI_TYPO, lemmatizer, grammar forms). Nothing is skipped.
final class VocabVectorTests: XCTestCase {
    struct R {
        var checked = 0
        var failures: [String] = []
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) { checked += 1; if !ok { if failures.count < 25 { failures.append(s()) } else if failures.count == 25 { failures.append("…") } } }
        mutating func diff(_ a: JSON?, _ b: JSON?, _ label: String) { let d = jsonDiff(a, b); check(d == nil, "\(label): \(d ?? "")") }
        mutating func eq<T: Equatable>(_ a: T, _ b: T, _ label: String) { check(a == b, "\(label): \(a) ≠ \(b)") }
    }
    func finish(_ r: R, _ name: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThan(r.checked, 0, "\(name): nothing checked", file: file, line: line)
        XCTAssertTrue(r.failures.isEmpty, "\(name): \(r.failures.count) of \(r.checked) failed:\n" + r.failures.joined(separator: "\n"), file: file, line: line)
    }

    // MARK: fixtures
    static var utc: Calendar { var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!; return c }
    var clock: VocabClock { VocabClock(calendar: Self.utc) }
    static var cachedV: JSON?
    func vec() throws -> JSON { if let v = Self.cachedV { return v }; let v = try Vectors.load("vocab.json"); Self.cachedV = v; return v }
    func now(_ V: JSON) -> Int64 { Int64(V["now"]?.double ?? 0) }
    static let day: Int64 = 86_400_000, min: Int64 = 60_000
    /// repo root (the vectors live in native/shared/gen/vectors)
    static var root: URL { Vectors.dir.appendingPathComponent("../../../..").standardized }
    func readFile(_ rel: String) throws -> String { try String(contentsOf: Self.root.appendingPathComponent(rel), encoding: .utf8) }
    func readJSON(_ rel: String) throws -> JSON { try JSON.parse(Data(contentsOf: Self.root.appendingPathComponent(rel))) }

    /// web `keyed(E, list)`: later duplicates replace the value but keep the first position
    func keyed(_ list: [JSON]) -> [JSON] {
        var order: [String] = [], m: [String: JSON] = [:]
        for c in list { let k = Vocab.cardKey(c); if m[k] == nil { order.append(k) }; m[k] = c }
        return order.map { m[$0]! }
    }
    func deck(_ name: String, _ V: JSON) -> [JSON] {
        let A = V["inputs"]?["A"]?.array ?? [], B = V["inputs"]?["B"]?.array ?? [], n = now(V)
        switch name {
        case "A": return keyed(A)
        case "B": return keyed(B)
        case "P": return keyed(A + B)
        case "tiny": return keyed(Array(A[6..<8]))
        case "none": return []
        case "future": return keyed(A.filter { ($0["srs"]?.d("last") ?? 0) != 0 && ($0["srs"]?.d("due") ?? 0) > Double(n + Self.day) })
        case "forget":
            return keyed(A.prefix(4).enumerated().map { i, c in
                guard i < 2 else { return c }
                var s = c["srs"]?.object ?? [:]
                s["reps"] = 3; s["interval"] = 30; s["S"] = 5; s["last"] = .number(Double(n - 25 * Self.day)); s["due"] = .number(Double(n - 5 * Self.day))
                var o = c; o["srs"] = .object(s); return o
            })
        default: return []
        }
    }
    var starterTopics: [String: JSON] { get { (try? readJSON("native/shared/gen/content-pack/starter.json"))?["topics"]?.object ?? [:] } }
    /// the real library cut down (vocab.json `data.catalog`) and the reduced writing content (`data.writing`)
    func miniCatalog(_ V: JSON) -> TopicCatalog { TopicCatalog(json: V["data"]?["catalog"] ?? .null) }
    func miniWriting(_ V: JSON) -> JSON { V["data"]?["writing"] ?? .null }
    func qparam(_ qs: String, _ k: String) -> String? { qs.split(separator: "&").first { $0.hasPrefix(k + "=") }.map { String($0.dropFirst(k.count + 1)) } }
    func viTypo() throws -> [String: String] { Dict.viTypo(from: try readJSON("native/shared/gen/verbs.json")) }
    func catalog() -> TopicCatalog {
        TopicCatalog(topics: ["education", "environment", "technology"].compactMap { id in
            starterTopics[id].map { TopicCatalog.Topic(id: id, group: "topics", name: id, words: $0.array ?? []) } })
    }

    // MARK: #/review
    func testReviewQueue() throws {
        let V = try vec(); var r = R()
        for c in V["review"]?.array ?? [] {
            let inp = c["input"]!, out = c["out"]!, id = c.s("id")
            let seen = (inp["seen"]?.object ?? [:]).compactMapValues { $0.double }
            let (start, st) = ReviewEngine.open(cards: deck(inp.s("deck"), V), settings: inp["settings"] ?? [:], stats: inp["stats"] ?? [:], seen: seen,
                                                query: ReviewEngine.Query(inp.s("query")), now: now(V), clock: clock)
            let state = start == .redirectForgetting ? "redirect" : start.rawValue
            r.eq(state, out.s("state"), "review \(id) state")
            r.eq(st.session.queue, out.strs("queue"), "review \(id) queue")
            r.eq(st.session.total, out.i("total"), "review \(id) total")
            r.eq(start == .redirectForgetting ? "#/practice/learn?src=forgetting" : "#/review", out.s("hash"), "review \(id) hash")
        }
        finish(r, "review")
    }

    func testReviewSession() throws {
        let V = try vec(); var r = R()
        let n = now(V), today = clock.todayKey(n)
        for s in V["reviewSession"]?.array ?? [] {
            let inp = s["input"]!, id = s.s("id")
            let seen = (inp["seen"]?.object ?? [:]).compactMapValues { $0.double }
            var st = ReviewEngine.open(cards: deck(inp.s("deck"), V), settings: inp["settings"] ?? [:], stats: inp["stats"] ?? [:], seen: seen, query: ReviewEngine.Query(inp.s("query")), now: n, clock: clock).state
            func sessionFields() -> [(String, JSON)] {
                [("queue", .strings(st.session.queue)), ("done", .int(st.session.done)), ("again", .int(st.session.again)), ("missed", .strings(st.session.missed)),
                 ("xp", .int(st.session.xp)), ("g", .array(st.session.g.map { .int($0) })), ("total", .int(st.session.total))]
            }
            var steps: [JSON] = []
            for step in s["script"]?.array ?? [] {
                guard let w = st.session.queue.first else { break }
                let statsDay: () -> JSON = { .number(JSON.orZero(st.stats["days"]?[today])) }
                if step.string == "undo" {
                    st.undo(now: n)
                    var f: [(String, JSON)] = [("op", "undo"), ("word", .string(w))]
                    f += sessionFields()
                    f += [("srs", Vocab.srsView(st.cards[st.session.queue[0]]!)), ("statsDay", statsDay()), ("newToday", st.stats["newToday"] ?? .null), ("xpGame", .null)]
                    steps.append(.obj(f))
                } else {
                    let g = Int(step.double ?? 0), wasNew = Vocab.isNew(st.cards[w]!)
                    st.grade(g, now: n)
                    var f: [(String, JSON)] = [("op", "grade"), ("grade", .int(g)), ("word", .string(w)), ("wasNew", .bool(wasNew))]
                    f += sessionFields()
                    f += [("srs", Vocab.srsView(st.cards[w]!)), ("statsDay", statsDay()), ("newToday", st.stats["newToday"] ?? .null), ("summary", .bool(st.session.queue.isEmpty))]
                    steps.append(.obj(f))
                }
            }
            r.diff(.array(steps), s["steps"], "session \(id)")
        }
        finish(r, "reviewSession")
    }

    func testReviewModes() throws {
        let V = try vec(), M = V["reviewModes"]!; var r = R()
        r.eq(StudyModes.modes, M.strs("modes"), "modes")
        let P = deck("P", V), n = now(V)
        func card(_ srs: JSON, extra: [(String, JSON)] = []) -> JSON {
            var base: [String: JSON] = ["reps": 3, "lapses": 0, "D": 4, "S": 5, "last": .number(Double(n - Self.day)), "interval": 4]
            for (k, v) in srs.object ?? [:] { base[k] = v }
            if srs["ef"] != nil && srs["D"] == nil { base["D"] = nil }   // JS `{D: undefined}` overrides the default
            var o: [String: JSON] = ["word": "tuition", "pos": "n", "vi": "học phí", "srs": .object(base)]
            for (k, v) in extra { o[k] = v }
            return .object(o)
        }
        for c in M.list("auto") { r.eq(StudyModes.auto(card(c["input"]!)), c.s("out"), "auto \(c.s("id"))") }
        for c in M.list("pick") {
            let i = c["input"]!, cj = i["card"]!
            var srs = cj["srs"]?.object ?? [:]; if srs["last"] == nil { srs["last"] = .null }
            let k = JSON.obj([("word", cj["word"] ?? ""), ("pos", "n"), ("vi", "học phí"), ("srs", .object(srs))])
            let p = StudyModes.pick(k, want: i.s("want"), reverse: i.t("rev"), cards: P, settings: [:])
            r.eq(p.mode, c["out"]!.s("mode"), "pick \(c.s("id")) mode")
            r.eq(p.options != nil, c["out"]!.t("optionsFound"), "pick \(c.s("id")) found")
            r.eq(p.options?.all.count ?? 0, c["out"]!.i("optionCount"), "pick \(c.s("id")) count")
        }
        for c in M.list("gradeType") { let i = c["input"]!; r.eq(StudyModes.gradeType(dist: i.i("dist"), len: i.i("len"), hints: i.i("hints"), ms: i.d("ms") ?? 0, gaveUp: i.t("gaveUp")), c.i("out"), "gradeType \(i.stableString)") }
        for c in M.list("gradeAudio") { let i = c["input"]!; r.eq(StudyModes.gradeAudio(ok: i.t("ok"), replays: i.i("replays"), ms: i.d("ms") ?? 0), c.i("out"), "gradeAudio \(i.stableString)") }
        for c in M.list("norm") { r.eq(StudyModes.norm(c["input"]?.string), c.s("out"), "norm \(c["input"]?.stableString ?? "")") }
        for c in M.list("dist") { let a = c["input"]!.array!; r.eq(StudyModes.dist(a[0].string ?? "", a[1].string ?? ""), c.i("out"), "dist") }
        for c in M.list("trim") {
            let i = c["input"]!; var text = i.s("text")
            if text.contains("chars)") { text = String(repeating: "x ", count: 150) + "tuition " + String(repeating: "y ", count: 150) }
            r.eq(StudyModes.trim(text, word: i.s("word"), max: i.i("max")), c.s("out"), "trim")
        }
        for c in M.list("host") { r.eq(StudyModes.host(c["input"]?.string), c.s("out"), "host") }
        finish(r, "reviewModes")
    }

    // MARK: #/mistakes
    func testMistakes() throws {
        let V = try vec(), M = V["mistakes"]!; var r = R()
        let n = now(V)
        // log
        let log = M.list("log")
        if let l4 = log.first(where: { $0.s("id") == "log-4" }) {
            var list: [JSON] = []
            for (i, m) in (l4["input"]?.array ?? []).enumerated() { list = MistakesEngine.log(list, m, now: n + Int64(i) * 1000) }
            r.diff(.array(list), l4["out"], "log-4")
        }
        if let l = log.first(where: { $0.s("id") == "log-reopen-fixed" }) {
            let seed = JSON.obj([("kind", "vocab"), ("q", "Nghĩa của “abandon”?"), ("key", "vocab|Nghĩa của “abandon”?"), ("answer", "từ bỏ"), ("given", ""), ("explain", ""), ("ref", "abandon"), ("n", 3), ("at", .number(Double(n - Self.day))), ("fixed", true)])
            r.diff(.array(MistakesEngine.log([seed], l["input"]?["add"] ?? .null, now: n)), l["out"], "log-reopen-fixed")
        }
        if let l = log.first(where: { $0.s("id") == "log-cap-300" }) {
            var list: [JSON] = []
            for i in 0..<305 { list = MistakesEngine.log(list, .obj([("kind", "vocab"), ("q", .string("q\(i)")), ("answer", "a"), ("given", "")]), now: n + Int64(i)) }
            r.eq(list.count, l["out"]!.i("length"), "cap length"); r.eq(list.first?.s("q") ?? "", l["out"]!.s("first"), "cap first"); r.eq(list.last?.s("q") ?? "", l["out"]!.s("last"), "cap last")
        }
        // view
        for c in M.list("view") {
            let v = MistakesEngine.view(c["input"]!)
            let want = c["out"]!
            for (k, got) in [("q", v.q), ("qSay", v.qSay), ("qIpa", v.qIpa), ("given", v.given), ("ans", v.ans), ("ansSay", v.ansSay), ("ansIpa", v.ansIpa), ("tip", v.tip)] { r.eq(got, want.s(k), "view \(k) of \(c["input"]!.s("q"))") }
        }
        // list / tabs / retry
        let seedDefault = M.list("list").first?["input"]?["seed"]?.array ?? []
        for c in M.list("list") {
            let id = c.s("id"), seed = c["input"]?["seed"]?.array ?? [], retry = c["input"]!.s("query").contains("retry")
            var book = seed
            MistakesEngine.migrate(&book)
            let o = c["out"]!, counts = MistakesEngine.counts(book)
            var cf: [(String, JSON)] = [("all", .int(counts["all"] ?? 0))]
            for k in MistakesEngine.kinds { cf.append((k, .int(counts[k] ?? 0))) }
            r.diff(.obj(cf), o["counts"], "list \(id) counts")
            let open = MistakesEngine.open(book)
            r.eq(!open.isEmpty && !retry, o.t("retryButton"), "\(id) retryButton"); r.eq(!open.isEmpty && retry, o.t("listButton"), "\(id) listButton"); r.eq(!open.isEmpty, o.t("forgettingButton"), "\(id) forgetting")
            r.eq(open.isEmpty, o.t("empty"), "\(id) empty")
            r.eq(MistakesEngine.rows(book, retry: retry).map { $0.s("key") }, o["tabs"]?.strs("all") ?? [], "\(id) tab all")
            for k in MistakesEngine.kinds { r.eq(MistakesEngine.rows(book, kind: k, retry: retry).map { $0.s("key") }, o["tabs"]?.strs(k) ?? [], "\(id) tab \(k)") }
            var changed: [JSON] = []
            for (i, x) in book.enumerated() where x != seed[i] {
                var e: [(String, JSON)] = [("key", .string(x.s("key")))]
                for f in ["qK", "givenK", "explainK"] { if let v = x[f] { e.append((f, v)) } }
                changed.append(.obj(e))
            }
            r.diff(.array(changed), o["storedAfterOpen"], "\(id) storedAfterOpen")
        }
        for c in M.list("retry") {
            var book = seedDefault
            let steps = c["input"]?["steps"]?.array ?? []
            var rewards: [JSON] = []
            for s in steps {
                let key = s.s("key")
                switch s.s("do") {
                case "type":
                    let x = book.first { $0.s("key") == key }!
                    let st = MistakesEngine.settle(book, key: key, right: MistakesEngine.isShortAnswer(x) && MistakesEngine.isRight(typed: s.s("value"), answer: x.s("answer")))
                    book = st.list; if st.xp > 0 { rewards.append(.obj([("xp", .int(st.xp))])) }
                case "ok": let st = MistakesEngine.settle(book, key: key, right: true); book = st.list; rewards.append(.obj([("xp", .int(st.xp))]))
                case "no": book = MistakesEngine.settle(book, key: key, right: false).list
                case "fix": let st = MistakesEngine.understood(book, key: key); book = st.list; rewards.append(.obj([("xp", .int(st.xp))]))
                default: book = MistakesEngine.clearFixed(book)
                }
            }
            let stored = book.map { JSON.obj([("key", .string($0.s("key"))), ("n", .int($0.i("n"))), ("fixed", .bool($0.t("fixed")))]) }
            r.diff(.array(stored), c["out"]?["stored"], "retry \(c.s("id")) stored"); r.diff(.array(rewards), c["out"]?["rewards"], "retry \(c.s("id")) rewards")
        }
        finish(r, "mistakes")
    }

    // MARK: #/practice
    func testPractice() throws {
        let V = try vec(), P = V["practice"]!; var r = R()
        let n = now(V)
        r.eq(PracticeEngine.sourceValues(topicIDs: ["education"]), P.list("sources").compactMap { $0["value"]?.string }, "sources")
        for c in P.list("pool") {
            let i = c["input"]!, dk = i.s("deck"), src = i.s("src"), mini = i.s("catalog") == "mini"
            if dk == "tiny" && src == "deck" && !mini { continue }   // 120 words of the whole 104-topic library: its twin on the mini library (pool-mini-tiny-deck) runs here
            let rows = PracticeEngine.pool(src, cards: deck(dk, V), catalog: mini ? miniCatalog(V) : catalog(), now: n, clock: clock)
            let o = c["out"]!
            r.eq(rows.count, o.i("n"), "pool \(c.s("id")) n")
            if o["words"] != nil { r.eq(rows.map { $0.s("word") }, o.strs("words"), "pool \(c.s("id")) words") }
            r.diff(.array(Array(rows.prefix(3))), o["first"], "pool \(c.s("id")) first")
        }
        for c in P.list("accept") {
            let i = c["input"]!, o = i["opts"]
            let a = PracticeEngine.accept(i.s("given"), i.s("answer"), alts: o?.strs("alts") ?? [], typo: o?.t("typo") ?? false)
            r.diff(.obj([("ok", .bool(a.ok)), ("how", .string(a.how)), ("want", .string(a.want))]), c["out"], "accept \(i.stableString)")
        }
        for c in P.list("qeNorm") { r.eq(PracticeEngine.qeNorm(c["input"]?.string), c.s("out"), "qeNorm") }
        for c in P.list("typo") {
            let i = c["input"]!, o = i["opts"]
            let t = PracticeEngine.typo(i.s("given"), i.s("target"), strict: o?.t("strict") ?? false, isWord: o?["isWord"] != nil ? { $0 == "two" || $0 == "tow" } : nil)
            let j = JSON.obj([("ok", .bool(t.ok)), ("typo", .bool(t.typo)), ("marks", .array(t.marks.map { m in m.fix ? JSON.obj([("w", .string(m.w)), ("fix", true)]) : JSON.obj([("w", .string(m.w))]) }))])
            r.diff(j, c["out"], "typo \(i.stableString)")
        }
        finish(r, "practice")
    }

    // MARK: #/deck · #/library · #/topic · word book
    func testDeck() throws {
        let V = try vec(); var r = R()
        let n = now(V)
        for c in V["deck"]?.array ?? [] {
            let id = c.s("id"), i = c["input"]!
            let cards = deck("B", V)
            var f = DeckFilter(q: i["filters"]?.s("q") ?? "", topic: i["filters"]?.s("topic") ?? "", from: i["filters"]?.s("from") ?? "", m: i["filters"]?.s("m") ?? "")
            let qs = i.s("query")
            if id == "query-m" || id == "query-m-bad" { f = DeckFilter(query: nil, m: qs.replacingOccurrences(of: "m=", with: "")) }
            if id == "query-from" { f = DeckFilter(query: qs.replacingOccurrences(of: "from=", with: ""), m: nil) }
            let rows = DeckEngine.filter(cards, f, now: n, clock: clock).prefix(DeckEngine.maxRows).map { DeckEngine.row($0, now: n, clock: clock) }
            let o = c["out"]!
            r.eq("\(cards.count) từ · \(DeckEngine.masteredCount(cards)) đã thuộc", o.s("headline"), "deck \(id) headline")
            r.eq(rows.isEmpty, o.t("empty"), "deck \(id) empty")
            let want = o.list("rows")
            r.eq(rows.count, want.count, "deck \(id) rows")
            for (x, w) in zip(rows, want) {
                r.eq(x.word, w.s("word"), "deck \(id) word"); r.eq(x.ipa, w.s("ipa"), "deck \(id) ipa"); r.eq(x.mean, w.s("mean"), "deck \(id) mean"); r.eq(x.thumb, w.s("thumb"), "deck \(id) thumb")
                r.eq(x.retentionPercent, w["retention"]?.double.map { Int($0) }, "deck \(id) retention \(x.word)")
                let note = x.contextText.map { "📌 “\($0)\(x.contextCut ? "…" : "")”" } ?? x.definition
                r.eq(note, w.s("note"), "deck \(id) note \(x.word)")
            }
        }
        finish(r, "deck")
    }

    func testLibrary() throws {
        let V = try vec(); var r = R()
        let n = now(V), cards = deck("B", V)
        // The library needs the whole word library (104 topics) which the vectors do not carry: the checkable rules are the default tab,
        // the level filter and the personal collections ("Thư viện của tôi" = origin groups in order).
        for c in V["library"]?.array ?? [] {
            let i = c["input"]!, qs = i.s("query")
            let g = qs.split(separator: "&").first { $0.hasPrefix("g=") }.map { String($0.dropFirst(2)) }
            r.eq(LibraryEngine.defaultTab(g: g, cardCount: cards.count, exam: "ielts"), c["out"]?.array?.first?["tab"]?.string ?? "", "library \(c.s("id")) tab")
            if let sec = c["out"]?.array?.first?["sections"]?.array?.first(where: { !$0.strs("collections").isEmpty }) {
                r.eq(LibraryEngine.collections(cards, now: n, clock: clock).map(\.origin), sec.strs("collections"), "library \(c.s("id")) collections")
            }
        }
        // the same page on the mini library (data.catalog): sections, "view all" cut, level filter, search, tab switch
        let mini = miniCatalog(V)
        for c in V["library"]?.array ?? [] where c["input"]?.s("catalog") == "mini" {
            let i = c["input"]!, id = c.s("id"), qs = i.s("query"), steps = c["out"]?.array ?? []
            var tab = LibraryEngine.defaultTab(g: qparam(qs, "g"), cardCount: cards.count, exam: "ielts"), lv = LibraryEngine.validLevel(qparam(qs, "lv")), text = ""
            func snap(_ k: Int) {
                let v = LibraryEngine.view(tab: tab, q: text, level: lv, catalog: mini, cards: cards, now: n, clock: clock), st = steps[k]
                r.eq(v.tab, st.s("tab"), "\(id)#\(k) tab")
                let got: [JSON] = v.sections.map { sec in
                    let gid: String? = { if case .group(let g) = sec.kind { return g }; return nil }()
                    let g = mini.groups.first { $0.id == gid }
                    let heading = gid == nil ? (sec.kind == .myCollections ? "📌 Thư viện của tôi" : "📚 Bộ từ IELTS đang học") : (g.map { $0.emoji + " " + $0.name } ?? "")
                    return .obj([("heading", .string(heading)), ("viewAll", sec.viewAll.map { .string("\($0.group)|Xem cả \($0.count) bộ →") } ?? .null),
                                 ("topics", .strings(sec.topics.map { $0 + (lv.isEmpty ? "" : "?lv=" + lv) })), ("collections", .strings(sec.collections.map(\.origin)))])
                }
                r.diff(.array(got), st["sections"], "\(id)#\(k) sections")
                r.eq(v.empty != nil, (st["empty"] ?? .null) != .null, "\(id)#\(k) empty")
            }
            snap(0)
            for (k, a) in (i["actions"]?.array ?? []).enumerated() {
                if a["q"] != nil { text = a.s("q") }; if a["lv"] != nil { lv = a.s("lv") }; if a["tab"] != nil { tab = a.s("tab") }
                snap(k + 1)
            }
        }
        r.eq(LibraryEngine.defaultTab(g: nil, cardCount: 10, exam: "ielts"), "mine", "tab with 10 cards"); r.eq(LibraryEngine.defaultTab(g: nil, cardCount: 0, exam: "toeic"), "toeic", "toeic tab")
        r.eq(LibraryEngine.validLevel("B2"), "B2", "lv"); r.eq(LibraryEngine.validLevel("D9"), "", "lv bad")
        let edu = catalog().topic("education")!
        r.check(LibraryEngine.hasLevel(edu, "B2"), "education has B2"); r.check(!LibraryEngine.hasLevel(edu, "A1"), "education has no A1")
        let v = LibraryEngine.view(tab: "all", q: "educ", level: "", catalog: TopicCatalog(topics: [edu], groups: [.init(id: "topics", name: "Topics")]), cards: cards, now: n, clock: clock)
        r.eq(v.sections.first?.topics ?? [], ["education"], "search educ")
        finish(r, "library")
    }

    func testTopic() throws {
        let V = try vec(); var r = R()
        let cat = catalog(), cards = deck("B", V)
        for c in V["topic"]?.array ?? [] {
            let i = c["input"]!, id = c.s("id"), steps = c["out"]?.array ?? []
            let lvQ = i.s("query").hasPrefix("lv=") ? String(i.s("query").dropFirst(3)) : nil
            guard let page = TopicPage.open(i.s("topic"), level: lvQ, catalog: cat, cards: cards) else {
                r.eq(steps.first?.t("fallbackToLibrary") ?? false, true, "topic \(id) fallback"); continue
            }
            var book = WordBook(cards: cards)
            var level = page.level
            let open = steps[0]
            r.eq("\(page.addedCount) đã thêm", open.s("count"), "\(id) count"); r.eq(page.missing.count, Int(open["addAll"]?["label"]?.string?.split(separator: " ").first(where: { Int($0) != nil }) ?? "0") ?? 0, "\(id) missing")
            r.eq(page.canAddAll, !(open["addAll"]?.t("disabled") ?? true), "\(id) canAddAll"); r.eq([""] + page.levels, open.strs("levels"), "\(id) levels"); r.eq(page.links, open.strs("links"), "\(id) links")
            func words(_ lv: String) -> JSON { .array(page.words(level: lv, cards: book.list).map { .obj([("word", $0.word["word"] ?? ""), ("inDeck", .bool($0.inDeck))]) }) }
            r.diff(words(level), open["words"], "\(id) words")
            for (k, a) in (c["input"]?["actions"]?.array ?? []).enumerated() {
                let step = steps[k + 1]
                if a["lv"] != nil { level = a.s("lv") }
                if a.t("addAll") { page.addAll(into: &book, now: now(V)) }
                r.diff(words(level), step["words"], "\(id) step \(k) words")
                if a.t("addAll") { r.eq(book.cards.count, step.i("deckSize"), "\(id) deckSize") }
            }
        }
        finish(r, "topic")
    }

    func testWordBook() throws {
        let V = try vec(); var r = R()
        let ent = starterTopics["education"]?.array?.first(where: { $0.s("word") == "curriculum" })
        guard let ent else { return XCTFail("curriculum missing in starter.json") }
        var t = now(V), book = WordBook()
        func snap() -> JSON {
            var cards: [String: JSON] = [:]
            for c in book.list {
                var ctx: JSON = .null; if c.t("ctx") { ctx = c["ctx"]! }
                var src: JSON = .null; if c.t("src") { src = c["src"]! }
                let nul: JSON = .null
                var fields: [(String, JSON)] = []
                for k in ["word", "vi", "ipa", "ex", "note", "image", "topic"] { fields.append((k, c[k] ?? nul)) }
                fields.append(("contexts", .array(c.list("contexts").map { $0["text"] ?? nul })))
                fields.append(("ctx", ctx)); fields.append(("src", src))
                fields.append(("added", c["added"] ?? nul)); fields.append(("mod", c["mod"] ?? nul)); fields.append(("srs", Vocab.srsView(c)))
                cards[Vocab.cardKey(c)] = .obj(fields)
            }
            return .obj([("cards", .object(cards)), ("inState", .strings(book.order)), ("deleted", .object(book.deleted.mapValues { .number($0) }))])
        }
        let steps = V["wordbook"]?.array ?? []
        var k = 0
        func check(_ label: String) { r.diff(snap(), steps[k]["out"], "wordbook \(label)"); k += 1 }
        t += 60_000; book.add(ent, now: t); check("add")
        t += 60_000; book.add(ent, context: .obj([("text", "The curriculum was revised."), ("source", "https://example.com/a"), ("title", "Ghi chú của bạn")]), now: t); check("add-context")
        t += 60_000; book.add(ent, context: .obj([("text", "The curriculum was revised."), ("source", "https://example.com/a")]), now: t); check("add-same-context")
        t += 60_000; var e2 = ent; e2["ipaUS"] = "/kəˈrɪkjələm/"; e2["vi"] = "IGNORED (already set)"; book.add(e2, now: t); check("add-fills-empty-fields")
        t += 60_000; book.add(.obj([("word", "look forward to"), ("vi", "mong đợi"), ("pos", "phrase"), ("ex", "I look forward to meeting you."), ("topic", "phrases")]), now: t); check("add-phrase")
        t += 60_000; for i in 0..<6 { t += 1000; book.add(ent, context: .obj([("text", .string("ctx number \(i)")), ("source", "")]), now: t) }; check("add-6-contexts")
        t += 60_000; book.edit("curriculum", vi: " giáo trình ", ipa: "/kəˈrɪk/", ex: "My own example.", note: "mẹo", image: "https://example.com/i.png", now: t); check("edit-save")
        t += 60_000
        var c = book.cards["curriculum"]!; c["srs"] = Vocab.srsJSON(clock.srs().review(Vocab.srs(c), grade: 2, now: t), over: c["srs"]); book.update(c, now: t)
        book.reset("curriculum", now: t); check("grade-then-reset")
        t += 60_000; book.remove("curriculum", now: t); check("delete")
        t += 60_000; book.add(ent, now: t); check("re-add-after-delete")
        finish(r, "wordbook")
    }

    // MARK: #/dict
    /// the offline "network" of the generator (its NET table is an input of gen-vocab.mjs, not exported; copied here as a fixture)
    static let netJSON = #"""
{"curriculum":{"gtx":{"sentences":[{"trans":"chương trình học"}],"dict":[{"pos":"noun","terms":["chương trình giảng dạy","giáo trình","chương trình học"],"base_form":"curriculum"}],"definitions":[{"pos":"noun","entry":[{"gloss":"the subjects comprising a course of study in a school or college.","example":"the school curriculum","definition_id":"a1"}]}],"synsets":[{"entry":[{"synonym":["syllabus","course"]}]}],"examples":{"example":[{"definition_id":"a1","text":"a <b>curriculum</b> for adults"}]}},"dapi":[{"word":"curriculum","phonetic":"/kəˈrɪkjʊləm/","phonetics":[{"text":"/kəˈrɪkjʊləm/","audio":"https://api.dictionaryapi.dev/media/pronunciations/en/curriculum-uk.mp3"},{"text":"/kəˈrɪkjələm/","audio":"https://api.dictionaryapi.dev/media/pronunciations/en/curriculum-us.mp3"}],"meanings":[{"partOfSpeech":"noun","definitions":[{"definition":"The set of courses offered by a school.","example":"The curriculum is broad."}],"synonyms":["syllabus"]}]}],"img":{"src":"https://upload.wikimedia.org/x/curriculum.jpg","link":"https://commons.wikimedia.org/wiki/File:x","license":"CC BY","creator":"A. Author","title":"School","via":"Wikipedia"},"tato":{"data":[{"text":"The new curriculum was introduced last year.","translations":[[{"lang":"vie","text":"Chương trình mới được áp dụng năm ngoái."}]]},{"text":"Short one.","translations":[[{"lang":"vie","text":"Ngắn."}]]}]}},"blorptastic":{"gtx":{"sentences":[{"trans":"tuyệt vời kỳ quặc"}],"dict":[{"pos":"adjective","terms":["kỳ quặc","lạ lùng"]},{"pos":"noun","terms":["sự kỳ quặc"]}],"definitions":[{"pos":"adjective","entry":[{"gloss":"extremely odd and wonderful.","example":"a blorptastic idea"}]}],"synsets":[]},"dapi":null,"img":{"none":1},"tato":{"data":[]}},"zorble":{"gtx":{"sentences":[{"trans":"tổng thể"}],"dict":[{"pos":"adjective","terms":["tổng thể","toàn bộ"]},{"pos":"noun","terms":["cái zorble"]}],"definitions":[{"pos":"adjective","entry":[{"gloss":"taking everything into account.","example":"the zorble cost"}]},{"pos":"noun","entry":[{"gloss":"a made-up thing.","example":"a zorble"}]}],"synsets":[]},"dapi":null,"img":{"none":1},"tato":{"data":[]},"wikitext":"==English==\n===Etymology 1===\n====Adjective====\n====Adverb====\n===Etymology 2===\n====Noun====\n* {{a|UK}} {{IPA|en|/ˌəʊvəˈɹɔːl/}}\n* {{a|US}} {{IPA|en|/ˌoʊvɚˈɔl/}}\n* {{a|UK}} {{q|noun}} {{IPA|en|/ˈəʊvəɹɔːl/}}\n* {{audio|en|En-uk-zorble.ogg|a=UK}}\n"}}
"""#
    struct FakeNet: DictNetwork {
        let net: JSON, enabled: Set<String>
        func json(_ url: String, timeout: TimeInterval) async -> JSON? {
            let q = [Dict.matches(url, "[?&]q=([^&]*)").first, Dict.matches(url, "[?&]w=([^&]*)").first, Dict.matches(url, "page=([^&]*)").first].compactMap { $0 }.first?[1] ?? ""
            let key = (q.removingPercentEncoding ?? q).lowercased()
            let N: JSON? = enabled.contains(key) ? net[key] : nil
            if url.contains("src=gtx") && url.contains("dt=bd") { return N?["gtx"] }
            if url.contains("src=dapi") { return N?["dapi"] }
            if url.contains("wiktionary") && url.contains("action=parse") { return N?["wikitext"].map { .obj([("parse", .obj([("wikitext", $0)]))]) } }
            if url.contains("/api/img") { return N?["img"] ?? .obj([("none", 1)]) }
            if url.contains("tatoeba") { return N?["tato"] ?? .obj([("data", .array([]))]) }
            return nil
        }
    }
    func dictLexicon(_ V: JSON) throws -> LexStore {
        let curriculum = starterTopics["education"]?.array?.first { $0.s("word") == "curriculum" }
        var lib: [JSON] = curriculum.map { [$0] } ?? []
        if let go = V["dict"]?.list("lookup").first(where: { $0.s("id") == "lookup-irregular" })?["out"] {
            lib.append(.obj(["word", "ipa", "ipaUS", "pos", "vi", "def", "ex", "col", "syn", "level", "emoji", "topic"].map { ($0, go[$0] ?? .null) }))
        }
        for c in V["dict"]?.list("lex") ?? [] { if let o = c["out"], o != .null { lib.append(.obj([("word", o["word"] ?? .null), ("pos", o["pos"] ?? .null), ("vi", o["vi"] ?? .null)])) } }
        for c in V["dict"]?.list("suggest") ?? [] { for e in c["out"]?.array ?? [] { lib.append(.obj([("word", e["word"] ?? .null), ("pos", e["pos"] ?? .null), ("vi", e["vi"] ?? .null)])) } }
        lib.append(.obj([("word", "give"), ("pos", "v"), ("vi", "đưa")]))
        return LexStore(fallback: LexShard(library: lib, irregular: ["went": "go", "gave": "give"]))
    }

    func testDictNormLexSuggest() async throws {
        let V = try vec(), D = V["dict"]!; var r = R()
        for c in D.list("norm") { r.eq(Dict.normWord(c["input"]?.string), c.s("out"), "norm \(c["input"]?.stableString ?? "null")") }
        // Lex: the vector ran lex.js on the full word library; here the lexicon holds exactly the entries the vector mentions
        let lex = try dictLexicon(V)
        for c in D.list("lex") {
            let hit = await lex.get(c["input"]?.string ?? "")
            let want = c["out"] ?? .null
            if want == .null { r.check(hit == nil, "lex \(c["input"]?.stableString ?? "") should be null"); continue }
            guard let hit else { r.check(false, "lex \(c["input"]?.stableString ?? "") missing"); continue }
            r.diff(.obj([("key", .string(hit.key)), ("via", .string(hit.via)), ("from", .string(hit.from)), ("word", hit.entry["word"] ?? .null), ("pos", hit.entry["pos"] ?? .null), ("vi", hit.entry["vi"] ?? .null)]), want, "lex \(c["input"]?.stableString ?? "")")
        }
        for c in D.list("suggest") {
            let got = await lex.suggest(c.s("input"), c.i("n"))
            r.eq(got.map(\.key), (c["out"]?.array ?? []).map { $0.s("key") }, "suggest \(c.s("input"))")
        }
        finish(r, "dict.norm/lex/suggest")
    }

    func testDictLookup() async throws {
        let V = try vec(), D = V["dict"]!; var r = R()
        let net = try JSON.parse(Self.netJSON), lex = try dictLexicon(V), n = now(V)
        for c in D.list("lookup") {
            let i = c["input"]!, id = c.s("id")
            var cfg = DictConfig(); cfg.meanLang = i.s("meanLang").isEmpty ? "vi" : i.s("meanLang"); cfg.now = { n }; cfg.viTypo = try viTypo()
            let svc = DictionaryService(network: FakeNet(net: net, enabled: Set(i.strs("network"))), lex: lex, cache: nil, config: cfg)
            let got = i.s("fn") == "quick" ? await svc.quick(i.s("w")) : await svc.lookup(i.s("w"), image: true, examples: true)
            r.diff(got ?? .null, c["out"] ?? .null, "lookup \(id)")
        }
        finish(r, "dict.lookup")
    }

    func testDictPage() async throws {
        let V = try vec(), D = V["dict"]!; var r = R()
        let net = try JSON.parse(Self.netJSON), lex = try dictLexicon(V), n = now(V), verbs = try loadVerbs(), usage = try loadUsage()
        for c in D.list("page") where !c.s("id").isEmpty && c["out"]?.t("empty") != true {
            let w = c["input"]!.s("query")
            var cfg = DictConfig(); cfg.now = { n }; cfg.viTypo = try viTypo()
            let svc = DictionaryService(network: FakeNet(net: net, enabled: [w]), lex: lex, cache: nil, config: cfg)
            guard let e = await svc.lookup(w) else { r.check(false, "page \(w) lookup"); continue }
            let m = DictPage.model(e, saved: false, uiLang: "vi", meanLang: "vi", verbs: verbs, hasUsage: { !usage.chunksOf($0).isEmpty })
            let o = c["out"]!
            r.eq(m.word, o.s("word"), "page \(w) word"); r.eq(m.meaning, o.s("meaning"), "page \(w) meaning"); r.eq(m.def, o.s("def"), "page \(w) def"); r.eq(m.example ?? "", o.s("example"), "page \(w) example")
            r.eq(m.exampleTranslation == nil, o.list("exampleTranslation").isEmpty, "page \(w) exampleTranslation")
            r.eq(m.posBlocks.count, o.list("posBlocks").count, "page \(w) blocks")
            for (b, wb) in zip(m.posBlocks, o.list("posBlocks")) {
                r.eq(b.viName ?? b.pos, wb.s("pos"), "page \(w) pos"); r.eq(b.vi, wb.strs("vi"), "page \(w) vi")
                r.eq(b.defs.map { $0.def }, wb.list("defs").map { $0.s("def") }, "page \(w) defs"); r.eq(b.defs.map { $0.ex }, wb.list("defs").map { $0.s("ex") }, "page \(w) ex")
            }
            r.eq(m.extraMeanings > 0 ? 1 : 0, o.i("extraMeanings"), "page \(w) extra")
            r.eq(m.bilingual.map { $0.en }, o.list("bilingual").map { $0.s("en") }, "page \(w) bilingual en"); r.eq(m.bilingual.map { $0.vi }, o.list("bilingual").map { $0.s("vi") }, "page \(w) bilingual vi")
            let a = o["actions"]!
            r.eq(m.canQuickSave, a.t("quickSave"), "page \(w) quickSave"); r.eq(m.practiceSpeak, a.s("practiceSpeak"), "page \(w) speak"); r.eq(m.verb, a["verb"]?.string, "page \(w) verb"); r.eq(m.usage, a["usage"]?.string, "page \(w) usage")
            var book = WordBook()
            book.add(e, context: DictPage.saveContext(text: "My own sentence with \(w).", vi: ""), now: n)
            let c0 = book.list.first!, want = o["afterSave"]!
            for k in ["word", "vi", "pos", "ex", "image", "audio", "ipaUS", "topic"] { r.eq(c0.s(k), want.s(k), "page \(w) afterSave \(k)") }
            r.eq(c0.list("contexts").map { [$0.s("text"), $0.s("title"), $0.s("source")] }, want.list("contexts").map { [$0.s("text"), $0.s("title"), $0.s("source")] }, "page \(w) afterSave contexts")
            r.eq(o.strs("recent"), DictPage.recent([], adding: e.s("word")), "page \(w) recent")
        }
        finish(r, "dict.page")
    }

    // MARK: #/verb
    func loadVerbs() throws -> Verbs { Verbs(tables: try readJSON("native/shared/gen/verbs.json")) }
    func testVerbs() throws {
        let V = try vec(), W = V["verb"]!; var r = R()
        let verbs = try loadVerbs()
        for c in W.list("resolve") { r.diff(verbs.resolve(c["input"]?.string) ?? .null, c["out"], "resolve \(c.s("input"))") }
        for c in W.list("forms") { let i = c["input"]!; r.diff(verbs.forms(i.s("base"), region: i.s("region")), c["out"], "forms \(i.stableString)") }
        for c in W.list("table") { let i = c["input"]!; r.diff(verbs.table(i.s("base"), region: i.s("region")) ?? .null, c["out"], "table \(i.stableString)") }
        for c in W.list("mistakes") { r.diff(verbs.mistakes(c.s("input")), c["out"], "mistakes \(c.s("input"))") }
        for c in W.list("suggest") { r.diff(verbs.suggest(c.s("input"), c.i("n")), c["out"], "suggest \(c.s("input"))") }
        for c in W.list("modal") { r.diff(verbs.modal(c.s("input")).map { .strings($0) } ?? .null, c["out"], "modal \(c.s("input"))") }
        for c in W.list("verbOf") { r.eq(verbs.verbOf(c["input"]!), c.s("out"), "verbOf \(c["input"]!.stableString)") }
        let irr = W["irregular"]!, list = verbs.irregularList().array ?? []
        r.eq(list.count, irr.i("total"), "irregular total"); r.diff(.array(Array(list.prefix(4))), irr["sample"], "irregular sample")
        for p in ["AAA", "ABB", "ABA", "ABC"] { r.eq(verbs.landing(pattern: p, prefix: "").count, irr["patterns"]?.i(p) ?? -1, "pattern \(p)") }
        for f in irr.list("filters") {
            let i = f["input"]!, l = verbs.landing(pattern: i.s("pattern"), prefix: i.s("prefix"))
            r.eq(l.count, f.i("n"), "landing n \(i.stableString)"); r.eq(Array(l.prefix(6)), f.strs("first"), "landing first \(i.stableString)")
        }
        finish(r, "verb")
    }

    // MARK: #/usage (data = the web DSL files, read from the repo like the web loads them)
    func loadUsage() throws -> UsageStore {
        var src: [String: String] = [:]
        let dir = Self.root.appendingPathComponent("web/js/usage")
        for f in try FileManager.default.contentsOfDirectory(atPath: dir.path).sorted() where f.hasSuffix(".js") {
            let text = try String(contentsOf: dir.appendingPathComponent(f), encoding: .utf8)
            for m in Dict.matches(text, "S\\.([a-z]) = \\(S\\.[a-z] \\|\\| ''\\) \\+ `") {
                guard let r0 = text.range(of: m[0]), let end = text.range(of: "`; })", range: r0.upperBound..<text.endIndex) else { continue }
                src[m[1], default: ""] += String(text[r0.upperBound..<end.lowerBound])
            }
        }
        let idxText = try readFile("web/js/usage-index.js")
        guard let a = idxText.range(of: "LK_USAGE_IDX = "), let b = idxText.range(of: "; })(", options: .backwards) else { throw CocoaError(.fileReadCorruptFile) }
        return UsageStore(sources: src, indexJSON: String(idxText[a.upperBound..<b.lowerBound]), verbs: try loadVerbs())
    }
    func testUsage() throws {
        let V = try vec(), U = V["usage"]!; var r = R()
        let st = try loadUsage()
        func brief(_ e: JSON) -> JSON { .obj(["kind", "sub", "key", "items", "ex", "notes", "mis", "col", "lessons", "reg", "quiz", "k", "pos", "rel", "f"].map { k in (k, e[k] ?? .null) }) }
        for c in U.list("parse") {
            let p = UsageStore.parse(c["input"]!.s("kind"), c["input"]!.s("src"))
            r.diff(.obj([("entries", .array(p.entries)), ("errors", .strings(p.errors))]), c["out"], "parse")
        }
        for c in U.list("example") { r.diff(UsageStore.example(c.s("input")), c["out"], "example \(c.s("input"))") }
        for c in U.list("resolve") { r.eq(st.resolve(c.s("input")), c["out"]?.string, "resolve \(c.s("input"))") }
        for c in U.list("suggest") { r.eq(st.suggest(c.s("input"), c.i("n")), (c["out"]?.array ?? []).compactMap(\.string), "suggest \(c.s("input"))") }
        for c in U.list("near") { r.eq(st.near(c.s("input")), (c["out"]?.array ?? []).compactMap(\.string), "near \(c.s("input"))") }
        for c in U.list("lookup") {
            let l = st.lookup(c.s("input")), o = c["out"]!
            r.eq(l.i("count"), o.i("count"), "lookup count \(c.s("input"))")
            for k in UsageStore.kinds { r.eq(l.list(k).map { $0.s("key") }, o.strs(k), "lookup \(c.s("input")) \(k)") }
        }
        for c in U.list("entries") {
            let k = c.s("input")
            let e = ["p", "v", "a", "c"].compactMap { st.byId($0, k) }.first
            r.diff(e.map(brief) ?? .null, c["out"], "entries \(k)")
        }
        for c in U.list("quizItems") { let i = c["input"]!; r.diff(.array(st.quizItems(st.byId(i.s("kind"), i.s("key")) ?? .null)), c["out"], "quizItems \(i.stableString)") }
        let intE = st.byId("p", "interested"), stopE = st.byId("v", "stop") ?? st.load("v").first
        for c in U.list("quiz") {
            let i = c["input"]!
            let q = st.quiz([intE, stopE].compactMap { $0 }, n: i.i("n"), seed: i.d("seed") ?? 1).map { x -> JSON in var o = x; o["xid"] = .string(UsageStore.xid(x)); return o }
            r.diff(.array(q), c["out"], "quiz \(i.stableString)")
        }
        let cnt = U["counts"]!
        r.diff(st.counts(), cnt["counts"], "counts"); r.eq(st.indexCounts.words, cnt["index"]?.i("words") ?? -1, "index words"); r.eq(st.indexCounts.ids, cnt["index"]?.i("ids") ?? -1, "index ids")
        for c in cnt.list("chunksOf") { r.eq(st.chunksOf(c.s("key")), c.s("chunks"), "chunksOf \(c.s("key"))") }
        let cat = U["categories"]!
        r.eq(UsageStore.kinds, cat.strs("kinds"), "kinds"); r.eq(UsageStore.preps, cat.strs("preps"), "preps"); r.eq(UsageStore.vcodes, cat.strs("vcodes"), "vcodes")
        for k in UsageStore.kinds { r.eq(UsageStore.subs[k] ?? [], cat["subs"]?.strs(k) ?? [], "subs \(k)"); r.eq(st.list(k).count, cat["list"]?.i(k) ?? -1, "list \(k)") }
        finish(r, "usage")
    }

    // MARK: writing
    func testWritingSmall() throws {
        let V = try vec(), W = V["writing"]!; var r = R()
        // letters: check rows
        for c in W.list("letters") where c.s("id").hasPrefix("check-") {
            let i = c["input"]!, o = c["out"]!
            let letter = JSON.obj([("open", i["open"] ?? ""), ("close", i["close"] ?? ""), ("tone", i["tone"] ?? "")])
            let rows = WritingEngine.checkLetter(letter, text: i.s("text")), n = WritingEngine.wordCount(i.s("text"))
            r.eq("\(n) từ", o.s("wordChip"), "\(c.s("id")) chip"); r.eq(n >= WritingEngine.letterMinWords, o.s("wordChipOk") == "chip ok", "\(c.s("id")) chip ok")
            r.eq(rows.map(\.ok), o.list("rows").map { $0.t("ok") }, "\(c.s("id")) rows")
            r.eq(WritingEngine.letterAIEligible(i.s("text")), n >= 50, "\(c.s("id")) ai")
        }
        // paraphrase
        for c in W["paraphrase"]?.list("usable") ?? [] { let a = c["input"]!.array!; r.eq(WritingEngine.paraphraseUsable(a[0].string ?? "", a[1].string ?? ""), c.t("out"), "usable \(c["input"]!.stableString)") }
        let fin = WritingEngine.paraphraseFinish(right: 7, total: 10)
        r.eq(fin.xp, W["paraphrase"]?["finish"]?.list("rewards").first?.i("xp") ?? -1, "paraphrase xp"); r.eq(fin.percent, 70, "paraphrase pct")
        // annotated text
        for c in W.list("annotated") {
            let ps = WritingEngine.annotated(c.s("input")), o = c["out"]!
            r.eq(ps.count, o.i("paragraphs"), "annotated paragraphs")
            var roles: [String] = [], chunks: [[String]] = [], links: [String] = []
            for p in ps { if let h = p.head { roles.append(h) }; for s in p.segments { switch s { case .role(let x): roles.append(x); case .chunk(let en, let vi): chunks.append([en, vi]); case .linker(let l): links.append(l); case .text: break } } }
            r.eq(roles, o.strs("roles"), "annotated roles"); r.eq(ps.first?.head != nil, o.t("roleHead"), "annotated head")
            r.eq(chunks, o.list("chunks").map { ($0.array ?? []).compactMap(\.string) }, "annotated chunks"); r.eq(links, o.strs("links"), "annotated links")
        }
        // ideas: the save dialog receives the English chunk, the gloss (Vietnamese learners only) and the sentence
        if let s = W.list("ideas").first?["out"]?["firstChunkSave"] {
            let x = WritingEngine.ideaChunkSave(s.s("phrase") + "|" + s.s("vi"), example: s.s("sentence"), learnLang: "vi")
            r.eq(x.phrase, s.s("phrase"), "idea phrase"); r.eq(x.vi, s.s("vi"), "idea vi"); r.eq(x.sentence, s.s("sentence"), "idea sentence")
            r.eq(WritingEngine.ideaChunkSave("a|b", example: "e", learnLang: "es").vi, "", "idea vi hidden")
        }
        finish(r, "writing (small)")
    }

    func testWritingModels() throws {
        let V = try vec(), W = V["writing"]!; var r = R()
        let M = miniWriting(V).list("models")   // the reduced MODELS the vectors were generated on (first two of each task)
        for k in ["1", "2", "gt"] { r.eq(M.filter { $0["task"]?.jsToString == k }.count, 2, "models of task \(k)") }
        r.check(W["modelData"]?.i("count") ?? 0 > M.count, "modelData carries the full-library counts (checked on Android against the real scripts)")
        // model pages: chunks, linkers, tabs, save one / save all
        for c in W.list("model") {
            let i = c["input"]!, o = c["out"]!
            guard let m = M.first(where: { $0.s("id") == i.s("id") }) else { r.check(false, "model \(i.s("id")) missing"); continue }
            r.eq(WritingEngine.chunks(m.s("text")).map { [$0.en, $0.vi] }, o.list("chunks").map { ($0.array ?? []).compactMap(\.string) }, "model \(i.s("id")) chunks")
            r.eq(WritingEngine.linkers(m.s("text")), o.strs("linkers"), "model \(i.s("id")) linkers")
            r.eq(WritingEngine.modelBack(m), o.s("back"), "model \(i.s("id")) back"); r.eq(WritingEngine.modelModes, o.strs("tabs"), "model tabs")
            r.eq(WritingEngine.modelBadge(m), o.list("badges").first?.string ?? "", "model \(i.s("id")) badge")
            var book = WordBook()
            let ch = WritingEngine.chunks(m.s("text"))
            func save(_ en: String, _ vi: String) { let s = WritingEngine.sentence(containing: en, in: m.s("text")); let p = WritingEngine.phraseEntry(en: en, vi: vi, sentence: s, task: m["task"]?.jsToString ?? ""); book.add(p.entry, context: p.context, now: now(V)) }
            if let f = ch.first { save(f.en, f.vi) }
            for x in ch where !book.contains(x.en) { save(x.en, x.vi) }
            r.eq(book.cards.count, o.i("savedCount"), "model \(i.s("id")) savedCount")
            for (x, w) in zip(book.list.prefix(4), o.list("saved")) {
                for k in ["word", "vi", "pos", "topic", "emoji", "ex"] { r.eq(x.s(k), w.s(k), "model \(i.s("id")) saved \(k)") }
                r.eq(x.list("contexts").first?.s("title") ?? "", w.s("ctxTitle"), "model \(i.s("id")) saved title")
            }
        }
        // gap exercises on t1-energy
        if let m = M.first(where: { $0.s("id") == "t1-energy" }) {
            for c in W.list("gap") {
                let i = c["input"]!, o = c["out"]!, g = WritingEngine.Gap(model: m.s("text"), kind: i.s("kind"))
                r.eq(g.answers.count, o.i("gaps"), "gap \(c.s("id")) gaps"); r.eq(g.bank, o.strs("bank"), "gap \(c.s("id")) bank")
                let inputs = i.s("scenario") == "all-correct" ? g.answers : g.answers.enumerated().map { $0.offset == 0 ? $0.element : "wrong" }
                let res = g.check(inputs), fin = WritingEngine.modelFinish(right: res.right, total: g.answers.count)
                r.eq(res.marks.map { $0 ? "ok" : "no" }, o.strs("marks"), "gap \(c.s("id")) marks")
                let rw = o.list("rewards").first
                r.eq(fin.xp, rw?.i("xp") ?? -1, "gap \(c.s("id")) xp"); r.eq(fin.perfect, (rw?.i("perfect") ?? 0) == 1, "gap \(c.s("id")) perfect"); r.eq(fin.markDone, !o.list("mdone").isEmpty, "gap \(c.s("id")) mdone")
            }
        }
        // phrase book starter: the 20 most frequent chunks
        if let e = W.list("phrases").first(where: { $0.s("id") == "empty" })?["out"] {
            let top = WritingEngine.starterPhrases(models: M, alreadySaved: { _ in false })
            let want = e.list("starterAdded")
            r.eq(top.map { $0.entry.s("word") }, want.map { $0.s("word") }, "starter words"); r.eq(top.map { $0.entry.s("vi") }, want.map { $0.s("vi") }, "starter vi")
            r.eq(top.map { $0.context?.s("title") ?? "" }, want.map { $0.s("ctxTitle") }, "starter titles")
        }
        finish(r, "writing (models)")
    }
    /// ideas / letters list / paraphrase first question / models list - from the reduced content in `data.writing`
    func testWritingPages() throws {
        let V = try vec(), W = V["writing"]!, D = miniWriting(V), cat = miniCatalog(V); var r = R()
        for c in W.list("ideas") {
            let v = WritingEngine.ideas(D.list("ideas"), topic: c["input"]?.s("topic"), prompts: D.list("prompts")), o = c["out"]!
            guard let v else { r.check(false, "ideas \(c.s("id")) view"); continue }
            r.eq(v.topics, o.strs("topics"), "ideas \(c.s("id")) topics"); r.eq(v.selected, o.s("selected"), "ideas \(c.s("id")) selected"); r.eq(v.issues.count, o.i("issues"), "ideas \(c.s("id")) issues")
            r.eq(v.issues.first?.s("q") ?? "", o["firstIssue"]?.s("q") ?? "", "ideas \(c.s("id")) first q"); r.eq(v.issues.first.map(v.ideaCount) ?? -1, o["firstIssue"]?.i("ideas") ?? -2, "ideas \(c.s("id")) first ideas")
            r.eq(v.vocabCount, o.i("vocab"), "ideas \(c.s("id")) vocab"); r.eq(v.prompts, o.strs("prompts"), "ideas \(c.s("id")) prompts")
        }
        for c in W.list("letters") where !c.s("id").hasPrefix("check-") {
            let i = c["input"]!, o = c["out"]!, l = WritingEngine.letters(D.list("letters"), tone: qparam(i.s("query"), "tone"), drafts: i["drafts"] ?? .null)
            r.eq(l.tabs.map(\.tone), o.list("tabs").map { $0.s("tone") }, "letters \(c.s("id")) tabs"); r.eq(l.tabs.map(\.n), o.list("tabs").map { $0.i("n") }, "letters \(c.s("id")) counts")
            r.eq(l.tip, o.t("tip"), "letters \(c.s("id")) tip")
            r.eq(l.cards.map(\.id), o.list("cards").map { $0.s("id") }, "letters \(c.s("id")) cards"); r.eq(l.cards.map { $0.draftWords ?? -1 }, o.list("cards").map { $0["draftWords"]?.double.map { Int($0) } ?? -1 }, "letters \(c.s("id")) drafts")
            r.eq(l.cards.map(\.titleVi), o.list("cards").map { $0.s("title") }, "letters \(c.s("id")) titles")
        }
        // paraphrase: the first question of a round (no shuffle) = first usable pair + 3 others of similar length
        let pairs = WritingEngine.paraphrasePairs(D.list("paraphrase")), first = W["paraphrase"]?["first"] ?? .null
        r.check(!pairs.isEmpty, "paraphrase pairs")
        if let q0 = pairs.first {
            r.eq(q0.q, first.s("q"), "paraphrase q"); r.eq(WritingEngine.paraphraseOptions(q0, all: pairs), first.strs("options"), "paraphrase options")
            r.eq("1/\(Swift.min(WritingEngine.paraphraseRound, pairs.count))", first.s("progress"), "paraphrase progress")
        }
        // models list: tabs, kind-then-title order, search
        for c in W.list("models") {
            let i = c["input"]!, tab = WritingEngine.modelsTab(query: qparam(i.s("query"), "t"), exam: "ielts"), steps = c["out"]?["steps"]?.array ?? []
            var q = ""
            func snap(_ k: Int) {
                let rows = WritingEngine.models(D.list("models"), tab: tab, q: q, info: { WritingEngine.modelInfo($0, prompts: D.list("prompts"), task1: D.list("task1"), letters: D.list("letters")) }), st = steps[k]
                let got: [JSON] = rows.prefix(8).map { x in
                    let meta = x.kind + (cat.topic(x.topic).map { " · " + $0.name } ?? "") + " · " + (x.words.map(String.init) ?? "–") + " từ"
                    return .obj([("id", .string(x.id)), ("title", .string(x.title)), ("meta", .string(meta)), ("band", .string(x.band))])
                }
                r.diff(.array(got), st["rows"], "models \(c.s("id"))#\(k) rows"); r.eq(rows.count, st.i("n"), "models \(c.s("id"))#\(k) n")
            }
            snap(0)
            for (k, a) in (i["actions"]?.array ?? []).enumerated() { q = a.s("q"); snap(k + 1) }
        }
        finish(r, "writing (pages)")
    }
    /// gram (planted errors, or the select fallback) · copy · write: generated from a model with the real lemmatizer on the mini library
    func testWritingExercises() throws {
        let V = try vec(), W = V["writing"]!, D = miniWriting(V); var r = R()
        let tables = try readJSON("native/shared/gen/verbs.json"), idx = miniCatalog(V).index, models = D.list("models")
        let lem = Lemmatizer(tables: tables, known: { idx[$0] != nil })
        let forms = tables.list("FORMS").map { $0.array?.compactMap(\.string) ?? [] }
        for c in W.list("exercise") {
            let i = c["input"]!, o = c["out"]!, id = c.s("id")
            guard let m = models.first(where: { $0.s("id") == i.s("model") }) else { r.check(false, "\(id): model missing"); continue }
            switch i.s("mode") {
            case "gram":
                let items = WritingEngine.errors(m, lem: lem, index: { idx[$0] })
                if o.s("kind") == "select" {
                    r.check(items == nil, "\(id): fewer than 5 errors → select fallback")
                    let slots = WritingEngine.gram(m, forms: forms).flatMap { $0 }.compactMap { t -> WritingEngine.GramSlot? in if case .slot(_, let g) = t { return g }; return nil }
                    r.eq(slots.map(\.options), o.list("options").map { ($0.array ?? []).compactMap(\.string) }, "\(id) options"); r.eq(slots.map(\.answer), o.strs("answers"), "\(id) answers")
                    r.eq(WritingEngine.gramScore(slots.map(\.answer), picks: o.strs("typed")), o.i("right"), "\(id) right")
                } else {
                    guard let items else { r.check(false, "\(id): errors planted"); continue }
                    let want = o.list("items")
                    r.eq(items.map(\.wrong), want.map { $0.s("wrong") }, "\(id) wrong"); r.eq(items.map { $0.wrong.isEmpty }, want.map { $0.t("missing") }, "\(id) missing")
                    r.eq(items.map(\.ans), want.map { $0.s("ans") }, "\(id) ans"); r.eq(items.map(\.why), want.map { $0.s("why") }, "\(id) why")
                    r.eq(WritingEngine.errScore(items, typed: o.strs("typed")), o.i("right"), "\(id) right")
                }
            case "copy":
                let (blocks, answers) = WritingEngine.slots(m)
                r.eq(blocks.map(\.role), o.list("blocks").map { $0.s("role") }, "\(id) roles"); r.eq(blocks.map { $0.toks.filter { !Verbs.m($0, "^[^A-Za-z\\d]$") }.count }, o.list("blocks").map { $0.i("n") }, "\(id) boxes")
                r.eq(answers.count, o.i("n"), "\(id) n"); r.eq(answers.joined(separator: " "), o.s("answers"), "\(id) answers")
                r.eq(WritingEngine.slotScore(answers, inputs: answers.enumerated().map { $0.offset % 2 == 1 ? "x" : $0.element }), o.i("right"), "\(id) right")
            default:
                let sents = WritingEngine.sentencesOf(m), typed = o.strs("typed")
                r.eq(sents.map { WritingEngine.lemmaPrompt($0.s, lemma: lem.lemma) }, o.strs("prompts"), "\(id) prompts"); r.eq(sents.map(\.s), o.strs("sentences"), "\(id) sentences")
                r.eq(sents.indices.filter { WritingEngine.lemmaRight(typed[$0], sents[$0].s) }.count, o.i("right"), "\(id) right")
            }
        }
        finish(r, "writing (exercises)")
    }
    func testPhraseBook() throws {
        let V = try vec(); var r = R()
        guard let c = V["writing"]?.list("phrases").first(where: { $0.s("id") == "with-cards" }) else { return XCTFail("no with-cards case") }
        let A = V["inputs"]?["A"]?.array ?? [], B = V["inputs"]?["B"]?.array ?? []
        let extra = zip(A.prefix(3), ["by and large", "in terms of", "as a result"]).map { (c, w) -> JSON in var o = c; o["word"] = .string(w); o["topic"] = "phrases"; o["pos"] = "phrase"; return o }
        let book = WritingEngine.phraseBook(keyed(B + extra))
        r.eq(book.list.map { $0.s("word") }, c["out"]?.strs("list") ?? [], "phrase list"); r.eq(book.canLearn, c["out"]?.t("learnButton") ?? false, "learn button")
        finish(r, "writing (phrases)")
    }
    func testDataShapes() throws {
        let V = try vec(); var r = R()
        r.check(V["dict"]?["lookup"]?.array?.count == 9, "dict.lookup cases"); r.check(V["review"]?.array?.count == 15, "review cases"); r.check(V["deck"]?.array?.count == 23, "deck cases")
        r.check((V["writing"]?["ideasData"]?["topics"]?.array?.count ?? 0) > 0, "ideasData"); r.check((V["writing"]?["lettersData"]?.d("count") ?? 0) > 0, "lettersData")
        finish(r, "shapes")
    }
}
