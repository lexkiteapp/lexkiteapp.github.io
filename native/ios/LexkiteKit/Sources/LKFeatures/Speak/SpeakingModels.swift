import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

/// #/speaking – the examiner asks, the learner records (Part 2: a minute of preparation first), the speech becomes text and is analysed, a sample answer can be shadowed.
/// All numbers and texts of the rules live in `Speaking` (LKStore); this model owns the clocks and the platform calls, both injected through `SpeakIO`.
@MainActor @Observable
final class SpeakingModel {
    enum Stage: Equatable { case ready, prep, recording, result }
    let ctx: SkillsContext
    let io: SpeakIO
    let pack: SpeakPack
    let lexis: Lexis
    let teacher: TeacherController
    let bank: [JSON]
    private(set) var partId: String
    private(set) var topicIndex: Int
    private(set) var qi = 0
    private(set) var stage: Stage = .ready
    private(set) var seconds: Double = 0
    private(set) var prepLeft = 0
    private(set) var live = ""
    private(set) var analysis: Speaking.Analysis?
    private(set) var micNotice: String?
    private(set) var catalog: TopicCatalog
    private(set) var shadow: Speaking.Shadow?
    private(set) var shadowLast: (score: Int, heard: String)?
    private(set) var shadowError: String?
    private(set) var shadowListening = false
    private(set) var shadowDone: Int?
    var sampleOpen = false
    private var prepUsed = false
    private var t0: Int64 = 0
    private var finals: [String] = []
    private var interim = ""
    private var tick: Task<Void, Never>?
    private var recog: Task<Void, Never>?

    init(ctx: SkillsContext, io: SpeakIO, pack: SpeakPack? = nil, lexis: Lexis? = nil, arg: String?, catalog: TopicCatalog = TopicCatalog(), teacher: TeacherController? = nil) {
        self.ctx = ctx; self.io = io; self.pack = pack ?? SpeakContentStore.pack; self.catalog = catalog
        self.lexis = lexis ?? SkillsContext.sharedLexis
        self.teacher = teacher ?? TeacherController(who: SpeakAccent.ama)
        bank = Speaking.bank(self.pack)
        let r = Speaking.route(arg, bankCount: bank.count)
        partId = r.part; topicIndex = r.topic
    }

    // MARK: what the screen shows
    var parts: [Speaking.Part] { Speaking.parts(pack) }
    var part: Speaking.Part { Speaking.part(partId, pack) }
    var topic: JSON { bank.isEmpty ? .null : bank[topicIndex] }
    var questions: [String] { Speaking.questions(topic, part: partId) }
    var question: String { qi < questions.count ? questions[qi] : "" }
    var askText: String { Speaking.askText(topic, part: partId, question: question) }
    var tips: [String] { Speaking.tips(pack, part: partId) }
    var cuePoints: [String] { topic["p2"]?.strs("points") ?? [] }
    var sample: (sentences: [String], vocab: [(en: String, vi: String)], text: String)? { Speaking.sample(pack, key: partId == "p2" ? (topic["p2"]?.s("q") ?? "") : question) }
    var locale: String { SpeakAccent.locale(ctx.settings) }
    var clockText: String { Speaking.clock(stage == .prep ? Double(prepLeft) : seconds) }
    var tone: Speaking.Tone { stage == .recording ? Speaking.tone(seconds, part) : .neutral }
    /// the words of the topic that help: 8 of the topic, 2 linking, 2 idioms (web: `topic.words.slice(0,8)` + linking + idioms)
    var suggestions: [JSON] {
        func words(_ id: String) -> [JSON] { catalog.topics.first { $0.id == id }?.words ?? [] }
        return Array(words(topic.s("topic")).prefix(8)) + Array(words("linking").prefix(2)) + Array(words("idioms").prefix(2))
    }
    func inDeck(_ w: String) -> Bool { ctx.inDeck(w) }

    // MARK: lifecycle
    func load() async {
        await ctx.reload()
        if catalog.topics.isEmpty { catalog = await WordCatalogRemote.shared.catalog() }
        try? await Task.sleep(nanoseconds: UInt64(Speaking.openSpeakDelayMs) * 1_000_000)
        if stage == .ready { hear() }
    }
    func stop() { tick?.cancel(); recog?.cancel(); io.recognizer.cancel(); io.stopSay() }

    // MARK: navigation inside the screen (web: location.hash = #/speaking/<part>/<topic>)
    func select(part id: String) { reset(); partId = id; qi = 0 }
    func select(topic i: Int) { guard i >= 0, i < bank.count else { return }; reset(); topicIndex = i; qi = 0 }
    /// 🎲: a topic different from the current one
    func randomTopic() {
        guard bank.count > 1 else { return }
        var r = topicIndex, tries = 0
        while r == topicIndex && tries < 50 { r = Int(io.random() * Double(bank.count)) % bank.count; tries += 1 }
        select(topic: r == topicIndex ? (topicIndex + 1) % bank.count : r)
    }
    func nextQuestion() { guard questions.count > 1 else { return }; qi = (qi + 1) % questions.count; analysis = nil; shadow = nil; stage = .ready; hear() }
    private func reset() { stop(); stage = .ready; analysis = nil; shadow = nil; shadowLast = nil; shadowDone = nil; seconds = 0; live = ""; micNotice = nil; prepUsed = false; sampleOpen = false }
    func hear() { io.say(askText, SpeakAccent.ama, locale, false, nil) }

    // MARK: recording
    func micTapped() {
        switch stage {
        case .recording: finishRecording()
        case .prep: break
        case .ready, .result:
            if partId == "p2" && !prepUsed { startPrep() } else { startRecording() }
        }
    }
    private func startPrep() {
        prepUsed = true; stage = .prep; prepLeft = part.prep ?? 60; analysis = nil
        tick?.cancel()
        tick = Task { [weak self] in
            while let self, !Task.isCancelled, self.prepLeft > 0 {
                try? await Task.sleep(nanoseconds: UInt64(Speaking.prepTickMs) * 1_000_000)
                guard !Task.isCancelled else { return }
                self.prepLeft -= 1
            }
            if let self, !Task.isCancelled { self.startRecording() }
        }
    }
    /// "start speaking now" while preparing
    func skipPrep() { guard stage == .prep else { return }; tick?.cancel(); startRecording() }
    func startRecording() {
        io.stopSay(); tick?.cancel()
        stage = .recording; micNotice = nil; analysis = nil; shadow = nil; finals = []; interim = ""; live = ""; seconds = 0
        t0 = io.clock()
        let p = part
        tick = Task { [weak self] in
            while let self, !Task.isCancelled {
                try? await Task.sleep(nanoseconds: UInt64(Speaking.clockTickMs) * 1_000_000)
                guard !Task.isCancelled, self.stage == .recording else { return }
                self.seconds = Double(self.io.clock() - self.t0) / 1000
                if Speaking.autoStop(self.seconds, p) { self.finishRecording(); return }
            }
        }
        // the recogniser may end by itself (a minute of silence): start it again, like the web does, until the learner stops
        recog = Task { [weak self] in
            while let self, !Task.isCancelled, self.stage == .recording {
                let begun = self.io.clock()
                let o = await self.io.recognizer.listen(locale: self.locale, maxSeconds: 120, onPartial: { [weak self] s in self?.interim = s; self?.live = Speaking.live(final: self?.finals ?? [], interim: s) })
                guard !Task.isCancelled, self.stage == .recording else { return }
                if let e = o.error, Recognize.micBlocked.contains(e) || e == "audio-capture" {
                    self.micNotice = SpeakErrors.message(e, self.ctx.l10nForErrors); self.abortRecording(); return
                }
                if o.error == nil, let a = o.alts.first, !a.isEmpty { self.finals.append(a); self.interim = "" }
                if self.io.clock() - begun < 400 { try? await Task.sleep(nanoseconds: 400_000_000) }
            }
        }
    }
    private func abortRecording() { tick?.cancel(); recog?.cancel(); stage = .ready; seconds = 0 }
    /// X on the recording screen: nothing is kept
    /// the back arrow of the result screen: to the hub (the analysis stays until the next attempt)
    func closeResult() { stage = .ready }
    func discard() { stop(); stage = .ready; seconds = 0; live = ""; prepUsed = false }
    func finishRecording() {
        guard stage == .recording else { return }
        tick?.cancel(); recog?.cancel(); io.recognizer.cancel()
        let secs = Double(io.clock() - t0) / 1000
        seconds = secs
        analyse(text: Speaking.transcript(final: finals, interim: interim), seconds: secs)
    }
    /// `analyse(text, secs)` and what it earns
    func analyse(text: String, seconds secs: Double) {
        let found = topicWordsFound(in: text)
        let a = Speaking.analyse(text: text, seconds: secs, part: part, fillers: pack.speaking.s("fillers"), lexis: lexis, topicWords: found)
        analysis = a; stage = .result; live = Speaking.live(text)
        if let r = a.reward { Task { await ctx.commit(reward: r) } }
    }
    private func topicWordsFound(in text: String) -> [String] {
        Speaking.topicWordsFound(in: text, words: (catalog.topics.first { $0.id == topic.s("topic") }?.words ?? []).map { $0.s("word") })
    }
    /// the transcript as tokens for the highlighted view (AWL · linking · cards the learner already has)
    func transcriptPieces(_ text: String) -> [Lexis.Piece] { lexis.markText(text, mine: { [ctx] in ctx.inDeck($0) }).flatMap { $0.flatMap { $0 } } }

    // MARK: save
    func save(word entry: JSON) async { await ctx.addWord(entry, context: nil) }
    func save(phrase en: String, vi: String, title: String) async {
        let sentence = sample?.sentences.first { $0.lowercased().contains((en.lowercased().split(separator: " ").first.map(String.init) ?? en.lowercased())) } ?? ""
        let entry: JSON = .obj([("word", .string(en)), ("vi", .string(ctx.lang == "vi" ? vi : "")), ("topic", .string("mine"))])
        await ctx.addWord(entry, context: .obj([("text", .string(sentence)), ("title", .string(title))]))
    }

    // MARK: shadowing of the sample
    func startShadow() { guard let s = sample else { return }; shadow = Speaking.Shadow(s.sentences); shadowLast = nil; shadowError = nil; shadowDone = nil; saySentence() }
    func saySentence(slow: Bool = false) { guard let sh = shadow, !sh.finished else { return }; io.say(sh.current, SpeakAccent.ama, locale, slow, nil) }
    func playSample() { if let s = sample { io.say(s.text, SpeakAccent.ama, locale, false, nil) } }
    func shadowSpeak() async {
        guard let sh = shadow, !sh.finished, !shadowListening else { return }
        shadowListening = true; shadowError = nil
        let r = await io.attempt(target: sh.current, locale: locale)
        shadowListening = false
        if let e = r.error, r.heard.isEmpty { shadowError = SpeakErrors.message(e, ctx.l10nForErrors); return }
        shadowLast = (Vocab.round(r.conf * 100), r.heard)
    }
    /// "Câu tiếp" after a score
    func shadowNext() async {
        guard var sh = shadow, let last = shadowLast else { return }
        sh.scored(last.score); advance(&sh)
        await finishShadow(sh)
    }
    func shadowSkip() async { guard var sh = shadow else { return }; sh.skip(); advance(&sh); await finishShadow(sh) }
    private func advance(_ sh: inout Speaking.Shadow) { shadow = sh; shadowLast = nil; shadowError = nil }
    private func finishShadow(_ sh: Speaking.Shadow) async {
        if sh.finished { shadowDone = sh.average; await ctx.commit(reward: Speaking.Shadow.reward) } else { saySentence() }
    }

    // MARK: fixtures
    func fixtureRecording(seconds s: Double, live text: String) { stage = .recording; seconds = s; live = text; prepUsed = true }
    func fixturePrep(left: Int) { stage = .prep; prepLeft = left; prepUsed = true; seconds = 0 }
    func fixtureShadow(at k: Int, score: Int?) {
        guard let s = sample else { return }
        var sh = Speaking.Shadow(s.sentences); for _ in 0..<k { sh.scored(80) }
        shadow = sh; if let score { shadowLast = (score, "…") }
    }
}

extension SkillsContext {
    /// the strings of the recogniser errors (the screens only have the language code)
    var l10nForErrors: L10n { L10n(lang: lang) }
}
