import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// M5 P10 (part) – #/placement (focus screen): intro → adaptive questions with a progress bar and "I don't know" → result (web `routes.placement`).
struct PlacementView: View {
    let model: PlacementModel
    var onClose: () -> Void = {}
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: model.progress), title: "", onExit: { if model.requestExit() { onClose() } })
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    switch model.stage {
                    case .intro: intro
                    case .ask: if let q = model.question { ask(q) }
                    case .result: if let e = model.estimate { result(e) }
                    }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm).padding(.bottom, LKSpacing.space2xl)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .alert(t(.revQuitNow), isPresented: Bindable(model).confirmExit) {
            Button(t(.lessonExitGo), role: .destructive) { onClose() }
            Button(t(.revKeepGoing), role: .cancel) {}
        } message: { Text(t(.revYourAnswersInThisRound)) }
        .accessibilityIdentifier("focus-placement")
    }

    // MARK: intro
    private var intro: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            SkillCard {
                VStack(spacing: LKSpacing.spaceMd) {
                    Image(systemName: "safari").font(.system(size: 44, weight: .semibold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                    Text(verbatim: t(.placeTitle)).studyText(LKType.headlineMd).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                    Text(StudyText.rich(t(.placeIntro))).studyText(LKType.bodyMd).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                    Text(verbatim: t(.placeHint)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity)
            }
            SkillAction(title: t(.placeStart), primary: true, enabled: model.canStart) { model.start() }.frame(maxWidth: .infinity)
        }
        .accessibilityIdentifier("placement-intro")
    }

    // MARK: question
    private static let letters = ["A", "B", "C", "D", "E", "F"]
    private func ask(_ q: PlaceQuestion) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            Text(verbatim: "\(model.answered + 1)/\(model.total)").studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: t(q.isVocab ? .placeTagVocab : .placeTagGrammar) + " · " + q.lv).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
                    Text(verbatim: q.text).studyText(q.isVocab ? LKType.headlineMd : LKType.bodyLg).englishText().fixedSize(horizontal: false, vertical: true)
                    if q.isVocab { Text(verbatim: t(.revChooseTheCorrectMeaning)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .accessibilityElement(children: .combine)
            ForEach(Array(q.options.enumerated()), id: \.offset) { k, o in
                LessonOption(letter: Self.letters[min(k, Self.letters.count - 1)], text: o, state: .idle) { model.answer(k) }
            }
            LessonOption(letter: "?", text: t(.lessonIdk), state: .idle) { model.answer(-1) }
        }
        .id(q.id)   // a new question is a fresh view: no focus / pressed state carried over
        .accessibilityIdentifier("placement-question")
    }

    // MARK: result
    private func tile(_ label: String, _ s: PlaceSkill) -> some View {
        let band = String(format: "%.1f", s.band)
        return VStack(spacing: 2) {
            Text(verbatim: band).studyText(LKType.headlineMd)
            Text(verbatim: label).studyText(LKType.titlePill).multilineTextAlignment(.center)
            Text(verbatim: s.cefr).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
        }
        .frame(maxWidth: .infinity, minHeight: 44).padding(LKSpacing.spaceSm)
        .tactile(fill: LKColor.surfaceContainer, line: LKColor.outlineVariant, radius: 16)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(label + " " + band + " " + s.cefr)
    }
    private func stageKey(_ s: String) -> L10nKey? { ["s0": .placeStgS0, "s1": .placeStgS1, "s2": .placeStgS2, "s3": .placeStgS3][s] }
    private func result(_ e: PlaceEstimate) -> some View {
        let weak = t(e.weak == "vocab" ? .placeWeakVocab : .placeWeakGrammar)
        let stage = stageKey(e.stage).map { t($0) } ?? ""
        let how = t(.placeHow, ["n": String(e.n)]) + " " + t(.placeDisclaimer)
        return VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            SkillCard {
                VStack(spacing: LKSpacing.spaceMd) {
                    Image(systemName: "scope").font(.system(size: 44, weight: .semibold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                    Text(verbatim: t(.placeBand, ["band": e.range])).studyText(LKType.headlineMd).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                    HStack(spacing: LKSpacing.spaceSm) { tile(t(.tabVocab), e.vocab); tile(t(.mistGrammar), e.grammar) }
                    Text(StudyText.rich(t(.placeWeak, ["weak": weak]))).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                    Text(verbatim: StudyText.plain(t(.placeStage, ["stage": stage]))).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    Text(verbatim: how).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity)
            }
            .accessibilityIdentifier("placement-result")
            SkillAction(title: t(.placeToday), primary: true) { onClose(); onRoute(AppRoute("home")) }.frame(maxWidth: .infinity)
            SkillAction(title: t(.revDailyPath), icon: "map") { onClose(); onRoute(AppRoute("path")) }.frame(maxWidth: .infinity)
        }
    }
}
