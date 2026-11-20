package com.lexkite.app

import com.lexkite.app.core.Answer
import com.lexkite.app.core.SRS
import com.lexkite.app.core.SRSCard
import com.lexkite.app.core.SRSParams
import com.lexkite.app.design.LKFrame
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.i18n.generated.L10nLangs
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.util.TimeZone

/** Parity gate: Kotlin ports reproduce the web JS reference exactly (vectors from scripts/native/gen.mjs). */
class ConformanceTest {
    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("scoring.json")!!.readText()).jsonObject
    private val gen = File("../../shared/gen")

    @Test fun paramsMatchWebSource() {
        val p = v["params"]!!.jsonObject; val k = SRSParams.FSRS5
        assertEquals(p["W"]!!.jsonArray.map { it.jsonPrimitive.double }, k.W)
        assertEquals(p["DECAY"]!!.jsonPrimitive.double, k.DECAY, 0.0)
        assertEquals(p["FACTOR"]!!.jsonPrimitive.double, k.FACTOR, 1e-15)
        assertEquals(p["MAX_IVL"]!!.jsonPrimitive.int, k.MAX_IVL)
        assertEquals(p["retentionTarget"]!!.jsonPrimitive.double, k.retentionTarget, 0.0)
        assertEquals(p["dayRolloverHour"]!!.jsonPrimitive.int, k.dayRolloverHour)
    }

    @Test fun fsrsMatchesWeb() {
        val srs = SRS(tz = TimeZone.getTimeZone("UTC"))
        v["fsrs"]!!.jsonArray.forEachIndexed { si, seq ->
            var c = SRSCard(due = seq.jsonObject["start"]!!.jsonPrimitive.long)
            seq.jsonObject["steps"]!!.jsonArray.forEachIndexed { i, e ->
                val st = e.jsonObject; val at = "seq $si step $i"
                c = srs.review(c, st["grade"]!!.jsonPrimitive.int, st["now"]!!.jsonPrimitive.long)
                assertEquals(at, st["S"]!!.jsonPrimitive.double, c.S!!, 1e-9); assertEquals(at, st["D"]!!.jsonPrimitive.double, c.D!!, 1e-9)
                assertEquals(at, st["reps"]!!.jsonPrimitive.int, c.reps); assertEquals(at, st["lapses"]!!.jsonPrimitive.int, c.lapses)
                assertEquals(at, st["step"]!!.jsonPrimitive.int, c.step); assertEquals(at, st["interval"]!!.jsonPrimitive.int, c.interval)
                assertEquals(at, st["due"]!!.jsonPrimitive.long, c.due)
            }
        }
    }

    @Test fun answerNormMatchesWeb() {
        v["answer"]!!.jsonObject["norm"]!!.jsonArray.forEach { val o = it.jsonObject; val i = o["in"]!!.jsonPrimitive.content
            assertEquals("norm($i)", o["out"]!!.jsonPrimitive.content, Answer.norm(i)) }
    }

    @Test fun answerCheckMatchesWeb() {
        v["answer"]!!.jsonObject["check"]!!.jsonArray.forEach {
            val o = it.jsonObject; val item = o["item"]!!.jsonObject
            val it2 = Answer.Item(item["type"]!!.jsonPrimitive.content, item["answer"]!!.jsonPrimitive.content, item["choice"]?.jsonPrimitive?.booleanOrNull ?: false)
            val a = o["ans"]!!
            val given: Answer.Given = when {
                a is JsonArray -> Answer.Given.Words(a.map { x -> x.jsonPrimitive.content })
                a is JsonPrimitive && a.isString -> Answer.Given.Text(a.content)
                a is JsonPrimitive && a.booleanOrNull != null -> Answer.Given.Matched(a.boolean)
                a is JsonPrimitive && a.doubleOrNull != null -> Answer.Given.Score(a.double)
                else -> error("bad ans $a")
            }
            assertEquals("${it2.type} $a", o["ok"]!!.jsonPrimitive.boolean, Answer.check(it2, given))
        }
    }

    @Test fun everyKeyInAll15Languages() {
        assertEquals(15, L10nLangs.ALL.size)
        val en = L10n.parse(File(gen, "strings/en.json").readText())
        for (l in L10nLangs.ALL) {
            val t = L10n(l, L10n.parse(File(gen, "strings/$l.json").readText()), en)
            for (k in L10nKey.entries) assertTrue("$l: ${k.id}", t.has(k))
        }
    }

    @Test fun frameIsFiveTabs() {
        val f = LKFrame.parse(File(gen, "frame.json").readText())
        assertEquals(listOf("home", "vocab", "skills", "tests", "me"), f.tabs.map { it.k })
        assertEquals(390, f.width); assertTrue(f.minTap >= 44)
    }
}
