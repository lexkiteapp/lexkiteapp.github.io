import SwiftUI
import LKDesign
import LKStore
import LKStrings
#if canImport(WebKit) && os(iOS)
import WebKit
#endif

/// #/reflex – Stitch reflex-run (focus: X + progress, one clock, Skip) and reflex-result (inner: summary + the last 3 lines).
struct ReflexScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        SkillsHost(make: { ReflexModel(ctx: $0, io: .live(voice: $0.core.voice)) }) { ReflexView(model: $0, onClose: { services.router.closeFocus() }) }
    }
}

struct ReflexView: View {
    let model: ReflexModel
    var onClose: () -> Void = {}
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: 0) {
            bar
            if model.isEmpty { empty } else { stageBody }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task { await model.load() }
        .onDisappear { model.leave() }
        .accessibilityIdentifier("reflex")
    }

    @ViewBuilder private var bar: some View {
        if case .finished = model.stage { TopBar(variant: .inner, title: t(.speakReflexPhanXa60Giay)) { onClose() } }
        else { TopBar(variant: .focus(progress: model.progress), title: t(.speakReflexPhanXa60Giay)) { onClose() } }
    }
    private var empty: some View {
        VStack(spacing: LKSpacing.spaceMd) {
            StudyEmpty(icon: "bolt.slash", title: t(.speakReflexChuaCoCauDe))
            Text(verbatim: t(.speakReflexMeoLuuCauTrong)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center).padding(.horizontal, LKFrame.shared.gutter)
        }
        .frame(maxHeight: .infinity)
    }

    private var stageBody: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: LKSpacing.spaceMd) {
                    if case .finished(let s) = model.stage { result(s) } else { run }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            buttons
        }
    }

    // MARK: running
    private var run: some View {
        VStack(spacing: LKSpacing.spaceMd) {
            PronCoachCard(controller: model.teacher, text: t(.speakReflexNgheMotCauNgan))
            dial
            SkillCard { card.frame(maxWidth: .infinity, minHeight: 200) }
            Text(verbatim: t(.speakReflexMeoLuuCauTrong)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
        }
    }
    private var dial: some View {
        ZStack {
            Circle().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 8)
            Circle().trim(from: 0, to: CGFloat(1 - model.progress)).stroke(LKColor.secondary.resolve(scheme), style: StrokeStyle(lineWidth: 8, lineCap: .round)).rotationEffect(.degrees(-90))
            Text(verbatim: String(model.left)).studyText(LKType.displayHero)
        }
        .frame(width: 120, height: 120)
        .accessibilityElement(children: .ignore).accessibilityLabel(Text(verbatim: String(model.left))).accessibilityAddTraits(.updatesFrequently)
    }
    @ViewBuilder private var card: some View {
        switch model.stage {
        case .idle, .finished: Image(systemName: "bolt.fill").font(.system(size: 40)).foregroundStyle(LKColor.tertiary.resolve(scheme)).accessibilityHidden(true)
        case .hearing(let embed):
            VStack(spacing: LKSpacing.spaceSm) {
                #if canImport(WebKit) && os(iOS)
                if let embed, let url = URL(string: embed) { ReflexEmbed(url: url).frame(height: 160).clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous)) }
                #endif
                Label { Text(verbatim: t(.speakReflexNgheKy)).studyText(LKType.headlineSm, LKColor.onSurfaceVariant) } icon: { Image(systemName: "headphones").foregroundStyle(LKColor.secondary.resolve(scheme)) }
            }
        case .speaking:
            VStack(spacing: LKSpacing.spaceSm) {
                SpeakMic(state: .listening, label: t(.speakReflexNhaiLaiCauVua)) {}
                Text(verbatim: t(.speakReflexNhaiLaiCauVua)).studyText(LKType.headlineSm).multilineTextAlignment(.center)
            }
        case .scored(let words, let heard, let pct):
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                SpeakWords(words: words, big: true)
                Text(verbatim: t(.speakReflexBanNoi) + ": “" + heard + "” · " + String(pct) + "%").studyText(LKType.bodyMd, LKColor.onSurfaceVariant).englishText().fixedSize(horizontal: false, vertical: true)
            }
        case .noHear:
            Text(verbatim: t(.speakReflexKhongNgheRoThu)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
        }
    }
    @ViewBuilder private var buttons: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            if !model.running {
                SkillAction(title: finishedLabel, icon: model.stage == .idle ? "play.fill" : "arrow.counterclockwise", primary: true) { model.start() }
            } else if model.nextVisible {
                SkillAction(title: t(.skillListenCauTiep), icon: "arrow.forward", primary: true) { model.next() }
            } else {
                SkillAction(title: t(.onbCommonSkip), icon: "forward.fill") { model.next() }
            }
        }
        .padding(.horizontal, LKFrame.shared.gutter).padding(.bottom, LKSpacing.spaceSm)
        .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
    }
    private var finishedLabel: String { if case .finished = model.stage { return t(.revPlayAgain) }; return t(.todayStart) }

    // MARK: result (reflex-result)
    private func result(_ s: ReflexCore.Summary) -> some View {
        VStack(spacing: LKSpacing.spaceMd) {
            PronCoachCard(controller: model.teacher, text: t(.speakReflexMeoLuuCauTrong))
            SkillCard {
                VStack(spacing: LKSpacing.spaceXs) {
                    Image(systemName: "flag.checkered").font(.system(size: 36, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                    Text(verbatim: t(.lettersTimeSUp)).studyText(LKType.headlineLg).accessibilityAddTraits(.isHeader)
                    Text(verbatim: t(.speakReflexNCauTrungBinh, ["n": s.n, "p": s.p])).studyText(LKType.titlePill, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
                    if let xp = s.reward?["xp"] { StudyChip(text: "+\(xp) XP", icon: "bolt.fill", tint: LKColor.tertiary) }
                }
                .frame(maxWidth: .infinity)
            }
            ForEach(Array(model.history.suffix(3).reversed().enumerated()), id: \.offset) { _, r in
                SkillCard {
                    VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                        HStack {
                            StudyChip(text: String(r.pct) + "%", icon: r.pct >= ReflexCore.goodPct ? "checkmark.circle.fill" : "exclamationmark.circle", tint: r.pct >= ReflexCore.goodPct ? LKColor.success : LKColor.error)
                            Spacer(minLength: 0)
                        }
                        SpeakWords(words: r.words)
                        Text(verbatim: t(.speakReflexBanNoi) + ": “" + r.heard + "”").studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }
}

#if canImport(WebKit) && os(iOS)
/// The 5-second YouTube embed (youtube-nocookie, autoplay, no controls) of a saved line
struct ReflexEmbed: UIViewRepresentable {
    let url: URL
    func makeUIView(context: Context) -> WKWebView {
        let c = WKWebViewConfiguration()
        c.allowsInlineMediaPlayback = true
        c.mediaTypesRequiringUserActionForPlayback = []
        let w = WKWebView(frame: .zero, configuration: c)
        w.isOpaque = false; w.scrollView.isScrollEnabled = false
        w.load(URLRequest(url: url))
        return w
    }
    func updateUIView(_ w: WKWebView, context: Context) { if w.url != url { w.load(URLRequest(url: url)) } }
}
#endif
