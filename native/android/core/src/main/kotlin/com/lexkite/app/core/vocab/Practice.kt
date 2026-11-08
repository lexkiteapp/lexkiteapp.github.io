package com.lexkite.app.core.vocab

import com.lexkite.app.core.lesson.Speaking
import kotlinx.serialization.json.JsonObject
import java.text.Normalizer
import kotlin.math.abs
import kotlin.math.floor
import kotlin.math.min
import kotlin.random.Random

/** qengine.js QE.norm: the comparison form of an exam/typed answer. */
object Qe {
    fun norm(s: String?): String {
        var x = (s ?: "").lowercase().replace(Regex("[’‘`]"), "'").replace(Regex("[£$€]"), "")
        x = x.replace(Regex("(\\d),(\\d{3})"), "$1$2").replace(Regex("[.,!?;:\"“”()]"), " ")
        return WS_RUN.replace(x, " ").jsTrim().replace(Regex("^(the|a|an) "), "")
    }
}

/** choice-kit.js accept(): which typed answers count as right (case, curly quotes, contractions, optional one-slip typo). */
object ChoiceKit {
    private val CONTR = listOf("\\bcan't\\b" to "cannot", "\\bcan not\\b" to "cannot", "\\bwon't\\b" to "will not", "\\bshan't\\b" to "shall not", "\\bain't\\b" to "is not", "n't\\b" to " not",
        "\\bi'm\\b" to "i am", "'re\\b" to " are", "'ve\\b" to " have", "'ll\\b" to " will", "\\blet's\\b" to "let us", "\\b(it|he|she|that|there|what|who|where|here)'s\\b" to "$1 is", "'d\\b" to " would").map { Regex(it.first) to it.second }
    fun canon(s: String?): String {
        var x = WS_RUN.replace(Normalizer.normalize(s ?: "", Normalizer.Form.NFC).lowercase().replace(Regex("[’‘`´]"), "'").replace(Regex("[“”]"), "\""), " ").jsTrim()
        x = x.replace(Regex("^[\"'(]+|[\"')]+\\z"), "").replace(Regex("[.!?,;:…]+\\z"), "").replace(Regex("\\s+([.,!?;:])"), "$1").jsTrim()
        for ((re, to) in CONTR) x = re.replace(x, to)
        return WS_RUN.replace(x, " ").jsTrim()
    }
    /** Damerau-style edit distance capped at 2 (a swap of two neighbours is one slip). */
    private fun lev(a: String, b: String): Int {
        if (abs(a.length - b.length) > 1) return 2
        val d = Array(a.length + 1) { i -> IntArray(b.length + 1) { j -> if (i != 0) (if (j != 0) 0 else i) else j } }
        for (i in 1..a.length) for (j in 1..b.length) {
            d[i][j] = min(min(d[i - 1][j] + 1, d[i][j - 1] + 1), d[i - 1][j - 1] + (if (a[i - 1] == b[j - 1]) 0 else 1))
            if (i > 1 && j > 1 && a[i - 1] == b[j - 2] && a[i - 2] == b[j - 1]) d[i][j] = min(d[i][j], d[i - 2][j - 2] + 1)
        }
        return d[a.length][b.length]
    }
    class Accepted(val ok: Boolean, val how: String, val want: String)
    /** how: exact | variant | typo | "". */
    fun accept(given: String?, answer: String?, alts: List<String> = emptyList(), typo: Boolean = false): Accepted {
        val want = (listOf(answer) + alts).filter { it != null && it.jsTrim().isNotEmpty() }.map { it!! }
        val raw = (given ?: "").jsTrim()
        if (raw.isEmpty()) return Accepted(false, "", want.firstOrNull() ?: "")
        for (w in want) if (raw == w.jsTrim()) return Accepted(true, "exact", w)
        val c = canon(raw)
        for (w in want) if (c == canon(w)) return Accepted(true, "variant", w)
        if (typo) for (w in want) {
            val a = c.split(" "); val b = canon(w).split(" ")
            if (a.size != b.size) continue
            var slips = 0
            val fine = b.indices.all { i -> a[i] == b[i] || (b[i].replace(Regex("[^a-z]"), "").length >= 5 && lev(a[i], b[i]) == 1 && ++slips > 0) }
            if (fine && slips > 0) return Accepted(true, "typo", w)
        }
        return Accepted(false, "", want.firstOrNull() ?: "")
    }
}

/** lesson-fx.js typo(): <= 1 slip per word of >= 4 letters is accepted; `similarity` = ui.js similarity (null = not loaded -> only exact text passes). */
object LessonFx {
    class Mark(val w: String, val fix: Boolean = false)
    class Typo(val ok: Boolean, val typo: Boolean, val marks: List<Mark>)
    private fun norm(s: String?) = WS_RUN.replace((s ?: "").lowercase().replace(Regex("[’‘`]"), "'"), " ").jsTrim().replace(Regex("[.!?,;:]+\\z"), "")
    private fun dist(a: String, b: String, sim: ((String, String) -> Double)?): Int {
        if (sim == null) return if (a == b) 0 else 99
        val n = maxOf(a.replace(Regex("[^a-z ]"), "").length, b.replace(Regex("[^a-z ]"), "").length)
        return floor((1 - sim(a, b)) * n + 0.5).toInt()
    }
    fun typo(given: String?, target: String?, strict: Boolean = false, protect: List<String> = emptyList(), isWord: ((String) -> Boolean)? = null, similarity: ((String, String) -> Double)? = Speaking::similarity): Typo {
        val a = norm(given); val b = norm(target)
        if (a.isEmpty() || b.isEmpty()) return Typo(false, false, emptyList())
        val shown = WS_RUN.split((target ?: "").jsTrim().replace(Regex("[.!?,;:]+\\z"), ""))
        if (a == b) return Typo(true, false, shown.map { Mark(it) })
        if (strict) return Typo(false, false, emptyList())
        val ta = a.split(" "); val tb = b.split(" ")
        if (ta.size != tb.size || shown.size != tb.size) return Typo(false, false, emptyList())
        val keep = protect.map { norm(it) }.toSet(); val marks = ArrayList<Mark>()
        for (i in tb.indices) {
            if (ta[i] == tb[i]) { marks.add(Mark(shown[i])); continue }
            val letters = tb[i].count { it in 'a'..'z' }
            if (tb[i] in keep || letters < 4 || dist(ta[i], tb[i], similarity) > 1 || (isWord != null && isWord(ta[i]))) return Typo(false, false, emptyList())
            marks.add(Mark(shown[i], true))
        }
        return Typo(true, true, marks)
    }
}

/** #/practice: sources, pools and the scoring rules of the modes. Port of web/js/study.js (sourceList/pool/runQuiz/runLearn rules) + study-games.js (match XP). */
object Practice {
    val MODES = listOf("learn", "mcq", "cloze", "listen", "test", "match", "speak")
    class Source(val value: String, val emoji: String, val key: String, val vars: Map<String, String>? = null) { fun label(t: Tx = Tx.RAW) = emoji + " " + t.t(key, vars) }

    /** sourceList(): deck · due · forgetting · phrases · weak · level 1..5 · origins · every topic. Keys are the web's Vietnamese source strings (translate with [Tx]). */
    fun sources(deckSize: Int, words: WebWords?): List<Source> {
        val o = arrayListOf(Source("deck", "📒", "Sổ từ của tôi ({n})", mapOf("n" to deckSize.toString())), Source("due", "🔁", "Thẻ đến hạn hôm nay"), Source("forgetting", "⚠️", "Từ sắp quên (độ nhớ < 85%)"),
            Source("phrases", "🧩", "Cụm từ & cấu trúc của tôi"), Source("weak", "🧩", "Từ hay quên"))
        for (i in 1..5) o.add(Source("level:$i", "📶", "Cấp độ nhớ {n}", mapOf("n" to i.toString())))
        for (k in CardMath.ORIGINS) o.add(Source("origin:$k", CardMath.ORIGIN_EMOJI.getValue(k), CardMath.ORIGIN_NAME.getValue(k)))
        if (words != null) for (tp in words.topics) o.add(Source("topic:${tp.id}", tp.emoji, tp.name))
        return o
    }

    private fun norm(w: JsonObject, meanOf: (JsonObject) -> String) = jo("word" to w.gs("word"), "ipa" to w.gs("ipa"), "vi" to meanOf(w), "ex" to w.gs("ex"), "def" to w.gs("def"), "pos" to w.gs("pos"), "emoji" to w.gs("emoji").ifEmpty { "📘" }, "image" to w.gs("image"), "audio" to w.gs("audio"), "level" to w.gs("level"), "topic" to w.gs("topic"))

    /** pool(src): normalized words `{word,ipa,vi,ex,def,pos,emoji,image,audio,level,topic}`. `shuffle` null keeps order (tests). */
    fun pool(src: String?, cards: Map<String, JsonObject>, words: WebWords?, now: Long, shuffle: Random? = Random.Default, meanOf: (JsonObject) -> String = CardMath::meanOf): List<JsonObject> {
        val all = cards.values
        val withVi = all.filter { it.gt("vi") }
        var list: List<JsonObject> = when {
            src == "due" -> CardMath.dueList(all, now, practicable = true)
            src == "weak" -> withVi.filter { c -> val s = CardMath.srsOf(c); s.gn("lapses") > 0 || (if (s["D"] != null && s["D"] !is kotlinx.serialization.json.JsonNull) s.gn("D") >= 7 else (s.gt("ef") && s.gn("ef") < 2.3)) }
            src == "forgetting" -> CardMath.forgetting(all, now)
            src == "phrases" -> withVi.filter { CardMath.isPhrase(it) }
            src != null && src.startsWith("level:") -> withVi.filter { CardMath.level5(it.go("srs")) == src.substring(6).toIntOrNull() }
            src != null && src.startsWith("origin:") -> withVi.filter { CardMath.origin(it) == src.substring(7) }
            src != null && src.startsWith("topic:") -> words?.topic(src.substring(6))?.words ?: emptyList()
            else -> withVi
        }
        if (list.size < 4 && (src.isNullOrEmpty() || src == "deck")) {
            val lib = words?.topics?.filter { it.group == "topics" }?.flatMap { it.words } ?: emptyList()
            list = (if (shuffle == null) lib else lib.shuffled(shuffle)).take(120)
        }
        return list.map { norm(it, meanOf) }
    }

    /** runQuiz: 10 questions (20 in the test), question types per mode. */
    fun quizSize(mode: String) = if (mode == "test") 20 else 10
    fun quizTypes(mode: String): List<String> = when (mode) { "mcq" -> listOf("mcq-vi"); "cloze" -> listOf("type-cloze"); "listen" -> listOf("type-listen"); else -> listOf("mcq-vi", "mcq-en", "type-cloze", "type-listen", "type-vi") }
    fun quizXpPerAnswer(hard: Boolean) = if (hard) 6 else 3
    /** lesson-fx HARD_AT: right answers in a row before the hard mode is offered; modes that offer it (not the test). */
    const val HARD_AT = 8
    val HARD_MODES = setOf("mcq", "cloze", "listen")
    fun percent(score: Int, total: Int) = floor(score.toDouble() / total * 100 + 0.5).toInt()
    /** `reward({quizzes:1, perfect, xp})` base XP of a finished quiz. */
    fun quizBaseXp(pct: Int) = if (pct == 100) 15 else 5
    /** Estimated vocabulary band shown after the test. */
    fun band(pct: Int) = if (pct >= 95) "8.5+" else if (pct >= 85) "7.5–8.0" else if (pct >= 70) "6.5–7.0" else if (pct >= 50) "5.5–6.0" else "< 5.5"
    /** match: seconds + 1 s penalty per miss; XP by speed. */
    fun matchXp(seconds: Double) = 10 + (if (seconds < 25) 10 else if (seconds < 40) 5 else 0)
    const val LEARN_BONUS_XP = 20
    const val LEARN_STEP_XP = 2

    /** "I already know this word" in Learn: the schedule written on the card (about a month out). Merge over `card.srs`. */
    fun knownSrs(now: Long): JsonObject = jo("ef" to 2.5, "interval" to 30, "reps" to 2, "lapses" to 0, "due" to now + 30 * CardMath.DAY, "last" to now, "step" to 0, "S" to 30, "D" to 3)

    /** runLearn: up to 8 words (lowest mastery first); each goes mcq-vi -> type-listen -> type-spell. Right = stage+1 (+2 XP), wrong = stage-1, re-queued 2-3 places on. */
    class Learn(items: List<JsonObject>, shuffle: Random? = Random.Default) {
        val stages = listOf("mcq-vi", "type-listen", "type-spell")
        val stage = LinkedHashMap<String, Int>().also { m -> for (w in items) m[w.gs("word")] = 0 }
        private val queue: MutableList<JsonObject> = (if (shuffle == null) items else items.shuffled(shuffle)).toMutableList()
        private val rnd = shuffle
        var answered = 0; var mistakes = 0
        val doneWords get() = stage.values.count { it == 3 }
        val total = items.size
        /** Next word and its question type (null = finished). */
        fun next(): Pair<JsonObject, String>? {
            queue.removeAll { (stage[it.gs("word")] ?: 3) >= 3 }
            val w = queue.removeFirstOrNull() ?: return null
            return w to stages[stage.getValue(w.gs("word"))]
        }
        fun answer(w: JsonObject, ok: Boolean): Int {
            val k = w.gs("word"); val st = stage.getValue(k); answered++
            val xp = if (ok) { stage[k] = st + 1; LEARN_STEP_XP } else { mistakes++; stage[k] = maxOf(0, st - 1); 0 }
            if (stage.getValue(k) < 3) queue.add(min(queue.size, 2 + (rnd?.nextInt(2) ?: 0)), w)
            return xp
        }
        fun markKnown(w: JsonObject) { stage[w.gs("word")] = 3 }
    }
    /** Words for Learn: lowest mastery first (cards not in the deck rank -1), max 8. */
    fun learnItems(list: List<JsonObject>, cards: Map<String, JsonObject>, shuffle: Random? = Random.Default): List<JsonObject> {
        fun rank(w: JsonObject) = cards[w.gs("word").lowercase()]?.let { CardMath.mastery(it.go("srs")) } ?: -1
        return (if (shuffle == null) list else list.shuffled(shuffle)).sortedBy { rank(it) }.take(minOf(8, list.size))
    }
}
