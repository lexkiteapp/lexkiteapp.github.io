package com.lexkite.app.core.speak

import com.lexkite.app.core.lesson.Speaking
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.strs
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * A UI text exactly as the web passes it to `t()` (vectors/speak.json `{k, v}`): the Vietnamese source key [k] and its `{name}` variables.
 * A variable may itself be a [Tr] (nested keys are translated from the inside out) or a number / string.
 */
class Tr(val k: String, val v: Map<String, Any> = emptyMap()) {
    /** The vector shape: `{k}` or `{k, v:{…}}`. */
    fun json(): JsonElement {
        val m = LinkedHashMap<String, JsonElement>(); m["k"] = JsonPrimitive(k)
        if (v.isNotEmpty()) m["v"] = JsonObject(v.mapValues { toJson(it.value) })
        return JsonObject(m)
    }
    override fun toString() = k
    companion object {
        fun toJson(x: Any?): JsonElement = when (x) { null -> JsonNull; is Tr -> x.json(); is Int -> JsonPrimitive(x); is Long -> JsonPrimitive(x); is Double -> JsonPrimitive(x); is Boolean -> JsonPrimitive(x); else -> JsonPrimitive(x.toString()) }
    }
}
/** Translates [x] with the UI-language [Tx] (variables first, so a nested key is translated before it is substituted). */
fun Tx.tr(x: Tr): String = t(x.k, if (x.v.isEmpty()) null else x.v.mapValues { (_, a) -> if (a is Tr) tr(a) else a.toString() })

/** One scored result of the platform recogniser: the alternative closest to the target ([heard]), its percent score and every alternative. */
class Heard(val heard: String, val score: Int, val alts: List<String>)

/** Speak (web/js/speak/score.js) + ui.js recognize(): the shared scoring of every speaking screen. The recogniser itself is a platform input. */
object SpeakScore {
    /** Logistic calibration `{a, b}` of `Speak.pass` (pack `consts.speakScore`, read from score.js). */
    @Volatile private var cal = doubleArrayOf(12.0, -9.6)
    fun install(consts: JsonObject?) { val s = consts.go("speakScore") ?: return; cal = doubleArrayOf(s.gn("a", 12.0), s.gn("b", -9.6)) }

    private val NON = Regex("[^a-z0-9' ]+"); private val WS = Regex("\\s+")
    fun norm(s: String?): String = (s ?: "").lowercase().replace('’', '\'').replace(NON, " ").trim()
    fun toks(s: String?): List<String> = norm(s).split(WS).filter { it.isNotEmpty() }

    /** Alternative closest to [target] (ties: the first), score = round(similarity·100); blanks dropped; nothing left ⇒ ("", 0). */
    fun best(target: String, alts: List<String>): Heard {
        val list = alts.map { it.trim() }.filter { it.isNotEmpty() }
        var bestA = ""; var bestS = -1.0
        for (a in list) { val s = Speaking.similarity(a, target); if (s > bestS) { bestS = s; bestA = a } }
        return Heard(bestA, if (bestS < 0) 0 else Speaking.percent(bestS), list)
    }

    class Word(val w: String, val ok: Boolean)
    /** LCS alignment of the target words (punctuation kept for display) against what was heard. */
    fun align(target: String?, heard: String?): List<Word> {
        val shown = WS.split((target ?: "").trim()).filter { it.isNotEmpty() }
        val a = shown.map { norm(it).replace(WS, "") }; val b = toks(heard).map { it.replace(WS, "") }
        val n = a.size; val m = b.size; val l = Array(n + 1) { IntArray(m + 1) }
        for (i in n - 1 downTo 0) for (j in m - 1 downTo 0) l[i][j] = if (a[i].isNotEmpty() && a[i] == b[j]) l[i + 1][j + 1] + 1 else maxOf(l[i + 1][j], l[i][j + 1])
        val ok = BooleanArray(n); var i = 0; var j = 0
        while (i < n && j < m) { if (a[i].isNotEmpty() && a[i] == b[j]) { ok[i] = true; i++; j++ } else if (l[i + 1][j] >= l[i][j + 1]) i++ else j++ }
        return shown.mapIndexed { k, w -> Word(w, ok[k] || a[k].isEmpty()) }
    }
    fun text(words: List<Word>): Double = if (words.isEmpty()) 0.0 else words.count { it.ok }.toDouble() / words.size
    /** `Speak.pass`: something was heard and σ(a·text + b) ≥ 0.5 (⇔ text ≥ 0.8). */
    fun pass(text: Double, unclear: Boolean = false): Boolean = !unclear && 1.0 / (1.0 + Math.exp(-(cal[0] * text + cal[1]))) >= 0.5
    /** First intent whose keyword occurs (whole words) in what was heard. */
    fun intentOf(heard: String?, intents: List<Pair<String, List<String>>>): String? {
        val h = " " + toks(heard).joinToString(" ") + " "
        for ((id, kws) in intents) if (kws.any { h.contains(" " + toks(it).joinToString(" ") + " ") }) return id
        return null
    }
    /** `wpm = round(words / seconds · 60)` with seconds ≥ 1 (the elapsed time is an input). */
    fun wpm(heard: String?, ms: Long): Int { val n = toks(heard).size; if (n == 0) return 0; val sec = maxOf(1L, ms) / 1000.0; return Math.floor(n / sec * 60 + 0.5).toInt() }
}

/** Platform speech-recognition errors the screens react to (web ui.js REC_ERR keys). */
object RecError {
    const val NOT_ALLOWED = "not-allowed"; const val UNSUPPORTED = "unsupported"; const val NO_SPEECH = "no-speech"
    private val BLOCKED = setOf("not-allowed", "service-not-allowed", "unsupported", "audio-capture")
    /** The mic cannot be used at all (permission, recogniser or hardware missing). */
    fun blocked(code: String) = code in BLOCKED
    /** An error that only means "try again" (nothing is held against the learner). */
    fun retry(code: String) = code in setOf("no-speech", "network", "busy", "whisper")
    /** The message of [code] (web recErrorText). */
    fun text(code: String): Tr = when (code) {
        "not-allowed" -> Tr("Cần cho phép dùng micro – bấm biểu tượng 🎙️/🔒 trên thanh địa chỉ và chọn “Cho phép”.")
        "service-not-allowed" -> Tr("Trình duyệt đang chặn nhận dạng giọng nói trên trang này.")
        "no-speech" -> Tr("Không nghe thấy gì – bấm micro rồi đọc to, rõ ràng nhé.")
        "audio-capture" -> Tr("Không tìm thấy micro – kiểm tra tai nghe/micro của máy.")
        "network", "language-not-supported" -> Tr("Không kết nối được dịch vụ nhận dạng giọng nói (cần Internet).")
        "busy" -> Tr("Micro đang bận – thử lại sau 1 giây.")
        "whisper" -> Tr("Chưa chạy được nhận dạng giọng nói trên máy – kiểm tra Internet rồi bấm micro thử lại.")
        else -> Tr("Lỗi nhận dạng: {err}", mapOf("err" to code))
    }
}

/** Small JSON readers shared by the P07 data classes (tolerant: a missing key is empty, never an exception). */
internal fun JsonElement?.str(): String = (this as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content.orEmpty()
internal fun JsonElement?.obj(): JsonObject = this as? JsonObject ?: JsonObject(emptyMap())
internal fun JsonElement?.arr(): List<JsonElement> = (this as? JsonArray) ?: emptyList()
internal fun JsonElement?.strList(): List<String> = arr().map { it.str() }
internal fun JsonElement?.num(d: Double = 0.0): Double = (this as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content?.toDoubleOrNull() ?: d
internal fun JsonObject.opt(k: String): JsonElement? = this[k]?.takeIf { it !is JsonNull }

/** `new RegExp(source, flags)` of the web data → java regex (flags i / g). */
internal fun jsRegex(source: String, flags: String = ""): Regex = Regex(source, if ('i' in flags) setOf(RegexOption.IGNORE_CASE) else emptySet())
internal fun jsRegex(j: JsonElement?): Regex = jsRegex(j.obj().gs("source"), j.obj().gs("flags"))

/** JS `Math.round` for a non-negative or negative double. */
internal fun jsRound(x: Double): Int = Math.floor(x + 0.5).toInt()

/** The pack/vector section readers need `strs`/`ga` from :core vocab – re-exported so the P07 files import one place. */
internal fun JsonObject.list(k: String): List<JsonElement> = ga(k)
internal fun JsonObject.strings(k: String): List<String> = strs(k)
