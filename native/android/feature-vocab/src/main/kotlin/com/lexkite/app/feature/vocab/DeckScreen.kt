package com.lexkite.app.feature.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey

@Composable
private fun topicLabel(o: Opt) = when (o.value) { "" -> t(L10nKey.vocabAllSets); "mine" -> t(L10nKey.vocabAddedByMe); else -> o.label }
@Composable
private fun fromLabel(o: Opt) = when (o.value) { "" -> t(L10nKey.vocabAllSources); "forget" -> t(L10nKey.vocabFading); else -> o.label }
@Composable
private fun levelLabel(v: String) = when (v) { "" -> t(L10nKey.vocabAllLevels); "0" -> t(L10nKey.vocabNotStarted); "2" -> t(L10nKey.vocabFamiliar); "3" -> t(L10nKey.vocabMastered); else -> t(L10nKey.vocabInTraining) }

/** #/deck "Your words" (and the shared-deck preview when `?share=` is set). */
@Composable
fun DeckScreen(u: DeckUi, a: DeckActions) {
    val c = LocalLKColors.current
    if (u.shared != null) { SharedScreen(u.shared, a); return }
    a.anki?.let { AnkiDialog(it, a.open) }
    StudyList(t(L10nKey.vocabMyWords), a.exit) {
        item {
            LKCard {
                Body(t(L10nKey.vocabYourWords), style = LKType.headlineSm)
                Muted(t(L10nKey.vocabWordsMastered, mapOf("n" to u.total, "k" to u.mastered)))
                Flow {
                    GhostButton(t(L10nKey.vocabLearn), { a.open("practice/learn?src=deck") })
                    GhostButton(t(L10nKey.revTest), { a.open("practice/test?src=deck") })
                    GhostButton(t(L10nKey.vocabShareDeck), a.share)
                    GhostButton(t(L10nKey.vocabExport), a.exportJson, ink = c.onSurfaceVariant)
                    GhostButton(t(L10nKey.vocabImport), a.importJson, ink = c.onSurfaceVariant)
                    GhostButton(t(L10nKey.vocabExportToAnki), { a.anki?.show("export") ?: a.exportAnki() }, ink = c.onSurfaceVariant)
                    GhostButton(t(L10nKey.vocabImportFromAnki), { a.anki?.show("import") ?: a.importAnki() }, ink = c.onSurfaceVariant)
                }
            }
        }
        if (u.notice != null) item { Notice(if (u.noticeN != null) t(u.notice, mapOf("n" to u.noticeN)) else t(u.notice), u.noticeOk) }
        item { StudyField(u.f.q, a.query, t(L10nKey.vocabSearchWordsOrMeanings), ltr = false) }
        item {
            Flow {
                Chip(topicLabel(u.topics.firstOrNull { it.value == u.f.topic } ?: Opt(u.f.topic, u.f.topic.removePrefix("deck:"))), u.f.topic.isNotEmpty(), { a.picker("topic") })
                Chip(fromLabel(u.froms.firstOrNull { it.value == u.f.from } ?: Opt("", "")), u.f.from.isNotEmpty(), { a.picker("from") })
                Chip(levelLabel(u.f.m), u.f.m.isNotEmpty(), { a.picker("m") })
            }
        }
        if (!u.loading && u.total == 0) item {
            EmptyState("📒", t(L10nKey.vocabYourWords), rich(t(L10nKey.vocabNoWordsYetAdd)).text, t(L10nKey.revOpenLibrary), { a.open("library") }, t(L10nKey.todayLookUp), { a.open("dict") })
        } else if (!u.loading && u.matched == 0) item { Muted(t(L10nKey.vocabNoWordsMatchThese)) }
        items(u.rows.size) { i -> WordRow(u.rows[i], a) }
        if (u.matched > u.shown) item { Muted(t(L10nKey.vocabShowing400OfWords, mapOf("n" to u.matched))) }
    }
    when (u.picker) {
        "topic" -> PickerDialog(t(L10nKey.vocabChooseAWordSet), u.topics.map { it.value to topicLabel(it) }, u.f.topic, { a.pick("topic", it) }, { a.picker(null) })
        "from" -> PickerDialog(t(L10nKey.vocabAllSources), u.froms.map { it.value to fromLabel(it) }, u.f.from, { a.pick("from", it) }, { a.picker(null) })
        "m" -> PickerDialog(t(L10nKey.vocabAllLevels), listOf("", "0", "12", "2", "3").map { it to levelLabel(it) }, u.f.m, { a.pick("m", it) }, { a.picker(null) })
    }
    u.edit?.let { EditDialog(it, a) }
    u.shareLink?.let { ShareDialog(it, u.shareCount, a) }
}

@Composable
private fun WordRow(r: DeckRowUi, a: DeckActions) {
    val c = LocalLKColors.current
    LKCard {
        Row(verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            Box(Modifier.size(56.dp).clip(RoundedCornerShape(16.dp)).background(c.surfaceContainerHighest), contentAlignment = Alignment.Center) {
                if (r.isImage && a.image != null) a.image.invoke(r.thumb, r.word, Modifier.size(56.dp)) else Text(r.thumb, style = LKType.headlineMd.toCompose())
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                EnLtr { Text(r.word, Modifier.tactile({ a.open("dict/" + android.net.Uri.encode(r.word)) }).heightIn(min = MinTap), style = LKType.headlineSm.toCompose(), color = c.onSurface) }
                if (r.ipa.isNotEmpty()) EnLtr { Muted(r.ipa) }
                Body(r.mean, color = c.secondary)
                if (r.note.isNotEmpty()) Muted(r.note)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    MasteryDot(r.mastery)
                    if (r.retention != null) Muted("🧠 ${r.retention}%")
                }
            }
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                SpeakButton({ a.sayWord(r.word) }, label = t(L10nKey.vocabPronounce))
                Box(Modifier.size(48.dp).clip(RoundedCornerShape(24.dp)).tactile({ a.edit(r.word) }, t(L10nKey.vocabEdit)), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Edit, t(L10nKey.vocabEdit), tint = c.onSurfaceVariant) }
            }
        }
    }
}

/** editCard: meaning, phonetic, example, note, picture URL; Save / Relearn / Delete (asks first). */
@Composable
private fun EditDialog(e: EditCardUi, a: DeckActions) {
    val c = LocalLKColors.current
    var vi by remember(e.word) { mutableStateOf(e.vi) }; var ipa by remember(e.word) { mutableStateOf(e.ipa) }; var ex by remember(e.word) { mutableStateOf(e.ex) }
    var note by remember(e.word) { mutableStateOf(e.note) }; var image by remember(e.word) { mutableStateOf(e.image) }
    if (e.confirmDelete) { Confirm(t(L10nKey.vocabRemoveFromYourWords, mapOf("w" to e.word)), t(L10nKey.vocabDelete), t(L10nKey.actionCancel), a.deleteNow, { a.delete(false) }); return }
    AlertDialog(onDismissRequest = { a.edit(null) }, containerColor = c.card,
        title = { Text(t(L10nKey.vocabEdit2, mapOf("w" to e.word)), style = LKType.headlineSm.toCompose(), color = c.onSurface) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Label(t(L10nKey.vocabMeaning)); StudyField(vi, { vi = it }, t(L10nKey.vocabMeaning), ltr = false)
                Label(t(L10nKey.vocabIpa)); StudyField(ipa, { ipa = it }, t(L10nKey.vocabIpa))
                Label(t(L10nKey.vocabExampleSentence)); StudyField(ex, { ex = it }, t(L10nKey.vocabExampleSentence), singleLine = false, minHeight = 72.dp)
                Label(t(L10nKey.vocabNotesMemoryTip)); StudyField(note, { note = it }, t(L10nKey.vocabEGAssociationsWord), singleLine = false, minHeight = 72.dp, ltr = false)
                StudyField(image, { image = it }, t(L10nKey.vocabImageUrlLeaveBlank, mapOf("e" to e.emoji)))
                Muted(t(L10nKey.vocabThisCardWillBe))
                GhostButton(t(L10nKey.vocabRelearn), a.relearn, Modifier.fillMaxWidth())
                GhostButton(t(L10nKey.vocabDelete), { a.delete(true) }, Modifier.fillMaxWidth(), ink = c.error)
            }
        },
        confirmButton = { TextButton(onClick = { a.save(vi, ipa, ex, note, image) }, modifier = Modifier.heightIn(min = 48.dp)) { Text(t(L10nKey.vocabSave), color = c.secondary) } },
        dismissButton = { TextButton(onClick = { a.edit(null) }, modifier = Modifier.heightIn(min = 48.dp)) { Text(t(L10nKey.actionCancel), color = c.onSurfaceVariant) } })
}

@Composable
private fun ShareDialog(link: String, n: Int, a: DeckActions) {
    val c = LocalLKColors.current
    val message = t(L10nKey.vocabVocabularyDeckOnLexkite, mapOf("n" to n)) + "\n" + link
    AlertDialog(onDismissRequest = a.closeShare, containerColor = c.card,
        title = { Text(t(L10nKey.vocabShareDeck), style = LKType.headlineSm.toCompose(), color = c.onSurface) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Muted(t(L10nKey.vocabWordsRecipientsCanPreview, mapOf("n" to n)))
                EnLtr { Text(link, style = LKType.bodySm.toCompose(), color = c.onSurface, maxLines = 3) }
                GhostButton(t(L10nKey.vocabShareDeck), { a.sendLink(message) }, Modifier.fillMaxWidth())
            }
        },
        confirmButton = { TextButton(onClick = { a.copyLink(link) }, modifier = Modifier.heightIn(min = 48.dp)) { Text(t(L10nKey.vocabCopyLink), color = c.secondary) } },
        dismissButton = { TextButton(onClick = a.closeShare, modifier = Modifier.heightIn(min = 48.dp)) { Text(t(L10nKey.actionClose), color = c.onSurfaceVariant) } })
}

/** `#/deck?share=…`: preview of a deck someone shared, with "Add to my review plan". */
@Composable
private fun SharedScreen(s: SharedUi, a: DeckActions) {
    val c = LocalLKColors.current
    StudyList(t(L10nKey.vocabSharedDeck), a.exit) {
        if (s.invalid) item { EmptyState("⚠️", t(L10nKey.vocabInvalidDeckLink), null, t(L10nKey.vocabBackToMyWords), { a.open("deck") }) }
        else {
            item {
                LKCard {
                    Body(s.name, style = LKType.headlineSm)
                    Muted(t(L10nKey.vocabWordsNewToYou, mapOf("n" to s.words.size, "k" to s.fresh)))
                    if (s.added != null) { Notice(t(L10nKey.vocabAddedWordsToYour, mapOf("n" to s.added)), true); LKPrimaryButton(t(L10nKey.vocabBackToMyWords), { a.open("deck") }) }
                    else LKPrimaryButton(if (s.adding) t(L10nKey.vocabAdding) else t(L10nKey.vocabAddToMyFsrs), a.addShared, enabled = !s.adding)
                }
            }
            items(s.words.size) { i ->
                val (w, vi) = s.words[i]
                Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                    EnLtr { Body(w, Modifier.weight(1f), c.onSurface, LKType.bodyLg) }
                    Body(vi, Modifier.weight(1f), c.secondary, LKType.bodyMd, TextAlign.End)
                }
            }
        }
    }
}
