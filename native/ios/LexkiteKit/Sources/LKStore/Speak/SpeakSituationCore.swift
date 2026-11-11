import Foundation
import LKSync
import LKCore

/// M4 P07 – #/speak (flag `speak_pack`): ports of web/js/speak/app.js (situation hub + "Nói theo 3 nhịp" drill) and `SPK_fill` of web/js/speak/data.js.
/// The learner's progress is the web's `localStorage lk.spk` = `{<situation>:{lines:{<id>:{best,stars}}, tasks:{<id>:true}}, week:{<YYYY-Wn>:n}, nomic:0|1}`.
/// Texts in the results are the Vietnamese web KEYS (`{k,v}` JSON) – the views render them with `SpeakText.render`. Everything here is pure: the mic result,
/// the clock (`nowMs`) and the shuffle come in as arguments (vectors/speak.json `speak.*`).
public enum SpeakSit {
    public static let weekGoal = 50
    public static let storeKey = "lk.spk"
    /// the web keys of the three beats (Nghe · Nói đuổi · Nói từ trí nhớ)
    public static let beatKeys = ["Nghe", "Nói đuổi", "Nói từ trí nhớ"]

    /// `L(o)` of app.js: the UI language, else English
    public static func text(_ o: JSON?, _ lang: String) -> String {
        if let s = o?[lang]?.string, !s.isEmpty { return s }
        return o?["en"]?.string ?? ""
    }
    /// A JSON value that keeps the order of the keys: the translation of a situation is a POSITIONAL array, so `SPK_fill` must walk the base in file order.
    public indirect enum Ordered: Sendable {
        case object([(String, Ordered)]), array([Ordered]), leaf(JSON)
        public var json: JSON {
            switch self {
            case .leaf(let j): return j
            case .array(let a): return .array(a.map(\.json))
            case .object(let o): return .object(Dictionary(o.map { ($0.0, $0.1.json) }, uniquingKeysWith: { _, b in b }))
            }
        }
        /// the first JSON value of `text`; with `trailing` the rest (the next statements of a `.js` file) is ignored
        public static func parse(_ text: String, trailing: Bool = false) -> Ordered? {
            let u = Array(text.utf16)
            var i = 0
            func ws() { while i < u.count, u[i] == 32 || u[i] == 10 || u[i] == 13 || u[i] == 9 { i += 1 } }
            func str() -> String? {
                guard i < u.count, u[i] == 34 else { return nil }
                let start = i; i += 1
                while i < u.count, u[i] != 34 { i += u[i] == 92 ? 2 : 1 }
                guard i < u.count else { return nil }
                i += 1
                let raw = String(utf16CodeUnits: Array(u[start..<i]), count: i - start)
                return (try? JSON.parse(raw))?.string
            }
            func val() -> Ordered? {
                ws()
                guard i < u.count else { return nil }
                if u[i] == 123 {
                    i += 1; var o: [(String, Ordered)] = []
                    ws(); if i < u.count, u[i] == 125 { i += 1; return .object(o) }
                    while true {
                        ws(); guard let k = str() else { return nil }
                        ws(); guard i < u.count, u[i] == 58 else { return nil }; i += 1
                        guard let v = val() else { return nil }
                        o.append((k, v)); ws()
                        guard i < u.count else { return nil }
                        if u[i] == 44 { i += 1; continue }
                        if u[i] == 125 { i += 1; return .object(o) }
                        return nil
                    }
                }
                if u[i] == 91 {
                    i += 1; var a: [Ordered] = []
                    ws(); if i < u.count, u[i] == 93 { i += 1; return .array(a) }
                    while true {
                        guard let v = val() else { return nil }
                        a.append(v); ws()
                        guard i < u.count else { return nil }
                        if u[i] == 44 { i += 1; continue }
                        if u[i] == 93 { i += 1; return .array(a) }
                        return nil
                    }
                }
                if u[i] == 34 { return str().map { .leaf(.string($0)) } }
                let start = i
                while i < u.count, ![44, 125, 93, 32, 10, 13, 9].contains(u[i]) { i += 1 }
                let raw = String(utf16CodeUnits: Array(u[start..<i]), count: i - start)
                return (try? JSON.parse(raw)).map { .leaf($0) }
            }
            let r = val(); ws()
            return trailing || i == u.count ? r : nil
        }
    }
    /// `SPK_fill(base, arr, lang)`: every object whose only key is `en` (a string) takes the next translation string; null leaves it English-only
    public static func fill(_ base: Ordered, _ arr: [JSON], lang: String) -> JSON {
        var i = 0
        func walk(_ o: Ordered) -> JSON {
            switch o {
            case .leaf(let j): return j
            case .array(let a): return .array(a.map(walk))
            case .object(let d):
                if d.count == 1, d[0].0 == "en", case .leaf(.string(let en)) = d[0].1 {
                    let v: JSON? = i < arr.count ? arr[i] : nil
                    i += 1
                    var r: [String: JSON] = ["en": .string(en)]
                    if let s = v?.string { r[lang] = .string(s) }
                    return .object(r)
                }
                var r: [String: JSON] = [:]
                for (k, x) in d { r[k] = walk(x) }
                return .object(r)
            }
        }
        return walk(base)
    }
    /// the text after `] = ` of the first statement (`(self.SPK_B || …)["cafe"] = {…}`; more statements may follow it in the file)
    public static func body(_ js: String) -> String? {
        guard let r = js.range(of: "] = ") else { return nil }
        return String(js[r.upperBound...])
    }
    /// the situation as the screens use it: the English base, with the UI language filled in when its translation file was fetched
    public static func situation(base: String, translation: String?, lang: String) -> JSON? {
        guard let b = body(base), let o = Ordered.parse(b, trailing: true) else { return nil }
        if lang != "en", let t = translation, let tb = body(t), let arr = Ordered.parse(tb, trailing: true)?.json.array { return fill(o, arr, lang: lang) }
        return o.json
    }

    // MARK: week + progress
    /// web `wk()`: `<year>-W<ceil(((d − Jan 1)/864e5 + Jan1.getDay() + 1)/7)>` in the device zone
    public static func weekKey(_ nowMs: Int64, calendar: Calendar) -> String {
        let d = Date(timeIntervalSince1970: Double(nowMs) / 1000)
        let y = calendar.component(.year, from: d)
        let j = calendar.date(from: DateComponents(year: y, month: 1, day: 1)) ?? d
        let jMs = j.timeIntervalSince1970 * 1000, getDay = Double(calendar.component(.weekday, from: j) - 1)
        let n = Int(((Double(nowMs) - jMs) / 86_400_000 + getDay + 1) / 7 + 0.999999999)
        return "\(y)-W\(n)"
    }
    public static func lines(_ s: JSON) -> [JSON] { s.list("lines").filter { !$0.t("open") } }
    public static func line(_ s: JSON, _ id: String) -> JSON? { s.list("lines").first { $0.s("id") == id } }
    static func prog(_ store: JSON, _ id: String) -> JSON { store[id] ?? .obj([("lines", .object([:])), ("tasks", .object([:]))]) }
    static func stars(_ p: JSON, _ id: String) -> Int { p["lines"]?[id]?.i("stars") ?? 0 }

    // MARK: the situation hub (pas-sit)
    public struct Hub: Equatable {
        public struct Node: Equatable { public var label: String, state: String, stars: Int, stageId: String }
        public struct Task: Equatable { public var title: String, example: String, done: Bool, state: String }
        public var title: String, cefr: String, mission: String, culture: String
        public var stageN: Int, stageM: Int
        public var nodes: [Node], tasks: [Task]
        public var mastered: Int, total: Int, pct: Int, remaining: Int, week: Int
        public var addon: [(w: String, ipa: String)]
        public static func == (a: Hub, b: Hub) -> Bool { a.title == b.title && a.nodes == b.nodes && a.tasks == b.tasks && a.mastered == b.mastered && a.week == b.week && a.addon.count == b.addon.count }
    }
    public static func hub(_ s: JSON, lang: String, store: JSON, week: String, cards: [JSON]) -> Hub {
        let p = prog(store, s.s("id")), all = lines(s), stages = s.list("stages")
        let mastered = all.filter { stars(p, $0.s("id")) >= 2 }.count
        let stageDone = stages.map { g in g.strs("lines").allSatisfy { stars(p, $0) >= 1 } }
        let cur = max(0, stageDone.firstIndex(of: false) ?? stages.count - 1)
        let nodes = stages.enumerated().map { (i, g) -> Hub.Node in
            let v = g.strs("lines").map { stars(p, $0) }
            return Hub.Node(label: text(g["title"], lang), state: stageDone[i] ? "done" : (i == cur ? "cur" : "todo"), stars: v.min() ?? 0, stageId: g.s("id"))
        }
        let rawTasks = s["mission"]?.list("tasks") ?? []
        let doneFlags = rawTasks.map { p["tasks"]?[$0.s("id")]?.truthy == true }
        let firstUndone = doneFlags.firstIndex(of: false)
        let tasks = rawTasks.enumerated().map { (i, k) -> Hub.Task in
            let first = k.strs("intents").first.flatMap { line(s, $0) }?.s("en") ?? ""
            return Hub.Task(title: text(k["title"], lang), example: "\u{201C}" + first + "\u{201D}", done: doneFlags[i], state: doneFlags[i] ? "done" : (i == firstUndone ? "cur" : "todo"))
        }
        // saved words that occur in the lines (≤ 4, distinct, in the order of the lines)
        var saved: [String: JSON] = [:]
        for c in cards { let w = (c.s("word").isEmpty ? c.s("w") : c.s("word")).lowercased(); if !w.isEmpty, saved[w] == nil { saved[w] = c } }
        var seen = Set<String>(), addon: [(w: String, ipa: String)] = []
        for l in all { for w in SpeakScore.toks(l.s("en")) where saved[w] != nil && !seen.contains(w) {
            seen.insert(w)
            let c = saved[w]!
            addon.append((w, c.s("ipa").isEmpty ? c.s("phonetic") : c.s("ipa")))
        } }
        return Hub(title: text(s["title"], lang), cefr: s.s("cefr"), mission: text(s["goal"], lang), culture: text(s["culture"], lang),
                   stageN: cur + 1, stageM: stages.count, nodes: nodes, tasks: tasks, mastered: mastered, total: all.count,
                   pct: all.isEmpty ? 0 : Vocab.round(Double(mastered) / Double(all.count) * 100), remaining: all.count - mastered,
                   week: Int(JSON.orZero(store["week"]?[week])), addon: Array(addon.prefix(4)))
    }

}

/// The drill of #/speak/<id>/drill (pas-drill): three beats per line, stars, tap-in-order without a mic.
public struct SpeakDrill {
    /// the line said on the screen: say-keys of the coach bubble
    public enum Say: Equatable {
        case beat(Int), tapOrder, micOff, unclear, letPass, passMiddle, passMemory, fail, wrongOrder, tapDone
        public var key: String {
            switch self {
            case .beat(let b): return ["Nghe rồi nói theo nhé.", "Nói cùng nhịp với cô nhé.", "Giờ nói lại từ trí nhớ nhé."][min(2, max(0, b))]
            case .tapOrder: return "Chạm các từ theo đúng thứ tự."
            case .micOff: return "Không dùng được mic – chạm các từ theo đúng thứ tự nhé."
            case .unclear: return "Cô chưa nghe rõ – thử lại nhé, không bị trừ điểm."
            case .letPass: return "Gợi ý: nói to, rõ từng từ. Cô cho qua lần này."
            case .passMiddle: return "Tốt lắm! Sang nhịp tiếp nhé."
            case .passMemory: return "Tuyệt! Nhớ được cả câu rồi."
            case .fail: return "Gần rồi – nghe lại từ tô đỏ rồi thử lại."
            case .wrongOrder: return "Chưa đúng thứ tự – thử từ khác nhé."
            case .tapDone: return "Đúng rồi! Giờ nghe cô đọc lại nhé."
            }
        }
    }
    public struct Res: Equatable {
        public var score: Int, pass: Bool, free: Bool, stars: Int
        public var words: [SpeakScore.Word]
        public var wpm: Int
        public var verdictKey: String { pass ? "Nói rất tốt!" : "Gần đúng rồi!" }
        /// the small line under the verdict as a web key JSON
        public var sub: JSON { free ? .string("Chưa nghe rõ – cho qua, không tính sao.") : (pass ? .obj([("k", "{n} từ/phút"), ("v", .obj([("n", .int(wpm))]))]) : .string("Thử lại các từ tô đỏ nhé.")) }
    }
    public struct Tip: Equatable {
        public var ipa: String, note: String, hi: String
        /// the note with the stressed part marked, as the web HTML (`<strong class="underline decoration-2">`)
        public var html: String {
            func esc(_ s: String) -> String { s.replacingOccurrences(of: "&", with: "&amp;").replacingOccurrences(of: "<", with: "&lt;").replacingOccurrences(of: ">", with: "&gt;") }
            guard !hi.isEmpty, let r = note.range(of: hi) else { return esc(note) }
            return esc(String(note[..<r.lowerBound])) + "<strong class=\"underline decoration-2\">" + esc(hi) + "</strong>" + esc(String(note[r.upperBound...]))
        }
    }
    public struct Word: Equatable { public var w: String, pending: Bool, bad: Bool, tapIndex: Int? }
    /// what a step changed outside the drill: `progress` to store, a reward for `App.reward`, the sentence to speak (en-US), the finished toast, a mic refusal
    public struct Effect: Equatable {
        public var wrote = false
        public var reward: [String: Int]?
        public var speakLine = false
        public var finishedCount: Int?
    }

    public let s: JSON, lang: String
    public let order: [String]
    public private(set) var i: Int, b = 0
    public private(set) var res: Res?
    public private(set) var unclear = 0
    public private(set) var noMic: Bool
    public private(set) var built: [Int] = [], bank: [Int] = []
    public private(set) var say: Say = .beat(0)
    public private(set) var t0: Int64?
    /// `lk.spk` as it stands (written by the model after every `Effect.wrote`)
    public private(set) var store: JSON
    private let week: String
    private let shuffle: ([Int]) -> [Int]

    public init(_ s: JSON, lang: String, stage: String?, store: JSON, week: String, canMic: Bool = true, shuffle: @escaping ([Int]) -> [Int]) {
        self.s = s; self.lang = lang; self.store = store; self.week = week; self.shuffle = shuffle
        let stages = s.list("stages")
        let all = stages.flatMap { $0.strs("lines") }
        if let g = stages.first(where: { $0.s("id") == stage }) { order = g.strs("lines") + all.filter { !g.strs("lines").contains($0) } } else { order = all }
        let p = SpeakSit.prog(store, s.s("id"))
        i = max(0, order.firstIndex { SpeakSit.stars(p, $0) < 2 } ?? -1)
        noMic = !canMic || JSON.orZero(store["nomic"]) == 1
        enter()
    }
    public var count: Int { order.count }
    public var current: JSON { SpeakSit.line(s, order[i]) ?? .null }
    public var target: String { current.s("en") }
    var words: [String] { target.split(whereSeparator: { $0.isWhitespace }).map(String.init) }
    /// the situation's name up to the first `& , – -` (the chip above the sentence)
    public var chip: String { SpeakSit.text(s["title"], lang).components(separatedBy: CharacterSet(charactersIn: "&,–-")).first?.trimmingCharacters(in: .whitespaces) ?? "" }
    public var gloss: String { SpeakSit.text(current["gloss"], lang) }
    public var pose: String { res != nil ? (res!.pass ? "cheer" : "concern") : (b == 2 ? "thinking" : (b == 1 ? "encourage" : "talk")) }
    public var progressPct: Int { Vocab.round(Double(i * 3 + b + (res?.pass == true ? 1 : 0)) / Double(count * 3) * 100) }
    /// the small button under the controls: Retry after a result, "use the mic" in tap mode, else "can't speak right now"
    public var altKey: String { res != nil ? "Thử lại" : (noMic ? "Dùng mic" : "Chưa nói được lúc này") }
    public var canNext: Bool { res.map { $0.pass || $0.free } ?? false }
    public var memory: Bool { b == 2 && res == nil }

    public var wordList: [Word] {
        let ws = words
        func shown(_ k: Int) -> String { memory ? String(ws[k].prefix(1)) + "…" : ws[k] }
        if noMic && res == nil {
            return built.map { Word(w: ws[$0], pending: false, bad: false, tapIndex: nil) } + bank.map { Word(w: shown($0), pending: true, bad: false, tapIndex: $0) }
        }
        return ws.indices.map { k in Word(w: shown(k), pending: res == nil, bad: res.map { k < $0.words.count && !$0.words[k].ok } ?? false, tapIndex: nil) }
    }
    public var tip: Tip? {
        let bad: [String]? = res.map { r in r.words.filter { !$0.ok }.compactMap { SpeakScore.toks($0.w).first } }
        for pf in current.list("pitfalls") {
            let w = pf.s("w")
            guard !w.isEmpty else { continue }
            if bad.map({ $0.contains(w.lowercased()) }) ?? (b == 0) { return Tip(ipa: pf.s("ipa"), note: SpeakSit.text(pf["note"], lang), hi: pf.s("hi")) }
        }
        return nil
    }

    private mutating func enter() {
        res = nil; unclear = 0; built = []; bank = shuffle(Array(words.indices)); t0 = nil
        say = noMic ? .tapOrder : .beat(b)
    }
    /// the mic was tapped
    public mutating func micStarted(nowMs: Int64) { res = nil; t0 = nowMs }

    /// What the platform answered to one attempt (`Speak.score`): updates the screen and says what to write
    public mutating func attempt(_ sc: SpeakScore.Result, nowMs: Int64) -> Effect {
        if let e = sc.error, Recognize.micBlocked.contains(e) { noMic = true; enter(); say = .micOff; return Effect() }
        if sc.unclear {
            unclear += 1
            if unclear <= 2 { say = .unclear; return Effect() }
            var free = sc; free.words = SpeakScore.align(target, target)
            var fx = result(free, free: true, nowMs: nowMs)
            say = .letPass; fx.speakLine = false
            return fx
        }
        let fx = result(sc, free: false, nowMs: nowMs)
        say = res!.pass ? (b == 2 ? .passMemory : .passMiddle) : .fail
        return fx
    }
    private mutating func result(_ sc: SpeakScore.Result, free: Bool, nowMs: Int64) -> Effect {
        let pass = free || SpeakScore.pass(sc), limit = (Double(words.count) * 0.6 + 3) * 1000
        let quick = t0.map { Double(nowMs - $0) <= limit } ?? false
        let stars = noMic ? (pass ? 1 : 0) : (!pass ? 0 : (b < 2 ? 1 : (quick ? 3 : 2)))
        res = Res(score: Vocab.round(sc.text * 100), pass: pass, free: free, stars: free ? 0 : stars, words: sc.words.map { SpeakScore.Word(w: $0.w, ok: $0.ok) }, wpm: sc.wpm)
        guard pass || free else { return Effect() }
        return record(text: sc.text, stars: res!.stars, pass: pass)
    }
    /// `record` of app.js: best/stars of the line, the mission tasks that name it, the week counter, then the reward unless there was no mic
    private mutating func record(text: Double, stars: Int, pass: Bool) -> Effect {
        let sid = s.s("id"), id = order[i]
        var p = SpeakSit.prog(store, sid)
        let cur = p["lines"]?[id]
        let best = max(JSON.orZero(cur?["best"]), text), st = max(JSON.orZero(cur?["stars"]), Double(stars))
        p["lines"] = p["lines"] ?? .object([:])
        p["lines"]?[id] = .obj([("best", .number(best)), ("stars", .number(st))])
        if pass { for k in s["mission"]?.list("tasks") ?? [] where k.strs("intents").contains(id) { p["tasks"] = p["tasks"] ?? .object([:]); p["tasks"]?[k.s("id")] = .bool(true) } }
        store[sid] = p
        store["week"] = .obj([(week, .number(JSON.orZero(store["week"]?[week]) + 1))])
        var fx = Effect(); fx.wrote = true
        if !noMic { fx.reward = ["spoken": 1, "xp": 2 * stars] }
        return fx
    }
    /// tap of the word at original index `k` (no-mic mode): must be the next one in order
    public mutating func tap(_ k: Int) -> Effect {
        guard res == nil else { return Effect() }
        guard k == built.count else { say = .wrongOrder; return Effect() }
        built.append(k); bank.removeAll { $0 == k }
        guard bank.isEmpty else { return Effect() }
        var sc = SpeakScore.Result(text: 1, words: SpeakScore.align(target, target), wpm: 0, conf: 0, heard: target)
        sc.unclear = false
        var fx = result(sc, free: false, nowMs: 0)
        say = .tapDone; fx.speakLine = true
        return fx
    }
    /// "Tiếp": next beat, next line, or the end of the situation
    public mutating func next() -> Effect {
        guard canNext else { return Effect() }
        if b < 2 { b += 1 } else { b = 0; i += 1 }
        if i >= order.count { i = order.count - 1; var fx = Effect(); fx.finishedCount = order.count; return fx }
        enter()
        return Effect()
    }
    /// "Thử lại" (after a result) or "Dùng mic" / "Chưa nói được lúc này" (before one: toggles the tap-in-order mode, remembered in `lk.spk.nomic`)
    public mutating func retry() -> Effect {
        var fx = Effect()
        if res == nil { noMic.toggle(); store["nomic"] = .int(noMic ? 1 : 0); fx.wrote = true }
        enter()
        return fx
    }
}
