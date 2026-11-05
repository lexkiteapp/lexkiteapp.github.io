package com.lexkite.app.design

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import com.lexkite.app.design.generated.LKColorDark
import com.lexkite.app.design.generated.LKColorLight
import com.lexkite.app.design.generated.LKTextStyle
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/** Resolved colour roles for the current theme (light = Bright Day, dark = Tactile Night), from generated tokens only. */
data class LKColors(val primary: Color, val onPrimary: Color, val background: Color, val onSurface: Color, val onSurfaceVariant: Color, val card: Color) {
    companion object {
        val light = LKColors(LKColorLight.primary, LKColorLight.onPrimary, LKColorLight.background, LKColorLight.onSurface, LKColorLight.onSurfaceVariant, LKColorLight.surfaceContainerLowest)
        val dark = LKColors(LKColorDark.primary, LKColorDark.onPrimary, LKColorDark.background, LKColorDark.onSurface, LKColorDark.onSurfaceVariant, LKColorDark.surfaceContainerLowest)
    }
}

val LocalLKColors = staticCompositionLocalOf { LKColors.light }

fun LKTextStyle.toCompose(): TextStyle = TextStyle(fontSize = size, lineHeight = lineHeight, fontWeight = FontWeight(weight), letterSpacing = trackingEm.em)

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
