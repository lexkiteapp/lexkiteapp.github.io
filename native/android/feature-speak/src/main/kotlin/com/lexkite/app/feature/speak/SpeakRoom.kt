package com.lexkite.app.feature.speak

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.draw.clip
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.size
import androidx.compose.ui.unit.dp
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.skills.Lexis
import com.lexkite.app.core.speak.SpeakPack
import com.lexkite.app.core.speak.SpeakSample
import com.lexkite.app.core.speak.SpeakScore
import com.lexkite.app.core.speak.SpeakingRoom
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.core.vocab.CardMath
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
import com.lexkite.app.feature.vocab.PickerDialog
import com.lexkite.app.feature.vocab.RichBody
import com.lexkite.app.feature.vocab.StatTile
import com.lexkite.app.feature.vocab.StudyFocus
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.Tag
import com.lexkite.app.feature.vocab.t
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

// ---------------------------------------------------------------- #/speaking  (Stitch speaking-hub / -record / -result)
class ShadowUi(val k: Int, val n: Int, val sentence: String, val score: Int? = null, val heard: String = "", val listening: Boolean = false, val finished: Int? = null, val error: Tr? = null)
class SpeakingUi(
    val page: SpeakingRoom.Page, val partNames: List<Tr>, val topics: List<String>, val qi: Int, val phase: String, val clock: String, val clockTone: String, val hint: Tr, val live: String,
    val analysis: SpeakingRoom.Analysis?, val transcript: String, val suggestions: List<Pair<String, String>>, val tips: List<Tr>, val sample: SpeakSample?, val sentences: List<String>, val shadow: ShadowUi? = null,
    val micError: Tr? = null, val showTopics: Boolean = false, val readingSentence: Int = -1, val canNext: Boolean = false, val saved: Set<String> = emptySet(),
)
class SpeakingActions(
    val part: (String) -> Unit = {}, val topic: (Int) -> Unit = {}, val random: () -> Unit = {}, val topics: (Boolean) -> Unit = {}, val hear: () -> Unit = {}, val nextQ: () -> Unit = {}, val mic: () -> Unit = {},
    val skipPrep: () -> Unit = {}, val addWord: (String) -> Unit = {}, val speakWord: (String) -> Unit = {}, val playSample: () -> Unit = {}, val shadow: () -> Unit = {}, val shadowHear: (Boolean) -> Unit = {},
    val shadowMic: () -> Unit = {}, val shadowNext: () -> Unit = {}, val savePhrase: (String, String) -> Unit = { _, _ -> }, val exit: () -> Unit = {},
)

@Composable
fun SpeakingScreen(ui: SpeakingUi, a: SpeakingActions) {
    val c = LocalLKColors.current; val p = ui.page; var sampleOpen by remember { mutableStateOf(ui.shadow != null) }
    if (ui.phase == "rec" || ui.phase == "prep") {   // Stitch speaking-record: a focus screen (X + target-zone bar), the clock and the stop button pinned at the bottom
        val secs = ui.clock.split(":").let { (it.getOrNull(0)?.toIntOrNull() ?: 0) * 60 + (it.getOrNull(1)?.toIntOrNull() ?: 0) }
        StudyFocus((secs / p.info.hi.toFloat()).coerceIn(0f, 1f), trs(Tr("Phòng luyện Speaking")), a.exit, bottom = { SpeakingClockCard(ui, a) }) { SpeakingQuestionCard(ui, a, slot = true) }
        return
    }
    StudyPage(trs(Tr("Phòng luyện Speaking")), a.exit) {
        if (ui.analysis != null) TeacherCard("ama", "point", "", trs(Tr("Bấm micro để trả lời lại")))   // Stitch speaking-result: the coach on top, then the tiles / transcript / feedback; recording listen-back is not ported yet
        ui.analysis?.let { r -> LKCard(Modifier.testTag("speak-result")) {
            Body("📊 " + trs(Tr("Kết quả")), style = LKType.titlePill)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {   // Stitch: 2 × 2 stat tiles
                StatTile("${r.seconds}s", trs(Tr("Thời lượng")), Modifier.weight(1f)); StatTile(if (r.wpm != 0) r.wpm.toString() else "—", trs(Tr("Từ/phút")), Modifier.weight(1f))
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                StatTile(r.words.toString(), trs(Tr("Số từ")), Modifier.weight(1f)); StatTile(r.fillers.toString(), trs(Tr("Từ đệm")), Modifier.weight(1f))
            }
            if (r.hasText) { Body("📝 " + trs(Tr("Bản chữ (máy nhận dạng)")), style = LKType.labelMetric); EnLtr { Body(ui.transcript) } }
            if (r.chips.isNotEmpty()) Flow { for (x in r.chips) Tag((if (x.kind == "ok") "✓ " else if (x.kind == "lv") "🎓 " else "🧷 ") + x.text, if (x.kind == "ok") c.success else c.secondary) }
            Body("💬 " + trs(Tr("Nhận xét")), style = LKType.labelMetric)
            r.notes.forEachIndexed { i, n ->   // Stitch: stacked coloured feedback cards (green = all good, then amber / blue)
                val good = r.notes.size == 1 && n.k.startsWith("Rất tốt"); val tint = if (good) c.success else if (i % 2 == 0) c.tertiary else c.secondary
                Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(tint.copy(alpha = 0.14f)).border(1.dp, tint.copy(alpha = 0.4f), RoundedCornerShape(14.dp)).padding(LKSpacing.spaceSm), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    Body(if (good) "✓" else "💡", color = tint); RichBody(trs(n), Modifier.weight(1f))
                }
            }
            Muted(trs(Tr("Phân tích tự động để luyện tập, không thay thế giám khảo.")))
        } }
        Seg(ui.partNames.map { trs(it).substringBefore(" · ") }, listOf("p1", "p2", "p3").indexOf(p.part), { a.part(listOf("p1", "p2", "p3")[it]) })
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            GhostButton("📚 " + trs(Tr(p.topic.title)), { a.topics(true) }, Modifier.weight(1f)); GhostButton("🎲", a.random)
        }
        Muted(trs(Tr("{n} chủ đề", mapOf("n" to ui.topics.size))))
        if (ui.showTopics) PickerDialog(trs(Tr("Chủ đề")), ui.topics.mapIndexed { i, x -> i.toString() to trs(Tr(x)) }, p.index.toString(), { a.topic(it.toInt()); a.topics(false) }, { a.topics(false) })
        TeacherCard("ama", "point", "", trs(Tr("Giám khảo đọc câu hỏi → bạn ghi âm câu trả lời → nghe lại, xem bản chữ và phân tích từ vựng. Ghi âm chỉ nằm trên máy bạn.")))
        SpeakingQuestionCard(ui, a)
        SpeakingClockCard(ui, a)
        LKCard {
            Body("💡 " + trs(Tr("Từ vựng nên dùng")), style = LKType.titlePill)
            for ((w, m) in ui.suggestions) Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { EnLtr { Body(w, style = LKType.labelMetric) }; Muted(m) }
                GhostButton("🔊", { a.speakWord(w) }); GhostButton(if (w in ui.saved) "✓" else "＋", { a.addWord(w) }, enabled = w !in ui.saved)
            }
        }
        LKCard { Body("🧭 " + trs(Tr("Mẹo {part}", mapOf("part" to trs(Tr(p.info.name)).substringBefore(" · ")))), style = LKType.titlePill); for (x in ui.tips) RichBody("• " + trs(x), style = LKType.bodySm) }
        ui.sample?.let { sm -> LKCard {
            GhostButton("📝 " + trs(Tr("Câu trả lời mẫu (band 7.5–8)")) + if (sampleOpen) " ▲" else " ▼", { sampleOpen = !sampleOpen })
            if (sampleOpen) {
                Muted(trs(Tr("xem sau khi đã tự trả lời")))
                EnLtr { Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) { ui.sentences.forEachIndexed { i, x -> Body(x, color = if (i == ui.readingSentence) c.secondary else c.onSurface) } } }
                if (sm.vocab.isNotEmpty()) Flow { for ((en, vi) in sm.vocab) GhostButton("+ $en", { a.savePhrase(en, vi) }) }
                Flow { GhostButton("🔊 " + trs(Tr("Nghe cả bài")), a.playSample); GhostButton("🔁 " + trs(Tr("Luyện shadowing")), a.shadow) }
                ui.shadow?.let { sh -> ShadowBox(sh, a) }
            }
        } }
    }
}

@Composable
private fun SpeakingQuestionCard(ui: SpeakingUi, a: SpeakingActions, slot: Boolean = false) {
    val p = ui.page
    LKCard {
            if (slot) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(56.dp)) { LocalSpeakSlots.current.teacher("ama", "point", Modifier.size(56.dp)) }; Body(trs(Tr(p.info.desc)), Modifier.weight(1f), style = LKType.titlePill) }
            else Flow { Tag(trs(Tr(p.info.desc))); if (p.questions.size > 1) Muted(trs(Tr("Câu {i}/{n}", mapOf("i" to ui.qi + 1, "n" to p.questions.size)))) }   // wraps: a long tag must not squeeze the counter to one letter per line
            if (p.part == "p2") { EnLtr { Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) { Body(p.topic.p2q, style = LKType.titlePill); Muted("You should say:"); for (x in p.topic.p2points) Body("• $x") } } }
            else EnLtr { Body(p.questions[ui.qi % p.questions.size], style = LKType.titlePill) }
            Flow { GhostButton("🔊 " + trs(Tr("Nghe giám khảo hỏi")), a.hear); if (ui.canNext) GhostButton(trs(Tr("Câu khác")) + " →", a.nextQ) }
        }
}

@Composable
private fun SpeakingClockCard(ui: SpeakingUi, a: SpeakingActions) {
    val c = LocalLKColors.current
        LKCard(fill = c.surfaceContainerHighest) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Body(ui.clock, style = LKType.headlineLg, color = if (ui.clockTone == "again") c.error else if (ui.clockTone == "good") c.success else c.onSurface)
                val link = Regex("<a[^>]*>(.*?)</a>").find(trs(ui.hint)); Muted(trs(ui.hint).replace(Regex("<a[^>]*>.*?</a>"), "").trim())
                MicButton(ui.phase == "rec", a.mic, trs(Tr("Bắt đầu / dừng ghi âm")))
                if (ui.phase == "prep" && link != null) GhostButton(link.groupValues[1], a.skipPrep)
                if (ui.live.isNotEmpty()) EnLtr { Muted("…" + ui.live) }
                ui.micError?.let { RichBody("⚠️ " + trs(it), color = c.error) }
            }
        }
}

@Composable
private fun ShadowBox(sh: ShadowUi, a: SpeakingActions) {
    val c = LocalLKColors.current
    LKCard(fill = c.surfaceContainerHighest) {
        if (sh.finished != null) { Body("✓ " + trs(Tr("Hoàn thành shadowing · trung bình {pct}% giống mẫu", mapOf("pct" to sh.finished))), style = LKType.titlePill); return@LKCard }
        Muted(trs(Tr("Câu {i}/{n} – nghe rồi nói lặp lại, bắt chước nhịp và ngữ điệu", mapOf("i" to sh.k + 1, "n" to sh.n))))
        EnLtr { Body(sh.sentence, style = LKType.titlePill) }
        Flow { GhostButton("🔊 " + trs(Tr("Nghe")), { a.shadowHear(false) }); GhostButton("🐢", { a.shadowHear(true) }); GhostButton("🎙️ " + trs(Tr("Nói lại")), a.shadowMic); GhostButton(trs(Tr("Bỏ qua")) + " →", a.shadowNext) }
        if (sh.listening) Muted("🔴 " + trs(Tr("Đang nghe…")))
        sh.score?.let { s -> ScorePill(s, SpeakingRoom.shadowColor(s)); Muted(trs(Tr("{score}% giống mẫu", mapOf("score" to s))) + " · " + trs(Tr("máy nghe: “{heard}”", mapOf("heard" to sh.heard)))); GhostButton(trs(Tr("Câu tiếp")) + " →", a.shadowNext) }
        sh.error?.let { Muted(trs(it)) }
    }
}

class SpeakingVm(private val env: SpeakEnv, private val arg: String) : ViewModel() {
    var ui by mutableStateOf<SpeakingUi?>(null); private set
    var empty by mutableStateOf(false); private set
    private lateinit var pack: SpeakPack; private lateinit var page: SpeakingRoom.Page
    private var lexis: Lexis = Lexis(emptyList(), emptyList(), emptyList()); private var accent = "en-GB"; private var topicWords: List<String> = emptyList(); private var suggestions: List<Pair<String, String>> = emptyList()
    private var qi = 0; private var phase = "idle"; private var finalText = ""; private var interim = ""; private var t0 = 0L; private var clock = "00:00"; private var tone = ""; private var hint: Tr = Tr(""); private var analysis: SpeakingRoom.Analysis? = null
    private var transcript = ""; private var micError: Tr? = null; private var showTopics = false; private var reading = -1; private var saved = emptySet<String>()
    private var shadow: ShadowUi? = null; private var shadowSents: List<String> = emptyList(); private var shadowScores = ArrayList<Int>(); private var prepJob: Job? = null; private var tickJob: Job? = null; private var heard: Job? = null
    private var restarts = 0

    init { viewModelScope.launch {
        pack = env.pack() ?: run { empty = true; return@launch }
        page = SpeakingRoom.page(pack, arg); accent = env.accent(); lexis = env.skills()?.lexis ?: lexis
        val lib = env.library(); val tp = lib?.topic(page.topic.topic)
        val extra = listOf("linking", "idioms").flatMap { lib?.topic(it)?.words?.take(2) ?: emptyList() }
        suggestions = ((tp?.words?.take(8) ?: emptyList()) + extra).map { (it.get("word") as? JsonPrimitive)?.content.orEmpty() to CardMath.meanOf(it) }
        topicWords = (tp?.words ?: emptyList()).map { (it.get("word") as? JsonPrimitive)?.content.orEmpty() }
        saved = env.word.cards().keys.toSet(); hint = SpeakingRoom.hintRecord(page); publish()
        delay(SpeakingRoom.READ_DELAY_MS); env.speak(SpeakingRoom.askText(page, qi), accent, SpeakingRoom.SHADOW_DEFAULT_RATE.toFloat())
    } }
    override fun onCleared() { stopAll() }
    private fun stopAll() { prepJob?.cancel(); tickJob?.cancel(); env.stopListening(); env.stopSpeaking() }

    private fun publish() { val sm = SpeakingRoom.sample(pack, page, qi)
        ui = SpeakingUi(page, listOf("p1", "p2", "p3").map { Tr(pack.parts.getValue(it).name) }, pack.bank.map { it.title }, qi, phase, clock, tone, hint, if (interim.isEmpty() && finalText.isEmpty()) "" else (finalText + interim).takeLast(160), analysis, transcript, suggestions, SpeakingRoom.tips(pack, page.part), sm,
            sm?.let { SpeakingRoom.sentences(it) } ?: emptyList(), shadow, micError, showTopics, reading, page.questions.size > 1, saved) }

    fun part(p: String) { stopAll(); resetTo(SpeakingRoom.page(pack, "$p/${page.index}")) }
    fun topic(i: Int) { stopAll(); resetTo(SpeakingRoom.page(pack, "${page.part}/$i")) }
    fun random() { topic(SpeakingRoom.randomTopic(page, pack.bank.size, env.random)) }
    fun topics(on: Boolean) { showTopics = on; publish() }
    private fun resetTo(p: SpeakingRoom.Page) { page = p; qi = 0; phase = "idle"; analysis = null; shadow = null; micError = null; finalText = ""; interim = ""; clock = "00:00"; tone = ""; hint = SpeakingRoom.hintRecord(p); prepJob = null; publish()
        viewModelScope.launch { delay(SpeakingRoom.READ_DELAY_MS); env.speak(SpeakingRoom.askText(page, qi), accent, SpeakingRoom.SHADOW_DEFAULT_RATE.toFloat()) } }
    fun hear() { env.speak(SpeakingRoom.askText(page, qi), accent, SpeakingRoom.SHADOW_DEFAULT_RATE.toFloat()) }
    fun nextQ() { qi = SpeakingRoom.nextQuestion(page, qi); analysis = null; shadow = null; publish(); hear() }

    // ---- recording ----
    /** The mic button: Part 2 first counts down the preparation minute; otherwise it records (the screen has RECORD_AUDIO). */
    fun mic() {
        if (phase == "rec") { stop(); return }
        if (phase == "prep") return
        if (page.part == "p2" && prepJob == null) { prep(); return }
        start()
    }
    fun micDenied() { micError = MIC_DENIED_NATIVE; phase = "idle"; publish() }
    private fun prep() { var left = page.info.prep; phase = "prep"; clock = SpeakingRoom.clock(left.toDouble()); hint = Tr("Thời gian chuẩn bị – ghi chú ý chính · <a href=\"#\" id=\"skipPrep\">bắt đầu nói ngay</a>"); publish()
        prepJob = viewModelScope.launch { while (left > 0) { delay(1000); left--; clock = SpeakingRoom.clock(left.toDouble()); publish() }; start() } }
    fun skipPrep() { prepJob?.cancel(); prepJob = viewModelScope.launch { }; start() }
    private fun start() {
        env.stopSpeaking(); finalText = ""; interim = ""; analysis = null; micError = null; restarts = 0; phase = "rec"; t0 = System.currentTimeMillis()
        hint = Tr("Mục tiêu: {a}–{b} giây", mapOf("a" to page.info.lo, "b" to page.info.hi)); publish()
        if (!env.canListen) { micError = Tr("Trình duyệt không hỗ trợ nhận dạng giọng nói – hãy dùng Chrome hoặc Edge."); }
        listenLoop()
        tickJob?.cancel(); tickJob = viewModelScope.launch { while (phase == "rec") { val s = (System.currentTimeMillis() - t0) / 1000.0; clock = SpeakingRoom.clock(s); tone = SpeakingRoom.clockColor(page, s); publish(); if (page.part == "p2" && s >= SpeakingRoom.P2_MAX_SECONDS) { stop(); break }; delay(SpeakingRoom.TICK_MS) } }
    }
    /** SpeechRecognizer ends after a pause: keep listening until the learner stops (the web restarts `onend` the same way). */
    private fun listenLoop() { if (phase != "rec") return
        env.listen(accent, { p -> interim = p; publish() }, { alts -> if (phase == "rec") { finalText += (alts.firstOrNull { it.isNotBlank() } ?: "").trim() + " "; interim = ""; restarts = 0; publish(); listenLoop() } },
            { code -> if (phase != "rec") return@listen; if (com.lexkite.app.core.speak.RecError.blocked(code)) { micError = recText(code); publish(); stop() } else if (++restarts < 4) viewModelScope.launch { delay(300); listenLoop() } else stop() }) }
    private fun stop() { if (phase != "rec") return; phase = "idle"; tickJob?.cancel(); env.stopListening()
        val secs = (System.currentTimeMillis() - t0) / 1000.0; val text = (finalText + " " + interim).trim(); transcript = text; interim = ""
        hint = Tr("Bấm micro để trả lời lại"); val a = SpeakingRoom.analyse(pack, page, text, secs, lexis, topicWords); analysis = a; publish(); viewModelScope.launch { env.pay(a.reward) } }

    // ---- words / sample ----
    fun speakWord(w: String) { env.speak(w, accent) }
    fun addWord(w: String) { viewModelScope.launch { val lib = env.library(); val e = lib?.index?.get(w.lowercase()) ?: JsonObject(mapOf("word" to JsonPrimitive(w), "topic" to JsonPrimitive("speaking"))); env.word.addWord(e, null, true); saved = saved + w.lowercase(); publish() } }
    fun playSample() { val sm = SpeakingRoom.sample(pack, page, qi) ?: return; env.speak(sm.a, accent, 0.95f) }
    fun savePhrase(en: String, vi: String) { viewModelScope.launch { val sm = SpeakingRoom.sample(pack, page, qi) ?: return@launch; val sent = SpeakingRoom.savePhraseSentence(SpeakingRoom.sentences(sm), en)
        env.word.addWord(JsonObject(mapOf("word" to JsonPrimitive(en), "vi" to JsonPrimitive(if (env.learnLang == "vi") vi else ""), "pos" to JsonPrimitive("phrase"), "topic" to JsonPrimitive("speaking"))), JsonObject(mapOf("text" to JsonPrimitive(sent), "title" to JsonPrimitive("Speaking mẫu"))), false) } }
    fun shadow() { val sm = SpeakingRoom.sample(pack, page, qi) ?: return; shadowSents = SpeakingRoom.sentences(sm); shadowScores = ArrayList(); shadowStep(0) }
    private fun shadowStep(k: Int) {
        if (k >= shadowSents.size) { val d = SpeakingRoom.shadowDone(shadowScores, shadowSents.size); shadow = ShadowUi(k, shadowSents.size, "", finished = d.pct); publish(); viewModelScope.launch { env.pay(d.reward) }; return }
        shadow = ShadowUi(k, shadowSents.size, shadowSents[k]); publish(); env.speak(shadowSents[k], accent, 0.95f) }
    fun shadowHear(slow: Boolean) { val sh = shadow ?: return; env.speak(sh.sentence, accent, (if (slow) SpeakingRoom.SLOW_RATE else SpeakingRoom.SHADOW_DEFAULT_RATE).toFloat()) }
    fun shadowMic() { val sh = shadow ?: return; shadow = ShadowUi(sh.k, sh.n, sh.sentence, listening = true); publish()
        env.listen(accent, {}, { alts -> val b = SpeakScore.best(sh.sentence, alts); shadowScores.add(b.score); shadow = ShadowUi(sh.k, sh.n, sh.sentence, b.score, b.heard); publish() },
            { code -> shadow = ShadowUi(sh.k, sh.n, sh.sentence, error = recText(code)); publish() }) }
    fun shadowNext() { val sh = shadow ?: return; shadowStep(sh.k + 1) }
    class Factory(private val env: SpeakEnv, private val arg: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = SpeakingVm(env, arg) as T }
}
