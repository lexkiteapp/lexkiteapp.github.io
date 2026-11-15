package com.lexkite.app

import com.lexkite.app.core.content.AppSchema
import com.lexkite.app.core.content.ContentReader
import com.lexkite.app.core.migration.MigrationImport
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.SyncDoc
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** C03 – Capacitor → native import reproduces what the web Store would read from the same IndexedDB/localStorage (vectors/migration.json). */
class MigrationTest {
    private val v = Vectors.load("migration.json")
    private val now = v["now"]!!.jsonPrimitive.long
    private val lex = Vectors.lexicon(v)

    @Test fun parity_C03() {
        val cases = v["cases"]!!.jsonArray
        assertTrue(cases.size >= 5)
        for (c in cases) {
            val o = c.jsonObject; val name = o["name"]!!.jsonPrimitive.content
            val imp = MigrationImport.parse(o["export"]!!.jsonObject, now)
            val got = MigrationImport.readBack(imp, now, lex)
            val exp = o["expect"]!!.jsonObject
            for (k in exp.keys) Vectors.same("$name · $k", exp[k], got[k])
        }
    }

    @Test fun importIntoNonEmptyDeviceMergesNeverOverwrites() {
        val o = v["cases"]!!.jsonArray.first { it.jsonObject["name"]!!.jsonPrimitive.content.startsWith("typical") }.jsonObject
        val imp = MigrationImport.parse(o["export"]!!.jsonObject, now)
        val newer = imp.doc.cards.entries.first().let { (k, c) -> k to JsonObject(LinkedHashMap(c).apply { put("note", JsonPrimitive("edited on native")); put("mod", JsonPrimitive(now + 1000)) }) }
        val device = SyncDoc(cards = mapOf(newer), stats = SyncDoc.DEFAULT_STATS, settings = Js.EMPTY, settingsAt = Js.ZERO)
        val out = MigrationImport.into(device, imp.doc, now + 2000)
        assertEquals("edited on native", (out.cards.getValue(newer.first)["note"] as JsonPrimitive).content)
        assertTrue(imp.doc.cards.keys.all { it in out.cards })
    }
}

/** Server-driven content (spec §4): signed JSON read exactly like scripts/native/content-schema.mjs (vectors/compat.json). */
class CompatTest {
    private val v = Vectors.load("compat.json")
    private val key = v["testKeySpki"]!!.jsonPrimitive.content
    private val apps = v["apps"]!!.jsonObject.mapValues { (_, a) -> a.jsonObject.let { o ->
        AppSchema(o["maxSchema"]!!.jsonObject.mapValues { it.value.jsonPrimitive.int }, o["blocks"]!!.jsonArray.map { it.jsonPrimitive.content }.toSet()) } }

    @Test fun oldAndNewAppsReadEveryDocument() {
        for (c in v["cases"]!!.jsonArray) {
            val o = c.jsonObject; val app = o["app"]!!.jsonPrimitive.content; val name = "${o["name"]!!.jsonPrimitive.content} @ $app"
            val r = ContentReader.read(o["doc"]!!.jsonPrimitive.content, apps.getValue(app), app, key)
            val e = o["expect"]!!.jsonObject
            assertEquals(name, e["ok"]!!.jsonPrimitive.booleanOrNull, r.ok)
            if (r.ok) { assertEquals(name, e["schemaNewer"]?.jsonPrimitive?.booleanOrNull ?: false, r.schemaNewer); Vectors.same(name, e["value"], r.value) }
            else assertEquals(name, e["reason"]!!.jsonPrimitive.content, r.reason)
        }
    }

    @Test fun thisBuildMatchesTheShippedSnapshot() {
        val shipped = apps.getValue(AppSchema.VERSION)
        assertEquals(shipped, AppSchema.CURRENT)
        assertFalse(ContentReader.verify(JsonObject(mapOf("kind" to JsonPrimitive(ContentReader.KIND))), key))
    }
}
