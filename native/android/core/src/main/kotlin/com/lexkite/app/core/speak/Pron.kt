package com.lexkite.app.core.speak

import com.lexkite.app.core.lesson.Speaking
import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.skills.SkillsGame
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.jo
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** One minimal-pair item: the two words, their IPA, the side that is the target. */
class PairItem(val c: String, val words: List<String>, val ipa: List<String>, val side: Int, val retry: Boolean = false) {
    val target get() = words[side]; val other get() = words[1 - side]
    val key get() = words.joinToString(",")
    fun withSide(s: Int, retry: Boolean = false) = PairItem(c, words, ipa, s, retry)
}
/** Per-contrast statistics `{ok, n, hist:[{d, ok, n}]}` kept in localStorage `lk.pronPairs`. */
class ContrastStat(var ok: Int = 0, var n: Int = 0, var hist: List<Triple<String, Int, Int>> = emptyList()) {
    val acc: Double? get() = if (n != 0) ok.toDouble() / n else null
    fun json(): JsonElement = jo("ok" to ok, "n" to n, "hist" to hist.map { jo("d" to it.first, "ok" to it.second, "n" to it.third) })
}

/** web/js/pron/pairs.js (minimal-pair SPEAKING practice): normalising, deciding which word was said, the adaptive 10-word session and the statistics. Randomness is injected. */
class PronPairs(private val pack: SpeakPack) {
    fun forSkill(id: String): List<Contrast> = pack.contrasts.filter { id in it.skills }
    fun label(c: Contrast): String = pack.pairLabels[c.id] ?: "/${c.a}/ – /${c.b}/"
    /** The label as a translatable text (a few are keys: "Giữ âm cuối"; the others are plain IPA). */
    fun labelTr(c: Contrast): Tr = Tr(label(c))
    /** Mouth tips `[for the first sound, for the second]` of a contrast. */
    fun tips(id: String): List<String> = pack.pairTips[id] ?: emptyList()
    fun tipOf(it: PairItem): Tr? = tips(it.c).getOrNull(it.side)?.let { k -> Tr(k) }
    /** The pairs of a contrast, IPA from the table unless a `word=ipa` token overrides it. */
    fun pairsOf(c: Contrast): List<PairItem> = c.pairs.split(' ').filter { it.isNotEmpty() }.map { p ->
        val ws = p.split('/').map { it.split('=') }
        PairItem(c.id, ws.map { it[0] }, ws.map { "/" + (it.getOrNull(1)?.takeIf { x -> x.isNotEmpty() } ?: pack.ipa[it[0]] ?: "") + "/" }, 0)
    }

    private val MARKS = Regex("[\\u0300-\\u036f]"); private val NONWORD = Regex("[^a-z0-9' ]+"); private val WS = Regex("\\s+"); private val QUOTES = Regex("^'+|'+$")
    fun norm(s: String?): List<String> = java.text.Normalizer.normalize((s ?: "").lowercase(), java.text.Normalizer.Form.NFKD).replace(MARKS, "").replace('’', '\'').replace('‘', '\'')
        .replace(NONWORD, " ").split(WS).map { it.replace(QUOTES, "") }.filter { it.isNotEmpty() }.map { pack.num[it] ?: it }
    private fun forms(w: String): List<String> = (listOf(w) + (pack.hom[w] ?: emptyList())).map { it.replace(Regex("[^a-z']"), "") }
    private fun has(alt: String, w: String): Boolean { val tk = norm(alt); val j = tk.joinToString(""); return forms(w).any { it in tk || j == it } }

    /** `target` / `other` / `neither`: the first alternative that holds exactly one of the two words decides; [heard] = that alternative (or the first one). */
    class Decision(val res: String, val heard: String)
    fun decide(alts: List<String?>, target: String, other: String): Decision {
        val list = alts.filter { it != null && it.trim().isNotEmpty() }.map { it!! }
        for (a in list) { val t = has(a, target); val o = has(a, other); if (t && !o) return Decision("target", a); if (o && !t) return Decision("other", a) }
        return Decision("neither", list.firstOrNull() ?: "")
    }

    fun weight(stats: Map<String, ContrastStat>, id: String): Double { val a = stats[id]?.acc; return if (a == null) 2.0 else 1 + 3 * (1 - a) }
    /** [n] words drawn with the weakest contrasts first (weight 1 + 3·(1 − accuracy), unpractised 2, divided by 1 + used·0.5); sides alternate; no pair twice in a row. */
    fun buildSession(contrasts: List<Contrast>, stats: Map<String, ContrastStat>, n: Int = 10, rnd: () -> Double): MutableList<PairItem> {
        class P(val c: Contrast, val ps: List<PairItem>, var used: Int, var side: Int)
        val pool = contrasts.map { c -> P(c, pairsOf(c), 0, if (rnd() < 0.5) 0 else 1) }
        if (pool.isEmpty()) return ArrayList()
        val out = ArrayList<PairItem>()
        for (k in 0 until n) {
            val tot = pool.sumOf { weight(stats, it.c.id) / (1 + it.used * 0.5) }
            var r = rnd() * tot; var pick = pool.last()
            for (p in pool) { r -= weight(stats, p.c.id) / (1 + p.used * 0.5); if (r <= 0) { pick = p; break } }
            val pr = pick.ps[pick.used % pick.ps.size]
            out.add(pr.withSide(pick.side)); pick.side = pick.side xor 1; pick.used++
        }
        for (k in 1 until out.size) if (out[k].key == out[k - 1].key) { val j = out.indices.firstOrNull { it > k && out[it].key != out[k].key } ?: -1; if (j > 0) { val t = out[k]; out[k] = out[j]; out[j] = t } }
        return out
    }
    /** A wrong answer at [idx] puts the same contrast again [gap] places later (another pair when one is free, same target side), flagged `retry`. */
    fun adapt(queue: MutableList<PairItem>, idx: Int, it: PairItem, gap: Int = 3): MutableList<PairItem> {
        val at = minOf(idx + gap, queue.size - 1); if (at <= idx) return queue
        val c = pack.contrasts.find { x -> x.id == it.c }; val ps = if (c != null) pairsOf(c) else emptyList()
        val after = queue.drop(idx + 1)
        val alt = ps.firstOrNull { p -> p.key != it.key && after.none { q -> q.key == p.key } } ?: ps.firstOrNull { p -> p.key == it.key }
        if (alt != null) queue[at] = alt.withSide(it.side, true)
        return queue
    }
    fun record(stats: MutableMap<String, ContrastStat>, id: String, ok: Boolean) { val s = stats.getOrPut(id) { ContrastStat() }; s.n++; if (ok) s.ok++ }
    /** End of a session: its per-contrast result joins the history (the 12 latest are kept). */
    fun endSession(stats: MutableMap<String, ContrastStat>, session: Map<String, Pair<Int, Int>>, day: String) {
        for ((id, v) in session) { val s = stats.getOrPut(id) { ContrastStat() }; s.hist = (s.hist + Triple(day, v.first, v.second)).takeLast(12) }
    }
    /** Weak sounds: practised ≥ 2 times with < 80 % right, lowest first. */
    fun weak(stats: Map<String, ContrastStat>, ids: List<String>? = null): List<String> = (ids ?: stats.keys.toList()).filter { id -> stats[id]?.let { it.n >= 2 && (it.acc ?: 1.0) < 0.8 } == true }.sortedBy { stats[it]!!.acc!! }

    /** `localStorage lk.pronPairs`: unreadable or not an object ⇒ empty. */
    fun load(j: JsonElement?): MutableMap<String, ContrastStat> { val m = LinkedHashMap<String, ContrastStat>(); (j as? JsonObject)?.forEach { (k, v) -> val o = v as? JsonObject
        m[k] = ContrastStat(o.gn("ok").toInt(), o.gn("n").toInt(), (o?.get("hist") as? JsonArray)?.mapNotNull { h -> (h as? JsonObject)?.let { Triple((it["d"] as? JsonPrimitive)?.content.orEmpty(), it.gn("ok").toInt(), it.gn("n").toInt()) } } ?: emptyList()) }; return m }
    fun save(stats: Map<String, ContrastStat>): JsonElement = JsonObject(stats.mapValues { it.value.json() })

    /** What the learner is offered next from the rhythm coach (at most 3). */
    class Next(val kind: String, val id: String = "", val k: Int = 0, val skill: String = "")
}

/** One word of the sentence plan: stressed (big) or weak (small, with its weak-form IPA). */
class PlanWord(val w: String, val stress: Boolean, val weak: String, val light: Boolean)
/** web/js/pron/coach.js: rhythm plan, what was missed, band and score of a shadowing attempt. */
class PronCoach(private val pack: SpeakPack) {
    private val TOK = Regex("[A-Za-z][A-Za-z']*")
    private fun toks(s: String?) = TOK.findAll(s ?: "").map { it.value }.toList()
    private fun low(s: String) = s.lowercase().replace('’', '\'')
    fun plan(s: CoachSentence, accent: String): List<PlanWord> = plan(s.s, s.w, accent)
    fun plan(sentence: String, forcedWords: List<String>?, accent: String): List<PlanWord> {
        val forced = forcedWords?.map { low(it) }?.toSet(); val us = accent == "en-US" || accent == "US"
        return toks(sentence).map { w -> val k = low(w); val wk = pack.weak[k]; val stress = if (forced != null) k in forced else wk == null && k !in pack.light
            PlanWord(w, stress, if (wk != null && !stress) "/" + wk.getOrElse(if (us) 1 else 0) { "" } + "/" else "", !stress) }
    }
    class Diff(val missing: List<String>, val missingContent: List<String>, val missingWeak: List<String>, val extra: List<String>, val cover: Double)
    fun diff(heard: String?, target: String): Diff {
        val pool = ArrayList(toks(heard).map { low(it) }); val want = toks(target).map { low(it) }; val missing = ArrayList<String>()
        for (w in want) { val i = pool.indexOf(w); if (i >= 0) pool.removeAt(i) else missing.add(w) }
        val isFn = { w: String -> pack.weak.containsKey(w) || w in pack.light }
        return Diff(missing, missing.filter { !isFn(it) }, missing.filter { isFn(it) }, pool, if (want.isNotEmpty()) (want.size - missing.size).toDouble() / want.size else 0.0)
    }
    fun band(score: Int) = if (score >= 85) "great" else if (score >= 65) "close" else "again"
    fun score(sim: Double, d: Diff): Int = maxOf(0, minOf(100, jsRound(sim * 100 - d.missingContent.size * 12 - d.missingWeak.size * 3)))
    fun bandText(b: String): Tr = when (b) { "great" -> Tr("Rất giống giọng mẫu – nhịp tự nhiên!"); "close" -> Tr("Gần rồi! Nghe lại mẫu chậm rồi nói theo một lần nữa."); else -> Tr("Chưa sao – nghe chậm, nhấn đúng các từ to rồi thử lại nhé.") }

    /** Up to 3 suggestions: the 2 weakest contrasts, the first rhythm sentence below 85, then the neighbouring skills. */
    fun next(pairs: PronPairs?, stats: Map<String, ContrastStat>, rhythm: Map<Int, Int>, skill: String): List<PronPairs.Next> {
        val out = ArrayList<PronPairs.Next>()
        if (pairs != null) for (id in pairs.weak(stats, pack.contrasts.map { it.id }).take(2)) pack.contrasts.find { it.id == id }?.let { out.add(PronPairs.Next("pair", id = id, skill = it.skills.firstOrNull().orEmpty())) }
        val k = pack.coachSentences.indices.firstOrNull { (rhythm[it] ?: 0) < 85 }
        if (k != null) out.add(PronPairs.Next("rhythm", k = k))
        if (out.size < 3) for (id in listOf("weak-forms", "connected-speech", "word-stress")) if (id != skill && out.size < 3) out.add(PronPairs.Next("skill", id = id))
        return out.take(3)
    }
    /** The sentence to start with: the first whose saved best is below 85. */
    fun firstOpen(rhythm: Map<Int, Int>): Int = maxOf(0, pack.coachSentences.indices.firstOrNull { (rhythm[it] ?: 0) < 85 } ?: -1)

    /** One shadowing attempt: score from the best alternative's similarity and what was missed; the tip names the words to stress. */
    class Attempt(val score: Int, val band: String, val tip: Tr?, val reward: Reward?, val heard: String)
    fun attempt(sentence: String, heard: String, alts: List<String>): Attempt {
        val sim = (if (alts.isNotEmpty()) alts else listOf(heard)).maxOf { Speaking.similarity(it, sentence) }.let { if (it < 0) 0.0 else it }
        val d = diff(heard, sentence); val sc = score(sim, d)
        val tip = if (d.missingContent.isNotEmpty()) Tr("Nhấn rõ hơn các từ chính: {w}", mapOf("w" to d.missingContent.joinToString(", ")))
            else if (d.missingWeak.isNotEmpty()) Tr("Máy nghe sót từ nhỏ: {w} – vẫn đọc nhẹ nhưng đừng bỏ hẳn.", mapOf("w" to d.missingWeak.joinToString(", "))) else null
        return Attempt(sc, band(sc), tip, if (sc >= 65) Reward(mapOf("spoken" to 1, "pron" to 1), if (sc >= 85) 4 else 2) else null, heard)
    }
}

/** #/pron: hub, lesson pieces, the mouth figure, the listening pair game and the quick quiz (web pron.js). */
object PronPage {
    class Group(val g: PronGroups.Group, val lessons: List<PronLesson>)
    class Hub(val ring: Double, val ringLabel: String, val groups: List<Group>, val total: Int)
    fun hub(pack: SpeakPack, done: Map<String, Int>): Hub {
        val all = pack.lessons
        return Hub(if (all.isNotEmpty()) done.size.toDouble() / all.size * 100 else 0.0, "${done.size}/${all.size}", PronGroups.ALL.map { g -> Group(g, all.filter { it.group == g.id }) }.filter { it.lessons.isNotEmpty() }, all.size)
    }
    /** `game.pronDone` → lesson id → best percent. */
    fun doneOf(game: JsonElement?): Map<String, Int> = ((game as? JsonObject)?.get("pronDone") as? JsonObject)?.mapValues { it.value.num().toInt() } ?: emptyMap()

    /** Header chips of a lesson: voiced / long / place + manner. */
    fun chips(l: PronLesson): List<Tr> { val m = l.mouth ?: return emptyList(); val out = ArrayList<Tr>()
        m.voiced?.let { out.add(Tr(if (it) "hữu thanh (rung cổ)" else "vô thanh (không rung)")) }
        if (m.long) out.add(Tr("âm dài ː"))
        if (m.place.isNotEmpty()) { out.add(Tr(PLACE[m.place] ?: m.place)); out.add(Tr(MANNER[m.manner] ?: m.manner)) }
        return out
    }
    private val PLACE = mapOf("lips" to "hai môi", "teeth" to "môi – răng", "tongue-teeth" to "lưỡi – răng", "ridge" to "lợi trên", "palate" to "vòm miệng", "back" to "cuống lưỡi", "throat" to "thanh hầu")
    private val MANNER = mapOf("stop" to "âm tắc (bật hơi)", "fricative" to "âm xát", "affricate" to "âm tắc – xát", "nasal" to "âm mũi", "approximant" to "âm tiếp cận")
    fun neighbours(pack: SpeakPack, id: String): Pair<PronLesson?, PronLesson?> { val i = pack.lessons.indexOfFirst { it.id == id }; return pack.lessons.getOrNull(i - 1).takeIf { i > 0 } to pack.lessons.getOrNull(i + 1) }

    /** The mouth figure: ellipses `[cx, cy, rx, ry]` of the outer lip, the inner mouth and the tongue (SVG numbers of pron.js mouthSvg). null = no figure (show the emoji). */
    class Mouth(val outerLip: List<Double>, val innerMouth: List<Double>, val tongue: List<Double>, val caption: List<Tr>)
    fun mouth(m: MouthSpec?): Mouth? {
        if (m == null || !m.hasShape) return null
        val open = mapOf("close" to 6, "mid" to 16, "open" to 28)[m.jaw] ?: 14; val wide = mapOf("spread" to 70, "neutral" to 56, "round" to 34)[m.lips] ?: 56
        val tx = mapOf("front" to 92, "central" to 100, "back" to 112)[m.tongue] ?: 100; val ty = 108 - (mapOf("close" to 14, "mid" to 8, "open" to 2)[m.jaw] ?: 8)
        val lips = mapOf("spread" to "môi dàn rộng", "neutral" to "môi tự nhiên", "round" to "môi tròn")[m.lips]; val jaw = mapOf("close" to "hàm khép", "mid" to "hàm hé", "open" to "hàm mở rộng")[m.jaw]
        return Mouth(listOf(100.0, 98.0, wide / 2.0 + 10, open / 2.0 + 12), listOf(100.0, 98.0, wide / 2.0, open / 2.0 + 2), listOf(tx.toDouble(), ty + open / 3.0, 18.0, 6.0), listOfNotNull(lips?.let { Tr(it) }, jaw?.let { Tr(it) }))
    }

    const val WORD_GOOD = 85; const val WORD_MEDIUM = 65; const val SENTENCE_PASS = 70; const val PAIR_ROUNDS = 8
    fun scoreColor(score: Int) = if (score >= WORD_GOOD) "good" else if (score >= WORD_MEDIUM) "medium" else "again"
    /** Text sent to the recogniser: arrows, linking marks and slashes removed. */
    fun cleanSentence(s: String) = s.replace(Regex("[↗↘‿]|\\s/\\s"), " ").replace(Regex("\\s+"), " ").trim()
    fun wordReward(score: Int): Reward? = if (score >= WORD_MEDIUM) Reward(mapOf("spoken" to 1), 2) else null
    fun sentenceReward(score: Int): Reward? = if (score >= SENTENCE_PASS) Reward(mapOf("spoken" to 2), 4) else null
    /** The lesson best: saved once ≥ min(5, words) words are scored; the mean of the best score per word, never lowering an old best. */
    fun lessonBest(scores: Map<Int, Int>, wordCount: Int): Int? = if (scores.size < minOf(5, wordCount)) null else jsRound(scores.values.sum().toDouble() / scores.size)
    fun saveBest(game: JsonElement?, id: String, pct: Int): JsonElement = SkillsGame.put(game, "pronDone") { it[id] = Js.number(maxOf(pct.toDouble(), Js.num(it[id]).let { x -> if (x.isNaN()) 0.0 else x })) }
    fun bestOf(scores: Map<Int, Int>, k: Int, s: Int): Map<Int, Int> = scores + (k to maxOf(scores[k] ?: 0, s))

    /** The listening pair game: 8 rounds of the lesson pairs (cycled, shuffled), one word played per round (answer side random). */
    class Round(val pair: Pair<String, String>, val answer: Int) { val options get() = listOf(pair.first, pair.second); val spoken get() = options[answer] }
    /** [shuffle] false = keep the cycled order (the web test harness stubs UI.shuffle; only the answer sides draw numbers). */
    fun rounds(pairs: List<Pair<String, String>>, rnd: () -> Double, shuffle: Boolean = true): List<Round> {
        val a = ArrayList((0 until PAIR_ROUNDS).map { pairs[it % pairs.size] })
        if (shuffle) for (i in a.size - 1 downTo 1) { val j = Math.floor(rnd() * (i + 1)).toInt(); val t = a[i]; a[i] = a[j]; a[j] = t }
        return a.map { Round(it, if (rnd() < 0.5) 0 else 1) }
    }
    class PairEnd(val ok: Int, val n: Int, val pct: Int, val good: Boolean, val reward: Reward) { val final = listOf(Tr("Nghe đúng {ok}/{n}", mapOf("ok" to ok, "n" to n)), if (good) Tr("tai bạn đã phân biệt tốt!") else Tr("nghe chậm lại từng cặp và thử lần nữa.")) }
    fun pairEnd(ok: Int, n: Int): PairEnd { val pct = jsRound(ok.toDouble() / n * 100); return PairEnd(ok, n, pct, pct >= 75, Reward(mapOf("quizzes" to 1, "pron" to 1), 5 + ok * 2)) }
    /** The quick quiz: after the last question the percent right is saved and the reward paid. */
    class QuizEnd(val pct: Int, val reward: Reward)
    fun quizEnd(right: Int, total: Int): QuizEnd { val pct = jsRound(right.toDouble() / total * 100); return QuizEnd(pct, Reward(mapOf("quizzes" to 1, "pron" to 1, "perfect" to (if (pct == 100) 1 else 0)), 8 + right * 3)) }
}

/** The "Nói thử" session of a lesson (web pron/sayit.js): 10 words, hear the model, speak, decide, adapt; the results are written once at the end. */
class PairSession(private val P: PronPairs, private val contrasts: List<Contrast>, stats: MutableMap<String, ContrastStat>, private val day: String, rnd: () -> Double) {
    val stats = stats
    val queue: MutableList<PairItem> = P.buildSession(contrasts, stats, N, rnd)
    var i = 0; private set
    var ok = 0; private set
    var scored = 0; private set
    var retry = 0; private set
    private val sess = LinkedHashMap<String, Pair<Int, Int>>()
    val total get() = queue.size
    val finished get() = i >= queue.size
    val item: PairItem get() = queue[i]
    fun labelOf(it: PairItem): Tr = P.labelTr(contrasts.first { c -> c.id == it.c })
    /** How a word ended: shows the next-word button (`done`), asks to try again (`retry`) or gives up on the word (`skip`). */
    class Step(val outcome: String, val state: Tr, val tip: Tr?, val heard: String, val next: Boolean, val retryHeard: Boolean)
    /** The platform returned alternatives (or nothing: pass an empty list for no-speech / network / busy errors). */
    fun heard(alts: List<String>): Step {
        val d = P.decide(alts, item.target, item.other)
        if (d.res == "neither") { retry++
            return if (retry > MAX_RETRY) Step("neither", Tr("Vẫn chưa rõ – chuyển sang từ tiếp theo."), null, d.heard, true, false)
            else Step("neither", Tr("Chưa nghe rõ – thử lại nhé (không trừ điểm)."), null, d.heard, false, d.heard.isNotEmpty()) }
        val good = d.res == "target"; scored++; if (good) ok++
        P.record(stats, item.c, good); val prev = sess[item.c] ?: (0 to 0); sess[item.c] = (prev.first + if (good) 1 else 0) to (prev.second + 1)
        if (good) return Step("good", Tr("Chính xác!"), null, d.heard, true, false)
        val tip = P.tipOf(item); P.adapt(queue, i, item)
        return Step("other", Tr("Máy nghe thành “{heard}” – từ còn lại trong cặp.", mapOf("heard" to item.other)), tip, d.heard, true, false)
    }
    fun next() { i++; retry = 0 }
    /** Final result chips (contrast label, ok, n) and the payout; call once when [finished]. */
    class Final(val pct: Int, val chips: List<Triple<Contrast, Int, Int>>, val reward: Reward, val score: Tr)
    fun finish(): Final { P.endSession(stats, sess, day)
        val chips = sess.map { (id, v) -> Triple(contrasts.first { it.id == id }, v.first, v.second) }
        return Final(if (scored != 0) jsRound(ok.toDouble() / scored * 100) else 0, chips, Reward(mapOf("spoken" to ok, "pron" to 1), 5 + ok * 2), Tr("Nói đúng {ok}/{n} từ", mapOf("ok" to ok, "n" to scored))) }
    companion object { const val N = 10; const val MAX_RETRY = 2 }
}
