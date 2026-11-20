package com.lexkite.app.core.lesson

import com.lexkite.app.core.SRS
import com.lexkite.app.core.SRSCard
import com.lexkite.app.core.migration.MigrationImport
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.core.sync.WebCards
import com.lexkite.app.core.today.TodayModel
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.util.TimeZone

/**
 * End of a lesson → learning document (web lesson/ui.js finish()): wrong → grade 0 (new words are added first), due + right first time → grade 2
 * (FSRS via [SRS], `mod` = now like Cards.update), then XP/day counters like Game.track. Pure: the caller runs it inside LexStore.mutate.
 */
object LessonWriter {
    /** XP of a finished lesson (web: 10 + 2 per first-time right + 5 when nothing was wrong). */
    fun xpOf(s: LessonEngine.Session): Int = 10 + s.ok1 * 2 + (if (s.wrong.isEmpty()) 5 else 0)

    private fun toSrs(o: JsonObject?): SRSCard {
        fun n(k: String) = Js.num(o?.get(k))
        fun nn(k: String) = o?.get(k)?.takeIf { it !is JsonNull }?.let { Js.num(it) }?.takeIf { !it.isNaN() }
        return SRSCard(ef = n("ef").takeIf { !it.isNaN() } ?: 2.5, interval = n("interval").takeIf { !it.isNaN() }?.toInt() ?: 0, reps = n("reps").takeIf { !it.isNaN() }?.toInt() ?: 0,
            lapses = n("lapses").takeIf { !it.isNaN() }?.toInt() ?: 0, step = n("step").takeIf { !it.isNaN() }?.toInt() ?: 0, due = nn("due")?.toLong() ?: 0L, last = nn("last")?.toLong(), S = nn("S"), D = nn("D"))
    }
    private fun fromSrs(base: JsonObject?, c: SRSCard): JsonObject {
        val m = LinkedHashMap<String, JsonElement>(base ?: emptyMap())
        m["ef"] = Js.number(c.ef); m["interval"] = Js.number(c.interval.toDouble()); m["reps"] = Js.number(c.reps.toDouble()); m["lapses"] = Js.number(c.lapses.toDouble())
        m["due"] = JsonPrimitive(c.due); m["last"] = c.last?.let { JsonPrimitive(it) } ?: JsonNull; m["step"] = Js.number(c.step.toDouble())
        m["S"] = c.S?.let { Js.number(it) } ?: JsonNull; m["D"] = c.D?.let { Js.number(it) } ?: JsonNull
        return JsonObject(m)
    }

    fun apply(doc: SyncDoc, res: List<LessonEngine.Res>, xp: Int, spoken: Int, perfect: Boolean, now: Long, tz: TimeZone = TimeZone.getDefault(), srs: SRS = SRS(tz = tz)): SyncDoc {
        var cards = LinkedHashMap(doc.cards); var deleted: Map<String, JsonElement> = doc.deleted
        for (r in res) {
            if (r.add && r.entry != null) {
                val (c2, d2) = WebCards.add(cards, deleted, r.entry, JsonObject(emptyMap()), now)
                cards = LinkedHashMap(c2); deleted = d2
            }
            val key = MigrationImport.keyOf(r.word)
            val card = cards[key] ?: continue
            val next = srs.review(toSrs(card["srs"] as? JsonObject), r.grade, now)
            val m = LinkedHashMap<String, JsonElement>(card); m["srs"] = fromSrs(card["srs"] as? JsonObject, next); m["mod"] = JsonPrimitive(now)
            cards[key] = JsonObject(m)
        }
        return doc.copy(cards = cards, deleted = deleted, game = reward(doc.game, xp, spoken, perfect, now, tz))
    }

    /** Game.track({quizzes:1, spoken, perfect, xp}) without quests/badges (those return with the gamification milestone). */
    fun reward(game: JsonElement?, xp: Int, spoken: Int, perfect: Boolean, now: Long, tz: TimeZone): JsonElement {
        val g = Js.spread(game); val days = Js.spread(g["days"]); val k = TodayModel.dayKey(now, tz); val d = Js.spread(days[k]); val total = Js.spread(g["total"])
        fun add(m: String, v: Int) { if (v == 0) return; d[m] = Js.number(Js.num(d[m]).let { if (it.isNaN()) 0.0 else it } + v); if (total.containsKey(m)) total[m] = Js.number(Js.num(total[m]) + v) }
        add("quizzes", 1); add("spoken", spoken); add("perfect", if (perfect) 1 else 0)
        d["xp"] = Js.number((Js.num(d["xp"]).let { if (it.isNaN()) 0.0 else it }) + xp)
        days[k] = JsonObject(d); g["days"] = JsonObject(days); g["total"] = JsonObject(total)
        g["xp"] = Js.number((Js.num(g["xp"]).let { if (it.isNaN()) 0.0 else it }) + xp)
        return JsonObject(g)
    }
}
