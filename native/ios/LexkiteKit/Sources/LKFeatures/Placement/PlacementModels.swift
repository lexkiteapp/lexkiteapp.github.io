import SwiftUI
import Observation
import LKSync
import LKStore
import LKStrings

/// M5 P10 (part) – #/placement: intro → 20 adaptive questions → band range + CEFR per skill (web/js/placement.js `routes.placement`).
/// The result is written to the synced `settings.placement` (the day plan and the path read it) and counts as a finished set for XP.
@MainActor @Observable
final class PlacementModel {
    enum Stage: Equatable { case intro, ask, result }
    let ctx: SkillsContext
    let bank: PlaceBank
    private(set) var stage: Stage = .intro
    private(set) var question: PlaceQuestion?
    /// questions answered so far (the progress bar)
    private(set) var answered = 0
    private(set) var estimate: PlaceEstimate?
    var confirmExit = false
    private var session: PlaceSession?
    private var shownAt = Date.distantPast

    init(ctx: SkillsContext, bank: PlaceBank = .shared) { self.ctx = ctx; self.bank = bank }

    var total: Int { bank.n }
    var progress: Double { total > 0 ? Double(answered) / Double(total) : 0 }
    var canStart: Bool { !bank.vocab.isEmpty || !bank.grammar.isEmpty }
    /// the meaning shown for a word: Vietnamese for the Vietnamese UI, else the English definition
    private var meaningVi: Bool { ctx.lang == "vi" }

    func start() {
        guard canStart else { return }
        let s = PlaceSession(bank: bank, rnd: { Double.random(in: 0..<1) }, seed: UInt64.random(in: 0..<UInt64(UInt32.max)), meaningVi: meaningVi)
        session = s
        if let q = s.next() { show(q, answered: 0) } else { finish(s) }
    }

    /// `k` = option index, -1 = "I don't know". A second tap within 250 ms of a new question is ignored (the web's double-tap guard).
    func answer(_ k: Int) {
        guard let s = session, stage == .ask, Date().timeIntervalSince(shownAt) >= 0.25 else { return }
        s.answer(k)
        if let q = s.next() { show(q, answered: s.resp.count) } else { finish(s) }
    }

    /// not in a run, or nothing answered yet → true (leave at once); else the "leave half way?" alert opens (the answers of this run are not saved)
    func requestExit() -> Bool {
        if stage != .ask || answered == 0 { return true }
        confirmExit = true
        return false
    }

    private func show(_ q: PlaceQuestion, answered n: Int) { question = q; answered = n; stage = .ask; shownAt = Date() }

    private func finish(_ s: PlaceSession) {
        let e = Placement.estimate(s.resp)
        estimate = e; question = nil; answered = s.resp.count; stage = .result; confirmExit = false
        let rec = Placement.record(e, now: ctx.now)
        Task {
            var st = ctx.settings
            if !st.isObject { st = .object([:]) }
            st["placement"] = rec
            await ctx.commit(settings: st, reward: ["quizzes": 1, "xp": RewardRules.xp("set")])   // web: App.reward({ quizzes: 1, xp: Game.xpFor('set') })
        }
    }

    /// fixed state for fixtures: a question (by index in a replayed session) or the result of a set of answers
    func preview(question q: PlaceQuestion? = nil, answered: Int = 0, result: [PlaceResp]? = nil) {
        if let result { estimate = Placement.estimate(result); question = nil; self.answered = result.count; stage = .result }
        else if let q { question = q; self.answered = answered; stage = .ask; shownAt = .distantPast }
    }
}
