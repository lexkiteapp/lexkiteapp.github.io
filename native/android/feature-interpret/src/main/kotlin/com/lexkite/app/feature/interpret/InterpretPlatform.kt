package com.lexkite.app.feature.interpret

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import com.google.android.gms.tasks.Task
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.languageid.LanguageIdentificationOptions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.TranslatorOptions
import com.lexkite.app.core.interpret.Interpret
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlinx.coroutines.withTimeoutOrNull
import java.util.Locale
import kotlin.coroutines.resume

private suspend fun <T> Task<T>.result(): T? = suspendCancellableCoroutine { c -> addOnSuccessListener { if (c.isActive) c.resume(it) }.addOnFailureListener { if (c.isActive) c.resume(null) }.addOnCanceledListener { if (c.isActive) c.resume(null) } }

private suspend fun Task<*>.ok(): Boolean = suspendCancellableCoroutine { c -> addOnSuccessListener { if (c.isActive) c.resume(true) }.addOnFailureListener { if (c.isActive) c.resume(false) }.addOnCanceledListener { if (c.isActive) c.resume(false) } }

/** ML Kit Translation 17.0.3: one small model per language (~30 MB), downloaded only on a tap and only on Wi-Fi; translation itself is fully on the device. */
class MlKitTranslator : Translator {
    private val clients = HashMap<String, com.google.mlkit.nl.translate.Translator>()
    private fun code(l: String): String? = TranslateLanguage.fromLanguageTag(Interpret.base(l))
    private suspend fun has(c: String): Boolean = RemoteModelManager.getInstance().isModelDownloaded(TranslateRemoteModel.Builder(c).build()).result() == true

    override suspend fun translate(text: String, from: String, to: String): Translated? {
        val s = code(from) ?: return null; val d = code(to) ?: return null
        if (s == d) return Translated(text, true)
        // English is the hub of ML Kit: a pair without it pivots through English, so every model of the route must be there BEFORE asking (translate never downloads)
        if (!models(s, d).all { has(it) }) return null
        val key = "$s>$d"
        val cl = clients.getOrPut(key) { Translation.getClient(TranslatorOptions.Builder().setSourceLanguage(s).setTargetLanguage(d).build()) }
        val out = withTimeoutOrNull(8_000) { cl.translate(text).result() }
        return out?.takeIf { it.isNotBlank() }?.let { Translated(it, true) }
    }

    private fun models(s: String, d: String): Set<String> = setOf(s, d) + (if (s == TranslateLanguage.ENGLISH || d == TranslateLanguage.ENGLISH) emptySet() else setOf(TranslateLanguage.ENGLISH))

    override suspend fun download(a: String, b: String): Boolean {
        val s = code(a) ?: return false; val d = code(b) ?: return false
        val cond = DownloadConditions.Builder().requireWifi().build()
        return models(s, d).all { c -> has(c) || RemoteModelManager.getInstance().download(TranslateRemoteModel.Builder(c).build(), cond).ok() }
    }
}

/** ML Kit Language ID 17.0.6 (model bundled in the library): who spoke? */
class MlKitLangId : LangId {
    private val client by lazy { LanguageIdentification.getClient(LanguageIdentificationOptions.Builder().setConfidenceThreshold(Interpret.SURE.toFloat()).build()) }
    override suspend fun detect(text: String): Interpret.Detected? {
        val l = withTimeoutOrNull(3_000) { client.identifyPossibleLanguages(text).result() }?.firstOrNull { it.languageTag != "und" } ?: return null
        return Interpret.Detected(l.languageTag, l.confidence.toDouble())
    }
}

/** Android TextToSpeech with the language of the text; the engine is created on first use and released with [stop] of the screen. */
class AndroidVoice(private val ctx: Context) : Voice {
    private var tts: TextToSpeech? = null; private var ready = false; private val queue = ArrayList<() -> Unit>()
    private fun engine(then: () -> Unit) {
        if (ready) { then(); return }
        queue.add(then)
        if (tts == null) tts = TextToSpeech(ctx.applicationContext) { st -> ready = st == TextToSpeech.SUCCESS; val q = queue.toList(); queue.clear(); if (ready) q.forEach { it() } }
    }
    override fun speak(text: String, lang: String, rate: Float, done: () -> Unit) = engine {
        val t = tts ?: return@engine
        val loc = Locale.forLanguageTag(Interpret.LOC[Interpret.base(lang)] ?: lang)
        if (t.isLanguageAvailable(loc) >= TextToSpeech.LANG_AVAILABLE) t.language = loc
        t.setSpeechRate(rate)
        t.setOnUtteranceProgressListener(object : UtteranceProgressListener() { override fun onStart(id: String?) {}; override fun onDone(id: String?) = done(); @Deprecated("") override fun onError(id: String?) = done() })
        t.speak(text, TextToSpeech.QUEUE_FLUSH, null, "ip")
    }
    override fun stop() { runCatching { tts?.stop() } }
    fun release() { runCatching { tts?.shutdown() }; tts = null; ready = false; queue.clear() }
}
