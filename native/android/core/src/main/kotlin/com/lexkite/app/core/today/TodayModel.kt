package com.lexkite.app.core.today

import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.SyncDoc
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.util.Calendar
import java.util.TimeZone

/** Everything the Today screen shows, derived from the local document only (works offline, same rules as web ux1.js homeBase). */
data class TodaySummary(
    val target: String,          // settings.examTarget ('' → "–" + "Set a goal")
    val streak: Int,             // app.js streak(): stats.days > 0 ∪ game.days[].xp > 0 ∪ game.frozen
    val xp: Long,                // game.xp
    val reviewedToday: Int,      // stats.days[today]
    val dailyGoal: Int,          // settings.dailyGoal || 20
    val due: Int,                // Core.Cards.dueCount().total
    val mistakes: Int,           // Store 'mistakes' not fixed
    val week: List<Day>,         // Monday-first 7-day strip
    val greeting: Greeting,
) {
    val goalPct: Int get() = if (dailyGoal <= 0) 0 else minOf(100, Math.round(reviewedToday * 100f / dailyGoal))
    val weekDone: Int get() = week.count { it.on }
    val reviewMinutes: Int get() = maxOf(1, (due + 5) / 6) // web: Math.max(1, Math.ceil(due / 6))
    enum class Greeting { MORNING, AFTERNOON, EVENING }
    data class Day(val key: String, val on: Boolean, val today: Boolean, val dayOfWeek: Int)
}

object TodayModel {
    /** web todayKey(d): local YYYY-MM-DD. */
    fun dayKey(ms: Long, tz: TimeZone): String { val c = Calendar.getInstance(tz).apply { timeInMillis = ms }; return "%04d-%02d-%02d".format(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH)) }

    fun activeDays(d: SyncDoc): Set<String> {
        val s = HashSet<String>()
        for ((k, v) in Js.entries(Js.prop(d.stats, "days"))) if (Js.num(v) > 0) s.add(k)
        for ((k, v) in Js.entries(Js.prop(d.game, "days"))) if (Js.num(Js.prop(v, "xp")) > 0) s.add(k)
        for (k in Js.entries(Js.prop(d.game, "frozen"))) s.add(k.key)
        return s
    }

    fun streak(active: Set<String>, now: Long, tz: TimeZone): Int {
        val c = Calendar.getInstance(tz).apply { timeInMillis = now }
        fun key() = "%04d-%02d-%02d".format(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH))
        if (key() !in active) c.add(Calendar.DAY_OF_MONTH, -1)
        var n = 0
        while (key() in active) { n++; c.add(Calendar.DAY_OF_MONTH, -1) }
        return n
    }

    /** Core.Cards.dueCount(map, settings, stats).total – due (seen, due ≤ end of today) + new allowance left today. */
    fun dueCount(d: SyncDoc, now: Long, tz: TimeZone): Int {
        val end = Calendar.getInstance(tz).apply { timeInMillis = now; set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) }.timeInMillis + 86_400_000L - 1
        var due = 0; var fresh = 0
        for (c in d.cards.values) {
            val srs = c["srs"]
            val reps = Js.num(Js.prop(srs, "reps")).let { if (it.isNaN()) 0.0 else it }
            val last = Js.prop(srs, "last")
            if (srs == null || (reps == 0.0 && !Js.truthy(last))) { fresh++; continue } // web normalize(): missing srs = SRS.newState()
            if ((reps > 0 || Js.truthy(last)) && Js.num(Js.prop(srs, "due")).let { !it.isNaN() && it <= end }) due++
        }
        val nt = Js.prop(d.stats, "newToday")
        val introduced = if ((Js.prop(nt, "day") as? JsonPrimitive)?.content == dayKey(now, tz)) Js.num(Js.prop(nt, "n")).let { if (it.isNaN()) 0 else it.toInt() } else 0
        val dailyNew = Js.num(Js.or(Js.prop(d.settings, "dailyNew"), null)).let { if (it.isNaN()) 10 else it.toInt() }
        return due + minOf(fresh, maxOf(0, dailyNew - introduced))
    }

    fun compute(d: SyncDoc, mistakes: JsonElement?, now: Long, tz: TimeZone = TimeZone.getDefault()): TodaySummary {
        val today = dayKey(now, tz)
        val active = activeDays(d)
        val goal = Js.num(Js.or(Js.prop(d.settings, "dailyGoal"), JsonPrimitive(20))).let { if (it.isNaN() || it <= 0) 20 else it.toInt() }
        val rv = Js.num(Js.prop(Js.prop(d.stats, "days"), today)).let { if (it.isNaN()) 0 else it.toInt() }
        val mon = Calendar.getInstance(tz).apply { timeInMillis = now; set(Calendar.HOUR_OF_DAY, 12); add(Calendar.DAY_OF_MONTH, -((get(Calendar.DAY_OF_WEEK) + 5) % 7)) }
        val week = List(7) { i ->
            val c = (mon.clone() as Calendar).apply { add(Calendar.DAY_OF_MONTH, i) }
            val k = dayKey(c.timeInMillis, tz)
            TodaySummary.Day(k, k in active, k == today, c.get(Calendar.DAY_OF_WEEK))
        }
        val hour = Calendar.getInstance(tz).apply { timeInMillis = now }.get(Calendar.HOUR_OF_DAY)
        val tg = Js.prop(d.settings, "examTarget")
        return TodaySummary(
            target = if (Js.truthy(tg)) (tg as? JsonPrimitive)?.let { if (it.isString) it.content else Js.numStr(Js.num(it)) } ?: "" else "",
            streak = streak(active, now, tz),
            xp = Js.num(Js.prop(d.game, "xp")).let { if (it.isNaN()) 0L else it.toLong() },
            reviewedToday = rv, dailyGoal = goal, due = dueCount(d, now, tz),
            mistakes = (mistakes as? JsonArray)?.count { !Js.truthy(Js.prop(it, "fixed")) } ?: 0,
            week = week,
            greeting = if (hour < 12) TodaySummary.Greeting.MORNING else if (hour < 18) TodaySummary.Greeting.AFTERNOON else TodaySummary.Greeting.EVENING,
        )
    }
}

/** Typed view used by tests and screens. */
fun JsonObject.str(k: String): String? = (this[k] as? JsonPrimitive)?.content
