package com.lexkite.app.feature.vocab

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.write.Confidence
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
import com.lexkite.app.feature.lesson.AndroidSpeech
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.util.Calendar
import java.util.TimeZone

/** One daily-challenge result before the learner rates it. */
class ConfMetrics(val secs: Int, val wpm: Int, val pauses: Int, val fillers: Int, val used: List<String>, val ppm: Double)

/** What #/confidence shows: [page] = overview | unit | toolkit | daily. Hoisted so the layout is a pure function of it (snapshots). */
class ConfUi(
    val page: String, val unit: JsonObject?, val phrase: String?, val conf: JsonObject, val progress: JsonObject, val today: String,
    val runStep: Int? = null, val shadow: Map<String, Int> = emptyMap(), val shadowIndex: Int = 0, val marks: Map<String, List<Pair<String, Boolean?>>> = emptyMap(), val heard: Map<String, String> = emptyMap(),
    val feedback: Map<String, String> = emptyMap(), val gapIndex: Int = 0, val gapsRight: Int = 0, val gapState: String? = null, val hint: Boolean = false, val listening: String? = null, val micError: String? = null,
    val playing: Int? = null, val savedCards: Int? = null, val recording: Boolean = false, val secsLeft: Int = Confidence.DAILY_SECONDS, val live: String = "", val metrics: ConfMetrics? = null, val rating: Int? = null,
    val dailyScore: Int? = null, val newRecord: Boolean = false, val transcript: String = "", val question: JsonObject = JsonObject(emptyMap()),
) {
    val done: JsonObject get() = progress.lObj("done")
    val daily: List<JsonObject> get() = progress.lList("daily")
    val units: List<JsonObject> get() = conf.lList("units")
    val next: JsonObject? get() = units.firstOrNull { !done.containsKey(it.lStr("id")) }
    val streak: Int get() = Confidence.streak(daily.map { it.lStr("d") }, today)
}
class ConfActions(
    val open: (String) -> Unit = {}, val start: () -> Unit = {}, val leave: () -> Unit = {}, val next: () -> Unit = {}, val say: (String, Boolean) -> Unit = { _, _ -> }, val stopSay: () -> Unit = {}, val playDialogue: (Boolean) -> Unit = {},
    val tryPhrase: (String, String) -> Unit = { _, _ -> }, val shadowTry: (JsonObject) -> Unit = {}, val shadowMove: (Int) -> Unit = {}, val gapCheck: (JsonObject, String) -> Unit = { _, _ -> }, val gapMic: (JsonObject) -> Unit = {},
    val gapNext: () -> Unit = {}, val hint: () -> Unit = {}, val toggleRecording: () -> Unit = {}, val rate: (Int) -> Unit = {},
)

private fun dayKey(now: Long): String { val c = Calendar.getInstance(TimeZone.getDefault()).also { it.timeInMillis = now }; return "%04d-%02d-%02d".format(c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH)) }

@Composable
fun ConfidenceRoute(env: WordEnv, arg: String, onExit: () -> Unit, open: (String) -> Unit) {
    val content = remember { env.learn() }; val conf = content.conf
    val t = LocalL10n.current.western(); val ctx = LocalContext.current; val scope = rememberCoroutineScope()
    val id = arg.substringBefore('#').substringBefore('/'); val frag = arg.substringAfter('#', "").ifEmpty { null }
    val page = when (id) { "" -> "overview"; "toolkit" -> "toolkit"; "daily" -> "daily"; else -> "unit" }
    val unit = conf.lList("units").firstOrNull { it.lStr("id") == id }
    var progress by remember { mutableStateOf(JsonObject(mapOf("done" to JsonObject(emptyMap()), "daily" to JsonArray(emptyList())))) }
    LaunchedEffect(Unit) { val p = env.kv(Confidence.KEY) as? JsonObject; if (p != null) progress = JsonObject(mapOf("done" to p.lObj("done"), "daily" to JsonArray(p.lArr("daily")))) }
    fun save(p: JsonObject) { progress = p; scope.launch { env.putKv(Confidence.KEY, p) } }
    // unit run
    var runStep by remember { mutableStateOf<Int?>(null) }
    val shadow = remember { mutableStateMapOf<String, Int>() }
    val marks = remember { mutableStateMapOf<String, List<Pair<String, Boolean?>>>() }
    val heard = remember { mutableStateMapOf<String, String>() }
    val feedback = remember { mutableStateMapOf<String, String>() }
    var shadowIndex by remember { mutableStateOf(0) }; var gapIndex by remember { mutableStateOf(0) }; var gapsRight by remember { mutableStateOf(0) }
    var gapState by remember { mutableStateOf<String?>(null) }; var hint by remember { mutableStateOf(false) }
    var listening by remember { mutableStateOf<String?>(null) }; var micError by remember { mutableStateOf<String?>(null) }
    var playing by remember { mutableStateOf<Int?>(null) }; var savedCards by remember { mutableStateOf<Int?>(null) }
    var playToken by remember { mutableStateOf(0) }
    // daily
    var recording by remember { mutableStateOf(false) }; var secsLeft by remember { mutableStateOf(Confidence.DAILY_SECONDS) }; var live by remember { mutableStateOf("") }
    var metrics by remember { mutableStateOf<ConfMetrics?>(null) }; var rating by remember { mutableStateOf<Int?>(null) }; var dailyScore by remember { mutableStateOf<Int?>(null) }; var newRecord by remember { mutableStateOf(false) }
    var said by remember { mutableStateOf("") }; var pauses by remember { mutableStateOf(0) }; var partialAt by remember { mutableStateOf(0L) }; var t0 by remember { mutableStateOf(0L) }; var recordId by remember { mutableStateOf("") }
    var timer by remember { mutableStateOf<Job?>(null) }
    val speech = remember { AndroidSpeech(ctx) }
    DisposableEffect(speech) { onDispose { speech.stop(); env.stopAudio() } }
    var locale by remember { mutableStateOf("en-GB") }
    LaunchedEffect(Unit) { locale = if (env.region() == "US") "en-US" else "en-GB" }
    var pending by remember { mutableStateOf<(() -> Unit)?>(null) }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok -> if (ok) pending?.invoke() else micError = "not-allowed"; pending = null }
    fun withMic(go: () -> Unit) { if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) go() else { pending = go; ask.launch(Manifest.permission.RECORD_AUDIO) } }
    fun attempt(key: String, target: String, then: (String, Int) -> Unit) {
        if (listening != null) { speech.finish(); return }
        env.stopAudio()
        withMic {
            listening = key; micError = null
            speech.start(locale, {}, { alts -> listening = null; val best = alts.maxByOrNull { Speak_similarity(it, target) } ?: ""; then(best, Math.round(Speak_similarity(best, target) * 100).toInt()) }, { e -> listening = null; micError = e })
        }
    }
    fun finishUnit(u: JsonObject) {
        val first = !progress.lObj("done").containsKey(u.lStr("id"))
        val sh = if (shadow.isEmpty()) null else Math.round(shadow.values.sum().toDouble() / shadow.size).toInt()
        save(JsonObject(mapOf("done" to JsonObject(LinkedHashMap(progress.lObj("done")).also { it[u.lStr("id")] = JsonObject(mapOf("at" to JsonPrimitive(env.now()), "sh" to (sh?.let { s -> JsonPrimitive(s) } ?: kotlinx.serialization.json.JsonNull))) }), "daily" to JsonArray(progress.lArr("daily")))))
        scope.launch {
            var n = 0
            for (p in u.lList("phrases")) {
                if (env.cards().containsKey(CardMath.keyOf(p.lStr("say")))) continue
                env.addWord(JsonObject(mapOf("word" to JsonPrimitive(p.lStr("say")), "vi" to JsonPrimitive(t.lv(p.lStr("mean"))), "def" to JsonPrimitive(p.lStr("meanEn")), "ex" to JsonPrimitive(p.lStr("say")), "pos" to JsonPrimitive("phrase"), "emoji" to JsonPrimitive(u.lStr("em")), "topic" to JsonPrimitive("confidence"))),
                    JsonObject(mapOf("text" to JsonPrimitive(p.lStr("say")), "title" to JsonPrimitive("Speak with confidence: " + u.lStr("titleEn")))), silent = true); n++
            }
            savedCards = n
            if (first) env.reward(mapOf("spoken" to shadow.size), 15)
        }
    }
    fun stopDaily() {
        if (!recording) return
        recording = false; timer?.cancel(); speech.stop()
        val secs = minOf(Confidence.DAILY_SECONDS.toDouble(), (System.currentTimeMillis() - t0) / 1000.0)
        val words = Confidence.toks(said).size
        metrics = ConfMetrics(Math.round(secs).toInt(), if (said.isNotEmpty() && secs > 10) Math.round(words / (secs / 60)).toInt() else 0, pauses, Confidence.fillers(said), Confidence.used(said, Confidence.allPhrases(conf)), if (secs > 5) pauses / (secs / 60) else 0.0)
    }
    fun listenLoop() {
        if (!recording) return
        speech.start(locale, { p -> val now = System.currentTimeMillis(); if (partialAt > 0 && now - partialAt >= Confidence.PAUSE_GAP_MS) pauses++; partialAt = now; live = (said + " " + p).trim().takeLast(140) },
            { alts -> alts.firstOrNull()?.let { said = (said + " " + it).trim() }; live = said.takeLast(140); if (recording && System.currentTimeMillis() - t0 < Confidence.DAILY_SECONDS * 1000) listenLoop() },
            { e -> if (e == "no-speech" && recording) listenLoop() else { micError = e; stopDaily() } })
    }
    val q = conf.lList("daily").let { l -> if (l.isEmpty()) JsonObject(emptyMap()) else l[Confidence.dailyIndex(env.now(), TimeZone.getDefault().getOffset(env.now()).let { -it / 60_000 }, l.size)] }
    val a = ConfActions(
        open = open,
        start = { runStep = 0; shadow.clear(); marks.clear(); heard.clear(); feedback.clear(); shadowIndex = 0; gapIndex = 0; gapsRight = 0; gapState = null; hint = false; savedCards = null },
        leave = { env.stopAudio(); speech.stop(); runStep = null },
        next = { env.stopAudio(); speech.stop(); unit?.let { u -> val s = (runStep ?: 0) + 1; runStep = minOf(5, s); if (runStep == 5) finishUnit(u) } },
        say = { text, slow -> env.speak(text, slow) }, stopSay = { playToken++; env.stopAudio(); playing = null },
        playDialogue = { slow ->
            playToken++; env.stopAudio(); val token = playToken; val lines = unit?.lObj("dialogue").lArr("lines")
            fun play(k: Int) {
                if (playToken != token || k >= lines.size) { if (playToken == token) playing = null; return }
                playing = k; val l = lines[k].lStrs()
                env.speakThen(l.lastOrNull().orEmpty(), if ((l.firstOrNull() ?: "a") == "a") "ama" else "carlos", slow) { scope.launch { delay(350); play(k + 1) } }
            }
            play(0)
        },
        tryPhrase = { key, target -> attempt(key, target) { _, s -> feedback[key] = (if (s >= 80) "🌟 " else if (s >= 55) "👍 " else "🌱 ") + "$s%" } },
        shadowTry = { p -> val k = p.lStr("id"); attempt(k, p.lStr("say")) { h, s -> shadow[k] = maxOf(shadow[k] ?: 0, s); marks[k] = Confidence.marks(p.lStr("say"), h); heard[k] = h; feedback[k] = if (s >= 85) "🌟" else if (s >= 60) "👍" else "🌱"; feedback["$k#score"] = s.toString() } },
        shadowMove = { d -> shadowIndex = (shadowIndex + d).coerceIn(0, maxOf(0, (unit?.lList("phrases")?.size ?: 1) - 1)) },
        gapCheck = { p, typed -> if (Confidence.norm(typed) == Confidence.norm(p.lStr("gap"))) { gapState = "ok"; gapsRight++; env.speak(p.lStr("say")) } else gapState = "miss" },
        gapMic = { p -> attempt("gap", p.lStr("say")) { h, _ -> heard["gap"] = h; if (" ${Confidence.norm(h)} ".contains(" ${Confidence.norm(p.lStr("gap"))} ")) { gapState = "ok"; gapsRight++; env.speak(p.lStr("say")) } else gapState = "miss" } },
        gapNext = { gapIndex++; gapState = null; hint = false; heard.remove("gap") }, hint = { hint = true },
        toggleRecording = {
            if (recording) stopDaily() else withMic {
                env.stopAudio(); metrics = null; rating = null; dailyScore = null; said = ""; live = ""; pauses = 0; partialAt = 0; micError = null; secsLeft = Confidence.DAILY_SECONDS
                recording = true; t0 = System.currentTimeMillis(); recordId = env.now().toString()
                timer?.cancel(); timer = scope.launch { while (recording) { val s = (System.currentTimeMillis() - t0) / 1000; secsLeft = maxOf(0, Confidence.DAILY_SECONDS - s.toInt()); if (secsLeft <= 0) { stopDaily(); break }; delay(200) } }
                listenLoop()
            }
        },
        rate = { n ->
            val m = metrics
            if (m != null) {
                rating = n
                val score = Confidence.score(m.secs.toDouble(), m.wpm.toDouble(), m.ppm, m.used.size, n)
                val list = progress.lList("daily").toMutableList(); val at = list.indexOfFirst { it.lStr("at") == recordId }
                val best = list.filterIndexed { i, _ -> i != at }.maxOfOrNull { it.lInt("score") } ?: 0
                val rec = JsonObject(linkedMapOf("d" to JsonPrimitive(dayKey(env.now())), "at" to JsonPrimitive(recordId), "score" to JsonPrimitive(score), "wpm" to JsonPrimitive(m.wpm), "pauses" to JsonPrimitive(m.pauses), "fillers" to JsonPrimitive(m.fillers), "phrases" to JsonPrimitive(m.used.size), "self" to JsonPrimitive(n), "secs" to JsonPrimitive(m.secs)))
                if (at >= 0) list[at] = rec else list.add(rec)
                val cut = list.takeLast(30)
                save(JsonObject(mapOf("done" to progress.lObj("done"), "daily" to JsonArray(cut))))
                dailyScore = score; newRecord = cut.size > 1 && score > best
                if (at < 0) scope.launch { env.reward(mapOf("spoken" to 1), 10) }
            }
        },
    )
    ConfidenceLayout(
        ConfUi(page, unit, frag, conf, progress, dayKey(env.now()), runStep, shadow.toMap(), shadowIndex, marks.toMap(), heard.toMap(), feedback.toMap(), gapIndex, gapsRight, gapState, hint, listening, micError, playing, savedCards,
            recording, secsLeft, live, metrics, rating, dailyScore, newRecord, said, q), a, onExit)
}

private fun Speak_similarity(a: String, b: String): Double = com.lexkite.app.core.lesson.Speaking.similarity(a, b)

@Composable
fun ConfidenceLayout(ui: ConfUi, a: ConfActions, onExit: () -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    val title = when (ui.page) { "unit" -> ui.unit?.let { t.lv(it.lStr("title")) } ?: t.lv("Giao tiếp tự tin"); "toolkit" -> t.lv("Bộ công cụ tự tin"); "daily" -> t.lv("Thử thách 2 phút hôm nay"); else -> t.lv("Giao tiếp tự tin") }
    fun go(h: String) = a.open(h.removePrefix("#/"))
    @Composable fun speak(text: String, slow: Boolean = false) = VSpeak(t.lv(if (slow) "Nghe chậm" else "Nghe"), slow) { a.say(text, slow) }
    @Composable fun micBtn(key: String, label: String, onClick: () -> Unit) = VChip(if (ui.listening == key) "⏹" else "🎙", onClick, selected = ui.listening == key)
    @Composable fun micNote() { ui.micError?.let { LNote("🎙 " + it, c.error) } }
    @Composable fun stat(v: String, l: String) = Column(horizontalAlignment = Alignment.CenterHorizontally) { VText(v, LKType.headlineSm); VMuted(l) }
    @Composable fun phraseCard(p: JsonObject, mic: Boolean = false, key: String = p.lStr("id")) = LKCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Ltr { VText(p.lStr("say"), LKType.titlePill, modifier = Modifier.weight(1f)) }; speak(p.lStr("say")); if (mic || ui.page == "unit") speak(p.lStr("say"), true)
            if (mic) micBtn(key, t.lv("Nói thử")) { a.tryPhrase(key, p.lStr("say")) }
        }
        VMuted(t.lv(p.lStr("mean")))
        ui.feedback[key]?.let { VText(it, LKType.titlePill) }
        if (p.lStr("not").isNotEmpty()) { Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { VText("✗", LKType.titlePill, c.error); Ltr { VText(p.lStr("not"), LKType.bodyMd, c.error) } }; Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { VText("✓", LKType.titlePill, c.success); Ltr { VText(p.lStr("say"), LKType.bodyMd) } }; VText("💡 " + t.lv(p.lStr("why")), LKType.bodySm) }
    }
    VScreen(title, if (ui.runStep != null) a.leave else onExit) {
        when (ui.page) {
            "overview" -> {
                VMuted(t.lv("Mỗi bài là một tình huống thật, 5–8 phút: nghe, học cụm câu, nói theo, rồi tự tin nói chuyện. Sai cũng không sao – cứ nói!"))
                val last = ui.daily.lastOrNull()
                LKCard {
                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.Top) {
                        VText(last?.lInt("score")?.toString() ?: "–", LKType.headlineLg, c.secondary)
                        Column { VText(t.lv("Điểm tự tin"), LKType.headlineSm); VMuted(if (last != null) t.lv("Lần gần nhất: {n}/100 · chuỗi {d} ngày", "n" to last.lInt("score"), "d" to ui.streak) else t.lv("Nói 2 phút mỗi ngày để theo dõi độ lưu loát và sự tự tin của bạn.")) }
                    }
                    if (ui.daily.size >= 2) Spark(ui.daily.takeLast(14).map { it.lInt("score") }, t.lv("Điểm tự tin {n} lần gần nhất", "n" to minOf(14, ui.daily.size)))
                    LAction(if (ui.daily.lastOrNull()?.lStr("d") == ui.today) "✅ " + t.lv("Đã nói hôm nay – nói thêm?") else "⏱️ " + t.lv("Thử thách 2 phút hôm nay"), { go("#/confidence/daily") }, primary = true)
                    LAction("🧰 " + t.lv("Bộ công cụ tự tin"), { go("#/confidence/toolkit") })
                }
                Confidence.LEVELS.forEach { lv ->
                    val list = ui.units.filter { it.lStr("level") == lv }
                    if (list.isNotEmpty()) {
                        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { VBadge(lv, c.tertiaryContainer, c.onTertiaryContainer); VText(t.lv("{a}/{b} bài", "a" to list.count { ui.done.containsKey(it.lStr("id")) }, "b" to list.size), LKType.titlePill) }
                        list.forEach { u ->
                            LKCard(onClick = { go("#/confidence/" + u.lStr("id")) }) {
                                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.Top) {
                                    VText(u.lStr("em"), LKType.headlineMd)
                                    Column(Modifier.weight(1f)) {
                                        VText(t.lv(u.lStr("title")), LKType.titlePill); if (t.lang != "en") Ltr { VMuted(u.lStr("titleEn")) }
                                        if (ui.next?.lStr("id") == u.lStr("id")) VBadge(t.lv("Bài tiếp theo"), c.success.copy(alpha = 0.2f))
                                    }
                                    if (ui.done.containsKey(u.lStr("id"))) VText("✓", LKType.titlePill, c.success)
                                }
                            }
                        }
                    }
                }
                LNote("🔒 " + t.lv("Âm thanh của bạn chỉ ở trên máy này: Lexkite không tải lên và không lưu bản ghi."))
            }
            "toolkit" -> {
                VMuted(t.lv("5 bộ câu giúp bạn không bị \"đứng hình\": nhờ nhắc lại, câu giờ, bắt chuyện, phản đối lịch sự và nói khi quên từ."))
                ui.conf.lList("toolkit").forEach { g ->
                    VText(g.lStr("em") + " " + t.lv(g.lStr("title")), LKType.headlineSm); VMuted(t.lv(g.lStr("intro")))
                    g.lList("phrases").forEach { p -> phraseCard(p, mic = true, key = g.lStr("id") + "-" + p.lStr("id")) }
                    micNote()
                }
            }
            "daily" -> {
                VMuted(t.lv("Nói liên tục tối đa 2 phút về đề bên dưới. Không ai chấm lỗi – mục tiêu là nói trôi chảy và dám nói."))
                LKCard {
                    Ltr { VText(ui.question.lStr("q"), LKType.headlineSm) }
                    Row(verticalAlignment = Alignment.CenterVertically) { Ltr { VText("💡 " + ui.question.lStr("tip"), LKType.bodySm, modifier = Modifier.weight(1f)) }; speak(ui.question.lStr("q")) }
                    VText("%d:%02d".format(ui.secsLeft / 60, ui.secsLeft % 60), LKType.headlineLg)
                    LAction(if (ui.recording) "⏹ " + t.lv("Dừng") else "🎙 " + t.lv("Bắt đầu nói"), a.toggleRecording, primary = true)
                    micNote()
                    if (ui.live.isNotEmpty()) Ltr { VMuted(ui.live) }
                    LNote("🔒 " + t.lv("Âm thanh của bạn chỉ ở trên máy này: Lexkite không tải lên và không lưu bản ghi."))
                }
                ui.metrics?.let { m ->
                    LKCard {
                        VTitle("📊 " + t.lv("Kết quả của bạn"))
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                            stat("${m.secs}s", t.lv("Thời gian nói")); stat(if (m.wpm > 0) m.wpm.toString() else "–", t.lv("Từ/phút")); stat(m.pauses.toString(), t.lv("Lần ngập ngừng")); stat(m.fillers.toString(), t.lv("Từ đệm")); stat(m.used.size.toString(), t.lv("Cụm câu đã học"))
                        }
                        if (m.used.isNotEmpty()) Ltr { VText("✨ " + t.lv("Bạn đã dùng:") + " " + m.used.joinToString(" · "), LKType.bodySm) } else VMuted(t.lv("Lần sau thử dùng 1–2 cụm câu từ bài học hoặc bộ công cụ nhé."))
                        if (ui.transcript.isNotEmpty()) { VMuted(t.lv("Xem chữ máy nghe được")); Ltr { VText(ui.transcript, LKType.bodySm) } }
                        VText(t.lv("Bạn cảm thấy tự tin đến mức nào?"), LKType.titlePill)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) { listOf("😟", "😕", "🙂", "😊", "🤩").forEachIndexed { k, e -> VChip(e, { a.rate(k + 1) }, selected = ui.rating == k + 1, modifier = Modifier.weight(1f)) } }
                        ui.dailyScore?.let { sc ->
                            VText(t.lv("Điểm tự tin hôm nay: {n}/100", "n" to sc), LKType.headlineSm)
                            VMuted(if (ui.newRecord) "🏆 " + t.lv("Kỷ lục mới! Bạn đang tiến bộ thật sự.") else if (ui.streak >= 3) "🔥 " + t.lv("{n} ngày liên tiếp – giữ nhịp nhé!", "n" to ui.streak) else t.lv("Nói mỗi ngày để điểm tăng dần."))
                            if (ui.daily.size >= 2) Spark(ui.daily.takeLast(14).map { it.lInt("score") }, t.lv("Điểm tự tin {n} lần gần nhất", "n" to minOf(14, ui.daily.size)))
                            LAction(t.lv("Về lộ trình"), { go("#/confidence") }, primary = true); LAction("🧰 " + t.lv("Bộ công cụ tự tin"), { go("#/confidence/toolkit") })
                        }
                    }
                }
            }
            else -> ui.unit?.let { u ->
                val names = listOf(t.lv("Nghe hội thoại mẫu"), t.lv("Cụm câu nên nói"), t.lv("Nói theo"), t.lv("Nói điền chỗ trống"), t.lv("Hội thoại ngắn"), t.lv("Tổng kết"))
                val s = ui.runStep
                if (s == null) {
                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { VText(u.lStr("em"), LKType.headlineMd); VBadge(u.lStr("level"), c.tertiaryContainer, c.onTertiaryContainer); if (t.lang != "en") Ltr { VMuted(u.lStr("titleEn")) } }
                    LKCard {
                        VTitle("🎯 " + t.lv("Sau bài này bạn có thể")); VText(t.lv(u.lStr("goal")), LKType.bodyMd)
                        names.forEachIndexed { i, n -> VMuted("${i + 1}. $n") }
                        LAction("▶ " + (if (ui.done.containsKey(u.lStr("id"))) t.lv("Học lại") else t.lv("Bắt đầu")) + " · ≈ " + t.lv("{m} phút", "m" to 7), a.start, primary = true)
                    }
                    VTitle("🧩 " + t.lv("Cụm câu nên nói")); u.lList("phrases").forEach { phraseCard(it) }
                } else {
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) { for (k in 0 until 6) Column(Modifier.weight(1f)) { LBar(if (k <= s) 1f else 0f) } }
                    VText(t.lv("Bước {i}/{n}", "i" to s + 1, "n" to 6) + " · " + names[s], LKType.titlePill, c.onSurfaceVariant)
                    when (s) {
                        0 -> LKCard {
                            val d = u.lObj("dialogue")
                            VMuted(t.lv("Nghe cả đoạn 1–2 lần. Lần đầu nghe chậm, chưa cần hiểu hết."))
                            Ltr { VText(d.lStr("a") + " – " + d.lStr("aRole"), LKType.bodySm) }
                            VFlow { VChip(t.lv("Nghe chậm"), { a.playDialogue(true) }); VChip(t.lv("Tốc độ thường"), { a.playDialogue(false) }); VChip(t.lv("Dừng"), a.stopSay) }
                            d.lArr("lines").forEachIndexed { k, l ->
                                val x = l.lStrs()
                                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
                                    VText(if (x.firstOrNull() == "a") d.lStr("a") else t.lv("Bạn"), LKType.labelMetric, if (ui.playing == k) c.secondary else c.onSurface, Modifier.weight(0.3f))
                                    Ltr { VText(x.lastOrNull().orEmpty(), LKType.bodyMd, modifier = Modifier.weight(0.7f)) }; speak(x.lastOrNull().orEmpty())
                                }
                            }
                        }
                        1 -> { VMuted(t.lv("Đây là những câu người bản xứ hay nói. So sánh với cách nói kém tự nhiên hơn.")); u.lList("phrases").forEach { phraseCard(it) } }
                        2 -> {
                            val ps = u.lList("phrases"); val k = minOf(ui.shadowIndex, maxOf(0, ps.size - 1)); val p = ps.getOrNull(k)
                            if (p != null) LKCard {
                                val id = p.lStr("id"); val mk = ui.marks[id]
                                VMuted(t.lv("Nghe, rồi bấm micro và nói theo. Không cần hoàn hảo – nói to và rõ là được.") + " (${k + 1}/${ps.size})")
                                if (mk != null) VFlow { mk.forEach { (w, h) -> VBadge(w + if (h == false) " ✗" else if (h == true) " ✓" else "", if (h == true) c.success.copy(alpha = 0.2f) else if (h == false) c.error.copy(alpha = 0.2f) else c.surfaceContainerHighest) } }
                                else Ltr { VText(p.lStr("say"), LKType.headlineSm) }
                                VMuted(t.lv(p.lStr("mean")))
                                Row(verticalAlignment = Alignment.CenterVertically) { speak(p.lStr("say")); speak(p.lStr("say"), true); micBtn(id, t.lv("Nói theo")) { a.shadowTry(p) } }
                                micNote()
                                ui.feedback["$id#score"]?.toIntOrNull()?.let { n -> VText("$n% · " + (if (n >= 85) "🌟 " + t.lv("Tuyệt! Nghe rất tự nhiên.") else if (n >= 60) "👍 " + t.lv("Tốt lắm! Thử thêm 1 lần để chắc hơn?") else "🌱 " + t.lv("Nghe lại bản chậm rồi nói từng cụm nhỏ nhé.")), LKType.bodyMd); ui.heard[id]?.takeIf { it.isNotEmpty() }?.let { h -> Ltr { VMuted(t.lv("Máy nghe được:") + " “$h”") } } }
                                ui.shadow[id]?.let { VBadge(t.lv("Tốt nhất: {n}%", "n" to it)) }
                                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { if (k > 0) LAction("← " + t.lv("Câu trước"), { a.shadowMove(-1) }, modifier = Modifier.weight(1f)); if (k < ps.size - 1) LAction(t.lv("Câu sau") + " →", { a.shadowMove(1) }, modifier = Modifier.weight(1f)) }
                            }
                        }
                        3 -> {
                            val list = u.lList("phrases").filter { it.lStr("gap").isNotEmpty() }.take(4)
                            if (ui.gapIndex >= list.size) LKCard { LNote("✓ " + t.lv("Xong {a}/{b} câu.", "a" to ui.gapsRight, "b" to list.size), c.success) }
                            else {
                                val p = list[ui.gapIndex]; var typed by remember(ui.gapIndex) { mutableStateOf("") }
                                LKCard {
                                    VMuted(t.lv("Nói cả câu, điền từ còn thiếu. Bí thì xem gợi ý.") + " (${ui.gapIndex + 1}/${list.size})")
                                    Ltr { VText(Confidence.blank(p.lStr("say"), p.lStr("gap")), LKType.headlineSm) }; VMuted(t.lv(p.lStr("mean")))
                                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { micBtn("gap", t.lv("Nói cả câu")) { a.gapMic(p) }; Column(Modifier.weight(1f)) { VField(typed, { typed = it }, t.lv("Hoặc gõ từ còn thiếu"), onGo = { a.gapCheck(p, typed) }) } }
                                    micNote()
                                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { LAction(t.lv("Kiểm tra"), { a.gapCheck(p, typed) }, modifier = Modifier.weight(1f)); LAction("💡 " + t.lv("Gợi ý"), a.hint, modifier = Modifier.weight(1f)) }
                                    if (ui.hint) LNote(p.lStr("gap").take(1) + "_ ".repeat(maxOf(0, p.lStr("gap").length - 1)))
                                    if (ui.gapState == "ok") { LNote("✓ " + p.lStr("say"), c.success); LAction(t.lv("Câu sau") + " →", a.gapNext, primary = true) }
                                    else if (ui.gapState == "miss") LNote(t.lv("Gần đúng rồi! Thử lại nhé.") + (ui.heard["gap"]?.takeIf { it.isNotEmpty() }?.let { " " + t.lv("Máy nghe được:") + " “$it”" } ?: ""), c.tertiary)
                                }
                            }
                        }
                        4 -> LKCard {
                            VText(t.lv("Giờ hãy nói chuyện thật. Dùng các cụm câu vừa học. Bí thì bấm \"Giúp tôi nói\"."), LKType.bodyMd)
                            Ltr { VMuted("🎯 " + u.lObj("roleplay").lStr("you")) }
                            LAction("▶ " + t.lv("Bắt đầu hội thoại"), { go("#/roleplay/" + u.lStr("rp")) }, primary = true)
                        }
                        else -> LKCard {
                            VText("🎉 " + t.lv("Bạn đã hoàn thành bài này!"), LKType.headlineMd); VMuted(t.lv("Mỗi lần nói là một lần tự tin hơn."))
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) { stat(u.lList("phrases").size.toString(), t.lv("Cụm câu")); stat(if (ui.shadow.isEmpty()) "–" else Math.round(ui.shadow.values.sum().toDouble() / ui.shadow.size).toString() + "%", t.lv("Nói theo")); stat("–", t.lv("Hội thoại")) }
                            LNote(if (ui.savedCards == null) t.lv("Đang lưu cụm câu vào thẻ ôn…") else if ((ui.savedCards ?: 0) > 0) t.lv("Đã lưu {n} cụm câu vào thẻ ôn.", "n" to (ui.savedCards ?: 0)) else t.lv("Các cụm câu đã có trong thẻ ôn."))
                            u.lList("phrases").forEach { Ltr { VText("• " + it.lStr("say") + " – " + t.lv(it.lStr("mean")), LKType.bodySm) } }
                            ui.next?.let { nx -> LAction(nx.lStr("em") + " " + t.lv("Bài tiếp theo") + ": " + t.lv(nx.lStr("title")), { a.leave(); go("#/confidence/" + nx.lStr("id")) }, primary = true) }
                            LAction("⏱️ " + t.lv("Thử thách 2 phút hôm nay"), { go("#/confidence/daily") }); LAction(t.lv("Về lộ trình"), { a.leave(); go("#/confidence") })
                        }
                    }
                    if (s < 5) Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { LAction(t.lv("Bỏ qua"), a.next, modifier = Modifier.weight(1f)); LAction(t.lv("Tiếp tục") + " →", a.next, primary = true, modifier = Modifier.weight(1f)) }
                }
            }
        }
    }
}

@Composable
private fun Spark(points: List<Int>, label: String) {
    val c = LocalLKColors.current
    Canvas(Modifier.fillMaxWidth().height(56.dp).semantics { contentDescription = label + ": " + points.joinToString(", ") }) {
        if (points.size < 2) return@Canvas
        fun x(i: Int) = i.toFloat() / (points.size - 1) * (size.width - 8f) + 4f
        fun y(v: Int) = size.height - 4f - v / 100f * (size.height - 8f)
        val p = Path(); points.forEachIndexed { i, v -> if (i == 0) p.moveTo(x(i), y(v)) else p.lineTo(x(i), y(v)) }
        drawPath(p, c.secondary, style = Stroke(3.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        points.forEachIndexed { i, v -> drawCircle(c.secondary, 3.5.dp.toPx(), Offset(x(i), y(v))) }
    }
}
