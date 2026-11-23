import SwiftUI
import LKDesign
import LKStrings
import LKStore

/// The note line of the screen (the web toasts) in the UI language.
private func noteText(_ n: InterpNote, _ t: L10n) -> String {
    switch n {
    case .nothingHeard: t(.interpretNothingHeard)
    case .failed: t(.interpretFailed)
    case .micDenied: t(.interpretMicNeeded)
    case .sameLang: t(.interpretSameLang)
    case .saved: t(.interpretSaved)
    case .unsupported: t(.interpretUnsupported)
    case .downloading: t(.interpretDownloading)
    case .ready: t(.interpretReady)
    case .sayPrompt(let s): t(.interpretSayThis, ["s": s])
    case .score(let n, let h): t(.interpretScore, ["n": n, "h": h])
    case .recogErr(let e): t(.interpRecogErr, ["err": e])
    }
}
private func groupTitle(_ g: String) -> L10nKey {
    switch g { case "hi": .interpretGHi; case "go": .interpretGGo; case "eat": .interpretGEat; case "stay": .interpretGStay; default: .interpretGSos }
}
private func dirOf(_ lang: String) -> LayoutDirection { Interp.isRTL(lang) ? .rightToLeft : .leftToRight }

/// Language picker: the language written in itself; picking the other side's language swaps the two.
private struct LangMenu: View {
    let lang: String
    let label: String
    let onPick: (String) -> Void
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Menu {
            ForEach(Interp.codes, id: \.self) { c in
                Button { onPick(c) } label: { if c == Interp.base(lang) { Label(Interp.endonym(c), systemImage: "checkmark") } else { Text(verbatim: Interp.endonym(c)) } }
            }
        } label: {
            HStack(spacing: 6) {
                Text(verbatim: Interp.endonym(lang)).studyText(LKType.titlePill)
                Image(systemName: "chevron.down").font(.system(size: 12, weight: .bold)).accessibilityHidden(true)
            }
            .foregroundStyle(LKColor.onSurface.resolve(scheme))
            .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
            .background(Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
        }
        .accessibilityLabel(label)
        .accessibilityValue(Interp.endonym(lang))
    }
}

/// Round icon action (≥ 44 pt) of the middle bar and of the phrase rows.
private struct RoundAction: View {
    let icon: String, label: String
    var enabled = true
    let run: () -> Void
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button(action: run) {
            Image(systemName: icon).font(.system(size: 18, weight: .bold)).frame(width: 48, height: 48)
                .foregroundStyle((enabled ? LKColor.onSurface : LKColor.onSurfaceVariant).resolve(scheme))
                .background(Circle().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
                .overlay(Circle().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 1))
        }
        .buttonStyle(.plain).disabled(!enabled)
        .accessibilityLabel(label)
    }
}

// MARK: - the screen
struct InterpretView: View {
    let model: InterpretHubModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .inner, title: t(.interpretTitle)) { model.stop(); dismiss() }
            chips
            switch model.section {
            case .talk: InterpretTalkView(model: model.talk, onEnd: { id in
                if let id { onRoute(AppRoute("interpret", arg: "recap/\(id)")) } else { model.select(.history) } })
            case .phrases: InterpretPhrasesView(model: model.phrases)
            case .history: InterpretHistoryView(model: model.history, onRoute: onRoute)
            }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .interpTranslation(model.talk.translator)
        .onDisappear { model.stop() }
        .accessibilityIdentifier("inner-interpret")
    }

    private var chips: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            ForEach([(InterpretHubModel.Section.talk, L10nKey.interpretFaceToFace), (.phrases, .interpretPhrasebook), (.history, .interpretHistory)], id: \.0) { s, k in
                let on = model.section == s
                Button { model.select(s) } label: {
                    Text(verbatim: t(k)).lkTextSafe(LKType.labelBadge).lineLimit(1).minimumScaleFactor(0.75).multilineTextAlignment(.center)
                        .foregroundStyle((on ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
                        .frame(maxWidth: .infinity, minHeight: 44).padding(.horizontal, 6)
                        .background(Capsule().fill((on ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
        .padding(.horizontal, LKFrame.shared.gutter).padding(.bottom, LKSpacing.spaceXs)
        .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
    }
}

// MARK: - Đối mặt
/// The face-to-face screen: two halves, the upper one turned 180° for the person on the other side of the phone; one mic per side.
struct InterpretTalkView: View {
    let model: InterpretTalkModel
    var onEnd: (String?) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            half(.b).rotationEffect(.degrees(180))
            mid
            half(.a)
            footer
        }
        .padding(.horizontal, LKFrame.shared.gutter).padding(.bottom, LKSpacing.spaceSm)
        .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
    }

    private func half(_ s: InterpSide) -> some View {
        let lang = model.lang(s), on = model.listening == s
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            HStack {
                LangMenu(lang: lang, label: t(.interpretChooseLang)) { model.setLang(s, $0) }
                if let b = model.badge, b.side == s { StudyChip(text: b.local ? t(.interpretOnDevice) : t(.interpretOnline), icon: b.local ? "iphone" : "wifi") }
                Spacer(minLength: 0)
            }
            Text(verbatim: model.heard[s] ?? t(.interpretPlaceholder))
                .studyText(LKType.headlineSm, model.heard[s] == nil ? LKColor.onSurfaceVariant : LKColor.onSurface)
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading).minimumScaleFactor(0.7)
                .accessibilityAddTraits(.updatesFrequently)
            Text(verbatim: model.live[s] ?? "").studyText(LKType.bodySm, LKColor.onSurfaceVariant).lineLimit(2).frame(minHeight: 18, alignment: .leading)
            Button { Task { await model.tap(s) } } label: {
                HStack(spacing: 10) {
                    Image(systemName: on ? "stop.fill" : "mic.fill").font(.system(size: 20, weight: .bold)).accessibilityHidden(true)
                    Text(verbatim: on ? t(.interpretListening) : t(.interpretTapToSpeak)).lkTextSafe(LKType.titlePill).multilineTextAlignment(.leading)
                }
                .foregroundStyle((on ? LKColor.onPrimary : LKColor.onSecondary).resolve(scheme))
                .frame(maxWidth: .infinity, minHeight: 56).padding(.horizontal, LKSpacing.spaceSm)
                .background(Capsule().fill((on ? LKColor.primary : LKColor.secondary).resolve(scheme)))
            }
            .buttonStyle(.plain).disabled(model.busy)
            .accessibilityLabel(t(.interpSpeak)).accessibilityValue(Interp.endonym(lang)).accessibilityAddTraits(on ? .isSelected : [])
            .accessibilityIdentifier("interpret-mic-\(s.rawValue)")
        }
        .padding(LKSpacing.spaceSm)
        .frame(maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: 24).fill(LKColor.surfaceContainer.resolve(scheme)))
        .environment(\.layoutDirection, dirOf(lang))
        .environment(\.locale, Locale(identifier: lang))
    }

    private var mid: some View {
        HStack(spacing: LKSpacing.spaceSm) {
            RoundAction(icon: "speaker.wave.2.fill", label: t(.interpReplay), enabled: model.hasTurn) { model.replay() }
            RoundAction(icon: "tortoise.fill", label: t(.interpSlow), enabled: model.hasTurn) { model.replay(slow: true) }
            RoundAction(icon: "arrow.up.arrow.down", label: t(.interpretSwap)) { model.swap() }
            RoundAction(icon: "bookmark.fill", label: t(.interpretSave), enabled: model.hasTurn) { Task { await model.saveLast() } }
            RoundAction(icon: "mic.badge.plus", label: t(.interpretSayBack), enabled: model.hasTurn) { Task { await model.sayBack() } }
        }
        .accessibilityElement(children: .contain).accessibilityLabel(t(.interpretLatest))
    }

    private var footer: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            Text(verbatim: model.note.map { noteText($0, t) } ?? "").studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
                .frame(maxWidth: .infinity, minHeight: 18).accessibilityAddTraits(.updatesFrequently)
            HStack(spacing: LKSpacing.spaceXs) {
                SkillAction(title: t(.interpretFinish), primary: true) { onEnd(model.end()) }
                SkillAction(title: t(.interpretDownloadPack), icon: "arrow.down.circle") { Task { await model.downloadPack() } }
            }
            Text(verbatim: t(.interpretNote)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
        }
    }
}

// MARK: - Câu nói mẫu
struct InterpretPhrasesView: View {
    let model: InterpretPhrasesModel
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(verbatim: t(.interpretTravelPhrases)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                HStack(spacing: LKSpacing.spaceXs) {
                    LangMenu(lang: model.pair.a, label: t(.interpretChooseLang)) { model.setLang(.a, $0) }
                    Image(systemName: "arrow.right").accessibilityHidden(true).flipsForRightToLeftLayoutDirection(true)
                    LangMenu(lang: model.pair.b, label: t(.interpretChooseLang)) { model.setLang(.b, $0) }
                }
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: LKSpacing.spaceXs) {
                        ForEach(model.data.order, id: \.self) { g in
                            let on = g == model.group
                            Button { model.select(g) } label: {
                                Text(verbatim: t(groupTitle(g))).lkTextSafe(LKType.labelBadge)
                                    .foregroundStyle((on ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
                                    .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
                                    .background(Capsule().fill((on ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                            }
                            .buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
                        }
                    }
                }
                ForEach(Array(model.items.enumerated()), id: \.offset) { i, item in row(i, item) }
                Text(verbatim: model.note.map { noteText($0, t) } ?? "").studyText(LKType.bodySm, LKColor.onSurfaceVariant).frame(maxWidth: .infinity, minHeight: 18, alignment: .leading)
                    .accessibilityAddTraits(.updatesFrequently)
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
    }

    private func row(_ i: Int, _ item: InterpPhrases.Item) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(verbatim: model.text(item, .a)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
                    .environment(\.layoutDirection, dirOf(model.pair.a)).frame(maxWidth: .infinity, alignment: .leading)
                Text(verbatim: model.text(item, .b)).studyText(LKType.titlePill)
                    .environment(\.layoutDirection, dirOf(model.pair.b)).frame(maxWidth: .infinity, alignment: .leading)
                HStack(spacing: LKSpacing.spaceXs) {
                    RoundAction(icon: "speaker.wave.2.fill", label: t(.interpListen)) { model.play(i) }
                    RoundAction(icon: "tortoise.fill", label: t(.interpSlow)) { model.play(i, slow: true) }
                    RoundAction(icon: "bookmark.fill", label: t(.interpretSave)) { Task { await model.save(i) } }
                    RoundAction(icon: "mic.badge.plus", label: t(.interpretSayBack)) { Task { await model.sayBack(i) } }
                }
            }
        }
    }
}

// MARK: - Lịch sử
struct InterpretHistoryView: View {
    let model: InterpretHistoryModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @State private var confirm = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(verbatim: t(.interpretHistoryTitle)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                if model.convs.isEmpty {
                    StudyEmpty(icon: "bubble.left.and.bubble.right.fill", title: t(.interpretEmpty))
                } else {
                    ForEach(model.convs) { c in
                        Button { onRoute(AppRoute("interpret", arg: "recap/\(c.id)")) } label: {
                            SkillCard {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(verbatim: "\(Interp.endonym(c.a)) ⇄ \(Interp.endonym(c.b))").studyText(LKType.titlePill)
                                    HStack(spacing: 6) {
                                        Text(Date(timeIntervalSince1970: Double(c.t) / 1000), format: .dateTime.day().month(.abbreviated).year().hour().minute())
                                        Text(verbatim: "· \(c.turns.count)")
                                        Image(systemName: "bubble.left.and.bubble.right").accessibilityHidden(true)
                                    }.studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                                }.frame(maxWidth: .infinity, alignment: .leading)
                            }
                        }
                        .buttonStyle(LKPressStyle())
                    }
                    SkillAction(title: t(.interpretClearHistory), icon: "trash") { confirm = true }
                }
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
        .confirmationDialog(t(.interpretConfirmClear), isPresented: $confirm, titleVisibility: .visible) {
            Button(t(.interpDelete), role: .destructive) { model.clear() }
            Button(t(.interpCancel), role: .cancel) {}
        }
    }
}

// MARK: - Từ mới sau cuộc hội thoại
struct InterpretRecapView: View {
    let model: InterpretRecapModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @Environment(\.liveContent) private var live

    var body: some View {
        StudyPage(title: t(.interpretRecapTitle)) {
            SkillCard {
                Text(verbatim: t(.interpretWorth)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                if model.cards.isEmpty { Text(verbatim: t(.interpretNoCards)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant) }
                ForEach(Array(model.cards.enumerated()), id: \.offset) { i, c in
                    HStack(spacing: LKSpacing.spaceXs) {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(verbatim: c.word).studyText(LKType.titlePill).environment(\.layoutDirection, dirOf(c.lang))
                            Text(verbatim: c.def).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                        }.frame(maxWidth: .infinity, alignment: .leading)
                        RoundAction(icon: "speaker.wave.2.fill", label: t(.interpListen)) { model.play(i) }
                    }
                }
            }
            if !model.keywords.isEmpty {
                SkillCard {
                    Text(verbatim: t(.interpKeywords)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 96), spacing: LKSpacing.spaceXs, alignment: .leading)], alignment: .leading, spacing: LKSpacing.spaceXs) {
                        ForEach(model.keywords, id: \.self) { w in StudyChip(text: w).environment(\.layoutDirection, dirOf(model.foreign)) }
                    }
                }
            }
            if let n = model.note { Text(verbatim: noteText(n, t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).accessibilityAddTraits(.updatesFrequently) }
            if !model.cards.isEmpty { SkillAction(title: t(.interpretSaveN, ["n": model.cards.count]), icon: "bookmark.fill", primary: true) { Task { await model.saveAll() } } }
            SkillAction(title: t(.interpretNewConv)) { onRoute(AppRoute("interpret")) }
        }
        .task { if live { await model.load() } }
        .accessibilityIdentifier("inner-interpret-recap")
    }
}
