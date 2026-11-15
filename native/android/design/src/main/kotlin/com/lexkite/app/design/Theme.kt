package com.lexkite.app.design

import android.content.Context
import android.provider.Settings
import androidx.compose.animation.core.FiniteAnimationSpec
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.em
import com.lexkite.app.design.generated.LKColorDark
import com.lexkite.app.design.generated.LKColorLight
import com.lexkite.app.design.generated.LKMotion
import com.lexkite.app.design.generated.LKTextStyle
import com.lexkite.app.i18n.L10n
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Resolved colour roles for the current theme (light = Bright Day, dark = Tactile Night), from generated tokens only (C11). */
data class LKColors(
    val dark: Boolean,
    val primary: Color, val onPrimary: Color, val primaryContainer: Color, val onPrimaryContainer: Color,
    val secondary: Color, val onSecondary: Color, val secondaryContainer: Color, val onSecondaryContainer: Color,
    val tertiary: Color, val onTertiary: Color, val tertiaryContainer: Color, val onTertiaryContainer: Color,
    val background: Color, val surface: Color, val onSurface: Color, val onSurfaceVariant: Color,
    val card: Color, val cardLow: Color, val cardHigh: Color, val outline: Color, val outlineVariant: Color,
    val star: Color, val success: Color, val error: Color, val onError: Color, val trail: Color,
    // roles the lesson (answer cards, feedback sheet, disabled CTA) needs on top of the common ones
    val lipLock: Color, val lipOpt: Color, val lipOptSel: Color, val errorContainer: Color, val onErrorContainer: Color, val secondaryFixed: Color, val tertiaryFixed: Color, val surfaceContainerHighest: Color,
) {
    companion object {
        val light = LKColorLight.run {
            LKColors(false, primary, onPrimary, primaryContainer, onPrimaryContainer, secondary, onSecondary, secondaryContainer, onSecondaryContainer,
                tertiary, onTertiary, tertiaryContainer, onTertiaryContainer, background, surface, onSurface, onSurfaceVariant,
                surfaceContainerLowest, surfaceContainerLow, surfaceContainerHigh, outline, outlineVariant, star, success, error, onError, trail,
                lipLock, lipOpt, lipOptSel, errorContainer, onErrorContainer, secondaryFixed, tertiaryFixed, surfaceContainerHighest)
        }
        val dark = LKColorDark.run {
            LKColors(true, primary, onPrimary, primaryContainer, onPrimaryContainer, secondary, onSecondary, secondaryContainer, onSecondaryContainer,
                tertiary, onTertiary, tertiaryContainer, onTertiaryContainer, background, surface, onSurface, onSurfaceVariant,
                surfaceContainerLowest, surfaceContainerLow, surfaceContainerHigh, outline, outlineVariant, star, success, error, onError, trail,
                lipLock, lipOpt, lipOptSel, errorContainer, onErrorContainer, secondaryFixed, tertiaryFixed, surfaceContainerHighest)
        }
    }
}

val LocalLKColors = staticCompositionLocalOf { LKColors.light }
val LocalL10n = staticCompositionLocalOf<L10n> { error("LKTheme missing") }
/** True when the system asks for no motion (Settings › Remove animations / animator duration scale 0). */
val LocalReduceMotion = staticCompositionLocalOf { false }
val LocalHaptics = staticCompositionLocalOf { LKHaptics.Off }
/** True for joined scripts (Arabic, Devanagari): see [toCompose]. Set by [LKTheme] from the language. */
val LocalJoinedScript = staticCompositionLocalOf { false }
private val JOINED_SCRIPTS = setOf("ar", "hi")

/** Token tracking (e.g. headlineLg −0.02 em) is for Latin/Cyrillic/CJK only: on joined scripts it cuts the letter joins and
 *  Compose measures the word too wide, so the Arabic Lesson title "درس" wrapped as "در / س" (#721). Those render at 0 tracking. */
@Composable @ReadOnlyComposable
fun LKTextStyle.toCompose(): TextStyle = TextStyle(fontSize = size, lineHeight = lineHeight, fontWeight = FontWeight(weight),
    letterSpacing = if (LocalJoinedScript.current) 0.em else trackingEm.em)

object LKAnim {
    val ease = CubicBezierEasing(LKMotion.EASE[0], LKMotion.EASE[1], LKMotion.EASE[2], LKMotion.EASE[3])
    /** Token fade (≤ 200 ms) or an instant snap when motion is reduced. */
    fun <T> spec(reduce: Boolean, ms: Int = LKMotion.FADE_MS): FiniteAnimationSpec<T> = if (reduce) snap() else tween(ms, easing = ease)
    fun durationScale(ctx: Context): Float = runCatching { Settings.Global.getFloat(ctx.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) }.getOrDefault(1f)
}

/** Root theme: tokens → Material 3 frame colours, RTL from the language (ar), reduce-motion, haptics, strings. */
@Composable
fun LKTheme(t: L10n, dark: Boolean, reduceMotion: Boolean = false, haptics: LKHaptics = LKHaptics.Off, content: @Composable () -> Unit) {
    val c = if (dark) LKColors.dark else LKColors.light
    val m3 = if (dark) LKM3.dark else LKM3.light
    CompositionLocalProvider(
        LocalLKColors provides c, LocalL10n provides t, LocalReduceMotion provides reduceMotion, LocalHaptics provides haptics,
        LocalLayoutDirection provides if (t.isRtl) LayoutDirection.Rtl else LayoutDirection.Ltr, LocalJoinedScript provides (t.lang in JOINED_SCRIPTS),
    ) { MaterialTheme(colorScheme = m3, content = content) }
}

/** Material 3 colour scheme built ENTIRELY from the generated tokens – no Material default (e.g. the lilac
 *  secondaryContainer tab indicator of M0) can leak into any component. `scrim` has no Kit token: Material's black scrim is kept. */
object LKM3 {
    val light = LKColorLight.run { lightColorScheme(primary = primary, onPrimary = onPrimary, primaryContainer = primaryContainer, onPrimaryContainer = onPrimaryContainer, inversePrimary = inversePrimary, secondary = secondary, onSecondary = onSecondary, secondaryContainer = secondaryContainer, onSecondaryContainer = onSecondaryContainer, tertiary = tertiary, onTertiary = onTertiary, tertiaryContainer = tertiaryContainer, onTertiaryContainer = onTertiaryContainer, background = background, onBackground = onBackground, surface = surface, onSurface = onSurface, surfaceVariant = surfaceVariant, onSurfaceVariant = onSurfaceVariant, surfaceTint = surfaceTint, inverseSurface = inverseSurface, inverseOnSurface = inverseOnSurface, error = error, onError = onError, errorContainer = errorContainer, onErrorContainer = onErrorContainer, outline = outline, outlineVariant = outlineVariant, surfaceBright = surfaceBright, surfaceContainer = surfaceContainer, surfaceContainerHigh = surfaceContainerHigh, surfaceContainerHighest = surfaceContainerHighest, surfaceContainerLow = surfaceContainerLow, surfaceContainerLowest = surfaceContainerLowest, surfaceDim = surfaceDim) }
    val dark = LKColorDark.run { darkColorScheme(primary = primary, onPrimary = onPrimary, primaryContainer = primaryContainer, onPrimaryContainer = onPrimaryContainer, inversePrimary = inversePrimary, secondary = secondary, onSecondary = onSecondary, secondaryContainer = secondaryContainer, onSecondaryContainer = onSecondaryContainer, tertiary = tertiary, onTertiary = onTertiary, tertiaryContainer = tertiaryContainer, onTertiaryContainer = onTertiaryContainer, background = background, onBackground = onBackground, surface = surface, onSurface = onSurface, surfaceVariant = surfaceVariant, onSurfaceVariant = onSurfaceVariant, surfaceTint = surfaceTint, inverseSurface = inverseSurface, inverseOnSurface = inverseOnSurface, error = error, onError = onError, errorContainer = errorContainer, onErrorContainer = onErrorContainer, outline = outline, outlineVariant = outlineVariant, surfaceBright = surfaceBright, surfaceContainer = surfaceContainer, surfaceContainerHigh = surfaceContainerHigh, surfaceContainerHighest = surfaceContainerHighest, surfaceContainerLow = surfaceContainerLow, surfaceContainerLowest = surfaceContainerLowest, surfaceDim = surfaceDim) }
}

/** The ONE app frame (DESIGN-SYSTEM §5d), generated from web/js/st/v2/runtime.js. */
@Serializable
data class LKFrame(val width: Int, val gutter: Int, val minTap: Int, val tabs: List<Tab>) {
    @Serializable
    data class Tab(val k: String, val route: String, val icon: String, val sf: String, val compose: String, val label: String)
    companion object {
        private val json = Json { ignoreUnknownKeys = true }
        fun parse(s: String): LKFrame = json.decodeFromString(serializer(), s)
        fun load(ctx: Context) = parse(ctx.assets.open("frame.json").bufferedReader().use { it.readText() })
    }
}
