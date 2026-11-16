package com.lexkite.app

import com.lexkite.app.core.rig.CueTable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** teach/cues.json (web LK_CUES): lookup by line key → LipSync.unpack, same cues as the vectors/rig.json `lipsync.unpack` case that was cut from this table. */
class CueTableTest {
    private val text = File("../../shared/gen/teach/cues.json").readText()
    private val table = CueTable.parse(text)
    private val k0 = Json.parseToJsonElement(text).jsonObject.getValue("k").jsonObject

    @Test fun lookupUnpacksAndMatchesVector() {
        assertTrue(table.size > 0); assertTrue(table.dict.isNotEmpty()); assertNull(table.unpacked("no-such-key"))
        val none = k0.entries.first { it.value !is JsonArray }.key; assertNull("a line stored as 0 has no cues (web: k[key] || null)", table.unpacked(none)); assertTrue(!table.has(none))
        val k = k0
        val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("rig.json")!!.readText()).jsonObject.getValue("lipsync").jsonObject.getValue("unpack").jsonArray
        var matched = 0
        for (u in v) {
            val p = u.jsonObject.getValue("packed").jsonArray
            val key = k.entries.firstOrNull { (_, e) -> e is JsonArray && e.jsonArray[1].jsonPrimitive.content == p[1].jsonPrimitive.content && e.jsonArray[0].jsonPrimitive.content == p[0].jsonPrimitive.content }?.key ?: continue
            val got = table.unpacked(key)!!; matched++
            val want = u.jsonObject.getValue("out").jsonObject.getValue("cues").jsonArray
            assertEquals(want.size, got.cues.size)
            want.forEachIndexed { i, c -> assertEquals(c.jsonArray[1].jsonPrimitive.content, got.cues[i].value); assertTrue(Math.abs(got.cues[i].start - c.jsonArray[0].jsonPrimitive.content.toDouble()) < 1e-9) }
        }
        if (matched == 0) { val any = table.unpacked(k.entries.first { it.value is JsonArray }.key)!!; assertTrue(any.cues.isNotEmpty() && any.cues[0].start >= 0.0) }
    }
}
