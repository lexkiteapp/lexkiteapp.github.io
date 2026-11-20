package com.lexkite.app.feature.vocab

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import com.lexkite.app.core.dict.Dict
import com.lexkite.app.core.dict.DictPage
import com.lexkite.app.core.vocab.CardMath
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** Route `#/dict` and `#/dict/<word>` (and `word/<w>`): owns the lookup flow. Network and storage come from [env]; [open] takes a web hash route. */
@Composable
fun DictRoute(env: WordEnv, word: String, onExit: () -> Unit, open: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    val ctl = remember(env) { DictController(env, scope, open) }
    LaunchedEffect(word) { ctl.start(word) }
    DisposableEffect(Unit) { onDispose { env.stopAudio() } }
    DictScreen(ctl.ui, ctl.q, ctl.actions, onExit)
}

internal class DictController(private val env: WordEnv, private val scope: CoroutineScope, private val open: (String) -> Unit) {
    var q by mutableStateOf("")
    var ui: DictUi by mutableStateOf(DictUi.Input(emptyList()))
    private var entry: JsonObject? = null
    private var partial = false
    private var related: RelatedUi = RelatedUi.Loading
    private var phrases: DictPage.Phrases? = null
    private var note: JsonObject? = null
    private var ctx = CtxUi()
    private var savedPhrases = emptySet<String>()
    private var region = "UK"
    private var job: Job? = null
    private var sugJob: Job? = null

    val actions = DictActions(
        queryChange = ::queryChange, search = ::search, speakWord = { w, r, slow -> env.speakWord(w, r, slow) }, speakText = { env.speak(it) },
        save = ::save, useCtx = { s -> ctx = CtxUi(text = s); render() }, ctxChange = { s -> ctx = CtxUi(text = s, count = ctx.count); render() },
        translate = ::translate, saveCtx = ::saveCtx, savePhrase = ::savePhrase, retryRelated = ::loadRelated, open = open,
    )

    fun start(word: String) {
        if (word.isNotBlank()) search(word) else scope.launch { ui = DictUi.Input(env.recent()) }
    }

    private fun queryChange(s: String) {
        q = s
        sugJob?.cancel()
        if (s.isBlank()) { scope.launch { ui = DictUi.Input(env.recent()) }; return }
        sugJob = scope.launch {
            delay(180)
            val key = Dict.normWord(s)
            val local = runCatching { env.lex().suggest(key, 6) }.getOrDefault(emptyList()).map { DictSuggest(it.jstr("word"), it.jstr("vi")) }
            ui = DictUi.Input(env.recent(), local)
            val net = runCatching { env.dict().datamuse("sug?s=" + Dict.jsEncode(key) + "&max=8") }.getOrNull()
            if (net != null) {
                val extra = net.mapNotNull { (it as? JsonObject)?.jstr("word") }.filter { Regex("^[a-z][a-z' -]*$").matches(it) && local.none { l -> l.word == it } }
                ui = DictUi.Input(env.recent(), (local + extra.map { DictSuggest(it, "") }).take(8))
            }
        }
    }

    fun search(raw: String) {
        val w = Dict.normWord(raw)
        if (w.isEmpty()) return
        job?.cancel(); sugJob?.cancel()
        q = w; entry = null; note = null; ctx = CtxUi(); related = RelatedUi.Loading; phrases = null; savedPhrases = emptySet()
        ui = DictUi.Looking(w)
        job = scope.launch {
            region = env.region()
            val d = env.dict()
            val quick = runCatching { d.quick(w) }.getOrNull()
            val quickOk = quick != null && (!quick.containsKey("found") || quick.jbool("found"))
            if (quickOk) { entry = quick; partial = true; render() }
            val full = runCatching { d.lookup(w) }.getOrNull()
            val ok = full != null && (!full.containsKey("found") || full.jbool("found"))
            if (!ok) {
                if (full == null && quickOk) { partial = false; render(); loadRelated() } else ui = DictUi.Missing(w, full.jstr("vi"))
                return@launch
            }
            full!!
            entry = full; partial = false
            env.putRecent(DictPage.recent(env.recent(), full.jstr("word").ifEmpty { w }))
            runCatching { env.rewardLookup(full.jstr("word").ifEmpty { w }) }
            render()
            if (env.autoSpeak()) env.speakWord(full.jstr("word").ifEmpty { w }, region, false)
            launch { phrases = loadPhrases(full); render() }
            launch { note = runCatching { env.deepNote(full.jstr("word").ifEmpty { w }) }.getOrNull(); if (note != null) render() }
            launch { runCatching { env.usage() }; render() }
            loadRelated()
        }
    }

    private suspend fun loadPhrases(e: JsonObject): DictPage.Phrases {
        val lexPhrases = runCatching { env.lex().phrases(e.jstr("word")) }.getOrNull()
        return DictPage.phrases(e, lexPhrases, runCatching { env.index().values }.getOrDefault(emptyList()), env.cards().values)
    }

    private fun loadRelated() {
        val e = entry ?: return
        related = RelatedUi.Loading; render()
        scope.launch {
            val r = runCatching { DictPage.related(env.dict(), e, retry = true) }.getOrNull() ?: DictPage.Related(emptyList(), emptyList(), emptyList(), emptyList(), true)
            related = RelatedUi.Ready(r); render()
        }
    }

    private fun render() {
        val e = entry ?: return
        scope.launch {
            val cards = env.cards()
            val card = cards[CardMath.keyOf(e.jstr("word"))]
            val verbs = runCatching { env.verbs() }.getOrNull()
            val usage = env.usageCached()
            val m = DictPage.model(e, card, env.meanLang, verbOf = { x -> verbs?.verbOf(x)?.takeIf { it.isNotEmpty() } }, hasUsage = { w -> usage?.hasWord(w) == true })
            val c = ctx.copy2(count = card.jarr("contexts").size)
            ui = DictUi.Found(DictView(e, m, partial, region, env.uiLang, phrases, related, c, savedPhrases, note))
        }
    }

    private fun save() { val e = entry ?: return; scope.launch { env.addWord(e, null); render() } }

    private fun translate() {
        val text = ctx.text.trim(); if (text.isEmpty()) return
        ctx = CtxUi(text = ctx.text, translating = true, count = ctx.count); render()
        scope.launch {
            val d = env.dict()
            val vi = runCatching { if (env.learnLang == "vi") d.translateVi(text) else d.translateTo(text, env.learnLang) }.getOrDefault("")
            ctx = CtxUi(text = ctx.text, vi = vi, failed = vi.isBlank(), count = ctx.count); render()
        }
    }

    private fun saveCtx() {
        val e = entry ?: return; val text = ctx.text.trim(); if (text.isEmpty()) return
        scope.launch {
            env.updateBook { st -> DictPage.save(st, e, text, ctx.vi, System.currentTimeMillis()) }
            ctx = CtxUi(); render()
        }
    }

    private fun savePhrase(p: JsonObject) {
        scope.launch {
            val card = buildJsonObject { put("word", p.jstr("word")); put("vi", p.jstr("vi")); put("pos", "phrase"); put("ex", p.jstr("ex")); put("emoji", "🧩"); put("topic", "phrases") }
            env.addWord(card, null)
            savedPhrases = savedPhrases + p.jstr("word"); render()
        }
    }

    private fun CtxUi.copy2(count: Int) = CtxUi(text, vi, translating, failed, count)
}
