package com.lexkite.app.feature.speak

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.border
import com.lexkite.app.design.CardShape
import com.lexkite.app.design.tactile
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.padding
import com.lexkite.app.design.toCompose
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.speak.RecError
import com.lexkite.app.core.speak.Roleplay
import com.lexkite.app.core.speak.RpScript
import com.lexkite.app.core.speak.SpeakPack
import com.lexkite.app.core.speak.SpeakScore
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.EmptyState
import com.lexkite.app.feature.vocab.EnLtr
import com.lexkite.app.feature.vocab.Flow
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.RichBody
import com.lexkite.app.feature.vocab.StudyField
import com.lexkite.app.feature.vocab.StudyFocus
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.Tag
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonPrimitive
import java.util.Locale

// ---------------------------------------------------------------- #/roleplay  (Stitch roleplay-list / -brief / -chat / -result)
class RpListUi(val pack: SpeakPack?, val hub: Roleplay.Hub?, val footnote: Tr?)
class RpBriefUi(val pack: SpeakPack, val s: RpScript, val level: Int, val saved: Set<Int>, val notice: Tr?)
class RpChatUi(val s: RpScript, val L: Int, val bubbles: List<Roleplay.Bubble>, val mode: String, val turnLabel: Tr, val thinking: Boolean, val input: String, val hint: Pair<Tr?, String>?, val helpHint: String?, val listening: Boolean, val notice: Tr?, val canEnd: Boolean, val help: Boolean)
class RpResultUi(val s: RpScript, val L: Int, val report: Roleplay.Report?, val saved: Set<Int>, val confidence: String?)
class RpActions(
    val open: (String) -> Unit = {}, val level: (Int) -> Unit = {}, val save: (Int) -> Unit = {}, val start: () -> Unit = {}, val input: (String) -> Unit = {}, val send: () -> Unit = {}, val mic: () -> Unit = {}, val hint: () -> Unit = {},
    val help: () -> Unit = {}, val end: () -> Unit = {}, val speak: (String) -> Unit = {}, val saveRewrite: (Int) -> Unit = {}, val again: () -> Unit = {}, val back: () -> Unit = {}, val exit: () -> Unit = {},
)

@Composable
fun RoleplayListScreen(ui: RpListUi, a: RpActions) {
    val h = ui.hub; val pack = ui.pack
    StudyPage(trs(Tr("Hội thoại đóng vai")), a.exit) {
        val c = LocalLKColors.current
        LKCard(fill = c.surfaceContainerHighest) {   // Stitch hero: the stage badge + the one-line promise (the web has no random-scenario action, so no "quick practice" button)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.Top) {
                Box(Modifier.size(52.dp).clip(RoundedCornerShape(14.dp)).background(c.secondary), contentAlignment = Alignment.Center) { Body("🎭", style = LKType.headlineMd) }
                Muted(trs(Tr("Đóng vai hội thoại với AI – từ tình huống hằng ngày (A1–A2) đến công sở: nói bằng micro hoặc gõ phím, nhận điểm và câu viết lại hay hơn.")), Modifier.weight(1f))
            }
        }
        if (h == null || pack == null) { EmptyState("🎭", trs(Tr("Đang cập nhật bài học…"))); return@StudyPage }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Muted(trs(Tr("Trình độ"))); Seg((0..2).map { Roleplay.levelButton(h, it) }, h.level, a.level, Modifier.weight(1f)) }
        for ((title, lv, list) in listOf(Triple(Tr("Tình huống hằng ngày"), h.dailyLevels.first() + " – " + h.dailyLevels.last(), h.everyday), Triple(Tr("Công sở"), h.workLevels.first() + " – " + h.workLevels.last(), h.work))) if (list.isNotEmpty()) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { Body(trs(title), style = LKType.headlineSm); Tag(lv) }
            if (list === h.everyday) for (pair in list.chunked(2)) Row(Modifier.fillMaxWidth().height(androidx.compose.foundation.layout.IntrinsicSize.Max), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {   // Stitch: two columns
                for (s in pair) RpTile(Modifier.weight(1f).fillMaxHeight(), { a.open("roleplay/${s.id}") }, trs(Roleplay.name(pack, s))) {
                    Body(s.em, style = LKType.headlineMd); Body(trs(Roleplay.name(pack, s)), style = LKType.titlePill); EnLtr { Muted(s.title) }
                    Spacer(Modifier.weight(1f))
                    Body(trs(Tr("{n} lượt", mapOf("n" to s.turns.size))), color = LocalLKColors.current.secondary, style = LKType.labelBadge)
                }
                if (pair.size == 1) Box(Modifier.weight(1f))
            } else for (s in list) LKCard(onClick = { a.open("roleplay/${s.id}") }, label = trs(Roleplay.name(pack, s))) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                    Body(s.em, style = LKType.headlineMd)
                    Column { Body(trs(Roleplay.name(pack, s)), style = LKType.titlePill); EnLtr { Muted(s.title + " · " + trs(Tr("{n} lượt", mapOf("n" to s.turns.size)))) } }
                }
            }
        }
        ui.footnote?.let { Muted(trs(it)) }
    }
}

/** The Kit card (2 dp lip) whose face fills the row height, so two tiles side by side stay equal. */
@Composable
private fun RpTile(modifier: Modifier, onClick: () -> Unit, label: String, content: @Composable androidx.compose.foundation.layout.ColumnScope.() -> Unit) {
    val c = LocalLKColors.current
    Box(modifier.tactile(onClick, label)) {
        Box(Modifier.matchParentSize().offset(y = 3.dp).background(c.outlineVariant, CardShape))
        Column(Modifier.fillMaxSize().clip(CardShape).background(c.card).border(2.dp, c.outlineVariant, CardShape).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(4.dp), content = content)
    }
}

@Composable
fun RoleplayBriefScreen(ui: RpBriefUi, a: RpActions) {
    val s = ui.s; val c = LocalLKColors.current
    StudyPage(s.em + " " + trs(Roleplay.name(ui.pack, s)), a.exit, bottom = { LKPrimaryButton("▶ " + trs(Tr("Bắt đầu hội thoại")), a.start); GhostButton(trs(Tr("Chọn tình huống khác")), a.back) }) {
        EnLtr { Body(s.title, style = LKType.headlineLg) }
        LKCard {
            Body("🎭 " + trs(Tr("Vai của AI")), style = LKType.titlePill)
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.surfaceContainerHighest).padding(LKSpacing.spaceSm), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(56.dp).clip(RoundedCornerShape(16.dp)).background(c.secondary), contentAlignment = Alignment.Center) { EnLtr { androidx.compose.material3.Text(s.aiName.take(1), color = c.onSecondary, style = LKType.headlineSm.toCompose()) } }
                Column(Modifier.weight(1f)) { EnLtr { Body(s.aiName, style = LKType.headlineSm); Muted(s.aiRole) } }
            }
            EnLtr { Muted(s.aiPersona) }
        }
        LKCard {
            Body("🎯 " + trs(Tr("Mục tiêu của bạn")), style = LKType.titlePill)
            Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.surfaceContainerHighest).padding(LKSpacing.spaceSm), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                NumBadge("1")
                Column(Modifier.weight(1f)) { if (s.cando.isNotEmpty()) Body(trs(Tr(s.cando)), style = LKType.labelMetric); EnLtr { if (s.cando.isNotEmpty()) Muted(s.you) else Body(s.you) } }
            }
        }
        LKCard {
            Body("📚 " + trs(Tr("Từ vựng chủ đề")), style = LKType.titlePill)
            Flow { s.vocab.forEachIndexed { i, (w, d) -> EnLtr { GhostButton(if (i in ui.saved) "✓ $w" else "+ $w", { a.save(i) }, enabled = i !in ui.saved) } } }
            Muted(trs(Tr("Bấm để lưu từ vào flashcard.")))
            ui.notice?.let { Body(trs(it), color = c.success, style = LKType.labelMetric) }
        }
        LKCard { Seg(s.levels, ui.level, a.level) }
    }
}

@Composable
fun RoleplayChatScreen(ui: RpChatUi, a: RpActions, gate: (() -> Unit) -> Unit) {
    val c = LocalLKColors.current; val s = ui.s
    StudyFocus((ui.bubbles.count { it.who == "me" }.toFloat() / s.turns.size).coerceIn(0f, 1f), s.em + " " + s.title, a.exit, bottom = {
        Flow { GhostButton("💡 " + trs(Tr("Gợi ý")), a.hint); if (ui.help) GhostButton("🆘 " + trs(Tr("Giúp tôi nói")), a.help); GhostButton("🏁 " + trs(Tr("Kết thúc & chấm điểm")), a.end, enabled = ui.canEnd) }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
            MicButton(ui.listening, { gate(a.mic) }, trs(Tr("Nói")), modifier = Modifier.height(56.dp))
            StudyField(ui.input, a.input, trs(Tr("Nói hoặc gõ câu trả lời…")), Modifier.weight(1f), onDone = a.send)
            SendButton(a.send, trs(Tr("Gửi")), enabled = ui.input.isNotBlank() && !ui.thinking)
        }
    }) {
        TeacherCard("ama", "point", s.title, Roleplay.modeEmoji(ui.mode) + " " + trs(Roleplay.modeLabel(ui.mode)) + " · " + s.levels[ui.L], tag = trs(ui.turnLabel))
        for (b in ui.bubbles) Bubble(b.text, b.who == "me", if (b.who == "ai") s.aiName else trs(Tr("Bạn")), if (b.who == "ai") ({ a.speak(b.text) }) else null)
        if (ui.thinking) Bubble("…", false, s.aiName)
        ui.hint?.let { (tip, line) -> LKCard(fill = c.surfaceContainerHighest) { tip?.let { Muted("🧭 " + trs(it)) }; Muted("💡 " + trs(Tr("Bạn có thể nói:"))); EnLtr { Row(verticalAlignment = Alignment.CenterVertically) { Body(line, Modifier.weight(1f)); GhostButton("🔊", { a.speak(line) }) } } } }
        ui.helpHint?.let { LKCard(fill = c.surfaceContainerHighest) { Muted("🆘 " + trs(Tr("Nghe rồi nói theo câu này:"))); EnLtr { Body(it, style = LKType.titlePill) } } }
        ui.notice?.let { RichBody(trs(it), color = c.secondary) }
    }
}

@Composable
fun RoleplayResultScreen(ui: RpResultUi, a: RpActions) {
    val c = LocalLKColors.current; val r = ui.report
    StudyPage("🏁 " + trs(Tr("Kết quả hội thoại")), a.exit, bottom = { LKPrimaryButton("↻ " + trs(Tr("Luyện lại")), a.again); GhostButton(trs(Tr("Chọn tình huống khác")), a.back) }) {
        Muted(ui.s.em + " " + ui.s.title + " · " + ui.s.levels[ui.L])
        if (r == null) { Body(trs(Tr("Bạn chưa trả lời câu nào – hãy thử lại nhé.")), style = LKType.titlePill); return@StudyPage }
        LKCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(72.dp), contentAlignment = Alignment.Center) { androidx.compose.material3.CircularProgressIndicator(progress = { r.ring / 100f }, Modifier.size(72.dp), color = c.primary, trackColor = c.surfaceContainerHighest, strokeWidth = 8.dp); Body(r.ring.toString(), style = LKType.headlineSm) }
            }
            for (pair in r.meters.chunked(2)) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                for ((label, v) in pair) Column(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(c.surfaceContainerHighest).padding(LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Muted(trs(label)); Body("$v", style = LKType.labelMetric) }
                    Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)).background(c.card)) { Box(Modifier.fillMaxWidth(v / 100f).height(8.dp).clip(RoundedCornerShape(50)).background(c.secondary)) } }
                if (pair.size == 1) androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))
            }
            Muted(trs(r.source) + " · +${r.xp} XP")
        }
        if (r.scores.summary.isNotEmpty()) TeacherCard("ama", "cheer", "", r.scores.summary)
        Body("✨ " + trs(Tr("3 câu nói sắc hơn")), Modifier.testTag("speak-rp-rewrites"), style = LKType.headlineSm)
        if (r.scores.rewrites.isEmpty()) Muted(trs(Tr("Rất tốt – không có câu nào cần viết lại!")))
        r.scores.rewrites.forEachIndexed { n, w -> LKCard {
            EnLtr { Muted(w.you) }; EnLtr { Row(verticalAlignment = Alignment.CenterVertically) { Body(w.better, Modifier.weight(1f), style = LKType.titlePill); GhostButton("🔊", { a.speak(w.better) }) } }
            if (w.meaning.isNotEmpty()) Muted(w.meaning); Muted("💡 " + (w.why?.let { trs(it) } ?: w.whyText))
            GhostButton(if (n in ui.saved) "✓ " + trs(Tr("Đã lưu")) else "+ " + trs(Tr("Lưu vào flashcard")), { a.saveRewrite(n) }, enabled = n !in ui.saved) } }
        ui.confidence?.let { GhostButton("💬 " + trs(Tr("Giao tiếp tự tin")), { a.open("confidence/$it") }) }
    }
}

class RoleplayVm(private val env: SpeakEnv, private val arg: String, private val lang: String) : ViewModel() {
    var list by mutableStateOf<RpListUi?>(null); private set
    var brief by mutableStateOf<RpBriefUi?>(null); private set
    var chat by mutableStateOf<RpChatUi?>(null); private set
    var result by mutableStateOf<RpResultUi?>(null); private set
    var gone by mutableStateOf<String?>(null); private set
    private lateinit var pack: SpeakPack; private var script: RpScript? = null; private var level = 1; private var accent = "en-GB"; private var talk: Roleplay.Chat? = null
    private var input = ""; private var thinking = false; private var hint: Pair<Tr?, String>? = null; private var helpHint: String? = null; private var listening = false; private var notice: Tr? = null; private var saved = emptySet<Int>(); private var saved2 = emptySet<Int>(); private var helpMode = false

    init { viewModelScope.launch { pack = env.pack() ?: run { list = RpListUi(null, null, null); return@launch }; accent = env.accent(); level = Roleplay.level(env.kv(Roleplay.STORE_LEVEL))
        val s = pack.script(arg); if (arg.isNotEmpty() && s == null) { gone = "roleplay"; return@launch }; script = s; if (s == null) showList() else showBrief() } }
    override fun onCleared() { env.stopListening(); env.stopSpeaking() }
    private fun showList() { brief = null; chat = null; result = null; list = RpListUi(pack, Roleplay.hub(pack, level), Roleplay.footnote(pack, env.signedIn())) }
    private fun showBrief() { val s = script ?: return; list = null; chat = null; result = null; brief = RpBriefUi(pack, s, level, saved, notice) }
    fun level(i: Int) { level = i; viewModelScope.launch { env.putKv(Roleplay.STORE_LEVEL, JsonPrimitive(i)) }; if (script == null) showList() else showBrief() }
    fun open(id: String) { script = pack.script(id); saved = emptySet(); notice = null; if (script == null) showList() else showBrief() }
    fun toList() { script = null; showList() }
    fun toBrief() { env.stopListening(); env.stopSpeaking(); talk = null; notice = null; showBrief() }
    fun save(i: Int) { val s = script ?: return; val v = Roleplay.saveVocab(s, i); viewModelScope.launch { env.word.addWord(v.entry, v.context, false); saved = saved + i; notice = Tr("Đã lưu vào flashcard"); showBrief() } }

    // ---- the conversation ----
    fun start(withHelp: Boolean = false) { val s = script ?: return; viewModelScope.launch {
        val today = java.time.LocalDate.now(java.time.ZoneOffset.UTC).toString(); val day = Roleplay.dayOf(env.kv(Roleplay.STORE_DAY)); val left = Roleplay.aiLeft(pack, env.signedIn(), day, today)
        val mode = Roleplay.mode(left, env.online()); if (mode != "script") env.putKv(Roleplay.STORE_DAY, Roleplay.dayJson(Roleplay.useAi(day, today)))
        val t = Roleplay.Chat(pack, s, level, mode); t.open(); talk = t; helpMode = withHelp; input = ""; thinking = false; hint = null; helpHint = null; notice = null; listening = false; chatSync(); speakAi(t.hist.last().text) } }
    private fun speakAi(text: String) { val t = talk ?: return; env.speak(text, accent, t.rate.toFloat()) }
    private fun chatSync() { val t = talk ?: return; val s = script ?: return; list = null; brief = null; result = null
        chat = RpChatUi(s, t.L, t.hist.toList(), t.mode, t.turnLabel, thinking, input, hint, helpHint, listening, notice, !thinking, helpMode) }
    fun input(v: String) { input = v; chatSync() }
    fun send() { val t = talk ?: return; val text = t.begin(input) ?: return; input = ""; hint = null; helpHint = null; thinking = true; chatSync()
        viewModelScope.launch { val r = reply(t, text); thinking = false; t.answer(r); chatSync(); speakAi(r.text)
            if (t.done) { delay(600); finish() } } }
    private suspend fun reply(t: Roleplay.Chat, text: String): Roleplay.Reply {
        val s = t.s
        if (t.mode == "server") {
            when (val ai = env.ai("rp", Roleplay.rpArgs(s, t.L), Roleplay.turnPrompt(s, t.L, t.hist.toList(), t.i))) {
                is AiResult.Ok -> Roleplay.serverReply(ai.out, t.retried)?.let { return it }
                is AiResult.Quota -> { t.downgrade(); notice = Tr("Đã hết lượt AI hôm nay – tiếp tục bằng kịch bản soạn sẵn."); chatSync() }
                AiResult.Failed -> { t.downgrade(); notice = Tr("AI đang bận – tiếp tục bằng kịch bản soạn sẵn."); chatSync() }
            }
            if (t.mode == "server") t.downgrade()
        }
        return Roleplay.scripted(pack, s, t.L, t.i, text, t.retried, env.random)
    }
    fun hint() { val t = talk ?: return; helpHint = null; hint = t.hint(); chatSync() }
    fun help() { val t = talk ?: return; hint = null; val line = t.help(); helpHint = line; input = line; chatSync(); env.speak(line, accent, Roleplay.HELP_RATE.toFloat()) }
    fun speak(text: String) { env.speak(text, accent, (talk?.rate ?: 1.0).toFloat()) }
    fun mic() { val t = talk ?: return; if (listening) { env.stopListening(); return }; env.stopSpeaking(); listening = true; notice = null; chatSync(); val target = t.modelLine()
        env.listen(accent, {}, { alts -> listening = false; val h = SpeakScore.best(target, alts).heard; chatSync(); if (h.isNotEmpty()) { input = h; send() } }, { code -> listening = false; notice = recText(code); chatSync() }) }
    fun micDenied() { listening = false; notice = recText("not-allowed"); chatSync() }
    fun end() { val t = talk ?: return; if (!t.busy) finish() }
    private fun finish() { val t = talk ?: return; val s = script ?: return; env.stopListening(); env.stopSpeaking()
        viewModelScope.launch { val hist = t.hist.toList(); var ai: Roleplay.Scores? = null
            if (hist.any { it.who == "me" } && (t.mode != "script" || env.signedIn())) { val langEn = Locale.forLanguageTag(lang).getDisplayLanguage(Locale.ENGLISH).ifEmpty { "English" }
                (env.ai("rpcoach", Roleplay.coachArgs(s), Roleplay.scoringPrompt(s, t.L, hist, langEn)) as? AiResult.Ok)?.let { ai = Roleplay.aiScore(it.out) } }
            val r = Roleplay.report(pack, s, t.L, hist, t.hints, ai); r?.let { env.pay(it.reward) }; saved2 = emptySet()
            chat = null; result = RpResultUi(s, t.L, r, saved2, Roleplay.confidence(pack, s)) } }
    fun saveRewrite(n: Int) { val s = script ?: return; val r = result?.report?.scores?.rewrites?.getOrNull(n) ?: return; val v = Roleplay.saveRewrite(s, r)
        viewModelScope.launch { env.word.addWord(v.entry, v.context, true); saved2 = saved2 + n; result = result?.let { RpResultUi(it.s, it.L, it.report, saved2, it.confidence) } } }
    fun again() { start(helpMode) }
    class Factory(private val env: SpeakEnv, private val arg: String, private val lang: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = RoleplayVm(env, arg, lang) as T }
}
