package com.lexkite.app.feature.lesson

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.core.audio.LkAudio
import com.lexkite.app.core.audio.Segment
import com.lexkite.app.core.audio.SpeakListener
import com.lexkite.app.core.data.LexStore
import com.lexkite.app.core.lesson.LessonData
import com.lexkite.app.core.lesson.LessonEngine
import com.lexkite.app.core.lesson.LessonWriter
import com.lexkite.app.core.lesson.Off
import com.lexkite.app.core.lesson.Pick
import com.lexkite.app.core.lesson.Speaking
import com.lexkite.app.core.rig.TeacherMood
import com.lexkite.app.core.rig.TeacherSignal
import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.StarterDeck
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.File

/** Everything the lesson needs from the app graph (small manual DI, like the rest of the app). */
class LessonEnv(
    val store: LexStore, val audio: LkAudio, val http: Http, val cacheDir: File, val starterPack: StarterDeck.Pack?, val uiLang: String,
    val poseEmo: Map<String, String> = emptyMap(), val now: () -> Long = System::currentTimeMillis,
    /** Illustration for word#pos (web VImg, behind a flag that is off at launch) → null = no picture exercises. */
    val imageUrl: (String, String) -> String? = { _, _ -> null },
    /** Loads the picture index/shards for the picked words before the lesson is built (VImgStore.prepare). */
    val prepareImages: suspend (List<String>) -> Unit = {},
)

/** Which kind of lesson: null = the adaptive path node ("lesson"), "review"/"listen"/"speak", or a story/radio id. */
class LessonRequest(val kind: String = "lesson", val story: String? = null)

class LessonViewModel(private val env: LessonEnv, private val req: LessonRequest) : ViewModel() {
    private val _ui = MutableStateFlow<LessonUi?>(null)
    val ui: StateFlow<LessonUi?> = _ui
    val teacher = TeacherSignal()
    val who: String get() = ctrlWho
    private var ctrlWho = "ama"
    private var ctrl: LessonController? = null
    private val mood = TeacherMood(env.poseEmo)
    private var persisted = false
    /** Gold bank (why / mnemonic / examples): fetched like the web, cached; null while loading or offline-without-cache. */
    private val _gold = MutableStateFlow<Map<String, List<LessonData.Gold>>?>(null)
    val gold: StateFlow<Map<String, List<LessonData.Gold>>?> = _gold
    private val _pose = MutableStateFlow<String?>(null)
    /** Teacher pose of the last answer (cheer / concern / encourage) for the feedback sheet still. */
    val pose: StateFlow<String?> = _pose
    var storyTitle: String? = null; private set

    init { viewModelScope.launch { start() } }

    private fun publish() { _ui.value = ctrl?.ui() }

    // ---------- loading ----------
    private suspend fun start() {
        val now = env.now()
        val doc = env.store.doc()
        val cards = doc.cards.values.toList()
        val off = readOff(now)
        val items: List<com.lexkite.app.core.lesson.LItem>; var picks = emptyList<Pick>(); var seed = now
        if (req.kind == "story" || req.kind == "radio" || req.story != null) {
            val list = stories()
            val st = list.firstOrNull { (it["id"] as? JsonPrimitive)?.content == req.story } ?: list.filter { (it["kind"] as? JsonPrimitive)?.content == req.kind }.let { l -> if (l.isEmpty()) list.firstOrNull() else l[(storyCursor() % l.size)] }
            if (st == null) { items = emptyList() } else { storyTitle = (st["title"] as? JsonPrimitive)?.content; seed = 2; items = LessonEngine.storyItems(st, env.uiLang, 2) }
        } else {
            val starter = env.starterPack?.let { StarterDeck.cards(exam(doc), it, now).map { p -> p.second }.take(12) }.orEmpty()
            picks = LessonEngine.pickWords(cards, 4, now, req.kind, starter)
            val gloss = glossFn(picks)
            runCatching { env.prepareImages(picks.map { (it.card["word"] as? JsonPrimitive)?.content.orEmpty() }) }
            val seedN = now
            items = LessonEngine.build(picks, LessonEngine.BuildOpts(seedN, cards + starter, off, LessonEngine.KIND[req.kind], calm = true,
                hasImg = { w, p -> env.imageUrl(w, p) != null }, gloss = gloss, mean = { c -> if (env.uiLang == "vi") (c["vi"] as? JsonPrimitive)?.content.orEmpty() else "" }), now)
        }
        ctrlWho = if (req.story != null || req.kind == "story" || req.kind == "radio") "ama" else if ((now / 1000) % 2 == 0L) "ama" else "carlos"
        ctrl = LessonController(items, picks, cards, ease = true, seed = seed, now = { env.now() }, offState = { Off(offListen, offSpeak) })
        publish()
        viewModelScope.launch { loadGold() }
    }
    private var offListen = false; private var offSpeak = false
    private fun exam(doc: com.lexkite.app.core.sync.SyncDoc) = (Js.prop(doc.settings, "exam") as? JsonPrimitive)?.takeIf { it.isString }?.content?.takeIf { it.isNotEmpty() } ?: "general"
    private fun storyCursor() = 0

    // ---------- "can't listen / speak now" lasts an hour (web lk.lsn.off) ----------
    private suspend fun readOff(now: Long): Off {
        val o = env.store.get(KEY_OFF) as? JsonObject
        val l = Js.num(o?.get("listen")).let { !it.isNaN() && it > now }; val s = Js.num(o?.get("speak")).let { !it.isNaN() && it > now }
        offListen = l; offSpeak = s
        return Off(l, s)
    }
    fun skipListen() = skipOff(true)
    fun skipSpeak() = skipOff(false)
    private fun skipOff(listen: Boolean) {
        val c = ctrl ?: return; if (listen) offListen = true else offSpeak = true
        c.adaptAll(); publish()
        viewModelScope.launch { val m = linkedMapOf<String, kotlinx.serialization.json.JsonElement>(); val until = env.now() + HOUR
            (env.store.get(KEY_OFF) as? JsonObject)?.let { m.putAll(it) }; m[if (listen) "listen" else "speak"] = JsonPrimitive(until); env.store.put(mapOf(KEY_OFF to JsonObject(m)), local = false) }
    }

    // ---------- network helpers (cached, bounded: offline never blocks a lesson) ----------
    private suspend fun fetchText(url: String, file: String): String? = withContext(Dispatchers.IO) {
        val f = File(env.cacheDir, file)
        val r = withTimeoutOrNull(4000) { runCatching { env.http.send(Http.Req("GET", url)) }.getOrNull() }
        if (r != null && r.ok) { runCatching { f.parentFile?.mkdirs(); f.writeBytes(r.body) }; r.text } else if (f.exists()) runCatching { f.readText() }.getOrNull() else null
    }
    private suspend fun stories() = fetchText(LessonData.STORIES_URL, "lesson/stories.js")?.let(LessonData::stories).orEmpty()
    private suspend fun loadGold() { _gold.value = fetchText(LessonData.GOLD_URL, "lesson/gold.js")?.let(LessonData::gold) ?: emptyMap() }

    /** Translations of the example sentences for non-Vietnamese learners: web packs/sent/<lang>/<first letter>.json (only the shards of the lesson's words). */
    private suspend fun glossFn(picks: List<Pick>): ((JsonObject, String) -> String)? {
        val l = env.uiLang; if (l == "en" || l == "vi") return null
        fun shard(w: String): String { val ch = w.trim().lowercase().take(1); return if (ch.isNotEmpty() && ch[0] in 'a'..'z') ch else "_" }
        val words = picks.map { (it.card["word"] as? JsonPrimitive)?.content.orEmpty() }
        val data = HashMap<String, JsonObject>()
        for (k in words.map(::shard).toSet()) fetchText("https://lexkite.com/packs/sent/$l/$k.json", "lesson/sent-$l-$k.json")?.let { runCatching { Json.parseToJsonElement(it) as JsonObject }.getOrNull() }?.let { data[k] = it }
        return { c, en ->
            val w = ((c["word"] as? JsonPrimitive)?.content.orEmpty()).trim().lowercase()
            val v = data[shard(w)]?.get(w) as? JsonArray
            if (v != null && v.size > 1 && LessonEngine.norm((v[0] as JsonPrimitive).content) == LessonEngine.norm(en)) (v[1] as JsonPrimitive).content else ""
        }
    }

    // ---------- actions (each republishes the UI state) ----------
    private inline fun act(f: LessonController.() -> Unit) { ctrl?.f(); publish() }
    fun pick(o: String) = act { pick(o) }
    fun placeTile(i: Int) = act { placeTile(i) }
    fun removeTile(p: Int) = act { removeTile(p) }
    fun type(s: String) = act { type(s) }
    fun bankTap(i: Int) = act { bankTap(i) }
    fun bankBack() = act { bankBack() }
    fun useBank() = act { useBank() }
    fun matchTap(left: Boolean, i: Int) { val before = ctrl?.feedback; act { matchTap(left, i) }; if (before == null) afterCheck() }
    fun clearFlash() = act { clearFlash() }
    fun hint() { ctrl?.hint(); publish(); if (ctrl?.feedback != null) afterCheck() }
    fun check() { act { check() }; afterCheck() }
    fun spoke(score: Double, heard: String) { act { spoke(score, heard) }; afterCheck() }
    fun heard(text: String?) = act { heard(text) }
    fun unclear() = act { unclear() }
    fun speechScore(expected: String, alts: List<String>) = Speaking.score(expected, alts)
    fun lineContinue() { teacher.quiet(); stopAudio(); act { lineContinue() }; afterNext() }
    fun next() { teacher.pose(null); _pose.value = null; act { next() }; afterNext() }
    fun exitNeedsConfirm() = ctrl?.exitNeedsConfirm == true

    /** After a graded answer: teacher mood + praise line (web react()). */
    private fun afterCheck() {
        val fb = ctrl?.feedback ?: return
        if (_pose.value != null) return
        val m = mood.feed("answer", fb.ok); val pose = m?.pose ?: if (fb.ok) "cheer" else "concern"
        _pose.value = pose; teacher.pose(pose)
        val lines = if (fb.ok) OK_LINES else NO_LINES
        say(lines[(ctrl!!.sess.n + fb.combo) % lines.size], false, who)
    }
    private fun afterNext() {
        val f = ctrl?.finish ?: return
        if (persisted) return
        persisted = true
        viewModelScope.launch {
            val c = ctrl ?: return@launch; val now = env.now()
            runCatching { env.store.mutate { d -> LessonWriter.apply(d, c.results(), f.xp, c.spoken, f.perfect, now) } }
            _pose.value = if (f.accuracy >= 80) "cheer" else "encourage"
            say(if (f.accuracy >= 80) "Great job!" else "Good work. Keep going!", false, "ama")
        }
    }

    // ---------- audio ----------
    /** Reads text aloud as [who] and feeds the teacher's mouth (per sentence: clock + duration of the file, or live lip sync for system speech). */
    fun say(text: String, slow: Boolean, who: String = ctrlWho) {
        teacher.quiet()
        env.audio.speak(text, who, if (slow) 0.7f else 0.95f, object : SpeakListener {
            override fun onSegment(seg: Segment) { teacher.speak(seg.text, seg.durSec, seg::clock, seg::playing) }
            override fun onEnd() { teacher.quiet() }
            override fun onFail() { teacher.quiet() }
        })
    }
    fun sayWord(word: String, accent: String, slow: Boolean = false) {
        teacher.quiet()
        env.audio.speakWord(word, accent, slow, object : SpeakListener {
            override fun onSegment(seg: Segment) { teacher.speak(seg.text, seg.durSec, seg::clock, seg::playing) }
            override fun onEnd() { teacher.quiet() }
        })
    }
    /** What the current exercise reads aloud (web: gap/build → the sentence, otherwise the answer). */
    fun audioText(it: com.lexkite.app.core.lesson.LItem) = if (it.type == "gap" || it.type == "build") it.sent.orEmpty() else it.answer
    fun stopAudio() { env.audio.stop(); teacher.quiet() }

    override fun onCleared() { stopAudio() }

    class Factory(private val env: LessonEnv, private val req: LessonRequest) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = LessonViewModel(env, req) as T
    }

    private companion object {
        const val KEY_OFF = "lsn.off"; const val HOUR = 3_600_000L
        val OK_LINES = listOf("Nice!", "Great!", "Yes!", "Perfect!", "Well done!")
        val NO_LINES = listOf("Almost!", "Not quite.", "Let's try again.")
    }
}
