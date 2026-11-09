package com.lexkite.app.feature.vocab

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.Deck
import com.lexkite.app.core.vocab.WebWords
import com.lexkite.app.core.vocab.WordBook
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.JsonObject

class Opt(val value: String, val label: String)
class DeckRowUi(val word: String, val ipa: String, val mean: String, val note: String, val retention: Int?, val mastery: Int, val thumb: String, val isImage: Boolean)
/** The card being edited ("Edit “{w}”"): the five fields of editCard plus the emoji used by the image hint. */
class EditCardUi(val word: String, val vi: String, val ipa: String, val ex: String, val note: String, val image: String, val emoji: String, val confirmDelete: Boolean = false)
/** Preview of a shared deck (`?share=`): [invalid] = the link could not be read. */
class SharedUi(val name: String, val words: List<Pair<String, String>>, val fresh: Int, val invalid: Boolean, val adding: Boolean = false, val added: Int? = null)

class DeckUi(
    val loading: Boolean = true, val total: Int = 0, val mastered: Int = 0, val shown: Int = 0, val matched: Int = 0, val rows: List<DeckRowUi> = emptyList(),
    val f: Deck.Filter = Deck.Filter(), val topics: List<Opt> = emptyList(), val froms: List<Opt> = emptyList(), val levels: List<Opt> = emptyList(),
    val picker: String? = null, val edit: EditCardUi? = null, val shared: SharedUi? = null, val shareLink: String? = null, val shareCount: Int = 0,
    val notice: L10nKey? = null, val noticeOk: Boolean = true, val noticeN: Int? = null,
)

class DeckActions(
    val query: (String) -> Unit = {}, val picker: (String?) -> Unit = {}, val pick: (String, String) -> Unit = { _, _ -> },
    val edit: (String?) -> Unit = {}, val save: (String, String, String, String, String) -> Unit = { _, _, _, _, _ -> }, val relearn: () -> Unit = {}, val delete: (Boolean) -> Unit = {}, val deleteNow: () -> Unit = {},
    val sayWord: (String) -> Unit = {}, val share: () -> Unit = {}, val closeShare: () -> Unit = {}, val copyLink: (String) -> Unit = {}, val sendLink: (String) -> Unit = {},
    val exportJson: () -> Unit = {}, val importJson: () -> Unit = {}, val exportAnki: () -> Unit = {}, val importAnki: () -> Unit = {},
    val addShared: () -> Unit = {}, val open: (String) -> Unit = {}, val image: StudyImage? = null, val exit: () -> Unit = {}, val anki: AnkiFlow? = null,
)

/** #/deck: the list with its four filters, edit / relearn / delete, share link, JSON + Anki files, and the shared-deck preview. Port of app.js routes.deck. */
internal class DeckVm(private val env: VocabEnv, private val args: Map<String, String>, private val deckName: String) : ViewModel() {
    var ui by mutableStateOf(DeckUi()); private set
    private lateinit var data: VocabEnv.Loaded
    private var f = Deck.fromQuery(args)
    private var words: WebWords? = null
    private var editing: EditCardUi? = null; private var pickerKind: String? = null; private var shared: SharedUi? = null; private var sharedWords: List<JsonObject> = emptyList()
    private var notice: L10nKey? = null; private var noticeOk = true; private var noticeN: Int? = null; private var shareLink: String? = null

    init { viewModelScope.launch { start() } }

    private suspend fun start() {
        data = env.load()
        val code = args["share"]
        if (code != null) {
            val s = Deck.unpack(code)
            if (s == null) shared = SharedUi("", emptyList(), 0, true)
            else { sharedWords = s.words; shared = SharedUi(s.name, s.words.map { it.gs("word") to it.gs("vi") }, s.words.count { !data.cards.containsKey(CardMath.keyOf(it.gs("word"))) }, false) }
        }
        publish()
        words = withTimeoutOrNull(2500) { env.words() }
        publish()
    }

    private fun opts(): Triple<List<Opt>, List<Opt>, List<Opt>> {
        val topicIds = data.cards.values.map { it.gs("topic") }.filter { it.isNotEmpty() && it != "mine" && it != "anki" }.distinct()
        val topics = ArrayList<Opt>().apply {
            add(Opt("", "")); add(Opt("mine", ""))
            Deck.deckNames(data.cards.values).forEach { add(Opt("deck:$it", it)) }
            topicIds.forEach { id -> words?.topic(id)?.let { add(Opt(id, env.tx.t(it.name, null))) } }
        }
        val froms = listOf(Opt("", ""), Opt("forget", "")) + com.lexkite.app.core.vocab.CardMath.ORIGINS.map { Opt(it, env.tx.t(CardMath.ORIGIN_NAME.getValue(it), null)) }
        return Triple(topics, froms, Deck.LEVELS.map { Opt(it, "") })
    }

    private fun publish() {
        if (!this::data.isInitialized) return
        val now = env.now(); val all = Deck.rows(data.cards.values, f, now)
        val rows = all.take(Deck.MAX_ROWS).map { c ->
            val r = Deck.row(c, now); DeckRowUi(r.word, r.ipa, r.mean, r.note, r.retention, CardMath.mastery(c.go("srs")), r.thumb, r.image)
        }
        val (total, mastered) = Deck.headline(data.cards.values); val (tp, fr, lv) = opts()
        ui = DeckUi(false, total, mastered, rows.size, all.size, rows, f, tp, fr, lv, pickerKind, editing, shared, shareLink, minOf(300, data.cards.size), notice, noticeOk, noticeN)
    }
    private fun setNote(k: L10nKey?, ok: Boolean = true, n: Int? = null) { notice = k; noticeOk = ok; noticeN = n }

    fun query(q: String) { f = f.copy(q = q); publish() }
    fun picker(kind: String?) { pickerKind = kind; publish() }
    fun pick(kind: String, v: String) { f = when (kind) { "topic" -> f.copy(topic = v); "from" -> f.copy(from = v); else -> f.copy(m = v) }; pickerKind = null; publish() }

    // ---- edit / relearn / delete ----
    fun edit(word: String?) {
        editing = word?.let { w -> data.cards[CardMath.keyOf(w)]?.let { c -> EditCardUi(c.gs("word"), c.gs("vi"), c.gs("ipa"), c.gs("ex"), c.gs("note"), c.gs("image"), c.gs("emoji").ifEmpty { "📘" }) } }
        publish()
    }
    private fun store() = WordBook.Store(data.cards, data.doc.deleted)
    private suspend fun commit(s: WordBook.Store) {
        val changed = s.cards.filter { (k, v) -> data.cards[k] != v }; val removed = data.cards.keys.filter { it !in s.cards }
        env.write(changed = changed, removed = removed, deleted = s.deleted); data = env.load()
    }
    fun save(vi: String, ipa: String, ex: String, note: String, image: String) {
        val e = editing ?: return
        viewModelScope.launch { commit(WordBook.edit(store(), e.word, vi, ipa, ex, note, image, env.now())); editing = null; setNote(L10nKey.dictCardUpdated); publish() }
    }
    fun relearn() { val e = editing ?: return; viewModelScope.launch { commit(WordBook.reset(store(), e.word, env.now())); editing = null; publish() } }
    fun delete(ask: Boolean) { editing = editing?.let { EditCardUi(it.word, it.vi, it.ipa, it.ex, it.note, it.image, it.emoji, ask) }; publish() }
    fun deleteNow() { val e = editing ?: return; viewModelScope.launch { commit(WordBook.remove(store(), e.word, env.now())); editing = null; publish() } }

    // ---- share link ----
    fun share() {
        if (data.cards.isEmpty()) { setNote(L10nKey.vocabNoWordsToShare, false); publish(); return }
        val shownCards = Deck.rows(data.cards.values, f, env.now()).take(300)
        shareLink = "https://lexkite.com/app/#/deck?share=" + Deck.pack(deckName, shownCards); publish()
    }
    fun closeShare() { shareLink = null; publish() }
    fun linkCopied() { setNote(L10nKey.vocabLinkCopied); publish() }

    // ---- files ----
    fun backupText(): String = DeckIo.backupJson(data.doc, env.now())
    fun ankiTextOut(): String = DeckIo.ankiText(Deck.rows(data.cards.values, f, env.now()), deckName)
    /** A JSON backup chosen by the learner: cards merged in, stats.days max, game if larger. */
    fun importJson(text: String) {
        viewModelScope.launch {
            val j = runCatching { kotlinx.serialization.json.Json.parseToJsonElement(text) as? JsonObject }.getOrNull()
            val r = j?.let { Deck.importBackup(it, data.cards, data.stats ?: JsonObject(emptyMap()), (data.game as? JsonObject) ?: JsonObject(emptyMap())) }
            if (r == null) setNote(L10nKey.vocabInvalidFile, false)
            else { env.write(changed = r.cards.filter { (k, v) -> data.cards[k] != v }, stats = r.stats, game = r.game); data = env.load(); setNote(L10nKey.vocabImportedCards, true, r.count) }
            publish()
        }
    }
    fun importAnki(text: String, fileName: String) {
        viewModelScope.launch {
            val r = runCatching { DeckIo.importText(text, fileName, data.cards, env.now()) }.getOrNull()
            if (r == null || (r.cards.isEmpty() && r.duplicates == 0)) setNote(L10nKey.vocabInvalidFile, false)
            else { env.write(changed = r.cards); data = env.load(); setNote(L10nKey.vocabImportedCards, true, r.cards.size) }
            publish()
        }
    }

    // ---- shared deck preview ----
    fun addShared(done: () -> Unit) {
        val s = shared ?: return; if (s.adding) return
        shared = SharedUi(s.name, s.words, s.fresh, false, adding = true); publish()
        viewModelScope.launch {
            var st = store(); val now = env.now(); var n = 0
            for (w in sharedWords) if (!st.cards.containsKey(CardMath.keyOf(w.gs("word")))) { st = WordBook.add(st, w.with("topic" to "shared"), null, now); n++ }
            commit(st); shared = SharedUi(s.name, s.words, 0, false, added = n); publish(); done()
        }
    }

    private var flow: AnkiFlow? = null
    fun actions(open: (String) -> Unit, exit: () -> Unit, platform: DeckPlatform, image: StudyImage?): DeckActions {
        val anki = flow ?: AnkiFlow(env, viewModelScope, platform, { data.cards.values.toList() }, { Deck.rows(data.cards.values, f, env.now()) }, { data = env.load(); publish() }).also { flow = it }
        return build(open, exit, platform, image, anki)
    }
    private fun build(open: (String) -> Unit, exit: () -> Unit, platform: DeckPlatform, image: StudyImage?, anki: AnkiFlow): DeckActions = DeckActions(
        query = ::query, picker = ::picker, pick = ::pick, edit = ::edit, save = ::save, relearn = ::relearn, delete = ::delete, deleteNow = ::deleteNow,
        sayWord = { env.sayWord(it, if (this::data.isInitialized) data.accent else "en-US") }, share = ::share, closeShare = ::closeShare,
        copyLink = { platform.copy(it); linkCopied() }, sendLink = { platform.send(it) },
        exportJson = { platform.saveFile("lexkite-cards.json", "application/json", backupText()) }, importJson = { platform.pickFile { text, _ -> importJson(text) } },
        exportAnki = { platform.saveFile("lexkite-anki.txt", "text/plain", ankiTextOut()) }, importAnki = { platform.pickFile { text, name -> importAnki(text, name) } },
        addShared = { addShared { open("deck") } }, open = open, image = image, exit = exit, anki = anki,
    )

    class Factory(private val env: VocabEnv, private val query: Map<String, String>, private val deckName: String) : ViewModelProvider.Factory {
        @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = DeckVm(env, query, deckName) as T
    }
}

/** What only the Activity can do: clipboard, system share sheet, file save / open (the Storage Access Framework). */
interface DeckPlatform {
    fun copy(text: String)
    fun send(text: String)
    fun saveFile(name: String, mime: String, content: String)
    fun pickFile(onText: (text: String, name: String) -> Unit)
    /** Binary files (.apkg): save through the system file dialog / read a chosen file. */
    fun saveBytes(name: String, mime: String, bytes: ByteArray) {}
    fun pickBytes(onBytes: (bytes: ByteArray, name: String) -> Unit) {}
}
