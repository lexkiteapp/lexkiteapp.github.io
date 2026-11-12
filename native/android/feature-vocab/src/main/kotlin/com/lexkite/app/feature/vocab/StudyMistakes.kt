package com.lexkite.app.feature.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.style.TextAlign
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.Mistakes
import com.lexkite.app.core.vocab.WebWords
import com.lexkite.app.core.vocab.WordBook
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonObject

/** What one mistake card shows (the `Mistakes.view` texts plus the IPA of its words and whether the word is already a flashcard). */
class MistRow(val key: String, val kind: String, val v: Mistakes.View, val n: Int, val qIpa: String, val ansIpa: String, val ref: String, val inDeck: Boolean, val short: Boolean)
/** Retry-mode state of one card: [revealed] = answer shown (long answers / after a wrong try); [ok] = typed right (the card fades out); [wrong] = typed wrong. */
class RetryState(val revealed: Boolean = false, val ok: Boolean = false, val wrong: Boolean = false, val gone: Boolean = false)

class MistakesUi(
    val tab: String, val counts: Map<String, Int>, val rows: List<MistRow>, val retry: Boolean, val fading: Boolean, val hasFixed: Boolean,
    val st: Map<String, RetryState> = emptyMap(), val loaded: Boolean = true, val notice: L10nKey? = null,
)
class MistakesActions(
    val tab: (String) -> Unit = {}, val retry: (Boolean) -> Unit = {}, val check: (String, String) -> Unit = { _, _ -> }, val reveal: (String) -> Unit = {}, val settle: (String, Boolean) -> Unit = { _, _ -> },
    val gotIt: (String) -> Unit = {}, val clearFixed: () -> Unit = {}, val sayWord: (String) -> Unit = {}, val addCard: (String) -> Unit = {}, val open: (String) -> Unit = {}, val exit: () -> Unit = {},
)

/** #/mistakes: the notebook of wrong answers (plan.js). */
internal class MistakesVm(private val env: VocabEnv, retry0: Boolean, kind0: String) : ViewModel() {
    var ui by mutableStateOf(MistakesUi(kind0, emptyMap(), emptyList(), retry0, false, false, loaded = false)); private set
    private lateinit var data: VocabEnv.Loaded
    private var list: List<JsonObject> = emptyList(); private var game: kotlinx.serialization.json.JsonElement? = null
    private var curTab = kind0; private var retryOn = retry0
    private var words: WebWords? = null
    private val st = LinkedHashMap<String, RetryState>()
    private var notice: L10nKey? = null

    init { viewModelScope.launch { start() } }

    private suspend fun start() {
        data = env.load(); game = data.game
        words = withTimeoutOrNull(1500) { env.words() }
        // records saved before the translation keys existed get them now (and are written back)
        val (migrated, changed) = Mistakes.migrate(data.mistakes)
        list = migrated; if (changed.isNotEmpty()) env.saveMistakes(list)
        publish()
    }

    private fun ipaOf(w: String): String {
        if (w.isEmpty()) return ""
        val k = w.lowercase(); val raw = data.cards[CardMath.keyOf(w)]?.gs("ipa")?.takeIf { it.isNotEmpty() } ?: words?.index?.get(k)?.gs("ipa").orEmpty()
        return if (raw.isBlank()) "" else "/" + raw.trim().trim('/') + "/"
    }
    private fun publish() {
        val open = Mistakes.openOnes(list); val counts = Mistakes.counts(open)
        val rows = Mistakes.rows(open, if (curTab == "all") "" else curTab, retryOn).map { x ->
            val v = Mistakes.view(x, env.tx)
            MistRow(x.gs("key"), x.gs("kind"), v, x.gn("n", 1.0).toInt(), ipaOf(v.qIpa), ipaOf(v.ansIpa), x.gs("ref"), data.cards.containsKey(CardMath.keyOf(x.gs("ref"))), Mistakes.shortAnswer(x))
        }
        ui = MistakesUi(curTab, counts, rows, retryOn, CardMath.forgetting(data.cards.values, env.now()).isNotEmpty() && open.isNotEmpty(), list.any { it.gt("fixed") }, HashMap(st), true, notice)
    }
    fun tab(k: String) { curTab = k; publish() }
    fun retry(on: Boolean) { retryOn = on; st.clear(); publish() }
    fun reveal(key: String) { st[key] = RetryState(revealed = true); publish() }
    private fun reward(xp: Int) { val g = StudyReward.track(game, emptyMap(), xp, env.now()); game = g; viewModelScope.launch { env.write(game = g) } }
    private fun save() { val l = list; viewModelScope.launch { env.saveMistakes(l) } }

    /** Retry: typed text vs the answer (QE.norm). Right = fixed (+3 XP) and the card fades out; wrong = n+1 and the answer is shown with the self-check. */
    fun check(key: String, typed: String) {
        val x = list.firstOrNull { it.gs("key") == key } ?: return
        val ok = Mistakes.typedOk(typed, x.gs("answer"))
        val (l, xp) = Mistakes.settle(list, key, ok); list = l; if (xp > 0) reward(xp); save()
        st[key] = if (ok) RetryState(ok = true) else RetryState(revealed = true, wrong = true)
        publish()
        if (ok) viewModelScope.launch { delay(600); st[key] = RetryState(gone = true); publish() }
    }
    /** The self-check after the answer was shown: "I got it right" (fixed, +3 XP) or "Still wrong" (n+1). */
    fun settle(key: String, ok: Boolean) {
        val already = st[key]?.wrong == true
        val (l, xp) = if (ok) Mistakes.settle(list, key, true) else if (already) list to 0 else Mistakes.settle(list, key, false)
        list = l; if (xp > 0) reward(xp); save(); st[key] = RetryState(gone = true); publish()
    }
    fun gotIt(key: String) { val (l, xp) = Mistakes.fix(list, key); list = l; reward(xp); save(); publish() }
    fun clearFixed() { list = Mistakes.clearFixed(list); save(); publish() }
    fun addCard(ref: String) {
        viewModelScope.launch {
            val d = env.load(); val entry = words?.index?.get(ref.lowercase()) ?: obj("word" to ref, "topic" to "mine")
            val s = WordBook.add(WordBook.Store(d.cards, d.doc.deleted), entry, null, env.now())
            env.write(changed = s.cards.filter { (k, v) -> d.cards[k] != v }, deleted = s.deleted)
            data = env.load(); publish()
        }
    }
    fun actions(open: (String) -> Unit, exit: () -> Unit) = MistakesActions(::tab, ::retry, ::check, ::reveal, ::settle, ::gotIt, ::clearFixed, { env.sayWord(it, if (this::data.isInitialized) data.accent else "en-US") }, ::addCard, open, exit)

    class Factory(private val env: VocabEnv, private val retry: Boolean, private val kind: String) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = MistakesVm(env, retry, kind) as T
    }
}

private fun kindKey(k: String) = when (k) { "vocab" -> L10nKey.tabVocab; "grammar" -> L10nKey.mistGrammar; "reading" -> L10nKey.mistReadingComprehension; else -> L10nKey.todayListening }

@Composable
fun MistakesScreen(u: MistakesUi, a: MistakesActions) {
    val c = LocalLKColors.current
    StudyPage(t(L10nKey.todayMistakes), a.exit) {
        if (u.counts.getOrDefault("all", 0) > 0 || u.loaded.not()) Muted(t(L10nKey.mistEveryQuestionYouGet))
        Flow {
            Chip(t(L10nKey.mistAll, mapOf("n" to u.counts.getOrDefault("all", 0))), u.tab == "all", { a.tab("all") })
            Mistakes.KINDS.forEach { k -> Chip(t(kindKey(k)) + " " + t.num(u.counts.getOrDefault(k, 0)), u.tab == k, { a.tab(k) }) }
        }
        Flow {
            if (u.counts.getOrDefault("all", 0) > 0) GhostButton(t(if (u.retry) L10nKey.mistViewList else L10nKey.mistRetryMistakes), { a.retry(!u.retry) })
            if (u.fading) GhostButton(t(L10nKey.mistReviewFadingWords), { a.open("practice/learn?src=forgetting") })
            if (u.hasFixed) GhostButton(t(L10nKey.mistClearFixedMistakes), a.clearFixed, ink = c.onSurfaceVariant)
        }
        val rows = u.rows.filter { u.st[it.key]?.gone != true }
        if (rows.isEmpty() && u.loaded) EmptyState("🎉", t(L10nKey.mistNoMistakesToReview))
        rows.forEach { MistakeCard(it, u.retry, u.st[it.key] ?: RetryState(), a) }
    }
}

@Composable
private fun MistakeCard(r: MistRow, retry: Boolean, rs: RetryState, a: MistakesActions) {
    val c = LocalLKColors.current; val v = r.v
    var typed by remember(r.key) { mutableStateOf("") }
    val showAnswer = !retry || rs.revealed || rs.ok
    LKCard(Modifier.alpha(if (rs.ok) 0.5f else 1f)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Tag(t(kindKey(r.kind)))
            if (r.n > 1) Muted(t(L10nKey.mistMissedTimes, mapOf("n" to r.n)), Modifier.weight(1f)) else androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))
        }
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Column(Modifier.weight(1f)) {
                Body(v.q, style = LKType.bodyLg)
                if (r.qIpa.isNotEmpty()) EnLtr { Muted(r.qIpa) }
            }
            if (v.qSay.isNotEmpty()) SpeakButton({ a.sayWord(v.qSay) })
        }
        if (v.given.isNotEmpty() && !retry) Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).background(c.errorContainer).padding(LKSpacing.spaceXs)) {
            Text(v.given, style = LKType.bodyMd.toCompose().copy(textDecoration = TextDecoration.LineThrough), color = c.onErrorContainer)
        }
        if (showAnswer) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Column(Modifier.weight(1f)) {
                    Label(t(L10nKey.lessonAnswer), color = c.success)
                    Body(v.ans, style = LKType.bodyLg, color = c.success)
                    if (r.ansIpa.isNotEmpty()) EnLtr { Muted(r.ansIpa) }
                }
                if (v.ansSay.isNotEmpty()) SpeakButton({ a.sayWord(v.ansSay) })
            }
            if (v.tip.isNotEmpty() && !retry) Muted(v.tip)
        }
        if (retry) {
            if (rs.wrong) Notice(t(L10nKey.lessonWrong), false)
            if (!showAnswer) {
                if (r.short) {
                    StudyField(typed, { typed = it }, t(L10nKey.mistTypeYourAnswer), onDone = { if (typed.isNotBlank()) a.check(r.key, typed) })
                    LKPrimaryButton(t(L10nKey.actionCheck), { a.check(r.key, typed) }, enabled = typed.isNotBlank())
                } else GhostButton(t(L10nKey.mistShowAnswer), { a.reveal(r.key) }, Modifier.fillMaxWidth())
            } else if (!rs.ok) Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                GhostButton(t(L10nKey.mistIGotItRight), { a.settle(r.key, true) }, Modifier.weight(1f), ink = c.success)
                GhostButton(t(L10nKey.mistStillWrong), { a.settle(r.key, false) }, Modifier.weight(1f), ink = c.error)
            }
        } else {
            Flow {
                GhostButton(t(L10nKey.mistGotIt), { a.gotIt(r.key) }, ink = c.success)
                when (r.kind) {
                    "grammar" -> GhostButton(t(L10nKey.mistReviewLesson), { a.open("grammar/" + android.net.Uri.encode(r.ref)) })
                    "vocab" -> {
                        GhostButton(t(L10nKey.mistLookUpAgain), { a.open("dict/" + android.net.Uri.encode(r.ref)) })
                        if (!r.inDeck && r.ref.isNotEmpty()) GhostButton("+ " + t(L10nKey.vocabAdd), { a.addCard(r.ref) })
                    }
                    "reading" -> GhostButton(t(L10nKey.mistRereadPassage), { a.open("read/" + android.net.Uri.encode(r.ref)) })
                    "listening" -> GhostButton(t(L10nKey.mistReplayThisPart), { a.open("listen/" + android.net.Uri.encode(r.ref)) })
                }
            }
        }
    }
}
