import SwiftUI
import Observation
import LKSync
import LKStore

/// State of #/dict and #/dict/<word>: input page → looking up → quick entry (lexicon, no network) → full entry → not found,
/// plus the save box (context sentence + translation), phrases containing the word and the Datamuse related words.
@MainActor @Observable
final class DictModel {
    enum Phase { case input, loading, quick(JSON), full(JSON), notFound(suggestion: String?) }

    var phase: Phase = .input
    var query = ""
    private(set) var word = ""
    private(set) var recent: [String]
    private(set) var cards: [JSON] = []
    var related: DictRelated.Result?
    var phrases: [JSON] = []
    var ctx = ""
    var ctxVi = ""
    var translating = false
    var translateFailed = false
    /// "saved" confirmation shown under the box
    var savedNote: String?
    private(set) var saving = false
    /// a lookup is running (skeleton under a quick entry)
    private(set) var busy = false

    let service: DictionaryService
    let lex: LexStore
    private let net: DictNetwork
    private let defaults: UserDefaults
    private let uiLang: String
    private let origin: String
    /// false for fixtures: the view then never starts a lookup
    let live: Bool
    var cardSource: () async -> [JSON] = { [] }
    var saveCard: (JSON, JSON?) async -> Void = { _, _ in }
    /// the lookup reward (stats + per-day counter); called once per word per day
    var rewardLookup: () async -> Void = {}
    @MainActor private static var lookedUp = Set<String>()

    init(uiLang: String, network: DictNetwork = DictURLNetwork(), cache: DictCache? = DictDiskCache(), loader: LexShardLoader? = DictLexLoader(),
         defaults: UserDefaults = .standard, live: Bool = true) {
        var cfg = DictConfig()
        cfg.meanLang = uiLang == "vi" ? "vi" : "en"; cfg.learnLang = uiLang
        cfg.viTypo = WritingVerbs.tables.map { Dict.viTypo(from: $0) } ?? [:]
        origin = cfg.base
        let lexStore = LexStore(loader: loader)
        lex = lexStore
        service = DictionaryService(network: network, lex: lexStore, cache: cache, config: cfg)
        net = network; self.defaults = defaults; self.uiLang = uiLang; self.live = live
        recent = WritingLocal.strings(WritingLocal.recentKey, defaults)
    }

    /// Fixed state for previews / snapshots.
    static func fixture(uiLang: String, phase: Phase, query: String = "", recent: [String] = [], cards: [JSON] = [], related: DictRelated.Result? = nil,
                        phrases: [JSON] = []) -> DictModel {
        let m = DictModel(uiLang: uiLang, network: DictOfflineNetwork(), cache: nil, loader: nil, defaults: UserDefaults(suiteName: "lk.dict.fixture") ?? .standard, live: false)
        m.phase = phase; m.query = query; m.recent = recent; m.cards = cards; m.related = related; m.phrases = phrases
        if case .full(let e) = phase { m.word = e.s("word") } else if case .quick(let e) = phase { m.word = e.s("word") }
        return m
    }

    var entry: JSON? { switch phase { case .quick(let e), .full(let e): return e; default: return nil } }
    var isFinal: Bool { if case .full = phase { return true }; return false }
    /// the saved card of the word on screen
    var card: JSON? { let k = Vocab.keyOf(word); return cards.first { Vocab.cardKey($0) == k } }

    func submit() async { await open(query) }

    func open(_ raw: String?) async {
        let w = Dict.normWord(raw)
        guard !w.isEmpty else { word = ""; phase = .input; return }
        query = raw ?? w
        if w == word, entry != nil { return }
        busy = true
        defer { busy = false }
        word = w; phase = .loading; related = nil; phrases = []; ctx = ""; ctxVi = ""; savedNote = nil
        recent = DictPage.recent(recent, adding: w)
        defaults.set(recent, forKey: WritingLocal.recentKey)
        cards = await cardSource()
        let quick = await service.quick(w)
        guard word == w else { return }
        if let quick, quick["found"] != JSON.bool(false) { phase = .quick(quick) }
        let full = await service.lookup(w)
        guard word == w else { return }
        if let f = full, f["found"] != JSON.bool(false) {
            phase = .full(f)
            let lk = DictPage.lookupKey(day: TodaySnapshot.dayKey(Date(), .current), word: f.s("word"))
            if live, Self.lookedUp.insert(lk).inserted { await rewardLookup() }
            async let rel = DictRelated.load(f, net: net, origin: origin)
            async let ph = lex.phrases(f.s("word"))
            related = await rel
            phrases = await ph ?? []
        } else if entry == nil {
            // not found: offer the translation of the typed text (Google), like the web
            var tr = full?.s("vi") ?? ""
            if tr.isEmpty { tr = uiLang == "vi" ? await service.translateVi(w) : await service.translateTo(w, tl: uiLang) }
            guard word == w else { return }
            phase = .notFound(suggestion: tr.isEmpty ? nil : tr)
        }
    }

    func retryRelated() async {
        guard let e = entry else { return }
        related = await DictRelated.load(e, net: net, origin: origin)
    }

    func refreshCards() async { cards = await cardSource() }

    func translateContext() async {
        let text = ctx.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty else { return }
        translating = true; translateFailed = false
        let r = uiLang == "vi" ? await service.translateVi(text) : await service.translateTo(text, tl: uiLang)
        translating = false
        ctxVi = r
        translateFailed = r.isEmpty
    }

    /// "Dùng làm ngữ cảnh": a sentence of the entry becomes the context to save
    func useSentence(en: String, vi: String) { ctx = en; ctxVi = vi; translateFailed = false }

    /// "Lưu flashcard" (quick) / "Lưu vào flashcard" with context: translate the pasted sentence first, then add the word.
    func save() async {
        guard let e = entry, !saving else { return }
        saving = true
        defer { saving = false }
        let text = ctx.trimmingCharacters(in: .whitespacesAndNewlines)
        if !text.isEmpty && ctxVi.isEmpty { await translateContext() }
        let had = card != nil
        await saveCard(e, DictPage.saveContext(text: text, vi: ctxVi))
        await refreshCards()
        savedNote = had ? "updated" : "saved"
        ctx = ""; ctxVi = ""
    }
    /// phrase from the lexicon / the learner's own phrase cards → deck
    func savePhrase(_ p: JSON) async {
        let entry = JSON.obj([("word", .string(p.s("word"))), ("vi", .string(p.s("vi"))), ("pos", "phrase"), ("ex", .string(p.s("ex"))), ("emoji", "🧩"), ("topic", "phrases")])
        await saveCard(entry, nil)
        await refreshCards()
    }
}

/// Fixtures never touch the network.
struct DictOfflineNetwork: DictNetwork {
    func json(_ url: String, timeout: TimeInterval) async -> JSON? { nil }
}
