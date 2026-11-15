import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

private func go(_ hash: String, _ onRoute: (AppRoute) -> Void) { if let r = AppRoute.parseHash(hash) { onRoute(r) } }

// MARK: - #/listening

/// Stitch `listen-hub`: test tabs, the test card (best band + the 40-question mock), one card per part (Practice · Listen once · Dictation), the tips.
struct ListenHubView: View {
    let model: ListenHubModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        let h = model.hub
        StudyPage(title: t(.skillListenLuyenNgheIelts)) {
            Text(t(.skillListenDeTuBienSoan)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            if h.empty {
                SkillCard { StudyEmpty(icon: "headphones", title: t(.skillListenDangCapNhatDe)) }
            } else {
                if !h.tabs.isEmpty { tabs(h) }
                testCard(h)
                ForEach(h.parts, id: \.id) { partCard($0) }
            }
            tips
        }
        .task { await model.load() }
        .accessibilityIdentifier("inner-listening")
    }

    private func tabs(_ h: ListenHub) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LKSpacing.spaceXs) {
                ForEach(h.tabs, id: \.n) { tab in
                    Button { model.select(tab.n) } label: {
                        HStack(spacing: 4) {
                            Text(verbatim: "Test \(tab.n)").studyText(LKType.titlePill, tab.selected ? LKColor.onSurface : LKColor.onSurfaceVariant)
                            if tab.done { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true) }
                        }
                        .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 44)
                        .tactile(fill: tab.selected ? LKColor.surfaceContainerHigh : LKColor.surfaceContainerHighest, line: tab.selected ? LKColor.secondary : LKColor.outlineVariant,
                                 ledge: tab.selected ? LKColor.secondary : LKColor.outlineVariant, radius: 14)
                    }
                    .buttonStyle(LKPressStyle())
                    .accessibilityAddTraits(tab.selected ? .isSelected : [])
                }
            }
            .padding(.vertical, 6).padding(.horizontal, 2)
        }
    }

    private func testCard(_ h: ListenHub) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack(alignment: .firstTextBaseline) {
                    Text(verbatim: "Test \(h.selected ?? 1)").studyText(LKType.headlineMd)
                    Spacer(minLength: 0)
                    if let b = h.band { StudyChip(text: "Band \(JSON.jsNumberString(b))", icon: "star.fill", tint: LKColor.tertiary) }
                }
                SkillAction(title: t(.skillListenThiThu40Cau), icon: "timer", primary: true) { if let f = h.fullTest { go(f, onRoute) } }
            }
        }
    }

    private func partCard(_ c: ListenHub.Card) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                FlowLayout {
                    StudyChip(text: Bidi.ltr("Part \(c.part)") + " · " + t(c.partKey), tint: LKColor.secondary)
                    if let b = c.best { StudyChip(text: "✓ \(JSON.jsNumberString(b))/10", tint: LKColor.success) }
                }
                Text(verbatim: c.title).studyText(LKType.headlineSm).englishText().fixedSize(horizontal: false, vertical: true)
                Text(verbatim: c.sub).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                FlowLayout { ForEach(Array(c.speakers.enumerated()), id: \.offset) { _, s in StudyChip(text: s.flag + " " + s.name, tint: LKColor.onSurfaceVariant) } }
                VStack(spacing: LKSpacing.spaceXs) {
                    SkillAction(title: t(.skillListenLuyenTap), icon: "target", primary: true) { go(c.actions[0], onRoute) }
                    HStack(spacing: LKSpacing.spaceXs) {
                        SkillAction(title: t(.skillListenNghe1Lan), icon: "timer") { go(c.actions[1], onRoute) }
                        SkillAction(title: t(.skillListenChepChinhTa), icon: "keyboard") { go(c.actions[2], onRoute) }
                    }
                }
            }
        }
    }

    private var tips: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(t(.skillListenMeoLamBaiListening)).studyText(LKType.headlineSm)
                ForEach(ListenHub.tips, id: \.rawValue) { k in
                    HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                        Image(systemName: "lightbulb.fill").font(.system(size: 12)).foregroundStyle(LKColor.tertiary.resolve(scheme)).accessibilityHidden(true)
                        Text(StudyText.rich(t(k))).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }
}

// MARK: - #/listen/<part>

/// Stitch `listen-player` (+ `listen-word-popup`): player, questions, transcript, result.
struct ListenPartView: View {
    let model: ListenPartModel
    /// fixtures: the part is longer than a phone, so the result is shown on its own
    var showResultOnly = false
    /// fixtures (retake): the questions and the result without the header, player and transcript
    var questionsAndResult = false
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @Environment(\.liveContent) private var live

    var body: some View {
        StudyPage(title: t(ListenHub.partKey(model.page.part))) {
            ScrollViewReader { proxy in
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    modeSwitch
                    SkillProgress(value: model.progress)
                    if !showResultOnly { if !questionsAndResult { header; player }; questions }
                    if let o = model.outcome { result(o) }
                    if !showResultOnly && !questionsAndResult && (!model.exam || model.submitted) { transcript }
                }
                .onChange(of: model.scrollTo) { _, i in if let i { withAnimation { proxy.scrollTo(i, anchor: .center) } } }
            }
        }
        .task { if live { await model.start() } }
        .onDisappear { model.stop() }
        .sheet(item: Binding(get: { model.popup }, set: { model.popup = $0 })) { p in
            WordPopupView(model: p, onClose: { model.popup = nil }).presentationDetents([.medium, .large])
        }
        .alert(t(.skillListenBaiNgheChuaPhat), isPresented: Binding(get: { model.confirmSubmit }, set: { model.confirmSubmit = $0 })) {
            Button(t(.actionContinue)) { Task { await model.submit() } }
            Button(t(.actionCancel), role: .cancel) {}
        }
        .accessibilityIdentifier("inner-listen")
    }

    private var modeSwitch: some View {
        SkillAction(title: t(model.exam ? .skillListenCheDoLuyenTap : .skillListenCheDoThiThat), icon: model.exam ? "target" : "timer") { go(model.page.switchHref, onRoute) }
    }

    private var header: some View {
        let p = model.page
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            Text(verbatim: Bidi.ltr("Test \(p.test) · Part \(p.part)") + " · " + t(p.partKey) + " · " + Bidi.isolate(t(.skillListenCauAB, ["a": p.qFrom, "b": p.qTo])))
                .studyText(LKType.labelBadge, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            Text(verbatim: p.title).studyText(LKType.headlineMd).englishText().fixedSize(horizontal: false, vertical: true)
            if !p.context.isEmpty { EnglishText(text: p.context, style: LKType.bodyMd, color: LKColor.onSurfaceVariant) }
            FlowLayout { ForEach(Array(p.speakers.enumerated()), id: \.offset) { _, s in StudyChip(text: s.flag + " " + s.name, tint: LKColor.onSurfaceVariant) } }
        }
    }

    private var player: some View {
        let play = model.state.label
        return SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                SkillAction(title: t(play.key), icon: play.icon, primary: false, enabled: play.enabled) { model.tapPlay() }
                if !model.exam {
                    HStack(spacing: LKSpacing.spaceXs) {
                        SkillAction(title: t(.skillListenCauTruoc), icon: "backward.fill") { model.back() }
                        rateMenu
                    }
                    Toggle(isOn: Binding(get: { model.live }, set: { model.live = $0 })) {
                        Text(t(.skillListenHienLoiThoaiKhi)).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                    }
                    .tint(LKColor.secondary.resolve(scheme)).disabled(model.submitted).frame(minHeight: 44)
                }
                if let k = model.state.noteKey { SkillNote(icon: "info.circle", text: t(k)) }
                if let k = model.state.nowKey { SkillNote(icon: "checkmark.circle", text: t(k), tint: LKColor.onSurface) }
                if model.blocked { SkillNote(icon: "hand.tap.fill", text: t(.skillListenChamDeNghe), tint: LKColor.tertiary) }
                if let n = model.state.now(model.part) { SkillNote(icon: n.icon, text: n.key.map { t($0) } ?? n.name ?? "") }
                if let k = model.toast { SkillNote(icon: "exclamationmark.triangle.fill", text: t(k), tint: LKColor.error) }
            }
        }
    }
    private var rateMenu: some View {
        Menu {
            ForEach(ListenRules.rates, id: \.self) { v in
                Button { Task { await model.setRate(v) } } label: { Text(verbatim: ListenPage.rateLabel(v) ?? t(.skillListenChuan)) }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "speedometer").accessibilityHidden(true)
                Text(verbatim: ListenPage.rateLabel(model.rate) ?? t(.skillListenChuan)).fixedSize(horizontal: false, vertical: true)
                Image(systemName: "chevron.up.chevron.down").font(.system(size: 11, weight: .bold)).accessibilityHidden(true)
            }
            .studyText(LKType.titlePill).padding(.horizontal, LKSpacing.spaceSm).frame(maxWidth: .infinity, minHeight: 48)
            .tactile(fill: LKColor.surfaceContainer, radius: 16)
        }
        .accessibilityLabel(t(.skillListenTocDo))
    }

    private var questions: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                QuestionsView(part: model.part, answers: model.answers, results: model.marks, hide: model.hidden,
                              tips: model.page.tipsOn, onEvidence: model.submitted ? { model.hear($0) } : nil, setOne: { model.setOne($0, $1) }, toggle: { model.toggle(group: $0, $1) })
                if !model.submitted { SkillAction(title: t(.skillListenNopBaiXemDap), icon: "checkmark.circle", primary: true) { Task { await model.tapSubmit() } } }
                if model.retaking && model.retakeScore == nil { SkillAction(title: t(.actionCheck), primary: true) { model.recheck() } }
            }
        }
    }

    private func result(_ o: ListenOutcome) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    HStack(spacing: LKSpacing.spaceXs) {
                        Image(systemName: o.ok ? "checkmark.circle.fill" : "info.circle.fill").foregroundStyle((o.ok ? LKColor.success : LKColor.tertiary).resolve(scheme)).accessibilityHidden(true)
                        Text(verbatim: t(.skillListenABCauDung, ["a": o.right, "b": o.total]) + " · +\(o.xp) XP").studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
                    }
                    Text(t(o.advice)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    SkillAction(title: t(.skillListenChepChinhTaPhan), icon: "keyboard") { go("#/dictation/\(model.part.s("id"))", onRoute) }
                    SkillAction(title: t(.revTryAgain), icon: "arrow.counterclockwise") { model.again() }
                }
            }
            stats
            vocab
        }
    }

    /// "Kết quả theo dạng câu hỏi": right / all and % per type (names as on the web), the wrong numbers, and "Làm lại N câu sai"
    private var stats: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(t(.skillQeKetQuaTheoDang)).studyText(LKType.headlineSm)
                if model.retaking {
                    if let s = model.retakeScore { Text(t(.skillQeLamLaiDungRight, ["right": s.right, "total": s.total])).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true) }
                    else { Text(t(.skillQeLamLaiCacCau)).studyText(LKType.titlePill) }
                    SkillAction(title: t(.skillQeHienTatCaCau)) { model.showAll() }
                } else {
                    ForEach(model.stats, id: \.kind) { k in
                        HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                            Text(verbatim: k.name).studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                            Text(verbatim: "\(k.ok)/\(k.all) · \(k.pct)%").studyText(LKType.labelMetric, k.pct >= 75 ? LKColor.success : LKColor.onSurface)
                        }
                        if !k.wrong.isEmpty { Text(verbatim: t(.skillQeCauSai) + ": " + k.wrong.map(String.init).joined(separator: ", ")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                    }
                    let wrong = model.stats.reduce(0) { $0 + $1.wrong.count }
                    if wrong > 0 { SkillAction(title: t(.skillQeLamLaiNCau, ["n": wrong]), icon: "arrow.counterclockwise", primary: true) { model.startRetake() } }
                }
            }
        }
    }

    @ViewBuilder private var vocab: some View {
        let list = model.part.list("vocab")
        if !list.isEmpty {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    Text(t(.skillListenTuVungDangHoc)).studyText(LKType.headlineSm)
                    ForEach(Array(list.enumerated()), id: \.offset) { k, v in
                        HStack(alignment: .center, spacing: LKSpacing.spaceSm) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(verbatim: v.s("w")).studyText(LKType.titlePill).englishText()
                                Text(verbatim: v.s("vi")).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                            }
                            .fixedSize(horizontal: false, vertical: true)
                            Spacer(minLength: 0)
                            if model.vocabSaved.contains(k) || model.inDeck(v.s("w")) {
                                Image(systemName: "checkmark").foregroundStyle(LKColor.success.resolve(scheme)).frame(minWidth: 44, minHeight: 44).accessibilityLabel(t(.revSaved))
                            } else {
                                SkillAction(title: "+ " + t(.vocabSave)) { Task { await model.saveVocab(k) } }.frame(maxWidth: 120)
                            }
                        }
                    }
                }
            }
        }
    }

    private var transcript: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(t(.skillListenLoiThoai)).studyText(LKType.headlineSm)
                Text(t(.skillListenBamDongDeNghe)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                TranscriptView(rows: model.rows, blurred: !model.live, now: model.nowLine, onLine: { model.tapLine($0) }, onWord: { model.tapWord($0, sentence: $1) })
            }
        }
    }
}

// MARK: - #/listen-test/<n>

/// Stitch `listen-test-intro` · `listen-test-part` · `listen-test-result`: a focus flow (X, no tab bar).
struct ListenTestView: View {
    let model: ListenTestModel
    var onClose: () -> Void = {}
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @Environment(\.liveContent) private var live

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: model.progress), title: "", onExit: { model.stop(); onClose() })
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    if let f = model.flow {
                        if let r = model.result { result(f, r) } else if f.phase == .intro { intro } else { part(f) }
                    }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm).padding(.bottom, LKSpacing.space2xl)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task { if live { await model.load() } }
        .onDisappear { model.stop() }
        .alert(t(.skillListenPhanNgheChuaPhat), isPresented: Binding(get: { model.confirmNext }, set: { model.confirmNext = $0 })) {
            Button(t(.actionContinue)) { Task { await model.next() } }
            Button(t(.actionCancel), role: .cancel) {}
        }
        .accessibilityIdentifier("focus-listen-test")
    }

    private var intro: some View {
        SkillCard {
            VStack(spacing: LKSpacing.spaceMd) {
                Image(systemName: "headphones").font(.system(size: 44, weight: .semibold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                Text(verbatim: model.title).studyText(LKType.headlineMd).multilineTextAlignment(.center)
                Text(StudyText.rich(t(.skillListen4Phan40Cau))).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                SkillAction(title: t(.skillListenBatDauThi), primary: true) { model.begin() }
                SkillAction(title: t(.actionLater)) { model.stop(); onClose() }
            }
            .frame(maxWidth: .infinity)
        }
    }

    private func part(_ f: ListenTestFlow) -> some View {
        let c = f.chip
        return VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            HStack(spacing: LKSpacing.spaceXs) {
                StudyChip(text: Bidi.ltr("Test \(c.test) · Part \(c.part)/\(f.parts.count)") + " · " + Bidi.isolate(t(.skillListenCauAB, ["a": c.qFrom, "b": c.qTo])), tint: LKColor.secondary)
            }
            SkillProgress(value: f.progressPct / 100)
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    stateLine(f)
                    if f.phase == .reading { SkillAction(title: t(.skillListenBatDauNgheNgay), icon: "play.fill") { model.skipReading() } }
                    if f.phase == .blocked { SkillAction(title: t(.skillListenChamDeNghe), icon: "play.fill", primary: true) { model.retryPlay() } }
                    if let k = model.toast { SkillNote(icon: "exclamationmark.triangle.fill", text: t(k), tint: LKColor.error) }
                }
            }
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    QuestionsView(part: f.part, answers: model.answers, setOne: { model.setOne($0, $1) }, toggle: { model.toggle(group: $0, $1) })
                    SkillAction(title: t(f.nextLabel) + (f.isLast ? "" : " →"), icon: f.isLast ? "checkmark.circle" : nil, primary: true, enabled: f.nextEnabled) { Task { await model.tapNext() } }
                    if !f.nextEnabled { SkillNote(icon: "info.circle", text: t(.skillListenNgheHetPhanNay)) }
                }
            }
        }
    }
    private func stateLine(_ f: ListenTestFlow) -> some View {
        let icon: String = f.phase == .reading || f.phase == .loading ? "hourglass" : f.phase == .playing ? "speaker.wave.2.fill" : f.phase == .blocked ? "hand.tap.fill" : "checkmark.circle.fill"
        let text = f.phase == .reading ? t(.skillListenNGiayDocCau, ["n": f.left]) : f.phase == .blocked ? t(.skillListenAmThanhChuaPhat) : t(f.stateKey)
        return SkillNote(icon: icon, text: text, tint: LKColor.onSurface)
    }

    private func result(_ f: ListenTestFlow, _ r: ListenTestFlow.Result) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            SkillCard {
                VStack(spacing: LKSpacing.spaceSm) {
                    Image(systemName: r.celebrates ? "party.popper.fill" : "headphones").font(.system(size: 40, weight: .semibold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                    Text(verbatim: Bidi.ltr("Band \(JSON.jsNumberString(r.band))") + " · " + Bidi.isolate(t(.skillListenABCauDung, ["a": r.raw, "b": 40]))).studyText(LKType.headlineMd).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                    Text(t(.skillListenQuyDoiTheoThang)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity)
            }
            ForEach(r.byPart, id: \.href) { p in
                Button { go(p.href, onRoute) } label: {
                    SkillCard {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(verbatim: Bidi.ltr("Part \(p.part) · \(p.right)/10")).studyText(LKType.titlePill)
                            SkillProgress(value: Double(p.right) / 10)
                            Text(t(.skillListenBamDeLuyenLai)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .buttonStyle(LKPressStyle())
            }
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    Text(t(.skillListenBangDapAn)).studyText(LKType.headlineSm)
                    ForEach(r.sheet, id: \.n) { q in
                        HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                            Text(verbatim: "\(q.n)").studyText(LKType.labelMetric).frame(minWidth: 26, alignment: .trailing)
                            Image(systemName: q.ok ? "checkmark.circle.fill" : "xmark.circle.fill").foregroundStyle((q.ok ? LKColor.success : LKColor.error).resolve(scheme)).accessibilityLabel(Text(verbatim: q.ok ? "✓" : "✗"))
                            VStack(alignment: .leading, spacing: 2) {
                                EnglishText(text: q.answer, style: LKType.bodyMd)
                                if !q.ok && !q.given.isEmpty { Text(verbatim: t(.skillListenBanA, ["a": q.given])).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                            }
                        }
                    }
                }
            }
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    Text(t(.skillQeKetQuaTheoDang)).studyText(LKType.headlineSm)
                    ForEach(QE.summary(r.sheet).rows, id: \.kind) { k in
                        HStack { Text(verbatim: k.name).studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true); Spacer(minLength: 0); Text(verbatim: "\(k.ok)/\(k.all) · \(k.pct)%").studyText(LKType.labelMetric) }
                        SkillProgress(value: Double(k.pct) / 100)
                    }
                    if let w = QE.summary(r.sheet).weak, let tip = QuestionsView.tipKeys[w] { SkillNote(icon: "lightbulb.fill", text: t(tip), tint: LKColor.tertiary) }
                }
            }
            SkillAction(title: t(.skillListenVeLuyenNghe), primary: true) { go("#/listening", onRoute) }
            SkillAction(title: t(.skillListenXemSoLoiSai), icon: "exclamationmark.bubble") { go("#/mistakes", onRoute) }
        }
    }
}
