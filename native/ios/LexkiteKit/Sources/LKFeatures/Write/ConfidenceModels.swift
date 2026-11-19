import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

/// #/confidence – speaking course by real situation (A1 → B2): overview + score, one unit (6 steps), toolkit, 2-minute daily challenge.
/// Progress is `vb.conf` on this device (like the web's localStorage). The voice is the Kokoro teacher voice (`SpeakIO.say`), the microphone `SpeakIO.recognizer`.
@MainActor @Observable
final class ConfidenceModel {
    enum Page: Equatable { case overview, unit(String, phrase: String?), toolkit(String?), daily }
    struct Metrics: Equatable { var secs: Int, wpm: Int, pauses: Int, fillers: Int, used: [String]; var ppm: Double }
    let ctx: SkillsContext
    let content: LearnContent
    let page: Page
    private let io: SpeakIO
    private let defaults: UserDefaults
    private(set) var progress: JSON
    // unit run
    private(set) var runStep: Int? = nil
    private(set) var shadow: [String: Int] = [:]
    private(set) var shadowIndex = 0
    private(set) var gapIndex = 0
    private(set) var gapsRight = 0
    private(set) var feedback: [String: String] = [:]
    private(set) var heardText: [String: String] = [:]
    private(set) var marks: [String: [(word: String, heard: Bool?)]] = [:]
    private(set) var gapState: String? = nil            // nil | "ok" | "miss"
    private(set) var hint = false
    private(set) var listening: String? = nil
    private(set) var micError: String? = nil
    private(set) var playing: Int? = nil
    private(set) var savedCards: Int? = nil
    private var playToken = 0
    // daily
    private(set) var recording = false
    private(set) var secsLeft = Confidence.dailySeconds
    private(set) var live = ""
    private(set) var metrics: Metrics? = nil
    private(set) var rating: Int? = nil
    private(set) var dailyScore: Int? = nil
    private(set) var newRecord = false
    private var said = ""
    private var t0 = Date()
    private var partialAt: Date? = nil
    private var pauseCount = 0
    private var recordID = ""
    private var dailyTask: Task<Void, Never>? = nil

    init(ctx: SkillsContext, page: Page, io: SpeakIO, content: LearnContent = .shared, defaults: UserDefaults = .standard) {
        self.ctx = ctx; self.page = page; self.io = io; self.content = content; self.defaults = defaults
        progress = Confidence.load(defaults)
    }
    static func fixture(ctx: SkillsContext, page: Page, progress: JSON = .obj([("done", .object([:])), ("daily", .array([]))]), runStep: Int? = nil, metrics: Metrics? = nil, rating: Int? = nil) -> ConfidenceModel {
        let m = ConfidenceModel(ctx: ctx, page: page, io: .scripted(), defaults: UserDefaults(suiteName: "lk.conf.fixture") ?? .standard)
        m.progress = progress; m.runStep = runStep; m.metrics = metrics; m.rating = rating
        if let metrics { m.dailyScore = Confidence.score(secs: Double(metrics.secs), wpm: Double(metrics.wpm), pausesPerMin: metrics.ppm, phrases: metrics.used.count, selfRating: rating) }
        return m
    }
    func load() async { await ctx.reload() }

    var conf: JSON { content.conf }
    var units: [JSON] { conf.list("units") }
    var done: [String: JSON] { progress["done"]?.object ?? [:] }
    var daily: [JSON] { progress.list("daily") }
    var today: String { ctx.core.clock.todayKey(ctx.now) }
    var last: JSON? { daily.last }
    var doneToday: Bool { last?.s("d") == today }
    var next: JSON? { units.first { done[$0.s("id")] == nil } }
    var locale: String { SpeakAccent.locale(ctx.settings) }
    var streak: Int { Confidence.streak(daily.map { $0.s("d") }, today: today) }
    func unit(_ id: String) -> JSON? { units.first { $0.s("id") == id } }
    var question: JSON {
        let q = conf.list("daily")
        guard !q.isEmpty else { return .null }
        return q[Confidence.dailyIndex(now: ctx.now, tzOffsetMinutes: -(TimeZone.current.secondsFromGMT() / 60), count: q.count)]
    }
    var allPhrases: [String] { Confidence.allPhrases(conf) }

    // MARK: voice
    func say(_ text: String, slow: Bool = false) { io.say(text, SpeakAccent.ama, locale, slow, nil) }
    func stopSay() { playToken += 1; io.stopSay(); playing = nil }
    /// the model dialogue: A = Ama, B = Carlos, line by line
    func playDialogue(_ u: JSON, slow: Bool) {
        stopSay()
        let token = playToken, lines = u["dialogue"]?.list("lines") ?? []
        Task { [weak self] in
            for (k, l) in lines.enumerated() {
                guard let self, self.playToken == token else { return }
                self.playing = k
                let a = l.array ?? []
                await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
                    self.io.say(a.last?.string ?? "", (a.first?.string ?? "a") == "a" ? SpeakAccent.ama : SpeakAccent.carlos, self.locale, slow) { c.resume() }
                }
                try? await Task.sleep(nanoseconds: 350_000_000)
            }
            if let self, self.playToken == token { self.playing = nil }
        }
    }

    // MARK: microphone (one attempt at a time)
    func attempt(_ id: String, target: String, seconds: Double = 8) async -> (heard: String, score: Int)? {
        guard listening == nil else { io.recognizer.stop(); return nil }
        stopSay(); listening = id; micError = nil
        let o = await io.recognizer.listen(locale: locale, maxSeconds: seconds, onPartial: nil)
        listening = nil
        if let e = o.error { micError = e; return nil }
        let b = Recognize.best(target: target, alts: o.alts)
        return (b.heard, b.score)
    }
    /// toolkit "Nói thử" and the shadowing step share this
    func tryPhrase(_ id: String, target: String) async {
        guard let r = await attempt(id, target: target) else { return }
        feedback[id] = (r.score >= 80 ? "🌟 " : r.score >= 55 ? "👍 " : "🌱 ") + "\(r.score)%"
    }

    // MARK: unit run
    func start(_ u: JSON) { runStep = 0; shadow = [:]; shadowIndex = 0; gapIndex = 0; gapsRight = 0; gapState = nil; hint = false; feedback = [:]; marks = [:]; savedCards = nil }
    func leaveRun() { stopSay(); io.recognizer.cancel(); runStep = nil }
    func advance(_ u: JSON, translate: @escaping (String) -> String) async {
        stopSay(); io.recognizer.stop()
        guard let s = runStep else { return }
        runStep = min(5, s + 1)
        if runStep == 5 { await finish(u, translate: translate) }
    }
    func shadowMove(_ d: Int, count: Int) { shadowIndex = max(0, min(count - 1, shadowIndex + d)) }
    func shadowTry(_ p: JSON) async {
        let id = p.s("id")
        guard let r = await attempt(id, target: p.s("say")) else { return }
        shadow[id] = max(shadow[id] ?? 0, r.score)
        marks[id] = Confidence.marks(p.s("say"), heard: r.heard)
        heardText[id] = r.heard
        feedback[id] = r.score >= 85 ? "🌟" : r.score >= 60 ? "👍" : "🌱"
        feedback["\(id)#score"] = String(r.score)
    }
    func gapList(_ u: JSON) -> [JSON] { Array(u.list("phrases").filter { !$0.s("gap").isEmpty }.prefix(4)) }
    func gapCheck(_ p: JSON, typed: String) {
        if Confidence.norm(typed) == Confidence.norm(p.s("gap")) { gapState = "ok"; gapsRight += 1; say(p.s("say")) } else { gapState = "miss" }
    }
    func gapMic(_ p: JSON) async {
        guard let r = await attempt("gap", target: p.s("say")) else { return }
        heardText["gap"] = r.heard
        if " \(Confidence.norm(r.heard)) ".contains(" \(Confidence.norm(p.s("gap"))) ") { gapState = "ok"; gapsRight += 1; say(p.s("say")) } else { gapState = "miss" }
    }
    func gapNext() { gapIndex += 1; gapState = nil; hint = false; heardText["gap"] = nil }
    func showHint() { hint = true }

    /// recap: mark done, save the phrases as review cards, reward the first time
    func finish(_ u: JSON, translate: (String) -> String) async {
        let id = u.s("id"), first = done[id] == nil
        let vals = Array(shadow.values), sh = vals.isEmpty ? nil : Vocab.round(Double(vals.reduce(0, +)) / Double(vals.count))
        var p = progress, d = p["done"]?.object ?? [:]
        d[id] = .obj([("at", .number(Double(ctx.now))), ("sh", sh.map { .int($0) } ?? .null)])
        p["done"] = .object(d); progress = p; Confidence.save(p, defaults)
        await ctx.reload()
        var n = 0
        for ph in u.list("phrases") where !ctx.inDeck(ph.s("say")) {
            await ctx.addWord(.obj([("word", ph.s("say").isEmpty ? .null : .string(ph.s("say"))), ("vi", .string(translate(ph.s("mean")))), ("def", .string(ph.s("meanEn"))), ("ex", .string(ph.s("say"))), ("pos", .string("phrase")), ("emoji", .string(u.s("em"))), ("topic", .string("confidence"))]),
                              context: .obj([("text", .string(ph.s("say"))), ("title", .string("Speak with confidence: " + u.s("titleEn")))]))
            n += 1
        }
        savedCards = n
        if first { await ctx.commit(reward: ["spoken": shadow.count, "xp": 15]) }
    }
    var shadowAverage: Int? { shadow.isEmpty ? nil : Vocab.round(Double(shadow.values.reduce(0, +)) / Double(shadow.count)) }

    // MARK: daily challenge (2 minutes)
    func toggleRecording() {
        if recording { stopRecording() } else { startRecording() }
    }
    private func startRecording() {
        stopSay(); metrics = nil; rating = nil; dailyScore = nil; said = ""; live = ""; pauseCount = 0; partialAt = nil; secsLeft = Confidence.dailySeconds; micError = nil
        recording = true; t0 = Date(); recordID = String(ctx.now)
        dailyTask?.cancel()
        dailyTask = Task { [weak self] in
            guard let self else { return }
            while self.recording, Date().timeIntervalSince(self.t0) < Double(Confidence.dailySeconds) {
                let left = Double(Confidence.dailySeconds) - Date().timeIntervalSince(self.t0)
                let o = await self.io.recognizer.listen(locale: self.locale, maxSeconds: min(55, left), onPartial: { [weak self] s in self?.partial(s) })
                if let e = o.error, e != "no-speech" { self.micError = e; break }
                if let a = o.alts.first, !a.isEmpty { self.said += (self.said.isEmpty ? "" : " ") + a; self.live = String(self.said.suffix(140)) }
            }
            if self.recording { self.stopRecording() }
        }
        Task { [weak self] in
            while let self, self.recording {
                self.secsLeft = max(0, Confidence.dailySeconds - Int(Date().timeIntervalSince(self.t0)))
                try? await Task.sleep(nanoseconds: 200_000_000)
            }
        }
    }
    /// a pause = a gap of ≥ 1.2 s between two growing partial transcripts (the web measures microphone energy; the OS recogniser gives no audio level)
    private func partial(_ s: String) {
        let now = Date()
        if let p = partialAt, now.timeIntervalSince(p) * 1000 >= Double(Confidence.pauseGapMs) { pauseCount += 1 }
        partialAt = now
        live = String((said + (said.isEmpty ? "" : " ") + s).suffix(140))
    }
    func stopRecording() {
        guard recording else { return }
        recording = false
        io.recognizer.stop(); dailyTask?.cancel()
        let secs = min(Double(Confidence.dailySeconds), Date().timeIntervalSince(t0))
        finishDaily(secs)
    }
    func finishDaily(_ secs: Double) {
        let words = Confidence.toks(said).count
        let wpm = !said.isEmpty && secs > 10 ? Vocab.round(Double(words) / (secs / 60)) : 0
        metrics = Metrics(secs: Vocab.round(secs), wpm: wpm, pauses: pauseCount, fillers: Confidence.fillers(said), used: Confidence.used(said, phrases: allPhrases), ppm: secs > 5 ? Double(pauseCount) / (secs / 60) : 0)
    }
    var transcript: String { said }
    /// the 1–5 self rating: sets (or replaces) today's record; the first one of a challenge pays 10 XP
    func rate(_ n: Int) async {
        guard let m = metrics else { return }
        rating = n
        let score = Confidence.score(secs: Double(m.secs), wpm: Double(m.wpm), pausesPerMin: m.ppm, phrases: m.used.count, selfRating: n)
        var list = daily
        let at = list.firstIndex { $0.s("at") == recordID }
        let best = list.enumerated().filter { $0.offset != at }.map { $0.element.i("score") }.max() ?? 0
        let rec = JSON.obj([("d", .string(today)), ("at", .string(recordID)), ("score", .int(score)), ("wpm", .int(m.wpm)), ("pauses", .int(m.pauses)), ("fillers", .int(m.fillers)), ("phrases", .int(m.used.count)), ("self", .int(n)), ("secs", .int(m.secs))])
        if let at { list[at] = rec } else { list.append(rec) }
        list = Array(list.suffix(30))
        var p = progress; p["daily"] = .array(list); progress = p; Confidence.save(p, defaults)
        dailyScore = score; newRecord = list.count > 1 && score > best
        if at == nil { await ctx.commit(reward: ["spoken": 1, "xp": 10]) }
    }
    func stopAll() { stopSay(); recording = false; dailyTask?.cancel(); io.recognizer.cancel() }
}
