package com.lexkite.app.core.rig

/**
 * One rig frame (web `last`): neck/breath transform inputs, pose cross-fade and the face state [s] for [FacePaint.parts].
 * [pose] = last requested pose (draw the still only while [poseW] > 0); [faceW] = 1 − poseW.
 */
class RigFrame(
    val s: FaceState, val shape: String, val talking: Boolean,
    val tilt: Double, val nod: Double, val sway: Double, val breath: Double,
    val pose: String?, val poseW: Double, val faceW: Double, val emo: String,
    val pivotX: Double, val pivotY: Double,
)

/**
 * Port of `TeacherRig.core.machine(who, { calm, seed, has })` (web/js/teacher-rig.js lines 37–107). Limits, emotions, gestures, FADE and LEAD come from [def];
 * the spring, open/close rates and procedural gesture curves are the JS code's own constants (named below).
 * [has] = `Chars.has(who, pose)`; null → requested poses are used as is (pure core).
 */
class RigMachine(
    private val def: RigDef, val who: String, val calm: Boolean = false, seed: Long? = null, private val has: ((String) -> Boolean)? = null,
) {
    private val seed: Long = seed?.takeIf { it != 0L } ?: DEFAULT_SEED
    private val R = def.face(who)
    private val person = def.people[who]
    private val L = def.limits
    private val emoNone = RigDef.Emo(0.0, 0.0, 0.0, 0.0, null, 0.0, 0.0, 0.0)

    private class Speech(val M: LipFace, val clock: () -> Double, val playing: () -> Boolean, val live: LipSync.Live?)
    private class Proc(val name: String, val t0: Double, val dur: Double)

    private var emoName = "neutral"
    private var want: RigDef.Emo = vec(emoName)
    // spring state for KEYS brow knit smile o lx ly tilt (+ nodHz/nodPx copied from the target)
    private val emo = DoubleArray(7); private val emoV = DoubleArray(7)
    private var nodHz = 0.0; private var nodPx = 0.0
    private var S: Speech? = null
    private val idle = LipFace(def, who, dur = IDLE_DUR, seed = this.seed, calm = calm)
    private val proc = ArrayList<Proc>(); private val queue = ArrayDeque<String>()
    private var pose: String? = null; private var poseW = 0.0; private var poseWant = 0.0; private var poseUntil = 0.0
    private var prevNow: Double? = null; private var openK = 0.0; private var held = 0.0
    private var oTilt = 0.0; private var oNod = 0.0; private var oSway = 0.0; private var oBrow = 0.0; private var oKnit = 0.0; private var oLx = 0.0; private var oLy = 0.0
    var last: RigFrame? = null
        private set

    private fun vec(name: String) = def.emotions[name] ?: emoNone
    private fun target(i: Int, e: RigDef.Emo) = when (i) { 0 -> e.brow; 1 -> e.knit; 2 -> e.smile; 3 -> e.o; 4 -> e.lx; 5 -> e.ly; else -> e.tilt }

    /** Start a line: [clock] = audio clock (s), [playing] = audio is sounding; [cues] (CI/Kokoro) or [live] cursor (no cues); [env] = 100 Hz loudness. */
    fun speak(clock: () -> Double, playing: () -> Boolean, cues: List<Cue>? = null, env: DoubleArray? = null, live: LipSync.Live? = null, dur: Double = 0.0, text: String? = null) {
        val d = if (dur != 0.0 && !dur.isNaN()) dur else 1.0
        val M = LipFace(def, who, cues = cues ?: live?.cues ?: emptyList(), env = env, dur = Math.max(SPEAK_MIN_DUR, d), seed = seed + (text ?: "").length, text = text, calm = calm)
        S = Speech(M, clock, playing, live)
        if (poseWant != 0.0) { poseWant = 0.0; poseUntil = 0.0 } // speaking → drawn face back so the mouth syncs (still fades out)
    }

    /** End of line (audio ended/error): back to idle, run a queued gesture. */
    fun quiet() { S = null; queue.removeFirstOrNull()?.let { gesture(it) } }
    val speaking get() = S != null

    fun setEmotion(name: String): Boolean { if (name !in def.emotions) return false; emoName = name; want = vec(name); return true }
    val emotion get() = emoName
    /** listen(on) = setEmotion(on ? 'listen' : 'neutral'). */
    fun listen(on: Boolean) { setEmotion(if (on) LISTEN else NEUTRAL) }

    /** Trigger a gesture ("nod", "cheer", …). [at] = start time (s) for procedural ones; null = last step time. Returns false for unknown names. */
    fun gesture(name: String, at: Double? = null): Boolean {
        val G = person?.gestures?.get(name) ?: return false
        if (G.kind == PROC) {
            if (calm && name != BLINK) return true
            proc.add(Proc(name, at ?: prevNow ?: 0.0, G.dur)); return true
        }
        if (S != null) { if (queue.size < QUEUE_MAX) queue.addLast(name); return true } // a still covers the mouth → wait for the end of the line
        val wanted = G.wanted ?: G.pose
        pose = if (G.alt != null && has != null && wanted != null && !has.invoke(wanted)) G.alt else wanted
        poseWant = 1.0; held = G.hold; poseUntil = 0.0
        G.emo?.let { setEmotion(it) }
        return true
    }
    /** Pose to draw now (null while fully faded out). */
    fun visiblePose(): String? = if (poseW > 0) pose else null

    fun step(now: Double): RigFrame {
        val pn0 = prevNow
        val dt = if (pn0 == null) 1.0 / 60 else JsMath.clamp(now - pn0, 0.0, MAX_DT); val k = dt * 60; prevNow = now
        // expression = critically damped spring (ω 9 rad/s), velocity starts at 0; long frames capped at 1/30 s
        val dts = Math.min(dt, 1.0 / 30)
        for (i in 0 until 7) { val a = W * W * (target(i, want) - emo[i]) - 2 * W * emoV[i]; emoV[i] += a * dts; emo[i] += emoV[i] * dts }
        nodHz = want.nodHz; nodPx = want.nodPx
        // mouth/eye layer: speech machine (audio clock) or idle machine
        val sp = S; val s: FaceState; var talking = false
        if (sp != null) {
            val t = sp.clock(); talking = sp.playing()
            if (sp.live != null) { sp.live.tick(t, talking, Math.min(dt, MAX_DT)); s = sp.M.at(Math.max(0.0, t - def.lip.lead)) } else s = sp.M.at(t)
        } else s = idle.at(now % IDLE_DUR)
        openK = if (talking) Math.min(1.0, openK + dt / OPEN_RATE) else Math.max(0.0, openK - dt / CLOSE_RATE) // not sounding → X within 80 ms
        if (openK < 1) { s.mouth = MouthParams.mix(def.shape(REST), s.mouth, openK); if (openK < 0.5) s.shape = REST; s.open *= openK }
        val eo = emo[3]
        if (!talking && eo > 0.01) s.mouth = MouthParams.mix(s.mouth, def.shape(ROUND), JsMath.clamp(eo, 0.0, 1.0) * (1 - openK)) // surprise: round lips while silent
        s.mouth.s = JsMath.clamp(s.mouth.s + emo[2] * (if (s.open > 0) .5 else 1.0), -.3, .9)
        // pose: fade in → hold → fade out (drawn face inverse)
        if (poseWant != 0.0 && poseW >= 1 && poseUntil == 0.0) poseUntil = now + held
        if (poseUntil != 0.0 && now >= poseUntil) { poseWant = 0.0; poseUntil = 0.0 }
        poseW = JsMath.clamp(poseW + Math.signum(poseWant - poseW) * Math.min(Math.abs(poseWant - poseW), Math.min(dt, 1.0 / 30) / def.fade), 0.0, 1.0)
        if (poseW == 0.0 && poseWant == 0.0 && S == null) queue.removeFirstOrNull()?.let { gesture(it) }
        // neck: tilt (expression + machine) + procedural nod/shake, clamped, rate-limited
        var pt = 0.0; var pn = 0.0; var ps = 0.0; var blink = 0.0
        for (i in proc.indices.reversed()) {
            val p = proc[i]; val u = (now - p.t0) / p.dur
            if (u >= 1) { proc.removeAt(i); continue }
            if (u < 0) continue
            val env = JsMath.sin(Math.PI * u) // 0 → 1 → 0
            when (p.name) {
                NOD -> pn += 6 * env * Math.max(0.0, JsMath.sin(u * Math.PI * 4))
                BOB -> pn += 3 * env
                SHAKE -> { ps += 3.2 * env * JsMath.sin(u * Math.PI * 6); pt += 0.6 * env * JsMath.sin(u * Math.PI * 6) }
                BLINK -> blink = Math.max(blink, env)
            }
        }
        val tilt = if (calm) 0.0 else JsMath.clamp(s.tilt + emo[6] * 0.6 + pt, -L.tilt, L.tilt)
        val nodE = if (nodHz != 0.0 && !calm) nodPx * Math.max(0.0, JsMath.sin(now * Math.PI * 2 * nodHz)) else 0.0
        val nod = if (calm) 0.0 else JsMath.clamp(s.nod + pn + nodE, -L.nod, L.nod)
        val sway = if (calm) 0.0 else JsMath.clamp(ps, -L.sway, L.sway)
        val F = L.perFrame
        oTilt = toward(oTilt, tilt, F.tilt * k); oNod = toward(oNod, nod, F.nod * k); oSway = toward(oSway, sway, F.sway * k)
        oBrow = toward(oBrow, JsMath.clamp(s.brow + emo[0], -.3, 1.0), F.brow * k); oKnit = toward(oKnit, JsMath.clamp(s.knit + emo[1], 0.0, 1.0), F.knit * k)
        oLx = toward(oLx, JsMath.clamp(s.lookX + emo[4], -1.0, 1.0), F.look * k); oLy = toward(oLy, JsMath.clamp(s.lookY + emo[5], -1.0, 1.0), F.look * k)
        s.tilt = oTilt; s.nod = oNod; s.brow = oBrow; s.knit = oKnit; s.lookX = oLx; s.lookY = oLy; s.blink = Math.max(s.blink, blink)
        val breath = if (calm) 0.0 else L.breath * JsMath.sin(now * Math.PI * 2 * BREATH_HZ)
        return RigFrame(s, s.shape, talking, oTilt, oNod, oSway, breath, pose, poseW, 1 - poseW, emoName, R.pivotX, R.pivotY).also { last = it }
    }

    private fun toward(cur: Double, want: Double, step: Double) = cur + JsMath.clamp(want - cur, -step, step)

    private companion object {
        // teacher-rig.js code constants
        const val DEFAULT_SEED = 7L      // `o.seed || 7`
        const val IDLE_DUR = 120.0       // idle = LipFace.machine(who, { dur: 120 }), stepped at now % 120
        const val SPEAK_MIN_DUR = 30.0   // speak(): dur: Math.max(30, dur)
        const val MAX_DT = 0.1           // dt clamp
        const val W = 9.0                // spring ω (rad/s), line 65
        const val OPEN_RATE = 0.04       // openK rises in 40 ms while playing (line 71)
        const val CLOSE_RATE = 0.08      // … falls in 80 ms
        const val BREATH_HZ = 0.22       // line 100
        const val QUEUE_MAX = 2
        const val REST = "X"; const val ROUND = "E"
        const val PROC = "proc"; const val NOD = "nod"; const val BOB = "bob"; const val SHAKE = "shake"; const val BLINK = "blink"
        const val LISTEN = "listen"; const val NEUTRAL = "neutral"
    }
}

/** `TeacherRig.core.matrix(f)`: rigid frame transform [a,b,c,d,e,f] (x' = a·x + c·y + e, y' = b·x + d·y + f) – rotate −tilt° about the pivot, translate (sway, nod), uniform breath scale about the canvas breath pivot. */
object RigMatrix {
    fun of(px: Double, py: Double, tilt: Double, nod: Double, sway: Double, breath: Double, bx: Double, by: Double, out: DoubleArray = DoubleArray(6)): DoubleArray {
        val r = -tilt * Math.PI / 180; val c = JsMath.cos(r); val s = JsMath.sin(r); val k = 1 + breath
        val b0 = k; val b1 = 0.0; val b2 = 0.0; val b3 = k; val b4 = bx * (1 - k); val b5 = by * (1 - k)
        val n0 = c; val n1 = s; val n2 = -s; val n3 = c; val n4 = px - c * px + s * py + sway; val n5 = py - s * px - c * py + nod
        out[0] = b0 * n0 + b2 * n1; out[1] = b1 * n0 + b3 * n1; out[2] = b0 * n2 + b2 * n3; out[3] = b1 * n2 + b3 * n3
        out[4] = b0 * n4 + b2 * n5 + b4; out[5] = b1 * n4 + b3 * n5 + b5
        return out
    }
    fun of(def: RigDef, f: RigFrame, out: DoubleArray = DoubleArray(6)) = of(f.pivotX, f.pivotY, f.tilt, f.nod, f.sway, f.breath, def.breathX, def.breathY, out)
}
