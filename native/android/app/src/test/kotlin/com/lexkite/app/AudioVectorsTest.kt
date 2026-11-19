package com.lexkite.app

import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.core.audio.Fetcher
import com.lexkite.app.core.audio.LkAudio
import com.lexkite.app.core.audio.PlayBackend
import com.lexkite.app.core.audio.PlayCallback
import com.lexkite.app.core.audio.PlayHandle
import com.lexkite.app.core.audio.Segment
import com.lexkite.app.core.audio.SpeakListener
import com.lexkite.app.core.audio.TtsBackend
import com.lexkite.app.core.audio.TtsCallback
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.nio.file.Files

/** C04 parity: URL/origin order, file keys, sentence split, ttsClean, system-voice choice = web audio.js / ui.js / kvoice.js (vectors/audio.json); plus the player chain with injected transports (no network, no audio device). */
class AudioVectorsTest {
    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("audio.json")!!.readText()).jsonObject
    private fun JsonObject.a(k: String) = getValue(k).jsonArray
    private fun JsonElement.s() = jsonPrimitive.content
    private fun JsonElement.sOrNull() = if (this is JsonNull) null else jsonPrimitive.content
    private fun JsonObject.s(k: String) = getValue(k).s()
    private val voices = v.a("sampleVoices").map { it.jsonObject.let { o -> AudioLogic.SysVoice(o.s("name"), o.s("lang"), o.getValue("localService").jsonPrimitive.booleanOrNull) } }

    @Test fun originsAndKeysMatchWeb() {
        assertEquals(v.a("bases").map { it.s() }, AudioLogic.BASES); assertEquals(v.s("wordSuffix"), AudioLogic.WORD_SUFFIX)
        for (c in v.a("urls").map { it.jsonObject }) assertEquals("urls ${c}", c.a("urls").map { it.s() }, AudioLogic.urls(c.s("key"), c.s("kind"), c.getValue("fails").jsonPrimitive.long.toInt(), c.a("s2").map { it.s() }.toSet()))
        for (c in v.a("fnv36").map { it.jsonObject }) assertEquals(c.s("in"), c.s("out"), AudioLogic.fnv36(c.s("in")))
        val vo = v.getValue("voices").jsonObject; assertEquals(vo.s("ama"), AudioLogic.voiceOf("ama")); assertEquals(vo.s("carlos"), AudioLogic.voiceOf("carlos"))
        for (c in v.a("sentence").map { it.jsonObject }) {
            val key = AudioLogic.lineKey(c.s("voice"), c.s("text"))
            assertEquals(c.s("key"), key); assertEquals(c.a("urls").map { it.s() }, AudioLogic.urls(key)); assertEquals(c.a("cueUrls").map { it.s() }, AudioLogic.urls("$key-ls"))
        }
        for (c in v.a("word").map { it.jsonObject }) {
            val voice = AudioLogic.wordVoice(c.s("accent")); assertEquals(c.s("voice"), voice)
            val key = AudioLogic.wordKey(voice, c.s("word")); assertEquals(c.s("key"), key); assertEquals(c.a("urls").map { it.s() }, AudioLogic.urls(key, "w"))
        }
    }

    @Test fun splitAndCleanMatchWeb() {
        for (c in v.a("split").map { it.jsonObject }) assertEquals(c.s("text"), c.a("out").map { it.s() }, AudioLogic.split(c.s("text")))
        for (c in v.a("ttsClean").map { it.jsonObject }) assertEquals(c.s("in"), c.s("out"), AudioLogic.ttsClean(c.s("in")))
    }

    @Test fun voiceChoiceMatchesWeb() {
        for (c in v.a("genderOf").map { it.jsonObject }) assertEquals(c.s("name"), c.s("out"), AudioLogic.genderOf(c.s("name")))
        for (c in v.a("kokoro").map { it.jsonObject }) {
            val got = AudioLogic.kokoro(c.getValue("id").sOrNull()); val exp = c.getValue("out")
            if (exp is JsonNull) assertNull(got) else { assertEquals(exp.jsonObject.s("accent"), got!!.accent); assertEquals(exp.jsonObject.s("gender"), got.gender) }
        }
        for (c in v.a("genderFor").map { it.jsonObject }) assertEquals("genderFor ${c.getValue("who")}", c.s("out"), AudioLogic.genderFor(c.getValue("who").sOrNull()))
        for (c in v.a("rank").map { it.jsonObject }) assertEquals("rank $c", c.a("out").map { it.s() }, AudioLogic.rank(voices, c.s("accent"), c.s("gender")).map { it.name })
        for (c in v.a("pick").map { it.jsonObject }) assertEquals("pick $c", c.getValue("out").sOrNull(), AudioLogic.pickVoice(voices, c.s("accent"), c.s("gender"), c.s("want"))?.name)
        for (c in v.a("score").map { it.jsonObject }) assertEquals("score $c", c.getValue("out").jsonPrimitive.long.toInt(), AudioLogic.voiceScore(voices.first { it.name == c.s("name") }, c.s("accent"), c.s("gender")))
    }

    // ---------- the chain with fakes ----------
    private class Net(val answers: (String) -> Fetcher.Result) : Fetcher { val asked = ArrayList<String>(); override suspend fun get(url: String): Fetcher.Result { asked.add(url); return answers(url) } }
    private class FakePlayer : PlayBackend {
        val played = ArrayList<Pair<File, Float>>(); var fail = false
        override fun play(file: File, rate: Float, cb: PlayCallback): PlayHandle { played.add(file to rate); if (fail) cb.onError() else { cb.onStart(1.5); cb.onEnd() }; return object : PlayHandle { override fun stop() {}; override fun positionSec() = 0.0 } }
    }
    private class FakeTts : TtsBackend {
        val spoken = ArrayList<Triple<String, String, String>>()
        override fun speak(text: String, accent: String, gender: String, rate: Float, cb: TtsCallback): PlayHandle { spoken.add(Triple(text, accent, gender)); cb.onStart(); cb.onEnd(); return object : PlayHandle { override fun stop() {}; override fun positionSec() = 0.0 } }
        override fun stop() {}
    }
    private val ok = Fetcher.Result(200, ByteArray(8) { 1 })
    private fun tmp() = Files.createTempDirectory("lkaudio").toFile()
    /** Everything runs inline (Unconfined) so the chain is deterministic; only the 280 ms gap between sentences really waits. */
    private fun mk(net: Fetcher, dir: File?, p: PlayBackend, t: TtsBackend) = LkAudio(CoroutineScope(Dispatchers.Unconfined + SupervisorJob()), net, dir, p, t, io = Dispatchers.Unconfined)
    private fun await(what: String, cond: () -> Boolean) { val end = System.currentTimeMillis() + 3000; while (!cond() && System.currentTimeMillis() < end) Thread.sleep(10); assertTrue(what, cond()) }

    @Test fun parity_C04() {
        val bases = AudioLogic.BASES
        // origin 1 down (503) → origin 2 serves; the failure is counted and the file is cached for offline replay
        val net = Net { u -> if (u.startsWith(bases[0])) Fetcher.Result(503, null) else ok }
        val dir = tmp(); val audio = mk(net, dir, FakePlayer(), FakeTts())
        val f = runBlocking { audio.resolve("k1") }
        assertNotNull(f); assertEquals(listOf(bases[0] + "k1.mp3", bases[1] + "k1.mp3"), net.asked); assertEquals(1, audio.fails)
        assertNotNull(runBlocking { audio.resolve("k1") }); assertEquals("cache hit makes no request", 2, net.asked.size)
        // two failures move the first choice to the next origin (web: baseAt = fails >> 1)
        runBlocking { audio.resolve("k2") }; assertEquals(2, audio.fails); assertEquals(bases[1] + "k3.mp3", audio.urls("k3").first())
        // all origins answer 404 (no such file): no penalty for the origins, no repeat request → system voice
        val none = Net { Fetcher.Result(404, null) }; val a2 = mk(none, tmp(), FakePlayer(), FakeTts())
        assertNull(runBlocking { a2.resolve("zz") }); val n = none.asked.size; assertNull(runBlocking { a2.resolve("zz") }); assertEquals(n, none.asked.size); assertEquals(0, a2.fails)

        // sentences: CDN files play in order at the web rate (0.95 → 1.0x) and the teacher gets the file duration
        val p = FakePlayer(); val tts = FakeTts(); val segs = java.util.concurrent.CopyOnWriteArrayList<Segment>(); val ended = java.util.concurrent.atomic.AtomicBoolean(false)
        val a3 = mk(Net { ok }, tmp(), p, tts)
        a3.speak("One. Two!", "ama", 0.95f, object : SpeakListener { override fun onSegment(seg: Segment) { segs.add(seg) }; override fun onEnd() { ended.set(true) } })
        await("both sentences played") { ended.get() }
        assertEquals(listOf("One.", "Two!"), segs.map { it.text }); assertTrue(segs.all { it.source == Segment.Source.CDN && it.durSec == 1.5 }); assertEquals(2, p.played.size); assertEquals(1f, p.played[0].second, 1e-6f)
        assertTrue("CDN worked: no system voice", tts.spoken.isEmpty())

        // nothing on the CDN → the system voice with the gender of the character (Carlos male, Ama female)
        for ((who, g) in listOf("carlos" to "m", "ama" to "f")) {
            val t2 = FakeTts(); var started: Segment? = null
            mk(Net { Fetcher.Result(0, null) }, tmp(), FakePlayer(), t2)
                .speak("Hello there", who, 0.95f, object : SpeakListener { override fun onSegment(seg: Segment) { started = seg } })
            assertEquals(listOf(Triple("Hello there", "en-US", g)), t2.spoken); assertEquals(Segment.Source.TTS, started!!.source)
        }
        // a corrupt cached file (player error) falls back to the system voice instead of staying silent
        val bad = FakePlayer().also { it.fail = true }; val t3 = FakeTts()
        mk(Net { ok }, tmp(), bad, t3).speak("Good morning", "carlos")
        assertEquals(1, t3.spoken.size)
        // single words use the Whisper-checked word files
        val net4 = Net { ok }; mk(net4, tmp(), FakePlayer(), FakeTts()).speakWord("consider", "en-GB")
        assertEquals(AudioLogic.urls(AudioLogic.wordKey("bf_emma", "consider"), "w").first(), net4.asked.first())
    }
}
