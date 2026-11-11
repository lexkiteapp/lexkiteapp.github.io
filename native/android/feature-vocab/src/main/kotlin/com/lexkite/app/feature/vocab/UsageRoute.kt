package com.lexkite.app.feature.vocab

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.foundation.background
import androidx.compose.ui.Modifier
import com.lexkite.app.core.usage.UEntry
import com.lexkite.app.core.usage.Usage
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.TopBar
import com.lexkite.app.ui.TopBarVariant
import kotlinx.coroutines.launch
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** Route `#/usage`, `#/usage?c=<prep|verb|adv|struct|pair>`, `#/usage/<word>`. */
@Composable
fun UsageRoute(env: WordEnv, arg: String, query: String, onExit: () -> Unit, open: (String) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    var reload by remember { mutableStateOf(0) }
    val usage by produceState<Usage?>(null, env, reload) { value = runCatching { env.usage() }.getOrNull() }
    val scope = rememberCoroutineScope()
    var cur by remember(arg, query) { mutableStateOf(arg) }
    var cat by remember(query) { mutableStateOf(Regex("(?:^|&)c=([^&]+)").find(query)?.groupValues?.get(1) ?: "") }
    var q by remember(arg) { mutableStateOf("") }
    var sub by remember(cat) { mutableStateOf("") }
    var filter by remember(cat) { mutableStateOf("") }
    var prep by remember(cat) { mutableStateOf("") }
    var seed by remember(cur, cat) { mutableLongStateOf(System.currentTimeMillis() % 100000) }
    var picks by remember(cur, cat, seed) { mutableStateOf<Map<Int, String>>(emptyMap()) }
    var saved by remember(cur) { mutableStateOf<Set<String>>(emptySet()) }
    var notice by remember(cur) { mutableStateOf<String?>(null) }
    DisposableEffect(Unit) { onDispose { env.stopAudio() } }

    val u = usage
    if (u == null || (u.indexSizes.first == 0 && u.counts().values.all { it.first == 0 })) {
        // loading, or offline with nothing cached yet
        Column(Modifier.fillMaxSize().background(c.background)) {
            TopBar(TopBarVariant.Inner, t(L10nKey.usageWordUsage), t, onExit)
            Box(Modifier.padding(16.dp)) { if (u != null) VNotice(t(L10nKey.syncOffline)) { reload++ } else VNotice(t(L10nKey.actionLoading)) }
        }
        return
    }
    val counts = remember(u) { u.counts().mapValues { it.value.first } }
    val actions = UsageActions(
        queryChange = { q = it }, go = { w -> if (w.isNotBlank()) { cur = w.trim(); cat = ""; q = "" } },
        openCat = { id -> cat = id; cur = "" }, setSub = { sub = it }, setFilter = { filter = it }, setPrep = { prep = it },
        say = { env.speak(it) },
        save = { w, vi ->
            scope.launch {
                val ok = runCatching { env.addWord(buildJsonObject { put("word", w); put("vi", vi); put("pos", "phrase"); put("emoji", "🧩"); put("topic", "phrases") }, null) }.isSuccess
                notice = if (ok) t.s(L10nKey.usageSavedToYourWords, "w" to w) else t(L10nKey.usageCouldnTSavePlease)
                if (ok) saved = saved + w
            }
        },
        pick = { i, ch -> picks = picks + (i to ch) }, again = { seed++ }, open = open,
    )
    val ui: UsageUi = when {
        cur.isNotBlank() -> {
            val key = u.resolve(cur)
            val look = key?.let { u.lookup(it) }
            if (key == null || look == null || look.count == 0) UsageUi.Fallback(Usage.norm(cur), (u.near(cur) + u.suggest(cur)).distinct().take(8), counts)
            else {
                val all = Usage.KINDS.flatMap { look.byKind[it] ?: emptyList() }
                val title = look.byKind["s"]?.firstOrNull { Usage.norm(it.key) == key }?.f ?: look.byKind["c"]?.firstOrNull { Usage.norm(it.key) == key }?.items?.joinToString(" / ") { it.h.substringBefore(" ") } ?: key
                UsageUi.Word(look, title, quizOf(u, all, seed, picks, L10nKey.usageQuickPractice), saved, notice)
            }
        }
        USAGE_CATS.any { it.id == cat } -> {
            val cd = USAGE_CATS.first { it.id == cat }
            val all = u.list(cd.kind)
            val f = Usage.norm(filter)
            val rows = all.filter { e -> keep(cd.kind, e, sub, prep, f) }
            UsageUi.Category(cd, rows, sub, filter, prep, quizOf(u, all, seed, picks, L10nKey.usageQuickPracticeWholeTopic))
        }
        else -> UsageUi.Landing(q, u.suggest(q, 8), counts)
    }
    val initialCat = remember(query) { Regex("(?:^|&)c=([^&]+)").find(query)?.groupValues?.get(1) ?: "" }
    UsageScreen(ui, actions, onExit = {
        when {
            cur.isNotBlank() && arg.isBlank() -> cur = ""
            cat.isNotEmpty() && initialCat.isEmpty() -> cat = ""
            else -> onExit()
        }
    })
}

private fun quizOf(u: Usage, entries: List<UEntry>, seed: Long, picks: Map<Int, String>, title: L10nKey): UsageQuiz? {
    val qs = runCatching { u.quiz(entries, 5, seed) }.getOrDefault(emptyList())
    return if (qs.size >= 3) UsageQuiz(qs, picks, title) else null
}

/** The category list filter of web usage.js `keep`. */
private fun keep(k: String, e: UEntry, sub: String, prep: String, q: String): Boolean {
    if (k == "p" && sub.isNotEmpty() && e.sub != sub) return false
    if (k == "p" && prep.isNotEmpty() && e.items.none { Usage.norm(it.h).split(" ").last() == prep }) return false
    if (k == "v" && sub.isNotEmpty()) {
        val codes = e.items.map { it.h }.toSet()
        val ok = if (sub == "both") codes.contains("to") && codes.contains("ing") && e.notes.isNotEmpty() else codes.contains(sub)
        if (!ok) return false
    }
    if (k == "a" && sub.isNotEmpty() && e.sub != sub) return false
    if (k == "s" && sub == "ielts" && e.reg.none { it.r == "academic" }) return false
    if (q.isNotEmpty()) {
        val hay = Usage.norm((listOf(e.key, e.f) + e.items.map { it.h } + e.k).joinToString(" "))
        if (!hay.contains(q)) return false
    }
    return true
}
