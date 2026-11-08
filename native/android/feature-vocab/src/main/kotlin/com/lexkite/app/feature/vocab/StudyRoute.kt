package com.lexkite.app.feature.vocab

import android.Manifest
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.LibraryBooks
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Style
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.collectAsState
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lexkite.app.core.today.TodayModel
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.vocab.Deck
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.feature.lesson.AndroidSpeech
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.TopBar
import com.lexkite.app.ui.TopBarVariant
import java.util.TimeZone

/** Web hash routes (first path segment) that [VocabRoute] draws. */
val VOCAB_ROUTES: Set<String> = setOf("review", "practice", "mistakes", "deck", "library", "topic")

/** What the app fills in for the vocabulary screens: the picture loader. */
class StudySlots(val image: StudyImage)

/** `a=1&b=x` -> map (values decoded). */
fun parseQuery(q: String): Map<String, String> = q.split('&').filter { it.contains('=') }.associate { it.substringBefore('=') to Uri.decode(it.substringAfter('=').replace("+", "%2B")) }

/**
 * The vocabulary destinations of the app frame: `review`, `practice[/<mode>]`, `mistakes`, `deck`, `library`, `topic/<id>` (page + arg + raw query of the web hash route).
 * [open] navigates to another web-style route, [replace] does the same but removes this screen from the back stack, [exit] goes back.
 */
@Composable
fun VocabRoute(env: VocabEnv, page: String, arg: String, query: String, slots: StudySlots, open: (String) -> Unit, replace: (String) -> Unit, exit: () -> Unit) {
    val q = remember(query) { parseQuery(query) }
    val ctx = LocalContext.current
    val k = "$page/$arg?$query"
    when (page) {
        "review" -> {
            val vm: ReviewVm = viewModel(key = "review-$k", factory = ReviewVm.Factory(env, q))
            val a = vm.actions(open, { openUrl(ctx, it) }, { shareText(ctx, it) }, exit)
            // the redirect (forgetting words -> Smart study) replaces the review screen
            val ui = vm.ui
            if (ui is ReviewUi.Redirect) androidx.compose.runtime.LaunchedEffect(ui.route) { replace(ui.route) }
            ReviewScreen(ui, withSay(a, vm), slots.image)
        }
        "practice" -> {
            val vm: PracticeVm = viewModel(key = "practice-$k", factory = PracticeVm.Factory(env, arg, q["src"].orEmpty()))
            val input = remember { AndroidSpeech(ctx) }
            DisposableEffect(input) { onDispose { input.stop() } }
            fun listen() { vm.listening(); input.start({ alts -> vm.spoke(alts) }, { code -> vm.speechError(code) }) }
            val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) listen() else vm.speechError("not-allowed") }
            val mic = { if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) listen() else ask.launch(Manifest.permission.RECORD_AUDIO) }
            PracticeScreen(vm.ui, vm.actions(open, exit, mic))
        }
        "mistakes" -> {
            val vm: MistakesVm = viewModel(key = "mistakes-$k", factory = MistakesVm.Factory(env, q["retry"] == "1", q["kind"].orEmpty().ifEmpty { "all" }))
            MistakesScreen(vm.ui, vm.actions(open, exit))
        }
        "deck" -> {
            val name = t(L10nKey.vocabMyWords)
            val vm: DeckVm = viewModel(key = "deck-$k", factory = DeckVm.Factory(env, q, name))
            DeckScreen(vm.ui, vm.actions(open, exit, rememberPlatform(), slots.image))
        }
        else -> {
            // library, or a topic (an unknown topic id draws the library)
            val vm: LibraryVm = viewModel(key = "library-$k", factory = LibraryVm.Factory(env, if (page == "topic") arg else null, q))
            val a = vm.actions(open, exit, rememberPlatform())
            val tp = vm.topic
            if (tp != null) TopicScreen(tp, a) else LibraryScreen(vm.lib, a)
        }
    }
}

/** The review screen speaks the summary's hard word through the VM; everything else is wired in [ReviewVm.actions]. */
private fun withSay(a: ReviewActions, vm: ReviewVm) = ReviewActions(
    a.flip, a.grade, a.undo, a.check, a.giveUp, a.hint, a.pick, a.next, a.reverse, { w, _ -> vm.sayHard(w) }, a.sayText, a.replay, a.saveSentence, a.saveNote, a.aid, a.shadow, a.open, a.openUrl, a.share, a.exit,
)

private fun openUrl(ctx: Context, url: String) { runCatching { ctx.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) } }
private fun shareText(ctx: Context, text: String) {
    runCatching { ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) }
}

/** Clipboard, share sheet and the Storage Access Framework for the JSON / Anki files. */
@Composable
private fun rememberPlatform(): DeckPlatform {
    val ctx = LocalContext.current
    var pending by remember { mutableStateOf<String?>(null) }
    var callback by remember { mutableStateOf<((String, String) -> Unit)?>(null) }
    var pendingBytes by remember { mutableStateOf<ByteArray?>(null) }
    var bytesCallback by remember { mutableStateOf<((ByteArray, String) -> Unit)?>(null) }
    val byteSaver = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("*/*")) { uri ->
        val b = pendingBytes; pendingBytes = null
        if (uri != null && b != null) runCatching { ctx.contentResolver.openOutputStream(uri)?.use { it.write(b) } }
    }
    val bytePicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        val cb = bytesCallback; bytesCallback = null
        if (uri != null && cb != null) {
            val data = runCatching { ctx.contentResolver.openInputStream(uri)?.use { it.readBytes() } }.getOrNull()
            val name = runCatching { ctx.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(0) else null } }.getOrNull() ?: "Anki"
            if (data != null) cb(data, name)
        }
    }
    val saver = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("*/*")) { uri ->
        val text = pending; pending = null
        if (uri != null && text != null) runCatching { ctx.contentResolver.openOutputStream(uri)?.use { it.write(text.toByteArray(Charsets.UTF_8)) } }
    }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        val cb = callback; callback = null
        if (uri != null && cb != null) {
            val text = runCatching { ctx.contentResolver.openInputStream(uri)?.use { it.readBytes().toString(Charsets.UTF_8) } }.getOrNull()
            val name = runCatching { ctx.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c -> if (c.moveToFirst()) c.getString(0) else null } }.getOrNull() ?: "Anki"
            if (text != null) cb(text, name)
        }
    }
    return remember(ctx) {
        object : DeckPlatform {
            override fun copy(text: String) { (ctx.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager)?.setPrimaryClip(ClipData.newPlainText("Lexkite", text)) }
            override fun send(text: String) = shareText(ctx, text)
            override fun saveFile(name: String, mime: String, content: String) { pending = content; saver.launch(name) }
            override fun pickFile(onText: (text: String, name: String) -> Unit) { callback = onText; picker.launch(arrayOf("*/*")) }
            override fun saveBytes(name: String, mime: String, bytes: ByteArray) { pendingBytes = bytes; byteSaver.launch(name) }
            override fun pickBytes(onBytes: (bytes: ByteArray, name: String) -> Unit) { bytesCallback = onBytes; bytePicker.launch(arrayOf("*/*")) }
        }
    }
}

// ---------------------------------------------------------------- Vocab tab root
class VocabHubState(val due: Int, val mistakes: Int, val words: Int, val mastered: Int)

/** The Vocabulary tab: five doors (review, practice, mistakes, my words, library) and the dictionary lookup, with live counts. */
@Composable
fun VocabHubRoute(env: VocabEnv, open: (String) -> Unit) {
    val version by env.store.version.collectAsState()
    val s by produceState<VocabHubState?>(null, version) {
        val d = env.load(); val now = env.now()
        val (n, k) = Deck.headline(d.cards.values)
        value = VocabHubState(TodayModel.dueCount(d.doc, now, TimeZone.getDefault()), d.mistakes.count { !it.gt("fixed") }, n, k)
    }
    VocabHubScreen(s, open)
}

@Composable
fun VocabHubScreen(s: VocabHubState?, open: (String) -> Unit) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Hub, t(L10nKey.tabVocab), t)
        Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            Door(Icons.Filled.Search, t(L10nKey.topSearch), null) { open("dict") }
            Door(Icons.Filled.Style, t(L10nKey.todayReview), s?.let { t(L10nKey.todayDueN, mapOf("n" to it.due)) }) { open("review") }
            Door(Icons.Filled.Bolt, t(L10nKey.revGamesPractice), null) { open("practice") }
            Door(Icons.Filled.ErrorOutline, t(L10nKey.todayMistakes), s?.let { t(L10nKey.todayToFix, mapOf("n" to it.mistakes)) }) { open("mistakes") }
            Door(Icons.Filled.Book, t(L10nKey.vocabMyWords), s?.let { t(L10nKey.vocabWordsMastered, mapOf("n" to it.words, "k" to it.mastered)) }) { open("deck") }
            Door(Icons.Filled.LibraryBooks, t(L10nKey.vocabVocabularyLibrary), null) { open("library") }
        }
    }
}

@Composable
private fun Door(icon: ImageVector, title: String, sub: String?, onClick: () -> Unit) {
    val c = LocalLKColors.current
    LKCard(onClick = onClick, label = title) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            Box(Modifier.size(48.dp).clip(CircleShape).background(c.secondaryContainer), contentAlignment = Alignment.Center) { Icon(icon, null, tint = c.onSecondaryContainer) }
            Column(Modifier.weight(1f)) { Body(title, style = LKType.titlePill); if (sub != null) Muted(sub) }
        }
    }
}

