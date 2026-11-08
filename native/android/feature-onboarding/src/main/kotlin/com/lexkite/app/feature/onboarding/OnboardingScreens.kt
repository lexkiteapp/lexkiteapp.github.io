package com.lexkite.app.feature.onboarding

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Business
import androidx.compose.material.icons.filled.Chat
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Explore
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.Schedule
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Work
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.listSaver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.animation.core.animateFloat
import com.lexkite.app.design.CardShape
import com.lexkite.app.design.LKAnim
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LKProgress
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.LocalReduceMotion
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.i18n.generated.L10nLangs

const val TAG_BACK = "onb-back"
const val TAG_SKIP = "onb-skip"
const val TAG_NEXT = "onb-next"
const val TAG_HAVE_ACCOUNT = "onb-have-account"
fun tagStep(s: OnbStep) = "onb-step-" + s.name.lowercase()

private val ChoiceSaver = listSaver<OnbChoice, Any>(
    save = { listOf(it.lang ?: "", it.track, it.variant, it.level, it.pace) },
    restore = { OnbChoice((it[0] as String).ifEmpty { null }, it[1] as String, it[2] as String, it[3] as String, it[4] as Int) },
)

/**
 * C17 – the whole first-run flow after the brand splash: Welcome → native language → goal → level → daily time → Ready.
 * One thing per screen, one primary button, progress bar, Back on every screen but the first (there the system Back leaves the app),
 * Skip on every screen but Ready. No ads, no popups, no permission prompt (notifications are asked after the first lesson).
 * Everything is local: nothing here waits for the network. [onFinish] gets the choices (null = whole setup skipped) and how it ended.
 */
@Composable
fun OnboardingFlow(
    t: L10n, currentLang: String, onLang: (String) -> Unit, onFinish: (OnbChoice?, OnbExit) -> Unit,
    teacher: @Composable (pose: String) -> Unit, columnWidth: Dp = 390.dp, initial: OnbStep = OnbStep.WELCOME, initialChoice: OnbChoice = OnbChoice(),
) {
    val reduce = LocalReduceMotion.current
    var stepName by rememberSaveable { mutableStateOf(initial.name) }
    var choice by rememberSaveable(stateSaver = ChoiceSaver) { mutableStateOf(initialChoice) }
    var said by rememberSaveable { mutableStateOf("") }
    val step = OnbStep.valueOf(stepName)
    fun go(s: OnbStep?) { if (s != null) { stepName = s.name; said = "" } }
    BackHandler(enabled = OnbFlow.back(step) != null) { go(OnbFlow.back(step)) }

    val onBack: (() -> Unit)? = if (OnbFlow.back(step) != null) ({ go(OnbFlow.back(step)) }) else null
    val onSkip: (() -> Unit)? = if (!OnbFlow.canSkip(step)) null else if (step == OnbStep.WELCOME) ({ onFinish(null, OnbExit.SKIP_ALL) }) else ({ go(OnbFlow.skip(step)) })
    val next = { if (step == OnbStep.READY) onFinish(choice, OnbExit.START) else go(OnbFlow.next(step)) }

    AnimatedContent(step, transitionSpec = { fadeIn(LKAnim.spec(reduce)) togetherWith fadeOut(LKAnim.spec(reduce)) }, label = "onb") { s ->
        val k = Chrome(t, s, columnWidth, onBack, onSkip)
        when (s) {
            OnbStep.WELCOME -> WelcomeStep(k, teacher, next) { onFinish(null, OnbExit.HAVE_ACCOUNT) }
            OnbStep.LANGUAGE -> LanguageStep(k, choice.lang ?: currentLang, next) { l -> choice = choice.copy(lang = l); onLang(l) }
            OnbStep.GOAL -> GoalStep(k, choice, said == "goal", teacher, next) { choice = it; said = "goal" }
            OnbStep.LEVEL -> LevelStep(k, choice, said == "level", teacher, next) { choice = it; said = "level" }
            OnbStep.PACE -> PaceStep(k, choice, said == "pace", teacher, next) { choice = it; said = "pace" }
            OnbStep.READY -> ReadyStep(k, choice, teacher, next)
        }
    }
}

/** What every screen shares: strings, which step, column width and the Back / Skip actions (null = not shown). */
private class Chrome(val t: L10n, val step: OnbStep, val width: Dp, val onBack: (() -> Unit)?, val onSkip: (() -> Unit)?)

/** Shared screen: header (Back, progress, n/5, Skip), scrolling body, pinned footer with the single primary action. */
@Composable
private fun StepFrame(k: Chrome, footer: @Composable ColumnScope.() -> Unit, body: @Composable ColumnScope.() -> Unit) {
    val c = LocalLKColors.current
    val t = k.t
    Box(Modifier.fillMaxSize().background(c.background).safeDrawingPadding().testTag(tagStep(k.step)), contentAlignment = Alignment.TopCenter) {
        Column(Modifier.widthIn(max = k.width).fillMaxSize()) {
            Row(Modifier.fillMaxWidth().heightIn(min = 56.dp).padding(horizontal = LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                if (k.onBack != null) IconButton(onClick = k.onBack, modifier = Modifier.size(48.dp).testTag(TAG_BACK)) { Icon(Icons.AutoMirrored.Filled.ArrowBack, t(L10nKey.actionBack), tint = c.onSurface) } else Spacer(Modifier.size(48.dp))
                if (OnbFlow.stepNo(k.step) > 0) {
                    LKProgress(OnbFlow.fraction(k.step), Modifier.weight(1f), color = c.secondary, label = t(L10nKey.meProgress), track = c.outlineVariant)   // Stitch onb-*.html + iOS OnbProgress: teal step bar
                    Text("\u2066" + t.num(OnbFlow.stepNo(k.step)) + " / " + t.num(OnbFlow.TOTAL) + "\u2069", style = LKType.labelBadge.toCompose(), color = c.onSurfaceVariant)
                } else Spacer(Modifier.weight(1f))
                if (k.onSkip != null) Box(Modifier.heightIn(min = 48.dp).testTag(TAG_SKIP).tactile(k.onSkip).padding(horizontal = LKSpacing.spaceSm), contentAlignment = Alignment.Center) {
                    Text(t(L10nKey.onbCommonSkip), style = LKType.labelMetric.toCompose(), color = c.secondary)
                }
            }
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), content = body)
            Column(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceMd), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), horizontalAlignment = Alignment.CenterHorizontally, content = footer)
        }
    }
}

@Composable
private fun NextButton(text: String, onClick: () -> Unit) = LKPrimaryButton(text, onClick, Modifier.testTag(TAG_NEXT))

@Composable
private fun FreeNote(t: L10n) = Text(t(L10nKey.onbFree), style = LKType.labelBadge.toCompose(), color = LocalLKColors.current.onSurfaceVariant, textAlign = TextAlign.Center)

// ---------------------------------------------------------------- splash + Welcome

/** The brand mark: the EXACT shipped logo (design/src/main/res/drawable/lk_logo_mark.xml, generated by scripts/native/gen.mjs from brand/lexkite-mark.svg). Never redrawn or recoloured here. */
@Composable
fun BrandMark(modifier: Modifier = Modifier) {
    Image(painterResource(com.lexkite.app.design.R.drawable.lk_logo_mark), contentDescription = null, modifier = modifier.aspectRatio(1f))
}

/** Step 1 – brand screen shown while the app decides where to go (local only, never waits for the network). Same background as the system splash.
 *  Stitch splash-*.html: mark + wordmark + tagline sit 48 dp above the middle, a 3 dp indeterminate bar rests 48 dp from the bottom (static when motion is reduced). */
@Composable
fun BrandSplash(t: L10n) {
    val c = LocalLKColors.current
    val reduce = LocalReduceMotion.current
    Box(Modifier.fillMaxSize().background(c.background)) {
        Column(Modifier.align(Alignment.Center).offset(y = (-48).dp), horizontalAlignment = Alignment.CenterHorizontally) {
            BrandMark(Modifier.size(96.dp))
            Spacer(Modifier.height(LKSpacing.spaceMd))
            Text(t(L10nKey.appName), style = LKType.headlineLg.toCompose(), color = c.onSurface)
            Spacer(Modifier.height(LKSpacing.spaceXs))
            Text(t(L10nKey.onbFree), style = LKType.bodyMd.toCompose().copy(fontWeight = FontWeight.SemiBold), color = c.onSurfaceVariant, textAlign = TextAlign.Center, modifier = Modifier.padding(horizontal = LKSpacing.spaceLg))
        }
        val x = if (reduce) 0.35f else rememberInfiniteTransition(label = "splash").animateFloat(0f, 1f, infiniteRepeatable(tween(1400, easing = LKAnim.ease), RepeatMode.Restart), label = "bar").value
        Box(Modifier.align(Alignment.BottomCenter).padding(horizontal = 48.dp).padding(bottom = 48.dp).fillMaxWidth().height(3.dp).clip(CircleShape).background(c.outlineVariant)) {
            BoxWithConstraints(Modifier.fillMaxSize()) {
                val w = maxWidth * 0.35f
                Box(Modifier.offset(x = (maxWidth + w) * (if (reduce) 0.325f else x) - w).width(w).fillMaxHeight().clip(CircleShape).background(c.secondary))
            }
        }
    }
}

@Composable
private fun WelcomeStep(k: Chrome, teacher: @Composable (String) -> Unit, onStart: () -> Unit, onHaveAccount: () -> Unit) {
    val c = LocalLKColors.current
    val t = k.t
    StepFrame(k, footer = {
        NextButton(t(L10nKey.onbWelcomeStart), onStart)
        Box(Modifier.heightIn(min = 48.dp).testTag(TAG_HAVE_ACCOUNT).tactile(onHaveAccount).padding(horizontal = LKSpacing.spaceMd), contentAlignment = Alignment.Center) {
            Text(t(L10nKey.onbWelcomeHaveAccount), style = LKType.labelMetric.toCompose(), color = c.secondary)
        }
        FreeNote(t)
    }) {
        Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            BrandMark(Modifier.size(56.dp))
            Text(t(L10nKey.onbWelcomeKicker), style = LKType.labelBadge.toCompose(), color = c.secondary, textAlign = TextAlign.Center)
            Text(t(L10nKey.onbWelcomeH1a) + "\n" + t(L10nKey.onbWelcomeH1b), style = LKType.displayHeroMobile.toCompose(), color = c.onSurface, textAlign = TextAlign.Center, modifier = Modifier.semantics { heading() })
            Box(Modifier.width(140.dp).height(170.dp)) { teacher("happy") }
            Text(t(L10nKey.onbWelcomeLead), style = LKType.bodyLg.toCompose(), color = c.onSurfaceVariant, textAlign = TextAlign.Center)
        }
    }
}

// ---------------------------------------------------------------- native language

/** Searchable list of the 15 UI languages, each in its own name; picking one switches the app language at once (live preview). */
@Composable
private fun LanguageStep(k: Chrome, selected: String, onNext: () -> Unit, onPick: (String) -> Unit) {
    val c = LocalLKColors.current
    val t = k.t
    var q by rememberSaveable { mutableStateOf("") }
    StepFrame(k, footer = { NextButton(t(L10nKey.actionContinue), onNext) }) {
        Text(t(L10nKey.onbLangTitle), style = LKType.headlineMd.toCompose(), color = c.onSurface, modifier = Modifier.semantics { heading() })
        Text(t(L10nKey.onbLangSub), style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant)
        BasicTextField(
            value = q, onValueChange = { q = it }, singleLine = true,
            textStyle = LKType.bodyLg.toCompose().copy(color = c.onSurface), cursorBrush = SolidColor(c.primary),
            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp).clip(PillShape).background(c.card).border(2.dp, c.outlineVariant, PillShape).padding(horizontal = LKSpacing.spaceMd).testTag("onb-lang-search"),
            decorationBox = { inner ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    Icon(Icons.Filled.Search, null, tint = c.onSurfaceVariant)
                    Box(Modifier.weight(1f).heightIn(min = 48.dp), contentAlignment = Alignment.CenterStart) {
                        if (q.isEmpty()) Text(t(L10nKey.onbLangSearch), style = LKType.bodyLg.toCompose(), color = c.onSurfaceVariant)
                        inner()
                    }
                }
            },
        )
        val shown = L10nLangs.ALL.filter { q.isBlank() || t.nativeName(it).contains(q.trim(), ignoreCase = true) || it.startsWith(q.trim(), ignoreCase = true) }
        for (l in shown) ChoiceCard(l == selected, "onb-lang-$l", null, t.nativeName(l), null, { onPick(l) })   // same tactile radio card as every step (Stitch onb-*.html, iOS)
    }
}

// ---------------------------------------------------------------- shared pieces

/** Teacher still next to a speech bubble: question (heading) + Ama's line (polite live region), as the #608 frames. */
@Composable
private fun Coach(q: String, say: String, teacher: @Composable (String) -> Unit, pose: String) {
    val c = LocalLKColors.current
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
        Box(Modifier.width(110.dp).height(140.dp)) { teacher(pose) }
        Column(Modifier.weight(1f).clip(CardShape).background(c.card).border(2.dp, c.outlineVariant, CardShape).padding(LKSpacing.spaceMd), verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) {
            Text(q, style = LKType.headlineSm.toCompose(), color = c.onSurface, modifier = Modifier.semantics { heading() })
            Text(say, style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant, modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite })
        }
    }
}

/** One option (radio semantics): tactile card with lip, icon capsule, title + subtitle, check badge; the selected one is outlined in secondary (teal), as Stitch onb-*.html and iOS OnbChoiceRow. */
@Composable
private fun ChoiceCard(on: Boolean, tag: String, icon: ImageVector?, title: String, sub: String?, onClick: () -> Unit, lead: (@Composable () -> Unit)? = null) {
    val c = LocalLKColors.current
    Box(Modifier.fillMaxWidth().testTag(tag).semantics { selected = on }.tactile(onClick, role = Role.RadioButton)) {
        Box(Modifier.matchParentSize().offset(y = 3.dp).background(if (on) c.secondary else c.outlineVariant, CardShape))
        Row(Modifier.fillMaxWidth().heightIn(min = 64.dp).clip(CardShape).background(c.card).background(if (on) c.secondary.copy(alpha = 0.16f) else Color.Transparent).border(2.dp, if (on) c.secondary else c.outlineVariant, CardShape).padding(LKSpacing.spaceSm),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            if (lead != null) lead() else if (icon != null) Box(Modifier.size(48.dp).clip(CardShape).background(c.secondaryContainer), contentAlignment = Alignment.Center) { Icon(icon, null, tint = c.onSecondaryContainer) }
            Column(Modifier.weight(1f)) {
                Text(title, style = LKType.headlineSm.toCompose(), color = c.onSurface)
                if (sub != null) Text(sub, style = LKType.bodyMd.toCompose(), color = c.onSurfaceVariant)
            }
            Box(Modifier.size(28.dp).clip(CircleShape).background(if (on) c.secondary else Color.Transparent).border(2.dp, if (on) c.secondary else c.outline, CircleShape), contentAlignment = Alignment.Center) {
                if (on) Icon(Icons.Filled.Check, null, tint = c.onSecondary, modifier = Modifier.size(16.dp))
            }
        }
    }
}

private fun trackIcon(id: String) = when (id) { "comm" -> Icons.Filled.Chat; "ielts" -> Icons.Filled.MenuBook; "toeic" -> Icons.Filled.Work; "toefl" -> Icons.Filled.School; else -> Icons.Filled.Business }
private fun stageLabel(track: OnbTrack, s: OnbStage) = if (track.id == "ielts") s.cefr else "CEFR " + s.cefr

// ---------------------------------------------------------------- goal

@Composable
private fun GoalStep(k: Chrome, choice: OnbChoice, fresh: Boolean, teacher: @Composable (String) -> Unit, onNext: () -> Unit, onChange: (OnbChoice) -> Unit) {
    val c = LocalLKColors.current
    val t = k.t
    StepFrame(k, footer = { NextButton(t(L10nKey.actionContinue), onNext); Text(t(L10nKey.onbGoalSub), style = LKType.labelBadge.toCompose(), color = c.onSurfaceVariant, textAlign = TextAlign.Center) }) {
        Coach(t(L10nKey.onbGoalQ), if (fresh) t(L10nKey.onbSayGoalPick, mapOf("name" to choice.trackDef.name(t))) else t(L10nKey.onbWelcomeHello), teacher, if (fresh) "cheer" else "point")
        for (tr in OnbTracks.all) {
            val on = tr.id == choice.track
            ChoiceCard(on, "onb-track-${tr.id}", trackIcon(tr.id), tr.name(t), tr.sub(t), { if (!on) onChange(choice.copy(track = tr.id, variant = "", level = "")) })
            if (on && tr.variants.isNotEmpty()) Row(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.spaceXs), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                val cur = choice.variant.ifEmpty { tr.variants.first().id }
                for (v in tr.variants) {
                    val vOn = v.id == cur
                    Box(Modifier.heightIn(min = 44.dp).testTag("onb-variant-${v.id}").semantics { selected = vOn }.clip(PillShape).background(if (vOn) c.primaryContainer else c.card).border(2.dp, if (vOn) c.primaryContainer else c.outlineVariant, PillShape).tactile({ onChange(choice.copy(variant = v.id)) }, role = Role.RadioButton).padding(horizontal = LKSpacing.spaceMd), contentAlignment = Alignment.Center) {
                        Text(v.label, style = LKType.labelMetric.toCompose(), color = if (vOn) c.onPrimaryContainer else c.onSurface)
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------- level

@Composable
private fun LevelBars(filled: Int, total: Int) {
    val c = LocalLKColors.current
    Row(Modifier.size(48.dp), horizontalArrangement = Arrangement.spacedBy(3.dp), verticalAlignment = Alignment.Bottom) {
        // filled = solid secondary; empty = outlined slot in `outline` (≥3:1 on the card – WCAG 1.4.11), not the pale outline-variant fill
        val on = Math.ceil(filled.toDouble() / total * 4).toInt()
        for (j in 0 until 4) Box(Modifier.width(6.dp).height((10 + 6 * j).dp).clip(PillShape).then(if (j < on) Modifier.background(c.secondary) else Modifier.border(1.5.dp, c.outline, PillShape)))
    }
}

@Composable
private fun LevelStep(k: Chrome, choice: OnbChoice, fresh: Boolean, teacher: @Composable (String) -> Unit, onNext: () -> Unit, onChange: (OnbChoice) -> Unit) {
    val t = k.t
    val tr = choice.trackDef
    val say = when {
        !fresh || choice.placement -> t(L10nKey.onbLevelSay)
        else -> t(L10nKey.onbSayLevelPick, mapOf("lv" to stageLabel(tr, choice.stage)))
    }
    StepFrame(k, footer = { NextButton(t(L10nKey.actionContinue), onNext) }) {
        Coach(t(L10nKey.onbLevelQ), say, teacher, if (fresh) "cheer" else "thinking")
        tr.stages.forEachIndexed { i, st ->
            val on = !choice.placement && choice.stage.id == st.id
            ChoiceCard(on, "onb-level-${st.id}", null, stageLabel(tr, st), st.band.ifEmpty { null }, { onChange(choice.copy(level = st.id)) }, lead = { LevelBars(i + 1, tr.stages.size) })
        }
        ChoiceCard(choice.placement, "onb-level-test", Icons.Filled.Explore, t(L10nKey.onbLevelTest), null, { onChange(choice.copy(level = OnbChoice.PLACEMENT)) })
    }
}

// ---------------------------------------------------------------- daily time

@Composable
private fun PaceStep(k: Chrome, choice: OnbChoice, fresh: Boolean, teacher: @Composable (String) -> Unit, onNext: () -> Unit, onChange: (OnbChoice) -> Unit) {
    val c = LocalLKColors.current
    val t = k.t
    StepFrame(k, footer = { NextButton(t(L10nKey.actionContinue), onNext); FreeNote(t) }) {
        Coach(t(L10nKey.onbPaceQ), t(L10nKey.onbPaceSay), teacher, if (fresh) "cheer" else "point")
        for (p in OnbPaces.all) {
            val icon = when (p.id) { 10 -> Icons.Filled.Schedule; 20 -> Icons.Filled.Bolt; else -> Icons.Filled.LocalFireDepartment }
            ChoiceCard(p.id == choice.pace, "onb-pace-${p.id}", icon, t(p.name), t(p.sub), { onChange(choice.copy(pace = p.id)) })
        }
    }
}

// ---------------------------------------------------------------- ready

@Composable
private fun SummaryTile(label: String, value: String, modifier: Modifier) {
    val c = LocalLKColors.current
    LKCard(modifier) {
        Text(label, style = LKType.labelBadge.toCompose(), color = c.onSurfaceVariant)
        Text(value, style = LKType.headlineSm.toCompose(), color = c.onSurface)
    }
}

@Composable
private fun ReadyStep(k: Chrome, choice: OnbChoice, teacher: @Composable (String) -> Unit, onNext: () -> Unit) {
    val t = k.t
    val tr = choice.trackDef
    val pace = OnbPaces.of(choice.pace)
    StepFrame(k, footer = { NextButton(t(L10nKey.onbReadyCta), onNext); FreeNote(t) }) {
        Coach(t(L10nKey.onbReadyQ), t(if (choice.placement) L10nKey.onbReadySayTest else L10nKey.onbReadySay), teacher, "cheer")
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            SummaryTile(t(L10nKey.todayGoalShort), tr.name(t), Modifier.weight(1f))
            SummaryTile(t(L10nKey.onbLevelWord), if (choice.placement) t(L10nKey.onbLevelTest) else stageLabel(tr, choice.stage), Modifier.weight(1f))
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            SummaryTile(t(L10nKey.todayTarget), OnbSettings.target(choice.exam), Modifier.weight(1f))
            SummaryTile(t(pace.name), t(pace.sub), Modifier.weight(1f))
        }
    }
}
