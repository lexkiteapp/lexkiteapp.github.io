package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors   // page background like the app frame (no default #FAFAFA window around the card)
import com.lexkite.app.feature.me.MeActions
import com.lexkite.app.feature.me.MeScreen
import com.lexkite.app.feature.me.MeState
import com.lexkite.app.core.sync.SyncStatus
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** Snapshot gate at 390 dp: light/dark × en/vi/ar(RTL)/de(+40 %) for the frame + Today (P01/P02) and the Me account card (C01).
 *  References in src/test/snapshots; CI records on first run (recordRoborazziDebug) then verifies. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-xxhdpi")
class AppShellSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private fun today(lang: String, dark: Boolean, size: String = "") {
        rule.setContent { Fixtures.Shell(lang, dark) }
        rule.onRoot().captureRoboImage("src/test/snapshots/today-$lang-${if (dark) "dark" else "light"}$size.png")
    }
    private fun me(lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark) { Box(Modifier.background(LocalLKColors.current.background)) { MeScreen(MeState(null, SyncStatus()), object : MeActions { override fun signInGoogle() {}; override fun signInApple() {}; override fun signOut() {}; override fun syncNow() {}; override fun chooseAccount(merge: Boolean) {} }) } } }
        rule.onRoot().captureRoboImage("src/test/snapshots/me-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun todayEnLight() = today("en", false)
    @Test fun todayEnDark() = today("en", true)
    @Test fun todayViLight() = today("vi", false)
    @Test fun todayViDark() = today("vi", true)
    @Test fun todayArLight() = today("ar", false)
    @Test fun todayArDark() = today("ar", true)
    @Test fun todayDeLight() = today("de", false)
    @Test fun todayDeDark() = today("de", true)
    // medium width (tablet / foldable, device matrix "medium"): the 390 dp column stays centred, tabs stay at the bottom
    @Config(qualifiers = "w600dp-h960dp-xhdpi") @Test fun todayEnLightMedium() = today("en", false, "-medium")
    @Config(qualifiers = "w600dp-h960dp-xhdpi") @Test fun todayArDarkMedium() = today("ar", true, "-medium")
    @Test fun meEnLight() = me("en", false)
    @Test fun meArDark() = me("ar", true)
    @Test fun meDeLight() = me("de", false)
}
