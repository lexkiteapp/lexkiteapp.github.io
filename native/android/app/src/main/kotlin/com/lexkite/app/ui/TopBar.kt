package com.lexkite.app.ui

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey

sealed interface TopBarVariant { data object Hub : TopBarVariant; data object Inner : TopBarVariant; data class Focus(val progress: Float) : TopBarVariant }

/** The three fixed top-bar variants (DESIGN-SYSTEM §5d). Back/X ≥ 44 dp; system back runs the same `onExit`
 *  (which may confirm softly when progress would be lost) – never traps the learner. */
@Composable
fun TopBar(variant: TopBarVariant, title: String, t: L10n, onExit: (() -> Unit)? = null) {
    val c = LocalLKColors.current
    if (variant != TopBarVariant.Hub && onExit != null) BackHandler(onBack = onExit)
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = 16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        when (variant) {
            TopBarVariant.Hub -> Text(title, style = LKType.headlineMd.toCompose(), color = c.onSurface, modifier = Modifier.semantics { heading() })
            TopBarVariant.Inner -> {
                IconButton(onClick = { onExit?.invoke() }, modifier = Modifier.size(48.dp)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, t(L10nKey.actionBack), tint = c.onSurface) }
                Text(title, style = LKType.headlineSm.toCompose(), color = c.onSurface, modifier = Modifier.semantics { heading() })
            }
            is TopBarVariant.Focus -> {
                IconButton(onClick = { onExit?.invoke() }, modifier = Modifier.size(48.dp)) { Icon(Icons.Filled.Close, t(L10nKey.actionClose), tint = c.onSurface) }
                LinearProgressIndicator(progress = { variant.progress }, color = c.primary, modifier = Modifier.weight(1f))
            }
        }
    }
}
