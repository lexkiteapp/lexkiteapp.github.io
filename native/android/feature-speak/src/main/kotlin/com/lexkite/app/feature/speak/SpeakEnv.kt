package com.lexkite.app.feature.speak

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.core.audio.SpeakListener
import com.lexkite.app.core.call.CallPack
import com.lexkite.app.core.rig.TeacherSignal
import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.skills.SkillsContent
import com.lexkite.app.core.speak.Rtype
import com.lexkite.app.core.speak.SayData
import com.lexkite.app.core.speak.SpeakPack
import com.lexkite.app.core.speak.Situation
import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.WebWords
import com.lexkite.app.feature.lesson.SpeechInput
import com.lexkite.app.feature.vocab.StudyReward
import com.lexkite.app.feature.vocab.VocabEnv
import com.lexkite.app.feature.vocab.WordEnv
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.File

/** Teacher art slot filled by :app (the 2D Ama / Carlos stills); the screens only reserve the place. */
class SpeakSlots(
    val teacher: @Composable (who: String, pose: String, modifier: Modifier) -> Unit = { _, _, _ -> },
    /** The live 2D teacher rig (P08 call): driven by the [TeacherSignal] the call sends; without it the still teacher is shown. */
    val live: @Composable (who: String, signal: TeacherSignal?, modifier: Modifier) -> Unit = { who, _, modifier -> teacher(who, "point", modifier) },
)

/** Answer of the Lexkite AI proxy: a JSON `out`, a quota refusal (HTTP 429, with the body), or a failure. */
sealed class AiResult { class Ok(val out: JsonObject) : AiResult(); class Quota(val body: JsonObject?) : AiResult(); object Failed : AiResult() }

/**
 * Everything the speaking screens need from the app graph: vocabulary env (store, audio, mistakes, rewards), word env (dictionary, cards), the content packs
 * (speaking pack, Say series, #/speak situations, reading tests, skills pack for Lexis) and the platform seams (speech recogniser, sign-in, connectivity, screen state).
 */
class SpeakEnv(
    val vocab: VocabEnv, val word: WordEnv, val learnLang: String, val speech: SpeechInput,
    private val loadPack: suspend () -> SpeakPack?, private val loadSay: suspend () -> SayData?,
    private val loadSituation: suspend (id: String, lang: String) -> Situation?, private val loadSituationIds: suspend () -> Set<String>,
    private val loadReadTests: suspend () -> Rtype.Pack?, private val loadSkills: suspend () -> SkillsContent?,
    private val loadLibrary: suspend () -> WebWords?,
    val signedIn: () -> Boolean = { false }, private val idToken: suspend () -> String? = { null }, val online: () -> Boolean = { true },
    /** The screen is off (hands-free): no speech synthesis, silent chaining. */
    val screenOff: () -> Boolean = { false },
    val random: () -> Double = { Math.random() },
    /** The call pack (P08, `#/call`): downloaded `call-pack.json`, then the cache, then the bundled starter. */
    private val loadCall: suspend () -> CallPack? = { null },
) {
    @Volatile private var callMemo: CallPack? = null
    suspend fun callPack(): CallPack? = callMemo ?: loadCall()?.also { callMemo = it }
    /** The `vb.call.*` device preferences of the call screens (`flt`, `asr`, `tr`): never synced; a null value removes the key. */
    suspend fun callPref(k: String): String? = kvStr("vb.call.$k")
    suspend fun setCallPref(k: String, v: String?) = vocab.store.put(mapOf("vb.call.$k" to v?.let { JsonPrimitive(it) }), local = false)
    /** An on-device recogniser exists (audio stays on the phone); the call screens use "local" only with it. */
    val onDevice: Boolean get() = speech.onDevice
    fun listenOffline(lang: String, onPartial: (String) -> Unit, onResult: (List<String>) -> Unit, onError: (String) -> Unit) = speech.startOffline(lang, onPartial, onResult, onError)
    fun finishListening() = speech.finish()

    @Volatile private var packMemo: SpeakPack? = null
    suspend fun pack(): SpeakPack? = packMemo ?: loadPack()?.also { packMemo = it }
    suspend fun say(): SayData? = loadSay()
    suspend fun situation(id: String): Situation? = loadSituation(id, learnLang)
    suspend fun situationIds(): Set<String> = loadSituationIds()
    suspend fun readTests(): Rtype.Pack? = loadReadTests()
    suspend fun skills(): SkillsContent? = loadSkills()
    suspend fun library(): WebWords? = loadLibrary()
    val now: Long get() = vocab.now()

    // ---------- device storage (the web's localStorage keys: never synced) ----------
    suspend fun kv(k: String): JsonElement? = vocab.store.get(k)
    suspend fun putKv(k: String, v: JsonElement) = vocab.store.put(mapOf(k to v), local = false)
    suspend fun kvStr(k: String): String? = (kv(k) as? JsonPrimitive)?.content
    /** The accent of the learner (settings.accent, default en-GB): drives voices and the recogniser. */
    suspend fun accent(): String = ((vocab.load().settings["accent"] as? JsonPrimitive)?.content).orEmpty().ifEmpty { "en-GB" }
    suspend fun setting(k: String): JsonElement? = vocab.load().settings[k]
    suspend fun setSetting(k: String, v: JsonElement) { val t = now; vocab.store.mutate { d -> d.copy(settings = JsonObject(Js.spread(d.settings) + (k to v)), settingsAt = JsonPrimitive(t)) } }
    /** `localStorage lk.speak` ("1" on, "0" off) wins; the route is behind the `speak_pack` flag, default OFF. */
    suspend fun speakOn(): Boolean = kvStr("lk.speak") == "1"

    // ---------- rewards / writes ----------
    suspend fun pay(r: Reward?) { if (r == null) return; val g = vocab.load().game; vocab.write(game = StudyReward.track(g, r.add.filterValues { it != 0 }, r.xp, now)) }
    suspend fun writeGame(f: (JsonElement?) -> JsonElement, r: Reward? = null) {
        var g = f(vocab.load().game); if (r != null) g = StudyReward.track(g, r.add.filterValues { it != 0 }, r.xp, now); vocab.write(game = g) }

    // ---------- speech ----------
    /** Reads [text] with the voice of [accent] (en-US ⇒ af_heart, else bf_emma) or of a teacher id (ama / carlos). */
    fun speak(text: String, accent: String, rate: Float = 0.95f, who: String? = null, done: () -> Unit = {}) {
        vocab.audio.speak(text, who ?: AudioLogic.wordVoice(accent), rate, object : SpeakListener { override fun onEnd() = done(); override fun onFail() = done() })
    }
    fun stopSpeaking() = vocab.audio.stop()
    /** Starts the recogniser (the caller has RECORD_AUDIO); results arrive as alternatives, best first. */
    fun listen(lang: String, onPartial: (String) -> Unit, onResult: (List<String>) -> Unit, onError: (String) -> Unit) = speech.start(lang, onPartial, onResult, onError)
    fun stopListening() = speech.stop()
    val canListen: Boolean get() = speech.available

    // ---------- Lexkite AI proxy (/api/ai, kind "rp") ----------
    private suspend fun deviceId(): String = kvStr("lk.dev") ?: java.util.UUID.randomUUID().toString().also { putKv("lk.dev", JsonPrimitive(it)) }
    suspend fun ai(task: String, rp: JsonObject, prompt: String): AiResult {
        val headers = LinkedHashMap<String, String>(); headers["Content-Type"] = "application/json"; headers["X-Lexkite-Device"] = deviceId()
        runCatching { idToken() }.getOrNull()?.let { headers["Authorization"] = "Bearer $it" }
        val body = JsonObject(mapOf("prompt" to JsonPrimitive(prompt), "task" to JsonPrimitive(task), "rp" to rp, "kind" to JsonPrimitive("rp"))).toString().toByteArray()
        val r = runCatching { vocab.http.send(Http.Req("POST", AI_URL, headers, body)) }.getOrNull() ?: return AiResult.Failed
        val j = runCatching { Json.parseToJsonElement(r.text) as? JsonObject }.getOrNull()
        if (r.status == 429) return AiResult.Quota(j)
        val out = j?.get("out") as? JsonObject
        return if (r.ok && out != null) AiResult.Ok(out) else AiResult.Failed
    }

    companion object {
        const val CALL_URL = "https://lexkite.com/data/call-pack.json"; const val PACK_URL = "https://lexkite.com/data/speak-pack.json"; const val READTESTS_URL = "https://lexkite.com/data/readtests-pack.json"; const val SAY_URL = "https://lexkite.com/data/say.json"; const val AI_URL = "https://lexkite.com/api/ai"
        const val SITE = "https://lexkite.com/"

        /** A downloaded JSON text with a disk cache: a good download replaces the cache, a failed one falls back to it, then to [starter]. */
        suspend fun <T> fetchCached(http: Http, cacheDir: File, name: String, url: String, starter: () -> String? = { null }, parse: (String) -> T?): T? {
            val f = File(cacheDir, name)
            val r = runCatching { http.send(Http.Req("GET", url)) }.getOrNull()
            val fresh = if (r != null && r.ok) parse(r.text)?.also { runCatching { f.parentFile?.mkdirs(); f.writeText(r.text) } } else null
            return fresh ?: (if (f.exists()) runCatching { f.readText() }.getOrNull()?.let(parse) else null) ?: runCatching { starter() }.getOrNull()?.let(parse)
        }
        /** Text of a web file (`cpack/speak/s/<id>.js`, `js/speak/data.js`) with the same cache; null when neither the network nor the cache has it. */
        suspend fun fetchText(http: Http, cacheDir: File, rel: String): String? = fetchCached(http, cacheDir, "web-" + rel.replace('/', '-'), SITE + rel) { it }
        fun quotaText(body: JsonObject?, now: Long, fmt: (Long, Boolean) -> String): List<com.lexkite.app.core.speak.Tr> {
            val reset = (body?.get("resetAt") as? JsonPrimitive)?.content?.toDoubleOrNull()?.toLong() ?: (body?.get("resetAt") as? JsonPrimitive)?.content?.let { runCatching { java.time.Instant.parse(it).toEpochMilli() }.getOrNull() }
            val daily = (body?.get("msg") as? JsonPrimitive)?.content == "quota.daily"
            val first = if (daily && reset != null) com.lexkite.app.core.speak.Tr("Đã hết lượt miễn phí hôm nay – mở lại lúc {time}.", mapOf("time" to fmt(reset, reset - now > 86_400_000L))) else com.lexkite.app.core.speak.Tr("Máy chủ đang bận – thử lại sau ít phút.")
            return if (Js.truthy(body?.get("signIn"))) listOf(first, com.lexkite.app.core.speak.Tr("Đăng nhập để có thêm lượt.")) else listOf(first)
        }
    }
}
