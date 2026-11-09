package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.skills.Dictation
import com.lexkite.app.core.skills.ListenHub
import com.lexkite.app.core.skills.ListenPage
import com.lexkite.app.core.skills.ListenTest
import com.lexkite.app.core.skills.Qx
import com.lexkite.app.core.skills.Reader
import com.lexkite.app.core.skills.SkillsContent
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.skills.DictActions
import com.lexkite.app.feature.skills.DictLine
import com.lexkite.app.feature.skills.DictUi
import com.lexkite.app.feature.skills.DictationScreen
import com.lexkite.app.feature.skills.HubActions
import com.lexkite.app.feature.skills.HubUi
import com.lexkite.app.feature.skills.ListenActions
import com.lexkite.app.feature.skills.ListenHubScreen
import com.lexkite.app.feature.skills.ListenScreen
import com.lexkite.app.feature.skills.ListenTestScreen
import com.lexkite.app.feature.skills.ListenUi
import com.lexkite.app.feature.skills.PopupUi
import com.lexkite.app.feature.skills.ReaderActions
import com.lexkite.app.feature.skills.ReaderScreen
import com.lexkite.app.feature.skills.ReaderUi
import com.lexkite.app.feature.skills.ReadingActions
import com.lexkite.app.feature.skills.ReadingListScreen
import com.lexkite.app.feature.skills.ReadingUi
import com.lexkite.app.feature.skills.TestActions
import com.lexkite.app.feature.skills.TestUi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.put
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * M4 listening + reading snapshot gate at 390 dp: every state of the six routes (hub, player practice / playing / blocked / popup / result / exam, mock test intro / read time / playing /
 * blocked / ended / result, dictation boxes / checked / diff / finish, reading list, reader / popup / result) in en-light, vi-light, ar-light (RTL), de-dark (src/test/snapshots/skills-*).
 * The data is the real part and passage of vectors/skills.json `data`; no clock, no network. CI records the references on the first run (recordRoborazziDebug), then verifies.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class SkillsSnapshotTest {
    @get:Rule val rule = createComposeRule()

    // ---- fixed inputs (the vector data) ----
    init { SkillsContent.parse(Json.parseToJsonElement(javaClass.classLoader!!.getResource("skills-pack.json")!!.readText()).jsonObject) } // installs the band/voice/stopword consts
    private val content = SkillsContent.parse(Json.parseToJsonElement(javaClass.classLoader!!.getResource("skills.json")!!.readText()).jsonObject.getValue("data").jsonObject)
    private val parts = content.partsOf(1); private val p = parts[0]
    private val reading = content.reading("urban-farming")!!
    private val game = Json.parseToJsonElement("""{"listenBest":{"1":7},"listenDone":{"t1p1":8},"readDone":{"urban-farming":"4/5"}}""")
    private val answers = mapOf<String, Any?>("1" to "Caulfield", "2" to "Linnet", "3" to "0773", "9" to "1", "10" to "0")
    private val submit = ListenPage.submit(p, answers, null, emptyList(), 0L)
    private val rows = ListenPage.transcript(p, content.lexis, false)
    private val practice = ListenUi(ListenPage.page(p, false, null), answers, rows = rows)
    private val dictLines = Dictation.lines(p)
    private fun dictLine(k: Int, mode: String) = DictLine(dictLines[k], Dictation.cells(Dictation.toks(dictLines[k].t!!), mode))
    private fun entry(word: String, ipa: String, vi: String, def: String) = buildJsonObject { put("word", word); put("ipa", ipa); put("pos", "noun"); put("level", "B1"); put("vi", vi); put("def", def) }
    private val membership = PopupUi("membership", p.script[3].t!!, entry = entry("membership", "/ˈmem.bə.ʃɪp/", "tư cách hội viên", "the state of belonging to a group"), translation = "tư cách hội viên", saved = false)
    private val sustainable = PopupUi("sustainable", "Supporters argue that this can reduce pollution and help cities become more sustainable.", entry = entry("sustainable", "/səˈsteɪ.nə.bəl/", "bền vững", "able to continue over a long period"), translation = "bền vững", details = true)
    /** answers of [part]: the first [k] questions right (accepted answer), the rest wrong; [wrongEvery2] = every second question wrong instead */
    private fun answersOf(part: com.lexkite.app.core.skills.Part, k: Int = Int.MAX_VALUE, wrongEvery2: Boolean = false): Map<String, Any?> {
        val out = linkedMapOf<String, Any?>(); val res = Qx.collect(part, emptyMap()); var i = 0
        for ((n, r) in res) { i++; val right = i <= k && !(wrongEvery2 && i % 2 == 0)
            if (r.type == "multi") { val gi = Qx.groupIndex(part, n) ?: continue; out["m$gi"] = if (right) r.alts else emptyList<String>(); continue }
            out[n.toString()] = if (right) r.alts.firstOrNull().orEmpty() else "zzz" }
        return out
    }
    private val p2 = parts[1]; private val a2 = answersOf(p2, wrongEvery2 = true); private val submit2 = ListenPage.submit(p2, a2, null, emptyList(), 0L)
    private val keepRight2 = a2.filterKeys { k -> k.toIntOrNull()?.let { submit2.res.getValue(it).ok } == true }
    private fun practiceOf(part: com.lexkite.app.core.skills.Part, ans: Map<String, Any?>) = ListenUi(ListenPage.page(part, false, null), ans, rows = ListenPage.transcript(part, content.lexis, false))
    private fun results() = java.util.TreeMap<Int, Pair<Qx.Res, String>>().also { m -> for ((k, x) in parts.withIndex()) for ((q, r) in Qx.collect(x, answersOf(x, if (k == 0) 6 else 5))) m[q] = r to x.id } // 21 of 40: Band 5.5
    private fun typedRight(k: Int, mode: String) = Dictation.cells(Dictation.toks(dictLines[k].t!!), mode).filter { it.hole }.map { Dictation.answerOf(it) }

    @Composable private fun screen(name: String, lang: String) {
        val read = Reader.passage(reading, content.lexis) { it == "residents" }
        val summary = Reader.list(content, emptyMap(), null, game, lang).cards.first { it.r.id == reading.id }.summary
        val testPart = TestUi(1, TestUi.Phase.PART, p, 0, 4, partIds = parts.map { it.id }, answers = answers)
        when (name) {
            "hub" -> ListenHubScreen(HubUi(ListenHub.hub(content, emptyMap(), null, game, lang), lang), HubActions())
            "hubEmpty" -> ListenHubScreen(HubUi(ListenHub.hub(SkillsContent(emptyList(), emptyList(), content.lexis), emptyMap(), null, null, lang), lang), HubActions())
            "practice" -> ListenScreen(practice, ListenActions())
            "playing" -> ListenScreen(practice.copy(playing = true, plays = 1, line = 3, live = true), ListenActions())
            "blocked" -> ListenScreen(practice.copy(plays = 1, blocked = true), ListenActions())
            "popup" -> ListenScreen(practice.copy(live = true, popup = membership), ListenActions())
            "popupMiss" -> ListenScreen(practice.copy(live = true, popup = PopupUi("zzqx", "Oh, hello.")), ListenActions())
            "result" -> ListenScreen(practiceOf(p2, a2).copy(submit = submit2, live = true, rows = ListenPage.transcript(p2, content.lexis, true), saved = setOf(0)), ListenActions())
            // "Làm lại câu sai": the wrong answers cleared (retake) and, after Check, the re-graded rows (recheck); the results-by-type card is part of "result" above
            "retake" -> ListenScreen(practiceOf(p2, keepRight2).copy(submit = submit2, live = true, rows = ListenPage.transcript(p2, content.lexis, true), retake = true), ListenActions())
            "retakeChecked" -> { val fixed = a2 + answersOf(p2).filterKeys { k -> k !in keepRight2 }
                ListenScreen(practiceOf(p2, fixed).copy(submit = submit2, live = true, rows = ListenPage.transcript(p2, content.lexis, true), retake = true,
                    recheck = submit2.res.filterValues { !it.ok }.mapValues { (n, r) -> Qx.recheck(r, Qx.answerFor(p2, fixed, n)) }), ListenActions()) }
            "exam" -> ListenScreen(ListenUi(ListenPage.page(parts[3], true, null), emptyMap()), ListenActions())
            "testIntro" -> ListenTestScreen(TestUi(1, TestUi.Phase.INTRO, parts = 4), TestActions())
            "testCount" -> ListenTestScreen(testPart.copy(left = 24), TestActions())
            "testPlaying" -> ListenTestScreen(testPart.copy(started = true, sounding = true, line = 2), TestActions())
            "testBlocked" -> ListenTestScreen(testPart.copy(started = true, blocked = true, line = 0), TestActions())
            "testEnded" -> ListenTestScreen(testPart.copy(started = true, ended = true, nextOpen = true), TestActions())
            "testResult" -> { val r = results(); val d = ListenTest.finish(1, parts, r, null, emptyList(), 0L)
                ListenTestScreen(TestUi(1, TestUi.Phase.RESULT, parts = 4, done = d, partIds = parts.map { it.id }, sheet = d.sheet.take(12).map { q -> Triple(q, r.getValue(q).first, r.getValue(q).first.ok) }), TestActions()) }
            "dictFill" -> DictationScreen(DictUi(p, "mid", 0, dictLines.size, dictLine(0, "mid"), typed = listOf("Good", "", "Community")), DictActions())
            "dictChecked" -> DictationScreen(DictUi(p, "mid", 1, dictLines.size, dictLine(1, "mid"), typed = typedRight(1, "mid").mapIndexed { i, w -> if (i % 2 == 0) w else "x" }, check = Dictation.check(dictLines[1], "mid", typedRight(1, "mid").mapIndexed { i, w -> if (i % 2 == 0) w else "x" }, "")), DictActions())
            "dictDiff" -> DictationScreen(DictUi(p, "full", 2, dictLines.size, dictLine(2, "full"), full = "yes of course i can take your details now then you really pop in", check = Dictation.check(dictLines[2], "full", emptyList(), "yes of course i can take your details now then you really pop in")), DictActions())
            "dictFin" -> DictationScreen(DictUi(p, "mid", 4, dictLines.size, dictLine(4, "mid"), fin = Dictation.finish(p.id, "mid", 3.2, 4, null)), DictActions())
            "readList" -> ReadingListScreen(ReadingUi(Reader.list(content, emptyMap(), null, game, lang)), ReadingActions())
            "reader" -> ReaderScreen(ReaderUi(reading, summary, read, active = "sustainable"), ReaderActions())
            "readerPopup" -> ReaderScreen(ReaderUi(reading, summary, read, active = "sustainable", popup = sustainable), ReaderActions())
            else -> { val picks = listOf("FALSE", "TRUE", "TRUE", "1", "3"); val g = Reader.grade(reading, picks, null, emptyList(), 0L)
                ReaderScreen(ReaderUi(reading, summary, read, picks = picks.mapIndexed { i, v -> i to v }.toMap(), graded = g), ReaderActions()) }
        }
    }

    private fun shot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) { screen(name, lang) } } }
        rule.onRoot().captureRoboImage("src/test/snapshots/skills-$name-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun hubEnLight() = shot("hub", "en", false)
    @Test fun hubViLight() = shot("hub", "vi", false)
    @Test fun hubArLight() = shot("hub", "ar", false)
    @Test fun hubDeDark() = shot("hub", "de", true)
    @Test fun hubEmptyEnLight() = shot("hubEmpty", "en", false)
    @Test fun hubEmptyViLight() = shot("hubEmpty", "vi", false)
    @Test fun hubEmptyArLight() = shot("hubEmpty", "ar", false)
    @Test fun hubEmptyDeDark() = shot("hubEmpty", "de", true)
    @Test fun practiceEnLight() = shot("practice", "en", false)
    @Test fun practiceViLight() = shot("practice", "vi", false)
    @Test fun practiceArLight() = shot("practice", "ar", false)
    @Test fun practiceDeDark() = shot("practice", "de", true)
    @Test fun playingEnLight() = shot("playing", "en", false)
    @Test fun playingViLight() = shot("playing", "vi", false)
    @Test fun playingArLight() = shot("playing", "ar", false)
    @Test fun playingDeDark() = shot("playing", "de", true)
    @Test fun blockedEnLight() = shot("blocked", "en", false)
    @Test fun blockedViLight() = shot("blocked", "vi", false)
    @Test fun blockedArLight() = shot("blocked", "ar", false)
    @Test fun blockedDeDark() = shot("blocked", "de", true)
    @Test fun popupEnLight() = shot("popup", "en", false)
    @Test fun popupViLight() = shot("popup", "vi", false)
    @Test fun popupArLight() = shot("popup", "ar", false)
    @Test fun popupDeDark() = shot("popup", "de", true)
    @Test fun popupMissEnLight() = shot("popupMiss", "en", false)
    @Test fun popupMissViLight() = shot("popupMiss", "vi", false)
    @Test fun popupMissArLight() = shot("popupMiss", "ar", false)
    @Test fun popupMissDeDark() = shot("popupMiss", "de", true)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun resultEnLight() = shot("result", "en", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun resultViLight() = shot("result", "vi", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun resultArLight() = shot("result", "ar", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun resultDeDark() = shot("result", "de", true)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun retakeEnLight() = shot("retake", "en", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun retakeViLight() = shot("retake", "vi", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun retakeArLight() = shot("retake", "ar", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun retakeDeDark() = shot("retake", "de", true)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun retakeCheckedEnLight() = shot("retakeChecked", "en", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun retakeCheckedViLight() = shot("retakeChecked", "vi", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun retakeCheckedArLight() = shot("retakeChecked", "ar", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun retakeCheckedDeDark() = shot("retakeChecked", "de", true)
    @Test fun examEnLight() = shot("exam", "en", false)
    @Test fun examViLight() = shot("exam", "vi", false)
    @Test fun examArLight() = shot("exam", "ar", false)
    @Test fun examDeDark() = shot("exam", "de", true)
    @Test fun testIntroEnLight() = shot("testIntro", "en", false)
    @Test fun testIntroViLight() = shot("testIntro", "vi", false)
    @Test fun testIntroArLight() = shot("testIntro", "ar", false)
    @Test fun testIntroDeDark() = shot("testIntro", "de", true)
    @Test fun testCountEnLight() = shot("testCount", "en", false)
    @Test fun testCountViLight() = shot("testCount", "vi", false)
    @Test fun testCountArLight() = shot("testCount", "ar", false)
    @Test fun testCountDeDark() = shot("testCount", "de", true)
    @Test fun testPlayingEnLight() = shot("testPlaying", "en", false)
    @Test fun testPlayingViLight() = shot("testPlaying", "vi", false)
    @Test fun testPlayingArLight() = shot("testPlaying", "ar", false)
    @Test fun testPlayingDeDark() = shot("testPlaying", "de", true)
    @Test fun testBlockedEnLight() = shot("testBlocked", "en", false)
    @Test fun testBlockedViLight() = shot("testBlocked", "vi", false)
    @Test fun testBlockedArLight() = shot("testBlocked", "ar", false)
    @Test fun testBlockedDeDark() = shot("testBlocked", "de", true)
    @Test fun testEndedEnLight() = shot("testEnded", "en", false)
    @Test fun testEndedViLight() = shot("testEnded", "vi", false)
    @Test fun testEndedArLight() = shot("testEnded", "ar", false)
    @Test fun testEndedDeDark() = shot("testEnded", "de", true)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun testResultEnLight() = shot("testResult", "en", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun testResultViLight() = shot("testResult", "vi", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun testResultArLight() = shot("testResult", "ar", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun testResultDeDark() = shot("testResult", "de", true)
    @Test fun dictFillEnLight() = shot("dictFill", "en", false)
    @Test fun dictFillViLight() = shot("dictFill", "vi", false)
    @Test fun dictFillArLight() = shot("dictFill", "ar", false)
    @Test fun dictFillDeDark() = shot("dictFill", "de", true)
    @Test fun dictCheckedEnLight() = shot("dictChecked", "en", false)
    @Test fun dictCheckedViLight() = shot("dictChecked", "vi", false)
    @Test fun dictCheckedArLight() = shot("dictChecked", "ar", false)
    @Test fun dictCheckedDeDark() = shot("dictChecked", "de", true)
    @Test fun dictDiffEnLight() = shot("dictDiff", "en", false)
    @Test fun dictDiffViLight() = shot("dictDiff", "vi", false)
    @Test fun dictDiffArLight() = shot("dictDiff", "ar", false)
    @Test fun dictDiffDeDark() = shot("dictDiff", "de", true)
    @Test fun dictFinEnLight() = shot("dictFin", "en", false)
    @Test fun dictFinViLight() = shot("dictFin", "vi", false)
    @Test fun dictFinArLight() = shot("dictFin", "ar", false)
    @Test fun dictFinDeDark() = shot("dictFin", "de", true)
    @Test fun readListEnLight() = shot("readList", "en", false)
    @Test fun readListViLight() = shot("readList", "vi", false)
    @Test fun readListArLight() = shot("readList", "ar", false)
    @Test fun readListDeDark() = shot("readList", "de", true)
    @Test fun readerEnLight() = shot("reader", "en", false)
    @Test fun readerViLight() = shot("reader", "vi", false)
    @Test fun readerArLight() = shot("reader", "ar", false)
    @Test fun readerDeDark() = shot("reader", "de", true)
    @Test fun readerPopupEnLight() = shot("readerPopup", "en", false)
    @Test fun readerPopupViLight() = shot("readerPopup", "vi", false)
    @Test fun readerPopupArLight() = shot("readerPopup", "ar", false)
    @Test fun readerPopupDeDark() = shot("readerPopup", "de", true)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun readerResultEnLight() = shot("readerResult", "en", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun readerResultViLight() = shot("readerResult", "vi", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun readerResultArLight() = shot("readerResult", "ar", false)
    @Config(qualifiers = "w390dp-h2600dp-hdpi") @Test fun readerResultDeDark() = shot("readerResult", "de", true)
}
