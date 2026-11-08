package com.lexkite.app.core.dict

import com.lexkite.app.core.sync.Http
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.vocab.Absent
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.cp
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.gt
import com.lexkite.app.core.vocab.je
import com.lexkite.app.core.vocab.jo
import com.lexkite.app.core.vocab.s
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.net.URLEncoder
import java.security.MessageDigest
import java.text.Normalizer

/** HTTP JSON seam of the dictionary: null on any failure / non-2xx / timeout (web fetchJSON). Tests plug a fake that serves the four sources. */
fun interface DictNet { suspend fun json(url: String, ms: Int): JsonElement? }

/** Production [DictNet] over the app's [Http]. */
class HttpDictNet(private val http: Http) : DictNet {
    override suspend fun json(url: String, ms: Int): JsonElement? = withTimeoutOrNull(ms.toLong()) {
        runCatching { val r = http.send(Http.Req("GET", url)); if (r.ok) Json.parseToJsonElement(r.text) else null }.getOrNull()
    }
}

/** Saved lookups (web Store 'dc2:<word>', 'dcIndex'); the app plugs its key-value store. */
interface DictStore {
    suspend fun get(key: String): JsonElement?
    suspend fun put(key: String, value: JsonElement)
    suspend fun remove(key: String)
}
class MemDictStore : DictStore {
    private val m = HashMap<String, JsonElement>()
    override suspend fun get(key: String) = m[key]
    override suspend fun put(key: String, value: JsonElement) { m[key] = value }
    override suspend fun remove(key: String) { m.remove(key) }
}

/** Optional on-device translator (Apple Translation / ML Kit): null = unavailable, fall back to the web services. */
fun interface DeviceTranslator { suspend fun translate(text: String, from: String, to: String): String? }

/** Dictionary settings (`viTypo` = web VI_TYPO from verbs.json: `VerbData.viTypo`): language of the meanings (`vi` or other = English definitions only), learner language, API base, vocabulary lookups. */
class DictCfg(val meanLang: String = "vi", val learnLang: String = "vi", val apiBase: String = "https://lexkite.com", val tx: Tx = Tx.RAW, val rare: Map<String, Set<String>> = emptyMap(), val viTypo: Map<String, String> = emptyMap())

private class Sense(val pos: String, val terms: List<String>)
private class DefItem(val def: String, val ex: String)
private class DefGroup(val pos: String, val defs: List<DefItem>)
private class GG(val vi: String, val senses: List<Sense>, val defs: List<DefGroup>, val syn: List<String>, val base: String)
private class FD(val ipa: String, val ipaUS: String, val audio: String, val audioUS: String, val meanings: List<DefGroup>, val syn: List<String>)
private class WkEntry(val acc: String, val pos: List<String>, val ipa: String)
private class WK(val ipa: String, val ipaUS: String, val entries: List<WkEntry>, val audioUK: String, val audioUS: String)
private class Img(val src: String, val link: String, val credit: String)

/**
 * Port of web/js/dictionary.js: the local lexicon entry wins; Google dictionary (Oxford data), dictionaryapi.dev, Wiktionary IPA/audio,
 * Tatoeba sentences and the image proxy fill the rest. `quick()` shows the local entry at once; `lookup()` is the full card.
 */
class Dict(private val net: DictNet, private val lex: Lex?, private val index: Map<String, JsonObject> = emptyMap(), private val cfg: DictCfg = DictCfg(),
           private val store: DictStore = MemDictStore(), private val clock: () -> Long = System::currentTimeMillis, private val device: DeviceTranslator? = null) {
    private val cache = HashMap<String, JsonObject>()
    private fun fixVi(s: String): String = fixVi(s, cfg.viTypo)
    private fun fixDeep(e: JsonElement): JsonElement = fixDeep(e, cfg.viTypo)
    private val quickCache = HashMap<String, JsonObject>()
    private val wikiPages = HashMap<String, Boolean>()
    private var dmOff = 0L
    private val wantVi get() = cfg.meanLang == "vi"
    private val DL get() = cfg.apiBase + "/api/dictlookup"
    private fun enc(s: String) = jsEncode(s)

    // ---------- text helpers ----------
    companion object {
        const val DV = 7
        const val FRESH = 14L * 86_400_000L
        private val VI_DIA = Regex("[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]", RegexOption.IGNORE_CASE)
        private val VI_POS = mapOf("danh từ" to "noun", "động từ" to "verb", "tính từ" to "adjective", "trạng từ" to "adverb", "giới từ" to "preposition", "liên từ" to "conjunction", "đại từ" to "pronoun", "thán từ" to "interjection", "từ hạn định" to "determiner", "viết tắt" to "abbreviation", "cụm từ" to "phrase", "tiền tố" to "prefix", "hậu tố" to "suffix")
        private val POS_EN = mapOf("Noun" to "noun", "Verb" to "verb", "Adjective" to "adjective", "Adverb" to "adverb", "Proper noun" to "noun", "Preposition" to "preposition", "Conjunction" to "conjunction", "Pronoun" to "pronoun", "Interjection" to "interjection", "n" to "noun", "v" to "verb", "adj" to "adjective", "adv" to "adverb")
        private val POS_SHORT = mapOf("noun" to "n", "verb" to "v", "adjective" to "adj", "adverb" to "adv", "preposition" to "prep", "conjunction" to "conj", "pronoun" to "pron", "interjection" to "excl", "danh từ" to "n", "động từ" to "v", "tính từ" to "adj", "trạng từ" to "adv", "giới từ" to "prep", "liên từ" to "conj", "đại từ" to "pron", "thán từ" to "excl")
        private val POS_FULL = mapOf("n" to "noun", "v" to "verb", "adj" to "adjective", "adv" to "adverb", "danh từ" to "noun", "động từ" to "verb", "tính từ" to "adjective", "trạng từ" to "adverb")
        private val TATO = mapOf("vi" to "vie", "es" to "spa", "pt" to "por", "fr" to "fra", "de" to "deu", "id" to "ind", "th" to "tha", "zh" to "cmn", "ja" to "jpn", "ko" to "kor", "hi" to "hin", "ar" to "ara", "ru" to "rus", "tr" to "tur")
        private val LOCAL_F = listOf("ipa", "pos", "vi", "def", "ex", "col", "syn", "level", "emoji", "topic")

        /** Dict.normWord: NFC, trim, lower-case, ’ -> ', drop ×÷, keep a-z, Latin letters (À-ɏ), space, ' and -, collapse spaces. */
        fun normWord(raw: String?): String = Regex("\\s+").replace(Normalizer.normalize(raw ?: "", Normalizer.Form.NFC).trim().lowercase().replace("’", "'").replace(Regex("[×÷]"), "").replace(Regex("[^a-z\\u00c0-\\u024f\\s'-]"), ""), " ").trim()

        /** Fix known hỏi/ngã slips in the Google Vietnamese data (word by word, case kept). */
        fun fixVi(s0: String, table: Map<String, String>): String {
            var s = Normalizer.normalize(s0, Normalizer.Form.NFC).let { x -> Regex("[a-zA-ZÀ-ỹđĐ]+").replace(x) { m ->
                val w = m.value; val r = table[w.lowercase()]
                if (r == null) w else if (w[0] == w[0].uppercaseChar() && w[0] != w[0].lowercaseChar()) r[0].uppercaseChar() + r.substring(1) else r } }
            s = Regex("\\bcọng chung\\b", setOf(RegexOption.IGNORE_CASE)).replace(s, "cộng chung")
            return s
        }
        fun fixDeep(e: JsonElement, table: Map<String, String>): JsonElement = when (e) {
            is JsonPrimitive -> if (e.isString) JsonPrimitive(fixVi(e.content, table)) else e
            is JsonArray -> JsonArray(e.map { fixDeep(it, table) })
            is JsonObject -> JsonObject(e.mapValues { fixDeep(it.value, table) })
        }
        /** encodeURIComponent */
        fun jsEncode(s: String): String { val sb = StringBuilder(); for (b in s.toByteArray(Charsets.UTF_8)) { val c = b.toInt() and 0xff; if (c.toChar().isLetterOrDigit() && c < 128 || c.toChar() in "-_.!~*'()") sb.append(c.toChar()) else sb.append('%').append("%02X".format(c)) }; return sb.toString() }
        private fun md5(s: String) = MessageDigest.getInstance("MD5").digest(s.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
        fun commonsUrl(f: String): String { val n = f.trim().replace(' ', '_'); val name = n[0].uppercaseChar() + n.substring(1); val h = md5(name); return "https://upload.wikimedia.org/wikipedia/commons/${h[0]}/${h.substring(0, 2)}/${jsEncode(name)}" }
        private fun posKey(p: String?): String = (p ?: "").lowercase()
        private fun lc(s: JsonElement?) = s.s().lowercase()
        private fun posEn(p: String) = VI_POS[Normalizer.normalize(p, Normalizer.Form.NFC).lowercase().trim()] ?: p
        private val STAR1 = Regex("^\\*\\s")
        private fun isPhrase(w: String?) = Regex("\\s").containsMatchIn((w ?: "").trim())
    }

    // ---------- language ----------
    private fun sentLang() = if (wantVi) "vi" else cfg.learnLang.ifEmpty { "en" }
    private fun sentsOk(list: List<JsonElement>, l: String): List<JsonElement> = list.filter { x -> val s = x as? JsonObject; s != null && (s.gs("l").ifEmpty { "vi" }) == l && (l == "vi" || !VI_DIA.containsMatchIn(s.gs("vi"))) }
    private fun noViStr(x: JsonElement?): JsonElement = if (x is JsonPrimitive && x.isString && VI_DIA.containsMatchIn(x.content)) JsonPrimitive("") else x ?: JsonNull
    private fun cleanDefs(ms: List<JsonElement>): JsonArray = JsonArray(ms.map { m ->
        val o = m as JsonObject
        o.cp("pos" to posEn(o.gs("pos")), "defs" to o.ga("defs").map { it as JsonObject }.filter { !VI_DIA.containsMatchIn(it.gs("def")) }.map { d -> if (d.gt("ex") && VI_DIA.containsMatchIn(d.gs("ex"))) d.cp("ex" to "") else d })
    })
    /** Dict.forLang: for learners whose meaning language is not Vietnamese drop Vietnamese data and rename parts of speech to English. */
    fun forLang(e: JsonObject?): JsonObject? {
        if (e == null || wantVi || e["found"] == JsonPrimitive(false)) return e
        return e.cp("pos" to posEn(e.gs("pos")), "oxford" to cleanDefs(e.ga("oxford")), "meanings" to cleanDefs(e.ga("meanings")), "senses" to JsonArray(emptyList()), "ex" to noViStr(e["ex"]), "def" to noViStr(e["def"]),
            "syn" to e.ga("syn").filter { !VI_DIA.containsMatchIn(it.s()) }, "col" to e.ga("col").filter { !VI_DIA.containsMatchIn(it.s()) }, "sentences" to sentsOk(e.ga("sentences"), sentLang()))
    }

    // ---------- sources ----------
    private suspend fun fetchJson(url: String, ms: Int = 8000): JsonElement? = net.json(url, ms)
    private fun gtxUrl(sl: String, tl: String, extra: String = "") = "$DL?src=gtx&sl=${enc(sl)}&tl=${enc(tl)}$extra"
    private fun dapiUrl(word: String) = "$DL?src=dapi&w=${enc(word)}"
    private fun gtxDict() = if (wantVi) gtxUrl("en", "vi", "&hl=vi&dj=1") else gtxUrl("en", "en", "&hl=en&dj=1")
    fun dapiURL(word: String) = dapiUrl(word)

    private fun suspicious(term: String): Boolean {
        val ws = term.lowercase().split(Regex("\\s+")); if (ws.size < 2) return false
        return ws.withIndex().any { (i, w) -> val c = cfg.rare[w]; c != null && !c.contains(ws.getOrNull(i - 1)) && !c.contains(ws.getOrNull(i + 1)) }
    }
    private fun cleanTerms(terms: List<String>): List<String> {
        val all = terms.map { fixVi(it) }.distinct()
        return all.filter { !suspicious(it) }.ifEmpty { all }
    }
    private suspend fun fromGoogle(word: String): GG? {
        val d = fetchJson("${gtxDict()}&dt=t&dt=bd&dt=md&dt=ex&dt=ss&q=${enc(word)}", 4000) as? JsonObject ?: return null
        val vi = fixVi(d.ga("sentences").joinToString("") { (it as JsonObject).gs("trans") }.trim())
        val senses = d.ga("dict").map { x -> val o = x as JsonObject; Sense(o.gs("pos"), cleanTerms(o.ga("terms").map { it.s() }).take(6)) }
        val exById = HashMap<String, String>()
        d.go("examples").ga("example").forEach { e -> val o = e as JsonObject; exById[o.gs("definition_id")] = o.gs("text").replace(Regex("</?b>"), "") }
        fun cleanDef(s: String) = s.trim().replace(Regex("^[0-9a-z]\\.\\s+", RegexOption.IGNORE_CASE), "")
        val defs = d.ga("definitions").map { x ->
            val o = x as JsonObject
            val list = ArrayList<DefItem>()
            for (en in o.ga("entry")) {
                val e = en as JsonObject
                if (e.gt("gloss")) list.add(DefItem(cleanDef(e.gs("gloss")), e.gs("example").ifEmpty { exById[e.gs("definition_id")] ?: "" }))
                for (sb in e.ga("subentries")) { val sub = sb as JsonObject; if (sub.gt("gloss")) list.add(DefItem(cleanDef(sub.gs("gloss")), sub.gs("example").ifEmpty { exById[sub.gs("definition_id")] ?: "" })) }
            }
            DefGroup(o.gs("pos"), list.filter { it.def.isNotEmpty() && it.def.length > 3 }.take(4))
        }
        val syn = d.ga("synsets").flatMap { s -> (s as JsonObject).ga("entry").flatMap { e -> (e as JsonObject).ga("synonym").map { it.s() } } }.distinct().take(8)
        val base = d.ga("dict").firstOrNull().let { (it as? JsonObject).gs("base_form") }.ifEmpty { d.ga("definitions").firstOrNull().let { (it as? JsonObject).gs("base_form") } }
        return GG(vi, senses, defs, syn, base)
    }
    private suspend fun fromFreeDict(word: String): FD? {
        if (isPhrase(word)) return null
        val data = fetchJson(dapiUrl(word), 3500) as? JsonArray ?: return null
        if (data.isEmpty()) return null
        var ipa = ""; var ipaUS = ""; var audio = ""; var audioUS = ""
        val meanings = ArrayList<DefGroup>(); val syn = ArrayList<String>()
        for (en in data) {
            val entry = en as JsonObject
            for (pe in entry.ga("phonetics")) {
                val p = pe as JsonObject; val a = p.gs("audio")
                if (a.endsWith("-uk.mp3") && audio.isEmpty()) { audio = a; if (p.gt("text")) ipa = p.gs("text") }
                else if (a.endsWith("-us.mp3") && audioUS.isEmpty()) { audioUS = a; if (p.gt("text")) ipaUS = p.gs("text") }
            }
            if (ipa.isEmpty()) ipa = entry.gs("phonetic").ifEmpty { entry.ga("phonetics").map { (it as JsonObject).gs("text") }.firstOrNull { it.isNotEmpty() } ?: "" }
            for (me in entry.ga("meanings")) {
                val m = me as JsonObject
                meanings.add(DefGroup(m.gs("partOfSpeech"), m.ga("definitions").take(3).map { d -> val o = d as JsonObject; DefItem(o.gs("definition"), o.gs("example")) }))
                m.ga("synonyms").forEach { syn.add(it.s()) }
            }
        }
        if (audio.isEmpty()) audio = audioUS
        return FD(ipa, ipaUS, audio, audioUS, meanings, syn.distinct().take(6))
    }
    private suspend fun dm(q: String, ms: Int = 4000, retry: Boolean = false): JsonElement? {
        if (!retry && clock() < dmOff) return null
        val r = fetchJson("https://api.datamuse.com/$q&o=${enc(cfg.apiBase)}", ms)
        dmOff = if (r == null) clock() + 300_000 else 0
        return r
    }
    /** Raw dictionaryapi.dev answer (fallback source of the related-words block). */
    suspend fun dictionaryApi(word: String): JsonElement? = fetchJson(dapiUrl(word), 3500)
    /** Datamuse query (`words?...`) used by the "related words" block. */
    suspend fun datamuse(q: String, retry: Boolean = false): JsonArray? = dm(q, retry = retry) as? JsonArray

    private suspend fun wikiHas(word: String): Boolean {
        if (!isPhrase(word)) return true
        wikiPages[word]?.let { return it }
        val d = fetchJson("https://en.wiktionary.org/w/api.php?action=query&titles=${enc(word)}&format=json&formatversion=2&origin=*", 4000) as? JsonObject
        val p = d.go("query").ga("pages").firstOrNull() as? JsonObject ?: return false
        val has = !p.gt("missing") && !p.gt("invalid"); wikiPages[word] = has; return has
    }
    private suspend fun rareDefs(word: String): FD? {
        fun strip(h: String) = Regex("\\s+").replace(h.replace(Regex("<[^>]+>"), "").replace("&nbsp;", " ").replace("&amp;", "&"), " ").trim()
        val wk = if (wikiHas(word)) fetchJson("https://en.wiktionary.org/api/rest_v1/page/definition/${enc(word)}", 3500) as? JsonObject else null
        val en = wk?.get("en") as? JsonArray
        if (en != null && en.isNotEmpty()) {
            val ms = en.take(4).map { m -> val o = m as JsonObject; DefGroup(POS_EN[o.gs("partOfSpeech")] ?: o.gs("partOfSpeech").lowercase(), o.ga("definitions").map { d -> val x = d as JsonObject; DefItem(strip(x.gs("definition")), strip(x.ga("examples").firstOrNull().s())) }.filter { it.def.isNotEmpty() }.take(3)) }.filter { it.defs.isNotEmpty() }
            if (ms.isNotEmpty()) return FD("", "", "", "", ms, emptyList())
        }
        val wn = dm("words?sp=${enc(word)}&md=dp&max=1", 3000) as? JsonArray
        val row = wn?.firstOrNull() as? JsonObject
        if (row != null && row.gs("word") == word.lowercase() && row.ga("defs").isNotEmpty()) {
            val by = LinkedHashMap<String, MutableList<DefItem>>()
            row.ga("defs").forEach { x -> val parts = x.s().split("\t"); val p2 = parts[0]; by.getOrPut(POS_EN[p2] ?: p2) { ArrayList() }.add(DefItem(parts.getOrElse(1) { "" }, "")) }
            return FD("", "", "", "", by.map { (pos, defs) -> DefGroup(pos, defs.take(3)) }, emptyList())
        }
        return null
    }

    private suspend fun wiktIPA(word: String): WK? {
        if (!wikiHas(word)) return null
        val d = fetchJson("https://en.wiktionary.org/w/api.php?action=parse&page=${enc(word)}&prop=wikitext&format=json&formatversion=2&origin=*", 6000) as? JsonObject
        val text = d.go("parse").gs("wikitext").ifEmpty { return null }
        val en = Regex("\n==(?!=)").split(text).firstOrNull { it.startsWith("English==") } ?: text
        val posn = Regex("^(noun|verb|adjective|adverb|preposition|conjunction|pronoun|interjection|determiner)s?$", RegexOption.IGNORE_CASE)
        fun fix(x: String) = x.replace("ɹ", "r").replace(".", "").replace(Regex("[\\u032F\\u0306\\u031A\\u0361]"), "")
        val entries = ArrayList<WkEntry>()
        fun acc(x: String) = if (Regex("^(UK|RP|Received Pronunciation|British|England)$", RegexOption.IGNORE_CASE).matches(x)) "UK" else if (Regex("^(US|GA|General American|America)$", RegexOption.IGNORE_CASE).matches(x)) "US" else ""
        fun posOf(x0: String): String { val x = x0.trim().lowercase(); return if (posn.matches(x)) x.replace(Regex("s$"), "") else "" }
        val tokRe = Regex("\\{\\{(?:a|q|qualifier|i)\\|(?:en\\|)?([^}]+)\\}\\}"); val accRe = Regex("\\|a=([^|}]*)"); val ipaRe = Regex("\\{\\{IPA\\|en\\|([^}|]+)")
        val otherRe = Regex("^(AU|NZ|CA|Canada|Australia|New Zealand|Scotland|Scottish|Ireland|Irish|India|Indian|South Africa|Northern England|cot-caught|.*dialects.*)$", RegexOption.IGNORE_CASE)
        for (blk in Regex("\n(?====Etymology)").split(en)) {
            val blockPos = Regex("\n====?(Noun|Verb|Adjective|Adverb|Preposition|Conjunction|Pronoun|Interjection|Determiner)====?").findAll(blk).map { it.groupValues[1].lowercase() }.toList()
            var parent: List<String>? = null
            for (line in blk.split("\n")) {
                val toks = tokRe.findAll(line).flatMap { it.groupValues[1].split("|") }.toList() + accRe.findAll(line).flatMap { it.groupValues[1].split(Regex("[,;]")) }.toList()
                val m = ipaRe.find(line)
                if (m == null) { if (STAR1.containsMatchIn(line) && toks.isNotEmpty()) parent = toks else if (STAR1.containsMatchIn(line)) parent = null; continue }
                if (STAR1.containsMatchIn(line)) parent = null
                val all = toks + (if (line.startsWith("**") && parent != null) parent else emptyList())
                val ipa0 = m.groupValues[1].trim().replace(Regex("<[^>]*>"), "")
                if (!ipa0.startsWith("/")) continue
                val accs = all.map { acc(it) }.filter { it.isNotEmpty() }.distinct()
                val otherAcc = all.any { otherRe.matches(it.trim()) }
                val a = if (accs.isNotEmpty()) accs.joinToString(",") else if (otherAcc) "X" else ""
                var pos = all.map { posOf(it) }.filter { it.isNotEmpty() }
                if (pos.isEmpty() && line.startsWith("**") && parent != null && !parent.any { acc(it).isNotEmpty() || posOf(it).isNotEmpty() }) pos = listOf("other")
                if (pos.isEmpty()) pos = blockPos
                entries.add(WkEntry(a, pos, fix(ipa0)))
            }
        }
        val aud = mutableMapOf("UK" to "", "US" to "")
        for (m in Regex("\\{\\{audio\\|en\\|([^|}]+\\.(?:ogg|oga|mp3|wav|opus))([^}]*)\\}\\}", RegexOption.IGNORE_CASE).findAll(en)) {
            val f = m.groupValues[1].trim(); val a = (Regex("a=([^|}]*)").find(m.groupValues[2])?.groupValues?.get(1) ?: "") + " " + f
            val ac = if (Regex("\\b(UK|RP|British|England|London)\\b|en-uk|\\(eng\\)", RegexOption.IGNORE_CASE).containsMatchIn(a)) "UK" else if (Regex("\\b(US|GA|General American|America)\\b|en-us", RegexOption.IGNORE_CASE).containsMatchIn(a)) "US" else ""
            if (ac.isNotEmpty() && aud.getValue(ac).isEmpty()) aud[ac] = commonsUrl(f)
        }
        if (entries.isEmpty()) return null
        fun pick(a: String) = (entries.firstOrNull { it.acc.split(",").contains(a) && !it.pos.contains("other") } ?: entries.firstOrNull { it.acc.isEmpty() && !it.pos.contains("other") } ?: entries[0]).ipa
        return WK(pick("UK"), pick("US"), entries, aud.getValue("UK"), aud.getValue("US"))
    }

    /** Tatoeba bilingual sentences (>= 5 words, closest to 70 characters first); `l` = language of the translation. */
    suspend fun sentences(word: String, limit: Int = 4, l: String = sentLang()): List<JsonObject> {
        val tl = TATO[l]
        val d = fetchJson("https://api.tatoeba.org/unstable/sentences?lang=eng&q=${enc(word)}${if (tl != null) "&trans:lang=$tl" else ""}&sort=relevance&limit=20&showtrans=${if (tl != null) "matching" else "none"}", 3500) as? JsonObject ?: return emptyList()
        val data = d["data"] as? JsonArray ?: return emptyList()
        return data.map { x ->
            val o = x as JsonObject
            val vi = if (tl != null) o.ga("translations").flatMap { if (it is JsonArray) it.toList() else listOf(it) }.firstOrNull { (it as? JsonObject)?.gs("lang") == tl }.let { (it as? JsonObject).gs("text") } else ""
            jo("en" to o.gs("text"), "vi" to vi, "l" to l)
        }.filter { (it.gt("vi") || tl == null) && it.gs("en").split(" ").size >= 5 }.sortedBy { Math.abs(it.gs("en").length - 70) }.take(limit)
    }
    private suspend fun relang(e: JsonObject, word: String, examples: Boolean): JsonObject {
        if (!e.gt("found") || !examples) return e
        val l = sentLang(); val list = e.ga("sentences"); val ok = sentsOk(list, l)
        if (ok.size == list.size && (ok.isNotEmpty() || e.gs("_sl") == l)) return e
        val fresh: List<JsonElement> = if (ok.isNotEmpty()) ok else runCatching { sentences(word, 4, l) }.getOrDefault(emptyList())
        return e.cp("sentences" to fresh, "_sl" to l)
    }

    /** Image proxy result: image, "no image" (cached by the server), or retry later (null). */
    private class ImgRes(val img: Img?, val retry: Boolean)
    private suspend fun freeImage(word: String): ImgRes {
        val r = fetchJson("${cfg.apiBase}/api/img?w=${enc(word.lowercase())}", 12000) as? JsonObject
        if (r == null || r.gt("retry")) return ImgRes(null, true)
        if (r.gt("none") || !Regex("^https://").containsMatchIn(r.gs("src"))) return ImgRes(null, false)
        val via = r.gs("via").ifEmpty { "Openverse" }
        val credit = cfg.tx.t("“{title}” – {creator} · {license} · qua Openverse", mapOf("title" to r.gs("title").ifEmpty { word }, "creator" to r.gs("creator").ifEmpty { cfg.tx.t("không rõ tác giả", null) }, "license" to r.gs("license"))).replace("Openverse", via)
        return ImgRes(Img(r.gs("src"), r.gs("link"), credit), false)
    }
    suspend fun myMemory(text: String, tl: String = "vi", sl: String = "en"): String {
        val d = fetchJson("https://api.mymemory.translated.net/get?q=${enc(text)}&langpair=${enc(sl)}|${enc(tl)}", 8000) as? JsonObject
        val t = d.go("responseData").gs("translatedText")
        if (t.isEmpty() || Regex("MYMEMORY WARNING|INVALID", RegexOption.IGNORE_CASE).containsMatchIn(t)) return ""
        return if (tl == "vi") fixVi(t) else t.trim()
    }
    /** Translate a sentence to Vietnamese (device translator -> Google -> MyMemory). */
    suspend fun translateVi(text: String): String {
        device?.translate(text, "en", "vi")?.takeIf { it.isNotBlank() }?.let { return fixVi(it).trim() }
        val d = fetchJson("${gtxUrl("en", "vi", "&hl=vi&dj=1")}&dt=t&q=${enc(text)}", 8000) as? JsonObject
        val t = d?.let { fixVi(it.ga("sentences").joinToString("") { s -> (s as JsonObject).gs("trans") }.trim()) }
        return t?.ifEmpty { null } ?: myMemory(text, "vi", "en")
    }
    suspend fun translateTo(text: String, tl: String, sl: String = "en"): String {
        if (text.isEmpty() || tl.isEmpty() || tl == sl) return ""
        if (tl == "vi" && sl == "en") return translateVi(text)
        device?.translate(text, sl, tl)?.takeIf { it.isNotBlank() }?.let { return it.trim() }
        val d = fetchJson("${gtxUrl(sl, tl)}&dj=1&dt=t&q=${enc(text)}", 8000) as? JsonObject
        var r = d?.ga("sentences")?.joinToString("") { (it as JsonObject).gs("trans") }?.trim() ?: ""
        if (r.isEmpty()) r = myMemory(text, tl, sl)
        return r
    }

    // ---------- building the card ----------
    private fun posSense(p: String?) = POS_FULL[posKey(p)]
    private fun senseKey(p: String) = posSense(p) ?: posKey(p)
    private fun moreOf(local: JsonObject?): List<JsonObject> = local.ga("more").mapNotNull { it as? JsonObject }.filter { it.gt("pos") && (it.gt("vi") || it.gt("def")) }
    private fun fixSenses(senses: List<Sense>, local: JsonObject?): List<Sense> {
        if (local == null || !local.gt("vi") || !local.gt("pos")) return senses
        val lp = posSense(local.gs("pos")) ?: return senses
        val mine = local.gs("vi").split(Regex("[,;]\\s*")).map { it.replace(Regex("\\(.*?\\)"), "").trim() }.filter { it.isNotEmpty() }
        val out = senses.map { Sense(it.pos, it.terms.toList()) }.toMutableList()
        val hitIdx = out.indexOfFirst { senseKey(it.pos) == lp }
        if (hitIdx < 0) return listOf(Sense(lp, mine)) + out
        val hit = out[hitIdx]
        val agree = hit.terms.any { term -> mine.any { m -> term.contains(m) || m.contains(term) } }
        out[hitIdx] = Sense(hit.pos, if (hit.terms.size <= 1 && !agree) mine else (mine + hit.terms).distinct().take(6))
        return out
    }
    private fun jsonDefs(g: List<DefGroup>) = g.map { jo("pos" to it.pos, "defs" to it.defs.map { d -> jo("def" to d.def, "ex" to d.ex) }) }

    private fun build(word: String, local: JsonObject?, gg0: GG?, fd: FD?, wk: WK?, img: Img?, sents: List<JsonObject>?): JsonObject {
        var gg = gg0
        if (gg != null && local != null) gg = GG(gg.vi, fixSenses(gg.senses, local), gg.defs, gg.syn, gg.base)
        if (gg != null) for (m in moreOf(local)) {
            val lp = posSense(m.gs("pos")); val had = gg!!.senses.any { senseKey(it.pos) == lp }; val s2 = fixSenses(gg.senses, m)
            gg = GG(gg.vi, if (had || s2.firstOrNull()?.pos != lp) s2 else s2.drop(1) + s2[0], gg.defs, gg.syn, gg.base)
        }
        val gFirst = gg?.defs?.firstOrNull()?.defs?.firstOrNull()
        val fFirst = fd?.meanings?.firstOrNull()
        val anyEx = gg?.defs?.flatMap { it.defs }?.firstOrNull { it.ex.isNotEmpty() } ?: fd?.meanings?.flatMap { it.defs }?.firstOrNull { it.ex.isNotEmpty() }
        val senseVi = if (gg != null && gg.senses.isNotEmpty()) gg.senses.joinToString("; ") { it.terms.take(3).joinToString(", ") } else ""
        val posRaw = Normalizer.normalize(gg?.senses?.firstOrNull()?.pos?.ifEmpty { null } ?: gg?.defs?.firstOrNull()?.pos?.ifEmpty { null } ?: fFirst?.pos ?: "", Normalizer.Form.NFC).lowercase()
        val g = gg
        val oxford: MutableList<DefGroup> = (g?.defs ?: emptyList()).toMutableList()
        if (fd != null && oxford.isNotEmpty() && g != null) {
            fun key(p: String): String { val q = Normalizer.normalize(p, Normalizer.Form.NFC).lowercase(); return POS_SHORT[q] ?: q }
            val have = oxford.map { key(it.pos) }.toMutableSet(); val want = g.senses.map { key(it.pos) }.toSet()
            for (m in fd.meanings) { val k = key(m.pos); val defs = m.defs.filter { it.def.isNotEmpty() }; if (want.contains(k) && !have.contains(k) && defs.isNotEmpty()) { have.add(k); oxford.add(DefGroup(m.pos, defs.take(3))) } }
        }
        fun merge(lpRaw: String, cur: DefItem, localDef: String, atEnd: Boolean) {
            val lp = lpRaw
            val i = oxford.indexOfFirst { (POS_FULL[posKey(it.pos)] ?: it.pos) == lp }
            if (i >= 0) oxford[i] = DefGroup(oxford[i].pos, (listOf(cur) + oxford[i].defs.filter { it.def != localDef && !localDef.contains(it.def) }).take(3))
            else if (atEnd) oxford.add(DefGroup(lp, listOf(cur))) else oxford.add(0, DefGroup(lp, listOf(cur)))
        }
        if (local != null && local.gt("def")) merge(POS_FULL[posKey(local.gs("pos"))] ?: local.gs("pos").ifEmpty { "noun" }, DefItem(local.gs("def"), local.gs("ex")), local.gs("def"), false)
        for (m in moreOf(local)) { if (!m.gt("def")) continue; merge(POS_FULL[m.gs("pos")] ?: m.gs("pos"), DefItem(m.gs("def"), m.gs("ex")), m.gs("def"), true) }
        val lipa = local.gs("ipa")
        val vi = local.gs("vi").ifEmpty { (if (g != null && g.vi.isNotEmpty() && g.vi.lowercase() != word) g.vi else "").ifEmpty { senseVi } }
        return jo(
            "word" to word, "found" to true,
            "ipa" to lipa.ifEmpty { ipaFor(wk, local.gs("pos").ifEmpty { posRaw }, "UK").ifEmpty { fd?.ipa ?: "" } },
            "ipaUS" to (if (lipa.isNotEmpty()) local.gs("ipaUS") else ipaFor(wk, posRaw, "US").ifEmpty { fd?.ipaUS ?: "" }),
            "audio" to (fd?.audio?.ifEmpty { null } ?: wk?.audioUK ?: ""), "audioUS" to (fd?.audioUS?.ifEmpty { null } ?: wk?.audioUS ?: ""),
            "pos" to local.gs("pos").ifEmpty { POS_SHORT[posRaw] ?: posRaw }, "vi" to vi,
            "def" to local.gs("def").ifEmpty { gFirst?.def ?: "" }.ifEmpty { fFirst?.defs?.firstOrNull()?.def ?: "" },
            "ex" to local.gs("ex").ifEmpty { anyEx?.ex ?: "" }.ifEmpty { sents?.firstOrNull()?.gs("en") ?: "" },
            "col" to (if (local.gt("col")) local!!["col"] else JsonArray(emptyList())),
            "syn" to (if (local.gt("syn") && local.ga("syn").isNotEmpty()) local!!["syn"] else if (g != null && g.syn.isNotEmpty()) g.syn else fd?.syn ?: emptyList<String>()),
            "level" to local.gs("level"), "emoji" to local.gs("emoji"), "topic" to local.gs("topic").ifEmpty { "mine" },
            "image" to (img?.src ?: ""), "imageCredit" to (if (img != null) jo("text" to img.credit, "link" to img.link) else null),
            "senses" to (g?.senses ?: emptyList()).map { jo("pos" to it.pos, "terms" to it.terms) }, "oxford" to jsonDefs(oxford),
            "meanings" to jsonDefs(fd?.meanings ?: emptyList()), "sentences" to (sents ?: emptyList<JsonObject>()),
        )
    }
    private fun ipaFor(wk: WK?, posRaw: String, acc: String): String {
        if (wk == null) return ""
        val pos = POS_FULL[posRaw] ?: posRaw
        var e = wk.entries.filter { !it.pos.contains("other") && it.acc != "X" }; if (e.isEmpty()) e = wk.entries
        var c = e.filter { pos.isNotEmpty() && it.pos.contains(pos) }; if (c.isEmpty()) c = e.filter { it.pos.isEmpty() }; if (c.isEmpty()) c = e
        if (c.any { it.pos.size != 1 } && Regex("^(noun|verb|adjective)$").matches(pos)) {
            fun ini(x: WkEntry) = x.ipa.startsWith("/ˈ")
            val s = c.filter { if (pos == "verb") !ini(it) && it.ipa.contains("ˈ") else ini(it) }
            if (s.isNotEmpty()) c = s
        }
        return (c.firstOrNull { it.acc.split(",").contains(acc) } ?: c.firstOrNull { it.acc.isEmpty() } ?: c[0]).ipa
    }

    // ---------- lookup ----------
    private class Local(val entry: JsonObject?, val from: String)
    private suspend fun localOf(word: String): Local {
        if (lex != null) { val r = lex.get(word) ?: return Local(null, ""); return Local(r.entry, if (r.via == "exact" || r.via == "fold") "" else r.from.ifEmpty { word }) }
        return Local(index[word], "")
    }
    private fun overlay(e: JsonObject?, local: JsonObject?): JsonObject? {
        if (e == null || local == null) return e
        var o: JsonObject = e
        for (f in LOCAL_F) { val v = local[f]; if (v != null && v !is JsonNull && !(v is JsonPrimitive && v.isString && v.content.isEmpty()) && !(v is JsonArray && v.isEmpty())) o = o.cp(f to v) }
        return o.cp("ipaUS" to if (local.gt("ipaUS")) local["ipaUS"] else if (local.gt("ipa")) "" else o["ipaUS"])
    }
    private suspend fun persistGet(w: String): JsonObject? {
        val x = store.get("dc2:$w") as? JsonObject ?: return null
        return if (x["_v"].s() == DV.toString() && (x.gs("_ml").ifEmpty { "vi" }) == (if (wantVi) "vi" else "en")) fixDeep(x) as JsonObject else null
    }
    private suspend fun persistSet(w: String, e: JsonObject) {
        runCatching {
            store.put("dc2:$w", e.cp("_t" to clock(), "_v" to DV, "_ml" to if (wantVi) "vi" else "en"))
            val idx = ((store.get("dcIndex") as? JsonArray)?.map { it.s() } ?: emptyList()).filter { it != w }.toMutableList(); idx.add(w)
            while (idx.size > 150) store.remove("dc2:" + idx.removeAt(0))
            store.put("dcIndex", je(idx))
        }
    }

    /** Fast lookup: a lexicon word shows at once (partial, no network); otherwise Google + Wiktionary. Null = unknown. */
    suspend fun quick(raw: String?): JsonObject? {
        val word = normWord(raw); if (word.isEmpty()) return null
        cache[word]?.let { return forLang(it) }
        quickCache[word]?.let { return forLang(it) }
        val loc = localOf(word); val local = loc.entry
        val saved = persistGet(word)
        if (saved != null && clock() - tOf(saved) < FRESH) { val s2 = overlay(saved, local)!!; cache[word] = s2; return forLang(s2) }
        if (local != null) { val e = build(if (loc.from.isNotEmpty()) local.gs("word") else word, local, null, null, null, null, emptyList()).cp("partial" to true, "from" to loc.from); quickCache[word] = e; return forLang(e) }
        val (gg, wk) = coroutineScope { val a = async { fromGoogle(word) }; val b = async { wiktIPA(word) }; a.await() to b.await() }
        val hasGoogle = gg != null && (gg.senses.isNotEmpty() || gg.defs.isNotEmpty())
        if (!hasGoogle) return null
        val e = build(word, null, gg, null, wk, null, emptyList()).cp("partial" to true)
        quickCache[word] = e
        return forLang(e)
    }

    private class Fetched(val gg: GG?, val fd: FD?, val wk: WK?, val img: ImgRes?, val sents: List<JsonObject>)
    private fun tOf(o: JsonObject): Double = Js.num(o["_t"]).let { if (it.isNaN()) 0.0 else it }

    /** Full lookup: adds audio, image, bilingual sentences, extra definitions. `{word, found:false, vi}` when nothing is known. */
    suspend fun lookup(raw: String?, image: Boolean = true, examples: Boolean = true): JsonObject? {
        val word = normWord(raw); if (word.isEmpty()) return null
        val hit0 = cache[word]
        if (hit0 != null && !hit0.gt("partial") && (hit0.gt("image") || !image || hit0.gt("_imgTry"))) { val h2 = relang(hit0, word, examples); if (h2 !== hit0) cache[word] = h2; return forLang(h2) }
        val loc = localOf(word); val local = loc.entry; val from = loc.from
        val saved = overlay(persistGet(word), local)
        if (saved != null && clock() - tOf(saved) < FRESH) {
            var sv: JsonObject = saved
            if (image && !sv.gt("image") && Regex("^n|danh").containsMatchIn(sv.gs("pos").ifEmpty { "n" }) && clock() - sv.gn("_imgTry") > 6 * 3600_000L) {
                val im = runCatching { freeImage(word) }.getOrNull()
                sv = sv.cp("_imgTry" to (if (im == null || im.retry) 0L else clock()))
                if (im?.img != null) sv = sv.cp("image" to im.img.src, "imageCredit" to jo("text" to im.img.credit, "link" to im.img.link))
                persistSet(word, sv)
            }
            val s2 = relang(sv, word, examples); cache[word] = s2; return forLang(s2)
        }
        val f = coroutineScope {
            val a = async { fromGoogle(word) }; val b = async { fromFreeDict(word) }; val c = async { wiktIPA(word) }
            val d = async { if (image) freeImage(word) else null }; val e = async { if (examples) sentences(word) else emptyList() }
            Fetched(a.await(), b.await(), c.await(), d.await(), e.await())
        }
        val gg = f.gg; var fd = f.fd; var wk = f.wk
        var img: Img? = f.img?.img; var imgRetry = f.img?.retry == true      // JS: null = retry later, false = no image
        val base = gg?.base?.takeIf { it.isNotEmpty() && it != word } ?: ""
        if (image && img == null && base.isNotEmpty()) { val ib = runCatching { freeImage(base) }.getOrNull(); if (ib?.img != null || imgRetry) { img = ib?.img; imgRetry = ib == null || ib.retry } }
        if (base.isNotEmpty() && (fd == null || (wk == null && !(local != null && local.gt("ipa"))))) {
            val fd0 = fd; val wk0 = wk
            val r = coroutineScope { val a = async { fd0 ?: fromFreeDict(base) }; val b = async { wk0 ?: wiktIPA(base) }; a.await() to b.await() }
            fd = r.first; wk = r.second
        }
        val hasGoogle = gg != null && (gg.senses.isNotEmpty() || gg.defs.isNotEmpty())
        if (hasGoogle && fd == null && gg!!.defs.isEmpty() && !(local != null && local.gt("def"))) { runCatching { rareDefs(word) }.getOrNull()?.let { fd = FD("", "", "", "", it.meanings, it.syn) } }
        if (local == null && fd == null && !hasGoogle) {
            val rd = rareDefs(word)
            if (rd == null) return jo("word" to word, "found" to false, "vi" to (gg?.vi?.takeIf { it != word && it.isNotEmpty() } ?: myMemory(word)))
            fd = if (wk != null) FD(wk.ipa, wk.ipaUS, rd.audio, rd.audioUS, rd.meanings, rd.syn) else rd
        }
        val sl = sentLang(); val sents = f.sents.toMutableList()
        if (examples && sents.size < 2 && gg != null && sl != "en") {
            val exs = gg.defs.flatMap { it.defs }.map { it.ex }.filter { it.isNotEmpty() }.filter { x -> !VI_DIA.containsMatchIn(x) && sents.none { it.gs("en") == x } }.take(3 - sents.size)
            if (exs.isNotEmpty()) {
                val tr = runCatching { if (sl == "vi") translateVi(exs.joinToString("\n")) else translateTo(exs.joinToString("\n"), sl) }.getOrDefault("").split("\n")
                exs.forEachIndexed { i, en -> val v = tr.getOrElse(i) { "" }.trim(); if (v.isNotEmpty() && (sl == "vi" || !VI_DIA.containsMatchIn(v))) sents.add(jo("en" to en.replaceFirstChar { it.uppercaseChar() }, "vi" to v.replaceFirstChar { it.uppercaseChar() }, "auto" to true, "l" to sl)) }
            }
        }
        var entry = build(if (from.isNotEmpty()) local!!.gs("word") else word, local, gg, fd, wk, img, sents)
        if (from.isNotEmpty()) entry = entry.cp("from" to from)
        if (examples) entry = entry.cp("_sl" to sl)
        if (entry.gt("image") && !Regex("^n|danh").containsMatchIn(entry.gs("pos"))) entry = entry.cp("image" to "", "imageCredit" to null)
        if (image && !entry.gt("image")) entry = entry.cp("_imgTry" to (if (imgRetry) 0L else clock()))
        cache[word] = entry
        if (image && examples) persistSet(word, entry.cp("meanings" to (if (entry.ga("oxford").isNotEmpty()) JsonArray(emptyList()) else JsonArray(entry.ga("meanings").take(2)))))
        return forLang(entry)
    }

    /** Fallback IPA for compounds missing from the dictionary (fair + trade): split, look up both halves, join with stress marks. */
    suspend fun ipaGuess(word0: String): JsonObject? {
        val word = word0.lowercase().trim()
        val full = runCatching { lookup(word, image = false, examples = false) }.getOrNull()
        if (full != null && full.gt("ipa")) return jo("ipa" to full.gs("ipa"), "ipaUS" to full.gs("ipaUS"), "guess" to false)
        if (!Regex("^[a-z]{6,}$").matches(word)) return null
        fun strip(x: String) = x.replace(Regex("^/|/$"), "").trim()
        val cuts = (3..word.length - 3).sortedByDescending { minOf(it, word.length - it) }
        for (i in cuts.take(4)) {
            val a = word.substring(0, i); val b = word.substring(i)
            val ia = wiktIPA(a); val ib = wiktIPA(b)
            if (ia != null && ia.ipa.isNotEmpty() && ib != null && ib.ipa.isNotEmpty()) {
                fun join(x0: String, y0: String): String { val x = strip(x0); val y = strip(y0).replace(Regex("^ˈ"), "").replace("ˈ", "ˌ"); return "/" + (if (x.startsWith("ˈ")) x else "ˈ$x") + "ˌ" + y.replace(Regex("^ˌ"), "") + "/" }
                return jo("ipa" to join(ia.ipa, ib.ipa), "ipaUS" to join(ia.ipaUS.ifEmpty { ia.ipa }, ib.ipaUS.ifEmpty { ib.ipa }), "guess" to true, "parts" to listOf(a, b))
            }
        }
        return null
    }
}
