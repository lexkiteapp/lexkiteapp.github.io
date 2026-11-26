package com.lexkite.app.feature.skills

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lexkite.app.core.watch.WItem
import com.lexkite.app.core.watch.WTopic
import com.lexkite.app.core.watch.Watch
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKProgress
import com.lexkite.app.design.LKSectionHeader
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.Chip
import com.lexkite.app.feature.vocab.EnLtr
import com.lexkite.app.feature.vocab.Flow
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.Notice
import com.lexkite.app.feature.vocab.SpeakButton
import com.lexkite.app.feature.vocab.StudyField
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.Tag
import com.lexkite.app.feature.vocab.t
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

private fun JsonObject?.str(k: String) = (this?.get(k) as? JsonPrimitive)?.content.orEmpty()

/** The pictures of the watch screens come from :app (RemoteImage); the default is a flat placeholder (snapshots, previews). */
class WatchSlots(val thumb: @Composable (url: String, modifier: Modifier) -> Unit = { _, m -> Box(m.background(LocalLKColors.current.cardLow)) })

class WatchHubActions(
    val find: (String) -> Unit = {}, val level: (Int) -> Unit = {}, val dur: (String) -> Unit = {}, val acc: (String) -> Unit = {}, val pace: (String) -> Unit = {}, val cc: (Boolean) -> Unit = {},
    val topic: (String) -> Unit = {}, val query: (String) -> Unit = {}, val close: () -> Unit = {}, val card: (WItem) -> Unit = {}, val hist: (String) -> Unit = {}, val exit: () -> Unit = {},
)

private fun rateLabel(r: Double) = (if (r == Math.floor(r)) r.toInt().toString() else r.toString()) + "×"

// ---------------------------------------------------------------- #/watch hub
@Composable
fun WatchHubScreen(ui: WatchHubUi, a: WatchHubActions, slots: WatchSlots = WatchSlots()) {
    val x = ui.x; val tr = t
    StudyPage(t(L10nKey.watchTitle), a.exit) {
        Muted(t(L10nKey.watchPitch))
        var text by remember { mutableStateOf("") }
        LKCard {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                StudyField(text, { v -> val paste = v.length - text.length > 1; text = v; if (paste && Watch.ytParse(v) != null) a.find(v) }, t(L10nKey.watchFind), Modifier.weight(1f), ime = androidx.compose.ui.text.input.ImeAction.Search, onDone = { a.find(text) })
                GhostButton(t(L10nKey.watchSearch), { a.find(text) })
            }
        }
        if (x != null) Column(Modifier.semantics { contentDescription = tr(L10nKey.watchFilters) }, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Flow {
                Chip(tr(L10nKey.watchLvAuto, mapOf("l" to x.levels.getOrElse(ui.auto - 1) { "A2" })), ui.f.lv == 0, { a.level(0) })
                for ((i, l) in x.levels.withIndex()) Chip(l, ui.f.lv == i + 1, { a.level(i + 1) })
            }
            Flow {
                FilterPicker(x.filters["dur"].orEmpty().map { it.first to tr.src(it.second) }, ui.f.dur, a.dur)
                FilterPicker(x.filters["acc"].orEmpty().map { it.first to tr.src(it.second) }, ui.f.acc, a.acc)
                FilterPicker(x.filters["pace"].orEmpty().map { it.first to tr.src(it.second) }, ui.f.pace, a.pace)
            }
            SwitchRow(tr(L10nKey.watchCc), ui.f.cc, onChange = a.cc)
        }
        ui.run?.let { r -> RunBlock(r, a, slots) }
        if (ui.hist.isNotEmpty()) { LKSectionHeader(t(L10nKey.watchContinue)); CardRow { for (h in ui.hist) VideoCard(WItem(h.id, h.title, h.ch), h.pos, h.len, slots, { a.hist(h.id) }) } }
        if (x != null) {
            LKSectionHeader(t(L10nKey.watchForYou)); for (tp in ui.forYou) TopicCard(tp, x.levels, a)
            LKSectionHeader(t(L10nKey.watchAllTopics)); for (tp in x.topics) TopicCard(tp, x.levels, a)
        }
        val uri = LocalUriHandler.current
        Muted(t(L10nKey.watchLegal))
        Flow { GhostButton("YouTube ToS", { uri.openUri("https://www.youtube.com/t/terms") }); GhostButton("Google Privacy", { uri.openUri("https://policies.google.com/privacy") }) }
    }
}

@Composable
private fun RunBlock(r: WRun, a: WatchHubActions, slots: WatchSlots) {
    val c = LocalLKColors.current; val uri = LocalUriHandler.current; val close = t(L10nKey.actionClose)
    LKCard(fill = c.surfaceContainerHighest) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Body(t.src(r.label), style = LKType.headlineSm, modifier = Modifier.weight(1f))
            GhostButton("✕", a.close, Modifier.semantics { contentDescription = close })
        }
        if (r.topic != null) Flow { for (q in r.topic.q) Chip(q, false, { a.query(q) }) }
        val items = r.items
        if (items == null) CardRow { repeat(4) { Box(Modifier.width(CARD_W).aspectRatio(16f / 9f).clip(RoundedCornerShape(12.dp)).background(c.cardHigh)) } }
        else if (items.isEmpty()) Muted(t(if (r.offline) L10nKey.watchOffline else L10nKey.watchNoVideos))
        else CardRow { for (it in items) VideoCard(it, 0, 0, slots, { a.card(it) }) }
        Muted(t(L10nKey.watchMore))
        GhostButton(t(L10nKey.watchOpenYt), { uri.openUri(r.yt) })
    }
}

private val CARD_W = 200.dp

@Composable
private fun CardRow(content: @Composable () -> Unit) = Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) { content() }

/** Thumbnail (16:9, duration badge, progress bar of a started video), title, channel, CC. */
@Composable
private fun VideoCard(it: WItem, pos: Int, len: Int, slots: WatchSlots, onClick: () -> Unit) {
    val c = LocalLKColors.current; val title = it.title.ifEmpty { t(L10nKey.watchVideo) }
    Column(Modifier.width(CARD_W).tactile(onClick, title).semantics(mergeDescendants = true) {}, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Box(Modifier.fillMaxWidth().aspectRatio(16f / 9f).clip(RoundedCornerShape(12.dp))) {
            slots.thumb("https://i.ytimg.com/vi/${it.id}/mqdefault.jpg", Modifier.matchParentSize())
            if (it.sec > 0) Text(Watch.fmt(it.sec), Modifier.align(Alignment.BottomEnd).padding(4.dp).clip(RoundedCornerShape(6.dp)).background(c.surfaceContainerHighest).padding(horizontal = 6.dp, vertical = 2.dp), style = LKType.labelBadge.toCompose(), color = c.onSurface)
            if (pos > 0) LKProgress(pos.toFloat() / maxOf(1, if (len > 0) len else pos), Modifier.align(Alignment.BottomCenter))
        }
        Body(title, style = LKType.titlePill, maxLines = 2)
        if (it.ch.isNotEmpty() || it.cc) Muted(it.ch + (if (it.cc) (if (it.ch.isEmpty()) "CC" else " · CC") else ""))
    }
}

@Composable
private fun TopicCard(tp: WTopic, levels: List<String>, a: WatchHubActions) {
    val tr = t
    LKCard(onClick = { a.topic(tp.id) }, label = tr.src(tp.name)) {
        Flow { Body(tr.src(tp.name), style = LKType.titlePill); Tag(levels.getOrElse(tp.lvLo - 1) { "" } + "–" + levels.getOrElse(tp.lvHi - 1) { "" }) }
        Muted(tr.src(tp.desc))
    }
}

/** A filter dropdown: the first option ("any") names it for TalkBack, like the web's hidden label. */
@Composable
private fun FilterPicker(options: List<Pair<String, String>>, value: String, onPick: (String) -> Unit) = Picker(options.firstOrNull()?.second.orEmpty(), options, value, onPick)

/** A dropdown of (value, label) options; the button shows the current label. */
@Composable
private fun Picker(label: String, options: List<Pair<String, String>>, value: String, onPick: (String) -> Unit) {
    val c = LocalLKColors.current
    var open by remember { mutableStateOf(false) }
    val cur = options.firstOrNull { it.first == value }?.second ?: options.firstOrNull()?.second.orEmpty()
    Box(Modifier.semantics(mergeDescendants = true) { contentDescription = "$label: $cur" }) {
        Chip("$cur ▾", false, { open = true })
        DropdownMenu(open, { open = false }, containerColor = c.card) { for ((v, l) in options) DropdownMenuItem(text = { Text(l, color = c.onSurface) }, onClick = { open = false; onPick(v) }) }
    }
}

// ---------------------------------------------------------------- #/watch/<id> player
class WatchPlayerActions(
    val playPause: () -> Unit = {}, val back5: () -> Unit = {}, val rate: (Double) -> Unit = {}, val markA: () -> Unit = {}, val markB: () -> Unit = {}, val loop: () -> Unit = {},
    val word: (String) -> Unit = {}, val sentence: (String) -> Unit = {}, val lookup: () -> Unit = {}, val save: () -> Unit = {}, val speak: () -> Unit = {}, val details: (String) -> Unit = {},
    val note: (String) -> Unit = {}, val addNote: () -> Unit = {}, val seek: (Int) -> Unit = {}, val delNote: (Int) -> Unit = {}, val exit: () -> Unit = {},
)

/** [player] draws the YouTube player box (the real WebView in the app, a fixed placeholder in snapshots); nothing is ever drawn over it. */
@Composable
fun WatchPlayerScreen(ui: WatchPlayerUi, a: WatchPlayerActions, player: @Composable (Modifier) -> Unit) {
    val tr = t; val uri = LocalUriHandler.current
    StudyPage(tr(L10nKey.watchTitle), a.exit) {
        EnLtr {
            Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                player(Modifier.fillMaxWidth().heightIn(min = 200.dp).aspectRatio(16f / 9f).clip(RoundedCornerShape(12.dp)))
                if (ui.ready) Box(Modifier.semantics { contentDescription = tr(L10nKey.watchControls) }) { Controls(ui, a) }
            }
        }
        if (ui.hint) Notice(tr(L10nKey.watchAbHint))
        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) { Body(ui.title.ifEmpty { tr(L10nKey.watchVideo) }, style = LKType.headlineSm); if (ui.ch.isNotEmpty()) Muted(ui.ch) }
        if (ui.failed) Notice(tr(L10nKey.watchCantPlay), ok = false)
        LookupCard(ui, a)
        LKCard {
            Body(tr(L10nKey.watchNotesTitle), style = LKType.titlePill)
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                StudyField(ui.note, a.note, tr(L10nKey.watchNotePh), Modifier.weight(1f), onDone = a.addNote)
                GhostButton(tr(L10nKey.vocabAdd), a.addNote, enabled = ui.note.isNotBlank())
            }
            if (ui.notes.isEmpty()) Muted(tr(L10nKey.watchNoNotes))
            for ((i, n) in ui.notes.withIndex()) Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Chip(Watch.fmt(n.t), false, { a.seek(n.t) })
                Body(n.text, Modifier.weight(1f))
                val del = tr(L10nKey.watchDelNote)
                GhostButton("✕", { a.delNote(i) }, Modifier.semantics { contentDescription = del })
            }
        }
        LKCard {
            Body("✨ " + tr(L10nKey.watchExt), style = LKType.bodyMd)
            GhostButton(tr(L10nKey.watchOpenYt), { uri.openUri(Watch.ytUrl(ui.id, ui.ytAt)) })
        }
    }
}

/** Back 5 s · play / pause · speed · A · B · loop. Control order stays left-to-right (a media bar does not mirror). */
@Composable
private fun Controls(ui: WatchPlayerUi, a: WatchPlayerActions) {
    val tr = t; val back = tr(L10nKey.watchBack5); val play = tr(L10nKey.watchPlay)
    val ab = if (ui.a != null && ui.b != null) "${Watch.fmt(ui.a)} → ${Watch.fmt(ui.b)}" else if (ui.a != null) "${Watch.fmt(ui.a)} → …" else tr(L10nKey.watchAb)
    Flow {
        GhostButton("↺ 5s", a.back5, Modifier.semantics { contentDescription = back })
        GhostButton(if (ui.playing) "❚❚" else "▶", a.playPause, Modifier.semantics { contentDescription = play })
        Picker(tr(L10nKey.skillListenTocDo), Watch.RATES.map { it.toString() to rateLabel(it) }, ui.rate.toString(), { a.rate(it.toDouble()) })
        GhostButton("A", a.markA); GhostButton("B", a.markB)
        Chip("↻ $ab", ui.loop, a.loop)
    }
}

@Composable
private fun LookupCard(ui: WatchPlayerUi, a: WatchPlayerActions) {
    val tr = t; val l = ui.lookup
    LKCard {
        Body(tr(L10nKey.watchLookupTitle), style = LKType.titlePill)
        StudyField(ui.word, a.word, tr(L10nKey.watchWordPh), onDone = a.lookup)
        StudyField(ui.sentence, a.sentence, tr(L10nKey.watchSentence))
        GhostButton(tr(L10nKey.watchLookup), a.lookup, enabled = ui.word.isNotBlank())
        if (l != null) {
            val e = l.entry
            when {
                l.loading -> Muted(tr(L10nKey.lessonStoryLookup, mapOf("w" to l.word)))
                e == null -> Muted(tr(L10nKey.lessonStoryNotFound, mapOf("w" to l.word)))
                else -> {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                        EnLtr { Body(e.str("word").ifEmpty { l.word }, style = LKType.headlineSm) }
                        if (e.str("ipa").isNotEmpty()) EnLtr { Muted(e.str("ipa")) }
                        Box(Modifier.weight(1f))
                        SpeakButton(a.speak, label = tr(L10nKey.lessonKindListen))
                    }
                    if (l.translation.isNotEmpty()) Body(l.translation, style = LKType.bodyLg)
                    Flow {
                        GhostButton(if (l.done) "✓ " + tr(L10nKey.revSaved) else "+ " + tr(if (l.inDeck) L10nKey.dictAddContext else L10nKey.dictSaveFlashcard), a.save, enabled = !l.done)
                        GhostButton(tr(L10nKey.watchFullMeaning), { a.details(e.str("word").ifEmpty { l.word }) })
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------- route
/** `watch` (hub) and `watch/<id or YouTube link>[?t=<s>]` (player). [open] navigates to another web-style route, [exit] goes back. */
@Composable
fun WatchRoute(env: SkillsEnv, arg: String, q: Map<String, String>, slots: WatchSlots, open: (String) -> Unit, exit: () -> Unit) {
    val y = remember(arg) { Watch.ytParse(arg) }
    if (y == null) {
        val vm: WatchHubVm = viewModel(key = "watch-hub-" + q.toSortedMap(), factory = WatchHubVm.Factory(env, q))
        val ui = vm.ui; val f = ui.f
        WatchHubScreen(ui, WatchHubActions(
            find = { vm.find(it, open) }, level = { vm.filters(f.copy(lv = it)) }, dur = { vm.filters(f.copy(dur = it)) }, acc = { vm.filters(f.copy(acc = it)) }, pace = { vm.filters(f.copy(pace = it)) }, cc = { vm.filters(f.copy(cc = it)) },
            topic = { vm.topic(it) }, query = { vm.query(it) }, close = { vm.close() }, card = { vm.pick(it.id, it.title, it.ch, vm.topicOfRun, open) },
            hist = { id -> val h = ui.hist.first { it.id == id }; vm.pick(h.id, h.title, h.ch, h.topic, open) }, exit = exit), slots)
    } else {
        val start = q["t"]?.toIntOrNull() ?: y.t
        val vm: WatchPlayerVm = viewModel(key = "watch-${y.id}-$start", factory = WatchPlayerVm.Factory(env, y.id, start))
        val ui = vm.ui; val lang = com.lexkite.app.design.LocalL10n.current.lang
        WatchPlayerScreen(ui, WatchPlayerActions(
            playPause = { vm.playPause() }, back5 = { vm.back5() }, rate = { vm.rate(it) }, markA = { vm.markA() }, markB = { vm.markB() }, loop = { vm.toggleLoop() },
            word = { vm.word(it) }, sentence = { vm.sentence(it) }, lookup = { vm.lookup() }, save = { vm.saveWord() }, speak = { vm.speakWord() }, details = { open("dict/" + android.net.Uri.encode(it)) },
            note = { vm.note(it) }, addNote = { vm.addNote() }, seek = { vm.seekTo(it) }, delNote = { vm.delNote(it) }, exit = exit),
        ) { m -> if (ui.loaded) WatchWebPlayer(vm, env.watchPlayerHtml(), y.id, ui.start, lang, m) else Box(m.background(LocalLKColors.current.cardLow)) }
    }
}
