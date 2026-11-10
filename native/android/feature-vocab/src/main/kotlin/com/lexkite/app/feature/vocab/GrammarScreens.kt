package com.lexkite.app.feature.vocab

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.write.DrillOutcome
import com.lexkite.app.core.write.GrammarCore
import com.lexkite.app.core.write.GrammarPack
import com.lexkite.app.core.write.lArr
import com.lexkite.app.core.write.lInt
import com.lexkite.app.core.write.lList
import com.lexkite.app.core.write.lObj
import com.lexkite.app.core.write.lStr
import com.lexkite.app.core.write.lStrs
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import androidx.compose.foundation.layout.heightIn
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** the lesson title in the UI language: Vietnamese -> the Vietnamese title; others -> the translated title, else the English one (never a Vietnamese leftover) */
internal fun L10n.lessonTitle(x: JsonObject): String = if (lang == "vi") x.lStr("title") else lv(x.lStr("title")).let { if (it != x.lStr("title")) it else x.lStr("en") }
internal fun L10n.lessonSub(x: JsonObject): String = if (lang == "vi") x.lStr("en") else if (lessonTitle(x) != x.lStr("en")) x.lStr("en") else ""

private fun queryOf(q: String): Map<String, String> = q.split('&').filter { it.contains('=') }.associate { it.substringBefore('=') to it.substringAfter('=') }

/** #/grammar (hub) · #/grammar/mix[?ch=&n=] · #/grammar/<lesson>[?view=full] */
@Composable
fun GrammarRoute(env: WordEnv, arg: String, query: String, onExit: () -> Unit, open: (String) -> Unit) {
    var pack by remember { mutableStateOf<GrammarPack?>(null) }
    var game by remember { mutableStateOf(JsonObject(emptyMap())) }
    var ver by remember { mutableStateOf(0) }
    LaunchedEffect(arg, ver) { pack = env.grammar(); game = env.gameObj() }
    val p = pack
    if (p == null) { VScreen(LocalL10n.current.lv("Ngữ pháp"), onExit) { VNotice(LocalL10n.current.western()(L10nKey.actionLoading)) }; return }
    val q = queryOf(query)
    when {
        arg == "mix" -> GrammarMixRoute(env, p, game, q["ch"]?.toIntOrNull(), q["n"]?.toIntOrNull() ?: 20, onExit, open)
        arg.isNotEmpty() -> GrammarLessonRoute(env, p, arg, q["view"] == "full", game, onExit, open) { ver++ }
        else -> GrammarHubLayout(p, (game.lObj("grammarDone")).mapValues { (it.value as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt() ?: 0 }, open, onExit)
    }
}

// ---------------------------------------------------------------- hub
@Composable
fun GrammarHubLayout(pack: GrammarPack, done: Map<String, Int>, open: (String) -> Unit, onExit: () -> Unit, initialTab: String = "all") {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    var tab by remember { mutableStateOf(initialTab) }
    val order = pack.order
    val next = order.firstOrNull { (done[it.first.lStr("id")] ?: 100) < GrammarCore.PASS_PCT && done.containsKey(it.first.lStr("id")) } ?: order.firstOrNull { !done.containsKey(it.first.lStr("id")) }
    val nDone = done.count { it.value >= GrammarCore.PASS_PCT }
    val openCh = remember(next) { mutableStateOf(setOfNotNull(next?.second?.lInt("n"))) }
    VScreen(t.lv("Ngữ pháp"), onExit) {
        VMuted(t.lv("{n} bài học trực quan: dòng thời gian, công thức tô màu, sơ đồ biến đổi câu, lỗi người Việt hay mắc và bài tập chấm điểm ngay.", "n" to pack.index.size))
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { LBar(if (pack.index.isEmpty()) 0f else nDone.toFloat() / pack.index.size) }; VText("$nDone/${pack.index.size}", LKType.titlePill)
        }
        next?.let { (x, ch) ->
            val last = done[x.lStr("id")]
            LKCard {
                VText(if (last != null) t.lv("Làm lại cho chắc · lần trước {pct}%", "pct" to last) else t.lv("Bài tiếp theo"), LKType.labelMetric, c.secondary)
                VText(x.lStr("emoji") + " " + t.lessonTitle(x), LKType.headlineSm)
                VMuted(t.lv("Chương {n}", "n" to ch.lInt("n")) + " · " + t.lv(ch.lStr("name")))
                LAction(t.lv("Học ngay"), { open("grammar/" + x.lStr("id")) }, primary = true)
            }
        }
        VFlow {
            VChip(t.lv("Tất cả {n} bài", "n" to pack.index.size), { tab = "all" }, selected = tab == "all")
            VChip(t.lv("Trọng tâm IELTS 7.0+"), { tab = "ielts" }, selected = tab == "ielts")
            VChip(t.lv("Bí kíp TOEIC Part 5 & 6"), { tab = "toeic" }, selected = tab == "toeic")
        }
        @Composable fun Row1(x: JsonObject) {
            val d = done[x.lStr("id")]
            Row(Modifier.fillMaxWidth().tactileRow { open("grammar/" + x.lStr("id")) }, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                VText(x.lStr("emoji"), LKType.titlePill)
                Column(Modifier.weight(1f)) { VText(t.lessonTitle(x), LKType.titlePill); t.lessonSub(x).takeIf { it.isNotEmpty() }?.let { Ltr { VMuted(it) } } }
                VBadge(x.lStr("level"), c.tertiaryContainer, c.onTertiaryContainer)
                if (d != null) VBadge((if (d >= GrammarCore.PASS_PCT) "✓ " else "") + "$d%", if (d >= GrammarCore.PASS_PCT) c.success.copy(alpha = 0.2f) else c.surfaceContainerHighest)
            }
        }
        if (tab != "all") {
            val ls = (pack.focus[tab] ?: emptyList()).mapNotNull { pack.entry(it) }
            LKCard {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { VText(if (tab == "ielts") t.lv("Trọng tâm IELTS 7.0+") else t.lv("Bí kíp TOEIC Part 5 & 6"), LKType.titlePill); VMuted("${ls.count { (done[it.lStr("id")] ?: 0) >= GrammarCore.PASS_PCT }}/${ls.size}") }
                ls.forEach { Row1(it) }
            }
        }
        if (pack.chapters.isEmpty() || pack.index.isEmpty()) LKCard { VMuted(t.lv("Đang cập nhật bài học…")) }
        pack.chapters.forEach { ch ->
            val ls = pack.lessonsOf(ch); val n = ch.lInt("n"); val isOpen = n in openCh.value
            LKCard {
                Row(Modifier.fillMaxWidth().tactileRow { openCh.value = if (isOpen) openCh.value - n else openCh.value + n }, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                    VText(ch.lStr("emoji"), LKType.titlePill)
                    Column(Modifier.weight(1f)) { VText(t.lv("Chương {n}", "n" to n) + " · " + t.lv(ch.lStr("name")), LKType.titlePill); VMuted(t.lv(ch.lStr("desc"))) }
                    VMuted("${ls.count { (done[it.lStr("id")] ?: 0) >= GrammarCore.PASS_PCT }}/${ls.size}"); VText(if (isOpen) "⌃" else "⌄", LKType.titlePill)
                }
                if (isOpen) {
                    ls.forEach { Row1(it) }
                    Row(Modifier.fillMaxWidth().tactileRow { open("grammar/mix?ch=$n") }, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                        VText("📝", LKType.titlePill); Column { VText(t.lv("Kiểm tra chương"), LKType.titlePill); VMuted(t.lv("Trộn câu hỏi của cả chương")) }
                    }
                }
            }
        }
        VText(t.lv("Kiểm tra tổng hợp"), LKType.headlineSm)
        LKCard(onClick = { open("grammar/mix") }) { VText("🔀 " + t.lv("Đề tổng hợp {n} câu", "n" to 20), LKType.titlePill); VMuted(t.lv("Trộn câu hỏi từ các bài đã học (hoặc mọi bài)")) }
        LKCard(onClick = { open("grammar/mix?n=40") }) { VText("🏁 " + t.lv("Đề tổng hợp {n} câu", "n" to 40), LKType.titlePill); VMuted(t.lv("Ôn toàn bộ chương trình – như bài thi cuối khóa")) }
        VText("🧰 " + t.lv("Công cụ ngữ pháp"), LKType.headlineSm)
        LKCard(onClick = { open("verb") }) { VText(t.lv("Chia động từ"), LKType.titlePill); VMuted(t.lv("Mọi thì, bị động, cách đọc -ed/-s")) }
        LKCard(onClick = { open("fix") }) { VText(t.lv("Sửa ngữ pháp"), LKType.titlePill); VMuted(t.lv("Dán đoạn văn – gạch chân lỗi, sửa 1 chạm")) }
    }
}

private fun Modifier.tactileRow(onClick: () -> Unit): Modifier = this.heightIn(min = MinTap).tactile(onClick)

// ---------------------------------------------------------------- one lesson
class LessonState(val pack: GrammarPack, val id: String, val full: Boolean, private val shuffle: Boolean = true, step: Int = 0) {
    val lesson: JsonObject? get() = pack.lessons[id]
    val entry: JsonObject? get() = pack.entry(id)
    fun blocks(vararg types: String): List<JsonObject> = lesson.lList("blocks").filter { it.lStr("type") in types }
    val quiz: List<JsonObject> get() = lesson.lList("quiz")
    val drillList: List<JsonObject> get() = lesson.lList("drills")
    val check: List<String>? get() = pack.check[id]
    var cur by mutableStateOf(step)
    private fun <T> sh(l: List<T>): List<T> = if (shuffle) l.shuffled() else l
    val formulaOrder: List<Int> = blocks("formula").firstOrNull()?.lList("rows")?.firstOrNull()?.let { sh(it.lList("parts").indices.toList()) } ?: emptyList()
    var formulaNext by mutableStateOf(0)
    var formulaWrong by mutableStateOf(false)
    var gateSkipped by mutableStateOf(false)
    val revealedUses = mutableStateListOf<Int>(); val revealedMistakes = mutableStateListOf<Int>()
    val builds: List<String> = run {
        val s = (blocks("formula").flatMap { b -> b.lList("rows").map { it.lStr("ex") } } + blocks("uses").flatMap { b -> b.lList("items").map { it.lStr("ex") } }).filter { it.isNotEmpty() }.map { GrammarCore.plain(it) }.filter { GrammarCore.tokens(it).size in 5..12 }.distinct()
        sh(s).take(3)
    }
    val pool: List<List<Pair<Int, String>>> = builds.map { s -> sh(GrammarCore.tokens(s).mapIndexed { i, w -> i to w }) }
    val built = builds.map { mutableStateListOf<Int>() }
    val arrangeOk = builds.map { mutableStateOf<Boolean?>(null) }
    val quizPicked = mutableStateMapOf<Int, Int>()
    var quizSummary by mutableStateOf<Triple<Int, Int, Int>?>(null)
    val drills = mutableStateListOf<DrillState>().also { l -> repeat(drillList.size) { l.add(DrillState()) } }
    var drillSummary by mutableStateOf<Triple<Int, Int, Int>?>(null)
    var ownText by mutableStateOf("")
    var ownShort by mutableStateOf(false)
    var ownResult by mutableStateOf<Triple<Boolean, String, Boolean>?>(null)
    val steps: List<String> get() = buildList {
        add("visual"); if (blocks("formula").firstOrNull()?.lList("rows")?.isNotEmpty() == true) add("build"); if (blocks("uses").isNotEmpty()) add("uses"); if (blocks("signals", "table", "tip", "ielts").isNotEmpty()) add("extras")
        if (blocks("mistake").isNotEmpty()) add("mistakes"); if (builds.isNotEmpty()) add("arrange"); if (drillList.isNotEmpty()) add("drills"); add("quiz"); if (check != null) add("own")
    }
    val step: String get() = steps[minOf(cur, steps.size - 1)]
    val gateOpen: Boolean get() = step != "build" || formulaNext >= formulaOrder.size || gateSkipped
    fun jump(k: Int) { if (k <= cur || steps.subList(cur, k).none { it == "build" } || gateOpen) { cur = k; gateSkipped = false } }
    fun go(d: Int) { val n = cur + d; if (n in steps.indices) { cur = n; gateSkipped = false } }
    fun pickFormula(part: Int) { if (formulaNext >= formulaOrder.size) return; if (part == formulaNext) { formulaNext++; formulaWrong = false } else formulaWrong = true }
    fun arrangeTap(k: Int, j: Int) {
        if (arrangeOk[k].value != null || j in built[k]) return
        built[k].add(j); val w = GrammarCore.tokens(builds[k])
        if (built[k].size == w.size) arrangeOk[k].value = built[k].map { w[it] } == w
    }
    fun arrangeReset(k: Int) { built[k].clear(); arrangeOk[k].value = null }
}

@Composable
fun GrammarLessonRoute(env: WordEnv, pack: GrammarPack, id: String, full: Boolean, game: JsonObject, onExit: () -> Unit, open: (String) -> Unit, changed: () -> Unit) {
    val st = remember(pack, id, full) { LessonState(pack, id, full) }
    val scope = rememberCoroutineScope()
    val io = GrammarIo(
        speak = { env.speak(GrammarCore.plain(it)) },
        quiz = { q, v ->
            if (st.quizPicked[q] == null && q < st.quiz.size) {
                st.quizPicked[q] = v
                val item = st.quiz[q]; val opts = item.lStrs("options"); val ans = item.lInt("answer")
                scope.launch {
                    if (v != ans) env.logMistake(GrammarCore.mistake(item.lStr("q"), opts.getOrElse(ans) { "" }, opts.getOrElse(v) { "" }, item.lStr("explain"), id))
                    if (st.quizPicked.size == st.quiz.size) {
                        val right = st.quiz.indices.count { st.quizPicked[it] == st.quiz[it].lInt("answer") }
                        val pct = GrammarCore.pct(right, st.quiz.size); val xp = GrammarCore.quizXp(right)
                        saveDone(env, id, pct)
                        env.reward(mapOf("quizzes" to 1, "grammar" to 1, "perfect" to (if (pct == 100) 1 else 0)), xp)
                        st.quizSummary = Triple(right, pct, xp); changed()
                    }
                }
            }
        },
        quizAgain = { st.quizPicked.clear(); st.quizSummary = null },
        drill = { i, picked ->
            val d = st.drillList[i]; val cur = st.drills[i]
            if (cur.outcome == null) {
                val o = GrammarCore.grade(d, cur.input, picked, st.check?.firstOrNull()) { w -> w in knownWords }
                if (o is DrillOutcome.TooShort) st.drills[i] = DrillState(cur.input, null, null, true)
                else if (o is DrillOutcome.Graded) {
                    st.drills[i] = DrillState(cur.input, picked, o, false)
                    scope.launch {
                        if (!o.ok) env.logMistake(GrammarCore.mistake(if (d.lStr("t") == "error") d.lStrs("parts").joinToString(" ") else d.lStr("q"), o.answer, o.given, d.lStr("ex"), id))
                        if (st.drills.all { it.outcome != null }) {
                            val right = st.drills.count { (it.outcome as? DrillOutcome.Graded)?.ok == true }
                            val pct = GrammarCore.pct(right, st.drills.size); val xp = GrammarCore.drillXp(right)
                            env.reward(mapOf("quizzes" to 1, "grammar" to 1, "writes" to 1, "perfect" to (if (pct == 100) 1 else 0)), xp)
                            st.drillSummary = Triple(right, pct, xp)
                        }
                    }
                }
            }
        },
        drillInput = { i, s -> if (st.drills[i].outcome == null) st.drills[i] = DrillState(s, st.drills[i].picked, null, false) },
        own = {
            val pat = st.check?.firstOrNull()
            val s = st.ownText.trim().split(Regex("\\s+")).filter { it.isNotEmpty() }.joinToString(" ")
            if (pat != null) {
                if (s.split(" ").size < 4 || !Regex("[A-Za-z]").containsMatchIn(s)) { st.ownShort = true; st.ownResult = null }
                else {
                    st.ownShort = false; val hit = GrammarCore.ownHit(s, pat)
                    if (hit.isEmpty()) st.ownResult = Triple(false, "", false)
                    else scope.launch {
                        val key = "$id|" + s.lowercase(); val g = env.gameObj(); val gch = g.lObj("gch"); val first = !gch.containsKey(key)
                        if (first) { env.putGame(JsonObject(LinkedHashMap(g).also { m -> m["gch"] = JsonObject(LinkedHashMap(gch).also { it[key] = JsonPrimitive(1) }) })); env.reward(emptyMap(), 15) }
                        st.ownResult = Triple(true, hit, first)
                    }
                }
            }
        },
    )
    GrammarLessonLayout(st, game, io, open, onExit)
}

private val knownWords: Set<String> = emptySet()
private suspend fun saveDone(env: WordEnv, id: String, pct: Int) {
    val g = env.gameObj(); val gd = g.lObj("grammarDone"); val old = (gd[id] as? JsonPrimitive)?.content?.toDoubleOrNull()?.toInt() ?: 0
    env.putGame(JsonObject(LinkedHashMap(g).also { m -> m["grammarDone"] = JsonObject(LinkedHashMap(gd).also { it[id] = JsonPrimitive(maxOf(pct, old)) }) }))
}

class GrammarIo(
    val speak: (String) -> Unit = {}, val quiz: (Int, Int) -> Unit = { _, _ -> }, val quizAgain: () -> Unit = {}, val drill: (Int, Int?) -> Unit = { _, _ -> }, val drillInput: (Int, String) -> Unit = { _, _ -> }, val own: () -> Unit = {},
)

@Composable
fun GrammarLessonLayout(st: LessonState, game: JsonObject, io: GrammarIo, open: (String) -> Unit, onExit: () -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    val entry = st.entry ?: JsonObject(emptyMap())
    val order = st.pack.order.map { it.first.lStr("id") }; val at = order.indexOf(st.id)
    val prev = order.getOrNull(at - 1)?.takeIf { at > 0 }?.let { st.pack.entry(it) }; val next = order.getOrNull(at + 1)?.let { st.pack.entry(it) }
    VScreen(if (entry.isNotEmpty()) t.lessonTitle(entry) else t.lv("Ngữ pháp"), onExit) {
        if (st.lesson == null) { VNotice(t(L10nKey.syncOffline)); return@VScreen }
        @Composable fun hero() = LKCard {
            val ch = st.pack.chapterOf(st.id)
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                VText(entry.lStr("emoji"), LKType.headlineLg)
                Column {
                    VMuted(t.lv("Chương {n}", "n" to ch.lInt("n")) + " · " + t.lv(ch.lStr("name")) + " · " + entry.lStr("level"))
                    VText(t.lessonTitle(entry), LKType.headlineMd); t.lessonSub(entry).takeIf { it.isNotEmpty() }?.let { Ltr { VText(it, LKType.titlePill, c.secondary) } }
                }
            }
            VText(t.lv(entry.lStr("summary")), LKType.bodyMd)
        }
        if (st.full) {
            LAction(t.lv("Học từng bước"), { open("grammar/" + st.id) })
            hero()
            st.lesson.lList("blocks").forEach { GrammarBlock(it, io.speak) }
            l1Note(st, t.lang)
            QuizCard(st, io, next, open); if (st.drillList.isNotEmpty()) DrillsCard(st, io); if (st.check != null) OwnCard(st, io)
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                prev?.let { LAction("← " + t.lessonTitle(it), { open("grammar/" + it.lStr("id") + "?view=full") }, modifier = Modifier.weight(1f)) }
                next?.let { LAction(t.lessonTitle(it) + " →", { open("grammar/" + it.lStr("id") + "?view=full") }, primary = true, modifier = Modifier.weight(1f)) }
            }
            return@VScreen
        }
        LAction(t.lv("Xem toàn bài"), { open("grammar/" + st.id + "?view=full") })
        if (st.cur == 0) hero()
        // step dots
        val names = mapOf("visual" to ("👀" to t.lv("Hình dung")), "build" to ("🧮" to t.lv("Ghép công thức")), "uses" to ("🎯" to t.lv("Cách dùng")), "extras" to ("💡" to t.lv("Mẹo & dấu hiệu")), "mistakes" to ("🕵️" to t.lv("Bắt lỗi")),
            "arrange" to ("🧩" to t.lv("Xếp câu")), "drills" to ("✍️" to t.lv("Tự luận")), "quiz" to ("✏️" to t.lv("Luyện tập")), "own" to ("💬" to t.lv("Tự đặt câu")))
        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            st.steps.forEachIndexed { k, s -> val n = names.getValue(s); VChip(if (k < st.cur) "✓" else n.first + if (k == st.cur) " " + n.second else "", { st.jump(k) }, selected = k == st.cur) }
        }
        when (st.step) {
            "visual" -> { st.blocks("timeline", "diagram", "scale", "sort").forEach { GrammarBlock(it, io.speak) }; LKCard { LNote("🧠 " + t.lv("Ghi nhớ:") + " " + t.lv(entry.lStr("summary"))) } }
            "build" -> BuildStep(st, io)
            "uses" -> UsesStep(st, io)
            "extras" -> st.blocks("signals", "table", "tip", "ielts").forEach { GrammarBlock(it, io.speak) }
            "mistakes" -> LKCard {
                VMuted(t.lv("Đọc câu sai, tự tìm lỗi trong đầu rồi bấm để kiểm tra – cách nhớ lâu nhất là tự phát hiện."))
                st.blocks("mistake").forEachIndexed { i, m ->
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { VText("✗", LKType.titlePill, c.error); Ltr { androidx.compose.material3.Text(m.lStr("wrong"), style = LKType.bodyMd.toCompose().copy(textDecoration = TextDecoration.LineThrough), color = c.error) } }
                    if (i in st.revealedMistakes) GrammarBlock(m, io.speak) else LAction(t.lv("Tôi đã tìm ra lỗi – xem đáp án"), { st.revealedMistakes.add(i) })
                }
            }
            "arrange" -> ArrangeStep(st)
            "drills" -> DrillsCard(st, io)
            "quiz" -> QuizCard(st, io, next, open)
            "own" -> OwnCard(st, io)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            if (st.cur > 0) LAction("← " + t.lv("Quay lại"), { st.go(-1) }, modifier = Modifier.weight(1f))
            if (st.cur < st.steps.size - 1) {
                if (st.step == "build" && !st.gateOpen) LAction(t.lv("Bỏ qua"), { st.gateSkipped = true }, modifier = Modifier.weight(1f))
                LAction(t.lv("Tiếp tục") + " →", { st.go(1) }, primary = true, enabled = st.gateOpen, modifier = Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun l1Note(st: LessonState, lang: String) {
    val d = st.pack.l1[lang] ?: return
    val notes = d.lObj("notes").lArr(st.id)
    if (notes.isEmpty()) return
    val c = LocalLKColors.current
    LKCard {
        VText("🌐 " + d.lStr("title"), LKType.titlePill)
        notes.forEach { n -> val a = n.lStrs(); if (a.size >= 3) Column { Ltr { VText("✗ " + a[0], LKType.bodyMd, c.error); VText("✓ " + a[1], LKType.bodyMd) }; VMuted(a[2]) } }
    }
}

@Composable
private fun BuildStep(st: LessonState, io: GrammarIo) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    val row = st.blocks("formula").firstOrNull()?.lList("rows")?.firstOrNull() ?: return
    val parts = row.lList("parts")
    LKCard {
        VText("🧮 " + t.lv("Bấm các mảnh theo đúng thứ tự để tạo công thức “{label}”", "label" to row.lStr("label")), LKType.titlePill)
        VFlow { for (k in 0 until st.formulaNext) { if (k > 0) VMuted("+"); LPill(parts[k].lStr("t"), partTone(parts[k].lStr("c"), c)) } }
        if (st.formulaNext < st.formulaOrder.size) {
            VFlow { st.formulaOrder.filter { it >= st.formulaNext }.forEach { k -> LPill(parts[k].lStr("t"), partTone(parts[k].lStr("c"), c), onClick = { st.pickFormula(k) }) } }
            if (st.formulaWrong) LNote(t.lv("Chưa đúng"), c.error)
        } else { LNote("✓ " + t.lv("Chính xác!"), c.success); st.blocks("formula").firstOrNull()?.let { GrammarBlock(it, io.speak) } }
    }
}

@Composable
private fun UsesStep(st: LessonState, io: GrammarIo) {
    val t = LocalL10n.current.western()
    val items = st.blocks("uses").firstOrNull()?.lList("items") ?: return
    LKCard {
        VTitle("🎯 " + t.lv("Khi nào dùng?")); VMuted(t.lv("Bấm vào từng thẻ để xem ví dụ"))
        items.forEachIndexed { i, u ->
            Column(Modifier.fillMaxWidth().tactileRow { if (i !in st.revealedUses) st.revealedUses.add(i); io.speak(u.lStr("ex")) }) {
                VText("${i + 1}. " + u.lStr("title"), LKType.titlePill)
                if (i in st.revealedUses) { Ltr { VText(GrammarCore.plain(u.lStr("ex")), LKType.bodyMd) }; VMuted(u.lStr("vi")) }
            }
        }
    }
}

@Composable
private fun ArrangeStep(st: LessonState) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    LKCard {
        VTitle("🧩 " + t.lv("Xếp các từ thành câu đúng"))
        st.builds.forEachIndexed { k, s ->
            val words = GrammarCore.tokens(s); val ok = st.arrangeOk[k].value
            VFlow { st.built[k].forEach { j -> VChip(words[j], { }, selected = ok != null) } }
            if (ok == null) VFlow { st.pool[k].forEach { (j, w) -> if (j !in st.built[k]) VChip(w, { st.arrangeTap(k, j) }) } }
            else LNote((if (ok) "✓ " + t.lv("Chính xác!") else "✗ " + t.lv("Đáp án: <i>{a}</i>", "a" to s).noTags()), if (ok) c.success else c.error)
            LAction(t.lv("Làm lại"), { st.arrangeReset(k) })
        }
    }
}

@Composable
private fun QuizCard(st: LessonState, io: GrammarIo, next: JsonObject?, open: (String) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    LKCard {
        VTitle("✏️ " + t.lv("Luyện tập ({n} câu)", "n" to st.quiz.size))
        st.quiz.forEachIndexed { qi, q ->
            val opts = q.lStrs("options"); val picked = st.quizPicked[qi]; val ans = q.lInt("answer")
            Ltr { VText("${qi + 1}. " + q.lStr("q"), LKType.titlePill) }
            opts.forEachIndexed { j, o -> LChoice(o, if (picked != null && j == ans) 1 else if (picked == j) 2 else 0, picked == null, { io.quiz(qi, j) }) }
            if (picked != null) { if (picked == ans) LNote(q.lStr("explain"), c.success) else LNote(t.lv("Bạn chọn:") + " " + opts.getOrElse(picked) { "" } + " · " + t.lv("Đáp án: <b>{a}</b>", "a" to opts.getOrElse(ans) { "" }).noTags() + " – " + q.lStr("explain"), c.error) }
        }
        st.quizSummary?.let { (right, pct, xp) ->
            LNote(t.lv("{right}/{total} câu đúng ({pct}%)", "right" to right, "total" to st.quiz.size, "pct" to pct) + " · +$xp XP", if (pct >= GrammarCore.PASS_PCT) c.success else c.tertiary)
            if (pct < GrammarCore.PASS_PCT) VMuted(t.lv("Xem lại phần công thức và lỗi hay gặp rồi làm lại nhé. Câu sai đã vào Sổ lỗi sai."))
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                LAction(t.lv("Làm lại"), io.quizAgain, modifier = Modifier.weight(1f))
                if (right < st.quiz.size) LAction(t.lv("Sổ lỗi sai"), { open("mistakes") }, modifier = Modifier.weight(1f))
            }
            next?.let { LAction(t.lv("Bài tiếp theo") + " →", { open("grammar/" + it.lStr("id")) }, primary = true) }
            val f = st.blocks("formula").firstOrNull()?.lList("rows")?.firstOrNull(); val m = st.blocks("mistake").firstOrNull()
            VText("🧠 " + t.lv("Tóm tắt bài học"), LKType.titlePill); VMuted(t.lv(st.entry.lStr("summary")))
            if (f != null) Ltr { VText(f.lList("parts").joinToString(" + ") { it.lStr("t") }, LKType.labelMetric) }
            if (m != null) Ltr { VMuted("✗ " + m.lStr("wrong") + "  →  ✓ " + m.lStr("right")) }
        }
    }
}

@Composable
private fun DrillsCard(st: LessonState, io: GrammarIo) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    LKCard {
        VTitle("🖋 " + t.lv("Bài tập tự luận ({n} câu)", "n" to st.drillList.size))
        st.drillList.forEachIndexed { i, d -> DrillCard(d, st.drills[i], { io.drillInput(i, it) }, { p -> io.drill(i, p) }) }
        st.drillSummary?.let { (right, pct, xp) -> LNote(t.lv("{right}/{total} câu đúng ({pct}%)", "right" to right, "total" to st.drillList.size, "pct" to pct) + " · +$xp XP", if (pct >= GrammarCore.PASS_PCT) c.success else c.tertiary) }
    }
}

@Composable
private fun OwnCard(st: LessonState, io: GrammarIo) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    val chk = st.check ?: return
    LKCard {
        VTitle("✍️ " + t.lv("Thử thách tự đặt câu"))
        VMuted(t.lv("Đặt một câu hoàn chỉnh sử dụng cấu trúc bạn vừa học") + " · " + chk.getOrElse(1) { "" })
        VField(st.ownText, { st.ownText = it }, t.lv("Gõ câu tiếng Anh của bạn…"), singleLine = false, lines = 3)
        LAction(t.lv("Kiểm tra câu"), io.own, primary = true)
        if (st.ownShort) LNote(t.lv("Hãy viết một câu hoàn chỉnh (ít nhất 4 từ)."))
        st.ownResult?.let { (ok, _, first) ->
            if (ok) LNote("✓ " + t.lv("Tuyệt! Bạn đã dùng đúng cấu trúc của bài.") + (if (first) " +15 XP" else ""), c.success)
            else { LNote("✗ " + t.lv("Chưa thấy cấu trúc của bài trong câu.") + " " + t.lv("Công thức") + ": " + chk.getOrElse(1) { "" }, c.error); VMuted(t.lv("Gợi ý: xem lại ví dụ ở phần “Cách dùng”, rồi viết lại câu theo đúng công thức.")) }
        }
    }
}

// ---------------------------------------------------------------- mixed test
class MixItem(val q: JsonObject?, val d: JsonObject?, val lesson: JsonObject)
class MixState(val pack: GrammarPack, val items: List<MixItem>, at: Int = 0) {
    var i by mutableStateOf(at); var right by mutableStateOf(0); var picked by mutableStateOf<Int?>(null); var drill by mutableStateOf(DrillState())
    var summary by mutableStateOf<Triple<Int, Int, Int>?>(null)
    val current: MixItem? get() = items.getOrNull(i)
    val answered: Boolean get() = if (current?.q != null) picked != null else drill.outcome != null
}

@Composable
private fun GrammarMixRoute(env: WordEnv, pack: GrammarPack, game: JsonObject, chapter: Int?, count: Int, onExit: () -> Unit, open: (String) -> Unit) {
    var round by remember { mutableStateOf(0) }
    val st = remember(pack, chapter, count, round) {
        val chap = chapter?.let { n -> pack.chapters.firstOrNull { it.lInt("n") == n } }
        val all = chap?.let { pack.lessonsOf(it) } ?: pack.index
        val done = game.lObj("grammarDone")
        val from = if (chap == null && done.size >= 3) all.filter { done.containsKey(it.lStr("id")) } else all
        val pool = from.flatMap { x -> val l = pack.lessons[x.lStr("id")]; l.lList("quiz").map { MixItem(it, null, x) } + l.lList("drills").map { MixItem(null, it, x) } }
        MixState(pack, pool.shuffled().take(count.coerceAtLeast(1)))
    }
    val scope = rememberCoroutineScope()
    val a = MixActions(
        pick = { v ->
            val it = st.current; val q = it?.q
            if (q != null && st.picked == null) {
                st.picked = v; val opts = q.lStrs("options"); val ans = q.lInt("answer")
                if (v == ans) st.right++ else scope.launch { env.logMistake(GrammarCore.mistake(q.lStr("q"), opts.getOrElse(ans) { "" }, opts.getOrElse(v) { "" }, q.lStr("explain"), it.lesson.lStr("id"))) }
            }
        },
        input = { s -> if (st.drill.outcome == null) st.drill = DrillState(s) },
        check = { p ->
            val it = st.current; val d = it?.d
            if (d != null && st.drill.outcome == null) {
                val o = GrammarCore.grade(d, st.drill.input, p, pack.check[it.lesson.lStr("id")]?.firstOrNull())
                if (o is DrillOutcome.TooShort) st.drill = DrillState(st.drill.input, null, null, true)
                else if (o is DrillOutcome.Graded) {
                    st.drill = DrillState(st.drill.input, p, o)
                    if (o.ok) st.right++ else scope.launch { env.logMistake(GrammarCore.mistake(if (d.lStr("t") == "error") d.lStrs("parts").joinToString(" ") else d.lStr("q"), o.answer, o.given, d.lStr("ex"), it.lesson.lStr("id"))) }
                }
            }
        },
        next = { st.i++; st.picked = null; st.drill = DrillState()
            if (st.i >= st.items.size && st.summary == null) scope.launch { val pct = GrammarCore.pct(st.right, st.items.size); val xp = GrammarCore.mixXp(st.right); env.reward(mapOf("quizzes" to 1, "grammar" to 1, "perfect" to (if (pct == 100) 1 else 0)), xp); st.summary = Triple(st.right, pct, xp) } },
        again = { round++ }, open = open,
    )
    GrammarMixLayout(st, a, onExit)
}

class MixActions(val pick: (Int) -> Unit = {}, val input: (String) -> Unit = {}, val check: (Int?) -> Unit = {}, val next: () -> Unit = {}, val again: () -> Unit = {}, val open: (String) -> Unit = {})

@Composable
fun GrammarMixLayout(st: MixState, a: MixActions, onExit: () -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    VScreen(t.lv("Kiểm tra tổng hợp"), onExit) {
        if (st.items.isEmpty()) { VNotice(t(L10nKey.syncOffline)); return@VScreen }
        val s = st.summary
        if (s != null) {
            LKCard {
                VText("🔀", LKType.headlineLg); VText(t.lv("{right}/{total} câu đúng ({pct}%)", "right" to s.first, "total" to st.items.size, "pct" to s.second), LKType.headlineMd); VText("+${s.third} XP", LKType.titlePill, c.success)
                VMuted(t.lv("Câu sai đã được ghi vào <a href=\"#/mistakes\">Sổ lỗi sai</a>.").noTags())
                LAction(t.lv("Luyện lượt mới"), a.again, primary = true); LAction(t.lv("Về danh sách bài"), { a.open("grammar") })
            }
            return@VScreen
        }
        val it = st.current ?: return@VScreen
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { LBar(st.i.toFloat() / st.items.size) }; VText("${st.i + 1}/${st.items.size}", LKType.titlePill)
        }
        VMuted(it.lesson.lStr("emoji") + " " + t.lessonTitle(it.lesson))
        val q = it.q; val d = it.d
        if (q != null) LKCard {
            val opts = q.lStrs("options"); val ans = q.lInt("answer"); val p = st.picked
            Ltr { VText(q.lStr("q"), LKType.titlePill) }
            opts.forEachIndexed { j, o -> LChoice(o, if (p != null && j == ans) 1 else if (p == j) 2 else 0, p == null, { a.pick(j) }) }
            if (p != null) LNote((if (p == ans) t.lv("Chính xác!") else t.lv("Chưa đúng")) + " – " + q.lStr("explain"), if (p == ans) c.success else c.error)
        } else if (d != null) LKCard { DrillCard(d, st.drill, a.input, a.check) }
        if (st.answered) Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            LAction(t.lv("Tiếp"), a.next, primary = true, modifier = Modifier.weight(1f)); LAction(t.lv("Xem lại bài"), { a.open("grammar/" + it.lesson.lStr("id")) }, modifier = Modifier.weight(1f))
        }
    }
}
