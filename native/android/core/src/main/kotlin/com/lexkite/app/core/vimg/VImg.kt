package com.lexkite.app.core.vimg

import com.lexkite.app.core.sync.Http
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.File

/** Word pictures (web/js/vocab-img.js, VImg v3), verified by vectors/vimg.json: key `word#pos`, shard by FNV, rollout by flag + fixed device bucket. */
object VImg {
    const val HEAD_URL = "https://lexkite.com/js/lexicon-img.json"
    const val SHARD_URL = "https://lexkite.com/js/vimg/"
    const val DEFAULT_PCT = 10

    private val N = Regex("^(n|noun)\\b|^danh"); private val PHRV = Regex("^(phr ?v|phrasal)|^cụm động"); private val V = Regex("^(v|verb)\\b|^động")
    private val ADJ = Regex("^adj|^tính"); private val ADV = Regex("^adv|^trạng")
    /** VImg.pos – same normalisation as scripts/lexicon/lib.mjs normPos. */
    fun pos(p: String?): String { val x = (p ?: "").lowercase().trim(); return if (N.containsMatchIn(x)) "n" else if (PHRV.containsMatchIn(x)) "phrv" else if (V.containsMatchIn(x)) "v" else if (ADJ.containsMatchIn(x)) "adj" else if (ADV.containsMatchIn(x)) "adv" else x }
    fun key(word: String?, pos: String?) = (word ?: "").trim().lowercase() + "#" + pos(pos)

    /** FNV-1a 32-bit over the code points of the lower-cased word, % n (must equal scripts/build-lexicon.mjs imgSh). */
    fun shard(word: String?, n: Int): Int {
        var h = 0x811c9dc5.toInt()
        val s = (word ?: "").trim().lowercase()
        var i = 0
        while (i < s.length) { val cp = s.codePointAt(i); h = (h xor cp) * 0x01000193; i += Character.charCount(cp) }
        return ((h.toLong() and 0xFFFFFFFFL) % n).toInt()
    }

    private fun on1(v: Any?) = v == true || (v is Number && v.toDouble() == 1.0) || v == "1" || v == "true"
    private fun off1(v: Any?) = v == false || (v is Number && v.toDouble() == 0.0) || v == "0" || v == "false"
    /** Rollout: 1 on · 0 off · −1 staged (on only when the head says `on`). [flag]: config vocab_img (null/"" = unset), [pct]: vocab_img_pct, [bucket]: fixed per-device 0–99. */
    fun mode(flag: Any?, pct: Any?, bucket: Int): Int {
        val p = (pct as? Number)?.toDouble() ?: (pct as? String)?.takeIf { it.isNotEmpty() }?.toDoubleOrNull()
        val pc = p?.coerceIn(0.0, 100.0) ?: DEFAULT_PCT.toDouble()
        if (off1(flag)) return 0
        if (on1(flag)) return 1
        return if (bucket < pc) -1 else 0
    }

    class Head(val base: String, val n: Int, val on: Boolean)
    class Shard(val m: Map<String, String>, val scene: Set<String>, val transparent: Set<String>)
    class Pic(val url: String, val scene: Boolean, val a: Boolean)

    fun parseHead(text: String): Head? = (runCatching { Json.parseToJsonElement(text) }.getOrNull() as? JsonObject)?.let { o ->
        val base = (o["base"] as? JsonPrimitive)?.content ?: return null
        Head(base, (o["n"] as? JsonPrimitive)?.content?.toIntOrNull() ?: 0, (o["on"] as? JsonPrimitive)?.content == "true")
    }
    fun parseShard(text: String): Shard? = (runCatching { Json.parseToJsonElement(text) }.getOrNull() as? JsonObject)?.let { o ->
        fun set(k: String) = ((o[k] as? JsonArray) ?: emptyList<kotlinx.serialization.json.JsonElement>()).map { (it as JsonPrimitive).content }.toSet()
        Shard(((o["m"] as? JsonObject) ?: JsonObject(emptyMap())).mapValues { (it.value as JsonPrimitive).content }, set("s"), set("a"))
    }
    /** Lookup in loaded data: null when the exact word#pos has no picture. */
    fun pic(head: Head, shard: Shard?, word: String, pos: String?): Pic? {
        val k = key(word, pos); val sh = shard ?: return null; val h = sh.m[k] ?: return null
        return Pic(head.base + h + ".webp", k in sh.scene, k in sh.transparent)
    }
}

/**
 * Loads the head + only the shards of the words in a lesson (disk cache; offline falls back to the cache), then answers synchronously.
 * [mode] is evaluated per [prepare] from remote config + the persisted device bucket.
 */
class VImgStore(private val http: Http, private val dir: File, private val mode: suspend () -> Int) {
    @Volatile private var head: VImg.Head? = null
    private val shards = java.util.concurrent.ConcurrentHashMap<Int, VImg.Shard>()
    @Volatile var enabled = false; private set

    private suspend fun text(url: String, name: String): String? = withContext(Dispatchers.IO) {
        val f = File(dir, name)
        val r = withTimeoutOrNull(4000) { runCatching { http.send(Http.Req("GET", url)) }.getOrNull() }
        if (r != null && r.ok) { runCatching { dir.mkdirs(); f.writeBytes(r.body) }; r.text } else if (f.exists()) runCatching { f.readText() }.getOrNull() else null
    }

    /** Fetch what [words] need. Returns whether pictures are on for this device. */
    suspend fun prepare(words: List<String>): Boolean {
        val m = mode(); if (m == 0) { enabled = false; return false }
        val h = head ?: text(VImg.HEAD_URL, "head.json")?.let(VImg::parseHead)?.also { head = it }
        if (h == null) { enabled = false; return false }
        enabled = m == 1 || h.on
        if (!enabled || h.n <= 0) return enabled
        coroutineScope { words.map { VImg.shard(it, h.n) }.toSet().filter { !shards.containsKey(it) }.map { id ->
            async { text(VImg.SHARD_URL + "%02d.json".format(id), "s%02d.json".format(id))?.let(VImg::parseShard)?.let { shards[id] = it } }
        }.awaitAll() }
        return true
    }

    /** Picture for the lesson: only the exact word#pos, never a scene picture (needs an example sentence), and in dark mode never a cream-background one (a == false). */
    fun urlFor(word: String, pos: String?, dark: Boolean): String? {
        val h = head ?: return null; if (!enabled || h.n <= 0) return null
        val p = VImg.pic(h, shards[VImg.shard(word, h.n)], word, pos) ?: return null
        return if (p.scene || (dark && !p.a)) null else p.url
    }
}
