import SwiftUI
import Observation
import UniformTypeIdentifiers
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/library – browse the word sets by group, the learner's own collections and CEFR level (port of web/js/app.js routes.library).
@MainActor @Observable
final class LibraryModel {
    private(set) var loaded = false
    private(set) var bundle = VocabBundle()
    var tab = "all"
    var level = ""
    var q = ""
    let core: StudyCore
    /// import / export of the whole book (shared with #/deck)
    let io: DeckModel
    init(core: StudyCore) { self.core = core; io = DeckModel(core: core) }

    func load(query: [String: String]) async {
        bundle = await core.data.load()
        let exam = bundle.settings.t("exam") ? bundle.settings.s("exam") : StarterDeck.exam(track: bundle.settings["track"]?.string, variant: bundle.settings.s("variant"))
        tab = LibraryEngine.defaultTab(g: query["g"], cardCount: bundle.cards.count, exam: exam)
        level = LibraryEngine.validLevel(query["lv"])
        loaded = true
    }
    func reload() async { bundle = await core.data.load() }

    var view: LibraryEngine.View { LibraryEngine.view(tab: tab, q: q, level: level, catalog: bundle.catalog, cards: bundle.cards, now: core.now(), clock: core.clock) }
    struct Tab: Hashable { let id: String, name: String }
    var tabs: [Tab] { [Tab(id: "all", name: "")] + bundle.catalog.groups.map { Tab(id: $0.id, name: $0.name) } + [Tab(id: "mine", name: "")] }
    private var have: Set<String> { Set(bundle.cards.map { Vocab.cardKey($0) }) }
    func topic(_ id: String) -> TopicCatalog.Topic? { bundle.catalog.topic(id) }
    func saved(_ tp: TopicCatalog.Topic) -> Int { let h = have; return tp.words.filter { h.contains($0.s("word").lowercased()) }.count }
    func group(_ id: String) -> TopicCatalog.Group? { bundle.catalog.groups.first { $0.id == id } }
    func levelCount(_ tp: TopicCatalog.Topic) -> Int { level.isEmpty ? tp.words.count : tp.words.filter { $0.s("level") == level }.count }
}

struct LibraryView: View {
    @State var model: LibraryModel
    var query: [String: String]
    var onRoute: (AppRoute) -> Void
    /// shown inside #/topic/<unknown id> (no own page chrome)
    var embedded = false
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    init(model: LibraryModel, query: [String: String] = [:], embedded: Bool = false, onRoute: @escaping (AppRoute) -> Void = { _ in }) {
        _model = State(initialValue: model); self.query = query; self.embedded = embedded; self.onRoute = onRoute
    }

    var body: some View {
        Group {
            if embedded { VStack(alignment: .leading, spacing: LKSpacing.spaceMd) { content } }
            else { StudyPage(title: t(.vocabVocabularyLibrary)) { content } }
        }
        .task { if !model.loaded { await model.load(query: query) } }
        .sheet(item: Binding(get: { model.io.ankiTab }, set: { model.io.ankiTab = $0 })) { tab in
            AnkiSheet(model: AnkiModel(deck: model.io, tab: tab), onRoute: onRoute).environment(\.l10n, t)
        }
        .fileImporter(isPresented: Binding(get: { model.io.showImporter }, set: { model.io.showImporter = $0 }),
                      allowedContentTypes: [.json, .plainText, .commaSeparatedText, .tabSeparatedText]) { r in
            if case .success(let url) = r { Task { await model.io.importFile(url); await model.reload() } }
        }
        .accessibilityIdentifier("inner-library")
    }

    @ViewBuilder private var content: some View {
        if !model.loaded { ProgressView().frame(maxWidth: .infinity, minHeight: 200) } else {
            let total = model.bundle.catalog.wordCount, sets = model.bundle.catalog.topics.count
            Text(verbatim: t(.vocabWordsPhrasesInSets, ["n": total, "k": sets])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            search
            tabsRow
            levelRow
            let v = model.view
            if let e = v.empty {
                Text(verbatim: e == .noCards ? t(.vocabYouHavenTSaved) : t(.vocabNoMatchingWordSets)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
                    .multilineTextAlignment(.center).frame(maxWidth: .infinity).padding(LKSpacing.spaceLg)
            } else {
                ForEach(Array(v.sections.enumerated()), id: \.offset) { _, s in section(s) }
            }
            ankiRow
        }
    }

    private var search: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            Image(systemName: "magnifyingglass").foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
            TextField(t(.vocabFilterSets), text: Binding(get: { model.q }, set: { model.q = $0 }))
                .textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.search).studyText(LKType.bodyLg)
        }
        .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 52)
        .tactile(fill: LKColor.surfaceContainerHigh, radius: 16)
    }

    private func chip(_ label: String, _ on: Bool, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Text(verbatim: label).lkTextSafe(LKType.labelMetric)
                .foregroundStyle((on ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
                .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: LKFrame.shared.minTap)
                .background(Capsule().fill((on ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(on ? .isSelected : [])
    }
    private var tabsRow: some View {
        ScrollView(.horizontal) {
            HStack(spacing: LKSpacing.spaceXs) {
                ForEach(model.tabs, id: \.id) { tb in
                    chip(tabName(tb), model.tab == tb.id) { model.tab = tb.id }
                }
            }
        }
        .scrollIndicators(.hidden)
    }
    private func tabName(_ tb: LibraryModel.Tab) -> String {
        if tb.id == "all" { return t(.vocabAll) }
        if tb.id == "mine" { return t(.vocabMyLibrary) }
        return tb.name.isEmpty ? t(.vocabAllSets) : t.src(tb.name)
    }
    private var levelRow: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: t(.vocabCefrLevel)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
            ScrollView(.horizontal) {
                HStack(spacing: LKSpacing.spaceXs) {
                    ForEach(LibraryEngine.levels, id: \.self) { lv in chip(lv.isEmpty ? t(.vocabAllLevels) : lv, model.level == lv) { model.level = lv } }
                }
            }
            .scrollIndicators(.hidden)
        }
    }

    // MARK: sections
    @ViewBuilder private func section(_ s: LibraryEngine.Section) -> some View {
        switch s.kind {
        case .myCollections:
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                header(t(.vocabMyLibrary), sub: t(.vocabSortedAutomaticallyByWhere))
                ForEach(s.collections, id: \.origin) { c in collection(c) }
            }
        case .learningTopics:
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                header(t(.vocabSetsInProgress), sub: nil)
                topicGrid(s.topics)
            }
        case .group(let g):
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                header(model.group(g)?.name.isEmpty == false ? t.src(model.group(g)?.name ?? "") : t(.vocabAllSets), sub: model.group(g)?.desc.isEmpty == false ? t.src(model.group(g)?.desc ?? "") : nil)
                topicGrid(s.topics)
                if let all = s.viewAll {
                    Button { model.tab = all.group } label: {
                        Text(verbatim: t(.vocabSeeAllSets, ["n": all.count])).lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap)
                    }
                }
            }
        }
    }
    private func header(_ title: String, sub: String?) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(verbatim: title).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
            if let sub, !sub.isEmpty { Text(verbatim: sub).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
        }
    }
    private func collection(_ c: LibraryEngine.Collection) -> some View {
        Button { onRoute(AppRoute("deck", query: ["from": c.origin])) } label: {
            LKCard(padding: LKSpacing.spaceSm) {
                HStack(spacing: LKSpacing.spaceSm) {
                    Image(systemName: StudyNames.originIcon(c.origin)).font(.system(size: 22, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(width: 44, height: 44)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(verbatim: StudySourceName.origin(c.origin, t)).studyText(LKType.titlePill)
                        Text(verbatim: StudySourceName.hint(c.origin, t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).lineLimit(2)
                        HStack(spacing: LKSpacing.spaceXs) {
                            Text(verbatim: t(.vocabWords, ["n": c.count])).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                            if c.due > 0 { Text(verbatim: t(.vocabDue, ["n": c.due])).studyText(LKType.labelBadge, LKColor.error) }
                        }
                    }
                    Spacer(minLength: 0)
                    StudyRing3(done: c.mastered, of: c.count)
                }
            }
        }
        .buttonStyle(LKPressStyle())
        .accessibilityElement(children: .combine)
    }
    private func topicGrid(_ ids: [String]) -> some View {
        LazyVStack(spacing: LKSpacing.spaceSm) {
            ForEach(ids, id: \.self) { id in
                if let tp = model.topic(id) {
                    Button { onRoute(AppRoute("topic", arg: id, query: model.level.isEmpty ? [:] : ["lv": model.level])) } label: {
                        LKCard(padding: LKSpacing.spaceSm) {
                            HStack(spacing: LKSpacing.spaceSm) {
                                Text(verbatim: tp.emoji.isEmpty ? "📘" : tp.emoji).font(.system(size: 30)).frame(width: 48, height: 48).accessibilityHidden(true)
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(verbatim: t.src(tp.name)).studyText(LKType.titlePill).multilineTextAlignment(.leading)
                                    if !tp.desc.isEmpty { Text(verbatim: t.src(tp.desc)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).lineLimit(2).multilineTextAlignment(.leading) }
                                    Text(verbatim: t(.vocabWords, ["n": model.levelCount(tp)]) + (model.level.isEmpty ? "" : " · " + model.level)).studyText(LKType.labelBadge, LKColor.secondary)
                                }
                                Spacer(minLength: 0)
                                StudyRing3(done: model.saved(tp), of: tp.words.count)
                            }
                        }
                    }
                    .buttonStyle(LKPressStyle())
                }
            }
        }
    }

    private var ankiRow: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            Button(t(.vocabExportToAnki)) { Task { await model.io.load(query: [:]); model.io.ankiTab = .export } }.buttonStyle(StudyOutlineButtonStyle())
            Button(t(.vocabImportFromAnki)) { Task { await model.io.load(query: [:]); model.io.ankiTab = .importing } }.buttonStyle(StudyOutlineButtonStyle())
        }
    }
}

/// Small progress ring "saved / total" (number inside, never colour alone).
struct StudyRing3: View {
    let done: Int, of: Int
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        ZStack {
            Circle().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 4)
            Circle().trim(from: 0, to: of > 0 ? CGFloat(min(done, of)) / CGFloat(of) : 0).stroke(LKColor.secondary.resolve(scheme), style: StrokeStyle(lineWidth: 4, lineCap: .round)).rotationEffect(.degrees(-90))
            Text(verbatim: "\(done)").lkTextSafe(LKType.labelBadge).foregroundStyle(LKColor.onSurface.resolve(scheme)).minimumScaleFactor(0.6)
        }
        .frame(width: 44, height: 44)
        .accessibilityElement(children: .ignore)
        .accessibilityValue(Text(verbatim: "\(done)/\(of)"))
    }
}
