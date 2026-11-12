package com.lexkite.app.core.data

import androidx.room.withTransaction
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.core.sync.SyncMerge
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * The local source of truth (offline-first). Same keys as the web IndexedDB `kv` store: `cards` live in their own table,
 * everything else in `kv`. All read-modify-write goes through [mutate] under one lock (web Cards.mutate / serial), so a sync merge
 * never overwrites an answer written while waiting for the network.
 */
class LexStore(private val db: LexDb) {
    private val lock = Mutex()
    private val _version = MutableStateFlow(0L)
    /** Bumped after every committed write – screens recompute from [doc]. */
    val version: StateFlow<Long> = _version
    /** Called after local (non-sync) writes so the sync scheduler can batch a push (web Sync.schedule). */
    @Volatile var onLocalChange: (() -> Unit)? = null

    suspend fun doc(): SyncDoc {
        val cards = LinkedHashMap<String, JsonObject>()
        for (r in db.cards().all()) (parse(r.json) as? JsonObject)?.let { cards[r.key] = it }
        val kv = db.kv().all().associate { it.k to parse(it.json) }
        return SyncDoc(cards, (kv[K_DELETED] as? JsonObject) ?: emptyMap(), kv[K_STATS], kv[K_GAME], kv[K_SETTINGS], kv[K_SETTINGS_AT])
    }

    suspend fun get(k: String): JsonElement? = db.kv().get(k)?.let(::parse)
    suspend fun put(values: Map<String, JsonElement?>, local: Boolean = true) {
        lock.withLock {
            db.withTransaction {
                val (del, set) = values.entries.partition { it.value == null }
                if (set.isNotEmpty()) db.kv().put(set.map { KvEntity(it.key, Js.stringify(it.value)) })
                if (del.isNotEmpty()) db.kv().delete(del.map { it.key })
            }
            _version.value++
        }
        if (local) onLocalChange?.invoke()
    }

    /** Atomic read-modify-write of the whole learning document; only changed rows are written. */
    suspend fun mutate(local: Boolean = true, fn: (SyncDoc) -> SyncDoc): SyncDoc {
        val out = lock.withLock {
            val before = doc()
            val after = fn(before)
            write(before, after)
            _version.value++
            after
        }
        if (local) onLocalChange?.invoke()
        return out
    }

    /** Merge a remote document in (sync pull / migration import). Never deletes local data except by tombstone rules. */
    suspend fun mergeIn(remote: SyncDoc, now: Long?): SyncDoc = mutate(local = false) { SyncMerge.mergeWire(it, remote, now ?: System.currentTimeMillis(), lexicon) }
    /** English library for fat/slim (web lexicon packs) – plugged in with the dictionary (M3); NONE keeps library cards slim. */
    @Volatile var lexicon: com.lexkite.app.core.sync.Lexicon = com.lexkite.app.core.sync.Lexicon.NONE

    private suspend fun write(before: SyncDoc, after: SyncDoc) = db.withTransaction {
        val up = ArrayList<CardEntity>()
        for ((k, c) in after.cards) { val old = before.cards[k]; if (old == null || Js.stringify(old) != Js.stringify(c)) up.add(row(k, c)) }
        val gone = before.cards.keys.filter { it !in after.cards }
        if (up.isNotEmpty()) up.chunked(500).forEach { db.cards().upsert(it) }
        if (gone.isNotEmpty()) gone.chunked(500).forEach { db.cards().delete(it) }
        val kv = ArrayList<KvEntity>(); val rm = ArrayList<String>()
        fun set(k: String, b: JsonElement?, a: JsonElement?) { if (a == null) { if (b != null) rm.add(k) } else if (b == null || Js.stringify(a) != Js.stringify(b)) kv.add(KvEntity(k, Js.stringify(a))) }
        set(K_DELETED, JsonObject(before.deleted), JsonObject(after.deleted))
        set(K_STATS, before.stats, after.stats); set(K_GAME, before.game, after.game)
        set(K_SETTINGS, before.settings, after.settings); set(K_SETTINGS_AT, before.settingsAt, after.settingsAt)
        if (kv.isNotEmpty()) db.kv().put(kv)
        if (rm.isNotEmpty()) db.kv().delete(rm)
    }

    companion object {
        const val K_STATS = "stats"; const val K_GAME = "game"; const val K_SETTINGS = "settings"; const val K_SETTINGS_AT = "settingsAt"; const val K_DELETED = "deleted"
        const val K_MISTAKES = "mistakes"; const val K_PULLED = "pulledHashes"; const val K_LAST_UID = "lastUid"; const val K_BACKUP = "acctBackup"; const val K_PAUSED = "syncPausedUntil"
        private val json = Json { ignoreUnknownKeys = true }
        fun parse(s: String): JsonElement = json.parseToJsonElement(s)

        /** Index columns derived from the card JSON (web Core.Cards: srs.due/last/reps, activity = max(srs.last, mod, added)). */
        fun row(key: String, c: JsonObject): CardEntity {
            val srs = c["srs"]
            fun long(e: JsonElement?) = Js.num(e).let { if (it.isNaN()) 0L else it.toLong() }
            return CardEntity(
                key = key, word = (c["word"] as? kotlinx.serialization.json.JsonPrimitive)?.content ?: key,
                tl = (c["tl"] as? kotlinx.serialization.json.JsonPrimitive)?.takeIf { it.isString }?.content,
                due = long(Js.prop(srs, "due")), reps = long(Js.prop(srs, "reps")).toInt(), last = long(Js.prop(srs, "last")),
                activity = SyncMerge.activity(c).let { if (it.isNaN()) 0L else it.toLong() }, json = Js.stringify(c),
            )
        }
    }
}
