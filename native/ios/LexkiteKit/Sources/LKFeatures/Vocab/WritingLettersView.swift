import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/letters (IELTS General Task 1 letters by tone) and #/letters/<id> (write with word count, 20-minute clock, draft kept, self-check).
struct WritingLettersView: View {
    let route: AppRoute
    let source: WritingContentSource
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var letters: [JSON]?
    @State private var tone: String
    @State private var drafts: [String: String]
    @State private var text = ""
    @State private var checks: [WritingEngine.LetterCheck]?
    @State private var remaining = WritingEngine.letterMinutes * 60
    @State private var running = false
    @State private var timeUp = false
    @State private var saveTask: Task<Void, Never>?
    @FocusState private var editing: Bool

    init(route: AppRoute, source: WritingContentSource = WritingRemoteContent.shared, letters: [JSON]? = nil, drafts: [String: String]? = nil) {
        self.route = route; self.source = source
        _letters = State(initialValue: letters)
        _tone = State(initialValue: route.query["tone"] ?? "all")
        let d = drafts ?? WritingLocal.dict(WritingLocal.draftsKey)
        _drafts = State(initialValue: d)
        _text = State(initialValue: route.arg.flatMap { d[$0] } ?? "")
    }

    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }
    private var accent: Color { LKColor.secondary.resolve(scheme) }

    var body: some View {
        WritingPage(title: t(.lettersLetterWritingIeltsGeneral)) {
            if let all = letters {
                if let id = route.arg, let x = all.first(where: { $0.s("id") == id }) { practice(x) } else { list(all) }
            } else { WritingSkeleton(rows: 5) }
        }
        .task { if letters == nil { letters = await source.letters() } }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in
            guard running else { return }
            if remaining > 0 { remaining -= 1 }
            if remaining == 0 { running = false; timeUp = true }
        }
    }

    private func toneName(_ k: String) -> String {
        switch k { case "formal": return t(.lettersFormal); case "semi-formal": return t(.lettersSemiFormal); case "informal": return t(.lettersInformal); default: return t(.vocabAll) }
    }
    private func toneTip(_ k: String) -> String {
        switch k { case "formal": return t(.lettersRecipientSNameUnknown); case "semi-formal": return t(.lettersSomeoneYouKnowBut); default: return t(.lettersFriendsAndFamilyDear) }
    }
    private func title(_ x: JSON) -> String {
        let vi = x.s("titleVi")
        if !vi.isEmpty, let tr = t.translate(source: vi) { return tr }
        return services.uiLang == "vi" && !vi.isEmpty ? vi : x.s("topic").prefix(1).uppercased() + x.s("topic").dropFirst()
    }

    // MARK: list
    @ViewBuilder private func list(_ all: [JSON]) -> some View {
        let v = WritingEngine.letters(all, tone: tone, drafts: .object(drafts.mapValues { .string($0) }))
        VStack(alignment: .leading, spacing: 4) {
            Text(t(.lettersWriteALetterOf)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
        }
        FlowLayout { ForEach(v.tabs, id: \.tone) { tab in WritingChip(text: toneName(tab.tone) + " " + String(tab.n), selected: (tone == tab.tone) || (tab.tone == "all" && !WritingEngine.tones.contains(tone))) { tone = tab.tone } } }
        if v.tip {
            Label { Text(toneTip(tone)).lkTextSafe(LKType.bodyMd).foregroundStyle(ink) } icon: { Image(systemName: "lightbulb.fill").foregroundStyle(LKColor.tertiary.resolve(scheme)) }
                .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
        }
        if v.cards.isEmpty { WritingNotice(icon: "envelope", text: t(.lettersComingSoon)) }
        ForEach(v.cards, id: \.id) { c in
            let x = all.first { $0.s("id") == c.id } ?? .null
            WritingCard {
                HStack {
                    WritingTag(text: toneName(c.tone))
                    if let n = c.draftWords { WritingTag(text: t(.vocabWords, ["n": n]), tint: LKColor.success) }
                    Spacer(minLength: 0)
                }
                Text(title(x)).lkTextSafe(LKType.headlineSm).foregroundStyle(ink)
                Text(c.situation).lkTextSafe(LKType.bodySm).foregroundStyle(dim).englishText().frame(maxWidth: .infinity, alignment: .leading)
                FlowLayout {
                    Button { services.router.open(AppRoute("letters", arg: c.id)) } label: { Label(t(.lettersPractiseWriting), systemImage: "square.and.pencil") }.buttonStyle(WritingSecondaryButtonStyle())
                    Button { services.router.open(AppRoute("model", arg: "gt-" + c.id)) } label: { Label(t(.lettersModelAnswer), systemImage: "doc.text") }.buttonStyle(WritingSecondaryButtonStyle())
                }
            }
        }
    }

    // MARK: practice
    @ViewBuilder private func practice(_ x: JSON) -> some View {
        let id = x.s("id"), n = WritingEngine.wordCount(text)
        Button { services.router.open(AppRoute("letters", query: ["tone": x.s("tone")])) } label: { Label(t(.lettersAllLetterTasks), systemImage: "chevron.backward") }.buttonStyle(WritingSecondaryButtonStyle())
        WritingCard {
            HStack { WritingTag(text: toneName(x.s("tone"))); WritingTag(text: "IELTS General · Task 1", tint: LKColor.onSurfaceVariant); Spacer(minLength: 0) }
            WritingEnglish(text: x.s("situation"), style: LKType.bodyLg)
            WritingEnglish(text: "Write a letter to " + (x.t("to") ? x.s("to") : "the person") + ". In your letter:", style: LKType.bodyMd, color: LKColor.onSurfaceVariant)
            ForEach(x.strs("bullets"), id: \.self) { b in
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) { Image(systemName: "circle.fill").font(.system(size: 6)).padding(.top, 8).foregroundStyle(accent); WritingEnglish(text: b, style: LKType.bodyMd) }
            }
            WritingEnglish(text: "Write at least 150 words. You do NOT need to write any addresses. Begin your letter as follows: " + x.s("open"), style: LKType.bodySm, color: LKColor.onSurfaceVariant)
            DisclosureGroup {
                Text(toneTip(x.s("tone"))).lkTextSafe(LKType.bodySm).foregroundStyle(dim).padding(.top, 4)
            } label: { Text(t(.lettersToneOpeningsClosings)).lkTextSafe(LKType.titlePill).foregroundStyle(ink).frame(minHeight: LKFrame.shared.minTap, alignment: .leading) }
        }
        WritingCard {
            ZStack(alignment: .topLeading) {
                TextEditor(text: $text).lkTextSafe(LKType.bodyLg).foregroundStyle(ink).scrollContentBackground(.hidden).englishText().focused($editing)
                    .frame(minHeight: 280).padding(4)
                    .onChange(of: text) { _, v in scheduleSave(id, v); checks = nil }
                if text.isEmpty { Text(x.s("open")).lkTextSafe(LKType.bodyLg).foregroundStyle(dim).englishText().padding(.horizontal, 9).padding(.vertical, 12).allowsHitTesting(false) }
            }
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
            HStack {
                WritingTag(text: t(.vocabWords, ["n": n]), tint: n >= WritingEngine.letterMinWords ? LKColor.success : LKColor.onSurfaceVariant)
                Button { toggleClock() } label: { Label(clock, systemImage: running ? "pause.fill" : "timer").monospacedDigit() }.buttonStyle(WritingSecondaryButtonStyle())
                    .accessibilityLabel(clock)
                Spacer(minLength: 0)
            }
            if timeUp { Text(t(.lettersTimeSUp)).lkTextSafe(LKType.titlePill).foregroundStyle(LKColor.error.resolve(scheme)).accessibilityAddTraits(.updatesFrequently) }
            Button(t(.actionCheck)) { editing = false; checks = WritingEngine.checkLetter(x, text: text) }.buttonStyle(PrimaryButtonStyle())
            if let checks { results(checks, x) }
            Button { services.router.open(AppRoute("model", arg: "gt-" + id)) } label: { Label(t(.lettersShowModel), systemImage: "doc.text") }.buttonStyle(WritingSecondaryButtonStyle())
        }
    }
    private var clock: String { String(format: "%02d:%02d", remaining / 60, remaining % 60) }
    private func toggleClock() {
        if running { running = false; remaining = WritingEngine.letterMinutes * 60; timeUp = false } else { timeUp = false; if remaining == 0 { remaining = WritingEngine.letterMinutes * 60 }; running = true }
    }
    private func scheduleSave(_ id: String, _ v: String) {
        saveTask?.cancel()
        saveTask = Task {
            try? await Task.sleep(nanoseconds: 600_000_000)
            guard !Task.isCancelled else { return }
            drafts[id] = v
            WritingLocal.setDict(WritingLocal.draftsKey, id, v)
        }
    }
    private func results(_ rows: [WritingEngine.LetterCheck], _ x: JSON) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            ForEach(Array(rows.enumerated()), id: \.offset) { _, r in
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                    Image(systemName: r.ok ? "checkmark.circle.fill" : "exclamationmark.triangle.fill").foregroundStyle((r.ok ? LKColor.success : LKColor.tertiary).resolve(scheme))
                    Text(line(r, x)).lkTextSafe(LKType.bodyMd).foregroundStyle(ink)
                }
                .accessibilityElement(children: .combine)
            }
        }
        .accessibilityAddTraits(.updatesFrequently)
    }
    private func line(_ r: WritingEngine.LetterCheck, _ x: JSON) -> String {
        switch r.kind {
        case .length: return r.ok ? t(.lettersLengthOkWords, ["n": r.n]) : t(.lettersOnlyWordsYouNeed, ["n": r.n])
        case .greeting: return t(.lettersBeginExactlyAsThe, ["o": x.s("open")])
        case .closing: return t(.lettersCloseInTheRight, ["c": x.s("close")])
        case .paragraphs: return t(.lettersClearParagraphsGreetingPurpose)
        case .contractions: return r.ok ? t(.lettersNoContractionsAppropriatelyFormal) : t(.lettersFormalLettersShouldAvoid, ["n": r.n])
        }
    }
}
