package com.lexkite.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Flag
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.navigation
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.lexkite.app.core.link.DeepLink
import com.lexkite.app.design.LKAnim
import com.lexkite.app.design.LKFrame
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.LocalReduceMotion
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.i18n.generated.L10nLangs
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut

private val ICONS = mapOf("Home" to Icons.Filled.Home, "MenuBook" to Icons.Filled.MenuBook, "TrackChanges" to Icons.Filled.TrackChanges, "Flag" to Icons.Filled.Flag, "Person" to Icons.Filled.Person)
fun l10nKey(id: String) = L10nKey.entries.first { it.id == id }

/** Screens the frame hosts (real ones from MainActivity; fixed ones in snapshot tests). `open` takes a web hash route name. */
class ShellSlots(
    val today: @Composable (open: (String) -> Unit) -> Unit,
    val me: @Composable () -> Unit,
)

/** Focus destinations reachable in M1 (their players land in M2–M4; the frame, X and Back already work). */
private val FOCUS = setOf("lesson", "review", "mistakes", "listen", "speak")
private fun focusTitle(kind: String) = when (kind) { "review" -> L10nKey.todayReview; "mistakes" -> L10nKey.todayMistakes; "listen" -> L10nKey.todayListening; "speak" -> L10nKey.todaySpeaking; else -> L10nKey.todayLesson }

/** Route helpers – one nested graph per tab (state kept when switching tabs), focus screens above the tabs. */
object Routes {
    fun graph(tab: String) = "tab/$tab"
    fun hub(tab: String) = "$tab/hub"
    const val WORD = "vocab/word/{w}"
    fun word(w: String) = "vocab/word/" + android.net.Uri.encode(w)
    const val FOCUS_R = "focus/{kind}"
    fun focus(kind: String) = "focus/$kind"
}

/** Opens a web-style route or a parsed deep link inside the frame (C08). */
fun NavHostController.open(link: DeepLink) {
    val route = link.route
    when {
        route == "word" && link.arg.isNotEmpty() -> { selectTab(link.tab); navigate(Routes.word(link.arg)) }
        route in FOCUS -> navigate(Routes.focus(route)) { launchSingleTop = true }
        else -> selectTab(link.tab)
    }
}
fun NavHostController.selectTab(tab: String) = navigate(Routes.graph(tab)) {
    popUpTo(graph.findStartDestination().id) { saveState = true }
    launchSingleTop = true; restoreState = true
}

/** P01 – the ONE app frame: 5 tabs Today · Vocab · Skills · Tests · Me (generated frame.json), 390 dp column, hub tabs only on hubs. */
@Composable
fun AppShell(t: L10n, frame: LKFrame, slots: ShellSlots, initialTab: String = "home", link: DeepLink? = null, onLinkHandled: () -> Unit = {},
             nav: NavHostController = rememberNavController()) {
    val c = LocalLKColors.current
    val reduce = LocalReduceMotion.current
    val entry by nav.currentBackStackEntryAsState()
    val dest = entry?.destination
    val onHub = dest?.route?.endsWith("/hub") ?: true
    LaunchedEffect(link, entry != null) { if (link != null && entry != null) { nav.open(link); onLinkHandled() } }
    Scaffold(
        containerColor = c.background,
        bottomBar = {
            // Stitch today-*.html <nav>: own surface (bg-white = surface-container-high) + 2 px cream top border; active tab = teal pill
            if (onHub) Column {
                Box(Modifier.fillMaxWidth().height(2.dp).background(c.outlineVariant))
                NavigationBar(containerColor = c.cardHigh, contentColor = c.onSurface) {
                frame.tabs.forEach { tb ->
                    val selected = dest?.hierarchy?.any { it.route == Routes.graph(tb.k) } ?: (tb.k == initialTab)
                    NavigationBarItem(
                        selected = selected, onClick = { nav.selectTab(tb.k) },
                        icon = { Icon(ICONS.getValue(tb.compose), contentDescription = null) },
                        label = { Text(t(l10nKey(tb.label)), style = LKType.labelBadge.toCompose()) },
                        modifier = Modifier.testTag("tab-${tb.k}"),
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = c.secondary, selectedTextColor = c.secondary, indicatorColor = c.secondaryContainer.copy(alpha = 0.22f),
                            unselectedIconColor = c.onSurfaceVariant, unselectedTextColor = c.onSurfaceVariant,
                        ),
                    )
                }
                }
            }
        },
    ) { pad ->
        Box(Modifier.fillMaxSize().padding(pad).background(c.background), contentAlignment = Alignment.TopCenter) {
            Box(Modifier.widthIn(max = frame.width.dp).fillMaxWidth()) {
                NavHost(nav, startDestination = Routes.graph(initialTab),
                    enterTransition = { fadeIn(LKAnim.spec(reduce)) }, exitTransition = { fadeOut(LKAnim.spec(reduce)) }) {
                    for (tb in frame.tabs) navigation(startDestination = Routes.hub(tb.k), route = Routes.graph(tb.k)) {
                        composable(Routes.hub(tb.k)) {
                            when (tb.k) {
                                "home" -> slots.today { r -> nav.open(DeepLink.parse("lexkite://$r") ?: DeepLink(DeepLink.HOME)) }
                                "me" -> Column { TopBar(TopBarVariant.Hub, t(l10nKey(tb.label)), t); slots.me() }
                                else -> Hub(t, t(l10nKey(tb.label)))
                            }
                        }
                        if (tb.k == "vocab") composable(Routes.WORD, arguments = listOf(navArgument("w") { type = NavType.StringType })) { e ->
                            LKScreen(TopBarVariant.Inner, e.arguments?.getString("w").orEmpty(), t, onExit = { nav.popBackStack() }) {}
                        }
                    }
                    composable(Routes.FOCUS_R, arguments = listOf(navArgument("kind") { type = NavType.StringType })) { e ->
                        val kind = e.arguments?.getString("kind").orEmpty()
                        LKScreen(TopBarVariant.Focus(0f), t(focusTitle(kind)), t, onExit = { nav.popBackStack() }) {}
                    }
                }
            }
        }
    }
}

/** Hub of a tab whose content arrives in a later milestone (Vocab M3, Skills M4, Tests M5): hub top bar, tabs visible. */
@Composable
private fun Hub(t: L10n, title: String) {
    Column(Modifier.fillMaxSize()) { TopBar(TopBarVariant.Hub, title, t) }
}

/** The one language switch (Today top bar): 15 UI languages, each in its own name. */
@Composable
fun LanguageDialog(t: L10n, onPick: (String) -> Unit, onDismiss: () -> Unit) {
    val c = LocalLKColors.current
    AlertDialog(
        onDismissRequest = onDismiss, containerColor = c.card,
        title = { Text(t(L10nKey.topLanguage), style = LKType.headlineSm.toCompose(), color = c.onSurface) },
        text = {
            LazyColumn {
                items(L10nLangs.ALL) { l ->
                    TextButton(onClick = { onPick(l) }, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                        Text(t.nativeName(l), style = LKType.bodyLg.toCompose(), color = if (l == t.lang) c.primary else c.onSurface, modifier = Modifier.fillMaxWidth().padding(horizontal = LKSpacing.spaceXs))
                    }
                }
            }
        },
        confirmButton = { TextButton(onClick = onDismiss, modifier = Modifier.heightIn(min = 48.dp)) { Text(t(L10nKey.actionClose), color = c.secondary) } },
    )
}
