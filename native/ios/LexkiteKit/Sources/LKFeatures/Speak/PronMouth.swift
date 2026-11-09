import SwiftUI
import LKDesign
import LKStore

/// The mouth figure of a vowel lesson (web `mouthSvg`, numbers from `PronLessonRules.mouth`): lips, open mouth, tongue, in a 200 × 160 box.
/// Drawn with the Kit tokens of the CURRENT theme (disc = surfaceContainerHighest, lips = errorContainer, mouth = error, tongue = tertiary), so it passes the palette gate in light and dark.
struct PronMouthFigure: View {
    let shape: PronMouthShape
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            Canvas { g, size in
                let s = min(size.width / 200, size.height / 160)
                let ox = (size.width - 200 * s) / 2, oy = (size.height - 160 * s) / 2
                func oval(_ v: [Double]) -> Path { Path(ellipseIn: CGRect(x: ox + (v[0] - v[2]) * s, y: oy + (v[1] - v[3]) * s, width: v[2] * 2 * s, height: v[3] * 2 * s)) }
                g.fill(Path(ellipseIn: CGRect(x: ox + 26 * s, y: oy + 6 * s, width: 148 * s, height: 148 * s)), with: .color(LKColor.surfaceContainerHighest.resolve(scheme)))
                g.fill(oval(shape.outer), with: .color(LKColor.errorContainer.resolve(scheme)))
                g.fill(oval(shape.inner), with: .color(LKColor.error.resolve(scheme)))
                g.fill(oval(shape.tongue), with: .color(LKColor.tertiary.resolve(scheme)))
                g.stroke(oval(shape.outer), with: .color(LKColor.onErrorContainer.resolve(scheme)), lineWidth: 1.5 * s)
            }
            .frame(width: 200, height: 160)
            Text(verbatim: caption).studyText(LKType.bodySm, LKColor.onSurface).multilineTextAlignment(.center)
        }
        .padding(LKSpacing.spaceSm)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: t(.speakPronKhauHinh) + ": " + caption))
    }
    private var caption: String { SpeakText.render(.string(shape.lipsKey), t) + " · " + SpeakText.render(.string(shape.jawKey), t) }
}
