package com.lexkite.app.feature.speak

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.speak.MicOutcome
import com.lexkite.app.core.speak.SpeakDrill
import com.lexkite.app.core.speak.SpeakHub
import com.lexkite.app.core.speak.SpeakScore
import com.lexkite.app.core.speak.Situation
import com.lexkite.app.core.speak.SpkProgress
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.Chip
import com.lexkite.app.feature.vocab.EmptyState
import com.lexkite.app.feature.vocab.EnLtr
import com.lexkite.app.feature.vocab.Flow
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.RichBody
import com.lexkite.app.feature.vocab.StudyFocus
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.Tag
import com.lexkite.app.feature.vocab.t
import kotlinx.coroutines.Job
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject

/** The teacher art slot (set by the route). */
val LocalSpeakSlots = compositionLocalOf { SpeakSlots() }

// ---------------------------------------------------------------- #/speak/<id>  (Stitch pas-sit)
class SitUi(val hub: SpeakHub.Hub?, val id: String, val missingMic: Boolean = false)
class SitActions(val drill: (String?) -> Unit = {}, val roleplay: () -> Unit = {}, val culture: () -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun SpeakSituationScreen(ui: SitUi, a: SitActions) {
    val c = LocalLKColors.current; val h = ui.hub
    if (h == null) { StudyPage(trs(Tr("Luyện nói theo câu")), a.exit) { EmptyState("🗣️", trs(Tr("Không tải được – thử lại sau"))) }; return }
    StudyPage(h.title, a.exit, bottom = { LKPrimaryButton(trs(Tr("Bắt đầu")), { a.drill(null) }) }) {
        Muted(trs(h.sub) + " • " + h.cefr)
        LKCard(fill = c.surfaceContainerHighest) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Box(Modifier.size(96.dp)) { LocalSpeakSlots.current.teacher("ama", "point", Modifier.size(96.dp)) }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) { Muted(trs(Tr("Nhiệm vụ tình huống"))); Body(h.mission, style = LKType.titlePill); Tag(trs(h.stage)) }
            }
        }
        LKCard {   // Stitch: the adventure path as one horizontal row of round nodes (state glyph, label, stars)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
                for (n in h.nodes) Column(Modifier.weight(1f).clickable(onClickLabel = n.label) { a.drill(n.stage) }.semantics(mergeDescendants = true) { contentDescription = n.label }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Box(Modifier.size(40.dp).clip(androidx.compose.foundation.shape.CircleShape).background(if (n.st == "todo") c.surfaceContainerHighest else c.secondary), contentAlignment = Alignment.Center) {
                        Body(if (n.st == "done") "✓" else if (n.st == "cur") "▶" else "○", color = if (n.st == "todo") c.outline else c.onSecondary, style = LKType.titlePill) }
                    Body(n.label, style = LKType.labelBadge, maxLines = 2, align = androidx.compose.ui.text.style.TextAlign.Center); StarsRow(n.stars, 3, trs(n.aria))
                }
            }
        }
        LKCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Body(trs(Tr("Nhiệm vụ tình huống")), style = LKType.titlePill); Tag(trs(h.taskDone)) }
            for (k in h.tasks) Row(Modifier.fillMaxWidth().padding(vertical = LKSpacing.space2xs), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Text2(if (k.done) "✓" else if (k.st == "cur") "▶" else "○", k.st != "todo"); Column(Modifier.weight(1f)) { Body(k.title); EnLtr { Muted(k.ex) } } }
        }
        LKCard {
            EnLtr { Body(h.mastered, style = LKType.headlineSm) }; Muted(trs(h.masteredSub)); Muted(trs(h.remain)); Muted(trs(h.week))
            Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)).background(c.surfaceContainerHighest)) { Box(Modifier.fillMaxWidth(h.pct / 100f).height(8.dp).clip(RoundedCornerShape(50)).background(c.primary)) }
        }
        if (h.addon.isNotEmpty()) LKCard { Body(trs(Tr("Từ vựng nên dùng")), style = LKType.titlePill); Flow { for (w in h.addon) Tag(w.w + if (w.ipa.isNotEmpty()) "  " + w.ipa else "") } }
        if (h.culture.isNotEmpty()) LKCard(onClick = a.culture, label = trs(Tr("Văn hóa"))) { Body("ℹ️ " + trs(Tr("Văn hóa")), style = LKType.titlePill); Muted(h.culture) }
        GhostButton("🎭 " + trs(Tr("Hội thoại đóng vai")), a.roleplay)
    }
}
@Composable private fun Text2(s: String, on: Boolean) { val c = LocalLKColors.current; androidx.compose.material3.Text(s, color = if (on) c.secondary else c.outline, style = LKType.titlePill.toCompose()) }

class SitVm(private val env: SpeakEnv, private val id: String) : ViewModel() {
    var ui by mutableStateOf<SitUi?>(null); private set
    var gone by mutableStateOf<String?>(null); private set
    init { viewModelScope.launch {
        if (!env.speakOn()) { gone = "skills"; return@launch }
        val ids = env.situationIds(); val want = id.ifEmpty { "cafe" }
        if (id.isNotEmpty() && ids.isNotEmpty() && id !in ids) { gone = "speak/cafe"; return@launch }
        val s = env.situation(want)
        if (s == null) { ui = SitUi(null, want); return@launch }
        val cards = env.word.cards().values.mapNotNull { c -> (c.get("word") as? kotlinx.serialization.json.JsonPrimitive)?.content?.lowercase()?.let { it to ((c.get("ipa") as? kotlinx.serialization.json.JsonPrimitive)?.content ?: "") } }.toMap()
        ui = SitUi(SpeakHub.hub(s, env.kv(SpkProgress.KEY) as? JsonObject, cards, env.now), want)
    } }
    class Factory(private val env: SpeakEnv, private val id: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = SitVm(env, id) as T }
}

// ---------------------------------------------------------------- #/speak/<id>/drill  (Stitch pas-drill)
class DrillWordUi(val text: String, val tap: Boolean, val index: Int, val bad: Boolean)
class DrillResUi(val score: Int, val pass: Boolean, val stars: Int, val verdict: Tr, val sub: Tr)
class DrillTipUi(val ipa: String, val note: String, val hi: String)
class DrillUi(
    val chip: String, val lineTr: Tr, val total: Int, val done: Int, val pct: Int, val coach: Tr, val say: Tr, val hint: String, val pose: String, val beat: Int, val words: List<DrillWordUi>,
    val noMic: Boolean, val rec: Boolean, val res: DrillResUi?, val canNext: Boolean, val alt: Tr, val tip: DrillTipUi?, val memory: Boolean, val english: String, val blocked: Tr? = null,
)
class DrillActions(val play: () -> Unit = {}, val slow: () -> Unit = {}, val mic: () -> Unit = {}, val tapWord: (Int) -> Unit = {}, val next: () -> Unit = {}, val alt: () -> Unit = {}, val exit: () -> Unit = {})

private val BEATS = listOf("Nghe", "Nói đuổi", "Nói từ trí nhớ")
@Composable
fun SpeakDrillScreen(ui: DrillUi, a: DrillActions) {
    val c = LocalLKColors.current
    StudyFocus(ui.pct / 100f, ui.chip, a.exit, bottom = {
        LKPrimaryButton(trs(Tr("Tiếp")), a.next, enabled = ui.canNext)
        GhostButton(trs(ui.alt), a.alt)
    }) {
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Tag(trs(ui.lineTr)); Muted(trs(Tr("Nhịp {n}/3", mapOf("n" to ui.beat + 1)))) }
        Body(trs(Tr("Nói theo 3 nhịp")), style = LKType.headlineMd)
        LKCard(fill = c.surfaceContainerHighest) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Box(Modifier.size(96.dp)) { LocalSpeakSlots.current.teacher("ama", ui.pose, Modifier.size(96.dp)) }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Body(trs(Tr("Cô {n}", mapOf("n" to "Ama"))).uppercase(), color = c.secondary, style = LKType.labelBadge)
                    Body(trs(ui.say), style = LKType.titlePill); if (ui.hint.isNotEmpty()) Muted(ui.hint)
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            BEATS.forEachIndexed { i, b -> Chip((if (i < ui.beat) "✓ " else "") + trs(Tr(b)), i == ui.beat, {}, Modifier.weight(1f)) }
        }
        LKCard(fill = c.surfaceContainerHighest) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Body(trs(Tr("Câu mẫu để nói")).uppercase(), color = c.onSurfaceVariant, style = LKType.labelBadge)
                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    val playLabel = trs(Tr("Nghe câu mẫu")); val slowLabel = trs(Tr("Nghe chậm"))   // icon-only as in the template: the existing translated labels are read out
                    GhostButton("🔊", a.play, Modifier.semantics(mergeDescendants = true) { contentDescription = playLabel }, ink = c.primary)
                    GhostButton("🐢", a.slow, Modifier.semantics(mergeDescendants = true) { contentDescription = slowLabel }, ink = c.primary) }
            }
            EnLtr { Flow { for (w in ui.words) Chip(w.text, w.tap, { if (w.tap) a.tapWord(w.index) }) } }   // English word order in RTL
        }
        ui.tip?.let { tp -> LKCard(fill = c.surfaceContainerHighest) {
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Body("💡 " + trs(Tr("Mẹo nhấn âm")).uppercase(), color = c.onSurfaceVariant, style = LKType.labelBadge); if (tp.ipa.isNotEmpty()) EnLtr { Muted(tp.ipa) } }
            EnLtr { RichBody(tp.note) } } }
        if (ui.blocked != null) MicBlocked(ui.blocked, null, "", a.alt)
        if (!ui.noMic) Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            MicButton(ui.rec, a.mic, trs(if (ui.rec) Tr("Đang nghe… chạm để dừng") else Tr("Chạm mic để nói")))
            Muted(trs(if (ui.rec) Tr("Cô đang nghe…") else if (ui.res != null) Tr("Chạm để nói lại") else Tr("Chạm mic để nói")))
        }
        ui.res?.let { r ->
            LKCard(fill = toneFill(if (r.pass) "good" else "again")) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { ScorePill(r.score, if (r.pass) "good" else "again"); StarsRow(r.stars, 3, trs(Tr("{n}/3 sao", mapOf("n" to r.stars)))) }
                Body(trs(r.verdict), style = LKType.titlePill); Muted(trs(r.sub))
            }
        }
    }
}

/** The state of the drill as the screen draws it (also what the snapshot tests feed the screen). */
fun drillUi(sit: Situation, x: SpeakDrill, rec: Boolean, blocked: Tr? = null): DrillUi {
    val ln = x.line; val res = x.res?.let { DrillResUi(it.score, it.pass, it.stars, it.verdict, it.sub) }
    return DrillUi(sit.title.split(Regex("\\s*[&,–-]\\s*")).first(), Tr("Câu {n}/{m}", mapOf("n" to x.i + 1, "m" to x.total)), x.total, x.i, x.pct, Tr("Cô {n}", mapOf("n" to "Ama")), x.say, ln.gloss, x.coachPose, x.b,
        x.shownWords().map { (w, tap, i) -> DrillWordUi(w, tap, i, res != null && i >= 0 && x.res?.words?.getOrNull(i)?.ok == false) }, x.noMic, rec, res, x.canNext, x.alt,
        x.tip?.let { DrillTipUi(it.ipa, it.note, it.hi) }, x.memory, ln.en, blocked)
}

class DrillVm(private val env: SpeakEnv, private val id: String, private val stage: String?) : ViewModel() {
    var ui by mutableStateOf<DrillUi?>(null); private set
    var gone by mutableStateOf<String?>(null); private set
    var done by mutableStateOf<Tr?>(null); private set
    private var d: SpeakDrill? = null; private var s: Situation? = null; private var rec = false; private var blocked: Tr? = null; private var tapAt = 0L; private var job: Job? = null
    init { viewModelScope.launch {
        if (!env.speakOn()) { gone = "skills"; return@launch }
        val sit = env.situation(id.ifEmpty { "cafe" }) ?: run { done = Tr("Không tải được – thử lại sau"); gone = "skills"; return@launch }
        s = sit; val st = env.kv(SpkProgress.KEY) as? JsonObject
        d = SpeakDrill(sit, st, stage, SpkProgress.noMic(st) || !env.canListen, env.random); publish()
    } }
    override fun onCleared() { env.stopListening(); env.stopSpeaking() }

    private fun publish() { val x = d ?: return; val sit = s ?: return; ui = drillUi(sit, x, rec, blocked) }
    private fun save() { val x = d ?: return; viewModelScope.launch { env.putKv(SpkProgress.KEY, x.progress ?: JsonObject(emptyMap())); x.paid?.let { env.pay(Reward(mapOf("spoken" to it.spoken), it.xp)) }; x.settled() } }

    fun play() { val x = d ?: return; env.speak(x.line.en, "en-US", 0.95f, "ama") }
    fun slow() { val x = d ?: return; env.speak(x.line.en, "en-US", 0.6f, "ama") }
    /** Starts / stops the recogniser (the screen has already got RECORD_AUDIO). */
    fun mic() { val x = d ?: return
        if (rec) { env.stopListening(); return }
        env.stopSpeaking(); rec = true; blocked = null; x.recording(); tapAt = System.currentTimeMillis(); publish()
        env.listen("en-US", {}, { alts -> finish(MicOutcome(SpeakScore.best(x.line.en, alts).heard, 0.0, null, System.currentTimeMillis() - tapAt)) }, { code -> finish(MicOutcome("", 0.0, code, 0)) }) }
    fun micDenied() { finish(MicOutcome("", 0.0, "not-allowed", 0)) }
    private fun finish(o: MicOutcome) { val x = d ?: return; rec = false; x.onMic(o, env.now); save(); publish() }
    fun tapWord(i: Int) { val x = d ?: return; val all = x.tap(i, env.now); save(); publish(); if (all) env.speak(x.line.en, "en-US", 0.95f, "ama") }
    fun next() { val x = d ?: return; x.next(); if (x.finished) { done = Tr("Xong cả {n} mẫu câu!", mapOf("n" to x.total)); return }; publish() }
    fun alt() { val x = d ?: return; val toggled = x.retry(); if (toggled != null) viewModelScope.launch { env.putKv(SpkProgress.KEY, x.progress ?: JsonObject(emptyMap())) }; publish() }
    class Factory(private val env: SpeakEnv, private val id: String, private val stage: String?) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = DrillVm(env, id, stage) as T }
}
