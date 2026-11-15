package com.lexkite.app.core.content

import com.lexkite.app.core.data.LexStore
import com.lexkite.app.core.sync.B64
import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.SyncCodec
import com.lexkite.app.core.sync.SyncMerge
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import java.io.ByteArrayOutputStream
import java.math.BigInteger
import java.security.KeyFactory
import java.security.Signature
import java.security.spec.X509EncodedKeySpec

/** What one app build understands (append-only snapshots, like scripts/native/content-schema.mjs APPS). */
data class AppSchema(val maxSchema: Map<String, Int>, val blocks: Set<String>) {
    companion object {
        /** This build (2.0.0): the Today blocks it can render natively. */
        val CURRENT = AppSchema(mapOf("today" to 1, "modules" to 1, "banner" to 1), setOf("streak", "goal", "continue", "review"))
        const val VERSION = "2.0.0"
    }
}

data class ContentResult(val ok: Boolean, val reason: String? = null, val schemaNewer: Boolean = false, val value: JsonObject? = null)

/**
 * Server-driven content (spec §4 "updates without store review"): signed JSON only, rendered by built-in native components – never code.
 * Port of the reference reader scripts/native/content-schema.mjs (verified by vectors/compat.json): unknown fields ignored, missing or
 * wrong-typed fields → defaults, unknown block types skipped, newer schema read best-effort, minApp too new / bad signature rejected.
 * Signature: ECDSA P-256 / SHA-256, raw r||s base64 over the canon string (same scheme + key as the web OTA, web/js/ota-key.js).
 */
object ContentReader {
    const val KIND = "lexkite-content-v1"
    private data class F(val t: String, val d: JsonElement)
    private fun str(d: String = "") = F("string", JsonPrimitive(d)); private fun int(d: Long = 0) = F("int", JsonPrimitive(d))
    private fun bool(d: Boolean) = F("bool", JsonPrimitive(d)); private fun strs(vararg d: String) = F("strings", JsonArray(d.map { JsonPrimitive(it) }))
    private val MODULES = listOf("home", "vocab", "skills", "tests", "me")
    private val FIELDS: Map<String, LinkedHashMap<String, F>> = mapOf(
        "today" to linkedMapOf("greetingKey" to str("home.greeting"), "blocks" to F("blocks", JsonArray(emptyList())), "maxBlocks" to int(8)),
        "modules" to linkedMapOf("order" to strs(*MODULES.toTypedArray()), "hidden" to strs()),
        "banner" to linkedMapOf("id" to str(), "kind" to str("info"), "titleKey" to str(), "bodyKey" to str(), "route" to str(), "from" to int(), "to" to int(), "priority" to int(), "dismissible" to bool(true)),
    )
    private val BLOCK = linkedMapOf("id" to str(), "type" to str(), "titleKey" to str(), "route" to str())
    private val BLOCK_EXTRA = mapOf("word" to linkedMapOf("word" to str()), "banner" to linkedMapOf("bannerId" to str()), "goal" to linkedMapOf("target" to int(20)))

    private fun isInt(v: JsonElement?) = Js.isNumber(v) && Js.num(v).let { !it.isInfinite() && it == Math.floor(it) }
    private fun coerce(f: F, v: JsonElement?): JsonElement = when (f.t) {
        "string" -> if (Js.isString(v)) v!! else f.d
        "int" -> if (isInt(v)) v!! else f.d
        "bool" -> if (v is JsonPrimitive && !v.isString && v.booleanOrNull != null) v else f.d
        "strings" -> if (v is JsonArray && v.all { Js.isString(it) }) v else f.d
        else -> f.d
    }

    fun model(type: String, body: JsonElement?, app: AppSchema): JsonObject {
        val out = LinkedHashMap<String, JsonElement>()
        for ((k, f) in FIELDS.getValue(type)) {
            if (f.t != "blocks") { out[k] = coerce(f, Js.prop(body, k)); continue }
            val list = (Js.prop(body, k) as? JsonArray) ?: emptyList()
            out[k] = JsonArray(list.filter { it is JsonObject && (it["type"] as? JsonPrimitive)?.takeIf { p -> p.isString }?.content in app.blocks }.map { b ->
                val o = LinkedHashMap<String, JsonElement>(); val type0 = ((b as JsonObject)["type"] as JsonPrimitive).content
                for ((bk, bf) in BLOCK + (BLOCK_EXTRA[type0] ?: emptyMap())) o[bk] = coerce(bf, b[bk])
                JsonObject(o)
            })
        }
        if (type == "today") { val max = Js.num(out["maxBlocks"]).toLong().coerceAtLeast(0); out["blocks"] = JsonArray((out["blocks"] as JsonArray).take(max.coerceAtMost(Int.MAX_VALUE.toLong()).toInt())) }
        if (type == "modules") {
            val seen = LinkedHashSet<String>()
            for (m in (out["order"] as JsonArray).map { (it as JsonPrimitive).content }) if (m in MODULES) seen.add(m)
            for (m in MODULES) seen.add(m)
            out["order"] = JsonArray(seen.map { JsonPrimitive(it) })
            out["hidden"] = JsonArray((out["hidden"] as JsonArray).filter { val m = (it as JsonPrimitive).content; m in MODULES && m != "home" })
        }
        return JsonObject(out)
    }

    fun cmpVer(a: String, b: String): Int {
        fun p(s: String) = s.split('.', '-').take(3).map { x -> x.takeWhile { it.isDigit() || it == '-' }.toIntOrNull() ?: 0 }
        val x = p(a); val y = p(b)
        for (i in 0 until 3) { val u = x.getOrElse(i) { 0 }; val v = y.getOrElse(i) { 0 }; if (u != v) return if (u < v) -1 else 1 }
        return 0
    }

    fun canon(e: JsonObject): String = listOf(KIND, Js.stringify(e["type"]).trim('"'), Js.numStr(Js.num(e["schema"])), (e["minApp"] as JsonPrimitive).content,
        (e["version"] as JsonPrimitive).content, SyncCodec.sha256Hex(SyncMerge.stable(e["body"]))).joinToString("\n")

    fun verify(e: JsonObject, spkiB64: String): Boolean = runCatching {
        val sig = B64.decode((e["signature"] as? JsonPrimitive)?.content ?: return false)
        if (sig.size != 64) return false
        val key = KeyFactory.getInstance("EC").generatePublic(X509EncodedKeySpec(B64.decode(spkiB64)))
        Signature.getInstance("SHA256withECDSA").run { initVerify(key); update(canon(e).toByteArray(Charsets.UTF_8)); verify(der(sig)) }
    }.getOrDefault(false)

    /** IEEE P1363 r||s → ASN.1 DER SEQUENCE { INTEGER r, INTEGER s } for java.security. */
    private fun der(raw: ByteArray): ByteArray {
        fun int(b: ByteArray): ByteArray { val v = BigInteger(1, b).toByteArray(); return byteArrayOf(0x02, v.size.toByte()) + v }
        val body = int(raw.copyOfRange(0, 32)) + int(raw.copyOfRange(32, 64))
        return ByteArrayOutputStream().apply { write(0x30); write(body.size); write(body) }.toByteArray()
    }

    fun read(text: String, app: AppSchema, appVersion: String, spkiB64: String): ContentResult {
        val e = runCatching { Json.parseToJsonElement(text) }.getOrNull() ?: return ContentResult(false, "corrupt")
        if (e !is JsonObject || (e["kind"] as? JsonPrimitive)?.content != KIND || !Js.isString(e["kind"])) return ContentResult(false, "kind")
        val type = (e["type"] as? JsonPrimitive)?.takeIf { it.isString }?.content
        if (type == null || type !in FIELDS) return ContentResult(false, "type")
        val schema = e["schema"]
        if (!isInt(schema) || Js.num(schema) < 1 || !Js.isString(e["minApp"]) || !Js.isString(e["version"]) || !(e["body"] is JsonObject || e["body"] is JsonArray)) return ContentResult(false, "corrupt")
        if (!verify(e, spkiB64)) return ContentResult(false, "badsig")
        if (cmpVer((e["minApp"] as JsonPrimitive).content, appVersion) > 0) return ContentResult(false, "minApp")
        return ContentResult(true, null, Js.num(schema) > (app.maxSchema[type] ?: 0), model(type, e["body"], app))
    }
}

/**
 * Fetch + cache of signed content: a valid document replaces the cache; anything invalid keeps the LAST GOOD copy, else the
 * built-in default (= the starter layout). Never blocks the UI; offline → cache.
 */
class ContentRepo(private val store: LexStore, private val http: Http, private val spki: String = OTA_KEY, private val base: String = BASE) {
    suspend fun cached(type: String): JsonObject? = store.get(KEY + type) as? JsonObject
    suspend fun refresh(type: String): JsonObject? {
        val r = runCatching { http.send(Http.Req("GET", "$base$type.json")) }.getOrNull()
        if (r != null && r.ok) {
            val res = ContentReader.read(r.text, AppSchema.CURRENT, AppSchema.VERSION, spki)
            if (res.ok && res.value != null) { store.put(mapOf(KEY + type to res.value), local = false); return res.value }
        }
        return cached(type)
    }
    companion object {
        const val KEY = "_content:"
        const val BASE = "https://lexkite.com/native/content/"
        /** = web/js/ota-key.js LK_OTA_KEY (same signer as the web OTA). */
        const val OTA_KEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAELaFDqiC5eRKLrUlxec3oe+6Bl4Wr1s6QaYgnEBYJSI29mZ90aZioOdpDzD8l7hlWUoVRE6yTaHzHQhETvfoUHA=="
    }
}
