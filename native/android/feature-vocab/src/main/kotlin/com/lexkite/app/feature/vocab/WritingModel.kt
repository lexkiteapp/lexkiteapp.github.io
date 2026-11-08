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
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.text.ClickableText
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Add
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.lexkite.app.core.lesson.Speaking
import com.lexkite.app.core.write.Lemmatizer
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
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject
import kotlin.random.Random

/** What the model page keeps besides the data: active tab, done modes, annotation switches, saved phrases, the last practice result. */
class ModelUi(
    val tab: String = "read", val done: List<String> = emptyList(), val annot: Set<String> = setOf("ch", "lk", "role"), val saved: Set<String> = emptySet(), val notice: String? = null,
    val band6Open: Boolean = false, val finish: Models.Finish? = null, val right: Int = 0, val total: Int = 0, val seed: Long = 1L,
)

/** Free highlight (phrases-model.js "Tô sáng"): [on] = tapping a sentence marks it; [marked] = ordinals of the marked sentences. */
class HlState(val on: Boolean = false, val marked: Set<Int> = emptySet())

class ModelActions(
    val toggleHl: () -> Unit = {}, val clearHl: () -> Unit = {}, val tapSentence: (Int) -> Unit = {},
    val setTab: (String) -> Unit = {}, val toggleAnnot: (String) -> Unit = {}, val saveChunk: (String, String) -> Unit = { _, _ -> }, val saveAll: () -> Unit = {}, val listen: () -> Unit = {},
    val toggleBand6: () -> Unit = {}, val open: (String) -> Unit = {}, val finish: (String, Int, Int) -> Unit = { _, _, _ -> }, val redo: () -> Unit = {}, val say: (String) -> Unit = {},
)

/** Everything the practice modes need besides the model itself. */
class ModelTools(val forms: List<List<String>> = emptyList(), val lemmatizer: Lemmatizer? = null, val index: Map<String, JsonObject> = emptyMap())

private fun practiceLabel(k: String): L10nKey = when (k) {
    "vocab" -> L10nKey.modelFillInPhrases; "gram" -> L10nKey.modelFixGrammarErrors; "link" -> L10nKey.modelLinkingWords; "copy" -> L10nKey.modelTypeTheWholeEssay
    "write" -> L10nKey.modelBuildFromBaseWords; else -> L10nKey.modelReadModel
}
private fun whyKey(why: String): L10nKey? = when (why) {
    "Thiếu mạo từ" -> L10nKey.modelMissingArticle; "Sai thì (cần quá khứ)" -> L10nKey.modelWrongTensePastNeeded; "Sai hòa hợp chủ – vị" -> L10nKey.modelSubjectVerbAgreement
    "Sai thì / thiếu -ed" -> L10nKey.modelWrongTenseMissingEd; "Cần trạng từ (-ly)" -> L10nKey.modelAdverbNeededLy; "Danh từ số nhiều" -> L10nKey.modelPluralNoun
    "Thiếu so sánh hơn/nhất" -> L10nKey.modelMissingComparativeSuperlative; else -> null
}

/** #/model/<id>: annotated model answer with the six modes (read, fill phrases, fix grammar, linking words, type the essay, rebuild from lemmas). */
@Composable
fun ModelScreen(page: Models.Page, ui: ModelUi, tools: ModelTools, a: ModelActions, onExit: () -> Unit, hl: HlState = HlState()) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val m = page.m
    VScreen(t(L10nKey.modelAnnotatedModelAnswer), onExit) {
        LKCard {
            VFlow {
                LKPillButton(t(L10nKey.modelBackToTheTask), { a.open(page.back.removePrefix("#/")) })
                LKPillButton(t(L10nKey.modelListenToEssay), a.listen)
            }
            VFlow {
                VBadge(page.badge, c.secondaryContainer, c.onSecondaryContainer); VBadge(page.kind); VBadge(page.band, c.tertiaryContainer, c.onTertiaryContainer)
                if (m.jstr("words").isNotEmpty()) VBadge(t.s(L10nKey.vocabWords, "n" to m.jstr("words")))
            }
            VText(t(L10nKey.modelTask), LKType.labelBadge, c.onSurfaceVariant)
            Ltr {
                VText(page.prompt, LKType.bodyMd, c.onSurface)
                page.bullets.forEach { VText("•  $it", LKType.bodyMd, c.onSurface) }
            }
        }
        VFlow {
            Models.PRACTICE_TABS.forEach { k -> VChip(t(practiceLabel(k)) + (if (k in ui.done) " ✓" else ""), { a.setTab(k) }, selected = ui.tab == k) }
        }
        if (ui.tab == "read") ReadTab(page, ui, a, hl) else PracticeTab(page, ui, tools, a)
    }
}

@Composable
private fun ReadTab(page: Models.Page, ui: ModelUi, a: ModelActions, hl: HlState) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val m = page.m
    VFlow {
        listOf("ch" to L10nKey.modelUsefulPhrases, "gl" to L10nKey.modelMeaningsUnderPhrases, "lk" to L10nKey.modelLinkingWords, "role" to L10nKey.modelSentenceRoles).forEach { (k, label) ->
            VChip(t(label), { a.toggleAnnot(k) }, selected = k in ui.annot)
        }
    }
    VFlow {
        VChip("🖍 " + t(L10nKey.modelHighlight), a.toggleHl, selected = hl.on)
        LKPillButton("↺ " + t(L10nKey.modelClearAllYourHighlights), a.clearHl)
    }
    if (hl.on) VMuted(t(L10nKey.modelSelectTextInThe2))
    LKCard { Annotated(Models.render(m.jstr("text")), ui.annot, t.lang, ui.saved, a.saveChunk, hl, a.tapSentence) }
    VMuted(t(L10nKey.modelHoverOverOrTap).plain())
    // phrases + linkers
    LKCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            VTitle(t(L10nKey.modelUsefulPhrases) + " (" + page.chunks.size + ")")
        }
        LKPrimaryButton(t(L10nKey.modelSaveAll), a.saveAll)
        page.chunks.forEach { (en, vi) ->
            Row(Modifier.fillMaxWidth().heightIn(min = MinTap), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Column(Modifier.weight(1f)) {
                    Ltr { VText(en, LKType.titlePill, c.onSurface) }
                    if (Models.glossVisible(t.lang)) VMuted(vi)
                }
                val saved = en in ui.saved
                Box(Modifier.widthIn(min = MinTap).heightIn(min = MinTap).tactile({ if (!saved) a.saveChunk(en, vi) }, t(L10nKey.modelSaveToPhrasebook)), contentAlignment = Alignment.Center) {
                    Icon(if (saved) Icons.Filled.Check else Icons.Filled.Add, null, tint = if (saved) c.success else c.secondary)
                }
            }
        }
        ui.notice?.let { VText(it, LKType.bodyMd, c.secondary) }
    }
    if (page.linkers.isNotEmpty()) LKCard {
        VTitle(t(L10nKey.modelLinkingWordsCohesion))
        VFlow { page.linkers.forEach { l -> Ltr { VChip(l, { a.say(l) }) } } }
    }
    // outline / vocabulary / pitfalls / band 6
    if (page.hasOutline) LKCard {
        VTitle(t(L10nKey.modelOutline))
        m.jarr("outline").forEachIndexed { i, o -> Ltr { VText("${i + 1}.  " + o.js(), LKType.bodyMd, c.onSurface) } }
    }
    if (page.hasVocab) LKCard {
        VTitle(t(L10nKey.modelTopicVocabulary))
        m.jarr("vocab").forEach { v ->
            val p = (v as? kotlinx.serialization.json.JsonArray)?.map { it.js() } ?: return@forEach
            Ltr { VText(p.getOrElse(0) { "" }, LKType.titlePill, c.onSurface) }
            if (t.lang == "vi") VMuted(p.getOrElse(1) { "" })
        }
    }
    if (page.hasPitfalls) LKCard {
        VTitle(t(L10nKey.modelCommonMistakes))
        m.jarr("pitfalls").forEach { Ltr { VText("•  " + it.js(), LKType.bodyMd, c.onSurface) } }
    }
    m.jobj("band6")?.let { b6 ->
        LKCard(onClick = a.toggleBand6) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                VText(t(L10nKey.modelBand6EssayFor), LKType.titlePill, c.onSurface, Modifier.weight(1f))
                VBadge("Band 6.0")
            }
            if (ui.band6Open) {
                Ltr { VText(b6.jstr("text"), LKType.bodyMd, c.onSurface) }
                VTitle(t(L10nKey.modelWhyItOnlyReaches))
                val notes = b6.jobj("notes")
                listOf("TR" to "Task Response", "CC" to "Coherence & Cohesion", "LR" to "Lexical Resource", "GRA" to "Grammatical Range & Accuracy").forEach { (k, n) ->
                    if (notes.jstr(k).isNotEmpty()) Ltr { VText("$k · $n: " + notes.jstr(k), LKType.bodySm, c.onSurfaceVariant) }
                }
            }
        }
    }
}

private val SENT = Regex("[^.!?]+[.!?]+")

/** The essay with highlighted phrases (tap = save), linkers and sentence roles, following the annotation switches. */
@Composable
private fun Annotated(paras: List<Models.Para>, annot: Set<String>, lang: String, saved: Set<String>, onChunk: (String, String) -> Unit, hl: HlState = HlState(), onSentence: (Int) -> Unit = {}) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    var ord = 0 // running sentence ordinal over the whole essay (the free highlight is stored by ordinal)
    Ltr {
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            paras.forEach { p ->
                if (p.head != null && "role" in annot) VBadge(t.src(p.head!!), c.tertiaryContainer, c.onTertiaryContainer)
                val plain = buildAnnotatedString {
                    p.segs.forEach { s ->
                        when (s) {
                            is Models.Seg.Text -> append(s.s)
                            is Models.Seg.Role -> if ("role" in annot) withStyle(SpanStyle(color = c.onTertiaryContainer, background = c.tertiaryContainer, fontWeight = FontWeight.Bold, fontSize = LKType.bodySm.size)) { append(" ${t.src(s.s)} ") }
                            is Models.Seg.Link -> if ("lk" in annot) withStyle(SpanStyle(color = c.tertiary, fontWeight = FontWeight.Bold)) { append(s.s) } else append(s.s)
                            is Models.Seg.Chunk -> if ("ch" in annot) {
                                pushStringAnnotation("chunk", s.en + "\u0000" + s.vi)
                                withStyle(SpanStyle(color = c.secondary, fontWeight = FontWeight.SemiBold, textDecoration = TextDecoration.Underline, background = if (s.en in saved) c.secondaryContainer.copy(alpha = 0.25f) else androidx.compose.ui.graphics.Color.Unspecified)) { append(s.en) }
                                pop()
                                if ("gl" in annot && Models.glossVisible(lang)) withStyle(SpanStyle(color = c.onSurfaceVariant, fontSize = LKType.bodySm.size)) { append(" (${s.vi})") }
                            } else append(s.en)
                        }
                    }
                }
                val sents = SENT.findAll(plain.text).map { it.range }.toList()
                val base = ord; ord += sents.size
                val text = if (hl.marked.isEmpty()) plain else buildAnnotatedString {
                    append(plain)
                    sents.forEachIndexed { k, r -> if (base + k in hl.marked) addStyle(SpanStyle(background = c.tertiaryContainer), r.first, r.last + 1) }
                }
                ClickableText(text, style = LKType.bodyLg.toCompose().copy(color = c.onSurface, lineHeight = 34.sp), onClick = { off ->
                    if (hl.on) { val k = sents.indexOfFirst { off in it }; if (k >= 0) onSentence(base + k); return@ClickableText }
                    text.getStringAnnotations("chunk", off, off).firstOrNull()?.let { a -> val (en, vi) = a.item.split("\u0000"); onChunk(en, vi) }
                })
            }
        }
    }
}

@Composable
private fun PracticeTab(page: Models.Page, ui: ModelUi, tools: ModelTools, a: ModelActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val m = page.m
    LKCard {
        when (ui.tab) {
            "vocab", "link" -> GapPractice(m, ui.tab, ui.seed, a)
            "gram" -> GramPractice(m, ui.seed, tools, a)
            "copy" -> SlotsPractice(m, a)
            else -> LemmaPractice(m, tools, a)
        }
    }
    ui.finish?.let { f ->
        LKCard {
            VText(t.s(L10nKey.paraCorrect, "right" to ui.right, "total" to ui.total, "pct" to f.pct), LKType.headlineMd, if (f.done) c.success else c.error)
            if (f.done && f.next != null) LKPrimaryButton(t(L10nKey.modelNextMode) + " → " + t(practiceLabel(f.next!!)), { a.setTab(f.next!!) })
        }
    }
}

// ---------------------------------------------------------------- shared small pieces
@Composable
private fun Field(value: String, onChange: (String) -> Unit, width: Int, state: Boolean?, focused: Boolean, hint: String = "", onFocus: () -> Unit = {}) {
    val c = LocalLKColors.current
    val shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp)
    val color = when { state == true -> c.success; state == false -> c.error; focused -> c.secondary; else -> c.outlineVariant }
    androidx.compose.foundation.text.BasicTextField(
        value, onChange, singleLine = true,
        modifier = Modifier.widthIn(min = width.dp, max = (width + 24).dp).heightIn(min = MinTap).clip(shape).border(2.dp, color, shape).padding(horizontal = 6.dp, vertical = 10.dp)
            .onFocusChanged { if (it.isFocused) onFocus() },
        textStyle = LKType.bodyMd.toCompose().copy(color = c.onSurface),
        cursorBrush = androidx.compose.ui.graphics.SolidColor(c.secondary),
        keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(autoCorrectEnabled = false),
        decorationBox = { inner -> Box(contentAlignment = Alignment.CenterStart) { if (value.isEmpty() && hint.isNotEmpty()) Text(hint, style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant); inner() } },
    )
}
@Composable
private fun ActionRow(primary: Pair<String, () -> Unit>, vararg others: Pair<String, () -> Unit>) {
    LKPrimaryButton(primary.first, primary.second)
    VFlow { others.forEach { LKPillButton(it.first, it.second) } }
}

private sealed interface GapPart { class T(val s: String) : GapPart; class G(val i: Int) : GapPart }
private fun gapParts(text: String, kind: String): List<List<GapPart>> {
    var n = 0
    return Models.paras(text).map { p ->
        val s = Models.stripRole(p); val out = ArrayList<GapPart>(); var pos = 0
        fun words(x: String) = x.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.forEach { out.add(GapPart.T(it)) }
        for (mm in Regex("\\[\\[([^|\\]]+)\\|([^\\]]+)\\]\\]|\\{\\{([^}]+)\\}\\}").findAll(s)) {
            words(s.substring(pos, mm.range.first)); pos = mm.range.last + 1
            val chunk = mm.groupValues[1].isNotEmpty()
            val txt = if (chunk) mm.groupValues[1] else mm.groupValues[3]
            if ((kind == "vocab") == chunk) out.add(GapPart.G(n++)) else words(txt)
        }
        words(s.substring(pos)); out
    }
}

@Composable
private fun GapPractice(m: JsonObject, kind: String, seed: Long, a: ModelActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val g = remember(m, kind, seed) { Models.gap(m, kind, Random(seed)) }
    val parts = remember(m, kind) { gapParts(m.jstr("text"), kind) }
    val vi = remember(m) { Models.chunksOf(m.jstr("text")).map { it.second } }
    var inputs by remember(g) { mutableStateOf(List(g.answers.size) { "" }) }
    var focus by remember(g) { mutableIntStateOf(0) }
    var res by remember(g) { mutableStateOf<List<Boolean>?>(null) }
    var hints by remember { mutableStateOf(true) }
    VMuted((if (kind == "vocab") t(L10nKey.modelFillTheGapsWith) else t(L10nKey.modelFillEachGapWith)).plain())
    if (kind == "vocab" && t.lang == "vi") VChip(t(L10nKey.modelShowMeaningHintsNext), { hints = !hints }, selected = hints)
    val used = inputs.map { Models.norm(it) }.toSet()
    VFlow { g.bank.forEach { w -> Ltr { VChip(w, { if (focus in inputs.indices) { inputs = inputs.toMutableList().also { it[focus] = w }; res = null; focus = inputs.indexOfFirst { x -> x.isEmpty() }.takeIf { it >= 0 } ?: focus } }, selected = Models.norm(w) in used) } } }
    Ltr {
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            parts.forEach { para ->
                VFlow {
                    para.forEach { part ->
                        when (part) {
                            is GapPart.T -> Text(part.s, style = LKType.bodyLg.toCompose(), color = c.onSurface, modifier = Modifier.heightIn(min = MinTap).padding(top = 10.dp))
                            is GapPart.G -> Column {
                                Field(inputs[part.i], { v -> inputs = inputs.toMutableList().also { it[part.i] = v }; res = null }, (g.answers[part.i].length * 8 + 24).coerceIn(56, 160), res?.get(part.i), focus == part.i, onFocus = { focus = part.i })
                                if (kind == "vocab" && hints && t.lang == "vi") vi.getOrNull(part.i)?.let { VMuted(it) }
                            }
                        }
                    }
                }
            }
        }
    }
    res?.let { r -> r.forEachIndexed { i, ok -> if (!ok) Ltr { VText(t.s(L10nKey.modelAnswer, "ans" to g.answers[i]), LKType.bodySm, c.error) } } }
    ActionRow(
        t(L10nKey.actionCheck) to { val r = inputs.indices.map { Models.norm(inputs[it]) == Models.norm(g.answers[it]) }; res = r; a.finish(kind, r.count { it }, g.answers.size) },
        t(L10nKey.modelShowAnswers) to { inputs = g.answers; res = null },
        t(L10nKey.modelClearAll) to { inputs = List(g.answers.size) { "" }; res = null; focus = 0 },
    )
}

@Composable
private fun SlotPick(pre: String, post: String, options: List<String>, value: String, state: Boolean?, answer: String, onPick: (String) -> Unit) {
    val c = LocalLKColors.current
    var open by remember { mutableStateOf(false) }
    Row(verticalAlignment = Alignment.CenterVertically) {
        if (pre.isNotEmpty()) Text(pre, style = LKType.bodyLg.toCompose(), color = c.onSurface)
        Box {
            VChip(value.ifEmpty { "…" } + (if (state == false) "  ($answer)" else ""), { open = true }, selected = state == true)
            DropdownMenu(open, { open = false }) { options.forEach { o -> DropdownMenuItem(text = { Text(o) }, onClick = { onPick(o); open = false }) } }
        }
        if (post.isNotEmpty()) Text(post, style = LKType.bodyLg.toCompose(), color = c.onSurface)
    }
}

private fun splitKeep(p: String): List<String> { val out = ArrayList<String>(); var pos = 0; for (mm in Regex("\\s+").findAll(p)) { out.add(p.substring(pos, mm.range.first)); out.add(mm.value); pos = mm.range.last + 1 }; out.add(p.substring(pos)); return out }

@Composable
private fun GramPractice(m: JsonObject, seed: Long, tools: ModelTools, a: ModelActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val lem = tools.lemmatizer
    // the web's first choice: real mistakes planted in the model (needs the word library); otherwise choose the right form
    val errs = remember(m, seed, lem, tools.index) { if (lem != null && tools.index.isNotEmpty()) Models.errors(m, lem, { tools.index[it] }, Random(seed)) else null }
    if (errs != null) { ErrPractice(m, errs, a); return }
    val toks = remember(m, seed) { Models.gram(m, tools.forms, Random(seed)) }
    val slots = remember(toks) { toks.flatten().filterIsInstance<Models.GramTok.Slot>() }
    var picks by remember(toks) { mutableStateOf(List(slots.size) { "" }) }
    var res by remember(toks) { mutableStateOf<List<Boolean>?>(null) }
    VMuted(t(L10nKey.modelChooseTheCorrectForm).plain())
    Ltr {
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            toks.forEach { para ->
                VFlow {
                    para.forEach { tk ->
                        when (tk) {
                            is Models.GramTok.Plain -> if (tk.s.isNotBlank()) Text(tk.s, style = LKType.bodyLg.toCompose(), color = c.onSurface, modifier = Modifier.heightIn(min = MinTap).padding(top = 10.dp))
                            is Models.GramTok.Slot -> SlotPick(tk.slot.pre, tk.slot.post, tk.slot.options, picks[tk.i], res?.get(tk.i), tk.slot.answer) { o -> picks = picks.toMutableList().also { it[tk.i] = o }; res = null }
                        }
                    }
                }
            }
        }
    }
    ActionRow(
        t(L10nKey.actionCheck) to {
            val r = slots.indices.map { picks[it].lowercase() == slots[it].slot.answer.lowercase() }; res = r
            a.finish("gram", Models.gramScore(slots.map { it.slot.answer }, picks), slots.size)
        },
        t(L10nKey.modelShuffleGaps) to a.redo,
    )
}

@Composable
private fun ErrPractice(m: JsonObject, items: List<Models.ErrItem>, a: ModelActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val text = remember(m) { Models.paras(Models.plain(Models.stripRole(m.jstr("text")))).joinToString("\n\n") }
    val toks = remember(text) { splitKeep(text) }
    val at = remember(items) { items.withIndex().associate { (k, v) -> v.i to k } }
    var typed by remember(items) { mutableStateOf(List(items.size) { "" }) }
    var res by remember(items) { mutableStateOf<List<Boolean>?>(null) }
    VMuted(t.s(L10nKey.modelTheModelAnswerNow, "n" to items.size).plain())
    val paras = ArrayList<List<Int>>(); var cur = ArrayList<Int>()
    toks.forEachIndexed { i, tok -> if (tok.isNotBlank() || at.containsKey(i)) cur.add(i) else if (tok.contains("\n\n") && cur.isNotEmpty()) { paras.add(cur); cur = ArrayList() } }
    if (cur.isNotEmpty()) paras.add(cur)
    Ltr {
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            paras.forEach { idx ->
                VFlow {
                    idx.forEach { i ->
                        val k = at[i]
                        if (k == null) Text(toks[i], style = LKType.bodyLg.toCompose(), color = c.onSurface, modifier = Modifier.heightIn(min = MinTap).padding(top = 10.dp))
                        else {
                            val e = items[k]
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                if (e.pre.isNotEmpty()) Text(e.pre, style = LKType.bodyLg.toCompose(), color = c.onSurface)
                                if (e.wrong.isNotEmpty()) Text(e.wrong, style = LKType.bodyLg.toCompose().copy(textDecoration = TextDecoration.Underline), color = c.error)
                                Field(typed[k], { v -> typed = typed.toMutableList().also { x -> x[k] = v }; res = null }, (e.ans.length * 8 + 24).coerceIn(48, 140), res?.get(k), false, hint = if (e.wrong.isEmpty()) "+" else "")
                                if (e.post.isNotEmpty()) Text(e.post, style = LKType.bodyLg.toCompose(), color = c.onSurface)
                            }
                        }
                    }
                }
            }
        }
    }
    res?.let { r -> r.forEachIndexed { k, ok -> if (!ok) Ltr { VText(items[k].let { x -> (whyKey(x.why)?.let { w -> t(w) } ?: "") + ": " + x.ans }, LKType.bodySm, c.error) } } }
    ActionRow(
        t(L10nKey.actionCheck) to { val r = items.indices.map { Models.norm(typed[it]) == Models.norm(items[it].ans) }; res = r; a.finish("gram", Models.errScore(items, typed), items.size) },
        t(L10nKey.lessonAnswer) to { typed = items.map { it.ans }; res = null },
        t(L10nKey.modelNewSetOfErrors) to a.redo,
    )
}

@Composable
private fun SlotsPractice(m: JsonObject, a: ModelActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val (blocks, answers) = remember(m) { Models.slots(m) }
    var inputs by remember(m) { mutableStateOf(List(answers.size) { "" }) }
    var res by remember(m) { mutableStateOf<List<Boolean>?>(null) }
    var hint by remember { mutableStateOf(false) }
    VMuted(t(L10nKey.modelRetypeTheWholeModel).plain())
    VChip(t(L10nKey.modelFirstLetterHints), { hint = !hint }, selected = hint)
    // slot number of every word token (-1 = punctuation), computed once so recomposition can never shift the numbering
    val slotIdx = remember(blocks) { var n = 0; blocks.map { b -> b.toks.map { tok -> if (Regex("^[^A-Za-z\\d]$").matches(tok)) -1 else n++ } } }
    Ltr {
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            blocks.forEachIndexed { bi, b ->
                if (b.role.isNotEmpty()) VBadge(t.src(b.role), c.tertiaryContainer, c.onTertiaryContainer)
                VFlow {
                    b.toks.forEachIndexed { ti, tok ->
                        val i = slotIdx[bi][ti]
                        if (i < 0) Text(tok, style = LKType.bodyLg.toCompose(), color = c.onSurface, modifier = Modifier.heightIn(min = MinTap).padding(top = 10.dp))
                        else {
                            Field(inputs[i], { v -> inputs = inputs.toMutableList().also { it[i] = v.trim() }; res = null }, (tok.length * 9 + 16).coerceAtLeast(40), res?.get(i), false, hint = if (hint) tok.take(1) else "")
                        }
                    }
                }
            }
        }
    }
    VMuted(t.s(L10nKey.modelWords, "done" to inputs.count { it.isNotBlank() }, "n" to answers.size))
    ActionRow(
        t(L10nKey.actionCheck) to { val r = answers.indices.map { Models.norm(inputs[it]) == Models.norm(answers[it]) }; res = r; a.finish("copy", Models.slotScore(answers, inputs), answers.size) },
        t(L10nKey.modelClearAll) to { inputs = List(answers.size) { "" }; res = null },
    )
}

@Composable
private fun LemmaPractice(m: JsonObject, tools: ModelTools, a: ModelActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val sents = remember(m) { Models.sentencesOf(m) }
    val lem = tools.lemmatizer
    val prompts = remember(sents, lem) { sents.map { s -> Models.lemmaPrompt(s.s) { w -> lem?.lemma(w) ?: w.lowercase() } } }
    var inputs by remember(m) { mutableStateOf(List(sents.size) { "" }) }
    var res by remember(m) { mutableStateOf<List<Int?>?>(null) }
    var showModel by remember(m) { mutableStateOf(false) }
    VMuted(t(L10nKey.modelEachSentenceIsGiven).plain())
    sents.forEachIndexed { i, s ->
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            if (s.role.isNotEmpty()) VBadge(t.src(s.role), c.tertiaryContainer, c.onTertiaryContainer)
            Ltr { VText(prompts[i], LKType.bodyMd, c.onSurface) }
            VField(inputs[i], { v -> inputs = inputs.toMutableList().also { it[i] = v }; res = null }, t(L10nKey.modelWriteTheFullSentence), singleLine = false, lines = 2)
            val r = res?.get(i)
            if (r != null) {
                if (Models.norm(inputs[i]) == Models.norm(s.s)) VText(t(L10nKey.modelCorrect), LKType.labelMetric, c.success)
                else VText(t.s(L10nKey.modelMatch, "n" to r), LKType.labelMetric, if (r >= 85) c.secondary else c.error)
            }
            if (showModel) Ltr { VText(t(L10nKey.modelModelSentence) + " " + s.s, LKType.bodySm, c.onSurfaceVariant) }
        }
    }
    ActionRow(
        t(L10nKey.modelCheckAll) to {
            val sc = sents.indices.map { i -> if (inputs[i].isBlank()) null else Math.round(Speaking.similarity(Models.norm(inputs[i]), Models.norm(sents[i].s)) * 100).toInt() }
            res = sc
            a.finish("write", sents.indices.count { inputs[it].isNotBlank() && Models.lemmaRight(inputs[it], sents[it].s) }, sents.size)
        },
        t(L10nKey.modelShowModelSentences) to { showModel = !showModel },
    )
}
