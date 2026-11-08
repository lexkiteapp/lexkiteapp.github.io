import Foundation

/// lipsync.js `fromEnv` + `align`: cues for a sentence that has audio but no CI cues – the phonemes of the text are laid onto the REAL loudness
/// envelope (DP segmentation), then mouth open/close edges are snapped to where the sound starts/stops. Same numbers as the JS (constants named here).
extension LipSync {
    // align() defaults: WIN ±150 ms snap window · FAR 500 ms search for sound · thr = 10 % of peak · GAP ≥ 120 ms of silence becomes X
    static let alignWin = 0.15, alignFar = 0.5, alignThr = 0.1, alignGap = 0.12, envHz = 100.0

    /// lipsync.js `align(cues, env)` (no Kokoro word timings on native: `words = []`).
    public func align(_ cues: [LipCue], _ env: [Double]) -> [LipCue] {
        let hz = Self.envHz, n = env.count, peak = max(env.max() ?? 0, 1e-6), thr = peak * Self.alignThr
        func on(_ i: Int) -> Bool { i >= 0 && i < n && env[i] > thr }
        func at(_ t: Double) -> Int { max(0, min(n - 1, Int((t * hz + 0.5).rounded(.down)))) }
        func edge(_ t: Double, _ dir: Int) -> Double {
            var k = at(t)
            if on(k) {
                if dir > 0 { while k > at(t - Self.alignWin) && on(k - 1) { k -= 1 }; return Double(k) / hz }
                while k < at(t + Self.alignWin) && on(k + 1) { k += 1 }
                return Double(k + 1) / hz
            }
            if dir > 0 { let e = at(t + Self.alignFar); while k < e && !on(k) { k += 1 }; return on(k) ? Double(k) / hz : t }
            let e = at(t - Self.alignFar)
            while k > e && !on(k) { k -= 1 }
            return on(k) ? Double(k + 1) / hz : t
        }
        var out = cues
        let first = (0..<n).first(where: on) ?? -1
        var last = n - 1
        while last > 0 && !on(last) { last -= 1 }
        var k = first + 1
        while first >= 0 && k < last {
            defer { k += 1 }
            if on(k) { continue }
            var e = k
            while e < last && !on(e) { e += 1 }
            let a = Double(k) / hz, b = Double(e) / hz
            k = e
            if b - a < Self.alignGap { continue }
            var nx: [LipCue] = []
            for c in out {
                if c.end <= a || c.start >= b || c.value == "X" { nx.append(c); continue }
                if c.start < a { var x = c; x.end = a; nx.append(x) }
                if !nx.contains(where: { $0.value == "X" && $0.start == a }) { nx.append(LipCue(start: a, end: b, value: "X")) }
                if c.end > b { var x = c; x.start = b; nx.append(x) }
            }
            // stable sort by start (V8 Array.sort is stable), then fold X into a preceding X (JS filter with side effect on A[i-1])
            var A = nx.enumerated().sorted { $0.element.start != $1.element.start ? $0.element.start < $1.element.start : $0.offset < $1.offset }.map(\.element)
            var keep = [Bool](repeating: true, count: A.count)
            for i in A.indices where i > 0 && A[i].value == "X" && A[i - 1].value == "X" {
                A[i - 1].end = max(A[i - 1].end, A[i].end)
                if A[i - 1].end != 0 { keep[i] = false }
            }
            out = A.indices.filter { keep[$0] }.map { A[$0] }
        }
        if out.count > 1 {
            for i in 1..<out.count {
                let p = out[i - 1], c = out[i]
                if (p.value == "X") != (c.value == "X") { // silence → open: sound starts · open → silence: sound stops
                    var t = edge(c.start, p.value == "X" ? 1 : -1)
                    t = max(p.start + 0.01, min(c.end - 0.01, t))
                    out[i - 1].end = t; out[i].start = t
                }
            }
        }
        return out
    }

    /// lipsync.js `fromEnv(text, dur, env)`: DP over phoneme units × 10 ms frames; cost = squared deviation from the expected loudness per shape (ELV)
    /// + log-duration deviation; optional silences between words / at punctuation. Falls back to `fromText` when nothing fits.
    public func fromEnv(_ text: String, _ dur: Double, _ env: [Double]) -> [LipCue] {
        let T = env.count, pk = max(env.max() ?? 0, 1e-6)
        let e = env.map { min(1, $0 / pk).squareRoot() }
        var S1 = [0.0], S2 = [0.0]
        S1.reserveCapacity(T + 1); S2.reserveCapacity(T + 1)
        for i in 0..<T { S1.append(S1[i] + e[i]); S2.append(S2[i] + e[i] * e[i]) }
        func seg(_ a: Int, _ b: Int, _ l: Double) -> Double { S2[b] - S2[a] - 2 * l * (S1[b] - S1[a]) + Double(b - a) * l * l }
        struct Step { var v: String; var w: Double; var opt: Bool }
        var st = [Step(v: "X", w: 0, opt: true)]
        var pw: Int? = nil
        for u in units(text) {
            if u.gap { if !st[st.count - 1].opt { st.append(Step(v: "X", w: 0, opt: true)) }; continue }
            if let p = pw, u.wi != p, !st[st.count - 1].opt { st.append(Step(v: "X", w: 0, opt: true)) }
            st.append(Step(v: u.v, w: u.w, opt: false)); pw = u.wi
        }
        if !st[st.count - 1].opt { st.append(Step(v: "X", w: 0, opt: true)) }
        let tw = st.reduce(0) { $0 + $1.w }, voiced = e.filter { $0 > 0.2 }.count
        if T == 0 || tw == 0 { return fromText(text, dur) }
        // JS: silence ≤ 150 frames (1.5 s), cost 1.5 per used silence, duration weight .6, phoneme max 3.5 × expected + 2, default ELV .5
        let k = Double(max(2, voiced)) / tw, N = st.count, INF = 1e18
        var dp = [[Double]](repeating: [Double](repeating: INF, count: T + 1), count: N + 1)
        var bk = [[Int]](repeating: [Int](repeating: 0, count: T + 1), count: N + 1)
        dp[0][0] = 0
        for i in 1...N {
            let s = st[i - 1], l = elv[s.v] ?? 0.5, ex = s.w != 0 ? s.w * k : 0
            let dmin = s.opt ? 0 : (emin[s.v] ?? 1), dmax = s.opt ? 150 : max(dmin + 2, Int((ex * 3.5).rounded(.up)) + 2)
            for t in 0...T {
                var best = INF, bd = 0
                let m = min(dmax, t)
                if dmin <= m {
                    for d in dmin...m {
                        let p = dp[i - 1][t - d]
                        if p >= INF { continue }
                        let lg = s.opt ? 0 : log(Double(d) / ex)
                        let c = p + seg(t - d, t, l) + (s.opt ? (d != 0 ? 1.5 : 0) : 0.6 * (lg * lg))
                        if c < best { best = c; bd = d }
                    }
                }
                dp[i][t] = best; bk[i][t] = bd
            }
        }
        if dp[N][T] >= INF { return fromText(text, dur) }
        var cues: [LipCue] = []
        var t = T
        for i in stride(from: N, through: 1, by: -1) {
            let d = bk[i][t]
            if d != 0 { cues.insert(LipCue(start: Double(t - d) / 100, end: Double(t) / 100, value: st[i - 1].v), at: 0) }
            t -= d
        }
        guard !cues.isEmpty else { return fromText(text, dur) }
        cues[0].start = 0
        cues[cues.count - 1].end = max(cues[cues.count - 1].end, dur)
        return applyLeads(smooth(align(smooth(cues), env)))
    }
}
