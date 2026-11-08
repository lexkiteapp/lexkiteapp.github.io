package com.lexkite.app.feature.vocab

import com.lexkite.app.core.audio.LkAudio
import com.lexkite.app.core.data.LexStore
import com.lexkite.app.core.dict.Dict
import com.lexkite.app.core.dict.DictCfg
import com.lexkite.app.core.dict.DictPage
import com.lexkite.app.core.dict.DictStore
import com.lexkite.app.core.dict.HttpDictNet
import com.lexkite.app.core.dict.HttpLexSource
import com.lexkite.app.core.dict.Lex
import com.lexkite.app.core.dict.LexSource
import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.usage.Usage
import com.lexkite.app.core.verbs.VerbData
import com.lexkite.app.core.vocab.CardMath
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import com.lexkite.app.core.verbs.Verbs
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.WordBook
import com.lexkite.app.core.write.Lemmatizer
import com.lexkite.app.core.write.Models
import com.lexkite.app.core.write.WritingData
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * Everything the vocabulary / writing screens need from the app, behind one object: the learner's cards (one store, same document as sync),
 * the small key-value lists the web keeps in localStorage (recent, letter drafts, practice progress), the voice channel, and the
 * lazily loaded data sets (dictionary over the network, verb table from the bundled asset, usage + writing content from the web scripts).
 * Network is injected ([http]); nothing here touches Android classes except through the injected [asset] reader.
 */
class WordEnv(
    private val store: LexStore,
    private val audio: LkAudio,
    private val http: Http,
    /** Reads a bundled asset (e.g. "verbs.json"). */
    private val asset: (String) -> String,
    val uiLang: String,
    private val lexSource: LexSource = HttpLexSource(http),
    private val base: String = "https://lexkite.com",
    /** The word library index (web IELTS_DATA.INDEX) when the app has it; empty = grammar "planted errors" fall back to choosing the right form. */
    private val wordIndex: suspend () -> Map<String, JsonObject> = { emptyMap() },
    private val clock: () -> Long = System::currentTimeMillis,
    /** Words of the dictionary credit / notes text keyed by the web's Vietnamese source strings. */
    private val tx: Tx = Tx.RAW,
) {
    val learnLang: String get() = uiLang
    val meanLang: String get() = if (uiLang == "vi") "vi" else "en"

    // ---------- settings ----------
    suspend fun setting(k: String): String = (store.doc().settings as? JsonObject).jstr(k)
    suspend fun exam(): String = setting("exam")
    /** UK / US from the learner's accent setting (default UK like the web). */
    suspend fun region(): String = if (Regex("US|us", RegexOption.IGNORE_CASE).containsMatchIn(setting("accent")) && !setting("accent").contains("GB", true)) "US" else "UK"
    suspend fun autoSpeak(): Boolean = setting("autoSpeak").let { it == "true" || it == "1" }

    // ---------- cards ----------
    suspend fun cards(): Map<String, JsonObject> = store.doc().cards
    /** Adds a word; a single new word (not [silent]) is enriched in the background (IPA, audio, definition, image, sentences) like app.js `enrichLater`. */
    suspend fun addWord(entry: JsonObject, context: JsonObject?, silent: Boolean = false) {
        val key = CardMath.keyOf(entry.jstr("word"))
        val isNew = !store.doc().cards.containsKey(key)
        store.mutate { d -> val st = WordBook.add(WordBook.Store(d.cards, d.deleted), entry, context, clock()); d.copy(cards = st.cards, deleted = st.deleted) }
        if (isNew && !silent) enrichLater(key)
    }

    private val enrichScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val enrichLock = Mutex()
    private val ENRICH = listOf("ipa", "ipaUS", "audio", "def", "ex", "vi", "image")
    /** One word at a time: look it up and fill what the card lacks (never overwrites); offline or unknown = nothing. */
    private fun enrichLater(key: String) {
        enrichScope.launch {
            enrichLock.withLock {
                val c = store.doc().cards[key] ?: return@withLock
                if (c.jstr("tl").let { it.isNotEmpty() && it != "en" }) return@withLock
                val e = runCatching { dict().lookup(key, image = c.jstr("pos") == "n" && c.jstr("image").isEmpty(), examples = (c["sentences"] as? JsonArray).isNullOrEmpty()) }.getOrNull() ?: return@withLock
                if (e["found"] == JsonPrimitive(false)) return@withLock
                store.mutate { d ->
                    val cur = d.cards[key] ?: return@mutate d
                    var o = cur
                    if (o.jstr("image").isEmpty() && e.jstr("image").isNotEmpty()) o = o.with("imageCredit" to (e["imageCredit"] ?: kotlinx.serialization.json.JsonNull))
                    for (k in ENRICH) if (o.jstr(k).isEmpty() && e.jstr(k).isNotEmpty()) o = o.with(k to e[k])
                    if ((o["sentences"] as? JsonArray).isNullOrEmpty() && e["sentences"] is JsonArray) o = o.with("sentences" to JsonArray((e["sentences"] as JsonArray).take(2)))
                    d.copy(cards = d.cards + (key to o))
                }
            }
        }
    }
    /** Applies a pure WordBook transformation (saveChunk / saveAll / addStarter …). */
    suspend fun updateBook(fn: (WordBook.Store) -> WordBook.Store) {
        store.mutate { d -> val st = fn(WordBook.Store(d.cards, d.deleted)); d.copy(cards = st.cards, deleted = st.deleted) }
    }
    suspend fun book(): WordBook.Store = store.doc().let { WordBook.Store(it.cards, it.deleted) }

    // ---------- key-value lists (web Store) ----------
    suspend fun kv(k: String): JsonElement? = store.get(k)
    suspend fun putKv(k: String, v: JsonElement?) = store.put(mapOf(k to v))
    suspend fun recent(): List<String> = (kv("recent") as? JsonArray)?.map { it.js() } ?: emptyList()
    suspend fun putRecent(list: List<String>) = putKv("recent", JsonArray(list.map { JsonPrimitive(it) }))
    suspend fun drafts(): JsonObject = (kv("letterDrafts") as? JsonObject) ?: JsonObject(emptyMap())
    suspend fun putDraft(id: String, text: String) { val cur = LinkedHashMap(drafts()); cur[id] = JsonPrimitive(text); putKv("letterDrafts", JsonObject(cur)) }
    suspend fun modelDone(id: String): List<String> = (kv("mdone:$id") as? JsonArray)?.map { it.js() } ?: emptyList()
    suspend fun putModelDone(id: String, kinds: List<String>) = putKv("mdone:$id", JsonArray(kinds.map { JsonPrimitive(it) }))

    // ---------- "Hiểu sâu" notes (js/notes/<letter>.json) ----------
    private val noteFiles = HashMap<String, JsonObject>()
    /** The note object {m, e, u, f} of a word, or null (no note, or offline without a cached file). One file per first letter, kept for the session. */
    suspend fun deepNote(word: String): JsonObject? {
        val w = word.lowercase(); val f = com.lexkite.app.core.dict.DeepNotes.file(w)
        val file = lock.withLock { noteFiles[f] } ?: run {
            val txt = script("js/notes/$f.json")
            val parsed = runCatching { kotlinx.serialization.json.Json.parseToJsonElement(txt) as? JsonObject }.getOrNull() ?: return null
            lock.withLock { noteFiles[f] = parsed }; parsed
        }
        return file[w] as? JsonObject
    }

    // ---------- game ----------
    private val lookedUp = HashSet<String>()
    /** App.reward({lookups: 1}) once per word per day (dict-page.js): the day counter and the lifetime total of the game document. */
    suspend fun rewardLookup(word: String) {
        val now = clock()
        if (!DictPage.rewardOnce(lookedUp, now, word)) return
        store.mutate { d -> d.copy(game = StudyReward.track(d.game, mapOf("lookups" to 1), 0, now)) }
    }

    // ---------- voice ----------
    fun speakWord(word: String, region: String, slow: Boolean = false) = audio.speakWord(word, if (region == "US") "en-US" else "en-GB", slow)
    fun speak(text: String, slow: Boolean = false, who: String = "ama") = audio.speak(text, who, if (slow) 0.7f else 0.95f)
    fun stopAudio() = audio.stop()

    // ---------- data sets ----------
    private val lock = Mutex()
    private var dictV: Dict? = null; private var verbsV: Verbs? = null; private var usageV: Usage? = null; private var writingV: WritingData? = null

    private val dictStore = object : DictStore {
        override suspend fun get(key: String): JsonElement? = store.get(key)
        override suspend fun put(key: String, value: JsonElement) = store.put(mapOf(key to value))
        override suspend fun remove(key: String) = store.put(mapOf(key to null))
    }

    private val lexV by lazy { Lex(lexSource) }
    fun lex(): Lex = lexV
    /** Already-loaded usage table (null until the first [usage] call finished) – lets a screen show "usage" links without waiting. */
    fun usageCached(): Usage? = usageV

    suspend fun dict(): Dict {
        val idx = index(); val typo = verbData().viTypo
        return lock.withLock { dictV ?: Dict(HttpDictNet(http), lex(), idx, DictCfg(meanLang, learnLang, base, tx, viTypo = typo), dictStore, clock).also { dictV = it } }
    }
    private var verbDataV: VerbData? = null
    private var lemmaV: Lemmatizer? = null
    private fun vd(): VerbData = verbDataV ?: VerbData.parse(asset("verbs.json")).also { verbDataV = it }
    suspend fun verbData(): VerbData = lock.withLock { vd() }
    suspend fun verbs(): Verbs = lock.withLock { verbsV ?: Verbs(vd()).also { verbsV = it } }
    /** phrases.js `App.lemma`: tables from verbs.json; a word counts as known when it occurs anywhere in the model answers (no word index in this module). */
    suspend fun index(): Map<String, JsonObject> = runCatching { wordIndex() }.getOrDefault(emptyMap())
    suspend fun lemmatizer(): Lemmatizer {
        val d = verbData(); val w = writing(); val idx = index()
        return lock.withLock {
            lemmaV ?: run {
                val known = HashSet<String>()
                for (m in w.models) for (x in Regex("[A-Za-z]+").findAll(Models.plain(m.jstr("text")))) known.add(x.value.lowercase())
                Lemmatizer(d.lemma) { it in known || idx.containsKey(it) }.also { lemmaV = it }
            }
        }
    }

    private suspend fun script(path: String): String = runCatching { http.send(Http.Req("GET", "$base/$path")).let { if (it.ok) it.text else "" } }.getOrDefault("")

    /** Usage data = the line-DSL scripts of the web (7 files) + the word index. Empty when offline and never cached. */
    suspend fun usage(): Usage {
        val v = verbs()
        return lock.withLock {
            usageV ?: run {
                val files = USAGE_FILES.map { script("js/usage/$it") }
                Usage.fromScripts(files, script("js/usage-index.js").ifEmpty { "LK_USAGE_IDX = {};" }, v).also { if (files.any { it.isNotEmpty() }) usageV = it }
            }
        }
    }

    /** Ideas, letters, paraphrase pairs, annotated models, prompts, Task 1 sets: the writing scripts of the web, read as data. */
    suspend fun writing(): WritingData = lock.withLock {
        writingV ?: run {
            val m = listOf("js/models.js", "cpack/write/models2.js", "cpack/write/models3.js", "cpack/write/models4.js", "cpack/write/models5.js", "js/write/gt-letters.js", "cpack/write/task2-more.js", "js/write/task1-more.js", "js/write/task1-more2.js").map { script(it) }
            val w = WritingData.fromScripts(
                script("cpack/write/ideas.js"), script("js/lib/paraphrase-data.js"), m, script("js/write.js"), listOf(script("cpack/write/task2-more.js")),
                script("js/task1.js"), listOf(script("js/write/task1-more.js"), script("js/write/task1-more2.js")),
            )
            if (w.models.isNotEmpty() || w.ideas.isNotEmpty()) writingV = w
            w
        }
    }

    companion object {
        val USAGE_FILES = listOf("adv.js", "pair.js", "prep-adj.js", "prep-noun.js", "prep-verb.js", "struct.js", "verb.js")
    }
}
