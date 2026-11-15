import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// Route wiring of the review / practice / mistakes / deck / library / topic screens (called from AppShell's InnerScreen and FocusScreen).
@MainActor
enum StudyRoutes {
    static let innerRoutes: Set<String> = ["deck", "library", "topic"]
    static let focusRoutes: Set<String> = ["review", "practice", "mistakes"]
    static func handlesInner(_ name: String) -> Bool { innerRoutes.contains(name) }
    static func handlesFocus(_ name: String) -> Bool { focusRoutes.contains(name) }

    /// Open another route from a screen. A focus screen is closed first when the target is a normal (pushed) screen.
    static func go(_ r: AppRoute, services: AppServices) {
        let focusNow = services.router.focus != nil
        if focusNow && r.presentation == .push { services.router.closeFocus() }
        services.router.open(r)
    }
}

/// Builds a screen model once, with the app's data source, and refreshes Today when something is saved.
struct StudyHost<M: AnyObject, Content: View>: View {
    let make: (StudyCore) -> M
    let content: (M) -> Content
    @Environment(AppServices.self) private var services
    @Environment(\.vocabData) private var injected
    @State private var model: M?
    var body: some View {
        ZStack {
            if let model { content(model) } else { Color.clear }
        }
        .onAppear {
            guard model == nil else { return }
            let core = StudyCore(data: services.vocabSource(injected))
            core.onChange = { [weak services] in services?.localChange() }
            model = make(core)
        }
    }
}

/// Pushed screens of the Vocab tab: #/deck · #/library · #/topic/<id>.
struct StudyInnerScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        switch route.name {
        case "deck": StudyHost(make: { DeckModel(core: $0) }) { DeckView(model: $0, query: route.query, onRoute: go) }
        case "library": StudyHost(make: { LibraryModel(core: $0) }) { LibraryView(model: $0, query: route.query, onRoute: go) }
        default: StudyHost(make: { LibraryTopicModel(core: $0, id: route.arg ?? "") }) { LibraryTopicView(model: $0, query: route.query, onRoute: go) }
        }
    }
}

/// Full-screen flows: #/review · #/practice[/mode] · #/mistakes.
struct StudyFocusScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        let close = { services.router.closeFocus() }
        switch route.name {
        case "review":
            StudyHost(make: { core -> StudyReviewModel in
                let m = StudyReviewModel(core: core)
                m.query = ReviewEngine.Query(Self.queryString(route.query))
                return m
            }) { StudyReviewView(model: $0, onClose: close, onRoute: go) }
        case "practice":
            StudyHost(make: { core -> StudyPracticeModel in
                let m = StudyPracticeModel(core: core)
                #if os(iOS)
                m.scorer = SFSpeechScorer()
                #endif
                return m
            }) { StudyPracticeView(model: $0, mode: route.arg, query: route.query, onClose: close, onRoute: go) }
        default:
            StudyHost(make: { StudyMistakesModel(core: $0) }) { StudyMistakesView(model: $0, retry: route.query["retry"] == "1", onClose: close, onRoute: go) }
        }
    }
    static func queryString(_ q: [String: String]) -> String { q.map { $0.key + "=" + ($0.value.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? "") }.joined(separator: "&") }
}

/// The Vocab tab root: today's review, the practice hub, the mistakes book, the word book and library, then the tools (dictionary, verbs, writing).
struct StudyVocabHub: View {
    let tab: LKFrame.Tab
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let s = services.today.snapshot
        VStack(spacing: 0) {
            TopBar(variant: .hub, title: t(L10nKey(rawValue: tab.label) ?? .tabVocab))
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    reviewCard(s)
                    group([("rectangle.stack.fill", t(.vocabMyWords), nil, AppRoute("deck")),
                           ("books.vertical.fill", t(.vocabVocabularyLibrary), nil, AppRoute("library")),
                           ("gamecontroller.fill", t(.revGamesPractice), nil, AppRoute("practice")),
                           ("exclamationmark.bubble.fill", t(.todayMistakes), s.mistakes > 0 ? t(.todayToFix, ["n": s.mistakes]) : nil, AppRoute("mistakes", query: s.mistakes > 0 ? ["retry": "1"] : [:]))])
                    group([("character.book.closed.fill", t(.dictEnglishVietnameseDictionary), nil, AppRoute("dict")),
                           ("textformat.abc", t(.verbEnglishVerbConjugator), nil, AppRoute("verb")),
                           ("text.magnifyingglass", t(.usageWordUsage), nil, AppRoute("usage")),
                           ("quote.bubble.fill", t(.modelPhrasesStructures), nil, AppRoute("phrases")),
                           ("doc.richtext.fill", t(.lettersModelAnswer), nil, AppRoute("models")),
                           ("envelope.fill", t(.modelTask1Letters), nil, AppRoute("letters")),
                           ("lightbulb.fill", t(.ideasTask2Ideas), nil, AppRoute("ideas")),
                           ("arrow.left.arrow.right", t(.paraParaphrasePractice), nil, AppRoute("paraphrase"))])
                }
                .padding(.horizontal, LKFrame.shared.gutter)
                .padding(.top, LKSpacing.spaceSm)
                .padding(.bottom, LKSpacing.space2xl)
                .frame(maxWidth: LKFrame.shared.width)
                .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task { await services.today.refresh() }
        .accessibilityIdentifier("tab-vocab")
    }

    private func reviewCard(_ s: TodaySnapshot) -> some View {
        LKCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(verbatim: t(.todayReview)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
                Text(verbatim: s.total > 0 ? t(.todayDueN, ["n": s.total]) : t(.revYouReAllCaught)).studyText(LKType.headlineMd)
                Text(verbatim: t(.revStudyingALittleEvery)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                Button(s.total > 0 ? t(.todayStart) : t(.revGamesPractice)) {
                    services.router.open(s.total > 0 ? AppRoute("review") : AppRoute("practice"))
                }
                .buttonStyle(PrimaryButtonStyle())
            }
        }
    }

    private func group(_ items: [(String, String, String?, AppRoute)]) -> some View {
        LKCard(padding: 0) {
            VStack(spacing: 0) {
                ForEach(Array(items.enumerated()), id: \.offset) { i, item in
                    Button { services.router.open(item.3) } label: {
                        HStack(spacing: LKSpacing.spaceSm) {
                            Image(systemName: item.0).font(.system(size: 20, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(width: 32).accessibilityHidden(true)
                            Text(verbatim: item.1).studyText(LKType.titlePill).multilineTextAlignment(.leading)
                            Spacer(minLength: 0)
                            if let badge = item.2 { StudyChip(text: badge, tint: LKColor.error) }
                            Image(systemName: "chevron.forward").font(.system(size: 13, weight: .bold)).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
                        }
                        .padding(.horizontal, LKSpacing.spaceMd)
                        .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    if i < items.count - 1 { Rectangle().fill(LKColor.outlineVariant.resolve(scheme)).frame(height: 1).padding(.leading, 56) }
                }
            }
        }
    }
}
