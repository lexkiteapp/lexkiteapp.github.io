import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

private func go(_ hash: String, _ onRoute: (AppRoute) -> Void) { if let r = AppRoute.parseHash(hash) { onRoute(r) } }

// MARK: - #/dictation/<part>

/// Stitch `dictation-fill` (gaps, ✓/✗ per gap) and `dictation-diff` (whole sentence: ✓ kept, − missed, + extra – never colour alone). A focus flow.
struct DictationView: View {
    let model: DictationModel
    var onClose: () -> Void = {}
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @Environment(\.liveContent) private var live
    @FocusState private var focus: Int?

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: model.progress), title: "", onExit: { model.stop(); onClose() })
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    if let f = model.finish { finished(f) } else if model.current != nil { sentence }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm).padding(.bottom, LKSpacing.space2xl)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task { if live { await model.start() } }
        .onDisappear { model.stop() }
        .accessibilityIdentifier("focus-dictation")
    }

    // MARK: one sentence
    private var sentence: some View {
        let s = model.session
        return VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            HStack(alignment: .firstTextBaseline) {
                Text(verbatim: "\(s.k + 1)/\(model.lines.count)").studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
                Text(verbatim: model.speakerName).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText()
                Spacer(minLength: 0)
                modeMenu
            }
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    audioDock
                    if s.mode == "full" { fullBox } else { gaps }
                    if let fb = s.feedback { feedback(fb) }
                }
            }
            transcript
            HStack(spacing: LKSpacing.spaceXs) {
                SkillAction(title: s.checked ? t(.skillListenCauTiep) + " ↵" : t(.actionCheck), primary: true) { Task { await model.tapCheck() } }
                SkillAction(title: t(.lessonAnswer)) { model.showAnswer() }
                SkillAction(title: t(.modelClearAll)) { model.clear() }
            }
            Toggle(isOn: Binding(get: { model.auto }, set: { v in Task { await model.setAuto(v) } })) {
                Text(t(.skillListenTuDongPhatLai)).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
            }
            .tint(LKColor.secondary.resolve(scheme)).frame(minHeight: 44)
        }
    }

    /// Stitch `dictation-fill` audio dock: round previous / big Listen / round slow (0.75x) / round next, always one row
    private var audioDock: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            roundButton(icon: "chevron.backward", label: t(.skillListenCauTruoc)) { model.previous() }
            SkillAction(title: t(.lessonKindListen), icon: "speaker.wave.2.fill", primary: true) { model.say() }.frame(maxWidth: .infinity)
            roundButton(icon: "tortoise.fill", caption: "0.75x", label: t(.lessonSlowShort)) { model.say(slow: true) }
            roundButton(icon: "chevron.forward", label: t(.skillListenCauSau)) { model.skip() }
        }
        .frame(maxWidth: .infinity)
    }
    private func roundButton(icon: String, caption: String? = nil, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            VStack(spacing: 0) {
                Image(systemName: icon).font(.system(size: caption == nil ? 18 : 15, weight: .bold))
                if let caption { Text(verbatim: caption).font(.system(size: 9, weight: .heavy)).lineLimit(1).minimumScaleFactor(0.6) }
            }
            .foregroundStyle(LKColor.primary.resolve(scheme))
            .frame(width: 48, height: 48)
            .tactile(fill: LKColor.surfaceContainerHigh, radius: 24)
        }
        .buttonStyle(.plain).fixedSize()
        .accessibilityLabel(label)
    }

    private var modeMenu: some View {
        Menu {
            ForEach(Dictation.modes, id: \.self) { m in Button { Task { await model.setMode(m) } } label: { Text(t(Self.modeKey(m))) } }
        } label: {
            HStack(spacing: 4) {
                Text(t(Self.modeKey(model.session.mode))).fixedSize(horizontal: false, vertical: true)
                Image(systemName: "chevron.up.chevron.down").font(.system(size: 11, weight: .bold)).accessibilityHidden(true)
            }
            .studyText(LKType.labelMetric).padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
            .tactile(fill: LKColor.surfaceContainerHigh, radius: 14)
        }
    }
    static func modeKey(_ m: String) -> L10nKey { m == "mid" ? .skillListenDienTuTrungBinh : m == "hard" ? .skillListenDienTuKho : .skillListenChepCaCau }

    /// the sentence with a text field in every gap (the gap keeps its punctuation outside)
    private var gaps: some View {
        let words = model.session.words, cells = model.session.cells, fb = model.session.feedback
        var n = -1
        let idxs: [Int] = cells.map { c in if case .hole = c { n += 1; return n }; return -1 }
        return FlowLayout(spacing: 6) {
            ForEach(Array(cells.enumerated()), id: \.offset) { ci, c in
                switch c {
                case .word(let w): Text(verbatim: w).studyText(LKType.bodyLg).englishText()
                case .hole(let i, let pre, let size, let post):
                    HStack(spacing: 0) {
                        if !pre.isEmpty { Text(verbatim: pre).studyText(LKType.bodyLg).englishText() }
                        gapField(idxs[ci], size: size, ok: fb?.gaps.skillItem(idxs[ci])?.ok, word: words[i])
                        if !post.isEmpty { Text(verbatim: post).studyText(LKType.bodyLg).englishText() }
                    }
                }
            }
        }
        .englishText()
    }
    private func gapField(_ idx: Int, size: Int, ok: Bool?, word: String) -> some View {
        TextField("", text: Binding(get: { idx < model.holes.count ? model.holes[idx] : "" }, set: { if idx < model.holes.count { model.holes[idx] = $0 } }))
            .textInputAutocapitalization(.never).autocorrectionDisabled().englishText()
            .focused($focus, equals: idx)
            .disabled(ok != nil)
            .padding(.horizontal, 8).frame(minWidth: max(56, CGFloat(size) * 11), minHeight: 44)
            .tactile(fill: LKColor.surfaceContainerHigh, line: ok == nil ? LKColor.outlineVariant : (ok! ? LKColor.success : LKColor.error), ledge: ok == nil ? LKColor.outlineVariant : (ok! ? LKColor.success : LKColor.error), radius: 12)
            .overlay(alignment: .topTrailing) {
                if let ok { Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle.fill").font(.system(size: 14)).foregroundStyle((ok ? LKColor.success : LKColor.error).resolve(scheme)).offset(x: 6, y: -8).accessibilityHidden(true) }
            }
            .accessibilityLabel(String(idx + 1))
            .accessibilityValue(ok == false ? word : "")
    }

    private var fullBox: some View {
        TextField(t(.skillListenGoLaiCaCau), text: Binding(get: { model.full }, set: { model.full = $0 }), axis: .vertical)
            .lineLimit(3...6).englishText().autocorrectionDisabled().textInputAutocapitalization(.never)
            .disabled(model.session.checked)
            .padding(LKSpacing.spaceSm).frame(minHeight: 96, alignment: .topLeading)
            .tactile(fill: LKColor.surfaceContainerHigh, radius: 16)
    }

    // MARK: feedback
    private func feedback(_ fb: Dictation.Feedback) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            HStack(spacing: LKSpacing.spaceXs) {
                Image(systemName: fb.ok ? "checkmark.circle.fill" : "info.circle.fill").foregroundStyle((fb.ok ? LKColor.success : LKColor.tertiary).resolve(scheme)).accessibilityHidden(true)
                Text(verbatim: fb.right.map { t(.skillListenABODung, ["a": $0, "b": fb.of ?? 0]) } ?? t(.skillListenPChinhXac, ["p": fb.percent])).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
            }
            if model.session.mode == "full" { diff(fb) } else if let c = model.current { EnglishText(text: c.text, style: LKType.bodyMd, color: LKColor.onSurfaceVariant) }
        }
    }
    /// ✓ kept · − missed · + extra: a mark next to every word, not only a colour
    private func diff(_ fb: Dictation.Feedback) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            FlowLayout(spacing: 6) {
                ForEach(Array(fb.diff.enumerated()), id: \.offset) { _, d in
                    HStack(spacing: 2) {
                        Text(verbatim: d.mark == .ok ? "✓" : d.mark == .miss ? "−" : "+").studyText(LKType.labelMetric, tint(d.mark))
                        Text(verbatim: d.text).studyText(LKType.bodyLg, tint(d.mark)).englishText().strikethrough(d.mark == .extra, color: tint(d.mark).resolve(scheme))
                    }
                    .padding(.horizontal, 6).padding(.vertical, 2)
                    .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
                }
            }
            .englishText()   // the English sentence reads left to right (also in the Arabic UI)
            FlowLayout(spacing: 10) {
                legend("✓", .skillListenDung, .ok); legend("−", .skillListenBoSot, .miss); legend("+", .skillListenThuaSai, .extra)
            }
        }
    }
    private func tint(_ m: Dictation.Mark) -> LKDynamicColor { m == .ok ? LKColor.success : m == .miss ? LKColor.tertiary : LKColor.error }
    private func legend(_ sym: String, _ k: L10nKey, _ m: Dictation.Mark) -> some View {
        HStack(spacing: 4) { Text(verbatim: sym).studyText(LKType.labelMetric, tint(m)); Text(t(k)).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
    }

    // MARK: transcript card
    private var transcript: some View {
        SkillCard {
            DisclosureGroup(isExpanded: Binding(get: { model.showTranscript }, set: { model.showTranscript = $0; if $0 { Task { await model.loadTranslations() } } })) {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    ForEach(Array(model.lines.enumerated()), id: \.offset) { n, l in
                        VStack(alignment: .leading, spacing: 2) {
                            if n <= model.session.k { EnglishText(text: l.text, style: LKType.bodySm, color: n == model.session.k ? LKColor.onSurface : LKColor.onSurfaceVariant) }
                            else { Text(t(.skillListenChepXongCauNay)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                            if n < model.translations.count, !model.translations[n].isEmpty { Text(verbatim: model.translations[n]).studyText(LKType.bodySm, LKColor.secondary) }
                        }
                    }
                }
                .padding(.top, LKSpacing.spaceXs)
            } label: {
                Text(t(.skillListenTranscriptBanDich)).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
            }
            .tint(LKColor.onSurface.resolve(scheme))
        }
    }

    // MARK: the end
    private func finished(_ f: Dictation.Session.Finish) -> some View {
        SkillCard {
            VStack(spacing: LKSpacing.spaceMd) {
                Image(systemName: "keyboard").font(.system(size: 44, weight: .semibold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                Text(t(.skillListenChinhXacP, ["p": f.pct])).studyText(LKType.headlineMd).multilineTextAlignment(.center)
                Text(t(.skillListenNCauDaChep, ["n": f.count])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                SkillAction(title: t(.skillListenLamCauHoiPhan), icon: "target", primary: true) { go(f.links[0], onRoute) }
                SkillAction(title: t(.skillListenThuMucKhoHon)) { go(f.links[1], onRoute) }
                SkillAction(title: t(.skillListenVeLuyenNghe)) { go(f.links[2], onRoute) }
            }
            .frame(maxWidth: .infinity)
        }
    }
}

extension Array {
    /// the element or nil (out of range)
    func skillItem(_ i: Int) -> Element? { indices.contains(i) ? self[i] : nil }
}

// MARK: - #/reading

/// Stitch `reading-list`: level tabs and one card per passage.
struct ReadingListView: View {
    let model: ReadingListModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        let l = model.list
        StudyPage(title: t(.skillReadBaiDocIelts)) {
            Text(t(.skillReadDocBaiTheoPhong)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            if !l.tabs.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: LKSpacing.spaceXs) {
                        ForEach(l.tabs, id: \.lv) { tab in
                            Button { model.select(tab.lv) } label: {
                                HStack(spacing: 4) {
                                    Text(tab.lv == "all" ? t(.vocabAll) : tab.lv).studyText(LKType.titlePill, tab.selected ? LKColor.onSurface : LKColor.onSurfaceVariant)
                                    Text(verbatim: "\(tab.n)").studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
                                }
                                .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 44)
                                .tactile(fill: tab.selected ? LKColor.surfaceContainerHigh : LKColor.surfaceContainerHighest, line: tab.selected ? LKColor.secondary : LKColor.outlineVariant,
                                         ledge: tab.selected ? LKColor.secondary : LKColor.outlineVariant, radius: 14)
                            }
                            .buttonStyle(LKPressStyle()).accessibilityAddTraits(tab.selected ? .isSelected : [])
                        }
                    }
                    .padding(.vertical, 6).padding(.horizontal, 2)
                }
            }
            if l.cards.isEmpty { SkillCard { StudyEmpty(icon: "book.fill", title: t(.skillListenDangCapNhatDe)) } }
            ForEach(l.cards, id: \.id) { c in
                Button { onRoute(AppRoute("read", arg: c.id)) } label: {
                    SkillCard {
                        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                            HStack { Text(verbatim: c.emoji).font(.system(size: 28)).accessibilityHidden(true); Spacer(minLength: 0); StudyChip(text: c.level, tint: LKColor.tertiary) }
                            Text(verbatim: c.title).studyText(LKType.headlineSm).englishText().multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                            Text(verbatim: c.kind == .translate && !c.summaryEn.isEmpty ? c.summaryEn : c.summary).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                            FlowLayout {
                                StudyChip(text: t(.todayMinutes, ["n": c.minutes]), icon: "timer")
                                StudyChip(text: t(.skillReadNCauHoi, ["n": c.questions]))
                                if let d = c.done { StudyChip(text: "✓ " + d, tint: LKColor.success) }
                            }
                        }
                    }
                }
                .buttonStyle(LKPressStyle())
            }
        }
        .task { await model.load() }
        .accessibilityIdentifier("inner-reading")
    }
}

// MARK: - #/read/<id>

/// Stitch `reader` · `reader-word-popup` · `reader-result`: the passage with tappable words, highlight chips, keywords, questions.
struct ReaderView: View {
    let model: ReaderModel
    /// fixtures show the questions part on its own (the page is longer than a phone)
    var onlyQuestions = false
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @Environment(\.liveContent) private var live

    var body: some View {
        let r = model.reading
        StudyPage(title: t(.skillReadTatCaBaiDoc)) {
            ScrollViewReader { proxy in
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    if !onlyQuestions {
                        head(r)
                        highlightBar
                        passage
                        keywords
                    }
                    if let g = model.grade, onlyQuestions { result(g) }
                    questions(r)
                    if let g = model.grade, !onlyQuestions { result(g) }
                }
                .onChange(of: model.scrollTo?.sentence) { _, i in if let i { withAnimation { proxy.scrollTo(i, anchor: .center) } } }
            }
        }
        .task { if live { await model.load() } }
        .onDisappear { model.stop() }
        .sheet(item: Binding(get: { model.popup }, set: { if $0 == nil { model.closePopup() } })) { p in
            WordPopupView(model: p, onDetails: { w in model.closePopup(); onRoute(AppRoute("dict", arg: w)) }, onClose: { model.closePopup() }).presentationDetents([.medium, .large])
        }
        .alert(t(.skillReadBanChuaTraLoi), isPresented: Binding(get: { model.confirmBlank }, set: { model.confirmBlank = $0 })) {
            Button(t(.actionContinue)) { Task { await model.check() } }
            Button(t(.actionCancel), role: .cancel) {}
        }
        .accessibilityIdentifier("inner-read")
    }

    private func head(_ r: JSON) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            FlowLayout { StudyChip(text: r.s("level"), tint: LKColor.tertiary); StudyChip(text: r.s("emoji") + " " + r.s("topic")) }
            Text(verbatim: r.s("title")).studyText(LKType.headlineLg).englishText().fixedSize(horizontal: false, vertical: true)
            Text(verbatim: ReadingList.shownSummary(r, learnLang: model.ctx.lang)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            SkillAction(title: t(model.aloud ? .skillReadDungDoc : .skillReadNgheCaBai), icon: model.aloud ? "stop.fill" : "speaker.wave.2.fill") { model.toggleAloud() }
        }
    }

    private var highlightBar: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            Text(t(.skillReadToSang)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            FlowLayout {
                ForEach(ReadingRules.highlightKeys, id: \.self) { k in
                    let on = model.isOn(k)
                    Button { Task { await model.toggle(k) } } label: {
                        HStack(spacing: 4) {
                            Image(systemName: on ? "checkmark.circle.fill" : "circle").accessibilityHidden(true)
                            Text(verbatim: Self.chipLabel(k, t) + " " + String(model.page.counts[k] ?? 0)).fixedSize(horizontal: false, vertical: true)
                        }
                        .studyText(LKType.labelMetric, on ? LKColor.onSecondary : LKColor.onSurface)
                        .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
                        .background(Capsule().fill((on ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                    }
                    .buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
    }
    static func chipLabel(_ k: String, _ t: L10n) -> String {
        switch k { case "kw": return t(.skillReadTuKhoa); case "awl": return t(.skillReadHocThuatAwl); case "link": return t(.skillReadTuNoiCum); default: return t(.skillReadTuCuaToi) }
    }

    private var passage: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                ForEach(Array(model.page.passage.enumerated()), id: \.offset) { pi, para in
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(Array(para.enumerated()), id: \.offset) { si, s in
                            let gi = model.page.passage.prefix(pi).reduce(0) { $0 + $1.count } + si
                            WordFlow(pieces: s, activeWord: model.active?.sentence == gi ? model.active?.piece : nil, highlights: model.highlights) { w in
                                if let pc = s.firstIndex(where: { if case .word(_, let x, _, _) = $0 { return x == w }; return false }) { model.tapWord(sentence: gi, piece: pc) }
                            }
                            .padding(2)
                            .background(RoundedRectangle(cornerRadius: 8, style: .continuous).fill(model.readingSentence == gi ? LKColor.secondaryFixed.resolve(scheme).opacity(0.4) : .clear))
                            .id(gi)
                            .onTapGesture(count: 2) { model.readSentence(gi) }
                        }
                    }
                }
                SkillNote(icon: "lightbulb.fill", text: t(.skillReadChamVaoTuDe))
            }
        }
    }

    private var keywords: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(verbatim: "🔑 " + t(.skillReadTuKhoa)).studyText(LKType.headlineSm)
                FlowLayout {
                    ForEach(model.page.keywords, id: \.self) { k in
                        Button { model.tapKeyword(k) } label: { Text(verbatim: k).studyText(LKType.labelMetric).englishText().padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44).background(Capsule().fill(LKColor.surfaceContainer.resolve(scheme))) }
                            .buttonStyle(.plain)
                    }
                }
                SkillAction(title: "+ " + t(.skillReadLuuTatCaTu), enabled: !model.savedAll) { Task { await model.saveAllKeywords() } }
            }
        }
    }

    private func questions(_ r: JSON) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                Text(t(.skillReadCauHoi)).studyText(LKType.headlineMd)
                ForEach(Array(r.list("questions").enumerated()), id: \.offset) { i, q in question(i, q) }
                if model.grade == nil { SkillAction(title: t(.skillReadChamDiem), icon: "checkmark.circle", primary: true) { Task { await model.tapCheck() } } }
            }
        }
    }
    private func question(_ i: Int, _ q: JSON) -> some View {
        let item = model.grade?.items.skillItem(i)
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            EnglishText(text: "\(i + 1). " + q.s("q"), style: LKType.titlePill)
            ForEach(Array(ReadingGrade.options(q).enumerated()), id: \.offset) { k, o in
                let chosen = model.picks[i] == o.value
                LessonOption(letter: q.s("type") == "tfng" ? String(k + 1) : QE.letters[min(k, 7)], text: q.s("type") == "tfng" ? o.value : o.text,
                             state: state(item, chosen: chosen, right: o.value == item?.right), action: { model.pick(i, o.value) }).disabled(item != nil)
            }
            if let item {
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Image(systemName: item.ok ? "checkmark.circle.fill" : "xmark.circle.fill").foregroundStyle((item.ok ? LKColor.success : LKColor.error).resolve(scheme)).accessibilityHidden(true)
                    Text(verbatim: item.explain).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }
    private func state(_ item: ReadingGrade.Item?, chosen: Bool, right: Bool) -> LessonOption.State {
        guard item != nil else { return chosen ? .selected : .idle }
        return right ? .correct : (chosen ? .wrong : .dim)
    }

    private func result(_ g: ReadingGrade) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack(spacing: LKSpacing.spaceXs) {
                    Image(systemName: g.ok ? "checkmark.circle.fill" : "info.circle.fill").foregroundStyle((g.ok ? LKColor.success : LKColor.tertiary).resolve(scheme)).accessibilityHidden(true)
                    Text(verbatim: Bidi.isolate(t(.skillReadKetQuaScoreN, ["score": g.score, "n": g.n, "pct": g.pct]) + " · +\(g.xp) XP")).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
                }
                SkillAction(title: t(.skillReadBaiDocKhac)) { go(g.links[0], onRoute) }
                SkillAction(title: t(.skillReadHocCacTuVua), icon: "brain.head.profile", primary: true) { go(g.links[1], onRoute) }
            }
        }
    }
}
