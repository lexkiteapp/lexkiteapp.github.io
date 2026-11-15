import Foundation
#if !RIG_DRIVER
import XCTest
@testable import LKSync
import LKCore
#endif

/// C05 teacher rig: the native port (LKCore/Teacher) against vectors/rig.json, produced by running the REAL web TeacherRig core
/// (scripts/native/gen-teach.mjs; schema docs/specs/native-m2-vectors.md §3). Floats ±2e-6, strings exact, lip gate ±33 ms.
/// The rig definition is read from native/shared/gen/teach/rig.json (one source, never copied).
enum RigVectorCheck {
    static let tol = 2e-6

    struct Report {
        var checked = 0
        var failures: [String] = []
        var notes: [String] = []
        mutating func fail(_ s: String) { if failures.count < 25 { failures.append(s) } else if failures.count == 25 { failures.append("…") } }
        mutating func check(_ ok: Bool, _ s: @autoclosure () -> String) { checked += 1; if !ok { fail(s()) } }
    }

    static func rigURL(_ testFile: String = #filePath) -> URL {
        URL(fileURLWithPath: testFile).deletingLastPathComponent().appendingPathComponent("../../../../shared/gen/teach/rig.json").standardized
    }
    static func loadRig(_ url: URL = rigURL()) throws -> Rig { try Rig.load(from: Data(contentsOf: url)) }

    static func near(_ a: Double?, _ b: Double?, _ t: Double = tol) -> Bool {
        guard let a, let b else { return a == nil && b == nil }
        return abs(a - b) <= t
    }
    static func nums(_ j: JSON?) -> [Double] { j?.array?.compactMap(\.double) ?? [] }

    // MARK: sources
    struct Source { let dur: Double; let cues: [LipCue]; let env: [Double] }
    static func sources(_ V: JSON) -> [String: Source] {
        var out: [String: Source] = [:]
        for (k, s) in V["sources"]?.object ?? [:] {
            let dur = s["dur"]?.double ?? 0, raw = s["cues"]?.array ?? []
            let cues = raw.enumerated().map { i, c in
                LipCue(start: c.array?[0].double ?? 0, end: i + 1 < raw.count ? (raw[i + 1].array?[0].double ?? 0) : dur, value: c.array?[1].string ?? "")
            }
            out[k] = Source(dur: dur, cues: cues, env: nums(s["env255"]).map { $0 / 255 })
        }
        return out
    }
    static func cueRows(_ j: JSON?) -> [(Double, Double, String)] {
        (j?.array ?? []).map { ($0.array?[0].double ?? .nan, $0.array?[1].double ?? .nan, $0.array?[2].string ?? "") }
    }
    static func compareCues(_ r: inout Report, _ label: String, _ got: [LipCue], _ want: [(Double, Double, String)]) {
        r.check(got.count == want.count, "\(label): \(got.count) cues ≠ \(want.count)")
        for (i, (g, w)) in zip(got, want).enumerated() {
            r.check(g.value == w.2 && near(g.start, w.0) && near(g.end, w.1), "\(label)[\(i)]: \(g.start)…\(g.end) \(g.value) ≠ \(w.0)…\(w.1) \(w.2)")
        }
    }

    // MARK: scenarios (machine stepped every 1/60 s, rows every 6th frame)
    final class Clock { var cur = 0.0 }

    static func scenarios(_ rig: Rig, _ V: JSON) -> Report {
        var r = Report()
        let src = sources(V), cols = (V["columns"]?.array ?? []).compactMap(\.string), fps = V["fps"]?.double ?? 60
        for sc in V["scenarios"]?.array ?? [] {
            let id = sc["id"]?.string ?? "?", who = sc["who"]?.string ?? "ama", calm = sc["calm"] == .bool(true), useDict = sc["dict"] == .bool(true)
            let person = rig.def.people[who]
            r.check(sc["seed"]?.int64 == person?.seed, "\(id)/\(who): seed \(String(describing: sc["seed"])) ≠ rig \(String(describing: person?.seed))")
            let poses = Set(person?.poses ?? [])
            let M = RigMachine(rig: rig, who: who, calm: calm, seed: person?.seed, has: { poses.contains($0) })
            let lip = useDict ? rig.lipDict : rig.lip
            let events = (sc["events"]?.array ?? []).enumerated().sorted { ($0.element["t"]?.double ?? 0, $0.offset) < ($1.element["t"]?.double ?? 0, $1.offset) }.map(\.element)
            var rows: [Int: [JSON]] = [:]
            for row in sc["rows"]?.array ?? [] { if let a = row.array, let i = a.first?.double { rows[Int(i)] = a } }
            let n = Int(((sc["seconds"]?.double ?? 0) * fps + 0.5).rounded(.down))
            let clock = Clock()
            var ei = 0
            for i in 0..<n {
                let now = Double(i) / fps
                clock.cur = now
                while ei < events.count, (events[ei]["t"]?.double ?? 0) <= now + 1e-9 {
                    let e = events[ei]; ei += 1
                    switch e["op"]?.string {
                    case "emotion": M.setEmotion(e["name"]?.string ?? "")
                    case "listen": M.setEmotion(e["on"] == .bool(true) ? "listen" : "neutral")
                    case "gesture": M.gesture(e["name"]?.string ?? "", at: now)
                    case "quiet": M.quiet()
                    case "speak":
                        let t0 = now, key = e["source"]?.string, dur = e["dur"]?.double ?? key.flatMap { src[$0]?.dur } ?? 1
                        let c = clock
                        if let key, let s = src[key] {
                            M.speak(RigSpeech(clock: { c.cur - t0 }, playing: { c.cur - t0 < dur }, cues: s.cues, env: s.env, dur: dur, text: e["text"]?.string))
                        } else {
                            let text = e["text"]?.string ?? ""
                            M.speak(RigSpeech(clock: { c.cur - t0 }, playing: { c.cur - t0 < dur }, live: lip.live(text, dur: dur), dur: dur, text: text))
                        }
                    default: r.fail("\(id): unknown event \(e.stableString)")
                    }
                }
                let f = M.step(now)
                guard let want = rows[i] else { continue }
                let s = f.s
                var got: [Any?] = [Double(i), f.shape, f.talking ? 1.0 : 0.0, f.tilt, f.nod, f.sway, f.breath, f.poseW, f.pose, f.emo, s.blink, s.brow, s.knit,
                                   s.lookX, s.lookY, s.open, s.gain]
                for k in MouthParams.keys { got.append(s.mouth[k] as Any?) }
                for (ci, col) in cols.enumerated() where ci < want.count && ci < got.count {
                    let w = want[ci], g = got[ci]
                    let ok: Bool
                    switch w {
                    case .number(let x): ok = near(g as? Double, x)
                    case .string(let x): ok = (g as? String) == x
                    case .null: ok = g == nil || (g as? String) == nil && (g as? Double) == nil
                    default: ok = false
                    }
                    r.check(ok, "\(id)/\(who) frame \(i) \(col): \(String(describing: g)) ≠ \(w.stableString)")
                }
            }
        }
        return r
    }

    // MARK: lip gate (cue → shape within ±33 ms)
    static func lipGate(_ rig: Rig, _ V: JSON) -> Report {
        var r = Report()
        let src = sources(V), fps = V["fps"]?.double ?? 60
        var maxMs = 0.0
        for g in V["lipGate"]?.array ?? [] {
            guard let key = g["source"]?.string, let s = src[key], let who = g["who"]?.string else { r.fail("lipGate: bad entry"); continue }
            let M = RigMachine(rig: rig, who: who, seed: g["seed"]?.int64 ?? 3)
            let off = g["nowOffset"]?.double ?? 100, clock = Clock()
            M.speak(RigSpeech(clock: { clock.cur }, playing: { clock.cur < s.dur }, cues: s.cues, env: s.env, dur: s.dur, text: g["text"]?.string))
            var tr: [(Double, String)] = [], ps = "X", i = 0
            while clock.cur <= s.dur + 0.1 {
                clock.cur = Double(i) / fps
                let sh = M.step(off + clock.cur).shape
                if sh != ps { tr.append((clock.cur, sh)); ps = sh }
                i += 1
            }
            let want = (g["transitions"]?.array ?? []).map { ($0.array?[0].double ?? .nan, $0.array?[1].string ?? "") }
            r.check(tr.count == want.count, "lipGate \(key)/\(who): \(tr.count) transitions ≠ \(want.count)")
            for (k, (a, b)) in zip(tr, want).enumerated() { r.check(a.1 == b.1 && near(a.0, b.0), "lipGate \(key)/\(who) transition \(k): \(a) ≠ \(b)") }
            for c in g["checks"]?.array ?? [] {
                let start = c["start"]?.double ?? 0, value = c["value"]?.string ?? ""
                var d = 1.0
                for (t, sh) in tr where sh == value && abs(t - start) < abs(d) { d = t - start }
                maxMs = max(maxMs, abs(d) * 1000)
                r.check(abs(d) <= 0.033 && abs(d * 1000 - (c["deltaMs"]?.double ?? 999)) <= 1, "lipGate \(key)/\(who) cue \(value)@\(start): Δ \(Int((d * 1000).rounded())) ms (web \(c["deltaMs"]?.double ?? -1))")
            }
        }
        r.notes.append("lip gate max |Δ| \(Int(maxMs.rounded())) ms")
        return r
    }

    // MARK: lipsync pure functions
    static func lipsync(_ rig: Rig, _ V: JSON) -> Report {
        var r = Report()
        let L = V["lipsync"], src = sources(V)
        for (n, u) in (L?["unpack"]?.array ?? []).enumerated() {
            let p = u["packed"]?.array ?? []
            let got = LipSync.unpack(ms: p[0].double ?? 0, cues: p[1].string ?? "", env: p.count > 2 ? p[2].string : nil)
            let o = u["out"]
            r.check(near(got.dur, o?["dur"]?.double), "unpack[\(n)] dur")
            let wc = o?["cues"]?.array ?? []
            r.check(got.cues.count == wc.count, "unpack[\(n)] \(got.cues.count) cues ≠ \(wc.count)")
            for (g, w) in zip(got.cues, wc) { r.check(g.value == w.array?[1].string && near(g.start, w.array?[0].double), "unpack[\(n)] cue \(g) ≠ \(w.stableString)") }
            let we = o?["env255"]?.array.map { $0.compactMap(\.double) }
            let ge = got.env.map { $0.map { ($0 * 255 + 0.5).rounded(.down) } }
            r.check(ge == we, "unpack[\(n)] env255 \(ge?.count ?? -1) values ≠ \(we?.count ?? -1)")
        }
        for (mode, lip) in [("plain", rig.lip), ("dict", rig.lipDict)] {
            for u in L?["units"]?[mode]?.array ?? [] {
                let text = u["text"]?.string ?? "", got = lip.units(text), want = u["out"]?.array ?? []
                r.check(got.count == want.count, "units.\(mode) '\(text)': \(got.count) ≠ \(want.count)")
                for (g, w) in zip(got, want) {
                    let ok = g.v == w["v"]?.string && g.w == w["w"]?.double && Double(g.wi) == w["wi"]?.double && Double(g.ci) == w["ci"]?.double && g.gap == (w["gap"] != nil)
                    r.check(ok, "units.\(mode) '\(text)': \(g) ≠ \(w.stableString)")
                }
            }
            for f in L?["fromText"]?[mode]?.array ?? [] {
                let text = f["text"]?.string ?? ""
                compareCues(&r, "fromText.\(mode) '\(text)'", lip.fromText(text, f["dur"]?.double ?? 0), cueRows(f["out"]))
            }
        }
        for f in L?["fromEnv"]?.array ?? [] {
            guard let s = src[f["source"]?.string ?? ""] else { r.fail("fromEnv: missing source"); continue }
            let text = f["text"]?.string ?? ""
            compareCues(&r, "fromEnv '\(text)'", rig.lipDict.fromEnv(text, f["dur"]?.double ?? s.dur, s.env), cueRows(f["out"]))
        }
        for c in L?["live"]?.array ?? [] {
            let text = c["text"]?.string ?? "", dur = c["dur"]?.double ?? 0, fps = c["fps"]?.double ?? 60
            let lv = rig.lipDict.live(text, dur: dur) // gen-teach.mjs runs live + fromEnv while setDict(DICT) is active (the doc's "dict OFF" is wrong)
            var trace: [Int: (Bool, String)] = [:]
            let last = Int((dur * fps).rounded(.up)) + 20
            for i in 0...last {
                let t = Double(i) / fps, voiced = t > 0.1 && t < dur - 0.1 && (i % 90) < 72
                lv.tick(t, voiced, 1 / fps)
                if i % 6 == 0 { trace[i] = (voiced, lv.cues[lv.cues.count - 1].value) }
            }
            for w in c["trace"]?.array ?? [] {
                let a = w.array ?? [], i = Int(a[0].double ?? -1)
                r.check(trace[i]?.0 == (a[1].double == 1) && trace[i]?.1 == a[2].string, "live '\(text)' trace \(i): \(String(describing: trace[i])) ≠ \(w.stableString)")
            }
            compareCues(&r, "live '\(text)'", lv.cues, cueRows(c["cues"]))
        }
        for s in L?["stateAt"]?.array ?? [] {
            guard let cues = src[s["source"]?.string ?? ""]?.cues else { r.fail("stateAt: missing source"); continue }
            let t = s["t"]?.double ?? 0, g = rig.lip.stateAt(cues, t)
            r.check(g.a == s["a"]?.string && g.b == s["b"]?.string && near(g.k, s["k"]?.double) && Double(g.i) == s["i"]?.double, "stateAt t=\(t): \(g) ≠ \(s.stableString)")
        }
        for gv in L?["gain"]?.array ?? [] {
            guard let env = src[gv["source"]?.string ?? ""]?.env else { r.fail("gain: missing source"); continue }
            let G = rig.lip.gain(env)
            for p in gv["samples"]?.array ?? [] {
                let t = p.array?[0].double ?? 0
                r.check(near(G(t), p.array?[1].double), "gain t=\(t): \(G(t)) ≠ \(p.stableString)")
            }
        }
        return r
    }

    // MARK: matrix · paint · mood
    static func matrix(_ rig: Rig, _ V: JSON) -> Report {
        var r = Report()
        for m in V["matrix"]?.array ?? [] {
            let got = TeacherRig.matrix(pivot: nums(m["pivot"]), tilt: m["tilt"]?.double ?? 0, nod: m["nod"]?.double ?? 0, sway: m["sway"]?.double ?? 0,
                                        breath: m["breath"]?.double ?? 0, breathPivot: rig.def.canvas.breathPivot)
            let want = nums(m["m"])
            r.check(got.count == 6 && zip(got, want).allSatisfy { near($0, $1) }, "matrix \(m.stableString): \(got)")
            r.check(got[0] == got[3] && got[1] == -got[2], "matrix has shear: \(got)")
        }
        return r
    }

    static func shapeJSON(_ s: PaintShape) -> JSON {
        switch s {
        case .path(let p): return ["d": .string(p.d)]
        case let .ellipse(cx, cy, rx, ry): return ["e": .array([.number(cx), .number(cy), .number(rx), .number(ry)])]
        case let .rect(x, y, w, h): return ["r": .array([.number(x), .number(y), .number(w), .number(h)])]
        }
    }
    static func opJSON(_ o: PaintOp) -> JSON {
        switch o {
        case .save: return ["op": "save"]
        case .restore: return ["op": "restore"]
        case let .translate(x, y): return ["op": "tr", "x": .number(x), "y": .number(y)]
        case .clip(let s): return ["op": "clip", "s": .array(s.map(shapeJSON))]
        case let .fill(s, c, al): return ["op": "fill", "s": shapeJSON(s), "c": .string(c.hex), "al": .number(al)]
        case let .stroke(s, c, w, cap, join, al):
            return ["op": "stroke", "s": shapeJSON(s), "c": .string(c.hex), "w": .number(w), "cap": .string(cap.rawValue), "join": .string(join.rawValue), "al": .number(al)]
        }
    }
    /// Structural compare: numbers ±1e-9 (all paint numbers are already rounded to 0.1 by the same function), strings exact; a path `d` that differs as text
    /// is accepted only if every number is within the doc's ±0.11 and counted in `dNear` (reported).
    static func paintDiff(_ a: JSON, _ b: JSON, _ path: String, _ dNear: inout Int) -> String? {
        switch (a, b) {
        case (.object(let x), .object(let y)):
            if Set(x.keys) != Set(y.keys) { return "\(path): keys \(x.keys.sorted()) ≠ \(y.keys.sorted())" }
            for k in x.keys.sorted() { if let d = paintDiff(x[k]!, y[k]!, path + "." + k, &dNear) { return d } }
            return nil
        case (.array(let x), .array(let y)):
            if x.count != y.count { return "\(path): \(x.count) ≠ \(y.count) items" }
            for i in x.indices { if let d = paintDiff(x[i], y[i], "\(path)[\(i)]", &dNear) { return d } }
            return nil
        case (.number(let x), .number(let y)): return abs(x - y) <= 1e-9 ? nil : "\(path): \(x) ≠ \(y)"
        case (.string(let x), .string(let y)):
            if x == y { return nil }
            if path.hasSuffix(".d"), let p = SVGPath.parse(x), let q = SVGPath.parse(y), p.cmds.count == q.cmds.count {
                let ok = zip(p.cmds, q.cmds).allSatisfy { a, b in
                    let (na, nb) = (cmdNums(a), cmdNums(b))
                    return na.count == nb.count && zip(na, nb).allSatisfy { abs($0 - $1) <= 0.11 }
                }
                if ok { dNear += 1; return nil }
            }
            return "\(path): '\(x.prefix(120))' ≠ '\(y.prefix(120))'"
        default: return a == b ? nil : "\(path): \(a.stableString.prefix(80)) ≠ \(b.stableString.prefix(80))"
        }
    }
    static func cmdNums(_ c: PathCmd) -> [Double] {
        switch c {
        case let .move(x, y), let .line(x, y): return [x, y]
        case let .quad(a, b, x, y): return [a, b, x, y]
        case let .cubic(a, b, c2, d, x, y): return [a, b, c2, d, x, y]
        case .close: return []
        }
    }

    static func paint(_ rig: Rig, _ V: JSON) -> Report {
        var r = Report()
        var dNear = 0
        for p in V["paint"]?.array ?? [] {
            let who = p["who"]?.string ?? "ama", st = p["state"]
            var s = FaceState.rest(rig, who: who)
            if let m = st?["mouth"]?.string { s.mouth = rig.shape(m) }
            else if let o = st?["mouth"]?.object {
                func v(_ k: String) -> Double { o[k]?.double ?? 0 }
                s.mouth = MouthParams(w: v("w"), u: v("u"), d: v("d"), a: v("a"), s: v("s"), tt: v("tt"), tb: v("tb"), tg: v("tg"), tu: v("tu"), bite: v("bite"), lip: v("lip"))
            }
            if let b = st?["blink"]?.double { s.blink = b }
            if let x = st?["look"]?["x"]?.double, let y = st?["look"]?["y"]?.double { s.lookX = x; s.lookY = y }
            if let b = st?["brow"]?.double { s.brow = b }
            if let k = st?["knit"]?.double { s.knit = k }
            if let o = st?["open"]?.double { s.open = o }
            let got = JSON.array(LipFace.parts(rig, who: who, s).map { .array($0.map(opJSON)) })
            let d = paintDiff(got, p["parts"] ?? .null, "paint \(who)/\(p["name"]?.string ?? "?")", &dNear)
            r.check(d == nil, d ?? "")
        }
        if dNear > 0 { r.notes.append("paint: \(dNear) path strings differ only within ±0.1") }
        return r
    }

    static func mood(_ rig: Rig, _ V: JSON) -> Report {
        var r = Report()
        var m = TeacherMood(rig: rig)
        for e in V["mood"]?.array ?? [] {
            var data: [String: Bool] = [:]
            for (k, v) in e["data"]?.object ?? [:] { if case .bool(let b) = v { data[k] = b } }
            let got = m.feed(e["type"]?.string ?? "", data), want = e["out"]
            if want == .null || want == nil { r.check(got == nil, "mood \(e.stableString): got \(String(describing: got))") }
            else { r.check(got?.type == want?["type"]?.string && got?.pose == want?["pose"]?.string && got?.emo == want?["emo"]?.string, "mood \(e.stableString): got \(String(describing: got))") }
            r.check(Double(m.ok) == e["state"]?["ok"]?.double && Double(m.bad) == e["state"]?["bad"]?.double, "mood state \(m.ok)/\(m.bad) ≠ \(e["state"]?.stableString ?? "")")
        }
        return r
    }
}

#if !RIG_DRIVER
final class RigVectorTests: XCTestCase {
    var rig: Rig!
    var V: JSON!
    override func setUpWithError() throws { rig = try RigVectorCheck.loadRig(); V = try Vectors.load("rig.json") }

    func assertReport(_ r: RigVectorCheck.Report, min: Int, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertGreaterThanOrEqual(r.checked, min, "too few checks ran", file: file, line: line)
        XCTAssert(r.failures.isEmpty, r.failures.joined(separator: "\n"), file: file, line: line)
        for n in r.notes { print("RigVectorTests:", n) }
    }
    func testScenarios() { XCTAssertEqual(V["scenarios"]?.array?.count, 24); assertReport(RigVectorCheck.scenarios(rig, V), min: 24 * 51 * 28) }
    func testLipGate() { XCTAssertEqual(V["lipGate"]?.array?.count, 38); assertReport(RigVectorCheck.lipGate(rig, V), min: 38 * 5) }
    func testLipSync() { assertReport(RigVectorCheck.lipsync(rig, V), min: 300) }
    func testMatrix() { assertReport(RigVectorCheck.matrix(rig, V), min: 24) }
    func testPaint() { XCTAssertEqual(V["paint"]?.array?.count, 28); assertReport(RigVectorCheck.paint(rig, V), min: 28) }
    func testMood() { assertReport(RigVectorCheck.mood(rig, V), min: 20) }
}
#endif
