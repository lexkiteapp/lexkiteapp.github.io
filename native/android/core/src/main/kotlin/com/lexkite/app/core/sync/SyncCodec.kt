package com.lexkite.app.core.sync

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.security.MessageDigest
import java.util.zip.GZIPInputStream
import java.util.zip.GZIPOutputStream

/** Wire helpers shared with web/js/sync.js (D1) and web/js/sync-drive.js (Drive) – same buckets, hashes, bodies, envelopes. */
object SyncCodec {
    const val NB = 32
    const val DRIVE_KIND = "lexkite-sync"
    const val DRIVE_SCHEMA = 2

    /** FNV-1a over UTF-16 units → bucket (`bucketOf`). */
    fun bucketOf(k: String): Int {
        var x = 2166136261L.toInt()
        for (ch in k) { x = x xor ch.code; x *= 16777619 }
        return ((x.toLong() and 0xFFFFFFFFL) % NB).toInt()
    }

    /** `hash(str)` = Java-style 31-hash (int32) + ':' + length. */
    fun hash(s: String): String { var h = 0; for (ch in s) h = h * 31 + ch.code; return "$h:${s.length}" }

    /** `slim(c)` – see [WebCards.slim]; production has no lexicon in M1 (library cards stay slim with L:1). */
    fun slim(c: JsonObject, lex: Lexicon = Lexicon.NONE): JsonObject = WebCards.slim(c, lex)

    fun gzip(s: String): ByteArray = ByteArrayOutputStream().also { b -> GZIPOutputStream(b).use { it.write(s.toByteArray(Charsets.UTF_8)) } }.toByteArray()
    fun gunzip(b: ByteArray): String = GZIPInputStream(ByteArrayInputStream(b)).use { it.readBytes().toString(Charsets.UTF_8) }
    fun isGzip(b: ByteArray) = b.size >= 2 && b[0] == 0x1f.toByte() && b[1] == 0x8b.toByte()

    /** `docBody(json)` → `{ z: base64(gzip) }` when smaller, else `{ json }`. */
    fun docBody(json: String): JsonObject {
        val z = B64.encode(gzip(json))
        return JsonObject(if (z.length < json.length) mapOf("z" to JsonPrimitive(z)) else mapOf("json" to JsonPrimitive(json)))
    }
    /** `docText(d)` */
    fun docText(d: JsonElement?): String {
        val o = d as? JsonObject ?: return ""
        (o["z"] as? JsonPrimitive)?.takeIf { it.isString && it.content.isNotEmpty() }?.let { return gunzip(B64.decode(it.content)) }
        return (o["json"] as? JsonPrimitive)?.content ?: ""
    }

    fun sha256Hex(s: String): String = MessageDigest.getInstance("SHA-256").digest(s.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }

    /** Drive envelope `pack(snap)`: gzip(JSON { kind, v, sha, data }). */
    fun pack(snap: JsonObject): ByteArray {
        val data = Js.stringify(snap)
        val env = JsonObject(linkedMapOf("kind" to JsonPrimitive(DRIVE_KIND), "v" to JsonPrimitive(DRIVE_SCHEMA), "sha" to JsonPrimitive(sha256Hex(data)), "data" to JsonPrimitive(data)))
        return gzip(Js.stringify(env))
    }

    class Corrupt(why: String) : Exception("corrupt $why")
    class Newer(val v: Int) : Exception("newer schema $v")

    /** Drive `unpack(u8)` with the same integrity rules (gzip/plain, envelope, schema, SHA-256, shape). */
    fun unpack(b: ByteArray): JsonObject {
        val txt = try { if (isGzip(b)) gunzip(b) else b.toString(Charsets.UTF_8) } catch (e: Exception) { throw Corrupt("gzip") }
        val env = try { Json.parseToJsonElement(txt) as? JsonObject } catch (e: Exception) { throw Corrupt("json") } ?: throw Corrupt("envelope")
        val data = (env["data"] as? JsonPrimitive)?.takeIf { it.isString }?.content
        val v = Js.num(env["v"])
        if ((env["kind"] as? JsonPrimitive)?.content != DRIVE_KIND || data == null || !(v >= 1)) throw Corrupt("envelope")
        if (v > DRIVE_SCHEMA) throw Newer(v.toInt())
        if (sha256Hex(data) != (env["sha"] as? JsonPrimitive)?.content) throw Corrupt("sha")
        val snap = try { Json.parseToJsonElement(data) as? JsonObject } catch (e: Exception) { throw Corrupt("data") }
        if (snap == null || snap["cards"] !is JsonObject) throw Corrupt("shape")
        return snap
    }

    /** `snapLocal()` – the Drive snapshot of this device. */
    fun snapshot(d: SyncDoc, now: Long): JsonObject {
        val cards = LinkedHashMap<String, JsonElement>(); for (k in d.cards.keys.sorted()) cards[k] = slim(d.cards.getValue(k))
        return JsonObject(linkedMapOf(
            "v" to JsonPrimitive(2), "at" to JsonPrimitive(now), "cards" to JsonObject(cards),
            "deleted" to JsonObject(SyncMerge.pruneDel(d.deleted, now)), "stats" to (d.stats ?: SyncDoc.DEFAULT_STATS),
            "game" to JsonObject(SyncMerge.gameGet(d.game).let { g -> LinkedHashMap<String, JsonElement>(g).apply { put("questsDone", Js.EMPTY) } }), "settings" to (d.settings ?: Js.EMPTY), "settingsAt" to (d.settingsAt ?: Js.ZERO),
        ))
    }
    /** `{ ...game, questsDone: {} }` (quests are per device). */
    fun gameForWire(g: JsonElement?): JsonObject? = if (!Js.truthy(g)) null else JsonObject(Js.spread(g).apply { put("questsDone", Js.EMPTY) })
    /** `snapHash(s) = hash(stable({ ...s, at: 0 }))` */
    fun snapHash(s: JsonObject): String = hash(SyncMerge.stable(JsonObject(LinkedHashMap(s).apply { put("at", Js.ZERO) })))

    /** Remote snapshot/meta (Drive snap or D1 meta) → SyncDoc for [SyncMerge.merge]. */
    fun remoteDoc(o: JsonObject, cards: Map<String, JsonObject>? = null): SyncDoc = SyncDoc.from(o).let { if (cards != null) it.copy(cards = cards) else it }
}

/** RFC 4648 base64 (java.util.Base64 needs API 26; minSdk is 24; android.util.Base64 is not available in JVM tests). Same as btoa/atob. */
object B64 {
    private const val A = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    private val R = IntArray(128) { -1 }.also { r -> A.forEachIndexed { i, c -> r[c.code] = i } }
    fun encode(b: ByteArray): String {
        val sb = StringBuilder((b.size + 2) / 3 * 4)
        var i = 0
        while (i + 2 < b.size) { val n = (b[i].toInt() and 255 shl 16) or (b[i + 1].toInt() and 255 shl 8) or (b[i + 2].toInt() and 255); sb.append(A[n shr 18]).append(A[n shr 12 and 63]).append(A[n shr 6 and 63]).append(A[n and 63]); i += 3 }
        val left = b.size - i
        if (left == 1) { val n = b[i].toInt() and 255 shl 16; sb.append(A[n shr 18]).append(A[n shr 12 and 63]).append("==") }
        if (left == 2) { val n = (b[i].toInt() and 255 shl 16) or (b[i + 1].toInt() and 255 shl 8); sb.append(A[n shr 18]).append(A[n shr 12 and 63]).append(A[n shr 6 and 63]).append('=') }
        return sb.toString()
    }
    fun decode(s: String): ByteArray {
        val out = ByteArrayOutputStream(s.length * 3 / 4)
        var acc = 0; var bits = 0
        for (c in s) {
            if (c == '=') break
            val v = if (c.code < 128) R[c.code] else -1
            if (v < 0) { if (c.isWhitespace()) continue; throw IllegalArgumentException("bad base64") }
            acc = (acc shl 6) or v; bits += 6
            if (bits >= 8) { bits -= 8; out.write(acc shr bits and 255) }
        }
        return out.toByteArray()
    }
}
