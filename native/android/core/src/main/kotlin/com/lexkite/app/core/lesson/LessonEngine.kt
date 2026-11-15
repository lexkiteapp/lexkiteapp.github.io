package com.lexkite.app.core.lesson

import com.lexkite.app.core.Answer
import com.lexkite.app.core.sync.Js
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.Calendar
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/**
 * P03 lesson engine – line-by-line port of web/js/lesson/engine.js, verified by native/shared/gen/vectors/lesson.json.
 * Cards are the same JSON objects the store keeps (every web field); JS numeric/string semantics are kept where they change results
 * (>>> 0, Math.round, UTF-16 vs code point iteration). Never tune here – change the web engine and regenerate the vectors.
 */
data class Found(val i: Int, val n: Int, val toks: List<String>, val form: String)
data class Sent(val text: String, val own: Boolean, val tr: String?, val at: Found)
data class Pick(val card: JsonObject, val why: String)
/** A match pair: `build` pairs are cards (word + store meaning), story pairs are word + meaning text. */
data class MatchPair(val word: String, val mean: String?, val card: JsonObject? = null)
data class Off(val listen: Boolean = false, val speak: Boolean = false)
class Has(val story: Boolean = false, val radio: Boolean = false, val odd: Boolean = false, val exam: Boolean = false)
data class Planned(val kind: String)

/** One exercise. Optional fields are null where the JS object has no such key. `alt` is the lighter stand-in used when speaking is off. */
data class LItem(
    val id: Int, val type: String, val word: String, val card: JsonObject?, val why: String? = null, val ipa: String? = null, val retry: Int = 0,
    val hints: List<String> = emptyList(), val mean: String? = null, val noAudio: Boolean? = null,
    val sent: String? = null, val own: Boolean? = null, val blank: Found? = null, val answer: String = "", val options: List<String>? = null,
    val tiles: List<String>? = null, val prompt: String? = null, val tr: String? = null, val def: String? = null, val len: Int? = null, val first: String? = null,
    val bank: List<String>? = null, val alt: LItem? = null, val choice: Boolean? = null, val spoke: Boolean? = null,
    val pairs: List<MatchPair>? = null, val free: Boolean? = null, val who: String? = null, val radio: Boolean? = null,
) {
    /** Hard = the learner must produce the answer (web HARD). */
    val hard get() = type == "build" || type == "tr" || type == "type" || (type == "say" && spoke != true) || (type == "pic" && choice != true)
}

object LessonEngine {
    const val DAY = 86_400_000L
    val HINTS: Map<String, List<String>> = mapOf(
        "gap" to listOf("fifty"), "mean" to listOf("fifty"), "q" to listOf("fifty"), "build" to listOf("first"), "tr" to listOf("first"),
        "type" to listOf("letter", "bank"), "say" to listOf("slow"), "pic" to listOf("slow"), "match" to listOf("pair"),
    )
    /** Exercise types per button kind; null = free mix. */
    val KIND: Map<String, List<String>?> = mapOf("lesson" to null, "review" to null, "listen" to listOf("gap", "build", "type", "match"), "speak" to listOf("say", "pic", "gap"))

    // ---------- JSON field access with JS truthiness ----------
    private fun JsonObject.s(k: String): String = when (val e = this[k]) { null, is JsonNull -> ""; is JsonPrimitive -> e.content; else -> "" }
    private fun JsonObject.truthy(k: String) = Js.truthy(this[k])
    private fun JsonObject.arr(k: String): List<JsonElement> = (this[k] as? JsonArray) ?: emptyList()
    private fun JsonElement?.obj(): JsonObject? = this as? JsonObject
    private fun num(e: JsonElement?) = Js.num(e)
    private fun srs(c: JsonObject): JsonObject? = c["srs"].obj()
    private fun jsRound(x: Double) = floor(x + 0.5)

    // ---------- text helpers ----------
    private val WS = Regex("[\\s\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+")
    private val EDGE_NON_WORD = Regex("^[^A-Za-z0-9']+|[^A-Za-z0-9']+\\z") // \z: JS `$` is end-of-input only (Java `$` also matches before a final line terminator)
    fun norm(s: String?) = Answer.norm(s ?: "")
    fun same(a: String, b: String) = norm(a) == norm(b)
    fun toks(s: String?): List<String> = WS.split((s ?: "").replace("“", "").replace("”", "").replace("\"", "")).map { EDGE_NON_WORD.replace(it, "") }.filter { it.isNotEmpty() }

    // ---------- seeded random ----------
    class Rng(seed: Long) {
        private var s: Int = (seed and 0xFFFFFFFFL).toInt().let { if (it == 0) 1 else it }
        fun next(): Double { s = s xor (s shl 13); s = s xor (s ushr 17); s = s xor (s shl 5); return ((s.toLong() and 0xFFFFFFFFL) % 1_000_000L) / 1e6 }
    }
    fun rng(seed: Long) = Rng(seed)
    fun <T> shuffle(a: List<T>, r: Rng): List<T> {
        val x = a.toMutableList()
        for (i in x.size - 1 downTo 1) { val j = floor(r.next() * (i + 1)).toInt(); val t = x[i]; x[i] = x[j]; x[j] = t }
        return x
    }

    private val POS_N = Regex("^(n|noun)\\b|^danh"); private val POS_V = Regex("^(v|verb)\\b|^động"); private val POS_ADJ = Regex("^adj|^tính"); private val POS_ADV = Regex("^adv|^trạng")
    private fun posOf(p: String?): String { val x = (p ?: "").lowercase(); return if (POS_N.containsMatchIn(x)) "n" else if (POS_V.containsMatchIn(x)) "v" else if (POS_ADJ.containsMatchIn(x)) "adj" else if (POS_ADV.containsMatchIn(x)) "adv" else x.ifEmpty { "?" } }

    // ---------- words in sentences ----------
    fun findWord(sentence: String?, word: String?): Found? {
        val t = toks(sentence); val w = toks(word).map { it.lowercase() }
        if (t.isEmpty() || w.isEmpty()) return null
        fun stem(x: String) = if (x.length > 4) x.replace(Regex("(e|y)$"), "") else x
        fun hit(tok: String, x: String, last: Boolean): Boolean { val y = tok.lowercase(); return y == x || (last && y.startsWith(stem(x)) && y.length - x.length <= 3) }
        var i = 0
        while (i + w.size <= t.size) {
            if (w.indices.all { k -> hit(t[i + k], w[k], k == w.size - 1) }) return Found(i, w.size, t, t.subList(i, i + w.size).joinToString(" "))
            i++
        }
        return null
    }

    /** Practice sentence of a card: learner's own context → bilingual sentences → library example; must contain the word, 3–14 tokens. */
    fun sentenceOf(c: JsonObject): Sent? {
        class Cand(val text: String, val own: Boolean, val tr: String?)
        val cands = ArrayList<Cand>()
        if (c.truthy("ctx")) cands.add(Cand(c.s("ctx"), true, null))
        c.arr("contexts").forEach { x -> val o = x.obj(); if (o != null && o.truthy("text")) cands.add(Cand(o.s("text"), true, null)) }
        c.arr("sentences").forEach { x -> val o = x.obj(); if (o != null && o.truthy("en")) cands.add(Cand(o.s("en"), false, o.s("vi"))) }
        if (c.truthy("ex")) cands.add(Cand(c.s("ex"), false, null))
        for (x in cands) { val n = toks(x.text).size; val f = findWord(x.text, c.s("word")); if (f != null && n in 3..14) return Sent(x.text, x.own, x.tr, f) }
        return null
    }

    fun fromExt(c: JsonObject) = c.truthy("src") || c.arr("contexts").any { x -> val o = x.obj(); o != null && o.truthy("source") && Regex("^https?:").containsMatchIn(o.s("source")) }
    fun endOfDay(now: Long): Long = Calendar.getInstance().apply { timeInMillis = now; set(Calendar.HOUR_OF_DAY, 23); set(Calendar.MINUTE, 59); set(Calendar.SECOND, 59); set(Calendar.MILLISECOND, 999) }.timeInMillis
    fun isDue(c: JsonObject, now: Long): Boolean { val s = srs(c) ?: return false; return (num(s["reps"]) > 0 || Js.truthy(s["last"])) && num(s["due"]) <= endOfDay(now) }
    fun isNew(c: JsonObject): Boolean { val s = srs(c) ?: return false; return num(s["reps"]) == 0.0 && !Js.truthy(s["last"]) }

    /** Words for one lesson: due (longest overdue first) → looked up with the add-on (newest first) → new cards → starter deck. */
    fun pickWords(cards: List<JsonObject>, n: Int = 6, now: Long, mode: String? = null, starter: List<JsonObject> = emptyList()): List<Pick> {
        val list = cards.filter { it.truthy("word") && (it.truthy("vi") || it.truthy("def")) }
        val out = ArrayList<Pick>(); val seen = HashSet<String>()
        fun add(c: JsonObject, why: String) { val k = norm(c.s("word")); if (out.size < n && seen.add(k)) out.add(Pick(c, why)) }
        fun due(c: JsonObject) = num(srs(c)?.get("due"))
        fun mod(c: JsonObject) = num(Js.or(c["mod"], Js.ZERO))
        if (mode == "review") list.filter { c -> val s = srs(c); s != null && num(s["lapses"]) > 0 && (num(s["reps"]) == 0.0 || isDue(c, now)) }.sortedBy { -num(srs(it)!!["lapses"]) }.forEach { add(it, "due") }
        list.filter { isDue(it, now) }.sortedBy { due(it) }.forEach { add(it, "due") }
        list.filter { !isDue(it, now) && fromExt(it) }.sortedBy { -mod(it) }.forEach { add(it, "ext") }
        list.filter { isNew(it) }.sortedBy { -mod(it) }.forEach { add(it, "new") }
        if (out.size < min(4, n)) starter.forEach { add(it, "start") }
        return out
    }

    private fun distract(word: String, pos: String?, pool: List<JsonObject>, k: Int, r: Rng): List<String> {
        val p = posOf(pos); val cand = shuffle(pool.filter { it.truthy("word") && !same(it.s("word"), word) }, r)
        val pick = cand.filter { posOf(it.s("pos")) == p } + cand.filter { posOf(it.s("pos")) != p }
        val out = ArrayList<String>()
        for (c in pick) { if (out.none { same(it, c.s("word")) }) out.add(c.s("word")); if (out.size >= k) break }
        return out
    }

    /** Letter tiles for "type the word": the answer's letters (keeps - and ') plus 3 decoys that are not in the word. */
    fun letterBank(word: String, r: Rng): List<String> {
        val ch = word.codePoints().toArray().map { String(Character.toChars(it)) }.filter { it != " " }
        val abc = ('a'..'z').map { it.toString() }.filter { it !in ch }
        return shuffle(ch + shuffle(abc, r).take(3), r)
    }

    class BuildOpts(
        val seed: Long? = null, val pool: List<JsonObject> = emptyList(), val off: Off = Off(), val only: List<String>? = null, val calm: Boolean = false,
        val perWord: Int = 2, val match: Boolean = true,
        val hasImg: ((String, String) -> Boolean)? = null, val gloss: ((JsonObject, String) -> String)? = null, val mean: ((JsonObject) -> String)? = null,
    )

    private val RARE = mapOf("pic" to 0.0, "tr" to 0.1, "build" to 0.2, "type" to 0.25, "gap" to 0.3, "say" to 0.4)
    private class W(val p: Pick, val c: JsonObject, val s: Sent?, val pair: Sent?, val types: List<String>) { val order = ArrayList<String>() }

    /** Builds the exercises (balanced across words, no two in a row for the same word, one match exercise mid-lesson with ≥ 4 words). */
    fun build(picks: List<Pick>, o: BuildOpts = BuildOpts(), nowMs: Long = System.currentTimeMillis()): List<LItem> {
        val r = rng(o.seed?.takeIf { it != 0L } ?: nowMs)
        val pool = o.pool + picks.map { it.card }; val off = o.off; val per = if (o.perWord == 0) 2 else o.perWord
        val byWord = picks.map { p ->
            val c = p.card; val s = sentenceOf(c); val types = ArrayList<String>()
            val pair = c.arr("sentences").mapNotNull { x ->
                val e = x.obj(); val en = e?.s("en").orEmpty(); val n = toks(en).size
                if (e != null && e.truthy("en") && e.truthy("vi") && findWord(en, c.s("word")) != null && n in 3..10) Sent(en, false, e.s("vi"), findWord(en, c.s("word"))!!) else null
            }.firstOrNull()
            var st = s
            if (st != null && st.tr.isNullOrEmpty() && o.gloss != null) st = st.copy(tr = o.gloss.invoke(c, st.text))
            if (st != null) types.add("gap")
            if (st != null && st.at.toks.size <= 10 && (!st.tr.isNullOrEmpty() || !off.listen)) types.add("build")
            if (o.hasImg != null && o.hasImg.invoke(c.s("word"), c.s("pos"))) types.add("pic")
            if (pair != null) types.add("tr")
            val mn = o.mean?.invoke(c).orEmpty()
            if (!Regex("\\s").containsMatchIn(c.s("word").trim()) && c.s("word").length >= 3 && (!off.listen || mn.isNotEmpty() || c.truthy("def"))) types.add("type")
            types.add("say")
            val only = o.only?.let { on -> types.filter { it in on } }
            W(p, c, st, pair, if (only != null && only.isNotEmpty()) only else types)
        }
        val cnt = hashMapOf("gap" to 0, "build" to 0, "pic" to 0, "tr" to 0, "type" to 0, "say" to 0)
        for (round in 0 until per) byWord.forEach { w ->
            val left = w.types.filter { it !in w.order }; if (left.isEmpty()) return@forEach
            val pick = shuffle(left, r).sortedWith(compareBy<String> { cnt[it]!! + RARE[it]!! }).first()
            w.order.add(pick); cnt[pick] = cnt[pick]!! + 1
        }
        val items = ArrayList<LItem>(); var id = 0
        fun make(w: W, type: String): LItem {
            val c = w.c; val s = w.s
            val base = LItem(++id, type, c.s("word"), c, w.p.why, Js.or(c["ipaUS"], c["ipa"]).let { if (Js.truthy(it)) (it as JsonPrimitive).content else "" }, 0, HINTS[type] ?: emptyList(), o.mean?.invoke(c).orEmpty())
            when (type) {
                "gap" -> { val opt = shuffle(listOf(s!!.at.form) + distract(c.s("word"), c.s("pos"), pool, 3, r), r); return base.copy(sent = s.text, own = s.own, blank = s.at, answer = s.at.form, options = opt, tr = s.tr.orEmpty()) }
                "build", "tr" -> {
                    val x = (if (type == "tr") w.pair else w.s)!!; val words = toks(x.text)
                    val extra = distract(c.s("word"), c.s("pos"), pool, 2, r).filter { e -> words.none { same(it, e) } }
                    return base.copy(sent = x.text, own = x.own, prompt = x.tr.orEmpty(), answer = words.joinToString(" "), tiles = shuffle(words + extra, r))
                }
                "type" -> {
                    val wd = c.s("word").trim()
                    var h = 7L; for (cp in wd.codePoints().toArray()) h = (h * 31 + Character.toChars(cp)[0].code) and 0xFFFFFFFFL
                    return base.copy(answer = wd, def = c.s("def"), len = wd.replace(Regex("[\\s'-]"), "").length, first = wd.take(1), bank = letterBank(wd.lowercase(), rng(h)))
                }
                "pic" -> return base.copy(answer = c.s("word"), options = shuffle(listOf(c.s("word")) + distract(c.s("word"), c.s("pos"), pool, 3, r), r))
            }
            val short = s != null && toks(s.text).size <= 8
            val alt = if (s != null) LItem(0, "gap", "", null, sent = s.text, own = s.own, blank = s.at, answer = s.at.form, options = shuffle(listOf(s.at.form) + distract(c.s("word"), c.s("pos"), pool, 3, r), r), hints = HINTS["gap"]!!, tr = s.tr.orEmpty())
            else LItem(0, "mean", "", null, answer = c.s("word"), options = shuffle(listOf(c.s("word")) + distract(c.s("word"), c.s("pos"), pool, 3, r), r), hints = HINTS["mean"]!!)
            val t = if (short) s!!.text else c.s("word")
            return base.copy(sent = t, answer = t, alt = alt)
        }
        for (round in 0 until per) byWord.forEach { w -> if (w.order.size > round) items.add(make(w, w.order[round])) }
        for (i in 1 until items.size) if (same(items[i].word, items[i - 1].word)) {
            val j = items.withIndex().indexOfFirst { (k, x) -> k > i && !same(x.word, items[i - 1].word) }
            if (j > 0) { val t = items[i]; items[i] = items[j]; items[j] = t }
        }
        val mp = picks.filter { it.card.truthy("vi") || it.card.truthy("def") }.take(5)
        if (o.match && (o.only == null || "match" in o.only) && mp.size >= 4)
            items.add(ceil(items.size / 2.0).toInt(), LItem(++id, "match", "#match", null, answer = "", hints = HINTS["match"]!!, pairs = shuffle(mp, r).take(4).map { MatchPair(it.card.s("word"), null, it.card) }))
        val out = items.map { adapt(it, off) }
        return if (o.calm) calm(out) else out
    }

    /** Switches kinds when the learner can't listen / speak right now. */
    fun adapt(it: LItem, off: Off = Off()): LItem {
        var o = it.copy(noAudio = off.listen)
        if (off.speak && (it.type == "say" || it.type == "pic")) {
            o = if (it.type == "pic") o.copy(choice = true) else {
                val a = it.alt!!
                o.copy(type = a.type, hints = a.hints, sent = a.sent ?: o.sent, own = a.own ?: o.own, blank = a.blank ?: o.blank, answer = a.answer, options = a.options ?: o.options, tr = a.tr ?: o.tr, spoke = true)
            }
        }
        return o
    }

    /** say / pic(speaking): recognition score >= 0.7 (or typed text); build/tr: tiles == sentence; match: true. */
    fun check(it: LItem, ans: Answer.Given): Boolean = Answer.check(Answer.Item(it.type, it.answer, it.choice == true), ans)

    class AnswerRes(val ok: Boolean, val combo: Int, val requeued: Boolean? = null, val free: Boolean? = null)
    class LogEntry(val id: Int, val type: String, val word: String, val ok: Boolean?, val retry: Int?, val skip: Boolean = false)

    /** Queue + wrong-answer retries (max 2 per exercise) + combo + progress (only grows). */
    class Session(items: List<LItem>, maxRetry: Int? = null, val ease: Boolean = false) {
        val q = ArrayList(items); val total = items.size
        var solved = 0; private set
        var combo = 0; private set
        var best = 0; private set
        var n = 0; private set
        var ok1 = 0; private set
        var miss = 0; private set
        val wrong = LinkedHashMap<String, Int>(); val firstOk = LinkedHashSet<String>(); val log = ArrayList<LogEntry>()
        private val maxRetry = maxRetry ?: 2
        val cur: LItem? get() = q.firstOrNull()
        val done: Boolean get() = q.isEmpty()
        val progress: Double get() = if (total > 0) min(1.0, solved.toDouble() / total) else 1.0
        val accuracy: Int get() = if (n > 0) jsRound(ok1 * 100.0 / max(1, n - log.count { (it.retry ?: 0) > 0 })).toInt() else 0

        fun answer(ok: Boolean): AnswerRes? {
            val it = if (q.isEmpty()) return null else q.removeAt(0)
            if (it.free == true) { solved++; return AnswerRes(true, combo, free = true) }
            n++
            val k = if (it.card != null) norm(it.word) else "#" + norm(it.word) // câu không thuộc từ nào (#match/#story): khóa '#…' như web/js/lesson/engine.js
            log.add(LogEntry(it.id, it.type, it.word, ok, it.retry))
            miss = if (ok) 0 else miss + 1
            if (!ok && ease && miss >= 2 && q.size > 1 && q[0].hard) { val j = q.indexOfFirst { !it.hard && it.free != true }; if (j > 0) q.add(0, q.removeAt(j)) }
            if (ok) { solved++; combo++; best = max(best, combo); if (it.retry == 0) { ok1++; if (!wrong.containsKey(k)) firstOk.add(k) }; return AnswerRes(true, combo) }
            combo = 0; wrong[k] = (wrong[k] ?: 0) + 1; firstOk.remove(k)
            if (it.retry < maxRetry) q.add(it.copy(retry = it.retry + 1)) else solved++
            return AnswerRes(false, 0, requeued = it.retry < maxRetry)
        }
        fun skip() { if (q.isEmpty()) return; val it = q.removeAt(0); solved++; log.add(LogEntry(it.id, it.type, it.word, null, null, skip = true)) }
        fun replace(fn: (LItem) -> LItem) { for (i in q.indices) q[i] = fn(q[i]) }
    }

    class Res(val word: String, val grade: Int, val card: JsonObject?, val add: Boolean, val entry: JsonObject? = null)

    /** Result → FSRS: wrong at least once → grade 0 (goes to review); due + right first time → grade 2; otherwise the schedule is untouched. */
    fun results(sess: Session, items: List<LItem>, cards: Collection<JsonObject>, now: Long): List<Res> {
        val map = HashMap<String, JsonObject>(); cards.forEach { if (it.truthy("word")) map[norm(it.s("word"))] = it }
        val words = LinkedHashMap<String, JsonObject>(); items.forEach { i -> i.card?.let { words[norm(i.word)] = it } }
        val out = ArrayList<Res>()
        for ((k, card) in words) {
            val c = map[k]
            if (sess.wrong.containsKey(k)) out.add(Res(card.s("word"), 0, c, c == null, card))
            else if (c != null && sess.firstOk.contains(k) && isDue(c, now)) out.add(Res(card.s("word"), 2, c, false))
        }
        return out
    }

    /** Stress position from IPA (1-based syllable carrying ˈ), null without a mark. */
    data class Stress(val syl: Int, val of: Int)
    fun stress(ipa: String?): Stress? {
        val s = (ipa ?: "").replace(Regex("^/|/$"), ""); if (!s.contains('ˈ')) return null
        val parts = s.split(Regex("[.ˈˌ]")).filter { it.isNotEmpty() }
        val before = s.substring(0, s.indexOf('ˈ')).split(Regex("[.ˌ]")).count { it.isNotEmpty() }
        return Stress(before + 1, max(parts.size, before + 1))
    }
    /** UK/US transcriptions when they differ. */
    fun usuk(c: JsonObject?): Pair<String, String>? {
        if (c == null || !c.truthy("ipa") || !c.truthy("ipaUS")) return null
        val strip = Regex("[/\\s]")
        return if (strip.replace(c.s("ipa"), "") != strip.replace(c.s("ipaUS"), "")) c.s("ipa") to c.s("ipaUS") else null
    }

    /** Text → viseme timeline (Rhubarb shapes) when no pre-rendered cues exist. */
    fun visemes(text: String?, dur: Double?): List<Pair<Double, String>> {
        val s = (text ?: "").lowercase(); val seq = ArrayList<String>()
        fun map(ch: Char): String? = when {
            ch in "mbp" -> "A"; ch in "fv" -> "G"; ch == 'l' -> "H"; ch == 'o' -> "E"; ch == 'u' || ch == 'w' -> "F"; ch == 'a' -> "D"; ch in "eiy" -> "C"
            ch in 'a'..'z' -> "B"; ch in ",.;:!?" -> "X"; else -> null
        }
        for (cp in s.codePoints().toArray()) {
            val ch = if (cp < 0x10000) cp.toChar() else '\u0000'; val v = map(ch)
            if (v != null && seq.lastOrNull() != v) seq.add(v) else if (ch == ' ' && seq.lastOrNull() != "B") seq.add("B")
        }
        val step = (if (dur != null && dur != 0.0) dur else max(0.6, s.length * 0.065)) / max(1, seq.size)
        fun fx(d: Double) = BigDecimal(d).setScale(3, RoundingMode.HALF_UP).toDouble()
        return seq.mapIndexed { i, v -> fx(i * step) to v } + (fx(seq.size * step) to "X")
    }

    private fun lessonPlan(cards: Collection<JsonObject>, now: Long): String {
        val list = cards.filter { srs(it) != null }
        return if (list.count { isDue(it, now) } + list.count { num(srs(it)!!["lapses"]) > 0 } >= 3) "review" else "lesson"
    }
    /** 6 nodes per stage, mixed from the data (the learner never picks). */
    fun pathPlan(cards: Collection<JsonObject>, now: Long, has: Has = Has()): List<Planned> =
        listOf(lessonPlan(cards, now), if (has.story) "story" else "listen", if (has.story) "listen" else "lesson", "speak", if (has.radio) "radio" else "lesson", "review").map(::Planned)
    fun unitPlan(cards: Collection<JsonObject>, now: Long, has: Has = Has()): List<Planned> {
        val mid = if (has.radio && (has.odd || !has.story)) "radio" else if (has.story) "story" else "lesson"
        return listOf(lessonPlan(cards, now), "listen", "speak", mid, "review", if (has.exam) "exam" else "lesson").map(::Planned)
    }
    /** Adaptive current button: last lesson < 60 % → review instead of speak/radio; >= 95 % and nothing due → keep learning instead of review. */
    fun nextKind(kind: String, acc: Double? = null, due: Boolean = false): String {
        if (acc != null && acc < 60 && (kind == "speak" || kind == "radio")) return "review"
        if (acc != null && acc >= 95 && kind == "review" && !due) return "lesson"
        return kind
    }

    /** No three hard exercises in a row. */
    fun calm(items: List<LItem>): List<LItem> {
        val a = items.toMutableList()
        for (i in 2 until a.size) if (a[i].hard && a[i - 1].hard && a[i - 2].hard) { val j = a.withIndex().indexOfFirst { (k, x) -> k > i && !x.hard }; if (j > 0) { val t = a[i]; a[i] = a[j]; a[j] = t } }
        return a
    }

    /** Story / radio → queue: each line is a free 'line' step; after line `at` come the check exercises (tap = build, q = question, match). */
    fun storyItems(st: JsonObject, lang: String, seed: Long): List<LItem> {
        val r = rng(if (seed == 0L) 1 else seed); val out = ArrayList<LItem>(); var id = 0
        val lines = st.arr("lines").map { it as JsonObject }
        val words = LinkedHashSet<String>().also { set -> lines.forEach { l -> toks(l.s("en")).forEach { set.add(it.lowercase()) } } }.toList()
        lines.forEachIndexed { i, l ->
            out.add(LItem(++id, "line", "#story", null, retry = 0, free = true, who = l.s("who"), sent = l.s("en"), radio = st.s("kind") == "radio"))
            st.arr("checks").map { it as JsonObject }.filter { num(it["at"]) == i.toDouble() }.forEach { c ->
                val base = LItem(++id, "", "#story", null, retry = 0)
                when (c.s("type")) {
                    "tap" -> {
                        val ln = lines[num(c["line"]).toInt()]; val t = toks(ln.s("en"))
                        val extra = shuffle(words.filter { w -> t.none { it.lowercase() == w } }, r).take(2)
                        out.add(base.copy(type = "build", sent = ln.s("en"), who = ln.s("who"), answer = t.joinToString(" "), tiles = shuffle(t + extra, r)))
                    }
                    "q" -> { val opts = c.arr("options").map { (it as JsonPrimitive).content }; out.add(base.copy(type = "q", prompt = c.s("q"), answer = opts[num(c["answer"]).toInt()], why = c.s("why"), options = if (c.truthy("keep")) opts else shuffle(opts, r))) }
                    "match" -> out.add(base.copy(type = "match", pairs = c.arr("pairs").map { p -> val po = p as JsonObject; val m = po["m"].obj(); MatchPair(po.s("en"), (m?.get(lang)?.takeIf { Js.truthy(it) } ?: m?.get("en")).let { e -> (e as? JsonPrimitive)?.content ?: "" }) }))
                }
            }
        }
        return out.map { it.copy(hints = HINTS[it.type] ?: emptyList()) }
    }
}
