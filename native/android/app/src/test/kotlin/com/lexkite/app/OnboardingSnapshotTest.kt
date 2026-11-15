package com.lexkite.app

import androidx.compose.runtime.Composable
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.design.LKTheme
import com.lexkite.app.feature.onboarding.BrandSplash
import com.lexkite.app.feature.onboarding.OnbStep
import com.lexkite.app.feature.onboarding.OnboardingFlow
import com.lexkite.app.i18n.L10n
import com.lexkite.app.ui.TeacherStill
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/** C17 snapshot gate at 390 dp: brand splash + Welcome + 5 steps, light/dark x en/vi/ar(RTL) = 42 images (src/test/snapshots/onb-*). CI records on first run, then verifies. */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-xxhdpi")
class OnboardingSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private fun shot(name: String, lang: String, dark: Boolean, content: @Composable (L10n) -> Unit) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark) { content(t) } }
        rule.onRoot().captureRoboImage("src/test/snapshots/onb-$name-$lang-${if (dark) "dark" else "light"}.png")
    }
    private fun splash(lang: String, dark: Boolean) = shot("splash", lang, dark) { t -> BrandSplash(t) }
    private fun step(s: OnbStep, lang: String, dark: Boolean) = shot(s.name.lowercase(), lang, dark) { t -> OnboardingFlow(t, lang, {}, { _, _ -> }, teacher = { pose -> TeacherStill(pose = pose) }, initial = s) }

    @Test fun splashEnLight() = splash("en", false)
    @Test fun splashEnDark() = splash("en", true)
    @Test fun splashViLight() = splash("vi", false)
    @Test fun splashViDark() = splash("vi", true)
    @Test fun splashArLight() = splash("ar", false)
    @Test fun splashArDark() = splash("ar", true)
    @Test fun welcomeEnLight() = step(OnbStep.WELCOME, "en", false)
    @Test fun welcomeEnDark() = step(OnbStep.WELCOME, "en", true)
    @Test fun welcomeViLight() = step(OnbStep.WELCOME, "vi", false)
    @Test fun welcomeViDark() = step(OnbStep.WELCOME, "vi", true)
    @Test fun welcomeArLight() = step(OnbStep.WELCOME, "ar", false)
    @Test fun welcomeArDark() = step(OnbStep.WELCOME, "ar", true)
    @Test fun languageEnLight() = step(OnbStep.LANGUAGE, "en", false)
    @Test fun languageEnDark() = step(OnbStep.LANGUAGE, "en", true)
    @Test fun languageViLight() = step(OnbStep.LANGUAGE, "vi", false)
    @Test fun languageViDark() = step(OnbStep.LANGUAGE, "vi", true)
    @Test fun languageArLight() = step(OnbStep.LANGUAGE, "ar", false)
    @Test fun languageArDark() = step(OnbStep.LANGUAGE, "ar", true)
    @Test fun goalEnLight() = step(OnbStep.GOAL, "en", false)
    @Test fun goalEnDark() = step(OnbStep.GOAL, "en", true)
    @Test fun goalViLight() = step(OnbStep.GOAL, "vi", false)
    @Test fun goalViDark() = step(OnbStep.GOAL, "vi", true)
    @Test fun goalArLight() = step(OnbStep.GOAL, "ar", false)
    @Test fun goalArDark() = step(OnbStep.GOAL, "ar", true)
    @Test fun levelEnLight() = step(OnbStep.LEVEL, "en", false)
    @Test fun levelEnDark() = step(OnbStep.LEVEL, "en", true)
    @Test fun levelViLight() = step(OnbStep.LEVEL, "vi", false)
    @Test fun levelViDark() = step(OnbStep.LEVEL, "vi", true)
    @Test fun levelArLight() = step(OnbStep.LEVEL, "ar", false)
    @Test fun levelArDark() = step(OnbStep.LEVEL, "ar", true)
    @Test fun paceEnLight() = step(OnbStep.PACE, "en", false)
    @Test fun paceEnDark() = step(OnbStep.PACE, "en", true)
    @Test fun paceViLight() = step(OnbStep.PACE, "vi", false)
    @Test fun paceViDark() = step(OnbStep.PACE, "vi", true)
    @Test fun paceArLight() = step(OnbStep.PACE, "ar", false)
    @Test fun paceArDark() = step(OnbStep.PACE, "ar", true)
    @Test fun readyEnLight() = step(OnbStep.READY, "en", false)
    @Test fun readyEnDark() = step(OnbStep.READY, "en", true)
    @Test fun readyViLight() = step(OnbStep.READY, "vi", false)
    @Test fun readyViDark() = step(OnbStep.READY, "vi", true)
    @Test fun readyArLight() = step(OnbStep.READY, "ar", false)
    @Test fun readyArDark() = step(OnbStep.READY, "ar", true)
}
