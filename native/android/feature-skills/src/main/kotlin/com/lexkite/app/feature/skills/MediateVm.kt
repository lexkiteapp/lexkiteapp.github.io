package com.lexkite.app.feature.skills

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.RewardRules
import com.lexkite.app.core.mediate.MItem
import com.lexkite.app.core.mediate.MResult
import com.lexkite.app.core.mediate.Mediate
import com.lexkite.app.core.mediate.MediationPack
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject

// ---------------------------------------------------------------- env helpers (device-only storage = the web's localStorage lk.medDraft.<id>; best score per lesson)
/** The bundled lessons (content-pack/mediation.json); null = missing / invalid. */
internal suspend fun SkillsEnv.mediation(): MediationPack? = withContext(Dispatchers.IO) { runCatching { asset("content-pack/mediation.json")?.let { Mediate.parse(Json.parseToJsonElement(it) as JsonObject) } }.getOrNull() }
internal suspend fun SkillsEnv.medBest(): Map<String, Pair<Int, Int>> = Mediate.bestOf(kv("med.best")?.let { runCatching { Json.parseToJsonElement(it) }.getOrNull() })

// ---------------------------------------------------------------- #/mediate list
data class MediateListUi(val pack: MediationPack? = null, val best: Map<String, Pair<Int, Int>> = emptyMap(), val loaded: Boolean = false)

class MediateListVm(private val env: SkillsEnv) : ViewModel() {
    var ui by mutableStateOf(MediateListUi()); private set
    init { viewModelScope.launch { ui = MediateListUi(env.mediation(), env.medBest(), true) } }
    class Factory(private val env: SkillsEnv) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = MediateListVm(env) as T }
}

// ---------------------------------------------------------------- #/mediate/<id>
/** [shown] = the source text is visible (always for charts / below B2, else after listening or "Show text"); [result] != null = checked. */
data class MediateUi(val loaded: Boolean = false, val item: MItem? = null, val nextId: String = "", val text: String = "", val shown: Boolean = true, val listenFirst: Boolean = false, val playing: Boolean = false,
                     val result: MResult? = null, val best: Pair<Int, Int>? = null)

class MediateVm(private val env: SkillsEnv, private val id: String) : ViewModel() {
    var ui by mutableStateOf(MediateUi()); private set
    private var seq = 0; private var save: Job? = null

    init { viewModelScope.launch {
        val pack = env.mediation(); val x = pack?.item(id)
        if (pack == null || x == null) { ui = MediateUi(loaded = true); return@launch }
        val lf = Mediate.listenFirst(x, pack.listenFirst)
        ui = MediateUi(true, x, pack.next(id)?.id.orEmpty(), env.kv("med.draft.$id").orEmpty(), shown = !lf, listenFirst = lf)
    } }

    fun text(v: String) {
        ui = ui.copy(text = v)
        save?.cancel(); save = viewModelScope.launch { env.putKv("med.draft.$id", v) }
    }
    fun show() { ui = ui.copy(shown = true) }

    /** Plays the source with the fixed Kokoro voices (dialogue: line by line, each speaker his own voice); the text is revealed at the end. */
    fun play() {
        val x = ui.item ?: return; val my = ++seq
        val v = Mediate.voices(x.source); val s = x.source
        val parts = if (s.kind == "dialogue") s.lines.map { it.second to (v[it.first] ?: Mediate.NARRATOR) } else listOf(Mediate.sourceText(s) to Mediate.NARRATOR)
        ui = ui.copy(playing = true)
        fun end() { if (my == seq) ui = ui.copy(playing = false, shown = true) }
        fun step(i: Int) { if (my != seq) return; if (i >= parts.size) end() else env.word.speakThen(parts[i].first, parts[i].second, false) { step(i + 1) } }
        step(0)
    }
    fun stopPlay() { seq++; env.vocab.audio.stop(); if (ui.playing) ui = ui.copy(playing = false) }

    /** Self-check: key ideas met / missing, leave-out hits, copied run; best score kept per lesson, XP like a finished set. */
    fun check() {
        val x = ui.item ?: return; if (ui.result != null) return
        stopPlay()
        val r = Mediate.check(x, ui.text)
        ui = ui.copy(result = r, shown = true)
        viewModelScope.launch {
            val b = Mediate.withBest(env.medBest(), id, r.got, r.of)
            env.putKv("med.best", Mediate.bestJson(b).toString()); ui = ui.copy(best = b[id])
            env.word.reward(mapOf("quizzes" to 1), RewardRules.xp("set", right = r.got, total = r.of))
        }
    }
    /** "Edit and re-check": back to the text box with the same text. */
    fun again() { ui = ui.copy(result = null) }

    override fun onCleared() { seq++; env.vocab.audio.stop() }

    class Factory(private val env: SkillsEnv, private val id: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = MediateVm(env, id) as T }
}
