package com.lexkite.app.feature.speak

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Call
import androidx.compose.material.icons.filled.CallEnd
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.ChatBubble
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.FormatQuote
import androidx.compose.material.icons.filled.GraphicEq
import androidx.compose.material.icons.filled.Insights
import androidx.compose.material.icons.filled.Keyboard
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.MusicNote
import androidx.compose.material.icons.filled.RadioButtonUnchecked
import androidx.compose.material.icons.filled.SlowMotionVideo
import androidx.compose.material.icons.filled.Stop
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Icon
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import com.lexkite.app.design.PillShape
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.audio.Segment
import com.lexkite.app.core.audio.SpeakListener
import com.lexkite.app.core.call.Call
import com.lexkite.app.core.call.CallAskEnv
import com.lexkite.app.core.call.CallCallbacks
import com.lexkite.app.core.call.CallEngine
import com.lexkite.app.core.call.CallIO
import com.lexkite.app.core.call.CallListenOpts
import com.lexkite.app.core.call.CallPack
import com.lexkite.app.core.call.CallRec
import com.lexkite.app.core.call.CallResult
import com.lexkite.app.core.call.CallSession
import com.lexkite.app.core.call.CallTip
import com.lexkite.app.core.call.CallView
import com.lexkite.app.core.rig.TeacherSignal
import com.lexkite.app.core.speak.SpeakScore
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.Chip
import com.lexkite.app.feature.vocab.EmptyState
import com.lexkite.app.feature.vocab.EnLtr
import com.lexkite.app.feature.vocab.Flow
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.StudyField
import com.lexkite.app.feature.vocab.StudyFocus
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.Tag
import com.lexkite.app.feature.vocab.t
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

// ---------------------------------------------------------------- #/call  (Stitch call-list / call-ring / teacher-call / call-result)
class CallListUi(val pack: CallPack, val flt: String, val mode: String, val asrChosen: Boolean, val notice: Tr?)
class CallRingUi(val pack: CallPack, val call: Call, val mode: String)
class CallRoomUi(val pack: CallPack, val call: Call, val view: CallView, val mode: String, val typed: String, val signal: TeacherSignal?, val notice: Tr?, val elapsed: Int = 0)
class CallSummaryUi(val pack: CallPack, val result: CallResult, val saved: Int?)
class CallActions(
    val open: (String) -> Unit = {}, val filter: (String) -> Unit = {}, val changeAsr: () -> Unit = {}, val go: () -> Unit = {}, val back: () -> Unit = {}, val mic: () -> Unit = {}, val typed: (String) -> Unit = {}, val submit: () -> Unit = {},
    val tap: (Int) -> Unit = {}, val longDone: () -> Unit = {}, val ask: (String) -> Unit = {}, val toggleTyping: () -> Unit = {}, val replay: () -> Unit = {}, val hang: () -> Unit = {}, val retry: () -> Unit = {}, val save: () -> Unit = {},
    val speak: (String, Float) -> Unit = { _, _ -> }, val exit: () -> Unit = {},
)

@Composable
private fun callName(pack: CallPack, call: Call): String = pack.engine.nameKey(call)?.let { trs(it) } ?: call.title

// ---- Kit pieces of the call screens (the iOS look: tinted card with a bottom ledge, teal round buttons, material icons) ----
@Composable
private fun Ico(v: ImageVector, tint: Color, size: Dp = 20.dp, modifier: Modifier = Modifier) { Icon(v, null, modifier.size(size), tint = tint) }
/** The privacy / recognition glyph the engine names (🔒 ☁️ ⌨️) as the matching material icon. */
private fun glyphIcon(g: String): ImageVector = when { g.startsWith("☁") -> Icons.Filled.Cloud; g.startsWith("⌨") -> Icons.Filled.Keyboard; else -> Icons.Filled.Lock }
@Composable
private fun SkillCard(onClick: (() -> Unit)? = null, label: String? = null, content: @Composable ColumnScope.() -> Unit) = LKCard(fill = LocalLKColors.current.surfaceContainerHighest, onClick = onClick, label = label, content = content)
@Composable
private fun CapText(text: String, color: Color = LocalLKColors.current.onSurfaceVariant, modifier: Modifier = Modifier) = Body(text, modifier, color, LKType.labelBadge)

/** Filter chip: tinted (filled) when off, teal when selected; ≥ 44 dp. */
@Composable
private fun CallChip(text: String, on: Boolean, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Box(Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(50)).background(if (on) c.secondary else c.surfaceContainerHighest).tactile(onClick, role = Role.Tab).semantics { selected = on }.padding(horizontal = LKSpacing.spaceMd), contentAlignment = Alignment.Center) {
        Text(text, color = if (on) c.onSecondary else c.onSurface, style = LKType.labelMetric.toCompose()) }
}
/** A small read-only pill with an optional leading icon (the teacher's name, a word of the topic). */
@Composable
private fun IconPill(text: String, icon: ImageVector?, ink: Color, fill: Color) {
    Row(Modifier.clip(RoundedCornerShape(50)).background(fill).padding(horizontal = LKSpacing.spaceSm, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
        if (icon != null) Ico(icon, ink, 14.dp)
        Text(text, color = ink, style = LKType.labelMetric.toCompose()) }
}
/** Outlined pill button with a leading material icon, full width, ≥ 48 dp. */
@Composable
private fun IconGhost(text: String, icon: ImageVector, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true) {
    val c = LocalLKColors.current; val ink = if (enabled) c.secondary else c.onSurfaceVariant
    Row(modifier.heightIn(min = 48.dp).clip(PillShape).border(BorderStroke(2.dp, if (enabled) c.secondary else c.outlineVariant), PillShape).tactile(if (enabled) onClick else null).padding(horizontal = LKSpacing.spaceMd, vertical = LKSpacing.spaceXs),
        horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) {
        Ico(icon, ink, 18.dp); Text(text, color = ink, style = LKType.labelMetric.toCompose(), textAlign = TextAlign.Center) }
}
/** A 44 dp icon-only button. */
@Composable
private fun IconTap(icon: ImageVector, label: String, onClick: () -> Unit, tint: Color = LocalLKColors.current.secondary) {
    Box(Modifier.size(44.dp).tactile(onClick, label).semantics { contentDescription = label }, contentAlignment = Alignment.Center) { Ico(icon, tint, 18.dp) }
}
@Composable
private fun SectionHead(icon: ImageVector, text: String) {
    val c = LocalLKColors.current
    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Ico(icon, c.secondary, 22.dp); Body(text, Modifier.weight(1f), style = LKType.headlineSm) }
}
@Composable
private fun PrivacyLine(pack: CallPack, mode: String) { val (icon, tr) = pack.engine.privacy(mode); Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.Top) { Ico(glyphIcon(icon), LocalLKColors.current.secondary, 16.dp, Modifier.padding(top = 2.dp)); Muted(trs(tr), Modifier.weight(1f)) } }
/** The teacher's still in a light round frame (list rows) or a rounded one (ring). */
@Composable
private fun TeacherAvatar(who: String, size: Dp) { val c = LocalLKColors.current
    Box(Modifier.size(size).clip(CircleShape).background(c.cardLow)) { LocalSpeakSlots.current.teacher(who, "happy", Modifier.size(size)) } }

@Composable
fun CallListScreen(ui: CallListUi, a: CallActions) {
    val e = ui.pack.engine; val c = LocalLKColors.current
    StudyPage(trs(Tr("Gọi cho Ama & Carlos")), a.exit) {
        SkillCard { Muted(trs(Tr("Cuộc gọi video luyện nói: giáo viên hỏi, bạn trả lời bằng giọng nói. Câu hỏi rẽ nhánh theo câu trả lời, lỗi được sửa nhẹ nhàng, cuối cuộc gọi có tổng kết và luyện lại câu yếu."))) }
        val filterLabel = trs(Tr("Lọc theo kỳ thi"))
        Box(Modifier.semantics { contentDescription = filterLabel }) { Flow { for (g in e.groups) CallChip(trs(e.groupLabel(g)), g == ui.flt) { a.filter(g) } } }
        for (call in e.filtered(ui.pack.english, ui.flt)) SkillCard(onClick = { a.open("call/${call.id}") }, label = callName(ui.pack, call)) {
            Row(Modifier.fillMaxWidth().heightIn(min = 56.dp), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                TeacherAvatar(call.who, 56.dp)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Body(call.em + " " + callName(ui.pack, call), style = LKType.titlePill)
                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                        Tag(call.lv); EnLtr { Body(call.teacher + " · " + call.title, Modifier.weight(1f, fill = false), c.onSurfaceVariant, LKType.bodySm, maxLines = 2) } }
                }
                Box(Modifier.size(44.dp).clip(CircleShape).background(c.secondary), contentAlignment = Alignment.Center) { Ico(Icons.Filled.Call, c.onSecondary, 20.dp) }
            }
        }
        PrivacyLine(ui.pack, ui.mode)
        if (ui.asrChosen) GhostButton(trs(Tr("Đổi cách nhận dạng")), a.changeAsr)
        ui.notice?.let { Body(trs(it), color = c.success, style = LKType.labelMetric) }
    }
}

@Composable
fun CallRingScreen(ui: CallRingUi, a: CallActions) {
    val call = ui.call; val c = LocalLKColors.current
    StudyPage(call.em + " " + callName(ui.pack, call), a.exit, bottom = {
        LKPrimaryButton(trs(Tr("Gọi ngay")), a.go, trailing = { Ico(Icons.Filled.Call, c.onPrimary, 20.dp, Modifier.padding(start = LKSpacing.spaceXs)) })
        GhostButton(trs(Tr("Cuộc gọi khác")), a.back, Modifier.fillMaxWidth()) }) {
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Tag(call.lv); EnLtr { Body(call.title, color = c.onSurfaceVariant) } }
        SkillCard {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Box(Modifier.size(width = 120.dp, height = 160.dp).clip(RoundedCornerShape(18.dp)).background(c.cardLow)) { LocalSpeakSlots.current.teacher(call.who, "happy", Modifier.size(width = 120.dp, height = 160.dp)) }
                EnLtr { Text(buildAnnotatedString { withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(call.teacher) }; append(" – " + call.role) }, color = c.onSurface, style = LKType.bodyMd.toCompose(), textAlign = TextAlign.Center) }
                PrivacyLine(ui.pack, ui.mode)
            }
        }
    }
}

/** A round control (speaker / end): 56 dp, the label under it. */
@Composable
private fun RoundCtl(icon: ImageVector, label: String, bg: Color, ink: Color, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(Modifier.size(56.dp).clip(CircleShape).background(bg).tactile(onClick, label).semantics { contentDescription = label }, contentAlignment = Alignment.Center) { Ico(icon, ink, 24.dp) }
        CapText(label)
    }
}
/** The round microphone (72 dp): idle = mic, listening = stop (material icons). */
@Composable
private fun CallMic(listening: Boolean, onClick: () -> Unit, label: String, enabled: Boolean) {
    val c = LocalLKColors.current; val bg = if (listening) c.error else if (enabled) c.secondary else c.cardHigh; val ink = if (listening) c.onError else if (enabled) c.onSecondary else c.onSurfaceVariant
    Box(Modifier.size(72.dp).clip(CircleShape).background(bg).let { if (enabled) it.tactile(onClick, label) else it }.semantics { contentDescription = label }, contentAlignment = Alignment.Center) { Ico(if (listening) Icons.Filled.Stop else Icons.Filled.Mic, ink, 32.dp) }
}

@Composable
private fun statusText(phase: String, who: String): String = trs(CallEngine.statusTr(phase, who))

/** The call itself (Stitch teacher-call): header + progress, the chips row, the Teacher Room, the caption card, cue card, recognition choice, the tip row with its suggestions, and the speaker / mic / end controls. */
@Composable
fun CallRoomScreen(ui: CallRoomUi, a: CallActions, gate: (() -> Unit) -> Unit) {
    val c = LocalLKColors.current; val v = ui.view; val call = ui.call; val listening = v.phase == "listen"
    var optionsOpen by remember { mutableStateOf(true) }; var privacyShown by remember { mutableStateOf(false) }
    StudyFocus(v.pct / 100f, "", a.hang, bottom = {
        if (v.typeOpen) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
            StudyField(ui.typed, a.typed, trs(Tr("Hoặc gõ câu trả lời…")), Modifier.weight(1f), onDone = a.submit)
            SendButton(a.submit, trs(Tr("Gửi")), enabled = ui.typed.isNotBlank()) }
        Row(Modifier.fillMaxWidth().background(c.cardLow).padding(vertical = LKSpacing.spaceXs), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Top) {
            RoundCtl(Icons.AutoMirrored.Filled.VolumeUp, trs(Tr("Nghe")), c.surfaceContainerHighest, c.secondary, a.replay)
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                CallMic(listening, { gate(a.mic) }, (if (listening) trs(CallEngine.micTr(v.phase)) else t(L10nKey.lessonKindSpeak)), !v.micDisabled); CapText(if (listening) trs(Tr("Đang nghe")) else t(L10nKey.lessonKindSpeak)) }
            RoundCtl(Icons.Filled.CallEnd, trs(Tr("Kết thúc")), c.error, c.onError, a.hang)
        }
    }) {
        Column(Modifier.testTag("call-room").fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                CapText(trs(Tr("Cuộc gọi luyện tập")), modifier = Modifier.weight(1f)); CapText("${v.pct}%", c.secondary) }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.clip(RoundedCornerShape(50)).background(c.surfaceContainerHighest).padding(horizontal = LKSpacing.spaceSm, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(8.dp).clip(CircleShape).background(c.primaryContainer)); CapText(trs(Tr("Trực tiếp")), c.onSurface); CapText(CallEngine.mmss(ui.elapsed)) }
                Tag(call.lv)
                EnLtr { Body(call.title, Modifier.weight(1f), c.onSurfaceVariant, LKType.bodySm, maxLines = 1) }
            }
            // the Teacher Room: the live 2D teacher on a soft gradient, the caption strip under it has its own space
            Box(Modifier.fillMaxWidth().height(230.dp).clip(RoundedCornerShape(24.dp)).background(Brush.verticalGradient(listOf(c.cardLow, c.surfaceContainerHighest)))) {
                Box(Modifier.align(Alignment.BottomCenter).padding(bottom = 30.dp).size(width = 220.dp, height = 180.dp)) { LocalSpeakSlots.current.live(call.who, ui.signal, Modifier.size(width = 220.dp, height = 180.dp)) }
                Row(Modifier.align(Alignment.TopStart).padding(LKSpacing.spaceSm).clip(RoundedCornerShape(50)).background(c.cardHigh.copy(alpha = 0.85f)).padding(horizontal = LKSpacing.spaceSm, vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Ico(Icons.Filled.Videocam, c.secondary, 14.dp); CapText(trs(Tr("Phòng giáo viên"))) }
                Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(30.dp).padding(horizontal = LKSpacing.spaceSm), contentAlignment = Alignment.Center) { Body(statusText(v.phase, call.teacher), color = c.onSurfaceVariant, style = LKType.labelBadge, maxLines = 1, align = TextAlign.Center) }
            }
            SkillCard {
                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                    EnLtr { IconPill(call.teacher, Icons.Filled.MusicNote, c.onSurface, c.cardLow) }
                    Ico(Icons.Filled.GraphicEq, c.secondary, 18.dp) }
                EnLtr { Body(v.lines.joinToString(" "), Modifier.fillMaxWidth().testTag("call-caption"), style = LKType.bodyLg) }
                if (v.you.isNotEmpty()) EnLtr { Body(v.you, Modifier.fillMaxWidth(), color = c.onSurfaceVariant, style = LKType.bodySm, align = TextAlign.End) }
            }
            v.cue?.let { cue -> SkillCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.Top) {
                    if (cue.text != null) EnLtr { Body(cue.text!!, Modifier.weight(1f), style = LKType.titlePill) } else Body(trs(cue.tr!!), Modifier.weight(1f), style = LKType.titlePill)
                    Text(cue.clock, Modifier.testTag("call-clock"), maxLines = 1, softWrap = false, color = c.secondary, style = LKType.headlineSm.toCompose()) } // the countdown has its own slot: the title wraps beside it, never under it
                if (cue.points.isNotEmpty()) { Muted(trs(Tr("Bạn nên nói:"))); EnLtr { Column { for (p in cue.points) Body("• $p") } } }
                if (cue.long) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                    IconGhost(trs(Tr("Tôi nói xong")), Icons.Filled.Check, a.longDone); cue.longWords?.let { Muted(trs(Tr("{n} từ", mapOf("n" to it)))) } }
            } }
            v.ask?.let { choices -> SkillCard {
                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Ico(Icons.Filled.Mic, c.secondary, 20.dp); Body(trs(Tr("Chọn cách nhận dạng giọng nói")), Modifier.weight(1f), style = LKType.titlePill) }
                for (ch in choices) Row(Modifier.fillMaxWidth().heightIn(min = 44.dp).clip(RoundedCornerShape(12.dp)).background(c.cardHigh).border(BorderStroke(2.dp, c.outlineVariant), RoundedCornerShape(12.dp)).tactile({ gate { a.ask(ch.id) } }).padding(horizontal = LKSpacing.spaceSm, vertical = LKSpacing.spaceXs),
                    horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Ico(glyphIcon(ch.icon), c.onSurface, 18.dp); Body(trs(ch.label), Modifier.weight(1f)) }
            } }
            // the tip row: fold / unfold the suggestions · the gentle fix or sound-pair hint · privacy lock · typing
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                IconTap(if (optionsOpen) Icons.Filled.KeyboardArrowUp else Icons.Filled.KeyboardArrowDown, trs(Tr("Gợi ý trả lời")), { optionsOpen = !optionsOpen })
                Column(Modifier.weight(1f).padding(top = 10.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    when (val tip = v.tip) {
                        is CallTip.FixTip -> { Body(trs(Tr("{name} hiểu ý bạn! Nói tự nhiên hơn:", mapOf("name" to call.teacher))), style = LKType.titlePill); EnLtr { FixLine(tip.fix.bad, tip.fix.good) }; Muted(trs(tip.fix.why)) } // web call.js: the gentle-fix intro line
                        is CallTip.SlipTip -> Body("👂 " + trs(Tr("Nghe giống “{said}” – bạn muốn nói “{meant}”? Hai từ này chỉ khác một âm.", mapOf("said" to tip.slip.said, "meant" to tip.slip.meant))))
                        else -> Body(trs(Tr("Gợi ý trả lời")), style = LKType.titlePill)
                    }
                }
                IconTap(glyphIcon(ui.pack.engine.privacy(ui.mode).first), trs(ui.pack.engine.privacy(ui.mode).second), { privacyShown = !privacyShown })
                IconTap(Icons.Filled.Keyboard, trs(Tr("Gõ câu trả lời")), a.toggleTyping)
            }
            if (privacyShown) Box(Modifier.padding(horizontal = LKSpacing.spaceSm)) { PrivacyLine(ui.pack, ui.mode) }
            if (optionsOpen) Column(Modifier.testTag("call-options"), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                v.options.forEachIndexed { k, o -> Box(Modifier.fillMaxWidth().heightIn(min = 44.dp).clip(RoundedCornerShape(12.dp)).background(c.surfaceContainerHighest).tactile({ a.tap(k) }, o).padding(horizontal = LKSpacing.spaceSm, vertical = 10.dp), contentAlignment = Alignment.CenterStart) {
                    EnLtr { Text(o, color = c.secondary, style = LKType.labelMetric.toCompose()) } } }
            }
            ui.notice?.let { Body(trs(it), color = c.secondary, style = LKType.labelMetric) }
        }
    }
}

/** `bad → good` (the wrong form struck through, the fix in bold). */
@Composable
private fun FixLine(bad: String, good: String) {
    val c = LocalLKColors.current
    Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
        Text(bad, Modifier.weight(1f, fill = false), color = c.onSurfaceVariant, textDecoration = TextDecoration.LineThrough, style = LKType.bodyMd.toCompose()); Text("→", color = c.onSurfaceVariant)
        Text(good, Modifier.weight(1f, fill = false), color = c.success, style = LKType.titlePill.toCompose()) }
}

@Composable
fun CallSummaryScreen(ui: CallSummaryUi, a: CallActions) {
    val c = LocalLKColors.current; val r = ui.result; val call = r.call; val rc = r.recap; val e = ui.pack.engine
    StudyPage(trs(Tr("Tổng kết cuộc gọi")), a.exit) {
        Muted(call.em + " " + callName(ui.pack, call) + (if (call.retry) " · " + trs(Tr("Luyện lại")) else "") + " · " + trs(Tr("{m} phút {s} giây", mapOf("m" to r.secs / 60, "s" to r.secs % 60))) + " · +${r.reward.xp} XP")
        SkillCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(92.dp), contentAlignment = Alignment.Center) {
                    androidx.compose.material3.CircularProgressIndicator(progress = { rc.score / 100f }, Modifier.size(92.dp), color = c.secondary, strokeWidth = 10.dp, trackColor = c.outlineVariant, strokeCap = StrokeCap.Round)
                    Body(rc.score.toString(), Modifier.testTag("call-score"), style = LKType.headlineMd) }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Body(trs(e.bandText(rc.band)), style = LKType.headlineSm)
                    Muted(trs(Tr("Bạn đã trả lời {n} lượt, trong đó {s} lượt bằng giọng nói.", mapOf("n" to rc.turns.size, "s" to r.voiced))) + (if (rc.words > 0) " · " + trs(Tr("{n} từ", mapOf("n" to rc.words))) else ""))
                }
                Box(Modifier.size(width = 56.dp, height = 68.dp)) { LocalSpeakSlots.current.teacher(call.who, "happy", Modifier.size(width = 56.dp, height = 68.dp)) }
            }
        }
        if (rc.target.isNotEmpty()) Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            SectionHead(Icons.Filled.Extension, trs(Tr("Bạn đã dùng {n}/{k} từ chủ đề", mapOf("n" to rc.used.size, "k" to rc.target.size))))
            EnLtr { Flow { for (w in rc.target) { val on = w in rc.used
                IconPill(w, if (on) Icons.Filled.CheckCircle else Icons.Filled.RadioButtonUnchecked, if (on) c.success else c.onSurface, if (on) c.success.copy(alpha = 0.14f) else c.surfaceContainerHighest) } } }
        }
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            SectionHead(Icons.Filled.Insights, trs(Tr("Nhận xét độ trôi chảy")))
            for (n in rc.notes) Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.Top) { Body("•", color = c.secondary); Body(trs(e.noteText(n)), Modifier.weight(1f)) }
        }
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            Box(Modifier.testTag("call-transcript")) { SectionHead(Icons.Filled.ChatBubble, trs(Tr("Lời thoại & sửa lỗi"))) }
            if (rc.turns.isEmpty()) Body(trs(Tr("Chưa có lượt nào.")), color = c.onSurfaceVariant)
            for (x in rc.turns) SkillCard {
                Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    EnLtr { Muted(call.teacher + ": " + (x.m ?: "")) }
                    EnLtr { Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                        Text(buildAnnotatedString { if (x.weak) append("↻ "); withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(trs(Tr("Bạn")) + ": ") }; append(x.text) }, Modifier.weight(1f, fill = false), color = c.onSurface, style = LKType.bodyMd.toCompose())
                        if (x.picked) Tag(trs(Tr("gợi ý"))) } }
                    x.fix?.let { f -> EnLtr { FixLine(f.bad, f.good) }; Muted(trs(f.why)) }
                    for (s in x.slips) Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) { EnLtr { Muted("👂 " + s.meant + " ≠ " + s.said) }; IconTap(Icons.AutoMirrored.Filled.VolumeUp, t(L10nKey.lessonKindListen) + ": " + s.meant, { a.speak(s.meant, 1f) }) }
                        GhostButton(trs(Tr("Luyện cặp âm này")), { a.open("pron/" + java.net.URLEncoder.encode(s.skill, "UTF-8").replace("+", "%20")) }) }
                    if (x.fl.short) Muted("↻ " + trs(Tr("Trả lời đầy đủ hơn: thêm lý do hoặc ví dụ.")))
                    if (x.weak || x.picked) Row(verticalAlignment = Alignment.CenterVertically) {
                        EnLtr { Muted(trs(Tr("Câu mẫu")) + ": " + x.model, Modifier.weight(1f, fill = false)) }
                        IconTap(Icons.AutoMirrored.Filled.VolumeUp, t(L10nKey.lessonKindListen), { a.speak(x.model, 1f) }); IconTap(Icons.Filled.SlowMotionVideo, t(L10nKey.lessonKindListen) + " 0.7×", { a.speak(x.model, 0.7f) }) }
                }
            }
        }
        Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            SectionHead(Icons.Filled.FormatQuote, trs(Tr("Cụm từ nên nhớ")))
            EnLtr { Column(verticalArrangement = Arrangement.spacedBy(2.dp)) { for ((p, d) in call.phrases) Text(buildAnnotatedString { withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(p) }; append(" – $d") }, color = c.onSurface, style = LKType.bodyMd.toCompose()) } }
        }
        if (rc.weak.isNotEmpty()) LKPrimaryButton("↻ " + trs(Tr("Luyện lại {n} câu yếu", mapOf("n" to rc.weak.size))), a.retry)
        GhostButton(if (ui.saved != null) "✓ " + trs(Tr("Đã thêm {n} thẻ", mapOf("n" to ui.saved))) else "+ " + trs(Tr("Thêm vào thẻ ôn")), a.save, Modifier.fillMaxWidth(), enabled = ui.saved == null)
        IconGhost(trs(Tr("Gọi lại")), Icons.Filled.Call, { a.open("call/${call.id}") }, Modifier.fillMaxWidth())
        GhostButton(trs(Tr("Cuộc gọi khác")), a.back, Modifier.fillMaxWidth())
        Muted(trs(Tr("Lời bạn nói chỉ được xử lý trên máy để chấm và hiện lời thoại – Lexkite không lưu lại.")))
    }
}

/** The state of `#/call` and `#/call/<id>`: list → ring → live call → summary (and a retry call of the weak turns). One [CallSession] is the web `start()`. */
class CallVm(private val env: SpeakEnv, private val arg: String, private val lang: String) : ViewModel() {
    var list by mutableStateOf<CallListUi?>(null); private set
    var ring by mutableStateOf<CallRingUi?>(null); private set
    var room by mutableStateOf<CallRoomUi?>(null); private set
    var summary by mutableStateOf<CallSummaryUi?>(null); private set
    var empty by mutableStateOf(false); private set
    var gone by mutableStateOf<String?>(null); private set
    private var pack: CallPack? = null
    private val prefs = HashMap<String, String?>()
    private var session: CallSession? = null; private var signal: TeacherSignal? = null
    private var typed = ""; private var notice: Tr? = null; private var noticeJob: Job? = null; private var reactJob: Job? = null; private var tickJob: Job? = null; private var current: Call? = null

    init { viewModelScope.launch {
        val p = env.callPack() ?: run { empty = true; return@launch }; pack = p
        for (k in listOf("flt", "asr", "tr")) prefs[k] = env.callPref(k)
        val c = if (arg.isEmpty()) null else p.call(arg)
        if (arg.isNotEmpty() && c == null) { gone = "call"; return@launch }
        if (c == null) showList() else { current = c; showRing() } } }
    override fun onCleared() { closeSession(); env.stopListening(); env.stopSpeaking() }

    private fun mode() = pack?.engine?.asrModeNative(env.onDevice, env.canListen, prefs["asr"]) ?: "tap"
    private fun clear() { list = null; ring = null; room = null; summary = null }
    private fun showList() { val p = pack ?: return; clear(); val f = prefs["flt"]?.takeIf { it in p.engine.groups } ?: "all"; list = CallListUi(p, f, mode(), prefs["asr"] != null, notice); notice = null }
    private fun showRing() { val p = pack ?: return; val c = current ?: return; clear(); ring = CallRingUi(p, c, mode()) }
    fun toList() { closeSession(); current = null; showList() }
    fun filter(g: String) { prefs["flt"] = g; viewModelScope.launch { env.setCallPref("flt", g) }; showList() }
    fun changeAsr() { prefs["asr"] = null; viewModelScope.launch { env.setCallPref("asr", null) }; notice = Tr("Lần gọi sau Lexkite sẽ hỏi lại cách nhận dạng."); showList() }
    fun open(id: String) { val c = pack?.call(id); if (c == null) toList() else { closeSession(); current = c; showRing() } }
    fun go() { val c = current ?: return; start(c) }
    /** Back inside a call = the red button. */
    fun hang() { session?.hang() }

    // ---- the live call ----
    private fun closeSession() { session?.close(); session = null; tickJob?.cancel(); noticeJob?.cancel(); reactJob?.cancel(); signal = null; env.stopListening(); env.stopSpeaking() }
    private var startMs = 0L
    private fun elapsed() = ((System.currentTimeMillis() - startMs) / 1000).toInt()
    private fun sync() { val s = session ?: return; val p = pack ?: return; room = CallRoomUi(p, s.call, s.view(), mode(), typed, signal, notice, elapsed()) }
    private fun flash(t: Tr, ms: Int) { notice = t; sync(); noticeJob?.cancel(); noticeJob = viewModelScope.launch { delay(ms.toLong()); notice = null; sync() } }
    private val io = object : CallIO {
        override fun now() = System.currentTimeMillis()
        override fun mode() = this@CallVm.mode()
        override fun pref(k: String): String? = prefs[k]
        override fun setPref(k: String, v: String) { prefs[k] = v; viewModelScope.launch { env.setCallPref(k, v) } }
        override fun say(text: String, onEnd: () -> Unit) {
            val who = session?.call?.who ?: ""; var done = false
            val fin = { if (!done) { done = true; viewModelScope.launch { onEnd() } }; Unit }
            env.vocab.audio.speak(text, who, 0.95f, object : SpeakListener {
                override fun onSegment(seg: Segment) { signal?.speak(seg.text, seg.durSec, seg::clock, seg::playing) }
                override fun onEnd() { signal?.quiet(); fin() }
                override fun onFail() { signal?.quiet(); fin() } })
            viewModelScope.launch { delay(minOf(15000, 1500 + text.length * 90).toLong()); fin() } // the platform may not report the end of speech ⇒ go on
        }
        override fun stopSay() { env.stopSpeaking(); signal?.quiet() }
        override fun recognize(o: CallListenOpts, cb: CallCallbacks): CallRec? {
            val accent = "en-US"
            val onResult = { alts: List<String> -> val h = SpeakScore.best(o.target, alts); viewModelScope.launch { cb.result(h.heard, h.score); cb.end() }; Unit }
            val onError = { code: String -> viewModelScope.launch { cb.error(code); cb.end() }; Unit }
            cb.start()
            if (o.local) env.listenOffline(accent, {}, onResult, onError) else env.listen(accent, {}, onResult, onError) // local = on the device ONLY; the cloud path runs only after the learner chose it
            return object : CallRec { override fun stop() = env.finishListening(); override fun cancel() = env.stopListening() }
        }
        override fun after(ms: Long, f: () -> Unit) { viewModelScope.launch { delay(ms); f() } }
        override fun react(pose: String, ms: Int) { val s = signal ?: return; s.pose(if (pose == "happy") "cheer" else pose); reactJob?.cancel(); reactJob = viewModelScope.launch { delay(ms.toLong()); s.pose(null) } }
        override fun listenPose(on: Boolean) { signal?.send(TeacherSignal.Cmd.Listen(on)) }
        override fun toast(t: Tr, ms: Int) = flash(t, ms)
        override fun toastErr(code: String, ms: Int) = flash(recText(code), ms)
        override fun finished(r: CallResult) { viewModelScope.launch { env.pay(r.reward) }; closeSession(); clear(); summary = CallSummaryUi(pack!!, r, null) }
        override fun hangup() { toList() }
        override fun changed() { sync() }
    }
    private fun start(call: Call) {
        val p = pack ?: return; closeSession(); clear(); typed = ""; notice = null; current = pack?.call(call.id) ?: call; signal = TeacherSignal()
        val s = CallSession(p.engine, call, io, CallAskEnv(sr = env.canListen), lang == "en"); session = s
        startMs = System.currentTimeMillis(); var shown = 0
        tickJob = viewModelScope.launch { while (isActive) { delay(500); s.tick(); val e = elapsed(); if (e != shown) { shown = e; sync() } } } // the Live clock
        s.begin()
    }
    fun mic() { session?.mic() }
    fun micDenied() { flash(recText("not-allowed"), 3500) }
    fun typedInput(v: String) { typed = v; sync() }
    fun submit() { val v = typed; if (v.isBlank()) return; typed = ""; session?.submitTyped(v) }
    fun tap(k: Int) { session?.tapOption(k) }
    fun longDone() { session?.longDone() }
    fun pick(choice: String) { session?.pickAsr(choice) }
    fun toggleTyping() { session?.toggleTyping() }
    fun replay() { session?.replay()?.let { text -> env.vocab.audio.speak(text, session?.call?.who ?: "", 0.95f, object : SpeakListener { override fun onSegment(seg: Segment) { signal?.speak(seg.text, seg.durSec, seg::clock, seg::playing) }; override fun onEnd() { signal?.quiet() } }) } }
    fun speak(text: String, rate: Float) { val who = summary?.result?.call?.who; env.speak(text, "en-US", rate, who) }

    // ---- the summary ----
    fun retry() { val s = summary ?: return; val base = s.pack.call(s.result.call.id) ?: s.result.call; start(s.pack.engine.retry(base, s.result.recap.weak)) }
    fun save() { val s = summary ?: return; if (s.saved != null) return
        viewModelScope.launch { val cards = s.pack.engine.cards(s.result.call, s.result.recap); for (c in cards) env.word.addWord(c.entry, c.ctx, true); summary = CallSummaryUi(s.pack, s.result, cards.size) } }

    class Factory(private val env: SpeakEnv, private val arg: String, private val lang: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = CallVm(env, arg, lang) as T }
}
