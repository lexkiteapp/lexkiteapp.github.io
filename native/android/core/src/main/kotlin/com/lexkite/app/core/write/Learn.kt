package com.lexkite.app.core.write

import com.lexkite.app.core.SRSParams
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.LessonFx
import com.lexkite.app.core.vocab.WS_RUN
import com.lexkite.app.core.vocab.jsTrim
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.time.LocalDate
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

/**
 * M4 P09 part 2 - the pure parts of #/fix #/style #/quick #/confidence #/method #/grammar (web/js/fixer.js, quick.js, confidence.js, method.js, grammar.js).
 * Verified against native/shared/gen/vectors/learn.json (LearnVectorsTest). Content = `content-pack/learn-content.json` (bundled) and `grammar-pack.json` (download, `grammar-starter.json` offline).
 */
private fun jsRound(x: Double): Int = floor(x + 0.5).toInt()

/** `learn-content.json`: rule table + word tables of #/fix, STYLES + QUESTIONS of #/style, the confidence units, the texts of #/method. */
class LearnContent(val json: JsonObject) {
    val fix: FixEngine? = if (json.lObj("fix").isNotEmpty()) FixEngine(json.lObj("fix")) else null
    val style: JsonObject = json.lObj("style")
    val conf: JsonObject = json.lObj("conf")
    val method: JsonObject = json.lObj("method")
    val units: List<JsonObject> get() = conf.lList("units")
    companion object { fun parse(text: String): LearnContent? = runCatching { Json.parseToJsonElement(text) as? JsonObject }.getOrNull()?.takeIf { it.lObj("fix").isNotEmpty() }?.let { LearnContent(it) } }
}

// ---------------------------------------------------------------- #/style
object StyleQuiz {
    val IDS = listOf("natural", "precision", "pragmatic", "curious")
    /** the winner of the six picks (style ids): most picks; a tie goes to the most recent pick among the leaders; none = natural */
    fun winner(picks: List<String>): String {
        val score = HashMap<String, Int>(); for (p in picks) score[p] = (score[p] ?: 0) + 1
        val mx = score.values.maxOrNull() ?: 0
        return picks.asReversed().firstOrNull { score[it] == mx } ?: "natural"
    }
}

// ---------------------------------------------------------------- #/quick
object Quick {
    const val LIMIT = 15; const val COUNT = 4; const val MIN_POOL = 3; const val HOLD_RIGHT_MS = 320; const val HOLD_WRONG_MS = 900; const val GOOD_PCT = 75
    class Result(val pct: Int, val xp: Int, val secs: Int, val good: Boolean, val timedOut: Boolean, val right: Int, val total: Int)
    fun result(right: Int, total: Int, timedOut: Boolean, elapsed: Double): Result {
        val pct = if (total == 0) 0 else jsRound(right.toDouble() / total * 100)
        return Result(pct, right * 2, min(LIMIT, max(1, jsRound(elapsed))), pct >= GOOD_PCT, timedOut, right, total)
    }
}

// ---------------------------------------------------------------- #/confidence
object Confidence {
    val LEVELS = listOf("A1", "A2", "B1", "B2")
    const val DAILY_SECONDS = 120; const val PAUSE_GAP_MS = 1200; const val KEY = "vb.conf"
    private val NORM = Regex("[^a-z0-9' ]+"); private val SPACES = Regex("\\s+")
    private val FILL = Regex("\\b(um+|uh+|er+|erm|ah+|you know|i mean|like)\\b", RegexOption.IGNORE_CASE)
    /** `norm` of confidence.js: lower-case, right quote -> ', everything but a-z 0-9 ' and space -> space, collapse, trim */
    fun norm(s: String): String = SPACES.replace(NORM.replace(s.lowercase().replace('’', '\''), " "), " ").trim()
    fun toks(s: String): List<String> = norm(s).split(" ").filter { it.isNotEmpty() }
    fun fillers(s: String): Int = FILL.findAll(s).count()
    /** the confidence score 0-100 of one daily challenge (`scoreOf`) */
    fun score(secs: Double, wpm: Double, pausesPerMin: Double, phrases: Int, self: Int?): Int {
        val wpmS: Double? = if (wpm == 0.0) null else if (wpm in 90.0..160.0) 100.0 else if (wpm < 90) max(20.0, jsRound(wpm / 90 * 100).toDouble()) else max(50.0, 100 - (wpm - 160))
        val pauseS = max(20.0, 100 - max(0.0, pausesPerMin - 2) * 12) * min(1.0, secs / 60)
        val flu = if (wpmS == null) pauseS else (wpmS + pauseS) / 2
        val phr = min(100.0, phrases * 25.0); val sf = ((self ?: 3) - 1) / 4.0 * 100
        return jsRound(flu * 0.35 + phr * 0.25 + sf * 0.4)
    }
    fun allPhrases(conf: JsonObject): List<String> =
        (conf.lList("units").flatMap { it.lList("phrases") } + conf.lList("toolkit").flatMap { it.lList("phrases") })
            .map { norm(it.lStr("say").split("…").first()) }.filter { it.split(" ").filter { w -> w.isNotEmpty() }.size >= 2 }
    /** the learned phrases found in what the learner said (distinct, in phrase order) */
    fun used(said: String, phrases: List<String>): List<String> { val ns = " " + norm(said) + " "; val seen = HashSet<String>(); return phrases.filter { ns.contains(" $it ") && seen.add(it) } }
    /** consecutive days (yyyy-MM-dd) ending today, or yesterday when today has none yet */
    fun streak(days: List<String>, today: String): Int {
        val set = days.toSet(); var d = runCatching { LocalDate.parse(today) }.getOrNull() ?: return 0
        if (today !in set) d = d.minusDays(1)
        var n = 0
        while (d.toString() in set && n < 400) { n++; d = d.minusDays(1) }
        return n
    }
    /** "fill the blank": the gap word replaced by ___ (first whole-word match, any case) */
    fun blank(say: String, gap: String): String = Regex("\\b" + Regex.escape(gap) + "\\b", RegexOption.IGNORE_CASE).replaceFirst(say, "___")
    /** shadowing feedback per word of [say]: true = heard, false = missed, null = not a word */
    fun marks(say: String, heard: String): List<Pair<String, Boolean?>> {
        val got = toks(heard).toSet()
        return say.split(WS_RUN).filter { it.isNotEmpty() }.map { w -> val n = norm(w); w to (if (n.isEmpty()) null else n in got) }
    }
    /** unit level -> the role-play level (0-2) and the three CEFR labels */
    fun rpLevel(level: String): Pair<Int, List<String>> { val b2 = level == "B2"; return (if (b2) 2 else (mapOf("A1" to 0, "A2" to 1, "B1" to 2)[level] ?: 0)) to (if (b2) listOf("A2", "B1", "B2") else listOf("A1", "A2", "B1")) }
    /** the question of the day: epochDay = floor((now - tzOffset) / 864e5), index = epochDay % count */
    fun dailyIndex(now: Long, tzOffsetMinutes: Int, count: Int): Int {
        if (count <= 0) return 0
        val day = floor((now - tzOffsetMinutes * 60_000.0) / 86_400_000.0).toLong()
        return (((day % count) + count) % count).toInt()
    }
    /** the web's `RP.chat` scenario of a unit's "Hoi thoai ngan" step: the same script shape as the role-play pack (every line given for the three levels) */
    fun roleplayScript(u: JsonObject): JsonObject {
        val r = u.lObj("roleplay")
        fun x3(v: JsonElement?): JsonElement = JsonArray(listOf(v ?: JsonNull, v ?: JsonNull, v ?: JsonNull))
        return JsonObject(linkedMapOf<String, JsonElement>(
            "id" to JsonPrimitive("cf-" + u.lStr("id")), "em" to (u["em"] ?: JsonNull), "title" to (u["titleEn"] ?: JsonNull), "name" to (u["title"] ?: JsonNull), "kind" to JsonPrimitive("everyday"),
            "lv" to JsonArray(rpLevel(u.lStr("level")).second.map { JsonPrimitive(it) }), "ai" to (r["ai"] ?: JsonNull), "you" to (r["you"] ?: JsonNull), "vocab" to JsonArray(emptyList()),
            "turns" to JsonArray(r.lList("turns").map { JsonObject(linkedMapOf<String, JsonElement>("a" to x3(it["a"]), "h" to x3(it["h"]), "br" to (it["br"] ?: JsonNull))) }), "end" to x3(r["end"])))
    }
}

// ---------------------------------------------------------------- #/grammar
/** `grammar-pack.json` (download; `grammar-starter.json` offline): units, chapters, the lesson index, 80 lessons, the self-check regexes and the L1 notes. */
class GrammarPack(j: JsonObject) {
    val units = j.lList("units"); val chapters = j.lList("chapters"); val index = j.lList("index")
    val fallback: Map<String, Int> = j.lObj("fallback").mapValues { it.value.lInt() }
    val focus: Map<String, List<String>> = j.lObj("focus").mapValues { it.value.lStrs() }
    val lessons: Map<String, JsonObject> = j.lList("lessons").associateBy { it.lStr("id") }
    val check: Map<String, List<String>> = j.lObj("check").mapValues { it.value.lStrs() }
    val l1: Map<String, JsonObject> = j.lObj("l1").mapValues { it.value.lObj() }
    val full: Boolean get() = index.isNotEmpty() && lessons.size >= index.size
    fun entry(id: String): JsonObject? = index.firstOrNull { it.lStr("id") == id }
    /** `chapterOf`: the chapter listing the lesson, else the chapter of its unit's fallback number, else chapter 7 */
    fun chapterOf(id: String): JsonObject {
        chapters.firstOrNull { id in it.lStrs("ids") }?.let { return it }
        val unit = entry(id)?.lStr("unit") ?: ""
        return chapters.firstOrNull { it.lInt("n") == fallback[unit] } ?: chapters.getOrNull(6) ?: chapters.firstOrNull() ?: JsonObject(emptyMap())
    }
    /** `lessonsOf`: the chapter's listed lessons, then lessons no chapter lists that fall back to it */
    fun lessonsOf(c: JsonObject): List<JsonObject> {
        val listed = c.lStrs("ids").mapNotNull { entry(it) }
        val extra = index.filter { x -> chapters.none { x.lStr("id") in it.lStrs("ids") } && chapterOf(x.lStr("id")).lInt("n") == c.lInt("n") }
        return listed + extra
    }
    val order: List<Pair<JsonObject, JsonObject>> get() = chapters.flatMap { c -> lessonsOf(c).map { it to c } }
    fun unit(id: String): JsonObject = units.firstOrNull { it.lStr("id") == id } ?: units.firstOrNull() ?: JsonObject(emptyMap())
    companion object { fun parse(text: String): GrammarPack? = runCatching { Json.parseToJsonElement(text) as? JsonObject }.getOrNull()?.takeIf { it.lArr("index").isNotEmpty() }?.let { GrammarPack(it) } }
}

sealed class DrillOutcome {
    object TooShort : DrillOutcome()
    class Graded(val ok: Boolean, val given: String, val answer: String, val typo: List<LessonFx.Mark>?) : DrillOutcome()
}

object GrammarCore {
    const val PASS_PCT = 80
    private fun rx(p: String, ci: Boolean = false) = Regex(p, if (ci) setOf(RegexOption.IGNORE_CASE) else emptySet())
    private val QUOTES = rx("[’‘`]"); private val WONT = rx("won't"); private val CANT = rx("can't|can not"); private val NT = rx("n't\\b"); private val RE = rx("'re\\b"); private val VE = rx("'ve\\b")
    private val LL = rx("'ll\\b"); private val AM = rx("'m\\b"); private val PUNCT = rx("[.,!?;:\"“”()]"); private val WS = rx("\\s+"); private val THOUSANDS = rx("(\\d),(?=\\d{3}\\b)")
    private val HYPHEN = rx("([a-z])-(?=[a-z])", true); private val IZ = rx("(\\w)iz(e|ed|es|ing|ation|ations)\\b"); private val PC = rx("(\\d)\\s*(?:per cent|percent)\\b"); private val SP = rx("\\s+%")
    private val D1 = rx("'d\\b", true); private val IS1 = rx("\\b(it|he|she|that|there|what|who|where|here|this)'s\\b", true)
    /** `dnorm`: lower-case, contractions spelt out, punctuation -> space, wrapped in spaces */
    fun dnorm(s: String): String {
        var t = s.lowercase()
        t = QUOTES.replace(t, "'"); t = WONT.replace(t, "will not"); t = CANT.replace(t, "cannot"); t = NT.replace(t, " not"); t = RE.replace(t, " are"); t = VE.replace(t, " have"); t = LL.replace(t, " will"); t = AM.replace(t, " am")
        t = PUNCT.replace(t, " "); t = WS.replace(t, " ")
        return " " + t.trim() + " "
    }
    /** `dnorm2`: also 2,000 = 2000, three-fold = threefold, -ize = -ise, "10 per cent" = "10%" */
    fun dnorm2(s: String): String {
        var t = dnorm(HYPHEN.replace(THOUSANDS.replace(s, "$1"), "$1"))
        t = IZ.replace(t, "$1is$2"); t = PC.replace(t, "$1%"); t = SP.replace(t, "%")
        return t
    }
    private fun variants(given: String): List<String> {
        var out = listOf(QUOTES.replace(given, "'"))
        out = out.flatMap { v -> if (D1.containsMatchIn(v)) listOf(D1.replace(v, " would"), D1.replace(v, " had")) else listOf(v) }
        repeat(3) {
            out = out.flatMap { v ->
                val m = IS1.find(v) ?: return@flatMap listOf(v)
                val whole = m.value; val who = m.groupValues[1]; val at = v.indexOf(whole)
                listOf(v.substring(0, at) + who + " is" + v.substring(at + whole.length), v.substring(0, at) + who + " has" + v.substring(at + whole.length))
            }
        }
        return out.map { dnorm2(it) }
    }
    /** `matchAnswer(given, answers)` */
    fun matches(given: String, answers: List<String>): Boolean {
        val vs = variants(given)
        return answers.any { a -> val n = dnorm2(a); n in vs || variants(a).any { it in vs } }
    }
    /** "Thu thach tu dat cau": the first match of the lesson's structure regex in the sentence ("" = none) */
    fun ownHit(sentence: String, pattern: String): String = runCatching { Regex(pattern, RegexOption.IGNORE_CASE).find(sentence)?.value ?: "" }.getOrDefault("")
    fun quizXp(right: Int) = 10 + right * 3
    fun drillXp(right: Int) = 10 + right * 4
    fun mixXp(right: Int) = 10 + right * 2
    fun pct(right: Int, total: Int): Int = if (total == 0) 0 else jsRound(right.toDouble() / total * 100)
    fun plain(s: String): String = s.replace("[[", "").replace("]]", "")
    fun tokens(s: String): List<String> = s.replace("“", "").replace("”", "").replace("\"", "").split(WS_RUN).filter { it.isNotEmpty() }
    private fun fxNorm(s: String): String = WS_RUN.replace(s.lowercase().replace(Regex("[’‘`]"), "'"), " ").jsTrim().replace(Regex("[.!?,;:]+\\z"), "")
    /** `gradeDrill`: verb / form / fill / rewrite / combine (matchAnswer, one letter slip allowed in words copied from the question), error (the part picked), own (the lesson's structure regex). null = nothing to grade yet. */
    fun grade(d: JsonObject, given0: String, picked: Int?, pattern: String?, isWord: ((String) -> Boolean)? = null): DrillOutcome? {
        val t = d.lStr("t"); val answers = d.lStrs("a")
        if (t == "error") {
            val p = picked ?: return null; val parts = d.lStrs("parts"); val w = d.lInt("w")
            if (p < 0 || p >= parts.size || w >= parts.size) return null
            return DrillOutcome.Graded(p == w, parts[p], parts[w] + " → " + d.lStr("fix"), null)
        }
        val given = given0.jsTrim()
        if (t == "own") {
            if (given.isEmpty()) return null
            val sentence = given.split(WS_RUN).filter { it.isNotEmpty() }.joinToString(" ")
            if (sentence.split(" ").size < 4 || !Regex("[A-Za-z]").containsMatchIn(sentence)) return DrillOutcome.TooShort
            return DrillOutcome.Graded(if (pattern != null) ownHit(sentence, pattern).isNotEmpty() else matches(sentence, answers), sentence, answers.firstOrNull() ?: "", null)
        }
        if (given.isEmpty()) return null
        if (d.lStr("start").isNotEmpty() && dnorm(given) == dnorm(d.lStr("start"))) return null
        if (matches(given, answers)) return DrillOutcome.Graded(true, given, answers.firstOrNull() ?: "", null)
        val seen = fxNorm(d.lStr("q") + " " + d.lStr("start")).split(Regex("[^a-z']+")).toSet()
        for (a in answers) {
            val protect = fxNorm(a).split(" ").filter { w -> w.replace(Regex("[^a-z']"), "") !in seen }
            val r = LessonFx.typo(given, a, false, protect, isWord)
            if (r.ok) return DrillOutcome.Graded(true, given, a, if (r.typo) r.marks else null)
        }
        return DrillOutcome.Graded(false, given, answers.firstOrNull() ?: "", null)
    }
    /** the mistake record of a wrong drill / quiz answer (App.logMistake payload) */
    fun mistake(q: String, answer: String, given: String, explain: String, ref: String): JsonObject =
        JsonObject(linkedMapOf<String, JsonElement>("kind" to JsonPrimitive("grammar"), "q" to JsonPrimitive(q), "answer" to JsonPrimitive(answer), "given" to JsonPrimitive(given), "explain" to JsonPrimitive(explain), "ref" to JsonPrimitive(ref)))
}

// ---------------------------------------------------------------- #/method
object Method {
    private const val DAY = 86_400_000L
    class Input(
        val now: Long, val dayKey: (Long) -> String, val cards: List<JsonObject>, val reviewDays: JsonObject, val game: JsonObject, val settings: JsonObject, val essayPrompts: List<String>, val mistakes: Int,
        val readings: List<String>, val listening: List<String>, val grammar: List<String>, val prompts: List<String>, val speakBank: Int = 0,
    )
    class Line(val key: String, val vars: Map<String, String> = emptyMap())
    class LoopStep(val href: String, val done: Boolean, val sub: Line)
    class Strand(val id: String, val pct: Int, val weak: Boolean)
    class Memory(val remembered: Int, val learning: Int, val due: Int, private val cards: List<Pair<Double, Long>>, private val now: Long) {
        val any: Boolean get() = cards.isNotEmpty()
        /** average chance of recall after [days] more days without review */
        fun at(days: Double): Double = if (cards.isEmpty()) 0.0 else cards.sumOf { recall(max(0.0, (now - it.second).toDouble() / DAY) + days, it.first) } / cards.size
    }
    class Result(val loop: List<LoopStep>, val loopDone: Int, val strands: List<Strand>, val weakest: String?, val stage: String?, val memory: Memory, val stats: List<Line>, val forgetting: Int, val dueNow: Int,
                 val hGrammar: String, val hReading: String, val hListening: String, val hSpeak: String, val hWrite: String)
    /** FSRS retrievability R(t, S) */
    fun recall(t: Double, s: Double): Double = (1 + SRSParams.FSRS5.FACTOR * t / s).pow(SRSParams.FSRS5.DECAY)
    /** the interval at which retrievability falls to [keep] */
    fun interval(s: Double, keep: Double): Double = s / SRSParams.FSRS5.FACTOR * (keep.pow(1 / SRSParams.FSRS5.DECAY) - 1)

    private fun counters(i: Input, keys: List<String>, n: Int = 7): Int {
        var t = 0
        for (k in 0 until n) { val x = i.game.lObj("days").lObj(i.dayKey(i.now - k * DAY)); for (m in keys) t += x.lInt(m) }
        return t
    }
    private fun reviewsIn(i: Input, n: Int): Int { var t = 0; for (k in 0 until n) t += i.reviewDays[i.dayKey(i.now - k * DAY)].lNum()?.toInt() ?: 0; return t }
    private fun own(x: JsonObject) = x.lStr("title") == "Câu của tôi"
    private fun srs(c: JsonObject): JsonObject = c.lObj("srs")

    fun compute(i: Input): Result {
        val now = i.now; val g = i.game; val d = g.lObj("days").lObj(i.dayKey(now))
        val reviewed = i.cards.filter { c -> val s = srs(c); s.lTrue("last") && s.lInt("reps") > 0 }
        val learning = i.cards.count { c -> val s = srs(c); s.lTrue("last") && !(s.lInt("reps") > 0) }
        val dueNow = i.cards.count { c -> val s = srs(c); (s.lInt("reps") > 0 || s.lTrue("last")) && (s.lNum("due") ?: 0.0) <= now }
        val forget = CardMath.forgetting(i.cards, now).size
        val memory = Memory(reviewed.size, learning, dueNow, reviewed.map { c -> val s = srs(c); (s.lNum("S") ?: max(0.5, if (s.lTrue("interval")) s.lNum("interval") ?: 1.0 else 1.0)) to (s.lNum("last") ?: 0.0).toLong() }, now)
        fun undone(ids: List<String>, key: String) = ids.firstOrNull { val e = g.lObj(key)[it]; e == null || e is JsonNull }
        val hG = undone(i.grammar, "grammarDone")?.let { "#/grammar/$it" } ?: "#/grammar"
        val hR = undone(i.readings, "readDone")?.let { "#/read/$it" } ?: "#/reading"
        val hL = undone(i.listening, "listenDone")?.let { "#/listen/$it" } ?: "#/listening"
        val hSpeak = if (i.speakBank > 0) "#/speaking/p1/${(now / DAY).toInt() % i.speakBank}" else "#/speaking"
        val done = i.essayPrompts.toSet()
        val wp = i.prompts.firstOrNull { it !in done } ?: if (i.prompts.isEmpty()) null else i.prompts[(now / DAY).toInt() % i.prompts.size]
        val hWrite = wp?.let { "#/write/$it" } ?: "#/write"
        val todayReviews = i.reviewDays[i.dayKey(now)].lNum()?.toInt() ?: 0
        fun n(k: String) = d.lInt(k)
        val loop = listOf(
            LoopStep("#/review", dueNow == 0 && todayReviews > 0, if (dueNow > 0) Line("{n} thẻ đang ở thời điểm vàng", mapOf("n" to dueNow.toString())) else Line("Không còn thẻ đến hạn")),
            LoopStep(if (n("readings") > n("listens")) hL else hR, n("readings") + n("listens") > 0, Line("Đầu vào dễ hiểu, hơi vượt trình độ")),
            LoopStep(hR, n("newWords") >= 5, Line("Hôm nay: {n} từ", mapOf("n" to n("newWords").toString()))),
            LoopStep(hG, n("grammar") > 0, Line("Học từng bước + tự luận")),
            LoopStep(if (n("spoken") > 0) hWrite else hSpeak, n("spoken") + n("writes") > 0, Line("Dùng lại từ vừa học")),
            LoopStep("#/mistakes", i.mistakes == 0, if (i.mistakes > 0) Line("{n} lỗi chưa xem lại", mapOf("n" to i.mistakes.toString())) else Line("Không có lỗi tồn đọng")),
        )
        val own7 = i.cards.sumOf { c -> c.lList("contexts").count { own(it) && (now - (it.lNum("at") ?: 0.0)) < 7 * DAY } }
        val raw = listOf(
            "in" to (counters(i, listOf("readings")) + counters(i, listOf("listens"))).toDouble(),
            "out" to (jsRound(counters(i, listOf("spoken")) / 3.0) + counters(i, listOf("writes")) + own7 / 3.0),
            "lang" to (jsRound(reviewsIn(i, 7) / 20.0) + counters(i, listOf("grammar", "pron"))).toDouble(),
            "flu" to counters(i, listOf("matches", "dictations")).toDouble(),
        )
        val vals = raw.map { it.first to jsRound(it.second) }
        val total = vals.sumOf { it.second }
        val weakest = if (total > 0) vals.sortedBy { it.second }.first().first else null
        val strands = vals.map { Strand(it.first, if (total > 0) jsRound(it.second.toDouble() / total * 100) else 0, weakest == it.first) }
        val nCtx = i.cards.count { c -> c.lList("contexts").any { !own(it) } }
        val mine = i.cards.sumOf { c -> c.lList("contexts").count { own(it) } }
        val phrases = i.cards.count { CardMath.isPhrase(it) }
        val started = i.cards.count { srs(it).lTrue("last") }
        val rd = g.lObj("readDone").size; val ld = g.lObj("listenDone").size; val gd = g.lObj("grammarDone").size; val pd = g.lObj("pronDone").size
        val totalReviews = i.reviewDays.values.sumOf { it.lNum()?.toInt() ?: 0 }
        val stats = listOf(
            if (forget > 0) Line("{n} từ đang sắp quên", mapOf("n" to forget.toString())) else Line("Chưa có từ nào sắp quên"),
            Line("{due} thẻ đến hạn · {total} lượt ôn đã làm", mapOf("due" to dueNow.toString(), "total" to totalReviews.toString())),
            Line("{n} từ đã học", mapOf("n" to started.toString())),
            Line("Đã đọc {read}/{readTotal} bài · nghe {listen}/{listenTotal} phần", mapOf("read" to rd.toString(), "readTotal" to i.readings.size.toString(), "listen" to ld.toString(), "listenTotal" to (if (i.listening.isEmpty()) 20 else i.listening.size).toString())),
            Line("{n} từ đã lưu kèm ngữ cảnh thật", mapOf("n" to nCtx.toString())),
            Line("{n} câu tự đặt", mapOf("n" to mine.toString())),
            Line("{n} bài phát âm đã học", mapOf("n" to pd.toString())),
            Line("{n} bài ngữ pháp đã làm", mapOf("n" to gd.toString())),
            Line("{essays} bài viết · {spoken} điểm nói (30 ngày)", mapOf("essays" to i.essayPrompts.size.toString(), "spoken" to counters(i, listOf("spoken"), 30).toString())),
            Line("{n} cụm từ đã lưu", mapOf("n" to phrases.toString())),
            if (i.mistakes > 0) Line("{n} lỗi chưa xem lại", mapOf("n" to i.mistakes.toString())) else Line("Không có lỗi tồn đọng"),
            Line("Chuỗi {n} ngày · {xp} XP", mapOf("n" to streakOf(i).toString(), "xp" to g.lInt("xp").toString())),
        )
        return Result(loop, loop.count { it.done }, strands, weakest, i.settings.lObj("placement").lStr("stage").ifEmpty { null }, memory, stats, forget, dueNow, hG, hR, hL, hSpeak, hWrite)
    }
    /** `App.streak()`: consecutive days with reviews ending today (or yesterday when today has none) */
    private fun streakOf(i: Input): Int {
        fun has(t: Long) = i.reviewDays[i.dayKey(t)].lTrue()
        var t = i.now; if (!has(t)) t -= DAY
        var n = 0
        while (has(t)) { n++; t -= DAY; if (n > 3650) break }
        return n
    }
}
