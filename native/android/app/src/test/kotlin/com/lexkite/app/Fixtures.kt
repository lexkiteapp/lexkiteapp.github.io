package com.lexkite.app

import androidx.compose.runtime.Composable
import com.lexkite.app.core.today.TodaySummary
import com.lexkite.app.design.LKFrame
import com.lexkite.app.design.LKTheme
import com.lexkite.app.feature.today.TodayScreen
import com.lexkite.app.i18n.L10n
import com.lexkite.app.ui.AppShell
import com.lexkite.app.ui.ShellSlots
import java.io.File

/** Deterministic inputs for UI tests and snapshots (no DB, no network, fixed numbers). */
object Fixtures {
    val gen = File("../../shared/gen")
    val frame: LKFrame by lazy { LKFrame.parse(File(gen, "frame.json").readText()) }
    private val en by lazy { L10n.parse(File(gen, "strings/en.json").readText()) }
    private val vi by lazy { L10n.parse(File(gen, "strings/vi.json").readText()) }
    fun t(lang: String) = L10n(lang, L10n.parse(File(gen, "strings/$lang.json").readText()), if (lang == "en") emptyMap() else en, vi)

    val today = TodaySummary(
        target = "6.5", streak = 3, xp = 220, reviewedToday = 12, dailyGoal = 20, due = 8, mistakes = 5,
        week = listOf(2, 3, 4, 5, 6, 7, 1).mapIndexed { i, dow -> TodaySummary.Day("2026-03-0${i + 2}", i < 3, i == 2, dow) },
        greeting = TodaySummary.Greeting.MORNING,
    )

    @Composable
    fun Shell(lang: String, dark: Boolean, initialTab: String = "home", onOpen: (String) -> Unit = {}) {
        val t = t(lang)
        LKTheme(t, dark) {
            AppShell(t, frame, ShellSlots(today = { open -> TodayScreen(today, lang, "L", { onOpen(it); open(it) }, {}) }, me = {}), initialTab = initialTab)
        }
    }
}
