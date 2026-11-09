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
    fun stop()
}

/** android.speech.SpeechRecognizer (needs RECORD_AUDIO granted by the caller). Main thread only. */
class AndroidSpeech(private val ctx: Context) : SpeechInput {
    private var rec: SpeechRecognizer? = null
    override val available: Boolean get() = SpeechRecognizer.isRecognitionAvailable(ctx)

    override fun start(onResult: (List<String>) -> Unit, onError: (String) -> Unit) {
        if (!available) { onError("unsupported"); return }
        stop()
        val r = runCatching { SpeechRecognizer.createSpeechRecognizer(ctx) }.getOrNull() ?: run { onError("unsupported"); return }
        rec = r
        r.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) { val l = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION).orEmpty(); if (l.isEmpty()) onError("no-speech") else onResult(l); stop() }
            override fun onError(error: Int) {
                onError(when (error) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no-speech"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "not-allowed"
                    SpeechRecognizer.ERROR_CLIENT -> "error"
                    else -> "error"
                }); stop()
            }
            override fun onReadyForSpeech(params: Bundle?) {}
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onPartialResults(partialResults: Bundle?) {}
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
        r.startListening(Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US").putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3))
    }

    override fun stop() { rec?.let { runCatching { it.cancel() }; runCatching { it.destroy() } }; rec = null }
}
