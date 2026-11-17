package com.lexkite.app

import com.lexkite.app.core.Answer
import com.lexkite.app.core.lesson.Found
import com.lexkite.app.core.lesson.Has
import com.lexkite.app.core.lesson.LItem
import com.lexkite.app.core.lesson.LessonEngine
import com.lexkite.app.core.lesson.LessonEngine.BuildOpts
import com.lexkite.app.core.lesson.MatchPair
import com.lexkite.app.core.lesson.Off
import com.lexkite.app.core.lesson.Pick
import com.lexkite.app.core.sync.Js
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlinx.serialization.json.put
import kotlinx.serialization.json.add
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** P03 parity: the Kotlin lesson engine reproduces web/js/lesson/engine.js on every case of vectors/lesson.json (JS run in node:vm by scripts/native/gen-lesson.mjs). */
class LessonVectorsTest {
    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("lesson.json")!!.readText()).jsonObject
    private val inputs = v.o("inputs")
    private val cards = inputs.a("cards").map { it.jsonObject }
    private val starter = inputs.a("starter").map { it.jsonObject }
    private val imgWords = inputs.a("imgWords").map { it.s() }.toSet()
    private val gloss = inputs.o("gloss")
    private val now = v.getValue("now").jsonPrimitive.long

    // ---------- helpers ----------
    private fun JsonObject.o(k: String) = getValue(k).jsonObject
    private fun JsonObject.a(k: String) = getValue(k).jsonArray
    private fun JsonElement.s() = jsonPrimitive.content
    private fun JsonObject.has(k: String) = containsKey(k) && this[k] !is JsonNull
    private fun JsonObject.b(k: String) = this[k]?.jsonPrimitive?.booleanOrNull ?: false

    private fun cardOf(ref: String): JsonObject = if (ref.startsWith("c:")) cards[ref.drop(2).toInt()] else starter[ref.drop(2).toInt()]
    private fun refOf(c: JsonObject?): String? = c?.let { x -> cards.indexOfFirst { it === x }.takeIf { it >= 0 }?.let { "c:$it" } ?: starter.indexOfFirst { it === x }.takeIf { it >= 0 }?.let { "s:$it" } ?: error("card not in inputs: $x") }
    private fun ref(c: JsonObject?): JsonElement = refOf(c)?.let { JsonPrimitive(it) } ?: JsonNull

    private fun strs(l: List<String>?) = l?.let { buildJsonArray { it.forEach { x -> add(x) } } }
    private fun LItem.json(alt: Boolean = false): JsonObject = buildJsonObject {
        if (!alt) { put("id", id); put("type", type); put("word", word); put("card", ref(card)) } else put("type", type)
        why?.let { put("why", it) }; ipa?.let { put("ipa", it) }; if (!alt) put("retry", retry)
        put("hints", strs(hints)!!); mean?.let { put("mean", it) }; noAudio?.let { put("noAudio", it) }
        sent?.let { put("sent", it) }; own?.let { put("own", it) }
        blank?.let { b -> put("blank", buildJsonObject { put("i", b.i); put("n", b.n); put("toks", strs(b.toks)!!); put("form", b.form) }) }
        if (answer.isNotEmpty() || word == "#match") put("answer", answer); strs(options)?.let { put("options", it) }; strs(tiles)?.let { put("tiles", it) }; prompt?.let { put("prompt", it) }; tr?.let { put("tr", it) }
        def?.let { put("def", it) }; len?.let { put("len", it) }; first?.let { put("first", it) }; strs(bank)?.let { put("bank", it) }
        this@json.alt?.let { put("alt", it.json(true)) }
        choice?.let { put("choice", it) }; spoke?.let { put("spoke", it) }
        pairs?.let { p -> put("pairs", buildJsonArray { p.forEach { m -> add(if (m.card != null) ref(m.card) else buildJsonObject { put("word", m.word); put("mean", m.mean ?: "") }) } }) }
        free?.let { put("free", it) }; who?.let { put("who", it) }; radio?.let { put("radio", it) }
    }

    private fun parseItem(j: JsonObject): LItem {
        fun sl(k: String) = j[k]?.takeIf { it is JsonArray }?.jsonArray?.map { it.s() }
        fun st(k: String) = j[k]?.takeIf { it !is JsonNull }?.s()
        fun bo(k: String) = j[k]?.takeIf { it !is JsonNull }?.jsonPrimitive?.booleanOrNull
        return LItem(j.getValue("id").jsonPrimitive.long.toInt(), j.s("type"), j.s("word"), (j["card"] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content?.let(::cardOf), st("why"), st("ipa"), (j["retry"] as? JsonPrimitive)?.long?.toInt() ?: 0,
            sl("hints").orEmpty(), st("mean"), bo("noAudio"), st("sent"), bo("own"),
            (j["blank"] as? JsonObject)?.let { Found(it.getValue("i").jsonPrimitive.long.toInt(), it.getValue("n").jsonPrimitive.long.toInt(), it.a("toks").map { x -> x.s() }, it.s("form")) },
            st("answer").orEmpty(), sl("options"), sl("tiles"), st("prompt"), st("tr"), st("def"), j["len"]?.jsonPrimitive?.long?.toInt(), st("first"), sl("bank"),
            (j["alt"] as? JsonObject)?.let { a -> parseItem(JsonObject(a + mapOf("id" to JsonPrimitive(0), "word" to JsonPrimitive("")))) }, bo("choice"), bo("spoke"), (j["pairs"] as? JsonArray)?.map { e -> if (e is JsonPrimitive) cardOf(e.content).let { c -> MatchPair(c.s("word"), null, c) } else e.jsonObject.let { o -> MatchPair(o.s("word"), o.s("mean")) } }, bo("free"), st("who"), bo("radio"))
    }
    private fun JsonObject.s(k: String) = getValue(k).jsonPrimitive.content

    private fun diff(path: String, e: JsonElement?, g: JsonElement?, tol: Double = 1e-9): String? {
        if (e == null || g == null) return if (e == g) null else "$path: expected $e got $g"
        return when {
            e is JsonObject && g is JsonObject -> { val ks = e.keys + g.keys; ks.firstNotNullOfOrNull { k -> diff("$path.$k", e[k], g[k], tol) } }
            e is JsonArray && g is JsonArray -> if (e.size != g.size) "$path: size ${e.size} vs ${g.size}" else e.indices.firstNotNullOfOrNull { diff("$path[$it]", e[it], g[it], tol) }
            e is JsonPrimitive && g is JsonPrimitive && !e.isString && !g.isString && e !is JsonNull && g !is JsonNull && e.booleanOrNull == null && g.booleanOrNull == null ->
                if (Math.abs(e.content.toDouble() - g.content.toDouble()) <= tol) null else "$path: $e vs $g"
            else -> if (e == g) null else "$path: expected $e got $g"
        }
    }
    private fun check(errs: List<String?>) = assertTrue(errs.filterNotNull().let { "${it.size} mismatches:\n" + it.take(15).joinToString("\n") }, errs.all { it == null })

    private val picksById: Map<String, List<Pick>> by lazy {
        v.a("pickWords").associate { c ->
            val o = c.jsonObject; val sel = when (o.s("cards")) { "none" -> emptyList(); "new" -> cards.filter { LessonEngine.isNew(it) }; "noex" -> cards.filter { x -> listOf("ex", "ctx", "sentences").none { k -> x[k]?.let { e -> e !is JsonNull && !(e is JsonPrimitive && e.content.isEmpty()) && !(e is JsonArray && e.isEmpty()) } == true } }; else -> cards }
            val op = o.o("opts")
            o.s("id") to LessonEngine.pickWords(sel, op["n"]?.jsonPrimitive?.long?.toInt() ?: 6, op.getValue("now").jsonPrimitive.long, op["mode"]?.s(), if (o.b("starter")) starter else emptyList())
        }
    }

    // ---------- tests ----------
    @Test fun pickWordsMatchesWeb() = check(v.a("pickWords").map { c ->
        val o = c.jsonObject; val got = buildJsonArray { picksById.getValue(o.s("id")).forEach { p -> add(buildJsonObject { put("card", ref(p.card)); put("why", p.why) }) } }
        diff(o.s("id"), o.getValue("out"), got)
    })

    private fun buildOf(b: JsonObject): List<LItem> {
        val picks = picksById.getValue(b.s("pick")); val off = b["off"]?.jsonObject?.let { Off(it.b("listen"), it.b("speak")) } ?: Off()
        val hasImg: (String, String) -> Boolean = { w, _ -> b.b("img") && w in imgWords }
        val glossFn: (JsonObject, String) -> String = { _, en -> gloss[en]?.s().orEmpty() }
        val meanFn: (JsonObject) -> String = { c -> if (b.s("mean") == "vi") (c["vi"] as? JsonPrimitive)?.content.orEmpty() else "" }
        return LessonEngine.build(picks, BuildOpts(b.getValue("seed").jsonPrimitive.long, cards + starter, off, b["only"]?.jsonArray?.map { it.s() }, b.b("calm"), b["perWord"]?.jsonPrimitive?.long?.toInt() ?: 0,
            b["match"]?.jsonPrimitive?.booleanOrNull ?: true, hasImg, if (b.b("gloss")) glossFn else null, meanFn))
    }
    private val builds: Map<String, List<LItem>> by lazy { v.a("build").associate { it.jsonObject.s("id") to buildOf(it.jsonObject) } }

    @Test fun buildMatchesWeb() = check(v.a("build").map { b -> val o = b.jsonObject
        diff(o.s("id"), o.getValue("out"), buildJsonArray { builds.getValue(o.s("id")).forEach { add(it.json()) } }) })

    @Test fun adaptMatchesWeb() {
        val a = v.o("adapt"); val offs = a.a("offs").map { it.jsonObject }
        check(a.a("cases").flatMap { c -> c.jsonObject.a("outs").map { x ->
            val o = x.jsonObject.o("off"); val item = parseItem(c.jsonObject.o("in"))
            diff("adapt(${item.id},$o)", x.jsonObject.getValue("out"), LessonEngine.adapt(item, Off(o.b("listen"), o.b("speak"))).json())
        } })
        assertEquals(4, offs.size)
    }

    @Test fun checkMatchesWeb() = v.a("check").forEach { c ->
        val it0 = c.jsonObject.o("item"); val item = LItem(0, it0.s("type"), "", null, answer = it0.s("answer"), choice = it0["choice"]?.jsonPrimitive?.booleanOrNull)
        c.jsonObject.a("cases").forEach { k ->
            val a = k.jsonObject.getValue("ans")
            val given: Answer.Given = when {
                a is JsonArray -> Answer.Given.Words(a.map { it.s() })
                a is JsonPrimitive && a.isString -> Answer.Given.Text(a.content)
                a is JsonPrimitive && a.booleanOrNull != null -> Answer.Given.Matched(a.booleanOrNull!!)
                else -> Answer.Given.Score(a.jsonPrimitive.content.toDouble())
            }
            assertEquals("${item.type} $a", k.jsonObject.b("ok"), LessonEngine.check(item, given))
        }
    }

    @Test fun sessionsMatchWeb() = check(v.a("session").flatMap { sj ->
        val s = sj.jsonObject; val items = builds.getValue(s.s("build")); val op = s.o("opts")
        val sess = LessonEngine.Session(items, op["maxRetry"]?.jsonPrimitive?.long?.toInt(), op.b("ease")); val script = s.s("script")
        val errs = ArrayList<String?>()
        errs.add(diff("${s.s("id")}.total", s.o("start").getValue("total"), JsonPrimitive(sess.total)))
        var i = 0
        for (st in s.a("steps").map { it.jsonObject }) {
            val ch = script.getOrNull(i) ?: '1'; i++
            val res = if (ch == 's') { sess.skip(); null } else sess.answer(ch != '0')
            errs.add(diff("${s.s("id")}.step$i", st, buildJsonObject {
                put("op", if (ch == 's') "skip" else if (ch == '0') "wrong" else "right")
                put("res", res?.let { r -> buildJsonObject { put("ok", r.ok); put("combo", r.combo); r.requeued?.let { put("requeued", it) }; r.free?.let { put("free", it) } } } ?: JsonNull)
                put("cur", sess.cur?.id?.let { JsonPrimitive(it) } ?: JsonNull); put("curRetry", sess.cur?.retry?.let { JsonPrimitive(it) } ?: JsonNull)
                put("solved", sess.solved); put("progress", sess.progress); put("combo", sess.combo); put("best", sess.best); put("n", sess.n); put("ok1", sess.ok1); put("miss", sess.miss)
                put("accuracy", sess.accuracy); put("done", sess.done)
                put("q", buildJsonArray { sess.q.forEach { x -> add(buildJsonArray { add(x.id); add(x.retry) }) } })
            }))
        }
        errs.add(diff("${s.s("id")}.done", JsonPrimitive(true), JsonPrimitive(sess.done)))
        errs.add(diff("${s.s("id")}.log", s.getValue("log"), buildJsonArray { sess.log.forEach { l -> add(buildJsonObject { put("id", l.id); put("type", l.type); put("word", l.word); if (l.skip) put("skip", true) else { put("ok", l.ok!!); put("retry", l.retry!!) } }) } }))
        errs.add(diff("${s.s("id")}.wrong", s.getValue("wrong"), buildJsonObject { sess.wrong.forEach { (k, n) -> put(k, n) } }))
        errs.add(diff("${s.s("id")}.firstOk", s.getValue("firstOk"), buildJsonArray { sess.firstOk.forEach { add(it) } }))
        val rn = s.getValue("resultsNow").jsonPrimitive.long
        errs.add(diff("${s.s("id")}.results", s.getValue("results"), buildJsonArray { LessonEngine.results(sess, items, cards, rn).forEach { r -> add(buildJsonObject { put("word", r.word); put("grade", r.grade); put("add", r.add); put("card", ref(r.card)) }) } }))
        errs
    })

    @Test fun rngShuffleLetterBankMatchWeb() {
        check(v.a("rng").map { c -> val o = c.jsonObject; val r = LessonEngine.rng(o.getValue("seed").jsonPrimitive.long)
            diff("rng(${o.getValue("seed")})", o.getValue("out"), buildJsonArray { repeat(8) { add(Math.round(r.next() * 1e6) / 1e6) } }, 2e-6) })
        check(v.a("shuffle").map { c -> val o = c.jsonObject
            diff("shuffle", o.getValue("out"), buildJsonArray { LessonEngine.shuffle(o.a("in").map { it.s() }, LessonEngine.rng(o.getValue("seed").jsonPrimitive.long)).forEach { add(it) } }) })
        check(v.a("letterBank").map { c -> val o = c.jsonObject
            diff("letterBank(${o.s("word")})", o.getValue("out"), buildJsonArray { LessonEngine.letterBank(o.s("word").lowercase(), LessonEngine.rng(o.getValue("seed").jsonPrimitive.long)).forEach { add(it) } }) })
    }

    @Test fun textHelpersMatchWeb() {
        v.a("toks").forEach { c -> assertEquals(c.jsonObject.a("out").map { it.s() }, LessonEngine.toks(c.jsonObject.s("in"))) }
        v.a("norm").forEach { c -> assertEquals(c.jsonObject.s("out"), LessonEngine.norm(c.jsonObject.s("in"))) }
        check(v.a("findWord").map { c -> val o = c.jsonObject; val f = LessonEngine.findWord(o.s("sentence"), o.s("word"))
            diff("findWord(${o.s("word")})", o.getValue("out"), f?.let { buildJsonObject { put("i", it.i); put("n", it.n); put("toks", strs(it.toks)!!); put("form", it.form) } } ?: JsonNull) })
        check(v.a("sentenceOf").map { c -> val o = c.jsonObject; val s = LessonEngine.sentenceOf(cardOf(o.s("card")))
            diff("sentenceOf(${o.s("card")})", o.getValue("out"), s?.let { x -> buildJsonObject { put("text", x.text); put("own", x.own); x.tr?.let { put("tr", it) }
                put("at", buildJsonObject { put("i", x.at.i); put("n", x.at.n); put("toks", strs(x.at.toks)!!); put("form", x.at.form) }) } } ?: JsonNull) })
        check(v.a("stress").map { c -> val o = c.jsonObject; val s = LessonEngine.stress(o.s("ipa"))
            diff("stress(${o.s("ipa")})", o.getValue("out"), s?.let { buildJsonObject { put("syl", it.syl); put("of", it.of) } } ?: JsonNull) })
        check(v.a("usuk").map { c -> val o = c.jsonObject; val u = LessonEngine.usuk(o["card"] as? JsonObject) // card may be JSON null
            diff("usuk", o.getValue("out"), u?.let { buildJsonObject { put("uk", it.first); put("us", it.second) } } ?: JsonNull) })
        check(v.a("visemes").map { c -> val o = c.jsonObject; val d = o["dur"]?.takeIf { it !is JsonNull }?.jsonPrimitive?.content?.toDouble()
            diff("visemes(${o.s("text")})", o.getValue("out"), buildJsonArray { LessonEngine.visemes(o.s("text"), d).forEach { (t, s) -> add(buildJsonArray { add(t); add(s) }) } }) })
    }

    @Test fun plansMatchWeb() {
        val day = LessonEngine.DAY
        for (p in v.a("plans").map { it.jsonObject }) {
            val n = p.getValue("now").jsonPrimitive.long
            val set: List<JsonObject> = when (p.s("cards")) {
                "none" -> emptyList()
                "many-due" -> cards.map { c -> JsonObject(c + ("srs" to buildJsonObject { put("ef", 2.5); put("interval", 3); put("reps", 2); put("lapses", 1); put("due", n - 2 * day); put("last", n - 5 * day); put("step", 0); put("S", 3); put("D", 5) })) }
                else -> cards
            }
            fun has(o: JsonObject) = Has(o.has("story"), o.has("radio"), o.has("odd"), o.has("exam"))
            for (e in p.a("path").map { it.jsonObject }) assertEquals("path ${e.o("has")}", e.a("out").map { it.s() }, LessonEngine.pathPlan(set, n, has(e.o("has"))).map { it.kind })
            for (e in p.a("unit").map { it.jsonObject }) assertEquals("unit ${e.o("has")}", e.a("out").map { it.s() }, LessonEngine.unitPlan(set, n, has(e.o("has"))).map { it.kind })
        }
        v.a("nextKind").forEach { c -> val o = c.jsonObject; val ctx = o.o("ctx")
            assertEquals("nextKind ${o.s("kind")} $ctx", o.s("out"), LessonEngine.nextKind(o.s("kind"), ctx["acc"]?.takeIf { it !is JsonNull }?.jsonPrimitive?.content?.toDouble(), Js.truthy(ctx["due"]))) } // JS `!ctx.due`: due is a count (3) or 0, not a boolean
        v.a("isDue").forEach { c -> val o = c.jsonObject; val card = cardOf(o.s("card"))
            assertEquals("isDue ${o.s("card")}", o.b("isDue"), LessonEngine.isDue(card, o.getValue("now").jsonPrimitive.long)); assertEquals("fromExt ${o.s("card")}", o.b("fromExt"), LessonEngine.fromExt(card)) }
    }

    @Test fun calmAndHardMatchWeb() {
        val c = v.o("calm"); val items = c.a("in").map { LItem(it.jsonObject.getValue("id").jsonPrimitive.long.toInt(), it.jsonObject.s("type"), it.jsonObject.s("word"), null) }
        assertEquals(c.a("out").map { it.jsonPrimitive.long.toInt() }, LessonEngine.calm(items).map { it.id })
        v.a("hard").forEach { h -> val o = h.jsonObject.o("item")
            assertEquals("hard $o", h.jsonObject.b("out"), LItem(0, o.s("type"), "", null, spoke = o["spoke"]?.jsonPrimitive?.booleanOrNull, choice = o["choice"]?.jsonPrimitive?.booleanOrNull).hard) }
    }

    private val stories: List<JsonObject> by lazy {
        val t = File("../../../web/cpack/lesson/stories.js").readText()
        Json.parseToJsonElement(t.substring(t.indexOf("self.LESSON_STORIES")).substringAfter("=").trim().removeSuffix(";").trim()).jsonArray.map { it.jsonObject }
    }

    @Test fun storyItemsAndSessionMatchWeb() {
        check(v.a("storyItems").map { c -> val o = c.jsonObject; val st = stories.first { it.s("id") == o.s("story") }
            diff("story ${o.s("story")}/${o.s("lang")}", o.getValue("out"), buildJsonArray { LessonEngine.storyItems(st, o.s("lang"), o.getValue("seed").jsonPrimitive.long).forEach { add(it.json()) } }) })
        val ss = v.o("storySession"); val st = stories.first { it.s("id") == ss.s("story") }
        val sess = LessonEngine.Session(LessonEngine.storyItems(st, ss.s("lang"), ss.getValue("seed").jsonPrimitive.long))
        check(ss.a("steps").mapIndexed { i, e ->
            val it = sess.cur!!; val res = sess.answer(if (it.free == true) true else i % 4 != 0)
            diff("storySession.step$i", e.jsonObject, buildJsonObject {
                put("op", e.jsonObject.s("op")); put("type", it.type)
                put("res", res?.let { r -> buildJsonObject { put("ok", r.ok); put("combo", r.combo); r.requeued?.let { q -> put("requeued", q) }; r.free?.let { q -> put("free", q) } } } ?: JsonNull)
                put("solved", sess.solved); put("progress", sess.progress); put("combo", sess.combo); put("best", sess.best); put("n", sess.n); put("ok1", sess.ok1); put("accuracy", sess.accuracy); put("done", sess.done)
                put("q", buildJsonArray { sess.q.forEach { x -> add(buildJsonArray { add(x.id); add(x.retry) }) } })
            })
        })
        assertNull(null)
    }

    @Test fun constsMatchWeb() {
        val c = v.o("consts")
        c.o("HINTS").forEach { (k, e) -> assertEquals(k, e.jsonArray.map { it.s() }, LessonEngine.HINTS[k]) }
        c.o("KIND").forEach { (k, e) -> assertEquals(k, (e as? JsonArray)?.map { it.s() }, LessonEngine.KIND[k]) }
        assertEquals(c.getValue("DAY").jsonPrimitive.long, LessonEngine.DAY)
    }
}
