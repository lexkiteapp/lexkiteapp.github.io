import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/paraphrase: 10 rounds – the question's wording, pick how the passage rewords it (4 options). Result with XP at the end.
struct WritingParaphraseView: View {
    let source: WritingContentSource
    let fixedSeed: UInt64?
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var all: [(q: String, p: String)]?
    @State private var round: [(q: String, p: String)] = []
    @State private var options: [String] = []
    @State private var index = 0
    @State private var right = 0
    @State private var picked: String?
    @State private var rng: WritingRNG

    init(source: WritingContentSource = WritingRemoteContent.shared, data: [JSON]? = nil, seed: UInt64? = nil, step: Int = 0, pick: String? = nil) {
        self.source = source; fixedSeed = seed
        _rng = State(initialValue: seed.map { WritingRNG(seed: $0) } ?? WritingRNG.timeSeeded())
        if let data {
            let pairs = WritingEngine.paraphrasePairs(data)
            var r = seed.map { WritingRNG(seed: $0) } ?? WritingRNG.timeSeeded()
            let rd = Array(r.shuffled(pairs).prefix(WritingEngine.paraphraseRound))
            _all = State(initialValue: pairs); _round = State(initialValue: rd)
            _index = State(initialValue: step); _picked = State(initialValue: pick)
            if let it = rd.first { _options = State(initialValue: WritingEngine.paraphraseOptions(it, all: pairs, shuffle: { r.shuffled($0) })) }
        }
    }

    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }

    var body: some View {
        WritingPage(title: t(.paraParaphrasePractice)) {
            if let all {
                if all.count < 8 { WritingNotice(icon: "arrow.triangle.2.circlepath", text: t(.paraUpdatingData)) }
                else if index >= round.count { finished }
                else { question(round[index], all) }
            } else { WritingSkeleton(rows: 4) }
        }
        .task {
            guard all == nil || round.isEmpty else { return }
            let pairs = WritingEngine.paraphrasePairs(await source.paraphrase())
            all = pairs
            start(pairs)
        }
    }

    private func start(_ pairs: [(q: String, p: String)]) {
        round = Array(rng.shuffled(pairs).prefix(WritingEngine.paraphraseRound)); index = 0; right = 0; picked = nil
        prepare(pairs)
    }
    private func prepare(_ pairs: [(q: String, p: String)]) {
        guard index < round.count else { return }
        options = WritingEngine.paraphraseOptions(round[index], all: pairs, shuffle: { rng.shuffled($0) })
    }

    private func question(_ it: (q: String, p: String), _ pairs: [(q: String, p: String)]) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack(spacing: LKSpacing.spaceSm) {
                ProgressView(value: Double(index), total: Double(round.count)).tint(LKColor.primary.resolve(scheme))
                    .animation(LKMotionPolicy.progressAnimation(reduce: reduceMotion), value: index)
                Text("\(index + 1)/\(round.count)").lkTextSafe(LKType.labelMetric).foregroundStyle(dim)
            }
            .accessibilityElement(children: .combine)
            WritingCard {
                Text(t(.paraTheQuestionSays)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
                WritingEnglish(text: "“" + it.q + "”", style: LKType.headlineSm)
                Text(t(.paraThePassageRewordsThis)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
                ForEach(Array(options.enumerated()), id: \.offset) { j, o in
                    LessonOption(letter: ["A", "B", "C", "D"][min(j, 3)], text: o, state: optionState(o, it)) {
                        guard picked == nil else { return }
                        picked = o
                        if o == it.p { right += 1 }
                    }
                    .disabled(picked != nil)
                }
                if picked != nil {
                    VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                        Text(it.q + " ≈ " + it.p).lkTextSafe(LKType.bodyMd).foregroundStyle(ink).englishText()
                        Button(t(.paraNext)) { advance(pairs) }.buttonStyle(PrimaryButtonStyle())
                    }
                    .accessibilityAddTraits(.updatesFrequently)
                }
            }
        }
    }
    private func optionState(_ o: String, _ it: (q: String, p: String)) -> LessonOption.State {
        guard let picked else { return .idle }
        if o == it.p { return .correct }
        return o == picked ? .wrong : .dim
    }
    private func advance(_ pairs: [(q: String, p: String)]) {
        index += 1; picked = nil
        if index >= round.count {
            let r = WritingEngine.paraphraseFinish(right: right, total: round.count)
            Task { await WritingReward.xp(r.xp, services: services) }
        } else { prepare(pairs) }
    }

    private var finished: some View {
        let r = WritingEngine.paraphraseFinish(right: right, total: max(1, round.count))
        return WritingCard {
            Image(systemName: "arrow.triangle.2.circlepath").font(.system(size: 30, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
            Text(t(.paraCorrect, ["right": right, "total": round.count, "pct": r.percent])).lkTextSafe(LKType.headlineMd).foregroundStyle(ink)
            Text(t(.paraSpottingParaphrasesQuicklyIs)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
            Button(t(.paraKeepPracticing)) { if let all { start(all) } }.buttonStyle(PrimaryButtonStyle())
            Button(t(.paraBackToReading)) { services.router.open(AppRoute("skill", arg: "reading")) }.buttonStyle(WritingSecondaryButtonStyle())
        }
    }
}
