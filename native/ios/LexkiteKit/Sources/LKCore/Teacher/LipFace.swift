import Foundation

/// Drawn-face state (web/js/call/face.js `machine().at(t)` result, the input of `parts`). Poster-2x coordinates.
public struct FaceState: Sendable {
    public var mouth: MouthParams
    public var shape: String
    public var gain: Double, open: Double, blink: Double
    public var lookX: Double, lookY: Double
    public var brow: Double, knit: Double, tilt: Double, nod: Double, talk: Double

    /// `parts()` defaults: mouth X, eyes open, rig look, brows/knit/open 0.
    public static func rest(_ rig: Rig, who: String, mouth: MouthParams? = nil) -> FaceState {
        let R = rig.face(who)
        return FaceState(mouth: mouth ?? rig.shape("X"), shape: "X", gain: 1, open: 0, blink: 0, lookX: R.look[0], lookY: R.look[1], brow: 0, knit: 0, tilt: 0, nod: 0, talk: 0)
    }
}

/// face.js `rng` = mulberry32 (32-bit integer arithmetic, `s |= 0` on the seed).
public struct Mulberry32: Sendable {
    var s: UInt32
    public init(seed: Int64) { s = UInt32(truncatingIfNeeded: seed) }
    public mutating func next() -> Double {
        s = s &+ 0x6D2B79F5
        var t = (s ^ (s >> 15)) &* (1 | s)
        t = (t &+ ((t ^ (t >> 7)) &* (61 | t))) ^ t
        return Double(t ^ (t >> 14)) / 4294967296
    }
}

/// Port of web/js/call/face.js: `parts(who, st)` (5 layer op lists) and `machine(who, o)` (blink / glance / accent / head-energy layers).
public enum LipFace {
    // MARK: parts
    /// eye(): sclera and the two eye highlights are pure white in face.js (not a rig colour).
    public static let white = RigColor(rgb: 0xFFFFFF)
    // eye(): lid arc samples 16 · lid offset +2.5/+2 px · closed lid k = 1 − 1.9·b · upper lid cover 1.3 · lower lid 1.12 · iris look .38/.3
    static let arcN = 16, lidK = 1.9, coverK = 1.3, lowerK = 1.12

    static func arc(_ c: [Double], _ rx: Double, _ ry: Double, _ sgn: Double, _ k: Double) -> [Pt] {
        (0...arcN).map { i in
            let x = -rx + 2 * rx * Double(i) / Double(arcN), r = x / rx
            return Pt(c[0] + x, c[1] + sgn * k * ry * max(0, 1 - r * r).squareRoot())
        }
    }

    static func eye(_ R: RigDefinition.FaceRig, _ e: RigDefinition.Eye, _ st: FaceState) -> [PaintOp] {
        let b = min(1, max(0, R.rest + (1 - R.rest) * st.blink)), k = 1 - lidK * b
        let rx2 = e.rx + 2.5, ry2 = e.ry + 2
        let lid = arc(e.c, rx2, ry2, -1, k), top = arc(e.c, rx2, ry2, -1, coverK)
        let ir = e.ry * R.iris * (R.hl ? 1.05 : 1.6), ix = e.c[0] + st.lookX * e.rx * 0.38, iy = e.c[1] + st.lookY * e.ry * 0.3 + (R.hl ? 0 : e.ry * 0.12)
        let ball = PaintShape.ellipse(cx: e.c[0], cy: e.c[1], rx: e.rx, ry: e.ry)
        var o: [PaintOp] = [.fill(ball, color: white, alpha: 1), .save, .clip([ball]),
                            .fill(.ellipse(cx: Paint.r1(ix), cy: Paint.r1(iy), rx: Paint.r1(ir), ry: Paint.r1(ir)), color: R.ink, alpha: 1)]
        if R.hl {
            o.append(.fill(.ellipse(cx: Paint.r1(ix - ir * 0.34), cy: Paint.r1(iy - ir * 0.38), rx: Paint.r1(ir * 0.3), ry: Paint.r1(ir * 0.3)), color: white, alpha: 1))
            o.append(.fill(.ellipse(cx: Paint.r1(ix + ir * 0.36), cy: Paint.r1(iy + ir * 0.3), rx: Paint.r1(ir * 0.12), ry: Paint.r1(ir * 0.12)), color: white, alpha: 1))
        }
        o.append(.restore)
        o.append(.fill(.path(SVGPath.poly(top + lid.reversed(), close: true)), color: R.skin, alpha: 1)) // upper lid (skin) covers above the lid edge
        if b > 0.02 { o.append(.fill(.path(SVGPath.poly(arc(e.c, rx2, ry2, 1, 1) + arc(e.c, rx2, ry2, 1, lowerK).reversed(), close: true)), color: R.skin, alpha: 1)) }
        o.append(.stroke(.path(SVGPath.poly(lid, close: false)), color: R.ink, width: R.lw, cap: .round, join: .round, alpha: 1))
        if R.flick != 0 { // Ama's outward lash flick
            let q = lid[e.side > 0 ? lid.count - 1 : 0], s = e.side
            let d = SVGPath([.move(Paint.r1(q.x - s * 4), Paint.r1(q.y - 2)), .quad(Paint.r1(q.x + s * 6), Paint.r1(q.y - 3), Paint.r1(q.x + s * 10), Paint.r1(q.y - 11 + 6 * b))])
            o.append(.stroke(.path(d), color: R.ink, width: R.lw * 0.7, cap: .round, join: .miter, alpha: 1))
        }
        return o
    }

    static func brow(_ R: RigDefinition.FaceRig, _ w: RigDefinition.Brow, _ st: FaceState) -> [PaintOp] {
        let dy = -st.brow * 9, ki = st.knit * 6 // raise the whole brow · knit lifts the inner end
        let I = Pt(w.i[0], w.i[1] + dy - ki), P = Pt(w.p[0], w.p[1] + dy - ki * 0.4), O = Pt(w.o[0], w.o[1] + dy * 0.8), t = w.th
        let flick = R.flick != 0
        var c: [PathCmd] = [.move(Paint.r1(I.x), Paint.r1(I.y - t * 0.45)), .quad(Paint.r1(P.x), Paint.r1(P.y - t * 0.75), Paint.r1(O.x), Paint.r1(O.y - t * (flick ? 0.05 : 0.4)))]
        if !flick { c.append(.line(Paint.r1(O.x), Paint.r1(O.y + t * 0.35))) }
        c += [.quad(Paint.r1(P.x), Paint.r1(P.y + t * 0.55), Paint.r1(I.x), Paint.r1(I.y + t * 0.5)), .close]
        let s = PaintShape.path(SVGPath(c))
        return [.fill(s, color: R.ink, alpha: 1), .stroke(s, color: R.ink, width: flick ? 1 : 4, cap: .butt, join: .round, alpha: 1)]
    }

    static func stache(_ R: RigDefinition.FaceRig, _ s: RigDefinition.Stache, _ st: FaceState) -> [PaintOp] {
        let x = s.c[0], y = s.c[1] - st.open * 4, w = s.w, h = s.h, f = Paint.r1 // wings lift with the upper lip
        let d = SVGPath([.move(x, f(y - h * 0.45)),
                         .cubic(f(x - w * 0.3), f(y - h * 1.15), f(x - w * 0.85), f(y - h * 0.8), f(x - w), f(y + h * 0.55)),
                         .cubic(f(x - w * 0.7), f(y + h * 0.35), f(x - w * 0.35), f(y + h * 0.85), x, f(y + h * 0.35)),
                         .cubic(f(x + w * 0.35), f(y + h * 0.85), f(x + w * 0.7), f(y + h * 0.35), f(x + w), f(y + h * 0.55)),
                         .cubic(f(x + w * 0.85), f(y - h * 0.8), f(x + w * 0.3), f(y - h * 1.15), x, f(y - h * 0.45)), .close])
        return [.fill(.path(d), color: R.ink, alpha: 1)]
    }

    /// face.js `parts(who, st)` compiled: [left eye, right eye, brows, mouth (translated to RIG.mouth), moustache (empty for Ama)].
    public static func parts(_ rig: Rig, who: String, _ st: FaceState) -> [[PaintOp]] {
        let R = rig.face(who)
        var out = R.eyes.map { eye(R, $0, st) }
        out.append(R.brows.flatMap { brow(R, $0, st) })
        out.append([.save, .translate(x: R.mouth[0], y: R.mouth[1])] + LipMouth.ops(rig.style(who), st.mouth, segments: rig.def.mouth.segments) + [.restore])
        out.append(R.stache.map { stache(R, $0, st) } ?? [])
        return out
    }
}
