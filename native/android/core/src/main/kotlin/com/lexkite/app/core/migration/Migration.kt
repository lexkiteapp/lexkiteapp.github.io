package com.lexkite.app.core.migration

import android.annotation.SuppressLint
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import com.lexkite.app.core.auth.CrashReporter
import com.lexkite.app.core.data.LexStore
import com.lexkite.app.core.settings.AppPrefs
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import java.io.ByteArrayInputStream
import java.io.File
import kotlin.coroutines.resume

/**
 * C03 – first launch after the update from the Capacitor app (same applicationId → same data dir): a hidden WebView on the SAME
 * origin `https://localhost` opens the old IndexedDB and runs native/shared/gen/migration-export.js once; the JSON is merged into
 * Room (merge, never overwrite) and the run is marked done. The old WebView data is never deleted (rollback-safe).
 * Failure → retried on the next launches (max [MAX_TRIES]), the app stays fully usable meanwhile.
 */
class Migration(private val ctx: Context, private val store: LexStore, private val prefs: AppPrefs, private val crash: CrashReporter = CrashReporter.None) {
    enum class Outcome { ALREADY, FRESH_INSTALL, IMPORTED, EMPTY, FAILED }

    suspend fun runOnce(): Outcome {
        if (prefs.migrationDone()) return Outcome.ALREADY
        if (!File(ctx.applicationInfo.dataDir, "app_webview").exists()) { prefs.markMigration(true); return Outcome.FRESH_INSTALL }
        val raw = withContext(Dispatchers.Main) { withTimeoutOrNull(TIMEOUT_MS) { export() } }
        if (raw == null) return fail("timeout")
        val res = runCatching { importJson(store, raw) }
        return res.fold({ prefs.markMigration(true); if (it) Outcome.IMPORTED else Outcome.EMPTY }, { crash.record(it); fail(it.javaClass.simpleName) })
    }

    private suspend fun fail(why: String): Outcome {
        crash.log("migration failed: $why")
        val giveUp = prefs.migrationAttempts() + 1 >= MAX_TRIES
        prefs.markMigration(giveUp) // after MAX_TRIES stop the hidden WebView on every launch; old data stays on disk
        return Outcome.FAILED
    }

    @SuppressLint("SetJavaScriptEnabled", "JavascriptInterface")
    private suspend fun export(): String? = suspendCancellableCoroutine { cont ->
        val script = ctx.assets.open(ASSET).bufferedReader().use { it.readText() }
        val page = "<!doctype html><meta charset=utf-8><script>$script</script>"
        val wv = WebView(ctx.applicationContext)
        val finished = java.util.concurrent.atomic.AtomicBoolean(false)
        fun finish(v: String?) { if (!finished.compareAndSet(false, true)) return; Handler(Looper.getMainLooper()).post { wv.stopLoading(); wv.removeJavascriptInterface(BRIDGE); wv.destroy() }; if (cont.isActive) cont.resume(v) }
        wv.settings.javaScriptEnabled = true
        wv.settings.domStorageEnabled = true // localStorage of the same origin (lk.* keys)
        wv.settings.allowFileAccess = false
        wv.addJavascriptInterface(object {
            @JavascriptInterface fun done(json: String) = finish(json)

        }, BRIDGE)
        wv.webViewClient = object : WebViewClient() {
            override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                if (request.url.host == "localhost") WebResourceResponse("text/html", "utf-8", ByteArrayInputStream(page.toByteArray())) else WebResourceResponse("text/plain", "utf-8", ByteArrayInputStream(ByteArray(0)))
        }
        cont.invokeOnCancellation { Handler(Looper.getMainLooper()).post { if (finished.compareAndSet(false, true)) wv.destroy() } }
        wv.loadUrl(ORIGIN + "/")
    }

    companion object {
        const val ORIGIN = "https://localhost" // Capacitor ≥ 6 androidScheme https + hostname localhost (mobile/, Capacitor 8)
        const val ASSET = "migration-export.js"
        const val BRIDGE = "LexkiteExport" // migration-export.js reports through window.LexkiteExport.done(json)
        const val TIMEOUT_MS = 20_000L
        const val MAX_TRIES = 3
        /** Import half: merge into the store (never overwrites newer local edits), keep every other key verbatim. Returns false when empty. */
        suspend fun importJson(store: LexStore, raw: String, now: Long = System.currentTimeMillis()): Boolean {
            val imp = MigrationImport.parse(Json.parseToJsonElement(raw) as JsonObject, now)
            if (imp.empty) return false
            store.mutate(local = false) { MigrationImport.into(it, imp.doc, now) }
            val missing = imp.extra.filterKeys { store.get(it) == null }
            if (missing.isNotEmpty()) store.put(missing, local = false)
            return true
        }
    }
}
