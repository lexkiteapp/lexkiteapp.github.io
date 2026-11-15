package com.lexkite.app.core.speak

import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.Topic
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gs
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** One word of the hands-free list. */
class HfWord(val word: String, val ipa: String, val meaning: String, val ex: String, val audio: String, val audioUS: String) {
    companion object { fun of(c: JsonObject) = HfWord(c.gs("word"), c.gs("ipa"), CardMath.meanOf(c), c.gs("ex"), c.gs("audio"), c.gs("audioUS")) }
}
/** The platform side of hands-free playback: every call suspends until the sound / speech / wait is over (an audio error also ends the call). */
interface HfIO {
    /** The screen is off: no speech synthesis, a silent track keeps the playback session alive and steps follow each other at once. */
    val hidden: Boolean
    /** Plays the Kokoro clip of [text] if one exists (false = none, nothing played). */
    suspend fun clip(text: String): Boolean
    /** Plays a dictionary audio URL. */
    suspend fun url(u: String)
    /** The 1 s silent track. */
    suspend fun silence()
    suspend fun speak(text: String, lang: String, rate: Double)
    suspend fun wait(ms: Long)
}

/** #/handsfree (web handsfree.js): the list of words and the step machine word → pause → meaning → example. */
object HandsFree {
    const val LIST_MAX = 60; const val THINK_MS = 2200L; const val SPEECH_RATE = 0.95; const val DAY_MS = 86_400_000L
    class Opt(val ex: Boolean = true, val mean: Boolean = true, val gap: Long = 900) {
        fun json(): JsonElement = JsonObject(mapOf("ex" to JsonPrimitive(ex), "mean" to JsonPrimitive(mean), "gap" to JsonPrimitive(gap)))
        companion object { /** settings.hf over the defaults. */ fun of(hf: JsonElement?): Opt { val o = hf as? JsonObject; fun b(k: String, d: Boolean) = (o?.get(k) as? JsonPrimitive)?.content?.let { it == "true" || it == "1" } ?: d
            return Opt(b("ex", true), b("mean", true), o?.gn("gap", 900.0)?.toLong() ?: 900L) } }
    }
    class Queue(val title: Tr, val words: List<JsonObject>)
    /** Session → topic → cards due within a day (≤ 60, soonest first) → the whole word book (newest first) → the first topic (ngsl1). [titleOf] = the topic's name key. */
    fun queue(arg: String?, cards: Map<String, JsonObject>, session: List<String>?, topic: (String) -> Topic?, now: Long): Queue {
        if (arg == "session" && !session.isNullOrEmpty()) { val ws = session.mapNotNull { cards[it] }; if (ws.isNotEmpty()) return Queue(Tr("Phiên ôn tập ({n} thẻ)", mapOf("n" to ws.size)), ws) }
        if (!arg.isNullOrEmpty()) topic(arg)?.let { return Queue(Tr(it.name), it.words) }
        val all = cards.values.toList()
        val due = all.filter { c -> val s = c.go("srs"); s != null && (s.gn("reps") > 0 || s.gn("last") != 0.0) && s.gn("due") <= now + DAY_MS }.sortedBy { it.go("srs").gn("due") }
        if (due.isNotEmpty()) return Queue(Tr("Từ đến hạn ôn"), due.take(LIST_MAX))
        if (all.isNotEmpty()) return Queue(Tr("Sổ từ của bạn"), all.sortedByDescending { it.gn("added") }.take(LIST_MAX))
        val tp = topic("ngsl1"); return Queue(Tr(tp?.name ?: "Lexkite"), tp?.words?.take(LIST_MAX) ?: emptyList())
    }
    fun footer(title: Tr) = Tr("Khóa màn hình vẫn phát tiếp tục qua tai nghe / loa ngoài. Danh sách: {t}", mapOf("t" to title))
    fun position(i: Int, n: Int) = "${i + 1}/$n"
    /** Lock-screen metadata: title = word, artist = "ipa · meaning" (missing parts dropped), album = "Lexkite · <list>". */
    class Meta(val title: String, val artist: String, val album: String)
    fun meta(w: HfWord, list: String) = Meta(w.word, listOf(w.ipa, w.meaning).filter { it.isNotEmpty() }.joinToString(" · "), "Lexkite · $list")
    /** BCP-47 tag the meaning is spoken in (Vietnamese learners hear vi-VN, else the UI language). */
    fun meaningLang(meanLang: String, uiLang: String): String = if (meanLang == "vi") "vi-VN" else LANG[uiLang] ?: "en-GB"
    private val LANG = mapOf("vi" to "vi-VN", "en" to "en-GB", "zh" to "zh-CN", "ja" to "ja-JP", "ko" to "ko-KR", "es" to "es-ES", "pt" to "pt-BR", "fr" to "fr-FR", "de" to "de-DE", "id" to "id-ID", "th" to "th-TH", "hi" to "hi-IN", "ar" to "ar-SA", "ru" to "ru-RU", "tr" to "tr-TR")

    /** The player: the web `run()` chain as a loop. [onWord] fires when a word is shown (step 0). Cancel the coroutine to pause. */
    class Engine(val words: List<HfWord>, val opt: Opt, private val io: HfIO, private val accent: String, private val meaningLang: String, private val onWord: (Int) -> Unit = {}) {
        @Volatile var i = 0; private set
        @Volatile var step = 0; private set
        fun next() { i = (i + 1) % words.size; step = 0 }
        fun prev() { i = (i - 1 + words.size) % words.size; step = 0 }
        private suspend fun advance() { if (!io.hidden) io.wait(opt.gap) }
        /** The card audio URL for the accent when no clip exists (en-US: audioUS first, else audio first). */
        private fun cardAudio(w: HfWord) = (if (accent == "en-US") w.audioUS else w.audio).ifEmpty { w.audio }.ifEmpty { w.audioUS }
        suspend fun run() {
            if (words.isEmpty()) return
            while (true) {
                val w = words[i]
                when (step) {
                    0 -> { onWord(i); step = 1
                        if (!io.clip(w.word)) { val u = cardAudio(w); if (u.isNotEmpty()) io.url(u) else if (io.hidden) io.silence() else io.speak(w.word, accent, SPEECH_RATE) }
                        advance() }
                    1 -> { step = 2
                        if (io.hidden) io.silence() else { io.wait(THINK_MS); if (opt.mean && w.meaning.isNotEmpty()) io.speak(w.meaning, meaningLang, SPEECH_RATE) }
                        advance() }
                    2 -> { step = 3
                        if (opt.ex && w.ex.isNotEmpty()) { if (!io.clip(w.ex) && !io.hidden) io.speak(w.ex, accent, SPEECH_RATE) }
                        advance() }
                    else -> next()
                }
            }
        }
    }
}
