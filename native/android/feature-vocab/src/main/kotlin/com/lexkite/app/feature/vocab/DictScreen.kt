package com.lexkite.app.feature.vocab

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.lexkite.app.core.dict.DictPage
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPillButton
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject

class DictSuggest(val word: String, val vi: String)
sealed interface RelatedUi {
    data object Loading : RelatedUi
    class Ready(val r: DictPage.Related) : RelatedUi
}
class CtxUi(val text: String = "", val vi: String = "", val translating: Boolean = false, val failed: Boolean = false, val count: Int = 0)

/** What the full word card shows (a complete lookup, or the instant local one when [partial]). */
class DictView(
    val entry: JsonObject, val model: DictPage.Model, val partial: Boolean, val region: String, val uiLang: String,
    val phrases: DictPage.Phrases? = null, val related: RelatedUi = RelatedUi.Loading, val ctx: CtxUi = CtxUi(), val savedPhrases: Set<String> = emptySet(),
    /** "Hiểu sâu" note of the word ({m, e, u, f}) when js/notes has one. */
    val note: JsonObject? = null,
)

sealed interface DictUi {
    data class Input(val recent: List<String>, val suggestions: List<DictSuggest> = emptyList()) : DictUi
    data class Looking(val q: String) : DictUi
    data class Found(val view: DictView) : DictUi
    data class Missing(val q: String, val suggested: String = "") : DictUi
}

class DictActions(
    val queryChange: (String) -> Unit = {}, val search: (String) -> Unit = {}, val speakWord: (String, String, Boolean) -> Unit = { _, _, _ -> }, val speakText: (String) -> Unit = {},
    val save: () -> Unit = {}, val useCtx: (String) -> Unit = {}, val ctxChange: (String) -> Unit = {}, val translate: () -> Unit = {}, val saveCtx: () -> Unit = {},
    val savePhrase: (JsonObject) -> Unit = {}, val retryRelated: () -> Unit = {}, val open: (String) -> Unit = {},
)

private const val UK = "UK"
private const val US = "US"
private const val TATOEBA = "Tatoeba"

/** #/dict and #/dict/<word>: search box on top, then the state below (input · looking · word card · not found). */
@Composable
fun DictScreen(ui: DictUi, q: String, a: DictActions, onExit: () -> Unit) {
    val t = LocalL10n.current.western()
    VScreen(t(L10nKey.dictEnglishVietnameseDictionary), onExit) {
        VField(q, a.queryChange, t(L10nKey.dictTypeAnEnglishWord), onGo = { a.search(q) }, leading = true, onClear = { a.queryChange("") })
        when (ui) {
            is DictUi.Input -> DictInput(ui, a)
            is DictUi.Looking -> VNotice(t.s(L10nKey.dictLookingUp, "q" to ui.q))
            is DictUi.Missing -> DictMissing(ui)
            is DictUi.Found -> WordCard(ui.view, a)
        }
    }
}

@Composable
private fun DictInput(ui: DictUi.Input, a: DictActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    if (ui.suggestions.isNotEmpty()) LKCard {
        ui.suggestions.forEach { s ->
            Row(Modifier.fillMaxWidth().heightIn(min = MinTap).tactile({ a.search(s.word) }), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Ltr { VText(s.word, LKType.titlePill, c.onSurface) }
                VMuted(s.vi, Modifier.weight(1f))
            }
        }
    }
    LKCard {
        VMuted(t(L10nKey.dictOxfordLanguagesDefinitionsUk))
        VFlow { DictPage.SAMPLES.forEach { w -> Ltr { VChip(w, { a.search(w) }) } } }
    }
    if (ui.recent.isNotEmpty()) {
        VText(t(L10nKey.dictRecent), LKType.headlineSm, c.onSurface, Modifier.semantics { heading() })
        VFlow { ui.recent.forEach { w -> Ltr { VChip(w, { a.search(w) }) } } }
    }
}

@Composable
private fun DictMissing(ui: DictUi.Missing) {
    val t = LocalL10n.current.western()
    LKCard {
        VTitle(t.s(L10nKey.dictNoResultsFor, "q" to ui.q))
        if (ui.suggested.isNotEmpty()) VText(t.s(L10nKey.dictSuggestedTranslation, "vi" to ui.suggested).plain())
        VMuted(t(L10nKey.dictCheckTheSpellingOr))
    }
}

@Composable
private fun WordCard(v: DictView, a: DictActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val e = v.entry; val m = v.model
    val word = m.word
    // ---- head: word, part of speech, level, "form -> word", pronunciation UK / US with slow playback ----
    LKCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Ltr { Text(word, style = LKType.headlineLg.toCompose(), color = c.onSurface, modifier = Modifier.semantics { heading() }) }
            Spacer(Modifier.weight(1f))
            val pos = DictPage.posLabel(e.jstr("pos"), v.uiLang)
            if (pos.isNotEmpty()) VBadge(pos)
            if (e.jstr("level").isNotEmpty()) VBadge(e.jstr("level"), c.tertiaryContainer, c.onTertiaryContainer)
        }
        if (m.from.isNotEmpty()) Ltr { VBadge(m.from + " → " + word, c.secondaryContainer, c.onSecondaryContainer) }
        val ipa = e.jstr("ipa"); val ipaUS = e.jstr("ipaUS")
        if (ipa.isNotEmpty()) PronRow(if (ipaUS.isEmpty()) "$UK · $US" else UK, ipa, word, "UK", a)
        if (ipaUS.isNotEmpty()) PronRow(US, ipaUS, word, "US", a)
    }
    // ---- meaning + main example ----
    LKCard {
        if (m.meaning.isNotEmpty()) VText(m.meaning, LKType.headlineSm, c.onSurface)
        if (m.def.isNotEmpty()) Ltr { VText(m.def, LKType.bodyMd, c.onSurfaceVariant) }
        if (m.example.isNotEmpty()) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Ltr { VText(m.example, LKType.bodyLg, c.onSurface, Modifier.weight(1f)) }
                VSpeak(t(L10nKey.lessonReplay)) { a.speakText(m.example) }
            }
            val tr = m.exampleTranslation
            if (tr != null && tr.jstr("vi").isNotEmpty()) {
                VText(tr.jstr("vi"), LKType.bodyMd, c.onSurfaceVariant)
                VBadge(if (DictPage.sourceOfSentence(tr) == "auto") t(L10nKey.dictOxfordMachineTranslated) else TATOEBA)
            }
            LKPillButton(t(L10nKey.dictUseAsContext), { a.useCtx(m.example) })
        }
    }
    if (v.partial) {
        VNotice(t.s(L10nKey.dictLookingUp, "q" to word))
        return
    }
    // ---- actions: flashcard, pronounce, conjugate, usage ----
    VFlow {
        if (m.saved) VChip(t(L10nKey.dictInYourFlashcards), null, selected = true) else LKPillButton(t(L10nKey.dictSaveFlashcard), a.save)
        LKPillButton(t(L10nKey.vocabPronounce), { a.open("practice/speak?w=" + android.net.Uri.encode(word)) })
        m.verb?.let { vb -> LKPillButton(t(L10nKey.dictVerbForms), { a.open("verb/" + android.net.Uri.encode(vb)) }) }
        if (m.hasUsage) LKPillButton(t(L10nKey.dictUsage), { a.open("usage/" + android.net.Uri.encode(word.lowercase())) })
    }
    v.note?.let { DeepNotesCard(it, word, a) }
    // ---- meanings by part of speech ----
    if (m.posBlocks.isNotEmpty()) LKCard {
        VTitle(t(L10nKey.dictMeaningsByPartOf))
        m.posBlocks.forEach { b ->
            Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                VBadge(DictPage.posLabel(b.pos, v.uiLang))
                if (b.vi.isNotEmpty()) VText(b.vi.joinToString("; "), LKType.bodyMd, c.onSurface)
                Ltr {
                    b.defs.forEach { d ->
                        VText(d.def, LKType.bodyMd, c.onSurface)
                        if (d.ex.isNotEmpty()) VText(d.ex, LKType.bodySm, c.onSurfaceVariant, Modifier.padding(start = LKSpacing.spaceSm))
                    }
                }
            }
        }
    }
    if (m.extraMeanings.isNotEmpty()) LKCard {
        VTitle(t(L10nKey.dictMoreDefinitions))
        Ltr {
            m.extraMeanings.forEach { x ->
                VBadge(DictPage.posLabel(x.jstr("pos"), v.uiLang))
                x.jarr("defs").take(3).forEach { d -> (d as? JsonObject)?.let { VText(it.jstr("def"), LKType.bodyMd, c.onSurface) } }
            }
        }
    }
    // ---- bilingual examples ----
    if (m.bilingual.isNotEmpty()) LKCard {
        VTitle(t(L10nKey.dictBilingualExamples))
        m.bilingual.forEach { s ->
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Ltr { VText(s.jstr("en"), LKType.bodyMd, c.onSurface) }
                    if (s.jstr("vi").isNotEmpty()) VMuted(s.jstr("vi"))
                }
                VSpeak(t(L10nKey.lessonReplay)) { a.speakText(s.jstr("en")) }
            }
        }
    }
    ContextCard(v, a)
    PhrasesCard(v, a)
    RelatedCard(v, a)
    VMuted(t(L10nKey.dictSourcesOxfordLanguagesVia))
}

@Composable
private fun PronRow(label: String, ipa: String, word: String, region: String, a: DictActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        VBadge(label, c.secondaryContainer, c.onSecondaryContainer)
        Ltr { VText(ipa, LKType.bodyLg, c.onSurfaceVariant, Modifier.weight(1f)) }
        VSpeak(t(L10nKey.vocabPronounce)) { a.speakWord(word, region, false) }
        VSpeak(t(L10nKey.dictSlow), slow = true) { a.speakWord(word, region, true) }
    }
}

@Composable
private fun ContextCard(v: DictView, a: DictActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val x = v.ctx; val w = v.model.word
    LKCard {
        VTitle(t(L10nKey.dictAddContextToThis))
        VMuted(t(L10nKey.dictTheSentenceWhereYou))
        if (x.count > 0) VMuted(t.s(L10nKey.dictContexts, "n" to x.count))
        VField(x.text, a.ctxChange, t.s(L10nKey.dictPasteASentenceContaining, "w" to w), singleLine = false, lines = 3)
        if (x.text.isNotBlank()) LKPillButton(t(L10nKey.dictTranslateSentence), a.translate)
        if (x.translating) VMuted(t(L10nKey.dictTranslating))
        else if (x.failed) VText(t(L10nKey.dictCouldnTTranslateThis), LKType.bodySm, c.error)
        else if (x.vi.isNotEmpty()) VText(x.vi, LKType.bodyMd, c.onSurface)
        LKPrimaryButton(t(L10nKey.dictSaveAsAFlashcard), a.saveCtx, enabled = x.text.isNotBlank())
    }
}

@Composable
private fun PhrasesCard(v: DictView, a: DictActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val ph = v.phrases ?: return
    LKCard {
        VTitle(t.s(L10nKey.dictPhrasesStructuresWith, "w" to v.model.word))
        if (ph.lib.isEmpty() && ph.mine.isEmpty()) VMuted(t(L10nKey.dictNoPhrasesInThe).plain())
        (ph.lib + ph.mine).forEach { p ->
            val w = p.jstr("word")
            Row(Modifier.fillMaxWidth().heightIn(min = MinTap), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Column(Modifier.weight(1f)) {
                    Ltr { VText(w, LKType.titlePill, c.onSurface) }
                    if (p.jstr("vi").isNotEmpty()) VMuted(p.jstr("vi"))
                }
                if (w in v.savedPhrases) VChip(t(L10nKey.dictInYourFlashcards), null, selected = true) else LKPillButton(t(L10nKey.dictSavePhrase), { a.savePhrase(p) })
            }
        }
    }
}

@Composable
private fun RelatedCard(v: DictView, a: DictActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    LKCard {
        VTitle(t(L10nKey.usageRelatedWords))
        when (val r = v.related) {
            RelatedUi.Loading -> VMuted(t(L10nKey.actionLoading))
            is RelatedUi.Ready -> {
                val w = v.model.word
                @Composable fun group(label: String, words: List<String>) {
                    if (words.isEmpty()) return
                    VText(label, LKType.labelMetric, c.onSurfaceVariant)
                    VFlow { words.forEach { x -> Ltr { VChip(x, { a.search(x) }) } } }
                }
                group(t.s(L10nKey.dictAdjectivesOftenUsedWith, "w" to w), r.r.jjb)
                group(t(L10nKey.dictNounsThatOftenFollow), r.r.jja)
                group(t(L10nKey.dictAntonyms), r.r.ant)
                group(t(L10nKey.dictSimilarWords), r.r.near)
                if (r.r.down) LKPillButton(t(L10nKey.actionRetry), a.retryRelated)
            }
        }
    }
}
