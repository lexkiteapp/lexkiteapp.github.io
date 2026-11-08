import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/phrases: the learner's phrasebook (cards that are phrases, newest first), learn them from 4, add by hand, 20-phrase starter pack, link to the model answers.
struct WritingPhrasesView: View {
    let source: WritingContentSource
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var cards: [JSON]
    @State private var models: [JSON]
    @State private var sheet = false
    @State private var busy = false
    @State private var addedNote: Int?
    @State private var voice = LKVoicePlayer()

    init(source: WritingContentSource = WritingRemoteContent.shared, cards: [JSON] = [], models: [JSON] = []) {
        self.source = source; _cards = State(initialValue: cards); _models = State(initialValue: models)
    }

    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }
    private var accent: Color { LKColor.secondary.resolve(scheme) }

    var body: some View {
        let book = WritingEngine.phraseBook(cards)
        WritingPage(title: t(.modelPhrasesStructures)) {
            VStack(alignment: .leading, spacing: 4) {
                Text(t.rich(.modelLearningInChunksMakes)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            }
            Button { sheet = true } label: { Label(t(.modelAddPhraseStructure), systemImage: "plus") }.buttonStyle(PrimaryButtonStyle())
            if book.canLearn {
                Button { services.router.open(AppRoute("practice", arg: "learn", query: ["src": "phrases"])) } label: { Label(t(.modelStudyPhrases), systemImage: "brain.head.profile") }.buttonStyle(WritingSecondaryButtonStyle())
            }
            Button { services.router.open(AppRoute("models")) } label: {
                HStack(spacing: LKSpacing.spaceSm) {
                    Image(systemName: "doc.text").font(.system(size: 20, weight: .bold)).foregroundStyle(accent).frame(width: 32)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(t(.modelBand8ModelAnswers2)).lkTextSafe(LKType.titlePill).foregroundStyle(ink).multilineTextAlignment(.leading)
                        Text(t(.modelReadAModelAnswer)).lkTextSafe(LKType.bodySm).foregroundStyle(dim).multilineTextAlignment(.leading)
                    }
                    Spacer(minLength: 0)
                    if !models.isEmpty { Text(t(.modelAnswers, ["n": models.count])).lkTextSafe(LKType.labelMetric).foregroundStyle(accent) }
                    Image(systemName: "chevron.forward").foregroundStyle(dim)
                }
                .padding(LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap + 16).frame(maxWidth: .infinity, alignment: .leading)
                .tactile(fill: LKColor.surfaceContainer, radius: 16).padding(.bottom, 4)
            }
            .buttonStyle(LKPressStyle())
            if let n = addedNote { Text(t(.modelAddedPhrasesToYour, ["n": n])).lkTextSafe(LKType.titlePill).foregroundStyle(LKColor.success.resolve(scheme)).accessibilityAddTraits(.updatesFrequently) }
            if book.list.isEmpty {
                WritingCard {
                    WritingNotice(icon: "puzzlepiece.extension", text: t(.modelNoPhrasesYetSelect))
                    if !models.isEmpty {
                        Button { Task { await starter() } } label: { Label(t(.modelAdd20TopPhrases), systemImage: "sparkles") }.buttonStyle(WritingSecondaryButtonStyle()).disabled(busy)
                    }
                }
            } else {
                ForEach(Array(book.list.enumerated()), id: \.offset) { _, c in row(c) }
            }
        }
        .task {
            if services.repo != nil { cards = await WritingCards.cards(services) }
            if models.isEmpty { models = await source.models() }
        }
        .sheet(isPresented: $sheet) {
            WritingPhraseSheet(phrase: "", meaning: "", sentence: "", showMeaning: services.uiLang == "vi", contextTitle: t(.modelPhrasesStructures)) { entry, ctx in
                Task { _ = await WritingCards.add(entry, context: ctx, services: services); cards = await WritingCards.cards(services) }
            }
            .environment(\.l10n, t)
        }
        .onDisappear { voice.stop() }
    }

    private func row(_ c: JSON) -> some View {
        WritingCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(c.s("word")).lkTextSafe(LKType.headlineSm).foregroundStyle(ink).englishText()
                    let m = Vocab.meanOf(c)
                    if !m.isEmpty { Text(m).lkTextSafe(LKType.bodyMd).foregroundStyle(accent) }
                    if c.t("note") { Label { Text(c.s("note")).lkTextSafe(LKType.bodySm).foregroundStyle(dim) } icon: { Image(systemName: "ruler") } }
                }
                Spacer(minLength: 0)
                WritingSayButton(text: c.s("word"), label: t(.revPlaySentence), voice: voice)
            }
            let ctx = c.list("contexts").first?.s("text") ?? c.s("ex")
            if !ctx.isEmpty { Text(WritingText.highlight("“" + String(ctx.prefix(140)) + "”", c.s("word"), accent)).lkTextSafe(LKType.bodySm).foregroundStyle(dim).englishText().frame(maxWidth: .infinity, alignment: .leading) }
            HStack(spacing: 4) {
                ForEach(0..<3, id: \.self) { i in Circle().fill((i < Vocab.mastery(c) ? LKColor.success : LKColor.surfaceContainerHighest).resolve(scheme)).frame(width: 10, height: 10) }
            }
            .accessibilityElement(children: .ignore)
        }
    }

    private func starter() async {
        busy = true
        defer { busy = false }
        let have = cards
        let picks = WritingEngine.starterPhrases(models: models, alreadySaved: { WritingCards.has($0, in: have) })
        for p in picks { _ = await WritingCards.add(p.entry, context: p.context, services: services) }
        addedNote = picks.count
        cards = await WritingCards.cards(services)
    }
}
