package com.lexkite.app.feature.lesson

import com.lexkite.app.core.Answer
import com.lexkite.app.core.lesson.LItem
import com.lexkite.app.core.lesson.LessonEngine
import com.lexkite.app.core.lesson.LessonWriter
import com.lexkite.app.core.lesson.Off
import com.lexkite.app.core.lesson.Pick
import com.lexkite.app.core.lesson.Speaking
import kotlinx.serialization.json.JsonObject
import kotlin.math.max

/** Per-exercise input state (everything the learner has done on the current item). Immutable → the screen is a pure function of it. */
data class ItemState(
    val pick: String? = null,                       // gap / mean / q / pic(choice)
    val tiles: List<Int> = emptyList(),             // build / tr: placed tile indices, in order
    val typed: String = "",                         // type (keyboard)
    val bankMode: Boolean = false, val bankUsed: List<Int> = emptyList(), // type: letter tiles
    val removed: Set<String> = emptySet(),          // fifty-fifty hint
    val matchL: List<Int> = emptyList(), val matchR: List<Int> = emptyList(), val matched: Set<Int> = emptySet(),
    val selL: Int? = null, val selR: Int? = null, val matchMiss: Int = 0, val flash: Boolean = false,
    val heard: String? = null, val unclear: Boolean = false, val tries: Int = 0,
    val hints: Int = 0,
) {
    /** Check is enabled when there is something to check. */
    fun ready(it: LItem): Boolean = when (it.type) {
        "build", "tr" -> tiles.isNotEmpty()
        "type" -> typed.isNotBlank()
        "match", "line", "say" -> false
        "pic" -> it.choice == true && pick != null
        else -> pick != null
    }
}

data class Feedback(val ok: Boolean, val item: LItem, val given: String?, val combo: Int, val xp: Int, val requeued: Boolean)
data class Finish(val xp: Int, val accuracy: Int, val best: Int, val minutes: Int, val learned: List<String>, val weak: List<String>, val perfect: Boolean)

/** What the screen draws. */
data class LessonUi(
    val cur: LItem?, val st: ItemState, val feedback: Feedback?, val position: Int, val total: Int, val progress: Float, val combo: Int,
    val finish: Finish?, val retry: Boolean, val listenOff: Boolean, val speakOff: Boolean, val solved: Int = 0, val log: List<LItem> = emptyList(),
) {
    /** Leaving now would lose answered exercises – right or wrong, a wrong one is not solved yet, so the screen passes max(solved, graded answers) (nothing is saved until the lesson ends). */
    val exitNeedsConfirm: Boolean get() = finish == null && solved > 0
}

/**
 * P03 lesson state machine (no Android): drives [LessonEngine.Session], the hints (HINTS: fifty · first · letter · bank · slow · pair),
 * the learner's input, Check, the feedback sheet and the result. The ViewModel adds time, audio, speech and persistence around it.
 */
class LessonController(
    items: List<LItem>, val picks: List<Pick>, private val cards: Collection<JsonObject>, ease: Boolean = false, private val seed: Long = 1,
    private val now: () -> Long = System::currentTimeMillis, private val offState: () -> Off = { Off() },
) {
    val sess = LessonEngine.Session(items, ease = ease)
    private val t0 = now()
    var spoken = 0; private set
    var st = ItemState(); private set
    var feedback: Feedback? = null; private set
    var finish: Finish? = null; private set
    private val items0 = items.toList()

    /** A new exercise became current: fresh input state (match shuffles are seeded by the item id → stable across recompositions). */
    private val log = ArrayList<LItem>()
    private var fbPos = 1
    init { enter() }
    private fun enter() {
        val it = sess.cur
        if (it != null && it.type == "line" && log.none { l -> l.id == it.id }) log.add(it)
        st = if (it != null && it.type == "match") {
            val n = it.pairs?.size ?: 0; val r = LessonEngine.rng(seed * 31 + it.id)
            ItemState(matchL = LessonEngine.shuffle((0 until n).toList(), r), matchR = LessonEngine.shuffle((0 until n).toList(), r))
        } else ItemState()
    }

    fun ui(): LessonUi {
        val total = sess.total
        // Session.answer() already shifted the queue: while the feedback sheet is up the screen keeps the ANSWERED item (web: question stays until Continue)
        val shown = feedback?.item ?: sess.cur
        return LessonUi(shown, st, feedback, if (feedback != null) fbPos else minOf(sess.solved + 1, max(1, total)), total, sess.progress.toFloat(), sess.combo, finish, (shown?.retry ?: 0) > 0, offState().listen, offState().speak, max(sess.solved, sess.n), log.toList())
    }

    // ---------- input ----------
    private fun open() = feedback == null && finish == null && sess.cur != null
    fun pick(o: String) { if (open()) st = st.copy(pick = o) }
    fun placeTile(i: Int) { if (open() && i !in st.tiles) st = st.copy(tiles = st.tiles + i) }
    fun removeTile(pos: Int) { if (open() && pos in st.tiles.indices) st = st.copy(tiles = st.tiles.filterIndexed { k, _ -> k != pos }) }
    fun type(s: String) { if (open()) st = st.copy(typed = s.take(MAX_TYPED)) }
    fun bankTap(i: Int) { val it = sess.cur ?: return; if (!open() || i in st.bankUsed || i !in (it.bank ?: emptyList()).indices) return; st = st.copy(bankUsed = st.bankUsed + i, typed = st.typed + it.bank!![i]) }
    fun bankBack() { val it = sess.cur ?: return; if (!open() || st.bankUsed.isEmpty()) return; st = st.copy(bankUsed = st.bankUsed.dropLast(1), typed = st.typed.dropLast(it.bank!![st.bankUsed.last()].length)) }

    /** Match: tap a word (left) then a meaning (right); right pair dims both, wrong = one mistake. All pairs done → graded (0 mistakes = right). */
    fun matchTap(left: Boolean, idx: Int) {
        val it = sess.cur ?: return; if (!open() || it.type != "match" || idx in st.matched) return
        val s0 = st.copy(flash = false)
        val sel = if (left) s0.copy(selL = if (s0.selL == idx) null else idx) else s0.copy(selR = if (s0.selR == idx) null else idx)
        st = sel
        val l = sel.selL; val r = sel.selR
        if (l != null && r != null) {
            if (l == r) { st = sel.copy(matched = sel.matched + l, selL = null, selR = null); if (st.matched.size == (it.pairs?.size ?: -1)) submit(Answer.Given.Matched(st.matchMiss == 0), null) }
            else st = sel.copy(matchMiss = sel.matchMiss + 1, selL = null, selR = null, flash = true)
        }
    }
    fun clearFlash() { if (st.flash) st = st.copy(flash = false) }

    // ---------- hints (no XP cost) ----------
    /** One step of help for the current kind. Returns what happened, for the screen to announce. */
    fun hint(): String? {
        val it = sess.cur ?: return null; if (!open()) return null
        return when (it.type) {
            "gap", "mean", "q", "pic" -> if (it.type == "pic" && it.choice != true) null else { val wrong = (it.options ?: emptyList()).filter { o -> o != it.answer && o !in st.removed && o != st.pick }; if (wrong.size <= 1) null else { st = st.copy(removed = st.removed + wrong.first(), hints = st.hints + 1); "fifty" } }
            "build", "tr" -> {
                val w = it.answer.split(" "); val tiles = it.tiles ?: return null
                val cur = st.tiles.map { i -> tiles[i] }; val okPrefix = cur.size <= w.size && cur.indices.all { k -> LessonEngine.same(cur[k], w[k]) }
                val base = if (okPrefix) st.tiles else emptyList()
                val need = w.getOrNull(base.size) ?: return null
                val idx = tiles.indices.firstOrNull { k -> k !in base && LessonEngine.same(tiles[k], need) } ?: return null
                st = st.copy(tiles = base + idx, hints = st.hints + 1); "first"
            }
            "type" -> {
                if (!st.bankMode) { val n = st.typed.length.coerceAtMost(it.answer.length); if (n >= it.answer.length) null else { st = st.copy(typed = it.answer.take(n + 1), bankUsed = emptyList(), hints = st.hints + 1); "letter" } }
                else null
            }
            "match" -> { val pairs = it.pairs ?: return null; val i = pairs.indices.firstOrNull { k -> k !in st.matched } ?: return null; st = st.copy(matched = st.matched + i, selL = null, selR = null, hints = st.hints + 1); if (st.matched.size == pairs.size) submit(Answer.Given.Matched(st.matchMiss == 0), null); "pair" }
            else -> null
        }
    }
    /** type: switch the keyboard for the letter bank (hint "bank"). */
    fun useBank() { val it = sess.cur ?: return; if (open() && it.type == "type" && !it.bank.isNullOrEmpty()) st = st.copy(bankMode = true, typed = "", bankUsed = emptyList(), hints = st.hints + 1) }

    // ---------- check ----------
    /** Check button: grades what the learner has built so far. */
    fun check() {
        val it = sess.cur ?: return; if (!open() || !st.ready(it)) return
        when (it.type) {
            "build", "tr" -> submit(Answer.Given.Words(st.tiles.map { i -> it.tiles!![i] }), st.tiles.joinToString(" ") { i -> it.tiles!![i] })
            "type" -> submit(Answer.Given.Text(st.typed), st.typed)
            else -> submit(Answer.Given.Text(st.pick!!), st.pick)
        }
    }
    /** say / pic(speaking): [score] 0..1 from the recognizer. A first unclear try just asks again; the second is graded (web: tries ≥ 2). */
    fun spoke(score: Double, heard: String) {
        val it = sess.cur ?: return; if (!open()) return
        spoken++
        if (Speaking.percent(score) >= Speaking.PASS || st.tries >= 1) submit(Answer.Given.Score(score), heard)
        else st = st.copy(heard = heard, unclear = true, tries = st.tries + 1)
    }
    /** The recognizer heard nothing: ask again, does not count as a try. */
    fun unclear() { if (open()) st = st.copy(heard = null, unclear = true) }
    fun heard(text: String?) { if (open()) st = st.copy(heard = text, unclear = false) }

    private fun submit(given: Answer.Given, shown: String?) {
        val it = sess.cur ?: return
        fbPos = minOf(sess.solved + 1, max(1, sess.total)) // "Question n of N" of the answered item, kept while its feedback shows
        val ok = LessonEngine.check(it, given); val r = sess.answer(ok) ?: return
        feedback = Feedback(ok, it, shown ?: st.pick, r.combo, if (ok && it.retry == 0) XP_PER_RIGHT else 0, r.requeued == true)
    }

    // ---------- flow ----------
    /** Story line / video step: free, just moves on. */
    fun lineContinue() { val it = sess.cur ?: return; if (it.free == true && feedback == null) { sess.answer(true); advance() } }
    /** Continue after the feedback sheet. */
    fun next() { if (feedback != null) { feedback = null; advance() } }
    /** "Can't listen / speak now": the web turns the type for an hour; swap the current + remaining items. */
    fun adaptAll() {
        val off = offState(); sess.replace { LessonEngine.adapt(it, off) }; if (finish == null) enter()
    }
    private fun advance() { if (sess.done) finishNow() else enter() }
    private fun finishNow() {
        val s = sess
        finish = Finish(LessonWriter.xpOf(s), s.accuracy, s.best, max(1, Math.round((now() - t0) / 60000.0).toInt()), picks.mapNotNull { (it.card["word"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.takeIf { w -> w.isNotEmpty() } },
            s.wrong.keys.filter { !it.startsWith("#") }, s.wrong.isEmpty())
    }
    fun results(): List<LessonEngine.Res> = LessonEngine.results(sess, items0, cards, now())
    val exitNeedsConfirm: Boolean get() = finish == null && max(sess.solved, sess.n) > 0

    companion object { const val XP_PER_RIGHT = 2; const val MAX_TYPED = 60 }
}
