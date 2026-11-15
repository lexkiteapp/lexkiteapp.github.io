package com.lexkite.app.feature.vocab

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.write.Models
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPillButton
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject

private const val TASK2 = "Task 2"
internal fun modelTabLabel(t: L10n, tab: String): String = when (tab) { "2" -> TASK2; "1" -> t(L10nKey.modelTask1Charts); else -> t(L10nKey.modelTask1Letters) }
/** Chart type keys (data) -> the translated chart names. */
internal fun chartKey(type: String): L10nKey? = when (type) {
    "line" -> L10nKey.modelLineGraph; "bar" -> L10nKey.modelBarChart; "pie" -> L10nKey.modelPieChart; "table" -> L10nKey.modelTable; "process" -> L10nKey.modelProcess; "map" -> L10nKey.modelMap; else -> null
}

class ModelsActions(val setTab: (String) -> Unit = {}, val queryChange: (String) -> Unit = {}, val open: (String) -> Unit = {})

/** #/models: tabs Task 2 / Task 1 charts / letters, search, rows (title, kind, topic, word count, band). */
@Composable
fun ModelsScreen(tab: String, counts: Map<String, Int>, q: String, rows: List<Models.Row>, a: ModelsActions, onExit: () -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    VScreen(t(L10nKey.modelBand8ModelAnswers), onExit) {
        VMuted(t(L10nKey.modelOriginalModelAnswersWith))
        VFlow { listOf("2", "1", "gt").forEach { k -> VChip(modelTabLabel(t, k) + "  " + t.num(counts[k] ?: 0), { a.setTab(k) }, selected = tab == k) } }
        VField(q, a.queryChange, t(L10nKey.modelSearchByTopicOr), leading = true, onClear = { a.queryChange("") })
        if (rows.isEmpty()) VNotice(t(L10nKey.modelNoMatchingModelAnswers))
        rows.forEach { r ->
            LKCard(onClick = { a.open("model/" + r.id) }) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Ltr { VText(r.title, LKType.titlePill, c.onSurface) }
                        VMuted(listOf(r.kind, r.topic, if (r.words.isNotEmpty()) t.s(L10nKey.vocabWords, "n" to r.words) else "").filter { it.isNotEmpty() }.joinToString(" · "))
                    }
                    if (r.band.isNotEmpty()) VBadge("Band " + r.band, c.secondaryContainer, c.onSecondaryContainer)
                }
            }
        }
    }
}

class PhrasesActions(
    val toggleAdd: () -> Unit = {}, val formChange: (String, String) -> Unit = { _, _ -> }, val saveForm: () -> Unit = {}, val study: () -> Unit = {}, val openModels: () -> Unit = {}, val starter: () -> Unit = {},
)

/** #/phrases: the learner's phrase book – study button (>= 4), link to the model answers, manual add, quick-add of 20 phrases when empty. */
@Composable
fun PhrasesScreen(cards: List<JsonObject>, modelCount: Int, adding: Boolean, phrase: String, vi: String, notice: String?, a: PhrasesActions, onExit: () -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    VScreen(t(L10nKey.modelPhrasesStructures), onExit) {
        VMuted(t(L10nKey.modelLearningInChunksMakes).plain())
        VFlow {
            if (cards.size >= 4) LKPillButton(t(L10nKey.modelStudyPhrases), a.study)
            LKPillButton(t(L10nKey.modelAddPhraseStructure), a.toggleAdd)
        }
        if (adding) LKCard {
            VField(phrase, { a.formChange(it, vi) }, t(L10nKey.modelAddPhraseStructure))
            if (t.lang == "vi") VField(vi, { a.formChange(phrase, it) }, t(L10nKey.vocabMeaning))
            LKPrimaryButton(t(L10nKey.vocabSave), a.saveForm, enabled = phrase.isNotBlank())
        }
        notice?.let { VText(it, LKType.bodyMd, c.secondary) }
        LKCard(onClick = a.openModels) {
            VTitle(t(L10nKey.modelBand8ModelAnswers2))
            VMuted(t(L10nKey.modelReadAModelAnswer))
            VText(t.s(L10nKey.modelAnswers, "n" to modelCount), LKType.labelMetric, c.secondary)
        }
        if (cards.isEmpty()) {
            VNotice(t(L10nKey.modelNoPhrasesYetSelect).plain())
            LKPrimaryButton(t(L10nKey.modelAdd20TopPhrases), a.starter)
        }
        cards.forEach { p ->
            LKCard {
                Ltr { VText(p.jstr("word"), LKType.titlePill, c.onSurface) }
                if (p.jstr("vi").isNotEmpty()) VText(p.jstr("vi"), LKType.bodyMd, c.onSurfaceVariant)
                if (p.jstr("ex").isNotEmpty()) Ltr { VMuted(p.jstr("ex")) }
            }
        }
    }
}
