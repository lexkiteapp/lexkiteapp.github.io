package com.lexkite.app.feature.vocab

import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextDecoration
import com.lexkite.app.core.dict.DeepNotes
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject

/** wordcard.js "Hiểu sâu": mnemonic (open at first), common mistakes as wrong/right pairs, exam use, word family chips (tap = hear it). The note text is Vietnamese content shown as authored. */
@Composable
internal fun DeepNotesCard(n: JsonObject, word: String, a: DictActions) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val m = n.jstr("m"); val e = n.jstr("e"); val u = n.jstr("u"); val f = n.jstr("f")
    if (m.isEmpty() && e.isEmpty() && u.isEmpty() && f.isEmpty()) return
    LKCard {
        VText("🧠 " + t(L10nKey.dictGoDeeper), LKType.headlineSm, c.onSurface, Modifier.semantics { heading() })
        if (m.isNotEmpty()) NoteSection("💡", t(L10nKey.dictMnemonic), "", true) { VText(m, LKType.bodyMd, c.onSurface) }
        if (e.isNotEmpty()) {
            val err = DeepNotes.parseErrors(e)
            NoteSection("⚠️", t(L10nKey.modelCommonMistakes), if (err.pairs.isEmpty()) "" else err.pairs.size.toString(), false) {
                err.pairs.forEach { p ->
                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                        VText("✕", LKType.titlePill, c.error)
                        Ltr { VText(p.wrong, LKType.bodyMd, c.onSurfaceVariant, Modifier) }
                        if (p.wrongNote.isNotEmpty()) VMuted(p.wrongNote)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                        VText("✓", LKType.titlePill, c.success)
                        Ltr { VText(p.right, LKType.titlePill, c.onSurface) }
                        if (p.rightNote.isNotEmpty()) VMuted(p.rightNote)
                    }
                }
                err.notes.forEach { VText("• $it", LKType.bodyMd, c.onSurface) }
            }
        }
        if (u.isNotEmpty()) NoteSection("🎯", t(L10nKey.dictInTheExam), "", false) {
            DeepNotes.parseUsage(u).forEach { x ->
                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    if (x.tag.isNotEmpty()) Ltr { VBadge(x.tag, c.tertiaryContainer, c.onTertiaryContainer) }
                    VText(x.text, LKType.bodyMd, c.onSurface, Modifier.weight(1f, fill = false))
                }
            }
        }
        if (f.isNotEmpty()) {
            val fam = DeepNotes.parseFamily(f, word)
            NoteSection("🌳", t(L10nKey.usageWordFamily), fam.count { it.word != null }.takeIf { it > 0 }?.toString() ?: "", false) {
                VFlow {
                    fam.forEach { x ->
                        val w = x.word
                        if (w != null) Ltr { VChip(w + (if (x.pos.isNotEmpty()) " " + x.pos else ""), { a.speakText(w.split("/")[0].trim()) }) }
                        else VMuted(x.text)
                    }
                }
            }
        }
    }
}

/** One collapsible section (details/summary of the web). */
@Composable
private fun NoteSection(icon: String, label: String, meta: String, openAtFirst: Boolean, body: @Composable () -> Unit) {
    val c = LocalLKColors.current
    var open by remember { mutableStateOf(openAtFirst) }
    Column(Modifier.fillMaxWidth().animateContentSize(), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Row(Modifier.fillMaxWidth().heightIn(min = MinTap).tactile({ open = !open }, label), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
            VText(icon, LKType.bodyMd, c.onSurface)
            VText(label, LKType.titlePill, c.onSurface, Modifier.weight(1f))
            if (meta.isNotEmpty()) VBadge(meta)
            VText(if (open) "▾" else "▸", LKType.bodyMd, c.onSurfaceVariant)
        }
        if (open) Column(Modifier.padding(start = LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) { body() }
    }
}
