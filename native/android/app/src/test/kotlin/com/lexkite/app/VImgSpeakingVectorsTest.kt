package com.lexkite.app

import com.lexkite.app.core.lesson.Speaking
import com.lexkite.app.core.vimg.VImg
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Test

/** Word pictures (vectors/vimg.json, web VImg v3) and the speaking score (lesson.json `similarity`, web UI.similarity). */
class VImgSpeakingVectorsTest {
    private fun load(n: String) = Json.parseToJsonElement(javaClass.classLoader!!.getResource(n)!!.readText()).jsonObject
    private val vimg = load("vimg.json")
    private fun any(e: kotlinx.serialization.json.JsonElement?): Any? = when {
        e == null || e is JsonNull -> null
        e is JsonPrimitive && e.isString -> e.content
        e is JsonPrimitive && e.booleanOrNull != null -> e.booleanOrNull
        else -> e!!.jsonPrimitive.content.toDouble()
    }

    @Test fun posKeyShardUrlMatchWeb() {
        for (c in vimg.getValue("pos").jsonArray) { val o = c.jsonObject; assertEquals(o["in"].toString(), o.getValue("out").jsonPrimitive.content, VImg.pos(if (o["in"] is JsonNull) null else o.getValue("in").jsonPrimitive.content)) }
        for (c in vimg.getValue("sh").jsonArray) { val o = c.jsonObject; assertEquals(o.getValue("w").toString(), o.getValue("out").jsonPrimitive.int, VImg.shard(o.getValue("w").jsonPrimitive.content, o.getValue("n").jsonPrimitive.int)) }
        val h = vimg.getValue("head").jsonObject; val head = VImg.Head(h.getValue("base").jsonPrimitive.content, h.getValue("n").jsonPrimitive.int, true)
        for (c in vimg.getValue("cases").jsonArray) {
            val o = c.jsonObject; val w = o.getValue("word").jsonPrimitive.content; val p = o.getValue("pos").jsonPrimitive.content
            assertEquals(o.getValue("key").jsonPrimitive.content, VImg.key(w, p)); assertEquals(o.getValue("shard").jsonPrimitive.int, VImg.shard(w, head.n))
            val hash = (o["hash"] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content
            val pic = VImg.pic(head, VImg.Shard(if (hash != null) mapOf(o.getValue("key").jsonPrimitive.content to hash) else emptyMap(), if (o.getValue("scene").jsonPrimitive.booleanOrNull == true) setOf(o.getValue("key").jsonPrimitive.content) else emptySet(),
                if (o.getValue("a").jsonPrimitive.booleanOrNull == true) setOf(o.getValue("key").jsonPrimitive.content) else emptySet()), w, p)
            assertEquals(o["url"].toString(), (o["url"] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content, pic?.url)
            assertEquals(o.getValue("scene").jsonPrimitive.booleanOrNull == true, pic?.scene ?: false)
            assertEquals(o.getValue("a").jsonPrimitive.booleanOrNull == true, pic?.a ?: false)
        }
    }

    @Test fun rolloutModeMatchesWeb() {
        assertEquals(vimg.getValue("defaultPct").jsonPrimitive.int, VImg.DEFAULT_PCT)
        for (c in vimg.getValue("mode").jsonArray) { val o = c.jsonObject
            assertEquals(o.toString(), o.getValue("mode").jsonPrimitive.int, VImg.mode(any(o["vocab_img"]), any(o["vocab_img_pct"]), o.getValue("bucket").jsonPrimitive.int)) }
    }

    @Test fun speakingSimilarityMatchesWeb() {
        val s = load("lesson.json").getValue("similarity").jsonObject
        assertEquals(s.getValue("pass").jsonPrimitive.int, Speaking.PASS)
        for (c in s.getValue("cases").jsonArray) { val o = c.jsonObject
            val sim = Speaking.similarity(o.getValue("heard").jsonPrimitive.content, o.getValue("target").jsonPrimitive.content)
            assertEquals(o.toString(), o.getValue("sim").jsonPrimitive.content.toDouble(), sim, 1e-9)
            assertEquals(o.toString(), o.getValue("score").jsonPrimitive.int, Speaking.percent(sim)) }
    }
}
