package com.lexkite.app.feature.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.Quiz
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Style
import androidx.compose.material.icons.filled.UnfoldMore
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.LocalReduceMotion
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.delay

private fun modeKey(m: String) = when (m) {
    "learn" -> L10nKey.revSmartStudy; "mcq" -> L10nKey.revMultipleChoice; "cloze" -> L10nKey.revFillInTheBlank; "listen" -> L10nKey.revListenType
    "test" -> L10nKey.revTest; "match" -> L10nKey.revMatch; else -> L10nKey.revPronunciation
}
private fun modeIcon(m: String): ImageVector = when (m) {
    "learn" -> Icons.Filled.School; "mcq" -> Icons.Filled.Checklist; "cloze" -> Icons.Filled.Edit; "listen" -> Icons.Filled.Headphones
    "test" -> Icons.Filled.Quiz; "match" -> Icons.Filled.Style; else -> Icons.Filled.Mic
}
private val MODES = listOf("learn", "mcq", "cloze", "listen", "test", "match", "speak")

/** #/practice and #/practice/<mode>: hub (word source + mode grid), runs, results. */
@Composable
fun PracticeScreen(ui: PracticeUi, a: PracticeActions, clock: () -> Long = System::currentTimeMillis) {
    val c = LocalLKColors.current
    when (ui) {
        PracticeUi.Loading -> Box(Modifier.background(c.background))
        is PracticeUi.Hub -> Hub(ui, a)
        is PracticeUi.Empty -> StudyPage(t(modeKey(ui.mode)), a.exit) {
            EmptyState("🔍", t(L10nKey.vocabNoWordsMatchThese), null, t(L10nKey.revOpenLibrary), { a.open("library") }, t(L10nKey.actionBack), a.exit)
        }
        is PracticeUi.Run -> RunScreen(ui, a)
        is PracticeUi.MatchRun -> MatchScreen(ui.m, a, clock)
        is PracticeUi.HardOffer -> HardOfferScreen(ui, a)
        is PracticeUi.Done -> DoneScreen(ui.r, a)
    }
}

// ---------------------------------------------------------------- hub
@Composable
private fun Hub(h: PracticeUi.Hub, a: PracticeActions) {
    val c = LocalLKColors.current
    StudyPage(t(L10nKey.revGamesPractice), a.exit) {
        Muted(t(L10nKey.revPickAWordSource))
        Label(t(L10nKey.revWordSource))
        LKCard(onClick = { a.picker(true) }, label = t(L10nKey.revWordSource)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Column(Modifier.weight(1f)) { Body(h.src.label, style = LKType.titlePill); Muted(t(L10nKey.vocabWords, mapOf("n" to h.count))) }
                Icon(Icons.Filled.UnfoldMore, null, tint = c.onSurfaceVariant)
            }
        }
        MODES.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                row.forEach { m ->
                    LKCard(Modifier.weight(1f), onClick = { a.start(m) }, label = t(modeKey(m))) {
                        Column(Modifier.fillMaxWidth().heightIn(min = 96.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                            Box(Modifier.size(48.dp).clip(CircleShape).background(c.secondaryContainer), contentAlignment = Alignment.Center) { Icon(modeIcon(m), null, tint = c.onSecondaryContainer) }
                            Body(t(modeKey(m)), align = TextAlign.Center, style = LKType.labelMetric, modifier = Modifier.padding(top = LKSpacing.spaceXs))
                        }
                    }
                }
                if (row.size == 1) Box(Modifier.weight(1f))
            }
        }
    }
    if (h.picker) AlertDialog(onDismissRequest = { a.picker(false) }, containerColor = c.card,
        title = { Text(t(L10nKey.revWordSource), style = LKType.headlineSm.toCompose(), color = c.onSurface) },
        text = {
            LazyColumn(Modifier.heightIn(max = 420.dp)) {
                items(h.sources) { s ->
                    val sel = s.value == h.src.value
                    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).tactile({ a.source(s.value) }).padding(horizontal = LKSpacing.spaceXs, vertical = LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                        Text(s.label, Modifier.weight(1f), style = LKType.bodyMd.toCompose(), color = if (sel) c.secondary else c.onSurface)
                        Text(s.count.toString(), style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = { a.picker(false) }, modifier = Modifier.heightIn(min = 48.dp)) { Text(t(L10nKey.actionClose), color = c.secondary) } })
}

// ---------------------------------------------------------------- a run
@Composable
private fun RunScreen(r: PracticeUi.Run, a: PracticeActions) {
    val c = LocalLKColors.current; val q = r.q; val answered = r.st.ok != null
    val progress = if (r.total == 0) 0f else r.i.toFloat() / r.total
    val bottom: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit = {
        when {
            r.intro != null -> { LKPrimaryButton(t(L10nKey.actionContinue), a.startQuestion); GhostButton(t(L10nKey.mistGotIt), a.known, Modifier.fillMaxWidth()) }
            r.mode == "speak" -> if (r.speak?.ok != null) LKPrimaryButton(t(L10nKey.actionContinue), a.skip) else GhostButton(t(L10nKey.onbCommonSkip), a.skip, Modifier.fillMaxWidth(), ink = c.onSurfaceVariant)
            answered -> LKPrimaryButton(t(L10nKey.actionContinue), a.next)
        }
    }
    StudyFocus(progress, t(modeKey(r.mode)), a.exit, bottom = bottom) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            Label(t(modeKey(r.mode)))
            if (r.streak >= 2) Tag("🔥 " + t(L10nKey.revInARow, mapOf("n" to r.streak)), c.tertiary)
            Label(r.score.toString(), color = c.success)
        }
        when {
            r.intro != null -> Intro(r.intro, a)
            r.mode == "speak" && r.sp != null -> SpeakCard(r.sp, r.speak ?: SpeakState(), a)
            q != null -> Question(q, r.st, a)
        }
    }
}

/** 8 right in a row: "this looks too easy" - try the harder rest (typing, +6 XP) or keep the level. */
@Composable
private fun HardOfferScreen(h: PracticeUi.HardOffer, a: PracticeActions) {
    val c = LocalLKColors.current
    StudyFocus(0f, t(L10nKey.revHard), a.exit, bottom = {
        LKPrimaryButton("💪 " + t(L10nKey.revGoHarder), { a.hard(true) })
        GhostButton(t(L10nKey.revKeepThisLevel), { a.hard(false) }, Modifier.fillMaxWidth())
    }) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Text("🔥 " + h.streak, style = LKType.displayHero.toCompose(), color = c.secondary)
            Body(t(L10nKey.revRightInARow, mapOf("n" to h.streak)), style = LKType.headlineMd, align = TextAlign.Center)
            Body(t(L10nKey.revThisLooksTooEasyFor), style = LKType.headlineSm, align = TextAlign.Center)
        }
    }
}

@Composable
private fun Intro(w: PW, a: PracticeActions) {
    LKCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Column(Modifier.weight(1f)) { EnLtr { Body(w.word, style = LKType.headlineLg); if (w.slashIpa.isNotEmpty()) Muted(w.slashIpa) }; if (w.pos.isNotEmpty()) Tag(w.pos) }
            SpeakButton({ a.sayWord(w.word) })
        }
        Body(w.vi.ifEmpty { w.def }, style = LKType.headlineSm, color = LocalLKColors.current.secondary)
        if (w.ex.isNotEmpty()) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            EnLtr { Body(w.ex, Modifier.weight(1f)) }; SpeakButton({ a.sayText(w.ex) }, label = t(L10nKey.revPlaySentence))
        }
    }
}

/** One question with its answer cards or typing box and the right / wrong feedback. */
@Composable
private fun Question(q: Q, st: QState, a: PracticeActions) {
    val c = LocalLKColors.current; val done = st.ok != null
    if (q.hard) Tag("💪 " + t(L10nKey.revToughItemXp, mapOf("n" to 6)))
    LKCard {
        when (q.type) {
            "mcq-vi" -> Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Column(Modifier.weight(1f)) { EnLtr { Body(q.w.word, style = LKType.headlineLg); if (q.w.slashIpa.isNotEmpty()) Muted(q.w.slashIpa) } }
                SpeakButton({ a.sayWord(q.w.word) })
            }
            "mcq-en", "type-vi", "type-spell" -> Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Body(q.w.vi.ifEmpty { q.w.def }, style = LKType.headlineMd)
                if (q.type != "mcq-en" && q.w.pos.isNotEmpty()) Tag(q.w.pos)
            }
            "type-cloze" -> Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                EnLtr { Body(q.blank, style = LKType.headlineSm) }
                if (q.w.vi.isNotEmpty()) Muted(q.w.vi)
            }
            else -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { SpeakButton({ a.sayWord(q.w.word) }, Modifier.size(72.dp), t(L10nKey.lessonReplay)) }
        }
        if (q.type.startsWith("mcq")) {
            q.options.forEachIndexed { i, o ->
                val state = if (!done) Pick.NONE else if (o == q.answer) Pick.RIGHT else if (o == st.picked) Pick.WRONG else Pick.DIM
                ChoiceCard(LETTERS[i], o, state, if (done) null else ({ a.pick(o) }), ltr = q.type == "mcq-en")
            }
        } else TypeBox(q, st, a)
    }
    if (done) {
        val ok = st.ok == true
        LKCard(fill = if (ok) c.surfaceContainerHighest else c.errorContainer) {
            Body(t(if (ok) L10nKey.lessonRight else L10nKey.lessonWrong), style = LKType.titlePill, color = if (ok) c.success else c.onErrorContainer)
            if (!ok) { Label(t(L10nKey.lessonAnswer), color = c.onErrorContainer); EnLtr { Body(q.answer, color = c.onErrorContainer, style = LKType.headlineSm) } }
            if (q.w.ex.isNotEmpty()) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                EnLtr { Body(q.w.ex, Modifier.weight(1f), if (ok) c.onSurface else c.onErrorContainer, LKType.bodySm) }; SpeakButton({ a.sayText(q.w.ex) }, label = t(L10nKey.revPlaySentence))
            }
        }
    }
}

@Composable
private fun TypeBox(q: Q, st: QState, a: PracticeActions) {
    var text by remember(q) { mutableStateOf("") }
    val done = st.ok != null
    StudyField(if (done) st.typed else text, { text = it }, t(L10nKey.lessonYourAnswerField), enabled = !done, onDone = { if (text.isNotBlank()) a.submit(text) })
    if (st.close && !done) Notice(t(L10nKey.lessonUnclear), false)
    if (!done) LKPrimaryButton(t(L10nKey.actionCheck), { a.submit(text) }, enabled = text.isNotBlank())
}

/** Speaking mode: see the word, hear it, say it; the score is the speech similarity. */
@Composable
private fun SpeakCard(w: PW, s: SpeakState, a: PracticeActions) {
    val c = LocalLKColors.current
    LKCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Column(Modifier.weight(1f)) { EnLtr { Body(w.word, style = LKType.headlineLg); if (w.slashIpa.isNotEmpty()) Muted(w.slashIpa) }; Muted(w.vi) }
            SpeakButton({ a.sayWord(w.word) })
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Box(Modifier.size(80.dp).clip(CircleShape).background(if (s.listening) c.error else c.primary).tactile(a.mic, t(L10nKey.lessonTapToSpeak)), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Mic, null, tint = c.onPrimary, modifier = Modifier.size(36.dp)) }
        }
        if (s.listening) Muted(t(L10nKey.lessonListening), Modifier.fillMaxWidth(), TextAlign.Center)
        else Muted(t(L10nKey.lessonTapToSpeak), Modifier.fillMaxWidth(), TextAlign.Center)
        if (s.error != null) Notice(t(s.error), false)
        if (s.heard != null) {
            EnLtr { Body(t(L10nKey.lessonHeard, mapOf("s" to s.heard)), Modifier.fillMaxWidth(), c.onSurface) }
            Notice("${s.pct ?: 0}% · " + t(if (s.ok == true) L10nKey.lessonRight else L10nKey.lessonWrong), s.ok == true)
        }
    }
}

// ---------------------------------------------------------------- match
@Composable
private fun MatchScreen(m: MatchState, a: PracticeActions, clock: () -> Long) {
    val c = LocalLKColors.current; val reduce = LocalReduceMotion.current
    var tick by remember { mutableLongStateOf(clock()) }
    LaunchedEffect(m.startedAt) { while (m.done.size < m.tiles.size) { tick = clock(); delay(500) } }
    LaunchedEffect(m.wrong) { if (m.wrong != null) { delay(if (reduce) 300L else 600L); a.clear() } }
    val secs = (tick - m.startedAt).coerceAtLeast(0) / 1000.0 + m.misses
    StudyFocus(m.done.size.toFloat() / m.tiles.size, t(L10nKey.revMatch), a.exit) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Label(t(L10nKey.lessonTime) + ": " + spanText("sec", Math.floor(secs), t.locale)); Label("✗ " + m.misses, color = c.error)
        }
        m.tiles.chunked(2).forEach { row ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                row.forEach { tl ->
                    val done = tl.id in m.done; val sel = m.sel == tl.id; val wrong = m.wrong?.let { tl.id == it.first || tl.id == it.second } == true
                    val line = if (wrong) c.error else if (done) c.success else if (sel) c.secondary else c.outlineVariant
                    Box(Modifier.weight(1f).heightIn(min = 64.dp).clip(RoundedCornerShape(16.dp)).background(if (wrong) c.errorContainer else if (done) c.surfaceContainerHighest else c.card).border(2.dp, line, RoundedCornerShape(16.dp))
                        .let { if (done) it else it.tactile({ a.tile(tl.id) }) }.padding(LKSpacing.spaceXs), contentAlignment = Alignment.Center) {
                        val body: @Composable () -> Unit = { Body(tl.text, align = TextAlign.Center, color = if (done) c.onSurfaceVariant else c.onSurface, style = LKType.bodyMd) }
                        if (tl.isWord) EnLtr(body) else body()
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------- result
@Composable
private fun DoneScreen(r: PracticeResult, a: PracticeActions) {
    val c = LocalLKColors.current
    StudyFocus(1f, t(modeKey(r.mode)), a.exit) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Text(if (r.pct >= 80) "🏆" else "💪", style = LKType.displayHero.toCompose())
            Body(t(if (r.pct >= 80) L10nKey.lessonAwesome else L10nKey.lessonKeepGoing), style = LKType.headlineMd, align = TextAlign.Center)
            if (r.perfect) Muted(t(L10nKey.lessonPerfect), align = TextAlign.Center)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            StatTile("${r.score}/${r.total}", t(L10nKey.lessonAccuracy), Modifier.weight(1f))
            StatTile("+${r.xp}", t(L10nKey.todayXp), Modifier.weight(1f))
            if (r.seconds != null) StatTile(spanText("sec", Math.floor(r.seconds), t.locale), t(L10nKey.lessonTime), Modifier.weight(1f))
            else StatTile("${r.pct}%", t(L10nKey.revRecalled), Modifier.weight(1f))
        }
        if (r.band != null) LKCard { Label(t(L10nKey.todayReadiness)); Body(r.band, style = LKType.headlineLg, color = c.secondary) }
        if (r.added != null) Notice(t(L10nKey.vocabAddedWordsHeadTo, mapOf("n" to r.added)), true)
        else if (r.missing > 0) GhostButton(t(L10nKey.vocabAddWordsToFlashcards, mapOf("n" to r.missing)), a.addMissing, Modifier.fillMaxWidth())
        LKPrimaryButton(t(L10nKey.actionRetry), a.again)
        GhostButton(t(L10nKey.actionClose), a.exit, Modifier.fillMaxWidth())
    }
}
