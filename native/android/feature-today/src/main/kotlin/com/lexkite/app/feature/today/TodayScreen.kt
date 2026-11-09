package com.lexkite.app.feature.today

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.filled.RecordVoiceOver
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Style
import androidx.compose.material.icons.filled.TrackChanges
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.today.TodaySummary
import com.lexkite.app.design.CardShape
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPillButton
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LKProgress
import com.lexkite.app.design.LKSectionHeader
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKRadius
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey

/** Block types this build renders (AppSchema.CURRENT.blocks), in the starter order. */
val DEFAULT_BLOCKS = listOf("continue", "goal", "review", "streak")

/** Destinations Today can open – same names as the web hash routes (#/review, #/mistakes …), resolved by the app frame. */
object TodayRoutes { const val REVIEW = "review"; const val MISTAKES = "mistakes"; const val LISTEN = "listen"; const val SPEAK = "speak"; const val TRAIN = "train"
    const val LESSON = "lesson/go"; const val SEARCH = "search"; const val NOTIF = "notif"; const val ME = "me"; const val STREAK = "streak"; const val GOAL = "goal"; const val STATS = "stats" }

/**
 * P02 Today – the phone Today of web (web/js/st/v2/today.js, Stitch "Lexkite Kit" today-light/dark), same block order:
 * header · stats strip · teacher + focus bubble · continue hero · today's plan · review nudge · quick practice · 7-day streak.
 * Blocks without data are hidden exactly like web `data-show=0` (exam, league, stories and path arrive with their milestones).
 */
@Composable
fun TodayScreen(s: TodaySummary, lang: String, initial: String, onOpen: (String) -> Unit, onLanguage: () -> Unit, modifier: Modifier = Modifier,
                teacher: (@Composable () -> Unit)? = null, blocks: List<String> = DEFAULT_BLOCKS) {
    val c = LocalLKColors.current
    Column(modifier.fillMaxWidth().verticalScroll(rememberScrollState())) {
        Header(lang, initial, onOpen, onLanguage)
        Column(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter).padding(top = LKSpacing.spaceMd, bottom = LKSpacing.spaceLg), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd)) {
            Stats(s, onOpen)
            Teacher(s, teacher)
            // server-driven order (signed "today" config, spec §4) – only built-in components; unknown types were dropped by the reader
            val order = blocks.filter { it in DEFAULT_BLOCKS }.distinct().ifEmpty { DEFAULT_BLOCKS }
            for (b in order) when (b) {
                "continue" -> Hero(onOpen)
                "goal" -> Plan(s, onOpen)
                "review" -> if (s.due > 0) ReviewNudge(s, onOpen)
            }
            Quick(s, onOpen)
            if ("streak" in order) Week(s, onOpen)
        }
    }
}

@Composable
private fun Header(lang: String, initial: String, onOpen: (String) -> Unit, onLanguage: () -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).background(c.background).padding(horizontal = LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
        Text(t(L10nKey.appName), style = LKType.headlineMd.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f).padding(start = LKSpacing.space2xs).semantics { heading() })
        RoundIcon(Icons.Filled.Search, t(L10nKey.topSearch)) { onOpen(TodayRoutes.SEARCH) }
        RoundIcon(Icons.Filled.Notifications, t(L10nKey.topNotifications)) { onOpen(TodayRoutes.NOTIF) }
        // exactly one language switch per screen, in the top bar (DESIGN-SYSTEM §5d)
        Row(Modifier.heightIn(min = MinTap).padding(horizontal = LKSpacing.space2xs).clip(PillShape).background(c.card).border(2.dp, c.outlineVariant, PillShape)
            .tactile(onLanguage, t(L10nKey.topLanguage)).padding(horizontal = LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
            Icon(Icons.Filled.Language, null, tint = c.secondary, modifier = Modifier.size(16.dp))
            Text(lang.uppercase(), style = LKType.labelBadge.toCompose(), color = c.onSurface)
        }
        Box(Modifier.size(MinTap).clip(CircleShape).background(c.secondaryContainer).tactile({ onOpen(TodayRoutes.ME) }, t(L10nKey.meAccount)), contentAlignment = Alignment.Center) {
            Text(initial, style = LKType.titlePill.toCompose(), color = c.onSecondaryContainer)
        }
    }
}

@Composable
private fun RoundIcon(icon: ImageVector, label: String, onClick: () -> Unit) {
    val c = LocalLKColors.current
    IconButton(onClick = onClick, modifier = Modifier.size(48.dp)) {
        Box(Modifier.size(36.dp).clip(CircleShape).background(c.card).border(2.dp, c.outlineVariant, CircleShape), contentAlignment = Alignment.Center) {
            Icon(icon, label, tint = c.onSurface, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun Stats(s: TodaySummary, onOpen: (String) -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Tile(Icons.Filled.TrackChanges, c.primary, s.target.ifEmpty { "–" }, if (s.target.isEmpty()) t(L10nKey.todaySetGoal) else t(L10nKey.todayTarget), Modifier.weight(1f)) { onOpen(TodayRoutes.GOAL) }
        Tile(Icons.Filled.LocalFireDepartment, c.primaryContainer, t.num(s.streak), t(L10nKey.todayStreakDays), Modifier.weight(1f)) { onOpen(TodayRoutes.STREAK) }
        Tile(Icons.Filled.Star, c.star, t.num(s.xp), t(L10nKey.todayXp), Modifier.weight(1f)) { onOpen(TodayRoutes.STATS) }
        Tile(Icons.Filled.Bolt, c.secondary, "${t.num(minOf(s.reviewedToday, s.dailyGoal))}/${t.num(s.dailyGoal)}", t(L10nKey.todayDailyGoal), Modifier.weight(1f)) { onOpen(TodayRoutes.REVIEW) }
    }
}

@Composable
private fun Tile(icon: ImageVector, tint: Color, value: String, label: String, modifier: Modifier, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Column(modifier.clip(CardShape).background(c.card).border(2.dp, c.outlineVariant, CardShape).tactile(onClick, label).padding(vertical = LKSpacing.spaceSm, horizontal = LKSpacing.space2xs),
        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
        Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp))
        Text(value, style = LKType.headlineSm.toCompose(), color = c.onSurface, maxLines = 1)
        Text(label, style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant, textAlign = TextAlign.Center)
    }
}

@Composable
private fun Teacher(s: TodaySummary, teacher: (@Composable () -> Unit)?) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    val g = t(when (s.greeting) { TodaySummary.Greeting.MORNING -> L10nKey.todayMorning; TodaySummary.Greeting.AFTERNOON -> L10nKey.todayAfternoon; TodaySummary.Greeting.EVENING -> L10nKey.todayEvening })
    val say = if (s.due > 0) t(L10nKey.todaySayDue, mapOf("g" to g, "b" to s.due)) else t(L10nKey.todaySayDone, mapOf("g" to g))
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        // teacher slot (Stitch draws no people; the 2D Ama still is filled in by the app, grounded, no crop/halo)
        Box(Modifier.width(120.dp).then(if (teacher != null) Modifier.height(140.dp) else Modifier), contentAlignment = Alignment.BottomCenter) { teacher?.invoke() ?: Icon(Icons.Filled.School, null, tint = c.outlineVariant, modifier = Modifier.size(40.dp)) }
        Column(Modifier.weight(1f).clip(RoundedCornerShape(LKRadius.xl * 2)).background(c.card).border(2.dp, c.outlineVariant, RoundedCornerShape(LKRadius.xl * 2)).padding(LKSpacing.spaceSm),
            verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
            Text(t(L10nKey.todayFocus), style = LKType.labelBadge.toCompose(), color = c.secondary)
            val quoted = "“$say”"
            Text(quoted, style = LKType.bodyMd.toCompose(), color = c.onSurface)
        }
    }
}

@Composable
private fun Hero(onOpen: (String) -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    LKCard {
        Text(t(L10nKey.todayLesson), style = LKType.headlineLg.toCompose(), color = c.onSurface, modifier = Modifier.semantics { heading() })
        LKPrimaryButton(t(L10nKey.actionContinue), { onOpen(TodayRoutes.LESSON) }, Modifier.padding(top = LKSpacing.spaceXs)) {
            Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = c.onPrimary, modifier = Modifier.padding(start = LKSpacing.space2xs))
        }
    }
}

@Composable
private fun Plan(s: TodaySummary, onOpen: (String) -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    val reviewDone = s.reviewedToday >= s.dailyGoal
    LKCard {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(t(L10nKey.todayPlan), style = LKType.headlineSm.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f).semantics { heading() })
            val doneOf = t.num(if (reviewDone) 1 else 0) + "/" + t.num(1)
            Text(doneOf, style = LKType.labelMetric.toCompose(), color = c.secondary)
        }
        PlanRow(Icons.Filled.Style, t(L10nKey.todayReview), t(L10nKey.todayReviewCards, mapOf("a" to minOf(s.reviewedToday, s.dailyGoal), "b" to s.dailyGoal)), reviewDone) { onOpen(TodayRoutes.REVIEW) }
        LKProgress(s.goalPct / 100f, color = c.secondary, label = t(L10nKey.meProgress))
    }
}

@Composable
private fun PlanRow(icon: ImageVector, title: String, sub: String, done: Boolean, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).clip(RoundedCornerShape(LKRadius.xl)).tactile(onClick, title), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        Box(Modifier.size(40.dp).clip(CircleShape).background(if (done) c.success else c.secondaryContainer), contentAlignment = Alignment.Center) { Icon(icon, null, tint = c.onSecondaryContainer, modifier = Modifier.size(20.dp)) }
        Column(Modifier.weight(1f)) {
            Text(title, style = LKType.titlePill.toCompose(), color = c.onSurface)
            Text(sub, style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
        }
        Icon(Icons.AutoMirrored.Filled.KeyboardArrowRight, null, tint = c.onSurfaceVariant)
    }
}

@Composable
private fun ReviewNudge(s: TodaySummary, onOpen: (String) -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    Row(Modifier.fillMaxWidth().clip(CardShape).background(c.tertiaryContainer.copy(alpha = if (c.dark) 0.35f else 0.25f)).border(2.dp, c.tertiary, CardShape).padding(LKSpacing.spaceSm),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        Icon(Icons.Filled.Style, null, tint = c.onSurface, modifier = Modifier.size(28.dp))
        Column(Modifier.weight(1f)) {
            Text(t(L10nKey.todayFading, mapOf("n" to s.due)), style = LKType.titlePill.toCompose(), color = c.onSurface)
            Text(t(L10nKey.todayReviewNow, mapOf("m" to s.reviewMinutes)), style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
        }
        LKPillButton(t(L10nKey.todayReview), { onOpen(TodayRoutes.REVIEW) })
    }
}

@Composable
private fun Quick(s: TodaySummary, onOpen: (String) -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        LKSectionHeader(t(L10nKey.todayQuick), t(L10nKey.todayAllDrills)) { onOpen(TodayRoutes.TRAIN) }
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            QuickTile(Icons.Filled.ErrorOutline, c.error, t(L10nKey.todayMistakes), t(L10nKey.todayToFix, mapOf("n" to s.mistakes)), Modifier.weight(1f)) { onOpen(TodayRoutes.MISTAKES) }
            QuickTile(Icons.Filled.MenuBook, c.secondary, t(L10nKey.todayWords), t(L10nKey.todayDueN, mapOf("n" to s.due)), Modifier.weight(1f)) { onOpen(TodayRoutes.REVIEW) }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            QuickTile(Icons.Filled.Headphones, c.primary, t(L10nKey.todayListening), t(L10nKey.todayAudioSprint), Modifier.weight(1f)) { onOpen(TodayRoutes.LISTEN) }
            QuickTile(Icons.Filled.RecordVoiceOver, c.tertiary, t(L10nKey.todaySpeaking), t(L10nKey.todayPronDrill), Modifier.weight(1f)) { onOpen(TodayRoutes.SPEAK) }
        }
    }
}

@Composable
private fun QuickTile(icon: ImageVector, tint: Color, title: String, sub: String, modifier: Modifier, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Column(modifier.heightIn(min = 112.dp).clip(CardShape).background(c.card).border(2.dp, c.outlineVariant, CardShape).tactile(onClick, title).padding(LKSpacing.spaceSm),
        verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Box(Modifier.size(40.dp).clip(RoundedCornerShape(LKRadius.xl)).background(c.cardHigh), contentAlignment = Alignment.Center) { Icon(icon, null, tint = tint, modifier = Modifier.size(22.dp)) }
        Spacer(Modifier.weight(1f, fill = false))
        Text(title, style = LKType.titlePill.toCompose(), color = c.onSurface)
        Text(sub, style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
    }
}

@Composable
private fun Week(s: TodaySummary, onOpen: (String) -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current
    val narrow = android.icu.text.SimpleDateFormat("EEEEE", t.locale); val full = android.icu.text.SimpleDateFormat("EEEE", t.locale)
    LKCard(onClick = { onOpen(TodayRoutes.STREAK) }, label = t(L10nKey.todayWeek)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(t(L10nKey.todayWeek), style = LKType.titlePill.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f))
            val weekOf = t.num(s.weekDone) + "/" + t.num(7)
            Text(weekOf, style = LKType.labelMetric.toCompose(), color = c.primary)
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            for (d in s.week) {
                val cal = android.icu.util.Calendar.getInstance().apply { set(android.icu.util.Calendar.DAY_OF_WEEK, d.dayOfWeek) }
                Column(Modifier.widthIn(min = 36.dp).clearAndSetSemantics { contentDescription = full.format(cal.time) + if (d.on) " ✓" else "" }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
                    Text(narrow.format(cal.time), style = LKType.labelBadge.toCompose(), color = if (d.today) c.primary else c.onSurfaceVariant)
                    Box(Modifier.size(32.dp).aspectRatio(1f).clip(CircleShape).background(if (d.on) c.primaryContainer else c.cardHigh).then(if (d.today) Modifier.border(2.dp, c.primary, CircleShape) else Modifier), contentAlignment = Alignment.Center) {
                        if (d.on) Text("✓", style = LKType.labelMetric.toCompose(), color = c.onPrimary) else if (d.today) Icon(Icons.Filled.Bolt, null, tint = c.primary, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }
    }
}
