import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

/// The reading tests behind #/rtype (P09 pack, shape of vectors `data.readtests`). No fetchable file exists yet (the web ships them as scripts), so the store is empty
/// until the pack is installed; the screen then shows its empty state.
@MainActor
enum RtypeContentStore {
    private(set) static var current = RtypeContent()
    static func install(_ c: RtypeContent) { current = c }
}

/// The kinds of the hub: emoji + title key + the tip of each kind (web `KIND()`); the tip boxes of a group itself are the P06 `QuestionsView` tips.
enum RtypeKinds {
    static func emoji(_ k: String) -> String { ["completion": "✏️", "tfng": "✔️", "ynng": "💭", "mcq": "🔘", "multi": "☑️", "headings": "🏷️", "info": "📍", "features": "👤"][k] ?? "" }
    /// the kind title; TFNG / YNNG are the same untranslated words everywhere
    static func title(_ k: String, _ t: L10n) -> String {
        switch k {
        case "completion": return t(.speakRtypeDienTuSummarySentence)
        case "tfng": return "TRUE / FALSE / NOT GIVEN"
        case "ynng": return "YES / NO / NOT GIVEN"
        case "mcq": return t(.speakRtypeTracNghiemAD)
        case "multi": return t(.skillQeChon2DapAn)
        case "headings": return t(.speakRtypeNoiTieuDeMatching)
        case "info": return t(.speakRtypeTimDoanChuaThong)
        default: return t(.speakRtypeNoiDacDiemNguoi)
        }
    }
}

@MainActor @Observable
final class RtypeModel {
    let ctx: SkillsContext
    let content: RtypeContent
    /// nil = the hub; an unknown kind is the hub too
    let kind: String?
    private(set) var index = 0
    var answers = QAnswers()
    private(set) var outcome: Rtype.Outcome?
    /// the cue of "Xem vị trí trong bài" currently marked in the passage
    var highlight = ""
    private(set) var busy = false
    private let units: [Rtype.Unit]

    init(ctx: SkillsContext, content: RtypeContent? = nil, kind: String?) {
        self.ctx = ctx
        let c = content ?? RtypeContentStore.current
        self.content = c; units = c.units
        self.kind = kind.flatMap { Rtype.order.contains($0) ? $0 : nil }
    }
    /// fixed state for fixtures: the group `index` of the kind, answered (`checked`) or not
    static func fixture(ctx: SkillsContext, content: RtypeContent, kind: String?, index: Int = 0, answers: QAnswers = QAnswers(), checked: Bool = false) -> RtypeModel {
        let m = RtypeModel(ctx: ctx, content: content, kind: kind)
        m.index = index; m.answers = answers
        if checked, let u = m.current { m.outcome = Rtype.check(u, answers: answers, explain: content.explain(for: u), game: ctx.game, mistakes: [], now: ctx.now) }
        return m
    }

    /// bumped after every reload so the hub's percentages refresh when the learner comes back from a kind
    private(set) var revision = 0
    func load() async { await ctx.reload(); revision += 1 }
    var isEmpty: Bool { units.isEmpty }
    var cards: [Rtype.Card] { _ = revision; return Rtype.hub(units, rtype: ctx.game["rtype"] ?? .null) }
    var list: [Rtype.Unit] { kind.map { k in units.filter { $0.kind == k } } ?? [] }
    var current: Rtype.Unit? { index < list.count ? list[index] : nil }
    var finished: Bool { kind != nil && index >= list.count }
    /// the group with each question's explanation attached
    var shownPart: JSON { current.map { .obj([("groups", .array([Rtype.withExplanations($0.group, explain: content.explain(for: $0))]))]) } ?? .null }
    var results: [Int: QResult]? { outcome.map { o in Dictionary(uniqueKeysWithValues: o.results.map { ($0.n, $0) }) } }

    func setOne(_ n: Int, _ v: String) { answers.one[n] = v }
    func toggle(_ gi: Int, _ c: String) {
        var p = answers.multi[gi] ?? []
        if let i = p.firstIndex(of: c) { p.remove(at: i) } else if p.count < (current?.group.list("n").count ?? 2) { p.append(c) }
        answers.multi[gi] = p
    }
    /// "Kiểm tra": cumulative stats, per-kind progress record, mistakes, reward (one write)
    func check() async {
        guard let u = current, outcome == nil, !busy else { return }
        busy = true
        let o = Rtype.check(u, answers: answers, explain: content.explain(for: u), game: ctx.game, mistakes: ctx.bundle.mistakes, now: ctx.now)
        outcome = o
        await ctx.commit(game: o.game, mistakes: o.mistakes, reward: o.reward)
        busy = false
    }
    /// "Nhóm tiếp"
    func next() { index += 1; answers = QAnswers(); outcome = nil; highlight = "" }
    var position: (i: Int, n: Int) { (min(index + 1, max(1, list.count)), list.count) }
}
