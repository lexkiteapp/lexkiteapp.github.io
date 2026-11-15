import SwiftUI
import LKDesign
import LKStrings
import LKCore

/// Story / radio stage (Stitch story-duo): Ama and Carlos side by side, the speaker lifted, the dialogue as a chat log (radio: sound only, no text).
struct LessonStoryStage: View {
    let model: LessonModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        VStack(spacing: LKSpacing.spaceMd) {
            HStack(alignment: .bottom, spacing: LKSpacing.spaceMd) {
                seat(model.teacher, who: "ama")
                if let c = model.teacher2 { seat(c, who: "carlos") }
            }
            .frame(height: 150).frame(maxWidth: .infinity)
            .accessibilityHidden(true)
            VStack(spacing: LKSpacing.spaceXs) {
                ForEach(model.log.suffix(6), id: \.id) { line in bubble(line) }
            }
        }
    }

    private func seat(_ c: TeacherController, who: String) -> some View {
        let on = model.speaking == who
        return TeacherView(controller: c).frame(width: 120, height: 146)
            .scaleEffect(on && !reduceMotion ? 1.06 : 1, anchor: .bottom)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: on)
    }

    private func bubble(_ line: LessonItem) -> some View {
        let carlos = line.who == "carlos"
        return HStack {
            if carlos { Spacer(minLength: 40) }
            Button { model.say(line.sent ?? "", who: line.who ?? "ama") } label: {
                VStack(alignment: carlos ? .trailing : .leading, spacing: 2) {
                    Text(TeacherRigStore.shared.def.people[carlos ? "carlos" : "ama"]?.name ?? "").lkText(LKType.labelBadge).foregroundStyle(LKColor.secondary.resolve(scheme))
                    if line.radio == true { Image(systemName: "waveform").foregroundStyle(LKColor.onSurface.resolve(scheme)) }
                    else { Text(line.sent ?? "").lkText(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).multilineTextAlignment(.leading).englishText() }
                }
                .padding(LKSpacing.spaceSm)
                .frame(minHeight: LKFrame.shared.minTap)
                .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill((carlos ? LKColor.surfaceContainerHigh : LKColor.surfaceContainer).resolve(scheme)))
                .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
            }
            .buttonStyle(.plain)
            .accessibilityLabel(line.radio == true ? t(.lessonReplay) : (line.sent ?? ""))
            if !carlos { Spacer(minLength: 40) }
        }
        .frame(maxWidth: .infinity)
    }
}
