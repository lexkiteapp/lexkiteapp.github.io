package com.lexkite.app.core.skills

import com.lexkite.app.core.audio.AudioLogic
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch

/** One sentence to speak with a device voice (cast per speaker). */
class Utter(val text: String, val voice: String?, val lang: String, val pitch: Double, val rate: Double)

/** Outcome of trying a line's Kokoro clip. MISSING = no file anywhere (quiet fallback to the device voice, not counted as a failure). */
enum class Clip { PLAYED, MISSING, FAILED, FAILED_AFTER_START, BLOCKED }

/** The platform side of the player: clips (LkAudio), device speech (TextToSpeech / AVSpeech) and timers. Every call that takes time suspends until it is finished or cancelled. */
interface PlayerIO {
    /** Can anything be played at all (device speech or clips)? false -> the "not supported" toast. */
    val canPlay: Boolean
    /** Is device speech available (else a line is skipped after 300 ms, like the web). */
    val canSpeak: Boolean
    /** Plays one clip; [onPlaying] fires when sound really starts. */
    suspend fun playClip(key: String, rate: Double, onPlaying: () -> Unit): Clip
    /** Warms the cache of a clip that comes next. */
    fun preload(key: String)
    /** Queues one sentence (nothing is awaited yet). */
    fun queue(u: Utter)
    /** Suspends until everything queued has been spoken; [onStart] fires when the first sentence starts. */
    suspend fun awaitSpeech(onStart: () -> Unit)
    suspend fun delay(ms: Long)
    /** Stops clip + speech immediately. */
    fun stopAll()
    fun toast(key: String)
}

/** What the page shows while the player runs (all optional). */
class PlayerEvents(
    val onLine: (Int) -> Unit = {}, val onState: (Boolean) -> Unit = {}, val onEnd: () -> Unit = {}, val onSound: () -> Unit = {}, val onBlocked: (() -> Unit)? = null,
)

/**
 * The listening Player (web listening.js `Player`): the part's script as a queue of lines, played one after another with Kokoro clips (key = line) and the
 * device-voice cast as fallback. Order of events, waits (pause min(8,s)·1000 ms; 280 ms after speech, 600 ms after narrator), clip rate clamp(0.6, 1.3, rate/0.95)
 * (narrator 1), speech rate / pitch per speaker, the 3-failure give-up of clips and the "tap to listen" block are the contract (vectors/skills.json listen.player).
 */
class ListenPlayer(
    private val p: Part, private val cast: Map<String, CastVoice>, private val io: PlayerIO, private val scope: CoroutineScope, private val ev: PlayerEvents,
    private val rate: () -> Double = { ListenPage.DEFAULT_RATE }, private val skipNarrator: Boolean = false, private val hqVoice: () -> Boolean = { true },
    /** audioFail(): a clip failed before it started (the app moves on to the next CDN). */
    private val onClipFailed: () -> Unit = {},
) {
    private val kv = KVoice.voices(p)
    private var pos = 0; private var playing = false; private var seq = 0; private var job: Job? = null
    private var heard = false; private var audioDown = 0
    val position get() = pos
    val isPlaying get() = playing
    fun speakerOf(l: Line) = if (l.say != null) cast["_narrator"] else cast[l.s] ?: cast["_narrator"]

    private fun hqOn() = hqVoice() && audioDown < MAX_FAILS
    private fun key(l: Line): String? = if (hqOn()) KVoice.lineKey(kv, l) else null
    private fun sound() { if (!heard) { heard = true; ev.onSound() } }
    private fun stopNow() { seq++; job?.cancel(); job = null; io.stopAll() }

    fun play(from: Int? = null) {
        if (!io.canPlay) { io.toast(NO_SUPPORT); return }
        stopNow()
        if (from != null) pos = maxOf(0, p.script.indexOfFirst { it.i == from })
        playing = true; ev.onState(true); start()
    }
    fun pause() { stopNow(); playing = false; ev.onState(false) }
    fun stop() { stopNow(); playing = false; pos = 0; ev.onState(false) }
    /** Back to the previous SPOKEN line (skips pauses and narrator lines going backwards, never below 0). */
    fun back() {
        val was = playing; stopNow()
        var k = pos - 1; while (k > 0 && (p.script[k].pause != null || p.script[k].say != null)) k--
        pos = maxOf(0, k)
        if (was) { playing = true; start() } else ev.onLine(p.script[pos].i)
    }

    private fun start() { val my = seq; job = scope.launch { loop(my) } }

    private suspend fun loop(my: Int) {
        while (true) {
            if (my != seq) return
            if (pos >= p.script.size) { playing = false; ev.onLine(-1); ev.onEnd(); return }
            val l = p.script[pos]; ev.onLine(l.i)
            if (l.pause != null) io.delay((minOf(8.0, l.pause) * 1000).toLong())
            else if (l.say != null && skipNarrator) { /* skipped without a wait */ }
            else if (!playLine(my, l)) return
            if (my != seq) return
            pos++
        }
    }

    /** One line: its clip when there is one, else the cast voice. false = stopped here (blocked). */
    private suspend fun playLine(my: Int, l: Line): Boolean {
        val k = key(l)
        if (k != null) {
            val r = io.playClip(k, if (l.say != null) 1.0 else (rate() / 0.95).coerceIn(0.6, 1.3)) { audioDown = 0; sound() }.also { if (it != Clip.MISSING) preloadNext() }
            if (my != seq) return true
            when (r) {
                Clip.PLAYED -> { io.delay(if (l.say != null) NARRATOR_GAP else SPEECH_GAP); return true }
                Clip.BLOCKED -> { blocked(); return false }
                Clip.FAILED -> { audioDown++; onClipFailed() }
                Clip.FAILED_AFTER_START, Clip.MISSING -> {}
            }
            if (my != seq) return true
        }
        speak(l); return true
    }
    private fun preloadNext() { val nx = p.script.drop(pos + 1).firstOrNull { it.t != null || it.say != null } ?: return; key(nx)?.let { io.preload(it) } }

    private suspend fun speak(l: Line) {
        if (!io.canSpeak) { io.delay(NO_SPEECH_WAIT); return }
        val c = speakerOf(l) ?: CastVoice(null, "en-GB", 1.0)
        for (t in AudioLogic.split(l.say ?: l.t ?: "")) io.queue(Utter(t, c.voice, c.lang, c.pitch, if (l.say != null) 0.95 else rate()))
        io.awaitSpeech { sound() }
        io.delay(if (l.say != null) NARRATOR_GAP else SPEECH_GAP)
    }

    private fun blocked() { playing = false; ev.onState(false); ev.onBlocked?.invoke() ?: io.toast(TAP_TO_LISTEN) }

    companion object {
        const val MAX_FAILS = 3; const val SPEECH_GAP = 280L; const val NARRATOR_GAP = 600L; const val NO_SPEECH_WAIT = 300L
        /** Toast keys (the web's Vietnamese source strings). */
        const val NO_SUPPORT = "Trình duyệt không hỗ trợ đọc giọng nói – hãy dùng Chrome/Edge/Safari"; const val TAP_TO_LISTEN = "Chạm ▶ để nghe"
    }
}
