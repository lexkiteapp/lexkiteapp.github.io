package com.lexkite.app.feature.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.write.Ideas
import com.lexkite.app.core.write.Letters
import com.lexkite.app.core.write.Models
import com.lexkite.app.core.write.Paraphrase
import com.lexkite.app.core.write.WritingData
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.TopBar
import com.lexkite.app.ui.TopBarVariant
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

private fun qParam(q: String, k: String): String? = Regex("(?:^|&)$k=([^&]+)").find(q)?.groupValues?.get(1)?.let { runCatching { java.net.URLDecoder.decode(it, "UTF-8") }.getOrDefault(it) }

/** Loads the writing content (network scripts); shows loading / offline-with-retry until it is there. */
@Composable
private fun WithWriting(env: WordEnv, title: L10nKey, onExit: () -> Unit, content: @Composable (WritingData) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    var reload by remember { mutableIntStateOf(0) }
    val state by produceState<Pair<Boolean, WritingData?>>(false to null, env, reload) {
        val w = runCatching { env.writing() }.getOrNull()
        value = true to w?.takeIf { it.models.isNotEmpty() || it.ideas.isNotEmpty() || it.letters.isNotEmpty() || it.paraphrase.isNotEmpty() }
    }
    DisposableEffect(Unit) { onDispose { env.stopAudio() } }
    val w = state.second
    if (w != null) { content(w); return }
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Inner, t(title), t, onExit)
        Box(Modifier.padding(16.dp)) { if (state.first) VNotice(t(L10nKey.syncOffline)) { reload++ } else VNotice(t(L10nKey.actionLoading)) }
    }
}

private fun phraseCard(word: String, vi: String, ex: String): JsonObject =
    buildJsonObject { put("word", word); put("vi", vi); put("pos", "phrase"); put("ex", ex); put("emoji", "🧩"); put("topic", "phrases") }

// ---------------------------------------------------------------- letters
/** `#/letters` (list, `?tone=`) and `#/letters/<id>` (practice). */
@Composable
fun LettersRoute(env: WordEnv, arg: String, query: String, onExit: () -> Unit, open: (String) -> Unit) {
    WithWriting(env, L10nKey.lettersLetterWritingIeltsGeneral, onExit) { w ->
        var id by remember(arg) { mutableStateOf(arg) }
        val letter = w.letters.firstOrNull { it.jstr("id") == id }
        if (letter == null) LettersList(env, w, qParam(query, "tone"), onExit, open) { id = it } else LetterPractice(env, letter, { if (arg.isBlank()) id = "" else onExit() }, open)
    }
}

@Composable
private fun LettersList(env: WordEnv, w: WritingData, tone: String?, onExit: () -> Unit, open: (String) -> Unit, pick: (String) -> Unit) {
    var tab by remember { mutableStateOf(Letters.toneOf(tone)) }
    val drafts by produceState<JsonObject?>(null, env) { value = env.drafts() }
    val rows = Letters.list(w.letters, tab).map { LetterRow(it, Letters.draftWords(drafts, it.jstr("id"))) }
    LettersListScreen(tab, Letters.tabs(w.letters), rows, LettersActions(setTab = { tab = it }, practise = pick, open = open), onExit)
}

@Composable
private fun LetterPractice(env: WordEnv, letter: JsonObject, onExit: () -> Unit, open: (String) -> Unit) {
    val id = letter.jstr("id")
    var text by remember(id) { mutableStateOf("") }
    var loaded by remember(id) { mutableStateOf(false) }
    var left by remember(id) { mutableIntStateOf(Letters.TIMER_SECONDS) }
    var running by remember(id) { mutableStateOf(false) }
    var check by remember(id) { mutableStateOf<Letters.Check?>(null) }
    LaunchedEffect(id) { text = env.drafts().jstr(id); loaded = true }
    LaunchedEffect(text, loaded) { if (loaded) { delay(600); env.putDraft(id, text) } } // saved 600 ms after the last key, like the web
    LaunchedEffect(running) { while (running && left > 0) { delay(1000); left-- }; if (left <= 0) running = false }
    LetterPracticeScreen(letter, text, left, running, check, LettersActions(
        textChange = { text = it; check = null }, toggleTimer = { if (left > 0) running = !running }, check = { check = Letters.check(letter, text) }, open = open,
    ), onExit)
}

// ---------------------------------------------------------------- ideas
/** `#/ideas` and `#/ideas/<topic>`. */
@Composable
fun IdeasRoute(env: WordEnv, arg: String, onExit: () -> Unit, open: (String) -> Unit) {
    WithWriting(env, L10nKey.ideasTask2IdeaBank, onExit) { w ->
        var topic by remember(arg) { mutableStateOf(arg) }
        val cur = Ideas.pick(w.ideas, topic)
        var openIssues by remember(cur?.jstr("topic")) { mutableStateOf(setOf(0)) }
        var saved by remember { mutableStateOf<Set<String>>(emptySet()) }
        val scope = rememberCoroutineScope()
        val t = LocalL10n.current.western()
        IdeasScreen(w.ideas, cur, openIssues, saved, if (cur == null) emptyList() else Ideas.prompts(w.prompts, cur), IdeasActions(
            pickTopic = { topic = it }, toggleIssue = { i -> openIssues = if (i in openIssues) openIssues - i else openIssues + i },
            say = { env.speak(it) }, open = open,
            saveChunk = { idea, ch ->
                scope.launch {
                    val s = Ideas.chunkSave(idea, ch, env.learnLang)
                    val card = phraseCard(s.jstr("phrase"), s.jstr("vi"), s.jstr("sentence"))
                    val ctx = if (s.jstr("sentence").isNotEmpty()) buildJsonObject { put("text", s.jstr("sentence")); put("title", s.jstr("title")) } else null
                    runCatching { env.addWord(card, ctx) }.onSuccess { saved = saved + s.jstr("phrase") }
                }
            },
        ), onExit)
    }
}

// ---------------------------------------------------------------- paraphrase
@Composable
fun ParaphraseRoute(env: WordEnv, onExit: () -> Unit, open: (String) -> Unit) {
    WithWriting(env, L10nKey.paraParaphrasePractice, onExit) { w ->
        val pairs = remember(w) { Paraphrase.pairs(w.paraphrase) }
        var seed by remember { mutableLongStateOf(System.currentTimeMillis()) }
        val round = remember(pairs, seed) { Paraphrase.Round(pairs) }
        var idx by remember(round) { mutableIntStateOf(0) }
        var picked by remember(round) { mutableStateOf<String?>(null) }
        val q = remember(round, idx) { if (pairs.size >= 8 && !round.finished) round.question() else null }
        val ui: ParaUi = when {
            pairs.size < 8 -> ParaUi.Updating
            q == null -> ParaUi.Done(round.right, round.items.size, round.percent)
            else -> ParaUi.Question(idx, round.items.size, q, picked)
        }
        ParaphraseScreen(ui, ParaActions(
            pick = { ch -> if (picked == null && q != null) { picked = ch; round.answer(q, ch) } },
            next = { round.next(); idx = round.index; picked = null }, again = { seed++ }, toReading = { open("skills") }, say = { env.speak(it) },
        ), onExit)
    }
}

// ---------------------------------------------------------------- phrase book
@Composable
fun PhrasesRoute(env: WordEnv, onExit: () -> Unit, open: (String) -> Unit) {
    val t = LocalL10n.current.western()
    val scope = rememberCoroutineScope()
    var rev by remember { mutableIntStateOf(0) }
    val cards by produceState<Map<String, JsonObject>>(emptyMap(), env, rev) { value = env.cards() }
    val models by produceState<List<JsonObject>>(emptyList(), env) { value = runCatching { env.writing().models }.getOrDefault(emptyList()) }
    var adding by remember { mutableStateOf(false) }
    var phrase by remember { mutableStateOf("") }
    var vi by remember { mutableStateOf("") }
    var notice by remember { mutableStateOf<String?>(null) }
    DisposableEffect(Unit) { onDispose { env.stopAudio() } }
    PhrasesScreen(Models.phraseCards(cards.values), models.size, adding, phrase, vi, notice, PhrasesActions(
        toggleAdd = { adding = !adding }, formChange = { p, v -> phrase = p; vi = v },
        saveForm = { scope.launch { env.addWord(phraseCard(phrase.trim(), vi.trim(), ""), null); phrase = ""; vi = ""; adding = false; rev++ } },
        study = { open("practice/learn?src=phrases") }, openModels = { open("models") },
        starter = {
            scope.launch {
                val list = Models.starter(models, env.cards())
                env.updateBook { Models.addStarter(it, list, System.currentTimeMillis()) }
                notice = t.s(L10nKey.modelAddedPhrasesToYour, "n" to list.size); rev++
            }
        },
    ), onExit)
}

// ---------------------------------------------------------------- models list + model page
@Composable
fun ModelsRoute(env: WordEnv, query: String, onExit: () -> Unit, open: (String) -> Unit) {
    WithWriting(env, L10nKey.modelBand8ModelAnswers, onExit) { w ->
        val t = LocalL10n.current.western()
        val exam by produceState("", env) { value = env.exam() }
        var tab by remember(query, exam) { mutableStateOf(Models.defaultTab(qParam(query, "t"), exam)) }
        var q by remember { mutableStateOf("") }
        val rows = remember(w, t) {
            Models.rows(w.models, w.prompts, w.task1, w.letters, { k -> chartKey(k)?.let { t(it) } ?: k }, { tone -> t(toneKey(tone)) }, { l -> letterTitle(l, t.lang) })
        }
        val counts = listOf("2", "1", "gt").associateWith { Models.tabCount(rows, it) }
        ModelsScreen(tab, counts, q, Models.list(rows, tab, q), ModelsActions(setTab = { tab = it }, queryChange = { q = it }, open = open), onExit)
    }
}

@Composable
fun ModelRoute(env: WordEnv, id: String, onExit: () -> Unit, open: (String) -> Unit) {
    WithWriting(env, L10nKey.modelAnnotatedModelAnswer, onExit) { w ->
        val t = LocalL10n.current.western(); val c = LocalLKColors.current
        val m = w.models.firstOrNull { it.jstr("id") == id }
        if (m == null) {
            Column(Modifier.fillMaxSize().background(c.background)) {
                TopBar(TopBarVariant.Inner, t(L10nKey.modelAnnotatedModelAnswer), t, onExit)
                Box(Modifier.padding(16.dp)) { VNotice(t(L10nKey.modelThisModelAnswerIsn)) }
            }
            return@WithWriting
        }
        val scope = rememberCoroutineScope()
        val page = remember(m, t) { Models.page(m, w.prompts, w.task1, w.letters, { k -> chartKey(k)?.let { t(it) } ?: k }, { tone -> t(toneKey(tone)) }) }
        var ui by remember(id) { mutableStateOf(ModelUi(seed = System.currentTimeMillis() % 100000)) }
        var hlOn by remember(id) { mutableStateOf(false) }
        var hlSet by remember(id) { mutableStateOf(emptySet<Int>()) }
        val hlKey = "uhl:$id"; val hlVer = m.jstr("text").length.toString()
        val tools by produceState(ModelTools(), env) {
            value = runCatching { ModelTools(env.verbData().forms, env.lemmatizer(), env.index()) }.getOrDefault(ModelTools())
        }
        LaunchedEffect(id) {
            val done = env.modelDone(id)
            val an = (env.kv("annot2") as? JsonPrimitive)?.content?.split(" ")?.filter { it.isNotEmpty() }?.toSet()
            val have = env.cards().keys
            (env.kv(hlKey) as? JsonObject)?.let { o ->
                if ((o["v"] as? JsonPrimitive)?.content == hlVer) hlSet = (o["s"] as? JsonArray)?.mapNotNull { (it as? JsonPrimitive)?.content?.toIntOrNull() }?.toSet()
                    ?: hlFromHtml((o["h"] as? JsonPrimitive)?.content.orEmpty(), essaySentences(m)) // a highlight made on the web: {v, h} only
            }
            ui = ModelUi(tab = ui.tab, done = done, annot = an ?: ui.annot, saved = Models.chunksOf(m.jstr("text")).map { it.first }.filter { it.lowercase() in have }.toSet(), seed = ui.seed)
        }
        /** Web shape {v, h}: h = the essay as HTML with the marked sentences in <mark class="uhl"> (so the web page shows them too); s = the ordinals, native only. */
        fun saveHl(next: Set<Int>) {
            hlSet = next
            scope.launch {
                if (next.isEmpty()) env.putKv(hlKey, null)
                else {
                    val sents = essaySentences(m)
                    val esc = { s: String -> s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") }
                    val h = sents.mapIndexed { k, s -> if (k in next) "<mark class=\"uhl\">" + esc(s) + "</mark>" else esc(s) }.joinToString("")
                    env.putKv(hlKey, JsonObject(mapOf("v" to JsonPrimitive(hlVer), "h" to JsonPrimitive(h), "s" to JsonArray(next.sorted().map { JsonPrimitive(it) }))))
                }
            }
        }
        val actions = ModelActions(
            toggleHl = { hlOn = !hlOn }, clearHl = { saveHl(emptySet()) }, tapSentence = { k -> saveHl(if (k in hlSet) hlSet - k else hlSet + k) },
            setTab = { k -> ui = ModelUi(k, ui.done, ui.annot, ui.saved, ui.notice, ui.band6Open, null, 0, 0, System.currentTimeMillis() % 100000) },
            toggleAnnot = { k ->
                val next = if (k in ui.annot) ui.annot - k else ui.annot + k
                ui = ModelUi(ui.tab, ui.done, next, ui.saved, ui.notice, ui.band6Open, ui.finish, ui.right, ui.total, ui.seed)
                scope.launch { env.putKv("annot2", JsonPrimitive(next.joinToString(" "))) }
            },
            saveChunk = { en, vi ->
                scope.launch {
                    env.updateBook { Models.saveChunk(it, m, en, vi, System.currentTimeMillis()) }
                    ui = ModelUi(ui.tab, ui.done, ui.annot, ui.saved + en, ui.notice, ui.band6Open, ui.finish, ui.right, ui.total, ui.seed)
                }
            },
            saveAll = {
                scope.launch {
                    val have = env.cards().keys
                    val fresh = Models.chunksOf(m.jstr("text")).count { it.first.lowercase() !in have }
                    env.updateBook { Models.saveAll(it, m, System.currentTimeMillis()).first }
                    ui = ModelUi(ui.tab, ui.done, ui.annot, Models.chunksOf(m.jstr("text")).map { it.first }.toSet(), t.s(L10nKey.modelSavedPhrasesToYour, "n" to fresh), ui.band6Open, ui.finish, ui.right, ui.total, ui.seed)
                }
            },
            listen = { env.speak(Models.plain(m.jstr("text"))) }, say = { env.speak(it) }, open = open,
            toggleBand6 = { ui = ModelUi(ui.tab, ui.done, ui.annot, ui.saved, ui.notice, !ui.band6Open, ui.finish, ui.right, ui.total, ui.seed) },
            redo = { ui = ModelUi(ui.tab, ui.done, ui.annot, ui.saved, ui.notice, ui.band6Open, null, 0, 0, ui.seed + 1) },
            finish = { kind, right, total ->
                val f = Models.finish(kind, right, total)
                val done = Models.markDone(ui.done, kind, f)
                ui = ModelUi(ui.tab, done, ui.annot, ui.saved, ui.notice, ui.band6Open, f, right, total, ui.seed)
                scope.launch { env.putModelDone(id, done) }
            },
        )
        ModelScreen(page, ui, tools, actions, onExit, HlState(hlOn, hlSet))
    }
}

/** The sentences of a model answer in reading order; their ordinals are what the free highlight stores. */
internal fun essaySentences(m: JsonObject): List<String> = Regex("[^.!?]+[.!?]+").findAll(Models.plain(m.jstr("text"))).map { it.value }.toList()

/**
 * A free highlight made on the web is stored as `{v, h}` with `h` = the annotated essay as HTML and the selections in `<mark class="uhl">`. Native marks whole sentences, so a sentence
 * counts as highlighted when its words and the marked words contain one another (tags, entities and punctuation ignored).
 */
fun hlFromHtml(h: String, sentences: List<String>): Set<Int> {
    fun nz(s: String) = s.lowercase().replace(Regex("[^a-z0-9]+"), " ").trim()
    val marks = Regex("<mark[^>]*class=[\"']?[^>\"']*\\buhl\\b[^>]*>([\\s\\S]*?)</mark>", RegexOption.IGNORE_CASE).findAll(h)
        .map { nz(it.groupValues[1].replace(Regex("<[^>]*>"), " ").replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"").replace("&#39;", "'")) }
        .filter { it.length >= 3 }.toList()
    if (marks.isEmpty()) return emptySet()
    val out = HashSet<Int>()
    sentences.forEachIndexed { i, s ->
        val n = nz(s); if (n.isEmpty()) return@forEachIndexed
        if (marks.any { m -> " $m ".contains(" $n ") || " $n ".contains(" $m ") }) out.add(i)
    }
    return out
}
