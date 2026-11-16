package com.lexkite.app.feature.vocab

import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.write.Paraphrase
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.i18n.generated.L10nKey

sealed interface ParaUi {
    /** Fewer than 8 usable pairs (or the data could not be loaded). */
    data object Updating : ParaUi
    class Question(val index: Int, val total: Int, val q: Paraphrase.Question, val picked: String?) : ParaUi
    class Done(val right: Int, val total: Int, val pct: Int) : ParaUi
}

class ParaActions(val pick: (String) -> Unit = {}, val next: () -> Unit = {}, val again: () -> Unit = {}, val toReading: () -> Unit = {}, val say: (String) -> Unit = {})

/** #/paraphrase: a round of 10 – the question phrase, four rewordings, instant right/wrong, "q ≈ p", score. */
@Composable
fun ParaphraseScreen(ui: ParaUi, a: ParaActions, onExit: () -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    VScreen(t(L10nKey.paraParaphrasePractice), onExit) {
        when (ui) {
            ParaUi.Updating -> VNotice(t(L10nKey.paraUpdatingData))
            is ParaUi.Done -> LKCard {
                VText(t.s(L10nKey.paraCorrect, "right" to ui.right, "total" to ui.total, "pct" to ui.pct), LKType.headlineMd, c.onSurface)
                LKPrimaryButton(t(L10nKey.paraKeepPracticing), a.again)
                LKPrimaryButton(t(L10nKey.paraBackToReading), a.toReading, fill = c.secondary, ink = c.onSecondary)
            }
            is ParaUi.Question -> {
                VMuted(t(L10nKey.paraSpottingParaphrasesQuicklyIs))
                VText("${ui.index + 1}/${ui.total}", LKType.labelMetric, c.onSurfaceVariant)
                LKCard {
                    VText(t(L10nKey.paraTheQuestionSays), LKType.labelBadge, c.onSurfaceVariant)
                    Ltr { VText(ui.q.q, LKType.bodyLg, c.onSurface) }
                    VText(t(L10nKey.paraThePassageRewordsThis), LKType.labelBadge, c.onSurfaceVariant)
                }
                ui.q.options.forEach { o ->
                    val right = ui.picked != null && o == ui.q.answer
                    val wrong = ui.picked != null && o == ui.picked && o != ui.q.answer
                    val shape = RoundedCornerShape(16.dp)
                    Row(
                        Modifier.fillMaxWidth().heightIn(min = 52.dp).clip(shape).border(2.dp, if (right) c.success else if (wrong) c.error else c.outlineVariant, shape)
                            .tactile(if (ui.picked == null) ({ a.pick(o) }) else null).padding(horizontal = LKSpacing.spaceSm, vertical = LKSpacing.spaceXs),
                        verticalAlignment = Alignment.CenterVertically,
                    ) { Ltr { VText(o, LKType.bodyMd, if (right) c.success else if (wrong) c.error else c.onSurface) } }
                }
                if (ui.picked != null) {
                    LKCard {
                        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                            Ltr { VText(ui.q.q + " ≈ " + ui.q.answer, LKType.bodyMd, c.onSurface, Modifier.weight(1f)) }
                            VSpeak(t(L10nKey.lessonReplay)) { a.say(ui.q.answer) }
                        }
                    }
                    LKPrimaryButton(t(L10nKey.paraNext), a.next)
                }
            }
        }
    }
}

