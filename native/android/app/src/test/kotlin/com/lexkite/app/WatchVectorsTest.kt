package com.lexkite.app

import com.lexkite.app.core.link.DeepLink
import com.lexkite.app.core.watch.WFilters
import com.lexkite.app.core.watch.WHist
import com.lexkite.app.core.watch.WItem
import com.lexkite.app.core.watch.WNote
import com.lexkite.app.core.watch.WTopics
import com.lexkite.app.core.watch.Watch
import com.lexkite.app.feature.skills.SKILLS_ROUTES
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** P12 "Học qua video": every case of vectors/watch.json (ytParse, fmt, buildQ, forYou, durRule, rates) against the Kotlin logic, plus the bundled topics and the route registration. */
class WatchVectorsTest {
    private fun res(n: String) = Json.parseToJsonElement(javaClass.classLoader!!.getResource(n)!!.readText()).jsonObject
    private val v = res("watch.json")
    private val topics = WTopics.parse(res("watch-topics.json"))

    private fun JsonObject.s(k: String) = this[k]?.jsonPrimitive?.content.orEmpty()
    private fun placement(o: JsonObject, k: String = "placement") = o[k] as? JsonObject

    @Test fun rates() { assertEquals(v.getValue("rates").jsonArray.map { it.jsonPrimitive.content.toDouble() }, Watch.RATES) }

    @Test fun ytParse() {
        for (c in v.getValue("parse").jsonArray.map { it.jsonObject }) {
            val got = Watch.ytParse(c.s("in")); val out = c["out"]
            if (out is JsonObject) assertEquals(c.s("in"), Watch.Yt(out.s("id"), out.getValue("t").jsonPrimitive.content.toInt()), got) else assertNull(c.s("in"), got)
        }
    }

    @Test fun fmt() { for (c in v.getValue("fmt").jsonArray.map { it.jsonObject }) assertEquals(c.toString(), c.s("out"), Watch.fmt(c.getValue("s").jsonPrimitive.content.toDouble())) }

    @Test fun buildQ() {
        for (c in v.getValue("buildQ").jsonArray.map { it.jsonObject }) {
            val f = c.getValue("f").jsonObject
            assertEquals(c.toString(), c.s("out"), Watch.buildQ(topics, c.s("base"), WFilters((f["lv"]?.jsonPrimitive?.doubleOrNull ?: 0.0).toInt(), "", f.s("acc"), f.s("pace")), placement(c)))
        }
    }

    @Test fun forYou() {
        for (c in v.getValue("forYou").jsonArray.map { it.jsonObject }) {
            val hist = c.getValue("history").jsonArray.map { WHist(it.jsonObject.s("id"), topic = it.jsonObject.s("topic")) }
            val got = Watch.forYou(topics, c.s("goal"), placement(c), c.getValue("words").jsonArray.map { it.jsonPrimitive.content }.toSet(), (c.getValue("lv").jsonPrimitive.doubleOrNull ?: 0.0).toInt(), hist)
            assertEquals(c.toString(), c.getValue("out").jsonArray.map { it.jsonPrimitive.content }, got.map { it.id })
        }
    }

    @Test fun durRule() {
        val rule = v.getValue("durRule").jsonObject
        assertEquals(24, rule.getValue("max").jsonPrimitive.content.toInt()); assertEquals(Watch.MAX_ITEMS, 24)
        assertTrue(Watch.durOk("short", 239) && !Watch.durOk("short", 240))
        assertTrue(Watch.durOk("medium", 240) && Watch.durOk("medium", 1200) && !Watch.durOk("medium", 239) && !Watch.durOk("medium", 1201))
        assertTrue(Watch.durOk("long", 1201) && !Watch.durOk("long", 1200))
        assertTrue(Watch.durOk("long", 0) && Watch.durOk("", 5)) // unknown length / no filter always pass
        val id = { n: Int -> "vid" + n.toString().padStart(8, '0') }
        val many = (1..40).map { WItem(id(it), "t$it", sec = 300) }
        assertEquals(24, Watch.merge(many, emptyList(), null, "").size)
    }

    @Test fun merge() {
        val tp = topics.topic("daily")!!
        val search = listOf(WItem("aaaaaaaaaaa", "one"), WItem("bad", "x"))
        val feed = listOf(WItem("aaaaaaaaaaa", "dup conversation"), WItem("bbbbbbbbbbb", "Shorts #SHORTS conversation"), WItem("ccccccccccc", "everyday talk"))
        // fewer than 4 keyword hits: the whole feed is kept (minus #shorts and duplicates); invalid ids dropped
        assertEquals(listOf("aaaaaaaaaaa", "ccccccccccc"), Watch.merge(search, feed, tp, "").map { it.id })
        val hits = (1..4).map { WItem("hhhhhhhhhh$it", "daily conversation $it") } + WItem("zzzzzzzzzzz", "unrelated")
        assertEquals(4, Watch.merge(emptyList(), hits, tp, "").size) // ≥ 4 hits: only the hits
    }

    @Test fun storage() {
        val h = (1..35).fold(emptyList<WHist>()) { a, i -> Watch.pushHist(a, WHist("vid" + i.toString().padStart(8, '0'), pos = i)) }
        assertEquals(30, h.size); assertEquals(35, h[0].pos)
        assertEquals(h.take(3), Watch.histOf(Watch.histJson(h)).take(3))
        assertEquals(h[5].id, Watch.pushHist(h, h[5].copy(pos = 9))[0].id); assertEquals(30, Watch.pushHist(h, h[5]).size)
        assertEquals(0, Watch.resumeAt(WHist("aaaaaaaaaaa", pos = 4, len = 100))); assertEquals(50, Watch.resumeAt(WHist("aaaaaaaaaaa", pos = 50, len = 100))); assertEquals(0, Watch.resumeAt(WHist("aaaaaaaaaaa", pos = 95, len = 100)))
        val n = Watch.addNote(Watch.addNote(emptyList(), 30, "b"), 10, "a")
        assertEquals(listOf(WNote(10, "a"), WNote(30, "b")), n); assertEquals(n, Watch.notesOf(Watch.notesJson(n))); assertEquals(listOf(WNote(30, "b")), Watch.delNote(n, 0))
        assertEquals(200, (1..250).fold(emptyList<WNote>()) { a, i -> Watch.addNote(a, i, "x") }.size)
        assertEquals(WFilters(), Watch.filtersOf(null)); assertEquals(WFilters(3, "short", "uk", "slow", false), Watch.filtersOf(Watch.filtersJson(WFilters(3, "short", "uk", "slow", false))))
    }

    @Test fun api() {
        val a = Watch.parseApi("""{"items":[{"id":"dQw4w9WgXcQ","title":"T","ch":"C","sec":95,"cc":true}],"fallback":"https://www.youtube.com/results?search_query=x"}""")
        assertEquals(listOf(WItem("dQw4w9WgXcQ", "T", "C", 95, true)), a.items); assertEquals("https://www.youtube.com/results?search_query=x", a.fallback)
        assertTrue(Watch.parseApi("not json").items.isEmpty()); assertEquals(false, Watch.parseApi("""{"title":"T","ch":"C","embeddable":false}""").embeddable)
        assertEquals("https://lexkite.com/api/watch?op=search&q=a+b&dur=&cc=1", Watch.apiUrl("search", mapOf("q" to "a b", "dur" to "", "cc" to "1")))
        assertEquals("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=95s", Watch.ytUrl("dQw4w9WgXcQ", 95.7)); assertEquals("▶️ T (1:35)", Watch.contextTitle("T", 95, "YouTube"))
    }

    /** The P12 gate (scripts/test/native-parity.mjs): the bundled topics load, ytParse replays its vectors, and the route is registered in the Skills tab. */
    @Test fun parity_P12() {
        assertTrue(topics.topics.size >= 20); assertEquals(6, topics.levels.size)
        val parse = v.getValue("parse").jsonArray
        assertTrue(parse.isNotEmpty()); for (c in parse.map { it.jsonObject }) assertEquals(c["out"] !is JsonNull, Watch.ytParse(c.s("in")) != null)
        assertEquals(Watch.Yt("dQw4w9WgXcQ", 90), Watch.ytParse("youtube.com/watch?v=dQw4w9WgXcQ&t=1m30s"))
        assertTrue("watch" in SKILLS_ROUTES)
        val d = DeepLink.parse("lexkite://watch/dQw4w9WgXcQ?t=5")
        assertNotNull(d); assertEquals(DeepLink.SKILLS, d!!.tab); assertEquals("watch", d.route); assertEquals("dQw4w9WgXcQ", d.arg); assertEquals("t=5", d.query)
        assertEquals("watch", DeepLink.parse("lexkite://watch")!!.route)
    }
}
