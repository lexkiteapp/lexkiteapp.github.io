package com.lexkite.app.core.vocab

import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.WebCards
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import java.io.ByteArrayOutputStream
import java.util.Base64
import java.util.zip.Deflater
import java.util.zip.Inflater
import kotlin.math.floor
import kotlin.math.max

/** #/deck "Sổ từ của bạn": filters, sorting and rows. Port of web/js/app.js routes.deck (and the share link pack/unpack). */
object Deck {
    /** Filter state of the four controls: `q` text, `topic` ('' | topic id | 'mine' | 'deck:<name>'), `from` ('' | origin | 'forget'), `m` ('' | '0' | '12' | '1' | '2' | '3'). */
    data class Filter(val q: String = "", val topic: String = "", val from: String = "", val m: String = "")
    val LEVELS = listOf("", "0", "12", "1", "2", "3")

    /** Initial filter from the hash query: `from` as given, `m` only when it is one of the options. */
    fun fromQuery(query: Map<String, String>): Filter = Filter(from = query["from"] ?: "", m = query["m"]?.takeIf { it in LEVELS } ?: "")

    /** Cards shown: all filters AND-ed; newest added first, or most forgettable first for `forget`. The screen shows the first [MAX_ROWS]. */
    fun rows(cards: Collection<JsonObject>, f: Filter, now: Long, meanOf: (JsonObject) -> String = CardMath::meanOf): List<JsonObject> {
        val q = f.q.jsTrim().lowercase()
        val forgetSet = CardMath.forgetting(cards, now).map { it.gs("word") }.toSet()
        val out = cards.filter { c ->
            val s = c.go("srs")
            (q.isEmpty() || c.gs("word").contains(q) || c.gs("vi").lowercase().contains(q)) &&
                (f.topic.isEmpty() || (if (f.topic.startsWith("deck:")) c.gs("deck") == f.topic.substring(5) else c.gs("topic") == f.topic)) &&
                (f.m.isEmpty() || (if (f.m == "12") (s != null && (s.gn("reps") > 0 || s.gt("last")) && CardMath.mastery(s) < 3) else CardMath.mastery(s) == f.m.toIntOrNull())) &&
                (f.from.isEmpty() || (if (f.from == "forget") forgetSet.contains(c.gs("word")) else CardMath.origin(c) == f.from))
        }
        return if (f.from == "forget") out.sortedBy { CardMath.retention(it.go("srs"), now) ?: 0.0 } else out.sortedByDescending { it.gn("added") }
    }
    const val MAX_ROWS = 400
    /** Header numbers: words in the deck, words mastered (interval >= 21 days). */
    fun headline(cards: Collection<JsonObject>) = cards.size to cards.count { CardMath.mastery(it.go("srs")) == 3 }
    /** Own-deck names for the topic filter (sorted). */
    fun deckNames(cards: Collection<JsonObject>): List<String> = cards.map { it.gs("deck") }.filter { it.isNotEmpty() }.distinct().sorted()

    /** What one row displays. `thumb` = image URL when set else the emoji; `note` = first saved sentence (pin) or the definition, cut to 110. */
    class Row(val word: String, val ipa: String, val mean: String, val note: String, val retention: Int?, val thumb: String, val image: Boolean)
    fun row(c: JsonObject, now: Long, meanOf: (JsonObject) -> String = CardMath::meanOf): Row {
        val ctx = c.ga("contexts").firstOrNull() as? JsonObject
        val note = if (ctx != null) { val t = ctx.gs("text"); "📌 “" + t.take(110) + (if (t.length > 110) "…" else "") + "”" } else c.gs("def").take(110)
        val r = CardMath.retention(c.go("srs"), now)
        val img = c.gs("image")
        return Row(c.gs("word"), c.gs("ipa"), meanOf(c), note, r?.let { floor(it * 100 + 0.5).toInt() }, if (img.isNotEmpty()) img else c.gs("emoji"), img.isNotEmpty())
    }

    // ---- share link (deck?share=<deflate-raw base64url>) ----
    class Shared(val name: String, val words: List<JsonObject>)
    fun pack(name: String, cards: List<JsonObject>): String {
        val data = jo("v" to 1, "n" to name.take(80), "w" to cards.take(300).map { c -> listOf(c.gs("word"), c.gs("ipa"), c.gs("pos"), c.gs("vi"), c.gs("def"), c.gs("ex").take(160)) })
        val raw = Js.stringify(data).toByteArray(Charsets.UTF_8)
        val d = Deflater(Deflater.DEFAULT_COMPRESSION, true); d.setInput(raw); d.finish()
        val bos = ByteArrayOutputStream(); val buf = ByteArray(4096)
        while (!d.finished()) bos.write(buf, 0, d.deflate(buf))
        d.end()
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bos.toByteArray())
    }
    /** null = invalid link ("Link bộ thẻ không hợp lệ"). */
    fun unpack(code: String): Shared? = runCatching {
        val inf = Inflater(true); inf.setInput(Base64.getUrlDecoder().decode(code))
        val bos = ByteArrayOutputStream(); val buf = ByteArray(4096)
        while (!inf.finished()) { val n = inf.inflate(buf); if (n == 0 && (inf.needsInput() || inf.needsDictionary())) break; bos.write(buf, 0, n) }
        inf.end()
        val d = Json.parseToJsonElement(bos.toString(Charsets.UTF_8.name())).jsonObject
        val w = d["w"]!!.jsonArray
        Shared(d.gs("n").ifEmpty { "Lexkite" }, w.filterIsInstance<JsonArray>().filter { Js.truthy(it.getOrNull(0)) }.map { r ->
            fun g(i: Int) = r.getOrNull(i).s()
            jo("word" to g(0).take(60), "ipa" to g(1), "pos" to g(2), "vi" to g(3), "def" to g(4), "ex" to g(5)) })
    }.getOrNull()

    /** importData: merge a backup `{cards, stats, game}` into the stores (cards overwrite by key, stats.days take the max, game only if its xp is larger). */
    class Imported(val cards: Map<String, JsonObject>, val stats: JsonObject, val game: JsonObject, val count: Int)
    fun importBackup(data: JsonObject, cards: Map<String, JsonObject>, stats: JsonObject, game: JsonObject): Imported? {
        val dc = data.go("cards") ?: return null
        val merged = LinkedHashMap(cards); for ((k, v) in dc) (v as? JsonObject)?.let { merged[k] = it }
        var st = stats
        data.go("stats")?.go("days")?.let { dd -> val days = LinkedHashMap(st.go("days") ?: JsonObject(emptyMap())); for ((k, v) in dd) days[k] = je(max(days[k]?.let { Js.num(it) } ?: 0.0, Js.num(v))); st = st.cp("days" to JsonObject(days)) }
        val g = data.go("game"); val ng = if (g != null && g.gn("xp") > game.gn("xp")) g else game
        return Imported(merged, st, ng, dc.size)
    }
}

/** The word book: add / edit / reset / delete. Port of Cards._add + app.js addWord / editCard + ctx.js. Cards are `Map<key, card>`; `deleted` = tombstones for sync. */
object WordBook {
    class Store(val cards: Map<String, JsonObject>, val deleted: Map<String, JsonElement>)

    // ctx.js
    private val CTRL = Regex("[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u2028-\\u202e\\u2066-\\u2069\\ufeff]")
    fun ctxText(s: String?): String {
        if (s == null) return ""
        var t = WS_RUN.replace(CTRL.replace(s.replace(Regex("<[^>]*>"), " ").replace(Regex("[<>]"), " "), " "), " ").jsTrim()
        if (t.isEmpty() || Regex("[^\\s@<>]+@[^\\s@<>]+\\.[a-z]{2,}", RegexOption.IGNORE_CASE).containsMatchIn(t) ||
            Regex("\\+?\\d[\\d\\s().-]{7,}\\d").findAll(t).any { it.value.replace(Regex("\\D"), "").length >= 9 }) return ""
        if (t.length > 200) { t = t.substring(0, 200); if (t.isNotEmpty() && Character.isHighSurrogate(t.last())) t = t.dropLast(1); t = t.jsTrim() }
        return t
    }
    fun ctxHost(s: String?): String {
        if (s == null) return ""
        val m = Regex("^(?:[a-z][a-z0-9+.-]*://)?(?:[^/?#@]*@)?([^/?#:]+)(?=$|[/?#]|:\\d)").find(s.jsTrim().lowercase())
        val h = m?.groupValues?.get(1)?.replace(Regex("^www\\."), "")?.replace(Regex("\\.\\z"), "") ?: ""
        return if (h.length <= 64 && Regex("^[a-z0-9-]+(\\.[a-z0-9-]+)*$").matches(h) && !Regex("^\\d+(\\.\\d+){3}$").matches(h)) h else ""
    }

    private val FILL = listOf("ipa", "ipaUS", "pos", "vi", "def", "ex", "image", "audio", "level")
    /** addWord(entry, context): merge into an existing card (fill empty fields, new unique context first, <= 5, ctx/src) or create it; clears the tombstone. `context` = `{text, source, title, vi?}`. */
    fun add(st: Store, entry: JsonObject, context: JsonObject?, now: Long): Store {
        val tl = entry.gs("tl")
        val key = (if (tl.isNotEmpty() && tl != "en") "$tl:" else "") + CardMath.keyOf(entry.gs("word"))
        var card = st.cards[key]
        if (card == null) card = WebCards.make(entry, now)
        else {
            var o: JsonObject = card
            if (!o.gt("image") && entry.gt("image")) o = o.cp("imageCredit" to (if (entry.gt("imageCredit")) entry["imageCredit"] else JsonNull))
            for (k in FILL) if (!o.gt(k) && entry.gt(k)) o = o.cp(k to entry[k])
            if (o.ga("sentences").isEmpty() && entry["sentences"] is JsonArray) o = o.cp("sentences" to entry.ga("sentences").take(2))
            card = o
        }
        if (context != null && context.gt("text") && card!!.ga("contexts").none { (it as? JsonObject).gs("text") == context.gs("text") }) {
            var o = card.cp("contexts" to (listOf(context.cp("at" to now)) + card.ga("contexts")).take(5))
            val cx = ctxText(context.gs("text")); val h = if (cx.isNotEmpty()) ctxHost(context.gs("source")) else ""
            if (cx.isNotEmpty()) o = o.cp("ctx" to cx, "src" to (if (h.isNotEmpty()) h else Absent))
            card = o
        }
        val cards = LinkedHashMap(st.cards); cards[key] = card!!.cp("mod" to now)
        return Store(cards, st.deleted.filterKeys { it != key })
    }
    /** Cards.remove: delete + tombstone (tombstones older than 90 days are dropped). */
    fun remove(st: Store, word: String, now: Long): Store {
        val key = CardMath.keyOf(word)
        val del = LinkedHashMap(st.deleted); del[key] = JsonPrimitive(now)
        val cut = now - 90 * CardMath.DAY; for (k in del.keys.toList()) if (Js.num(del[k]) < cut) del.remove(k)
        return Store(st.cards.filterKeys { it != key }, del)
    }
    /** editCard "Lưu": trims vi/ipa/ex/note/image. */
    fun edit(st: Store, word: String, vi: String, ipa: String, ex: String, note: String, image: String, now: Long): Store {
        val key = CardMath.keyOf(word); val c = st.cards[key] ?: return st
        val cards = LinkedHashMap(st.cards); cards[key] = c.cp("vi" to vi.jsTrim(), "ipa" to ipa.jsTrim(), "ex" to ex.jsTrim(), "note" to note.jsTrim(), "image" to image.jsTrim(), "mod" to now)
        return Store(cards, st.deleted)
    }
    /** editCard "Học lại": back to a new card. */
    fun reset(st: Store, word: String, now: Long): Store {
        val key = CardMath.keyOf(word); val c = st.cards[key] ?: return st
        val cards = LinkedHashMap(st.cards); cards[key] = c.cp("srs" to WebCards.newState(now), "mod" to now)
        return Store(cards, st.deleted)
    }
}

/** #/library "Thư viện từ vựng" and #/topic/<id>. Port of app.js routes.library / routes.topic / personalCollections. */
object Library {
    val LEVEL_FILTERS = listOf("", "A1", "A2", "B1", "B2", "C1", "C2")
    /** Valid CEFR filter from `?lv=` (A1..C2) else "". */
    fun levelOf(raw: String?): String = if (raw != null && Regex("^[ABC][12]$").matches(raw)) raw else ""
    /** First tab: `?g=`, else "mine" with >= 10 cards, else by exam (toeic -> toeic, toefl -> exam, general -> core, otherwise topics). */
    fun defaultTab(g: String?, cardCount: Int, exam: String): String = if (!g.isNullOrEmpty()) g else if (cardCount >= 10) "mine" else mapOf("toeic" to "toeic", "toefl" to "exam", "general" to "core")[exam] ?: "topics"

    class MineSet(val key: String, val count: Int, val due: Int, val mastered: Int)
    /** One block: a group's sets (`topics`, cut to 6 when [viewAll] = total) or the "my library" block (`collections`). `groupId` = "mine" for the personal blocks. */
    class Section(val groupId: String, val topics: List<Topic>, val viewAll: Int?, val collections: List<MineSet> = emptyList(), val mineSets: Boolean = false)
    class Page(val tab: String, val sections: List<Section>, val emptyEmoji: String?)

    fun personalCollections(cards: kotlin.collections.Collection<JsonObject>, now: Long): List<MineSet> {
        val groups = LinkedHashMap<String, MutableList<JsonObject>>(); cards.forEach { groups.getOrPut(CardMath.origin(it)) { ArrayList() }.add(it) }
        val end = CardMath.endOfToday(now)
        return CardMath.ORIGINS.filter { groups.containsKey(it) }.map { k ->
            val l = groups.getValue(k)
            MineSet(k, l.size, l.count { c -> val s = CardMath.srsOf(c); (s.gn("reps") > 0 || s.gt("last")) && s.gn("due") <= end }, l.count { CardMath.mastery(it.go("srs")) == 3 })
        }
    }
    private fun hasLv(tp: Topic, lv: String): Boolean {
        if (lv.isEmpty()) return true
        val n = tp.words.count { it.gs("level") == lv }
        return n >= 5 || (n >= tp.words.size * 0.3 && n > 0)
    }
    /** draw(): `tab` = all | <group id> | mine; `lv` CEFR filter; `q` text. nameOf/descOf = the localized texts the search runs on. */
    fun page(tab: String, lv: String, q0: String, cards: Map<String, JsonObject>, words: WebWords, now: Long, nameOf: (Topic) -> String = { it.name }, descOf: (Topic) -> String = { it.desc }): Page {
        val q = q0.jsTrim().lowercase()
        fun inDeck(w: JsonObject) = cards.containsKey(w.gs("word").lowercase())
        fun match(t: Topic) = hasLv(t, lv) && (q.isEmpty() || nameOf(t).lowercase().contains(q) || descOf(t).lowercase().contains(q) || t.words.any { it.gs("word").lowercase() == q })
        val groupIds = if (tab == "all") words.groups.map { it.id } else if (tab == "mine") listOf("mine") else words.groups.filter { it.id == tab }.map { it.id }
        val out = ArrayList<Section>()
        for (gid in groupIds) {
            val ts = words.topics.filter { t -> (if (gid == "mine") t.words.any { inDeck(it) } else t.group == gid) && match(t) }
            val coll = if (gid == "mine") personalCollections(cards.values, now) else emptyList()
            if (ts.isEmpty()) { if (gid == "mine" && coll.isNotEmpty()) out.add(Section("mine", emptyList(), null, coll)); continue }
            if (coll.isNotEmpty()) { out.add(Section("mine", emptyList(), null, coll)); out.add(Section("mine", ts, null, mineSets = true)); continue }
            val cut = tab == "all" && q.isEmpty() && ts.size > 6
            out.add(Section(gid, if (cut) ts.take(6) else ts, if (cut) ts.size else null))
        }
        val empty = if (out.isNotEmpty()) null else if (tab == "mine") "📌" else "🔍"
        return Page(tab, out, empty)
    }
    /** Ring numbers of a set card: saved words / total. */
    fun progress(tp: Topic, cards: Map<String, JsonObject>): Pair<Int, Int> = tp.words.count { cards.containsKey(it.gs("word").lowercase()) } to tp.words.size
    /** Levels listed on a set card ("A2 · B1 …"). */
    fun levelsOf(tp: Topic): List<String> = tp.words.map { it.gs("level") }.filter { it.isNotEmpty() }.distinct().sorted()

    /** #/topic/<id> header + word list. `null` = unknown id (show the library). */
    class TopicPage(val topic: Topic, val levels: List<String>, val lv: String, val added: Int, val missing: List<JsonObject>, val words: List<Pair<JsonObject, Boolean>>) {
        val allAdded get() = missing.isEmpty()
        val backTab get() = topic.group
        fun links(): List<String> = listOf("#/practice/learn?src=topic:${topic.id}", "#/practice/match?src=topic:${topic.id}", "#/practice/test?src=topic:${topic.id}", "#/handsfree/${topic.id}")
    }
    fun topicPage(id: String, lvQuery: String?, cards: Map<String, JsonObject>, words: WebWords): TopicPage? {
        val tp = words.topic(id) ?: return null
        val levels = levelsOf(tp)
        val lv = if (levels.size > 1 && lvQuery in levels) lvQuery!! else ""
        return topicPageAt(tp, lv, cards)
    }
    /** Same page after a level-tab click or an add. */
    fun topicPageAt(tp: Topic, lv: String, cards: Map<String, JsonObject>): TopicPage {
        fun inDeck(w: JsonObject) = cards.containsKey(w.gs("word").lowercase())
        val missing = tp.words.filter { !inDeck(it) }
        return TopicPage(tp, levelsOf(tp), lv, tp.words.size - missing.size, missing, tp.words.filter { lv.isEmpty() || it.gs("level") == lv }.map { it to inDeck(it) })
    }
    /** "Thêm tất cả": add every missing word silently (topic kept). */
    fun addAll(st: WordBook.Store, page: TopicPage, now: Long): WordBook.Store { var s = st; for (w in page.missing) s = WordBook.add(s, w, null, now); return s }
}
