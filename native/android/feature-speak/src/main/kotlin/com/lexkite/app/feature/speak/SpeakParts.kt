package com.lexkite.app.feature.speak

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.RichBody
import com.lexkite.app.feature.vocab.t
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey

/** A web `t()` text in the UI language: the Vietnamese source key looked up in the language table, variables substituted, nested keys translated from the inside out. Latin digits. */
fun L10n.tr(x: Tr): String { var s = src(x.k); for ((k, v) in x.v) s = s.replace("{$k}", if (v is Tr) tr(v) else v.toString()); return s }
@Composable fun trs(x: Tr): String = t.tr(x)

/** The mic needs RECORD_AUDIO: runs [granted] now or after the learner agrees; a refusal runs [denied] (the screen then shows its tap-in-order / type fallback). */
@Composable
fun rememberMicGate(): (granted: () -> Unit, denied: () -> Unit) -> Unit {
    val ctx = LocalContext.current
    var pending by remember { mutableStateOf<Pair<() -> Unit, () -> Unit>?>(null) }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok -> val p = pending; pending = null; if (p != null) { if (ok) p.first() else p.second() } }
    return remember(ctx) { { yes: () -> Unit, no: () -> Unit ->
        if (ctx.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) yes() else { pending = yes to no; ask.launch(Manifest.permission.RECORD_AUDIO) } } }
}

/** The round mic button (≥ 64 dp): idle = mic, recording = stop. */
@Composable
fun MicButton(recording: Boolean, onClick: () -> Unit, label: String, enabled: Boolean = true, modifier: Modifier = Modifier) {
    val c = LocalLKColors.current; val bg = if (recording) c.error else if (enabled) c.primary else c.cardHigh; val ink = if (recording) c.onError else if (enabled) c.onPrimary else c.onSurfaceVariant
    Box(modifier.size(72.dp).clip(CircleShape).background(bg).let { if (enabled) it.tactile(onClick, label) else it }.semantics { contentDescription = label }, contentAlignment = Alignment.Center) {
        Text(if (recording) "⏹" else "🎙️", color = ink, style = LKType.headlineSm.toCompose()) }
}

/** Filled / empty stars (never colour only: the glyphs differ). */
@Composable
fun StarsRow(n: Int, total: Int = 3, label: String? = null) {
    val c = LocalLKColors.current
    Row(Modifier.semantics { if (label != null) contentDescription = label }, horizontalArrangement = Arrangement.spacedBy(2.dp)) { for (k in 1..total) Text(if (k <= n) "★" else "☆", color = if (k <= n) c.star else c.outline, style = LKType.titlePill.toCompose()) }
}

/** A segmented choice (level, part): selected state is announced; each target ≥ 48 dp. */
@Composable
fun Seg(options: List<String>, selected: Int, onPick: (Int) -> Unit, modifier: Modifier = Modifier) {
    val c = LocalLKColors.current; val shape = RoundedCornerShape(50)
    Row(modifier.clip(shape).border(1.dp, c.outlineVariant, shape)) {
        options.forEachIndexed { i, label ->
            val on = i == selected
            Box(Modifier.weight(1f).heightIn(min = 48.dp).background(if (on) c.secondaryContainer else c.card).tactile({ onPick(i) }, label, Role.RadioButton).semantics { this.selected = on }.padding(horizontal = LKSpacing.spaceXs), contentAlignment = Alignment.Center) {
                Text(label, color = if (on) c.onSecondaryContainer else c.onSurface, style = LKType.labelMetric.toCompose()) }
        }
    }
}

/** A coloured score pill: the number plus a glyph so colour is never the only signal. */
@Composable
fun ScorePill(score: Int, tone: String) {
    val c = LocalLKColors.current; val ink = when (tone) { "good" -> c.success; "medium" -> c.secondary; else -> c.error }; val glyph = when (tone) { "good" -> "✓"; "medium" -> "~"; else -> "↻" }
    val shown = "$glyph $score%"
    Text(shown, color = ink, style = LKType.titlePill.toCompose())
}

/** Friendly panel when the mic cannot be used (permission refused, no recogniser): the reason, what to do and the fallback button. */
@Composable
fun MicBlocked(reason: Tr, onFallback: (() -> Unit)?, fallbackLabel: String, onRetry: () -> Unit) {
    val c = LocalLKColors.current
    LKCard(fill = c.surfaceContainerHighest) {
        RichBody("ℹ️ " + trs(reason))
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            if (onFallback != null) GhostButton(fallbackLabel, onFallback)
            GhostButton(t(L10nKey.actionRetry), onRetry)
        }
    }
}

/** A line of text that may carry a translated `Tr` or plain text (kept LTR for English content inside an Arabic screen). */
@Composable
fun Bubble(text: String, mine: Boolean, who: String, onSpeak: (() -> Unit)? = null) {
    val c = LocalLKColors.current; val shape = RoundedCornerShape(18.dp)
    Column(Modifier.fillMaxWidth(), horizontalAlignment = if (mine) Alignment.End else Alignment.Start) {
        Column(Modifier.fillMaxWidth(0.86f).clip(shape).background(if (mine) c.primaryContainer else c.cardHigh).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text(who, color = if (mine) c.onPrimaryContainer else c.onSurfaceVariant, style = LKType.labelBadge.toCompose())
                if (onSpeak != null) Box(Modifier.size(48.dp).tactile(onSpeak, t(L10nKey.revListenToPronunciation)), contentAlignment = Alignment.Center) { Text("🔊", style = LKType.bodyMd.toCompose()) }
            }
            com.lexkite.app.feature.vocab.EnLtr { Body(text, color = if (mine) c.onPrimaryContainer else c.onSurface) }
        }
    }
}

/** The tinted fill of a verdict (good / medium / again) as a Kit container colour. */
@Composable fun toneFill(tone: String): Color { val c = LocalLKColors.current; return if (tone == "again") c.errorContainer else c.surfaceContainerHighest }
