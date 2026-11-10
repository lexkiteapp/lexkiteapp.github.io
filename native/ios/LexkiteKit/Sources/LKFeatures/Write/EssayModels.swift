import SwiftUI
import Observation
import LKSync
import LKStore

/// The content of the P09 screens: `web/data/write-pack.json` (criteria data + the tables the web keeps in closures), fetched and cached on disk by `LessonRemote`.
actor WriteContentStore {
    static let shared = WriteContentStore()
    static let path = "data/write-pack.json"
    private var memo: WritePack?
    func pack(source: LessonTextSource = LessonRemote.shared) async -> WritePack? {
        if let memo { return memo }
        guard let t = await source.text(Self.path), let p = WritePack(text: t) else { return nil }
        memo = p
        return p
    }
}

/// The per-device state of #/write and #/task1 (web `Store` keys essays · essayDraft · task1Drafts; they never sync, like the letter drafts).
enum EssayStore {
    static let essaysKey = "lk.essays", draftKey = "lk.essayDraft", task1Key = "lk.task1Drafts"
    static func read(_ key: String, _ d: UserDefaults = .standard) -> JSON? { d.string(forKey: key).flatMap { try? JSON.parse($0) } }
    static func write(_ key: String, _ v: JSON, _ d: UserDefaults = .standard) { d.set(v.stableString, forKey: key) }
}

/// #/write (Task 2) and #/task1 (chart description): one prompt or chart set, an editor with a word counter and a clock, "analyse" → the report, and the saved drafts / essays.
@MainActor @Observable
final class EssayModel {
    enum Kind { case task2, task1 }
    struct Report {
        var text: String
        var task2: Essay.Analysis?
        var task1: Essay.Task1Score?
        var pieces: [[[Lexis.Piece]]]
    }
    let ctx: SkillsContext
    let kind: Kind
    private let defaults: UserDefaults
    private(set) var loaded = false
    private(set) var offline = false
    private(set) var pack = WritePack()
    private(set) var prompts: [JSON] = [], sets: [JSON] = [], models: [JSON] = []
    private(set) var catalog = TopicCatalog()
    private(set) var current: JSON = .null
    private(set) var report: Report?
    private(set) var saved: [JSON] = []
    private(set) var notice: Notice?
    enum Notice: Equatable { case tooShort, timeUp }
    var text = "" { didSet { if text != oldValue { textChanged() } } }
    private(set) var running = false
    private(set) var left: Int
    private var arg: String?
    private var saveTask: Task<Void, Never>?

    init(ctx: SkillsContext, kind: Kind, arg: String?, defaults: UserDefaults = .standard) {
        self.ctx = ctx; self.kind = kind; self.arg = arg; self.defaults = defaults
        left = (kind == .task2 ? Essay.clockMinutes : Essay.task1Clock) * 60
    }

    var minWords: Int { kind == .task2 ? Essay.minWords : Essay.task1MinWords }
    var wordCount: Int { Essay.words(text) }
    var clockText: String { String(format: "%02d:%02d", max(0, left) / 60, max(0, left) % 60) }
    var warn: Bool { left < (kind == .task2 ? Essay.warnSeconds : Essay.task1Warn) }
    var currentId: String { current.s("id") }
    /// the model answer of the shown prompt / set (`t2-<id>` · `t1-<id>`)
    var modelId: String? { let id = (kind == .task2 ? "t2-" : "t1-") + currentId; return models.contains { $0.s("id") == id } ? id : nil }
    /// the words of the prompt's topic offered as chips (14)
    var topicWords: [String] { Array((catalog.topics.first { $0.id == current.s("topic") }?.words ?? []).prefix(14).map { $0.s("word") }) }
    var topicName: String { catalog.topics.first { $0.id == current.s("topic") }?.name ?? "" }
    var outline: [String] { pack.outline[current.s("type")] ?? [] }
    var vocab: [String] { pack.vocab[current.s("type")] ?? [] }

    func load() async {
        guard !loaded else { return }
        await ctx.reload()
        let src = WritingRemoteContent.shared
        async let pk = WriteContentStore.shared.pack()
        async let ps = src.prompts()
        async let ts = src.task1()
        async let ms = src.models()
        async let cat = WordCatalogRemote.shared.catalog()
        let (p, prs, tss, mds) = await (pk, ps, ts, ms)
        catalog = await cat
        guard let p, !(kind == .task2 ? prs : tss).isEmpty else { offline = true; return }
        pack = p; prompts = prs; sets = tss; models = mds
        if kind == .task2 {
            let draft = EssayStore.read(EssayStore.draftKey, defaults)
            let id = arg ?? draft?.s("prompt") ?? "p1"
            current = prompts.first { $0.s("id") == id } ?? prompts[0]
            saved = EssayStore.read(EssayStore.essaysKey, defaults)?.array ?? []
            if draft?.s("prompt") == current.s("id") { text = draft?.s("text") ?? "" }
        } else {
            current = sets.first { $0.s("id") == arg } ?? sets[0]
            text = EssayStore.read(EssayStore.task1Key, defaults)?.s(current.s("id")) ?? ""
        }
        offline = false; loaded = true
    }

    // MARK: choosing
    func select(_ id: String) {
        guard loaded else { return }
        flushSave()
        let all = kind == .task2 ? prompts : sets
        guard let x = all.first(where: { $0.s("id") == id }) else { return }
        current = x; report = nil; notice = nil; stopClock()
        if kind == .task2 { let d = EssayStore.read(EssayStore.draftKey, defaults); text = d?.s("prompt") == id ? d?.s("text") ?? "" : "" }
        else { text = EssayStore.read(EssayStore.task1Key, defaults)?.s(id) ?? "" }
    }
    func randomPrompt() { if let q = prompts.randomElement() { select(q.s("id")) } }
    /// "Bấm để chèn vào bài": the chip's text and a space (the web inserts at the caret; SwiftUI's editor has no caret API before iOS 18, so it goes at the end)
    func insert(_ s: String) { text += (text.isEmpty || text.hasSuffix(" ") || text.hasSuffix("\n") ? "" : " ") + s + " " }

    // MARK: clock
    func toggleClock() {
        if running { running = false } else { notice = nil; if left <= 0 { left = (kind == .task2 ? Essay.clockMinutes : Essay.task1Clock) * 60 }; running = true }
    }
    func tick() {
        guard running else { return }
        left -= 1
        if left <= 0 { running = false; notice = .timeUp }
    }
    func stopClock() { running = false; left = (kind == .task2 ? Essay.clockMinutes : Essay.task1Clock) * 60 }

    // MARK: drafts (600 ms after the last key)
    private func textChanged() {
        guard loaded else { return }
        saveTask?.cancel()
        let at = text
        saveTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 600_000_000)
            guard !Task.isCancelled else { return }
            self?.saveDraft(at)
        }
    }
    private func saveDraft(_ t: String) {
        if kind == .task2 { EssayStore.write(EssayStore.draftKey, .object(["prompt": .string(currentId), "text": .string(t)]), defaults) }
        else {
            var d = JSON.spread(EssayStore.read(EssayStore.task1Key, defaults)); d[currentId] = .string(t)
            EssayStore.write(EssayStore.task1Key, .object(d), defaults)
        }
    }
    func flushSave() { saveTask?.cancel(); if loaded { saveDraft(text) } }

    // MARK: analyse
    func analyse() async {
        let n = wordCount
        if kind == .task2 {
            guard n >= Essay.minToAnalyse else { notice = .tooShort; return }
            await show(text, fresh: true)
        } else {
            guard n >= Essay.task1MinToAnalyse else { notice = .tooShort; return }
            await show(text, fresh: true)
        }
    }
    func open(saved i: Int) async {
        guard i < saved.count else { return }
        text = saved[i].s("text")
        await show(text, fresh: false)
    }
    /// the report of `body` (pure: the learner's words, the Lexis tables and the pack decide)
    func makeReport(_ body: String) -> Report {
        let lexis = SkillsContext.sharedLexis
        let pieces = lexis.markText(body, mine: { [ctx] in ctx.inDeck($0) })
        if kind == .task2 {
            return Report(text: body, task2: lexis.essay(body, stop: pack.stop, indexed: { LibraryWords.shared.contains($0) }), task1: nil, pieces: pieces)
        }
        return Report(text: body, task2: nil, task1: Essay.task1Score(body, type: current.s("type")), pieces: pieces)
    }
    private func show(_ body: String, fresh: Bool) async {
        notice = nil
        let r = makeReport(body)
        report = r
        guard fresh else { return }
        if let a = r.task2 {
            saved = Essay.saving(saved, prompt: currentId, text: body, words: a.words, band: a.band, at: ctx.now)
            EssayStore.write(EssayStore.essaysKey, .array(saved), defaults)
            await ctx.commit(reward: Essay.reward)
        } else { await ctx.commit(reward: Essay.task1Reward) }
    }

    /// fixed state for snapshots: no network, no clock, nothing stored
    static func fixture(ctx: SkillsContext, kind: Kind, pack: WritePack, prompts: [JSON] = [], sets: [JSON] = [], models: [JSON] = [], catalog: TopicCatalog = TopicCatalog(),
                        current id: String, text: String = "", analysed: Bool = false, saved: [JSON] = [], left: Int? = nil) -> EssayModel {
        let m = EssayModel(ctx: ctx, kind: kind, arg: id, defaults: UserDefaults(suiteName: "lk.essay.fixture") ?? .standard)
        m.pack = pack; m.prompts = prompts; m.sets = sets; m.models = models; m.catalog = catalog; m.saved = saved
        m.current = (kind == .task2 ? prompts : sets).first { $0.s("id") == id } ?? .null
        m.text = text
        if let left { m.left = left }
        m.loaded = true
        if analysed { m.report = m.makeReport(text) }
        return m
    }
}
