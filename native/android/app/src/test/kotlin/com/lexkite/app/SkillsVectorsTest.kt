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
    private val now = v.getValue("now").jsonPrimitive.long
    private val tx = Tx.RAW
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
    private fun query(q: String): Map<String, String> = if (q.isEmpty()) emptyMap() else q.split("&").associate { it.substringBefore("=") to java.net.URLDecoder.decode(it.substringAfter("=", ""), "UTF-8") }

    // ---------- content ----------
    private val data by lazy { v.o("data") }
    private val content by lazy { SkillsContent.parse(data) }
    private val lexis get() = content.lexis
    private fun part(id: String) = content.part(id)!!
    private fun subset(parts: List<String> = emptyList(), readings: List<String> = emptyList()) = SkillsContent(content.listening.filter { it.id in parts }, content.readings.filter { it.id in readings }, lexis)
    private fun cut(p: Part, n: Int) = Part(JsonObject(p.j + ("script" to JsonArray(p.j.a("script").take(n)))))
    private fun answers(o: JsonObject): Map<String, Any?> = o.entries.associate { (k, x) -> k to (if (x is JsonArray) x.map { it.s() } else x.s()) }

    // ====================================================== shared ======================================================
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
        assertEquals(u.a("bases").map { it.s() }, AudioLogic.BASES.take(2))
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
            for ((n, w) in c.o("out")) { val r = res.getValue(n.toInt()); check("${c.s("id")}.$n", w, obj("ok" to r.ok, "given" to r.given, "answer" to r.answer, "kind" to r.kind)) }
            assertEquals(c.s("id"), c.o("out").size, res.size)
        }
    }

    @Test fun shared_transcript() {
        val tr = v.o("shared").o("transcript"); val p = part(tr.s("part"))
        val plain = ListenPage.transcript(p, lexis, false)
        assertEquals(tr.n("lineCount").toInt(), p.script.size)
        val want = tr.a("plain").map { it.jsonObject }
        assertEquals(want.size, plain.size)
        for ((i, w) in want.withIndex()) { val r = plain[i]
            check("plain[$i]", w, if (r.line.say != null) obj("i" to r.line.i, "kind" to "say", "text" to r.line.say) else obj("i" to r.line.i, "kind" to "line", "speaker" to r.speaker, "tokens" to r.tokens!!.map(::tokJson))) }
        val ev = ListenPage.transcript(p, lexis, true).filter { it.ev.isNotEmpty() }
        check("withEvidence", JsonArray(tr.a("withEvidence").map { obj("i" to it.jsonObject["i"], "ev" to it.jsonObject["ev"]) }), ev.map { obj("i" to it.line.i, "ev" to it.ev) })
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
            check("$id.transRows", o.o("after")["transRows"], ListenPage.transcript(p, lexis, true).filter { it.ev.isNotEmpty() }.map { obj("i" to it.line.i, "ev" to it.ev) })
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
                if (held) r.io.hold(2)
                r.player.play(0); r.sched.advanceUntilIdle()
                val ended = r.log.any { it.jsonArray[0].s() == "end" }
                val firstSpeak = r.log.first { it.jsonArray[0].s() == "speak" }.jsonArray[1].s()
                check("$id.part$k", JsonObject(w.filterKeys { it != "whenListened" && it != "stuck" }), obj("part" to p.id, "chip" to obj("test" to p.test, "part" to p.part, "qFrom" to p.qFrom, "qTo" to p.qTo), "progressPct" to k * 100.0 / parts.size, "countdown" to t("{n} giây đọc câu hỏi", "n" to ListenTest.READ_SECONDS),
                    "nextLabel" to (if (k < parts.size - 1) t("Sang phần tiếp") + " →" else w.s("nextLabel").also { assertTrue(it.contains(t("Nộp bài"))) }), "nextDisabledInitially" to true, "why" to t("Nghe hết phần này để mở nút tiếp"), "tickMs" to ListenTest.TICK_MS,
                    "countdownAt29" to "⏳ " + t("{n} giây đọc câu hỏi", "n" to 1), "afterStart" to "⏳ " + t("Đang tải…"), "firstSpeak" to firstSpeak,
                    "waits" to (r.io.waits.distinct() + ListenTest.STUCK_MS).distinct().sorted(), "answers" to w["answers"]))
                if (ended) check("$id.part$k.listened", w["whenListened"], obj("count" to "✓ " + t("Hết phần nghe – kiểm tra lại đáp án"), "nextDisabled" to false, "now" to ""))
                else check("$id.part$k.stuck", w["whenListened"], obj("count" to "🔊 " + t("Đang phát – chỉ nghe 1 lần"), "nextDisabled" to true, "now" to "🎙️ " + t("Lời dẫn")))
                if (held) check("$id.part$k.fallback", w["stuck"], obj("fallbackMs" to ListenTest.STUCK_MS, "nextDisabledBefore" to true, "nextDisabledAfter" to false))
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
            val i = c.o("input"); val l = p.script[i.n("line").toInt()]; val keys = i.a("clipKeys").map { it.s() }.toSet()
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
                val after = Reader.passage(r, lexis) { it == word.lowercase() || port.inDeck(it) }.counts
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
}
