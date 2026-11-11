package com.lexkite.app.feature.vocab

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.verbs.Forms
import com.lexkite.app.core.verbs.Verbs
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPillButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Everything the verb page shows, computed once from the verb engine (pure, no I/O). */
class VerbPageData(val r: JsonObject, val forms: Forms?, val table: JsonArray?, val mistakes: JsonArray, val modalLines: List<String>?, val tail: String, val endIpa: (String) -> String) {
    val base: String get() = r.jstr("base")
    val modal: Boolean get() = r.jbool("modal")
    companion object {
        /** null = not a verb we can show (the landing is drawn instead). */
        fun of(v: Verbs, input: String, region: String): VerbPageData? {
            val r = v.resolve(input) ?: return null
            val base = r.jstr("base"); if (base.isEmpty()) return null
            if (r.jbool("modal")) return VerbPageData(r, null, null, v.mistakes(base), v.modal(base), "", v::endIpa)
            return VerbPageData(r, v.forms(base, region), v.table(r, region), v.mistakes(base), null, r.jstr("tail"), v::endIpa)
        }
    }
}

sealed interface VerbUi {
    class Landing(
        val q: String, val suggestions: List<Pair<String, String>>, val irregular: List<JsonObject>, val pattern: String, val filter: String,
    ) : VerbUi
    class Page(val d: VerbPageData, val region: String, val openTense: String?, val pol: String, val voice: String) : VerbUi
}

class VerbActions(
    val queryChange: (String) -> Unit = {}, val go: (String) -> Unit = {}, val setPattern: (String) -> Unit = {}, val setFilter: (String) -> Unit = {}, val setRegion: (String) -> Unit = {},
    val toggleTense: (String) -> Unit = {}, val setPol: (String) -> Unit = {}, val setVoice: (String) -> Unit = {}, val say: (String) -> Unit = {}, val open: (String) -> Unit = {},
)

/** Verb names the landing offers (data, from web verbs.js). */
private val MOST_SEARCHED = "be have do go get make take come see know think say give find tell".split(" ")
private val EASY_TO_CONFUSE = "lie lay rise raise learn dream can must study stop panic travel".split(" ")
private val PAIRS = mapOf("lie" to "lay", "lay" to "lie", "rise" to "raise", "raise" to "rise", "say" to "tell", "tell" to "say", "lend" to "borrow", "borrow" to "lend", "sit" to "set", "set" to "sit",
    "fall" to "feel", "feel" to "fall", "bring" to "take", "take" to "bring", "learn" to "teach", "teach" to "learn", "see" to "look", "look" to "see", "hear" to "listen", "listen" to "hear", "do" to "make", "make" to "do")
internal val VERB_PATTERNS = listOf("AAA", "ABB", "ABA", "ABC")

/** #/verb and #/verb/<verb>: landing (search + irregular table) or the conjugation page. */
@Composable
fun VerbScreen(ui: VerbUi, a: VerbActions, onExit: () -> Unit) {
    val t = LocalL10n.current.western()
    VScreen(t(L10nKey.verbEnglishVerbConjugator), onExit) {
        when (ui) {
            is VerbUi.Landing -> VerbLanding(ui, a)
            is VerbUi.Page -> VerbPage(ui, a)
        }
    }
}

@Composable
private fun VerbLanding(ui: VerbUi.Landing, a: VerbActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    VField(ui.q, a.queryChange, t(L10nKey.verbTypeAVerbE), onGo = { a.go(ui.q) }, leading = true, onClear = { a.queryChange("") })
    if (ui.suggestions.isNotEmpty()) LKCard {
        ui.suggestions.forEach { (b, via) ->
            Row(Modifier.fillMaxWidth().heightIn(min = MinTap).tactile({ a.go(b) }, t(L10nKey.verbConjugate)), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Ltr { VText(b, LKType.titlePill, c.onSurface); if (via.isNotEmpty()) VMuted("$via → $b") }
            }
        }
    }
    LKPillButton(t(L10nKey.verbConjugate), { a.go(ui.q) })
    VMuted(t(L10nKey.verbThe5VerbForms))
    VText(t(L10nKey.verbMostSearched), LKType.headlineSm, c.onSurface, Modifier.semantics { heading() })
    VFlow { MOST_SEARCHED.forEach { w -> Ltr { VChip(w, { a.go(w) }) } } }
    VText(t(L10nKey.verbEasyToConfuse), LKType.headlineSm, c.onSurface, Modifier.semantics { heading() })
    VFlow { EASY_TO_CONFUSE.forEach { w -> Ltr { VChip(w, { a.go(w) }) } } }
    // ---- irregular verbs table with pattern chips and a quick filter ----
    VText(t.s(L10nKey.verbTableOfIrregularVerbs, "n" to ui.irregular.size), LKType.headlineSm, c.onSurface, Modifier.semantics { heading() })
    VField(ui.filter, a.setFilter, t(L10nKey.verbQuickFilter), leading = true)
    VFlow {
        VChip(t(L10nKey.vocabAll), { a.setPattern("") }, selected = ui.pattern.isEmpty())
        VERB_PATTERNS.forEach { p -> VChip(p, { a.setPattern(p) }, selected = ui.pattern == p) }
    }
    VMuted(t(L10nKey.verbAll3FormsThe) + " · " + t(L10nKey.verbAll3FormsDifferent))
    if (ui.irregular.isEmpty()) VNotice(t(L10nKey.verbNoMatchingVerbs))
    else LKCard {
        ui.irregular.forEach { x ->
            val b = x.jstr("base")
            Row(Modifier.fillMaxWidth().heightIn(min = MinTap).tactile({ a.go(b) }), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Ltr {
                    VText(b, LKType.titlePill, c.onSurface, Modifier.weight(1f))
                    VText(x.jarr("past").joinToString(" / ") { (it as JsonObject).jstr("w") }, LKType.bodyMd, c.onSurface, Modifier.weight(1f))
                    VText(x.jarr("pp").joinToString(" / ") { (it as JsonObject).jstr("w") }, LKType.bodyMd, c.onSurfaceVariant, Modifier.weight(1f))
                }
            }
        }
    }
}

private fun formOfLabel(from: String) = when {
    from.contains("past") && from.contains("pp") -> "V2/V3"
    from == "past" -> "V2"; from == "pp" -> "V3"; from == "ing" -> "-ing"; from == "s" || from == "present" -> "-s"; else -> from
}

@Composable
private fun VerbPage(ui: VerbUi.Page, a: VerbActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val d = ui.d; val base = d.base; val f = d.forms
    // ---- hero ----
    LKCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Ltr { Text(base + (if (d.tail.isNotEmpty()) " " + d.tail else ""), style = LKType.headlineLg.toCompose(), color = c.onSurface, modifier = Modifier.semantics { heading() }) }
            Spacer(Modifier.weight(1f))
            VSpeak(t(L10nKey.vocabPronounce)) { a.say(base) }
        }
        VFlow {
            if (d.modal) VBadge(t(L10nKey.verbModalVerb), c.tertiaryContainer, c.onTertiaryContainer)
            if (f != null) {
                if (f.irregular) VBadge(t(L10nKey.verbIrregular), c.tertiaryContainer, c.onTertiaryContainer) else VBadge(t(L10nKey.verbRegular), c.secondaryContainer, c.onSecondaryContainer)
                if (f.partial) VBadge(t(L10nKey.verbAlsoHasAnEd))
                if (!f.transitive) VBadge(t(L10nKey.verbIntransitive))
                if (f.stative) VBadge(t(L10nKey.verbStativeVerb))
            }
        }
        val from = d.r.jstr("from")
        if (from.isNotEmpty() && from != "base" && d.r.jstr("input").isNotEmpty()) VMuted(t.s(L10nKey.verbIsTheOf, "w" to d.r.jstr("input"), "form" to formOfLabel(from), "b" to base))
        if (d.r.jbool("guess") || d.r.jbool("unknown")) VMuted(t(L10nKey.verbNotInOurList))
        val alts = d.r.jarr("alts").mapNotNull { (it as? JsonObject)?.jstr("base") }.filter { it.isNotEmpty() }
        if (alts.isNotEmpty()) {
            VMuted(t(L10nKey.verbOrDidYouMean))
            VFlow { alts.forEach { w -> Ltr { VChip(w, { a.go(w) }) } } }
        }
    }
    if (d.modal) { ModalBlock(d, a); MistakesBlock(d, a); return }
    f ?: return
    // ---- region switch + five forms ----
    VFlow {
        listOf("UK", "US").forEach { r -> VChip(r, { a.setRegion(r) }, selected = ui.region == r) }
    }
    VMuted(t(L10nKey.verbBritishOrAmericanEnglish))
    LKCard {
        FormRow(t(L10nKey.verbV1BaseForm), listOf(base to ""), a)
        FormRow(t(L10nKey.verbV2PastSimple), f.past.map { it.w to (it.tag ?: "") }, a)
        FormRow(t(L10nKey.verbV3PastParticiple), f.pp.map { it.w to (it.tag ?: "") }, a)
        FormRow(ING_LABEL, f.ing.map { it.w to (it.tag ?: "") }, a)
        FormRow(t(L10nKey.verbVSEsHe), f.s.map { it.w to (it.tag ?: "") }, a)
        if ((f.past + f.pp + f.ing + f.s).any { it.tag != null }) VMuted(t(L10nKey.verbUkBritishUsageUs))
    }
    // ---- spelling + pronunciation of the endings ----
    LKCard {
        VTitle(t(L10nKey.verbSpellingRules))
        Ltr {
            if (f.irregular) VText(t(L10nKey.verbIrregularVerbLearnV2), LKType.bodyMd, c.onSurface)
            else if (f.ruleEd.isEmpty() && f.ruleIng.isEmpty() && f.ruleS.isEmpty()) VText(t(L10nKey.verbJustAddEdIng), LKType.bodyMd, c.onSurface)
            if (!f.irregular || f.partial) {
                if (f.ruleEd.isNotEmpty()) VText("$base → ${f.past.first().w}", LKType.bodyMd, c.onSurface)
            }
            if (f.ruleIng.isNotEmpty()) VText("$base → ${f.ing.first().w}", LKType.bodyMd, c.onSurface)
            if (f.ruleS.isNotEmpty() && f.ruleS != "irr") VText("$base → ${f.s.first().w}", LKType.bodyMd, c.onSurface)
        }
        VText(t(L10nKey.verbPronouncingTheEndings), LKType.labelMetric, c.onSurfaceVariant)
        val ed = f.edSound
        Ltr {
            if (ed != null) VText("-ed  ${ed.first}  ·  " + t.s(L10nKey.verbFinalSound, "s" to d.endIpa(ed.third).ifEmpty { ed.third }), LKType.bodyMd, c.onSurface)
            else VText(t(L10nKey.verbNoEdEndingIrregular), LKType.bodyMd, c.onSurfaceVariant)
            val s = f.sSound
            VText("-s  ${s.first}  ·  " + t.s(L10nKey.verbFinalSound, "s" to d.endIpa(s.third).ifEmpty { s.third }), LKType.bodyMd, c.onSurface)
        }
        LKPillButton(t(L10nKey.verbLessonPronouncingEdAnd), { a.open("grammar/ed-s-endings") })
    }
    // ---- links: meaning, usage ----
    VFlow {
        LKPillButton(t(L10nKey.verbSeeMeaning), { a.open("dict/" + android.net.Uri.encode(base)) })
        LKPillButton(t(L10nKey.verbUsagePatterns), { a.open("usage/" + android.net.Uri.encode(base)) })
    }
    // ---- tense tables ----
    val groups = d.table
    if (groups != null) {
        VText(t(L10nKey.verbConjugationByTense), LKType.headlineSm, c.onSurface, Modifier.semantics { heading() })
        VFlow {
            VChip(t(L10nKey.verbAffirmative), { a.setPol("aff") }, selected = ui.pol == "aff")
            VChip(t(L10nKey.verbNegative), { a.setPol("neg") }, selected = ui.pol == "neg")
            VChip(t(L10nKey.verbQuestion), { a.setPol("q") }, selected = ui.pol == "q")
        }
        VFlow {
            VChip(t(L10nKey.verbActive), { a.setVoice("act") }, selected = ui.voice == "act")
            VChip(t(L10nKey.verbPassive), { a.setVoice("pas") }, selected = ui.voice == "pas")
        }
        val tenses = groups.flatMap { (it as JsonObject).jarr("tenses") }.mapNotNull { it as? JsonObject }
        tenses.forEach { x -> TenseCard(x, ui, a) }
    }
    MistakesBlock(d, a)
    PAIRS[base]?.let { p ->
        VText(t(L10nKey.verbOftenConfusedWith), LKType.headlineSm, c.onSurface, Modifier.semantics { heading() })
        VFlow { Ltr { VChip(p, { a.go(p) }) } }
    }
}

private const val ING_LABEL = "V-ing"

@Composable
private fun FormRow(label: String, forms: List<Pair<String, String>>, a: VerbActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    Row(Modifier.fillMaxWidth().heightIn(min = MinTap), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        VText(label, LKType.bodySm, c.onSurfaceVariant, Modifier.weight(1f))
        Ltr {
            Column(Modifier.weight(1f)) { forms.forEach { (w, tag) -> VText(if (tag.isEmpty()) w else "$w  $tag", LKType.titlePill, c.onSurface) } }
        }
        VSpeak(t(L10nKey.vocabPronounce)) { a.say(forms.joinToString(", ") { it.first }) }
    }
}

@Composable
private fun TenseCard(x: JsonObject, ui: VerbUi.Page, a: VerbActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val id = x.jstr("id"); val open = ui.openTense == id
    LKCard(onClick = { a.toggleTense(id) }, label = x.jstr("en")) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Ltr { Column(Modifier.weight(1f)) { VText(x.jstr("en"), LKType.titlePill, c.onSurface); VMuted(x.jstr("formula")) } }
            VText(if (open) "−" else "+", LKType.headlineSm, c.secondary)
        }
        if (!open) return@LKCard
        if (x.jbool("rare")) { VMuted(t(L10nKey.verbAlmostNeverUsedIn)); return@LKCard }
        val passive = x.get("passive")
        val voice = if (ui.voice == "pas" && passive is JsonArray) "pas" else "act"
        if (ui.voice == "pas" && passive is JsonPrimitive && passive !is JsonNull) VMuted(t(L10nKey.verbThePassiveIsRare))
        if (voice == "pas" && x.jstr("formulaP").isNotEmpty()) Ltr { VMuted(x.jstr("formulaP")) }
        val rows = (if (voice == "pas") (passive as JsonArray) else x.jarr("rows")).mapNotNull { it as? JsonObject }
        VText(t(L10nKey.verbSubject) + " · " + t(L10nKey.verbSentenceType), LKType.labelBadge, c.onSurfaceVariant)
        rows.forEach { r ->
            val text = when (ui.pol) { "neg" -> r.jstr("neg"); "q" -> r.jstr("q"); else -> r.jstr("aff") }
            val short = when (ui.pol) { "neg" -> r.jstr("negC"); "q" -> ""; else -> r.jstr("affC") }
            Row(Modifier.fillMaxWidth().heightIn(min = MinTap), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Ltr {
                    VText(r.jstr("subj"), LKType.labelMetric, c.secondary, Modifier.weight(0.7f))
                    Column(Modifier.weight(2f)) {
                        VText(text.ifEmpty { "–" }, LKType.bodyMd, c.onSurface)
                        if (short.isNotEmpty()) VMuted(short)
                    }
                }
                if (text.isNotEmpty()) VSpeak(t(L10nKey.verbPlayExample)) { a.say(text) }
            }
        }
        if (x.jbool("stative")) VMuted(t(L10nKey.verbStativeVerbUsuallyNot))
        if (x.jbool("dual")) VMuted(t(L10nKey.verbContinuousFormsAreFine))
        if (x.jbool("mustNote")) VMuted(t(L10nKey.verbTheNegativeOfMust))
        val ex = x.jobj("example")
        val exText = if (voice == "pas") ex.jstr("passive").ifEmpty { ex.jstr("en") } else ex.jstr("en")
        if (exText.isNotEmpty()) Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Ltr { VText(exText, LKType.bodyLg, c.onSurface, Modifier.weight(1f)) }
            VSpeak(t(L10nKey.verbPlayExample)) { a.say(exText) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            LKPillButton(t(L10nKey.verbPlayTheWholeTable), { a.say(rows.joinToString(". ") { r -> when (ui.pol) { "neg" -> r.jstr("neg"); "q" -> r.jstr("q"); else -> r.jstr("aff") } }) })
            LKPillButton(t(L10nKey.verbStudyThisTense), { a.open("grammar/" + x.jstr("lesson")) })
        }
    }
}

@Composable
private fun ModalBlock(d: VerbPageData, a: VerbActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    LKCard {
        VMuted(t(L10nKey.verbModalVerbsDoNot))
        d.modalLines?.forEach { line ->
            Row(Modifier.fillMaxWidth().heightIn(min = MinTap), verticalAlignment = Alignment.CenterVertically) {
                Ltr { VText(line, LKType.bodyMd, c.onSurface, Modifier.weight(1f)) }
                VSpeak(t(L10nKey.verbPlayExample)) { a.say(line) }
            }
        }
    }
    VMuted(t(L10nKey.verbUsedInsteadInOther))
}

@Composable
private fun MistakesBlock(d: VerbPageData, a: VerbActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val list = d.mistakes.mapNotNull { it as? JsonObject }
    if (list.isEmpty()) return
    LKCard {
        VTitle(t(L10nKey.verbCommonLearnerMistakes))
        list.forEach { m ->
            Ltr {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    VText(m.jstr("wrong"), LKType.bodyMd, c.error)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        VText(m.jstr("right"), LKType.bodyMd, c.success, Modifier.weight(1f))
                        VSpeak(t(L10nKey.verbPlayExample)) { a.say(m.jstr("right")) }
                    }
                }
            }
        }
    }
}

