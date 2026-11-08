package com.lexkite.app.core.sync

import com.lexkite.app.core.auth.AuthService
import com.lexkite.app.core.data.LexStore
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.IOException

/** Same switches as web `LK_SYNC` (web/js/firebase-config.js): native apps use D1 until `native` Drive is turned on there. */
data class SyncConfig(val drive: Boolean = false, val d1Fallback: Boolean = true, val d1EveryMs: Long = 600_000, val cap: Int = 1200) {
    companion object {
        /** From Remote Config (generated keys, safe defaults when offline). */
        fun from(f: com.lexkite.app.core.config.Flags) = SyncConfig(
            drive = f.bool(com.lexkite.app.core.generated.FlagKey.SYNC_DRIVE_ENABLED), d1Fallback = f.bool(com.lexkite.app.core.generated.FlagKey.SYNC_D1_FALLBACK),
            d1EveryMs = com.lexkite.app.core.config.Flags.clamp(com.lexkite.app.core.generated.FlagKey.SYNC_PUSH_EVERY_MS, f.long(com.lexkite.app.core.generated.FlagKey.SYNC_PUSH_EVERY_MS)))
    }
}

enum class SyncState { IDLE, SYNCING, OK, OFFLINE, PAUSED, ERROR, NEEDS_ACCOUNT_CHOICE }
data class SyncStatus(val state: SyncState = SyncState.IDLE, val lastSync: Long = 0, val error: String = "")

/**
 * Orchestrates one sync run (pull → merge → push), shared by the foreground app and the WorkManager worker.
 * Local-first: every failure leaves data on the device and returns a retryable state; nothing is ever wiped silently.
 */
class SyncEngine(
    private val store: LexStore,
    private val auth: AuthService,
    private val http: Http = UrlHttp,
    private val cfg: SyncConfig = SyncConfig(),
    private val clock: () -> Long = System::currentTimeMillis,
) {
    private val d1 = D1Sync(http)
    private val drive = DriveSync(http, cfg.cap)
    private val gate = Mutex()
    private val _status = MutableStateFlow(SyncStatus())
    val status: StateFlow<SyncStatus> = _status

    /** Returns true when the run finished (ok / nothing to do), false when the worker should retry later. */
    suspend fun sync(why: String = "auto"): Boolean = gate.withLock {
        val u = auth.user.value ?: return@withLock true.also { _status.value = SyncStatus(SyncState.IDLE) }
        val now = clock()
        if (now < Js.num(store.get(LexStore.K_PAUSED)).let { if (it.isNaN()) 0.0 else it }) { set(SyncState.PAUSED); return@withLock true }
        // Another account's data on this device → ask first (web: confirm before merging), never merge silently
        val last = (store.get(LexStore.K_LAST_UID) as? JsonPrimitive)?.content.orEmpty()
        if (last.isNotEmpty() && last != u.uid && store.doc().cards.isNotEmpty()) { set(SyncState.NEEDS_ACCOUNT_CHOICE); return@withLock true }
        store.put(mapOf(LexStore.K_LAST_UID to JsonPrimitive(u.uid)), local = false)
        set(SyncState.SYNCING)
        try {
            if (cfg.drive && u.provider == "google.com") {
                val dtok = auth.driveToken(null)
                // web start(): the first Drive run on an account first pulls the old D1 copy once (bridge), so nothing pushed by
                // the Capacitor app / older clients is left behind
                val bridgeKey = "_driveOn:" + u.uid
                if (dtok != null && store.get(bridgeKey) == null && cfg.d1Fallback) auth.idToken()?.let { tk -> d1.pull(store, u.uid, tk, now); store.put(mapOf(bridgeKey to JsonPrimitive(now)), local = false) }
                val r = drive.cycle(store, u.uid, dtok, now)
                when (r) {
                    DriveSync.Result.OK -> { done(now); return@withLock true }
                    DriveSync.Result.RETRY, DriveSync.Result.BUDGET -> { set(SyncState.PAUSED); return@withLock r == DriveSync.Result.BUDGET }
                    else -> Unit // newer schema / no Drive consent → D1 path like web
                }
            }
            if (!cfg.d1Fallback && cfg.drive && u.provider == "google.com") { set(SyncState.PAUSED); return@withLock true }
            val token = auth.idToken() ?: run { set(SyncState.ERROR, "token"); return@withLock false }
            d1.pull(store, u.uid, token, now)
            d1.push(store, u.uid, token, clock())
            done(clock()); true
        } catch (e: QuotaPause) {
            store.put(mapOf(LexStore.K_PAUSED to JsonPrimitive(now + D1Sync.pauseMs(e.retrySec))), local = false); set(SyncState.PAUSED); true
        } catch (e: IOException) { set(if (e is HttpError) SyncState.ERROR else SyncState.OFFLINE, e.message.orEmpty()); false }
    }

    /** Answer to NEEDS_ACCOUNT_CHOICE: merge = keep this device's data in the new account; else back it up and start clean (web acctBackup). */
    suspend fun chooseAccount(merge: Boolean) {
        val u = auth.user.value ?: return
        if (!merge) {
            val d = store.doc()
            store.put(mapOf(LexStore.K_BACKUP to JsonObject(mapOf("uid" to (store.get(LexStore.K_LAST_UID) ?: JsonPrimitive("")), "at" to JsonPrimitive(clock()),
                "cards" to JsonObject(d.cards), "stats" to (d.stats ?: SyncDoc.DEFAULT_STATS), "game" to (d.game ?: kotlinx.serialization.json.JsonNull),
                "deleted" to JsonObject(d.deleted)))), local = false)
            store.mutate(local = false) { SyncDoc(settings = it.settings, settingsAt = it.settingsAt) }
        }
        store.put(mapOf(LexStore.K_LAST_UID to JsonPrimitive(u.uid)), local = false)
        set(SyncState.IDLE)
    }

    /** Sign-out / account delete: forget per-account wire state like web (sentHashes = {}). Local data stays. */
    fun reset() { d1.sent.clear(); _status.value = SyncStatus() }

    private fun set(s: SyncState, err: String = "") { _status.value = _status.value.copy(state = s, error = err) }
    private fun done(now: Long) { _status.value = SyncStatus(SyncState.OK, now) }
}
