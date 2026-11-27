package com.lexkite.app

import com.lexkite.app.core.link.DeepLink
import com.lexkite.app.core.mediate.Mediate
import com.lexkite.app.feature.skills.SKILLS_ROUTES
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** P13 "Trung gian": every case of vectors/mediate.json (words, hit, copied, sourceText, check, voices) against the Kotlin logic, plus the bundled 30 lessons and the route registration. */
class MediateVectorsTest {
    private fun res(n: String) = Json.parseToJsonElement(javaClass.classLoader!!.getResource(n)!!.readText()).jsonObject
    private val v = res("mediate.json")
    private val pack = Mediate.parse(res("mediation.json"))

    private fun JsonObject.s(k: String) = this[k]?.jsonPrimitive?.content.orEmpty()
    private fun strs(e: kotlinx.serialization.json.JsonElement?) = e!!.jsonArray.map { it.jsonPrimitive.content }

    @Test fun words() { for (c in v.getValue("words").jsonArray.map { it.jsonObject }) assertEquals(c.toString(), strs(c["out"]), Mediate.words(c.s("in"))) }

    @Test fun hit() {
        for (c in v.getValue("hit").jsonArray.map { it.jsonObject })
            assertEquals(c.toString(), c.getValue("out").jsonPrimitive.content.toBoolean(), Mediate.hit(c.s("text"), c.getValue("checks").jsonArray.map { strs(it) }))
    }

    @Test fun copied() {
        for (c in v.getValue("copied").jsonArray.map { it.jsonObject })
            assertEquals(c.toString(), c.s("out"), Mediate.copied(c.s("text"), Mediate.sourceText(pack.item(c.s("id"))!!.source), c.getValue("n").jsonPrimitive.content.toInt()))
    }

    @Test fun sourceText() { for (c in v.getValue("sourceText").jsonArray.map { it.jsonObject }) assertEquals(c.s("id"), c.s("out"), Mediate.sourceText(pack.item(c.s("id"))!!.source)) }

    @Test fun check() {
        for (c in v.getValue("check").jsonArray.map { it.jsonObject }) {
            val o = c.getValue("out").jsonObject; val r = Mediate.check(pack.item(c.s("id"))!!, c.s("text"))
            val m = c.s("id") + "/" + c.s("kind")
            assertEquals(m, o.getValue("n").jsonPrimitive.content.toInt(), r.n)
            assertEquals(m, o.getValue("inRange").jsonPrimitive.content.toBoolean(), r.inRange)
            assertEquals(m, o.getValue("points").jsonArray.map { it.jsonObject.s("id") to it.jsonObject.getValue("ok").jsonPrimitive.content.toBoolean() }, r.points.map { it.id to it.ok })
            assertEquals(m, o.getValue("points").jsonArray.map { it.jsonObject.s("idea") }, r.points.map { it.idea })
            assertEquals(m, strs(o["extra"]), r.extra)
            assertEquals(m, o.s("copied"), r.copied)
        }
    }

    @Test fun voices() {
        for (c in v.getValue("voices").jsonArray.map { it.jsonObject })
            assertEquals(c.s("id"), c.getValue("out").jsonObject.mapValues { it.value.jsonPrimitive.content }, Mediate.voices(pack.item(c.s("id"))!!.source))
    }

    @Test fun storage() {
        var b = Mediate.withBest(emptyMap(), "m03", 2, 4)
        assertEquals(2 to 4, b["m03"]); b = Mediate.withBest(b, "m03", 1, 4); assertEquals(2 to 4, b["m03"]); b = Mediate.withBest(b, "m03", 3, 4); assertEquals(3 to 4, b["m03"])
        assertEquals(b, Mediate.bestOf(Mediate.bestJson(b)))
    }

    /** The P13 gate (scripts/test/native-parity.mjs): the bundled lessons load, the web vectors replay, listen-first follows the level rule and the route is registered in the Skills tab. */
    @Test fun parity_P13() {
        assertEquals(30, pack.items.size); assertEquals(listOf("A2", "B1", "B2", "C1", "C2"), pack.levels); assertEquals(8, pack.copyRun)
        assertTrue(v.getValue("check").jsonArray.isNotEmpty() && v.getValue("words").jsonArray.isNotEmpty())
        for (c in v.getValue("hit").jsonArray.map { it.jsonObject }) assertEquals(c.getValue("out").jsonPrimitive.content.toBoolean(), Mediate.hit(c.s("text"), c.getValue("checks").jsonArray.map { strs(it) }))
        for (x in pack.items) assertEquals(x.id, x.level in pack.listenFirst && x.source.kind != "chart", Mediate.listenFirst(x, pack.listenFirst))
        assertEquals(pack.items.first().id, pack.next(pack.items.last().id)!!.id)
        assertTrue("mediate" in SKILLS_ROUTES)
        val d = DeepLink.parse("lexkite://mediate/m03")
        assertNotNull(d); assertEquals(DeepLink.SKILLS, d!!.tab); assertEquals("mediate", d.route); assertEquals("m03", d.arg)
        assertEquals("mediate", DeepLink.parse("lexkite://mediate")!!.route)
    }
}
