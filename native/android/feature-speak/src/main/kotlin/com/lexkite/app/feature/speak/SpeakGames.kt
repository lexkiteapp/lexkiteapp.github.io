package com.lexkite.app.feature.speak

import android.annotation.SuppressLint
import android.webkit.WebView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.core.skills.Clip
import com.lexkite.app.core.skills.Qx
import com.lexkite.app.core.speak.Reflex
import com.lexkite.app.core.speak.Rtype
import com.lexkite.app.core.speak.RtypeUnit
import com.lexkite.app.core.speak.SpeakScore
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.core.vocab.Mistakes
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.feature.skills.QuestionGroups
import com.lexkite.app.feature.vocab.Body
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
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject

// ---------------------------------------------------------------- #/reflex  (Stitch reflex-run / reflex-result)
class ReflexUi(val phase: String, val left: Int, val target: String, val colored: Reflex.Colored?, val ytId: String?, val ytStart: Int, val showNext: Boolean, val end: Reflex.End?, val note: Tr?, val empty: Boolean = false)
class ReflexActions(val start: () -> Unit = {}, val next: () -> Unit = {}, val skip: () -> Unit = {}, val exit: () -> Unit = {})

@SuppressLint("SetJavaScriptEnabled")
@Composable
fun ReflexScreen(ui: ReflexUi, a: ReflexActions) {
    val c = LocalLKColors.current
    if (ui.empty) { StudyPage(trs(Tr("Phản xạ 60 giây")), a.exit) { EmptyState("⚡", trs(Tr("Chưa có câu để luyện – hãy lưu vài câu từ YouTube hoặc quay lại sau khi kho giọng đọc cập nhật."))) }; return }
    val e = ui.end
    if (e != null) {
        StudyPage(trs(Tr("Phản xạ 60 giây")), a.exit, bottom = { LKPrimaryButton("↻ " + trs(Tr("Chơi lại")), a.start) }) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Body(trs(e.final[0]), style = LKType.headlineLg); Body(trs(e.final[1]), style = LKType.headlineMd); Body(trs(e.final[2]), style = LKType.titlePill)
                e.reward?.let { Tag("+${it.xp} XP", c.success) }
            }
            ui.colored?.let { co -> LKCard { Flow { for ((w, ok) in co.words) EnLtr { Tag((if (ok) "✓ " else "✗ ") + w, if (ok) c.success else c.error) } }; Muted(trs(Tr("Bạn nói")) + ": “" + co.shown + "” · " + co.pct + "%") } }
        }
        return
    }
    StudyFocus(ui.left / Reflex.SECONDS.toFloat(), trs(Tr("Phản xạ 60 giây")) + "  ·  " + ui.left, a.exit, bottom = {
        if (ui.phase == "idle") LKPrimaryButton("▶ " + trs(Tr("Bắt đầu")), a.start) else if (ui.showNext) LKPrimaryButton(trs(Tr("Câu tiếp")) + " →", a.next) else GhostButton(trs(Tr("Bỏ qua")) + " →", a.skip)
    }) {
        Muted(trs(Tr("Nghe một câu ngắn rồi nhại lại ngay – luyện phản xạ nghe nói như người bản xứ.")))
        LKCard(fill = c.surfaceContainerHighest) {
            if (ui.ytId != null) AndroidView(factory = { ctx -> WebView(ctx).apply { settings.javaScriptEnabled = true; settings.mediaPlaybackRequiresUserGesture = false
                val s = maxOf(0, ui.ytStart - 1); loadUrl("https://www.youtube-nocookie.com/embed/${ui.ytId}?start=$s&end=${s + 5}&autoplay=1&controls=0&modestbranding=1&rel=0&playsinline=1") } }, Modifier.fillMaxWidth().height(200.dp))
            when (ui.phase) {
                "listen" -> Body("🎧 " + trs(Tr("Nghe kỹ…")), style = LKType.titlePill)
                "speak" -> { Body("🎙️ " + trs(Tr("Nhại lại câu vừa nghe…")), style = LKType.titlePill) }
                "result" -> ui.colored?.let { co -> EnLtr { Flow { for ((w, ok) in co.words) Tag((if (ok) "✓ " else "✗ ") + w, if (ok) c.success else c.error) } }; Muted(trs(Tr("Bạn nói")) + ": “" + co.shown + "” · " + co.pct + "%") }
                else -> Muted(trs(Tr("Mẹo: lưu câu trong video YouTube bằng add-on Lexkite (bấm vào từ trong phụ đề) để luyện đúng những gì bạn đang xem.")))
            }
            ui.note?.let { Muted(trs(it)) }
        }
    }
}

class ReflexVm(private val env: SpeakEnv) : ViewModel() {
    var ui by mutableStateOf(ReflexUi("idle", Reflex.SECONDS, "", null, null, 0, false, null, null)); private set
    private var items = emptyList<Reflex.Item>(); private var i = 0; private var left = Reflex.SECONDS; private var score = 0; private var done = 0; private var miss = 0; private var accent = "en-GB"; private var tick: Job? = null; private var step: Job? = null; private var phase = "idle"
    private var colored: Reflex.Colored? = null; private var showNext = false; private var note: Tr? = null; private var current: Reflex.Item? = null
    init { viewModelScope.launch {
        accent = env.accent()
        val cards = env.word.cards().values; val contexts = cards.flatMap { c -> ((c["contexts"] as? kotlinx.serialization.json.JsonArray) ?: emptyList()).mapNotNull { x -> (x as? JsonObject)?.let { o -> ((o["text"] as? kotlinx.serialization.json.JsonPrimitive)?.content.orEmpty()) to ((o["source"] as? kotlinx.serialization.json.JsonPrimitive)?.content.orEmpty()) } } }
        val examples = env.library()?.topics?.flatMap { tp -> tp.words.mapNotNull { w -> (w["ex"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.takeIf { it.isNotEmpty() } } } ?: emptyList()
        val readings = env.skills()?.readings?.flatMap { r -> AudioLogic.split(r.text) } ?: emptyList()
        items = Reflex.pool(Reflex.sources(contexts, examples, readings, { true }, { AudioLogic.lineKey("bf_emma", it.trim()) }), env.random); publish() } }
    override fun onCleared() { tick?.cancel(); step?.cancel(); env.stopListening(); env.vocab.audio.stop() }
    private fun publish() { val cur = current
        ui = ReflexUi(phase, left, cur?.text ?: "", colored, if (phase == "listen" && cur?.kind == "yt") cur.id else null, cur?.t ?: 0, showNext, null, note, empty = items.isEmpty()) }
    fun start() { if (items.isEmpty()) return; i = 0; left = Reflex.SECONDS; score = 0; done = 0; miss = 0; tick?.cancel(); colored = null
        tick = viewModelScope.launch { while (left > 0) { delay(1000); left--; if (left <= 0) finish() else publish() } }; play() }
    private fun play() { step?.cancel(); env.stopListening(); showNext = false; colored = null; note = null; val cur = items[i % items.size]; current = cur; phase = "listen"; publish()
        step = viewModelScope.launch {
            if (cur.kind == "yt") { delay(Reflex.YT_MS); listen() }
            else when (env.vocab.audio.playKey(cur.key, 1f)) { Clip.PLAYED -> { miss = 0; listen() }
                else -> { if (++miss > Reflex.MAX_MISS) listen() else { i++; play() } } } } }
    private fun listen() { val cur = current ?: return; phase = "speak"; publish()
        env.listen(accent, {}, { alts -> val h = SpeakScore.best(cur.text, alts); val co = Reflex.colorize(cur.text, h.heard); score += co.pct; done++; colored = co; phase = "result"; showNext = true; publish() },
            { _ -> note = Tr("Không nghe rõ – thử lại hoặc bỏ qua."); showNext = true; phase = "result"; publish() }) }
    fun micDenied() { note = Tr("Không nghe rõ – thử lại hoặc bỏ qua."); showNext = true; phase = "result"; publish() }
    fun next() { i++; play() }
    fun skip() { env.stopListening(); step?.cancel(); i++; play() }
    private fun finish() { tick?.cancel(); step?.cancel(); env.stopListening(); env.vocab.audio.stop(); val e = Reflex.end(score, done); phase = "end"; ui = ReflexUi("end", 0, "", null, null, 0, false, e, null); viewModelScope.launch { env.pay(e.reward) } }
    class Factory(private val env: SpeakEnv) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = ReflexVm(env) as T }
}

// ---------------------------------------------------------------- #/rtype  (Stitch rtype-hub / -run / -result)
class RtypeHubUi(val cards: List<Rtype.Card>, val empty: Boolean)
class RtypeRunUi(val kind: Rtype.Kind, val i: Int, val n: Int, val unit: RtypeUnit?, val answers: Map<String, Any?>, val checked: Rtype.Checked?, val explain: Map<Int, String>, val mark: String?, val finished: Boolean)
class RtypeActions(val open: (String) -> Unit = {}, val answer: (String, Any?) -> Unit = { _, _ -> }, val check: () -> Unit = {}, val next: () -> Unit = {}, val locate: (Int) -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun RtypeHubScreen(ui: RtypeHubUi, a: RtypeActions) {
    val c = LocalLKColors.current
    StudyPage(trs(Tr("Luyện Reading theo dạng câu hỏi")), a.exit) {
        RichBody(trs(Tr("Tập trung 1 dạng câu hỏi tới khi tỉ lệ đúng đạt <b>70–80%</b> rồi mới chuyển dạng. Thứ tự khuyên dùng: Điền từ → TRUE/FALSE/NOT GIVEN → Trắc nghiệm → Nối.")))
        if (ui.empty) { EmptyState("🎯", trs(Tr("Đang cập nhật bài học…"))); return@StudyPage }
        for (k in ui.cards) LKCard(onClick = { a.open("rtype/${k.kind.id}") }, label = trs(k.kind.title)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { androidx.compose.material3.Text(k.kind.emoji, style = LKType.headlineMd.toCompose()); Tag(trs(k.chip), if (k.reached) c.success else c.secondary) }
            Body(trs(k.kind.title), style = LKType.titlePill); Muted(trs(k.size))
            Box(Modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(50)).background(c.cardHigh)) { Box(Modifier.fillMaxWidth(k.bar / 100f).height(8.dp).clip(RoundedCornerShape(50)).background(if (k.reached) c.success else c.primary)) }
            Muted((if (k.reached) "✅ " else "") + trs(k.note))
        }
    }
}

@Composable
fun RtypeRunScreen(ui: RtypeRunUi, a: RtypeActions) {
    val c = LocalLKColors.current; val u = ui.unit; val ck = ui.checked
    if (ui.finished || u == null) { StudyPage(trs(ui.kind.title), a.exit, bottom = { LKPrimaryButton(trs(Tr("Chọn dạng khác")), { a.open("rtype") }) }) { EmptyState("🎉", trs(Rtype.finished(ui.kind))) }; return }
    StudyFocus(((ui.i + if (ck != null) 1 else 0) / ui.n.toFloat()), ui.kind.emoji + " " + trs(ui.kind.title), a.exit, bottom = {
        if (ck == null) LKPrimaryButton(trs(Tr("Kiểm tra")), a.check) else LKPrimaryButton(trs(Tr("Nhóm tiếp")) + " →", a.next)
    }) {
        Tag(trs(Rtype.position(ui.i, ui.n)))
        LKCard(fill = c.surfaceContainerHighest) { RichBody("💡 " + trs(ui.kind.tip), style = LKType.bodySm) }
        LKCard {
            EnLtr { Body(u.title, style = LKType.titlePill) }
            for ((k, text) in u.paras) EnLtr { androidx.compose.material3.Text(highlighted(k, text, ui.mark), color = c.onSurface, style = LKType.bodyMd.toCompose()) }
        }
        QuestionGroups(u.part, ui.answers, ck?.res, false, a.answer)
        if (ck != null) {
            LKCard(Modifier.testTag("speak-rtype-result"), fill = toneFill(if (ck.ok) "good" else "again")) { RichBody(trs(ck.result)) }
            for ((n, r) in ck.res) { if (r.cue.isNotEmpty()) GhostButton("📍 " + trs(Tr("Xem vị trí trong bài")) + " (${n})", { a.locate(n) }); ui.explain[n]?.let { Muted("💡 $it") } }
        }
    }
}
@Composable
private fun highlighted(k: String, text: String, mark: String?): androidx.compose.ui.text.AnnotatedString { val c = LocalLKColors.current
    return buildAnnotatedString { withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append("$k  ") }
        val i = if (mark.isNullOrEmpty()) -1 else text.indexOf(mark)
        if (i < 0) append(text) else { append(text.substring(0, i)); withStyle(SpanStyle(background = c.secondaryContainer, fontWeight = FontWeight.Bold)) { append(mark) }; append(text.substring(i + mark!!.length)) } } }

class RtypeHubVm(private val env: SpeakEnv) : ViewModel() {
    var ui by mutableStateOf<RtypeHubUi?>(null); private set
    init { viewModelScope.launch { val p = env.readTests(); ui = if (p == null || p.units.isEmpty()) RtypeHubUi(emptyList(), true) else RtypeHubUi(Rtype.hub(p, env.vocab.load().game), false) } }
    class Factory(private val env: SpeakEnv) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = RtypeHubVm(env) as T }
}

class RtypeRunVm(private val env: SpeakEnv, private val kindId: String) : ViewModel() {
    var ui by mutableStateOf<RtypeRunUi?>(null); private set
    var unknown by mutableStateOf(false); private set
    private var pack: Rtype.Pack? = null; private var list = emptyList<RtypeUnit>(); private var i = 0; private var answers = emptyMap<String, Any?>(); private var checked: Rtype.Checked? = null; private var mark: String? = null; private lateinit var kind: Rtype.Kind
    init { viewModelScope.launch { val k = Rtype.kind(kindId) ?: run { unknown = true; return@launch }; kind = k; val p = env.readTests(); pack = p; list = p?.of(k.id) ?: emptyList(); publish() } }
    private fun publish() { val p = pack; val u = list.getOrNull(i)
        val exp = if (u != null && p != null && checked != null) checked!!.res.keys.mapNotNull { n -> Rtype.explanation(p, u, n)?.let { x -> (x["why"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.let { w -> n to w } } }.toMap() else emptyMap()
        ui = RtypeRunUi(kind, i, list.size, u, answers, checked, exp, mark, u == null) }
    fun answer(k: String, v: Any?) { if (checked != null) return; answers = answers + (k to v); publish() }
    fun check() { val u = list.getOrNull(i) ?: return; val p = pack ?: return; if (checked != null) return
        viewModelScope.launch { val ld = env.vocab.load(); val ck = Rtype.check(u, answers, ld.game, ld.mistakes, p.explain, env.now, env.vocab.tx)
            env.vocab.saveMistakes(ck.mistakes); env.vocab.write(game = com.lexkite.app.feature.vocab.StudyReward.track(ck.game, ck.reward.add.filterValues { it != 0 }, ck.reward.xp, env.now)); checked = ck; publish() } }
    fun next() { i++; answers = emptyMap(); checked = null; mark = null; publish() }
    fun locate(n: Int) { mark = checked?.res?.get(n)?.cue; publish() }
    class Factory(private val env: SpeakEnv, private val kind: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = RtypeRunVm(env, kind) as T }
}
