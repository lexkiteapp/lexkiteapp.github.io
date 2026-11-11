import SwiftUI
import Observation
import LKSync
import LKStore
import LKCore
import LKStrings

/// What every Listening / Reading screen reads and writes (M4 P06): the bundled content, the learner's data (game, settings, mistakes, cards) through the
/// same `VocabDataSource` as the vocabulary screens, and the two device-only picks `vb.listenT` / `vb.readLv`. Heavy parts are injected so fixtures need no network and no sound.
@MainActor
final class SkillsContext {
    let core: StudyCore
    let data: SkillsData
    let lexis: Lexis
    let lang: String
    let defaults: UserDefaults
    private(set) var bundle = VocabBundle()
    /// the full pack once fetched, else the bundled 2 tests + 6 readings
    static var content: SkillsData { SkillsContentStore.current }
    static var sharedLexis: Lexis { SkillsContentStore.lexis }

    init(core: StudyCore, lang: String, data: SkillsData? = nil, lexis: Lexis? = nil, defaults: UserDefaults = .standard) {
        let data = data ?? SkillsContext.content
        self.core = core; self.lang = lang; self.data = data; self.lexis = lexis ?? (data.lexis.awl.isEmpty ? Self.sharedLexis : Lexis(data.lexis)); self.defaults = defaults
    }
    func reload() async { bundle = await core.data.load() }
    var game: JSON { bundle.game }
    var settings: JSON { bundle.settings }
    var now: Int64 { core.now() }
    func inDeck(_ w: String) -> Bool { let k = Vocab.keyOf(w); return bundle.cards.contains { Vocab.cardKey($0) == k } }

    /// One write of what a screen changed. `reward` is the `App.reward` argument: its XP and day counters go into the game on top of the screen's own change.
    func commit(game: JSON? = nil, mistakes: [JSON]? = nil, settings: JSON? = nil, reward: [String: Int]? = nil) async {
        var g = game ?? bundle.game
        if let r = reward {
            g = StudyGame.apply(g, StudyDelta(xp: r["xp"] ?? 0, counters: r.filter { $0.key != "xp" && $0.value > 0 }), now: now, clock: core.clock)
        }
        bundle.game = g
        if let mistakes { bundle.mistakes = mistakes }
        if let settings { bundle.settings = settings }
        await core.commit(VocabEdit(game: g, mistakes: mistakes, settings: settings))
    }
    /// settings.<key> = value, written at once
    func setSetting(_ key: String, _ value: JSON) async {
        var s = bundle.settings; s[key] = value
        await commit(settings: s)
    }
    /// `App.addWord(entry, context)`
    func addWord(_ entry: JSON, context: JSON?) async {
        var b = bundle
        let card = core.addWord(entry, context: context, into: &b)
        bundle = b
        await core.commit(VocabEdit(upsert: [card]))
    }
    /// the sentence translated into the learner's language (web: translateVi, else translateTo)
    func translate(_ text: String, with service: DictionaryService) async -> String {
        lang == "vi" ? await service.translateVi(text) : await service.translateTo(text, tl: lang)
    }
}

/// The P06 content pack: https://lexkite.com/data/skills-pack.json (same shape as `data.*` of skills.json), fetched and cached on disk by `LessonRemote`;
/// the bundled subset is used until it arrives or when offline for the first time.
@MainActor
enum SkillsContentStore {
    static let path = "data/skills-pack.json"
    private(set) static var current: SkillsData = SkillsData.bundled() ?? SkillsData()
    private(set) static var lexis = Lexis(current.lexis)
    private static var fetched = false
    /// the ONE place that decodes the pack: top-level keys listening / readings / lexis (SkillsData(json:)). Adjust here if the published keys differ.
    static func decode(_ text: String) -> SkillsData? {
        guard let j = try? JSON.parse(text) else { return nil }
        let d = SkillsData(json: j)
        if !d.parts.isEmpty || !d.readings.isEmpty { SkillsConsts.install(j["consts"]) }
        return d.parts.isEmpty && d.readings.isEmpty ? nil : d
    }
    static func refresh(source: LessonTextSource = LessonRemote.shared) async {
        guard !fetched else { return }
        fetched = true
        guard let text = await source.text(path), let d = decode(text) else { fetched = false; return }
        current = d
        if !d.lexis.awl.isEmpty { lexis = Lexis(d.lexis) }
    }
}

/// The two device-only choices of the web (`localStorage`): the open listening test and the reading level.
enum SkillsPrefs {
    static let listenKey = "vb.listenT", readKey = "vb.readLv"
}

/// Builds a screen model once with the app's data source; fixtures pass a ready model instead.
struct SkillsHost<M: AnyObject, Content: View>: View {
    let make: (SkillsContext) -> M
    let content: (M) -> Content
    @Environment(AppServices.self) private var services
    @Environment(\.vocabData) private var injected
    @State private var model: M?
    var body: some View {
        ZStack { if let model { content(model) } else { Color.clear } }
            .task { await SkillsContentStore.refresh() }
            .onAppear {
                guard model == nil else { return }
                let core = StudyCore(data: services.vocabSource(injected))
                core.onChange = { [weak services] in services?.localChange() }
                model = make(SkillsContext(core: core, lang: services.uiLang))
            }
    }
}

/// The popup of a tapped word (listening transcript and reader): `Dict.quick` → `Dict.lookup`, then "+ Lưu flashcard" with the sentence (translated) as context.
@MainActor @Observable
final class WordPopupModel: Identifiable {
    enum Stage: Equatable { case loading, notFound(translation: String?), found(WordPopup.Found) }
    let id = UUID()
    let word: String
    let sentence: String
    var stage: Stage = .loading
    private(set) var saving = false
    private(set) var saved = false
    private let context: SkillsContext?
    private let service: DictionaryService?
    /// the context stored with the card: (sentence, translation) → {text, vi, title}
    private let makeContext: (String, String) -> JSON
    var autoSpeak = false

    init(word: String, sentence: String, context: SkillsContext?, service: DictionaryService?, makeContext: @escaping (String, String) -> JSON) {
        self.word = word; self.sentence = sentence; self.context = context; self.service = service; self.makeContext = makeContext
    }
    /// fixed state for fixtures
    static func fixture(_ stage: Stage, word: String, sentence: String, saved: Bool = false) -> WordPopupModel {
        let m = WordPopupModel(word: word, sentence: sentence, context: nil, service: nil, makeContext: { _, _ in .null })
        m.stage = stage; m.saved = saved
        return m
    }

    func load() async {
        guard let service, let context else { return }
        var calls: [String] = []
        let phase = await WordPopup.resolve(word, sentence: sentence, deck: { context.inDeck($0) },
                                            quick: { await service.quick($0) }, lookup: { await service.lookup($0, image: false, examples: false) }, calls: &calls)
        switch phase {
        case .notFound(_, let tr): stage = .notFound(translation: tr)
        case .found(let f):
            stage = .found(f)
            if autoSpeak || context.settings["autoSpeak"]?.truthy == true { context.core.speak(f.word, settings: context.settings) }
        }
    }
    func speak() { if case .found(let f) = stage, let context { context.core.speak(f.word, settings: context.settings) } }
    func save() async {
        guard case .found(let f) = stage, let context, let service, !saving else { return }
        saving = true
        let vi = await context.translate(sentence, with: service)
        await context.addWord(f.entry, context: makeContext(sentence, vi))
        saving = false; saved = true
    }
}
