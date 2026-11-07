package com.lexkite.app

import androidx.activity.ComponentActivity
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.migration.Migration
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.generated.LKColorDark
import com.lexkite.app.design.generated.LKColorLight
import com.lexkite.app.feature.onboarding.OnbChoice
import com.lexkite.app.feature.onboarding.OnbExit
import com.lexkite.app.feature.onboarding.OnbFlow
import com.lexkite.app.feature.onboarding.OnbGate
import com.lexkite.app.feature.onboarding.OnbSettings
import com.lexkite.app.feature.onboarding.OnbStep
import com.lexkite.app.feature.onboarding.OnboardingFlow
import com.lexkite.app.feature.onboarding.StartRoute
import com.lexkite.app.feature.onboarding.TAG_BACK
import com.lexkite.app.feature.onboarding.TAG_HAVE_ACCOUNT
import com.lexkite.app.feature.onboarding.TAG_NEXT
import com.lexkite.app.feature.onboarding.TAG_SKIP
import com.lexkite.app.feature.onboarding.tagStep
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File

/** C17 first-run onboarding (Robolectric, no emulator): gate, Back/Skip on every step, saved settings keys, splash colours. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-xxhdpi")
class OnboardingTest {
    @get:Rule val rule = createAndroidComposeRule<ComponentActivity>()

    private class Result { var choice: OnbChoice? = null; var exit: OnbExit? = null; val langs = ArrayList<String>() }

    private fun flow(r: Result, initial: OnbStep = OnbStep.WELCOME) = rule.setContent {
        val t = Fixtures.t("en")
        LKTheme(t, false) { OnboardingFlow(t, "en", { r.langs.add(it) }, { c, e -> r.choice = c; r.exit = e }, teacher = {}, initial = initial) }
    }
    private fun tap(tag: String) = rule.onNodeWithTag(tag).performClick()
    private fun at(s: OnbStep) = rule.onNodeWithTag(tagStep(s)).assertIsDisplayed()
    private fun systemBack() = rule.runOnUiThread { rule.activity.onBackPressedDispatcher.onBackPressed() }

    @Test fun parity_C17() {
        // first launch always lands in onboarding (never an external page); relaunch / any existing data lands in Today
        val empty = SyncDoc()
        assertEquals(StartRoute.ONBOARDING, OnbGate.route(false, Migration.Outcome.FRESH_INSTALL, empty))
        assertEquals(StartRoute.ONBOARDING, OnbGate.route(false, Migration.Outcome.EMPTY, empty))
        assertEquals(StartRoute.TODAY, OnbGate.route(true, null, empty))                                  // relaunch
        assertEquals(StartRoute.TODAY, OnbGate.route(false, Migration.Outcome.IMPORTED, empty))           // migrated from Capacitor
        assertEquals(StartRoute.TODAY, OnbGate.route(false, Migration.Outcome.FAILED, empty))             // import failed: old data may exist, never ask again over it
        val withCard = SyncDoc(cards = mapOf("a" to Json.parseToJsonElement("""{"word":"a"}""") as JsonObject))
        assertEquals(StartRoute.TODAY, OnbGate.route(false, Migration.Outcome.ALREADY, withCard))
        assertEquals(StartRoute.TODAY, OnbGate.route(false, null, SyncDoc(settings = Json.parseToJsonElement("""{"onboarded":true}"""))))   // synced from another device
        assertEquals(StartRoute.TODAY, OnbGate.route(false, null, SyncDoc(game = Json.parseToJsonElement("""{"xp":5}"""))))
        assertEquals(setOf(StartRoute.ONBOARDING, StartRoute.TODAY), StartRoute.entries.toSet())          // no web / blog destination exists

        val r = Result(); flow(r)
        // Welcome: no Back (system Back leaves the app), Skip + "I already have an account" present, one primary button >= 44 dp
        at(OnbStep.WELCOME); rule.onNodeWithTag(TAG_BACK).assertDoesNotExist(); rule.onNodeWithTag(TAG_SKIP).assertIsDisplayed(); rule.onNodeWithTag(TAG_HAVE_ACCOUNT).assertIsDisplayed()
        rule.onNodeWithTag(TAG_NEXT).assertHeightIsAtLeast(44.dp)
        tap(TAG_NEXT); at(OnbStep.LANGUAGE)
        // Back (button and system) and Skip on every step before Ready
        tap(TAG_BACK); at(OnbStep.WELCOME); tap(TAG_NEXT); at(OnbStep.LANGUAGE)
        systemBack(); rule.waitForIdle(); at(OnbStep.WELCOME); tap(TAG_NEXT)
        tap("onb-lang-vi"); assertEquals(listOf("vi"), r.langs)
        tap(TAG_NEXT); at(OnbStep.GOAL)
        tap("onb-track-toeic"); rule.onNodeWithTag("onb-track-toeic").assertIsSelected()
        tap(TAG_SKIP); at(OnbStep.LEVEL)                    // skipping keeps the choice and moves on
        tap(TAG_BACK); at(OnbStep.GOAL); rule.onNodeWithTag("onb-track-toeic").assertIsSelected(); tap(TAG_NEXT)
        tap("onb-level-toeic3"); tap(TAG_NEXT); at(OnbStep.PACE)
        tap("onb-pace-40"); tap(TAG_SKIP); at(OnbStep.READY)
        // Ready: Back only, no Skip; the primary button finishes with the picked values
        rule.onNodeWithTag(TAG_SKIP).assertDoesNotExist(); rule.onNodeWithTag(TAG_BACK).assertIsDisplayed()
        tap(TAG_BACK); at(OnbStep.PACE); tap(TAG_NEXT); at(OnbStep.READY)
        assertNull(r.exit)
        tap(TAG_NEXT)
        assertEquals(OnbExit.START, r.exit)
        assertEquals(OnbChoice(lang = "vi", track = "toeic", level = "toeic3", pace = 40), r.choice)
    }

    @Test fun parity_C17_skipAndAccount() {
        val a = Result(); flow(a); tap(TAG_SKIP)
        assertEquals(OnbExit.SKIP_ALL, a.exit); assertNull(a.choice)
    }

    @Test fun parity_C17_haveAccount() {
        val a = Result(); flow(a); tap(TAG_HAVE_ACCOUNT)
        assertEquals(OnbExit.HAVE_ACCOUNT, a.exit); assertNull(a.choice)
    }

    @Test fun flowShape() {
        assertEquals(OnbStep.entries.toList(), generateSequence(OnbStep.WELCOME) { OnbFlow.next(it) }.toList())
        assertNull(OnbFlow.back(OnbStep.WELCOME)); assertNull(OnbFlow.skip(OnbStep.READY)); assertFalse(OnbFlow.canSkip(OnbStep.READY))
        assertTrue(OnbStep.entries.filter { it != OnbStep.READY }.all { OnbFlow.canSkip(it) })
        assertEquals(1f, OnbFlow.fraction(OnbStep.READY)); assertEquals(0f, OnbFlow.fraction(OnbStep.WELCOME))
    }

    @Test fun savedSettingsUseTheWebKeys() {
        val c = OnbChoice(track = "ielts", variant = "gt", level = "s2", pace = 40)
        val s = OnbSettings.apply(Json.parseToJsonElement("""{"autoSpeak":false,"exam":"toeic"}"""), c, 1234L)
        assertEquals("ieltsgt", s["exam"]!!.jsonPrimitive.content); assertEquals("6.5", s["examTarget"]!!.jsonPrimitive.content); assertEquals("6.5", s["targetBand"]!!.jsonPrimitive.content)
        assertEquals("40", s["pace"]!!.jsonPrimitive.content); assertEquals("40", s["dailyGoal"]!!.jsonPrimitive.content); assertEquals("20", s["dailyNew"]!!.jsonPrimitive.content)
        assertEquals("true", s["onboarded"]!!.jsonPrimitive.content); assertEquals("false", s["autoSpeak"]!!.jsonPrimitive.content)   // other settings kept
        val tr = s["tracks"]!!.jsonObject
        assertEquals("ielts", tr["cur"]!!.jsonPrimitive.content); assertEquals("ielts", tr["legacy"]!!.jsonPrimitive.content)
        assertEquals("s2", tr["lv"]!!.jsonObject["ielts"]!!.jsonObject["s"]!!.jsonPrimitive.content); assertEquals("gt", tr["v"]!!.jsonObject["ielts"]!!.jsonPrimitive.content); assertEquals("lr", tr["v"]!!.jsonObject["toeic"]!!.jsonPrimitive.content)
        val g = OnbSettings.apply(null, OnbChoice(track = "work", level = OnbChoice.PLACEMENT), 1L)
        assertEquals("general", g["exam"]!!.jsonPrimitive.content); assertEquals("B1", g["examTarget"]!!.jsonPrimitive.content); assertNull(g["targetBand"])
        assertTrue(g["tracks"]!!.jsonObject["lv"]!!.jsonObject.isEmpty())       // placement chosen: no stage written, the test decides later
        assertEquals(setOf("onboarded"), OnbSettings.apply(null, null, 1L).keys)  // whole setup skipped: only the flag
    }

    @Test fun noWebOrBlogInOnboardingSources() {
        val dir = File("../feature-onboarding/src/main/kotlin")
        val text = dir.walkTopDown().filter { it.extension == "kt" }.joinToString("\n") { it.readText() }
        assertTrue(text.isNotBlank())
        for (bad in listOf("http", "blog", "WebView", "lexkite.com", "Intent.ACTION_VIEW")) assertFalse("onboarding must not reference '$bad'", text.contains(bad, ignoreCase = true))
    }

    @Test fun splashColoursMatchTokens() {
        fun argb(f: String) = Regex("""lk_splash_bg">#([0-9A-Fa-f]{6})<""").find(File(f).readText())!!.groupValues[1].let { (0xFF000000L or it.toLong(16)).toInt() }
        assertEquals(LKColorLight.background.toArgb(), argb("src/main/res/values/colors.xml"))
        assertEquals(LKColorDark.background.toArgb(), argb("src/main/res/values-night/colors.xml"))
        assertNotNull(File("src/main/res/drawable/lk_splash_icon.xml").takeIf { it.exists() })
    }
}
