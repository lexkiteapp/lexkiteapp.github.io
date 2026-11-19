import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync
import LKCore

/// Three stars (earned ones filled): the count is also read out, never colour alone.
struct SpeakStars: View {
    let n: Int
    var size: CGFloat = 16
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    var body: some View {
        HStack(spacing: 2) {
            ForEach(0..<3, id: \.self) { k in
                Image(systemName: k < n ? "star.fill" : "star").font(.system(size: size, weight: .bold))
                    .foregroundStyle((k < n ? LKColor.tertiary : LKColor.outlineVariant).resolve(scheme))
            }
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(t(.speakSpN3Sao, ["n": n]))
    }
}

// MARK: - #/speak/<id>

/// Stitch `pas-sit`: coach + mission cue, the adventure path (stage nodes with stars), the mission checklist, mastery + weekly goal, words from the add-on, start + role-play.
struct SpeakSituationView: View {
    let model: SpeakSituationModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        StudyPage(title: model.hub?.title ?? t(.speakSpLuyenNoiTheoCau)) {
            switch model.phase {
            case .ready: if let h = model.hub { content(h) }
            case .loading: SkillNote(icon: "hourglass", text: t(.speakSpNgheRoiNoiTheo)).hidden()
            case .failed, .unknown: SkillCard { StudyEmpty(icon: "wifi.slash", title: t(.revDownloadFailedTryAgain), action: (t(.actionRetry), { Task { await model.load() } })) }
            }
        }
        .task { await model.load() }
        .accessibilityIdentifier("inner-speak")
    }

    @ViewBuilder private func content(_ h: SpeakSit.Hub) -> some View {
        Text(verbatim: "\(t(.speakSpLuyenNoiTheoCau)) • \(h.cefr)").studyText(LKType.bodySm, LKColor.onSurfaceVariant)
        coach(h)
        path(h)
        checklist(h)
        mastery(h)
        if !h.addon.isEmpty { addon(h) }
        SkillAction(title: t(.speakSpBatDauLuyenNoi), icon: "mic.fill", primary: true) { onRoute(AppRoute("speak", arg: model.id + "/drill")) }
        SkillAction(title: t(.speakSpNhapVaiVoiCarlos), icon: "person.2.fill") { onRoute(AppRoute("roleplay")) }
        if !h.culture.isEmpty {
            Button { model.cultureOpen.toggle() } label: {
                SkillNote(icon: "info.circle", text: t(.ideasCultureNote)).frame(minHeight: 44, alignment: .leading)
            }
            .buttonStyle(.plain)
            if model.cultureOpen { SkillCard { Text(verbatim: h.culture).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true) } }
        }
    }

    private func coach(_ h: SpeakSit.Hub) -> some View {
        SkillCard {
            HStack(alignment: .bottom, spacing: LKSpacing.spaceSm) {
                SpeakTeacher(controller: model.teacher)
                VStack(alignment: .leading, spacing: 4) {
                    Text(t(.speakSpNhiemVuTinhHuong)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.secondary.resolve(scheme))
                    Text(verbatim: h.mission).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
            }
        }
    }

    private func path(_ h: SpeakSit.Hub) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack {
                    Text(t(.speakSpLoTrinhPhieuLuu)).studyText(LKType.titlePill)
                    Spacer()
                    Text(verbatim: Bidi.isolate(t(.speakSpBuocNM, ["n": h.stageN, "m": h.stageM]))).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
                }
                HStack(alignment: .top, spacing: 2) { ForEach(Array(h.nodes.enumerated()), id: \.offset) { _, n in node(n) } }   // Stitch: one horizontal row of round nodes
            }
        }
    }
    private func node(_ n: SpeakSit.Hub.Node) -> some View {
        Button { onRoute(AppRoute("speak", arg: model.id + "/drill", query: ["stage": n.stageId])) } label: {
            VStack(spacing: 4) {
                Image(systemName: n.state == "done" ? "checkmark.circle.fill" : (n.state == "cur" ? "play.circle.fill" : "circle"))
                    .font(.system(size: 30)).foregroundStyle((n.state == "todo" ? LKColor.outline : (n.state == "done" ? LKColor.success : LKColor.secondary)).resolve(scheme))
                Text(verbatim: n.label).studyText(LKType.labelBadge, n.state == "todo" ? LKColor.onSurfaceVariant : LKColor.onSurface).multilineTextAlignment(.center).lineLimit(2).minimumScaleFactor(0.8)
                SpeakStars(n: n.stars)
            }
            .frame(maxWidth: .infinity, minHeight: 48)
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(n.state == "cur" ? .isSelected : [])
    }

    private func checklist(_ h: SpeakSit.Hub) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack {
                    Text(t(.speakSpDanhSachNhiemVu)).studyText(LKType.titlePill)
                    Spacer()
                    Text(verbatim: Bidi.isolate(t(.speakSpNMXong, ["n": h.tasks.filter(\.done).count, "m": h.tasks.count]))).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
                }
                ForEach(Array(h.tasks.enumerated()), id: \.offset) { _, k in
                    HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                        Image(systemName: k.done ? "checkmark.circle.fill" : "circle").foregroundStyle((k.done ? LKColor.success : LKColor.outline).resolve(scheme)).accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(verbatim: k.title).studyText(LKType.bodyMd)
                            EnglishText(text: k.example, style: LKType.bodySm, color: LKColor.onSurfaceVariant)
                        }
                        Spacer(minLength: 0)
                        if k.done { StudyChip(text: t(.vocabDone), tint: LKColor.success) } else if k.state == "cur" { StudyChip(text: t(.speakSpMucTieuNoi)) }
                    }
                }
            }
        }
    }

    private func mastery(_ h: SpeakSit.Hub) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: Bidi.ltr("\(h.mastered) / \(h.total)")).studyText(LKType.headlineMd)
                    Text(t(.speakSpMauCauDaThuoc)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    Spacer(minLength: 0)
                    Text(verbatim: Bidi.ltr("\(h.pct)%")).studyText(LKType.labelMetric, LKColor.secondary)
                }
                SkillProgress(value: Double(h.pct) / 100)
                Text(verbatim: Bidi.isolate(t(.speakSpConNMauCau, ["n": h.remaining]))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                Text(verbatim: Bidi.isolate(t(.speakSpMucTieuTuanN, ["n": h.week, "m": SpeakSit.weekGoal]))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            }
        }
    }

    private func addon(_ h: SpeakSit.Hub) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(t(.speakSpTuTienIchCua)).studyText(LKType.titlePill)
                Text(t(.speakSpHomNayHayNoi)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                FlowLayout(spacing: 8) {
                    ForEach(Array(h.addon.enumerated()), id: \.offset) { _, a in
                        VStack(alignment: .leading, spacing: 0) {
                            Text(verbatim: a.w).studyText(LKType.titlePill).englishText()
                            if !a.ipa.isEmpty { Text(verbatim: a.ipa).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                        }
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(Capsule().fill(LKColor.surfaceContainer.resolve(scheme)))
                    }
                }
            }
        }
    }
}

// MARK: - #/speak/<id>/drill

/// Stitch `pas-drill`: X + progress, coach bubble, the three beats, the model sentence (listen / slow), stress tip, mic or tap-in-order words, score ring + stars, Continue / Retry.
struct SpeakDrillView: View {
    let model: SpeakDrillModel
    var onClose: () -> Void = {}
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        let d = model.drill
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: Double(d.progressPct) / 100), title: "", onExit: onClose)
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    HStack(spacing: LKSpacing.spaceXs) {
                        StudyChip(text: d.chip)
                        StudyChip(text: Bidi.isolate(t(.speakSpCauNM, ["n": d.i + 1, "m": d.count])), tint: LKColor.onSurfaceVariant)
                    }
                    Text(t(.speakSpNoiTheo3Nhip)).studyText(LKType.headlineMd)
                    coach(d)
                    beats(d)
                    sentence(d)
                    if let tip = d.tip { tipCard(tip) }
                    controls(d)
                    if let r = d.res { result(r, d) }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            if model.finishedCount != nil { SkillNote(icon: "party.popper.fill", text: t(.speakSpXongCaNMau, ["n": d.count]), tint: LKColor.success).padding(.bottom, LKSpacing.spaceMd) }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task(id: model.finishedCount) {
            guard model.finishedCount != nil else { return }
            try? await Task.sleep(nanoseconds: 1_600_000_000)
            onRoute(AppRoute("speak", arg: d.s.s("id")))
        }
        .accessibilityIdentifier("focus-speak-drill")
    }

    private func coach(_ d: SpeakDrill) -> some View {
        SkillCard {
            HStack(alignment: .bottom, spacing: LKSpacing.spaceSm) {
                SpeakTeacher(controller: model.teacher)
                VStack(alignment: .leading, spacing: 4) {
                    Text(t(.speakSpCoN, ["n": "Ama"])).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.secondary.resolve(scheme))
                    Text(verbatim: SpeakText.render(.string(d.say.key), t)).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
                    if !d.gloss.isEmpty { Text(verbatim: d.gloss).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                }
                Spacer(minLength: 0)
            }
        }
    }

    private func beats(_ d: SpeakDrill) -> some View {
        let labels: [L10nKey] = [.speakSayNgheTuTon, .speakSpNoiDuoi, .speakSpNoiTuTriNho]
        return HStack(spacing: LKSpacing.spaceXs) {
            ForEach(0..<3, id: \.self) { k in
                HStack(spacing: 4) {
                    if k < d.b { Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).accessibilityHidden(true) }
                    Text(t(labels[k])).lkTextSafe(LKType.labelBadge)
                }
                .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 36).frame(maxWidth: .infinity)
                .foregroundStyle((k == d.b ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
                .background(Capsule().fill((k == d.b ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                .accessibilityAddTraits(k == d.b ? .isSelected : [])
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(t(.speakSpNhipN3, ["n": d.b + 1]))
    }

    private func sentence(_ d: SpeakDrill) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack {
                    Text(t(.speakSpCauMauDeNoi)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                    Spacer()
                    LessonIconButton(system: "speaker.wave.2.fill", label: t(.speakSpNgheCauMau)) { model.play() }
                    LessonIconButton(system: "tortoise.fill", label: t(.speakSpNgheCauMau)) { model.play(slow: true) }
                }
                FlowLayout(spacing: 6) {
                    ForEach(Array(d.wordList.enumerated()), id: \.offset) { _, w in word(w, d) }
                }
                .environment(\.layoutDirection, .leftToRight)   // the English sentence keeps its word order in the Arabic interface
                .accessibilityElement(children: .contain)
                .accessibilityLabel(d.memory ? t(.speakSpCauDaCheNoi) : d.target)
            }
        }
    }
    @ViewBuilder private func word(_ w: SpeakDrill.Word, _ d: SpeakDrill) -> some View {
        let ink: LKDynamicColor = w.bad ? LKColor.error : (d.res != nil || (!w.pending && d.noMic) ? LKColor.success : LKColor.onSurface)
        let body = HStack(spacing: 3) {
            if w.bad { Image(systemName: "minus").font(.system(size: 10, weight: .bold)).accessibilityHidden(true) }
            else if !w.pending { Image(systemName: "checkmark").font(.system(size: 10, weight: .bold)).accessibilityHidden(true) }
            Text(verbatim: w.w).studyText(LKType.titlePill, ink).englishText().underline(w.bad)
        }
        .padding(.horizontal, 10).frame(minHeight: w.tapIndex != nil ? 44 : 32)
        .background(Capsule().fill((w.pending ? LKColor.surfaceContainerHigh : ink).resolve(scheme).opacity(w.pending ? 1 : 0.12)))
        if let k = w.tapIndex { Button { Task { await model.tap(k) } } label: { body }.buttonStyle(.plain) } else { body }
    }

    private func tipCard(_ tip: SpeakDrill.Tip) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: LKSpacing.spaceXs) {
                    Image(systemName: "lightbulb.fill").foregroundStyle(LKColor.tertiary.resolve(scheme)).accessibilityHidden(true)
                    Text(t(.speakSpMeoNhanAm)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                    if !tip.ipa.isEmpty { Text(verbatim: tip.ipa).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                }
                Text(Self.boldHi(tip)).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
            }
        }
    }
    static func boldHi(_ tip: SpeakDrill.Tip) -> AttributedString {
        var a = AttributedString(tip.note)
        if !tip.hi.isEmpty, let r = tip.note.range(of: tip.hi), let ar = Range(r, in: a) { a[ar].inlinePresentationIntent = .stronglyEmphasized; a[ar].underlineStyle = .single }
        return a
    }

    @ViewBuilder private func controls(_ d: SpeakDrill) -> some View {
        VStack(spacing: LKSpacing.spaceSm) {
            if d.noMic {
                SkillNote(icon: "mic.slash.fill", text: t(.speakSpKhongDungDuocMic), tint: LKColor.onSurfaceVariant)
            } else {
                SpeakMic(state: model.recording ? .listening : .idle, label: model.recording ? t(.speakSpDangNgheChamDe) : t(.speakSpChamMicDeNoi)) { Task { await model.mic() } }
                Text(model.recording ? t(.speakSpCoDangNghe) : (d.res != nil ? t(.speakSpChamDeNoiLai) : t(.speakSpChamMicDeNoi))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            }
            if d.res == nil { SkillAction(title: SpeakText.render(.string(d.altKey), t)) { Task { await model.retry() } } }
        }
        .frame(maxWidth: .infinity)
    }

    private func result(_ r: SpeakDrill.Res, _ d: SpeakDrill) -> some View {
        SkillCard {
            VStack(spacing: LKSpacing.spaceSm) {
                HStack(spacing: LKSpacing.spaceMd) {
                    ZStack {
                        Circle().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 8)
                        Circle().trim(from: 0, to: Double(r.score) / 100).stroke(LKColor.secondary.resolve(scheme), style: StrokeStyle(lineWidth: 8, lineCap: .round)).rotationEffect(.degrees(-90))
                        VStack(spacing: 0) {
                            Text(verbatim: String(r.score)).studyText(LKType.headlineMd)
                            Text(t(.speakSpDiem)).lkTextSafe(LKType.labelBadge).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                        }
                    }
                    .frame(width: 84, height: 84).environment(\.layoutDirection, .leftToRight)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(verbatim: SpeakText.render(.string(r.verdictKey), t)).studyText(LKType.headlineSm)
                        Text(verbatim: SpeakText.render(r.sub, t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                        SpeakStars(n: r.stars, size: 20)
                    }
                    Spacer(minLength: 0)
                }
                SkillAction(title: t(.actionContinue), primary: true, enabled: d.canNext) { Task { await model.next() } }
                SkillAction(title: t(.actionRetry), icon: "arrow.counterclockwise") { Task { await model.retry() } }
            }
        }
    }
}

// MARK: - routes

struct SpeakSituationScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    private var segs: [String] { (route.arg ?? "").split(separator: "/", omittingEmptySubsequences: false).map(String.init) }
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        let id = segs.first.flatMap { $0.isEmpty ? nil : $0 } ?? "cafe"
        if segs.count > 1 && segs[1] == "drill" {
            SkillsHost(make: { SpeakDrillLoader(ctx: $0, id: id, stage: route.query["stage"]) }) { SpeakDrillLoaderView(loader: $0, onClose: { go(AppRoute("speak", arg: id)) }, onRoute: go) }
        } else {
            SkillsHost(make: { SpeakSituationModel(ctx: $0, id: id) }) { SpeakSituationRouteView(model: $0, onRoute: go) }
        }
    }
}

/// the hub of a situation; an id the index does not know goes to the café, a failed download to the skills tab (web: toast + redirect)
private struct SpeakSituationRouteView: View {
    let model: SpeakSituationModel
    let onRoute: (AppRoute) -> Void
    var body: some View {
        SpeakSituationView(model: model, onRoute: onRoute)
            .onChange(of: model.phase) { _, p in if p == .unknown { onRoute(AppRoute("speak", arg: "cafe")) } }
    }
}

/// fetches the situation, then shows the drill
@MainActor @Observable
final class SpeakDrillLoader {
    let ctx: SkillsContext, id: String, stage: String?
    private(set) var model: SpeakDrillModel?
    private(set) var phase: SpeakSituationModel.Phase = .loading
    init(ctx: SkillsContext, id: String, stage: String?) { self.ctx = ctx; self.id = id; self.stage = stage }
    func load() async {
        phase = .loading
        switch await SpeakSitSource.load(id, lang: ctx.lang) {
        case .found(let s): model = SpeakDrillModel(ctx: ctx, io: .live(voice: ctx.core.voice), situation: s, stage: stage); phase = .ready
        case .unknown: phase = .unknown
        case .failed: phase = .failed
        }
    }
}
private struct SpeakDrillLoaderView: View {
    let loader: SpeakDrillLoader
    let onClose: () -> Void
    let onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Group {
            if let m = loader.model { SpeakDrillView(model: m, onClose: onClose, onRoute: onRoute) }
            else {
                VStack(spacing: 0) {
                    TopBar(variant: .focus(progress: 0), title: "", onExit: onClose)
                    if loader.phase == .failed || loader.phase == .unknown { StudyEmpty(icon: "wifi.slash", title: t(.revDownloadFailedTryAgain), action: (t(.actionRetry), { Task { await loader.load() } })) }
                    Spacer()
                }
                .background(LKColor.background.resolve(scheme).ignoresSafeArea())
            }
        }
        .task { await loader.ctx.reload(); await loader.load() }
    }
}
