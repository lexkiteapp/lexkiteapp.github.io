package com.lexkite.app.feature.vocab

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.core.today.TodayModel
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.Mistakes
import com.lexkite.app.core.vocab.Review
import com.lexkite.app.core.vocab.StudyModes
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonObject
import java.util.TimeZone
import kotlin.math.floor

/** One saved context line of a card (shown under "Your contexts"); [video] = a YouTube link that can replay the clip. */
class CtxLine(val text: String, val video: String? = null, val title: String = "")

/** Everything the card faces show, already resolved (strings only) so the screen is a pure function of it. */
class ReviewCard(
    val word: String, val ipa: String, val ipaUs: String, val pos: String, val level: String, val mean: String, val def: String, val ex: String,
    val emoji: String, val image: String, val contexts: List<CtxLine>, val sentences: List<Pair<String, String>>, val col: List<String>, val syn: List<String>, val note: String,
    val retention: Int?, val lapses: Int, val isNew: Boolean, val reverse: Boolean,
    /** flip · type · audio */
    val mode: String, val options: List<String>, val right: Int, val previews: List<Review.Preview>,
)

/** Result of a typing / listening answer: [grade] 0..3 is what the card will be graded with when the learner continues. */
class ReviewAnswer(val ok: Boolean, val grade: Int, val given: String = "")

class ReviewSummary(
    /** nothing was due (opened with an empty queue) */
    val nothing: Boolean, val done: Int, val again: Int, val acc: Int, val mood: String, val xp: Int, val streak: Int, val minutes: Int, val g: List<Int>,
    val hardWord: String?, val hardIpa: String, val hardMean: String, val others: List<String>,
    val forecast: List<Int>, val nextDue: Long?, val soon: Int, val brag: Boolean,
    /** the clock the numbers were computed at (labels of the 7-day forecast) */
    val now: Long = 0L,
)

sealed interface ReviewUi {
    data object Loading : ReviewUi
    data object Empty : ReviewUi
    class Redirect(val route: String) : ReviewUi
    class Done(val s: ReviewSummary) : ReviewUi
    class Card(
        val c: ReviewCard, val flipped: Boolean, val ans: ReviewAnswer?, val done: Int, val total: Int, val left: Int, val canUndo: Boolean,
        val hints: Int = 0, val picked: Int? = null, val notice: L10nKey? = null, val noticeOk: Boolean = true, val aid: String? = null, val busy: Boolean = false, val canAid: Boolean = true,
    ) : ReviewUi
}

class ReviewActions(
    val flip: () -> Unit = {}, val grade: (Int) -> Unit = {}, val undo: () -> Unit = {}, val check: (String) -> Unit = {}, val giveUp: () -> Unit = {}, val hint: () -> Unit = {},
    val pick: (Int) -> Unit = {}, val next: () -> Unit = {}, val reverse: () -> Unit = {}, val sayWord: (String, String) -> Unit = { _, _ -> }, val sayText: (String) -> Unit = {},
    val replay: () -> Unit = {}, val saveSentence: (String) -> Unit = {}, val saveNote: (String) -> Unit = {}, val aid: () -> Unit = {}, val shadow: () -> Unit = {},
    val open: (String) -> Unit = {}, val openUrl: (String) -> Unit = {}, val share: (String) -> Unit = {}, val exit: () -> Unit = {},
)

private fun isVideo(src: String) = Regex("(^|//)(www\\.)?(youtube\\.com|youtu\\.be)").containsMatchIn(src)

/** #/review: the queue, the grading session (undo included), typing / listening modes and the summary. Port of web/js/study.js. */
internal class ReviewVm(private val env: VocabEnv, private val query: Map<String, String>) : ViewModel() {
    var ui by mutableStateOf<ReviewUi>(ReviewUi.Loading); private set

    private lateinit var data: VocabEnv.Loaded
    private var sess: Review.Session? = null
    private var game: kotlinx.serialization.json.JsonElement? = null
    private var seen: Map<String, Long> = emptyMap()
    private var library: List<JsonObject> = emptyList()
    private var docKey: Map<String, String> = emptyMap()
    private var startedAt = 0L; private var shownAt = 0L
    private var flipped = false; private var answer: ReviewAnswer? = null; private var hints = 0; private var replays = 0; private var picked: Int? = null
    private var pickNow: StudyModes.Pick? = null
    private var notice: L10nKey? = null; private var noticeOk = true; private var aidText: String? = null; private var busy = false

    init { viewModelScope.launch { start() } }

    private suspend fun start() {
        data = env.load(); val now = env.now(); startedAt = now
        game = data.game; seen = data.seen
        docKey = data.cards.entries.associate { it.value.gs("word").lowercase() to it.key }
        if (data.cards.size < 12) library = withTimeoutOrNull(3000) { env.words() }?.index?.values?.toList().orEmpty()
        val o = Review.open(data.cards.values.associateBy { it.gs("word").lowercase() }, data.settings, data.stats, seen, query, now)
        when (o.state) {
            "redirect" -> ui = ReviewUi.Redirect(o.redirect.orEmpty().removePrefix("#/"))
            "empty" -> ui = ReviewUi.Empty
            "allDone" -> ui = ReviewUi.Done(summary(null))
            else -> {
                val cards = LinkedHashMap<String, JsonObject>(); data.cards.values.forEach { cards[it.gs("word").lowercase()] = it }
                sess = Review.Session(o.queue, cards, data.stats ?: JsonObject(emptyMap()))
                show()
            }
        }
    }

    // ---- card faces ----
    private fun show() {
        val s = sess ?: return
        if (s.finished) { ui = ReviewUi.Done(summary(s)); return }
        val c = s.cards.getValue(s.queue.first())
        flipped = false; answer = null; hints = 0; replays = 0; picked = null; notice = null; aidText = null; busy = false; shownAt = env.now()
        if (CardMath.isNew(c)) { seen = CardMath.markSeen(seen, c.gs("word"), env.now()); val m = seen; viewModelScope.launch { env.saveSeen(m) } }
        val settings = data.settings
        val pick = StudyModes.pick(c, settings.gs("reviewMode"), s.reverse, s.cards.values, library, settings["typeReview"]?.let { it.vs() != "false" } ?: true)
        pickNow = pick
        publish()
        if (pick.mode == "audio") env.sayWord(c.gs("word"), data.accent)
    }

    private fun publish() {
        val s = sess ?: return
        val key = s.queue.firstOrNull() ?: return
        val c = s.cards[key] ?: return
        val now = env.now(); val srs = CardMath.srsOf(c); val pick = pickNow ?: StudyModes.Pick("flip", null)
        val card = ReviewCard(
            word = c.gs("word"), ipa = slash(c.gs("ipa")), ipaUs = slash(c.gs("ipaUS")), pos = c.gs("pos"), level = c.gs("level"), mean = CardMath.meanOf(c), def = c.gs("def"), ex = c.gs("ex"),
            emoji = c.gs("emoji"), image = c.gs("image").ifEmpty { env.imageUrl(c.gs("word"), c.gs("pos")).orEmpty() },
            contexts = c.ga("contexts").mapNotNull { it as? JsonObject }.take(2).map { CtxLine(it.gs("text"), it.gs("source").takeIf { u -> isVideo(u) }, it.gs("title")) },
            sentences = c.ga("sentences").mapNotNull { it as? JsonObject }.map { it.gs("en") to it.gs("vi") },
            col = c.ga("col").map { it.vs() }, syn = c.ga("syn").map { it.vs() }, note = c.gs("note"),
            retention = CardMath.retention(srs, now)?.let { floor(it * 100 + 0.5).toInt() }, lapses = srs.gn("lapses").toInt(), isNew = CardMath.isNew(c), reverse = s.reverse,
            mode = pick.mode, options = pick.options?.all.orEmpty(), right = pick.options?.right ?: -1, previews = (0..3).map { Review.preview(srs, it, now) },
        )
        ui = ReviewUi.Card(card, flipped || answer != null, answer, s.done, s.total, s.queue.size, s.canUndo, hints, picked, notice, noticeOk, aidText, busy, env.ai != null)
    }
    private fun slash(ipa: String) = if (ipa.isBlank()) "" else "/" + ipa.trim().trim('/') + "/"

    // ---- actions ----
    fun flip() { if (flipped) return; flipped = true; publish(); val c = card() ?: return; if (sess?.reverse == true || data.settings["autoSpeak"]?.vs() == "true") env.sayWord(c.gs("word"), data.accent) }
    private fun card(): JsonObject? = sess?.let { s -> s.queue.firstOrNull()?.let { s.cards[it] } }

    fun grade(g: Int) {
        val s = sess ?: return; val key = s.queue.firstOrNull() ?: return; val now = env.now()
        val r = s.grade(g, now) ?: return
        game = StudyReward.track(game, mapOf("reviews" to r.reviews, "newWords" to r.newWords, "again" to r.again), r.xp, now)
        val card = s.cards.getValue(key); val dk = docKey[key] ?: key; val st = s.stats; val gm = game
        viewModelScope.launch { env.write(changed = mapOf(dk to card), stats = st, game = gm) }
        show()
    }

    fun undo() {
        val s = sess ?: return; val now = env.now()
        val r = s.undo(now) ?: return
        val g0 = game as? JsonObject ?: JsonObject(emptyMap())
        val g1 = Review.undoGame(g0, r, CardMath.todayKey(now)); game = g1
        val changed = s.cards.filter { (k, v) -> data.cards[docKey[k] ?: k] != v }.mapKeys { docKey[it.key] ?: it.key }
        val st = s.stats
        viewModelScope.launch { env.write(changed = changed, stats = st, game = g1) }
        show()
    }

    /** Typing: the learner's text -> distance to the word -> grade. */
    fun check(text: String) {
        val c = card() ?: return; if (answer != null) return
        val w = c.gs("word"); val d = StudyModes.dist(StudyModes.norm(text), StudyModes.norm(w))
        val g = StudyModes.gradeType(d, w.length, hints, env.now() - shownAt, false)
        answer = ReviewAnswer(g > 0, g, text.trim()); publish()
    }
    fun giveUp() { val c = card() ?: return; if (answer != null) return; answer = ReviewAnswer(false, 0); publish(); env.sayWord(c.gs("word"), data.accent) }
    fun hint() { hints++; publish() }
    fun pick(i: Int) {
        val p = pickNow ?: return; val opt = p.options ?: return; if (answer != null) return
        picked = i; val ok = i == opt.right
        answer = ReviewAnswer(ok, StudyModes.gradeAudio(ok, replays, env.now() - shownAt)); publish()
    }
    fun next() { val a = answer ?: return; grade(a.grade) }
    fun replay() { val c = card() ?: return; replays++; env.sayWord(c.gs("word"), data.accent) }
    fun reverse() { val s = sess ?: return; s.reverse = !s.reverse; show() }

    fun saveSentence(text: String) {
        val s = sess ?: return; val key = s.queue.firstOrNull() ?: return; val c = s.cards[key] ?: return; val now = env.now()
        val t = text.trim(); val word = c.gs("word")
        if (!Regex("\\b" + Regex.escape(word.lowercase()), RegexOption.IGNORE_CASE).containsMatchIn(t)) { notice = L10nKey.revYourSentenceNeedsTo; noticeOk = false; publish(); return }
        val ctx = obj("text" to t, "title" to "Câu của tôi", "at" to now)
        val updated = c.with("contexts" to (listOf<Any>(ctx) + c.ga("contexts")).take(5), "mod" to now)
        s.cards[key] = updated; notice = L10nKey.revSaved; noticeOk = true
        val game0 = StudyReward.track(game, emptyMap(), 5, now); game = game0
        val dk = docKey[key] ?: key
        viewModelScope.launch { env.write(changed = mapOf(dk to updated), game = game0) }
        publish()
    }
    fun saveNote(text: String) {
        val s = sess ?: return; val key = s.queue.firstOrNull() ?: return; val c = s.cards[key] ?: return
        val updated = c.with("note" to text.trim().take(200), "mod" to env.now()); s.cards[key] = updated
        val dk = docKey[key] ?: key
        viewModelScope.launch { env.write(changed = mapOf(dk to updated)) }
        notice = L10nKey.revSaved; noticeOk = true; publish()
    }
    /** "Create a memory aid with AI": asks the injected AI, keeps the mnemonic as the card note (<= 200) when it has none. */
    fun aid() {
        val c = card() ?: return; val ask = env.ai ?: return; if (busy) return
        busy = true; notice = L10nKey.revAiIsThinkingOf; noticeOk = true; publish()
        viewModelScope.launch {
            val prompt = "Create a memory aid for the English word \"${c.gs("word")}\" (${c.gs("pos")}) meaning \"${c.gs("vi")}\". Return ONLY JSON: {\"mnemonic\": \"a vivid sound-alike or image association, max 30 words\", \"parts\": \"word parts / root meaning if useful, else empty\", \"confuse\": \"a commonly confused word and the difference, else empty\"}"
            val raw = runCatching { ask(prompt) }.getOrNull()
            val j = raw?.let { r -> runCatching { Json.parseToJsonElement(r.substring(r.indexOf('{'), r.lastIndexOf('}') + 1)).jsonObject }.getOrNull() }
            busy = false
            if (j == null || j.gs("mnemonic").isEmpty()) { notice = L10nKey.revDownloadFailedTryAgain; noticeOk = false }
            else {
                aidText = listOf(j.gs("mnemonic"), j.gs("parts"), j.gs("confuse")).filter { it.isNotBlank() }.joinToString(" · ")
                notice = L10nKey.revMemoryAidSaved; noticeOk = true
                if (c.gs("note").isEmpty()) saveNote(j.gs("mnemonic"))
            }
            publish()
        }
    }
    /** "Repeat aloud 3 times": the word three times, one after the other. */
    fun shadow() {
        val c = card() ?: return; val w = c.gs("word")
        viewModelScope.launch { repeat(3) { var finished = false; env.sayWord(w, data.accent) { finished = true }; var n = 0; while (!finished && n++ < 40) delay(150); delay(250) } }
    }

    // ---- summary ----
    private fun summary(s: Review.Session?): ReviewSummary {
        val now = env.now(); val tz = TimeZone.getDefault()
        val cards = s?.cards ?: data.cards.values.associateBy { it.gs("word").lowercase() }
        val done = s?.done ?: 0; val again = s?.again ?: 0; val acc = Review.accuracy(done, again)
        val doc: SyncDoc = data.doc.copy(stats = s?.stats ?: data.stats, game = game)
        val streak = TodayModel.streak(TodayModel.activeDays(doc), now, tz)
        val goal = data.settings.gn("dailyGoal", 20.0).let { if (it <= 0) 20 else it.toInt() }
        val today = (s?.stats ?: data.stats).go("days").gn(CardMath.todayKey(now)).toInt()
        val h = s?.let { Review.hardest(it.missed, cards) }
        val hc = h?.let { cards[it.first.lowercase()] }
        val next = Review.nextDue(cards.values, now)?.let { CardMath.srsOf(it).gn("due").toLong() }
        return ReviewSummary(
            nothing = s == null, done = done, again = again, acc = acc, mood = Review.mood(s == null, acc), xp = s?.xp ?: 0, streak = streak,
            minutes = maxOf(1, ((now - startedAt) / 60000.0 + 0.5).toInt()), g = s?.g?.toList() ?: listOf(0, 0, 0, 0),
            hardWord = h?.first, hardIpa = slash(hc.gs("ipa")), hardMean = CardMath.meanOf(hc), others = h?.second.orEmpty().take(10),
            forecast = Review.forecast(cards.values, now), nextDue = next, soon = Review.soonCount(cards.values, now),
            brag = s != null && Review.canBrag(acc, done, today >= goal, streak), now = now,
        )
    }

    fun actions(open: (String) -> Unit, openUrl: (String) -> Unit, share: (String) -> Unit, exit: () -> Unit) = ReviewActions(
        flip = ::flip, grade = ::grade, undo = ::undo, check = ::check, giveUp = ::giveUp, hint = ::hint, pick = ::pick, next = ::next, reverse = ::reverse,
        sayWord = { w, _ -> env.sayWord(w, data.accent) }, sayText = { env.sayText(it) }, replay = ::replay, saveSentence = ::saveSentence, saveNote = ::saveNote, aid = ::aid, shadow = ::shadow,
        open = open, openUrl = openUrl, share = share, exit = exit,
    )
    /** Speak the word of the summary's "watch most" box. */
    fun sayHard(w: String) = env.sayWord(w, if (this::data.isInitialized) data.accent else "en-US")

    class Factory(private val env: VocabEnv, private val query: Map<String, String>) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = ReviewVm(env, query) as T
    }
}
