package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.placement.PResp
import com.lexkite.app.core.placement.Placement
import com.lexkite.app.core.placement.PlacementSession
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.skills.PlacementActions
import com.lexkite.app.feature.skills.PlacementScreen
import com.lexkite.app.feature.skills.PlacementStage
import com.lexkite.app.feature.skills.PlacementUi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Entry test snapshot gate at 390 dp: the intro, a vocabulary question (3 of 20), a grammar question and the result card (band range, CEFR per skill, weak skill, path stage)
 * in en / vi / ar (RTL) / de × light / dark = src/test/snapshots/placement-*.png (the grammar question: en / ar). Fixed bank + fixed random numbers, no network.
 * CI records the references on the first run (recordRoborazziDebug), then verifies.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class PlacementSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private val pack = Placement.parse(Json.parseToJsonElement(javaClass.classLoader!!.getResource("placement-bank.json")!!.readText()).jsonObject)
    private fun session(vi: Boolean) = PlacementSession(pack, Placement.lcg(3), 99L, vi)
    private val intro = PlacementUi(true, pack)
    private fun ask(wantGrammar: Boolean, vi: Boolean): PlacementUi {
        val s = session(vi); var q = s.next()!!
        val upto = if (wantGrammar) 3 else 2
        for (i in 0 until upto) { s.answer(q.correct); q = s.next()!! }
        return PlacementUi(true, pack, PlacementStage.ASK, q, s.resp.size)
    }
    private val resp = (0 until 20).map { i -> PResp(if (i % 2 == 0) "vocab" else "grammar", Placement.LADDER[(i * 3) % 4], listOf("right", "wrong", "idk", "right", "right")[i % 5], if (i % 2 == 0) 0.25 else 1.0 / 3) }
    private val result = PlacementUi(true, pack, PlacementStage.RESULT, null, 20, 20, Placement.estimate(resp))

    @Composable private fun screen(name: String, lang: String) {
        val ui = when (name) { "intro" -> intro; "vocab" -> ask(false, lang == "vi"); "grammar" -> ask(true, lang == "vi"); else -> result }
        PlacementScreen(ui, PlacementActions())
    }

    private fun shot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) { screen(name, lang) } } }
        rule.waitForIdle()
        rule.onRoot().captureRoboImage("src/test/snapshots/placement-$name-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun introEnLight() = shot("intro", "en", false)
    @Test fun introEnDark() = shot("intro", "en", true)
    @Test fun introViLight() = shot("intro", "vi", false)
    @Test fun introViDark() = shot("intro", "vi", true)
    @Test fun introArLight() = shot("intro", "ar", false)
    @Test fun introArDark() = shot("intro", "ar", true)
    @Test fun introDeLight() = shot("intro", "de", false)
    @Test fun introDeDark() = shot("intro", "de", true)
    @Test fun vocabEnLight() = shot("vocab", "en", false)
    @Test fun vocabEnDark() = shot("vocab", "en", true)
    @Test fun vocabViLight() = shot("vocab", "vi", false)
    @Test fun vocabViDark() = shot("vocab", "vi", true)
    @Test fun vocabArLight() = shot("vocab", "ar", false)
    @Test fun vocabArDark() = shot("vocab", "ar", true)
    @Test fun vocabDeLight() = shot("vocab", "de", false)
    @Test fun vocabDeDark() = shot("vocab", "de", true)
    @Test fun grammarEnLight() = shot("grammar", "en", false)
    @Test fun grammarEnDark() = shot("grammar", "en", true)
    @Test fun grammarArLight() = shot("grammar", "ar", false)
    @Test fun grammarArDark() = shot("grammar", "ar", true)
    @Test fun resultEnLight() = shot("result", "en", false)
    @Test fun resultEnDark() = shot("result", "en", true)
    @Test fun resultViLight() = shot("result", "vi", false)
    @Test fun resultViDark() = shot("result", "vi", true)
    @Test fun resultArLight() = shot("result", "ar", false)
    @Test fun resultArDark() = shot("result", "ar", true)
    @Test fun resultDeLight() = shot("result", "de", false)
    @Test fun resultDeDark() = shot("result", "de", true)
}
