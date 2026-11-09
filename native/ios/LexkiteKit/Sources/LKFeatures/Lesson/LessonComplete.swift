import SwiftUI
import LKDesign
import LKStrings

/// Lesson complete (Stitch lesson-complete): cheering teacher, accuracy ring, XP / best combo / time, what was learned, what to repeat.
struct LessonCompleteView: View {
    let model: LessonModel
    let onAgain: () -> Void, onClose: () -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var shown = false

    var body: some View {
        let s = model.summary
        ZStack(alignment: .top) {
            ScrollView {
                VStack(spacing: LKSpacing.spaceSm) {
                    TeacherView(controller: model.teacher).frame(width: 154, height: 132).accessibilityHidden(true)
                    Text(t(.lessonDone)).lkText(LKType.headlineLg).foregroundStyle(LKColor.onBackground.resolve(scheme)).accessibilityAddTraits(.isHeader)
                    Text(s.accuracy >= 80 ? t(.lessonAwesome) : t(.lessonKeepGoing)).lkText(LKType.bodyLg).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).multilineTextAlignment(.center)
                    ring(s)
                    HStack(spacing: LKSpacing.spaceSm) {
                        stat("bolt.fill", "+\(s.xp)", t(.todayXp), LKColor.tertiary)
                        stat("flame.fill", "\(s.best)", t(.lessonComboBest), LKColor.primary)
                        stat("timer", "\(s.minutes)′", t(.lessonTime), LKColor.secondary)
                    }
                    if !s.learned.isEmpty { block(t(.lessonLearned), s.learned.joined(separator: " · ")) }
                    if s.perfect { Label(t(.lessonPerfect), systemImage: "star.fill").lkText(LKType.titlePill).foregroundStyle(LKColor.tertiary.resolve(scheme)) }
                    else if !s.weak.isEmpty { block(t(.lessonMistakes), s.weak.joined(separator: ", ")) }
                    let msg = t(.lessonShare, ["a": s.accuracy, "x": s.xp])
                    ShareLink(item: msg) { Image(systemName: "square.and.arrow.up").font(.system(size: 18, weight: .bold)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap) }
                        .foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityLabel(msg)
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm).padding(.bottom, LKSpacing.spaceLg)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            if !reduceMotion { Celebration().allowsHitTesting(false).accessibilityHidden(true) }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: LKSpacing.spaceXs) {
                Button(t(.lessonAgain), action: onAgain).buttonStyle(PrimaryButtonStyle())
                Button(t(.lessonHome), action: onClose).lkText(LKType.titlePill).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap)
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.bottom, LKSpacing.spaceXs)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            .background(LKColor.background.resolve(scheme))
        }
        .onAppear { shown = true }
    }

    private func ring(_ s: LessonModel.Summary) -> some View {
        ZStack {
            Circle().stroke(LKColor.surfaceContainerHighest.resolve(scheme), lineWidth: 10)
            Circle().trim(from: 0, to: shown || reduceMotion ? CGFloat(s.accuracy) / 100 : 0)
                .stroke(LKColor.secondary.resolve(scheme), style: StrokeStyle(lineWidth: 10, lineCap: .round)).rotationEffect(.degrees(-90))
                .animation(reduceMotion ? nil : .easeOut(duration: 0.8), value: shown)
            VStack(spacing: 0) {
                Text("\(s.accuracy)%").lkText(LKType.headlineLg).foregroundStyle(LKColor.onSurface.resolve(scheme))
                Text(t(.lessonAccuracy)).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).multilineTextAlignment(.center).padding(.horizontal, 12)
            }
        }
        .frame(width: 132, height: 132)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(t(.lessonAccuracy)) \(s.accuracy)%")
    }
    private func stat(_ icon: String, _ value: String, _ label: String, _ tint: LKDynamicColor) -> some View {
        VStack(spacing: 2) {
            Image(systemName: icon).foregroundStyle(tint.resolve(scheme))
            Text(value).lkText(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme))
            Text(label).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity).padding(.vertical, LKSpacing.spaceSm)
        .tactile(fill: LKColor.surfaceContainer, radius: 16)
        .accessibilityElement(children: .combine)
    }
    private func block(_ title: String, _ text: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            Text(text).lkText(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

/// A short burst of confetti (≈ 1.6 s, deterministic positions). Not drawn with Reduce Motion.
struct Celebration: View {
    @State private var start = Date()
    @Environment(\.colorScheme) private var scheme
    private static let n = 28
    var body: some View {
        TimelineView(.animation) { tl in
            let t = tl.date.timeIntervalSince(start)
            Canvas { g, size in
                guard t < 1.8 else { return }
                let colors = [LKColor.secondaryContainer, LKColor.primaryContainer, LKColor.star, LKColor.tertiaryContainer]
                for i in 0..<Self.n {
                    let f = Double(i) / Double(Self.n)
                    let x = size.width * (0.1 + 0.8 * ((f * 7.31).truncatingRemainder(dividingBy: 1)))
                    let rise = 120 + 90 * ((f * 3.7).truncatingRemainder(dividingBy: 1))
                    let y = 40 + (-rise * sin(min(t, 0.6) / 0.6 * .pi / 2)) + 260 * max(0, t - 0.4) * max(0, t - 0.4) + 60
                    let a = max(0, 1 - t / 1.8)
                    var r = Path(roundedRect: CGRect(x: -4, y: -2, width: 8, height: 4), cornerRadius: 1)
                    r = r.applying(CGAffineTransform(rotationAngle: CGFloat(f * 9 + t * 4)).concatenating(CGAffineTransform(translationX: x, y: y)))
                    g.fill(r, with: .color(colors[i % colors.count].resolve(scheme).opacity(a)))
                }
            }
        }
        .frame(height: 360)
        .onAppear { start = Date() }
    }
}
