package com.lexkite.app.core.watch

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import java.net.URLDecoder
import kotlin.math.floor

/** One video card: search / feed result (sec 0 = unknown). */
data class WItem(val id: String, val title: String = "", val ch: String = "", val sec: Int = 0, val cc: Boolean = false)

/** One "continue watching" row (web localStorage wt.h): last position [pos] of [len] seconds. */
data class WHist(val id: String, val title: String = "", val ch: String = "", val topic: String = "", val pos: Int = 0, val len: Int = 0, val at: Long = 0)

/** One time note of a video (wt.n.<id>). */
data class WNote(val t: Int, val text: String)

/** The hub filters (wt.f): lv 0 = auto, empty strings = any. */
data class WFilters(val lv: Int = 0, val dur: String = "", val acc: String = "", val pace: String = "", val cc: Boolean = true)

/** A topic card of the hub (web WatchTopics.TOPICS); name / desc are Vietnamese source keys, lv = CEFR 1..6 range. */
data class WTopic(val id: String, val ic: String, val lvLo: Int, val lvHi: Int, val goals: List<String>, val name: String, val desc: String, val q: List<String>, val ch: List<String>, val kw: List<String>, val vocab: List<String>)

/** content-pack/watch-topics.json: levels, filter option lists ([value, label key]), query tails, topics. */
class WTopics(val levels: List<String>, val filters: Map<String, List<Pair<String, String>>>, val accQ: Map<String, String>, val paceQ: Map<String, String>, val lvQ: List<String>, val topics: List<WTopic>) {
    fun lvQ(n: Int): String = lvQ.getOrElse(n - 1) { "" }
    fun topic(id: String): WTopic? = topics.firstOrNull { it.id == id }

    companion object {
        private fun JsonElement?.strs() = (this as? JsonArray)?.map { (it as JsonPrimitive).content } ?: emptyList()
        private fun JsonElement?.strMap() = (this as? JsonObject)?.mapValues { (it.value as JsonPrimitive).content } ?: emptyMap()
        fun parse(o: JsonObject): WTopics = WTopics(
            o["levels"].strs(),
            (o["filters"] as? JsonObject)?.mapValues { (_, v) -> v.jsonArray.map { p -> p.jsonArray.let { (it[0] as JsonPrimitive).content to (it[1] as JsonPrimitive).content } } } ?: emptyMap(),
            o["accQ"].strMap(), o["paceQ"].strMap(), o["lvQ"].strs(),
            (o["topics"] as? JsonArray)?.map { e -> val t = e.jsonObject
                val lv = t["lv"].let { l -> (l as JsonArray).map { (it as JsonPrimitive).content.toInt() } }
                WTopic((t["id"] as JsonPrimitive).content, (t["ic"] as JsonPrimitive).content, lv[0], lv[1], t["goals"].strs(), (t["name"] as JsonPrimitive).content, (t["desc"] as JsonPrimitive).content, t["q"].strs(), t["ch"].strs(), t["kw"].strs(), t["vocab"].strs()) } ?: emptyList())
    }
}

/** Server answer of /api/watch: [offline] = the request failed (no network). */
class WApi(val items: List<WItem> = emptyList(), val fallback: String? = null, val offline: Boolean = false, val title: String = "", val ch: String = "", val embeddable: Boolean? = null)

/** "Học qua video" (#/watch) logic – port of web/js/watch.js (ytParse, fmt, myLevel, buildQ, forYou, result merge, device-only history / notes). Vectors: vectors/watch.json. */
object Watch {
    val RATES = listOf(0.5, 0.75, 0.9, 1.0, 1.25, 1.5)
    const val API = "https://lexkite.com/api/watch"
    const val MAX_ITEMS = 24; const val MAX_HIST = 30; const val MAX_NOTES = 200
    private val VID = Regex("^[A-Za-z0-9_-]{11}$")
    private val URL_RE = Regex("^[a-z][a-z0-9+.-]*://([^/?#]*)([^?#]*)(?:\\?([^#]*))?(?:#(.*))?$", RegexOption.IGNORE_CASE)
    private val HOST_OK = Regex("(^|\\.)(youtube\\.com|youtube-nocookie\\.com|youtu\\.be)$", RegexOption.IGNORE_CASE)
    private val PATH_ID = Regex("^/(?:shorts|embed|live|v)/([^/?#]+)")
    private val STAMP = Regex("^(?:(\\d+)h)?(?:(\\d+)m)?(?:(\\d+)s?)?$")

    data class Yt(val id: String, val t: Int)
    fun validId(s: String?) = s != null && VID.matches(s)

    private fun dec(s: String) = runCatching { URLDecoder.decode(s, "UTF-8") }.getOrDefault(s)
    private fun param(query: String?, k: String): String? = query?.split('&')?.firstOrNull { it.substringBefore('=') == k }?.let { dec(it.substringAfter('=', "")) }

    /** Every YouTube link form (watch?v=, youtu.be/, shorts/, embed/, live/, m., music., nocookie, &t=1m30s / ?start=) or a bare id → id + start second; null = not a YouTube video. */
    fun ytParse(input: String?): Yt? {
        val s = input.orEmpty().trim()
        if (VID.matches(s)) return Yt(s, 0)
        val m = URL_RE.matchEntire(if (Regex("^[a-z]+://", RegexOption.IGNORE_CASE).containsMatchIn(s)) s else "https://$s") ?: return null
        val host = m.groupValues[1].substringAfterLast('@').substringBefore(':').lowercase()
        if (!HOST_OK.containsMatchIn(host)) return null
        val path = m.groupValues[2]; val query = m.groupValues[3]; val hash = m.groupValues[4]
        var id: String? = if (host.endsWith("youtu.be")) path.split('/').getOrNull(1) else param(query, "v")
        if (id.isNullOrEmpty()) id = PATH_ID.find(path)?.groupValues?.get(1)
        if (id.isNullOrEmpty() || !VID.matches(id)) return null
        val tt = param(query, "t").orEmpty().ifEmpty { param(query, "start").orEmpty() }.ifEmpty { Regex("t=([^&]+)").find(hash)?.groupValues?.get(1).orEmpty() }
        val g = STAMP.matchEntire(tt)?.groupValues
        fun n(i: Int) = g?.get(i)?.toIntOrNull() ?: 0
        return Yt(id, if (g == null) 0 else n(1) * 3600 + n(2) * 60 + n(3))
    }

    /** 0:05 · 12:34 · 1:02:03 */
    fun fmt(sec: Number): String {
        val d = sec.toDouble(); val s = if (d.isNaN() || d < 0) 0L else floor(d).toLong()
        val h = s / 3600; val m = s / 60 % 60; val x = (s % 60).toString().padStart(2, '0')
        return if (h > 0) "$h:${m.toString().padStart(2, '0')}:$x" else "$m:$x"
    }

    private fun JsonObject?.str(k: String) = (this?.get(k) as? JsonPrimitive)?.takeIf { it.isString }?.content.orEmpty()
    /** The level (1..6) of the learner: placement vCefr|gCefr, else the IELTS band, else 2 (A2). */
    fun myLevel(placement: JsonObject?, levels: List<String> = listOf("A1", "A2", "B1", "B2", "C1", "C2")): Int {
        val c = placement.str("vCefr").ifEmpty { placement.str("gCefr") }
        val n = if (c.isEmpty()) 0 else levels.indexOf(c.uppercase().take(2)) + 1
        if (n > 0) return n
        val b = (placement?.get("band") as? JsonPrimitive)?.doubleOrNull ?: 0.0
        return if (b != 0.0) (if (b >= 7) 5 else if (b >= 5.5) 4 else if (b >= 4.5) 3 else 2) else 2
    }

    /** The final query: the topic phrase + level / accent / pace tails, duplicate words dropped. */
    fun buildQ(x: WTopics, base: String, f: WFilters, placement: JsonObject?): String {
        val lv = if (f.lv != 0) f.lv else myLevel(placement, x.levels)
        return listOf(base, x.lvQ(lv), x.accQ[f.acc].orEmpty(), x.paceQ[f.pace].orEmpty()).joinToString(" ").split(Regex("\\s+")).filter { it.isNotEmpty() }.distinct().joinToString(" ")
    }

    /** Suggested topics: level in range +3 else −2, goal +3 (topic without the goal nor "all" −4), +1 per deck word in the topic vocab, +1 per topic hit in the 10 newest history rows; score > 0, best 6. */
    fun forYou(x: WTopics, goal: String, placement: JsonObject?, deckWords: Set<String>, fLv: Int, history: List<WHist>): List<WTopic> {
        val lv = if (fLv != 0) fLv else myLevel(placement, x.levels)
        return x.topics.map { tp ->
            var s = if (tp.lvLo <= lv && lv <= tp.lvHi) 3 else -2
            if (goal in tp.goals) s += 3 else if ("all" !in tp.goals) s -= 4
            for (v in tp.vocab) if (v in deckWords) s += 1
            for (h in history.take(10)) if (h.topic == tp.id) s += 1
            s to tp
        }.filter { it.first > 0 }.sortedByDescending { it.first }.take(6).map { it.second }
    }

    /** Duration filter: short < 4 min, medium 4–20 min, long > 20 min; unknown length always passes. */
    fun durOk(dur: String, sec: Int) = dur.isEmpty() || sec == 0 || (if (dur == "short") sec < 240 else if (dur == "medium") sec in 240..1200 else sec > 1200)

    /** Search first, then the topic channels' feed (#shorts removed; keyword hits kept when ≥ 4); unique valid ids, duration rule, at most 24. */
    fun merge(search: List<WItem>, feed: List<WItem>, topic: WTopic?, dur: String): List<WItem> {
        var fd = feed.filter { !it.title.contains("#shorts", ignoreCase = true) }
        val kw = topic?.kw?.takeIf { it.isNotEmpty() }?.let { Regex("\\b(" + it.joinToString("|") + ")", RegexOption.IGNORE_CASE) }
        if (kw != null) { val hit = fd.filter { kw.containsMatchIn(it.title) }; if (hit.size >= 4) fd = hit }
        val seen = HashSet<String>()
        return (search + fd).filter { VID.matches(it.id) && seen.add(it.id) }.filter { durOk(dur, it.sec) }.take(MAX_ITEMS)
    }

    fun ytUrl(id: String, sec: Number = 0) = "https://www.youtube.com/watch?v=$id" + (if (sec.toDouble() >= 1) "&t=${floor(sec.toDouble()).toLong()}s" else "")
    fun searchUrl(q: String) = "https://www.youtube.com/results?search_query=" + java.net.URLEncoder.encode(q, "UTF-8").replace("+", "%20")
    fun apiUrl(op: String, p: Map<String, String>) = "$API?" + (listOf("op" to op) + p.toList()).joinToString("&") { (k, v) -> k + "=" + java.net.URLEncoder.encode(v, "UTF-8") }

    /** Source line saved with a word: "▶️ title (m:ss)" + the link at that second. */
    fun contextTitle(title: String, sec: Number, fallback: String) = "▶️ " + title.ifEmpty { fallback } + " (${fmt(sec)})"

    /** Parses an /api/watch body; anything that is not a JSON object = empty. */
    fun parseApi(text: String): WApi {
        val o = runCatching { kotlinx.serialization.json.Json.parseToJsonElement(text) as? JsonObject }.getOrNull() ?: return WApi()
        val items = (o["items"] as? JsonArray)?.mapNotNull { e -> (e as? JsonObject)?.let { WItem(it.str("id"), it.str("title"), it.str("ch"), ((it["sec"] as? JsonPrimitive)?.doubleOrNull ?: 0.0).toInt(), (it["cc"] as? JsonPrimitive)?.booleanOrNull == true) } } ?: emptyList()
        return WApi(items, o.str("fallback").ifEmpty { null }, title = o.str("title"), ch = o.str("ch"), embeddable = (o["embeddable"] as? JsonPrimitive)?.booleanOrNull)
    }

    // ---- device-only storage (web localStorage wt.h / wt.f / wt.n.<id>) ----
    fun histOf(e: JsonElement?): List<WHist> = (e as? JsonArray)?.mapNotNull { x -> (x as? JsonObject)?.let { o ->
        fun n(k: String) = (o[k] as? JsonPrimitive)?.doubleOrNull ?: 0.0
        WHist(o.str("id"), o.str("title"), o.str("ch"), o.str("topic"), n("pos").toInt(), n("len").toInt(), n("at").toLong()).takeIf { validId(it.id) } } } ?: emptyList()
    fun histJson(h: List<WHist>) = JsonArray(h.map { JsonObject(mapOf("id" to JsonPrimitive(it.id), "title" to JsonPrimitive(it.title), "ch" to JsonPrimitive(it.ch), "topic" to JsonPrimitive(it.topic), "pos" to JsonPrimitive(it.pos), "len" to JsonPrimitive(it.len), "at" to JsonPrimitive(it.at))) })
    /** The newest row first, the same video replaced, 30 kept. */
    fun pushHist(h: List<WHist>, e: WHist): List<WHist> = (listOf(e) + h.filter { it.id != e.id }).take(MAX_HIST)
    /** Where to resume: the saved position when past 5 s and not within the last 10 s. */
    fun resumeAt(h: WHist?): Int = if (h != null && h.pos > 5 && h.len > 0 && h.pos < h.len - 10) h.pos else 0

    fun filtersOf(e: JsonElement?): WFilters { val o = e as? JsonObject ?: return WFilters()
        return WFilters(((o["lv"] as? JsonPrimitive)?.doubleOrNull ?: 0.0).toInt().coerceIn(0, 6), o.str("dur"), o.str("acc"), o.str("pace"), (o["cc"] as? JsonPrimitive)?.booleanOrNull ?: true) }
    fun filtersJson(f: WFilters) = JsonObject(mapOf("lv" to JsonPrimitive(f.lv), "dur" to JsonPrimitive(f.dur), "acc" to JsonPrimitive(f.acc), "pace" to JsonPrimitive(f.pace), "cc" to JsonPrimitive(f.cc)))

    fun notesOf(e: JsonElement?): List<WNote> = (e as? JsonArray)?.mapNotNull { x -> (x as? JsonObject)?.let { WNote(((it["t"] as? JsonPrimitive)?.doubleOrNull ?: 0.0).toInt(), it.str("text")) } } ?: emptyList()
    fun notesJson(n: List<WNote>) = JsonArray(n.map { JsonObject(mapOf("t" to JsonPrimitive(it.t), "text" to JsonPrimitive(it.text))) })
    /** Adds a note at second [t], sorted by time, 200 kept. */
    fun addNote(n: List<WNote>, t: Int, text: String): List<WNote> = (n + WNote(t, text)).sortedBy { it.t }.takeLast(MAX_NOTES)
    fun delNote(n: List<WNote>, i: Int): List<WNote> = n.filterIndexed { k, _ -> k != i }
}
