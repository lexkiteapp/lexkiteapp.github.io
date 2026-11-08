package com.lexkite.app.core.rig

/** Shape of a paint op (docs/specs/native-m2-vectors.md §3): SVG path data (M/L/Q/C/Z, coordinates rounded to 0.1), ellipse, or rect. */
sealed interface PaintShape {
    data class Path(val d: String) : PaintShape
    data class Ellipse(val cx: Double, val cy: Double, val rx: Double, val ry: Double) : PaintShape
    data class Rect(val x: Double, val y: Double, val w: Double, val h: Double) : PaintShape
}

/** Canvas op list = `LipPaint.compile(LipFace.parts(…)[i])` with `display:"none"` branches dropped. Colours are "#RRGGBB" from rig.json. */
sealed interface PaintOp {
    data object Save : PaintOp
    data object Restore : PaintOp
    data class Translate(val x: Double, val y: Double) : PaintOp
    /** Intersect the clip with the union of [shapes]. */
    data class Clip(val shapes: List<PaintShape>) : PaintOp
    data class Fill(val shape: PaintShape, val color: String, val alpha: Double) : PaintOp
    data class Stroke(val shape: PaintShape, val color: String, val width: Double, val cap: String, val join: String, val alpha: Double) : PaintOp
}

/**
 * Port of LipFace.parts (web/js/call/face.js) + LipMouth.svg (mouths.js), emitting the canvas ops LipPaint.compile would produce from those SVG strings.
 * Layers: [0] left eye, [1] right eye, [2] brows, [3] mouth (translated to the rig's mouth point, clipped inside), [4] moustache (empty for Ama).
 * Coordinates = poster-2x pixels (1108×960). Equal states give equal (data-class) op lists, so a renderer can skip unchanged layers.
 */
class FacePaint(private val def: RigDef) {

    fun parts(who: String, st: FaceState): List<List<PaintOp>> {
        val R = def.face(who)
        val eyes = R.eyes.map { eye(R, it, st) }
        val brows = ArrayList<PaintOp>(); for (w in R.brows) brow(R, w, st, brows)
        return listOf(eyes.getOrElse(0) { emptyList() }, eyes.getOrElse(1) { emptyList() }, brows, mouth(who, R, st.mouth), R.stache?.let { stache(R, it, st) } ?: emptyList())
    }

    /** `parts()` default state: rest mouth, eyes open, the rig's own look. */
    fun defaultState(who: String, mouth: MouthParams = def.shape("X")): FaceState { val R = def.face(who); return FaceState(mouth.copy(), lookX = R.lookX, lookY = R.lookY) }

    // ---------- path helpers ----------
    private class Pts(n: Int) { val x = DoubleArray(n); val y = DoubleArray(n) }

    /** face.js arc(): points on the ellipse rim, upper (−) / lower (+), scaled by k. */
    private fun arc(cx: Double, cy: Double, rx: Double, ry: Double, sgn: Double, k: Double, n: Int = ARC_N): Pts {
        val p = Pts(n + 1)
        for (i in 0..n) { val x = -rx + 2 * rx * i / n; val r = x / rx; p.x[i] = cx + x; p.y[i] = cy + sgn * k * ry * Math.sqrt(Math.max(0.0, 1 - r * r)) }
        return p
    }

    /** mouths.js curve(): y(x) across the width, e(x) = (1 − (x/hw)²)^a, corners lifted by smile. */
    private fun curve(hw: Double, amp: Double, a: Double, smile: Double, sign: Double): Pts {
        val n = def.segments; val p = Pts(n + 1)
        for (i in 0..n) {
            val x = -hw + 2 * hw * i / n; val r = x / hw; val e = JsMath.pow(Math.max(0.0, 1 - r * r), a)
            p.x[i] = x; p.y[i] = sign * amp * e - smile * hw * (r * r - .35)
        }
        return p
    }

    /** `'M' + pts.map(f(x) + ' ' + f(y)).join('L') + (close ? 'Z' : '')` over [a] then [b] (reversed when [revB]). */
    private fun path(a: Pts, b: Pts? = null, revB: Boolean = false, close: Boolean = false): String {
        val sb = StringBuilder(24 * (a.x.size + (b?.x?.size ?: 0))); var first = true
        fun pt(x: Double, y: Double) { sb.append(if (first) 'M' else 'L'); first = false; JsMath.appendF(sb, x).append(' '); JsMath.appendF(sb, y) }
        for (i in a.x.indices) pt(a.x[i], a.y[i])
        if (b != null) for (j in b.x.indices) { val i = if (revB) b.x.size - 1 - j else j; pt(b.x[i], b.y[i]) }
        if (close) sb.append('Z')
        return sb.toString()
    }

    /** Builds "M1 2Q3 4 5 6…" from (command, numbers) where each number is f()-rounded unless passed through [raw]. */
    private class D { val sb = StringBuilder(96)
        fun c(cmd: Char) = apply { sb.append(cmd) }
        fun n(v: Double) = apply { if (sb.isNotEmpty() && sb.last().let { it.isDigit() || it == '.' }) sb.append(' '); JsMath.appendF(sb, v) }
        fun raw(v: Double) = apply { if (sb.isNotEmpty() && sb.last().let { it.isDigit() || it == '.' }) sb.append(' '); sb.append(JsMath.str(v)) }
        fun z() = apply { sb.append('Z') }
        fun shape() = PaintShape.Path(sb.toString())
    }

    // ---------- face.js ----------
    private fun eye(R: RigDef.FaceRig, e: RigDef.Eye, st: FaceState): List<PaintOp> {
        val o = ArrayList<PaintOp>(12); val white = def.eyeWhite
        val b = JsMath.clamp(R.rest + (1 - R.rest) * st.blink, 0.0, 1.0); val k = 1 - 1.9 * b // lid edge: 1 = open · −0.9 = closed (curved down)
        val rx2 = e.rx + 2.5; val ry2 = e.ry + 2
        val lid = arc(e.cx, e.cy, rx2, ry2, -1.0, k); val top = arc(e.cx, e.cy, rx2, ry2, -1.0, 1.3)
        val ir = e.ry * R.iris * (if (R.hl) 1.05 else 1.6); val ix = e.cx + st.lookX * e.rx * 0.38; val iy = e.cy + st.lookY * e.ry * 0.3 + (if (R.hl) 0.0 else e.ry * 0.12)
        val ball = PaintShape.Ellipse(e.cx, e.cy, e.rx, e.ry)
        o.add(PaintOp.Fill(ball, white, 1.0)); o.add(PaintOp.Save); o.add(PaintOp.Clip(listOf(ball)))
        o.add(PaintOp.Fill(circle(ix, iy, ir), R.ink, 1.0))
        if (R.hl) { o.add(PaintOp.Fill(circle(ix - ir * .34, iy - ir * .38, ir * .3), white, 1.0)); o.add(PaintOp.Fill(circle(ix + ir * .36, iy + ir * .3, ir * .12), white, 1.0)) }
        o.add(PaintOp.Restore)
        o.add(PaintOp.Fill(PaintShape.Path(path(top, lid, revB = true, close = true)), R.skin, 1.0)) // upper lid (skin) over the top of the eye
        if (b > .02) o.add(PaintOp.Fill(PaintShape.Path(path(arc(e.cx, e.cy, rx2, ry2, 1.0, 1.0), arc(e.cx, e.cy, rx2, ry2, 1.0, 1.12), revB = true, close = true)), R.skin, 1.0))
        o.add(PaintOp.Stroke(PaintShape.Path(path(lid)), R.ink, R.lw, ROUND, ROUND, 1.0))
        if (R.flick) { // lash flick curling outwards (Ama)
            val qi = if (e.side > 0) lid.x.size - 1 else 0; val qx = lid.x[qi]; val qy = lid.y[qi]; val s = e.side
            val d = D().c('M').n(qx - s * 4).n(qy - 2).c('Q').n(qx + s * 6).n(qy - 3).n(qx + s * 10).n(qy - 11 + 6 * b).shape()
            o.add(PaintOp.Stroke(d, R.ink, R.lw * .7, ROUND, MITER, 1.0))
        }
        return o
    }
    private fun circle(cx: Double, cy: Double, r: Double): PaintShape { val rr = JsMath.f(r); return PaintShape.Ellipse(JsMath.f(cx), JsMath.f(cy), rr, rr) }

    private fun brow(R: RigDef.FaceRig, w: RigDef.Brow, st: FaceState, o: MutableList<PaintOp>) {
        val dy = -st.brow * 9; val ki = st.knit * 6 // raise the whole brow · knit: inner end up
        val ix = w.ix; val iy = w.iy + dy - ki; val px = w.px; val py = w.py + dy - ki * .4; val ox = w.ox; val oy = w.oy + dy * .8; val t = w.th
        val d = D().c('M').n(ix).n(iy - t * .45).c('Q').n(px).n(py - t * .75).n(ox).n(oy - t * (if (R.flick) .05 else .4))
        if (!R.flick) d.c('L').n(ox).n(oy + t * .35)
        d.c('Q').n(px).n(py + t * .55).n(ix).n(iy + t * .5).z()
        val s = d.shape()
        o.add(PaintOp.Fill(s, R.ink, 1.0)); o.add(PaintOp.Stroke(s, R.ink, if (R.flick) 1.0 else 4.0, BUTT, ROUND, 1.0))
    }

    private fun stache(R: RigDef.FaceRig, m: RigDef.Stache, st: FaceState): List<PaintOp> { // Carlos: two round wings, lifted with the upper lip
        val x = m.cx; val y = m.cy - st.open * 4; val w = m.w; val h = m.h
        val d = D().c('M').raw(x).n(y - h * .45)
            .c('C').n(x - w * .3).n(y - h * 1.15).n(x - w * .85).n(y - h * .8).n(x - w).n(y + h * .55)
            .c('C').n(x - w * .7).n(y + h * .35).n(x - w * .35).n(y + h * .85).raw(x).n(y + h * .35)
            .c('C').n(x + w * .35).n(y + h * .85).n(x + w * .7).n(y + h * .35).n(x + w).n(y + h * .55)
            .c('C').n(x + w * .85).n(y - h * .8).n(x + w * .3).n(y - h * 1.15).raw(x).n(y - h * .45).z()
        return listOf(PaintOp.Fill(d.shape(), R.ink, 1.0))
    }

    // ---------- mouths.js svg() ----------
    private fun mouth(who: String, R: RigDef.FaceRig, p: MouthParams): List<PaintOp> {
        val S = def.style(who); val o = ArrayList<PaintOp>(16)
        o.add(PaintOp.Save); o.add(PaintOp.Translate(R.mouthX, R.mouthY))
        val hw = S.hw * p.w; val sm = p.s * .32; val upK = S.up; val open = p.u + p.d > .02
        val top = curve(hw, p.u * S.hw * upK, p.a, sm, -1.0); val bot = curve(hw, (p.d + p.u * (1 - upK)) * S.hw, p.a, sm, 1.0) // part hidden by the moustache moves down
        val lipD = S.lipD * p.lip; val lipU = S.lipU * p.lip
        if (open) {
            if ((lipU != 0.0 || lipD != 0.0) && !S.outline) { // outer lips
                val ow = hw + 3 * p.lip
                val outTop = curve(ow, p.u * S.hw * upK + lipU, Math.min(p.a, .8), sm, -1.0); val outBot = curve(ow, p.d * S.hw + lipD, Math.min(p.a, .8), sm, 1.0)
                o.add(PaintOp.Fill(PaintShape.Path(path(outTop, outBot, revB = true, close = true)), S.lip, 1.0))
            }
            val hole = PaintShape.Path(path(top, bot, revB = true, close = true))
            var ytop = Double.POSITIVE_INFINITY; for (y in top.y) if (y < ytop) ytop = y
            var ybot = Double.NEGATIVE_INFINITY; for (y in bot.y) if (y > ybot) ybot = y
            val H = ybot - ytop
            o.add(PaintOp.Fill(hole, S.inner, 1.0)); o.add(PaintOp.Save); o.add(PaintOp.Clip(listOf(hole)))
            if (p.tg > .01) { // tongue: oval from the bottom, tu → curls up to the upper teeth (L)
                val tw = hw * .62; val th = H * p.tg; val cy = ybot - th / 2 + 2 - p.tu * H * .18
                o.add(PaintOp.Fill(PaintShape.Ellipse(0.0, JsMath.f(cy + th * .25), JsMath.f(tw), JsMath.f(th * .8 + p.tu * H * .2)), S.tongueSh, 1.0))
                o.add(PaintOp.Fill(PaintShape.Ellipse(0.0, JsMath.f(cy + th * .35), JsMath.f(tw * .88), JsMath.f(th * .7 + p.tu * H * .16)), S.tongue, 1.0))
            }
            if (p.tt > .01) o.add(PaintOp.Fill(PaintShape.Rect(JsMath.f(-hw), JsMath.f(ytop - 2), JsMath.f(2 * hw), JsMath.f(2 + Math.max(2.5, H * (if (p.bite != 0.0) 1.1 else p.tt * .55)))), S.teeth, 1.0))
            if (p.tb > .01) o.add(PaintOp.Fill(PaintShape.Rect(JsMath.f(-hw), JsMath.f(ybot - Math.max(2.5, H * p.tb * .55)), JsMath.f(2 * hw), JsMath.f(H)), S.teeth, 1.0))
            o.add(PaintOp.Restore)
            if (p.bite > .01) { // F/V: upper teeth edge over the lower lip
                val bw = hw * .66; val by = ybot + 3 * p.bite
                val d = D().c('M').n(-bw).n(ytop + 1).c('L').n(bw).n(ytop + 1).c('L').n(bw * .94).n(by - 2).c('Q').raw(0.0).n(by + 2.5).n(-bw * .94).n(by - 2).z()
                o.add(PaintOp.Fill(d.shape(), S.teeth, 1.0))
            }
            o.add(if (S.outline) PaintOp.Stroke(hole, S.line, S.lw, BUTT, ROUND, 1.0) else PaintOp.Stroke(PaintShape.Path(path(top)), S.line, S.lw * .7, ROUND, MITER, OPEN_LINE_ALPHA))
        } else {
            val ln = curve(hw, 0.0, 1.0, sm, 1.0) // closed: mouth line + lower lip (Ama) / line only (Carlos); A = pressed → upper lip band
            if (S.lipD != 0.0) o.add(PaintOp.Fill(PaintShape.Path(path(ln, curve(hw * .86, lipD, .6, sm, 1.0), revB = true, close = true)), S.lip, 1.0))
            if (lipU != 0.0 && p.lip > 1.2) o.add(PaintOp.Fill(PaintShape.Path(path(ln, curve(hw * .86, lipU, .6, sm, -1.0), revB = true, close = true)), S.lipHi, 1.0))
            o.add(PaintOp.Stroke(PaintShape.Path(path(ln)), S.line, S.lw * (if (p.lip > 1.2) 1.25 else 1.0), ROUND, ROUND, 1.0))
            if (S.outline && S.lipD != 0.0) o.add(PaintOp.Stroke(PaintShape.Path(path(curve(hw * .86, lipD, .6, sm, 1.0))), S.line, S.lw, ROUND, MITER, 1.0))
        }
        o.add(PaintOp.Restore)
        return o
    }

    private companion object {
        const val ARC_N = 16 // face.js arc() points per eye arc
        const val OPEN_LINE_ALPHA = .55 // mouths.js open upper-lip line opacity
        // SVG defaults LipPaint.compile applies (stroke-linecap butt, stroke-linejoin miter)
        const val ROUND = "round"; const val BUTT = "butt"; const val MITER = "miter"
    }
}
