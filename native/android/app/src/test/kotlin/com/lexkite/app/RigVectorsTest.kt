package com.lexkite.app

import com.lexkite.app.core.rig.Cue
import com.lexkite.app.core.rig.FacePaint
import com.lexkite.app.core.rig.FaceState
import com.lexkite.app.core.rig.MouthParams
import com.lexkite.app.core.rig.PaintOp
import com.lexkite.app.core.rig.PaintShape
import com.lexkite.app.core.rig.RigDef
import com.lexkite.app.core.rig.RigMachine
import com.lexkite.app.core.rig.RigMatrix
import com.lexkite.app.core.rig.TeacherMood
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** C05 parity: the Kotlin teacher-rig core reproduces the web TeacherRig/LipFace/LipMouth/LipPaint/LipSync/TeacherMood (vectors/rig.json, scripts/native/gen-teach.mjs). */
class RigVectorsTest {
    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("rig.json")!!.readText()).jsonObject
    private val def = RigDef.parse(File("../../shared/gen/teach/rig.json").readText())
    private val ls = def.lipSync
    private val sources = v.o("sources")
    private val lip = v.o("lipsync")

    // ---------- helpers ----------
    private fun JsonObject.o(k: String) = getValue(k).jsonObject
    private fun JsonObject.a(k: String) = getValue(k).jsonArray
    private fun JsonElement.d() = jsonPrimitive.double
    private fun JsonElement.s() = jsonPrimitive.content
    private fun near(a: Double, e: Double, tol: Double) = Math.abs(a - e) <= tol
    private fun jsRound(x: Double): Double { val r = Math.floor(x); return if (x - r >= 0.5) r + 1 else r }

    private class Src(val dur: Double, val cues: List<Cue>, val env: DoubleArray)
    private fun src(key: String): Src {
        val s = sources.o(key); val dur = s.getValue("dur").d(); val c = s.a("cues")
        val cues = c.mapIndexed { i, x -> Cue(x.jsonArray[0].d(), if (i < c.size - 1) c[i + 1].jsonArray[0].d() else dur, x.jsonArray[1].s()) }
        return Src(dur, cues, s.a("env255").map { it.d() / 255 }.toDoubleArray())
    }

    private fun assertCues(what: String, exp: JsonArray, got: List<Cue>, tol: Double = 1e-9) {
        assertEquals("$what: cue count", exp.size, got.size)
        exp.forEachIndexed { i, e ->
            val x = e.jsonArray
            assertTrue("$what[$i] start ${got[i].start} vs ${x[0]}", near(got[i].start, x[0].d(), tol))
            assertTrue("$what[$i] end ${got[i].end} vs ${x[1]}", near(got[i].end, x[1].d(), tol))
            assertEquals("$what[$i] value", x[2].s(), got[i].value)
        }
    }

    private fun failIfAny(errs: List<String>) = assertTrue("${errs.size} mismatches:\n" + errs.take(25).joinToString("\n"), errs.isEmpty())

    // ---------- tests ----------
    @Test fun rigDefParses() {
        assertEquals(setOf("ama", "carlos"), def.people.keys)
        assertEquals(9, def.mouthShapes.size); assertEquals(9, def.emotions.size)
        assertTrue(def.face("carlos").stache != null && def.face("ama").stache == null)
        assertEquals(def.people.getValue("ama").seed, "ama".fold(7L) { a, c -> a * 31 + c.code }) // = TeacherRig.mount seed
    }

    @Test fun scenariosMatchWeb() {
        val cols = v.a("columns").map { it.s() }; val every = v.getValue("every").jsonPrimitive.int; val errs = ArrayList<String>()
        for (sc in v.a("scenarios").map { it.jsonObject }) {
            val id = sc.s("id"); val who = sc.s("who"); val dict = sc.b("dict"); val person = def.people.getValue(who)
            val M = RigMachine(def, who, calm = sc.b("calm"), seed = sc.getValue("seed").d().toLong(), has = person::has)
            val ev = sc.a("events").map { it.jsonObject }.sortedBy { it.getValue("t").d() }
            val rows = sc.a("rows"); val n = jsRound(sc.getValue("seconds").d() * 60).toInt(); var ei = 0; var r = 0; var cur = 0.0
            for (i in 0 until n) {
                val now = i / 60.0; cur = now
                while (ei < ev.size && ev[ei].getValue("t").d() <= now + 1e-9) {
                    val e = ev[ei++]
                    when (e.s("op")) {
                        "emotion" -> M.setEmotion(e.s("name"))
                        "listen" -> M.listen(e.b("on"))
                        "gesture" -> M.gesture(e.s("name"), now)
                        "quiet" -> M.quiet()
                        "speak" -> {
                            val t0 = now; val key = e["source"]?.s(); val S = key?.let { src(it) }
                            val dur = e["dur"]?.d() ?: S!!.dur; val text = e["text"]?.s()
                            if (S != null) M.speak({ cur - t0 }, { cur - t0 < dur }, cues = S.cues, env = S.env, dur = dur, text = text)
                            else M.speak({ cur - t0 }, { cur - t0 < dur }, live = ls.live(text ?: "", dur, if (dict) def.dict else null), dur = dur, text = text)
                        }
                    }
                }
                val f = M.step(now)
                if (i % every != 0 && i != n - 1) continue
                val row = rows[r++].jsonArray; val s = f.s; val m = s.mouth.values()
                cols.forEachIndexed { c, col ->
                    val got: Any? = when (col) {
                        "i" -> i.toDouble()
                        "shape" -> f.shape
                        "talking" -> if (f.talking) 1.0 else 0.0
                        "tilt" -> f.tilt
                        "nod" -> f.nod
                        "sway" -> f.sway
                        "breath" -> f.breath
                        "poseW" -> f.poseW
                        "pose" -> f.pose
                        "emo" -> f.emo
                        "blink" -> s.blink
                        "brow" -> s.brow
                        "knit" -> s.knit
                        "lookX" -> s.lookX
                        "lookY" -> s.lookY
                        "open" -> s.open
                        "gain" -> s.gain
                        else -> m[MouthParams.KEYS.indexOf(col.removePrefix("m."))]
                    }
                    val e = row[c]
                    val ok = when {
                        e is JsonNull -> got == null
                        (e as JsonPrimitive).isString -> got == e.content
                        else -> got is Double && near(got, e.jsonPrimitive.double, 2e-6)
                    }
                    if (!ok) errs.add("$id/$who frame $i $col: got $got want $e")
                }
            }
            assertEquals("$id/$who row count", rows.size, r)
        }
        failIfAny(errs)
    }

    @Test fun lipGateWithin33ms() {
        val errs = ArrayList<String>()
        for (g in v.a("lipGate").map { it.jsonObject }) {
            val key = g.s("source"); val who = g.s("who"); val S = src(key); var T = 0.0
            val M = RigMachine(def, who, seed = g.getValue("seed").d().toLong())
            M.speak({ T }, { T < S.dur }, cues = S.cues, env = S.env, dur = S.dur, text = g.s("text"))
            val tr = ArrayList<Pair<Double, String>>(); var ps = "X"; var i = 0; val off = g.getValue("nowOffset").d()
            while (T <= S.dur + 0.1) { T = i / 60.0; val sh = M.step(off + T).shape; if (sh != ps) { tr.add(T to sh); ps = sh }; i++ }
            val exp = g.a("transitions")
            if (exp.size != tr.size) errs.add("$key/$who: ${tr.size} transitions, want ${exp.size}: $tr")
            else exp.forEachIndexed { j, x -> val p = x.jsonArray; if (!near(tr[j].first, p[0].d(), 2e-6) || tr[j].second != p[1].s()) errs.add("$key/$who transition $j: ${tr[j]} want $p") }
            for (c in g.a("checks").map { it.jsonObject }) {
                val start = c.getValue("start").d(); val value = c.s("value"); var d = 1.0
                for ((t, sh) in tr) if (sh == value && Math.abs(t - start) < Math.abs(d)) d = t - start
                if (Math.abs(d) > 0.033) errs.add("$key/$who cue ${c.getValue("i")} $value: |Δ| ${d * 1000} ms > 33")
                if (Math.abs(jsRound(d * 1000) - c.getValue("deltaMs").d()) > 1) errs.add("$key/$who cue ${c.getValue("i")}: Δ ${d * 1000} ms, web ${c.getValue("deltaMs")}")
            }
        }
        failIfAny(errs)
    }

    @Test fun lipsyncUnpack() {
        for (u in lip.a("unpack").map { it.jsonObject }) {
            val p = u.a("packed"); val out = u.o("out")
            val got = com.lexkite.app.core.rig.LipSync.unpack(p[0].d(), p[1].s(), p.getOrNull(2)?.takeIf { it !is JsonNull }?.s())
            assertEquals(out.getValue("dur").d(), got.dur, 1e-9)
            val ec = out.a("cues"); assertEquals("${p[1]} cues", ec.size, got.cues.size)
            ec.forEachIndexed { i, c -> assertEquals(c.jsonArray[0].d(), got.cues[i].start, 1e-9); assertEquals(c.jsonArray[1].s(), got.cues[i].value) }
            got.cues.forEachIndexed { i, c -> assertEquals(if (i < got.cues.size - 1) got.cues[i + 1].start else got.dur, c.end, 0.0) }
            val env = out["env255"]
            if (env == null || env is JsonNull) assertTrue(got.env == null)
            else assertEquals(env.jsonArray.map { it.d().toInt() }, got.env!!.map { jsRound(it * 255).toInt() })
        }
    }

    @Test fun lipsyncUnits() {
        for ((mode, dict) in listOf("plain" to null, "dict" to def.dict)) for (c in lip.o("units").a(mode).map { it.jsonObject }) {
            val text = c.s("text"); val got = ls.units(text, dict); val exp = c.a("out")
            assertEquals("$mode '$text' units", exp.size, got.size)
            exp.forEachIndexed { i, x ->
                val u = x.jsonObject; val g = got[i]; val at = "$mode '$text' unit $i"
                assertEquals(at, u.s("v"), g.v); assertEquals(at, u.getValue("w").d(), g.w, 0.0)
                assertEquals(at, u.getValue("wi").jsonPrimitive.int, g.wi); assertEquals(at, u.getValue("ci").jsonPrimitive.int, g.ci)
                assertEquals(at, u.containsKey("gap"), g.gap)
            }
        }
    }

    @Test fun lipsyncFromText() {
        for ((mode, dict) in listOf("plain" to null, "dict" to def.dict)) for (c in lip.o("fromText").a(mode).map { it.jsonObject }) {
            val text = c.s("text"); assertCues("fromText/$mode '$text'", c.a("out"), ls.fromText(text, c.getValue("dur").d(), dict))
        }
    }

    @Test fun lipsyncFromEnv() {
        for (c in lip.a("fromEnv").map { it.jsonObject }) {
            val S = src(c.s("source")); val text = c.s("text")
            assertCues("fromEnv '$text'", c.a("out"), ls.fromEnv(text, c.getValue("dur").d(), S.env, def.dict)) // gen-teach.mjs runs fromEnv/live with LipSync.setDict(rig.lip.dict) ON (like the web lesson)
        }
    }

    @Test fun lipsyncLive() {
        for (c in lip.a("live").map { it.jsonObject }) {
            val text = c.s("text"); val dur = c.getValue("dur").d(); val fps = c.getValue("fps").d(); val lv = ls.live(text, dur, def.dict)
            val trace = c.a("trace"); var k = 0
            for (i in 0..(Math.ceil(dur * fps).toInt() + 20)) {
                val t = i / fps; val voiced = t > 0.1 && t < dur - 0.1 && (i % 90) < 72
                lv.tick(t, voiced, 1 / fps)
                if (i % 6 == 0) {
                    val x = trace[k++].jsonArray
                    assertEquals("live '$text' trace i", x[0].d().toInt(), i); assertEquals("live voiced $i", x[1].d() == 1.0, voiced)
                    assertEquals("live '$text' shape at frame $i", x[2].s(), lv.cues.last().value)
                }
            }
            assertEquals(trace.size, k)
            assertCues("live '$text'", c.a("cues"), lv.cues)
        }
    }

    @Test fun lipsyncStateAt() {
        for (c in lip.a("stateAt").map { it.jsonObject }) {
            val S = src(c.s("source")); val t = c.getValue("t").d(); val s = ls.stateAt(S.cues, t); val at = "stateAt ${c.s("source")} t=$t"
            assertEquals(at, c.s("a"), s.a); assertEquals(at, c.s("b"), s.b); assertEquals(at, c.getValue("k").d(), s.k, 1e-9); assertEquals(at, c.getValue("i").jsonPrimitive.int, s.i)
        }
    }

    @Test fun lipsyncGain() {
        for (c in lip.a("gain").map { it.jsonObject }) {
            val g = ls.gain(src(c.s("source")).env)
            for (x in c.a("samples")) { val p = x.jsonArray; assertEquals("gain ${c.s("source")} t=${p[0]}", p[1].d(), g.at(p[0].d()), 1e-9) }
        }
    }

    @Test fun matrixMatchesWeb() {
        for (c in v.a("matrix").map { it.jsonObject }) {
            val pv = c.a("pivot")
            val m = RigMatrix.of(pv[0].d(), pv[1].d(), c.getValue("tilt").d(), c.getValue("nod").d(), c.getValue("sway").d(), c.getValue("breath").d(), def.breathX, def.breathY)
            c.a("m").forEachIndexed { i, e -> assertEquals("matrix ${c.s("who")} $c [$i]", e.d(), m[i], 2e-6) }
            assertEquals("no shear", m[0], m[3], 1e-12); assertEquals("no shear", m[1], -m[2], 1e-12)
        }
    }

    @Test fun paintOpsMatchWeb() {
        val fp = FacePaint(def); val errs = ArrayList<String>()
        for (c in v.a("paint").map { it.jsonObject }) {
            val who = c.s("who"); val st = c.o("state"); val R = def.face(who)
            val mouth = st.getValue("mouth").let { if (it is JsonPrimitive) def.shape(it.content).copy() else MouthParams.from(it.jsonObject) }
            val look = st["look"]?.jsonObject
            val s = FaceState(mouth, blink = st["blink"]?.d() ?: 0.0, lookX = look?.getValue("x")?.d() ?: R.lookX, lookY = look?.getValue("y")?.d() ?: R.lookY,
                brow = st["brow"]?.d() ?: 0.0, knit = st["knit"]?.d() ?: 0.0, open = st["open"]?.d() ?: 0.0)
            val parts = fp.parts(who, s); val exp = c.a("parts")
            assertEquals(5, parts.size)
            exp.forEachIndexed { li, layer ->
                val e = layer.jsonArray; val g = parts[li]; val at = "$who/${c.s("name")} layer $li"
                if (e.size != g.size) { errs.add("$at: ${g.size} ops, want ${e.size}: ${g.map { it::class.simpleName }}"); return@forEachIndexed }
                e.forEachIndexed { oi, x -> opDiff(x.jsonObject, g[oi])?.let { errs.add("$at op $oi: $it") } }
            }
        }
        failIfAny(errs)
    }

    /** null = op matches the web op; else a description of the first difference. */
    private fun opDiff(e: JsonObject, g: PaintOp): String? {
        fun num(a: Double, x: JsonElement, tol: Double = 0.11) = if (near(a, x.d(), tol)) null else "$a vs $x"
        return when (val op = e.s("op")) {
            "save" -> if (g == PaintOp.Save) null else "want save, got $g"
            "restore" -> if (g == PaintOp.Restore) null else "want restore, got $g"
            "tr" -> if (g !is PaintOp.Translate) "want tr, got $g" else num(g.x, e.getValue("x")) ?: num(g.y, e.getValue("y"))
            "clip" -> if (g !is PaintOp.Clip) "want clip, got $g" else {
                val es = e.a("s")
                if (es.size != g.shapes.size) "clip ${g.shapes.size} shapes, want ${es.size}" else es.indices.firstNotNullOfOrNull { shapeDiff(es[it].jsonObject, g.shapes[it]) }
            }
            "fill" -> when {
                g !is PaintOp.Fill -> "want fill, got $g"
                g.color != e.s("c") || g.alpha != e.getValue("al").d() -> "fill ${g.color}/${g.alpha} want ${e["c"]}/${e["al"]}"
                else -> shapeDiff(e.o("s"), g.shape)
            }
            "stroke" -> when {
                g !is PaintOp.Stroke -> "want stroke, got $g"
                g.color != e.s("c") || g.alpha != e.getValue("al").d() || g.cap != e.s("cap") || g.join != e.s("join") -> "stroke style $g want $e"
                else -> num(g.width, e.getValue("w"), 1e-9) ?: shapeDiff(e.o("s"), g.shape)
            }
            else -> "unknown op $op"
        }
    }

    private val TOK = Regex("[A-Za-z]|-?[0-9]+(?:\\.[0-9]+)?")
    private fun shapeDiff(e: JsonObject, g: PaintShape): String? {
        fun nums(k: String, a: DoubleArray): String? {
            val x = e.a(k); if (x.size != a.size) return "$k size"
            val i = x.indices.firstOrNull { !near(a[it], x[it].d(), 0.11) } ?: return null
            return "$k[$i] ${a[i]} vs ${x[i]}"
        }
        return when {
            e.containsKey("d") -> {
                if (g !is PaintShape.Path) return "want path, got $g"
                val et = TOK.findAll(e.s("d")).map { it.value }.toList(); val gt = TOK.findAll(g.d).map { it.value }.toList()
                if (et.size != gt.size) return "path tokens ${gt.size} vs ${et.size}: ${g.d} | ${e.s("d")}"
                val i = et.indices.firstOrNull { val a = et[it]; val b = gt[it]; if (a[0].isLetter() || b[0].isLetter()) a != b else !near(b.toDouble(), a.toDouble(), 0.11) }
                if (i == null) null else "path token $i: ${gt[i]} vs ${et[i]} in ${g.d}"
            }
            e.containsKey("e") -> if (g !is PaintShape.Ellipse) "want ellipse, got $g" else nums("e", doubleArrayOf(g.cx, g.cy, g.rx, g.ry))
            e.containsKey("r") -> if (g !is PaintShape.Rect) "want rect, got $g" else nums("r", doubleArrayOf(g.x, g.y, g.w, g.h))
            else -> "unknown shape $e"
        }
    }

    @Test fun moodMatchesWeb() {
        val M = TeacherMood(def.poseEmo)
        for (c in v.a("mood").map { it.jsonObject }) {
            val type = c.s("type"); val got = M.feed(type, c.o("data")["ok"]?.jsonPrimitive?.booleanOrNull ?: false); val out = c["out"]
            if (out == null || out is JsonNull) assertTrue("$type → null", got == null)
            else { val o = out.jsonObject; assertEquals(o.s("type"), got!!.type); assertEquals(o.s("pose"), got.pose); assertEquals(o.s("emo"), got.emo) }
            val st = c.o("state"); assertEquals(st.getValue("ok").jsonPrimitive.int, M.ok); assertEquals(st.getValue("bad").jsonPrimitive.int, M.bad)
        }
    }

    private fun JsonObject.s(k: String) = getValue(k).jsonPrimitive.content
    private fun JsonObject.b(k: String) = (this[k] as? JsonPrimitive)?.booleanOrNull ?: false
}
