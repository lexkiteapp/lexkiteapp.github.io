import SwiftUI
import LKDesign
import LKStore
import LKCore
import LKSync
import LKStrings

// M4 P07 – the two pron drills as full-screen focus screens (Stitch pron-pairs, pron-result): X + progress at the top, one scrolling column,
// the coach (teacher slot), ONE primary button pinned at the bottom, no tab bar. Kit tokens only; every string is an existing `speak.*` id.

/// The focus frame of the speaking drills: focus top bar (X + progress), scroll column, pinned bottom bar.
struct PronFocusFrame<Content: View, Bottom: View>: View {
    let progress: Double
    let onClose: () -> Void
    let content: Content
    let bottom: Bottom
    @Environment(\.colorScheme) private var scheme
    init(progress: Double, onClose: @escaping () -> Void, @ViewBuilder content: () -> Content, @ViewBuilder bottom: () -> Bottom) {
        self.progress = progress; self.onClose = onClose; self.content = content(); self.bottom = bottom()
    }
    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: progress), title: "", onExit: onClose)
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) { content }
                    .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
                    .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            VStack(spacing: LKSpacing.spaceXs) { bottom }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceSm)
                .frame(maxWidth: .infinity)
                .background(LKColor.background.resolve(scheme).ignoresSafeArea(edges: .bottom))
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }
}

/// The teacher slot: Ama drawn with the app's own 2D character next to one line of coaching.
struct PronCoachCard: View {
    let controller: TeacherController
    let text: String
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        SkillCard {
            HStack(alignment: .center, spacing: LKSpacing.spaceSm) {
                SpeakTeacher(controller: controller, size: CGSize(width: 64, height: 76))
                VStack(alignment: .leading, spacing: 4) {
                    Text(t(.speakSpCoN, ["n": "Ama"])).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.secondary.resolve(scheme))
                    Text(verbatim: text).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
        }
    }
}

// MARK: - pairs (listen & choose)

struct PronPairsFocus: View {
    let model: PronPairGameModel
    let lesson: JSON
    var onClose: () -> Void = {}
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let total = max(1, model.rounds.count)
        PronFocusFrame(progress: model.finished != nil ? 1 : Double(model.index) / Double(total), onClose: onClose) {
            HStack(spacing: LKSpacing.spaceXs) {
                StudyChip(text: lesson.s("ipa"))
                if model.finished == nil { StudyChip(text: Bidi.isolate("\(min(model.index + 1, total))/\(total)"), tint: LKColor.onSurfaceVariant) }
            }
            if let f = model.finished { result(f) }
            else if let r = model.current { round(r) }
        } bottom: {
            if model.finished != nil { SkillAction(title: "↺ " + t(.revPlayAgain), primary: true) { model.start() } }
            else if model.current != nil { SkillAction(title: t(.speakPronNgheLaiIN, ["i": model.index + 1, "n": model.rounds.count]), icon: "speaker.wave.2.fill", primary: true) { model.play() } }
        }
        .accessibilityIdentifier("focus-pron-pairs")
    }

    private func round(_ r: PronLessonRules.Round) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            SkillCard {
                VStack(spacing: LKSpacing.spaceSm) {
                    Text(verbatim: "👂 " + t(.speakPronNghePhanBietCap)).studyText(LKType.headlineSm).multilineTextAlignment(.center)
                    Button { model.play() } label: {
                        Image(systemName: "speaker.wave.2.fill").font(.system(size: 34, weight: .bold)).foregroundStyle(LKColor.onSecondary.resolve(scheme))
                            .frame(width: 88, height: 88).background(Circle().fill(LKColor.secondary.resolve(scheme)))
                    }
                    .buttonStyle(LKPressStyle())
                    .accessibilityLabel(Text(verbatim: t(.speakPronNgheLaiIN, ["i": model.index + 1, "n": model.rounds.count])))
                    SkillAction(title: t(.lessonSlowShort), icon: "tortoise.fill") { model.play(slow: true) }
                }
                .frame(maxWidth: .infinity)
            }
            HStack(spacing: LKSpacing.spaceSm) {
                ForEach(Array(r.options.enumerated()), id: \.offset) { k, w in option(k, w, r) }
            }
            dots
            PronCoachCard(controller: model.teacher, text: t(.speakPronNgheMotTuTrong))
        }
    }
    private func option(_ k: Int, _ w: String, _ r: PronLessonRules.Round) -> some View {
        let locked = model.picked != nil
        let right = locked && k == r.answer, wrong = model.picked == k && k != r.answer
        let line: LKDynamicColor = right ? LKColor.success : (wrong ? LKColor.error : LKColor.outlineVariant)
        return Button { model.pick(k) } label: {
            VStack(spacing: 4) {
                Text(verbatim: k == 0 ? "A" : "B").studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
                HStack(spacing: 6) {
                    Text(verbatim: w).studyText(LKType.headlineSm).englishText()
                    if right { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true) }
                    if wrong { Image(systemName: "xmark.circle.fill").foregroundStyle(LKColor.error.resolve(scheme)).accessibilityHidden(true) }
                }
            }
            .frame(maxWidth: .infinity, minHeight: 88)
            .tactile(fill: LKColor.surfaceContainerHigh, line: line, ledge: line, radius: 16)
        }
        .buttonStyle(LKPressStyle())
        .disabled(locked)
    }
    /// one dot per round: done · current · to do
    private var dots: some View {
        HStack(spacing: 6) {
            ForEach(0..<model.rounds.count, id: \.self) { i in
                Capsule().fill((i < model.index ? LKColor.secondary : (i == model.index ? LKColor.primary : LKColor.outlineVariant)).resolve(scheme))
                    .frame(width: i == model.index ? 18 : 8, height: 8)
            }
        }
        .frame(maxWidth: .infinity)
        .accessibilityHidden(true)
    }
    private func result(_ f: (pct: Int, good: Bool, ok: Int)) -> some View {
        SkillCard {
            VStack(spacing: LKSpacing.spaceSm) {
                Text(verbatim: "👂 " + t(.speakPronNghePhanBietCap)).studyText(LKType.headlineSm).multilineTextAlignment(.center)
                Text(verbatim: t(.speakPronNgheDungOkN, ["ok": f.ok, "n": model.rounds.count])).studyText(LKType.titlePill, f.good ? LKColor.success : LKColor.tertiary).multilineTextAlignment(.center)
                Text(verbatim: f.good ? t(.speakPronTaiBanDaPhan) : t(.speakPronNgheChamLaiTung)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            }
            .frame(maxWidth: .infinity)
        }
    }
}

// MARK: - say it (minimal pairs, speaking)

struct PronSayFocus: View {
    let model: PronSayModel
    var onClose: () -> Void = {}
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        PronFocusFrame(progress: progress, onClose: onClose) {
            if model.phase == .done { PronSayDone(model: model, showAgain: false) }
            else if let s = model.session, let it = model.item {
                HStack(spacing: LKSpacing.spaceXs) {
                    StudyChip(text: model.pairs.contrast(it.c).map { SpeakText.render(.string(model.pairs.label($0)), t) } ?? "")
                    if it.retry { StudyChip(text: t(.actionRetry), tint: LKColor.tertiary) }
                    StudyChip(text: Bidi.isolate(s.progress), tint: LKColor.onSurfaceVariant)
                }
                PronCoachCard(controller: model.teacher, text: t(.speakPronBamNgheMauNoi))
                SkillCard {
                    VStack(spacing: LKSpacing.spaceSm) {
                        Text(verbatim: it.target).studyText(LKType.displayHeroMobile).englishText().minimumScaleFactor(0.6).lineLimit(1)
                        Text(verbatim: it.ipa[it.side]).studyText(LKType.bodyMd, LKColor.secondary).englishText()
                        Text(verbatim: "≠ " + it.other).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText()
                        HStack(spacing: LKSpacing.spaceSm) {
                            SkillAction(title: t(.revPlayModel), icon: "waveform") { model.hear() }
                            SkillAction(title: t(.lessonSlowShort), icon: "tortoise.fill") { model.hear(slow: true) }
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
                VStack(spacing: LKSpacing.spaceSm) {
                    SpeakMic(state: model.listening ? .listening : .idle, label: t(.speakPronBamDeNoi)) { Task { await model.tapMic() } }
                    PronSayFeedback(model: model, it: it, inlineNext: false)
                }
                .frame(maxWidth: .infinity)
            }
        } bottom: {
            if model.phase == .done { SkillAction(title: t(.speakPronLuyenLai), icon: "arrow.clockwise", primary: true) { model.start() } }
            else if let st = model.step, st.nextButton, !model.listening { SkillAction(title: t(.speakPronTuTiepTheo), primary: true) { Task { await model.next() } } }
        }
        .accessibilityIdentifier("focus-pron-say")
    }
    private var progress: Double {
        if model.phase == .done { return 1 }
        guard let s = model.session else { return 0 }
        return Double(s.i) / Double(PronSaySession.size)
    }
}
