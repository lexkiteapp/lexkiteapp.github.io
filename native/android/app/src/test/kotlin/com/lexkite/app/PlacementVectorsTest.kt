package com.lexkite.app

import com.lexkite.app.core.link.DeepLink
import com.lexkite.app.core.placement.PEstimate
import com.lexkite.app.core.placement.PResp
import com.lexkite.app.core.placement.Placement
import com.lexkite.app.core.placement.PlacementSession
import com.lexkite.app.feature.skills.SKILLS_ROUTES
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Entry test (#/placement, part of P10): every case of vectors/placement.json – posterior, estimate, nextLevel, bandOf, cefrOf, stageOf, take, record and the 20-question scenarios
 * over the bundled bank – replayed against Placement / PlacementSession, plus the bank itself and the route registration.
 */
class PlacementVectorsTest {
    private fun res(n: String) = Json.parseToJsonElement(javaClass.classLoader!!.getResource(n)!!.readText()).jsonObject
    private val v = res("placement.json")
    private val bankJson = res("placement-bank.json")
    private val pack = Placement.parse(bankJson)

    private fun JsonObject.s(k: String) = this[k]?.jsonPrimitive?.content.orEmpty()
    private fun JsonObject.d(k: String) = this.getValue(k).jsonPrimitive.doubleOrNull!!
    private fun resp(e: JsonElement) = e.jsonArray.map { it.jsonObject }.map { o -> PResp(o.s("kind"), o.s("lv"), o.s("r"), if (o["c"] == null || o["c"] is JsonNull) null else o.d("c")) }
    private fun cases(k: String) = v.getValue(k).jsonArray.map { it.jsonObject }
    private fun near(m: String, want: Double, got: Double, eps: Double = 1e-9) = assertEquals("$m want $want got $got", want, got, eps)

    @Test fun posterior() {
        for (c in cases("posterior")) { val o = c.getValue("out").jsonObject; val r = Placement.posterior(resp(c["resp"]!!)); near(c.s("name") + ".theta", o.d("theta"), r.theta); near(c.s("name") + ".se", o.d("se"), r.se) }
    }

    private fun skill(m: String, o: JsonObject, got: com.lexkite.app.core.placement.PSkill) { near("$m.band", o.d("band"), got.band); assertEquals(m, o.s("cefr"), got.cefr); near("$m.theta", o.d("theta"), got.theta, 0.0051) }
    private fun same(m: String, o: JsonObject, e: PEstimate) {
        assertEquals("$m band", o.s("band"), e.band); assertEquals("$m lo", o.s("lo"), e.lo); assertEquals("$m hi", o.s("hi"), e.hi); assertEquals("$m range", o.s("range"), e.range)
        near("$m theta", o.d("theta"), e.theta, 0.0051); near("$m se", o.d("se"), e.se, 0.0051)
        skill("$m vocab", o.getValue("vocab").jsonObject, e.vocab); skill("$m grammar", o.getValue("grammar").jsonObject, e.grammar)
        assertEquals("$m weak", o.s("weak"), e.weak); assertEquals("$m stage", o.s("stage"), e.stage)
        assertEquals("$m n", o.getValue("n").jsonPrimitive.intOrNull, e.n); assertEquals("$m right", o.getValue("right").jsonPrimitive.intOrNull, e.right); assertEquals("$m idk", o.getValue("idk").jsonPrimitive.intOrNull, e.idk)
    }

    @Test fun estimate() { for (c in cases("estimate")) same(c.s("name"), c.getValue("out").jsonObject, Placement.estimate(resp(c["resp"]!!))) }
    @Test fun nextLevel() { for (c in cases("nextLevel")) assertEquals(c.s("name"), c.s("out"), Placement.nextLevel(resp(c["resp"]!!))) }
    @Test fun bandCefrStage() {
        for (c in cases("bandOf")) near("bandOf ${c["in"]}", c.d("out"), Placement.bandOf(c.d("in")))
        for (c in cases("cefrOf")) assertEquals("cefrOf ${c["in"]}", c.s("out"), Placement.cefrOf(c.d("in")))
        for (c in cases("stageOf")) assertEquals("stageOf ${c["in"]}", c.s("out"), Placement.stageOf(c.d("in")))
    }

    @Test fun take() {
        for (c in cases("take")) {
            val pool = c.getValue("pool").jsonArray.map { it.jsonObject.s("id") to it.jsonObject.s("lv") }
            val used = c.getValue("used").jsonArray.map { it.jsonPrimitive.content }.toMutableSet()
            val rs = c.getValue("rnd").jsonArray.map { it.jsonPrimitive.doubleOrNull!! }; var k = 0
            val got = Placement.take(pool, c.s("lv"), used, { rs[k++ % rs.size] }, { it.second }, { it.first })
            val m = c.s("name")
            if (c["out"] is JsonNull) assertNull(m, got) else assertEquals(m, c.s("out"), got?.first)
            assertEquals(m, c.getValue("usedAfter").jsonArray.map { it.jsonPrimitive.content }.toSet(), used)
        }
    }

    @Test fun record() {
        for (c in cases("record")) assertEquals(c.s("name"), c.getValue("out").jsonObject, Placement.record(Placement.estimate(resp(c["resp"]!!)), c.getValue("now").jsonPrimitive.content.toLong()))
    }

    /** The ask() loop: item ids, levels, kinds, answers and the final estimate / record of 8 scenarios must equal the web loop run over the same bank. */
    @Test fun scenarios() {
        for (c in cases("scenarios")) {
            val m = "seed ${c["seed"]} ${c.s("policy")}"
            val s = PlacementSession(pack, Placement.lcg(c.getValue("seed").jsonPrimitive.content.toLong()), 1234L, true)
            val steps = c.getValue("steps").jsonArray.map { it.jsonObject }
            for ((i, st) in steps.withIndex()) {
                val q = s.next(); assertNotNull("$m step $i", q); q!!
                assertEquals("$m id $i", st.s("id"), q.id); assertEquals("$m kind $i", st.s("kind"), q.kind); assertEquals("$m lv $i", st.s("lv"), q.lv)
                near("$m c $i", st.d("c"), q.c)
                assertEquals("$m options $i", if (q.vocab) 4 else pack.grammar.first { it.id == q.id }.options.size, q.options.size)
                assertEquals("$m options distinct $i", q.options.size, q.options.toSet().size)
                s.answer(when (st.s("r")) { "right" -> q.correct; "wrong" -> (q.correct + 1) % q.options.size; else -> -1 })
            }
            assertNull("$m ends after ${steps.size}", s.next())
            same(m, c.getValue("estimate").jsonObject, Placement.estimate(s.resp))
            assertEquals(m, c.getValue("record").jsonObject, Placement.record(Placement.estimate(s.resp), c.getValue("now").jsonPrimitive.content.toLong()))
        }
    }

    @Test fun bank() {
        assertEquals(20, pack.n); assertEquals(listOf("A2", "B1", "B2", "C1"), pack.ladder)
        for (lv in pack.ladder) { assertEquals(lv, 90, pack.vocab.count { it.lv == lv }); assertEquals(lv, 50, pack.grammar.count { it.lv == lv }) }
        assertEquals(pack.vocab.size, pack.vocab.map { it.id }.toSet().size); assertEquals(pack.grammar.size, pack.grammar.map { it.id }.toSet().size)
        assertTrue(pack.vocab.all { it.w.isNotEmpty() && it.vi.isNotEmpty() && it.def.isNotEmpty() })
        assertTrue(pack.grammar.all { it.options.size >= 3 && it.answer in it.options.indices })
    }

    /** Session rules: alternation, "I don't know" counts as not knowing (no guess credit), a double answer is ignored, the test ends after 20. */
    @Test fun session() {
        val s = PlacementSession(pack, Placement.lcg(11), 5L, false)
        var i = 0
        while (true) {
            val q = s.next() ?: break
            assertEquals(if (i % 2 == 0) "vocab" else "grammar", q.kind)
            if (q.vocab) assertEquals(q.options[q.correct], pack.vocab.first { it.id == q.id }.def)
            if (i == 3) { s.answer(-1); s.answer(0) } else s.answer(q.correct)   // the 2nd answer has no open question: ignored
            i++
        }
        assertEquals(20, i); assertEquals(20, s.resp.size); assertEquals(1, s.resp.count { it.r == "idk" }); assertEquals(19, s.resp.count { it.r == "right" })
        assertTrue(Placement.estimate(s.resp).band.toDouble() >= 5.5)
    }

    /** The gate of the Tests-tab route: registered in the Skills host and opened from a deep link (tab = tests, route placement). */
    @Test fun placement_route() {
        assertTrue("placement" in SKILLS_ROUTES)
        val d = DeepLink.parse("lexkite://placement"); assertNotNull(d); assertEquals(DeepLink.TESTS, d!!.tab); assertEquals("placement", d.route)
        assertEquals("placement", DeepLink.parse("https://lexkite.com/app/#/placement")!!.route)
    }
}
