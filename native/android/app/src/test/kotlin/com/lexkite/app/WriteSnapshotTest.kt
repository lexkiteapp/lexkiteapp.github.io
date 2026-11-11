package com.lexkite.app

import androidx.compose.runtime.Composable
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.skills.Lexis
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.strs
import com.lexkite.app.core.write.Essay
import com.lexkite.app.core.write.WritePack
import com.lexkite.app.core.write.WritingData
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.vocab.CriteriaLayout
import com.lexkite.app.feature.vocab.EssayActions
import com.lexkite.app.feature.vocab.EssayData
import com.lexkite.app.feature.vocab.EssayLayout
import com.lexkite.app.feature.vocab.EssayReport
import com.lexkite.app.feature.vocab.EssayUi
import com.lexkite.app.feature.vocab.QStatsLayout
import com.lexkite.app.feature.vocab.StudyTx
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * P09 snapshot gate at 390 dp: #/write (editor, report), #/task1 (chart + editor, report), #/qstats and #/criteria in en-light, vi-light, ar-light (RTL), de-dark (src/test/snapshots/write-*).
 * The texts come from the vectors of the REAL web code (vectors/write.json), the tables from web/data/write-pack.json; fixed learner state, no network, no clock. vi-light and ar-light use mdpi so the whole PR's
 * images stay small. CI records the references on the first run (recordRoborazziDebug), then verifies.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class WriteSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private fun res(n: String) = javaClass.classLoader!!.getResource(n)!!.readText()
    private val v = Json.parseToJsonElement(res("write.json")).jsonObject
    private val pack = WritePack.parse(res("write-pack.json"))!!
    private val lexis = Lexis.fromJson(Json.parseToJsonElement(res("skills.json")).jsonObject.getValue("data").jsonObject["lexis"] as JsonObject)
    private fun analyzeText(id: String) = v.getValue("write").jsonObject.ga("analyze").map { it.jsonObject }.first { it.gs("id") == id }.getValue("input").jsonObject.gs("text")
    private fun task1Text(id: String) = v.getValue("task1").jsonObject.ga("score").map { it.jsonObject }.first { it.gs("id") == id }.getValue("input").jsonObject.gs("text")
    private fun obj(s: String) = Json.parseToJsonElement(s).jsonObject
    private val prompts = listOf(
        obj("""{"id":"p1","type":"Agree/Disagree","topic":"education","text":"Some people believe that university education should be free for all students. To what extent do you agree or disagree?"}"""),
        obj("""{"id":"p2","type":"Discussion","topic":"technology","text":"Some people think that technology has made our lives more complicated, while others believe it has made life easier. Discuss both views and give your own opinion."}"""),
    )
    private val sets = listOf(
        obj("""{"id":"energy","type":"line","title":"The line graph shows the percentage of households in one European country that used three main types of energy for heating between 1990 and 2020.","x":["1990","1995","2000","2005","2010","2015","2020"],"unit":"%","series":[["Gas",[62,64,61,55,48,41,35]],["Electricity",[25,24,27,30,33,34,33]],["Renewables",[3,4,6,10,15,22,31]]],"overview":"Overall, gas remained the most common heating source for most of the period, but its share fell steadily, while renewable energy rose dramatically."}"""),
    )
    private val data by lazy { EssayData(pack, WritingData(emptyList(), emptyList(), emptyList(), emptyList(), prompts, sets), emptyList(), emptyMap(), lexis, emptySet()) }
    private val saved = listOf(obj("""{"prompt":"p3","text":"x","words":202,"band":6}"""), obj("""{"prompt":"p2","text":"y","words":251,"band":7.5}"""))
    private val index = v.getValue("data").jsonObject.strs("index").toSet()

    private fun ui(task1: Boolean, text: String, analysed: Boolean): EssayUi {
        val x = (if (task1) sets else prompts)[0]
        val passage = lexis.markText(text)
        val report = if (!analysed) null else if (task1) EssayReport(text, null, Essay.task1Score(text, x.gs("type")), passage) else EssayReport(text, lexis.essay(text, pack.stop) { it in index }, null, passage)
        return EssayUi(task1, data, x, text, report, if (task1) emptyList() else saved, if (task1) 1200 else 2400, false, "")
    }

    @Composable private fun screen(name: String, lang: String) {
        val tx = StudyTx.of(Fixtures.t(lang), Fixtures.t("vi"))
        when (name) {
            "room" -> EssayLayout(ui(false, "Some people believe that university education should be free", false), tx, EssayActions(), {})
            "report" -> EssayLayout(ui(false, analyzeText("band-6.5-essay"), true), tx, EssayActions(), {})
            "task1" -> EssayLayout(ui(true, "The line graph shows how the percentage of households", false), tx, EssayActions(), {})
            "task1Report" -> EssayLayout(ui(true, task1Text("good-line"), true), tx, EssayActions(), {})
            "qstats" -> {
                val game = v.getValue("qstats").jsonObject.ga("cases").map { it.jsonObject }.first { it.gs("id") == "listening-reading" }.getValue("input").jsonObject.getValue("qstat").jsonObject
                QStatsLayout(pack, Essay.qstatCards(JsonObject(mapOf("qstat" to game)), pack.skills.map { it[0] }), true, {}, {})
            }
            else -> CriteriaLayout(pack, true, tx, "writing", {}, {}, {}, {})
        }
    }

    private fun shot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) { screen(name, lang) } } }
        rule.waitForIdle()
        rule.onRoot().captureRoboImage("src/test/snapshots/write-$name-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun writeFixtureData() { assertTrue(pack.outline.isNotEmpty() && analyzeText("band-6.5-essay").length > 500 && task1Text("good-line").length > 500) }
    @Test fun writeRoomEnLight() = shot("room", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeRoomViLight() = shot("room", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeRoomArLight() = shot("room", "ar", false)
    @Test fun writeRoomDeDark() = shot("room", "de", true)
    @Test fun writeReportEnLight() = shot("report", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeReportViLight() = shot("report", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeReportArLight() = shot("report", "ar", false)
    @Test fun writeReportDeDark() = shot("report", "de", true)
    @Test fun writeTask1EnLight() = shot("task1", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeTask1ViLight() = shot("task1", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeTask1ArLight() = shot("task1", "ar", false)
    @Test fun writeTask1DeDark() = shot("task1", "de", true)
    @Test fun writeTask1ReportEnLight() = shot("task1Report", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeTask1ReportViLight() = shot("task1Report", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeTask1ReportArLight() = shot("task1Report", "ar", false)
    @Test fun writeTask1ReportDeDark() = shot("task1Report", "de", true)
    @Test fun writeQStatsEnLight() = shot("qstats", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeQStatsViLight() = shot("qstats", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeQStatsArLight() = shot("qstats", "ar", false)
    @Test fun writeQStatsDeDark() = shot("qstats", "de", true)
    @Test fun writeCriteriaEnLight() = shot("criteria", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeCriteriaViLight() = shot("criteria", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun writeCriteriaArLight() = shot("criteria", "ar", false)
    @Test fun writeCriteriaDeDark() = shot("criteria", "de", true)
}
