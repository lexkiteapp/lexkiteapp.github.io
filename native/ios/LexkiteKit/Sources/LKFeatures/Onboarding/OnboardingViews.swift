import SwiftUI
import LKDesign
import LKStrings

// C17 – onboarding screens. Built only from Kit tokens/components (LKColor/LKType/LKSpacing, LKCard, PrimaryButtonStyle, LKPressStyle).
// Splash + native-language picker have no Stitch export yet: each is ONE small view (OnbSplashView, OnbLanguageStep) so the Stitch
// version can replace it without touching the flow. Welcome/goal/level/pace/ready follow the #608 exports (brand/stitch/v2/welcome-*, onb-*).

/// Root switch: splash while the local store is read → onboarding (first launch) → the app. Later launches go straight to AppShell.
struct OnboardingGateView: View {
    @Environment(AppServices.self) private var services
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        let phase = services.onboarding.phase
        Group {
            switch phase {
            case .undecided: OnbSplashView()
            case .onboarding: OnboardingView()
            case .done: AppShell()
            }
        }
        .animation(LKMotionPolicy.progressAnimation(reduce: reduceMotion), value: phase)
    }
}

// MARK: splash

struct OnbSplashView: View {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.l10n) private var t
    @State private var shown = false
    var body: some View {
        ZStack {
            LKColor.background.resolve(scheme).ignoresSafeArea()
            // Soft glow as a radial gradient (cheap, and drawn by snapshots too – .blur is not); only the glow fades in.
            // The mark + name are visible from the first frame so the hand-off from the system launch screen never flashes empty (C17 QC).
            RadialGradient(colors: [LKColor.glowSecondary.resolve(scheme).opacity(0.22), .clear], center: .center, startRadius: 0, endRadius: 190)
                .frame(width: 380, height: 380)
                .opacity(shown || reduceMotion ? 1 : 0)
            // Stitch splash: mark 96 + wordmark + tagline, the group 48 pt above the middle, a 3 pt indeterminate track at the bottom
            VStack(spacing: LKSpacing.spaceXs) {
                LexkiteMark(size: 96).padding(.bottom, LKSpacing.spaceXs)
                Text(t(.appName)).lkText(LKType.headlineLg).foregroundStyle(LKColor.onBackground.resolve(scheme))
                Text(t(.onbFree)).lkText(LKType.titlePill).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).multilineTextAlignment(.center)
                    .padding(.horizontal, LKSpacing.spaceLg)
            }
            .offset(y: -48)
            VStack {
                Spacer()
                OnbSplashTrack(animate: !reduceMotion).padding(.horizontal, LKSpacing.space2xl).padding(.bottom, LKSpacing.space2xl)
            }
        }
        .onAppear { withAnimation(LKMotionPolicy.progressAnimation(reduce: reduceMotion)) { shown = true } }
        .accessibilityElement(children: .combine)
        .accessibilityIdentifier("onb-splash")
    }
}

/// 3 pt track with a teal segment sweeping across (static third when Reduce Motion is on).
struct OnbSplashTrack: View {
    let animate: Bool
    @Environment(\.colorScheme) private var scheme
    @State private var go = false
    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width / 3
            ZStack(alignment: .leading) {
                Capsule().fill(LKColor.outlineVariant.resolve(scheme))
                Capsule().fill(LKColor.secondaryContainer.resolve(scheme)).frame(width: w)
                    .offset(x: animate && go ? geo.size.width - w : 0)
            }
        }
        .frame(height: 3)
        .onAppear { if animate { withAnimation(.easeInOut(duration: 1.1).repeatForever(autoreverses: true)) { go = true } } }
        .accessibilityHidden(true)
    }
}

// MARK: frame (progress, Back, Skip, one primary button)

struct OnbFrame<Content: View>: View {
    let step: OnboardingStep
    let primary: String
    let primaryEnabled: Bool
    let footnote: String?
    let onPrimary: () -> Void
    let content: Content
    @Environment(AppServices.self) private var services
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.l10n) private var t

    init(step: OnboardingStep, primary: String, primaryEnabled: Bool = true, footnote: String? = nil, onPrimary: @escaping () -> Void,
         @ViewBuilder content: () -> Content) {
        self.step = step; self.primary = primary; self.primaryEnabled = primaryEnabled; self.footnote = footnote
        self.onPrimary = onPrimary; self.content = content()
    }

    var body: some View {
        let flow = services.onboarding
        VStack(spacing: 0) {
            header(flow)
            ScrollView {
                content
                    .padding(.horizontal, LKFrame.shared.gutter)
                    .padding(.top, LKSpacing.spaceSm)
                    .frame(maxWidth: LKFrame.shared.width)
                    .frame(maxWidth: .infinity)
            }
            footer
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .accessibilityIdentifier("onb-\(step)")
    }

    @ViewBuilder private func header(_ flow: OnboardingFlow) -> some View {
        HStack(spacing: LKSpacing.spaceSm) {
            if step.canBack {
                Button { flow.back() } label: {
                    Image(systemName: "chevron.backward").font(.system(size: 20, weight: .bold))
                        .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle())
                }
                .accessibilityLabel(t(.actionBack)).accessibilityIdentifier("onb-back")
            } else {
                Color.clear.frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap)
            }
            if let i = step.barIndex {
                OnbProgress(index: i, count: OnboardingStep.barCount, label: t(.meProgress))
                Text(verbatim: "\(Fmt.int(i + 1, t.lang))/\(Fmt.int(OnboardingStep.barCount, t.lang))").lkText(LKType.labelMetric)
                    .foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
            } else {
                Spacer(minLength: 0)
            }
            if step.canSkip {
                Button { flow.skip() } label: {
                    Text(t(.onbCommonSkip)).lkText(LKType.titlePill).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                        .frame(minWidth: LKFrame.shared.minTap, minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                }
                .accessibilityIdentifier("onb-skip")
            }
        }
        .foregroundStyle(LKColor.onSurface.resolve(scheme))
        .padding(.horizontal, LKFrame.shared.gutter - LKSpacing.spaceXs)
        .frame(minHeight: 56)
    }

    private var footer: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            Button(action: onPrimary) { Text(primary) }
                .buttonStyle(PrimaryButtonStyle())
                .disabled(!primaryEnabled).opacity(primaryEnabled ? 1 : 0.45)
                .accessibilityIdentifier("onb-primary")
            if let footnote {
                Text(footnote).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).multilineTextAlignment(.center)
            }
        }
        .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm).padding(.bottom, LKSpacing.spaceMd)
        .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
    }
}

struct OnbProgress: View {
    let index: Int, count: Int, label: String
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        let fraction = Double(index + 1) / Double(max(1, count))
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme))
                Capsule().fill(LKColor.secondary.resolve(scheme)).frame(width: geo.size.width * fraction)
                    .animation(LKMotionPolicy.progressAnimation(reduce: reduceMotion), value: index)
            }
        }
        .frame(height: 12)
        .accessibilityElement()
        .accessibilityLabel(label)
        .accessibilityValue("\(index + 1)/\(count)")
    }
}

/// Selectable card row (radio semantics) – Stitch tactile card, selected = secondary outline + check.
struct OnbChoiceRow: View {
    let symbol: String?, title: String, sub: String?, selected: Bool, action: () -> Void
    /// level meter (filled of total) in place of the icon – Stitch onb-level
    var meter: (filled: Int, total: Int)? = nil
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button(action: action) {
            HStack(spacing: LKSpacing.spaceSm) {
                if let meter { OnbLevelBars(filled: meter.filled, total: meter.total) }
                if let symbol {
                    Image(systemName: symbol).font(.system(size: 20, weight: .bold)).foregroundStyle(LKColor.onSecondary.resolve(scheme))
                        .frame(width: 44, height: 44)
                        .background(RoundedRectangle(cornerRadius: LKRadius.xl, style: .continuous).fill(LKColor.secondary.resolve(scheme)))
                        .accessibilityHidden(true)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: title).lkText(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme))
                    if let sub, !sub.isEmpty {
                        Text(verbatim: sub).lkText(LKType.bodySm)   // selected: on-surface – on-surface-variant on the tinted chip is 3.1:1 in dark (< AA 4.5)
                            .foregroundStyle((selected ? LKColor.onSurface : LKColor.onSurfaceVariant).resolve(scheme))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: selected ? "checkmark.circle.fill" : "circle").font(.system(size: 24, weight: .semibold))
                    .foregroundStyle(selected ? LKColor.secondary.resolve(scheme) : LKColor.outline.resolve(scheme)).accessibilityHidden(true)
            }
            .padding(LKSpacing.spaceSm)
            .frame(minHeight: 56)
            .background {
                RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous).fill(LKColor.outlineVariant.resolve(scheme)).offset(y: 4)   // tactile ledge (Stitch tactile-card), neutral also when selected
                RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme))   // opaque base: the ledge must not show through the tint
                if selected { RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous).fill(LKColor.secondaryFixed.resolve(scheme).opacity(0.35)) }
                RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous)
                    .strokeBorder(selected ? LKColor.secondary.resolve(scheme) : LKColor.outlineVariant.resolve(scheme), lineWidth: 2)
            }
        }
        .buttonStyle(LKPressStyle())
        .accessibilityAddTraits(.isButton)
        .accessibilityAddTraits(selected ? AccessibilityTraits.isSelected : AccessibilityTraits())
    }
}

/// Level meter: 4 bars of growing height, filled = secondary, empty = outlined slot in `outline` (≥ 3:1 on the card, WCAG 1.4.11).
struct OnbLevelBars: View {
    let filled: Int, total: Int
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let on = Int((Double(filled) / Double(max(1, total)) * 4).rounded(.up))
        HStack(alignment: .bottom, spacing: 3) {
            ForEach(0..<4, id: \.self) { j in
                Capsule().fill(j < on ? LKColor.secondary.resolve(scheme) : Color.clear)
                    .overlay(Capsule().strokeBorder(j < on ? Color.clear : LKColor.outline.resolve(scheme), lineWidth: 1.5))
                    .frame(width: 6, height: CGFloat(10 + 6 * j))
            }
        }
        .frame(width: 44, height: 44, alignment: .bottom)
        .accessibilityHidden(true)
    }
}

/// Teacher (Ama) with a speech bubble – the web's 2D Ama still (bundled first frame, CDN + disk cache for other poses; see LKDesign TeacherStill).
struct OnbTeacherSay: View {
    let line: String
    var pose: String = "happy"
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(alignment: .bottom, spacing: LKSpacing.spaceSm) {
            TeacherStill(pose: pose).frame(width: 88, height: 88, alignment: .bottom)
            LKCard(fill: LKColor.surfaceBright, padding: LKSpacing.spaceSm) {
                Text(verbatim: line).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme))
            }
        }
    }
}

// MARK: flow container

public struct OnboardingView: View {
    @Environment(AppServices.self) private var services
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    public init() {}
    public var body: some View {
        let step = services.onboarding.step
        Group {
            switch step {
            case .welcome: OnbWelcomeStep()
            case .language: OnbLanguageStep()
            case .goal: OnbGoalStep()
            case .level: OnbLevelStep()
            case .pace: OnbPaceStep()
            case .ready: OnbReadyStep()
            }
        }
        .id(step)
        .transition(.opacity)
        .animation(LKMotionPolicy.progressAnimation(reduce: reduceMotion), value: step)
        .task(id: services.auth.syncStatus) { await services.onboarding.reevaluate(repo: services.repo) }
    }
}

// MARK: steps

struct OnbWelcomeStep: View {
    @Environment(AppServices.self) private var services
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        OnbFrame(step: .welcome, primary: t(.onbWelcomeStart), footnote: t(.onbFree), onPrimary: { services.onboarding.next() }) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                LexkiteMark(size: 56).padding(.top, LKSpacing.spaceXs)
                Text(t(.onbWelcomeKicker)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.secondary.resolve(scheme))
                Text(t(.onbWelcomeH1a) + "\n" + t(.onbWelcomeH1b)).lkText(LKType.displayHeroMobile).foregroundStyle(LKColor.onSurface.resolve(scheme))
                    .accessibilityAddTraits(.isHeader).fixedSize(horizontal: false, vertical: true)
                OnbTeacherSay(line: t(.onbWelcomeHello))
                Button { services.signInSheet = true } label: {
                    Text(t(.onbWelcomeHaveAccount)).lkText(LKType.titlePill).foregroundStyle(LKColor.secondary.resolve(scheme))
                        .frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap)
                }
                .accessibilityIdentifier("onb-have-account")
            }
        }
    }
}

struct OnbLanguageStep: View {
    @Environment(AppServices.self) private var services
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        @Bindable var flow = services.onboarding
        OnbFrame(step: .language, primary: t(.actionContinue), onPrimary: { services.onboarding.next() }) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                Text(t(.onbLangTitle)).lkText(LKType.headlineLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityAddTraits(.isHeader)
                Text(t(.onbLangSub)).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                HStack(spacing: LKSpacing.spaceXs) {
                    Image(systemName: "magnifyingglass").foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
                    TextField(t(.onbLangSearch), text: $flow.langQuery).lkText(LKType.bodyMd).textInputAutocapitalization(.never).autocorrectionDisabled()
                        .accessibilityIdentifier("onb-lang-search")
                }
                .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap)
                .background(RoundedRectangle(cornerRadius: LKRadius.xl, style: .continuous).fill(LKColor.surfaceContainerHighest.resolve(scheme)))
                VStack(spacing: LKSpacing.spaceXs) {
                    ForEach(OnbLanguage.list(matching: flow.langQuery), id: \.self) { code in
                        OnbChoiceRow(symbol: nil, title: OnbLanguage.names[code] ?? code, sub: nil, selected: services.uiLang == code) {
                            services.setLanguage(code)
                        }
                    }
                }
            }
        }
    }
}

struct OnbGoalStep: View {
    @Environment(AppServices.self) private var services
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        let flow = services.onboarding
        OnbFrame(step: .goal, primary: t(.actionContinue), primaryEnabled: flow.pick.track != nil, onPrimary: { flow.next() }) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                OnbTeacherSay(line: t(.onbWelcomeHello), pose: "point")
                Text(t(.onbGoalQ)).lkText(LKType.headlineLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityAddTraits(.isHeader)
                Text(t(.onbGoalSub)).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                VStack(spacing: LKSpacing.spaceXs) {
                    ForEach(OnbTrack.all) { tr in
                        OnbChoiceRow(symbol: tr.symbol, title: tr.name(t), sub: tr.sub(t), selected: flow.pick.track == tr.id) {
                            if flow.pick.track != tr.id { flow.pick.track = tr.id; flow.pick.level = "" }
                        }
                    }
                }
            }
        }
    }
}

struct OnbLevelStep: View {
    @Environment(AppServices.self) private var services
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        let flow = services.onboarding
        let tr = OnbTrack.find(flow.pick.track)
        OnbFrame(step: .level, primary: t(.actionContinue), primaryEnabled: !flow.pick.level.isEmpty, onPrimary: { flow.next() }) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                OnbTeacherSay(line: t(.onbLevelSay), pose: "thinking")
                Text(t(.onbLevelQ)).lkText(LKType.headlineLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityAddTraits(.isHeader)
                VStack(spacing: LKSpacing.spaceXs) {
                    // optional quick placement test (Skip also stays available)
                    OnbChoiceRow(symbol: "safari.fill", title: t(.onbLevelTest), sub: nil, selected: flow.pick.level == "test") { flow.pick.level = "test" }
                    ForEach(Array(tr.stages.enumerated()), id: \.element.id) { i, st in
                        OnbChoiceRow(symbol: nil, title: tr.id == "ielts" ? st.cefr : st.label(ielts: false), sub: st.band.isEmpty ? nil : st.band, selected: flow.pick.level == st.id,
                                     action: { flow.pick.level = st.id }, meter: (i + 1, tr.stages.count))
                    }
                }
            }
        }
    }
}

struct OnbPaceStep: View {
    @Environment(AppServices.self) private var services
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        let flow = services.onboarding
        let current = OnbPace.find(flow.pick.pace).value
        OnbFrame(step: .pace, primary: t(.actionContinue), onPrimary: { flow.pick.pace = current; flow.next() }) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                OnbTeacherSay(line: t(.onbPaceSay), pose: "point")
                Text(t(.onbPaceQ)).lkText(LKType.headlineLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityAddTraits(.isHeader)
                VStack(spacing: LKSpacing.spaceXs) {
                    ForEach(OnbPace.all) { p in
                        OnbChoiceRow(symbol: p.symbol, title: t(p.title), sub: t(p.sub), selected: current == p.value) { flow.pick.pace = p.value }
                    }
                }
            }
        }
    }
}

struct OnbReadyStep: View {
    @Environment(AppServices.self) private var services
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        let flow = services.onboarding
        let tr = OnbTrack.find(flow.pick.track)
        let stage = tr.stages.first { $0.id == flow.pick.level }
        let isTest = flow.pick.level == "test"
        let levelText = isTest ? t(.onbLevelTest) : (stage?.label(ielts: tr.id == "ielts") ?? "")
        let pace = OnbPace.find(flow.pick.pace)
        OnbFrame(step: .ready, primary: t(.onbReadyCta), footnote: t(.onbFree), onPrimary: { Task { await flow.finish(services: services) } }) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                OnbTeacherSay(line: isTest ? t(.onbReadySayTest) : t(.onbReadySay), pose: "cheer")
                Text(t(.onbReadyQ)).lkText(LKType.headlineLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityAddTraits(.isHeader)
                LKCard {
                    VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                        summary(t(.todayGoalShort), flow.pick.track == nil ? "" : tr.name(t))
                        summary(t(.onbLevelWord), levelText)
                        summary(t(pace.title), t(pace.sub))
                    }
                }
            }
        }
    }
    func summary(_ k: String, _ v: String) -> some View {
        HStack(alignment: .firstTextBaseline) {
            Text(verbatim: k).lkText(LKType.labelMetric).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            Spacer(minLength: LKSpacing.spaceSm)
            Text(verbatim: v).lkText(LKType.titlePill).foregroundStyle(LKColor.onSurface.resolve(scheme)).multilineTextAlignment(.trailing)
        }
    }
}
