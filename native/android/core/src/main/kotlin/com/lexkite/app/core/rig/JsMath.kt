package com.lexkite.app.core.rig

/**
 * JS number semantics the rig port needs to match the web within 2e-6: V8's Math.sin/cos/exp/log/pow are fdlibm (= java.lang.StrictMath),
 * `Math.round` rounds .5 up (also for negatives), and mulberry32 is int32 arithmetic.
 */
internal object JsMath {
    fun sin(x: Double) = StrictMath.sin(x)
    fun cos(x: Double) = StrictMath.cos(x)
    fun exp(x: Double) = StrictMath.exp(x)
    fun log(x: Double) = StrictMath.log(x)
    fun pow(x: Double, y: Double) = StrictMath.pow(x, y)
    fun clamp(x: Double, a: Double, b: Double) = Math.min(b, Math.max(a, x))

    /** `Math.round(x)` (exact: x − floor(x) is representable). */
    fun round(x: Double): Double { val r = Math.floor(x); return if (x - r >= 0.5) r + 1 else r }

    /** face.js / mouths.js `f(n) = Math.round(n * 10) / 10`. */
    fun f(n: Double) = round(n * 10) / 10

    /** `String(f(n))` – appended without allocating a temporary string per number. */
    fun appendF(sb: StringBuilder, n: Double): StringBuilder {
        val m = round(n * 10).toLong()
        if (m < 0) sb.append('-')
        val a = Math.abs(m)
        sb.append(a / 10)
        if (a % 10 != 0L) sb.append('.').append(a % 10)
        return sb
    }

    /** `String(n)` for a raw JS number (template literal of an unrounded rig value). */
    fun str(n: Double): String = com.lexkite.app.core.sync.Js.numStr(n)

    /** `s >>> 0` style seed: ToInt32 of an integral JS number. */
    fun toInt32(n: Long): Int = n.toInt()

    /** mulberry32 (face.js `rng`) – same stream as the web for the same seed. */
    class Mulberry32(seed: Int) {
        private var s = seed
        fun next(): Double {
            s += 0x6D2B79F5
            var t = (s xor (s ushr 15)) * (1 or s)
            t = (t + (t xor (t ushr 7)) * (61 or t)) xor t
            return ((t xor (t ushr 14)).toLong() and 0xFFFFFFFFL).toDouble() / 4294967296.0
        }
    }
}
