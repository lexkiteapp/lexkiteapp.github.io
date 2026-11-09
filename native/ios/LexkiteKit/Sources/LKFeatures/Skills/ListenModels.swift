import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

extension SkillsContext {
    /// the dictionary behind the word popups and "Từ vựng đáng học" (one per screen)
    func makeService() -> DictionaryService { DictModel(uiLang: lang).service }
}

// MARK: - #/listening

@MainActor @Observable
final class ListenHubModel {
    let ctx: SkillsContext
    private(set) var query: [String: String]
    private(set) var hub = ListenHub()
    init(ctx: SkillsContext, query: [String: String]) { self.ctx = ctx; self.query = query }

    func load() async { await ctx.reload(); refresh() }
    func select(_ n: Int) { query = ["t": String(n)]; refresh() }
    /// the open test is remembered on the device (`vb.listenT`)
    private func refresh() {
        hub = ListenHub.build(ctx.data, query: query, remembered: ctx.defaults.string(forKey: SkillsPrefs.listenKey), game: ctx.game, lang: ctx.lang)
        ctx.defaults.set(hub.persistedTest, forKey: SkillsPrefs.listenKey)
    }
}

// MARK: - #/listen/<part>

/// One part, practice or exam: the player, the questions, the transcript, the submit.
@MainActor @Observable
final class ListenPartModel {
    let ctx: SkillsContext
    let part: JSON
    let page: ListenPage
    var exam: Bool { page.exam }
    var rate: Double
    /// "Hiện lời thoại khi nghe": off → the transcript is blurred
    var live = false
    var answers = QAnswers()
    private(set) var submitted = false
    private(set) var outcome: ListenOutcome?
    private(set) var rows: [Transcript.Row] = []
    private(set) var nowLine = -1
    private(set) var playing = false
    private(set) var ended = false
    private(set) var plays = 0
    private(set) var blocked = false
    private(set) var toast: L10nKey?
    /// the transcript line to scroll to ("Nghe đoạn có đáp án")
    private(set) var scrollTo: Int?
    private(set) var vocabSaved = Set<Int>()
    var confirmSubmit = false
    var popup: WordPopupModel?
    private var player: ListenPlayer?
    private var service: DictionaryService?

    init(ctx: SkillsContext, part: JSON, exam: Bool, io: ListenIO? = nil) {
        self.ctx = ctx; self.part = part
        page = ListenPage.build(part, exam: exam, settings: ctx.settings)
        rate = ListenRules.rate(ctx.settings)
        rows = Transcript.rows(part, lexis: ctx.lexis, evidence: false)
        if let io { attach(io) }
    }
    /// fixed state for fixtures: no sound
    static func fixture(ctx: SkillsContext, part: JSON, exam: Bool) -> ListenPartModel { ListenPartModel(ctx: ctx, part: part, exam: exam, io: SilentListenIO()) }

    func start() async {
        await ctx.reload()
        rate = ListenRules.rate(ctx.settings)
        if player == nil { attach(LiveListenIO()) }
    }
    private func attach(_ io: ListenIO) {
        let p = ListenPlayer(part, cast: ListenCast.cast(part, voices: io is LiveListenIO ? LiveListenIO.deviceVoices() : [:]), io: io,
                             config: .init(hqEnabled: ctx.settings["hqVoice"] != JSON.bool(false), clipKeys: nil, rate: { [weak self] in self?.rate ?? ListenRules.defaultRate }))
        p.onLine = { [weak self] i in self?.nowLine = i }
        p.onState = { [weak self] on in self?.playing = on }
        p.onEnd = { [weak self] in
            guard let self else { return }
            self.ended = true; self.playing = false
            if !self.exam { self.player?.stop() }
        }
        p.onBlocked = { [weak self] in self?.blocked = true }
        p.onToast = { [weak self] k in self?.toast = k }
        player = p
    }
    func stop() { player?.stop(); popup = nil }

    // MARK: player
    /// the play button: practice plays / pauses, exam plays exactly once until it is submitted
    func tapPlay() {
        guard let player else { return }
        if player.playing { if exam && !submitted { return }; player.pause(); return }
        if state.tapIgnored { return }
        plays += 1; ended = false; blocked = false; toast = nil
        player.play(from: exam && !submitted ? 0 : nil)
    }
    func back() { player?.back() }
    func tapLine(_ i: Int) { guard !exam || submitted, live || submitted, let player else { return }; plays += 1; ended = false; player.play(from: i) }
    func setRate(_ v: Double) async { rate = v; await ctx.setSetting("listenRate", .number(v)) }
    func hear(_ n: Int) {
        guard let r = outcome?.results.first(where: { $0.n == n }), let h = Transcript.hearStart(part, cue: r.cue), let player else { return }
        scrollTo = h.cueLine; plays += 1; ended = false; player.play(from: h.startsAt)
    }

    /// the player card state (play button, notes) – pure, verified by the vectors
    var state: ListenPlayState {
        var s = ListenPlayState(exam: exam)
        s.submitted = submitted; s.playing = playing; s.ended = ended; s.blocked = blocked; s.plays = plays; s.nowLine = nowLine
        return s
    }

    // MARK: questions
    var items: [(answered: Bool, n: [Int])] {
        part.list("groups").enumerated().flatMap { gi, g -> [(Bool, [Int])] in
            g.s("type") == "multi" ? [(!(answers.multi[gi] ?? []).isEmpty, g.list("n").map { Int(JSON.orZero($0)) })]
                                   : g.list("items").map { (answers.answered($0.i("n")), [$0.i("n")]) }
        }.map { (answered: $0.0, n: $0.1) }
    }
    var progress: Double { let it = items; return it.isEmpty ? 0 : Double(it.filter(\.answered).count) / Double(it.count) }
    func setOne(_ n: Int, _ v: String) { guard !submitted else { return }; answers.one[n] = v }
    /// "choose 2": a third tick is refused
    func toggle(group gi: Int, _ letter: String) {
        guard !submitted else { return }
        var cur = answers.multi[gi] ?? []
        if let i = cur.firstIndex(of: letter) { cur.remove(at: i) } else if cur.count < 2 { cur.append(letter) }
        answers.multi[gi] = cur
    }

    // MARK: submit
    func tapSubmit() async {
        guard !submitted else { return }
        if ListenSubmit.needsConfirm(exam: exam, playing: playing) { confirmSubmit = true; return }
        await submit()
    }
    func submit() async {
        guard !submitted else { return }
        submitted = true; ended = false; player?.stop()
        let out = ListenSubmit.submit(part, answers: answers, game: ctx.game, mistakes: ctx.bundle.mistakes, now: ctx.now)
        outcome = out
        rows = Transcript.rows(part, lexis: ctx.lexis, evidence: true); live = true
        await ctx.commit(game: out.game, mistakes: out.mistakes, reward: out.reward)
    }
    func again() {
        player?.stop()
        answers = QAnswers(); submitted = false; outcome = nil; live = false; plays = 0; ended = false; blocked = false; vocabSaved = []; scrollTo = nil
        rows = Transcript.rows(part, lexis: ctx.lexis, evidence: false)
    }
    /// a fixture state: submitted with fixed answers, no write
    func fixtureSubmit(_ a: QAnswers) {
        answers = a; submitted = true
        let out = ListenSubmit.submit(part, answers: a, game: ctx.game, mistakes: [], now: ctx.now)
        outcome = out; rows = Transcript.rows(part, lexis: ctx.lexis, evidence: true); live = true
    }

    // MARK: results by question type + retake
    private(set) var retaking = false
    private(set) var retakeMarks: [Int: QResult] = [:]
    private(set) var retakeScore: (right: Int, total: Int)?
    private var retakeItems: [[Int]] = []
    /// the marks the questions show: the submit's, or the retake's own
    var marks: [Int: QResult]? {
        guard let o = outcome else { return nil }
        return retaking ? retakeMarks : Dictionary(uniqueKeysWithValues: o.results.map { ($0.n, $0) })
    }
    var stats: [QE.KindStat] { QE.stats(outcome?.results ?? []) }
    /// numbers hidden while retaking (everything already right)
    var hidden: Set<Int> {
        guard retaking else { return [] }
        return Set(QE.numbers(part)).subtracting(retakeItems.flatMap { $0 })
    }
    /// "Làm lại N câu sai": only the wrong questions come back, answers cleared
    func startRetake() {
        guard let o = outcome else { return }
        let res = Dictionary(uniqueKeysWithValues: o.results.map { ($0.n, $0) })
        retakeItems = QE.wrongItems(part, res)
        for ns in retakeItems { for n in ns { answers.one[n] = nil } }
        for (gi, g) in part.list("groups").enumerated() where g.s("type") == "multi" { if retakeItems.contains(where: { $0 == g.list("n").map { Int(JSON.orZero($0)) } }) { answers.multi[gi] = nil } }
        retaking = true; retakeMarks = [:]; retakeScore = nil
    }
    /// "Kiểm tra": mark the retaken questions again (the stored answers decide)
    func recheck() {
        guard let o = outcome, retaking else { return }
        var right = 0, total = 0
        retakeMarks = [:]
        for ns in retakeItems {
            guard let first = o.results.first(where: { $0.n == ns[0] }) else { continue }
            let gi = part.list("groups").firstIndex { $0.s("type") == "multi" && $0.list("n").first.map { Int(JSON.orZero($0)) } == ns[0] }
            let ok = QE.recheck(first, picked: gi.flatMap { answers.multi[$0] } ?? [], text: answers.one[ns[0]] ?? "")
            total += 1; if ok { right += 1 }
            for n in ns { if var r = o.results.first(where: { $0.n == n }) { r.ok = ok; retakeMarks[n] = r } }
        }
        retakeScore = (right, total)
    }
    func showAll() { retaking = false; retakeMarks = [:]; retakeScore = nil }

    // MARK: words
    func tapWord(_ word: String, sentence: String) {
        if service == nil { service = ctx.makeService() }
        let title = part.s("title")
        let m = WordPopupModel(word: word, sentence: sentence, context: ctx, service: service, makeContext: { ListenSubmit.popupContext(sentence: $0, vi: $1, title: title) })
        popup = m
        Task { await m.load() }
    }
    func inDeck(_ w: String) -> Bool { ctx.inDeck(w) }
    func saveVocab(_ k: Int) async {
        let v = part.list("vocab")[k]
        if service == nil { service = ctx.makeService() }
        let svc = service!
        let hit = await svc.quick(v.s("w"))
        let r = await ListenSubmit.vocabSave(v, part: part, dict: hit, meaning: hit.map { Vocab.meanOf($0) }, translate: { await self.ctx.translate($0, with: svc) })
        await ctx.addWord(r.entry, context: r.ctx)
        vocabSaved.insert(k)
    }
}

// MARK: - #/listen-test/<n>

@MainActor @Observable
final class ListenTestModel {
    let ctx: SkillsContext
    private(set) var flow: ListenTestFlow?
    private(set) var result: ListenTestFlow.Result?
    var answers = QAnswers()
    private(set) var nowLine = -1
    private(set) var plays = 0
    private(set) var playing = false
    private(set) var toast: L10nKey?
    var confirmNext = false
    private var player: ListenPlayer?
    private var io: ListenIO?
    private var ticker: Task<Void, Never>?
    private var fallback: Task<Void, Never>?

    init(ctx: SkillsContext, test n: Int, io: ListenIO? = nil) {
        self.ctx = ctx; self.io = io
        flow = ListenTestFlow(test: n, data: ctx.data)
    }
    var test: Int { flow?.n ?? 0 }
    /// unknown test → the hub
    var unknown: Bool { flow == nil }
    var title: String { flow?.title ?? "" }
    var progress: Double { guard let f = flow else { return 0 }; return result != nil ? 1 : f.progressPct / 100 }

    func load() async { await ctx.reload() }
    func begin() { flow?.begin(); startPart() }
    private func startPart() {
        answers = QAnswers(); nowLine = -1; plays = 0; playing = false
        ticker?.cancel(); fallback?.cancel(); player?.stop(); player = nil
        ticker = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(ListenRules.tickMs) * 1_000_000)
                guard !Task.isCancelled, let self else { return }
                if self.flow?.tick() == true { self.startAudio(); return }
                if self.flow?.reading != true { return }
            }
        }
    }
    /// "Bắt đầu nghe ngay"
    func skipReading() { guard flow?.reading == true else { return }; ticker?.cancel(); flow?.start(); startAudio() }
    private func startAudio() {
        guard let f = flow else { return }
        ticker?.cancel()
        let io = self.io ?? LiveListenIO()
        self.io = io
        let p = ListenPlayer(f.part, cast: ListenCast.cast(f.part, voices: io is LiveListenIO ? LiveListenIO.deviceVoices() : [:]), io: io,
                             config: .init(hqEnabled: ctx.settings["hqVoice"] != JSON.bool(false), rate: { ListenRules.defaultRate }))
        p.onLine = { [weak self] i in self?.nowLine = i }
        p.onState = { [weak self] on in self?.playing = on }
        p.onSound = { [weak self] in self?.flow?.sound() }
        p.onBlocked = { [weak self] in self?.flow?.blocked() }
        p.onEnd = { [weak self] in self?.playing = false; self?.flow?.ended() }
        p.onToast = { [weak self] k in self?.toast = k }
        player = p; plays += 1
        p.play(from: 0)
        fallback?.cancel()
        fallback = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(ListenRules.nextFallbackMs) * 1_000_000)
            guard !Task.isCancelled else { return }
            self?.flow?.fallback()
        }
    }
    /// "Chạm ▶ để nghe" after iOS refused to start sound
    func retryPlay() { flow?.retry(); player?.play(from: nil) }

    func tapNext() async {
        guard let f = flow, f.phase != .reading, f.phase != .intro else { return }
        if playing { confirmNext = true; return }
        await next()
    }
    func next() async {
        guard flow != nil else { return }
        player?.stop(); ticker?.cancel(); fallback?.cancel()
        if flow!.next(answers) {
            let r = flow!.finish(game: ctx.game, mistakes: ctx.bundle.mistakes, now: ctx.now)
            result = r
            await ctx.commit(game: r.game, mistakes: r.mistakes, reward: r.reward)
        } else { startPart() }
    }
    func stop() { ticker?.cancel(); fallback?.cancel(); player?.stop() }

    var progressItems: Double {
        guard let f = flow else { return 0 }
        let n = QE.numbers(f.part).count
        return n == 0 ? 0 : Double(QE.numbers(f.part).filter { answers.answered($0) }.count) / Double(n)
    }
    func setOne(_ n: Int, _ v: String) { answers.one[n] = v }
    func toggle(group gi: Int, _ letter: String) {
        var cur = answers.multi[gi] ?? []
        if let i = cur.firstIndex(of: letter) { cur.remove(at: i) } else if cur.count < 2 { cur.append(letter) }
        answers.multi[gi] = cur
    }

    /// fixture states (no timers, no sound, no write)
    func fixtureResult(_ perPart: [QAnswers]) {
        guard flow != nil else { return }
        flow?.begin()
        for a in perPart { _ = flow?.next(a) }
        result = flow?.finish(game: ctx.game, mistakes: [], now: ctx.now)
    }
    func fixturePart(_ k: Int, phase: ListenTestFlow.Phase) {
        flow?.begin()
        for _ in 0..<k { _ = flow?.next(QAnswers()) }
        if phase == .loading || phase == .playing || phase == .listened || phase == .blocked { flow?.start() }
        if phase == .playing || phase == .listened { flow?.sound() }
        if phase == .listened { flow?.ended() }
        if phase == .blocked { flow?.blocked() }
    }
}
