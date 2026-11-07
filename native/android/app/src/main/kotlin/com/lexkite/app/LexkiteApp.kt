package com.lexkite.app

import android.app.Application
import com.google.firebase.FirebaseApp
import com.lexkite.app.core.auth.AuthService
import com.lexkite.app.core.auth.CrashReporter
import com.lexkite.app.core.auth.GuestAuth
import com.lexkite.app.core.data.LexDb
import com.lexkite.app.core.data.LexStore
import com.lexkite.app.core.settings.AppPrefs
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

    private val firebase: Boolean by lazy { runCatching { FirebaseApp.getApps(this).isNotEmpty() || FirebaseApp.initializeApp(this) != null }.getOrDefault(false) }
}
