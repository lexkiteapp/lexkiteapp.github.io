import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKStrings

/// #/roleplay · Stitch roleplay-list, roleplay-brief, roleplay-chat, roleplay-result. `#/roleplay` = list; `#/roleplay/<id>` = brief → chat → result inside one route.
struct RoleplayScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    @State private var version = 0
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        let signedIn = services.auth.user != nil
        Group {
            if let id = route.arg, let s = RoleplayContent.scripts.first(where: { $0.s("id") == id }) {
                SkillsHost(make: { ctx in
                    RoleplayFlowModel(ctx: ctx, script: s, rules: RoleplayContent.rules, signedIn: signedIn,
                                      server: { LexkiteAIServer(token: { [weak services] in
                                          guard let a = services?.auth, a.user != nil else { return nil }
                                          return try? await a.auth.idToken(forceRefresh: false)
                                      }, device: LexkiteAIServer.deviceID()) },
                                      io: { SpeakIO.live(voice: ctx.core.voice) })
                }) { RoleplayFlowView(model: $0, onRoute: go) }
            } else {   // no id, or an unknown one ⇒ the list, like the web
                SkillsHost(make: { RoleplayListModel(ctx: $0, signedIn: signedIn) }) { RoleplayListView(model: $0, onRoute: go) }
            }
        }
        .id(version)
        .task {
            let before = SpeakContentStore.pack.json
            await SpeakContentStore.refresh()
            if SpeakContentStore.pack.json != before { version += 1 }   // the full pack arrived: rebuild the list once
        }
    }
}

/// The level switch (A1/B1 … · pressed state is read out)
struct RoleplayLevelPicker: View {
    let labels: [String]
    let selected: Int
    let pick: (Int) -> Void
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(labels.enumerated()), id: \.offset) { i, l in
                Button { pick(i) } label: {
                    Text(verbatim: l).studyText(LKType.titlePill, i == selected ? LKColor.onSecondary : LKColor.onSurface)
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(i == selected ? LKColor.secondary.resolve(scheme) : Color.clear)
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(i == selected ? .isSelected : [])
            }
        }
        .clipShape(Capsule())
        .overlay(Capsule().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
    }
}

// MARK: list
struct RoleplayListView: View {
    let model: RoleplayListModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var level = 1
    var body: some View {
        StudyPage(title: t(.speakRpHoiThoaiDongVai)) {
            SkillCard {   // Stitch hero: the stage badge + the one-line promise
                HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                    Text(verbatim: "🎭").font(.system(size: 26)).frame(width: 52, height: 52)
                        .background(RoundedRectangle(cornerRadius: 14).fill(LKColor.secondary.resolve(scheme))).accessibilityHidden(true)
                    Text(verbatim: t(.speakRpDongVaiHoiThoai)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
            }
            VStack(alignment: .leading, spacing: LKSpacing.space2xs) {
                Text(verbatim: t(.onbLevelWord)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                RoleplayLevelPicker(labels: model.levelLabels, selected: level) { level = $0; model.setLevel($0) }
            }
            section(t(.speakRpTinhHuongHangNgay), "A1 – B1", model.sections.everyday, grid: true)
            section(t(.speakRpCongSo), "B1 – C1", model.sections.work, grid: false)
            Text(verbatim: model.signedIn ? t(.speakRpAiTrenMayChrome) : t(.speakRpKhachNHoiThoai, ["n": model.rules.guestAiPerDay]))
                .studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        }
        .onAppear { level = model.level }
        .accessibilityIdentifier("roleplay-list")
    }
    @ViewBuilder private func section(_ title: String, _ levels: String, _ list: [JSON], grid: Bool) -> some View {
        if !list.isEmpty {
            HStack(spacing: LKSpacing.spaceXs) { Text(verbatim: title).studyText(LKType.headlineSm); StudyChip(text: levels) }
                .accessibilityElement(children: .combine).accessibilityAddTraits(.isHeader)
            if grid {   // Stitch: everyday scenarios in two columns
                ForEach(Array(stride(from: 0, to: list.count, by: 2)), id: \.self) { i in
                    HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                        tile(list[i])
                        if i + 1 < list.count { tile(list[i + 1]) } else { Color.clear.frame(maxWidth: .infinity) }
                    }
                    .fixedSize(horizontal: false, vertical: true)
                }
            } else {
                ForEach(Array(list.enumerated()), id: \.offset) { _, s in card(s) }
            }
        }
    }
    private func tile(_ s: JSON) -> some View {
        Button { onRoute(AppRoute("roleplay", arg: s.s("id"))) } label: {
            SkillCard {
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: s.s("em")).font(.system(size: 30)).accessibilityHidden(true)
                    Text(verbatim: SpeakText.render(.string(Roleplay.nameKey(s, model.rules)), t)).studyText(LKType.titlePill).multilineTextAlignment(.leading)
                    Text(verbatim: s.s("title")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().multilineTextAlignment(.leading)
                    Spacer(minLength: 0)
                    Text(verbatim: t(.speakRpNLuot, ["n": s.list("turns").count])).studyText(LKType.labelBadge, LKColor.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                .frame(minHeight: 44)
            }
        }
        .buttonStyle(LKPressStyle()).frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
    private func card(_ s: JSON) -> some View {
        Button { onRoute(AppRoute("roleplay", arg: s.s("id"))) } label: {
            SkillCard {
                HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                    Text(verbatim: s.s("em")).font(.system(size: 30)).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(verbatim: SpeakText.render(.string(Roleplay.nameKey(s, model.rules)), t)).studyText(LKType.titlePill).multilineTextAlignment(.leading)
                        Text(verbatim: s.s("title") + " · " + t(.speakRpNLuot, ["n": s.list("turns").count])).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().multilineTextAlignment(.leading)
                    }
                    .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                }
                .frame(minHeight: 44)
            }
        }
        .buttonStyle(LKPressStyle())
        .accessibilityElement(children: .combine)
    }
}

// MARK: flow (brief ↔ chat)
struct RoleplayFlowView: View {
    let model: RoleplayFlowModel
    var onRoute: (AppRoute) -> Void = { _ in }
    var body: some View {
        if let chat = model.chat {
            RoleplayChatView(model: chat, onClose: { model.leave() }, onAgain: { model.again() }, onRoute: onRoute)
        } else {
            RoleplayBriefView(model: model.brief, onStart: { model.start() })
        }
    }
}

// MARK: brief
struct RoleplayBriefView: View {
    let model: RoleplayBriefModel
    var onStart: () -> Void = {}
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    @State private var level = 1
    private var s: JSON { model.script }
    var body: some View {
        StudyPage(title: SpeakText.render(.string(Roleplay.nameKey(s, model.rules)), t)) {
            HStack(spacing: LKSpacing.spaceSm) {
                Text(verbatim: s.s("em")).font(.system(size: 40)).accessibilityHidden(true)
                Text(verbatim: s.s("title")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).englishText()
            }
            // Stitch roleplay-brief: partner card (avatar + name + role), objectives, topic vocabulary, level, then the pinned Start and "choose another situation"
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    head("theatermasks.fill", t(.speakRpVaiCuaAi))
                    HStack(alignment: .center, spacing: LKSpacing.spaceSm) {
                        Text(verbatim: String((s["ai"]?.s("name") ?? "?").prefix(1))).studyText(LKType.headlineSm, LKColor.onSecondary).englishText()
                            .frame(width: 48, height: 48).background(Circle().fill(LKColor.secondary.resolve(scheme))).accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(verbatim: (s["ai"]?.s("name") ?? "") + " – " + (s["ai"]?.s("role") ?? "")).studyText(LKType.titlePill).englishText().fixedSize(horizontal: false, vertical: true)
                            Text(verbatim: s["ai"]?.s("persona") ?? "").studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    head("flag.fill", t(.speakRpMucTieuCuaBan))
                    HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceSm) {
                        Text(verbatim: "1").studyText(LKType.labelBadge, LKColor.onSecondary).frame(width: 24, height: 24).background(Circle().fill(LKColor.secondary.resolve(scheme))).accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            if s.t("cando") { Text(verbatim: SpeakText.render(.string(s.s("cando")), t)).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true) }
                            Text(verbatim: s.s("you")).studyText(LKType.bodyMd, s.t("cando") ? LKColor.onSurfaceVariant : LKColor.onSurface).englishText().fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    head("books.vertical.fill", t(.modelTopicVocabulary))
                    FlowLayout(spacing: 8) {
                        ForEach(Array(s.list("vocab").enumerated()), id: \.offset) { i, v in chip(i, v) }
                    }
                    Text(verbatim: t(.speakRpBamDeLuuTu)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            RoleplayLevelPicker(labels: model.levels, selected: level) { level = $0; model.setLevel($0) }
            SkillAction(title: t(.speakRpChonTinhHuongKhac)) { dismiss() }
        }
        .safeAreaInset(edge: .bottom) {
            SkillAction(title: t(.speakRpBatDauHoiThoai), icon: "play.fill", primary: true) { onStart() }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceSm)
                .frame(maxWidth: .infinity).background(LKColor.background.resolve(scheme).ignoresSafeArea(edges: .bottom))
        }
        .onAppear { level = model.level }
        .accessibilityIdentifier("roleplay-brief")
    }
    private func head(_ icon: String, _ text: String) -> some View {
        HStack(spacing: LKSpacing.spaceXs) {
            Image(systemName: icon).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: text).studyText(LKType.headlineSm)
        }
        .accessibilityAddTraits(.isHeader)
    }
    private func chip(_ i: Int, _ v: JSON) -> some View {
        let w = v.array?.first?.string ?? "", saved = model.saved.contains(i)
        return Button { Task { await model.save(i) } } label: {
            HStack(spacing: 4) {
                Image(systemName: saved ? "checkmark" : "plus").font(.system(size: 12, weight: .bold)).accessibilityHidden(true)
                Text(verbatim: w).studyText(LKType.titlePill, saved ? LKColor.success : LKColor.onSurface).englishText()
            }
            .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
            .tactile(fill: LKColor.surfaceContainerHigh, line: saved ? LKColor.success : LKColor.outlineVariant, ledge: LKColor.outlineVariant, radius: 14)
        }
        .buttonStyle(LKPressStyle())
        .disabled(saved)
        .accessibilityLabel(saved ? t(.speakRpDaLuuVaoFlashcard) + ": " + w : w)
    }
}

// MARK: chat + result
struct RoleplayChatView: View {
    @Bindable var model: RoleplayChatModel
    var onClose: () -> Void = {}
    var onAgain: () -> Void = {}
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    @State private var savedRewrites: Set<Int> = []

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: Double(model.turn.i - 1) / Double(max(1, model.turn.n))), title: "", onExit: onClose)
            switch model.phase {
            case .chat: chat
            case .scoring: scoring
            case .report(let r): report(r)
            }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .task { model.begin() }
        .onDisappear { model.stop() }
        .accessibilityIdentifier("roleplay-chat")
    }

    private var modeText: String {
        switch model.mode {
        case .nano: return "🧠 " + t(.speakRpAiTrenMayGemini)
        case .server: return "☁️ " + t(.speakRpAiMienPhiCua)
        case .script: return "📜 " + t(.speakRpKichBanSoanSan)
        }
    }

    // MARK: chat
    private var chat: some View {
        VStack(spacing: 0) {
            HStack(spacing: LKSpacing.spaceXs) {
                StudyChip(text: modeText)
                StudyChip(text: model.levelName)
                StudyChip(text: t(.speakRpLuotIN, ["i": model.turn.i, "n": model.turn.n]))
                Spacer(minLength: 0)
            }
            .padding(.horizontal, LKFrame.shared.gutter)
            ScrollViewReader { proxy in
                ScrollView {
                    VStack(spacing: LKSpacing.spaceSm) {
                        ForEach(Array(model.bubbles.enumerated()), id: \.offset) { i, b in bubble(b).id(i) }
                        if model.typing { typingDots.id("typing") }
                    }
                    .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceSm)
                    .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
                }
                .scrollIndicators(.hidden)
                .onChange(of: model.bubbles.count) { _, n in withAnimation { proxy.scrollTo(model.typing ? "typing" : n - 1 as AnyHashable, anchor: .bottom) } }
            }
            controls
        }
    }
    private func bubble(_ b: Roleplay.Bubble) -> some View {
        let ai = b.who == "ai"
        return HStack {
            if !ai { Spacer(minLength: 40) }
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(verbatim: ai ? (model.script["ai"]?.s("name") ?? "") : t(.speakRpBan)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
                    if ai { LessonIconButton(system: "speaker.wave.2.fill", label: t(.lessonReplay)) { model.say(b.text) }.padding(.vertical, -8) }
                }
                Text(verbatim: b.text).studyText(LKType.bodyMd, ai ? LKColor.onSurface : LKColor.onPrimaryContainer).englishText().fixedSize(horizontal: false, vertical: true)
            }
            .padding(LKSpacing.spaceSm)
            .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill((ai ? LKColor.surfaceContainerHighest : LKColor.primaryContainer).resolve(scheme)))
            if ai { Spacer(minLength: 40) }
        }
        .accessibilityElement(children: .combine)
    }
    private var typingDots: some View {
        HStack {
            Text(verbatim: "…").studyText(LKType.headlineSm, LKColor.onSurfaceVariant)
                .padding(.horizontal, LKSpacing.spaceMd).padding(.vertical, 6)
                .background(Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
                .accessibilityLabel(t(.speakRpDangTraLoi))
            Spacer()
        }
    }
    private var controls: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            if let n = model.notice { notice(n) }
            if let h = model.hintBox { hint(h) }
            HStack(spacing: LKSpacing.spaceSm) {
                SpeakMic(state: model.listening ? .listening : .idle, label: t(.lessonKindSpeak)) { Task { await model.mic() } }
                TextField(t(.speakRpNoiHoacGoCau), text: $model.input)
                    .textInputAutocapitalization(.never).autocorrectionDisabled().englishText()
                    .submitLabel(.send).onSubmit { Task { await model.send(model.input) } }
                    .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 48)
                    .tactile(fill: LKColor.surfaceContainerHigh, line: LKColor.outlineVariant, radius: 14)
                SkillAction(title: t(.speakRpGui), icon: "paperplane.fill", enabled: !model.input.trimmingCharacters(in: .whitespaces).isEmpty) { Task { await model.send(model.input) } }
                    .fixedSize()
            }
            if model.listening, !model.partial.isEmpty { Text(verbatim: model.partial).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
            FlowLayout(spacing: 8) {
                SkillAction(title: t(.lessonHint), icon: "lightbulb.fill") { model.showHint() }
                if model.helpButton { SkillAction(title: t(.speakRpGiupToiNoi), icon: "lifepreserver.fill") { model.showHelp() } }
                SkillAction(title: t(.speakRpKetThucChamDiem), icon: "flag.checkered") { Task { await model.end() } }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceSm)
        .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
        .background(LKColor.surfaceContainerLow.resolve(scheme).ignoresSafeArea(edges: .bottom))
    }
    private func hint(_ h: RoleplayChatModel.HintBox) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            if let tip = h.tip { SkillNote(icon: "safari.fill", text: SpeakText.render(.string(tip), t), tint: LKColor.onSurface) }
            Text(verbatim: h.help ? "🆘 " + t(.speakRpNgheRoiNoiTheo) : t(.speakRpBanCoTheNoi)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            HStack {
                Text(verbatim: h.line).studyText(LKType.titlePill).englishText()
                LessonIconButton(system: "speaker.wave.2.fill", label: t(.lessonKindListen)) { model.say(h.line, slow: h.help) }
            }
        }
        .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.tertiaryContainer.resolve(scheme)))
    }
    private func notice(_ n: RoleplayChatModel.Notice) -> some View {
        let text: String
        switch n {
        case .quota: text = t(.speakRpDaHetLuotAi)
        case .busy: text = t(.speakRpAiDangBanTiep)
        case .mic(let code): text = SpeakErrors.message(code, t)
        }
        return SkillNote(icon: "info.circle.fill", text: text, tint: LKColor.onSurface).frame(maxWidth: .infinity, alignment: .leading)
            .task(id: n) { try? await Task.sleep(nanoseconds: 4_000_000_000); if model.notice == n { model.notice = nil } }
    }

    // MARK: result
    private var scoring: some View {
        VStack(spacing: LKSpacing.spaceMd) {
            Spacer()
            ProgressView().controlSize(.large)
            Text(verbatim: t(.speakRpDangCham)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            Spacer()
        }
        .frame(maxWidth: .infinity)
        .accessibilityElement(children: .combine)
    }
    private func report(_ r: Roleplay.Report) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                Text(verbatim: t(.speakRpKetQuaHoiThoai)).studyText(LKType.headlineMd).accessibilityAddTraits(.isHeader)
                Text(verbatim: model.script.s("em") + " " + SpeakText.render(.string(Roleplay.nameKey(model.script, model.rules)), t) + " · " + model.levelName)
                    .studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
                if r.empty {
                    SkillCard { Text(verbatim: t(.speakRpBanChuaTraLoi)).studyText(LKType.bodyMd) }
                } else { score(r) }
                actions(r)
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceSm).padding(.bottom, LKSpacing.space2xl)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
    }
    private func label(_ c: Roleplay.Criterion) -> String {
        switch c {
        case .natural: return t(.speakRpDoTuNhien)
        case .polite: return t(.speakRpMucLichSu)
        case .clarity: return t(.speakRpDoRoY)
        case .grammar: return t(.mistGrammar)
        }
    }
    private func score(_ r: Roleplay.Report) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    HStack(spacing: LKSpacing.spaceMd) {
                        ZStack {
                            Circle().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 10)
                            Circle().trim(from: 0, to: Double(r.ring) / 100).stroke(LKColor.secondary.resolve(scheme), style: StrokeStyle(lineWidth: 10, lineCap: .round)).rotationEffect(.degrees(-90))
                            Text(verbatim: String(r.ring)).studyText(LKType.headlineMd)
                        }
                        .frame(width: 92, height: 92).accessibilityElement(children: .ignore).accessibilityLabel(Text(verbatim: "\(r.ring)/100"))
                        VStack(spacing: LKSpacing.spaceXs) {
                            ForEach(Array(r.meters.enumerated()), id: \.offset) { _, m in
                                HStack(spacing: LKSpacing.spaceXs) {
                                    Text(verbatim: label(m.0)).studyText(LKType.bodySm).frame(width: 86, alignment: .leading)
                                    SkillProgress(value: Double(m.1) / 100)
                                    Text(verbatim: String(m.1)).studyText(LKType.labelMetric).frame(width: 30, alignment: .trailing)
                                }
                                .accessibilityElement(children: .combine)
                            }
                        }
                    }
                    if !r.summary.isEmpty { Text(verbatim: r.summary).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true) }
                    Text(verbatim: (r.aiScored ? t(.speakRpChamBoiAi) : t(.speakRpUocLuongNhanhTren)) + " · +\(max(5, r.xp)) XP").studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                }
            }
            HStack(spacing: LKSpacing.spaceXs) { Image(systemName: "sparkles").accessibilityHidden(true); Text(verbatim: t(.speakRp3CauNoiSac)).studyText(LKType.headlineSm) }
                .accessibilityAddTraits(.isHeader)
            if r.rewrites.isEmpty { Text(verbatim: t(.speakRpRatTotKhongCo)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant) }
            ForEach(Array(r.rewrites.enumerated()), id: \.offset) { i, w in rewrite(i, w) }
        }
    }
    private func rewrite(_ i: Int, _ w: Roleplay.Rewrite) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(verbatim: w.you).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().strikethrough()
                HStack(alignment: .top) {
                    Text(verbatim: w.better).studyText(LKType.titlePill).englishText().fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    LessonIconButton(system: "speaker.wave.2.fill", label: t(.lessonKindListen)) { model.say(w.better) }
                }
                if !w.meaning.isEmpty { Text(verbatim: w.meaning).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
                SkillNote(icon: "lightbulb.fill", text: SpeakText.render(w.why, t))
                SkillAction(title: savedRewrites.contains(i) ? t(.revSaved) : "+ " + t(.dictSaveToFlashcards), enabled: !savedRewrites.contains(i)) {
                    savedRewrites.insert(i); Task { await model.save(w) }
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    @ViewBuilder private func actions(_ r: Roleplay.Report) -> some View {
        if model.done != nil {
            SkillAction(title: t(.actionContinue), icon: "chevron.forward", primary: true) { model.finishCallback(r) }
        } else {
            SkillAction(title: t(.speakPronLuyenLai), icon: "arrow.counterclockwise", primary: true) { onAgain() }
            SkillAction(title: t(.speakRpChonTinhHuongKhac)) { dismiss() }
            let path = Roleplay.confidencePath(model.script.s("id"), model.rules)
            Button { onRoute(AppRoute("confidence", arg: path.isEmpty ? nil : String(path.dropFirst()))) } label: {
                SkillCard {
                    HStack(spacing: LKSpacing.spaceSm) {
                        Image(systemName: "bubble.left.and.bubble.right.fill").foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(verbatim: t(.speakRpGiaoTiepTuTin)).studyText(LKType.titlePill)
                            Text(verbatim: path.isEmpty ? t(.speakRpLoTrinhNoiTheo) : t(.speakRpHocCacCumCau)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.leading)
                        }
                        Spacer(minLength: 0)
                        Image(systemName: "chevron.forward").accessibilityHidden(true)
                    }
                    .frame(minHeight: 44)
                }
            }
            .buttonStyle(LKPressStyle())
        }
    }
}
