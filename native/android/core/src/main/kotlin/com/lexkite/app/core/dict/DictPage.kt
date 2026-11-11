package com.lexkite.app.core.dict

import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.WordBook
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.gt
import com.lexkite.app.core.vocab.jo
import com.lexkite.app.core.vocab.s
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject

/** #/dict/<word>: what the page shows, derived from a [Dict] entry. Port of the data side of web/js/dict-page.js (HTML stays in the UI). */
object DictPage {
    val SAMPLES = listOf("resilient", "mitigate", "phenomenon", "detrimental", "ubiquitous", "paradigm")
    /** Vietnamese part-of-speech names <-> English keys (labels in the Vietnamese UI). */
    val VIP = linkedMapOf("danh từ" to "noun", "động từ" to "verb", "tính từ" to "adjective", "trạng từ" to "adverb", "giới từ" to "preposition", "liên từ" to "conjunction", "đại từ" to "pronoun", "thán từ" to "interjection", "từ hạn định" to "determiner", "viết tắt" to "abbreviation", "cụm từ" to "phrase")
    fun posLabel(pos: String, uiLang: String): String = if (uiLang == "vi") VIP.entries.firstOrNull { it.value == pos }?.key ?: pos else pos

    class Def(val def: String, val ex: String)
    /** One part-of-speech block: Vietnamese meanings (only when meanings are Vietnamese) + English definitions (<= 4) with examples that differ from the main example. */
    class PosBlock(val pos: String, val vi: List<String>, val defs: List<Def>)
    class Model(
        val word: String, val meaning: String, val def: String, val example: String, val exampleTranslation: JsonObject?, val bilingual: List<JsonObject>,
        val posBlocks: List<PosBlock>, val extraMeanings: List<JsonObject>, val saved: Boolean, val from: String, val verb: String?, val hasUsage: Boolean,
    )

    /** `card` = the saved flashcard of this word (or null); `verbOf`/`hasUsage` come from the verb and usage tables. */
    fun model(e: JsonObject, card: JsonObject?, meanLang: String, verbOf: (JsonObject) -> String?, hasUsage: (String) -> Boolean): Model {
        val ex0 = e["ex"].let { if (it is JsonArray) it.firstOrNull() else it }.s().trim()
        fun sameEx(x: String?) = (x ?: "").trim().lowercase() == ex0.lowercase()
        val sentences = e.ga("sentences").mapNotNull { it as? JsonObject }
        val exS = if (ex0.isNotEmpty()) sentences.firstOrNull { sameEx(it.gs("en")) } else null
        val sents = sentences.filter { it !== exS }
        fun noDup(d: JsonObject) = d.gt("ex") && !sameEx(d.gs("ex"))
        fun key(p: String): String { val l = p.lowercase(); return VIP[l] ?: l }
        class G(val pos: String) { var vi: List<String> = emptyList(); val defs = ArrayList<JsonObject>() }
        val groups = LinkedHashMap<String, G>()
        fun grp(p: String) = groups.getOrPut(p) { G(p) }
        if (meanLang == "vi") e.ga("senses").forEach { x -> val o = x as JsonObject; grp(key(o.gs("pos"))).vi = o.ga("terms").map { it.s() } }
        e.ga("oxford").forEach { m -> val o = m as JsonObject; grp(key(o.gs("pos"))).defs.addAll(o.ga("defs").map { it as JsonObject }) }
        if (e.ga("oxford").isEmpty()) e.ga("meanings").forEach { m -> val o = m as JsonObject; grp(key(o.gs("pos"))).defs.addAll(o.ga("defs").take(3).map { it as JsonObject }) }
        val blocks = groups.values.filter { it.vi.isNotEmpty() || it.defs.isNotEmpty() }.map { g -> PosBlock(g.pos, g.vi, g.defs.take(4).map { d -> Def(d.gs("def"), if (noDup(d)) d.gs("ex") else "") }) }
        return Model(e.gs("word"), e.gs("vi"), e.gs("def"), ex0, exS, sents, blocks, if (e.ga("oxford").isNotEmpty()) e.ga("meanings").map { it as JsonObject } else emptyList(),
            card != null, e.gs("from"), verbOf(e), hasUsage(e.gs("word").lowercase()))
    }
    /** The chip next to a translated example: machine-translated Oxford example vs a Tatoeba sentence. */
    fun sourceOfSentence(s: JsonObject) = if (s.gt("auto")) "auto" else "tatoeba"

    /** Store 'recent': newest first, no repeats, max 8. */
    fun recent(list: List<String>, word: String): List<String> = (listOf(word) + list.filter { it != word }).take(8)
    /** The "lookups" reward is given once per word per day. */
    fun rewardOnce(seen: MutableSet<String>, now: Long, word: String): Boolean = seen.add(CardMath.todayKey(now) + ":" + word)

    /** "Lưu vào flashcard" with an optional own sentence (context title "Ghi chú của bạn"). */
    fun save(st: WordBook.Store, e: JsonObject, text: String, vi: String, now: Long): WordBook.Store =
        WordBook.add(st, e, if (text.isNotEmpty()) jo("text" to text, "vi" to vi, "source" to "", "title" to "Ghi chú của bạn") else null, now)

    /** Phrases containing the word: library phrases (<= 10) + the learner's own phrase cards (<= 10, not already listed). */
    class Phrases(val lib: List<JsonObject>, val mine: List<JsonObject>)
    fun phrases(e: JsonObject, lexPhrases: List<JsonObject>?, indexValues: Collection<JsonObject>, cards: Collection<JsonObject>): Phrases {
        val re = Regex("\\b" + Regex.escape(e.gs("word")) + "\\w*", RegexOption.IGNORE_CASE)
        val ws = Regex("\\s")
        val lx2 = (lexPhrases ?: emptyList()).filter { re.containsMatchIn(it.gs("word")) }
        val lib = (lx2 + indexValues.filter { ws.containsMatchIn(it.gs("word")) && re.containsMatchIn(it.gs("word")) && lx2.none { l -> l.gs("word") == it.gs("word") } }).take(10)
        val mine = cards.filter { ws.containsMatchIn(it.gs("word")) && re.containsMatchIn(it.gs("word")) && lib.none { l -> l.gs("word") == it.gs("word") } }.take(10)
        return Phrases(lib, mine)
    }

    /** "Related words" block: adjectives/nouns that go with the word, antonyms, near-synonyms (Datamuse; dictionaryapi when it is down). */
    class Related(val jjb: List<String>, val jja: List<String>, val ant: List<String>, val near: List<String>, val down: Boolean)
    suspend fun related(dict: Dict, e: JsonObject, retry: Boolean = false): Related {
        val w = Dict.jsEncode(e.gs("word"))
        suspend fun get(q: String) = dict.datamuse("words?$q", retry)
        val pos = e.gs("pos"); val isNoun = Regex("^n|danh").containsMatchIn(pos); val isAdj = Regex("^adj|tính").containsMatchIn(pos)
        val stop = setOf("more", "most", "less", "least", "very", "other", "such", "same", "own", "many", "much", "few", "several", "certain", "various", "error", "orthogonal")
        var ml: List<JsonObject>? = get("ml=$w&max=16&md=f")?.map { it as JsonObject }
        var jjb0: List<JsonObject> = emptyList(); var jja: List<JsonObject> = emptyList(); var ant: List<JsonObject> = emptyList()
        val down = ml == null
        if (down) {
            val d = dict.dictionaryApi(e.gs("word")) as? JsonArray
            val ms = (d ?: JsonArray(emptyList())).flatMap { (it as JsonObject).ga("meanings") }.map { it as JsonObject }
            fun pick(k: String) = ms.flatMap { m -> m.ga(k).map { it.s() } + m.ga("definitions").flatMap { x -> (x as JsonObject).ga(k).map { it.s() } } }.distinct()
            ant = pick("antonyms").take(6).map { jo("word" to it) }
            ml = pick("synonyms").map { jo("word" to it, "tags" to listOf("f:9")) }
        } else {
            if (isNoun || !isAdj) jjb0 = (get("rel_jjb=$w&max=14") ?: emptyList()).map { it as JsonObject }
            if (isAdj) jja = (get("rel_jja=$w&max=10") ?: emptyList()).map { it as JsonObject }
            ant = (get("rel_ant=$w&max=6") ?: emptyList()).map { it as JsonObject }
        }
        val jjb = if (isAdj) emptyList() else jjb0.filter { !stop.contains(it.gs("word")) && (it["score"]?.let { s -> com.lexkite.app.core.sync.Js.num(s) } ?: 0.0) > 300 }.take(10)
        val syn = e.ga("syn").map { it.s() }.toSet(); val word = e.gs("word")
        val stemE = word.take(maxOf(5, word.length - 4))
        val near = (ml ?: emptyList()).filter { x ->
            val xw = x.gs("word")
            !syn.contains(xw) && !Regex("\\s").containsMatchIn(xw) && !xw.startsWith(stemE) && !word.startsWith(xw.take(6)) &&
                (x.ga("tags").map { it.s() }.firstOrNull { it.startsWith("f:") } ?: "f:0").substring(2).toDoubleOrNull().let { (it ?: 0.0) >= 1 }
        }.take(8)
        return Related(jjb.map { it.gs("word") }, jja.map { it.gs("word") }, ant.map { it.gs("word") }, near.map { it.gs("word") }, down)
    }
}
