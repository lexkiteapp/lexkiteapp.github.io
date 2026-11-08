package com.lexkite.app.core.rig

/**
 * Face state at one instant (LipFace `at(t)` result, then adjusted by [RigMachine.step]): everything [FacePaint.parts] draws.
 * Mutable on purpose – the rig machine edits it in place like the web object.
 */
class FaceState(
    var mouth: MouthParams,
    var shape: String = "X",
    var gain: Double = 1.0,
    var open: Double = 0.0,
    var blink: Double = 0.0,
    var lookX: Double = 0.0,
    var lookY: Double = 0.0,
    var brow: Double = 0.0,
    var knit: Double = 0.0,
    var tilt: Double = 0.0,
    var nod: Double = 0.0,
    var talk: Double = 0.0,
)

/**
 * Port of web/js/call/face.js `machine(who, o)`: parallel layers as pure functions of t + seed – mouth (cues × loudness gain), blinks (mulberry32 schedule,
 * double blinks), saccades in silences, brow pulses on accents / question end, head tilt + nod from speaking energy. Rig numbers come from [RigDef.face].
 */
class LipFace(
    private val def: RigDef, who: String,
    cues: List<Cue>? = null, env: DoubleArray? = null, dur: Double = 3.0, emo: String? = null, seed: Long = 7, text: String? = null,
    private val calm: Boolean = false,
) {
    private val R = def.face(who)
    private val T = R.temper
    private val E: RigDef.Emo? = emo?.let { def.faceEmo[it] }
    private val ls = def.lipSync
    private val cues: List<Cue> = cues ?: listOf(Cue(0.0, dur, "X"))
    private val env: DoubleArray? = env?.takeIf { it.isNotEmpty() } // an empty envelope carries no loudness (web would yield NaN gain)
    private val G = this.env?.let { ls.gain(it) }
    private val von: BooleanArray? = this.env?.let { e -> val pk = LipSync.peak(e); BooleanArray(e.size) { e[it] > pk * VOICE_THR } }
    val blinks: DoubleArray
    val accents: DoubleArray
    private val saccT: DoubleArray; private val saccX: DoubleArray; private val saccY: DoubleArray
    private val ph: Double

    init {
        val r = JsMath.Mulberry32(JsMath.toInt32(seed))
        val b = ArrayList<Double>()
        var t = 1 + r.next() * BLINK_FIRST
        while (t < dur + TAIL) { b.add(t); if (r.next() < T.dbl) { t += DOUBLE_GAP; b.add(t) }; t += T.blinkA + r.next() * T.blinkB }
        blinks = b.toDoubleArray()
        val acc = ArrayList<Double>()
        val e = this.env
        if (e != null) { val pk = LipSync.peak(e); var q = 99; for (i in e.indices) { if (e[i] > pk * VOICE_THR) { if (q >= ACC_SILENCE) acc.add(i / HZ); q = 0 } else q++ } }
        if (QUESTION.containsMatchIn(text ?: "")) { this.cues.lastOrNull { it.value != "X" }?.let { acc.add(Math.max(0.0, it.start - Q_EARLY)) } }
        accents = acc.toDoubleArray()
        val st = arrayListOf(0.0); val sx = arrayListOf(R.lookX); val sy = arrayListOf(R.lookY)
        val lk0 = E?.look?.get(0) ?: R.lookX; val lk1 = E?.look?.get(1) ?: R.lookY
        t = 1 + r.next() * SACC_FIRST
        while (!calm && t < dur + TAIL) {
            if (!voiced(t)) { st.add(t); sx.add(lk0 + (r.next() - .5) * .5); sy.add(lk1 + (r.next() - .5) * .25) }
            t += T.saccA + r.next() * T.saccB
        }
        saccT = st.toDoubleArray(); saccX = sx.toDoubleArray(); saccY = sy.toDoubleArray()
        ph = r.next() * 6
    }

    private fun voiced(t: Double): Boolean {
        val v = von ?: return ls.stateAt(cues, t).b != "X"
        return v[JsMath.clamp(JsMath.round(t * HZ), 0.0, (v.size - 1).toDouble()).toInt()]
    }
    private fun ease(x: Double) = x * x * (3 - 2 * x)
    private fun blinkAt(t: Double): Double {
        var v = 0.0
        for (b in blinks) { val d = t - b; if (d >= 0 && d < .15) v = Math.max(v, if (d < .06) ease(d / .06) else if (d < .08) 1.0 else 1 - ease((d - .08) / .07)) }
        return v
    }
    private fun pulse(t: Double, w: Double): Double {
        var v = 0.0
        for (a in accents) { val d = t - a + .04; if (d > 0 && d < w) v = Math.max(v, JsMath.sin(Math.PI * d / w)) }
        return v
    }
    private fun talk(t: Double): Double { var s = 0; var k = -30; while (k <= 0) { if (voiced(t + k / HZ)) s++; k += 3 }; return s / 11.0 }

    /** State at time t (s). Allocates one [FaceState] + [MouthParams]. */
    fun at(t: Double): FaceState {
        val s = ls.stateAt(cues, t)
        val p = MouthParams.mix(def.shape(s.a), def.shape(s.b), s.k)
        val gn = G?.at(t) ?: 1.0
        val open = p.u + p.d > .02
        if (open) { p.u *= gn; p.d *= gn; p.w *= .9 + .1 * Math.min(1.0, gn) }
        val E = E
        if (E != null && E.smile != 0.0) p.s = JsMath.clamp(p.s + E.smile * (if (open) .5 else 1.0), -.3, .9)
        val sp = talk(t)
        val acc = pulse(t, .45)
        // lookAt(t)
        var i = 0; while (i < saccT.size - 1 && saccT[i + 1] <= t) i++
        val a = Math.max(0, i - 1)
        val k = if (i != 0) ease(JsMath.clamp((t - saccT[i]) / .07, 0.0, 1.0)) else 1.0
        val tx = if (voiced(t)) R.lookX * .8 else saccX[i]
        val nodE = if (E != null && E.nodHz != 0.0) E.nodPx * Math.max(0.0, JsMath.sin(t * Math.PI * 2 * E.nodHz + ph)) else 0.0
        return FaceState(
            mouth = p, shape = if (s.k >= .5) s.b else s.a, gain = gn, open = if (open) Math.min(1.0, (p.u + p.d) / .9) else 0.0, blink = blinkAt(t),
            lookX = saccX[a] + (tx - saccX[a]) * k, lookY = saccY[a] + (saccY[i] - saccY[a]) * k,
            brow = JsMath.clamp((E?.brow ?: 0.0) + acc * T.brow, -.3, 1.0), knit = E?.knit ?: 0.0,
            tilt = if (calm) 0.0 else (E?.tilt ?: 0.0) * .6 + sp * T.tilt * (.9 * JsMath.sin(t * 1.7 + ph) + .4 * JsMath.sin(t * 3.1 + ph * 2)),
            nod = if (calm) 0.0 else acc * T.nod * sp + nodE, talk = sp,
        )
    }

    private companion object {
        // face.js machine() code constants (lines 81–97)
        const val HZ = 100.0
        const val VOICE_THR = .1      // voiced = env > 10 % of peak
        const val BLINK_FIRST = 1.6   // first blink 1 + r·1.6 s
        const val DOUBLE_GAP = .26    // double blink spacing
        const val TAIL = 6.0          // schedules run to dur + 6 s
        const val ACC_SILENCE = 15    // accent = voice after ≥ 150 ms silence
        const val Q_EARLY = .25       // question brow lift before the last open shape
        const val SACC_FIRST = 1.5
        val QUESTION = Regex("\\?\\s*$")
    }
}
