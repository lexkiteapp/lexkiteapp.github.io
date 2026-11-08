package com.lexkite.app

import com.lexkite.app.core.SRS
import com.lexkite.app.core.dict.Dict
import com.lexkite.app.core.dict.DictCfg
import com.lexkite.app.core.dict.DictNet
import com.lexkite.app.core.dict.DictPage
import com.lexkite.app.core.dict.IndexLexSource
import com.lexkite.app.core.dict.Lex
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.usage.Usage
import com.lexkite.app.core.verbs.VerbData
import com.lexkite.app.core.verbs.Verbs
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.ChoiceKit
import com.lexkite.app.core.vocab.Deck
import com.lexkite.app.core.vocab.Library
import com.lexkite.app.core.vocab.LessonFx
import com.lexkite.app.core.vocab.Mistakes
import com.lexkite.app.core.vocab.Practice
import com.lexkite.app.core.vocab.Qe
import com.lexkite.app.core.vocab.Review
import com.lexkite.app.core.vocab.StudyModes
import com.lexkite.app.core.vocab.Topic
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.VStats
import com.lexkite.app.core.vocab.WebWords
import com.lexkite.app.core.vocab.WordBook
import com.lexkite.app.core.vocab.WordGroup
import com.lexkite.app.core.write.Ideas
import com.lexkite.app.core.write.Letters
import com.lexkite.app.core.write.Lemmatizer
import com.lexkite.app.core.write.Models
import com.lexkite.app.core.write.Paraphrase
import com.lexkite.app.core.write.WritingData
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * P04/P05 parity (M3 vocabulary screens): the Kotlin logic reproduces the web pages on every case of vectors/vocab.json (web code run in node:vm by scripts/native/gen-vocab.mjs).
 * One test per top-level key. Word data and writing content are read from the web scripts themselves (../../../web), exactly what the app downloads.
 */
class VocabVectorsTest {
    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("vocab.json")!!.readText()).jsonObject
    private val now = v.getValue("now").jsonPrimitive.long
    private val DAY = 86_400_000L
    private val MIN = 60_000L
    private val web = File("../../../web")
    private val gen = File("../../shared/gen")

    // ---------- helpers ----------
    private fun JsonObject.o(k: String) = getValue(k).jsonObject
    private fun JsonObject.a(k: String) = getValue(k).jsonArray
    private fun JsonElement.s() = if (this is JsonNull) "" else jsonPrimitive.content
    private fun JsonObject.s(k: String) = this[k]?.let { if (it is JsonNull) "" else it.jsonPrimitive.content } ?: ""
    private fun JsonObject.n(k: String) = Js.num(this[k])
    private fun J(x: Any?): JsonElement = when (x) { null -> JsonNull; is JsonElement -> x; is String -> JsonPrimitive(x); is Boolean -> JsonPrimitive(x); is Int -> JsonPrimitive(x); is Long -> JsonPrimitive(x); is Double -> JsonPrimitive(x)
        is Map<*, *> -> JsonObject(x.entries.associate { it.key.toString() to J(it.value) }); is Iterable<*> -> JsonArray(x.map { J(it) }); else -> JsonPrimitive(x.toString()) }
    private fun obj(vararg p: Pair<String, Any?>) = J(mapOf(*p)) as JsonObject

    /** Deep compare: numbers within 1e-9, strings exact, an absent key equals JSON null. */
    private fun eq(path: String, want: JsonElement?, got: JsonElement?) {
        val w = want ?: JsonNull; val g = got ?: JsonNull
        when {
            w is JsonObject && g is JsonObject -> for (k in (w.keys + g.keys)) eq("$path.$k", w[k], g[k])
            w is JsonArray && g is JsonArray -> { assertEquals("$path length", w.size, g.size); for (i in w.indices) eq("$path[$i]", w[i], g[i]) }
            w is JsonPrimitive && g is JsonPrimitive && w !is JsonNull && g !is JsonNull -> {
                if (!w.isString && !g.isString && w.booleanOrNull == null && g.booleanOrNull == null) assertEquals("$path", w.content.toDouble(), g.content.toDouble(), 1e-9)
                else assertEquals("$path", w.content, g.content)
            }
            else -> assertEquals("$path (got ${Js.stringify(g)} want ${Js.stringify(w)})", w is JsonNull, g is JsonNull)
        }
    }
    private fun check(path: String, want: JsonElement?, got: Any?) = eq(path, want, J(got))

    // ---------- fixtures ----------
    private val inputs by lazy { v.o("inputs") }
    private val A by lazy { inputs.a("A").map { it.jsonObject } }
    private val B by lazy { inputs.a("B").map { it.jsonObject } }
    private fun keyed(list: List<JsonObject>): LinkedHashMap<String, JsonObject> = LinkedHashMap<String, JsonObject>().also { m -> for (c in list) m[CardMath.keyOf(c.s("word"))] = c }
    private fun deck(name: String): LinkedHashMap<String, JsonObject> = keyed(when (name) {
        "A" -> A; "B" -> B; "P" -> A + B; "tiny" -> A.subList(6, 8); "none" -> emptyList()
        "future" -> A.filter { it.o("srs").let { s -> Js.truthy(s["last"]) && s.n("due") > now + DAY } }
        "forget" -> A.subList(0, 4).mapIndexed { i, c -> if (i < 2) JsonObject(c + ("srs" to JsonObject(c.o("srs") + mapOf("reps" to J(3), "interval" to J(30), "S" to J(5), "last" to J(now - 25 * DAY), "due" to J(now - 5 * DAY))))) else c }
        else -> error(name) })
    private fun query(q: String): Map<String, String> = if (q.isEmpty()) emptyMap() else q.split("&").associate { it.substringBefore("=") to java.net.URLDecoder.decode(it.substringAfter("=", ""), "UTF-8") }

    private val words: WebWords by lazy {
        val app = File(web, "js/app.js").readText()
        fun pack(k: String) = Regex("\\b$k: (\\[[^\\]]+\\])").find(app)!!.groupValues[1].let { l -> Regex("'([^']+)'").findAll(l).map { it.groupValues[1] }.toList() }
        val libs = (pack("words") + pack("tsl")).filter { it.startsWith("js/lib/") }.map { File(web, it).readText() }
        WebWords.fromScripts(File(web, "js/data.js").readText(), libs)
    }
    private val verbData: VerbData by lazy { VerbData.parse(File(gen, "verbs.json").readText()) }
    private val verbs: Verbs by lazy { Verbs(verbData) }
    // the real records cut down, carried by the vectors (vocab.json `data`): the mini library for library / pool / model pages and the reduced writing content
    private val data by lazy { v.o("data") }
    private val miniWords: WebWords by lazy { data.o("catalog").let { c ->
        WebWords(c.a("topics").map { it.jsonObject }.map { t -> Topic(t.s("id"), t.s("name"), t.s("emoji"), t.s("desc"), t.s("group"), t.a("words").map { it.jsonObject }) },
            c.a("groups").map { it.jsonObject }.map { g -> WordGroup(g.s("id"), g.s("name"), g.s("emoji"), g.s("desc")) }) } }
    private val mini: WritingData by lazy { data.o("writing").let { w ->
        WritingData(w.a("ideas").map { it.jsonObject }, w.a("letters").map { it.jsonObject }, w.a("paraphrase").map { it.jsonArray.let { p -> p[0].s() to p[1].s() } }, w.a("models").map { it.jsonObject },
            w.a("prompts").map { it.jsonObject }, w.a("task1").map { it.jsonObject }) } }
    private val usage: Usage by lazy {
        val files = File(web, "js/usage").listFiles()!!.sortedBy { it.name }.map { it.readText() }
        Usage.fromScripts(files, File(web, "js/usage-index.js").readText(), verbs)
    }
    private val writing: WritingData by lazy {
        fun t(p: String) = File(web, p).readText()
        WritingData.fromScripts(t("cpack/write/ideas.js"), t("js/lib/paraphrase-data.js"),
            listOf("js/models.js", "cpack/write/models2.js", "cpack/write/models3.js", "cpack/write/models4.js", "cpack/write/models5.js", "js/write/gt-letters.js", "cpack/write/task2-more.js", "js/write/task1-more.js", "js/write/task1-more2.js").map { t(it) },
            t("js/write.js"), listOf(t("cpack/write/task2-more.js")), t("js/task1.js"), listOf(t("js/write/task1-more.js"), t("js/write/task1-more2.js")))
    }
    private fun lex() = Lex(IndexLexSource(words.index, verbs.irregularList()))

    // ====================================================== #/review ======================================================
    @Test fun review_queue() {
        for (c in v.a("review").map { it.jsonObject }) {
            val inp = c.o("input"); val set = inp.o("settings"); val cards = deck(inp.s("deck"))
            val seen = inp.o("seen").entries.associate { it.key to it.value.jsonPrimitive.long }
            val o = Review.open(cards, set, inp.o("stats"), seen, query(inp.s("query")), now)
            val out = c.o("out"); val id = c.s("id")
            assertEquals(id, out.s("state"), o.state)
            check("$id.queue", out["queue"], o.queue); assertEquals(id, out.n("total").toInt(), o.total)
            assertEquals(id, out.s("hash"), o.redirect ?: "#/review")
        }
    }

    @Test fun review_session() {
        for (c in v.a("reviewSession").map { it.jsonObject }) {
            val inp = c.o("input"); val cards = deck(inp.s("deck"))
            val seen = inp.o("seen").entries.associate { it.key to it.value.jsonPrimitive.long }
            val q = Review.open(cards, inp.o("settings"), inp.o("stats"), seen, query(inp.s("query")), now).queue
            val s = Review.Session(q, cards, inp.o("stats"), SRS())
            val steps = c.a("steps").map { it.jsonObject }; var si = 0
            for (g in c.a("script")) {
                if (s.queue.isEmpty()) break
                val before = s.queue.first(); val st = steps[si++]; val id = "${c.s("id")}#$si"
                val wasNew = cards.getValue(before).let { CardMath.isNew(it) }
                if (g.jsonPrimitive.isString) { s.undo(now) } else s.grade(g.jsonPrimitive.content.toInt(), now)
                assertEquals(id, st.s("word"), before)
                assertEquals(id, st.s("op") == "grade", !g.jsonPrimitive.isString)
                if (st.s("op") == "grade") assertEquals(id, st.getValue("wasNew").jsonPrimitive.booleanOrNull, wasNew)
                check("$id.queue", st["queue"], s.queue); assertEquals(id, st.n("done").toInt(), s.done); assertEquals(id, st.n("again").toInt(), s.again)
                check("$id.missed", st["missed"], s.missed); assertEquals(id, st.n("xp").toInt(), s.xp); check("$id.g", st["g"], s.g.toList()); assertEquals(id, st.n("total").toInt(), s.total)
                val shown = if (st.s("op") == "grade") before else s.queue.first()
                check("$id.srs", st["srs"], CardMath.srsView(s.cards.getValue(shown).o("srs")))
                val key = CardMath.todayKey(now)
                assertEquals(id, st.n("statsDay"), s.stats.o("days")[key]?.let { Js.num(it) } ?: 0.0, 1e-9)
                check("$id.newToday", st["newToday"], s.stats["newToday"])
                if (st.s("op") == "grade") assertEquals(id, st.getValue("summary").jsonPrimitive.booleanOrNull, s.queue.isEmpty())
            }
        }
    }

    @Test fun review_modes() {
        val m = v.o("reviewModes")
        check("modes", m["modes"], StudyModes.MODES)
        fun mk(srs: JsonObject, extra: Map<String, JsonElement> = emptyMap()) = JsonObject(mapOf("word" to J("tuition"), "pos" to J("n"), "vi" to J("học phí"), "srs" to JsonObject(mapOf("reps" to J(3), "lapses" to J(0), "D" to J(4), "S" to J(5), "last" to J(now - DAY), "interval" to J(4)) + srs)) + extra)
        for (c in m.a("auto").map { it.jsonObject }) {
            val srs = if (c.s("id") == "legacy-ef") JsonObject(c.o("input") + ("D" to JsonNull)) else c.o("input")
            // JS spread of D: undefined removes the key; JsonNull stands for it here
            val card = mk(srs).let { x -> if (c.s("id") == "legacy-ef") JsonObject(x + ("srs" to JsonObject(x.o("srs") - "D"))) else x }
            assertEquals(c.s("id"), c.s("out"), StudyModes.auto(card))
        }
        val cards = deck("P"); val lib = words.topics.flatMap { it.words }
        for (c in m.a("pick").map { it.jsonObject }) {
            val inp = c.o("input"); val cd = inp.o("card")
            val card = JsonObject(mapOf("word" to cd["word"]!!, "pos" to J("n"), "vi" to J("học phí"), "srs" to cd["srs"]!!))
            val r = StudyModes.pick(card, inp.s("want"), inp.getValue("rev").jsonPrimitive.booleanOrNull!!, cards.values, lib, true, null)
            val out = c.o("out")
            assertEquals(c.s("id"), out.s("mode"), r.mode); assertEquals(c.s("id"), out.getValue("optionsFound").jsonPrimitive.booleanOrNull, r.options != null)
            assertEquals(c.s("id"), out.n("optionCount").toInt(), r.options?.all?.size ?: 0)
        }
        for (c in m.a("gradeType").map { it.jsonObject }) { val i = c.o("input"); assertEquals(Js.stringify(i), c.n("out").toInt(), StudyModes.gradeType(i.n("dist").toInt(), i.n("len").toInt(), i.n("hints").toInt(), i.n("ms").toLong(), i.getValue("gaveUp").jsonPrimitive.booleanOrNull!!)) }
        for (c in m.a("gradeAudio").map { it.jsonObject }) { val i = c.o("input"); assertEquals(Js.stringify(i), c.n("out").toInt(), StudyModes.gradeAudio(i.getValue("ok").jsonPrimitive.booleanOrNull!!, i.n("replays").toInt(), i.n("ms").toLong())) }
        for (c in m.a("norm").map { it.jsonObject }) assertEquals(c.s("input"), c.s("out"), StudyModes.norm(c.s("input")))
        for (c in m.a("dist").map { it.jsonObject }) { val a = c["input"]!!.jsonArray; assertEquals(a.toString(), c.n("out").toInt(), StudyModes.dist(a[0].s(), a[1].s())) }
        val long = "x ".repeat(150) + "tuition " + "y ".repeat(150)
        for ((i, c) in m.a("trim").map { it.jsonObject }.withIndex()) { val text = if (i == 0) c.o("input").s("text") else long; assertEquals("trim$i", c.s("out"), StudyModes.trim(text, "tuition")) }
        for (c in m.a("host").map { it.jsonObject }) assertEquals(c.s("input"), c.s("out"), StudyModes.host(c.s("input")))
    }

    // ====================================================== #/mistakes ======================================================
    private fun objs(a: JsonArray) = a.map { it.jsonObject }
    @Test fun mistakes_log() {
        val log = v.o("mistakes").a("log").map { it.jsonObject }
        var list = emptyList<JsonObject>()
        for ((i, m) in log[0].a("input").withIndex()) list = Mistakes.log(list, m.jsonObject, now + i * 1000L)
        check("log-4", log[0]["out"], list)
        val seed = JsonObject(mapOf("kind" to J("vocab"), "q" to J("Nghĩa của “abandon”?"), "key" to J("vocab|Nghĩa của “abandon”?"), "answer" to J("từ bỏ"), "given" to J(""), "explain" to J(""), "ref" to J("abandon"), "n" to J(3), "at" to J(now - DAY), "fixed" to J(true)))
        check("log-reopen-fixed", log[1]["out"], Mistakes.log(listOf(seed), log[0].a("input")[0].jsonObject, now))
        var big = emptyList<JsonObject>()
        for (i in 0 until 305) big = Mistakes.log(big, obj("kind" to "vocab", "q" to "q$i", "answer" to "a", "given" to ""), now + i)
        val o = log[2].o("out"); assertEquals(o.n("length").toInt(), big.size); assertEquals(o.s("first"), big.first().s("q")); assertEquals(o.s("last"), big[299].s("q"))
    }
    @Test fun mistakes_view() { for (c in v.o("mistakes").a("view").map { it.jsonObject }) check(Js.stringify(c["input"]), c["out"], Mistakes.view(c.o("input")).json()) }
    private fun listCase(c: JsonObject, seed: List<JsonObject>, retry: Boolean) {
        val (migrated, changed) = Mistakes.migrate(seed); val open = Mistakes.openOnes(migrated); val out = c.o("out"); val id = c.s("id")
        check("$id.counts", out["counts"], Mistakes.counts(open))
        assertEquals(id, out.getValue("retryButton").jsonPrimitive.booleanOrNull, open.isNotEmpty() && !retry)
        assertEquals(id, out.getValue("listButton").jsonPrimitive.booleanOrNull, open.isNotEmpty() && retry)
        assertEquals(id, out.getValue("forgettingButton").jsonPrimitive.booleanOrNull, open.isNotEmpty())
        for ((tab, keys) in out.o("tabs")) check("$id.tab.$tab", keys, Mistakes.rows(open, if (tab == "all") "" else tab, retry).map { it.s("key") })
        assertEquals(id, out.getValue("empty").jsonPrimitive.booleanOrNull, Mistakes.rows(open, "", retry).isEmpty())
        check("$id.stored", out["storedAfterOpen"], changed.map { x -> obj("key" to x["key"], "qK" to x["qK"], "givenK" to x["givenK"], "explainK" to x["explainK"]) })
    }
    @Test fun mistakes_list() { for (c in v.o("mistakes").a("list").map { it.jsonObject }) listCase(c, objs(c.o("input").a("seed")), c.o("input").s("query").contains("retry=1")) }
    @Test fun mistakes_retry() {
        val seed = objs(v.o("mistakes").a("list")[0].jsonObject.o("input").a("seed"))
        for (c in v.o("mistakes").a("retry").map { it.jsonObject }) {
            var list: List<JsonObject> = seed; val rewards = ArrayList<Any?>()
            for (st in c.o("input").a("steps").map { it.jsonObject }) {
                val key = st.s("key")
                when (st.s("do")) {
                    "type" -> { val ok = Mistakes.typedOk(st.s("value"), list.first { it.s("key") == key }.s("answer")); val r = Mistakes.settle(list, key, ok); list = r.first; if (ok) rewards.add(mapOf("xp" to r.second)) }
                    "ok" -> { val r = Mistakes.settle(list, key, true); list = r.first; rewards.add(mapOf("xp" to r.second)) }
                    "no" -> list = Mistakes.settle(list, key, false).first
                    "fix" -> { val r = Mistakes.fix(list, key); list = r.first; rewards.add(mapOf("xp" to r.second)) }
                    "clear" -> list = Mistakes.clearFixed(list)
                }
            }
            val out = c.o("out")
            check("${c.s("id")}.stored", out["stored"], list.map { obj("key" to it["key"], "n" to it["n"], "fixed" to it["fixed"]) }); check("${c.s("id")}.rewards", out["rewards"], rewards)
        }
    }

    // ====================================================== #/deck · #/library · #/topic · word book ======================================================
    @Test fun deck() {
        for (c in v.a("deck").map { it.jsonObject }) {
            val inp = c.o("input"); val cards = deck(inp.s("deck")).values.toList(); val f0 = Deck.fromQuery(query(inp.s("query"))); val fl = inp.o("filters")
            val f = Deck.Filter(if (fl.containsKey("q")) fl.s("q") else f0.q, if (fl.containsKey("topic")) fl.s("topic") else f0.topic, if (fl.containsKey("from")) fl.s("from") else f0.from, if (fl.containsKey("m")) fl.s("m") else f0.m)
            val id = c.s("id"); val out = c.o("out")
            assertEquals(id, out.o("selected").s("from"), f.from)
            val rows = Deck.rows(cards, f, now)
            check("$id.rows", out.a("rows"), rows.take(Deck.MAX_ROWS).map { r -> val x = Deck.row(r, now); obj("word" to x.word, "ipa" to x.ipa, "mean" to x.mean, "note" to x.note, "retention" to x.retention, "thumb" to x.thumb) })
            assertEquals(id, out.getValue("empty").jsonPrimitive.booleanOrNull, rows.isEmpty())
            val (n, k) = Deck.headline(cards); assertEquals(id, out.s("headline"), Tx.RAW.t("{n} từ · {k} đã thuộc", mapOf("n" to "$n", "k" to "$k")))
        }
    }

    private fun headingOf(words: WebWords, gid: String, sec: Library.Section): String = when {
        gid == "mine" && sec.collections.isNotEmpty() -> "📌 Thư viện của tôi"
        gid == "mine" -> "📚 Bộ từ IELTS đang học"
        else -> words.groups.first { it.id == gid }.let { it.emoji + " " + it.name }
    }
    @Test fun library() {
        val cards = deck("B")
        for (c in v.a("library").map { it.jsonObject }) {
            val inp = c.o("input"); val ws = if (inp.s("catalog") == "mini") miniWords else words; val q = query(inp.s("query")); var tab = Library.defaultTab(q["g"], cards.size, "ielts"); var lv = Library.levelOf(q["lv"]); var text = ""
            val steps = c.a("out").map { it.jsonObject }
            fun snap(i: Int) {
                val page = Library.page(tab, lv, text, cards, ws, now); val st = steps[i]; val id = "${c.s("id")}#$i"
                assertEquals(id, st.s("tab"), page.tab)
                check("$id.sections", st["sections"], page.sections.map { sec ->
                    obj("heading" to headingOf(ws, sec.groupId, sec), "viewAll" to (sec.viewAll?.let { "${sec.groupId}|Xem cả $it bộ →" }),
                        "topics" to sec.topics.map { it.id + (if (lv.isNotEmpty()) "?lv=$lv" else "") }, "collections" to sec.collections.map { it.key }) })
                assertEquals(id, st["empty"].let { if (it == null || it is JsonNull) null else it.s() }, page.emptyEmoji)
            }
            snap(0)
            for ((i, a) in inp.a("actions").map { it.jsonObject }.withIndex()) { if (a.containsKey("q")) text = a.s("q"); if (a.containsKey("lv")) lv = a.s("lv"); if (a.containsKey("tab")) tab = a.s("tab"); snap(i + 1) }
        }
    }

    @Test fun topic() {
        for (c in v.a("topic").map { it.jsonObject }) {
            val inp = c.o("input"); var st = WordBook.Store(deck("B"), emptyMap()); val steps = c.a("out").map { it.jsonObject }
            val page0 = Library.topicPage(inp.s("topic"), query(inp.s("query"))["lv"], st.cards, words)
            if (steps[0].containsKey("fallbackToLibrary")) { assertTrue(c.s("id"), page0 == null); continue }
            var page = page0!!; var lv = page.lv
            fun snap(i: Int, full: Boolean) {
                val s = steps[i]; val id = "${c.s("id")}#$i"
                val missing = page.missing.size
                assertEquals(id, s.s("count"), Tx.RAW.t("{n} đã thêm", mapOf("n" to "${page.added}")))
                check("$id.addAll", s["addAll"], mapOf("label" to (if (missing > 0) "+ " + Tx.RAW.t("Thêm {n} từ vào flashcard", mapOf("n" to "$missing")) else "✓ Đã thêm toàn bộ"), "disabled" to (missing == 0)))
                check("$id.words", s["words"], page.words.map { (w, inDeck) -> mapOf("word" to w.s("word"), "inDeck" to inDeck) })
                if (full) { assertEquals(id, s.s("title"), page.topic.name); assertEquals(id, s.s("back"), "#/library?g=${page.backTab}"); check("$id.levels", s["levels"], listOf("") + page.levels); check("$id.links", s["links"], page.links()) }
            }
            snap(0, true)
            for ((i, a) in inp.a("actions").map { it.jsonObject }.withIndex()) {
                if (a.containsKey("lv")) { lv = a.s("lv"); page = Library.topicPageAt(page.topic, lv, st.cards) }
                if (a.containsKey("addAll")) { st = Library.addAll(st, page, now); page = Library.topicPageAt(page.topic, lv, st.cards); assertEquals(steps[i + 1].n("deckSize").toInt(), st.cards.size) }
                snap(i + 1, false)
            }
        }
    }

    @Test fun wordbook() {
        var st = WordBook.Store(LinkedHashMap(), emptyMap()); var t = now
        val ent = words.index.getValue("curriculum")
        fun snap(): JsonObject = obj("cards" to st.cards.mapValues { (_, c) -> obj("word" to c["word"], "vi" to c["vi"], "ipa" to c["ipa"], "ex" to c["ex"], "note" to c["note"], "image" to c["image"], "topic" to c["topic"], "contexts" to c.a("contexts").map { it.jsonObject["text"] },
            "ctx" to (c["ctx"] ?: JsonNull), "src" to (c["src"] ?: JsonNull), "added" to c["added"], "mod" to c["mod"], "srs" to CardMath.srsView(c.o("srs"))) }, "inState" to st.cards.keys.toList(), "deleted" to st.deleted)
        val steps = v.a("wordbook").map { it.jsonObject }
        fun step(i: Int, fn: () -> Unit) { t += 60_000; fn(); eq("wordbook[$i ${steps[i].s("op")}]", steps[i]["out"], snap()) }
        fun ctx(text: String, source: String, title: String) = obj("text" to text, "source" to source, "title" to title)
        step(0) { st = WordBook.add(st, ent, null, t) }
        step(1) { st = WordBook.add(st, ent, ctx("The curriculum was revised.", "https://example.com/a", "Ghi chú của bạn"), t) }
        step(2) { st = WordBook.add(st, ent, obj("text" to "The curriculum was revised.", "source" to "https://example.com/a"), t) }
        step(3) { st = WordBook.add(st, ent.cp2("ipaUS" to "/kəˈrɪkjələm/", "vi" to "IGNORED (already set)"), null, t) }
        step(4) { st = WordBook.add(st, obj("word" to "look forward to", "vi" to "mong đợi", "pos" to "phrase", "ex" to "I look forward to meeting you.", "topic" to "phrases"), null, t) }
        step(5) { for (i in 0 until 6) { t += 1000; st = WordBook.add(st, ent, ctx("ctx number $i", "", ""), t) } }
        step(6) { st = WordBook.edit(st, "curriculum", " giáo trình ", "/kəˈrɪk/", "My own example.", "mẹo", "https://example.com/i.png", t) }
        step(7) { val c = st.cards.getValue("curriculum"); val ns = CardMath.srsJson(c.o("srs"), SRS().review(CardMath.srsCard(c.o("srs"), t), 2, t)); st = WordBook.Store(LinkedHashMap(st.cards).also { it["curriculum"] = JsonObject(c + mapOf("srs" to ns, "mod" to J(t))) }, st.deleted); st = WordBook.reset(st, "curriculum", t) }
        step(8) { st = WordBook.remove(st, "curriculum", t) }
        step(9) { st = WordBook.add(st, ent, null, t) }
    }
    private fun JsonObject.cp2(vararg p: Pair<String, String>) = JsonObject(this + p.associate { it.first to JsonPrimitive(it.second) })

    // ====================================================== #/dict ======================================================
    private val NET: Map<String, JsonObject> by lazy { Json.parseToJsonElement("""{
      "curriculum": {"gtx": {"sentences":[{"trans":"chương trình học"}],"dict":[{"pos":"noun","terms":["chương trình giảng dạy","giáo trình","chương trình học"],"base_form":"curriculum"}],"definitions":[{"pos":"noun","entry":[{"gloss":"the subjects comprising a course of study in a school or college.","example":"the school curriculum","definition_id":"a1"}]}],"synsets":[{"entry":[{"synonym":["syllabus","course"]}]}],"examples":{"example":[{"definition_id":"a1","text":"a <b>curriculum</b> for adults"}]}},
        "dapi": [{"word":"curriculum","phonetic":"/kəˈrɪkjʊləm/","phonetics":[{"text":"/kəˈrɪkjʊləm/","audio":"https://api.dictionaryapi.dev/media/pronunciations/en/curriculum-uk.mp3"},{"text":"/kəˈrɪkjələm/","audio":"https://api.dictionaryapi.dev/media/pronunciations/en/curriculum-us.mp3"}],"meanings":[{"partOfSpeech":"noun","definitions":[{"definition":"The set of courses offered by a school.","example":"The curriculum is broad."}],"synonyms":["syllabus"]}]}],
        "img": {"src":"https://upload.wikimedia.org/x/curriculum.jpg","link":"https://commons.wikimedia.org/wiki/File:x","license":"CC BY","creator":"A. Author","title":"School","via":"Wikipedia"},
        "tato": {"data":[{"text":"The new curriculum was introduced last year.","translations":[[{"lang":"vie","text":"Chương trình mới được áp dụng năm ngoái."}]]},{"text":"Short one.","translations":[[{"lang":"vie","text":"Ngắn."}]]}]}},
      "blorptastic": {"gtx": {"sentences":[{"trans":"tuyệt vời kỳ quặc"}],"dict":[{"pos":"adjective","terms":["kỳ quặc","lạ lùng"]},{"pos":"noun","terms":["sự kỳ quặc"]}],"definitions":[{"pos":"adjective","entry":[{"gloss":"extremely odd and wonderful.","example":"a blorptastic idea"}]}],"synsets":[]}, "img": {"none":1}, "tato": {"data":[]}},
      "zorble": {"gtx": {"sentences":[{"trans":"tổng thể"}],"dict":[{"pos":"adjective","terms":["tổng thể","toàn bộ"]},{"pos":"noun","terms":["cái zorble"]}],"definitions":[{"pos":"adjective","entry":[{"gloss":"taking everything into account.","example":"the zorble cost"}]},{"pos":"noun","entry":[{"gloss":"a made-up thing.","example":"a zorble"}]}],"synsets":[]}, "img": {"none":1}, "tato": {"data":[]},
        "wikitext": "==English==\n===Etymology 1===\n====Adjective====\n====Adverb====\n===Etymology 2===\n====Noun====\n* {{a|UK}} {{IPA|en|/ˌəʊvəˈɹɔːl/}}\n* {{a|US}} {{IPA|en|/ˌoʊvɚˈɔl/}}\n* {{a|UK}} {{q|noun}} {{IPA|en|/ˈəʊvəɹɔːl/}}\n* {{audio|en|En-uk-zorble.ogg|a=UK}}\n"}}""").jsonObject.mapValues { it.value.jsonObject } }
    /** The offline "network" of gen-vocab.mjs (same four sources, keyed by the word in the URL). */
    private fun fakeNet(net: Map<String, JsonObject>) = DictNet { url, _ ->
        fun q(name: String) = Regex("[?&]$name=([^&]*)").find(url)?.groupValues?.get(1)?.let { java.net.URLDecoder.decode(it, "UTF-8") }
        val key = (q("q") ?: q("w") ?: q("page") ?: "").lowercase(); val n = net[key]
        when {
            Regex("src=gtx").containsMatchIn(url) && Regex("dt=bd").containsMatchIn(url) -> n?.get("gtx")
            Regex("src=dapi").containsMatchIn(url) -> n?.get("dapi")
            Regex("wiktionary.*action=parse").containsMatchIn(url) -> n?.get("wikitext")?.let { JsonObject(mapOf("parse" to JsonObject(mapOf("wikitext" to it)))) }
            Regex("/api/img").containsMatchIn(url) -> n?.get("img") ?: JsonObject(mapOf("none" to J(1)))
            Regex("tatoeba").containsMatchIn(url) -> n?.get("tato") ?: JsonObject(mapOf("data" to JsonArray(emptyList())))
            else -> null
        }
    }
    private fun dict(net: Map<String, JsonObject> = emptyMap(), meanLang: String = "vi") = Dict(fakeNet(net), lex(), words.index, DictCfg(meanLang = meanLang, viTypo = verbData.viTypo), clock = { now })

    @Test fun dict_norm() { for (c in v.o("dict").a("norm").map { it.jsonObject }) assertEquals(Js.stringify(c["input"]), c.s("out"), Dict.normWord(c["input"]?.let { if (it is JsonNull) null else it.s() })) }
    @Test fun dict_lookup() = runBlocking {
        for (c in v.o("dict").a("lookup").map { it.jsonObject }) {
            val inp = c.o("input"); val net = inp.a("network").map { it.s() }.associateWith { NET.getValue(it) }
            val d = dict(net, if (inp.containsKey("meanLang")) inp.s("meanLang") else "vi")
            val r = if (inp.s("fn") == "quick") d.quick(inp.s("w")) else d.lookup(inp.s("w"))
            eq(c.s("id"), c["out"], r)
        }
    }
    @Test fun dict_lex() = runBlocking {
        val l = lex()
        for (c in v.o("dict").a("lex").map { it.jsonObject }) {
            val r = l.get(c.s("input")); val out = c["out"]
            if (out is JsonNull) assertTrue(c.s("input"), r == null)
            else { out as JsonObject; assertTrue(c.s("input"), r != null); r!!
                assertEquals(c.s("input"), out.s("key"), r.key); assertEquals(out.s("via"), r.via); assertEquals(out.s("from"), r.from)
                assertEquals(out.s("word"), r.entry.s("word")); assertEquals(out.s("pos"), r.entry.s("pos")); assertEquals(out.s("vi"), r.entry.s("vi")) }
        }
    }
    @Test fun dict_suggest() = runBlocking {
        val l = lex()
        for (c in v.o("dict").a("suggest").map { it.jsonObject }) {
            val r = l.suggest(c.s("input"), c.n("n").toInt())
            check(c.s("input"), c["out"], r.map { x -> mapOf("key" to x["key"], "word" to x.jsonObject.o("entry")["word"], "vi" to x.jsonObject.o("entry")["vi"], "pos" to x.jsonObject.o("entry")["pos"]) })
        }
    }
    @Test fun dict_page() = runBlocking {
        for (c in v.o("dict").a("page").map { it.jsonObject }) {
            val w = c.o("input").s("query"); val out = c.o("out"); val id = c.s("id")
            val d = dict(if (w == "curriculum" || w == "blorptastic") mapOf(w to NET.getValue(w)) else emptyMap())
            val full = if (w.isEmpty()) null else d.lookup(w)
            if (full == null || !Js.truthy(full["found"])) {
                assertTrue(id, out.getValue("empty").jsonPrimitive.booleanOrNull == true); if (w.isEmpty()) check("$id.samples", out["samples"], DictPage.SAMPLES); continue
            }
            val m = DictPage.model(full, null, "vi", { e -> verbs.verbOf(e).ifEmpty { null } }, { k -> usage.hasWord(k) })
            assertEquals(id, out.s("word"), m.word); assertEquals(id, out.s("meaning"), m.meaning); assertEquals(id, out.s("def"), m.def); assertEquals(id, out.s("example"), m.example)
            check("$id.exT", out["exampleTranslation"], m.exampleTranslation?.let { listOf(it.s("vi"), if (Js.truthy(it["auto"])) "Oxford · dịch máy" else "Tatoeba") } ?: emptyList<String>())
            val blocks = m.posBlocks.map { b -> mapOf("pos" to DictPage.posLabel(b.pos, "vi"), "vi" to b.vi, "defs" to b.defs.map { x -> mapOf("def" to x.def, "ex" to x.ex) }) }
            check("$id.pos", out["posBlocks"], blocks); assertEquals(id, out.n("extraMeanings").toInt(), if (m.extraMeanings.isNotEmpty()) 1 else 0)
            check("$id.bil", out["bilingual"], m.bilingual.map { mapOf("en" to it.s("en"), "vi" to it.s("vi")) })
            check("$id.actions", out["actions"], mapOf("quickSave" to !m.saved, "saved" to m.saved, "practiceSpeak" to "#/practice/speak?w=${m.word}", "verb" to m.verb?.let { "#/verb/${Dict.jsEncode(it)}" }, "usage" to (if (m.hasUsage) "#/usage/${m.word}" else null), "saveCard" to true))
            check("$id.recent", out["recent"], DictPage.recent(emptyList(), m.word)); check("$id.reward", out["lookupReward"], listOf(mapOf("lookups" to 1)))
            val st = DictPage.save(WordBook.Store(LinkedHashMap(), emptyMap()), full, "My own sentence with $w.", d.translateVi("My own sentence with $w."), now)
            val card = st.cards.getValue(w); val af = out.o("afterSave")
            check("$id.after", af, mapOf("word" to card["word"], "vi" to card["vi"], "pos" to card["pos"], "ex" to card["ex"], "contexts" to card.a("contexts").map { x -> mapOf("text" to x.jsonObject["text"], "title" to x.jsonObject["title"], "source" to x.jsonObject["source"]) },
                "image" to card["image"], "audio" to card["audio"], "ipaUS" to card["ipaUS"], "topic" to card["topic"]))
        }
    }

    // ====================================================== #/practice ======================================================
    @Test fun practice_sources() {
        val src = Practice.sources(deck("P").size, words)
        val want = v.o("practice").a("sources").map { it.jsonObject }
        for (w in want) if (w.containsKey("value")) assertEquals(w.s("value"), w.s("label"), src.first { it.value == w.s("value") }.label())
        assertEquals(want.last().n("topicEntries").toInt(), src.count { it.value.startsWith("topic:") })
        assertEquals(words.topics.map { "topic:" + it.id }, src.filter { it.value.startsWith("topic:") }.map { it.value })
    }
    @Test fun practice_pool() {
        for (c in v.o("practice").a("pool").map { it.jsonObject }) {
            val inp = c.o("input"); val r = Practice.pool(inp.s("src"), deck(inp.s("deck")), if (inp.s("catalog") == "mini") miniWords else words, now, null); val out = c.o("out")
            assertEquals(c.s("id"), out.n("n").toInt(), r.size)
            if (out["words"] != null && out["words"] !is JsonNull) check("${c.s("id")}.words", out["words"], r.map { it.s("word") })
            check("${c.s("id")}.first", out["first"], r.take(3))
        }
    }
    @Test fun practice_accept() {
        for (c in v.o("practice").a("accept").map { it.jsonObject }) {
            val i = c.o("input"); val o = i.o("opts"); val r = ChoiceKit.accept(i.s("given"), i.s("answer"), o["alts"]?.jsonArray?.map { it.s() } ?: emptyList(), o["typo"]?.jsonPrimitive?.booleanOrNull == true)
            check(Js.stringify(i), c["out"], mapOf("ok" to r.ok, "how" to r.how, "want" to r.want))
        }
    }
    @Test fun practice_qeNorm() { for (c in v.o("practice").a("qeNorm").map { it.jsonObject }) assertEquals(c.s("input"), c.s("out"), Qe.norm(c.s("input"))) }
    @Test fun practice_typo() {
        for (c in v.o("practice").a("typo").map { it.jsonObject }) {
            val i = c.o("input"); val o = i.o("opts")
            val r = LessonFx.typo(i.s("given"), i.s("target"), strict = o["strict"] != null, isWord = if (o["isWord"] != null) { x -> x == "two" || x == "tow" } else null)
            check(Js.stringify(i), c["out"], mapOf("ok" to r.ok, "typo" to r.typo, "marks" to r.marks.map { m -> if (m.fix) mapOf("w" to m.w, "fix" to true) else mapOf("w" to m.w) }))
        }
    }

    // ====================================================== writing ======================================================
    private val W get() = v.o("writing")
    @Test fun writing_ideas() {
        for (c in W.a("ideas").map { it.jsonObject }) {
            val tp = Ideas.pick(mini.ideas, c.o("input").s("topic"))!!; val out = c.o("out"); val issues = tp.a("issues").map { it.jsonObject }
            check("topics", out["topics"], mini.ideas.map { it.s("topic") }); assertEquals(out.s("selected"), tp.s("topic")); assertEquals(out.n("issues").toInt(), issues.size)
            assertEquals(out.o("firstIssue").s("q"), issues[0].s("q")); assertEquals(out.o("firstIssue").n("ideas").toInt(), Ideas.ideasOf(issues[0], "for").size + Ideas.ideasOf(issues[0], "against").size)
            assertEquals(out.n("vocab").toInt(), tp.a("vocab").size); check("prompts", out["prompts"], Ideas.prompts(mini.prompts, tp).map { it.s("id") })
            val first = Ideas.ideasOf(issues[0], "for")[0]
            check("save", out["firstChunkSave"], Ideas.chunkSave(first, first.a("chunks")[0].s(), "vi"))
        }
    }
    @Test fun writing_ideasData() {
        val d = W.o("ideasData")
        for (t in d.a("topics").map { it.jsonObject }) {
            val x = writing.ideas.first { it.s("topic") == t.s("topic") }
            assertEquals(t.s("title"), x.s("title")); assertEquals(t.s("emoji"), x.s("emoji")); assertEquals(t.n("issues").toInt(), x.a("issues").size); assertEquals(t.n("vocab").toInt(), x.a("vocab").size)
            t["exampleIssue"]?.let { e -> val iss = x.a("issues")[0].jsonObject; e as JsonObject; assertEquals(e.s("q"), iss.s("q")); eq("for", e["for"], iss.a("for")[0]); eq("against", e["against"], iss.a("against")[0]) }
        }
    }
    @Test fun writing_letters() {
        for (c in W.a("letters").map { it.jsonObject }) {
            val inp = c.o("input"); val out = c.o("out"); val id = c.s("id")
            if (id.startsWith("check-")) {
                val lt = writing.letters.first { it.s("id") == inp.s("letter") }; val r = Letters.check(lt, inp.s("text"))
                assertEquals(id, out.s("wordChip"), Tx.RAW.t("{n} từ", mapOf("n" to "${r.words}"))); assertEquals(id, out.s("wordChipOk"), "chip " + (if (r.enough) "ok" else ""))
                check("$id.rows", out["rows"], r.rows.map { mapOf("ok" to it.ok, "msg" to Tx.RAW.t(it.key, it.vars)) })
            } else {
                val tone = Letters.toneOf(query(inp.s("query"))["tone"]); val drafts = inp.o("drafts")
                check("$id.tabs", out["tabs"], Letters.tabs(writing.letters).map { (t, n) -> mapOf("tone" to t, "label" to (if (t == "all") "Tất cả" else Letters.TONE_KEY.getValue(t)), "n" to n) })
                assertEquals(id, out.getValue("tip").jsonPrimitive.booleanOrNull, tone != "all")
                check("$id.cards", out["cards"], Letters.list(writing.letters, tone).map { x -> mapOf("id" to x.s("id"), "tone" to Letters.TONE_KEY.getValue(x.s("tone")), "draftWords" to Letters.draftWords(drafts, x.s("id")), "title" to x.s("titleVi")) })
            }
        }
    }
    @Test fun writing_lettersData() { val d = W.o("lettersData"); assertEquals(d.n("count").toInt(), writing.letters.size); eq("example", d["example"], writing.letters[0]) }
    @Test fun writing_paraphrase() {
        val p = W.o("paraphrase"); val all = writing.paraphrase
        assertEquals(p.o("data").n("total").toInt(), all.size); assertEquals(p.o("data").n("usable").toInt(), Paraphrase.pairs(all).size)
        for (c in p.a("usable").map { it.jsonObject }) { val a = c.a("input"); assertEquals(Js.stringify(a), c.getValue("out").jsonPrimitive.booleanOrNull, Paraphrase.usable(a[0].s(), a[1].s())) }
        val round = Paraphrase.Round(Paraphrase.pairs(mini.paraphrase), null); val q0 = round.question(); val first = p.o("first")
        assertEquals(first.s("q"), q0.q); check("options", first["options"], q0.options); assertEquals(first.s("progress"), "1/${round.items.size}")
        val steps = p.o("finish").a("steps").map { it.jsonObject }
        for ((i, st) in steps.withIndex()) {
            val q = round.question(); val pickRight = i % 3 != 2
            val choice = if (pickRight) q.answer else q.options.first { it != q.answer }
            assertEquals("step$i", st.getValue("correct").jsonPrimitive.booleanOrNull, round.answer(q, choice)); round.next()
        }
        assertTrue(round.finished)
        val fin = p.o("finish"); assertEquals(fin.s("summary"), Tx.RAW.t("{right}/{total} đúng ({pct}%)", mapOf("right" to "${round.right}", "total" to "${round.items.size}", "pct" to "${round.percent}")))
        check("reward", fin["rewards"], listOf(mapOf("quizzes" to 1, "readings" to 0, "xp" to round.xp)))
    }
    private fun modelRows() = Models.rows(mini.models, mini.prompts, mini.task1, mini.letters)
    @Test fun writing_models() {
        val rows = modelRows()
        for (c in W.a("models").map { it.jsonObject }) {
            val inp = c.o("input"); val tab = Models.defaultTab(query(inp.s("query"))["t"], "ielts"); val out = c.o("out"); var q = ""
            val steps = out.a("steps").map { it.jsonObject }
            fun snap(i: Int) {
                val list = Models.list(rows, tab, q); val st = steps[i]
                val topicName = { r: Models.Row -> miniWords.topic(r.topic)?.name }
                check("${c.s("id")}#$i", st["rows"], list.take(8).map { r -> mapOf("id" to r.id, "title" to r.title, "meta" to (r.kind + (topicName(r)?.let { " · $it" } ?: "") + " · " + Tx.RAW.t("{n} từ", mapOf("n" to r.words.ifEmpty { "–" }))), "band" to r.band) })
                if (st.containsKey("n")) assertEquals(st.n("n").toInt(), list.size)
            }
            snap(0)
            for ((i, a) in inp.a("actions").map { it.jsonObject }.withIndex()) { q = a.s("q"); snap(i + 1) }
        }
    }
    @Test fun writing_modelData() {
        val d = W.o("modelData"); assertEquals(d.n("count").toInt(), writing.models.size)
        for ((k, n) in d.o("byTask")) assertEquals(k, n.jsonPrimitive.content.toInt(), writing.models.count { it.s("task") == k })
    }
    @Test fun writing_model() {
        for (c in W.a("model").map { it.jsonObject }) {
            val inp = c.o("input"); val m = mini.models.first { it.s("id") == inp.s("id") }; val out = c.o("out")
            val pg = Models.page(m, mini.prompts, mini.task1, mini.letters)
            check("badges", out["badges"], listOf(pg.badge, pg.kind, pg.band)); assertEquals(out.s("back"), pg.back)
            check("chunks", out["chunks"], pg.chunks.map { listOf(it.first, it.second) }); check("linkers", out["linkers"], pg.linkers)
            check("tabs", out["tabs"], Models.PRACTICE_TABS); check("extras", out["extras"], mapOf("outline" to pg.hasOutline, "vocab" to pg.hasVocab, "pitfalls" to pg.hasPitfalls, "band6" to pg.hasBand6))
            var st = WordBook.Store(LinkedHashMap(), emptyMap()); st = Models.saveChunk(st, m, pg.chunks[0].first, pg.chunks[0].second, now); st = Models.saveAll(st, m, now).first
            check("saved", out["saved"], st.cards.values.take(4).map { x -> mapOf("word" to x["word"], "vi" to x["vi"], "pos" to x["pos"], "topic" to x["topic"], "emoji" to x["emoji"], "ex" to x["ex"], "ctxTitle" to x.a("contexts").firstOrNull()?.jsonObject?.get("title")) })
            assertEquals(out.n("savedCount").toInt(), st.cards.size)
        }
    }
    @Test fun writing_annotated() {
        for (c in W.a("annotated").map { it.jsonObject }) {
            val paras = Models.render(c.s("input")); val out = c.o("out")
            assertEquals(out.n("paragraphs").toInt(), paras.size)
            check("roles", out["roles"], paras.flatMap { p -> listOfNotNull(p.head) + p.segs.filterIsInstance<Models.Seg.Role>().map { it.s } })
            assertEquals(out.getValue("roleHead").jsonPrimitive.booleanOrNull, paras.any { it.head != null })
            check("chunks", out["chunks"], paras.flatMap { p -> p.segs.filterIsInstance<Models.Seg.Chunk>().map { listOf(it.en, it.vi) } }); check("links", out["links"], paras.flatMap { p -> p.segs.filterIsInstance<Models.Seg.Link>().map { it.s } })
            assertTrue(paras.flatMap { it.segs }.filterIsInstance<Models.Seg.Text>().any { it.s.contains("<b>") })
            assertEquals(out.getValue("glossHidden").jsonPrimitive.booleanOrNull, !Models.glossVisible("vi"))
        }
    }
    @Test fun writing_gap() {
        for (c in W.a("gap").map { it.jsonObject }) {
            val inp = c.o("input"); val m = mini.models.first { it.s("id") == inp.s("model") }; val out = c.o("out"); val g = Models.gap(m, inp.s("kind"), null)
            assertEquals(out.n("gaps").toInt(), g.answers.size); check("bank", out["bank"], g.bank)
            val typed = if (inp.s("scenario") == "all-correct") g.answers else g.answers.mapIndexed { i, a -> if (i == 0) a else "wrong" }
            val right = Models.gapScore(g, typed); val f = Models.finish(inp.s("kind"), right, g.answers.size)
            check("reward", out["rewards"], listOf(mapOf("quizzes" to 1, "perfect" to (if (f.perfect) 1 else 0), "xp" to f.xp)))
            check("mdone", out["mdone"], Models.markDone(emptyList(), inp.s("kind"), f))
            check("marks", out["marks"], g.answers.indices.map { i -> if (Models.norm(typed[i]) == Models.norm(g.answers[i])) "ok" else "no" })
        }
    }
    /** The three exercises generated from a model: gram (errExercise, or the select fallback), copy (one box per word), write (sentences given as lemmas). Lemmatizer + word index = the mini library. */
    @Test fun writing_exercise() {
        val lem = Lemmatizer(verbData.lemma) { w -> miniWords.index.containsKey(w) }
        for (c in W.a("exercise").map { it.jsonObject }) {
            val inp = c.o("input"); val m = mini.models.first { it.s("id") == inp.s("model") }; val out = c.o("out"); val id = c.s("id")
            when (inp.s("mode")) {
                "gram" -> {
                    val items = Models.errors(m, lem, { w -> miniWords.index[w] }, null)
                    if (out.s("kind") == "select") {
                        assertTrue(id, items == null)
                        val slots = Models.gram(m, verbData.forms, null).flatten().filterIsInstance<Models.GramTok.Slot>()
                        check("$id.options", out["options"], slots.map { it.slot.options }); check("$id.answers", out["answers"], slots.map { it.slot.answer })
                        assertEquals(id, out.n("right").toInt(), Models.gramScore(slots.map { it.slot.answer }, out.a("typed").map { it.s() }))
                    } else {
                        assertTrue(id, items != null); items!!
                        check("$id.items", out["items"], items.mapIndexed { k, x -> mapOf("k" to k, "wrong" to x.wrong, "missing" to (x.wrong == ""), "ans" to x.ans, "why" to x.why) })
                        assertEquals(id, out.n("right").toInt(), Models.errScore(items, out.a("typed").map { it.s() }))
                    }
                }
                "copy" -> {
                    val (blocks, answers) = Models.slots(m)
                    check("$id.blocks", out["blocks"], blocks.map { b -> mapOf("role" to b.role, "n" to b.toks.count { !Regex("^[^A-Za-z\\d]$").matches(it) }) })
                    assertEquals(id, out.n("n").toInt(), answers.size); assertEquals(id, out.s("answers"), answers.joinToString(" "))
                    assertEquals(id, out.n("right").toInt(), Models.slotScore(answers, answers.mapIndexed { i, a -> if (i % 2 == 1) "x" else a }))
                }
                else -> {
                    val sents = Models.sentencesOf(m)
                    check("$id.prompts", out["prompts"], sents.map { Models.lemmaPrompt(it.s) { w -> lem.lemma(w) } }); check("$id.sentences", out["sentences"], sents.map { it.s })
                    val typed = out.a("typed").map { it.s() }
                    assertEquals(id, out.n("right").toInt(), sents.indices.count { Models.lemmaRight(typed[it], sents[it].s) })
                }
            }
        }
    }
    @Test fun writing_phrases() {
        val models = mini.models
        for (c in W.a("phrases").map { it.jsonObject }) {
            val out = c.o("out"); val dk = c.o("input").s("deck")
            val cards: Map<String, JsonObject> = if (dk == "B") keyed(B + A.subList(0, 3).mapIndexed { i, x -> JsonObject(x + mapOf("word" to J(listOf("by and large", "in terms of", "as a result")[i]), "topic" to J("phrases"), "pos" to J("phrase"))) }) else emptyMap()
            val list = Models.phraseCards(cards.values)
            check("list", out["list"], list.map { it.s("word") }); assertEquals(out.getValue("learnButton").jsonPrimitive.booleanOrNull, list.size >= 4)
            assertEquals(out.s("models"), Tx.RAW.t("{n} bài", mapOf("n" to "${models.size}")) + " ›"); assertEquals(out.getValue("starterButton").jsonPrimitive.booleanOrNull, list.isEmpty() && models.isNotEmpty())
            if (list.isEmpty()) {
                var st = WordBook.Store(LinkedHashMap(), emptyMap())
                st = Models.addStarter(st, Models.starter(models, st.cards), now)
                check("starter", out["starterAdded"], st.cards.values.map { x -> mapOf("word" to x["word"], "vi" to x["vi"], "pos" to x["pos"], "topic" to x["topic"], "ctxTitle" to x.a("contexts").firstOrNull()?.jsonObject?.get("title")) })
            }
        }
    }

    // ====================================================== #/verb ======================================================
    private val VB get() = v.o("verb")
    @Test fun verb_resolve() { for (c in VB.a("resolve").map { it.jsonObject }) eq(c.s("input"), c["out"], verbs.resolve(c.s("input"))) }
    @Test fun verb_forms() { for (c in VB.a("forms").map { it.jsonObject }) { val i = c.o("input"); eq(Js.stringify(i), c["out"], verbs.forms(i.s("base"), i.s("region")).json()) } }
    @Test fun verb_table() { for (c in VB.a("table").map { it.jsonObject }) { val i = c.o("input"); eq(Js.stringify(i), c["out"], verbs.table(i.s("base"), i.s("region"))) } }
    @Test fun verb_mistakes() { for (c in VB.a("mistakes").map { it.jsonObject }) eq(c.s("input"), c["out"], verbs.mistakes(c.s("input"))) }
    @Test fun verb_suggest() { for (c in VB.a("suggest").map { it.jsonObject }) eq(c.s("input"), c["out"], verbs.suggest(c.s("input"), c.n("n").toInt())) }
    @Test fun verb_modal() { for (c in VB.a("modal").map { it.jsonObject }) check(c.s("input"), c["out"], verbs.modal(c.s("input"))) }
    @Test fun verb_verbOf() { for (c in VB.a("verbOf").map { it.jsonObject }) assertEquals(Js.stringify(c["input"]), c.s("out"), verbs.verbOf(c.o("input"))) }
    @Test fun verb_irregular() {
        val irr = VB.o("irregular"); val list = verbs.irregularList()
        assertEquals(irr.n("total").toInt(), list.size); check("sample", irr["sample"], list.take(4))
        for ((p, n) in irr.o("patterns")) assertEquals(p, n.jsonPrimitive.content.toInt(), verbs.irregularFilter(p, "").size)
        for (f in irr.a("filters").map { it.jsonObject }) { val i = f.o("input"); val r = verbs.irregularFilter(i.s("pattern"), i.s("prefix")); assertEquals(f.n("n").toInt(), r.size); check("first", f["first"], r.take(6)) }
    }
    @Test fun verb_pairs() { assertTrue(VB.containsKey("pairs")) } // PAIRS ("Hay nhầm với") is UI content of verbs.js - not part of the logic vectors

    // ====================================================== #/usage ======================================================
    private val US get() = v.o("usage")
    @Test fun usage_parse() { for (c in US.a("parse").map { it.jsonObject }) { val i = c.o("input"); val (e, err) = Usage.parse(i.s("kind"), i.s("src")); eq(i.s("kind"), c["out"], obj("entries" to e.map { it.json() }, "errors" to err)) } }
    @Test fun usage_example() { for (c in US.a("example").map { it.jsonObject }) eq(c.s("input"), c["out"], Usage.example(c.s("input")).json()) }
    @Test fun usage_resolve() { for (c in US.a("resolve").map { it.jsonObject }) check(c.s("input"), c["out"], usage.resolve(c.s("input"))) }
    @Test fun usage_suggest() { for (c in US.a("suggest").map { it.jsonObject }) check(c.s("input"), c["out"], usage.suggest(c.s("input"), c.n("n").toInt())) }
    @Test fun usage_near() { for (c in US.a("near").map { it.jsonObject }) check(c.s("input"), c["out"], usage.near(c.s("input"), 6)) }
    @Test fun usage_lookup() {
        for (c in US.a("lookup").map { it.jsonObject }) { val r = usage.lookup(c.s("input")); check(c.s("input"), c["out"], mapOf("key" to r.key, "count" to r.count) + Usage.KINDS.associateWith { k -> r.byKind.getValue(k).map { it.key } }) }
    }
    @Test fun usage_entries() {
        for (c in US.a("entries").map { it.jsonObject }) {
            val k = c.s("input"); val e = listOf("p", "v", "a", "c").mapNotNull { usage.byId(it, k) }.first(); val o = c.o("out")
            val j = e.json(); for (key in listOf("kind", "sub", "key", "items", "ex", "notes", "mis", "col", "lessons", "reg", "quiz", "k", "pos", "rel", "f")) eq("$k.$key", o[key], j[key])
        }
    }
    @Test fun usage_quizItems() {
        for (c in US.a("quizItems").map { it.jsonObject }) { val i = c.o("input"); val e = usage.byId(i.s("kind"), i.s("key"))!!; eq(Js.stringify(i), c["out"], J(usage.quizItems(e).map { it.json() })) }
    }
    @Test fun usage_quiz() {
        for (c in US.a("quiz").map { it.jsonObject }) {
            val i = c.o("input"); val es = i.a("entries").map { it.s() }.map { usage.byId(it.substringBefore(":"), it.substringAfter(":"))!! }
            eq(Js.stringify(i), c["out"], J(usage.quiz(es, i.n("n").toInt(), i.n("seed").toLong()).map { q -> JsonObject(q.json() + ("xid" to JsonPrimitive(usage.xid(q)))) }))
        }
    }
    @Test fun usage_counts() {
        val c = US.o("counts"); for ((k, x) in c.o("counts")) { val (e, n) = usage.counts().getValue(k); assertEquals(k, x.jsonObject.n("entries").toInt(), e); assertEquals(k, x.jsonObject.n("items").toInt(), n) }
        assertEquals(c.o("index").n("words").toInt(), usage.indexSizes.first); assertEquals(c.o("index").n("ids").toInt(), usage.indexSizes.second)
        for (x in c.a("chunksOf").map { it.jsonObject }) assertEquals(x.s("key"), x.s("chunks"), usage.chunksOf(x.s("key")))
    }
    @Test fun usage_categories() {
        val c = US.o("categories"); check("kinds", c["kinds"], Usage.KINDS); check("subs", c["subs"], Usage.SUBS); check("preps", c["preps"], Usage.PREPS); check("vcodes", c["vcodes"], Usage.VCODES)
        for ((k, n) in c.o("list")) assertEquals(k, n.jsonPrimitive.content.toInt(), usage.list(k).size)
    }

    // ====================================================== coverage guard ======================================================
    @Test fun every_top_level_key_is_covered() {
        val covered = setOf("_doc", "now", "inputs", "review", "reviewSession", "reviewModes", "mistakes", "deck", "library", "topic", "wordbook", "dict", "practice", "writing", "verb", "usage", "data")
        assertEquals(covered, v.keys)
        assertEquals(setOf("log", "view", "list", "retry"), v.o("mistakes").keys); assertEquals(setOf("norm", "lookup", "lex", "suggest", "page"), v.o("dict").keys)
        assertEquals(setOf("sources", "pool", "accept", "qeNorm", "typo"), v.o("practice").keys)
        assertEquals(setOf("ideas", "ideasData", "letters", "lettersData", "paraphrase", "models", "modelData", "model", "annotated", "gap", "exercise", "phrases"), W.keys)
        assertEquals(setOf("resolve", "forms", "table", "mistakes", "suggest", "modal", "verbOf", "irregular", "pairs"), VB.keys)
        assertEquals(setOf("parse", "example", "resolve", "suggest", "near", "lookup", "entries", "quizItems", "quiz", "counts", "categories"), US.keys)
    }
}
