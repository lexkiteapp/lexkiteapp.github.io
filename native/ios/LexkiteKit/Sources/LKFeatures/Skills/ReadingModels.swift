import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

// MARK: - #/dictation/<part>

@MainActor @Observable
final class DictationModel {
    let ctx: SkillsContext
    let part: JSON
    private(set) var session: Dictation.Session
    /// what the learner typed in each gap of the sentence / in the whole-sentence box
    var holes: [String] = []
    var full = ""
    var auto: Bool
    var showTranscript = false
    private(set) var translations: [String] = []
    private(set) var finish: Dictation.Session.Finish?
    private var player: ListenPlayer?
    private var service: DictionaryService?
    private var autoTask: Task<Void, Never>?
    private var io: ListenIO?

    init(ctx: SkillsContext, part: JSON, query: [String: String], io: ListenIO? = nil) {
        self.ctx = ctx; self.part = part; self.io = io
        session = Dictation.Session(part: part, mode: Dictation.mode(query: query, settings: ctx.settings))
        auto = ctx.settings["dictAuto"]?.truthy == true
        resetFields()
        if let io { attach(io) }
    }
    static func fixture(ctx: SkillsContext, part: JSON, mode: String, check: Dictation.Typed? = nil, k: Int = 0) -> DictationModel {
        let m = DictationModel(ctx: ctx, part: part, query: ["m": mode], io: SilentListenIO())
        for _ in 0..<k { m.session.skip() }
        m.resetFields()
        if let check { m.session.check(check) }
        return m
    }

    /// fixture states
    func fixtureCheck(_ typed: Dictation.Typed) { session.check(typed) }
    func fixtureFinished(_ checked: Int) {
        for _ in 0..<min(checked, session.lines.count) {
            let w = session.words
            session.check(session.mode == "full" ? .full(session.lines[session.k].text) : .holes(session.cells.compactMap { if case .hole(let i, _, _, _) = $0 { return Dictation.answer(w[i]) }; return nil }))
            session.advance()
        }
        while !session.finished { session.skip() }
        finish = session.finish(old: nil)
    }

    var lines: [(i: Int, speaker: String, text: String)] { session.lines }
    var current: (i: Int, speaker: String, text: String)? { session.finished ? nil : lines[session.k] }
    var speakerName: String { current.flatMap { part["speakers"]?[$0.speaker]?.s("name") } ?? "" }
    var progress: Double { lines.isEmpty ? 1 : Double(session.k) / Double(lines.count) }
    var holeCount: Int { session.cells.filter { if case .hole = $0 { return true }; return false }.count }

    func start() async {
        await ctx.reload()
        if io == nil { let live = LiveListenIO(); io = live; attach(live) }
        say(after: 300)
    }
    private func attach(_ io: ListenIO) {
        let p = ListenPlayer(part, cast: ListenCast.cast(part, voices: io is LiveListenIO ? LiveListenIO.deviceVoices() : [:]), io: io,
                             config: .init(hqEnabled: ctx.settings["hqVoice"] != JSON.bool(false), rate: { [weak self] in self.map { ListenRules.rate($0.ctx.settings) } ?? ListenRules.defaultRate }))
        p.onEnd = { [weak self] in self?.heardLine() }
        player = p
    }
    func stop() { autoTask?.cancel(); player?.stop() }
    private func resetFields() { holes = Array(repeating: "", count: holeCount); full = "" }

    // MARK: sound
    func say(slow: Bool = false) { guard let c = current else { return }; autoTask?.cancel(); player?.say(line: c.i, slow: slow) }
    private func say(after ms: Int) {
        autoTask?.cancel()
        autoTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: UInt64(ms) * 1_000_000)
            guard !Task.isCancelled else { return }
            self?.say()
        }
    }
    /// "Tự động phát lại câu": the line is played again after the pause while it is not checked
    private func heardLine() { if auto && !session.checked { say(after: ListenRules.autoReplayMs) } }
    func setAuto(_ on: Bool) async {
        auto = on
        await ctx.setSetting("dictAuto", .bool(on))
        if on { say() } else { autoTask?.cancel() }
    }

    // MARK: sentences
    func setMode(_ m: String) async {
        session.setMode(m); resetFields()
        await ctx.setSetting("dictMode", .string(m))
        say(after: 300)
    }
    func previous() { session.previous(); resetFields(); say(after: 300) }
    func skip() { session.skip(); resetFields(); afterMove() }
    func clear() { resetFields(); session.clear() }
    func showAnswer() {
        guard let c = current else { return }
        let w = Dictation.toks(c.text)
        var j = 0
        for cell in session.cells { if case .hole(let i, _, _, _) = cell, j < holes.count { holes[j] = Dictation.answer(w[i]); j += 1 } }
        full = c.text
    }
    /// the check button: first press grades, second press goes to the next sentence
    func tapCheck() async {
        if session.checked { session.advance(); resetFields(); afterMove(); return }
        autoTask?.cancel()
        session.check(session.mode == "full" ? .full(full) : .holes(holes))
    }
    private func afterMove() {
        translations = []
        if session.finished { Task { await finishSitting() } } else { say(after: 300) }
    }
    private func finishSitting() async {
        player?.stop()
        let f = session.finish(old: ctx.game["dictDone"]?[part.s("id")]?.double)
        finish = f
        var g = ctx.game, d = g["dictDone"]?.object ?? [:]
        d[part.s("id")] = .number(f.dictDone); g["dictDone"] = .object(d)
        await ctx.commit(game: g, reward: f.reward)
    }
    /// the transcript card: translated (not for English) the sentences copied so far
    func loadTranslations() async {
        guard showTranscript, ctx.lang != "en", translations.isEmpty else { return }
        if service == nil { service = ctx.makeService() }
        let shown = lines.prefix(session.k + 1).map(\.text)
        let r = await service!.translateTo(shown.joined(separator: "\n"), tl: ctx.lang)
        translations = r.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
    }
}

// MARK: - #/reading

@MainActor @Observable
final class ReadingListModel {
    let ctx: SkillsContext
    private(set) var query: [String: String]
    private(set) var list = ReadingList()
    init(ctx: SkillsContext, query: [String: String]) { self.ctx = ctx; self.query = query }
    func load() async { await ctx.reload(); refresh() }
    func select(_ lv: String) { query = ["lv": lv]; refresh() }
    private func refresh() {
        list = ReadingList.build(ctx.data, query: query, remembered: ctx.defaults.string(forKey: SkillsPrefs.readKey), game: ctx.game, learnLang: ctx.lang)
        ctx.defaults.set(list.persistedLevel, forKey: SkillsPrefs.readKey)
    }
}

// MARK: - #/read/<id>

@MainActor @Observable
final class ReaderModel {
    let ctx: SkillsContext
    let reading: JSON
    private(set) var page: ReaderPage
    private(set) var highlights: [String]
    var picks: [String?]
    private(set) var grade: ReadingGrade?
    private(set) var savedAll = false
    private(set) var aloud = false
    /// the displayed sentence being read, and the token the popup is open for
    private(set) var readingSentence: Int?
    private(set) var active: (sentence: Int, piece: Int)?
    private(set) var scrollTo: (sentence: Int, piece: Int)?
    var confirmBlank = false
    var popup: WordPopupModel?
    private var service: DictionaryService?
    private var aloudTask: Task<Void, Never>?
    private var pending: CheckedContinuation<Void, Never>?

    init(ctx: SkillsContext, reading: JSON) {
        self.ctx = ctx; self.reading = reading
        page = ReaderPage(reading, lexis: ctx.lexis, inDeck: { ctx.inDeck($0) })
        highlights = ReaderPage.highlights(ctx.settings)
        picks = Array(repeating: nil, count: reading.list("questions").count)
    }
    func load() async { await ctx.reload(); rebuild(); highlights = ReaderPage.highlights(ctx.settings) }
    private func rebuild() { page = ReaderPage(reading, lexis: ctx.lexis, inDeck: { [ctx] in ctx.inDeck($0) }) }
    func stop() { stopAloud(); popup = nil }

    // MARK: highlights
    func toggle(_ k: String) async {
        highlights = ReaderPage.toggled(highlights, k)
        await ctx.setSetting("hl", .string(highlights.joined(separator: " ")))
    }
    func isOn(_ k: String) -> Bool { highlights.contains(k) }

    // MARK: words
    func tapWord(sentence si: Int, piece pi: Int) {
        guard case .word(_, let w, _, _) = page.sentences[si][pi] else { return }
        if service == nil { service = ctx.makeService() }
        let title = reading.s("title")
        let m = WordPopupModel(word: w, sentence: ReaderPage.plain(page.sentences[si]), context: ctx, service: service,
                               makeContext: { .obj([("text", .string($0)), ("vi", .string($1)), ("title", .string(ReaderPage.contextTitle(title)))]) })
        popup = m; active = (si, pi)
        Task { await m.load() }
    }
    func closePopup() { popup = nil; active = nil }
    func savePopup() async { await popup?.save(); rebuild() }
    func tapKeyword(_ k: String) {
        guard let t = page.firstToken(for: k) else { return }
        scrollTo = (t.sentence, t.piece)
        Task { try? await Task.sleep(nanoseconds: UInt64(ReadingRules.keywordPopupDelayMs) * 1_000_000); tapWord(sentence: t.sentence, piece: t.piece) }
    }
    /// "+ Lưu tất cả từ khóa"
    func saveAllKeywords() async {
        if service == nil { service = ctx.makeService() }
        let items = page.saveAllKeywords(inDeck: { ctx.inDeck($0) }, index: { _ in nil })
        for it in items {
            var e = it.entry   // a library word keeps its meaning: the dictionary hit replaces the bare `mine` entry
            if e.s("topic") == "mine", let hit = await service?.quick(e.s("word")), hit["found"] != JSON.bool(false), hit.t("word") { e = hit }
            await ctx.addWord(e, context: it.ctx)
        }
        savedAll = true; rebuild()
    }

    // MARK: reading aloud
    private var accent: String { ctx.core.accent(ctx.settings) }
    func toggleAloud() {
        if aloud { stopAloud(); return }
        aloud = true
        let a = page.aloud, pieces = page.sentences.map { VoiceCore.split(ReaderPage.plain($0)) }.flatMap { $0 }
        aloudTask = Task { [weak self] in
            for (j, text) in pieces.enumerated() {
                guard let self, !Task.isCancelled else { return }
                self.readingSentence = j < a.sentenceOf.count ? a.sentenceOf[j] : nil
                await self.speakPiece(text)
            }
            self?.aloud = false; self?.readingSentence = nil
        }
    }
    /// double tap on a sentence
    func readSentence(_ si: Int) {
        stopAloud()
        readingSentence = si
        ctx.core.voice.speak(ReaderPage.plain(page.sentences[si]), who: "ama", accent: accent) { [weak self] in self?.readingSentence = nil }
    }
    private func speakPiece(_ text: String) async {
        await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
            pending = c
            ctx.core.voice.speak(text, who: "ama", accent: accent) { [weak self] in self?.endPiece() }
        }
    }
    private func endPiece() { let c = pending; pending = nil; c?.resume() }
    private func stopAloud() { aloudTask?.cancel(); ctx.core.voice.stop(); endPiece(); aloud = false; readingSentence = nil }

    // MARK: questions
    func pick(_ i: Int, _ v: String) { guard grade == nil else { return }; picks[i] = v }
    func tapCheck() async {
        guard grade == nil else { return }
        if ReadingGrade.needsConfirm(reading, picks: picks) { confirmBlank = true; return }
        await check()
    }
    func check() async {
        guard grade == nil else { return }
        let g = ReadingGrade.grade(reading, picks: picks, game: ctx.game, mistakes: ctx.bundle.mistakes, now: ctx.now)
        grade = g
        await ctx.commit(game: g.game, mistakes: g.mistakes, reward: g.reward)
    }
    /// fixture state: graded with fixed picks, no write
    func fixtureGrade(_ p: [String?]) {
        picks = p
        grade = ReadingGrade.grade(reading, picks: p, game: ctx.game, mistakes: [], now: ctx.now)
    }
}
