package com.lexkite.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.lexkite.app.core.audio.AndroidTtsBackend
import com.lexkite.app.core.audio.HttpFetcher
import com.lexkite.app.core.audio.LkAudio
import com.lexkite.app.core.audio.MediaPlayerBackend
import com.lexkite.app.core.auth.AuthService
import com.lexkite.app.core.auth.CrashReporter
import com.lexkite.app.core.auth.GuestAuth
import com.lexkite.app.core.data.LexDb
import com.lexkite.app.core.data.LexStore
import com.lexkite.app.core.settings.AppPrefs
import com.lexkite.app.core.generated.FlagKey
import com.lexkite.app.core.sync.StarterDeck
import com.lexkite.app.core.vimg.VImg
import com.lexkite.app.core.vimg.VImgStore
import com.lexkite.app.core.sync.SyncConfig
import com.lexkite.app.core.sync.UrlHttp
import com.lexkite.app.core.config.Flags
import com.lexkite.app.core.content.ContentRepo
import com.lexkite.app.platform.RemoteFlags
import com.lexkite.app.core.sync.SyncEngine
import com.lexkite.app.core.sync.SyncHost
import com.lexkite.app.core.sync.SyncScheduler
import com.lexkite.app.platform.CrashlyticsReporter
import com.lexkite.app.platform.FirebaseAuthService
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import java.io.File

/**
 * Process-wide graph (small manual DI – no Hilt/kapt for DI to keep the APK and build light). Everything is lazy so cold start
 * only pays for what the first frame needs; Firebase is optional (missing config → guest mode, app still fully usable).
 */
class LexkiteApp : Application(), SyncHost {
    val flags: Flags by lazy { if (firebase) runCatching<Flags> { RemoteFlags() }.getOrDefault(Flags.Defaults) else Flags.Defaults }
    val cfg by lazy { SyncConfig.from(flags) }
    val content by lazy { ContentRepo(store, UrlHttp) }
    val crash: CrashReporter by lazy { if (firebase) runCatching { CrashlyticsReporter() }.getOrDefault(CrashReporter.None) else CrashReporter.None }
    val db by lazy { LexDb.open(this) }
    val store by lazy { LexStore(db).also { s -> s.onLocalChange = { SyncScheduler.soon(this, cfg.d1EveryMs) } } }
    val prefs by lazy { AppPrefs(this) }
    val auth: AuthService by lazy { if (firebase) runCatching<AuthService> { FirebaseAuthService(this, crash) }.getOrElse { crash.record(it); GuestAuth() } else GuestAuth() }
    override val syncEngine by lazy { SyncEngine(store, auth, cfg = cfg) }

    /** C04: the one voice channel (CDN Kokoro files → disk cache → system TTS), process-wide so a screen leaving never leaves a second voice playing. */
    val audio: LkAudio by lazy { LkAudio(CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate), HttpFetcher(), File(cacheDir, "audio"), MediaPlayerBackend(), AndroidTtsBackend(this)) }
    /** Bundled starter content (generated from the web data): new learners practise offline from the first lesson. */
    val starter: StarterDeck.Pack? by lazy { runCatching { StarterDeck.parse(assets.open("content-pack/starter.json").bufferedReader().use { it.readText() }) }.getOrNull() }

    /** Word pictures (VImg v3): rollout by remote config `vocab_img` / `vocab_img_pct` over this device's fixed bucket. */
    val vimg: VImgStore by lazy {
        VImgStore(UrlHttp, File(cacheDir, "vimg")) {
            val f = flags.string(FlagKey.VOCAB_IMG).trim().lowercase()
            VImg.mode(when (f) { "on" -> true; "off" -> false; else -> null }, flags.long(FlagKey.VOCAB_IMG_PCT), prefs.rolloutBucket())
        }
    }

    private val firebase: Boolean by lazy { runCatching { FirebaseApp.getApps(this).isNotEmpty() || FirebaseApp.initializeApp(this) != null }.getOrDefault(false) }
}
