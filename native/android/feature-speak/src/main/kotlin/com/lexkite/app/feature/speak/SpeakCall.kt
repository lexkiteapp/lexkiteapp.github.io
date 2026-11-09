package com.lexkite.app.feature.speak

import androidx.compose.foundation.background
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
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

// ---------------------------------------------------------------- #/call  (Stitch call-list / call-ring / teacher-call / call-result)
class CallListUi(val pack: CallPack, val flt: String, val mode: String, val asrChosen: Boolean, val notice: Tr?)
class CallRingUi(val pack: CallPack, val call: Call, val mode: String)
class CallRoomUi(val pack: CallPack, val call: Call, val view: CallView, val mode: String, val typed: String, val signal: TeacherSignal?, val notice: Tr?)
class CallSummaryUi(val pack: CallPack, val result: CallResult, val saved: Int?)
class CallActions(
    val open: (String) -> Unit = {}, val filter: (String) -> Unit = {}, val changeAsr: () -> Unit = {}, val go: () -> Unit = {}, val back: () -> Unit = {}, val mic: () -> Unit = {}, val typed: (String) -> Unit = {}, val submit: () -> Unit = {},
    val tap: (Int) -> Unit = {}, val longDone: () -> Unit = {}, val ask: (String) -> Unit = {}, val toggleTyping: () -> Unit = {}, val replay: () -> Unit = {}, val hang: () -> Unit = {}, val retry: () -> Unit = {}, val save: () -> Unit = {},
    val speak: (String, Float) -> Unit = { _, _ -> }, val exit: () -> Unit = {},
)

@Composable
private fun callName(pack: CallPack, call: Call): String = pack.engine.nameKey(call)?.let { trs(it) } ?: call.title
@Composable
private fun PrivacyLine(pack: CallPack, mode: String) { val (icon, tr) = pack.engine.privacy(mode); Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.Top) { Body(icon); Muted(trs(tr), Modifier.weight(1f)) } }
@Composable
private fun TeacherSlot(who: String, size: androidx.compose.ui.unit.Dp) { Box(Modifier.size(size)) { LocalSpeakSlots.current.teacher(who, "point", Modifier.size(size)) } }

@Composable
fun CallListScreen(ui: CallListUi, a: CallActions) {
    val e = ui.pack.engine; val c = LocalLKColors.current
    StudyPage(trs(Tr("Gọi cho Ama & Carlos")), a.exit) {
        Muted(trs(Tr("Cuộc gọi video luyện nói: giáo viên hỏi, bạn trả lời bằng giọng nói. Câu hỏi rẽ nhánh theo câu trả lời, lỗi được sửa nhẹ nhàng, cuối cuộc gọi có tổng kết và luyện lại câu yếu.")))
        Muted(trs(Tr("Lọc theo kỳ thi")))
        Flow { for (g in e.groups) Chip(trs(e.groupLabel(g)), g == ui.flt, { a.filter(g) }) }
        for (call in e.filtered(ui.pack.english, ui.flt)) LKCard(onClick = { a.open("call/${call.id}") }, label = callName(ui.pack, call)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                TeacherSlot(call.who, 56.dp)
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Body(call.em + " " + callName(ui.pack, call), style = LKType.titlePill)
                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Tag(call.lv); EnLtr { Muted(call.teacher) } }
                    EnLtr { Muted(call.title) }
                }
            }
        }
        PrivacyLine(ui.pack, ui.mode)
        if (ui.asrChosen) GhostButton(trs(Tr("Đổi cách nhận dạng")), a.changeAsr)
        ui.notice?.let { Body(trs(it), color = c.success, style = LKType.labelMetric) }
    }
}

@Composable
fun CallRingScreen(ui: CallRingUi, a: CallActions) {
    val call = ui.call
    StudyPage("📞 " + callName(ui.pack, call), a.exit, bottom = { LKPrimaryButton("📞 " + trs(Tr("Gọi ngay")), a.go); GhostButton(trs(Tr("Cuộc gọi khác")), a.back) }) {
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Tag(call.lv); EnLtr { Muted(call.title) } }
        LKCard {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Box(Modifier.size(width = 120.dp, height = 160.dp)) { LocalSpeakSlots.current.teacher(call.who, "point", Modifier.size(width = 120.dp, height = 160.dp)) }
                EnLtr { Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) { Body(call.teacher, style = LKType.titlePill); Body("– " + call.role) } }
                PrivacyLine(ui.pack, ui.mode)
            }
        }
    }
}

/** A round control (speaker / end): ≥ 56 dp, the label under it. */
@Composable
private fun RoundCtl(glyph: String, label: String, bg: androidx.compose.ui.graphics.Color, ink: androidx.compose.ui.graphics.Color, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Box(Modifier.size(56.dp).clip(CircleShape).background(bg).tactile(onClick, label).semantics { contentDescription = label }, contentAlignment = Alignment.Center) { Text(glyph, color = ink, style = LKType.headlineSm.toCompose()) }
        Muted(label)
    }
}

@Composable
private fun statusText(phase: String, who: String): String = trs(CallEngine.statusTr(phase, who))

/** The call itself (Stitch teacher-call): teacher stage + captions, cue card, recognition choice, the learner's line, tip, suggestions, typing, and the speaker / mic / end controls. */
@Composable
fun CallRoomScreen(ui: CallRoomUi, a: CallActions, gate: (() -> Unit) -> Unit) {
    val c = LocalLKColors.current; val v = ui.view; val call = ui.call; val listening = v.phase == "listen"
    StudyFocus(v.pct / 100f, "📞 " + callName(ui.pack, call), a.hang, bottom = {
        if (v.typeOpen) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
            StudyField(ui.typed, a.typed, trs(Tr("Hoặc gõ câu trả lời…")), Modifier.weight(1f), onDone = a.submit)
            SendButton(a.submit, trs(Tr("Gửi")), enabled = ui.typed.isNotBlank()) }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.Bottom) {
            RoundCtl("🔊", trs(Tr("Nghe")), c.surfaceContainerHighest, c.onSurface, a.replay)
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                MicButton(listening, { gate(a.mic) }, trs(CallEngine.micTr(v.phase)), enabled = !v.micDisabled); Muted(trs(if (listening) Tr("Đang nghe") else Tr("Nói"))) }
            RoundCtl("📵", trs(Tr("Kết thúc")), c.error, c.onError, a.hang)
        }
    }) {
        Column(Modifier.testTag("call-room").fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd)) {
            LKCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.Top) {
                    Box(Modifier.size(width = 120.dp, height = 140.dp)) { LocalSpeakSlots.current.live(call.who, ui.signal, Modifier.size(width = 120.dp, height = 140.dp)) }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Tag(trs(Tr("Trực tiếp")), c.error); Tag(call.lv) }
                        EnLtr { Body(call.teacher + " · " + call.role, style = LKType.labelMetric, color = c.secondary) }
                        Muted(statusText(v.phase, call.teacher))
                    }
                }
                EnLtr { Body(v.lines.joinToString(" "), style = LKType.titlePill, modifier = Modifier.testTag("call-caption")) }
            }
            v.cue?.let { cue -> LKCard(fill = c.surfaceContainerHighest) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    if (cue.text != null) EnLtr { Body(cue.text!!, Modifier.weight(1f), style = LKType.titlePill) } else Body(trs(cue.tr!!), Modifier.weight(1f), style = LKType.titlePill)
                    Body(cue.clock, Modifier.testTag("call-clock"), style = LKType.headlineSm) }
                if (cue.points.isNotEmpty()) { Muted(trs(Tr("Bạn nên nói:"))); EnLtr { Column { for (p in cue.points) Body("• $p") } } }
                if (cue.long) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    GhostButton("✓ " + trs(Tr("Tôi nói xong")), a.longDone); cue.longWords?.let { Muted(trs(Tr("{n} từ", mapOf("n" to it)))) } }
            } }
            v.ask?.let { choices -> LKCard(fill = c.surfaceContainerHighest) {
                Body("🎙️ " + trs(Tr("Chọn cách nhận dạng giọng nói")), style = LKType.titlePill)
                for (ch in choices) GhostButton(ch.icon + " " + trs(ch.label), { gate { a.ask(ch.id) } })
            } }
            if (v.you.isNotEmpty()) EnLtr { Body(v.you, Modifier.fillMaxWidth(), color = c.onSurfaceVariant, align = androidx.compose.ui.text.style.TextAlign.End) }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Body("💡 " + trs(Tr("Gợi ý trả lời")), Modifier.weight(1f), style = LKType.labelMetric, color = c.secondary)
                Box(Modifier.size(48.dp).tactile(a.toggleTyping, trs(Tr("Gõ câu trả lời"))), contentAlignment = Alignment.Center) { Text("⌨️", style = LKType.bodyMd.toCompose()) }
            }
            when (val tip = v.tip) {
                is CallTip.FixTip -> LKCard(fill = c.surfaceContainerHighest) { Muted(trs(Tr("{name} hiểu ý bạn! Nói tự nhiên hơn:", mapOf("name" to call.teacher)))); EnLtr { FixLine(tip.fix.bad, tip.fix.good) }; Muted(trs(tip.fix.why)) }
                is CallTip.SlipTip -> LKCard(fill = c.surfaceContainerHighest) { Muted("👂 " + trs(Tr("Nghe giống “{said}” – bạn muốn nói “{meant}”? Hai từ này chỉ khác một âm.", mapOf("said" to tip.slip.said, "meant" to tip.slip.meant)))) }
                else -> {}
            }
            Column(Modifier.testTag("call-options"), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                v.options.forEachIndexed { k, o -> LKCard(onClick = { a.tap(k) }, label = o) { EnLtr { Body("💬 $o") } } }
            }
            ui.notice?.let { Body(trs(it), color = c.secondary, style = LKType.labelMetric) }
            PrivacyLine(ui.pack, ui.mode)
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
    StudyPage("📞 " + trs(Tr("Tổng kết cuộc gọi")), a.exit) {
        Muted(callName(ui.pack, call) + (if (call.retry) " · " + trs(Tr("Luyện lại")) else "") + " · " + trs(Tr("{m} phút {s} giây", mapOf("m" to r.secs / 60, "s" to r.secs % 60))) + " · +${r.reward.xp} XP")
        LKCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(72.dp), contentAlignment = Alignment.Center) { androidx.compose.material3.CircularProgressIndicator(progress = { rc.score / 100f }, Modifier.size(72.dp), color = c.primary, trackColor = c.surfaceContainerHighest, strokeWidth = 8.dp); Body(rc.score.toString(), Modifier.testTag("call-score"), style = LKType.headlineSm) }
                Column(Modifier.weight(1f)) {
                    Body(trs(e.bandText(rc.band)), style = LKType.titlePill)
                    Muted(trs(Tr("Bạn đã trả lời {n} lượt, trong đó {s} lượt bằng giọng nói.", mapOf("n" to rc.turns.size, "s" to r.voiced))) + (if (rc.words > 0) " · " + trs(Tr("{n} từ", mapOf("n" to rc.words))) else ""))
                }
            }
            if (rc.target.isNotEmpty()) {
                Body("🧩 " + trs(Tr("Bạn đã dùng {n}/{k} từ chủ đề", mapOf("n" to rc.used.size, "k" to rc.target.size))), style = LKType.titlePill)
                EnLtr { Flow { for (w in rc.target) { val on = w in rc.used; Tag(if (on) "✓ $w" else w, if (on) c.success else c.onSurfaceVariant) } } }
            }
            Body("📈 " + trs(Tr("Nhận xét độ trôi chảy")), style = LKType.titlePill)
            for (n in rc.notes) Muted("• " + trs(e.noteText(n)))
        }
        LKCard {
            Body("📝 " + trs(Tr("Lời thoại & sửa lỗi")), Modifier.testTag("call-transcript"), style = LKType.titlePill)
            if (rc.turns.isEmpty()) Muted(trs(Tr("Chưa có lượt nào.")))
            for (x in rc.turns) Column(Modifier.fillMaxWidth().padding(top = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                EnLtr { Muted(call.teacher + ": " + (x.m ?: "")) }
                EnLtr { Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Body(trs(Tr("Bạn")) + ": " + x.text, Modifier.weight(1f, fill = false)); if (x.picked) Tag(trs(Tr("gợi ý"))) } }
                x.fix?.let { f -> EnLtr { FixLine(f.bad, f.good) }; Muted(trs(f.why)) }
                for (s in x.slips) Row(verticalAlignment = Alignment.CenterVertically) {
                    EnLtr { Muted("👂 " + s.meant + " ≠ " + s.said) }; GhostButton("🔊", { a.speak(s.meant, 1f) }); GhostButton(trs(Tr("Luyện cặp âm này")), { a.open("pron/" + java.net.URLEncoder.encode(s.skill, "UTF-8").replace("+", "%20")) }) }
                if (x.fl.short) Muted("↻ " + trs(Tr("Trả lời đầy đủ hơn: thêm lý do hoặc ví dụ.")))
                if (x.weak || x.picked) Row(verticalAlignment = Alignment.CenterVertically) {
                    EnLtr { Muted(trs(Tr("Câu mẫu")) + ": " + x.model, Modifier.weight(1f, fill = false)) }; GhostButton("🔊", { a.speak(x.model, 1f) }); GhostButton("🐢", { a.speak(x.model, 0.7f) }) }
            }
        }
        LKCard {
            Body("💬 " + trs(Tr("Cụm từ nên nhớ")), style = LKType.titlePill)
            EnLtr { Column(verticalArrangement = Arrangement.spacedBy(2.dp)) { for ((p, d) in call.phrases) Body("• $p – $d") } }
        }
        if (rc.weak.isNotEmpty()) LKPrimaryButton("↻ " + trs(Tr("Luyện lại {n} câu yếu", mapOf("n" to rc.weak.size))), a.retry)
        GhostButton(if (ui.saved != null) "✓ " + trs(Tr("Đã thêm {n} thẻ", mapOf("n" to ui.saved))) else "+ " + trs(Tr("Thêm vào thẻ ôn")), a.save, enabled = ui.saved == null)
        GhostButton("📞 " + trs(Tr("Gọi lại")), { a.open("call/${call.id}") })
        GhostButton(trs(Tr("Cuộc gọi khác")), a.back)
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
    private fun sync() { val s = session ?: return; val p = pack ?: return; room = CallRoomUi(p, s.call, s.view(), mode(), typed, signal, notice) }
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
        tickJob = viewModelScope.launch { while (isActive) { delay(500); s.tick() } }
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
