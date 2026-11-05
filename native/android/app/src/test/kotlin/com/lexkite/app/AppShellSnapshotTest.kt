package com.lexkite.app

import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.design.LKFrame
import com.lexkite.app.i18n.L10n
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/** Snapshot gate for the app frame at 390 dp: light/dark × en/vi/ar(RTL)/de(+40 %).
 *  References in src/test/snapshots; CI records on first run (recordRoborazziDebug) then verifies. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-xxhdpi")
class AppShellSnapshotTest {
    @get:Rule val rule = createComposeRule()
    private val gen = File("../../shared/gen")
    private val frame = LKFrame.parse(File(gen, "frame.json").readText())
    private val en = L10n.parse(File(gen, "strings/en.json").readText())

    private fun shot(lang: String, dark: Boolean) {
        val t = L10n(lang, L10n.parse(File(gen, "strings/$lang.json").readText()), en)
        rule.setContent { com.lexkite.app.ui.AppShell(t, frame = frame, dark = dark) }
        rule.onRoot().captureRoboImage("src/test/snapshots/appshell-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun enLight() = shot("en", false)
    @Test fun enDark() = shot("en", true)
    @Test fun viLight() = shot("vi", false)
    @Test fun arLight() = shot("ar", false)
    @Test fun deDark() = shot("de", true)
}
