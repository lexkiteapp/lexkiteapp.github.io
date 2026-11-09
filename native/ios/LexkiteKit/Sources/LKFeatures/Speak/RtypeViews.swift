import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKStrings

/// #/rtype · Stitch rtype-hub, rtype-run, rtype-result. Pushed route: system back (≥ 44 pt) takes the learner from a kind to the hub and from the hub out.
struct RtypeScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        SkillsHost(make: { RtypeModel(ctx: $0, kind: route.arg) }) { RtypeView(model: $0, onRoute: go) }
    }
}

struct RtypeView: View {
    let model: RtypeModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Group {
            if model.kind == nil || model.isEmpty || model.finished {
                StudyPage(title: model.kind.map { RtypeKinds.title($0, t) } ?? t(.skillQtLuyenReadingTheoDang)) {
                    if model.isEmpty { SkillCard { StudyEmpty(icon: "book.closed", title: t(.skillListenDangCapNhatDe)) } }
                    else if model.kind == nil { hub }
                    else { done }
                }
            } else { runFrame }
        }
        .task { await model.load() }
        .accessibilityIdentifier("rtype")
    }

    /// Stitch rtype-run (focus: X + group progress, one pinned button) and rtype-result (inner: back + kind title, the summary FIRST so it and the next-group button sit in the first screen).
    private var runFrame: some View {
        VStack(spacing: 0) {
            if model.outcome == nil {
                TopBar(variant: .focus(progress: Double(model.index) / Double(max(1, model.list.count))), title: "") { dismiss() }
            } else {
                TopBar(variant: .inner, title: model.kind.map { RtypeKinds.title($0, t) } ?? "") { dismiss() }
            }
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) { run }
                    .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm).padding(.bottom, LKSpacing.space2xl)
                    .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
            bottomBar
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
    }

    // MARK: hub
    @ViewBuilder private var hub: some View {
        Text(StudyText.rich(t(.speakRtypeTapTrung1Dang))).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        SkillAction(title: t(.skillQeXemTienBoTheo), icon: "chart.bar.fill") { onRoute(AppRoute("qstats")) }
        ForEach(model.cards, id: \.kind) { c in card(c) }
    }
    private func card(_ c: Rtype.Card) -> some View {
        Button { onRoute(AppRoute("rtype", arg: c.kind)) } label: {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    HStack {
                        Text(verbatim: RtypeKinds.emoji(c.kind)).font(.system(size: 28)).accessibilityHidden(true)
                        Spacer(minLength: 0)
                        if let p = c.pct { StudyChip(text: t(.speakRtypePctDung, ["pct": p]), icon: c.reached ? "checkmark" : nil, tint: c.reached ? LKColor.success : LKColor.secondary) }
                        else { StudyChip(text: t(.speakRtypeChuaLam)) }
                    }
                    Text(verbatim: RtypeKinds.title(c.kind, t)).studyText(LKType.titlePill).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                    Text(verbatim: t(.speakRtypeQCauGNhom, ["q": c.questions, "g": c.groups])).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    SkillProgress(value: Double(c.bar) / 100)
                    Text(verbatim: c.pct == nil ? t(.speakRtypeBatDauLuyen) : c.reached ? "✅ " + t(.speakRtypeDaDatMucTieu) : t(.speakRtypeMucTieu75))
                        .studyText(LKType.bodySm, c.reached ? LKColor.success : LKColor.onSurfaceVariant)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .buttonStyle(LKPressStyle())
        .accessibilityElement(children: .combine)
    }

    // MARK: run / result
    @ViewBuilder private var run: some View {
        if let u = model.current {
            if let o = model.outcome { resultCard(o) }
            HStack {
                StudyChip(text: t(.speakRtypeNhomIN, ["i": model.position.i, "n": model.position.n]), icon: "square.stack.fill")
                Spacer(minLength: 0)
            }
            passage(u)
            SkillCard {
                QuestionsView(part: model.shownPart, answers: model.answers, results: model.results, tips: true,
                              setOne: { model.setOne($0, $1) }, toggle: { model.toggle($0, $1) })
            }
        }
    }
    private func passage(_ u: Rtype.Unit) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                EnglishText(text: u.title, style: LKType.titlePill)
                ForEach(Array(u.passage.list("paras").enumerated()), id: \.offset) { _, p in
                    (Text(verbatim: p.s("k") + "  ").font(.system(size: 14, weight: .bold)).foregroundColor(LKColor.secondary.resolve(scheme)) + Text(marked(p.s("t"))))
                        .studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
    /// the paragraph with the cue of "Xem vị trí trong bài" marked
    private func marked(_ text: String) -> AttributedString {
        var s = AttributedString(text)
        if !model.highlight.isEmpty, let r = s.range(of: model.highlight) { s[r].backgroundColor = LKColor.tertiaryContainer.resolve(scheme) }
        return s
    }
    private func resultCard(_ o: Rtype.Outcome) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Image(systemName: o.ok ? "checkmark.circle.fill" : "xmark.circle.fill").foregroundStyle((o.ok ? LKColor.success : LKColor.error).resolve(scheme)).accessibilityHidden(true)
                    Text(StudyText.rich(t(.speakRtypeRNCauDung, ["r": o.right, "n": o.total, "p": o.pct]))).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                }
                SkillProgress(value: Double(o.pct) / 100)
                FlowLayout(spacing: 8) {
                    ForEach(o.results.filter { !$0.cue.isEmpty }, id: \.n) { r in
                        SkillAction(title: t(.speakRtypeXemViTriTrong) + " · " + String(r.n), icon: "mappin.and.ellipse") { model.highlight = r.cue }
                    }
                }
            }
        }
    }

    /// the one main button, pinned: "Kiểm tra" → "Nhóm tiếp"
    @ViewBuilder private var bottomBar: some View {
        if model.kind != nil, !model.isEmpty, !model.finished {
            VStack(spacing: 0) {
                if model.outcome == nil { SkillAction(title: t(.actionCheck), primary: true) { Task { await model.check() } } }
                else { SkillAction(title: t(.speakRtypeNhomTiep), icon: "chevron.forward", primary: true) { model.next() } }
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceSm)
            .frame(maxWidth: .infinity)
            .background(LKColor.background.resolve(scheme).ignoresSafeArea(edges: .bottom))
        }
    }

    // MARK: finished
    @ViewBuilder private var done: some View {
        SkillCard {
            VStack(spacing: LKSpacing.spaceMd) {
                Text(verbatim: "🎉").font(.system(size: 48)).accessibilityHidden(true)
                Text(verbatim: t(.speakRtypeDaLamHetDang, ["k": RtypeKinds.title(model.kind ?? "", t)])).studyText(LKType.headlineSm).multilineTextAlignment(.center)
                SkillAction(title: t(.speakRtypeChonDangKhac), primary: true) { dismiss() }
                SkillAction(title: t(.speakRtypeThiThuDayDu), icon: "doc.text") { onRoute(AppRoute("mock")) }
            }
            .frame(maxWidth: .infinity)
        }
    }
}
