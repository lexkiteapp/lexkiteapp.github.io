package com.lexkite.app.feature.lesson

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer

/** Speech recognition seam: Android's recognizer in the app, a fake in tests (the score is injected, no microphone). */
interface SpeechInput {
    val available: Boolean
    /** [onResult] gets the recognizer's alternatives (best first); [onError] one of "no-speech" · "unsupported" · "not-allowed" · "error". */
    fun start(onResult: (List<String>) -> Unit, onError: (String) -> Unit)
    /** Same with the recogniser language (BCP-47, e.g. en-GB) and the live partial text (speaking room); a fake without these ignores them. */
    fun start(lang: String, onPartial: (String) -> Unit, onResult: (List<String>) -> Unit, onError: (String) -> Unit) = start(onResult, onError)
    fun stop()
    /** An on-device recogniser exists (Android 12+): audio never leaves the phone. A fake / older device says no. */
    val onDevice: Boolean get() = false
    /** Like [start] but ONLY on the device (never a server); without an on-device recogniser it reports "unsupported" – never a silent fall back to the cloud. */
    fun startOffline(lang: String, onPartial: (String) -> Unit, onResult: (List<String>) -> Unit, onError: (String) -> Unit) = onError("unsupported")
    /** The learner is done speaking: the result is still delivered (default: same as [stop]). */
    fun finish() = stop()
}

/** android.speech.SpeechRecognizer (needs RECORD_AUDIO granted by the caller). Main thread only. */
class AndroidSpeech(private val ctx: Context) : SpeechInput {
    private var rec: SpeechRecognizer? = null
    override val available: Boolean get() = SpeechRecognizer.isRecognitionAvailable(ctx)

    override fun start(onResult: (List<String>) -> Unit, onError: (String) -> Unit) = start("en-US", {}, onResult, onError)

    override val onDevice: Boolean get() = android.os.Build.VERSION.SDK_INT >= 31 && runCatching { SpeechRecognizer.isOnDeviceRecognitionAvailable(ctx) }.getOrDefault(false)
    override fun startOffline(lang: String, onPartial: (String) -> Unit, onResult: (List<String>) -> Unit, onError: (String) -> Unit) { if (!onDevice) onError("unsupported") else begin(lang, true, onPartial, onResult, onError) }
    override fun finish() { rec?.let { runCatching { it.stopListening() } } }

    override fun start(lang: String, onPartial: (String) -> Unit, onResult: (List<String>) -> Unit, onError: (String) -> Unit) = begin(lang, false, onPartial, onResult, onError)

    private fun begin(lang: String, offline: Boolean, onPartial: (String) -> Unit, onResult: (List<String>) -> Unit, onError: (String) -> Unit) {
        if (!available) { onError("unsupported"); return }
        stop()
        val r = runCatching { if (offline && android.os.Build.VERSION.SDK_INT >= 31) SpeechRecognizer.createOnDeviceSpeechRecognizer(ctx) else SpeechRecognizer.createSpeechRecognizer(ctx) }.getOrNull() ?: run { onError("unsupported"); return }
        rec = r
        r.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) { val l = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty(); if (l.isEmpty()) onError("no-speech") else onResult(l); stop() }
            override fun onError(error: Int) {
                onError(when (error) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-speech"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "not-allowed"
                    SpeechRecognizer.ERROR_NETWORK, SpeechRecognizer.ERROR_NETWORK_TIMEOUT, SpeechRecognizer.ERROR_SERVER -> "network"
                    SpeechRecognizer.ERROR_AUDIO -> "audio-capture"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "busy"
                    12, 13 -> "language-not-supported" // ERROR_LANGUAGE_NOT_SUPPORTED / UNAVAILABLE (API 33)
                    SpeechRecognizer.ERROR_CLIENT -> "error"
                    else -> "error"
                }); stop()
            }
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) { partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull()?.let(onPartial) }
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        r.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang).putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true).putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 5)
            .also { if (offline) it.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true) })
    }

    override fun stop() { rec?.let { runCatching { it.cancel() }; runCatching { it.destroy() } }; rec = null }
}
