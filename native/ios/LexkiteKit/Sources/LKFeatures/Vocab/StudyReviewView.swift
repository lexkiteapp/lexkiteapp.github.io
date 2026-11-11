import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync
import LKCore

/// Highlights the word (and its inflections) inside a sentence.
enum StudyHighlight {
    static func attributed(_ text: String, word: String, color: Color) -> AttributedString {
        var out = AttributedString()
        guard let re = StudyModes.wordRegex(word) else { return AttributedString(text) }
        var last = text.startIndex
        for m in re.matches(in: text, range: NSRange(text.startIndex..., in: text)) {
            guard let r = Range(m.range, in: text) else { continue }
            out += AttributedString(String(text[last..<r.lowerBound]))
            var hit = AttributedString(String(text[r]))
            hit.inlinePresentationIntent = .stronglyEmphasized
            hit.foregroundColor = color
            out += hit
            last = r.upperBound
        }
        out += AttributedString(String(text[last...]))
        return out
    }
}

/// #/review – focus screen: top bar with progress, the card (front / back / typed / listened), the grade buttons, the summary.
struct StudyReviewView: View {
    @State var model: StudyReviewModel
    var onClose: () -> Void
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    init(model: StudyReviewModel, onClose: @escaping () -> Void = {}, onRoute: @escaping (AppRoute) -> Void = { _ in }) {
        _model = State(initialValue: model); self.onClose = onClose; self.onRoute = onRoute
    }

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: model.phase == .card ? model.progress : (model.phase == .summary ? 1 : 0)), title: "", onExit: onClose)
            switch model.phase {
            case .loading: Spacer(); ProgressView(); Spacer()
            case .redirect:
                Spacer(); ProgressView().task { onRoute(AppRoute("practice", arg: "learn", query: ["src": "forgetting"])) }; Spacer()
            case .empty:
                Spacer()
                StudyEmpty(icon: "rectangle.stack.badge.plus", title: t(.revNoFlashcardsYet), message: t(.revAddWordsFromThe),
                           action: (t(.revOpenLibrary), { onRoute(AppRoute("library")) }), secondary: (t(.todayLookUp), { onRoute(AppRoute("dict")) }))
                Spacer()
            case .allDone, .summary:
                ReviewSummaryView(model: model, allDone: model.phase == .allDone, onClose: onClose, onRoute: onRoute)
            case .card: cardScreen
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task { if model.phase == .loading { await model.load() } }
        .lkHaptic(.tap, trigger: model.gradeTick)
        .animation(LKMotionPolicy.progressAnimation(reduce: reduceMotion), value: model.progress)
        .accessibilityIdentifier("focus-review")
    }

    // MARK: card screen
    private var cardScreen: some View {
        VStack(spacing: 0) {
            toolRow
            ScrollView {
                VStack(spacing: LKSpacing.spaceMd) {
                    badgeRow
                    if model.undoneNotice { Text(verbatim: t(.revUndoneGradeThisCard)).studyText(LKType.bodySm, LKColor.tertiary).frame(maxWidth: .infinity, alignment: .center) }
                    if let c = model.current {
                        if model.flipped { ReviewBack(model: model, c: c).gesture(swipe) } else { front(c) }
                    }
                }
                .padding(.horizontal, LKFrame.shared.gutter)
                .padding(.top, LKSpacing.spaceXs)
                .padding(.bottom, LKSpacing.spaceLg)
                .frame(maxWidth: LKFrame.shared.width)
                .frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            .scrollDismissesKeyboard(.interactively)
            bottomBar
        }
    }

    private var toolRow: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            if model.canUndo {
                LessonIconButton(system: "arrow.uturn.backward", label: t(.revUndoLastGradeZ)) { model.undo() }
            }
            LessonIconButton(system: "headphones", label: t(.revHandsFreeMode)) { onRoute(AppRoute("handsfree", arg: "session")) }
            Spacer(minLength: 0)
            HStack(spacing: 6) {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true)
                Text(verbatim: "\(model.done)").studyText(LKType.labelMetric)
                Text(StudyText.rich(t(.revCardsLeft, ["n": model.left]))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            }
            .accessibilityElement(children: .combine)
        }
        .padding(.horizontal, LKFrame.shared.gutter - 6)
        .frame(maxWidth: LKFrame.shared.width)
        .frame(maxWidth: .infinity)
    }

    private var badgeRow: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            if model.isNew { StudyChip(text: t(.revNew), icon: "sparkles", tint: LKColor.tertiary) } else { StudyDots(level: model.mastery) }
            Spacer(minLength: 0)
            Menu {
                ForEach(StudyModes.modes, id: \.self) { m in
                    Button { model.setMode(m) } label: { Label(modeTitle(m), systemImage: icon(m)) }
                }
            } label: {
                Image(systemName: icon(model.mode)).font(.system(size: 17, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme))
                    .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle())
            }
            .accessibilityLabel(modeTitle(model.mode))
            Button { model.toggleReverse() } label: {
                Image(systemName: "arrow.left.arrow.right").font(.system(size: 17, weight: .bold))
                    .foregroundStyle(LKColor.secondary.resolve(scheme))
                    .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle())
            }
            .accessibilityLabel(t(.revFlipCardDirection))
            .accessibilityValue(Text(verbatim: model.reverse ? "2" : "1"))
        }
    }
    private func icon(_ m: String) -> String { m == "type" ? "keyboard" : m == "audio" ? "headphones" : m == "auto" ? "wand.and.stars" : "rectangle.on.rectangle" }
    private func modeTitle(_ m: String) -> String { m == "type" ? t(.revTypeIt) : m == "audio" ? t(.revListenPick) : m == "auto" ? t(.revAuto) : t(.revFlipCard) }

    private var swipe: some Gesture {
        DragGesture(minimumDistance: 28).onEnded { v in
            guard model.mode == "flip", model.checked == nil, abs(v.translation.width) > abs(v.translation.height) * 1.5 else { return }
            if v.translation.width < -90 { model.grade(0) } else if v.translation.width > 90 { model.grade(2) }
        }
    }

    // MARK: front faces
    @ViewBuilder private func front(_ c: JSON) -> some View {
        switch model.mode {
        case "type": ReviewTypeFront(model: model, c: c)
        case "audio": ReviewAudioFront(model: model, c: c)
        default: flipFront(c)
        }
    }

    private func flipFront(_ c: JSON) -> some View {
        VStack(spacing: LKSpacing.spaceSm) {
            if model.reverse {
                Text(verbatim: Vocab.meanOf(c)).studyText(LKType.headlineLg).multilineTextAlignment(.center)
                if c.t("pos") { StudyChip(text: c.s("pos")) }
                if c.t("ex"), let b = PracticeRun.cloze(c.s("ex"), c.s("word")) {
                    Text(verbatim: "“" + b + "”").studyText(LKType.bodyLg, LKColor.onSurfaceVariant).multilineTextAlignment(.center).englishText()
                }
                Text(verbatim: t(.revRecallTheEnglishWord)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
            } else {
                if c.t("image") || c.t("emoji") { StudyThumb(emoji: c.s("emoji"), image: c.s("image"), size: 96) }
                HStack(spacing: LKSpacing.spaceXs) {
                    Text(verbatim: c.s("word")).studyText(LKType.displayHeroMobile).multilineTextAlignment(.center).englishText()
                    StudySpeak(label: t(.vocabPronounce)) { model.speak() }
                }
                if c.t("ipa") { Text(verbatim: c.s("ipa")).studyText(LKType.bodyLg, LKColor.onSurfaceVariant).englishText() }
                if c.t("pos") { StudyChip(text: c.s("pos")) }
                if let cx = c.list("contexts").first?.s("text"), !cx.isEmpty {
                    Text(StudyHighlight.attributed("“" + StudyModes.trim(cx, word: c.s("word"), max: 140) + "”", word: c.s("word"), color: LKColor.secondary.resolve(scheme)))
                        .studyText(LKType.bodyMd, LKColor.onSurfaceVariant).multilineTextAlignment(.center).englishText()
                }
                Text(verbatim: t(.revGuessTheMeaningThen)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 280)
        .padding(LKSpacing.spaceLg)
        .tactile(fill: LKColor.surfaceContainer, radius: 28)
        .contentShape(Rectangle())
        .onTapGesture { model.flip() }
        .accessibilityElement(children: .contain)
        .accessibilityAddTraits(.isButton)
        .accessibilityAction(named: Text(verbatim: t(.revFlipCard))) { model.flip() }
    }

    // MARK: bottom bar
    @ViewBuilder private var bottomBar: some View {
        Group {
            if model.checked != nil {
                Button(t(.actionContinue)) { model.continueChecked() }.buttonStyle(PrimaryButtonStyle())
            } else if model.flipped {
                ReviewGrades(model: model)
            } else if model.mode == "flip" {
                Button(t(.revFlipCard)) { model.flip() }.buttonStyle(PrimaryButtonStyle())
            }
        }
        .padding(.horizontal, LKFrame.shared.gutter)
        .padding(.vertical, LKSpacing.spaceSm)
        .frame(maxWidth: LKFrame.shared.width)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - grade buttons
private struct ReviewGrades: View {
    let model: StudyReviewModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let items: [(Int, L10nKey, LKDynamicColor)] = [(0, .revAgain, LKColor.error), (1, .revHard, LKColor.tertiary), (2, .revGood, LKColor.secondary), (3, .revEasy, LKColor.success)]
        HStack(spacing: LKSpacing.spaceXs) {
            ForEach(items, id: \.0) { g, key, color in
                let label = t(key), when = model.preview(g, lang: t.lang)
                Button { model.grade(g) } label: {
                    VStack(spacing: 2) {
                        Text(verbatim: label).lkTextSafe(LKType.titlePill).foregroundStyle(color.resolve(scheme)).multilineTextAlignment(.center).lineLimit(2).minimumScaleFactor(0.8)
                        Text(verbatim: when).lkTextSafe(LKType.labelBadge).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                    }
                    .padding(.horizontal, 4).padding(.vertical, LKSpacing.spaceXs)
                    .frame(maxWidth: .infinity, minHeight: 64)
                    .tactile(fill: LKColor.surfaceContainer, line: color, ledge: color, radius: 16)
                }
                .buttonStyle(LKPressStyle())
                .accessibilityElement(children: .ignore)
                .accessibilityLabel(Text(verbatim: label + ", " + when))
            }
        }
        .padding(.bottom, 4)
        .accessibilityElement(children: .contain)
        .accessibilityLabel(t(.revRateHowWellYou))
    }
}

// MARK: - type mode
private struct ReviewTypeFront: View {
    let model: StudyReviewModel, c: JSON
    @Environment(\.l10n) private var t
    @FocusState private var focused: Bool
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: LKSpacing.spaceMd) {
            VStack(spacing: LKSpacing.spaceSm) {
                Text(verbatim: Vocab.meanOf(c)).studyText(LKType.headlineLg).multilineTextAlignment(.center)
                if c.t("pos") { StudyChip(text: c.s("pos")) }
                Text(verbatim: t(.revHintStartsWithLetters, ["a": String(c.s("word").prefix(1)), "n": c.s("word").count])).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
                if model.hints > 0 { Text(verbatim: model.typedLetters).studyText(LKType.headlineMd, LKColor.secondary).englishText() }
            }
            .frame(maxWidth: .infinity, minHeight: 200)
            .padding(LKSpacing.spaceLg)
            .tactile(fill: LKColor.surfaceContainer, radius: 28)
            if model.checked == nil {
                TextField(t(.revTypeYourAnswer), text: Binding(get: { model.typed }, set: { model.typed = $0 }))
                    .focused($focused)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .submitLabel(.done)
                    .onSubmit { model.checkTyped() }
                    .studyText(LKType.bodyLg).englishText()
                    .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 52)
                    .tactile(fill: LKColor.surfaceContainerHigh, line: LKColor.outlineVariant, ledge: LKColor.outlineVariant, radius: 16)
                Button(t(.lessonCheckAnswer)) { model.checkTyped() }.buttonStyle(PrimaryButtonStyle()).disabled(model.typed.trimmingCharacters(in: .whitespaces).isEmpty)
                HStack(spacing: LKSpacing.spaceXs) {
                    Button(t(.revLetterHint)) { model.hint() }.buttonStyle(StudyOutlineButtonStyle())
                    Button(t(.revIDonTKnowShow)) { model.giveUp() }.buttonStyle(StudyOutlineButtonStyle())
                }
            }
        }
    }
}

// MARK: - audio mode
private struct ReviewAudioFront: View {
    let model: StudyReviewModel, c: JSON
    @Environment(\.l10n) private var t
    var body: some View {
        VStack(spacing: LKSpacing.spaceMd) {
            VStack(spacing: LKSpacing.spaceSm) {
                Button { model.replay() } label: {
                    Image(systemName: "speaker.wave.3.fill").font(.system(size: 44, weight: .bold))
                        .frame(width: 96, height: 96).contentShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(t(.lessonReplay))
                HStack(spacing: LKSpacing.spaceXs) {
                    Button(t(.revHearTheWord)) { model.replay() }.buttonStyle(StudyOutlineButtonStyle())
                    Button(t(.lessonSlowShort)) { model.speak(slow: true) }.buttonStyle(StudyOutlineButtonStyle())
                }
            }
            .frame(maxWidth: .infinity, minHeight: 180)
            .padding(LKSpacing.spaceLg)
            .tactile(fill: LKColor.surfaceContainer, radius: 28)
            if let o = model.options {
                VStack(spacing: LKSpacing.spaceSm) {
                    ForEach(Array(o.all.enumerated()), id: \.offset) { i, text in
                        LessonOption(letter: String(UnicodeScalar(UInt8(65 + i))), text: text, state: state(i, o)) { model.pick(i) }
                    }
                }
            }
        }
    }
    private func state(_ i: Int, _ o: StudyModes.Options) -> LessonOption.State {
        guard model.picked != nil else { return .idle }
        if i == o.right { return .correct }
        return i == model.picked ? .wrong : .dim
    }
}

// MARK: - back of the card
private struct ReviewBack: View {
    let model: StudyReviewModel, c: JSON
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.openURL) private var openURL
    @State private var showSentence = false

    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            if let ch = model.checked { resultBanner(ch) }
            LKCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    head
                    if c.t("image") { StudyThumb(emoji: c.s("emoji"), image: c.s("image"), size: 120) }
                    if c.t("def") && c.s("def") != Vocab.meanOf(c) { section(.revDefinition) { Text(verbatim: c.s("def")).studyText(LKType.bodyMd).englishText() } }
                    if c.t("ex") {
                        section(.revExample) {
                            HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                                Text(StudyHighlight.attributed(c.s("ex"), word: c.s("word"), color: LKColor.secondary.resolve(scheme))).studyText(LKType.bodyMd).englishText()
                                Spacer(minLength: 0)
                                StudySpeak(label: t(.revPlaySentence)) { model.speakSentence(c.s("ex")) }
                            }
                        }
                    }
                    if !c.list("contexts").isEmpty { contexts }
                    if !c.list("sentences").isEmpty { sentences }
                    chips(.revGoesWith, c.strs("col"), "link")
                    chips(.revSynonyms, c.strs("syn"), "equal")
                    if c.t("note") { Label { Text(verbatim: c.s("note")).studyText(LKType.bodyMd) } icon: { Image(systemName: "lightbulb.fill").foregroundStyle(LKColor.tertiary.resolve(scheme)) } }
                    if let p = model.retentionPercent {
                        Text(StudyText.rich(t(.revRecallChanceBeforeThis, ["pct": p, "n": model.lapses]))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    }
                }
            }
            DeepNotesView(word: c.s("word"))
            if model.lapses >= 3 { leech }
            ownSentence
        }
    }

    private func resultBanner(_ ch: StudyReviewModel.Check) -> some View {
        HStack(spacing: LKSpacing.spaceSm) {
            Image(systemName: ch.ok ? "checkmark.circle.fill" : "xmark.circle.fill").font(.system(size: 24)).foregroundStyle((ch.ok ? LKColor.success : LKColor.error).resolve(scheme))
            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: ch.ok ? t(.revWellDone) : t(.revNotQuiteAnswer, ["answer": ch.answer])).studyText(LKType.headlineSm, ch.ok ? LKColor.success : LKColor.error)
            }
            Spacer(minLength: 0)
        }
        .padding(LKSpacing.spaceMd)
        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill((ch.ok ? LKColor.surfaceContainerHigh : LKColor.errorContainer).resolve(scheme)))
        .accessibilityElement(children: .combine)
    }

    private var head: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            HStack(spacing: LKSpacing.spaceXs) {
                Text(verbatim: c.s("word")).studyText(LKType.headlineLg).englishText()
                StudySpeak(label: t(.vocabPronounce)) { model.speak() }
                StudySpeak(label: t(.lessonSlowShort), slow: true) { model.speak(slow: true) }
            }
            HStack(spacing: LKSpacing.spaceXs) {
                if c.t("pos") { StudyChip(text: c.s("pos")) }
                if c.t("level") { StudyChip(text: c.s("level"), tint: LKColor.tertiary) }
            }
            if c.t("ipa") || c.t("ipaUS") {
                HStack(spacing: LKSpacing.spaceSm) {
                    if c.t("ipa") { ipa("UK", c.s("ipa")) }
                    if c.t("ipaUS"), c.s("ipaUS") != c.s("ipa") { ipa("US", c.s("ipaUS")) }
                }
            }
            Text(verbatim: Vocab.meanOf(c)).studyText(LKType.headlineSm, LKColor.secondary)
        }
    }
    private func ipa(_ region: String, _ text: String) -> some View {
        HStack(spacing: 4) {
            Text(verbatim: region).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            Text(verbatim: text).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).englishText()
        }
    }
    private func section<V: View>(_ title: L10nKey, @ViewBuilder _ body: () -> V) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: t(title)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
            body()
        }
    }
    private var contexts: some View {
        section(.revYourContexts) {
            ForEach(Array(c.list("contexts").prefix(2).enumerated()), id: \.offset) { _, x in
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                        Text(StudyHighlight.attributed("“" + x.s("text") + "”", word: c.s("word"), color: LKColor.secondary.resolve(scheme))).studyText(LKType.bodyMd).englishText()
                        Spacer(minLength: 0)
                        StudySpeak(label: t(.revPlaySentence)) { model.speakSentence(x.s("text")) }
                    }
                    if let url = Self.videoURL(x.s("source")) {
                        Button { openURL(url) } label: {
                            Label { Text(verbatim: t(.revReplayTheOriginalClip)).lkTextSafe(LKType.bodySm) } icon: { Image(systemName: "play.rectangle.fill") }
                                .frame(minHeight: LKFrame.shared.minTap)
                        }
                        .foregroundStyle(LKColor.secondary.resolve(scheme))
                    }
                }
            }
        }
    }
    static func videoURL(_ s: String) -> URL? {
        guard s.range(of: "youtube\\.com|youtu\\.be|netflix|vimeo|ted\\.com", options: .regularExpression) != nil, s.hasPrefix("http") else { return nil }
        return URL(string: s)
    }
    private var sentences: some View {
        section(.revBilingualSentences) {
            ForEach(Array(c.list("sentences").enumerated()), id: \.offset) { _, x in
                VStack(alignment: .leading, spacing: 2) {
                    Text(StudyHighlight.attributed(x.s("en"), word: c.s("word"), color: LKColor.secondary.resolve(scheme))).studyText(LKType.bodyMd).englishText()
                    if x.t("vi") { Text(verbatim: x.s("vi")).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
                }
            }
        }
    }
    @ViewBuilder private func chips(_ title: L10nKey, _ items: [String], _ icon: String) -> some View {
        if !items.isEmpty {
            section(title) {
                FlowLayout { ForEach(items.prefix(6), id: \.self) { StudyChip(text: $0, icon: icon, tint: LKColor.onSurfaceVariant).englishText() } }
            }
        }
    }

    // MARK: hard word box
    private var leech: some View {
        @Bindable var m = model
        return LKCard(fill: LKColor.surfaceContainerLow) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Label { Text(verbatim: t(.revHardWordForgottenTimes, ["n": model.lapses])).studyText(LKType.titlePill) } icon: { Image(systemName: "ant.fill").foregroundStyle(LKColor.error.resolve(scheme)) }
                Text(verbatim: t(.revRelearnItDifferentlyInstead)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                if model.memoryAid != nil {
                    Button { Task { await model.makeTip() } } label: { Text(verbatim: model.aiBusy ? t(.revAiIsThinkingOf) : t(.revCreateAMemoryAid)) }
                        .buttonStyle(StudyOutlineButtonStyle()).disabled(model.aiBusy)
                    if let tip = model.aiTip { Text(verbatim: tip).studyText(LKType.bodyMd) }
                }
                Button(t(.revRepeatAloud3Times)) { model.shadow3() }.buttonStyle(StudyOutlineButtonStyle())
                TextField(t(.revYourOwnMemoryAid), text: $m.noteDraft, axis: .vertical)
                    .lineLimit(1...3)
                    .onSubmit { model.saveNote() }
                    .studyText(LKType.bodyMd)
                    .padding(LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap)
                    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
                HStack {
                    Button(t(.vocabSave)) { model.saveNote() }.buttonStyle(StudyOutlineButtonStyle())
                    if model.noteSaved { Text(verbatim: t(.revMemoryAidSaved)).studyText(LKType.bodySm, LKColor.success) }
                }
            }
        }
    }

    private var ownSentence: some View {
        @Bindable var m = model
        return LKCard {
            DisclosureGroup(isExpanded: $showSentence) {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    TextField(t(.revWriteASentenceAbout), text: $m.sentence, axis: .vertical)
                        .lineLimit(2...5)
                        .studyText(LKType.bodyMd).englishText()
                        .padding(LKSpacing.spaceSm).frame(minHeight: 64, alignment: .topLeading)
                        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
                    if model.sentenceState == .needsWord { Text(verbatim: t(.revYourSentenceNeedsTo, ["word": c.s("word")])).studyText(LKType.bodySm, LKColor.error) }
                    if model.sentenceState == .saved {
                        Label { Text(verbatim: t(.revSaved)).studyText(LKType.bodyMd, LKColor.success) } icon: { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)) }
                    } else {
                        Button(t(.revSaveMySentence)) { model.saveSentence() }.buttonStyle(StudyOutlineButtonStyle())
                    }
                }
                .padding(.top, LKSpacing.spaceXs)
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: t(.revWriteYourOwnSentence, ["word": c.s("word")])).studyText(LKType.titlePill)
                    Text(verbatim: t(.revN5XpHelpsIt)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                }
                .frame(minHeight: LKFrame.shared.minTap)
            }
            .tint(LKColor.secondary.resolve(scheme))
        }
    }
}

// MARK: - summary
struct ReviewSummaryView: View {
    let model: StudyReviewModel
    let allDone: Bool
    var onClose: () -> Void
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let s = model.summary ?? ReviewSummary()
        ScrollView {
            VStack(spacing: LKSpacing.spaceMd) {
                Image(systemName: s.mood == "win" ? "trophy.fill" : s.mood == "happy" ? "hand.thumbsup.fill" : "flame.fill")
                    .font(.system(size: 56, weight: .bold)).foregroundStyle(LKColor.tertiary.resolve(scheme)).accessibilityHidden(true)
                Text(verbatim: allDone ? t(.revYouReAllCaught) : t(.revReviewsDone, ["n": s.done])).studyText(LKType.headlineLg).multilineTextAlignment(.center)
                if !allDone {
                    Text(verbatim: t(.revReviewSessionResults)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
                    stats(s)
                    if s.hitGoal { StudyChip(text: t(.revDailyGoalReached), icon: "target", tint: LKColor.success) }
                    mix(s)
                    missed(s)
                }
                forecast(s)
                nextDue(s)
                actions(s)
            }
            .padding(.horizontal, LKFrame.shared.gutter)
            .padding(.vertical, LKSpacing.spaceMd)
            .frame(maxWidth: LKFrame.shared.width)
            .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
    }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(spacing: 2) {
            Text(verbatim: value).studyText(LKType.headlineMd)
            Text(verbatim: label).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).multilineTextAlignment(.center).lineLimit(2)
        }
        .frame(maxWidth: .infinity, minHeight: 72)
        .padding(.vertical, LKSpacing.spaceXs)
        .tactile(fill: LKColor.surfaceContainer, radius: 16)
        .accessibilityElement(children: .combine)
    }
    private func stats(_ s: ReviewSummary) -> some View {
        HStack(spacing: LKSpacing.spaceXs) {
            stat("+" + Fmt.int(s.xp, t.lang), t(.todayXp))
            stat(StudyFmt.percent(s.accuracy, lang: t.lang), t(.revRecalled))
            stat(Fmt.int(s.streak, t.lang), t(.revDayStreak))
            stat(Fmt.int(s.minutes, t.lang), t(.revMin, ["m": ""]).trimmingCharacters(in: .whitespaces))
        }
    }
    private func mix(_ s: ReviewSummary) -> some View {
        let total = max(1, s.gradeMix.reduce(0, +))
        let cols: [LKDynamicColor] = [LKColor.error, LKColor.tertiary, LKColor.secondary, LKColor.success]
        let keys: [L10nKey] = [.revAgain, .revHard, .revGood, .revEasy]
        return LKCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(verbatim: t(.revHowWellYouRemembered)).studyText(LKType.titlePill)
                GeometryReader { geo in
                    HStack(spacing: 2) {
                        ForEach(0..<4, id: \.self) { i in
                            if s.gradeMix[i] > 0 { Rectangle().fill(cols[i].resolve(scheme)).frame(width: max(6, geo.size.width * CGFloat(s.gradeMix[i]) / CGFloat(total))) }
                        }
                    }
                    .clipShape(Capsule())
                }
                .frame(height: 12)
                HStack {
                    ForEach(0..<4, id: \.self) { i in
                        HStack(spacing: 4) {
                            Circle().fill(cols[i].resolve(scheme)).frame(width: 8, height: 8)
                            Text(verbatim: t(keys[i]) + " " + Fmt.int(s.gradeMix[i], t.lang)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).lineLimit(2)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
        }
        .accessibilityElement(children: .combine)
    }
    @ViewBuilder private func missed(_ s: ReviewSummary) -> some View {
        if let w = s.hardest {
            LKCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    Text(verbatim: t(.revWordToWatchMost)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
                    HStack {
                        Text(verbatim: w).studyText(LKType.headlineMd).englishText()
                        StudySpeak(label: t(.revListenToPronunciation)) { model.core.speak(w, settings: model.settings) }
                        Spacer(minLength: 0)
                    }
                    if !s.others.isEmpty {
                        Text(verbatim: t(.revOtherMissedWords)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                        FlowLayout { ForEach(Array(s.others.prefix(10)), id: \.self) { o in
                            Button { onRoute(AppRoute("dict", arg: o)) } label: { StudyChip(text: o, tint: LKColor.onSurface).englishText().frame(minHeight: LKFrame.shared.minTap) }.buttonStyle(.plain)
                        } }
                    }
                }
            }
        } else {
            LKCard {
                VStack(alignment: .leading, spacing: 4) {
                    Label { Text(verbatim: t(.revFlawlessReview)).studyText(LKType.titlePill) } icon: { Image(systemName: "star.fill").foregroundStyle(LKColor.star.resolve(scheme)) }
                    Text(verbatim: t(.revYouDidnTForget)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                }
            }
        }
    }
    @ViewBuilder private func forecast(_ s: ReviewSummary) -> some View {
        if s.forecast.contains(where: { $0 > 0 }) {
            let top = max(1, s.forecast.max() ?? 1)
            let end = model.core.clock.endOfToday(model.core.now())
            LKCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    Text(verbatim: t(.revCardsDueInThe)).studyText(LKType.titlePill)
                    HStack(alignment: .bottom, spacing: 6) {
                        ForEach(0..<7, id: \.self) { i in
                            VStack(spacing: 4) {
                                Text(verbatim: Fmt.int(s.forecast[i], t.lang)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
                                RoundedRectangle(cornerRadius: 6, style: .continuous).fill(LKColor.secondary.resolve(scheme)).frame(height: max(4, 56 * CGFloat(s.forecast[i]) / CGFloat(top)))
                                Text(verbatim: i == 0 ? t(.revTmrw) : StudyFmt.weekday(end + Int64(i + 1) * VocabClock.day - VocabClock.day / 2, lang: t.lang)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).lineLimit(1).minimumScaleFactor(0.6)
                            }
                            .frame(maxWidth: .infinity)
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
            }
        }
    }
    @ViewBuilder private func nextDue(_ s: ReviewSummary) -> some View {
        VStack(spacing: LKSpacing.spaceXs) {
            if let d = s.nextDue { Text(StudyText.rich(t(.revNextCardDue, ["date": StudyFmt.date(d, lang: t.lang)]))).studyText(LKType.bodyMd).multilineTextAlignment(.center) }
            Text(verbatim: t(.revStudyingALittleEvery)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
        }
        if s.soon > 0 {
            LKCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    Text(verbatim: t(.revExamComingUpOr, ["n": s.soon])).studyText(LKType.bodyMd)
                    Button(t(.revReviewAhead)) { Task { await model.reviewAhead() } }.buttonStyle(StudyOutlineButtonStyle())
                }
            }
        }
    }
    private func actions(_ s: ReviewSummary) -> some View {
        VStack(spacing: LKSpacing.spaceSm) {
            Button(t(.revKeepLearning)) { onRoute(AppRoute("practice", arg: "learn", query: ["src": "deck"])) }.buttonStyle(PrimaryButtonStyle())
            HStack(spacing: LKSpacing.spaceXs) {
                Button(t(.revSmartStudy)) { onRoute(AppRoute("practice", query: ["src": "deck"])) }.buttonStyle(StudyOutlineButtonStyle())
                Button(t(.revMatch)) { onRoute(AppRoute("practice", arg: "match", query: ["src": "deck"])) }.buttonStyle(StudyOutlineButtonStyle())
            }
            if s.canBrag {
                ShareLink(item: t(.revReviewsDone, ["n": s.done]) + " " + StudyFmt.percent(s.accuracy, lang: t.lang) + " +" + Fmt.int(s.xp, t.lang) + " " + t(.todayXp)) {
                    Label { Text(verbatim: t(.revShareYourProgress)) } icon: { Image(systemName: "square.and.arrow.up") }
                        .lkTextSafe(LKType.titlePill).frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap)
                }
                .foregroundStyle(LKColor.secondary.resolve(scheme))
            }
        }
    }
}
