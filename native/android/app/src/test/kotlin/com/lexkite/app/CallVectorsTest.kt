package com.lexkite.app

import com.lexkite.app.core.call.Call
import com.lexkite.app.core.call.CallAskEnv
import com.lexkite.app.core.call.CallCallbacks
import com.lexkite.app.core.call.CallEngine
import com.lexkite.app.core.call.CallIO
import com.lexkite.app.core.call.CallListenOpts
import com.lexkite.app.core.call.CallPack
import com.lexkite.app.core.call.CallRec
import com.lexkite.app.core.call.CallResult
import com.lexkite.app.core.call.CallSession
import com.lexkite.app.core.call.CallTip
import com.lexkite.app.core.call.CNode
import com.lexkite.app.core.call.Fix
import com.lexkite.app.core.call.LogEntry
import com.lexkite.app.core.call.Note
import com.lexkite.app.core.call.Recap
import com.lexkite.app.core.call.Slip
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.core.sync.Js
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
 * P08 parity (#/call, Call Ama & Carlos): the Kotlin engine, list, ring, rewards, progress and the whole live call reproduce every case of vectors/call.json (web code run in node:vm by scripts/native/gen-call.mjs).
 * Every case of every list is run and compared (a mismatch fails, nothing is skipped). Text is compared in the web's Vietnamese source language (the `k` of a {k, v}); the platform (recogniser, speech, clock, timers) is a recorded fake.
 */
class CallVectorsTest {
    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("call.json")!!.readText()).jsonObject
    /** The downloaded pack (web/data/call-pack.json = https://lexkite.com/data/call-pack.json) and the bundled offline starter. */
    private val pack = CallPack.parse(javaClass.classLoader!!.getResource("call-pack.json")!!.readText())!!
    private val starter = CallPack.parse(javaClass.classLoader!!.getResource("call-starter.json")!!.readText())!!
    private val e = pack.engine
    private val now = v.getValue("now").jsonPrimitive.long
    private val data = v.o("data")

    // ---------- helpers ----------
    private fun JsonObject.o(k: String) = getValue(k).jsonObject
    private fun JsonObject.a(k: String) = getValue(k).jsonArray
    private fun JsonElement?.s() = if (this == null || this is JsonNull) "" else jsonPrimitive.content
    private fun JsonObject.s(k: String) = this[k].s()
    private fun JsonObject.n(k: String) = Js.num(this[k])
    private fun JsonObject.bool(k: String) = (this[k] as? JsonPrimitive)?.booleanOrNull == true
    private fun JsonObject.sOrNull(k: String): String? = this[k]?.takeIf { it !is JsonNull }?.jsonPrimitive?.content
    private fun J(x: Any?): JsonElement = when (x) { null -> JsonNull; is JsonElement -> x; is String -> JsonPrimitive(x); is Boolean -> JsonPrimitive(x); is Int -> JsonPrimitive(x); is Long -> JsonPrimitive(x); is Double -> JsonPrimitive(x)
        is Map<*, *> -> JsonObject(x.entries.associate { it.key.toString() to J(it.value) }); is Iterable<*> -> JsonArray(x.map { J(it) }); is Pair<*, *> -> JsonArray(listOf(J(x.first), J(x.second))); else -> JsonPrimitive(x.toString()) }
    private fun obj(vararg p: Pair<String, Any?>) = J(mapOf(*p)) as JsonObject
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
    private fun cases(x: JsonElement?): List<JsonObject> = (x as JsonArray).map { it.jsonObject }
    private fun cid(c: JsonObject) = c["id"]?.s() ?: "case"
    private fun strs(x: JsonElement?): List<String> = (x as JsonArray).map { it.s() }
    private fun callJson(id: String): JsonObject = data.a("calls").map { it.jsonObject }.first { it.s("id") == id }
    private fun callOf(id: String) = Call(callJson(id))
    /** A call named by an id of `data.calls`, or inline in the case. */
    private fun callIn(i: JsonObject): Call = (i["inlineCall"] as? JsonObject)?.let { Call(it) } ?: callOf(i.s("call"))
    private fun fixJ(f: Fix?) = f?.let { obj("bad" to it.bad, "good" to it.good, "why" to it.why.k, "whys" to it.whys.map { w -> w.k }) }
    private fun slipJ(s: Slip) = obj("said" to s.said, "meant" to s.meant, "id" to s.id, "skill" to s.skill)
    private fun noteJ(n: Note) = obj("id" to n.id).let { o -> if (n.id == "short" || n.id == "fillers") obj("id" to n.id, "n" to n.n) else if (n.id == "slow") obj("id" to n.id, "wpm" to n.wpm) else o }
    private fun recapJ(r: Recap) = obj("turns" to r.turns.map { t -> obj("id" to t.id, "m" to t.m, "text" to t.text, "picked" to t.picked, "fix" to fixJ(t.fix), "slips" to t.slips.map { slipJ(it) },
        "fl" to obj("words" to t.fl.words, "fillers" to t.fl.fillers, "short" to t.fl.short, "link" to t.fl.link, "wpm" to t.fl.wpm), "weak" to t.weak, "model" to t.model) },
        "spoken" to r.spoken, "picked" to r.picked, "words" to r.words, "uniq" to r.uniq, "fillers" to r.fillers, "wpm" to r.wpm, "used" to r.used, "target" to r.target, "notes" to r.notes.map { noteJ(it) }, "weak" to r.weak, "score" to r.score, "band" to r.band)
    private fun logOf(a: JsonArray) = a.map { x -> val o = x.jsonObject; LogEntry(o.s("id"), o.s("text"), o.bool("picked"), (o["secs"] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content?.toDouble(), (o["asr"] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content?.toDouble()?.toInt(), o.bool("typed")) }

    // ====================================================== pack + wiring ======================================================
    /** P08: the downloaded pack and the bundled starter parse and carry the contract numbers; the real calls of the vector data are the pack's; the route is wired. */
    @Test fun parity_P08() {
        assertEquals(35, pack.english.size); assertEquals(8, starter.english.size)
        assertEquals(listOf("all", "ielts", "toeic", "everyday"), e.groups); assertEquals(120, e.longSeconds); assertEquals(95, e.pctMax); assertEquals(11, e.names.size)
        for (c in data.a("calls").map { it.jsonObject }) { val p = pack.call(c.s("id"))!!; assertEquals(c.s("id"), Js.stringify(c, true), Js.stringify(JsonObject(p.raw.filterKeys { it != "_ok" }), true)) }
        for (c in starter.english) assertNotNull(c.id, pack.call(c.id))
        assertEquals(setOf("call"), com.lexkite.app.feature.speak.CALL_ROUTES)
        assertEquals(setOf("speak", "speaking", "pron", "say", "reflex", "rtype", "roleplay", "handsfree"), com.lexkite.app.feature.speak.SPEAK_ROUTES) // P07's set is untouched
        assertEquals(com.lexkite.app.core.link.DeepLink.SKILLS, com.lexkite.app.core.link.DeepLink.parse("lexkite://call")!!.tab)
        val persist = v.o("persist"); assertEquals(persist.a("localStorage").map { it.s() }.toSet(), setOf(CallPack.STORE_FILTER, CallPack.STORE_ASR, CallPack.STORE_TR))
        assertEquals(persist.a("removed").map { it.s() }, listOf(CallPack.STORE_ASR))
        assertTrue(pack.engine.unsafe(null)!!.containsMatchIn("what the fuck")); assertFalse(pack.engine.unsafe(null)!!.containsMatchIn("coffee"))
        assertEquals("Let's keep our chat friendly and on topic!", CallEngine.UNSAFE_LINE)
    }

    // ====================================================== engine ======================================================
    @Test fun p08_prep_depth() {
        val en = v.o("engine")
        for (c in cases(en.a("prep"))) { if (c.getValue("input") !is JsonObject) { assertEquals(cid(c) + " non-object call stays null", JsonNull, c["out"]); continue }; val call = Call(c.o("input")); check(cid(c), c["out"], obj("start" to call.start, "nodeIds" to call.nodes.keys.toList(), "nexts" to call.nodes.mapValues { it.value.next }, "flag" to true)) }
        for (c in cases(en.a("depth"))) assertEquals(cid(c), c.n("out").toInt(), e.depth(Call(c.o("input"))))
    }
    @Test fun p08_step() {
        for (c in cases(v.o("engine").a("step"))) { val i = c.o("input"); val call = callIn(i); val r = e.step(call, i.s("node"), i.s("text")); check(cid(c), c["out"], obj("react" to r.react, "next" to r.next, "br" to r.br)) }
    }
    @Test fun p08_correct() {
        for (c in cases(v.o("engine").a("correct"))) { val i = c.o("input"); val f = e.correct(i.s("text"), i.s("prompt")); val w = c["out"]
            if (w == null || w is JsonNull) assertNull(cid(c), f) else { assertNotNull(cid(c), f); check(cid(c), w, fixJ(f)) } }
    }
    @Test fun p08_slips() {
        for (c in cases(v.o("engine").a("slips"))) { val i = c.o("input"); val none = JsonObject(emptyMap()); val call = Call(i["call"] as? JsonObject ?: none); val node = CNode("n", i["node"] as? JsonObject ?: none); check(cid(c), c["out"], e.slips(i.s("text"), call, node).map { slipJ(it) }) }
    }
    @Test fun p08_fluency() {
        for (c in cases(v.o("engine").a("fluency"))) { val i = c.o("input"); val f = e.fluency(i.s("text"), CNode("n", i.o("node")), i.n("secs"), i.sOrNull("tl"))
            check(cid(c), c["out"], obj("words" to f.words, "fillers" to f.fillers, "short" to f.short, "link" to f.link, "wpm" to f.wpm)) }
    }
    @Test fun p08_recap() {
        for (c in cases(v.o("engine").a("recap"))) { val i = c.o("input"); check(cid(c), c["out"], recapJ(e.recap(callIn(i), logOf(i.a("log"))))) }
    }
    @Test fun p08_retry() {
        for (c in cases(v.o("engine").a("retry"))) { val i = c.o("input"); val r = e.retry(callOf(i.s("call")), strs(i.a("ids"))); check(cid(c), c["out"], r.json())
            if (c.o("out").s("start").isEmpty()) assertNull(cid(c), r.start) }
    }
    private fun web(i: JsonObject) = e.asrMode(i.bool("local"), i.bool("sr"), i.bool("media"), i.bool("ext"), i.bool("whisper"), i.sOrNull("pref"))
    @Test fun p08_asrMode() {
        val l = cases(v.o("engine").a("asrMode")); assertEquals(129, l.size)
        for (c in l) assertEquals(cid(c), c.s("out"), web(c.o("input")))
        val n = cases(v.o("engine").a("asrModeNative")); assertEquals(12, n.size)
        for (c in n) { val i = c.o("input"); assertEquals(cid(c), c.s("out"), e.asrModeNative(i.bool("onDevice"), i.bool("system"), i.sOrNull("pref"))) }
        // privacy of native: no recogniser at all ⇒ tap, never a silent cloud
        assertEquals("tap", e.asrModeNative(false, false, null)); assertEquals("ask", e.asrModeNative(false, true, null)); assertEquals("local", e.asrModeNative(true, true, null))
    }

    // ====================================================== list / ring ======================================================
    private fun envMode(env: JsonObject, ls: JsonObject, pref: String?) = e.asrMode(env.bool("local"), env.bool("sr"), env.bool("media"), env.bool("ext"), ls["vb.whisper"].s() == "1", pref)
    @Test fun p08_list() {
        for (c in cases(v.a("list"))) { val i = c.o("input"); val env = i.o("env"); val ls = i.o("ls"); var flt = ls.sOrNull("vb.call.flt") ?: "all"; var asr = ls.sOrNull("vb.call.asr")
            val steps = c.o("out").a("steps").map { it.jsonObject }; val actions = i.a("actions").map { it.jsonObject }; assertEquals(cid(c), actions.size + 1, steps.size)
            for ((k, st) in steps.withIndex()) { val id = cid(c) + ".step$k"
                if (k > 0) { val a = actions[k - 1]; if (a.containsKey("filter")) flt = a.s("filter") else if (a.containsKey("changeAsr")) asr = null }
                val o = st.o("out"); val cards = e.filtered(pack.english, flt); val (icon, priv) = e.privacy(envMode(env, ls, asr))
                check("$id.filter", o["filter"], obj("label" to obj("k" to "Lọc theo kỳ thi"), "buttons" to e.groups.map { g -> obj("group" to g, "pressed" to (g == flt), "label" to obj("k" to e.groupLabel(g).k)) }))
                if (o.containsKey("cards")) check("$id.cards", o["cards"], cards.map { x -> obj("id" to x.id, "em" to x.em, "name" to obj("k" to (e.nameKey(x)?.k ?: x.title)), "lv" to x.lv, "who" to x.teacher, "title" to x.title) })
                else check("$id.cardIds", o["cardIds"], cards.map { it.id })
                check("$id.privacy", o["privacy"], obj("icon" to icon, "k" to priv.k))
                check("$id.changeAsr", o["changeAsr"], if (asr != null) obj("k" to "Đổi cách nhận dạng") else null)
                if (st.containsKey("asrPrefAfter")) assertEquals("$id asrPrefAfter", st.sOrNull("asrPrefAfter"), asr)
            } }
    }
    @Test fun p08_ring() {
        for (c in cases(v.a("ring"))) { val i = c.o("input"); val id = i.s("call"); val call = pack.call(id); val o = c.o("out")
            if (o.containsKey("list")) { assertNull(cid(c), call); continue }
            assertNotNull(cid(c), call); call!!; val (icon, priv) = e.privacy(envMode(i.o("env"), JsonObject(emptyMap()), null))
            check(cid(c), o, obj("title" to obj("k" to (e.nameKey(call)?.k ?: call.title)), "lv" to listOf(call.lv, call.title), "teacher" to call.teacher, "role" to call.role, "privacy" to obj("icon" to icon, "k" to priv.k), "buttons" to listOf(obj("id" to "callGo", "label" to obj("k" to "Gọi ngay")), obj("href" to "#/call", "label" to obj("k" to "Cuộc gọi khác"))))) } // labels of CallRingScreen
    }

    // ====================================================== rewards / progress ======================================================
    @Test fun p08_rewards_progress() {
        for (c in cases(v.a("rewards"))) { val i = c.o("input"); check(cid(c), c["out"], e.reward(i.n("turns").toInt(), i.n("voiced").toInt(), i.n("usedWords").toInt()).json()) }
        for (c in cases(v.a("progress"))) { val i = c.o("input"); assertEquals(cid(c), c.s("out"), e.progress(i.n("depth").toInt(), i.n("logged").toInt(), i.bool("ended")).toString() + "%") }
    }

    // ====================================================== the live call ======================================================
    /** One recorded call: the fake platform (clock, speech, recogniser, timers, toasts, prefs) the session runs on, driven by the case's actions exactly like gen-call.mjs. */
    private inner class Flow(val c: JsonObject) : CallIO {
        val input = c.o("input"); val env = input.o("env"); val ls = input.o("ls"); val lang = input.s("lang").ifEmpty { "en" }
        var clock = now
        val prefs = HashMap<String, String?>().also { m -> for ((k, x) in ls) if (k.startsWith("vb.call.")) m[k.removePrefix("vb.call.")] = x.s() }
        val queue = ArrayList<() -> Unit>()
        val said = ArrayList<String>(); val reacts = ArrayList<Pair<String, Int>>(); val toasts = ArrayList<JsonObject>(); val phases = ArrayList<String>(); val writes = ArrayList<Pair<String, String>>()
        val rewards = ArrayList<JsonElement>(); val hash = ArrayList<String>(); val results = ArrayList<CallResult>(); val recs = ArrayList<H>(); val saved = ArrayList<JsonElement>()
        var session: CallSession? = null; var call: Call = callIn(input)
        inner class H(val o: CallListenOpts, val cb: CallCallbacks) : CallRec { override fun stop() {}; override fun cancel() {} }
        override fun now() = clock
        override fun mode() = envMode(env, ls, prefs["asr"])
        override fun pref(k: String): String? = prefs[k]
        override fun setPref(k: String, v: String) { prefs[k] = v; writes.add("vb.call.$k" to v) }
        override fun say(text: String, onEnd: () -> Unit) { said.add(text); queue.add(onEnd) }
        override fun stopSay() {}
        override fun recognize(o: CallListenOpts, cb: CallCallbacks): CallRec? { val h = H(o, cb); recs.add(h); return h }
        override fun after(ms: Long, f: () -> Unit) { queue.add(f) }
        override fun react(pose: String, ms: Int) { reacts.add(pose to ms) }
        override fun listenPose(on: Boolean) {}
        override fun toast(t: Tr, ms: Int) { toasts.add(t.json() as JsonObject) }
        override fun toastErr(code: String, ms: Int) { toasts.add(obj("recError" to code)) }
        override fun finished(r: CallResult) { results.add(r); rewards.add(r.reward.json()) }
        override fun hangup() { hash.add("#/call") }
        override fun changed() {}
        override fun phase(p: String) { phases.add(p) }
        fun drain() { var guard = 0; while (queue.isNotEmpty() && guard++ < 10_000) queue.removeAt(0)() }
        fun begin(cl: Call) { call = cl; val s = CallSession(e, cl, this, CallAskEnv(media = env.bool("media"), ext = env.bool("ext"), sr = env.bool("sr")), lang == "en"); session = s; s.begin() }
    }

    private fun tipOf(t: CallTip): JsonObject = when (t) { is CallTip.FixTip -> obj("kind" to "fix", "bad" to t.fix.bad, "good" to t.fix.good, "why" to obj("k" to t.fix.why.k)); is CallTip.SlipTip -> obj("kind" to "slip", "said" to t.slip.said, "meant" to t.slip.meant); else -> obj("kind" to "default", "k" to "Gợi ý trả lời") } // the tip row label of SpeakCall.kt
    private fun r3(x: Double?) = x?.let { Math.round(it * 1000) / 1000.0 }

    @Test fun p08_flows() {
        val flows = cases(v.a("flow")); assertEquals(19, flows.size)
        for (c in flows) { val id = cid(c); val f = Flow(c); val steps = c.o("out").a("steps").map { it.jsonObject }; val actions = c.o("input").a("actions").map { it.jsonObject }; assertEquals("$id steps", actions.size, steps.size)
            var logN = 0
            for ((k, a) in actions.withIndex()) { val tag = "$id.step$k.${steps[k].s("step")}"; val st = steps[k]
                val mSaid = f.said.size; val mReact = f.reacts.size; val mToast = f.toasts.size; val mPhase = f.phases.size; val mRew = f.rewards.size; val mWrite = f.writes.size; val mHash = f.hash.size; val mRec = f.recs.size; val mRes = f.results.size
                val timed = !(a.containsKey("start") || a.containsKey("ring") || a.containsKey("tick") || a.containsKey("save")); if (timed) f.clock += 4000
                val s = f.session
                when {
                    a.containsKey("start") -> f.begin(f.call)
                    a.containsKey("mic") -> { s!!.mic(); f.drain(); val h = f.recs.lastOrNull(); val m = a.o("mic")
                        if (h != null) { if (m["secs"] != null) f.clock += (m.n("secs") * 1000).toLong()
                            if (m["error"] != null) { h.cb.error(m.s("error")); h.cb.end() } else if (m["heard"] != null) { h.cb.start(); h.cb.result(m.s("heard"), m["score"]?.let { m.n("score").toInt() } ?: 90); h.cb.end() } else if (m["stop"] != null) h.cb.end() } }
                    a.containsKey("heard") -> { val h = f.recs.last(); if (a["secs"] != null) f.clock += (a.n("secs") * 1000).toLong(); val hd = a.o("heard"); h.cb.start(); h.cb.result(hd.s("text"), hd["score"]?.let { hd.n("score").toInt() } ?: 90); h.cb.end() }
                    a.containsKey("stale") -> { val h = f.recs[a.o("stale").n("index").toInt()]; h.cb.start(); h.cb.result(a.o("stale").s("text"), 90); h.cb.end() }
                    a.containsKey("tap") -> s!!.tapOption(a.n("tap").toInt())
                    a.containsKey("type") -> s!!.submitTyped(a.s("type"))
                    a.containsKey("tick") -> { var left = a.n("tick").toLong(); while (left > 0) { val d = minOf(500L, left); left -= d; f.clock += d; s!!.tick(); if (s.phase == "think") { f.clock += left; break } } }
                    a.containsKey("longDone") -> s!!.longDone()
                    a.containsKey("hang") -> s!!.hang()
                    a.containsKey("askPick") -> s!!.pickAsr(a.s("askPick"))
                    a.containsKey("tr") -> s!!.toggleSubtitles()
                    a.containsKey("save") -> { val r = f.results.last(); val cards = e.cards(r.call, r.recap); f.saved.add(J(cards.map { x -> obj("entry" to x.entry, "ctx" to x.ctx, "opts" to obj("silent" to true)) }))
                        f.toasts.add(Tr("Đã thêm {n} thẻ", mapOf("n" to cards.size)).json() as JsonObject); st["toasts"]?.let { t -> assertEquals("$tag.saved n", t.jsonArray[0].jsonObject.o("v").n("n").toInt(), cards.size) } }
                    a.containsKey("retry") -> { val r = f.results.last(); val base = pack.call(r.call.id) ?: r.call; f.begin(e.retry(base, r.recap.weak)) }
                    else -> error("$tag: unknown action")
                }
                f.drain()
                val cur = f.session!!; val view = cur.view()
                st["say"]?.let { w -> check("$tag.say", w, f.said.drop(mSaid)) }
                st["react"]?.let { w -> check("$tag.react", w, f.reacts.drop(mReact).map { obj("pose" to it.first, "ms" to it.second) }) }
                st["phases"]?.let { w -> val raw = f.phases.drop(mPhase); check("$tag.phases", w, raw.filterIndexed { n, x -> n == 0 || x != raw[n - 1] }) }
                st["status"]?.let { w -> check("$tag.status", w, obj("k" to CallEngine.statusTr(view.phase, f.call.teacher).k)) }
                st["state"]?.let { w -> check("$tag.state", w, obj("node" to view.nodeId, "phase" to view.phase, "mode" to f.mode(), "logged" to cur.log.size)) }
                if (cur.log.size < logN) logN = 0
                val fresh = cur.log.drop(logN); logN = cur.log.size
                st["log"]?.let { w -> check("$tag.log", w, fresh.map { x -> obj("id" to x.id, "text" to x.text, "picked" to x.picked, "secs" to r3(x.secs)).let { o -> JsonObject(o + (if (x.asr != null) mapOf("asr" to J(x.asr)) else emptyMap()) + (if (x.typed) mapOf("typed" to J(true)) else emptyMap())) } }) }
                st["you"]?.let { w -> assertEquals("$tag.you", w.s(), view.you) }
                st["tip"]?.let { w -> check("$tag.tip", w, tipOf(view.tip)) }
                st["options"]?.let { w -> check("$tag.options", w, view.options) }
                st["progress"]?.let { w -> assertEquals("$tag.progress", w.s(), "${view.pct}%") }
                st["micLabel"]?.let { w -> check("$tag.micLabel", w, obj("k" to CallEngine.micTr(view.phase).k)) }
                st["cue"]?.let { w -> val cu = view.cue; assertNotNull("$tag.cue", cu); val wo = w.jsonObject
                    assertEquals("$tag.cue.kind", wo.s("kind"), if (cu!!.long) "long" else "prep"); check("$tag.cue.points", wo["points"], cu.points)
                    wo.o("title").let { t -> if (t.containsKey("text")) assertEquals("$tag.cue.title", t.s("text"), cu.text) else assertEquals("$tag.cue.title", t.s("k"), cu.tr?.k) }
                    if (cu.points.isNotEmpty()) assertEquals(Tr("Bạn nên nói:").k, wo.o("hint").s("k")); if (cu.long) assertEquals("Tôi nói xong", wo.o("done").s("k")) }
                st["clock"]?.let { w -> assertEquals("$tag.clock", w.s(), view.cue?.clock) }
                st["longWords"]?.let { w -> assertEquals("$tag.longWords", w.jsonObject.o("v").n("n").toInt(), view.cue?.longWords) }
                st["ask"]?.let { w -> check("$tag.ask", w.jsonObject["choices"], view.ask!!.map { ch -> obj("id" to ch.id, "icon" to ch.icon, "k" to ch.label.k) }) }
                st["toasts"]?.let { w -> check("$tag.toasts", w, f.toasts.drop(mToast)) }
                st["rewards"]?.let { w -> check("$tag.rewards", w, f.rewards.drop(mRew)) }
                st["writes"]?.let { w -> check("$tag.writes", w, f.writes.drop(mWrite).map { obj("key" to it.first, "value" to it.second) }) }
                st["hash"]?.let { w -> check("$tag.hash", w, f.hash.drop(mHash)) }
                st["recognizer"]?.let { w -> val got = f.recs.drop(mRec); assertEquals("$tag.recognizer", w.jsonArray.size, got.size)
                    w.jsonArray.forEachIndexed { n, x -> val wo = x.jsonObject; val h = got[n]; val t = wo.s("target"); assertEquals("$tag.recognizer[$n].target", if (wo.containsKey("targetChars")) h.o.target.take(70) + "…" else h.o.target, t)
                        assertEquals("$tag.recognizer[$n].local", wo["setup"] != null && wo["setup"] !is JsonNull, h.o.local); if (h.o.local) check("$tag.recognizer[$n].phrases", wo.o("setup")["phrases"], h.o.words)
                        if (wo.bool("whisper")) assertEquals("$tag.recognizer[$n].maxMs", wo.n("maxMs").toInt(), h.o.maxMs) } }
                st["cards"]?.let { w -> check("$tag.cards", w, f.saved.last()) }
                st["summary"]?.let { w -> assertEquals("$tag.summary", mRes + 1, f.results.size); summaryCheck(tag, w.jsonObject, f.results.last()) }
            }
            assertEquals("$id store", c.o("out").a("store").map { it.s() }.toSet(), f.writes.map { it.first }.toSet())
            assertEquals("$id teacher", c.o("out").o("teacher").s("who"), f.call.who)
        }
    }

    private fun summaryCheck(tag: String, w: JsonObject, r: CallResult) {
        val rc = r.recap; val call = r.call; val nm = e.nameKey(call)?.k ?: call.title
        assertEquals("$tag.score", w.n("score").toInt(), rc.score); check("$tag.band", w["band"], obj("k" to e.bandText(rc.band).k))
        val h = w.o("header"); assertEquals("$tag.header.name", h.s("name"), nm); check("$tag.header.retry", h["retry"], if (call.retry) obj("k" to "Luyện lại") else null)
        check("$tag.header.duration", h["duration"], obj("k" to "{m} phút {s} giây", "v" to obj("m" to r.secs / 60, "s" to r.secs % 60))); assertEquals("$tag.header.xp", h.s("xp"), "+${r.reward.xp} XP")
        check("$tag.answered", w["answered"], obj("k" to "Bạn đã trả lời {n} lượt, trong đó {s} lượt bằng giọng nói.", "v" to obj("n" to rc.turns.size, "s" to r.voiced)))
        check("$tag.words", w["words"], if (rc.words > 0) obj("k" to "{n} từ", "v" to obj("n" to rc.words)) else null)
        check("$tag.topicWords", w["topicWords"], if (rc.target.isNotEmpty()) obj("title" to obj("k" to "Bạn đã dùng {n}/{k} từ chủ đề", "v" to obj("n" to rc.used.size, "k" to rc.target.size)), "chips" to rc.target.map { t -> obj("word" to t, "used" to (t in rc.used)) }) else null)
        check("$tag.notes", w["notes"], rc.notes.map { n -> val t = e.noteText(n); if (t.v.isEmpty()) obj("k" to t.k) else obj("k" to t.k, "v" to t.v) })
        check("$tag.turns", w["turns"], rc.turns.map { x -> val shown = x.weak || x.picked
            obj("weak" to x.weak, "teacher" to call.teacher, "question" to (x.m ?: ""), "answer" to x.text, "picked" to x.picked, "fix" to x.fix?.let { f -> obj("bad" to f.bad, "good" to f.good, "why" to obj("k" to f.why.k)) },
                "slips" to x.slips.map { s -> obj("meant" to s.meant, "said" to s.said, "skillHref" to s.skill) }, "shortHint" to x.fl.short, "modelShown" to shown, "model" to (if (shown) x.model else null)) })
        check("$tag.phrases", w["phrases"], call.phrases)
        check("$tag.buttons", w.o("buttons")["retry"], if (rc.weak.isNotEmpty()) obj("k" to "Luyện lại {n} câu yếu", "v" to obj("n" to rc.weak.size)) else null)
    }
}
