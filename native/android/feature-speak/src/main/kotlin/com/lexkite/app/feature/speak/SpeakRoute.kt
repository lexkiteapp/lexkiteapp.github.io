package com.lexkite.app.feature.speak

import androidx.activity.compose.BackHandler
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.parseQuery
import com.lexkite.app.feature.vocab.t
import com.lexkite.app.i18n.generated.L10nKey

/** Web hash routes (first path segment) that [SpeakRoute] draws. */
val SPEAK_ROUTES: Set<String> = setOf("speak", "speaking", "pron", "say", "reflex", "rtype", "roleplay", "handsfree")

/** P08: the call screens (`call`, `call/<id>`) are drawn by [SpeakRoute] too, on the same destination (the P07 route set above stays as it was). */
val CALL_ROUTES: Set<String> = setOf("call")

@Composable
private fun Loading(exit: () -> Unit) = StudyPage(t(L10nKey.actionLoading), exit) {}

/** Goes to another route when the one asked for does not exist (an unknown lesson / series falls back to its list, like the web). */
@Composable
private fun Fallback(to: String?, replace: (String) -> Unit) { if (to != null) LaunchedEffect(to) { replace(to) } }

/**
 * The speaking destinations of the app frame: `speak/<situation>[/drill?stage=]` (behind the `speak_pack` flag), `speaking/<p1|p2|p3>/<topic>`, `pron[/<sound>]`, `say[/<series>/<card>]`, `reflex`,
 * `rtype[/<kind>]`, `roleplay[/<script>]`, `handsfree[/<topic>|session]`. [open] navigates to another web-style route, [replace] does the same without keeping this screen, [exit] goes back.
 */
@Composable
fun SpeakRoute(env: SpeakEnv, slots: SpeakSlots, page: String, arg: String, query: String, open: (String) -> Unit, replace: (String) -> Unit, exit: () -> Unit) {
    val q = remember(query) { parseQuery(query) }; val lang = LocalL10n.current.lang; val gate = rememberMicGate(); val key = "$page/$arg?$query"
    CompositionLocalProvider(LocalSpeakSlots provides slots) {
        when (page) {
            "speak" -> {
                val parts = arg.split('/'); val id = parts[0]
                if (parts.getOrNull(1) == "drill") {
                    val vm: DrillVm = viewModel(key = "drill-$key", factory = DrillVm.Factory(env, id, q["stage"]))
                    Fallback(vm.gone, replace); LaunchedEffect(vm.done) { if (vm.done != null && vm.gone == null) replace("speak/$id") }
                    val ui = vm.ui
                    if (ui == null) Loading(exit) else SpeakDrillScreen(ui, DrillActions(play = { vm.play() }, slow = { vm.slow() }, mic = { gate({ vm.mic() }, { vm.micDenied() }) }, tapWord = { vm.tapWord(it) }, next = { vm.next() }, alt = { vm.alt() }, exit = exit))
                } else {
                    val vm: SitVm = viewModel(key = "sit-$key", factory = SitVm.Factory(env, id))
                    Fallback(vm.gone, replace)
                    val ui = vm.ui
                    if (ui == null) Loading(exit) else SpeakSituationScreen(ui, SitActions(drill = { st -> open("speak/${ui.id}/drill" + if (st != null) "?stage=$st" else "") }, roleplay = { open("roleplay") }, exit = exit))
                }
            }
            "speaking" -> {
                val vm: SpeakingVm = viewModel(key = "speaking-$key", factory = SpeakingVm.Factory(env, arg))
                val ui = vm.ui
                if (ui == null && vm.empty) StudyPage(trs(com.lexkite.app.core.speak.Tr("Phòng luyện Speaking")), exit) { com.lexkite.app.feature.vocab.EmptyState("🗣️", trs(com.lexkite.app.core.speak.Tr("Không tải được – thử lại sau"))) }
                else if (ui == null) Loading(exit) else SpeakingScreen(ui, SpeakingActions(part = { p -> replace("speaking/$p/${ui.page.index}") }, topic = { i -> replace("speaking/${ui.page.part}/$i") }, random = { vm.random() }, topics = { vm.topics(it) }, hear = { vm.hear() },
                    nextQ = { vm.nextQ() }, mic = { gate({ vm.mic() }, { vm.micDenied() }) }, skipPrep = { vm.skipPrep() }, addWord = { vm.addWord(it) }, speakWord = { vm.speakWord(it) }, playSample = { vm.playSample() }, shadow = { vm.shadow() },
                    shadowHear = { vm.shadowHear(it) }, shadowMic = { gate({ vm.shadowMic() }, { vm.micDenied() }) }, shadowNext = { vm.shadowNext() }, savePhrase = { a, b -> vm.savePhrase(a, b) }, exit = exit))
            }
            "pron" -> if (arg.isEmpty()) {
                val vm: PronHubVm = viewModel(key = "pron-hub", factory = PronHubVm.Factory(env))
                PronHubScreen(vm.ui, vm.done, PronHubActions(open = { open("pron/" + java.net.URLEncoder.encode(it, "UTF-8").replace("+", "%20")) }, exit = exit))
            } else {
                val vm: PronSoundVm = viewModel(key = "pron-$key", factory = PronSoundVm.Factory(env, arg))
                Fallback(if (vm.missing) "pron" else null, replace)
                BackHandler(enabled = vm.pairs != null || vm.say != null || vm.rhythm != null) { if (vm.pairs != null) vm.closePairs() else if (vm.say != null) vm.closeSay() else vm.closeRhythm() }
                val ui = vm.ui; val pairs = vm.pairs; val say = vm.say; val rh = vm.rhythm
                when {
                    ui == null -> Loading(exit)
                    pairs != null -> PronPairsScreen(pairs, ui.l.title, PairsActions(replay = { vm.playRound() }, select = { vm.select(it) }, check = { vm.check() }, again = { vm.startPairs() }, exit = { vm.closePairs() }))
                    say != null -> PronSayScreen(say, ui.l.title, SayActions(start = { vm.startSay() }, hear = { vm.sayHear(it) }, mic = { gate({ vm.sayMic() }, { vm.sayMicDenied() }) }, next = { vm.sayNext() }, fallback = { vm.closeSay(); vm.startPairs() }, exit = { vm.closeSay() }))
                    rh != null -> PronRhythmScreen(rh, ui.l.title, { vm.coachBand(it) }, RhythmActions(pick = { vm.rPick(it) }, hear = { vm.rHear(it) }, shadow = { gate({ vm.rShadow() }, { vm.rMicDenied() }) }, open = { open("pron/" + java.net.URLEncoder.encode(it, "UTF-8").replace("+", "%20")) }, go = { vm.rPick(it) }, exit = { vm.closeRhythm() }))
                    else -> PronSoundScreen(ui, PronSoundActions(hear = { w, slow -> vm.hear(w, slow) }, wordMic = { k -> gate({ vm.wordMic(k) }, { vm.micDenied() }) }, sentenceMic = { k -> gate({ vm.sentenceMic(k) }, { vm.micDenied() }) }, hearText = { vm.hearText(it) },
                        startPairs = { vm.startPairs() }, startSay = { vm.startSay() }, startRhythm = { vm.startRhythm() }, pickQuiz = { qi, j -> vm.pickQuiz(qi, j) }, open = { id -> open(if (id.isEmpty()) "pron" else "pron/" + java.net.URLEncoder.encode(id, "UTF-8").replace("+", "%20")) }, exit = exit))
                }
            }
            "say" -> {
                val vm: SayVm = viewModel(key = "say-$key", factory = SayVm.Factory(env, arg, lang)); val share = rememberShare(); val l10n = t
                Fallback(vm.redirect, replace)
                val card = vm.card; val list = vm.list
                when {
                    card != null -> SayCardScreen(card, SayActions2(open = open, flip = { vm.flip() }, speak = { vm.speak(it) }, mic = { gate({ vm.mic() }, { vm.micDenied() }) }, share = { share(l10n.tr(card.share)) }, exit = exit))
                    list != null -> SayListScreen(list, SayActions2(open = open, retry = { vm.load() }, exit = exit))
                    else -> Loading(exit)
                }
            }
            "reflex" -> {
                val vm: ReflexVm = viewModel(key = "reflex", factory = ReflexVm.Factory(env))
                ReflexScreen(vm.ui, ReflexActions(start = { gate({ vm.start() }, { vm.micDenied() }) }, next = { vm.next() }, skip = { vm.skip() }, exit = exit))
            }
            "rtype" -> if (arg.isEmpty() || com.lexkite.app.core.speak.Rtype.kind(arg) == null) {
                val vm: RtypeHubVm = viewModel(key = "rtype-hub", factory = RtypeHubVm.Factory(env)); val ui = vm.ui
                if (ui == null) Loading(exit) else RtypeHubScreen(ui, RtypeActions(open = open, exit = exit))
            } else {
                val vm: RtypeRunVm = viewModel(key = "rtype-$arg", factory = RtypeRunVm.Factory(env, arg)); val ui = vm.ui
                if (ui == null) Loading(exit) else RtypeRunScreen(ui, RtypeActions(open = open, answer = { k, v -> vm.answer(k, v) }, check = { vm.check() }, next = { vm.next() }, locate = { vm.locate(it) }, exit = exit))
            }
            "roleplay" -> {
                val vm: RoleplayVm = viewModel(key = "roleplay-$key", factory = RoleplayVm.Factory(env, arg, lang))
                Fallback(vm.gone, replace)
                val acts = RpActions(open = { r -> if (r.startsWith("roleplay/")) vm.open(r.removePrefix("roleplay/")) else open(r) }, level = { vm.level(it) }, save = { vm.save(it) }, start = { vm.start() }, input = { vm.input(it) }, send = { vm.send() }, mic = { vm.mic() },
                    hint = { vm.hint() }, help = { vm.help() }, end = { vm.end() }, speak = { vm.speak(it) }, saveRewrite = { vm.saveRewrite(it) }, again = { vm.again() }, back = { vm.toList() }, exit = exit)
                BackHandler(enabled = vm.chat != null || vm.result != null || vm.brief != null) { if (vm.chat != null || vm.result != null) vm.toBrief() else vm.toList() }
                val chat = vm.chat; val result = vm.result; val brief = vm.brief; val list = vm.list
                when {
                    chat != null -> RoleplayChatScreen(chat, RpActions(open = acts.open, input = acts.input, send = acts.send, mic = acts.mic, hint = acts.hint, help = acts.help, end = acts.end, speak = acts.speak, exit = { vm.toBrief() }), { go -> gate(go) { vm.micDenied() } })
                    result != null -> RoleplayResultScreen(result, RpActions(open = acts.open, speak = acts.speak, saveRewrite = acts.saveRewrite, again = acts.again, back = { vm.toList() }, exit = { vm.toBrief() }))
                    brief != null -> RoleplayBriefScreen(brief, RpActions(level = acts.level, save = acts.save, start = acts.start, back = { vm.toList() }, exit = { vm.toList() }))
                    list != null -> RoleplayListScreen(list, RpActions(open = acts.open, level = acts.level, exit = exit))
                    else -> Loading(exit)
                }
            }
            "call" -> {
                val vm: CallVm = viewModel(key = "call-$key", factory = CallVm.Factory(env, arg, lang))
                Fallback(vm.gone, replace)
                val acts = CallActions(open = open, filter = { vm.filter(it) }, changeAsr = { vm.changeAsr() }, go = { vm.go() }, back = { vm.toList() }, mic = { vm.mic() }, typed = { vm.typedInput(it) }, submit = { vm.submit() }, tap = { vm.tap(it) },
                    longDone = { vm.longDone() }, ask = { vm.pick(it) }, toggleTyping = { vm.toggleTyping() }, replay = { vm.replay() }, hang = { vm.hang() }, retry = { vm.retry() }, save = { vm.save() }, speak = { x, r -> vm.speak(x, r) }, exit = exit)
                val room = vm.room; val summary = vm.summary; val ring = vm.ring; val list = vm.list
                BackHandler(enabled = room != null || summary != null || ring != null) { if (room != null) vm.hang() else vm.toList() }
                when {
                    room != null -> CallRoomScreen(room, acts) { go -> gate(go) { vm.micDenied() } }
                    summary != null -> CallSummaryScreen(summary, CallActions(open = { r -> if (r.startsWith("call/")) vm.open(r.removePrefix("call/")) else open(r) }, speak = acts.speak, retry = acts.retry, save = acts.save, back = acts.back, exit = { vm.toList() }))
                    ring != null -> CallRingScreen(ring, CallActions(go = acts.go, back = acts.back, exit = { vm.toList() }))
                    list != null -> CallListScreen(list, CallActions(open = { r -> vm.open(r.removePrefix("call/")) }, filter = acts.filter, changeAsr = acts.changeAsr, exit = exit))
                    vm.empty -> StudyPage(trs(com.lexkite.app.core.speak.Tr("Gọi cho Ama & Carlos")), exit) { com.lexkite.app.feature.vocab.EmptyState("📞", trs(com.lexkite.app.core.speak.Tr("Không tải được – thử lại sau"))) }
                    else -> Loading(exit)
                }
            }
            else -> {
                val ctx = LocalContext.current.applicationContext
                val vm: HandsFreeVm = viewModel(key = "hf-$key", factory = HandsFreeVm.Factory(env, arg, lang))
                androidx.compose.runtime.DisposableEffect(vm) { val s = HfSession(ctx); vm.attach(s); onDispose { } }
                val ui = vm.ui
                if (ui == null) Loading(exit) else HandsFreeScreen(ui, HfActions(toggle = { vm.toggle() }, next = { vm.next() }, prev = { vm.prev() }, ex = { vm.ex(it) }, mean = { vm.mean(it) }, ambient = { vm.ambient(it) }, exit = exit))
            }
        }
    }
}
