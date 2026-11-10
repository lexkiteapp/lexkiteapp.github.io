import Foundation
import XCTest
@testable import LKSync
@testable import LKStore
@testable import LKCore
import LKStrings

/// M4 P07 – #/rtype and #/roleplay logic (LKStore/Speak/RtypeCore, RoleplayCore) against vectors/speak.json, produced by running the REAL web code
/// (scripts/native/gen-speak.mjs; docs/specs/native-m4-vectors.md "Kiểm kê P07"). One test per vector key, every case checked, nothing skipped.
/// The platform sides are inputs: the server of the AI chat is a script of replies taken from each case's expected bubbles, randomness is the case's `random`,
/// the date is the case's day. Only the toast TEXT of recogniser errors (`ERR:<code>`) and the HTTP transport (headers, token) are left to the screens.
@MainActor
final class SpeakRtypeRoleplayVectorTests: XCTestCase {
    struct R {
        var checked = 0
        var failures: [String] = []
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) { checked += 1; if !ok { if failures.count < 25 { failures.append(s()) } else if failures.count == 25 { failures.append("…") } } }
        mutating func eq<T: Equatable>(_ a: T, _ b: T, _ label: String) { check(a == b, "\(label): \(a) ≠ \(b)") }
        mutating func diff(_ a: JSON?, _ b: JSON?, _ label: String) { let d = jsonDiff(a, b); check(d == nil, "\(label): \(d ?? "")") }
    }
    func finish(_ r: R, _ name: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThan(r.checked, 0, "\(name): nothing checked", file: file, line: line)
        XCTAssertTrue(r.failures.isEmpty, "\(name): \(r.failures.count) of \(r.checked) failed:\n" + r.failures.joined(separator: "\n"), file: file, line: line)
    }

    // MARK: fixtures
    static var cachedV: JSON?
    func vec() throws -> JSON { if let v = Self.cachedV { return v }; let v = try Vectors.load("speak.json"); Self.cachedV = v; return v }
    func now(_ V: JSON) -> Int64 { Int64(V["now"]?.double ?? 0) }
    func content(_ V: JSON) -> RtypeContent { RtypeContent(json: V["data"]?["readtests"] ?? .null) }
    func scripts(_ V: JSON) -> [JSON] { V["data"]?.list("roleplay") ?? [] }
    func rules() throws -> RoleplayRules { RoleplayRules(pack: try XCTUnwrap(SpeakPack.bundled()).roleplay) }
    func key(_ j: JSON?) -> String { j?.string ?? j?.s("k") ?? "" }

    // MARK: rtype.hub
    func testRtypeHub() throws {
        let V = try vec(), units = content(V).units
        var r = R()
        for c in V["rtype"]?.list("hub") ?? [] {
            let id = c.s("id")
            if id == "counts-full-data" {
                // the totals over ALL ten tests need the P09 pack; here: the vector names exactly the eight kinds the hub shows, and the cut-down data has each of them
                r.eq(Set(c["out"]?.object?.keys.map { $0 } ?? []), Set(Rtype.order), "\(id) kinds")
                continue
            }
            let cards = Rtype.hub(units, rtype: c["input"]?["rtype"] ?? .null), want = c["out"]?.list("cards") ?? []
            // the "fresh" case lists every card; the "progress" case only the kinds that have a record
            if id == "fresh" { r.eq(cards.map(\.kind), want.map { $0.s("kind") }, "\(id) cards in order") }
            for w in want {
                guard let x = cards.first(where: { $0.kind == w.s("kind") }) else { r.check(false, "\(id): card \(w.s("kind"))"); continue }
                let pct = w["chip"]?["v"]?.i("pct")
                r.eq(x.pct, w["chip"]?["v"] == nil ? nil : pct, "\(id) \(x.kind) pct")
                r.eq(x.reached, w.t("reached"), "\(id) \(x.kind) reached")
                r.eq(x.bar, w.i("bar"), "\(id) \(x.kind) bar")
                r.eq(x.questions, w["size"]?["v"]?.i("q") ?? -1, "\(id) \(x.kind) questions")
                r.eq(x.groups, w["size"]?["v"]?.i("g") ?? -1, "\(id) \(x.kind) groups")
            }
        }
        finish(r, "rtype.hub")
    }

    // MARK: rtype.kinds
    func testRtypeKinds() throws {
        let V = try vec(), units = content(V).units
        var r = R()
        for c in V["rtype"]?.list("kinds") ?? [] {
            let id = c.s("id"), kind = c["input"]?.s("kind") ?? "", o = c["out"] ?? .null
            guard Rtype.order.contains(kind) else { r.check(o.t("hub"), "\(id): unknown kind ⇒ the hub"); continue }
            let list = units.filter { $0.kind == kind }
            r.check(!list.isEmpty, "\(id): a group of this kind")
            guard let u = list.first else { continue }
            r.eq(u.passage.s("title"), o.s("passageTitle"), "\(id) passage title")
            r.eq(u.passage.list("paras").map { $0.s("k") }, o.strs("paragraphs"), "\(id) paragraph letters")
            r.eq(list.count, o["position"]?["v"]?.i("n") ?? -1, "\(id) number of groups")
        }
        finish(r, "rtype.kinds")
    }

    // MARK: rtype.flows
    func answers(_ j: JSON?) -> QAnswers {
        var a = QAnswers()
        for (k, v) in j?.object ?? [:] {
            if k.hasPrefix("m"), let gi = Int(k.dropFirst()) { a.multi[gi] = v.array?.compactMap(\.string) ?? [] } else if let n = Int(k) { a.one[n] = v.string ?? v.jsToString }
        }
        return a
    }
    func testRtypeFlows() throws {
        let V = try vec(), C = content(V), units = C.units
        var r = R()
        for c in V["rtype"]?.list("flows") ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null, kind = i.s("kind")
            let list = units.filter { $0.kind == kind }
            guard let u = list.first else { r.check(false, "\(id): no group of \(kind)"); continue }
            let ex = C.explain(for: u)
            let game = JSON.obj([("rtype", i["previous"] ?? .object([:]))])
            let out = Rtype.check(u, answers: answers(i["answers"]), explain: ex, game: game, mistakes: [], now: now(V))
            let v = o["result"]?["v"] ?? .null
            r.eq(out.right, v.i("r"), "\(id) right"); r.eq(out.total, v.i("n"), "\(id) total"); r.eq(out.pct, v.i("p"), "\(id) cumulative %")
            r.eq(out.ok, o.s("feedbackClass") == "ok", "\(id) feedback tone")
            r.diff(out.game["rtype"], o["game"]?["rtype"], "\(id) game.rtype")
            r.diff(out.game["qstat"], o["qstat"], "\(id) game.qstat")
            r.eq(out.reward, ["quizzes": 1, "readings": 1, "xp": o.list("rewards").first?.i("xp") ?? -1], "\(id) reward")
            // the vector lists the mistakes book after logging: each new one goes on top, so the last wrong question comes first
            let wrong = out.results.filter { !$0.ok }.map { Rtype.mistake(u, $0, why: ex[String($0.n)]?.s("why") ?? "") }.reversed().map { $0 }
            r.eq(wrong.count, o.list("mistakes").count, "\(id) mistakes")
            for (k, m) in o.list("mistakes").enumerated() where k < wrong.count { r.diff(wrong[k], m, "\(id) mistake \(k)") }
            r.eq(out.mistakes.count, wrong.count, "\(id) logged mistakes")
            r.eq(out.mistakes.map { $0.s("answer") }, wrong.map { $0.s("answer") }, "\(id) book order")
            // the cut-down data has one group of the kind: "Nhóm tiếp" finishes the kind
            if o["afterNext"] != nil { r.eq(list.count, 1, "\(id) next ⇒ finished") }
            r.eq(Rtype.goalPct, 75, "goal"); // the hub target the vector's "Mục tiêu 75%" note names
        }
        finish(r, "rtype.flows")
    }

    // MARK: roleplay.hub
    func testRoleplayHub() throws {
        let V = try vec(), R_ = try rules()
        var r = R()
        for c in V["roleplay"]?.list("hub") ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            switch id {
            case "hub":
                r.eq(Roleplay.level(stored: i["level"]), 1, "\(id) default level")
                let s = Roleplay.sections(scripts(V))
                r.check(!s.everyday.isEmpty && !s.work.isEmpty, "\(id) both sections")
                r.eq(Roleplay.hubLevelLabels(scripts(V), R_), ["A1 / B1", "A2 / B2", "B1 / C1"], "\(id) level buttons")
                r.eq(R_.guestAiPerDay, o["footnote"]?["v"]?.i("n") ?? -1, "\(id) guest AI per day")
                for sc in scripts(V) { r.check(!Roleplay.nameKey(sc, R_).isEmpty, "\(id) name of \(sc.s("id"))") }
                for first in o.list("first") {
                    if let sc = scripts(V).first(where: { $0.s("id") == first.s("id") }) {
                        r.eq(Roleplay.nameKey(sc, R_), key(first["name"]), "\(id) name \(sc.s("id"))")
                        r.eq(sc.list("turns").count, first["turns"]?["v"]?.i("n") ?? -1, "\(id) turns")
                        r.eq(sc.s("title"), first.s("title"), "\(id) title"); r.eq(sc.s("em"), first.s("emoji"), "\(id) emoji")
                    }
                }
            case "hub-signed-in":
                r.eq([Roleplay.level(stored: i["level"])], o["pressed"]?.array?.compactMap { $0.double.map { Int($0) } } ?? [], "\(id) pressed")
                r.eq(Roleplay.aiLeft(signedIn: true, day: nil, today: "2026-01-05", perDay: R_.guestAiPerDay), Roleplay.signedInLeft, "\(id) unlimited")
            default: // hub-bad-level: "9" is not 0, 1 or 2
                let stored = JSON.number(Double(i.s("stored")) ?? -1)
                r.eq([Roleplay.level(stored: stored)], o["pressed"]?.array?.compactMap { $0.double.map { Int($0) } } ?? [], "\(id) pressed")
            }
        }
        for n in [0, 1, 2] { r.eq(Roleplay.level(stored: .number(Double(n))), n, "stored level \(n)") }
        r.eq(Roleplay.level(stored: .string("1")), 1, "a string is not a level")
        finish(r, "roleplay.hub")
    }

    // MARK: roleplay.brief
    func testRoleplayBrief() throws {
        let V = try vec(), R_ = try rules()
        var r = R()
        for c in V["roleplay"]?.list("brief") ?? [] {
            let id = c.s("id"), o = c["out"] ?? .null, sid = c["input"]?.s("script") ?? ""
            guard let s = scripts(V).first(where: { $0.s("id") == sid }) else { r.check(o.t("hub"), "\(id): unknown id ⇒ the hub"); continue }
            r.eq(Roleplay.nameKey(s, R_), key(o["name"]), "\(id) name")
            r.eq(s["ai"]?.s("name") ?? "", o["ai"]?.s("name") ?? "?", "\(id) ai name"); r.eq(s["ai"]?.s("role") ?? "", o["ai"]?.s("role") ?? "?", "\(id) ai role")
            r.eq(Roleplay.levels(s, R_), o.strs("levels"), "\(id) levels")
            r.eq(s.t("cando") ? s.s("cando") : nil, o["cando"]?["k"]?.string, "\(id) can-do")
            r.eq(s.list("vocab").count, o.i("vocab"), "\(id) vocab chips")
            let want = o.list("saved").first
            // the vector taps one chip: the one whose word it saved
            let tapped = s.list("vocab").firstIndex { $0.array?.first?.string == want?["entry"]?.s("word") } ?? -1
            r.check(tapped >= 0, "\(id) the tapped chip exists")
            let saved = Roleplay.vocabEntry(s, max(0, tapped))
            r.diff(saved.entry, want?["entry"], "\(id) saved entry"); r.diff(saved.context, want?["ctx"], "\(id) saved context")
        }
        finish(r, "roleplay.brief")
    }

    // MARK: roleplay.chat (every case, step by step)
    /// the web harness' server: asks are answered from the expected bubbles / scripted failures of the case
    final class FakeServer: RoleplayServer, @unchecked Sendable {
        var turnReplies: [Result<JSON, RoleplayServerError>] = []
        var scoreReply: JSON?
        private(set) var asks: [(task: String, rp: JSON, prompt: String)] = []
        func ask(task: String, rp: JSON, prompt: String) async throws -> JSON {
            asks.append((task, rp, prompt))
            if prompt.contains("Transcript:") { if let s = scoreReply { return s }; throw RoleplayServerError.failed }
            guard !turnReplies.isEmpty else { throw RoleplayServerError.failed }
            return try turnReplies.removeFirst().get()
        }
    }
    func labelOf(_ s: String?) -> (Int, Int)? {
        guard let s, let a = s.range(of: "⟦"), let b = s.range(of: "⟧"), let j = try? JSON.parse(String(s[a.upperBound..<b.lowerBound])) else { return nil }
        return (j.i("i"), j.i("n"))
    }
    func testRoleplayChat() async throws {
        let V = try vec(), R_ = try rules()
        var r = R()
        for c in V["roleplay"]?.list("chat") ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            guard let s = scripts(V).first(where: { $0.s("id") == i.s("script") }) else { r.check(false, "\(id): script"); continue }
            let L = i.i("level"), steps = o.list("steps"), actions = i.list("actions"), randoms = i.list("random").map { $0.double ?? 0.5 }
            var ri = 0
            let random: () -> Double = { defer { ri += 1 }; return randoms.isEmpty ? 0.5 : randoms[min(ri, randoms.count - 1)] }
            // the server's answers: the expected AI bubble of each `say` step; a failure / quota where the case says so
            let server = FakeServer()
            for st in steps where st.s("step") == "say" || st.s("step") == "mic" {
                let ai = st.list("newBubbles").last(where: { $0.s("who") == "ai" })?.s("text") ?? ""
                if id == "server-quota" { server.turnReplies.append(.failure(.quota)) }
                else if id == "server-fail-downgrade" { server.turnReplies.append(.failure(.failed)) }
                else { server.turnReplies.append(.success(.obj([("reply", .string(ai)), ("advance", .bool(true))]))) }
            }
            if id == "server-report-ai", let rw = o["report"]?.list("rewrites") {
                server.scoreReply = .obj([("natural", .number(91)), ("polite", .number(82)), ("clarity", .number(73)), ("grammar", .number(64)), ("summary", .string(o["report"]?.s("summary") ?? "")),
                                          ("rewrites", .array(rw.map { .obj([("you", .string($0.s("you"))), ("better", .string($0.s("better"))), ("why", .string(key($0["why"])))]) } + [.obj([("you", "zz"), ("why", "dropped: no better")])]))])
            } else if id == "server-report-invalid" { server.scoreReply = .obj([("natural", .string("high")), ("rewrites", .array([]))]) }
            let today = "2026-01-05"
            // the web harness turns the AI side on for the `server-*` cases only (the input's `guestAiLeft` is the same 0 in all of them)
            let chat = RoleplayChat(script: s, level: L, rules: R_, server: id.hasPrefix("server") ? server : nil, signedIn: i.t("signedIn"), online: id != "offline-script", day: nil, today: today, random: random)
            let first = chat.start()
            let open = steps.first
            r.eq(first.text, open?.list("bubbles").first?.s("text") ?? "?", "\(id) first line")
            r.eq(["nano": 0, "server": 1, "script": 2][chat.mode.rawValue] ?? -1, open?["mode"]?.s("k").hasPrefix("☁️") == true ? 1 : 2, "\(id) mode")
            var report: Roleplay.Report?
            var k = 0
            for a in actions {
                k += 1
                var target: JSON?
                if a["mic"] != nil, k < steps.count { target = steps[k]; k += 1 }   // a mic action = "mic-target" step + "mic" step
                guard k < steps.count else { if a.t("done") { r.check(report != nil, "\(id) done after the report") }; continue }
                let st = steps[k]
                if a.t("hint") {
                    let h = chat.hint()
                    r.check(st.s("hintBox").contains(h.line), "\(id) hint line"); r.check(h.tip == nil || st.s("hintBox").contains(h.tip!), "\(id) hint tip")
                } else if a.t("help") {
                    let line = chat.help()
                    r.eq(line, st.s("inputValue"), "\(id) help line")
                } else if a.t("end") {
                    report = await chat.finish(signedIn: i.t("signedIn"), language: "English")
                } else if let say = a["say"]?.string ?? (a["mic"]?["heard"]?.string) {
                    if let t = target { // the recogniser target of the turn is its hint line
                        r.eq(Roleplay.hintLine(s, chat.i, L), t.s("target"), "\(id) mic target"); r.eq(SpeakAccent.locale(.object([:])), t.s("accent"), "\(id) mic accent")
                    }
                    let step = await chat.send(say)
                    r.eq(step?.bubbles.map { "\($0.who):\($0.text)" } ?? [], st.list("newBubbles").map { "\($0.s("who")):\($0.s("text"))" }, "\(id) bubbles of step \(k)")
                    if let want = st.list("toasts").first?.string, let t = step?.toasts.first {
                        r.eq(t == .quota ? "Đã hết lượt AI hôm nay – tiếp tục bằng kịch bản soạn sẵn." : "AI đang bận – tiếp tục bằng kịch bản soạn sẵn.", want, "\(id) toast")
                    }
                    if step?.allTurnsDone == true { report = await chat.finish(signedIn: i.t("signedIn"), language: "English") }
                } else if a["mic"]?["error"] != nil {
                    r.check(st.list("toasts").first?.string?.hasPrefix("ERR:") == true, "\(id) mic error toast") // the text itself is the screen's (SpeakErrors)
                }
                if let l = labelOf(st["turnLabel"]?.string) { r.eq(chat.turnLabel.i, l.0, "\(id) turn i"); r.eq(chat.turnLabel.n, l.1, "\(id) turn n") }
            }
            // reward, store, fetches, report
            let wantReward = o.list("rewards").first
            r.eq(report?.reward ?? [:], wantReward.map { ["spoken": $0.i("spoken"), "xp": $0.i("xp")] } ?? [:], "\(id) reward")
            r.eq(chat.day.map { Roleplay.dayJSON($0) }.map { $0.stableString } ?? "", o.list("store").first?["vb.rp.day"]?.string ?? "", "\(id) vb.rp.day")
            r.eq(server.asks.count, o.list("fetches").count, "\(id) fetches")
            r.check(server.asks.allSatisfy { !$0.task.isEmpty && $0.rp.isObject }, "\(id) task + rp on every request")
            if let w = o["report"], let rep = report { checkReport(&r, id, s, rep, w, R_) }
            else { r.check(o["report"] == nil, "\(id) no report expected") }
        }
        finish(r, "roleplay.chat")
    }
    func checkReport(_ r: inout R, _ id: String, _ s: JSON, _ rep: Roleplay.Report, _ w: JSON, _ R_: RoleplayRules) {
        if let why = w["emptyBecause"] {
            r.eq(why.string ?? "", "no-answer", "\(id) empty"); r.check(rep.empty, "\(id) nothing answered"); r.eq(s.s("id"), w.s("retry"), "\(id) retry")
            return
        }
        r.eq(rep.ring, w.i("ring"), "\(id) ring")
        r.eq(rep.meters.map { $0.0.viKey }, w.list("meters").map { key($0["label"]) }, "\(id) meter labels")
        r.eq(rep.meters.map { $0.1 }, w.list("meters").map { $0.i("value") }, "\(id) meter values")
        r.eq(rep.summary, w.s("summary"), "\(id) summary")
        r.eq((rep.aiScored ? "Chấm bởi AI" : "Ước lượng nhanh trên máy (không có AI).") + " · +\(max(5, rep.xp)) XP", key(w["source"]), "\(id) source line")
        r.eq(rep.rewrites.isEmpty, w.t("noRewrites"), "\(id) noRewrites")
        r.eq(rep.rewrites.map { "\($0.you)|\($0.better)|\(key($0.why))" }, w.list("rewrites").map { "\($0.s("you"))|\($0.s("better"))|\(key($0["why"]))" }, "\(id) rewrites")
        // RP.chat with `done` (#/confidence) ends with [Tiếp tục →] and has neither "Luyện lại" nor the confidence card
        if !w.s("again").isEmpty { r.eq("#/roleplay/" + s.s("id"), w.s("again"), "\(id) again"); r.eq(Roleplay.confidencePath(s.s("id"), R_), w.s("confidence"), "\(id) confidence path") }
        else { r.eq(w.s("confidence"), "", "\(id) no confidence card with done") }
    }

    // MARK: roleplay.ai
    func testRoleplayAi() throws {
        let V = try vec(), R_ = try rules()
        var r = R()
        for c in V["roleplay"]?.list("ai") ?? [] {
            let id = c.s("id"), o = c["out"] ?? .null
            if id == "guest-budget" {
                var day: Roleplay.Day?, modes: [String] = [], counters: [JSON] = []
                for _ in 0..<4 {
                    let b = Roleplay.chooseBrain(signedIn: false, online: true, day: day, today: c["input"]?.s("today") ?? "", rules: R_)
                    modes.append(b.0.rawValue)
                    if b.0 == .server { counters.append(Roleplay.dayJSON(b.1!)) }
                    day = b.1
                }
                r.eq(modes, o.list("modes").map { $0.s("k").hasPrefix("☁️") ? "server" : "script" }, "\(id) modes")
                r.diff(.array(counters), o["counter"], "\(id) counter")
                // the counter resets with the date
                let next = Roleplay.chooseBrain(signedIn: false, online: true, day: day, today: "2026-01-06", rules: R_)
                r.check(next.0 == .server && next.1?.n == 1, "\(id) new day")
            } else {
                guard let s = scripts(V).first(where: { $0.s("id") == c["input"]?.s("script") }) else { r.check(false, "\(id) script"); continue }
                let L = c["input"]?.i("level") ?? 1
                r.eq("rp", o.s("task"), "\(id) task"); r.check(Roleplay.rpArgs(s, level: L, rules: R_) == o["rp"], "\(id) rp args")
                let hist = [Roleplay.Bubble(who: "ai", text: Roleplay.turnLine(s, 0, L), turn: 0), Roleplay.Bubble(who: "me", text: "Could I get a latte, please?", turn: 0)]
                r.eq(Roleplay.turnPrompt(s, level: L, i: 0, hist: hist), o.s("turnPrompt"), "\(id) turn prompt")
            }
        }
        finish(r, "roleplay.ai")
    }

    // MARK: parity
    /// P07 rtype + roleplay: brain order, the guest limit, "server error ⇒ script for the rest of the chat", and what #/rtype writes.
    func testParityP07RtypeRoleplay() async throws {
        let V = try vec(), R_ = try rules(), C = content(V)
        // brain order: signed-in ⇒ server; guest with AI left ⇒ server; guest without ⇒ script; offline ⇒ script (and no AI turn counted)
        let today = "2026-01-05"
        XCTAssertEqual(Roleplay.chooseBrain(signedIn: true, online: true, day: Roleplay.Day(d: today, n: 99), today: today, rules: R_).0, .server)
        XCTAssertEqual(Roleplay.chooseBrain(signedIn: false, online: true, day: Roleplay.Day(d: today, n: R_.guestAiPerDay), today: today, rules: R_).0, .script)
        let off = Roleplay.chooseBrain(signedIn: false, online: false, day: nil, today: today, rules: R_)
        XCTAssertEqual(off.0, .script); XCTAssertNil(off.1)
        // a server error ⇒ the script answers this and every later turn, with no new request
        let cafe = try XCTUnwrap(scripts(V).first { $0.s("id") == "cafe" })
        let server = FakeServer(); server.turnReplies = [.failure(.failed)]
        let chat = RoleplayChat(script: cafe, level: 1, rules: R_, server: server, signedIn: false, online: true, day: nil, today: today, random: { 0.9 })
        chat.start()
        XCTAssertEqual(chat.mode, .server)
        let a = await chat.send("Could I get a latte, please?")
        XCTAssertEqual(a?.toasts, [.busy]); XCTAssertEqual(chat.mode, .script)
        _ = await chat.send("Medium, please."); _ = await chat.send("Here, please.")
        XCTAssertEqual(server.asks.count, 1)
        // rtype writes game.rtype, game.qstat and the mistakes book; 75 % is the goal
        let u = try XCTUnwrap(C.units.first { $0.kind == "tfng" })
        let out = Rtype.check(u, answers: QAnswers(), explain: C.explain(for: u), game: .object([:]), mistakes: [], now: now(V))
        XCTAssertEqual(out.game["rtype"]?["tfng"]?.i("t"), out.total)
        XCTAssertNotNil(out.game["qstat"]?["ir:tfng"])
        XCTAssertEqual(out.mistakes.count, out.total)
        XCTAssertFalse(out.ok)
        XCTAssertEqual(Rtype.goalPct, 75)
        let hub = Rtype.hub(C.units, rtype: .obj([("tfng", .obj([("r", .int(3)), ("t", .int(4))]))]))
        XCTAssertTrue(hub.first { $0.kind == "tfng" }?.reached == true)
    }
}
