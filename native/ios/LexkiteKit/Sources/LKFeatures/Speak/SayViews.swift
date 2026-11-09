import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKCore
import LKStrings

/// #/say – Stitch say-list · say-front · say-back (brand/stitch/v2). Kit tokens only; the teacher is the app's own 2D character still (no picture from the HTML).
struct SayScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        SkillsHost(make: { SayModel(ctx: $0, io: .live(voice: $0.core.voice), arg: route.arg) }) { SayView(model: $0, onClose: { services.router.closeFocus() }) }
    }
}

/// A teacher still in a box (nothing when the picture is not there yet; it is decoration, hidden from VoiceOver)
struct SpeakStill: View {
    let who: String, pose: String
    var body: some View {
        #if canImport(UIKit)
        TeacherStill(who: who, pose: pose.isEmpty ? "happy" : pose)
        #else
        Color.clear
        #endif
    }
}

struct SayView: View {
    @Bindable var model: SayModel
    var onClose: () -> Void = {}
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .inner, title: t(.speakSayNoiNhuNguoiBan)) { if !model.back() { onClose() } }
            content
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task { await model.load() }
        .sheet(isPresented: $model.showShare) { SayShareSheet(model: model) }
        .accessibilityIdentifier("say-\(model.phase == .card ? (model.flipped ? "back" : "front") : "list")")
    }

    @ViewBuilder private var content: some View {
        switch model.phase {
        case .loading: ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity)
        case .error: StudyEmpty(icon: "wifi.slash", title: t(.revDownloadFailedTryAgain), action: (title: t(.actionRetry), run: { model.retry() }))
        case .list: SayList(model: model)
        case .card: if model.flipped { SayBack(model: model) } else { SayFront(model: model) }
        }
    }
}

private func sayColumn<C: View>(@ViewBuilder _ c: () -> C) -> some View {
    ScrollView {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) { c() }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
    }
    .scrollIndicators(.hidden)
}

// MARK: - list (say-list)

struct SayList: View {
    let model: SayModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        sayColumn {
            Text(verbatim: t(.speakSayCauNguoiBanXu)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            ForEach(model.rows, id: \.series) { r in row(r) }
        }
    }
    private func row(_ r: SayCore.Row) -> some View {
        let name = TeacherRigStore.shared.def.people[r.teacher]?.name ?? r.teacher
        return Button { model.openFirst(r) } label: {
            HStack(spacing: LKSpacing.spaceSm) {
                SpeakStill(who: r.teacher, pose: "happy").frame(width: 64, height: 64)
                    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerLow.resolve(scheme)))
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: r.title).studyText(LKType.titlePill).englishText().lineLimit(2)
                    Text(verbatim: SayCore.progress(r, teacherName: name).text(t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    SkillProgress(value: Double(r.pct) / 100).frame(maxWidth: 170)
                }
                Spacer(minLength: 0)
                Image(systemName: "chevron.forward").font(.system(size: 16, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
            }
            .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 88)
            .tactile(fill: LKColor.surfaceContainerHighest, line: LKColor.outlineVariant, ledge: LKColor.outlineVariant, radius: 16)
        }
        .buttonStyle(LKPressStyle())
        .accessibilityLabel(Text(verbatim: r.title + ". " + SayCore.progress(r, teacherName: name).text(t)))
    }
}

// MARK: - front (say-front)

struct SayFront: View {
    let model: SayModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let f = model.front
        VStack(spacing: 0) {
            sayColumn {
                header(f)
                card(f).contentShape(Rectangle()).onTapGesture { model.flip() }
                    .accessibilityElement(children: .contain).accessibilityAddTraits(.isButton)
                    .accessibilityAction(named: Text(verbatim: t(.speakSayLatTheXemNghia))) { model.flip() }
                micLine
            }
            actions
        }
    }
    private func header(_ f: SayCore.Front) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            HStack {
                StudyChip(text: f.series, icon: "text.book.closed")
                Spacer(minLength: 0)
                Text(verbatim: f.step.text(t)).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
            }
            SkillProgress(value: f.pct / 100)
        }
    }
    private func card(_ f: SayCore.Front) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack {
                    StudyChip(text: f.regLbl.text(t), tint: LKColor.success)
                    Spacer(minLength: 0)
                    LessonIconButton(system: "speaker.wave.2.fill", label: t(.speakSayNgheTuTon), action: { model.speak(slow: false) }, prominent: true)
                }
                Text(verbatim: "“" + f.say + "”").studyText(LKType.headlineLg, LKColor.primary).englishText().multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                if !f.ipa.isEmpty {
                    HStack(spacing: 6) {
                        Image(systemName: "waveform").font(.system(size: 13, weight: .bold)).accessibilityHidden(true)
                        Text(verbatim: f.ipa).studyText(LKType.bodyMd).englishText()
                    }
                    .padding(.horizontal, LKSpacing.spaceSm).padding(.vertical, 6)
                    .background(Capsule().fill(LKColor.surfaceContainerLow.resolve(scheme)))
                }
                HStack(alignment: .bottom) {
                    Label { Text(verbatim: t(.speakSayChamDeLat)).studyText(LKType.bodySm, LKColor.onSurfaceVariant) } icon: { Image(systemName: "arrow.triangle.2.circlepath").foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
                    Spacer(minLength: 0)
                    SpeakStill(who: f.teacher, pose: f.pose).frame(width: 120, height: 130)
                }
            }
        }
    }
    @ViewBuilder private var micLine: some View {
        if let line = model.micLine {
            Text(verbatim: line.text(t) + (model.micHeard.isEmpty ? "" : " · “" + model.micHeard + "”")).studyText(LKType.titlePill, LKColor.secondary)
                .frame(maxWidth: .infinity).multilineTextAlignment(.center).accessibilityAddTraits(.updatesFrequently)
        }
    }
    private var actions: some View {
        HStack(spacing: LKSpacing.spaceSm) {
            SkillAction(title: t(.speakSayNgheTuTon), icon: "headphones") { model.speak(slow: true) }
            SpeakMic(state: model.mic, label: t(.speakSayTuNoiThu)) { Task { await model.toggleMic() } }
            SkillAction(title: t(.speakSayChiaSe), icon: "square.and.arrow.up") { model.showShare = true }
        }
        .padding(.horizontal, LKFrame.shared.gutter).padding(.bottom, LKSpacing.spaceSm)
        .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
    }
}

// MARK: - back (say-back)

struct SayBack: View {
    let model: SayModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let b = model.back(langName: { Locale(identifier: model.ctx.lang).localizedString(forLanguageCode: $0)?.localizedCapitalized ?? $0 })
        VStack(spacing: 0) {
            sayColumn {
                tipRow(b)
                card(b)
                micLine
            }
            HStack(spacing: LKSpacing.spaceSm) {
                SpeakMic(state: model.mic, label: t(.speakSayTuNoiThu)) { Task { await model.toggleMic() } }
                SkillAction(title: t(.speakSayTheTiep), icon: "arrow.forward", primary: true) { model.nextCard() }
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.bottom, LKSpacing.spaceSm)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
        }
    }
    private func tipRow(_ b: SayCore.Back) -> some View {
        HStack(alignment: .bottom, spacing: LKSpacing.spaceSm) {
            SpeakStill(who: b.teacher, pose: b.pose).frame(width: 96, height: 110)
            SkillCard {
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: t(.speakSayMeoHay)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
                    if !b.react.isEmpty { Text(verbatim: b.react.text(t)).studyText(LKType.titlePill) }
                    Text(verbatim: b.def).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText()
                }
            }
        }
    }
    private func card(_ b: SayCore.Back) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack {
                    StudyChip(text: b.regLbl.text(t), tint: LKColor.success)
                    Spacer(minLength: 0)
                    LessonIconButton(system: "speaker.wave.2.fill", label: t(.speakSayNgheTuTon), action: { model.speak(slow: false) }, prominent: true)
                }
                Text(verbatim: t(.speakSayCauCanHoc)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).textCase(.uppercase)
                Text(verbatim: b.say).studyText(LKType.headlineMd, LKColor.primary).englishText().fixedSize(horizontal: false, vertical: true)
                meaning(b)
                if !b.when.isEmpty {
                    Divider()
                    Text(verbatim: t(.speakSayDungKhi)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
                    Text(verbatim: "“" + b.when + "”").studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
                }
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                    if !b.dont.isEmpty { mini(title: t(.speakSayDungNoi), reg: b.dontReg.text(t), text: b.dont, why: b.dontWhy.text(t), aria: b.dontAria.text(t), tint: LKColor.error) }
                    if !b.swap.isEmpty { mini(title: t(.speakSayNoiTheNay), reg: b.swapReg.text(t), text: b.swap, why: b.swapWhy.text(t), aria: b.swap, tint: LKColor.success) }
                }
            }
        }
    }
    private func meaning(_ b: SayCore.Back) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: b.mLbl.text(t)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            Text(verbatim: b.meaning).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
            if !b.real.isEmpty { Text(verbatim: b.real.text(t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
        }
    }
    private func mini(title: String, reg: String, text: String, why: String, aria: String, tint: LKDynamicColor) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: title).studyText(LKType.labelBadge, tint).textCase(.uppercase)
            Text(verbatim: reg).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            Text(verbatim: text).studyText(LKType.titlePill).englishText().fixedSize(horizontal: false, vertical: true).accessibilityLabel(Text(verbatim: aria))
            Text(verbatim: why).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        }
        .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(tint.resolve(scheme).opacity(0.12)))
        .accessibilityElement(children: .combine)
    }
    @ViewBuilder private var micLine: some View {
        if let line = model.micLine {
            Text(verbatim: line.text(t) + (model.micHeard.isEmpty ? "" : " · “" + model.micHeard + "”")).studyText(LKType.titlePill, LKColor.secondary)
                .frame(maxWidth: .infinity).multilineTextAlignment(.center)
        }
    }
}

// MARK: - share (1:1 / 4:5 image + link)

/// the card picture, drawn on the device: teal ground, cream card, register pill, the sentence in “…”, the meaning in coral, "Use it when", teacher, link
struct SayShareImage: View {
    let s: JSON, it: JSON, meaning: String, tall: Bool, l10n: L10n
    var body: some View {
        let size = SayCore.imageSize(tall: tall)
        let teacher = s.s("teacher"), name = TeacherRigStore.shared.def.people[teacher]?.name ?? teacher
        ZStack(alignment: .topLeading) {
            LKColor.inverseSurface.resolve(.light)
            VStack(alignment: .leading, spacing: 28) {
                Text(verbatim: l10n(.speakSayNoiNhuNguoiBan)).font(.system(size: 40, weight: .heavy)).foregroundStyle(LKColor.inverseOnSurface.resolve(.light))
                VStack(alignment: .leading, spacing: 24) {
                    Text(verbatim: SayCore.register(it.s("reg")).text(l10n)).font(.system(size: 30, weight: .heavy)).foregroundStyle(LKColor.onSecondary.resolve(.light))
                        .padding(.horizontal, 28).padding(.vertical, 12).background(Capsule().fill(LKColor.secondary.resolve(.light)))
                    Text(verbatim: "“" + it.s("say") + "”").font(.system(size: tall ? 76 : 68, weight: .heavy)).foregroundStyle(LKColor.onSurface.resolve(.light)).lineLimit(4).minimumScaleFactor(0.6)
                    Text(verbatim: meaning).font(.system(size: 40, weight: .bold)).foregroundStyle(LKColor.primary.resolve(.light)).lineLimit(3)
                    Text(verbatim: l10n(.speakSayDungKhi) + ": " + it.s("when")).font(.system(size: 32, weight: .semibold)).foregroundStyle(LKColor.onSurfaceVariant.resolve(.light)).lineLimit(3)
                    Spacer(minLength: 0)
                }
                .padding(48).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .background(RoundedRectangle(cornerRadius: 56, style: .continuous).fill(LKColor.surface.resolve(.light)))
                VStack(alignment: .leading, spacing: 8) {
                    Text(verbatim: "lexkite.com").font(.system(size: 40, weight: .heavy)).foregroundStyle(LKColor.inverseOnSurface.resolve(.light))
                    Text(verbatim: l10n(.speakSayLuyenNoiCauNay, ["name": name])).font(.system(size: 28, weight: .semibold)).foregroundStyle(LKColor.inverseOnSurface.resolve(.light))
                }
            }
            .padding(72)
        }
        .frame(width: CGFloat(size.w), height: CGFloat(size.h))
        .environment(\.layoutDirection, l10n.isRTL ? .rightToLeft : .leftToRight)
    }
}

struct SayShareSheet: View {
    @Bindable var model: SayModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var file: URL?
    var body: some View {
        let b = model.back(langName: { $0 })
        VStack(spacing: LKSpacing.spaceMd) {
            Text(verbatim: t(.speakSayChiaSeThe)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
            HStack(spacing: LKSpacing.spaceXs) {
                formatButton(t(.speakSayVuong11), tall: false)
                formatButton(t(.speakSayDoc45), tall: true)
            }
            SayShareImage(s: model.current, it: model.item, meaning: b.meaning, tall: model.shareTall, l10n: t)
                .scaleEffect(0.28, anchor: .top).frame(width: 302, height: model.shareTall ? 378 : 302)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous)).accessibilityLabel(Text(verbatim: model.item.s("say")))
            HStack(spacing: LKSpacing.spaceSm) {
                if let file { ShareLink(item: file, message: Text(verbatim: model.shareText.text(t))) { Label { Text(verbatim: t(.speakSayChiaSe)) } icon: { Image(systemName: "square.and.arrow.up") } }.buttonStyle(PrimaryButtonStyle()) }
                SkillAction(title: t(.speakSayChepLink), icon: "link") { model.copyLink() }
            }
            if let n = model.notice { Text(verbatim: n.text(t)).studyText(LKType.bodySm, LKColor.secondary) }
        }
        .padding(LKFrame.shared.gutter)
        .presentationDetents([.large])
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task(id: model.shareTall) { file = model.shareFile(tall: model.shareTall, view: SayShareImage(s: model.current, it: model.item, meaning: b.meaning, tall: model.shareTall, l10n: t)) }
    }
    private func formatButton(_ title: String, tall: Bool) -> some View {
        Button { model.shareTall = tall } label: {
            Text(verbatim: title).studyText(LKType.titlePill, model.shareTall == tall ? LKColor.onSecondary : LKColor.onSurface).padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 44)
                .background(Capsule().fill((model.shareTall == tall ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
        }
        .buttonStyle(.plain).accessibilityAddTraits(model.shareTall == tall ? .isSelected : [])
    }
}
