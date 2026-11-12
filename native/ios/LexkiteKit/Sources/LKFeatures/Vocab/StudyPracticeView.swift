import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync
import LKCore

/// #/practice – focus screen. Hub (source + mode tiles) → a run (learn · quiz · match · speak) → its result.
struct StudyPracticeView: View {
    @State var model: StudyPracticeModel
    var mode: String?
    var query: [String: String]
    var onClose: () -> Void
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var confirmExit = false

    init(model: StudyPracticeModel, mode: String? = nil, query: [String: String] = [:], onClose: @escaping () -> Void = {}, onRoute: @escaping (AppRoute) -> Void = { _ in }) {
        _model = State(initialValue: model); self.mode = mode; self.query = query; self.onClose = onClose; self.onRoute = onRoute
    }

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: model.progress), title: "", onExit: leave)
            content
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task {
            guard model.phase == .loading else { return }
            model.translate = model.core.translator(t)
            model.singleWord = query["w"]
            await model.load(mode: mode, src: query["src"])
        }
        .alert(t(.revQuitNow), isPresented: $confirmExit) {
            Button(t(.revKeepGoing), role: .cancel) {}
            Button(t(.lessonExitGo), role: .destructive) { model.stopListening(); onClose() }
        } message: { Text(verbatim: t(.revYourAnswersInThisRound)) }
        .lkHaptic(.correct, trigger: model.tick)
        .lkHaptic(.wrong, trigger: model.wrongTick)
        .lkHaptic(.complete, trigger: model.doneTick)
        .accessibilityIdentifier("focus-practice")
    }

    private var inRun: Bool { [.question, .intro, .match, .speak].contains(model.phase) && model.progress > 0 }
    private func leave() { if inRun { confirmExit = true } else { model.stopListening(); onClose() } }

    @ViewBuilder private var content: some View {
        switch model.phase {
        case .loading: Spacer(); ProgressView(); Spacer()
        case .hub: PracticeHub(model: model)
        case .empty:
            Spacer()
            StudyEmpty(icon: "tray", title: t(.revNoFlashcardsYet), message: t(.revAddWordsFromThe),
                       action: (t(.revGamesPractice), { model.backToHub() }), secondary: (t(.revOpenLibrary), { onRoute(AppRoute("library")) }))
            Spacer()
        case .intro: PracticeIntro(model: model)
        case .question: if model.offeringHard { PracticeHardOffer(model: model) } else { PracticeQuestionView(model: model) }
        case .quizDone: PracticeQuizDone(model: model, onRoute: onRoute)
        case .learnDone: PracticeLearnDone(model: model, onRoute: onRoute)
        case .match: PracticeMatch(model: model)
        case .matchDone: PracticeMatchDone(model: model)
        case .speak: PracticeSpeak(model: model)
        case .speakDone: PracticeSpeakDone(model: model)
        }
    }
}

/// Column scaffold of the run screens.
struct PracticeColumn<Content: View>: View {
    let content: Content
    init(@ViewBuilder _ content: () -> Content) { self.content = content() }
    var body: some View {
        ScrollView {
            VStack(spacing: LKSpacing.spaceMd) { content }
                .padding(.horizontal, LKFrame.shared.gutter)
                .padding(.vertical, LKSpacing.spaceMd)
                .frame(maxWidth: LKFrame.shared.width)
                .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
        .scrollDismissesKeyboard(.interactively)
    }
}

// MARK: - hub
private struct PracticeHub: View {
    let model: StudyPracticeModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    static let modes: [(String, String, L10nKey)] = [
        ("learn", "brain.head.profile", .revSmartStudy), ("mcq", "checklist", .revMultipleChoice), ("cloze", "text.insert", .revFillInTheBlank),
        ("listen", "headphones", .revListenType), ("test", "doc.text.fill", .revTest), ("match", "square.grid.2x2.fill", .revMatch), ("speak", "mic.fill", .revPronunciation),
    ]
    var body: some View {
        PracticeColumn {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(verbatim: t(.revGamesPractice)).studyText(LKType.headlineLg).accessibilityAddTraits(.isHeader)
                Text(verbatim: t(.revPickAWordSource)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            sourcePicker
            LazyVGrid(columns: [GridItem(.flexible(), spacing: LKSpacing.spaceSm), GridItem(.flexible(), spacing: LKSpacing.spaceSm)], spacing: LKSpacing.spaceSm) {
                ForEach(Self.modes, id: \.0) { m, icon, key in
                    Button { model.start(m) } label: {
                        VStack(spacing: LKSpacing.spaceXs) {
                            Image(systemName: icon).font(.system(size: 28, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme))
                            Text(verbatim: t(key)).studyText(LKType.titlePill).multilineTextAlignment(.center).lineLimit(3)
                        }
                        .frame(maxWidth: .infinity, minHeight: 104)
                        .padding(LKSpacing.spaceSm)
                        .tactile(fill: LKColor.surfaceContainer, radius: 20)
                    }
                    .buttonStyle(LKPressStyle())
                    .accessibilityLabel(t(key))
                }
            }
        }
    }

    private var sourcePicker: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: t(.revWordSource)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
            Menu {
                ForEach(model.sourceValues(), id: \.self) { v in
                    Button { model.changeSource(v) } label: { if v == model.src { Label(label(v), systemImage: "checkmark") } else { Text(verbatim: label(v)) } }
                }
            } label: {
                HStack {
                    Text(verbatim: label(model.src)).studyText(LKType.bodyLg).lineLimit(2).multilineTextAlignment(.leading)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.up.chevron.down").foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                }
                .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 52)
                .tactile(fill: LKColor.surfaceContainerHigh, radius: 16)
            }
            .accessibilityLabel(t(.revWordSource))
            .accessibilityValue(Text(verbatim: label(model.src)))
        }
    }

    /// menu text of a source (web `sourceList`)
    func label(_ v: String) -> String {
        switch v {
        case "deck": return t(.revMyWordList, ["n": Fmt.int(model.count("deck"), t.lang)])
        case "due": return t(.revCardsDueToday) + " (" + Fmt.int(model.count("due"), t.lang) + ")"
        case "forgetting": return t(.revWordsYouReForgettingRecall) + " (" + Fmt.int(model.count("forgetting"), t.lang) + ")"
        case "phrases": return t(.revMyPhrasesStructures)
        case "weak": return t(.revFrequentlyForgottenWords)
        default:
            if v.hasPrefix("level:") { return t(.revMemoryLevel, ["n": String(v.dropFirst(6))]) }
            if v.hasPrefix("origin:") { return StudySourceName.origin(String(v.dropFirst(7)), t) }
            if v.hasPrefix("topic:") { return model.topicName(String(v.dropFirst(6))) }
            return v
        }
    }
}

enum StudySourceName {
    static func origin(_ k: String, _ t: L10n) -> String {
        switch k {
        case "youtube": return t(.revFromYoutubeVideos)
        case "web": return t(.revFromWebsites)
        case "reading": return t(.revFromReadings)
        case "dict": return t(.revFromDictionaryLookups)
        case "anki": return t(.revFromAnki)
        case "doc": return t(.revFromADocument)
        default: return t(.revFromTheLibrary)
        }
    }
    /// one-line explanation under an origin name
    static func hint(_ k: String, _ t: L10n) -> String {
        switch k {
        case "youtube": return t(.revSavedWhileWatchingSubtitledVideos)
        case "web": return t(.revSavedWithTheAddOn)
        case "reading": return t(.revSavedWhileReadingInLexkite)
        case "dict": return t(.revWordsYouLookedUpAnd)
        case "anki": return t(.revImportedFromYourAnkiDecks)
        case "doc": return t(.revImportedFromTextPdfEpubSubtitles)
        default: return t(.revAddedFromIeltsWordSets)
        }
    }
}

// MARK: - one question
private struct PracticeQuestionView: View {
    let model: StudyPracticeModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @FocusState private var focused: Bool

    var body: some View {
        ZStack(alignment: .bottom) {
            PracticeColumn {
                header
                if let q = model.question {
                    promptCard(q)
                    if q.isMultipleChoice { options(q) } else { typedInput(q) }
                }
                Color.clear.frame(height: model.feedback == nil ? 0 : 300)   // room for the feedback sheet
            }
            if let fb = model.feedback, let q = model.question { PracticeFeedback(model: model, q: q, fb: fb) }
        }
    }

    private var header: some View {
        HStack {
            Text(verbatim: model.mode == "learn" ? Fmt.int(model.learn?.wordsDone ?? 0, t.lang) + "/" + Fmt.int(model.learn?.items.count ?? 0, t.lang) : model.position).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
            Spacer()
            if model.mode != "learn" {
                Label { Text(verbatim: Fmt.int(model.score, t.lang)).studyText(LKType.labelMetric) } icon: { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)) }
                    .accessibilityElement(children: .combine)
            }
        }
    }

    @ViewBuilder private func promptCard(_ q: PracticeQuestion) -> some View {
        VStack(spacing: LKSpacing.spaceSm) {
            if q.hard { StudyChip(text: t(.revToughItemXp, ["n": Fmt.int(PracticeRun.xpCorrectHard, t.lang)]), icon: "bolt.fill", tint: LKColor.tertiary) }
            switch q.kind {
            case .mcqVi:
                if q.word.t("image") || q.word.t("emoji") { StudyThumb(emoji: q.word.s("emoji"), image: q.word.s("image"), size: 96) }
                HStack(spacing: LKSpacing.spaceXs) {
                    Text(verbatim: q.w).studyText(LKType.displayHeroMobile).englishText()
                    StudySpeak(label: t(.vocabPronounce)) { model.speakWord() }
                }
                if q.word.t("ipa") { Text(verbatim: q.word.s("ipa")).studyText(LKType.bodyLg, LKColor.onSurfaceVariant).englishText() }
                if q.word.t("pos") { StudyChip(text: q.word.s("pos")) }
                Text(verbatim: t(.revChooseTheCorrectMeaning)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            case .mcqEn:
                Text(verbatim: q.mean).studyText(LKType.headlineLg).multilineTextAlignment(.center)
                if q.word.t("pos") { StudyChip(text: q.word.s("pos")) }
                if q.word.t("ex"), let b = PracticeRun.cloze(q.word.s("ex"), q.w) { Text(verbatim: "“" + b + "”").studyText(LKType.bodyLg, LKColor.onSurfaceVariant).multilineTextAlignment(.center).englishText() }
                Text(verbatim: t(.revChooseTheCorrectEnglishWord)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            case .typeListen:
                Image(systemName: "headphones").font(.system(size: 44, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                HStack(spacing: LKSpacing.spaceXs) {
                    Button(t(.lessonReplay)) { model.speakWord() }.buttonStyle(StudyOutlineButtonStyle())
                    Button(t(.lessonSlowShort)) { model.speakWord(slow: true) }.buttonStyle(StudyOutlineButtonStyle())
                }
                Text(verbatim: t(.revTypeTheWordYouHear)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                if q.word.t("vi") && !q.hard { Text(verbatim: q.mean).studyText(LKType.bodyMd, LKColor.onSurfaceVariant) }
            case .typeCloze:
                if let b = q.blanked {
                    Text(verbatim: t(.revFillInTheBlank2)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    Text(verbatim: "“" + b + "”").studyText(LKType.headlineSm).multilineTextAlignment(.center).englishText()
                    Text(verbatim: q.mean).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
                    if q.word.t("pos") { StudyChip(text: q.word.s("pos")) }
                    if !q.hard { Text(verbatim: t(.revHintStartsWithLetters, ["a": String(q.answer.prefix(1)), "n": q.answer.count])).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
                } else { meaningPrompt(q) }
            case .typeSpell:
                Text(verbatim: q.mean).studyText(LKType.headlineLg).multilineTextAlignment(.center)
                if q.word.t("pos") { StudyChip(text: q.word.s("pos")) }
                spell(q)
            case .typeVi:
                meaningPrompt(q)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 200)
        .padding(LKSpacing.spaceLg)
        .tactile(fill: LKColor.surfaceContainer, radius: 28)
        .accessibilityElement(children: .contain)
    }

    @ViewBuilder private func meaningPrompt(_ q: PracticeQuestion) -> some View {
        Text(verbatim: q.mean).studyText(LKType.headlineLg).multilineTextAlignment(.center)
        if q.word.t("pos") { StudyChip(text: q.word.s("pos")) }
        Text(verbatim: t(.revTypeTheEnglishWordThen)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
        if !q.hard { Text(verbatim: t(.revHintStartsWithLetters, ["a": String(q.w.prefix(1)), "n": q.w.count])).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
    }

    private func spell(_ q: PracticeQuestion) -> some View {
        FlowLayout(spacing: 4) {
            ForEach(Array(PracticeRun.spellMask(q.w).enumerated()), id: \.offset) { _, s in
                if s.isSpace { Color.clear.frame(width: 12, height: 28) } else if s.isLetter {
                    Text(verbatim: s.shown ? s.ch : " ").studyText(LKType.headlineSm).englishText()
                        .frame(width: 24, height: 32)
                        .overlay(alignment: .bottom) { Rectangle().fill(LKColor.outline.resolve(scheme)).frame(height: 2) }
                } else { Text(verbatim: s.ch).studyText(LKType.headlineSm) }
            }
        }
        .environment(\.layoutDirection, .leftToRight)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: String(q.w.count)))
    }

    private func options(_ q: PracticeQuestion) -> some View {
        VStack(spacing: LKSpacing.spaceSm) {
            ForEach(Array(q.options.enumerated()), id: \.offset) { i, o in
                LessonOption(letter: String(UnicodeScalar(UInt8(65 + i))), text: o, state: state(o, q)) { model.choose(o) }
            }
        }
    }
    private func state(_ o: String, _ q: PracticeQuestion) -> LessonOption.State {
        guard model.feedback != nil else { return .idle }
        if o == q.answer { return .correct }
        return o == model.picked ? .wrong : .dim
    }

    @ViewBuilder private func typedInput(_ q: PracticeQuestion) -> some View {
        if model.feedback == nil {
            VStack(spacing: LKSpacing.spaceSm) {
                TextField(t(.revTypeYourAnswer), text: Binding(get: { model.typed }, set: { model.typed = $0 }))
                    .focused($focused)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .submitLabel(.done)
                    .onSubmit { model.submitTyped() }
                    .studyText(LKType.bodyLg).englishText()
                    .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 52)
                    .tactile(fill: LKColor.surfaceContainerHigh, line: model.nearMiss ? LKColor.tertiary : LKColor.outlineVariant, ledge: LKColor.outlineVariant, radius: 16)
                if model.nearMiss { Text(verbatim: t(.revAlmostCheckYourSpelling)).studyText(LKType.bodySm, LKColor.tertiary) }
                Button(t(.lessonCheckAnswer)) { model.submitTyped() }.buttonStyle(PrimaryButtonStyle()).disabled(model.typed.trimmingCharacters(in: .whitespaces).isEmpty)
                HStack(spacing: LKSpacing.spaceXs) {
                    Button(t(.revIDonTKnowShow)) { model.giveUp() }.buttonStyle(StudyOutlineButtonStyle())
                    if q.kind == .typeListen { Button(t(.lessonNoListen)) { model.switchToMeaning() }.buttonStyle(StudyOutlineButtonStyle()) }
                }
            }
        }
    }
}

// MARK: - feedback sheet
private struct PracticeFeedback: View {
    let model: StudyPracticeModel
    let q: PracticeQuestion
    let fb: StudyPracticeModel.Feedback
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let tint = fb.ok ? LKColor.success : LKColor.error
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack(spacing: LKSpacing.spaceXs) {
                Image(systemName: fb.ok ? "checkmark.circle.fill" : "xmark.circle.fill").font(.system(size: 26)).foregroundStyle(tint.resolve(scheme))
                Text(verbatim: fb.ok ? t(.revWellDone) : t(.revNotQuiteAnswer, ["answer": fb.answer])).studyText(LKType.headlineSm, tint)
                Spacer(minLength: 0)
            }
            if fb.marks.contains(where: \.fix) {
                FlowLayout(spacing: 6) {
                    ForEach(Array(fb.marks.enumerated()), id: \.offset) { _, m in
                        Text(verbatim: m.w).studyText(LKType.bodyLg, m.fix ? LKColor.tertiary : LKColor.onSurface).underline(m.fix).englishText()
                    }
                }
            }
            HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                StudySpeak(label: t(.vocabPronounce)) { model.speakWord() }
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(verbatim: q.w).studyText(LKType.titlePill).englishText()
                        if q.word.t("pos") { Text(verbatim: "(" + q.word.s("pos") + ")").studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                    }
                    if q.word.t("ipa") { Text(verbatim: q.word.s("ipa")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                    Text(verbatim: q.mean).studyText(LKType.bodyMd)
                }
                Spacer(minLength: 0)
            }
            if q.word.t("ex") {
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                    Text(StudyHighlight.attributed(q.word.s("ex"), word: q.w, color: LKColor.secondary.resolve(scheme))).studyText(LKType.bodyMd).englishText()
                    Spacer(minLength: 0)
                    StudySpeak(label: t(.revPlaySentence)) { model.speakText(q.word.s("ex")) }
                }
            }
            Button(t(.actionContinue)) { model.next() }.buttonStyle(PrimaryButtonStyle())
        }
        .padding(LKSpacing.spaceMd)
        .frame(maxWidth: LKFrame.shared.width)
        .background(alignment: .bottom) {
            UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28).fill((fb.ok ? LKColor.surfaceContainerHigh : LKColor.errorContainer).resolve(scheme))
                .overlay(alignment: .top) { UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28).strokeBorder(tint.resolve(scheme), lineWidth: 2) }
                .ignoresSafeArea(edges: .bottom)
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .contain)
    }
}

// MARK: - hard-mode offer
private struct PracticeHardOffer: View {
    let model: StudyPracticeModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        PracticeColumn {
            Spacer(minLength: 0)
            Image(systemName: "bolt.heart.fill").font(.system(size: 56, weight: .bold)).foregroundStyle(LKColor.tertiary.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: t(.revThisLooksTooEasyFor)).studyText(LKType.headlineSm).multilineTextAlignment(.center)
            Text(verbatim: t(.revToughItemXp, ["n": Fmt.int(PracticeRun.xpCorrectHard, t.lang)])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            Button(t(.revGoHarder)) { model.answerHardOffer(true) }.buttonStyle(PrimaryButtonStyle())
            Button(t(.revKeepThisLevel)) { model.answerHardOffer(false) }.buttonStyle(StudyOutlineButtonStyle())
            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .contain)
        .accessibilityIdentifier("practice-hard-offer")
    }
}
