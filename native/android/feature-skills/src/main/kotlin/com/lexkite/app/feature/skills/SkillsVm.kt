package com.lexkite.app.feature.skills

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.core.audio.SpeakListener
import com.lexkite.app.core.skills.Cast
import com.lexkite.app.core.skills.Clip
import com.lexkite.app.core.skills.Dictation
import com.lexkite.app.core.skills.KVoice
import com.lexkite.app.core.skills.ListenHub
import com.lexkite.app.core.skills.ListenPage
import com.lexkite.app.core.skills.ListenPlayer
import com.lexkite.app.core.skills.ListenTest
import com.lexkite.app.core.skills.Part
import com.lexkite.app.core.skills.PlayerEvents
import com.lexkite.app.core.skills.Qx
import com.lexkite.app.core.skills.Reader
import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.skills.SkillsContent
import com.lexkite.app.core.skills.WordPopup
import com.lexkite.app.core.skills.WordPort
import com.lexkite.app.core.sync.Js
import com.lexkite.app.feature.vocab.StudyReward
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

private fun JsonElement?.num(): Double? = (this as? JsonPrimitive)?.content?.toDoubleOrNull()
private fun JsonElement?.settingStr(k: String) = ((this as? JsonObject)?.get(k) as? JsonPrimitive)?.content

/** Saves the mistakes list and pays the reward (XP + day counters) for a finished activity. */
private suspend fun SkillsEnv.settle(mistakes: List<JsonObject>?, game: JsonElement, reward: Reward) {
    if (mistakes != null) vocab.saveMistakes(mistakes)
    vocab.write(game = StudyReward.track(game, reward.add.filterValues { it != 0 }, reward.xp, now))
}

// ---------------------------------------------------------------- #/listening
class HubVm(private val env: SkillsEnv, query: Map<String, String>, private val lang: String) : ViewModel() {
    var ui by mutableStateOf(HubUi(null, lang)); private set
    private var q = query; private var c: SkillsContent? = null
    init { viewModelScope.launch { c = env.content(); show() } }
    private suspend fun show() {
        val content = c ?: return
        val h = ListenHub.hub(content, q, env.kv("vb.listenT"), env.vocab.load().game, lang)
        env.putKv("vb.listenT", h.persistedTest); ui = HubUi(h, lang)
    }
    fun test(n: Int) { q = mapOf("t" to n.toString()); viewModelScope.launch { show() } }
    class Factory(private val env: SkillsEnv, private val q: Map<String, String>, private val lang: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = HubVm(env, q, lang) as T }
}

// ---------------------------------------------------------------- #/listen/<part>
class ListenVm(private val env: SkillsEnv, private val id: String, exam: Boolean) : ViewModel() {
    var ui by mutableStateOf<ListenUi?>(null); private set
    var missing by mutableStateOf(false); private set
    private lateinit var content: SkillsContent; private lateinit var part: Part; private lateinit var port: WordPort
    private var player: ListenPlayer? = null; private var rate = ListenPage.DEFAULT_RATE; private var examMode = exam
    private val io = LkPlayerIO(env.vocab.audio, viewModelScope)

    init { viewModelScope.launch { load() } }
    private suspend fun load() {
        content = env.content() ?: return run { missing = true }
        part = content.part(id) ?: return run { missing = true }
        port = env.port()
        rate = env.vocab.load().settings.settingStr("listenRate")?.toDoubleOrNull() ?: ListenPage.DEFAULT_RATE
        open()
    }
    private fun open() {
        player?.stop(); val cast = Cast.cast(part) { env.voicesFor(it) }
        player = ListenPlayer(part, cast, io, viewModelScope, PlayerEvents(
            onLine = { i -> ui = ui?.copy(line = i) },
            onState = { on -> ui = ui?.copy(playing = on, blocked = if (on) false else ui?.blocked ?: false) },
            onEnd = { ui = ui?.copy(ended = true, playing = false, line = -1); if (!examMode) player?.stop() },
            onBlocked = { ui = ui?.copy(blocked = true) }), { rate })
        ui = ListenUi(ListenPage.page(part, examMode, rate), rows = ListenPage.transcript(part, content.lexis, false))
    }
    override fun onCleared() { player?.stop(); env.vocab.audio.stop() }

    fun play() {
        val u = ui ?: return; val pl = player ?: return
        if (pl.isPlaying) { if (!examMode) pl.pause(); return }
        if (examMode && u.submit == null && u.plays > 0) return
        ui = u.copy(plays = u.plays + 1, ended = false, blocked = false)
        if (examMode && u.submit == null) pl.play(0) else pl.play(if (u.ended) 0 else null)
    }
    fun back() { player?.back() }
    fun rate(r: Double) { rate = r; ui = ui?.copy(page = ListenPage.page(part, examMode, r)); viewModelScope.launch { env.setSetting("listenRate", Js.number(r)) } }
    fun live(on: Boolean) { ui = ui?.copy(live = on) }
    fun answer(k: String, v: Any?) { ui = ui?.let { it.copy(answers = it.answers + (k to v)) } }
    fun line(i: Int) { val u = ui ?: return; if (u.live || u.submit != null) { ui = u.copy(plays = u.plays + 1); player?.play(i) } }
    fun switchMode() { examMode = !examMode; open() }
    fun again() { open() }
    fun retake() { val u = ui ?: return; val s = u.submit ?: return
        val wrong = s.res.filterValues { !it.ok }.keys
        val dropM = wrong.mapNotNull { Qx.groupIndex(part, it) }.map { "m$it" }.toSet()
        val keep = u.answers.filterKeys { k -> k !in dropM && k.toIntOrNull() !in wrong }
        ui = u.copy(retake = true, recheck = null, showAll = false, answers = keep) }
    fun recheck() { val u = ui ?: return; val s = u.submit ?: return
        ui = u.copy(recheck = s.res.filterValues { !it.ok }.mapValues { (n, r) -> Qx.recheck(r, Qx.answerFor(part, u.answers, n)) }) }
    fun showAll() { ui = ui?.copy(showAll = true) }
    fun submit(confirmed: Boolean = false) {
        val u = ui ?: return
        if (u.submit != null) return
        if (!confirmed && examMode && player?.isPlaying == true) { ui = u.copy(confirmSubmit = true); return }
        player?.stop()
        viewModelScope.launch {
            val ld = env.vocab.load(); val s = ListenPage.submit(part, u.answers, ld.game, ld.mistakes, env.now, env.vocab.tx)
            env.settle(s.mistakes, s.game, s.reward)
            ui = ui?.copy(submit = s, confirmSubmit = false, live = true, ended = false, playing = false, line = -1, rows = ListenPage.transcript(part, content.lexis, true))
        }
    }
    fun confirm(yes: Boolean) { if (yes) submit(true) else ui = ui?.copy(confirmSubmit = false) }
    fun hear(n: Int) { val s = ui?.submit ?: return; val cue = s.res[n]?.cue ?: return; ListenPage.hearFrom(part, cue)?.let { player?.play(it) } }

    // popup + vocabulary
    fun word(w: String, sentence: String) {
        ui = ui?.copy(popup = PopupUi(w, sentence, loading = true))
        viewModelScope.launch { val o = WordPopup.open(port, w); ui = ui?.copy(popup = PopupUi(w, sentence, entry = o.entry, translation = o.translation, saved = o.saved)) }
    }
    fun closePopup() { ui = ui?.copy(popup = null) }
    fun savePopup() { val p = ui?.popup ?: return; val e = p.entry ?: return; viewModelScope.launch { WordPopup.save(port, e, p.sentence, "🎧 Listening: ${part.title}", env.learnLang); ui = ui?.copy(popup = p.copy(done = true)) } }
    fun speakWord() { ui?.popup?.entry?.let { e -> viewModelScope.launch { env.word.speakWord((e["word"] as? JsonPrimitive)?.content ?: return@launch, env.word.region()) } } }
    fun saveVocab(k: Int) { viewModelScope.launch { WordPopup.saveVocab(port, part, k, env.learnLang); ui = ui?.let { it.copy(saved = it.saved + k) } } }
    class Factory(private val env: SkillsEnv, private val id: String, private val exam: Boolean) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = ListenVm(env, id, exam) as T }
}

// ---------------------------------------------------------------- #/listen-test/<n>
class TestVm(private val env: SkillsEnv, private val n: Int) : ViewModel() {
    var ui by mutableStateOf<TestUi?>(null); private set
    var missing by mutableStateOf(false); private set
    private lateinit var content: SkillsContent; private lateinit var parts: List<Part>
    private val results = java.util.TreeMap<Int, Pair<Qx.Res, String>>()
    private var player: ListenPlayer? = null; private var timer: Job? = null
    private val io = LkPlayerIO(env.vocab.audio, viewModelScope)

    init { viewModelScope.launch {
        content = env.content() ?: return@launch run { missing = true }
        parts = content.partsOf(n); if (parts.isEmpty()) return@launch run { missing = true }
        ui = TestUi(n, TestUi.Phase.INTRO, parts = parts.size, partIds = parts.map { it.id })
    } }
    override fun onCleared() { player?.stop(); timer?.cancel(); env.vocab.audio.stop() }

    fun start() = part(0)
    private fun part(k: Int) {
        player?.stop(); timer?.cancel()
        ui = ui?.copy(phase = TestUi.Phase.PART, part = parts[k], partIdx = k, left = ListenTest.READ_SECONDS, started = false, sounding = false, ended = false, blocked = false, nextOpen = false, line = -1, answers = emptyMap(), confirmNext = false)
        timer = viewModelScope.launch { var left = ListenTest.READ_SECONDS; while (left > 0) { delay(ListenTest.TICK_MS); left--; ui = ui?.copy(left = left) }; skipRead() }
    }
    fun skipRead() {
        val u = ui ?: return; if (u.started) return; timer?.cancel(); val p = u.part ?: return
        ui = u.copy(started = true)
        player = ListenPlayer(p, Cast.cast(p) { env.voicesFor(it) }, io, viewModelScope, PlayerEvents(
            onLine = { i -> ui = ui?.copy(line = i) }, onSound = { ui = ui?.copy(sounding = true, blocked = false) }, onBlocked = { ui = ui?.copy(blocked = true, sounding = false) },
            onEnd = { ui = ui?.copy(ended = true, nextOpen = true, sounding = false, line = -1) }))
        player?.play(0)
        timer = viewModelScope.launch { delay(ListenTest.STUCK_MS); ui = ui?.copy(nextOpen = true) } // the next button opens by itself if the voice is stuck
    }
    fun tap() { ui = ui?.copy(started = true); player?.play() }
    fun answer(k: String, v: Any?) { ui = ui?.let { it.copy(answers = it.answers + (k to v)) } }
    fun next(confirmed: Boolean = false) {
        val u = ui ?: return; val p = u.part ?: return
        if (!confirmed && player?.isPlaying == true) { ui = u.copy(confirmNext = true); return }
        player?.stop(); timer?.cancel()
        for ((q, r) in Qx.collect(p, u.answers)) results[q] = r to p.id
        if (u.partIdx < parts.size - 1) part(u.partIdx + 1) else finish()
    }
    fun confirm(yes: Boolean) { if (yes) next(true) else ui = ui?.copy(confirmNext = false) }
    private fun finish() { viewModelScope.launch {
        val ld = env.vocab.load(); val d = ListenTest.finish(n, parts, results, ld.game, ld.mistakes, env.now, env.vocab.tx)
        env.settle(d.mistakes, d.game, d.reward)
        ui = ui?.copy(phase = TestUi.Phase.RESULT, done = d, sheet = d.sheet.map { q -> val r = results.getValue(q); Triple(q, r.first, r.first.ok) })
    } }
    class Factory(private val env: SkillsEnv, private val n: Int) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = TestVm(env, n) as T }
}

// ---------------------------------------------------------------- #/dictation/<part>
class DictVm(private val env: SkillsEnv, private val id: String, queryMode: String?) : ViewModel() {
    var ui by mutableStateOf<DictUi?>(null); private set
    var missing by mutableStateOf(false); private set
    private lateinit var part: Part; private lateinit var lines: List<com.lexkite.app.core.skills.Line>
    private var mode = "mid"; private var auto = false; private var k = 0; private var score = 0.0; private var done = 0; private var checked = false; private var rate = ListenPage.DEFAULT_RATE
    private var typed = emptyList<String>(); private var full = ""; private var hq = true
    private var sayJob: Job? = null; private val io = LkPlayerIO(env.vocab.audio, viewModelScope)
    private lateinit var cast: Map<String, com.lexkite.app.core.skills.CastVoice>; private lateinit var voices: Map<String, String>
    private val q0 = queryMode

    init { viewModelScope.launch {
        val c = env.content() ?: return@launch run { missing = true }
        part = c.part(id) ?: return@launch run { missing = true }
        lines = Dictation.lines(part); cast = Cast.cast(part) { env.voicesFor(it) }; voices = KVoice.voices(part)
        val st = env.vocab.load().settings
        mode = Dictation.mode(q0, st.settingStr("dictMode")); auto = st.settingStr("dictAuto").let { it == "true" || it == "1" }
        rate = st.settingStr("listenRate")?.toDoubleOrNull() ?: ListenPage.DEFAULT_RATE; hq = st.settingStr("hqVoice") != "false"
        draw(); say(false)
    } }
    override fun onCleared() { sayJob?.cancel(); env.vocab.audio.stop() }

    private fun draw() {
        if (k >= lines.size) return
        val l = lines[k]; checked = false; typed = emptyList(); full = ""
        ui = DictUi(part, mode, k, lines.size, DictLine(l, Dictation.cells(Dictation.toks(l.t.orEmpty()), mode)), auto = auto, trOpen = ui?.trOpen ?: false, shown = k)
    }
    private fun push() { ui = ui?.copy(typed = typed, full = full, check = null) }
    fun typed(j: Int, v: String) { typed = typed.toMutableList().also { while (it.size <= j) it.add(""); it[j] = v }; push() }
    fun full(v: String) { full = v; push() }
    fun mode(m: String) { mode = m; viewModelScope.launch { env.setSetting("dictMode", JsonPrimitive(m)) }; draw(); say(false) }
    fun auto(on: Boolean) { auto = on; ui = ui?.copy(auto = on); viewModelScope.launch { env.setSetting("dictAuto", JsonPrimitive(on)) }; if (on) say(false) }
    fun prev() { if (k > 0) { k--; draw(); say(false) } }
    fun next() { k++; advance() }
    private fun advance() { if (k >= lines.size) finish() else { draw(); say(false) } }
    fun clear() { typed = emptyList(); full = ""; checked = false; ui = ui?.copy(typed = emptyList(), full = "", check = null) }
    fun answer() { val u = ui ?: return; val ans = u.line.cells.filter { it.hole }.map { Dictation.answerOf(it) }; typed = ans; full = u.line.line.t.orEmpty(); ui = u.copy(typed = typed, full = full) }
    fun check() {
        val u = ui ?: return
        if (checked) { k++; advance(); return }
        checked = true; sayJob?.cancel(); done++
        val r = Dictation.check(u.line.line, mode, typed, full); score += r.pct; ui = u.copy(check = r)
    }
    fun say(slow: Boolean) {
        val u = ui ?: return; val l = u.line.line; sayJob?.cancel(); env.vocab.audio.stop()
        val s = Dictation.say(l, cast, voices, slow, rate, hq)
        sayJob = viewModelScope.launch {
            val r = if (s.clipKey != null) io.playClip(s.clipKey!!, s.clipRate) {} else Clip.MISSING
            if (r != Clip.PLAYED) { s.utters.forEach { io.queue(it) }; io.awaitSpeech {} }
            if (auto && !checked && ui?.line?.line === l) { delay(Dictation.AUTO_REPLAY_MS); if (!checked) say(false) }
        }
    }
    fun tr(open: Boolean) {
        ui = ui?.copy(trOpen = open)
        if (open && env.learnLang != "en") viewModelScope.launch {
            val shown = lines.take(k + 1).joinToString("\n") { it.t.orEmpty() }
            val out = runCatching { env.word.dict().translateTo(shown, env.learnLang) }.getOrDefault("")
            ui = ui?.copy(tr = out.split("\n"))
        }
    }
    private fun finish() { viewModelScope.launch {
        val ld = env.vocab.load(); val f = Dictation.finish(id, mode, score, done, ld.game)
        env.settle(null, f.game, f.reward); ui = ui?.copy(fin = f)
    } }
    class Factory(private val env: SkillsEnv, private val id: String, private val mode: String?) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = DictVm(env, id, mode) as T }
}

// ---------------------------------------------------------------- #/reading
class ReadingVm(private val env: SkillsEnv, query: Map<String, String>) : ViewModel() {
    var ui by mutableStateOf<ReadingUi?>(null); private set
    private var q = query; private var c: SkillsContent? = null
    init { viewModelScope.launch { c = env.content(); show() } }
    private suspend fun show() {
        val m = Reader.list(c ?: SkillsContent(emptyList(), emptyList(), com.lexkite.app.core.skills.Lexis(emptyList(), emptyList(), emptyList())), q, env.kv("vb.readLv"), env.vocab.load().game, env.learnLang)
        env.putKv("vb.readLv", m.persistedLevel); ui = ReadingUi(m)
    }
    fun level(lv: String) { q = mapOf("lv" to lv); viewModelScope.launch { show() } }
    class Factory(private val env: SkillsEnv, private val q: Map<String, String>) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = ReadingVm(env, q) as T }
}

// ---------------------------------------------------------------- #/read/<id>
class ReaderVm(private val env: SkillsEnv, private val id: String) : ViewModel() {
    var ui by mutableStateOf<ReaderUi?>(null); private set
    var missing by mutableStateOf(false); private set
    private lateinit var content: SkillsContent; private lateinit var r: com.lexkite.app.core.skills.Reading; private lateinit var port: WordPort
    private var mine = emptySet<String>(); private var reading: Job? = null
    init { viewModelScope.launch {
        content = env.content() ?: return@launch run { missing = true }
        r = content.reading(id) ?: return@launch run { missing = true }
        port = env.port(); mine = env.word.cards().keys.map { it.lowercase() }.toSet()
        val st = env.vocab.load().settings
        ui = ReaderUi(r, if (env.learnLang == "vi" || r.summaryEn.isEmpty()) r.summaryVi else r.summaryEn, passage(), Reader.highlights(st.settingStr("hl")).toSet())
    } }
    override fun onCleared() { env.vocab.audio.stop() }
    private fun passage() = Reader.passage(r, content.lexis) { it.lowercase() in mine }

    fun toggle(k: String) { val u = ui ?: return; val (on, s) = Reader.toggle(u.on, k); ui = u.copy(on = on); viewModelScope.launch { env.setSetting("hl", JsonPrimitive(s)) } }
    fun word(w: String, sentence: String) {
        ui = ui?.copy(active = w, popup = PopupUi(w, sentence, loading = true, details = true))
        viewModelScope.launch { val o = WordPopup.open(port, w); ui = ui?.copy(popup = PopupUi(w, sentence, entry = o.entry, translation = o.translation, saved = o.saved, details = true)) }
    }
    fun keyword(k: String) { val u = ui ?: return; val t = Reader.keywordToken(u.passage, k) ?: return; viewModelScope.launch { delay(Reader.KEYWORD_POPUP_MS); word(t.w, Reader.contextOf(u.passage, t.w).orEmpty()) } }
    fun closePopup() { ui = ui?.copy(popup = null, active = null) }
    fun savePopup() {
        val u = ui ?: return; val p = u.popup ?: return; val e = p.entry ?: return
        viewModelScope.launch { WordPopup.save(port, e, p.sentence, "Bài đọc: ${r.title}", env.learnLang); mine = mine + p.word.lowercase(); ui = ui?.copy(popup = p.copy(done = true), passage = passage()) }
    }
    fun speakWord() { ui?.popup?.entry?.let { e -> viewModelScope.launch { env.word.speakWord((e["word"] as? JsonPrimitive)?.content ?: return@launch, env.word.region()) } } }
    fun saveAll() { val u = ui ?: return; viewModelScope.launch { WordPopup.saveKeywords(port, r, u.passage); mine = env.word.cards().keys.map { it.lowercase() }.toSet(); ui = ui?.copy(saved = true, passage = passage()) } }
    fun readAloud() {
        val u = ui ?: return
        if (u.playing) { env.vocab.audio.stop(); ui = u.copy(playing = false, reading = -1); return }
        val plan = Reader.readAloud(u.passage); ui = u.copy(playing = true)
        env.vocab.audio.speak(plan.text, AudioLogic.wordVoice("en-GB"), 0.95f, object : SpeakListener {
            override fun onSegment(seg: com.lexkite.app.core.audio.Segment) { ui = ui?.copy(reading = plan.spokenToShown.getOrElse(seg.index) { -1 }) }
            override fun onEnd() { ui = ui?.copy(playing = false, reading = -1) }
            override fun onFail() { ui = ui?.copy(playing = false, reading = -1) }
        })
    }
    fun pick(i: Int, v: String) { ui = ui?.let { it.copy(picks = it.picks + (i to v)) } }
    fun grade(confirmed: Boolean = false) {
        val u = ui ?: return; if (u.graded != null) return
        if (!confirmed && u.picks.size < r.questions.size) { ui = u.copy(confirm = true); return }
        viewModelScope.launch {
            val ld = env.vocab.load(); val g = Reader.grade(r, r.questions.indices.map { u.picks[it] }, ld.game, ld.mistakes, env.now, env.vocab.tx)
            env.settle(g.mistakes, g.game, g.reward); ui = ui?.copy(graded = g, confirm = false)
        }
    }
    fun confirm(yes: Boolean) { if (yes) grade(true) else ui = ui?.copy(confirm = false) }
    class Factory(private val env: SkillsEnv, private val id: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = ReaderVm(env, id) as T }
}
