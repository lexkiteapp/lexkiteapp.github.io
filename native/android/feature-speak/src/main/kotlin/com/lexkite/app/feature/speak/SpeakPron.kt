package com.lexkite.app.feature.speak

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.speak.Contrast
import com.lexkite.app.core.speak.PairItem
import com.lexkite.app.core.speak.PairSession
import com.lexkite.app.core.speak.PlanWord
import com.lexkite.app.core.speak.PronCoach
import com.lexkite.app.core.speak.PronLesson
import com.lexkite.app.core.speak.PronPage
import com.lexkite.app.core.speak.PronPairs
import com.lexkite.app.core.speak.RecError
import com.lexkite.app.core.speak.SpeakPack
import com.lexkite.app.core.speak.SpeakScore
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKColors
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
import com.lexkite.app.feature.vocab.RichBody
import com.lexkite.app.feature.vocab.StudyFocus
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.Tag
import com.lexkite.app.feature.vocab.t
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

private fun Modifier.dashed(color: androidx.compose.ui.graphics.Color): Modifier = drawBehind {
    drawRoundRect(color, Offset(1f, 1f), Size(size.width - 2f, size.height - 2f), CornerRadius(16.dp.toPx()), style = Stroke(2.dp.toPx(), pathEffect = PathEffect.dashPathEffect(floatArrayOf(14f, 10f))))
}

// ---------------------------------------------------------------- #/pron hub  (Stitch pron-hub)
class PronHubUi(val hub: PronPage.Hub?)
class PronHubActions(val open: (String) -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun PronHubScreen(ui: PronHubUi, done: Map<String, Int>, a: PronHubActions) {
    val c = LocalLKColors.current; val h = ui.hub
    StudyPage(trs(Tr("Thư viện phát âm")), a.exit) {
        if (h == null || h.groups.isEmpty()) { Muted(trs(Tr("Luyện như ELSA: học khẩu hình từng âm IPA, nghe – phân biệt cặp từ dễ nhầm, nói và được chấm điểm, rồi sửa các lỗi người Việt hay mắc."))); EmptyState("🔤", trs(Tr("Đang cập nhật bài học…"))); return@StudyPage }
        LKCard {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Box(Modifier.size(72.dp)) { LocalSpeakSlots.current.teacher("ama", "point", Modifier.size(72.dp)) }
                Muted(trs(Tr("Luyện như ELSA: học khẩu hình từng âm IPA, nghe – phân biệt cặp từ dễ nhầm, nói và được chấm điểm, rồi sửa các lỗi người Việt hay mắc.")), Modifier.weight(1f))
            }
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Box(Modifier.size(64.dp).semantics { contentDescription = h.ringLabel }, contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(progress = { (h.ring / 100.0).toFloat() }, Modifier.size(64.dp), color = c.success, trackColor = c.surfaceContainerHighest, strokeWidth = 7.dp)
                    Text(h.ringLabel, color = c.onSurface, style = LKType.labelMetric.toCompose())
                }
                Muted(trs(Tr("Ô viền xám nhạt = phụ âm vô thanh · Mỗi bài: khẩu hình → nghe mẫu → phân biệt cặp từ → nói & chấm điểm.")), Modifier.weight(1f))
            }
        }
        for (g in h.groups) {
            SectionHeader(g.g.emoji + " " + trs(Tr(g.g.name)))
            Muted(trs(Tr(g.g.desc)))
            if (g.g.chart) for (row in g.lessons.chunked(4)) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                for (l in row) {
                    val on = done.containsKey(l.id); val unv = l.mouth?.voiced == false
                    Column(Modifier.weight(1f).heightIn(min = 72.dp).clip(RoundedCornerShape(16.dp)).background(if (on) c.secondaryContainer else c.card).let { if (unv) it.dashed(c.outline) else it.border(1.dp, c.outlineVariant, RoundedCornerShape(16.dp)) }
                        .tactile({ a.open(l.id) }, l.title), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                        EnLtr { Text(l.ipa.replace("/", ""), color = c.onSurface, style = LKType.headlineSm.toCompose()) }
                        EnLtr { Text((if (on) "✓ " else "") + (l.words.firstOrNull()?.w ?: ""), color = c.onSurfaceVariant, style = LKType.labelBadge.toCompose(), maxLines = 1) }
                    }
                }
                for (k in row.size until 4) androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))
            }
            else Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { for (l in g.lessons) LKCard(onClick = { a.open(l.id) }, label = l.title) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(48.dp).clip(androidx.compose.foundation.shape.CircleShape).background(c.surfaceContainerHighest), contentAlignment = Alignment.Center) { Text(l.emoji, style = LKType.headlineSm.toCompose()) }
                    Column(Modifier.weight(1f)) { Body(l.title, style = LKType.titlePill); Muted(l.how.take(90) + if (l.how.length > 90) "…" else "") }
                    if (done[l.id] != null) Tag("✓ ${done[l.id]}%", c.success) else Text("›", color = c.onSurfaceVariant, style = LKType.headlineSm.toCompose())
                } } }
        }
    }
}

// ---------------------------------------------------------------- #/pron/<id>  (Stitch pron-sound)
/** The mouth figure: ellipses of the outer lip, inner mouth and tongue (numbers of the web SVG), drawn with the Kit tokens of the current theme (legible in light and dark). */
@Composable
fun MouthFigure(m: PronPage.Mouth, modifier: Modifier = Modifier) {
    val l = LocalLKColors.current; val cap = m.caption.map { trs(it) }.joinToString(" · ")
    Column(modifier, horizontalAlignment = Alignment.CenterHorizontally) {
        Canvas(Modifier.size(width = 200.dp, height = 160.dp).semantics { contentDescription = cap }) {
            val k = size.width / 200f
            drawCircle(l.surfaceContainerHighest, 74f * k, Offset(100f * k, 80f * k))
            fun oval(e: List<Double>, color: androidx.compose.ui.graphics.Color) = drawOval(color, Offset(((e[0] - e[2]) * k).toFloat(), ((e[1] - e[3]) * k).toFloat()), Size((e[2] * 2 * k).toFloat(), (e[3] * 2 * k).toFloat()))
            oval(m.outerLip, l.error); oval(m.innerMouth, l.errorContainer); oval(m.tongue, l.tertiary)
        }
        Muted(cap)
    }
}

class WordScoreUi(val score: Int?, val recording: Boolean = false)
class QuizUi(val picks: Map<Int, Int> = emptyMap(), val done: Boolean = false)
class PronSoundUi(
    val l: PronLesson, val prev: PronLesson?, val next: PronLesson?, val mouth: PronPage.Mouth?, val chips: List<Tr>, val scores: Map<Int, Int>, val sentScores: Map<Int, Int>, val recordingWord: Int?, val recordingSentence: Int?,
    val heardHint: String, val micError: Tr?, val hasSay: Boolean, val hasRhythm: Boolean, val quiz: QuizUi, val best: Int?, val mode: String = "lesson",
)
class PronSoundActions(
    val hear: (String, Boolean) -> Unit = { _, _ -> }, val wordMic: (Int) -> Unit = {}, val sentenceMic: (Int) -> Unit = {}, val hearText: (String) -> Unit = {}, val startPairs: () -> Unit = {}, val startSay: () -> Unit = {},
    val startRhythm: () -> Unit = {}, val pickQuiz: (Int, Int) -> Unit = { _, _ -> }, val open: (String) -> Unit = {}, val exit: () -> Unit = {},
)

@Composable
fun PronSoundScreen(ui: PronSoundUi, a: PronSoundActions) {
    val c = LocalLKColors.current; val l = ui.l; val card = RoundedCornerShape(16.dp)
    StudyPage(l.title, a.exit) {
        LKCard(fill = c.secondaryContainer) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.Top) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { Flow { for (x in ui.chips) Tag(trs(x), c.onSurface) }; Body(l.how, color = c.onSecondaryContainer) }
                Box(Modifier.clip(card).background(c.card).padding(horizontal = LKSpacing.spaceSm, vertical = LKSpacing.spaceXs)) { EnLtr { Text(l.ipa, color = c.onSurface, style = LKType.headlineLg.toCompose()) } }
            }
        }
        TeacherCard("ama", "point", "", "💡 " + l.tip)
        LKCard { Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { if (ui.mouth != null) MouthFigure(ui.mouth) else Text(l.emoji, style = LKType.headlineLg.toCompose()) } }
        if (l.rules.isNotEmpty()) LKCard { Body("📋 " + trs(Tr("Quy tắc")), style = LKType.titlePill)
            for (r in l.rules) Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) { Body(r.label, style = LKType.labelMetric); Muted(r.whenText); Flow { for (w in r.ex) GhostButton("🔊 $w", { a.hearText(w) }) } } }
        LKCard(fill = c.errorContainer) { Body("🇻🇳 " + trs(Tr("Lỗi hay gặp")), style = LKType.titlePill, color = c.onErrorContainer); Body(l.vn, color = c.onErrorContainer) }
        LKCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Body("🗣️ " + trs(Tr("Luyện từ ({n})", mapOf("n" to l.words.size))), style = LKType.titlePill); ui.best?.let { Tag("✓ $it%", c.success) } }
            Muted(trs(Tr("Bấm 🔊 nghe mẫu → 🎙️ nói → xem điểm")))
            l.words.forEachIndexed { k, w ->
                Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
                    NumBadge("${k + 1}")
                    Column(Modifier.weight(1f)) { EnLtr { Body(w.w, style = LKType.titlePill) }; EnLtr { Muted(w.ipa + if (w.note.isNotEmpty()) " · ${w.note}" else "") } }
                    GhostButton("🔊", { a.hear(w.w, false) }); GhostButton("🐢", { a.hear(w.w, true) })
                    if (ui.recordingWord == k) Tag("🔴") else GhostButton("🎙️", { a.wordMic(k) })
                    ui.scores[k]?.let { ScorePill(it, PronPage.scoreColor(it)) }
                }
            }
            if (ui.heardHint.isNotEmpty()) Muted(trs(Tr("Máy nghe được: “{heard}”", mapOf("heard" to ui.heardHint))))
            ui.micError?.let { RichBody("⚠️ " + trs(it), color = c.error) }
        }
        if (l.pairs.isNotEmpty()) LKCard {
            Body("👂 " + trs(Tr("Nghe & phân biệt cặp từ")), style = LKType.titlePill); Muted(trs(Tr("Nghe một từ trong cặp rồi chọn đúng từ bạn nghe được. Luyện tai trước, miệng sẽ chuẩn theo.")))
            val first = l.pairs.first()
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { for (w in listOf(first.first, first.second)) Box(Modifier.weight(1f).clip(card).background(c.surfaceContainerHighest).padding(LKSpacing.spaceSm), contentAlignment = Alignment.Center) { EnLtr { Body(w, style = LKType.headlineSm) } } }
            if (l.pairs.size > 1) Flow { for ((x, y) in l.pairs.drop(1)) EnLtr { Tag("$x ↔ $y") } }
            LKPrimaryButton("▶️ " + trs(Tr("Bắt đầu ({n} lượt)", mapOf("n" to PronPage.PAIR_ROUNDS))), a.startPairs)
        }
        if (ui.hasSay) LKCard { Body("🎙️ " + trs(Tr("Luyện nói cặp từ")), style = LKType.titlePill); Muted(trs(Tr("Nhìn từ, nghe mẫu rồi bấm micro và nói. Máy sẽ cho biết bạn nói đúng từ, hay nói thành từ còn lại trong cặp."))); LKPrimaryButton(trs(Tr("Bắt đầu nói ({n} từ)", mapOf("n" to PairSession.N))), a.startSay) }
        if (ui.hasRhythm) LKCard { Body("🎵 " + trs(Tr("Nhịp câu & shadowing")), style = LKType.titlePill); Muted(trs(Tr("Từ in to được nhấn; từ nhỏ đọc nhanh, nhẹ (dạng yếu). Nghe mẫu, rồi bấm Shadowing và nói theo ngay."))); LKPrimaryButton(trs(Tr("Shadowing")), a.startRhythm) }
        if (l.sentences.isNotEmpty()) LKCard { Body("📢 " + trs(Tr("Luyện câu")), style = LKType.titlePill)
            l.sentences.forEachIndexed { k, s -> Row(Modifier.fillMaxWidth().heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically) {
                EnLtr { Body(s, Modifier.weight(1f)) }; GhostButton("🔊", { a.hearText(PronPage.cleanSentence(s)) })
                if (ui.recordingSentence == k) Tag("🔴") else GhostButton("🎙️", { a.sentenceMic(k) }); ui.sentScores[k]?.let { ScorePill(it, PronPage.scoreColor(it)) } } } }
        if (l.quiz.isNotEmpty()) LKCard { Body("✏️ " + trs(Tr("Kiểm tra nhanh")), style = LKType.titlePill)
            l.quiz.forEachIndexed { qi, q -> Body("${qi + 1}. ${q.q}", style = LKType.labelMetric); val pick = ui.quiz.picks[qi]
                q.options.forEachIndexed { j, o -> com.lexkite.app.feature.vocab.ChoiceCard(com.lexkite.app.feature.vocab.LETTERS[j.coerceAtMost(5)], o, if (pick == null) com.lexkite.app.feature.vocab.Pick.NONE else if (j == q.answer) com.lexkite.app.feature.vocab.Pick.RIGHT else if (pick == j) com.lexkite.app.feature.vocab.Pick.WRONG else com.lexkite.app.feature.vocab.Pick.DIM, if (pick == null) ({ a.pickQuiz(qi, j) }) else null, ltr = true) }
                if (pick != null) Muted((if (pick == q.answer) "✅ " else "❌ ") + q.explain) } }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            if (ui.prev != null) GhostButton("← " + ui.prev.ipa, { a.open(ui.prev.id) }) else Box(Modifier)
            if (ui.next != null) GhostButton(ui.next.ipa + " →", { a.open(ui.next.id) }) else GhostButton(trs(Tr("Về thư viện")), { a.open("") })
        }
    }
}

// ---------------------------------------------------------------- listening pair game  (Stitch pron-pairs, focus screen)
class PairsUi(val n: Int, val r: Int, val options: List<String>, val picked: Int?, val answer: Int, val end: PronPage.PairEnd?, val selected: Int? = null)
class PairsActions(val replay: () -> Unit = {}, val select: (Int) -> Unit = {}, val check: () -> Unit = {}, val again: () -> Unit = {}, val exit: () -> Unit = {})
@Composable
fun PronPairsScreen(ui: PairsUi, title: String, a: PairsActions) {
    val c = LocalLKColors.current
    StudyFocus(ui.r.coerceAtMost(ui.n) / ui.n.toFloat(), title, a.exit, bottom = {
        if (ui.end != null) LKPrimaryButton("↺ " + trs(Tr("Chơi lại")), a.again) else LKPrimaryButton(trs(Tr("Kiểm tra")), a.check, enabled = ui.picked == null && ui.selected != null)
    }) {
        val e = ui.end
        if (e != null) { LKCard(fill = toneFill(if (e.good) "good" else "again")) { Body(trs(e.final[0]) + " – " + trs(e.final[1]), style = LKType.titlePill); Muted("+${e.reward.xp} XP") }; return@StudyFocus }
        LKCard {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                PlayDisc(a.replay, trs(Tr("Nghe lại ({i}/{n})", mapOf("i" to ui.r + 1, "n" to ui.n))))
                Body(trs(Tr("Nghe lại ({i}/{n})", mapOf("i" to ui.r + 1, "n" to ui.n))), style = LKType.titlePill, align = androidx.compose.ui.text.style.TextAlign.Center)
                Muted(trs(Tr("Nghe một từ trong cặp rồi chọn đúng từ bạn nghe được. Luyện tai trước, miệng sẽ chuẩn theo.")), align = androidx.compose.ui.text.style.TextAlign.Center)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) { ui.options.forEachIndexed { k, w ->
            val mark = if (ui.picked == null) null else if (k == ui.answer) true else if (k == ui.picked) false else null
            val chosen = ui.picked == null && ui.selected == k
            Column(Modifier.weight(1f).heightIn(min = 96.dp).clip(RoundedCornerShape(20.dp)).background(when (mark) { true -> c.surfaceContainerHighest; false -> c.errorContainer; null -> if (chosen) c.secondaryContainer else c.card }).border(2.dp, when (mark) { true -> c.success; false -> c.error; null -> if (chosen) c.secondary else c.outlineVariant }, RoundedCornerShape(20.dp))
                .tactile({ if (ui.picked == null) a.select(k) }, w).padding(LKSpacing.spaceSm), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs, Alignment.CenterVertically)) {
                NumBadge(com.lexkite.app.feature.vocab.LETTERS[k.coerceAtMost(5)])
                EnLtr { Text(w + if (mark != null) (if (mark) " ✓" else " ✗") else "", color = c.onSurface, style = LKType.headlineSm.toCompose()) } } } }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)) { for (k in 0 until ui.n) Box(Modifier.size(10.dp).clip(androidx.compose.foundation.shape.CircleShape).background(if (k < ui.r) c.secondary else if (k == ui.r) c.primary else c.surfaceContainerHighest)) }
        TeacherCard("ama", "point", "", trs(Tr("Nghe một từ trong cặp rồi chọn đúng từ bạn nghe được. Luyện tai trước, miệng sẽ chuẩn theo.")))
    }
}

// ---------------------------------------------------------------- "Nói thử" pair speaking  (Stitch pron-result)
class SaySessionUi(
    val index: String, val progress: Float, val label: Tr, val retry: Boolean, val target: String, val ipa: String, val other: String, val listening: Boolean, val step: PairSession.Step?, val blocked: Tr?,
    val final: PairSession.Final?, val chips: List<Triple<Tr, Int, Int>> = emptyList(), val error: Tr? = null,
)
class SayActions(val start: () -> Unit = {}, val hear: (Boolean) -> Unit = {}, val mic: () -> Unit = {}, val next: () -> Unit = {}, val fallback: () -> Unit = {}, val exit: () -> Unit = {})
@Composable
fun PronSayScreen(ui: SaySessionUi, title: String, a: SayActions) {
    val c = LocalLKColors.current
    StudyPage(title, a.exit, bottom = {
        if (ui.final != null) LKPrimaryButton("↺ " + trs(Tr("Luyện lại")), a.start) else if (ui.step?.next == true) LKPrimaryButton(trs(Tr("Từ tiếp theo")), a.next)
    }) {
        val f = ui.final
        if (ui.blocked != null) { MicBlocked(ui.blocked, a.fallback, "🎧 " + trs(Tr("Luyện nghe")), a.start); return@StudyPage }
        if (f != null) {
            LKCard(fill = toneFill(if (f.pct >= 80) "good" else "again")) { Body(trs(f.score), style = LKType.titlePill); Muted("+${f.reward.xp} XP") }
            Flow { for ((label, ok, n) in ui.chips) Tag(trs(label) + " $ok/$n", if (ok == n) c.success else c.secondary) }
            return@StudyPage
        }
        val st = ui.step
        TeacherCard("ama", if (st?.outcome == "good") "cheer" else "point", trs(ui.label) + if (ui.retry) " · " + trs(Tr("Thử lại")) else "", st?.tip?.let { trs(it) } ?: trs(Tr("Nhìn từ, nghe mẫu rồi bấm micro và nói. Máy sẽ cho biết bạn nói đúng từ, hay nói thành từ còn lại trong cặp.")), tag = ui.index)
        LKCard {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                EnLtr { Text(ui.target, color = c.onSurface, style = LKType.headlineLg.toCompose()) }; EnLtr { Muted(ui.ipa) }; EnLtr { Muted("≠ ${ui.other}") }
                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { GhostButton("🔊 " + trs(Tr("Nghe mẫu")), { a.hear(false) }); GhostButton("🐢 " + trs(Tr("Nghe chậm")), { a.hear(true) }) }
            }
        }
        LKCard(fill = if (st?.outcome == "other") c.errorContainer else if (st?.outcome == "good") c.surfaceContainerHighest else c.card) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                MicButton(ui.listening, a.mic, trs(Tr("Bấm để nói")), enabled = ui.step?.next != true)
                Body(if (ui.listening) trs(Tr("Đang nghe…")) else st?.let { trs(it.state) } ?: trs(Tr("Bấm để nói")), color = if (st?.outcome == "good") c.success else if (st?.outcome == "other") c.onErrorContainer else c.onSurface, style = LKType.titlePill, align = androidx.compose.ui.text.style.TextAlign.Center)
                if (st?.retryHeard == true) Muted(trs(Tr("Máy nghe được: “{heard}”", mapOf("heard" to st.heard))))
                ui.error?.let { RichBody(trs(it), color = c.error) }
            }
        }
    }
}

// ---------------------------------------------------------------- rhythm & shadowing  (Stitch pron-rhythm)
class RhythmUi(val k: Int, val sentences: List<String>, val plan: List<PlanWord>, val accent: String, val done: Map<Int, Int>, val phase: String, val attempt: PronCoach.Attempt?, val next: List<PronPairs.Next>, val titles: Map<String, String>, val error: Tr?)
class RhythmActions(val pick: (Int) -> Unit = {}, val hear: (Boolean) -> Unit = {}, val shadow: () -> Unit = {}, val open: (String) -> Unit = {}, val go: (Int) -> Unit = {}, val exit: () -> Unit = {})
@Composable
fun PronRhythmScreen(ui: RhythmUi, title: String, band: (String) -> Tr, a: RhythmActions) {
    val c = LocalLKColors.current
    StudyPage(title, a.exit) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Body("🎵 " + trs(Tr("Nhịp câu & shadowing")), style = LKType.titlePill); Tag(trs(if (ui.accent == "en-US") Tr("Giọng Mỹ") else Tr("Giọng Anh"))) }
        Muted(trs(Tr("Từ in to được nhấn; từ nhỏ đọc nhanh, nhẹ (dạng yếu). Nghe mẫu, rồi bấm Shadowing và nói theo ngay.")))
        LKCard { Flow { ui.sentences.forEachIndexed { i, _ -> Chip(if ((ui.done[i] ?: 0) >= 85) "✓" else "${i + 1}", i == ui.k, { a.pick(i) }) } } }
        LKCard { EnLtr { Flow { for (p in ui.plan) Column(horizontalAlignment = Alignment.CenterHorizontally) {
            if (p.stress) Text(p.w, color = c.onSurface, style = LKType.headlineSm.toCompose().copy(fontWeight = FontWeight.ExtraBold), modifier = Modifier.drawBehind { drawLine(c.secondary, Offset(0f, 0f), Offset(size.width, 0f), 6f) }.padding(top = 4.dp))
            else { Text(p.w, color = c.onSurfaceVariant, style = LKType.bodySm.toCompose()); if (p.weak.isNotEmpty()) Text(p.weak, color = c.secondary, style = LKType.labelBadge.toCompose()) } } } } }
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { GhostButton("🔊 " + trs(Tr("Nghe mẫu")), { a.hear(false) }); GhostButton("🐢 " + trs(Tr("Nghe chậm")), { a.hear(true) }) }
        LKPrimaryButton(if (ui.phase == "rec") trs(Tr("Nói theo ngay bây giờ…")) else "🎙️ " + trs(Tr("Shadowing")), a.shadow, enabled = ui.phase != "rec")
        if (ui.phase == "hear") Muted(trs(Tr("Nghe mẫu…")))
        ui.error?.let { RichBody("⚠️ " + trs(it), color = c.error) }
        ui.attempt?.let { at ->
            LKCard(fill = toneFill(if (at.band == "again") "again" else "good")) {
                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { ScorePill(at.score, if (at.band == "great") "good" else if (at.band == "close") "medium" else "again"); Body(trs(band(at.band)), Modifier.weight(1f)) }
                EnLtr { Muted(trs(Tr("Máy nghe được")) + ": “" + at.heard.ifEmpty { "…" } + "”") }; at.tip?.let { Muted("💡 " + trs(it)) }
            }
            Muted(trs(Tr("Luyện tiếp:")))
            Flow { for (s in ui.next) if (s.kind == "rhythm") GhostButton(trs(Tr("Câu {n}", mapOf("n" to s.k + 1))), { a.go(s.k) }) else GhostButton(ui.titles[s.id.ifEmpty { s.skill }] ?: trs(Tr("Bài liên quan")), { a.open(s.skill.ifEmpty { s.id }) }) }
        }
    }
}

// ---------------------------------------------------------------- view models
class PronHubVm(private val env: SpeakEnv) : ViewModel() {
    var ui by mutableStateOf(PronHubUi(null)); private set
    var done by mutableStateOf<Map<String, Int>>(emptyMap()); private set
    init { viewModelScope.launch { val p = env.pack() ?: return@launch; val d = PronPage.doneOf(env.vocab.load().game); done = d; ui = PronHubUi(PronPage.hub(p, d)) } }
    class Factory(private val env: SpeakEnv) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = PronHubVm(env) as T }
}

class PronSoundVm(private val env: SpeakEnv, private val id: String) : ViewModel() {
    var ui by mutableStateOf<PronSoundUi?>(null); private set
    var pairs by mutableStateOf<PairsUi?>(null); private set
    var say by mutableStateOf<SaySessionUi?>(null); private set
    var rhythm by mutableStateOf<RhythmUi?>(null); private set
    var missing by mutableStateOf(false); private set
    private lateinit var pack: SpeakPack; private lateinit var lesson: PronLesson; private lateinit var P: PronPairs; private lateinit var coach: PronCoach
    private var accent = "en-GB"; private var scores = emptyMap<Int, Int>(); private var sent = emptyMap<Int, Int>(); private var recW: Int? = null; private var recS: Int? = null; private var heardHint = ""; private var micErr: Tr? = null
    private var quiz = QuizUi(); private var best: Int? = null; private var rounds = emptyList<PronPage.Round>(); private var r = 0; private var ok = 0; private var session: PairSession? = null; private var stats: MutableMap<String, com.lexkite.app.core.speak.ContrastStat> = LinkedHashMap()
    private var rk = 0; private var rphase = "idle"; private var rattempt: PronCoach.Attempt? = null; private var rerr: Tr? = null; private var rhy = emptyMap<Int, Int>(); private var sayListening = false; private var sayStep: PairSession.Step? = null; private var sayBlocked: Tr? = null; private var sayErr: Tr? = null

    init { viewModelScope.launch {
        pack = env.pack() ?: run { missing = true; return@launch }; lesson = pack.lesson(id) ?: run { missing = true; return@launch }
        P = PronPairs(pack); coach = PronCoach(pack); accent = env.accent(); stats = P.load(env.kv(PronPairs_KEY)); best = PronPage.doneOf(env.vocab.load().game)[id]; publish()
        delay(300); env.speak(lesson.words.firstOrNull()?.w ?: return@launch, accent)
    } }
    override fun onCleared() { env.stopListening(); env.stopSpeaking() }
    private fun publish() { val (pv, nx) = PronPage.neighbours(pack, id)
        ui = PronSoundUi(lesson, pv, nx, PronPage.mouth(lesson.mouth), PronPage.chips(lesson), scores, sent, recW, recS, heardHint, micErr, P.forSkill(id).isNotEmpty(), id in com.lexkite.app.core.speak.PronGroups.RHYTHM, quiz, best) }

    fun hear(w: String, slow: Boolean) { env.speak(w, accent, if (slow) 0.55f else 0.95f) }
    fun hearText(s: String) { env.speak(s, accent, 0.95f) }
    fun micDenied() { recW = null; recS = null; micErr = recText("not-allowed"); publish() }
    fun wordMic(k: Int) { if (recW != null || recS != null) { env.stopListening(); return }; recW = k; micErr = null; publish(); val target = lesson.words[k].w
        env.listen(accent, {}, { alts -> val b = SpeakScore.best(target, alts); recW = null; heardHint = b.heard; scores = PronPage.bestOf(scores, k, b.score); micErr = null; publish(); afterWord(b.score) }, { code -> recW = null; micErr = recText(code); publish() }) }
    private fun afterWord(score: Int) { viewModelScope.launch { env.pay(PronPage.wordReward(score)); val pct = PronPage.lessonBest(scores, lesson.words.size) ?: return@launch
        env.writeGame({ g -> PronPage.saveBest(g, id, pct) }); best = maxOf(best ?: 0, pct); publish() } }
    fun sentenceMic(k: Int) { if (recW != null || recS != null) { env.stopListening(); return }; recS = k; micErr = null; publish(); val target = PronPage.cleanSentence(lesson.sentences[k])
        env.listen(accent, {}, { alts -> val b = SpeakScore.best(target, alts); recS = null; heardHint = b.heard; sent = sent + (k to maxOf(sent[k] ?: 0, b.score)); publish(); viewModelScope.launch { env.pay(PronPage.sentenceReward(b.score)) } }, { code -> recS = null; micErr = recText(code); publish() }) }

    // ---- quiz ----
    fun pickQuiz(q: Int, v: Int) { if (quiz.picks.containsKey(q)) return; quiz = QuizUi(quiz.picks + (q to v)); publish()
        if (quiz.picks.size == lesson.quiz.size) { val right = quiz.picks.count { (i, x) -> lesson.quiz[i].answer == x }; val e = PronPage.quizEnd(right, lesson.quiz.size)
            viewModelScope.launch { env.writeGame({ g -> PronPage.saveBest(g, id, e.pct) }, e.reward); best = maxOf(best ?: 0, e.pct); publish() } } }

    // ---- listening pair game ----
    fun startPairs() { rounds = PronPage.rounds(lesson.pairs.map { it.first to it.second }, env.random); r = 0; ok = 0; showRound(); playRound() }
    private fun showRound() { pairs = if (r >= rounds.size) PairsUi(rounds.size, r, emptyList(), null, 0, PronPage.pairEnd(ok, rounds.size)) else PairsUi(rounds.size, r, rounds[r].options, null, rounds[r].answer, null) }
    fun playRound() { if (r < rounds.size) env.speak(rounds[r].spoken, accent, 0.85f) }
    fun select(k: Int) { val cur = pairs ?: return; if (cur.picked != null || cur.end != null) return; pairs = PairsUi(cur.n, cur.r, cur.options, null, cur.answer, null, k) }
    fun check() { val k = pairs?.selected ?: return; pick(k) }
    fun pick(k: Int) { val cur = pairs ?: return; if (cur.picked != null || r >= rounds.size) return; val right = k == rounds[r].answer; if (right) ok++
        pairs = PairsUi(cur.n, r, cur.options, k, cur.answer, null)
        viewModelScope.launch { delay(900); r++; showRound(); val e = pairs?.end; if (e != null) env.pay(e.reward) else playRound() } }
    fun closePairs() { pairs = null; env.stopSpeaking() }

    // ---- "Nói thử" ----
    private var sayFinal: PairSession.Final? = null
    private fun saySync() { val s = session ?: return
        if (s.finished) { val f = sayFinal ?: s.finish().also { sayFinal = it; viewModelScope.launch { env.putKv(PronPairs_KEY, P.save(s.stats)); env.pay(it.reward) } }
            say = SaySessionUi("", 1f, Tr(""), false, "", "", "", false, null, null, f, f.chips.map { (ct, ok, n) -> Triple(P.labelTr(ct), ok, n) }); return }
        val cur = s.item; say = SaySessionUi("${s.i + 1}/${s.total}", s.i / s.total.toFloat(), s.labelOf(cur), cur.retry, cur.target, cur.ipa[cur.side], cur.other, sayListening, sayStep, sayBlocked, null, error = sayErr)
        if (sayStep == null && !sayListening) viewModelScope.launch { delay(250); if (session?.item === cur && sayStep == null) env.speak(cur.target, "en-US") } }
    fun startSay() { viewModelScope.launch { stats = P.load(env.kv(PronPairs_KEY)); val cs = P.forSkill(id); session = PairSession(P, cs, stats, java.time.LocalDate.now(java.time.ZoneOffset.UTC).toString(), env.random); sayStep = null; sayBlocked = null; sayErr = null; sayListening = false; sayFinal = null; saySync() } }
    fun sayHear(slow: Boolean) { val s = session ?: return; if (!s.finished) env.speak(s.item.target, "en-US", if (slow) 0.55f else 0.95f) }
    fun sayMic() { val s = session ?: return; if (s.finished || sayListening) { env.stopListening(); return }; sayListening = true; sayErr = null; saySync()
        env.listen("en-US", {}, { alts -> sayListening = false; sayStep = s.heard(alts); saySync() }, { code -> sayListening = false
            if (RecError.blocked(code)) { sayBlocked = if (code == "unsupported") Tr("Thiết bị này chưa hỗ trợ nhận dạng giọng nói – hãy luyện phần nghe phân biệt bên dưới.") else MIC_DENIED_NATIVE; saySync() }
            else if (RecError.retry(code)) { sayStep = s.heard(emptyList()); saySync() } else { sayErr = recText(code); saySync() } }) }
    fun sayMicDenied() { sayListening = false; sayBlocked = MIC_DENIED_NATIVE; saySync() }
    fun sayNext() { val s = session ?: return; s.next(); sayStep = null; saySync() }
    fun closeSay() { session = null; say = null; env.stopListening() }

    // ---- rhythm ----
    fun startRhythm() { viewModelScope.launch { rhy = (env.kv(RHYTHM_KEY) as? JsonObject)?.entries?.associate { it.key.toInt() to ((it.value as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt() ?: 0) } ?: emptyMap(); rk = coach.firstOpen(rhy); rphase = "idle"; rattempt = null; rerr = null; rsync() } }
    private fun rsync() { val a = if (accent == "en-US") "en-US" else "en-GB"; val s = pack.coachSentences[rk]
        val nx = coach.next(P, stats, rhy, id)
        rhythm = RhythmUi(rk, pack.coachSentences.map { it.s }, coach.plan(s, a), a, rhy, rphase, rattempt, nx, pack.lessons.associate { it.id to it.title } + pack.contrasts.associate { it.id to P.label(it) }, rerr) }
    fun rPick(i: Int) { env.stopListening(); rk = i; rphase = "idle"; rattempt = null; rerr = null; rsync() }
    fun rHear(slow: Boolean) { env.speak(pack.coachSentences[rk].s, if (accent == "en-US") "en-US" else "en-GB", if (slow) 0.6f else 0.95f) }
    fun rShadow() { val a = if (accent == "en-US") "en-US" else "en-GB"; val s = pack.coachSentences[rk].s; rphase = "hear"; rattempt = null; rerr = null; rsync()
        env.speak(s, a, 0.9f) { viewModelScope.launch { rphase = "rec"; rsync(); env.listen(a, {}, { alts -> val h = SpeakScore.best(s, alts); val at = coach.attempt(s, h.heard, h.alts); rphase = "idle"; rattempt = at; rhy = rhy + (rk to maxOf(rhy[rk] ?: 0, at.score)); rsync()
            viewModelScope.launch { env.putKv(RHYTHM_KEY, JsonObject(rhy.mapKeys { it.key.toString() }.mapValues { JsonPrimitive(it.value) })); env.pay(at.reward) } }, { code -> rphase = "idle"; rerr = recText(code); rsync() }) } } }
    fun rMicDenied() { rphase = "idle"; rerr = recText("not-allowed"); rsync() }
    fun closeRhythm() { rhythm = null; env.stopListening(); env.stopSpeaking() }
    fun coachBand(b: String) = coach.bandText(b)

    class Factory(private val env: SpeakEnv, private val id: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = PronSoundVm(env, id) as T }
    companion object { const val PronPairs_KEY = "lk.pronPairs"; const val RHYTHM_KEY = "vb.pron.rhythm" }
}
