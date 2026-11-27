package com.lexkite.app.feature.skills

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lexkite.app.core.placement.PEstimate
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.ChoiceCard
import com.lexkite.app.feature.vocab.Confirm
import com.lexkite.app.feature.vocab.EnLtr
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.LETTERS
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.Notice
import com.lexkite.app.feature.vocab.Pick
import com.lexkite.app.feature.vocab.RichBody
import com.lexkite.app.feature.vocab.StatTile
import com.lexkite.app.feature.vocab.StudyFocus
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.Tag
import com.lexkite.app.feature.vocab.t
import com.lexkite.app.i18n.generated.L10nKey

/** The i18n sources carry a little web markup (<b>…</b>): plain text for the muted lines. */
private fun placementPlain(s: String): String = s.replace(Regex("<[^>]+>"), "")

private val STAGE = mapOf("s0" to L10nKey.placeStgS0, "s1" to L10nKey.placeStgS1, "s2" to L10nKey.placeStgS2, "s3" to L10nKey.placeStgS3)

class PlacementActions(
    val start: () -> Unit = {}, val answer: (Int) -> Unit = {}, val askExit: () -> Unit = {}, val keepGoing: () -> Unit = {}, val exit: () -> Unit = {}, val open: (String) -> Unit = {},
)

/** `placement`: intro → 20 adaptive questions (progress bar, "I don't know") → band range + CEFR per skill, weak skill, path stage, buttons to Today / the path. */
@Composable
fun PlacementScreen(ui: PlacementUi, a: PlacementActions) {
    when (ui.stage) {
        PlacementStage.INTRO -> Intro(ui, a)
        PlacementStage.ASK -> Ask(ui, a)
        PlacementStage.RESULT -> ui.result?.let { Result(it, ui.n, a) }
    }
}

@Composable
private fun Intro(ui: PlacementUi, a: PlacementActions) {
    val tr = t
    StudyPage(tr(L10nKey.placeTitle), a.exit, bottom = { LKPrimaryButton(tr(L10nKey.placeStart), a.start, Modifier.fillMaxWidth(), enabled = ui.pack != null) }) {
        Body("🧭 " + tr(L10nKey.placeTitle), style = LKType.headlineSm)
        RichBody(tr(L10nKey.placeIntro))
        Muted(tr(L10nKey.placeHint))
        if (ui.loaded && ui.pack == null) Notice(tr(L10nKey.medLoadFail), ok = false)
    }
}

@Composable
private fun Ask(ui: PlacementUi, a: PlacementActions) {
    val tr = t; val q = ui.q ?: return
    val progress = if (ui.n > 0) ui.i.toFloat() / ui.n else 0f
    val tag = tr(if (q.vocab) L10nKey.placeTagVocab else L10nKey.placeTagGrammar) + " · " + q.lv
    val count = "${ui.i + 1}/${ui.n}"
    val vi = LocalL10n.current.lang == "vi"
    val idk = tr(L10nKey.lessonIdk)
    StudyFocus(progress, "", a.askExit) {
        Muted(count)
        LKCard {
            Tag(tag)
            EnLtr { Body(q.text, style = if (q.vocab) LKType.headlineMd else LKType.bodyLg) }
            if (q.vocab) Muted(tr(L10nKey.revChooseTheCorrectMeaning))
        }
        for ((k, o) in q.options.withIndex()) ChoiceCard(LETTERS.getOrElse(k) { "${k + 1}" }, o, Pick.NONE, { a.answer(k) }, Modifier.fillMaxWidth(), ltr = !q.vocab || !vi)
        ChoiceCard("?", idk, Pick.NONE, { a.answer(-1) }, Modifier.fillMaxWidth())
    }
    if (ui.confirmExit) Confirm(tr(L10nKey.revQuitNow) + " " + tr(L10nKey.revYourAnswersInThisRound), tr(L10nKey.lessonExitGo), tr(L10nKey.revKeepGoing), a.exit, a.keepGoing)
}

@Composable
private fun Result(e: PEstimate, n: Int, a: PlacementActions) {
    val tr = t
    val weak = tr(if (e.weak == "vocab") L10nKey.placeWeakVocab else L10nKey.placeWeakGrammar)
    val stage = STAGE[e.stage]?.let { tr(it) }.orEmpty()
    val stageLine = tr(L10nKey.placeStage, mapOf("stage" to stage))
    val title = tr(L10nKey.placeBand, mapOf("band" to e.range))
    val vocabLabel = tr(L10nKey.tabVocab) + " · " + e.vocab.cefr
    val grammarLabel = tr(L10nKey.mistGrammar) + " · " + e.grammar.cefr
    val today = tr(L10nKey.placeToday); val path = tr(L10nKey.revDailyPath)
    StudyPage(tr(L10nKey.placeTitle), a.exit, bottom = {
        LKPrimaryButton(today, { a.open("home") }, Modifier.fillMaxWidth())
        GhostButton(path, { a.open("path") }, Modifier.fillMaxWidth())
    }) {
        Body("🎯 $title", style = LKType.headlineMd)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            StatTile(String.format(java.util.Locale.US, "%.1f", e.vocab.band), vocabLabel, Modifier.weight(1f).semantics(mergeDescendants = true) { contentDescription = vocabLabel + " " + e.vocab.band })
            StatTile(String.format(java.util.Locale.US, "%.1f", e.grammar.band), grammarLabel, Modifier.weight(1f).semantics(mergeDescendants = true) { contentDescription = grammarLabel + " " + e.grammar.band })
        }
        RichBody(tr(L10nKey.placeWeak, mapOf("weak" to weak)))
        Muted(placementPlain(stageLine))
        Muted(tr(L10nKey.placeHow, mapOf("n" to n)) + " " + tr(L10nKey.placeDisclaimer))
    }
}

/** `placement` of the Tests tab. */
@Composable
fun PlacementRoute(env: SkillsEnv, open: (String) -> Unit, exit: () -> Unit) {
    val vi = LocalL10n.current.lang == "vi"
    val vm: PlacementVm = viewModel(key = "placement", factory = PlacementVm.Factory(env, vi))
    PlacementScreen(vm.ui, PlacementActions(start = { vm.start() }, answer = { vm.answer(it) }, askExit = { if (vm.askExit()) exit() }, keepGoing = { vm.keepGoing() }, exit = exit, open = open))
}
