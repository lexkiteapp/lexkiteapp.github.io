package com.lexkite.app.feature.lesson

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.Canvas
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Cancel
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Replay
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.lesson.LessonData
import com.lexkite.app.core.lesson.LessonEngine
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.LocalReduceMotion
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonPrimitive

private val SheetShape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)

/**
 * Instant-feedback sheet (Stitch feedback-correct / feedback-wrong): teacher still · Correct!/Not quite · XP · the right answer · the word card
 * (IPA, meaning, UK/US speakers) · Why? (gold bank, offline-safe) · Continue.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun FeedbackSheet(fb: Feedback, ui: LessonUi, who: String, pose: String?, a: LessonActions, slots: LessonSlots, gold: Map<String, List<LessonData.Gold>>?) {
    val c = LocalLKColors.current; val t = LocalL10n.current; val tk = tokens
    var why by remember(fb.item.id, fb.item.retry) { mutableStateOf(false) }
    val bg = if (fb.ok) c.cardHigh else tk.errorContainer
    val ink = if (fb.ok) c.onSurface else tk.onErrorContainer
    val accent = if (fb.ok) c.success else c.error
    val card = fb.item.card
    val word = (card?.get("word") as? JsonPrimitive)?.content.orEmpty()
    Column(Modifier.fillMaxWidth().heightIn(max = 520.dp).clip(SheetShape).background(bg).border(2.dp, accent, SheetShape).verticalScroll(rememberScrollState())
        .padding(LKSpacing.spaceMd), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        Row(Modifier.semantics(mergeDescendants = true) { liveRegion = LiveRegionMode.Polite }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            slots.still(who, pose ?: if (fb.ok) "cheer" else "concern", Modifier.size(72.dp))
            Column(Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    Icon(if (fb.ok) Icons.Filled.CheckCircle else Icons.Filled.Cancel, null, tint = accent, modifier = Modifier.size(28.dp))
                    Text(if (fb.ok) t(L10nKey.lessonRight) else if (fb.item.type == "match") t(L10nKey.lessonPairWrong) else t(L10nKey.lessonWrong), style = LKType.headlineMd.toCompose(), color = ink, modifier = Modifier.semantics { heading() })
                }
                if (!fb.ok && fb.item.type != "match") Text(t(L10nKey.lessonAnswer) + ": " + fb.item.answer, style = LKType.bodyLg.toCompose(), color = ink, modifier = Modifier.padding(top = 2.dp))
            }
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            if (fb.ok && fb.xp > 0) Chip("+${fb.xp} " + t(L10nKey.todayXp), c.tertiaryContainer, c.onTertiaryContainer)
            if (fb.combo >= 3) Chip(t(L10nKey.lessonCombo, mapOf("n" to fb.combo)), c.card, c.tertiary, line = c.tertiary.copy(alpha = 0.4f))
        }
        if (card != null && word.isNotEmpty()) {
            val ipaUS = (card["ipaUS"] as? JsonPrimitive)?.content.orEmpty(); val ipaUK = (card["ipa"] as? JsonPrimitive)?.content.orEmpty()
            val shape = RoundedCornerShape(20.dp)
            Column(Modifier.fillMaxWidth().clip(shape).background(c.card).border(1.dp, c.outlineVariant, shape).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(word, style = LKType.headlineSm.toCompose(), color = c.onSurface)
                        val ipa = ipaUS.ifEmpty { ipaUK }; if (ipa.isNotEmpty()) Text(ipa, style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
                    }
                    Speaker(t(L10nKey.lessonAccUK), "UK") { a.playWord(word, "en-GB") }
                    Speaker(t(L10nKey.lessonAccUS), "US") { a.playWord(word, "en-US") }
                }
                val m = meanOf(fb.item); if (m.isNotEmpty()) Text(m, style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant)
            }
            Boost(word, gold, a, who)
            if (why) Explain(fb.item, gold)
            Row(Modifier.heightIn(min = MinTap).clip(PillShape).border(2.dp, accent, PillShape).tactile({ why = !why }, t(L10nKey.lessonWhy)).padding(horizontal = LKSpacing.spaceMd), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Filled.Lightbulb, null, tint = accent, modifier = Modifier.size(20.dp)); Text(t(L10nKey.lessonWhy), style = LKType.labelMetric.toCompose(), color = ink)
            }
        }
        LKPrimaryButton(t(L10nKey.actionContinue), a.next, Modifier.padding(bottom = 4.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = c.onPrimary, modifier = Modifier.padding(start = LKSpacing.space2xs)) }
    }
}

@Composable
private fun Speaker(desc: String, tag: String, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Row(Modifier.heightIn(min = MinTap).clip(PillShape).tactile(onClick, desc).padding(horizontal = 6.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(Icons.AutoMirrored.Filled.VolumeUp, null, tint = c.secondary, modifier = Modifier.size(22.dp)); Text(tag, style = LKType.labelBadge.toCompose(), color = c.secondary)
    }
}

/** "Score booster": a common mistake → the better phrase (gold bank, no AI); hidden when the word has no wrong/right pair. */
@Composable
private fun Boost(word: String, gold: Map<String, List<LessonData.Gold>>?, a: LessonActions, who: String) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    val g = gold?.get(LessonEngine.norm(word))?.firstOrNull { it.w.isNotEmpty() && it.r.isNotEmpty() } ?: return
    val shape = RoundedCornerShape(16.dp)
    Column(Modifier.fillMaxWidth().clip(shape).background(c.card).border(1.dp, c.outlineVariant, shape).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) { Icon(Icons.Filled.Bolt, null, tint = c.tertiary, modifier = Modifier.size(18.dp)); Text(t(L10nKey.lessonBoostTitle), style = LKType.labelBadge.toCompose(), color = c.tertiary) }
        Text(g.w, style = LKType.bodyMd.toCompose(), color = c.error)
        Row(Modifier.heightIn(min = MinTap).tactile({ a.playText(g.r, who, false) }, t(L10nKey.lessonBoostGood) + ": " + g.r), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(Icons.AutoMirrored.Filled.VolumeUp, null, tint = c.success, modifier = Modifier.size(20.dp)); Text(g.r, style = LKType.bodyMd.toCompose(), color = c.success)
        }
    }
}

/** "Why?": stress · UK/US difference · gold bank (why, wrong → right, tip) · definition · examples · the learner's own sentence. Offline → what the card itself holds. */
@Composable
private fun Explain(item: com.lexkite.app.core.lesson.LItem, gold: Map<String, List<LessonData.Gold>>?) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    val card = item.card ?: return
    fun s(k: String) = (card[k] as? JsonPrimitive)?.content.orEmpty()
    val g = gold?.get(LessonEngine.norm(s("word"))).orEmpty()
    val st = LessonEngine.stress(s("ipaUS").ifEmpty { s("ipa") }); val uu = LessonEngine.usuk(card)
    val own = s("ctx").ifEmpty { ((card["contexts"] as? kotlinx.serialization.json.JsonArray)?.firstOrNull() as? kotlinx.serialization.json.JsonObject)?.get("text")?.let { (it as? JsonPrimitive)?.content }.orEmpty() }
    val ex = (g.firstOrNull()?.ex.orEmpty() + listOf(s("ex"))).filter { it.isNotEmpty() }.distinct().take(2)
    val shape = RoundedCornerShape(16.dp)
    Column(Modifier.fillMaxWidth().clip(shape).background(c.card).border(1.dp, c.outlineVariant, shape).padding(LKSpacing.spaceSm).semantics { liveRegion = LiveRegionMode.Polite }, verticalArrangement = Arrangement.spacedBy(6.dp)) {
        st?.let { Text(t(L10nKey.lessonStress, mapOf("n" to it.syl, "m" to it.of)), style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant) }
        uu?.let { Text(t(L10nKey.lessonUsuk) + " UK ${it.first} · US ${it.second}", style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant) }
        g.forEach { x ->
            Text(x.why, style = LKType.bodyMd.toCompose(), color = c.onSurface)
            if (x.w.isNotEmpty()) Text("✗ ${x.w}\n✓ ${x.r}", style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
            if (x.mem.isNotEmpty()) Text(t(L10nKey.lessonGoldMnemonic) + " " + x.mem, style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
        }
        if (g.isEmpty() && s("def").isNotEmpty()) Text(t(L10nKey.lessonGoldDefinition) + " " + s("def"), style = LKType.bodyMd.toCompose(), color = c.onSurface)
        if (ex.isNotEmpty()) Text(t(L10nKey.lessonGoldExample) + " " + ex.joinToString(" · "), style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
        if (own.isNotEmpty()) Text(t(L10nKey.lessonTagLooked) + ": " + own, style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
        if (g.isEmpty() && st == null && uu == null && s("def").isEmpty() && ex.isEmpty() && own.isEmpty()) Text(t(L10nKey.lessonGoldNone), style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
    }
}

/** Completion (Stitch lesson-complete): teacher cheer, rings, 3 stat tiles, learned / weak words, CTAs. The celebration is a short ring sweep + count-up (static under reduced motion). */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun FinishView(f: Finish, who: String, pose: String?, a: LessonActions, slots: LessonSlots) {
    val c = LocalLKColors.current; val t = LocalL10n.current; val reduce = LocalReduceMotion.current
    var go by remember { mutableStateOf(reduce) }
    LaunchedEffect(Unit) { go = true }
    val k by animateFloatAsState(if (go) 1f else 0f, tween(if (reduce) 0 else 900), label = "rings")
    val xpShown = Math.round(f.xp * k)
    Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        slots.still(who, pose ?: if (f.accuracy >= 80) "cheer" else "encourage", Modifier.size(width = 154.dp, height = 132.dp))
        Text(t(L10nKey.lessonDone), style = LKType.headlineLg.toCompose(), color = c.onSurface, textAlign = TextAlign.Center, modifier = Modifier.semantics { heading(); liveRegion = LiveRegionMode.Polite })
        Text(if (f.accuracy >= 80) t(L10nKey.lessonAwesome) else t(L10nKey.lessonKeepGoing), style = LKType.bodyLg.toCompose(), color = c.onSurfaceVariant, textAlign = TextAlign.Center)
        Box(Modifier.size(140.dp).semantics(mergeDescendants = true) { contentDescription = t(L10nKey.lessonAccuracy) + " " + f.accuracy + "%" }, contentAlignment = Alignment.Center) {
            val track = c.outlineVariant; val a1 = c.secondary; val a2 = c.tertiaryContainer
            Canvas(Modifier.size(140.dp)) {
                val w1 = 10.dp.toPx(); val w2 = 8.dp.toPx(); val s1 = Size(size.width - w1, size.height - w1); val s2 = Size(size.width - 4 * w1, size.height - 4 * w1)
                drawArc(track, 0f, 360f, false, Offset(w1 / 2, w1 / 2), s1, style = Stroke(w1))
                drawArc(a1, -90f, 360f * (f.accuracy / 100f).coerceIn(0f, 1f) * k, false, Offset(w1 / 2, w1 / 2), s1, style = Stroke(w1, cap = StrokeCap.Round))
                drawArc(track, 0f, 360f, false, Offset(2 * w1, 2 * w1), s2, style = Stroke(w2))
                drawArc(a2, -90f, 360f * minOf(1f, 0.25f + f.best / 12f) * k, false, Offset(2 * w1, 2 * w1), s2, style = Stroke(w2, cap = StrokeCap.Round))
            }
            Icon(Icons.Filled.Bolt, null, tint = c.tertiary, modifier = Modifier.size(40.dp))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Stat(Icons.Filled.Bolt, "+$xpShown", t(L10nKey.todayXp), Modifier.weight(1f), c.tertiary)
            Stat(Icons.Filled.AutoAwesome, f.accuracy.toString() + "%", t(L10nKey.lessonAccuracy), Modifier.weight(1f), c.secondary)
            Stat(Icons.Filled.LocalFireDepartment, t.num(f.best), t(L10nKey.lessonComboBest), Modifier.weight(1f), c.primaryContainer)
        }
        Stat(Icons.Filled.Timer, "${f.minutes}′", t(L10nKey.lessonTime), Modifier.fillMaxWidth(), c.onSurfaceVariant, row = true)
        if (f.learned.isNotEmpty()) Text(t(L10nKey.lessonLearned) + " " + f.learned.joinToString(" · "), style = LKType.bodyMd.toCompose(), color = c.onSurface, textAlign = TextAlign.Center)
        if (f.weak.isNotEmpty()) Text(f.weak.joinToString(", "), style = LKType.bodyMd.toCompose(), color = c.error, textAlign = TextAlign.Center)
        if (f.perfect) Chip(t(L10nKey.lessonPerfect), c.success.copy(alpha = 0.16f), c.success)
        LKPrimaryButton(t(L10nKey.lessonAgain), a.again, Modifier.padding(top = LKSpacing.spaceXs)) { Icon(Icons.AutoMirrored.Filled.ArrowForward, null, tint = c.onPrimary, modifier = Modifier.padding(start = LKSpacing.space2xs)) }
        Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).clip(PillShape).background(c.card).border(2.dp, c.outlineVariant, PillShape).tactile(a.close, t(L10nKey.lessonMap)), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Replay, null, tint = c.secondary, modifier = Modifier.size(20.dp)); Spacer(Modifier.width(6.dp)); Text(t(L10nKey.lessonMap).uppercase(t.locale), style = LKType.titlePill.toCompose(), color = c.secondary)
        }
        Row(Modifier.heightIn(min = MinTap).clip(PillShape).tactile({ a.share(t(L10nKey.lessonShare, mapOf("a" to f.accuracy, "x" to f.xp))) }, t(L10nKey.lessonShare, mapOf("a" to f.accuracy, "x" to f.xp))).padding(horizontal = LKSpacing.spaceMd), verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Filled.Share, null, tint = c.onSurfaceVariant, modifier = Modifier.size(18.dp))
        }
        Spacer(Modifier.height(LKSpacing.spaceSm))
    }
}

@Composable
private fun Stat(icon: androidx.compose.ui.graphics.vector.ImageVector, value: String, label: String, modifier: Modifier, tint: androidx.compose.ui.graphics.Color, row: Boolean = false) {
    val c = LocalLKColors.current; val shape = RoundedCornerShape(16.dp)
    val body: @Composable () -> Unit = {
        Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        Text(value, style = LKType.headlineMd.toCompose(), color = c.onSurface)
        Text(label, style = LKType.labelBadge.toCompose(), color = c.onSurfaceVariant, textAlign = TextAlign.Center)
    }
    if (row) Row(modifier.clip(shape).background(c.card).border(1.dp, c.outlineVariant, shape).padding(LKSpacing.spaceSm).semantics(mergeDescendants = true) {}, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically) { body() }
    else Column(modifier.clip(shape).background(c.card).border(1.dp, c.outlineVariant, shape).padding(LKSpacing.spaceSm).semantics(mergeDescendants = true) {}, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) { body() }
}
