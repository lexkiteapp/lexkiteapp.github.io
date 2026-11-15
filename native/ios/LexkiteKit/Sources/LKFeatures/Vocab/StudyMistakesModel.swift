import SwiftUI
import Observation
import LKStore
import LKSync
import LKStrings

/// #/mistakes – the book of wrong answers (port of web/js/plan.js routes.mistakes): tabs, retry mode, "understood", clean-up.
@MainActor @Observable
final class StudyMistakesModel {
    private(set) var loaded = false
    private(set) var bundle = VocabBundle()
    /// "" = all, else vocab · grammar · reading · listening
    var tab = ""
    var retry = false
    var typed: [String: String] = [:]
    private(set) var revealed: Set<String> = []
    private(set) var penalized: Set<String> = []
    private(set) var fading: Set<String> = []
    private(set) var tick = 0
    private(set) var wrongTick = 0

    let core: StudyCore
    @ObservationIgnored var translate: MistakesEngine.Translate = MistakesEngine.defaultTranslate
    @ObservationIgnored var alternatives: (String) -> [String] = { _ in [] }
    @ObservationIgnored var autoPlay = true
    init(core: StudyCore) { self.core = core }

    func load(retry r: Bool) async {
        retry = r
        bundle = await core.data.load()
        var list = bundle.mistakes
        if MistakesEngine.migrate(&list, alternatives: alternatives) > 0 { bundle.mistakes = list; save() }
        loaded = true
    }

    // MARK: lists
    /// open records, plus the ones fading out after a right answer
    private var visible: [JSON] {
        bundle.mistakes.map { x in
            guard fading.contains(x.s("key")) else { return x }
            var y = x; y["fixed"] = .bool(false); return y
        }
    }
    var counts: [String: Int] { MistakesEngine.counts(bundle.mistakes) }
    var rows: [JSON] { MistakesEngine.rows(visible, kind: tab, retry: retry) }
    var openCount: Int { counts["all"] ?? 0 }
    var hasFixed: Bool { bundle.mistakes.contains { $0.t("fixed") } }
    func view(_ x: JSON) -> MistakesEngine.View { MistakesEngine.view(x, translate: translate) }
    func isShort(_ x: JSON) -> Bool { MistakesEngine.isShortAnswer(x) }
    func ipa(of word: String) -> String {
        let k = word.lowercased()
        if let c = bundle.cards.first(where: { $0.s("word").lowercased() == k }), c.t("ipa") { return c.s("ipa") }
        return bundle.catalog.topics.lazy.flatMap(\.words).first { $0.s("word").lowercased() == k && $0.t("ipa") }?.s("ipa") ?? ""
    }
    func inDeck(_ word: String) -> Bool { bundle.cards.contains { Vocab.cardKey($0) == word.lowercased() } }

    // MARK: actions
    func understood(_ x: JSON) {
        let r = MistakesEngine.understood(bundle.mistakes, key: x.s("key"))
        apply(r, key: x.s("key"), fade: true)
    }
    func check(_ x: JSON) {
        let key = x.s("key"), answer = x.s("answer")
        guard !revealed.contains(key), !(typed[key] ?? "").trimmingCharacters(in: .whitespaces).isEmpty else { return }
        if MistakesEngine.isRight(typed: typed[key] ?? "", answer: answer) {
            apply(MistakesEngine.settle(bundle.mistakes, key: key, right: true), key: key, fade: true)
        } else {
            wrongTick += 1
            apply(MistakesEngine.settle(bundle.mistakes, key: key, right: false), key: key, fade: false)
            penalized.insert(key); revealed.insert(key)
        }
    }
    func reveal(_ x: JSON) { revealed.insert(x.s("key")) }
    /// self-grade after the answer was shown
    func selfGrade(_ x: JSON, right: Bool) {
        let key = x.s("key")
        if right { apply(MistakesEngine.settle(bundle.mistakes, key: key, right: true), key: key, fade: true); return }
        if !penalized.contains(key) { apply(MistakesEngine.settle(bundle.mistakes, key: key, right: false), key: key, fade: false); wrongTick += 1 }
        penalized.insert(key)
    }
    func clearFixed() { bundle.mistakes = MistakesEngine.clearFixed(bundle.mistakes); save() }

    private func apply(_ r: MistakesEngine.Settled, key: String, fade: Bool) {
        bundle.mistakes = r.list
        if r.xp > 0 {
            bundle.game = StudyGame.apply(bundle.game, StudyDelta(xp: r.xp), now: core.now(), clock: core.clock)
            let g = bundle.game
            Task { await core.commit(VocabEdit(game: g)) }
        }
        if fade {
            tick += 1; fading.insert(key)
            Task { try? await Task.sleep(nanoseconds: 600_000_000); self.fading.remove(key) }
        }
        save()
    }
    private func save() {
        let m = bundle.mistakes
        Task { await core.commit(VocabEdit(mistakes: m)) }
    }

    /// "+ Flashcard" next to a vocabulary mistake
    func addToDeck(_ word: String) {
        let entry = bundle.catalog.topics.lazy.flatMap(\.words).first { $0.s("word").lowercased() == word.lowercased() } ?? JSON.obj([("word", .string(word))])
        let card = core.addWord(entry, into: &bundle)
        Task { await core.commit(VocabEdit(upsert: [card])) }
        core.enrichLater(word)
        tick += 1
    }
    func speak(_ s: String) { core.speakSentence(s, settings: bundle.settings) }
    func speakWord(_ s: String) { core.speak(s, settings: bundle.settings) }
}
