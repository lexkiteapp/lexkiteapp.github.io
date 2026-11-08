import Foundation
import LKStore
import LKStrings
import LKSync

/// The full word library the learner browses (web `IELTS_DATA`): the same `js/data.js` + `js/lib/*.js` scripts the web loads, read as data (no JavaScript is run),
/// cached on disk by `LessonRemote` so it opens offline after the first visit. Before the first download (or offline without a cache) the bundled starter pack is used.
public actor WordCatalogRemote {
    public static let shared = WordCatalogRemote()
    /// load order of the web app
    static let libs = ["topics-more", "skills", "awl", "ngsl", "ngsl2", "office", "tsl-a", "tsl-b", "domain-a", "domain-b", "exam-vocab", "exam-vocab2", "exam-vocab3", "nawl", "bsl"]
    private let source: LessonTextSource
    private var memo: TopicCatalog?

    public init(source: LessonTextSource = LessonRemote.shared) { self.source = source }

    public func catalog() async -> TopicCatalog {
        if let m = memo { return m }
        guard let data = await source.text("js/data.js") else { return StudyCatalog.bundled() }
        let src = source
        let texts: [String?] = await withTaskGroup(of: (Int, String?).self) { g in
            for (n, l) in Self.libs.enumerated() { g.addTask { (n, await src.text("js/lib/\(l).js")) } }
            var out = [String?](repeating: nil, count: Self.libs.count)
            for await (n, t) in g { out[n] = t }
            return out
        }
        let cat = WebWords.catalog(dataJs: data, libs: texts.compactMap { $0 })
        if cat.topics.isEmpty { return StudyCatalog.bundled() }
        memo = cat
        LibraryWords.shared.fill(Set(cat.index.keys))
        return cat
    }
}

public extension L10n {
    /// A web source text (Vietnamese key, e.g. a topic or group name of the word library) in the UI language; unknown keys stay as they are, like the web `t()`.
    func src(_ source: String) -> String { translate(source: source) ?? source }
}

/// Words of the whole library as a lock-protected set (filled when the catalog loads) so synchronous code, e.g. the lemmatizer of the writing exercises,
/// asks "is this a known word" against the full library like the web `IELTS_DATA.INDEX`.
final class LibraryWords: @unchecked Sendable {
    static let shared = LibraryWords()
    private let lock = NSLock()
    private var words: Set<String> = []
    func contains(_ w: String) -> Bool { lock.lock(); defer { lock.unlock() }; return words.contains(w) }
    func fill(_ s: Set<String>) { lock.lock(); words = s; lock.unlock() }
}

/// The shared lemmatizer (LKStore `Lemmatizer`, port of web `App.lemma`) with the irregular tables of verbs.json; a word is known when the exercise shows it,
/// it is a verb of the tables or it is in the library.
enum WritingLemmas {
    static func make(known: Set<String>) -> Lemmatizer {
        Lemmatizer(tables: WritingVerbs.tables ?? .object([:]), known: { w in known.contains(w) || (WritingVerbs.shared?.isKnown(w) ?? false) || LibraryWords.shared.contains(w) })
    }
}

/// web `enrichLater`: after a single "+ Add" the saved card gets the pronunciation, audio, definition, example, meaning, picture and sentences it lacks, one word at a time
/// in the background (a lookup through the same dictionary service as the dictionary screen). Never overwrites a field the learner or the pack already has.
actor WordEnricher {
    static let shared = WordEnricher()
    static let fields = ["ipa", "ipaUS", "audio", "def", "ex", "vi", "image"]
    private var queue: [String] = []
    private var running = false
    private lazy var service: DictionaryService = {
        var cfg = DictConfig()
        cfg.viTypo = WritingVerbs.tables.map { Dict.viTypo(from: $0) } ?? [:]
        return DictionaryService(network: DictURLNetwork(), lex: LexStore(loader: DictLexLoader()), cache: DictDiskCache(), config: cfg)
    }()

    func enqueue(_ word: String, data: VocabDataSource, now: @escaping @Sendable () -> Int64) {
        queue.append(word)
        guard !running else { return }
        running = true
        Task { await drain(data, now) }
    }
    private func drain(_ data: VocabDataSource, _ now: @escaping @Sendable () -> Int64) async {
        while !queue.isEmpty {
            let w = queue.removeFirst()
            guard var c = await data.load().cards.first(where: { Vocab.cardKey($0) == Vocab.keyOf(w) }), !c.t("tl") else { continue }
            let needImage = c.s("pos") == "n" && !c.t("image"), needSentences = c.list("sentences").isEmpty
            guard let e = await service.lookup(w, image: needImage, examples: needSentences), e.t("found") else { continue }
            var changed = false
            if !c.t("image"), e.t("image") { c["imageCredit"] = e["imageCredit"] ?? .null }
            for k in Self.fields where !c.t(k) && e.t(k) { c[k] = e[k]; changed = true }
            if needSentences, let ss = e["sentences"]?.array, !ss.isEmpty { c["sentences"] = .array(Array(ss.prefix(2))); changed = true }
            if changed {
                c["mod"] = .number(Double(now()))
                await data.commit(VocabEdit(upsert: [c]), now: now())
            }
        }
        running = false
    }
}

extension StudyCore {
    /// background enrichment of a freshly added card (single adds only, like the web)
    func enrichLater(_ word: String) { let d = data, n = now; Task { await WordEnricher.shared.enqueue(word, data: d, now: n) } }
}
