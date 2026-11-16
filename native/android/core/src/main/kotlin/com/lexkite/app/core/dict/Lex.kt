package com.lexkite.app.core.dict

import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.s
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import java.text.Normalizer

/** One lexicon shard (web /data/lex/c/<hash>.json): entries `e`, irregular forms `r` (form -> base), accent-folded `f` (folded -> key), words with audio `a`, phrases `p`. */
class LexShard(val e: Map<String, JsonObject>, val r: Map<String, String> = emptyMap(), val f: Map<String, String> = emptyMap(), val a: Set<String> = emptySet(), val p: Map<String, JsonArray> = emptyMap())

/** Where the lexicon comes from: network shards ([HttpLexSource]) or the bundled word library ([IndexLexSource], same normalisation). */
interface LexSource {
    /** The shard that holds (or would hold) key `k`; null = unavailable (offline, not cached). */
    suspend fun shardFor(k: String): LexShard?
    /** Up to `n` entries whose normalised key starts with `prefix`, sorted by key. */
    suspend fun keysFrom(prefix: String, n: Int): List<Pair<String, JsonObject>>
    /** Native-language meaning `[meaning, flag, trust]` of `key` (or `key#sub` for a secondary part of speech). */
    suspend fun meaning(key: String, lang: String, sub: String?): JsonArray? = null
}

/**
 * Lex (port of web/js/lex.js): one-source word lookup. `get` normalises, then tries exact -> accent-folded -> irregular (shard `r`) -> stemming rules -> phrasal-verb heads
 * ("gave them back" -> "give back"). `via` tells which; `from` is the typed form when the entry is for another form.
 */
class Lex(private val source: LexSource) {
    class Hit(val entry: JsonObject, val key: String, val via: String, val from: String, val au: Boolean, val mean: JsonArray?, val means: Map<String, JsonArray> = emptyMap())
    private class R(val entry: JsonObject, val key: String, val via: String, val from: String?, val sh: LexShard?)

    suspend fun get(raw: String?, lang: String = ""): Hit? {
        val r = resolve(raw ?: "") ?: return null
        val mean = meaningOf(r.key, lang, null)
        val means = LinkedHashMap<String, JsonArray>()
        if (lang.isNotEmpty()) for (m in r.entry.ga("more")) { val pos = (m as? JsonObject).gs("pos"); meaningOf(r.key, lang, pos)?.let { means[pos] = it } }
        return Hit(r.entry, r.key, r.via, r.from ?: "", r.sh?.a?.contains(r.key) == true, mean, means)
    }
    private suspend fun meaningOf(key: String, lang: String, sub: String?): JsonArray? = if (lang.isEmpty() || lang == "vi" || lang == "en") null else runCatching { source.meaning(key, lang, sub) }.getOrNull()

    private suspend fun look(k: String): Pair<LexShard?, JsonObject?> { val sh = source.shardFor(k); return sh to sh?.e?.get(k) }

    private suspend fun resolve(raw: String): R? {
        val b = norm(raw); if (b.isEmpty()) return null
        val tries = arrayListOf(b); val e2 = edge(b); if (e2.isNotEmpty() && e2 != b) tries.add(e2)
        for (k in tries) {
            val (sh, entry) = look(k)
            if (entry != null) return R(entry, k, "exact", null, sh)
            val fk0 = sh?.f?.get(fold(k))
            if (fk0 != null) { val (s2, e) = look(fk0); if (e != null) return R(e, fk0, "fold", null, s2) }
            val fk = fold(k); if (fk != k) { val (s2, e) = look(fk); if (e != null) return R(e, fk, "fold", null, s2) }
            val rk = sh?.r?.get(k)
            if (rk != null) { val (s2, e) = look(rk); if (e != null) return R(e, rk, "irregular", k, s2) }
        }
        val w = e2.ifEmpty { b }; val parts = w.split(" ")
        if (parts.size == 1) {
            for (s in stems(w)) { val (sh, e) = look(s); if (e != null) return R(e, s, "rule", w, sh) }
            return null
        }
        if (parts.size <= 4) {
            val tail = parts.drop(1); val rest = tail.filterIndexed { i, x -> !(OBJ.matches(x) && i < tail.size - 1) }
            val heads = arrayListOf(parts[0]); val (hsh, _) = look(parts[0]); hsh?.r?.get(parts[0])?.let { heads.add(it) }; heads.addAll(stems(parts[0]))
            for (hd in heads) for (t in listOf(rest, tail)) { val k = (listOf(hd) + t).joinToString(" "); if (k == w) continue; val (sh, e) = look(k); if (e != null) return R(e, k, "phrasal", w, sh) }
        }
        return null
    }

    /** Prefix suggestions for the search box: `{key, word, vi, pos, entry}`. */
    suspend fun suggest(q: String?, n: Int = 6): List<JsonObject> {
        val k = norm(q ?: ""); if (k.isEmpty()) return emptyList()
        return source.keysFrom(k, n).map { (key, e) -> com.lexkite.app.core.vocab.jo("key" to key, "word" to e["word"], "vi" to e["vi"], "pos" to e["pos"], "entry" to e) }
    }
    /** Phrases containing the word (<= 8, from the word's shard): `{word, vi, ex}`; null when no shard is available. */
    suspend fun phrases(raw: String?): List<JsonObject>? {
        val r = resolve(raw ?: "") ?: return emptyList()
        val sh = r.sh ?: return null
        return (sh.p[r.key] ?: JsonArray(emptyList())).map { v -> val a = v as JsonArray; com.lexkite.app.core.vocab.jo("word" to a.getOrNull(0).s(), "vi" to a.getOrNull(1).s(), "ex" to a.getOrNull(2).s()) }
    }

    companion object {
        private val QUOTES = Regex("[’‘ʼ`´′]"); private val DASHES = Regex("[‐‑‒–—―−]"); private val SPACES = Regex("[\\s\\u00a0\\u200b]+")
        private val OBJ = Regex("^(it|them|him|her|me|us|you|this|that|something|someone|sth|sb)$")
        private val DBL = Regex("([b-df-hj-np-tv-z])\\1\\z")
        /** web Lex.norm: NFC, lower-case, quotes -> ', dashes -> -, spaces collapsed. */
        fun norm(s: String): String = SPACES.replace(Normalizer.normalize(s, Normalizer.Form.NFC).lowercase().replace(QUOTES, "'").replace(DASHES, "-"), " ").trim()
        /** café -> cafe */
        fun fold(s: String): String = Normalizer.normalize(Normalizer.normalize(s, Normalizer.Form.NFD).replace(Regex("[\\u0300-\\u036f]"), ""), Normalizer.Form.NFC)
        /** "(word)." -> word */
        fun edge(s: String): String = s.replace(Regex("^[^\\p{L}\\p{N}]+|[^\\p{L}\\p{N}]+\\z"), "")
        /** Candidate base forms by suffix rules (irregular forms live in the shard data). */
        fun stems(w: String): List<String> {
            val out = ArrayList<String>()
            fun add(x: String) { if (x.isNotEmpty() && x.length > 1 && x != w && !out.contains(x)) out.add(x) }
            fun cut(n: Int) = w.substring(0, maxOf(0, w.length - n))
            if (Regex("[^aeiou]ies\\z").containsMatchIn(w)) add(cut(3) + "y")
            if (Regex("(s|x|z|ch|sh|o)es\\z").containsMatchIn(w)) add(cut(2))
            if (Regex("[^s]s\\z").containsMatchIn(w) && !Regex("(us|is|ss)\\z").containsMatchIn(w)) add(cut(1))
            if (Regex("ves\\z").containsMatchIn(w)) { add(cut(3) + "f"); add(cut(3) + "fe") }
            if (Regex("[^aeiou]ied\\z").containsMatchIn(w)) add(cut(3) + "y")
            if (w.endsWith("ed")) { val s = cut(2); if (DBL.containsMatchIn(s)) add(s.dropLast(1)); add(cut(1)); add(s) }
            if (w.endsWith("ing") && w.length > 4) { val s = cut(3); if (DBL.containsMatchIn(s)) add(s.dropLast(1)); add(s); add(s + "e"); if (s.endsWith("y")) add(s.dropLast(1) + "ie") }
            if (Regex("[^aeiou]ier\\z").containsMatchIn(w)) add(cut(3) + "y")
            if (Regex("[^aeiou]iest\\z").containsMatchIn(w)) add(cut(4) + "y")
            if (w.endsWith("er") && w.length > 4) { val s = cut(2); if (DBL.containsMatchIn(s)) add(s.dropLast(1)); add(s); add(cut(1)) }
            if (w.endsWith("est") && w.length > 5) { val s = cut(3); if (DBL.containsMatchIn(s)) add(s.dropLast(1)); add(s); add(cut(2)) }
            if (w.endsWith("'s")) add(cut(2))
            return out
        }
        /** Past and participle spellings of one irregular-verb entry (`past`/`pp` are `[{w,tag}]` or "a/b:UK" strings). */
        fun formsOf(v: JsonObject): List<String> = listOf(v["past"], v["pp"]).flatMap { x -> if (x is JsonArray) x.toList() else listOf(x) }
            .flatMap { y -> if (y is JsonObject) listOf(y["w"].s()) else y.s().split("/") }.map { it.replace(Regex(":.*"), "").trim().lowercase() }.filter { it.isNotEmpty() }
    }
}

/** The bundled word library as a lexicon: same normalisation + irregular forms from the verb tables (web `fbShard`). */
class IndexLexSource(index: Map<String, JsonObject>, irregulars: List<JsonObject> = emptyList()) : LexSource {
    private val shard: LexShard
    private val sorted: List<String>
    init {
        val e = LinkedHashMap<String, JsonObject>(); val f = HashMap<String, String>(); val r = HashMap<String, String>()
        for ((k, v) in index) { val n = Lex.norm(k); if (!e.containsKey(n)) e[n] = v; val fd = Lex.fold(n); if (fd != n && !f.containsKey(fd)) f[fd] = n }
        for (v in irregulars) for (x in Lex.formsOf(v)) if (x.isNotEmpty() && !e.containsKey(x) && e.containsKey(v["base"].s())) r[x] = v["base"].s()
        shard = LexShard(e, r, f)
        sorted = e.keys.sorted()
    }
    override suspend fun shardFor(k: String): LexShard? = shard
    override suspend fun keysFrom(prefix: String, n: Int): List<Pair<String, JsonObject>> = sorted.filter { it.startsWith(prefix) }.take(n).map { it to shard.e.getValue(it) }
}

/** Network lexicon: `/data/lex-index.json` -> shards `/data/lex/c/<hash>.json` (cached in memory; add a disk cache by wrapping [Http]). */
class HttpLexSource(private val http: Http, private val base: String = "https://lexkite.com") : LexSource {
    private var idx: JsonObject? = null
    private val mem = HashMap<String, JsonObject>()
    private suspend fun json(path: String, noCache: Boolean = false): JsonObject? {
        if (!noCache) mem[path]?.let { return it }
        val r = runCatching { http.send(Http.Req("GET", base + path, if (noCache) mapOf("Cache-Control" to "no-cache") else emptyMap())) }.getOrNull() ?: return null
        if (!r.ok) return null
        val o = runCatching { Json.parseToJsonElement(r.text).jsonObject }.getOrNull() ?: return null
        if (!noCache) mem[path] = o
        return o
    }
    private suspend fun index(): JsonObject? = idx ?: json("/data/lex-index.json", noCache = true).also { idx = it }
    private fun pick(list: JsonArray, k: String): Int { var lo = 0; var hi = list.size - 1; var ans = 0; while (lo <= hi) { val m = (lo + hi) shr 1; if (list[m].jsonArray[0].s() <= k) { ans = m; lo = m + 1 } else hi = m - 1 }; return ans }
    private fun shard(o: JsonObject): LexShard = LexShard(
        (o["e"] as? JsonObject)?.mapNotNull { (k, v) -> (v as? JsonObject)?.let { k to it } }?.toMap() ?: emptyMap(),
        (o["r"] as? JsonObject)?.mapValues { it.value.s() } ?: emptyMap(), (o["f"] as? JsonObject)?.mapValues { it.value.s() } ?: emptyMap(),
        o.ga("a").map { it.s() }.toSet(), (o["p"] as? JsonObject)?.mapNotNull { (k, v) -> (v as? JsonArray)?.let { k to it } }?.toMap() ?: emptyMap())
    override suspend fun shardFor(k: String): LexShard? {
        val c = index()?.get("c") as? JsonArray ?: return null
        return json("/data/lex/c/" + c[pick(c, k)].jsonArray[1].s() + ".json")?.let { shard(it) }
    }
    override suspend fun keysFrom(prefix: String, n: Int): List<Pair<String, JsonObject>> {
        val c = index()?.get("c") as? JsonArray ?: return emptyList()
        val out = ArrayList<Pair<String, JsonObject>>(); var i = pick(c, prefix)
        while (i < c.size && out.size < n) {
            val sh = json("/data/lex/c/" + c[i].jsonArray[1].s() + ".json")?.let { shard(it) } ?: break
            for (key in sh.e.keys.sorted()) if (key.startsWith(prefix) && out.size < n && out.none { it.first == key }) out.add(key to sh.e.getValue(key))
            i++; if (!(i < c.size && c[i].jsonArray[0].s().startsWith(prefix))) break
        }
        return out
    }
    override suspend fun meaning(key: String, lang: String, sub: String?): JsonArray? {
        val ix = index() ?: return null; val c = ix["c"] as? JsonArray ?: return null
        val h = (ix["l"] as? JsonObject)?.get(lang).s().ifEmpty { return null }
        val g = (ix["g"] as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt()?.takeIf { it > 0 } ?: 1
        val o = json("/data/lex/$lang/$h-${pick(c, key) / g}.json") ?: return null
        return o[if (sub != null) "$key#$sub" else key] as? JsonArray
    }
}
