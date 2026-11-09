import Foundation
import XCTest
@testable import LKSync
@testable import LKStore
@testable import LKCore
import LKStrings

/// M4 P08 – #/call logic (LKStore/Call: CallCore engine + CallSession) against vectors/call.json, produced by running the REAL web code
/// (scripts/native/gen-call.mjs; docs/specs/native-m4-vectors.md "Kiểm kê P08"). One test per vector key, every case checked, nothing skipped.
/// The platform sides are inputs: the voice ends a line at once, the recogniser is driven by each case's `mic` / `heard` actions, the clock is a number
/// (every action is 4 s after the one before, like the generator), timers are run after each action. Text inside `out` is the Vietnamese key the web passed
/// to t(): it is compared with the Vietnamese text of the id the port uses (L10n vi), so a wrong id fails here.
@MainActor
final class CallVectorTests: XCTestCase {
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
    func vec() throws -> JSON { if let v = Self.cachedV { return v }; let v = try Vectors.load("call.json"); Self.cachedV = v; return v }
    let vi = L10n(lang: "vi")
    static let root = Vectors.dir.appendingPathComponent("../../../..").standardized
    func vectorText() throws -> String { try String(contentsOf: Vectors.dir.appendingPathComponent("call.json"), encoding: .utf8) }
    /// the full 35-call pack of the web (https://lexkite.com/data/call-pack.json)
    func fullPack() throws -> CallPack {
        let text = try String(contentsOf: Self.root.appendingPathComponent("web/data/call-pack.json"), encoding: .utf8)
        return try XCTUnwrap(CallPack.decode(text), "web/data/call-pack.json is a call pack")
    }
    /// engine tables of the pack, the pair contrasts and the written order of the extra pairs of the vector file
    func rules() throws -> CallRules {
        let starter = try XCTUnwrap(CallPack.bundled(), "the bundled starter pack")
        return CallRules(consts: starter.consts, contrasts: try vec()["data"]?["pron"]?.list("contrasts") ?? [],
                         extraOrder: CallJSONOrder.keys(in: try vectorText(), after: "\"extraPairs\""))
    }
    func engine() throws -> CallEngine { CallEngine(rules: try rules()) }
    func dataCalls() throws -> [String: CallScript] {
        var m: [String: CallScript] = [:]
        for j in try vec()["data"]?.list("calls") ?? [] { if let s = CallScript(json: j) { m[s.id] = s } }
        return m
    }
    /// the call a case names: its `inlineCall`, else the real call of `data.calls`
    func script(_ i: JSON, _ calls: [String: CallScript]) -> CallScript? {
        if let inline = i["inlineCall"], inline.isObject { return CallScript(json: inline) }
        return i["call"]?.string.flatMap { calls[$0] }
    }
    /// a vector `{k, v}` (or a plain string) as the Vietnamese text the web showed
    func render(_ j: JSON?) -> String {
        guard let j else { return "" }
        if let s = j.string { return s }
        guard let k = j["k"]?.string else { return "" }
        var vars: [String: String] = [:]
        for (n, v) in j["v"]?.object ?? [:] { vars[n] = v.string ?? v.jsToString }
        return SpeakText.fill(k, vars)
    }

    // MARK: engine.prep
    func testEnginePrep() throws {
        let V = try vec(), text = try vectorText()
        var r = R()
        for c in V["engine"]?.list("prep") ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            var order: [String]?
            if id == "prep-nodes-no-start" {   // a Swift dictionary has no order: the first key is read from the file as written
                order = text.range(of: "\"id\":\"\(id)\"").map { CallJSONOrder.keys(in: String(text[$0.lowerBound...]), after: "\"nodes\"") }
            }
            guard let s = CallScript(json: i, order: order) else { r.check(o == .null, "\(id): null call ⇒ null"); continue }
            r.eq(s.start, o["start"]?.string, "\(id) start")
            r.eq(Set(s.nodes.keys), Set(o.strs("nodeIds")), "\(id) node ids")
            for (nid, nx) in o["nexts"]?.object ?? [:] { r.eq(s.nodes[nid]?.next, nx.string, "\(id) next of \(nid)") }
        }
        finish(r, "engine.prep")
    }

    // MARK: engine.depth
    func testEngineDepth() throws {
        let V = try vec(), E = try engine()
        var r = R()
        for c in V["engine"]?.list("depth") ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null
            if id == "depth-all-calls" {
                let calls = try fullPack().scripts
                r.eq(calls.count, i.i("calls"), "\(id) number of calls")
                for (cid, d) in c["out"]?.object ?? [:] {
                    guard let s = calls.first(where: { $0.id == cid }) else { r.check(false, "\(id): call \(cid)"); continue }
                    r.eq(E.depth(s), Int(JSON.orZero(d)), "\(id) \(cid)")
                }
                continue
            }
            guard let s = CallScript(json: i) else { r.check(false, "\(id) script"); continue }
            r.eq(E.depth(s), c.i("out"), "\(id) depth")
        }
        finish(r, "engine.depth")
    }

    // MARK: engine.step
    func testEngineStep() throws {
        let V = try vec(), E = try engine(), calls = try dataCalls()
        var r = R()
        for c in V["engine"]?.list("step") ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            guard let s = script(i, calls) else { r.check(false, "\(id) call"); continue }
            let st = E.step(s, i.s("node"), i.s("text"))
            r.eq(st.react, o.s("react"), "\(id) react")
            r.eq(st.next, o["next"]?.string, "\(id) next")
            r.eq(st.br, Int(JSON.orZero(o["br"])), "\(id) branch")
        }
        finish(r, "engine.step")
    }

    // MARK: engine.correct
    func fixOK(_ r: inout R, _ id: String, _ f: CallFix?, _ o: JSON?) {
        guard let o, o != .null else { r.check(f == nil, "\(id): no fix"); return }
        guard let f else { r.check(false, "\(id): a fix"); return }
        r.eq(f.bad, o.s("bad"), "\(id) bad"); r.eq(f.good, o.s("good"), "\(id) good")
        r.eq(vi(f.why), render(o["why"]), "\(id) why"); r.eq(f.whys.map { vi($0) }, o.list("whys").map { render($0) }, "\(id) whys")
    }
    func testEngineCorrect() throws {
        let V = try vec(), E = try engine()
        var r = R()
        for c in V["engine"]?.list("correct") ?? [] {
            let i = c["input"] ?? .null
            fixOK(&r, c.s("id"), E.correct(i.s("text"), prompt: i["prompt"]?.string), c["out"])
        }
        finish(r, "engine.correct")
    }

    // MARK: engine.slips
    func slipsOK(_ r: inout R, _ id: String, _ got: [CallSlip], _ want: [JSON]) {
        r.eq(got.map { "\($0.said)|\($0.meant)|\($0.id)|\($0.skill)" }, want.map { "\($0.s("said"))|\($0.s("meant"))|\($0.s("id"))|\($0.s("skill"))" }, "\(id) slips")
    }
    func testEngineSlips() throws {
        let V = try vec(), E = try engine()
        var r = R()
        for c in V["engine"]?.list("slips") ?? [] {
            let i = c["input"] ?? .null
            let call = i["call"].flatMap { $0.isObject ? CallScript(json: $0) : nil }
            let node = i["node"].flatMap { $0.isObject ? CallNode(id: "n", json: $0) : nil }
            slipsOK(&r, c.s("id"), E.slips(i.s("text"), call, node), c["out"]?.array ?? [])
        }
        finish(r, "engine.slips")
    }

    // MARK: engine.fluency
    func flOK(_ r: inout R, _ id: String, _ f: CallFluency, _ o: JSON) {
        r.eq(f.words, o.i("words"), "\(id) words"); r.eq(f.fillers, o.i("fillers"), "\(id) fillers"); r.eq(f.short, o.t("short"), "\(id) short")
        r.eq(f.link, o.t("link"), "\(id) link"); r.eq(f.wpm, o.i("wpm"), "\(id) wpm")
    }
    func testEngineFluency() throws {
        let V = try vec(), E = try engine()
        var r = R()
        for c in V["engine"]?.list("fluency") ?? [] {
            let i = c["input"] ?? .null
            flOK(&r, c.s("id"), E.fluency(i.s("text"), min: i["node"]?.i("min") ?? 0, secs: i["secs"]?.double ?? 0, tl: i["tl"]?.string ?? ""), c["out"] ?? .null)
        }
        finish(r, "engine.fluency")
    }

    // MARK: engine.recap
    func noteID(_ n: CallNote) -> JSON {
        switch n {
        case .short(let k): return .obj([("id", .string("short")), ("n", .int(k))])
        case .fillers(let k): return .obj([("id", .string("fillers")), ("n", .int(k))])
        case .slow(let w): return .obj([("id", .string("slow")), ("wpm", .int(w))])
        default: return .obj([("id", .string(n.id))])
        }
    }
    func recapOK(_ r: inout R, _ id: String, _ g: CallRecap, _ o: JSON) {
        r.eq(g.turns.count, o.list("turns").count, "\(id) turns")
        for (k, w) in o.list("turns").enumerated() where k < g.turns.count {
            let x = g.turns[k]
            r.eq(x.id, w.s("id"), "\(id) turn \(k) id"); r.eq(x.m, w["m"]?.string, "\(id) turn \(k) question"); r.eq(x.text, w.s("text"), "\(id) turn \(k) text")
            r.eq(x.picked, w.t("picked"), "\(id) turn \(k) picked"); r.eq(x.weak, w.t("weak"), "\(id) turn \(k) weak"); r.eq(x.model, w.s("model"), "\(id) turn \(k) model")
            fixOK(&r, "\(id) turn \(k)", x.fix, w["fix"]); slipsOK(&r, "\(id) turn \(k)", x.slips, w.list("slips")); flOK(&r, "\(id) turn \(k)", x.fl, w["fl"] ?? .null)
        }
        r.eq(g.spoken, o.i("spoken"), "\(id) spoken"); r.eq(g.picked, o.i("picked"), "\(id) picked"); r.eq(g.words, o.i("words"), "\(id) words")
        r.eq(g.uniq, o.i("uniq"), "\(id) uniq"); r.eq(g.fillers, o.i("fillers"), "\(id) fillers"); r.eq(g.wpm, o.i("wpm"), "\(id) wpm")
        r.eq(g.used, o.strs("used"), "\(id) used"); r.eq(g.target, o.strs("target"), "\(id) target"); r.eq(g.weak, o.strs("weak"), "\(id) weak ids")
        r.eq(g.score, o.i("score"), "\(id) score"); r.eq(g.band.rawValue, o.s("band"), "\(id) band")
        r.diff(.array(g.notes.map(noteID)), o["notes"], "\(id) notes")
    }
    func testEngineRecap() throws {
        let V = try vec(), E = try engine(), calls = try dataCalls()
        var r = R()
        for c in V["engine"]?.list("recap") ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null
            guard let s = script(i, calls) else { r.check(false, "\(id) call"); continue }
            let log = i.list("log").map { CallLogEntry(id: $0.s("id"), text: $0.s("text"), picked: $0.t("picked"), secs: $0.d("secs") ?? 0) }
            recapOK(&r, id, E.recap(s, log), c["out"] ?? .null)
        }
        finish(r, "engine.recap")
    }

    // MARK: engine.retry
    func testEngineRetry() throws {
        let V = try vec(), E = try engine(), calls = try dataCalls()
        var r = R()
        for c in V["engine"]?.list("retry") ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            guard let base = i["call"]?.string.flatMap({ calls[$0] }) else { r.check(false, "\(id) call"); continue }
            let n = E.retry(base, i.strs("ids"))
            r.check(n.retry, "\(id) retry flag"); r.eq(n.id, o.s("id"), "\(id) id"); r.eq(n.start, o["start"]?.string, "\(id) start")
            r.diff(.object(n.nodesJSON), o["nodes"], "\(id) nodes")
            r.diff(n.json["phrases"], o["phrases"], "\(id) phrases"); r.diff(n.json["words"], o["words"], "\(id) words"); r.eq(n.end, o.s("end"), "\(id) end")
        }
        finish(r, "engine.retry")
    }

    // MARK: engine.asrMode (web) and asrModeNative
    func testEngineAsr() throws {
        let V = try vec()
        var r = R()
        for c in V["engine"]?.list("asrMode") ?? [] {
            let i = c["input"] ?? .null
            r.eq(CallAsr.mode(local: i.t("local"), sr: i.t("sr"), media: i.t("media"), ext: i.t("ext"), whisper: i.t("whisper"), pref: i["pref"]?.string).rawValue, c.s("out"), c.s("id"))
        }
        for c in V["engine"]?.list("asrModeNative") ?? [] {
            let i = c["input"] ?? .null
            r.eq(CallAsr.modeNative(onDevice: i.t("onDevice"), system: i.t("system"), pref: i["pref"]?.string).rawValue, c.s("out"), c.s("id"))
        }
        r.check((V["engine"]?.list("asrMode").count ?? 0) == 129, "all 129 combinations of the web chooser")
        finish(r, "engine.asrMode")
    }

    // MARK: list
    func envMode(_ env: JSON, _ ls: [String: String]) -> CallAsr.Mode {
        CallAsr.mode(local: env.t("local"), sr: env.t("sr"), media: env.t("media"), ext: env.t("ext"), whisper: ls["vb.whisper"] == "1", pref: ls["vb.call.asr"])
    }
    func isNull(_ j: JSON?) -> Bool { guard let j else { return true }; return j == JSON.null }
    func strings(_ j: JSON?) -> [String: String] { (j?.object ?? [:]).compactMapValues(\.string) }
    func groupLabel(_ g: String) -> String { g == "all" ? vi(.vocabAll) : (g == "ielts" ? "IELTS" : (g == "toeic" ? "TOEIC" : vi(.callUiDoiSong))) }
    func testList() throws {
        let V = try vec(), pack = try fullPack(), all = pack.scripts, names = pack.rules.names
        var r = R()
        for c in V["list"]?.array ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null
            var ls = strings(i["ls"])
            var flt = CallList.filter(stored: ls[CallList.fltKey])
            func shown(_ st: String, _ o: JSON) {
                r.eq(render(o["title"]), vi(.callUiGoiChoAmaCarlos), "\(id) \(st) title"); r.eq(render(o["intro"]), vi(.callUiCuocGoiVideoLuyen), "\(id) \(st) intro")
                r.eq(render(o["filter"]?["label"]), vi(.callUiLocTheoKyThi), "\(id) \(st) filter label")
                let b = o["filter"]?.list("buttons") ?? []
                r.eq(b.map { $0.s("group") }, CallList.groups, "\(id) \(st) groups")
                r.eq(b.map { $0.t("pressed") }, CallList.groups.map { $0 == flt }, "\(id) \(st) pressed")
                r.eq(b.map { render($0["label"]) }, CallList.groups.map(groupLabel), "\(id) \(st) labels")
                let list = CallList.filtered(all, flt)
                r.eq(o.list("cardIds").isEmpty ? o.list("cards").map { $0.s("id") } : o.strs("cardIds"), list.map(\.id), "\(id) \(st) cards")
                for w in o.list("cards") {
                    guard let s = list.first(where: { $0.id == w.s("id") }) else { continue }
                    r.eq(render(w["name"]), names[s.id] ?? s.title, "\(id) \(st) name of \(s.id)")
                    r.eq(w.s("em"), s.em, "\(id) em"); r.eq(w.s("lv"), s.lv, "\(id) lv"); r.eq(w.s("who"), s.teacherName, "\(id) who"); r.eq(w.s("title"), s.title, "\(id) title")
                }
                let p = CallAsr.privacy(envMode(i["env"] ?? .null, ls))
                r.eq(o["privacy"]?.s("icon") ?? "", p.icon, "\(id) \(st) privacy icon"); r.eq(render(o["privacy"]), vi(p.key), "\(id) \(st) privacy")
                r.eq(!isNull(o["changeAsr"]), ls[CallList.asrKey] != nil, "\(id) \(st) change button")
                if !isNull(o["changeAsr"]) { r.eq(render(o["changeAsr"]), vi(.callUiDoiCachNhanDang), "\(id) \(st) change label") }
            }
            for s in c["out"]?.list("steps") ?? [] {
                let st = s.s("step"), o = s["out"] ?? .null
                if st == "filter" { flt = s["input"]?.s("filter") ?? flt }
                if st == "change-asr" { ls[CallList.asrKey] = nil }
                shown(st, o)
                for w in s.list("writes") { r.eq(w.s("key"), CallList.fltKey, "\(id) write key"); r.eq(w.s("value"), flt, "\(id) write value") }
                for tt in s.list("toasts") { r.eq(render(tt), vi(.callUiLanGoiSauLexkite), "\(id) toast") }
                if st == "change-asr" { r.check(isNull(s["asrPrefAfter"]), "\(id) pref removed") }
            }
        }
        finish(r, "list")
    }

    // MARK: ring
    func testRing() throws {
        let V = try vec(), pack = try fullPack(), all = pack.scripts, names = pack.rules.names
        var r = R()
        for c in V["ring"]?.array ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            guard let s = all.first(where: { $0.id == i.s("call") }) else {
                r.check(o.t("list"), "\(id): an unknown id shows the list"); r.eq(render(o["title"]), vi(.callUiGoiChoAmaCarlos), "\(id) list title"); continue
            }
            r.eq(render(o["title"]), names[s.id] ?? s.title, "\(id) title"); r.eq(o.strs("lv"), [s.lv, s.title], "\(id) level + title")
            r.eq(o.s("teacher"), s.teacherName, "\(id) teacher"); r.eq(o.s("role"), s.role, "\(id) role")
            let p = CallAsr.privacy(envMode(i["env"] ?? .null, [:]))
            r.eq(o["privacy"]?.s("icon") ?? "", p.icon, "\(id) icon"); r.eq(render(o["privacy"]), vi(p.key), "\(id) privacy")
            let b = o.list("buttons")
            r.eq(render(b.first?["label"]), vi(.callUiGoiNgay), "\(id) call button"); r.eq(render(b.last?["label"]), vi(.callUiCuocGoiKhac), "\(id) other button")
        }
        finish(r, "ring")
    }

    // MARK: rewards + progress
    func testRewardsProgress() throws {
        let V = try vec(), R_ = try rules()
        var r = R()
        for c in V["rewards"]?.array ?? [] {
            let i = c["input"] ?? .null, o = c["out"] ?? .null
            r.eq(R_.xp(turns: i.i("turns"), voiced: i.i("voiced"), usedWords: i.i("usedWords")), o.i("xp"), "\(c.s("id")) xp")
            r.eq(i.i("voiced"), o.i("spoken"), "\(c.s("id")) spoken")
        }
        for c in V["progress"]?.array ?? [] {
            let i = c["input"] ?? .null
            r.eq("\(CallProgress.percent(logged: i.i("logged"), depth: i.i("depth"), ended: i.t("ended"), max: R_.pctMax))%", c.s("out"), c.s("id"))
        }
        let p = V["persist"] ?? .null
        r.eq(p.strs("localStorage").sorted(), [CallList.asrKey, CallList.fltKey, CallList.trKey], "keys written to the device")
        r.eq(p.strs("removed"), [CallList.asrKey], "key removed")
        finish(r, "rewards+progress")
    }

    // MARK: flow – the whole call, action by action
    /// The device of a call in the vector: the voice ends every line at once, the recogniser only records the request, timers wait for `flush`.
    @MainActor final class Rig: CallPlatform {
        var clock: Int64 = 1_767_603_600_000
        var prefs: [String: String] = [:]
        var spoken: [String] = [], phases: [CallPhase] = [], reacts: [(String, Int)] = [], toasts: [CallToast] = [], writes: [(String, String?)] = []
        var stepRequests: [CallListenRequest] = [], requests: [CallListenRequest] = []
        var timers: [@MainActor () -> Void] = []
        var ended: CallEnd?
        func callNow() -> Int64 { clock }
        func callSpeak(_ text: String, who: String, accent: String, onEnd: @escaping () -> Void) { spoken.append(text); onEnd() }
        func callStopSpeaking() {}
        func callReact(_ pose: String, ms: Int) { reacts.append((pose, ms)) }
        func callTeacherListening(_ on: Bool) {}
        func callStartListening(_ r: CallListenRequest) -> Bool { stepRequests.append(r); requests.append(r); return true }
        func callStopListening() {}
        func callAfter(_ ms: Int, _ block: @escaping @MainActor () -> Void) { timers.append(block) }
        func callPhase(_ p: CallPhase) { if phases.last != p { phases.append(p) } }
        func callToast(_ t: CallToast) { toasts.append(t) }
        func callPref(_ k: String) -> String? { prefs[k] }
        func callSetPref(_ k: String, _ v: String?) { prefs[k] = v; writes.append((k, v)) }
        func callEnded(_ e: CallEnd) { ended = e }
        func flush() { while !timers.isEmpty { timers.removeFirst()() } }
        func resetStep() { spoken = []; phases = []; reacts = []; toasts = []; writes = []; stepRequests = []; ended = nil }
    }

    func summaryOK(_ r: inout R, _ id: String, _ S: CallSummary, _ w: JSON, _ names: [String: String]) {
        let q = S.recap, s = S.script
        r.eq(render(w["title"]), vi(.callUiTongKetCuocGoi), "\(id) summary title")
        r.eq(w["header"]?.s("name") ?? "", names[s.id] ?? s.title, "\(id) header name")
        r.eq(!isNull(w["header"]?["retry"]), s.retry, "\(id) header retry")
        r.eq(w["header"]?["duration"]?["v"]?.i("m") ?? -1, S.secs / 60, "\(id) minutes"); r.eq(w["header"]?["duration"]?["v"]?.i("s") ?? -1, S.secs % 60, "\(id) seconds")
        r.eq(w["header"]?.s("xp") ?? "", "+\(S.xp) XP", "\(id) xp")
        r.eq(q.score, w.i("score"), "\(id) score"); r.eq(vi(q.band.key), render(w["band"]), "\(id) band")
        r.eq(w["answered"]?["v"]?.i("n") ?? -1, q.turns.count, "\(id) answered turns"); r.eq(w["answered"]?["v"]?.i("s") ?? -1, S.voiced, "\(id) answered by voice")
        r.eq(q.words > 0 ? q.words : -1, w["words"]?["v"]?.i("n") ?? -1, "\(id) words")
        if let tw = w["topicWords"], !isNull(tw) {
            r.eq(q.used.count, tw["title"]?["v"]?.i("n") ?? -1, "\(id) used topic words"); r.eq(q.target.count, tw["title"]?["v"]?.i("k") ?? -1, "\(id) topic words")
            r.eq(tw.list("chips").map { $0.s("word") }, q.used, "\(id) chips")
        } else { r.check(q.target.isEmpty, "\(id) no topic words") }
        r.eq(q.notes.map { $0.text(vi) }, w.list("notes").map { render($0) }, "\(id) notes")
        r.eq(q.turns.count, w.list("turns").count, "\(id) turn rows")
        for (k, t) in w.list("turns").enumerated() where k < q.turns.count {
            let x = q.turns[k]
            r.eq(x.weak, t.t("weak"), "\(id) row \(k) weak"); r.eq(s.teacherName, t.s("teacher"), "\(id) row \(k) teacher"); r.eq(x.m ?? "", t.s("question"), "\(id) row \(k) question")
            r.eq(x.text, t.s("answer"), "\(id) row \(k) answer"); r.eq(x.picked, t.t("picked"), "\(id) row \(k) picked"); r.eq(x.fl.short, t.t("shortHint"), "\(id) row \(k) short hint")
            r.eq(x.weak || x.picked, t.t("modelShown"), "\(id) row \(k) model shown"); if t.t("modelShown") { r.eq(x.model, t.s("model"), "\(id) row \(k) model") }
            fixOK(&r, "\(id) row \(k)", x.fix, t["fix"])
            r.eq(x.slips.map { "\($0.meant)|\($0.said)|\($0.skill)" }, t.list("slips").map { "\($0.s("meant"))|\($0.s("said"))|\($0.s("skillHref"))" }, "\(id) row \(k) slips")
        }
        r.eq(s.phrases.map { [$0.phrase, $0.meaning] }, w.list("phrases").map { ($0.array ?? []).compactMap(\.string) }, "\(id) phrases")
        let weakN = w["buttons"]?["retry"]?["v"]?.i("n") ?? 0
        r.eq(q.weak.count, weakN, "\(id) retry button")
        r.eq(render(w["privacy"]), vi(.callUiLoiBanNoiChi), "\(id) privacy note")
    }

    func testFlow() throws {
        let V = try vec(), E = try engine(), calls = try dataCalls(), names = (try rules()).names
        var r = R()
        let l10n = L10n(lang: "vi")
        for c in V["flow"]?.array ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null, env = i["env"] ?? .null
            guard let base = calls[i.s("call")] else { r.check(false, "\(id) call"); continue }
            let rig = Rig()
            rig.prefs = strings(i["ls"])
            let lang = i.s("lang")
            func make(_ s: CallScript) -> CallSession {
                CallSession(script: s, engine: E, l10n: l10n, accent: "en-US", canTranslate: lang != "en", platform: rig,
                            mode: { self.envMode(env, rig.prefs) },
                            askChoices: {
                                var a: [CallAskChoice] = []
                                if env.t("media") && !env.t("ext") { a.append(.device) }
                                if env.t("sr") { a.append(.cloud) }
                                a.append(.tap)
                                return a
                            })
            }
            var session = make(base), summary: CallSummary?
            // mount: the call's own header
            let m = o["mount"]?["data"] ?? .null
            r.eq(render(m["title"]), names[base.id] ?? base.title, "\(id) mount title"); r.eq(m.s("lv"), base.lv, "\(id) mount level"); r.eq(m.s("who"), base.teacherName, "\(id) mount teacher")
            r.eq(m.t("canTr"), lang != "en", "\(id) mount canTr"); r.eq(String(session.showTranslation), m.s("showTr"), "\(id) mount showTr")
            r.eq(base.who, o["teacher"]?.s("who") ?? "", "\(id) teacher"); r.eq(session.accent, o["teacher"]?.s("accent") ?? "", "\(id) accent")
            let actions = i.list("actions"), steps = o.list("steps")
            r.eq(actions.count, steps.count, "\(id) one step per action")
            var written: Set<String> = []
            for (k, a) in actions.enumerated() where k < steps.count {
                let st = steps[k], tag = "\(id) #\(k) \(st.s("step"))"
                rig.resetStep()
                if a["start"] == nil && a["tick"] == nil { rig.clock += 4000 }
                let logBefore = session.log.count
                var savedCards: [(entry: JSON, context: JSON)] = []
                if a["start"] != nil {
                    session.begin()
                } else if let n = a["tap"]?.double { session.tapOption(Int(n))
                } else if let mic = a["mic"] {
                    session.micPressed()
                    if let rq = rig.requests.last {
                        if mic["stop"] != nil { session.recognizerEnded(rq.id) }
                        else if let e = mic["error"]?.string { session.recognizerError(rq.id, code: e); session.recognizerEnded(rq.id) }
                        else if let heard = mic["heard"]?.string {
                            rig.clock += Int64((mic.d("secs") ?? 0) * 1000)
                            session.recognizerStarted(rq.id); session.recognizerResult(rq.id, heard: heard, score: mic["score"].map { Int(JSON.orZero($0)) }); session.recognizerEnded(rq.id)
                        }
                    }
                } else if let h = a["heard"] {
                    rig.clock += Int64((a.d("secs") ?? 0) * 1000)
                    if let rq = rig.requests.last {
                        session.recognizerStarted(rq.id); session.recognizerResult(rq.id, heard: h.s("text"), score: h["score"].map { Int(JSON.orZero($0)) }); session.recognizerEnded(rq.id)
                    } else { r.check(false, "\(tag): a recogniser request to answer") }
                } else if let t = a["type"]?.string { session.submitTyped(t)
                } else if a["longDone"] != nil { session.longDone()
                } else if let p = a["askPick"]?.string { session.askPick(CallAskChoice(rawValue: p) ?? .tap)
                } else if let stale = a["stale"] {
                    if let rq = rig.requests[safe: stale["index"].map { Int(JSON.orZero($0)) } ?? 0] { session.recognizerResult(rq.id, heard: stale.s("text"), score: nil) }
                } else if a["hang"] != nil { session.hang()
                } else if a["tr"] != nil { session.toggleTranslation()
                } else if let ms = a["tick"]?.double {
                    var left = Int64(ms)
                    while left > 0 { rig.clock += 500; left -= 500; session.tick() }
                } else if a["retry"] != nil {
                    guard let S = summary else { r.check(false, "\(tag): a summary to retry"); continue }
                    session = make(E.retry(base, S.recap.weak)); summary = nil; session.begin()
                } else if a["save"] != nil {
                    savedCards = summary?.cards ?? []
                } else { r.check(false, "\(tag): unknown action") }
                rig.flush()
                if case .summary(let S)? = rig.ended { summary = S }

                // what the step shows
                if st["say"] != nil { r.eq(rig.spoken, st.strs("say"), "\(tag) spoken lines") }
                if st["phases"] != nil { r.eq(rig.phases.map(\.rawValue), st.strs("phases"), "\(tag) phases") }
                if let re = st["react"]?.array { r.eq(rig.reacts.map { "\($0.0)|\($0.1)" }, re.map { "\($0.s("pose"))|\($0.i("ms"))" }, "\(tag) teacher face") }
                if let s = st["state"] {
                    r.eq(session.nodeID, s["node"]?.string, "\(tag) node"); r.eq(session.phase.rawValue, s.s("phase"), "\(tag) phase")
                    r.eq(session.mode.rawValue, s.s("mode"), "\(tag) mode"); r.eq(session.log.count, s.i("logged"), "\(tag) logged")
                }
                if let sk = st["status"]?["k"]?.string, !sk.contains("{") { r.eq(session.status, sk, "\(tag) status") }
                if let ml = st["micLabel"] { r.eq(session.listening ? vi(.callUiDungNghe) : vi(.lessonKindSpeak), render(ml), "\(tag) mic label") }
                if let lg = st["log"]?.array {
                    let added = Array(session.log.dropFirst(logBefore))
                    r.eq(added.count, lg.count, "\(tag) new answers")
                    for (n, e) in lg.enumerated() where n < added.count {
                        r.eq(added[n].id, e.s("id"), "\(tag) answer id"); r.eq(added[n].text, e.s("text"), "\(tag) answer text"); r.eq(added[n].picked, e.t("picked"), "\(tag) answer picked")
                        r.eq(added[n].secs, e.d("secs") ?? 0, "\(tag) answer secs"); r.eq(added[n].asr, e["asr"].map { Int(JSON.orZero($0)) }, "\(tag) answer asr"); r.eq(added[n].typed, e.t("typed"), "\(tag) answer typed")
                    }
                }
                if let y = st["you"]?.string { r.eq(session.you, y, "\(tag) you") }
                if let tip = st["tip"] {
                    switch (tip.s("kind"), session.tip) {
                    case ("default", .hint): r.check(true, "")
                    case ("fix", .fix(let f)): r.eq(f.bad, tip.s("bad"), "\(tag) tip bad"); r.eq(f.good, tip.s("good"), "\(tag) tip good"); r.eq(vi(f.why), render(tip["why"]), "\(tag) tip why")
                    case ("slip", .slip(let said, let meant)): r.eq(said, tip.s("said"), "\(tag) tip said"); r.eq(meant, tip.s("meant"), "\(tag) tip meant")
                    default: r.check(false, "\(tag) tip kind \(tip.s("kind")) ≠ \(session.tip)")
                    }
                }
                if let op = st["options"]?.array { r.eq(session.options, op.compactMap(\.string), "\(tag) options") }
                if let pr = st["progress"]?.string { r.eq("\(session.progress)%", pr, "\(tag) progress") }
                if let cue = st["cue"], !isNull(cue) {
                    r.eq(session.cue?.kind == .prep ? "prep" : "long", cue.s("kind"), "\(tag) cue kind"); r.eq(session.cue?.points ?? [], cue.strs("points"), "\(tag) cue points")
                    r.eq(session.cue?.hasDone ?? false, !isNull(cue["done"]), "\(tag) cue done button")
                    if cue.s("kind") == "prep" { r.eq(session.cue?.title, cue["title"]?["text"]?.string, "\(tag) cue topic") }
                    else { r.eq(vi(.callUiLuotNoiDai1), render(cue["title"]), "\(tag) cue title") }
                }
                if let ck = st["clock"]?.string { r.eq(session.clock, ck, "\(tag) clock") }
                if let lw = st["longWords"] { r.eq(session.longWords, lw["v"]?.i("n"), "\(tag) long-turn word count") }
                if let rec = st["recognizer"]?.array {
                    r.eq(rig.stepRequests.count, rec.count, "\(tag) recogniser requests")
                    for (n, w) in rec.enumerated() where n < rig.stepRequests.count {
                        let q = rig.stepRequests[n]
                        r.eq(q.accent, w.s("accent"), "\(tag) request accent")
                        if w["targetChars"] != nil { r.eq(q.target.count, w.i("targetChars"), "\(tag) long target length"); r.eq(String(q.target.prefix(w.s("target").count - 1)), String(w.s("target").dropLast()), "\(tag) long target") }
                        else { r.eq(q.target, w.s("target"), "\(tag) request target") }
                        if let su = w["setup"], !isNull(su) {
                            let cont: Bool? = isNull(su["continuous"]) ? nil : su["continuous"]?.truthy
                            r.check(q.processLocally, "\(tag) on-device request"); r.eq(q.continuous, cont, "\(tag) continuous")
                            r.eq(q.phrases, su.strs("phrases"), "\(tag) phrases"); r.eq(q.boost, su.i("boost"), "\(tag) boost")
                        } else { r.check(!q.processLocally, "\(tag) no on-device request") }
                    }
                }
                if let tt = st["toasts"]?.array {
                    r.eq(rig.toasts.count + (savedCards.isEmpty ? 0 : 1), tt.count, "\(tag) toasts")
                    for (n, w) in tt.enumerated() where n < rig.toasts.count {
                        switch rig.toasts[n] {
                        case .tapOnly: r.eq(vi(.callUiTrenThietBiNay), render(w), "\(tag) toast")
                        case .recError(let code, _): r.eq(code, w.s("recError"), "\(tag) recogniser error")
                        }
                    }
                    if !savedCards.isEmpty { r.eq(tt.first?["v"]?.i("n") ?? -1, savedCards.count, "\(tag) saved count") }
                }
                for w in st.list("writes") { written.insert(w.s("key")) }
                r.eq(rig.writes.map { "\($0.0)=\($0.1 ?? "")" }, st.list("writes").map { "\($0.s("key"))=\($0.s("value"))" }, "\(tag) writes")
                if let ask = st["ask"] { r.eq(session.ask?.map(\.rawValue) ?? [], ask.list("choices").map { $0.s("id") }, "\(tag) choices") }
                if st["hash"] != nil { if case .exit? = rig.ended { r.check(true, "") } else { r.check(false, "\(tag) back to #/call") } }
                if let sm = st["summary"] { if let S = summary { summaryOK(&r, tag, S, sm, names) } else { r.check(false, "\(tag) a summary") } }
                if let rw = st["rewards"]?.array {
                    r.eq(rw.count, summary == nil ? 0 : 1, "\(tag) rewards")
                    if let S = summary, let w = rw.first { r.eq(S.reward, ["spoken": w.i("spoken"), "xp": w.i("xp")], "\(tag) reward") }
                }
                if !savedCards.isEmpty || st["cards"] != nil {
                    let want = st.list("cards")
                    r.eq(savedCards.count, want.count, "\(tag) cards")
                    for (n, w) in want.enumerated() where n < savedCards.count {
                        r.diff(savedCards[n].entry, w["entry"], "\(tag) card \(n) entry"); r.diff(savedCards[n].context, w["ctx"], "\(tag) card \(n) context")
                        r.check(w["opts"]?.t("silent") == true, "\(tag) cards are saved silently")
                    }
                }
            }
            r.eq(written, Set(o.strs("store")), "\(id) stored choices")
        }
        finish(r, "flow")
    }

    // MARK: parity
    /// P08 end to end: the call of the vector answered by tapping, the on-device rule of the phone, the privacy line per mode, what is rewarded and stored.
    func testParityP08() throws {
        let V = try vec(), E = try engine(), calls = try dataCalls()
        // native recognition: on the device ⇒ local (never asked), only the system recogniser ⇒ ask first, cloud only when accepted, nothing ⇒ tap
        XCTAssertEqual(CallAsr.modeNative(onDevice: true, system: true, pref: nil), .local)
        XCTAssertEqual(CallAsr.modeNative(onDevice: true, system: true, pref: "cloud"), .local)
        XCTAssertEqual(CallAsr.modeNative(onDevice: false, system: true, pref: nil), .ask)
        XCTAssertEqual(CallAsr.modeNative(onDevice: false, system: true, pref: "cloud"), .cloud)
        XCTAssertEqual(CallAsr.modeNative(onDevice: false, system: false, pref: nil), .tap)
        XCTAssertEqual(CallAsr.modeNative(onDevice: true, system: true, pref: "tap"), .tap)
        XCTAssertEqual(CallAsr.privacy(.local).key, .callUiNhanDangNgayTren)
        XCTAssertEqual(CallAsr.privacy(.cloud).key, .callUiDangDungNhanDang)
        // the bundled starter: 8 English calls, Ama and Carlos, offline
        let starter = try XCTUnwrap(CallPack.bundled())
        XCTAssertEqual(starter.scripts.count, 8)
        XCTAssertEqual(Set(starter.scripts.map(\.who)), ["ama", "carlos"])
        // a whole call by tapping: score, notes, reward and cards come from the rules, and nothing the learner said is stored
        let rig = Rig()
        let coffee = try XCTUnwrap(calls["coffee"])
        let session = CallSession(script: coffee, engine: E, l10n: vi, canTranslate: false, platform: rig, mode: { .local })
        session.begin()
        for _ in 0..<E.depth(coffee) { session.tapOption(0) }
        rig.flush()
        guard case .summary(let S)? = rig.ended else { return XCTFail("the call ends with its summary") }
        XCTAssertEqual(S.reward, ["spoken": 0, "xp": 17])
        XCTAssertEqual(S.recap.notes, [.speak])
        XCTAssertEqual(S.cards.count, coffee.phrases.count)
        XCTAssertTrue(rig.writes.isEmpty, "a call writes no stored choice by itself")
        XCTAssertEqual(V["persist"]?.strs("localStorage").sorted(), [CallList.asrKey, CallList.fltKey, CallList.trKey])
        // rude words are never logged and the question is asked again
        let rig2 = Rig()
        let s2 = CallSession(script: coffee, engine: E, l10n: vi, canTranslate: false, platform: rig2, mode: { .tap })
        s2.begin(); s2.submitTyped("what the fuck")
        XCTAssertTrue(s2.log.isEmpty)
        XCTAssertEqual(rig2.spoken.suffix(2).first, "Let's keep our chat friendly and on topic!")
    }
}

extension Array {
    subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}
