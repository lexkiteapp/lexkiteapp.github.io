package com.lexkite.app.core.speak

import com.lexkite.app.core.vocab.je
import com.lexkite.app.core.vocab.jo
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.strs

/** Pitfall of a line (word, IPA, stressed part to underline and the note in the learner language). */
class Pitfall(val w: String, val ipa: String, val hi: String, val note: String)
class SpkLine(j: JsonObject, lang: String) {
    val id = j.gs("id"); val who = j.gs("who"); val en = j.gs("en"); val open = com.lexkite.app.core.sync.Js.truthy(j["open"])
    val gloss = loc(j.go("gloss"), lang)
    val pitfalls: List<Pitfall> = j.ga("pitfalls").map { it.obj().let { p -> Pitfall(p.gs("w"), p.gs("ipa"), p.gs("hi"), loc(p.go("note"), lang)) } }
    /** The words as the learner sees them. */
    val words: List<String> get() = en.split(Regex("\\s+")).filter { it.isNotEmpty() }
    companion object { fun loc(o: JsonObject?, lang: String): String { if (o == null) return ""; return o.gs(lang).ifEmpty { o.gs("en") } } }
}
class SpkStage(j: JsonObject, lang: String) { val id = j.gs("id"); val title = SpkLine.loc(j.go("title"), lang); val lines = j.strs("lines") }
class SpkTask(j: JsonObject, lang: String) { val id = j.gs("id"); val title = SpkLine.loc(j.go("title"), lang); val intents = j.strs("intents") }

/** One #/speak situation in the learner language (web SPK_B base filled by SPK_T): stages → lines, a mission, a culture note. */
class Situation(val j: JsonObject, val lang: String) {
    val id = j.gs("id"); val cefr = j.gs("cefr")
    val title = SpkLine.loc(j.go("title"), lang); val goal = SpkLine.loc(j.go("goal"), lang); val culture = SpkLine.loc(j.go("culture"), lang)
    val stages = j.ga("stages").map { SpkStage(it.obj(), lang) }
    val allLines: List<SpkLine> = j.ga("lines").map { SpkLine(it.obj(), lang) }
    /** Lines that count (open-ended ones do not). */
    val lines: List<SpkLine> = allLines.filter { !it.open }
    val tasks = j.go("mission").ga("tasks").map { SpkTask(it.obj(), lang) }
    fun line(id: String) = allLines.find { it.id == id }
    /** The order of a drill: the lines of [stage] first, then the others. */
    fun order(stage: String?): List<String> {
        val all = stages.flatMap { it.lines }; val st = stages.find { it.id == stage } ?: return all
        return st.lines + all.filter { it !in st.lines }
    }

    companion object {
        /** SPK_fill: every object whose only key is `en` (a string) takes the next translation as [lang] (a null leaves it English only). */
        fun fill(base: JsonElement, arr: List<JsonElement>, lang: String): JsonElement { var i = 0
            fun walk(o: JsonElement): JsonElement = when {
                o is JsonArray -> JsonArray(o.map { walk(it) })
                o is JsonObject && o.size == 1 && (o["en"] as? JsonPrimitive)?.isString == true -> { val v = arr.getOrNull(i++); val m = LinkedHashMap<String, JsonElement>(); m["en"] = o.getValue("en"); if (v is JsonPrimitive && v.isString) m[lang] = v; JsonObject(m) }
                o is JsonObject -> JsonObject(o.mapValues { walk(it.value) })
                else -> o
            }
            return walk(base) }
        /** The JSON body after `["id"] = ` of a `cpack/speak/s/<id>[.<lang>].js` file (indentation and a trailing `;` tolerated). */
        fun body(js: String): JsonElement? = runCatching { val a = js.indexOf("] = "); if (a < 0) null else Json.parseToJsonElement(js.substring(a + 4).trim().trimEnd(';').trim()) }.getOrNull()
        fun parse(baseJs: String, langJs: String?, lang: String): Situation? {
            val b = body(baseJs) as? JsonObject ?: return null
            val arr = langJs?.let { body(it) } as? JsonArray
            return Situation(if (arr != null && lang != "en") fill(b, arr, lang) as JsonObject else b, if (arr != null) lang else "en")
        }
        /** `{id: {g, c, l}}` of `js/speak/data.js` SPK_IDX (the situations that exist and the languages they are translated into). */
        fun index(dataJs: String): Map<String, List<String>> = runCatching {
            val a = Regex("(?m)^\\s*self\\.SPK_IDX = (\\{.*\\});\\s*$").find(dataJs)?.groupValues?.get(1) ?: return@runCatching emptyMap<String, List<String>>()
            (Json.parseToJsonElement(a) as JsonObject).mapValues { it.value.obj().gs("l").split(' ').filter { x -> x.isNotEmpty() } }
        }.getOrDefault(emptyMap())
    }
}

/** localStorage `lk.spk` – `{<situation>: {lines: {<id>: {best, stars}}, tasks: {<task>: true}}, week: {"<year>-W<n>": count}, nomic: 0|1}` – device only. */
object SpkProgress {
    const val KEY = "lk.spk"; const val WEEK_GOAL = 50
    /** `YYYY-Wn` exactly as speak/app.js wk() counts it (local time; Sunday = 0). */
    fun week(now: Long, zone: java.time.ZoneId = java.time.ZoneId.systemDefault()): String {
        val d = java.time.Instant.ofEpochMilli(now).atZone(zone); val j = d.withDayOfYear(1).toLocalDate().atStartOfDay(zone)
        val days = (d.toInstant().toEpochMilli() - j.toInstant().toEpochMilli()) / 864e5
        return d.year.toString() + "-W" + Math.ceil((days + (j.dayOfWeek.value % 7) + 1) / 7).toInt()
    }
    private fun lines(st: JsonObject?, sid: String): JsonObject = st.go(sid).go("lines") ?: JsonObject(emptyMap())
    fun stars(st: JsonObject?, sid: String, id: String): Int = lines(st, sid).go(id).gn("stars").toInt()
    fun taskDone(st: JsonObject?, sid: String, task: String) = com.lexkite.app.core.sync.Js.truthy(st.go(sid).go("tasks").let { it?.get(task) })
    fun weekCount(st: JsonObject?, now: Long): Int = st.go("week").gn(week(now)).toInt()
    fun noMic(st: JsonObject?) = st.gn("nomic") == 1.0
    fun withNoMic(st: JsonObject?, on: Boolean): JsonObject = JsonObject(LinkedHashMap(st ?: JsonObject(emptyMap())).also { it["nomic"] = JsonPrimitive(if (on) 1 else 0) })
    /** A passing attempt: lines[id] = {best: max, stars: max}, the mission tasks whose intents hold the line, and the weekly counter (a new week replaces the old map). */
    fun record(st: JsonObject?, s: Situation, id: String, text: Double, stars: Int, pass: Boolean, now: Long): JsonObject {
        val root = LinkedHashMap(st ?: JsonObject(emptyMap())); val sit = LinkedHashMap(st.go(s.id) ?: JsonObject(emptyMap()))
        val ln = LinkedHashMap(lines(st, s.id)); val cur = ln[id].obj()
        ln[id] = jo("best" to maxOf(cur.gn("best"), text), "stars" to maxOf(cur.gn("stars").toInt(), stars))
        val tasks = LinkedHashMap(st.go(s.id).go("tasks") ?: JsonObject(emptyMap())); for (k in s.tasks) if (id in k.intents && pass) tasks[k.id] = JsonPrimitive(true)
        sit["lines"] = JsonObject(ln); sit["tasks"] = JsonObject(tasks); root[s.id] = JsonObject(sit)
        val w = week(now); root["week"] = jo(w to weekCount(st, now) + 1)
        return JsonObject(root)
    }
}

/** The situation hub (Stitch pas-sit): stage path, mission tasks, mastery, weekly goal, saved-word helpers. */
object SpeakHub {
    class Node(val label: String, val st: String, val stars: Int, val stage: String, val aria: Tr)
    class Task(val title: String, val ex: String, val done: Boolean, val st: String)
    class Addon(val w: String, val ipa: String)
    class Hub(val title: String, val cefr: String, val mission: String, val stage: Tr, val nodes: List<Node>, val tasks: List<Task>, val taskDone: Tr, val mastered: String, val remain: Tr, val pct: Int, val week: Tr, val addon: List<Addon>, val culture: String) {
        val sub = Tr("Luyện nói theo câu"); val masteredSub = Tr("mẫu câu đã thuộc")
    }
    /** [cards] = saved word (lower-case) → its IPA. */
    fun hub(s: Situation, st: JsonObject?, cards: Map<String, String>, now: Long): Hub {
        val all = s.lines; val star = { id: String -> SpkProgress.stars(st, s.id, id) }
        val mastered = all.count { star(it.id) >= 2 }
        val stageSt = s.stages.map { g -> g.lines.all { star(it) >= 1 } }
        val cur = maxOf(0, if (stageSt.indexOf(false) == -1) s.stages.size - 1 else stageSt.indexOf(false))
        val nodes = s.stages.mapIndexed { i, g -> val n = g.lines.map { star(it) }.minOrNull() ?: 0; Node(g.title, if (stageSt[i]) "done" else if (i == cur) "cur" else "todo", n, g.id, Tr("{n}/3 sao", mapOf("n" to n))) }
        val done = s.tasks.map { SpkProgress.taskDone(st, s.id, it.id) }; val ti = done.indexOf(false)
        val tasks = s.tasks.mapIndexed { i, k -> Task(k.title, "“" + (s.line(k.intents.firstOrNull().orEmpty())?.en ?: "") + "”", done[i], if (done[i]) "done" else if (i == ti) "cur" else "todo") }
        val addon = all.flatMap { SpeakScore.toks(it.en) }.filter { it in cards }.distinct().take(4).map { Addon(it, cards[it].orEmpty()) }
        return Hub(s.title, s.cefr, s.goal, Tr("Bước {n}/{m}", mapOf("n" to cur + 1, "m" to s.stages.size)), nodes, tasks, Tr("{n}/{m} xong", mapOf("n" to done.count { it }, "m" to tasks.size)),
            "$mastered / ${all.size}", Tr("Còn {n} mẫu câu", mapOf("n" to all.size - mastered)), jsRound(mastered * 100.0 / all.size), Tr("Mục tiêu tuần {n}/{m} câu", mapOf("n" to SpkProgress.weekCount(st, now), "m" to SpkProgress.WEEK_GOAL)), addon, s.culture)
    }
}

/** What the platform delivers for one tap on the mic of the drill: what was heard (alternatives resolved), an error code, and the elapsed ms since the tap. */
class MicOutcome(val heard: String = "", val conf: Double = 0.0, val error: String? = null, val ms: Long = 0)

/** The three-beat drill (web speak/app.js `drill`): Listen → Shadow → Memory per line, stars, retries, the no-mic tap-in-order fallback. Time and randomness are inputs. */
class SpeakDrill(val s: Situation, progress: JsonObject?, stage: String?, noMic0: Boolean, private val random: () -> Double = { Math.random() }) {
    val order: List<String> = s.order(stage)
    var progress: JsonObject? = progress; private set
    var i = maxOf(0, order.indexOfFirst { SpkProgress.stars(progress, s.id, it) < 2 }); private set
    var b = 0; private set
    var noMic = noMic0; private set
    var rec = false
    private var unclear = 0
    var say: Tr = Tr(""); private set
    var res: Res? = null; private set
    var built = ArrayList<Int>(); private set
    var bank = ArrayList<Int>(); private set
    /** The words the learner has put in order / is about to tap (no-mic mode). */
    class Res(val score: Int, val pass: Boolean, val free: Boolean, val stars: Int, val words: List<SpeakScore.Word>, val verdict: Tr, val sub: Tr)
    /** What a pass pays out: counters + xp, null when nothing is paid (no-mic mode). */
    class Paid(val spoken: Int, val xp: Int)
    var paid: Paid? = null; private set
    /** The finished-all-lines flag: the screen shows the toast and goes back to the situation. */
    var finished = false; private set

    val line: SpkLine get() = s.line(order[i])!!
    val limitMs: Double get() = (line.words.size * 0.6 + 3) * 1000
    val total get() = order.size
    val pct: Int get() = jsRound((i * 3 + b + (if (res?.pass == true) 1 else 0)).toDouble() / (total * 3) * 100)
    val canNext get() = res?.let { it.pass || it.free } == true
    val memory get() = b == 2 && res == null
    /** The "Chạm mic…" alt button: retry after a result, toggle the mic otherwise. */
    val alt: Tr get() = if (res != null) Tr("Thử lại") else if (noMic) Tr("Dùng mic") else Tr("Chưa nói được lúc này")
    val coachPose: String get() = res?.let { if (it.pass) "cheer" else "concern" } ?: if (b == 2) "thinking" else if (b == 1) "encourage" else "talk"
    /** The pitfall tip for the words missed (or the first beat's). */
    val tip: Pitfall? get() { val bad = res?.words?.filter { !it.ok }?.map { SpeakScore.toks(it.w).firstOrNull().orEmpty() }
        return line.pitfalls.firstOrNull { it.w.isNotEmpty() && (if (bad != null) it.w.lowercase() in bad else b == 0) } }

    init { enter() }
    private fun enter() {
        res = null; unclear = 0; built = ArrayList(); bank = ArrayList(shuffle(line.words.indices.toList())); paid = null
        say = if (noMic) Tr("Chạm các từ theo đúng thứ tự.") else Tr(listOf("Nghe rồi nói theo nhé.", "Nói cùng nhịp với cô nhé.", "Giờ nói lại từ trí nhớ nhé.")[b])
    }
    private fun shuffle(a: List<Int>): List<Int> = a.map { random() to it }.sortedBy { it.first }.map { it.second }

    private fun result(text: Double, words: List<SpeakScore.Word>, wpm: Int, free: Boolean, sinceTap: Long, now: Long) {
        val pass = free || SpeakScore.pass(text)
        val quick = sinceTap > 0 && sinceTap <= limitMs
        val stars = if (noMic) (if (pass) 1 else 0) else if (!pass) 0 else if (b < 2) 1 else if (quick) 3 else 2
        val sc = jsRound(text * 100)
        res = Res(sc, pass, free, if (free) 0 else stars, words, if (pass) Tr("Nói rất tốt!") else Tr("Gần đúng rồi!"),
            if (free) Tr("Chưa nghe rõ – cho qua, không tính sao.") else if (pass) Tr("{n} từ/phút", mapOf("n" to wpm)) else Tr("Thử lại các từ tô đỏ nhé."))
        if (pass || free) { progress = SpkProgress.record(progress, s, order[i], text, res!!.stars, pass, now); paid = if (noMic) null else Paid(1, 2 * res!!.stars) }
    }
    /** The result of one mic try (heard text, error or nothing heard). Returns false when the mic cannot be used and the drill switched to tap-in-order. */
    fun onMic(o: MicOutcome, now: Long): Boolean {
        rec = false
        if (o.error == "not-allowed" || o.error == "unsupported" || o.error == "service-not-allowed") { noMic = true; enter(); say = Tr("Không dùng được mic – chạm các từ theo đúng thứ tự nhé."); return false }
        if (o.heard.isBlank()) {
            unclear++
            if (unclear <= 2) { say = Tr("Cô chưa nghe rõ – thử lại nhé, không bị trừ điểm."); return true }
            result(0.0, SpeakScore.align(line.en, line.en), 0, true, o.ms, now); say = Tr("Gợi ý: nói to, rõ từng từ. Cô cho qua lần này."); return true
        }
        val words = SpeakScore.align(line.en, o.heard); result(SpeakScore.text(words), words, SpeakScore.wpm(o.heard, o.ms), false, o.ms, now)
        say = if (res!!.pass) (if (b == 2) Tr("Tuyệt! Nhớ được cả câu rồi.") else Tr("Tốt lắm! Sang nhịp tiếp nhé.")) else Tr("Gần rồi – nghe lại từ tô đỏ rồi thử lại.")
        return true
    }
    /** Tap the word at [k] (no-mic mode): it must be the next one in order. Returns true when the last word completed the line. */
    fun tap(k: Int, now: Long): Boolean {
        if (res != null) return false
        if (k != built.size) { say = Tr("Chưa đúng thứ tự – thử từ khác nhé."); return false }
        built.add(k); bank.remove(k)
        if (bank.isEmpty()) { result(1.0, SpeakScore.align(line.en, line.en), 0, false, 0, now); say = Tr("Đúng rồi! Giờ nghe cô đọc lại nhé."); return true }
        return false
    }
    fun next() { if (!canNext) return; if (b < 2) b++ else { b = 0; i++ }; if (i >= order.size) { finished = true; return }; enter() }
    /** "Thử lại" (after a result) or the mic toggle; returns the new no-mic flag when it was toggled. */
    fun retry(): Boolean? { if (res != null) { enter(); return null }; noMic = !noMic; progress = SpkProgress.withNoMic(progress, noMic); enter(); return noMic }
    fun recording() { rec = true; res = null }
    fun settled() { paid = null }
    /** Words shown: tapped (placed), the bank (to tap) or the sentence; memory beat shows first letters. */
    fun shownWords(): List<Triple<String, Boolean, Int>> { val ws = line.words
        return if (noMic && res == null) built.map { Triple(ws[it], false, -1) } + bank.map { Triple(if (memory) ws[it].take(1) + "…" else ws[it], true, it) }
        else ws.mapIndexed { k, w -> Triple(if (memory) w.take(1) + "…" else w, res == null, k) } }
}
