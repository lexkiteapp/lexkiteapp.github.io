package com.lexkite.app.feature.skills

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lexkite.app.core.mediate.MItem
import com.lexkite.app.core.mediate.MSource
import com.lexkite.app.core.mediate.Mediate
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.feature.vocab.Body
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

private val ACT = mapOf("relay" to L10nKey.medActRelay, "summarise" to L10nKey.medActSummarise, "explain-data" to L10nKey.medActExplain, "simplify" to L10nKey.medActSimplify, "notes" to L10nKey.medActNotes, "facilitate" to L10nKey.medActFacilitate)
private val KIND = mapOf("announcement" to L10nKey.medKindAnnouncement, "text" to L10nKey.medKindText, "notice" to L10nKey.medKindNotice, "talk" to L10nKey.medKindTalk, "dialogue" to L10nKey.medKindDialogue, "chart" to L10nKey.medKindChart)

class MediateListActions(val open: (String) -> Unit = {}, val exit: () -> Unit = {})
class MediateActions(
    val text: (String) -> Unit = {}, val play: () -> Unit = {}, val stop: () -> Unit = {}, val show: () -> Unit = {}, val check: () -> Unit = {}, val again: () -> Unit = {},
    val next: (String) -> Unit = {}, val list: () -> Unit = {}, val exit: () -> Unit = {},
)

// ---------------------------------------------------------------- list by level
@Composable
fun MediateListScreen(ui: MediateListUi, a: MediateListActions) {
    val tr = t; val pack = ui.pack
    StudyPage("🤝 " + tr(L10nKey.medTitle), a.exit) {
        Muted(tr(L10nKey.medIntro))
        if (ui.loaded && pack == null) Notice(tr(L10nKey.medLoadFail), ok = false)
        if (pack != null) for (lv in Mediate.LEVELS) {
            val xs = pack.items.filter { it.level == lv }; if (xs.isEmpty()) continue
            Body(lv, style = LKType.headlineSm)
            for (x in xs) {
                val s = ui.best[x.id]
                LKCard(onClick = { a.open(x.id) }, label = x.title) {
                    Flow { Tag(x.level); ACT[x.activity]?.let { Tag(tr(it)) }; if (x.speak) Tag("🎤 " + tr(L10nKey.medSpeak)) }
                    EnLtr { Body(x.title, style = LKType.titlePill) }
                    if (s != null) Muted("✓ " + tr(L10nKey.medScore, mapOf("a" to s.first, "b" to s.second)))
                }
            }
        }
    }
}

// ---------------------------------------------------------------- one lesson
@Composable
private fun SourceBlock(s: MSource) {
    EnLtr {
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            when (s.kind) {
                "chart" -> {
                    s.caption?.let { Muted(it) }
                    Column(Modifier.horizontalScroll(rememberScrollState())) {
                        Row { Body("", Modifier.heightIn(min = 32.dp).padding(end = 12.dp)); for (c in s.cols) Body(c, Modifier.padding(end = 12.dp), style = LKType.titlePill) }
                        for (r in s.rows) Row(Modifier.heightIn(min = 32.dp), verticalAlignment = Alignment.CenterVertically) {
                            Body(r.first(), Modifier.padding(end = 12.dp), style = LKType.titlePill)
                            for (v in r.drop(1)) Body(v + if (s.unit == "%") "%" else "", Modifier.padding(end = 12.dp))
                        }
                    }
                    s.note?.let { Muted(it) }
                }
                "dialogue" -> for ((who, line) in s.lines) Text(androidx.compose.ui.text.buildAnnotatedString { pushStyle(androidx.compose.ui.text.SpanStyle(fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)); append("$who: "); pop(); append(line) }, style = LKType.bodyMd.toCompose(), color = LocalLKColors.current.onSurface)
                else -> for (p in s.text) Body(p, style = LKType.bodyLg)
            }
        }
    }
}

@Composable
fun MediateScreen(ui: MediateUi, a: MediateActions) {
    val tr = t; val c = LocalLKColors.current; val x = ui.item
    if (x == null) {
        StudyPage("🤝 " + tr(L10nKey.medTitle), a.exit) {
            if (!ui.loaded) Muted(tr(L10nKey.actionLoading)) else { Notice(tr(L10nKey.medLoadFail), ok = false); GhostButton(tr(L10nKey.medList), a.list, Modifier.fillMaxWidth()) }
        }
        return
    }
    val r = ui.result
    val n = remember(ui.text) { Mediate.words(ui.text).size }
    val mx = x.maxWords; val over = mx != null && n > mx; val ok = n >= x.minWords && !over
    val need = tr(if (x.speak) L10nKey.medNeedSpeak else L10nKey.medNeedWrite, mapOf("n" to x.minWords))
    val long = tr(L10nKey.medTooLong, mapOf("n" to (mx ?: 0)))
    val hint = if (n < x.minWords) need else if (over) long else ""
    val listen = tr(L10nKey.medListen)
    StudyPage(tr(L10nKey.medTitle), a.exit, bottom = {
        if (r == null) {
            LKPrimaryButton(tr(L10nKey.medCheck), a.check, Modifier.fillMaxWidth(), enabled = n >= x.minWords)
            if (hint.isNotEmpty()) Muted(hint, Modifier.fillMaxWidth())
        } else {
            LKPrimaryButton(tr(L10nKey.medNext), { a.next(ui.nextId) }, Modifier.fillMaxWidth())
            GhostButton(tr(L10nKey.medRetry), a.again, Modifier.fillMaxWidth())
        }
    }) {
        Flow { Tag(x.level); ACT[x.activity]?.let { Tag(tr(it)) } }
        EnLtr { Body(x.title, style = LKType.headlineSm) }
        LKCard { EnLtr { Body(x.scenario) } }
        LKCard {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Body((KIND[x.source.kind]?.let { tr(it) } ?: "Email"), Modifier.weight(1f), style = LKType.titlePill)
                if (x.source.kind != "chart") SpeakButton(if (ui.playing) a.stop else a.play, label = listen)
            }
            if (ui.shown) SourceBlock(x.source)
            else {
                Muted("🎧 " + tr(L10nKey.medListenFirst))
                GhostButton(tr(L10nKey.medShowText), a.show)
            }
        }
        LKCard {
            Body(tr(L10nKey.medTask), style = LKType.titlePill)
            Flow { Tag(tr(L10nKey.medSendTo) + ": " + x.audience) }
            EnLtr { Body(x.prompt) }
            StudyField(ui.text, a.text, tr(if (x.speak) L10nKey.medPhSpeak else L10nKey.medPhWrite), singleLine = false, minHeight = if (x.speak) 112.dp else 160.dp, enabled = r == null)
            Text(tr(L10nKey.medCount, mapOf("n" to n, "r" to Mediate.range(x))), color = if (ok) c.success else if (over) c.error else c.onSurfaceVariant, style = LKType.labelMetric.toCompose())
        }
        if (r != null) Result(x, ui)
    }
}

@Composable
private fun Result(x: MItem, ui: MediateUi) {
    val tr = t; val c = LocalLKColors.current; val r = ui.result ?: return
    val has = tr(L10nKey.medHas); val missing = tr(L10nKey.medMissing); val dropSr = tr(L10nKey.medDropSr)
    LKCard {
        Body(tr(L10nKey.medScore, mapOf("a" to r.got, "b" to r.of)), style = LKType.headlineSm)
        for (p in r.points) {
            val d = (if (p.ok) has else missing) + " " + p.idea
            Row(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = d }, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Text(if (p.ok) "✓" else "✗", color = if (p.ok) c.success else c.error, style = LKType.titlePill.toCompose())
                EnLtr { Body(p.idea, Modifier.weight(1f)) }
            }
        }
        if (r.extra.isNotEmpty()) {
            Body(tr(L10nKey.medDrop), style = LKType.titlePill)
            for (s in r.extra) Row(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = "$dropSr $s" }, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Text("ℹ", color = c.onSurfaceVariant, style = LKType.titlePill.toCompose()); EnLtr { Body(s, Modifier.weight(1f)) }
            }
        }
        if (r.copied.isNotEmpty()) { Muted("💡 " + tr(L10nKey.medCopied)); EnLtr { Body("“${r.copied}…”") } }
        val mx = x.maxWords
        if (!r.inRange && mx != null && r.n > mx) Muted("💡 " + tr(L10nKey.medTooLong, mapOf("n" to mx)))
        if (x.explain.isNotEmpty()) EnLtr { Muted(x.explain) }
    }
    LKCard { Body(tr(L10nKey.medModel), style = LKType.titlePill); EnLtr { Body(x.model, style = LKType.bodyLg) } }
    if (x.useful.isNotEmpty()) LKCard { Body(tr(L10nKey.medUseful), style = LKType.titlePill); EnLtr { Column(verticalArrangement = Arrangement.spacedBy(4.dp)) { for (u in x.useful) Body("• $u") } } }
    if (x.tips.isNotEmpty()) LKCard { Body(tr(L10nKey.medTips), style = LKType.titlePill); EnLtr { Column(verticalArrangement = Arrangement.spacedBy(4.dp)) { for (u in x.tips) Body("• $u") } } }
}

// ---------------------------------------------------------------- route
/** `mediate` (list by level) and `mediate/<id>` (lesson; an unknown id shows the load-failed card with a back-to-list button). */
@Composable
fun MediateRoute(env: SkillsEnv, arg: String, open: (String) -> Unit, exit: () -> Unit) {
    if (arg.isEmpty()) {
        val vm: MediateListVm = viewModel(key = "mediate-list", factory = MediateListVm.Factory(env))
        MediateListScreen(vm.ui, MediateListActions(open = { open("mediate/$it") }, exit = exit))
    } else {
        val vm: MediateVm = viewModel(key = "mediate-$arg", factory = MediateVm.Factory(env, arg))
        MediateScreen(vm.ui, MediateActions(text = { vm.text(it) }, play = { vm.play() }, stop = { vm.stopPlay() }, show = { vm.show() }, check = { vm.check() }, again = { vm.again() },
            next = { open("mediate/$it") }, list = { open("mediate") }, exit = exit))
    }
}
