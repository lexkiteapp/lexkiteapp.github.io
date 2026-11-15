import Foundation
import XCTest
@testable import LKSync
@testable import LKStore
@testable import LKCore
import LKStrings

/// M4 P07 (fork C) – #/say · #/reflex · #/handsfree logic (LKStore/Speak/{Say,Reflex,Handsfree}Core) against vectors/speak.json, produced by running the REAL web code
/// (scripts/native/gen-speak.mjs). One test per vector key, every case checked, nothing skipped; what a case holds that the platform decides (sound effect names, button
/// labels, the HTML of the error panel) is checked where the screen is built (LKFeaturesTests/SpeakSayReflexHandsfreeModelTests) and named there.
@MainActor
final class SpeakSayReflexHandsfreeVectorTests: XCTestCase {
    struct R {
        var checked = 0
        var failures: [String] = []
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) { checked += 1; if !ok { if failures.count < 25 { failures.append(s()) } else if failures.count == 25 { failures.append("…") } } }
        mutating func eq<T: Equatable>(_ a: T, _ b: T, _ label: String) { check(a == b, "\(label): \(a) ≠ \(b)") }
    }
    func finish(_ r: R, _ name: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThan(r.checked, 0, "\(name): nothing checked", file: file, line: line)
        XCTAssertTrue(r.failures.isEmpty, "\(name): \(r.failures.count) of \(r.checked) failed:\n" + r.failures.joined(separator: "\n"), file: file, line: line)
    }

    // MARK: fixtures
    static var cachedV: JSON?
    func vec() throws -> JSON { if let v = Self.cachedV { return v }; let v = try Vectors.load("speak.json"); Self.cachedV = v; return v }
    let vi = L10n(lang: "vi")
    func cases(_ V: JSON, _ g: String, _ k: String) -> [JSON] { V[g]?.list(k) ?? [] }
    func series(_ V: JSON) -> [JSON] { V["data"]?["say"]?.list("series") ?? [] }
    func seriesRow(_ V: JSON, _ id: String) -> JSON { series(V).first { $0.s("id") == id } ?? .null }
    func item(_ V: JSON, _ card: String) -> (s: JSON, i: Int) {
        let p = card.split(separator: "/").map(String.init), s = seriesRow(V, p[0])
        return (s, s.list("items").firstIndex { $0.s("id") == p[1] } ?? 0)
    }
    /// the vector text as the learner reads it in Vietnamese: a key, `{k, v}` (nested inside-out) or `key⟦{vars}⟧`
    func vec(_ j: JSON?) -> String {
        guard let j else { return "" }
        guard let s = j.string else { return SpeakText.render(j, vi) }
        if let open = s.range(of: "⟦"), s.hasSuffix("⟧") {
            let key = String(s[..<open.lowerBound]), body = String(s[open.upperBound..<s.index(before: s.endIndex)])
            var vars: [String: String] = [:]
            for (n, v) in (try? JSON.parse(body))?.object ?? [:] { vars[n] = v.jsToString }
            return vi.translate(source: key, vars) ?? SpeakText.fill(key, vars)
        }
        return vi.translate(source: s) ?? s
    }
    func said(_ m: SayMsg) -> String { m.text(vi) }
    func vars(_ j: JSON?) -> [String: String] {
        guard let s = j?.string, let open = s.range(of: "⟦"), s.hasSuffix("⟧"), let o = (try? JSON.parse(String(s[open.upperBound..<s.index(before: s.endIndex)])))?.object else { return [:] }
        return o.mapValues { $0.jsToString }
    }
    /// the vector's `data.say` holds ONE of the four series: the others are rebuilt from what the expected rows say (id, count, teacher), so only their counts and bars can be checked
    func seriesFor(_ V: JSON, _ want: [JSON], teachers: [String: String]) -> [JSON] {
        want.map { w in
            let id = w.s("series")
            if case let real = seriesRow(V, id), real != .null { return real }
            let total = w["progress"]?["v"]?.i("total") ?? 0
            let who = teachers[id] ?? (w["progress"]?["v"]?.s("name") ?? "").lowercased()
            return .obj([("id", .string(id)), ("title", .string(w.s("title"))), ("teacher", .string(who)),
                         ("items", .array((0..<total).map { .obj([("id", .string("\(id)-\($0)"))]) }))])
        }
    }
    /// Chars.name: Ama / Carlos (the rig lives in LKFeatures, which this target does not link: the id of the teacher is enough)
    func teacherName(_ who: String) -> String { who.capitalized }
    /// the Kokoro voice of a teacher as the vector names it: its gender must be the teacher's (ama = af_heart, carlos = am_michael)
    func voiceMatches(_ who: String, _ voice: String) -> Bool { VoiceCore.kokoro(voice)?.gender == VoiceCore.genderFor(who) && voice == (who == "carlos" ? "am_michael" : "af_heart") }
    func suite(_ n: String) -> UserDefaults { let d = UserDefaults(suiteName: "lk.test.say.\(n)")!; d.removePersistentDomain(forName: "lk.test.say.\(n)"); return d }

    // MARK: P07 parity (the rules the three screens must keep, whatever the platform)
    func testParityP07SayReflexHandsfree() throws {
        let V = try vec(), S = series(V)
        XCTAssertFalse(S.isEmpty)
        // say: the first card is the first one NOT seen yet; all seen ⇒ the first card; unknown card ⇒ replaced by the first; unknown series ⇒ the list
        let first = S[0].list("items")
        var seen = Set<String>()
        XCTAssertEqual(SayCore.rows(S, seen: seen)[0].firstCard, first[0].s("id"))
        seen.insert(S[0].s("id") + "/" + first[0].s("id"))
        XCTAssertEqual(SayCore.rows(S, seen: seen)[0].firstCard, first[1].s("id"))
        for c in first { seen.insert(S[0].s("id") + "/" + c.s("id")) }
        XCTAssertEqual(SayCore.rows(S, seen: seen)[0].firstCard, first[0].s("id"))
        XCTAssertEqual(SayCore.rows(S, seen: seen)[0].pct, 100)
        XCTAssertEqual(SayCore.route(S[0].s("id") + "/zzz", S), .replace(series: S[0].s("id"), card: first[0].s("id")))
        XCTAssertEqual(SayCore.route("zzz", S), .list)
        // say: a rude / masked "don't say" line is never speakable and never in the share text; the speakable text is always the card sentence
        for s in S { for it in s.list("items") {
            let dont = it["dont"]
            if dont?.t("masked") == true || dont?.s("reg") == "rude" { XCTAssertFalse(SayCore.speakable(dont)) }
            if let d = dont?.s("text"), !d.isEmpty, dont?.t("masked") == true { XCTAssertFalse(said(SayCore.shareText(s, it)).contains(d)) }
            XCTAssertEqual(SayCore.fileName(it, tall: true), "lexkite-say-\(it.s("id"))-4x5.png")
        } }
        XCTAssertFalse(SayCore.speakable(nil))
        XCTAssertEqual(SayCore.accent, "en-US")
        // say: the seen set is lk.say.seen {"series/card":1}
        let d = suite("parity")
        SayCore.markSeen("a/b", in: d); SayCore.markSeen("c/d", in: d)
        XCTAssertEqual(SayCore.seen(d), ["a/b", "c/d"])
        // reflex: apostrophes are kept ("it's" ≠ "its") – the scorer of #/speak strips them – and the look-ahead window is 4 words
        XCTAssertFalse(ReflexCore.colorize("It's NOT a big deal", "its not a big deal").words[0].ok)
        XCTAssertTrue(ReflexCore.colorize("It's NOT a big deal", "it's not a big deal").words[0].ok)
        XCTAssertEqual(ReflexCore.lookAhead, 4)
        XCTAssertEqual(ReflexCore.seconds, 60)
        XCTAssertEqual(ReflexCore.poolMax, 40)
        // handsfree, screen off: only audio (clip / card audio / the 1 s silence), never speech or a timer; the chain advances on `ended`
        let words: [JSON] = [.obj([("word", "alpha"), ("ex", "Alpha is first."), ("vi", "đầu")]), .obj([("word", "beta"), ("ex", "Beta is second."), ("vi", "hai")])]
        let m = HandsfreeMachine(words: words, options: HandsfreeCore.options(nil), clip: { $0 == "alpha" }, meaning: { Vocab.meanOf($0) }, meaningLang: { _ in "vi-VN" }, accent: { "en-GB" })
        var e = m.setPlay(true, hidden: true), n = 0
        while let eff = e, n < 40 {
            if case .audio = eff {} else { XCTFail("screen off asked for \(eff)") }
            e = m.done(hidden: true); n += 1
        }
        XCTAssertEqual(n, 40)
        // handsfree, screen on: the waits are exactly the gap (900) and the 2200 ms thinking time
        let m2 = HandsfreeMachine(words: words, options: HandsfreeCore.options(nil), clip: { _ in false }, meaning: { Vocab.meanOf($0) }, meaningLang: { _ in "vi-VN" }, accent: { "en-GB" })
        var waits = Set<Int>(); var e2 = m2.setPlay(true, hidden: false), k = 0
        while let eff = e2, k < 60 { if case .wait(let ms) = eff { waits.insert(ms) }; e2 = m2.done(hidden: false); k += 1 }
        XCTAssertEqual(waits, [HandsfreeCore.defaultGap, HandsfreeCore.thinkMs])
        // the silent track is a real 1 s WAV (8000 Hz, 8-bit mono)
        let wav = HandsfreeCore.silenceWAV()
        XCTAssertEqual(wav.count, 44 + 8000)
        XCTAssertEqual(String(decoding: wav.prefix(4), as: UTF8.self), "RIFF")
        XCTAssertEqual(wav[44], 128)
    }

    // MARK: say.list
    func testSayList() throws {
        let V = try vec(); var r = R()
        for c in cases(V, "say", "list") where c.s("id") != "list-error" {
            let seen = Set((c["input"]?["seen"]?.object ?? [:]).filter { $0.value.truthy }.keys)
            let want = c["out"]?.list("rows") ?? []
            let teachers = Dictionary(uniqueKeysWithValues: (c["input"]?.list("series") ?? []).compactMap { t -> (String, String)? in
                guard let a = t.array, a.count == 3, let i = a[0].string, let w = a[2].string else { return nil }; return (i, w) })
            let rows = SayCore.rows(seriesFor(V, want, teachers: teachers), seen: seen)
            r.eq(rows.count, want.count, "\(c.s("id")) rows")
            for (row, w) in zip(rows, want) {
                let real = seriesRow(V, row.series) != .null
                r.eq(row.series, w.s("series"), "\(c.s("id")) series"); r.eq(row.pct, w.i("pct"), "\(c.s("id")) \(row.series) pct")
                if real { r.eq(row.firstCard, w.s("firstCard"), "\(c.s("id")) \(row.series) first"); r.eq(row.title, w.s("title"), "\(c.s("id")) title") }
                r.eq(said(SayCore.progress(row, teacherName: teacherName(row.teacher))), vec(w["progress"]), "\(c.s("id")) \(row.series) progress")
            }
            if let intro = c["out"]?["intro"] { r.eq(vi(.speakSayCauNguoiBanXu), vec(intro), "\(c.s("id")) intro") }
        }
        finish(r, "say.list (series absent from the cut-down data are rebuilt from the expected rows: counts and bars only)")
    }

    // MARK: say.card
    func testSayCard() throws {
        let V = try vec(); var r = R()
        for c in cases(V, "say", "card") {
            let id = c.s("id"), arg = c["input"]?.s("arg") ?? "", S = series(V), lang = c["input"]?.s("learnLang") ?? "vi"
            if c.s("id").hasPrefix("back-") {
                let (s, i) = item(V, c["input"]?.s("card") ?? "")
                let want = c["out"]?["data"] ?? .null
                let b = SayCore.back(s, i, learnLang: lang, langName: { _ in self.vars(want["mLbl"])["lang"] ?? "" })
                r.eq(b.say, want.s("say"), "\(id) say"); r.eq(said(b.regLbl), vec(want["regLbl"]), "\(id) regLbl"); r.eq(said(b.react), vec(want["react"]), "\(id) react")
                r.eq(b.def, want.s("def"), "\(id) def"); r.eq(said(b.mLbl), vec(want["mLbl"]), "\(id) mLbl"); r.eq(b.mLang, want.s("mLang"), "\(id) mLang")
                r.eq(b.meaning, want.s("meaning"), "\(id) meaning"); r.eq(said(b.real), vec(want["real"]), "\(id) real"); r.eq(b.when, want.s("when"), "\(id) when")
                r.eq(b.dont, want.s("dont"), "\(id) dont"); r.eq(said(b.dontReg), vec(want["dontReg"]), "\(id) dontReg"); r.eq(said(b.dontWhy), vec(want["dontWhy"]), "\(id) dontWhy")
                r.eq(said(b.dontAria), vec(want["dontAria"]), "\(id) dontAria"); r.eq(b.swap, want.s("swap"), "\(id) swap"); r.eq(said(b.swapReg), vec(want["swapReg"]), "\(id) swapReg")
                r.eq(said(b.swapWhy), vec(want["swapWhy"]), "\(id) swapWhy"); r.eq("#/say/" + s.s("id") + "/" + s.list("items")[(i + 1) % s.list("items").count].s("id"), want.s("next"), "\(id) next")
                r.eq(b.teacher, s.s("teacher"), "\(id) teacher")
                continue
            }
            switch SayCore.route(arg, S) {
            case .replace(let sid, let cid):
                r.eq("#/say/\(sid)/\(cid)", c["out"]?.list("replaced").first?.string ?? "", "\(id) replace")
                r.check(c["out"]?.list("mounted").isEmpty == true, "\(id) mounted nothing")
            case .list:
                let want = c["out"]?.list("rows") ?? []
                r.eq(SayCore.rows(seriesFor(V, want, teachers: [:]), seen: []).map(\.series), want.map { $0.s("series") }, "\(id) list rows")
            case .card(let a, let b):
                let f = SayCore.front(S[a], b), w = c["out"]?["data"] ?? .null
                r.eq(f.say, w.s("say"), "\(id) say"); r.eq(said(f.regLbl), vec(w["regLbl"]), "\(id) reg"); r.eq(f.series, w.s("series"), "\(id) series")
                r.eq(said(f.step), vec(w["step"]), "\(id) step"); r.eq(f.ipa, w.s("ipa"), "\(id) ipa"); r.eq(f.pct, w.d("pct") ?? -1, "\(id) pct")
                r.eq(f.n, w.i("n"), "\(id) n"); r.eq(f.total, w.i("total"), "\(id) total")
                r.eq(f.teacher, c["out"]?["teacher"]?.s("who") ?? "", "\(id) teacher"); r.eq(f.pose, c["out"]?["teacher"]?.s("pose") ?? "", "\(id) pose")
                // opening a card marks it seen
                let d = suite("card.\(id)"); SayCore.markSeen(SayCore.cardKey(S[a], b), in: d)
                r.eq(Set((c["out"]?.list("seenWrites").first?.object ?? [:]).keys), SayCore.seen(d), "\(id) seen write")
            }
        }
        finish(r, "say.card")
    }

    // MARK: say.mic
    func testSayMic() throws {
        let V = try vec(); var r = R()
        for c in cases(V, "say", "mic") {
            let id = c.s("id"), o = c["out"] ?? .null
            if let e = c["input"]?["error"]?.string { r.eq(said(SayCore.micError(e)), vec(o["text"]), "\(id) error text"); continue }
            let score = c["input"]?.i("score") ?? 0, heard = c["input"]?.s("heard") ?? ""
            let m = SayCore.micResult(score: score, heard: heard)
            r.eq(said(SayCore.listening), vec(o["listening"]), "\(id) listening"); r.eq(said(m.text), vec(o["result"]), "\(id) result")
            r.eq(m.heardAppended, o["heardAppended"]?.truthy == true, "\(id) heardAppended")
            r.eq(c["input"]?.s("accent") ?? "", SayCore.accent, "\(id) accent")
        }
        finish(r, "say.mic")
    }

    // MARK: say.actions
    func testSayActions() throws {
        let V = try vec(); var r = R()
        for c in cases(V, "say", "actions") {
            let id = c.s("id"), card = c["input"]?.s("card") ?? ""
            if id == "listen-carlos" {   // `not-fine/over-the-moon` is not in the cut-down data: the series teacher is Carlos (list vector), the voice is his
                let sp = c["out"]?.list("spoken").first ?? .null
                r.check(voiceMatches("carlos", sp.s("voice")), "\(id) voice"); r.eq(SayCore.accent, sp.s("accent"), "\(id) accent"); r.check(sp["rate"]?.double == nil, "\(id) rate")
                continue
            }
            let (s, i) = item(V, card), it = s.list("items")[i]
            switch id {
            case "listen":
                for (n, sp) in (c["out"]?.list("spoken") ?? []).enumerated() {
                    r.eq(it.s("say"), sp.s("text"), "\(id) text"); r.eq(SayCore.accent, sp.s("accent"), "\(id) accent"); r.check(voiceMatches(s.s("teacher"), sp.s("voice")), "\(id) voice")
                    r.eq(n == 0 ? nil : SayCore.slowRate, sp.d("rate"), "\(id) rate \(n)")
                }
                if let t = c["out"]?["teacher"]?.string { r.eq(s.s("teacher"), t, "\(id) teacher") }
            case "next-wraps":
                let b = SayCore.back(s, i, learnLang: "vi", langName: { $0 })
                r.eq(b.next, c["out"]?.s("next") ?? "", "\(id) next"); r.eq(b.next, c["out"]?.s("keyboardNavigatesTo") ?? "", "\(id) keyboard")
            default:
                r.eq(SayCore.url(s, it), c["out"]?.s("url") ?? "", "\(id) url"); r.eq(said(SayCore.shareText(s, it)), vec(c["out"]?["text"]), "\(id) text")
                r.eq(["lexkite-say-\(it.s("id"))-1x1.png", SayCore.fileName(it, tall: true)], strs(c["out"]?["fileNames"]), "\(id) files")
                r.eq(SayCore.fileName(it, tall: false), (c["out"]?.list("fileNames").first?.string) ?? "", "\(id) file 1x1")
                r.eq(vi(.speakSayNoiNhuNguoiBan), c["out"]?.s("titleKey") ?? "", "\(id) title")
                r.eq([vi(.speakSayDungKhi), vi(.speakSayLuyenNoiCauNay), vi(.speakSayNoiNhuNguoiBan)], strs(c["out"]?["labels"]), "\(id) labels")
                r.eq(SayCore.imageSize(tall: false).w, 1080, "\(id) w"); r.eq(SayCore.imageSize(tall: true).h, 1350, "\(id) h")
            }
        }
        finish(r, "say.actions")
    }
    func strs(_ j: JSON?) -> [String] { (j?.array ?? []).compactMap(\.string) }

    // MARK: reflex.pool
    func testReflexPool() throws {
        let V = try vec(); var r = R()
        for c in cases(V, "reflex", "pool") {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            switch id {
            case "sources-order":
                let cards = (i["cards"]?.object ?? [:]).keys.sorted().map { k in JSON.obj([("contexts", i["cards"]?[k] ?? .null)]) }
                let clips = Set(strs(i["withClip"]) + strs(i["readingClips"]))
                let pool = ReflexCore.pool(cards: cards, examples: (i["examples"]?.array ?? []).map { $0.s("ex") }, readings: strs(i["readings"]), hasClip: { clips.contains($0) },
                                           split: { VoiceCore.split($0) }, shuffle: { $0 })
                let want = strs(o["targets"])
                r.eq(pool.map(\.text), Array(want.prefix(pool.count)), "\(id) targets")
                var g = ReflexCore.Game(items: pool)
                g.start()
                var played: [String] = []
                for _ in 0..<want.count { played.append(g.current?.text ?? ""); g.skip() }
                r.eq(played, want, "\(id) played in order, wrapping")
                if case .youtube(let vid, let t)? = pool.first?.source { r.eq("\(vid):\(t)", "abcDEF12345:65", "\(id) first embed") } else { r.check(false, "\(id) first is YouTube") }
                r.eq(SpeakAccent.locale(.null), o.s("accent"), "\(id) accent")
            case "cap-40":
                let n = i.i("youtubeCards")
                let cards = (0..<n).map { k in JSON.obj([("contexts", .array([.obj([("text", "a b c d e"), ("source", .string("https://youtu.be/video\(String(format: "%05d", k))"))])]))]) }
                let pool = ReflexCore.pool(cards: cards, examples: [], readings: [], hasClip: { _ in true }, split: { VoiceCore.split($0) }, shuffle: { $0 })
                r.eq(pool.count, o.i("size"), "\(id) size")
                var g = ReflexCore.Game(items: pool); g.start()
                for _ in 0..<o.i("wrapAt") { g.skip() }
                r.eq(g.current, pool.first, "\(id) wraps to the first")
            case "youtube-embed":
                r.eq(ReflexCore.embedURL(id: i.s("id"), t: i.i("t")), o.s("src"), "\(id) src")
                r.eq([["wait", ReflexCore.embedWaitMs]].map { "\($0[0]):\($0[1])" }, (o.list("waits")).map { "\($0.array?[0].string ?? ""):\($0.array?[1].jsToString ?? "")" }, "\(id) wait")
                r.eq(ReflexCore.embedURL(id: "x", t: 0).contains("start=0&end=5"), true, "\(id) t 0 starts at 0")
            default:
                r.eq(vi(.speakReflexChuaCoCauDe), vec(o["stage"]), "\(id) stage")
                var g = ReflexCore.Game(items: []); g.start()
                r.check(g.current == nil, "\(id) no item"); r.eq(o["startHidden"]?.truthy, true, "\(id) start hidden")
            }
        }
        finish(r, "reflex.pool")
    }

    // MARK: reflex.colorize
    func testReflexColorize() throws {
        let V = try vec(); var r = R()
        for c in cases(V, "reflex", "colorize") {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            let col = ReflexCore.colorize(i.s("target"), i.s("heard"))
            r.eq(col.words.map { "\($0.w)|\($0.ok)" }, (o["words"]?.array ?? []).map { "\($0.array?[0].string ?? "")|\($0.array?[1].truthy ?? false)" }, "\(id) words")
            r.eq(col.pct, o.i("pct"), "\(id) pct"); r.eq(col.shown, o.s("shown"), "\(id) shown")
            r.eq(vi(.speakReflexBanNoi) + ": “" + col.shown + "” ·", vec(o.list("label").first), "\(id) label")
            r.eq(col.pct >= ReflexCore.goodPct, o.list("sfx").first?.string == "answer" && col.pct >= 80, "\(id) good sound")
        }
        finish(r, "reflex.colorize")
    }

    // MARK: reflex.game
    func testReflexGame() throws {
        let V = try vec(); var r = R()
        func clips(_ ts: [String]) -> [ReflexCore.Item] { ts.map { ReflexCore.Item(text: $0, source: .clip) } }
        for c in cases(V, "reflex", "game") {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            switch id {
            case "timed-run":
                var g = ReflexCore.Game(items: clips(strs(i["items"])))
                g.start()
                r.eq(g.left, 60, "\(id) timer"); r.eq(g.current?.text, strs(i["items"])[0], "\(id) first target")
                let heard = strs(i["heard"])
                let a = g.result(target: g.current!.text, heard: heard[0]); r.eq(a.pct, 100, "\(id) result-100")
                g.skip(); r.eq(g.current?.text, strs(i["items"])[1], "\(id) second target")
                let b = g.result(target: g.current!.text, heard: heard[1])
                r.check((o["log"]?.array?.last?["text"]?.string ?? "").contains("\(b.pct)%"), "\(id) partial text \(b.pct)")
                for t in o.list("ticks") {
                    var h = ReflexCore.Game(items: clips(strs(i["items"]))); h.start()
                    var alive = true
                    for _ in 0..<t.i("after") { alive = h.tick() }
                    r.eq(h.left, t.i("timer"), "\(id) timer after \(t.i("after"))"); r.eq(alive, t.i("after") < 60, "\(id) alive after \(t.i("after"))")
                }
                let s = g.finish(), fin = o.list("final")
                r.eq(vi(.lettersTimeSUp), vec(fin[1]), "\(id) final title")
                r.eq(said(SayMsg(.speakReflexNCauTrungBinh, ["n": String(s.n), "p": String(s.p)])), vec(fin[2]), "\(id) final text")
                r.eq(s.reward ?? [:], (o.list("rewards").first?.object ?? [:]).mapValues { Int($0.double ?? 0) }, "\(id) reward")
            case "timeout-no-answer":
                var g = ReflexCore.Game(items: clips(["a b c"])); g.start()
                let s = g.finish(), fin = o.list("final")
                r.eq(said(SayMsg(.speakReflexNCauTrungBinh, ["n": String(s.n), "p": String(s.p)])), vec(fin[2]), "\(id) final")
                r.check(s.reward == nil && o.list("rewards").isEmpty, "\(id) no reward")
            case "recognizer-error":
                r.eq(vi(.speakReflexKhongNgheRoThu), vec(o.list("hint").first), "\(id) hint")
                r.eq(o["nextHidden"]?.truthy, false, "\(id) next shown (model test)")
            default:
                var g = ReflexCore.Game(items: clips(["I like to read the news every morning.", "She walks to school with her best friend today."])); g.start()
                r.check(g.clipFailed(), "\(id) the failing clip is skipped")
                r.eq(g.current?.text, o.s("recognizerTarget"), "\(id) next target")
                var h = ReflexCore.Game(items: clips(["a b c", "d e f"])); h.start()
                r.check(h.clipFailed() && h.clipFailed() && h.clipFailed(), "\(id) three skips"); r.check(!h.clipFailed(), "\(id) the 4th goes to the recogniser")
                h.clipEnded(); r.check(h.clipFailed(), "\(id) an ended clip resets the counter")
            }
        }
        finish(r, "reflex.game")
    }

    // MARK: handsfree – the vector's words (gen-speak.mjs handsfreeVectors)
    func now(_ V: JSON) -> Int64 { Int64(V["now"]?.double ?? 0) }
    let day: Int64 = 86_400_000
    var W: [JSON] {
        [.obj([("word", "alpha"), ("vi", "chữ cái đầu"), ("ipa", "/ˈælfə/"), ("ex", "Alpha is the first letter of the Greek alphabet."), ("audio", "https://dict.example/alpha-uk.mp3"), ("audioUS", "https://dict.example/alpha-us.mp3")]),
         .obj([("word", "beta"), ("vi", "chữ cái thứ hai"), ("ex", "Beta comes after alpha in the alphabet.")]),
         .obj([("word", "gamma"), ("def", "the third letter"), ("ex", "")])]
    }
    func card(_ w: JSON, due: Int64, now: Int64, reps: Int = 1, last: Int64? = nil, added: Int64? = nil) -> JSON {
        var o = w.object ?? [:]
        o["srs"] = .obj([("ef", 2.5), ("interval", 1), ("reps", .int(reps)), ("lapses", 0), ("due", .number(Double(due))), ("last", last.map { .number(Double($0)) } ?? .null)])
        o["added"] = .number(Double(added ?? now - 5 * day))
        return .object(o)
    }
    func topics() -> [HandsfreeCore.Topic] { [.init(id: "ngsl1", name: "NGSL 1", words: W), .init(id: "demo", name: "Demo topic", words: Array(W.prefix(2)))] }

    func testHandsfreeQueue() throws {
        let V = try vec(), N = now(V); var r = R()
        for c in cases(V, "handsfree", "queue") {
            let id = c.s("id"), arg = c["input"]?.s("arg") ?? "", o = c["out"] ?? .null
            var cards: [JSON] = [], session: [String]? = nil, tops = topics()
            switch id {
            case "due":
                cards = [card(W[0], due: N - day, now: N, last: N - day), card(W[1], due: N + 2 * day, now: N, last: N - day), card(W[2], due: N, now: N, last: N - day),
                         card(.obj([("word", "newcard")]), due: N, now: N, reps: 0, last: nil, added: N)]
            case "book":
                cards = [card(W[0], due: N + 9 * day, now: N, last: N - day, added: N - 3 * day), card(W[1], due: N + 9 * day, now: N, last: N - day, added: N - day)]
            case "topic": cards = [card(W[0], due: N, now: N, last: N - day)]
            case "session": cards = [card(W[0], due: N, now: N, last: N - day), card(W[1], due: N, now: N, last: N - day)]; session = ["alpha", "missing", "beta"]
            case "session-empty": session = []
            case "no-words": tops = [.init(id: "ngsl1", name: "NGSL 1", words: [])]
            default: break
            }
            let q = HandsfreeCore.queue(arg: arg, cards: cards, topics: tops, session: session, now: N)
            let footer = o.list("footer").first
            r.eq(said(q.title), vec(footer?["v"]?["t"]), "\(id) title")
            r.eq("🔒 " + vi(.speakHfKhoaManHinhVan, ["t": said(q.title)]), vec(footer), "\(id) footer")
            let m = HandsfreeMachine(words: q.words.filter { !$0.s("word").isEmpty }, options: HandsfreeCore.options(nil), clip: { _ in false }, meaning: { Vocab.meanOf($0) }, meaningLang: { _ in "vi-VN" }, accent: { "en-GB" })
            r.eq(m.position, o.s("position"), "\(id) position")
            if let fw = o["firstWord"]?.string { r.eq(m.word.s("word"), fw, "\(id) first word") } else { r.check(m.words.isEmpty, "\(id) no words") }
            if !m.words.isEmpty { r.check(o["empty"] == nil || o["empty"] == .null, "\(id) not empty") } else { r.eq(vi(.speakHfChuaCoTuNao), vec(o["empty"]), "\(id) empty text") }
        }
        finish(r, "handsfree.queue")
    }

    // MARK: handsfree.play
    func testHandsfreePlay() throws {
        let V = try vec(), N = now(V); var r = R()
        let cardsAB = [card(W[0], due: N - day, now: N, last: N - day), card(W[1], due: N, now: N, last: N - day)]
        for c in cases(V, "handsfree", "play") {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            let hidden = i["hidden"]?.truthy == true, hold = i.i("hold")
            let clipsText: [String] = {
                switch i.s("clips") { case "none": return []; default: return id == "hidden-screen" ? ["alpha"] : ["alpha", W[0].s("ex")] }
            }()
            let q = HandsfreeCore.queue(arg: "", cards: cardsAB, topics: topics(), session: nil, now: N)
            let opts = HandsfreeCore.options(i["settings"]?["hf"])
            let m = HandsfreeMachine(words: q.words, options: opts, clip: { clipsText.contains($0) }, meaning: { Vocab.meanOf($0) }, meaningLang: { c in c.s("vi").isEmpty ? "en-GB" : "vi-VN" }, accent: { "en-GB" })
            var events: [String] = [], plays = 0
            var e = m.setPlay(true, hidden: hidden)
            while let eff = e {
                switch eff {
                case .audio(.clip(let t)): events.append("audio:" + VoiceCore.lineKey(voice: "bf_emma", text: t)); plays += 1
                case .audio(.url(let u)): events.append("audio:" + (u.hasSuffix(".mp3") ? String(u.dropLast(4)) : u)); plays += 1
                case .audio(.silence): events.append("audio:silence"); plays += 1
                case .wait(let ms): events.append("wait:\(ms)")
                case .speak(let t, let lang, let rate): events.append("speak:\(t):\(lang):\(rate)"); plays += 1
                }
                if plays >= hold { break }
                e = m.done(hidden: hidden)
            }
            let want = o.list("events").map { ev -> String in
                let a = ev.array ?? []
                switch a[0].string ?? "" {
                case "audio": return "audio:" + (a[1].string ?? "")
                case "wait": return "wait:\(a[1].jsToString)"
                default: return "speak:\(a[1].string ?? ""):\(a[2].string ?? ""):\(a[3].jsToString)"
                }
            }
            r.eq(events, want, "\(id) events")
            if id == "pause" { _ = m.setPlay(false, hidden: hidden); r.check(!m.playing && m.done(hidden: hidden) == nil, "\(id) paused, late events ignored") }
            r.eq(m.position, o.s("position"), "\(id) position")
            let w = m.word
            r.eq(String((w.s("word") + w.s("ipa") + Vocab.meanOf(w) + "“" + w.s("ex") + "”").prefix(80)), o.s("card"), "\(id) card")
        }
        finish(r, "handsfree.play")
    }

    // MARK: handsfree.controls
    func testHandsfreeControls() throws {
        let V = try vec(), N = now(V); var r = R()
        for c in cases(V, "handsfree", "controls") {
            let id = c.s("id"), o = c["out"] ?? .null
            switch id {
            case "prev-next":
                let cards = [card(W[0], due: N - day, now: N, last: N - day), card(W[1], due: N, now: N, last: N - day), card(W[2], due: N + day, now: N, last: N - day)]
                let q = HandsfreeCore.queue(arg: "", cards: cards, topics: topics(), session: nil, now: N)
                let m = HandsfreeMachine(words: q.words, options: HandsfreeCore.options(nil), clip: { _ in false }, meaning: { Vocab.meanOf($0) }, meaningLang: { _ in "vi-VN" }, accent: { "en-GB" })
                var seq: [String] = [m.position]
                _ = m.next(hidden: false); seq.append(m.position)
                _ = m.next(hidden: false); _ = m.next(hidden: false); seq.append(m.position)
                _ = m.previous(hidden: false); seq.append(m.position)
                for _ in 0..<3 { _ = m.previous(hidden: false) }; seq.append(m.position)
                r.eq(seq, (o["seq"]?.array ?? []).map { $0.array?[1].string ?? "" }, "\(id) sequence")
                let np = HandsfreeCore.nowPlaying(m.word, meaning: Vocab.meanOf(m.word), list: said(q.title))
                let md = o["metadata"] ?? .null
                r.eq(np.title, md.s("title"), "\(id) title"); r.eq(np.artist, md.s("artist"), "\(id) artist"); r.eq(np.album, md.s("album"), "\(id) album")
                m.setOption("ex", false); let t1 = m.options
                m.setOption("mean", false); let t2 = m.options
                r.eq((o["toggles"]?.array ?? []).count, 2, "\(id) two toggles")
                r.eq(t1["ex"]?.truthy, false, "\(id) ex off"); r.eq(t1["mean"]?.truthy, true, "\(id) mean still on"); r.eq(t2["mean"]?.truthy, false, "\(id) mean off")
                r.eq(t2["gap"]?.double, o["settingsHf"]?.d("gap"), "\(id) gap stays 900")
            case "media-session":
                r.eq(o.list("actions").count, 6, "\(id) six actions (the screen binds them: model test)")
            default:
                let d = HandsfreeCore.options(nil), w = o["defaults"] ?? .null
                r.eq(d["ex"]?.truthy, w["ex"]?.truthy, "\(id) ex"); r.eq(d["mean"]?.truthy, w["mean"]?.truthy, "\(id) mean"); r.eq(d["gap"]?.double, w.d("gap"), "\(id) gap")
            }
        }
        finish(r, "handsfree.controls")
    }
}
