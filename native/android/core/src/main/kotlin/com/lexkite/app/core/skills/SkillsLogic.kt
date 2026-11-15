package com.lexkite.app.core.skills

import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.vocab.Mistakes
import com.lexkite.app.core.vocab.Qe
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.gt
import com.lexkite.app.core.vocab.jo
import com.lexkite.app.core.vocab.strs
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** What a finished activity pays out: counters (quizzes, listens, perfect, readings, dictations) + xp, as App.reward({…}) takes them. */
class Reward(val add: Map<String, Int>, val xp: Int) { fun json() = jo(*add.map { it.key to it.value }.toTypedArray(), "xp" to xp) }

/** qengine.js grading + band table (QE.collect / gradeGap / bandOf / overall) and qtips.js kindOf. */
object Qx {
    private const val L = "ABCDEFGH"
    fun code(o: String) = o.split(' ')[0]
    fun label(o: String) = o.drop(code(o).length + 1)
    private val DIGIT_SEP = Regex("(\\d)[.:/](\\d)")
    /** Words counted against a limit: a number with a separator (7.45, 10:30, 1/11) is ONE. */
    fun words(s: String?): Int = Qe.norm((s ?: "").replace(DIGIT_SEP, "$1$2")).split(' ').count { it.isNotEmpty() }
    class Gap(val ok: Boolean, val over: Boolean, val empty: Boolean)
    fun gradeGap(a: List<String>, limit: Int, given: String): Gap {
        if (given.isBlank()) return Gap(false, false, true)
        val over = limit > 0 && words(given) > limit
        return Gap(!over && a.any { Qe.norm(it) == Qe.norm(given) }, over, false)
    }

    /** qtips.js kindOf: the detailed question type of a group (progress is kept per type). */
    fun kindOf(gr: JsonObject): String {
        if (gr.gt("photo")) return "p1"
        val ins = gr.gs("instr") + " " + gr.gs("title"); val type = gr.gs("type")
        if (type in listOf("tfng", "ynng", "mcq", "multi")) return type
        val opts = gr.strs("options")
        fun has(re: String) = Regex(re, RegexOption.IGNORE_CASE).containsMatchIn(ins)
        if (type == "match") {
            if (has("heading") || opts.map(::code).any { Regex("^[ivx]+$", RegexOption.IGNORE_CASE).matches(it) }) return "headings"
            if (has("correct ending")) return "endings"
            if (has("where is|located|\\bmap\\b|\\bplan\\b|diagram")) return "map"
            if (has("which (paragraph|text|advertisement|plan|section)")) return "info"
            if (has("from the (passage|text)|list of (people|researchers|res)|Look at the following")) return "features"
            return if (opts.all { label(it).isEmpty() }) "info" else "lmatch"
        }
        if (has("\\bmap\\b|\\bplan\\b|diagram")) return "map"
        if (type == "summary") return "summary"
        if (type == "sentence") return "sentence"
        return if (has("choose .*from the (passage|text)")) "rnotes" else "notes"
    }

    data class Res(val ok: Boolean, val given: String, val answer: String, val cue: String, val q: String, val type: String, val kind: String, val over: Boolean = false, val alts: List<String> = emptyList(), val limit: Int = 0)

    /** Grades a part. [answers]: question number -> typed text / picked option index / TRUE|FALSE|… / letter; "m<group index>" -> the ticked letters of a choose-2 group. */
    fun collect(p: Part, answers: Map<String, Any?>): Map<Int, Res> {
        val res = java.util.TreeMap<Int, Res>()
        fun ans(k: Any) = answers[k.toString()] as? String
        p.groups.forEachIndexed { gi, gr ->
            val kind = kindOf(gr); val type = gr.gs("type")
            if (type == "multi") {
                @Suppress("UNCHECKED_CAST") val picked = (answers["m$gi"] as? List<String>) ?: emptyList()
                val want = gr.strs("a"); val correct = picked.count { it in want }
                gr.ga("n").forEachIndexed { k, n -> res[(n as JsonPrimitive).content.toDouble().toInt()] = Res(k < correct, picked.joinToString(", "), want.joinToString(", "), gr.gs("cue"), gr.gs("q"), "multi", kind, alts = want) }
                return@forEachIndexed
            }
            for (e in gr.ga("items")) {
                val it = e as JsonObject; val n = it.gn("n").toInt(); val cue = it.gs("cue")
                res[n] = when {
                    type == "mcq" -> { val g = ans(n)?.toIntOrNull(); val a = it.gn("a").toInt(); val o = it.strs("options")
                        Res(g == a, if (g == null) "" else L[g].toString(), L[a] + ". " + o[a], cue, it.gs("q"), "mcq", kind, alts = listOf(a.toString())) }
                    type == "tfng" || type == "ynng" -> { val g = ans(n) ?: ""; Res(g == it.gs("a"), g, it.gs("a"), cue, it.gs("text"), type, kind, alts = listOf(it.gs("a"))) }
                    type == "match" -> { val v = ans(n) ?: ""; val a = it.gs("a"); val opt = gr.strs("options").find { o -> code(o) == a }
                        Res(v == a, v, a + (if (opt != null && label(opt).isNotEmpty()) " – " + label(opt) else ""), cue, it.gs("text"), "match", kind, alts = listOf(a)) }
                    else -> { val v = (ans(n) ?: "").trim(); val a = it.strs("a"); val r = gradeGap(a, gr.gn("limit").toInt(), v); Res(r.ok, v, a.firstOrNull() ?: "", cue, it.gs("text"), "gap", kind, r.over, a, gr.gn("limit").toInt()) }
                }
            }
        }
        return res
    }

    /** Question-type names as the exams print them (qtips.js NAME): English in every language. */
    private val NAME = mapOf("tfng" to "True / False / Not Given", "ynng" to "Yes / No / Not Given", "mcq" to "Multiple Choice", "multi" to "Multiple Choice (2 answers)", "headings" to "Matching Headings", "info" to "Matching Information",
        "features" to "Matching Features", "endings" to "Matching Sentence Endings", "map" to "Map / Plan Labelling", "lmatch" to "Matching", "notes" to "Form / Note / Table Completion", "rnotes" to "Note / Table / Flow-chart Completion",
        "summary" to "Summary Completion", "sentence" to "Sentence Completion")
    fun kindName(k: String) = NAME[k] ?: k
    /** One row of "results by question type": right / total and the numbers of the wrong questions. */
    class Stat(val kind: String, val right: Int, val total: Int, val wrong: List<Int>) { val pct get() = Math.floor(right * 100.0 / total + 0.5).toInt() }
    fun stats(res: Map<Int, Res>): List<Stat> { val m = LinkedHashMap<String, MutableList<Pair<Int, Res>>>(); for ((n, r) in res) m.getOrPut(r.kind.ifEmpty { r.type }) { ArrayList() }.add(n to r)
        return m.map { (k, l) -> Stat(k, l.count { it.second.ok }, l.size, l.filter { !it.second.ok }.map { it.first }) } }
    /** The answer the learner gave for question [n] in the [collect] answer map (a choose-2 group answers with its letters). */
    fun answerFor(p: Part, answers: Map<String, Any?>, n: Int): Any? { p.groups.forEachIndexed { gi, g -> if (g.gs("type") == "multi" && g.ga("n").any { (it as JsonPrimitive).content.toDouble().toInt() == n }) return answers["m$gi"] }; return answers[n.toString()] }
    /** Index of the choose-2 group holding question [n] (null = not a multi question). */
    fun groupIndex(p: Part, n: Int): Int? = p.groups.indexOfFirst { g -> g.gs("type") == "multi" && g.ga("n").any { (it as JsonPrimitive).content.toDouble().toInt() == n } }.takeIf { it >= 0 }
    /** "Làm lại câu sai": grades a wrong question again with a new answer (QE.retake). */
    fun recheck(r: Res, given: Any?): Res {
        val ok = when (r.type) {
            "multi" -> (given as? List<*>).orEmpty().map { it.toString() }.let { it.size == r.alts.size && it.all { x -> x in r.alts } }
            "mcq", "tfng", "ynng", "match" -> given is String && given == r.alts.firstOrNull()
            else -> gradeGap(r.alts, r.limit, (given as? String).orEmpty()).ok
        }
        return r.copy(ok = ok)
    }

    /** Raw score -> band, per skill: `[min raw, band]` rows of the pack (`consts.band`, qengine.js BAND), first row with raw >= min. */
    fun bandOf(raw: Int, skill: String = "listening"): Double = SkillsConsts.band.getValue(skill).firstOrNull { raw >= it.first }?.second ?: 0.0
    /** IELTS overall: mean of the skill bands, .25 up to .5, .75 up to the next whole band. */
    fun overall(bands: List<Double>): Double { val avg = bands.sum() / bands.size; val f = avg - Math.floor(avg); return Math.floor(avg) + (if (f >= 0.75) 1.0 else if (f >= 0.25) 0.5 else 0.0) }

    /** { type -> [right, total] } over the graded questions (qtips.js record). */
    fun tally(res: Collection<Res>): Map<String, IntArray> { val m = LinkedHashMap<String, IntArray>(); for (r in res) { val a = m.getOrPut(r.kind.ifEmpty { "mcq" }) { IntArray(2) }; a[1]++; if (r.ok) a[0]++ }; return m }
}

/** The learner's "game" document pieces the P06 screens write (web Game.mutate callbacks), as pure functions. */
object SkillsGame {
    private fun num(e: JsonElement?) = Js.num(e).let { if (it.isNaN()) 0.0 else it }
    internal fun put(game: JsonElement?, key: String, f: (LinkedHashMap<String, JsonElement>) -> Unit): JsonElement { val g = Js.spread(game); val m = Js.spread(g[key]); f(m); g[key] = JsonObject(m); return JsonObject(g) }
    fun listenDone(game: JsonElement?, id: String, right: Int) = put(game, "listenDone") { it[id] = Js.number(maxOf(right.toDouble(), num(it[id]))) }
    fun dictDone(game: JsonElement?, id: String, pct: Int) = put(game, "dictDone") { it[id] = Js.number(maxOf(pct.toDouble(), num(it[id]))) }
    fun readDone(game: JsonElement?, id: String, text: String) = put(game, "readDone") { it[id] = JsonPrimitive(text) }
    /** Best band per test + the last 30 mock results. */
    fun listenTest(game: JsonElement?, n: Int, raw: Int, band: Double, now: Long): JsonElement {
        val g = Js.spread(put(game, "listenBest") { it[n.toString()] = Js.number(maxOf(band, num(it[n.toString()]))) } as JsonObject)
        g["listenTests"] = JsonArray(((g["listenTests"] as? JsonArray ?: JsonArray(emptyList())) + jo("n" to n, "raw" to raw, "band" to band, "at" to now)).takeLast(30))
        return JsonObject(g)
    }
    /** game.qstat['<skill>:<type>'] += {r, t, s, d} (seconds stay 0: the listening time belongs to the audio). */
    fun qstat(game: JsonElement?, skill: String, tally: Map<String, IntArray>, now: Long): JsonElement {
        val g = Js.spread(put(game, "qstat") { m ->
            for ((k, v) in tally) { val key = "$skill:$k"; val o = m[key] as? JsonObject; m[key] = jo("r" to num(o?.get("r")) + v[0], "t" to num(o?.get("t")) + v[1], "s" to num(o?.get("s")), "d" to now) }
        })
        val t = tally.values.sumOf { it[1] }
        if (t > 0) { // game.qwk[skill][week] = {r, t} (week = floor(now / 7 days)), 8 newest weeks kept - qtips.js save()
            val wk = (now / 604_800_000L).toString(); val qw = Js.spread(g["qwk"]); val w = Js.spread(qw[skill]); val o = w[wk] as? JsonObject
            w[wk] = jo("r" to num(o?.get("r")) + tally.values.sumOf { it[0] }, "t" to num(o?.get("t")) + t)
            w.keys.sortedByDescending { it.toLong() }.drop(8).forEach { w.remove(it) }
            qw[skill] = JsonObject(w); g["qwk"] = JsonObject(qw)
        }
        return JsonObject(g)
    }
}

/** #/listening hub. */
object ListenHub {
    class Tab(val n: Int, val done: Boolean, val selected: Boolean)
    class PartCard(val id: String, val part: Int, val best: Int?, val title: String, val sub: String, val speakers: List<Pair<String, String>>, val actions: List<String>)
    class Hub(val empty: Boolean, val tabs: List<Tab>, val selected: Int?, val band: Double?, val fullTest: String?, val parts: List<PartCard>, val persistedTest: String)
    const val TIPS = 5
    /** Part names, in the web's source language (the UI translates them). */
    val PART_KEYS = mapOf(1 to "Hội thoại đời sống", 2 to "Độc thoại xã hội", 3 to "Thảo luận học thuật", 4 to "Bài giảng học thuật")
    private val FLAG = mapOf("en-GB" to "🇬🇧", "en-US" to "🇺🇸", "en-AU" to "🇦🇺")
    fun flag(accent: String) = FLAG[accent] ?: ""
    fun speakers(p: Part) = p.speakers.values.map { flag(it.accent) to it.name }
    private fun intOf(s: String?) = s?.trim()?.toDoubleOrNull()?.takeIf { it.isFinite() }?.toInt() ?: 0

    /** [query] = the hash query (`t=2`), [remembered] = localStorage vb.listenT; the result's [Hub.persistedTest] is what the page writes back. */
    fun hub(c: SkillsContent, query: Map<String, String>, remembered: String?, game: JsonElement?, lang: String): Hub {
        val all = c.tests
        var cur = intOf(query["t"]); if (cur !in all) cur = intOf(remembered); if (cur !in all) cur = all.firstOrNull() ?: 1
        val best = Js.spread(Js.prop(game, "listenBest")); val done = Js.spread(Js.prop(game, "listenDone"))
        fun num(e: JsonElement?) = e?.takeIf { Js.truthy(it) || (it as? JsonPrimitive)?.content == "0" }?.let { Js.num(it) }
        val tabs = if (all.size > 1) all.map { Tab(it, best[it.toString()] != null, it == cur) } else emptyList()
        val parts = c.partsOf(cur).map { p -> PartCard(p.id, p.part, num(done[p.id])?.toInt(), p.title, (if (lang == "vi" && p.titleVi.isNotEmpty()) p.titleVi + " · " else "") + p.topic, speakers(p), listOf("#/listen/${p.id}", "#/listen/${p.id}?mode=exam", "#/dictation/${p.id}")) }
        return Hub(all.isEmpty(), tabs, if (all.isEmpty()) null else cur, if (all.isEmpty()) null else num(best[cur.toString()]), if (all.isEmpty()) null else "#/listen-test/$cur", parts, cur.toString())
    }
}

/** #/listen/<part> page model + submit + evidence. */
object ListenPage {
    class Rate(val v: Double, val label: String?, val selected: Boolean)
    class Page(val exam: Boolean, val toeic: Boolean, val part: Part, val rates: List<Rate>) {
        val hasBack get() = !exam; val hasLive get() = !exam; val tipsOn get() = !exam
        val backHref get() = if (toeic) "#/toeic" else "#/listening"
        val switchHref get() = "#/listen/${part.id}" + if (exam) "" else "?mode=exam"
    }
    val RATES = listOf(0.8, 0.9, 0.95, 1.0, 1.1)
    const val DEFAULT_RATE = 0.95
    /** Rate chip label: null = "Chuẩn" (the standard speed), otherwise "0.8×". */
    fun rateText(r: Double) = if (r == DEFAULT_RATE) null else (if (r == Math.floor(r)) r.toInt().toString() else r.toString()) + "×"
    fun page(p: Part, exam: Boolean, listenRate: Double?) = Page(exam, p.id.startsWith("tl"), p, if (exam) emptyList() else RATES.map { Rate(it, rateText(it), (listenRate ?: DEFAULT_RATE) == it) })

    class Submit(val res: Map<Int, Qx.Res>, val right: Int, val total: Int, val xp: Int, val reward: Reward, val game: JsonElement, val mistakes: List<JsonObject>) {
        val ok get() = right >= 7
        /** Advice line, in the web's source language. */
        val advice get() = if (right >= 9) "Xuất sắc – mức band 8+ cho phần này." else if (right >= 7) "Tốt! Xem lại các câu sai trong lời thoại." else "Mở lời thoại bên cạnh, bấm “Nghe đoạn có đáp án” để nghe lại chỗ sai. Câu sai đã vào Sổ lỗi sai."
    }
    private fun mistake(kind: String, q: JsonObject, r: Qx.Res, ref: String) =
        jo("kind" to kind, "q" to q, "answer" to r.answer, "given" to (if (r.given.isEmpty()) jo("k" to "(bỏ trống)") else r.given),
            "explain" to (if (r.cue.isNotEmpty()) jo("k" to "Nghe: “…{cue}…”", "v" to jo("cue" to r.cue)) else ""), "ref" to ref)
    fun mistakeOf(p: Part, n: Int, r: Qx.Res) = mistake("listening", jo("k" to "{title} – Câu {n}: {q}", "v" to jo("title" to p.title, "n" to n, "q" to r.q)), r, p.id)
    fun mistakeOfTest(test: Int, n: Int, r: Qx.Res, ref: String) = mistake("listening", jo("k" to "Test {t} – Câu {n}: {q}", "v" to jo("t" to test, "n" to n, "q" to r.q)), r, ref)

    /** "Nộp bài": grade, record the question types, log the wrong ones, keep the best raw score; pays 15 + 3·right XP. */
    fun submit(p: Part, answers: Map<String, Any?>, game: JsonElement?, mistakes: List<JsonObject>, now: Long, tx: Tx = Tx.RAW): Submit {
        val res = Qx.collect(p, answers); val right = res.values.count { it.ok }; val total = res.size
        var list = mistakes
        for ((n, r) in res) if (!r.ok) list = Mistakes.log(list, mistakeOf(p, n, r), now, tx)
        val g = SkillsGame.listenDone(SkillsGame.qstat(game, "il", Qx.tally(res.values), now), p.id, right)
        val xp = 15 + right * 3
        return Submit(res, right, total, xp, Reward(mapOf("quizzes" to 1, "listens" to 1, "perfect" to if (right == total) 1 else 0), xp), g, list)
    }

    /** Transcript rows: pauses are skipped; [ev] = the question numbers whose cue sits on that line (after submitting). */
    class Row(val line: Line, val speaker: String?, val tokens: List<Any>?, val ev: List<Any>)
    fun transcript(p: Part, lexis: Lexis, showEv: Boolean): List<Row> {
        val ev = HashMap<Int, ArrayList<Any>>()
        if (showEv) for (g in p.groups) {
            val multi = g.gs("type") == "multi"
            val entries = if (multi) listOf<Pair<Any, String>>(g.ga("n").joinToString("–") { (it as JsonPrimitive).content } to g.gs("cue")) else g.ga("items").map { (it as JsonObject).let { i -> (i.gn("n").toInt() as Any) to i.gs("cue") } }
            for ((n, cue) in entries) { val i = evidenceLine(p, cue); if (i >= 0) ev.getOrPut(i) { ArrayList() }.add(n) }
        }
        return p.script.filter { it.pause == null }.map { l -> if (l.say != null) Row(l, null, null, emptyList()) else Row(l, p.speakerName(l.s), lexis.markSentence(l.t ?: ""), ev[l.i] ?: emptyList()) }
    }
    /** First script line whose text contains [cue] (-1 = none). */
    fun evidenceLine(p: Part, cue: String) = if (cue.isEmpty()) -1 else p.script.indexOfFirst { it.t != null && it.t.contains(cue) }
    /** "Nghe đoạn có đáp án": play from the cue line, one line earlier when that one is speech too. */
    fun hearFrom(p: Part, cue: String): Int? { val i = evidenceLine(p, cue); if (i < 0) return null; return if (i > 0 && p.script[i - 1].t != null) i - 1 else i }
}

/** #/listen-test/<n>: constants of the mock exam and its result. */
object ListenTest {
    const val READ_SECONDS = 30; const val TICK_MS = 1000L; const val STUCK_MS = 20_000L
    class Done(val raw: Int, val band: Double, val sheet: List<Int>, val byPart: List<Int>, val reward: Reward, val game: JsonElement, val mistakes: List<JsonObject>)
    /** [results]: question number -> graded answer + id of its part. */
    fun finish(n: Int, parts: List<Part>, results: Map<Int, Pair<Qx.Res, String>>, game: JsonElement?, mistakes: List<JsonObject>, now: Long, tx: Tx = Tx.RAW): Done {
        val nums = results.keys.sorted(); val raw = nums.count { results.getValue(it).first.ok }; val band = Qx.bandOf(raw, "listening")
        var list = mistakes
        for (q in nums) { val (r, pid) = results.getValue(q); if (!r.ok) list = Mistakes.log(list, ListenPage.mistakeOfTest(n, q, r, pid), now, tx) }
        val g = SkillsGame.qstat(SkillsGame.listenTest(game, n, raw, band, now), "il", Qx.tally(results.values.map { it.first }), now)
        return Done(raw, band, nums, parts.map { p -> p.qNums.count { results[it]?.first?.ok == true } }, Reward(mapOf("quizzes" to 1, "listens" to 4, "perfect" to if (raw == 40) 1 else 0), 40 + raw * 2), g, list)
    }
}

/** #/dictation: line selection, holes, whole-sentence diff and the session score. */
object Dictation {
    private val STOPW get() = SkillsConsts.stopwords
    private val WS = Regex("\\s+"); private val HOLE = Regex("^([^A-Za-z0-9]*)(.*?)([^A-Za-z0-9%']*)$")
    val MODES = listOf("mid", "hard", "full")
    fun ratio(mode: String) = if (mode == "hard") 0.65 else 0.35
    /** The lines to copy: speech with at least 4 words, in order. */
    fun lines(p: Part): List<Line> = p.script.filter { it.t != null && WS.split(it.t).size >= 4 }
    fun toks(s: String): List<String> = s.replace('’', '\'').replace('‘', '\'').split(WS).filter { it.isNotEmpty() }
    fun clean(w: String) = w.lowercase().replace(Regex("[^a-z0-9'%]"), "")
    /** Indices of the words that become fill-in boxes: content words first, spread evenly. */
    fun holes(words: List<String>, ratio: Double): Set<Int> {
        val idx = words.mapIndexedNotNull { i, w -> clean(w).takeIf { it.isNotEmpty() }?.let { it to i } }
        val content = idx.filter { it.first !in STOPW }
        val need = maxOf(1, Math.floor(idx.size * ratio + 0.5).toInt())
        val pool = if (content.size >= need) content else idx
        val step = pool.size.toDouble() / need; val pick = LinkedHashSet<Int>()
        var j = 0; while (j < need && j < pool.size) { pick.add(pool[Math.floor(j * step).toInt()].second); j++ }
        return pick
    }
    /** One displayed cell: a plain word, or a box [size] wide with the punctuation [pre] / [post] kept outside it. */
    class Cell(val word: String, val hole: Boolean, val pre: String = "", val size: Int = 0, val post: String = "")
    fun cells(words: List<String>, mode: String): List<Cell> {
        val h = if (mode == "full") emptySet<Int>() else holes(words, ratio(mode))
        return words.mapIndexed { i, w -> if (i !in h) Cell(w, false) else HOLE.find(w)!!.let { m -> Cell(w, true, m.groupValues[1], maxOf(3, m.groupValues[2].length), m.groupValues[3]) } }
    }
    /** What must be typed in a box: the word without the outer punctuation. */
    fun answerOf(c: Cell) = HOLE.find(c.word)!!.groupValues[2]
    fun holeOk(typed: String, word: String) = clean(typed) == clean(word)

    class Diff(val items: List<Pair<String, String>>, val pct: Double) { val rounded get() = Math.floor(pct * 100 + 0.5).toInt(); val ok get() = pct >= 0.9 }
    /** Whole-sentence check: longest common subsequence over the cleaned words; `ok` (kept), `extra` (typed, not matched), `miss` (target word not matched). */
    fun diff(target: String, typed: String): Diff {
        val a = toks(target); val b = toks(typed).map(::clean).filter { it.isNotEmpty() }; val aa = a.map(::clean)
        val dp = Array(aa.size + 1) { IntArray(b.size + 1) }
        for (x in aa.size - 1 downTo 0) for (y in b.size - 1 downTo 0) dp[x][y] = if (aa[x] == b[y]) dp[x + 1][y + 1] + 1 else maxOf(dp[x + 1][y], dp[x][y + 1])
        val out = ArrayList<Pair<String, String>>(); var x = 0; var y = 0
        while (x < aa.size) {
            if (y < b.size && aa[x] == b[y]) { out.add("ok" to a[x]); x++; y++ }
            else if (y < b.size && dp[x][y + 1] >= dp[x + 1][y]) { out.add("extra" to b[y]); y++ }
            else { out.add("miss" to a[x]); x++ }
        }
        while (y < b.size) out.add("extra" to b[y++])
        val n = aa.count { it.isNotEmpty() }
        return Diff(out, if (n > 0) dp[0][0].toDouble() / n else 0.0)
    }

    /** Result of checking one line (boxes: [right] of [of]; whole sentence: [diff]); [pct] feeds the session score. */
    class Check(val pct: Double, val right: Int, val of: Int, val cells: List<Pair<Boolean, String>>, val diff: Diff?) { val ok get() = pct >= 0.9 }
    fun check(line: Line, mode: String, typed: List<String>, full: String): Check {
        val words = toks(line.t ?: "")
        if (mode == "full") { val d = diff(line.t ?: "", full); return Check(d.pct, 0, 0, emptyList(), d) }
        val hs = cells(words, mode).filter { it.hole }
        val marks = hs.mapIndexed { j, c -> holeOk(typed.getOrElse(j) { "" }, c.word) to c.word }
        val r = marks.count { it.first }
        return Check(if (hs.isNotEmpty()) r.toDouble() / hs.size else 1.0, r, hs.size, marks, null)
    }

    class Fin(val pct: Int, val count: Int, val links: List<String>, val reward: Reward, val game: JsonElement)
    /** End of the session: [score] = sum of line percentages over [done] checked lines. */
    fun finish(partId: String, mode: String, score: Double, done: Int, game: JsonElement?): Fin {
        val pct = if (done > 0) Math.floor(score / done * 100 + 0.5).toInt() else 0
        return Fin(pct, done, listOf("#/listen/$partId", "#/dictation/$partId?m=" + (if (mode == "mid") "hard" else "full"), "#/listening"), Reward(mapOf("quizzes" to 1, "dictations" to 1), 10 + Math.floor(pct / 5.0 + 0.5).toInt()), SkillsGame.dictDone(game, partId, pct))
    }
    /** Replay delay of "Tự động phát lại câu" after the line was read. */
    const val AUTO_REPLAY_MS = 1800L; const val SLOW_RATE = 0.7
    /** Start mode: `?m=` beats settings.dictMode, default `mid`. */
    fun mode(query: String?, setting: String?) = query.takeIf { !it.isNullOrEmpty() } ?: setting.takeIf { !it.isNullOrEmpty() } ?: "mid"
    /** How a line is read out: its clip (rate 1, slow 0.7, pitch kept) when there is one, else the speaker's cast voice per sentence (rate = settings.listenRate, slow 0.7). */
    class Say(val clipKey: String?, val clipRate: Double, val utters: List<Utter>)
    fun say(l: Line, cast: Map<String, CastVoice>, voices: Map<String, String>, slow: Boolean, listenRate: Double, hq: Boolean): Say {
        val c = cast[l.s] ?: cast["_narrator"] ?: CastVoice(null, "en-GB", 1.0)
        return Say(if (hq) KVoice.lineKey(voices, l) else null, if (slow) SLOW_RATE else 1.0, com.lexkite.app.core.audio.AudioLogic.split(l.t ?: "").map { Utter(it, c.voice, c.lang, c.pitch, if (slow) SLOW_RATE else listenRate) })
    }
}

/** #/reading list + #/read passage logic. */
object Reader {
    class Tab(val lv: String, val n: Int, val selected: Boolean)
    class Card(val r: Reading, val summaryKind: String, val summary: String, val done: String?) { /** Web machine-translates the Vietnamese summary at runtime; native has no translator yet, so other languages read the English one. */ val shown: String get() = if (summaryKind == "translate") r.summaryEn.ifEmpty { summary } else summary }
    class ListModel(val tabs: List<Tab>, val cards: List<Card>, val selected: String?, val persistedLevel: String)
    fun list(c: SkillsContent, query: Map<String, String>, remembered: String?, game: JsonElement?, learnLang: String): ListModel {
        val lvs = c.readings.map { it.level }.filter { it.isNotEmpty() }.distinct().sorted()
        var lv = query["lv"].orEmpty(); if (lv.isEmpty()) lv = remembered.orEmpty().ifEmpty { "all" }
        if (lv != "all" && lv !in lvs) lv = "all"
        val done = Js.spread(Js.prop(game, "readDone"))
        val tabs = if (lvs.size > 1) listOf(Tab("all", c.readings.size, lv == "all")) + lvs.map { k -> Tab(k, c.readings.count { it.level == k }, lv == k) } else emptyList()
        val cards = c.readings.filter { lv == "all" || it.level == lv }.map { r ->
            val kind = if (learnLang == "vi") "text" else if (learnLang == "en") "en" else "translate"
            Card(r, kind, if (kind == "en") r.summaryEn else r.summaryVi, (done[r.id] as? JsonPrimitive)?.content?.takeIf { it.isNotEmpty() })
        }
        return ListModel(tabs, cards, if (tabs.isEmpty()) null else lv, lv)
    }

    val HL = listOf("kw", "awl", "link", "mine")
    const val HL_DEFAULT = "kw awl link mine"
    fun highlights(setting: String?) = (setting ?: HL_DEFAULT).ifEmpty { HL_DEFAULT }.split(' ').filter { it.isNotEmpty() }
    /** Chip tapped: the new set, and the string saved as settings.hl (always in chip order: kw awl link mine). */
    fun toggle(on: Set<String>, k: String): Pair<Set<String>, String> { val n = if (k in on) on - k else on + k; return n to HL.filter { it in n }.joinToString(" ") }

    /** The passage as paragraphs -> sentences -> tokens, with the number of distinct words per highlight. */
    class Passage(val paras: List<List<List<Any>>>, val counts: Map<String, Int>) {
        val sentences get() = paras.sumOf { it.size }
        val words get() = paras.flatten().flatten().count { it is Lexis.Tok }
        fun sentenceText(s: List<Any>) = s.joinToString("") { if (it is Lexis.Tok) it.text else it as String }
    }
    fun passage(r: Reading, lexis: Lexis, inDeck: (String) -> Boolean): Passage {
        val p = lexis.markText(r.text, r.keywords.map { it.lowercase() }.toSet(), inDeck)
        return Passage(p, HL.associateWith { lexis.count(p, it) })
    }
    /** First sentence (whitespace collapsed) that contains the keyword token. */
    fun contextOf(p: Passage, word: String): String? = p.paras.flatten().firstOrNull { s -> s.any { it is Lexis.Tok && it.w == word.lowercase() } }?.let { p.sentenceText(it).replace(Regex("\\s+"), " ").trim() }
    /** The token a keyword chip scrolls to: the exact word, else one starting with its first five letters. */
    fun keywordToken(p: Passage, kw: String): Lexis.Tok? { val toks = p.paras.flatten().flatten().filterIsInstance<Lexis.Tok>(); val k = kw.lowercase(); return toks.firstOrNull { it.w == k } ?: toks.firstOrNull { it.w.startsWith(k.take(5)) } }
    const val KEYWORD_POPUP_MS = 350L
    /** "Nghe cả bài": the text read sentence by sentence and, for each spoken sentence, the displayed sentence it belongs to. */
    class ReadAloud(val text: String, val spokenToShown: List<Int>)
    fun readAloud(p: Passage): ReadAloud {
        val shown = p.paras.flatten().map { p.sentenceText(it) }; val idx = ArrayList<Int>()
        shown.forEachIndexed { i, s -> repeat(com.lexkite.app.core.audio.AudioLogic.split(s).size) { idx.add(i) } }
        return ReadAloud(shown.joinToString(" ") { it.trim() }, idx)
    }

    class Item(val chosen: String?, val right: String, val classes: List<String>, val explain: String, val wrong: Boolean)
    class Graded(val score: Int, val n: Int, val items: List<Item>, val reward: Reward, val game: JsonElement, val mistakes: List<JsonObject>) {
        val pct get() = Math.floor(score * 100.0 / n + 0.5).toInt(); val ok get() = pct >= 60; val xp get() = 10 + score * 4
        val text get() = "$score/$n"
    }
    /** "Chấm điểm": [picks] = the chosen value per question (TRUE/FALSE/NOT GIVEN or option index as text; null = blank). */
    fun grade(r: Reading, picks: List<String?>, game: JsonElement?, mistakes: List<JsonObject>, now: Long, tx: Tx = Tx.RAW): Graded {
        var score = 0; var list = mistakes
        val items = r.questions.mapIndexed { i, q ->
            val pick = picks.getOrNull(i); val right = q.answer; val ok = pick == right
            if (ok) score++ else list = Mistakes.log(list, jo("kind" to "reading", "q" to "${r.title}: ${q.q}", "answer" to q.optionText(right), "given" to (if (pick == null) jo("k" to "(bỏ trống)") else q.optionText(pick)), "explain" to q.explain, "ref" to r.id), now, tx)
            Item(pick, right, q.picks.map { v -> if (v == right) (if (v == pick) "right+sel" else "right") else if (v == pick) "sel+wrong" else "" }, (if (ok) "" else "❌ ") + q.explain, !ok)
        }
        val first = Js.spread(Js.prop(game, "readDone"))[r.id] == null; val pct = Math.floor(score * 100.0 / r.questions.size + 0.5).toInt(); val xp = 10 + score * 4
        return Graded(score, r.questions.size, items, Reward(mapOf("readings" to if (first) 1 else 0, "quizzes" to 1, "perfect" to if (pct == 100) 1 else 0), xp), SkillsGame.readDone(game, r.id, "$score/${r.questions.size}"), list)
    }
}

/** The dictionary / word-book calls the tap-a-word popup needs (backed by the app's WordEnv; recorded by tests). */
interface WordPort {
    suspend fun quick(w: String): JsonObject?
    suspend fun lookup(w: String, examples: Boolean, image: Boolean): JsonObject?
    suspend fun translateVi(s: String): String
    suspend fun translateTo(s: String, lang: String): String
    fun inDeck(w: String): Boolean
    suspend fun addWord(entry: JsonObject, context: JsonObject?, silent: Boolean)
    /** The index word entry (web IELTS_DATA.INDEX[w]) or null. */
    fun libraryEntry(w: String): JsonObject?
}

/** Tap a word of the transcript / passage: look it up, save it as a card with its sentence as context. */
object WordPopup {
    class Open(val word: String, val entry: JsonObject?, val translation: String, val saved: Boolean)
    suspend fun open(port: WordPort, word: String): Open {
        val e = port.quick(word) ?: port.lookup(word, examples = false, image = false)
        val found = e != null && e.gt("found")
        return Open(word, if (found) e else null, if (e != null) com.lexkite.app.core.vocab.CardMath.meanOf(e) else "", found && port.inDeck(e!!.gs("word")))
    }
    /** "+ Lưu flashcard": the sentence is translated into the learning language and saved with [title] as its source. */
    suspend fun save(port: WordPort, entry: JsonObject, sentence: String, title: String, learnLang: String) {
        val vi = if (learnLang == "vi") port.translateVi(sentence) else port.translateTo(sentence, learnLang)
        port.addWord(entry, jo("text" to sentence, "vi" to vi, "title" to title), false)
    }
    /** "Từ vựng đáng học": save a part's word with the first line that contains it. */
    suspend fun saveVocab(port: WordPort, p: Part, k: Int, learnLang: String) {
        val (w, vi) = p.vocab[k]; val line = p.script.firstOrNull { it.t != null && it.t.lowercase().contains(w.lowercase()) }?.t.orEmpty()
        val d = port.quick(w) ?: jo("word" to w, "vi" to vi, "found" to true)
        val mean = com.lexkite.app.core.vocab.CardMath.meanOf(d).ifEmpty { vi }
        val tr = if (line.isEmpty()) "" else if (learnLang == "vi") port.translateVi(line) else port.translateTo(line, learnLang)
        port.addWord(d.let { JsonObject(it + mapOf("word" to JsonPrimitive(w), "vi" to JsonPrimitive(mean))) }, if (line.isEmpty()) null else jo("text" to line, "vi" to tr, "title" to "🎧 ${p.title}"), false)
    }
    /** "+ Lưu tất cả từ khóa": every keyword not yet a card, with its first sentence; returns how many were saved. */
    suspend fun saveKeywords(port: WordPort, r: Reading, p: Reader.Passage): Int {
        var n = 0
        for (k in r.keywords) {
            if (port.inDeck(k)) continue
            val s = Reader.contextOf(p, k).orEmpty()
            port.addWord(port.libraryEntry(k.lowercase()) ?: jo("word" to k, "topic" to "mine", "emoji" to r.emoji), if (s.isNotEmpty()) jo("text" to s, "title" to "Bài đọc: ${r.title}") else null, true); n++
        }
        return n
    }
}
