import SwiftUI
import Observation
import LKCore
import LKStore
import LKSync

/// Optional AI helper for the "hard word" box (web `AI.ask`): returns one memory aid, throws when offline / no key. Injected; nil hides the button.
public protocol StudyMemoryAid: Sendable {
    func tip(word: String, pos: String, meaning: String) async throws -> String
}

/// #/review – the state of one review visit (port of web/js/study.js routes.review / showCard / grade / undo / reviewDone, study-modes.js).
@MainActor @Observable
final class StudyReviewModel {
    enum Phase: Equatable { case loading, empty, allDone, card, summary, redirect }
    struct Check: Equatable { var ok: Bool, grade: Int, answer: String }
    enum SentenceState: Equatable { case idle, needsWord, saved }

    private(set) var phase: Phase = .loading
    private(set) var bundle = VocabBundle()
    private(set) var state: ReviewState?
    private(set) var current: JSON?
    private(set) var summary: ReviewSummary?
    private(set) var mode = "flip"
    private(set) var options: StudyModes.Options?
    var flipped = false
    var typed = ""
    private(set) var hints = 0
    private(set) var replays = 0
    private(set) var picked: Int?
    private(set) var checked: Check?
    var noteDraft = ""
    var sentence = ""
    private(set) var sentenceState: SentenceState = .idle
    private(set) var noteSaved = false
    private(set) var aiTip: String?
    private(set) var aiBusy = false
    private(set) var aiFailed = false
    private(set) var undoneNotice = false
    private(set) var gradeTick = 0
    private(set) var undoTick = 0

    let core: StudyCore
    @ObservationIgnored var query = ReviewEngine.Query()
    @ObservationIgnored var memoryAid: StudyMemoryAid?
    /// read the word aloud when a card needs it (off in snapshots / tests)
    @ObservationIgnored var autoPlay = true
    @ObservationIgnored private var shownAt: Int64 = 0
    @ObservationIgnored private var salt: UInt64 = 0

    init(core: StudyCore) { self.core = core }

    // MARK: derived
    var settings: JSON { bundle.settings }
    var canUndo: Bool { state?.session.canUndo ?? false }
    var reverse: Bool { state?.session.reverse ?? false }
    var done: Int { state?.session.done ?? 0 }
    var left: Int { Set(state?.session.queue ?? []).count }
    var progress: Double { Double(done) / Double(max(1, done + (state?.session.queue.count ?? 0))) }
    var isNew: Bool { current.map { Vocab.isNew($0) } ?? false }
    var lapses: Int { current.map { Vocab.srs($0).lapses } ?? 0 }
    var retentionPercent: Int? { current.flatMap { Vocab.retention($0, now: core.now(), clock: core.clock) }.map { Vocab.round($0 * 100) } }
    var mastery: Int { current.map { Vocab.mastery($0) } ?? 0 }
    var canType: Bool { mode == "type" }
    var typedLetters: String { String(Array(current?.s("word") ?? "").prefix(hints)) }

    /// the interval label under each grade button
    func preview(_ g: Int, lang: String) -> String {
        guard let c = current else { return "" }
        return StudyFmt.interval(core.clock.srs().preview(Vocab.srs(c), grade: g, now: core.now()), lang: lang)
    }

    // MARK: open
    func load(query q: ReviewEngine.Query? = nil) async {
        if let q { query = q }
        bundle = await core.data.load()
        let now = core.now()
        let (start, st) = ReviewEngine.open(cards: bundle.cards, settings: bundle.settings, stats: bundle.stats, seen: bundle.seen, query: query, previous: state?.session, now: now, clock: core.clock)
        state = st; summary = nil
        switch start {
        case .redirectForgetting: phase = .redirect
        case .empty: phase = .empty
        case .allDone: finish(nothing: true)
        case .card: showCard()
        }
    }

    // MARK: card
    private func showCard() {
        guard var st = state else { return }
        guard let c = st.current() else { state = st; finish(nothing: false); return }
        state = st
        current = c
        phase = .card
        flipped = false; typed = ""; hints = 0; replays = 0; picked = nil; checked = nil
        noteDraft = c.s("note"); sentence = ""; sentenceState = .idle; noteSaved = false; aiTip = nil; aiFailed = false; undoneNotice = false
        shownAt = core.now()
        salt &+= 1
        var g = SplitMix64(seed: UInt64(truncatingIfNeeded: shownAt) ^ (salt &* 0x9E37_79B9))
        let lib = bundle.catalog.topics.flatMap(\.words)
        let want = bundle.settings.s("reviewMode")
        let p = StudyModes.pick(c, want: want.isEmpty ? nil : want, reverse: st.session.reverse, cards: st.cardList, settings: bundle.settings, library: lib,
                                mix: { $0.shuffled(using: &g) }, mixAll: { $0.shuffled(using: &g) })
        mode = p.mode; options = p.options
        if Vocab.isNew(c) { markSeen(c) }
        if autoPlay && mode == "audio" { speak() }
    }

    private func markSeen(_ c: JSON) {
        let k = c.s("word").lowercased()
        guard bundle.seen[k] == nil else { return }
        bundle.seen[k] = Double(core.now())
        let seen = bundle.seen
        Task { await core.commit(VocabEdit(seen: seen)) }
    }

    func flip() {
        guard phase == .card, !flipped else { return }
        flipped = true
        if (reverse || bundle.settings["autoSpeak"]?.truthy == true) && autoPlay { speak() }
    }
    func toggleReverse() {
        guard var st = state else { return }
        st.session.reverse.toggle(); state = st
        showCard()
    }
    func setMode(_ m: String) {
        var s = bundle.settings.object ?? [:]; s["reviewMode"] = .string(m); bundle.settings = .object(s)
        showCard()
    }

    // MARK: sound
    func speak(slow: Bool = false) { if let w = current?.s("word") { core.speak(w, settings: bundle.settings, slow: slow) } }
    func replay() { replays += 1; speak() }
    func speakSentence(_ s: String) { core.speakSentence(s, settings: bundle.settings) }
    func shadow3() {
        guard let w = current?.s("word") else { return }
        var left = 3
        func again() {
            guard left > 0 else { return }
            left -= 1
            core.voice.speakWord(w, who: "ama", accent: core.accent(bundle.settings)) { again() }
        }
        again()
    }

    // MARK: type / audio modes
    func hint() { if let w = current?.s("word"), hints < w.count { hints += 1 } }
    func checkTyped() {
        guard mode == "type", checked == nil, let c = current, !typed.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        let w = c.s("word")
        let d = StudyModes.dist(StudyModes.norm(typed), StudyModes.norm(w))
        let g = StudyModes.gradeType(dist: d, len: w.count, hints: hints, ms: Double(core.now() - shownAt), gaveUp: false)
        checked = Check(ok: g > 0, grade: g, answer: w); flipped = true
    }
    func giveUp() {
        guard checked == nil, let w = current?.s("word") else { return }
        checked = Check(ok: false, grade: StudyModes.gradeType(dist: 99, len: w.count, hints: hints, ms: 0, gaveUp: true), answer: w); flipped = true
    }
    func pick(_ i: Int) {
        guard mode == "audio", checked == nil, picked == nil, let o = options, let w = current?.s("word") else { return }
        picked = i
        let ok = i == o.right
        checked = Check(ok: ok, grade: StudyModes.gradeAudio(ok: ok, replays: replays, ms: Double(core.now() - shownAt)), answer: w); flipped = true
    }
    func continueChecked() { if let c = checked { grade(c.grade) } }

    // MARK: grade / undo
    func grade(_ g: Int) {
        guard var st = state, st.current() != nil, let key = st.session.queue.first else { return }
        let now = core.now()
        guard let r = st.grade(g, now: now) else { return }
        state = st
        bundle.stats = st.stats
        bundle.game = StudyGame.apply(bundle.game, StudyDelta(r), now: now, clock: core.clock)
        var edit = VocabEdit(stats: st.stats, game: bundle.game)
        if let c = st.cards[key] {
            edit.upsert = [c]
            if let i = bundle.cards.firstIndex(where: { Vocab.cardKey($0) == key }) { bundle.cards[i] = c }
        }
        gradeTick += 1
        let out = edit
        Task { await core.commit(out) }
        if st.session.queue.isEmpty { finish(nothing: false) } else { showCard() }
    }

    func undo() {
        guard var st = state, let u = st.undo(now: core.now()) else { return }
        state = st
        bundle.stats = st.stats
        bundle.game = ReviewEngine.undoGame(bundle.game, undo: u, now: core.now(), clock: core.clock)
        var edit = VocabEdit(stats: st.stats, game: bundle.game)
        if let key = st.session.queue.first, let c = st.cards[key] {
            edit.upsert = [c]
            if let i = bundle.cards.firstIndex(where: { Vocab.cardKey($0) == key }) { bundle.cards[i] = c }
        }
        undoTick += 1
        let out = edit
        Task { await core.commit(out) }
        showCard()
        undoneNotice = true
    }

    private func finish(nothing: Bool) {
        guard let st = state else { return }
        summary = ReviewEngine.summary(st, settings: bundle.settings, nothing: nothing, now: core.now())
        phase = nothing ? .allDone : .summary
        current = nil
    }

    /// "Ôn trước →": the cards due in the next 2 days
    func reviewAhead() async { await load(query: ReviewEngine.Query(ahead: 2)) }

    // MARK: hard word box + own sentence
    func saveNote() {
        guard var c = current else { return }
        c["note"] = .string(Vocab.prefix(noteDraft.trimmingCharacters(in: .whitespacesAndNewlines), 200))
        persist(c); noteSaved = true
    }
    func makeTip() async {
        guard let ai = memoryAid, let c = current, !aiBusy else { return }
        aiBusy = true; aiFailed = false
        defer { aiBusy = false }
        do {
            let tip = try await ai.tip(word: c.s("word"), pos: c.s("pos"), meaning: Vocab.meanOf(c))
            aiTip = tip
            if !c.t("note") { noteDraft = Vocab.prefix(tip, 200); saveNote() }
        } catch { aiFailed = true }
    }
    func saveSentence() {
        guard var c = current else { return }
        let text = sentence.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        guard let re = StudyModes.wordRegex(c.s("word")), re.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil else { sentenceState = .needsWord; return }
        let ctx = JSON.obj([("text", .string(text)), ("title", .string("Câu của tôi")), ("at", .number(Double(core.now())))])
        c["contexts"] = .array(Array(([ctx] + c.list("contexts")).prefix(5)))
        persist(c)
        bundle.game = StudyGame.apply(bundle.game, StudyDelta(xp: 5), now: core.now(), clock: core.clock)
        let g = bundle.game
        Task { await core.commit(VocabEdit(game: g)) }
        sentenceState = .saved
    }
    private func persist(_ card: JSON) {
        var c = card
        c["mod"] = .number(Double(core.now()))
        current = c
        let key = Vocab.cardKey(c)
        if var st = state { st.replaceCard(c); state = st }
        if let i = bundle.cards.firstIndex(where: { Vocab.cardKey($0) == key }) { bundle.cards[i] = c }
        let out = c
        Task { await core.commit(VocabEdit(upsert: [out])) }
    }
}

extension ReviewState {
    /// swap one card's data (note / contexts) without touching the schedule
    mutating func replaceCard(_ c: JSON) {
        self = ReviewState(cards: cardList.map { Vocab.cardKey($0) == Vocab.cardKey(c) ? c : $0 }, stats: stats, session: session, clock: clock)
    }
}
