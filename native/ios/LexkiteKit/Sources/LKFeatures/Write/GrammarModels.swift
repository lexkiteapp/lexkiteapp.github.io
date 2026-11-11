import SwiftUI
import Observation
import LKSync
import LKStore
import LKStrings

/// #/grammar content: the bundled starter (all 80 lessons listed, 3 complete) until https://lexkite.com/data/grammar-pack.json is fetched and cached on disk by `LessonRemote`.
@MainActor
enum GrammarStore {
    static let path = "data/grammar-pack.json"
    private(set) static var pack: GrammarPack = GrammarPack.bundled() ?? GrammarPack()
    private static var fetched = false
    /// true when the full pack arrived
    @discardableResult static func refresh(source: LessonTextSource = LessonRemote.shared) async -> Bool {
        guard !fetched else { return false }
        fetched = true
        guard let text = await source.text(path), let p = GrammarPack(text: text), !p.lessons.isEmpty else { fetched = false; return false }
        pack = p
        return true
    }
    /// fixtures
    static func install(_ p: GrammarPack) { pack = p }
    static var isFull: Bool { pack.lessons.count >= pack.index.count && !pack.index.isEmpty }
}

extension L10n {
    /// the lesson title in the UI language: Vietnamese → the Vietnamese title; others → the translated title, else the English one (never a Vietnamese leftover)
    func lessonTitle(_ x: JSON) -> String {
        if lang == "vi" { return x.s("title") }
        let tr = lv(x.s("title"))
        return tr != x.s("title") ? tr : x.s("en")
    }
    func lessonSub(_ x: JSON) -> String { lang == "vi" ? x.s("en") : (lessonTitle(x) != x.s("en") ? x.s("en") : "") }
}

// MARK: - hub
@MainActor @Observable
final class GrammarHubModel {
    static let tabKey = "g.tab"
    let ctx: SkillsContext
    private let defaults: UserDefaults
    private(set) var pack: GrammarPack
    private(set) var loaded = false
    var tab: String { didSet { defaults.set(tab, forKey: Self.tabKey) } }
    init(ctx: SkillsContext, defaults: UserDefaults = .standard) {
        self.ctx = ctx; self.defaults = defaults; pack = GrammarStore.pack
        let t = defaults.string(forKey: Self.tabKey) ?? "all"
        tab = ["all", "ielts", "toeic"].contains(t) ? t : "all"
    }
    static func fixture(ctx: SkillsContext, pack: GrammarPack, tab: String = "all") -> GrammarHubModel {
        let m = GrammarHubModel(ctx: ctx, defaults: UserDefaults(suiteName: "lk.grammar.fixture") ?? .standard)
        m.pack = pack; m.tab = tab; m.loaded = true
        return m
    }
    func load() async {
        await ctx.reload()
        await GrammarStore.refresh()
        pack = GrammarStore.pack
        loaded = true
    }
    var done: [String: Int] { (ctx.game["grammarDone"]?.object ?? [:]).compactMapValues { $0.double.map { Int($0) } } }
    var all: [JSON] { pack.index }
    var doneCount: Int { done.filter { $0.value >= GrammarCore.passPct }.count }
    /// the lesson to do next: one under 80 % first, else the first not done, in chapter order
    var next: (lesson: JSON, chapter: JSON)? {
        let d = done, o = pack.order
        return o.first { d[$0.lesson.s("id")].map { $0 < GrammarCore.passPct } ?? false } ?? o.first { d[$0.lesson.s("id")] == nil }
    }
    func focus(_ k: String) -> [JSON] { (pack.focus[k] ?? []).compactMap { pack.entry($0) } }
}

// MARK: - one lesson
struct DrillState: Equatable { var input = "", picked: Int?, outcome: DrillOutcome?, note = false }

@MainActor @Observable
final class GrammarLessonModel {
    enum Step: String, CaseIterable { case visual, build, uses, extras, mistakes, arrange, drills, quiz, own }
    let ctx: SkillsContext
    let id: String
    let full: Bool
    private(set) var pack: GrammarPack
    private(set) var loaded = false
    private(set) var cur = 0
    private(set) var formulaOrder: [Int] = []
    private(set) var formulaNext = 0
    private(set) var formulaWrong = false
    private(set) var revealedUses = Set<Int>()
    private(set) var revealedMistakes = Set<Int>()
    private(set) var builds: [String] = []
    private(set) var pool: [[(Int, String)]] = []
    private(set) var built: [[Int]] = []
    private(set) var arrangeOK: [Bool?] = []
    private(set) var quizPicked: [Int: Int] = [:]
    private(set) var quizSummary: (right: Int, pct: Int, xp: Int)? = nil
    private(set) var drills: [DrillState] = []
    private(set) var drillSummary: (right: Int, pct: Int, xp: Int)? = nil
    var ownText = ""
    private(set) var ownResult: (ok: Bool, hit: String, first: Bool)? = nil
    private(set) var ownShort = false
    private let shuffle: Bool

    init(ctx: SkillsContext, id: String, full: Bool, pack: GrammarPack? = nil, shuffle: Bool = true) {
        self.ctx = ctx; self.id = id; self.full = full; self.pack = pack ?? GrammarStore.pack; self.shuffle = shuffle
        prepare()
    }
    static func fixture(ctx: SkillsContext, pack: GrammarPack, id: String, full: Bool, step: Int = 0) -> GrammarLessonModel {
        let m = GrammarLessonModel(ctx: ctx, id: id, full: full, pack: pack, shuffle: false)
        m.cur = step; m.loaded = true
        return m
    }
    func load() async {
        await ctx.reload()
        if lesson == nil { await GrammarStore.refresh(); pack = GrammarStore.pack; prepare() }
        loaded = true
    }
    var lesson: JSON? { pack.lessons[id] }
    var entry: JSON? { pack.entry(id) }
    var blocks: [JSON] { lesson?.list("blocks") ?? [] }
    func blocks(_ types: [String]) -> [JSON] { blocks.filter { types.contains($0.s("type")) } }
    var quiz: [JSON] { lesson?.list("quiz") ?? [] }
    var drillList: [JSON] { lesson?.list("drills") ?? [] }
    var checkPattern: [String]? { pack.check[id] }
    var chapter: JSON { pack.chapter(of: id) }
    var unitColorName: String { pack.unit(entry?.s("unit") ?? "").s("id") }
    private var orderIDs: [String] { pack.order.map { $0.lesson.s("id") } }
    var prev: JSON? { let o = orderIDs; guard let i = o.firstIndex(of: id), i > 0 else { return nil }; return pack.entry(o[i - 1]) }
    var next: JSON? { let o = orderIDs; guard let i = o.firstIndex(of: id), i + 1 < o.count else { return nil }; return pack.entry(o[i + 1]) }
    var best: Int? { ctx.game["grammarDone"]?[id]?.double.map { Int($0) } }

    private func shuffled<T>(_ a: [T]) -> [T] { shuffle ? a.shuffled() : a }
    private func prepare() {
        guard let l = lesson else { return }
        _ = l
        let formulas = blocks(["formula"]), uses = blocks(["uses"])
        formulaOrder = formulas.first?.list("rows").first.map { shuffled(Array($0.list("parts").indices)) } ?? []
        formulaNext = 0
        let sents = (formulas.flatMap { $0.list("rows").map { $0.s("ex") } } + uses.flatMap { $0.list("items").map { $0.s("ex") } })
            .filter { !$0.isEmpty }.map(GrammarCore.plain).filter { (5...12).contains(GrammarCore.tokens($0).count) }
        var seen = Set<String>(), uniq: [String] = []
        for s in sents where seen.insert(s).inserted { uniq.append(s) }
        builds = Array(shuffled(uniq).prefix(3))
        pool = builds.map { s in shuffled(Array(GrammarCore.tokens(s).enumerated()).map { ($0.offset, $0.element) }) }
        built = builds.map { _ in [] }; arrangeOK = builds.map { _ in nil }
        drills = drillList.map { _ in DrillState() }
    }

    var steps: [Step] {
        var s: [Step] = [.visual]
        if blocks(["formula"]).first?.list("rows").first != nil { s.append(.build) }
        if !blocks(["uses"]).isEmpty { s.append(.uses) }
        if !blocks(["signals", "table", "tip", "ielts"]).isEmpty { s.append(.extras) }
        if !blocks(["mistake"]).isEmpty { s.append(.mistakes) }
        if !builds.isEmpty { s.append(.arrange) }
        if !drillList.isEmpty { s.append(.drills) }
        s.append(.quiz)
        if checkPattern != nil { s.append(.own) }
        return s
    }
    var step: Step { let s = steps; return s[min(cur, s.count - 1)] }
    /// the formula step must be done (or skipped) before moving on
    private(set) var gateSkipped = false
    var gateOpen: Bool { step != .build || formulaNext >= formulaOrder.count || gateSkipped }
    func go(_ d: Int) { let n = cur + d; if n >= 0 && n < steps.count { cur = n; gateSkipped = false } }
    func jump(_ k: Int) {
        let s = steps
        if k <= cur || !s[cur..<k].contains(.build) || gateOpen { cur = k; gateSkipped = false }
    }
    func skipGate() { gateSkipped = true }

    // MARK: formula builder
    func pickFormula(_ part: Int) -> Bool {
        guard formulaNext < formulaOrder.count else { return false }
        if part == formulaNext { formulaNext += 1; formulaWrong = false; return true }
        formulaWrong = true
        return false
    }
    func clearWrong() { formulaWrong = false }
    func revealUse(_ i: Int) { revealedUses.insert(i) }
    func revealMistake(_ i: Int) { revealedMistakes.insert(i) }

    // MARK: arrange sentences
    func arrangeTap(_ k: Int, pool j: Int) {
        guard k < built.count, arrangeOK[k] == nil, !built[k].contains(j) else { return }
        built[k].append(j)
        let words = GrammarCore.tokens(builds[k])
        if built[k].count == words.count { arrangeOK[k] = built[k].map { words[$0] }.joined(separator: " ") == words.joined(separator: " ") }
    }
    func arrangeRemove(_ k: Int, at i: Int) { guard k < built.count, arrangeOK[k] == nil, i < built[k].count else { return }; built[k].remove(at: i) }
    func arrangeReset(_ k: Int) { guard k < built.count else { return }; built[k] = []; arrangeOK[k] = nil }
    func speak(_ s: String) { ctx.core.speakSentence(GrammarCore.plain(s), settings: ctx.settings) }

    // MARK: quiz
    func pickQuiz(_ q: Int, _ v: Int) async {
        guard quizPicked[q] == nil, q < quiz.count else { return }
        quizPicked[q] = v
        let item = quiz[q], opts = item.strs("options"), ans = item.i("answer")
        if v != ans {
            await log(GrammarCore.mistake(q: item.s("q"), answer: ans < opts.count ? opts[ans] : "", given: v < opts.count ? opts[v] : "", explain: item.s("explain"), ref: id))
        }
        if quizPicked.count == quiz.count {
            let right = quiz.indices.filter { quizPicked[$0] == quiz[$0].i("answer") }.count
            let pct = GrammarCore.pct(right, quiz.count), xp = GrammarCore.quizXP(right)
            var g = ctx.game, gd = g["grammarDone"]?.object ?? [:]
            gd[id] = .number(Double(max(pct, Int(gd[id]?.double ?? 0))))
            g["grammarDone"] = .object(gd)
            await ctx.commit(game: g, reward: ["quizzes": 1, "grammar": 1, "perfect": pct == 100 ? 1 : 0, "xp": xp])
            quizSummary = (right, pct, xp)
        }
    }
    func quizAgain() { quizPicked = [:]; quizSummary = nil }
    private func log(_ m: JSON) async { await ctx.commit(mistakes: MistakesEngine.log(ctx.bundle.mistakes, m, now: ctx.now)) }

    // MARK: drills
    func setInput(_ i: Int, _ s: String) { guard i < drills.count, drills[i].outcome == nil else { return }; drills[i].input = s }
    func checkDrill(_ i: Int, picked: Int? = nil) async {
        guard i < drills.count, drills[i].outcome == nil else { return }
        let d = drillList[i]
        guard let o = GrammarCore.grade(d, given: drills[i].input, picked: picked, pattern: checkPattern?.first, isWord: { LibraryWords.shared.contains($0) }) else { return }
        if o == .tooShort { drills[i].note = true; return }
        drills[i].picked = picked; drills[i].outcome = o; drills[i].note = false
        if case .graded(let ok, let given, let answer, _) = o, !ok {
            await log(GrammarCore.mistake(q: d.s("t") == "error" ? d.strs("parts").joined(separator: " ") : d.s("q"), answer: answer, given: given, explain: d.s("ex"), ref: id))
        }
        if drills.allSatisfy({ $0.outcome != nil }) {
            let right = drills.filter { if case .graded(true, _, _, _)? = $0.outcome { return true }; return false }.count
            let pct = GrammarCore.pct(right, drills.count), xp = GrammarCore.drillXP(right)
            await ctx.commit(reward: ["quizzes": 1, "grammar": 1, "writes": 1, "perfect": pct == 100 ? 1 : 0, "xp": xp])
            drillSummary = (right, pct, xp)
        }
    }

    // MARK: own sentence
    func checkOwn() async {
        guard let pat = checkPattern?.first else { return }
        let s = ownText.trimmingCharacters(in: .whitespacesAndNewlines).split(whereSeparator: { $0.isWhitespace }).joined(separator: " ")
        if s.split(separator: " ").count < 4 || s.range(of: "[A-Za-z]", options: .regularExpression) == nil { ownShort = true; ownResult = nil; return }
        ownShort = false
        let hit = GrammarCore.ownHit(s, pattern: pat)
        guard !hit.isEmpty else { ownResult = (false, "", false); return }
        let key = id + "|" + s.lowercased()
        var g = ctx.game, gch = g["gch"]?.object ?? [:]
        let first = gch[key] == nil
        if first { gch[key] = .number(1); g["gch"] = .object(gch); await ctx.commit(game: g, reward: ["xp": 15]) }
        ownResult = (true, hit, first)
    }
}

// MARK: - mixed test (#/grammar/mix)
@MainActor @Observable
final class GrammarMixModel {
    struct Item: Identifiable {
        let id = UUID()
        var q: JSON? = nil
        var d: JSON? = nil
        var lesson: JSON
    }
    let ctx: SkillsContext
    let chapterN: Int?
    let count: Int
    private(set) var pack: GrammarPack
    private(set) var items: [Item] = []
    private(set) var i = 0
    private(set) var right = 0
    private(set) var picked: Int? = nil
    private(set) var drill = DrillState()
    private(set) var loaded = false
    private(set) var summary: (right: Int, pct: Int, xp: Int)? = nil
    private let shuffle: Bool
    init(ctx: SkillsContext, chapter: Int?, count: Int, pack: GrammarPack? = nil, shuffle: Bool = true) {
        self.ctx = ctx; chapterN = chapter; self.count = max(1, count); self.pack = pack ?? GrammarStore.pack; self.shuffle = shuffle
    }
    static func fixture(ctx: SkillsContext, pack: GrammarPack, chapter: Int? = nil, count: Int = 5, at: Int = 0) -> GrammarMixModel {
        let m = GrammarMixModel(ctx: ctx, chapter: chapter, count: count, pack: pack, shuffle: false)
        m.build(); m.i = at; m.loaded = true
        return m
    }
    func load() async {
        await ctx.reload()
        await GrammarStore.refresh(); pack = GrammarStore.pack
        build(); loaded = true
    }
    private func build() {
        let chap = chapterN.flatMap { n in pack.chapters.first { $0.i("n") == n } }
        let all = chap.map { pack.lessons(of: $0) } ?? pack.index
        let done = ctx.game["grammarDone"]?.object ?? [:]
        let from = (chap == nil && done.count >= 3) ? all.filter { done[$0.s("id")] != nil } : all
        var pool: [Item] = []
        for x in from { guard let l = pack.lessons[x.s("id")] else { continue }
            pool += l.list("quiz").map { Item(q: $0, d: nil, lesson: x) } + l.list("drills").map { Item(q: nil, d: $0, lesson: x) } }
        items = Array((shuffle ? pool.shuffled() : pool).prefix(count))
        i = 0; right = 0; picked = nil; drill = DrillState(); summary = nil
    }
    var current: Item? { i < items.count ? items[i] : nil }
    func pick(_ v: Int) async {
        guard let it = current, let q = it.q, picked == nil else { return }
        picked = v
        let opts = q.strs("options"), ans = q.i("answer")
        if v == ans { right += 1 } else {
            await ctx.commit(mistakes: MistakesEngine.log(ctx.bundle.mistakes, GrammarCore.mistake(q: q.s("q"), answer: ans < opts.count ? opts[ans] : "", given: v < opts.count ? opts[v] : "", explain: q.s("explain"), ref: it.lesson.s("id")), now: ctx.now))
        }
    }
    func setInput(_ s: String) { if drill.outcome == nil { drill.input = s } }
    func check(picked p: Int? = nil) async {
        guard let it = current, let d = it.d, drill.outcome == nil else { return }
        let pattern = pack.check[it.lesson.s("id")]?.first
        guard let o = GrammarCore.grade(d, given: drill.input, picked: p, pattern: pattern, isWord: { LibraryWords.shared.contains($0) }) else { return }
        if o == .tooShort { drill.note = true; return }
        drill.outcome = o; drill.picked = p; drill.note = false
        if case .graded(let ok, let given, let answer, _) = o {
            if ok { right += 1 } else {
                await ctx.commit(mistakes: MistakesEngine.log(ctx.bundle.mistakes, GrammarCore.mistake(q: d.s("t") == "error" ? d.strs("parts").joined(separator: " ") : d.s("q"), answer: answer, given: given, explain: d.s("ex"), ref: it.lesson.s("id")), now: ctx.now))
            }
        }
    }
    var answered: Bool { current?.q != nil ? picked != nil : drill.outcome != nil }
    func advance() async {
        i += 1; picked = nil; drill = DrillState()
        if i >= items.count, summary == nil {
            let pct = GrammarCore.pct(right, items.count), xp = GrammarCore.mixXP(right)
            await ctx.commit(reward: ["quizzes": 1, "grammar": 1, "perfect": pct == 100 ? 1 : 0, "xp": xp])
            summary = (right, pct, xp)
        }
    }
    func again() { build() }
}
