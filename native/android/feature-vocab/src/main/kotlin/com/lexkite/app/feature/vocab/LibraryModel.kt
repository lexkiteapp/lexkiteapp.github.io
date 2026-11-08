package com.lexkite.app.feature.vocab

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.Library
import com.lexkite.app.core.vocab.Topic
import com.lexkite.app.core.vocab.WebWords
import com.lexkite.app.core.vocab.WordBook
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonObject

class SetCard(val id: String, val emoji: String, val name: String, val desc: String, val saved: Int, val total: Int, val levels: String)
class MineCard(val key: String, val emoji: String, val name: String, val desc: String, val count: Int, val due: Int, val mastered: Int)
/** A block of the library page: a group's sets, or the personal blocks ("My library" collections, then the sets that hold saved words). */
class LibSection(val groupId: String, val title: String, val desc: String, val sets: List<SetCard>, val viewAll: Int?, val mine: List<MineCard>, val mineSets: Boolean)

class LibraryUi(
    val loading: Boolean = true, val failed: Boolean = false, val tabs: List<Opt> = emptyList(), val tab: String = "all", val lv: String = "", val q: String = "",
    val sections: List<LibSection> = emptyList(), val emptyEmoji: String? = null, val words: Int = 0, val sets: Int = 0, val notice: L10nKey? = null, val noticeOk: Boolean = true, val noticeN: Int? = null,
)
class TopicWord(val word: String, val ipa: String, val pos: String, val level: String, val mean: String, val def: String, val ex: String, val col: List<String>, val added: Boolean)
class TopicUi(
    val id: String, val emoji: String, val name: String, val desc: String, val total: Int, val added: Int, val missing: Int, val levels: List<String>, val lv: String, val counts: Map<String, Int>,
    val words: List<TopicWord>, val notice: L10nKey? = null, val noticeN: Int? = null,
)

class LibraryActions(
    val tab: (String) -> Unit = {}, val level: (String) -> Unit = {}, val query: (String) -> Unit = {}, val open: (String) -> Unit = {}, val retry: () -> Unit = {},
    val sayWord: (String) -> Unit = {}, val add: (String) -> Unit = {}, val addAll: () -> Unit = {}, val exportAnki: () -> Unit = {}, val importAnki: () -> Unit = {}, val exit: () -> Unit = {},
)

/** #/library and #/topic/<id> (an unknown id draws the library). Port of app.js routes.library / routes.topic. */
internal class LibraryVm(private val env: VocabEnv, private val topicId: String?, query: Map<String, String>) : ViewModel() {
    var lib by mutableStateOf(LibraryUi()); private set
    var topic by mutableStateOf<TopicUi?>(null); private set
    private lateinit var data: VocabEnv.Loaded
    private var words: WebWords? = null
    private var curTab = query["g"].orEmpty(); private var lv = Library.levelOf(query["lv"]); private var q = ""
    private var tlv = Library.levelOf(query["lv"])
    private var loaded = false
    private var notice: L10nKey? = null; private var noticeOk = true; private var noticeN: Int? = null

    init { viewModelScope.launch { start() } }

    private suspend fun start() {
        data = env.load()
        if (curTab.isEmpty()) curTab = Library.defaultTab(null, data.cards.size, data.settings.gs("exam"))
        publish()
        words = env.words(); loaded = true; publish()
    }
    fun retry() { viewModelScope.launch { loaded = false; lib = LibraryUi(); words = env.words(); loaded = true; publish() } }

    private fun name(t: Topic) = env.tx.t(t.name, null)
    private fun desc(t: Topic) = env.tx.t(t.desc, null)

    private fun publish() {
        if (!this::data.isInitialized) return
        val w = words
        if (!loaded) { lib = LibraryUi(loading = true, tab = curTab, lv = lv); return }
        if (topicId != null && w != null) {
            val tp = w.topic(topicId)
            if (tp != null) { topic = topicUi(tp, w); return }
        }
        topic = null
        if (w == null) { lib = LibraryUi(loading = false, failed = true, tab = curTab, lv = lv); return }
        val page = Library.page(curTab, lv, q, data.cards, w, env.now(), ::name, ::desc)
        val tabs = listOf(Opt("all", "")) + w.groups.map { Opt(it.id, env.tx.t(it.name, null)) } + Opt("mine", "")
        val sections = page.sections.map { s ->
            val g = w.groups.firstOrNull { it.id == s.groupId }
            LibSection(s.groupId, g?.let { env.tx.t(it.name, null) }.orEmpty(), g?.let { env.tx.t(it.desc, null) }.orEmpty(),
                s.topics.map { tp -> val (saved, total) = Library.progress(tp, data.cards); SetCard(tp.id, tp.emoji, name(tp), desc(tp), saved, total, Library.levelsOf(tp).let { l -> if (l.isEmpty()) "" else if (l.size == 1) l[0] else l.first() + "–" + l.last() }) },
                s.viewAll,
                s.collections.map { m -> MineCard(m.key, CardMath.ORIGIN_EMOJI.getValue(m.key), env.tx.t(CardMath.ORIGIN_NAME.getValue(m.key), null), env.tx.t(CardMath.ORIGIN_DESC.getValue(m.key), null), m.count, m.due, m.mastered) },
                s.mineSets)
        }
        lib = LibraryUi(false, false, tabs, curTab, lv, q, sections, page.emptyEmoji, w.topics.sumOf { it.words.size }, w.topics.size, notice, noticeOk, noticeN)
    }

    private fun topicUi(tp: Topic, w: WebWords): TopicUi {
        val lvOk = if (Library.levelsOf(tp).size > 1 && tlv in Library.levelsOf(tp)) tlv else ""
        val p = Library.topicPageAt(tp, lvOk, data.cards)
        val counts = p.levels.associateWith { l -> tp.words.count { it.gs("level") == l } }
        return TopicUi(tp.id, tp.emoji, name(tp), desc(tp), tp.words.size, p.added, p.missing.size, p.levels, p.lv, counts,
            p.words.map { (x, inDeck) -> TopicWord(x.gs("word"), x.gs("ipa"), x.gs("pos"), x.gs("level"), CardMath.meanOf(x), x.gs("def"), x.gs("ex"), x.ga("col").map { it.vs() }, inDeck) }, notice, noticeN)
    }

    fun tab(k: String) { curTab = k; publish() }
    fun level(v: String) { if (topicId != null) tlv = v else lv = v; publish() }
    fun query(v: String) { q = v; publish() }

    // ---- adding words ----
    private suspend fun commit(s: WordBook.Store) {
        val changed = s.cards.filter { (k, v) -> data.cards[k] != v }
        env.write(changed = changed, deleted = s.deleted); data = env.load()
    }
    fun add(word: String) {
        val tp = topicId?.let { words?.topic(it) } ?: return; val entry = tp.words.firstOrNull { it.gs("word") == word } ?: return
        viewModelScope.launch { commit(WordBook.add(WordBook.Store(data.cards, data.doc.deleted), entry, null, env.now())); notice = null; publish() }
    }
    fun addAll() {
        val tp = topicId?.let { words?.topic(it) } ?: return
        viewModelScope.launch {
            val page = Library.topicPageAt(tp, "", data.cards); val n = page.missing.size
            commit(Library.addAll(WordBook.Store(data.cards, data.doc.deleted), page, env.now())); notice = L10nKey.vocabAddedWordsHeadTo; noticeN = n; publish()
        }
    }
    fun ankiText(): String = DeckIo.ankiText(topicId?.let { id -> words?.topic(id)?.words }?.map { w -> data.cards[CardMath.keyOf(w.gs("word"))] ?: w } ?: data.cards.values, topicId?.let { words?.topic(it)?.let(::name) } ?: "Lexkite")
    fun importAnki(text: String, fileName: String) {
        viewModelScope.launch {
            val r = runCatching { DeckIo.importText(text, fileName, data.cards, env.now()) }.getOrNull()
            if (r == null || (r.cards.isEmpty() && r.duplicates == 0)) { notice = L10nKey.vocabInvalidFile; noticeOk = false; noticeN = null }
            else { env.write(changed = r.cards); data = env.load(); notice = L10nKey.vocabImportedCards; noticeOk = true; noticeN = r.cards.size }
            publish()
        }
    }

    fun actions(open: (String) -> Unit, exit: () -> Unit, platform: DeckPlatform) = LibraryActions(
        tab = ::tab, level = ::level, query = ::query, open = open, retry = ::retry, sayWord = { env.sayWord(it, if (this::data.isInitialized) data.accent else "en-US") },
        add = ::add, addAll = ::addAll, exportAnki = { platform.saveFile("lexkite-anki.txt", "text/plain", ankiText()) }, importAnki = { platform.pickFile { text, name -> importAnki(text, name) } }, exit = exit,
    )

    class Factory(private val env: VocabEnv, private val topicId: String?, private val query: Map<String, String>) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = LibraryVm(env, topicId, query) as T
    }
}
