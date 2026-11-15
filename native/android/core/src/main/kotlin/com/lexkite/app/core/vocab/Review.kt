package com.lexkite.app.core.vocab

import com.lexkite.app.core.SRS
import com.lexkite.app.core.sync.Js
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import java.text.Normalizer
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.random.Random

/** #/review: queue building, the grading session (incl. undo) and the typing/listening modes. Port of web/js/study.js (buildQueue/grade/undo/reviewDone) + study-modes.js. */
object Review {
    /** The state the screen shows after opening: `empty` (no cards), `allDone` (nothing due), `card` (session started), `redirect` (to [redirect]). */
    class Opened(val state: String, val queue: List<String>, val total: Int, val redirect: String? = null)

    /** study.js buildQueue(ahead): due cards by due time, new cards spliced at 1, 4, 7 …, cut to `sessionCap` (0 = no cut). Keys are lower-case words. */
    fun buildQueue(cards: Map<String, JsonObject>, settings: JsonObject, stats: JsonObject?, seen: Map<String, Long>, ahead: Double, now: Long): List<String> {
        val list = cards.values
        val end = CardMath.endOfToday(now) + (ahead * CardMath.DAY).toLong()
        val due = list.filter { c -> val s = CardMath.srsOf(c); (s.gn("reps") > 0 || s.gt("last")) && s.gn("due") <= end }.sortedBy { CardMath.srsOf(it).gn("due") }
        val fresh = if (ahead > 0) emptyList() else CardMath.newToday(list, settings, stats, seen, now)
        val q = due.toMutableList()
        fresh.forEachIndexed { i, c -> q.add(min(q.size, i * 3 + 1), c) }
        val cap = settings.gn("sessionCap").toInt()
        return (if (cap > 0) q.take(cap) else q).map { it.gs("word").lowercase() }
    }

    /** routes.review: `query` = the hash query (`ahead`, `w`, `src`). */
    fun open(cards: Map<String, JsonObject>, settings: JsonObject, stats: JsonObject?, seen: Map<String, Long>, query: Map<String, String>, now: Long): Opened {
        if (query["src"] == "forgetting" && CardMath.forgetting(cards.values, now).isNotEmpty()) return Opened("redirect", emptyList(), 0, "#/practice/learn?src=forgetting")
        val ahead = min(7.0, max(0.0, (query["ahead"]?.toDoubleOrNull() ?: 0.0)))
        if (cards.isEmpty()) return Opened("empty", emptyList(), 0)
        var q = buildQueue(cards, settings, stats, seen, ahead, now)
        val pin = (query["w"] ?: "").lowercase()
        if (pin.isNotEmpty() && cards.containsKey(pin)) q = listOf(pin) + q.filter { it != pin }
        return Opened(if (q.isEmpty()) "allDone" else "card", q, q.size)
    }

    /** What `App.reward` receives for one grade (the game engine adds XP/streak/missions itself). */
    class Reward(val reviews: Int, val newWords: Int, val again: Int, val xp: Int)

    /** game.js totals taken back by an undo (xp, day reviews/newWords, lifetime totals). */
    fun undoGame(game: JsonObject, r: Reward, dayKey: String): JsonObject {
        val days = LinkedHashMap(game.go("days") ?: JsonObject(emptyMap()))
        val d = days[dayKey] as? JsonObject ?: JsonObject(emptyMap())
        val nd = d.cp("xp" to max(0.0, d.gn("xp") - r.xp), "reviews" to max(0.0, d.gn("reviews") - 1), "newWords" to (if (r.newWords > 0) max(0.0, d.gn("newWords") - 1) else d["newWords"] ?: Absent))
        days[dayKey] = nd
        var total = game.go("total")
        if (total != null && Js.truthy(total)) total = total.cp("reviews" to max(0.0, total.gn("reviews") - 1), "newWords" to (if (r.newWords > 0) max(0.0, total.gn("newWords") - 1) else total["newWords"] ?: Absent))
        return game.cp("xp" to max(0.0, game.gn("xp") - r.xp), "days" to JsonObject(days), "total" to (total ?: Absent))
    }

    /** study.js `session` + grade()/undo(): the first key of [queue] is the card on screen. */
    class Session(queue: List<String>, val cards: MutableMap<String, JsonObject>, var stats: JsonObject, private val engine: SRS = SRS()) {
        val queue: MutableList<String> = queue.toMutableList()
        var done = 0; var again = 0; var xp = 0
        val missed = mutableListOf<String>()
        val g = IntArray(4)
        val total = queue.size
        var reverse = false
        val finished get() = queue.isEmpty()
        private class Snap(val key: String, val srs: JsonObject?, val queue: List<String>, val done: Int, val again: Int, val missed: List<String>, val wasNew: Boolean, val g: Int, val xp: Int)
        private var last: Snap? = null
        val canUndo get() = last != null

        /** Grade the card on screen (0 Again · 1 Hard · 2 Good · 3 Easy). Returns the reward to hand to the game engine, or null when there is no card. */
        fun grade(grade: Int, now: Long): Reward? {
            val key = queue.firstOrNull() ?: return null
            val c = cards[key] ?: return null
            val s = c.go("srs")
            val wasNew = CardMath.srsOf(c).let { it.gn("reps") == 0.0 && !it.gt("last") }
            val gained = if (grade == 0) 2 else if (wasNew) 8 else 5
            val snap = Snap(key, s, queue.toList(), done, again, missed.toList(), wasNew, grade, gained)
            val ns = CardMath.srsJson(s, engine.review(CardMath.srsCard(s, now), grade, now))
            cards[key] = c.cp("srs" to ns, "mod" to now)
            stats = VStats.logReview(stats, wasNew, now)
            xp += gained; last = snap; g[grade]++
            queue.removeAt(0); done++
            if (ns.gn("reps") == 0.0) queue.add(min(queue.size, if (grade == 0) 3 else 6), key)
            if (grade == 0) { again++; val w = c.gs("word"); if (!missed.contains(w)) missed.add(w) }
            return Reward(1, if (wasNew) 1 else 0, if (grade == 0) 1 else 0, gained)
        }

        /** Undo the LAST grade, once. Returns what to take back from the game engine ([undoGame]), or null. */
        fun undo(now: Long): Reward? {
            val l = last ?: return null; last = null
            cards[l.key]?.let { cards[l.key] = it.cp("srs" to (l.srs ?: Absent), "mod" to now) }
            queue.clear(); queue.addAll(l.queue); done = l.done; again = l.again; missed.clear(); missed.addAll(l.missed); xp = max(0, xp - l.xp)
            if (g[l.g] > 0) g[l.g]--
            stats = VStats.unlogReview(stats, l.wasNew, now)
            return Reward(1, if (l.wasNew) 1 else 0, if (l.g == 0) 1 else 0, l.xp)
        }
    }

    /** reviewDone: accuracy %, mood and the "hardest word" (most lapses among the missed; ties keep the first). */
    fun accuracy(done: Int, again: Int): Int = if (done > 0) floor((done - again).toDouble() / done * 100 + 0.5).toInt() else 0
    fun mood(nothing: Boolean, acc: Int): String = if (nothing || acc >= 90) "win" else if (acc >= 60) "happy" else "cheer"
    fun hardest(missed: List<String>, cards: Map<String, JsonObject>): Pair<String, List<String>>? {
        val list = missed.distinct(); if (list.isEmpty()) return null
        fun lap(w: String) = (cards[w.lowercase()] ?: cards[w])?.let { CardMath.srsOf(it).gn("lapses") } ?: 0.0
        var w = list[0]
        for (x in list.drop(1)) if (lap(x) > lap(w)) w = x
        return w to list.filter { it != w }
    }
    /** Cards due per day for the next 7 days (index 0 = tomorrow), only reviewed cards. */
    fun forecast(cards: Collection<JsonObject>, now: Long): List<Int> {
        val day0 = CardMath.endOfToday(now); val n = IntArray(7)
        for (c in cards) { val s = CardMath.srsOf(c); val d = floor((s.gn("due") - day0) / CardMath.DAY).toInt(); if (s.gt("last") && d >= 0 && d < 7) n[d]++ }
        return n.toList()
    }
    fun soonCount(cards: Collection<JsonObject>, now: Long): Int { val e = CardMath.endOfToday(now); return cards.count { c -> val s = CardMath.srsOf(c); s.gt("last") && s.gn("due") > e && s.gn("due") <= e + 2 * CardMath.DAY } }
    fun nextDue(cards: Collection<JsonObject>, now: Long): JsonObject? = cards.filter { CardMath.srsOf(it).gn("due") > CardMath.endOfToday(now) }.minByOrNull { CardMath.srsOf(it).gn("due") }
    /** Show the "share your streak" button: accuracy >= 80 with >= 5 reviews, the daily goal hit, or a milestone streak. */
    fun canBrag(acc: Int, done: Int, hitGoal: Boolean, streak: Int): Boolean = (acc >= 80 && done >= 5) || hitGoal || streak in listOf(3, 7, 14, 30, 100)

    /** SRS.preview(s, grade) as (unit, n): "min" 1/6/10, else "day"/"month"/"year" (n; years one decimal) — the UI formats with its own strings. */
    class Preview(val unit: String, val n: Double)
    fun preview(s: JsonObject?, grade: Int, now: Long, engine: SRS = SRS()): Preview {
        val reps = s.gn("reps"); val step = s.gn("step")
        if (reps == 0.0) {
            if (grade == 0) return Preview("min", 1.0)
            if (grade == 1) return Preview("min", if (step == 0.0) 6.0 else 10.0)
            if (grade == 2 && !(step > 0)) return Preview("min", 10.0)
        } else if (grade == 0) return Preview("min", 1.0)
        val n = engine.review(CardMath.srsCard(s, now), grade, now)
        val d = floor((n.due - now).toDouble() / CardMath.DAY + 0.5)
        return if (d <= 1) Preview("day", 1.0) else if (d < 30) Preview("day", d) else if (d < 365) Preview("month", floor(d / 30 + 0.5)) else Preview("year", Math.round(d / 365 * 10) / 10.0)
    }
}

/** study-modes.js: automatic mode choice by FSRS difficulty, typing/listening results -> grade 0..3, text helpers. */
object StudyModes {
    val MODES = listOf("auto", "flip", "type", "audio")
    fun norm(x: String?): String {
        var s = Normalizer.normalize(x ?: "", Normalizer.Form.NFD).replace(Regex("[\\u0300-\\u036f]"), "").lowercase()
        s = s.replace(Regex("[’‘`´]"), "'").replace(Regex("[-‐‑–—_/]+"), " ").replace(Regex("[.,!?;:\"“”()]+"), "")
        return WS_RUN.replace(s, " ").jsTrim()
    }
    fun dist(a: String, b: String): Int {
        val d = Array(a.length + 1) { IntArray(b.length + 1) }
        for (i in 0..a.length) d[i][0] = i
        for (j in 0..b.length) d[0][j] = j
        for (i in 1..a.length) for (j in 1..b.length) d[i][j] = min(min(d[i - 1][j] + 1, d[i][j - 1] + 1), d[i - 1][j - 1] + (if (a[i - 1] == b[j - 1]) 0 else 1))
        return d[a.length][b.length]
    }
    private fun tolOf(n: Int) = if (n >= 8) 2 else if (n >= 4) 1 else 0
    /** Typing -> grade. dist = typos, len = word length, hints used, ms taken. */
    fun gradeType(dist: Int, len: Int, hints: Int, ms: Long, gaveUp: Boolean): Int {
        if (gaveUp || dist > tolOf(len)) return 0
        if (dist > 0 || hints >= 2) return 1
        if (hints == 0 && ms < 2500 + 350 * len) return 3
        return 2
    }
    fun gradeAudio(ok: Boolean, replays: Int, ms: Long): Int { if (!ok) return 0; if (replays >= 2) return 1; if (replays == 0 && ms < 5000) return 3; return 2 }

    fun auto(c: JsonObject): String {
        val s = CardMath.srsOf(c)
        val dRaw = s["D"]
        val d = if (dRaw != null && dRaw !is JsonNull) Js.num(dRaw) else if (s.gt("ef")) (3 - s.gn("ef")) * 6 else 5.0
        val lap = s.gn("lapses"); val reps = s.gn("reps")
        if (lap >= 3 || d >= 7.5) return "flip"
        if (reps >= 2 && d <= 5 && lap <= 1) return if (reps % 3 == 1.0) "audio" else "type"
        return "audio"
    }
    class Options(val all: List<String>, val right: Int)
    /** Wrong answers for "listen and choose the meaning": other cards' meanings (same part of speech first), then library words; `mixer` null = keep order (tests). */
    fun options(c: JsonObject, cards: Collection<JsonObject>, library: List<JsonObject> = emptyList(), mixer: Random? = Random.Default, meanOf: (JsonObject) -> String = CardMath::meanOf): Options? {
        fun <T> mix(l: List<T>): List<T> = if (mixer == null) l else l.shuffled(mixer)
        val right = meanOf(c); val seen = HashSet<String>(); seen.add(norm(right)); val out = ArrayList<String>()
        fun take(list: List<JsonObject>) { for (x in list) { if (out.size >= 3) break; val m = if (x.gs("word") != c.gs("word")) meanOf(x) else ""; if (m.isNotEmpty() && seen.add(norm(m))) out.add(m) } }
        val pos = c.gs("pos")
        take(mix(cards.filter { it.gt("pos") && it.gs("pos") == pos })); take(mix(cards.toList()))
        if (out.size < 3) take(mix(library.take(400)))
        if (out.size < 3) return null
        val all = mix(listOf(right) + out)
        return Options(all, all.indexOf(right))
    }
    class Pick(val mode: String, val options: Options?)
    fun pick(c: JsonObject, want: String?, rev: Boolean, cards: Collection<JsonObject>, library: List<JsonObject> = emptyList(), typeReview: Boolean = true, mixer: Random? = Random.Default): Pick {
        val s = CardMath.srsOf(c)
        if (rev || (s.gn("reps") == 0.0 && !s.gt("last"))) return Pick("flip", null)
        var m = if (!want.isNullOrEmpty() && want != "auto") want else auto(c)
        val w = c.gs("word")
        val canType = w.length <= 30 && Regex("[a-z]", RegexOption.IGNORE_CASE).containsMatchIn(w) && typeReview
        if (m == "type" && !canType) m = "audio"
        var opt: Options? = null
        if (m == "audio") { opt = options(c, cards, library, mixer); if (opt == null) m = "flip" }
        return Pick(m, opt)
    }
    /** Soft cut around the word (<= max chars, at word boundaries, "…" at cut ends). */
    fun trim(text: String?, word: String, limit: Int = 200): String {
        val s = WS_RUN.replace(text ?: "", " ").jsTrim()
        if (s.length <= limit) return s
        val at = Regex("\\b" + Regex.escape(word) + "\\w*", RegexOption.IGNORE_CASE).find(s)?.range?.first ?: 0
        var a = max(0, at - (limit - word.length) / 2); var b = min(s.length, a + limit)
        a = max(0, b - limit)
        if (a > 0) { val sp = s.indexOf(' ', a); if (sp > 0 && sp < at) a = sp + 1 }
        if (b < s.length) { val sp = s.lastIndexOf(' ', b); if (sp > at + word.length) b = sp }
        return (if (a > 0) "…" else "") + s.substring(a, b) + (if (b < s.length) "…" else "")
    }
    /** Source host shown under "your sentence" (scheme/www/path stripped, <= 60). */
    fun host(src: String?): String = (src ?: "").replace(Regex("^[a-z][\\w+.-]*://", RegexOption.IGNORE_CASE), "").split(Regex("[/?#\\s]"))[0].replace(Regex("^www\\."), "").take(60)
}
