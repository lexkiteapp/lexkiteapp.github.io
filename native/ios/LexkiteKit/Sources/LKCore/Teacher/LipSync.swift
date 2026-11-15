import Foundation

/// One mouth cue (Rhubarb-style): shape `value` from `start` to `end` (seconds).
public struct LipCue: Equatable, Sendable {
    public var start: Double, end: Double, value: String
    public init(start: Double, end: Double, value: String) { self.start = start; self.end = end; self.value = value }
}

/// Shared, growing cue list: the live cursor appends while the face machine reads it (web: the same `live.cues` array object).
public final class LipCueTrack {
    public var cues: [LipCue]
    public init(_ cues: [LipCue]) { self.cues = cues }
}

/// Port of web/js/call/lipsync.js (pure functions). Tables (visemes, timing, leads, gain range, ELV/EMIN, CMUdict subset) come from rig.json `lip`;
/// algorithm constants that live in the JS code are named below with their JS origin.
public final class LipSync: Sendable {
    public struct Unit: Equatable, Sendable { public var v: String; public var w: Double; public var wi: Int; public var ci: Int; public var gap: Bool }
    public struct State: Equatable, Sendable { public var a: String; public var b: String; public var k: Double; public var i: Int }
    public struct Unpacked: Sendable {
        public var dur: Double; public var cues: [LipCue]; public var env: [Double]?
        public init(dur: Double, cues: [LipCue], env: [Double]? = nil) { self.dur = dur; self.cues = cues; self.env = env }
    }

    public let blend: Double, minHold: Double, lead: Double
    public let leads: [String: Double], arpabet: [String: String], fallback: String
    public let gmin: Double, gmax: Double
    public let elv: [String: Double], emin: [String: Int]
    public let dict: [String: String]?

    public init(_ def: RigDefinition, dict: [String: String]?) {
        blend = def.lip.blend; minHold = def.lip.minHold; lead = def.lip.lead; leads = def.lip.leads
        arpabet = def.lip.vis.arpabet; fallback = def.lip.vis.fallback
        gmin = def.lip.gain.min; gmax = def.lip.gain.max; elv = def.lip.elv; emin = def.lip.emin
        self.dict = dict
    }

    // MARK: text → phonemes → units
    /// lipsync.js RULES – letter rules (fallback when a word is not in the dictionary), first match wins.
    static let rules: [(String, [String])] = [("tion", "SH AH N"), ("ough", "OW"), ("igh", "AY"), ("ee", "IY"), ("ea", "IY"), ("oo", "UW"), ("ou", "AW"), ("ow", "OW"),
        ("oi", "OY"), ("ay", "EY"), ("ai", "EY"), ("au", "AO"), ("ch", "CH"), ("sh", "SH"), ("th", "TH"), ("ph", "F"), ("wh", "W"), ("ck", "K"), ("ng", "NG"),
        ("qu", "K W"), ("er", "ER"), ("ar", "AA R"), ("or", "AO R"), ("a", "AE"), ("e", "EH"), ("i", "IH"), ("o", "AA"), ("u", "AH"), ("y", "IY"), ("b", "B"),
        ("c", "K"), ("d", "D"), ("f", "F"), ("g", "G"), ("h", "HH"), ("j", "JH"), ("k", "K"), ("l", "L"), ("m", "M"), ("n", "N"), ("p", "P"), ("r", "R"),
        ("s", "S"), ("t", "T"), ("v", "V"), ("w", "W"), ("x", "K S"), ("z", "Z")].map { ($0.0, $0.1.split(separator: " ").map(String.init)) }
    /// lipsync.js `DA` – one character per phoneme in the packed dictionary.
    static let dictAlphabet = Array("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-/<=>@^_|~".unicodeScalars)

    /// lipsync.js `parseDict`: "#P:<phoneme table>" header + "word <1 char per phoneme>" lines (or plain "word PH ON" lines). First entry wins.
    public static func parseDict(_ txt: String) -> [String: String] {
        var lines = txt.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        var table: [String]? = nil
        if let first = lines.first, first.hasPrefix("#P:") { table = first.dropFirst(3).split(separator: " ", omittingEmptySubsequences: false).map(String.init); lines.removeFirst() }
        var d: [String: String] = [:]
        for l in lines {
            guard let sp = l.firstIndex(of: " ") else { continue }
            let word = l[..<sp], rest = l[l.index(after: sp)...]
            guard !word.isEmpty, !rest.isEmpty, word.unicodeScalars.allSatisfy({ ($0.value >= 97 && $0.value <= 122) || $0 == "'" }), d[String(word)] == nil else { continue }
            if let T = table {
                d[String(word)] = rest.unicodeScalars.map { c -> String in
                    guard let i = dictAlphabet.firstIndex(of: c), i < T.count else { return "" }
                    return T[i]
                }.joined(separator: " ")
            } else { d[String(word)] = String(rest) }
        }
        return d
    }

    static func isLetter(_ u: UInt16) -> Bool { (u >= 65 && u <= 90) || (u >= 97 && u <= 122) }
    static func lowerASCII(_ s: String) -> String { String(decoding: s.utf8.map { $0 >= 65 && $0 <= 90 ? $0 + 32 : $0 }, as: UTF8.self) }

    /// lipsync.js `g2p(w)` – letter rules (silent final e when the word is longer than 3).
    public func g2p(_ word: String) -> [String] {
        var w = Array(Self.lowerASCII(word).utf8.filter { $0 >= 97 && $0 <= 122 })
        if word.utf16.count > 3, w.last == 101 { w.removeLast() }
        var out: [String] = []
        var i = 0
        while i < w.count {
            guard let r = Self.rules.first(where: { k, _ in let ku = Array(k.utf8); return i + ku.count <= w.count && Array(w[i..<(i + ku.count)]) == ku }) else { i += 1; continue }
            out += r.1; i += r.0.utf8.count
        }
        return out
    }
    func vOf(_ p: String) -> String {
        var s = p
        if let i = s.firstIndex(where: { $0.isASCII && $0.isNumber }) { s.remove(at: i) }
        return arpabet[s] ?? fallback
    }

    /// lipsync.js `units(text)`: words → phoneme units (weight w, word index wi, char index ci in UTF-16); punctuation → weighted silence.
    public func units(_ text: String) -> [Unit] {
        let u = Array(text.utf16)
        var U: [Unit] = [], wi = 0, i = 0
        while i < u.count {
            let c = u[i]
            if Self.isLetter(c) || c == 39 {
                var j = i
                while j < u.count, Self.isLetter(u[j]) || u[j] == 39 { j += 1 }
                let w = String(decoding: u[i..<j], as: UTF16.self)
                let ph = (dict?[Self.lowerASCII(w)] ?? "").split(separator: " ").map(String.init)
                for p in ph.isEmpty ? g2p(w) : ph {
                    let vowel = p.first.map { "AEIOU".contains($0) } ?? false
                    // weights: stressed vowel 1.35 · vowel 1 · stop P T K B D G .5 · other consonant .65
                    let wt = vowel ? (p.contains("1") ? 1.35 : 1) : (["P", "T", "K", "B", "D", "G"].contains(p) ? 0.5 : 0.65)
                    U.append(Unit(v: vOf(p), w: wt, wi: wi, ci: i, gap: false))
                }
                wi += 1; i = j
            } else if [44, 46, 59, 58, 33, 63].contains(c) { // , . ; : ! ?
                U.append(Unit(v: "X", w: [44, 59, 58].contains(c) ? 1.6 : 2.4, wi: -1, ci: i, gap: true)); i += 1
            } else { i += 1 }
        }
        return U
    }

    // MARK: cues
    /// lipsync.js `fromText(text, dur)` – lead .05 s / tail .12 s of silence (JS defaults).
    public func fromText(_ text: String, _ dur: Double) -> [LipCue] {
        let U = units(text), lead = 0.05, tail = 0.12
        var tot = U.reduce(0) { $0 + $1.w }; if tot == 0 { tot = 1 }
        let k = max(0.05, dur - lead - tail) / tot
        var t = lead
        var cues = [LipCue(start: 0, end: lead, value: "X")]
        for u in U { cues.append(LipCue(start: t, end: t + u.w * k, value: u.v)); t += u.w * k }
        cues.append(LipCue(start: t, end: max(t, dur), value: "X"))
        return smooth(cues)
    }

    /// lipsync.js `smooth`: merge equal neighbours, swallow pieces shorter than MIN_HOLD into the previous cue.
    public func smooth(_ cues: [LipCue]) -> [LipCue] {
        var out: [LipCue] = []
        for c in cues {
            if let p = out.last, p.value == c.value || c.end - c.start < minHold { out[out.count - 1].end = c.end; continue }
            out.append(c)
        }
        if out.count > 1 && out[0].end - out[0].start < minHold { out[1].start = 0; out.removeFirst() }
        return out
    }

    /// lipsync.js `lead(cues)`: per-shape lead beyond the common LEAD, previous cue keeps ≥ MIN_HOLD.
    public func applyLeads(_ cues: [LipCue]) -> [LipCue] {
        var out = cues
        if out.count < 2 { return out }
        for i in 1..<out.count {
            let d = (leads[out[i].value] ?? lead) - lead
            if d <= 0 { continue }
            let t = max(out[i - 1].start + minHold, out[i].start - d)
            if t < out[i].start { out[i - 1].end = t; out[i].start = t }
        }
        return out
    }

    /// lipsync.js `stateAt(cues, t)`: a = previous shape, b = current, k = blend 0..1 (t is advanced by LEAD).
    public func stateAt(_ cues: [LipCue], _ t0: Double) -> State {
        let t = t0 + lead
        var i = 0
        while i < cues.count - 1 && cues[i + 1].start <= t { i += 1 }
        let b = i < cues.count ? cues[i].value : "X", start = i < cues.count ? cues[i].start : 0
        return State(a: i > 0 ? cues[i - 1].value : "X", b: b, k: min(1, max(0, (t - start) / blend)), i: i)
    }

    /// lipsync.js `gain(env)`: loudness → mouth opening in [GMIN, GMAX]; attack 30 ms / release 120 ms, ref = 95th percentile, read LEAD ahead.
    public func gain(_ env: [Double], hz: Double = 100) -> LipGain { LipGain(env, hz: hz, gmin: gmin, gmax: gmax, lead: lead) }

    /// lipsync.js `live(text, {dur})` – causal cursor that only advances while voiced.
    public func live(_ text: String, dur: Double?) -> LipLive { LipLive(units(text).filter { !$0.gap }, dur: dur, minHold: minHold) }

    // MARK: packed cues (LK_CUES)
    /// lipsync.js `unpack([ms, cues, env])`: "X0 B120" absolute ms · "+X0 B24" 5 ms deltas · "*X0Bo" 5 ms base-36 deltas; env = base64 bytes/255, "~n." = n × "AAAA".
    public static func unpack(ms: Double, cues c: String, env: String?) -> Unpacked {
        let dur = ms / 1000
        let m = c.first
        var tk: [(String, Double)] = []
        if m == "*" {
            let s = Array(c.unicodeScalars.dropFirst())
            var i = 0
            while i < s.count {
                let isUp = s[i].value >= 65 && s[i].value <= 90
                var j = i + 1
                while isUp, j < s.count, (s[j].value >= 48 && s[j].value <= 57) || (s[j].value >= 97 && s[j].value <= 122) { j += 1 }
                if isUp && j > i + 1 {
                    tk.append((String(s[i]), Double(Int(String(String.UnicodeScalarView(s[(i + 1)..<j])), radix: 36) ?? 0))); i = j
                } else { i += 1 }
            }
        } else {
            let body = m == "+" ? String(c.dropFirst()) : c
            for x in body.split(separator: " ", omittingEmptySubsequences: false) {
                let rest = String(x.dropFirst())
                tk.append((x.first.map(String.init) ?? "", rest.isEmpty ? 0 : (Double(rest) ?? .nan)))
            }
        }
        var t = 0.0
        var cues = tk.map { v, n -> LipCue in t = (m == "*" || m == "+") ? t + 5 * n : n; return LipCue(start: t / 1000, end: 0, value: v) }
        for i in cues.indices { cues[i].end = i < cues.count - 1 ? cues[i + 1].start : dur }
        return Unpacked(dur: dur, cues: cues, env: env.map(decodeEnv))
    }
    static func decodeEnv(_ s: String) -> [Double] {
        var b64 = "", i = s.startIndex
        while i < s.endIndex {
            if s[i] == "~", let dot = s[i...].firstIndex(of: "."), let n = Int(s[s.index(after: i)..<dot]) {
                b64 += String(repeating: "AAAA", count: n); i = s.index(after: dot)
            } else { b64.append(s[i]); i = s.index(after: i) }
        }
        while b64.count % 4 != 0 { b64 += "=" } // atob accepts unpadded input
        return (Data(base64Encoded: b64) ?? Data()).map { Double($0) / 255 }
    }

    /// lipsync.js `envOf(buf)`: RMS at `hz` of channel 0 (same scale as the cues.js loudness envelopes).
    public static func envOf(_ x: [Float], sampleRate: Double, hz: Double = 100) -> [Double] {
        let hop = max(1, Int((sampleRate / hz + 0.5).rounded(.down)))
        var out: [Double] = []
        var i = 0
        while i + hop <= x.count {
            var e = 0.0
            for j in i..<(i + hop) { e += Double(x[j]) * Double(x[j]) }
            out.append((e / Double(hop)).squareRoot()); i += hop
        }
        return out
    }
}

/// lipsync.js `gain(env)` closure.
public struct LipGain: Sendable {
    let sm: [Float]
    let hz: Double, gmin: Double, gmax: Double, lead: Double
    init(_ env: [Double], hz: Double, gmin: Double, gmax: Double, lead: Double) {
        self.hz = hz; self.gmin = gmin; self.gmax = gmax; self.lead = lead
        let sorted = env.sorted(), idx = Int((Double(env.count) * 0.95).rounded(.down))
        var ref = idx < sorted.count ? sorted[idx] : 0
        if ref == 0 || ref.isNaN { ref = 1e-6 }
        let ka = 1 - exp(-1 / (0.03 * hz)), kr = 1 - exp(-1 / (0.12 * hz)) // attack 30 ms · release 120 ms
        var y = 0.0, out = [Float](repeating: 0, count: env.count)
        for i in env.indices { let x = min(1.3, env[i] / ref); y += (x > y ? ka : kr) * (x - y); out[i] = Float(y) } // Float32Array in JS
        sm = out
    }
    public func callAsFunction(_ t: Double) -> Double {
        guard !sm.isEmpty else { return 1 }
        let i = max(0, min(sm.count - 1, Int(((t + lead) * hz + 0.5).rounded(.down))))
        return max(gmin, min(gmax, gmin + (gmax - gmin) * pow(Double(sm[i]) / 1.1, 0.6)))
    }
}

/// lipsync.js `live(text, o)` cursor: `tick(t, voiced, dt)` advances through the phoneme units only while voiced; silence → X.
public final class LipLive {
    public let track = LipCueTrack([LipCue(start: 0, end: 0, value: "X")])
    let U: [LipSync.Unit], tot: Double, minHold: Double
    var rate: Double, pos = 0.0, cur = "X", since = 0.0
    public var cues: [LipCue] { track.cues }

    init(_ U: [LipSync.Unit], dur: Double?, minHold: Double, voiced: Double = 0.82, ups: Double = 9.5) {
        self.U = U; self.minHold = minHold
        let s = U.reduce(0) { $0 + $1.w }
        tot = s == 0 ? 1 : s
        // unit weight per voiced second: from the known duration (≈ 82 % voiced), else 9.5/s (JS defaults)
        if let d = dur, d != 0 { rate = tot / max(0.3, d * voiced) } else { rate = ups }
    }
    func unit(at p: Double) -> LipSync.Unit? { var s = 0.0; for u in U { s += u.w; if s > p { return u } }; return nil }

    @discardableResult public func tick(_ t: Double, _ voiced: Bool, _ dt: Double) -> String {
        if voiced { pos += dt * rate }
        let u = pos < tot ? unit(at: pos) : nil, want = voiced && u != nil ? u!.v : "X"
        let n = track.cues.count
        if want != cur && t - since >= minHold {
            track.cues[n - 1].end = t; track.cues.append(LipCue(start: t, end: t, value: want)); cur = want; since = t
        }
        track.cues[track.cues.count - 1].end = t
        return cur
    }
    /// re-anchor on a word boundary (charIndex)
    public func word(_ ci: Int) { var s = 0.0; for u in U { if u.ci >= ci { pos = s; return }; s += u.w } }
    public func setRate(_ r: Double) { rate = r }
}

/// lipsync.js `vad()`: voiced detector on RMS with hysteresis (on above floor·2.2, off after `hang` quiet frames below floor·1.4).
public final class LipVAD {
    var on = false, quiet = 0
    let floor: Double, hang: Int
    public init(floor: Double = 0.01, hang: Int = 4) { self.floor = floor; self.hang = hang }
    public func callAsFunction(_ rms: Double) -> Bool {
        if rms > floor * 2.2 { on = true; quiet = 0 } else if on && rms < floor * 1.4 { quiet += 1; if quiet > hang { on = false } }
        return on
    }
}

/// lipsync.js `clock(read, lat)`: display clock that follows the audio heard (≤ ±33 ms): interpolates between sparse currentTime samples,
/// + 1 presented frame − output latency, never runs backwards while playing. `now` = display time in ms.
public final class LipClock {
    public struct Sample { public var t: Double; public var playing: Bool; public var rate: Double
        public init(t: Double, playing: Bool, rate: Double = 1) { self.t = t; self.playing = playing; self.rate = rate } }
    let read: () -> Sample, lat: () -> Double
    var st = Double.nan, sw = 0.0, out = 0.0, pw = 0.0, fr = 1000.0 / 60, gap = 0.0
    public init(read: @escaping () -> Sample, latency: @escaping () -> Double = { 0 }) { self.read = read; self.lat = latency }
    public func callAsFunction(_ now: Double) -> Double {
        let s = read(), r = s.rate == 0 ? 1 : s.rate
        if pw != 0 { fr += (min(100, max(4, now - pw)) - fr) * 0.1 }
        pw = now
        if s.t != st { if sw != 0 && s.playing { gap += (min(500, now - sw) - gap) * 0.2 }; st = s.t; sw = now }
        let age = s.playing && gap > fr * 0.8 ? fr / 2 : 0
        let base = s.playing ? st + min(0.5, (now - sw + age) / 1000) * r : st
        let l = lat()
        let t = max(0, base + (s.playing ? (fr / 1000 - min(0.3, max(0, l.isNaN ? 0 : l))) * r : 0))
        out = s.playing && t < out && out - t < 0.25 ? out : t
        return out
    }
}
