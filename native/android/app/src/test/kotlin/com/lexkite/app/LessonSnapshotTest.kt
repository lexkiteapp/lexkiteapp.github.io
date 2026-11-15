package com.lexkite.app

import androidx.compose.foundation.layout.Box
import com.lexkite.app.design.LocalLKColors
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.width
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.unit.dp
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.lesson.LessonEngine
import com.lexkite.app.core.lesson.Off
import com.lexkite.app.design.LKTheme
import com.lexkite.app.feature.lesson.LessonActions
import com.lexkite.app.feature.lesson.LessonController
import com.lexkite.app.feature.lesson.LessonScreen
import com.lexkite.app.feature.lesson.LessonSlots
import com.lexkite.app.feature.lesson.LessonUi
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.TeacherStill
import com.lexkite.app.ui.TeacherView
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * P03 + C05 snapshot gate at 390 dp: question (gap · build · match · type), feedback right / wrong, completion and a story line, light/dark x en/vi/ar(RTL)/de(+40 %)
 * = 72 images (src/test/snapshots/lesson-*) + the live teacher (teacher-*). Fixed inputs from the shared lesson vectors (no network, no DB); CI records new images on the first run, then verifies.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-xxhdpi")
class LessonSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("lesson.json")!!.readText()).jsonObject
    private val cards = v.getValue("inputs").jsonObject.getValue("cards").jsonArray.map { it.jsonObject }
    private val starter = v.getValue("inputs").jsonObject.getValue("starter").jsonArray.map { it.jsonObject }
    private val now = v.getValue("now").jsonPrimitive.long

    private val imgWords = v.getValue("inputs").jsonObject.getValue("imgWords").jsonArray.map { it.jsonPrimitive.content }.toSet()
    private val imgFn: (String, String) -> Boolean = { w, _ -> w in imgWords }
    private fun lesson(seed: Long, img: Boolean = false): LessonController {
        val picks = LessonEngine.pickWords(cards, 6, now, null, starter)
        val items = LessonEngine.build(picks, LessonEngine.BuildOpts(seed, cards + starter, Off(), null, hasImg = imgFn.takeIf { img }, mean = { c -> (c["vi"] as? JsonPrimitive)?.content.orEmpty() }, gloss = { _, en -> (v.getValue("inputs").jsonObject.getValue("gloss").jsonObject[en] as? JsonPrimitive)?.content.orEmpty() }), now)
        return LessonController(items, picks, cards, seed = 1, now = { now })
    }
    /** First lesson (by seed) whose current exercise has [type], played on with right answers until it comes up (the engine puts the rarest kind of the first word first, so
     *  gap / build / match are never exercise #1). */
    private fun at(type: String): LessonController {
        for (s in 1L..300L) {
            val c = lesson(s, img = type == "pic"); var guard = 0
            while (c.finish == null && c.sess.cur!!.type != type && guard++ < 80) { c.pickRight(); if (c.feedback != null) c.next() }
            if (c.finish == null && c.sess.cur!!.type == type) return c
        }
        error("no lesson with $type")
    }
    private fun LessonController.pickRight() {
        val it = sess.cur!!
        when (it.type) {
            "build", "tr" -> { it.answer.split(" ").forEach { w -> placeTile(it.tiles!!.indices.first { i -> i !in st.tiles && LessonEngine.same(it.tiles!![i], w) }) }; check() }
            "type" -> { type(it.answer); check() }
            "say" -> spoke(0.95, "")
            "pic" -> if (it.choice == true) { pick(it.answer); check() } else spoke(0.95, "")
            "match" -> { for (i in 0 until it.pairs!!.size) { matchTap(true, i); matchTap(false, i) } }
            else -> { pick(it.answer); check() }
        }
    }
    private fun stories(): List<JsonObject> { val t = File("../../../web/cpack/lesson/stories.js").readText(); return Json.parseToJsonElement(t.substring(t.indexOf("self.LESSON_STORIES")).substringAfter("=").trim().removeSuffix(";").trim()).jsonArray.map { it.jsonObject } }

    private fun uiOf(screen: String): LessonUi {
        when (screen) {
            "question-gap" -> { val c = at("gap"); c.pick(c.sess.cur!!.options!!.first { it != c.sess.cur!!.answer }); return c.ui() }
            "question-build" -> { val c = at("build"); val it = c.sess.cur!!; val w = it.answer.split(" "); repeat(minOf(2, w.size)) { k -> c.placeTile(it.tiles!!.indices.first { i -> i !in c.st.tiles && LessonEngine.same(it.tiles!![i], w[k]) }) }; return c.ui() }
            "question-match" -> { val c = at("match"); c.matchTap(true, 0); c.matchTap(false, 0); c.matchTap(true, 1); return c.ui() }
            "question-pic" -> { val c = at("pic"); c.pick(c.sess.cur!!.options!!.first { it != c.sess.cur!!.answer }); return c.ui() }
            "question-type" -> { val c = at("type"); c.type(c.sess.cur!!.answer.take(2)); return c.ui() }
            "feedback-correct" -> { val c = at("gap"); c.pick(c.sess.cur!!.answer); c.check(); return c.ui() }
            "feedback-wrong" -> { val c = at("gap"); c.pick(c.sess.cur!!.options!!.first { it != c.sess.cur!!.answer }); c.check(); return c.ui() }
            "complete" -> { val c = lesson(7); var n = 0; while (c.finish == null && n++ < 120) { val it = c.sess.cur!!; if (n == 3) { if (it.type == "gap" || it.type == "mean") c.pick(it.options!!.first { o -> o != it.answer }).also { c.check() } else c.pickRight() } else c.pickRight(); if (c.feedback != null) c.next() }; return c.ui() }
            else -> { val st = stories().first(); val items = LessonEngine.storyItems(st, "en", 2); val c = LessonController(items, emptyList(), emptyList(), seed = 1, now = { now }); c.lineContinue(); return c.ui() }
        }
    }

    private val slots = LessonSlots(
        teacher = { who, _, mod -> Box(mod) { TeacherStill(who, "thinking") } },
        still = { who, pose, mod -> Box(mod) { TeacherStill(who, pose) } },
        // no network in tests: the picture slot shows a bundled bitmap in the same fixed square box
        image = { _, desc, mod -> androidx.compose.foundation.Image(com.lexkite.app.ui.TeacherArt.bundledRel(androidx.compose.ui.platform.LocalContext.current, "teach/ama/still-happy.webp")!!.asImageBitmap(), desc, mod, contentScale = androidx.compose.ui.layout.ContentScale.Crop) },
    )

    private fun shot(screen: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang); val ui = uiOf(screen)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { LessonScreen(ui, "ama", t(L10nKey.lessonKindLesson), LessonActions(), slots, imageUrl = { _, _ -> "test://pic" }, pose = if (ui.feedback?.ok == true) "cheer" else if (ui.feedback != null) "concern" else null) } }
        rule.onRoot().captureRoboImage("src/test/snapshots/lesson-$screen-$lang-${if (dark) "dark" else "light"}.png")
    }

    private fun teacher(who: String, dark: Boolean) {
        val t = Fixtures.t("en")
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.width(220.dp).height(190.dp).background(LocalLKColors.current.background)) { TeacherView(who, null, Modifier.width(220.dp).height(190.dp)) } } }
        rule.onRoot().captureRoboImage("src/test/snapshots/teacher-$who-${if (dark) "dark" else "light"}.png")
    }

    @Test fun questionGapEnLight() = shot("question-gap", "en", false)
    @Test fun questionGapEnDark() = shot("question-gap", "en", true)
    @Test fun questionGapViLight() = shot("question-gap", "vi", false)
    @Test fun questionGapViDark() = shot("question-gap", "vi", true)
    @Test fun questionGapArLight() = shot("question-gap", "ar", false)
    @Test fun questionGapArDark() = shot("question-gap", "ar", true)
    @Test fun questionGapDeLight() = shot("question-gap", "de", false)
    @Test fun questionGapDeDark() = shot("question-gap", "de", true)

    @Test fun questionBuildEnLight() = shot("question-build", "en", false)
    @Test fun questionBuildEnDark() = shot("question-build", "en", true)
    @Test fun questionBuildViLight() = shot("question-build", "vi", false)
    @Test fun questionBuildViDark() = shot("question-build", "vi", true)
    @Test fun questionBuildArLight() = shot("question-build", "ar", false)
    @Test fun questionBuildArDark() = shot("question-build", "ar", true)
    @Test fun questionBuildDeLight() = shot("question-build", "de", false)
    @Test fun questionBuildDeDark() = shot("question-build", "de", true)

    @Test fun questionMatchEnLight() = shot("question-match", "en", false)
    @Test fun questionMatchEnDark() = shot("question-match", "en", true)
    @Test fun questionMatchViLight() = shot("question-match", "vi", false)
    @Test fun questionMatchViDark() = shot("question-match", "vi", true)
    @Test fun questionMatchArLight() = shot("question-match", "ar", false)
    @Test fun questionMatchArDark() = shot("question-match", "ar", true)
    @Test fun questionMatchDeLight() = shot("question-match", "de", false)
    @Test fun questionMatchDeDark() = shot("question-match", "de", true)

    @Test fun questionTypeEnLight() = shot("question-type", "en", false)
    @Test fun questionTypeEnDark() = shot("question-type", "en", true)
    @Test fun questionTypeViLight() = shot("question-type", "vi", false)
    @Test fun questionTypeViDark() = shot("question-type", "vi", true)
    @Test fun questionTypeArLight() = shot("question-type", "ar", false)
    @Test fun questionTypeArDark() = shot("question-type", "ar", true)
    @Test fun questionTypeDeLight() = shot("question-type", "de", false)
    @Test fun questionTypeDeDark() = shot("question-type", "de", true)

    @Test fun feedbackCorrectEnLight() = shot("feedback-correct", "en", false)
    @Test fun feedbackCorrectEnDark() = shot("feedback-correct", "en", true)
    @Test fun feedbackCorrectViLight() = shot("feedback-correct", "vi", false)
    @Test fun feedbackCorrectViDark() = shot("feedback-correct", "vi", true)
    @Test fun feedbackCorrectArLight() = shot("feedback-correct", "ar", false)
    @Test fun feedbackCorrectArDark() = shot("feedback-correct", "ar", true)
    @Test fun feedbackCorrectDeLight() = shot("feedback-correct", "de", false)
    @Test fun feedbackCorrectDeDark() = shot("feedback-correct", "de", true)

    @Test fun feedbackWrongEnLight() = shot("feedback-wrong", "en", false)
    @Test fun feedbackWrongEnDark() = shot("feedback-wrong", "en", true)
    @Test fun feedbackWrongViLight() = shot("feedback-wrong", "vi", false)
    @Test fun feedbackWrongViDark() = shot("feedback-wrong", "vi", true)
    @Test fun feedbackWrongArLight() = shot("feedback-wrong", "ar", false)
    @Test fun feedbackWrongArDark() = shot("feedback-wrong", "ar", true)
    @Test fun feedbackWrongDeLight() = shot("feedback-wrong", "de", false)
    @Test fun feedbackWrongDeDark() = shot("feedback-wrong", "de", true)

    @Test fun completeEnLight() = shot("complete", "en", false)
    @Test fun completeEnDark() = shot("complete", "en", true)
    @Test fun completeViLight() = shot("complete", "vi", false)
    @Test fun completeViDark() = shot("complete", "vi", true)
    @Test fun completeArLight() = shot("complete", "ar", false)
    @Test fun completeArDark() = shot("complete", "ar", true)
    @Test fun completeDeLight() = shot("complete", "de", false)
    @Test fun completeDeDark() = shot("complete", "de", true)

    @Test fun storyLineEnLight() = shot("story-line", "en", false)
    @Test fun storyLineEnDark() = shot("story-line", "en", true)
    @Test fun storyLineViLight() = shot("story-line", "vi", false)
    @Test fun storyLineViDark() = shot("story-line", "vi", true)
    @Test fun storyLineArLight() = shot("story-line", "ar", false)
    @Test fun storyLineArDark() = shot("story-line", "ar", true)
    @Test fun storyLineDeLight() = shot("story-line", "de", false)
    @Test fun storyLineDeDark() = shot("story-line", "de", true)

    @Test fun questionPicEnLight() = shot("question-pic", "en", false)
    @Test fun questionPicEnDark() = shot("question-pic", "en", true)
    @Test fun questionPicViLight() = shot("question-pic", "vi", false)
    @Test fun questionPicViDark() = shot("question-pic", "vi", true)
    @Test fun questionPicArLight() = shot("question-pic", "ar", false)
    @Test fun questionPicArDark() = shot("question-pic", "ar", true)
    @Test fun questionPicDeLight() = shot("question-pic", "de", false)
    @Test fun questionPicDeDark() = shot("question-pic", "de", true)

    @Test fun teacherAmaLight() = teacher("ama", false)
    @Test fun teacherAmaDark() = teacher("ama", true)
    @Test fun teacherCarlosLight() = teacher("carlos", false)
    @Test fun teacherCarlosDark() = teacher("carlos", true)
}
