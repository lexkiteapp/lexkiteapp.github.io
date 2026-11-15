package com.lexkite.app.feature.skills

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.withStyle
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import com.lexkite.app.core.skills.Lexis
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.skills.Part
import com.lexkite.app.core.skills.Qx
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.strs
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.Chip
import com.lexkite.app.feature.vocab.EnLtr
import com.lexkite.app.feature.vocab.Flow
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.RichBody
import com.lexkite.app.feature.vocab.StudyField
import com.lexkite.app.feature.vocab.t
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject

/** Part names (the four IELTS Listening parts). */
internal val PART_NAME = mapOf(1 to L10nKey.skillListenHoiThoaiDoiSong, 2 to L10nKey.skillListenDocThoaiXaHoi, 3 to L10nKey.skillListenThaoLuanHocThuat, 4 to L10nKey.skillListenBaiGiangHocThuat)
/** Question-type tips (qtips.js TIP) by question kind. */
private val TIP = com.lexkite.app.feature.vocab.QUESTION_TIPS

/** Speaker chips ("🇬🇧 Daniel"). */
@Composable
internal fun SpeakerChips(speakers: List<Pair<String, String>>) = Flow { for ((flag, name) in speakers) Muted(("$flag $name").trim(), Modifier.clip(RoundedCornerShape(50)).background(LocalLKColors.current.surfaceContainerHighest).padding(horizontal = LKSpacing.spaceXs, vertical = 2.dp)) }

/** Selectable answer row: letter badge + text; after grading the right answer is green and a wrong pick red (with ✓ / ✗ so colour is never the only signal). */
@Composable
internal fun Opt(letter: String, text: String, selected: Boolean, mark: Boolean?, onClick: (() -> Unit)?) {
    val c = LocalLKColors.current; val shape = RoundedCornerShape(20.dp)
    val line = when (mark) { true -> c.success; false -> c.error; null -> if (selected) c.secondary else c.outlineVariant }
    val bg = when (mark) { true -> c.surfaceContainerHighest; false -> c.errorContainer; null -> if (selected) c.secondaryContainer else c.card }
    val ink = when (mark) { false -> c.onErrorContainer; null -> if (selected) c.onSecondaryContainer else c.onSurface; else -> c.onSurface }
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(shape).background(bg).border(2.dp, line, shape).let { if (onClick != null) it.tactile(onClick, role = Role.RadioButton) else it }.semantics { this.selected = selected }.padding(LKSpacing.spaceSm),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        Text(letter, Modifier.clip(RoundedCornerShape(8.dp)).background(if (selected || mark == true) line else c.surfaceContainerHighest).padding(horizontal = 8.dp, vertical = 4.dp), color = if (selected || mark == true) c.onSecondary else c.onSurfaceVariant, style = LKType.labelBadge.toCompose())
        EnLtr { Text(text, Modifier.weight(1f), style = LKType.bodyMd.toCompose(), color = ink) }
        if (mark != null) Text(if (mark) "✓" else "✗", color = line, style = LKType.titlePill.toCompose())
    }
}

/**
 * The question groups of a part (web QE.questionsHtml): gap fills, multiple choice, true/false/not given, matching (letters), choose-2. [answers] uses the keys of [Qx.collect];
 * [graded] != null = after submitting: inputs lock, each question shows its verdict, the answer, the explanation and (listening) the evidence button.
 */
@Composable
fun QuestionGroups(p: Part, answers: Map<String, Any?>, graded: Map<Int, Qx.Res>?, tips: Boolean, onAnswer: (String, Any?) -> Unit, onHear: ((Int) -> Unit)? = null, hide: Set<Int> = emptySet()) {
    val c = LocalLKColors.current
    p.groups.forEachIndexed { gi, gr ->
        val type = gr.gs("type"); val kind = Qx.kindOf(gr)
        val nums = if (type == "multi") gr.ga("n").map { it.toString().trim('"').toDouble().toInt() } else gr.ga("items").map { (it as JsonObject).gs("n").toDouble().toInt() }
        if (nums.isNotEmpty() && nums.all { it in hide }) return@forEachIndexed
        LKCard(fill = c.surfaceContainerHighest) {
            if (gr.gs("title").isNotEmpty()) Body(gr.gs("title"), style = LKType.titlePill)
            Muted(gr.gs("instr"))
            if (tips) TIP[kind]?.let { k -> Muted(t(L10nKey.skillQtMeoLamBai) + " · " + t(k)) }
            if (type == "multi") {
                val picked = (answers["m$gi"] as? List<*>)?.map { it.toString() } ?: emptyList(); val want = gr.strs("a")
                val ns = gr.ga("n").map { it.toString().trim('"').toDouble().toInt() }
                Body("${ns.first()}–${ns.last()}  " + gr.gs("q"))
                for (o in gr.strs("options")) { val code = Qx.code(o); val on = code in picked
                    Opt(code, Qx.label(o), on, if (graded != null && (on || code in want)) code in want else null, if (graded == null) ({ onAnswer("m$gi", if (on) picked - code else if (picked.size < 2) picked + code else picked) }) else null) }
                if (graded != null) Verdict(graded[ns.first()], gr.gs("explain"), ns.first(), onHear)
            } else {
              if (type == "match" && gr.strs("options").any { o -> Qx.label(o).isNotEmpty() }) Muted(gr.strs("options").joinToString("\n"))
              for (e in gr.ga("items")) {
                val q = e as JsonObject; val n = q.gs("n").toDouble().toInt(); if (n in hide) continue; val key = n.toString(); val cur = answers[key] as? String ?: ""
                if (type == "mcq") Body("$n. " + q.gs("q"), style = LKType.titlePill)
                else if (type == "tfng" || type == "ynng" || type == "match") Body("$n. " + q.gs("text"), style = LKType.titlePill)
                val res = graded?.get(n)
                when (type) {
                    "mcq" -> q.strs("options").forEachIndexed { k, o -> val on = cur == k.toString(); Opt("ABCDEFGH"[k].toString(), o, on, if (graded != null && (on || q.gs("a") == k.toString())) q.gs("a") == k.toString() else null, if (graded == null) ({ onAnswer(key, k.toString()) }) else null) }
                    "tfng", "ynng" -> Flow { for (v in (if (type == "tfng") listOf("TRUE", "FALSE", "NOT GIVEN") else listOf("YES", "NO", "NOT GIVEN"))) Chip(v, cur == v, { if (graded == null) onAnswer(key, v) }) }
                    "match" -> Flow { for (o in gr.strs("options")) Chip(Qx.code(o), cur == Qx.code(o), { if (graded == null) onAnswer(key, Qx.code(o)) }) }
                    else -> { Body("$n.  " + q.gs("text").replace("___", "…")); StudyField(cur, { v -> onAnswer(key, v) }, n.toString(), enabled = graded == null) }
                }
                if (res != null) Verdict(res, q.gs("explain"), n, onHear)
              }
            }
        }
    }
}

/** ✓/✗ + "Đáp án: …" + explanation + the evidence button of one graded question. */
@Composable
private fun Verdict(r: Qx.Res?, explain: String, n: Int, onHear: ((Int) -> Unit)?) {
    if (r == null) return
    val c = LocalLKColors.current
    Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
        RichBody((if (r.ok) "✓ " else "✗ ") + t(L10nKey.skillQeDapAnA, mapOf("a" to r.answer)), color = if (r.ok) c.success else c.error)
        if (r.over) Muted(t(L10nKey.skillQeVuotQuaSoTu))
        if (explain.isNotEmpty()) Muted("💡 $explain")
        if (r.cue.isNotEmpty() && onHear != null) GhostButton("🔎 " + t(L10nKey.skillListenNgheDoanCoDap), { onHear(n) })
    }
}


/** "Results by question type" (QE.stats): right / total, % and the wrong question numbers per type; [onRetake] adds "Làm lại n câu sai". */
@Composable
internal fun StatsCard(res: Collection<Qx.Res>, onRetake: (() -> Unit)? = null) {
    val c = LocalLKColors.current; val rows = Qx.stats(res.withIndex().associate { it.index to it.value }); val wrong = res.count { !it.ok }
    LKCard {
        Body("📊 " + t(L10nKey.skillQeKetQuaTheoDang), style = LKType.titlePill)
        for (r in rows) Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
            EnLtr { Body(Qx.kindName(r.kind), style = LKType.labelMetric) }
            Muted("${r.right}/${r.total} · ${r.pct}%" + if (r.wrong.isNotEmpty()) " · " + t(L10nKey.skillQeCauSai) + ": " + r.wrong.joinToString(", ") else "")
        }
        if (wrong > 0 && onRetake != null) GhostButton("↻ " + t(L10nKey.skillQeLamLaiNCau, mapOf("n" to wrong)), onRetake)
    }
}


/** Bidi isolation for the Skills screens only: numeric runs ("1–10", "21/40", "62%", "+20 XP") and English labels keep their left-to-right order inside Arabic text. */
internal object Bidi {
    private const val LRI = "\u2066"; private const val PDI = "\u2069"
    private val RUN = Regex("\\+?\\d+(?:[.,]\\d+)?(?:\\s?[–\\-/]\\s?\\d+(?:[.,]\\d+)?)?(?:\\s?%|\\s?XP)?")
    fun ltr(s: String) = LRI + s + PDI
    fun isolate(s: String) = RUN.replace(s) { ltr(it.value) }
}

/** "→" that mirrors in an RTL interface. */
@Composable internal fun forwardArrow(): String = if (androidx.compose.ui.platform.LocalLayoutDirection.current == androidx.compose.ui.unit.LayoutDirection.Rtl) "←" else "→"

/** A labelled on/off row (Stitch switch): the label wraps, the switch keeps a ≥ 48 dp target. */
@Composable
fun SwitchRow(label: String, on: Boolean, enabled: Boolean = true, onChange: (Boolean) -> Unit) {
    val c = LocalLKColors.current
    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        Muted(label, Modifier.weight(1f))
        androidx.compose.material3.Switch(on, onChange, enabled = enabled, colors = androidx.compose.material3.SwitchDefaults.colors(checkedTrackColor = c.secondary, checkedThumbColor = c.onSecondary, uncheckedTrackColor = c.surfaceContainerHighest,
            uncheckedThumbColor = c.outline, uncheckedBorderColor = c.outline, checkedBorderColor = c.secondary, disabledCheckedTrackColor = c.secondary.copy(alpha = 0.5f), disabledUncheckedTrackColor = c.surfaceContainerHighest))
    }
}


/** One sentence of a passage as tokens (words are [Lexis.Tok], the rest plain text); [hot] = the sentence being read aloud. */
internal class TokSent(val tokens: List<Any>, val sentence: String, val hot: Boolean = false)

/**
 * Running text made of tokens: ONE text block so spacing, punctuation and line height are those of a normal paragraph (Stitch `reader`); a word only gets a background when it is
 * a highlighted category or the active / read-aloud word; every word stays tappable ([onWord] gets the word token and its sentence).
 */
@Composable
internal fun TokenText(sents: List<TokSent>, style: androidx.compose.ui.text.TextStyle, wordStyle: (Lexis.Tok) -> androidx.compose.ui.text.SpanStyle, hotBg: Color, onWord: (Lexis.Tok, String) -> Unit, modifier: Modifier = Modifier) {
    val flat = ArrayList<Pair<Lexis.Tok, String>>()
    val text = androidx.compose.ui.text.buildAnnotatedString {
        for (s in sents) for (tk in s.tokens) {
            val hot = if (s.hot) androidx.compose.ui.text.SpanStyle(background = hotBg) else androidx.compose.ui.text.SpanStyle()
            if (tk is Lexis.Tok) { pushStringAnnotation("w", flat.size.toString()); flat.add(tk to s.sentence); withStyle(wordStyle(tk).merge(hot)) { append(tk.text) }; pop() }
            else withStyle(hot) { append(tk.toString()) }
        }
    }
    var layout by androidx.compose.runtime.remember { androidx.compose.runtime.mutableStateOf<androidx.compose.ui.text.TextLayoutResult?>(null) }
    Text(text, modifier.pointerInput(text) { detectTapGestures { pos -> layout?.let { l -> val off = l.getOffsetForPosition(pos)
        text.getStringAnnotations("w", off, off).firstOrNull()?.let { a -> flat.getOrNull(a.item.toInt())?.let { (tk, sent) -> onWord(tk, sent) } } } } }, style = style, onTextLayout = { layout = it })
}
