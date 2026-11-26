package com.lexkite.app.feature.skills

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.RewardRules
import com.lexkite.app.core.skills.WordPopup
import com.lexkite.app.core.skills.WordPort
import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.watch.WApi
import com.lexkite.app.core.watch.WFilters
import com.lexkite.app.core.watch.WHist
import com.lexkite.app.core.watch.WItem
import com.lexkite.app.core.watch.WNote
import com.lexkite.app.core.watch.WTopic
import com.lexkite.app.core.watch.WTopics
import com.lexkite.app.core.watch.Watch
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlin.math.max

// ---------------------------------------------------------------- env helpers (device-only storage = the web's localStorage wt.*, never synced; server = /api/watch)
private val histLock = Mutex()
private fun p(s: String) = JsonPrimitive(s)
private fun JsonObject?.str(k: String) = (this?.get(k) as? JsonPrimitive)?.takeIf { it.isString }?.content.orEmpty()
private fun JsonObject.num(k: String) = (this[k] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 0.0

internal suspend fun SkillsEnv.wtGet(k: String): JsonElement? = kv("wt.$k")?.let { runCatching { Json.parseToJsonElement(it) }.getOrNull() }
internal suspend fun SkillsEnv.wtPut(k: String, v: JsonElement) = putKv("wt.$k", v.toString())

/** The bundled topics (content-pack/watch-topics.json); null = missing / invalid (the hub then only offers search). */
internal suspend fun SkillsEnv.watchTopics(): WTopics? = withContext(Dispatchers.IO) { runCatching { asset("content-pack/watch-topics.json")?.let { WTopics.parse(Json.parseToJsonElement(it) as JsonObject) } }.getOrNull() }

/** The bundled player page (content-pack/watch-player.html). */
internal fun SkillsEnv.watchPlayerHtml(): String? = runCatching { asset("content-pack/watch-player.html") }.getOrNull()

/** GET https://lexkite.com/api/watch?op=…: a failed request = offline, a bad status = no items (like web get()). */
internal suspend fun SkillsEnv.watchGet(op: String, params: Map<String, String>): WApi =
    try { val r = vocab.http.send(Http.Req("GET", Watch.apiUrl(op, params))); if (r.ok) Watch.parseApi(r.text) else WApi() }
    catch (e: CancellationException) { throw e }
    catch (e: Exception) { WApi(offline = true) }

private suspend fun SkillsEnv.rememberHist(e: WHist) = histLock.withLock { wtPut("h", Watch.histJson(Watch.pushHist(Watch.histOf(wtGet("h")), e))) }

// ---------------------------------------------------------------- #/watch hub
/** A search / topic result block: [items] null = loading (skeleton), [yt] = the "open on YouTube" fallback link. [label] is a Vietnamese source key for a topic, the typed text otherwise. */
data class WRun(val label: String, val topic: WTopic?, val items: List<WItem>?, val offline: Boolean = false, val yt: String = "")
data class WatchHubUi(val x: WTopics? = null, val f: WFilters = WFilters(), val auto: Int = 2, val hist: List<WHist> = emptyList(), val forYou: List<WTopic> = emptyList(), val run: WRun? = null)

class WatchHubVm(private val env: SkillsEnv, private val q: Map<String, String>) : ViewModel() {
    var ui by mutableStateOf(WatchHubUi()); private set
    private var seq = 0; private var last: Triple<String, String, WTopic?>? = null
    private var placement: JsonObject? = null; private var goal = "general"; private var deck = emptySet<String>(); private var hist = emptyList<WHist>()

    init { viewModelScope.launch {
        val x = env.watchTopics()
        val d = env.vocab.store.doc(); val st = d.settings as? JsonObject
        placement = st?.get("placement") as? JsonObject; goal = st.str("exam").ifEmpty { "general" }; deck = d.cards.keys
        hist = Watch.histOf(env.wtGet("h"))
        refresh(x, Watch.filtersOf(env.wtGet("f")))
        val tp = q["topic"]?.let { x?.topic(it) }
        if (tp != null) run(tp.q[0], tp.name, tp) else q["q"]?.takeIf { it.isNotBlank() }?.let { run(it, it, null) }
    } }

    private fun refresh(x: WTopics?, f: WFilters) { ui = ui.copy(x = x, f = f, auto = Watch.myLevel(placement, x?.levels ?: ui.x?.levels ?: listOf("A1", "A2", "B1", "B2", "C1", "C2")), hist = hist.take(8), forYou = if (x == null) emptyList() else Watch.forYou(x, goal, placement, deck, f.lv, hist)) }

    fun filters(f: WFilters) { refresh(ui.x, f); viewModelScope.launch { env.wtPut("f", Watch.filtersJson(f)) }; last?.let { run(it.first, it.second, it.third) } }
    fun topic(id: String) { ui.x?.topic(id)?.let { run(it.q[0], it.name, it) } }
    /** A query chip of the open topic. */
    fun query(text: String) = run(text, text, last?.third)
    fun close() { seq++; last = null; ui = ui.copy(run = null) }
    /** The search box: a YouTube link / id opens the player at once, anything else runs a search. */
    fun find(text: String, open: (String) -> Unit) { val v = text.trim(); if (v.isEmpty()) return; val y = Watch.ytParse(v); if (y != null) open(route(y.id, y.t)) else run(v, v, null) }
    /** A card tap: remembers its title / channel / topic for the player (web wt.pick), then opens it. */
    fun pick(id: String, title: String, ch: String, topic: String, open: (String) -> Unit) {
        viewModelScope.launch { env.wtPut("pick", JsonObject(mapOf("id" to p(id), "title" to p(title), "ch" to p(ch), "topic" to p(topic)))); open(route(id, 0)) }
    }
    val topicOfRun: String get() = last?.third?.id.orEmpty()

    private fun run(base: String, label: String, topic: WTopic?) {
        val x = ui.x ?: return; val f = ui.f; val my = ++seq
        last = Triple(base, label, topic)
        val query = Watch.buildQ(x, base, f, placement)
        ui = ui.copy(run = WRun(label, topic, null, yt = Watch.searchUrl(query)))
        viewModelScope.launch {
            val s = async { env.watchGet("search", mapOf("q" to query, "dur" to f.dur, "cc" to if (f.cc) "1" else "")) }
            val fd = async { if (topic != null && topic.ch.isNotEmpty()) env.watchGet("feed", mapOf("ch" to topic.ch.joinToString(","))) else WApi() }
            val sr = s.await(); val fr = fd.await()
            if (my == seq) ui = ui.copy(run = WRun(label, topic, Watch.merge(sr.items, fr.items, topic, f.dur), sr.offline, sr.fallback ?: Watch.searchUrl(query)))
        }
    }

    class Factory(private val env: SkillsEnv, private val q: Map<String, String>) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = WatchHubVm(env, q) as T }
    companion object { fun route(id: String, t: Int) = "watch/$id" + (if (t > 0) "?t=$t" else "") }
}

// ---------------------------------------------------------------- #/watch/<id> player
/** The dictionary result under the "Look up & save word" form. */
data class WatchWordUi(val word: String, val entry: JsonObject? = null, val translation: String = "", val inDeck: Boolean = false, val loading: Boolean = false, val done: Boolean = false, val at: Int = 0)

data class WatchPlayerUi(
    val id: String, val loaded: Boolean = false, val title: String = "", val ch: String = "", val start: Int = 0, val ready: Boolean = false, val playing: Boolean = false, val rate: Double = 1.0,
    val a: Double? = null, val b: Double? = null, val loop: Boolean = false, val failed: Boolean = false, val hint: Boolean = false,
    val word: String = "", val sentence: String = "", val lookup: WatchWordUi? = null, val note: String = "", val notes: List<WNote> = emptyList(), val ytAt: Int = 0,
)

class WatchPlayerVm(private val env: SkillsEnv, private val id: String, private val startQ: Int) : ViewModel() {
    var ui by mutableStateOf(WatchPlayerUi(id)); private set
    /** Set by the WebView: evaluates a `lk.cmd({...})` script in the player page. */
    var send: ((String) -> Unit)? = null
    private var pos = 0.0; private var len = 0.0; private var lastSave = 0.0; private var topic = ""
    private var port: WordPort? = null; private var hintJob: Job? = null

    init { viewModelScope.launch {
        val pick = (env.wtGet("pick") as? JsonObject)?.takeIf { it.str("id") == id }
        val prev = Watch.histOf(env.wtGet("h")).firstOrNull { it.id == id }
        topic = pick.str("topic").ifEmpty { prev?.topic.orEmpty() }
        val start = if (startQ > 0) startQ else Watch.resumeAt(prev)
        ui = ui.copy(loaded = true, start = start, ytAt = start, title = pick.str("title").ifEmpty { prev?.title.orEmpty() }, ch = pick.str("ch").ifEmpty { prev?.ch.orEmpty() }, notes = Watch.notesOf(env.wtGet("n.$id")))
        port = env.port()
        remember()
        if (ui.title.isEmpty()) { val d = env.watchGet("info", mapOf("id" to id)); if (d.title.isNotEmpty()) { ui = ui.copy(title = d.title, ch = d.ch); remember() } else if (d.embeddable == false) ui = ui.copy(failed = true) }
    } }

    /** Saves the position into "continue watching" (also on pause / leave). */
    private fun remember() {
        val u = ui; val at = pos.toInt()
        if (at == 0 && u.title.isEmpty()) return
        val e = WHist(id, u.title, u.ch, topic, at, len.toInt(), System.currentTimeMillis()); lastSave = pos
        ui = u.copy(ytAt = at)
        env.background { env.rememberHist(e) }
    }

    /** One JSON string of the player page (see watch-player.html): ready / state / time / error. */
    fun onBridge(s: String) { viewModelScope.launch { handle(s) } }
    private fun handle(s: String) {
        val o = runCatching { Json.parseToJsonElement(s) as? JsonObject }.getOrNull() ?: return
        when (o.str("e")) {
            "ready" -> { len = o.num("len"); ui = ui.copy(ready = true) }
            "state" -> { val st = o.num("s").toInt(); ui = ui.copy(playing = st == 1); if (st != 1) remember(); if (st == 0) env.background { env.word.reward(emptyMap(), RewardRules.xp("step")) } }
            "time" -> time(o.num("t"))
            "error" -> ui = ui.copy(failed = true)
        }
    }
    private fun time(t: Double) {
        pos = t
        val u = ui
        if (u.loop && u.a != null && u.b != null && t >= u.b) seek(u.a)
        if (u.playing && (t - lastSave >= 5 || t < lastSave)) remember()
    }

    private fun cmd(js: String) { send?.invoke("lk.cmd($js)") }
    fun playPause() = cmd("{op:'${if (ui.playing) "pause" else "play"}'}")
    private fun seek(t: Double) { pos = t; cmd("{op:'seek',t:$t}") }
    fun back5() = seek(max(0.0, pos - 5))
    fun seekTo(t: Int) = seek(t.toDouble())
    fun rate(r: Double) { ui = ui.copy(rate = r); cmd("{op:'rate',r:$r}") }
    /** The WebView was destroyed (screen left): a new one resumes where this one stopped. */
    fun detached() { ui = ui.copy(ready = false, playing = false, start = if (pos > 0) pos.toInt() else ui.start) }
    /** Leaving the screen: no background play. */
    fun pause() { cmd("{op:'pause'}"); remember() }

    fun markA() { val a = pos; ui = ui.copy(a = a, b = ui.b?.takeIf { it > a }) }
    fun markB() {
        val x = pos; val a = ui.a ?: max(0.0, x - 5)
        if (x > a + 0.5) { ui = ui.copy(a = a, b = x, loop = true); seek(a) } else ui = ui.copy(a = a)
    }
    fun toggleLoop() {
        if (ui.a == null || ui.b == null) { ui = ui.copy(hint = true); hintJob?.cancel(); hintJob = viewModelScope.launch { delay(6000); ui = ui.copy(hint = false) }; return }
        ui = ui.copy(loop = !ui.loop, hint = false)
    }

    // ---- Look up & save a word (dictionary + flashcards of the app) ----
    fun word(v: String) { ui = ui.copy(word = v) }
    fun sentence(v: String) { ui = ui.copy(sentence = v) }
    fun lookup() {
        val w = ui.word.trim().lowercase(); val pt = port ?: return; if (w.isEmpty()) return
        val at = pos.toInt(); ui = ui.copy(lookup = WatchWordUi(w, loading = true, at = at))
        viewModelScope.launch { val o = WordPopup.open(pt, w); ui = ui.copy(lookup = WatchWordUi(w, o.entry, o.translation, o.saved, at = at)) }
    }
    fun saveWord() {
        val l = ui.lookup ?: return; val e = l.entry ?: return; val pt = port ?: return; val s = ui.sentence.trim()
        val ctx = if (s.isEmpty()) null else JsonObject(mapOf("text" to p(s), "title" to p(Watch.contextTitle(ui.title, l.at, "YouTube")), "source" to p(Watch.ytUrl(id, l.at))))
        viewModelScope.launch { pt.addWord(e, ctx, false); ui = ui.copy(lookup = l.copy(done = true, inDeck = true), word = "", sentence = "") }
    }
    fun speakWord() { val w = ui.lookup?.entry?.str("word").orEmpty().ifEmpty { return }; viewModelScope.launch { env.word.speakWord(w, env.word.region()) } }

    // ---- Time notes (device only) ----
    fun note(v: String) { ui = ui.copy(note = v) }
    fun addNote() { val v = ui.note.trim(); if (v.isEmpty()) return; val n = Watch.addNote(ui.notes, pos.toInt(), v); ui = ui.copy(notes = n, note = ""); saveNotes(n) }
    fun delNote(i: Int) { val n = Watch.delNote(ui.notes, i); ui = ui.copy(notes = n); saveNotes(n) }
    private fun saveNotes(n: List<WNote>) { viewModelScope.launch { env.wtPut("n.$id", Watch.notesJson(n)) } }

    override fun onCleared() { send = null; remember() }

    class Factory(private val env: SkillsEnv, private val id: String, private val start: Int) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = WatchPlayerVm(env, id, start) as T }
}
