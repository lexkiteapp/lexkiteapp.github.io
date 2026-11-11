package com.lexkite.app.feature.vocab

import androidx.compose.foundation.border
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.usage.UEntry
import com.lexkite.app.core.usage.UItem
import com.lexkite.app.core.usage.ULookup
import com.lexkite.app.core.usage.UQuiz
import com.lexkite.app.core.usage.Usage
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
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey

/** Quick-practice state: the questions and what the learner picked (index -> choice). */
class UsageQuiz(val questions: List<UQuiz>, val picks: Map<Int, String> = emptyMap(), val title: L10nKey = L10nKey.usageQuickPractice)

/** One category of the landing: web id (`prep` …), usage kind letter, title / description keys. */
class UsageCat(val id: String, val kind: String, val title: L10nKey, val desc: L10nKey)

sealed interface UsageUi {
    class Landing(val q: String, val suggestions: List<String>, val counts: Map<String, Int>) : UsageUi
    class Category(val cat: UsageCat, val rows: List<UEntry>, val sub: String, val filter: String, val prep: String, val quiz: UsageQuiz?) : UsageUi
    class Word(val lookup: ULookup, val title: String, val quiz: UsageQuiz?, val saved: Set<String>, val notice: String?) : UsageUi
    class Fallback(val raw: String, val near: List<String>, val counts: Map<String, Int>) : UsageUi
}

class UsageActions(
    val queryChange: (String) -> Unit = {}, val go: (String) -> Unit = {}, val openCat: (String) -> Unit = {}, val setSub: (String) -> Unit = {}, val setFilter: (String) -> Unit = {}, val setPrep: (String) -> Unit = {},
    val say: (String) -> Unit = {}, val save: (String, String) -> Unit = { _, _ -> }, val pick: (Int, String) -> Unit = { _, _ -> }, val again: () -> Unit = {}, val open: (String) -> Unit = {},
)

val USAGE_CATS = listOf(
    UsageCat("prep", "p", L10nKey.usageDependentPreposition, L10nKey.usageAdjectivesVerbsAndNouns),
    UsageCat("verb", "v", L10nKey.usageVerbToVV, L10nKey.usageEnjoyDoingDecideTo),
    UsageCat("adv", "a", L10nKey.usageAdverbsPosition, L10nKey.usageHardHardlyLateLately),
    UsageCat("struct", "s", L10nKey.usageUsefulSentenceStructuresIelts, L10nKey.usageItIsAdjTo),
    UsageCat("pair", "c", L10nKey.usageConfusingWords, L10nKey.usageAffectEffectSayTell),
)
internal val USAGE_HOT = "interested depend good arrive responsible stop remember suggest hard late affect despite".split(" ")
private val PREP_CHIPS = listOf("in", "on", "at", "for", "to", "of", "with", "about", "from")
/** Pattern formulas of the verb codes (language neutral). */
private val VF = mapOf("to" to "+ to-V", "ing" to "+ V-ing", "oto" to "+ O + to-V", "obare" to "+ O + V", "bare" to "+ V", "that" to "+ that-clause", "sub" to "+ that + S + (should) V", "oing" to "+ O + V-ing",
    "ov3" to "+ O + V3", "wh" to "+ how/what… + to-V", "pass" to "be + V3 + to-V", "ping" to "+ preposition + V-ing", "oo" to "+ O + O", "o" to "+ O")

private fun vn(code: String): L10nKey? = when (code) {
    "to" -> L10nKey.usageToInfinitive; "ing" -> L10nKey.usageGerundVIng; "oto" -> L10nKey.usageObjectToV; "obare" -> L10nKey.usageObjectBareInfinitiveNo; "bare" -> L10nKey.usageBareInfinitiveNoTo
    "that" -> L10nKey.usageThatClause; "sub" -> L10nKey.usageThatSubjectBaseVerb; "oing" -> L10nKey.usageObjectVIng; "ov3" -> L10nKey.usageObjectV3SomeoneElse; "wh" -> L10nKey.usageQuestionWordToV
    "pass" -> L10nKey.usagePassiveForm; "ping" -> L10nKey.usagePrepositionVIng; "oo" -> L10nKey.usageTwoObjects; "o" -> L10nKey.usageDirectObjectNoPreposition; else -> null
}
private fun advType(sub: String): L10nKey? = when (sub) {
    "irr" -> L10nKey.usageSpecialForms; "freq" -> L10nKey.usageFrequency; "deg" -> L10nKey.usageDegree; "time" -> L10nKey.lessonTime; "link" -> L10nKey.modelLinkingWords
    "focus" -> L10nKey.usageFocus; "view" -> L10nKey.usagePosition; "man" -> L10nKey.usageManner; else -> null
}
private fun prepSub(sub: String): L10nKey? = when (sub) { "a" -> L10nKey.usageAdjectivePreposition; "v" -> L10nKey.usageVerbPreposition; "n" -> L10nKey.usageNounPreposition; else -> null }
private fun kindLabel(k: String): L10nKey? = when (k) { "p" -> L10nKey.usagePreposition; "v" -> L10nKey.usageVerbPattern; "a" -> L10nKey.usageAdverb; "s" -> L10nKey.usageStructure; "c" -> L10nKey.usageConfusing; else -> null }
private fun regLabel(r: String): L10nKey? = when (r) { "formal" -> L10nKey.lettersFormal; "informal" -> L10nKey.lettersInformal; "academic" -> L10nKey.usageAcademicGoodForIelts; "spoken" -> L10nKey.usageSpoken; "neutral" -> L10nKey.usageNeutral; else -> null }

/** Text in the learner's language: Vietnamese source for `vi`, otherwise the English wording (falls back to the other one). Markdown stars removed. */
internal fun usageTx(lang: String, vi: String, en: String): String = (if (lang == "vi") vi.ifEmpty { en } else en.ifEmpty { vi }).replace("*", "")
private fun exText(s: String) = Usage.example(s).text

@Composable
fun UsageScreen(ui: UsageUi, a: UsageActions, onExit: () -> Unit) {
    val t = LocalL10n.current.western()
    val title = when (ui) { is UsageUi.Category -> t(ui.cat.title); is UsageUi.Word -> ui.title; else -> t(L10nKey.usageWordUsage) }
    VScreen(title, onExit) {
        when (ui) {
            is UsageUi.Landing -> UsageLanding(ui, a)
            is UsageUi.Category -> UsageCategory(ui, a)
            is UsageUi.Word -> UsageWord(ui, a)
            is UsageUi.Fallback -> UsageFallback(ui, a)
        }
    }
}

@Composable
private fun SearchBlock(q: String, suggestions: List<String>, a: UsageActions) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    VField(q, a.queryChange, t(L10nKey.usageTypeAWordE), onGo = { a.go(q) }, leading = true, onClear = { a.queryChange("") })
    if (suggestions.isNotEmpty()) LKCard {
        suggestions.forEach { s -> Row(Modifier.fillMaxWidth().heightIn(min = MinTap).tactile({ a.go(s) }, t(L10nKey.usageWordSuggestions)), verticalAlignment = Alignment.CenterVertically) { Ltr { VText(s, LKType.titlePill, c.onSurface) } } }
    }
}

@Composable
private fun CatCards(counts: Map<String, Int>, a: UsageActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    USAGE_CATS.forEach { cat ->
        LKCard(onClick = { a.openCat(cat.id) }) {
            VText(t(cat.title), LKType.titlePill, c.onSurface)
            VMuted(t(cat.desc))
            VText(t.s(L10nKey.usageEntries, "n" to (counts[cat.kind] ?: 0)), LKType.labelMetric, c.secondary)
        }
    }
}

@Composable
private fun UsageLanding(ui: UsageUi.Landing, a: UsageActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    VMuted(t(L10nKey.usageDependentPrepositionsVerbPatterns))
    SearchBlock(ui.q, ui.suggestions, a)
    LKPillButton(t(L10nKey.usageShow), { a.go(ui.q) })
    VText(t(L10nKey.verbMostSearched), LKType.headlineSm, c.onSurface, Modifier.semantics { heading() })
    VFlow { USAGE_HOT.forEach { w -> Ltr { VChip(w, { a.go(w) }) } } }
    VText(t(L10nKey.usageTopics), LKType.headlineSm, c.onSurface, Modifier.semantics { heading() })
    CatCards(ui.counts, a)
    LKCard {
        VTitle(t(L10nKey.usageHowToRememberWord))
        listOf(L10nKey.usageLearnWholeChunksNot, L10nKey.usageReadTheExamplesAloud, L10nKey.usageSavePhrasesToYour, L10nKey.usageDoTheQuickPractice).forEach { VText("•  " + t(it), LKType.bodyMd, c.onSurface) }
    }
}

@Composable
private fun UsageFallback(ui: UsageUi.Fallback, a: UsageActions) {
    val t = LocalL10n.current.western()
    SearchBlock(ui.raw, emptyList(), a)
    LKCard { VText(t.s(L10nKey.usageThereAreNoUsage, "w" to ui.raw).plain(), LKType.bodyMd) }
    if (ui.near.isNotEmpty()) {
        VTitle(t(L10nKey.usageYouMightBeLooking))
        VFlow { ui.near.forEach { w -> Ltr { VChip(w, { a.go(w) }) } } }
    }
    VTitle(t(L10nKey.usageTopics))
    CatCards(ui.counts, a)
}

@Composable
private fun UsageCategory(ui: UsageUi.Category, a: UsageActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val k = ui.cat.kind
    LKPillButton(t(L10nKey.usageAllTopics), { a.openCat("") })
    VMuted(t(ui.cat.desc))
    // group filter chips
    val subs: List<Pair<String, String>> = when (k) {
        "p" -> listOf("a", "v", "n").map { it to t(prepSub(it)!!) }
        "v" -> listOf("to" to "+ to-V", "ing" to "+ V-ing", "both" to t(L10nKey.usageBothMeaningChanges), "oto" to "+ O + to-V", "obare" to "+ O + V", "that" to "+ that", "o" to t(L10nKey.usageNoPreposition))
        "a" -> Usage.SUBS.getValue("a").map { it to t(advType(it)!!) }
        "s" -> listOf("ielts" to t(L10nKey.usageGoodForIeltsWriting))
        else -> emptyList()
    }
    if (subs.isNotEmpty()) {
        VText(t(L10nKey.usageFilterByGroup), LKType.labelMetric, c.onSurfaceVariant)
        VFlow {
            VChip(t(L10nKey.vocabAll), { a.setSub("") }, selected = ui.sub.isEmpty())
            subs.forEach { (v, l) -> Ltr { VChip(l, { a.setSub(v) }, selected = ui.sub == v) } }
        }
    }
    VField(ui.filter, a.setFilter, t(L10nKey.verbQuickFilter), leading = true, onClear = { a.setFilter("") })
    if (k == "p") {
        VText(t(L10nKey.usageFilterByPreposition), LKType.labelMetric, c.onSurfaceVariant)
        VFlow { PREP_CHIPS.forEach { p -> Ltr { VChip(p, { a.setPrep(if (ui.prep == p) "" else p) }, selected = ui.prep == p) } } }
    }
    VMuted(t.s(L10nKey.usageEntries, "n" to ui.rows.size))
    if (ui.rows.isEmpty()) VNotice(t(L10nKey.usageNoMatchingEntries))
    else LKCard {
        ui.rows.forEach { e ->
            val title = when (k) { "s" -> e.f; "c" -> e.items.joinToString(" ↔ ") { it.h.substringBefore(" ") }; "a" -> e.items.map { it.h }.distinct().joinToString(" / "); else -> e.key }
            val sub = when (k) {
                "p" -> e.items.joinToString(" / ") { it.h }; "v" -> e.items.map { it.h }.distinct().joinToString("  ·  ") { VF[it] ?: it }
                else -> ""
            }
            val first = e.items.firstOrNull()
            val meaning = when (k) { "s" -> e.notes.firstOrNull()?.let { usageTx(t.lang, it.vi, it.en) } ?: ""; else -> first?.let { usageTx(t.lang, it.vi, it.en) } ?: "" }
            Column(Modifier.fillMaxWidth().heightIn(min = MinTap).tactile({ a.go(e.key) }), verticalArrangement = Arrangement.Center) {
                Ltr { Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { VText(title, LKType.titlePill, c.onSurface, Modifier.weight(1f, fill = false)); if (sub.isNotEmpty()) VText(sub, LKType.bodySm, c.secondary) } }
                if (meaning.isNotEmpty()) VMuted(meaning)
            }
        }
    }
    ui.quiz?.let { QuizCard(it, a) }
}

@Composable
private fun UsageWord(ui: UsageUi.Word, a: UsageActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val r = ui.lookup; val lang = t.lang
    val all = Usage.KINDS.flatMap { r.byKind[it] ?: emptyList() }
    LKCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Ltr { Text(ui.title, style = LKType.headlineLg.toCompose(), color = c.onSurface, modifier = Modifier.semantics { heading() }) }
            Spacer(Modifier.weight(1f))
            VSpeak(t(L10nKey.vocabPronounce)) { a.say(ui.title) }
        }
        VFlow { Usage.KINDS.filter { (r.byKind[it] ?: emptyList()).isNotEmpty() }.forEach { k -> kindLabel(k)?.let { VBadge(t(it), c.secondaryContainer, c.onSecondaryContainer) } } }
        VFlow {
            LKPillButton(t(L10nKey.verbSeeMeaning), { a.open("dict/" + android.net.Uri.encode(r.key)) })
            if ((r.byKind["v"] ?: emptyList()).isNotEmpty() || (r.byKind["p"] ?: emptyList()).any { it.sub == "v" }) LKPillButton(t(L10nKey.dictVerbForms), { a.open("verb/" + android.net.Uri.encode(r.key)) })
        }
        ui.notice?.let { VText(it, LKType.bodySm, c.secondary) }
    }
    // prepositions
    (r.byKind["p"] ?: emptyList()).takeIf { it.isNotEmpty() }?.let { es ->
        Block(t(L10nKey.usageDependentPreposition), t(L10nKey.usageChangeThePrepositionAnd)) {
            es.forEach { e -> e.items.forEach { x ->
                val phrase = e.key + " " + x.h
                ItemRow(phrase, listOfNotNull(prepSub(e.sub)?.let { t(it) }), usageTx(lang, x.vi, x.en), x, ui, a, saveKey = phrase.replace(Regex("\\bsb\\b\\s*"), ""))
            } }
            es.forEach { e -> e.ex.forEach { ExampleLine(it, a) } }
            Notes(es, lang)
        }
    }
    (r.byKind["v"] ?: emptyList()).takeIf { it.isNotEmpty() }?.let { es ->
        Block(t(L10nKey.usageVerbPatterns), t(L10nKey.usageWhatFollowsThisVerb)) {
            es.forEach { e -> e.items.forEach { x ->
                val label = vn(x.h)?.let { t(it) } ?: ""
                ItemRow(e.key + " " + (VF[x.h] ?: x.h), listOf(label).filter { it.isNotEmpty() }, usageTx(lang, x.vi, x.en), x, ui, a, saveKey = null)
            } }
            Notes(es, lang)
        }
    }
    (r.byKind["a"] ?: emptyList()).takeIf { it.isNotEmpty() }?.let { es ->
        Block(t(L10nKey.usageAdverbsFormPosition), "") {
            es.forEach { e ->
                e.items.forEach { x -> ItemRow(x.h, emptyList(), usageTx(lang, x.vi, x.en), x, ui, a, saveKey = null) }
                advType(e.sub)?.let { VFlow { VBadge(t(it)) } }
                e.pos.forEach { p -> posKeys(p)?.let { (n, d) -> VMuted(t(n) + ": " + t(d)) } }
                e.ex.forEach { ExampleLine(it, a) }
            }
            Notes(es, lang)
        }
    }
    (r.byKind["c"] ?: emptyList()).takeIf { it.isNotEmpty() }?.let { es ->
        Block(t(L10nKey.usageOftenConfusedWith), "") {
            es.forEach { e -> e.items.forEach { x -> ItemRow(x.h, emptyList(), usageTx(lang, x.vi, x.en), x, ui, a, saveKey = null) } }
            Notes(es, lang)
        }
    }
    (r.byKind["s"] ?: emptyList()).takeIf { it.isNotEmpty() }?.let { es ->
        Block(t(L10nKey.usageSentenceStructures), t(L10nKey.usageCommonStructuresWithThis)) {
            es.forEach { e ->
                Ltr { VText(e.f, LKType.titlePill, c.secondary) }
                e.items.forEach { x -> ItemRow(x.h, emptyList(), usageTx(lang, x.vi, x.en), x, ui, a, saveKey = null) }
                e.notes.forEach { VText(usageTx(lang, it.vi, it.en), LKType.bodyMd, c.onSurface) }
                e.ex.forEach { ExampleLine(it, a) }
            }
        }
    }
    val cols = all.flatMap { it.col }.distinct().take(16)
    if (cols.isNotEmpty()) Block(t(L10nKey.usageCollocationsWordsThatGo), t(L10nKey.usageTapToListen)) {
        VFlow { cols.forEach { w -> Ltr { VChip(w, { a.say(w) }) } } }
    }
    val regs = all.flatMap { it.reg }
    if (regs.isNotEmpty()) Block(t(L10nKey.usageRegisterIelts), "") {
        regs.forEach { x -> Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
            regLabel(x.r)?.let { VBadge(t(it), c.tertiaryContainer, c.onTertiaryContainer) }
            VText(usageTx(lang, x.vi, x.en), LKType.bodyMd, c.onSurface, Modifier.weight(1f))
        } }
    }
    val seen = HashSet<String>()
    val mis = all.flatMap { it.mis }.filter { seen.add(it.w) }
    if (mis.isNotEmpty()) Block(t(L10nKey.modelCommonMistakes), t(L10nKey.usageMistakesLearnersOftenMake)) {
        mis.forEach { m ->
            Ltr { VText(t(L10nKey.usageWrong) + ": " + m.w, LKType.bodyMd, c.error) }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Ltr { VText(t(L10nKey.usageRight) + ": " + m.r, LKType.bodyMd, c.success, Modifier.weight(1f)) }
                VSpeak(t(L10nKey.usagePlaySentence)) { a.say(m.r) }
            }
            val why = usageTx(lang, m.vi, m.en); if (why.isNotEmpty()) VMuted(why)
        }
    }
    val lessons = all.flatMap { it.lessons }.distinct()
    val rel = all.flatMap { it.rel }.distinct().filter { it != r.key }
    if (lessons.isNotEmpty() || rel.isNotEmpty()) Block(t(L10nKey.revKeepLearning), "") {
        if (lessons.isNotEmpty()) VFlow { lessons.forEach { id -> VChip(id.replace('-', ' '), { a.open("grammar/$id") }) } }
        if (rel.isNotEmpty()) { VMuted(t(L10nKey.usageRelatedWords)); VFlow { rel.forEach { w -> Ltr { VChip(w, { a.go(w) }) } } } }
    }
    ui.quiz?.let { QuizCard(it, a) }
}

private fun posKeys(p: String): Pair<L10nKey, L10nKey>? = when (p) {
    "front" -> L10nKey.usageFront to L10nKey.usageBeforeTheSubjectOften
    "mid" -> L10nKey.usageMid to L10nKey.usageBeforeMainVerbsAfter
    "end" -> L10nKey.usageEnd to L10nKey.usageAfterTheVerbAnd
    else -> null
}

@Composable
private fun Block(title: String, sub: String, content: @Composable () -> Unit) {
    LKCard {
        VTitle(title)
        if (sub.isNotEmpty()) VMuted(sub)
        content()
    }
}

@Composable
private fun Notes(es: List<UEntry>, lang: String) {
    es.flatMap { it.notes }.forEach { VText("💡 " + usageTx(lang, it.vi, it.en), LKType.bodyMd, LocalLKColors.current.onSurface) }
}

@Composable
private fun ExampleLine(raw: String, a: UsageActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val text = exText(raw)
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Ltr { VText(text, LKType.bodyMd, c.onSurface, Modifier.weight(1f)) }
        VSpeak(t(L10nKey.usagePlaySentence)) { a.say(text) }
    }
}

@Composable
private fun ItemRow(phrase: String, badges: List<String>, meaning: String, x: UItem, ui: UsageUi.Word, a: UsageActions, saveKey: String?) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Ltr { VText(phrase, LKType.titlePill, c.onSurface, Modifier.weight(1f)) }
            VSpeak(t(L10nKey.usagePlaySentence)) { a.say(phrase) }
            if (saveKey != null) {
                if (saveKey in ui.saved) VBadge(t(L10nKey.revSaved), c.secondaryContainer, c.onSecondaryContainer) else LKPillButton(t(L10nKey.usageSaveToMyWords), { a.save(saveKey, meaning) })
            }
        }
        if (badges.isNotEmpty()) VFlow { badges.forEach { VBadge(it) } }
        if (meaning.isNotEmpty()) VText(meaning, LKType.bodyMd, c.onSurface)
        x.ex.forEach { ExampleLine(it, a) }
    }
}

/** The 5-question quick practice (seeded, see [Usage.quiz]). */
@Composable
internal fun QuizCard(q: UsageQuiz, a: UsageActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    if (q.questions.size < 3) return
    LKCard {
        VTitle(t(q.title))
        VMuted(t(L10nKey.usageChooseTheCorrectAnswer))
        q.questions.forEachIndexed { i, qq ->
            val picked = q.picks[i]
            Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                VText(t.s(L10nKey.usageQ, "n" to (i + 1)), LKType.labelBadge, c.onSurfaceVariant)
                Ltr { VText(qq.pre + "_____" + qq.post, LKType.bodyLg, c.onSurface) }
                qq.choices.forEachIndexed { j, ch ->
                    val right = picked != null && ch == qq.ans
                    val wrong = picked != null && ch == picked && ch != qq.ans
                    val shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp)
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(shape)
                            .border(2.dp, if (right) c.success else if (wrong) c.error else c.outlineVariant, shape)
                            .tactile(if (picked == null) ({ a.pick(i, ch) }) else null).padding(horizontal = LKSpacing.spaceSm),
                        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm),
                    ) {
                        VText("ABCD".getOrElse(j) { ' ' }.toString(), LKType.labelMetric, c.onSurfaceVariant)
                        Ltr { VText(ch, LKType.titlePill, if (right) c.success else if (wrong) c.error else c.onSurface) }
                    }
                }
                if (picked != null) {
                    if (picked == qq.ans) VText(t(L10nKey.modelCorrect), LKType.labelMetric, c.success)
                    else { VText(t(L10nKey.usageNotQuite), LKType.labelMetric, c.error); Ltr { VText(t(L10nKey.usageAnswer) + " " + qq.ans, LKType.bodyMd, c.onSurface) } }
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Ltr { VText(qq.pre + qq.ans + qq.post, LKType.bodyMd, c.onSurfaceVariant, Modifier.weight(1f)) }
                        VSpeak(t(L10nKey.usagePlaySentence)) { a.say(qq.pre + qq.ans + qq.post) }
                    }
                }
            }
        }
        if (q.picks.size == q.questions.size) {
            val right = q.questions.indices.count { q.picks[it] == q.questions[it].ans }
            VText("$right/${q.questions.size}", LKType.headlineMd, c.onSurface)
            VText(t(if (right == q.questions.size) L10nKey.usageExcellentYouVeGot else if (right >= q.questions.size - 1) L10nKey.usageVeryGoodTakeAnother else L10nKey.usageReadTheExamplesAbove), LKType.bodyMd, c.onSurfaceVariant)
            LKPrimaryButton(t(L10nKey.usageTryANewSet), a.again)
        }
    }
}
