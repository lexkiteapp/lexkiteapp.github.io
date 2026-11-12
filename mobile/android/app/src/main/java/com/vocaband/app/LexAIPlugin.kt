// Plugin Capacitor "LexAI": AI có sẵn trên điện thoại (miễn phí, chạy trên máy). Gọi từ web/js/ai-local.js (chỉ trong app gốc).
// - Gemini Nano qua AICore (ML Kit GenAI: Prompt / Summarization / Proofreading) – chỉ máy hỗ trợ (Pixel 9+, Galaxy S25…), API ≥ 26.
// - ML Kit Translation (mô hình ~30 MB/ngôn ngữ, tải khi người dùng bấm, mặc định chỉ Wi-Fi) + Language ID (đóng gói sẵn).
// Mọi hàm chạy ngoài luồng chính, có timeout, KHÔNG throw: lỗi/không có → resolve({ unavailable: true }) để JS dùng máy chủ.
// Máy không có AICore / API < 26: không chạm lớp GenAI (LexGenAI) → không crash. Xem docs/AI-LOCAL.md.
package com.vocaband.app

import android.content.Context
import android.net.ConnectivityManager
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.common.model.RemoteModelManager
import com.google.mlkit.nl.languageid.LanguageIdentification
import com.google.mlkit.nl.languageid.LanguageIdentificationOptions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.TranslateRemoteModel
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.withTimeoutOrNull
import org.json.JSONArray
import java.util.concurrent.ConcurrentHashMap

@CapacitorPlugin(name = "LexAI")
class LexAIPlugin : Plugin() {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    private val translators = ConcurrentHashMap<String, Translator>()
    private val langId by lazy { LanguageIdentification.getClient(LanguageIdentificationOptions.Builder().setConfidenceThreshold(0.3f).build()) }
    private val genAiOk get() = Build.VERSION.SDK_INT >= 26

    private fun none(why: String = "") = JSObject().put("unavailable", true).put("reason", why)
    private fun ms(call: PluginCall, def: Long) = (call.getInt("timeout") ?: def.toInt()).toLong().coerceIn(500, 60_000)

    // Chạy khối lệnh ngoài luồng chính, có timeout; mọi lỗi → { unavailable: true }
    private fun run(call: PluginCall, timeoutMs: Long, block: suspend () -> JSObject?) {
        scope.launch {
            val r = try { withTimeoutOrNull(timeoutMs) { block() } ?: none("timeout") } catch (t: Throwable) { none(t.javaClass.simpleName) }
            call.resolve(r)
        }
    }

    // Mạng có tính phí (di động) → không tải mô hình khi chỉ cho Wi-Fi. Không đọc được trạng thái → coi như có tính phí.
    private fun metered(): Boolean = try {
        (context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager).isActiveNetworkMetered
    } catch (t: Throwable) { true }

    @PluginMethod
    fun caps(call: PluginCall) = run(call, 4000) {
        val o = JSObject().put("native", true).put("platform", "android").put("metered", metered())
        val g = if (genAiOk) LexGenAI.status(context) else null
        for (k in listOf("prompt", "summarize", "proofread")) o.put(k, g?.optString(k, "unavailable") ?: "unavailable")
        o.put("translate", "downloadable").put("detect", "available").put("rewrite", "unavailable").put("write", "unavailable")
        o
    }

    @PluginMethod
    fun prompt(call: PluginCall) = run(call, ms(call, 20_000)) {
        val text = call.getString("text") ?: return@run none("text")
        if (!genAiOk) return@run none("sdk")
        LexGenAI.prompt(context, text, call.getString("system"), call.getInt("maxTokens") ?: 256, call.getBoolean("allowDownload", false) == true)
            ?.let { JSObject().put("text", it) } ?: none()
    }

    @PluginMethod
    fun summarize(call: PluginCall) = run(call, ms(call, 20_000)) {
        val text = call.getString("text") ?: return@run none("text")
        if (!genAiOk) return@run none("sdk")
        LexGenAI.summarize(context, text, call.getBoolean("allowDownload", false) == true)?.let { JSObject().put("text", it) } ?: none()
    }

    @PluginMethod
    fun proofread(call: PluginCall) = run(call, ms(call, 15_000)) {
        val text = call.getString("text") ?: return@run none("text")
        if (!genAiOk) return@run none("sdk")
        LexGenAI.proofread(context, text, call.getBoolean("allowDownload", false) == true)?.let { JSObject().put("corrected", it) } ?: none()
    }

    // Tải Gemini Nano (AICore) sau khi người dùng bấm; mặc định chỉ Wi-Fi
    @PluginMethod
    fun download(call: PluginCall) = run(call, 30 * 60_000L) {
        if (call.getBoolean("wifiOnly", true) == true && metered()) return@run none("metered")
        val kind = call.getString("kind") ?: "prompt"
        if (kind == "translate") {
            val from = TranslateLanguage.fromLanguageTag(call.getString("from") ?: "en") ?: return@run none("lang")
            val to = TranslateLanguage.fromLanguageTag(call.getString("to") ?: "") ?: return@run none("lang")
            translator(from, to).downloadModelIfNeeded(conditions(call)).await()
            return@run JSObject().put("ok", true)
        }
        if (!genAiOk) return@run none("sdk")
        if (LexGenAI.download(context, kind)) JSObject().put("ok", true) else none()
    }

    private fun conditions(call: PluginCall) =
        if (call.getBoolean("wifiOnly", true) == true) DownloadConditions.Builder().requireWifi().build() else DownloadConditions.Builder().build()

    private fun translator(from: String, to: String): Translator =
        translators.getOrPut("$from>$to") { Translation.getClient(TranslatorOptions.Builder().setSourceLanguage(from).setTargetLanguage(to).build()) }

    private suspend fun hasModel(lang: String): Boolean =
        RemoteModelManager.getInstance().isModelDownloaded(TranslateRemoteModel.Builder(lang).build()).await()

    @PluginMethod
    fun translate(call: PluginCall) = run(call, ms(call, 10_000)) {
        val text = call.getString("text") ?: return@run none("text")
        val from = TranslateLanguage.fromLanguageTag(call.getString("from") ?: "") ?: return@run none("lang")
        val to = TranslateLanguage.fromLanguageTag(call.getString("to") ?: "") ?: return@run none("lang")
        if (from == to || text.length > 5000) return@run none("input")
        val ready = hasModel(from) && hasModel(to)
        if (!ready) {
            // Chưa có gói ngôn ngữ: chỉ tải khi JS cho phép (người dùng vừa bấm) và đúng điều kiện mạng
            if (call.getBoolean("allowDownload", false) != true) return@run none("downloadable").put("status", "downloadable")
            if (call.getBoolean("wifiOnly", true) == true && metered()) return@run none("metered").put("status", "downloadable")
        }
        val tr = translator(from, to)
        if (!ready) withTimeoutOrNull(10 * 60_000L) { tr.downloadModelIfNeeded(conditions(call)).await() } ?: return@run none("download")
        val out = tr.translate(text).await()
        if (out.isNullOrBlank()) none() else JSObject().put("text", out.trim())
    }

    @PluginMethod
    fun detect(call: PluginCall) = run(call, ms(call, 4000)) {
        val text = call.getString("text")?.take(2000) ?: return@run none("text")
        if (text.isBlank()) return@run none("text")
        val list = langId.identifyPossibleLanguages(text).await().filter { it.languageTag != "und" }
        val top = list.firstOrNull() ?: return@run none("und")
        val all = JSONArray(); list.take(3).forEach { all.put(JSObject().put("lang", it.languageTag).put("confidence", it.confidence.toDouble())) }
        JSObject().put("lang", top.languageTag).put("confidence", top.confidence.toDouble()).put("all", all)
    }

    override fun handleOnDestroy() {
        scope.cancel()
        translators.values.forEach { runCatching { it.close() } }; translators.clear()
        runCatching { langId.close() }
        if (genAiOk) runCatching { LexGenAI.close() }
        super.handleOnDestroy()
    }
}
