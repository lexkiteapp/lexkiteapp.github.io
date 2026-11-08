import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/mistakes – focus screen: kind tabs, the wrong answers with what to do about each, retry mode.
struct StudyMistakesView: View {
    @State var model: StudyMistakesModel
    var retry: Bool
    var onClose: () -> Void
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(model: StudyMistakesModel, retry: Bool = false, onClose: @escaping () -> Void = {}, onRoute: @escaping (AppRoute) -> Void = { _ in }) {
        _model = State(initialValue: model); self.retry = retry; self.onClose = onClose; self.onRoute = onRoute
    }

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .inner, title: t(.todayMistakes), onExit: onClose)
            if !model.loaded { Spacer(); ProgressView(); Spacer() } else { content }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task {
            guard !model.loaded else { return }
            model.translate = model.core.translator(t)
            await model.load(retry: retry)
        }
        .lkHaptic(.correct, trigger: model.tick)
        .lkHaptic(.wrong, trigger: model.wrongTick)
        .accessibilityIdentifier("focus-mistakes")
    }

    private var content: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                if model.openCount == 0 {
                    StudyEmpty(icon: "checkmark.seal.fill", title: t(.mistNoMistakesToReview), message: t(.mistEveryQuestionYouGet),
                               action: (t(.revSmartStudy), { onRoute(AppRoute("practice", arg: "learn", query: ["src": "deck"])) }))
                } else {
                    tabs
                    actions
                    ForEach(model.rows, id: \.self) { x in
                        MistakeCard(model: model, x: x, onRoute: onRoute)
                            .opacity(model.fading.contains(x.s("key")) ? 0.35 : 1)
                            .animation(reduceMotion ? nil : .easeOut(duration: 0.3), value: model.fading)
                    }
                }
                if model.hasFixed {
                    Button(t(.mistClearFixedMistakes)) { model.clearFixed() }.buttonStyle(StudyOutlineButtonStyle())
                }
            }
            .padding(.horizontal, LKFrame.shared.gutter)
            .padding(.vertical, LKSpacing.spaceSm)
            .padding(.bottom, LKSpacing.space2xl)
            .frame(maxWidth: LKFrame.shared.width)
            .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
    }

    private var tabs: some View {
        let items: [(String, String)] = [("", t(.mistAll, ["n": model.counts["all"] ?? 0])),
            ("vocab", t(.tabVocab) + " " + Fmt.int(model.counts["vocab"] ?? 0, t.lang)),
            ("grammar", t(.mistGrammar) + " " + Fmt.int(model.counts["grammar"] ?? 0, t.lang)),
            ("reading", t(.mistReadingComprehension) + " " + Fmt.int(model.counts["reading"] ?? 0, t.lang)),
            ("listening", t(.todayListening) + " " + Fmt.int(model.counts["listening"] ?? 0, t.lang))]
        return ScrollView(.horizontal) {
            HStack(spacing: LKSpacing.spaceXs) {
                ForEach(items, id: \.0) { k, label in
                    Button { model.tab = k } label: {
                        Text(verbatim: label).lkTextSafe(LKType.labelMetric)
                            .foregroundStyle((model.tab == k ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
                            .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: LKFrame.shared.minTap)
                            .background(Capsule().fill((model.tab == k ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(model.tab == k ? .isSelected : [])
                }
            }
        }
        .scrollIndicators(.hidden)
    }

    private var actions: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            Button(model.retry ? t(.mistViewList) : t(.mistRetryMistakes)) { model.retry.toggle() }.buttonStyle(PrimaryButtonStyle())
            Button(t(.mistReviewFadingWords)) { onRoute(AppRoute("practice", arg: "learn", query: ["src": "forgetting"])) }.buttonStyle(StudyOutlineButtonStyle())
        }
    }
}

/// One wrong answer.
private struct MistakeCard: View {
    let model: StudyMistakesModel
    let x: JSON
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let v = model.view(x), key = x.s("key")
        LKCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                    StudyChip(text: kindName, tint: LKColor.secondary)
                    Spacer(minLength: 0)
                    if x.i("n") > 1 { Text(verbatim: t(.mistMissedTimes, ["n": x.i("n")])).studyText(LKType.labelBadge, LKColor.error) }
                }
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: v.q).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true).englishTextIf(isEnglish(v.q))
                    Spacer(minLength: 0)
                    if !v.qSay.isEmpty { StudySpeak(label: t(.vocabPronounce)) { model.speakWord(v.qSay) } }
                }
                if !v.qIpa.isEmpty, !model.ipa(of: v.qIpa).isEmpty { Text(verbatim: model.ipa(of: v.qIpa)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                if model.retry { retryBody(v, key: key) } else { listBody(v, key: key) }
            }
        }
    }

    private var kindName: String {
        switch x.s("kind") {
        case "grammar": return t(.mistGrammar)
        case "reading": return t(.mistReadingComprehension)
        case "listening": return t(.todayListening)
        default: return t(.tabVocab)
        }
    }
    private func isEnglish(_ s: String) -> Bool { s.range(of: "^[\\x20-\\x7E]+$", options: .regularExpression) != nil }

    // MARK: list mode
    @ViewBuilder private func listBody(_ v: MistakesEngine.View, key: String) -> some View {
        if !v.given.isEmpty { line(.lessonYourChoice, v.given, LKColor.error) }
        answerLine(v)
        tip(v)
        HStack(spacing: LKSpacing.spaceXs) {
            Button(t(.mistGotIt)) { model.understood(x) }.buttonStyle(StudyOutlineButtonStyle(tint: LKColor.success))
            link
        }
    }

    private func line(_ k: L10nKey, _ text: String, _ tint: LKDynamicColor) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(verbatim: t(k)).studyText(LKType.labelBadge, tint).textCase(.uppercase)
            Text(verbatim: text).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true).englishTextIf(isEnglish(text))
        }
    }
    @ViewBuilder private func answerLine(_ v: MistakesEngine.View) -> some View {
        if !v.ans.isEmpty {
            HStack(alignment: .top) {
                line(.lessonCorrectChoice, v.ans, LKColor.success)
                Spacer(minLength: 0)
                if !v.ansSay.isEmpty { StudySpeak(label: t(.vocabPronounce)) { model.speakWord(v.ansSay) } }
            }
            if !v.ansIpa.isEmpty, !model.ipa(of: v.ansIpa).isEmpty { Text(verbatim: model.ipa(of: v.ansIpa)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
        }
    }
    @ViewBuilder private func tip(_ v: MistakesEngine.View) -> some View {
        if !v.tip.isEmpty {
            Label { Text(verbatim: v.tip).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) } icon: { Image(systemName: "lightbulb.fill").foregroundStyle(LKColor.tertiary.resolve(scheme)) }
        }
    }

    /// the "go back to the source" link by kind
    @ViewBuilder private var link: some View {
        let ref = x.s("ref")
        switch x.s("kind") {
        case "grammar": linkButton(t(.mistReviewLesson)) { onRoute(AppRoute("grammar", arg: ref)) }
        case "reading": linkButton(t(.mistRereadPassage)) { onRoute(AppRoute("read", arg: ref)) }
        case "listening": linkButton(t(.mistReplayThisPart)) { onRoute(AppRoute("listen", arg: ref)) }
        default:
            if !ref.isEmpty {
                linkButton(t(.mistLookUpAgain)) { onRoute(AppRoute("dict", arg: ref)) }
                if !model.inDeck(ref) { linkButton("+ " + t(.vocabAdd)) { model.addToDeck(ref) } }
            }
        }
    }
    private func linkButton(_ title: String, _ run: @escaping () -> Void) -> some View {
        Button(action: run) {
            Text(verbatim: title).lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme))
                .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap)
        }
        .buttonStyle(.plain)
    }

    // MARK: retry mode
    @ViewBuilder private func retryBody(_ v: MistakesEngine.View, key: String) -> some View {
        let shown = model.revealed.contains(key)
        if !shown {
            if model.isShort(x) {
                TextField(t(.mistTypeYourAnswer), text: Binding(get: { model.typed[key] ?? "" }, set: { model.typed[key] = $0 }))
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .submitLabel(.done).onSubmit { model.check(x) }
                    .studyText(LKType.bodyLg).englishText()
                    .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 52)
                    .tactile(fill: LKColor.surfaceContainerHigh, radius: 16)
                Button(t(.lessonCheckAnswer)) { model.check(x) }.buttonStyle(PrimaryButtonStyle()).disabled((model.typed[key] ?? "").trimmingCharacters(in: .whitespaces).isEmpty)
            }
            Button(t(.mistShowAnswer)) { model.reveal(x) }.buttonStyle(StudyOutlineButtonStyle())
        } else {
            answerLine(v)
            tip(v)
            if model.penalized.contains(key) && !(model.typed[key] ?? "").isEmpty {
                Label { Text(verbatim: t(.lessonWrong)).studyText(LKType.bodyMd, LKColor.error) } icon: { Image(systemName: "xmark.circle.fill").foregroundStyle(LKColor.error.resolve(scheme)) }
            }
            HStack(spacing: LKSpacing.spaceXs) {
                Button(t(.mistIGotItRight)) { model.selfGrade(x, right: true) }.buttonStyle(StudyOutlineButtonStyle(tint: LKColor.success))
                Button(t(.mistStillWrong)) { model.selfGrade(x, right: false) }.buttonStyle(StudyOutlineButtonStyle(tint: LKColor.error))
            }
        }
    }
}
