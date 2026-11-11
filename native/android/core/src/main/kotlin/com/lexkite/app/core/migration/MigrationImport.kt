package com.lexkite.app.core.migration

import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.Lexicon
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.core.sync.SyncMerge
import com.lexkite.app.core.sync.WebCards
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * C03 import half (pure, JVM-tested against native/shared/gen/vectors/migration.json). Input = the JSON returned by
 * native/shared/gen/migration-export.js in the old Capacitor WebView: `{ kind:'lexkite-capacitor-export', v, prefix:'ielts.',
 * idb:{ lexkite:{ 'ielts.cards': {...} }, vocaband:{...} }, ls:{ 'ielts.stats': '<json>', 'lk.x': '…' } }`.
 * It replays web/js/core.js Store.get exactly (IndexedDB big keys merged with a newer localStorage copy per card mod, legacy
 * "vocaband" keys copied when missing, broken JSON → the default, sandbox/dictionary caches already skipped by the export).
 * [Imported.extra] keeps every other learner key verbatim (nothing is lost).
 */
data class Imported(val doc: SyncDoc, val extra: Map<String, JsonElement>) {
    val empty get() = doc.cards.isEmpty() && extra.isEmpty() && doc.stats == null && doc.game == null && doc.settings == null && doc.deleted.isEmpty()
}

object MigrationImport {
    private val WS = Regex("[\\s\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+")
    private val DOC = setOf("cards", "deleted", "stats", "game", "settings", "settingsAt")
    private val BIG = setOf("cards", "dcIndex", "sentences")

    /** web Core keyOf(w) */
    fun keyOf(w: String): String = w.lowercase().replace('’', '\'').replace('‘', '\'').replace('`', '\'').replace(WS, " ").trim(' ')
    /** web Core cardKey(c) = (tl && tl !== 'en' ? tl + ':' : '') + keyOf(word) */
    fun cardKey(c: JsonObject): String? {
        val w = (c["word"] as? JsonPrimitive)?.takeIf { Js.truthy(it) }?.content ?: return null
        val tl = (c["tl"] as? JsonPrimitive)?.takeIf { it.isString && it.content.isNotEmpty() && it.content != "en" }?.content
        return (if (tl != null) "$tl:" else "") + keyOf(w)
    }

    /** Emulates Core.Store over the export. */
    class OldStore(export: JsonObject) {
        val prefix = (export["prefix"] as? JsonPrimitive)?.content ?: "ielts."
        val ls: Map<String, String> = (export["ls"] as? JsonObject)?.mapValues { (it.value as? JsonPrimitive)?.content ?: Js.stringify(it.value) } ?: emptyMap()
        val idb: Map<String, JsonElement> = run {
            val dbs = export["idb"] as? JsonObject
            val main = LinkedHashMap<String, JsonElement>((dbs?.get("lexkite") as? JsonObject) ?: Js.EMPTY)
            if (ls["lk.idbMoved"] == null) for ((k, v) in (dbs?.get("vocaband") as? JsonObject) ?: Js.EMPTY) if (!main.containsKey(k)) main[k] = v // migrateOldDb: copy missing keys only
            main
        }
        private fun parse(raw: String): JsonElement? = runCatching { Json.parseToJsonElement(raw) }.getOrNull()

        /** Store.get(key, fallback) – any parse error returns the fallback, like the web try/catch. */
        fun get(key: String, fallback: JsonElement?): JsonElement? {
            val raw = ls[prefix + key]
            if (key in BIG) {
                var v = idb[prefix + key]
                if (!raw.isNullOrEmpty()) {
                    val old = parse(raw) ?: return fallback
                    v = if (v is JsonObject && old is JsonObject) {
                        val m = LinkedHashMap<String, JsonElement>(v)
                        for ((k, c) in old) { val mine = m[k]; if (!Js.truthy(mine) || Js.num(Js.or(Js.prop(c, "mod"), Js.ZERO)) > Js.num(Js.or(Js.prop(mine, "mod"), Js.ZERO))) m[k] = c }
                        JsonObject(m)
                    } else old
                }
                return v ?: fallback
            }
            if (raw.isNullOrEmpty()) return fallback
            return parse(raw) ?: fallback
        }
        /** Every key the old install had under the prefix (IndexedDB + localStorage). */
        fun keys(): Set<String> = (idb.keys + ls.keys).filter { it.startsWith(prefix) }.map { it.removePrefix(prefix) }.toSet()
    }

    /** export → device document (fat, normalised cards like web Cards.all) + other keys. */
    fun parse(export: JsonObject, now: Long): Imported {
        val st = OldStore(export)
        val cards = WebCards.normalize((st.get("cards", Js.EMPTY) as? JsonObject) ?: Js.EMPTY, now)
        val doc = SyncDoc(cards, (st.get("deleted", Js.EMPTY) as? JsonObject) ?: emptyMap(), st.get("stats", null), st.get("game", null), st.get("settings", null), st.get("settingsAt", null))
        val extra = LinkedHashMap<String, JsonElement>()
        for (k in st.keys()) if (k !in DOC) st.get(k, null)?.let { extra[k] = it }
        for ((k, v) in st.ls) if (!k.startsWith(st.prefix)) extra["_ls:$k"] = JsonPrimitive(v) // lk.* device keys (not learner data, kept for later milestones)
        return Imported(doc, extra)
    }

    /** What the native store reads back afterwards, in the vector "expect" form: wire Doc + pulledHashes. */
    fun readBack(imp: Imported, now: Long, lex: Lexicon): JsonObject {
        val w = SyncMerge.wire(imp.doc, now, lex).toJson()
        return JsonObject(LinkedHashMap<String, JsonElement>(w).apply { put("pulledHashes", (imp.extra["pulledHashes"] as? JsonObject) ?: Js.EMPTY) })
    }

    /** Imported doc onto the device: empty device → taken as is; otherwise the sync merge (newer edits win), settings kept if the device has none. */
    fun into(local: SyncDoc, imported: SyncDoc, now: Long): SyncDoc {
        if (local.cards.isEmpty() && local.deleted.isEmpty() && local.stats == null && local.game == null && local.settings == null) return imported
        val m = SyncMerge.mergeWire(local, imported, now)
        return if (local.settings == null && imported.settings != null) m.copy(settings = imported.settings, settingsAt = imported.settingsAt) else m
    }
}
