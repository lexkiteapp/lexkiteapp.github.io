package com.lexkite.app.core.call

import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.speak.Tr
import com.lexkite.app.core.speak.jsRound

/** What the platform recogniser is asked to do for one turn: [local] = on-device only (never cloud), [long] = a long Part 2 turn, [words] = bias phrases (topic words of the node). */
class CallListenOpts(val target: String, val local: Boolean, val whisper: Boolean, val long: Boolean, val maxMs: Int, val words: List<String>)
/** A running recognition: [stop] = the learner is done (the result is still delivered) · [cancel] = abort (nothing is delivered). */
interface CallRec { fun stop(); fun cancel() }
/** Recogniser events: [start] listening began · [result] heard text (+ score, never used for scoring) · [error] code · [end] the recogniser is finished (also after a result or a stop). */
class CallCallbacks(val start: () -> Unit, val result: (heard: String, score: Int?) -> Unit, val error: (String) -> Unit, val end: () -> Unit)

/** The platform seams of a call: speech out, recogniser, timers, clock, toasts, preferences, the finished call. Everything else is [CallSession]. */
interface CallIO {
    fun now(): Long
    /** The recognition path now (local · cloud · ask · tap · whisper): the platform reads the remembered choice and what the device offers. */
    fun mode(): String
    fun pref(k: String): String?
    fun setPref(k: String, v: String)
    /** Speak one line with the teacher's voice; [onEnd] when it ends (or the platform gave up waiting). */
    fun say(text: String, onEnd: () -> Unit)
    fun stopSay()
    fun recognize(o: CallListenOpts, cb: CallCallbacks): CallRec?
    fun after(ms: Long, f: () -> Unit)
    fun react(pose: String, ms: Int)
    fun listenPose(on: Boolean)
    fun toast(t: Tr, ms: Int)
    fun toastErr(code: String, ms: Int)
    /** The call ended with a summary (the platform pays the reward and shows the summary). */
    fun finished(r: CallResult)
    /** Hung up before any answer: back to the list, no summary, no reward. */
    fun hangup()
    /** The view of the session changed. */
    fun changed()
    /** Every phase change (talk · you · listen · think · done) – a hook for tests and haptics. */
    fun phase(p: String) {}
}
class CallResult(val call: Call, val recap: Recap, val voiced: Int, val reward: Reward, val secs: Int, val log: List<LogEntry>)

/** What the device offers for the recognition choice box (web env probe). */
class CallAskEnv(val localDl: Boolean = false, val media: Boolean = false, val ext: Boolean = false, val sr: Boolean = false)

/** The tip under the suggestions: the default hint, a grammar fix or a sound-pair slip. */
sealed class CallTip { object Default : CallTip(); class FixTip(val fix: Fix) : CallTip(); class SlipTip(val slip: Slip) : CallTip() }
/** The cue card of a preparation / long node. */
/** [text] = the English prompt of a preparation card; [tr] = the translated title of a long-turn card. */
class CueView(val prep: Boolean, val text: String?, val tr: Tr?, val points: List<String>, val clock: String, val long: Boolean, val longWords: Int?) {
    fun with(clock: String = this.clock, longWords: Int? = this.longWords) = CueView(prep, text, tr, points, clock, long, longWords)
}
/** One immutable snapshot of what the learner sees. */
class CallView(val nodeId: String?, val phase: String, val lines: List<String>, val you: String, val tip: CallTip, val options: List<String>, val cue: CueView?, val ask: List<AskChoice>?, val pct: Int,
               val typeOpen: Boolean, val micDisabled: Boolean, val logged: Int, val showTr: Boolean)

/**
 * One live call (web call.js `start()`): the teacher speaks, the learner answers by voice, keyboard or tapping a suggestion; branching, fixes, slips, preparation / long turns and the recognition path are the web rules.
 * Time, speech and the recogniser come from [io]; a result that arrives after the turn counter moved is ignored (the turn-id guard of the web).
 */
class CallSession(private val e: CallEngine, val call: Call, private val io: CallIO, private val askEnv: CallAskEnv, private val uiIsEnglish: Boolean) {
    private class Extra(val secs: Double? = null, val asr: Int? = null, val typed: Boolean = false)

    private var id: String? = call.start
    var phase = "talk"; private set
    private var turn = 0; private var autoMic = false; private var busy = false; private var dead = false; private var sayRun = 0
    private var tAsk = 0L; private var prepEnd = 0L; private var longEnd = 0L; private val longBuf = ArrayList<String>()
    private var rec: CallRec? = null; private var recMy = 0; private var endedMy = -1
    private val t0 = io.now(); private val depthN = e.depth(call)
    val log = ArrayList<LogEntry>()
    private var lines: List<String> = emptyList(); private var you = ""; private var tip: CallTip = CallTip.Default; private var options: List<String> = emptyList()
    private var cue: CueView? = null; private var clock = ""; private var longWords: Int? = null; private var ask: List<AskChoice>? = null; private var pct = 0
    private var typeOpen = false; private var micDisabled = false; private var showTr = io.pref("tr") != "0" && !uiIsEnglish
    val alive get() = !dead
    val nodeId get() = id
    val teacher get() = call.teacher

    fun view() = CallView(id, phase, lines, you, tip, options, cue, ask, pct, typeOpen, micDisabled, log.size, showTr)
    private fun node(): CNode? = call.node(id)
    private fun changed() = io.changed()

    private fun setPhase(p: String) {
        phase = p; io.listenPose(p == "listen"); if (p == "think") io.react("thinking", 1500)
        io.phase(p); changed()
    }

    /** Opens the call: the first line, then the first turn. */
    fun begin() { val first = node() ?: return; showOpts(); say(listOf(first.m)) { enter(first) } }

    // ---------- teacher speech ----------
    private fun say(parts: List<String>, then: (() -> Unit)? = null) {
        val cur = parts.filter { it.isNotEmpty() }; lines = cur; val my = ++sayRun
        setPhase("talk")
        fun done() { if (my != sayRun || !alive) return; setPhase("you"); if (then != null) then() else if (autoMic && (node()?.prep ?: 1) == 0) listen() }
        fun one(k: Int) {
            if (my != sayRun || !alive) return
            if (k >= cur.size) { done(); return }
            var fin = false; io.say(cur[k]) { if (!fin) { fin = true; one(k + 1) } }
        }
        one(0)
    }
    private fun hush() { sayRun++; io.stopSay() }
    /** The speaker button: the last teacher lines again. */
    fun replay(): String? = if (lines.isEmpty() || phase == "listen") null else lines.joinToString(" ")

    // ---------- the node: options + cue ----------
    private fun showOpts() {
        val n = node(); clock = ""; longWords = null // the web redraws the cue card: an empty clock and counter until the next tick / chunk
        cue = if (n != null && (n.hasCue || n.long)) {
            val points = if (n.hasCue) n.cue else (call.node(call.start)?.cue ?: emptyList())
            if (n.prep > 0) CueView(true, n.m.split(". ").last(), null, points, clock, n.long, longWords) else CueView(false, null, Tr("Lượt nói dài: 1–2 phút"), points, clock, n.long, longWords)
        } else null
        options = n?.o?.map { if (n.long) it.split(Regex("(?<=\\.)\\s")).take(2).joinToString(" ") + " …" else it } ?: emptyList()
        changed()
    }
    fun tapOption(k: Int) { val n = node() ?: return; val o = n.o.getOrNull(k) ?: return; if (n.long) answer(o, true, true) else answer(o, true) }

    // ---------- answering ----------
    private fun answer(text0: String, picked: Boolean, force: Boolean = false, ex: Extra = Extra()) {
        var text = text0.replace(Regex("\\s+"), " ").trim(); val n = node()
        if (text.isEmpty() || busy || !alive || n == null) return
        if (n.long && !force) { // Part 2: chunks are gathered until the clock ends or "Tôi nói xong"
            longBuf.add(text); val all = longBuf.joinToString(" "); you = all; longWords = e.fluency(all).words
            if (longEnd != 0L && io.now() < longEnd - 3000 && autoMic) io.after(250) { if (alive && phase != "listen") listen() }
            cue = cue?.with(longWords = longWords); changed(); return
        }
        busy = true; setPhase("think"); prepEnd = 0
        stopRec(); hush()
        if (n.long && longBuf.isNotEmpty() && !picked) text = longBuf.joinToString(" ")
        if (n.long) { longEnd = 0; longBuf.clear() }
        tip = CallTip.Default
        if (e.unsafe(call.tl)?.containsMatchIn(text) == true) { busy = false; say(listOf(CallEngine.UNSAFE_LINE, n.m)); return }
        val secs = if (tAsk != 0L) maxOf(0.0, (io.now() - tAsk) / 1000.0) else 0.0
        if (n.prep == 0) log.add(LogEntry(id!!, text, picked, ex.secs ?: (if (picked) 0.0 else secs), ex.asr, ex.typed))
        if (!picked) you = "🗣️ $text"
        val fix = if (picked || n.prep > 0) null else e.correct(text, n.m); val sl = if (picked || n.prep > 0) emptyList() else e.slips(text, call, n)
        io.react(if (fix != null || sl.isNotEmpty()) "encourage" else "happy", 2200)
        tip = if (fix != null) CallTip.FixTip(fix) else if (sl.isNotEmpty()) CallTip.SlipTip(sl[0]) else CallTip.Default
        val r = e.step(call, id!!, text); id = r.next; turn++
        val nx = node(); pct = if (nx != null) minOf(e.pctMax, jsRound(log.size.toDouble() / maxOf(1, depthN) * 100)) else 100
        busy = false
        say(listOf(r.react, nx?.m ?: call.end)) { enter(nx) }
        showOpts(); if (nx == null) { options = emptyList(); changed() }
    }
    private fun enter(nx: CNode?) {
        tAsk = io.now()
        if (nx == null) { setPhase("done"); micDisabled = true; changed(); io.after(900) { if (alive) finish() }; return }
        if (nx.prep > 0) { prepEnd = io.now() + nx.prep * 1000L; showOpts(); return }
        if (nx.long) { longEnd = io.now() + e.longSeconds * 1000L; longBuf.clear(); showOpts() }
        if (autoMic) listen()
    }
    /** "Tôi nói xong" / the clock ran out: the gathered chunks are ONE answer; nothing said ⇒ the model answer (picked). */
    fun longDone() { val n = node(); if (n == null || !n.long) return; val all = longBuf.joinToString(" "); if (all.isNotEmpty()) answer(all, false, true) else answer(n.o.firstOrNull() ?: "", true, true) }
    /** The 500 ms tick: the preparation / long-turn countdown (only while the cue card is shown). */
    fun tick() {
        if (!alive) return; val c = cue ?: return; val now = io.now()
        if (prepEnd != 0L) { val s = Math.ceil((prepEnd - now) / 1000.0).toInt(); clock = CallEngine.mmss(s); cue = c.with(clock = clock); changed(); if (s <= 0) { prepEnd = 0; answer(Tr("(đã chuẩn bị xong)").k, true, true) } }
        else if (longEnd != 0L) { val s = Math.ceil((longEnd - now) / 1000.0).toInt(); clock = CallEngine.mmss(s); cue = c.with(clock = clock); changed(); if (s <= 0) { longEnd = 0; longDone() } }
    }

    // ---------- recognition ----------
    private fun stopRec() { val r0 = rec; if (r0 != null) { rec = null; runCatching { r0.cancel() } } }
    private fun listen() {
        if (!alive || rec != null) return
        val n = node(); if (n == null || n.prep > 0) return
        val m = io.mode()
        if (m == "ask") { askAsr(); return }
        if (m == "tap") { autoMic = false; typeOpen = true; io.toast(Tr("Trên thiết bị này hãy chạm gợi ý hoặc gõ câu trả lời."), 3500); changed(); return }
        hush(); setPhase("listen")
        val my = ++turn; val s0 = io.now()
        val words = (e.words((n.o + n.kw + call.words).joinToString(" "))).distinct().filter { it.length > 3 }.take(40)
        val cb = CallCallbacks(
            start = { if (my == turn) setPhase("listen") },
            result = { heard, score -> if (my == turn && alive) { turn++; if (heard.isNotEmpty()) answer(heard, false, false, Extra(secs = (io.now() - s0) / 1000.0, asr = score)) else setPhase("you") } },
            error = { code -> if (my == turn) { autoMic = false; setPhase("you"); io.toastErr(code, if (code == "no-speech") 2500 else 3500) } },
            end = { endedMy = my; if (rec != null && recMy == my) rec = null; if (rec == null && phase == "listen") setPhase("you") })
        val h = io.recognize(CallListenOpts(n.o.firstOrNull() ?: "", m == "local", m == "whisper", n.long, if (n.long) 28000 else minOf(15000, 3000 + (if (n.min != 0) n.min else 8) * 450), words), cb)
        if (h != null && endedMy != my) { rec = h; recMy = my }
        if (h == null) setPhase("you")
    }
    private fun askAsr() { if (ask != null) return; ask = e.askChoices(askEnv.localDl, askEnv.media, askEnv.ext, askEnv.sr); setPhase("you") }
    /** The learner picked a recognition path in the choice box (remembered in `vb.call.asr`). */
    fun pickAsr(choice: String) {
        ask = null; io.setPref("asr", choice); changed()
        if (io.mode() == "tap") { micDisabled = true; changed(); return }
        autoMic = true; listen()
    }
    /** The mic button: stops listening when listening, else starts (and keeps re-opening after each teacher line). */
    fun mic() { if (phase == "listen" && rec != null) { runCatching { rec?.stop() }; return }; autoMic = true; listen() }
    fun submitTyped(v: String) { if (v.isBlank()) return; turn++; stopRec(); answer(v, false, false, Extra(typed = true)) }
    fun toggleTyping() { typeOpen = !typeOpen; changed() }
    fun toggleSubtitles() { showTr = !showTr; io.setPref("tr", if (showTr) "1" else "0"); changed() }

    // ---------- the end ----------
    /** The red button / back: with at least one answer ⇒ the summary of what was said, else leave. */
    fun hang() { if (log.isNotEmpty()) finish() else { close(); io.hangup() } }
    fun close() { dead = true; sayRun++; runCatching { io.stopSay() }; stopRec() }
    private fun finish() {
        if (!alive) return
        val secs = jsRound((io.now() - t0) / 1000.0); close()
        val r = e.recap(call, log); val voiced = log.count { !it.picked && !it.typed }
        io.finished(CallResult(call, r, voiced, e.reward(r.turns.size, voiced, r.used.size), secs, log.toList()))
    }
}
