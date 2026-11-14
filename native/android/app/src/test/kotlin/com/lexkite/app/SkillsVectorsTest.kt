package com.lexkite.app

import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.core.skills.Cast
import com.lexkite.app.core.skills.Clip
import com.lexkite.app.core.skills.Dictation
import com.lexkite.app.core.skills.KVoice
import com.lexkite.app.core.skills.Lexis
import com.lexkite.app.core.skills.ListenHub
import com.lexkite.app.core.skills.ListenPage
import com.lexkite.app.core.skills.ListenPlayer
import com.lexkite.app.core.skills.ListenTest
import com.lexkite.app.core.skills.Part
import com.lexkite.app.core.skills.PlayerEvents
import com.lexkite.app.core.skills.PlayerIO
import com.lexkite.app.core.skills.Qx
import com.lexkite.app.core.skills.Reader
import com.lexkite.app.core.skills.SkillsContent
import com.lexkite.app.core.skills.Utter
import com.lexkite.app.core.skills.WordPopup
import com.lexkite.app.core.skills.WordPort
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.Tx
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.awaitCancellation
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.TestCoroutineScheduler
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
import com.lexkite.app.core.speak.ContrastStat
import com.lexkite.app.core.speak.HandsFree
import com.lexkite.app.core.speak.HfIO
import com.lexkite.app.core.speak.HfWord
import com.lexkite.app.core.speak.MicOutcome
import com.lexkite.app.core.speak.MouthSpec
import com.lexkite.app.core.speak.PairItem
import com.lexkite.app.core.speak.PairSession
import com.lexkite.app.core.speak.PronCoach
import com.lexkite.app.core.speak.PronGroups
import com.lexkite.app.core.speak.PronPage
import com.lexkite.app.core.speak.PronPairs
import com.lexkite.app.core.speak.Reflex
import com.lexkite.app.core.speak.Roleplay
import com.lexkite.app.core.speak.Rtype
import com.lexkite.app.core.speak.SayData
import com.lexkite.app.core.speak.SayLogic
import com.lexkite.app.core.speak.SpeakDrill
import com.lexkite.app.core.speak.SpeakHub
import com.lexkite.app.core.speak.SpeakPack
import com.lexkite.app.core.speak.SpeakScore
import com.lexkite.app.core.speak.SpeakingRoom
import com.lexkite.app.core.speak.Situation
import com.lexkite.app.core.speak.SpkProgress
import com.lexkite.app.core.speak.Tr
import kotlinx.serialization.json.boolean
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * P06 parity (M4 listening + reading screens): the Kotlin logic reproduces every case of vectors/skills.json (web code run in node:vm by scripts/native/gen-skills.mjs).
 * One test per vector family; every case of every list is run and compared (a mismatch fails, nothing is skipped). Text is compared in the web's Vietnamese source language ([tx]).
 */
class SkillsVectorsTest {
    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("skills.json")!!.readText()).jsonObject
    /** The downloaded pack (web/data/skills-pack.json): parsing it installs the band table, Kokoro pools and stopwords the assertions below check against the vectors. */
    private val pack = SkillsContent.parse(Json.parseToJsonElement(javaClass.classLoader!!.getResource("skills-pack.json")!!.readText()).jsonObject)
    private val now = v.getValue("now").jsonPrimitive.long
    private val tx = Tx.RAW

    /** P06: the full pack has every listening test and reading, each opens by id, and the reading list never shows a Vietnamese summary to a language without a translator. */
    @Test fun parity_P06() {
        packCounts()
        for (n in pack.tests) assertEquals(4, pack.partsOf(n).size)
        for (r in pack.readings) assertEquals(r, pack.reading(r.id))
        val ar = Reader.list(pack, emptyMap(), null, null, "ar").cards
        assertEquals(pack.readings.size, ar.size); assertTrue(ar.all { it.summaryKind == "translate" && it.shown == it.r.summaryEn.ifEmpty { it.summary } })
        assertTrue(Reader.list(pack, emptyMap(), null, null, "vi").cards.all { it.shown == it.summary })
    }
    private fun t(key: String, vararg vars: Pair<String, Any>) = tx.t(key, if (vars.isEmpty()) null else vars.associate { it.first to it.second.toString() })

    // ---------- helpers ----------
    private fun JsonObject.o(k: String) = getValue(k).jsonObject
    private fun JsonObject.a(k: String) = getValue(k).jsonArray
    private fun JsonElement?.s() = if (this == null || this is JsonNull) "" else jsonPrimitive.content
    private fun JsonObject.s(k: String) = this[k].s()
    private fun JsonObject.n(k: String) = Js.num(this[k])
    private fun J(x: Any?): JsonElement = when (x) { null -> JsonNull; is JsonElement -> x; is String -> JsonPrimitive(x); is Boolean -> JsonPrimitive(x); is Int -> JsonPrimitive(x); is Long -> JsonPrimitive(x); is Double -> JsonPrimitive(x)
        is Map<*, *> -> JsonObject(x.entries.associate { it.key.toString() to J(it.value) }); is Iterable<*> -> JsonArray(x.map { J(it) }); is Pair<*, *> -> JsonArray(listOf(J(x.first), J(x.second))); else -> JsonPrimitive(x.toString()) }
    private fun obj(vararg p: Pair<String, Any?>) = J(mapOf(*p)) as JsonObject

    /** Every key of [want] must match (numbers within [tol], strings exact, absent = null); arrays by length and position. */
    private fun sub(path: String, want: JsonElement?, got: JsonElement?, tol: Double = 1e-9) {
        val w = want ?: JsonNull; val g = got ?: JsonNull
        when {
            w is JsonObject && g is JsonObject -> for (k in w.keys) sub("$path.$k", w[k], g[k], tol)
            w is JsonArray && g is JsonArray -> { assertEquals("$path length", w.size, g.size); for (i in w.indices) sub("$path[$i]", w[i], g[i], tol) }
            w is JsonPrimitive && g is JsonPrimitive && w !is JsonNull && g !is JsonNull ->
                if (!w.isString && !g.isString && w.booleanOrNull == null && g.booleanOrNull == null) assertEquals(path, w.content.toDouble(), g.content.toDouble(), tol) else assertEquals(path, w.content, g.content)
            else -> assertEquals("$path (got ${Js.stringify(g)} want ${Js.stringify(w)})", w is JsonNull, g is JsonNull)
        }
    }
    private fun check(path: String, want: JsonElement?, got: Any?, tol: Double = 1e-9) = sub(path, want, J(got), tol)
    /** The vectors keep only the leading integer of the visible evidence number ("25–26" is recorded as 25: gen-skills.mjs transcriptRows). */
    private fun leadNum(x: Any): Int = Regex("\\d+").find(x.toString())!!.value.toInt()
    private fun query(q: String): Map<String, String> = if (q.isEmpty()) emptyMap() else q.split("&").associate { it.substringBefore("=") to java.net.URLDecoder.decode(it.substringAfter("=", ""), "UTF-8") }

    // ---------- content ----------
    private val data by lazy { v.o("data") }
    private val content by lazy { SkillsContent.parse(data) }
    private val lexis get() = content.lexis
    private fun part(id: String) = content.part(id)!!
    private fun subset(parts: List<String> = emptyList(), readings: List<String> = emptyList()) = SkillsContent(content.listening.filter { it.id in parts }, content.readings.filter { it.id in readings }, lexis)
    /** Expected content counts come from the generated vectors (skills.json "counts", written by gen-skills.mjs from the same web data as the pack) so adding readings/tests never reddens native; the floors below only ever go UP. */
    private fun packCounts() {
        val k = v.o("counts")
        assertEquals(k.n("tests").toInt(), pack.tests.size); assertEquals(k.n("listening").toInt(), pack.listening.size); assertEquals(k.n("readings").toInt(), pack.readings.size)
        assertTrue(pack.tests.size >= 10 && pack.listening.size >= 40 && pack.readings.size >= 57)
    }
    private fun cut(p: Part, n: Int) = Part(JsonObject(p.j + ("script" to JsonArray(p.j.a("script").take(n)))))
    private fun answers(o: JsonObject): Map<String, Any?> = o.entries.associate { (k, x) -> k to (if (x is JsonArray) x.map { it.s() } else x.s()) }

    // ====================================================== shared ======================================================
    @Test fun pack_is_complete_and_matches_the_vector_data() {
        packCounts()
        for (p in content.listening) assertEquals(p.id, Js.stringify(p.j), Js.stringify(pack.part(p.id)!!.j))
        for (r in content.readings) assertEquals(r.id, Js.stringify(r.j), Js.stringify(pack.reading(r.id)!!.j))
        assertEquals(com.lexkite.app.core.skills.SkillsConsts.narrator, v.o("shared").o("kvoice").a("voices").map { it.jsonObject.o("out").s("_narrator") }.distinct().single())
    }
    @Test fun shared_kvoice() {
        val k = v.o("shared").o("kvoice")
        for (c in k.a("hash").map { it.jsonObject }) assertEquals(c.s("input"), c.s("out"), AudioLogic.fnv36(c.s("input")))
        for (c in k.a("voices").map { it.jsonObject }) check("voices.${c.s("part")}", c["out"], KVoice.voices(Part(obj("id" to c.s("part"), "speakers" to c["speakers"]))))
        for (c in k.a("lineKeys").map { it.jsonObject }) {
            val p = part(c.s("part")); val vo = KVoice.voices(p)
            check("lineKeys.${c.s("part")}", c["keys"], c.a("keys").map { e -> val i = e.jsonObject.n("i").toInt(); obj("i" to i, "voice" to (if (p.script[i].say != null) vo.getValue("_narrator") else vo.getValue(p.script[i].s!!)), "key" to KVoice.lineKey(vo, p.script[i])) })
        }
        for (c in k.a("split").map { it.jsonObject }) check("split", c["out"], AudioLogic.split(c.s("input")))
    }

    @Test fun shared_audio_url() {
        val u = v.o("shared").o("audioUrl")
        assertEquals(u.a("bases").map { it.s() }, AudioLogic.BASES)
        for (s in u.a("steps").map { it.jsonObject }) assertEquals("failures ${s.s("failures")}", s.s("url"), AudioLogic.urls("k1", "l", s.n("failures").toInt()).first())
    }

    @Test fun shared_cast() {
        for (c in v.o("shared").a("cast").map { it.jsonObject }) {
            val inp = c.o("input"); val vo = inp.o("voices")
            val ps = inp.a("parts").map { it.jsonObject }
            for ((i, w) in c.a("out").map { it.jsonObject }.withIndex()) {
                val p = Part(obj("id" to ps[i].s("id"), "speakers" to ps[i]["speakers"]))
                val cast = Cast.cast(p) { acc -> vo[acc]?.jsonArray?.map { it.s() } ?: emptyList() }
                check("${c.s("id")}.${w.s("part")}", w["cast"], cast.mapValues { (_, x) -> obj("voice" to x.voice, "lang" to x.lang, "pitch" to x.pitch) })
            }
        }
    }

    @Test fun shared_lexis() {
        val l = v.o("shared").o("lexis")
        for (c in l.a("classify").map { it.jsonObject }) { val (awl, link) = lexis.classify(c.s("input")); check("classify ${c.s("input")}", c["out"], obj("awl" to awl, "link" to link)) }
        for (c in l.a("bases").map { it.jsonObject }) check("bases ${c.s("input")}", c["out"], lexis.bases(c.s("input")))
        for (c in l.a("mark").map { it.jsonObject }) {
            val inp = c.o("input"); val kw = inp.a("keywords").map { it.s() }.toSet(); val mine = inp.a("mine").map { it.s() }.toSet()
            check("mark ${c.s("id")}", c["out"], lexis.markSentence(inp.s("sentence"), kw) { it in mine }.map(::tokJson))
        }
    }
    private fun tokJson(x: Any): Any = if (x is Lexis.Tok) listOfNotNull(x.text, x.w, x.cls, x.ph) else x

    @Test fun shared_qe() {
        val q = v.o("shared").o("qe")
        for (c in q.a("norm").map { it.jsonObject }) assertEquals(c.s("input"), c.s("out"), com.lexkite.app.core.vocab.Qe.norm(c.s("input")))
        for (c in q.a("words").map { it.jsonObject }) assertEquals(c.s("input"), c.n("out").toInt(), Qx.words(c.s("input")))
        for (c in q.a("gradeGap").map { it.jsonObject }) {
            val i = c.o("input"); val g = Qx.gradeGap(i.a("a").map { it.s() }, i.n("limit").toInt(), i.s("given"))
            check("gradeGap ${Js.stringify(i)}", c["out"], if (g.empty) obj("ok" to false, "empty" to true) else obj("ok" to g.ok, "over" to g.over))
        }
        for ((skill, rows) in q.o("band")) for ((raw, b) in rows.jsonArray.withIndex()) assertEquals("$skill $raw", Js.num(b), Qx.bandOf(raw, skill), 0.0)
        for (c in q.a("overall").map { it.jsonObject }) assertEquals(Js.stringify(c["input"]), c.n("out"), Qx.overall(c.a("input").map { Js.num(it) }), 0.0)
        for (c in q.a("collect").map { it.jsonObject }) {
            val res = Qx.collect(part(c.s("part").ifEmpty { c.o("input").s("part") }), answers(c.o("input").o("answers")))
            for ((n, w) in c.o("out")) { val r = res.getValue(n.toInt()); check("${c.s("id")}.$n", w, obj("ok" to r.ok, "given" to r.given, "answer" to r.answer, "kind" to r.kind, "over" to r.over)) }
            assertEquals(c.s("id"), c.o("out").size, res.size)
        }
    }

    /** "Results by question type" and "Làm lại câu sai" over the real graded part of the vector (t1p1-mixed: 8 notes gaps, 2 MCQ). */
    @Test fun qe_stats_and_retake() {
        val c = v.o("shared").o("qe").a("collect").map { it.jsonObject }.first { it.s("id") == "t1p1-mixed" }
        val res = Qx.collect(part("t1p1"), answers(c.o("input").o("answers")))
        val want = c.o("out").entries.map { (n, r) -> n.toInt() to r.jsonObject }
        val stats = Qx.stats(res)
        assertEquals(listOf("notes", "mcq"), stats.map { it.kind })
        for (st in stats) {
            val rows = want.filter { it.second.s("kind") == st.kind }
            assertEquals(st.kind, rows.count { it.second["ok"]!!.jsonPrimitive.booleanOrNull!! }, st.right)
            assertEquals(st.kind, rows.size, st.total)
            assertEquals(st.kind, rows.filter { !it.second["ok"]!!.jsonPrimitive.booleanOrNull!! }.map { it.first }, st.wrong)
            assertEquals(st.kind, Math.floor(st.right * 100.0 / st.total + 0.5).toInt(), st.pct)
        }
        assertEquals(63, stats[0].pct); assertEquals(listOf(3, 5, 6), stats[0].wrong); assertEquals(50, stats[1].pct); assertEquals(listOf(9), stats[1].wrong)
        assertEquals("Form / Note / Table Completion", Qx.kindName("notes")); assertEquals("True / False / Not Given", Qx.kindName("tfng")); assertEquals("unknown-kind", Qx.kindName("unknown-kind"))
        // retake: the right answer turns a wrong question right (also the one that was over the word limit), a wrong one stays wrong
        for (n in listOf(3, 5, 6, 9)) { val r = res.getValue(n); assertFalse("Q$n was wrong", r.ok)
            assertTrue("Q$n retaken right", Qx.recheck(r, r.alts.first()).ok); assertFalse("Q$n retaken wrong", Qx.recheck(r, "zzz").ok) }
        assertFalse(Qx.recheck(res.getValue(5), "38 one two three four").ok)
    }

    @Test fun shared_transcript() {
        val tr = v.o("shared").o("transcript"); val p = part(tr.s("part"))
        val plain = ListenPage.transcript(p, lexis, false)
        assertEquals(tr.n("lineCount").toInt(), plain.size)
        val want = tr.a("plain").map { it.jsonObject }
        assertEquals(12, want.size)
        for ((i, w) in want.withIndex()) { val r = plain[i]
            check("plain[$i]", w, if (r.line.say != null) obj("i" to r.line.i, "kind" to "say", "text" to r.line.say) else obj("i" to r.line.i, "kind" to "line", "speaker" to r.speaker, "tokens" to r.tokens!!.map(::tokJson))) }
        val ev = ListenPage.transcript(p, lexis, true).filter { it.ev.isNotEmpty() }
        check("withEvidence", JsonArray(tr.a("withEvidence").map { obj("i" to it.jsonObject["i"], "ev" to it.jsonObject["ev"]) }), ev.map { obj("i" to it.line.i, "ev" to it.ev.map(::leadNum)) })
    }

    // ====================================================== #/listening ======================================================
    @Test fun listening_hub() {
        for (c in v.a("listening").map { it.jsonObject }) {
            val i = c.o("input"); val ids = i.a("tests").map { it.s() }
            val h = ListenHub.hub(subset(ids), query(i.s("query")), i.o("localStorage")["vb.listenT"]?.s(), i["game"], i.s("lang"))
            check(c.s("id"), c["out"], obj("empty" to h.empty, "tabs" to h.tabs.map { obj("n" to it.n, "done" to it.done, "selected" to it.selected) }, "selected" to h.selected, "band" to h.band, "fullTest" to h.fullTest,
                "parts" to h.parts.map { p -> obj("id" to p.id, "part" to p.part, "partKey" to ListenHub.PART_KEYS[p.part], "best" to p.best, "title" to p.title, "sub" to p.sub, "speakers" to p.speakers.map { obj("flag" to it.first, "name" to it.second) }, "actions" to p.actions) },
                "tips" to ListenHub.TIPS, "persistedTest" to h.persistedTest))
        }
    }

    // ====================================================== #/listen ======================================================
    private fun renderJson(p: Part, exam: Boolean, rate: Double?): JsonObject {
        val pg = ListenPage.page(p, exam, rate)
        return obj("back" to obj("href" to pg.backHref, "label" to t(if (pg.toeic) "TOEIC" else "Luyện nghe")), "switchTo" to obj("href" to pg.switchHref, "label" to t(if (exam) "Chế độ luyện tập" else "Chế độ thi thật")),
            "head" to obj("test" to p.test, "part" to p.part, "partName" to t(ListenHub.PART_KEYS.getValue(p.part)), "qFrom" to p.qFrom, "qTo" to p.qTo), "title" to p.title, "context" to p.context,
            "speakers" to ListenHub.speakers(p).map { obj("flag" to it.first, "name" to it.second) },
            "player" to obj("playLabel" to "▶ " + t("Nghe"), "examNote" to exam, "hasBack" to pg.hasBack, "hasLive" to pg.hasLive, "rates" to pg.rates.map { obj("v" to it.v, "label" to (it.label ?: t("Chuẩn")), "selected" to it.selected) }),
            "transcriptHidden" to exam, "blurred" to true, "tipsOn" to pg.tipsOn, "submit" to t("Nộp bài & xem đáp án"))
    }

    @Test fun listen_render() {
        for (c in v.o("listen").a("render").map { it.jsonObject }) {
            val i = c.o("input"); val p = content.part(i.s("part"))
            if (p == null) { assertEquals(c.s("id"), "listening", c.o("out").s("fallback")); continue }
            check(c.s("id"), c["out"], renderJson(p, i.s("mode").contains("exam"), null))
        }
    }

    private class FakePort(val dict: JsonObject?, val deck: (String) -> Boolean = { false }) : WordPort {
        val calls = ArrayList<List<Any?>>(); val added = ArrayList<Triple<JsonObject, JsonObject?, Boolean>>()
        override suspend fun quick(w: String): JsonObject? { calls.add(listOf("quick", w)); return (dict?.get("quick") as? JsonObject) }
        override suspend fun lookup(w: String, examples: Boolean, image: Boolean): JsonObject? { calls.add(listOf("lookup", w, mapOf("examples" to examples, "image" to image))); return (dict?.get("lookup") as? JsonObject) }
        override suspend fun translateVi(s: String): String { calls.add(listOf("translateVi", s)); return "VI:$s" }
        override suspend fun translateTo(s: String, lang: String): String { calls.add(listOf("translateTo", s, lang)); return lang.uppercase() + ":" + s }
        override fun inDeck(w: String) = deck(w.lowercase())
        override suspend fun addWord(entry: JsonObject, context: JsonObject?, silent: Boolean) { added.add(Triple(entry, context, silent)) }
        override fun libraryEntry(w: String): JsonObject? = null
    }
    private fun addedJson(f: FakePort) = f.added.map { (e, c, _) -> obj("entry" to obj("word" to e["word"], "vi" to e["vi"]), "ctx" to c) }
    private fun gameKeys(g: JsonElement) = (g as JsonObject).keys.map { "game:$it" }.toSet()
    private fun wantKeys(route: String, id: String) = v.o("persist").o("byAction").o(route).a(id).map { it.s() }.filter { it.startsWith("game:") }.toSet()
    private fun mistakeRows(list: List<JsonObject>) = list.map { m -> obj("kind" to m["kind"], "qK" to m["qK"], "q" to m["q"], "answer" to m["answer"], "given" to (m["givenK"] ?: m["given"]), "explainK" to m["explainK"], "ref" to m["ref"], "n" to m["n"], "fixed" to m["fixed"]) }

    @Test fun listen_flows() {
        for (c in v.o("listen").a("flows").map { it.jsonObject }) {
            val i = c.o("input"); val p = part(i.s("part")); val exam = i.s("mode") == "exam"; val o = c.o("out"); val id = c.s("id")
            check("$id.initial", o["initial"], renderJson(p, exam, null))
            if (o["submitted"]?.s() == "false") { assertTrue("$id declined confirm: nothing graded", !i["confirmAnswer"]!!.jsonPrimitive.booleanOrNull!!); continue }
            val s = ListenPage.submit(p, answers(i.o("answerMap")), null, emptyList(), now)
            val r = o.o("result")
            check("$id.result", r, obj("cls" to (if (s.ok) "ok" else "no"), "right" to s.right, "total" to s.total, "xp" to s.xp, "advice" to t(s.advice), "links" to listOf("#/dictation/${p.id}"), "againButton" to true,
                "vocab" to p.vocab.map { obj("w" to it.first, "vi" to it.second, "button" to "+ " + t("Lưu")) }))
            assertEquals(id, t("Nghe đoạn có đáp án").let { "🔎 $it" }, o.s("evidenceLabel"))
            check("$id.rewards", o["rewards"], listOf(s.reward.json()))
            val gm = s.game as JsonObject
            check("$id.game", o["game"], obj("listenDone" to gm["listenDone"], "qstat" to gm["qstat"]))
            check("$id.mistakes", o["mistakes"], mistakeRows(s.mistakes))
            assertEquals("$id persisted game keys", wantKeys("listen", id), gameKeys(s.game))
            check("$id.transRows", o.o("after")["transRows"], ListenPage.transcript(p, lexis, true).filter { it.ev.isNotEmpty() }.map { obj("i" to it.line.i, "ev" to it.ev.map(::leadNum)) })
            for (h in o.a("hear").map { it.jsonObject }) {
                val n = h.n("n").toInt(); val cue = s.res.getValue(n).cue
                check("$id.hear$n", h, obj("n" to n, "cue" to cue, "cueLine" to ListenPage.evidenceLine(p, cue), "startsAt" to ListenPage.hearFrom(p, cue)))
            }
            for ((k, w) in o.a("vocabSave").map { it.jsonObject }.withIndex()) {
                val port = FakePort(null); runBlocking { WordPopup.saveVocab(port, p, k, "vi") }
                check("$id.vocab$k", obj("dictCalls" to w["dictCalls"].let { dc -> JsonArray((dc as JsonArray).map { JsonArray(listOf(it.jsonArray[0])) }) }, "addWord" to w["addWord"]),
                    obj("dictCalls" to port.calls.map { listOf(it[0]) }, "addWord" to addedJson(port)))
            }
        }
    }

    @Test fun listen_popup() {
        val p = part("t1p1")
        for (c in v.o("listen").a("popup").map { it.jsonObject }) {
            val i = c.o("input"); val port = FakePort(i.o("dict"), { i["inDeck"]!!.jsonPrimitive.booleanOrNull == true }); val word = i.s("word"); val sentence = i.s("sentence")
            val open = runBlocking { WordPopup.open(port, word) }; val o = c.o("out")
            check("${c.s("id")}.calls", o["dictCalls"], port.calls)
            val e = open.entry
            check("${c.s("id")}.ctx", o["ctxBox"], if (e == null) emptyList<Any>() else listOf(obj("sentence" to sentence, "word" to e["word"])))
            check("${c.s("id")}.popup", o["popup"], if (e == null) obj("notFound" to t("Không tìm thấy “{w}”.", "w" to word)) else obj("word" to e["word"], "mean" to CardMath.meanOf(e), "saveLabel" to "+ " + t(if (open.saved) "Thêm ngữ cảnh" else "Lưu flashcard")))
            if (e != null) {
                port.calls.clear(); runBlocking { WordPopup.save(port, e, sentence, "🎧 Listening: ${p.title}", i.s("learnLang")) }
                check("${c.s("id")}.save", o["save"], obj("dictCalls" to port.calls, "addWord" to addedJson(port), "buttonLabel" to "✓ " + t("Đã lưu kèm ngữ cảnh"), "buttonDisabled" to true))
            }
        }
    }

    // ---------- the Player ----------
    /** A recording platform: clips exist for [hq] keys, [failed] clips error out, plays count against the hold like the web recorder (speak() and audio.play()). */
    private class TestIO(val hq: Set<String>, val failed: Set<String>, val blocked: Boolean, val noSpeech: Boolean, val log: MutableList<JsonElement>) : PlayerIO {
        var played = 0; var holdAt: Int? = null; val toasts = ArrayList<String>(); val preloaded = ArrayList<String>(); val waits = ArrayList<Long>(); val queued = ArrayList<Boolean>()
        private fun held() = holdAt != null && played >= holdAt!!
        fun hold(n: Int?) { holdAt = n?.let { played + it } }
        override val canPlay get() = !noSpeech || hq.isNotEmpty()
        override val canSpeak get() = !noSpeech
        override suspend fun playClip(key: String, rate: Double, onPlaying: () -> Unit): Clip {
            if (key !in hq) return Clip.MISSING
            if (blocked) return Clip.BLOCKED
            played++; log.add(JsonArray(listOf(JsonPrimitive("audio"), JsonPrimitive(key), JsonPrimitive(Math.round(rate * 1e6) / 1e6))))
            if (held()) awaitCancellation()
            if (key in failed) return Clip.FAILED
            onPlaying(); return Clip.PLAYED
        }
        override fun preload(key: String) { if (key in hq) preloaded.add(key) }
        override fun queue(u: Utter) { played++; queued.add(held()); log.add(JsonArray(listOf(JsonPrimitive("speak"), JsonPrimitive(u.text), J2(u.voice), JsonPrimitive(u.lang), JsonPrimitive(u.pitch), JsonPrimitive(u.rate)))) }
        private fun J2(s: String?): JsonElement = if (s == null) JsonNull else JsonPrimitive(s)
        override suspend fun awaitSpeech(onStart: () -> Unit) {
            val first = queued.first(); val last = queued.last(); queued.clear()
            if (first) awaitCancellation()
            onStart()
            if (last) awaitCancellation()
        }
        override suspend fun delay(ms: Long) { waits.add(ms); log.add(JsonArray(listOf(JsonPrimitive("wait"), JsonPrimitive(ms)))) }
        override fun stopAll() { queued.clear() }
        override fun toast(key: String) { toasts.add(key) }
    }
    private fun ev(vararg x: Any?) = JsonArray(x.map { J(it) })

    @OptIn(ExperimentalCoroutinesApi::class)
    private class Run(val player: ListenPlayer, val io: TestIO, val log: MutableList<JsonElement>, val sched: TestCoroutineScheduler)
    @OptIn(ExperimentalCoroutinesApi::class)
    private fun run(p: Part, voices: JsonObject?, hqLines: List<Int>, failedLines: List<Int>, blocked: Boolean, noSpeech: Boolean, rate: Double?, skipNarrator: Boolean, hqVoice: Boolean): Run {
        val kv = KVoice.voices(p); val keys = hqLines.map { KVoice.lineKey(kv, p.script[it]) }
        val log = ArrayList<JsonElement>(); val io = TestIO(keys.toSet(), failedLines.map { keys[hqLines.indexOf(it)] }.toSet(), blocked, noSpeech, log)
        val sched = TestCoroutineScheduler(); val scope = CoroutineScope(StandardTestDispatcher(sched))
        val cast = Cast.cast(p) { acc -> voices?.get(acc)?.jsonArray?.map { it.s() } ?: emptyList() }
        val events = PlayerEvents({ log.add(ev("line", it)) }, { log.add(ev("state", it)) }, { log.add(ev("end")) }, { log.add(ev("sound")) }, if (blocked) ({ log.add(ev("blocked")) }) else null)
        return Run(ListenPlayer(p, cast, io, scope, events, { rate ?: 0.95 }, skipNarrator, { hqVoice }), io, log, sched)
    }

    @OptIn(ExperimentalCoroutinesApi::class)
    @Test fun listen_player() {
        val base = part("t1p1")
        for (c in v.o("listen").a("player").map { it.jsonObject }) {
            val i = c.o("input"); val n = i.n("lines").toInt(); val p = cut(base, n)
            val r = run(p, i["voices"] as? JsonObject, i.a("hqLines").map { it.jsonPrimitive.content.toInt() }, i.a("failedClips").map { it.jsonPrimitive.content.toInt() }, i["blocked"]!!.jsonPrimitive.booleanOrNull == true, i["voices"] is JsonNull,
                (i["rate"] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.let { Js.num(it) }, i["skipNarrator"]!!.jsonPrimitive.booleanOrNull == true, (i.o("settings")["hqVoice"]?.jsonPrimitive?.booleanOrNull) != false)
            for (op in i.a("ops").map { it.jsonArray }) {
                r.log.add(JsonArray(listOf<JsonElement>(JsonPrimitive("op")) + op))
                when (op[0].s()) {
                    "play" -> { if (op.size > 2 && op[2] !is JsonNull) r.io.hold(op[2].jsonPrimitive.content.toInt()); r.player.play((op.getOrNull(1) as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content?.toInt()) }
                    "pause" -> { r.io.hold(null); r.player.pause() }
                    "stop" -> { r.io.hold(null); r.player.stop() }
                    "back" -> { r.io.hold(null); r.player.back() }
                }
                r.sched.advanceUntilIdle()
            }
            val o = c.o("out"); val id = c.s("id")
            sub("$id.events", o["events"], JsonArray(r.log), 1e-5)
            check("$id.toasts", o["toasts"], r.io.toasts)
            check("$id.preloaded", o["preloaded"], r.io.preloaded.distinct())
            assertEquals("$id.pos", o.n("pos").toInt(), r.player.position); assertEquals("$id.playing", o["playing"]!!.jsonPrimitive.booleanOrNull, r.player.isPlaying)
        }
    }

    // ====================================================== #/listen-test ======================================================
    @OptIn(ExperimentalCoroutinesApi::class)
    @Test fun listen_test() {
        val lt = v.o("listen-test"); val intro = lt.o("intro"); val o0 = intro.o("out")
        check("intro", o0, obj("title" to "IELTS Listening – Test ${intro.o("input").n("n").toInt()}", "buttons" to listOf(t("Bắt đầu thi"), t("Để sau")), "parts" to content.partsOf(1).map { it.id }, "unknownTest" to (if (content.partsOf(999).isEmpty()) 1 else 0)))
        assertTrue(content.partsOf(999).isEmpty())
        for (c in lt.a("flows").map { it.jsonObject }) {
            val i = c.o("input"); val o = c.o("out"); val id = c.s("id"); val n = i.n("test").toInt(); val parts = content.partsOf(n); val held = i["held"]!!.jsonPrimitive.booleanOrNull == true
            val results = java.util.TreeMap<Int, Pair<Qx.Res, String>>()
            for ((k, w) in o.a("parts").map { it.jsonObject }.withIndex()) {
                val p = parts[k]
                // the 30 s read time, then the audio plays once from line 0; the next button opens when it ended (or after 20 s)
                val r = run(p, VR, emptyList(), emptyList(), false, false, null, false, true)
                if (held && k == 0) r.io.hold(2) // web: o.hold only on the first part
                r.player.play(0); r.sched.advanceUntilIdle()
                val ended = r.log.any { it.jsonArray[0].s() == "end" }
                val firstSpeak = r.log.first { it.jsonArray[0].s() == "speak" }.jsonArray[1].s()
                check("$id.part$k", JsonObject(w.filterKeys { it != "whenListened" && it != "stuck" }), obj("part" to p.id, "chip" to obj("test" to p.test, "part" to p.part, "qFrom" to p.qFrom, "qTo" to p.qTo), "progressPct" to k * 100.0 / parts.size, "countdown" to t("{n} giây đọc câu hỏi", "n" to ListenTest.READ_SECONDS),
                    "nextLabel" to (if (k < parts.size - 1) t("Sang phần tiếp") + " →" else w.s("nextLabel").also { assertTrue(it.contains(t("Nộp bài"))) }), "nextDisabledInitially" to true, "why" to t("Nghe hết phần này để mở nút tiếp"), "skipButton" to true, "tickMs" to ListenTest.TICK_MS,
                    "countdownAt29" to "⏳ " + t("{n} giây đọc câu hỏi", "n" to 1), "afterStart" to "⏳ " + t("Đang tải…"), "firstSpeak" to firstSpeak,
                    "waits" to (r.io.waits.distinct() + ListenTest.STUCK_MS).distinct().sorted(), "answers" to w["answers"]))
                if (ended) check("$id.part$k.listened", w["whenListened"], obj("count" to "✓ " + t("Hết phần nghe – kiểm tra lại đáp án"), "nextDisabled" to false, "now" to ""))
                else check("$id.part$k.stuck", w["whenListened"], obj("count" to "🔊 " + t("Đang phát – chỉ nghe 1 lần"), "nextDisabled" to true, "now" to "🎙️ " + t("Lời dẫn")))
                if (held && k == 0) check("$id.part$k.fallback", w["stuck"], obj("fallbackMs" to ListenTest.STUCK_MS, "nextDisabledBefore" to true, "nextDisabledAfter" to false))
                for ((q, res) in Qx.collect(p, answers(w.o("answers")))) results[q] = res to p.id
            }
            val d = ListenTest.finish(n, parts, results, null, emptyList(), now)
            val res = o.o("result")
            check("$id.result", res, obj("band" to d.band, "raw" to d.raw, "byPart" to parts.mapIndexed { k, p -> obj("href" to "#/listen/${p.id}", "part" to p.part, "right" to d.byPart[k]) },
                "sheet" to d.sheet.map { q -> val (r, _) = results.getValue(q); linkedMapOf<String, Any?>("q" to q, "ok" to r.ok, "answer" to r.answer).also { if (!r.ok && r.given.isNotEmpty()) it["given"] = r.given } },
                "links" to listOf("#/listening", "#/mistakes")))
            check("$id.rewards", o["rewards"], listOf(d.reward.json()))
            check("$id.game", o["game"], d.game)
            assertEquals("$id persisted game keys", wantKeys("listen-test", id), gameKeys(d.game))
            assertEquals("$id.mistakes", o.n("mistakes").toInt(), d.mistakes.size)
            if (d.mistakes.isNotEmpty()) check("$id.firstMistake", o["firstMistake"], mistakeRows(listOf(d.mistakes[0]))[0])
            assertEquals("$id.celebrate", (o.o("celebrate").a("sfx").size == 1), d.band >= 7)
        }
    }
    private val VR: JsonObject by lazy { obj("en-GB" to listOf("Daniel", "Kate"), "en-US" to listOf("Samantha")) }

    // ====================================================== #/dictation ======================================================
    @Test fun dictation() {
        val d = v.o("dictation"); val p = part("t1p1")
        val lines = Dictation.lines(p)
        for (c in d.a("walks").map { it.jsonObject }) {
            val mode = c.o("input").s("mode")
            check("walk ${c.s("id")}", c.o("out")["lines"], lines.mapIndexed { k, l -> val w = Dictation.toks(l.t!!)
                obj("k" to k, "speaker" to p.speakerName(l.s), "nWords" to w.size, "holes" to Dictation.cells(w, mode).mapIndexedNotNull { j, x -> if (x.hole) listOf(j, x.size) else null }) })
        }
        for (c in d.a("render").map { it.jsonObject }) {
            val mode = c.o("input").s("mode"); val o = c.o("out")
            check("render ${c.s("id")}", o["cells"], lines.take(2).mapIndexed { k, l -> val w = Dictation.toks(l.t!!)
                obj("k" to k, "speaker" to p.speakerName(l.s), "cells" to Dictation.cells(w, mode).mapIndexed { j, x -> if (x.hole) obj("pre" to x.pre, "hole" to j, "size" to x.size, "post" to x.post) else x.word }) })
            assertEquals(o.n("count").toInt(), lines.size)
            val fin = Dictation.finish(p.id, mode, 0.0, 0, null)
            check("render ${c.s("id")}.skippedAll", o["skippedAll"], obj("done" to true, "pct" to fin.pct, "count" to fin.count, "links" to fin.links))
        }
        for (c in d.a("diff").map { it.jsonObject }) {
            val i = c.o("input"); val r = Dictation.diff(i.s("target"), i.s("typed"))
            check("diff ${c.s("id")}", c["out"], obj("pct" to r.rounded, "cls" to (if (r.ok) "ok" else "no"), "diff" to r.items))
        }
        // sessions
        val typed = d.a("diff").map { it.jsonObject.o("input").s("typed") }
        for (c in d.a("session").map { it.jsonObject }) {
            val mode = c.o("input").s("mode"); val o = c.o("out"); var score = 0.0; var done = 0; var firstWrong: Dictation.Check? = null
            for ((k, l) in lines.withIndex()) {
                val w = Dictation.toks(l.t!!); val holes = Dictation.cells(w, mode).filter { it.hole }
                val perfect = holes.map { Dictation.answerOf(it) }
                val r = when (c.s("id")) {
                    "diff-session" -> if (k < typed.size) Dictation.check(l, mode, emptyList(), typed[k]) else null
                    "mid-alternating" -> if (k % 2 == 1) Dictation.check(l, mode, holes.map { "x" }, "") else Dictation.check(l, mode, perfect, l.t!!)
                    else -> if (k % 3 != 0) null else Dictation.check(l, mode, perfect, l.t!!)
                } ?: continue
                score += r.pct; done++; if (k == 1) firstWrong = r
            }
            val fin = Dictation.finish(p.id, mode, score, done, null)
            check("session ${c.s("id")}", o["fin"], obj("done" to true, "pct" to fin.pct, "count" to fin.count, "links" to fin.links))
            check("session ${c.s("id")}.rewards", o["rewards"], listOf(fin.reward.json()))
            check("session ${c.s("id")}.dictDone", o["dictDone"], (fin.game as JsonObject)["dictDone"])
            assertEquals("persisted game keys", wantKeys("dictation", c.s("id")), gameKeys(fin.game))
            o["firstWrong"]?.let { w -> val f = firstWrong!!
                check("firstWrong", w, obj("k" to 1, "typed" to List(f.of) { "x" }, "checkLabel" to t("Câu tiếp") + " ↵", "right" to f.right, "of" to f.of, "cls" to (if (f.ok) "ok" else "no"), "cells" to f.cells.map { (ok, word) -> listOf(if (ok) "ok" else "no", word) })) }
        }
        val cast = Cast.cast(p) { acc -> VR[acc]?.jsonArray?.map { it.s() } ?: emptyList() }; val kv = KVoice.voices(p)
        for (c in d.a("say").map { it.jsonObject }) {
            val i = c.o("input"); val l = lines[i.n("line").toInt()]; val keys = i.a("clipKeys").map { it.s() }.toSet()
            val s = Dictation.say(l, cast, kv, i["slow"]!!.jsonPrimitive.booleanOrNull == true, 0.95, true)
            val events = if (s.clipKey in keys) listOf(listOf("audio", s.clipKey, s.clipRate)) else s.utters.map { listOf("speak", it.text, it.voice, it.lang, it.pitch, it.rate) }
            check("say ${c.s("id")}", c.o("out")["events"], events, 1e-5)
        }
        for (c in d.a("settings").map { it.jsonObject }) {
            if (c.o("input").has("part")) { assertNull(content.part(c.o("input").s("part"))); continue }
            val i = c.o("input"); assertEquals(c.o("out").s("startMode"), Dictation.mode(null, null)); assertEquals(c.o("out").s("afterModeChange"), Dictation.mode(i.s("mode"), null))
            assertEquals("hard", Dictation.mode("hard", "full")); assertEquals("full", Dictation.mode(null, "full"))
        }
    }
    private fun JsonObject.has(k: String) = containsKey(k)

    // ====================================================== #/reading, #/read ======================================================
    @Test fun reading_list() {
        for (c in v.a("reading").map { it.jsonObject }) {
            val i = c.o("input"); val m = Reader.list(subset(readings = i.a("readings").map { it.s() }), query(i.s("query")), i.o("localStorage")["vb.readLv"]?.s(), i["game"], i.s("learnLang"))
            check(c.s("id"), c["out"], obj("tabs" to m.tabs.map { obj("lv" to it.lv, "label" to (if (it.lv == "all") t("Tất cả") else it.lv), "n" to it.n, "selected" to it.selected) },
                "cards" to m.cards.map { k -> obj("id" to k.r.id, "emoji" to k.r.emoji, "title" to k.r.title, "summary" to k.summary, "summaryKind" to k.summaryKind, "minutes" to k.r.minutes, "questions" to k.r.questions.size, "done" to k.done) },
                "selected" to m.selected, "persistedLevel" to m.persistedLevel))
        }
    }

    private fun passageJson(p: Reader.Passage) = p.paras.map { para -> para.map { s -> s.map(::tokJson) } }

    @Test fun read_render() {
        for (c in v.o("read").a("render").map { it.jsonObject }) {
            val i = c.o("input"); val o = c.o("out"); val id = c.s("id")
            if (i.containsKey("id")) { assertNull(content.reading(i.s("id"))); continue }
            if (i.containsKey("settingsHl")) { check(id, o["passageClasses"], Reader.highlights(i.s("settingsHl")).map { "hl-$it" }); continue }
            val r = content.reading(i.s("reading"))!!; val deck = i.a("cards").map { it.s().lowercase() }.toSet()
            val ps = Reader.passage(r, lexis) { it in deck }; val hl = Reader.highlights(null)
            check(id, o, obj("back" to obj("href" to "#/reading", "label" to "← " + t("Tất cả bài đọc")), "level" to r.level, "topic" to r.topic, "emoji" to r.emoji, "title" to r.title, "summaryKind" to "text",
                "highlightChips" to hl.map { obj("k" to it, "on" to true) }, "passageClasses" to hl.map { "hl-$it" }, "counts" to ps.counts, "paragraphs" to ps.paras.size, "sentences" to ps.sentences, "words" to ps.words,
                "questions" to r.questions.size, "keywordChips" to r.keywords.size, "passage" to passageJson(ps)))
        }
    }

    @Test fun read_popup() {
        for (c in v.o("read").a("popup").map { it.jsonObject }) {
            val i = c.o("input"); val r = content.reading(i.s("reading"))!!; val word = i.s("word"); val sentence = i.s("sentence"); val o = c.o("out")
            val port = FakePort(i.o("dict")) { i["inDeck"]!!.jsonPrimitive.booleanOrNull == true }
            val open = runBlocking { WordPopup.open(port, word) }; val e = open.entry
            check("${c.s("id")}.calls", o["dictCalls"], port.calls)
            check("${c.s("id")}.ctx", o["ctxBox"], if (e == null) emptyList<Any>() else listOf(obj("sentence" to sentence, "word" to e["word"])))
            check("${c.s("id")}.popup", o["popup"], if (e == null) obj("notFound" to (t("Không tìm thấy “{w}”.", "w" to word) + (if (open.translation.isNotEmpty()) " " + t("Dịch: <b>{vi}</b>", "vi" to open.translation).replace(Regex("<[^>]+>"), "") else "")))
                else obj("word" to e["word"], "mean" to CardMath.meanOf(e), "def" to e["def"], "saveLabel" to "+ " + t(if (open.saved) "Thêm ngữ cảnh" else "Lưu flashcard"), "detailsHref" to "#/dict/${e.s("word")}"))
            if (e != null) {
                port.calls.clear(); runBlocking { WordPopup.save(port, e, sentence, "Bài đọc: ${r.title}", i.s("learnLang")) }
                val after = Reader.passage(r, lexis) { it == word.lowercase() }.counts
                check("${c.s("id")}.save", o["save"], obj("dictCalls" to port.calls, "addWord" to addedJson(port), "buttonLabel" to "✓ " + t("Đã lưu kèm ngữ cảnh"), "minedTokens" to true, "countsAfter" to after))
            }
        }
    }

    @Test fun read_actions() {
        for (c in v.o("read").a("actions").map { it.jsonObject }) {
            val i = c.o("input"); val r = content.reading(i.s("reading"))!!; val o = c.o("out"); val id = c.s("id")
            val ps = Reader.passage(r, lexis) { false }
            when (id) {
                "highlight-toggle" -> { var on = Reader.highlights(i.s("start")).toSet()
                    for ((k, w) in o.a("steps").map { it.jsonObject }.withIndex()) { val (n, saved) = Reader.toggle(on, i.a("toggles")[k].s()); on = n
                        check("$id.$k", obj("toggled" to w["toggled"], "settings" to w["settings"], "passage" to w["passage"]), obj("toggled" to i.a("toggles")[k].s(), "settings" to saved, "passage" to Reader.HL.filter { it in n }.map { "hl-$it" })) }
                    assertEquals("persisted settings", setOf("settings:hl"), v.o("persist").o("byAction").o("read").a(id).map { it.s() }.toSet()) }
                "save-all-keywords" -> { val port = FakePort(null) { it in i.a("alreadyInDeck").map { x -> x.s() } }
                    val n = runBlocking { WordPopup.saveKeywords(port, r, ps) }
                    check("$id.saved", JsonArray(o.a("saved").map { obj("entry" to obj("word" to it.jsonObject.o("entry")["word"]), "ctx" to it.jsonObject["ctx"], "opts" to it.jsonObject["opts"]) }), port.added.map { (e, ctx, silent) -> obj("entry" to obj("word" to e["word"]), "ctx" to ctx, "opts" to obj("silent" to silent)) })
                    assertEquals(id, o.n("n").toInt(), n); assertEquals(id, o.a("toasts")[0].s(), t("Đã lưu {n} từ khóa kèm câu ngữ cảnh", "n" to n)); assertEquals(id, o.s("buttonLabel"), "✓ " + t("Đã lưu")) }
                "keyword-chip" -> { assertNotNull(Reader.keywordToken(ps, i.s("keyword"))); assertEquals(o.a("waits")[0].jsonArray[0].s(), "wait"); assertEquals(350L, Reader.KEYWORD_POPUP_MS) }
                else -> { val ra = Reader.readAloud(ps)
                    assertTrue(id, ra.text.startsWith(o.s("textStartsWith"))); assertEquals(id, o.n("textLength").toInt(), ra.text.length); assertEquals(id, o.n("sentences").toInt(), ps.sentences)
                    check("$id.highlight", o["highlight"], ra.spokenToShown.take(o.a("highlight").size).map { listOf(it) })
                    assertEquals(id, o.s("labelWhilePlaying"), "⏹ " + t("Dừng đọc")); assertEquals(id, o.s("labelAfter"), "🔊 " + t("Nghe cả bài")) }
            }
        }
    }

    @Test fun read_questions() {
        for (c in v.o("read").a("questions").map { it.jsonObject }) {
            val i = c.o("input"); val r = content.reading(i.s("reading"))!!; val o = c.o("out"); val id = c.s("id")
            val picks = i.a("picks").map { if (it is JsonNull) null else it.jsonPrimitive.content }
            val ask = picks.size < r.questions.size || picks.any { it == null }
            if (ask && i["confirmAnswer"]!!.jsonPrimitive.booleanOrNull == false) { assertFalse(id, o["graded"]!!.jsonPrimitive.booleanOrNull!!); continue }
            val g = Reader.grade(r, picks, obj("readDone" to i["alreadyDone"]), emptyList(), now)
            check("$id.result", o["result"], obj("score" to g.score, "n" to g.n, "pct" to g.pct, "cls" to (if (g.ok) "ok" else "no"), "xp" to g.xp, "links" to listOf("#/reading", "#/practice/learn?src=deck")))
            check("$id.items", o["items"], g.items.mapIndexed { k, it -> obj("chosen" to it.chosen?.let { c -> if (r.questions[k].isTfng) c else c.toInt() }, "classes" to it.classes, "explain" to it.explain, "explainHidden" to false, "locked" to true) })
            check("$id.rewards", o["rewards"], listOf(g.reward.json()))
            val gm = g.game as JsonObject
            check("$id.game", o["game"], obj("readDone" to gm["readDone"]))
            check("$id.mistakes", o["mistakes"], mistakeRows(g.mistakes))
            assertEquals("$id persisted game keys", wantKeys("read", id), gameKeys(g.game))
        }
    }

    // ================================================================== P07: speaking & pronunciation (vectors/speak.json, web/data/speak-pack.json) ==================================================================
    private val sp by lazy { Json.parseToJsonElement(javaClass.classLoader!!.getResource("speak.json")!!.readText()).jsonObject }
    private val spackFull: SpeakPack by lazy { SpeakPack.parse(javaClass.classLoader!!.getResource("speak-pack.json")!!.readText())!! }
    private val spStarter: SpeakPack? by lazy { SpeakPack.parse(javaClass.classLoader!!.getResource("speak-starter.json")!!.readText()) }
    private val spNow by lazy { sp.getValue("now").jsonPrimitive.long }
    private fun cyc(a: List<Double>): () -> Double { var i = 0; return { a[i++ % a.size] } }
    private fun nums(j: JsonElement?): List<Double> = (j as JsonArray).map { it.jsonPrimitive.content.toDouble() }
    private fun strs(j: JsonElement?): List<String> = (j as JsonArray).map { it.s() }
    private fun trk(x: Tr) = x.json()
    private fun cases(o: JsonElement?): List<JsonObject> = (o as JsonArray).map { it.jsonObject }
    private fun cid(c: JsonObject) = c["id"]?.s() ?: "case"

    /** P07: the downloaded pack and the bundled starter parse, carry the contract numbers and the scoring calibration of score.js. */
    @Test fun parity_P07() {
        val p = spackFull
        val k = sp.o("counts") // generated by gen-speak.mjs from the same web data as the pack; floors below only go UP
        assertEquals(k.n("lessons").toInt(), p.lessons.size); assertEquals(k.n("bank").toInt(), p.bank.size); assertEquals(k.n("scripts").toInt(), p.scripts.size); assertEquals(k.n("contrasts").toInt(), p.contrasts.size); assertEquals(k.n("coachSentences").toInt(), p.coachSentences.size)
        assertTrue(p.lessons.size >= 62 && p.bank.size >= 40 && p.scripts.size >= 33 && p.contrasts.size >= 23 && p.coachSentences.size >= 12)
        assertEquals(k.n("daily").toInt(), p.scripts.count { it.daily }); assertEquals(p.scripts.size - k.n("daily").toInt(), p.scripts.count { !it.daily }); assertTrue(p.scripts.count { it.daily } >= 15 && p.scripts.count { !it.daily } >= 18)
        val st = spStarter!!; assertEquals(8, st.bank.size); assertEquals(8, st.lessons.size); assertEquals(6, st.scripts.size)
        assertTrue(SpeakScore.pass(0.8)); assertFalse(SpeakScore.pass(0.7999)); assertFalse(SpeakScore.pass(1.0, unclear = true))
        assertTrue(p.weak.containsKey("the") && p.light.contains("i"))
        assertEquals(setOf("speak", "speaking", "pron", "say", "reflex", "rtype", "roleplay", "handsfree"), com.lexkite.app.feature.speak.SPEAK_ROUTES)
    }

    @Test fun p07_recognize() {
        for (c in cases(sp.o("shared").o("recognize").a("best"))) { val i = c.o("input"); val h = SpeakScore.best(i.s("target"), strs(i.a("alts"))); assertEquals(cid(c), c.o("out").s("heard"), h.heard); assertEquals(cid(c), c.o("out").n("score").toInt(), h.score) }
    }

    @Test fun p07_speakScore() {
        val sh = sp.o("shared").o("speak")
        for (c in cases(sh.a("align"))) { val i = c.o("input"); val w = SpeakScore.align(i.s("target"), i.s("heard")); check(cid(c), c["out"], w.map { obj("w" to it.w, "ok" to it.ok) }) }
        for ((k, c) in cases(sh.a("pass")).withIndex()) { val i = c["input"]; val want = c["out"]!!.jsonPrimitive.booleanOrNull!!
            val got = if (i is JsonObject) SpeakScore.pass(i.n("text"), i["unclear"]?.jsonPrimitive?.booleanOrNull == true) else false; assertEquals("pass[$k]", want, got) }
        for ((k, c) in cases(sh.a("intentOf")).withIndex()) { val i = c.o("input"); val intents = i.a("intents").map { it.jsonObject.s("id") to strs(it.jsonObject.a("keywords")) }
            val want = c["out"].let { if (it is JsonNull) null else it.s() }; assertEquals("intentOf[$k]", want, SpeakScore.intentOf(i.s("heard"), intents)) }
        for ((k, c) in cases(sh.a("toks")).withIndex()) assertEquals("toks[$k]", strs(c["out"]), SpeakScore.toks(c.s("input")))
        for (c in cases(sh.a("flows"))) { val o = c.o("input").o("opts"); val ev = c.o("input").a("script").map { it.jsonObject }; val start = ev.firstOrNull { it.s("ev") == "start" }?.n("at") ?: 0.0 /* no start event: the clock starts at the call */; val res = ev.firstOrNull { it.s("ev") == "result" } /* errors / unsupported: nothing heard */
            val heard = res?.s("heard") ?: ""; val words = SpeakScore.align(o.s("target"), heard); val r = c.o("out").o("result")
            check(cid(c) + ".text", r["text"], SpeakScore.text(words), 1e-6); check(cid(c) + ".words", r["words"], words.map { obj("w" to it.w, "ok" to it.ok) })
            assertEquals(cid(c) + " wpm", r.o("fluency").n("wpm").toInt(), if (res == null) 0 else SpeakScore.wpm(heard, (res.n("at") - start).toLong())) }
    }

    // ---- #/speak: the three-beat drill replays every case; the situation hub reads the same progress ----
    private val spSit by lazy { Situation(sp.o("data").o("situations").o("cafe"), "en") }
    @Test fun p07_situation() {
        for (c in cases(sp.o("speak").a("situation"))) { val i = c["input"] as? JsonObject ?: continue; val o = c.o("out"); if (!i.containsKey("progress")) continue
            val s = Situation(sp.o("data").o("situations").o(i.s("arg")), "en"); val cards = strs(i.a("cards")).associateWith { "" }
            val h = SpeakHub.hub(s, i["progress"] as JsonObject, cards, i.n("now").toLong()); val id = cid(c)
            check("$id.nodes", o["nodes"]?.let { JsonArray(it.jsonArray.map { n -> JsonObject(n.jsonObject.filterKeys { k -> k != "label" }) }) }, h.nodes.map { obj("st" to it.st, "stars" to it.stars, "href" to "#/speak/${s.id}/drill?stage=${it.stage}", "starsAria" to it.aria.json()) })
            check("$id.tasks", o["tasks"]?.let { JsonArray(it.jsonArray.map { n -> JsonObject(n.jsonObject.filterKeys { k -> k == "done" || k == "st" || k == "ex" }) }) }, h.tasks.map { obj("done" to it.done, "st" to it.st, "ex" to it.ex) })
            check("$id.stage", o["stage"], h.stage.json()); check("$id.taskDone", o["taskDone"], h.taskDone.json()); assertEquals("$id mastered", o.s("mastered"), h.mastered); check("$id.remain", o["remain"], h.remain.json())
            assertEquals("$id pct", o.n("pct").toInt(), h.pct); check("$id.week", o["week"], h.week.json()); check("$id.addon", JsonArray(o.a("addon").map { obj("w" to it.jsonObject["w"]) }), h.addon.map { obj("w" to it.w) })
        }
    }

    @Test fun p07_drill() {
        val line0 = spSit.line(spSit.order(null)[0])!!
        for (c in cases(sp.o("speak").a("drill"))) { val i = c.o("input"); val id = cid(c); val trace = c.o("out").a("trace").map { it.jsonObject }
            val prog = i["progress"] as? JsonObject; val stage = query(i.s("query"))["stage"]
            val d = SpeakDrill(spSit, prog, stage, false) { 0.5 }
            assertEquals("$id limit", i.n("quickLimitMs"), SpeakDrill(spSit, null, null, false) { 0.5 }.limitMs, 1e-6)
            fun state(step: JsonObject, tag: String) {
                step["line"]?.let { assertEquals("$tag line", it.jsonObject.o("v").n("n").toInt(), d.i + 1); assertEquals("$tag total", it.jsonObject.o("v").n("m").toInt(), d.total) }
                step["pct"]?.let { assertEquals("$tag pct", it.jsonPrimitive.content.toDouble().toInt(), d.pct) }
                step["say"]?.let { assertEquals("$tag say", it.jsonObject.s("k"), d.say.k) }
                step["res"]?.let { assertEquals("$tag res", it.jsonPrimitive.boolean, d.res != null) }
                step["stars"]?.let { assertEquals("$tag stars", it.jsonPrimitive.content.toInt(), d.res?.stars ?: 0) }
                step["canNext"]?.let { assertEquals("$tag canNext", it.jsonPrimitive.boolean, d.canNext) }
                step["noMic"]?.let { assertEquals("$tag noMic", it.jsonPrimitive.boolean, d.noMic) }
                step["score"]?.let { assertEquals("$tag score", it.s(), (d.res?.score ?: 0).toString()) }
                step["beats"]?.let { b -> assertEquals("$tag beats", strs(b).indexOfFirst { x -> x.endsWith("*") }, d.b) }
            }
            state(trace[0], "$id.open")
            val script = i.a("script").map { it.jsonObject }
            for ((k, st) in script.withIndex()) { val tr = trace[k + 1]; val tag = "$id.step$k"
                when {
                    st.containsKey("mic") -> { val m = st.o("mic"); d.recording(); d.onMic(MicOutcome(if (m.s("heard") == "=") d.line.en else m.s("heard"), 0.0, m["error"]?.s(), m.n("ms").toLong()), spNow)
                        if (tr.containsKey("writes") && tr.a("writes").isNotEmpty()) check("$tag.writes", tr.a("writes")[0].jsonObject["lk.spk"], d.progress, 1e-6)
                        val rw = tr["rewards"]; if (rw is JsonArray && rw.isNotEmpty()) { assertEquals("$tag spoken", rw[0].jsonObject.n("spoken").toInt(), d.paid?.spoken); assertEquals("$tag xp", rw[0].jsonObject.n("xp").toInt(), d.paid?.xp) } else assertNull("$tag no reward", d.paid) }
                    st["act"]?.s() == "spkNext" -> { d.settled(); d.next() }
                    st["act"]?.s() == "spkRetry" -> d.retry()
                    st.containsKey("tap") -> { d.tap(st.n("tap").toInt(), spNow); if (tr.containsKey("writes") && tr.a("writes").isNotEmpty()) check("$tag.writes", tr.a("writes")[0].jsonObject["lk.spk"], d.progress, 1e-6); val rw = tr["rewards"]; assertTrue("$tag no reward in tap mode", rw == null || (rw as JsonArray).isEmpty()) }
                }
                if (!d.finished) state(tr, tag) else assertTrue("$tag finished toast", tr.containsKey("toast") || tr["hash"] != null)
            }
        }
        assertEquals("o1", line0.id)
    }
    @Test fun p07_week() { assertEquals("2026-W2", SpkProgress.week(spNow, java.time.ZoneOffset.UTC)) }
    @Test fun p07_fill() { val c = cases(sp.o("speak").a("fill"))[0]; val i = c.o("input"); check("fill", c["out"], Situation.fill(i["base"]!!, i.a("arr").toList(), i.s("lang"))) }

    // ---- #/speaking ----
    @Test fun p07_speaking() {
        val p = spackFull; val lx = pack.lexis
        for (c in cases(sp.o("speaking").a("render"))) { val i = c.o("input"); val id = cid(c)
            if (id == "navigation" || id == "next-question") continue
            val pg = SpeakingRoom.page(p, i.s("arg")); val o = c.o("out")
            check("$id.tabs", o["tabs"]?.let { JsonArray(it.jsonArray.map { t -> JsonObject(t.jsonObject.filterKeys { k -> k == "part" || k == "on" }) }) }, listOf("p1", "p2", "p3").map { obj("part" to it, "on" to (it == pg.part)) })
            if (pg.part == "p2") org.junit.Assert.assertTrue("$id cue card", o.s("question").startsWith(pg.topic.p2q)) /* the vector reads the whole card: question + "You should say" bullets */ else assertEquals("$id question", o.s("question").ifEmpty { pg.questions[0] }, pg.questions[0])
            o["clockHint"]?.let { check("$id.clockHint", it, SpeakingRoom.hintTarget(pg).json()) }; o["recHint"]?.let { check("$id.recHint", it, SpeakingRoom.hintRecord(pg).json()) }
            o["spoken"]?.let { assertEquals("$id spoken", it.jsonArray[0].jsonObject.s("text"), SpeakingRoom.askText(pg, 0)) }
        }
        val nq = cases(sp.o("speaking").a("render")).first { cid(it) == "next-question" }; val pg3 = SpeakingRoom.page(p, nq.o("input").s("arg")); var qi = 0; val seen = ArrayList<String>()
        for (k in 0 until 3) { qi = SpeakingRoom.nextQuestion(pg3, qi); seen.add(SpeakingRoom.askText(pg3, qi)) }; assertEquals(strs(nq.o("out")["spoken"]), seen)
        for (c in cases(sp.o("speaking").a("timer"))) { val o = c.o("out"); val id = cid(c); val pg = SpeakingRoom.page(p, (c.o("input")["part"]?.s() ?: "p1") + "/0")
            for ((k, st) in (o["steps"] ?: continue /* p2-prep: the prep countdown, no clock steps */).jsonArray.withIndex()) { val s = st.jsonObject; assertEquals("$id[$k] text", s.s("text"), SpeakingRoom.clock(s.n("secs"))); val col = SpeakingRoom.clockColor(pg, s.n("secs"))
                assertEquals("$id[$k] colour", s.s("color"), when (col) { "again" -> "var(--again)"; "good" -> "var(--good)"; else -> "" }) } }
        for (c in cases(sp.o("speaking").a("analyse"))) { val i = c.o("input"); val id = cid(c); val o = c.o("out"); val pg = SpeakingRoom.page(p, i.s("arg"))
            val text = when (val r = i["recognised"]) { is JsonArray -> r.joinToString(" ") { it.s() }.trim(); else -> r.s().trim() }
            if (!i.containsKey("seconds") || !o.containsKey("stats")) continue
            val a = SpeakingRoom.analyse(p, pg, text, i.n("seconds"), lx)
            assertEquals("$id seconds", o.a("stats")[0].jsonObject.s("value"), "${a.seconds}s"); assertEquals("$id wpm", o.a("stats")[1].jsonObject.s("value"), if (a.wpm != 0) a.wpm.toString() else "—")
            assertEquals("$id words", o.a("stats")[2].jsonObject.s("value"), a.words.toString()); assertEquals("$id fillers", o.a("stats")[3].jsonObject.s("value"), a.fillers.toString())
            check("$id.notes", o["notes"], a.notes.map { it.json() })
            val rw = o["rewards"] as JsonArray; if (rw.isEmpty()) assertNull("$id reward", a.reward) else check("$id.reward", rw[0], a.reward!!.json())
            if (o.containsKey("chips")) { val want = o.a("chips").map { it.jsonObject }.filter { it.s("kind") == "lv" || it.s("kind") == "link" }.map { it.s("kind") + ":" + it.s("text") }; assertEquals("$id chips", want, a.chips.filter { it.kind == "lv" || it.kind == "link" }.map { it.kind + ":" + it.text }) }
        }
        for (c in cases(sp.o("speaking").a("shadow"))) { val id = cid(c); val i = c.o("input")
            if (id == "sample-box") { val smp = p.samples[i.s("question")]!!; assertEquals(strs(c.o("out")["sentences"]), SpeakingRoom.sentences(smp)); assertEquals(c.o("out").a("vocab").map { it.jsonArray.map { x -> x.s() } }, smp.vocab.map { listOf(it.first, it.second) }) }
        }
        assertEquals(60, SpeakingRoom.shadowDone(listOf(90, 30), 2).pct); assertEquals(30, SpeakingRoom.shadowDone(listOf(90), 3).pct); assertEquals("good", SpeakingRoom.shadowColor(80)); assertEquals("medium", SpeakingRoom.shadowColor(79)); assertEquals("again", SpeakingRoom.shadowColor(59))
    }

    // ---- #/pron ----
    @Test fun p07_pronLogic() {
        val p = spackFull; val P = PronPairs(p); val C = PronCoach(p); val lg = sp.o("pron").o("logic"); val pr = lg.o("pairs"); val co = lg.o("coach")
        for ((k, c) in cases(pr.a("norm")).withIndex()) assertEquals("norm[$k]", strs(c["out"]), P.norm(c.s("input")))
        for (c in cases(pr.a("decide"))) { val i = c.o("input"); val alts = (i["alts"] as? JsonArray)?.map { if (it is JsonNull) null else it.s() } ?: listOf(i["alts"].s()); val d = P.decide(alts, i.s("target"), i.s("other")); assertEquals(cid(c), c.o("out").s("res"), d.res); assertEquals(cid(c) + " heard", c.o("out").s("heard"), d.heard) }
        for (c in cases(pr.a("sessions"))) { val i = c.o("input"); val cs = strs(i.a("contrasts")).map { id -> p.contrasts.first { it.id == id } }
            val stats = P.load(i["stats"]); val got = P.buildSession(cs, stats, i.n("n").toInt(), cyc(nums(i["random"])))
            check(cid(c), c["out"], got.map { obj("c" to it.c, "words" to it.words, "side" to it.side) }) }
        for (c in cases(pr.a("adapt"))) { val i = c.o("input"); val q = i.a("queue").map { x -> val o = x.jsonObject; PairItem(o.s("c"), strs(o.a("words")), emptyList(), o.n("side").toInt()) }.toMutableList()
            val idx = i.n("index").toInt(); P.adapt(q, idx, q[idx]); check(cid(c), c["out"], q.map { obj("c" to it.c, "words" to it.words, "side" to it.side).let { o -> if (it.retry) JsonObject(o + ("retry" to JsonPrimitive(true))) else o } }) }
        run { val c = cases(pr.a("stats"))[0]; val i = c.o("input"); val stats = LinkedHashMap<String, com.lexkite.app.core.speak.ContrastStat>(); for (op in i.a("ops")) P.record(stats, op.jsonArray[0].s(), op.jsonArray[1].jsonPrimitive.boolean)
            check("stats", c.o("out")["stats"], P.save(stats)); assertEquals(strs(c.o("out")["weak"]), P.weak(stats))
            val sess = i.o("session").entries.associate { (k, x) -> k to (x.jsonObject.n("ok").toInt() to x.jsonObject.n("n").toInt()) }; P.endSession(stats, sess, i.s("day")); check("afterEnd", c.o("out")["afterEnd"], P.save(stats)) }
        for (c in cases(pr.a("pairsOf"))) { val ct = p.contrasts.first { it.id == c.o("input").s("contrast") }; check(cid(c), c["out"], P.pairsOf(ct).take(4).map { obj("c" to it.c, "words" to it.words, "ipa" to it.ipa) }) }
        for ((k, c) in cases(pr.a("forSkill")).withIndex()) assertEquals("forSkill[$k]", strs(c["out"]), P.forSkill(c.s("input")).map { it.id })
        for (c in cases(co.a("plan"))) { val i = c.o("input"); val s = i["sentence"]; val plan = if (s is JsonObject) C.plan(s.s("s"), strs(s["w"]), i.s("accent")) else C.plan(s.s(), null, i.s("accent"))
            check(cid(c), c["out"], plan.map { obj("w" to it.w, "stress" to it.stress, "weak" to it.weak, "light" to it.light) }) }
        for (c in cases(co.a("diff"))) { val i = c.o("input"); val d = C.diff(i.s("heard"), i.s("target")); val o = c.o("out"); assertEquals(cid(c), strs(o["missing"]), d.missing); assertEquals(strs(o["missingContent"]), d.missingContent); assertEquals(strs(o["missingWeak"]), d.missingWeak); assertEquals(strs(o["extra"]), d.extra); assertEquals(o.n("cover"), d.cover, 1e-6) }
        for (c in cases(co.a("band"))) assertEquals(c.s("out"), C.band(c.o("input").n("score").toInt()))
        for (c in cases(co.a("score"))) { val i = c.o("input"); val d = C.diff(i.s("heard"), i.s("target")); assertEquals(cid(c), c.o("out").n("score").toInt(), C.score(i.n("sim"), d)) }
        for (c in cases(co.a("next"))) { val i = c.o("input"); val stats = P.load(i["stats"]); val rh = i.o("rhythm").entries.associate { (k, x) -> k.toInt() to x.jsonPrimitive.content.toDouble().toInt() }
            check(cid(c), c["out"], C.next(if (i["usePairs"]?.jsonPrimitive?.booleanOrNull == true) P else null, stats, rh, i.s("skill")).map { n -> if (n.kind == "rhythm") obj("kind" to n.kind, "k" to n.k) else if (n.kind == "pair") obj("kind" to n.kind, "id" to n.id, "skill" to n.skill) else obj("kind" to n.kind, "id" to n.id) }) }
    }

    @Test fun p07_pronPage() {
        val p = spackFull
        for (c in cases(sp.o("pron").a("hub"))) { val done = PronPage.doneOf(obj("pronDone" to c.o("input")["pronDone"])); val h = PronPage.hub(p, done); val o = c.o("out")
            assertEquals(cid(c), o.n("ring").toInt(), jsRoundForTest(h.ring)); assertEquals(o.s("ringLabel"), h.ringLabel); assertEquals(o.n("lessonCount").toInt(), h.total)
            for (g in h.groups) assertEquals(cid(c) + " " + g.g.id, o.o("counts").n(g.g.name).toInt(), g.lessons.size) }
        for (c in cases(sp.o("pron").a("mouth"))) { val i = c.o("input"); val m = PronPage.mouth(MouthSpec(JsonObject(mapOf("lips" to JsonPrimitive(i.s("lips")), "jaw" to JsonPrimitive(i.s("jaw")), "tongue" to JsonPrimitive(i.s("tongue"))))))!!; val o = c.o("out")
            for ((nm, got) in listOf("outerLip" to m.outerLip, "innerMouth" to m.innerMouth, "tongue" to m.tongue)) { val want = o.a(nm).map { it.jsonPrimitive.content.toDouble() }; assertEquals(nm, want.size, got.size); for (z in want.indices) assertEquals(nm, want[z], got[z], 1e-6) }
            assertEquals(o.s("caption"), m.caption.joinToString(" · ") { it.k }) }
        for (c in cases(sp.o("pron").a("lesson"))) { val id = cid(c); val i = c.o("input"); val l = p.lesson(i.s("lesson")) ?: continue; val o = c.o("out")
            if (id.startsWith("render")) { assertEquals("$id ipa", o.s("ipa"), l.ipa); assertEquals("$id title", o.s("title"), l.title); check("$id.chips", o["chips"], PronPage.chips(l).map { it.json() }); assertEquals("$id words", o.n("words").toInt(), l.words.size); assertEquals("$id pairs", o.n("pairs").toInt(), l.pairs.size)
                assertEquals("$id sentences", o.n("sentences").toInt(), l.sentences.size); assertEquals("$id quiz", o.n("quiz").toInt(), l.quiz.size); assertEquals("$id rules", o.n("rules").toInt(), l.rules.size); assertEquals("$id mouth", o["hasMouth"]!!.jsonPrimitive.boolean, PronPage.mouth(l.mouth) != null)
                assertEquals("$id sayIt", o.o("sections")["sayIt"]!!.jsonPrimitive.boolean, PronPairs(p).forSkill(l.id).isNotEmpty()); assertEquals("$id rhythm", o.o("sections")["rhythm"]!!.jsonPrimitive.boolean, l.id in PronGroups.RHYTHM); assertEquals("$id pairGame", o.o("sections")["pairGame"]!!.jsonPrimitive.boolean, l.pairs.isNotEmpty()) }
            if (id.startsWith("word-mic")) { var scores = emptyMap<Int, Int>(); var game: JsonElement? = obj("pronDone" to i["pronDone"]); val steps = o.a("steps").map { it.jsonObject }; val script = i.a("script").map { it.jsonObject }
                for ((k, st) in script.withIndex()) { val sc = st.n("score").toInt(); scores = PronPage.bestOf(scores, st.n("k").toInt(), sc); val want = steps[k]
                    assertEquals("$id[$k] colour", want.s("colour"), "--" + PronPage.scoreColor(sc).let { x -> if (x == "medium") "hard" else x }); val rw = want["rewards"] as JsonArray; if (rw.isEmpty()) assertNull(PronPage.wordReward(sc)) else check("$id[$k].reward", rw[0], PronPage.wordReward(sc)!!.json())
                    PronPage.lessonBest(scores, l.words.size)?.let { b -> game = PronPage.saveBest(game, l.id, b) } }
                o["saved"]?.let { want -> check("$id.saved", want, PronPage.doneOf(game)) } }
            if (id.startsWith("sentence-mic")) for (st in i.a("script")) { val sc = st.jsonObject.n("score").toInt(); assertEquals(sc >= 70, PronPage.sentenceReward(sc) != null) }
        }
        for (c in cases(sp.o("pron").a("pairGame"))) { val i = c.o("input"); val l = p.lesson(i.s("lesson"))!!; val rounds = PronPage.rounds(i["pairs"]?.jsonArray?.map { x -> x.jsonArray[0].s() to x.jsonArray[1].s() } ?: l.pairs, cyc(nums(i["random"])), shuffle = false) /* the web harness leaves the order alone */; val o = c.o("out"); val rights = i.a("rights").map { it.jsonPrimitive.boolean }
            for ((k, r) in rounds.withIndex()) { val w = o.a("rounds")[k].jsonObject; assertEquals("${cid(c)}[$k] options", strs(w["options"]), r.options); assertEquals("${cid(c)}[$k] spoken", w.s("spoken"), r.spoken); assertEquals(w.n("answerIndex").toInt(), r.answer) }
            val e = PronPage.pairEnd(rights.count { it }, rounds.size); assertEquals(cid(c), o["good"]!!.jsonPrimitive.boolean, e.good); check(cid(c) + ".final", o["final"], listOf(e.final[0].json(), obj("k" to "– " + e.final[1].k))); check(cid(c) + ".reward", o.a("rewards")[0], e.reward.json()) }
    }
    private fun jsRoundForTest(x: Double) = Math.floor(x + 0.5).toInt()

    @Test fun p07_pronSay() {
        val p = spackFull; val P = PronPairs(p)
        for (c in cases(sp.o("pron").a("say"))) { val i = c.o("input"); val id = cid(c); val o = c.o("out"); val cs = strs(i.a("contrasts")).map { x -> p.contrasts.first { it.id == x } }
            val stats = P.load(i["stats"]); val s = PairSession(P, cs, stats, "2026-01-05", cyc(nums(i["random"])))
            val steps = o.a("steps").map { it.jsonObject }; var si = 0
            if (!i.a("script").all { it.jsonObject.containsKey("o") }) continue
            for (sc in i.a("script").map { it.jsonObject }) { if (s.finished) break; val want = steps.getOrNull(si) ?: break
                assertEquals("$id[$si] target", want.s("target"), s.item.target); assertEquals("$id[$si] index", want.s("index"), "${s.i + 1}/${s.total}")
                if (want.containsKey("blocked")) { org.junit.Assert.assertTrue("$id[$si] blocked", com.lexkite.app.core.speak.RecError.blocked(sc.s("error"))); break } // the mic panel replaces the step (no state / next button in the vector)
                val outcome = sc.s("o"); val alts = when (outcome) { "good" -> listOf(s.item.target); "other" -> listOf(s.item.other); else -> emptyList() }
                val st = s.heard(alts); if (want.containsKey("state")) check("$id[$si].state", want["state"], st.state.json()); assertEquals("$id[$si] next", want["nextButton"]!!.jsonPrimitive.boolean, st.next)
                si++; if (st.next) s.next() }
            if (s.finished && o["final"] != null && o["final"] !is JsonNull) { val f = s.finish(); assertEquals("$id final", o.o("final").o("score").o("v").n("ok").toInt(), f.reward.add["spoken"]); check("$id.reward", o.a("rewards")[0], f.reward.json()) } }
        for (c in cases(sp.o("pron").a("rhythm"))) { val i = c.o("input"); val C = PronCoach(p); val s = p.coachSentences[i.n("sentence").toInt()].s; val at = C.attempt(s, i.s("heard"), strs(i.a("alts"))); val o = c.o("out")
            if (o.containsKey("score")) assertEquals(cid(c), o.n("score").toInt(), at.score); o["tips"]?.let { check(cid(c) + ".tips", it, listOfNotNull(at.tip).map { x -> x.json() }) }
            o["rewards"]?.let { r -> val rr = r as JsonArray; if (rr.isEmpty()) assertNull(at.reward) else check(cid(c) + ".reward", rr[0], at.reward!!.json()) } }
    }

    // ---- #/say ----
    @Test fun p07_say() {
        val d = SayData(sp.o("data").o("say")); val s = d.series[0]
        val rows = SayLogic.list(d, setOf("say-no/${s.items[0].id}", "say-no/${s.items[1].id}")); assertEquals(s.items[2].id, rows[0].firstCard.id); assertEquals(Math.floor(100.0 * 2 / s.items.size + 0.5).toInt(), rows[0].pct)
        assertEquals(s.items[0].id, SayLogic.list(d, s.items.map { "say-no/" + it.id }.toSet())[0].firstCard.id)
        val front = SayLogic.front(s, 0); val cf = cases(sp.o("say").a("card")).first { cid(it) == "card-front-vi" }.o("out").o("data")
        assertEquals(cf.s("ipa"), front.ipa); assertEquals(cf.n("pct"), front.pct, 1e-9); check("front.step", JsonPrimitive(cf.s("step").substringBefore("⟦")), JsonPrimitive(front.step.k)); assertEquals(cf.s("regLbl"), front.regLabelText())
        val back = cases(sp.o("say").a("card")).first { cid(it) == "back-vi" }.o("out").o("data"); val b = SayLogic.back(s, 0, "vi") { "Tiếng Việt" }
        assertEquals(back.s("meaning"), b.meaning); assertEquals(back.s("mLang"), b.mLang); assertEquals(back.s("dont"), b.dont); assertEquals(back.s("swap"), b.swap); assertEquals(back.s("next").removePrefix("#/"), b.next); assertEquals(back.s("dontAria"), b.dontAria!!.k)
        val en = SayLogic.back(s, 0, "en") { "English" }; assertEquals("en", en.mLang); assertNull(en.real); assertEquals("Nghĩa dễ hiểu", en.meaningLabel.k)
        for (c in cases(sp.o("say").a("mic"))) { val i = c.o("input"); val id = cid(c); val o = c.o("out"); if (id.startsWith("mic-error")) { check(id, o["text"], SayLogic.micError(i.s("error")).json()); continue }
            val sc = i.n("score").toInt(); val (t, h) = SayLogic.micText(sc, i.s("heard")); check(id, o["result"], t.json()); assertEquals(id + " heard", o["heardAppended"]!!.jsonPrimitive.boolean, h.isNotEmpty()) }
        val share = SayLogic.shareText(s, s.items[0]); assertEquals("https://lexkite.com/app/#/say/say-no/${s.items[0].id}", share.v["url"]); assertEquals("lexkite-say-${s.items[0].id}-1x1.png", SayLogic.fileName(s.items[0], false)); assertEquals("lexkite-say-${s.items[0].id}-4x5.png", SayLogic.fileName(s.items[0], true))
        assertEquals("say/say-no/${s.items[0].id}", SayLogic.nextId(s, s.items.size - 1)); assertEquals("af_heart", SayLogic.voiceOf("ama")); assertEquals("am_michael", SayLogic.voiceOf("carlos"))
        assertTrue(SayLogic.route(d, "").list); assertEquals("say/say-no/${s.items[0].id}", SayLogic.route(d, "say-no").replace); assertTrue(SayLogic.route(d, "zzz").list)
    }
    private fun SayLogic.Front.regLabelText() = regLbl.k

    // ---- #/reflex ----
    @Test fun p07_reflex() {
        for (c in cases(sp.o("reflex").a("colorize"))) { val i = c.o("input"); val r = Reflex.colorize(i.s("target"), i.s("heard")); val o = c.o("out")
            check(cid(c) + ".words", o["words"], r.words.map { listOf(it.first, it.second) }); assertEquals(cid(c) + " pct", o.n("pct").toInt(), r.pct); assertEquals(cid(c) + " shown", o.s("shown"), r.shown); }
        val g = cases(sp.o("reflex").a("game"))[0]; val items = strs(g.o("input")["items"]); var score = 0; var done = 0; val heard = strs(g.o("input")["heard"])
        for ((k, t) in items.withIndex()) { score += Reflex.colorize(t, heard[k]).pct; done++ }; val e = Reflex.end(score, done); check("reflex.final", g.o("out")["final"], e.final.map { it.json() }); check("reflex.reward", g.o("out").a("rewards")[0], e.reward!!.json())
        assertNull(Reflex.end(0, 0).reward); assertEquals(Pair("abcDEF12345", 65), Reflex.ytOf("https://www.youtube.com/watch?v=abcDEF12345&t=65s")); assertEquals(Pair("shortID1234", 30), Reflex.ytOf("https://youtu.be/shortID1234?t=30")); assertNull(Reflex.ytOf("https://example.com/x"))
        val pool = cases(sp.o("reflex").a("pool")).first { cid(it) == "sources-order" }; val inp = pool.o("input")
        val contexts = inp.o("cards").entries.flatMap { (_, v) -> v.jsonArray.map { it.jsonObject.s("text") to it.jsonObject.s("source") } }
        val got = Reflex.sources(contexts, emptyList(), emptyList(), { true }, { it })
        assertEquals(strs(pool.o("out")["targets"]).take(3), got.map { it.text }.take(3))
    }

    // ---- #/rtype ----
    @Test fun p07_rtype() {
        val rt = Rtype.Pack.parse(sp.o("data").o("readtests")); assertEquals(8, Rtype.KINDS.size)
        for (c in cases(sp.o("rtype").a("hub")).take(2)) { val i = c.o("input"); val cards = Rtype.hub(rt, obj("rtype" to i["rtype"])); val o = c.o("out").a("cards"); for (k in cards) { val want = o.map { it.jsonObject }.firstOrNull { it.s("kind") == k.kind.id } ?: continue; /* the progress case lists only the kinds with attempts */ check(cid(c) + "." + k.kind.id, want["chip"], k.chip.json()); assertEquals(want.n("bar").toInt(), k.bar); check(cid(c) + ".note", want["note"], if (k.reached) obj("k" to "✅ " + k.note.k) else k.note.json()) } }
        for (c in cases(sp.o("rtype").a("flows"))) { val i = c.o("input"); val kind = i.s("kind"); val u = rt.of(kind)[0]; val prev = i["previous"] as JsonObject
            val ck = Rtype.check(u, answers(i.o("answers")), obj("rtype" to prev), emptyList(), rt.explain, spNow); val o = c.o("out"); val id = cid(c)
            check("$id.result", o["result"], ck.result.json()); check("$id.game", o["game"], JsonObject(mapOf("rtype" to (ck.game as JsonObject).getValue("rtype")))); check("$id.qstat", o["qstat"], (ck.game as JsonObject)["qstat"], 1e-9)
            check("$id.rewards", o.a("rewards")[0], ck.reward.json()); assertEquals("$id class", o.s("feedbackClass"), if (ck.ok) "ok" else "no")
            check("$id.mistakes", o["mistakes"], ck.mistakes.map { m -> obj("kind" to m["kind"], "q" to m["qK"], "answer" to m["answer"], "given" to (m["givenK"] ?: m["given"]), "explain" to m["explain"], "ref" to m["ref"]) }) }
    }

    // ---- #/roleplay ----
    @Test fun p07_roleplay() {
        val p = spackFull
        for (c in cases(sp.o("roleplay").a("chat"))) { val id = cid(c); val o = c.o("out"); val i = c.o("input")
            if (id.startsWith("server") || id == "offline-script" || id == "rp-chat-help" || id == "mic-turn" || id == "end-early") continue
            val s = p.script(i.s("script"))!!; val L = i.n("level").toInt(); val chat = Roleplay.Chat(p, s, L, "script"); chat.open(); val rnd = cyc(nums(i["random"])); val steps = o.a("steps").map { it.jsonObject }
            assertEquals("$id open", steps[0].a("bubbles")[0].jsonObject.s("text"), chat.hist[0].text)
            var k = 1
            for (a in i.a("actions").map { it.jsonObject }) { val want = steps[k++]
                when {
                    a.containsKey("say") -> { val t = chat.begin(a.s("say"))!!; val r = Roleplay.scripted(p, s, L, chat.i, t, chat.retried, rnd); chat.answer(r)
                        assertEquals("$id say", want.a("newBubbles")[1].jsonObject.s("text"), chat.hist.last().text); assertEquals("$id turn", want.s("turnLabel"), chat.turnLabel.k + "⟦" + chat.turnLabel.json().jsonObject["v"].toString() + "⟧") }
                    a.containsKey("hint") -> chat.hint()
                }
            }
            val rep = Roleplay.report(p, s, L, chat.hist.toList(), chat.hints, null)
            if (o.containsKey("report") && o["report"] !is JsonNull && rep != null) { val r = o.o("report"); assertEquals("$id ring", r.n("ring").toInt(), rep.ring); check("$id.meters", r["meters"], rep.meters.map { obj("label" to it.first.json(), "value" to it.second) }); check("$id.rewrites", r["rewrites"], rep.scores.rewrites.map { w -> obj("you" to w.you, "better" to w.better, "why" to w.why?.json()) }); check("$id.reward", o.a("rewards")[0], rep.reward.json()) }
        }
        for (c in cases(sp.o("roleplay").a("hub"))) { val i = c.o("input"); val h = Roleplay.hub(p, Roleplay.level(i["level"])); val o = c.o("out"); if (o.containsKey("everyday")) { assertEquals(o.n("everyday").toInt(), h.everyday.size); assertEquals(o.n("work").toInt(), h.work.size); assertEquals(o.n("scriptCount").toInt(), p.scripts.size) } }
        val b = cases(sp.o("roleplay").a("brief"))[0]; val sv = Roleplay.saveVocab(p.script("cafe")!!, 1); check("brief", b.o("out").a("saved")[0], obj("entry" to sv.entry, "ctx" to sv.context))
        val ai = cases(sp.o("roleplay").a("ai")); val day = ai[0].o("input"); var d: Roleplay.Day? = null; val modes = ArrayList<String>()
        repeat(4) { val left = Roleplay.aiLeft(p, false, d, day.s("today")); val m = Roleplay.mode(left, true); modes.add(m); if (m != "script") d = Roleplay.useAi(d, day.s("today")) }
        assertEquals(listOf("server", "server", "script", "script"), modes); assertEquals(Roleplay.UNLIMITED, Roleplay.aiLeft(p, true, null, "2026-01-05")); assertEquals("2026-01-06", Roleplay.useAi(Roleplay.Day("2026-01-05", 2), "2026-01-06").d); assertEquals(1, Roleplay.useAi(Roleplay.Day("2026-01-05", 2), "2026-01-06").n)
        val pr = ai[1].o("out"); val sc = p.script("cafe")!!; assertEquals(pr.s("systemPrompt"), Roleplay.systemPrompt(sc, 1) + "\nReturn JSON only.")
        val ch = Roleplay.Chat(p, sc, 1, "server"); ch.open(); ch.begin("Could I get a latte, please?"); assertEquals(pr.s("turnPrompt"), Roleplay.turnPrompt(sc, 1, ch.hist.toList(), 0))
        assertNull(Roleplay.aiScore(JsonObject(mapOf("natural" to JsonPrimitive("x"))))); assertNotNull(Roleplay.serverReply(JsonObject(mapOf("reply" to JsonPrimitive("Hi"))), false))
    }

    // ---- #/handsfree ----
    @Test fun p07_handsfree() {
        fun card(w: String, due: Long, added: Long, reps: Int = 1) = obj("word" to w, "vi" to "nghĩa $w", "ex" to "Example of $w.", "added" to added, "srs" to obj("reps" to reps, "last" to 1L, "due" to due))
        val now0 = spNow; val cards = linkedMapOf("a" to card("a", now0 + 1000, 1), "b" to card("b", now0 - 5000, 2), "c" to card("c", now0 + 3 * HandsFree.DAY_MS, 3))
        val q = HandsFree.queue("", cards, null, { null }, now0); assertEquals("Từ đến hạn ôn", q.title.k); assertEquals(listOf("b", "a"), q.words.map { it.gs("word") })
        val book = HandsFree.queue("", linkedMapOf("c" to cards.getValue("c")), null, { null }, now0); assertEquals("Sổ từ của bạn", book.title.k)
        val sess = HandsFree.queue("session", cards, listOf("a", "missing", "c"), { null }, now0); assertEquals(listOf("a", "c"), sess.words.map { it.gs("word") }); assertEquals("Phiên ôn tập ({n} thẻ)", sess.title.k)
        val log = ArrayList<String>()
        class Stop : RuntimeException()
        class Io(override val hidden: Boolean, val clips: Set<String>) : HfIO {
            private fun tick() { if (log.size > 40) throw Stop() }
            override suspend fun clip(text: String): Boolean { tick(); if (text in clips) { log.add("clip:$text"); return true }; return false }
            override suspend fun url(u: String) { tick(); log.add("url:$u") }; override suspend fun silence() { tick(); log.add("silence") }
            override suspend fun speak(text: String, lang: String, rate: Double) { tick(); log.add("speak:$text:$lang") }
            override suspend fun wait(ms: Long) { tick(); log.add("wait:$ms") }
        }
        val words = listOf(HfWord("alpha", "/a/", "chữ cái đầu", "Alpha is first.", "", ""), HfWord("beta", "/b/", "chữ cái thứ hai", "Beta is second.", "https://dict.example/beta", ""))
        fun run(hidden: Boolean, opt: HandsFree.Opt, clips: Set<String>): List<String> { log.clear(); try { runBlocking { HandsFree.Engine(words, opt, Io(hidden, clips), "en-GB", "vi-VN").run() } } catch (e: Stop) { }; return log.toList() }
        val visible = run(false, HandsFree.Opt(), setOf("alpha", "Alpha is first.")).take(7)
        assertEquals(listOf("clip:alpha", "wait:900", "wait:2200", "speak:chữ cái đầu:vi-VN", "wait:900", "clip:Alpha is first.", "wait:900"), visible)
        val hiddenRun = run(true, HandsFree.Opt(), emptySet()).take(6); assertEquals(listOf("silence", "silence", "url:https://dict.example/beta", "silence", "silence", "silence"), hiddenRun)
        assertFalse("no speech and no waits while the screen is off", hiddenRun.any { it.startsWith("speak") || it.startsWith("wait") })
        val off = run(false, HandsFree.Opt(ex = false, mean = false), emptySet()).take(5); assertEquals(listOf("speak:alpha:en-GB", "wait:900", "wait:2200", "wait:900", "wait:900"), off)
        val e = HandsFree.Engine(words, HandsFree.Opt(), Io(false, emptySet()), "en-GB", "vi-VN"); e.next(); assertEquals(1, e.i); e.next(); assertEquals(0, e.i); e.prev(); assertEquals(1, e.i)
        val m = HandsFree.meta(words[0], "Từ đến hạn ôn"); assertEquals("/a/ · chữ cái đầu", m.artist); assertEquals("Lexkite · Từ đến hạn ôn", m.album); assertEquals(900L, HandsFree.Opt.of(null).gap); assertFalse(HandsFree.Opt.of(obj("ex" to false)).ex)
        assertEquals("vi-VN", HandsFree.meaningLang("vi", "vi")); assertEquals("de-DE", HandsFree.meaningLang("en", "de"))
    }
}
