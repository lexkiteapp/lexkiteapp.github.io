package com.lexkite.app.core.rig

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/**
 * Teacher rig definition = `native/shared/gen/teach/rig.json` (generated from the web TeacherRig / LipFace / LipMouth / LipSync sources by
 * scripts/native/gen-teach.mjs; schema docs/specs/native-m2-vectors.md §2). Every rig constant is read from here at runtime – none is typed in Kotlin.
 */
class RigDef(
    val canvasW: Double, val canvasH: Double, val breathX: Double, val breathY: Double,
    val fps: Int, val limits: Limits, val fade: Double,
    val emotions: Map<String, Emo>, val poseEmo: Map<String, String>,
    val people: Map<String, Person>,
    val faceRig: Map<String, FaceRig>, val faceEmo: Map<String, Emo>,
    val mouthShapes: List<String>, val mouthShape: Map<String, MouthParams>, val mouthStyle: Map<String, MouthStyle>, val segments: Int,
    val lip: Lip, val bundle: Bundle,
    /** Eye-white colour (sclera + highlights): face.js eye() hard-codes it in code (lines 40–42), so it comes from `face.white` once the generator exports it. */
    val eyeWhite: String,
) {
    class Limits(val tilt: Double, val nod: Double, val sway: Double, val breath: Double, val perFrame: PerFrame)
    class PerFrame(val tilt: Double, val nod: Double, val sway: Double, val brow: Double, val knit: Double, val look: Double)

    /** Emotion input vector (TeacherRig EMOTIONS / LipFace EMO). Absent keys = 0; [look] null = absent (LipFace falls back to the rig's own look). */
    class Emo(val brow: Double, val knit: Double, val smile: Double, val o: Double, val look: DoubleArray?, val tilt: Double, val nodHz: Double, val nodPx: Double) {
        val lx get() = look?.get(0) ?: 0.0
        val ly get() = look?.get(1) ?: 0.0
    }

    /** kind "proc" (neck procedure: [dur]) or "pose" (still image: [wanted] pose, [alt] when the person has no such still, [hold] s, [emo]). */
    class Gesture(
        val kind: String, val dur: Double, val wanted: String?, val pose: String?, val file: String?, val hold: Double,
        val emo: String?, val pending: Boolean, val alt: String?, val bundled: Boolean,
    )

    class Person(
        val name: String, val voice: String, val head: String, val stillPattern: String, val seed: Long,
        val stills: List<String>, val poses: List<String>, val bundledPoses: List<String>, val gestures: Map<String, Gesture>,
    ) {
        /** `Chars.has(who, pose)` – the person has a still for [pose]. */
        fun has(pose: String) = pose in poses
        fun still(pose: String) = stillPattern.replace("<pose>", pose)
    }

    class Eye(val cx: Double, val cy: Double, val rx: Double, val ry: Double, val side: Double)
    class Brow(val ix: Double, val iy: Double, val px: Double, val py: Double, val ox: Double, val oy: Double, val th: Double)
    class Stache(val cx: Double, val cy: Double, val w: Double, val h: Double)
    class Temper(val blinkA: Double, val blinkB: Double, val dbl: Double, val brow: Double, val tilt: Double, val nod: Double, val saccA: Double, val saccB: Double)
    class FaceRig(
        val skin: String, val ink: String, val pivotX: Double, val pivotY: Double, val mouthX: Double, val mouthY: Double, val rest: Double,
        val lookX: Double, val lookY: Double, val hl: Boolean, val lw: Double, val flick: Boolean, val iris: Double, val temper: Temper,
        val eyes: List<Eye>, val brows: List<Brow>, val stache: Stache?,
    )

    class MouthStyle(
        val hw: Double, val up: Double, val lipU: Double, val lipD: Double, val lip: String, val lipHi: String, val line: String, val lw: Double,
        val inner: String, val teeth: String, val tongue: String, val tongueSh: String, val outline: Boolean,
    )

    class Lip(
        val shapes: List<String>, val fallback: String, val arpabet: Map<String, String>, val ipa: Map<String, String>,
        val blend: Double, val minHold: Double, val lead: Double, val leads: Map<String, Double>, val gainMin: Double, val gainMax: Double,
        val dict: String, val elv: Map<String, Double>, val emin: Map<String, Int>,
    )

    class Bundle(val head: String, val poses: List<String>, val maxStillBytes: Int, val fallbackPose: String)

    /** Live lip-sync dictionary (`LipSync.setDict(rig.lip.dict)` like the web lesson), parsed once. */
    val dict: Map<String, String> by lazy { LipSync.parseDict(lip.dict) }
    val lipSync: LipSync by lazy { LipSync(lip) }
    val emotionNames: List<String> get() = emotions.keys.toList()

    fun face(who: String): FaceRig = faceRig[who] ?: faceRig.getValue(FALLBACK_WHO)
    fun style(who: String): MouthStyle = mouthStyle[who] ?: mouthStyle.getValue(FALLBACK_WHO)
    /** `SHAPE[p] || p` for a shape name; unknown names fall back to rest (X). */
    fun shape(name: String): MouthParams = mouthShape[name] ?: mouthShape.getValue(mouthShapes[0])

    companion object {
        private const val FALLBACK_WHO = "ama" // face.js / mouths.js: `RIG[who] || RIG.ama`, `STYLE[who] || STYLE.ama`
        private val DEFAULT_WHITE = "#%06X".format(0xFFFFFF) // face.js eye(): fill white (code constant, not part of RIG)

        fun parse(json: String): RigDef = from(Json.parseToJsonElement(json).jsonObject)

        fun from(r: JsonObject): RigDef {
            val canvas = r.o("canvas"); val bp = canvas.arr("breathPivot")
            val lim = r.o("limits"); val pf = lim.o("perFrame")
            val face = r.o("face"); val mouth = r.o("mouth"); val lip = r.o("lip"); val vis = lip.o("vis"); val bundle = r.o("bundle")
            return RigDef(
                canvasW = canvas.d("w"), canvasH = canvas.d("h"), breathX = bp.d(0), breathY = bp.d(1),
                fps = r.d("fps").toInt(),
                limits = Limits(lim.d("tilt"), lim.d("nod"), lim.d("sway"), lim.d("breath"),
                    PerFrame(pf.d("tilt"), pf.d("nod"), pf.d("sway"), pf.d("brow"), pf.d("knit"), pf.d("look"))),
                fade = r.d("fade"),
                emotions = r.o("emotions").mapValues { emo(it.value.jsonObject) },
                poseEmo = r.o("poseEmo").mapValues { it.value.jsonPrimitive.content },
                people = r.o("people").mapValues { person(it.value.jsonObject) },
                faceRig = face.o("rig").mapValues { faceRig(it.value.jsonObject) },
                faceEmo = face.o("emo").mapValues { emo(it.value.jsonObject) },
                mouthShapes = mouth.arr("shapes").map { it.jsonPrimitive.content },
                mouthShape = mouth.o("shape").mapValues { MouthParams.from(it.value.jsonObject) },
                mouthStyle = mouth.o("style").mapValues { style(it.value.jsonObject) },
                segments = mouth.d("segments").toInt(),
                lip = Lip(
                    shapes = vis.arr("shapes").map { it.jsonPrimitive.content }, fallback = vis.s("fallback")!!,
                    arpabet = vis.o("arpabet").mapValues { it.value.jsonPrimitive.content }, ipa = vis.o("ipa").mapValues { it.value.jsonPrimitive.content },
                    blend = lip.d("blend"), minHold = lip.d("minHold"), lead = lip.d("lead"), leads = lip.o("leads").mapValues { it.value.num() },
                    gainMin = lip.o("gain").d("min"), gainMax = lip.o("gain").d("max"), dict = lip.s("dict") ?: "",
                    elv = lip.o("elv").mapValues { it.value.num() }, emin = lip.o("emin").mapValues { it.value.num().toInt() },
                ),
                bundle = Bundle(bundle.s("head")!!, bundle.arr("poses").map { it.jsonPrimitive.content }, bundle.d("maxStillBytes").toInt(), bundle.s("fallbackPose")!!),
                eyeWhite = face.s("white") ?: DEFAULT_WHITE,
            )
        }

        private fun emo(e: JsonObject) = Emo(
            e.d("brow", 0.0), e.d("knit", 0.0), e.d("smile", 0.0), e.d("o", 0.0),
            (e["look"] as? JsonArray)?.let { doubleArrayOf(it.d(0), it.d(1)) }, e.d("tilt", 0.0), e.d("nodHz", 0.0), e.d("nodPx", 0.0),
        )

        private fun person(p: JsonObject) = Person(
            name = p.s("name")!!, voice = p.s("voice")!!, head = p.s("head")!!, stillPattern = p.s("stillPattern")!!, seed = p.d("seed").toLong(),
            stills = p.strs("stills"), poses = p.strs("poses"), bundledPoses = p.strs("bundledPoses"),
            gestures = p.o("gestures").mapValues { (_, v) ->
                val g = v.jsonObject
                Gesture(g.s("kind")!!, g.d("dur", 0.0), g.s("wanted"), g.s("pose"), g.s("file"), g.d("hold", 0.0), g.s("emo"),
                    g.b("pending"), g.s("alt"), g.b("bundled"))
            },
        )

        private fun faceRig(f: JsonObject): FaceRig {
            val t = f.o("temper"); val pv = f.arr("pivot"); val m = f.arr("mouth"); val lk = f.arr("look")
            return FaceRig(
                skin = f.s("skin")!!, ink = f.s("ink")!!, pivotX = pv.d(0), pivotY = pv.d(1), mouthX = m.d(0), mouthY = m.d(1), rest = f.d("rest"),
                lookX = lk.d(0), lookY = lk.d(1), hl = f.truthy("hl"), lw = f.d("lw"), flick = f.truthy("flick"), iris = f.d("iris"),
                temper = Temper(t.arr("blink").d(0), t.arr("blink").d(1), t.d("dbl"), t.d("brow"), t.d("tilt"), t.d("nod"), t.arr("sacc").d(0), t.arr("sacc").d(1)),
                eyes = f.arr("eyes").map { val e = it.jsonObject; val c = e.arr("c"); Eye(c.d(0), c.d(1), e.d("rx"), e.d("ry"), e.d("side")) },
                brows = f.arr("brows").map {
                    val b = it.jsonObject; val i = b.arr("i"); val p = b.arr("p"); val o = b.arr("o")
                    Brow(i.d(0), i.d(1), p.d(0), p.d(1), o.d(0), o.d(1), b.d("th"))
                },
                stache = (f["stache"] as? JsonObject)?.let { s -> val c = s.arr("c"); Stache(c.d(0), c.d(1), s.d("w"), s.d("h")) },
            )
        }

        private fun style(s: JsonObject) = MouthStyle(
            s.d("hw"), s.d("up"), s.d("lipU"), s.d("lipD"), s.s("lip")!!, s.s("lipHi")!!, s.s("line")!!, s.d("lw"),
            s.s("inner")!!, s.s("teeth")!!, s.s("tongue")!!, s.s("tongueSh")!!, s.truthy("outline"),
        )

        private fun JsonObject.o(k: String) = getValue(k).jsonObject
        private fun JsonObject.arr(k: String) = getValue(k).jsonArray
        private fun JsonObject.d(k: String) = getValue(k).num()
        private fun JsonObject.d(k: String, def: Double) = this[k]?.takeIf { it !is JsonNull }?.num() ?: def
        private fun JsonObject.s(k: String) = (this[k] as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content
        private fun JsonObject.b(k: String) = (this[k] as? JsonPrimitive)?.booleanOrNull ?: false
        private fun JsonObject.strs(k: String) = arr(k).map { it.jsonPrimitive.content }
        /** JS truthiness of a boolean-or-number flag (`hl: true`, `flick: 1`, `outline: false`). */
        private fun JsonObject.truthy(k: String): Boolean {
            val p = this[k] as? JsonPrimitive ?: return false
            return p.booleanOrNull ?: ((p.doubleOrNull ?: 0.0) != 0.0)
        }
        private fun JsonArray.d(i: Int) = this[i].num()
        private fun JsonElement.num() = jsonPrimitive.content.toDouble()
    }
}

/** One mouth shape = 11 numbers (mouths.js SHAPE: w u d a s tt tb tg tu bite lip). Mutable: the machines adjust u/d/w/s in place like the JS objects. */
class MouthParams(
    var w: Double, var u: Double, var d: Double, var a: Double, var s: Double, var tt: Double,
    var tb: Double, var tg: Double, var tu: Double, var bite: Double, var lip: Double,
) {
    fun copy() = MouthParams(w, u, d, a, s, tt, tb, tg, tu, bite, lip)
    /** Values in mouths.js key order (w u d a s tt tb tg tu bite lip). */
    fun values() = doubleArrayOf(w, u, d, a, s, tt, tb, tg, tu, bite, lip)

    companion object {
        val KEYS = listOf("w", "u", "d", "a", "s", "tt", "tb", "tg", "tu", "bite", "lip")
        private fun lerp(a: Double, b: Double, k: Double) = a + (b - a) * k
        /** `LipMouth.mix(A, B, k)` – per-key linear interpolation. */
        fun mix(p: MouthParams, q: MouthParams, k: Double) = MouthParams(
            lerp(p.w, q.w, k), lerp(p.u, q.u, k), lerp(p.d, q.d, k), lerp(p.a, q.a, k), lerp(p.s, q.s, k), lerp(p.tt, q.tt, k),
            lerp(p.tb, q.tb, k), lerp(p.tg, q.tg, k), lerp(p.tu, q.tu, k), lerp(p.bite, q.bite, k), lerp(p.lip, q.lip, k),
        )
        fun from(o: JsonObject): MouthParams {
            val v = KEYS.map { o[it]?.jsonPrimitive?.content?.toDouble() ?: 0.0 }
            return MouthParams(v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8], v[9], v[10])
        }
    }
}
