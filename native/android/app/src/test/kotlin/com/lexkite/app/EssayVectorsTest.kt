package com.lexkite.app

import com.lexkite.app.core.skills.Lexis
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.strs
import com.lexkite.app.core.write.Essay
import com.lexkite.app.core.write.WritePack
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * P09 parity (#/write, #/task1, #/qstats, #/criteria): Essay (core/write) + Lexis.essay reproduce every case of vectors/write.json (web code run in node:vm by scripts/native/gen-write.mjs).
 * Every case of every list is run and compared. A report line is the web's Vietnamese source key + vars (`{k, v}`), compared as such.
 */
class EssayVectorsTest {
    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("write.json")!!.readText()).jsonObject
    private val skills = Json.parseToJsonElement(javaClass.classLoader!!.getResource("skills.json")!!.readText()).jsonObject
    private val pack = WritePack.parse(javaClass.classLoader!!.getResource("write-pack.json")!!.readText())!!
    private val lexis = Lexis.fromJson(skills.getValue("data").jsonObject["lexis"] as JsonObject)
    private val stop = v.o("data").strs("stop").toSet()
    private val index = v.o("data").strs("index").toSet()

    private fun JsonObject.o(k: String) = getValue(k).jsonObject
    private fun JsonObject.a(k: String) = getValue(k).jsonArray
    private fun JsonElement?.s() = if (this == null || this is JsonNull) "" else jsonPrimitive.content
    private fun JsonObject.n(k: String) = this[k].s().toDouble()
    private fun JsonObject.i(k: String) = n(k).toInt()
    private fun near(a: Double, b: Double, label: String) = assertTrue("$label: $a vs $b", Math.abs(a - b) < 1e-6)
    private fun counts(l: List<Essay.Count>) = l.map { "${it.w}:${it.n}" }
    private fun counts(a: JsonArray?) = (a ?: JsonArray(emptyList())).map { r -> "${(r as JsonArray)[0].s()}:${r[1].s().toDouble().toInt()}" }
    /** a vector line {k, v} as "key⟦{vars}⟧" – the same form as an Essay.Line */
    private fun render(j: JsonElement) = (j as JsonObject).let { o -> o.gs("k") + "|" + ((o["v"] as? JsonObject)?.entries?.sortedBy { it.key }?.joinToString(",") { it.key + "=" + it.value.s() } ?: "") }
    private fun render(l: Essay.Line) = l.key + "|" + l.vars.entries.sortedBy { it.key }.joinToString(",") { it.key + "=" + it.value }

    @Test fun analyze() {
        var n = 0
        for (cs in v.o("write").a("analyze")) {
            val c = cs.jsonObject; val id = c.gs("id"); val o = c.o("out"); val text = c.o("input").gs("text")
            if (id == "too-short") { assertTrue(id, Essay.words(text) < Essay.MIN_TO_ANALYSE && o["reported"].s() == "false" && o.a("writes").isEmpty()); continue }
            n++
            val a = lexis.essay(text, stop) { it in index }
            assertEquals("$id words", o.i("words"), a.words); assertEquals("$id sentences", o.i("sentences"), a.sentences)
            near(a.avg, o.n("avg"), "$id avg"); near(a.sd, o.n("sd"), "$id sd"); near(a.diversity, o.n("diversity"), "$id diversity"); near(a.awlRatio, o.n("awlRatio"), "$id awlRatio"); near(a.band, o.n("band"), "$id band")
            assertEquals("$id awl", counts(o.a("awl")), counts(a.awl)); assertEquals("$id link", counts(o.a("link")), counts(a.link)); assertEquals("$id phrases", counts(o.a("phrases")), counts(a.phrases))
            assertEquals("$id overused", counts(o.a("overused")), counts(a.overused))
            assertEquals("$id tips", o.a("tips").map { render(it) }, Essay.tips(a).map { render(it) })
            val (pct, tone) = Essay.ring(a.band, 4.5)
            near(pct, o.n("ringPct"), "$id ring"); assertEquals("$id ring colour", o.gs("ringColor"), tone.name.lowercase())
            val st = o.a("stats").map { it.jsonObject }
            assertEquals("$id stats", listOf(a.words.toString(), a.awlTotal.toString(), a.link.size.toString(), "${Math.floor(a.diversity * 100 + 0.5).toInt()}%"), st.map { it.gs("n") })
            assertEquals("$id AWL label pct", Essay.pct1(a.awlRatio), st[1].o("label").o("v").gs("pct"))
            val saved = o.a("writes")[0].jsonObject.o("value").jsonArray[0].jsonObject
            assertEquals("$id saved prompt", "p1", saved.gs("prompt")); assertEquals("$id saved words", a.words, saved.i("words")); near(saved.n("band"), a.band, "$id saved band")
            assertEquals("$id reward", o.a("rewards")[0].jsonObject.let { r -> r.entries.associate { it.key to it.value.s().toDouble().toInt() } }, Essay.REWARD + ("xp" to Essay.REWARD_XP))
        }
        assertTrue("cases covered: $n", n >= 8)
    }

    @Test fun flowsAndConstants() {
        val st = v.o("write").o("static")
        assertEquals(st.i("minWords"), Essay.MIN_WORDS); assertEquals(st.i("minutes"), Essay.CLOCK_MINUTES); assertEquals(st.i("warnBelowSeconds"), Essay.WARN_SECONDS)
        assertEquals(st.i("minToAnalyse"), Essay.MIN_TO_ANALYSE); assertEquals(st.i("savedKept"), Essay.KEEP_SAVED); assertEquals(st.i("savedShown"), Essay.SHOW_SAVED)
        val old = (0 until 22).map { JsonObject(mapOf("prompt" to JsonPrimitive("p$it"))) as JsonElement }
        val l = Essay.saving(old, "p99", "x", 1, 5.0, 1)
        val by = v.o("write").a("flow").associate { it.jsonObject.gs("id") to it.jsonObject.o("out") }
        assertEquals(by.getValue("saved-list").i("keptAfter"), l.size); assertEquals("p99", (l[0] as JsonObject).gs("prompt"))
        assertEquals("12", Essay.sessionNumber("p12"))
    }

    @Test fun task1Score() {
        for (cs in v.o("task1").a("score")) {
            val c = cs.jsonObject; val id = c.gs("id"); val i = c.o("input"); val o = c.o("out")
            val s = Essay.task1Score(i.gs("text"), i.gs("type"))
            near(s.band, o.n("band"), "$id band"); assertEquals("$id words", o.i("words"), s.words)
            assertEquals("$id overview", o.i("overview"), s.overview); assertEquals("$id numbers", o.i("numbers"), s.numbers); assertEquals("$id trend", o.i("trend"), s.trend); assertEquals("$id compare", o.i("compare"), s.compare)
            assertEquals("$id notes", o.a("notes").map { render(it) }, s.notes.map { render(it) })
        }
        val st = v.o("task1").o("static")
        assertEquals(st.i("minWords"), Essay.T1_MIN_WORDS); assertEquals(st.i("minutes"), Essay.T1_CLOCK); assertEquals(st.i("warnBelowSeconds"), Essay.T1_WARN); assertEquals(st.i("minToAnalyse"), Essay.T1_MIN_TO_ANALYSE); assertEquals(st.i("rewardXp"), Essay.T1_REWARD_XP)
        val flow = v.o("task1").a("flow").map { it.jsonObject }.first { it.gs("id") == "analyse" }.o("out")
        assertEquals(flow.a("rewards")[0].jsonObject.entries.associate { it.key to it.value.s().toDouble().toInt() }, Essay.T1_REWARD + ("xp" to Essay.T1_REWARD_XP))
    }

    @Test fun qstats() {
        val order = pack.skills.map { it[0] }
        assertEquals(listOf("il", "ir", "tl", "tr", "fr", "fl", "fw"), order)
        val names = v.o("qstats").o("names").entries.associate { it.key to it.value.s() }
        val table = pack.skillTable
        for (cs in v.o("qstats").a("cases")) {
            val c = cs.jsonObject; val id = c.gs("id"); val want = c.o("out").a("cards")
            val cards = Essay.qstatCards(JsonObject(mapOf("qstat" to c.o("input").o("qstat"))), order)
            assertEquals("$id cards", want.size, cards.size)
            cards.zip(want).forEach { (card, w0) ->
                val w = w0.jsonObject; val info = pack.skill(card.skill)!!
                assertEquals("$id skill", w.gs("icon") + " " + w.gs("name"), info[0] + " " + info[1])
                val k = w.a("kpi").map { it.jsonObject }
                assertEquals("$id pct", "${card.pct}%", k[0].o("v").gs("k")); assertEquals("$id total", card.total.toString(), k[1].o("v").gs("k"))
                assertEquals("$id avg secs", if (k.size > 2) k[2].o("v").let { x -> (x["v"] as JsonObject).let { vv -> vv.i("s") + 60 * (vv["m"]?.s()?.toDoubleOrNull()?.toInt() ?: 0) } } else null, card.secsEach)
                val rows = w.a("rows").map { it.jsonObject }
                assertEquals("$id rows", rows.map { r -> names.entries.firstOrNull { it.value == r.gs("kind") }?.key ?: r.gs("kind") }, card.rows.map { it.kind })
                card.rows.zip(rows).forEach { (row, x) ->
                    assertEquals("$id row pct", x.i("pct"), row.pct)
                    assertEquals("$id bar", x.gs("bar"), when (row.tone) { Essay.Tone.GOOD -> "ok"; Essay.Tone.AGAIN -> "no"; else -> "" })
                    assertEquals("$id link", x.gs("href"), Essay.practiceRoute(card.skill, row.kind, table, pack.rtype, names.containsKey(row.kind)))
                    assertEquals("$id row secs", x["secs"] is JsonNull, row.secsEach == null)
                }
                assertEquals("$id weak", (w["weak"] as? JsonArray)?.get(1)?.s(), card.weak?.let { names[it] ?: it })
            }
        }
    }

    @Test fun packMatchesVectors() {
        val st = v.o("write").o("static")
        assertEquals(st.o("outline").mapValues { (it.value as JsonArray).map { x -> x.s() } }, pack.outline)
        assertEquals(st.strs("connectors"), pack.connectors); assertEquals(st["trends"], pack.trends)
        assertEquals(v.o("task1").o("static").o("vocab").mapValues { (it.value as JsonArray).map { x -> x.s() } }, pack.vocab)
        assertEquals(v.o("data").strs("stop").toSet(), pack.stop); assertTrue(pack.stop.contains("the") && pack.stop.size > 50)
        for (sk in listOf("writing", "speaking")) {
            val d = pack.criteria.o(sk); val vv = v.o("criteria").o("skills").o(sk)
            assertEquals("$sk ids", vv.a("criteria").map { it.jsonObject.gs("id") }, d.a("criteria").map { it.jsonObject.gs("id") })
            d.a("criteria").zip(vv.a("criteria")).forEach { (c, w) -> assertEquals("$sk bands", w.jsonObject.strs("bands").sorted(), c.jsonObject.o("bands").keys.sorted()); assertEquals(w.jsonObject.gs("short"), c.jsonObject.gs("short")); assertEquals(w.jsonObject.gs("weight"), c.jsonObject.gs("weight")) }
            for ((b, m) in vv.o("models")) {
                val model = d.o("models").o(b)
                assertEquals("$sk $b band", m.jsonObject.gs("band"), model.gs("band")); assertEquals("$sk score keys", model.o("scores").keys.sorted(), pack.scoreKeys[sk]!!.sorted())
                assertTrue(model.gs(if (sk == "writing") "essay" else "transcript").isNotEmpty())
            }
            assertEquals("$sk roadmap", vv.a("jump").size, d.a("jumpTips").size)
        }
        assertEquals(listOf("5.0", "6.5", "8.0"), v.o("criteria").o("rules").strs("modelBands"))
        assertNotNull(Essay.K.AWL)
    }
}
