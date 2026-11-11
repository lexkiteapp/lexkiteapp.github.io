import Foundation
import Observation
import LKSync
import LKCore
import LKStrings

/// M4 P08 – one call, as a state machine (the `start(c)` closure of web/js/call.js, Stitch v2 `teacher-call` branch). The device is a `CallPlatform`
/// (voice + teacher face, recogniser, clock, timers, stored choices); nothing here reads a clock or opens a microphone, so the same code runs in the app
/// and in the vector test (CallVectorTests: `flow`, `rewards`, `progress`). Order of effects, turn counter (a late recognition result is ignored),
/// buffering of a long turn, the prep countdown and the way a call ends are the web's, step by step.

public enum CallPhase: String, Equatable, Sendable { case talk, you, listen, think, done }
public enum CallTip: Equatable, Sendable { case hint, fix(CallFix), slip(said: String, meant: String) }
public enum CallToast: Equatable, Sendable { case tapOnly, recError(code: String, ms: Int) }
/// what the learner can pick when nothing is chosen yet (the box "Chọn cách nhận dạng giọng nói"); on the phone: the system recogniser (cloud) or tapping
public enum CallAskChoice: String, Equatable, Sendable { case chrome, device, cloud, tap }
public struct CallCue: Equatable, Sendable {
    public enum Kind: Equatable, Sendable { case prep, long }
    public var kind: Kind
    /// prep: the last sentence of the question (the topic card); long: the fixed "Lượt nói dài: 1–2 phút"
    public var title: String?
    public var points: [String]
    public var hasDone: Bool
}
/// One `UI.recognize` call. `processLocally` ⇒ on the device only; `continuous == false` for a long turn; `phrases` boost the words of the turn.
public struct CallListenRequest: Equatable, Sendable {
    public var id: Int
    public var target: String
    public var accent: String
    public var processLocally: Bool
    public var continuous: Bool?
    public var phrases: [String]
    public var boost = 3
    /// the web-only Whisper path
    public var whisperMaxMs: Int?
}
public enum CallEnd { case summary(CallSummary), exit }
/// `mm:ss` of the LIVE pill and the countdowns
public enum CallClock { public static func mmss(_ s: Int) -> String { CallJS.mmss(s) } }

@MainActor
public protocol CallPlatform: AnyObject {
    /// wall clock, ms
    func callNow() -> Int64
    /// speak one line with the teacher; call `onEnd` when it has been said (the platform also covers a missing end with `CallSession.fallbackMs`)
    func callSpeak(_ text: String, who: String, accent: String, onEnd: @escaping () -> Void)
    func callStopSpeaking()
    /// the teacher's face: thinking 1500 ms, happy / encourage 2200 ms
    func callReact(_ pose: String, ms: Int)
    func callTeacherListening(_ on: Bool)
    /// start the recogniser; false when it cannot start. The platform answers with `recognizerStarted / Result / Error / Ended` carrying `request.id`.
    func callStartListening(_ request: CallListenRequest) -> Bool
    /// stop listening softly: the recogniser still delivers its result and its end
    func callStopListening()
    func callAfter(_ ms: Int, _ block: @escaping @MainActor () -> Void)
    func callPhase(_ phase: CallPhase)
    func callToast(_ toast: CallToast)
    /// the stored choices (`localStorage vb.call.asr`, `vb.call.tr`, `vb.whisper`); nil removes
    func callPref(_ key: String) -> String?
    func callSetPref(_ key: String, _ value: String?)
    func callEnded(_ end: CallEnd)
}

@MainActor @Observable
public final class CallSession {
    public let script: CallScript
    public let engine: CallEngine
    public let accent: String
    public let teacherName: String
    // what the screen shows
    public private(set) var phase: CallPhase = .talk
    public private(set) var nodeID: String?
    public private(set) var log: [CallLogEntry] = []
    /// what the teacher is saying (reaction + next question)
    public private(set) var captions: [String] = []
    /// "🗣️ …" the learner's last words, or the chunks of a long turn
    public private(set) var you = ""
    public private(set) var tip: CallTip = .hint
    public private(set) var progress = 0
    public private(set) var clock: String?
    public private(set) var longWords: Int?
    public private(set) var ask: [CallAskChoice]?
    public private(set) var typeOpen = false
    public private(set) var micDisabled = false
    public private(set) var showTranslation: Bool
    public private(set) var ended = false

    @ObservationIgnored private weak var platform: CallPlatform?
    private let l10n: L10n
    private let modeProvider: () -> CallAsr.Mode
    private let askProvider: () -> [CallAskChoice]
    private let depthValue: Int
    @ObservationIgnored private var rec: Int?
    @ObservationIgnored private var autoMic = false
    @ObservationIgnored private var busy = false
    @ObservationIgnored private var turn = 0
    @ObservationIgnored private var sayRun = 0
    @ObservationIgnored private var tAsk: Int64?
    @ObservationIgnored private var t0: Int64 = 0
    @ObservationIgnored private var listenStart: Int64 = 0
    @ObservationIgnored private var longBuf: [String] = []
    @ObservationIgnored private var longEnd: Int64?
    @ObservationIgnored private var prepEnd: Int64?
    @ObservationIgnored private var cur: [String] = []

    public init(script: CallScript, engine: CallEngine, l10n: L10n, accent: String = "en-US", canTranslate: Bool, platform: CallPlatform,
                mode: @escaping () -> CallAsr.Mode, askChoices: @escaping () -> [CallAskChoice] = { [.cloud, .tap] }) {
        self.script = script; self.engine = engine; self.l10n = l10n; self.accent = accent; self.platform = platform
        modeProvider = mode; askProvider = askChoices
        teacherName = script.teacherName
        depthValue = engine.depth(script)
        nodeID = script.start
        showTranslation = canTranslate && platform.callPref(CallList.trKey) != "0"
        t0 = platform.callNow()
    }

    // MARK: derived
    public var node: CallNode? { script.node(nodeID) }
    public var mode: CallAsr.Mode { modeProvider() }
    public var depth: Int { depthValue }
    /// seconds since the call began (the LIVE pill)
    public var elapsed: Int { max(0, Int((now - t0) / 1000)) }
    public var listening: Bool { phase == .listen }
    /// the suggestion buttons; a long turn shows only its first two sentences + " …"
    public var options: [String] {
        guard let n = node else { return [] }
        return n.long ? n.o.map(CallJS.firstTwoSentences) : n.o
    }
    public var cue: CallCue? {
        guard let n = node, n.hasCue else { return nil }
        let points = n.cue ?? script.node(script.start)?.cue ?? []
        return n.prep > 0 ? CallCue(kind: .prep, title: n.m.components(separatedBy: ". ").last, points: points, hasDone: n.long)
                          : CallCue(kind: .long, title: nil, points: points, hasDone: n.long)
    }
    public var status: String {
        switch phase {
        case .talk: return l10n(.callUiNameDangNoi, ["name": teacherName])
        case .listen: return l10n(.callUiDangNgheBan)
        case .think: return l10n(.callUiDangHieuCauCua)
        case .done: return l10n(.callUiCuocGoiKetThuc)
        case .you: return l10n(.callUiDenLuotBanBam)
        }
    }
    /// web `Math.min(15000, 1500 + text.length * 90)`: the platform does not always report the end of a line ⇒ go on after this long
    public static func fallbackMs(_ text: String) -> Int { min(15000, 1500 + text.utf16.count * 90) }

    private var now: Int64 { platform?.callNow() ?? 0 }
    private var alive: Bool { !ended }

    // MARK: start
    /// the teacher's first line, then the learner's turn
    public func begin() {
        guard let first = node else { endCall(.exit); return }
        say([first.m]) { [weak self] in self?.enter(first) }
    }

    // MARK: speaking
    private func setPhase(_ p: CallPhase) {
        phase = p
        platform?.callTeacherListening(p == .listen)
        if p == .think { platform?.callReact("thinking", ms: 1500) }
        platform?.callPhase(p)
    }
    /// the lines one after the other (every line one file / one utterance); a new `say` or a hush cuts the rest
    private func say(_ parts: [String], then: (() -> Void)? = nil) {
        cur = parts.filter { !$0.isEmpty }
        sayRun += 1
        let my = sayRun
        captions = cur
        setPhase(.talk)
        let done: () -> Void = { [weak self] in
            guard let self, my == self.sayRun, self.alive else { return }
            self.setPhase(.you)
            if let then { then() } else if self.autoMic, let n = self.node, n.prep == 0 { self.listen() }
        }
        sayOne(0, run: my, done: done)
    }
    private func sayOne(_ k: Int, run my: Int, done: @escaping () -> Void) {
        guard my == sayRun, alive else { return }
        if k >= cur.count { done(); return }
        var fin = false
        platform?.callSpeak(cur[k], who: script.who, accent: accent) { [weak self] in
            if fin { return }
            fin = true
            self?.sayOne(k + 1, run: my, done: done)
        }
    }
    private func hush() { sayRun += 1; platform?.callStopSpeaking() }
    /// the speaker button: hear the last lines again (in the teacher's own voice)
    public func replay() {
        let x = cur.joined(separator: " ")
        guard !x.isEmpty, phase != .listen else { return }
        platform?.callSpeak(x, who: script.who, accent: accent) {}
    }

    // MARK: the learner answers
    /// text: the answer · picked: a tapped suggestion · force: the end of a long / prep turn
    private func answer(_ raw: String, picked: Bool, force: Bool = false, secs: Double? = nil, asr: Int? = nil, typed: Bool = false) {
        var text = raw.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        guard !text.isEmpty, !busy, alive, let n = node, let id = nodeID else { return }
        if n.long && !force {   // Part 2: the chunks are gathered until the clock ends or "Tôi nói xong"
            longBuf.append(text)
            let all = longBuf.joined(separator: " ")
            you = all; longWords = engine.fluency(all).words
            if let end = longEnd, now < end - 3000, autoMic {
                platform?.callAfter(250) { [weak self] in
                    guard let s = self, s.alive, s.phase != .listen else { return }
                    s.listen()
                }
            }
            return
        }
        busy = true; setPhase(.think); prepEnd = nil
        stopRec(); hush()
        if n.long && !longBuf.isEmpty && !picked { text = longBuf.joined(separator: " ") }
        if n.long { longEnd = nil; longBuf = []; longWords = nil }
        tip = .hint
        if engine.rules.isUnsafe(text, tl: script.tl) {   // rude words: not logged, the question is asked again
            busy = false
            say([CallRules.unsafeLine(tl: script.tl), n.m])
            return
        }
        let secsAsk = tAsk.map { max(0, Double(now - $0) / 1000) } ?? 0
        if n.prep == 0 { log.append(CallLogEntry(id: id, text: text, picked: picked, secs: secs ?? (picked ? 0 : secsAsk), asr: asr, typed: typed)) }
        if !picked { you = "🗣️ " + text }
        let fix = picked || n.prep > 0 ? nil : engine.correct(text, prompt: n.m)
        let sl = picked || n.prep > 0 ? [] : engine.slips(text, script, n)
        platform?.callReact(fix != nil || !sl.isEmpty ? "encourage" : "happy", ms: 2200)
        if let fix { tip = .fix(fix) } else if let s = sl.first { tip = .slip(said: s.said, meant: s.meant) }
        let r = engine.step(script, id, text)
        nodeID = r.next; turn += 1
        let nx = node
        progress = CallProgress.percent(logged: log.count, depth: depthValue, ended: nx == nil, max: engine.rules.pctMax)
        busy = false
        clock = nil
        say([r.react, nx?.m ?? script.end]) { [weak self] in self?.enter(nx) }
    }
    /// after the teacher has spoken: the end · the prep countdown · a long turn (clock, the mic re-opens after each chunk) · a normal turn
    private func enter(_ nx: CallNode?) {
        tAsk = now
        guard let nx else {
            setPhase(.done); micDisabled = true
            platform?.callAfter(900) { [weak self] in if let s = self, s.alive { s.finish() } }
            return
        }
        if nx.prep > 0 { prepEnd = now + Int64(nx.prep) * 1000; paintClock(); return }
        if nx.long { longEnd = now + Int64(engine.rules.longSeconds) * 1000; longBuf = []; longWords = nil; paintClock() }
        if autoMic { listen() }
    }
    private func endLong() {
        guard let n = node, n.long else { return }
        let all = longBuf.joined(separator: " ")
        if !all.isEmpty { answer(all, picked: false, force: true) } else if let o = n.o.first { answer(o, picked: true, force: true) }
    }
    private func paintClock() {
        guard let n = node, n.hasCue else { clock = nil; return }
        if let e = prepEnd { clock = CallJS.mmss(Int(ceil(Double(e - now) / 1000))) }
        else if let e = longEnd { clock = CallJS.mmss(Int(ceil(Double(e - now) / 1000))) }
        else { clock = nil }
    }
    /// every 500 ms: the countdown; at 0 the prep answers itself ("(đã chuẩn bị xong)", not logged), a long turn ends with what was said
    public func tick() {
        guard alive, let n = node, n.hasCue else { return }
        if let e = prepEnd {
            let s = Int(ceil(Double(e - now) / 1000))
            clock = CallJS.mmss(s)
            if s <= 0 { prepEnd = nil; answer(l10n(.callUiDaChuanBiXong), picked: true, force: true) }
        } else if let e = longEnd {
            let s = Int(ceil(Double(e - now) / 1000))
            clock = CallJS.mmss(s)
            if s <= 0 { longEnd = nil; endLong() }
        }
    }

    // MARK: listening
    private func stopRec() { if rec != nil { rec = nil; platform?.callStopListening() } }
    private func listen() {
        guard alive, rec == nil, let n = node, n.prep == 0 else { return }
        let m = modeProvider()
        if m == .ask { askAsr(); return }
        if m == .tap {
            autoMic = false; typeOpen = true
            platform?.callToast(.tapOnly)
            return
        }
        hush(); setPhase(.listen)
        turn += 1
        let my = turn
        listenStart = now
        let R = engine.rules
        var seen = Set<String>(), phrases: [String] = []
        for w in R.words(n.o.joined(separator: " ") + " " + n.kw.joined(separator: " ") + " " + script.words.joined(separator: " ")) where w.utf16.count > 3 && seen.insert(w).inserted { phrases.append(w) }
        let local = m == .local
        let req = CallListenRequest(id: my, target: n.o.first ?? "", accent: accent, processLocally: local, continuous: local && n.long ? false : nil,
                                    phrases: local ? Array(phrases.prefix(40)) : [], whisperMaxMs: m == .whisper ? (n.long ? 28000 : min(15000, 3000 + (n.min != 0 ? n.min : 8) * 450)) : nil)
        rec = my
        if platform?.callStartListening(req) != true { rec = nil; setPhase(.you) }
    }
    public func recognizerStarted(_ id: Int) { if id == turn { setPhase(.listen) } }
    public func recognizerResult(_ id: Int, heard: String, score: Int?) {
        guard id == turn, alive else { return }
        turn += 1
        if heard.isEmpty { setPhase(.you) } else { answer(heard, picked: false, secs: Double(now - listenStart) / 1000, asr: score) }
    }
    public func recognizerError(_ id: Int, code: String) {
        guard id == turn else { return }
        autoMic = false; setPhase(.you)
        platform?.callToast(.recError(code: code, ms: code == "no-speech" ? 2500 : 3500))
    }
    /// the result arrives before the end, so a long turn can still open the mic for the next chunk
    public func recognizerEnded(_ id: Int) {
        if rec == id { rec = nil }
        if rec == nil && phase == .listen { setPhase(.you) }
    }
    /// nothing chosen yet: the learner picks how speech is recognised (never silently the cloud)
    private func askAsr() {
        guard ask == nil else { return }
        ask = askProvider()
        setPhase(.you)
    }
    public func askPick(_ c: CallAskChoice) {
        ask = nil
        switch c {
        case .chrome: break
        case .device: platform?.callSetPref("vb.whisper", "1"); platform?.callSetPref(CallList.asrKey, "device")
        case .cloud, .tap: platform?.callSetPref(CallList.asrKey, c.rawValue)
        }
        if modeProvider() == .tap { micDisabled = true; return }
        autoMic = true; listen()
    }

    // MARK: the buttons
    /// the microphone: pressed while listening = stop listening; else start (and keep the mic open after every answer)
    public func micPressed() {
        if phase == .listen, rec != nil { platform?.callStopListening(); return }
        autoMic = true; listen()
    }
    public func tapOption(_ k: Int) {
        guard let n = node, n.o.indices.contains(k) else { return }
        answer(n.o[k], picked: true, force: n.long)
    }
    public func submitTyped(_ v: String) {
        guard !v.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        turn += 1; stopRec()
        answer(v, picked: false, typed: true)
    }
    public func longDone() { endLong() }
    public func toggleTyping() { typeOpen.toggle() }
    public func toggleTranslation() {
        showTranslation.toggle()
        platform?.callSetPref(CallList.trKey, showTranslation ? "1" : "0")
    }
    /// the red button (and ✕): answers so far ⇒ the summary; none ⇒ back to the list
    public func hang() {
        if !log.isEmpty { finish() } else { endCall(.exit) }
    }
    private func finish() {
        guard alive else { return }
        let secs = Vocab.round(Double(now - t0) / 1000)
        let s = CallSummary.make(script: script, log: log, secs: secs, engine: engine)
        endCall(.summary(s))
    }
    private func endCall(_ e: CallEnd) {
        guard alive else { return }
        ended = true; sayRun += 1
        platform?.callStopSpeaking(); stopRec()
        platform?.callEnded(e)
    }
    /// leaving the screen without ending (swipe back, app closed): everything stops, no summary
    public func abandon() {
        guard alive else { return }
        ended = true; sayRun += 1
        platform?.callStopSpeaking(); stopRec()
    }
}
