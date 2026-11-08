package com.lexkite.app.feature.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import com.lexkite.app.design.LocalReduceMotion
import kotlin.math.abs
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Undo
import androidx.compose.material.icons.filled.Headphones
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import kotlin.math.max

/** Picture slot (the app fills it with its image loader). */
typealias StudyImage = @Composable (url: String, description: String, modifier: Modifier) -> Unit

/** #/review – empty · all done · card (front / back, typing, listening) · summary. */
@Composable
fun ReviewScreen(ui: ReviewUi, a: ReviewActions, image: StudyImage) {
    val c = LocalLKColors.current
    when (ui) {
        ReviewUi.Loading -> Box(Modifier.background(c.background))
        is ReviewUi.Redirect -> Box(Modifier.background(c.background)) // the route replaces this screen (see VocabRoute)
        ReviewUi.Empty -> StudyPage(t(L10nKey.todayReview), a.exit) {
            EmptyState("🗂️", t(L10nKey.revNoFlashcardsYet), t(L10nKey.revAddWordsFromThe), t(L10nKey.revOpenLibrary), { a.open("library") }, t(L10nKey.todayLookUp), { a.open("dict") })
        }
        is ReviewUi.Done -> SummaryScreen(ui.s, a)
        is ReviewUi.Card -> CardScreen(ui, a, image)
    }
}

// ---------------------------------------------------------------- the card
@Composable
private fun CardScreen(u: ReviewUi.Card, a: ReviewActions, image: StudyImage) {
    val c = LocalLKColors.current; val card = u.c
    val answered = u.ans != null
    StudyFocus(if (u.total == 0) 0f else u.done.toFloat() / u.total, t(L10nKey.todayReview), a.exit, bottom = { BottomBar(u, a) }) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            if (card.isNew) Tag(t(L10nKey.revNew), c.primary)
            RichBody(t(L10nKey.revCardsLeft, mapOf("n" to u.left)), Modifier.weight(1f), c.onSurfaceVariant, LKType.bodySm)
            if (u.canUndo) IconBtn(Icons.AutoMirrored.Filled.Undo, t(L10nKey.revUndoLastGradeZ), a.undo)
            IconBtn(Icons.Filled.SwapHoriz, t(L10nKey.revFlipCardDirection), a.reverse)
            IconBtn(Icons.Filled.Headphones, t(L10nKey.revHandsFreeMode)) { a.open("handsfree") }
        }
        if (u.notice != null) Notice(t(u.notice), u.noticeOk)
        if (u.flipped) {
            if (answered) AnswerBanner(u)
            SwipeGrade(!answered, a.grade) { BackFace(u, a, image) }
        } else when (card.mode) {
            "type" -> TypeFace(u, a)
            "audio" -> AudioFace(u, a)
            else -> FlipFace(u, a)
        }
    }
}

/**
 * study-swipe.js: drag the flipped card sideways to grade it - left = Again, right = Good (physical sides, also in RTL). Needs 30% of the width
 * or a quick 40 dp flick; starts only away from the 24 dp screen edges (back gesture); vertical scrolling is untouched; no tilt with Reduce Motion.
 */
@Composable
private fun SwipeGrade(enabled: Boolean, onGrade: (Int) -> Unit, content: @Composable () -> Unit) {
    if (!enabled) { content(); return }
    val c = LocalLKColors.current; val reduce = LocalReduceMotion.current; val dens = LocalDensity.current.density
    var dx by remember { mutableFloatStateOf(0f) }
    var width by remember { mutableFloatStateOf(1f) }
    val grade by rememberUpdatedState(onGrade)
    Box(Modifier.fillMaxWidth().onSizeChanged { width = it.width.toFloat().coerceAtLeast(1f) }
        .pointerInput(Unit) {
            var live = false; var t0 = 0L
            detectHorizontalDragGestures(
                onDragStart = { p -> live = p.x >= 24 * dens && p.x <= width - 24 * dens; t0 = System.nanoTime(); dx = 0f },
                onDragEnd = {
                    val dist = abs(dx); val ms = ((System.nanoTime() - t0) / 1_000_000L).coerceAtLeast(1L)
                    val passed = live && (dist >= width * 0.3f || (dist >= 40 * dens && dist / dens / ms > 0.5f))
                    val good = dx > 0; dx = 0f; live = false
                    if (passed) grade(if (good) 2 else 0)
                },
                onDragCancel = { dx = 0f; live = false },
                onHorizontalDrag = { change, d -> if (live) { change.consume(); dx += d } },
            )
        }) {
        Column(Modifier.fillMaxWidth().graphicsLayer { translationX = dx; rotationZ = if (reduce) 0f else dx / (18f * dens) }, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd)) { content() }
        if (abs(dx) > 40 * dens) {
            val good = dx > 0
            Text((if (good) "✓ " else "↺ ") + t(if (good) L10nKey.revGood else L10nKey.revAgain), Modifier.align(if (good) Alignment.TopStart else Alignment.TopEnd).padding(LKSpacing.spaceXs).clip(PillShape).background(if (good) c.secondary else c.error).padding(horizontal = LKSpacing.spaceSm, vertical = 4.dp),
                style = LKType.labelMetric.toCompose(), color = if (good) c.onSecondary else c.onError)
        }
    }
}

@Composable
private fun IconBtn(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    val c = LocalLKColors.current
    Box(Modifier.size(48.dp).clip(CircleShape).tactile(onClick, label), contentAlignment = Alignment.Center) { Icon(icon, label, tint = c.onSurfaceVariant) }
}

/** Front of a flip card: the word (or, reversed, its meaning) and the "guess, then tap" hint. */
@Composable
private fun FlipFace(u: ReviewUi.Card, a: ReviewActions) {
    val card = u.c
    LKCard(Modifier.heightIn(min = 280.dp), onClick = a.flip, label = t(L10nKey.revFlipCard)) {
        Column(Modifier.fillMaxWidth().heightIn(min = 240.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            if (card.reverse) {
                Body(card.mean, align = TextAlign.Center, style = LKType.headlineLg)
                Spacer(Modifier.height(LKSpacing.spaceSm))
                Muted(t(L10nKey.revRecallTheEnglishWord), align = TextAlign.Center)
            } else {
                EnLtr {
                    Body(card.word, align = TextAlign.Center, style = LKType.displayHeroMobile)
                    if (card.ipa.isNotEmpty()) Muted(card.ipa, align = TextAlign.Center)
                }
                Spacer(Modifier.height(LKSpacing.spaceSm))
                SpeakButton({ a.sayWord(card.word, "") })
                Spacer(Modifier.height(LKSpacing.spaceSm))
                Muted(t(L10nKey.revGuessTheMeaningThen), align = TextAlign.Center)
            }
        }
    }
}

/** Typing mode: the meaning is shown, the learner types the word (hint = letters, "show answer" = give up). */
@Composable
private fun TypeFace(u: ReviewUi.Card, a: ReviewActions) {
    val card = u.c
    var text by remember(card.word, u.done) { mutableStateOf("") }
    LKCard {
        Body(card.mean, align = TextAlign.Center, modifier = Modifier.fillMaxWidth(), style = LKType.headlineMd)
        if (card.pos.isNotEmpty()) Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { Tag(card.pos) }
        if (u.hints > 0) EnLtr { Body(t(L10nKey.lessonTypeHint, mapOf("letter" to card.word.take(u.hints).uppercase(), "n" to card.word.length)), Modifier.fillMaxWidth(), LocalLKColors.current.onSurfaceVariant, LKType.bodySm, TextAlign.Center) }
        StudyField(text, { text = it }, t(L10nKey.lessonYourAnswerField), onDone = { if (text.isNotBlank()) a.check(text) })
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), modifier = Modifier.fillMaxWidth()) {
            GhostButton(t(L10nKey.lessonHint), a.hint, Modifier.weight(1f))
            GhostButton(t(L10nKey.mistShowAnswer), a.giveUp, Modifier.weight(1f), ink = LocalLKColors.current.onSurfaceVariant)
        }
        LKPrimaryButton(t(L10nKey.actionCheck), { a.check(text) }, enabled = text.isNotBlank())
    }
}

/** Listening mode: hear the word, pick its meaning. */
@Composable
private fun AudioFace(u: ReviewUi.Card, a: ReviewActions) {
    val card = u.c
    LKCard {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) { SpeakButton(a.replay, Modifier.size(72.dp), t(L10nKey.lessonReplay)) }
        Muted(t(L10nKey.lessonQMean), Modifier.fillMaxWidth(), TextAlign.Center)
        card.options.forEachIndexed { i, o -> ChoiceCard(LETTERS[i], o, Pick.NONE, { a.pick(i) }) }
    }
}

@Composable
private fun AnswerBanner(u: ReviewUi.Card) {
    val ans = u.ans ?: return; val c = LocalLKColors.current
    Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(if (ans.ok) c.surfaceContainerHighest else c.errorContainer).border(2.dp, if (ans.ok) c.success else c.error, RoundedCornerShape(16.dp)).padding(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Text(t(if (ans.ok) L10nKey.lessonRight else L10nKey.lessonWrong), style = LKType.titlePill.toCompose(), color = if (ans.ok) c.success else c.onErrorContainer)
        if (ans.given.isNotEmpty() && !ans.ok) EnLtr { Body(ans.given, color = c.onErrorContainer) }
    }
}

/** Back of the card: word, both accents, meaning, picture, definition, example, contexts, collocations, note, recall chance, leech box, "write your own sentence". */
@Composable
private fun BackFace(u: ReviewUi.Card, a: ReviewActions, image: StudyImage) {
    val c = LocalLKColors.current; val card = u.c
    LKCard {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            Column(Modifier.weight(1f)) {
                EnLtr { Body(card.word, style = LKType.headlineLg) }
                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                    if (card.pos.isNotEmpty()) Tag(card.pos)
                    if (card.level.isNotEmpty()) Tag(card.level, c.tertiary)
                }
            }
            SpeakButton({ a.sayWord(card.word, "") })
        }
        if (card.ipa.isNotEmpty()) Column {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { Muted(t(L10nKey.lessonAccUK)); EnLtr { Body(card.ipa) } }
            if (card.ipaUs.isNotEmpty() && card.ipaUs != card.ipa) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { Muted(t(L10nKey.lessonAccUS)); EnLtr { Body(card.ipaUs) } }
        }
        Body(card.mean, style = LKType.headlineSm, color = c.secondary)
        if (card.image.isNotEmpty()) image(card.image, card.word, Modifier.fillMaxWidth().height(160.dp).clip(RoundedCornerShape(16.dp)))
        else if (card.emoji.isNotEmpty()) Text(card.emoji, style = LKType.displayHeroMobile.toCompose())
        if (card.def.isNotEmpty() && card.def != card.mean) Section(t(L10nKey.revDefinition)) { EnLtr { Body(card.def) } }
        if (card.ex.isNotEmpty()) Section(t(L10nKey.revExample)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                EnLtr { Body(card.ex, Modifier.weight(1f)) }
                SpeakButton({ a.sayText(card.ex) }, label = t(L10nKey.revPlaySentence))
            }
        }
        if (card.contexts.isNotEmpty()) Section(t(L10nKey.revYourContexts)) {
            card.contexts.forEach { x ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    Column(Modifier.weight(1f)) { EnLtr { Body("“${x.text}”") }; if (x.title.isNotEmpty()) Muted(x.title) }
                    SpeakButton({ a.sayText(x.text) }, label = t(L10nKey.revPlaySentence))
                    if (x.video != null) IconBtn(Icons.Filled.PlayArrow, t(L10nKey.revReplayTheOriginalClip)) { a.openUrl(x.video) }
                }
            }
        }
        if (card.sentences.isNotEmpty()) Section(t(L10nKey.revBilingualSentences)) {
            card.sentences.forEach { (en, vi) -> Column { EnLtr { Body(en) }; if (vi.isNotEmpty()) Muted(vi) } }
        }
        if (card.col.isNotEmpty()) Section(t(L10nKey.revGoesWith)) { Flow { card.col.forEach { EnLtr { Tag(it, c.onSurface) } } } }
        if (card.syn.isNotEmpty()) Section(t(L10nKey.revSynonyms)) { Flow { card.syn.forEach { EnLtr { Tag(it, c.onSurface) } } } }
        if (card.note.isNotEmpty()) Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { Icon(Icons.Filled.Lightbulb, null, tint = c.tertiary); Body(card.note) }
        if (card.retention != null) RichBody(t(L10nKey.revRecallChanceBeforeThis, mapOf("pct" to card.retention, "n" to card.lapses)), color = c.onSurfaceVariant, style = LKType.bodySm)
        if (card.lapses >= 3) LeechBox(u, a)
        SentenceBox(u, a)
    }
}

@Composable
private fun Section(title: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) { Label(title); content() }
}

/** "Hard word - forgotten n times": relearn differently (AI memory aid, say it 3 times, own memory aid). */
@Composable
private fun LeechBox(u: ReviewUi.Card, a: ReviewActions) {
    val c = LocalLKColors.current
    var note by remember(u.c.word) { mutableStateOf(u.c.note) }
    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(c.errorContainer.copy(alpha = 0.4f)).border(2.dp, c.error, RoundedCornerShape(16.dp)).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Body(t(L10nKey.revHardWordForgottenTimes, mapOf("n" to u.c.lapses)), style = LKType.titlePill)
        Muted(t(L10nKey.revRelearnItDifferentlyInstead))
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            if (u.canAid) GhostButton(t(L10nKey.revCreateAMemoryAid), a.aid, Modifier.weight(1f), enabled = !u.busy)
            GhostButton(t(L10nKey.revRepeatAloud3Times), a.shadow, Modifier.weight(1f))
        }
        if (u.aid != null) Body(u.aid)
        StudyField(note, { note = it.take(200) }, t(L10nKey.revYourOwnMemoryAid), onDone = { a.saveNote(note) })
    }
}

/** "Write your own sentence with the word (+5 XP)". */
@Composable
private fun SentenceBox(u: ReviewUi.Card, a: ReviewActions) {
    var text by remember(u.c.word) { mutableStateOf("") }
    Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Body(t(L10nKey.revWriteYourOwnSentence, mapOf("word" to u.c.word)), style = LKType.titlePill)
        Muted(t(L10nKey.revN5XpHelpsIt))
        StudyField(text, { text = it }, t(L10nKey.revWriteASentenceAbout), singleLine = false, minHeight = 72.dp, ime = androidx.compose.ui.text.input.ImeAction.Default)
        GhostButton(t(L10nKey.revSaveMySentence), { a.saveSentence(text); text = "" }, Modifier.fillMaxWidth(), enabled = text.isNotBlank())
    }
}

// ---------------------------------------------------------------- bottom bar
@Composable
private fun BottomBar(u: ReviewUi.Card, a: ReviewActions) {
    val c = LocalLKColors.current
    when {
        u.ans != null -> LKPrimaryButton(t(L10nKey.actionContinue), a.next)
        !u.flipped && u.c.mode == "flip" -> LKPrimaryButton(t(L10nKey.revFlipCard), a.flip)
        u.flipped -> {
            Muted(t(L10nKey.revRateHowWellYou), Modifier.fillMaxWidth(), TextAlign.Center)
            val names = listOf(L10nKey.revAgain, L10nKey.revHard, L10nKey.revGood, L10nKey.revEasy)
            val fills = listOf(c.error, c.tertiaryContainer, c.secondary, c.success)
            val inks = listOf(c.onError, c.onTertiaryContainer, c.onSecondary, c.onSecondary)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                for (g in 0..3) {
                    val p = u.c.previews[g]
                    Column(Modifier.weight(1f).heightIn(min = 64.dp).clip(RoundedCornerShape(16.dp)).background(fills[g]).tactile({ a.grade(g) }).padding(horizontal = 4.dp, vertical = LKSpacing.spaceXs),
                        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                        Text(t(names[g]), style = LKType.labelMetric.toCompose(), color = inks[g], textAlign = TextAlign.Center)
                        Text(if (p.unit == "min") t.minutes(p.n.toInt()) else spanText(p.unit, p.n, t.locale), style = LKType.bodySm.toCompose(), color = inks[g], textAlign = TextAlign.Center)
                    }
                }
            }
        }
    }
}

// ---------------------------------------------------------------- summary
@Composable
private fun SummaryScreen(s: ReviewSummary, a: ReviewActions) {
    val c = LocalLKColors.current
    StudyFocus(1f, t(L10nKey.revReviewSessionResults), a.exit) {
        EmojiTitle(if (s.nothing) t(L10nKey.revYouReAllCaught) else t(L10nKey.revReviewsDone, mapOf("n" to s.done)), moodEmoji(s.mood))
        if (!s.nothing) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                StatTile("+${t.num(s.xp)}", t(L10nKey.todayXp), Modifier.weight(1f))
                StatTile("${s.acc}%", t(L10nKey.revRecalled), Modifier.weight(1f))
                StatTile(t.num(s.streak), t(L10nKey.revDayStreak), Modifier.weight(1f))
                StatTile(t.minutes(s.minutes), t(L10nKey.lessonTime), Modifier.weight(1f))
            }
            LKCard {
                Label(t(L10nKey.revHowWellYouRemembered))
                val total = max(1, s.g.sum())
                listOf(L10nKey.revAgain to c.error, L10nKey.revHard to c.tertiary, L10nKey.revGood to c.secondary, L10nKey.revEasy to c.success).forEachIndexed { i, (k, col) ->
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                        Body(t(k), Modifier.width(84.dp), style = LKType.bodySm)
                        Box(Modifier.weight(1f).height(10.dp).clip(PillShape).background(c.surfaceContainerHighest)) { if (s.g[i] > 0) Box(Modifier.fillMaxHeight().fillMaxWidth(s.g[i].toFloat() / total).background(col, PillShape)) }
                        Body(s.g[i].toString(), style = LKType.bodySm, modifier = Modifier.width(32.dp), align = TextAlign.End)
                    }
                }
            }
            if (s.hardWord != null) LKCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Label(t(L10nKey.revWordToWatchMost), Modifier.weight(1f))
                    SpeakButton({ a.sayWord(s.hardWord, "") })
                }
                EnLtr { Body(s.hardWord, style = LKType.headlineMd); if (s.hardIpa.isNotEmpty()) Muted(s.hardIpa) }
                if (s.hardMean.isNotEmpty()) Muted(s.hardMean)
                GhostButton(t(L10nKey.todayLookUp), { a.open("dict/" + android.net.Uri.encode(s.hardWord)) }, Modifier.fillMaxWidth())
                if (s.others.isNotEmpty()) { Label(t(L10nKey.revOtherMissedWords)); Flow { s.others.forEach { w -> Chip(w, false, { a.open("dict/" + android.net.Uri.encode(w)) }) } } }
            } else LKCard {
                Body(t(L10nKey.revFlawlessReview), style = LKType.headlineSm, color = c.success)
                Muted(t(L10nKey.revYouDidnTForget))
            }
        }
        Forecast(s)
        if (s.nextDue != null) RichBody(t(L10nKey.revNextCardDue, mapOf("date" to dateText(s.nextDue, t.locale))), color = c.onSurfaceVariant)
        if (s.soon > 0) LKCard {
            Body(t(L10nKey.revExamComingUpOr, mapOf("n" to s.soon)))
            GhostButton(t(L10nKey.revReviewAhead), { a.open("review?ahead=2") }, Modifier.fillMaxWidth())
        } else Muted(t(L10nKey.revStudyingALittleEvery))
        LKPrimaryButton(t(L10nKey.revKeepLearning), { a.open("path") })
        GhostButton(t(L10nKey.revSmartStudy), { a.open("practice/learn") }, Modifier.fillMaxWidth())
        GhostButton(t(L10nKey.revMatch), { a.open("practice/match?src=due") }, Modifier.fillMaxWidth())
        if (s.brag) {
            val text = t(L10nKey.revReviewsDone, mapOf("n" to s.done)) + " · ${s.acc}% · +${s.xp} XP · " + t(L10nKey.appName)
            GhostButton(t(L10nKey.revShareYourProgress), { a.share(text) }, Modifier.fillMaxWidth())
        }
    }
}

private fun moodEmoji(m: String) = when (m) { "win" -> "🏆"; "happy" -> "😊"; else -> "💪" }

@Composable
private fun EmojiTitle(title: String, emoji: String) {
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Text(emoji, style = LKType.displayHero.toCompose())
        Body(title, align = TextAlign.Center, style = LKType.headlineMd)
    }
}

/** Cards due in the next 7 days (index 0 = tomorrow). */
@Composable
private fun Forecast(s: ReviewSummary) {
    val c = LocalLKColors.current
    val peak = max(1, s.forecast.maxOrNull() ?: 0)
    LKCard {
        Label(t(L10nKey.revCardsDueInThe))
        Row(Modifier.fillMaxWidth().height(96.dp), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.Bottom) {
            s.forecast.forEachIndexed { i, n ->
                Column(Modifier.weight(1f).fillMaxHeight(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Bottom) {
                    Text(n.toString(), style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant)
                    Box(Modifier.fillMaxWidth().height(max(4, 48 * n / peak).dp).clip(RoundedCornerShape(6.dp)).background(if (n > 0) c.secondary else c.surfaceContainerHighest))
                    val label = if (i == 0) t(L10nKey.revTmrw) else SimpleDateFormat("EEE", t.locale).format(Date(Calendar.getInstance().apply { timeInMillis = s.now; add(Calendar.DAY_OF_MONTH, i + 1) }.timeInMillis))
                    Text(label, style = LKType.bodySm.toCompose(), color = c.onSurfaceVariant, maxLines = 1)
                }
            }
        }
    }
}
