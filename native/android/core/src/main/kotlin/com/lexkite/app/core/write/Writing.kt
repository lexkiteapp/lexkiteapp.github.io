package com.lexkite.app.core.write

import com.lexkite.app.core.lesson.Speaking
import com.lexkite.app.core.vocab.Absent
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.WS_RUN
import com.lexkite.app.core.vocab.WordBook
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.gt
import com.lexkite.app.core.vocab.jo
import com.lexkite.app.core.vocab.jsTrim
import com.lexkite.app.core.vocab.s
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlin.random.Random

/** #/ideas: topic -> issues -> for/against ideas with a model sentence and savable chunks "en|vi". Port of web/js/ideas.js. */
object Ideas {
    const val SAVE_TITLE = "Ý tưởng Task 2"
    /** Unknown/empty topic -> the first one. */
    fun pick(all: List<JsonObject>, topic: String?): JsonObject? = all.firstOrNull { it.gs("topic") == topic } ?: all.firstOrNull()
    /** Related Task 2 prompts (<= 5). */
    fun prompts(prompts: List<JsonObject>, tp: JsonObject): List<JsonObject> = prompts.filter { it.gs("topic") == tp.gs("topic") }.take(5)
    fun ideasOf(issue: JsonObject, side: String): List<JsonObject> = issue.ga(side).map { it as JsonObject }
    /** "en|vi" -> (en, vi) */
    fun chunk(c: String): Pair<String, String> { val p = c.split("|"); return p[0] to (p.getOrNull(1) ?: "") }
    /** What the save-phrase dialog receives when a chunk is tapped (vi only for Vietnamese learners). */
    fun chunkSave(idea: JsonObject, c: String, learnLang: String): JsonObject { val (en, vi) = chunk(c); return jo("phrase" to en, "vi" to (if (learnLang == "vi") vi else ""), "sentence" to idea.gs("ex"), "title" to SAVE_TITLE) }
}

/** #/letters: IELTS General Task 1 letters - tone tabs, drafts, live word count, 20-minute timer and the self-check rows. Port of web/js/letters.js. */
object Letters {
    val TONES = listOf("formal", "semi-formal", "informal")
    /** Vietnamese source keys of the tone names / tips (translate with Tx). */
    val TONE_KEY = mapOf("formal" to "Trang trọng", "semi-formal" to "Bán trang trọng", "informal" to "Thân mật")
    const val MIN_WORDS = 150
    const val TIMER_SECONDS = 20 * 60
    fun wc(s: String?): Int = Regex("[A-Za-z0-9'’-]+").findAll((s ?: "").jsTrim()).count()
    /** `?tone=` -> a known tone or "all". */
    fun toneOf(q: String?): String = if (q != null && q in TONES) q else "all"
    fun tabs(all: List<JsonObject>): List<Pair<String, Int>> = listOf("all" to all.size) + TONES.map { t -> t to all.count { it.gs("tone") == t } }
    fun list(all: List<JsonObject>, tone: String): List<JsonObject> = all.filter { tone == "all" || it.gs("tone") == tone }
    /** Chip "✍️ n từ" when a draft exists. */
    fun draftWords(drafts: JsonObject?, id: String): Int? = drafts.gs(id).takeIf { it.jsTrim().isNotEmpty() }?.let { wc(it) }
    /** The situation cut for the card. */
    fun shortSituation(s: String) = if (s.length > 140) s.substring(0, 137) + "…" else s
    fun timerText(secondsLeft: Int) = "%02d:%02d".format(secondsLeft / 60, secondsLeft % 60)

    /** One self-check row: `key` is the web Vietnamese source string with `vars`. */
    class Row(val ok: Boolean, val key: String, val vars: Map<String, String>)
    class Check(val words: Int, val rows: List<Row>) { val enough get() = words >= MIN_WORDS }
    /** The "Kiểm tra" button: length, greeting, closing, paragraphs and (formal) contractions. AI marking is offered by the UI from 50 words. */
    fun check(letter: JsonObject, text: String): Check {
        val s = text.jsTrim(); val n = wc(s); val first = s.split("\n")[0]; val low = s.lowercase()
        val closeWord = letter.gs("close").lowercase().replace(Regex(",$"), "")
        val contractions = Regex("\\b\\w+'(m|re|s|t|ll|ve|d)\\b", RegexOption.IGNORE_CASE).findAll(s).count()
        val open = letter.gs("open")
        val rows = arrayListOf(
            if (n >= MIN_WORDS) Row(true, "Đủ độ dài: {n} từ.", mapOf("n" to "$n")) else Row(false, "Mới {n} từ – cần ít nhất 150 từ.", mapOf("n" to "$n")),
            Row(first.jsTrim().lowercase().startsWith(open.lowercase().split(Regex("\\s+"))[0]), "Lời chào nên mở đầu đúng như đề: “{o}”.", mapOf("o" to open)),
            Row(closeWord.isEmpty() || low.contains(closeWord), "Kết thư phù hợp giọng văn: “{c}”.", mapOf("c" to letter.gs("close"))),
            Row(Regex("\\n\\s*\\n").split(s).count { it.jsTrim().isNotEmpty() } >= 4, "Chia đoạn rõ: lời chào – mục đích – 3 ý – kết thư (ít nhất 4 đoạn).", emptyMap()),
        )
        if (letter.gs("tone") == "formal") rows.add(if (contractions == 0) Row(true, "Không dùng viết tắt – đúng văn phong trang trọng.", emptyMap()) else Row(false, "Thư trang trọng nên tránh viết tắt (có {n} chỗ như I'm, can't).", mapOf("n" to "$contractions")))
        return Check(n, rows)
    }
}

/** #/paraphrase: recognise how the passage rewords a question phrase. Port of web/js/paraphrase.js. */
object Paraphrase {
    private val STOP = "more less than that this with from their have been which about into over some such them they were will would".split(" ").toSet()
    private fun keyw(s: String) = Regex("[a-z]+").findAll(s.lowercase()).map { it.value }.filter { it.length > 3 && !STOP.contains(it) }.toList()
    /** Pairs worth practising: no blanks/slashes/ellipses, passage phrase <= 90 chars, and not mostly the same words. */
    fun usable(q: String, p: String): Boolean {
        if (Regex("_{2,}|\\.\\.\\.|…|/").containsMatchIn(q + p) || p.length > 90) return false
        val a = keyw(q).toSet(); val b = keyw(p)
        return b.isEmpty() || b.count { a.contains(it) }.toDouble() / minOf(if (a.isEmpty()) 1 else a.size, b.size) < 0.6
    }
    fun pairs(all: List<Pair<String, String>>) = all.filter { usable(it.first, it.second) }
    const val ROUND = 10
    const val MIN_PAIRS = 8
    class Question(val q: String, val answer: String, val options: List<String>)
    /** A round of 10 questions; options = right phrase + 3 other usable phrases (different question, length within 40), shuffled (`rnd` null keeps order - tests). */
    class Round(private val all: List<Pair<String, String>>, private val rnd: Random? = Random.Default) {
        private fun <T> mix(l: List<T>) = if (rnd == null) l else l.shuffled(rnd)
        val items = mix(all).take(ROUND)
        var index = 0; var right = 0
        val finished get() = index >= items.size
        fun question(): Question {
            val cur = items[index]
            val others = mix(all.filter { x -> x.second != cur.second && x.first != cur.first && Math.abs(x.second.length - cur.second.length) < 40 }).take(3).map { x -> x.second }
            return Question(cur.first, cur.second, mix(listOf(cur.second) + others))
        }
        /** Returns whether `choice` was right; call [next] for the next card. */
        fun answer(q: Question, choice: String): Boolean { val ok = choice == q.answer; if (ok) right++; return ok }
        fun next() { index++ }
        val percent get() = Math.round(right.toDouble() / items.size * 100).toInt()
        /** reward {quizzes:1, readings:0, xp} */
        val xp get() = 5 + right * 2
    }
}

/** Approximation of JS `localeCompare` (ICU root): spaces/punctuation < digits < letters, case-insensitive, accents ignored first, lower before upper on ties. */
internal object JsCollate : Comparator<String> {
    private fun fold(c: Char): Char = java.text.Normalizer.normalize(c.toString(), java.text.Normalizer.Form.NFD).first().lowercaseChar()
    private fun rank(c: Char): Int = if (c.isWhitespace()) 0 else if (c.isLetter()) 3 else if (c.isDigit()) 2 else 1
    override fun compare(a: String, b: String): Int {
        val n = minOf(a.length, b.length)
        for (i in 0 until n) {
            val x = a[i]; val y = b[i]; val rx = rank(x); val ry = rank(y)
            if (rx != ry) return rx - ry
            val fx = fold(x); val fy = fold(y)
            if (fx != fy) return fx.compareTo(fy)
        }
        if (a.length != b.length) return a.length - b.length
        for (i in 0 until n) if (a[i] != b[i]) return if (a[i].isLowerCase()) -1 else 1
        return 0
    }
}

/**
 * web phrases.js `App.lemma` (dictionary form of an inflected word) with its irregular-verb tables `App.lemmaT` (PAST, BASE). Data = verbs.json `LEMMA` ([VerbData.lemma]);
 * `known(word)` = the word index lookup (web IELTS_DATA.INDEX), lower-case.
 */
class Lemmatizer(tables: JsonObject, private val lookup: (String) -> Boolean) {
    val past = HashMap<String, String>(); val base = HashMap<String, String>(); private val keep: Set<String>
    init {
        for (row in tables.getValue("IRR").jsonPrimitive.content.split("|")) {
            val f = row.split(" "); if (f.size < 3) continue
            past[f[0]] = f[1]; if (f[1] != f[0]) base[f[1]] = f[0]; if (f[2] != f[0]) base[f[2]] = f[0]
        }
        tables.getValue("BASE_EXTRA").jsonObject.forEach { (k, v) -> base[k] = v.jsonPrimitive.content }
        keep = tables.getValue("KEEP").jsonArray.map { it.jsonPrimitive.content }.toSet()
    }
    fun known(w: String): Boolean = lookup(w)
    fun lemma(w: String): String {
        val l = w.lowercase()
        base[l]?.let { return it }
        if (l in keep || l.length < 4 || (known(l) && !Regex("(ies|es|s|ed|ing|er|est)$").containsMatchIn(l))) return l
        fun tryB(vararg a: String?): String? = a.firstOrNull { !it.isNullOrEmpty() && known(it) }
        fun cut(n: Int) = l.dropLast(n)
        fun dbl(re: String, n: Int): String? = if (Regex(re).containsMatchIn(l)) cut(n) else null
        var b: String? = null
        if (l.endsWith("ies")) b = tryB(cut(3) + "y")
        if (b == null && l.endsWith("ves")) b = tryB(cut(3) + "f", cut(3) + "fe")
        if (b == null && Regex("(ss|x|z|ch|sh|o)es$").containsMatchIn(l)) b = tryB(cut(2))
        if (b == null && Regex("[^s]s$").containsMatchIn(l)) b = tryB(cut(1))
        if (b == null && l.endsWith("ied")) b = tryB(cut(3) + "y")
        if (b == null && l.endsWith("ed")) b = tryB(cut(1), cut(2), dbl("(.)\\1ed$", 3))
        if (b == null && l.endsWith("ing")) b = tryB(cut(3), cut(3) + "e", dbl("(.)\\1ing$", 4))
        if (b == null && l.endsWith("iest")) b = tryB(cut(4) + "y")
        if (b == null && l.endsWith("est")) b = tryB(cut(3), cut(2), dbl("(.)\\1est$", 4))
        if (b == null && l.endsWith("ier")) b = tryB(cut(3) + "y")
        if (b == null && l.endsWith("er") && !known(l)) b = tryB(cut(2), cut(1), dbl("(.)\\1er$", 3))
        return b ?: l
    }
}

/** Annotated model answers: `[[chunk|meaning]]`, `{{linker}}`, `<<Role>>`. Port of web/js/phrases-model.js (render, page, practice modes, library, phrase book). */
object Models {
    val TYPE_KEY = mapOf("line" to "Biểu đồ đường", "bar" to "Biểu đồ cột", "pie" to "Biểu đồ tròn", "table" to "Bảng số liệu", "process" to "Quy trình", "map" to "Bản đồ")
    val TABS = listOf("2" to "Task 2", "1" to "Task 1 – Biểu đồ", "gt" to "Task 1 – Viết thư")
    val PRACTICE_TABS = listOf("read", "vocab", "gram", "link", "copy", "write")
    private val CHUNK = Regex("\\[\\[([^|\\]]+)\\|([^\\]]+)\\]\\]")
    private val LINK = Regex("\\{\\{([^}]+)\\}\\}")
    private val ROLE = Regex("<<([^&<>\"']+?)>>\\s*")

    /** Plain text: roles, markers removed. */
    fun plain(t: String) = t.replace(Regex("<<[^>]*>>"), "").replace(Regex("\\[\\[([^|\\]]*)\\|[^\\]]*\\]\\]"), "$1").replace(LINK, "$1")
    fun paras(t: String): List<String> = Regex("\\n\\s*\\n").split(t)
    fun stripRole(p: String) = p.replace(Regex("<<[^>]*>>\\s*"), "")
    fun roleOf(p: String) = Regex("<<([^>]*)>>").find(p)?.groupValues?.get(1) ?: ""
    /** Practice answer comparison: lower-case, ’ -> ', non [a-z0-9' ] -> space, collapsed. */
    fun norm(x: String) = WS_RUN.replace(x.lowercase().replace(Regex("[’']"), "'").replace(Regex("[^a-z0-9' ]"), " "), " ").jsTrim()
    fun sentences(t: String): List<String> = Regex("[^.!?]+[.!?]+").findAll(t).map { it.value }.toList()
    fun chunksOf(text: String): List<Pair<String, String>> = CHUNK.findAll(text).map { it.groupValues[1] to it.groupValues[2] }.toList()
    fun linkersOf(text: String): List<String> = LINK.findAll(text).map { it.groupValues[1] }.distinct().toList()

    // ---------- renderAnnotated ----------
    sealed interface Seg { class Text(val s: String) : Seg; class Chunk(val en: String, val vi: String) : Seg; class Link(val s: String) : Seg; class Role(val s: String) : Seg }
    /** `head` = role label above the paragraph (a role at the very start); inline roles and chunks/linkers are segments. */
    class Para(val head: String?, val segs: List<Seg>)
    /** Paragraphs split on blank lines. The translation of chunk meanings is hidden for non-Vietnamese learners by the UI (see [glossVisible]). */
    fun render(text: String): List<Para> = paras(text).map { p0 ->
        var p = p0.jsTrim(); var head: String? = null
        ROLE.find(p)?.takeIf { it.range.first == 0 }?.let { head = it.groupValues[1]; p = p.substring(it.range.last + 1) }
        val segs = ArrayList<Seg>(); var pos = 0
        val all = Regex("<<([^&<>\"']+?)>>\\s*|\\[\\[([^|\\]]+)\\|([^\\]]+)\\]\\]|\\{\\{([^}]+)\\}\\}").findAll(p)
        for (m in all) {
            if (m.range.first > pos) segs.add(Seg.Text(p.substring(pos, m.range.first)))
            when { m.groupValues[1].isNotEmpty() -> segs.add(Seg.Role(m.groupValues[1])); m.groupValues[2].isNotEmpty() -> segs.add(Seg.Chunk(m.groupValues[2], m.groupValues[3])); else -> segs.add(Seg.Link(m.groupValues[4])) }
            pos = m.range.last + 1
        }
        if (pos < p.length) segs.add(Seg.Text(p.substring(pos)))
        Para(head, segs)
    }
    fun glossVisible(learnLang: String) = learnLang == "vi"

    // ---------- library (#/models) ----------
    class Row(val m: JsonObject, val title: String, val kind: String, val topic: String) { val id get() = m.gs("id"); val words get() = m.gs("words"); val band get() = m.gs("band") }
    /** title / kind (already a translated label via [kindLabel]) / topic id per model. */
    fun rows(models: List<JsonObject>, prompts: List<JsonObject>, task1: List<JsonObject>, letters: List<JsonObject>, kindLabel: (String) -> String = { Models.TYPE_KEY[it] ?: it }, toneLabel: (String) -> String = { Models.letterToneKey(it) }, letterTitle: (JsonObject) -> String = { it.gs("titleVi") }): List<Row> = models.map { m ->
        val task = m.s2("task"); val ref = m.gs("ref")
        when (task) {
            "1" -> { val d = task1.firstOrNull { it.gs("id") == ref }; Row(m, if (d != null) d.gs("title") else ref, if (d != null) kindLabel(d.gs("type")) else "Task 1", "") }
            "gt" -> { val l = letters.firstOrNull { it.gs("id") == ref }; Row(m, if (l != null) letterTitle(l) else ref, if (l != null) toneLabel(l.gs("tone")) else "Viết thư", "") }
            else -> { val p = prompts.firstOrNull { it.gs("id") == ref }; Row(m, if (p != null) p.gs("text") else ref, if (p != null) p.gs("type") else "Task 2", if (p != null) p.gs("topic") else "") }
        }
    }
    fun letterToneKey(tone: String) = Letters.TONE_KEY[tone] ?: tone
    private fun JsonObject.s2(k: String): String = this[k].let { if (it is kotlinx.serialization.json.JsonPrimitive) (if (it.isString) it.content else it.content.removeSuffix(".0")) else "" }
    /** Default tab: `?t=` else General Training exam -> gt, else Task 2. */
    fun defaultTab(t: String?, exam: String) = if (!t.isNullOrEmpty()) t else if (exam == "ieltsgt") "gt" else "2"
    fun tabCount(rows: List<Row>, tab: String) = rows.count { it.m.s2("task") == tab }
    /** Rows of a tab filtered by `q` over "title kind topic", sorted by kind then title. */
    fun list(rows: List<Row>, tab: String, q: String): List<Row> {
        val s = q.jsTrim().lowercase()
        return rows.filter { it.m.s2("task") == tab && (s.isEmpty() || (it.title + " " + it.kind + " " + it.topic).lowercase().contains(s)) }.sortedWith { a, b -> val k = JsCollate.compare(a.kind, b.kind); if (k != 0) k else JsCollate.compare(a.title, b.title) }
    }

    // ---------- model page ----------
    /** Everything the page header needs. `badge` = "General · Task 1" / "Writing Task n". */
    class Page(val m: JsonObject, val badge: String, val kind: String, val band: String, val back: String, val chunks: List<Pair<String, String>>, val linkers: List<String>, val prompt: String, val bullets: List<String>,
               val hasOutline: Boolean, val hasVocab: Boolean, val hasPitfalls: Boolean, val hasBand6: Boolean)
    fun page(m: JsonObject, prompts: List<JsonObject>, task1: List<JsonObject>, letters: List<JsonObject>, kindLabel: (String) -> String = { Models.TYPE_KEY[it] ?: it }, toneLabel: (String) -> String = { letterToneKey(it) }): Page {
        val task = m.s2("task"); val ref = m.gs("ref")
        val p2 = if (task == "2") prompts.firstOrNull { it.gs("id") == ref } else null
        val d1 = if (task == "1") task1.firstOrNull { it.gs("id") == ref } else null
        val gl = if (task == "gt") letters.firstOrNull { it.gs("id") == ref } else null
        val kind = if (gl != null) toneLabel(gl.gs("tone")) else if (task == "1") (if (d1 != null) kindLabel(d1.gs("type")) else "Task 1") else (p2?.gs("type") ?: "Task 2")
        val back = "#/" + (if (gl != null) "letters/$ref" else if (task == "1") "task1/$ref" else "write/$ref")
        val text = m.gs("text")
        val prompt = if (gl != null) gl.gs("situation") else if (task == "1") (d1?.gs("title") ?: "Task 1 · $ref") else (p2?.gs("text") ?: "Task 2 · $ref")
        return Page(m, if (gl != null) "General · Task 1" else "Writing Task $task", kind, "Band " + m.gs("band"), back, chunksOf(text), linkersOf(text), prompt, gl?.ga("bullets")?.map { it.s() } ?: emptyList(),
            m.ga("outline").isNotEmpty(), m.ga("vocab").isNotEmpty(), m.ga("pitfalls").isNotEmpty(), m.go("band6") != null)
    }
    /** The sentence containing a chunk (for the saved context). */
    fun sentenceFor(m: JsonObject, en: String): String = sentences(plain(m.gs("text"))).firstOrNull { it.contains(en) } ?: ""
    /** Save one chunk as a phrase card (pos "phrase", emoji 🧩, topic "phrases", ex = its sentence, context "Bài mẫu Task n"). */
    fun saveChunk(st: WordBook.Store, m: JsonObject, en: String, vi: String, now: Long): WordBook.Store {
        val sent = sentenceFor(m, en).jsTrim()
        return WordBook.add(st, jo("word" to en, "vi" to vi, "pos" to "phrase", "ex" to sent, "emoji" to "🧩", "topic" to "phrases"), if (sent.isNotEmpty()) jo("text" to sent, "title" to "Bài mẫu Task " + m.s2("task")) else null, now)
    }
    /** "Lưu tất cả": every chunk not yet in the deck. Returns the new store and how many were added. */
    fun saveAll(st: WordBook.Store, m: JsonObject, now: Long): Pair<WordBook.Store, Int> {
        var s = st; var n = 0
        for ((en, vi) in chunksOf(m.gs("text"))) if (!s.cards.containsKey(en.lowercase())) { s = saveChunk(s, m, en, vi, now); n++ }
        return s to n
    }

    // ---------- practice modes ----------
    /** Result bookkeeping of every mode: >= 70 % marks the mode done; reward {quizzes:1, perfect, xp}. */
    class Finish(val pct: Int, val done: Boolean, val perfect: Boolean, val xp: Int, val next: String?)
    fun finish(kind: String, right: Int, total: Int): Finish {
        val pct = Math.round(right.toDouble() / maxOf(1, total) * 100).toInt()
        val i = PRACTICE_TABS.indexOf(kind)
        return Finish(pct, pct >= 70, pct == 100, 5 + right * 2, if (pct >= 70 && i >= 0) PRACTICE_TABS.getOrNull(i + 1) else null)
    }
    /** Add `kind` to the stored list (Store 'mdone:<id>') when the score qualifies. */
    fun markDone(done: List<String>, kind: String, f: Finish): List<String> = if (f.done && !done.contains(kind)) done + kind else done

    /** Gap exercise: answers in text order (chunks for "vocab", linkers for "link"), a de-duplicated word bank, and the check. */
    class Gap(val kind: String, val answers: List<String>, val bank: List<String>)
    fun gap(m: JsonObject, kind: String, rnd: Random? = Random.Default): Gap {
        val re = if (kind == "vocab") CHUNK else LINK
        val answers = paras(m.gs("text")).flatMap { p -> re.findAll(stripRole(p)).map { it.groupValues[1] }.toList() }
        val uniq = answers.distinct()
        return Gap(kind, answers, if (rnd == null) uniq else uniq.shuffled(rnd))
    }
    /** Right answers among `inputs` (index -> typed text). */
    fun gapScore(g: Gap, inputs: List<String>): Int = g.answers.indices.count { norm(inputs.getOrElse(it) { "" }) == norm(g.answers[it]) }

    /** "gram" mode: pick the right form of a word at up to 12 places. */
    class GramSlot(val pre: String, val answer: String, val options: List<String>, val post: String)
    sealed interface GramTok { class Plain(val s: String) : GramTok; class Slot(val i: Int, val slot: GramSlot) : GramTok }
    /** `forms` = verbs.json `FORMS` ([VerbData.forms]). */
    fun formOf(forms: List<List<String>>, w: String): List<String>? = forms.firstOrNull { it.contains(w.lowercase()) }
    fun gram(m: JsonObject, forms: List<List<String>>, rnd: Random? = Random.Default): List<List<GramTok>> {
        val text = paras(plain(m.gs("text"))).joinToString("\n\n"); var picked = 0; var n = 0
        return text.split("\n\n").map { p ->
            splitKeep(p).map { tok ->
                val mm = Regex("^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$").find(tok)
                val f = mm?.let { formOf(forms, it.groupValues[2]) }
                if (mm == null || f == null || picked >= 12 || (rnd != null && rnd.nextDouble() < 0.45)) GramTok.Plain(tok)
                else {
                    picked++; val w = mm.groupValues[2]
                    val opts = (if (rnd == null) f else f.shuffled(rnd)).map { o -> if (w[0] == w[0].uppercaseChar()) o[0].uppercaseChar() + o.substring(1) else o }
                    GramTok.Slot(n++, GramSlot(mm.groupValues[1], w, opts, mm.groupValues[3]))
                }
            }
        }
    }
    private fun splitKeep(p: String): List<String> { val out = ArrayList<String>(); var pos = 0; for (m in Regex("\\s+").findAll(p)) { out.add(p.substring(pos, m.range.first)); out.add(m.value); pos = m.range.last + 1 }; out.add(p.substring(pos)); return out }
    fun gramScore(answers: List<String>, picks: List<String>): Int = answers.indices.count { picks.getOrElse(it) { "" }.lowercase() == answers[it].lowercase() }

    /** "gram" mode as the web shows it (errExercise): real errors are planted in the model text; the learner types the right form. `wrong` "" = a word is missing (an article). */
    class ErrItem(val i: Int, val pre: String, val post: String, val ans: String, val wrong: String, val why: String)
    /**
     * Candidates are found with the lemmatizer ([Lemmatizer], phrases.js) and the word index (`index(word)` = web IELTS_DATA.INDEX): missing article, past tense of an irregular verb, was/were,
     * -ed verb, -ly adverb, plural noun, comparative. At most 12, at least 6 tokens apart. `rnd` null = the vector run (Math.random 0.5: no article is dropped, no shuffle).
     * Returns null when fewer than 5 errors could be planted (the page then shows the "choose the form" exercise = [gram]). `why` is the Vietnamese key of the hint.
     */
    fun errors(m: JsonObject, lem: Lemmatizer, index: (String) -> JsonObject?, rnd: Random? = Random.Default): List<ErrItem>? {
        val text = paras(plain(stripRole(m.gs("text")))).joinToString("\n\n"); val cand = ArrayList<ErrItem>(); val tokRx = Regex("^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$")
        splitKeep(text).forEachIndexed { i, tok ->
            val mm = tokRx.find(tok) ?: return@forEachIndexed
            val w = mm.groupValues[2]; val l = w.lowercase(); val lm = lem.lemma(l); val e = index(lm)
            var wrong: String? = null; var why = ""
            if (Regex("^(the|a|an)$").matches(l) && (rnd?.nextDouble() ?: 0.5) < 0.5) { wrong = ""; why = "Thiếu mạo từ" }
            else if (lem.base[l]?.let { b -> lem.past[b] == l } == true && !Regex("^(was|were|had|did)$").matches(l)) { wrong = lem.base[l]; why = "Sai thì (cần quá khứ)" }
            else if (l == "was" || l == "were") { wrong = if (l == "was") "were" else "was"; why = "Sai hòa hợp chủ – vị" }
            else if (l.endsWith("ed") && lm != l && e != null && e.gs("pos").ifEmpty { "v" }.contains("v")) { wrong = lm; why = "Sai thì / thiếu -ed" }
            else if (l.endsWith("ly") && lem.known(l.dropLast(2)) && l.length > 5) { val x = l.replace(Regex("ily$"), "y").replace(Regex("ally$"), "al").replace(Regex("ly$"), ""); if (lem.known(x)) { wrong = x; why = "Cần trạng từ (-ly)" } }
            else if (Regex("[^s]s$").containsMatchIn(l) && lm != l && e != null && e.gs("pos").startsWith("n")) { wrong = lm; why = "Danh từ số nhiều" }
            else if (Regex("(er|est)$").containsMatchIn(l) && lm != l && !lem.known(l)) { wrong = lm; why = "Thiếu so sánh hơn/nhất" }
            if (wrong != null && wrong != l) cand.add(ErrItem(i, mm.groupValues[1], mm.groupValues[3], w, if (w[0] == w[0].uppercaseChar() && wrong.isNotEmpty()) wrong[0].uppercaseChar() + wrong.substring(1) else wrong, why))
        }
        val pick = ArrayList<ErrItem>()
        for (c in (if (rnd == null) cand else cand.shuffled(rnd))) if (pick.size < 12 && pick.none { Math.abs(it.i - c.i) < 6 }) pick.add(c)
        return if (pick.size < 5) null else pick
    }
    fun errScore(items: List<ErrItem>, typed: List<String>): Int = items.indices.count { norm(typed.getOrElse(it) { "" }) == norm(items[it].ans) }

    /** "copy" mode: every word is a slot (length = word length); punctuation stays. */
    private val TOKEN = Regex("[A-Za-z][A-Za-z'’-]*|\\d+(?:[.,]\\d+)*%?|[^\\sA-Za-z\\d]")
    fun tokens(s: String): List<String> = TOKEN.findAll(s).map { it.value }.toList()
    class SlotBlock(val role: String, val toks: List<String>)
    fun slots(m: JsonObject): Pair<List<SlotBlock>, List<String>> {
        val blocks = paras(m.gs("text")).map { p -> SlotBlock(roleOf(p), tokens(plain(stripRole(p)))) }
        val answers = blocks.flatMap { b -> b.toks.filter { !Regex("^[^A-Za-z\\d]$").matches(it) } }
        return blocks to answers
    }
    fun slotScore(answers: List<String>, inputs: List<String>): Int = answers.indices.count { norm(inputs.getOrElse(it) { "" }) == norm(answers[it]) }

    /** "write" mode: each sentence given as lemmas; the learner rewrites it. `lemma` = the app's lemmatizer (phrases.js `App.lemma`). */
    class Sentence(val s: String, val role: String)
    fun sentencesOf(m: JsonObject): List<Sentence> = paras(m.gs("text")).flatMap { p -> val role = roleOf(p); sentences(plain(stripRole(p))).mapIndexed { i, s -> Sentence(s.jsTrim(), if (i == 0) role else "") } }
    fun lemmaPrompt(s: String, lemma: (String) -> String): String = tokens(s).withIndex().joinToString(" / ") { (k, t) ->
        if (!Regex("^[A-Za-z]").containsMatchIn(t)) t
        else if (t[0] == t[0].uppercaseChar() && k > 0 && t != "I") t
        else if (t.contains("'")) Regex("['’]").split(t).withIndex().joinToString(" / ") { (j, x) -> if (j > 0) "'$x" else lemma(x) }
        else lemma(t)
    }
    /** Right = exact (normalised) or >= 95 % similar. */
    fun lemmaRight(typed: String, target: String): Boolean = norm(typed) == norm(target) || Math.round(Speaking.similarity(norm(typed), norm(target)) * 100) >= 95

    // ---------- phrase book (#/phrases) ----------
    fun phraseCards(cards: Collection<JsonObject>): List<JsonObject> = cards.filter { CardMath.isPhrase(it) }.sortedByDescending { it.gs("added").toDoubleOrNull() ?: 0.0 }
    const val STARTER_COUNT = 20
    /** "Thêm nhanh 20 cụm": the most frequent chunks of all models (>= 2 words, <= 48 chars, not already saved), with their sentence. */
    class Starter(val en: String, val vi: String, var n: Int, val sent: String, val task: String)
    fun starter(models: List<JsonObject>, cards: Map<String, JsonObject>): List<Starter> {
        val seen = LinkedHashMap<String, Starter>()
        for (m in models) {
            val text = m.gs("text"); val clean = text.replace(Regex("<<[^>]+>>"), "").replace(LINK, "$1")
            val sents = clean.split(Regex("(?<=[.!?])\\s+"))
            for (x in CHUNK.findAll(text)) {
                val en = x.groupValues[1].trim(); val k = en.lowercase()
                if (en.split(" ").size < 2 || en.length > 48) continue
                val sent = (sents.firstOrNull { it.contains("[[" + x.groupValues[1]) } ?: "").replace(CHUNK, "$1")
                val e = seen.getOrPut(k) { Starter(en, x.groupValues[2].trim(), 0, sent, m.s2("task")) }; e.n++
            }
        }
        return seen.values.filter { !cards.containsKey(it.en.lowercase()) }.sortedByDescending { it.n }.take(STARTER_COUNT)
    }
    fun addStarter(st: WordBook.Store, list: List<Starter>, now: Long): WordBook.Store {
        var s = st
        for (e in list) s = WordBook.add(s, jo("word" to e.en, "vi" to e.vi, "pos" to "phrase", "ex" to e.sent.jsTrim(), "emoji" to "🧩", "topic" to "phrases"), if (e.sent.isNotEmpty()) jo("text" to e.sent.jsTrim(), "title" to "Bài mẫu Task " + e.task) else null, now)
        return s
    }
}
