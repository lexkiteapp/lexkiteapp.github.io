package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.watch.WHist
import com.lexkite.app.core.watch.WItem
import com.lexkite.app.core.watch.WNote
import com.lexkite.app.core.watch.WTopics
import com.lexkite.app.core.watch.Watch
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.skills.WRun
import com.lexkite.app.feature.skills.WatchHubActions
import com.lexkite.app.feature.skills.WatchHubScreen
import com.lexkite.app.feature.skills.WatchHubUi
import com.lexkite.app.feature.skills.WatchPlayerActions
import com.lexkite.app.feature.skills.WatchPlayerScreen
import com.lexkite.app.feature.skills.WatchPlayerUi
import com.lexkite.app.feature.skills.WatchWordUi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * P12 "Học qua video" snapshot gate at 390 dp: the hub (search, level chips, filters, a topic result with three fixed videos, one "continue" card, suggestions) and the player screen
 * (fixed placeholder box instead of the WebView, A–B loop, a looked-up word, time notes) in en / vi / ar (RTL) / de × light / dark = src/test/snapshots/watch-*.png.
 * Fixed data, no network, no clock, thumbnails = the flat placeholder slot. CI records the references on the first run (recordRoborazziDebug), then verifies.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class WatchSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private val topics = WTopics.parse(Json.parseToJsonElement(javaClass.classLoader!!.getResource("watch-topics.json")!!.readText()).jsonObject)
    private val daily = topics.topic("daily")!!
    private val history = listOf(WHist("dQw4w9WgXcQ", "Ordering coffee in English", "Lexkite English", "daily", pos = 95, len = 400))
    private val videos = listOf(
        WItem("aaaaaaaaaaa", "Everyday English: small talk at work", "English Class 101", 312, true),
        WItem("bbbbbbbbbbb", "How to ask for directions", "Learn English with Tom", 845),
        WItem("ccccccccccc", "50 phrases for the airport", "Speak English Now", 1530, true),
    )
    private val hub = WatchHubUi(topics, auto = 3, hist = history, forYou = Watch.forYou(topics, "general", null, emptySet(), 0, history), run = WRun(daily.name, daily, videos, yt = "https://www.youtube.com/results?search_query=x"))
    private val meeting = buildJsonObject { put("word", "meeting"); put("ipa", "/ˈmiː.tɪŋ/"); put("vi", "cuộc họp") }
    private val player = WatchPlayerUi("dQw4w9WgXcQ", loaded = true, title = "Ordering coffee in English", ch = "Lexkite English", ready = true, a = 12.0, b = 40.0, loop = true, rate = 0.75, word = "meeting", sentence = "Let's have a meeting at ten.",
        lookup = WatchWordUi("meeting", meeting, "cuộc họp", inDeck = true, at = 65), notes = listOf(WNote(12, "Polite request: could I have…"), WNote(65, "Linking: ten o'clock")), ytAt = 65)

    @Composable private fun screen(name: String) {
        if (name == "hub") WatchHubScreen(hub, WatchHubActions())
        else WatchPlayerScreen(player, WatchPlayerActions()) { m -> Box(m.background(LocalLKColors.current.surfaceContainerHighest)) }
    }

    private fun shot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) { screen(name) } } }
        rule.waitForIdle()
        rule.onRoot().captureRoboImage("src/test/snapshots/watch-$name-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun hubEnLight() = shot("hub", "en", false)
    @Test fun hubEnDark() = shot("hub", "en", true)
    @Test fun hubViLight() = shot("hub", "vi", false)
    @Test fun hubViDark() = shot("hub", "vi", true)
    @Test fun hubArLight() = shot("hub", "ar", false)
    @Test fun hubArDark() = shot("hub", "ar", true)
    @Test fun hubDeLight() = shot("hub", "de", false)
    @Test fun hubDeDark() = shot("hub", "de", true)
    @Test fun playerEnLight() = shot("player", "en", false)
    @Test fun playerEnDark() = shot("player", "en", true)
    @Test fun playerViLight() = shot("player", "vi", false)
    @Test fun playerViDark() = shot("player", "vi", true)
    @Test fun playerArLight() = shot("player", "ar", false)
    @Test fun playerArDark() = shot("player", "ar", true)
    @Test fun playerDeLight() = shot("player", "de", false)
    @Test fun playerDeDark() = shot("player", "de", true)
}
