package com.lexkite.app.design

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.composed
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.disabled
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.generated.LKRadius
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType

/** Card radius of the Kit (rounded tactile cards, §0/§5b): 2 × xl. */
val CardShape = RoundedCornerShape(LKRadius.xl * 2)
val PillShape = RoundedCornerShape(LKRadius.full)
/** Every tap target ≥ 44 dp (frame.json minTap) – 48 dp is the Android default and is used for icon buttons. */
val MinTap: Dp = 44.dp

/** Press-bounce (Kit "tactile"): scale 0.97 while pressed; none under reduce-motion. Clicks give a light haptic tap. */
fun Modifier.tactile(onClick: (() -> Unit)?, label: String? = null, role: Role = Role.Button): Modifier = if (onClick == null) this else composedTactile(onClick, label, role)

@Composable
private fun Modifier.tactileImpl(onClick: () -> Unit, label: String?, role: Role): Modifier {
    val src = remember { MutableInteractionSource() }
    val pressed by src.collectIsPressedAsState()
    val reduce = LocalReduceMotion.current
    val h = LocalHaptics.current
    val s by animateFloatAsState(if (pressed && !reduce) 0.97f else 1f, LKAnim.spec(reduce, 120), label = "press")
    return this.graphicsLayer { scaleX = s; scaleY = s }
        .clickable(interactionSource = src, indication = androidx.compose.material3.ripple(), role = role, onClickLabel = label) { h.tap(); onClick() }
}
private fun Modifier.composedTactile(onClick: () -> Unit, label: String?, role: Role): Modifier = composed { tactileImpl(onClick, label, role) }

/** Rounded tactile card with the Kit's 2 dp bottom "lip". */
@Composable
fun LKCard(modifier: Modifier = Modifier, fill: Color = LocalLKColors.current.card, onClick: (() -> Unit)? = null, label: String? = null, content: @Composable ColumnScope.() -> Unit) {
    val c = LocalLKColors.current
    Box(modifier.fillMaxWidth().tactile(onClick, label)) {
        Box(Modifier.matchParentSize().offset(y = 3.dp).background(c.outlineVariant, CardShape))
        Column(Modifier.fillMaxWidth().clip(CardShape).background(fill).border(2.dp, c.outlineVariant, CardShape).padding(LKSpacing.spaceMd),
            verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), content = content)
    }
}

/** The ONE primary CTA: full width, ≥ 52 dp, label never truncated (wraps for de/ru +40 %). Disabled (nothing to check yet) = flat sand pill, no lip, not clickable. */
@Composable
fun LKPrimaryButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, fill: Color = LocalLKColors.current.primary, ink: Color = LocalLKColors.current.onPrimary, enabled: Boolean = true, trailing: (@Composable RowScope.() -> Unit)? = null) {
    val c = LocalLKColors.current
    Box(modifier.fillMaxWidth().heightIn(min = 52.dp).tactile(if (enabled) onClick else null).semantics { if (!enabled) disabled() }) {
        Box(Modifier.matchParentSize().offset(y = 4.dp).background(if (!enabled) c.lipLock else if (c.dark) c.primaryContainer else c.onPrimaryContainer.copy(alpha = 0.35f), PillShape))
        Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).background(if (enabled) fill else c.surfaceContainerHighest, PillShape).padding(horizontal = LKSpacing.spaceLg, vertical = LKSpacing.spaceSm),
            horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            Text(text.uppercase(LocalL10n.current.locale), style = LKType.titlePill.toCompose(), color = if (enabled) ink else c.onSurfaceVariant)
            trailing?.invoke(this)
        }
    }
}

/** Small secondary pill button (teal), ≥ 44 dp. */
@Composable
fun LKPillButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = LocalLKColors.current
    Box(modifier.heightIn(min = MinTap).clip(PillShape).background(c.secondaryContainer).tactile(onClick).padding(horizontal = LKSpacing.spaceMd), contentAlignment = Alignment.Center) {
        Text(text, style = LKType.labelMetric.toCompose(), color = c.onSecondaryContainer)
    }
}

/** Thin rounded progress bar with progressbar semantics. */
@Composable
fun LKProgress(fraction: Float, modifier: Modifier = Modifier, color: Color = LocalLKColors.current.primary, label: String? = null, track: Color = LocalLKColors.current.cardHigh) {
    val c = LocalLKColors.current
    val f = fraction.coerceIn(0f, 1f)
    Box(modifier.fillMaxWidth().height(8.dp).clip(PillShape).background(track).semantics { progressBarRangeInfo = ProgressBarRangeInfo(f, 0f..1f); if (label != null) contentDescription = label }) {
        if (f > 0f) Box(Modifier.fillMaxHeight().fillMaxWidth(f).background(color, PillShape))
    }
}

/** Section header: title left, optional action right (≥ 44 dp tap area). */
@Composable
fun LKSectionHeader(title: String, action: String? = null, onAction: (() -> Unit)? = null) {
    val c = LocalLKColors.current
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
        Text(title, style = LKType.headlineSm.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f, fill = false).semantics { heading() })
        if (action != null) Box(Modifier.heightIn(min = MinTap).tactile(onAction).padding(horizontal = LKSpacing.spaceXs), contentAlignment = Alignment.Center) {
            Text(action, style = LKType.labelMetric.toCompose(), color = c.secondary)
        }
    }
}
