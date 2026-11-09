package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.test.hasScrollAction
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.performSemanticsAction
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
import com.lexkite.app.core.speak.HandsFree
import com.lexkite.app.core.speak.HfWord
import com.lexkite.app.core.speak.MicOutcome
import com.lexkite.app.core.speak.PairItem
import com.lexkite.app.core.speak.PairSession
import com.lexkite.app.core.speak.PronCoach
import com.lexkite.app.core.speak.PronPage
import com.lexkite.app.core.speak.PronPairs
import com.lexkite.app.core.speak.Reflex
import com.lexkite.app.core.speak.Roleplay
import com.lexkite.app.core.speak.Rtype
import com.lexkite.app.core.speak.SayData
import com.lexkite.app.core.speak.SayLogic
import com.lexkite.app.core.speak.SpeakDrill
import com.lexkite.app.core.speak.SpeakHub
import com.lexkite.app.core.speak.SpeakPack
import com.lexkite.app.core.speak.SpeakingRoom
import com.lexkite.app.core.speak.Situation
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.feature.speak.*
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonPrimitive
import java.util.Locale
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
        val summary = Reader.list(content, emptyMap(), null, game, lang).cards.first { it.r.id == reading.id }.shown
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
        // the long pages are captured at the state they exist for (small frame, like the other shots): the result block, or the retake card
        when (name) {
            "result", "readerResult" -> rule.onAllNodes(hasScrollAction())[0].performSemanticsAction(SemanticsActions.ScrollBy) { it(0f, 1_000_000f) }
            "retake", "retakeChecked" -> rule.onNodeWithTag("skills-retake").performScrollTo()
        }
        rule.waitForIdle()
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
    @Test fun resultEnLight() = shot("result", "en", false)
    @Test fun resultViLight() = shot("result", "vi", false)
    @Test fun resultArLight() = shot("result", "ar", false)
    @Test fun resultDeDark() = shot("result", "de", true)
    @Test fun retakeEnLight() = shot("retake", "en", false)
    @Test fun retakeViLight() = shot("retake", "vi", false)
    @Test fun retakeArLight() = shot("retake", "ar", false)
    @Test fun retakeDeDark() = shot("retake", "de", true)
    @Test fun retakeCheckedEnLight() = shot("retakeChecked", "en", false)
    @Test fun retakeCheckedViLight() = shot("retakeChecked", "vi", false)
    @Test fun retakeCheckedArLight() = shot("retakeChecked", "ar", false)
    @Test fun retakeCheckedDeDark() = shot("retakeChecked", "de", true)
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
    @Test fun testResultEnLight() = shot("testResult", "en", false)
    @Test fun testResultViLight() = shot("testResult", "vi", false)
    @Test fun testResultArLight() = shot("testResult", "ar", false)
    @Test fun testResultDeDark() = shot("testResult", "de", true)
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
    @Test fun readerResultEnLight() = shot("readerResult", "en", false)
    @Test fun readerResultViLight() = shot("readerResult", "vi", false)
    @Test fun readerResultArLight() = shot("readerResult", "ar", false)
    @Test fun readerResultDeDark() = shot("readerResult", "de", true)

    // ================================================================== P07: speaking & pronunciation snapshots (src/test/snapshots/speak-*) ==================================================================
    private val spv by lazy { Json.parseToJsonElement(javaClass.classLoader!!.getResource("speak.json")!!.readText()).jsonObject }
    private val spack by lazy { SpeakPack.parse(javaClass.classLoader!!.getResource("speak-pack.json")!!.readText())!! }
    private val spData by lazy { spv.getValue("data").jsonObject }
    private val cafe by lazy { Situation(spData.getValue("situations").jsonObject.getValue("cafe").jsonObject, "en") }
    private val sayData by lazy { SayData(spData.getValue("say").jsonObject) }
    private val rtPack by lazy { Rtype.Pack.parse(spData.getValue("readtests").jsonObject) }
    private val spNowMs = 1767603600000L
    private val spProgress by lazy { spv.getValue("speak").jsonObject.getValue("situation").jsonArray[1].jsonObject.getValue("input").jsonObject.getValue("progress").jsonObject }
    private fun spFlow(name: String) = spv.getValue("rtype").jsonObject.getValue("flows").jsonArray.map { it.jsonObject }.first { it.getValue("id").jsonPrimitive.content == name }.getValue("input").jsonObject
    private val spText = "However, I think living in a big city is a good thing. For example, there are many opportunities for young people. In addition, public transport is convenient. As a result, many residents prefer the urban lifestyle because it offers significant benefits and a sustainable future for everyone."

    @Composable private fun speakScreen(name: String, lang: String) {
        val pg = SpeakingRoom.page(spack, "p1/7"); val partNames = listOf("p1", "p2", "p3").map { Tr(spack.parts.getValue(it).name) }; val topics = spack.bank.map { it.title }; val sample = SpeakingRoom.sample(spack, pg, 0)
        val sugg = listOf("congestion" to "sự tắc nghẽn", "commuter" to "người đi làm xa", "pedestrian" to "người đi bộ")
        fun speaking(phase: String, clock: String, tone: String, hint: Tr, live: String, a: SpeakingRoom.Analysis?) = SpeakingUi(pg, partNames, topics, 0, phase, clock, tone, hint, live, a, if (a != null) spText else "", sugg, SpeakingRoom.tips(spack, "p1"), sample, sample?.let { SpeakingRoom.sentences(it) } ?: emptyList(), canNext = pg.questions.size > 1)
        val s = sayData.series[0]; val l10n = Locale.forLanguageTag(lang)
        fun back() = SayLogic.back(s, 0, if (lang == "en" || lang == "de" || lang == "ar" || lang == "vi") lang else "en") { x -> Locale.forLanguageTag(x).getDisplayLanguage(l10n) }
        val pairs = PronPairs(spack); val ls = spack.lesson("iː")!!; val pc = PronCoach(spack)
        val rp = spack.script("cafe")!!
        fun chat(): Roleplay.Chat { val c = Roleplay.Chat(spack, rp, 1, "script"); c.open()
            for (x in listOf("Could I get a medium latte with oat milk, please?", "A medium, please – not too hot, if possible.", "I'll have it here, thanks. Could I also get a croissant?", "Yes, by card, please – can I just tap?", "It's Sam – S, A, M. Thanks very much!")) { val t = c.begin(x)!!; c.answer(Roleplay.scripted(spack, rp, 1, c.i, t, c.retried) { 0.9 }) }
            return c }
        val hfWords = listOf(HfWord("sustainable", "/səˈsteɪnəbl/", "bền vững", "We need a sustainable way to travel.", "", ""), HfWord("resident", "/ˈrezɪdənt/", "cư dân", "Residents voted for the new park.", "", ""))
        when (name) {
            "speakHub" -> SpeakSituationScreen(SitUi(SpeakHub.hub(cafe, spProgress, mapOf("latte" to "/ˈlɑːteɪ/", "please" to ""), spNowMs), "cafe"), SitActions())
            "speakDrill" -> SpeakDrillScreen(drillUi(cafe, SpeakDrill(cafe, null, null, false) { 0.5 }, false), DrillActions())
            "speakDrillPass" -> { val d = SpeakDrill(cafe, null, null, false) { 0.5 }; d.recording(); d.onMic(MicOutcome("could i get a medium latte please", 0.0, null, 2000), spNowMs); SpeakDrillScreen(drillUi(cafe, d, false), DrillActions()) }
            "speakDrillTap" -> { val d = SpeakDrill(cafe, null, null, true) { 0.5 }; d.tap(0, spNowMs); d.tap(1, spNowMs); SpeakDrillScreen(drillUi(cafe, d, false), DrillActions()) }
            "sayList" -> SayListScreen(SayListUi(SayLogic.list(sayData, setOf("say-no/" + s.items[0].id))), SayActions2())
            "sayFront" -> SayCardScreen(SayCardUi(s, 0, false, SayLogic.front(s, 0), back(), SayLogic.shareText(s, s.items[0])), SayActions2())
            "sayBack" -> SayCardScreen(SayCardUi(s, 0, true, SayLogic.front(s, 0), back(), SayLogic.shareText(s, s.items[0]), SayLogic.micText(92, "its not my cup of tea").first, " · “its not my cup of tea”"), SayActions2())
            "speakingHub" -> SpeakingScreen(speaking("idle", "00:00", "", SpeakingRoom.hintRecord(pg), "", null), SpeakingActions())
            "speakingRec" -> SpeakingScreen(speaking("rec", "00:23", "good", SpeakingRoom.hintTarget(pg), "However, I think living in a big city is a good thing. For example, there are many opportunities", null), SpeakingActions())
            "speakingResult" -> SpeakingScreen(speaking("idle", "00:25", "good", Tr("Bấm micro để trả lời lại"), "", SpeakingRoom.analyse(spack, pg, spText, 25.0, content.lexis, listOf("public transport"))), SpeakingActions())
            "pronHub" -> { val done = mapOf("iː" to 90, "ɪ" to 70, "th-sounds" to 60); PronHubScreen(PronHubUi(PronPage.hub(spack, done)), done, PronHubActions()) }
            "pronSound" -> PronSoundScreen(PronSoundUi(ls, null, spack.lesson("ɪ"), PronPage.mouth(ls.mouth), PronPage.chips(ls), mapOf(0 to 90, 1 to 70, 2 to 50), mapOf(0 to 80), null, null, "sheep", null, pairs.forSkill(ls.id).isNotEmpty(), false, QuizUi(), 70), PronSoundActions())
            "pronPairs" -> PronPairsScreen(PairsUi(8, 2, listOf("fill", "feel"), null, 1, null, selected = 1), ls.title, PairsActions())
            "pronSay" -> { val it0 = PairItem("th-s", listOf("think", "sink"), listOf("/θɪŋk/", "/sɪŋk/"), 0)
                PronSayScreen(SaySessionUi("3/10", 0.2f, pairs.labelTr(spack.contrasts.first { it.id == "th-s" }), false, "think", "/θɪŋk/", "sink", false, PairSession.Step("other", Tr("Máy nghe thành “{heard}” – từ còn lại trong cặp.", mapOf("heard" to "sink")), pairs.tipOf(it0), "sink", true, false), null, null), spack.lesson("th-sounds")!!.title, SayActions()) }
            "pronSayBlocked" -> PronSayScreen(SaySessionUi("1/10", 0f, Tr("/θ/ – /s/"), false, "think", "/θɪŋk/", "sink", false, null, MIC_DENIED_NATIVE, null), spack.lesson("th-sounds")!!.title, SayActions())
            "pronRhythm" -> { val s0 = spack.coachSentences[0].s; val at = pc.attempt(s0, "I want go the shop", listOf("I want go the shop")); val rl = spack.lesson("weak-forms")!!
                PronRhythmScreen(RhythmUi(0, spack.coachSentences.map { it.s }, pc.plan(spack.coachSentences[0], "en-GB"), "en-GB", mapOf(0 to 69), "idle", at, pc.next(pairs, emptyMap(), mapOf(0 to 69), rl.id), spack.lessons.associate { it.id to it.title } + spack.contrasts.associate { it.id to pairs.label(it) }, null), rl.title, { b -> pc.bandText(b) }, RhythmActions()) }
            "reflexRun" -> ReflexScreen(ReflexUi("speak", 37, "I like to read the news every morning.", null, null, 0, false, null, null), ReflexActions())
            "reflexResult" -> ReflexScreen(ReflexUi("end", 0, "", Reflex.colorize("She walks to school with her best friend today.", "she walks school"), null, 0, false, Reflex.end(167, 2), null), ReflexActions())
            "reflexEmpty" -> ReflexScreen(ReflexUi("idle", 60, "", null, null, 0, false, null, null, empty = true), ReflexActions())
            "rtypeHub" -> RtypeHubScreen(RtypeHubUi(Rtype.hub(rtPack, Json.parseToJsonElement("""{"rtype":{"completion":{"r":9,"t":12},"tfng":{"r":5,"t":10},"mcq":{"r":3,"t":3}}}""")), false), RtypeActions())
            "rtypeRun" -> { val u = rtPack.of("tfng")[0]; RtypeRunScreen(RtypeRunUi(Rtype.kind("tfng")!!, 0, 1, u, mapOf("1" to "FALSE", "2" to "TRUE"), null, emptyMap(), null, false), RtypeActions()) }
            "rtypeResult" -> { val u = rtPack.of("tfng")[0]; val inp = spFlow("tfng-mixed"); val ans = inp.getValue("answers").jsonObject.entries.associate { (k, x) -> k to (x.jsonPrimitive.content as Any?) }
                val ck = Rtype.check(u, ans, null, emptyList(), rtPack.explain, spNowMs)
                RtypeRunScreen(RtypeRunUi(Rtype.kind("tfng")!!, 0, 1, u, ans, ck, ck.res.keys.mapNotNull { n -> Rtype.explanation(rtPack, u, n)?.get("why")?.jsonPrimitive?.content?.let { w -> n to w } }.toMap(), null, false), RtypeActions()) }
            "rpList" -> RoleplayListScreen(RpListUi(spack, Roleplay.hub(spack, 1), Roleplay.footnote(spack, false)), RpActions())
            "rpBrief" -> RoleplayBriefScreen(RpBriefUi(spack, rp, 1, setOf(1), Tr("Đã lưu vào flashcard")), RpActions())
            "rpChat" -> { val c = Roleplay.Chat(spack, rp, 1, "script"); c.open(); val t = c.begin("Could I get a medium latte with oat milk, please?")!!; c.answer(Roleplay.scripted(spack, rp, 1, c.i, t, c.retried) { 0.9 })
                RoleplayChatScreen(RpChatUi(rp, 1, c.hist.toList(), "script", c.turnLabel, false, "", c.hint(), null, false, null, true, false), RpActions()) { go -> go() } }
            "rpResult" -> { val c = chat(); val r = Roleplay.report(spack, rp, 1, c.hist.toList(), 0, null); RoleplayResultScreen(RpResultUi(rp, 1, r, setOf(0), Roleplay.confidence(spack, rp)), RpActions()) }
            else -> HandsFreeScreen(HfUi(Tr("Từ đến hạn ôn"), hfWords, 0, true, HandsFree.Opt()), HfActions())
        }
    }

    private fun speakShot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) { androidx.compose.runtime.CompositionLocalProvider(LocalSpeakSlots provides SpeakSlots(teacher = { who, pose, mod -> Box(mod) { com.lexkite.app.ui.TeacherStill(who, pose) } })) { speakScreen(name, lang) } } } }
        // the long pages are captured where their state lives: the analysis, the checked group, the sharper sentences
        when (name) { "speakingResult" -> rule.onNodeWithTag("speak-result").performScrollTo(); "rtypeResult" -> rule.onNodeWithTag("speak-rtype-result").performScrollTo(); "rpResult" -> rule.onNodeWithTag("speak-rp-rewrites").performScrollTo() }
        rule.waitForIdle()
        rule.onRoot().captureRoboImage("src/test/snapshots/speak-$name-$lang-${if (dark) "dark" else "light"}.png")
    }
    @Test fun speakSpeakHubEnLight() = speakShot("speakHub", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSpeakHubViLight() = speakShot("speakHub", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSpeakHubArLight() = speakShot("speakHub", "ar", false)
    @Test fun speakSpeakHubDeDark() = speakShot("speakHub", "de", true)
    @Test fun speakSpeakDrillEnLight() = speakShot("speakDrill", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSpeakDrillViLight() = speakShot("speakDrill", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSpeakDrillArLight() = speakShot("speakDrill", "ar", false)
    @Test fun speakSpeakDrillDeDark() = speakShot("speakDrill", "de", true)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSpeakDrillPassEnLight() = speakShot("speakDrillPass", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSpeakDrillTapEnLight() = speakShot("speakDrillTap", "en", false)
    @Test fun speakSayListEnLight() = speakShot("sayList", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSayListViLight() = speakShot("sayList", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSayListArLight() = speakShot("sayList", "ar", false)
    @Test fun speakSayListDeDark() = speakShot("sayList", "de", true)
    @Test fun speakSayFrontEnLight() = speakShot("sayFront", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSayFrontViLight() = speakShot("sayFront", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSayFrontArLight() = speakShot("sayFront", "ar", false)
    @Test fun speakSayFrontDeDark() = speakShot("sayFront", "de", true)
    @Test fun speakSayBackEnLight() = speakShot("sayBack", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSayBackViLight() = speakShot("sayBack", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSayBackArLight() = speakShot("sayBack", "ar", false)
    @Test fun speakSayBackDeDark() = speakShot("sayBack", "de", true)
    @Test fun speakSpeakingHubEnLight() = speakShot("speakingHub", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSpeakingHubViLight() = speakShot("speakingHub", "vi", false)
    @Test fun speakSpeakingHubArLight() = speakShot("speakingHub", "ar", false)
    @Test fun speakSpeakingHubDeDark() = speakShot("speakingHub", "de", true)
    @Test fun speakSpeakingRecEnLight() = speakShot("speakingRec", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSpeakingRecViLight() = speakShot("speakingRec", "vi", false)
    @Test fun speakSpeakingRecArLight() = speakShot("speakingRec", "ar", false)
    @Test fun speakSpeakingRecDeDark() = speakShot("speakingRec", "de", true)
    @Test fun speakSpeakingResultEnLight() = speakShot("speakingResult", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakSpeakingResultViLight() = speakShot("speakingResult", "vi", false)
    @Test fun speakSpeakingResultArLight() = speakShot("speakingResult", "ar", false)
    @Test fun speakSpeakingResultDeDark() = speakShot("speakingResult", "de", true)
    @Test fun speakPronHubEnLight() = speakShot("pronHub", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakPronHubViLight() = speakShot("pronHub", "vi", false)
    @Test fun speakPronHubArLight() = speakShot("pronHub", "ar", false)
    @Test fun speakPronHubDeDark() = speakShot("pronHub", "de", true)
    @Test fun speakPronSoundEnLight() = speakShot("pronSound", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakPronSoundViLight() = speakShot("pronSound", "vi", false)
    @Test fun speakPronSoundArLight() = speakShot("pronSound", "ar", false)
    @Test fun speakPronSoundDeDark() = speakShot("pronSound", "de", true)
    @Test fun speakPronPairsEnLight() = speakShot("pronPairs", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakPronPairsViLight() = speakShot("pronPairs", "vi", false)
    @Test fun speakPronPairsArLight() = speakShot("pronPairs", "ar", false)
    @Test fun speakPronPairsDeDark() = speakShot("pronPairs", "de", true)
    @Test fun speakPronSayEnLight() = speakShot("pronSay", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakPronSayViLight() = speakShot("pronSay", "vi", false)
    @Test fun speakPronSayArLight() = speakShot("pronSay", "ar", false)
    @Test fun speakPronSayDeDark() = speakShot("pronSay", "de", true)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakPronSayBlockedEnLight() = speakShot("pronSayBlocked", "en", false)
    @Test fun speakPronRhythmEnLight() = speakShot("pronRhythm", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakPronRhythmViLight() = speakShot("pronRhythm", "vi", false)
    @Test fun speakPronRhythmArLight() = speakShot("pronRhythm", "ar", false)
    @Test fun speakPronRhythmDeDark() = speakShot("pronRhythm", "de", true)
    @Test fun speakReflexRunEnLight() = speakShot("reflexRun", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakReflexRunViLight() = speakShot("reflexRun", "vi", false)
    @Test fun speakReflexRunArLight() = speakShot("reflexRun", "ar", false)
    @Test fun speakReflexRunDeDark() = speakShot("reflexRun", "de", true)
    @Test fun speakReflexResultEnLight() = speakShot("reflexResult", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakReflexResultViLight() = speakShot("reflexResult", "vi", false)
    @Test fun speakReflexResultArLight() = speakShot("reflexResult", "ar", false)
    @Test fun speakReflexResultDeDark() = speakShot("reflexResult", "de", true)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakReflexEmptyEnLight() = speakShot("reflexEmpty", "en", false)
    @Test fun speakRtypeHubEnLight() = speakShot("rtypeHub", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakRtypeHubViLight() = speakShot("rtypeHub", "vi", false)
    @Test fun speakRtypeHubArLight() = speakShot("rtypeHub", "ar", false)
    @Test fun speakRtypeHubDeDark() = speakShot("rtypeHub", "de", true)
    @Test fun speakRtypeRunEnLight() = speakShot("rtypeRun", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakRtypeRunViLight() = speakShot("rtypeRun", "vi", false)
    @Test fun speakRtypeRunArLight() = speakShot("rtypeRun", "ar", false)
    @Test fun speakRtypeRunDeDark() = speakShot("rtypeRun", "de", true)
    @Test fun speakRtypeResultEnLight() = speakShot("rtypeResult", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakRtypeResultViLight() = speakShot("rtypeResult", "vi", false)
    @Test fun speakRtypeResultArLight() = speakShot("rtypeResult", "ar", false)
    @Test fun speakRtypeResultDeDark() = speakShot("rtypeResult", "de", true)
    @Test fun speakRpListEnLight() = speakShot("rpList", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakRpListViLight() = speakShot("rpList", "vi", false)
    @Test fun speakRpListArLight() = speakShot("rpList", "ar", false)
    @Test fun speakRpListDeDark() = speakShot("rpList", "de", true)
    @Test fun speakRpBriefEnLight() = speakShot("rpBrief", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakRpBriefViLight() = speakShot("rpBrief", "vi", false)
    @Test fun speakRpBriefArLight() = speakShot("rpBrief", "ar", false)
    @Test fun speakRpBriefDeDark() = speakShot("rpBrief", "de", true)
    @Test fun speakRpChatEnLight() = speakShot("rpChat", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakRpChatViLight() = speakShot("rpChat", "vi", false)
    @Test fun speakRpChatArLight() = speakShot("rpChat", "ar", false)
    @Test fun speakRpChatDeDark() = speakShot("rpChat", "de", true)
    @Test fun speakRpResultEnLight() = speakShot("rpResult", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakRpResultViLight() = speakShot("rpResult", "vi", false)
    @Test fun speakRpResultArLight() = speakShot("rpResult", "ar", false)
    @Test fun speakRpResultDeDark() = speakShot("rpResult", "de", true)
    @Test fun speakHfRunEnLight() = speakShot("hfRun", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun speakHfRunViLight() = speakShot("hfRun", "vi", false)
    @Test fun speakHfRunArLight() = speakShot("hfRun", "ar", false)
    @Test fun speakHfRunDeDark() = speakShot("hfRun", "de", true)
}
