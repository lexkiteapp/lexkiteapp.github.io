import SwiftUI
import LKDesign
import LKStore
import LKCore
import LKStrings

// Shared building blocks of the P07 screens (Kit tokens only). Cards, chips, progress, buttons come from SkillCard / SkillProgress / SkillAction /
// SkillNote / StudyChip / StudyPage / LessonIconButton; this file adds the three things only speaking needs.

/// The round microphone button: idle · listening (pulse off with Reduce Motion) · blocked. 64 pt, label read out.
struct SpeakMic: View {
    enum State { case idle, listening, blocked }
    let state: State
    let label: String
    let action: () -> Void
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        let fill: LKDynamicColor = state == .listening ? LKColor.error : (state == .blocked ? LKColor.surfaceContainerHighest : LKColor.secondary)
        let ink: LKDynamicColor = state == .listening ? LKColor.onError : (state == .blocked ? LKColor.onSurfaceVariant : LKColor.onSecondary)
        Button(action: action) {
            Image(systemName: state == .listening ? "stop.fill" : (state == .blocked ? "mic.slash.fill" : "mic.fill"))
                .font(.system(size: 26, weight: .bold)).foregroundStyle(ink.resolve(scheme))
                .frame(width: 64, height: 64).background(Circle().fill(fill.resolve(scheme)))
                .overlay(Circle().stroke(fill.resolve(scheme).opacity(state == .listening && !reduceMotion ? 0.35 : 0), lineWidth: 8))
                .frame(minWidth: 72, minHeight: 72)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(state == .listening ? .isSelected : [])
    }
}

/// The words of a target sentence after an attempt: matched words in the success tone with ✓, the others in the error tone with a line under them
/// (never colour alone). English reads left to right inside the Arabic interface.
struct SpeakWords: View {
    let words: [SpeakScore.Word]
    var big = false
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        FlowLayout(spacing: 6) {
            ForEach(Array(words.enumerated()), id: \.offset) { _, w in
                HStack(spacing: 3) {
                    Image(systemName: w.ok ? "checkmark" : "minus").font(.system(size: 10, weight: .bold)).accessibilityHidden(true)
                    Text(verbatim: w.w).studyText(big ? LKType.titlePill : LKType.bodyMd, w.ok ? LKColor.success : LKColor.error).englishText().underline(!w.ok)
                }
                .padding(.horizontal, 8).padding(.vertical, 4)
                .foregroundStyle((w.ok ? LKColor.success : LKColor.error).resolve(scheme))
                .background(Capsule().fill((w.ok ? LKColor.success : LKColor.error).resolve(scheme).opacity(0.12)))
                .accessibilityElement(children: .combine)
            }
        }
        .environment(\.layoutDirection, .leftToRight)   // English word order inside the Arabic interface
    }
}

/// A teacher (Ama / Carlos) drawn with the app's own 2D character; the slot of the Stitch templates (`teacher-slot`). Not shown for tests with `live == false`.
struct SpeakTeacher: View {
    let controller: TeacherController
    var size: CGSize = CGSize(width: 110, height: 120)
    var body: some View { TeacherView(controller: controller).frame(width: size.width, height: size.height) }
}
