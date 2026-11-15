import SwiftUI
import Observation
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/topic/<id> – one word set: add words one by one or all at once, study links, level tabs (port of web/js/app.js routes.topic).
@MainActor @Observable
final class LibraryTopicModel {
    enum Phase: Equatable { case loading, topic, unknown }
    private(set) var phase: Phase = .loading
    private(set) var bundle = VocabBundle()
    private(set) var page: TopicPage?
    var level = ""
    private(set) var addedAll: Int?
    private(set) var tick = 0
    let core: StudyCore
    let id: String
    init(core: StudyCore, id: String) { self.core = core; self.id = id }

    func load(level q: String?) async {
        bundle = await core.data.load()
        reopen(level: q)
    }
    private func reopen(level q: String?) {
        if let p = TopicPage.open(id, level: q, catalog: bundle.catalog, cards: bundle.cards) { page = p; level = p.level; phase = .topic } else { phase = .unknown }
    }
    var words: [(word: JSON, inDeck: Bool)] { page?.words(level: level, cards: bundle.cards) ?? [] }

    func add(_ w: JSON) {
        let card = core.addWord(w, into: &bundle)
        reopen(level: level.isEmpty ? nil : level)
        tick += 1
        Task { await core.commit(VocabEdit(upsert: [card])) }
        core.enrichLater(w.s("word"))
    }
    func addAll() {
        guard let p = page, p.canAddAll else { return }
        var added: [JSON] = []
        let n = p.missing.count
        for w in p.missing { added.append(core.addWord(w, into: &bundle)) }
        reopen(level: level.isEmpty ? nil : level)
        addedAll = n; tick += 1
        let out = added
        Task { await core.commit(VocabEdit(upsert: out)) }
    }
    func ankiFile(stamp: String) -> DeckExport {
        let list = (page?.topic.words ?? []).map { w in bundle.cards.first { Vocab.cardKey($0) == w.s("word").lowercased() } ?? w }
        let name = page?.topic.name ?? ""
        return DeckExport(name: "lexkite-" + stamp + ".txt") { Data(DeckTransfer.ankiText(cards: list, deck: name).utf8) }
    }
    func speak(_ w: String) { core.speak(w, settings: bundle.settings) }
}

struct LibraryTopicView: View {
    @State var model: LibraryTopicModel
    var query: [String: String]
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    init(model: LibraryTopicModel, query: [String: String] = [:], onRoute: @escaping (AppRoute) -> Void = { _ in }) {
        _model = State(initialValue: model); self.query = query; self.onRoute = onRoute
    }

    var body: some View {
        Group {
            switch model.phase {
            case .unknown: LibraryView(model: LibraryModel(core: model.core), query: [:], onRoute: onRoute)   // unknown id → the library
            default:
                StudyPage(title: model.page.map { t.src($0.topic.name) } ?? t(.vocabVocabularyLibrary)) { content }
            }
        }
        .task { if model.phase == .loading { await model.load(level: query["lv"]) } }
        .lkHaptic(.tap, trigger: model.tick)
        .accessibilityIdentifier("inner-topic")
    }

    @ViewBuilder private var content: some View {
        if let p = model.page {
            header(p)
            studyLinks(p)
            if p.showsLevelTabs { levels(p) }
            LazyVStack(spacing: LKSpacing.spaceSm) {
                ForEach(Array(model.words.enumerated()), id: \.offset) { _, row in wordCard(row.word, inDeck: row.inDeck) }
            }
        } else { ProgressView().frame(maxWidth: .infinity, minHeight: 200) }
    }

    private func header(_ p: TopicPage) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack(spacing: LKSpacing.spaceSm) {
                Text(verbatim: p.topic.emoji.isEmpty ? "📘" : p.topic.emoji).font(.system(size: 40)).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: t.src(p.topic.name)).studyText(LKType.headlineMd).accessibilityAddTraits(.isHeader)
                    if !p.topic.desc.isEmpty { Text(verbatim: t.src(p.topic.desc)).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
                }
            }
            HStack(spacing: LKSpacing.spaceXs) {
                StudyChip(text: t(.vocabWords, ["n": p.topic.words.count]), tint: LKColor.onSurfaceVariant)
                if p.addedCount > 0 { StudyChip(text: t(.vocabAdded, ["n": p.addedCount]), icon: "checkmark", tint: LKColor.success) }
            }
            if p.canAddAll {
                Button(t(.vocabAddWordsToFlashcards, ["n": p.missing.count])) { model.addAll() }.buttonStyle(PrimaryButtonStyle())
            } else {
                Button(t(.vocabAllAdded)) {}.buttonStyle(PrimaryButtonStyle()).disabled(true)
            }
            if let n = model.addedAll { Text(verbatim: t(.vocabAddedWordsHeadTo, ["n": n])).studyText(LKType.bodySm, LKColor.success) }
        }
    }

    private func studyLinks(_ p: TopicPage) -> some View {
        let src = "topic:" + p.topic.id
        return VStack(spacing: LKSpacing.spaceXs) {
            HStack(spacing: LKSpacing.spaceXs) {
                Button(t(.vocabLearn)) { onRoute(AppRoute("practice", arg: "learn", query: ["src": src])) }.buttonStyle(StudyOutlineButtonStyle())
                Button(t(.revMatch)) { onRoute(AppRoute("practice", arg: "match", query: ["src": src])) }.buttonStyle(StudyOutlineButtonStyle())
                Button(t(.revTest)) { onRoute(AppRoute("practice", arg: "test", query: ["src": src])) }.buttonStyle(StudyOutlineButtonStyle())
            }
            HStack(spacing: LKSpacing.spaceXs) {
                Button(t(.vocabHandsFreeListening)) { onRoute(AppRoute("handsfree", arg: p.topic.id)) }.buttonStyle(StudyOutlineButtonStyle())
                ShareLink(item: model.ankiFile(stamp: DeckView.stamp(model.core.now())), preview: SharePreview(t(.vocabExportToAnki))) { Text(verbatim: t(.vocabExportToAnki)).frame(maxWidth: .infinity) }
                    .buttonStyle(StudyOutlineButtonStyle())
            }
        }
    }

    private func levels(_ p: TopicPage) -> some View {
        ScrollView(.horizontal) {
            HStack(spacing: LKSpacing.spaceXs) {
                ForEach([""] + p.levels, id: \.self) { lv in
                    Button { model.level = lv } label: {
                        Text(verbatim: lv.isEmpty ? t(.vocabAllLevels) : lv).lkTextSafe(LKType.labelMetric)
                            .foregroundStyle((model.level == lv ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
                            .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: LKFrame.shared.minTap)
                            .background(Capsule().fill((model.level == lv ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(model.level == lv ? .isSelected : [])
                }
            }
        }
        .scrollIndicators(.hidden)
    }

    private func wordCard(_ w: JSON, inDeck: Bool) -> some View {
        LKCard(padding: LKSpacing.spaceSm) {
            HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                VStack(alignment: .leading, spacing: 3) {
                    HStack(spacing: 6) {
                        Text(verbatim: w.s("word")).studyText(LKType.titlePill).englishText()
                        if w.t("pos") { StudyChip(text: w.s("pos"), tint: LKColor.onSurfaceVariant) }
                        if w.t("level") { StudyChip(text: w.s("level"), tint: LKColor.tertiary) }
                    }
                    if w.t("ipa") { Text(verbatim: w.s("ipa")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                    Text(verbatim: Vocab.meanOf(w)).studyText(LKType.bodyMd, LKColor.secondary)
                    if w.t("def") && w.s("def") != Vocab.meanOf(w) { Text(verbatim: w.s("def")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                    if w.t("ex") { Text(verbatim: "“" + w.s("ex") + "”").studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                    let col = w.strs("col")
                    if !col.isEmpty { Text(verbatim: col.prefix(4).joined(separator: " · ")).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).englishText() }
                    if inDeck {
                        Label { Text(verbatim: t(.vocabAdded2)).studyText(LKType.labelMetric, LKColor.success) } icon: { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)) }
                            .frame(minHeight: 28)
                    } else {
                        Button { model.add(w) } label: {
                            Label { Text(verbatim: t(.vocabAdd)).lkTextSafe(LKType.labelMetric) } icon: { Image(systemName: "plus") }
                                .foregroundStyle(LKColor.secondary.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap)
                        }
                        .buttonStyle(.plain)
                    }
                }
                Spacer(minLength: 0)
                StudySpeak(label: t(.vocabPronounce)) { model.speak(w.s("word")) }
            }
        }
        .accessibilityElement(children: .contain)
    }
}
