import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/ideas and #/ideas/<topic>: Task 2 idea bank – topic chips → issues (first one open) → arguments for / against with a model sentence,
/// tappable phrase chips that save to the phrasebook, topic vocabulary, practice prompts.
struct WritingIdeasView: View {
    let route: AppRoute
    let source: WritingContentSource
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var ideas: [JSON]?
    @State private var prompts: [JSON] = []
    @State private var open: Set<Int> = [0]
    @State private var pending: (phrase: String, vi: String, sentence: String)?
    @State private var voice = LKVoicePlayer()
    @State private var savedNote = false

    init(route: AppRoute, source: WritingContentSource = WritingRemoteContent.shared, ideas: [JSON]? = nil, prompts: [JSON] = []) {
        self.route = route; self.source = source
        _ideas = State(initialValue: ideas); _prompts = State(initialValue: prompts)
    }

    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }
    private var accent: Color { LKColor.secondary.resolve(scheme) }
    private var vi: Bool { services.uiLang == "vi" }
    /// topic titles are authored in Vietnamese and translated through the shared string table (ids ideas.*); a title with no id keeps the topic name
    private func topicTitle(_ x: JSON) -> String {
        if x.t("title"), let tr = t.translate(source: x.s("title")) { return tr }
        return vi && x.t("title") ? x.s("title") : x.s("topic").prefix(1).uppercased() + x.s("topic").dropFirst()
    }

    var body: some View {
        WritingPage(title: t(.ideasTask2IdeaBank)) {
            if let all = ideas {
                if let v = WritingEngine.ideas(all, topic: route.arg, prompts: prompts) { page(v, all) } else { WritingNotice(icon: "lightbulb", text: t(.ideasTheIdeaBankIs)) }
            } else { WritingSkeleton(rows: 5) }
        }
        .task {
            if ideas == nil { ideas = await source.ideas() }
            if prompts.isEmpty { prompts = await source.prompts() }
        }
        .sheet(isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } })) {
            if let p = pending {
                WritingPhraseSheet(phrase: p.phrase, meaning: p.vi, sentence: p.sentence, showMeaning: vi, contextTitle: t(.ideasTask2Ideas)) { entry, ctx in
                    Task { if await WritingCards.add(entry, context: ctx, services: services) { savedNote = true } }
                }
                .environment(\.l10n, t)
            }
        }
        .onDisappear { voice.stop() }
    }

    @ViewBuilder private func page(_ v: WritingEngine.IdeasView, _ all: [JSON]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(t(.ideasRunningOutOfIdeas)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
        }
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LKSpacing.spaceXs) {
                ForEach(Array(all.enumerated()), id: \.offset) { _, x in
                    WritingChip(text: x.s("emoji") + " " + topicTitle(x), selected: x.s("topic") == v.selected) { services.router.open(AppRoute("ideas", arg: x.s("topic"))) }
                }
            }
        }
        if savedNote { Label(t(.vocabAdded2), systemImage: "checkmark.circle.fill").lkTextSafe(LKType.titlePill).foregroundStyle(LKColor.success.resolve(scheme)).accessibilityAddTraits(.updatesFrequently) }
        ForEach(Array(v.issues.enumerated()), id: \.offset) { i, issue in issueCard(i, issue) }
        if !v.topic.list("vocab").isEmpty {
            WritingCard {
                WritingHeading(t(.ideasTopicVocabulary, ["topic": topicTitle(v.topic)]), icon: "character.book.closed")
                ForEach(Array(v.topic.list("vocab").enumerated()), id: \.offset) { _, w in
                    let a = w.array ?? []
                    VStack(alignment: .leading, spacing: 0) {
                        Text(a.first?.jsToString ?? "").lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                        if vi, a.count > 1 { Text(a[1].jsToString).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
        if !v.prompts.isEmpty {
            WritingCard {
                WritingHeading(t(.ideasPractiseWritingOnThis), icon: "square.and.pencil")
                ForEach(Array(prompts.filter { v.prompts.contains($0.s("id")) }.prefix(5).enumerated()), id: \.offset) { _, p in
                    Button { services.router.open(AppRoute("write", arg: p.s("id"))) } label: {
                        HStack { WritingEnglish(text: p.s("text"), style: LKType.bodySm); Image(systemName: "chevron.forward").foregroundStyle(dim) }
                            .frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func issueCard(_ i: Int, _ issue: JSON) -> some View {
        let isOpen = Binding(get: { open.contains(i) }, set: { if $0 { open.insert(i) } else { open.remove(i) } })
        return DisclosureGroup(isExpanded: isOpen) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                side(t(.ideasFor), "hand.thumbsup.fill", issue.list("for"))
                side(t(.ideasAgainst), "hand.thumbsdown.fill", issue.list("against"))
            }
            .padding(.top, LKSpacing.spaceXs)
        } label: {
            Text(issue.s("q")).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText().multilineTextAlignment(.leading).frame(minHeight: LKFrame.shared.minTap, alignment: .leading)
        }
        .tint(accent)
        .padding(LKSpacing.spaceSm)
        .tactile(fill: LKColor.surfaceContainer, radius: 16).padding(.bottom, 4)
    }

    @ViewBuilder private func side(_ title: String, _ icon: String, _ list: [JSON]) -> some View {
        Label(title, systemImage: icon).lkTextSafe(LKType.headlineSm).foregroundStyle(accent)
        ForEach(Array(list.enumerated()), id: \.offset) { _, x in
            VStack(alignment: .leading, spacing: 6) {
                Text(x.s("idea")).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                if vi, x.t("vi") { Text(x.s("vi")).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                HStack(alignment: .top) {
                    WritingEnglish(text: x.s("ex"), style: LKType.bodyMd)
                    WritingSayButton(text: x.s("ex"), label: t(.revPlaySentence), voice: voice)
                }
                .padding(.leading, LKSpacing.spaceXs)
                FlowLayout {
                    ForEach(x.strs("chunks"), id: \.self) { c in
                        let save = WritingEngine.ideaChunkSave(c, example: x.s("ex"), learnLang: services.uiLang)
                        WritingChip(text: save.phrase, system: "plus", english: true) { pending = save }
                            .accessibilityHint(t(.ideasTapToSave))
                    }
                }
            }
            .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
        }
    }
}
