package com.lexkite.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.LKProgress
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey

sealed interface TopBarVariant { data object Hub : TopBarVariant; data object Inner : TopBarVariant; data class Focus(val progress: Float, val track: androidx.compose.ui.graphics.Color? = null) : TopBarVariant }

/** The three fixed top-bar variants (DESIGN-SYSTEM §5d). Back/X = 48 dp (≥ 44); system back runs the same `onExit`
 *  (which may confirm softly when progress would be lost) – never traps the learner. */
@Composable
fun TopBar(variant: TopBarVariant, title: String, t: L10n, onExit: (() -> Unit)? = null) {
    val c = LocalLKColors.current
    if (variant != TopBarVariant.Hub && onExit != null) BackHandler(onBack = onExit)
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        when (variant) {
            TopBarVariant.Hub -> Text(title, style = LKType.headlineMd.toCompose(), color = c.onSurface, modifier = Modifier.padding(horizontal = LKSpacing.spaceXs).semantics { heading() })
            TopBarVariant.Inner -> {
                IconButton(onClick = { onExit?.invoke() }, modifier = Modifier.size(48.dp).testTag(EXIT_TAG)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, t(L10nKey.actionBack), tint = c.onSurface) }
                Text(title, style = LKType.headlineSm.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f).semantics { heading() })
            }
            is TopBarVariant.Focus -> {
                IconButton(onClick = { onExit?.invoke() }, modifier = Modifier.size(48.dp).testTag(EXIT_TAG)) { Icon(Icons.Filled.Close, t(L10nKey.actionClose), tint = c.onSurface) }
                LKProgress(variant.progress, Modifier.weight(1f).padding(end = LKSpacing.spaceXs), label = title, track = variant.track ?: LocalLKColors.current.cardHigh)
            }
        }
    }
}

const val EXIT_TAG = "lk-exit"

/** Inner/focus screen shell (lesson, review, word …): no tabs, Back/X top-start (mirrored in RTL), system Back = same exit. */
@Composable
fun LKScreen(variant: TopBarVariant, title: String, t: L10n, onExit: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(variant, title, t, onExit)
        Column(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter), content = content)
    }
}
