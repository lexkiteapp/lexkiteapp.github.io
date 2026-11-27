package com.lexkite.app.feature.interpret

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.interpret.Interpret
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.launch

/** A message of the screen: a string id + variables (translated at draw time, so a language switch re-translates it). */
data class Msg(val key: L10nKey, val vars: Map<String, Any> = emptyMap())

private val SLOW = 0.55f
private fun recErr(c: String): Msg = when (c) {
    "not-allowed" -> Msg(L10nKey.interpretMicNeeded)
    "no-speech" -> Msg(L10nKey.interpretNothingHeard)
    else -> Msg(L10nKey.speakUiLoiNhanDangErr, mapOf("err" to c))
}

/** Face-to-face screen: side "a" = bottom (the learner), "b" = top (turned 180° for the person opposite). */
class TalkVm(private val env: InterpretEnv) : ViewModel() {
    var pair by mutableStateOf(Interpret.defaultPair(env.me)); private set
    /** Per side: the translation shown on that half · the live words while somebody speaks. */
    var heard by mutableStateOf(mapOf<String, String>()); private set
    var live by mutableStateOf(mapOf<String, String>()); private set
    /** "a" / "b" = that side's mic is open; "say" = the say-back recogniser. */
    var listening by mutableStateOf<String?>(null); private set
    var busy by mutableStateOf(false); private set
    var last by mutableStateOf<Interpret.Turn?>(null); private set
    /** Which half shows the source badge and whether the translation was on the device. */
    var badge by mutableStateOf<Pair<String, Boolean>?>(null); private set
    var score by mutableStateOf<Msg?>(null); private set
    var toast by mutableStateOf<Msg?>(null); private set
    var packBusy by mutableStateOf(false); private set
    private val cid = "c" + env.now(); private var nTurns = 0

    init { viewModelScope.launch { pair = env.pair() } }

    fun setLang(side: String, lang: String) { pair = Interpret.pick(pair, side, lang); viewModelScope.launch { env.savePair(pair) }; clear() }
    fun swap() { pair = Interpret.Pair2(pair.b, pair.a); viewModelScope.launch { env.savePair(pair) }; clear() }
    private fun clear() { env.speech.stop(); env.voice.stop(); listening = null; heard = emptyMap(); live = emptyMap(); last = null; badge = null; score = null; toast = null }

    /** Called with RECORD_AUDIO granted. A second tap on the open mic = done speaking; a tap on the other mic switches. */
    fun mic(side: String) {
        if (busy) return
        val cur = listening
        if (cur == side) { env.speech.finish(); return }
        if (cur != null) env.speech.stop()
        env.voice.stop(); toast = null; score = null; listening = side; live = emptyMap()
        env.speech.start(Interpret.LOC.getValue(Interpret.lang(pair, side)), { x -> live = mapOf(side to x, Interpret.other(side) to x) },
            { alts -> listening = null; finish(side, alts.firstOrNull().orEmpty()) }, { c -> listening = null; live = emptyMap(); toast = recErr(c) })
    }
    fun micDenied() { toast = Msg(L10nKey.interpretMicNeeded) }

    private fun finish(side: String, text: String) {
        val t0 = text.trim(); if (t0.isEmpty()) { toast = Msg(L10nKey.interpretNothingHeard); return }
        busy = true; live = mapOf(Interpret.other(side) to t0)
        viewModelScope.launch {
            val who = Interpret.speaker(env.langId.detect(t0), pair, side); val to = Interpret.other(who)
            val r = env.translator.translate(t0, Interpret.lang(pair, who), Interpret.lang(pair, to))
            busy = false
            if (r == null) { live = emptyMap(); toast = Msg(L10nKey.interpretFailed); return@launch }
            val turn = Interpret.Turn(who, t0, Interpret.lang(pair, to), r.text, env.now()); last = turn; nTurns++
            env.saveHistory(Interpret.addTurn(env.history(), cid, pair, turn))
            live = mapOf(who to t0); heard = mapOf(to to r.text); badge = to to r.local; toast = null
            env.voice.speak(r.text, Interpret.lang(pair, to))
        }
    }

    fun play(slow: Boolean = false) { val t = last ?: return; env.voice.speak(t.tx, t.dst, if (slow) SLOW else 1f) }
    fun save() {
        val t = last ?: return
        val cs = Interpret.cards(Interpret.Conv(cid, t.ts, pair.a, pair.b, listOf(t)), env.me)
        if (cs.isEmpty()) { toast = Msg(L10nKey.interpretSameLang); return }
        viewModelScope.launch { env.saveCards(cs); toast = Msg(L10nKey.interpretSaved) }
    }
    /** "Say it back": the foreign phrase of the last turn, scored 0–100. */
    fun sayBack() {
        val t = last ?: return; if (!env.speech.available) { toast = recErr("unsupported"); return }
        val srcL = Interpret.lang(pair, t.from); val (w, wl) = if (srcL == Interpret.base(env.me)) t.tx to t.dst else t.src to srcL
        if (wl == Interpret.base(env.me)) return
        env.speech.stop(); env.voice.stop(); listening = "say"; toast = null; score = Msg(L10nKey.interpretSayThis, mapOf("s" to w))
        env.speech.start(Interpret.LOC.getValue(wl), {}, { alts -> listening = null; val (n, h) = Interpret.score(w, alts); score = Msg(L10nKey.interpretScore, mapOf("n" to n, "h" to h)) }, { c -> listening = null; score = null; toast = recErr(c) })
    }
    fun sayDenied() { listening = null; toast = Msg(L10nKey.interpretMicNeeded) }

    /** "Download offline pack": only from this tap, Wi-Fi only. */
    fun pack() {
        if (packBusy) return
        packBusy = true; toast = Msg(L10nKey.interpretDownloading)
        viewModelScope.launch { val ok = env.translator.download(pair.a, pair.b); packBusy = false; toast = Msg(if (ok) L10nKey.interpretReady else L10nKey.interpretUnsupported) }
    }
    /** Ends the conversation → recap of its new words (or the history when nothing was said). */
    fun end(go: (String) -> Unit) { env.speech.stop(); env.voice.stop(); listening = null; go(if (nTurns > 0) "interpret/recap/$cid" else "interpret/history") }
    override fun onCleared() { env.speech.stop(); env.voice.stop() }

    class Factory(private val env: InterpretEnv) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = TalkVm(env) as T }
}

/** Travel phrasebook: a group of ready sentences, each in both languages of the pair. */
class PhrasesVm(private val env: InterpretEnv, group: String?) : ViewModel() {
    var pair by mutableStateOf(Interpret.defaultPair(env.me)); private set
    var book by mutableStateOf<Interpret.Phrases?>(null); private set
    var failed by mutableStateOf(false); private set
    var group by mutableStateOf(group.orEmpty()); private set
    var score by mutableStateOf<Msg?>(null); private set
    var toast by mutableStateOf<Msg?>(null); private set
    var saying by mutableStateOf(false); private set
    init { viewModelScope.launch { pair = env.pair(); val b = env.phrases(); book = b; failed = b == null; if (b != null && this@PhrasesVm.group !in b.order) this@PhrasesVm.group = b.order.first() } }

    val items: List<Map<String, String>> get() = book?.group(group).orEmpty()
    fun pick(g: String) { group = g }
    fun setLang(side: String, lang: String) { pair = Interpret.pick(pair, side, lang); viewModelScope.launch { env.savePair(pair) }; score = null }
    fun play(i: Int, slow: Boolean) { val o = items.getOrNull(i) ?: return; env.voice.speak(o[pair.b].orEmpty(), pair.b, if (slow) SLOW else 1f) }
    fun save(i: Int) {
        val o = items.getOrNull(i) ?: return; val me = Interpret.base(env.me); val fl = if (pair.a == me) pair.b else pair.a
        viewModelScope.launch { env.saveCards(listOf(Interpret.Card(o[fl].orEmpty(), o[me] ?: o[pair.a].orEmpty(), fl))); toast = Msg(L10nKey.interpretSaved) }
    }
    fun sayBack(i: Int) {
        val o = items.getOrNull(i) ?: return; val me = Interpret.base(env.me); val wl = if (pair.a == me) pair.b else pair.a; val w = o[wl].orEmpty()
        if (wl == me || !env.speech.available) return
        env.speech.stop(); env.voice.stop(); saying = true; toast = null; score = Msg(L10nKey.interpretSayThis, mapOf("s" to w))
        env.speech.start(Interpret.LOC.getValue(wl), {}, { alts -> saying = false; val (n, h) = Interpret.score(w, alts); score = Msg(L10nKey.interpretScore, mapOf("n" to n, "h" to h)) }, { c -> saying = false; score = null; toast = recErr(c) })
    }
    fun sayDenied() { toast = Msg(L10nKey.interpretMicNeeded) }
    override fun onCleared() { env.speech.stop(); env.voice.stop() }
    class Factory(private val env: InterpretEnv, private val group: String?) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = PhrasesVm(env, group) as T }
}

/** History of conversations on this device + the recap of one (new words after a conversation). */
class HistoryVm(private val env: InterpretEnv, private val id: String?) : ViewModel() {
    var convs by mutableStateOf<List<Interpret.Conv>?>(null); private set
    var cards by mutableStateOf<List<Interpret.Card>>(emptyList()); private set
    var keywords by mutableStateOf<List<String>>(emptyList()); private set
    var conv by mutableStateOf<Interpret.Conv?>(null); private set
    var toast by mutableStateOf<Msg?>(null); private set
    init { viewModelScope.launch {
        val h = env.history().convs; convs = h
        val c = id?.let { i -> h.find { it.id == i } }; conv = c
        if (c != null) {
            val me = Interpret.base(env.me); val foreign = if (c.a == me) c.b else c.a; cards = Interpret.cards(c, me)
            keywords = Interpret.keyWords(cards.map { it.word }, foreign, 8, env.known())
        }
    } }
    fun speak(c: Interpret.Card) = env.voice.speak(c.word, c.lang)
    fun saveAll() { viewModelScope.launch { env.saveCards(cards); toast = Msg(L10nKey.interpretSaved) } }
    fun clear() { viewModelScope.launch { env.clearHistory(); convs = emptyList() } }
    override fun onCleared() = env.voice.stop()
    class Factory(private val env: InterpretEnv, private val id: String?) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = HistoryVm(env, id) as T }
}
