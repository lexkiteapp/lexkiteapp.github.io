import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

struct DictSuggestion: Identifiable, Equatable {
    var id: String { word }
    var word: String, pos: String, vi: String
}

/// #/dict and #/dict/<word> (Stitch dict + word-card): search field with lexicon suggestions, recent + sample words, then the lookup:
/// loading → quick entry (lexicon, no network) → full entry → not found. The entry itself is `DictEntryView`.
struct DictView: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var model: DictModel?
    @State private var voice = LKVoicePlayer()
    @State private var suggestions: [DictSuggestion] = []
    @State private var typed = ""
    @FocusState private var focused: Bool

    init(route: AppRoute, model: DictModel? = nil, suggestions: [DictSuggestion] = []) {
        self.route = route
        _model = State(initialValue: model)
        _suggestions = State(initialValue: suggestions)
        _typed = State(initialValue: model?.query ?? route.arg ?? "")
    }

    var body: some View {
        WritingPage(title: t(.topSearch)) {
            if let m = model { content(m) } else { WritingSkeleton() }
        }
        .task(id: route.id) {
            if model == nil { model = makeModel() }
            guard let m = model, m.live else { return }
            typed = route.arg ?? ""
            await m.open(route.arg)
        }
        .onDisappear { voice.stop() }
    }

    private func makeModel() -> DictModel {
        let m = DictModel(uiLang: services.uiLang)
        m.cardSource = { await WritingCards.cards(services) }
        m.saveCard = { entry, ctx in await WritingCards.add(entry, context: ctx, services: services) }
        m.rewardLookup = { await WritingReward.lookup(services: services) }
        return m
    }

    @ViewBuilder private func content(_ m: DictModel) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(t(.dictEnglishVietnameseDictionary)).lkTextSafe(LKType.headlineMd).foregroundStyle(LKColor.onSurface.resolve(scheme))
            Text(t(.dictOxfordLanguagesDefinitionsUk)).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
        }
        searchBox(m)
        switch m.phase {
        case .input: inputPage(m)
        case .loading:
            WritingCard {
                Text(t(.dictLookingUp, ["q": m.word])).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                WritingSkeleton(rows: 4)
            }
            .accessibilityElement(children: .combine)
        case .quick, .full:
            DictEntryView(model: m, voice: voice, onOpen: openWord)
        case .notFound(let suggestion):
            notFound(m, suggestion)
        }
    }

    // MARK: search
    private func openWord(_ w: String) {
        let word = Dict.normWord(w)
        guard !word.isEmpty else { return }
        focused = false; suggestions = []
        services.router.open(AppRoute("dict", arg: word))
    }

    private func searchBox(_ m: DictModel) -> some View {
        VStack(spacing: 0) {
            WritingSearchField(placeholder: t(.dictTypeAnEnglishWord), clearLabel: t(.actionClose), text: $typed, onSubmit: { openWord(typed) })
                .focused($focused)
                .onChange(of: typed) { _, v in Task { await suggest(v, m) } }
            if focused, !suggestions.isEmpty {
                VStack(spacing: 0) {
                    ForEach(suggestions) { s in
                        Button { openWord(s.word) } label: {
                            HStack(spacing: LKSpacing.spaceXs) {
                                Text(s.word).lkTextSafe(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                                if !s.pos.isEmpty { WritingTag(text: s.pos) }
                                Text(s.vi).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).lineLimit(1)
                                Spacer(minLength: 0)
                                Image(systemName: "chevron.forward").font(.system(size: 13, weight: .bold)).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                            }
                            .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityElement(children: .combine)
                    }
                }
                .padding(.vertical, 4)
                .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
                .padding(.top, 6)
            }
        }
    }

    private func suggest(_ q: String, _ m: DictModel) async {
        guard m.live else { return }
        let list = await m.lex.suggest(q, 6)
        guard q == typed else { return }
        suggestions = list.map { DictSuggestion(word: $0.entry.t("word") ? $0.entry.s("word") : $0.key, pos: $0.entry.s("pos"), vi: $0.entry.s("vi")) }
    }

    // MARK: input page
    @ViewBuilder private func inputPage(_ m: DictModel) -> some View {
        if !m.recent.isEmpty {
            WritingHeading(t(.dictRecent), icon: "clock.arrow.circlepath")
            FlowLayout { ForEach(m.recent, id: \.self) { w in WritingChip(text: w, english: true) { openWord(w) } } }
        }
        WritingHeading(t(.dictLookUpAnyEnglish), icon: "sparkle.magnifyingglass")
        Text(t(.dictUkUsIpaMeanings)).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
        FlowLayout { ForEach(DictPage.sampleWords, id: \.self) { w in WritingChip(text: w, english: true) { openWord(w) } } }
    }

    // MARK: not found
    private func notFound(_ m: DictModel, _ suggestion: String?) -> some View {
        WritingCard {
            HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                Image(systemName: "questionmark.circle.fill").font(.system(size: 28)).foregroundStyle(LKColor.tertiary.resolve(scheme)).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 6) {
                    Text(t(.dictNoResultsFor, ["q": m.word])).lkTextSafe(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme))
                    if let suggestion {
                        Text(t.rich(.dictSuggestedTranslation, ["vi": suggestion])).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme))
                    }
                    Text(t(.dictCheckTheSpellingOr)).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                }
            }
            if m.live { Button(t(.actionRetry)) { Task { await m.open(m.query) } }.buttonStyle(WritingSecondaryButtonStyle()) }
        }
    }
}
