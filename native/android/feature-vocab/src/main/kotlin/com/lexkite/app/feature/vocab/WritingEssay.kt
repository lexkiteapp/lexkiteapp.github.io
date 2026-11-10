package com.lexkite.app.feature.vocab

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.horizontalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.skills.Lexis
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.Topic
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.strs
import com.lexkite.app.core.write.Essay
import com.lexkite.app.core.write.WritePack
import com.lexkite.app.core.write.WritingData
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
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.TopBar
import com.lexkite.app.ui.TopBarVariant
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** What #/write and #/task1 need besides the prompts: the pack tables, the word library (topic words, index, synonyms) and the learner's saved words. */
class EssayData(val pack: WritePack, val w: WritingData, val topics: List<Topic>, val index: Map<String, JsonObject>, val lexis: Lexis, val mine: Set<String>)

/** One finished analysis: the text, the Task 2 numbers or the Task 1 score, and the highlighted passage. */
class EssayReport(val text: String, val task2: Essay.Analysis?, val task1: Essay.Task1Score?, val passage: List<List<List<Any>>>)

private fun JsonObject?.str(k: String): String = this.gs(k)

/** `#/write/<prompt>` (Task 2) and `#/task1/<set>` (chart description). */
@Composable
fun EssayRoute(env: WordEnv, task1: Boolean, arg: String, onExit: () -> Unit, open: (String) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    var reload by remember { mutableIntStateOf(0) }
    val state by produceState<Pair<Boolean, EssayData?>>(false to null, env, reload) {
        val pack = env.writePack(); val w = runCatching { env.writing() }.getOrNull()
        val topics = env.topics()
        val ok = pack != null && w != null && (if (task1) w.task1 else w.prompts).isNotEmpty()
        value = true to (if (ok) EssayData(pack!!, w!!, topics, env.index(), env.essayLexis(), env.cards().keys) else null)
    }
    val data = state.second
    if (data == null) {
        VScreen(if (task1) "Writing Task 1" else t(L10nKey.revWritingRoom), onExit) { if (state.first) VNotice(t(L10nKey.syncOffline)) { reload++ } else VNotice(t(L10nKey.actionLoading)) }
        return
    }
    EssayScreen(env, data, task1, arg, onExit, open)
}

@Composable
private fun EssayScreen(env: WordEnv, d: EssayData, task1: Boolean, arg: String, onExit: () -> Unit, open: (String) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current; val scope = rememberCoroutineScope()
    val all = if (task1) d.w.task1 else d.w.prompts
    var cur by remember { mutableStateOf<JsonObject?>(null) }
    var text by remember { mutableStateOf("") }
    var loaded by remember { mutableStateOf(false) }
    var report by remember { mutableStateOf<EssayReport?>(null) }
    var saved by remember { mutableStateOf<List<JsonElement>>(emptyList()) }
    val minutes = if (task1) Essay.T1_CLOCK else Essay.CLOCK_MINUTES
    var left by remember { mutableIntStateOf(minutes * 60) }
    var running by remember { mutableStateOf(false) }
    var notice by remember { mutableStateOf("") }

    suspend fun pick(id: String?, first: Boolean) {
        loaded = false; report = null; notice = ""; running = false; left = minutes * 60
        if (task1) {
            val x = all.firstOrNull { it.gs("id") == id } ?: all.first(); cur = x
            text = ((env.kv("task1Drafts") as? JsonObject)?.get(x.gs("id")) as? JsonPrimitive)?.content ?: ""
        } else {
            val draft = env.kv("essayDraft") as? JsonObject
            val want = id ?: draft.str("prompt").ifEmpty { "p1" }
            val x = all.firstOrNull { it.gs("id") == want } ?: all.first(); cur = x
            text = if (draft.str("prompt") == x.gs("id")) draft.str("text") else ""
            if (first) saved = (env.kv("essays") as? JsonArray)?.toList() ?: emptyList()
        }
        loaded = true
    }
    LaunchedEffect(Unit) { pick(arg.ifEmpty { null }, true) }
    val x = cur
    // draft kept 600 ms after the last key
    LaunchedEffect(text, loaded) {
        if (!loaded || x == null) return@LaunchedEffect
        delay(600)
        if (task1) { val old = (env.kv("task1Drafts") as? JsonObject) ?: JsonObject(emptyMap()); env.putKv("task1Drafts", JsonObject(LinkedHashMap(old).also { it[x.gs("id")] = JsonPrimitive(text) })) }
        else env.putKv("essayDraft", JsonObject(linkedMapOf("prompt" to JsonPrimitive(x.gs("id")), "text" to JsonPrimitive(text))))
    }
    LaunchedEffect(running) { while (running && left > 0) { delay(1000); left-- }; if (left <= 0 && running) { running = false; notice = "up" } }
    if (x == null) { VScreen(if (task1) "Writing Task 1" else t(L10nKey.revWritingRoom), onExit) { VNotice(t(L10nKey.actionLoading)) }; return }

    fun show(body: String, fresh: Boolean) {
        notice = ""
        val passage = d.lexis.markText(body) { CardMath.keyOf(it) in d.mine }
        if (!task1) {
            val a = d.lexis.essay(body, d.pack.stop) { it in d.index }
            report = EssayReport(body, a, null, passage)
            if (fresh) scope.launch {
                saved = Essay.saving(saved, x.gs("id"), body, a.words, a.band, env.now())
                env.putKv("essays", JsonArray(saved)); env.reward(Essay.REWARD, Essay.REWARD_XP)
            }
        } else {
            report = EssayReport(body, null, Essay.task1Score(body, x.gs("type")), passage)
            if (fresh) scope.launch { env.reward(Essay.T1_REWARD, Essay.T1_REWARD_XP) }
        }
    }
    fun analyse() {
        val n = Essay.words(text)
        if (n < (if (task1) Essay.T1_MIN_TO_ANALYSE else Essay.MIN_TO_ANALYSE)) { notice = "short"; return }
        show(text, true)
    }
    fun insert(s: String) { text += (if (text.isEmpty() || text.endsWith(" ") || text.endsWith("\n")) "" else " ") + s + " " }

    EssayLayout(
        EssayUi(task1, d, x, text, report, saved, left, running, notice), env.tx,
        EssayActions(text = { text = it; report = null }, pick = { id -> scope.launch { pick(id, false) } }, random = { all.randomOrNull()?.let { r -> scope.launch { pick(r.gs("id"), false) } } },
            toggleClock = { if (left <= 0) left = minutes * 60; notice = ""; running = !running }, analyse = { analyse() }, insert = { insert(it) },
            openSaved = { i -> if (i < saved.size) { text = (saved[i] as JsonObject).gs("text"); show(text, false) } }, open = open), onExit)
}

/** What the page shows – hoisted so the layout is a pure function of it (snapshots, previews). */
class EssayUi(val task1: Boolean, val d: EssayData, val x: JsonObject, val text: String, val report: EssayReport?, val saved: List<JsonElement>, val left: Int, val running: Boolean, val notice: String)
class EssayActions(val text: (String) -> Unit = {}, val pick: (String) -> Unit = {}, val random: () -> Unit = {}, val toggleClock: () -> Unit = {}, val analyse: () -> Unit = {}, val insert: (String) -> Unit = {},
    val openSaved: (Int) -> Unit = {}, val open: (String) -> Unit = {})

@Composable
fun EssayLayout(ui: EssayUi, tx: Tx, a: EssayActions, onExit: () -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    val task1 = ui.task1; val d = ui.d; val x = ui.x; val text = ui.text; val report = ui.report; val saved = ui.saved; val left = ui.left; val running = ui.running; val notice = ui.notice
    val all = if (task1) d.w.task1 else d.w.prompts
    VScreen(if (task1) "Writing Task 1" else t(L10nKey.revWritingRoom), onExit) {
        if (task1) {
            VMuted(t(L10nKey.writeTask1MoTaBieuDo)); VFlow { VChip("Task 2 →", { a.open("write") }) }
        } else {
            RichBody(t(L10nKey.writeWriteVietBaiIeltsTask), color = c.onSurfaceVariant, style = LKType.bodyMd)
            VFlow { VChip(t(L10nKey.writeWriteChuyenSangTask1), { a.open("task1") }); VChip(t(L10nKey.speakSpkTieuChiChamBand), { a.open("criteria?skill=writing") }) }
        }
        if (task1) Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            all.forEach { s -> VChip(typeName(t, s.gs("type")) + " · " + s.gs("id"), { a.pick(s.gs("id")) }, selected = s.gs("id") == x.gs("id")) }
        }
        LKCard {
            VFlow {
                VBadge(if (task1) typeName(t, x.gs("type")) else x.gs("type"), c.secondaryContainer, c.onSecondaryContainer)
                if (!task1) VChip("🎲", { a.random() })
            }
            if (!task1) PromptPicker(all, x.gs("id")) { id -> a.pick(id) }
            Ltr {
                if (task1) {
                    VText(x.gs("title") + " Summarise the information by selecting and reporting the main features, and make comparisons where relevant.", LKType.bodyLg, c.onSurface)
                    Task1Chart(x)
                    VMuted(t(L10nKey.writeTask1DuLieuMinhHoa))
                } else VText(x.gs("text"), LKType.bodyLg, c.onSurface)
            }
            if (!task1) {
                LKPillButton(t(L10nKey.writeWriteBiYMoNgan), { a.open("ideas/" + x.gs("topic")) })
                var outline by remember(x.gs("id")) { mutableStateOf(false) }
                VChip(t.s(L10nKey.writeWriteDanYGoiY, "type" to x.gs("type")), { outline = !outline }, selected = outline)
                if (outline) (d.pack.outline[x.gs("type")] ?: emptyList()).forEachIndexed { i, o -> VMuted("${i + 1}. " + tx.t(o, null)) }
                VMuted(t(L10nKey.writeWriteVietItNhat250))
            }
            val mid = (if (task1) "t1-" else "t2-") + x.gs("id")
            if (d.w.models.any { it.gs("id") == mid }) LKPillButton(t(L10nKey.writeWriteBaiMauBand8), { a.open("model/$mid") })
            if (task1) {
                var ov by remember(x.gs("id")) { mutableStateOf(false) }
                VChip(t(L10nKey.writeTask1XemCauTongQuan), { ov = !ov }, selected = ov)
                if (ov) Ltr { VMuted(x.gs("overview")) }
            }
        }
        LKCard {
            VField(text, { a.text(it) }, if (task1) "The " + (if (x.gs("type") == "map") "maps illustrate" else if (x.gs("type") == "process") "diagram illustrates" else "chart shows") + "…" else t(L10nKey.writeWriteBatDauVietBai), singleLine = false, lines = 12)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                val n = Essay.words(text); val ok = n >= (if (task1) Essay.T1_MIN_WORDS else Essay.MIN_WORDS)
                VBadge(t.s(L10nKey.vocabWords, "n" to n), if (ok) c.success.copy(alpha = 0.2f) else c.surfaceContainerHighest, if (ok) c.success else c.onSurface)
                Row(Modifier.heightIn(min = MinTap).tactile({ a.toggleClock() }, "%02d:%02d".format(maxOf(0, left) / 60, maxOf(0, left) % 60)), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    Icon(Icons.Filled.Timer, null, tint = if (running) c.secondary else c.onSurfaceVariant)
                    VText("%02d:%02d".format(maxOf(0, left) / 60, maxOf(0, left) % 60), LKType.headlineSm, if (left < (if (task1) Essay.T1_WARN else Essay.WARN_SECONDS)) c.error else c.onSurface)
                }
            }
            if (notice == "up") VText(if (task1) t(L10nKey.writeTask1Het20Phut) else t(L10nKey.writeWriteHet40PhutHay), LKType.titlePill, c.error)
            if (notice == "short") VText(if (task1) t(L10nKey.writeTask1HayVietItNhat) else t(L10nKey.writeWriteHayVietItNhat), LKType.bodySm, c.error)
            LKPrimaryButton(if (task1) t(L10nKey.writeTask1PhanTichBaiTask) else t(L10nKey.writeWritePhanTichTuVung), { a.analyse() })
        }
        report?.let { EssayReportCard(tx, d, it, a.open) }
        if (task1) Task1Side(d, x, a.insert) else Task2Side(tx, d, x, saved, a.insert, a.openSaved)
    }
}

@Composable
private fun PromptPicker(all: List<JsonObject>, cur: String, pick: (String) -> Unit) {
    val t = LocalL10n.current.western()
    var open by remember { mutableStateOf(false) }
    VChip(t(L10nKey.writeWriteChonDe) + " ▾", { open = !open }, selected = open)
    if (open) Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        all.forEach { p -> VChip(p.gs("type") + " · " + t.s(L10nKey.writeWriteDeN, "n" to Essay.sessionNumber(p.gs("id"))), { open = false; pick(p.gs("id")) }, selected = p.gs("id") == cur) }
    }
}

internal fun typeName(t: com.lexkite.app.i18n.L10n, k: String): String = when (k) {
    "line" -> t(L10nKey.modelLineGraph); "bar" -> t(L10nKey.modelBarChart); "pie" -> t(L10nKey.modelPieChart)
    "table" -> t(L10nKey.modelTable); "process" -> t(L10nKey.modelProcess); else -> t(L10nKey.modelMap)
}

@Composable
private fun StatBox(value: String, label: String, modifier: Modifier = Modifier) {
    Column(modifier, verticalArrangement = Arrangement.spacedBy(2.dp)) { Ltr { VText(value, LKType.headlineSm) }; VMuted(label) }
}

@Composable
private fun Ring(band: Double, span: Double) {
    val c = LocalLKColors.current; val (pct, tone) = Essay.ring(band, span)
    val col = when (tone) { Essay.Tone.GOOD -> c.success; Essay.Tone.HARD -> c.tertiary; Essay.Tone.AGAIN -> c.error }
    Box(Modifier.size(72.dp), contentAlignment = Alignment.Center) {
        Canvas(Modifier.size(72.dp)) {
            val s = Stroke(8.dp.toPx(), cap = StrokeCap.Round); val inset = 4.dp.toPx(); val sz = Size(size.width - 2 * inset, size.height - 2 * inset)
            drawArc(c.outlineVariant, 0f, 360f, false, Offset(inset, inset), sz, style = s)
            drawArc(col, -90f, (360 * (pct / 100).coerceIn(0.0, 1.0)).toFloat(), false, Offset(inset, inset), sz, style = s)
        }
        Ltr { VText(Essay.bandText(band), LKType.headlineSm) }
    }
}

@Composable
private fun LineRow(l: Essay.Line, tx: Tx) {
    val c = LocalLKColors.current
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.Top) {
        Icon(if (l.good) Icons.Filled.CheckCircle else Icons.Filled.Lightbulb, null, tint = if (l.good) c.success else c.tertiary)
        RichBody(tx.t(l.key, l.vars), color = c.onSurface)
    }
}

@Composable
private fun EssayReportCard(tx: Tx, d: EssayData, r: EssayReport, open: (String) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    LKCard {
        r.task2?.let { a ->
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                Ring(a.band, 4.5)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) { VTitle(t.s(L10nKey.writeWriteLexicalResourceUocTinh, "band" to Essay.bandText(a.band))); VMuted(t(L10nKey.writeWriteUocTinhTuDong)) }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { StatBox(a.words.toString(), t(L10nKey.speakSpkSoTu), Modifier.weight(1f)); StatBox(a.awlTotal.toString(), t.s(L10nKey.writeWriteTuAwlPct, "pct" to Essay.pct1(a.awlRatio)), Modifier.weight(1f)) }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { StatBox(a.link.size.toString(), t(L10nKey.writeWriteLoaiTuNoi), Modifier.weight(1f)); StatBox("${Math.floor(a.diversity * 100 + 0.5).toInt()}%", t(L10nKey.writeWriteDoDaDangTu), Modifier.weight(1f)) }
            VText(t(L10nKey.speakSpkNhanXet), LKType.labelBadge, c.onSurfaceVariant)
            Essay.tips(a).forEach { LineRow(it, tx) }
            if (a.overused.isNotEmpty()) {
                VText(t(L10nKey.writeWriteTuBiLapGoi), LKType.labelBadge, c.onSurfaceVariant)
                a.overused.forEach { o ->
                    val alts = d.index[o.w].strs("syn").take(4)
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                        Ltr { VText(o.w, LKType.titlePill) }; VBadge("×${o.n}")
                        if (alts.isEmpty()) VMuted(t(L10nKey.writeWriteKhongCoGoiY)) else VFlow { alts.forEach { w -> VChip(w, { open("dict/$w") }) } }
                    }
                }
            }
            WordList(t(L10nKey.writeWriteTuHocThuatAwl), a.awl)
            WordList(t(L10nKey.writeWriteTuNoiCumTu), a.link + a.phrases.filter { p -> a.link.none { it.w == p.w } })
        }
        r.task1?.let { s ->
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                Ring(s.band, 4.0)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) { VTitle(t.s(L10nKey.writeTask1TaskAchievementUocTinh, "band" to Essay.bandText(s.band))); VMuted(t(L10nKey.writeTask1KiemTraTuDong)) }
            }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { StatBox(s.words.toString(), t(L10nKey.speakSpkSoTu), Modifier.weight(1f)); StatBox(if (s.overview > 0) "✓" else "✗", t(L10nKey.modelOverview), Modifier.weight(1f)) }
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { StatBox(s.numbers.toString(), t(L10nKey.writeTask1SoLieu), Modifier.weight(1f)); StatBox((s.trend + s.compare).toString(), t(L10nKey.writeTask1XuHuongSoSanh), Modifier.weight(1f)) }
            VText(t(L10nKey.speakSpkNhanXet), LKType.labelBadge, c.onSurfaceVariant)
            s.notes.forEach { LineRow(it, tx) }
        }
        VText(t(L10nKey.writeWriteBaiVietDuocTo), LKType.labelBadge, c.onSurfaceVariant)
        r.passage.forEach { para -> Ltr { Text(highlighted(para.flatten(), c.tertiary, c.secondary, c.success, c.onSurface), style = LKType.bodyMd.toCompose()) } }
    }
}

/** "Bài viết được tô sáng": AWL / linking words / the learner's own words underlined in the Kit colours. */
private fun highlighted(parts: List<Any>, awl: Color, link: Color, mine: Color, ink: Color) = buildAnnotatedString {
    parts.forEach { p ->
        if (p is Lexis.Tok) {
            val cls = p.cls.split(' ')
            val col = when { "link" in cls || "col" in cls -> link; "awl" in cls -> awl; "mine" in cls -> mine; else -> null }
            if (col == null) append(p.text) else withStyle(SpanStyle(color = col, textDecoration = TextDecoration.Underline)) { append(p.text) }
        } else append(p.toString())
    }
}

@Composable
private fun WordList(title: String, list: List<Essay.Count>) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    VText(title, LKType.labelBadge, c.onSurfaceVariant)
    if (list.isEmpty()) VMuted(t(L10nKey.writeWriteChuaCo)) else VFlow { list.sortedByDescending { it.n }.forEach { VBadge(if (it.n > 1) "${it.w} ×${it.n}" else it.w) } }
}

@Composable
private fun Task2Side(tx: Tx, d: EssayData, x: JsonObject, saved: List<JsonElement>, insert: (String) -> Unit, openSaved: (Int) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    val topic = d.topics.firstOrNull { it.id == x.gs("topic") }
    LKCard {
        VTitle(t(L10nKey.writeWriteTuVungGoiY) + (topic?.let { " · " + tx.t(it.name, null) } ?: ""))
        VFlow { (topic?.words ?: emptyList()).take(14).forEach { w -> VChip(w.gs("word"), { insert(w.gs("word")) }) } }
        VMuted(t(L10nKey.writeWriteBamDeChenVao))
    }
    LKCard {
        VTitle(t(L10nKey.writeWriteXuHuongDeTask))
        (d.pack.trends["types"] as? JsonArray)?.forEach { row ->
            val r = row as JsonArray; val name = (r[0] as JsonPrimitive).content; val v = (r[1] as JsonPrimitive).content.toDouble()
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                VText(tx.t(name, null), LKType.bodySm, c.onSurface, Modifier.width(110.dp))
                Box(Modifier.weight(1f).height(8.dp).background(c.outlineVariant, androidx.compose.foundation.shape.CircleShape)) { Box(Modifier.fillMaxWidth((v * 2 / 100).toFloat().coerceIn(0f, 1f)).height(8.dp).background(c.secondary, androidx.compose.foundation.shape.CircleShape)) }
                VMuted("${v.toInt()}%")
            }
        }
        VMuted(t(L10nKey.writeWriteChuDeLapNhieu) + " " + d.pack.trends.strs("topics").joinToString(" · ") { tx.t(it, null) })
        VMuted("Task 1: " + ((d.pack.trends["task1"] as? JsonArray) ?: JsonArray(emptyList())).joinToString(" · ") { row -> val r = row as JsonArray; tx.t((r[0] as JsonPrimitive).content, null) + " ${(r[1] as JsonPrimitive).content.toDouble().toInt()}%" })
        VMuted(t(L10nKey.writeWriteUocTinhSoBo))
    }
    LKCard { VTitle(t(L10nKey.writeWriteTuNoiHayDung)); VFlow { d.pack.connectors.forEach { w -> VChip(w, { insert(w) }) } } }
    if (saved.isNotEmpty()) LKCard {
        VTitle(t(L10nKey.writeWriteBaiDaViet))
        saved.take(Essay.SHOW_SAVED).forEachIndexed { i, e ->
            val o = e as JsonObject
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                VText(t.s(L10nKey.writeWriteDeN, "n" to Essay.sessionNumber(o.gs("prompt"))) + " · " + t.s(L10nKey.vocabWords, "n" to ((o["words"] as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt() ?: 0)), LKType.bodySm, c.onSurface, Modifier.weight(1f))
                VBadge("LR ~" + Essay.bandText(((o["band"] as? JsonPrimitive)?.content?.toDoubleOrNull()) ?: 0.0))
                LKPillButton(t(L10nKey.writeWriteMo), { openSaved(i) })
            }
        }
    }
}

@Composable
private fun Task1Side(d: EssayData, x: JsonObject, insert: (String) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    LKCard {
        VTitle(t(L10nKey.writeTask1CauTruc4Doan))
        listOf(L10nKey.writeTask1MoBaiVietLai, L10nKey.writeTask1TongQuan2Dac, L10nKey.writeTask1ThanBai1Nhom, L10nKey.writeTask1ThanBai2Nhom).forEach { RichBody(t(it), style = LKType.bodySm) }
    }
    LKCard {
        VTitle(t.s(L10nKey.writeTask1TuVungChoType, "type" to typeName(t, x.gs("type")).lowercase()))
        VFlow { (d.pack.vocab[x.gs("type")] ?: emptyList()).forEach { v -> VChip(v.replace("(bị động)", t(L10nKey.writeTask1BiDong)), { insert(insertText(v)) }) } }
        VMuted(t(L10nKey.writeWriteBamDeChenVao))
    }
    LKCard { VTitle(t(L10nKey.writeTask1LuuY)); listOf(L10nKey.writeTask1KhongNeuYKien, L10nKey.writeTask1ThiDongTuTheo, L10nKey.writeTask1KhongCanMoTa).forEach { VText("• " + t(it), LKType.bodySm, c.onSurface) } }
}

/** the chip text that goes into the essay: the first alternative, without a trailing note (web `v.split(' / ')[0].replace(/ \(.*\)/, '')`) */
internal fun insertText(v: String): String = v.split(" / ")[0].replace(Regex(" \\(.*\\)"), "")

// ---------------------------------------------------------------- the Task 1 figure
@Composable
internal fun Task1Chart(fig: JsonObject) {
    val c = LocalLKColors.current
    val pal = listOf(c.secondary, c.tertiary, c.primary, c.success, c.star, c.error)
    when (fig.gs("type")) {
        "line", "bar" -> {
            val xs = fig.strs("x")
            val series = fig.ga("series").mapNotNull { s -> (s as? JsonArray)?.let { a -> (a[0] as JsonPrimitive).content to (a[1] as JsonArray).map { (it as JsonPrimitive).content.toDouble() } } }
            val top = series.flatMap { it.second }.maxOrNull() ?: 10.0
            val maxV = maxOf(10.0, Math.ceil(top / 10) * 10); val bars = fig.gs("type") == "bar"
            VMuted(fig.gs("unit"))
            Canvas(Modifier.fillMaxWidth().height(230.dp)) {
                val left = 34.dp.toPx(); val topPad = 8.dp.toPx(); val bottom = 34.dp.toPx()
                val w = size.width - left - 8.dp.toPx(); val h = size.height - topPad - bottom
                fun y(v: Double) = topPad + h * (1 - (v / maxV).toFloat())
                for (k in 0..5) drawLine(c.outlineVariant, Offset(left, y(maxV * k / 5)), Offset(left + w, y(maxV * k / 5)), 1.dp.toPx())
                val n = maxOf(1, xs.size); val step = if (bars) w / n else if (n > 1) w / (n - 1) else w
                fun cx(i: Int) = if (bars) left + step * (i + 0.5f) else left + step * i
                series.forEachIndexed { si, s ->
                    val col = pal[si % pal.size]
                    if (bars) { val bw = step * 0.7f / maxOf(1, series.size); s.second.forEachIndexed { i, v -> if (i < n) drawRect(col, Offset(left + step * i + step * 0.15f + bw * si, y(v)), Size(maxOf(1f, bw - 2), y(0.0) - y(v))) } }
                    else {
                        val p = Path(); s.second.forEachIndexed { i, v -> if (i == 0) p.moveTo(cx(i), y(v)) else p.lineTo(cx(i), y(v)) }
                        drawPath(p, col, style = Stroke(3.dp.toPx(), cap = StrokeCap.Round))
                        s.second.forEachIndexed { i, v -> drawCircle(col, 4.dp.toPx(), Offset(cx(i), y(v))) }
                    }
                }
            }
            Ltr { VMuted(xs.joinToString("  ")) }
            VFlow { series.forEachIndexed { i, s -> Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(12.dp).background(pal[i % pal.size])); Ltr { VText(s.first, LKType.bodySm) } } } }
        }
        "pie" -> fig.ga("pies").forEach { p ->
            val a = p as JsonArray; val parts = (a[1] as JsonArray).map { r -> (r as JsonArray).let { (it[0] as JsonPrimitive).content to (it[1] as JsonPrimitive).content.toDouble() } }
            val total = maxOf(1.0, parts.sumOf { it.second })
            VText((a[0] as JsonPrimitive).content, LKType.labelMetric)
            Canvas(Modifier.fillMaxWidth().height(150.dp)) {
                val r = minOf(size.width, size.height) / 2 - 8.dp.toPx(); var a0 = -90f
                parts.forEachIndexed { i, part -> val sweep = (part.second / total * 360).toFloat(); drawArc(pal[i % pal.size], a0, sweep, true, Offset(size.width / 2 - r, size.height / 2 - r), Size(2 * r, 2 * r)); a0 += sweep }
            }
            Ltr { VMuted(parts.joinToString(", ") { "${it.first} ${it.second.toInt()}%" }) }
        }
        "table" -> {
            val head = fig.strs("head")
            Ltr { Column(Modifier.horizontalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) { head.forEach { VText(it, LKType.labelMetric, c.onSurface, Modifier.width(88.dp)) } }
                fig.ga("rows").forEach { r -> Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) { (r as JsonArray).forEach { VText((it as JsonPrimitive).content, LKType.bodyMd, c.onSurface, Modifier.width(88.dp)) } } }
            } }
        }
        "process" -> Ltr { Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { fig.strs("steps").forEachIndexed { i, s -> Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { VBadge("${i + 1}", c.secondary, c.onSecondary); VText(s, LKType.bodyMd) } } } }
        "map" -> fig.ga("maps").forEach { m ->
            val a = m as JsonArray
            VText((a[0] as JsonPrimitive).content, LKType.labelMetric)
            Ltr { VMuted((a[1] as JsonArray).joinToString(" · ") { (it as JsonArray)[0].let { n -> (n as JsonPrimitive).content } }) }
        }
    }
}
