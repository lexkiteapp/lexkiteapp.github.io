import SwiftUI
import LKDesign
import LKStrings

/// The three fixed top-bar variants (DESIGN-SYSTEM §5d): hub · inner (Back) · focus (Close X + progress).
/// Back/X are ≥ 44 × 44 pt; system back / iOS edge swipe keep working (NavigationStack); focus screens confirm softly
/// before leaving only when progress would be lost (`onExit` decides).
public struct TopBar: View {
    public enum Variant { case hub, inner, focus(progress: Double) }
    let variant: Variant, title: String, onExit: (() -> Void)?
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    public init(variant: Variant, title: String, onExit: (() -> Void)? = nil) { self.variant = variant; self.title = title; self.onExit = onExit }

    public var body: some View {
        HStack(spacing: LKSpacing.spaceSm) {
            switch variant {
            case .hub:
                Text(title).lkText(LKType.headlineMd).accessibilityAddTraits(.isHeader)
                Spacer()
            case .inner:
                exitButton(system: "chevron.backward", label: t(.actionBack))
                Text(title).lkText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                Spacer()
            case .focus(let p):
                exitButton(system: "xmark", label: t(.actionClose))
                ProgressView(value: p).tint(LKColor.primary.resolve(scheme))
            }
        }
        .foregroundStyle(LKColor.onSurface.resolve(scheme))
        .padding(.horizontal, LKFrame.shared.gutter)
        .frame(minHeight: 56)
    }

    private func exitButton(system: String, label: String) -> some View {
        Button { onExit?() } label: {
            Image(systemName: system).font(.system(size: 20, weight: .bold))
                .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap)
                .contentShape(Rectangle())
        }
        .accessibilityLabel(label)
        .keyboardShortcut(.escape, modifiers: [])
    }
}
