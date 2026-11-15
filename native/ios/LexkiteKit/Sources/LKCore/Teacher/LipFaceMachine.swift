import Foundation

/// Port of web/js/call/face.js `machine(who, o)`: parallel layers as a pure function of t + seed – mouth (cue blend × loudness gain),
/// blinks (seeded schedule, doubles), glances (only in silences), brow accents (sound onset after ≥ 150 ms silence, question end), head energy tilt/nod.
public final class LipFaceMachine {
    // face.js machine(): env rate 100 Hz · voiced = env > 10 % of peak · accent after ≥ 15 silent frames · accent pulse .45 s · question accent .25 s before the last shape
    static let hz = 100.0, voicedK = 0.1, accentGap = 15, accentW = 0.45, questionLead = 0.25
    // blink: first at 1 + r·1.6 s, then T.blink[0] + r·T.blink[1]; double blink +.26 s; shape 60 ms close, 20 ms hold, 70 ms open
    static let blinkFirst = (1.0, 1.6), blinkDouble = 0.26, blinkClose = 0.06, blinkHold = 0.08, blinkOpen = 0.07, blinkEnd = 0.15
    // glance: first at 1 + r·1.5 s, spread ±.25/±.125, 70 ms ease; speaking → look at the learner (rig look × .8)
    static let saccFirst = (1.0, 1.5), saccSpread = (0.5, 0.25), saccEase = 0.07, speakLook = 0.8

    let rig: Rig, lip: LipSync
    let R: RigDefinition.FaceRig
    let E: RigDefinition.Emotion
    let track: LipCueTrack
    let gain: LipGain?
    let von: [UInt8]?
    let calm: Bool
    public let blinks: [Double]
    public let accents: [Double]
    let sacc: [(t: Double, x: Double, y: Double)]
    let ph: Double

    /// `o.cues` nil → one X cue over `dur` (face.js default); pass the live cursor's track to follow it as it grows.
    public init(rig: Rig, who: String, cues: LipCueTrack? = nil, env: [Double]? = nil, dur: Double? = nil, emo: String? = nil,
                seed: Int64? = nil, text: String? = nil, calm: Bool = false, lip: LipSync? = nil) {
        let L = lip ?? rig.lip
        self.rig = rig; self.lip = L; self.calm = calm
        R = rig.face(who)
        let T = R.temper
        var r = Mulberry32(seed: seed ?? 7)
        E = emo.flatMap { rig.def.face.emo[$0] } ?? RigDefinition.Emotion(brow: nil, knit: nil, smile: nil, o: nil, tilt: nil, nodHz: nil, nodPx: nil, look: nil)
        let dur = dur ?? 3
        let env = (env?.isEmpty ?? true) ? nil : env
        track = cues ?? LipCueTrack([LipCue(start: 0, end: dur, value: "X")])
        gain = env.map { L.gain($0) }
        let peak = env.map { max($0.max() ?? 0, 1e-6) } ?? 1
        von = env.map { $0.map { $0 > peak * Self.voicedK ? 1 : 0 } }
        // blink schedule
        var bl: [Double] = []
        var t = Self.blinkFirst.0 + r.next() * Self.blinkFirst.1
        while t < dur + 6 {
            bl.append(t)
            if r.next() < T.dbl { t += Self.blinkDouble; bl.append(t) }
            t += T.blink[0] + r.next() * T.blink[1]
        }
        blinks = bl
        // accents: sound onsets after silence · end of a question
        var acc: [Double] = []
        if let env {
            var q = 99
            for i in env.indices { if env[i] > peak * Self.voicedK { if q >= Self.accentGap { acc.append(Double(i) / Self.hz) }; q = 0 } else { q += 1 } }
        }
        if Self.isQuestion(text), let lastOn = track.cues.last(where: { $0.value != "X" }) { acc.append(max(0, lastOn.start - Self.questionLead)) }
        accents = acc
        // glances (only where silent)
        var sc: [(t: Double, x: Double, y: Double)] = [(0, R.look[0], R.look[1])]
        let lk = E.look ?? R.look
        t = Self.saccFirst.0 + r.next() * Self.saccFirst.1
        while !calm && t < dur + 6 {
            if !Self.voiced(t, von: von, lip: L, cues: track.cues) {
                let x = lk[0] + (r.next() - 0.5) * Self.saccSpread.0
                let y = lk[1] + (r.next() - 0.5) * Self.saccSpread.1
                sc.append((t, x, y))
            }
            t += T.sacc[0] + r.next() * T.sacc[1]
        }
        sacc = sc
        ph = r.next() * 6
    }

    static func isQuestion(_ text: String?) -> Bool { // /\?\s*$/
        guard let text else { return false }
        let trimmed = text.unicodeScalars.reversed().drop { CharacterSet.whitespacesAndNewlines.contains($0) }
        return trimmed.first == "?"
    }
    static func voiced(_ t: Double, von: [UInt8]?, lip: LipSync, cues: [LipCue]) -> Bool {
        if let von { return von[max(0, min(von.count - 1, Int((t * hz + 0.5).rounded(.down))))] == 1 }
        return lip.stateAt(cues, t).b != "X"
    }
    @inline(__always) func voiced(_ t: Double) -> Bool { Self.voiced(t, von: von, lip: lip, cues: track.cues) }
    @inline(__always) static func ease(_ x: Double) -> Double { x * x * (3 - 2 * x) }

    func blinkAt(_ t: Double) -> Double {
        var v = 0.0
        for b in blinks {
            let d = t - b
            if d >= 0 && d < Self.blinkEnd {
                v = max(v, d < Self.blinkClose ? Self.ease(d / Self.blinkClose) : d < Self.blinkHold ? 1 : 1 - Self.ease((d - Self.blinkHold) / Self.blinkOpen))
            }
        }
        return v
    }
    func pulse(_ t: Double, _ w: Double) -> Double {
        accents.reduce(0) { v, a in let d = t - a + 0.04; return d > 0 && d < w ? max(v, sin(Double.pi * d / w)) : v }
    }
    func lookAt(_ t: Double) -> (Double, Double) {
        var i = 0
        while i < sacc.count - 1 && sacc[i + 1].t <= t { i += 1 }
        let a = sacc[max(0, i - 1)], b = sacc[i], k = i != 0 ? Self.ease(min(1, max(0, (t - b.t) / Self.saccEase))) : 1
        let tx = voiced(t) ? R.look[0] * Self.speakLook : b.x
        return (a.x + (tx - a.x) * k, a.y + (b.y - a.y) * k)
    }
    /// speaking energy over the last 300 ms (11 samples, 30 ms apart)
    func talk(_ t: Double) -> Double {
        var s = 0.0
        for k in stride(from: -30, through: 0, by: 3) where voiced(t + Double(k) / Self.hz) { s += 1 }
        return s / 11
    }

    public func at(_ t: Double) -> FaceState {
        let T = R.temper
        let s = lip.stateAt(track.cues, t)
        var p = rig.mix(s.a, s.b, s.k)
        let gn = gain?(t) ?? 1, open = p.u + p.d > 0.02
        if open { p.u *= gn; p.d *= gn; p.w *= 0.9 + 0.1 * min(1, gn) }
        if let sm = E.smile, sm != 0 { p.s = max(-0.3, min(0.9, p.s + sm * (open ? 0.5 : 1))) }
        let sp = talk(t), acc = pulse(t, Self.accentW), look = lookAt(t)
        let eTilt = E.tilt ?? 0, nodHz = E.nodHz ?? 0, nodPx = E.nodPx ?? 0
        let tilt = calm ? 0 : eTilt * 0.6 + sp * T.tilt * (0.9 * sin(t * 1.7 + ph) + 0.4 * sin(t * 3.1 + ph * 2))
        let nod = calm ? 0 : acc * T.nod * sp + (nodHz != 0 ? nodPx * max(0, sin(t * Double.pi * 2 * nodHz + ph)) : 0)
        return FaceState(mouth: p, shape: s.k >= 0.5 ? s.b : s.a, gain: gn, open: open ? min(1, (p.u + p.d) / 0.9) : 0, blink: blinkAt(t),
                         lookX: look.0, lookY: look.1, brow: max(-0.3, min(1, (E.brow ?? 0) + acc * T.brow)), knit: E.knit ?? 0, tilt: tilt, nod: nod, talk: sp)
    }
}
