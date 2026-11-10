package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performScrollTo
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.call.Call
import com.lexkite.app.core.call.CallAskEnv
import com.lexkite.app.core.call.CallCallbacks
import com.lexkite.app.core.call.CallIO
import com.lexkite.app.core.call.CallListenOpts
import com.lexkite.app.core.call.CallPack
import com.lexkite.app.core.call.CallRec
import com.lexkite.app.core.call.CallResult
import com.lexkite.app.core.call.CallSession
import com.lexkite.app.core.call.LogEntry
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.speak.CallListScreen
import com.lexkite.app.feature.speak.CallListUi
import com.lexkite.app.feature.speak.CallActions
import com.lexkite.app.feature.speak.CallRingScreen
import com.lexkite.app.feature.speak.CallRingUi
import com.lexkite.app.feature.speak.CallRoomScreen
import com.lexkite.app.feature.speak.CallRoomUi
import com.lexkite.app.feature.speak.CallSummaryScreen
import com.lexkite.app.feature.speak.CallSummaryUi
import com.lexkite.app.feature.speak.LocalSpeakSlots
import com.lexkite.app.feature.speak.SpeakSlots
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * P08 snapshot gate at 390 dp: the four screens of #/call (list, ring, in-call talk state, in-call long turn, summary at the top and scrolled to the transcript) in en-light, vi-light, ar-light (RTL),
 * de-dark (src/test/snapshots/call-*). Every state is the real thing: a [CallSession] driven over the real calls of vectors/call.json `data` with a fake platform (no clock, no network, no microphone).
 * vi-light and ar-light use mdpi so the whole PR's images stay small. CI records the references on the first run (recordRoborazziDebug), then verifies.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class CallSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("call.json")!!.readText()).jsonObject
    private val now = v.getValue("now").jsonPrimitive.long
    /** The pack of the vector data: the 6 real calls + the engine constants of the starter pack. */
    private val pack: CallPack by lazy { val st = Json.parseToJsonElement(javaClass.classLoader!!.getResource("call-starter.json")!!.readText()).jsonObject
        CallPack(JsonObject(st + ("calls" to JsonArray(v.getValue("data").jsonObject.getValue("calls").let { (it as JsonArray).toList() })))) }
    private val e get() = pack.engine

    /** A platform that records nothing: speech ends at once when [autoSay], else the teacher stays "talking". */
    private inner class Fake(val autoSay: Boolean) : CallIO {
        var clock = now; val recs = ArrayList<CallCallbacks>()
        override fun now() = clock
        override fun mode() = "local"
        override fun pref(k: String): String? = null
        override fun setPref(k: String, v: String) {}
        override fun say(text: String, onEnd: () -> Unit) { if (autoSay) onEnd() }
        override fun stopSay() {}
        override fun recognize(o: CallListenOpts, cb: CallCallbacks): CallRec? { recs.add(cb); return object : CallRec { override fun stop() {}; override fun cancel() {} } }
        override fun after(ms: Long, f: () -> Unit) { f() }
        override fun react(pose: String, ms: Int) {}
        override fun listenPose(on: Boolean) {}
        override fun toast(t: Tr, ms: Int) {}
        override fun toastErr(code: String, ms: Int) {}
        override fun finished(r: CallResult) {}
        override fun hangup() {}
        override fun changed() {}
    }
    private fun session(id: String, io: Fake, lang: String): CallSession = CallSession(e, pack.call(id)!!, io, CallAskEnv(sr = true), lang == "en")

    /** The teacher is speaking the first line (suggestions and cue shown), the mic idle. */
    private fun talk(lang: String): CallRoomUi { val io = Fake(false); val s = session("ielts-p1-home", io, lang); s.begin(); return CallRoomUi(pack, s.call, s.view(), "local", "", null, null, 41) }
    /** Part 2: the preparation is over, the learner is in the long turn: the clock runs, the first chunk is heard and counted. */
    private fun long(lang: String): CallRoomUi { val io = Fake(true); val s = session("ielts-p2-place", io, lang); s.begin(); s.tapOption(0) // "I'm ready." ends the preparation
        s.mic(); io.clock += 20_000; val cb = io.recs.last(); cb.start(); cb.result("I’d like to talk about Hoi An, an old town that is located in central Vietnam. It takes about forty minutes to get there from Da Nang by bus.", 90)
        io.clock += 500; s.tick(); return CallRoomUi(pack, s.call, s.view(), "local", "", null, null, 104) }
    /** The answers of the vector flow `voice-fix-slip-retry` up to its first summary (bakery: 3 by voice with a sound-pair slip and a grammar slip, one typed, one tapped) – read FROM the vector, never retyped, so the clock (secs) cannot drift from the web truth. */
    private fun vectorSteps() = v.getValue("flow").jsonArray.map { it.jsonObject }.first { it.getValue("id").jsonPrimitive.content == "voice-fix-slip-retry" }.getValue("out").jsonObject.getValue("steps").jsonArray.map { it.jsonObject }
    private fun vectorSummary() = vectorSteps().first { "summary" in it }.getValue("summary").jsonObject
    private fun vectorLog(): List<LogEntry> = vectorSteps().let { st -> st.take(st.indexOfFirst { "summary" in it } + 1) }.flatMap { it["log"]?.jsonArray ?: JsonArray(emptyList()) }.map { it.jsonObject }.map { e ->
        LogEntry(e.getValue("id").jsonPrimitive.content, e.getValue("text").jsonPrimitive.content, e["picked"]?.jsonPrimitive?.content == "true", e["secs"]?.jsonPrimitive?.content?.toDouble(), e["asr"]?.jsonPrimitive?.content?.toIntOrNull(), e["typed"]?.jsonPrimitive?.content == "true") }
    private fun summary(): CallSummaryUi { val call = pack.call("bakery")!!
        val log = vectorLog()
        val rc = e.recap(call, log); val voiced = log.count { !it.picked && !it.typed }
        return CallSummaryUi(pack, CallResult(call, rc, voiced, e.reward(rc.turns.size, voiced, rc.used.size), 41, log), null) }

    /** Parity guard: the fixture the snapshots show says what the web says (score, "about N words per minute", words) – the 48 vs 45 drift of the first CI run cannot come back. */
    @Test fun summaryFixtureIsTheVectorFlow() {
        val web = vectorSummary(); val rc = summary().result.recap
        assertEquals(web.getValue("score").jsonPrimitive.content.toInt(), rc.score)
        assertEquals(web.getValue("words").jsonObject.getValue("v").jsonObject.getValue("n").jsonPrimitive.content.toInt(), rc.words)
        val slow = web.getValue("notes").jsonArray.map { it.jsonObject }.firstOrNull { it["v"]?.jsonObject?.containsKey("wpm") == true }?.getValue("v")?.jsonObject?.getValue("wpm")?.jsonPrimitive?.content?.toInt()
        assertEquals(slow, rc.notes.firstOrNull { it.id == "slow" }?.wpm)
        assertEquals(45, rc.wpm)
    }

    @Composable private fun screen(name: String, lang: String) {
        val a = CallActions()
        when (name) {
            "list" -> CallListScreen(CallListUi(pack, "all", "local", true, null), a)
            "ring" -> CallRingScreen(CallRingUi(pack, pack.call("ielts-p1-home")!!, "local"), a)
            "incall" -> CallRoomScreen(talk(lang), a) { go -> go() }
            "incallLong" -> CallRoomScreen(long(lang), a) { go -> go() }
            else -> CallSummaryScreen(summary(), a) // summary · summaryTranscript
        }
    }

    private fun shot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) {
            CompositionLocalProvider(LocalSpeakSlots provides SpeakSlots(teacher = { who, pose, mod -> Box(mod) { com.lexkite.app.ui.TeacherStill(who, pose) } })) { screen(name, lang) } } } }
        if (name == "summaryTranscript") rule.onNodeWithTag("call-transcript").performScrollTo() // the long page is captured where the transcript with its fixes lives
        rule.waitForIdle()
        rule.onRoot().captureRoboImage("src/test/snapshots/call-$name-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun callListEnLight() = shot("list", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callListViLight() = shot("list", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callListArLight() = shot("list", "ar", false)
    @Test fun callListDeDark() = shot("list", "de", true)
    @Test fun callRingEnLight() = shot("ring", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callRingViLight() = shot("ring", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callRingArLight() = shot("ring", "ar", false)
    @Test fun callRingDeDark() = shot("ring", "de", true)
    @Test fun callIncallEnLight() = shot("incall", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callIncallViLight() = shot("incall", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callIncallArLight() = shot("incall", "ar", false)
    @Test fun callIncallDeDark() = shot("incall", "de", true)
    @Test fun callIncallLongEnLight() = shot("incallLong", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callIncallLongViLight() = shot("incallLong", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callIncallLongArLight() = shot("incallLong", "ar", false)
    @Test fun callIncallLongDeDark() = shot("incallLong", "de", true)
    @Test fun callSummaryEnLight() = shot("summary", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callSummaryViLight() = shot("summary", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callSummaryArLight() = shot("summary", "ar", false)
    @Test fun callSummaryDeDark() = shot("summary", "de", true)
    @Test fun callSummaryTranscriptEnLight() = shot("summaryTranscript", "en", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callSummaryTranscriptViLight() = shot("summaryTranscript", "vi", false)
    @Config(qualifiers = "w390dp-h844dp-mdpi") @Test fun callSummaryTranscriptArLight() = shot("summaryTranscript", "ar", false)
    @Test fun callSummaryTranscriptDeDark() = shot("summaryTranscript", "de", true)
}
