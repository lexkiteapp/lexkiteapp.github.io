package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.interpret.Interpret
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.interpret.HistoryActions
import com.lexkite.app.feature.interpret.HistoryScreen
import com.lexkite.app.feature.interpret.Msg
import com.lexkite.app.feature.interpret.PhrasesActions
import com.lexkite.app.feature.interpret.PhrasesScreen
import com.lexkite.app.feature.interpret.PhrasesUi
import com.lexkite.app.feature.interpret.RecapActions
import com.lexkite.app.feature.interpret.RecapScreen
import com.lexkite.app.feature.interpret.TalkActions
import com.lexkite.app.feature.interpret.TalkScreen
import com.lexkite.app.feature.interpret.TalkUi
import com.lexkite.app.i18n.generated.L10nKey
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * Interpreter snapshot gate at 390 dp: face to face (translation shown on the turned top half, source badge, last-turn actions, say-back score), phrasebook, history, recap in en-light, vi-light, ar-light (RTL), de-dark
 * (src/test/snapshots/interpret-*). Data = the real phrasebook (native/shared/gen/interpret/phrases.json); no microphone, model or network. vi / ar use mdpi so the images stay small.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class InterpretSnapshotTest {
    @get:Rule val rule = createComposeRule()
    private val book = Interpret.parsePhrases(File(Fixtures.gen, "interpret/phrases.json").readText())!!

    /** The learner's language is the UI language, the person opposite speaks English (Spanish for an English UI). */
    private fun pair(lang: String) = Interpret.defaultPair(lang)
    private fun item(lang: String) = book.group("go").first()
    private fun conv(lang: String): Interpret.Conv { val p = pair(lang); val o = item(lang)
        return Interpret.Conv("c1", 1_760_000_000_000L, p.a, p.b, listOf(Interpret.Turn("a", o.getValue(p.a), p.b, o.getValue(p.b), 1_760_000_000_000L), Interpret.Turn("b", book.group("eat").first().getValue(p.b), p.a, book.group("eat").first().getValue(p.a), 1_760_000_060_000L))) }

    @Composable private fun screen(name: String, lang: String) {
        val p = pair(lang); val o = item(lang)
        when (name) {
            "talk" -> TalkScreen(TalkUi(p, mapOf("b" to o.getValue(p.b)), mapOf("a" to o.getValue(p.a)), null, false, true, "b" to true, Msg(L10nKey.interpretScore, mapOf("n" to 86, "h" to o.getValue(p.b))), null, false), TalkActions())
            "phrases" -> PhrasesScreen(PhrasesUi(p, book, false, "go", null, null), PhrasesActions())
            "history" -> HistoryScreen(listOf(conv(lang)), HistoryActions())
            else -> { val c = conv(lang); RecapScreen(Interpret.cards(c, p.a), Interpret.keyWords(Interpret.cards(c, p.a).map { it.word }, p.b, 8), p.b, null, RecapActions()) }
        }
    }
    private fun shot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) { screen(name, lang) } } }
        rule.waitForIdle()
        rule.onRoot().captureRoboImage("src/test/snapshots/interpret-$name-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun talkEnLight() = shot("talk", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun talkViLight() = shot("talk", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun talkArLight() = shot("talk", "ar", false)
    @Test fun talkDeDark() = shot("talk", "de", true)
    @Test fun phrasesEnLight() = shot("phrases", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun phrasesViLight() = shot("phrases", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun phrasesArLight() = shot("phrases", "ar", false)
    @Test fun phrasesDeDark() = shot("phrases", "de", true)
    @Test fun historyEnLight() = shot("history", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun historyViLight() = shot("history", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun historyArLight() = shot("history", "ar", false)
    @Test fun historyDeDark() = shot("history", "de", true)
    @Test fun recapEnLight() = shot("recap", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun recapViLight() = shot("recap", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun recapArLight() = shot("recap", "ar", false)
    @Test fun recapDeDark() = shot("recap", "de", true)
}
