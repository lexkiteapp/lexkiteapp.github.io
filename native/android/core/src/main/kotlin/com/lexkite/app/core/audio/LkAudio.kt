package com.lexkite.app.core.audio

import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.sync.UrlHttp
import kotlinx.coroutines.CancellableContinuation
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import java.io.File
import kotlin.coroutines.resume

/** One CDN request (injected so tests never touch the network). status 0 = transport error / timeout. */
fun interface Fetcher { suspend fun get(url: String): Result
    class Result(val status: Int, val body: ByteArray?) { val ok get() = status in 200..299 && body != null && body.isNotEmpty() } }

/** Production fetcher: [Http] with the web's 7 s limit. */
class HttpFetcher(private val http: Http = UrlHttp) : Fetcher {
    override suspend fun get(url: String): Fetcher.Result = try {
        withTimeoutOrNull(AudioLogic.TIMEOUT_MS) { http.send(Http.Req("GET", url)).let { Fetcher.Result(it.status, it.body) } } ?: Fetcher.Result(0, null)
    } catch (e: Exception) { Fetcher.Result(0, null) }
}

/** Plays a cached file. Callbacks may arrive on any thread. */
interface PlayBackend { fun play(file: File, rate: Float, cb: PlayCallback): PlayHandle }
interface PlayCallback { fun onStart(durSec: Double); fun onEnd(); fun onError() }
interface PlayHandle { fun stop(); /** seconds since the start of the file (interpolated between player samples) */ fun positionSec(): Double }

/** Last-resort system speech. */
interface TtsBackend { fun speak(text: String, accent: String, gender: String, rate: Float, cb: TtsCallback): PlayHandle; fun stop() }
interface TtsCallback { fun onStart(); fun onEnd(); fun onError() }

/** The audible piece the lip sync follows: one sentence (CDN file) or one TTS utterance. */
class Segment(val index: Int, val text: String, val source: Source) {
    enum class Source { CDN, TTS }
    @Volatile internal var handle: PlayHandle? = null
    @Volatile var durSec = 0.0; internal set          // 0 = unknown (system speech)
    @Volatile var started = false; internal set
    @Volatile var ended = false; internal set
    private val t0 = System.nanoTime()
    private var startNs = 0L
    internal fun markStart() { startNs = System.nanoTime(); started = true }
    /** Seconds since audible start; TTS has no player clock, so it is wall time since onStart. */
    fun clock(): Double = if (!started) 0.0 else handle?.positionSec()?.takeIf { source == Source.CDN } ?: ((System.nanoTime() - startNs) / 1e9)
    fun playing(): Boolean = started && !ended
}

interface SpeakListener { fun onSegment(seg: Segment) {}; fun onEnd() {}; /** nothing could be played (no CDN file, no system voice) */ fun onFail() {} }

/**
 * C04: CDN Kokoro files with multi-origin failover (AudioLogic.urls), disk cache (offline replay), system TTS as the last resort with a
 * gender-correct voice. One voice at a time (a new speak() stops the previous). Port of the tts()/speak() chain in web/js/ui.js.
 */
class LkAudio(
    private val scope: CoroutineScope,
    private val fetcher: Fetcher,
    private val cacheDir: File?,
    private val player: PlayBackend,
    private val tts: TtsBackend,
    private val io: kotlinx.coroutines.CoroutineDispatcher = Dispatchers.IO,
    /** keys re-rendered through the ASR gate (web LISTEN_AUDIO_S2); empty is valid */
    var s2: Set<String> = emptySet(),
) {
    /** Accumulated CDN failures (web cdnFail): every 2 failures move the first-choice origin one step down. */
    @Volatile var fails = 0; private set
    private val missing = HashSet<String>() // keys every origin answered 404 for – use TTS straight away
    private var seq = 0
    private var cur: PlayHandle? = null
    private var job: Job? = null
    /** Every URL requested, in order (test + diagnostics). */
    val requested = ArrayList<String>()

    fun urls(key: String, kind: String = "l") = AudioLogic.urls(key, kind, fails, s2)

    /** Disk cache first, then the origins in order. null = no file anywhere. */
    suspend fun resolve(key: String, kind: String = "l"): File? {
        val id = "$kind-$key"
        val f = cacheDir?.let { File(it, "$id.mp3") }
        if (f != null && f.length() > 0) return f
        if (id in missing) return null
        var all404 = true
        for (u in urls(key, kind)) {
            requested.add(u)
            val r = fetcher.get(u)
            if (r.ok) {
                if (f == null) return null
                return withContext(io) { f.parentFile?.mkdirs(); val tmp = File(f.path + ".part"); tmp.writeBytes(r.body!!); if (tmp.renameTo(f)) { if (++writes % TRIM_EVERY == 0) trim(f.parentFile); f } else { tmp.delete(); null } }
            }
            if (r.status != 404) { fails++; all404 = false }
        }
        if (all404) missing.add(id)
        return null
    }

    private var writes = 0
    /** Disk cache stays under [MAX_CACHE_BYTES]: oldest files go first (the words of the current lessons are always the newest). */
    private fun trim(dir: File?) {
        val files = dir?.listFiles { x -> x.extension == "mp3" }?.sortedBy { it.lastModified() } ?: return
        var total = files.sumOf { it.length() }
        for (x in files) { if (total <= MAX_CACHE_BYTES) break; total -= x.length(); x.delete() }
    }

    fun stop() { seq++; job?.cancel(); job = null; cur?.stop(); cur = null; tts.stop() }

    /** Reads `text` aloud as [who] (ama / carlos / Kokoro id). */
    fun speak(text: String, who: String, rate: Float = 0.95f, listener: SpeakListener = object : SpeakListener {}) {
        val clean = AudioLogic.ttsClean(text)
        stop(); val my = seq
        if (clean.isEmpty()) { listener.onEnd(); return }
        val voice = AudioLogic.voiceOf(who) ?: if (AudioLogic.kokoro(who) != null) who else AudioLogic.wordVoice("en-US")
        val accent = AudioLogic.kokoro(voice)?.accent ?: "en-US"
        val gender = AudioLogic.genderFor(who).ifEmpty { AudioLogic.kokoro(voice)?.gender ?: "" }
        val pr = (rate / 0.95f).coerceIn(0.55f, 1.3f)
        val segs = AudioLogic.split(clean)
        job = scope.launch { run(my, segs.map { it to AudioLogic.lineKey(voice, it) }, "l", pr, accent, gender, rate, listener) }
    }

    /** A single dictionary word (Whisper-checked file); `slow` = 0.7x like the web. */
    fun speakWord(word: String, accent: String = "en-US", slow: Boolean = false, listener: SpeakListener = object : SpeakListener {}) {
        val clean = AudioLogic.ttsClean(word)
        stop(); val my = seq
        if (clean.isEmpty()) { listener.onEnd(); return }
        val key = AudioLogic.wordKey(AudioLogic.wordVoice(accent), clean)
        job = scope.launch { run(my, listOf(clean to key), "w", if (slow) 0.7f else 1f, accent, "", if (slow) 0.55f else 0.95f, listener) }
    }

    /** Warm the cache for the next lines (fire and forget; failures are silent and do not count against the origins' budget twice). */
    fun preload(text: String, who: String) {
        val voice = AudioLogic.voiceOf(who) ?: return
        scope.launch { for (s in AudioLogic.split(AudioLogic.ttsClean(text)).take(3)) resolve(AudioLogic.lineKey(voice, s)) }
    }

    private suspend fun run(my: Int, segs: List<Pair<String, String>>, kind: String, pr: Float, accent: String, gender: String, ttsRate: Float, l: SpeakListener) {
        for ((i, p) in segs.withIndex()) {
            if (my != seq) return
            val file = resolve(p.second, kind)
            if (my != seq) return
            val ok = file != null && playFile(my, i, p.first, file, pr, l)
            if (my != seq) return
            if (!ok) { speakSystem(my, i, segs.drop(i).joinToString(" ") { it.first }, accent, gender, ttsRate, l); return }
            if (i + 1 < segs.size) delay((AudioLogic.SENT_GAP_MS / pr).toLong())
        }
        if (my == seq) l.onEnd()
    }

    private suspend fun playFile(my: Int, i: Int, text: String, file: File, rate: Float, l: SpeakListener): Boolean = suspendCancellableCoroutine { k ->
        val seg = Segment(i, text, Segment.Source.CDN)
        val done = { ok: Boolean -> seg.ended = true; if (k.isActive) k.resume(ok) }
        val h = player.play(file, rate, object : PlayCallback {
            override fun onStart(durSec: Double) { if (my != seq) return; seg.durSec = durSec; seg.markStart(); l.onSegment(seg) }
            override fun onEnd() = done(true)
            override fun onError() { file.delete(); done(false) } // a corrupt cached file must not poison the next try
        })
        seg.handle = h; cur = h
        k.invokeOnCancellation { h.stop() }
    }

    private suspend fun speakSystem(my: Int, i: Int, text: String, accent: String, gender: String, rate: Float, l: SpeakListener) {
        val seg = Segment(i, text, Segment.Source.TTS)
        val ok = suspendCancellableCoroutine<Boolean> { k ->
            fun end(ok: Boolean) { seg.ended = true; if (k.isActive) k.resume(ok) }
            val h = tts.speak(text, accent, gender, rate, object : TtsCallback {
                override fun onStart() { if (my != seq) return; seg.markStart(); l.onSegment(seg) }
                override fun onEnd() = end(true)
                override fun onError() = end(false)
            })
            seg.handle = h; cur = h
            k.invokeOnCancellation { h.stop() }
        }
        if (my != seq) return
        if (ok) l.onEnd() else l.onFail()
    }

    private companion object { const val TRIM_EVERY = 20; const val MAX_CACHE_BYTES = 50L * 1024 * 1024 }
}
