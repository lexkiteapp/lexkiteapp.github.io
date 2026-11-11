package com.lexkite.app.feature.speak

import android.content.Context
import android.media.MediaMetadata
import android.media.session.MediaSession
import android.media.session.PlaybackState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.ui.draw.clip
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.core.audio.TtsCallback
import com.lexkite.app.core.skills.Clip
import com.lexkite.app.core.speak.HandsFree
import com.lexkite.app.core.speak.HfIO
import com.lexkite.app.core.speak.HfWord
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.core.speak.tr
import com.lexkite.app.design.LKColors
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.EmptyState
import com.lexkite.app.feature.vocab.EnLtr
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.skills.SwitchRow
import com.lexkite.app.feature.vocab.StudyFocus
import com.lexkite.app.feature.vocab.Tag
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ---------------------------------------------------------------- #/handsfree  (Stitch handsfree-run)
class HfUi(val title: Tr, val words: List<HfWord>, val i: Int, val playing: Boolean, val opt: HandsFree.Opt, val ambient: Boolean = false, val empty: Boolean = false)
class HfActions(val toggle: () -> Unit = {}, val next: () -> Unit = {}, val prev: () -> Unit = {}, val ex: (Boolean) -> Unit = {}, val mean: (Boolean) -> Unit = {}, val ambient: (Boolean) -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun HandsFreeScreen(ui: HfUi, a: HfActions) {
    val c = LocalLKColors.current
    if (ui.empty || ui.words.isEmpty()) { StudyFocus(0f, trs(Tr("Học rảnh tay")), a.exit) { EmptyState("🎧", trs(Tr("Chưa có từ nào để nghe."))) }; return }
    val w = ui.words[ui.i]
    if (ui.ambient) {
        val d = LKColors.dark
        Box(Modifier.fillMaxSize().background(d.background).tactile({ a.ambient(false) }, trs(Tr("Màn tối"))), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), modifier = Modifier.padding(LKSpacing.gutter)) {
                EnLtr { Body(w.word, color = d.onSurface, style = LKType.headlineLg, align = TextAlign.Center) }; Body(w.meaning, color = d.onSurfaceVariant, align = TextAlign.Center)
                Muted(HandsFree.position(ui.i, ui.words.size)); GhostButton(trs(Tr("Màn tối")) + " ✕", { a.ambient(false) })
            }
        }
        return
    }
    val prevLabel = trs(Tr("Từ trước")); val nextLabel = trs(Tr("Từ tiếp"))
    StudyFocus((ui.i + 1) / ui.words.size.toFloat(), trs(Tr("Học rảnh tay")), a.exit, bottom = { LKPrimaryButton(nextLabel + " →", a.next) }) {
        LKCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(LKSpacing.space2xs)) { Body(trs(Tr("Học rảnh tay")), style = LKType.headlineSm); Muted(trs(ui.title)); Muted(trs(Tr("Nghe từ, nghĩa và câu ví dụ liên tục – vừa đi bộ, lái xe hay làm việc nhà. Khóa màn hình vẫn nghe được, điều khiển từ màn hình khóa & tai nghe."))) }
                Box(Modifier.size(64.dp)) { LocalSpeakSlots.current.teacher("ama", "point", Modifier.size(64.dp)) }
            }
        }
        LKCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) { Tag(HandsFree.position(ui.i, ui.words.size)) }
            EnLtr { Body(w.word, style = LKType.headlineLg) }
            if (w.ipa.isNotEmpty()) EnLtr { Muted(w.ipa) }
            Body(w.meaning, style = LKType.titlePill)
            if (w.ex.isNotEmpty()) Box(Modifier.fillMaxWidth().clip(androidx.compose.foundation.shape.RoundedCornerShape(16.dp)).background(c.surfaceContainerHighest).padding(LKSpacing.spaceSm)) { EnLtr { Body("“" + w.ex + "”") } }
        }
        LKCard {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                GhostButton("⏮", a.prev, Modifier.semantics { contentDescription = prevLabel })
                LKPrimaryButton(if (ui.playing) "⏸ " + trs(Tr("Tạm dừng")) else "▶ " + trs(Tr(if (ui.i == 0 && !ui.playing) "Bắt đầu" else "Tiếp tục")), a.toggle, Modifier.weight(1f))
                GhostButton("⏭", a.next, Modifier.semantics { contentDescription = nextLabel })
            }
            GhostButton("🌙 " + trs(Tr("Màn tối")), { a.ambient(true) }, Modifier.fillMaxWidth())
        }
        LKCard { SwitchRow(trs(Tr("Câu ví dụ")), ui.opt.ex, onChange = a.ex); SwitchRow(trs(Tr("Đọc nghĩa (khi mở màn hình)")), ui.opt.mean, onChange = a.mean) }
        LKCard(fill = c.surfaceContainerHighest) { Muted("🔒 " + trs(HandsFree.footer(ui.title))) }
    }
}

/** The platform side of hands-free playback over the app audio (Kokoro clips, dictionary URLs, the silent track, device speech). */
class LkHfIO(private val env: SpeakEnv) : HfIO {
    override val hidden: Boolean get() = env.screenOff()
    override suspend fun clip(text: String): Boolean = env.vocab.audio.playKey(AudioLogic.lineKey("bf_emma", text.trim()), 1f) != Clip.MISSING
    override suspend fun url(u: String) { env.vocab.audio.playUrl(u) }
    override suspend fun silence() { env.vocab.audio.playSilence() }
    override suspend fun speak(text: String, lang: String, rate: Double) {
        val clean = AudioLogic.ttsClean(text); if (clean.isEmpty() || hidden) return
        val d = CompletableDeferred<Unit>()
        env.vocab.audio.speakCast(clean, null, lang, 1f, rate.toFloat(), object : TtsCallback { override fun onStart() {}; override fun onEnd() { d.complete(Unit) }; override fun onError() { d.complete(Unit) } })
        try { d.await() } finally { env.vocab.audio.stop() }
    }
    override suspend fun wait(ms: Long) = delay(ms)
}

/** Lock-screen / headset controls: the six MediaSession actions call the same functions as the buttons. */
class HfSession(ctx: Context) {
    private val ms = MediaSession(ctx, "lexkite-handsfree")
    fun bind(play: () -> Unit, pause: () -> Unit, next: () -> Unit, prev: () -> Unit) {
        ms.setCallback(object : MediaSession.Callback() {
            override fun onPlay() = play(); override fun onPause() = pause(); override fun onSkipToNext() = next(); override fun onSkipToPrevious() = prev(); override fun onFastForward() = next(); override fun onRewind() = prev()
        })
    }
    fun meta(m: HandsFree.Meta) { ms.setMetadata(MediaMetadata.Builder().putString(MediaMetadata.METADATA_KEY_TITLE, m.title).putString(MediaMetadata.METADATA_KEY_ARTIST, m.artist).putString(MediaMetadata.METADATA_KEY_ALBUM, m.album).build()) }
    fun state(playing: Boolean) {
        ms.setPlaybackState(PlaybackState.Builder().setActions(PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or PlaybackState.ACTION_SKIP_TO_NEXT or PlaybackState.ACTION_SKIP_TO_PREVIOUS or PlaybackState.ACTION_FAST_FORWARD or PlaybackState.ACTION_REWIND)
            .setState(if (playing) PlaybackState.STATE_PLAYING else PlaybackState.STATE_PAUSED, 0L, 1f).build()); ms.isActive = true
    }
    fun release() { ms.isActive = false; ms.setCallback(null); ms.release() }
}

class HandsFreeVm(private val env: SpeakEnv, private val arg: String, private val uiLang: String) : ViewModel() {
    var ui by mutableStateOf<HfUi?>(null); private set
    private var words = emptyList<HfWord>(); private var title = Tr(""); private var opt = HandsFree.Opt(); private var engine: HandsFree.Engine? = null; private var job: Job? = null; private var playing = false; private var ambient = false
    private var session: HfSession? = null; private var shown = 0; private var accent = "en-GB"
    init { viewModelScope.launch {
        accent = env.accent(); val cards = env.word.cards(); val lib = env.library(); val q = HandsFree.queue(arg, cards, null, { id -> lib?.topic(id) }, env.now)
        title = q.title; words = q.words.map { HfWord.of(it) }.filter { it.word.isNotEmpty() }; opt = HandsFree.Opt.of(env.setting("hf")); publish() } }
    fun attach(s: HfSession) { session = s; s.bind({ if (!playing) toggle() }, { if (playing) toggle() }, { next() }, { prev() }); push() }
    override fun onCleared() { job?.cancel(); env.vocab.audio.stop(); session?.release() }
    private fun publish() { ui = HfUi(title, words, shown, playing, opt, ambient, words.isEmpty()); push() }
    private fun push() { val s = session ?: return; words.getOrNull(shown)?.let { s.meta(HandsFree.meta(it, env.vocab.tx.tr(title))) }; s.state(playing) }
    private fun engine(): HandsFree.Engine = engine ?: HandsFree.Engine(words, opt, LkHfIO(env), accent, HandsFree.meaningLang(if (uiLang == "vi") "vi" else "en", uiLang)) { i -> shown = i; publish() }.also { engine = it }
    private fun run() { val e = engine(); job?.cancel(); job = viewModelScope.launch { e.run() } }
    fun toggle() { if (words.isEmpty()) return; playing = !playing; if (playing) run() else { job?.cancel(); env.vocab.audio.stop() }; publish() }
    fun next() { if (words.isEmpty()) return; val e = engine(); job?.cancel(); env.vocab.audio.stop(); e.next(); shown = e.i; publish(); if (playing) run() }
    fun prev() { if (words.isEmpty()) return; val e = engine(); job?.cancel(); env.vocab.audio.stop(); e.prev(); shown = e.i; publish(); if (playing) run() }
    private fun options(o: HandsFree.Opt) { opt = o; val at = engine?.i ?: shown; job?.cancel(); env.vocab.audio.stop(); engine = null; val e = engine(); repeat(at) { e.next() }; publish(); if (playing) run(); viewModelScope.launch { env.setSetting("hf", o.json()) } }
    fun ex(on: Boolean) = options(HandsFree.Opt(on, opt.mean, opt.gap))
    fun mean(on: Boolean) = options(HandsFree.Opt(opt.ex, on, opt.gap))
    fun ambient(on: Boolean) { ambient = on; publish() }
    class Factory(private val env: SpeakEnv, private val arg: String, private val uiLang: String) : ViewModelProvider.Factory { @Suppress("UNCHECKED_CAST") override fun <T : ViewModel> create(modelClass: Class<T>): T = HandsFreeVm(env, arg, uiLang) as T }
}
