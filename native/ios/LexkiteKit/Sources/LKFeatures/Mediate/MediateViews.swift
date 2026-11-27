import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// kind / activity of a lesson → its label (web `KIND` / `ACT`) and icon
enum MediateLabels {
    static func activity(_ a: String) -> L10nKey? {
        ["relay": .medActRelay, "summarise": .medActSummarise, "explain-data": .medActExplain, "simplify": .medActSimplify, "notes": .medActNotes, "facilitate": .medActFacilitate][a]
    }
    static func kind(_ k: String) -> L10nKey? {
        ["announcement": .medKindAnnouncement, "text": .medKindText, "notice": .medKindNotice, "talk": .medKindTalk, "dialogue": .medKindDialogue, "chart": .medKindChart][k]
    }
    static func kindIcon(_ k: String) -> String {
        ["announcement": "megaphone.fill", "text": "doc.text.fill", "email": "envelope.fill", "notice": "pin.fill", "talk": "mic.fill", "dialogue": "bubble.left.and.bubble.right.fill", "chart": "chart.bar.fill"][k] ?? "doc.text.fill"
    }
}

/// M4 P13 – #/mediate list (web `routes.mediate`): intro, then the lessons of each level with their chips and best score.
struct MediateListView: View {
    let model: MediateListModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        StudyPage(title: t(.medTitle)) {
            Text(t(.medIntro)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            ForEach(model.mediation.levels, id: \.self) { lv in
                let xs = model.mediation.items(level: lv)
                if !xs.isEmpty {
                    VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                        Text(verbatim: lv).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                        ForEach(xs) { x in row(x) }
                    }
                }
            }
        }
        .onAppear { model.load() }
        .accessibilityIdentifier("inner-mediate")
    }

    private func row(_ x: MediateItem) -> some View {
        let b = model.best[x.id]
        return Button { onRoute(model.route(x.id)) } label: {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    FlowLayout(spacing: 6) {
                        StudyChip(text: x.level)
                        if let k = MediateLabels.activity(x.activity) { StudyChip(text: t(k), icon: MediateLabels.kindIcon(x.source.kind), tint: LKColor.onSurfaceVariant) }
                        if x.task.speak { StudyChip(text: t(.medSpeak), icon: "mic.fill", tint: LKColor.onSurfaceVariant) }
                    }
                    Text(verbatim: x.title).studyText(LKType.titlePill).englishText().multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                    if let b { SkillNote(icon: "checkmark.circle.fill", text: t(.medScore, ["a": String(b.ok), "b": String(b.of)]), tint: LKColor.success) }
                }
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            }
        }
        .buttonStyle(LKPressStyle())
        .accessibilityElement(children: .combine)
        .accessibilityAddTraits(.isButton)
    }
}

/// M4 P13 – one lesson (web `render` + `result`).
struct MediateLessonView: View {
    let model: MediateLessonModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        let it = model.item
        StudyPage(title: t(.medTitle), onBack: { model.leave(); onRoute(AppRoute("mediate")) }) {
            FlowLayout(spacing: 6) {
                StudyChip(text: it.level)
                if let k = MediateLabels.activity(it.activity) { StudyChip(text: t(k), icon: MediateLabels.kindIcon(it.source.kind), tint: LKColor.onSurfaceVariant) }
            }
            Text(verbatim: it.title).studyText(LKType.headlineSm).englishText().fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
            SkillCard { EnglishText(text: it.scenario) }
            sourceCard
            taskCard
            if let r = model.result { resultCards(r) }
            actions
        }
        .onDisappear { model.leave() }
        .accessibilityIdentifier("inner-mediate-lesson")
    }

    // MARK: source
    private var sourceCard: some View {
        let S = model.item.source
        return SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack(spacing: LKSpacing.spaceSm) {
                    Image(systemName: MediateLabels.kindIcon(S.kind)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                    Text(verbatim: MediateLabels.kind(S.kind).map { t($0) } ?? "Email").studyText(LKType.titlePill).accessibilityAddTraits(.isHeader)
                    Spacer(minLength: 0)
                    if S.kind != "chart" {
                        Button { model.togglePlay() } label: {
                            Image(systemName: model.playing ? "stop.fill" : "speaker.wave.2.fill").font(.system(size: 18, weight: .bold))
                                .foregroundStyle(LKColor.onSurface.resolve(scheme)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap)
                                .tactile(fill: LKColor.surfaceContainerHigh, line: LKColor.outlineVariant, radius: 14)
                        }
                        .buttonStyle(LKPressStyle())
                        .accessibilityLabel(t(.medListen))
                        .accessibilityAddTraits(model.playing ? .isSelected : [])
                    }
                }
                Divider()
                if model.textShown { sourceBody(S) } else {
                    SkillNote(icon: "headphones", text: t(.medListenFirst))
                    SkillAction(title: t(.medShowText), icon: "eye") { model.reveal() }
                }
            }
        }
    }
    @ViewBuilder private func sourceBody(_ S: MediateSource) -> some View {
        switch S.kind {
        case "chart": chart(S)
        case "dialogue":
            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(S.lines.enumerated()), id: \.offset) { _, l in
                    (Text(verbatim: l.s + ": ").bold() + Text(verbatim: l.t)).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText().fixedSize(horizontal: false, vertical: true)
                }
            }
        default:
            VStack(alignment: .leading, spacing: 8) { ForEach(Array(S.paragraphs.enumerated()), id: \.offset) { _, p in EnglishText(text: p) } }
        }
    }
    private func chart(_ S: MediateSource) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            if !S.caption.isEmpty { EnglishText(text: S.caption, style: LKType.bodySm, color: LKColor.onSurfaceVariant) }
            ScrollView(.horizontal, showsIndicators: false) {
                Grid(alignment: .leading, horizontalSpacing: LKSpacing.spaceMd, verticalSpacing: 6) {
                    GridRow {
                        Text(verbatim: "").frame(minWidth: 40)
                        ForEach(Array(S.cols.enumerated()), id: \.offset) { _, c in Text(verbatim: c).studyText(LKType.titlePill).englishText() }
                    }
                    ForEach(Array(S.rows.enumerated()), id: \.offset) { _, r in
                        GridRow {
                            Text(verbatim: r.first ?? "").studyText(LKType.bodyMd).englishText().frame(minHeight: 32, alignment: .leading)
                            ForEach(Array(r.dropFirst().enumerated()), id: \.offset) { _, v in Text(verbatim: v + (S.unit == "%" ? "%" : "")).studyText(LKType.bodyMd).englishText() }
                        }
                    }
                }
                .accessibilityElement(children: .combine)
            }
            if !S.note.isEmpty { EnglishText(text: S.note, style: LKType.bodySm, color: LKColor.onSurfaceVariant) }
        }
    }

    // MARK: task
    private var taskCard: some View {
        let T = model.task
        return SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(t(.medTask)).studyText(LKType.titlePill).accessibilityAddTraits(.isHeader)
                HStack(spacing: 6) {
                    Text(t(.medSendTo) + ":").studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    Text(verbatim: T.audience).studyText(LKType.titlePill).englishText()
                }
                EnglishText(text: T.prompt)
                editor
                HStack(spacing: LKSpacing.spaceSm) {
                    counter
                    Spacer(minLength: 0)
                    micButton
                }
                if let n = model.notice { Text(verbatim: n).studyText(LKType.bodySm, LKColor.error).fixedSize(horizontal: false, vertical: true) }
                if let h = hint { Text(verbatim: h).studyText(LKType.bodySm, model.over ? LKColor.error : LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
            }
        }
    }
    private var editor: some View {
        let speak = model.task.speak
        return ZStack(alignment: .topLeading) {
            TextEditor(text: Bindable(model).text).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).scrollContentBackground(.hidden).englishText()
                .textInputAutocapitalization(.sentences)
                .accessibilityLabel(speak ? t(.medSpokenText) : t(.medYourText))
            if model.text.isEmpty {
                Text(speak ? t(.medPhSpeak) : t(.medPhWrite)).studyText(LKType.bodyLg, LKColor.onSurfaceVariant).allowsHitTesting(false).padding(.horizontal, 5).padding(.vertical, 8).accessibilityHidden(true)
            }
        }
        .frame(minHeight: speak ? 110 : 150).padding(LKSpacing.spaceXs)
        .tactile(fill: LKColor.surfaceContainerHigh, line: LKColor.outlineVariant, radius: 14)
    }
    private var counter: some View {
        let ok = model.inRange, over = model.over
        let tint: LKDynamicColor = ok ? LKColor.success : over ? LKColor.error : LKColor.onSurfaceVariant
        return HStack(spacing: 4) {
            if ok || over { Image(systemName: ok ? "checkmark.circle.fill" : "exclamationmark.circle.fill").font(.system(size: 13, weight: .bold)).accessibilityHidden(true) }
            Text(verbatim: t(.medCount, ["n": String(model.words), "r": model.task.range]))
        }
        .studyText(LKType.titlePill, tint).frame(minHeight: 44)
        .accessibilityElement(children: .combine)
    }
    @ViewBuilder private var micButton: some View {
        let speak = model.task.speak, label = model.listening ? t(.medListening) : speak ? t(.medSpeak) : t(.medSpeakInstead)
        let content = HStack(spacing: 6) {
            Image(systemName: model.listening ? "stop.fill" : "mic.fill").accessibilityHidden(true)
            Text(verbatim: label).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
        }
        if speak && !model.listening {
            Button { model.toggleMic() } label: { content }.buttonStyle(PrimaryButtonStyle())
        } else {
            Button { model.toggleMic() } label: { content }.buttonStyle(StudyOutlineButtonStyle()).accessibilityAddTraits(model.listening ? .isSelected : [])
        }
    }
    private var hint: String? {
        let T = model.task
        if model.tooShort { return t(T.speak ? .medNeedSpeak : .medNeedWrite, ["n": String(T.minWords)]) }
        if model.over { return t(.medTooLong, ["n": String(T.maxWords)]) }
        return nil
    }

    // MARK: result
    @ViewBuilder private func resultCards(_ r: MediateResult) -> some View {
        let it = model.item
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(verbatim: t(.medScore, ["a": String(r.got), "b": String(r.of)])).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                ForEach(Array(r.points.enumerated()), id: \.offset) { _, p in
                    line(icon: p.ok ? "checkmark.circle.fill" : "xmark.circle.fill", tint: p.ok ? LKColor.success : LKColor.error, text: p.idea, sr: p.ok ? t(.medHas) : t(.medMissing))
                }
                if !r.extra.isEmpty {
                    Text(t(.medDrop)).studyText(LKType.titlePill).accessibilityAddTraits(.isHeader)
                    ForEach(Array(r.extra.enumerated()), id: \.offset) { _, s in line(icon: "info.circle.fill", tint: LKColor.onSurfaceVariant, text: s, sr: t(.medDropSr)) }
                }
                if !r.copied.isEmpty {
                    SkillNote(icon: "lightbulb.fill", text: t(.medCopied) + " “" + r.copied + "…”")
                }
                if !r.inRange && model.over { SkillNote(icon: "lightbulb.fill", text: t(.medTooLong, ["n": String(model.task.maxWords)])) }
                if !it.explain.isEmpty { EnglishText(text: it.explain, style: LKType.bodySm, color: LKColor.onSurfaceVariant) }
            }
        }
        .accessibilityIdentifier("mediate-result")
        MediateFold(title: t(.medModel), open: true) { EnglishText(text: it.model) }
        if !it.useful.isEmpty { MediateFold(title: t(.medUseful)) { VStack(alignment: .leading, spacing: 6) { ForEach(it.useful, id: \.self) { EnglishText(text: "• " + $0) } } } }
        if !it.tips.isEmpty { MediateFold(title: t(.medTips)) { VStack(alignment: .leading, spacing: 6) { ForEach(it.tips, id: \.self) { EnglishText(text: "• " + $0) } } } }
    }
    /// ✓ / ✗ / i + the idea; the state is also read out (never colour alone)
    private func line(icon: String, tint: LKDynamicColor, text: String, sr: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
            Image(systemName: icon).foregroundStyle(tint.resolve(scheme)).accessibilityHidden(true)
            EnglishText(text: text)
        }
        .accessibilityElement(children: .ignore).accessibilityLabel(sr + " " + text)
    }

    // MARK: actions
    @ViewBuilder private var actions: some View {
        if model.result == nil {
            SkillAction(title: t(.medCheck), primary: true, enabled: model.canCheck) { model.check() }.frame(maxWidth: .infinity)
        } else {
            if let n = model.next { SkillAction(title: t(.medNext), primary: true) { model.leave(); onRoute(AppRoute("mediate", arg: n.id)) }.frame(maxWidth: .infinity) }
            SkillAction(title: t(.medRetry)) { model.retry() }.frame(maxWidth: .infinity)
        }
    }
}

/// a collapsible card (web `<details class="card">`)
struct MediateFold<Content: View>: View {
    let title: String
    var open = false
    let content: Content
    @State private var shown: Bool
    init(title: String, open: Bool = false, @ViewBuilder content: () -> Content) { self.title = title; self.open = open; self.content = content(); _shown = State(initialValue: open) }
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Button { shown.toggle() } label: {
                    HStack {
                        Text(verbatim: title).studyText(LKType.titlePill)
                        Spacer(minLength: 0)
                        Image(systemName: shown ? "chevron.up" : "chevron.down").font(.system(size: 13, weight: .bold)).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
                    }
                    .frame(minHeight: 44).contentShape(Rectangle())
                }
                .buttonStyle(.plain).accessibilityAddTraits(.isHeader).accessibilityValue(shown ? "▾" : "▸")
                if shown { content }
            }
        }
    }
}
