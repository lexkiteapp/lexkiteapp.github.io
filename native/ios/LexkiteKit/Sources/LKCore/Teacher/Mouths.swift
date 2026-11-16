import Foundation

/// One mouth shape = 11 numbers (web/js/call/mouths.js SHAPE; values come from rig.json `mouth.shape`).
/// w half width · u/d open up/down · a curve exponent · s smile · tt/tb upper/lower teeth · tg tongue · tu tongue up · bite F/V · lip thickness.
public struct MouthParams: Codable, Equatable, Sendable {
    public var w, u, d, a, s, tt, tb, tg, tu, bite, lip: Double

    public init(w: Double, u: Double, d: Double, a: Double, s: Double, tt: Double, tb: Double, tg: Double, tu: Double, bite: Double, lip: Double) {
        self.w = w; self.u = u; self.d = d; self.a = a; self.s = s; self.tt = tt; self.tb = tb; self.tg = tg; self.tu = tu; self.bite = bite; self.lip = lip
    }

    /// Key order of `SHAPE.X` (= vector columns m.w … m.lip).
    public static let keys = ["w", "u", "d", "a", "s", "tt", "tb", "tg", "tu", "bite", "lip"]
    public subscript(key: String) -> Double? {
        switch key {
        case "w": w
        case "u": u
        case "d": d
        case "a": a
        case "s": s
        case "tt": tt
        case "tb": tb
        case "tg": tg
        case "tu": tu
        case "bite": bite
        case "lip": lip
        default: nil
        }
    }

    /// mouths.js `mix(A, B, k)` – per-key `a + (b - a) * k`.
    public static func mix(_ p: MouthParams, _ q: MouthParams, _ k: Double) -> MouthParams {
        @inline(__always) func l(_ a: Double, _ b: Double) -> Double { a + (b - a) * k }
        return MouthParams(w: l(p.w, q.w), u: l(p.u, q.u), d: l(p.d, q.d), a: l(p.a, q.a), s: l(p.s, q.s), tt: l(p.tt, q.tt), tb: l(p.tb, q.tb),
                           tg: l(p.tg, q.tg), tu: l(p.tu, q.tu), bite: l(p.bite, q.bite), lip: l(p.lip, q.lip))
    }
}

/// Port of web/js/call/mouths.js `svg(who, p)` → the op list `LipPaint.compile` makes of it (origin = mouth centre).
public enum LipMouth {
    // mouths.js svg(): sm = p.s * .32 (smile → corner lift) · ow = hw + 3 * p.lip (outer lip) · outer curve exponent ≤ .8
    static let smileK = 0.32, outerLip = 3.0, outerA = 0.8, openMin = 0.02
    // lip band curves under/over the closed line: half width × .86, exponent .6 · closed A/F lips: p.lip > 1.2
    static let bandW = 0.86, bandA = 0.6, thickLip = 1.2

    /// mouths.js `curve(hw, amp, a, smile, sign)`: N+1 points, y = sign·amp·(1−(x/hw)²)^a − smile·hw·((x/hw)² − .35)
    static func curve(_ hw: Double, _ amp: Double, _ a: Double, _ smile: Double, _ sign: Double, _ n: Int) -> [Pt] {
        var pts: [Pt] = []
        pts.reserveCapacity(n + 1)
        for i in 0...n {
            let x = -hw + 2 * hw * Double(i) / Double(n), r = x / hw, e = pow(max(0, 1 - r * r), a)
            pts.append(Pt(x, sign * amp * e - smile * hw * (r * r - 0.35)))
        }
        return pts
    }

    public static func ops(_ S: RigDefinition.MouthStyle, _ p: MouthParams, segments n: Int) -> [PaintOp] {
        let hw = S.hw * p.w, sm = p.s * smileK, upK = S.up, open = p.u + p.d > openMin
        let top = curve(hw, p.u * S.hw * upK, p.a, sm, -1, n), bot = curve(hw, (p.d + p.u * (1 - upK)) * S.hw, p.a, sm, 1, n)
        let lipD = S.lipD * p.lip, lipU = S.lipU * p.lip
        var out: [PaintOp] = []
        out.reserveCapacity(10)
        if open {
            let ytop = top.map(\.y).min() ?? 0, ybot = bot.map(\.y).max() ?? 0, H = ybot - ytop
            let hole = PaintShape.path(SVGPath.poly(top + bot.reversed(), close: true))
            // outer lip (Ama: no outline)
            if (lipU != 0 || lipD != 0) && !S.outline {
                let ow = hw + outerLip * p.lip
                let outTop = curve(ow, p.u * S.hw * upK + lipU, min(p.a, outerA), sm, -1, n), outBot = curve(ow, p.d * S.hw + lipD, min(p.a, outerA), sm, 1, n)
                out.append(.fill(.path(SVGPath.poly(outTop + outBot.reversed(), close: true)), color: S.lip, alpha: 1))
            }
            out.append(.fill(hole, color: S.inner, alpha: 1))
            out.append(.save)
            out.append(.clip([hole]))
            if p.tg > 0.01 { // tongue: oval from the bottom, tu → curls up to the upper teeth (L)
                let tw = hw * 0.62, th = H * p.tg, cy = ybot - th / 2 + 2 - p.tu * H * 0.18
                out.append(.fill(.ellipse(cx: 0, cy: Paint.r1(cy + th * 0.25), rx: Paint.r1(tw), ry: Paint.r1(th * 0.8 + p.tu * H * 0.2)), color: S.tongueSh, alpha: 1))
                out.append(.fill(.ellipse(cx: 0, cy: Paint.r1(cy + th * 0.35), rx: Paint.r1(tw * 0.88), ry: Paint.r1(th * 0.7 + p.tu * H * 0.16)), color: S.tongue, alpha: 1))
            }
            if p.tt > 0.01 {
                out.append(.fill(.rect(x: Paint.r1(-hw), y: Paint.r1(ytop - 2), w: Paint.r1(2 * hw), h: Paint.r1(2 + max(2.5, H * (p.bite != 0 ? 1.1 : p.tt * 0.55)))), color: S.teeth, alpha: 1))
            }
            if p.tb > 0.01 {
                out.append(.fill(.rect(x: Paint.r1(-hw), y: Paint.r1(ybot - max(2.5, H * p.tb * 0.55)), w: Paint.r1(2 * hw), h: Paint.r1(H)), color: S.teeth, alpha: 1))
            }
            out.append(.restore)
            if p.bite > 0.01 { // F/V: upper teeth over the lower lip
                let bw = hw * 0.66, by = ybot + 3 * p.bite
                let d = SVGPath([.move(Paint.r1(-bw), Paint.r1(ytop + 1)), .line(Paint.r1(bw), Paint.r1(ytop + 1)), .line(Paint.r1(bw * 0.94), Paint.r1(by - 2)),
                                 .quad(0, Paint.r1(by + 2.5), Paint.r1(-bw * 0.94), Paint.r1(by - 2)), .close])
                out.append(.fill(.path(d), color: S.teeth, alpha: 1))
            }
            if S.outline { out.append(.stroke(hole, color: S.line, width: S.lw, cap: .butt, join: .round, alpha: 1)) }
            else { out.append(.stroke(.path(SVGPath.poly(top, close: false)), color: S.line, width: S.lw * 0.7, cap: .round, join: .miter, alpha: 0.55)) }
        } else {
            // closed: line + lower lip (Ama) / line only (Carlos); A = pressed → upper lip band
            let ln = curve(hw, 0, 1, sm, 1, n)
            if S.lipD != 0 { out.append(.fill(.path(SVGPath.poly(ln + curve(hw * bandW, lipD, bandA, sm, 1, n).reversed(), close: true)), color: S.lip, alpha: 1)) }
            if lipU != 0 && p.lip > thickLip {
                out.append(.fill(.path(SVGPath.poly(ln + curve(hw * bandW, lipU, bandA, sm, -1, n).reversed(), close: true)), color: S.lipHi, alpha: 1))
            }
            out.append(.stroke(.path(SVGPath.poly(ln, close: false)), color: S.line, width: S.lw * (p.lip > thickLip ? 1.25 : 1), cap: .round, join: .round, alpha: 1))
            if S.outline && S.lipD != 0 {
                out.append(.stroke(.path(SVGPath.poly(curve(hw * bandW, lipD, bandA, sm, 1, n), close: false)), color: S.line, width: S.lw, cap: .round, join: .miter, alpha: 1))
            }
        }
        return out
    }
}
