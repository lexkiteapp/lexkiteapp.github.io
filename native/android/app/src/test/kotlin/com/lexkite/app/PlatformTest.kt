package com.lexkite.app

import android.view.HapticFeedbackConstants
import androidx.compose.animation.core.SnapSpec
import androidx.compose.animation.core.TweenSpec
import com.lexkite.app.core.link.DeepLink
import com.lexkite.app.design.LKAnim
import com.lexkite.app.design.LKColors
import com.lexkite.app.design.LKHaptics
import com.lexkite.app.design.LKM3
import com.lexkite.app.design.generated.LKColorDark
import com.lexkite.app.design.generated.LKColorLight
import com.lexkite.app.design.generated.LKMotion
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.i18n.generated.L10nLangs
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class PlatformTest {
    /** C08 – lexkite:// (same as the live app) + https://lexkite.com/app/#/… app links → one route table. */
    @Test fun parity_C08() {
        assertEquals(DeepLink("vocab", "review"), DeepLink.parse("lexkite://review"))
        assertEquals(DeepLink("vocab", "word", "well being"), DeepLink.parse("lexkite://word/well%20being"))
        assertEquals(DeepLink("vocab", "word", "café"), DeepLink.parse("https://lexkite.com/app/#/word/caf%C3%A9?from=share"))
        assertEquals(DeepLink("vocab", "review"), DeepLink.parse("https://www.lexkite.com/app/#/review"))
        assertEquals(DeepLink("tests", "mock"), DeepLink.parse("lexkite://mock"))
        assertEquals(DeepLink("home"), DeepLink.parse("lexkite://"))
        assertEquals(DeepLink("home"), DeepLink.parse("lexkite://something-new")) // unknown → Today, never a crash
        assertNull(DeepLink.parse("https://evil.example/app/#/review"))
        assertNull(DeepLink.parse(null))
    }

    /** C09 – semantic haptics, honour the in-app switch (system switch: performHapticFeedback without the ignore flag). */
    @Test fun parity_C09() {
        val played = ArrayList<Int>()
        var on = true
        val h = LKHaptics({ played.add(it); true }) { on }
        assertTrue(h.correct()); assertTrue(h.wrong()); assertTrue(h.done()); assertTrue(h.tap())
        assertEquals(listOf(HapticFeedbackConstants.CONFIRM, HapticFeedbackConstants.REJECT, HapticFeedbackConstants.CONFIRM, HapticFeedbackConstants.VIRTUAL_KEY), played)
        on = false; assertFalse(h.correct()); assertEquals(4, played.size)
        assertEquals(HapticFeedbackConstants.KEYBOARD_TAP, LKHaptics.code(LKHaptics.Kind.CORRECT, 24)) // old devices still get feedback
        assertFalse(LKHaptics.Off.correct())
    }

    /** C10 – 15 languages from the generated tables, ar is RTL with locale digits, placeholders like web t(). */
    @Test fun parity_C10() {
        assertEquals(15, L10nLangs.ALL.size)
        for (l in L10nLangs.ALL) { val t = Fixtures.t(l); for (k in L10nKey.entries) assertTrue("$l ${k.id}", t.has(k)); assertEquals(l == "ar", t.isRtl) }
        assertEquals("en", L10n.preferred("xx")); assertEquals("id", L10n.preferred("in")); assertEquals("vi", L10n.preferred("vi-VN"))
        assertTrue(Fixtures.t("ar").num(1220).isNotEmpty()) // locale digits/grouping (ICU on device = web toLocaleString)
        val en = Fixtures.t("en")
        assertTrue(en(L10nKey.todayFading, mapOf("n" to 8)).contains("8"))
        assertEquals("Tiếng Việt", Fixtures.t("en").nativeName("vi")) // picker shows each language in its own name
    }

    /** C11 – light (Bright Day) / dark (Tactile Night) only from generated tokens, incl. every Material role; motion off when asked. */
    @Test fun parity_C11() {
        assertEquals(LKColorLight.primary, LKColors.light.primary); assertEquals(LKColorDark.primary, LKColors.dark.primary)
        assertEquals(LKColorLight.secondaryContainer, LKM3.light.secondaryContainer) // M0 bug: lilac Material default indicator
        assertEquals(LKColorDark.surfaceContainerHighest, LKM3.dark.surfaceContainerHighest)
        assertEquals(LKColorLight.onSurfaceVariant, LKM3.light.onSurfaceVariant); assertEquals(LKColorDark.outlineVariant, LKM3.dark.outlineVariant)
        assertTrue(LKAnim.spec<Float>(reduce = true) is SnapSpec<*>)
        val tw = LKAnim.spec<Float>(reduce = false) as TweenSpec<*>; assertEquals(LKMotion.FADE_MS, tw.durationMillis); assertTrue(tw.durationMillis <= 200)
    }
}
