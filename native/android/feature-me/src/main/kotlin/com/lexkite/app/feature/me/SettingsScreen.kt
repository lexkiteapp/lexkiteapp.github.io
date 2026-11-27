package com.lexkite.app.feature.me

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Palette
import androidx.compose.material.icons.filled.Storage
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.settings.LearnSettings
import com.lexkite.app.core.settings.SettingRange
import com.lexkite.app.design.CardShape
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPillButton
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
import com.lexkite.app.ui.LKScreen
import com.lexkite.app.ui.TopBarVariant
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonPrimitive

/** Settings pages (web #/settings[/<sec>], docs/specs/me-settings-ux.md). Reminders = C06, account = the Me card. */
val SETTINGS_SECTIONS = listOf("look", "study", "sound", "data", "help")

/** [theme] = device value "system" | "light" | "dark" (AppPrefs); [user] = signed-in name, null = guest. */
data class SettingsState(val learn: LearnSettings, val lang: String, val theme: String, val haptics: Boolean, val user: String?, val wiped: Boolean = false)

interface SettingsActions {
    /** Writes one web settings key (synced document). */
    fun set(key: String, value: JsonElement)
    fun setTheme(theme: String); fun setHaptics(on: Boolean); fun pickLanguage()
    fun trySpeak(); fun wipe(); fun openUrl(url: String)
}

@Composable
fun SettingsScreen(section: String, s: SettingsState, a: SettingsActions, open: (String) -> Unit, onExit: () -> Unit) {
    val t = LocalL10n.current
    val sec = section.takeIf { it in SETTINGS_SECTIONS }
    LKScreen(TopBarVariant.Inner, if (sec == null) t(L10nKey.setTitle) else sectionTitle(sec, t), t, onExit) {
        Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).padding(vertical = LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd)) {
            when (sec) {
                null -> SettingsIndex(s, open, onExit)
                "look" -> LookPage(s, a)
                "study" -> StudyPage(s, a)
                "sound" -> SoundPage(s, a)
                "data" -> DataPage(s, a)
                else -> HelpPage(s, a)
            }
        }
    }
}

private fun sectionTitle(sec: String, t: L10n) = t(when (sec) { "look" -> L10nKey.setLook; "study" -> L10nKey.setStudy; "sound" -> L10nKey.setSoundTitle; "data" -> L10nKey.setData; else -> L10nKey.setHelp })

/** Icon chip tones of the Stitch rows (n1 amber · n2 teal · n3 coral). */
internal enum class Tone { N1, N2, N3 }

@Composable
internal fun toneColors(tone: Tone): Pair<Color, Color> {
    val c = LocalLKColors.current
    return when (tone) { Tone.N1 -> c.tertiaryContainer to c.onTertiaryContainer; Tone.N2 -> c.secondaryFixed to c.onSecondaryContainer; Tone.N3 -> c.errorContainer to c.onErrorContainer }
}

@Composable
private fun SettingsIndex(s: SettingsState, open: (String) -> Unit, onExit: () -> Unit) {
    val t = LocalL10n.current
    val theme = t(when (s.theme) { "light" -> L10nKey.setLight; "dark" -> L10nKey.setDark; else -> L10nKey.revAuto })
    Group { NavRow(Icons.Filled.Cloud, Tone.N1, t(L10nKey.meAccount), s.user ?: t(L10nKey.authSignIn), "set-account", onExit) }
    Group {
        NavRow(Icons.Filled.Palette, Tone.N1, t(L10nKey.setLook), t.nativeName(s.lang) + " · " + theme, "set-look") { open("settings/look") }
        Divider()
        NavRow(Icons.Filled.TrackChanges, Tone.N2, t(L10nKey.setStudy), t(L10nKey.setNewPerDay, mapOf("n" to s.learn.dailyNew)), "set-study") { open("settings/study") }
        Divider()
        NavRow(Icons.AutoMirrored.Filled.VolumeUp, Tone.N3, t(L10nKey.setSound), (if (s.learn.accent == "en-US") "US" else "UK") + " · " + rate(s.learn.ttsRate, t), "set-sound") { open("settings/sound") }
    }
    Group { NavRow(Icons.Filled.Storage, Tone.N2, t(L10nKey.setData), null, "set-data") { open("settings/data") } }
    Group { NavRow(Icons.Filled.Info, Tone.N1, t(L10nKey.setHelp), null, "set-help") { open("settings/help") } }
}

private fun rate(r: Double, t: L10n) = String.format(t.locale, "%.2f×", r)

@Composable
internal fun Group(content: @Composable ColumnScope.() -> Unit) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxWidth().clip(CardShape).background(c.card), content = content)
}

@Composable
private fun Divider() { Box(Modifier.padding(horizontal = 12.dp).fillMaxWidth().height(1.dp).background(LocalLKColors.current.outlineVariant)) }

@Composable
internal fun NavRow(icon: ImageVector, tone: Tone, label: String, value: String?, tag: String, onClick: () -> Unit) {
    val c = LocalLKColors.current
    val (bg, ink) = toneColors(tone)
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).tactile(onClick, label).testTag(tag).padding(14.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        Box(Modifier.size(32.dp).clip(RoundedCornerShape(12.dp)).background(bg), contentAlignment = Alignment.Center) { Icon(icon, null, tint = ink, modifier = Modifier.size(18.dp)) }
        Column(Modifier.weight(1f)) {
            Text(label, style = LKType.bodyMd.toCompose(), color = c.onSurface)
            if (!value.isNullOrEmpty()) Text(value, style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = c.onSurfaceVariant, modifier = Modifier.size(20.dp))
    }
}

@Composable
private fun LookPage(s: SettingsState, a: SettingsActions) {
    val t = LocalL10n.current
    Group {
        NavRow(Icons.Filled.Palette, Tone.N1, t(L10nKey.setUiLang), t.nativeName(s.lang), "set-lang", a::pickLanguage)
    }
    LKCard {
        Label(t(L10nKey.setTheme))
        Segmented(listOf("system" to t(L10nKey.revAuto), "light" to t(L10nKey.setLight), "dark" to t(L10nKey.setDark)), s.theme, a::setTheme)
    }
}

@Composable
private fun StudyPage(s: SettingsState, a: SettingsActions) {
    val t = LocalL10n.current
    val l = s.learn
    LKCard {
        SliderRow(t(L10nKey.setDailyNew), LearnSettings.DAILY_NEW, l.dailyNew.toDouble(), "set-new", { t.num(it.toInt()) }) { a.set("dailyNew", JsonPrimitive(it.toInt())) }
        SliderRow(t(L10nKey.setDailyGoal), LearnSettings.DAILY_GOAL, l.dailyGoal.toDouble(), "set-goal", { t.num(it.toInt()) }) { a.set("dailyGoal", JsonPrimitive(it.toInt())) }
        SliderRow(t(L10nKey.setSessionCap), LearnSettings.SESSION_CAP, l.sessionCap.toDouble(), "set-cap", { if (it <= 0) t(L10nKey.setNoLimit) else t.num(it.toInt()) }) { a.set("sessionCap", JsonPrimitive(it.toInt())) }
        SliderRow(t(L10nKey.setRetention), LearnSettings.RETENTION, l.retention, "set-ret", { t.num(Math.round(it * 100).toInt()) + "%" }) { a.set("retention", JsonPrimitive(it)) }
        Hint(t(L10nKey.setRetentionTip))
    }
}

@Composable
private fun SoundPage(s: SettingsState, a: SettingsActions) {
    val t = LocalL10n.current
    val l = s.learn
    LKCard {
        Label(t(L10nKey.setAccent))
        listOf("en-GB" to t(L10nKey.setAccentUk), "en-US" to t(L10nKey.setAccentUs)).forEach { (v, label) ->
            val on = l.accent == v
            Row(Modifier.fillMaxWidth().heightIn(min = MinTap).tactile({ a.set("accent", JsonPrimitive(v)) }, label, Role.RadioButton).semantics { selected = on }.testTag("set-accent-$v"),
                verticalAlignment = Alignment.CenterVertically) {
                RadioButton(on, null, colors = RadioButtonDefaults.colors(selectedColor = LocalLKColors.current.secondary, unselectedColor = LocalLKColors.current.outline))
                Text(label, style = LKType.bodyMd.toCompose(), color = LocalLKColors.current.onSurface, modifier = Modifier.weight(1f))
            }
        }
        SliderRow(t(L10nKey.setRate), LearnSettings.TTS_RATE, l.ttsRate, "set-rate", { rate(it, t) }) { a.set("ttsRate", JsonPrimitive(it)) }
        LKPillButton(t(L10nKey.setTry), a::trySpeak)
    }
    LKCard {
        Toggle(t(L10nKey.setAutoSpeak), l.autoSpeak, "set-autospeak") { a.set("autoSpeak", JsonPrimitive(it)) }
        Toggle(t(L10nKey.setSfx), l.sfx, "set-sfx") { a.set("sfx", JsonPrimitive(it)) }
        Toggle(t(L10nKey.setHaptics), s.haptics, "set-haptics", a::setHaptics)
    }
}

@Composable
private fun DataPage(s: SettingsState, a: SettingsActions) {
    val t = LocalL10n.current
    val c = LocalLKColors.current
    var ask by rememberSaveable { mutableStateOf(false) }
    LKCard {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            Text(t(L10nKey.setWipe), style = LKType.bodyMd.toCompose(), color = c.error, modifier = Modifier.weight(1f))
            Box(Modifier.heightIn(min = MinTap).clip(PillShape).background(c.errorContainer).tactile({ ask = true }, t(L10nKey.vocabDelete)).testTag("set-wipe").padding(horizontal = LKSpacing.spaceMd), contentAlignment = Alignment.Center) {
                Text(t(L10nKey.vocabDelete), style = LKType.titlePill.toCompose(), color = c.onErrorContainer)
            }
        }
        if (s.wiped) Text(t(L10nKey.setWiped), style = LKType.bodySm.toCompose(), color = c.secondary, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
    }
    if (ask) AlertDialog(
        onDismissRequest = { ask = false }, containerColor = c.card,
        text = { Text(t(L10nKey.setWipeConfirm), style = LKType.bodyMd.toCompose(), color = c.onSurface) },
        confirmButton = { TextButton(onClick = { ask = false; a.wipe() }, modifier = Modifier.heightIn(min = MinTap)) { Text(t(L10nKey.vocabDelete), color = c.error) } },
        dismissButton = { TextButton(onClick = { ask = false }, modifier = Modifier.heightIn(min = MinTap)) { Text(t(L10nKey.actionCancel), color = c.onSurfaceVariant) } },
    )
}

@Composable
private fun HelpPage(s: SettingsState, a: SettingsActions) {
    val t = LocalL10n.current
    Group {
        NavRow(Icons.Filled.Info, Tone.N1, t(L10nKey.setPrivacy), null, "set-privacy") { a.openUrl(legalUrl(s.lang, "privacy")) }
        Divider()
        NavRow(Icons.Filled.Info, Tone.N2, t(L10nKey.setTerms), null, "set-terms") { a.openUrl(legalUrl(s.lang, "terms")) }
    }
}

/** web App.legalUrl outside lexkite.com. */
fun legalUrl(lang: String, page: String) = "https://lexkite.com/$lang/$page"

@Composable
private fun Label(text: String) { Text(text, style = LKType.titlePill.toCompose(), color = LocalLKColors.current.onSurface) }

@Composable
private fun Hint(text: String) { Text(text, style = LKType.bodySm.toCompose(), color = LocalLKColors.current.onSurfaceVariant) }

/** Range slider: shows the live value while dragging, writes once on release (one sync write, not one per frame). */
@Composable
private fun SliderRow(label: String, r: SettingRange, value: Double, tag: String, fmt: (Double) -> String, onCommit: (Double) -> Unit) {
    val c = LocalLKColors.current
    var v by remember(value) { mutableFloatStateOf(value.toFloat()) }
    val shown = fmt(r.snap(v.toDouble()))
    Column(Modifier.fillMaxWidth()) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(label, style = LKType.bodyMd.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f))
            Text(shown, style = LKType.titlePill.toCompose(), color = c.secondary)
        }
        Slider(v, { v = it }, valueRange = r.min.toFloat()..r.max.toFloat(), steps = (r.steps - 1).coerceAtLeast(0),
            onValueChangeFinished = { onCommit(r.snap(v.toDouble())) },
            colors = SliderDefaults.colors(thumbColor = c.secondary, activeTrackColor = c.secondary, inactiveTrackColor = c.surfaceContainerHighest, activeTickColor = Color.Transparent, inactiveTickColor = Color.Transparent),
            modifier = Modifier.fillMaxWidth().heightIn(min = MinTap).testTag(tag).semantics { contentDescription = label; stateDescription = shown })
    }
}

@Composable
private fun Toggle(label: String, on: Boolean, tag: String, onChange: (Boolean) -> Unit) {
    val c = LocalLKColors.current
    Row(Modifier.fillMaxWidth().heightIn(min = 48.dp).tactile({ onChange(!on) }, label, Role.Switch).testTag(tag), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        Text(label, style = LKType.bodyMd.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f))
        Switch(on, null, colors = SwitchDefaults.colors(checkedTrackColor = c.secondary, checkedThumbColor = c.onSecondary, uncheckedTrackColor = c.surfaceContainerHighest,
            uncheckedThumbColor = c.outline, uncheckedBorderColor = c.outline, checkedBorderColor = c.secondary))
    }
}

@Composable
private fun Segmented(options: List<Pair<String, String>>, value: String, onPick: (String) -> Unit) {
    val c = LocalLKColors.current
    Row(Modifier.fillMaxWidth().clip(PillShape).background(c.cardHigh).padding(4.dp), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        options.forEach { (k, label) ->
            val on = k == value
            Box(Modifier.weight(1f).heightIn(min = MinTap).clip(PillShape).background(if (on) c.secondary else Color.Transparent)
                .tactile({ onPick(k) }, label, Role.RadioButton).semantics { selected = on }.testTag("set-theme-$k"), contentAlignment = Alignment.Center) {
                Text(label, style = LKType.titlePill.toCompose(), color = if (on) c.onSecondary else c.onSurface, modifier = Modifier.padding(horizontal = LKSpacing.spaceXs))
            }
        }
    }
}

