package com.lexkite.app.core.call

import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.core.speak.jsRegex
import com.lexkite.app.core.speak.jsRound
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.s
import com.lexkite.app.core.vocab.strs
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.text.Normalizer

/** One branch of a call node `[regex, teacher line, next?]`; [hasTo] = the third item exists (an explicit null ends the call). */
class CBr(val re: String, val line: String, val hasTo: Boolean, val to: String?)

/** One node of a call graph (web call/engine.js): the teacher line, the suggested answers, branches, default reaction, next node and the optional prep / long-turn / cue fields. */
class CNode(val id: String, val j: JsonObject) {
    val m = j.gs("m"); val o: List<String> = j.strs("o"); val re = j.gs("re")
    val next: String? = j.gs("next").ifEmpty { null }
    val br: List<CBr> = j.ga("br").map { e -> val a = (e as? JsonArray) ?: JsonArray(emptyList()); CBr(a.getOrNull(0).s(), a.getOrNull(1).s(), a.size > 2, a.getOrNull(2).s().ifEmpty { null }) }
    val min = j.gn("min").toInt(); val long = Js.truthy(j["long"]); val prep = j.gn("prep").toInt()
    val hasCue = j["cue"].let { it != null && it !is JsonNull }; val cue: List<String> = j.strs("cue"); val kw: List<String> = j.strs("kw")
}

/** A call: the prepared graph (a legacy `turns[]` call is converted to nodes t0 → t1 → …, `prep` of the web engine). */
class Call(val raw: JsonObject) {
    val nodes: LinkedHashMap<String, CNode> = LinkedHashMap()
    val start: String?
    init {
        val n = raw["nodes"] as? JsonObject
        if (n != null) { for ((k, v) in n) nodes[k] = CNode(k, v as? JsonObject ?: JsonObject(emptyMap())); start = raw.gs("start").ifEmpty { null } ?: nodes.keys.firstOrNull() }
        else { val turns = raw.ga("turns"); turns.forEachIndexed { k, x -> val base = x as? JsonObject ?: JsonObject(emptyMap()); nodes["t$k"] = CNode("t$k", JsonObject(base + ("next" to (if (k + 1 < turns.size) JsonPrimitive("t${k + 1}") else JsonNull)))) }; start = "t0" }
    }
    val id = raw.gs("id"); val em = raw.gs("em"); val lv = raw.gs("lv"); val title = raw.gs("title"); val role = raw.gs("role"); val who = raw.gs("who"); val exam = raw.gs("exam"); val end = raw.gs("end")
    /** Target language (`es` calls come from the Spanish pack); null = English. */
    val tl: String? = raw.gs("tl").ifEmpty { null }
    val words: List<String> = raw.strs("words")
    val phrases: List<Pair<String, String>> = raw.ga("phrases").map { p -> val a = (p as? JsonArray) ?: JsonArray(emptyList()); a.getOrNull(0).s() to a.getOrNull(1).s() }
    val retry = Js.truthy(raw["retry"])
    fun node(id: String?): CNode? = if (id == null) null else nodes[id]
    /** The teacher's display name (Chars.name): "ama" → "Ama". */
    val teacher: String get() = who.replaceFirstChar { it.titlecase() }
    /** The graph as JSON (the shape of the vectors' `retry` output). */
    fun json(): JsonObject { val m = LinkedHashMap<String, JsonElement>(raw); m["nodes"] = JsonObject(nodes.mapValues { it.value.j }); if (start != null) m["start"] = JsonPrimitive(start) else m.remove("start"); return JsonObject(m) }
}

/** A grammar fix (`bad → good`, [why] = the Vietnamese source key of the first rule that fired). */
class Fix(val bad: String, val good: String, val why: Tr, val whys: List<Tr>)
/** A sound-pair slip: the recogniser heard [said] while the topic word is [meant]; [skill] = the pronunciation lesson to open. */
class Slip(val said: String, val meant: String, val id: String, val skill: String)
class Fluency(val words: Int, val fillers: Int, val short: Boolean, val link: Boolean, val wpm: Int)
class Step(val react: String, val next: String?, val br: Int)
/** One answer of the learner: [secs] spoken, [asr] recogniser score (never used for scoring), [typed] = typed on the keyboard. */
class LogEntry(val id: String, val text: String, val picked: Boolean, val secs: Double? = null, val asr: Int? = null, val typed: Boolean = false)
class RTurn(val id: String, val m: String?, val text: String, val picked: Boolean, val fix: Fix?, val slips: List<Slip>, val fl: Fluency, val weak: Boolean, val model: String)
class Note(val id: String, val n: Int = 0, val wpm: Int = 0)
class Recap(val turns: List<RTurn>, val spoken: Int, val picked: Int, val words: Int, val uniq: Int, val fillers: Int, val wpm: Int, val used: List<String>, val target: List<String>, val notes: List<Note>, val weak: List<String>, val score: Int, val band: String)
class AskChoice(val id: String, val icon: String, val label: Tr)

/** Pure engine of the call screens (web call/engine.js): graph, branching, gentle grammar fixes, sound-pair slips, fluency, recap, retry and the recognition-path choice. Every table comes from the downloaded pack (`consts.engine`), none is typed here. */
class CallEngine(consts: JsonObject?, private val contrasts: List<JsonObject>) {
    private val e = consts.go("engine"); private val cc = consts.go("call")
    private fun table(k: String): Map<String, String> = e.go(k)?.entries?.associate { it.key to it.value.s() } ?: emptyMap()
    private val past = table("past"); private val s3 = table("s3"); private val past3 = table("past3"); private val v3to2 = table("v3to2")
    private val unc = e.gs("uncountable")
    private val modal = jsRegex(e?.get("modal")); private val pastPrompt = jsRegex(e?.get("pastPrompt")); private val pastOwn = jsRegex(e?.get("pastOwn"))
    private val filler = jsRegex(e?.get("filler")); private val link = jsRegex(e?.get("link")); private val stop: Set<String> = e.strs("stop").toSet()
    private val extra: Map<String, String> = table("extraPairs")
    private val score = e.go("score"); private val maxSlips = score.gn("maxSlips", 2.0).toInt()
    private val tlx: Map<String, Pair<Regex, Regex>> = e.go("tl")?.entries?.associate { (k, v) -> k to (jsRegex((v as? JsonObject)?.get("filler")) to jsRegex((v as? JsonObject)?.get("link"))) } ?: emptyMap()
    /** The call constants of the pack: group ids, names (call id → Vietnamese key), unsafe-word patterns, long-turn seconds, progress cap, XP. */
    val groups: List<String> = cc.strs("groups"); val names: Map<String, String> = cc.go("names")?.entries?.associate { it.key to it.value.s() } ?: emptyMap()
    val longSeconds = cc.gn("longSeconds").toInt(); val pctMax = cc.gn("pctMax").toInt()
    private val xp = cc.go("xp"); private val unsafe: Map<String, Regex> = cc.go("unsafe")?.entries?.associate { it.key to jsRegex(it.value) } ?: emptyMap()
    fun unsafe(tl: String?): Regex? = unsafe[tl ?: "en"] ?: unsafe["en"]

    // ---------- graph ----------
    /** Longest path in nodes through `next` and every branch target; loops are cut. */
    fun depth(c: Call): Int {
        val seen = HashSet<String>()
        fun d(id: String?): Int { if (id == null || c.nodes[id] == null || id in seen) return 0; seen.add(id); val n = c.nodes.getValue(id)
            val r = 1 + (listOfNotNull(n.next) + n.br.mapNotNull { it.to }).maxOfOrNull { d(it) }.let { maxOf(0, it ?: 0) }; seen.remove(id); return r }
        return d(c.start)
    }
    /** First branch whose regex matches (whole-word start) wins; an explicit null target ends the call. */
    fun step(c: Call, id: String, text: String): Step {
        val n = c.nodes[id] ?: return Step("", null, -1)
        val s = if (c.tl != null) fold(text) else text
        n.br.forEachIndexed { k, b -> val hit = runCatching { Regex("\\b(" + (if (c.tl != null) fold(b.re) else b.re) + ")", RegexOption.IGNORE_CASE).containsMatchIn(s) }.getOrDefault(false)
            if (hit) return Step(b.line, if (b.hasTo) b.to else n.next, k) }
        return Step(n.re, n.next, -1)
    }
    fun fold(s: String?): String = Normalizer.normalize(s ?: "", Normalizer.Form.NFD).replace(Regex("[\\u0300-\\u036f]"), "").lowercase()

    // ---------- gentle grammar fixes ----------
    private class Rule(val past: Boolean, val own: Boolean, val why: Tr, val fix: (String) -> String)
    private fun keepCase(from: String, to: String) = if (from.isNotEmpty() && from[0].isUpperCase()) to.replaceFirstChar { it.uppercase() } else to
    private fun Regex.once(s: String, f: (MatchResult) -> String): String { val m = find(s) ?: return s; return s.substring(0, m.range.first) + f(m) + s.substring(m.range.last + 1) }
    private fun MatchResult.g(i: Int): String? = groups[i]?.value
    private val v3p = "[a-z]+ed|been|" + v3to2.keys.joinToString("|")
    private val perfAux = Regex("^\\s+(?:$v3p)\\b", RegexOption.IGNORE_CASE)
    private val rules: List<Rule> by lazy { val I = RegexOption.IGNORE_CASE
        val agree = Regex("\\b(I|we|they|you)\\s+(am|are|'m|'re)\\s+agree\\b", I); val doesnt = Regex("\\b(he|she|it)\\s+don'?t\\b", I); val modalTo = Regex("\\b(can|could|should|will|must)\\s+to\\s+(\\w+)", I)
        val more = Regex("\\bmore\\s+(better|easier|faster|bigger|cheaper|closer|worse)\\b", I)
        val uncR = Regex("\\b(?:(too|so|how)\\s+many|(many)|(an?))\\s+$unc" + "s?\\b|\\b$unc" + "s\\b", I)
        val very = Regex("\\bI\\s+very\\s+(like|love|want|enjoy)\\b", I); val wantTo = Regex("\\b(want|need|would like|'d like)\\s+(go|eat|buy|see|try|have|book|make|visit|ask|join|pay|come)\\b", I)
        val job = Regex("\\b(I'm|I am)\\s+(engineer|teacher|student|developer|designer|manager|doctor|nurse|accountant|intern)\\b", I)
        val s3R = Regex("\\b(he|she)\\s+(go|do|have|work|like|want|need|live|watch|study|play|make|know|think)\\b", I)
        val perfPast = Regex("\\b(I|we|they|you|he|she|it)(?:\\s+(have|has)|'ve)\\s+($v3p)\\b", I)
        val pastR = Regex("\\b(I|we|they|he|she|and)\\s+(" + past.keys.joinToString("|") + ")\\b", I)
        val past3R = Regex("\\b(he|she|it)\\s+(" + past3.keys.joinToString("|") + ")\\b", I)
        val sing = Regex("^(I|he|she|it)$", I); val haveW = Regex("^have$", I)
        listOf(
            Rule(false, false, Tr("“Agree” đã là động từ – không cần “am/is/are” đứng trước.")) { s -> agree.once(s) { m -> m.g(1) + " agree" } },
            Rule(false, false, Tr("Với he/she/it, phủ định dùng “doesn’t”, không dùng “don’t”.")) { s -> doesnt.once(s) { m -> m.g(1) + " doesn't" } },
            Rule(false, false, Tr("Sau can/could/should/will không dùng “to”.")) { s -> modalTo.once(s) { m -> m.g(1) + " " + m.g(2) } },
            Rule(false, false, Tr("Từ so sánh hơn như “better” đã mang nghĩa “hơn” – bỏ “more”.")) { s -> more.once(s) { m -> m.g(1).orEmpty() } },
            Rule(false, false, Tr("Danh từ không đếm được (information, advice…) không thêm -s.")) { s -> uncR.replace(s) { m -> val q = m.g(1); val many = m.g(2); val a = m.g(3); val u1 = m.g(4); val u2 = m.g(5)
                if (q != null) q + " much " + u1 else if (many != null) keepCase(many, "a lot of") + " " + u1 else if (a != null) u1.orEmpty() else u2.orEmpty() } },
            Rule(false, false, Tr("“Very” không đứng trước động từ – dùng “really” hoặc “very much” ở cuối câu.")) { s -> very.once(s) { m -> "I really " + m.g(1) } },
            Rule(false, false, Tr("Sau want/need/would like, động từ tiếp theo cần “to”.")) { s -> wantTo.once(s) { m -> m.g(1) + " to " + m.g(2) } },
            Rule(false, false, Tr("Trước nghề nghiệp số ít cần mạo từ “a/an”.")) { s -> job.once(s) { m -> val w = m.g(2).orEmpty(); m.g(1) + (if ("aeiou".indexOf(w.first().lowercaseChar()) >= 0) " an " else " a ") + w } },
            Rule(false, false, Tr("Với he/she/it ở thì hiện tại đơn, động từ thêm -s/-es.")) { s -> s3R.replace(s) { m -> val v = m.g(2).orEmpty(); if (modal.containsMatchIn(s.substring(0, m.range.first))) m.value else m.g(1) + " " + keepCase(v, s3[v.lowercase()].orEmpty()) } },
            Rule(true, true, Tr("Có mốc thời gian đã qua (hôm qua, năm ngoái…) thì dùng quá khứ đơn, không dùng “have + V3”.")) { s -> perfPast.replace(s) { m -> val p = m.g(1).orEmpty(); val v = m.g(3).orEmpty()
                p + " " + (if (v.lowercase() == "been") (if (sing.matches(p)) "was" else "were") else (v3to2[v.lowercase()] ?: v)) } },
            Rule(true, false, Tr("Chuyện đã xảy ra (hôm qua, cuối tuần trước…) dùng động từ ở thì quá khứ.")) { s -> pastR.replace(s) { m -> val p = m.g(1).orEmpty(); val v = m.g(2).orEmpty()
                if (modal.containsMatchIn(s.substring(0, m.range.first)) || (haveW.matches(v) && perfAux.containsMatchIn(s.substring(m.range.last + 1)))) m.value else p + " " + keepCase(v, past[v.lowercase()].orEmpty()) } },
            Rule(true, true, Tr("Chuyện đã xảy ra (hôm qua, cuối tuần trước…) dùng động từ ở thì quá khứ.")) { s -> past3R.replace(s) { m -> m.g(1) + " " + past3[m.g(2).orEmpty().lowercase()] } },
        ) }
    /** Every rule in order is applied; own = the learner's own sentence has a past marker, past = own or the teacher question asks about the past. Null when nothing changed. */
    fun correct(text: String, prompt: String?): Fix? {
        val own = pastOwn.containsMatchIn(text); val past = own || pastPrompt.containsMatchIn(prompt ?: ""); val whys = ArrayList<Tr>(); var good = text
        for (r in rules) { if (r.past && !past || r.own && !own) continue; val g2 = r.fix(good); if (g2 != good) { good = g2; if (whys.none { it.k == r.why.k }) whys.add(r.why) } }
        return if (good != text) Fix(text, good, whys[0], whys) else null
    }

    // ---------- sound-pair slips (bread ≠ breast) ----------
    private val WORD = Regex("[a-z][a-z']*"); private val AZ = Regex("[a-z]+")
    fun words(s: String?, tl: Boolean = false): List<String> = if (tl) AZ.findAll(fold(s)).map { it.value }.toList() else WORD.findAll((s ?: "").lowercase().replace('’', '\'')).map { it.value }.toList()
    private val stemRe = Regex("(ies|es|s|ed|ing)$")
    private fun stem(w: String) = stemRe.replaceFirst(w, "")
    private val index: Map<String, List<Pair<String, String>>> by lazy {
        val m = LinkedHashMap<String, MutableList<Pair<String, String>>>()
        fun add(a: String?, b: String?, id: String) { if (a.isNullOrEmpty() || b.isNullOrEmpty() || a == b) return; m.getOrPut(a) { ArrayList() }.add(b to id); m.getOrPut(b) { ArrayList() }.add(a to id) }
        for (c in contrasts) c.gs("pairs").split(Regex("\\s+")).forEach { p -> val x = p.split('/'); add(x[0], x.getOrNull(1)?.replace(Regex("=.*"), ""), c.gs("id")) }
        for ((id, v) in extra) v.split(Regex("\\s+")).forEach { p -> val x = p.split('/'); add(x[0], x.getOrNull(1), id) }
        m }
    /** The pronunciation lesson of a contrast id: the first skill of that contrast, else the final-consonants lesson. */
    fun skillOf(id: String): String = contrasts.find { it.gs("id") == id }?.strs("skills")?.firstOrNull()?.takeIf { it.isNotEmpty() } ?: "final-consonants"
    fun slips(text: String, c: Call?, n: CNode?): List<Slip> {
        val heard = LinkedHashSet(words(text)); val out = ArrayList<Slip>()
        // `[...kw, ...call.words].flatMap(words)` in the web passes the array index as the 2nd argument: from the 2nd entry on, words are folded (a quirk the vectors record)
        val exp = LinkedHashSet<String>(); ((n?.kw ?: emptyList()) + (c?.words ?: emptyList())).forEachIndexed { k, s -> exp.addAll(words(s, k != 0)) }
        words((n?.o ?: emptyList()).joinToString(" ")).filter { it.length >= 5 && it !in stop }.forEach { exp.add(it) }
        for (w in heard) {
            if (w in exp || exp.any { stem(it) == stem(w) }) continue
            for ((p, id) in index[w] ?: emptyList()) if (p in exp && p !in heard && out.none { it.meant == p }) out.add(Slip(w, p, id, skillOf(id)))
        }
        return out.take(maxSlips)
    }

    // ---------- fluency ----------
    fun fluency(text: String?, n: CNode? = null, secs: Double = 0.0, tl: String? = null): Fluency {
        val x = if (tl != null) tlx[tl] else null; val ws = words(text, tl != null)
        val fillers = if (x != null) x.first.findAll(fold(text)).count() else filler.findAll(text ?: "").count(); val real = ws.size - fillers; val min = n?.min ?: 0
        return Fluency(real, fillers, min != 0 && real < min, (x?.second ?: link).containsMatchIn(if (x != null) fold(text) else text ?: ""), if (secs > 1) jsRound(real / secs * 60) else 0)
    }

    // ---------- recap ----------
    fun recap(c: Call, log: List<LogEntry>): Recap {
        val exam = c.exam.startsWith("ielts"); val tl = c.tl != null
        val turns = log.map { x -> val n = c.nodes[x.id]; val fix = if (x.picked || tl) null else correct(x.text, n?.m); val sl = if (x.picked || tl) emptyList() else slips(x.text, c, n)
            val fl = fluency(x.text, n, x.secs ?: 0.0, c.tl); val weak = !x.picked && (fix != null || sl.isNotEmpty() || fl.short)
            RTurn(x.id, n?.m, x.text, x.picked, fix, sl, fl, weak, n?.o?.firstOrNull() ?: "") }
        val spoken = turns.filter { !it.picked }
        val said = spoken.flatMap { words(it.text, tl) }.map { stem(it) }.toSet()
        val target = c.words.map { it.lowercase() }.distinct()
        val used = target.filter { w -> (if (tl) fold(w) else w).split(Regex("\\s+")).all { stem(it) in said } }
        val allWords = spoken.sumOf { it.fl.words }; val fillers = spoken.sumOf { it.fl.fillers }; val uniq = spoken.flatMap { words(it.text, tl) }.toSet().size
        val notes = ArrayList<Note>(); val shortN = spoken.count { it.fl.short }
        if (shortN > 0) notes.add(Note("short", shortN))
        if (spoken.size >= 2 && exam && spoken.none { it.fl.link }) notes.add(Note("link"))
        if (allWords >= score.gn("fillerMinWords", 20.0) && fillers.toDouble() / maxOf(1, allWords) > score.gn("fillerShare", 0.08)) notes.add(Note("fillers", fillers))
        if (spoken.any { it.slips.isNotEmpty() }) notes.add(Note("slips"))
        val wpms = spoken.map { it.fl.wpm }.filter { it != 0 }; val wpm = if (wpms.isNotEmpty()) jsRound(wpms.sum().toDouble() / wpms.size) else 0
        if (wpm != 0 && wpm < score.gn("slowWpm", 70.0)) notes.add(Note("slow", wpm = wpm))
        if (spoken.isEmpty() && turns.isNotEmpty()) notes.add(Note("speak"))
        if (notes.isEmpty() && spoken.isNotEmpty()) notes.add(Note("good"))
        val k = maxOf(1, depth(c)); val done = minOf(1.0, turns.size.toDouble() / k); val share = if (turns.isNotEmpty()) spoken.size.toDouble() / turns.size else 0.0
        val clean = if (spoken.isNotEmpty()) spoken.count { !it.weak }.toDouble() / spoken.size else 0.0
        val base = score.gn("base", 40.0)
        val sc = if (turns.isNotEmpty()) jsRound(maxOf(base, minOf(score.gn("max", 100.0), base + done * score.gn("doneWeight", 20.0) + share * score.gn("shareWeight", 20.0) + clean * score.gn("cleanWeight", 20.0)))) else 0
        return Recap(turns, spoken.size, turns.size - spoken.size, allWords, uniq, fillers, wpm, used, target, notes, turns.filter { it.weak }.map { it.id }, sc,
            if (sc >= score.gn("great", 85.0)) "great" else if (sc >= score.gn("good", 70.0)) "good" else "keep")
    }
    /** A practice call of only the weak nodes, chained in the given order (duplicates and unknown ids dropped); each keeps its fields, branches lose their 3rd item. */
    fun retry(c: Call, ids: List<String>): Call {
        val keep = ids.distinct().filter { c.nodes.containsKey(it) }; val nodes = LinkedHashMap<String, JsonElement>()
        keep.forEachIndexed { k, id -> val n = c.nodes.getValue(id).j; val m = LinkedHashMap<String, JsonElement>(n)
            m["br"] = JsonArray(n.ga("br").map { b -> JsonArray(((b as? JsonArray) ?: JsonArray(emptyList())).take(2)) }); m["next"] = keep.getOrNull(k + 1)?.let { JsonPrimitive(it) } ?: JsonNull; nodes[id] = JsonObject(m) }
        val root = LinkedHashMap<String, JsonElement>(c.raw); root.remove("turns"); root["retry"] = JsonPrimitive(true); root["nodes"] = JsonObject(nodes); if (keep.isNotEmpty()) root["start"] = JsonPrimitive(keep[0]) else root.remove("start")
        return Call(JsonObject(root))
    }

    // ---------- recognition path ----------
    /** `local` = on-device recogniser available · `sr` = some recogniser exists · `media`/`ext`/`whisper` are web-only. → local · whisper · cloud · ask · tap */
    fun asrMode(local: Boolean = false, sr: Boolean = false, media: Boolean = false, ext: Boolean = false, whisper: Boolean = false, pref: String? = null): String {
        if (pref == "tap") return "tap"
        if (local && sr) return "local"
        if (pref == "cloud" && sr) return "cloud"
        if (media && !ext) return if (whisper) "whisper" else if (pref == "device") "whisper" else "ask"
        return if (sr) (if (pref == "cloud") "cloud" else "ask") else "tap"
    }
    /** Native: no Whisper path; an on-device recogniser ⇒ local (private), the system service only after the learner accepted it (cloud), else tap. */
    fun asrModeNative(onDevice: Boolean, system: Boolean, pref: String?): String = asrMode(local = onDevice, sr = system, pref = pref)

    // ---------- list / privacy / rewards ----------
    fun groupOf(c: Call): String = if (c.exam.startsWith("ielts")) "ielts" else if (c.exam == "toeic") "toeic" else "everyday"
    fun filtered(calls: List<Call>, flt: String): List<Call> = calls.filter { flt == "all" || groupOf(it) == flt }
    /** The card name: the translated key for the named calls, else the English title (null). */
    fun nameKey(c: Call): Tr? = names[c.id]?.let { Tr(it) }
    fun groupLabel(g: String): Tr = when (g) { "all" -> Tr("Tất cả"); "ielts" -> Tr("IELTS"); "toeic" -> Tr("TOEIC"); else -> Tr("Đời sống") }
    /** The privacy sentence under the list / on the ring (icon + key) for a recognition mode. */
    fun privacy(mode: String): Pair<String, Tr> = when (mode) {
        "local", "whisper" -> "🔒" to Tr("Nhận dạng ngay trên máy – âm thanh không rời khỏi máy bạn.")
        "cloud" -> "☁️" to Tr("Đang dùng nhận dạng của trình duyệt: âm thanh được gửi tới máy chủ của trình duyệt.")
        "tap" -> "⌨️" to Tr("Trả lời bằng cách chạm gợi ý hoặc gõ phím.")
        else -> "🔒" to Tr("Mặc định Lexkite không gửi âm thanh của bạn đi đâu.")
    }
    /** The choice box of the first mic press: Chrome pack (downloadable) · on-device Whisper (media, no add-on) · cloud (system / browser service) · tap only. */
    fun askChoices(localDl: Boolean, media: Boolean, ext: Boolean, sr: Boolean): List<AskChoice> = buildList {
        if (localDl && sr) add(AskChoice("chrome", "🔒", Tr("Tải gói nhận dạng của Chrome (chạy trên máy)")))
        if (media && !ext) add(AskChoice("device", "🔒", Tr("Nhận dạng trên máy bằng Whisper (tải ~40 MB một lần, nên dùng Wi-Fi)")))
        if (sr) add(AskChoice("cloud", "☁️", Tr("Dùng dịch vụ của trình duyệt (âm thanh được gửi đi để nhận dạng)")))
        add(AskChoice("tap", "⌨️", Tr("Chỉ chạm gợi ý hoặc gõ phím")))
    }
    /** `progress = min(pctMax, round(logged / depth · 100))`, 100 once the call has ended. */
    fun progress(depth: Int, logged: Int, ended: Boolean): Int = if (ended) 100 else minOf(pctMax, jsRound(logged.toDouble() / maxOf(1, depth) * 100))
    /** `App.reward({ spoken: voiced, xp })`: base + turns·perTurn + voiced·perVoiced + (a topic word was used ? usedWords : 0). */
    fun reward(turns: Int, voiced: Int, usedWords: Int): Reward = Reward(mapOf("spoken" to voiced), (xp.gn("base") + turns * xp.gn("perTurn") + voiced * xp.gn("perVoiced") + (if (usedWords > 0) xp.gn("usedWords") else 0.0)).toInt())
    /** The summary note as a UI text. */
    fun noteText(n: Note): Tr = when (n.id) {
        "short" -> Tr("Có {n} câu trả lời hơi ngắn – hãy trả lời đầy đủ hơn: thêm một lý do (because…) hoặc một ví dụ (for example…).", mapOf("n" to n.n))
        "link" -> Tr("Dùng thêm từ nối như because, so, however, for example để câu trả lời liền mạch như bài thi band cao.")
        "fillers" -> Tr("Bạn dùng {n} từ đệm (um, uh…). Thử dừng ngắn và thở thay vì “um” – nghe tự tin hơn.", mapOf("n" to n.n))
        "slips" -> Tr("Có từ nghe thành một từ khác chỉ khác một âm – luyện cặp âm đó ở mục Phát âm.")
        "slow" -> Tr("Tốc độ khoảng {wpm} từ/phút. Cứ thong thả, nhưng cố nói liền từng cụm thay vì từng từ.", mapOf("wpm" to n.wpm))
        "speak" -> Tr("Lần sau hãy thử nói bằng giọng – chỉ cần một câu ngắn cũng được.")
        else -> Tr("Câu trả lời đầy đủ và tự nhiên – tuyệt vời! Thử một cuộc gọi khó hơn nhé.")
    }
    fun bandText(b: String): Tr = when (b) { "great" -> Tr("Xuất sắc!"); "good" -> Tr("Tốt lắm – tiến bộ rõ!"); else -> Tr("Khởi đầu tốt – luyện thêm chút nữa nhé!") }

    /** The cards of "Thêm vào thẻ ôn": one per phrase, then one per grammar fix (silent, topic `call`). */
    class CardSave(val entry: JsonObject, val ctx: JsonObject)
    fun cards(c: Call, r: Recap): List<CardSave> {
        val title = "Call " + c.teacher + ": " + c.title; val out = ArrayList<CardSave>()
        for ((p, d) in c.phrases) out.add(CardSave(JsonObject(mapOf("word" to JsonPrimitive(p), "def" to JsonPrimitive(d), "pos" to JsonPrimitive("phrase"), "emoji" to JsonPrimitive("📞"), "topic" to JsonPrimitive("call"))), JsonObject(mapOf("text" to JsonPrimitive(d), "title" to JsonPrimitive(title)))))
        for (x in r.turns.mapNotNull { it.fix }) out.add(CardSave(JsonObject(mapOf("word" to JsonPrimitive(x.good), "pos" to JsonPrimitive("phrase"), "ex" to JsonPrimitive(x.good), "emoji" to JsonPrimitive("📞"), "topic" to JsonPrimitive("call"))), JsonObject(mapOf("text" to JsonPrimitive(x.good), "title" to JsonPrimitive(title)))))
        return out
    }
    companion object {
        /** `mm:ss` of the long-turn / preparation clock (web mmss). */
        fun mmss(s: Int): String = Math.floorDiv(s, 60).toString().padStart(2, '0') + ":" + (Math.max(0, s) % 60).toString().padStart(2, '0')
        /** The status line of a phase (talk · listen · think · done · you). */
        fun statusTr(phase: String, who: String): Tr = when (phase) {
            "talk" -> Tr("{name} đang nói…", mapOf("name" to who)); "listen" -> Tr("Đang nghe bạn…"); "think" -> Tr("Đang hiểu câu của bạn…"); "done" -> Tr("Cuộc gọi kết thúc"); else -> Tr("Đến lượt bạn – bấm micro để nói") }
        /** The mic button label: stop while listening, else speak. */
        fun micTr(phase: String): Tr = if (phase == "listen") Tr("Dừng nghe") else Tr("Nói")
        const val UNSAFE_LINE = "Let's keep our chat friendly and on topic!"
    }
}

/**
 * The call pack `https://lexkite.com/data/call-pack.json` (bundled `content-pack/call-starter.json` offline): the prepared call graphs, the sound-pair contrasts and the constants of the web engine.
 * Nothing the engine needs is typed in Kotlin.
 */
class CallPack(val root: JsonObject) {
    val version = root.gs("v")
    val calls: List<Call> = root.ga("calls").map { Call(it as JsonObject) }
    /** The English calls (the Spanish pack's `tl` calls are web-only). */
    val english: List<Call> get() = calls.filter { it.tl == null || it.tl == "en" }
    fun call(id: String?): Call? = english.find { it.id == id }
    val engine = CallEngine(root.go("consts"), root.go("pron").ga("contrasts").map { it as JsonObject })
    val ok get() = calls.isNotEmpty() && root.go("consts") != null
    companion object {
        const val STORE_FILTER = "vb.call.flt"; const val STORE_ASR = "vb.call.asr"; const val STORE_TR = "vb.call.tr"
        fun parse(text: String): CallPack? = runCatching { CallPack(Json.parseToJsonElement(text) as JsonObject).takeIf { it.ok } }.getOrNull()
    }
}
