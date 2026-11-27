package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.mediate.Mediate
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.skills.MediateActions
import com.lexkite.app.feature.skills.MediateListActions
import com.lexkite.app.feature.skills.MediateListScreen
import com.lexkite.app.feature.skills.MediateListUi
import com.lexkite.app.feature.skills.MediateScreen
import com.lexkite.app.feature.skills.MediateUi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * P13 "Trung gian" snapshot gate at 390 dp: the list by level (two best scores), a listen-first lesson (text hidden), a written lesson mid-way (word count in range) and the checked lesson
 * (ideas met / missing, leave-out hit, copied warning, model answer) in en / vi / ar (RTL) / de × light / dark = src/test/snapshots/mediate-*.png. Fixed data, no network, no audio.
 * CI records the references on the first run (recordRoborazziDebug), then verifies.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class MediateSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private val pack = Mediate.parse(Json.parseToJsonElement(javaClass.classLoader!!.getResource("mediation.json")!!.readText()).jsonObject)
    private val a2 = pack.item("m03")!!
    private val listenFirst = pack.items.first { Mediate.listenFirst(it, pack.listenFirst) }
    private val draft = "Hi Lena! The pool is closed on Wednesday from 12 to 4 in the afternoon. It is closed from Monday 3 March. Your son must be with an adult. The cafe is closed too."
    private val list = MediateListUi(pack, mapOf(a2.id to (3 to 4), pack.items[1].id to (2 to 3)), true)
    private val lessonListen = MediateUi(true, listenFirst, pack.next(listenFirst.id)!!.id, shown = false, listenFirst = true)
    private val lessonWrite = MediateUi(true, a2, pack.next(a2.id)!!.id, draft.take(70), shown = true)
    private val checked = MediateUi(true, a2, pack.next(a2.id)!!.id, draft + " " + a2.model.split(" ").take(9).joinToString(" "), shown = true, result = Mediate.check(a2, draft + " " + a2.model.split(" ").take(9).joinToString(" ")), best = 3 to 4)

    @Composable private fun screen(name: String) {
        when (name) {
            "list" -> MediateListScreen(list, MediateListActions())
            "listen" -> MediateScreen(lessonListen, MediateActions())
            "write" -> MediateScreen(lessonWrite, MediateActions())
            else -> MediateScreen(checked, MediateActions())
        }
    }

    private fun shot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) { screen(name) } } }
        rule.waitForIdle()
        rule.onRoot().captureRoboImage("src/test/snapshots/mediate-$name-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun listEnLight() = shot("list", "en", false)
    @Test fun listEnDark() = shot("list", "en", true)
    @Test fun listViLight() = shot("list", "vi", false)
    @Test fun listViDark() = shot("list", "vi", true)
    @Test fun listArLight() = shot("list", "ar", false)
    @Test fun listArDark() = shot("list", "ar", true)
    @Test fun listDeLight() = shot("list", "de", false)
    @Test fun listDeDark() = shot("list", "de", true)
    @Test fun listenEnLight() = shot("listen", "en", false)
    @Test fun listenEnDark() = shot("listen", "en", true)
    @Test fun listenArLight() = shot("listen", "ar", false)
    @Test fun listenArDark() = shot("listen", "ar", true)
    @Test fun writeEnLight() = shot("write", "en", false)
    @Test fun writeEnDark() = shot("write", "en", true)
    @Test fun writeViLight() = shot("write", "vi", false)
    @Test fun writeViDark() = shot("write", "vi", true)
    @Test fun writeDeLight() = shot("write", "de", false)
    @Test fun writeDeDark() = shot("write", "de", true)
    @Test fun resultEnLight() = shot("result", "en", false)
    @Test fun resultEnDark() = shot("result", "en", true)
    @Test fun resultViLight() = shot("result", "vi", false)
    @Test fun resultViDark() = shot("result", "vi", true)
    @Test fun resultArLight() = shot("result", "ar", false)
    @Test fun resultArDark() = shot("result", "ar", true)
    @Test fun resultDeLight() = shot("result", "de", false)
    @Test fun resultDeDark() = shot("result", "de", true)
}
