import Foundation
import XCTest
@testable import LKSync
@testable import LKStore
import LKStrings

/// M4 P09 – #/write · #/task1 · #/qstats · #/criteria logic (LKStore/Skills/Essay.swift + Lexis.essay) against vectors/write.json, produced by running the REAL web code
/// (scripts/native/gen-write.mjs; docs/specs/native-m4-vectors.md "Kiểm kê P09"). One test per vector key, every case checked, nothing skipped.
final class WriteVectorTests: XCTestCase {
    struct R {
        var checked = 0
        var failures: [String] = []
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) { checked += 1; if !ok { if failures.count < 25 { failures.append(s()) } else if failures.count == 25 { failures.append("…") } } }
        mutating func eq<T: Equatable>(_ a: T, _ b: T, _ label: String) { check(a == b, "\(label): \(a) ≠ \(b)") }
        mutating func near(_ a: Double, _ b: Double, _ label: String) { check(abs(a - b) < 1e-6, "\(label): \(a) ≠ \(b)") }
    }
    func finish(_ r: R, _ name: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThan(r.checked, 0, "\(name): nothing checked", file: file, line: line)
        XCTAssertTrue(r.failures.isEmpty, "\(name): \(r.failures.count) of \(r.checked) failed:\n" + r.failures.joined(separator: " ¦ "), file: file, line: line)
    }

    static var cachedV: JSON?
    func vec() throws -> JSON { if let v = Self.cachedV { return v }; let v = try Vectors.load("write.json"); Self.cachedV = v; return v }
    let vi = L10n(lang: "vi")
    static let root = Vectors.dir.appendingPathComponent("../../../..").standardized
    func pack() throws -> WritePack {
        let text = try String(contentsOf: Self.root.appendingPathComponent("web/data/write-pack.json"), encoding: .utf8)
        return try XCTUnwrap(WritePack(text: text), "web/data/write-pack.json is a write pack")
    }
    func lexis() throws -> Lexis { Lexis(SkillsData(json: try Vectors.load("skills.json")["data"] ?? .null).lexis) }
    func counts(_ l: [Essay.Count]) -> [String] { l.map { "\($0.w):\($0.n)" } }
    func counts(_ j: JSON?) -> [String] { (j?.array ?? []).map { "\($0.array?.first?.string ?? ""):\(Int(JSON.orZero($0.array?.last)))" } }
    func note(_ k: (key: L10nKey, vars: [String: Int])) -> String { vi(k.key, k.vars) }

    // MARK: write.analyze
    func testAnalyze() throws {
        let V = try vec(), lex = try lexis()
        let stop = Set(V["data"]?.strs("stop") ?? []), index = Set(V["data"]?.strs("index") ?? [])
        var r = R(), n = 0
        for c in V["write"]?.list("analyze") ?? [] {
            let id = c.s("id"), o = c["out"] ?? .null, text = c["input"]?.s("text") ?? ""
            guard id != "too-short" else {
                r.check(Essay.words(text) < Essay.minToAnalyse && o["reported"]?.truthy == false && (o["writes"]?.array ?? []).isEmpty, "\(id): short text → no report, no save")
                continue
            }
            n += 1
            let a = lex.essay(text, stop: stop, indexed: { index.contains($0) })
            r.eq(a.words, o.i("words"), "\(id) words"); r.eq(a.sentences, o.i("sentences"), "\(id) sentences")
            r.near(a.avg, JSON.orZero(o["avg"]), "\(id) avg"); r.near(a.sd, JSON.orZero(o["sd"]), "\(id) sd")
            r.near(a.diversity, JSON.orZero(o["diversity"]), "\(id) diversity"); r.near(a.awlRatio, JSON.orZero(o["awlRatio"]), "\(id) awlRatio"); r.near(a.band, JSON.orZero(o["band"]), "\(id) band")
            r.eq(counts(a.awl), counts(o["awl"]), "\(id) awl"); r.eq(counts(a.link), counts(o["link"]), "\(id) link"); r.eq(counts(a.phrases), counts(o["phrases"]), "\(id) phrases")
            r.eq(counts(a.overused), counts(o["overused"]), "\(id) overused")
            r.eq(Essay.tips(a).map { note(Essay.key($0)) }, o.list("tips").map { SpeakText.render($0, vi) }, "\(id) tips")
            let ring = Essay.ring(band: a.band, span: 4.5)
            r.near(ring.pct, JSON.orZero(o["ringPct"]), "\(id) ring"); r.eq(ring.tone.rawValue, o.s("ringColor"), "\(id) ring colour")
            let st = o.list("stats")
            r.eq(st.map { $0.s("n") }, [String(a.words), String(a.awlTotal), String(a.link.count), String(Vocab.round(a.diversity * 100)) + "%"], "\(id) stats")
            r.eq(SpeakText.render(st[1]["label"], vi), vi(.writeWriteTuAwlPct, ["pct": Essay.pct1(a.awlRatio)]), "\(id) AWL label")
            // the fresh analysis is saved (newest first) and rewarded
            let saved = o.list("writes").first?["value"]?.array?.first
            r.eq(saved?.s("prompt"), "p1", "\(id) saved prompt"); r.eq(saved?.i("words"), a.words, "\(id) saved words"); r.near(JSON.orZero(saved?["band"]), a.band, "\(id) saved band")
            let kept = Essay.saving([], prompt: "p1", text: text, words: a.words, band: a.band, at: 7)
            r.eq(kept.first?.s("text"), saved?.s("text"), "\(id) saved text")
            r.eq(Dictionary(uniqueKeysWithValues: (o.list("rewards").first?.object ?? [:]).map { ($0.key, Int(JSON.orZero($0.value))) }), Essay.reward, "\(id) reward")
        }
        r.check(n >= 8, "cases covered: \(n)")
        finish(r, "write.analyze")
    }

    func testFlows() throws {
        let V = try vec()
        var r = R()
        let by = Dictionary(uniqueKeysWithValues: (V["write"]?.list("flow") ?? []).map { ($0.s("id"), $0["out"] ?? .null) })
        let st = V["write"]?["static"] ?? .null
        r.eq(Essay.minWords, st.i("minWords"), "min words"); r.eq(Essay.clockMinutes, st.i("minutes"), "minutes"); r.eq(Essay.warnSeconds, st.i("warnBelowSeconds"), "warn")
        r.eq(Essay.minToAnalyse, st.i("minToAnalyse"), "min to analyse"); r.eq(Essay.keepSaved, st.i("savedKept"), "kept"); r.eq(Essay.showSaved, st.i("savedShown"), "shown")
        // the saved list keeps 20, newest first; the first prompt is p1
        var l: [JSON] = (0..<22).map { .object(["prompt": .string("p\($0)")]) }
        l = Essay.saving(l, prompt: "p99", text: "x", words: 1, band: 5, at: 1)
        r.eq(l.count, by["saved-list"]?.i("keptAfter") ?? -1, "saved kept after"); r.eq(l.first?.s("prompt"), "p99", "newest first")
        r.eq(by["open-default"]?.s("prompt"), "Agree/Disagree", "default prompt type")
        r.eq(Essay.sessionNumber("p12"), "12", "Đề n")
        finish(r, "write.flow")
    }

    // MARK: task1
    func testTask1Score() throws {
        let V = try vec()
        var r = R()
        for c in V["task1"]?.list("score") ?? [] {
            let id = c.s("id"), i = c["input"] ?? .null, o = c["out"] ?? .null
            let s = Essay.task1Score(i.s("text"), type: i.s("type"))
            r.near(s.band, JSON.orZero(o["band"]), "\(id) band"); r.eq(s.words, o.i("words"), "\(id) words")
            r.eq(s.overview, o.i("overview"), "\(id) overview"); r.eq(s.numbers, o.i("numbers"), "\(id) numbers"); r.eq(s.trend, o.i("trend"), "\(id) trend"); r.eq(s.compare, o.i("compare"), "\(id) compare")
            r.eq(s.notes.map { note(Essay.key($0)) }, o.list("notes").map { SpeakText.render($0, vi) }, "\(id) notes")
        }
        let st = V["task1"]?["static"] ?? .null
        r.eq(Essay.task1MinWords, st.i("minWords"), "t1 min words"); r.eq(Essay.task1Clock, st.i("minutes"), "t1 minutes"); r.eq(Essay.task1Warn, st.i("warnBelowSeconds"), "t1 warn")
        r.eq(Essay.task1MinToAnalyse, st.i("minToAnalyse"), "t1 min to analyse"); r.eq(Essay.task1Reward["xp"], st.i("rewardXp"), "t1 xp")
        let flow = (V["task1"]?.list("flow") ?? []).first { $0.s("id") == "analyse" }?["out"]
        r.eq(Dictionary(uniqueKeysWithValues: (flow?.list("rewards").first?.object ?? [:]).map { ($0.key, Int(JSON.orZero($0.value))) }), Essay.task1Reward, "t1 reward")
        finish(r, "task1.score")
    }

    // MARK: qstats
    func testQStats() throws {
        let V = try vec(), p = try pack()
        var r = R()
        let order = p.skills.map { $0.id }
        r.eq(order, ["il", "ir", "tl", "tr", "fr", "fl", "fw", "cb"], "skill order")
        let names = (V["qstats"]?["names"]?.object ?? [:]).compactMapValues(\.string)
        for c in V["qstats"]?.list("cases") ?? [] {
            let id = c.s("id"), o = c["out"] ?? .null
            let cards = Essay.qstatCards(.object(["qstat": c["input"]?["qstat"] ?? .null]), order: order), want = o.list("cards")
            r.eq(cards.count, want.count, "\(id) cards")
            for (card, w) in zip(cards, want) {
                let info = p.skill(card.skill)
                r.eq((info?.icon ?? "") + " " + (info?.name ?? ""), w.s("icon") + " " + w.s("name"), "\(id) skill")
                let k = w.list("kpi")
                r.eq(k.first?["v"]?.s("k"), "\(card.pct)%", "\(id) pct"); r.eq(k.dropFirst().first?["v"]?.s("k"), String(card.total), "\(id) total")
                r.eq(card.secsEach, k.count > 2 ? Int(JSON.orZero(k[2]["v"]?["v"]?["s"])) + 60 * Int(JSON.orZero(k[2]["v"]?["v"]?["m"])) : nil, "\(id) avg secs")
                let rows = w.list("rows")
                r.eq(card.rows.map { $0.kind }, rows.map { r0 in names.first { $0.value == r0.s("kind") }?.key ?? r0.s("kind") }, "\(id) rows")
                for (row, x) in zip(card.rows, rows) {
                    r.eq(row.pct, x.i("pct"), "\(id) row pct")
                    r.eq(row.tone == .good ? "ok" : row.tone == .again ? "no" : "", x.s("bar"), "\(id) bar")
                    r.eq(Essay.practiceRoute(skill: card.skill, kind: row.kind, skills: Dictionary(uniqueKeysWithValues: p.skills.map { ($0.id, [$0.icon, $0.name, $0.link]) }), rtype: p.rtype, named: names[row.kind] != nil), x.s("href"), "\(id) link")
                    r.eq(row.secsEach == nil, (x["secs"] ?? .null) == .null, "\(id) row secs")
                }
                r.eq(card.weak.flatMap { w0 in names[w0] ?? w0 }, w["weak"]?.array?.last?.string, "\(id) weak")
            }
        }
        finish(r, "qstats")
    }

    // MARK: pack + criteria
    func testPackMatchesVectors() throws {
        let V = try vec(), p = try pack()
        var r = R()
        let st = V["write"]?["static"] ?? .null
        r.eq(p.outline, (st["outline"]?.object ?? [:]).mapValues { ($0.array ?? []).compactMap(\.string) }, "outline")
        r.eq(p.connectors, st.strs("connectors"), "connectors")
        r.eq(p.trends, st["trends"] ?? .null, "trends")
        r.eq(p.vocab, (V["task1"]?["static"]?["vocab"]?.object ?? [:]).mapValues { ($0.array ?? []).compactMap(\.string) }, "task1 vocab")
        r.eq(p.stop, Set(V["data"]?.strs("stop") ?? []), "STOP table")
        r.check(p.stop.contains("the") && p.stop.count > 50, "STOP table is not empty")
        for sk in ["writing", "speaking"] {
            let d = p.criteria[sk] ?? .null, v = V["criteria"]?["skills"]?[sk] ?? .null
            r.eq(d.list("criteria").map { $0.s("id") }, v.list("criteria").map { $0.s("id") }, "\(sk) criteria ids")
            for (c, w) in zip(d.list("criteria"), v.list("criteria")) {
                r.eq((c["bands"]?.object ?? [:]).keys.sorted(), w.strs("bands").sorted(), "\(sk) bands of \(c.s("id"))")
                r.eq(c.s("short"), w.s("short"), "\(sk) short"); r.eq(c.s("weight"), w.s("weight"), "\(sk) weight")
            }
            for (b, m) in v["models"]?.object ?? [:] {
                let model = d["models"]?[b] ?? .null
                r.eq(Essay.words(model.s(sk == "writing" ? "essay" : "transcript")) > 0, true, "\(sk) \(b) model text")
                r.eq(model.s("band"), m.s("band"), "\(sk) \(b) band")
                r.eq(p.scoreKeys[sk]?.sorted(), (model["scores"]?.object ?? [:]).keys.sorted(), "\(sk) score keys")
            }
            r.eq(d.list("jumpTips").count, v.list("jump").count, "\(sk) roadmap")
        }
        r.eq(V["criteria"]?["rules"]?.strs("modelBands"), ["5.0", "6.5", "8.0"], "model bands")
        finish(r, "pack")
    }
}
