import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKCore
import LKStrings

/// #/call · Stitch call-list (list), call-ring (ring), teacher-call (the call) and call-result (summary) – one flow. Kit tokens only; the teacher is the app's
/// own 2D Ama / Carlos. What the Stitch mock-ups invented and the web does not have is NOT here (AI badge, quick surprise call, durations, "Part 1 questions",
/// examiner chip, estimated length, encouragement card, pronunciation / vocabulary percentages, target chip, alternatives, separate grammar tip).
struct CallFlowView: View {
    let model: CallFlowModel
    var onClose: () -> Void = {}
    var onRoute: (AppRoute) -> Void = { _ in }
    var body: some View {
        Group {
            switch model.screen {
            case .list: CallListView(model: model, onClose: onClose)
            case .ring(let s): CallRingView(model: model, script: s)
            case .call: if let r = model.run { CallRunView(model: r, onHang: { model.hang() }) }
            case .summary: if let m = model.summary { CallSummaryView(model: m, flow: model, onRoute: onRoute) }
            }
        }
        .task {
            await CallContentStore.refresh()
            model.adopt(CallContentStore.content)
        }
        .onDisappear { model.leave() }
    }
}

/// the privacy sentence of a recognition mode + its icon (the Stitch lock; cloud and keyboard for the other two)
struct CallPrivacyLine: View {
    let mode: CallAsr.Mode
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let p = CallAsr.privacy(mode)
        HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
            Image(systemName: CallPrivacyLine.symbol(mode)).font(.system(size: 14, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: t(CallAsr.shown(p.key))).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityElement(children: .combine)
    }
    static func symbol(_ m: CallAsr.Mode) -> String {
        switch m {
        case .local, .whisper, .ask: return "lock.fill"
        case .cloud: return "cloud.fill"
        case .tap: return "keyboard"
        }
    }
}

// MARK: - the list

struct CallListView: View {
    let model: CallFlowModel
    var onClose: () -> Void = {}
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        StudyPage(title: t(.callUiGoiChoAmaCarlos), onBack: onClose) {
            SkillCard {
                Text(verbatim: t(.callUiCuocGoiVideoLuyen)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            filters
            ForEach(model.shown, id: \.id) { s in card(s) }
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                CallPrivacyLine(mode: model.mode)
                if model.asrPref != nil {
                    Button { model.resetAsr() } label: {
                        Text(verbatim: t(.callUiDoiCachNhanDang)).studyText(LKType.labelMetric, LKColor.secondary).frame(minHeight: 44, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                }
                if model.asrNotice { SkillNote(icon: "info.circle.fill", text: t(.callUiLanGoiSauLexkite), tint: LKColor.onSurface) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityIdentifier("call-list")
    }

    private func label(_ g: String) -> String {
        switch g {
        case "all": return t(.vocabAll)
        case "ielts": return "IELTS"
        case "toeic": return "TOEIC"
        default: return t(.callUiDoiSong)
        }
    }
    private var filters: some View {
        FlowLayout(spacing: LKSpacing.spaceXs) {
            ForEach(CallList.groups, id: \.self) { g in
                let on = model.filter == g
                Button { model.setFilter(g) } label: {
                    Text(verbatim: label(g)).studyText(LKType.labelMetric, on ? LKColor.onSecondary : LKColor.onSurface)
                        .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 44)
                        .background(Capsule().fill((on ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(t(.callUiLocTheoKyThi))
    }
    private func title(_ s: CallScript) -> String {
        let k = model.nameKey(s)
        return k.isEmpty ? s.title : SpeakText.render(.string(k), t)
    }
    private func card(_ s: CallScript) -> some View {
        Button { model.openRing(s) } label: {
            SkillCard {
                HStack(spacing: LKSpacing.spaceSm) {
                    SpeakStill(who: s.who, pose: "happy").frame(width: 56, height: 56)
                        .background(Circle().fill(LKColor.surfaceContainerLow.resolve(scheme))).clipShape(Circle()).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(verbatim: s.em + " " + title(s)).studyText(LKType.titlePill).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                        HStack(spacing: LKSpacing.spaceXs) {
                            StudyChip(text: s.lv)
                            Text(verbatim: s.teacherName + " · " + s.title).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().lineLimit(2)
                        }
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "phone.fill").font(.system(size: 16, weight: .bold)).foregroundStyle(LKColor.onSecondary.resolve(scheme))
                        .frame(width: 44, height: 44).background(Circle().fill(LKColor.secondary.resolve(scheme))).accessibilityHidden(true)
                }
                .frame(minHeight: 56)
            }
        }
        .buttonStyle(LKPressStyle())
        .accessibilityElement(children: .combine)
    }
}

// MARK: - the ring

struct CallRingView: View {
    let model: CallFlowModel
    let script: CallScript
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        StudyPage(title: script.em + " " + (model.nameKey(script).isEmpty ? script.title : SpeakText.render(.string(model.nameKey(script)), t)), onBack: { model.toList() }) {
            HStack(spacing: LKSpacing.spaceXs) {
                StudyChip(text: script.lv)
                Text(verbatim: script.title).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).englishText()
            }
            SkillCard {
                VStack(spacing: LKSpacing.spaceSm) {
                    SpeakStill(who: script.who, pose: "happy").frame(width: 120, height: 160)
                        .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(LKColor.surfaceContainerLow.resolve(scheme))).accessibilityHidden(true)
                    (Text(verbatim: script.teacherName).fontWeight(.bold) + Text(verbatim: " – " + script.role))
                        .studyText(LKType.bodyMd).englishText().multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                    CallPrivacyLine(mode: model.mode)
                }
                .frame(maxWidth: .infinity)
            }
        }
        .safeAreaInset(edge: .bottom) {
            VStack(spacing: LKSpacing.spaceXs) {
                SkillAction(title: t(.callUiGoiNgay), icon: "phone.fill", primary: true) { model.startCall(script) }
                SkillAction(title: t(.callUiCuocGoiKhac)) { model.toList() }
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceSm)
            .frame(maxWidth: .infinity).background(LKColor.background.resolve(scheme).ignoresSafeArea(edges: .bottom))
        }
        .accessibilityIdentifier("call-ring")
    }
}
