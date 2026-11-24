import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore

/// M4 P12 – #/watch hub: search / topic runs, filters, history and "picked for you" (web/js/watch.js `hub`). Device-only state in `WatchStore`.
@MainActor @Observable
final class WatchHubModel {
    struct Run: Equatable {
        var q: String, label: String, topic: String?
        var items: [WatchItem] = []
        var loading = true, offline = false
        var yt: URL
    }
    let ctx: SkillsContext
    let topics: WatchTopics
    private let api: WatchAPI
    private let store: WatchStore
    private(set) var filters: WatchFilters
    private(set) var run: Run?
    private(set) var history: [WatchHistory] = []
    private(set) var suggested: [WatchTopic] = []
    private(set) var autoLevel = 2
    private var seq = 0
    /// `#/watch?topic=…` / `?q=…` open a run at once
    private var pending: [String: String]

    init(ctx: SkillsContext, query: [String: String] = [:], api: WatchAPI = LiveWatchAPI(), store: WatchStore? = nil, topics: WatchTopics = .shared) {
        pending = query
        self.ctx = ctx; self.api = api; self.topics = topics
        let st = store ?? WatchStore(defaults: ctx.defaults); self.store = st
        filters = st.filters
    }
    /// fixed state for fixtures (no network)
    func preview(run: Run?) { self.run = run }

    func load() async {
        await ctx.reload(); refresh()
        let q = pending; pending = [:]
        if let tp = q["topic"], !tp.isEmpty { openTopic(tp) } else if let text = q["q"], !text.isEmpty { start(q: text, label: text, topic: nil) }
    }
    private var placement: JSON? { ctx.settings["placement"] }
    private func refresh() {
        filters = store.filters
        autoLevel = Watch.myLevel(placement, topics: topics)
        history = Array(store.history.prefix(8))
        let words = Set(ctx.bundle.cards.map { $0.s("word").lowercased() })
        suggested = Watch.forYou(goal: Watch.goal(ctx.settings), level: filters.lv != 0 ? filters.lv : autoLevel, deckWords: words, historyTopics: store.history.map(\.topic), topics: topics)
    }

    func setFilters(_ f: WatchFilters) { filters = f; store.filters = f; refresh(); rerun() }
    /// a link → the route to open at once; text → a search run
    func submit(_ text: String) -> AppRoute? {
        let v = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !v.isEmpty else { return nil }
        if let y = Watch.ytParse(v) { return route(y.id, t: y.t) }
        start(q: v, label: v, topic: nil)
        return nil
    }
    func route(_ id: String, t: Int = 0) -> AppRoute { AppRoute("watch", arg: id, query: t > 0 ? ["t": String(t)] : [:]) }
    func openTopic(_ id: String) { if let tp = topics.topic(id) { start(q: tp.q[0], label: tp.name, topic: tp.id) } }
    func close() { seq += 1; run = nil }
    /// a card tap: what the card knows about the video travels to the player (`wt.pick`)
    func pick(id: String, title: String, ch: String, topic: String?) { store.pick = WatchPick(id: id, title: title, ch: ch, topic: topic ?? run?.topic ?? "") }
    func rerun() { if let r = run { start(q: r.q, label: r.label, topic: r.topic) } }

    private func feed(_ tp: WatchTopic?) async -> WatchReply {
        guard let tp, !tp.ch.isEmpty else { return WatchReply() }
        return await api.get("feed", ["ch": tp.ch.joined(separator: ",")])
    }
    func start(q: String, label: String, topic: String?) {
        let f = filters, tp = topic.flatMap { topics.topic($0) }, full = Watch.buildQ(q, filters: f, placement: placement, topics: topics)
        seq += 1
        let my = seq
        run = Run(q: q, label: label, topic: topic, yt: Watch.youtubeSearchURL(full))
        Task { [self] in
            async let s = api.get("search", ["q": full, "dur": f.dur, "cc": f.cc ? "1" : ""])
            async let fd = feed(tp)
            let (sr, fr) = await (s, fd)
            guard my == seq, run != nil else { return }
            run?.items = Watch.merge(search: sr.items, feed: fr.items, topic: tp, dur: f.dur)
            run?.offline = sr.offline
            run?.loading = false
            if let fb = sr.fallback, let u = URL(string: fb), u.scheme == "https" { run?.yt = u }
        }
    }
}

/// M4 P12 – one video: the web view bridge (`lk` messages, `lk.cmd` commands), A–B loop, position saving, time notes, word lookup (web `player`).
@MainActor @Observable
final class WatchPlayerModel {
    let id: String
    let ctx: SkillsContext
    let start: Int
    private let api: WatchAPI
    private let store: WatchStore
    private(set) var title: String
    private(set) var ch: String
    private let topic: String
    private(set) var ready = false
    private(set) var playing = false
    private(set) var failed = false
    private(set) var len: Double = 0
    private(set) var pos: Double = 0
    private(set) var loop = WatchLoop()
    private(set) var rate: Double = 1
    private(set) var notes: [WatchNote]
    private(set) var hint = false
    private(set) var lookup: WordPopupModel?
    /// set by the web view: runs `lk.cmd({...})` in the page
    var evaluate: (String) -> Void = { _ in }
    private var dead = false
    private var saveTask: Task<Void, Never>?
    private var service: DictionaryService?

    init(id: String, startAt: Int = 0, ctx: SkillsContext, api: WatchAPI = LiveWatchAPI(), store: WatchStore? = nil) {
        self.id = id; self.ctx = ctx; self.api = api
        let st = store ?? WatchStore(defaults: ctx.defaults); self.store = st
        let pick = st.pick.flatMap { $0.id == id ? $0 : nil }, prev = st.history.first { $0.id == id }
        start = startAt > 0 ? startAt : (prev.map { $0.pos > 5 && $0.len > 0 && $0.pos < $0.len - 10 ? $0.pos : 0 } ?? 0)
        title = pick?.title.nilIfEmpty ?? prev?.title ?? ""
        ch = pick?.ch.nilIfEmpty ?? prev?.ch ?? ""
        topic = pick?.topic.nilIfEmpty ?? prev?.topic ?? ""
        notes = st.notes(id)
        pos = Double(prev?.pos ?? 0); len = Double(prev?.len ?? 0)
        remember()
        if title.isEmpty { Task { [self] in await loadInfo() } }
    }
    /// fixed state for fixtures
    func preview(ready: Bool = true, playing: Bool = false, pos: Double = 0, len: Double = 0, loop: WatchLoop = WatchLoop(), failed: Bool = false, lookup: WordPopupModel? = nil) {
        self.ready = ready; self.playing = playing; self.pos = pos; self.len = len; self.loop = loop; self.failed = failed; self.lookup = lookup
    }

    private func loadInfo() async {
        let d = await api.get("info", ["id": id])
        guard !dead else { return }
        if let t = d.title, !t.isEmpty { title = t; ch = d.ch ?? ""; remember() }
        if d.embeddable == false { failed = true }
    }

    // MARK: bridge
    /// one JSON string of the page: ready · state · time · error
    func handle(_ message: String) {
        guard !dead, let j = try? JSON.parse(message) else { return }
        switch j.s("e") {
        case "ready": ready = true; len = j.d("len") ?? 0
        case "state":
            let s = j.i("s")
            playing = s == 1
            saveTask?.cancel()
            if playing { saveTask = Task { [weak self] in while !Task.isCancelled { try? await Task.sleep(nanoseconds: 5_000_000_000); if Task.isCancelled { break }; self?.remember() } } } else { remember() }
            if s == 0 { Task { [self] in await ctx.commit(reward: ["xp": RewardRules.xp("step")]) } }   // web: App.reward({ xp: Game.xpFor('step') })
        case "time":
            pos = j.d("t") ?? pos
            if let to = loop.jump(at: pos) { seek(to) }
        case "error": failed = true
        default: break
        }
    }
    private func cmd(_ js: String) { evaluate("lk.cmd(\(js))") }
    func seek(_ t: Double) { pos = max(0, t); cmd("{op:'seek',t:\(String(format: "%.2f", max(0, t)))}") }

    // MARK: controls
    func togglePlay() { cmd(playing ? "{op:'pause'}" : "{op:'play'}") }
    func back5() { seek(pos - 5) }
    func setRate(_ r: Double) { rate = r; cmd("{op:'rate',r:\(r)}") }
    func markA() { loop.setA(pos); hint = false }
    func markB() { if let a = loop.setB(pos) { seek(a) }; hint = false }
    func toggleLoop() {
        if loop.toggle() { hint = false } else {
            hint = true
            Task { [self] in try? await Task.sleep(nanoseconds: 4_000_000_000); hint = false }
        }
    }
    /// pause and save when the screen goes away (no background play)
    func leave() {
        guard !dead else { return }
        pause()
        dead = true; saveTask?.cancel()
        remember()
    }
    func pause() { if playing { cmd("{op:'pause'}") } }

    private func remember() {
        guard pos >= 1 || !title.isEmpty else { return }
        store.remember(WatchHistory(id: id, title: title, ch: ch, topic: topic, pos: Int(pos), len: Int(len), at: Date().timeIntervalSince1970 * 1000))
    }

    // MARK: notes
    func addNote(_ text: String) {
        let v = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !v.isEmpty else { return }
        store.setNotes(id, store.notes(id) + [WatchNote(t: Int(pos), text: v)])
        notes = store.notes(id)
    }
    func deleteNote(_ i: Int) {
        var n = store.notes(id)
        guard n.indices.contains(i) else { return }
        n.remove(at: i); store.setNotes(id, n); notes = n
    }

    // MARK: word
    /// "Tra cứu": the shared dictionary lookup; the sentence (when given) is saved as context with this video and moment as source
    func lookupWord(_ word: String, sentence: String) {
        let w = word.trimmingCharacters(in: .whitespacesAndNewlines).lowercased(), s = sentence.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !w.isEmpty else { return }
        if service == nil { service = ctx.makeService() }
        let at = pos, vid = id, name = title.isEmpty ? "YouTube" : title
        let m = WordPopupModel(word: w, sentence: s, context: ctx, service: service, makeContext: { text, vi in
            .obj([("text", .string(text)), ("vi", .string(vi)), ("title", .string("▶️ \(name) (\(Watch.fmt(at)))")), ("source", .string(Watch.ytURL(vid, at: at).absoluteString))])
        })
        lookup = m
        Task { await m.load() }
    }
}

private extension String { var nilIfEmpty: String? { isEmpty ? nil : self } }
