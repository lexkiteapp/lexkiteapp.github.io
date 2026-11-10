import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKStrings

/// #/write (Task 2) and #/task1 (chart description): Stitch write-room / write-report – the prompt (or chart), the editor with word counter + clock, the report, the side cards.
struct EssayView: View {
    let model: EssayModel
    var onRoute: (AppRoute) -> Void = { _ in }
    /// snapshots only: `.report` shows the analysis alone (it sits below the editor on a phone)
    var only: Part = .all
    enum Part { case all, report }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @FocusState private var editing: Bool

    private var task1: Bool { model.kind == .task1 }
    private var ink: LKDynamicColor { LKColor.onSurface }
    private var dim: LKDynamicColor { LKColor.onSurfaceVariant }

    var body: some View {
        StudyPage(title: task1 ? "Writing Task 1" : t(.revWritingRoom)) {
            if !model.loaded {
                if model.offline { SkillCard { StudyEmpty(icon: "wifi.slash", title: t(.syncOffline), action: (t(.actionRetry), { Task { await model.load() } })) } }
                else { WritingSkeleton(rows: 5) }
            } else { page }
        }
        .task { await model.load() }
        .onReceive(Timer.publish(every: 1, on: .main, in: .common).autoconnect()) { _ in model.tick() }
        .onDisappear { model.flushSave() }
        .accessibilityIdentifier(task1 ? "task1" : "write")
    }

    // MARK: page
    @ViewBuilder private var page: some View {
        if only == .report, let r = model.report { reportCard(r) } else { full }
    }
    @ViewBuilder private var full: some View {
        header
        if task1 { setTabs }
        promptCard
        editorCard
        if let r = model.report { reportCard(r) }
        side
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            if task1 {
                Text(t(.writeTask1MoTaBieuDo)).studyText(LKType.bodyMd, dim)
                FlowLayout { WritingChip(text: "Task 2 →", system: "pencil.line", english: true) { onRoute(AppRoute("write")) } }
            } else {
                Text(t.rich(.writeWriteVietBaiIeltsTask)).studyText(LKType.bodyMd, dim).fixedSize(horizontal: false, vertical: true)
                FlowLayout {
                    WritingChip(text: t(.writeWriteChuyenSangTask1), system: "chart.line.uptrend.xyaxis") { onRoute(AppRoute("task1")) }
                    WritingChip(text: t(.speakSpkTieuChiChamBand), system: "chart.bar.fill") { onRoute(AppRoute("criteria", query: ["skill": "writing"])) }
                }
            }
        }
    }

    private func typeName(_ k: String) -> String {
        switch k {
        case "line": return t(.modelLineGraph); case "bar": return t(.modelBarChart); case "pie": return t(.modelPieChart)
        case "table": return t(.modelTable); case "process": return t(.modelProcess); default: return t(.modelMap)
        }
    }

    private var setTabs: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LKSpacing.spaceXs) {
                ForEach(model.sets, id: \.self) { s in
                    WritingChip(text: typeName(s.s("type")) + " · " + s.s("id"), selected: s.s("id") == model.currentId) { model.select(s.s("id")) }
                }
            }
        }
    }

    // MARK: prompt / chart
    private var promptCard: some View {
        SkillCard {
            HStack(spacing: LKSpacing.spaceXs) {
                WritingTag(text: task1 ? typeName(model.current.s("type")) : model.current.s("type"))
                Spacer(minLength: 0)
                if !task1 {
                    Menu {
                        ForEach(model.prompts, id: \.self) { p in Button(p.s("type") + " · " + t(.writeWriteDeN, ["n": Essay.sessionNumber(p.s("id"))])) { model.select(p.s("id")) } }
                    } label: { Label(t(.writeWriteChonDe), systemImage: "list.bullet").labelStyle(.iconOnly).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap) }
                    Button { model.randomPrompt() } label: { Image(systemName: "dice.fill").frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap) }
                        .accessibilityLabel(t(.writeWriteDeNgauNhien))
                }
            }
            if task1 {
                EnglishText(text: model.current.s("title") + " Summarise the information by selecting and reporting the main features, and make comparisons where relevant.", style: LKType.bodyLg)
                Task1ChartView(figure: model.current).frame(maxWidth: .infinity)
                SkillNote(icon: "info.circle", text: t(.writeTask1DuLieuMinhHoa))
            } else {
                EnglishText(text: model.current.s("text"), style: LKType.bodyLg)
                SkillAction(title: t(.writeWriteBiYMoNgan), icon: "lightbulb") { onRoute(AppRoute("ideas", arg: model.current.s("topic"))) }
                DisclosureGroup {
                    VStack(alignment: .leading, spacing: 4) {
                        ForEach(Array(model.outline.enumerated()), id: \.offset) { i, o in Text(verbatim: "\(i + 1). " + t.src(o)).studyText(LKType.bodySm, dim) }
                    }.padding(.top, 4)
                } label: { Text(t(.writeWriteDanYGoiY, ["type": model.current.s("type")])).studyText(LKType.titlePill, ink).frame(minHeight: LKFrame.shared.minTap, alignment: .leading) }
                SkillNote(icon: "clock", text: t(.writeWriteVietItNhat250))
            }
            if let m = model.modelId {
                SkillAction(title: t(.writeWriteBaiMauBand8), icon: "doc.text") { onRoute(AppRoute("model", arg: m)) }
            }
            if task1 { task1Hints }
        }
    }

    private var task1Hints: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            DisclosureGroup {
                EnglishText(text: model.current.s("overview"), style: LKType.bodySm).padding(.top, 4)
            } label: { Text(t(.writeTask1XemCauTongQuan)).studyText(LKType.titlePill, ink).frame(minHeight: LKFrame.shared.minTap, alignment: .leading) }
        }
    }

    // MARK: editor
    private var editorCard: some View {
        SkillCard {
            ZStack(alignment: .topLeading) {
                TextEditor(text: Bindable(model).text).lkTextSafe(LKType.bodyLg).foregroundStyle(ink.resolve(scheme)).scrollContentBackground(.hidden).englishText()
                    .focused($editing).frame(minHeight: 280).padding(4)
                if model.text.isEmpty {
                    Text(verbatim: task1 ? placeholder : t(.writeWriteBatDauVietBai)).lkTextSafe(LKType.bodyLg).foregroundStyle(dim.resolve(scheme)).englishText()
                        .padding(.horizontal, 9).padding(.vertical, 12).allowsHitTesting(false)
                }
            }
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
            HStack {
                WritingTag(text: t(.vocabWords, ["n": model.wordCount]), tint: model.wordCount >= model.minWords ? LKColor.success : LKColor.onSurfaceVariant)
                Button { model.toggleClock() } label: { Label(model.clockText, systemImage: model.running ? "pause.fill" : "timer").monospacedDigit() }
                    .buttonStyle(WritingSecondaryButtonStyle()).accessibilityLabel(model.clockText)
                Spacer(minLength: 0)
            }
            if model.notice == .timeUp { Text(task1 ? t(.writeTask1Het20Phut) : t(.writeWriteHet40PhutHay)).studyText(LKType.titlePill, LKColor.error).accessibilityAddTraits(.updatesFrequently) }
            if model.notice == .tooShort { Text(task1 ? t(.writeTask1HayVietItNhat) : t(.writeWriteHayVietItNhat)).studyText(LKType.bodySm, LKColor.error).accessibilityAddTraits(.updatesFrequently) }
            Button(task1 ? t(.writeTask1PhanTichBaiTask) : t(.writeWritePhanTichTuVung)) { editing = false; Task { await model.analyse() } }.buttonStyle(PrimaryButtonStyle())
        }
    }
    /// "The chart shows…" / "The maps illustrate…" / "The diagram illustrates…" – the web placeholder, English in every language
    private var placeholder: String {
        "The " + (model.current.s("type") == "map" ? "maps illustrate" : model.current.s("type") == "process" ? "diagram illustrates" : "chart shows") + "…"
    }

    // MARK: report
    private func ring(_ band: Double, span: Double) -> some View {
        let r = Essay.ring(band: band, span: span)
        let c: LKDynamicColor = r.tone == .good ? LKColor.success : r.tone == .hard ? LKColor.tertiary : LKColor.error
        return ZStack {
            Circle().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 8)
            Circle().trim(from: 0, to: min(1, max(0, r.pct / 100))).stroke(c.resolve(scheme), style: StrokeStyle(lineWidth: 8, lineCap: .round)).rotationEffect(.degrees(-90))
            Text(verbatim: bandText(band)).studyText(LKType.headlineSm).environment(\.layoutDirection, .leftToRight)
        }
        .frame(width: 72, height: 72)
        .accessibilityHidden(true)
    }
    /// JS prints 6 as "6" and 6.5 as "6.5"
    private func bandText(_ b: Double) -> String { b == b.rounded() ? String(Int(b)) : String(b) }

    private func stat(_ value: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(verbatim: value).studyText(LKType.headlineSm).environment(\.layoutDirection, .leftToRight)
            Text(verbatim: label).studyText(LKType.bodySm, dim).fixedSize(horizontal: false, vertical: true)
        }
        .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
        .accessibilityElement(children: .combine)
    }

    @ViewBuilder private func reportCard(_ r: EssayModel.Report) -> some View {
        SkillCard {
            if let a = r.task2 { task2Report(a, r) } else if let s = r.task1 { task1Report(s, r) }
            Text(t(.writeWriteBaiVietDuocTo)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim.resolve(scheme))
            ForEach(Array(r.pieces.enumerated()), id: \.offset) { _, p in WordFlow(pieces: p.flatMap { $0 }, highlights: ["awl", "link", "mine"]) { _ in } }
        }
        .accessibilityIdentifier("report")
    }

    @ViewBuilder private func task2Report(_ a: Essay.Analysis, _ r: EssayModel.Report) -> some View {
        HStack(spacing: LKSpacing.spaceSm) {
            ring(a.band, span: 4.5)
            VStack(alignment: .leading, spacing: 4) {
                Text(t(.writeWriteLexicalResourceUocTinh, ["band": bandText(a.band)])).studyText(LKType.headlineSm)
                Text(t(.writeWriteUocTinhTuDong)).studyText(LKType.bodySm, dim).fixedSize(horizontal: false, vertical: true)
            }
        }
        HStack(spacing: LKSpacing.spaceXs) { stat(String(a.words), t(.speakSpkSoTu)); stat(String(a.awlTotal), t(.writeWriteTuAwlPct, ["pct": Essay.pct1(a.awlRatio)])) }
        HStack(spacing: LKSpacing.spaceXs) { stat(String(a.link.count), t(.writeWriteLoaiTuNoi)); stat(String(Vocab.round(a.diversity * 100)) + "%", t(.writeWriteDoDaDangTu)) }
        Text(t(.speakSpkNhanXet)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim.resolve(scheme))
        ForEach(Array(Essay.tips(a).enumerated()), id: \.offset) { _, tip in
            HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                Image(systemName: tip == .good ? "checkmark.circle.fill" : "lightbulb.fill").foregroundStyle((tip == .good ? LKColor.success : LKColor.tertiary).resolve(scheme)).accessibilityHidden(true)
                Text(tipText(tip)).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
            }
        }
        if !a.overused.isEmpty {
            Text(t(.writeWriteTuBiLapGoi)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim.resolve(scheme))
            ForEach(a.overused, id: \.w) { o in
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    EnglishText(text: o.w, style: LKType.titlePill)
                    StudyChip(text: "×\(o.n)")
                    let alts = model.synonyms(o.w)
                    if alts.isEmpty { Text(t(.writeWriteKhongCoGoiY)).studyText(LKType.bodySm, dim) }
                    else { FlowLayout(spacing: 6) { ForEach(alts, id: \.self) { w in WritingChip(text: w, english: true) { onRoute(AppRoute("dict", arg: w)) } } } }
                }
            }
        }
        words(t(.writeWriteTuHocThuatAwl), a.awl)
        words(t(.writeWriteTuNoiCumTu), a.link + a.phrases.filter { p in !a.link.contains { $0.w == p.w } })
    }

    private func words(_ title: String, _ list: [Essay.Count]) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            Text(title).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim.resolve(scheme))
            if list.isEmpty { Text(t(.writeWriteChuaCo)).studyText(LKType.bodySm, dim) }
            else { FlowLayout(spacing: 6) { ForEach(list.sorted { $0.n > $1.n }, id: \.w) { c in StudyChip(text: c.n > 1 ? "\(c.w) ×\(c.n)" : c.w) } } }
        }
    }

    private func tipText(_ tip: Essay.Tip) -> AttributedString { let k = Essay.key(tip); return t.rich(k.key, k.vars) }

    @ViewBuilder private func task1Report(_ s: Essay.Task1Score, _ r: EssayModel.Report) -> some View {
        HStack(spacing: LKSpacing.spaceSm) {
            ring(s.band, span: 4)
            VStack(alignment: .leading, spacing: 4) {
                Text(t(.writeTask1TaskAchievementUocTinh, ["band": bandText(s.band)])).studyText(LKType.headlineSm)
                Text(t(.writeTask1KiemTraTuDong)).studyText(LKType.bodySm, dim).fixedSize(horizontal: false, vertical: true)
            }
        }
        HStack(spacing: LKSpacing.spaceXs) { stat(String(s.words), t(.speakSpkSoTu)); stat(s.overview > 0 ? "✓" : "✗", t(.modelOverview)) }
        HStack(spacing: LKSpacing.spaceXs) { stat(String(s.numbers), t(.writeTask1SoLieu)); stat(String(s.trend + s.compare), t(.writeTask1XuHuongSoSanh)) }
        Text(t(.speakSpkNhanXet)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim.resolve(scheme))
        ForEach(Array(s.notes.enumerated()), id: \.offset) { _, n in
            HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                Image(systemName: n == .good ? "checkmark.circle.fill" : "lightbulb.fill").foregroundStyle((n == .good ? LKColor.success : LKColor.tertiary).resolve(scheme)).accessibilityHidden(true)
                Text(noteText(n)).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
            }
        }
    }
    private func noteText(_ n: Essay.Task1Note) -> AttributedString { let k = Essay.key(n); return t.rich(k.key, k.vars) }

    // MARK: side cards
    @ViewBuilder private var side: some View {
        if task1 {
            SkillCard {
                Text(t(.writeTask1CauTruc4Doan)).studyText(LKType.headlineSm)
                ForEach([L10nKey.writeTask1MoBaiVietLai, .writeTask1TongQuan2Dac, .writeTask1ThanBai1Nhom, .writeTask1ThanBai2Nhom], id: \.self) { k in
                    Text(t.rich(k)).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
                }
            }
            SkillCard {
                Text(t(.writeTask1TuVungChoType, ["type": typeName(model.current.s("type")).lowercased()])).studyText(LKType.headlineSm)
                FlowLayout(spacing: 6) {
                    ForEach(model.vocab, id: \.self) { v in
                        WritingChip(text: v.replacingOccurrences(of: "(bị động)", with: t(.writeTask1BiDong)), english: true) { model.insert(Self.insertText(v)) }
                    }
                }
                Text(t(.writeWriteBamDeChenVao)).studyText(LKType.bodySm, dim)
            }
            SkillCard {
                Text(t(.writeTask1LuuY)).studyText(LKType.headlineSm)
                ForEach([L10nKey.writeTask1KhongNeuYKien, .writeTask1ThiDongTuTheo, .writeTask1KhongCanMoTa], id: \.self) { k in
                    Text(verbatim: "• " + t(k)).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
                }
            }
        } else {
            SkillCard {
                Text(t(.writeWriteTuVungGoiY) + (model.topicName.isEmpty ? "" : " · " + t.src(model.topicName))).studyText(LKType.headlineSm)
                FlowLayout(spacing: 6) { ForEach(model.topicWords, id: \.self) { w in WritingChip(text: w, english: true) { model.insert(w) } } }
                Text(t(.writeWriteBamDeChenVao)).studyText(LKType.bodySm, dim)
            }
            SkillCard {
                Text(t(.writeWriteXuHuongDeTask)).studyText(LKType.headlineSm)
                trends
                Text(t(.writeWriteUocTinhSoBo)).studyText(LKType.bodySm, dim).fixedSize(horizontal: false, vertical: true)
            }
            SkillCard {
                Text(t(.writeWriteTuNoiHayDung)).studyText(LKType.headlineSm)
                FlowLayout(spacing: 6) { ForEach(model.pack.connectors, id: \.self) { w in WritingChip(text: w, english: true) { model.insert(w) } } }
            }
            if !model.saved.isEmpty {
                SkillCard {
                    Text(t(.writeWriteBaiDaViet)).studyText(LKType.headlineSm)
                    ForEach(Array(model.saved.prefix(Essay.showSaved).enumerated()), id: \.offset) { i, e in
                        HStack(spacing: LKSpacing.spaceXs) {
                            Text(t(.writeWriteDeN, ["n": Essay.sessionNumber(e.s("prompt"))]) + " · " + t(.vocabWords, ["n": e.i("words")])).studyText(LKType.bodySm)
                            Spacer(minLength: 0)
                            StudyChip(text: "LR ~" + bandText(JSON.orZero(e["band"])))
                            Button(t(.writeWriteMo)) { Task { await model.open(saved: i) } }.buttonStyle(StudyOutlineButtonStyle()).fixedSize()
                        }
                    }
                }
            }
        }
    }

    /// the chip text that goes into the essay: the first alternative, without a trailing "(bị động)" note (web `v.split(' / ')[0].replace(/ \(.*\)/, '')`)
    static func insertText(_ v: String) -> String {
        let first = v.components(separatedBy: " / ").first ?? v
        return first.replacingOccurrences(of: " \\(.*\\)", with: "", options: .regularExpression)
    }

    @ViewBuilder private var trends: some View {
        let types = model.pack.trends["types"]?.array ?? []
        ForEach(Array(types.enumerated()), id: \.offset) { _, row in
            let name = row.array?.first?.string ?? "", v = JSON.orZero(row.array?.last)
            HStack(spacing: LKSpacing.spaceXs) {
                Text(verbatim: t.src(name)).studyText(LKType.bodySm).frame(width: 110, alignment: .leading).lineLimit(2)
                GeometryReader { g in
                    ZStack(alignment: .leading) {
                        Capsule().fill(LKColor.outlineVariant.resolve(scheme))
                        Capsule().fill(LKColor.secondary.resolve(scheme)).frame(width: g.size.width * min(1, v * 2 / 100))
                    }
                }.frame(height: 8).accessibilityHidden(true)
                Text(verbatim: "\(Int(v))%").studyText(LKType.bodySm, dim).frame(width: 40, alignment: .trailing)
            }
        }
        Text(t(.writeWriteChuDeLapNhieu) + " " + (model.pack.trends.strs("topics").map { t.src($0) }).joined(separator: " · ")).studyText(LKType.bodySm, dim).fixedSize(horizontal: false, vertical: true)
        let t1 = model.pack.trends["task1"]?.array ?? []
        Text(verbatim: "Task 1: " + t1.map { row in t.src(row.array?.first?.string ?? "") + " \(Int(JSON.orZero(row.array?.last)))%" }.joined(separator: " · ")).studyText(LKType.bodySm, dim).fixedSize(horizontal: false, vertical: true)
    }
}

extension EssayModel {
    /// "gợi ý thay thế" of a repeated word: the synonyms of the word library (web `IELTS_DATA.INDEX[w].syn`, up to 4)
    func synonyms(_ w: String) -> [String] { Array((catalog.index[w]?.strs("syn") ?? []).prefix(4)) }
}
