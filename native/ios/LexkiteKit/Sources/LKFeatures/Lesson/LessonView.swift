import SwiftUI
import LKDesign
import LKStrings
import LKCore

/// P03 – the lesson player, shown full screen for the route `lesson/go` (query `story` = a story / radio id).
/// Layout: top bar (Close ≥ 44, segmented progress, question number) · question (teacher, prompt card, exercise) · footer (hint, "can't listen/speak", Check)
/// or the feedback sheet · completion screen. Everything the learner reads comes from generated L10n IDs.
public struct LessonView: View {
    let route: AppRoute
    let onClose: () -> Void
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var model: LessonModel?
    @State private var confirmExit = false
    @State private var round = 0

    public init(route: AppRoute, onClose: @escaping () -> Void) { self.route = route; self.onClose = onClose }
    /// Snapshots / previews: a model that is already running.
    init(model: LessonModel, route: AppRoute = AppRoute("lesson", arg: "go"), onClose: @escaping () -> Void = {}) {
        self.route = route; self.onClose = onClose; _model = State(initialValue: model)
    }

    public var body: some View {
        Group {
            if let m = model { screen(m) } else { ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity) }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task(id: round) { await load() }
        .onChange(of: reduceMotion) { _, r in model?.teacher.setReduceMotion(r); model?.teacher2?.setReduceMotion(r) }
        .onDisappear { model?.stopAudio() }
        .alert(t(.lessonExitAsk), isPresented: $confirmExit) {
            Button(t(.lessonExitStay), role: .cancel) {}
            Button(t(.lessonExitGo), role: .destructive) { close() }
        } message: { Text(t(.lessonExitLose)) }
        .accessibilityIdentifier("focus-lesson")
    }

    @ViewBuilder private func screen(_ m: LessonModel) -> some View {
        VStack(spacing: 0) {
            topBar(m)
            switch m.phase {
            case .loading: ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
            case .empty:
                VStack(spacing: LKSpacing.spaceMd) {
                    Text(t(.lessonSoon)).lkText(LKType.bodyLg).multilineTextAlignment(.center).foregroundStyle(LKColor.onSurface.resolve(scheme))
                    Button(t(.lessonHome)) { close() }.buttonStyle(PrimaryButtonStyle())
                }
                .padding(LKFrame.shared.gutter).frame(maxWidth: .infinity, maxHeight: .infinity)
            case .done: LessonCompleteView(model: m, onAgain: { round += 1 }, onClose: close)
            case .question, .feedback:
                if let it = m.phase == .feedback ? (m.answered ?? m.cur) : m.cur {
                    ScrollViewReader { proxy in
                        ScrollView { LessonQuestionView(model: m, item: it).id(it.id) }
                            .scrollIndicators(.hidden).scrollDismissesKeyboard(.interactively)
                            .onChange(of: m.phase) { _, p in if p == .feedback { withAnimation(reduceMotion ? nil : .easeOut(duration: 0.18)) { proxy.scrollTo(it.id, anchor: .top) } } }
                    }
                    .safeAreaInset(edge: .bottom, spacing: 0) { footer(m, it) }
                }
            }
        }
        .lkHaptic(.correct, trigger: m.correctTick, when: { $0 > 0 })
        .lkHaptic(.wrong, trigger: m.wrongTick, when: { $0 > 0 })
        .lkHaptic(.complete, trigger: m.doneTick, when: { $0 > 0 })
    }

    // MARK: top bar
    private func topBar(_ m: LessonModel) -> some View {
        HStack(spacing: LKSpacing.spaceSm) {
            Button { if m.needsConfirmToExit { confirmExit = true } else { close() } } label: {
                Image(systemName: "xmark").font(.system(size: 20, weight: .bold)).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                    .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle())
            }
            .accessibilityLabel(t(.lessonExit))
            .keyboardShortcut(.escape, modifiers: [])
            let seg = m.progressSegments
            HStack(spacing: 4) {
                ForEach(0..<seg.total, id: \.self) { i in
                    Capsule().fill(i < seg.filled ? LKColor.secondaryContainer.resolve(scheme) : LKColor.surfaceContainerHighest.resolve(scheme)).frame(height: 8)
                }
            }
            .animation(LKMotionPolicy.progressAnimation(reduce: reduceMotion), value: seg.filled)
            .accessibilityElement(children: .ignore)
            .accessibilityLabel(t(.lessonProgress))
            .accessibilityValue(t(.lessonQn, ["a": m.questionNumber, "b": m.session.total]))
        }
        .padding(.horizontal, LKFrame.shared.gutter - 4)
        .frame(minHeight: 56)
    }

    // MARK: footer
    @ViewBuilder private func footer(_ m: LessonModel, _ it: LessonItem) -> some View {
        if m.phase == .feedback {
            LessonFeedbackSheet(model: m, item: it, streak: services.today.snapshot.streak)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
        } else {
            VStack(spacing: LKSpacing.spaceXs) {
                HStack(spacing: LKSpacing.spaceXs) {
                    if let h = m.nextHint(it) {
                        Button { m.useHint(h) } label: {
                            Label { Text(t(.lessonHint)).lkText(LKType.labelMetric).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) } icon: { Image(systemName: "lightbulb.fill").foregroundStyle(LKColor.tertiary.resolve(scheme)) }
                                .frame(minHeight: LKFrame.shared.minTap)
                        }.buttonStyle(.plain).accessibilityLabel(t(.lessonHint))
                    }
                    Spacer(minLength: 0)
                    if m.listens(it) { skip(t(.lessonNoListen), "ear.trianglebadge.exclamationmark") { m.cantListen() } }
                    if m.speaks(it) { skip(t(.lessonNoSpeak), "mic.slash.fill") { m.cantSpeak() } }
                }
                if it.type == "line" {
                    Button(t(.actionContinue)) { m.continueLine() }.buttonStyle(PrimaryButtonStyle())
                } else if it.type != "match" && !m.speaks(it) {
                    Button(t(.actionCheck)) { m.submit() }.buttonStyle(PrimaryButtonStyle())
                        .disabled(!m.canCheck).opacity(m.canCheck ? 1 : 0.45)
                }
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceXs)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            .background(LKColor.background.resolve(scheme))
        }
    }
    private func skip(_ title: String, _ icon: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label { Text(title).lkText(LKType.bodySm) } icon: { Image(systemName: icon) }
                .foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap)
        }
        .buttonStyle(.plain)
    }

    // MARK: lifecycle
    private func close() { model?.stopAudio(); onClose() }

    private func load() async {
        if round == 0, model != nil { return }   // snapshots / previews hand in a running model
        let m = LessonModel(uiLang: services.uiLang, scorer: Self.makeScorer(), reduceMotion: reduceMotion)
        let storyID = route.query["story"]
        let now = Date().timeIntervalSince1970 * 1000
        let doc = try? await services.repo?.snapshot()
        let cards = doc.map { LessonStore.cards(from: $0) } ?? []
        var src = LessonModel.Source(cards: cards, starter: LessonStore.starter(settings: doc?.settings, now: now))
        var kind = LessonStore.nextKind(cards: cards, now: now)
        if let storyID, let text = await LessonRemote.shared.text("cpack/lesson/stories.js"), let st = LessonStory.parseScript(text)?.first(where: { $0.id == storyID }) {
            src.story = st; kind = st.kind
        }
        let repo = services.repo, services = services
        m.saved = { results, xp, date in
            LessonStore.finished(accuracy: m.summary.accuracy, story: storyID != nil)
            if let repo { await LessonStore.save(results, xp: xp, now: date, repo: repo); services.localChange() }
        }
        let remote = services.remote
        let index = PictureIndex(flag: remote.value(.vocabImg)?.string, pct: remote.value(.vocabImgPct)?.double.map { Int($0) }, bucket: PictureIndex.deviceBucket())
        model = m
        await m.start(src, kind: kind, pictures: index, dark: scheme == .dark)
    }
    private static func makeScorer() -> SpeechScoring? {
        #if os(iOS)
        return SFSpeechScorer()
        #else
        return nil
        #endif
    }
}
