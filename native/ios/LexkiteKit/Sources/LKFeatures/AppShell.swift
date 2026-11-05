import SwiftUI
import LKDesign
import LKStrings

/// Environment access to the current UI strings.
private struct L10nKeyEnv: EnvironmentKey { static let defaultValue = L10n(lang: L10n.preferred()) }
public extension EnvironmentValues { var l10n: L10n { get { self[L10nKeyEnv.self] } set { self[L10nKeyEnv.self] = newValue } } }

/// Root of the native app: the ONE app frame – 5 tabs Today · Vocab · Skills · Tests · Me (generated from web).
public struct AppShell: View {
    @State private var tab: String
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    private let frame = LKFrame.shared
    public init(initialTab: String = "home") { _tab = State(initialValue: initialTab) }

    public var body: some View {
        TabView(selection: $tab) {
            ForEach(frame.tabs) { tb in
                HubScreen(tab: tb)
                    .tabItem { Label(t(L10nKey(rawValue: tb.label)!), systemImage: tb.sf) }
                    .tag(tb.k)
            }
        }
        .tint(LKColor.primary.resolve(scheme))
        .environment(\.layoutDirection, t.isRTL ? .rightToLeft : .leftToRight)
    }
}

/// Hub screen placeholder for M0: hub top bar + empty content column. M1 replaces Today with the Stitch port.
struct HubScreen: View {
    let tab: LKFrame.Tab
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        let title = t(L10nKey(rawValue: tab.label)!)
        VStack(spacing: 0) {
            TopBar(variant: .hub, title: title)
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    if tab.k == "home" { TodayCard() }
                }
                .padding(.horizontal, LKFrame.shared.gutter)
                .padding(.top, LKSpacing.spaceLg)
                .frame(maxWidth: LKFrame.shared.width)
                .frame(maxWidth: .infinity)
            }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
    }
}

struct TodayCard: View {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            Text(t(.todayGoal)).lkText(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme))
            Text(t(.todayStreak)).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            Button(t(.actionContinue)) {}
                .buttonStyle(PrimaryButtonStyle())
        }
        .padding(LKSpacing.spaceMd)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: LKRadius.xl * 2).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
    }
}

/// One primary CTA per screen: full width, ≥ 44 pt, press-bounce (off with Reduce Motion).
public struct PrimaryButtonStyle: ButtonStyle {
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    public init() {}
    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .lkText(LKType.titlePill)
            .frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap)
            .foregroundStyle(LKColor.onPrimary.resolve(scheme))
            .background(RoundedRectangle(cornerRadius: LKRadius.xl).fill(LKColor.primary.resolve(scheme)))
            .scaleEffect(configuration.isPressed && !reduceMotion ? 0.97 : 1)
            .animation(reduceMotion ? nil : .spring(response: 0.25, dampingFraction: 0.6), value: configuration.isPressed)
    }
}
