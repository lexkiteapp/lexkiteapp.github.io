package com.lexkite.app.core.sync

import com.lexkite.app.core.data.LexStore
import kotlinx.coroutines.delay
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Quota pause from /api/sync (429 not "too-fast"): same pause rule as web `pauseMs`. */
class QuotaPause(val retrySec: Double) : Exception("quota")

/**
 * Cloudflare D1 path – the exact request/response shapes of web/js/sync.js ↔ functions/api/sync.js:
 *   pull { op:'pull', have:{cards_i: hash} } → { docs:{ meta:{chunks, updated, hs, z|json}, cards_i:{z|json} } }
 *   push { op:'push', docs:{ meta:{h, body}, cards_i:{h, body[, x:1]} } }
 * Cards are bucketed by FNV-1a into 32 chunks; only chunks whose hash changed are sent.
 */
class D1Sync(private val http: Http, private val endpoint: String = ENDPOINT) {
    /** `sentHashes` – per process like web (reset on sign-out / account delete). */
    val sent = HashMap<String, String>()

    suspend fun api(body: JsonObject, token: String, tries: Int = 0): JsonObject {
        val r = http.send(Http.Req("POST", endpoint, mapOf("Content-Type" to "application/json", "Authorization" to "Bearer $token"), Js.stringify(body).toByteArray()))
        if (r.status == 429) {
            val j = runCatching { Json.parseToJsonElement(r.text) as? JsonObject }.getOrNull() ?: Js.EMPTY
            val err = (j["error"] as? JsonPrimitive)?.content; val msg = (j["msg"] as? JsonPrimitive)?.content
            if ((err == "too-fast" || msg == "quota.burst") && tries < 2) {
                val w = Js.num(j["wait"]).let { if (it.isNaN() || it == 0.0) 5.0 else it }
                delay((minOf(30.0, w + 1) * 1000).toLong()); return api(body, token, tries + 1)
            }
            throw QuotaPause(Js.num(j["retry"]).let { if (it.isNaN()) 0.0 else it })
        }
        if (!r.ok) throw HttpError(r.status)
        return Json.parseToJsonElement(r.text) as JsonObject
    }

    /** pullMerge0: fetch changed docs, merge into the store, remember hashes. Returns whether the account had cloud data. */
    suspend fun pull(store: LexStore, uid: String, token: String, now: Long): Boolean {
        val pulledAll = (store.get(LexStore.K_PULLED) as? JsonObject) ?: Js.EMPTY
        val have = (pulledAll[uid] as? JsonObject) ?: Js.EMPTY
        val docs = (api(JsonObject(mapOf("op" to JsonPrimitive("pull"), "have" to have)), token)["docs"] as? JsonObject) ?: Js.EMPTY
        val meta = docs["meta"] as? JsonObject ?: return false
        val hs = (meta["hs"] as? JsonObject) ?: Js.EMPTY
        val remoteCards = LinkedHashMap<String, JsonObject>()
        val chunks = Js.num(meta["chunks"]).let { if (it.isNaN()) 0 else it.toInt() }
        for (i in 0 until chunks) {
            val k = "cards_$i"
            val d = docs[k]
            if (d == null) { (hs[k] as? JsonPrimitive)?.takeIf { it.content.isNotEmpty() }?.let { sent[k] = it.content }; continue }
            val txt = SyncCodec.docText(d)
            val part = (if (txt.isEmpty()) Js.EMPTY else Json.parseToJsonElement(txt) as? JsonObject) ?: Js.EMPTY
            for ((w, v) in part) (v as? JsonObject)?.let { remoteCards[w] = it }
            sent[k] = SyncCodec.hash(txt)
        }
        val mt = SyncCodec.docText(meta)
        val remote = (if (mt.isEmpty()) Js.EMPTY else Json.parseToJsonElement(mt) as? JsonObject) ?: Js.EMPTY
        store.mergeIn(SyncCodec.remoteDoc(remote, remoteCards), now)
        if (meta["hs"] is JsonObject) store.put(mapOf(LexStore.K_PULLED to JsonObject(LinkedHashMap(pulledAll).apply { put(uid, hs) })), local = false)
        return true
    }

    /** push0: send changed card chunks + meta. Returns the number of docs written. */
    suspend fun push(store: LexStore, uid: String, token: String, now: Long): Int {
        val d = store.doc()
        val parts = List(SyncCodec.NB) { LinkedHashMap<String, JsonElement>() }
        for (k in d.cards.keys.sorted()) parts[SyncCodec.bucketOf(k)][k] = SyncCodec.slim(d.cards.getValue(k))
        val out = LinkedHashMap<String, JsonElement>(); val pending = HashMap<String, String>(); var writes = 0
        for (i in 0 until SyncCodec.NB) {
            val part = JsonObject(parts[i]); val json = Js.stringify(part); val h = SyncCodec.hash(json); val k = "cards_$i"
            if (sent[k] == h) continue
            val o = linkedMapOf<String, JsonElement>("h" to JsonPrimitive(h), "body" to JsonPrimitive(Js.stringify(SyncCodec.docBody(json))))
            if (part.values.any { Js.prop(it, "ctx") != null }) o["x"] = JsonPrimitive(1)
            out[k] = JsonObject(o); pending[k] = h; writes++
        }
        val hs = LinkedHashMap<String, JsonElement>(); for (i in 0 until SyncCodec.NB) { val k = "cards_$i"; hs[k] = JsonPrimitive(pending[k] ?: sent[k] ?: "") }
        val meta = Js.stringify(JsonObject(linkedMapOf(
            "stats" to (d.stats ?: SyncDoc.DEFAULT_STATS), "game" to JsonObject(Js.spread(d.game).apply { put("questsDone", Js.EMPTY) }),
            "settings" to (d.settings ?: Js.EMPTY), "settingsAt" to (d.settingsAt ?: Js.ZERO), "deleted" to JsonObject(SyncMerge.pruneDel(d.deleted, now)),
        )))
        val mh = SyncCodec.hash(meta + SyncCodec.NB)
        if (sent["meta"] != mh || writes > 0) {
            val body = LinkedHashMap<String, JsonElement>(); body["chunks"] = JsonPrimitive(SyncCodec.NB); body["updated"] = JsonPrimitive(now); body["hs"] = JsonObject(hs); body.putAll(SyncCodec.docBody(meta))
            out["meta"] = JsonObject(mapOf("h" to JsonPrimitive(mh), "body" to JsonPrimitive(Js.stringify(JsonObject(body))))); pending["meta"] = mh; writes++
        }
        if (writes > 0) {
            api(JsonObject(mapOf("op" to JsonPrimitive("push"), "docs" to JsonObject(out))), token)
            val pulledAll = (store.get(LexStore.K_PULLED) as? JsonObject) ?: Js.EMPTY
            store.put(mapOf(LexStore.K_PULLED to JsonObject(LinkedHashMap(pulledAll).apply { put(uid, JsonObject(hs)) })), local = false)
        }
        sent.putAll(pending) // only after the commit succeeded
        return writes
    }

    companion object {
        const val ENDPOINT = "https://lexkite.com/api/sync"
        /** web `pauseMs(retry, rnd)` */
        fun pauseMs(retry: Double, rnd: Double = Math.random()): Long = (if (retry > 0) minOf(6 * 3600e3, (retry + 60 + rnd * 1200) * 1000) else 6 * 3600e3).toLong()
    }
}
