import SwiftUI
import Observation
import LKDesign
import LKStore
import LKSync
import LKStrings

/// #/handsfree – Stitch handsfree-run: X + progress, the word card (word · IPA · meaning · example), previous / play-pause / next, the two switches, the dark screen.
@MainActor @Observable
final class HandsfreeLoader {
    let ctx: SkillsContext
    let arg: String?
    private(set) var model: HandsfreeModel?
    init(ctx: SkillsContext, arg: String?) { self.ctx = ctx; self.arg = arg }
    func load() async { if model == nil { let m = await HandsfreeModel.make(ctx: ctx, arg: arg, voice: ctx.core.voice); m.start(); model = m } }
}

struct HandsfreeScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        SkillsHost(make: { HandsfreeLoader(ctx: $0, arg: route.arg) }) { HandsfreeHost(loader: $0, onClose: { services.router.closeFocus() }) }
    }
}

struct HandsfreeHost: View {
    let loader: HandsfreeLoader
    var onClose: () -> Void = {}
    var body: some View {
        Group {
            if let m = loader.model { HandsfreeView(model: m, onClose: onClose) } else { ProgressView().frame(maxWidth: .infinity, maxHeight: .infinity) }
        }
        .task { await loader.load() }
    }
}

struct HandsfreeView: View {
    @Bindable var model: HandsfreeModel
    var onClose: () -> Void = {}
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        ZStack {
            VStack(spacing: 0) {
                TopBar(variant: .focus(progress: model.progress), title: t(.speakHfHocRanhTay)) { model.leave(); onClose() }
                if model.isEmpty { empty } else { run }
            }
            if model.ambient { ambient }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .onDisappear { model.leave() }
        .accessibilityIdentifier("handsfree")
    }

    private var empty: some View {
        StudyEmpty(icon: "headphones", title: t(.speakHfChuaCoTuNao)).frame(maxHeight: .infinity)
    }

    private var run: some View {
        ScrollView {
            VStack(spacing: LKSpacing.spaceMd) {
                VStack(spacing: 4) {
                    Text(verbatim: t(.speakHfHocRanhTay)).studyText(LKType.headlineMd).accessibilityAddTraits(.isHeader)
                    Text(verbatim: t(.speakHfNgheTuNghiaVa)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                }
                HandsfreeWave(active: model.playing, animated: model.animate)
                wordCard
                controls
                switches
                Text(verbatim: "🔒 " + t(.speakHfKhoaManHinhVan, ["t": model.title.text(t)])).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
    }

    private var wordCard: some View {
        let w = model.word
        return SkillCard {
            VStack(spacing: LKSpacing.spaceXs) {
                HStack {
                    Spacer(minLength: 0)
                    Text(verbatim: model.position).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
                }
                Text(verbatim: w.s("word")).studyText(LKType.displayHero, LKColor.onSurface).englishText().multilineTextAlignment(.center).minimumScaleFactor(0.6).lineLimit(2)
                if !w.s("ipa").isEmpty { Text(verbatim: w.s("ipa")).studyText(LKType.bodyLg, LKColor.onSurfaceVariant).englishText() }
                Text(verbatim: model.meaning).studyText(LKType.headlineSm, LKColor.secondary).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                if !w.s("ex").isEmpty {
                    Text(verbatim: "“" + w.s("ex") + "”").studyText(LKType.bodyMd, LKColor.onSurfaceVariant).englishText().multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true).padding(.top, 4)
                }
            }
            .frame(maxWidth: .infinity, minHeight: 200)
        }
        .accessibilityElement(children: .combine)
    }

    private var controls: some View {
        HStack(spacing: LKSpacing.spaceLg) {
            round("backward.fill", t(.speakHfTuTruoc)) { model.previous() }
            Button { model.toggle() } label: {
                Image(systemName: model.playing ? "pause.fill" : "play.fill").font(.system(size: 28, weight: .bold)).foregroundStyle(LKColor.onPrimary.resolve(scheme))
                    .frame(width: 72, height: 72).background(Circle().fill(LKColor.primary.resolve(scheme)))
            }
            .buttonStyle(LKPressStyle()).accessibilityLabel(Text(verbatim: model.playing ? t(.skillListenTamDung) : t(.actionContinue)))
            round("forward.fill", t(.speakHfTuTiep)) { model.next() }
        }
    }
    private func round(_ icon: String, _ label: String, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon).font(.system(size: 20, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme))
                .frame(width: 52, height: 52).background(Circle().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
        }
        .buttonStyle(LKPressStyle()).accessibilityLabel(Text(verbatim: label))
    }

    private var switches: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            Toggle(isOn: Binding(get: { model.ex }, set: { model.setEx($0) })) { Text(verbatim: t(.vocabExampleSentence)).studyText(LKType.titlePill) }.toggleStyle(HandsfreeSwitchStyle())
            Toggle(isOn: Binding(get: { model.mean }, set: { model.setMean($0) })) { Text(verbatim: t(.speakHfDocNghiaKhiMo)).studyText(LKType.titlePill) }.toggleStyle(HandsfreeSwitchStyle())
            Button { model.ambient = true } label: {
                Label { Text(verbatim: t(.speakHfManToi)).studyText(LKType.titlePill, LKColor.secondary) } icon: { Image(systemName: "moon.fill").foregroundStyle(LKColor.secondary.resolve(scheme)) }
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .buttonStyle(StudyOutlineButtonStyle())
        }
        .tint(LKColor.secondary.resolve(scheme))
        .frame(maxWidth: .infinity)
    }

    /// the dark screen: the theme's darkest token surface (dark theme: surfaceContainerLowest · light theme: inverseSurface, a deep teal) with the matching ink,
    /// the word dim, one big tap area to come back; playback goes on
    private var ambient: some View {
        let dark = scheme == .dark
        let bg: LKDynamicColor = dark ? LKColor.surfaceContainerLowest : LKColor.inverseSurface
        let ink: LKDynamicColor = dark ? LKColor.onSurfaceVariant : LKColor.inverseOnSurface
        return ZStack {
            bg.resolve(scheme).ignoresSafeArea()
            VStack(spacing: LKSpacing.spaceMd) {
                Text(verbatim: model.word.s("word")).studyText(LKType.displayHero, ink).englishText().opacity(0.7)
                Text(verbatim: model.position).studyText(LKType.labelMetric, ink).opacity(0.7)
                Text(verbatim: "🔒 " + t(.speakHfKhoaManHinhVan, ["t": model.title.text(t)])).studyText(LKType.bodySm, ink).multilineTextAlignment(.center).opacity(0.7)
                    .padding(.horizontal, LKSpacing.spaceLg)
            }
            VStack {
                HStack {
                    Spacer()
                    Button { model.ambient = false } label: {
                        Image(systemName: "xmark").font(.system(size: 20, weight: .bold)).foregroundStyle(ink.resolve(scheme))
                            .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle())
                    }
                    .accessibilityLabel(Text(verbatim: t(.actionClose)))
                }
                Spacer()
            }
            .padding(LKSpacing.spaceXs)
        }
    }
}

/// five soundwave bars (still with Reduce Motion or when paused)
struct HandsfreeWave: View {
    let active: Bool
    var animated = true
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        TimelineView(.animation(minimumInterval: 0.25, paused: !active || !animated || reduceMotion)) { tl in
            HStack(alignment: .center, spacing: 6) {
                ForEach(0..<5, id: \.self) { i in
                    Capsule().fill(LKColor.secondary.resolve(scheme)).frame(width: 6, height: height(i, tl.date))
                }
            }
            .frame(height: 36)
        }
        .accessibilityHidden(true)
    }
    private func height(_ i: Int, _ d: Date) -> CGFloat {
        guard active, animated, !reduceMotion else { return CGFloat(10 + (i % 3) * 6) }
        return CGFloat(10 + abs(sin(d.timeIntervalSinceReferenceDate * 3 + Double(i))) * 22)
    }
}


/// A switch drawn in SwiftUI (track + knob) so it looks the same on a device and in the offscreen snapshot, where the system switch showed no knob. Still a `Toggle` for VoiceOver.
struct HandsfreeSwitchStyle: ToggleStyle {
    @Environment(\.colorScheme) private var scheme
    func makeBody(configuration: Configuration) -> some View {
        Button { configuration.isOn.toggle() } label: {
            HStack(spacing: LKSpacing.spaceSm) {
                configuration.label
                Spacer(minLength: 0)
                Capsule().fill((configuration.isOn ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)).frame(width: 52, height: 32)
                    .overlay(Capsule().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: configuration.isOn ? 0 : 2))
                    .overlay(alignment: configuration.isOn ? .trailing : .leading) {
                        Circle().fill((configuration.isOn ? LKColor.onSecondary : LKColor.outline).resolve(scheme)).frame(width: 24, height: 24).padding(4)
                    }
                    .environment(\.layoutDirection, .leftToRight)
            }
            .frame(minHeight: 48)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(configuration.isOn ? .isSelected : [])
    }
}
