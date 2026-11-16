import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKStrings

/// #/confidence (overview) · #/confidence/<unit>[#<phrase>] · #/confidence/toolkit[#<group>-<phrase>] · #/confidence/daily
struct ConfidenceView: View {
    let model: ConfidenceModel
    var onRoute: (AppRoute) -> Void = { _ in }
    var onRoleplay: ((JSON) -> Void)?
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    private func go(_ h: String) { if let r = AppRoute.parseHash(h) { onRoute(r) } }
    private var title: String {
        switch model.page {
        case .overview: return t.lv("Giao tiếp tự tin")
        case .unit(let id, _): return model.unit(id).map { t.lv($0.s("title")) } ?? t.lv("Giao tiếp tự tin")
        case .toolkit: return t.lv("Bộ công cụ tự tin")
        case .daily: return t.lv("Thử thách 2 phút hôm nay")
        }
    }
    private var backAction: (() -> Void)? { model.runStep != nil ? { model.leaveRun() } : nil }
    var body: some View {
        StudyPage(title: title, onBack: backAction) {
            switch model.page {
            case .overview: overview
            case .unit(let id, let ph): if let u = model.unit(id) { if model.runStep != nil { run(u) } else { unitPage(u, ph) } } else { overview }
            case .toolkit(let ph): toolkit(ph)
            case .daily: daily
            }
        }
        .task { await model.load() }
        .onDisappear { model.stopAll() }
        .accessibilityIdentifier("confidence")
    }

    // MARK: shared bits
    private func chip(_ s: String) -> some View { StudyChip(text: s, tint: LKColor.tertiary) }
    private func enSub(_ u: JSON) -> some View { Group { if t.lang != "en" { Text(verbatim: u.s("titleEn")).studyText(LKType.labelBadge, LKColor.onSurfaceVariant).englishText() } } }
    private func speakButton(_ text: String, slow: Bool = false, label: String? = nil) -> some View {
        Button { model.say(text, slow: slow) } label: {
            Image(systemName: slow ? "tortoise.fill" : "speaker.wave.2.fill").foregroundStyle(LKColor.secondary.resolve(scheme)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap)
        }.buttonStyle(.plain).accessibilityLabel(label ?? t.lv(slow ? "Nghe chậm" : "Nghe"))
    }
    private func micButton(_ id: String, _ label: String, action: @escaping () -> Void) -> some View {
        let on = model.listening == id
        return Button(action: action) {
            Image(systemName: on ? "stop.fill" : "mic.fill").font(.system(size: 20, weight: .bold)).foregroundStyle(LKColor.onPrimary.resolve(scheme))
                .frame(width: 64, height: LKFrame.shared.minTap + 8).background(Capsule().fill((on ? LKColor.error : LKColor.primary).resolve(scheme)))
        }.buttonStyle(.plain).accessibilityLabel(label)
    }
    @ViewBuilder private var micNote: some View { if let e = model.micError { SkillNote(icon: "mic.slash", text: SpeakErrors.message(e, t), tint: LKColor.error) } }
    private func phraseCard(_ p: JSON, highlighted: Bool = false, mic: Bool = false) -> some View {
        SkillCard {
            HStack(alignment: .center, spacing: 2) {
                Text(verbatim: p.s("say")).studyText(LKType.titlePill).englishText().fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                speakButton(p.s("say")); speakButton(p.s("say"), slow: true)
                if mic { micButton(p.s("id"), t.lv("Nói thử")) { Task { await model.tryPhrase(p.s("id"), target: p.s("say")) } } }
            }
            Text(verbatim: t.lv(p.s("mean"))).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            if let f = model.feedback[p.s("id")] { Text(verbatim: f).studyText(LKType.titlePill) }
            if !p.s("not").isEmpty {
                HStack(alignment: .firstTextBaseline, spacing: 6) { Text(verbatim: "✗").studyText(LKType.titlePill, LKColor.error); Text(verbatim: p.s("not")).studyText(LKType.bodyMd, LKColor.error).strikethrough().englishText() }
                HStack(alignment: .firstTextBaseline, spacing: 6) { Text(verbatim: "✓").studyText(LKType.titlePill, LKColor.success); Text(verbatim: p.s("say")).studyText(LKType.bodyMd).englishText() }
                Text(verbatim: "💡 " + t.lv(p.s("why"))).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
            }
        }
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(highlighted ? LKColor.secondary.resolve(scheme) : .clear, lineWidth: 3))
    }

    // MARK: overview
    @ViewBuilder private var overview: some View {
        Text(verbatim: t.lv("Mỗi bài là một tình huống thật, 5–8 phút: nghe, học cụm câu, nói theo, rồi tự tin nói chuyện. Sai cũng không sao – cứ nói!")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        SkillCard {
            HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                Text(verbatim: model.last.map { String($0.i("score")) } ?? "–").studyText(LKType.headlineLg, LKColor.secondary).environment(\.layoutDirection, .leftToRight)
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: t.lv("Điểm tự tin")).studyText(LKType.headlineSm)
                    Text(verbatim: model.last.map { t.lv("Lần gần nhất: {n}/100 · chuỗi {d} ngày", ["n": $0.i("score"), "d": model.streak]) } ?? t.lv("Nói 2 phút mỗi ngày để theo dõi độ lưu loát và sự tự tin của bạn.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                }
            }
            if model.daily.count >= 2 { SparkView(points: model.daily.suffix(14).map { $0.i("score") }, label: t.lv("Điểm tự tin {n} lần gần nhất", ["n": min(14, model.daily.count)])) }
            SkillAction(title: model.doneToday ? "✅ " + t.lv("Đã nói hôm nay – nói thêm?") : "⏱️ " + t.lv("Thử thách 2 phút hôm nay"), primary: true) { go("#/confidence/daily") }
            SkillAction(title: "🧰 " + t.lv("Bộ công cụ tự tin")) { go("#/confidence/toolkit") }
        }
        ForEach(Confidence.levels, id: \.self) { lv in
            let list = model.units.filter { $0.s("level") == lv }
            if !list.isEmpty {
                HStack { chip(lv); Text(verbatim: t.lv("{a}/{b} bài", ["a": list.filter { model.done[$0.s("id")] != nil }.count, "b": list.count])).studyText(LKType.titlePill) }
                ForEach(Array(list.enumerated()), id: \.offset) { _, u in unitCard(u) }
            }
        }
        SkillNote(icon: "lock.fill", text: t.lv("Âm thanh của bạn chỉ ở trên máy này: Lexkite không tải lên và không lưu bản ghi."))
    }
    private func unitCard(_ u: JSON) -> some View {
        let isNext = model.next?.s("id") == u.s("id"), done = model.done[u.s("id")] != nil
        return Button { go("#/confidence/" + u.s("id")) } label: {
            SkillCard {
                HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                    Text(verbatim: u.s("em")).font(.system(size: 28)).accessibilityHidden(true)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(verbatim: t.lv(u.s("title"))).studyText(LKType.titlePill).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                        enSub(u)
                        if isNext { StudyChip(text: t.lv("Bài tiếp theo"), tint: LKColor.success) }
                    }
                    Spacer(minLength: 0)
                    if done { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityLabel(t.lv("Đã xong")) }
                }
            }
        }.buttonStyle(.plain)
    }

    // MARK: unit page
    private let stepIcons = ["headphones", "puzzlepiece.fill", "repeat", "pencil", "face.smiling", "flag.fill"]
    private func stepNames() -> [String] { [t.lv("Nghe hội thoại mẫu"), t.lv("Cụm câu nên nói"), t.lv("Nói theo"), t.lv("Nói điền chỗ trống"), t.lv("Hội thoại ngắn"), t.lv("Tổng kết")] }
    @ViewBuilder private func unitPage(_ u: JSON, _ ph: String?) -> some View {
        HStack { Text(verbatim: u.s("em")).font(.system(size: 28)); chip(u.s("level")); enSub(u) }
        SkillCard {
            Text(verbatim: "🎯 " + t.lv("Sau bài này bạn có thể")).studyText(LKType.headlineSm)
            Text(verbatim: t.lv(u.s("goal"))).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
            ForEach(Array(stepNames().enumerated()), id: \.offset) { i, n in HStack(spacing: 8) { Image(systemName: stepIcons[i]).frame(width: 22).accessibilityHidden(true); Text(verbatim: n).studyText(LKType.bodySm) } }
            SkillAction(title: "▶ " + (model.done[u.s("id")] != nil ? t.lv("Học lại") : t.lv("Bắt đầu")) + " · ≈ " + t.lv("{m} phút", ["m": 7]), primary: true) { model.start(u) }
        }
        Text(verbatim: "🧩 " + t.lv("Cụm câu nên nói")).studyText(LKType.headlineSm)
        ForEach(Array(u.list("phrases").enumerated()), id: \.offset) { _, p in phraseCard(p, highlighted: p.s("id") == ph) }
    }

    // MARK: the 6 steps
    @ViewBuilder private func run(_ u: JSON) -> some View {
        let s = model.runStep ?? 0, names = stepNames()
        HStack(spacing: 4) { ForEach(0..<6, id: \.self) { k in Capsule().fill((k <= s ? LKColor.secondary : LKColor.outlineVariant).resolve(scheme)).frame(height: 6) } }
            .accessibilityElement().accessibilityLabel(t.lv("Bước {i}/{n}", ["i": s + 1, "n": 6]))
        Text(verbatim: "\(t.lv("Bước {i}/{n}", ["i": s + 1, "n": 6])) · \(names[s])").studyText(LKType.titlePill, LKColor.onSurfaceVariant)
        switch s {
        case 0: listenStep(u)
        case 1: SkillCard { Text(verbatim: t.lv("Đây là những câu người bản xứ hay nói. So sánh với cách nói kém tự nhiên hơn.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
            ForEach(Array(u.list("phrases").enumerated()), id: \.offset) { _, p in phraseCard(p) }
        case 2: shadowStep(u)
        case 3: gapStep(u)
        case 4: roleplayStep(u)
        default: recapStep(u)
        }
        if s < 5 {
            HStack(spacing: LKSpacing.spaceXs) {
                SkillAction(title: t.lv("Bỏ qua")) { Task { await model.advance(u, translate: { t.lv($0) }) } }
                SkillAction(title: t.lv("Tiếp tục") + " →", primary: true) { Task { await model.advance(u, translate: { t.lv($0) }) } }
            }
        }
    }
    private func listenStep(_ u: JSON) -> some View {
        let d = u["dialogue"] ?? .null, lines = d.list("lines")
        return SkillCard {
            Text(verbatim: t.lv("Nghe cả đoạn 1–2 lần. Lần đầu nghe chậm, chưa cần hiểu hết.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 4) { Text(verbatim: d.s("a")).fontWeight(.bold); Text(verbatim: "–"); Text(verbatim: d.s("aRole")).englishText() }.lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.onSurface.resolve(scheme))
            FlowLayout(spacing: 6) {
                WritingChip(text: t.lv("Nghe chậm"), system: "tortoise.fill") { model.playDialogue(u, slow: true) }
                WritingChip(text: t.lv("Tốc độ thường"), system: "play.fill") { model.playDialogue(u, slow: false) }
                WritingChip(text: t.lv("Dừng"), system: "stop.fill") { model.stopSay() }
            }
            ForEach(Array(lines.enumerated()), id: \.offset) { k, l in
                let a = l.array?.compactMap(\.string) ?? ["a", ""]
                HStack(alignment: .top, spacing: 8) {
                    Text(verbatim: a[0] == "a" ? d.s("a") : t.lv("Bạn")).studyText(LKType.labelMetric, LKColor.secondary).frame(width: 64, alignment: .leading)
                    Text(verbatim: a.count > 1 ? a[1] : "").studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    speakButton(a.count > 1 ? a[1] : "", label: t.lv("Nghe lại"))
                }
                .padding(.horizontal, 6).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(model.playing == k ? LKColor.surfaceContainer.resolve(scheme) : .clear))
                .accessibilityAddTraits(model.playing == k ? .isSelected : [])
            }
        }
    }
    @ViewBuilder private func shadowStep(_ u: JSON) -> some View {
        let ps = u.list("phrases"), k = min(model.shadowIndex, max(0, ps.count - 1))
        if k < ps.count {
            let p = ps[k], id = p.s("id"), mk = model.marks[id]
            SkillCard {
                Text(verbatim: t.lv("Nghe, rồi bấm micro và nói theo. Không cần hoàn hảo – nói to và rõ là được.") + " (\(k + 1)/\(ps.count))").studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                if let mk {
                    FlowLayout(spacing: 4) { ForEach(Array(mk.enumerated()), id: \.offset) { _, w in
                        Text(verbatim: w.word).lkTextSafe(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                            .padding(.horizontal, 4).background(RoundedRectangle(cornerRadius: 4).fill((w.heard == true ? LKColor.success : w.heard == false ? LKColor.error : LKColor.surfaceContainer).resolve(scheme).opacity(0.25)))
                            .underline(w.heard == false, pattern: .dot) } }
                } else { Text(verbatim: p.s("say")).studyText(LKType.headlineSm).englishText() }
                Text(verbatim: t.lv(p.s("mean"))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                HStack { speakButton(p.s("say")); speakButton(p.s("say"), slow: true); micButton(id, t.lv("Nói theo")) { Task { await model.shadowTry(p) } } }
                micNote
                if let sc = model.feedback["\(id)#score"] {
                    let n = Int(sc) ?? 0
                    Text(verbatim: "\(n)% · " + (n >= 85 ? "🌟 " + t.lv("Tuyệt! Nghe rất tự nhiên.") : n >= 60 ? "👍 " + t.lv("Tốt lắm! Thử thêm 1 lần để chắc hơn?") : "🌱 " + t.lv("Nghe lại bản chậm rồi nói từng cụm nhỏ nhé."))).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                    if let h = model.heardText[id], !h.isEmpty { Text(verbatim: t.lv("Máy nghe được:") + " “\(h)”").studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                }
                if let best = model.shadow[id] { StudyChip(text: t.lv("Tốt nhất: {n}%", ["n": best])) }
                HStack {
                    if k > 0 { SkillAction(title: "← " + t.lv("Câu trước")) { model.shadowMove(-1, count: ps.count) } }
                    if k < ps.count - 1 { SkillAction(title: t.lv("Câu sau") + " →") { model.shadowMove(1, count: ps.count) } }
                }
            }
        }
    }
    @State private var typedGap = ""
    @ViewBuilder private func gapStep(_ u: JSON) -> some View {
        let list = model.gapList(u)
        if model.gapIndex >= list.count {
            SkillCard { SkillNote(icon: "checkmark.circle.fill", text: t.lv("Xong {a}/{b} câu.", ["a": model.gapsRight, "b": list.count]), tint: LKColor.success) }
        } else {
            let p = list[model.gapIndex]
            SkillCard {
                Text(verbatim: t.lv("Nói cả câu, điền từ còn thiếu. Bí thì xem gợi ý.") + " (\(model.gapIndex + 1)/\(list.count))").studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                Text(verbatim: Confidence.blank(p.s("say"), gap: p.s("gap"))).studyText(LKType.headlineSm).englishText().fixedSize(horizontal: false, vertical: true)
                Text(verbatim: t.lv(p.s("mean"))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                HStack { micButton("gap", t.lv("Nói cả câu")) { Task { await model.gapMic(p) } }
                    TextField(t.lv("Hoặc gõ từ còn thiếu"), text: $typedGap).lkTextSafe(LKType.bodyMd).englishText().textInputAutocapitalization(.never).autocorrectionDisabled()
                        .padding(10).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
                        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2)) }
                micNote
                HStack { SkillAction(title: t.lv("Kiểm tra"), icon: "checkmark") { model.gapCheck(p, typed: typedGap) }; SkillAction(title: "💡 " + t.lv("Gợi ý")) { model.showHint() } }
                if model.hint { SkillNote(icon: "lightbulb.fill", text: String(p.s("gap").prefix(1)) + String(repeating: "_ ", count: max(0, p.s("gap").count - 1))) }
                if model.gapState == "ok" {
                    SkillNote(icon: "checkmark.circle.fill", text: p.s("say"), tint: LKColor.success)
                    SkillAction(title: t.lv("Câu sau") + " →", primary: true) { typedGap = ""; model.gapNext() }
                } else if model.gapState == "miss" {
                    SkillNote(icon: "leaf.fill", text: t.lv("Gần đúng rồi! Thử lại nhé.") + (model.heardText["gap"].map { $0.isEmpty ? "" : " " + t.lv("Máy nghe được:") + " “\($0)”" } ?? ""), tint: LKColor.tertiary)
                }
            }
        }
    }
    private func roleplayStep(_ u: JSON) -> some View {
        SkillCard {
            Text(verbatim: t.lv("Giờ hãy nói chuyện thật. Dùng các cụm câu vừa học. Bí thì bấm \"Giúp tôi nói\".")).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
            Text(verbatim: "🎯 " + (u["roleplay"]?.s("you") ?? "")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().fixedSize(horizontal: false, vertical: true)
            SkillAction(title: "▶ " + t.lv("Bắt đầu hội thoại"), primary: true) { onRoleplay?(u) }
        }
    }
    private func recapStep(_ u: JSON) -> some View {
        SkillCard {
            Text(verbatim: "🎉 " + t.lv("Bạn đã hoàn thành bài này!")).studyText(LKType.headlineMd)
            Text(verbatim: t.lv("Mỗi lần nói là một lần tự tin hơn.")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            HStack(alignment: .top) {
                stat(String(u.list("phrases").count), t.lv("Cụm câu")); stat(model.shadowAverage.map { "\($0)%" } ?? "–", t.lv("Nói theo")); stat("–", t.lv("Hội thoại"))
            }
            SkillNote(icon: "checkmark.circle", text: model.savedCards == nil ? t.lv("Đang lưu cụm câu vào thẻ ôn…") : (model.savedCards ?? 0) > 0 ? t.lv("Đã lưu {n} cụm câu vào thẻ ôn.", ["n": model.savedCards ?? 0]) : t.lv("Các cụm câu đã có trong thẻ ôn."))
            ForEach(Array(u.list("phrases").enumerated()), id: \.offset) { _, p in Text(verbatim: "• " + p.s("say") + " – " + t.lv(p.s("mean"))).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true) }
            if let nx = model.next { SkillAction(title: nx.s("em") + " " + t.lv("Bài tiếp theo") + ": " + t.lv(nx.s("title")), primary: true) { model.leaveRun(); go("#/confidence/" + nx.s("id")) } }
            SkillAction(title: "⏱️ " + t.lv("Thử thách 2 phút hôm nay")) { go("#/confidence/daily") }
            SkillAction(title: t.lv("Về lộ trình")) { model.leaveRun(); go("#/confidence") }
        }
    }
    private func stat(_ v: String, _ l: String) -> some View {
        VStack(spacing: 2) { Text(verbatim: v).studyText(LKType.headlineSm).environment(\.layoutDirection, .leftToRight); Text(verbatim: l).studyText(LKType.labelBadge, LKColor.onSurfaceVariant) }.frame(maxWidth: .infinity).accessibilityElement(children: .combine)
    }

    // MARK: toolkit
    @ViewBuilder private func toolkit(_ ph: String?) -> some View {
        Text(verbatim: t.lv("5 bộ câu giúp bạn không bị \"đứng hình\": nhờ nhắc lại, câu giờ, bắt chuyện, phản đối lịch sự và nói khi quên từ.")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        ForEach(Array(model.conf.list("toolkit").enumerated()), id: \.offset) { _, g in
            Text(verbatim: g.s("em") + " " + t.lv(g.s("title"))).studyText(LKType.headlineSm)
            Text(verbatim: t.lv(g.s("intro"))).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            ForEach(Array(g.list("phrases").enumerated()), id: \.offset) { _, p in
                phraseCardKit(p, group: g.s("id"), highlighted: ph == g.s("id") + "-" + p.s("id"))
            }
            micNote
        }
    }
    private func phraseCardKit(_ p: JSON, group: String, highlighted: Bool) -> some View {
        let id = group + "-" + p.s("id")
        return SkillCard {
            HStack(spacing: 2) {
                Text(verbatim: p.s("say")).studyText(LKType.titlePill).englishText().fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                speakButton(p.s("say"))
                micButton(id, t.lv("Nói thử")) { Task { await model.tryPhrase(id, target: p.s("say")) } }
            }
            Text(verbatim: t.lv(p.s("mean"))).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            if let f = model.feedback[id] { Text(verbatim: f).studyText(LKType.titlePill) }
        }
        .overlay(RoundedRectangle(cornerRadius: 20, style: .continuous).strokeBorder(highlighted ? LKColor.secondary.resolve(scheme) : .clear, lineWidth: 3))
    }

    // MARK: daily challenge
    @ViewBuilder private var daily: some View {
        Text(verbatim: t.lv("Nói liên tục tối đa 2 phút về đề bên dưới. Không ai chấm lỗi – mục tiêu là nói trôi chảy và dám nói.")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        let q = model.question
        SkillCard {
            Text(verbatim: q.s("q")).studyText(LKType.headlineSm).englishText().fixedSize(horizontal: false, vertical: true)
            HStack(alignment: .top, spacing: 4) {
                Text(verbatim: "💡 " + q.s("tip")).studyText(LKType.bodySm).englishText().fixedSize(horizontal: false, vertical: true)
                Spacer(minLength: 0)
                speakButton(q.s("q"), label: t.lv("Nghe đề"))
            }
            Text(verbatim: String(format: "%d:%02d", model.secsLeft / 60, model.secsLeft % 60)).font(.system(size: 44, weight: .heavy).monospacedDigit()).foregroundStyle(LKColor.onSurface.resolve(scheme)).frame(maxWidth: .infinity)
                .accessibilityLabel("\(model.secsLeft)s")
            HStack { Spacer(minLength: 0); micButtonDaily; Spacer(minLength: 0) }
            micNote
            if !model.live.isEmpty { Text(verbatim: model.live).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().frame(maxWidth: .infinity) }
            SkillNote(icon: "lock.fill", text: t.lv("Âm thanh của bạn chỉ ở trên máy này: Lexkite không tải lên và không lưu bản ghi."))
        }
        if let m = model.metrics { resultCard(m) }
    }
    private var micButtonDaily: some View {
        Button { model.toggleRecording() } label: {
            Image(systemName: model.recording ? "stop.fill" : "mic.fill").font(.system(size: 26, weight: .bold)).foregroundStyle(LKColor.onPrimary.resolve(scheme))
                .frame(width: 88, height: 60).background(Capsule().fill((model.recording ? LKColor.error : LKColor.primary).resolve(scheme)))
        }.buttonStyle(.plain).accessibilityLabel(model.recording ? t.lv("Dừng") : t.lv("Bắt đầu nói"))
    }
    private func resultCard(_ m: ConfidenceModel.Metrics) -> some View {
        SkillCard {
            Text(verbatim: "📊 " + t.lv("Kết quả của bạn")).studyText(LKType.headlineSm)
            HStack(alignment: .top) {
                stat("\(m.secs)s", t.lv("Thời gian nói")); stat(m.wpm > 0 ? String(m.wpm) : "–", t.lv("Từ/phút")); stat(String(m.pauses), t.lv("Lần ngập ngừng")); stat(String(m.fillers), t.lv("Từ đệm")); stat(String(m.used.count), t.lv("Cụm câu đã học"))
            }
            if !m.used.isEmpty { Text(verbatim: "✨ " + t.lv("Bạn đã dùng:") + " " + m.used.joined(separator: " · ")).studyText(LKType.bodySm).englishText().fixedSize(horizontal: false, vertical: true) }
            else { Text(verbatim: t.lv("Lần sau thử dùng 1–2 cụm câu từ bài học hoặc bộ công cụ nhé.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
            if !model.transcript.isEmpty { DisclosureGroup(t.lv("Xem chữ máy nghe được")) { Text(verbatim: model.transcript).studyText(LKType.bodySm).englishText().padding(.top, 4) } }
            Text(verbatim: t.lv("Bạn cảm thấy tự tin đến mức nào?")).studyText(LKType.titlePill)
            HStack(spacing: 6) {
                ForEach(Array(["😟", "😕", "🙂", "😊", "🤩"].enumerated()), id: \.offset) { k, e in
                    Button { Task { await model.rate(k + 1) } } label: {
                        Text(verbatim: e).font(.system(size: 28)).frame(maxWidth: .infinity, minHeight: 52)
                            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill((model.rating == k + 1 ? LKColor.surfaceContainer : LKColor.surfaceContainerHighest).resolve(scheme)))
                            .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder((model.rating == k + 1 ? LKColor.secondary : LKColor.outlineVariant).resolve(scheme), lineWidth: 2))
                    }.buttonStyle(.plain).accessibilityLabel(t.lv("{n} trên 5", ["n": k + 1])).accessibilityAddTraits(model.rating == k + 1 ? .isSelected : [])
                }
            }
            if let sc = model.dailyScore {
                Text(verbatim: t.lv("Điểm tự tin hôm nay: {n}/100", ["n": sc])).studyText(LKType.headlineSm)
                Text(verbatim: model.newRecord ? "🏆 " + t.lv("Kỷ lục mới! Bạn đang tiến bộ thật sự.") : model.streak >= 3 ? "🔥 " + t.lv("{n} ngày liên tiếp – giữ nhịp nhé!", ["n": model.streak]) : t.lv("Nói mỗi ngày để điểm tăng dần.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                if model.daily.count >= 2 { SparkView(points: model.daily.suffix(14).map { $0.i("score") }, label: t.lv("Điểm tự tin {n} lần gần nhất", ["n": min(14, model.daily.count)])) }
                SkillAction(title: t.lv("Về lộ trình"), primary: true) { go("#/confidence") }
                SkillAction(title: "🧰 " + t.lv("Bộ công cụ tự tin")) { go("#/confidence/toolkit") }
            }
        }
    }
}

/// The score line of the overview and the daily result (web `spark`): the last 14 scores
struct SparkView: View {
    let points: [Int]
    let label: String
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let c = LKColor.secondary.resolve(scheme)
        Canvas { ctx, size in
            guard points.count >= 2 else { return }
            func x(_ i: Int) -> CGFloat { CGFloat(i) / CGFloat(points.count - 1) * (size.width - 8) + 4 }
            func y(_ v: Int) -> CGFloat { size.height - 4 - CGFloat(v) / 100 * (size.height - 8) }
            var p = Path()
            for (i, v) in points.enumerated() { let pt = CGPoint(x: x(i), y: y(v)); if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) } }
            ctx.stroke(p, with: .color(c), style: StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))
            for (i, v) in points.enumerated() { ctx.fill(Path(ellipseIn: CGRect(x: x(i) - 3.5, y: y(v) - 3.5, width: 7, height: 7)), with: .color(c)) }
        }
        .frame(height: 56).frame(maxWidth: 320)
        .accessibilityElement().accessibilityLabel(label).accessibilityValue(points.map(String.init).joined(separator: ", "))
    }
}
