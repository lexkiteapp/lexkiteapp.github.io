package com.lexkite.app.core.sync

import com.lexkite.app.core.migration.MigrationImport
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** The English library index (web IELTS_DATA.INDEX, lexicon packs js/lib/…): lower-case word → library entry. */
fun interface Lexicon {
    fun entry(lowerWord: String): JsonObject?
    companion object { val NONE = Lexicon { null } }
}

/**
 * Port of the card helpers of web/js/core.js (Cards.make, normalize, SRS.newState, Cards.add/remove) and web/js/sync.js
 * (slim/fat), so a native install stores and sends byte-identical cards. `now` is injected (vectors use a fixed clock).
 * Without lexicon data a library card (`L:1`) stays in its slim form – never invented, never stripped.
 */
object WebCards {
    val LIB_FIELDS = listOf("ipa", "pos", "vi", "def", "ex", "col", "syn", "level", "emoji", "topic")
    private val EMPTY_ARR = JsonArray(emptyList())
    private fun s(e: JsonElement?, d: String = ""): JsonElement = if (Js.truthy(e)) e!! else JsonPrimitive(d)

    fun newState(now: Long) = JsonObject(linkedMapOf("ef" to JsonPrimitive(2.5), "interval" to Js.ZERO, "reps" to Js.ZERO, "lapses" to Js.ZERO, "due" to JsonPrimitive(now), "last" to JsonNull, "step" to Js.ZERO))

    /** Cards.make(entry, extra) */
    fun make(entry: JsonObject, now: Long, extra: Map<String, JsonElement> = emptyMap()): JsonObject {
        val o = LinkedHashMap<String, JsonElement>()
        o["word"] = entry["word"] ?: JsonNull
        for (k in listOf("ipa", "ipaUS", "pos", "vi", "def", "ex")) o[k] = s(entry[k])
        o["col"] = if (Js.truthy(entry["col"])) entry["col"]!! else EMPTY_ARR
        o["syn"] = if (Js.truthy(entry["syn"])) entry["syn"]!! else EMPTY_ARR
        o["level"] = s(entry["level"]); o["topic"] = s(entry["topic"], "mine"); o["emoji"] = s(entry["emoji"], "📘"); o["image"] = s(entry["image"])
        o["imageCredit"] = if (Js.truthy(entry["imageCredit"])) entry["imageCredit"]!! else JsonNull
        o["audio"] = s(entry["audio"])
        o["sentences"] = JsonArray(((entry["sentences"] as? JsonArray) ?: emptyList()).take(2))
        o["contexts"] = EMPTY_ARR; o["note"] = JsonPrimitive(""); o["added"] = JsonPrimitive(now); o["srs"] = newState(now)
        val tl = entry["tl"]; if (Js.truthy(tl) && (tl as? JsonPrimitive)?.content != "en") o["tl"] = tl!!
        o.putAll(extra)
        return JsonObject(o)
    }

    private fun libOf(c: JsonObject, lex: Lexicon): JsonObject? =
        if (Js.truthy(c["tl"])) null else (c["word"] as? JsonPrimitive)?.takeIf { it.isString }?.let { lex.entry(it.content.lowercase()) }

    /** sync.js slim(c) */
    fun slim(c: JsonObject, lex: Lexicon): JsonObject {
        val lib = libOf(c, lex)
        val o = LinkedHashMap(c)
        o.remove("sentences"); o.remove("ipaUS")
        if (lib != null) { for (k in LIB_FIELDS) if (Js.stringify(o[k]) == Js.stringify(lib[k]) && (o[k] == null) == (lib[k] == null)) o.remove(k); o["L"] = JsonPrimitive(1) }
        val ctx = o["contexts"]; if (!Js.truthy(ctx) || (ctx as? JsonArray)?.isEmpty() == true) o.remove("contexts")
        for (k in listOf("note", "image", "audio")) if (!Js.truthy(o[k])) o.remove(k)
        return JsonObject(o)
    }

    /** sync.js fat(o): `{ ...Cards.make(lib || o), ...o }` without L, contexts defaulted. L card with unknown library → kept slim. */
    fun fat(o: JsonObject, lex: Lexicon, now: Long): JsonObject {
        val isLib = Js.truthy(o["L"]) && !Js.truthy(o["tl"])
        val lib = if (isLib) (o["word"] as? JsonPrimitive)?.let { lex.entry(it.content.lowercase()) } else null
        if (isLib && lib == null) return o
        val c = LinkedHashMap<String, JsonElement>(make(lib ?: o, now)); c.putAll(o); c.remove("L")
        if (!Js.truthy(c["contexts"])) c["contexts"] = EMPTY_ARR
        return JsonObject(c)
    }

    /** core.js normalize(map) – re-key, merge duplicates, drop invalid, fill defaults (clock = now). */
    fun normalize(map: Map<String, JsonElement>, now: Long): LinkedHashMap<String, JsonObject> {
        val m = LinkedHashMap<String, JsonObject>()
        for ((k, v) in map) { val c = v as? JsonObject; if (c != null) m[k] = c }
        val order = map.keys.toList()
        for (k in order) {
            if (!map.containsKey(k)) continue
            var c = m[k]
            if (c == null || !Js.truthy(c["word"])) { m.remove(k); continue }
            val nk = MigrationImport.cardKey(c) ?: run { m.remove(k); continue }
            var at = k
            if (nk != k) {
                val other = m[nk]
                m.remove(k)
                if (other != null && SyncMerge.activity(other) >= SyncMerge.activity(c)) { m[nk] = unite(other, c); continue }
                if (other != null) c = unite(c, other)
                m[nk] = c; at = nk
            }
            m[at] = defaults(c, now)
        }
        // entries renamed into a key processed earlier were filled there; fill any left (e.g. winner `other` kept as-is)
        for ((k, c) in m.entries.toList()) if (c["srs"] == null || c["contexts"] !is JsonArray) m[k] = defaults(c, now)
        return m
    }
    private fun unite(win: JsonObject, lose: JsonObject): JsonObject {
        val wc = (win["contexts"] as? JsonArray).orEmpty(); val lc = (lose["contexts"] as? JsonArray).orEmpty()
        return JsonObject(LinkedHashMap(win).apply { put("contexts", JsonArray((wc + lc.filter { x -> wc.none { y -> Js.strictEq(Js.prop(y, "text"), Js.prop(x, "text")) } }).take(5))) })
    }
    private fun defaults(c: JsonObject, now: Long): JsonObject {
        val o = LinkedHashMap(c)
        for (k in listOf("contexts", "col", "syn", "sentences")) if (o[k] !is JsonArray) o[k] = EMPTY_ARR
        o["srs"] = JsonObject(LinkedHashMap<String, JsonElement>(newState(now)).apply { putAll(Js.spread(Js.or(c["srs"], Js.EMPTY))) })
        if (!Js.truthy(o["added"])) o["added"] = JsonPrimitive(now)
        val img = o["image"]
        if (Js.truthy(img) && !Js.truthy(o["imageCredit"]) && Regex("wikipedia|wikimedia").containsMatchIn((img as? JsonPrimitive)?.content ?: "")) o["image"] = JsonPrimitive("")
        return JsonObject(o)
    }

    /** Cards.add(entry) then shallow patch + mod (the edit op of every client); clears the tombstone. */
    fun add(cards: Map<String, JsonObject>, deleted: Map<String, JsonElement>, entry: JsonObject, patch: JsonObject, now: Long): Pair<Map<String, JsonObject>, Map<String, JsonElement>> {
        val m = normalize(cards, now)
        val key = MigrationImport.cardKey(entry) ?: return cards to deleted
        var card = m[key]
        if (card == null) card = make(entry, now)
        else {
            val o = LinkedHashMap(card)
            if (!Js.truthy(o["image"]) && Js.truthy(entry["image"])) o["imageCredit"] = Js.or(entry["imageCredit"], JsonNull)!!
            for (k in listOf("ipa", "ipaUS", "pos", "vi", "def", "ex", "image", "audio", "level")) if (!Js.truthy(o[k]) && Js.truthy(entry[k])) o[k] = entry[k]!!
            if (((o["sentences"] as? JsonArray) ?: emptyList()).isEmpty() && entry["sentences"] is JsonArray) o["sentences"] = JsonArray((entry["sentences"] as JsonArray).take(2))
            card = JsonObject(o)
        }
        val o = LinkedHashMap(card); o["mod"] = JsonPrimitive(now); o.putAll(patch); o["mod"] = JsonPrimitive(now)
        m[key] = JsonObject(o)
        return m to deleted.filterKeys { it != key }
    }

    fun remove(cards: Map<String, JsonObject>, deleted: Map<String, JsonElement>, key: String, now: Long): Pair<Map<String, JsonObject>, Map<String, JsonElement>> =
        cards.filterKeys { it != key } to LinkedHashMap(deleted).apply { put(key, JsonPrimitive(now)) }
}
