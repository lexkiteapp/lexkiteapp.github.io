package com.lexkite.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
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
import androidx.compose.ui.unit.dp
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lexkite.app.core.auth.AuthUser
import com.lexkite.app.core.content.ContentRepo
import com.lexkite.app.core.generated.FlagKey
import com.lexkite.app.core.link.DeepLink
import com.lexkite.app.core.migration.Migration
import com.lexkite.app.core.settings.DevicePrefs
import com.lexkite.app.core.sync.StarterDeck
import com.lexkite.app.core.sync.SyncScheduler
import com.lexkite.app.design.LKAnim
import com.lexkite.app.design.LKFrame
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.rememberHaptics
import com.lexkite.app.feature.me.MeActions
import com.lexkite.app.feature.me.MeScreen
import com.lexkite.app.feature.onboarding.BrandSplash
import com.lexkite.app.feature.onboarding.OnbChoice
import com.lexkite.app.feature.onboarding.OnbExit
import com.lexkite.app.feature.onboarding.OnbGate
import com.lexkite.app.feature.onboarding.OnbSettings
import com.lexkite.app.feature.onboarding.OnbStarter
import com.lexkite.app.feature.onboarding.OnboardingFlow
import com.lexkite.app.feature.onboarding.StartRoute
import com.lexkite.app.feature.me.MeState
import com.lexkite.app.feature.today.DEFAULT_BLOCKS
import com.lexkite.app.feature.today.TodayScreen
import com.lexkite.app.feature.today.TodayViewModel
import com.lexkite.app.i18n.L10n
import com.lexkite.app.ui.AppShell
import com.lexkite.app.ui.LanguageDialog
import com.lexkite.app.ui.ShellSlots
import com.lexkite.app.ui.RemoteImage
import com.lexkite.app.ui.RigAssets
import com.lexkite.app.ui.TeacherStill
import com.lexkite.app.ui.TeacherView
import com.lexkite.app.core.sync.UrlHttp
import com.lexkite.app.feature.lesson.LessonEnv
import com.lexkite.app.feature.lesson.LessonRequest
import com.lexkite.app.feature.lesson.LessonRoute
import com.lexkite.app.feature.lesson.LessonSlots
import com.lexkite.app.feature.vocab.StudySlots
import com.lexkite.app.feature.vocab.StudyTx
import com.lexkite.app.feature.vocab.StudyWords
import com.lexkite.app.feature.vocab.VocabEnv
import com.lexkite.app.feature.vocab.VocabHubRoute
import com.lexkite.app.feature.vocab.VocabRoute
import com.lexkite.app.feature.vocab.WordEnv
import com.lexkite.app.feature.vocab.WordRoute
import androidx.compose.foundation.layout.Box
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

class MainActivity : ComponentActivity() {
    private val app get() = application as LexkiteApp
    private val link = MutableStateFlow<DeepLink?>(null)
    /** C17: null while the brand screen shows (decided locally in well under a second, never waits for the network). */
    private val start = MutableStateFlow<StartRoute?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        installSplashScreen() // system splash = Kit background; it is dismissed on the first frame and the Compose brand screen continues
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        link.value = DeepLink.parse(intent?.dataString)
        val frame = LKFrame.load(this)
        val reduce = LKAnim.durationScale(this) == 0f
        lifecycleScope.launch {
            // C17 gate: returning users go straight to Today without waiting for anything
            val t0 = System.currentTimeMillis()
            val done = app.prefs.onboardingDone()
            if (done) start.value = StartRoute.TODAY
            // C03 once, then the first sync of the session (pull before anything is pushed)
            val outcome = if (app.flags.bool(FlagKey.MIGRATION_CAPACITOR_ENABLED)) Migration(this@MainActivity, app.store, app.prefs, app.crash).runOnce() else null
            if (!done) {
                // first launch: migrated users (Capacitor data, or a failed import that may still hold data) and anyone with data skip it
                val route = OnbGate.route(false, outcome, app.store.doc())
                if (route == StartRoute.ONBOARDING) kotlinx.coroutines.delay((BRAND_MS - (System.currentTimeMillis() - t0)).coerceAtLeast(0))
                start.value = route
            }
            SyncScheduler.now(this@MainActivity); SyncScheduler.periodic(this@MainActivity)
        }
        setContent {
            val dev by app.prefs.device.collectAsState(DevicePrefs())
            val lang = dev.lang ?: L10n.preferred(resources.configuration.locales.get(0).language)
            val t = remember(lang) { L10n.load(this, lang) }
            val dark = when (dev.theme) { "dark" -> true; "light" -> false; else -> isSystemInDarkTheme() }
            val pending by link.collectAsState()
            var langOpen by rememberSaveable { mutableStateOf(false) }
            val route by start.collectAsState()
            LKTheme(t, dark, reduce, rememberHaptics(dev.haptics)) {
                when (route) {
                    null -> BrandSplash(t)
                    StartRoute.ONBOARDING -> OnboardingFlow(
                        t, lang, onLang = { l -> lifecycleScope.launch { app.prefs.setLang(l) } }, onFinish = ::finishOnboarding,
                        teacher = { pose -> TeacherStill(pose = pose) }, columnWidth = frame.width.dp,
                    )
                    StartRoute.TODAY -> {
                        AppShell(t, frame, slots(lang) { langOpen = true }, link = pending, onLinkHandled = { link.value = null })
                        if (langOpen) LanguageDialog(t, onPick = { l -> langOpen = false; lifecycleScope.launch { app.prefs.setLang(l) } }, onDismiss = { langOpen = false })
                    }
                }
            }
        }
    }

    /** Saves the choices with the web keys (so sync carries them), marks onboarding done, then opens Today (or Me for "I already have an account"). */
    private fun finishOnboarding(choice: OnbChoice?, exit: OnbExit) {
        lifecycleScope.launch {
            val pack = runCatching { StarterDeck.parse(assets.open("content-pack/starter.json").bufferedReader().use { it.readText() }) }.getOrNull() // bundled, generated from web data
            app.store.mutate { d ->
                val now = System.currentTimeMillis()
                val saved = d.copy(settings = OnbSettings.apply(d.settings, if (exit == OnbExit.HAVE_ACCOUNT) null else choice, now), settingsAt = kotlinx.serialization.json.JsonPrimitive(now))
                OnbStarter.apply(saved, choice, exit, pack, now) // web adds the starter deck of the chosen exam at the end of setup
            }
            app.prefs.markOnboardingDone()
            if (exit == OnbExit.HAVE_ACCOUNT) DeepLink.parse("lexkite://me")?.let { link.value = it }
            start.value = StartRoute.TODAY
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        DeepLink.parse(intent.dataString)?.let { link.value = it }
    }

    private companion object { const val BRAND_MS = 700L } // brand screen minimum on first launch, well under the 1 s budget

    private fun slots(lang: String, onLanguage: () -> Unit) = ShellSlots(
        today = { open -> TodayRoute(lang, open, onLanguage) },
        me = { MeRoute() },
        lesson = { story, onExit ->
            val dark = com.lexkite.app.design.LocalLKColors.current.dark
            val env = remember(lang, dark) { LessonEnv(app.store, app.audio, UrlHttp, cacheDir, app.starter, lang, RigAssets.def(this@MainActivity).poseEmo, imageUrl = { w, p -> app.vimg.urlFor(w, p, dark) }, prepareImages = { app.vimg.prepare(it) }) }
            LessonRoute(env, LessonRequest(story = story), lessonSlots, onExit)
        },
        vocab = { route, arg, query, onExit, open, replace -> VocabRoute(vocabEnv(lang), route, arg, query, vocabSlots, open, replace, onExit) },
        vocabHub = { open -> VocabHubRoute(vocabEnv(lang), open) },
        words = { route, arg, query, onExit, open ->
            val t = com.lexkite.app.design.LocalL10n.current
            val env = remember(lang) { WordEnv(app.store, app.audio, UrlHttp, { name -> assets.open(name).bufferedReader().use { it.readText() } }, lang, wordIndex = { StudyWords.load(UrlHttp, cacheDir)?.index ?: emptyMap() }, tx = StudyTx.of(t, L10n.load(this@MainActivity, "vi"))) }
            WordRoute(env, route, arg, query, onExit, open)
        },
    )

    /** M3 vocabulary screens (review, practice, mistakes, deck, library, topic): the same store, voice and picture loader as the lesson; the web word library is downloaded once and cached. */
    @Composable
    private fun vocabEnv(lang: String): VocabEnv {
        val dark = com.lexkite.app.design.LocalLKColors.current.dark
        val t = com.lexkite.app.design.LocalL10n.current
        return remember(lang, dark) { VocabEnv(app.store, app.audio, UrlHttp, cacheDir, StudyTx.of(t, L10n.load(this@MainActivity, "vi")), words = { StudyWords.load(UrlHttp, cacheDir) }, imageUrl = { w, p -> app.vimg.urlFor(w, p, dark) }) }
    }
    private val vocabSlots = StudySlots(image = { url, desc, mod -> RemoteImage(url, desc, mod) })

    /** The teacher in the lesson: the live rig for the stage, the bundled still for the feedback sheet / result (C05). */
    private val lessonSlots = LessonSlots(
        teacher = { who, signal, mod -> TeacherView(who, signal, mod) },
        still = { who, pose, mod -> Box(mod) { TeacherStill(who, pose) } },
        image = { url, desc, mod -> RemoteImage(url, desc, mod) },
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
