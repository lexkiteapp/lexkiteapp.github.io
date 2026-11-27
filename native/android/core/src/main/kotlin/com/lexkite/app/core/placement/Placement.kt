package com.lexkite.app.core.placement

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.math.BigDecimal
import java.math.RoundingMode
import java.util.Locale
import kotlin.math.abs
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.ln
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sqrt

/** One answered question: kind = vocab | grammar, r = right | wrong | idk, c = chance of a lucky guess (null = 0.25 like the web). */
data class PResp(val kind: String, val lv: String, val r: String, val c: Double? = null)
data class PPost(val theta: Double, val se: Double)
data class PSkill(val band: Double, val cefr: String, val theta: Double)
/** Web `Placement.estimate`: band strings are "6.5"; [range] = "6.0–7.0" or one band when the interval collapses. */
data class PEstimate(
    val band: String, val lo: String, val hi: String, val range: String, val theta: Double, val se: Double, val vocab: PSkill, val grammar: PSkill,
    val weak: String, val stage: String, val n: Int, val right: Int, val idk: Int,
)

/** content-pack/placement.json items: vocabulary (lv = test ladder level, pos normalised, vi / def = meaning by UI language) and grammar quiz questions. */
data class PVocab(val id: String, val lv: String, val w: String, val pos: String, val vi: String, val def: String)
data class PGrammar(val id: String, val lv: String, val q: String, val options: List<String>, val answer: Int)
class PlacementPack(val n: Int, val ladder: List<String>, val vocab: List<PVocab>, val grammar: List<PGrammar>)

/** A question as shown: [text] = the word (vocab) or the sentence with a gap (grammar); [c] = chance of a lucky guess = 1 / options. */
class PQuestion(val id: String, val kind: String, val lv: String, val text: String, val options: List<String>, val correct: Int) {
    val c: Double get() = 1.0 / options.size
    val vocab: Boolean get() = kind == "vocab"
}

/**
 * "Kiểm tra đầu vào" (#/placement) – port of web/js/placement.js: 3-parameter-light IRT (difficulty = CEFR level, guess = 1/options, weak prior),
 * EAP posterior on a −2…5 grid, band RANGE (≈ 68 %), CEFR, adaptive next level, and the `settings.placement` record. Vectors: vectors/placement.json.
 */
object Placement {
    const val A = 1.7
    const val MU = 1.5
    const val SD = 1.2
    const val N = 20
    val LADDER = listOf("A2", "B1", "B2", "C1")
    private val B = mapOf("A1" to -0.7, "A2" to 0.0, "B1" to 1.0, "B2" to 2.0, "C1" to 3.0, "C2" to 3.7)

    private fun sig(x: Double) = 1.0 / (1.0 + exp(-x))
    /** JS Math.round (halves go up). */
    private fun jsRound(x: Double) = floor(x + 0.5)
    /** JS Number.prototype.toFixed(2) read back as a number. */
    private fun fix2(x: Double) = BigDecimal(x).setScale(2, RoundingMode.HALF_UP).toDouble()
    private fun f1(b: Double) = String.format(Locale.US, "%.1f", b)

    fun posterior(resp: List<PResp>): PPost {
        val ths = DoubleArray(351); val ls = DoubleArray(351); var mx = Double.NEGATIVE_INFINITY
        for (k in 0..350) {
            val th = -2 + k * 0.02
            var l = -((th - MU) * (th - MU)) / (2 * SD * SD)
            for (r in resp) {
                val p = sig(A * (th - (B[r.lv] ?: 1.0))); val c = r.c ?: 0.25
                l += ln(when (r.r) { "right" -> c + (1 - c) * p; "wrong" -> (1 - c) * (1 - p); else -> 1 - p })
            }
            ths[k] = th; ls[k] = l; if (l > mx) mx = l
        }
        var sw = 0.0; var s1 = 0.0; var s2 = 0.0
        for (k in 0..350) { val w = exp(ls[k] - mx); sw += w; s1 += w * ths[k]; s2 += w * ths[k] * ths[k] }
        val m = s1 / sw
        return PPost(m, sqrt(max(0.0, s2 / sw - m * m)))
    }

    /** θ = 1 ↔ 50 % of B1 right. CEFR ↔ IELTS (Cambridge): B1 ≈ 4.0–5.0, B2 ≈ 5.5–6.5, C1 ≈ 7.0–8.0. */
    fun bandOf(th: Double): Double = min(8.5, max(3.0, jsRound((2.25 + 1.5 * th) * 2) / 2))
    fun cefrOf(b: Double): String = if (b < 4) "A2" else if (b < 5.5) "B1" else if (b < 7) "B2" else if (b < 8.5) "C1" else "C2"
    fun stageOf(b: Double): String = if (b <= 5) "s0" else if (b <= 6) "s1" else if (b <= 6.5) "s2" else "s3"

    fun estimate(resp: List<PResp>): PEstimate {
        val all = posterior(resp); val v = posterior(resp.filter { it.kind == "vocab" }); val gr = posterior(resp.filter { it.kind == "grammar" })
        val band = bandOf(all.theta); val lo = min(band, bandOf(all.theta - all.se)); val hi = max(band, bandOf(all.theta + all.se))
        fun skill(p: PPost): PSkill { val b = bandOf(p.theta); return PSkill(b, cefrOf(b), fix2(p.theta)) }
        return PEstimate(
            band = f1(band), lo = f1(lo), hi = f1(hi), range = if (lo == hi) f1(band) else "${f1(lo)}–${f1(hi)}", theta = fix2(all.theta), se = fix2(all.se),
            vocab = skill(v), grammar = skill(gr), weak = if (v.theta <= gr.theta) "vocab" else "grammar", stage = stageOf(band), n = resp.size,
            right = resp.count { it.r == "right" }, idk = resp.count { it.r == "idk" },
        )
    }

    /** The level of the next question: a little below the current estimate (stable over 20 questions, starts at B1). */
    fun nextLevel(resp: List<PResp>): String = LADDER[min(LADDER.size - 1, max(0, jsRound(posterior(resp).theta - 0.2).toInt()))]

    /** One unused item of the level nearest to [lv] (the level itself, then below, then above, widening); [rnd] is called once. */
    fun <T> take(pool: List<T>, lv: String, used: MutableSet<String>, rnd: () -> Double, lvOf: (T) -> String, idOf: (T) -> String): T? {
        val want = LADDER.indexOf(lv)
        for (d in LADDER.indices) for (s in (if (d != 0) listOf(-1, 1) else listOf(0))) {
            val l = LADDER.getOrNull(want + d * s) ?: continue
            val c = pool.filter { lvOf(it) == l && idOf(it) !in used }
            if (c.isNotEmpty()) { val x = c[floor(rnd() * c.size).toInt()]; used.add(idOf(x)); return x }
        }
        return null
    }

    private fun num(d: Double): JsonPrimitive = if (d == floor(d) && abs(d) < 1e15) JsonPrimitive(d.toLong()) else JsonPrimitive(d)
    /** What the web writes to `settings.placement` when the test ends (synced; the day plan and the path read it). */
    fun record(e: PEstimate, now: Long): JsonObject = buildJsonObject {
        put("v", 2); put("band", e.band); put("lo", e.lo); put("hi", e.hi); put("vocab", num(e.vocab.band)); put("grammar", num(e.grammar.band))
        put("vCefr", e.vocab.cefr); put("gCefr", e.grammar.cefr); put("weak", e.weak); put("stage", e.stage); put("n", e.n); put("idk", e.idk); put("se", num(e.se))
        put("pct", jsRound(e.right.toDouble() / max(1, e.n) * 100).toInt()); put("at", now)
    }

    /** x = x*1664525 + 1013904223 mod 2^32, value = x / 2^32 (the generator of the vector scenarios; also a cheap shuffle source). */
    fun lcg(seed: Long): () -> Double { var x = seed and 0xFFFFFFFFL; return { x = (x * 1664525L + 1013904223L) and 0xFFFFFFFFL; x.toDouble() / 4294967296.0 } }

    fun parse(root: JsonObject): PlacementPack {
        fun s(o: JsonObject, k: String) = o[k]?.jsonPrimitive?.contentOrNull.orEmpty()
        val vocab = (root["vocab"] as? JsonArray).orEmpty().mapNotNull { it as? JsonObject }.map { PVocab(s(it, "id"), s(it, "lv"), s(it, "w"), s(it, "pos"), s(it, "vi"), s(it, "def")) }
        val grammar = (root["grammar"] as? JsonArray).orEmpty().mapNotNull { it as? JsonObject }.map { o ->
            PGrammar(s(o, "id"), s(o, "lv"), s(o, "q"), (o["options"] as? JsonArray).orEmpty().map { it.jsonPrimitive.content }, o["answer"]?.jsonPrimitive?.intOrNull ?: 0)
        }
        val n = root["n"]?.jsonPrimitive?.intOrNull ?: N
        val ladder = (root["ladder"] as? JsonArray)?.map { it.jsonPrimitive.content } ?: LADDER
        return PlacementPack(n, ladder, vocab, grammar)
    }
}

/**
 * The ask() loop of the route: 20 questions alternating vocabulary / grammar (even index = vocabulary), the level of each from the estimate of THAT kind,
 * "I don't know" = [answer] with -1 (counts as not knowing, no guess). [rnd] only picks the item (so scenarios replay); [seed] shuffles the options.
 * [meaningVi] = show the Vietnamese meaning (UI language vi), else the English definition.
 */
class PlacementSession(private val pack: PlacementPack, private val rnd: () -> Double, private val seed: Long, private val meaningVi: Boolean) {
    private val used = HashSet<String>()
    val resp = ArrayList<PResp>()
    var current: PQuestion? = null; private set
    val n: Int get() = pack.n

    private fun mean(w: PVocab) = (if (meaningVi) w.vi.ifEmpty { w.def } else w.def.ifEmpty { w.vi })

    /** The next question, or null when the test is over (n answered, or the bank ran dry). */
    fun next(): PQuestion? {
        current = null
        if (resp.size >= pack.n) return null
        val kind = if (pack.grammar.isEmpty()) "vocab" else if (pack.vocab.isEmpty()) "grammar" else if (resp.size % 2 == 1) "grammar" else "vocab"
        val want = Placement.nextLevel(resp.filter { it.kind == kind })
        val q = if (kind == "vocab") Placement.take(pack.vocab, want, used, rnd, { it.lv }, { it.id })?.let { vocabQuestion(it) }
                else Placement.take(pack.grammar, want, used, rnd, { it.lv }, { it.id })?.let { PQuestion(it.id, "grammar", it.lv, it.q, it.options, it.answer) }
        current = q
        return q
    }

    /** [k] = the option index, -1 = "I don't know". Ignored when no question is open. */
    fun answer(k: Int) {
        val q = current ?: return
        current = null
        resp.add(PResp(q.kind, q.lv, if (k < 0) "idk" else if (k == q.correct) "right" else "wrong", q.c))
    }

    private fun vocabQuestion(w: PVocab): PQuestion {
        val own = mean(w); val rng = Placement.lcg(seed + resp.size * 7919L + 1)
        // distractors: same part of speech, nearest level and similar length first; never the same meaning
        val ranked = pack.vocab.filter { it.id != w.id && mean(it).isNotEmpty() && mean(it) != own }
            .map { x -> x to ((if (x.pos == w.pos) 0.0 else 100.0) + abs(Placement.LADDER.indexOf(x.lv) - Placement.LADDER.indexOf(w.lv)) * 10.0 + abs(mean(x).length - own.length) / 8.0 + rng()) }
            .sortedBy { it.second }
        val picks = LinkedHashMap<String, PVocab>()
        for ((x, _) in ranked) { if (picks.size >= 3) break; picks.putIfAbsent(mean(x), x) }
        val all = (listOf(w) + picks.values).toMutableList()
        for (i in all.size - 1 downTo 1) { val j = floor(rng() * (i + 1)).toInt(); val t = all[i]; all[i] = all[j]; all[j] = t }
        return PQuestion(w.id, "vocab", w.lv, w.w, all.map { mean(it) }, all.indexOf(w))
    }
}
