package com.lexkite.app.feature.lesson

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.CardShape
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose

/** Raw token set of the current theme (LKColors carries only the common roles; the lesson also needs lips and error containers). */
internal val tokens: com.lexkite.app.design.LKColors
    @Composable get() = LocalLKColors.current

/** Result colouring of a card after Check. */
internal enum class Mark { NONE, SELECTED, RIGHT, WRONG, DIM }

private val OptShape = RoundedCornerShape(20.dp)

/** Tactile answer card (Stitch lesson-question): letter badge · word · optional sub label; 2 px border, 4 dp lip; a radio for TalkBack. */
@Composable
internal fun OptionCard(letter: String, text: String, mark: Mark, onClick: (() -> Unit)?, modifier: Modifier = Modifier, sub: String? = null, tag: String? = null, state: String? = null) {
    val c = LocalLKColors.current; val tk = tokens
    val (bg, line, lip) = when (mark) {
        Mark.SELECTED -> Triple(c.cardHigh, c.secondary, tk.lipOptSel)
        Mark.RIGHT -> Triple(c.cardHigh, c.success, c.success)
        Mark.WRONG -> Triple(tk.errorContainer, c.error, c.error)
        else -> Triple(c.card, c.outlineVariant, tk.lipOpt)
    }
    val ink = if (mark == Mark.WRONG) tk.onErrorContainer else c.onSurface
    val badge = if (mark == Mark.NONE || mark == Mark.DIM) tk.surfaceContainerHighest else if (mark == Mark.WRONG) c.error else if (mark == Mark.RIGHT) c.success else c.secondary
    val onBadge = if (mark == Mark.NONE || mark == Mark.DIM) c.onSurfaceVariant else if (mark == Mark.WRONG) c.onError else c.onSecondary
    Box(modifier.heightIn(min = 96.dp).let { if (onClick != null) it.tactile(onClick, role = Role.RadioButton) else it }
        .semantics { selected = mark == Mark.SELECTED || mark == Mark.RIGHT; if (state != null) stateDescription = state }) {
        Box(Modifier.matchParentSize().offset(y = 4.dp).background(lip, OptShape))
        Column(Modifier.fillMaxWidth().clip(OptShape).background(bg).border(2.dp, line, OptShape).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(24.dp).clip(RoundedCornerShape(8.dp)).background(badge), contentAlignment = Alignment.Center) { Text(letter, style = LKType.labelBadge.toCompose(), color = onBadge) }
                if (mark == Mark.RIGHT) Icon(Icons.Filled.Check, null, tint = c.success, modifier = Modifier.size(20.dp))
                else if (mark == Mark.SELECTED) Box(Modifier.size(24.dp).clip(CircleShape).background(c.secondary), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Check, null, tint = c.onSecondary, modifier = Modifier.size(16.dp)) }
            }
            Text(text, style = LKType.headlineSm.toCompose(), color = ink)
            if (sub != null) Text(sub, style = LKType.bodySm.toCompose(), color = if (mark == Mark.WRONG) tk.onErrorContainer else c.onSurfaceVariant)
            if (tag != null) Text(tag, style = LKType.labelBadge.toCompose(), color = if (mark == Mark.WRONG) c.error else c.success)
        }
    }
}

/** Word / letter tile of the build, tr and type exercises. [dim] = already placed: the slot stays (no reflow) but shows only an empty outline. */
@Composable
internal fun Tile(text: String, onClick: (() -> Unit)?, modifier: Modifier = Modifier, dim: Boolean = false, label: String? = null) {
    val c = LocalLKColors.current
    val shape = RoundedCornerShape(14.dp)
    Box(modifier.heightIn(min = MinTap).widthIn(min = MinTap).let { if (onClick != null && !dim) it.tactile(onClick, label) else it }, contentAlignment = Alignment.Center) {
        Box(Modifier.heightIn(min = 40.dp).clip(shape).background(if (dim) c.cardLow else c.card).border(BorderStroke(2.dp, if (dim) c.outlineVariant.copy(alpha = 0.5f) else c.outlineVariant), shape).padding(horizontal = 14.dp, vertical = 8.dp), contentAlignment = Alignment.Center) {
            Text(text, style = LKType.bodyLg.toCompose(), color = if (dim) Color.Transparent else c.onSurface, textAlign = TextAlign.Center)
        }
    }
}

/** English learning content (sentences, word tiles, typed answers) always reads left-to-right, also in an RTL UI (ar): web `dir="ltr"` on the same blocks. */
@Composable
internal fun EnglishLtr(content: @Composable () -> Unit) = androidx.compose.runtime.CompositionLocalProvider(androidx.compose.ui.platform.LocalLayoutDirection provides androidx.compose.ui.unit.LayoutDirection.Ltr) { content() }

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun Flow(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    FlowRow(modifier, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs, Alignment.CenterHorizontally), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { content() }
}

/** Rounded pill chip (combo, kind, tags). */
@Composable
internal fun Chip(text: String, fill: Color, ink: Color, modifier: Modifier = Modifier, line: Color = fill) {
    Box(modifier.heightIn(min = 28.dp).clip(PillShape).background(fill).border(1.dp, line, PillShape).padding(horizontal = 12.dp, vertical = 4.dp), contentAlignment = Alignment.Center) {
        Text(text, style = LKType.labelBadge.toCompose(), color = ink)
    }
}
