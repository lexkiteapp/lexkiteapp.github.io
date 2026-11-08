package com.lexkite.app.feature.vocab

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.lexkite.app.core.write.Ideas
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject

class IdeasActions(
    val pickTopic: (String) -> Unit = {}, val toggleIssue: (Int) -> Unit = {}, val say: (String) -> Unit = {}, val saveChunk: (JsonObject, String) -> Unit = { _, _ -> }, val open: (String) -> Unit = {},
)

/** Topic titles are authored in Vietnamese and translated through the shared string table; a title with no id keeps the topic name (like iOS). */
private fun topicTitle(t: com.lexkite.app.i18n.L10n, x: JsonObject): String {
    val ti = x.jstr("title")
    return (if (ti.isNotEmpty()) t.translate(ti) else null) ?: if (t.lang == "vi" && ti.isNotEmpty()) ti else x.jstr("topic").replaceFirstChar { it.uppercase() }
}

/** #/ideas and #/ideas/<topic>: Task 2 idea bank – topic chips, issues with For / Against ideas, example sentences, tap-to-save chunks, topic vocabulary, related prompts. */
@Composable
fun IdeasScreen(topics: List<JsonObject>, cur: JsonObject?, openIssues: Set<Int>, saved: Set<String>, prompts: List<JsonObject>, a: IdeasActions, onExit: () -> Unit) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    VScreen(t(L10nKey.ideasTask2IdeaBank), onExit) {
        if (cur == null) { VNotice(t(L10nKey.ideasTheIdeaBankIs)); return@VScreen }
        VMuted(t(L10nKey.ideasRunningOutOfIdeas).plain())
        VFlow { topics.forEach { tp -> VChip(tp.jstr("emoji") + " " + topicTitle(t, tp), { a.pickTopic(tp.jstr("topic")) }, selected = tp.jstr("topic") == cur.jstr("topic")) } }
        cur.jarr("issues").mapNotNull { it as? JsonObject }.forEachIndexed { i, iss ->
            val open = i in openIssues
            LKCard(onClick = { a.toggleIssue(i) }) {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Ltr { VText("❓ " + iss.jstr("q"), LKType.titlePill, c.onSurface, Modifier.weight(1f)) }
                    VText(if (open) "−" else "+", LKType.headlineSm, c.secondary)
                }
                if (open) {
                    listOf("for" to L10nKey.ideasFor, "against" to L10nKey.ideasAgainst).forEach { (side, label) ->
                        VText(t(label), LKType.headlineSm, if (side == "for") c.success else c.error, Modifier.semantics { heading() })
                        Ideas.ideasOf(iss, side).forEach { idea ->
                            Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                                Ltr { VText(idea.jstr("idea"), LKType.titlePill, c.onSurface) }
                                if (t.lang == "vi" && idea.jstr("vi").isNotEmpty()) VText(idea.jstr("vi"), LKType.bodyMd, c.onSurfaceVariant)
                                if (idea.jstr("ex").isNotEmpty()) Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                                    Ltr { VText(idea.jstr("ex"), LKType.bodyMd, c.onSurface, Modifier.weight(1f)) }
                                    VSpeak(t(L10nKey.lessonReplay)) { a.say(idea.jstr("ex")) }
                                }
                                val chunks = idea.jarr("chunks").map { it.js() }
                                if (chunks.isNotEmpty()) {
                                    VMuted(t(L10nKey.ideasTapToSave))
                                    VFlow { chunks.forEach { ch -> val en = Ideas.chunk(ch).first; Ltr { VChip((if (en in saved) "✓ " else "") + en, { a.saveChunk(idea, ch) }, selected = en in saved) } } }
                                }
                            }
                        }
                    }
                }
            }
        }
        val vocab = cur.jarr("vocab")
        if (vocab.isNotEmpty()) LKCard {
            VTitle(t.s(L10nKey.ideasTopicVocabulary, "topic" to cur.jstr("title")))
            vocab.forEach { v ->
                val pair = (v as? kotlinx.serialization.json.JsonArray)?.map { it.js() } ?: return@forEach
                Row(Modifier.fillMaxWidth().heightIn(min = MinTap), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    Ltr { VText(pair.getOrElse(0) { "" }, LKType.titlePill, c.onSurface, Modifier.weight(1f)) }
                    if (t.lang == "vi") VMuted(pair.getOrElse(1) { "" }, Modifier.weight(1f))
                    VSpeak(t(L10nKey.lessonReplay)) { a.say(pair.getOrElse(0) { "" }) }
                }
            }
        }
        if (prompts.isNotEmpty()) LKCard {
            VTitle(t(L10nKey.ideasPractiseWritingOnThis))
            prompts.forEach { p ->
                Row(Modifier.fillMaxWidth().heightIn(min = MinTap).tactile({ a.open("write/" + p.jstr("id")) }), verticalAlignment = Alignment.CenterVertically) {
                    Ltr { VText(p.jstr("text"), LKType.bodyMd, c.secondary, Modifier.weight(1f)) }
                }
            }
        }
    }
}
