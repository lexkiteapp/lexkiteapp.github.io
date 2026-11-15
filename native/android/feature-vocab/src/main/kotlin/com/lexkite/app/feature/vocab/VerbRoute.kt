package com.lexkite.app.feature.vocab

import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import com.lexkite.app.core.verbs.Verbs
import kotlinx.serialization.json.JsonObject

/** Route `#/verb` and `#/verb/<verb>?t=<tense>`. [arg] is the typed verb (any inflected form works). */
@Composable
fun VerbRoute(env: WordEnv, arg: String, query: String, onExit: () -> Unit, open: (String) -> Unit) {
    val verbs by produceState<Verbs?>(null, env) { value = runCatching { env.verbs() }.getOrNull() }
    val defRegion by produceState("UK", env) { value = env.region() }
    var region by remember { mutableStateOf<String?>(null) }
    var cur by remember(arg) { mutableStateOf(arg) }
    var q by remember(arg) { mutableStateOf("") }
    var pattern by remember { mutableStateOf("") }
    var filter by remember { mutableStateOf("") }
    var pol by remember { mutableStateOf("aff") }
    var voice by remember { mutableStateOf("act") }
    val wantTense = remember(query) { Regex("(?:^|&)t=([^&]+)").find(query)?.groupValues?.get(1) }
    var openTense by remember(arg) { mutableStateOf(wantTense) }
    DisposableEffect(Unit) { onDispose { env.stopAudio() } }

    val v = verbs
    val reg = region ?: defRegion
    val actions = VerbActions(
        queryChange = { q = it }, go = { w -> if (w.isNotBlank()) { cur = w.trim(); q = ""; openTense = null } },
        setPattern = { pattern = it }, setFilter = { filter = it }, setRegion = { region = it },
        toggleTense = { id -> openTense = if (openTense == id) null else id }, setPol = { pol = it }, setVoice = { voice = it },
        say = { env.speak(it) }, open = open,
    )
    val irregular = remember(v) { v?.irregularList() ?: emptyList() }
    val page = remember(v, cur, reg) { if (v != null && cur.isNotBlank()) VerbPageData.of(v, cur, reg) else null }
    val ui: VerbUi = if (page != null) VerbUi.Page(page, reg, openTense, pol, voice) else {
        val bases = v?.irregularFilter(pattern, filter.trim().lowercase())?.toSet()
        val rows: List<JsonObject> = if (bases == null) emptyList() else irregular.filter { it.jstr("base") in bases }
        val sug = v?.suggest(q, 8)?.mapNotNull { (it as? JsonObject)?.let { o -> o.jstr("base") to o.jstr("via") } } ?: emptyList()
        VerbUi.Landing(q, sug, rows, pattern, filter)
    }
    LaunchedEffect(cur) { voice = "act" }
    VerbScreen(ui, actions, onExit)
}
