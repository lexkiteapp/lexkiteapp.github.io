package com.lexkite.app.core

import java.util.Calendar
import java.util.TimeZone
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/** FSRS-5 – port of web/js/core.js SRS.review, verified against native/shared/gen/vectors/scoring.json. Never tune here. */
data class SRSCard(
    val ef: Double = 2.5, val interval: Int = 0, val reps: Int = 0, val lapses: Int = 0, val step: Int = 0,
    val due: Long, val last: Long? = null, val S: Double? = null, val D: Double? = null,
)

data class SRSParams(val W: List<Double>, val DECAY: Double, val FACTOR: Double, val MAX_IVL: Int, val retentionTarget: Double, val dayRolloverHour: Int) {
    companion object {
        val FSRS5 = SRSParams(
            listOf(0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621),
            -0.5, 19.0 / 81.0, 3650, 0.9, 4,
        )
    }
}

class SRS(val p: SRSParams = SRSParams.FSRS5, private val tz: TimeZone = TimeZone.getDefault()) {
    private val W = p.W
    private fun clampD(d: Double) = min(10.0, max(1.0, d))
    private fun R(t: Double, S: Double) = (1 + p.FACTOR * t / S).pow(p.DECAY)
    private fun ivl(S: Double, r: Double) = S / p.FACTOR * (r.pow(1 / p.DECAY) - 1)
    private fun D0(G: Int) = clampD(W[4] - exp(W[5] * (G - 1)) + 1)
    private fun nextD(D: Double, G: Int): Double { val d1 = D + (-W[6] * (G - 3)) * (10 - D) / 9; return clampD(W[7] * D0(4) + (1 - W[7]) * d1) }
    private fun recallS(D: Double, S: Double, R: Double, G: Int) =
        S * (exp(W[8]) * (11 - D) * S.pow(-W[9]) * (exp(W[10] * (1 - R)) - 1) * (if (G == 2) W[15] else 1.0) * (if (G == 4) W[16] else 1.0) + 1)
    private fun forgetS(D: Double, S: Double, R: Double) = min(S, W[11] * D.pow(-W[12]) * ((S + 1).pow(W[13]) - 1) * exp(W[14] * (1 - R)))
    private fun shortS(S: Double, G: Int) = S * exp(W[17] * (G - 3 + W[18]))

    /** grade: 0 Again · 1 Hard · 2 Good · 3 Easy; `now` in ms. No fuzz. */
    fun review(card: SRSCard, grade: Int, now: Long): SRSCard {
        var s = card
        if ((s.S == null || s.D == null) && s.reps > 0) s = s.copy(S = max(0.5, (if (s.interval == 0) 1 else s.interval).toDouble()), D = clampD(10 - (s.ef - 1.3) * 5))
        val G = grade + 1; val r = p.retentionTarget
        fun toDay(x: SRSCard, days: Int): SRSCard {
            val iv = min(p.MAX_IVL, max(1, days))
            val c = Calendar.getInstance(tz).apply { timeInMillis = now; set(Calendar.HOUR_OF_DAY, p.dayRolloverHour); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }
            return x.copy(interval = iv, due = c.timeInMillis + iv * DAY)
        }
        if (s.reps == 0) {
            if (s.S == null) s = s.copy(S = W[G - 1], D = D0(G))
            else if (s.last != null) s = s.copy(S = max(0.1, shortS(s.S!!, G)), D = nextD(s.D!!, G))
            s = when {
                grade == 0 -> s.copy(step = 0, due = now + MIN)
                grade == 1 -> s.copy(due = now + (if (s.step == 0) 6 else 10) * MIN)
                grade == 2 && s.step == 0 -> s.copy(step = 1, due = now + 10 * MIN)
                else -> toDay(s.copy(reps = 1, step = 0), max(if (grade == 3) 2 else 1, jsRound(ivl(s.S!!, r)).toInt()))
            }
        } else if (grade == 0) {
            val t = max(0.0, (now - (s.last ?: now)).toDouble() / DAY)
            s = s.copy(S = max(0.1, forgetS(s.D!!, s.S!!, R(t, s.S!!))), D = nextD(s.D!!, G), lapses = s.lapses + 1, reps = 0, step = 0, interval = 0, due = now + MIN)
        } else {
            val t = max(0.0, (now - (s.last ?: now)).toDouble() / DAY); val Rn = R(t, s.S!!)
            val S = mutableMapOf<Int, Double>(); val iv = mutableMapOf<Int, Int>()
            for (g in 2..4) { S[g] = recallS(s.D!!, s.S!!, Rn, g); iv[g] = min(p.MAX_IVL, max(1, jsRound(ivl(S[g]!!, r)).toInt())) }
            iv[2] = min(iv[2]!!, iv[3]!!); iv[3] = max(iv[3]!!, iv[2]!! + 1); iv[4] = max(iv[4]!!, iv[3]!! + 1)
            s = toDay(s.copy(S = S[G], D = nextD(s.D!!, G), reps = s.reps + 1), iv[G]!!)
        }
        return s.copy(S = jsRound(s.S!! * 1000) / 1000, D = jsRound(s.D!! * 1000) / 1000, last = now)
    }

    companion object {
        const val MIN = 60_000L
        const val DAY = 86_400_000L
        /** JS Math.round: half rounds up (towards +∞). */
        fun jsRound(x: Double) = floor(x + 0.5)
    }
}
