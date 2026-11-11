import SwiftUI
import LKDesign
import LKCore

extension View {
    /// English content (sentences, tiles, answers) always reads left to right, also inside an RTL (Arabic) interface.
    func englishText() -> some View { environment(\.layoutDirection, .leftToRight) }
}

/// Wrapping row layout for tiles.
struct FlowLayout: Layout {
    var spacing: CGFloat = LKSpacing.spaceXs
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let w = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, rowH: CGFloat = 0, maxX: CGFloat = 0
        for s in subviews {
            let sz = s.sizeThatFits(.unspecified)
            if x > 0 && x + sz.width > w { y += rowH + spacing; x = 0; rowH = 0 }
            x += sz.width + spacing; rowH = max(rowH, sz.height); maxX = max(maxX, x - spacing)
        }
        return CGSize(width: proposal.width ?? maxX, height: y + rowH)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, rowH: CGFloat = 0
        for s in subviews {
            let sz = s.sizeThatFits(.unspecified)
            if x > bounds.minX && x + sz.width > bounds.maxX { y += rowH + spacing; x = bounds.minX; rowH = 0 }
            s.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(sz))
            x += sz.width + spacing; rowH = max(rowH, sz.height)
        }
    }
}

/// Stitch tactile surface: 2 pt outline + a 4 pt ledge under it.
struct Tactile: ViewModifier {
    var fill: LKDynamicColor = LKColor.surfaceContainer
    var line: LKDynamicColor = LKColor.outlineVariant
    var ledge: LKDynamicColor = LKColor.outlineVariant
    var radius: CGFloat = 20
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View {
        content.background {
            RoundedRectangle(cornerRadius: radius, style: .continuous).fill(ledge.resolve(scheme)).offset(y: 4)
            RoundedRectangle(cornerRadius: radius, style: .continuous).fill(fill.resolve(scheme))
            RoundedRectangle(cornerRadius: radius, style: .continuous).strokeBorder(line.resolve(scheme), lineWidth: 2)
        }
    }
}
extension View {
    func tactile(fill: LKDynamicColor = LKColor.surfaceContainer, line: LKDynamicColor = LKColor.outlineVariant, ledge: LKDynamicColor = LKColor.outlineVariant, radius: CGFloat = 20) -> some View {
        modifier(Tactile(fill: fill, line: line, ledge: ledge, radius: radius))
    }
}

struct LessonChip: View {
    let text: String, icon: String?, tint: LKDynamicColor
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(spacing: 4) {
            if let icon { Image(systemName: icon).font(.system(size: 12, weight: .bold)) }
            Text(text).lkText(LKType.labelBadge).textCase(.uppercase)
        }
        .padding(.horizontal, LKSpacing.spaceSm).padding(.vertical, 5)
        .foregroundStyle(tint.resolve(scheme))
        .background(Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
        .accessibilityElement(children: .combine)
    }
}

/// Round icon button (≥ 44 pt hit area).
struct LessonIconButton: View {
    let system: String, label: String, action: () -> Void
    var prominent = false
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button(action: action) {
            Image(systemName: system).font(.system(size: 17, weight: .bold))
                .foregroundStyle(prominent ? LKColor.onSecondary.resolve(scheme) : LKColor.secondary.resolve(scheme))
                .frame(width: 36, height: 36)
                .background(Circle().fill(prominent ? LKColor.secondary.resolve(scheme) : LKColor.surfaceContainerHighest.resolve(scheme)))
                .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
    }
}

/// One answer card (A–D letter badge + text), states for the feedback phase.
struct LessonOption: View {
    enum State { case idle, selected, correct, wrong, dim }
    let letter: String, text: String, state: State, action: () -> Void
    var sub: String? = nil
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let c = colors
        Button(action: action) {
            HStack(alignment: .center, spacing: LKSpacing.spaceSm) {
                Text(letter).lkText(LKType.labelMetric).foregroundStyle(c.badgeText.resolve(scheme))
                    .frame(width: 28, height: 28).background(Circle().fill(c.badge.resolve(scheme)))
                VStack(alignment: .leading, spacing: 2) {
                    Text(text).lkText(LKType.headlineSm).foregroundStyle(c.text.resolve(scheme)).multilineTextAlignment(.leading).englishText()
                        .lineLimit(text.contains(" ") ? 3 : 1).minimumScaleFactor(0.7) // a single word shrinks, never breaks mid-word ("considerin|g")
                    if let sub, !sub.isEmpty { Text(sub).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
                }
                Spacer(minLength: 0)
                if state == .correct { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)) }
                if state == .wrong { Image(systemName: "xmark.circle.fill").foregroundStyle(LKColor.error.resolve(scheme)) }
            }
            .padding(.horizontal, LKSpacing.spaceSm).padding(.vertical, LKSpacing.spaceSm)
            .frame(maxWidth: .infinity, minHeight: 64, alignment: .leading)
            .tactile(fill: c.fill, line: c.line, ledge: c.ledge, radius: 16)
            .opacity(state == .dim ? 0.55 : 1)
        }
        .buttonStyle(LKPressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(text)
        .accessibilityAddTraits(state == .selected || state == .correct ? [.isButton, .isSelected] : .isButton)
    }
    private var colors: (fill: LKDynamicColor, line: LKDynamicColor, ledge: LKDynamicColor, text: LKDynamicColor, badge: LKDynamicColor, badgeText: LKDynamicColor) {
        switch state {
        case .selected: return (LKColor.surfaceContainerHigh, LKColor.secondary, LKColor.secondary, LKColor.onSurface, LKColor.secondary, LKColor.onSecondary)
        case .correct: return (LKColor.surfaceContainerHigh, LKColor.success, LKColor.success, LKColor.onSurface, LKColor.success, LKColor.onSecondary)
        case .wrong: return (LKColor.errorContainer, LKColor.error, LKColor.error, LKColor.onErrorContainer, LKColor.error, LKColor.onError)
        default: return (LKColor.surfaceContainer, LKColor.outlineVariant, LKColor.outlineVariant, LKColor.onSurface, LKColor.surfaceContainerHighest, LKColor.onSurface)
        }
    }
}

/// Word tile of "build the sentence".
struct LessonTile: View {
    let text: String, faded: Bool, action: () -> Void
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button(action: action) {
            Text(text).lkText(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
                .tactile(fill: LKColor.surfaceContainer, radius: 14)
                .opacity(faded ? 0.25 : 1)
        }
        .buttonStyle(LKPressStyle())
        .disabled(faded)
        .accessibilityLabel(text)
    }
}
