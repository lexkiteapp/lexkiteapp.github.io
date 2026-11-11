package com.lexkite.app.feature.lesson

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.Backspace
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.HearingDisabled
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MicOff
import androidx.compose.material.icons.filled.SlowMotionVideo
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.lesson.LItem
import com.lexkite.app.core.lesson.LessonData
import com.lexkite.app.core.rig.TeacherSignal
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalHaptics
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.delay
import kotlinx.serialization.json.JsonPrimitive

/** Everything the screen can ask the host to do. Defaults are no-ops so snapshot tests only pass what they show. */
class LessonActions(
    val pick: (String) -> Unit = {}, val placeTile: (Int) -> Unit = {}, val removeTile: (Int) -> Unit = {}, val type: (String) -> Unit = {},
    val bankTap: (Int) -> Unit = {}, val bankBack: () -> Unit = {}, val useBank: () -> Unit = {}, val matchTap: (Boolean, Int) -> Unit = { _, _ -> }, val clearFlash: () -> Unit = {},
    val hint: () -> Unit = {}, val check: () -> Unit = {}, val next: () -> Unit = {}, val lineContinue: () -> Unit = {},
    val play: (LItem, Boolean) -> Unit = { _, _ -> }, val playText: (String, String, Boolean) -> Unit = { _, _, _ -> }, val playWord: (String, String) -> Unit = { _, _ -> },
    val skipListen: () -> Unit = {}, val skipSpeak: () -> Unit = {}, val mic: () -> Unit = {}, val close: () -> Unit = {}, val again: () -> Unit = {}, val share: (String) -> Unit = {},
)

/** Microphone state shown on the say exercise. */
data class MicUi(val listening: Boolean = false, val error: Boolean = false)

/** Teacher slots filled by :app (animated rig / still image) so this module stays free of the rig renderer and image decoding. */
class LessonSlots(
    val teacher: @Composable (who: String, signal: TeacherSignal?, modifier: Modifier) -> Unit = { _, _, _ -> },
    val still: @Composable (who: String, pose: String, modifier: Modifier) -> Unit = { _, _, _ -> },
    val image: @Composable (url: String, description: String, modifier: Modifier) -> Unit = { _, _, _ -> },
)

internal fun titleKey(it: LItem): L10nKey? = when (it.type) {
    "gap" -> L10nKey.lessonQGap; "build" -> if (!it.prompt.isNullOrEmpty()) L10nKey.lessonQBuild else L10nKey.lessonQBuildHeard; "say" -> L10nKey.lessonQSay
    "pic" -> if (it.choice == true) L10nKey.lessonQPicChoice else L10nKey.lessonQPicSay; "tr" -> L10nKey.lessonQTr; "mean" -> L10nKey.lessonQMean
    "type" -> L10nKey.lessonQType; "match" -> L10nKey.lessonQMatch; "q" -> L10nKey.lessonQQ; else -> null
}
internal fun listens(it: LItem) = it.noAudio != true && (it.type == "gap" || it.type == "build" || it.type == "say" || it.type == "type")
internal fun speaks(it: LItem) = it.type == "say" || (it.type == "pic" && it.choice != true)
private val LETTERS = "ABCDEFGH"

/** P03 – one lesson screen: segmented progress, exercise, Check / feedback sheet, completion. Stateless: drive it from [LessonController.ui]. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun LessonScreen(ui: LessonUi, who: String, kindLabel: String, a: LessonActions, slots: LessonSlots, mic: MicUi = MicUi(), pose: String? = null,
                 gold: Map<String, List<LessonData.Gold>>? = null, imageUrl: (String, String) -> String? = { _, _ -> null }, signal: TeacherSignal? = null) {
    val c = LocalLKColors.current; val t = LocalL10n.current; val haptics = LocalHaptics.current
    var confirm by remember { mutableStateOf(false) }
    val exit: () -> Unit = { if (ui.exitNeedsConfirm) { confirm = true } else { a.close() } }
    BackHandler(onBack = exit)
    LaunchedEffect(ui.feedback) { ui.feedback?.let { if (it.ok) haptics.correct() else haptics.wrong() } }
    LaunchedEffect(ui.finish != null) { if (ui.finish != null) haptics.done() }
    val cur = ui.cur
    Column(Modifier.fillMaxSize().background(c.background)) {
        Header(ui, exit)
        if (ui.finish != null) FinishView(ui.finish, who, pose, a, slots)
        else if (cur != null) {
            val fb = ui.feedback
            Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter).imePadding()) {
                ContextRow(ui, cur, kindLabel)
                Stage(cur, who, slots, signal)
                QuestionCard(ui, cur, a, slots, mic, imageUrl, fb != null)
                if (cur.type != "line" && cur.type != "match") Spacer(Modifier.height(LKSpacing.spaceSm))
                Body(ui, cur, a, mic, fb != null)
                Spacer(Modifier.height(LKSpacing.spaceMd))
            }
            if (fb != null) FeedbackSheet(fb, ui, who, pose, a, slots, gold)
            else Footer(ui, cur, a)
        }
    }
    if (confirm) AlertDialog(
        onDismissRequest = { confirm = false }, containerColor = c.card,
        title = { Text(t(L10nKey.lessonExitAsk), style = LKType.headlineSm.toCompose(), color = c.onSurface) },
        text = { Text(t(L10nKey.lessonExitLose), style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant) },
        confirmButton = { TextButton({ confirm = false; a.close() }, Modifier.heightIn(min = 48.dp)) { Text(t(L10nKey.lessonExitGo), color = c.error) } },
        dismissButton = { TextButton({ confirm = false }, Modifier.heightIn(min = 48.dp)) { Text(t(L10nKey.lessonExitStay), color = c.secondary) } },
    )
}

/** X (≥ 48 dp) · segmented progress (one segment per exercise, max 12) · "Question a of b". */
@Composable
private fun Header(ui: LessonUi, onExit: () -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    val n = ui.total.coerceIn(1, 12); val filled = Math.round(ui.progress * n)
    val label = t(L10nKey.lessonProgress)
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        IconButton(onExit, Modifier.size(48.dp).testTag("lk-exit")) { Icon(Icons.Filled.Close, t(L10nKey.lessonExit), tint = c.onSurfaceVariant) }
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(Modifier.fillMaxWidth().semantics(mergeDescendants = true) { contentDescription = label; progressBarRangeInfo = ProgressBarRangeInfo(ui.progress, 0f..1f) }, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                for (i in 0 until n) Box(Modifier.weight(1f).height(8.dp).clip(PillShape).background(if (i < filled) c.secondary else tokens.surfaceContainerHighest))
            }
            if (ui.finish == null) Text(t(L10nKey.lessonQn, mapOf("a" to ui.position, "b" to ui.total)), style = LKType.labelBadge.toCompose(), color = c.onSurfaceVariant)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun ContextRow(ui: LessonUi, cur: LItem, kindLabel: String) {
    val c = LocalLKColors.current; val t = LocalL10n.current; val tk = tokens
    FlowRow(Modifier.fillMaxWidth().padding(vertical = LKSpacing.spaceXs), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        if (ui.combo >= 3) Chip(t(L10nKey.lessonCombo, mapOf("n" to ui.combo)), tk.tertiaryFixed.copy(alpha = 0.16f), c.tertiary, line = c.tertiary.copy(alpha = 0.4f))
        if (kindLabel.isNotEmpty()) Chip(kindLabel, tokens.surfaceContainerHighest, c.onSurfaceVariant, line = c.outlineVariant)
        if (ui.retry) Chip("↺ " + t(L10nKey.lessonTagOld), tk.errorContainer, tk.onErrorContainer)
        else if (cur.own == true && (cur.type == "gap" || cur.type == "build")) Chip(t(L10nKey.lessonTagLooked), c.secondaryContainer.copy(alpha = 0.2f), c.onSurface, line = c.secondary.copy(alpha = 0.4f))
    }
}

/** Teacher on a pedestal (Stitch: 150 dp stage, pill base). Story lines show who is talking via the avatar. */
@Composable
private fun Stage(cur: LItem, who: String, slots: LessonSlots, signal: TeacherSignal?) {
    val c = LocalLKColors.current; val tk = tokens; val t = LocalL10n.current
    if (cur.type == "line") return
    Box(Modifier.fillMaxWidth().height(150.dp).padding(bottom = 4.dp).semantics { contentDescription = t(L10nKey.lessonTeacher) }, contentAlignment = Alignment.BottomCenter) {
        Box(Modifier.width(200.dp).height(28.dp).clip(PillShape).background(tk.surfaceContainerHighest).border(1.dp, c.outlineVariant, PillShape))
        slots.teacher(cur.who ?: who, signal, Modifier.width(170.dp).height(144.dp))
    }
}

/** Question card: kind title, optional sub-line (translation / meaning / typing hint), audio buttons, the sentence with the gap or the picture. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun QuestionCard(ui: LessonUi, cur: LItem, a: LessonActions, slots: LessonSlots, mic: MicUi, imageUrl: (String, String) -> String?, checked: Boolean) {
    val c = LocalLKColors.current; val t = LocalL10n.current; val tk = tokens
    if (cur.type == "line" || cur.type == "match") { if (cur.type == "match") TitleOnly(cur); return }
    val shape = RoundedCornerShape(20.dp)
    Box(Modifier.fillMaxWidth()) {
        Box(Modifier.matchParentSize().padding(top = 4.dp).background(tk.lipOpt, shape))
        Column(Modifier.fillMaxWidth().clip(shape).background(c.card).border(1.dp, c.outlineVariant, shape).padding(LKSpacing.spaceMd), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), horizontalAlignment = Alignment.CenterHorizontally) {
            titleKey(cur)?.let { Text(t(it), style = LKType.headlineSm.toCompose(), color = c.onSurface, textAlign = TextAlign.Center, modifier = Modifier.semantics { heading() }) }
            val sub = subline(cur)
            if (sub.isNotEmpty()) Text(sub, style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant, textAlign = TextAlign.Center)
            if (listens(cur)) Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                AudioButton(t(L10nKey.lessonReplay), Icons.AutoMirrored.Filled.VolumeUp) { a.play(cur, false) }
                AudioButton(t(L10nKey.lessonSlow), Icons.Filled.SlowMotionVideo) { a.play(cur, true) }
            }
            when {
                cur.type == "gap" && cur.blank != null -> Gap(cur, ui.st.pick, ui.feedback)
                cur.type == "say" -> Text(cur.answer, style = LKType.headlineMd.toCompose(), color = c.onSurface, textAlign = TextAlign.Center)
                cur.type == "pic" -> imageUrl(cur.word, cur.card?.get("pos")?.let { (it as? JsonPrimitive)?.content }.orEmpty())?.let { slots.image(it, t(L10nKey.lessonPic), Modifier.size(160.dp).clip(RoundedCornerShape(16.dp))) }
                cur.type == "q" -> Unit
            }
            if (checked.not() && ui.st.hints >= 0 && cur.hints.isNotEmpty() && cur.type != "match" && cur.type != "line") HintButton(cur, a)
        }
    }
}

@Composable private fun TitleOnly(cur: LItem) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    titleKey(cur)?.let { Text(t(it), style = LKType.headlineSm.toCompose(), color = c.onSurface, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(vertical = LKSpacing.spaceSm).semantics { heading() }) }
}

@Composable
private fun subline(cur: LItem): String {
    val t = LocalL10n.current
    val def = cur.def.orEmpty()
    return when (cur.type) {
        "tr", "build" -> cur.prompt.orEmpty()
        "mean" -> meanOf(cur)
        "q" -> cur.prompt.orEmpty()
        "type" -> listOf(cur.mean.orEmpty(), if (cur.noAudio == true || cur.mean.isNullOrEmpty()) def else "", t(L10nKey.lessonTypeHint, mapOf("letter" to cur.first.orEmpty(), "n" to (cur.len ?: 0)))).filter { it.isNotEmpty() }.joinToString(" · ")
        else -> ""
    }
}
internal fun meanOf(it: LItem): String = it.mean.orEmpty().ifEmpty { (it.card?.get("vi") as? JsonPrimitive)?.content.orEmpty().ifEmpty { (it.card?.get("def") as? JsonPrimitive)?.content.orEmpty() } }

@Composable
private fun AudioButton(label: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Box(Modifier.size(48.dp).clip(CircleShape).background(c.secondaryContainer.copy(alpha = 0.22f)).tactile(onClick, label), contentAlignment = Alignment.Center) { Icon(icon, label, tint = c.secondary, modifier = Modifier.size(24.dp)) }
}

/** Light bulb + "Gợi ý" (`lesson.hint`) = the next hint of this exercise type (no XP cost); the spoken name is the same string. */
@Composable
private fun HintButton(cur: LItem, a: LessonActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    if (cur.type == "say" || (cur.type == "pic" && cur.choice != true)) return
    val d = t(L10nKey.lessonHint)
    Row(Modifier.heightIn(min = MinTap).clip(PillShape).tactile(a.hint, d).padding(horizontal = LKSpacing.spaceSm), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.Filled.Lightbulb, null, tint = c.tertiary, modifier = Modifier.size(22.dp))
        Text(d, style = LKType.labelMetric.toCompose(), color = c.onSurfaceVariant)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Gap(cur: LItem, pick: String?, fb: Feedback?) {
    val c = LocalLKColors.current; val tk = tokens
    val b = cur.blank ?: return
    EnglishLtr { FlowRow(Modifier.fillMaxWidth().padding(vertical = LKSpacing.spaceXs), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        b.toks.forEachIndexed { i, w ->
            if (i == b.i) {
                val shown = if (fb?.ok == true) cur.answer else pick.orEmpty()
                val ok = fb?.ok; val bg = if (ok == true) c.success.copy(alpha = 0.18f) else if (ok == false) tk.errorContainer else c.secondaryContainer.copy(alpha = 0.18f)
                val line = if (ok == true) c.success else if (ok == false) c.error else c.secondary
                Box(Modifier.heightIn(min = 36.dp).clip(RoundedCornerShape(12.dp)).background(bg).border(2.dp, line, RoundedCornerShape(12.dp)).padding(horizontal = 12.dp, vertical = 2.dp), contentAlignment = Alignment.Center) {
                    Text(shown.ifEmpty { "  " }, style = LKType.headlineSm.toCompose(), color = if (ok == false) tk.onErrorContainer else c.onSurface)
                }
            } else if (i > b.i && i < b.i + b.n) Unit
            else Text(w, style = LKType.headlineSm.toCompose(), color = c.onSurface)
        }
    } }
}

/** The answer area under the question card. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Body(ui: LessonUi, cur: LItem, a: LessonActions, mic: MicUi, checked: Boolean) {
    val c = LocalLKColors.current; val t = LocalL10n.current; val st = ui.st
    when (cur.type) {
        "gap", "mean", "q", "pic" -> if (cur.type != "pic" || cur.choice == true) {
            val opts = (cur.options ?: emptyList()).filter { it !in st.removed || checked }
            val ans = ui.feedback
            val oneCol = cur.type == "q"
            val mark = { o: String -> if (ans != null) { if (o == cur.answer) Mark.RIGHT else if (!ans.ok && o == ans.given) Mark.WRONG else Mark.DIM } else if (o == st.pick) Mark.SELECTED else Mark.NONE }
            Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                (if (oneCol) opts.map { listOf(it) } else opts.chunked(2)).forEach { rowOpts ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                        rowOpts.forEach { o ->
                            val i = (cur.options ?: emptyList()).indexOf(o).coerceAtLeast(0); val m = mark(o)
                            val tag = if (ans != null && !ans.ok) (if (m == Mark.RIGHT) t(L10nKey.lessonCorrectChoice) else if (m == Mark.WRONG) t(L10nKey.lessonYourChoice) else null) else null
                            OptionCard(LETTERS[i % LETTERS.length].toString(), o, m, if (ans == null) ({ a.pick(o) }) else null, Modifier.weight(1f), tag = tag)
                        }
                        if (!oneCol && rowOpts.size == 1) Spacer(Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(4.dp))
                }
            }
        } else SayArea(cur, st, a, mic, t)
        "build", "tr" -> BuildArea(cur, st, a, checked)
        "type" -> TypeArea(cur, st, a, checked)
        "match" -> MatchArea(cur, st, a, checked)
        "say" -> SayArea(cur, st, a, mic, t)
        "line" -> LineArea(ui, a)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun BuildArea(cur: LItem, st: ItemState, a: LessonActions, checked: Boolean) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    val tiles = cur.tiles ?: return
    val shape = RoundedCornerShape(16.dp)
    EnglishLtr { Column {
    FlowRow(Modifier.fillMaxWidth().heightIn(min = 112.dp).clip(shape).background(c.cardLow).border(2.dp, c.outlineVariant, shape).padding(LKSpacing.spaceXs)
        .semantics { contentDescription = t(L10nKey.lessonYourAnswerField) }, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        st.tiles.forEachIndexed { pos, i -> Tile(tiles[i], if (checked) null else ({ a.removeTile(pos) })) }
    }
    Spacer(Modifier.height(LKSpacing.spaceSm))
    Flow(Modifier.fillMaxWidth()) { tiles.forEachIndexed { i, w -> Tile(w, if (checked) null else ({ a.placeTile(i) }), dim = i in st.tiles) } }
    } }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun TypeArea(cur: LItem, st: ItemState, a: LessonActions, checked: Boolean) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    val shape = RoundedCornerShape(16.dp); val fr = remember { FocusRequester() }
    val hasBank = !cur.bank.isNullOrEmpty()
    LaunchedEffect(cur.id, cur.retry) { if (!st.bankMode) runCatching { delay(50); fr.requestFocus() } }
    EnglishLtr { Column {
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(shape).background(c.card).border(2.dp, if (checked) c.outlineVariant else c.secondary, shape).padding(horizontal = LKSpacing.spaceMd), verticalAlignment = Alignment.CenterVertically) {
        if (st.bankMode) Text(st.typed.ifEmpty { " " }, style = LKType.headlineSm.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f).semantics { contentDescription = t(L10nKey.lessonYourAnswerField) })
        else BasicTextField(st.typed, { a.type(it) }, Modifier.weight(1f).focusRequester(fr).semantics { contentDescription = t(L10nKey.lessonYourAnswerField) }, enabled = !checked, singleLine = true,
            textStyle = LKType.headlineSm.toCompose().let { s -> androidx.compose.ui.text.TextStyle(fontSize = s.fontSize, lineHeight = s.lineHeight, fontWeight = s.fontWeight, color = c.onSurface) },
            cursorBrush = SolidColor(c.secondary), keyboardOptions = KeyboardOptions(imeAction = ImeAction.Done, autoCorrectEnabled = false), keyboardActions = KeyboardActions(onDone = { a.check() }))
        if (st.bankMode && st.bankUsed.isNotEmpty() && !checked) IconButton({ a.bankBack() }, Modifier.size(48.dp)) { Icon(Icons.AutoMirrored.Filled.Backspace, t(L10nKey.actionBack), tint = c.onSurfaceVariant) }
    }
    if (hasBank && !checked) {
        Spacer(Modifier.height(LKSpacing.spaceSm))
        if (st.bankMode) Flow(Modifier.fillMaxWidth()) { cur.bank!!.forEachIndexed { i, l -> Tile(l, { a.bankTap(i) }, dim = i in st.bankUsed) } }
        else Box(Modifier.heightIn(min = MinTap).clip(PillShape).background(c.secondaryContainer.copy(alpha = 0.18f)).tactile({ a.useBank() }, t(L10nKey.lessonTypeHint, mapOf("letter" to cur.first.orEmpty(), "n" to (cur.len ?: 0)))).padding(horizontal = LKSpacing.spaceMd), contentAlignment = Alignment.Center) {
            Text(cur.first.orEmpty().uppercase() + "  ·  " + (1..(cur.len ?: 0)).joinToString(" ") { "_" }.take(40), style = LKType.labelMetric.toCompose(), color = c.secondary)
        }
    }
    } }
}

@Composable
private fun MatchArea(cur: LItem, st: ItemState, a: LessonActions, checked: Boolean) {
    val c = LocalLKColors.current; val tk = tokens
    val pairs = cur.pairs ?: return
    LaunchedEffect(st.flash) { if (st.flash) { delay(400); a.clearFlash() } }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        listOf(true to st.matchL, false to st.matchR).forEach { (left, order) ->
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                order.forEach { i ->
                    val done = i in st.matched; val sel = (if (left) st.selL else st.selR) == i
                    val text = if (left) pairs[i].word else matchMean(pairs[i])
                    val shape = RoundedCornerShape(16.dp)
                    val line = if (sel && st.flash) c.error else if (sel) c.secondary else c.outlineVariant
                    Box(Modifier.fillMaxWidth().heightIn(min = 56.dp).let { m -> if (done || checked) m else m.tactile({ a.matchTap(left, i) }) }.then(if (done) Modifier.semantics { stateDescription = "✓" } else Modifier)) {
                        Box(Modifier.matchParentSize().padding(top = 3.dp).background(if (done) c.cardLow else tk.lipOpt, shape))
                        Box(Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(shape).background(if (sel) c.secondaryContainer.copy(alpha = 0.16f) else if (done) c.cardLow else c.card).border(2.dp, if (done) c.cardLow else line, shape).padding(LKSpacing.spaceXs), contentAlignment = Alignment.Center) {
                            Text(text, style = LKType.bodyLg.toCompose(), color = if (done) c.onSurfaceVariant.copy(alpha = 0.5f) else c.onSurface, textAlign = TextAlign.Center)
                        }
                    }
                }
            }
        }
    }
}
private fun matchMean(p: com.lexkite.app.core.lesson.MatchPair) = p.mean ?: ((p.card?.get("vi") as? JsonPrimitive)?.content?.takeIf { it.isNotEmpty() } ?: (p.card?.get("def") as? JsonPrimitive)?.content.orEmpty())

@Composable
private fun SayArea(cur: LItem, st: ItemState, a: LessonActions, mic: MicUi, t: com.lexkite.app.i18n.L10n) {
    val c = LocalLKColors.current; val tk = tokens
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        val label = if (mic.listening) t(L10nKey.lessonListening) else t(L10nKey.lessonTapToSpeak)
        Box(Modifier.size(80.dp).clip(CircleShape).background(if (mic.listening) c.primaryContainer else c.primary).tactile(a.mic, label), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Mic, label, tint = c.onPrimary, modifier = Modifier.size(36.dp)) }
        Text(label, style = LKType.labelMetric.toCompose(), color = c.onSurfaceVariant)
        Column(Modifier.semantics { liveRegion = LiveRegionMode.Polite }, horizontalAlignment = Alignment.CenterHorizontally) {
            st.heard?.let { Text(t(L10nKey.lessonHeard, mapOf("s" to it.ifEmpty { "…" })), style = LKType.bodyMd.toCompose(), color = c.onSurface, textAlign = TextAlign.Center) }
            if (st.unclear) Text(t(L10nKey.lessonUnclear), style = LKType.bodyMd.toCompose(), color = tk.tertiaryFixed, textAlign = TextAlign.Center)
            if (mic.error) { Text(t(L10nKey.lessonNoVoice), style = LKType.bodyMd.toCompose(), color = c.error, textAlign = TextAlign.Center); Text(t(L10nKey.lessonOrSkipSpeak), style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant, textAlign = TextAlign.Center) }
        }
    }
}

/** Story / radio: the dialogue so far (newest line is the current step), each bubble replayable. */
@Composable
private fun LineArea(ui: LessonUi, a: LessonActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    val people = com.lexkite.app.core.rig.TeachAssets.rig(androidx.compose.ui.platform.LocalContext.current).people
    Column(Modifier.fillMaxWidth().semantics { contentDescription = t(L10nKey.lessonDialog) }, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        ui.log.forEach { l ->
            val carlos = l.who == "carlos"
            Row(Modifier.fillMaxWidth(), horizontalArrangement = if (carlos) Arrangement.End else Arrangement.Start) {
                val shape = RoundedCornerShape(18.dp)
                Row(Modifier.widthIn(max = 300.dp).clip(shape).background(if (carlos) c.secondaryContainer.copy(alpha = 0.18f) else c.card).border(1.dp, c.outlineVariant, shape).padding(start = LKSpacing.spaceSm, top = 4.dp, bottom = 4.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f, fill = false)) {
                        Text(people.getValue(if (carlos) "carlos" else "ama").name, style = LKType.labelBadge.toCompose(), color = c.secondary)
                        if (l.radio != true) Text(l.sent.orEmpty(), style = LKType.bodyMd.toCompose(), color = c.onSurface)
                    }
                    IconButton({ a.playText(l.sent.orEmpty(), l.who ?: "ama", false) }, Modifier.size(48.dp)) { Icon(Icons.AutoMirrored.Filled.VolumeUp, t(L10nKey.lessonReplay), tint = c.secondary) }
                }
            }
        }
    }
}

/** Footer: skip links (can't listen / speak now) + Check. Say and match grade themselves; story lines continue. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Footer(ui: LessonUi, cur: LItem, a: LessonActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    Column(Modifier.fillMaxWidth().background(c.background).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        if (cur.type == "line") LKPrimaryButton(t(L10nKey.actionContinue), a.lineContinue, Modifier.padding(bottom = 4.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = c.onPrimary, modifier = Modifier.padding(start = LKSpacing.space2xs)) }
        else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                if (listens(cur)) SkipLink(t(L10nKey.lessonNoListen), Icons.Filled.HearingDisabled, a.skipListen)
                if (speaks(cur)) SkipLink(t(L10nKey.lessonNoSpeak), Icons.Filled.MicOff, a.skipSpeak)
            }
            if (!speaks(cur) && cur.type != "match") LKPrimaryButton(t(L10nKey.actionCheck), a.check, Modifier.padding(bottom = 4.dp), enabled = ui.st.ready(cur))
        }
    }
}

@Composable
private fun SkipLink(text: String, icon: androidx.compose.ui.graphics.vector.ImageVector, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Row(Modifier.heightIn(min = MinTap).clip(PillShape).tactile(onClick).padding(horizontal = LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
        Icon(icon, null, tint = c.onSurfaceVariant, modifier = Modifier.size(18.dp)); Text(text, style = LKType.labelMetric.toCompose(), color = c.onSurfaceVariant)
    }
}
