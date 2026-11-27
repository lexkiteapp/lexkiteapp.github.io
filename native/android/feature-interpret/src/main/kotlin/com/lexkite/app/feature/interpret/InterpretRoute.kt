package com.lexkite.app.feature.interpret

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel

/** Web hash route of the Interpreter (`interpret`, `interpret/phrases[/<group>]`, `interpret/history`, `interpret/recap/<id>`): reached from the Skills hub, never a main tab. */
val INTERPRET_ROUTES: Set<String> = setOf("interpret")

/** RECORD_AUDIO is asked only when a mic is tapped. */
@Composable
private fun rememberMicGate(): (granted: () -> Unit, denied: () -> Unit) -> Unit {
    val ctx = LocalContext.current
    var pending by remember { mutableStateOf<Pair<() -> Unit, () -> Unit>?>(null) }
    val ask = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok -> val p = pending; pending = null; if (p != null) { if (ok) p.first() else p.second() } }
    return remember(ctx) { { yes: () -> Unit, no: () -> Unit -> if (ctx.checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) yes() else { pending = yes to no; ask.launch(Manifest.permission.RECORD_AUDIO) } } }
}

@Composable
fun InterpretRoute(env: InterpretEnv, arg: String, open: (String) -> Unit, replace: (String) -> Unit, exit: () -> Unit) {
    val gate = rememberMicGate(); val parts = arg.split('/'); val page = parts.firstOrNull().orEmpty(); val rest = parts.getOrNull(1)
    when (page) {
        "phrases" -> {
            val vm: PhrasesVm = viewModel(key = "ip-phrases", factory = PhrasesVm.Factory(env, rest))
            PhrasesScreen(PhrasesUi(vm.pair, vm.book, vm.failed, vm.group, vm.score, vm.toast, vm.saying),
                PhrasesActions(open = replace, group = { vm.pick(it) }, lang = { s, l -> vm.setLang(s, l) }, play = { i, slow -> vm.play(i, slow) }, save = { vm.save(it) }, say = { i -> gate({ vm.sayBack(i) }, { vm.sayDenied() }) }, exit = exit))
        }
        "history" -> {
            val vm: HistoryVm = viewModel(key = "ip-history", factory = HistoryVm.Factory(env, null))
            HistoryScreen(vm.convs, HistoryActions(open = { if (it.startsWith("interpret/recap/")) open(it) else replace(it) }, clear = { vm.clear() }, exit = exit))
        }
        "recap" -> {
            val id = rest.orEmpty(); val vm: HistoryVm = viewModel(key = "ip-recap-$id", factory = HistoryVm.Factory(env, id))
            val c = vm.conv
            if (vm.convs != null && c == null) { androidx.compose.runtime.LaunchedEffect(Unit) { replace("interpret/history") } }
            else if (c != null) RecapScreen(vm.cards, vm.keywords, if (c.a == com.lexkite.app.core.interpret.Interpret.base(env.me)) c.b else c.a, vm.toast, RecapActions(open = replace, speak = { vm.speak(it) }, saveAll = { vm.saveAll() }, exit = { replace("interpret/history") }))
        }
        else -> {
            val vm: TalkVm = viewModel(key = "ip-talk", factory = TalkVm.Factory(env))
            TalkScreen(TalkUi(vm.pair, vm.heard, vm.live, vm.listening, vm.busy, vm.last != null, vm.badge, vm.score, vm.toast, vm.packBusy, env.speech.available),
                TalkActions(mic = { s -> gate({ vm.mic(s) }, { vm.micDenied() }) }, lang = { s, l -> vm.setLang(s, l) }, swap = { vm.swap() }, play = { vm.play() }, slow = { vm.play(true) }, save = { vm.save() },
                    say = { gate({ vm.sayBack() }, { vm.sayDenied() }) }, pack = { vm.pack() }, finish = { vm.end(replace) }, open = replace, exit = exit))
        }
    }
}
