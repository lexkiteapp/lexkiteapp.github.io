import Foundation
import XCTest
@testable import LKSync
@testable import LKStore
@testable import LKCore
import LKStrings

/// M4 P06 – Listening & Reading logic (LKStore/Skills) against vectors/skills.json, produced by running the REAL web code
/// (scripts/native/gen-skills.mjs; schema docs/specs/native-m4-vectors.md). One test per key of the file, every case checked, nothing skipped:
/// a field the native app has no use for (the `<mark>` of the transcript, the sound effect names) is the only thing left out, and each is named where it is skipped.
@MainActor
final class SkillsVectorTests: XCTestCase {
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

    /// P06: the reading list opens with real content and a language without a translator reads the English summary, never the Vietnamese one.
    func testParityP06() throws {
        let V = try vec(), D = data(V)
        XCTAssertFalse(D.parts.isEmpty); XCTAssertFalse(D.readings.isEmpty)
        let ar = ReadingList.build(D, query: [:], remembered: nil, game: .null, learnLang: "ar")
        XCTAssertEqual(ar.cards.count, D.readings.count)
        for r in D.readings { let en = r.s("summaryEn"); if !en.isEmpty { XCTAssertEqual(ReadingList.shownSummary(r, learnLang: "ar"), en) } }
        for r in D.readings { XCTAssertEqual(ReadingList.shownSummary(r, learnLang: "vi"), ReadingList.summary(r, learnLang: "vi").0) }
    }

    // MARK: fixtures
    static var cachedV: JSON?
    func vec() throws -> JSON { if let v = Self.cachedV { return v }; let v = try Vectors.load("skills.json"); Self.cachedV = v; return v }
    let vi = L10n(lang: "vi")
    func now(_ V: JSON) -> Int64 { Int64(V["now"]?.double ?? 0) }
    func data(_ V: JSON) -> SkillsData { SkillsData(json: V["data"] ?? .null) }
    func part(_ V: JSON, _ id: String) -> JSON { (V["data"]?.list("listening") ?? []).first { $0.s("id") == id } ?? .null }
    func lexis(_ V: JSON) -> Lexis { Lexis(data(V).lexis) }
    /// the vector text without the icon the web puts in front ("▶ Nghe tiếp", "⏳ Đang tải…")
    func plain(_ s: String) -> String {
        guard let f = s.unicodeScalars.first, !CharacterSet.letters.contains(f), !CharacterSet.decimalDigits.contains(f), let i = s.firstIndex(of: " ") else { return s }
        return String(s[s.index(after: i)...])
    }
    func strs(_ j: JSON?) -> [String] { (j?.array ?? []).compactMap(\.string) }
    func query(_ s: String) -> [String: String] {
        var q: [String: String] = [:]
        for kv in s.split(separator: "&") { let p = kv.split(separator: "=", maxSplits: 1).map(String.init); if p.count == 2 { q[p[0]] = p[1] } }
        return q
    }
    func answers(_ j: JSON?) -> QAnswers {
        var a = QAnswers()
        for (k, v) in j?.object ?? [:] {
            if k.hasPrefix("m"), let gi = Int(k.dropFirst()) { a.multi[gi] = strs(v) } else if let n = Int(k) { a.one[n] = v.string ?? v.jsToString }
        }
        return a
    }
    func pieces(_ p: [Lexis.Piece]) -> JSON {
        .array(p.map { x -> JSON in
            switch x {
            case .text(let s): return .string(s)
            case .word(let sh, let w, let c, let ph): return .array([.string(sh), .string(w), .string(c)] + (ph.map { [JSON.string($0)] } ?? []))
            }
        })
    }
    let startGame: JSON = .obj([("xp", 100), ("days", .object([:])), ("total", .object([:]))])
    /// a mistake record as the vector shows it (`mistakeRows` of gen-skills.mjs)
    func mistakeRow(_ m: JSON) -> JSON {
        var o: [(String, JSON)] = [("kind", m["kind"] ?? .null)]
        if let k = m["qK"] { o.append(("qK", k)) }
        o += [("q", m["q"] ?? .null), ("answer", m["answer"] ?? .null), ("given", m["givenK"] ?? m["given"] ?? .null)]
        if let k = m["explainK"] { o.append(("explainK", k)) }
        o += [("ref", m["ref"] ?? .null), ("n", m["n"] ?? .null), ("fixed", m["fixed"] ?? .null)]
        return .obj(o)
    }
    func dictOf(_ j: JSON?) -> [String: [String]] { (j?.object ?? [:]).mapValues { strs($0) } }

    // MARK: content + shared
    func testBundledContentIsTheVectorData() throws {
        let V = try vec(); var r = R()
        guard let b = SkillsData.bundled() else { return XCTFail("Resources/skills-content.json missing from LKStore") }
        let d = data(V)
        r.diff(.array(b.parts), .array(d.parts), "listening parts")
        r.diff(.array(b.readings), .array(d.readings), "readings")
        r.eq(b.lexis.awl, d.lexis.awl, "awl")
        r.eq(b.lexis.link, d.lexis.link, "link")
        r.eq(b.lexis.phrases.map { $0.text + "|" + $0.type }, d.lexis.phrases.map { $0.text + "|" + $0.type }, "phrases")
        finish(r, "bundled content (regenerate Resources/skills-content.json = skills.json `data` when the vector changes)")
    }

    func testKVoiceAndAudioUrl() throws {
        let V = try vec(); var r = R()
        let kv = V["shared"]?["kvoice"] ?? .null
        for c in kv.list("hash") { r.eq(VoiceCore.fnv36(c.s("input")), c.s("out"), "hash \(c.s("input"))") }
        for c in kv.list("voices") {
            let got = KVoice.voices(.obj([("speakers", c["speakers"] ?? .null)]))
            r.eq(got, (c["out"]?.object ?? [:]).compactMapValues { $0.string }, "voices \(c.s("part"))")
        }
        for c in kv.list("lineKeys") {
            let p = part(V, c.s("part")), voices = KVoice.voices(p), script = p.list("script")
            for k in c.list("keys") {
                let l = script[k.i("i")], voice = l.t("say") ? KVoice.narrator : (voices[l.s("s")] ?? KVoice.narrator)
                r.eq(voice, k.s("voice"), "voice \(c.s("part"))#\(k.i("i"))")
                r.eq(KVoice.clipKey(l, voices: voices), k.s("key"), "key \(c.s("part"))#\(k.i("i"))")
            }
        }
        for c in kv.list("split") { r.eq(VoiceCore.split(c.s("input")), strs(c["out"]), "split") }
        let au = V["shared"]?["audioUrl"] ?? .null
        r.eq(VoiceCore.bases, strs(au["bases"]), "bases")
        for s in au.list("steps") { r.eq(VoiceCore.urls(kind: .sentence, key: "k1", fails: s.i("failures")).first?.absoluteString ?? "", s.s("url"), "url after \(s.i("failures")) failures") }
        finish(r, "kvoice + audioUrl")
    }

    func testCast() throws {
        let V = try vec(); var r = R()
        for c in V["shared"]?.list("cast") ?? [] {
            let voices = dictOf(c["input"]?["voices"])
            for p in c["input"]?.list("parts") ?? [] {
                let got = ListenCast.cast(.obj([("speakers", p["speakers"] ?? .null)]), voices: voices)
                let want = (c["out"]?.array ?? []).first { $0.s("part") == p.s("id") }
                guard let w = want?["cast"]?.object else { r.check(false, "\(c.s("id")) \(p.s("id")): no expected cast"); continue }
                r.eq(Set(got.keys), Set(w.keys), "\(c.s("id")) \(p.s("id")) speakers")
                for (k, x) in w {
                    r.eq(got[k]?.voice, x["voice"]?.string, "\(c.s("id")) \(p.s("id")) \(k) voice")
                    r.eq(got[k]?.lang, x.s("lang"), "\(c.s("id")) \(p.s("id")) \(k) lang")
                    r.eq(got[k]?.pitch, x.d("pitch"), "\(c.s("id")) \(p.s("id")) \(k) pitch")
                }
            }
        }
        finish(r, "cast")
    }

    func testLexis() throws {
        let V = try vec(); var r = R()
        let lx = lexis(V), L = V["shared"]?["lexis"] ?? .null
        for c in L.list("classify") {
            let got = lx.classify(c.s("input")), out = c["out"] ?? .null
            r.eq(got.awl, out["awl"]?.string, "awl \(c.s("input"))")
            r.eq(got.link, out["link"]?.string, "link \(c.s("input"))")
        }
        for c in L.list("bases") { r.eq(Lexis.bases(c.s("input")), strs(c["out"]), "bases \(c.s("input"))") }
        for c in L.list("mark") {
            let inp = c["input"] ?? .null, kw = Set(strs(inp["keywords"])), mine = Set(strs(inp["mine"]))
            r.diff(pieces(lx.mark(inp.s("sentence"), keywords: kw, mine: { mine.contains($0) })), c["out"], "mark \(c.s("id"))")
        }
        finish(r, "lexis")
    }

    func testQuestionEngine() throws {
        let V = try vec(); var r = R()
        let Q = V["shared"]?["qe"] ?? .null
        for c in Q.list("norm") { r.eq(QE.norm(c.s("input")), c.s("out"), "norm \(c.s("input"))") }
        for c in Q.list("words") { r.eq(QE.words(c.s("input")), c.i("out"), "words \(c.s("input"))") }
        for c in Q.list("gradeGap") {
            let i = c["input"] ?? .null, o = c["out"] ?? .null
            let g = QE.gradeGap(a: strs(i["a"]), limit: i["limit"]?.double.map { Int($0) }, given: i.s("given"))
            r.eq(g.ok, o["ok"] == JSON.bool(true), "gradeGap ok \(i.s("given"))")
            if o["empty"] == JSON.bool(true) { r.check(g.empty, "gradeGap empty \(i.s("given"))") } else { r.eq(g.over, o["over"] == JSON.bool(true), "gradeGap over \(i.s("given"))") }
        }
        let band = Q["band"] ?? .null
        for skill in ["listening", "reading", "reading-gt"] {
            let want = (band[skill]?.array ?? []).map { $0.double ?? -1 }
            r.eq(want.count, 41, "band \(skill) rows")
            for raw in 0..<want.count { r.eq(QE.bandOf(raw, skill: skill), want[raw], "bandOf \(skill) \(raw)") }
        }
        for c in Q.list("overall") { r.eq(QE.overall((c["input"]?.array ?? []).compactMap(\.double)), c.d("out") ?? -1, "overall") }
        for c in Q.list("collect") {
            let p = part(V, c["input"]?.s("part") ?? ""), res = QE.collect(p, answers(c["input"]?["answers"]))
            let want = c["out"]?.object ?? [:]
            r.eq(Set(res.keys.map(String.init)), Set(want.keys), "collect \(c.s("id")) numbers")
            for (k, w) in want {
                guard let g = Int(k).flatMap({ res[$0] }) else { continue }
                r.eq(g.ok, w["ok"] == JSON.bool(true), "collect \(c.s("id")) #\(k) ok")
                r.eq(g.given, w.s("given"), "collect \(c.s("id")) #\(k) given")
                r.eq(g.answer, w.s("answer"), "collect \(c.s("id")) #\(k) answer")
                r.eq(g.kind, w.s("kind"), "collect \(c.s("id")) #\(k) kind")
                r.eq(g.over, w["over"] == JSON.bool(true), "collect \(c.s("id")) #\(k) over")
                if g.type != "multi" { r.eq(QE.recheck(g, picked: [], text: answers(c["input"]?["answers"]).one[g.n] ?? ""), g.ok, "recheck \(c.s("id")) #\(k)") }
            }
        }
        finish(r, "qe")
    }

    /// "Results by question type" and "Làm lại câu sai" over the real graded part of the vector (t1p1-mixed: 8 notes gaps, 2 MCQ)
    func testResultsByTypeAndRetake() throws {
        let V = try vec(); var r = R()
        let c = (V["shared"]?["qe"] ?? .null).list("collect").first { $0.s("id") == "t1p1-mixed" } ?? .null
        let res = QE.collect(part(V, "t1p1"), answers(c["input"]?["answers"]))
        let want = (c["out"]?.object ?? [:]).map { (Int($0.key) ?? 0, $0.value) }.sorted { $0.0 < $1.0 }
        let stats = QE.stats(Array(res.values))
        r.eq(stats.map(\.kind), ["notes", "mcq"], "kinds in order of first appearance")
        for st in stats {
            let rows = want.filter { $0.1.s("kind") == st.kind }
            r.eq(st.ok, rows.filter { $0.1["ok"] == JSON.bool(true) }.count, "\(st.kind) right")
            r.eq(st.all, rows.count, "\(st.kind) total")
            r.eq(st.wrong, rows.filter { $0.1["ok"] != JSON.bool(true) }.map(\.0), "\(st.kind) wrong numbers")
        }
        r.eq(stats.map(\.pct), [63, 50], "percent per kind")
        r.eq(stats.map(\.wrong), [[3, 5, 6], [9]], "wrong numbers per kind")
        // retake: the right answer turns a wrong question right (also the one over the word limit), a wrong one stays wrong
        for n in [3, 5, 6, 9] {
            guard let g = res[n] else { r.check(false, "Q\(n) missing"); continue }
            r.check(!g.ok, "Q\(n) was wrong")
            r.check(QE.recheck(g, picked: [], text: g.alts.first ?? ""), "Q\(n) retaken right")
            r.check(!QE.recheck(g, picked: [], text: "zzz"), "Q\(n) retaken wrong")
        }
        if let g5 = res[5] { r.check(!QE.recheck(g5, picked: [], text: "38 one two three four"), "Q5 over the limit stays wrong") }
        finish(r, "qe stats + retake")
    }

    func testTranscript() throws {
        let V = try vec(); var r = R()
        let T = V["shared"]?["transcript"] ?? .null, p = part(V, T.s("part")), lx = lexis(V)
        let plainRows = Transcript.rows(p, lexis: lx, evidence: false)
        r.eq(plainRows.count, T.i("lineCount"), "line count")
        for w in T.list("plain") {
            guard let row = plainRows.first(where: { $0.i == w.i("i") }) else { r.check(false, "row \(w.i("i")) missing"); continue }
            if w.s("kind") == "say" { r.eq(row.say ?? "", w.s("text"), "say \(w.i("i"))") } else {
                r.eq(row.speaker, w.s("speaker"), "speaker \(w.i("i"))")
                r.diff(pieces(row.tokens), w["tokens"], "tokens \(w.i("i"))")
            }
        }
        // `marked` (the <mark> around the cue) never applies natively: the line is shown whole and the cue is only played from
        let ev = Transcript.rows(p, lexis: lx, evidence: true).filter { !$0.ev.isEmpty }
        r.eq(ev.map(\.i), T.list("withEvidence").map { $0.i("i") }, "evidence lines")
        for (row, w) in zip(ev, T.list("withEvidence")) { r.eq(row.ev.compactMap { Int($0.prefix { $0.isNumber }) }, (w["ev"]?.array ?? []).map { Int(JSON.orZero($0)) }, "evidence numbers \(row.i)") }
        finish(r, "transcript")
    }

    // MARK: #/listening
    func testListeningHub() throws {
        let V = try vec(); var r = R()
        for c in V.list("listening") {
            let i = c["input"] ?? .null, o = c["out"] ?? .null, ids = Set(strs(i["tests"]))
            let D = SkillsData(parts: data(V).parts.filter { ids.contains($0.s("id")) }, readings: [], lexis: LexisData())
            let h = ListenHub.build(D, query: query(i.s("query")), remembered: i["localStorage"]?["vb.listenT"]?.string, game: i["game"] ?? .null, lang: i.s("lang")), id = c.s("id")
            r.eq(h.empty, o["empty"] == JSON.bool(true), "\(id) empty")
            r.eq(h.tabs.map { [$0.n, $0.done ? 1 : 0, $0.selected ? 1 : 0] }, o.list("tabs").map { [$0.i("n"), $0["done"] == JSON.bool(true) ? 1 : 0, $0["selected"] == JSON.bool(true) ? 1 : 0] }, "\(id) tabs")
            r.eq(h.selected, o["selected"]?.double.map { Int($0) }, "\(id) selected")
            r.eq(h.band, o["band"]?.double, "\(id) band")
            r.eq(h.fullTest, o["fullTest"]?.string, "\(id) fullTest")
            r.eq(h.persistedTest, o.s("persistedTest"), "\(id) persisted vb.listenT")
            if o["tips"] != nil { r.eq(ListenHub.tips.count, o.i("tips"), "\(id) tips") }
            let want = o.list("parts")
            r.eq(h.parts.count, want.count, "\(id) part count")
            for (g, w) in zip(h.parts, want) {
                r.eq(g.id, w.s("id"), "\(id) part id"); r.eq(g.part, w.i("part"), "\(id) part no")
                r.eq(vi(g.partKey), w.s("partKey"), "\(id) \(g.id) part name")
                r.eq(g.best, w["best"]?.double, "\(id) \(g.id) best"); r.eq(g.title, w.s("title"), "\(id) \(g.id) title"); r.eq(g.sub, w.s("sub"), "\(id) \(g.id) sub")
                r.eq(g.speakers.map { $0.flag + "|" + $0.name }, w.list("speakers").map { $0.s("flag") + "|" + $0.s("name") }, "\(id) \(g.id) speakers")
                r.eq(g.actions, strs(w["actions"]), "\(id) \(g.id) actions")
            }
        }
        finish(r, "listening")
    }

    // MARK: #/listen
    func testListenRender() throws {
        let V = try vec(); var r = R()
        for c in V["listen"]?.list("render") ?? [] {
            let i = c["input"] ?? .null, o = c["out"] ?? .null, id = c.s("id")
            guard o["fallback"] == nil else { r.check(data(V).part(i.s("part")) == nil, "\(id): unknown part must fall back to the hub"); r.eq(o.s("fallback"), "listening", id); continue }
            let p = part(V, i.s("part")), exam = i.s("mode") == "mode=exam"
            let pg = ListenPage.build(p, exam: exam, settings: .object([:]))
            r.eq(pg.backHref, o["back"]?.s("href") ?? "", "\(id) back href"); r.eq(vi(.skillListenLuyenNghe), o["back"]?.s("label") ?? "", "\(id) back label")
            r.eq(pg.switchHref, o["switchTo"]?.s("href") ?? "", "\(id) switch href")
            r.eq(vi(exam ? .skillListenCheDoLuyenTap : .skillListenCheDoThiThat), o["switchTo"]?.s("label") ?? "", "\(id) switch label")
            let h = o["head"] ?? .null
            r.eq([pg.test, pg.part, pg.qFrom, pg.qTo], [h.i("test"), h.i("part"), h.i("qFrom"), h.i("qTo")], "\(id) head"); r.eq(vi(pg.partKey), h.s("partName"), "\(id) part name")
            r.eq(pg.title, o.s("title"), "\(id) title"); r.eq(pg.context, o.s("context"), "\(id) context")
            r.eq(pg.speakers.map { $0.flag + "|" + $0.name }, o.list("speakers").map { $0.s("flag") + "|" + $0.s("name") }, "\(id) speakers")
            let pl = o["player"] ?? .null
            r.eq(pg.exam, pl["examNote"] == JSON.bool(true), "\(id) exam note"); r.eq(pg.hasBack, pl["hasBack"] == JSON.bool(true), "\(id) back button"); r.eq(pg.hasLive, pl["hasLive"] == JSON.bool(true), "\(id) live switch")
            r.eq(pg.rates.map { "\($0.v)|\(ListenPage.rateLabel($0.v) ?? vi(.skillListenChuan))|\($0.selected)" }, pl.list("rates").map { "\($0.d("v") ?? 0)|\($0.s("label"))|\($0["selected"] == JSON.bool(true))" }, "\(id) rates")
            r.eq(pg.transcriptHidden, o["transcriptHidden"] == JSON.bool(true), "\(id) transcript hidden"); r.eq(pg.blurred, o["blurred"] == JSON.bool(true), "\(id) blurred")
            r.eq(pg.tipsOn, o["tipsOn"] == JSON.bool(true), "\(id) tips"); r.eq(vi(.skillListenNopBaiXemDap), o.s("submit"), "\(id) submit label")
        }
        finish(r, "listen.render")
    }

    func testListenFlows() async throws {
        let V = try vec(); var r = R()
        let lx = lexis(V), ranges = ListenRules.rates
        r.eq(ranges, [0.8, 0.9, 0.95, 1, 1.1], "rates")
        for c in V["listen"]?.list("flows") ?? [] {
            let i = c["input"] ?? .null, o = c["out"] ?? .null, id = c.s("id"), p = part(V, i.s("part")), exam = i.s("mode") == "exam"
            // the player card: play the part (device voice) and read what the card shows
            let rec = Rec(), io = FakeListenIO(rec), box = StateBox(ListenPlayState(exam: exam))
            let pl = ListenPlayer(p, cast: ListenCast.cast(p, voices: ["en-GB": ["Daniel", "Kate"], "en-AU": ["Karen"]]), io: io, config: .init(hqEnabled: true, clipKeys: []))
            pl.onState = { box.s.playing = $0 }; pl.onLine = { box.s.nowLine = $0 }
            pl.onEnd = { box.s.ended = true; box.s.playing = false; if !exam { pl.stop() } }
            if i["held"] == JSON.bool(true) { io.hold = io.played + 3 }
            box.s.plays += 1
            pl.play(from: exam ? 0 : nil)
            await settle(pl, io)
            let ap = o["afterPlay"] ?? .null, st = box.s, label = st.label
            r.eq(plain(ap.s("playLabel")), vi(label.key), "\(id) play label"); r.eq(!label.enabled, ap["playDisabled"] == JSON.bool(true), "\(id) play disabled")
            let nowText = st.nowKey.map { vi($0) } ?? st.now(p).map { $0.key.map { vi($0) } ?? $0.name ?? "" } ?? ""
            r.eq(plain(ap.s("now")), nowText, "\(id) now line"); r.eq(rec.count("speak"), ap.i("spoken"), "\(id) spoken sentences")
            if o["secondTapIgnored"] != nil { r.eq(st.tapIgnored, true, "\(id) second tap ignored") }
            if o["submitted"] == JSON.bool(false) {
                r.check(ListenSubmit.needsConfirm(exam: exam, playing: st.playing), "\(id) must ask before submitting while playing")
                r.eq(i["confirmAnswer"] == JSON.bool(false), true, "\(id) declined")
                continue
            }
            let ans = answers(i["answerMap"]), out = ListenSubmit.submit(p, answers: ans, game: startGame, mistakes: [], now: now(V))
            let res = o["result"] ?? .null
            r.eq(out.ok ? "ok" : "no", res.s("cls"), "\(id) cls"); r.eq([out.right, out.total, out.xp], [res.i("right"), res.i("total"), res.i("xp")], "\(id) right/total/xp")
            r.eq(vi(out.advice), res.s("advice"), "\(id) advice")
            r.eq(["#/dictation/\(p.s("id"))"], strs(res["links"]), "\(id) links")
            let vocab = p.list("vocab")
            r.eq(vocab.map { $0.s("w") + "|" + $0.s("vi") + "|+ " + vi(.vocabSave) }, res.list("vocab").map { $0.s("w") + "|" + $0.s("vi") + "|" + $0.s("button") }, "\(id) vocab rows")
            r.diff(.array([.object(out.reward.mapValues { JSON.int($0) })]), o["rewards"], "\(id) rewards")
            r.diff(out.game["listenDone"], o["game"]?["listenDone"], "\(id) game.listenDone"); r.diff(out.game["qstat"], o["game"]?["qstat"], "\(id) game.qstat")
            r.diff(.array(out.mistakes.map(mistakeRow)), o["mistakes"], "\(id) mistakes")
            var after = st; after.submitted = true; after.ended = false; if !exam { after.playing = false }
            let aft = o["after"] ?? .null
            r.eq(plain(aft.s("playLabel")), vi(after.label.key), "\(id) label after submit"); r.eq(!after.label.enabled, aft["playDisabled"] == JSON.bool(true), "\(id) enabled after submit")
            if exam { r.eq(vi(after.noteKey ?? .skillListenDaNgheXong), aft.s("note"), "\(id) note after submit") }
            let rows = Transcript.rows(p, lexis: lx, evidence: true).filter { !$0.ev.isEmpty }
            r.diff(.array(rows.map { .obj([("i", .int($0.i)), ("ev", .array($0.ev.compactMap { Int($0.prefix { $0.isNumber }) }.map { .int($0) }))]) }), aft["transRows"], "\(id) transcript evidence")
            // "Nghe đoạn có đáp án": the line of the cue and where playing starts
            for h in o.list("hear") {
                let cue = out.results.first { $0.n == h.i("n") }?.cue ?? ""
                r.eq(cue, h.s("cue"), "\(id) cue of #\(h.i("n"))")
                let at = Transcript.hearStart(p, cue: cue)
                r.eq(at?.cueLine, h.i("cueLine"), "\(id) cue line #\(h.i("n"))"); r.eq(at?.startsAt, h.i("startsAt"), "\(id) starts at #\(h.i("n"))")
            }
            // "Từ vựng đáng học": the dictionary hit is the word + its meaning, the context is the line that has the word
            for v in o.list("vocabSave") {
                let w = v["vocab"] ?? .null
                let s = await ListenSubmit.vocabSave(w, part: p, dict: nil, meaning: nil, translate: { "VI:" + $0 })
                let want = v["addWord"]?.array?.first ?? .null
                r.eq(s.entry.s("word"), want["entry"]?.s("word") ?? "", "\(id) save \(w.s("w")) word"); r.eq(s.entry.s("vi"), want["entry"]?.s("vi") ?? "", "\(id) save \(w.s("w")) meaning")
                r.diff(s.ctx ?? .null, want["ctx"] ?? .null, "\(id) save \(w.s("w")) context")
            }
            _ = ans
        }
        finish(r, "listen.flows")
    }

    func testListenPopup() async throws {
        let V = try vec(); var r = R()
        for c in V["listen"]?.list("popup") ?? [] { await popupCase(c, V: V, title: "🎧 Listening: Joining a community sports centre", &r) }
        finish(r, "listen.popup")
    }

    /// Shared by the listening and the reader popup: calls, found / not found, label, context, translation call
    func popupCase(_ c: JSON, V: JSON, title: String, _ r: inout R) async {
        let i = c["input"] ?? .null, o = c["out"] ?? .null, id = c.s("id"), dict = i["dict"] ?? .null
        let quick: JSON? = dict["quick"] == JSON.null || dict["quick"] == nil ? nil : dict["quick"]
        let lookup: JSON? = dict["lookup"] == JSON.null || dict["lookup"] == nil ? nil : dict["lookup"]
        var calls: [String] = []
        let phase = await WordPopup.resolve(i.s("word"), sentence: i.s("sentence"), deck: { _ in i["inDeck"] == JSON.bool(true) }, quick: { _ in quick }, lookup: { _ in lookup }, calls: &calls)
        r.eq(calls, o.list("dictCalls").map { $0.array?.first?.string ?? "" }, "\(id) dictionary calls")
        let pop = o["popup"] ?? .null
        switch phase {
        case .notFound(let w, let tr):
            let text = vi(.lessonStoryNotFound, ["w": w]) + (tr.map { " " + vi(.skillReadDichVi, ["vi": $0]).replacingOccurrences(of: "<[^>]*>", with: "", options: .regularExpression) } ?? "")
            let want = pop.s("notFound")
            r.check(want == text || want == vi(.lessonStoryNotFound, ["w": w]), "\(id) not found: \(text) ≠ \(want)")
            r.eq(o.list("ctxBox").count, 0, "\(id) no context box")
        case .found(let f):
            r.eq(f.word, pop.s("word"), "\(id) word"); r.eq(f.mean, pop.s("mean"), "\(id) meaning")
            if pop["def"] != nil { r.eq(f.def, pop.s("def"), "\(id) definition") }
            r.eq("+ " + vi(WordPopup.saveLabel(f)), pop.s("saveLabel"), "\(id) save label")
            if pop["detailsHref"] != nil { r.eq(f.detailsHref, pop.s("detailsHref"), "\(id) details link") }
            r.eq([f.sentence, f.ctxWord], [o.list("ctxBox").first?.s("sentence") ?? "", o.list("ctxBox").first?.s("word") ?? ""], "\(id) context box")
            if let save = o["save"] {
                let tr = save.list("dictCalls").first?.array?.first?.string ?? ""
                r.eq(tr, i.s("learnLang") == "vi" ? "translateVi" : "translateTo", "\(id) translation call")
                let want = save["addWord"]?.array?.first?["ctx"] ?? .null
                let prefix = i.s("learnLang") == "vi" ? "VI:" : i.s("learnLang").uppercased() + ":"
                let ctx = JSON.obj([("text", .string(i.s("sentence"))), ("vi", .string(prefix + i.s("sentence"))), ("title", .string(title))])
                r.diff(ctx, want, "\(id) saved context")
                r.eq(vi(.skillListenDaLuuKemNgu), plain(save.s("buttonLabel")), "\(id) saved label")
            }
        }
    }

    // MARK: #/listen player
    func testListenPlayer() async throws {
        let V = try vec(); var r = R()
        let base = part(V, "t1p1")
        for c in V["listen"]?.list("player") ?? [] {
            let i = c["input"] ?? .null, o = c["out"] ?? .null, id = c.s("id")
            var p = base; p["script"] = .array(Array(base.list("script").prefix(i.i("lines"))))
            let kv = KVoice.voices(p)
            let keys = i.list("hqLines").map { KVoice.clipKey(p.list("script")[Int(JSON.orZero($0))], voices: kv) }
            let rec = Rec(), io = FakeListenIO(rec)
            io.speech = i["voices"] != JSON.null
            io.blockedAlways = i["blocked"] == JSON.bool(true)
            let failed = i.list("failedClips").compactMap { f -> String? in let n = Int(JSON.orZero(f)); return i.list("hqLines").firstIndex { Int(JSON.orZero($0)) == n }.map { keys[$0] } }
            io.failing = Set(failed)
            let rate = i["rate"]?.double
            let player = ListenPlayer(p, cast: ListenCast.cast(p, voices: dictOf(i["voices"])), io: io,
                                      config: .init(hqEnabled: i["settings"]?["hqVoice"] != JSON.bool(false), clipKeys: Set(keys), rate: { rate ?? ListenRules.defaultRate }, skipNarrator: i["skipNarrator"] == JSON.bool(true)))
            var toasts: [String] = []
            player.onLine = { rec.log.append(["line", .int($0)]) }; player.onState = { rec.log.append(["state", .bool($0)]) }; player.onEnd = { rec.log.append(["end"]) }
            player.onSound = { rec.log.append(["sound"]) }; player.onToast = { toasts.append(self.vi($0)) }
            if i["blocked"] == JSON.bool(true) { player.onBlocked = { rec.log.append(["blocked"]) } }
            for op in i.list("ops") {
                let a = op.array ?? []
                rec.log.append(.array([.string("op")] + a))
                switch a.first?.string ?? "" {
                case "play":
                    if a.count > 2, let n = a[2].double { io.hold = io.played + Int(n) }
                    player.play(from: a.count > 1 ? a[1].double.map { Int($0) } : nil)
                case "pause": io.hold = nil; player.pause()
                case "stop": io.hold = nil; player.stop()
                case "back": io.hold = nil; player.back()
                default: r.check(false, "\(id): unknown op")
                }
                await settle(player, io)
            }
            r.diff(.array(rec.log), o["events"], "\(id) events")
            r.eq(toasts, strs(o["toasts"]), "\(id) toasts")
            var seenKeys = Set<String>()
            r.eq(io.preloaded.filter { keys.contains($0) && seenKeys.insert($0).inserted }, strs(o["preloaded"]), "\(id) preloaded")
            r.eq(keys, strs(o["clipKeys"]), "\(id) clip keys")
            r.eq([player.pos, player.playing ? 1 : 0], [o.i("pos"), o["playing"] == JSON.bool(true) ? 1 : 0], "\(id) position / playing")
            player.stop()
        }
        finish(r, "listen.player")
    }

    // MARK: #/listen-test
    func testListenTest() async throws {
        let V = try vec(); var r = R()
        let D = data(V), T = V["listen-test"] ?? .null, intro = T["intro"] ?? .null
        let f0 = ListenTestFlow(test: intro["input"]?.i("n") ?? 1, data: D)
        r.eq(f0?.title, intro["out"]?.s("title"), "intro title")
        r.eq([vi(.skillListenBatDauThi), vi(.actionLater)], strs(intro["out"]?["buttons"]), "intro buttons")
        r.eq(f0?.parts.map { $0.s("id") }, strs(intro["out"]?["parts"]), "intro parts")
        r.check(ListenTestFlow(test: 99, data: D) == nil, "unknown test → hub")
        for c in T.list("flows") {
            let id = c.s("id"), o = c["out"] ?? .null, held = c["input"]?["held"] == JSON.bool(true)
            guard var flow = ListenTestFlow(test: c["input"]?.i("test") ?? 1, data: D) else { r.check(false, "\(id): no flow"); continue }
            flow.begin()
            for (k, w) in o.list("parts").enumerated() {
                let ch = flow.chip, tag = "\(id) part \(k + 1)"
                r.eq([ch.test, ch.part, ch.qFrom, ch.qTo], [w["chip"]?.i("test") ?? 0, w["chip"]?.i("part") ?? 0, w["chip"]?.i("qFrom") ?? 0, w["chip"]?.i("qTo") ?? 0], "\(tag) chip")
                r.eq(flow.part.s("id"), w.s("part"), "\(tag) part id"); r.eq(Int(flow.progressPct), w.i("progressPct"), "\(tag) progress")
                r.eq(vi(.skillListenNGiayDocCau, ["n": flow.left]), w.s("countdown"), "\(tag) countdown")
                r.eq(vi(flow.nextLabel) + (flow.isLast ? "" : " →"), w.s("nextLabel"), "\(tag) next label")
                r.eq(!flow.nextEnabled, w["nextDisabledInitially"] == JSON.bool(true), "\(tag) next disabled"); r.eq(vi(.skillListenNgheHetPhanNay), w.s("why"), "\(tag) why")
                if k == 0 { r.eq(ListenRules.tickMs, w.i("tickMs"), "\(tag) tick") }
                var ticks = 0
                while ticks < ListenRules.readSeconds - 1 { _ = flow.tick(); ticks += 1 }
                if k == 0 { r.eq(plain(w.s("countdownAt29")), vi(.skillListenNGiayDocCau, ["n": flow.left]), "\(tag) countdown at 29") }
                r.check(flow.tick(), "\(tag) the 30th tick starts the audio")
                r.eq(plain(w.s("afterStart")), vi(flow.stateKey), "\(tag) after start")
                // audio: the part is played once, from its first line
                let p = flow.part, rec = Rec(), io = FakeListenIO(rec), p0 = p
                if held && k == 0 { io.hold = io.played + 2 }
                let cast = ListenCast.cast(p0, voices: ["en-GB": ["Daniel", "Kate"], "en-AU": ["Karen"]])
                let player = ListenPlayer(p0, cast: cast, io: io, config: .init(hqEnabled: true, clipKeys: []))
                var nowLine = -1, playing = false
                let box = FlowBox(flow)
                player.onSound = { box.flow.sound() }; player.onLine = { nowLine = $0 }; player.onState = { playing = $0 }; player.onEnd = { box.flow.ended() }
                player.play(from: 0)
                await settle(player, io)
                flow = box.flow
                r.eq(rec.first("speak"), w.s("firstSpeak"), "\(tag) first speak")
                r.eq(Array(Set(rec.waits + [ListenRules.nextFallbackMs])).sorted(), (w["waits"]?.array ?? []).map { Int(JSON.orZero($0)) }, "\(tag) waits")
                let wl = w["whenListened"] ?? .null
                r.eq(plain(wl.s("count")), vi(flow.stateKey), "\(tag) state line"); r.eq(!flow.nextEnabled, wl["nextDisabled"] == JSON.bool(true), "\(tag) next disabled when listened")
                var ps = ListenPlayState(exam: true); ps.playing = playing; ps.nowLine = nowLine
                r.eq(plain(wl.s("now")), ps.now(p).map { $0.key.map { vi($0) } ?? $0.name ?? "" } ?? "", "\(tag) now line")
                if let st = w["stuck"] {
                    r.eq(ListenRules.nextFallbackMs, st.i("fallbackMs"), "\(tag) fallback ms"); r.eq(!flow.nextEnabled, st["nextDisabledBefore"] == JSON.bool(true), "\(tag) disabled before")
                    flow.fallback(); r.eq(!flow.nextEnabled, st["nextDisabledAfter"] == JSON.bool(true), "\(tag) disabled after")
                }
                player.stop()
                _ = flow.next(answers(w["answers"]))
            }
            let res = flow.finish(game: startGame, mistakes: [], now: now(V)), want = o["result"] ?? .null
            r.eq([res.raw, Int(res.band * 2)], [want.i("raw"), Int((want.d("band") ?? 0) * 2)], "\(id) raw / band")
            r.eq(res.byPart.map { "\($0.href)|\($0.part)|\($0.right)" }, want.list("byPart").map { "\($0.s("href"))|\($0.i("part"))|\($0.i("right"))" }, "\(id) by part")
            r.eq(res.sheet.map { "\($0.n)|\($0.ok)|\($0.answer)|\($0.ok ? "" : $0.given)" }, want.list("sheet").map { "\($0.i("q"))|\($0["ok"] == JSON.bool(true))|\($0.s("answer"))|\($0.s("given"))" }, "\(id) answer sheet")
            r.diff(.array([.object(res.reward.mapValues { JSON.int($0) })]), o["rewards"], "\(id) rewards")
            for k in ["listenBest", "listenTests", "qstat"] { r.diff(res.game[k], o["game"]?[k], "\(id) game.\(k)") }
            r.eq(res.mistakes.count, o.i("mistakes"), "\(id) mistakes"); r.diff(res.mistakes.first.map(mistakeRow) ?? .null, o["firstMistake"] ?? .null, "\(id) first mistake")
            // the sound effect names ("win") and the confetti count are the web's; natively a success haptic follows `celebrates`
            r.eq(res.celebrates, !(o["celebrate"]?.list("sfx").isEmpty ?? true), "\(id) celebrates")
        }
        finish(r, "listen-test")
    }

    // MARK: #/dictation
    func testDictation() async throws {
        let V = try vec(); var r = R()
        let D = V["dictation"] ?? .null, p = part(V, "t1p1")
        // diff of a whole sentence
        for c in D.list("diff") {
            let d = Dictation.diff(target: c["input"]?.s("target") ?? "", given: c["input"]?.s("typed") ?? ""), id = c.s("id")
            r.eq(Vocab.round(d.pct * 100), c["out"]?.i("pct") ?? -1, "\(id) pct"); r.eq(d.pct >= 0.9 ? "ok" : "no", c["out"]?.s("cls") ?? "", "\(id) cls")
            r.eq(d.items.map { $0.mark.rawValue + "|" + $0.text }, (c["out"]?.list("diff") ?? []).map { ($0.array?[0].string ?? "") + "|" + ($0.array?[1].string ?? "") }, "\(id) diff")
        }
        // the sentences with their gaps
        for c in D.list("render") {
            let mode = c["input"]?.s("mode") ?? "mid", s = Dictation.Session(part: p, mode: mode), want = c["out"]?.list("cells") ?? []
            for (k, w) in want.enumerated() {
                var sess = s; for _ in 0..<k { sess.skip() }
                r.eq(p["speakers"]?[sess.lines[k].speaker]?.s("name"), w.s("speaker"), "\(c.s("id")) \(k) speaker")
                let got: [JSON] = sess.cells.map { cell in
                    switch cell {
                    case .word(let t): return .string(t)
                    case .hole(let i, let pre, let size, let post): return .obj([("pre", .string(pre)), ("hole", .int(i)), ("size", .int(size)), ("post", .string(post))])
                    }
                }
                r.diff(.array(got), w["cells"], "\(c.s("id")) line \(k) cells")
            }
            r.eq(s.lines.count, c["out"]?.i("count") ?? -1, "\(c.s("id")) lines")
            let skipped = s.finish(old: nil), want0 = c["out"]?["skippedAll"] ?? .null
            r.eq([skipped.pct, skipped.count], [want0.i("pct"), want0.i("count")], "\(c.s("id")) nothing checked"); r.eq(skipped.links, strs(want0["links"]), "\(c.s("id")) links")
        }
        // walks: the right word in every gap / the whole line
        for c in D.list("walks") {
            let mode = c["input"]?.s("mode") ?? "mid", o = c["out"] ?? .null, id = c.s("id")
            var s = Dictation.Session(part: p, mode: mode)
            r.eq(s.lines.count, o.i("count"), "\(id) count")
            for (k, w) in o.list("lines").enumerated() {
                r.eq(p["speakers"]?[s.lines[k].speaker]?.s("name"), w.s("speaker"), "\(id) \(k) speaker"); r.eq(s.words.count, w.i("nWords"), "\(id) \(k) words")
                let holes: [[Int]] = s.cells.compactMap { if case .hole(let i, _, let size, _) = $0 { return [i, size] }; return nil }
                r.eq(holes, w.list("holes").map { ($0.array ?? []).map { Int(JSON.orZero($0)) } }, "\(id) \(k) gaps")
                let words = s.words
                if mode == "full" { s.check(.full(s.lines[k].text)) }
                else { s.check(.holes(s.cells.compactMap { if case .hole(let i, _, _, _) = $0 { return Dictation.answer(words[i]) }; return nil })) }
                if k == 0, let f = s.feedback, let w0 = o["firstFeedback"] {
                    r.eq(vi(.skillListenCauTiep) + " ↵", w0.s("checkLabel"), "\(id) check label"); r.eq(f.ok ? "ok" : "no", w0.s("cls"), "\(id) first cls")
                    if mode == "full" { r.eq(f.percent, w0.i("pct"), "\(id) first pct") } else { r.eq([f.right ?? -1, f.of ?? -1], [w0.i("right"), w0.i("of")], "\(id) first right/of") }
                }
                s.advance()
            }
            let fin = s.finish(old: nil), want = o["final"] ?? .null
            r.check(s.finished, "\(id) ended"); r.eq([fin.pct, fin.count], [want.i("pct"), want.i("count")], "\(id) final"); r.eq(fin.links, strs(want["links"]), "\(id) links")
            r.diff(.array([.object(fin.reward.mapValues { JSON.int($0) })]), o["rewards"], "\(id) rewards"); r.diff(JSON.obj([("t1p1", .number(fin.dictDone))]), o["dictDone"], "\(id) dictDone")
        }
        // sittings
        for c in D.list("session") {
            let id = c.s("id"), mode = c["input"]?.s("mode") ?? "mid", o = c["out"] ?? .null
            var s = Dictation.Session(part: p, mode: mode)
            let typedDiff = D.list("diff")
            for k in 0..<s.lines.count {
                let words = s.words, perfect: Dictation.Typed = mode == "full" ? .full(s.lines[k].text) : .holes(s.cells.compactMap { if case .hole(let i, _, _, _) = $0 { return Dictation.answer(words[i]) }; return nil })
                switch id {
                case "diff-session":
                    if k < typedDiff.count { s.check(.full(typedDiff[k]["input"]?.s("typed") ?? "")); s.advance() } else { s.skip() }
                case "mid-alternating":
                    let holes = s.cells.filter { if case .hole = $0 { return true }; return false }.count
                    s.check(k % 2 == 1 ? .holes(Array(repeating: "x", count: holes)) : perfect)
                    if k == 1, let f = s.feedback, let w = o["firstWrong"] {
                        r.eq([f.right ?? -1, f.of ?? -1], [w.i("right"), w.i("of")], "\(id) first wrong right/of"); r.eq(f.ok ? "ok" : "no", w.s("cls"), "\(id) first wrong cls")
                        r.eq(f.gaps.map { ($0.ok ? "ok" : "no") + "|" + $0.answer }, w.list("cells").map { ($0.array?[0].string ?? "") + "|" + ($0.array?[1].string ?? "") }, "\(id) gap marks")
                    }
                    s.advance()
                default:
                    if k % 3 == 0 { s.check(perfect); s.advance() } else { s.skip() }
                }
            }
            let fin = s.finish(old: nil), want = o["fin"] ?? .null
            r.eq([fin.pct, fin.count], [want.i("pct"), want.i("count")], "\(id) fin"); r.eq(fin.links, strs(want["links"]), "\(id) links")
            r.diff(.array([.object(fin.reward.mapValues { JSON.int($0) })]), o["rewards"], "\(id) rewards"); r.diff(JSON.obj([("t1p1", .number(fin.dictDone))]), o["dictDone"], "\(id) dictDone")
        }
        // the sound of one line: the speaker's clip (0.7 slow, pitch kept) or the cast voice (0.7 slow)
        let kv = KVoice.voices(p), lines = Dictation.lines(p)
        for c in D.list("say") {
            let i = c["input"] ?? .null, rec = Rec(), io = FakeListenIO(rec), l = lines[i.i("line")]
            let key = KVoice.clipKey(p.list("script")[l.i], voices: kv)
            let player = ListenPlayer(p, cast: ListenCast.cast(p, voices: ["en-GB": ["Daniel", "Kate"], "en-AU": ["Karen"]]), io: io, config: .init(clipKeys: Set(strs(i["clipKeys"]))))
            r.eq(strs(i["clipKeys"]).isEmpty || strs(i["clipKeys"]) == [key], true, "\(c.s("id")) clip key")
            player.say(line: l.i, slow: i["slow"] == JSON.bool(true))
            await settle(player, io)
            r.diff(.array(rec.log.filter { $0.array?.first?.string == "speak" || $0.array?.first?.string == "audio" }), c["out"]?["events"], "\(c.s("id")) events")
        }
        // mode: ?m= beats the setting, the default is mid; the next mode of the end page
        r.eq(Dictation.mode(query: [:], settings: .object([:])), "mid", "default mode")
        r.eq(Dictation.mode(query: [:], settings: .obj([("dictMode", "hard")])), "hard", "setting mode")
        r.eq(Dictation.mode(query: ["m": "full"], settings: .obj([("dictMode", "hard")])), "full", "query mode")
        r.check(data(V).part("zzz") == nil, "unknown part → hub")
        finish(r, "dictation")
    }

    // MARK: #/reading, #/read
    func testReadingList() throws {
        let V = try vec(); var r = R()
        for c in V.list("reading") {
            let i = c["input"] ?? .null, o = c["out"] ?? .null, id = c.s("id"), ids = strs(i["readings"])
            let all = data(V).readings, D = SkillsData(parts: [], readings: ids.compactMap { x in all.first { $0.s("id") == x } }, lexis: LexisData())
            let l = ReadingList.build(D, query: query(i.s("query")), remembered: i["localStorage"]?["vb.readLv"]?.string, game: i["game"] ?? .null, learnLang: i.s("learnLang"))
            r.eq(l.tabs.map { "\($0.lv == "all" ? vi(.vocabAll) : $0.lv)|\($0.lv)|\($0.n)|\($0.selected)" }, o.list("tabs").map { "\($0.s("label"))|\($0.s("lv"))|\($0.i("n"))|\($0["selected"] == JSON.bool(true))" }, "\(id) tabs")
            r.eq(l.selected, o["selected"]?.string, "\(id) selected"); r.eq(l.persistedLevel, o.s("persistedLevel"), "\(id) persisted vb.readLv")
            let want = o.list("cards")
            r.eq(l.cards.count, want.count, "\(id) cards")
            for (g, w) in zip(l.cards, want) {
                r.eq([g.id, g.emoji, g.title, g.summary, g.kind.rawValue], [w.s("id"), w.s("emoji"), w.s("title"), w.s("summary"), w.s("summaryKind")], "\(id) \(g.id) card")
                r.eq([g.minutes, g.questions], [w.i("minutes"), w.i("questions")], "\(id) \(g.id) minutes / questions"); r.eq(g.done, w["done"]?.string, "\(id) \(g.id) done chip")
            }
        }
        finish(r, "reading")
    }

    func testReader() async throws {
        let V = try vec(); var r = R()
        let D = data(V), lx = lexis(V), R_ = V["read"] ?? .null
        for c in R_.list("render") {
            let i = c["input"] ?? .null, o = c["out"] ?? .null, id = c.s("id")
            if o["fallback"] != nil { r.check(D.reading(i.s("id")) == nil, "\(id): unknown id → the list"); continue }
            if i["reading"] == nil { r.eq(ReaderPage.highlights(.obj([("hl", .string(i.s("settingsHl")))])).map { "hl-" + $0 }, strs(o["passageClasses"]), "\(id) classes"); continue }
            guard let rd = D.reading(i.s("reading")) else { r.check(false, "\(id): no reading"); continue }
            let deck = Set(strs(i["cards"]).map { $0.lowercased() }), page = ReaderPage(rd, lexis: lx, inDeck: { deck.contains($0) })
            r.eq([rd.s("level"), rd.s("topic"), rd.s("emoji"), rd.s("title")], [o.s("level"), o.s("topic"), o.s("emoji"), o.s("title")], "\(id) head")
            r.eq(ReadingList.summary(rd, learnLang: "vi").1.rawValue, o.s("summaryKind"), "\(id) summary kind")
            r.eq(ReaderPage.highlights(.object([:])), o.list("highlightChips").filter { $0["on"] == JSON.bool(true) }.map { $0.s("k") }, "\(id) chips")
            r.eq(ReaderPage.highlights(.object([:])).map { "hl-" + $0 }, strs(o["passageClasses"]), "\(id) passage classes")
            let counts = page.counts
            r.eq([counts["kw"] ?? -1, counts["awl"] ?? -1, counts["link"] ?? -1, counts["mine"] ?? -1], ["kw", "awl", "link", "mine"].map { o["counts"]?.i($0) ?? -2 }, "\(id) counts")
            r.eq([page.paragraphs, page.sentences.count, page.words, rd.list("questions").count, page.keywords.count], ["paragraphs", "sentences", "words", "questions", "keywordChips"].map { o.i($0) }, "\(id) sizes")
            if let ps = o["passage"] { r.diff(.array(page.passage.map { .array($0.map { pieces($0) }) }), ps, "\(id) passage tokens") }
        }
        for c in R_.list("popup") {
            let title = ReaderPage.contextTitle(D.reading(c["input"]?.s("reading") ?? "")?.s("title") ?? "")
            await popupCase(c, V: V, title: title, &r)
            // after the save every token of the word is "mine" and the counters follow
            if let after = c["out"]?["save"]?["countsAfter"], let rd = D.reading(c["input"]?.s("reading") ?? "") {
                let w = c["input"]?.s("word") ?? "", page = ReaderPage(rd, lexis: lx, inDeck: { $0 == w }), cn = page.counts
                r.eq([cn["kw"] ?? -1, cn["awl"] ?? -1, cn["link"] ?? -1, cn["mine"] ?? -1], ["kw", "awl", "link", "mine"].map { after.i($0) }, "\(c.s("id")) counts after save")
            }
        }
        for c in R_.list("questions") {
            let i = c["input"] ?? .null, o = c["out"] ?? .null, id = c.s("id"), rd = D.reading(i.s("reading")) ?? .null
            let picks: [String?] = (i["picks"]?.array ?? []).map { $0 == JSON.null ? nil : ($0.string ?? $0.jsToString) }
            if i["confirmAnswer"] == JSON.bool(false) { r.check(ReadingGrade.needsConfirm(rd, picks: picks), "\(id) asks first"); r.eq(o["graded"] == JSON.bool(true), false, "\(id) nothing graded"); continue }
            if picks.contains(where: { $0 == nil }) { r.check(ReadingGrade.needsConfirm(rd, picks: picks), "\(id) asks about blanks") }
            let g = ReadingGrade.grade(rd, picks: picks, game: .obj([("readDone", i["alreadyDone"] ?? .object([:]))]), mistakes: [], now: now(V)), res = o["result"] ?? .null
            r.eq([g.score, g.n, g.pct, g.xp], [res.i("score"), res.i("n"), res.i("pct"), res.i("xp")], "\(id) result"); r.eq(g.ok ? "ok" : "no", res.s("cls"), "\(id) cls"); r.eq(g.links, strs(res["links"]), "\(id) links")
            for (k, w) in o.list("items").enumerated() {
                let item = g.items[k], q = rd.list("questions")[k]
                let wc: String? = w["chosen"].flatMap { $0 == JSON.null ? nil : ($0.string ?? $0.jsToString) }
                r.eq(item.chosen, wc, "\(id) #\(k + 1) chosen")
                let classes = ReadingGrade.options(q).map { o -> String in
                    let right = o.value == item.right, sel = item.chosen == o.value
                    return right && sel ? "right+sel" : right ? "right" : sel ? "sel+wrong" : ""
                }
                r.eq(classes, strs(w["classes"]), "\(id) #\(k + 1) option marks")
                r.eq((item.ok ? "" : "❌ ") + item.explain, w.s("explain"), "\(id) #\(k + 1) explanation")
            }
            r.diff(.array([.object(g.reward.mapValues { JSON.int($0) })]), o["rewards"], "\(id) rewards"); r.diff(g.game["readDone"], o["game"]?["readDone"], "\(id) game.readDone")
            r.diff(.array(g.mistakes.map(mistakeRow)), o["mistakes"], "\(id) mistakes")
        }
        for c in R_.list("actions") {
            let i = c["input"] ?? .null, o = c["out"] ?? .null, id = c.s("id"), rd = D.reading(i.s("reading")) ?? .null
            switch id {
            case "highlight-toggle":
                var on = i.s("start").split(separator: " ").map(String.init)
                for (k, step) in o.list("steps").enumerated() {
                    on = ReaderPage.toggled(on, strs(i["toggles"])[k])
                    r.eq(on.joined(separator: " "), step.s("settings"), "\(id) step \(k) settings"); r.eq(on.map { "hl-" + $0 }, strs(step["passage"]), "\(id) step \(k) classes")
                }
            case "save-all-keywords":
                let page = ReaderPage(rd, lexis: lx, inDeck: { _ in false }), inDeck = Set(strs(i["alreadyInDeck"]))
                let known = Dictionary(uniqueKeysWithValues: o.list("saved").compactMap { s -> (String, JSON)? in s["entry"]?["vi"] != nil ? (s["entry"]!.s("word"), s["entry"]!) : nil })
                let got = page.saveAllKeywords(inDeck: { inDeck.contains($0) }, index: { known[$0] })
                r.diff(.array(got.map { .obj([("entry", $0.entry), ("ctx", $0.ctx ?? .null)]) }), .array(o.list("saved").map { .obj([("entry", $0["entry"] ?? .null), ("ctx", $0["ctx"] ?? .null)]) }), "\(id) saved words")
                r.eq(got.count, o.i("n"), "\(id) n"); r.eq(vi(.skillReadDaLuuNTu, ["n": got.count]), o.list("toasts").first?.string ?? "", "\(id) toast"); r.eq("✓ " + vi(.revSaved), o.s("buttonLabel"), "\(id) button")
            case "keyword-chip":
                r.eq(ReadingRules.keywordPopupDelayMs, (o.list("waits").first?.array?[1].double).map { Int($0) } ?? -1, "\(id) delay")
                r.check(ReaderPage(rd, lexis: lx, inDeck: { _ in false }).firstToken(for: i.s("keyword")) != nil, "\(id) the chip finds its word")
            case "read-aloud":
                let a = ReaderPage(rd, lexis: lx, inDeck: { _ in false }).aloud
                r.eq(String(a.text.prefix(80)), o.s("textStartsWith"), "\(id) text start"); r.eq(a.text.utf16.count, o.i("textLength"), "\(id) text length")
                r.eq(Set(a.sentenceOf).count, o.i("sentences"), "\(id) sentences"); var order: [Int] = []; for x in a.sentenceOf where order.last != x { order.append(x) }
                r.eq(Array(order.prefix(3)), (o["highlight"]?.array ?? []).map { Int(JSON.orZero($0.array?.first)) }, "\(id) highlight order")
            default: r.check(false, "\(id): unknown action")
            }
        }
        finish(r, "read")
    }

    // MARK: persistence
    func testPersistMap() throws {
        let V = try vec()
        let by = V["persist"]?["byRoute"]?.object ?? [:]
        XCTAssertEqual(Set(by.keys), ["listening", "listen", "listen-test", "dictation", "reading", "read"], "the six P06 routes")
        // what the native screens write: listenT/readLv (device), game.*, settings.*, mistakes
        XCTAssertEqual(strs(by["listening"]), ["localStorage:vb.listenT"]); XCTAssertEqual(strs(by["reading"]), ["localStorage:vb.readLv"])
        XCTAssertEqual(strs(by["listen"]), ["game:listenDone", "game:qstat", "game:qwk", "store:mistakes"])
        XCTAssertEqual(strs(by["listen-test"]), ["game:listenBest", "game:listenTests", "game:qstat", "game:qwk", "store:mistakes"])
        XCTAssertEqual(strs(by["dictation"]), ["game:dictDone", "settings:dictAuto", "settings:dictMode"])
        XCTAssertEqual(strs(by["read"]), ["game:readDone", "settings:hl", "store:mistakes"])
    }

    // MARK: harness
    /// a part has finished playing, or is waiting on a held sound / timer
    func settle(_ p: ListenPlayer, _ io: FakeListenIO) async {
        for _ in 0..<4000 { if !p.running || io.parked { return }; await Task.yield() }
    }
}

/// the one event log of a scenario (ops, player callbacks and the fake sound, in order)
@MainActor
final class Rec {
    var log: [JSON] = []
    var waits: [Int] = []
    func count(_ kind: String) -> Int { log.filter { $0.array?.first?.string == kind }.count }
    func first(_ kind: String) -> String { log.first { $0.array?.first?.string == kind }?.array?[1].string ?? "" }
}
@MainActor
final class StateBox { var s: ListenPlayState; init(_ s: ListenPlayState) { self.s = s } }
@MainActor
final class FlowBox { var flow: ListenTestFlow; init(_ f: ListenTestFlow) { flow = f } }

/// The recording platform of gen-skills.mjs `platform()`: every utterance / clip completes by itself unless it is held (`hold` = after that many plays),
/// timers of ≥ 15 s never fire, a stopped player ends every pending wait.
@MainActor
final class FakeListenIO: ListenIO {
    let rec: Rec
    var played = 0, hold: Int?
    var failing = Set<String>(), blockedAlways = false, speech = true
    var preloaded: [String] = []
    private var epoch = 0
    private var parkers: [Int] = []
    init(_ rec: Rec) { self.rec = rec }
    var canSpeak: Bool { speech }
    var isHeld: Bool { hold.map { played >= $0 } ?? false }
    /// a sound or timer that never finishes by itself (until the player stops)
    var parked: Bool { parkers.contains(epoch) }
    private func park() async {
        let e = epoch; parkers.append(e)
        while !Task.isCancelled && epoch == e { try? await Task.sleep(nanoseconds: 20_000_000) }
        if let i = parkers.firstIndex(of: e) { parkers.remove(at: i) }
    }
    func clip(_ key: String, rate: Double, onPlaying: @escaping () -> Void) async -> ListenClipResult {
        if blockedAlways { return .blocked }
        played += 1
        rec.log.append(.array(["audio", .string(key), .number((rate * 1e6).rounded() / 1e6)]))
        if isHeld { await park(); return .ended }
        await Task.yield()
        if failing.contains(key) { return .failed(played: false) }
        onPlaying()
        return .ended
    }
    func preload(_ key: String) { preloaded.append(key) }
    func speak(_ pieces: [String], voice: CastVoice, rate: Double, onStart: @escaping () -> Void) async {
        var firstHeld = false, anyHeld = false
        for (k, text) in pieces.enumerated() {
            played += 1
            let name: JSON = voice.voice.map { JSON.string($0) } ?? JSON.null
            rec.log.append(.array(["speak", .string(text), name, .string(voice.lang), .number(voice.pitch), .number(rate)]))
            if isHeld { anyHeld = true; if k == 0 { firstHeld = true } }
        }
        await Task.yield()
        if !firstHeld { onStart() }
        if anyHeld { await park() }
    }
    func wait(ms: Int) async {
        rec.log.append(.array(["wait", .int(ms)])); rec.waits.append(ms)
        if ms >= 15_000 { await park(); return }
        await Task.yield()
    }
    func stop() { epoch += 1 }
}
