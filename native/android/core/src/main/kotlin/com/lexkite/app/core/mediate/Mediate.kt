package com.lexkite.app.core.mediate

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject

/** The source of a lesson (kind: announcement|text|email|notice|talk = [text] paragraphs · dialogue = [lines] (speaker, text) · chart = caption / cols / rows / unit / note). */
data class MSource(val kind: String, val text: List<String> = emptyList(), val lines: List<Pair<String, String>> = emptyList(), val caption: String? = null, val cols: List<String> = emptyList(),
                   val rows: List<List<String>> = emptyList(), val unit: String? = null, val note: String? = null)

/** A key idea: met when EVERY group of [checks] has at least one phrase in the text. */
data class MPoint(val id: String, val idea: String, val checks: List<List<String>>)
data class MLeave(val idea: String, val checks: List<List<String>>)

data class MItem(
    val id: String, val level: String, val activity: String, val title: String, val scenario: String, val source: MSource,
    val mode: String, val audience: String, val prompt: String, val minWords: Int, val maxWords: Int?,
    val points: List<MPoint>, val leaveOut: List<MLeave>, val model: String, val useful: List<String>, val tips: List<String>, val explain: String,
) { val speak: Boolean get() = mode == "speak" }

data class MPointRes(val id: String, val idea: String, val ok: Boolean)
/** [copied] = the first run of >= 8 words copied from the source ('' = none). */
data class MResult(val n: Int, val inRange: Boolean, val points: List<MPointRes>, val extra: List<String>, val copied: String) {
    val got: Int get() = points.count { it.ok }
    val of: Int get() = points.size
}

/** content-pack/mediation.json: levels (A2..C2), listen-first levels, copy run length, the 30 lessons in list order. */
class MediationPack(val levels: List<String>, val listenFirst: List<String>, val copyRun: Int, val items: List<MItem>) {
    fun item(id: String?): MItem? = items.firstOrNull { it.id == id }
    /** The lesson after [id] (wraps round), like the web's "Next lesson". */
    fun next(id: String): MItem? = items.takeIf { it.isNotEmpty() }?.let { it[(it.indexOfFirst { x -> x.id == id } + 1) % it.size] }
}

/** "Trung gian" (#/mediate) logic – port of web/js/mediate-core.js + the screen rules of web/js/mediate.js. Vectors: vectors/mediate.json. */
object Mediate {
    const val COPY_RUN = 8
    val LEVELS = listOf("A2", "B1", "B2", "C1", "C2")
    val LISTEN_FIRST = listOf("B2", "C1", "C2")
    private val WORD = Regex("[A-Za-z0-9][A-Za-z0-9'’:%.-]*")
    private val WS = Regex("\\s+")

    fun words(s: String?): List<String> = WORD.findAll(s.orEmpty()).map { it.value.trimEnd('.') }.filter { it.isNotEmpty() }.toList()
    fun norm(s: String?): String = " " + s.orEmpty().lowercase().replace('’', '\'').replace('‘', '\'').replace('–', '-').replace('—', '-').replace(WS, " ") + " "
    fun hit(text: String?, checks: List<List<String>>): Boolean { val t = norm(text); return checks.isNotEmpty() && checks.all { c -> c.any { k -> t.contains(k.lowercase()) } } }

    fun sourceText(s: MSource?): String = when {
        s == null -> ""
        s.kind == "chart" -> (listOfNotNull(s.caption) + s.cols + s.rows.flatten() + listOfNotNull(s.note)).joinToString(" ")
        s.kind == "dialogue" -> s.lines.joinToString(" ") { it.second }
        else -> s.text.joinToString(" ")
    }

    fun copied(a: String?, source: String?, n: Int = COPY_RUN): String {
        val m = words(a).map { it.lowercase() }; val s = " " + words(source).joinToString(" ") { it.lowercase() } + " "
        for (i in 0..m.size - n) { val run = m.subList(i, i + n).joinToString(" "); if (s.contains(" $run ")) return run }
        return ""
    }

    fun check(item: MItem, text: String?): MResult {
        val n = words(text).size
        return MResult(n, n >= item.minWords && (item.maxWords == null || n <= item.maxWords),
            item.points.map { MPointRes(it.id, it.idea, hit(text, it.checks)) }, item.leaveOut.filter { hit(text, it.checks) }.map { it.idea }, copied(text, sourceText(item.source)))
    }

    private val POOL = mapOf('f' to listOf("bf_isabella", "bf_lily", "bf_alice"), 'm' to listOf("bm_lewis", "bm_daniel", "bm_fable"))
    const val NARRATOR = "bf_emma"
    private val FEM = Regex("^(Ms|Mrs|Miss)\\b"); private val MAS = Regex("^Mr\\b"); private val NEUTRAL = Regex("^(Dr|Professor|Prof)\\b|^(Customer|Shop|Speaker)"); private val FEM_END = Regex("(a|ei|ie)$", RegexOption.IGNORE_CASE)
    /** Fixed Kokoro (UK) voice per speaker: `_narrator` + one voice for each name of a dialogue (same rule as the web / the mediation-source corpus). */
    fun voices(src: MSource?): Map<String, String> {
        val out = LinkedHashMap<String, String>(); out["_narrator"] = NARRATOR
        val used = mutableMapOf('f' to 0, 'm' to 0)
        src?.lines?.map { it.first }?.distinct()?.forEachIndexed { i, s ->
            val g = if (FEM.containsMatchIn(s)) 'f' else if (MAS.containsMatchIn(s)) 'm' else if (NEUTRAL.containsMatchIn(s)) (if (i % 2 == 1) 'f' else 'm') else if (FEM_END.containsMatchIn(s)) 'f' else 'm'
            out[s] = POOL.getValue(g)[used.getValue(g)++ % 3]
        }
        return out
    }

    /** Listen-first: B2 and above except charts (text hidden until heard or "Show text"). */
    fun listenFirst(item: MItem, rule: List<String> = LISTEN_FIRST) = item.level in rule && item.source.kind != "chart"
    /** "30–55" or "30+". */
    fun range(item: MItem) = if (item.maxWords != null) "${item.minWords}–${item.maxWords}" else "${item.minWords}+"

    // ---- device-only storage (draft per lesson, best score per lesson) ----
    fun bestOf(e: JsonElement?): Map<String, Pair<Int, Int>> = (e as? JsonObject)?.mapNotNull { (k, v) -> (v as? JsonObject)?.let { o -> val a = (o["ok"] as? JsonPrimitive)?.intOrNull; val b = (o["of"] as? JsonPrimitive)?.intOrNull; if (a != null && b != null) k to (a to b) else null } }?.toMap() ?: emptyMap()
    fun bestJson(b: Map<String, Pair<Int, Int>>) = JsonObject(b.mapValues { JsonObject(mapOf("ok" to JsonPrimitive(it.value.first), "of" to JsonPrimitive(it.value.second))) })
    /** A better (more key ideas) result replaces the old one. */
    fun withBest(b: Map<String, Pair<Int, Int>>, id: String, ok: Int, of: Int): Map<String, Pair<Int, Int>> = if (b[id] == null || ok > b.getValue(id).first) b + (id to (ok to of)) else b

    // ---- parsing ----
    private fun JsonElement?.s(): String? = (this as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content
    private fun JsonElement?.strs() = (this as? JsonArray)?.map { (it as JsonPrimitive).content } ?: emptyList()
    private fun JsonElement?.groups() = (this as? JsonArray)?.map { g -> g.jsonArray.map { (it as JsonPrimitive).content } } ?: emptyList()
    private fun src(o: JsonObject): MSource {
        val t = o["text"]
        return MSource(o.s("kind").orEmpty(), if (t is JsonArray) t.strs() else listOfNotNull(t.s()),
            (o["lines"] as? JsonArray)?.map { l -> l.jsonObject.let { it.s("s").orEmpty() to it.s("t").orEmpty() } } ?: emptyList(), o.s("caption"), o["cols"].strs(),
            (o["rows"] as? JsonArray)?.map { r -> r.jsonArray.map { (it as JsonPrimitive).content } } ?: emptyList(), o.s("unit"), o.s("note"))
    }
    fun parse(o: JsonObject): MediationPack = MediationPack(o["levels"].strs().ifEmpty { LEVELS }, o["listenFirst"].strs().ifEmpty { LISTEN_FIRST }, (o["copyRun"] as? JsonPrimitive)?.intOrNull ?: COPY_RUN,
        (o["items"] as? JsonArray)?.map { e -> val x = e.jsonObject; val t = x.getValue("task").jsonObject
            MItem(x.s("id").orEmpty(), x.s("level").orEmpty(), x.s("activity").orEmpty(), x.s("title").orEmpty(), x.s("scenario").orEmpty(), src(x.getValue("source").jsonObject),
                t.s("mode") ?: "write", t.s("audience").orEmpty(), t.s("prompt").orEmpty(), (t["min_words"] as? JsonPrimitive)?.intOrNull ?: 0, (t["max_words"] as? JsonPrimitive)?.intOrNull,
                (x["points"] as? JsonArray)?.map { p -> p.jsonObject.let { MPoint(it.s("id").orEmpty(), it.s("idea").orEmpty(), it["checks"].groups()) } } ?: emptyList(),
                (x["leave_out"] as? JsonArray)?.map { p -> p.jsonObject.let { MLeave(it.s("idea").orEmpty(), it["checks"].groups()) } } ?: emptyList(),
                x.s("model").orEmpty(), x["useful"].strs(), x["tips"].strs(), x.s("explain").orEmpty()) } ?: emptyList())
}
