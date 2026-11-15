package com.lexkite.app.core.vocab

import com.lexkite.app.core.SRS
import com.lexkite.app.core.SRSCard
import com.lexkite.app.core.SRSParams
import com.lexkite.app.core.lesson.LessonEngine
import com.lexkite.app.core.today.TodayModel
import com.lexkite.app.core.sync.Js
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import java.util.TimeZone
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/** Pure helpers over web-shaped cards (`JsonObject`, the shape every screen stores): port of core.js SRS.retention/level5/mastery, Cards.dueList/newToday, app.js origin/forgetting. */
object CardMath {
    const val DAY = SRS.DAY
    const val MIN = SRS.MIN

    fun endOfToday(now: Long): Long = LessonEngine.endOfDay(now)
    fun todayKey(now: Long): String = TodayModel.dayKey(now, TimeZone.getDefault())

    /** `card.srs` as the FSRS engine's input (`now` fills a missing `due`). */
    fun srsCard(s: JsonObject?, now: Long): SRSCard {
        val o = s ?: JsonObject(emptyMap())
        fun has(k: String) = o[k] != null && o[k] !is JsonNull
        return SRSCard(
            ef = o.gn("ef", 2.5), interval = o.gn("interval").toInt(), reps = o.gn("reps").toInt(), lapses = o.gn("lapses").toInt(), step = o.gn("step").toInt(),
            due = if (has("due")) o.gn("due").toLong() else now, last = o.gl("last"), S = if (has("S")) o.gn("S") else null, D = if (has("D")) o.gn("D") else null,
        )
    }
    /** Engine result merged over the stored object (unknown keys survive, like the web's `{...s}`). */
    fun srsJson(orig: JsonObject?, c: SRSCard): JsonObject {
        val base = orig ?: JsonObject(emptyMap())
        return base.cp("ef" to c.ef, "interval" to c.interval, "reps" to c.reps, "lapses" to c.lapses, "due" to c.due, "last" to c.last, "step" to c.step, "S" to (c.S ?: Absent), "D" to (c.D ?: Absent))
    }
    /** The vector view of an srs object. */
    fun srsView(s: JsonObject?): JsonObject = jo("reps" to s.gn("reps"), "lapses" to s.gn("lapses"), "step" to s.gn("step"), "interval" to s.gn("interval"), "S" to s?.get("S").let { if (it == null || it is JsonNull) null else it }, "D" to s?.get("D").let { if (it == null || it is JsonNull) null else it }, "due" to s?.get("due"), "last" to (s?.get("last") ?: JsonNull))

    fun srsOf(c: JsonObject?): JsonObject = c.go("srs") ?: JsonObject(emptyMap())
    fun isNew(c: JsonObject): Boolean { val s = srsOf(c); return s.gn("reps") == 0.0 && !s.gt("last") }
    fun everReviewed(c: JsonObject): Boolean { val s = srsOf(c); return s.gn("reps") > 0 || s.gt("last") }
    /** keyOf(word) of core.js (lower-case, curly quote -> straight, collapsed spaces). */
    fun keyOf(word: String): String = WS_RUN.replace(word.lowercase().replace(Regex("[’‘`]"), "'"), " ").jsTrim()

    fun retention(s: JsonObject?, now: Long): Double? {
        if (s == null || !s.gt("last")) return null
        val last = s.gn("last")
        if (s.gn("reps") == 0.0) return max(0.3, 0.9.pow((now - last) / (10 * MIN)))
        val t = max(0.0, (now - last) / DAY)
        val S = s["S"]
        if (S != null && S !is JsonNull) { val p = SRSParams.FSRS5; return (1 + p.FACTOR * t / Js.num(S)).pow(p.DECAY) }
        return 0.9.pow(t / max(1.0, s.gn("interval")))
    }
    /** 5 retention levels: 0 = never reviewed. */
    fun level5(s: JsonObject?): Int { if (s == null || !s.gt("last")) return 0; if (s.gn("reps") == 0.0) return 1; val i = s.gn("interval"); return if (i <= 3) 2 else if (i <= 10) 3 else if (i <= 30) 4 else 5 }
    /** 0 new · 1 learning · 2 known · 3 mastered. */
    fun mastery(s: JsonObject?): Int {
        if (s == null || s.gn("reps") == 0.0) return if (s != null && s.gt("last")) 1 else 0
        val i = s.gn("interval"); return if (i >= 21) 3 else if (i >= 4) 2 else 1
    }
    fun forgetting(cards: Collection<JsonObject>, now: Long, target: Double = SRSParams.FSRS5.retentionTarget): List<JsonObject> =
        cards.filter { c -> val s = srsOf(c); s.gn("reps") > 0 && (retention(s, now) ?: 0.0) < min(0.85, target - 0.05) }

    /** app.js origin(c): anki > youtube > web > reading > dict > library. */
    fun origin(c: JsonObject): String {
        if (c.gs("topic") == "import") return "doc"
        if (c.gt("deck") || c.gs("topic") == "anki") return "anki"
        val ctxs = c.ga("contexts").mapNotNull { it as? JsonObject }
        val ctx = ctxs.firstOrNull { it.gt("source") } ?: ctxs.lastOrNull()
        val src = ctx.gs("source")
        if (src.isNotEmpty() && Regex("youtube\\.com|youtu\\.be|netflix|vimeo|ted\\.com").containsMatchIn(src)) return "youtube"
        if (src.isNotEmpty() && Regex("^https?:").containsMatchIn(src)) return "web"
        if (ctx != null && ctx.gs("title").startsWith("Bài đọc")) return "reading"
        if (c.gs("topic") == "mine" || c.gs("topic").isEmpty()) return "dict"
        return "library"
    }
    /** Personal-collection keys in display order (web ORIGINS); name/desc keys are the web's Vietnamese source strings. */
    val ORIGINS = listOf("youtube", "web", "reading", "dict", "library", "anki", "doc")
    val ORIGIN_EMOJI = mapOf("youtube" to "▶️", "web" to "🌐", "reading" to "📖", "dict" to "🔎", "library" to "📚", "anki" to "🃏", "doc" to "📥")
    val ORIGIN_NAME = mapOf("youtube" to "Từ YouTube & video", "web" to "Từ trang web", "reading" to "Từ bài đọc", "dict" to "Từ tra từ điển", "library" to "Từ thư viện", "anki" to "Từ Anki", "doc" to "Từ tài liệu")
    val ORIGIN_DESC = mapOf("youtube" to "Lưu khi xem video có phụ đề", "web" to "Lưu bằng add-on khi đọc báo, blog…", "reading" to "Lưu khi đọc bài trong Lexkite", "dict" to "Từ bạn tự tra và lưu", "library" to "Thêm từ các bộ từ IELTS", "anki" to "Nhập từ bộ thẻ Anki", "doc" to "Nhập từ văn bản, PDF, ePub, phụ đề")

    /** phrases.js isPhrase */
    fun isPhrase(c: JsonObject): Boolean = Regex(JSWS).containsMatchIn(c.gs("word").jsTrim()) || c.gs("pos") == "phrase" || c.gs("topic") == "phrases"
    /** App.meanOf (meaning in the learner's language; native: pass the localized resolver). */
    fun meanOf(c: JsonObject?): String = if (c == null) "" else c.gs("vi").ifEmpty { c.gs("def") }

    /** Cards.dueList(map, {practicable}) */
    fun dueList(cards: Collection<JsonObject>, now: Long, practicable: Boolean = false): List<JsonObject> {
        val end = endOfToday(now)
        return cards.filter { c -> val s = srsOf(c); (s.gn("reps") > 0 || s.gt("last")) && s.gn("due") <= end && (!practicable || c.gt("vi")) }
    }
    /** Cards.dueCount -> (due, newCount) */
    fun newCount(cards: Collection<JsonObject>, settings: JsonObject, stats: JsonObject?, now: Long): Int {
        val nt = stats.go("newToday")
        val introduced = if (nt != null && nt.gs("day") == todayKey(now)) nt.gn("n") else 0.0
        val avail = cards.count { isNew(it) }
        return min(avail.toDouble(), max(0.0, settings.gn("dailyNew", Double.NaN) - introduced)).let { if (it.isNaN()) 0 else it.toInt() }
    }
    /** Cards.newToday: unseen first, then oldest-added, up to newCount. `seen` = localStorage lk.newSeen (lower-case word -> ms). */
    fun newToday(cards: Collection<JsonObject>, settings: JsonObject, stats: JsonObject?, seen: Map<String, Long>, now: Long): List<JsonObject> {
        val n = newCount(cards, settings, stats, now)
        fun at(c: JsonObject) = seen[c.gs("word").lowercase()] ?: 0L
        return cards.filter { isNew(it) }.sortedWith(compareBy<JsonObject>({ at(it) }, { it.gn("added") })).take(n)
    }
    /** Cards.markSeen: remember a new card was shown; keep the newest 400. */
    fun markSeen(seen: Map<String, Long>, word: String, now: Long): Map<String, Long> {
        val m = LinkedHashMap(seen); m[word.lowercase()] = now
        if (m.size > 400) { val drop = m.keys.sortedBy { m[it] }.take(m.size - 400); for (k in drop) m.remove(k) }
        return m
    }
}

/** core.js Stats: review log per day, hours histogram, "new cards introduced today". */
object VStats {
    fun empty(): JsonObject = jo("days" to jo(), "newToday" to jo("day" to "", "n" to 0))
    fun logReview(stats: JsonObject?, isNew: Boolean, now: Long): JsonObject {
        val s = stats ?: empty(); val k = CardMath.todayKey(now)
        val days = LinkedHashMap(s.go("days") ?: JsonObject(emptyMap())); days[k] = je((days[k]?.let { Js.num(it) } ?: 0.0) + 1)
        val hrs0 = s.ga("hours")
        var hs = if (hrs0.size == 24) hrs0.map { Js.num(it).toInt() }.toMutableList() else MutableList(24) { 0 }
        val hour = java.util.Calendar.getInstance().apply { timeInMillis = now }.get(java.util.Calendar.HOUR_OF_DAY)
        hs[hour] = hs[hour] + 1
        if (hs.sum() > 600) hs = hs.map { it shr 1 }.toMutableList()
        val ks = days.keys.sorted().toMutableList(); while (ks.size > 400) days.remove(ks.removeAt(0))
        var nt = s.go("newToday") ?: jo("day" to "", "n" to 0)
        if (isNew) { if (nt.gs("day") != k) nt = jo("day" to k, "n" to 0); nt = jo("day" to nt.gs("day"), "n" to nt.gn("n") + 1) }
        return s.cp("days" to JsonObject(days), "hours" to hs, "newToday" to nt)
    }
    /** study.js undo(): take back the review that was just logged. */
    fun unlogReview(stats: JsonObject?, wasNew: Boolean, now: Long): JsonObject {
        val s = stats ?: empty(); val k = CardMath.todayKey(now)
        val days = LinkedHashMap(s.go("days") ?: JsonObject(emptyMap()))
        val cur = days[k]?.let { if (Js.truthy(it)) Js.num(it) else 1.0 } ?: 1.0
        days[k] = je(max(0.0, cur - 1))
        var nt = s.go("newToday")
        if (wasNew && nt != null && nt.gs("day") == k) nt = jo("day" to k, "n" to max(0.0, nt.gn("n") - 1))
        return s.cp("days" to JsonObject(days), "newToday" to (nt ?: Absent))
    }
}
