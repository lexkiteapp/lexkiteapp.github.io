import SwiftUI
import LKDesign
import LKStrings
import LKStore

// P14 – Interpreter screens (#/interpret · #/interpret/phrases[/<group>] · #/interpret/history · #/interpret/recap/<id>). Layout = the Android InterpretScreens: top half turned 180°
// for the person opposite, one mic per side (≥ 44 pt), translation shown on the half of the one who listens.

private extension View {
    /// text of one language reads in its own direction (Arabic right to left) inside any interface language
    func interpretDir(_ lang: String) -> some View { environment(\.layoutDirection, Interpret.rtl(lang) ? .rightToLeft : .leftToRight) }
}

/// The three doors of the Interpreter (face to face · phrasebook · history).
struct InterpretTabs: View {
    let cur: String
    let open: (String) -> Void
    @Environment(\.l10n) private var t
    var body: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            ForEach(Array(InterpretLabels.routes.enumerated()), id: \.offset) { _, r in
                InterpretChip(title: t(r.key), selected: cur == r.route) { if cur != r.route { open(r.route) } }
            }
        }
        .padding(.horizontal, LKFrame.shared.gutter)
    }
}

/// a tab / group chip: the selected one is the filled button, the others the outlined one (≥ 44 pt, never colour alone: also announced as selected)
private struct InterpretChip: View {
    let title: String
    let selected: Bool
    let action: () -> Void
    var body: some View {
        Group {
            if selected { Button(action: action) { label }.buttonStyle(PrimaryButtonStyle()) }
            else { Button(action: action) { label }.buttonStyle(StudyOutlineButtonStyle()) }
        }
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
    private var label: some View { Text(verbatim: title).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true) }
}

/// the language chooser of one side: its own name + a menu of the 15 languages
private struct InterpretLangMenu: View {
    let lang: String
    let pick: (String) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Menu {
            ForEach(Interpret.codes, id: \.self) { c in
                Button { pick(c) } label: { if c == lang { Label(InterpretLabels.nativeName(c), systemImage: "checkmark") } else { Text(verbatim: InterpretLabels.nativeName(c)) } }
            }
        } label: {
            HStack(spacing: 4) {
                Text(verbatim: InterpretLabels.nativeName(lang)).lkTextSafe(LKType.titlePill)
                Image(systemName: "chevron.down").font(.system(size: 12, weight: .bold)).accessibilityHidden(true)
            }
            .foregroundStyle(LKColor.onSurface.resolve(scheme))
            .padding(.horizontal, LKSpacing.spaceSm)
            .frame(minHeight: LKFrame.shared.minTap)
            .background(Capsule().fill(LKColor.surfaceContainer.resolve(scheme)))
        }
        .accessibilityLabel(Text(verbatim: t(.interpretChooseLang) + ": " + InterpretLabels.nativeName(lang)))
    }
}

/// a round action (≥ 44 pt); grey and inert when not available
private struct InterpretRound: View {
    let system: String, label: String
    var enabled = true
    let action: () -> Void
    var body: some View {
        LessonIconButton(system: system, label: label, action: action).disabled(!enabled).opacity(enabled ? 1 : 0.4)
    }
}

private struct InterpretNotice: View {
    let msg: InterpretMsg
    @Environment(\.l10n) private var t
    var body: some View {
        SkillNote(icon: msg.isOK ? "checkmark.circle.fill" : "exclamationmark.triangle.fill", text: msg.text(t), tint: msg.isOK ? LKColor.success : LKColor.error)
            .frame(maxWidth: .infinity, alignment: .leading)
            .accessibilityElement(children: .combine)
    }
}

// MARK: - face to face

struct InterpretTalkView: View {
    let model: InterpretTalkModel
    var open: (String) -> Void = { _ in }
    var exit: () -> Void = {}
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .inner, title: t(.interpretTitle)) { model.leave(); exit() }
            InterpretTabs(cur: "interpret", open: { model.leave(); open($0) })
            VStack(spacing: LKSpacing.spaceXs) {
                half("b", turned: true)
                HStack {
                    Spacer(minLength: 0)
                    InterpretRound(system: "arrow.up.arrow.down", label: t(.interpretSwap)) { model.swap() }
                    Spacer(minLength: 0)
                    InterpretRound(system: "speaker.wave.2.fill", label: t(.lessonReplay), enabled: model.hasLast) { model.play() }
                    Spacer(minLength: 0)
                    InterpretRound(system: "tortoise.fill", label: t(.lessonSlowShort), enabled: model.hasLast) { model.play(slow: true) }
                    Spacer(minLength: 0)
                    InterpretRound(system: "text.book.closed.fill", label: t(.interpretSave), enabled: model.hasLast) { model.save() }
                    Spacer(minLength: 0)
                    InterpretRound(system: "waveform.and.mic", label: t(.interpretSayBack), enabled: model.hasLast && model.canListen) { model.sayBack() }
                    Spacer(minLength: 0)
                }
                .accessibilityElement(children: .contain)
                .accessibilityLabel(Text(verbatim: t(.interpretLatest)))
                if let s = model.score { Text(verbatim: s.text(t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).frame(maxWidth: .infinity, alignment: .leading).accessibilityAddTraits(.updatesFrequently) }
                if let m = model.toast { InterpretNotice(msg: m) }
                half("a", turned: false)
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceXs)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity, maxHeight: .infinity)
            VStack(spacing: LKSpacing.spaceXs) {
                if model.canDownload { SkillAction(title: t(.interpretDownloadPack), icon: "arrow.down.circle", enabled: !model.packBusy) { model.pack() } }
                SkillAction(title: t(.interpretFinish), primary: true) { let r = model.end(); open(r) }
                Text(verbatim: t(.interpretNote)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center).frame(maxWidth: .infinity)
            }
            .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceXs)
            .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .interpretTranslation(model.env.translator)
        .onDisappear { model.leave() }
        .accessibilityIdentifier("inner-interpret")
    }

    /// One half: its language, what was said to this person (translation), the live words and ITS mic. The top half is turned 180° for the person opposite.
    private func half(_ side: String, turned: Bool) -> some View {
        let lang = Interpret.lang(model.pair, side), on = model.listening == side
        let heard = model.heard[side] ?? "", live = model.live[side] ?? ""
        let micLabel = on ? t(.interpretListening) : t(.interpretTapToSpeak)
        let enabled = model.canListen && !model.busy
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            HStack(spacing: LKSpacing.spaceXs) {
                InterpretLangMenu(lang: lang) { model.setLang(side, $0) }
                if let b = model.badge, b.side == side { StudyChip(text: b.local ? t(.interpretOnDevice) : t(.interpretOnline), icon: b.local ? "iphone" : "wifi") }
                Spacer(minLength: 0)
            }
            ScrollView {
                VStack(alignment: .leading, spacing: 4) {
                    if !heard.isEmpty { Text(verbatim: heard).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.updatesFrequently) }
                    else { Text(verbatim: t(.interpretPlaceholder)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                    if !live.isEmpty && live != heard { Text(verbatim: live).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .frame(maxHeight: .infinity)
            HStack(spacing: LKSpacing.spaceSm) {
                Button { model.mic(side) } label: {
                    Image(systemName: on ? "stop.fill" : "mic.fill").font(.system(size: 26, weight: .bold))
                        .foregroundStyle((on ? LKColor.onError : enabled ? LKColor.onPrimary : LKColor.onSurfaceVariant).resolve(scheme))
                        .frame(width: 64, height: 64)
                        .background(Circle().fill((on ? LKColor.error : enabled ? LKColor.primary : LKColor.surfaceContainerHigh).resolve(scheme)))
                }
                .buttonStyle(LKPressStyle()).disabled(!enabled && !on)
                .accessibilityLabel(Text(verbatim: micLabel))
                .accessibilityAddTraits(on ? .isSelected : [])
                Text(verbatim: micLabel).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
            }
        }
        .padding(LKSpacing.spaceSm)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(LKColor.surfaceContainerHighest.resolve(scheme)))
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).stroke((on ? LKColor.error : LKColor.outlineVariant).resolve(scheme), lineWidth: 2))
        .interpretDir(lang)
        .rotationEffect(.degrees(turned ? 180 : 0))
    }
}

// MARK: - phrasebook

struct InterpretPhrasesView: View {
    let model: InterpretPhrasesModel
    var open: (String) -> Void = { _ in }
    var exit: () -> Void = {}
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .inner, title: t(.interpretTravelPhrases)) { model.leave(); exit() }
            InterpretTabs(cur: "interpret/phrases", open: { model.leave(); open($0) })
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    HStack(spacing: LKSpacing.spaceXs) {
                        InterpretLangMenu(lang: model.pair.a) { model.setLang("a", $0) }
                        Image(systemName: "arrow.right").foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
                        InterpretLangMenu(lang: model.pair.b) { model.setLang("b", $0) }
                    }
                    if model.failed { StudyEmpty(icon: "suitcase.fill", title: t(.interpretPhrasesFail)) }
                    else if let book = model.book {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: LKSpacing.spaceXs) {
                                ForEach(book.order, id: \.self) { g in
                                    InterpretChip(title: t(InterpretLabels.group(g)), selected: g == model.group) { model.pick(g) }.fixedSize()
                                }
                            }
                        }
                        ForEach(Array(model.items.enumerated()), id: \.offset) { i, o in card(i, o) }
                    }
                    if let s = model.score { Text(verbatim: s.text(t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).accessibilityAddTraits(.updatesFrequently) }
                    if let m = model.toast { InterpretNotice(msg: m) }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .onDisappear { model.leave() }
        .accessibilityIdentifier("inner-interpret-phrases")
    }

    private func card(_ i: Int, _ o: [String: String]) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(verbatim: o[model.pair.a] ?? "").studyText(LKType.bodyMd, LKColor.onSurfaceVariant).interpretDir(model.pair.a).frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true)
                Text(verbatim: o[model.pair.b] ?? "").studyText(LKType.headlineSm).interpretDir(model.pair.b).frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true)
                HStack(spacing: LKSpacing.spaceSm) {
                    InterpretRound(system: "speaker.wave.2.fill", label: t(.lessonKindListen)) { model.play(i, slow: false) }
                    InterpretRound(system: "tortoise.fill", label: t(.lessonSlowShort)) { model.play(i, slow: true) }
                    InterpretRound(system: "text.book.closed.fill", label: t(.interpretSave)) { model.save(i) }
                    InterpretRound(system: "waveform.and.mic", label: t(.interpretSayBack), enabled: !model.saying) { model.sayBack(i) }
                }
            }
        }
    }
}

// MARK: - history + recap

struct InterpretHistoryView: View {
    let model: InterpretHistoryModel
    var open: (String) -> Void = { _ in }
    var exit: () -> Void = {}
    @State private var ask = false
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .inner, title: t(.interpretHistoryTitle)) { exit() }
            InterpretTabs(cur: "interpret/history", open: open)
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    if let cs = model.convs, cs.isEmpty { StudyEmpty(icon: "bubble.left.and.bubble.right.fill", title: t(.interpretEmpty)) }
                    ForEach(model.convs ?? [], id: \.id) { cv in
                        let title = InterpretLabels.nativeName(cv.a) + " ⇄ " + InterpretLabels.nativeName(cv.b)
                        Button { open("interpret/recap/\(cv.id)") } label: {
                            SkillCard {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(verbatim: title).studyText(LKType.titlePill)
                                    Text(verbatim: date(cv.t) + " · " + t(.skillQtNCau, ["n": cv.turns.count])).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                                }
                                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            }
                        }
                        .buttonStyle(LKPressStyle())
                        .accessibilityElement(children: .combine).accessibilityAddTraits(.isButton)
                    }
                    if let cs = model.convs, !cs.isEmpty { SkillAction(title: t(.interpretClearHistory), icon: "trash") { ask = true } }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .toolbar(.hidden, for: .navigationBar)
        .onAppear { model.load() }
        .alert(t(.interpretConfirmClear), isPresented: $ask) {
            Button(t(.interpretClearHistory), role: .destructive) { model.clear() }
            Button(t(.actionCancel), role: .cancel) {}
        }
        .accessibilityIdentifier("inner-interpret-history")
    }
    private func date(_ ms: Int64) -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: t.lang); f.dateStyle = .medium; f.timeStyle = .short
        return f.string(from: Date(timeIntervalSince1970: Double(ms) / 1000))
    }
}

struct InterpretRecapView: View {
    let model: InterpretHistoryModel
    var open: (String) -> Void = { _ in }
    var exit: () -> Void = {}
    @Environment(\.l10n) private var t

    var body: some View {
        StudyPage(title: t(.interpretRecapTitle), onBack: { model.leave(); exit() }) {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: t(.interpretWorth)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                    if model.cards.isEmpty { Text(verbatim: t(.interpretNoCards)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant) }
                    ForEach(Array(model.cards.enumerated()), id: \.offset) { _, x in
                        HStack(spacing: LKSpacing.spaceSm) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(verbatim: x.word).studyText(LKType.titlePill).interpretDir(x.lang).frame(maxWidth: .infinity, alignment: .leading).fixedSize(horizontal: false, vertical: true)
                                Text(verbatim: x.def).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                            }
                            InterpretRound(system: "speaker.wave.2.fill", label: t(.lessonKindListen)) { model.speak(x) }
                        }
                        .frame(minHeight: 48)
                    }
                }
            }
            if !model.keywords.isEmpty {
                SkillCard {
                    VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                        Text(verbatim: t(.skillReadTuKhoa)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                        FlowLayout(spacing: 6) { ForEach(model.keywords, id: \.self) { StudyChip(text: $0) } }.interpretDir(model.foreign)
                    }
                }
            }
            if let m = model.toast { InterpretNotice(msg: m) }
            if !model.cards.isEmpty { SkillAction(title: t(.interpretSaveN, ["n": model.cards.count]), primary: true) { model.saveAll() } }
            SkillAction(title: t(.interpretNewConv)) { open("interpret") }
        }
        .onDisappear { model.leave() }
        .accessibilityIdentifier("inner-interpret-recap")
    }
}
