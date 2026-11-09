package com.lexkite.app.feature.vocab

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.core.vocab.Library
import com.lexkite.app.i18n.generated.L10nKey

/** Progress ring of a set card: saved words / all words. */
@Composable
private fun Ring(frac: Float, label: String) {
    val c = LocalLKColors.current
    Box(Modifier.size(56.dp), contentAlignment = Alignment.Center) {
        val track = c.surfaceContainerHighest; val fill = c.secondary
        Canvas(Modifier.size(56.dp)) {
            val sw = 6.dp.toPx(); val inset = sw / 2
            drawArc(track, 0f, 360f, false, topLeft = androidx.compose.ui.geometry.Offset(inset, inset), size = Size(size.width - sw, size.height - sw), style = Stroke(sw))
            if (frac > 0f) drawArc(fill, -90f, 360f * frac, false, topLeft = androidx.compose.ui.geometry.Offset(inset, inset), size = Size(size.width - sw, size.height - sw), style = Stroke(sw, cap = StrokeCap.Round))
        }
        Text(label, style = LKType.labelBadge.toCompose(), color = c.onSurface)
    }
}

/** #/library "Vocabulary library". */
@Composable
fun LibraryScreen(u: LibraryUi, a: LibraryActions) {
    val c = LocalLKColors.current
    StudyList(t(L10nKey.vocabVocabularyLibrary), a.exit) {
        if (u.loading) return@StudyList
        if (u.failed) { item { EmptyState("📡", t(L10nKey.revDownloadFailedTryAgain), null, t(L10nKey.actionRetry), a.retry) }; return@StudyList }
        item { Muted(t(L10nKey.vocabWordsPhrasesInSets, mapOf("n" to u.words, "k" to u.sets))) }
        item { StudyField(u.q, a.query, t(L10nKey.vocabFilterSets), ltr = false) }
        item {
            Flow {
                u.tabs.forEach { tb -> Chip(when (tb.value) { "all" -> t(L10nKey.vocabAll); "mine" -> t(L10nKey.vocabMyLibrary); else -> tb.label }, u.tab == tb.value, { a.tab(tb.value) }) }
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Label(t(L10nKey.vocabCefrLevel))
                Flow { Library.LEVEL_FILTERS.forEach { l -> Chip(if (l.isEmpty()) t(L10nKey.vocabAllLevels) else l, u.lv == l, { a.level(l) }) } }
            }
        }
        item { Flow { GhostButton(t(L10nKey.vocabExportToAnki), a.exportAnki, ink = c.onSurfaceVariant); GhostButton(t(L10nKey.vocabImportFromAnki), a.importAnki, ink = c.onSurfaceVariant) } }
        if (u.notice != null) item { Notice(if (u.noticeN != null) t(u.notice, mapOf("n" to u.noticeN)) else t(u.notice), u.noticeOk) }
        if (u.sections.isEmpty() && u.emptyEmoji != null) item {
            EmptyState(u.emptyEmoji, t(if (u.emptyEmoji == "📌") L10nKey.vocabYouHavenTSaved else L10nKey.vocabNoMatchingWordSets))
        }
        u.sections.forEach { s -> section(s, u, a) }
    }
}

private fun LazyListScope.section(s: LibSection, u: LibraryUi, a: LibraryActions) {
    if (s.mine.isNotEmpty()) {
        item { Column { Body(t(L10nKey.vocabMyLibrary), style = LKType.headlineSm); Muted(t(L10nKey.vocabSortedAutomaticallyByWhere)) } }
        items(s.mine.size) { i ->
            val m = s.mine[i]
            LKCard(onClick = { a.open("deck?from=" + m.key) }, label = m.name) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                    Text(m.emoji, style = LKType.headlineMd.toCompose())
                    Column(Modifier.weight(1f)) {
                        Body(m.name, style = LKType.titlePill); Muted(m.desc)
                        Muted(t(L10nKey.vocabWords, mapOf("n" to m.count)) + " · " + t(L10nKey.vocabMastered) + " " + m.mastered + "/" + m.count)
                    }
                    if (m.due > 0) Tag(t(L10nKey.vocabDue, mapOf("n" to m.due)), LocalLKColors.current.primary)
                }
            }
        }
        return
    }
    item {
        Column {
            Body(if (s.mineSets) t(L10nKey.vocabSetsInProgress) else s.title, style = LKType.headlineSm)
            if (!s.mineSets && s.desc.isNotEmpty()) Muted(s.desc)
        }
    }
    items(s.sets.size) { i ->
        val x = s.sets[i]
        LKCard(onClick = { a.open("topic/" + x.id + (if (u.lv.isNotEmpty()) "?lv=" + u.lv else "")) }, label = x.name) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Ring(if (x.total == 0) 0f else x.saved.toFloat() / x.total, if (x.total == 0) "" else "${x.saved * 100 / x.total}%")
                Column(Modifier.weight(1f)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Text(x.emoji, style = LKType.bodyLg.toCompose()); Body(x.name, Modifier.weight(1f), style = LKType.titlePill) }
                    if (x.desc.isNotEmpty()) Muted(x.desc)
                    Muted(t(L10nKey.vocabWords, mapOf("n" to x.total)) + (if (x.levels.isNotEmpty()) " · " + x.levels else ""))
                }
            }
        }
    }
    if (s.viewAll != null) item { GhostButton(t(L10nKey.vocabSeeAllSets, mapOf("n" to s.viewAll)), { a.tab(s.groupId) }, Modifier.fillMaxWidth()) }
}

/** #/topic/<id>: one word set, with Learn / Match / Test, level tabs, per-word add. */
@Composable
fun TopicScreen(u: TopicUi, a: LibraryActions) {
    val c = LocalLKColors.current
    StudyList(u.name, a.exit) {
        item {
            LKCard {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                    Text(u.emoji, style = LKType.displayHeroMobile.toCompose())
                    Column(Modifier.weight(1f)) { Body(u.name, style = LKType.headlineMd); if (u.desc.isNotEmpty()) Muted(u.desc) }
                }
                Flow { Tag(t(L10nKey.vocabWords, mapOf("n" to u.total))); if (u.added > 0) Tag(t(L10nKey.vocabAdded, mapOf("n" to u.added)), c.success) }
                if (u.missing > 0) LKPrimaryButton("+ " + t(L10nKey.vocabAddWordsToFlashcards, mapOf("n" to u.missing)), a.addAll)
                else LKPrimaryButton("✓ " + t(L10nKey.vocabAllAdded), {}, enabled = false)
            }
        }
        if (u.notice != null) item { Notice(if (u.noticeN != null) t(u.notice, mapOf("n" to u.noticeN)) else t(u.notice), true) }
        item {
            Flow {
                GhostButton(t(L10nKey.vocabLearn), { a.open("practice/learn?src=topic:" + u.id) })
                GhostButton(t(L10nKey.revMatch), { a.open("practice/match?src=topic:" + u.id) })
                GhostButton(t(L10nKey.revTest), { a.open("practice/test?src=topic:" + u.id) })
                GhostButton(t(L10nKey.vocabHandsFreeListening), { a.open("handsfree/" + u.id) })
                GhostButton(t(L10nKey.vocabExportToAnki), a.exportAnki, ink = c.onSurfaceVariant)
            }
        }
        if (u.levels.size > 1) item {
            Flow {
                Chip(t(L10nKey.vocabAll) + " " + u.total, u.lv.isEmpty(), { a.level("") })
                u.levels.forEach { l -> Chip(l + " " + (u.counts[l] ?: 0), u.lv == l, { a.level(l) }) }
            }
        }
        items(u.words.size) { i -> TopicRow(u.words[i], a) }
    }
}

@Composable
private fun TopicRow(w: TopicWord, a: LibraryActions) {
    val c = LocalLKColors.current
    LKCard {
        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            SpeakButton({ a.sayWord(w.word) }, label = t(L10nKey.vocabPronounce))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                EnLtr { Body(w.word, style = LKType.headlineSm); if (w.ipa.isNotEmpty()) Muted("/" + w.ipa.trim('/') + "/") }
                Flow { if (w.pos.isNotEmpty()) Tag(w.pos); if (w.level.isNotEmpty()) Tag(w.level, c.tertiary) }
            }
            if (w.added) Tag("✓ " + t(L10nKey.vocabAdded2), c.success) else GhostButton("+ " + t(L10nKey.vocabAdd), { a.add(w.word) })
        }
        Body(w.mean, color = c.secondary)
        if (w.def.isNotEmpty() && w.def != w.mean) EnLtr { Muted(w.def) }
        if (w.ex.isNotEmpty()) EnLtr { Body(w.ex, style = LKType.bodySm) }
        if (w.col.isNotEmpty()) Flow { w.col.forEach { EnLtr { Tag(it, c.onSurface) } } }
    }
}
