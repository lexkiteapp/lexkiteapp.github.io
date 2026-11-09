package com.lexkite.app.feature.vocab

import android.icu.text.MeasureFormat
import android.icu.util.Measure
import android.icu.util.MeasureUnit
import android.icu.util.ULocale
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.ExperimentalFoundationApi
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.CardShape
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.TopBar
import com.lexkite.app.ui.TopBarVariant
import java.text.DateFormat
import java.util.Date
import java.util.Locale

/** The translation of the current UI language. */
internal val t: L10n @Composable get() = LocalL10n.current.western()

/** Inner screen: Back top bar (mirrored in RTL), scrolling body on the Kit gutter; [bottom] is pinned under the body (primary action / grade bar). */
@Composable
internal fun StudyPage(title: String, onBack: () -> Unit, bottom: (@Composable ColumnScope.() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Inner, title, t, onBack)
        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd), content = content)
        if (bottom != null) Column(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), content = bottom)
    }
}

/** Focus screen (review, practice runs): X + progress bar on top. */
@Composable
internal fun StudyFocus(progress: Float, title: String, onExit: () -> Unit, bottom: (@Composable ColumnScope.() -> Unit)? = null, content: @Composable ColumnScope.() -> Unit) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Focus(progress, track = c.surfaceContainerHighest), title, t, onExit)
        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd), content = content)
        if (bottom != null) Column(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), content = bottom)
    }
}

/** Inner screen whose body is a lazy list (deck, library, topic: hundreds of rows). */
@Composable
internal fun StudyList(title: String, onBack: () -> Unit, content: androidx.compose.foundation.lazy.LazyListScope.() -> Unit) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Inner, title, t, onBack)
        androidx.compose.foundation.lazy.LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs),
            verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), content = content)
    }
}

/** Pick one of several options in a dialog (word source, deck filters …). */
@Composable
internal fun PickerDialog(title: String, options: List<Pair<String, String>>, selected: String, onPick: (String) -> Unit, onClose: () -> Unit) {
    val c = LocalLKColors.current
    AlertDialog(onDismissRequest = onClose, containerColor = c.card,
        title = { Text(title, style = LKType.headlineSm.toCompose(), color = c.onSurface) },
        text = {
            androidx.compose.foundation.lazy.LazyColumn(Modifier.heightIn(max = 420.dp)) {
                items(options.size) { i ->
                    val (v, label) = options[i]
                    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).tactile({ onPick(v) }).padding(horizontal = LKSpacing.spaceXs, vertical = LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                        Text(label, Modifier.weight(1f), style = LKType.bodyMd.toCompose(), color = if (v == selected) c.secondary else c.onSurface)
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text(t(L10nKey.actionClose), color = c.secondary) } })
}

// ---- text ----
@Composable internal fun Body(text: String, modifier: Modifier = Modifier, color: Color = LocalLKColors.current.onSurface, style: com.lexkite.app.design.generated.LKTextStyle = LKType.bodyMd, align: TextAlign? = null, maxLines: Int = Int.MAX_VALUE) =
    Text(text, modifier, color = color, style = style.toCompose().copy(textDirection = contentDirection(text)), textAlign = align, maxLines = maxLines, overflow = if (maxLines == Int.MAX_VALUE) TextOverflow.Clip else TextOverflow.Ellipsis)
@Composable internal fun Muted(text: String, modifier: Modifier = Modifier, align: TextAlign? = null) = Body(text, modifier, LocalLKColors.current.onSurfaceVariant, LKType.bodySm, align)
@Composable internal fun Label(text: String, modifier: Modifier = Modifier, color: Color = LocalLKColors.current.onSurfaceVariant) = Text(text.uppercase(t.locale), modifier, color = color, style = LKType.labelBadge.toCompose())

/** `<b>x</b>` in a string becomes bold, any other tag is dropped (the strings come from the web with a little markup). */
internal fun rich(s: String, bold: SpanStyle = SpanStyle(fontWeight = FontWeight.Bold)): AnnotatedString = buildAnnotatedString {
    var i = 0
    val parts = Regex("<b>(.*?)</b>", RegexOption.DOT_MATCHES_ALL).findAll(s).toList()
    fun plain(x: String) = x.replace(Regex("<[^>]*>"), "")
    for (m in parts) { append(plain(s.substring(i, m.range.first))); withStyle(bold) { append(plain(m.groupValues[1])) }; i = m.range.last + 1 }
    append(plain(s.substring(i)))
}
@Composable internal fun RichBody(s: String, modifier: Modifier = Modifier, color: Color = LocalLKColors.current.onSurface, style: com.lexkite.app.design.generated.LKTextStyle = LKType.bodyMd, align: TextAlign? = null) =
    Text(rich(s), modifier, color = color, style = style.toCompose(), textAlign = align)

/** English learning content always reads left-to-right, also in an RTL UI (web `dir="ltr"` on the same blocks). */
@Composable internal fun EnLtr(content: @Composable () -> Unit) = CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) { content() }

// ---- controls ----
/** Filter / tab chip: ≥ 44 dp, selected = teal container. */
@Composable
internal fun Chip(text: String, selected: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val c = LocalLKColors.current
    val bg = if (selected) c.secondaryContainer else c.card
    Box(modifier.heightIn(min = MinTap).clip(PillShape).background(bg).border(BorderStroke(2.dp, if (selected) c.secondary else c.outlineVariant), PillShape)
        .tactile(onClick, role = Role.Tab).semantics { this.selected = selected }.padding(horizontal = LKSpacing.spaceMd, vertical = LKSpacing.spaceXs), contentAlignment = Alignment.Center) {
        Text(text, style = LKType.labelMetric.toCompose(), color = if (selected) c.onSecondaryContainer else c.onSurface)
    }
}

/** Secondary (outlined) pill button, ≥ 48 dp, wraps long labels. */
@Composable
internal fun GhostButton(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, enabled: Boolean = true, ink: Color = LocalLKColors.current.secondary) {
    val c = LocalLKColors.current
    Box(modifier.heightIn(min = 48.dp).clip(PillShape).border(BorderStroke(2.dp, if (enabled) ink else c.outlineVariant), PillShape).tactile(if (enabled) onClick else null)
        .padding(horizontal = LKSpacing.spaceMd, vertical = LKSpacing.spaceXs), contentAlignment = Alignment.Center) {
        Text(text, style = LKType.labelMetric.toCompose(), color = if (enabled) ink else c.onSurfaceVariant, textAlign = TextAlign.Center)
    }
}

/** Round speaker button (≥ 48 dp). */
@Composable
internal fun SpeakButton(onClick: () -> Unit, modifier: Modifier = Modifier, label: String = t(L10nKey.revListenToPronunciation)) {
    val c = LocalLKColors.current
    Box(modifier.size(48.dp).clip(CircleShape).background(c.secondaryContainer).tactile(onClick, label), contentAlignment = Alignment.Center) {
        Icon(Icons.AutoMirrored.Filled.VolumeUp, null, tint = c.onSecondaryContainer)
    }
}

/** Text box on the Kit: 2 dp border, ≥ 48 dp; English input is always left-to-right. */
@Composable
internal fun StudyField(value: String, onChange: (String) -> Unit, hint: String, modifier: Modifier = Modifier, singleLine: Boolean = true, minHeight: Dp = 48.dp, ime: ImeAction = ImeAction.Done, onDone: (() -> Unit)? = null, ltr: Boolean = true, enabled: Boolean = true) {
    val c = LocalLKColors.current
    val style = LKType.bodyLg.toCompose().copy(color = c.onSurface)
    val shape = RoundedCornerShape(16.dp)
    val field: @Composable () -> Unit = {
        BasicTextField(value, onChange, modifier.fillMaxWidth().semantics { contentDescription = hint }, enabled = enabled, singleLine = singleLine, textStyle = style, cursorBrush = SolidColor(c.secondary),
            keyboardOptions = KeyboardOptions(imeAction = ime), keyboardActions = KeyboardActions(onDone = { onDone?.invoke() }, onGo = { onDone?.invoke() }, onSearch = { onDone?.invoke() }),
            decorationBox = { inner ->
                Box(Modifier.fillMaxWidth().heightIn(min = minHeight).clip(shape).background(c.card).border(2.dp, c.outlineVariant, shape).padding(horizontal = LKSpacing.spaceSm, vertical = LKSpacing.spaceXs), contentAlignment = if (singleLine) Alignment.CenterStart else Alignment.TopStart) {
                    if (value.isEmpty()) Text(hint, style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant)
                    inner()
                }
            })
    }
    if (ltr) EnLtr(field) else field()
}

/** Card with an emoji, a title and a line; optional primary action. Used for every empty / error state. */
@Composable
internal fun EmptyState(emoji: String, title: String, body: String? = null, action: String? = null, onAction: (() -> Unit)? = null, second: String? = null, onSecond: (() -> Unit)? = null) {
    LKCard {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            Text(emoji, style = LKType.displayHeroMobile.toCompose())
            Body(title, align = TextAlign.Center, style = LKType.headlineSm)
            if (body != null) Muted(body, align = TextAlign.Center)
            if (action != null && onAction != null) LKPrimaryButton(action, onAction)
            if (second != null && onSecond != null) GhostButton(second, onSecond, Modifier.fillMaxWidth())
        }
    }
}

/** A one-line status / toast card (success or error tint). */
@Composable
internal fun Notice(text: String, ok: Boolean = true, modifier: Modifier = Modifier) {
    val c = LocalLKColors.current
    val line = if (ok) c.success else c.error
    Row(modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(if (ok) c.surfaceContainerHighest else c.errorContainer).border(2.dp, line, RoundedCornerShape(16.dp)).padding(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
        Text(text, style = LKType.bodyMd.toCompose(), color = if (ok) c.onSurface else c.onErrorContainer)
    }
}

/** Yes / no question in a dialog (delete a card, leave a run …). */
@Composable
internal fun Confirm(title: String, yes: String, no: String, onYes: () -> Unit, onNo: () -> Unit) {
    val c = LocalLKColors.current
    AlertDialog(onDismissRequest = onNo, containerColor = c.card,
        title = { Text(title, style = LKType.headlineSm.toCompose(), color = c.onSurface) },
        confirmButton = { TextButton(onClick = onYes, modifier = Modifier.heightIn(min = 48.dp)) { Text(yes, color = c.error) } },
        dismissButton = { TextButton(onClick = onNo, modifier = Modifier.heightIn(min = 48.dp)) { Text(no, color = c.secondary) } })
}

/** Small stat tile (number over label), as the Stitch stat chips. */
@Composable
internal fun StatTile(value: String, label: String, modifier: Modifier = Modifier) {
    val c = LocalLKColors.current
    Column(modifier.clip(RoundedCornerShape(16.dp)).background(c.card).border(2.dp, c.outlineVariant, RoundedCornerShape(16.dp)).padding(LKSpacing.spaceSm), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = LKType.headlineSm.toCompose(), color = c.onSurface)
        Text(label, style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant, textAlign = TextAlign.Center)
    }
}

/** Answer state of a choice card. */
internal enum class Pick { NONE, RIGHT, WRONG, DIM }

/** Tactile answer card (Stitch lesson-question): letter badge + text, right = green, wrong = red; ≥ 56 dp. */
@Composable
internal fun ChoiceCard(letter: String, text: String, state: Pick, onClick: (() -> Unit)?, modifier: Modifier = Modifier, ltr: Boolean = false) {
    val c = LocalLKColors.current
    val shape = RoundedCornerShape(20.dp)
    val line = when (state) { Pick.RIGHT -> c.success; Pick.WRONG -> c.error; else -> c.outlineVariant }
    val bg = when (state) { Pick.RIGHT -> c.surfaceContainerHighest; Pick.WRONG -> c.errorContainer; else -> c.card }
    val ink = if (state == Pick.WRONG) c.onErrorContainer else if (state == Pick.DIM) c.onSurfaceVariant else c.onSurface
    val body: @Composable () -> Unit = {
        Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(shape).background(bg).border(2.dp, line, shape).let { if (onClick != null) it.tactile(onClick, role = Role.RadioButton) else it }.padding(LKSpacing.spaceSm),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            Box(Modifier.size(28.dp).clip(RoundedCornerShape(8.dp)).background(if (state == Pick.RIGHT) c.success else if (state == Pick.WRONG) c.error else c.surfaceContainerHighest), contentAlignment = Alignment.Center) {
                Text(letter, style = LKType.labelBadge.toCompose(), color = if (state == Pick.RIGHT) c.onSecondary else if (state == Pick.WRONG) c.onError else c.onSurfaceVariant)
            }
            Text(text, Modifier.weight(1f), style = LKType.bodyLg.toCompose(), color = ink)
        }
    }
    Box(modifier) { if (ltr) EnLtr(body) else body() }
}
internal val LETTERS = listOf("A", "B", "C", "D", "E", "F")

/** Wrapping row of chips / words. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun Flow(content: @Composable () -> Unit) = FlowRow(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { content() }

/** Small read-only tag (part of speech, CEFR level). */
@Composable
internal fun Tag(text: String, color: Color = LocalLKColors.current.secondary) {
    Text(text.uppercase(t.locale), Modifier.clip(PillShape).background(LocalLKColors.current.surfaceContainerHighest).padding(horizontal = LKSpacing.spaceXs, vertical = 2.dp), color = color, style = LKType.labelBadge.toCompose())
}

/** Mastery dot colour: 0 new · 1 learning · 2 known · 3 mastered. */
@Composable internal fun masteryColor(m: Int): Color { val c = LocalLKColors.current; return when (m) { 3 -> c.success; 2 -> c.secondary; 1 -> c.star; else -> c.outline } }
@Composable
internal fun MasteryDot(m: Int) { Box(Modifier.size(10.dp).clip(CircleShape).background(masteryColor(m))) }

// ---- formatting (platform-localised, no hand-written unit words) ----
/** "10 min" · "3 days" · "2 months" · "1.5 yr" in [locale] (CLDR short width). */
internal fun spanText(unit: String, n: Double, locale: Locale): String {
    val u = when (unit) { "min" -> MeasureUnit.MINUTE; "sec" -> MeasureUnit.SECOND; "day" -> MeasureUnit.DAY; "month" -> MeasureUnit.MONTH; else -> MeasureUnit.YEAR }
    return MeasureFormat.getInstance(ULocale.forLocale(locale), MeasureFormat.FormatWidth.SHORT).format(Measure(n, u))
}
internal fun dateText(ms: Long, locale: Locale): String = DateFormat.getDateInstance(DateFormat.MEDIUM, locale).format(Date(ms))
internal fun L10n.minutes(m: Int): String = this(L10nKey.revMin, mapOf("m" to m))

/** `{n} due` style list: first [limit] of a long list. */
internal fun <T> List<T>.firstN(limit: Int) = if (size > limit) subList(0, limit) else this
