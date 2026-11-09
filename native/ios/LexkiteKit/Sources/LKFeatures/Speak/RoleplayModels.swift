import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

/// The device-only choices of the web (`localStorage vb.rp.level` / `vb.rp.day`), kept as JSON text like the web does.
enum RoleplayPrefs {
    static func level(_ d: UserDefaults) -> Int { Roleplay.level(stored: d.string(forKey: Roleplay.levelKey).flatMap { try? JSON.parse($0) }) }
    static func setLevel(_ n: Int, _ d: UserDefaults) { d.set(String(n), forKey: Roleplay.levelKey) }
    static func day(_ d: UserDefaults) -> Roleplay.Day? { d.string(forKey: Roleplay.dayKey).flatMap { try? JSON.parse($0) }.flatMap { Roleplay.day(from: $0) } }
    static func setDay(_ day: Roleplay.Day?, _ d: UserDefaults) { if let day { d.set(Roleplay.dayJSON(day).stableString, forKey: Roleplay.dayKey) } }
}

/// The scripts and rules of the pack in use (the bundled starter until the full pack is fetched).
@MainActor
enum RoleplayContent {
    static var scripts: [JSON] { SpeakContentStore.pack.roleplay.list("scripts") }
    static var rules: RoleplayRules { RoleplayRules(pack: SpeakContentStore.pack.roleplay) }
}

/// https://lexkite.com/api/ai (kind "rp"): the same request as the web (`X-Lexkite-Device`, Bearer token when signed in, 30 s); 429 = quota, anything else wrong = failed.
struct LexkiteAIServer: RoleplayServer {
    static let url = URL(string: "https://lexkite.com/api/ai")!
    var session: URLSession = .shared
    var token: @Sendable () async -> String? = { nil }
    var device: String
    static func deviceID(_ d: UserDefaults = .standard) -> String {
        if let s = d.string(forKey: "lk.deviceId"), !s.isEmpty { return s }
        let s = UUID().uuidString.lowercased(); d.set(s, forKey: "lk.deviceId"); return s
    }
    func ask(sys: String, prompt: String) async throws -> JSON {
        var rq = URLRequest(url: Self.url, timeoutInterval: 30)
        rq.httpMethod = "POST"
        rq.setValue("application/json", forHTTPHeaderField: "Content-Type")
        rq.setValue(device, forHTTPHeaderField: "X-Lexkite-Device")
        if let tk = await token() { rq.setValue("Bearer " + tk, forHTTPHeaderField: "Authorization") }
        rq.httpBody = JSON.obj([("prompt", .string(prompt)), ("sys", .string(sys)), ("kind", .string("rp"))]).stableString.data(using: .utf8)
        let data: Data, resp: URLResponse
        do { (data, resp) = try await session.data(for: rq) } catch { throw RoleplayServerError.failed }
        guard let h = resp as? HTTPURLResponse else { throw RoleplayServerError.failed }
        if h.statusCode == 429 { throw RoleplayServerError.quota }
        guard (200..<300).contains(h.statusCode), let j = try? JSON.parse(data), let out = j["out"], out.truthy else { throw RoleplayServerError.failed }
        return out
    }
}

// MARK: - list and brief

@MainActor @Observable
final class RoleplayListModel {
    let ctx: SkillsContext
    let scripts: [JSON]
    let rules: RoleplayRules
    let signedIn: Bool
    private(set) var level: Int
    init(ctx: SkillsContext, signedIn: Bool, scripts: [JSON]? = nil, rules: RoleplayRules? = nil) {
        self.ctx = ctx; self.signedIn = signedIn
        self.scripts = scripts ?? RoleplayContent.scripts; self.rules = rules ?? RoleplayContent.rules
        level = RoleplayPrefs.level(ctx.defaults)
    }
    var sections: (everyday: [JSON], work: [JSON]) { Roleplay.sections(scripts) }
    var levelLabels: [String] { Roleplay.hubLevelLabels(scripts, rules) }
    func setLevel(_ n: Int) { level = n; RoleplayPrefs.setLevel(n, ctx.defaults) }
}

@MainActor @Observable
final class RoleplayBriefModel {
    let ctx: SkillsContext
    let script: JSON
    let rules: RoleplayRules
    private(set) var level: Int
    private(set) var saved: Set<Int> = []
    init(ctx: SkillsContext, script: JSON, rules: RoleplayRules? = nil) {
        self.ctx = ctx; self.script = script; self.rules = rules ?? RoleplayContent.rules
        level = RoleplayPrefs.level(ctx.defaults)
    }
    var levels: [String] { Roleplay.levels(script, rules) }
    func setLevel(_ n: Int) { level = n; RoleplayPrefs.setLevel(n, ctx.defaults) }
    /// a tapped vocabulary chip → `App.addWord`
    func save(_ i: Int) async {
        guard !saved.contains(i), script.list("vocab").indices.contains(i) else { return }
        let v = Roleplay.vocabEntry(script, i)
        saved.insert(i)
        await ctx.addWord(v.entry, context: v.context)
    }
    func fixtureSaved(_ i: Int) { saved.insert(i) }
}

// MARK: - chat

@MainActor @Observable
final class RoleplayChatModel {
    enum Phase: Equatable { case chat, scoring, report(Roleplay.Report) }
    enum Notice: Equatable { case quota, busy, mic(String) }
    struct HintBox: Equatable {
        var tip: String?
        var line: String
        var help: Bool
    }

    let ctx: SkillsContext
    let script: JSON
    let level: Int
    let rules: RoleplayRules
    let signedIn: Bool
    /// `RP.chat` of #/confidence: the extra "Giúp tôi nói" button and a "Tiếp tục" at the end
    let helpButton: Bool
    var done: ((Int?) -> Void)?
    private let chat: RoleplayChat
    private let io: SpeakIO
    private(set) var bubbles: [Roleplay.Bubble] = []
    var typing = false
    var input = ""
    private(set) var hintBox: HintBox?
    private(set) var listening = false
    private(set) var partial = ""
    var notice: Notice?
    private(set) var phase: Phase = .chat
    private var reportTask: Task<Void, Never>?

    init(ctx: SkillsContext, script: JSON, level: Int, rules: RoleplayRules, server: RoleplayServer?, signedIn: Bool, online: Bool = true, io: SpeakIO, helpButton: Bool = false) {
        self.ctx = ctx; self.script = script; self.level = level; self.rules = rules; self.signedIn = signedIn; self.io = io; self.helpButton = helpButton
        let before = RoleplayPrefs.day(ctx.defaults)
        chat = RoleplayChat(script: script, level: level, rules: rules, server: server, signedIn: signedIn, online: online, day: before,
                            today: Roleplay.today(ctx.now), random: io.random)
        if chat.day != before { RoleplayPrefs.setDay(chat.day, ctx.defaults) }   // one AI conversation counted
    }

    var mode: Roleplay.Brain { chat.mode }
    var turn: (i: Int, n: Int) { chat.turnLabel }
    var levelName: String { Roleplay.levels(script, rules)[level] }
    var accent: String { SpeakAccent.locale(ctx.settings) }

    /// the AI's first line (spoken)
    func begin() {
        guard bubbles.isEmpty else { return }
        let b = chat.start(); bubbles = chat.hist; say(b.text)
    }
    func stop() { reportTask?.cancel(); io.stopSay(); io.recognizer.cancel() }
    func say(_ text: String, slow: Bool = false) { io.say(text, SpeakAccent.ama, accent, slow, nil) }

    func send(_ raw: String) async {
        let text = raw.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        guard phase == .chat, !text.isEmpty, !chat.busy, !chat.allTurnsDone else { return }
        input = ""; hintBox = nil
        bubbles = chat.hist + [Roleplay.Bubble(who: "me", text: text, turn: chat.i)]
        typing = true
        let step = await chat.send(text)
        typing = false
        bubbles = chat.hist
        guard let step else { return }
        if let t = step.toasts.first { notice = t == .quota ? .quota : .busy }
        if let last = step.bubbles.last { say(last.text) }
        if step.allTurnsDone { reportTask = Task { [weak self] in try? await Task.sleep(nanoseconds: 600_000_000); if !Task.isCancelled { await self?.end() } } }
        if chat.day != RoleplayPrefs.day(ctx.defaults) { RoleplayPrefs.setDay(chat.day, ctx.defaults) }
    }
    /// the mic: the recogniser's target is the hint line of the turn; what it hears is sent like typed text
    func mic() async {
        if listening { io.recognizer.cancel(); return }
        guard phase == .chat, !chat.busy else { return }
        io.stopSay(); listening = true; partial = ""
        let r = await io.attempt(target: Roleplay.hintLine(script, chat.i, level), locale: accent, maxSeconds: 10, onPartial: { [weak self] in self?.partial = $0 })
        listening = false; partial = ""
        if r.heard.isEmpty { if let e = r.error { notice = .mic(e) } else { notice = .mic("no-speech") } } else { await send(r.heard) }
    }
    func showHint() { let h = chat.hint(); hintBox = HintBox(tip: h.tip, line: h.line, help: false) }
    /// "Giúp tôi nói": the line is read slowly and put in the box
    func showHelp() { let l = chat.help(); hintBox = HintBox(tip: nil, line: l, help: true); input = l; say(l, slow: true) }
    /// "Kết thúc & chấm điểm" (also 600 ms after the last turn)
    func end() async {
        guard phase == .chat, !chat.busy else { return }
        phase = .scoring; typing = false; io.stopSay(); io.recognizer.cancel()
        let lang = Locale(identifier: "en").localizedString(forLanguageCode: ctx.lang) ?? "English"
        let rep = await chat.finish(signedIn: signedIn, language: lang)
        if !rep.empty { await ctx.commit(reward: rep.reward) }
        phase = .report(rep)
    }
    func finishCallback(_ rep: Roleplay.Report) { done?(rep.empty ? nil : rep.ring) }
    /// a rewrite saved as a flashcard
    func save(_ r: Roleplay.Rewrite) async { let v = Roleplay.rewriteEntry(script, r); await ctx.addWord(v.entry, context: v.context) }

    /// fixtures: a conversation replayed through the real engine with scripted replies, silent
    static func fixture(ctx: SkillsContext, script: JSON, level: Int = 1, rules: RoleplayRules, say: [String], typing: Bool = false, hint: Bool = false, end: Bool = false) async -> RoleplayChatModel {
        let m = RoleplayChatModel(ctx: ctx, script: script, level: level, rules: rules, server: nil, signedIn: false, io: SpeakIO.scripted(random: { 0.9 }))
        m.begin()
        for s in say { await m.send(s) }
        m.reportTask?.cancel()
        if hint { m.showHint() }
        if end { await m.end() }
        m.typing = typing
        return m
    }
}

// MARK: - one scenario: brief → chat → report (one pushed route, like the web)

@MainActor @Observable
final class RoleplayFlowModel {
    let ctx: SkillsContext
    let script: JSON
    let rules: RoleplayRules
    let brief: RoleplayBriefModel
    private(set) var chat: RoleplayChatModel?
    private let signedIn: Bool
    private let server: () -> RoleplayServer?
    private let io: () -> SpeakIO
    init(ctx: SkillsContext, script: JSON, rules: RoleplayRules, signedIn: Bool, server: @escaping () -> RoleplayServer?, io: @escaping () -> SpeakIO) {
        self.ctx = ctx; self.script = script; self.rules = rules; self.signedIn = signedIn; self.server = server; self.io = io
        brief = RoleplayBriefModel(ctx: ctx, script: script, rules: rules)
    }
    func start() {
        let m = RoleplayChatModel(ctx: ctx, script: script, level: brief.level, rules: rules, server: server(), signedIn: signedIn, io: io())
        chat = m; m.begin()
    }
    /// back to the brief (X) – the conversation stops
    func leave() { chat?.stop(); chat = nil }
    /// "Luyện lại"
    func again() { leave(); start() }
}
