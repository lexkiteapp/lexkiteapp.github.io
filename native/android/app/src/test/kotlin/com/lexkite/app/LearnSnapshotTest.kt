package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.write.Confidence
import com.lexkite.app.core.write.GrammarPack
import com.lexkite.app.core.write.LearnContent
import com.lexkite.app.core.write.Method
import com.lexkite.app.core.write.Quick
import com.lexkite.app.core.write.lList
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.vocab.ConfActions
import com.lexkite.app.feature.vocab.ConfMetrics
import com.lexkite.app.feature.vocab.ConfUi
import com.lexkite.app.feature.vocab.ConfidenceLayout
import com.lexkite.app.feature.vocab.FixActions
import com.lexkite.app.feature.vocab.FixLayout
import com.lexkite.app.feature.vocab.FixUi
import com.lexkite.app.feature.vocab.GrammarHubLayout
import com.lexkite.app.feature.vocab.GrammarIo
import com.lexkite.app.feature.vocab.GrammarLessonLayout
import com.lexkite.app.feature.vocab.GrammarMixLayout
import com.lexkite.app.feature.vocab.LessonState
import com.lexkite.app.feature.vocab.MethodActions
import com.lexkite.app.feature.vocab.MethodLayout
import com.lexkite.app.feature.vocab.MethodUi
import com.lexkite.app.feature.vocab.MixActions
import com.lexkite.app.feature.vocab.MixItem
import com.lexkite.app.feature.vocab.MixState
import com.lexkite.app.feature.vocab.QuickActions
import com.lexkite.app.feature.vocab.QuickLayout
import com.lexkite.app.feature.vocab.QuickQ
import com.lexkite.app.feature.vocab.QuickUi
import com.lexkite.app.feature.vocab.StyleActions
import com.lexkite.app.feature.vocab.StyleLayout
import com.lexkite.app.feature.vocab.StyleUi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.time.Instant
import java.time.ZoneOffset

/**
 * P09 part-2 snapshot gate at 390 dp: #/fix, #/grammar (hub, lesson, mixed test), #/method, #/quick, #/style, #/confidence in en-light, vi-light, ar-light (RTL), de-dark (src/test/snapshots/learn-*).
 * Texts and tables come from the REAL web code (vectors/learn.json, learn-content.json, web/data/grammar-pack.json); fixed learner state, no network, no clock. vi-light and ar-light use mdpi so the whole
 * PR's images stay small. CI records the references on the first run (recordRoborazziDebug), then verifies.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class LearnSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private fun res(n: String) = javaClass.classLoader!!.getResource(n)!!.readText()
    private val content = LearnContent.parse(res("learn-content.json"))!!
    private val pack by lazy { GrammarPack.parse(res("grammar-pack.json"))!! }
    private val now = 1_767_603_600_000L
    private val day = 86_400_000L
    private fun key(t: Long) = Instant.ofEpochMilli(t).atZone(ZoneOffset.UTC).toLocalDate().toString()
    private fun obj(s: String) = Json.parseToJsonElement(s) as JsonObject

    private fun screen(name: String) {
        when (name) {
            "fix" -> { val e = content.fix!!; FixLayout(FixUi(e, e.sample, e.check(e.sample), emptySet(), 1, false, ""), FixActions(), {}) }
            "hub" -> GrammarHubLayout(pack, mapOf("be-am-is-are" to 100, "present-simple" to 90, "present-continuous" to 60), {}, {})
            "lesson" -> GrammarLessonLayout(LessonState(pack, "present-simple", false, shuffle = false), obj("""{"grammarDone":{}}"""), GrammarIo(), {}, {})
            "quiz" -> { val st = LessonState(pack, "present-simple", false, shuffle = false); GrammarLessonLayout(LessonState(pack, "present-simple", false, shuffle = false, step = st.steps.indexOf("quiz")), obj("""{}"""), GrammarIo(), {}, {}) }
            "mix" -> {
                val chap = pack.chapters.first { (it["n"] as JsonPrimitive).content == "1" }
                val items = pack.lessonsOf(chap).flatMap { x -> pack.lessons[x.getValue("id").let { (it as JsonPrimitive).content }].lList("quiz").take(2).map { MixItem(it, null, x) } }.take(5)
                GrammarMixLayout(MixState(pack, items, 1), MixActions(), {})
            }
            "method" -> {
                val srs = { d: Long, s: Double -> obj("""{"last":${now - d * day},"S":$s,"reps":3,"interval":$s,"due":${now - 1}}""") }
                val cards = listOf("alpha", "beta", "gamma", "delta").mapIndexed { i, w -> JsonObject(mapOf("word" to JsonPrimitive(w), "srs" to srs(i + 1L, i + 2.0))) }
                val game = obj("""{"xp":340,"total":{},"days":{"${key(now)}":{"readings":1,"newWords":6,"grammar":1},"${key(now - day)}":{"listens":2,"spoken":3}},"readDone":{"r1":1},"listenDone":{},"grammarDone":{"g1":90},"pronDone":{}}""")
                val r = Method.compute(Method.Input(now, ::key, cards, obj("""{"${key(now)}":12}"""), game, obj("""{"placement":{"stage":"s2","band":"6.0"}}"""), listOf("p1"), 3, listOf("r1", "r2"), listOf("l1", "l2"), listOf("g1", "g2"), listOf("p1", "p2")))
                MethodLayout(MethodUi(content, r, 7f, true, "6.0"), MethodActions(), {})
            }
            "quick" -> QuickLayout(QuickUi("playing", listOf(QuickQ("abandon", "/əˈbændən/", "v", listOf("bỏ rơi", "tiếp tục", "thu thập"), 0), QuickQ("gather", "", "v", listOf("a", "b", "c"), 1)), 0, 1, 11, null), QuickActions())
            "quickResult" -> QuickLayout(QuickUi("done", emptyList(), 0, null, 0, Quick.result(3, 4, false, 11.0)), QuickActions())
            "style" -> StyleLayout(StyleUi(content.style["styles"] as JsonObject, content.style.lList("questions"), 2, null, null), StyleActions(), {})
            "styleResult" -> StyleLayout(StyleUi(content.style["styles"] as JsonObject, content.style.lList("questions"), 6, null, "natural"), StyleActions(), {})
            "conf" -> {
                val daily = JsonArray(listOf(3, 4, 5).mapIndexed { i, d -> obj("""{"d":"2026-01-0$d","at":"$i","score":${52 + i * 9}}""") })
                ConfidenceLayout(ConfUi("overview", null, null, content.conf, obj("""{"done":{"greetings":{"at":1,"sh":80}},"daily":$daily}"""), "2026-01-05"), ConfActions(), {})
            }
            else -> ConfidenceLayout(ConfUi("daily", null, null, content.conf, obj("""{"done":{},"daily":[]}"""), "2026-01-05", metrics = ConfMetrics(118, 112, 3, 4, listOf("nice to meet you"), 1.5), rating = 4, dailyScore = Confidence.score(118.0, 112.0, 1.5, 1, 4), question = content.conf.lList("daily").first()), ConfActions(), {})
        }
    }

    private fun shot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) { screen(name) } } }
        rule.waitForIdle()
        rule.onRoot().captureRoboImage("src/test/snapshots/learn-$name-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun learnFixtureData() { assertTrue(content.fix != null && content.units.size > 20 && pack.lessons.size > 70) }
    @Test fun learnFixEnLight() = shot("fix", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnFixViLight() = shot("fix", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnFixArLight() = shot("fix", "ar", false)
    @Test fun learnFixDeDark() = shot("fix", "de", true)
    @Test fun learnHubEnLight() = shot("hub", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnHubViLight() = shot("hub", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnHubArLight() = shot("hub", "ar", false)
    @Test fun learnHubDeDark() = shot("hub", "de", true)
    @Test fun learnLessonEnLight() = shot("lesson", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnLessonViLight() = shot("lesson", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnLessonArLight() = shot("lesson", "ar", false)
    @Test fun learnLessonDeDark() = shot("lesson", "de", true)
    @Test fun learnQuizEnLight() = shot("quiz", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnQuizViLight() = shot("quiz", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnQuizArLight() = shot("quiz", "ar", false)
    @Test fun learnQuizDeDark() = shot("quiz", "de", true)
    @Test fun learnMixEnLight() = shot("mix", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnMixViLight() = shot("mix", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnMixArLight() = shot("mix", "ar", false)
    @Test fun learnMixDeDark() = shot("mix", "de", true)
    @Test fun learnMethodEnLight() = shot("method", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnMethodViLight() = shot("method", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnMethodArLight() = shot("method", "ar", false)
    @Test fun learnMethodDeDark() = shot("method", "de", true)
    @Test fun learnQuickEnLight() = shot("quick", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnQuickViLight() = shot("quick", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnQuickArLight() = shot("quick", "ar", false)
    @Test fun learnQuickDeDark() = shot("quick", "de", true)
    @Test fun learnQuickResultEnLight() = shot("quickResult", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnQuickResultViLight() = shot("quickResult", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnQuickResultArLight() = shot("quickResult", "ar", false)
    @Test fun learnQuickResultDeDark() = shot("quickResult", "de", true)
    @Test fun learnStyleEnLight() = shot("style", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnStyleViLight() = shot("style", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnStyleArLight() = shot("style", "ar", false)
    @Test fun learnStyleDeDark() = shot("style", "de", true)
    @Test fun learnStyleResultEnLight() = shot("styleResult", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnStyleResultViLight() = shot("styleResult", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnStyleResultArLight() = shot("styleResult", "ar", false)
    @Test fun learnStyleResultDeDark() = shot("styleResult", "de", true)
    @Test fun learnConfEnLight() = shot("conf", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnConfViLight() = shot("conf", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnConfArLight() = shot("conf", "ar", false)
    @Test fun learnConfDeDark() = shot("conf", "de", true)
    @Test fun learnConfDailyEnLight() = shot("confDaily", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnConfDailyViLight() = shot("confDaily", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun learnConfDailyArLight() = shot("confDaily", "ar", false)
    @Test fun learnConfDailyDeDark() = shot("confDaily", "de", true)
}
