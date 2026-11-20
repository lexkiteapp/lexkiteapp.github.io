package com.lexkite.app.feature.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.write.lObj
import com.lexkite.app.core.write.lStr
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.i18n.L10n
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

// Shared bits of the P09 part-2 screens (#/fix #/grammar #/method #/quick #/style #/confidence).

/** A web source key (the Vietnamese text a web `t()` receives) in the UI language, `{name}` variables filled; unknown keys stay as they are. */
internal fun L10n.lv(key: String, vararg v: Pair<String, Any>): String { var s = src(key); for ((k, x) in v) s = s.replace("{$k}", x.toString()); return s }
/** A `{k, v}` pair of the bundled content (`v` values are strings or numbers) or a plain key */
internal fun L10n.lvj(e: JsonElement?): String {
    if (e == null) return ""
    if (e is JsonPrimitive) return lv(e.content)
    val o = e as? JsonObject ?: return ""
    return lv(o.lStr("k"), *o.lObj("v").map { (k, x) -> k to (x as? JsonPrimitive)?.content.orEmpty() }.toTypedArray())
}
/** `<a>` / `<b>` / `<i>` of the i18n sources dropped */
internal fun String.noTags(): String = replace(Regex("<[^>]+>"), "")

/** primary / outlined action, full width, wraps long labels */
@Composable
internal fun LAction(text: String, onClick: () -> Unit, primary: Boolean = false, enabled: Boolean = true, modifier: Modifier = Modifier) {
    if (primary) LKPrimaryButton(text, onClick, modifier.fillMaxWidth(), enabled = enabled) else GhostButton(text, onClick, modifier.fillMaxWidth(), enabled = enabled)
}

/** thin progress bar (0..1) */
@Composable
internal fun LBar(value: Float, modifier: Modifier = Modifier, tint: Color = LocalLKColors.current.secondary) {
    val c = LocalLKColors.current
    Box(modifier.fillMaxWidth().height(8.dp).clip(RoundedCornerShape(4.dp)).background(c.outlineVariant)) {
        Box(Modifier.fillMaxWidth(value.coerceIn(0f, 1f)).height(8.dp).background(tint))
    }
}

/** icon-less note line (state, hint) */
@Composable
internal fun LNote(text: String, tint: Color = LocalLKColors.current.onSurfaceVariant) {
    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.Top) {
        Box(Modifier.padding(top = 6.dp).size(8.dp).clip(CircleShape).background(tint))
        VText(text, LKType.bodySm, tint, Modifier.weight(1f))
    }
}

/** answer option: neutral / right (✓) / wrong (✗) – never colour alone */
@Composable
internal fun LChoice(text: String, state: Int, enabled: Boolean, onClick: () -> Unit, english: Boolean = true) {
    val c = LocalLKColors.current
    val edge = when (state) { 1 -> c.success; 2 -> c.error; else -> c.outlineVariant }
    val shape = RoundedCornerShape(16.dp)
    Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).clip(shape).background(c.card).border(2.dp, edge, shape).tactile(if (enabled) onClick else null).padding(horizontal = LKSpacing.spaceSm, vertical = LKSpacing.spaceXs),
        horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
        if (english) Ltr { VText(text, LKType.bodyMd, c.onSurface, Modifier.weight(1f)) } else VText(text, LKType.bodyMd, c.onSurface, Modifier.weight(1f))
        if (state == 1) VText("✓", LKType.titlePill, c.success) else if (state == 2) VText("✗", LKType.titlePill, c.error)
    }
}

/** underlined, coloured chip for a formula piece / word (role named by the legend, never colour alone) */
@Composable
internal fun LPill(text: String, tint: Color, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null) {
    val c = LocalLKColors.current
    Box(modifier.heightIn(min = if (onClick != null) MinTap else 32.dp).clip(RoundedCornerShape(50)).background(tint.copy(alpha = 0.16f)).border(1.5.dp, tint, RoundedCornerShape(50)).tactile(onClick).padding(horizontal = 10.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center) { Ltr { VText(text, LKType.labelMetric, c.onSurface) } }
}
