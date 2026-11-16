import Foundation

/// What a speaking teacher follows (web `machine.speak({ clock, playing, cues | live, env, dur, text })`).
public struct RigSpeech {
    /// seconds of the utterance as heard (audio clock, latency compensated)
    public var clock: () -> Double
    public var playing: () -> Bool
    /// Native addition (web lesson face `talking && S.voiced()`): the live cursor only advances while this is true. nil = web TeacherRig (voiced = playing).
    public var voiced: (() -> Bool)?
    public var cues: [LipCue]?
    public var env: [Double]?
    public var live: LipLive?
    public var dur: Double?
    public var text: String?
    public init(clock: @escaping () -> Double, playing: @escaping () -> Bool, voiced: (() -> Bool)? = nil, cues: [LipCue]? = nil, env: [Double]? = nil,
                live: LipLive? = nil, dur: Double? = nil, text: String? = nil) {
        self.clock = clock; self.playing = playing; self.voiced = voiced; self.cues = cues; self.env = env; self.live = live; self.dur = dur; self.text = text
    }
}

/// One machine frame (web `last`): mouth/eyes state `s` + skeleton + pose cross-fade.
public struct RigFrame: Sendable {
    public var s: FaceState
    public var shape: String
    public var talking: Bool
    public var tilt: Double, nod: Double, sway: Double, breath: Double
    /// latest requested pose (drawn only while poseW > 0)
    public var pose: String?
    public var poseW: Double, faceW: Double
    /// native: pose target (0 fading out / 1 fading in) – lets Reduce Motion cut instead of cross-fading
    public var poseWant: Double
    public var emo: String
    public var pivot: [Double]
}

/// Port of web/js/teacher-rig.js core (`machine`, `matrix`, `cuesOf`, `poseOf`). Limits, emotions, gestures, fade from rig.json.
public enum TeacherRig {
    /// `poseOf(G, has)`: the gesture's pose, or its stand-in when this teacher has no still for it (`has` nil → the wanted pose).
    public static func poseOf(_ G: RigDefinition.Gesture, has: ((String) -> Bool)?) -> String? {
        if let alt = G.alt, let has, let w = G.wanted, !has(w) { return alt }
        return G.wanted ?? G.pose
    }

    /// `matrix(f)` – rigid 2D affine [a,b,c,d,e,f]: rotate −tilt° about the neck pivot, translate (sway, nod), then uniform breath scale about canvas.breathPivot.
    public static func matrix(pivot: [Double], tilt: Double, nod: Double, sway: Double, breath: Double, breathPivot: [Double]) -> [Double] {
        let px = pivot[0], py = pivot[1], r = -tilt * Double.pi / 180, c = cos(r), s = sin(r), k = 1 + breath
        let B = [k, 0, 0, k, breathPivot[0] * (1 - k), breathPivot[1] * (1 - k)]
        let N = [c, s, -s, c, px - c * px + s * py + sway, py - s * px - c * py + nod]
        return [B[0] * N[0] + B[2] * N[1], B[1] * N[0] + B[3] * N[1], B[0] * N[2] + B[2] * N[3], B[1] * N[2] + B[3] * N[3],
                B[0] * N[4] + B[2] * N[5] + B[4], B[1] * N[4] + B[3] * N[5] + B[5]]
    }
    public static func matrix(_ f: RigFrame, rig: Rig) -> [Double] {
        matrix(pivot: f.pivot, tilt: f.tilt, nod: f.nod, sway: f.sway, breath: f.breath, breathPivot: rig.def.canvas.breathPivot)
    }

    /// `cuesOf(visemes)` for the packed LK_CUES form `[ms, cues, env]` and the `[[shape, ms]]` form.
    public static func cuesOf(packed ms: Double, _ cues: String, env: String?) -> LipSync.Unpacked { LipSync.unpack(ms: ms, cues: cues, env: env) }
    public static func cuesOf(pairs: [(String, Double)]) -> [LipCue] {
        pairs.enumerated().map { i, p in LipCue(start: p.1 / 1000, end: i + 1 < pairs.count ? pairs[i + 1].1 / 1000 : p.1 / 1000, value: p.0) }
    }
}

/// `TeacherRig.core.machine(who, { calm, seed, has })` – stepped once per displayed frame with `now` in seconds.
public final class RigMachine {
    struct Emo { var brow = 0.0, knit = 0.0, smile = 0.0, o = 0.0, lx = 0.0, ly = 0.0, tilt = 0.0, nodHz = 0.0, nodPx = 0.0 }
    struct Out { var tilt = 0.0, nod = 0.0, sway = 0.0, brow = 0.0, knit = 0.0, lx = 0.0, ly = 0.0 }
    struct Proc { var name: String; var t0: Double; var dur: Double }
    struct Speaking { var src: RigSpeech; var M: LipFaceMachine }
    // teacher-rig.js step(): expression spring ω = 9 rad/s (critically damped) · spring/fade steps capped at 1/30 s · dt clamped to [0, 0.1] s
    static let omega = 9.0, maxStep = 1.0 / 30, maxDt = 0.1
    // openK: mouth opens over 40 ms while playing, closes over 80 ms · idle machine loops 120 s · breath 0.22 Hz · queue ≤ 2 poses while speaking
    static let openIn = 0.04, openOut = 0.08, idleLoop = 120.0, breathHz = 0.22, queueMax = 2
    // proc gestures: nod 6·env·max(0, sin 4πu) · bob 3·env · shake sway 3.2·env·sin 6πu + tilt .6·env·sin 6πu · emotion tilt × .6 · smile × .5 while open
    static let nodAmp = 6.0, bobAmp = 3.0, shakeSway = 3.2, shakeTilt = 0.6, emoTiltK = 0.6, openSmileK = 0.5

    public let who: String
    public let calm: Bool
    let rig: Rig, R: RigDefinition.FaceRig, seed: Int64, has: ((String) -> Bool)?
    let L: RigDefinition.Limits, FADE: Double
    var emoName = "neutral", emo = Emo(), want = Emo(), emoV = Emo()
    var S: Speaking? = nil
    var idle: LipFaceMachine
    var proc: [Proc] = [], queue: [String] = []
    var pose: String? = nil, poseW = 0.0, poseWant = 0.0, poseUntil = 0.0, held = 0.0, openK = 0.0
    var prevNow: Double? = nil
    var out = Out()
    public private(set) var last: RigFrame? = nil

    public init(rig: Rig, who: String, calm: Bool = false, seed: Int64? = nil, has: ((String) -> Bool)? = nil) {
        self.rig = rig; self.who = who; self.calm = calm; self.has = has
        self.seed = (seed ?? 0) != 0 ? seed! : 7
        R = rig.face(who); L = rig.def.limits; FADE = rig.def.fade
        idle = LipFaceMachine(rig: rig, who: who, dur: Self.idleLoop, seed: self.seed, calm: calm)
    }

    func vec(_ e: RigDefinition.Emotion?) -> Emo {
        Emo(brow: e?.brow ?? 0, knit: e?.knit ?? 0, smile: e?.smile ?? 0, o: e?.o ?? 0, lx: e?.look?[0] ?? 0, ly: e?.look?[1] ?? 0, tilt: e?.tilt ?? 0,
            nodHz: e?.nodHz ?? 0, nodPx: e?.nodPx ?? 0)
    }

    public func speak(_ src: RigSpeech) {
        let dur = (src.dur ?? 0) != 0 ? src.dur! : 1
        let track = src.cues.map { LipCueTrack($0) } ?? src.live?.track ?? LipCueTrack([])
        let M = LipFaceMachine(rig: rig, who: who, cues: track, env: src.env, dur: max(30, dur), seed: seed &+ Int64((src.text ?? "").utf16.count),
                               text: src.text, calm: calm)
        S = Speaking(src: src, M: M)
        if poseWant != 0 { poseWant = 0; poseUntil = 0 } // speaking shows the drawn face again so the mouth syncs (still fades out)
    }
    public func quiet() { S = nil; if !queue.isEmpty { gesture(queue.removeFirst()) } }
    public var speaking: Bool { S != nil }

    @discardableResult public func setEmotion(_ name: String) -> Bool {
        guard let e = rig.def.emotions[name] else { return false }
        emoName = name; want = vec(e); return true
    }
    /// Native addition: a LipFace EMO expression (face.emo: cheer, concern …) for held poses whose name is not a rig emotion.
    public func setFaceEmotion(_ name: String) -> Bool {
        guard let e = rig.def.face.emo[name] else { return false }
        emoName = name; want = vec(e); return true
    }
    public var emotion: String { emoName }

    @discardableResult public func gesture(_ name: String, at: Double? = nil) -> Bool {
        guard let G = rig.def.people[who]?.gestures[name] else { return false }
        if G.kind == "proc" {
            if calm && name != "blink" { return true }
            proc.append(Proc(name: name, t0: at ?? (prevNow ?? 0), dur: G.dur ?? 0)); return true
        }
        if S != nil { if queue.count < Self.queueMax { queue.append(name) }; return true } // a pose would cover the mouth → after the sentence
        pose = TeacherRig.poseOf(G, has: has); poseWant = 1; held = G.hold ?? 0; poseUntil = 0
        if let e = G.emo { setEmotion(e) }
        return true
    }
    /// Native addition (web lesson `pose(p)` / `hold`): show the still until `release()` (speaking still drops it, like web).
    public func hold(_ p: String) { pose = p; poseWant = 1; held = .infinity; poseUntil = 0 }
    public func release() { poseWant = 0; poseUntil = 0 }
    public var currentPose: String? { poseW > 0 ? pose : nil }

    @inline(__always) static func clamp(_ x: Double, _ a: Double, _ b: Double) -> Double { min(b, max(a, x)) }
    @inline(__always) static func toward(_ cur: Double, _ want: Double, _ step: Double) -> Double { cur + clamp(want - cur, -step, step) }

    @discardableResult public func step(_ now: Double) -> RigFrame {
        let dt = prevNow.map { Self.clamp(now - $0, 0, Self.maxDt) } ?? (1.0 / 60), k = dt * 60
        prevNow = now
        let dts = min(dt, Self.maxStep), w = Self.omega
        func spring(_ e: inout Double, _ v: inout Double, _ target: Double) { let a = w * w * (target - e) - 2 * w * v; v += a * dts; e += v * dts }
        spring(&emo.brow, &emoV.brow, want.brow); spring(&emo.knit, &emoV.knit, want.knit); spring(&emo.smile, &emoV.smile, want.smile)
        spring(&emo.o, &emoV.o, want.o); spring(&emo.lx, &emoV.lx, want.lx); spring(&emo.ly, &emoV.ly, want.ly); spring(&emo.tilt, &emoV.tilt, want.tilt)
        emo.nodHz = want.nodHz; emo.nodPx = want.nodPx
        // mouth/eyes: speaking machine (audio clock) or idle loop
        var s: FaceState, talking = false
        if let sp = S {
            let t = sp.src.clock()
            talking = sp.src.playing()
            if let live = sp.src.live {
                live.tick(t, talking && (sp.src.voiced?() ?? true), min(dt, Self.maxDt))
                s = sp.M.at(max(0, t - rig.lip.lead))
            } else { s = sp.M.at(t) }
        } else { s = idle.at(now.truncatingRemainder(dividingBy: Self.idleLoop)) }
        openK = talking ? min(1, openK + dt / Self.openIn) : max(0, openK - dt / Self.openOut) // not playing → mouth back to X in 80 ms
        if openK < 1 { s.mouth = MouthParams.mix(rig.shape("X"), s.mouth, openK); if openK < 0.5 { s.shape = "X" }; s.open *= openK }
        if !talking && emo.o > 0.01 { s.mouth = MouthParams.mix(s.mouth, rig.shape("E"), Self.clamp(emo.o, 0, 1) * (1 - openK)) } // surprise: round lips while silent
        s.mouth.s = Self.clamp(s.mouth.s + emo.smile * (s.open > 0 ? Self.openSmileK : 1), -0.3, 0.9)
        // pose: fade in → hold → fade out (drawn face inverse)
        if poseWant != 0 && poseW >= 1 && poseUntil == 0 { poseUntil = now + held }
        if poseUntil != 0 && now >= poseUntil { poseWant = 0; poseUntil = 0 }
        let dw = poseWant - poseW
        poseW = Self.clamp(poseW + (dw > 0 ? 1 : dw < 0 ? -1 : 0) * min(abs(dw), min(dt, Self.maxStep) / FADE), 0, 1)
        if poseW == 0 && poseWant == 0 && S == nil && !queue.isEmpty { gesture(queue.removeFirst()) }
        // neck: emotion tilt + machine + procedural gestures, clamped, rate-limited per frame
        var pt = 0.0, pn = 0.0, ps = 0.0, blink = 0.0
        for i in stride(from: proc.count - 1, through: 0, by: -1) {
            let p = proc[i], u = (now - p.t0) / p.dur
            if u >= 1 { proc.remove(at: i); continue }
            if u < 0 { continue }
            let env = sin(Double.pi * u)
            switch p.name {
            case "nod": pn += Self.nodAmp * env * max(0, sin(u * Double.pi * 4))
            case "bob": pn += Self.bobAmp * env
            case "shake": ps += Self.shakeSway * env * sin(u * Double.pi * 6); pt += Self.shakeTilt * env * sin(u * Double.pi * 6)
            case "blink": blink = max(blink, env)
            default: break
            }
        }
        let tilt = calm ? 0 : Self.clamp(s.tilt + emo.tilt * Self.emoTiltK + pt, -L.tilt, L.tilt)
        let nodE = emo.nodHz != 0 && !calm ? emo.nodPx * max(0, sin(now * Double.pi * 2 * emo.nodHz)) : 0
        let nod = calm ? 0 : Self.clamp(s.nod + pn + nodE, -L.nod, L.nod)
        let sway = calm ? 0 : Self.clamp(ps, -L.sway, L.sway)
        let P = L.perFrame
        out.tilt = Self.toward(out.tilt, tilt, P.tilt * k); out.nod = Self.toward(out.nod, nod, P.nod * k); out.sway = Self.toward(out.sway, sway, P.sway * k)
        out.brow = Self.toward(out.brow, Self.clamp(s.brow + emo.brow, -0.3, 1), P.brow * k); out.knit = Self.toward(out.knit, Self.clamp(s.knit + emo.knit, 0, 1), P.knit * k)
        out.lx = Self.toward(out.lx, Self.clamp(s.lookX + emo.lx, -1, 1), P.look * k); out.ly = Self.toward(out.ly, Self.clamp(s.lookY + emo.ly, -1, 1), P.look * k)
        s.tilt = out.tilt; s.nod = out.nod; s.brow = out.brow; s.knit = out.knit; s.lookX = out.lx; s.lookY = out.ly; s.blink = max(s.blink, blink)
        let breath = calm ? 0 : L.breath * sin(now * Double.pi * 2 * Self.breathHz)
        let f = RigFrame(s: s, shape: s.shape, talking: talking, tilt: out.tilt, nod: out.nod, sway: out.sway, breath: breath, pose: pose, poseW: poseW,
                         faceW: 1 - poseW, poseWant: poseWant, emo: emoName, pivot: R.pivot)
        last = f
        return f
    }
}
