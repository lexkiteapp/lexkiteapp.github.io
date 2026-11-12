import Foundation
import LKSync
import LKCore

/// M4 P07 – #/roleplay conversation engine (web/js/roleplay.js, also `RP.chat` of #/confidence). No UI, no clock, no random generator, no network of its own:
/// the other side is a `RoleplayServer`, randomness and the date are inputs. Brain order: on-device AI (web-only, skipped) → server `/api/ai` (guests
/// `guestAiPerDay` AI conversations a day, never offline) → the fixed script; a server error / 429 switches to the script for the rest of the chat.
/// Verified against vectors/speak.json `roleplay.*` (SpeakRtypeRoleplayVectorTests).
public struct RoleplayRules: Sendable {
    public var names: [String: String] = [:], confidence: [String: String] = [:]
    public var ack: [[String]] = [], rate: [Double] = [], levels: [String] = []
    public var guestAiPerDay = 0
    var politeSource = "", politeFlags = ""
    var errors: [(source: String, flags: String)] = []
    public init() {}
    /// from `speak-pack.json → roleplay`
    public init(pack r: JSON) {
        for (k, v) in r["names"]?.object ?? [:] { names[k] = v.string ?? "" }
        for (k, v) in r["confidence"]?.object ?? [:] { confidence[k] = v.string ?? "" }
        ack = r.list("ack").compactMap { $0.array?.compactMap(\.string) }
        rate = r.list("rate").compactMap(\.double)
        levels = r.strs("levels")
        guestAiPerDay = r.i("guestAiPerDay")
        politeSource = r["polite"]?.s("source") ?? ""; politeFlags = r["polite"]?.s("flags") ?? ""
        errors = r.list("errors").map { ($0.s("source"), $0.s("flags")) }
    }
    static func compile(_ source: String, _ flags: String) -> NSRegularExpression? {
        try? NSRegularExpression(pattern: source, options: flags.contains("i") ? [.caseInsensitive] : [])
    }
    var polite: NSRegularExpression? { Self.compile(politeSource, politeFlags) }
    var errorRegexes: [NSRegularExpression] { errors.compactMap { Self.compile($0.source, $0.flags) } }
}

/// the other side of a conversation: POST /api/ai {prompt, sys, kind:"rp"} → `out` of the answer
public protocol RoleplayServer: Sendable {
    func ask(sys: String, prompt: String) async throws -> JSON
}
public enum RoleplayServerError: Error, Equatable, Sendable { case quota, failed }

public enum Roleplay {
    public static let levelKey = "vb.rp.level", dayKey = "vb.rp.day"
    public enum Brain: String, Equatable, Sendable { case nano, server, script }
    public struct Day: Equatable, Sendable { public var d: String, n: Int; public init(d: String, n: Int) { self.d = d; self.n = n } }
    public static let signedInLeft = 99
    /// the one fixed line asking for more (web `scripted`, per level)
    static let clarify = ["Sorry, can you say a little more?", "Sorry, could you tell me a bit more?", "Could you expand on that a little?"]

    // MARK: script access
    public static func isDaily(_ s: JSON) -> Bool { s.s("kind") == "everyday" }
    /// the three level names of a script (everyday A1 A2 B1 in `lv`, work scripts the pack's B1 B2 C1)
    public static func levels(_ s: JSON, _ rules: RoleplayRules) -> [String] { s["lv"]?.array != nil ? s.strs("lv") : rules.levels }
    /// stored `vb.rp.level`: 0, 1 or 2, anything else ⇒ 1
    public static func level(stored: JSON?) -> Int {
        guard let v = stored, case .number(let n) = v, n == 0 || n == 1 || n == 2 else { return 1 }
        return Int(n)
    }
    public static func turnLine(_ s: JSON, _ i: Int, _ L: Int) -> String { s.list("turns")[max(0, min(i, s.list("turns").count - 1))].list("a")[L].string ?? "" }
    public static func hintLine(_ s: JSON, _ i: Int, _ L: Int) -> String { s.list("turns")[max(0, min(i, s.list("turns").count - 1))].list("h")[L].string ?? "" }

    public static func words(_ s: String) -> [String] {
        guard let re = try? NSRegularExpression(pattern: "[A-Za-z][A-Za-z'’-]*") else { return [] }
        let ns = s as NSString
        return re.matches(in: s, range: NSRange(location: 0, length: ns.length)).map { ns.substring(with: $0.range) }
    }
    static func matches(_ re: NSRegularExpression?, _ s: String) -> Bool {
        guard let re else { return false }
        return re.firstMatch(in: s, range: NSRange(location: 0, length: (s as NSString).length)) != nil
    }

    /// the hub: everyday scripts (A1–B1) then work scripts (B1–C1), in data order
    public static func sections(_ scripts: [JSON]) -> (everyday: [JSON], work: [JSON]) { (scripts.filter(isDaily), scripts.filter { !isDaily($0) }) }
    /// "A1 / B1" … : the everyday level next to the work level of the same index
    public static func hubLevelLabels(_ scripts: [JSON], _ rules: RoleplayRules) -> [String] {
        let daily = scripts.first(where: isDaily).map { $0.strs("lv") } ?? []
        return rules.levels.enumerated().map { (daily.indices.contains($0.offset) ? daily[$0.offset] + " / " : "") + $0.element }
    }
    /// the name shown for a script: the pack's `names[id]` key (Vietnamese web key), else the script's own title
    public static func nameKey(_ s: JSON, _ rules: RoleplayRules) -> String { rules.names[s.s("id")] ?? (s.t("name") ? s.s("name") : s.s("title")) }
    /// "#/confidence" lesson of a script (leading slash), "" when it has none
    public static func confidencePath(_ id: String, _ rules: RoleplayRules) -> String { rules.confidence[id].map { "/" + $0 } ?? "" }
    /// a tapped vocabulary chip: the `App.addWord` arguments
    public static func vocabEntry(_ s: JSON, _ idx: Int) -> (entry: JSON, context: JSON) {
        let v = s.list("vocab")[idx].array ?? [], w = v.first?.string ?? "", d = v.count > 1 ? (v[1].string ?? "") : ""
        return (.obj([("word", .string(w)), ("def", .string(d)), ("emoji", .string(s.s("em"))), ("topic", .string("roleplay"))]),
                .obj([("text", .string(d)), ("title", .string("Roleplay: " + s.s("title")))]))
    }
    /// "+ Lưu vào flashcard" of a rewrite
    public static func rewriteEntry(_ s: JSON, _ r: Rewrite) -> (entry: JSON, context: JSON) {
        (.obj([("word", .string(r.better)), ("vi", .string(r.meaning)), ("pos", .string("phrase")), ("ex", .string(r.better)), ("emoji", .string(s.s("em"))), ("topic", .string("roleplay"))]),
         .obj([("text", .string(r.better)), ("title", .string("Roleplay: " + s.s("title")))]))
    }

    // MARK: guest budget
    /// `new Date().toISOString().slice(0, 10)` (UTC)
    public static func today(_ nowMs: Int64) -> String {
        var c = Calendar(identifier: .gregorian); c.timeZone = TimeZone(identifier: "UTC")!
        let p = c.dateComponents([.year, .month, .day], from: Date(timeIntervalSince1970: Double(nowMs) / 1000))
        return String(format: "%04d-%02d-%02d", p.year ?? 0, p.month ?? 0, p.day ?? 0)
    }
    public static func aiLeft(signedIn: Bool, day: Day?, today: String, perDay: Int) -> Int {
        signedIn ? signedInLeft : perDay - (day?.d == today ? day!.n : 0)
    }
    public static func useAi(_ day: Day?, today: String) -> Day { Day(d: today, n: (day?.d == today ? day!.n : 0) + 1) }
    /// the brain of a new conversation and the counter after it: server when AI is left and the device is online
    public static func chooseBrain(signedIn: Bool, online: Bool, day: Day?, today: String, rules: RoleplayRules) -> (Brain, Day?) {
        guard aiLeft(signedIn: signedIn, day: day, today: today, perDay: rules.guestAiPerDay) > 0, online else { return (.script, day) }
        return (.server, useAi(day, today: today))
    }
    public static func dayJSON(_ d: Day) -> JSON { .obj([("d", .string(d.d)), ("n", .int(d.n))]) }
    public static func day(from j: JSON?) -> Day? { guard let j, j.isObject, !j.s("d").isEmpty else { return nil }; return Day(d: j.s("d"), n: j.i("n")) }

    // MARK: fixed script (c)
    public struct Reply: Equatable, Sendable { public var text: String, advance: Bool }
    public static func scripted(_ s: JSON, level L: Int, i: Int, reply: String, retried: Bool, ack: [[String]], random: () -> Double) -> Reply {
        let turns = s.list("turns"), next = i + 1 < turns.count ? turns[i + 1] : nil
        if !retried && words(reply).count < 3 { return Reply(text: clarify[L], advance: false) }
        var react = ""
        for pair in turns[i].list("br") {
            guard let a = pair.array, a.count == 2, let re = a[0].string, let say = a[1].string else { continue }
            if matches(RoleplayRules.compile("\\b(" + re + ")", "i"), reply) || (re.contains("\\?") && reply.contains("?")) { react = say; break }
        }
        if react.isEmpty && random() < 0.5 { let row = ack[L]; react = row[min(row.count - 1, Int(floor(random() * 3)))] }
        let line = next.map { $0.list("a")[L].string ?? "" } ?? (s.list("end")[L].string ?? "")
        return Reply(text: react.isEmpty ? line : react + " " + line, advance: true)
    }

    // MARK: prompts (server)
    public static func systemPrompt(_ s: JSON, level L: Int, rules: RoleplayRules) -> String {
        let daily = isDaily(s), lv = levels(s, rules)[L], ai = s["ai"] ?? .null
        let style = (daily ? ["very short, simple sentences with the most common words", "short, simple sentences with common everyday words", "natural everyday English"]
                           : ["short simple sentences, common words", "natural everyday business English", "fluent, idiomatic professional English"])[L]
        return "You are role-playing \(daily ? "an everyday" : "a workplace") English conversation to help a \(lv) English learner practise speaking.\n"
            + "Your character: \(ai.s("name")), \(ai.s("role")). Personality: \(ai.s("persona")). Your goal: \(ai.s("goal")).\n"
            + "Scenario: \(s.s("title")). The learner's goal: \(s.s("you"))\n"
            + "Rules: stay in character; speak natural spoken English at \(lv) level (\(style)); never correct the learner during the conversation; never mention you are an AI; keep each reply under 45 words."
    }
    public static func transcript(_ hist: [Bubble], _ s: JSON) -> String {
        hist.map { ($0.who == "ai" ? (s["ai"]?.s("name") ?? "") : "Learner") + ": " + $0.text }.joined(separator: "\n")
    }
    public static func turnPrompt(_ s: JSON, level L: Int, i: Int, hist: [Bubble]) -> String {
        let turns = s.list("turns"), next = i + 1 < turns.count ? turns[i + 1] : nil
        let beat = next.map { $0.list("a")[L].string ?? "" } ?? (s.list("end")[L].string ?? "")
        let point = next != nil ? "Next point you must cover (say it in your own words, same meaning): \"\(beat)\"" : "This is the end: close the conversation politely, similar to: \"\(beat)\""
        return "Conversation so far:\n\(transcript(hist, s))\n\n\(point)\nIf the learner's last reply is unclear, off-topic or too short to understand, ask them to clarify instead and set \"advance\" to false (only once per point).\nJSON: {\"reply\": string (what \(s["ai"]?.s("name") ?? "") says next, under 45 words), \"advance\": boolean}"
    }
    public static func scorePrompt(_ s: JSON, level L: Int, hist: [Bubble], rules: RoleplayRules, language: String) -> String {
        let lv = levels(s, rules), better = lv[min(2, L + 1)]
        return "\(isDaily(s) ? "Everyday" : "Workplace") role-play for a \(lv[L]) English learner. Scenario: \(s.s("title")). Learner's goal: \(s.s("you"))\nTranscript:\n\(transcript(hist, s))\n\n"
            + "Assess ONLY the learner's lines. Return JSON: {\"natural\": 0-100, \"polite\": 0-100, \"clarity\": 0-100, \"grammar\": 0-100, \"summary\": string (2 sentences of feedback written in \(language)), \"rewrites\": [ {\"you\": exact learner line, \"better\": a sharper, more natural and professional version in English (keep their idea, \(better) level), \"why\": string (1-2 sentences in \(language) explaining what improved), \"meaning\": string (translation of \"better\" into \(language))} ] exactly 3 items, choosing the learner lines that would improve most}"
    }
    public static func scoreSystem(_ s: JSON) -> String {
        "You are a strict but encouraging \(isDaily(s) ? "everyday" : "business") English coach. Be accurate: very short or off-topic answers get low scores. Return JSON only."
    }

    // MARK: transcript
    public struct Bubble: Equatable, Sendable { public var who: String, text: String, turn: Int
        public init(who: String, text: String, turn: Int) { self.who = who; self.text = text; self.turn = turn } }

    // MARK: report
    public enum Criterion: String, CaseIterable, Sendable {
        case natural, polite, clarity, grammar
        /// the Vietnamese key web passes to t() (vectors `report.meters[].label`)
        public var viKey: String { ["natural": "Độ tự nhiên", "polite": "Mức lịch sự", "clarity": "Độ rõ ý", "grammar": "Ngữ pháp"][rawValue]! }
    }
    public struct Rewrite: Equatable, Sendable { public var you: String, better: String, meaning: String; public var why: JSON }
    public struct Report: Equatable, Sendable {
        public var spoken = 0
        /// nothing said ⇒ "Bạn chưa trả lời câu nào – hãy thử lại nhé."
        public var empty: Bool { spoken == 0 }
        public var ring = 0
        public var meters: [(Criterion, Int)] = []
        public var summary = "", aiScored = false
        public var xp = 0
        public var rewrites: [Rewrite] = []
        public var reward: [String: Int] { empty ? [:] : ["spoken": spoken, "xp": max(5, xp)] }
        public static func == (a: Report, b: Report) -> Bool {
            a.spoken == b.spoken && a.ring == b.ring && a.meters.map { "\($0.0.rawValue)\($0.1)" } == b.meters.map { "\($0.0.rawValue)\($0.1)" } && a.summary == b.summary && a.aiScored == b.aiScored && a.xp == b.xp && a.rewrites == b.rewrites
        }
    }
    struct Local { var scores: [Criterion: Int]; var rewrites: [Rewrite] }
    static func clamp(_ x: Double) -> Int { max(20, min(98, Vocab.round(x))) }
    /// the on-device estimate (4 formulas clamped 20–98 + the 3 weakest replies rewritten)
    static func localScore(_ s: JSON, level L: Int, hist: [Bubble], rules: RoleplayRules) -> Local? {
        let mine = hist.filter { $0.who == "me" }
        guard !mine.isEmpty else { return nil }
        let turns = s.list("turns"), polite = rules.polite, errs = rules.errorRegexes
        func turn(_ m: Bubble) -> JSON { turns[m.turn] }
        let avgW = Double(mine.reduce(0) { $0 + words($1.text).count }) / Double(mine.count)
        let sim = mine.map { LessonEngine.similarity($0.text.lowercased(), (turn($0).list("h")[L].string ?? "").lowercased()) }
        let n = Double(mine.count)
        let politeShare = Double(mine.filter { matches(polite, $0.text) }.count) / n
        let contr = RoleplayRules.compile("\\b\\w+'(m|re|s|ll|ve|d|t)\\b", "i")
        let contractions = Double(mine.filter { matches(contr, $0.text) }.count) / n
        let errCounts = mine.map { m in errs.filter { matches($0, m.text) }.count }
        let errSum = Double(errCounts.reduce(0, +))
        let lenOk = avgW >= 6 && avgW <= 35 ? 1.0 : avgW >= 4 ? 0.6 : 0.25
        let scores: [Criterion: Int] = [
            .natural: clamp(45 + contractions * 25 + lenOk * 15 + (sim.reduce(0, +) / Double(sim.count)) * 25),
            .polite: clamp(45 + politeShare * 55),
            .clarity: clamp(35 + lenOk * 40 + min(1, n / Double(turns.count)) * 25),
            .grammar: clamp(96 - errSum / n * 30),
        ]
        let order = Vocab.stableSorted(mine.indices.map { $0 }) { a, b in
            func w(_ k: Int) -> Double { sim[k] - Double(errCounts[k]) * 0.3 - (words(mine[k].text).count < 4 ? 0.3 : 0) }
            return w(a) < w(b)
        }.prefix(3)
        let rewrites = order.map { k -> Rewrite in
            let m = mine[k], better = turn(m).list("h")[min(2, L + 1)].string ?? ""
            let why: String = words(m.text).count < 4 ? "Câu trả lời quá ngắn – thêm một lý do hoặc chi tiết cụ thể để ý rõ hơn."
                : errCounts[k] > 0 ? "Có lỗi ngữ pháp cơ bản – câu viết lại đúng ngữ pháp và tự nhiên hơn."
                : !matches(polite, m.text) ? "Thêm từ lịch sự (could, would, please, I'm afraid…) để lời nói mềm và chuyên nghiệp hơn."
                : isDaily(s) ? "Cách nói này rõ ý và tự nhiên hơn." : "Cách nói này rõ ý hơn và đúng phong cách công sở hơn."
            return Rewrite(you: m.text, better: better, meaning: "", why: .obj([("k", .string(why))]))
        }
        return Local(scores: scores, rewrites: rewrites)
    }
    /// the AI answer is used only when the four criteria are numbers and `rewrites` is an array
    static func validAI(_ r: JSON?) -> Bool {
        guard let r else { return false }
        return Criterion.allCases.allSatisfy { r[$0.rawValue]?.isNumber == true } && r["rewrites"]?.array != nil
    }
    public static func report(_ s: JSON, level L: Int, hist: [Bubble], hintsUsed: Int, ai: JSON?, rules: RoleplayRules) -> Report {
        let spoken = hist.filter { $0.who == "me" }.count
        guard spoken > 0, let loc = localScore(s, level: L, hist: hist, rules: rules) else { return Report() }
        let ok = validAI(ai)
        func value(_ c: Criterion) -> Double { ok ? JSON.orZero(ai![c.rawValue]) : Double(loc.scores[c] ?? 0) }
        let avg = Vocab.round(Criterion.allCases.reduce(0.0) { $0 + max(0, min(100, value($1))) } / 4)
        var r = Report(spoken: spoken, ring: avg, aiScored: ok, xp: 10 + spoken * 3 - min(hintsUsed, spoken))
        r.meters = Criterion.allCases.map { ($0, max(0, min(100, Vocab.round(value($0))))) }
        if ok {
            r.summary = ai!.s("summary")
            r.rewrites = ai!.list("rewrites").filter { JSON.truthy($0["better"]) }.prefix(3).map {
                Rewrite(you: $0.s("you"), better: $0.s("better"), meaning: $0.s("meaning"), why: .string($0.s("why")))
            }
        } else { r.rewrites = loc.rewrites }
        return r
    }
}

/// One conversation. Single-threaded (the screen model drives it); every await is the server.
public final class RoleplayChat {
    public enum Toast: Equatable, Sendable { case quota, busy }
    public struct Step: Equatable, Sendable { public var bubbles: [Roleplay.Bubble], toasts: [Toast], allTurnsDone: Bool }
    public let script: JSON, level: Int, rules: RoleplayRules
    public private(set) var hist: [Roleplay.Bubble] = []
    public private(set) var i = 0, hintsUsed = 0
    public private(set) var retried = false, busy = false
    public private(set) var mode: Roleplay.Brain
    /// the AI counter after this conversation started (persist as vb.rp.day)
    public private(set) var day: Roleplay.Day?
    private let server: RoleplayServer?
    private let random: () -> Double

    public init(script: JSON, level: Int, rules: RoleplayRules, server: RoleplayServer?, signedIn: Bool, online: Bool, day: Roleplay.Day?, today: String, random: @escaping () -> Double) {
        self.script = script; self.level = level; self.rules = rules; self.server = server; self.random = random
        let b = server == nil ? (Roleplay.Brain.script, day) : Roleplay.chooseBrain(signedIn: signedIn, online: online, day: day, today: today, rules: rules)
        mode = b.0; self.day = b.1
    }
    public var turns: Int { script.list("turns").count }
    public var turnLabel: (i: Int, n: Int) { (min(i + 1, turns), turns) }
    public var allTurnsDone: Bool { i >= turns }

    /// the AI's first line
    @discardableResult public func start() -> Roleplay.Bubble { push("ai", Roleplay.turnLine(script, 0, level)) }
    private func push(_ who: String, _ text: String) -> Roleplay.Bubble {
        let b = Roleplay.Bubble(who: who, text: text, turn: min(i, turns - 1)); hist.append(b); return b
    }

    /// a learner message: both bubbles, the toasts of a downgrade, and whether the last turn is done (the screen opens the report 600 ms later)
    public func send(_ raw: String) async -> Step? {
        let text = raw.split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        guard !text.isEmpty, !busy, i < turns else { return nil }
        busy = true
        var out = [push("me", text)], toasts: [Toast] = []
        let r = await reply(text, &toasts)
        if r.advance { i += 1; retried = false } else { retried = true }
        out.append(push("ai", r.text))
        busy = false
        return Step(bubbles: out, toasts: toasts, allTurnsDone: i >= turns)
    }
    private func reply(_ text: String, _ toasts: inout [Toast]) async -> Roleplay.Reply {
        if mode == .server, let server {
            do {
                let out = try await server.ask(sys: Roleplay.systemPrompt(script, level: level, rules: rules) + "\nReturn JSON only.",
                                               prompt: Roleplay.turnPrompt(script, level: level, i: i, hist: hist))
                let line = out.s("reply")
                if !line.isEmpty { return Roleplay.Reply(text: Vocab.prefix(line, 400), advance: retried || out["advance"] != .bool(false)) }
            } catch let e as RoleplayServerError {
                mode = .script; toasts.append(e == .quota ? .quota : .busy)
            } catch { mode = .script; toasts.append(.busy) }
        }
        return Roleplay.scripted(script, level: level, i: i, reply: text, retried: retried, ack: rules.ack, random: random)
    }

    /// the hint of the current turn: its tip key (Vietnamese) and the line to say; counts as a used hint
    public func hint() -> (tip: String?, line: String) {
        hintsUsed += 1
        let t = script.list("turns")[min(i, turns - 1)]
        return (t.t("tip") ? t.s("tip") : nil, Roleplay.hintLine(script, i, level))
    }
    /// "Giúp tôi nói": the line to listen to slowly and put in the input box; counts as a used hint
    public func help() -> String { hintsUsed += 1; return Roleplay.hintLine(script, i, level) }

    /// the report; the server scores it when this chat used (or may use) the AI, else the on-device estimate
    public func finish(signedIn: Bool, language: String) async -> Roleplay.Report {
        var ai: JSON?
        if hist.contains(where: { $0.who == "me" }), (mode != .script || signedIn), let server {
            ai = try? await server.ask(sys: Roleplay.scoreSystem(script), prompt: Roleplay.scorePrompt(script, level: level, hist: hist, rules: rules, language: language))
        }
        return Roleplay.report(script, level: level, hist: hist, hintsUsed: hintsUsed, ai: ai, rules: rules)
    }
}
