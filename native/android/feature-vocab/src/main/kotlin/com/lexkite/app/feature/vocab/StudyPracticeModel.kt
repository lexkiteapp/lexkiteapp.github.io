package com.lexkite.app.feature.vocab

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.lesson.Speaking
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.ChoiceKit
import com.lexkite.app.core.vocab.LessonFx
import com.lexkite.app.core.vocab.Mistakes
import com.lexkite.app.core.vocab.Practice
import com.lexkite.app.core.vocab.WebWords
import com.lexkite.app.core.vocab.WordBook
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonObject
import kotlin.math.abs
import kotlin.random.Random

/** One practice word (the normalised pool object of Practice.pool). */
class PW(val raw: JsonObject) {
    val word get() = raw.gs("word"); val ipa get() = raw.gs("ipa"); val vi get() = raw.gs("vi"); val ex get() = raw.gs("ex"); val def get() = raw.gs("def")
    val pos get() = raw.gs("pos"); val emoji get() = raw.gs("emoji"); val image get() = raw.gs("image"); val level get() = raw.gs("level")
    val slashIpa get() = if (ipa.isBlank()) "" else "/" + ipa.trim().trim('/') + "/"
}

/**
 * One question. [type]: mcq-vi (word -> meaning) · mcq-en (meaning -> word) · type-cloze (sentence with a gap) · type-listen (hear it, type it) · type-vi / type-spell (meaning -> type the word).
 * [options] only for mcq; [blank] = the sentence with the gap for cloze.
 */
class Q(val type: String, val w: PW, val options: List<String>, val answer: String, val blank: String = "", val hard: Boolean = false) {
    val typed get() = type.startsWith("type")
    /** Hard mode (lesson-fx `harden`): choosing becomes typing, +6 XP instead of +3. */
    fun harden(): Q = if (type.startsWith("mcq")) Q("type-vi", w, emptyList(), w.word, hard = true) else Q(type, w, options, answer, blank, hard = true)
}

/** State of the question on screen: what was picked / typed, whether it was right, and whether a near miss gets one more try. */
class QState(val picked: String? = null, val typed: String = "", val ok: Boolean? = null, val close: Boolean = false, val tries: Int = 0)

object StudyQuiz {
    /** The gap sentence: the first form of the word in the example replaced by a gap; null when the example has none. */
    fun blank(ex: String, word: String): String? {
        if (ex.isBlank()) return null
        val re = Regex("\\b" + Regex.escape(word) + "\\w*", RegexOption.IGNORE_CASE)
        return if (re.containsMatchIn(ex)) re.replaceFirst(ex, "_____") else null
    }
    /** Up to three wrong choices: other words of the pool, same part of speech / level / similar length first. */
    fun distract(w: PW, pool: List<PW>, field: (PW) -> String, rnd: Random): List<String> {
        val right = field(w).lowercase()
        val others = pool.filter { it.word.lowercase() != w.word.lowercase() && field(it).isNotBlank() && field(it).lowercase() != right }
        fun score(x: PW) = (if (x.pos == w.pos) 0 else 4) + (if (x.level == w.level) 0 else 2) + minOf(3, abs(x.word.length - w.word.length) / 3)
        val seen = HashSet<String>(); val out = ArrayList<String>()
        for (x in others.shuffled(rnd).sortedBy { score(it) }) { if (out.size >= 3) break; if (seen.add(field(x).lowercase())) out.add(field(x)) }
        return out
    }
    fun make(type: String, w: PW, pool: List<PW>, rnd: Random): Q {
        when (type) {
            "mcq-vi" -> { val d = distract(w, pool, { it.vi }, rnd); if (d.isNotEmpty()) return Q(type, w, (d + w.vi).shuffled(rnd), w.vi) }
            "mcq-en" -> { val d = distract(w, pool, { it.word }, rnd); if (d.isNotEmpty()) return Q(type, w, (d + w.word).shuffled(rnd), w.word) }
            "type-cloze" -> { val b = blank(w.ex, w.word); if (b != null) return Q(type, w, emptyList(), w.word, b) }
            "type-listen", "type-spell", "type-vi" -> return Q(type, w, emptyList(), w.word)
        }
        return Q("type-vi", w, emptyList(), w.word)
    }
    /** The `Mistakes` record of a wrong answer (templates of plan.js MK, so old and new records migrate alike). */
    fun mistake(q: Q, given: String): JsonObject {
        val w = q.w
        val qk = when (q.type) {
            "mcq-vi" -> obj("k" to Mistakes.MEANING_Q, "v" to obj("word" to w.word))
            "mcq-en", "type-vi", "type-spell" -> obj("k" to "Từ tiếng Anh nghĩa là “{vi}”?", "v" to obj("vi" to w.vi))
            "type-cloze" -> obj("k" to "Điền từ: {sentence}", "v" to obj("sentence" to q.blank))
            else -> obj("k" to Mistakes.LISTEN_Q, "v" to obj())
        }
        return obj("kind" to "vocab", "q" to qk, "given" to given, "answer" to q.answer, "ref" to w.word, "explain" to "${w.word} ${w.slashIpa} = ${w.vi}".replace("  ", " "))
    }
}

// ------------------------------------------------------------------ UI state
class SrcRow(val value: String, val label: String, val count: Int)

/** Score card shown after a run. [seconds] only for match, [best] = a new personal record. */
class PracticeResult(val mode: String, val score: Int, val total: Int, val pct: Int, val xp: Int, val band: String?, val perfect: Boolean, val missing: Int, val seconds: Double? = null, val best: Boolean = false, val added: Int? = null)

class MatchTile(val id: Int, val text: String, val pair: Int, val isWord: Boolean)
class MatchState(val tiles: List<MatchTile>, val done: Set<Int>, val sel: Int?, val wrong: Pair<Int, Int>?, val misses: Int, val startedAt: Long)
class SpeakState(val listening: Boolean = false, val heard: String? = null, val pct: Int? = null, val ok: Boolean? = null, val error: L10nKey? = null)

sealed interface PracticeUi {
    data object Loading : PracticeUi
    class Hub(val sources: List<SrcRow>, val src: SrcRow, val picker: Boolean, val count: Int) : PracticeUi
    /** nothing to practise in the chosen source */
    class Empty(val mode: String) : PracticeUi
    class Run(val mode: String, val i: Int, val total: Int, val score: Int, val intro: PW?, val q: Q?, val st: QState, val stage: Int = 0, val speak: SpeakState? = null, val sp: PW? = null, val streak: Int = 0) : PracticeUi
    class MatchRun(val m: MatchState) : PracticeUi
    /** 8 right in a row: offer the harder rest of the round (once per round). */
    class HardOffer(val streak: Int) : PracticeUi
    class Done(val r: PracticeResult) : PracticeUi
}

class PracticeActions(
    val pick: (String) -> Unit = {}, val submit: (String) -> Unit = {}, val next: () -> Unit = {}, val known: () -> Unit = {}, val startQuestion: () -> Unit = {},
    val sayWord: (String) -> Unit = {}, val sayText: (String) -> Unit = {}, val tile: (Int) -> Unit = {},
    val mic: () -> Unit = {}, val skip: () -> Unit = {}, val clear: () -> Unit = {},
    val source: (String) -> Unit = {}, val picker: (Boolean) -> Unit = {}, val start: (String) -> Unit = {},
    val addMissing: () -> Unit = {}, val again: () -> Unit = {}, val hard: (Boolean) -> Unit = {}, val open: (String) -> Unit = {}, val exit: () -> Unit = {},
)

/** #/practice: hub (word source + mode grid) and the runs learn · mcq · cloze · listen · test · match · speak. Port of web/js/study.js + study-games.js. */
internal class PracticeVm(private val env: VocabEnv, private val mode: String, private var src: String) : ViewModel() {
    var ui by mutableStateOf<PracticeUi>(PracticeUi.Loading); private set

    private lateinit var data: VocabEnv.Loaded
    private var words: WebWords? = null
    private val rnd = Random.Default
    private var pool: List<PW> = emptyList()
    private var poolRaw: List<JsonObject> = emptyList()
    private var game: kotlinx.serialization.json.JsonElement? = null
    private var mistakes: List<JsonObject> = emptyList()
    private var pickerOpen = false
    // run
    private var queue: List<Q> = emptyList(); private var i = 0; private var score = 0; private var xp = 0; private var st = QState(); private var wrongWords = ArrayList<PW>()
    private var learn: Practice.Learn? = null; private var learnList: List<JsonObject> = emptyList(); private val knownSet = HashSet<String>(); private var intro: PW? = null; private var curQ: Q? = null; private var curW: JsonObject? = null; private var introduced = HashSet<String>(); private var learnAnswered = 0
    private var speakSt = SpeakState(); private var spoken = 0
    private var streak = 0; private var offered = false; private var hardOn = false
    private var match: MatchState? = null; private var matchStart = 0L

    init { viewModelScope.launch { start() } }

    private suspend fun start() {
        data = env.load(); game = data.game; mistakes = data.mistakes
        if (mode.isEmpty() || mode !in Practice.MODES) {
            publishHub()
            words = env.words(); publishHub()
        } else {
            if (src.startsWith("topic:") || src.isEmpty() || src == "deck") words = withTimeoutOrNull(8000) { env.words() }
            run()
        }
    }

    // ---- hub ----
    private fun srcRows(): List<Practice.Source> = Practice.sources(data.cards.values.count { it.gt("vi") }, words)
    private fun poolOf(s: String) = Practice.pool(s, data.cards, words, env.now(), null)
    private fun publishHub() {
        val all = srcRows(); val cur = all.firstOrNull { it.value == src } ?: all.first()
        val rows = all.map { SrcRow(it.value, it.label(env.tx), poolOf(it.value).size) }
        ui = PracticeUi.Hub(rows, rows.first { it.value == cur.value }, pickerOpen, rows.first { it.value == cur.value }.count)
    }
    fun source(v: String) { src = v; pickerOpen = false; publishHub() }
    fun picker(open: Boolean) { pickerOpen = open; publishHub() }

    // ---- runs ----
    private fun run() {
        poolRaw = Practice.pool(src.ifEmpty { null }, data.cards, words, env.now(), rnd)
        pool = poolRaw.map { PW(it) }
        if (pool.isEmpty()) { ui = PracticeUi.Empty(mode); return }
        score = 0; xp = 0; i = 0; wrongWords = ArrayList(); st = QState(); streak = 0; offered = false; hardOn = false
        when (mode) {
            "learn" -> { learnList = Practice.learnItems(poolRaw, data.cards, rnd); learn = Practice.Learn(learnList, rnd); knownSet.clear(); nextLearn() }
            "match" -> startMatch()
            "speak" -> { queue = pool.shuffled(rnd).take(10).map { Q("speak", it, emptyList(), it.word) }; showQ() }
            else -> {
                val n = minOf(Practice.quizSize(mode), pool.size); val types = Practice.quizTypes(mode)
                val items = pool.shuffled(rnd).take(n)
                queue = items.mapIndexed { k, w -> StudyQuiz.make(types[k % types.size], w, pool, rnd) }.let { if (mode == "test") it.shuffled(rnd) else it }
                showQ()
            }
        }
    }

    private fun showQ() {
        if (i >= queue.size) { finish(); return }
        if (wantsHard()) { offered = true; ui = PracticeUi.HardOffer(streak); return }
        st = QState(); speakSt = SpeakState(); val q = queue[i]; curQ = q
        publishRun(q)
        if (q.type == "type-listen") env.sayWord(q.w.word, data.accent) else if (q.type == "speak") Unit
    }
    /** lesson-fx `wantsHard`: once per round, not in the test, at least two questions left. */
    private fun wantsHard() = mode in Practice.HARD_MODES && !offered && !hardOn && streak >= Practice.HARD_AT && queue.size - i >= 2
    /** The learner's answer to the offer: yes = the rest of the round is typed and worth more. */
    fun hard(yes: Boolean) {
        if (yes) { hardOn = true; queue = queue.take(i) + queue.drop(i).map { it.harden() } }
        showQ()
    }
    private fun publishRun(q: Q?, intro: PW? = null) {
        val total = if (mode == "learn") (learn?.total ?: 0) else queue.size
        val prog = if (mode == "learn") (learn?.doneWords ?: 0) else i
        ui = PracticeUi.Run(mode, prog, total, score, intro, q, st, speak = if (mode == "speak") speakSt else null, sp = if (mode == "speak") q?.w else null, streak = if (mode in Practice.HARD_MODES) streak else 0)
    }

    // learn: up to 8 words, three stages each
    private fun nextLearn() {
        val l = learn ?: return
        val n = l.next()
        if (n == null) { finish(); return }
        val (w, type) = n; val pw = PW(w); curW = w
        val first = pw.word !in introduced
        val unknown = (data.cards[pw.word.lowercase()]?.let { CardMath.mastery(it.go("srs")) } ?: -1) <= 0
        st = QState()
        if (type == "mcq-vi" && first && unknown) { introduced.add(pw.word); intro = pw; curQ = StudyQuiz.make(type, pw, pool, rnd); publishRun(curQ, pw); return }
        introduced.add(pw.word); intro = null
        curQ = StudyQuiz.make(type, pw, pool, rnd); publishRun(curQ)
        if (type == "type-listen") env.sayWord(pw.word, data.accent)
    }
    fun startQuestion() { intro = null; publishRun(curQ); curQ?.let { if (it.type == "type-listen") env.sayWord(it.w.word, data.accent) } }
    /** "I already know this word": added to the deck as a month-old card and the word is done. */
    fun known() {
        val w = curW ?: return; val l = learn ?: return; val now = env.now()
        l.markKnown(w); knownSet.add(w.gs("word").lowercase())
        viewModelScope.launch {
            val d = env.load(); val s = WordBook.add(WordBook.Store(d.cards, d.doc.deleted), w, null, now)
            val key = CardMath.keyOf(w.gs("word")); val c = s.cards[key] ?: return@launch
            val ks = Practice.knownSrs(now); val merged = c.with("srs" to (c.go("srs") ?: obj()).let { o -> JsonObject(LinkedHashMap(o).also { m -> m.putAll(ks) }) }, "mod" to now)
            env.write(changed = mapOf(key to merged), deleted = s.deleted)
        }
        intro = null; nextLearn()
    }

    // ---- answering ----
    fun pick(choice: String) {
        val q = curQ ?: return; if (st.ok != null) return
        val ok = choice == q.answer
        st = QState(picked = choice, ok = ok); answered(q, ok, choice)
    }
    fun submit(text: String) {
        val q = curQ ?: return; if (st.ok != null) return
        val a = ChoiceKit.accept(text, q.answer)
        if (a.ok) { st = QState(typed = text, ok = true, tries = st.tries + 1); answered(q, true, text); return }
        val near = LessonFx.typo(text, q.answer)
        if (near.ok && near.typo && st.tries == 0) { st = QState(typed = text, close = true, tries = 1); publishRun(q, intro); return }
        st = QState(typed = text, ok = false, tries = st.tries + 1); answered(q, false, text)
    }
    private fun answered(q: Q, ok: Boolean, given: String) {
        if (mode == "learn") {
            val l = learn ?: return; val x = l.answer(curW ?: return, ok); xp += x; learnAnswered++
            if (ok) score++
        } else {
            if (mode in Practice.HARD_MODES) streak = if (ok) streak + 1 else 0
            if (ok) { score++; xp += Practice.quizXpPerAnswer(q.hard) } else {
                wrongWords.add(q.w)
                viewModelScope.launch { mistakes = Mistakes.log(mistakes, StudyQuiz.mistake(q, given), env.now(), env.tx); env.saveMistakes(mistakes) }
            }
        }
        publishRun(q, intro)
    }
    fun next() {
        if (mode == "learn") { nextLearn(); return }
        i++; showQ()
    }

    // ---- speak ----
    fun spoke(alts: List<String>) {
        val q = curQ ?: return
        val (heard, sim) = Speaking.best(q.answer, alts)
        val ok = sim >= 0.8
        if (ok) { score++; xp += 3; spoken++ } else wrongWords.add(q.w)
        speakSt = SpeakState(heard = heard, pct = Speaking.percent(sim), ok = ok); publishRun(q)
    }
    fun speechError(code: String) {
        speakSt = SpeakState(error = if (code == "unsupported") L10nKey.lessonNoVoice else L10nKey.lessonUnclear); curQ?.let { publishRun(it) }
    }
    fun listening() { speakSt = SpeakState(listening = true); curQ?.let { publishRun(it) } }
    fun skip() { i++; showQ() }

    // ---- match ----
    private fun startMatch() {
        val six = pool.shuffled(rnd).take(6)
        val tiles = ArrayList<MatchTile>()
        six.forEachIndexed { k, w -> tiles.add(MatchTile(k * 2, w.word, k, true)); tiles.add(MatchTile(k * 2 + 1, w.vi.ifEmpty { w.def }, k, false)) }
        matchStart = env.now()
        match = MatchState(tiles.shuffled(rnd), emptySet(), null, null, 0, matchStart); ui = PracticeUi.MatchRun(match!!)
    }
    fun tile(id: Int) {
        val m = match ?: return; if (id in m.done) return
        val tile = m.tiles.first { it.id == id }
        val first = m.sel?.let { s -> m.tiles.first { it.id == s } }
        if (first == null || m.sel == id) { match = MatchState(m.tiles, m.done, if (m.sel == id) null else id, null, m.misses, m.startedAt); ui = PracticeUi.MatchRun(match!!); return }
        if (first.pair == tile.pair && first.isWord != tile.isWord) {
            val done = m.done + first.id + tile.id; match = MatchState(m.tiles, done, null, null, m.misses, m.startedAt); ui = PracticeUi.MatchRun(match!!)
            env.sayWord(m.tiles.first { it.pair == tile.pair && it.isWord }.text, data.accent)
            if (done.size == m.tiles.size) finishMatch()
        } else { match = MatchState(m.tiles, m.done, null, first.id to id, m.misses + 1, m.startedAt); ui = PracticeUi.MatchRun(match!!) }
    }
    fun clearWrong() { val m = match ?: return; if (m.wrong != null) { match = MatchState(m.tiles, m.done, null, null, m.misses, m.startedAt); ui = PracticeUi.MatchRun(match!!) } }
    private fun finishMatch() {
        val m = match ?: return; val now = env.now()
        val seconds = (now - m.startedAt) / 1000.0 + m.misses
        val x = Practice.matchXp(seconds); val perfect = m.misses == 0
        var g = StudyReward.track(game, mapOf("matches" to 1, "quizzes" to 1, "perfect" to (if (perfect) 1 else 0)), x, now)
        val prev = (g as? JsonObject).go("best").gn("match", 0.0)
        val record = prev <= 0.0 || seconds < prev
        if (record) g = StudyReward.bestMatch(g, seconds)
        game = g; val gm = g
        viewModelScope.launch { env.write(game = gm) }
        ui = PracticeUi.Done(PracticeResult("match", 6, 6, 100, x, null, perfect, 0, seconds, record))
    }

    // ---- finishing ----
    private fun finish() {
        val now = env.now()
        if (mode == "learn") {
            val l = learn; val total = l?.total ?: 0; val mist = l?.mistakes ?: 0; val perfect = mist == 0
            val missing = learnList.count { missingWord(it.gs("word")) }
            val x = xp + Practice.LEARN_BONUS_XP
            val g = StudyReward.track(game, mapOf("quizzes" to 1, "perfect" to (if (perfect) 1 else 0), "newWords" to missing), x, now); game = g
            viewModelScope.launch { env.write(game = g) }
            val ans = maxOf(1, learnAnswered)
            ui = PracticeUi.Done(PracticeResult("learn", ans - mist, ans, Practice.percent(ans - mist, ans), x, null, perfect, missing))
            return
        }
        val total = queue.size; val perfect = score == total
        val pct = Practice.percent(score, total)
        val x = xp + (if (mode == "speak") 0 else Practice.quizBaseXp(pct))
        val g = StudyReward.track(game, mapOf("quizzes" to 1, "perfect" to (if (perfect) 1 else 0), "spoken" to spoken), x, now); game = g
        viewModelScope.launch { env.write(game = g) }
        val missing = wrongWords.distinctBy { it.word }.count { missingWord(it.word) }
        ui = PracticeUi.Done(PracticeResult(mode, score, total, pct, x, if (mode == "test") Practice.band(pct) else null, perfect, missing))
    }
    private fun missingWord(w: String) = !data.cards.containsKey(w.lowercase()) && w.lowercase() !in knownSet

    /** "Add the words you missed / the new words to your flashcards". */
    fun addMissing() {
        val r = (ui as? PracticeUi.Done)?.r ?: return
        val list = (if (mode == "learn") learnList else wrongWords.distinctBy { it.word }.map { it.raw }).filter { missingWord(it.gs("word")) }
        viewModelScope.launch {
            val d = env.load(); var s = WordBook.Store(d.cards, d.doc.deleted); val now = env.now()
            for (w in list) s = WordBook.add(s, w, null, now)
            val changed = s.cards.filter { (k, v) -> d.cards[k] != v }
            env.write(changed = changed, deleted = s.deleted)
            data = env.load(); ui = PracticeUi.Done(PracticeResult(r.mode, r.score, r.total, r.pct, r.xp, r.band, r.perfect, 0, r.seconds, r.best, list.size))
        }
    }
    fun again() { viewModelScope.launch { data = env.load(); run() } }

    fun actions(open: (String) -> Unit, exit: () -> Unit, mic: () -> Unit) = PracticeActions(
        pick = ::pick, submit = ::submit, next = ::next, known = ::known, startQuestion = ::startQuestion, sayWord = { env.sayWord(it, if (this::data.isInitialized) data.accent else "en-US") }, sayText = { env.sayText(it) },
        tile = ::tile, mic = mic, skip = ::skip, clear = ::clearWrong, source = ::source, picker = ::picker, start = { m -> open("practice/$m" + (if (src.isNotEmpty()) "?src=" + android.net.Uri.encode(src) else "")) },
        addMissing = ::addMissing, again = ::again, hard = ::hard, open = open, exit = exit,
    )

    class Factory(private val env: VocabEnv, private val mode: String, private val src: String) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = PracticeVm(env, mode, src) as T
    }
}
