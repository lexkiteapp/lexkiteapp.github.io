import SwiftUI
import Observation
import UniformTypeIdentifiers
import LKStore
import LKSync
import LKStrings

/// A file handed to the share sheet; the bytes are produced only when the learner picks a destination.
struct DeckExport: Transferable, Sendable {
    let name: String
    let make: @Sendable () -> Data
    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(exportedContentType: .data) { x in
            let url = FileManager.default.temporaryDirectory.appendingPathComponent(x.name)
            try x.make().write(to: url, options: .atomic)
            return SentTransferredFile(url)
        }
    }
}

/// #/deck – the word book: filters, rows, edit card, share link, backup / Anki import and export (port of web/js/app.js routes.deck).
@MainActor @Observable
final class DeckModel {
    enum Phase: Equatable { case loading, list, shared, badShare }
    enum Notice: Equatable { case imported(Int), invalidFile, added(Int) }

    private(set) var phase: Phase = .loading
    private(set) var bundle = VocabBundle() { didSet { cacheVer = -1 } }
    var filter = DeckFilter()
    private(set) var shared: DeckTransfer.Shared?
    private(set) var adding = false
    private(set) var notice: Notice?
    private(set) var tick = 0
    var editing: String?
    var shareLink: String?
    var showImporter = false
    /// the Anki dialog (export / import) when open
    var ankiTab: AnkiTab?

    let core: StudyCore
    @ObservationIgnored var autoPlay = true
    init(core: StudyCore) { self.core = core }

    func load(query: [String: String]) async {
        bundle = await core.data.load()
        if let code = query["share"], !code.isEmpty {
            if let s = DeckTransfer.unpack(code) { shared = s; phase = .shared } else { phase = .badShare }
            return
        }
        filter = DeckFilter(query: query["from"], m: query["m"])
        phase = .list
    }
    private func refresh() async { bundle = await core.data.load() }

    // MARK: list
    var cards: [JSON] { bundle.cards }
    @ObservationIgnored private var cacheKey: DeckFilter?
    @ObservationIgnored private var cacheVer = -1
    @ObservationIgnored private var cacheRows: [JSON] = []
    /// filtered rows – cached until the filter or the cards change (the "fading" filter computes a retention per card)
    var matched: [JSON] {
        if cacheVer == 0, cacheKey == filter { return cacheRows }
        let r = DeckEngine.filter(bundle.cards, filter, now: core.now(), clock: core.clock)
        cacheKey = filter; cacheVer = 0; cacheRows = r
        return r
    }
    var shown: [JSON] { Array(matched.prefix(DeckEngine.maxRows)) }
    var mastered: Int { DeckEngine.masteredCount(bundle.cards) }
    func row(_ c: JSON) -> DeckRow { DeckEngine.row(c, now: core.now(), clock: core.clock) }
    var deckNames: [String] { DeckEngine.deckNames(bundle.cards) }
    /// library sets that hold at least one saved word, for the set selector
    var topicOptions: [(id: String, name: String)] {
        let used = Set(bundle.cards.map { $0.s("topic") })
        return bundle.catalog.topics.filter { used.contains($0.id) }.map { ($0.id, $0.name) }
    }
    func card(_ word: String) -> JSON? { bundle.cards.first { Vocab.cardKey($0) == word.lowercased() } }

    // MARK: edit card
    func save(_ word: String, vi: String, ipa: String, ex: String, note: String, image: String) {
        guard let c = card(word) else { return }
        var book = WordBook(cards: [c])
        book.edit(word, vi: vi, ipa: ipa, ex: ex, note: note, image: image, now: core.now())
        store(book.list)
    }
    func relearn(_ word: String) {
        guard let c = card(word) else { return }
        var book = WordBook(cards: [c])
        book.reset(word, now: core.now())
        store(book.list)
    }
    func delete(_ word: String) {
        let key = Vocab.keyOf(word)
        bundle.cards.removeAll { Vocab.cardKey($0) == key }
        editing = nil; tick += 1
        Task { await core.commit(VocabEdit(removed: [key])) }
    }
    private func store(_ list: [JSON]) {
        for c in list {
            let k = Vocab.cardKey(c)
            if let i = bundle.cards.firstIndex(where: { Vocab.cardKey($0) == k }) { bundle.cards[i] = c }
        }
        editing = nil; tick += 1
        let out = list
        Task { await core.commit(VocabEdit(upsert: out)) }
    }

    // MARK: share / export / import
    func share() {
        let rows = matched
        guard !rows.isEmpty, let code = DeckTransfer.pack(name: shareName, cards: rows) else { return }
        shareLink = DeckTransfer.link(code: code)
    }
    var shareCount: Int { min(DeckTransfer.maxShared, matched.count) }
    var shareName: String { filter.topic.hasPrefix("deck:") ? String(filter.topic.dropFirst(5)) : (bundle.catalog.topic(filter.topic)?.name ?? "") }
    func backupFile(_ stamp: String) -> DeckExport {
        let cards = bundle.cards, stats = bundle.stats, game = bundle.game, settings = bundle.settings, now = core.now()
        return DeckExport(name: "lexkite-backup-" + stamp + ".json") { DeckTransfer.backup(cards: cards, stats: stats, game: game, settings: settings, now: now) }
    }
    func importFile(_ url: URL) async {
        let ok = url.startAccessingSecurityScopedResource()
        defer { if ok { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else { notice = .invalidFile; return }
        if url.pathExtension.lowercased() == "json" || data.first == UInt8(ascii: "{") {
            guard let imp = DeckTransfer.importBackup(data, stats: bundle.stats, game: bundle.game) else { notice = .invalidFile; return }
            var edit = VocabEdit(upsert: imp.cards)
            edit.stats = imp.stats; edit.game = imp.game
            await core.commit(edit)
            await refresh()
            notice = .imported(imp.cards.count)
        } else {
            let text = String(decoding: data, as: UTF8.self)
            let entries = DeckTransfer.parseAnki(text, defaultDeck: url.deletingPathExtension().lastPathComponent)
            guard !entries.isEmpty else { notice = .invalidFile; return }
            var added: [JSON] = []
            for e in entries { added.append(core.addWord(e, into: &bundle)) }
            await core.commit(VocabEdit(upsert: added))
            notice = .imported(added.count)
        }
        tick += 1
    }
    func clearNotice() { notice = nil }

    /// Anki dialog: add the planned words as new cards in batches (the screen stays responsive); returns how many were added
    func addEntries(_ entries: [JSON], deck: String, progress: @MainActor (Int) -> Void) async -> Int {
        var added = 0
        var start = 0
        while start < entries.count {
            let end = min(entries.count, start + 200)
            var cards: [JSON] = []
            for var e in entries[start..<end] { e["deck"] = .string(deck); cards.append(core.addWord(e, into: &bundle)) }
            await core.commit(VocabEdit(upsert: cards))
            added += cards.count
            progress(added)
            start = end
            await Task.yield()
        }
        await refresh()
        tick += 1
        return added
    }

    // MARK: shared deck preview
    var sharedFresh: [JSON] { (shared?.words ?? []).filter { card($0.s("word")) == nil } }
    func addShared() async {
        guard !adding else { return }
        adding = true
        var added: [JSON] = []
        for var w in sharedFresh { w["topic"] = .string("shared"); added.append(core.addWord(w, into: &bundle)) }
        await core.commit(VocabEdit(upsert: added))
        adding = false; tick += 1
        notice = .added(added.count)
        phase = .list
        shared = nil
    }
    func speak(_ w: String) { core.speak(w, settings: bundle.settings) }
}
