import SwiftUI
import Observation
import LKCore



/// P03 – state of one lesson run (port of web/js/lesson/ui.js `L`): builds the queue with LessonEngine, answers, feedback, retries, results → FSRS.
@MainActor @Observable
public final class LessonModel {
    public enum Phase: Equatable { case loading, question, feedback, done, empty }
    public struct Summary: Equatable {
        public var xp = 0, accuracy = 0, best = 0, minutes = 1
        public var learned: [String] = [], weak: [String] = []
        public var perfect = false
    }
    public struct Source {
        public var cards: [LessonCard] = [], starter: [LessonCard] = []
        public var story: LessonStory?
        public init(cards: [LessonCard] = [], starter: [LessonCard] = [], story: LessonStory? = nil) { self.cards = cards; self.starter = starter; self.story = story }
    }

    // run state
    public private(set) var phase: Phase = .loading
    public private(set) var session = LessonSession([])
    public private(set) var items: [LessonItem] = []
    public private(set) var kind = "lesson"
    public private(set) var summary = Summary()
    public private(set) var isStory = false
    public let teacher: TeacherController
    public var teacher2: TeacherController?   // Carlos, story lessons only
    public let voice: LKVoicePlayer
    public private(set) var gold: LessonGold?
    @ObservationIgnored var pictures = VocabImages.Snapshot.none
    @ObservationIgnored var dark = false

    // current question
    public var pick: String?
    public var tiles: [Int] = []
    public var typed = ""
    public private(set) var useBank = false
    public private(set) var bankPicks: [Int] = []
    /// story lines shown so far (chat log of the story stage)
    public private(set) var log: [LessonItem] = []
    public private(set) var hidden: Set<String> = []
    public private(set) var letters = 0
    public private(set) var pairHints = 0
    public private(set) var heard = ""
    public private(set) var listening = false
    public private(set) var speechError = false
    public private(set) var speaking = ""   // "ama" | "carlos" while a line is read

    // last answer (feedback sheet)
    public private(set) var answered: LessonItem?
    public private(set) var lastOK = false
    public private(set) var lastPick: String?
    public private(set) var lastCombo = 0
    public private(set) var requeued = false
    public private(set) var showWhy = false
    // haptic triggers
    public private(set) var correctTick = 0
    public private(set) var wrongTick = 0
    public private(set) var doneTick = 0

    @ObservationIgnored let clock: @Sendable () -> Date
    @ObservationIgnored let defaults: UserDefaults
    @ObservationIgnored let scorer: SpeechScoring?
    @ObservationIgnored let remote: LessonTextSource
    @ObservationIgnored var source = Source()
    @ObservationIgnored var started = Date()
    @ObservationIgnored var tries = 0
    @ObservationIgnored var micErrors = 0
    @ObservationIgnored var spoke = 0
    /// Read the question aloud when it appears (off in snapshot tests).
    @ObservationIgnored public var autoPlay = true
    @ObservationIgnored var mood: TeacherMood?
    /// Persist the results (FSRS, XP) – set by the screen that owns the store.
    @ObservationIgnored public var saved: @MainActor (_ results: [LessonEngine.Result], _ xp: Int, _ now: Date) async -> Void = { _, _, _ in }
    @ObservationIgnored let uiLang: String
    @ObservationIgnored public var calendar = Calendar.current

    static let offKey = "lk.lsn.off"
    static let hour: Double = 3_600_000

    public init(uiLang: String, voice: LKVoicePlayer = LKVoicePlayer(), defaults: UserDefaults = .standard, scorer: SpeechScoring? = nil,
                remote: LessonTextSource = LessonRemote.shared, reduceMotion: Bool = false, teacher: TeacherController? = nil, clock: @escaping @Sendable () -> Date = { Date() }) {
        self.uiLang = uiLang; self.voice = voice; self.defaults = defaults; self.scorer = scorer; self.remote = remote; self.clock = clock
        self.teacher = teacher ?? TeacherController(who: "ama", reduceMotion: reduceMotion)
        teacher2 = nil
        voice.teacher = self.teacher
    }

    /// Picture of a `pic` exercise (exact word#pos; never a scene picture).
    public func pictureURL(_ it: LessonItem) -> URL? { pictures.usable(it.word, it.card?.pos, dark: dark)?.url }

    // MARK: setup
    /// Start with explicit data (tests, previews, the app after it has read the store).
    public func start(_ src: Source, kind: String, seed: Double? = nil, pictures index: PictureIndex? = nil, dark: Bool = false) async {
        source = src; self.kind = kind
        let now = clock().timeIntervalSince1970 * 1000
        if let st = src.story {
            items = LessonEngine.storyItems(st, lang: uiLang, seed: seed ?? now)
        } else {
            let picks = LessonEngine.pickWords(src.cards, .init(n: 4, now: now, mode: kind, starter: src.starter), calendar: calendar)
            if let index {
                let snap = await index.snapshot(words: picks.map(\.card.word))
                pictures = snap
                self.dark = dark
            }
            var o = LessonEngine.BuildOptions(seed: seed ?? now, pool: src.cards + src.starter, off: off(), only: LessonEngine.kind[kind] ?? nil, calm: true)
            if pictures.enabled { let snap = pictures; o.hasImg = { w, p in snap.usable(w, p, dark: dark) != nil } }
            o.mean = { [uiLang] c in uiLang == "vi" ? c.vi : "" }   // learner-language meaning: only Vietnamese cards carry one (web nativeMean)
            items = LessonEngine.build(picks, o)
        }
        begin(items, kind: kind)
    }

    /// Run a ready-made queue of exercises (previews, tests).
    public func begin(_ items: [LessonItem], kind: String) {
        self.items = items; self.kind = kind
        isStory = items.contains { $0.type == "line" }
        if isStory && teacher2 == nil { teacher2 = TeacherController(who: "carlos", reduceMotion: teacher.reduceMotion) }
        session = LessonSession(items, ease: true)
        if items.isEmpty { phase = .empty; return }
        started = clock()
        mood = TeacherMood(rig: TeacherRigStore.shared)
        Task { [remote] in if let t = await remote.text("js/lesson/gold.js") { self.gold = LessonGold.parse(t) } }
        present()
    }

    // MARK: switches ("can't listen / speak now", one hour like the web)
    func off() -> LessonOff {
        let o = (try? JSONSerialization.jsonObject(with: Data((defaults.string(forKey: Self.offKey) ?? "{}").utf8))) as? [String: Double] ?? [:]
        let now = clock().timeIntervalSince1970 * 1000
        return LessonOff(listen: (o["listen"] ?? 0) > now, speak: (o["speak"] ?? 0) > now)
    }
    func setOff(_ k: String) {
        var o = (try? JSONSerialization.jsonObject(with: Data((defaults.string(forKey: Self.offKey) ?? "{}").utf8))) as? [String: Double] ?? [:]
        o[k] = clock().timeIntervalSince1970 * 1000 + Self.hour
        if let d = try? JSONSerialization.data(withJSONObject: o), let s = String(data: d, encoding: .utf8) { defaults.set(s, forKey: Self.offKey) }
    }
    public func cantListen() { setOff("listen"); session.replace { LessonEngine.adapt($0, off()) }; present() }
    public func cantSpeak() { setOff("speak"); session.replace { LessonEngine.adapt($0, off()) }; present() }

    // MARK: current item
    public var cur: LessonItem? { session.cur }
    public var progressSegments: (total: Int, filled: Int) {
        let n = max(1, min(12, session.total))
        return (n, Int((session.progress * Double(n)).rounded()))
    }
    public var questionNumber: Int { min(session.solved + 1, max(1, session.total)) }
    public var needsConfirmToExit: Bool { phase != .done && phase != .empty && session.solved > 0 }

    public func listens(_ it: LessonItem) -> Bool { it.noAudio != true && ["gap", "build", "say", "type"].contains(it.type) }
    public func speaks(_ it: LessonItem) -> Bool { it.type == "say" || (it.type == "pic" && it.choice != true) }
    /// The text read aloud for an item (web `audioText`).
    public func audioText(_ it: LessonItem) -> String { (it.type == "gap" || it.type == "build" ? it.sent : it.answer) ?? "" }

    public var canCheck: Bool {
        guard phase == .question, let it = cur else { return false }
        switch it.type {
        case "build", "tr": return !tiles.isEmpty
        case "type": return !typed.trimmingCharacters(in: .whitespaces).isEmpty
        case "match", "line", "video": return false
        case "say": return false
        case "pic": return it.choice == true ? pick != nil : false
        default: return pick != nil
        }
    }
    /// The next unused hint of the item (HINTS), excluding the slow button which has its own control.
    public func nextHint(_ it: LessonItem) -> String? {
        for h in it.hints {
            switch h {
            case "fifty": if (it.options?.count ?? 0) - hidden.count > 2 { return h }
            case "first": if tiles.count < (it.answer.map { LessonEngine.toks($0).count } ?? 0) { return h }
            case "letter": if letters < max(0, (it.len ?? 0) - 1) && !useBank { return h }
            case "bank": if !useBank { return h }
            case "pair": if pairHints < (it.pairs?.count ?? 0) - 1 { return h }
            default: break
            }
        }
        return nil
    }

    func present() {
        pick = nil; tiles = []; typed = ""; useBank = false; bankPicks = []; hidden = []; letters = 0; pairHints = 0; heard = ""; listening = false; speechError = false
        tries = 0; showWhy = false; answered = nil
        teacher.pose(nil)
        guard let it = session.cur else { return finish() }
        phase = .question
        if it.type == "line", !log.contains(where: { $0.id == it.id }) { log.append(it) }
        if autoPlay, it.type == "line" || listens(it) {
            let t = audioText(it), who = it.who ?? "ama"
            Task { [weak self] in
                try? await Task.sleep(nanoseconds: 250_000_000)
                guard let self, self.cur?.id == it.id, self.phase == .question else { return }
                self.say(t, who: who)
            }
        }
    }

    // MARK: audio
    public func say(_ text: String, slow: Bool = false, who: String = "ama") {
        guard !text.isEmpty else { return }
        speaking = who
        voice.teacher = who == "carlos" ? (teacher2 ?? teacher) : teacher
        voice.speak(text, who: who, slow: slow) { [weak self] in self?.speaking = "" }
    }
    public func replay(slow: Bool = false) { if let it = cur { say(audioText(it), slow: slow, who: it.who ?? "ama") } }
    public func stopAudio() { voice.stop(); scorer?.cancel(); speaking = "" }

    // MARK: hints
    public func useHint(_ h: String) {
        guard let it = cur else { return }
        switch h {
        case "fifty":
            if let o = it.options?.first(where: { $0 != it.answer && !hidden.contains($0) && $0 != pick }) { hidden.insert(o) }
        case "first":
            let words = LessonEngine.toks(it.answer ?? "")
            if (tiles.count > words.count) || zip(tiles, words).contains(where: { !LessonEngine.same(it.tiles?[$0.0] ?? "", $0.1) }) { tiles = [] }
            if tiles.count < words.count, let i = it.tiles?.indices.first(where: { !tiles.contains($0) && LessonEngine.same(it.tiles?[$0] ?? "", words[tiles.count]) }) { tiles.append(i) }
        case "letter": letters += 1
        case "bank": useBank = true; typed = ""; bankPicks = []
        case "pair": pairHints += 1
        default: break
        }
    }

    /// letter-bank mode of "type the word": tap a letter tile / delete the last one
    public func bankTap(_ i: Int) {
        guard let b = cur?.bank, b.indices.contains(i), !bankPicks.contains(i) else { return }
        bankPicks.append(i); typed = bankPicks.map { b[$0] }.joined()
    }
    public func bankBack() {
        guard let b = cur?.bank, !bankPicks.isEmpty else { return }
        bankPicks.removeLast(); typed = bankPicks.map { b[$0] }.joined()
    }

    // MARK: answering
    public func submit() {
        guard canCheck, let it = cur else { return }
        let given: Answer.Given
        switch it.type {
        case "build", "tr": given = .words(tiles.compactMap { i in it.tiles?.indices.contains(i) == true ? it.tiles?[i] : nil })
        case "type": given = .text(typed)
        default: given = .text(pick ?? "")
        }
        commit(ok: LessonEngine.check(it, given), picked: pick)
    }
    /// match: all pairs done (`ok` = no wrong pair); say: recognition score.
    public func submit(matched ok: Bool) { commit(ok: ok, picked: nil) }
    public func submit(score: Double, heard h: String) { if let it = cur { spoke += 1; commit(ok: LessonEngine.check(it, .score(score)), picked: nil) } }
    /// story line / video step: progress only.
    public func continueLine() { voice.stop(); _ = session.answer(true); present() }

    func commit(ok: Bool, picked: String?) {
        guard phase == .question, let it = cur else { return }
        stopAudio()
        let r = session.answer(ok)
        answered = it; lastOK = ok; lastPick = picked; lastCombo = r?.combo ?? 0; requeued = r?.requeued ?? false
        phase = .feedback
        if ok { correctTick += 1 } else { wrongTick += 1 }
        let m = mood?.feed("answer", ["ok": ok])
        teacher.pose(m?.pose ?? (ok ? "cheer" : "concern"))
    }
    public func next() { present() }
    public func toggleWhy() { showWhy.toggle() }

    // MARK: speaking exercise
    public func tapToSpeak() {
        guard let it = cur, let scorer, !listening, phase == .question else { return }
        voice.stop(); listening = true; speechError = false
        teacher.listen(true)
        let target = it.answer ?? ""
        Task { [weak self] in
            let o = await scorer.listen(target: target)
            guard let self, self.cur?.id == it.id, self.phase == .question else { return }
            self.listening = false; self.teacher.listen(false)
            switch o {
            case .heard(let text, let score):
                self.heard = text; self.micErrors = 0
                if score >= LessonEngine.speechPass { self.submit(score: Double(score) / 100, heard: text) }
                else { self.tries += 1; if self.tries >= LessonEngine.speechRetries { self.tries = 0; self.submit(score: Double(score) / 100, heard: text) } }
            case .noSpeech: self.micErrors += 0; self.speechError = true
            case .unsupported: self.micErrors += 1; self.speechError = true; if self.micErrors >= 2 { self.cantSpeak() }
            }
        }
    }
    /// True after a failed attempt with a recognizer that cannot work (no permission / device) – the screen shows the "can't speak" way out.
    public var recognizerFailed: Bool { speechError && micErrors > 0 }
    public var unclear: Bool { !heard.isEmpty && tries > 0 }

    // MARK: finish
    func finish() {
        stopAudio()
        phase = .done
        let s = session
        let now = clock()
        let xp = 10 + s.ok1 * 2 + (s.wrong.isEmpty ? 5 : 0)
        let weak = s.wrong.keys.filter { !$0.hasPrefix("#") }.sorted()
        let learned = isStory ? [] : items.compactMap { $0.card?.word }.reduce(into: [String]()) { if !$0.contains($1) { $0.append($1) } }
        summary = Summary(xp: xp, accuracy: s.accuracy, best: s.best, minutes: max(1, Int((now.timeIntervalSince(started) / 60).rounded())),
                          learned: learned, weak: weak, perfect: s.wrong.isEmpty)
        let m = mood?.feed(s.wrong.isEmpty ? "streak" : "idle", [:])
        teacher.pose(m?.pose ?? (s.accuracy >= 80 ? "cheer" : "encourage"))
        doneTick += 1
        let res = LessonEngine.results(s, items, cards: source.cards, now: now.timeIntervalSince1970 * 1000, calendar: calendar)
        let save = saved
        Task { await save(res, xp, now) }
    }
}
