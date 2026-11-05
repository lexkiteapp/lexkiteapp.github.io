package com.lexkite.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lexkite.app.core.auth.AuthUser
import com.lexkite.app.core.content.ContentRepo
import com.lexkite.app.core.generated.FlagKey
import com.lexkite.app.core.link.DeepLink
import com.lexkite.app.core.migration.Migration
import com.lexkite.app.core.settings.DevicePrefs
import com.lexkite.app.core.sync.SyncScheduler
import com.lexkite.app.design.LKAnim
import com.lexkite.app.design.LKFrame
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.rememberHaptics
import com.lexkite.app.feature.me.MeActions
import com.lexkite.app.feature.me.MeScreen
import com.lexkite.app.feature.me.MeState
import com.lexkite.app.feature.today.DEFAULT_BLOCKS
import com.lexkite.app.feature.today.TodayScreen
import com.lexkite.app.feature.today.TodayViewModel
import com.lexkite.app.i18n.L10n
import com.lexkite.app.ui.AppShell
import com.lexkite.app.ui.LanguageDialog
import com.lexkite.app.ui.ShellSlots
import com.lexkite.app.ui.TeacherStill
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

class MainActivity : ComponentActivity() {
    private val app get() = application as LexkiteApp
    private val link = MutableStateFlow<DeepLink?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        link.value = DeepLink.parse(intent?.dataString)
        val frame = LKFrame.load(this)
        val reduce = LKAnim.durationScale(this) == 0f
        lifecycleScope.launch {
            // C03 once, then the first sync of the session (pull before anything is pushed)
            if (app.flags.bool(FlagKey.MIGRATION_CAPACITOR_ENABLED)) Migration(this@MainActivity, app.store, app.prefs, app.crash).runOnce()
            SyncScheduler.now(this@MainActivity); SyncScheduler.periodic(this@MainActivity)
        }
        setContent {
            val dev by app.prefs.device.collectAsState(DevicePrefs())
            val lang = dev.lang ?: L10n.preferred(resources.configuration.locales.get(0).language)
            val t = remember(lang) { L10n.load(this, lang) }
            val dark = when (dev.theme) { "dark" -> true; "light" -> false; else -> isSystemInDarkTheme() }
            val pending by link.collectAsState()
            var langOpen by rememberSaveable { mutableStateOf(false) }
            LKTheme(t, dark, reduce, rememberHaptics(dev.haptics)) {
                AppShell(t, frame, slots(lang) { langOpen = true }, link = pending, onLinkHandled = { link.value = null })
                if (langOpen) LanguageDialog(t, onPick = { l -> langOpen = false; lifecycleScope.launch { app.prefs.setLang(l) } }, onDismiss = { langOpen = false })
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        DeepLink.parse(intent.dataString)?.let { link.value = it }
    }

    private fun slots(lang: String, onLanguage: () -> Unit) = ShellSlots(
        today = { open -> TodayRoute(lang, open, onLanguage) },
        me = { MeRoute() },
    )

    @Composable
    private fun TodayRoute(lang: String, open: (String) -> Unit, onLanguage: () -> Unit) {
        val vm: TodayViewModel = viewModel(factory = TodayViewModel.Factory(app.store))
        val s by vm.state.collectAsState()
        val user by app.auth.user.collectAsState()
        var blocks by remember { mutableStateOf(DEFAULT_BLOCKS) }
        LaunchedEffect(Unit) {
            val cfg = app.content.cached("today") ?: if (app.flags.bool(FlagKey.CONTENT_REMOTE_ENABLED)) app.content.refresh("today") else null
            blocksOf(cfg)?.let { blocks = it }
            if (app.flags.bool(FlagKey.CONTENT_REMOTE_ENABLED)) app.content.refresh("today") // next launch picks up the newest signed config
        }
        s?.let { TodayScreen(it, lang, user?.initial ?: "L", open, onLanguage, teacher = { TeacherStill() }, blocks = blocks) }
    }

    private fun blocksOf(cfg: JsonObject?): List<String>? = (cfg?.get("blocks") as? JsonArray)?.mapNotNull { ((it as? JsonObject)?.get("type") as? JsonPrimitive)?.content }?.takeIf { it.isNotEmpty() }

    @Composable
    private fun MeRoute() {
        val user by app.auth.user.collectAsState()
        val sync by app.syncEngine.status.collectAsState()
        var busy by remember { mutableStateOf(false) }
        var error by remember { mutableStateOf<String?>(null) }
        var notice by remember { mutableStateOf(false) }
        val scope = rememberCoroutineScope()
        val ctx = LocalContext.current
        fun signIn(f: suspend () -> Result<AuthUser>) = scope.launch {
            busy = true; error = null
            f().onSuccess { notice = false; SyncScheduler.now(ctx) }.onFailure { e -> if (e !is androidx.credentials.exceptions.GetCredentialCancellationException) error = e.message ?: e.javaClass.simpleName }
            busy = false
        }
        MeScreen(MeState(user, sync, busy, error, notice = notice), object : MeActions {
            override fun signInGoogle() { signIn { app.auth.signInGoogle(this@MainActivity) } }
            override fun signInApple() { signIn { app.auth.signInApple(this@MainActivity) } }
            override fun signOut() { scope.launch { app.syncEngine.sync("signout"); app.auth.signOut(); app.syncEngine.reset(); notice = true } }
            override fun syncNow() { scope.launch { app.syncEngine.sync("manual") } }
            override fun chooseAccount(merge: Boolean) { scope.launch { app.syncEngine.chooseAccount(merge); app.syncEngine.sync("account") } }
        })
    }
}
