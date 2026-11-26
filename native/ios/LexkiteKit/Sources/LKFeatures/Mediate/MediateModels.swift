import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

/// M4 P13 – #/mediate list: the 30 lessons by level with the best score of each (web/js/mediate.js `routes.mediate` list).
@MainActor @Observable
final class MediateListModel {
    let ctx: SkillsContext
    let mediation: Mediation
    private let store: MediateStore
    private(set) var best: [String: MediateStore.Best] = [:]
    init(ctx: SkillsContext, store: MediateStore? = nil, mediation: Mediation = .shared) {
        self.ctx = ctx; self.mediation = mediation
        let st = store ?? MediateStore(defaults: ctx.defaults); self.store = st
        best = st.best
    }
    func load() { best = store.best }
    func route(_ id: String) -> AppRoute { AppRoute("mediate", arg: id) }
}

/// M4 P13 – one lesson: source (listen first for B2+), task, editor with the live word count, mic, check → result card (web `render` + `result`).
@MainActor @Observable
final class MediateLessonModel {
    let ctx: SkillsContext
    let item: MediateItem
    let mediation: Mediation
    private let io: SpeakIO
    private let voice: LKVoicePlayer?
    private let store: MediateStore
    var text: String { didSet { if text != oldValue { store.setDraft(item.id, text) } } }
    private(set) var textShown: Bool
    private(set) var playing = false
    private(set) var listening = false
    private(set) var notice: String?
    private(set) var result: MediateResult?
    private var micTask: Task<Void, Never>?
    private var playToken = 0

    init(ctx: SkillsContext, item: MediateItem, io: SpeakIO, voice: LKVoicePlayer?, store: MediateStore? = nil, mediation: Mediation = .shared) {
        self.ctx = ctx; self.item = item; self.io = io; self.voice = voice; self.mediation = mediation
        let st = store ?? MediateStore(defaults: ctx.defaults); self.store = st
        text = st.draft(item.id)
        textShown = !Mediate.listenFirst(item, in: mediation)
    }
    /// fixed state for fixtures
    func preview(text: String? = nil, result: MediateResult? = nil, textShown: Bool? = nil, listening: Bool = false) {
        if let text { self.text = text }
        self.result = result; if let textShown { self.textShown = textShown }; self.listening = listening
    }

    // MARK: counts
    var task: MediateTask { item.task }
    var words: Int { Mediate.words(text).count }
    var tooShort: Bool { words < task.minWords }
    var over: Bool { task.maxWords > 0 && words > task.maxWords }
    var inRange: Bool { !tooShort && !over }
    var canCheck: Bool { !tooShort }
    var next: MediateItem? { mediation.next(after: item.id) }

    // MARK: source
    func reveal() { textShown = true }
    /// the speaker button: the narrator reads the whole source, a dialogue is read turn by turn in the fixed voices of `Mediate.voices`; the text shows when it ends
    func togglePlay() {
        if playing { stopPlay(); return }
        playing = true; playToken += 1
        let my = playToken, src = item.source, v = Mediate.voices(src)
        let done: () -> Void = { [weak self] in guard let self, self.playToken == my else { return }; self.playing = false; self.textShown = true }
        guard let voice else { done(); return }
        if src.kind != "dialogue" { voice.speak(Mediate.sourceText(src), voiceID: v["_narrator"] ?? Mediate.narrator, onEnd: done); return }
        func step(_ i: Int) {
            guard self.playToken == my else { return }
            guard i < src.lines.count else { done(); return }
            voice.speak(src.lines[i].t, voiceID: v[src.lines[i].s] ?? Mediate.narrator, onEnd: { step(i + 1) })
        }
        step(0)
    }
    func stopPlay() { playToken += 1; playing = false; voice?.stop() }

    // MARK: mic (speak tasks, or "say it instead")
    func toggleMic() {
        if listening { io.recognizer.stop(); return }
        stopPlay(); notice = nil; listening = true
        micTask = Task { [weak self] in
            guard let self else { return }
            let o = await self.io.recognizer.listen(locale: "en-GB", maxSeconds: 60, onPartial: nil)
            self.listening = false
            if let e = o.error { if e != "no-speech" { self.notice = SpeakErrors.message(e, self.ctx.l10nForErrors) }; return }
            if let heard = o.alts.first, !heard.isEmpty { self.text = (self.text.trimmingCharacters(in: .whitespacesAndNewlines) + " " + heard).trimmingCharacters(in: .whitespacesAndNewlines) }
        }
    }

    // MARK: check
    func check() {
        guard canCheck else { return }
        if listening { io.recognizer.cancel() }
        stopPlay(); textShown = true
        let r = Mediate.check(item, text)
        result = r
        store.record(item.id, ok: r.got, of: r.of)
        Task { await ctx.commit(reward: ["quizzes": 1, "xp": RewardRules.xp("set", right: r.got, total: r.of)]) }   // web: App.reward({ quizzes: 1, xp: Game.xpFor('set', …) })
    }
    /// "Edit and check again": back to the editor with the same text
    func retry() { result = nil }
    func leave() { stopPlay(); if listening { io.recognizer.cancel() }; micTask?.cancel() }
}
