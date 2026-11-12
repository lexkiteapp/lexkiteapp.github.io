import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKCore
import LKStrings

/// The call itself · Stitch `teacher-call` (the web's v2 branch): close X + progress bar, the LIVE pill and the subtitle switch, the teacher's room, the
/// caption card (what Ama / Carlos says, the translation, what you said), the tip row (gentle fix · sound-pair hint · "Gợi ý trả lời") with the privacy and
/// typing buttons, the suggestions, and the speaker · microphone · end buttons. The long-turn clock, the preparation countdown and the choice of the
/// recognition way sit between the captions and the tip row when the call needs them.
struct CallRunView: View {
    @Bindable var model: CallRunModel
    var onHang: () -> Void = {}
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var optionsOpen = true
    @State private var privacyShown = false

    private var s: CallSession { model.session }

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: Double(s.progress) / 100), title: "", onExit: onHang)
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    HStack {
                        Text(verbatim: t(.callUiCuocGoiLuyenTap)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
                        Spacer(minLength: 0)
                        Text(verbatim: "\(s.progress)%").studyText(LKType.labelBadge, LKColor.secondary)
                    }
                    .accessibilityElement(children: .combine)
                    metaRow
                    stage
                    captionCard
                    if let cue = s.cue { cueCard(cue) }
                    if let choices = s.ask { askCard(choices) }
                    tipArea
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.space2xs).padding(.bottom, LKSpacing.spaceLg)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            controls
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .overlay(alignment: .top) { toastView }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(t(.callUiCuocGoiVoiName, ["name": s.teacherName]))
        .accessibilityIdentifier("call-run")
    }

    // MARK: top rows
    private var metaRow: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            HStack(spacing: 6) {
                Circle().fill(LKColor.primaryContainer.resolve(scheme)).frame(width: 8, height: 8).accessibilityHidden(true)
                Text(verbatim: t(.callUiTrucTiep)).studyText(LKType.labelBadge)
                Text(verbatim: CallClock.mmss(model.elapsed)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            }
            .padding(.horizontal, LKSpacing.spaceSm).padding(.vertical, 6)
            .background(Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
            .accessibilityElement(children: .combine)
            StudyChip(text: s.script.lv)
            Text(verbatim: s.script.title).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().lineLimit(1)
            Spacer(minLength: 0)
            if model.canTranslate {
                Button { s.toggleTranslation() } label: {
                    Text(verbatim: "Aa").studyText(LKType.labelMetric, s.showTranslation ? LKColor.onSecondary : LKColor.onSurface)
                        .frame(width: 36, height: 36)
                        .background(Circle().fill((s.showTranslation ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(t(.callUiBatTatPhuDe))
                .accessibilityAddTraits(s.showTranslation ? .isSelected : [])
            }
        }
    }

    private var stage: some View {
        ZStack(alignment: .bottom) {
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .fill(LinearGradient(colors: [LKColor.surfaceContainerLow.resolve(scheme), LKColor.surfaceContainerHighest.resolve(scheme)], startPoint: .top, endPoint: .bottom))
            SpeakTeacher(controller: model.teacher, size: CGSize(width: 220, height: 180)).padding(.bottom, 30) // the caption below has its own strip (Arabic / long names wrap)
            VStack {
                HStack {
                    HStack(spacing: 4) {
                        Image(systemName: "video.fill").font(.system(size: 12, weight: .bold)).accessibilityHidden(true)
                        Text(verbatim: t(.callUiPhongGiaoVien)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
                    }
                    .foregroundStyle(LKColor.secondary.resolve(scheme))
                    .padding(.horizontal, LKSpacing.spaceSm).padding(.vertical, 4)
                    .background(Capsule().fill(LKColor.surfaceContainer.resolve(scheme).opacity(0.85)))
                    Spacer()
                }
                Spacer()
            }
            .padding(LKSpacing.spaceSm)
        }
        .frame(height: 230)
        .overlay(alignment: .bottom) {
            Text(verbatim: s.status).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).lineLimit(1).minimumScaleFactor(0.8).padding(.horizontal, LKSpacing.spaceSm).frame(height: 30)
        }
    }

    // MARK: captions
    private var captionCard: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                HStack(spacing: LKSpacing.spaceXs) {
                    StudyChip(text: s.teacherName, icon: "music.note")
                    Image(systemName: "waveform").font(.system(size: 14, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme))
                        .symbolEffect(.variableColor.iterative.reversing, isActive: !reduceMotion && (s.phase == .talk || s.phase == .listen)).accessibilityHidden(true)
                    Spacer(minLength: 0)
                }
                Text(verbatim: s.captions.joined(separator: " ")).studyText(LKType.bodyLg).englishText()
                    .frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.updatesFrequently)
                if let tr = model.translatedLine { Text(verbatim: tr).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                if !s.you.isEmpty {
                    Text(verbatim: s.you).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText()
                        .frame(maxWidth: .infinity, alignment: .trailing).fixedSize(horizontal: false, vertical: true)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    // MARK: Part 2 · the clock
    private func cueCard(_ cue: CallCue) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                HStack(alignment: .firstTextBaseline) {
                    if cue.kind == .prep { Text(verbatim: cue.title ?? "").studyText(LKType.titlePill).englishText().fixedSize(horizontal: false, vertical: true) }
                    else { Text(verbatim: t(.callUiLuotNoiDai1)).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true) }
                    Spacer(minLength: 0)
                    if let c = s.clock { Text(verbatim: c).studyText(LKType.headlineSm, LKColor.secondary).accessibilityHidden(true) }
                }
                if !cue.points.isEmpty {
                    Text(verbatim: t(.callUiBanNenNoi)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    ForEach(Array(cue.points.enumerated()), id: \.offset) { _, p in
                        Text(verbatim: "• " + p).studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
                    }
                }
                if cue.hasDone {
                    HStack(spacing: LKSpacing.spaceSm) {
                        SkillAction(title: "✓ " + t(.callUiToiNoiXong)) { s.longDone() }.fixedSize()
                        if let n = s.longWords { Text(verbatim: Bidi.isolate(t(.vocabWords, ["n": n]))).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
                    }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .contain)
    }

    // MARK: how to recognise (asked once, never silently the cloud)
    private func askCard(_ choices: [CallAskChoice]) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                HStack(spacing: LKSpacing.spaceXs) {
                    Image(systemName: "mic.fill").foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                    Text(verbatim: t(.callUiChonCachNhanDang)).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
                }
                ForEach(choices, id: \.self) { c in
                    Button { s.askPick(c) } label: {
                        HStack(spacing: LKSpacing.spaceXs) {
                            Image(systemName: c == .tap ? "keyboard" : (c == .cloud ? "cloud.fill" : "lock.fill")).accessibilityHidden(true)
                            Text(verbatim: askLabel(c)).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                        }
                        .studyText(LKType.bodyMd)
                        .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
                        .tactile(fill: LKColor.surfaceContainerHigh, line: LKColor.outlineVariant, radius: 12)
                    }
                    .buttonStyle(LKPressStyle())
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .contain)
    }
    private func askLabel(_ c: CallAskChoice) -> String {
        switch c {
        case .chrome: return t(.callUiTaiGoiNhanDang)
        case .device: return t(.callUiNhanDangTrenMay)
        case .cloud: return t(CallAsr.shown(.callUiDungDichVuCua))
        case .tap: return t(.callUiChiChamGoiY)
        }
    }

    // MARK: tip row + suggestions + typing
    private var tipArea: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            HStack(alignment: .top, spacing: 0) {
                Button { optionsOpen.toggle() } label: {
                    Image(systemName: optionsOpen ? "chevron.up" : "chevron.down").font(.system(size: 14, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme))
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(t(.callUiGoiYTraLoi))
                .accessibilityAddTraits(optionsOpen ? .isSelected : [])
                tipText.padding(.top, 10).frame(maxWidth: .infinity, alignment: .leading)
                Button { privacyShown.toggle() } label: {
                    Image(systemName: CallPrivacyLine.symbol(s.mode)).font(.system(size: 16, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme))
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(t(CallAsr.shown(CallAsr.privacy(s.mode).key)))
                Button { s.toggleTyping() } label: {
                    Image(systemName: "keyboard").font(.system(size: 16, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme))
                        .frame(width: 44, height: 44).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(t(.callUiGoCauTraLoi))
                .accessibilityAddTraits(s.typeOpen ? .isSelected : [])
            }
            if privacyShown { CallPrivacyLine(mode: s.mode).padding(.horizontal, LKSpacing.spaceSm) }
            if optionsOpen { suggestions }
            if s.typeOpen { typing }
        }
    }
    @ViewBuilder private var tipText: some View {
        switch s.tip {
        case .hint:
            Text(verbatim: t(.callUiGoiYTraLoi)).studyText(LKType.titlePill)
        case .fix(let f):
            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: t(.callUiNameHieuYBan, ["name": s.teacherName])).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true) // web call.js: the gentle-fix intro line
                (Text(verbatim: f.bad).strikethrough() + Text(verbatim: " → ") + Text(verbatim: f.good).fontWeight(.bold))
                    .studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
                Text(verbatim: t(f.why)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            }
        case .slip(let said, let meant):
            Text(verbatim: "👂 " + t(.callUiNgheGiongSaidBan, ["said": said, "meant": meant])).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
        }
    }
    private var suggestions: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            ForEach(Array(s.options.enumerated()), id: \.offset) { i, o in
                Button { s.tapOption(i) } label: {
                    Text(verbatim: o).studyText(LKType.labelMetric, LKColor.secondary).englishText().multilineTextAlignment(.leading)
                        .fixedSize(horizontal: false, vertical: true)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, LKSpacing.spaceSm).padding(.vertical, 10).frame(minHeight: 44)
                        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainerHighest.resolve(scheme)))
                }
                .buttonStyle(LKPressStyle())
            }
        }
    }
    private var typing: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            TextField(t(.callUiHoacGoCauTra), text: $model.input)
                .textInputAutocapitalization(.never).autocorrectionDisabled().englishText()
                .submitLabel(.send).onSubmit { model.send() }
                .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 48)
                .tactile(fill: LKColor.surfaceContainerHigh, line: LKColor.outlineVariant, radius: 14)
                .accessibilityLabel(t(.callUiGoCauTraLoi))
            SkillAction(title: t(.speakRpGui), icon: "paperplane.fill", enabled: !model.input.trimmingCharacters(in: .whitespaces).isEmpty) { model.send() }.fixedSize()
        }
    }

    // MARK: speaker · microphone · end
    private var controls: some View {
        HStack(alignment: .top, spacing: LKSpacing.spaceLg) {
            VStack(spacing: 4) {
                Button { s.replay() } label: {
                    Image(systemName: "speaker.wave.2.fill").font(.system(size: 20, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme))
                        .frame(width: 56, height: 56).background(Circle().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
                        .frame(width: 72, height: 72).contentShape(Rectangle())
                }
                .buttonStyle(.plain).accessibilityLabel(t(.lessonReplay))
                Text(verbatim: t(.lessonReplay)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            }
            VStack(spacing: 4) {
                SpeakMic(state: s.listening ? .listening : (s.micDisabled ? .blocked : .idle), label: s.listening ? t(.callUiDungNghe) : t(.lessonKindSpeak)) { s.micPressed() }
                    .disabled(s.micDisabled)
                Text(verbatim: s.listening ? t(.callUiDangNghe) : t(.lessonKindSpeak)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            }
            VStack(spacing: 4) {
                Button(action: onHang) {
                    Image(systemName: "phone.down.fill").font(.system(size: 22, weight: .bold)).foregroundStyle(LKColor.onError.resolve(scheme))
                        .frame(width: 56, height: 56).background(Circle().fill(LKColor.error.resolve(scheme)))
                        .frame(width: 72, height: 72).contentShape(Rectangle())
                }
                .buttonStyle(.plain).accessibilityLabel(t(.callUiKetThucCuocGoi))
                Text(verbatim: t(.callUiKetThuc)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            }
        }
        .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.spaceXs)
        .frame(maxWidth: .infinity)
        .background(LKColor.surfaceContainerLow.resolve(scheme).ignoresSafeArea(edges: .bottom))
    }

    // MARK: messages
    @ViewBuilder private var toastView: some View {
        if let tt = model.toast {
            let text: String = {
                switch tt {
                case .tapOnly: return t(.callUiTrenThietBiNay)
                case .recError(let code, _): return SpeakErrors.message(code, t)
                }
            }()
            SkillNote(icon: "info.circle.fill", text: text, tint: LKColor.onSurface)
                .padding(LKSpacing.spaceSm).frame(maxWidth: LKFrame.shared.width, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.tertiaryContainer.resolve(scheme)))
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, 64)
                .task(id: tt) {
                    var ms = 3500
                    if case .recError(_, let m) = tt { ms = m }
                    try? await Task.sleep(nanoseconds: UInt64(ms) * 1_000_000)
                    if model.toast == tt { model.clearToast() }
                }
        }
    }
}
