package com.lexkite.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.LKColors
import com.lexkite.app.design.LKFrame
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKRadius
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey

private val ICONS = mapOf("Home" to Icons.Filled.Home, "MenuBook" to Icons.Filled.MenuBook, "TrackChanges" to Icons.Filled.TrackChanges, "Flag" to Icons.Filled.Flag, "Person" to Icons.Filled.Person)
private fun key(id: String) = L10nKey.entries.first { it.id == id }

/** Root of the native app: the ONE app frame – 5 tabs Today · Vocab · Skills · Tests · Me (generated from web). */
@Composable
fun AppShell(t: L10n, frame: LKFrame = LKFrame.load(LocalContext.current), dark: Boolean = isSystemInDarkTheme(), initialTab: String = "home") {
    val c = if (dark) LKColors.dark else LKColors.light
    var tab by rememberSaveable { mutableStateOf(initialTab) }
    CompositionLocalProvider(LocalLKColors provides c, LocalLayoutDirection provides if (t.isRtl) LayoutDirection.Rtl else LayoutDirection.Ltr) {
        Scaffold(
            containerColor = c.background,
            bottomBar = {
                NavigationBar(containerColor = c.card) {
                    frame.tabs.forEach { tb ->
                        val label = t(key(tb.label))
                        NavigationBarItem(
                            selected = tab == tb.k, onClick = { tab = tb.k },
                            icon = { Icon(ICONS.getValue(tb.compose), contentDescription = null) },
                            label = { Text(label) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = c.primary, selectedTextColor = c.primary, unselectedIconColor = c.onSurfaceVariant, unselectedTextColor = c.onSurfaceVariant),
                        )
                    }
                }
            },
        ) { pad ->
            val cur = frame.tabs.first { it.k == tab }
            Column(Modifier.fillMaxSize().padding(pad).background(c.background)) {
                TopBar(TopBarVariant.Hub, t(key(cur.label)), t)
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.TopCenter) {
                    Column(Modifier.widthIn(max = frame.width.dp).fillMaxWidth().padding(horizontal = frame.gutter.dp).padding(top = LKSpacing.spaceLg),
                        verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd)) {
                        if (cur.k == "home") TodayCard(t, frame)
                    }
                }
            }
        }
    }
}

@Composable
fun TodayCard(t: L10n, frame: LKFrame) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxWidth().background(c.card, RoundedCornerShape(LKRadius.xl * 2)).padding(LKSpacing.spaceMd), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        Text(t(L10nKey.todayGoal), style = LKType.headlineSm.toCompose(), color = c.onSurface)
        Text(t(L10nKey.todayStreak), style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant)
        Button(onClick = {}, modifier = Modifier.fillMaxWidth().heightIn(min = frame.minTap.dp), shape = RoundedCornerShape(LKRadius.xl),
            colors = ButtonDefaults.buttonColors(containerColor = c.primary, contentColor = c.onPrimary)) {
            Text(t(L10nKey.actionContinue), style = LKType.titlePill.toCompose())
        }
    }
}
