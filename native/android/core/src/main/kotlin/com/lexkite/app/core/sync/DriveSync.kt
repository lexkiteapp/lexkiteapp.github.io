package com.lexkite.app.core.sync

import com.lexkite.app.core.data.LexStore
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Google Drive appDataFolder path – port of one sync cycle of web/js/sync-drive.js: same file names, gzip envelope
 * { kind, v, sha, data }, version check before download, verify-after-write (size), daily rotating backups bak0..2,
 * corrupt main → renamed (never deleted) + every readable backup merged, newer schema → never overwritten.
 * Daily call budget (cfg.cap units) like web; state persisted per uid in the kv store (`_drive:<uid>`).
 */
class DriveSync(private val http: Http, private val cap: Int = 1200) {
    enum class Result { OK, NEWER, NO_TOKEN, NO_SCOPE, BUDGET, RETRY }

    suspend fun cycle(store: LexStore, uid: String, token: String?, now: Long): Result {
        val st = load(store, uid)
        if (Js.num(st["nextAt"]) > now) return Result.RETRY
        if (Js.truthy(st["newer"])) return Result.NEWER
        if (token == null) return Result.NO_TOKEN
        try {
            if (!Js.truthy(st["listed"])) list(st, token, now)
            var remoteVer = ""; var remoteHash = ""; var repair = false
            if (Js.truthy(st["pendingRestore"])) { restore(store, st, token, now); repair = true }
            var fileId = str(st["fileId"])
            if (fileId.isNotEmpty()) {
                spend(st, "get", now)
                try { remoteVer = Js.prop(json(call("GET", "$DRIVE/$fileId?fields=version", token)), "version").let { Js.stringify(it).trim('"') } }
                catch (e: HttpError) { if (e.status != 404) throw e; fileId = ""; st["fileId"] = JsonPrimitive(""); st["ver"] = JsonPrimitive("") }
            }
            if (fileId.isNotEmpty() && remoteVer != str(st["ver"])) {
                try {
                    val remote = SyncCodec.unpack(download(st, fileId, token, now))
                    apply(store, remote, now); remoteHash = SyncCodec.snapHash(remote); st["ver"] = JsonPrimitive(remoteVer)
                } catch (e: SyncCodec.Newer) { st["newer"] = JsonPrimitive(e.v); save(store, uid, st); return Result.NEWER }
                catch (e: SyncCodec.Corrupt) { recover(store, uid, st, token, now); repair = true; fileId = "" }
            }
            st["newer"] = Js.ZERO
            val snap = SyncCodec.snapshot(store.doc(), now); val h = SyncCodec.snapHash(snap)
            if (h == remoteHash) st["hash"] = JsonPrimitive(h)
            if (repair || fileId.isEmpty() || h != str(st["hash"])) {
                val body = SyncCodec.pack(snap)
                val j = try { write(st, fileId, NAME, body, token, now) } catch (e: PartialWrite) { e.id?.let { st["fileId"] = JsonPrimitive(it); st["ver"] = JsonPrimitive("partial") }; throw e }
                st["fileId"] = JsonPrimitive(str(j["id"])); st["ver"] = JsonPrimitive(Js.stringify(j["version"]).trim('"')); st["hash"] = JsonPrimitive(h)
                val today = day(now)
                if (str(st["bakDay"]) != today) {
                    val slot = ((now / 86_400_000L) % NBAK).toInt()
                    val bak = Js.spread(st["bak"])
                    try { val b = write(st, str(bak[slot.toString()]), bakName(slot), body, token, now); bak[slot.toString()] = JsonPrimitive(str(b["id"])); st["bak"] = JsonObject(bak); st["bakDay"] = JsonPrimitive(today) }
                    catch (e: HttpError) { if (e.status == 401) throw e } catch (e: Budget) { /* backup must never break the main write */ } catch (e: PartialWrite) { }
                }
            }
            st["fail"] = Js.ZERO; st["nextAt"] = Js.ZERO; st["okAt"] = JsonPrimitive(now); st["scope"] = JsonPrimitive("ok")
            save(store, uid, st); return Result.OK
        } catch (e: Budget) { save(store, uid, st); return Result.BUDGET }
        catch (e: HttpError) {
            if (e.status == 401) { save(store, uid, st); return Result.NO_TOKEN }
            if (e.status == 403 && Regex("insufficient|PERMISSION_DENIED", RegexOption.IGNORE_CASE).containsMatchIn(e.reason)) { st["scope"] = JsonPrimitive("no"); save(store, uid, st); return Result.NO_SCOPE }
            return fail(store, uid, st, now)
        } catch (e: Exception) { return fail(store, uid, st, now) }
    }

    private suspend fun fail(store: LexStore, uid: String, st: MutableMap<String, JsonElement>, now: Long): Result {
        val n = Js.num(st["fail"]).let { if (it.isNaN()) 0 else it.toInt() } + 1
        st["fail"] = JsonPrimitive(n); st["nextAt"] = JsonPrimitive(now + backoff(n)); save(store, uid, st); return Result.RETRY
    }

    private suspend fun apply(store: LexStore, remote: JsonObject, now: Long) { store.mergeIn(SyncCodec.remoteDoc(remote), now) }

    private suspend fun list(st: MutableMap<String, JsonElement>, token: String, now: Long) {
        spend(st, "list", now)
        val q = URLEncoder.encode("name contains '$PREFIX' and trashed=false", "UTF-8").replace("+", "%20")
        val files = (json(call("GET", "$DRIVE?spaces=appDataFolder&q=$q&fields=files(id,name,version)&pageSize=50", token))["files"] as? kotlinx.serialization.json.JsonArray) ?: emptyList()
        val main = files.filter { str(Js.prop(it, "name")) == NAME }.maxByOrNull { Js.num(Js.prop(it, "version")) }
        st["fileId"] = JsonPrimitive(main?.let { str(Js.prop(it, "id")) } ?: ""); st["ver"] = JsonPrimitive("")
        val bak = LinkedHashMap<String, JsonElement>()
        for (i in 0 until NBAK) files.firstOrNull { str(Js.prop(it, "name")) == bakName(i) }?.let { bak[i.toString()] = JsonPrimitive(str(Js.prop(it, "id"))) }
        st["bak"] = JsonObject(bak); st["listed"] = JsonPrimitive(1)
    }

    private suspend fun recover(store: LexStore, uid: String, st: MutableMap<String, JsonElement>, token: String, now: Long) {
        val id = str(st["fileId"])
        if (id.isNotEmpty()) { spend(st, "update", now); call("PATCH", "$DRIVE/$id?fields=id", token, Js.stringify(JsonObject(mapOf("name" to JsonPrimitive(CORRUPT)))).toByteArray(), "application/json") }
        st["fileId"] = JsonPrimitive(""); st["ver"] = JsonPrimitive(""); st["pendingRestore"] = JsonPrimitive(1)
        save(store, uid, st) // flag saved BEFORE downloading backups: interrupted restore resumes next cycle
        restore(store, st, token, now)
    }

    private suspend fun restore(store: LexStore, st: MutableMap<String, JsonElement>, token: String, now: Long) {
        val bak = Js.spread(st["bak"])
        for (i in bak.keys.toList()) {
            try { apply(store, SyncCodec.unpack(download(st, str(bak[i]), token, now)), now) }
            catch (e: HttpError) { if (e.status == 404) { bak.remove(i); continue }; throw e }
            catch (e: SyncCodec.Corrupt) { continue } catch (e: SyncCodec.Newer) { continue }
        }
        st["bak"] = JsonObject(bak); st["pendingRestore"] = Js.ZERO
    }

    private suspend fun download(st: MutableMap<String, JsonElement>, id: String, token: String, now: Long): ByteArray { spend(st, "download", now); return call("GET", "$DRIVE/$id?alt=media", token).body }

    class PartialWrite(val id: String?) : Exception("partial write")

    private suspend fun write(st: MutableMap<String, JsonElement>, id: String, name: String, body: ByteArray, token: String, now: Long): JsonObject {
        val r = if (id.isNotEmpty()) { spend(st, "update", now); call("PATCH", "$UP/$id?uploadType=media&fields=id,version,size", token, body, "application/gzip") }
        else {
            spend(st, "create", now)
            val b = "lk" + java.lang.Long.toString((Math.random() * Long.MAX_VALUE).toLong(), 36)
            val meta = Js.stringify(JsonObject(linkedMapOf("name" to JsonPrimitive(name), "parents" to kotlinx.serialization.json.JsonArray(listOf(JsonPrimitive("appDataFolder"))), "mimeType" to JsonPrimitive("application/gzip"))))
            val mp = ("--$b\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n$meta\r\n--$b\r\nContent-Type: application/gzip\r\n\r\n").toByteArray() + body + "\r\n--$b--".toByteArray()
            call("POST", "$UP?uploadType=multipart&fields=id,version,size", token, mp, "multipart/related; boundary=$b")
        }
        val j = json(r)
        val size = j["size"]
        if (str(j["id"]).isEmpty() || (size != null && Js.num(size) != body.size.toDouble())) throw PartialWrite(str(j["id"]).ifEmpty { null })
        return j
    }

    private suspend fun call(method: String, url: String, token: String, body: ByteArray? = null, type: String? = null): Http.Res {
        val h = HashMap<String, String>(); h["Authorization"] = "Bearer $token"; if (type != null) h["Content-Type"] = type
        val r = http.send(Http.Req(method, url, h, body))
        if (r.ok) return r
        val reason = runCatching {
            val e = (Json.parseToJsonElement(r.text) as JsonObject)["error"]
            str(Js.prop((Js.prop(e, "errors") as? kotlinx.serialization.json.JsonArray)?.firstOrNull(), "reason")).ifEmpty { str(Js.prop(e, "status")) }
        }.getOrDefault("")
        throw HttpError(r.status, reason)
    }

    class Budget : Exception("budget")
    private fun spend(st: MutableMap<String, JsonElement>, op: String, now: Long) {
        val today = day(now)
        if (str(st["day"]) != today) { st["day"] = JsonPrimitive(today); st["used"] = Js.ZERO }
        val used = Js.num(st["used"]).let { if (it.isNaN()) 0.0 else it } + (COST[op] ?: 0)
        if (used > cap) throw Budget()
        st["used"] = Js.number(used)
    }

    private suspend fun load(store: LexStore, uid: String): MutableMap<String, JsonElement> = Js.spread(store.get(KEY + uid))
    private suspend fun save(store: LexStore, uid: String, st: Map<String, JsonElement>) = store.put(mapOf(KEY + uid to JsonObject(st)), local = false)
    private fun json(r: Http.Res): JsonObject = runCatching { Json.parseToJsonElement(r.text) as? JsonObject }.getOrNull() ?: Js.EMPTY
    private fun str(e: JsonElement?): String = (e as? JsonPrimitive)?.takeIf { it !is kotlinx.serialization.json.JsonNull }?.content ?: ""
    private fun day(now: Long) = SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { timeZone = TimeZone.getTimeZone("UTC") }.format(Date(now))

    companion object {
        const val DRIVE = "https://www.googleapis.com/drive/v3/files"
        const val UP = "https://www.googleapis.com/upload/drive/v3/files"
        const val SCOPE = "https://www.googleapis.com/auth/drive.appdata"
        const val PREFIX = "lexkite-sync"
        const val NAME = "lexkite-sync.v2.json.gz"
        const val CORRUPT = "lexkite-sync.corrupt.json.gz"
        const val NBAK = 3
        const val KEY = "_drive:"
        fun bakName(i: Int) = "lexkite-sync.bak$i.v2.json.gz"
        val COST = mapOf("list" to 100, "get" to 5, "download" to 200, "create" to 50, "update" to 50, "delete" to 50)
        /** 30 s, 1 min, 2 min … ≤ 6 h, ±25 % jitter (web `backoff`). */
        fun backoff(n: Int, rnd: Double = Math.random()): Long = (minOf(6 * 3600e3, 30e3 * Math.pow(2.0, maxOf(0, n - 1).toDouble())) * (0.75 + rnd * 0.5)).toLong()
    }
}
