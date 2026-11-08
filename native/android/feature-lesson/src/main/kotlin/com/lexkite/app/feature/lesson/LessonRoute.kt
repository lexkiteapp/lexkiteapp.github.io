package com.lexkite.app.feature.lesson

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.delay

/**
 * P03 route: the focus screen reached by `lexkite://lesson/go[?story=<id>]`. Owns the ViewModel, the microphone permission and speech input,
 * auto-plays the sentence of each listening exercise and shares the result. [speech] lets tests inject the recognizer.
 */
@Composable
fun LessonRoute(env: LessonEnv, req: LessonRequest, slots: LessonSlots, onExit: () -> Unit, speech: SpeechInput? = null) {
    val ctx = LocalContext.current; val t = LocalL10n.current
    var round by remember { mutableIntStateOf(0) }
    val vm: LessonViewModel = viewModel(key = "lesson-${req.kind}-${req.story}-$round", factory = LessonViewModel.Factory(env, req))
    val ui by vm.ui.collectAsState(); val gold by vm.gold.collectAsState(); val pose by vm.pose.collectAsState()
    val input = remember(speech) { speech ?: AndroidSpeech(ctx) }
    var mic by remember { mutableStateOf(MicUi()) }
    DisposableEffect(input) { onDispose { input.stop() } }

    fun listen() {
        val cur = vm.ui.value?.cur ?: return
        vm.stopAudio(); mic = MicUi(listening = true)
        input.start({ alts -> mic = MicUi(); val (heard, score) = com.lexkite.app.core.lesson.Speaking.best(cur.answer, alts); vm.spoke(score, heard) }, { code ->
            mic = MicUi()
            when (code) { "no-speech" -> vm.unclear(); "unsupported" -> vm.skipSpeak(); else -> mic = MicUi(error = true) }
        })
    }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> if (granted) listen() else mic = MicUi(error = true) }

    val cur = ui?.cur
    // read the sentence of a listening exercise (and every story line / question) once when it appears
    LaunchedEffect(cur?.id, cur?.retry) {
        val c = cur ?: return@LaunchedEffect
        if (ui?.feedback != null || ui?.finish != null) return@LaunchedEffect
        delay(250)
        if (c.type == "line") vm.say(c.sent.orEmpty(), false, c.who ?: vm.who)
        else if (c.type == "q") vm.say(c.prompt.orEmpty(), false, c.who ?: vm.who)
        else if (listens(c)) vm.say(vm.audioText(c), false, c.who ?: vm.who)
    }

    val actions = LessonActions(
        pick = vm::pick, placeTile = vm::placeTile, removeTile = vm::removeTile, type = vm::type, bankTap = vm::bankTap, bankBack = vm::bankBack, useBank = vm::useBank,
        matchTap = vm::matchTap, clearFlash = vm::clearFlash, hint = vm::hint, check = vm::check, next = vm::next, lineContinue = vm::lineContinue,
        play = { it, slow -> vm.say(vm.audioText(it), slow, it.who ?: vm.who) }, playText = { text, who, slow -> vm.say(text, slow, who) }, playWord = { w, acc -> vm.sayWord(w, acc) },
        skipListen = vm::skipListen, skipSpeak = vm::skipSpeak,
        mic = { if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) listen() else ask.launch(Manifest.permission.RECORD_AUDIO) },
        close = { vm.stopAudio(); onExit() }, again = { vm.stopAudio(); round++ },
        share = { text -> ctx.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), null).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)) },
    )
    val kind = when (req.kind) { "lesson" -> L10nKey.lessonKindLesson; "listen" -> L10nKey.lessonKindListen; "speak" -> L10nKey.lessonKindSpeak; "review" -> L10nKey.lessonKindReview; "story" -> L10nKey.lessonKindStory; else -> null }
    val u = ui
    if (u == null) Box(Modifier.fillMaxSize().background(LocalLKColors.current.background))
    else LessonScreen(u, vm.who, kind?.let { t(it) }.orEmpty(), actions, slots, mic, pose, gold, env.imageUrl, vm.teacher)
}
