// Gemini Nano trên máy qua AICore (ML Kit GenAI, API ≥ 26). Chỉ được gọi từ LexAIPlugin sau khi kiểm SDK_INT ≥ 26 –
// tách riêng để máy cũ không bao giờ nạp các lớp GenAI. Mọi lỗi (không có AICore, máy không hỗ trợ, bootloader mở…) → null.
// Không tự tải: trạng thái DOWNLOADABLE/DOWNLOADING chỉ chạy khi allowDownload (người dùng vừa bấm).
package com.vocaband.app

import android.content.Context
import com.google.mlkit.genai.common.DownloadCallback
import com.google.mlkit.genai.common.FeatureStatus
import com.google.mlkit.genai.common.GenAiException
import com.google.mlkit.genai.proofreading.Proofreader
import com.google.mlkit.genai.proofreading.ProofreaderOptions
import com.google.mlkit.genai.proofreading.Proofreading
import com.google.mlkit.genai.proofreading.ProofreadingRequest
import com.google.mlkit.genai.prompt.Generation
import com.google.mlkit.genai.prompt.GenerativeModel
import com.google.mlkit.genai.prompt.TextPart
import com.google.mlkit.genai.prompt.generateContentRequest
import com.google.mlkit.genai.summarization.Summarization
import com.google.mlkit.genai.summarization.SummarizationRequest
import com.google.mlkit.genai.summarization.Summarizer
import com.google.mlkit.genai.summarization.SummarizerOptions
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.guava.await

object LexGenAI {
    @Volatile private var model: GenerativeModel? = null
    @Volatile private var summarizer: Summarizer? = null
    @Volatile private var proofreader: Proofreader? = null

    private fun gen(): GenerativeModel = model ?: Generation.getClient().also { model = it }
    private fun sum(ctx: Context): Summarizer = summarizer ?: Summarization.getClient(
        SummarizerOptions.builder(ctx.applicationContext)
            .setInputType(SummarizerOptions.InputType.ARTICLE)
            .setOutputType(SummarizerOptions.OutputType.THREE_BULLETS)
            .setLanguage(SummarizerOptions.Language.ENGLISH)
            .build()
    ).also { summarizer = it }
    private fun pro(ctx: Context): Proofreader = proofreader ?: Proofreading.getClient(
        ProofreaderOptions.builder(ctx.applicationContext)
            .setInputType(ProofreaderOptions.InputType.KEYBOARD)
            .setLanguage(ProofreaderOptions.Language.ENGLISH)
            .build()
    ).also { proofreader = it }

    private fun name(s: Int) = when (s) {
        FeatureStatus.AVAILABLE -> "available"
        FeatureStatus.DOWNLOADABLE -> "downloadable"
        FeatureStatus.DOWNLOADING -> "downloading"
        else -> "unavailable"
    }
    private suspend fun st(f: suspend () -> Int): Int = try { f() } catch (t: Throwable) { FeatureStatus.UNAVAILABLE }
    private fun ok(s: Int, allowDownload: Boolean) = s == FeatureStatus.AVAILABLE || (allowDownload && (s == FeatureStatus.DOWNLOADABLE || s == FeatureStatus.DOWNLOADING))

    suspend fun status(ctx: Context): org.json.JSONObject = org.json.JSONObject()
        .put("prompt", name(st { gen().checkStatus() }))
        .put("summarize", name(st { sum(ctx).checkFeatureStatus().await() }))
        .put("proofread", name(st { pro(ctx).checkFeatureStatus().await() }))

    suspend fun prompt(ctx: Context, text: String, system: String?, maxTokens: Int, allowDownload: Boolean): String? = try {
        val m = gen()
        if (!ok(st { m.checkStatus() }, allowDownload)) null else {
            // Chỉ dẫn hệ thống ghép vào đầu (an toàn với mọi bản beta của Prompt API); giới hạn đầu vào ~4000 token
            val full = (if (system.isNullOrBlank()) "" else system.trim() + "\n\n") + text
            val r = m.generateContent(generateContentRequest(TextPart(full.take(12_000))) {
                temperature = 0.3f
                maxOutputTokens = maxTokens.coerceIn(16, 1024)
            })
            r.candidates.firstOrNull()?.text?.trim()?.takeIf { it.isNotEmpty() }
        }
    } catch (t: Throwable) { null }

    suspend fun summarize(ctx: Context, text: String, allowDownload: Boolean): String? = try {
        if (text.length < 400) null // Summarization API cần bài > 400 ký tự → JS dùng prompt/máy chủ
        else {
            val s = sum(ctx)
            if (!ok(st { s.checkFeatureStatus().await() }, allowDownload)) null
            else s.runInference(SummarizationRequest.builder(text.take(12_000)).build()).await().summary?.trim()?.takeIf { it.isNotEmpty() }
        }
    } catch (t: Throwable) { null }

    suspend fun proofread(ctx: Context, text: String, allowDownload: Boolean): String? = try {
        val p = pro(ctx)
        if (!ok(st { p.checkFeatureStatus().await() }, allowDownload)) null
        else p.runInference(ProofreadingRequest.builder(text.take(1000)).build()).await().results.firstOrNull()?.text
    } catch (t: Throwable) { null }

    private val noop = object : DownloadCallback {
        override fun onDownloadStarted(bytesToDownload: Long) {}
        override fun onDownloadFailed(e: GenAiException) {}
        override fun onDownloadProgress(totalBytesDownloaded: Long) {}
        override fun onDownloadCompleted() {}
    }

    suspend fun download(ctx: Context, kind: String): Boolean = try {
        when (kind) {
            "summarize" -> { sum(ctx).downloadFeature(noop).await(); true }
            "proofread" -> { pro(ctx).downloadFeature(noop).await(); true }
            else -> { gen().download().collect { }; gen().checkStatus() == FeatureStatus.AVAILABLE }
        }
    } catch (t: Throwable) { false }

    fun close() {
        runCatching { summarizer?.close() }; runCatching { proofreader?.close() }; runCatching { model?.close() }
        summarizer = null; proofreader = null; model = null
    }
}
