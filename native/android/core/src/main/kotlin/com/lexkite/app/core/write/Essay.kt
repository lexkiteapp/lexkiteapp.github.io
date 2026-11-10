package com.lexkite.app.core.write

import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.jsTrim
import com.lexkite.app.core.vocab.strs
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/**
 * M4 P09 - the pure part of #/write, #/task1 and #/qstats (web/js/write.js, task1.js, lexis.js `analyze`, qtips.js).
 * Verified against native/shared/gen/vectors/write.json (EssayVectorsTest). A report line is a web Vietnamese source key + vars: the UI renders it through `Tx`.
 */
object Essay {
    const val MIN_WORDS = 250; const val MIN_TO_ANALYSE = 40; const val KEEP_SAVED = 20; const val SHOW_SAVED = 6; const val CLOCK_MINUTES = 40; const val WARN_SECONDS = 300
    /** `App.reward({ quizzes: 1, writes: 1, xp: 25 })` */
    val REWARD: Map<String, Int> = mapOf("quizzes" to 1, "writes" to 1); const val REWARD_XP = 25
    private val WORD = Regex("[A-Za-z][A-Za-z'\u2019-]*")
    /** `(text.match(/[A-Za-z][A-Za-z'’-]*/g) || []).length` */
    fun words(s: String): Int = WORD.findAll(s).count()
    /** the same tokens, lower-cased with the right quote turned into ' */
    fun tokens(s: String): List<String> = WORD.findAll(s).map { it.value.lowercase().replace('\u2019', '\'') }.toList()

    class Count(val w: String, val n: Int)
    /** a JS `Map<string, number>` in insertion order */
    class Counter {
        private val m = LinkedHashMap<String, Int>()
        fun add(k: String) { m[k] = (m[k] ?: 0) + 1 }
        val entries: List<Count> get() = m.map { Count(it.key, it.value) }
        val total: Int get() = m.values.sum()
    }
    class Analysis(
        val words: Int, val sentences: Int, val avg: Double, val sd: Double, val diversity: Double,
        val awl: List<Count>, val link: List<Count>, val phrases: List<Count>, val overused: List<Count>, val awlRatio: Double, val band: Double,
    ) { val awlTotal: Int get() = awl.sumOf { it.n } }

    /** lexis.js: score = 4.5 + AWL density + collocations + linking variety + diversity - repetition - short text; caps for short essays. */
    fun lexicalBand(words: Int, awlRatio: Double, phrases: Int, link: Int, diversity: Double, overused: Int): Double {
        var score = 4.5
        score += minOf(1.5, awlRatio * 20)
        score += minOf(1.0, phrases * 0.2)
        score += minOf(0.8, link * 0.1)
        score += if (diversity > 0.75) 0.7 else if (diversity > 0.6) 0.4 else 0.0
        score -= minOf(1.0, overused * 0.25)
        if (words < 250) score -= 0.5
        var band = maxOf(4.0, minOf(8.5, Math.floor(score * 2 + 0.5) / 2))
        if (words < 150) band = minOf(band, 5.0) else if (words < 250) band = minOf(band, 6.0)
        return band
    }

    // ---------------------------------------------------------------- the report of #/write
    /** One "Nhan xet" line: the web source key and its variables (render with Tx; the text has <b> / <i> markup). */
    class Line(val key: String, val vars: Map<String, String> = emptyMap(), val good: Boolean = false)
    object K {
    const val SHORT = "Bài mới có <b>{n} từ</b> – IELTS Task 2 yêu cầu tối thiểu 250 từ, thiếu sẽ bị trừ điểm Task Response."
    const val AWL = "Tăng từ học thuật (AWL): thay từ thông dụng bằng từ như <i>significant, approach, impact, consequence, factor</i>."
    const val LINK = "Đa dạng từ nối hơn (Moreover, Consequently, Nevertheless, For instance…) để tăng điểm Coherence & Cohesion."
    const val PHRASES = "Dùng thêm collocation tự nhiên: <i>pose a threat, play a pivotal role, raise awareness, a growing number of…</i>"
    const val EVEN = "Câu có độ dài khá giống nhau – kết hợp câu ngắn và câu phức (mệnh đề quan hệ, câu điều kiện) để tăng điểm ngữ pháp."
    const val LONG = "Câu trung bình hơi dài (> 30 từ) – dễ mắc lỗi ngữ pháp, nên tách bớt."
    const val REPEATED = "Một số từ bị lặp nhiều lần – xem gợi ý thay thế bên dưới."
    const val GOOD = "Từ vựng đa dạng và học thuật – tiếp tục duy trì! Hãy tự kiểm tra lại ngữ pháp và chính tả."
    const val T1_SHORT = "Bài có <b>{n} từ</b> – Task 1 cần tối thiểu 150 từ."
    const val T1_NO_OVERVIEW = "Thiếu <b>đoạn tổng quan</b> (Overall, …) – đây là yếu tố quan trọng nhất để đạt band 6+ Task Achievement."
    const val T1_FEW_NUMBERS = "Dẫn chứng <b>số liệu cụ thể</b> nhiều hơn (ít nhất 4–6 con số tiêu biểu)."
    const val T1_FEW_TREND = "Dùng thêm từ chỉ <b>xu hướng</b>: rose, declined, fluctuated, peaked at, remained stable…"
    const val T1_FEW_COMPARE = "Tăng <b>so sánh</b>: whereas, compared with, twice as…, the highest…"
    const val T1_PASSIVE_PROCESS = "Với quy trình, nên dùng nhiều <b>câu bị động</b>: is collected, was replaced by, has been built…"
    const val T1_PASSIVE_MAP = "Với bản đồ, nên dùng nhiều <b>câu bị động</b>: is collected, was replaced by, has been built…"
    const val T1_OPINION = "Task 1 <b>không nêu ý kiến cá nhân</b> – bỏ “I think / In my opinion”."
    const val T1_FEW_PARAS = "Chia bài thành <b>3–4 đoạn</b> rõ ràng (mở bài, tổng quan, 2 thân bài)."
    const val T1_GOOD = "Bài có đủ các yếu tố chính của Task 1. Hãy tự kiểm tra lại độ chính xác của số liệu, ngữ pháp và chính tả."
    }
    fun tips(a: Analysis): List<Line> {
        val t = ArrayList<Line>()
        if (a.words < MIN_WORDS) t.add(Line(K.SHORT, mapOf("n" to "${a.words}")))
        if (a.awlRatio < 0.04) t.add(Line(K.AWL))
        if (a.link.size < 4) t.add(Line(K.LINK))
        if (a.phrases.size < 2) t.add(Line(K.PHRASES))
        if (a.sd < 4 && a.sentences > 4) t.add(Line(K.EVEN))
        if (a.avg > 30) t.add(Line(K.LONG))
        if (a.overused.isNotEmpty()) t.add(Line(K.REPEATED))
        return t.ifEmpty { listOf(Line(K.GOOD, good = true)) }
    }
    enum class Tone { GOOD, HARD, AGAIN }
    /** ring fill 0..100 and its colour (good >= 7, hard >= 6, else again) */
    fun ring(band: Double, span: Double): Pair<Double, Tone> = ((band - 4) / span * 100) to (if (band >= 7) Tone.GOOD else if (band >= 6) Tone.HARD else Tone.AGAIN)
    /** "AWL (n %)": `(awlRatio * 100).toFixed(1)` */
    fun pct1(r: Double): String = "%.1f".format(java.util.Locale.ROOT, Math.floor(r * 1000 + 0.5) / 10)
    /** JS prints 6 as "6" and 6.5 as "6.5" */
    fun bandText(b: Double): String = if (b == Math.floor(b)) b.toInt().toString() else b.toString()
    /** Store "essays": the new essay first, 20 kept */
    fun saving(saved: List<JsonElement>, prompt: String, text: String, words: Int, band: Double, at: Long): List<JsonElement> =
        (listOf<JsonElement>(JsonObject(linkedMapOf("prompt" to JsonPrimitive(prompt), "text" to JsonPrimitive(text), "words" to JsonPrimitive(words), "band" to JsonPrimitive(band), "at" to JsonPrimitive(at)))) + saved).take(KEEP_SAVED)
    fun sessionNumber(prompt: String): String = prompt.drop(1)

    // ---------------------------------------------------------------- Task 1 (task1.js `score`)
    const val T1_MIN_WORDS = 150; const val T1_MIN_TO_ANALYSE = 30; const val T1_CLOCK = 20; const val T1_WARN = 180
    val T1_REWARD: Map<String, Int> = mapOf("quizzes" to 1, "writes" to 1); const val T1_REWARD_XP = 20
    class Task1Score(val band: Double, val words: Int, val overview: Int, val numbers: Int, val trend: Int, val compare: Int, val notes: List<Line>)
    private fun rx(p: String) = Regex(p, RegexOption.IGNORE_CASE)
    private val OVERVIEW = rx("\\b(overall|in general|generally|it is clear that|it is evident that|as can be seen|in summary)\\b")
    private val NUMBERS = rx("\\b\\d+([.,]\\d+)?\\s?(%|per cent|percent|thousand|million|hours?)?")
    private val TREND = rx("\\b(increas|ris|rose|grow|grew|fell|fall|declin|decreas|drop|fluctuat|peak|plateau|level(l)?ed off|remain|surg|plummet|doubl|halv|overt(a|oo)k)\\w*")
    private val COMPARE = rx("\\b(than|whereas|while|compared (to|with)|by contrast|in contrast|similarly|the highest|the lowest|the largest|the smallest|twice|respectively|in comparison)\\b")
    private val OPINION = rx("\\b(I think|I believe|in my opinion|I feel)\\b")
    private val PASSIVE = rx("\\b(is|are|was|were|has been|have been)\\s+\\w+ed\\b")
    private val PARA = Regex("\\n\\s*\\n")
    /** `type` = line, bar, pie, table, process or map */
    fun task1Score(text: String, type: String): Task1Score {
        val n = words(text); val overview = OVERVIEW.findAll(text).count(); val numbers = NUMBERS.findAll(text).count(); val trend = TREND.findAll(text).count(); val compare = COMPARE.findAll(text).count()
        val opinion = OPINION.findAll(text).count(); val passive = PASSIVE.findAll(text).count()
        val paras = PARA.split(text).count { it.jsTrim().isNotEmpty() }
        val flow = type == "process" || type == "map"
        val notes = ArrayList<Line>()
        if (n < T1_MIN_WORDS) notes.add(Line(K.T1_SHORT, mapOf("n" to "$n")))
        if (overview == 0) notes.add(Line(K.T1_NO_OVERVIEW))
        if (!flow && numbers < 4) notes.add(Line(K.T1_FEW_NUMBERS))
        if (type in listOf("line", "table", "pie") && trend < 3) notes.add(Line(K.T1_FEW_TREND))
        if (compare < 2 && type != "process") notes.add(Line(K.T1_FEW_COMPARE))
        if (flow && passive < 3) notes.add(Line(if (type == "process") K.T1_PASSIVE_PROCESS else K.T1_PASSIVE_MAP))
        if (opinion > 0) notes.add(Line(K.T1_OPINION))
        if (paras < 3) notes.add(Line(K.T1_FEW_PARAS))
        var score = 5.0
        if (n >= T1_MIN_WORDS) score += 0.5
        if (overview > 0) score += 1
        if (numbers >= 4 || flow) score += 0.5
        if (trend >= 3 || type in listOf("bar", "map", "process")) score += 0.5
        if (compare >= 2) score += 0.5
        if (paras >= 3) score += 0.5
        if (opinion > 0) score -= 0.5
        var band = maxOf(4.0, minOf(8.0, score))
        if (n < 100) band = minOf(band, 4.5) else if (n < T1_MIN_WORDS) band = minOf(band, 5.5)
        return Task1Score(band, n, overview, numbers, trend, compare, notes.ifEmpty { listOf(Line(K.T1_GOOD, good = true)) })
    }

    // ---------------------------------------------------------------- #/qstats (qtips.js)
    class QRow(val kind: String, val right: Int, val total: Int, val secs: Int) {
        val pct: Int get() = Math.floor(right * 100.0 / total + 0.5).toInt()
        /** bar class: ok >= 75, no < 50 */
        val tone: Tone? get() = if (pct >= 75) Tone.GOOD else if (pct < 50) Tone.AGAIN else null
        val secsEach: Int? get() = if (secs > 0) Math.floor(secs.toDouble() / total + 0.5).toInt() else null
    }
    class QCard(val skill: String, val rows: List<QRow>, val right: Int, val total: Int, val secs: Int, val weak: String?) {
        val pct: Int get() = Math.floor(right * 100.0 / total + 0.5).toInt()
        val secsEach: Int? get() = if (secs > 0) Math.floor(secs.toDouble() / total + 0.5).toInt() else null
    }
    private fun num(e: JsonElement?): Double = (e as? JsonPrimitive)?.content?.toDoubleOrNull() ?: 0.0
    /** `game.qstat["<skill>:<kind>"] = {r, t, s, d}` -> one card per known skill (in [order]), rows weakest first, `weak` = first row with >= 3 answers under 75 % */
    fun qstatCards(game: JsonElement?, order: List<String>): List<QCard> {
        val by = HashMap<String, MutableList<QRow>>()
        val q = (game as? JsonObject)?.get("qstat") as? JsonObject
        for ((key, v) in q ?: emptyMap()) {
            val i = key.indexOf(':'); if (i < 0) continue
            val sk = key.substring(0, i); val o = v as? JsonObject ?: continue
            if (sk !in order || num(o["t"]) <= 0) continue
            by.getOrPut(sk) { ArrayList() }.add(QRow(key.substring(i + 1), num(o["r"]).toInt(), num(o["t"]).toInt(), num(o["s"]).toInt()))
        }
        return order.mapNotNull { sk ->
            val all = by[sk] ?: return@mapNotNull null
            val rows = all.sortedBy { it.right.toDouble() / it.total }
            QCard(sk, rows, rows.sumOf { it.right }, rows.sumOf { it.total }, rows.sumOf { it.secs }, rows.firstOrNull { it.total >= 3 && it.right.toDouble() / it.total < 0.75 }?.kind)
        }
    }
    /** the practice link of a row (`practiceLink`): `#/rtype/<type>`, `#/toefl-p/<kind>` or the skill's own link */
    fun practiceRoute(skill: String, kind: String, skills: Map<String, List<String>>, rtype: Map<String, String>, named: Boolean): String {
        if (skill == "ir" && rtype[kind] != null) return "#/rtype/" + rtype[kind]
        if (skill.startsWith("f") && named) return "#/toefl-p/" + (if (kind == "sentenceB") "sentence" else kind)
        return skills[skill]?.lastOrNull() ?: ""
    }
}

/** `web/data/write-pack.json` (https://lexkite.com/data/write-pack.json): criteria data, the STOP table of Lexis.analyze and the page tables of write / task1 / qstats. */
class WritePack(j: JsonObject) {
    val criteria: JsonObject = j.go("criteria") ?: JsonObject(emptyMap())
    val stop: Set<String> = j.go("lexis").strs("stop").toSet()
    val outline: Map<String, List<String>> = j.go("write")?.go("outline")?.mapValues { (it.value as JsonArray).map { x -> (x as JsonPrimitive).content } } ?: emptyMap()
    val trends: JsonObject = j.go("write")?.go("trends") ?: JsonObject(emptyMap())
    val connectors: List<String> = j.go("write").strs("connectors")
    val vocab: Map<String, List<String>> = j.go("task1")?.go("vocab")?.mapValues { (it.value as JsonArray).map { x -> (x as JsonPrimitive).content } } ?: emptyMap()
    /** SKILL() of qtips.js as [id, icon, name, link] in page order */
    val skills: List<List<String>> = j.go("qstats").ga("skills").map { r -> (r as JsonArray).map { (it as JsonPrimitive).content } }
    val rtype: Map<String, String> = j.go("qstats")?.go("rtype")?.mapValues { (it.value as JsonPrimitive).content } ?: emptyMap()
    val scoreKeys: Map<String, List<String>> = j.go("scoreKeys")?.mapValues { (it.value as JsonArray).map { x -> (x as JsonPrimitive).content } } ?: emptyMap()
    val skillTable: Map<String, List<String>> get() = skills.associate { it[0] to listOf(it[1], it[2], it[3]) }
    fun skill(id: String): List<String>? = skills.firstOrNull { it[0] == id }?.drop(1)
    companion object {
        fun parse(text: String): WritePack? = runCatching { kotlinx.serialization.json.Json.parseToJsonElement(text) as? JsonObject }.getOrNull()?.takeIf { it.go("criteria") != null }?.let { WritePack(it) }
    }
}
