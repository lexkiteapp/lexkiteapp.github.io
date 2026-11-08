package com.lexkite.app.ui

import android.content.Context
import android.graphics.Bitmap
import androidx.compose.foundation.Canvas
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.graphics.BlendMode
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.CompositingStrategy
import androidx.compose.ui.graphics.FilterQuality
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.Matrix
import androidx.compose.ui.graphics.Paint
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.drawIntoCanvas
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.unit.IntSize
import com.lexkite.app.core.rig.FacePaint
import com.lexkite.app.core.rig.PaintOp
import com.lexkite.app.core.rig.PaintShape
import com.lexkite.app.core.rig.RigDef
import com.lexkite.app.core.rig.RigFrame
import com.lexkite.app.core.rig.RigMachine
import com.lexkite.app.core.rig.RigMatrix
import com.lexkite.app.core.rig.TeacherSignal
import com.lexkite.app.core.rig.TeachAssets
import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.design.LocalReduceMotion
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlin.math.min

/** The rig definition (`teach/rig.json`, one source shared with iOS and the vectors) parsed once. */
object RigAssets {
    fun def(ctx: Context): RigDef = TeachAssets.rig(ctx)
}

/**
 * C05 – the 2D teacher drawn live on a Compose Canvas: bare head image + the vector face (eyes, brows, mouth, moustache) from [FacePaint], neck tilt/nod/breath
 * from [RigMachine] (a port of the web TeacherRig; same inputs: speak / gesture / emotion), pose stills cross-faded with the additive blend like the web.
 * Everything is bundled → works offline from the first frame. Reduce motion: calm rig (no tilt/nod/glance, keeps blink + mouth) and the loop only runs while
 * the teacher speaks or a pose fades – a still teacher costs no frames.
 */
@Composable
fun TeacherView(who: String, signal: TeacherSignal?, modifier: Modifier = Modifier) {
    val ctx = LocalContext.current; val reduce = LocalReduceMotion.current
    val def = remember { RigAssets.def(ctx) }
    val cueTable = remember { runCatching { TeachAssets.cues(ctx) }.getOrNull() }
    val person = def.people.getValue(who)
    val machine = remember(who, reduce) { RigMachine(def, who, reduce, person.seed, person::has) }
    val paint = remember(def) { FacePaint(def) }
    var headNow by remember(who) { mutableStateOf(TeacherArt.bundledRel(ctx, person.head)?.asImageBitmap()) }
    val poses = remember(who) { mutableStateMapOf<String, ImageBitmap>() }
    val tick = remember(who, reduce) { mutableLongStateOf(0L) }
    val scope = rememberCoroutineScope()
    val paths = remember { PathCache() }

    LaunchedEffect(who) { if (headNow == null) headNow = TeacherArt.loadRel(ctx, person.head)?.asImageBitmap() }
    LaunchedEffect(machine, signal) {
        var t0 = -1L
        var first = true
        suspend fun ensure(pose: String) {
            if (pose in poses) return
            val rel = person.still(pose)
            (TeacherArt.bundledRel(ctx, rel) ?: TeacherArt.loadRel(ctx, rel))?.let { poses[pose] = it.asImageBitmap() }
        }
        while (isActive) {
            while (true) {
                when (val c = signal?.poll() ?: break) {
                    is TeacherSignal.Cmd.Speak -> {
                        // web teacher.js: pre-generated cues (key = lineKey(voice, text)) → exact shapes + loudness; else text-timed / live
                        val hit = cueTable?.unpacked(AudioLogic.lineKey(person.voice, c.text))
                        val dict = cueTable?.dict ?: def.dict
                        if (hit != null) machine.speak(c.clock, c.playing, hit.cues, hit.env, null, hit.dur, c.text)
                        else {
                            val cues = if (c.dur > 0) def.lipSync.fromText(c.text, c.dur, dict) else null
                            machine.speak(c.clock, c.playing, cues, null, if (cues == null) def.lipSync.live(c.text, null, dict) else null, c.dur, c.text)
                        }
                    }
                    is TeacherSignal.Cmd.Gesture -> scope.launch { person.gestures[c.name]?.pose?.let { ensure(it) }; machine.gesture(c.name) }
                    is TeacherSignal.Cmd.Pose -> {
                        val n = c.name
                        if (n == null) machine.setEmotion("neutral")
                        else if (person.gestures[n]?.kind == "pose") scope.launch { person.gestures[n]?.pose?.let { ensure(it) }; machine.gesture(n) }
                        else machine.setEmotion(def.poseEmo[n] ?: n)
                    }
                    is TeacherSignal.Cmd.Listen -> machine.listen(c.on)
                    TeacherSignal.Cmd.Quiet -> machine.quiet()
                }
            }
            val busy = !reduce || machine.speaking || machine.visiblePose() != null || signal?.pending == true
            if (first || busy) {
                val n = androidx.compose.runtime.withFrameNanos { it }
                if (t0 < 0) t0 = n
                machine.step((n - t0) / 1e9); tick.longValue++; first = false
            } else delay(100)
        }
    }

    val m = remember { Matrix() }
    val arr = remember { DoubleArray(6) }
    Canvas(modifier.graphicsLayer { compositingStrategy = CompositingStrategy.Offscreen }.clearAndSetSemantics { }) {
        tick.longValue // redraw on every rig step (draw phase only, no recomposition)
        val f = machine.last ?: return@Canvas
        val sc = min(size.width / def.canvasW, size.height / def.canvasH).toFloat()
        val ox = (size.width - def.canvasW.toFloat() * sc) / 2f; val oy = size.height - def.canvasH.toFloat() * sc
        RigMatrix.of(def, f, arr)
        m.reset(); m[0, 0] = arr[0].toFloat(); m[1, 0] = arr[1].toFloat(); m[0, 1] = arr[2].toFloat(); m[1, 1] = arr[3].toFloat(); m[0, 3] = arr[4].toFloat(); m[1, 3] = arr[5].toFloat()
        withTransform({ translate(ox, oy); scale(sc, sc, Offset.Zero); transform(m) }) {
            val h = headNow
            if (f.faceW >= 0.999 && h != null) drawFace(h, f, paint, who, paths, def)
            else if (f.faceW > 0.0 && h != null) drawIntoCanvas { c ->
                val layer = Paint().apply { alpha = f.faceW.toFloat(); blendMode = BlendMode.Plus }
                c.saveLayer(Rect(0f, 0f, def.canvasW.toFloat(), def.canvasH.toFloat()), layer); drawFace(h, f, paint, who, paths, def); c.restore()
            }
            val p = f.pose?.let { poses[it] }
            if (p != null && f.poseW > 0.0) blit(p, Offset.Zero, IntSize(def.canvasW.toInt(), def.canvasH.toInt()), f.poseW.toFloat(), if (f.faceW > 0.0) BlendMode.Plus else BlendMode.SrcOver)
        }
    }
}

private fun DrawScope.blit(img: ImageBitmap, at: Offset, dst: IntSize, alpha: Float, mode: BlendMode) =
    drawImage(img, srcOffset = androidx.compose.ui.unit.IntOffset.Zero, srcSize = IntSize(img.width, img.height), dstOffset = androidx.compose.ui.unit.IntOffset(at.x.toInt(), at.y.toInt()), dstSize = dst, alpha = alpha, blendMode = mode, filterQuality = FilterQuality.High)

private fun DrawScope.drawFace(head: ImageBitmap, f: RigFrame, paint: FacePaint, who: String, paths: PathCache, def: RigDef) {
    blit(head, Offset.Zero, IntSize(def.canvasW.toInt(), def.canvasH.toInt()), 1f, BlendMode.SrcOver)
    for (layer in paint.parts(who, f.s)) {
        for (op in layer) when (op) {
            PaintOp.Save -> drawContext.canvas.save()
            PaintOp.Restore -> drawContext.canvas.restore()
            is PaintOp.Translate -> drawContext.canvas.translate(op.x.toFloat(), op.y.toFloat())
            is PaintOp.Clip -> drawContext.canvas.clipPath(Path().apply { op.shapes.forEach { addPath(paths.of(it)) } })
            is PaintOp.Fill -> drawPath(paths.of(op.shape), paths.color(op.color), op.alpha.toFloat())
            is PaintOp.Stroke -> drawPath(paths.of(op.shape), paths.color(op.color), op.alpha.toFloat(),
                Stroke(op.width.toFloat(), cap = when (op.cap) { "round" -> StrokeCap.Round; "square" -> StrokeCap.Square; else -> StrokeCap.Butt }, join = when (op.join) { "round" -> StrokeJoin.Round; "bevel" -> StrokeJoin.Bevel; else -> StrokeJoin.Miter }))
        }
    }
}

/** Parsed SVG paths + colours, reused across frames (the rig repeats the same shapes). Bounded. */
private class PathCache {
    private val paths = HashMap<PaintShape, Path>(); private val colors = HashMap<String, Color>()
    fun of(s: PaintShape): Path {
        if (paths.size > 800) paths.clear()
        return paths.getOrPut(s) {
            when (s) {
                is PaintShape.Path -> PathParser().parsePathString(s.d).toPath()
                is PaintShape.Ellipse -> Path().apply { addOval(Rect((s.cx - s.rx).toFloat(), (s.cy - s.ry).toFloat(), (s.cx + s.rx).toFloat(), (s.cy + s.ry).toFloat())) }
                is PaintShape.Rect -> Path().apply { addRect(Rect(s.x.toFloat(), s.y.toFloat(), (s.x + s.w).toFloat(), (s.y + s.h).toFloat())) }
            }
        }
    }
    fun color(hex: String): Color = colors.getOrPut(hex) { Color(android.graphics.Color.parseColor(hex)) }
}
