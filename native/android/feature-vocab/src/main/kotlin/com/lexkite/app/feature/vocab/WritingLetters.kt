package com.lexkite.app.feature.vocab

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Timer
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.write.Letters
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPillButton
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.i18n.L10n
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject

class LetterRow(val letter: JsonObject, val draftWords: Int?)

class LettersActions(
    val setTab: (String) -> Unit = {}, val practise: (String) -> Unit = {}, val open: (String) -> Unit = {}, val textChange: (String) -> Unit = {}, val toggleTimer: () -> Unit = {}, val check: () -> Unit = {},
)

internal fun toneKey(tone: String): L10nKey = when (tone) { "formal" -> L10nKey.lettersFormal; "semi-formal" -> L10nKey.lettersSemiFormal; "informal" -> L10nKey.lettersInformal; else -> L10nKey.vocabAll }
private fun toneTip(tone: String): L10nKey? = when (tone) { "formal" -> L10nKey.lettersRecipientSNameUnknown; "semi-formal" -> L10nKey.lettersSomeoneYouKnowBut; "informal" -> L10nKey.lettersFriendsAndFamilyDear; else -> null }

/** The letter's title in the learner's language (the Vietnamese title for Vietnamese, otherwise its English topic). */
internal fun letterTitle(l: JsonObject, lang: String): String = if (lang == "vi") l.jstr("titleVi") else l.jstr("topic").replaceFirstChar { it.uppercase() }

/** #/letters: IELTS General Task 1 letters – tone tabs, drafts, practise / model answer buttons. */
@Composable
fun LettersListScreen(tab: String, tabs: List<Pair<String, Int>>, rows: List<LetterRow>, a: LettersActions, onExit: () -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    VScreen(t(L10nKey.lettersLetterWritingIeltsGeneral), onExit) {
        VMuted(t(L10nKey.lettersWriteALetterOf))
        VFlow { tabs.forEach { (k, n) -> VChip(t(toneKey(k)) + "  " + t.num(n), { a.setTab(k) }, selected = tab == k) } }
        toneTip(tab)?.let { tip ->
            LKCard { VTitle(t(L10nKey.lettersToneOpeningsClosings)); VMuted(t(tip)) }
        }
        if (rows.isEmpty()) VNotice(t(L10nKey.lettersComingSoon))
        rows.forEach { r ->
            val l = r.letter
            LKCard {
                VFlow {
                    VBadge(t(toneKey(l.jstr("tone"))), c.secondaryContainer, c.onSecondaryContainer)
                    if (r.draftWords != null) VBadge("✍️ " + t.s(L10nKey.vocabWords, "n" to r.draftWords), c.tertiaryContainer, c.onTertiaryContainer)
                }
                VText(letterTitle(l, t.lang), LKType.titlePill, c.onSurface)
                Ltr { VMuted(Letters.shortSituation(l.jstr("situation"))) }
                VFlow {
                    LKPillButton(t(L10nKey.lettersPractiseWriting), { a.practise(l.jstr("id")) })
                    LKPillButton(t(L10nKey.lettersModelAnswer), { a.open("model/gt-" + l.jstr("id")) })
                }
            }
        }
    }
}

/** #/letters/<id>: write the letter (word counter, 20-minute timer, draft saved by the route) and run the self-check. */
@Composable
fun LetterPracticeScreen(letter: JsonObject, text: String, secondsLeft: Int, running: Boolean, check: Letters.Check?, a: LettersActions, onExit: () -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val n = Letters.wc(text)
    VScreen(letterTitle(letter, t.lang), onExit) {
        LKCard {
            VText(t(L10nKey.modelTask), LKType.labelBadge, c.onSurfaceVariant)
            Ltr {
                VText(letter.jstr("situation"), LKType.bodyMd, c.onSurface)
                letter.jarr("bullets").forEach { VText("•  " + it.js(), LKType.bodyMd, c.onSurface) }
                VText(letter.jstr("open") + "  …  " + letter.jstr("close"), LKType.labelMetric, c.secondary)
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
            val ok = n >= Letters.MIN_WORDS
            Row(
                Modifier.heightIn(min = MinTap).tactile(a.toggleTimer, Letters.timerText(secondsLeft)),
                verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs),
            ) {
                Icon(Icons.Filled.Timer, null, tint = if (running) c.secondary else c.onSurfaceVariant)
                VText(if (secondsLeft <= 0) t(L10nKey.lettersTimeSUp) else Letters.timerText(secondsLeft), LKType.headlineSm, if (running) c.secondary else c.onSurface)
            }
            androidx.compose.foundation.layout.Spacer(Modifier.weight(1f))
            VBadge(t.s(L10nKey.vocabWords, "n" to n), if (ok) c.success.copy(alpha = 0.2f) else c.surfaceContainerHighest, if (ok) c.success else c.onSurface)
        }
        VField(text, a.textChange, t(L10nKey.lettersPractiseWriting), singleLine = false, lines = 10)
        LKPrimaryButton(t(L10nKey.actionCheck), a.check, enabled = text.isNotBlank())
        if (check != null) LKCard {
            check.rows.forEach { r ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.Top) {
                    Icon(if (r.ok) Icons.Filled.CheckCircle else Icons.Filled.Warning, null, tint = if (r.ok) c.success else c.error)
                    VText(letterCheckText(t, r), LKType.bodyMd, c.onSurface)
                }
            }
        }
    }
}

private fun letterCheckText(t: L10n, r: Letters.Row): String {
    val key = when {
        r.key.startsWith("Đủ độ dài") -> L10nKey.lettersLengthOkWords
        r.key.startsWith("Mới") -> L10nKey.lettersOnlyWordsYouNeed
        r.key.startsWith("Lời chào") -> L10nKey.lettersBeginExactlyAsThe
        r.key.startsWith("Kết thư") -> L10nKey.lettersCloseInTheRight
        r.key.startsWith("Chia đoạn") -> L10nKey.lettersClearParagraphsGreetingPurpose
        r.key.startsWith("Không dùng viết tắt") -> L10nKey.lettersNoContractionsAppropriatelyFormal
        else -> L10nKey.lettersFormalLettersShouldAvoid
    }
    return t(key, r.vars)
}
