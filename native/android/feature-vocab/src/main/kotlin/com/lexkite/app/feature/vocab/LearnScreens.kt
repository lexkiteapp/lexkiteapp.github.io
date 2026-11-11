package com.lexkite.app.feature.vocab

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Slider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.SRSParams
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.write.LearnContent
import com.lexkite.app.core.write.Method
import com.lexkite.app.core.write.Quick
import com.lexkite.app.core.write.StyleQuiz
import com.lexkite.app.core.write.lArr
import com.lexkite.app.core.write.lInt
import com.lexkite.app.core.write.lList
import com.lexkite.app.core.write.lObj
import com.lexkite.app.core.write.lStr
import com.lexkite.app.core.write.lStrs
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.util.Random

// ---------------------------------------------------------------- #/quick – "Chơi nhanh 15 giây"
class QuickQ(val word: String, val ipa: String, val pos: String, val options: List<String>, val correct: Int)
/** stage: "loading" | "empty" | "playing" | "done" */
class QuickUi(val stage: String, val questions: List<QuickQ>, val index: Int, val picked: Int?, val secondsLeft: Int, val result: Quick.Result?)

@Composable
fun QuickRoute(env: WordEnv, onExit: () -> Unit, open: (String) -> Unit) {
    val scope = rememberCoroutineScope()
    var stage by remember { mutableStateOf("loading") }
    var questions by remember { mutableStateOf(emptyList<QuickQ>()) }
    var index by remember { mutableStateOf(0) }
    var picked by remember { mutableStateOf<Int?>(null) }
    var score by remember { mutableStateOf(0) }
    var secs by remember { mutableStateOf(Quick.LIMIT) }
    var result by remember { mutableStateOf<Quick.Result?>(null) }
    var round by remember { mutableStateOf(0) }
    var paused by remember { mutableStateOf(0L) }
    var started by remember { mutableStateOf(0L) }
    val rnd = remember { Random() }
    fun mean(w: JsonObject): String = CardMath.meanOf(w).let { m -> if (env.uiLang == "vi") m else w.lStr("def").ifEmpty { m } }
    fun uniq(l: List<JsonObject>): List<JsonObject> { val seen = HashSet<String>(); return l.filter { w -> val k = w.lStr("word").lowercase(); k.isNotEmpty() && mean(w).isNotEmpty() && seen.add(k) } }
    LaunchedEffect(round) {
        stage = "loading"
        val bank = uniq(env.topics().flatMap { it.words })
        val cards = uniq(env.cards().values.filter { it.lStr("word").isNotEmpty() })
        val now = env.now()
        val due = cards.filter { c -> (c.lObj("srs").get("due") as? JsonPrimitive)?.content?.toDoubleOrNull()?.let { it <= now + 86_400_000 } ?: false }
        val pool = if (due.size >= Quick.COUNT) due else if (cards.size >= Quick.COUNT) cards else bank
        val others = if (bank.size >= 10) bank else uniq(cards + bank)
        if (pool.size < Quick.MIN_POOL || others.size < Quick.MIN_POOL) { stage = "empty"; return@LaunchedEffect }
        fun <T> shuf(l: List<T>): List<T> = l.toMutableList().also { java.util.Collections.shuffle(it, rnd) }
        questions = shuf(pool).take(Quick.COUNT).map { w ->
            val right = mean(w); val rl = right.lowercase()
            fun ok(x: JsonObject): Boolean { val m = mean(x).lowercase(); return x.lStr("word").lowercase() != w.lStr("word").lowercase() && m.isNotEmpty() && m != rl && !m.contains(rl) && !rl.contains(m) }
            val ds = (shuf(others.filter { ok(it) && it.lStr("pos") == w.lStr("pos") }) + shuf(others.filter { ok(it) })).distinctBy { it.lStr("word") }.take(2)
            val opts = shuf(listOf(right) + ds.map { mean(it) })
            QuickQ(w.lStr("word"), w.lStr("ipa"), w.lStr("pos"), opts, opts.indexOf(right).coerceAtLeast(0))
        }
        index = 0; score = 0; picked = null; paused = 0; secs = Quick.LIMIT; result = null; started = System.currentTimeMillis(); stage = "playing"
    }
    fun finish(timedOut: Boolean) {
        if (stage != "playing") return
        val r = Quick.result(score, questions.size, timedOut, (System.currentTimeMillis() - started) / 1000.0)
        result = r; stage = "done"
        if (r.xp > 0) scope.launch { env.reward(emptyMap(), r.xp) }
    }
    LaunchedEffect(stage, round) {
        while (stage == "playing") {
            val used = (System.currentTimeMillis() - started - paused) / 1000.0
            secs = maxOf(0, Math.ceil(Quick.LIMIT - used).toInt())
            if (used >= Quick.LIMIT && picked == null) finish(true)
            delay(250)
        }
    }
    val a = QuickActions(
        answer = { i ->
            val q = questions.getOrNull(index)
            if (stage == "playing" && picked == null && q != null) {
                picked = i; val right = i == q.correct; if (right) score++
                val hold = if (right) Quick.HOLD_RIGHT_MS else Quick.HOLD_WRONG_MS
                paused += hold
                scope.launch {
                    delay(hold.toLong())
                    if (stage == "playing") { index++; picked = null; if (index >= questions.size) finish(false) else if ((System.currentTimeMillis() - started - paused) / 1000.0 >= Quick.LIMIT) finish(true) }
                }
            }
        },
        speak = { questions.getOrNull(index)?.let { env.speakWord(it.word, "UK") } }, again = { round++ }, exit = onExit,
    )
    QuickLayout(QuickUi(stage, questions, index, picked, secs, result), a)
}

class QuickActions(val answer: (Int) -> Unit = {}, val speak: () -> Unit = {}, val again: () -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun QuickLayout(ui: QuickUi, a: QuickActions) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    VScreen(t.lv("Chơi nhanh 15 giây"), a.exit) {
        when (ui.stage) {
            "loading" -> VNotice(t(com.lexkite.app.i18n.generated.L10nKey.actionLoading))
            "empty" -> LKCard { VTitle(t.lv("Chưa có đủ từ vựng")); VMuted(t.lv("Hãy lưu một vài từ vựng hoặc học theo lộ trình trước khi chơi nhanh nhé.")); LAction(t.lv("Về trang chủ"), a.exit, primary = true) }
            "done" -> ui.result?.let { r ->
                LKCard {
                    VText(if (r.good) "⚡" else "🌱", LKType.headlineLg)
                    VText(if (r.timedOut) t.lv("Hết 15 giây!") else t.lv("Hoàn thành trong {s} giây!", "s" to r.secs), LKType.headlineMd)
                    VMuted(t.lv("Đúng {n}/{total} câu", "n" to r.right, "total" to r.total) + (if (r.xp > 0) " · +${r.xp} XP" else ""))
                    VText(if (r.pct == 100) t.lv("Phản xạ thần tốc! Trí nhớ như máy quét ⚡") else if (r.good) t.lv("Rất xuất sắc! Não bộ vừa được khởi động cực mượt 🚀") else t.lv("Khởi động tuyệt vời! Mỗi lần luyện là một lần nhớ sâu hơn 🌱"), LKType.titlePill)
                    LAction(t.lv("Làm thêm lượt nữa"), a.again, primary = true); LAction(t.lv("Về trang chủ"), a.exit)
                }
            }
            else -> ui.questions.getOrNull(ui.index)?.let { q ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    VBadge("⚡ " + t.lv("Câu {i}/{total}", "i" to ui.index + 1, "total" to ui.questions.size)); VText("⏱ ${ui.secondsLeft}s", LKType.titlePill, c.tertiary)
                }
                LBar(ui.index.toFloat() / ui.questions.size.coerceAtLeast(1))
                LKCard {
                    Ltr { VText(q.word, LKType.headlineLg) }
                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                        if (q.ipa.isNotEmpty()) Ltr { VMuted(q.ipa) }
                        if (q.pos.isNotEmpty()) VBadge(q.pos)
                        VSpeak(t(com.lexkite.app.i18n.generated.L10nKey.vocabPronounce), onClick = a.speak)
                    }
                    VMuted(t.lv("Chọn nghĩa đúng"))
                }
                q.options.forEachIndexed { i, o -> LChoice(o, if (ui.picked != null && i == q.correct) 1 else if (ui.picked == i) 2 else 0, ui.picked == null, { a.answer(i) }, english = false) }
            }
        }
    }
}

// ---------------------------------------------------------------- #/style – "Phong cách tiếng Anh của bạn"
/** index = question shown, picks = style ids chosen so far, winner = result style id once the quiz is complete */
class StyleUi(val styles: JsonObject, val questions: List<JsonObject>, val index: Int, val chosen: Int?, val winner: String?)
class StyleActions(val pick: (Int) -> Unit = {}, val open: (String) -> Unit = {}, val share: (String) -> Unit = {}, val restart: () -> Unit = {})

@Composable
fun StyleRoute(env: WordEnv, onExit: () -> Unit, open: (String) -> Unit) {
    val content = remember { env.learn() }
    val scope = rememberCoroutineScope(); val ctx = LocalContext.current
    val questions = remember { content.style.lList("questions") }
    var index by remember { mutableStateOf(0) }
    var chosen by remember { mutableStateOf<Int?>(null) }
    val picks = remember { mutableListOf<String>() }
    var winner by remember { mutableStateOf<String?>(null) }
    val a = StyleActions(
        pick = { k ->
            val q = questions.getOrNull(index)
            if (winner == null && chosen == null && q != null && k < q.lArr("opts").size) {
                chosen = k; picks.add((q.lArr("opts")[k] as JsonObject).lStr("style"))
                scope.launch {
                    delay(240); chosen = null; index++
                    if (index >= questions.size) { val w = StyleQuiz.winner(picks); winner = w; env.putSetting("englishStyle", JsonObject(mapOf("id" to JsonPrimitive(w), "date" to JsonPrimitive(env.now())))) }
                }
            }
        }, open = open,
        share = { text -> ctx.startActivity(android.content.Intent.createChooser(android.content.Intent(android.content.Intent.ACTION_SEND).setType("text/plain").putExtra(android.content.Intent.EXTRA_TEXT, text), null)) },
        restart = { index = 0; picks.clear(); winner = null; chosen = null },
    )
    StyleLayout(StyleUi(content.style.lObj("styles"), questions, index, chosen, winner), a, onExit)
}

@Composable
fun StyleLayout(ui: StyleUi, a: StyleActions, onExit: () -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    VScreen(t.lv("Phong cách tiếng Anh của bạn"), onExit) {
        val w = ui.winner?.let { ui.styles[it] as? JsonObject }
        if (w != null) {
            LKCard {
                VText(w.lStr("icon"), LKType.headlineLg)
                VMuted(t.lv("Kết quả phong cách tiếng Anh")); VText(t.lv(w.lStr("name")), LKType.headlineMd); VText(t.lv(w.lStr("desc")), LKType.bodyMd)
            }
            LKCard {
                VText(t.lv("Gợi ý tính năng dành riêng cho bạn:"), LKType.titlePill)
                w.lArr("recs").forEach { r ->
                    val x = r.lStrs(); val em = x.lastOrNull().orEmpty().substringBefore(' '); val rest = x.lastOrNull().orEmpty().substringAfter(' ', "")
                    VChip(em + " " + t.lv(rest), { a.open(x.first().removePrefix("#/")) })
                }
            }
            LAction("🚀 " + t.lv("Bắt đầu lộ trình ngay"), { a.open("path") }, primary = true)
            LAction(t.lv("Kiểm tra trình độ chi tiết (20 câu)"), { a.open("placement") })
            LAction(t.lv("Chia sẻ phong cách"), { a.share(t.lv("Mình là {style} trên Lexkite! Khám phá phong cách tiếng Anh của bạn tại {url}", "style" to t.lv(w.lStr("name")), "url" to "https://lexkite.com/app/#/style")) })
            LAction(t.lv("Làm lại"), a.restart)
        } else ui.questions.getOrNull(ui.index)?.let { q ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) { LBar(ui.index.toFloat() / ui.questions.size.coerceAtLeast(1)) }; VText("${ui.index + 1}/${ui.questions.size}", LKType.titlePill, c.onSurfaceVariant)
            }
            LKCard { VMuted(t.lv("Phong cách tiếng Anh của bạn")); VText(t.lv(q.lStr("q")), LKType.headlineSm) }
            q.lList("opts").forEachIndexed { k, o -> LChoice(t.lv(o.lStr("text")), if (ui.chosen == k) 1 else 0, ui.chosen == null, { a.pick(k) }, english = false) }
        }
    }
}

// ---------------------------------------------------------------- #/method – "Phương pháp học của Lexkite"
class MethodUi(val content: LearnContent, val result: Method.Result?, val days: Float, val hasPlacement: Boolean, val band: String)
class MethodActions(val days: (Float) -> Unit = {}, val open: (String) -> Unit = {})

@Composable
fun MethodRoute(env: WordEnv, onExit: () -> Unit, open: (String) -> Unit) {
    val content = remember { env.learn() }
    var result by remember { mutableStateOf<Method.Result?>(null) }
    var days by remember { mutableStateOf(7f) }
    var placement by remember { mutableStateOf(false) }
    var band by remember { mutableStateOf("") }
    LaunchedEffect(Unit) {
        val settings = env.settingsObj(); val grammar = env.grammar(); val ids = env.skillIds()
        val prompts = runCatching { env.writing().prompts.map { it.lStr("id") } }.getOrDefault(emptyList())
        val mistakes = env.mistakes().count { !((it["fixed"] as? JsonPrimitive)?.content == "true") }
        placement = settings["placement"] is JsonObject; band = settings.lObj("placement").lStr("band")
        result = Method.compute(Method.Input(env.now(), { CardMath.todayKey(it) }, env.cards().values.filter { it.lStr("word").isNotEmpty() }, env.stats().lObj("days"), env.gameObj(), settings, env.essayPrompts(), mistakes,
            ids.first, ids.second, grammar.index.map { it.lStr("id") }, prompts))
    }
    MethodLayout(MethodUi(content, result, days, placement, band), MethodActions(days = { days = it }, open = open), onExit)
}

@Composable
fun MethodLayout(ui: MethodUi, a: MethodActions, onExit: () -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    val r = ui.result
    fun go(h: String) = a.open(h.removePrefix("#/"))
    VScreen(t.lv("Phương pháp học của Lexkite"), onExit) {
        VMuted(t.lv("Mỗi tính năng dựa trên một nguyên lý đã được nghiên cứu về trí nhớ và thụ đắc ngôn ngữ – kèm số liệu thật của chính bạn để biết nên làm gì tiếp theo."))
        if (r == null) { VNotice(t(com.lexkite.app.i18n.generated.L10nKey.actionLoading)); return@VScreen }
        val m = ui.content.method
        // daily loop
        LKCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                VText(t.lv("Vòng lặp học mỗi ngày (~30 phút)"), LKType.headlineSm, modifier = Modifier.weight(1f)); VBadge(t.lv("Hôm nay {done}/{total}", "done" to r.loopDone, "total" to r.loop.size))
            }
            r.loop.forEachIndexed { i, s ->
                val meta = m.lList("loop").getOrNull(i)
                Row(Modifier.fillMaxWidth().padding(vertical = 2.dp), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.Top) {
                    VChip(if (s.done) "✓" else (i + 1).toString(), { go(s.href) }, selected = s.done)
                    Column(Modifier.weight(1f)) {
                        VText(t.lvj(meta?.get("title")), LKType.titlePill)
                        VMuted(t.lv(s.sub.key, *s.sub.vars.toList().toTypedArray())); VText(t.lvj(meta?.get("why")), LKType.labelBadge, c.secondary)
                    }
                }
            }
        }
        // memory
        val mem = r.memory; val d = ui.days.toInt()
        val pct = Math.round((if (mem.any) mem.at(d.toDouble()) else Method.recall(d.toDouble(), 3.0)) * 100).toInt()
        LKCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                VText(t.lv("Bộ nhớ từ vựng của bạn"), LKType.headlineSm, modifier = Modifier.weight(1f)); VChip(t.lv("Mục tiêu {pct}% →", "pct" to Math.round(SRSParams.FSRS5.retentionTarget * 100)), { a.open("settings") })
            }
            if (mem.any) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                MStat(mem.remembered.toString(), t.lv("từ đang nhớ")); MStat("${Math.round(mem.at(0.0) * 100)}%", t.lv("khả năng nhớ trung bình")); MStat(mem.due.toString(), t.lv("đến hạn ôn")); MStat(mem.learning.toString(), t.lv("đang ở bước học"))
            } else VMuted(t.lv("Bạn chưa có từ nào ở lịch ôn theo ngày. Dưới đây là đường cong của một từ mới học – hãy học vài từ để xem biểu đồ của chính bạn."))
            ForgettingCurve(mem, d.toDouble(), t.lv("Đường cong quên lãng"))
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { listOf(0, 7, 14, 30, 60).forEach { VMuted("${it}d") } }
            VMuted((if (mem.any) t.lv("Từ của bạn nếu ngừng ôn") else t.lv("Ví dụ 1 từ mới học")) + " · " + t.lv("Ôn đúng “thời điểm vàng” (FSRS)"))
            RichBody(t.lv("Nếu ngừng ôn <b id=\"mDays\">7</b> ngày → còn nhớ khoảng <b id=\"mPct\"></b>").replace("<b id=\"mDays\">7</b>", "<b>$d</b>").replace("<b id=\"mPct\"></b>", "<b>$pct%</b>") +
                (if (mem.any) " " + t.lv("(≈{n}/{total} từ)", "n" to Math.round(mem.at(d.toDouble()) * mem.remembered), "total" to mem.remembered) else ""), style = LKType.bodySm)
            Slider(ui.days, a.days, valueRange = 0f..60f, steps = 59, modifier = Modifier.semantics { contentDescription = d.toString() })
            VFlow {
                if (r.dueNow > 0) VChip(t.lv("Ôn {n} thẻ ngay", "n" to r.dueNow), { go("#/review") }, selected = true) else VChip(t.lv("Học từ mới"), { go("#/library") }, selected = true)
                if (r.forgetting > 0) VChip(t.lv("{n} từ sắp quên", "n" to r.forgetting), { go("#/deck?from=forget") })
            }
        }
        // strands
        val meta = mapOf("in" to Triple("Đầu vào có nghĩa", "Đọc, nghe", "Nghe 1 phần"), "out" to Triple("Đầu ra có nghĩa", "Nói, viết, tự đặt câu", "Luyện Speaking"),
            "lang" to Triple("Tập trung ngôn ngữ", "Flashcard, ngữ pháp, phát âm", "Học ngữ pháp"), "flu" to Triple("Luyện trôi chảy", "Ghép thẻ tính giờ, chép chính tả, thi thử", "Ghép thẻ tính giờ"))
        val href = mapOf("in" to r.hListening, "out" to r.hSpeak, "lang" to r.hGrammar, "flu" to "#/practice/match?src=deck")
        LKCard {
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { VText(t.lv("Cân bằng 4 mạch học"), LKType.headlineSm); VMuted(t.lv("· 7 ngày qua")) }
            VMuted(t.lv("Paul Nation (2007): một chương trình hiệu quả chia thời gian gần đều cho 4 mạch. Thiếu mạch nào thì tiến bộ chậm ở mạch đó."))
            r.strands.forEach { s ->
                val x = meta.getValue(s.id)
                Column { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { VText(t.lv(x.first), LKType.titlePill); VMuted("${s.pct}%") }; LBar(s.pct / 100f, tint = if (s.weak) c.tertiary else c.secondary); VMuted(t.lv(x.second)) }
            }
            val wk = r.weakest; val w = wk?.let { meta[it] }
            if (w != null && r.strands.sumOf { it.pct } > 0) { LNote(t.lv("Mạch đang thiếu: <b>{name}</b>.", "name" to t.lv(w.first)).noTags(), c.tertiary); LAction(t.lv(w.third) + " →", { go(href[wk] ?: "#/home") }) }
            else LNote(t.lv("Bắt đầu học để xem bạn đang cân bằng thế nào giữa 4 mạch."))
        }
        // plan
        val stage = r.stage?.takeIf { it in listOf("s0", "s1", "s2", "s3") } ?: "s1"
        val plan = m.lObj("plans").lObj(stage); val items = plan.lList("items")
        LKCard {
            VText(t.lv("Lộ trình gợi ý: {name}", "name" to t.lv(plan.lObj("name").lObj("v").lStr("name"))), LKType.headlineSm)
            if (ui.hasPlacement) VBadge(t.lv("Band đầu vào {band}", "band" to ui.band)) else LAction(t.lv("Kiểm tra trình độ để cá nhân hóa"), { a.open("placement") }, primary = true)
            items.forEach { it -> Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) { VChip("${it.lInt("min")}′", { go(it.lStr("href")) }); VText(t.lvj(it["label"]), LKType.bodyMd, modifier = Modifier.weight(1f)) } }
            VMuted(t.lv("Tổng ~{n} phút/ngày. Đều đặn mỗi ngày hiệu quả hơn học dồn cuối tuần.", "n" to items.sumOf { it.lInt("min") }))
            LAction(t.lv("Xem Lộ trình chi tiết →"), { a.open("path") })
        }
        // principles
        VText(t.lv("12 nguyên lý & cách Lexkite áp dụng"), LKType.headlineMd)
        m.lList("principles").forEachIndexed { i, p ->
            val stat = r.stats.getOrNull(i)
            LKCard {
                VText(t.lvj(p["title"]), LKType.headlineSm); VMuted(t.lvj(p["who"])); VText(t.lvj(p["idea"]), LKType.bodySm)
                RichBody(t.lv("Trong Lexkite:") + " " + t.lvj(p["how"]).replace("{ic}", ""), style = LKType.bodySm)
                if (stat != null) VBadge(t.lv(stat.key, *stat.vars.toList().toTypedArray()))
                VFlow { p.lList("links").forEachIndexed { k, l -> VChip(t.lvj(l["label"]) + " →", { go(resolve(r, l.lStr("href"))) }, selected = k == 0) } }
            }
        }
        LKCard {
            VText(t.lv("Câu hỏi thường gặp"), LKType.headlineSm)
            m.lList("faq").forEach { f ->
                var open by remember { mutableStateOf(false) }
                VChip(t.lvj(f["q"]), { open = !open }, selected = open)
                if (open) VText(t.lvj(f["a"]).noTags(), LKType.bodySm)
            }
        }
    }
}

/** the links of a principle: the web passes the next reading / listening / speaking / writing item (the fall-backs are the list pages) */
private fun resolve(r: Method.Result, href: String): String = when (href) { "#/reading" -> r.hReading; "#/listening" -> r.hListening; "#/speaking" -> r.hSpeak; "#/write" -> r.hWrite; else -> href }

@Composable
private fun MStat(v: String, l: String) { Column(horizontalAlignment = Alignment.CenterHorizontally) { VText(v, LKType.headlineSm); VMuted(l) } }

/** The forgetting curve of the memory card (web `curveSvg`): the learner's average recall over 60 days, the "golden moment" review saw-tooth and a marker at the chosen day. */
@Composable
private fun ForgettingCurve(mem: Method.Memory, mark: Double, label: String) {
    val c = LocalLKColors.current
    val keep = SRSParams.FSRS5.retentionTarget
    Canvas(Modifier.fillMaxWidth().aspectRatio(560f / 190f).semantics { contentDescription = label }) {
        val W = 560.0; val H = 190.0; val P = 34.0; val days = 60.0; val k = size.width / W.toFloat()
        fun x(d: Double) = ((P + d / days * (W - P - 10)) * k).toFloat()
        fun y(r: Double) = ((12 + (1 - r) * (H - 40)) * k).toFloat()
        val f: (Double) -> Double = if (mem.any) { d -> mem.at(d) } else { d -> Method.recall(d, 3.0) }
        for (r in listOf(1.0, 0.8, 0.6, 0.4)) drawLine(c.outlineVariant, Offset((P * k).toFloat(), y(r)), Offset(((W - 10) * k).toFloat(), y(r)), 1f)
        val saw = Path(); saw.moveTo(x(0.0), y(maxOf(keep, f(0.0))))
        var t0 = 0.0; var s = 2.0
        while (t0 < days) {
            val ivl = maxOf(1.0, Method.interval(s, keep)); val t2 = minOf(days, t0 + ivl)
            var d = t0 + 1; while (d <= t2) { saw.lineTo(x(d), y(Method.recall(d - t0, s))); d += 1 }
            saw.lineTo(x(t2), y(1.0)); t0 = t2; s *= 2.6
        }
        drawPath(saw, c.success.copy(alpha = 0.85f), style = Stroke(2f * k, pathEffect = PathEffect.dashPathEffect(floatArrayOf(4f * k, 3f * k))))
        val p = Path(); for (d in 0..60) { val px = x(d.toDouble()); val py = y(f(d.toDouble())); if (d == 0) p.moveTo(px, py) else p.lineTo(px, py) }
        drawPath(p, c.secondary, style = Stroke(3f * k))
        drawLine(c.tertiary, Offset(x(mark), 10f * k), Offset(x(mark), ((H - 26) * k).toFloat()), 2f * k)
        drawCircle(c.tertiary, 5f * k, Offset(x(mark), y(f(mark))))
    }
}
