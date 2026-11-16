import SwiftUI
import LKDesign
import LKStrings
import LKCore

/// The question area of the lesson player: chips, teacher stage, prompt card, then the body of the exercise (Stitch lesson-question).
struct LessonQuestionView: View {
    let model: LessonModel, item: LessonItem
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    private var feedback: Bool { model.phase == .feedback }

    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            chips
            if model.isStory { LessonStoryStage(model: model) } else { stage }
            if item.type != "line" { promptCard }
            bodyView
            Color.clear.frame(height: 1)
        }
        .padding(.horizontal, LKFrame.shared.gutter)
        .padding(.top, LKSpacing.spaceXs)
        .frame(maxWidth: LKFrame.shared.width)
        .frame(maxWidth: .infinity)
    }

    // MARK: chips + stage
    private var chips: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            if model.session.combo >= 3 { LessonChip(text: t(.lessonCombo, ["n": model.session.combo]), icon: "flame.fill", tint: LKColor.tertiary) }
            else if let k = kindTitle { LessonChip(text: k, icon: nil, tint: LKColor.secondary) }
            if item.retry > 0 { LessonChip(text: t(.lessonTagOld), icon: "arrow.counterclockwise", tint: LKColor.primary) }
            else if item.own == true, item.type == "gap" || item.type == "build" { LessonChip(text: t(.lessonTagLooked), icon: "magnifyingglass", tint: LKColor.tertiary) }
            Spacer(minLength: 0)
            Text(t(.lessonQn, ["a": model.questionNumber, "b": model.session.total])).lkText(LKType.labelMetric)
                .foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
        }
    }
    private var kindTitle: String? {
        switch model.kind { case "listen": t(.lessonKindListen); case "speak": t(.lessonKindSpeak); case "review": t(.lessonKindReview); case "story", "radio": t(.lessonKindStory); default: nil }
    }

    private var stage: some View {
        ZStack(alignment: .bottom) {
            Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)).frame(width: 200, height: 24).offset(y: 6)
            TeacherView(controller: model.teacher).frame(width: 170, height: 144)
        }
        .frame(height: 150).frame(maxWidth: .infinity)
        .accessibilityHidden(true)
    }

    // MARK: prompt card
    private var title: String {
        switch item.type {
        case "gap": t(.lessonQGap)
        case "build": (item.prompt ?? "").isEmpty ? t(.lessonQBuildHeard) : t(.lessonQBuild)
        case "say": t(.lessonQSay)
        case "pic": item.choice == true ? t(.lessonQPicChoice) : t(.lessonQPicSay)
        case "tr": t(.lessonQTr)
        case "mean": t(.lessonQMean)
        case "type": t(.lessonQType)
        case "match": t(.lessonQMatch)
        case "q": t(.lessonQQ)
        default: ""
        }
    }
    static func meaning(_ c: LessonCard?) -> String { guard let c else { return "" }; return c.vi.isEmpty ? c.def : c.vi }
    private var sub: String {
        switch item.type {
        case "tr", "build": return item.prompt ?? ""
        case "mean": return Self.meaning(item.card)
        case "type":
            let m = item.mean ?? ""
            return [m, item.noAudio == true || m.isEmpty ? (item.def ?? "") : "", t(.lessonTypeHint, ["letter": item.first ?? "", "n": item.len ?? 0])].filter { !$0.isEmpty }.joined(separator: " · ")
        default: return ""
        }
    }

    private var promptCard: some View {
        LKCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                if model.listens(item) {
                    HStack(spacing: LKSpacing.spaceXs) {
                        Button { model.replay() } label: {
                            Label { Text(t(.lessonReplay)).lkText(LKType.labelBadge).textCase(.uppercase) } icon: { Image(systemName: "speaker.wave.2.fill") }
                                .foregroundStyle(LKColor.onSecondary.resolve(scheme))
                                .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap)
                                .background(Capsule().fill(LKColor.secondary.resolve(scheme)))
                        }
                        .buttonStyle(.plain)
                        LessonIconButton(system: "tortoise.fill", label: t(.lessonSlow)) { model.replay(slow: true) }
                        Spacer(minLength: 0)
                    }
                }
                let ttl = title
                if !ttl.isEmpty { Text(ttl).lkText(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityAddTraits(.isHeader) }
                if !sub.isEmpty { Text(sub).lkText(LKType.bodyLg).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
                if item.type == "q" { Text(item.prompt ?? "").lkText(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText() }
                if item.type == "gap" { gapSentence }
                if item.type == "pic", let u = model.pictureURL(item) { LessonPicture(url: u, label: t(.lessonPic)) }
                if item.type == "say" { Text(item.answer ?? "").lkText(LKType.headlineMd).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText() }
            }
        }
    }

    /// The sentence with the blank filled by the picked word (teal when right, red when wrong after checking).
    private var gapSentence: some View {
        let b = item.blank
        let pre = b.map { $0.toks[..<$0.i].joined(separator: " ") } ?? "", post = b.map { $0.toks[min($0.toks.count, $0.i + $0.n)...].joined(separator: " ") } ?? ""
        let word = feedback ? (model.lastOK ? item.answer ?? "" : model.lastPick ?? "") : (model.pick ?? "_____")
        let tint: LKDynamicColor = feedback ? (model.lastOK ? LKColor.success : LKColor.error) : LKColor.secondary
        return (Text(pre.isEmpty ? "" : pre + " ") + Text(word).bold().foregroundColor(tint.resolve(scheme)).underline() + Text(post.isEmpty ? "" : " " + post))
            .lkText(LKType.headlineMd).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
            .accessibilityLabel(((pre.isEmpty ? "" : pre + " ") + (model.pick ?? "…") + (post.isEmpty ? "" : " " + post)))
    }

    // MARK: bodies
    @ViewBuilder private var bodyView: some View {
        switch item.type {
        case "gap", "mean", "q", "pic" where item.type != "pic" || item.choice == true: options
        case "build", "tr": LessonBuildBoard(model: model, item: item)
        case "type": LessonTypeBoard(model: model, item: item)
        case "match": LessonMatchBoard(model: model, item: item)
        case "say", "pic": LessonSayBoard(model: model)
        default: EmptyView()
        }
    }

    private var options: some View {
        let opts = (item.options ?? []).filter { !model.hidden.contains($0) || feedback }
        let wide = opts.contains { $0.count > 18 }
        return LazyVGrid(columns: wide ? [GridItem(.flexible())] : [GridItem(.flexible(), spacing: LKSpacing.spaceSm), GridItem(.flexible())], spacing: LKSpacing.spaceSm) {
            ForEach(Array(opts.enumerated()), id: \.element) { i, o in
                LessonOption(letter: String(UnicodeScalar(UInt8(65 + i % 26))), text: o, state: state(o), action: { if !feedback { model.pick = o } },
                             sub: feedback ? optionMeaning(o) : nil)
            }
        }
    }
    private func state(_ o: String) -> LessonOption.State {
        if !feedback { return model.pick == o ? .selected : .idle }
        if o == item.answer { return .correct }
        if !model.lastOK && o == model.lastPick { return .wrong }
        return .dim
    }
    private func optionMeaning(_ o: String) -> String? {
        if let c = item.card, LessonEngine.same(o, item.answer ?? "") { return Self.meaning(c) }
        return nil
    }
}

// MARK: - build / translate
struct LessonBuildBoard: View {
    let model: LessonModel, item: LessonItem
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let tiles = item.tiles ?? []
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            // answer line
            FlowLayout { ForEach(Array(model.tiles.enumerated()), id: \.offset) { _, i in
                if tiles.indices.contains(i) { LessonTile(text: tiles[i], faded: false) { if model.phase == .question { model.tiles.removeAll { $0 == i } } } }
            } }
            .frame(maxWidth: .infinity, minHeight: 56, alignment: .topLeading)
            .padding(LKSpacing.spaceSm)
            .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(LKColor.surfaceContainerLow.resolve(scheme)))
            .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
            .englishText()
            // bank
            FlowLayout { ForEach(Array(tiles.enumerated()), id: \.offset) { i, w in
                LessonTile(text: w, faded: model.tiles.contains(i)) { if model.phase == .question { model.tiles.append(i) } }
            } }
            .frame(maxWidth: .infinity, alignment: .leading).englishText()
            .disabled(model.phase != .question)
        }
    }
}

// MARK: - type the word
struct LessonTypeBoard: View {
    @Bindable var model: LessonModel
    let item: LessonItem
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @FocusState private var focused: Bool
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            if model.useBank { bank } else { field }
            if model.letters > 0, !model.useBank { Text(pattern).lkText(LKType.headlineMd).foregroundStyle(LKColor.secondary.resolve(scheme)).englishText().tracking(4) }
        }
        .onAppear { if !model.useBank { focused = true } }
    }
    private var field: some View {
        TextField(t(.lessonYourAnswerField), text: $model.typed)
            .lkText(LKType.headlineMd).focused($focused).englishText()
            #if os(iOS)
            .textInputAutocapitalization(.never)
            #endif
            .autocorrectionDisabled()
            .submitLabel(.done)
            .onSubmit { model.submit() }
            .disabled(model.phase != .question)
            .padding(LKSpacing.spaceMd)
            .tactile(fill: LKColor.surfaceContainer, line: focused ? LKColor.secondary : LKColor.outlineVariant)
            .accessibilityLabel(t(.lessonYourAnswerField))
    }
    private var bank: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack {
                Text(model.typed.isEmpty ? " " : model.typed).lkText(LKType.headlineMd).englishText().foregroundStyle(LKColor.onSurface.resolve(scheme))
                Spacer()
                Button { model.bankBack() } label: { Image(systemName: "delete.left").frame(width: 44, height: 44) }.buttonStyle(.plain)
                    .foregroundStyle(LKColor.secondary.resolve(scheme))
            }
            .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 56)
            .tactile(fill: LKColor.surfaceContainer)
            FlowLayout { ForEach(Array((item.bank ?? []).enumerated()), id: \.offset) { i, l in
                LessonTile(text: l, faded: model.bankPicks.contains(i)) { if model.phase == .question { model.bankTap(i) } }
            } }.englishText()
        }
    }
    /// Revealed letters of the answer: "t _ _" (web hint "letter").
    private var pattern: String {
        var shown = 0
        let n = 1 + model.letters
        return (item.answer ?? "").map { ch -> String in
            if ch == " " || ch == "-" || ch == "'" { return String(ch) }
            shown += 1
            return shown <= n ? String(ch) : "_"
        }.joined(separator: " ")
    }
}

// MARK: - match
struct LessonMatchBoard: View {
    let model: LessonModel, item: LessonItem
    @State private var matched: Set<Int> = []
    @State private var left: Int?
    @State private var right: Int?
    @State private var wrong: Set<Int> = []
    @State private var misses = 0
    @State private var finished = false
    @State private var orderL: [Int] = []
    @State private var orderR: [Int] = []
    @Environment(\.colorScheme) private var scheme

    private var pairs: [LessonPair] { item.pairs ?? [] }
    var body: some View {
        HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
            column(orderL, side: 0)
            column(orderR, side: 1)
        }
        .onAppear {
            var a = LessonEngine.RNG(seed: Double(item.id) * 7 + 1), b = LessonEngine.RNG(seed: Double(item.id) * 13 + 5)
            orderL = LessonEngine.shuffle(Array(pairs.indices), &a); orderR = LessonEngine.shuffle(Array(pairs.indices), &b)
        }
        .onChange(of: model.pairHints) { _, _ in
            if let i = pairs.indices.first(where: { !matched.contains($0) }) { matched.insert(i); left = nil; right = nil; settle() }
        }
    }
    private func text(_ i: Int, side: Int) -> String {
        let p = pairs[i]
        return side == 0 ? (p.card?.word ?? p.word ?? "") : (p.card.map { LessonQuestionView.meaning($0) } ?? p.mean ?? "")
    }
    private func column(_ order: [Int], side: Int) -> some View {
        VStack(spacing: LKSpacing.spaceSm) {
            ForEach(order, id: \.self) { i in
                let done = matched.contains(i), sel = (side == 0 ? left : right) == i, bad = wrong.contains(i * 2 + side)
                Button { tap(i, side: side) } label: {
                    Text(text(i, side: side)).lkText(LKType.bodyLg).multilineTextAlignment(.center)
                        .foregroundStyle(LKColor.onSurface.resolve(scheme))
                        .frame(maxWidth: .infinity, minHeight: 56).padding(.horizontal, 6)
                        .tactile(fill: bad ? LKColor.errorContainer : LKColor.surfaceContainer, line: bad ? LKColor.error : sel ? LKColor.secondary : LKColor.outlineVariant,
                                 ledge: sel ? LKColor.secondary : LKColor.outlineVariant, radius: 16)
                        .opacity(done ? 0.3 : 1)
                }
                .buttonStyle(LKPressStyle())
                .disabled(done || model.phase != .question)
                .accessibilityLabel(text(i, side: side))
                .accessibilityAddTraits(sel ? .isSelected : [])
            }
        }
        .frame(maxWidth: .infinity)
        .englishText(side == 0)
    }
    private func tap(_ i: Int, side: Int) {
        if side == 0 { left = i; model.say(text(i, side: 0)) } else { right = i }
        guard let l = left, let r = right else { return }
        if l == r { matched.insert(l); settle() }
        else {
            misses += 1; wrong = [l * 2, r * 2 + 1]
            Task { try? await Task.sleep(nanoseconds: 400_000_000); wrong = [] }
        }
        left = nil; right = nil
    }
    private func settle() {
        guard matched.count == pairs.count, !finished else { return }
        finished = true
        Task { try? await Task.sleep(nanoseconds: 250_000_000); model.submit(matched: misses == 0) }
    }
}
private extension View {
    /// English words on the left column stay LTR; meanings follow the interface direction.
    @ViewBuilder func englishText(_ on: Bool) -> some View { if on { self.englishText() } else { self } }
}

// MARK: - say
struct LessonSayBoard: View {
    let model: LessonModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: LKSpacing.spaceSm) {
            Button { model.tapToSpeak() } label: {
                VStack(spacing: 4) {
                    Image(systemName: model.listening ? "waveform" : "mic.fill").font(.system(size: 30, weight: .bold))
                    Text(model.listening ? t(.lessonListening) : t(.lessonTapToSpeak)).lkText(LKType.labelBadge)
                }
                .foregroundStyle(LKColor.onSecondary.resolve(scheme))
                .frame(width: 120, height: 120)
                .background(Circle().fill(LKColor.secondary.resolve(scheme)))
                .overlay(Circle().strokeBorder(LKColor.secondary.resolve(scheme).opacity(model.listening ? 0.35 : 0), lineWidth: model.listening ? 10 : 0))
            }
            .buttonStyle(LKPressStyle())
            .disabled(model.listening || model.phase != .question)
            .accessibilityLabel(model.listening ? t(.lessonListening) : t(.lessonTapToSpeak))
            if !model.heard.isEmpty {
                Text(t(.lessonHeard, ["s": model.heard])).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                if model.unclear { Text(t(.lessonUnclear)).lkText(LKType.bodyMd).foregroundStyle(LKColor.error.resolve(scheme)) }
            }
            if model.recognizerFailed {
                Text(t(.lessonNoVoice) + " " + t(.lessonOrSkipSpeak)).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).multilineTextAlignment(.center)
            }
        }
        .frame(maxWidth: .infinity)
    }
}
