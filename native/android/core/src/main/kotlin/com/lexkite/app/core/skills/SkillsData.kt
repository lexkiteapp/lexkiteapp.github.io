package com.lexkite.app.core.skills

import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.jsTrim
import com.lexkite.app.core.vocab.strs
import com.lexkite.app.core.vocab.Topic
import com.lexkite.app.core.write.Essay
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** One listening part (web LISTENING item, MCQ options already rotated: use them as they are, grade by index). */
class Part(val j: JsonObject) {
    val id = j.gs("id"); val test = j.gn("test").toInt(); val part = j.gn("part").toInt()
    val title = j.gs("title"); val titleVi = j.gs("titleVi"); val topic = j.gs("topic"); val context = j.gs("context")
    val speakers: Map<String, Speaker> = j.go("speakers")?.mapValues { Speaker(it.value as JsonObject) } ?: emptyMap()
    val script: List<Line> = j.ga("script").mapIndexed { i, e -> Line(i, e as JsonObject) }
    val groups: List<JsonObject> = j.ga("groups").map { it as JsonObject }
    val vocab: List<Pair<String, String>> = j.ga("vocab").map { (it as JsonObject).let { v -> v.gs("w") to v.gs("vi") } }
    /** Every question number, in order (web qNums). */
    val qNums: List<Int> = groups.flatMap { g -> if (g.gs("type") == "multi") g.ga("n").map { it.numInt() } else g.ga("items").map { (it as JsonObject).gn("n").toInt() } }
    val qFrom get() = qNums.first(); val qTo get() = qNums.last()
    fun speakerName(k: String?) = speakers[k]?.name ?: (k ?: "")
}
class Speaker(j: JsonObject) { val name = j.gs("name"); val accent = j.gs("accent").ifEmpty { "en-GB" }; val gender = j.gs("gender") }
/** A script line: narrator ([say]), pause ([pause] seconds) or speech ([s] speaker key, [t] text). [i] = index in the script. */
class Line(val i: Int, j: JsonObject) {
    val say: String? = j["say"]?.let { (it as? JsonPrimitive)?.content }?.takeIf { it.isNotEmpty() }
    val pause: Double? = (j["pause"] as? JsonPrimitive)?.content?.toDoubleOrNull()
    val s: String? = j["s"]?.let { (it as? JsonPrimitive)?.content }
    val t: String? = j["t"]?.let { (it as? JsonPrimitive)?.content }?.takeIf { it.isNotEmpty() }
}
private fun JsonElement.numInt() = (this as JsonPrimitive).content.toDouble().toInt()

/** A reading passage (web READINGS item). */
class Reading(val j: JsonObject) {
    val id = j.gs("id"); val title = j.gs("title"); val topic = j.gs("topic"); val level = j.gs("level"); val emoji = j.gs("emoji")
    val summaryVi = j.gs("summaryVi"); val summaryEn = j.gs("summaryEn"); val text = j.gs("text"); val keywords = j.strs("keywords")
    val questions: List<RQ> = j.ga("questions").map { RQ(it as JsonObject) }
    /** Reading time shown on the card: max(2, round(words / 140)). */
    val minutes get() = maxOf(2, Math.floor(WS.split(text).size / 140.0 + 0.5).toInt())
    private companion object { val WS = Regex("\\s+") }
}
class RQ(j: JsonObject) { val type = j.gs("type"); val q = j.gs("q"); val options = j.strs("options"); val answer = j.gs("answer"); val explain = j.gs("explain"); val isTfng get() = type == "tfng"
    /** The option values the learner can pick: TRUE/FALSE/NOT GIVEN or the option index. */
    val picks: List<String> get() = if (isTfng) listOf("TRUE", "FALSE", "NOT GIVEN") else options.indices.map { it.toString() }
    fun optionText(v: String) = if (isTfng) v else options.getOrNull(v.toIntOrNull() ?: -1) ?: v }

/** The P06 content the screens read: parts + passages + word tables (vectors/skills.json `data` has this exact shape; the app downloads the same JSON pack). */
class SkillsContent(val listening: List<Part>, val readings: List<Reading>, val lexis: Lexis) {
    fun part(id: String?) = listening.find { it.id == id }
    fun reading(id: String?) = readings.find { it.id == id }
    val tests: List<Int> get() = listening.map { it.test }.distinct().sorted()
    fun partsOf(n: Int) = listening.filter { it.test == n }.sortedBy { it.part }
    companion object {
        /** [data] = the pack root (or vectors/skills.json `data`). A `consts` block (band table, voice pools, stopwords) is installed into [SkillsConsts]. */
        fun parse(data: JsonObject): SkillsContent { data.go("consts")?.let { SkillsConsts.install(it) }; return build(data) }
        private fun build(data: JsonObject) = SkillsContent(data.ga("listening").map { Part(it as JsonObject) }, data.ga("readings").map { Reading(it as JsonObject) }, Lexis.fromJson(data.go("lexis")))
    }
}

/** Constants of the web code the ports must not retype (pack `consts`, generated from qengine.js BAND, kvoice.js POOL/NARRATOR, listening.js STOPW). Tests assert them against vectors/skills.json. */
object SkillsConsts {
    @Volatile private var c: Installed? = null
    private class Installed(val band: Map<String, List<Pair<Int, Double>>>, val narrator: String, val pools: Map<String, List<String>>, val stopwords: Set<String>)
    fun install(j: JsonObject) {
        val kv = j.go("kvoice")
        c = Installed(
            j.go("band")!!.mapValues { (_, rows) -> (rows as JsonArray).map { r -> (r as JsonArray).let { (it[0] as JsonPrimitive).content.toDouble().toInt() to (it[1] as JsonPrimitive).content.toDouble() } } },
            kv.gs("narrator"), kv.go("pools")!!.mapValues { (_, v) -> (v as JsonArray).map { (it as JsonPrimitive).content } }, j.strs("stopwords").toSet())
    }
    private fun get() = c ?: error("SkillsConsts: no content pack installed (the screens only open once SkillsContent.parse has run)")
    val band get() = get().band; val narrator get() = get().narrator; val pools get() = get().pools; val stopwords get() = get().stopwords
}

/** KVoice (web/js/listen/kvoice.js): one fixed Kokoro voice per speaker (pool by accent + gender, none reused inside a part), the narrator has its own. */
object KVoice {
    /** Narrator voice and per accent:gender pools come from the downloaded pack (`consts.kvoice`, read from kvoice.js) – nothing typed here. */
    val NARRATOR get() = SkillsConsts.narrator
    private val POOL get() = SkillsConsts.pools
    /** speaker key -> Kokoro voice; "_narrator" = the narrator voice. */
    fun voices(p: Part): Map<String, String> {
        val used = hashSetOf(NARRATOR); val out = linkedMapOf("_narrator" to NARRATOR)
        for ((k, s) in p.speakers) {
            val pool = POOL["${s.accent}:${if (s.gender == "f") "f" else "m"}"] ?: POOL.getValue("en-GB:m")
            val v = pool.firstOrNull { it !in used } ?: pool[0]; used.add(v); out[k] = v
        }
        return out
    }
    /** Clip key of a whole script line (narrator or speaker). */
    fun lineKey(voices: Map<String, String>, l: Line): String = AudioLogic.lineKey(if (l.say != null) voices.getValue("_narrator") else voices[l.s] ?: voices.getValue("_narrator"), l.say ?: l.t ?: "")
}

/** One device voice cast for a speaker: [voice] = device voice name (null = engine default), [lang] accent, [pitch]. */
class CastVoice(val voice: String?, val lang: String, val pitch: Double)
/** castVoices (web listening.js): every speaker gets an unused device voice of the right gender; a reused voice gets a shifted pitch. */
object Cast {
    private val FEMALE = Regex("female|woman|samantha|karen|moira|tessa|serena|kate|susan|martha|fiona|victoria|allison|ava|zira|hazel|libby|sonia|maisie|emma|jenny|aria|natasha|catherine|nicky|joanna|salli|kimberly|ivy|amy|olivia|google uk english female|google us english", RegexOption.IGNORE_CASE)
    private val MALE = Regex("\\bmale\\b|daniel|alex|fred|oliver|arthur|gordon|\\blee\\b|aaron|\\btom\\b|rishi|ryan|guy|george|james|thomas|william|christopher|eric|brian|russell|matthew|joey|justin|google uk english male", RegexOption.IGNORE_CASE)
    private val MALE_WORD = Regex("\\bmale\\b", RegexOption.IGNORE_CASE); private val FEMALE_WORD = Regex("female", RegexOption.IGNORE_CASE)
    fun cast(p: Part, voicesFor: (String) -> List<String>): Map<String, CastVoice> {
        val used = hashSetOf<String>(); val cast = linkedMapOf<String, CastVoice>()
        fun pick(accent: String, gender: String): CastVoice {
            val list = voicesFor(accent).ifEmpty { voicesFor("en-GB") }
            val f = gender == "f"; val want = if (f) FEMALE else MALE; val avoid = if (f) MALE else FEMALE
            val v = list.firstOrNull { it !in used && want.containsMatchIn(it) && !(f && MALE_WORD.containsMatchIn(it) && !FEMALE_WORD.containsMatchIn(it)) }
                ?: list.firstOrNull { it !in used && !avoid.containsMatchIn(it) } ?: list.firstOrNull { it !in used } ?: list.firstOrNull()
            if (v != null) used.add(v)
            val same = v != null && cast.values.any { it.voice == v }
            return CastVoice(v, accent, if (same) (if (f) 1.2 else 0.8) else (if (f) 1.05 else 0.95))
        }
        for ((k, s) in p.speakers) cast[k] = pick(s.accent, s.gender)
        val gb = voicesFor("en-GB")
        cast["_narrator"] = CastVoice(gb.firstOrNull { it !in used } ?: gb.firstOrNull(), "en-GB", 1.0)
        return cast
    }
}

/** Lexis (web/js/lexis.js): tap-able word tokens and the AWL / linking-word / phrase highlights of a passage. */
class Lexis(awl: Collection<String>, link: Collection<String>, phrases: List<Pair<String, String>>) {
    private val awl = awl.toHashSet(); private val link = (BUILTIN_LINK + link).toHashSet()
    private val phrases = phrases.sortedByDescending { it.first.length }
    private val phraseType = this.phrases.associate { it.first to it.second }
    private val phraseRe = if (this.phrases.isEmpty()) null else Regex("\\b(${this.phrases.joinToString("|") { reEsc(it.first).replace(" ", "\\s+") }})\\b", RegexOption.IGNORE_CASE)

    /** A word token: [text] as written, [w] lower-case with ’ → ', [cls] highlight classes (kw, link|col, awl, mine; space separated), [ph] the phrase it belongs to. */
    class Tok(val text: String, val w: String, val cls: String, val ph: String?)

    fun bases(w: String): List<String> {
        val out = arrayListOf(w)
        if (w.endsWith("ies")) out.add(w.dropLast(3) + "y")
        if (w.endsWith("es")) out.add(w.dropLast(2))
        if (w.endsWith("s")) out.add(w.dropLast(1))
        if (w.endsWith("ied")) out.add(w.dropLast(3) + "y")
        if (w.endsWith("ed")) { out.add(w.dropLast(2)); out.add(w.dropLast(1)); if (DOUBLE_ED.containsMatchIn(w)) out.add(w.dropLast(3)) }
        if (w.endsWith("ing")) { out.add(w.dropLast(3)); out.add(w.dropLast(3) + "e"); if (DOUBLE_ING.containsMatchIn(w)) out.add(w.dropLast(4)) }
        if (w.endsWith("ly")) { out.add(w.dropLast(2)); out.add(w.dropLast(2) + "e") }
        if (w.endsWith("ation")) { out.add(w.dropLast(5) + "e"); out.add(w.dropLast(5)) }
        if (w.endsWith("ity")) { out.add(w.dropLast(3)); out.add(w.dropLast(3) + "e") }
        if (w.endsWith("ment")) out.add(w.dropLast(4))
        if (w.endsWith("ise") || w.endsWith("ize")) { out.add(w.replaceFirst("iz", "is")); out.add(w.replaceFirst("is", "iz")) }
        return out
    }
    /** (awl stem or null, linking word or null). */
    fun classify(word: String): Pair<String?, String?> { val w = word.lowercase(); return bases(w).firstOrNull { it in awl } to (if (w in link) w else null) }

    /** AWL stems, linking words and phrases of a spoken answer with their counts, in order of first occurrence (the part of web Lexis.analyze the speaking room shows). */
    class Analysis(val awl: Map<String, Int>, val link: Map<String, Int>, val phrases: Map<String, Int>)
    fun analyze(text: String): Analysis {
        val clean = WS.replace(text, " ").trim()
        val awlM = LinkedHashMap<String, Int>(); val linkM = LinkedHashMap<String, Int>(); val phr = LinkedHashMap<String, Int>()
        for (m in ANALYZE_WORD.findAll(clean)) {
            val (a, l) = classify(m.value.lowercase().replace('’', '\''))
            if (a != null) awlM[a] = (awlM[a] ?: 0) + 1
            if (l != null) linkM[l] = (linkM[l] ?: 0) + 1
        }
        phraseRe?.findAll(clean)?.forEach { m -> val k = m.value.lowercase().replace(WS, " "); phr[k] = (phr[k] ?: 0) + 1; if (phraseType[k] == "link") linkM[k] = (linkM[k] ?: 0) + 1 }
        return Analysis(awlM, linkM, phr)
    }

    /** web `Lexis.analyze(text)` in full (the report of #/write): [stop] = the STOP table of lexis.js (write pack `lexis.stop`), [indexed] = membership of the word library (IELTS_DATA.INDEX). */
    fun essay(text: String, stop: Set<String>, indexed: (String) -> Boolean): Essay.Analysis {
        val clean = WS.replace(text, " ").trim()
        val sents = if (clean.isEmpty()) emptyList() else sentencesOf(clean).map { it.trim() }.filter { it.isNotEmpty() }
        val words = Essay.tokens(clean)
        val content = words.filter { it !in stop && it.length > 2 }
        val freq = LinkedHashMap<String, Int>(); val awlC = Essay.Counter(); val linkC = Essay.Counter(); val phr = Essay.Counter()
        for (w in content) { val b = bases(w).firstOrNull(indexed) ?: w; freq[b] = (freq[b] ?: 0) + 1 }
        for (w in words) { val (a, l) = classify(w); if (a != null) awlC.add(a); if (l != null) linkC.add(l) }
        phraseRe?.findAll(clean)?.forEach { m -> val k = m.value.lowercase().replace(WS, " "); phr.add(k); if (phraseType[k] == "link") linkC.add(k) }
        val lens = sents.map { Essay.words(it) }
        val avg = if (lens.isEmpty()) 0.0 else lens.sum().toDouble() / lens.size
        val sd = if (lens.isEmpty()) 0.0 else Math.sqrt(lens.sumOf { (it - avg) * (it - avg) } / lens.size)
        val diversity = if (content.isEmpty()) 0.0 else content.map { bases(it).last() }.toSet().size.toDouble() / content.size
        val overused = freq.entries.filter { it.value >= 4 && it.key !in awl && it.key !in link }.sortedByDescending { it.value }.take(8).map { Essay.Count(it.key, it.value) }
        val awlRatio = if (words.isEmpty()) 0.0 else awlC.total.toDouble() / words.size
        return Essay.Analysis(words.size, sents.size, avg, sd, diversity, awlC.entries, linkC.entries, phr.entries, overused, awlRatio,
            Essay.lexicalBand(words.size, awlRatio, phr.entries.size, linkC.entries.size, diversity, overused.size))
    }

    private fun esc(s: String) = s
    /** One sentence -> alternating plain [String] and [Tok]; adjacent plain text is merged, empty pieces dropped. */
    fun markSentence(s: String, keywords: Set<String> = emptySet(), mine: (String) -> Boolean = { false }): List<Any> {
        class Range(val a: Int, val b: Int, val type: String, val text: String)
        val ranges = phraseRe?.findAll(s)?.map { m -> val k = m.value.lowercase().replace(WS, " "); Range(m.range.first, m.range.last + 1, phraseType[k] ?: "col", k) }?.toList() ?: emptyList()
        val out = ArrayList<Any>(); val sb = StringBuilder()
        fun plain(x: String) { sb.append(esc(x)) }
        fun flush() { if (sb.isNotEmpty()) { out.add(sb.toString()); sb.setLength(0) } }
        var pos = 0
        for (tok in splitKeep(s)) {
            val start = pos; pos += tok.length
            val m = WORD.matchEntire(tok)
            if (m == null) { plain(tok); continue }
            val w = m.groupValues[2].lowercase().replace('’', '\'')
            val ph = ranges.firstOrNull { start >= it.a && start < it.b }
            val (awlStem, linkW) = classify(w)
            val cls = ArrayList<String>()
            if (w in keywords) cls.add("kw")
            if (ph != null) cls.add(if (ph.type == "link") "link" else "col") else if (linkW != null) cls.add("link")
            if (awlStem != null) cls.add("awl")
            if (mine(w)) cls.add("mine")
            plain(m.groupValues[1]); flush(); out.add(Tok(m.groupValues[2], w, cls.joinToString(" "), ph?.text)); plain(m.groupValues[3])
        }
        flush()
        return out
    }
    /** JS `s.split(/(\s+)/)`: words and the whitespace runs between them. */
    private fun splitKeep(s: String): List<String> {
        val out = ArrayList<String>(); var last = 0
        for (m in WS.findAll(s)) { out.add(s.substring(last, m.range.first)); out.add(m.value); last = m.range.last + 1 }
        out.add(s.substring(last)); return out
    }
    fun sentencesOf(p: String): List<String> = SENT.findAll(p).map { it.value }.toList().ifEmpty { listOf(p) }
    /** passage -> paragraphs (split on blank lines) -> sentences -> tokens. */
    fun markText(text: String, keywords: Set<String> = emptySet(), mine: (String) -> Boolean = { false }): List<List<List<Any>>> =
        BLANK.split(text).map { p -> sentencesOf(p).map { markSentence(it, keywords, mine) } }

    /** Distinct words (by phrase when part of one) carrying highlight [k]; `link` also counts collocations. */
    fun count(passage: List<List<List<Any>>>, k: String): Int =
        passage.flatten().flatten().filterIsInstance<Tok>().filter { t -> val c = t.cls.split(' '); if (k == "link") "link" in c || "col" in c else k in c }.map { it.ph ?: it.w }.toSet().size

    companion object {
        private val WS = Regex("\\s+"); private val BLANK = Regex("\\n\\s*\\n"); private val ANALYZE_WORD = Regex("[A-Za-z][A-Za-z'’-]*")
        private val WORD = Regex("^([^A-Za-z]*)([A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z])([^A-Za-z]*)$")
        private val SENT = Regex("[^.!?]+[.!?]+[\"”’)]*\\s*|[^.!?]+\\z")
        private val DOUBLE_ED = Regex("(.)\\1ed$"); private val DOUBLE_ING = Regex("(.)\\1ing$")
        private fun reEsc(s: String) = s.replace(Regex("[.*+?^\${}()|\\[\\]\\\\]")) { "\\" + it.value }
        /** The 28 linking words the web adds before the data sets (lexis.js). */
        private val BUILTIN_LINK = "however moreover furthermore therefore thus hence consequently nevertheless nonetheless although whereas while despite additionally similarly conversely meanwhile firstly secondly finally overall instead otherwise besides accordingly notably undoubtedly arguably".split(" ")
        /** The vector / pack shape: `{awl:[…], link:[…], phrases:[{text,type}]}`. */
        fun fromJson(j: JsonObject?) = Lexis(j.strs("awl"), j.strs("link"), j.ga("phrases").map { (it as JsonObject).let { p -> p.gs("text") to p.gs("type") } })
        /** Built from the word library the way lexis.js does: group awl -> AWL; linking/opinion words and phrases; collocations / idioms / phrasal phrases. */
        fun fromTopics(topics: List<Topic>): Lexis {
            val awl = ArrayList<String>(); val link = ArrayList<String>(); val ph = ArrayList<Pair<String, String>>()
            for (t in topics) for (w in t.words) {
                val k = w.gs("word").lowercase(); val multi = k.any { it.isWhitespace() }
                if (t.group == "awl") awl.add(k)
                if (t.id == "linking" || t.id == "opinion" || (t.id == "task2" && (k == "consequently" || k == "nevertheless"))) { if (multi) ph.add(k to "link") else link.add(k) }
                else if ((t.id == "collocations" || t.id == "idioms" || t.id == "phrasal") && multi) ph.add(k to "col")
            }
            return Lexis(awl, link, ph)
        }
    }
}
