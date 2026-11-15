import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKStrings

extension String {
    /// the i18n sources carry a little HTML (`<a>`, `<b>`, `<i>`): plain text for views that cannot show it
    var strippingTags: String { replacingOccurrences(of: "<[^>]+>", with: "", options: .regularExpression) }
}

// MARK: - hub (#/grammar)
struct GrammarHubView: View {
    let model: GrammarHubModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var open: Set<Int> = []
    @State private var seeded = false

    var body: some View {
        StudyPage(title: t.lv("Ngữ pháp")) {
            Text(t.lv("{n} bài học trực quan: dòng thời gian, công thức tô màu, sơ đồ biến đổi câu, lỗi người Việt hay mắc và bài tập chấm điểm ngay.", ["n": model.all.count])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            progress
            if let nx = model.next { hero(nx.lesson, nx.chapter) }
            tabs
            if model.tab != "all" { focusCard }
            if model.pack.chapters.isEmpty || model.all.isEmpty { SkillCard { StudyEmpty(icon: "ruler", title: t.lv("Đang cập nhật bài học…")) } }
            else { ForEach(Array(model.pack.chapters.enumerated()), id: \.offset) { _, c in chapter(c) } }
            Text(t.lv("Kiểm tra tổng hợp")).studyText(LKType.headlineSm)
            toolCard("shuffle", t.lv("Đề tổng hợp {n} câu", ["n": 20]), t.lv("Trộn câu hỏi từ các bài đã học (hoặc mọi bài)")) { onRoute(AppRoute("grammar", arg: "mix")) }
            toolCard("flag.checkered", t.lv("Đề tổng hợp {n} câu", ["n": 40]), t.lv("Ôn toàn bộ chương trình – như bài thi cuối khóa")) { onRoute(AppRoute("grammar", arg: "mix", query: ["n": "40"])) }
            Text(verbatim: "🧰 " + t.lv("Công cụ ngữ pháp")).studyText(LKType.headlineSm)
            toolCard("textformat", t.lv("Chia động từ"), t.lv("Mọi thì, bị động, cách đọc -ed/-s")) { onRoute(AppRoute("verb")) }
            toolCard("pencil.line", t.lv("Sửa ngữ pháp"), t.lv("Dán đoạn văn – gạch chân lỗi, sửa 1 chạm")) { onRoute(AppRoute("fix")) }
        }
        .task { await model.load(); seedOpen() }
        .onAppear { seedOpen() }
        .accessibilityIdentifier("grammar")
    }
    private func seedOpen() { if !seeded, let n = model.next { open = [n.chapter.i("n")]; seeded = true } }

    private var progress: some View {
        let n = model.all.count, d = model.doneCount
        return HStack(spacing: LKSpacing.spaceSm) {
            SkillProgress(value: n == 0 ? 0 : Double(d) / Double(n))
            Text(verbatim: "\(d)/\(n)").studyText(LKType.titlePill).environment(\.layoutDirection, .leftToRight)
        }
        .accessibilityElement(children: .combine)
    }
    private func hero(_ x: JSON, _ c: JSON) -> some View {
        let last = model.done[x.s("id")]
        return SkillCard {
            Text(verbatim: last != nil ? t.lv("Làm lại cho chắc · lần trước {pct}%", ["pct": last ?? 0]) : t.lv("Bài tiếp theo")).studyText(LKType.labelMetric, LKColor.secondary)
            Text(verbatim: x.s("emoji") + " " + t.lessonTitle(x)).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
            Text(verbatim: t.lv("Chương {n}", ["n": c.i("n")]) + " · " + t.lv(c.s("name"))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            SkillAction(title: t.lv("Học ngay"), icon: "play.fill", primary: true) { onRoute(AppRoute("grammar", arg: x.s("id"))) }
        }
    }
    private var tabs: some View {
        FlowLayout(spacing: 6) {
            WritingChip(text: t.lv("Tất cả {n} bài", ["n": model.all.count]), selected: model.tab == "all") { model.tab = "all" }
            WritingChip(text: t.lv("Trọng tâm IELTS 7.0+"), selected: model.tab == "ielts", system: "graduationcap.fill") { model.tab = "ielts" }
            WritingChip(text: t.lv("Bí kíp TOEIC Part 5 & 6"), selected: model.tab == "toeic", system: "briefcase.fill") { model.tab = "toeic" }
        }
    }
    private var focusCard: some View {
        let ls = model.focus(model.tab), dn = ls.filter { (model.done[$0.s("id")] ?? 0) >= GrammarCore.passPct }.count
        return SkillCard {
            HStack { Text(verbatim: model.tab == "ielts" ? t.lv("Trọng tâm IELTS 7.0+") : t.lv("Bí kíp TOEIC Part 5 & 6")).studyText(LKType.titlePill); Spacer(minLength: 0); Text(verbatim: "\(dn)/\(ls.count)").studyText(LKType.titlePill).environment(\.layoutDirection, .leftToRight) }
            SkillProgress(value: ls.isEmpty ? 0 : Double(dn) / Double(ls.count))
            ForEach(Array(ls.enumerated()), id: \.offset) { _, x in row(x) }
        }
    }
    private func chapter(_ c: JSON) -> some View {
        let ls = model.pack.lessons(of: c)
        let dn = ls.filter { (model.done[$0.s("id")] ?? 0) >= GrammarCore.passPct }.count
        let isOpen = Binding(get: { open.contains(c.i("n")) }, set: { if $0 { open.insert(c.i("n")) } else { open.remove(c.i("n")) } })
        return SkillCard {
            DisclosureGroup(isExpanded: isOpen) {
                VStack(alignment: .leading, spacing: 0) {
                    ForEach(Array(ls.enumerated()), id: \.offset) { _, x in row(x) }
                    Button { onRoute(AppRoute("grammar", arg: "mix", query: ["ch": String(c.i("n"))])) } label: {
                        HStack { Image(systemName: "doc.badge.gearshape"); VStack(alignment: .leading) { Text(verbatim: t.lv("Kiểm tra chương")).studyText(LKType.titlePill); Text(verbatim: t.lv("Trộn câu hỏi của cả chương")).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }; Spacer(minLength: 0) }
                            .frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                    }.buttonStyle(.plain)
                }.padding(.top, 4)
            } label: {
                HStack(spacing: 8) {
                    Text(verbatim: c.s("emoji")).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(verbatim: t.lv("Chương {n}", ["n": c.i("n")]) + " · " + t.lv(c.s("name"))).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
                        Text(verbatim: t.lv(c.s("desc"))).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    }
                    Spacer(minLength: 0)
                    Text(verbatim: "\(dn)/\(ls.count)").studyText(LKType.labelMetric, LKColor.onSurfaceVariant).environment(\.layoutDirection, .leftToRight)
                }
                .frame(minHeight: LKFrame.shared.minTap)
            }
        }
    }
    private func row(_ x: JSON) -> some View {
        let d = model.done[x.s("id")]
        return Button { onRoute(AppRoute("grammar", arg: x.s("id"))) } label: {
            HStack(spacing: 8) {
                Text(verbatim: x.s("emoji")).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 1) {
                    Text(verbatim: t.lessonTitle(x)).studyText(LKType.titlePill).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                    if !t.lessonSub(x).isEmpty { Text(verbatim: t.lessonSub(x)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                }
                Spacer(minLength: 0)
                StudyChip(text: x.s("level"), tint: LKColor.tertiary)
                if let d { StudyChip(text: "\(d)%", icon: d >= GrammarCore.passPct ? "checkmark" : nil, tint: d >= GrammarCore.passPct ? LKColor.success : LKColor.onSurfaceVariant) }
            }
            .frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
    private func toolCard(_ icon: String, _ title: String, _ sub: String, _ go: @escaping () -> Void) -> some View {
        Button(action: go) {
            SkillCard {
                HStack(spacing: LKSpacing.spaceSm) {
                    Image(systemName: icon).font(.system(size: 22, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) { Text(verbatim: title).studyText(LKType.titlePill); Text(verbatim: sub).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                    Spacer(minLength: 0)
                }
            }
        }.buttonStyle(.plain)
    }
}

// MARK: - lesson (#/grammar/<id>[?view=full])
struct GrammarLessonView: View {
    let model: GrammarLessonModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        StudyPage(title: model.entry.map { t.lessonTitle($0) } ?? t.lv("Ngữ pháp")) {
            if model.lesson == nil {
                if model.loaded { SkillCard { StudyEmpty(icon: "wifi.slash", title: t(.syncOffline), action: (t(.actionRetry), { Task { await model.load() } })) } }
                else { WritingSkeleton(rows: 5) }
            } else if model.full { fullBody } else { stepsBody }
        }
        .task { await model.load() }
        .accessibilityIdentifier("grammar-lesson")
    }
    private var speak: (String) -> Void { { model.speak($0) } }

    private var hero: some View {
        let x = model.entry ?? .null, c = model.chapter
        return SkillCard {
            HStack(spacing: LKSpacing.spaceSm) {
                Text(verbatim: x.s("emoji")).font(.system(size: 40)).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: t.lv("Chương {n}", ["n": c.i("n")]) + " · " + t.lv(c.s("name")) + " · " + x.s("level")).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    Text(verbatim: t.lessonTitle(x)).studyText(LKType.headlineMd).fixedSize(horizontal: false, vertical: true)
                    if !t.lessonSub(x).isEmpty { Text(verbatim: t.lessonSub(x)).studyText(LKType.titlePill, LKColor.secondary).englishText() }
                }
            }
            Text(verbatim: t.lv(x.s("summary"))).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
        }
    }
    private func l1Card(_ lang: String) -> some View {
        let notes = model.pack.l1[lang]?["notes"]?[model.id]?.array ?? []
        return Group {
            if !notes.isEmpty {
                SkillCard {
                    Text(verbatim: "🌐 " + (model.pack.l1[lang]?.s("title") ?? "")).studyText(LKType.titlePill)
                    ForEach(Array(notes.enumerated()), id: \.offset) { _, n in
                        let a = n.array?.compactMap(\.string) ?? []
                        if a.count >= 3 {
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(alignment: .firstTextBaseline) { Text(verbatim: "✗").studyText(LKType.titlePill, LKColor.error); Text(verbatim: a[0]).studyText(LKType.bodyMd, LKColor.error).strikethrough().englishText() }
                                HStack(alignment: .firstTextBaseline) { Text(verbatim: "✓").studyText(LKType.titlePill, LKColor.success); Text(verbatim: a[1]).studyText(LKType.bodyMd).englishText() }
                                Text(verbatim: a[2]).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: full view
    @ViewBuilder private var fullBody: some View {
        HStack { SkillAction(title: t.lv("Học từng bước"), icon: "target") { onRoute(AppRoute("grammar", arg: model.id)) } }
        hero
        ForEach(Array(model.blocks.enumerated()), id: \.offset) { _, b in GrammarBlockView(block: b, speak: speak) }
        l1Card(t.lang)
        quizCard
        if !model.drillList.isEmpty { drillsCard }
        if model.checkPattern != nil { ownCard }
        navRow(fullView: true)
    }
    private func navRow(fullView: Bool) -> some View {
        HStack(spacing: LKSpacing.spaceXs) {
            if let p = model.prev { SkillAction(title: "← " + t.lessonTitle(p)) { onRoute(AppRoute("grammar", arg: p.s("id"), query: fullView ? ["view": "full"] : [:])) } }
            if let n = model.next { SkillAction(title: t.lessonTitle(n) + " →", primary: true) { onRoute(AppRoute("grammar", arg: n.s("id"), query: fullView ? ["view": "full"] : [:])) } }
        }
    }

    // MARK: steps
    @ViewBuilder private var stepsBody: some View {
        HStack { SkillAction(title: t.lv("Xem toàn bài"), icon: "book") { onRoute(AppRoute("grammar", arg: model.id, query: ["view": "full"])) } }
        if model.cur == 0 { hero }
        dots
        stepContent
        HStack(spacing: LKSpacing.spaceXs) {
            if model.cur > 0 { SkillAction(title: "← " + t.lv("Quay lại")) { model.go(-1) } }
            if model.cur < model.steps.count - 1 {
                if model.step == .build && !model.gateOpen { SkillAction(title: t.lv("Bỏ qua")) { model.skipGate() } }
                SkillAction(title: t.lv("Tiếp tục") + " →", primary: true, enabled: model.gateOpen) { model.go(1) }
            }
        }
    }
    private func stepName(_ s: GrammarLessonModel.Step) -> (String, String) {
        switch s {
        case .visual: return ("👀", t.lv("Hình dung")); case .build: return ("🧮", t.lv("Ghép công thức")); case .uses: return ("🎯", t.lv("Cách dùng")); case .extras: return ("💡", t.lv("Mẹo & dấu hiệu"))
        case .mistakes: return ("🕵️", t.lv("Bắt lỗi")); case .arrange: return ("🧩", t.lv("Xếp câu")); case .drills: return ("✍️", t.lv("Tự luận")); case .quiz: return ("✏️", t.lv("Luyện tập")); case .own: return ("💬", t.lv("Tự đặt câu"))
        }
    }
    private var dots: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 6) {
                ForEach(Array(model.steps.enumerated()), id: \.offset) { k, s in
                    let n = stepName(s), on = k == model.cur
                    Button { model.jump(k) } label: {
                        HStack(spacing: 4) { Text(verbatim: k < model.cur ? "✓" : n.0); if on { Text(verbatim: n.1).lkTextSafe(LKType.labelMetric) } }
                            .padding(.horizontal, 10).frame(minHeight: LKFrame.shared.minTap)
                            .foregroundStyle((on ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
                            .background(Capsule().fill((on ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                    }.buttonStyle(.plain).accessibilityLabel(n.1).accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
    }
    @ViewBuilder private var stepContent: some View {
        switch model.step {
        case .visual:
            ForEach(Array(model.blocks(["timeline", "diagram", "scale", "sort"]).enumerated()), id: \.offset) { _, b in GrammarBlockView(block: b, speak: speak) }
            SkillCard { SkillNote(icon: "brain.head.profile", text: t.lv("Ghi nhớ:") + " " + t.lv(model.entry?.s("summary") ?? "")) }
        case .build: buildStep
        case .uses: usesStep
        case .extras: ForEach(Array(model.blocks(["signals", "table", "tip", "ielts"]).enumerated()), id: \.offset) { _, b in GrammarBlockView(block: b, speak: speak) }
        case .mistakes: mistakesStep
        case .arrange: arrangeStep
        case .drills: drillsCard
        case .quiz: quizCard
        case .own: ownCard
        }
    }

    private var buildStep: some View {
        let row = model.blocks(["formula"]).first?.list("rows").first ?? .null, parts = row.list("parts")
        return SkillCard {
            Text(verbatim: "🧮 " + t.lv("Bấm các mảnh theo đúng thứ tự để tạo công thức “{label}”", ["label": row.s("label")])).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
            FlowLayout(spacing: 4) {
                ForEach(0..<model.formulaNext, id: \.self) { k in
                    if k > 0 { Text(verbatim: "+").studyText(LKType.labelMetric, LKColor.onSurfaceVariant) }
                    pill(parts[k].s("t"), parts[k].s("c"))
                }
            }
            .frame(minHeight: 44)
            if model.formulaNext < model.formulaOrder.count {
                FlowLayout(spacing: 6) {
                    ForEach(model.formulaOrder.filter { $0 >= model.formulaNext }, id: \.self) { k in
                        Button { _ = model.pickFormula(k) } label: { pill(parts[k].s("t"), parts[k].s("c")) }.buttonStyle(.plain).frame(minHeight: LKFrame.shared.minTap)
                    }
                }
                if model.formulaWrong { SkillNote(icon: "xmark.circle", text: t.lv("Chưa đúng"), tint: LKColor.error) }
            } else {
                SkillNote(icon: "checkmark.circle.fill", text: t.lv("Chính xác!"), tint: LKColor.success)
                if let b = model.blocks(["formula"]).first { GrammarBlockView(block: b, speak: speak) }
            }
        }
    }
    private func pill(_ text: String, _ c: String) -> some View {
        Text(verbatim: text).lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(Capsule().fill(GrammarBlockView.tone(c).resolve(scheme).opacity(0.18)))
            .overlay(Capsule().strokeBorder(GrammarBlockView.tone(c).resolve(scheme), lineWidth: 1.5))
    }
    private var usesStep: some View {
        let items = model.blocks(["uses"]).first?.list("items") ?? []
        return SkillCard {
            Text(verbatim: "🎯 " + t.lv("Khi nào dùng?")).studyText(LKType.headlineSm)
            Text(verbatim: t.lv("Bấm vào từng thẻ để xem ví dụ")).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            ForEach(Array(items.enumerated()), id: \.offset) { i, u in
                Button { model.revealUse(i); model.speak(u.s("ex")) } label: {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(verbatim: "\(i + 1). " + u.s("title")).studyText(LKType.titlePill).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                        if model.revealedUses.contains(i) {
                            EnglishText(text: GrammarCore.plain(u.s("ex")), style: LKType.bodyMd)
                            Text(verbatim: u.s("vi")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
                    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
                }.buttonStyle(.plain)
            }
        }
    }
    private var mistakesStep: some View {
        let ms = model.blocks(["mistake"])
        return SkillCard {
            Text(verbatim: t.lv("Đọc câu sai, tự tìm lỗi trong đầu rồi bấm để kiểm tra – cách nhớ lâu nhất là tự phát hiện.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            ForEach(Array(ms.enumerated()), id: \.offset) { i, m in
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline) { Text(verbatim: "✗").studyText(LKType.titlePill, LKColor.error); Text(verbatim: m.s("wrong")).studyText(LKType.bodyMd, LKColor.error).strikethrough().englishText() }
                    if model.revealedMistakes.contains(i) { GrammarBlockView(block: m, speak: speak) }
                    else { SkillAction(title: t.lv("Tôi đã tìm ra lỗi – xem đáp án")) { model.revealMistake(i) } }
                }
            }
        }
    }
    private var arrangeStep: some View {
        SkillCard {
            Text(verbatim: "🧩 " + t.lv("Xếp các từ thành câu đúng")).studyText(LKType.headlineSm)
            ForEach(Array(model.builds.enumerated()), id: \.offset) { k, s in
                let words = GrammarCore.tokens(s)
                VStack(alignment: .leading, spacing: 6) {
                    FlowLayout(spacing: 6) {
                        ForEach(Array(model.built[k].enumerated()), id: \.offset) { i, j in
                            Button { model.arrangeRemove(k, at: i) } label: { wordChip(words[j], tone: model.arrangeOK[k].map { $0 ? LKColor.success : LKColor.error }) }.buttonStyle(.plain)
                        }
                    }
                    .frame(minHeight: 44, alignment: .leading).frame(maxWidth: .infinity, alignment: .leading)
                    .padding(6).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
                    if model.arrangeOK[k] == nil {
                        FlowLayout(spacing: 6) {
                            ForEach(model.pool[k], id: \.0) { j, w in
                                if !model.built[k].contains(j) { Button { model.arrangeTap(k, pool: j) } label: { wordChip(w, tone: nil) }.buttonStyle(.plain) }
                            }
                        }
                    }
                    if let ok = model.arrangeOK[k] {
                        SkillNote(icon: ok ? "checkmark.circle.fill" : "xmark.circle.fill", text: ok ? t.lv("Chính xác!") : t.lv("Đáp án: <i>{a}</i>", ["a": s]).strippingTags, tint: ok ? LKColor.success : LKColor.error)
                    }
                    SkillAction(title: t.lv("Làm lại"), icon: "arrow.counterclockwise") { model.arrangeReset(k) }
                }
            }
        }
    }
    private func wordChip(_ w: String, tone: LKDynamicColor?) -> some View {
        Text(verbatim: w).lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
            .padding(.horizontal, 10).frame(minHeight: LKFrame.shared.minTap)
            .background(Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
            .overlay(Capsule().strokeBorder((tone ?? LKColor.outlineVariant).resolve(scheme), lineWidth: 2))
    }

    // MARK: quiz, drills, own sentence
    private var quizCard: some View {
        SkillCard {
            Text(verbatim: "✏️ " + t.lv("Luyện tập ({n} câu)", ["n": model.quiz.count])).studyText(LKType.headlineSm)
            ForEach(Array(model.quiz.enumerated()), id: \.offset) { qi, q in
                let opts = q.strs("options"), picked = model.quizPicked[qi], ans = q.i("answer")
                VStack(alignment: .leading, spacing: 6) {
                    EnglishText(text: "\(qi + 1). " + q.s("q"), style: LKType.titlePill)
                    ForEach(Array(opts.enumerated()), id: \.offset) { j, o in
                        let right = picked != nil && j == ans, wrong = picked == j && j != ans
                        Button { Task { await model.pickQuiz(qi, j) } } label: {
                            HStack { Text(verbatim: o).lkTextSafe(LKType.bodyMd).englishText().multilineTextAlignment(.leading); Spacer(minLength: 0); if right { Image(systemName: "checkmark.circle.fill") } else if wrong { Image(systemName: "xmark.circle.fill") } }
                                .foregroundStyle(LKColor.onSurface.resolve(scheme)).padding(.horizontal, 12).frame(minHeight: LKFrame.shared.minTap)
                                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
                                .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder((right ? LKColor.success : wrong ? LKColor.error : LKColor.outlineVariant).resolve(scheme), lineWidth: 2))
                        }.buttonStyle(.plain).disabled(picked != nil)
                    }
                    if let p = picked {
                        if p == ans { SkillNote(icon: "checkmark.circle.fill", text: q.s("explain"), tint: LKColor.success) }
                        else { SkillNote(icon: "xmark.circle.fill", text: t.lv("Bạn chọn:") + " " + (p < opts.count ? opts[p] : "") + " · " + t.lv("Đáp án: <b>{a}</b>", ["a": ans < opts.count ? opts[ans] : ""]).strippingTags + " – " + q.s("explain"), tint: LKColor.error) }
                    }
                }
            }
            if let s = model.quizSummary {
                SkillNote(icon: s.pct >= GrammarCore.passPct ? "party.popper.fill" : "arrow.triangle.2.circlepath", text: t.lv("{right}/{total} câu đúng ({pct}%)", ["right": s.right, "total": model.quiz.count, "pct": s.pct]) + " · +\(s.xp) XP", tint: s.pct >= GrammarCore.passPct ? LKColor.success : LKColor.tertiary)
                if s.pct < GrammarCore.passPct { Text(verbatim: t.lv("Xem lại phần công thức và lỗi hay gặp rồi làm lại nhé. Câu sai đã vào Sổ lỗi sai.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                HStack(spacing: LKSpacing.spaceXs) {
                    SkillAction(title: t.lv("Làm lại"), icon: "arrow.counterclockwise") { model.quizAgain() }
                    if s.right < model.quiz.count { SkillAction(title: t.lv("Sổ lỗi sai"), icon: "book.closed") { onRoute(AppRoute("mistakes")) } }
                    if let n = model.next { SkillAction(title: t.lv("Bài tiếp theo") + " →", primary: true) { onRoute(AppRoute("grammar", arg: n.s("id"))) } }
                }
                recap
            }
        }
    }
    private var recap: some View {
        let f = model.blocks(["formula"]).first?.list("rows").first, m = model.blocks(["mistake"]).first
        return VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: "🧠 " + t.lv("Tóm tắt bài học")).studyText(LKType.titlePill)
            Text(verbatim: t.lv(model.entry?.s("summary") ?? "")).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
            if let f { EnglishText(text: f.list("parts").map { $0.s("t") }.joined(separator: " + "), style: LKType.labelMetric) }
            if let m { EnglishText(text: "✗ " + m.s("wrong") + "  →  ✓ " + m.s("right"), style: LKType.bodySm) }
        }
        .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
    }
    private var drillsCard: some View {
        SkillCard {
            Text(verbatim: "🖋 " + t.lv("Bài tập tự luận ({n} câu)", ["n": model.drillList.count])).studyText(LKType.headlineSm)
            ForEach(Array(model.drillList.enumerated()), id: \.offset) { i, d in
                DrillView(drill: d, state: model.drills[i], setInput: { model.setInput(i, $0) }, check: { p in Task { await model.checkDrill(i, picked: p) } })
            }
            if let s = model.drillSummary {
                SkillNote(icon: s.pct >= GrammarCore.passPct ? "party.popper.fill" : "arrow.triangle.2.circlepath", text: t.lv("{right}/{total} câu đúng ({pct}%)", ["right": s.right, "total": model.drillList.count, "pct": s.pct]) + " · +\(s.xp) XP", tint: s.pct >= GrammarCore.passPct ? LKColor.success : LKColor.tertiary)
            }
        }
    }
    @ViewBuilder private var ownCard: some View {
        if let c = model.checkPattern {
            SkillCard {
                Text(verbatim: "✍️ " + t.lv("Thử thách tự đặt câu")).studyText(LKType.headlineSm)
                Text(verbatim: t.lv("Đặt một câu hoàn chỉnh sử dụng cấu trúc bạn vừa học") + " · " + (c.count > 1 ? c[1] : "")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                TextField(t.lv("Gõ câu tiếng Anh của bạn…"), text: Bindable(model).ownText, axis: .vertical).lineLimit(2...4)
                    .lkTextSafe(LKType.bodyMd).englishText().padding(10)
                    .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
                    .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
                SkillAction(title: t.lv("Kiểm tra câu"), primary: true) { Task { await model.checkOwn() } }
                if model.ownShort { SkillNote(icon: "exclamationmark.circle", text: t.lv("Hãy viết một câu hoàn chỉnh (ít nhất 4 từ).")) }
                if let r = model.ownResult {
                    if r.ok { SkillNote(icon: "checkmark.circle.fill", text: t.lv("Tuyệt! Bạn đã dùng đúng cấu trúc của bài.") + (r.first ? " +15 XP" : ""), tint: LKColor.success) }
                    else {
                        SkillNote(icon: "xmark.circle.fill", text: t.lv("Chưa thấy cấu trúc của bài trong câu.") + " " + t.lv("Công thức") + ": " + (c.count > 1 ? c[1] : ""), tint: LKColor.error)
                        Text(verbatim: t.lv("Gợi ý: xem lại ví dụ ở phần “Cách dùng”, rồi viết lại câu theo đúng công thức.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }
}

// MARK: - mixed test (#/grammar/mix?ch=&n=)
struct GrammarMixView: View {
    let model: GrammarMixModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        StudyPage(title: t.lv("Kiểm tra tổng hợp")) {
            if !model.loaded { WritingSkeleton(rows: 4) }
            else if model.items.isEmpty { SkillCard { StudyEmpty(icon: "wifi.slash", title: t(.syncOffline), action: (t(.actionRetry), { Task { await model.load() } })) } }
            else if let s = model.summary { result(s) }
            else if let it = model.current { question(it) }
        }
        .task { await model.load() }
        .accessibilityIdentifier("grammar-mix")
    }
    private func result(_ s: (right: Int, pct: Int, xp: Int)) -> some View {
        SkillCard {
            Image(systemName: "shuffle").font(.system(size: 40)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: t.lv("{right}/{total} câu đúng ({pct}%)", ["right": s.right, "total": model.items.count, "pct": s.pct])).studyText(LKType.headlineMd)
            Text(verbatim: "+\(s.xp) XP").studyText(LKType.titlePill, LKColor.success)
            Text(verbatim: t.lv("Câu sai đã được ghi vào <a href=\"#/mistakes\">Sổ lỗi sai</a>.").strippingTags).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            SkillAction(title: t.lv("Luyện lượt mới"), primary: true) { model.again() }
            SkillAction(title: t.lv("Về danh sách bài")) { onRoute(AppRoute("grammar")) }
        }
    }
    private func question(_ it: GrammarMixModel.Item) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack(spacing: LKSpacing.spaceSm) {
                SkillProgress(value: Double(model.i) / Double(max(1, model.items.count)))
                Text(verbatim: "\(model.i + 1)/\(model.items.count)").studyText(LKType.titlePill).environment(\.layoutDirection, .leftToRight)
            }
            Text(verbatim: it.lesson.s("emoji") + " " + t.lessonTitle(it.lesson)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            if let q = it.q { mcq(q, it) } else if let d = it.d {
                SkillCard { DrillView(drill: d, state: model.drill, setInput: { model.setInput($0) }, check: { p in Task { await model.check(picked: p) } }) }
            }
            if model.answered {
                HStack(spacing: LKSpacing.spaceXs) {
                    SkillAction(title: t.lv("Tiếp"), primary: true) { Task { await model.advance() } }
                    SkillAction(title: t.lv("Xem lại bài")) { onRoute(AppRoute("grammar", arg: it.lesson.s("id"))) }
                }
            }
        }
    }
    private func mcq(_ q: JSON, _ it: GrammarMixModel.Item) -> some View {
        let opts = q.strs("options"), ans = q.i("answer"), p = model.picked
        return SkillCard {
            EnglishText(text: q.s("q"), style: LKType.titlePill)
            ForEach(Array(opts.enumerated()), id: \.offset) { j, o in
                let right = p != nil && j == ans, wrong = p == j && j != ans
                Button { Task { await model.pick(j) } } label: {
                    HStack { Text(verbatim: o).lkTextSafe(LKType.bodyMd).englishText().multilineTextAlignment(.leading); Spacer(minLength: 0); if right { Image(systemName: "checkmark.circle.fill") } else if wrong { Image(systemName: "xmark.circle.fill") } }
                        .foregroundStyle(LKColor.onSurface.resolve(scheme)).padding(.horizontal, 12).frame(minHeight: LKFrame.shared.minTap)
                        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder((right ? LKColor.success : wrong ? LKColor.error : LKColor.outlineVariant).resolve(scheme), lineWidth: 2))
                }.buttonStyle(.plain).disabled(p != nil)
            }
            if p != nil { SkillNote(icon: p == ans ? "checkmark.circle.fill" : "xmark.circle.fill", text: (p == ans ? t.lv("Chính xác!") : t.lv("Chưa đúng")) + " – " + q.s("explain"), tint: p == ans ? LKColor.success : LKColor.error) }
        }
    }
}
