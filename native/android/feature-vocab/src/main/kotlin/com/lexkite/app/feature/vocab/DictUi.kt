package com.lexkite.app.feature.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPillButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKTextStyle
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.TopBar
import com.lexkite.app.ui.TopBarVariant
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

// ---------- JSON helpers (the :core ones are module-internal) ----------
internal fun JsonElement?.js(): String = if (this is JsonPrimitive && this !is JsonNull) content else ""
internal fun JsonObject?.jstr(k: String): String = this?.get(k).js()
internal fun JsonObject?.jarr(k: String): List<JsonElement> = (this?.get(k) as? JsonArray) ?: emptyList()
internal fun JsonObject?.jobj(k: String): JsonObject? = this?.get(k) as? JsonObject
internal fun JsonObject?.jbool(k: String): Boolean {
    val p = this?.get(k) as? JsonPrimitive ?: return false
    if (p is JsonNull) return false
    return p.content.isNotEmpty() && p.content != "false" && p.content != "0"
}
internal fun JsonObject?.jstrs(k: String): List<String> = jarr(k).map { it.js() }
internal fun JsonObject?.jint(k: String): Int = jstr(k).toDoubleOrNull()?.toInt() ?: 0

private val TAGS = Regex("<[^>]*>")
/** Several translated strings carry web markup (<b>…</b>): the native UI shows the text only. */
internal fun String.plain(): String = TAGS.replace(this, "").replace("&nbsp;", " ").replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").trim()

// ---------- layout ----------
/** English content (words, IPA, sentences) always runs left-to-right, also inside the Arabic UI. */
@Composable
internal fun Ltr(content: @Composable () -> Unit) = CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) { content() }

/** Inner screen shell: Back top-start (mirrored in RTL), scrolling body, 16 dp gutter. */
@Composable
internal fun VScreen(title: String, onExit: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    CompositionLocalProvider(LocalL10n provides t) {
        Column(Modifier.fillMaxSize().background(c.background)) {
            TopBar(TopBarVariant.Inner, title, t, onExit)
            Column(
                Modifier.fillMaxWidth().weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs),
                verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd), content = content,
            )
        }
    }
}

/** Latin-only text inside an RTL layout runs left-to-right (punctuation stays at its end: `Meaning of "x"?`); mixed or Arabic text keeps the layout's rule. */
@Composable @androidx.compose.runtime.ReadOnlyComposable
internal fun contentDirection(text: String): androidx.compose.ui.text.style.TextDirection {
    if (LocalLayoutDirection.current != LayoutDirection.Rtl) return androidx.compose.ui.text.style.TextDirection.Unspecified
    var latin = false
    for (ch in text) when (Character.getDirectionality(ch)) {
        Character.DIRECTIONALITY_LEFT_TO_RIGHT -> latin = true
        Character.DIRECTIONALITY_RIGHT_TO_LEFT, Character.DIRECTIONALITY_RIGHT_TO_LEFT_ARABIC -> return androidx.compose.ui.text.style.TextDirection.Unspecified
    }
    return if (latin) androidx.compose.ui.text.style.TextDirection.Ltr else androidx.compose.ui.text.style.TextDirection.Unspecified
}

@Composable
internal fun VText(text: String, style: LKTextStyle = LKType.bodyMd, color: Color = LocalLKColors.current.onSurface, modifier: Modifier = Modifier) =
    Text(text, style = style.toCompose().copy(textDirection = contentDirection(text)), color = color, modifier = modifier)

@Composable
internal fun VMuted(text: String, modifier: Modifier = Modifier) = VText(text, LKType.bodySm, LocalLKColors.current.onSurfaceVariant, modifier)

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun VFlow(modifier: Modifier = Modifier, content: @Composable () -> Unit) =
    FlowRow(modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { content() }

/** Pill chip, 44 dp tall tap target. `selected` = the active tab / filter. */
@Composable
internal fun VChip(text: String, onClick: (() -> Unit)?, selected: Boolean = false, modifier: Modifier = Modifier) {
    val c = LocalLKColors.current
    Box(
        modifier.heightIn(min = MinTap).clip(PillShape).background(if (selected) c.secondaryContainer else c.card)
            .border(2.dp, if (selected) c.secondary else c.outlineVariant, PillShape).tactile(onClick).semantics { this.selected = selected }.padding(horizontal = LKSpacing.spaceSm),
        contentAlignment = Alignment.Center,
    ) { Text(text, style = LKType.labelMetric.toCompose().copy(textDirection = contentDirection(text)), color = if (selected) c.onSecondaryContainer else c.onSurface) }
}

/** Small read-only badge (level, part of speech, band …). */
@Composable
internal fun VBadge(text: String, fill: Color = LocalLKColors.current.surfaceContainerHighest, ink: Color = LocalLKColors.current.onSurface) {
    Box(Modifier.clip(PillShape).background(fill).padding(horizontal = LKSpacing.spaceXs, vertical = 2.dp)) { Text(text, style = LKType.labelBadge.toCompose().copy(textDirection = contentDirection(text)), color = ink) }
}

/** Round 44 dp icon button with a spoken description. */
@Composable
internal fun VSpeak(label: String, slow: Boolean = false, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Box(
        Modifier.size(MinTap).clip(CircleShape).background(c.secondaryContainer.copy(alpha = 0.22f)).tactile(onClick).semantics { contentDescription = label },
        contentAlignment = Alignment.Center,
    ) { Icon(if (slow) Icons.Filled.Speed else Icons.AutoMirrored.Filled.VolumeUp, null, tint = c.secondary, modifier = Modifier.size(22.dp)) }
}

/** Text input (always LTR – English is typed here). Enter / the IME action runs [onGo]. */
@Composable
internal fun VField(
    value: String, onChange: (String) -> Unit, hint: String, modifier: Modifier = Modifier, onGo: (() -> Unit)? = null,
    singleLine: Boolean = true, lines: Int = 1, leading: Boolean = false, onClear: (() -> Unit)? = null,
) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp)
    Ltr {
        Row(
            modifier.fillMaxWidth().heightIn(min = if (singleLine) 52.dp else (24 * lines + 28).dp).clip(shape).background(c.card).border(2.dp, if (value.isNotEmpty()) c.secondary else c.outlineVariant, shape).padding(horizontal = LKSpacing.spaceSm),
            verticalAlignment = if (singleLine) Alignment.CenterVertically else Alignment.Top, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs),
        ) {
            if (leading) Box(Modifier.heightIn(min = 52.dp), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Search, null, tint = c.secondary, modifier = Modifier.size(22.dp)) }
            BasicTextField(
                value, onChange, Modifier.weight(1f).padding(vertical = if (singleLine) 8.dp else LKSpacing.spaceXs).semantics { contentDescription = hint }, singleLine = singleLine,
                textStyle = LKType.bodyLg.toCompose().copy(color = c.onSurface), cursorBrush = SolidColor(c.secondary),
                keyboardOptions = KeyboardOptions(imeAction = if (onGo != null && singleLine) ImeAction.Search else ImeAction.Default, autoCorrectEnabled = false),
                keyboardActions = KeyboardActions(onSearch = { onGo?.invoke() }),
                decorationBox = { inner ->
                    Box(Modifier.heightIn(min = if (singleLine) 36.dp else 24.dp), contentAlignment = if (singleLine) Alignment.CenterStart else Alignment.TopStart) {
                        if (value.isEmpty()) Text(hint, style = LKType.bodyLg.toCompose(), color = c.onSurfaceVariant)
                        inner()
                    }
                },
            )
            if (onClear != null && value.isNotEmpty()) Box(Modifier.size(MinTap).tactile(onClear).semantics { contentDescription = t(L10nKey.actionClose) }, contentAlignment = Alignment.Center) {
                Icon(Icons.Filled.Close, null, tint = c.onSurfaceVariant, modifier = Modifier.size(20.dp))
            }
        }
    }
}

/** A message card for empty / offline / error states, with an optional retry. */
@Composable
internal fun VNotice(text: String, retry: (() -> Unit)? = null) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    LKCard {
        VText(text, LKType.bodyMd, c.onSurfaceVariant)
        if (retry != null) LKPillButton(t(L10nKey.actionRetry), retry)
    }
}

/** Section title inside a card. */
@Composable
internal fun VTitle(text: String) = VText(text, LKType.headlineSm, LocalLKColors.current.onSurface)

internal fun L10n.s(key: L10nKey, vararg v: Pair<String, Any>): String = this(key, v.toMap())
