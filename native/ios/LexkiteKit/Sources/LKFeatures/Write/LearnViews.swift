import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKCore
import LKStrings

// MARK: - #/quick (focus)
struct QuickView: View {
    let model: QuickModel
    var onClose: () -> Void = {}
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        VStack(spacing: 0) {
            TopBar(variant: .focus(progress: model.progress), title: t.lv("Chơi nhanh 15 giây")) { onClose() }
            ScrollView {
                VStack(spacing: LKSpacing.spaceMd) { content }
                    .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm).padding(.bottom, LKSpacing.space2xl)
                    .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .task { if model.stage == .loading { await model.load() } }
        .onReceive(Timer.publish(every: 0.25, on: .main, in: .common).autoconnect()) { _ in model.tick() }
        .accessibilityIdentifier("quick")
    }

    @ViewBuilder private var content: some View {
        switch model.stage {
        case .loading: WritingSkeleton(rows: 4)
        case .empty:
            SkillCard {
                Text(verbatim: t.lv("Chưa có đủ từ vựng")).studyText(LKType.headlineSm)
                Text(verbatim: t.lv("Hãy lưu một vài từ vựng hoặc học theo lộ trình trước khi chơi nhanh nhé.")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                SkillAction(title: t.lv("Về trang chủ"), primary: true) { onClose() }
            }
        case .playing: playing
        case .done(let r): done(r)
        }
    }

    @ViewBuilder private var playing: some View {
        if let q = model.current {
            HStack {
                StudyChip(text: t.lv("Câu {i}/{total}", ["i": model.index + 1, "total": model.total]), icon: "bolt.fill")
                Spacer(minLength: 0)
                Label { Text(verbatim: "\(model.secondsLeft)s").monospacedDigit() } icon: { Image(systemName: "timer") }
                    .lkTextSafe(LKType.titlePill).foregroundStyle(LKColor.tertiary.resolve(scheme)).environment(\.layoutDirection, .leftToRight)
                    .accessibilityLabel("\(model.secondsLeft)s")
            }
            SkillCard {
                Text(verbatim: q.word).studyText(LKType.headlineLg).englishText()
                HStack(spacing: 6) {
                    if !q.ipa.isEmpty { Text(verbatim: q.ipa).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).englishText() }
                    if !q.pos.isEmpty { StudyChip(text: q.pos) }
                    Button { model.speak() } label: { Image(systemName: "speaker.wave.2.fill").foregroundStyle(LKColor.secondary.resolve(scheme)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap) }
                        .buttonStyle(.plain).accessibilityLabel(t(.vocabPronounce))
                }
                Text(verbatim: t.lv("Chọn nghĩa đúng")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            }
            ForEach(Array(q.options.enumerated()), id: \.offset) { i, o in
                let right = model.picked != nil && i == q.correct, wrong = model.picked == i && i != q.correct
                Button { Task { await model.answer(i) } } label: {
                    HStack(spacing: 10) {
                        Text(verbatim: o).lkTextSafe(LKType.bodyLg).multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                        if right { Image(systemName: "checkmark.circle.fill") } else if wrong { Image(systemName: "xmark.circle.fill") } else { Text(verbatim: String(i + 1)).lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
                    }
                    .foregroundStyle(LKColor.onSurface.resolve(scheme)).padding(.horizontal, 16).frame(maxWidth: .infinity, minHeight: 56)
                    .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(LKColor.surfaceContainerHighest.resolve(scheme)))
                    .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder((right ? LKColor.success : wrong ? LKColor.error : LKColor.outlineVariant).resolve(scheme), lineWidth: 2))
                }
                .buttonStyle(.plain).disabled(model.picked != nil)
                .accessibilityValue(right ? t.lv("Chính xác!") : wrong ? t.lv("Chưa đúng") : "")
            }
        }
    }

    private func done(_ r: Quick.Result) -> some View {
        SkillCard {
            Image(systemName: r.good ? "bolt.fill" : "leaf.fill").font(.system(size: 52)).foregroundStyle((r.good ? LKColor.tertiary : LKColor.success).resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: r.timedOut ? t.lv("Hết 15 giây!") : t.lv("Hoàn thành trong {s} giây!", ["s": r.secs])).studyText(LKType.headlineMd).multilineTextAlignment(.center)
            Text(verbatim: t.lv("Đúng {n}/{total} câu", ["n": r.right, "total": r.total]) + (r.xp > 0 ? " · +\(r.xp) XP" : "")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            Text(verbatim: r.pct == 100 ? t.lv("Phản xạ thần tốc! Trí nhớ như máy quét ⚡") : r.good ? t.lv("Rất xuất sắc! Não bộ vừa được khởi động cực mượt 🚀") : t.lv("Khởi động tuyệt vời! Mỗi lần luyện là một lần nhớ sâu hơn 🌱"))
                .studyText(LKType.titlePill).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            SkillAction(title: t.lv("Làm thêm lượt nữa"), icon: "bolt.fill", primary: true) { Task { await model.again() } }
            SkillAction(title: t.lv("Về trang chủ")) { onClose() }
        }
    }
}

// MARK: - #/style
struct StyleView: View {
    let model: StyleModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        StudyPage(title: t.lv("Phong cách tiếng Anh của bạn")) {
            if let w = model.result { result(w) } else if let q = model.current { question(q) }
        }
        .accessibilityIdentifier("style")
    }
    private func question(_ q: JSON) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack(spacing: LKSpacing.spaceSm) {
                SkillProgress(value: Double(model.index) / Double(max(1, model.questions.count)))
                Text(verbatim: "\(model.index + 1)/\(model.questions.count)").studyText(LKType.titlePill, LKColor.onSurfaceVariant).environment(\.layoutDirection, .leftToRight)
            }
            SkillCard {
                Text(verbatim: t.lv("Phong cách tiếng Anh của bạn")).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
                Text(verbatim: t.lv(q.s("q"))).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
            }
            ForEach(Array(q.list("opts").enumerated()), id: \.offset) { k, o in
                let on = model.chosen == k
                Button { Task { await model.pick(k) } } label: {
                    Text(verbatim: t.lv(o.s("text"))).lkTextSafe(LKType.bodyLg).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                        .foregroundStyle(LKColor.onSurface.resolve(scheme)).padding(.horizontal, 16).padding(.vertical, 12).frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                        .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill((on ? LKColor.surfaceContainer : LKColor.surfaceContainerHighest).resolve(scheme)))
                        .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).strokeBorder((on ? LKColor.secondary : LKColor.outlineVariant).resolve(scheme), lineWidth: 2))
                }
                .buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }
    private func result(_ s: JSON) -> some View {
        let shareText = t.lv("Mình là {style} trên Lexkite! Khám phá phong cách tiếng Anh của bạn tại {url}", ["style": t.lv(s.s("name")), "url": "https://lexkite.com/app/#/style"])
        return VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            SkillCard {
                Text(verbatim: s.s("icon")).font(.system(size: 52)).frame(maxWidth: .infinity).accessibilityHidden(true)
                Text(verbatim: t.lv("Kết quả phong cách tiếng Anh")).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
                Text(verbatim: t.lv(s.s("name"))).studyText(LKType.headlineMd).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
                Text(verbatim: t.lv(s.s("desc"))).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
            }
            SkillCard {
                Text(verbatim: t.lv("Gợi ý tính năng dành riêng cho bạn:")).studyText(LKType.titlePill)
                ForEach(Array(s.list("recs").enumerated()), id: \.offset) { _, r in
                    let a = r.array?.compactMap(\.string) ?? [], em = (a.last ?? "").split(separator: " ", maxSplits: 1).first.map(String.init) ?? "", rest = (a.last ?? "").split(separator: " ", maxSplits: 1).dropFirst().first.map(String.init) ?? ""
                    Button { if let h = a.first, let ro = AppRoute.parseHash(h) { onRoute(ro) } } label: {
                        HStack(alignment: .firstTextBaseline, spacing: 8) { Text(verbatim: em); Text(verbatim: t.lv(rest)).lkTextSafe(LKType.bodyMd).multilineTextAlignment(.leading); Spacer(minLength: 0) }
                            .foregroundStyle(LKColor.onSurface.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                    }.buttonStyle(.plain)
                }
            }
            SkillAction(title: "🚀 " + t.lv("Bắt đầu lộ trình ngay"), primary: true) { onRoute(AppRoute("path")) }
            SkillAction(title: t.lv("Kiểm tra trình độ chi tiết (20 câu)"), icon: "safari") { onRoute(AppRoute("placement")) }
            ShareLink(item: shareText) { Label(t.lv("Chia sẻ phong cách"), systemImage: "square.and.arrow.up").lkTextSafe(LKType.titlePill).frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap) }
                .foregroundStyle(LKColor.secondary.resolve(scheme))
            SkillAction(title: t.lv("Làm lại"), icon: "arrow.counterclockwise") { model.restart() }
        }
    }
}

// MARK: - #/method
struct MethodView: View {
    let model: MethodModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    private func go(_ h: String) { if let r = AppRoute.parseHash(h) { onRoute(r) } }
    var body: some View {
        StudyPage(title: t.lv("Phương pháp học của Lexkite")) {
            Text(verbatim: t.lv("Mỗi tính năng dựa trên một nguyên lý đã được nghiên cứu về trí nhớ và thụ đắc ngôn ngữ – kèm số liệu thật của chính bạn để biết nên làm gì tiếp theo.")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            if let r = model.result { content(r) } else { WritingSkeleton(rows: 6) }
        }
        .task { if model.result == nil { await model.load() } }
        .accessibilityIdentifier("method")
    }

    @ViewBuilder private func content(_ r: StudyMethod.Result) -> some View {
        loop(r)
        memory(r)
        strands(r)
        plan
        Text(verbatim: t.lv("12 nguyên lý & cách Lexkite áp dụng")).studyText(LKType.headlineMd)
        ForEach(Array(model.content.method.list("principles").enumerated()), id: \.offset) { i, p in principle(i, p, r) }
        faq
    }

    // MARK: daily loop
    private func loop(_ r: StudyMethod.Result) -> some View {
        let steps = model.content.method.list("loop")
        return SkillCard {
            HStack {
                Text(verbatim: t.lv("Vòng lặp học mỗi ngày (~30 phút)")).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                StudyChip(text: t.lv("Hôm nay {done}/{total}", ["done": r.loopDone, "total": r.loop.count]))
            }
            ForEach(Array(r.loop.enumerated()), id: \.offset) { i, s in
                let meta = i < steps.count ? steps[i] : .null
                Button { go(s.href) } label: {
                    HStack(alignment: .top, spacing: 10) {
                        Text(verbatim: s.done ? "✓" : String(i + 1)).studyText(LKType.labelMetric, s.done ? LKColor.onSecondary : LKColor.onSecondary).frame(width: 28, height: 28)
                            .background(Circle().fill((s.done ? LKColor.success : LKColor.secondary).resolve(scheme)))
                        VStack(alignment: .leading, spacing: 1) {
                            Text(verbatim: t.lvj(meta["title"])).studyText(LKType.titlePill).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                            Text(verbatim: t.lv(s.sub.key, s.sub.vars)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                            Text(verbatim: t.lvj(meta["why"])).studyText(LKType.labelBadge, LKColor.secondary)
                        }
                        Spacer(minLength: 0)
                    }.frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                }.buttonStyle(.plain)
                .accessibilityValue(s.done ? t.lv("Đã xong") : "")
            }
        }
    }

    // MARK: memory curve
    private func memory(_ r: StudyMethod.Result) -> some View {
        let m = r.memory, d = model.days
        let pct = Vocab.round((m.any ? m.at(d) : StudyMethod.recall(d, 3)) * 100)
        return SkillCard {
            HStack {
                Text(verbatim: t.lv("Bộ nhớ từ vựng của bạn")).studyText(LKType.headlineSm)
                Spacer(minLength: 0)
                Button { go("#/settings") } label: { Text(verbatim: t.lv("Mục tiêu {pct}% →", ["pct": model.retention])).studyText(LKType.labelMetric, LKColor.secondary).frame(minHeight: LKFrame.shared.minTap) }.buttonStyle(.plain)
            }
            if m.any {
                HStack(alignment: .top) {
                    stat(String(m.remembered), t.lv("từ đang nhớ")); stat("\(Vocab.round(m.at(0) * 100))%", t.lv("khả năng nhớ trung bình")); stat(String(m.due), t.lv("đến hạn ôn")); stat(String(m.learning), t.lv("đang ở bước học"))
                }
            } else {
                Text(verbatim: t.lv("Bạn chưa có từ nào ở lịch ôn theo ngày. Dưới đây là đường cong của một từ mới học – hãy học vài từ để xem biểu đồ của chính bạn.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            }
            CurveView(memory: m, mark: d, keep: SRSParams.fsrs5.retentionTarget, label: t.lv("Đường cong quên lãng"))
            HStack(spacing: 14) {
                legend(LKColor.secondary, m.any ? t.lv("Từ của bạn nếu ngừng ôn") : t.lv("Ví dụ 1 từ mới học"))
                legend(LKColor.success, t.lv("Ôn đúng “thời điểm vàng” (FSRS)"))
            }
            Text(WritingText.rich(t.lv("Nếu ngừng ôn <b id=\"mDays\">7</b> ngày → còn nhớ khoảng <b id=\"mPct\"></b>")
                .replacingOccurrences(of: "<b id=\"mDays\">7</b>", with: "<b>\(Int(d))</b>").replacingOccurrences(of: "<b id=\"mPct\"></b>", with: "<b>\(pct)%</b>")
                + (m.any ? " " + t.lv("(≈{n}/{total} từ)", ["n": Vocab.round(m.at(d) * Double(m.remembered)), "total": m.remembered]) : "")))
                .studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
            Slider(value: Bindable(model).days, in: 0...60, step: 1).accessibilityLabel("\(Int(d))").tint(LKColor.secondary.resolve(scheme))
            FlowLayout(spacing: 6) {
                if r.dueNow > 0 { WritingChip(text: t.lv("Ôn {n} thẻ ngay", ["n": r.dueNow]), selected: true) { go("#/review") } } else { WritingChip(text: t.lv("Học từ mới"), selected: true) { go("#/library") } }
                if r.forgetting > 0 { WritingChip(text: t.lv("{n} từ sắp quên", ["n": r.forgetting])) { go("#/deck?from=forget") } }
            }
        }
    }
    private func stat(_ v: String, _ label: String) -> some View {
        VStack(spacing: 2) { Text(verbatim: v).studyText(LKType.headlineSm).environment(\.layoutDirection, .leftToRight); Text(verbatim: label).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).multilineTextAlignment(.center) }
            .frame(maxWidth: .infinity).accessibilityElement(children: .combine)
    }
    private func legend(_ c: LKDynamicColor, _ s: String) -> some View {
        HStack(spacing: 4) { Circle().fill(c.resolve(scheme)).frame(width: 10, height: 10).accessibilityHidden(true); Text(verbatim: s).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
    }

    // MARK: strands
    private func strands(_ r: StudyMethod.Result) -> some View {
        let meta: [String: (String, String, String)] = ["in": ("Đầu vào có nghĩa", "Đọc, nghe", "Nghe 1 phần"), "out": ("Đầu ra có nghĩa", "Nói, viết, tự đặt câu", "Luyện Speaking"), "lang": ("Tập trung ngôn ngữ", "Flashcard, ngữ pháp, phát âm", "Học ngữ pháp"), "flu": ("Luyện trôi chảy", "Ghép thẻ tính giờ, chép chính tả, thi thử", "Ghép thẻ tính giờ")]
        let href: [String: String] = ["in": r.hrefs.listening, "out": r.hrefs.speak, "lang": r.hrefs.grammar, "flu": "#/practice/match?src=deck"]
        let total = r.strands.reduce(0) { $0 + $1.pct }
        return SkillCard {
            HStack { Text(verbatim: t.lv("Cân bằng 4 mạch học")).studyText(LKType.headlineSm); Text(verbatim: t.lv("· 7 ngày qua")).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
            Text(verbatim: t.lv("Paul Nation (2007): một chương trình hiệu quả chia thời gian gần đều cho 4 mạch. Thiếu mạch nào thì tiến bộ chậm ở mạch đó.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            ForEach(r.strands, id: \.id) { s in
                let m = meta[s.id] ?? ("", "", "")
                VStack(alignment: .leading, spacing: 2) {
                    HStack { Text(verbatim: t.lv(m.0)).studyText(LKType.titlePill); Spacer(minLength: 0); Text(verbatim: "\(s.pct)%").studyText(LKType.labelMetric, LKColor.onSurfaceVariant).environment(\.layoutDirection, .leftToRight) }
                    SkillProgress(value: Double(s.pct) / 100)
                    Text(verbatim: t.lv(m.1)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
                }
                .accessibilityElement(children: .combine).accessibilityValue(s.weak ? t.lv("Mạch đang thiếu: <b>{name}</b>.", ["name": t.lv(m.0)]).strippingTags : "")
            }
            if let w = r.weakest, total > 0, let m = meta[w] {
                SkillNote(icon: "lightbulb.fill", text: t.lv("Mạch đang thiếu: <b>{name}</b>.", ["name": t.lv(m.0)]).strippingTags, tint: LKColor.tertiary)
                SkillAction(title: t.lv(m.2) + " →") { go(href[w] ?? "#/home") }
            } else {
                SkillNote(icon: "lightbulb.fill", text: t.lv("Bắt đầu học để xem bạn đang cân bằng thế nào giữa 4 mạch."))
            }
        }
    }

    // MARK: plan
    private var plan: some View {
        let p = model.content.method["plans"]?[model.stage] ?? .null, items = p.list("items")
        return SkillCard {
            Text(verbatim: t.lv("Lộ trình gợi ý: {name}", ["name": t.lv(p["name"]?["v"]?.s("name") ?? "")])).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
            if model.hasPlacement { StudyChip(text: t.lv("Band đầu vào {band}", ["band": model.band])) } else { SkillAction(title: t.lv("Kiểm tra trình độ để cá nhân hóa"), icon: "safari", primary: true) { go("#/placement") } }
            ForEach(Array(items.enumerated()), id: \.offset) { _, it in
                Button { go(it.s("href")) } label: {
                    HStack(spacing: 10) {
                        Text(verbatim: "\(it.i("min"))′").studyText(LKType.titlePill, LKColor.secondary).frame(width: 44, alignment: .leading).environment(\.layoutDirection, .leftToRight)
                        Text(verbatim: t.lvj(it["label"])).studyText(LKType.bodyMd).multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                    }.frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                }.buttonStyle(.plain)
            }
            Text(verbatim: t.lv("Tổng ~{n} phút/ngày. Đều đặn mỗi ngày hiệu quả hơn học dồn cuối tuần.", ["n": items.reduce(0) { $0 + $1.i("min") }])).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            SkillAction(title: t.lv("Xem Lộ trình chi tiết →")) { go("#/path") }
        }
    }

    // MARK: principles + FAQ
    private func principle(_ i: Int, _ p: JSON, _ r: StudyMethod.Result) -> some View {
        let stat = i < r.stats.count ? r.stats[i] : StudyMethod.Line(key: "")
        var how = t.lvj(p["how"]); how = how.replacingOccurrences(of: "{ic}", with: "")
        return SkillCard {
            Text(verbatim: t.lvj(p["title"])).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true).accessibilityAddTraits(.isHeader)
            Text(verbatim: t.lvj(p["who"])).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            Text(verbatim: t.lvj(p["idea"])).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
            Text(WritingText.rich(t.lv("Trong Lexkite:").appending(" " + how))).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
            StudyChip(text: t.lv(stat.key, stat.vars), icon: "chart.bar.fill")
            FlowLayout(spacing: 6) {
                ForEach(Array(p.list("links").enumerated()), id: \.offset) { k, l in
                    WritingChip(text: t.lvj(l["label"]) + " →", selected: k == 0) { go(model.resolve(l.s("href"))) }
                }
            }
        }
    }
    private var faq: some View {
        SkillCard {
            Text(verbatim: t.lv("Câu hỏi thường gặp")).studyText(LKType.headlineSm)
            ForEach(Array(model.content.method.list("faq").enumerated()), id: \.offset) { _, f in
                DisclosureGroup {
                    Text(verbatim: t.lvj(f["a"]).strippingTags).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true).padding(.top, 4)
                } label: { Text(verbatim: t.lvj(f["q"])).studyText(LKType.titlePill).multilineTextAlignment(.leading).frame(minHeight: LKFrame.shared.minTap, alignment: .leading) }
            }
        }
    }
}

/// The forgetting curve of the memory card (web `curveSvg`): the learner's average recall over 60 days, the "golden moment" review saw-tooth and a marker at the chosen day.
struct CurveView: View {
    let memory: StudyMethod.Memory, mark: Double, keep: Double, label: String
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let line = LKColor.outlineVariant.resolve(scheme), dim = LKColor.onSurfaceVariant.resolve(scheme)
        let curve = LKColor.secondary.resolve(scheme), saw = LKColor.success.resolve(scheme), pin = LKColor.tertiary.resolve(scheme)
        Canvas { c, size in
            let W = 560.0, H = 190.0, P = 34.0, days = 60.0, k = size.width / W
            func x(_ d: Double) -> Double { (P + d / days * (W - P - 10)) * k }
            func y(_ r: Double) -> Double { (12 + (1 - r) * (H - 40)) * k }
            let f: (Double) -> Double = memory.any ? { memory.at($0) } : { StudyMethod.recall($0, 3) }
            for r in [1.0, 0.8, 0.6, 0.4] {
                var g = Path(); g.move(to: CGPoint(x: P * k, y: y(r))); g.addLine(to: CGPoint(x: (W - 10) * k, y: y(r)))
                c.stroke(g, with: .color(line), lineWidth: 1)
                c.draw(Text(verbatim: "\(Int(r * 100))%").font(.system(size: max(9, 11 * k))).foregroundColor(dim), at: CGPoint(x: 2 * k, y: y(r)), anchor: .leading)
            }
            for d in [0.0, 7, 14, 30, 60] { c.draw(Text(verbatim: "\(Int(d))d").font(.system(size: max(9, 11 * k))).foregroundColor(dim), at: CGPoint(x: x(d), y: (H - 8) * k), anchor: .center) }
            var s = Path(); s.move(to: CGPoint(x: x(0), y: y(max(keep, f(0)))))
            var t0 = 0.0, S = 2.0
            while t0 < days {
                let ivl = max(1, StudyMethod.interval(S, keep)), t2 = min(days, t0 + ivl)
                var d = t0 + 1
                while d <= t2 { s.addLine(to: CGPoint(x: x(d), y: y(StudyMethod.recall(d - t0, S)))); d += 1 }
                s.addLine(to: CGPoint(x: x(t2), y: y(1))); t0 = t2; S *= 2.6
            }
            c.stroke(s, with: .color(saw.opacity(0.85)), style: StrokeStyle(lineWidth: 2 * k, dash: [4 * k, 3 * k]))
            var p = Path(); for d in 0...Int(days) { let pt = CGPoint(x: x(Double(d)), y: y(f(Double(d)))); if d == 0 { p.move(to: pt) } else { p.addLine(to: pt) } }
            c.stroke(p, with: .color(curve), lineWidth: 3 * k)
            var m = Path(); m.move(to: CGPoint(x: x(mark), y: 10 * k)); m.addLine(to: CGPoint(x: x(mark), y: (H - 26) * k))
            c.stroke(m, with: .color(pin), lineWidth: 2 * k)
            c.fill(Path(ellipseIn: CGRect(x: x(mark) - 5 * k, y: y(f(mark)) - 5 * k, width: 10 * k, height: 10 * k)), with: .color(pin))
        }
        .aspectRatio(560.0 / 190.0, contentMode: .fit)
        .accessibilityElement().accessibilityLabel(label)
    }
}
