package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.settings.LearnSettings
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.me.SettingsActions
import com.lexkite.app.feature.me.SettingsScreen
import com.lexkite.app.feature.me.SettingsState
import kotlinx.serialization.json.JsonElement
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** P11 snapshot gate at 390 dp: settings index + look · study · sound · data · help, light/dark × en/vi/ar(RTL)/de(+40 %) = 48 images (src/test/snapshots/set-*). */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-xxhdpi")
class SettingsSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private val none = object : SettingsActions {
        override fun set(key: String, value: JsonElement) {}; override fun setTheme(theme: String) {}; override fun setHaptics(on: Boolean) {}
        override fun pickLanguage() {}; override fun trySpeak() {}; override fun wipe() {}; override fun openUrl(url: String) {}
    }

    private fun shot(sec: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        val s = SettingsState(LearnSettings(dailyNew = 15, sessionCap = 0), lang, if (dark) "dark" else "system", haptics = true, user = null)
        rule.setContent { LKTheme(t, dark) { Box(Modifier.background(LocalLKColors.current.background)) { SettingsScreen(sec, s, none, {}, {}) } } }
        rule.onRoot().captureRoboImage("src/test/snapshots/set-${sec.ifEmpty { "index" }}-$lang-${if (dark) "dark" else "light"}.png")
    }
    @Test fun indexEnLight() = shot("", "en", false)
    @Test fun indexEnDark() = shot("", "en", true)
    @Test fun indexViLight() = shot("", "vi", false)
    @Test fun indexViDark() = shot("", "vi", true)
    @Test fun indexArLight() = shot("", "ar", false)
    @Test fun indexArDark() = shot("", "ar", true)
    @Test fun indexDeLight() = shot("", "de", false)
    @Test fun indexDeDark() = shot("", "de", true)
    @Test fun lookEnLight() = shot("look", "en", false)
    @Test fun lookEnDark() = shot("look", "en", true)
    @Test fun lookViLight() = shot("look", "vi", false)
    @Test fun lookViDark() = shot("look", "vi", true)
    @Test fun lookArLight() = shot("look", "ar", false)
    @Test fun lookArDark() = shot("look", "ar", true)
    @Test fun lookDeLight() = shot("look", "de", false)
    @Test fun lookDeDark() = shot("look", "de", true)
    @Test fun studyEnLight() = shot("study", "en", false)
    @Test fun studyEnDark() = shot("study", "en", true)
    @Test fun studyViLight() = shot("study", "vi", false)
    @Test fun studyViDark() = shot("study", "vi", true)
    @Test fun studyArLight() = shot("study", "ar", false)
    @Test fun studyArDark() = shot("study", "ar", true)
    @Test fun studyDeLight() = shot("study", "de", false)
    @Test fun studyDeDark() = shot("study", "de", true)
    @Test fun soundEnLight() = shot("sound", "en", false)
    @Test fun soundEnDark() = shot("sound", "en", true)
    @Test fun soundViLight() = shot("sound", "vi", false)
    @Test fun soundViDark() = shot("sound", "vi", true)
    @Test fun soundArLight() = shot("sound", "ar", false)
    @Test fun soundArDark() = shot("sound", "ar", true)
    @Test fun soundDeLight() = shot("sound", "de", false)
    @Test fun soundDeDark() = shot("sound", "de", true)
    @Test fun dataEnLight() = shot("data", "en", false)
    @Test fun dataEnDark() = shot("data", "en", true)
    @Test fun dataViLight() = shot("data", "vi", false)
    @Test fun dataViDark() = shot("data", "vi", true)
    @Test fun dataArLight() = shot("data", "ar", false)
    @Test fun dataArDark() = shot("data", "ar", true)
    @Test fun dataDeLight() = shot("data", "de", false)
    @Test fun dataDeDark() = shot("data", "de", true)
    @Test fun helpEnLight() = shot("help", "en", false)
    @Test fun helpEnDark() = shot("help", "en", true)
    @Test fun helpViLight() = shot("help", "vi", false)
    @Test fun helpViDark() = shot("help", "vi", true)
    @Test fun helpArLight() = shot("help", "ar", false)
    @Test fun helpArDark() = shot("help", "ar", true)
    @Test fun helpDeLight() = shot("help", "de", false)
    @Test fun helpDeDark() = shot("help", "de", true)
}
