package com.lexkite.app.feature.speak

import android.content.Intent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.speak.RecError
import com.lexkite.app.core.speak.SayCard
import com.lexkite.app.core.speak.SayData
import com.lexkite.app.core.speak.SayLogic
import com.lexkite.app.core.speak.SaySeries
import com.lexkite.app.core.speak.SpeakScore
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.EmptyState
import com.lexkite.app.feature.vocab.EnLtr
import com.lexkite.app.feature.vocab.Flow
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.RichBody
import com.lexkite.app.feature.vocab.StudyFocus
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.Tag
import kotlinx.coroutines.launch
import java.util.Locale

// ---------------------------------------------------------------- #/say  (Stitch say-list / say-front / say-back)
class SayListUi(val rows: List<SayLogic.Row>?, val failed: Boolean = false)
class SayCardUi(val s: SaySeries, val i: Int, val flipped: Boolean, val front: SayLogic.Front, val back: SayLogic.Back, val share: Tr, val micText: Tr? = null, val micHeard: String = "", val listening: Boolean = false, val micError: Tr? = null)
class SayActions2(val open: (String) -> Unit = {}, val flip: () -> Unit = {}, val speak: (Boolean) -> Unit = {}, val mic: () -> Unit = {}, val share: () -> Unit = {}, val retry: () -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun SayListScreen(ui: SayListUi, a: SayActions2) {
    val c = LocalLKColors.current
    StudyPage(trs(Tr("Nói như người bản xứ")), a.exit) {
        if (ui.failed) { EmptyState("🗣️", trs(Tr("Không tải được – thử lại sau")), action = trs(Tr("Thử lại")), onAction = a.retry); return@StudyPage }
        Muted(trs(Tr("Câu người bản xứ hay nói, kèm tình huống dùng và câu nên tránh. Chạm thẻ để lật.")))
        for (r in ui.rows ?: emptyList()) LKCard(onClick = { a.open("say/${r.series.id}/${r.firstCard.id}") }, label = r.series.title) {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Box(Modifier.size(64.dp)) { LocalSpeakSlots.current.teacher(r.series.teacher, r.firstCard.pose, Modifier.size(64.dp)) }
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    EnLtr { Body(r.series.title, style = LKType.titlePill, maxLines = 1) }; Muted(trs(r.progress))
                    Box(Modifier.fillMaxWidth(0.7f).height(5.dp).clip(RoundedCornerShape(50)).background(c.surfaceContainerHighest)) { Box(Modifier.fillMaxWidth(r.pct / 100f).height(5.dp).clip(RoundedCornerShape(50)).background(c.primary)) }
                }
                Body(if (androidx.compose.ui.platform.LocalLayoutDirection.current == androidx.compose.ui.unit.LayoutDirection.Rtl) "‹" else "›", color = c.primary, style = LKType.headlineSm)
            }
        }
    }
}

@Composable
fun SayCardScreen(ui: SayCardUi, a: SayActions2) {
    val c = LocalLKColors.current; val cd = ui.s.items[ui.i]; val f = ui.front; val b = ui.back
    val micLabel = trs(Tr("Tự nói thử"))
    StudyFocus((f.pct / 100.0).toFloat(), trs(Tr("Nói như người bản xứ")), a.exit, bottom = {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
            if (!ui.flipped) {
                GhostButton("🎧 " + trs(Tr("Nghe từ tốn")), { a.speak(true) }, Modifier.weight(1f), ink = c.onSurface)
                MicButton(ui.listening, a.mic, micLabel)
                GhostButton("↗ " + trs(Tr("Chia sẻ")), a.share, Modifier.weight(1f), ink = c.onSurface)
            } else {
                MicButton(ui.listening, a.mic, micLabel)
                val shareLabel = trs(Tr("Chia sẻ"))
                GhostButton("↗", a.share, Modifier.semantics(mergeDescendants = true) { contentDescription = shareLabel }, ink = c.onSurface)   // icon only: the web's Share stays on the back, the label is read out
                LKPrimaryButton(trs(Tr("Thẻ tiếp")) + " →", { a.open(b.next) }, Modifier.weight(1f))
            }
        }
    }) {
        if (!ui.flipped) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Tag(trs(f.series)); Muted(trs(f.step)) }
            LKCard(fill = c.surfaceContainerHighest, onClick = a.flip, label = trs(Tr("Chạm để lật"))) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Tag(trs(f.regLbl), c.success); GhostButton("🔊", { a.speak(false) }, ink = c.primary) }
                EnLtr { Body("“" + cd.say + "”", color = c.primary, style = LKType.headlineLg) }
                if (f.ipa.isNotEmpty()) Box(Modifier.clip(RoundedCornerShape(50)).background(c.cardLow).padding(horizontal = LKSpacing.spaceSm, vertical = 6.dp)) { EnLtr { Body(f.ipa) } }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
                    Muted("⟳ " + trs(Tr("Chạm để lật")))
                    Box(Modifier.size(width = 120.dp, height = 130.dp)) { LocalSpeakSlots.current.teacher(ui.s.teacher, cd.pose, Modifier.size(width = 120.dp, height = 130.dp)) }
                }
            }
        } else {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.Bottom) {
                Box(Modifier.size(width = 96.dp, height = 110.dp)) { LocalSpeakSlots.current.teacher(ui.s.teacher, cd.pose, Modifier.size(width = 96.dp, height = 110.dp)) }
                LKCard(Modifier.weight(1f), fill = c.surfaceContainerHighest) {
                    Body(trs(Tr("Mẹo hay")).uppercase(), color = c.secondary, style = LKType.labelBadge)
                    b.react?.let { Body(trs(it), style = LKType.titlePill) }
                    if (b.def.isNotEmpty()) EnLtr { Muted(b.def) }
                }
            }
            LKCard(fill = c.surfaceContainerHighest) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Tag(trs(f.regLbl), c.success); GhostButton("🔊", { a.speak(false) }, ink = c.primary) }
                Body(trs(Tr("Câu cần học")).uppercase(), color = c.onSurfaceVariant, style = LKType.labelBadge)
                EnLtr { Body(cd.say, color = c.primary, style = LKType.headlineMd) }
                Muted(trs(b.meaningLabel)); Body(b.meaning, style = LKType.titlePill); b.real?.let { Muted(trs(it)) }
                if (b.whenText.isNotEmpty()) { Body(trs(Tr("Dùng khi")).uppercase(), color = c.secondary, style = LKType.labelBadge); EnLtr { Body("“" + b.whenText + "”") } }
                Row(Modifier.fillMaxWidth().height(androidx.compose.foundation.layout.IntrinsicSize.Max), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    if (b.dont.isNotEmpty()) SayMini(Modifier.weight(1f).fillMaxHeight(), trs(Tr("Đừng nói")), b.dontReg, b.dont, b.dontWhy, c.error)
                    if (b.swap.isNotEmpty()) SayMini(Modifier.weight(1f).fillMaxHeight(), trs(Tr("Nói thế này")), b.swapReg, b.swap, b.swapWhy, c.success)
                }
            }
        }
        if (ui.listening) Muted(trs(Tr("Đang nghe… hãy nói câu trên")))
        ui.micText?.let { Body(trs(it) + ui.micHeard, color = c.secondary, style = LKType.titlePill) }
        ui.micError?.let { Body(trs(it), color = c.error) }
    }
}

@Composable
private fun SayMini(m: Modifier, title: String, reg: Tr?, text: String, why: Tr?, tint: androidx.compose.ui.graphics.Color) {
    Column(m.clip(RoundedCornerShape(14.dp)).background(tint.copy(alpha = 0.12f)).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Body(title.uppercase(), color = tint, style = LKType.labelBadge)
        reg?.let { Muted(trs(it)) }
        EnLtr { Body(text, style = LKType.titlePill) }
        why?.let { Muted(trs(it)) }
    }
}

class SayVm(private val env: SpeakEnv, private val arg: String, private val lang: String) : ViewModel() {
    var list by mutableStateOf<SayListUi?>(null); private set
    var card by mutableStateOf<SayCardUi?>(null); private set
    var redirect by mutableStateOf<String?>(null); private set
    private var data: SayData? = null; private var route: SayLogic.Route? = null; private var flipped = false; private var micText: Tr? = null; private var micHeard = ""; private var listening = false; private var micErr: Tr? = null
    init { load() }
    fun load() { viewModelScope.launch {
        val d = env.say(); if (d == null) { list = SayListUi(null, true); return@launch }
        data = d; val r = SayLogic.route(d, arg); route = r
        if (r.list) { list = SayListUi(SayLogic.list(d, SayLogic.seenSet(env.kv(SayLogic.KEY)))); return@launch }
        if (r.replace != null) { redirect = r.replace; return@launch }
        val s = r.series!!; val it = s.items[r.index]; env.putKv(SayLogic.KEY, SayLogic.seenWith(env.kv(SayLogic.KEY), s.id + "/" + it.id)); sync() } }
    private fun sync() { val r = route ?: return; val s = r.series ?: return
        card = SayCardUi(s, r.index, flipped, SayLogic.front(s, r.index), SayLogic.back(s, r.index, env.learnLang) { l -> Locale.forLanguageTag(l).getDisplayLanguage(Locale.forLanguageTag(lang)).replaceFirstChar { x -> x.titlecase() } }, SayLogic.shareText(s, s.items[r.index]), micText, micHeard, listening, micErr) }
    override fun onCleared() { env.stopListening(); env.stopSpeaking() }
    fun flip() { flipped = !flipped; env.stopListening(); env.stopSpeaking(); listening = false; sync() }
    fun speak(slow: Boolean) { val r = route ?: return; val s = r.series ?: return; env.speak(s.items[r.index].say, "en-US", if (slow) 0.7f else 0.95f, SayLogic.voiceOf(s.teacher)) }
    fun mic() { val r = route ?: return; val s = r.series ?: return; if (listening) { env.stopListening(); return }
        val say = s.items[r.index].say; listening = true; micText = null; micErr = null; sync()
        env.listen("en-US", {}, { alts -> val b = SpeakScore.best(say, alts); listening = false; val (t, h) = SayLogic.micText(b.score, b.heard); micText = t; micHeard = h; sync() }, { code -> listening = false; micErr = SayLogic.micError(code); sync() }) }
    fun micDenied() { listening = false; micErr = SayLogic.micError("not-allowed"); sync() }
    class Factory(private val env: SpeakEnv, private val arg: String, private val lang: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = SayVm(env, arg, lang) as T }
}
/** Opens the system share sheet with the card sentence and its link (the web shares an image + link; the picture is not drawn on Android yet). */
@Composable
fun rememberShare(): (String) -> Unit { val ctx = LocalContext.current; return { text -> ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
