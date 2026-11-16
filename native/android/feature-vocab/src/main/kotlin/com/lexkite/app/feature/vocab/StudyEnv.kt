package com.lexkite.app.feature.vocab

import com.lexkite.app.core.audio.LkAudio
import com.lexkite.app.core.audio.SpeakListener
import com.lexkite.app.core.data.LexStore
import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.WebWords
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.File

// ---- small JSON helpers (the ones in :core are internal) ----
internal fun JsonElement?.vs(): String = when (this) { null, is JsonNull -> ""; is JsonPrimitive -> content; else -> "" }
internal fun JsonObject?.gs(k: String): String = this?.get(k).vs()
internal fun JsonObject?.gn(k: String, d: Double = 0.0): Double { val e = this?.get(k); return if (e == null || e is JsonNull) d else Js.num(e).let { if (it.isNaN()) d else it } }
internal fun JsonObject?.ga(k: String): List<JsonElement> = (this?.get(k) as? JsonArray) ?: emptyList()
internal fun JsonObject?.go(k: String): JsonObject? = this?.get(k) as? JsonObject
internal fun JsonObject?.gt(k: String): Boolean = Js.truthy(this?.get(k))

internal fun je(x: Any?): JsonElement = when (x) {
    null -> JsonNull
    is JsonElement -> x
    is Boolean -> JsonPrimitive(x)
    is Int -> JsonPrimitive(x)
    is Long -> JsonPrimitive(x)
    is Double -> Js.number(x)
    is Number -> Js.number(x.toDouble())
    is String -> JsonPrimitive(x)
    is Collection<*> -> JsonArray(x.map { je(it) })
    is Map<*, *> -> JsonObject(x.entries.associate { it.key.toString() to je(it.value) })
    else -> JsonPrimitive(x.toString())
}
internal fun obj(vararg p: Pair<String, Any?>): JsonObject = JsonObject(LinkedHashMap<String, JsonElement>().also { m -> for ((k, v) in p) m[k] = je(v) })
internal fun JsonObject.with(vararg p: Pair<String, Any?>): JsonObject = JsonObject(LinkedHashMap(this).also { m -> for ((k, v) in p) m[k] = je(v) })
internal fun JsonObject.without(vararg k: String): JsonObject = JsonObject(LinkedHashMap(this).also { m -> k.forEach { m.remove(it) } })

/**
 * Everything the vocabulary screens need from the app graph (small manual DI, like [com.lexkite.app.feature.lesson.LessonEnv]).
 * [tx] turns the web's Vietnamese source strings (practice sources, library names) into the UI language; [words] is the web word library
 * (cached download, null while offline without a cache); [ai] answers a prompt with text (memory aids), null = no AI available (the AI entries stay hidden, M6).
 */
class VocabEnv(
    val store: LexStore, val audio: LkAudio, val http: Http, val cacheDir: File,
    val tx: Tx = Tx.RAW, val now: () -> Long = System::currentTimeMillis,
    val words: suspend () -> WebWords? = { null },
    val imageUrl: (String, String) -> String? = { _, _ -> null },
    val ai: (suspend (String) -> String?)? = null,
) {
    /** One consistent read of everything a screen starts from. */
    class Loaded(val doc: SyncDoc, val mistakes: List<JsonObject>, val seen: Map<String, Long>) {
        val cards: Map<String, JsonObject> get() = doc.cards
        val settings: JsonObject get() = (doc.settings as? JsonObject) ?: JsonObject(emptyMap())
        val stats: JsonObject? get() = doc.stats as? JsonObject
        val game: JsonElement? get() = doc.game
        val accent: String get() = settings.gs("accent").let { if (it == "en-GB") it else "en-US" }
    }

    suspend fun load(): Loaded {
        val doc = store.doc()
        val seen = (store.get(K_SEEN) as? JsonObject)?.entries?.associate { it.key to Js.num(it.value).toLong() } ?: emptyMap()
        val mist = ((store.get(LexStore.K_MISTAKES) as? JsonArray) ?: JsonArray(emptyList())).mapNotNull { it as? JsonObject }
        return Loaded(doc, mist, seen)
    }
    suspend fun saveMistakes(list: List<JsonObject>) = store.put(mapOf(LexStore.K_MISTAKES to JsonArray(list)), local = false)
    suspend fun saveSeen(seen: Map<String, Long>) = store.put(mapOf(K_SEEN to JsonObject(seen.mapValues { JsonPrimitive(it.value) })), local = false)

    /** Write changed cards / removed keys / stats / game in one transaction (the sync scheduler is told). */
    suspend fun write(changed: Map<String, JsonObject> = emptyMap(), removed: Collection<String> = emptyList(), deleted: Map<String, JsonElement>? = null, stats: JsonElement? = null, game: JsonElement? = null) {
        store.mutate { d ->
            val cards = LinkedHashMap(d.cards); removed.forEach { cards.remove(it) }; cards.putAll(changed)
            d.copy(cards = cards, deleted = deleted ?: d.deleted, stats = stats ?: d.stats, game = game ?: d.game)
        }
    }

    fun sayWord(word: String, accent: String = "en-US", slow: Boolean = false, done: () -> Unit = {}) {
        audio.speakWord(word, accent, slow, object : SpeakListener { override fun onEnd() = done(); override fun onFail() = done() })
    }
    fun sayText(text: String, done: () -> Unit = {}) {
        audio.speak(text, "ama", 0.95f, object : SpeakListener { override fun onEnd() = done(); override fun onFail() = done() })
    }

    companion object { const val K_SEEN = "lk.newSeen" }
}

/** "game" totals for a finished activity: mirrors LessonWriter.reward (day counters, lifetime totals only for keys that exist, xp). */
object StudyReward {
    fun track(game: JsonElement?, add: Map<String, Int>, xp: Int, now: Long): JsonElement {
        val g = Js.spread(game); val days = Js.spread(g["days"]); val k = CardMath.todayKey(now); val d = Js.spread(days[k]); val total = Js.spread(g["total"])
        fun num(e: JsonElement?) = Js.num(e).let { if (it.isNaN()) 0.0 else it }
        for ((m, v) in add) { if (v == 0) continue; d[m] = Js.number(num(d[m]) + v); if (total.containsKey(m)) total[m] = Js.number(num(total[m]) + v) }
        d["xp"] = Js.number(num(d["xp"]) + xp)
        days[k] = JsonObject(d); g["days"] = JsonObject(days); g["total"] = JsonObject(total)
        g["xp"] = Js.number(num(g["xp"]) + xp)
        return JsonObject(g)
    }
    /** game.best.match = fastest time (seconds). */
    fun bestMatch(game: JsonElement?, seconds: Double): JsonElement {
        val g = Js.spread(game); val best = Js.spread(g["best"])
        val cur = Js.num(best["match"])
        if (cur.isNaN() || cur <= 0.0 || seconds < cur) best["match"] = Js.number(seconds)
        g["best"] = JsonObject(best)
        return JsonObject(g)
    }
}

/** The web word library (IELTS_DATA topics + groups): the same scripts the web loads, cached on disk; offline falls back to the cache. */
object StudyWords {
    private val LIBS = listOf("topics-more", "skills", "awl", "ngsl", "ngsl2", "office", "tsl-a", "tsl-b", "domain-a", "domain-b", "exam-vocab", "exam-vocab2", "exam-vocab3", "nawl", "bsl")
    @Volatile private var memo: WebWords? = null

    suspend fun load(http: Http, cacheDir: File, base: String = "https://lexkite.com/js/"): WebWords? {
        memo?.let { return it }
        val data = fetch(http, base + "data.js", File(cacheDir, "words/data.js")) ?: return null
        val libs = LIBS.mapNotNull { fetch(http, base + "lib/$it.js", File(cacheDir, "words/$it.js")) }
        return WebWords.fromScripts(data, libs).also { memo = it }
    }

    private suspend fun fetch(http: Http, url: String, file: File): String? = withContext(Dispatchers.IO) {
        val r = withTimeoutOrNull(8000) { runCatching { http.send(Http.Req("GET", url)) }.getOrNull() }
        if (r != null && r.ok) { runCatching { file.parentFile?.mkdirs(); file.writeBytes(r.body) }; r.text }
        else if (file.exists()) runCatching { file.readText() }.getOrNull() else null
    }
}

/**
 * The web keys its UI text by the Vietnamese source string; the native strings are keyed by id. This maps a Vietnamese key to the id whose
 * Vietnamese text is that key and renders it in the UI language; every key the code passes has an id (strings.json).
 */
object StudyTx {
    fun of(cur: L10n, vi: L10n): Tx {
        val rev = HashMap<String, L10nKey>()
        for (k in L10nKey.entries) if (vi.has(k)) rev.putIfAbsent(vi(k), k)
        return Tx { key, vars -> val k = rev[key]; if (k != null) cur(k, vars.orEmpty()) else Tx.RAW.t(key, vars) }
    }
}
