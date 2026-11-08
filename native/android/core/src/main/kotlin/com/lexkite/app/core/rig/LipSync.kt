package com.lexkite.app.core.rig

/** One mouth cue (lipsync.js `{start, end, value}`); start/end are mutable like the JS objects the smoothing passes edit. */
class Cue(var start: Double, var end: Double, val value: String) {
    fun copy() = Cue(start, end, value)
    override fun toString() = "[$start,$end,$value]"
}

/** `units(text)` element: viseme [v], duration weight [w], word index [wi] (−1 = punctuation gap), char index [ci], [gap]. */
class LipUnit(val v: String, val w: Double, val wi: Int, val ci: Int, val gap: Boolean)

/** `stateAt(cues, t)`: previous shape [a] blending into current [b] by [k] (0..1), cue index [i]. */
class LipState(val a: String, val b: String, val k: Double, val i: Int)

/** `unpack(entry)` result: duration (s), cues, loudness envelope (100 Hz, 0..1) or null. */
class Unpacked(val dur: Double, val cues: List<Cue>, val env: DoubleArray?)

/**
 * Port of web/js/call/lipsync.js (pure functions). Constants (viseme table, BLEND, MIN_HOLD, LEAD, LEADS, gain range, ELV, EMIN) come from rig.json `lip`;
 * the remaining numbers are the algorithm's own code constants (commented with their JS origin).
 * The JS module-global dictionary (`setDict`) is an explicit [dict] argument here (null = no dictionary, letter rules only).
 */
class LipSync(private val lip: RigDef.Lip) {
    val blend = lip.blend
    val minHold = lip.minHold
    val lead = lip.lead

    // ---------- text → phonemes → visemes ----------
    private fun vOf(p: String) = lip.arpabet[p.replaceFirst(DIGIT, "")] ?: lip.fallback
    private fun isV(p: String) = p.isNotEmpty() && p[0] in "AEIOU"

    fun units(text: String, dict: Map<String, String>? = null): List<LipUnit> {
        val out = ArrayList<LipUnit>(); var wi = 0
        for (m in TOKEN.findAll(text)) {
            val w = m.value; val ci = m.range.first
            if (w.length == 1 && w[0] in ",.;:!?") { out.add(LipUnit("X", if (w[0] in ",;:") GAP_SHORT else GAP_LONG, -1, ci, true)); continue }
            val ph = (dict?.get(w.lowercase()) ?: "").split(' ').filter { it.isNotEmpty() }
            for (p in ph.ifEmpty { g2p(w) }) {
                val wt = if (isV(p)) (if ('1' in p) W_STRESSED else W_VOWEL) else if (p.length == 1 && p[0] in "PTKBDG") W_STOP else W_CONS
                out.add(LipUnit(vOf(p), wt, wi, ci, false))
            }
            wi++
        }
        return out
    }

    /** Text + duration → Rhubarb-like cues (silence at both ends). lipsync.js fromText (defaults lead .05, tail .12). */
    fun fromText(text: String, dur: Double, dict: Map<String, String>? = null, leadIn: Double = 0.05, tail: Double = 0.12): List<Cue> {
        val U = units(text, dict); var tot = 0.0; for (u in U) tot += u.w; if (tot == 0.0) tot = 1.0
        val k = Math.max(0.05, dur - leadIn - tail) / tot; var t = leadIn
        val cues = arrayListOf(Cue(0.0, leadIn, "X"))
        for (u in U) { cues.add(Cue(t, t + u.w * k, u.v)); t += u.w * k }
        cues.add(Cue(t, Math.max(t, dur), "X"))
        return smooth(cues)
    }

    /** Merge equal neighbours and swallow slivers < MIN_HOLD into the previous cue. */
    fun smooth(cues: List<Cue>): MutableList<Cue> {
        val out = ArrayList<Cue>()
        for (c in cues) {
            val p = out.lastOrNull()
            if (p != null && (p.value == c.value || c.end - c.start < minHold)) { p.end = c.end; continue }
            out.add(c.copy())
        }
        if (out.size > 1 && out[0].end - out[0].start < minHold) { out[1].start = 0.0; out.removeAt(0) }
        return out
    }

    /** Per-shape lead (M/B/P, F/V, W/OO arrive before the sound), previous cue keeps ≥ MIN_HOLD. */
    fun leads(cues: List<Cue>): MutableList<Cue> {
        val out = cues.mapTo(ArrayList()) { it.copy() }
        for (i in 1 until out.size) {
            val d = (lip.leads[out[i].value]?.takeIf { it != 0.0 } ?: lead) - lead; if (d <= 0) continue
            val t = Math.max(out[i - 1].start + minHold, out[i].start - d)
            if (t < out[i].start) { out[i].start = t; out[i - 1].end = t }
        }
        return out
    }

    /** lipsync.js align (CI refinement: snap silence↔speech edges to the real envelope). No word timings (`o.words`) on device. */
    fun align(cues: List<Cue>, env: DoubleArray): MutableList<Cue> {
        val hz = HZ; val thr = peak(env) * ALIGN_THR; val n = env.size
        fun on(i: Int) = i in 0 until n && env[i] > thr
        fun at(t: Double) = Math.max(0, Math.min(n - 1, JsMath.round(t * hz).toInt()))
        fun edge(t: Double, dir: Int): Double {
            var k = at(t)
            if (on(k)) {
                if (dir > 0) { while (k > at(t - ALIGN_WIN) && on(k - 1)) k--; return k / hz }
                while (k < at(t + ALIGN_WIN) && on(k + 1)) k++; return (k + 1) / hz
            }
            if (dir > 0) { val e = at(t + ALIGN_FAR); while (k < e && !on(k)) k++; return if (on(k)) k / hz else t }
            val e = at(t - ALIGN_FAR); while (k > e && !on(k)) k--; return if (on(k)) (k + 1) / hz else t
        }
        var out: MutableList<Cue> = cues.mapTo(ArrayList()) { it.copy() }
        var first = -1; for (i in 0 until n) if (on(i)) { first = i; break }
        var last = n - 1; while (last > 0 && !on(last)) last--
        var k = first + 1
        while (first >= 0 && k < last) {
            if (on(k)) { k++; continue }
            var e = k; while (e < last && !on(e)) e++
            val a = k / hz; val b = e / hz; k = e
            if (b - a < ALIGN_GAP) { k++; continue }
            val nx = ArrayList<Cue>()
            for (c in out) {
                if (c.end <= a || c.start >= b || c.value == "X") { nx.add(c); continue }
                if (c.start < a) nx.add(Cue(c.start, a, c.value))
                if (nx.none { it.value == "X" && it.start == a }) nx.add(Cue(a, b, "X"))
                if (c.end > b) nx.add(Cue(b, c.end, c.value))
            }
            val A = nx.sortedBy { it.start } // stable, like V8's sort
            out = A.filterIndexedTo(ArrayList()) { i, c ->
                // JS: !(c.X && A[i-1].X && (A[i-1].end = max(…))) – the assignment's value is the truthiness test
                !(c.value == "X" && i > 0 && A[i - 1].value == "X" && run { A[i - 1].end = Math.max(A[i - 1].end, c.end); A[i - 1].end != 0.0 })
            }
            k++
        }
        for (i in 1 until out.size) {
            val p = out[i - 1]; val c = out[i]
            val dir = if (p.value == "X" && c.value != "X") 1 else if (p.value != "X" && c.value == "X") -1 else 0
            if (dir == 0) continue
            var t = edge(c.start, dir)
            t = Math.max(p.start + 0.01, Math.min(c.end - 0.01, t)); c.start = t; p.end = t
        }
        return out
    }

    /** Text aligned to the real loudness envelope (DP segmentation) – sentences without CI cues but with audio. lipsync.js fromEnv. */
    fun fromEnv(text: String, dur: Double, env: DoubleArray, dict: Map<String, String>? = null): List<Cue> {
        val T = env.size; val pk = peak(env)
        val e = DoubleArray(T) { Math.sqrt(Math.min(1.0, env[it] / pk)) }
        val S1 = DoubleArray(T + 1); val S2 = DoubleArray(T + 1)
        for (i in 0 until T) { S1[i + 1] = S1[i] + e[i]; S2[i + 1] = S2[i] + e[i] * e[i] }
        fun seg(a: Int, b: Int, l: Double) = S2[b] - S2[a] - 2 * l * (S1[b] - S1[a]) + (b - a) * l * l
        class St(val v: String, val w: Double, val opt: Boolean)
        val st = arrayListOf(St("X", 0.0, true)); var pw: Int? = null
        for (u in units(text, dict)) {
            if (u.gap) { if (!st.last().opt) st.add(St("X", 0.0, true)); continue }
            if (pw != null && u.wi != pw && !st.last().opt) st.add(St("X", 0.0, true))
            st.add(St(u.v, u.w, false)); pw = u.wi
        }
        if (!st.last().opt) st.add(St("X", 0.0, true))
        var tw = 0.0; for (x in st) tw += x.w
        var voiced = 0; for (x in e) if (x > DP_VOICED) voiced++
        if (T == 0 || tw == 0.0) return fromText(text, dur, dict)
        val k = Math.max(2, voiced) / tw; val N = st.size
        val dp = Array(N + 1) { DoubleArray(T + 1) { INF } }; val bk = Array(N + 1) { IntArray(T + 1) }
        dp[0][0] = 0.0
        for (i in 1..N) {
            val s = st[i - 1]; val l = lip.elv[s.v] ?: DP_ELV_DEFAULT; val ex = if (s.w != 0.0) s.w * k else 0.0
            val dmin = if (s.opt) 0 else (lip.emin[s.v]?.takeIf { it != 0 } ?: 1)
            val dmax = if (s.opt) DP_SIL_MAX else Math.max(dmin + 2, Math.ceil(ex * DP_SPAN).toInt() + 2)
            val prev = dp[i - 1]
            for (t in 0..T) {
                var best = INF; var bd = 0
                for (d in dmin..Math.min(dmax, t)) {
                    val p = prev[t - d]; if (p >= INF) continue
                    val c = p + seg(t - d, t, l) + (if (s.opt) (if (d != 0) DP_SIL_COST else 0.0) else { val g = JsMath.log(d / ex); DP_DUR_COST * (g * g) })
                    if (c < best) { best = c; bd = d }
                }
                dp[i][t] = best; bk[i][t] = bd
            }
        }
        if (dp[N][T] >= INF) return fromText(text, dur, dict)
        val cues = ArrayList<Cue>(); var t = T
        for (i in N downTo 1) { val d = bk[i][t]; if (d != 0) cues.add(0, Cue((t - d) / 100.0, t / 100.0, st[i - 1].v)); t -= d }
        cues[0].start = 0.0; cues[cues.size - 1].end = Math.max(cues[cues.size - 1].end, dur)
        return leads(smooth(align(smooth(cues), env)))
    }

    /** Shape at time t (t += LEAD). Empty cue list → rest. */
    fun stateAt(cues: List<Cue>, time: Double): LipState {
        val t = time + lead; var i = 0; val n = cues.size
        while (i < n - 1 && cues[i + 1].start <= t) i++
        val c = cues.getOrNull(i); val start = c?.start ?: 0.0
        return LipState(if (i > 0) cues[i - 1].value else "X", c?.value ?: "X", Math.min(1.0, Math.max(0.0, (t - start) / blend)), i)
    }

    /** Mouth opening from loudness: env (RMS 100 Hz) → g(t) ∈ [gainMin, gainMax]. lipsync.js gain (smoothing stored as Float32 like the web). */
    inner class Gain(private val env: DoubleArray) {
        private val sm = FloatArray(env.size)
        init {
            val sorted = env.copyOf().also { it.sort() }; val idx = Math.floor(env.size * GAIN_REF_Q).toInt()
            val ref = sorted.getOrNull(idx)?.takeIf { it != 0.0 } ?: 1e-6
            val ka = 1 - JsMath.exp(-1 / (GAIN_ATTACK * HZ)); val kr = 1 - JsMath.exp(-1 / (GAIN_RELEASE * HZ)); var y = 0.0
            for (i in env.indices) { val x = Math.min(GAIN_CAP, env[i] / ref); y += (if (x > y) ka else kr) * (x - y); sm[i] = y.toFloat() }
        }
        fun at(t: Double): Double {
            val i = Math.max(0, Math.min(env.size - 1, JsMath.round((t + lead) * HZ).toInt()))
            val v = sm[i].toDouble()
            return Math.max(lip.gainMin, Math.min(lip.gainMax, lip.gainMin + (lip.gainMax - lip.gainMin) * JsMath.pow(v / GAIN_NORM, GAIN_EXP)))
        }
    }
    fun gain(env: DoubleArray) = Gain(env)

    /** Causal "live" cursor for sentences without cues: advances only while voiced; silence → X. [cues] grows as it plays (lipsync.js live). */
    inner class Live(text: String, dur: Double?, dict: Map<String, String>?, voicedFrac: Double = LIVE_VOICED, ups: Double = LIVE_UPS) {
        private val U = units(text, dict).filter { !it.gap }
        private val tot = U.sumOf { it.w }.let { if (it == 0.0) 1.0 else it }
        private var rate = if (dur != null && dur != 0.0) tot / Math.max(0.3, dur * voicedFrac) else ups
        private var pos = 0.0; private var cur = "X"; private var since = 0.0
        val cues: MutableList<Cue> = arrayListOf(Cue(0.0, 0.0, "X"))
        private fun at(p: Double): LipUnit? { var s = 0.0; for (u in U) { s += u.w; if (s > p) return u }; return null }
        /** t = audio clock (s), voiced = sound this frame, dt = s. Returns the current shape. */
        fun tick(t: Double, voiced: Boolean, dt: Double): String {
            if (voiced) pos += dt * rate
            val u = if (pos < tot) at(pos) else null; val want = if (voiced && u != null) u.v else "X"
            if (want != cur && t - since >= minHold) { cues[cues.size - 1].end = t; cues.add(Cue(t, t, want)); cur = want; since = t }
            cues[cues.size - 1].end = t; return cur
        }
        /** Re-anchor on a word boundary (speech engine char index). */
        fun word(ci: Int) { var s = 0.0; for (u in U) { if (u.ci >= ci) { pos = s; return }; s += u.w } }
        fun setRate(r: Double) { rate = r }
    }
    fun live(text: String, dur: Double?, dict: Map<String, String>? = null) = Live(text, dur, dict)

    companion object {
        private val DIGIT = Regex("\\d")
        private val TOKEN = Regex("[A-Za-z']+|[,.;:!?]")
        private val NON_AZ = Regex("[^a-z]")
        private val DICT_LINE = Regex("([a-z']+) (.+)")
        private val TILDE = Regex("~(\\d+)\\.")
        private val STAR = Regex("([A-Z])([0-9a-z]+)")
        // units(): duration weights (lipsync.js line 40/42)
        private const val GAP_SHORT = 1.6; private const val GAP_LONG = 2.4
        private const val W_STRESSED = 1.35; private const val W_VOWEL = 1.0; private const val W_STOP = 0.5; private const val W_CONS = 0.65
        private const val HZ = 100.0 // envelope rate (cues.js)
        // align() defaults (line 70, 81)
        private const val ALIGN_WIN = 0.15; private const val ALIGN_FAR = 0.5; private const val ALIGN_THR = 0.1; private const val ALIGN_GAP = 0.12
        // fromEnv() DP (lines 197–205)
        private const val INF = 1e18; private const val DP_VOICED = 0.2; private const val DP_ELV_DEFAULT = 0.5; private const val DP_SIL_MAX = 150
        private const val DP_SPAN = 3.5; private const val DP_SIL_COST = 1.5; private const val DP_DUR_COST = 0.6
        // gain() (lines 145–148)
        private const val GAIN_REF_Q = 0.95; private const val GAIN_ATTACK = 0.03; private const val GAIN_RELEASE = 0.12
        private const val GAIN_CAP = 1.3; private const val GAIN_NORM = 1.1; private const val GAIN_EXP = 0.6
        // live() (line 160)
        private const val LIVE_VOICED = 0.82; private const val LIVE_UPS = 9.5

        /** Letter rules → ARPAbet (fallback when a word is not in the dictionary; lipsync.js RULES, first match wins). */
        private val RULES = listOf(
            "tion" to "SH AH N", "ough" to "OW", "igh" to "AY", "ee" to "IY", "ea" to "IY", "oo" to "UW", "ou" to "AW", "ow" to "OW", "oi" to "OY", "ay" to "EY", "ai" to "EY", "au" to "AO",
            "ch" to "CH", "sh" to "SH", "th" to "TH", "ph" to "F", "wh" to "W", "ck" to "K", "ng" to "NG", "qu" to "K W", "er" to "ER", "ar" to "AA R", "or" to "AO R",
            "a" to "AE", "e" to "EH", "i" to "IH", "o" to "AA", "u" to "AH", "y" to "IY", "b" to "B", "c" to "K", "d" to "D", "f" to "F", "g" to "G", "h" to "HH", "j" to "JH",
            "k" to "K", "l" to "L", "m" to "M", "n" to "N", "p" to "P", "r" to "R", "s" to "S", "t" to "T", "v" to "V", "w" to "W", "x" to "K S", "z" to "Z",
        ).map { (k, v) -> k to v.split(' ') }
        /** Compact-dictionary alphabet (cues.js v4 packDict). */
        private const val DA = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&*+-/<=>@^_|~"

        fun g2p(word: String): List<String> {
            var w = word.lowercase().replace(NON_AZ, "")
            if (w.endsWith("e")) w = w.dropLast(1) + (if (word.length > 3) "" else "e")
            val out = ArrayList<String>(); var i = 0
            while (i < w.length) {
                val r = RULES.firstOrNull { w.startsWith(it.first, i) }
                if (r == null) { i++; continue }
                out.addAll(r.second); i += r.first.length
            }
            return out
        }

        /** "word PH ON" lines, or the compact "#P:<phones>" form → { word: "PH ON" } (first entry wins). */
        fun parseDict(txt: String): Map<String, String> {
            val d = HashMap<String, String>(); val L = txt.split('\n').toMutableList()
            val T = if (L[0].startsWith("#P:")) L.removeAt(0).substring(3).split(' ') else null
            for (l in L) {
                val m = DICT_LINE.matchEntire(l) ?: continue
                val w = m.groupValues[1]; if (!d[w].isNullOrEmpty()) continue
                val p = m.groupValues[2]
                d[w] = if (T != null) p.map { T.getOrNull(DA.indexOf(it)) ?: "" }.joinToString(" ") else p
            }
            return d
        }

        /** One LK_CUES entry [ms, cues, env?] → { dur, cues, env }. Cue formats: "X0 B120" absolute ms · "+X0 B24" 5 ms deltas · "*X0Bo" 5 ms base-36 deltas. */
        fun unpack(ms: Double, cues: String, env: String?): Unpacked {
            val dur = ms / 1000; val m = cues.firstOrNull()
            val tk: List<Pair<String, Double>> = if (m == '*') STAR.findAll(cues.substring(1)).map { it.groupValues[1] to it.groupValues[2].toLong(36).toDouble() }.toList()
            else (if (m == '+') cues.substring(1) else cues).split(' ').map { it.take(1) to (it.drop(1).toDoubleOrNull() ?: if (it.length <= 1) 0.0 else Double.NaN) }
            val delta = m == '*' || m == '+'; var t = 0.0
            val out = tk.map { (v, n) -> t = if (delta) t + 5 * n else n; Cue(t / 1000, 0.0, v) }
            out.forEachIndexed { i, c -> c.end = if (i < out.size - 1) out[i + 1].start else dur }
            val e = env?.let { s -> b64(s.replace(TILDE) { "AAAA".repeat(it.groupValues[1].toInt()) }).let { b -> DoubleArray(b.size) { b[it] / 255.0 } } }
            return Unpacked(dur, out, e)
        }

        /** atob → bytes (0..255). Hand-written: java.util.Base64 needs API 26. */
        private fun b64(s: String): IntArray {
            val out = ArrayList<Int>(s.length * 3 / 4); var acc = 0; var bits = 0
            for (ch in s) {
                val v = when (ch) { in 'A'..'Z' -> ch - 'A'; in 'a'..'z' -> ch - 'a' + 26; in '0'..'9' -> ch - '0' + 52; '+' -> 62; '/' -> 63; else -> -1 }
                if (v < 0) continue
                acc = (acc shl 6) or v; bits += 6
                if (bits >= 8) { bits -= 8; out.add((acc shr bits) and 0xFF) }
            }
            return out.toIntArray()
        }

        /** `Math.max(...env, 1e-6)` */
        internal fun peak(env: DoubleArray): Double { var m = 1e-6; for (x in env) if (x > m) m = x; return m }
    }
}
