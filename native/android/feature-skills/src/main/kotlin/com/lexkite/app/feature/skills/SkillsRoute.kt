package com.lexkite.app.feature.skills

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.parseQuery
import com.lexkite.app.feature.vocab.t
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.TopBar
import com.lexkite.app.ui.TopBarVariant

/** Web hash routes (first path segment) that [SkillsRoute] draws. */
val SKILLS_ROUTES: Set<String> = setOf("listening", "listen", "listen-test", "dictation", "reading", "read")

@Composable
private fun Loading(exit: () -> Unit) = StudyPage(t(L10nKey.actionLoading), exit) {}

/** Falls back to another route (an unknown part / passage goes to its list, like the web). */
@Composable
private fun Fallback(missing: Boolean, route: String, replace: (String) -> Unit) { if (missing) LaunchedEffect(Unit) { replace(route) } }

/**
 * The listening + reading destinations of the app frame: `listening`, `listen/<part>[?mode=exam]`, `listen-test/<n>`, `dictation/<part>[?m=mid|hard|full]`, `reading`, `read/<id>`.
 * [open] navigates to another web-style route, [replace] does the same without keeping this screen, [exit] goes back.
 */
@Composable
fun SkillsRoute(env: SkillsEnv, page: String, arg: String, query: String, open: (String) -> Unit, replace: (String) -> Unit, exit: () -> Unit) {
    val q = remember(query) { parseQuery(query) }
    val go = { h: String -> open(h.removePrefix("#/")) }
    val key = "$page/$arg?$query"
    when (page) {
        "listen" -> {
            val vm: ListenVm = viewModel(key = "listen-$key", factory = ListenVm.Factory(env, arg, q["mode"] == "exam"))
            Fallback(vm.missing, "listening", replace)
            val ui = vm.ui
            if (ui == null) Loading(exit) else ListenScreen(ui, ListenActions(
                play = { vm.play() }, back = { vm.back() }, rate = { vm.rate(it) }, live = { vm.live(it) }, answer = { k, v -> vm.answer(k, v) }, submit = { vm.submit() }, confirm = { vm.confirm(it) }, again = { vm.again() },
                line = { vm.line(it) }, word = { w, s -> vm.word(w, s) }, closePopup = { vm.closePopup() }, savePopup = { vm.savePopup() }, speakWord = { vm.speakWord() }, hear = { vm.hear(it) },
                saveVocab = { vm.saveVocab(it) }, retake = { vm.retake() }, recheck = { vm.recheck() }, showAll = { vm.showAll() }, switchMode = { vm.switchMode() }, open = go, exit = exit))
        }
        "listen-test" -> {
            val vm: TestVm = viewModel(key = "test-$key", factory = TestVm.Factory(env, arg.toIntOrNull() ?: 1))
            Fallback(vm.missing, "listening", replace)
            val ui = vm.ui
            if (ui == null) Loading(exit) else ListenTestScreen(ui, TestActions(start = { vm.start() }, skipRead = { vm.skipRead() }, tap = { vm.tap() }, answer = { k, v -> vm.answer(k, v) }, next = { vm.next() }, confirm = { vm.confirm(it) }, open = go, exit = exit))
        }
        "dictation" -> {
            val vm: DictVm = viewModel(key = "dict-$key", factory = DictVm.Factory(env, arg, q["m"]))
            Fallback(vm.missing, "listening", replace)
            val ui = vm.ui
            if (ui == null) Loading(exit) else DictationScreen(ui, DictActions(mode = { vm.mode(it) }, say = { vm.say(it) }, prev = { vm.prev() }, next = { vm.next() }, typed = { j, v -> vm.typed(j, v) }, full = { vm.full(it) }, check = { vm.check() },
                answer = { vm.answer() }, clear = { vm.clear() }, auto = { vm.auto(it) }, tr = { vm.tr(it) }, open = go, exit = exit))
        }
        "read" -> {
            val vm: ReaderVm = viewModel(key = "read-$key", factory = ReaderVm.Factory(env, arg))
            Fallback(vm.missing, "reading", replace)
            val ui = vm.ui
            if (ui == null) Loading(exit) else ReaderScreen(ui, ReaderActions(toggle = { vm.toggle(it) }, word = { w, s -> vm.word(w, s) }, keyword = { vm.keyword(it) }, saveAll = { vm.saveAll() }, readAloud = { vm.readAloud() }, pick = { i, v -> vm.pick(i, v) },
                grade = { vm.grade() }, confirm = { vm.confirm(it) }, closePopup = { vm.closePopup() }, savePopup = { vm.savePopup() }, speakWord = { vm.speakWord() }, details = { ui.popup?.let { p -> open("dict/" + p.word) } }, open = go, exit = exit))
        }
        "reading" -> {
            val vm: ReadingVm = viewModel(key = "reading-$key", factory = ReadingVm.Factory(env, q))
            val ui = vm.ui
            if (ui == null) Loading(exit) else ReadingListScreen(ui, ReadingActions(level = { vm.level(it) }, open = go, exit = exit))
        }
        else -> {
            val vm: HubVm = viewModel(key = "hub-$key", factory = HubVm.Factory(env, q, LocalL10n.current.lang))
            ListenHubScreen(vm.ui, HubActions(go, { vm.test(it) }, exit))
        }
    }
}

/** Root of the Skills tab: the listening and reading doors (the other skills arrive with their own milestones). */
@Composable
fun SkillsHubRoute(open: (String) -> Unit) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxSize().background(c.background)) {
        TopBar(TopBarVariant.Hub, t(L10nKey.tabSkills), t)
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
            LKCard(onClick = { open("listening") }, label = t(L10nKey.skillListenLuyenNgheIelts)) { Body("🎧 " + t(L10nKey.skillListenLuyenNgheIelts), style = LKType.titlePill); Muted(t(L10nKey.skillListenThiThu40Cau)) }
            LKCard(onClick = { open("reading") }, label = t(L10nKey.skillReadBaiDocIelts)) { Body("📖 " + t(L10nKey.skillReadBaiDocIelts), style = LKType.titlePill); Muted(t(L10nKey.skillReadNCauTrueFalse, mapOf("n" to 5))) }
            // M4 P07: speaking, pronunciation and the other speaking games (screens in :feature-speak; titles are the web's source keys, translated from the speak.* ids)
            val tr = t
            for ((r, emoji, key) in listOf(Triple("speaking", "🗣️", "Phòng luyện Speaking"), Triple("pron", "🔤", "Thư viện phát âm"), Triple("say", "💬", "Nói như người bản xứ"), Triple("reflex", "⚡", "Phản xạ 60 giây"),
                Triple("rtype", "🎯", "Luyện Reading theo dạng câu hỏi"), Triple("roleplay", "🎭", "Hội thoại đóng vai"), Triple("call", "📞", "Gọi cho Ama & Carlos"), Triple("handsfree", "🎧", "Học rảnh tay"),
                // M4 P09: writing (screens in :feature-vocab, WORD_ROUTES)
                Triple("write", "✍️", "Phòng viết"), Triple("task1", "📈", "Writing Task 1"), Triple("criteria", "📊", "Tiêu chí chấm IELTS"), Triple("qstats", "📊", "Tiến bộ theo kỹ năng và dạng câu hỏi")))
                LKCard(onClick = { open(r) }, label = tr.src(key)) { Body(emoji + " " + tr.src(key), style = LKType.titlePill) }
        }
    }
}
