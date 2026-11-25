package com.lexkite.app.feature.interpret

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.interpret.Interpret
import com.lexkite.app.design.CardShape
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.Chip
import com.lexkite.app.feature.vocab.Confirm
import com.lexkite.app.feature.vocab.EmptyState
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.Notice
import com.lexkite.app.feature.vocab.PickerDialog
import com.lexkite.app.feature.vocab.Tag
import com.lexkite.app.feature.vocab.t
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.TopBar
import com.lexkite.app.ui.TopBarVariant

@Composable private fun Msg.text(): String = t(key, vars)
@Composable private fun groupName(g: String): String = t(when (g) { "hi" -> L10nKey.interpretGHi; "go" -> L10nKey.interpretGGo; "eat" -> L10nKey.interpretGEat; "stay" -> L10nKey.interpretGStay; else -> L10nKey.interpretGSos })
@Composable private fun Dir(lang: String, content: @Composable () -> Unit) = CompositionLocalProvider(LocalLayoutDirection provides if (Interpret.rtl(lang)) LayoutDirection.Rtl else LayoutDirection.Ltr) { content() }

/** The three doors of the Interpreter (face to face · phrasebook · history). */
@Composable
fun InterpretTabs(cur: String, open: (String) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        for ((r, k) in listOf("interpret" to L10nKey.interpretFaceToFace, "interpret/phrases" to L10nKey.interpretPhrasebook, "interpret/history" to L10nKey.interpretHistory))
            Chip(t(k), cur == r, { if (cur != r) open(r) })
    }
}

@Composable
private fun RoundAction(emoji: String, label: String, enabled: Boolean, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Box(Modifier.size(48.dp).clip(CircleShape).background(if (enabled) c.secondaryContainer else c.cardHigh).let { if (enabled) it.tactile(onClick, label) else it }.semantics { contentDescription = label }, contentAlignment = Alignment.Center) {
        Text(emoji, style = LKType.headlineSm.toCompose(), color = if (enabled) c.onSecondaryContainer else c.onSurfaceVariant)
    }
}

@Composable
private fun LangButton(lang: String, onClick: () -> Unit) {
    val t = t; GhostButton(t.nativeName(lang) + " ▾", onClick, Modifier.semantics { contentDescription = t(L10nKey.interpretChooseLang) + ": " + t.nativeName(lang) })
}

@Composable
private fun LangPicker(sel: String, onPick: (String) -> Unit, onClose: () -> Unit) {
    val t = t; PickerDialog(t(L10nKey.interpretChooseLang), Interpret.CODES.map { it to t.nativeName(it) }, sel, { onPick(it); onClose() }, onClose)
}

/** State of the face-to-face screen (a snapshot of [TalkVm]; tests build it directly). */
data class TalkUi(val pair: Interpret.Pair2, val heard: Map<String, String>, val live: Map<String, String>, val listening: String?, val busy: Boolean, val hasLast: Boolean, val badge: Pair<String, Boolean>?, val score: Msg?, val toast: Msg?, val packBusy: Boolean, val canListen: Boolean = true)
class TalkActions(val mic: (String) -> Unit = {}, val lang: (String, String) -> Unit = { _, _ -> }, val swap: () -> Unit = {}, val play: () -> Unit = {}, val slow: () -> Unit = {}, val save: () -> Unit = {}, val say: () -> Unit = {},
                  val pack: () -> Unit = {}, val finish: () -> Unit = {}, val open: (String) -> Unit = {}, val exit: () -> Unit = {})

/** One half of the screen: its language, what was said to this person (translation), the live words and ITS mic. The top half is turned 180° for the person opposite. */
@Composable
private fun Half(side: String, ui: TalkUi, a: TalkActions, turned: Boolean, modifier: Modifier) {
    val c = LocalLKColors.current; val lang = Interpret.lang(ui.pair, side); val on = ui.listening == side; var pick by remember { mutableStateOf(false) }
    Dir(lang) {
        Column(modifier.fillMaxWidth().graphicsLayer { if (turned) rotationZ = 180f }.clip(CardShape).background(c.card).border(2.dp, if (on) c.error else c.outlineVariant, CardShape).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                LangButton(lang) { pick = true }
                val b = ui.badge; if (b != null && b.first == side) Tag(if (b.second) t(L10nKey.interpretOnDevice) else t(L10nKey.interpretOnline))
            }
            val heard = ui.heard[side].orEmpty(); val live = ui.live[side].orEmpty()
            Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.Center) {
                if (heard.isNotEmpty()) Body(heard, style = LKType.headlineSm, modifier = Modifier.semantics { liveRegionPolite() })
                else Muted(t(L10nKey.interpretPlaceholder))
                if (live.isNotEmpty() && live != heard) Muted(live)
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                val lbl = if (on) t(L10nKey.interpretListening) else t(L10nKey.interpretTapToSpeak)
                Box(Modifier.size(64.dp).clip(CircleShape).background(if (on) c.error else if (ui.canListen && !ui.busy) c.primary else c.cardHigh).let { if (ui.canListen && !ui.busy) it.tactile({ a.mic(side) }, lbl) else it }.semantics { contentDescription = lbl }, contentAlignment = Alignment.Center) {
                    Text(if (on) "⏹" else "🎙️", style = LKType.headlineSm.toCompose(), color = if (on) c.onError else c.onPrimary)
                }
                Body(lbl, Modifier.weight(1f), color = c.onSurfaceVariant, style = LKType.bodySm)
            }
        }
        if (pick) LangPicker(lang, { a.lang(side, it) }) { pick = false }
    }
}
private fun androidx.compose.ui.semantics.SemanticsPropertyReceiver.liveRegionPolite() { liveRegion = androidx.compose.ui.semantics.LiveRegionMode.Polite }

@Composable
fun TalkScreen(ui: TalkUi, a: TalkActions) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Inner, t(L10nKey.interpretTitle), t, a.exit)
        InterpretTabs("interpret", a.open)
        Column(Modifier.weight(1f).fillMaxWidth().padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Half("b", ui, a, turned = true, modifier = Modifier.weight(1f))
            Row(Modifier.fillMaxWidth().semantics { contentDescription = t(L10nKey.interpretLatest) }, horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
                RoundAction("⇅", t(L10nKey.interpretSwap), true, a.swap)
                RoundAction("🔊", t(L10nKey.lessonReplay), ui.hasLast, a.play)
                RoundAction("🐢", t(L10nKey.lessonSlowShort), ui.hasLast, a.slow)
                RoundAction("📒", t(L10nKey.interpretSave), ui.hasLast, a.save)
                RoundAction("🗣️", t(L10nKey.interpretSayBack), ui.hasLast && ui.canListen, a.say)
            }
            val s = ui.score; if (s != null) Body(s.text(), color = c.onSurfaceVariant, style = LKType.bodySm, modifier = Modifier.fillMaxWidth().semantics { liveRegionPolite() })
            val m = ui.toast; if (m != null) Notice(m.text(), ok = m.key in OK_MSGS)
            Half("a", ui, a, turned = false, modifier = Modifier.weight(1f))
        }
        Column(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            GhostButton(t(L10nKey.interpretDownloadPack), a.pack, Modifier.fillMaxWidth(), enabled = !ui.packBusy)
            LKPrimaryButton(t(L10nKey.interpretFinish), a.finish)
            Muted(t(L10nKey.interpretNote), Modifier.fillMaxWidth(), TextAlign.Center)
        }
    }
}
private val OK_MSGS = setOf(L10nKey.interpretSaved, L10nKey.interpretReady, L10nKey.interpretDownloading)

// ---------------- phrasebook ----------------
data class PhrasesUi(val pair: Interpret.Pair2, val book: Interpret.Phrases?, val failed: Boolean, val group: String, val score: Msg?, val toast: Msg?, val saying: Boolean = false)
class PhrasesActions(val open: (String) -> Unit = {}, val group: (String) -> Unit = {}, val lang: (String, String) -> Unit = { _, _ -> }, val play: (Int, Boolean) -> Unit = { _, _ -> }, val save: (Int) -> Unit = {}, val say: (Int) -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun PhrasesScreen(ui: PhrasesUi, a: PhrasesActions) {
    val c = LocalLKColors.current; var pick by remember { mutableStateOf<String?>(null) }
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Inner, t(L10nKey.interpretTravelPhrases), t, a.exit)
        InterpretTabs("interpret/phrases", a.open)
        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                LangButton(ui.pair.a) { pick = "a" }; Text("→", color = c.onSurfaceVariant); LangButton(ui.pair.b) { pick = "b" }
            }
            val book = ui.book
            if (ui.failed) EmptyState("🧳", t(L10nKey.interpretPhrasesFail), action = null, onAction = null)
            else if (book != null) {
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { for (g in book.order) Chip(groupName(g), g == ui.group, { a.group(g) }) }
                book.group(ui.group).forEachIndexed { i, o ->
                    LKCard {
                        Dir(ui.pair.a) { Body(o[ui.pair.a].orEmpty(), color = c.onSurfaceVariant, modifier = Modifier.fillMaxWidth()) }
                        Dir(ui.pair.b) { Body(o[ui.pair.b].orEmpty(), style = LKType.headlineSm, modifier = Modifier.fillMaxWidth()) }
                        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                            RoundAction("🔊", t(L10nKey.lessonKindListen), true) { a.play(i, false) }
                            RoundAction("🐢", t(L10nKey.lessonSlowShort), true) { a.play(i, true) }
                            RoundAction("📒", t(L10nKey.interpretSave), true) { a.save(i) }
                            RoundAction("🗣️", t(L10nKey.interpretSayBack), !ui.saying) { a.say(i) }
                        }
                    }
                }
            }
            ui.score?.let { Body(it.text(), color = c.onSurfaceVariant, style = LKType.bodySm, modifier = Modifier.semantics { liveRegionPolite() }) }
            ui.toast?.let { Notice(it.text(), ok = it.key in OK_MSGS) }
        }
    }
    pick?.let { s -> LangPicker(Interpret.lang(ui.pair, s), { a.lang(s, it) }) { pick = null } }
}

// ---------------- history + recap ----------------
class HistoryActions(val open: (String) -> Unit = {}, val clear: () -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun HistoryScreen(convs: List<Interpret.Conv>?, a: HistoryActions) {
    val c = LocalLKColors.current; val tr = t; var ask by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Inner, tr(L10nKey.interpretHistoryTitle), tr, a.exit)
        InterpretTabs("interpret/history", a.open)
        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            if (convs != null && convs.isEmpty()) EmptyState("🗣️", tr(L10nKey.interpretEmpty))
            convs?.forEach { cv ->
                LKCard(onClick = { a.open("interpret/recap/${cv.id}") }, label = tr.nativeName(cv.a) + " ⇄ " + tr.nativeName(cv.b)) {
                    Body(tr.nativeName(cv.a) + " ⇄ " + tr.nativeName(cv.b), style = LKType.titlePill)
                    Muted(java.text.DateFormat.getDateTimeInstance(java.text.DateFormat.MEDIUM, java.text.DateFormat.SHORT, tr.locale).format(java.util.Date(cv.t)) + " · " + tr(L10nKey.skillQtNCau, mapOf("n" to cv.turns.size)))
                }
            }
            if (!convs.isNullOrEmpty()) GhostButton(tr(L10nKey.interpretClearHistory), { ask = true }, Modifier.fillMaxWidth(), ink = c.error)
        }
    }
    if (ask) Confirm(tr(L10nKey.interpretConfirmClear), tr(L10nKey.interpretClearHistory), tr(L10nKey.actionCancel), { ask = false; a.clear() }, { ask = false })
}

class RecapActions(val open: (String) -> Unit = {}, val speak: (Interpret.Card) -> Unit = {}, val saveAll: () -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun RecapScreen(cards: List<Interpret.Card>, keywords: List<String>, foreign: String, toast: Msg?, a: RecapActions) {
    val c = LocalLKColors.current; val tr = t
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Inner, tr(L10nKey.interpretRecapTitle), tr, a.exit)
        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            LKCard {
                Body(tr(L10nKey.interpretWorth), style = LKType.headlineSm)
                if (cards.isEmpty()) Muted(tr(L10nKey.interpretNoCards))
                cards.forEach { x ->
                    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                        Column(Modifier.weight(1f)) { Dir(x.lang) { Body(x.word, style = LKType.titlePill, modifier = Modifier.fillMaxWidth()) }; Muted(x.def) }
                        RoundAction("🔊", tr(L10nKey.lessonKindListen), true) { a.speak(x) }
                    }
                }
            }
            if (keywords.isNotEmpty()) LKCard {
                Body(tr(L10nKey.skillReadTuKhoa), style = LKType.headlineSm)
                Dir(foreign) { com.lexkite.app.feature.vocab.Flow { keywords.forEach { Tag(it) } } }
            }
            toast?.let { Notice(it.text(), ok = true) }
        }
        Column(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            if (cards.isNotEmpty()) LKPrimaryButton(tr(L10nKey.interpretSaveN, mapOf("n" to cards.size)), a.saveAll)
            GhostButton(tr(L10nKey.interpretNewConv), { a.open("interpret") }, Modifier.fillMaxWidth())
        }
    }
}
