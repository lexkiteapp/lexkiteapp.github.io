import SwiftUI
import LKDesign
import LKStrings
import LKSync

/// Environment access to the current UI strings.
private struct L10nKeyEnv: EnvironmentKey { static let defaultValue = L10n(lang: L10n.preferred()) }
public extension EnvironmentValues { var l10n: L10n { get { self[L10nKeyEnv.self] } set { self[L10nKeyEnv.self] = newValue } } }

/// The app root: services, language (+ RTL), theme, deep links / universal links, sign-in + account sheets.
public struct RootView: View {
    @State private var services: AppServices
    let handleURL: (URL) -> Bool
    /// - Parameter handleURL: URLs consumed before routing (Google Sign-In callback); return true when handled.
    public init(services: AppServices, handleURL: @escaping (URL) -> Bool = { _ in false }) {
        _services = State(initialValue: services); self.handleURL = handleURL
    }
    public var body: some View {
        @Bindable var s = services
        let l10n = services.l10n, theme = services.colorScheme
        OnboardingGateView()   // C17: splash → first-run onboarding → AppShell (later launches go straight to Today)
            .environment(services)
            .environment(\.l10n, l10n)
            .environment(\.locale, Locale(identifier: l10n.lang))
            .environment(\.layoutDirection, l10n.isRTL ? .rightToLeft : .leftToRight)
            .preferredColorScheme(theme)
            .onOpenURL { if !handleURL($0) { services.router.open(url: $0) } }
            .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { a in if let u = a.webpageURL { services.router.open(url: u) } }
            .sheet(isPresented: $s.signInSheet) { SignInSheet().environment(services).environment(\.l10n, l10n).environment(\.layoutDirection, l10n.isRTL ? .rightToLeft : .leftToRight) }
            .sheet(isPresented: $s.deleteSheet) { DeleteAccountSheet().environment(services).environment(\.l10n, l10n).environment(\.layoutDirection, l10n.isRTL ? .rightToLeft : .leftToRight) }
            .alert(l10n(.authSwitchAccount), isPresented: Binding(get: { services.accountSwitchPrompt != nil }, set: { if !$0 { answerSwitch(true) } })) {
                Button(l10n(.actionCancel), role: .cancel) { answerSwitch(false) }
                Button(l10n(.actionContinue)) { answerSwitch(true) }
            }
            .task { await services.auth.observe() }
    }
    private func answerSwitch(_ merge: Bool) {
        guard let p = services.accountSwitchPrompt else { return }
        services.accountSwitchPrompt = nil
        p.answer.resume(returning: merge)
    }
}

/// P01 – the ONE app frame: 5 tabs Today · Vocab · Skills · Tests · Me (generated frame.json), a NavigationStack per tab
/// (each tab keeps its stack when switching), inner screens with the system back button + edge swipe, focus flows full screen with X.
public struct AppShell: View {
    @Environment(AppServices.self) private var services
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    private let frame = LKFrame.shared
    public init() {}

    public var body: some View {
        @Bindable var router = services.router
        TabView(selection: Binding(get: { router.tab }, set: { router.reselect($0) })) {
            ForEach(visibleTabs) { tb in
                NavigationStack(path: router.path(tb.k)) {
                    root(tb)
                        .toolbar(.hidden, for: .navigationBar)
                        .navigationDestination(for: AppRoute.self) { r in InnerScreen(route: r) }
                }
                .toolbarBackground(LKColor.surfaceContainerHigh.resolve(scheme), for: .tabBar)   // Stitch <nav>: own surface, not the page colour
                .toolbarBackground(.visible, for: .tabBar)
                .tabItem { Label(t(L10nKey(rawValue: tb.label) ?? .tabToday), systemImage: tb.sf) }
                .tag(tb.k)
                .badge(tb.k == "home" ? services.today.snapshot.total : 0)   // Stitch frame: due count on Today
            }
        }
        .tint(LKColor.secondary.resolve(scheme))   // Stitch frame: active tab = teal (same as Android NavigationBar)
        .fullScreenCover(item: $router.focus) { r in
            FocusScreen(route: r).environment(services)
        }
    }

    /// Tabs in the order of the signed `modules` document (default = frame.json), hidden ones removed.
    private var visibleTabs: [LKFrame.Tab] {
        var out: [LKFrame.Tab] = []
        for k in services.tabOrder where !services.hiddenTabs.contains(k) {
            if let tab = frame.tabs.first(where: { $0.k == k }) { out.append(tab) }
        }
        return out
    }

    @ViewBuilder func root(_ tb: LKFrame.Tab) -> some View {
        switch tb.k {
        case "home": TodayView()
        case "me": MeHub(tab: tb)
        case "vocab": StudyVocabHub(tab: tb)   // M3 P04/P05
        case "skills": SkillsHubView(tab: tb)   // M4 P06
        default: HubScreen(tab: tb)
        }
    }
}

/// Hub screens whose content lands in later milestones (Vocab M3, Skills M4, Tests M5): hub top bar + content column.
struct HubScreen: View {
    let tab: LKFrame.Tab
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .hub, title: t(L10nKey(rawValue: tab.label) ?? .tabToday))
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) { EmptyView() }
                    .padding(.horizontal, LKFrame.shared.gutter)
                    .padding(.top, LKSpacing.spaceLg)
                    .frame(maxWidth: LKFrame.shared.width)
                    .frame(maxWidth: .infinity)
            }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
    }
}

/// Inner screen (pushed): system back button (≥ 44 pt) + edge swipe; title = the owning tab until the screen is ported.
struct InnerScreen: View {
    let route: AppRoute
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        if StudyRoutes.handlesInner(route.name) { StudyInnerScreen(route: route) }
        else if DictRoutes.handlesInner(route.name) { DictInnerScreen(route: route) }
        else if SkillsRoutes.handlesInner(route.name) { SkillsInnerScreen(route: route) }   // M4 P06: listening · listen · reading · read
        else if SpeakRoutes.handlesInner(route.name) { SpeakInnerScreen(route: route) }   // M4 P07: speak · speaking · pron · rtype · roleplay
        else if WriteRoutes.handlesInner(route.name) { WriteInnerScreen(route: route) }   // M4 P09: write · task1 · qstats · criteria
        else { placeholder }
    }
    @ViewBuilder private var placeholder: some View {
        let tab = LKFrame.shared.tabs.first { $0.k == route.tab }
        ScrollView { Color.clear.frame(height: 1) }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(LKColor.background.resolve(scheme).ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar(.visible, for: .navigationBar)
            .toolbarBackground(LKColor.background.resolve(scheme), for: .navigationBar)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text(t(L10nKey(rawValue: tab?.label ?? "") ?? .tabToday)).lkText(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme))
                }
            }
            .accessibilityIdentifier("inner-\(route.name)")
    }
}

/// Focus flow (lesson, review, mock…): no tab bar, Close X ≥ 44 pt top-leading, Esc closes. The lesson player is P03; the other players land in M3+.
struct FocusScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        if route.name == "lesson" && route.arg == "go" {
            LessonView(route: route) { services.router.closeFocus() }   // P03
        } else if StudyRoutes.handlesFocus(route.name) {
            StudyFocusScreen(route: route)   // M3 P04: review · practice · mistakes
        } else if SkillsRoutes.handlesFocus(route.name) {
            SkillsFocusScreen(route: route)   // M4 P06: listen-test · dictation
        } else if SpeakRoutes.handlesFocus(route.name) {
            SpeakFocusScreen(route: route)   // M4 P07: say · reflex · handsfree
        } else if CallRoutes.handlesFocus(route.name) {
            CallFocusScreen(route: route)   // M4 P08: call (list → ring → call → summary)
        } else {
            VStack(spacing: 0) {
                TopBar(variant: .focus(progress: 0), title: "") { services.router.closeFocus() }
                Spacer()
            }
            .background(LKColor.background.resolve(scheme).ignoresSafeArea())
            .accessibilityIdentifier("focus-\(route.name)")
        }
    }
}

/// One primary CTA per screen: full width, pill (Stitch rounded-full = Android LKPrimaryButton), ≥ 44 pt, press-bounce (off with Reduce Motion), soft haptic.
public struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    public init() {}
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .lkText(LKType.titlePill)
            .textCase(.uppercase)
            .frame(maxWidth: .infinity, minHeight: max(LKFrame.shared.minTap, 52))
            .foregroundStyle(LKColor.onPrimary.resolve(scheme))
            .background {
                Capsule().fill(LKColor.primary.resolve(scheme)).brightness(-0.22)   // tactile ledge = primary, darker
                    .offset(y: LKMotionPolicy.pressOffset(pressed: configuration.isPressed, reduce: reduceMotion, rest: 4, down: 1))
                Capsule().fill(LKColor.primary.resolve(scheme))
                    .offset(y: LKMotionPolicy.pressOffset(pressed: configuration.isPressed, reduce: reduceMotion, down: 3))
            }
            .scaleEffect(LKMotionPolicy.pressScale(pressed: configuration.isPressed, reduce: reduceMotion, down: 0.98))
            .animation(LKMotionPolicy.animation(response: 0.25, damping: 0.6, reduce: reduceMotion), value: configuration.isPressed)
            .lkHaptic(.tap, trigger: configuration.isPressed, when: { $0 })
    }
}
