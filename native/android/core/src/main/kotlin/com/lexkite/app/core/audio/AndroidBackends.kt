package com.lexkite.app.core.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.PlaybackParams
import android.os.Handler
import android.os.Looper
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.io.File
import java.util.Locale

/** MediaPlayer playback with a smooth position clock for lip sync (player samples are ~ms steps; interpolate between them). */
class MediaPlayerBackend : PlayBackend {
    override fun play(file: File, rate: Float, cb: PlayCallback): PlayHandle {
        val mp = MediaPlayer()
        val h = object : PlayHandle {
            private var lastP = -1; private var lastNs = 0L; @Volatile private var released = false; private var dur = 0.0
            fun setDur(d: Double) { dur = d }
            override fun stop() { if (released) return; released = true; runCatching { mp.stop() }; runCatching { mp.release() } }
            override fun positionSec(): Double {
                if (released) return dur
                val p = runCatching { mp.currentPosition }.getOrDefault(0)
                val now = System.nanoTime()
                if (p != lastP) { lastP = p; lastNs = now }
                val s = p / 1000.0 + (now - lastNs) / 1e9 * rate
                return if (dur > 0) minOf(s, dur) else s
            }
        }
        try {
            mp.setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build())
            mp.setDataSource(file.path)
            mp.setOnPreparedListener {
                runCatching {
                    h.setDur(it.duration / 1000.0)
                    it.start()
                    if (rate != 1f) it.playbackParams = PlaybackParams().setSpeed(rate).setPitch(1f) // keeps pitch (web preservesPitch); set after start()
                    cb.onStart(it.duration / 1000.0 / rate)
                }.onFailure { cb.onError() }
            }
            mp.setOnCompletionListener { h.stop(); cb.onEnd() }
            mp.setOnErrorListener { _, _, _ -> h.stop(); cb.onError(); true }
            mp.prepareAsync()
        } catch (e: Exception) { h.stop(); cb.onError() }
        return h
    }
}

/** System speech, last resort. Picks the best voice for the accent AND gender (Ama female / Carlos male) with the ported web ranking; when the engine's
 *  voice names carry no gender (Google `en-us-x-…`), pitch separates the two characters. */
class AndroidTtsBackend(ctx: Context) : TtsBackend {
    private val main = Handler(Looper.getMainLooper())
    private var engine: TextToSpeech? = null
    @Volatile private var ready = false
    private val queue = ArrayList<() -> Unit>()
    private var serial = 0

    init {
        engine = TextToSpeech(ctx.applicationContext) { status ->
            main.post { ready = status == TextToSpeech.SUCCESS; val q = ArrayList(queue); queue.clear(); q.forEach { it() } }
        }
    }

    override fun speak(text: String, accent: String, gender: String, rate: Float, cb: TtsCallback): PlayHandle {
        val id = "lk${++serial}"
        var t0 = 0L
        fun go() {
            val e = engine
            if (!ready || e == null) { cb.onError(); return }
            val voices = runCatching { e.voices }.getOrNull().orEmpty()
            val pick = AudioLogic.pickVoice(voices.map { AudioLogic.SysVoice(it.name, it.locale.toLanguageTag(), !it.isNetworkConnectionRequired) }, accent, gender)
            val v = pick?.let { p -> voices.firstOrNull { it.name == p.name } }
            if (v != null) e.voice = v else e.language = Locale.forLanguageTag(accent)
            e.setSpeechRate(rate)
            val unknownGender = gender.isNotEmpty() && (pick == null || AudioLogic.genderOf(pick.name).isEmpty())
            e.setPitch(if (unknownGender) (if (gender == "m") 0.8f else 1.1f) else 1f)
            e.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) { if (utteranceId == id) { t0 = System.nanoTime(); main.post { cb.onStart() } } }
                override fun onDone(utteranceId: String?) { if (utteranceId == id) main.post { cb.onEnd() } }
                @Deprecated("API 15") override fun onError(utteranceId: String?) { if (utteranceId == id) main.post { cb.onError() } }
                override fun onError(utteranceId: String?, errorCode: Int) { if (utteranceId == id) main.post { cb.onError() } }
            })
            if (e.speak(text, TextToSpeech.QUEUE_FLUSH, null, id) == TextToSpeech.ERROR) cb.onError()
        }
        if (ready) go() else queue.add { go() }
        return object : PlayHandle {
            override fun stop() { runCatching { engine?.stop() } }
            override fun positionSec() = if (t0 == 0L) 0.0 else (System.nanoTime() - t0) / 1e9
        }
    }
    override fun stop() { runCatching { engine?.stop() } }

    private val casts = HashMap<String, TtsCallback>()
    private val castListener = object : UtteranceProgressListener() {
        override fun onStart(utteranceId: String?) { casts[utteranceId]?.let { main.post { it.onStart() } } }
        override fun onDone(utteranceId: String?) { casts.remove(utteranceId)?.let { main.post { it.onEnd() } } }
        @Deprecated("API 15") override fun onError(utteranceId: String?) { casts.remove(utteranceId)?.let { main.post { it.onError() } } }
        override fun onError(utteranceId: String?, errorCode: Int) { casts.remove(utteranceId)?.let { main.post { it.onError() } } }
    }

    /** Listening cast: queued sentences, each with its own voice / pitch (the engine reads the settings at speak time). */
    override fun speakCast(text: String, voice: String?, lang: String, pitch: Float, rate: Float, cb: TtsCallback): PlayHandle {
        val id = "lkc${++serial}"
        fun go() {
            val e = engine
            if (!ready || e == null) { cb.onError(); return }
            val v = voice?.let { n -> runCatching { e.voices }.getOrNull()?.firstOrNull { it.name == n } }
            if (v != null) e.voice = v else e.language = Locale.forLanguageTag(lang)
            e.setSpeechRate(rate); e.setPitch(pitch)
            casts[id] = cb; e.setOnUtteranceProgressListener(castListener)
            if (e.speak(text, TextToSpeech.QUEUE_ADD, null, id) == TextToSpeech.ERROR) { casts.remove(id); cb.onError() }
        }
        if (ready) go() else queue.add { go() }
        return object : PlayHandle { override fun stop() { casts.remove(id); runCatching { engine?.stop() } }; override fun positionSec() = 0.0 }
    }
    override fun voiceNames(lang: String): List<String> = if (!ready) emptyList() else runCatching { engine?.voices.orEmpty().filter { it.locale.toLanguageTag() == lang }.map { it.name } }.getOrDefault(emptyList())
}
