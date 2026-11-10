import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKStrings

/// The lesson blocks of #/grammar (web grammar.js `R`): timeline · formula · uses · signals · table · tip · mistake · ielts · diagram · scale · sort.
/// Colours are the Kit tokens; formula pieces also carry their role as text-weight-independent position (the legend names every colour), never colour alone.
struct GrammarBlockView: View {
    let block: JSON
    var speak: (String) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        switch block.s("type") {
        case "timeline": timeline
        case "formula": formula
        case "uses": uses
        case "signals": signals
        case "table": table
        case "tip": SkillCard { SkillNote(icon: "lightbulb.fill", text: block.s("text")) }
        case "mistake": mistake
        case "ielts": ielts
        case "diagram": diagram
        case "scale": scale
        case "sort": sort
        default: EmptyView()
        }
    }

    // MARK: pieces
    static func tone(_ c: String) -> LKDynamicColor {
        switch c { case "subj": return LKColor.primary; case "verb": return LKColor.success; case "aux": return LKColor.tertiary; case "obj": return LKColor.secondary; case "neg": return LKColor.error; default: return LKColor.onSurfaceVariant }
    }
    /// "…[[target]]…" → bold + marker on the target structure
    func hl(_ s: String) -> AttributedString {
        var out = AttributedString(), rest = Substring(s)
        while let a = rest.range(of: "[["), let b = rest.range(of: "]]", range: a.upperBound..<rest.endIndex) {
            out += AttributedString(String(rest[rest.startIndex..<a.lowerBound]))
            var m = AttributedString(String(rest[a.upperBound..<b.lowerBound]))
            m.inlinePresentationIntent = .stronglyEmphasized
            m.backgroundColor = LKColor.secondary.resolve(scheme).opacity(0.18)
            out += m; rest = rest[b.upperBound...]
        }
        return out + AttributedString(String(rest))
    }
    private func sayLine(_ s: String, plain: String, prefix: String = "") -> some View {
        HStack(alignment: .top, spacing: 4) {
            Text(AttributedString(prefix) + hl(s)).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText().fixedSize(horizontal: false, vertical: true)
            Spacer(minLength: 0)
            Button { speak(plain) } label: { Image(systemName: "speaker.wave.2.fill").foregroundStyle(LKColor.secondary.resolve(scheme)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap) }
                .buttonStyle(.plain).accessibilityLabel(t(.vocabPronounce))
        }
    }
    private func chip(_ text: String, _ c: String = "") -> some View {
        Text(verbatim: text).lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
            .padding(.horizontal, 10).padding(.vertical, 6)
            .background(Capsule().fill(Self.tone(c).resolve(scheme).opacity(0.18)))
            .overlay(Capsule().strokeBorder(Self.tone(c).resolve(scheme), lineWidth: 1.5))
    }

    // MARK: blocks
    private var formula: some View {
        SkillCard {
            Text(verbatim: "🧮 " + t.lv("Công thức")).studyText(LKType.headlineSm)
            ForEach(Array(block.list("rows").enumerated()), id: \.offset) { _, r in
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: r.s("label")).studyText(LKType.titlePill)
                    FlowLayout(spacing: 4) {
                        ForEach(Array(r.list("parts").enumerated()), id: \.offset) { k, p in
                            if k > 0 { Text(verbatim: "+").studyText(LKType.labelMetric, LKColor.onSurfaceVariant) }
                            chip(p.s("t"), p.s("c"))
                        }
                    }
                    if !r.s("ex").isEmpty { sayLine(r.s("ex"), plain: GrammarCore.plain(r.s("ex")), prefix: "➜ ") }
                }
            }
            FlowLayout(spacing: 4) {
                chip(t.lv("Chủ ngữ"), "subj"); chip(t.lv("Trợ động từ"), "aux"); chip(t.lv("Động từ"), "verb"); chip(t.lv("Phủ định"), "neg"); chip(t.lv("Tân ngữ"), "obj"); chip(t.lv("Thời gian"), "time")
            }
        }
    }
    private var uses: some View {
        SkillCard {
            Text(verbatim: "🎯 " + t.lv("Khi nào dùng?")).studyText(LKType.headlineSm)
            ForEach(Array(block.list("items").enumerated()), id: \.offset) { i, u in
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: String(i + 1)).studyText(LKType.labelMetric, LKColor.onSecondary).frame(width: 26, height: 26).background(Circle().fill(LKColor.secondary.resolve(scheme)))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(verbatim: u.s("title")).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
                        sayLine(u.s("ex"), plain: GrammarCore.plain(u.s("ex")))
                        Text(verbatim: u.s("vi")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }
    private var signals: some View {
        SkillCard {
            Text(verbatim: "🚦 " + t.lv("Dấu hiệu nhận biết")).studyText(LKType.headlineSm)
            FlowLayout(spacing: 6) { ForEach(block.strs("words"), id: \.self) { StudyChip(text: $0) } }
        }
    }
    private var table: some View {
        let head = block.strs("head"), rows = block.list("rows").map { $0.array?.compactMap(\.string) ?? [] }
        return SkillCard {
            ScrollView(.horizontal, showsIndicators: false) {
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top, spacing: 12) { ForEach(Array(head.enumerated()), id: \.offset) { _, h in Text(verbatim: h).studyText(LKType.labelMetric, LKColor.onSurfaceVariant).frame(width: 150, alignment: .leading) } }
                    ForEach(Array(rows.enumerated()), id: \.offset) { _, r in
                        HStack(alignment: .top, spacing: 12) { ForEach(Array(r.enumerated()), id: \.offset) { _, c in Text(verbatim: c).studyText(LKType.bodySm).frame(width: 150, alignment: .leading).fixedSize(horizontal: false, vertical: true) } }
                        Divider()
                    }
                }
            }
            .accessibilityElement(children: .combine)
        }
    }
    private var mistake: some View {
        SkillCard {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(verbatim: "✗").studyText(LKType.titlePill, LKColor.error).accessibilityLabel(t.lv("Sai"))
                Text(verbatim: block.s("wrong")).studyText(LKType.bodyMd, LKColor.error).strikethrough().englishText()
            }
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(verbatim: "✓").studyText(LKType.titlePill, LKColor.success).accessibilityLabel(t.lv("Đúng"))
                sayLine("[[" + block.s("right") + "]]", plain: block.s("right"))
            }
            Text(verbatim: block.s("why")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        }
    }
    private var ielts: some View {
        SkillCard {
            Text(verbatim: "🎓 " + t.lv("Trong IELTS:")).studyText(LKType.titlePill)
            Text(verbatim: block.s("text")).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
            if !block.s("ex").isEmpty { sayLine(block.s("ex"), plain: GrammarCore.plain(block.s("ex")), prefix: "“") }
        }
    }
    private var diagram: some View {
        SkillCard {
            FlowLayout(spacing: 6) {
                ForEach(Array(block.list("steps").enumerated()), id: \.offset) { k, s in
                    if k > 0 { Image(systemName: "arrow.right").foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true) }
                    Text(verbatim: s.s("t")).lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                        .padding(.horizontal, 10).padding(.vertical, 8).background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(Self.flowTone(s.s("c")).resolve(scheme).opacity(0.2)))
                }
            }
            if !block.s("caption").isEmpty { Text(verbatim: block.s("caption")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
        }
    }
    static func flowTone(_ c: String) -> LKDynamicColor { ["active": LKColor.primary, "passive": LKColor.success, "result": LKColor.success, "if": LKColor.tertiary][c] ?? LKColor.onSurfaceVariant }
    private var scale: some View {
        let items = Vocab.stableSorted(block.list("items")) { $0.i("v") > $1.i("v") }
        return SkillCard {
            ForEach(Array(items.enumerated()), id: \.offset) { _, i in
                HStack(spacing: 8) {
                    Text(verbatim: i.s("t")).studyText(LKType.labelMetric).frame(width: 96, alignment: .leading).englishText()
                    GeometryReader { g in
                        ZStack(alignment: .leading) {
                            Capsule().fill(LKColor.outlineVariant.resolve(scheme))
                            Capsule().fill((i.i("v") >= 66 ? LKColor.success : i.i("v") >= 33 ? LKColor.tertiary : LKColor.error).resolve(scheme)).frame(width: g.size.width * CGFloat(min(100, i.i("v"))) / 100)
                        }
                    }.frame(height: 10).accessibilityHidden(true)
                    Text(verbatim: "\(i.i("v"))%").studyText(LKType.bodySm, LKColor.onSurfaceVariant).frame(width: 40, alignment: .trailing).environment(\.layoutDirection, .leftToRight)
                }
                .accessibilityElement(children: .combine)
            }
            if !block.s("caption").isEmpty { Text(verbatim: block.s("caption")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
        }
    }
    private var sort: some View {
        SkillCard {
            ForEach(Array(block.list("groups").enumerated()), id: \.offset) { _, g in
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: (g.s("emoji").isEmpty ? "" : g.s("emoji") + " ") + g.s("title")).studyText(LKType.titlePill)
                    FlowLayout(spacing: 6) { ForEach(g.strs("items"), id: \.self) { StudyChip(text: $0) } }
                }
            }
            if !block.s("caption").isEmpty { Text(verbatim: block.s("caption")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
        }
    }

    // MARK: timeline (SVG of the web, drawn on a Canvas: 720 × 110 units)
    private var timeline: some View {
        let marks = block.list("marks")
        let line = LKColor.outlineVariant.resolve(scheme), ink = LKColor.onSurface.resolve(scheme), dim = LKColor.onSurfaceVariant.resolve(scheme)
        return SkillCard {
            Canvas { c, size in
                let k = size.width / 720
                func X(_ v: Double) -> CGFloat { CGFloat(40 + v * 6.4) * k }
                func pt(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x, y: y * k) }
                func label(_ s: String, _ x: CGFloat, _ y: CGFloat, _ color: Color, anchor: UnitPoint = .center) {
                    c.draw(Text(verbatim: s).font(.system(size: max(10, 11 * k), weight: .semibold)).foregroundColor(color), at: pt(x, y), anchor: anchor)
                }
                var axis = Path(); axis.move(to: pt(30 * k, 60)); axis.addLine(to: pt(700 * k, 60))
                c.stroke(axis, with: .color(line), style: StrokeStyle(lineWidth: 4 * k, lineCap: .round))
                label(t.lv("QUÁ KHỨ"), 40 * k, 104, dim, anchor: .leading); label(t.lv("TƯƠNG LAI"), 680 * k, 104, dim, anchor: .trailing)
                for m in marks {
                    switch m.s("kind") {
                    case "now":
                        var p = Path(); p.move(to: pt(X(50), 22)); p.addLine(to: pt(X(50), 98))
                        c.stroke(p, with: .color(LKColor.error.resolve(scheme)), style: StrokeStyle(lineWidth: 2 * k, dash: [4 * k, 3 * k]))
                        label("NOW", X(50), 12, LKColor.error.resolve(scheme))
                    case "point":
                        let r = 9 * k, x = X(m.d("at") ?? 0)
                        c.fill(Path(ellipseIn: CGRect(x: x - r, y: (60 - 9) * k, width: 2 * r, height: 2 * r)), with: .color(LKColor.secondary.resolve(scheme)))
                        label(m.s("label"), x, 90, ink)
                    case "range":
                        let a = X(m.d("from") ?? 0), b = X(m.d("to") ?? 0)
                        c.fill(Path(roundedRect: CGRect(x: a, y: 50 * k, width: b - a, height: 20 * k), cornerRadius: 10 * k), with: .color(LKColor.secondary.resolve(scheme).opacity(0.75)))
                        label(m.s("label"), (a + b) / 2, 90, ink)
                    case "arrow":
                        let a = X(m.d("from") ?? 0), b = X(m.d("to") ?? 0)
                        var p = Path(); p.move(to: pt(a, 60)); p.addLine(to: pt(b - 8 * k, 60))
                        c.stroke(p, with: .color(LKColor.primary.resolve(scheme)), style: StrokeStyle(lineWidth: 5 * k, lineCap: .round))
                        var h = Path(); h.move(to: pt(b, 60)); h.addLine(to: pt(b - 12 * k, 52)); h.addLine(to: pt(b - 12 * k, 68)); h.closeSubpath()
                        c.fill(h, with: .color(LKColor.primary.resolve(scheme)))
                        label(m.s("label"), (a + b) / 2, 44, ink)
                    case "repeat":
                        let from = m.d("from") ?? 0, to = m.d("to") ?? 0
                        for i in 0..<6 { let x = X(from + (to - from) * Double(i) / 5), r = 6 * k; c.fill(Path(ellipseIn: CGRect(x: x - r, y: 60 * k - r, width: 2 * r, height: 2 * r)), with: .color(LKColor.tertiary.resolve(scheme))) }
                        label(m.s("label"), (X(from) + X(to)) / 2, 90, ink)
                    default: break
                    }
                }
            }
            .aspectRatio(720.0 / 110.0, contentMode: .fit)
            .accessibilityElement().accessibilityLabel(block.s("caption").isEmpty ? t.lv("Dòng thời gian") : block.s("caption"))
            if !block.s("caption").isEmpty { Text(verbatim: block.s("caption")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
        }
    }
}

/// One drill (verb / form / fill / rewrite / combine / error / own): the question, an input or the parts to tap, then ✓ / ✗ with the answer.
struct DrillView: View {
    let drill: JSON
    let state: DrillState
    let setInput: (String) -> Void
    let check: (Int?) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    private var kind: String {
        switch drill.s("t") {
        case "verb": return "🔤 " + t.lv("Chia động từ"); case "form": return "🧬 " + t.lv("Dạng đúng của từ"); case "rewrite": return "🔁 " + t.lv("Viết lại câu")
        case "combine": return "🔗 " + t.lv("Nối câu"); case "error": return "🕵️ " + t.lv("Tìm lỗi sai"); case "own": return "💬 " + t.lv("Tự đặt câu"); default: return "✏️ " + t.lv("Điền từ")
        }
    }
    private var locked: Bool { state.outcome != nil }
    private var outline: LKDynamicColor {
        switch state.outcome { case .graded(true, _, _, _)?: return LKColor.success; case .graded?: return LKColor.error; default: return LKColor.outlineVariant }
    }
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            StudyChip(text: kind)
            if drill.s("t") == "error" { errorBody } else { inputBody }
            feedback
        }
        .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
        .accessibilityElement(children: .contain)
    }
    private var errorBody: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(verbatim: t.lv("Bấm vào phần sai.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            FlowLayout(spacing: 6) {
                ForEach(Array(drill.strs("parts").enumerated()), id: \.offset) { j, p in
                    let right = locked && j == drill.i("w"), wrong = locked && j == state.picked && j != drill.i("w")
                    Button { check(j) } label: {
                        Text(verbatim: p + " " + String(UnicodeScalar(UInt8(65 + min(j, 25))))).lkTextSafe(LKType.bodyMd).underline().englishText()
                            .foregroundStyle((right ? LKColor.success : wrong ? LKColor.error : LKColor.onSurface).resolve(scheme))
                            .padding(.horizontal, 8).frame(minHeight: LKFrame.shared.minTap)
                            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder((right ? LKColor.success : wrong ? LKColor.error : LKColor.outlineVariant).resolve(scheme), lineWidth: 2))
                    }
                    .buttonStyle(.plain).disabled(locked)
                }
            }
        }
    }
    @ViewBuilder private var inputBody: some View {
        let long = ["rewrite", "combine", "own"].contains(drill.s("t"))
        EnglishText(text: drill.s("q") + (drill.s("hint").isEmpty || drill.s("t") == "own" ? "" : " (" + drill.s("hint") + ")"))
        if drill.s("t") == "own" && !drill.s("hint").isEmpty { Text(verbatim: t.lv("Gợi ý") + ": " + drill.s("hint")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
        let bind = Binding(get: { state.input }, set: { setInput($0) })
        Group {
            if long { TextField(t.lv("Viết câu của bạn…"), text: bind, axis: .vertical).lineLimit(2...4) } else { TextField("", text: bind).accessibilityLabel(t.lv("Điền từ")) }
        }
        .lkTextSafe(LKType.bodyMd).englishText().textInputAutocapitalization(.never).autocorrectionDisabled().disabled(locked).submitLabel(.done).onSubmit { check(nil) }
        .padding(10).background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
        .overlay(RoundedRectangle(cornerRadius: 12, style: .continuous).strokeBorder(outline.resolve(scheme), lineWidth: 2))
        if !locked { SkillAction(title: t.lv("Kiểm tra"), icon: "checkmark") { check(nil) } }
        if state.note { SkillNote(icon: "exclamationmark.circle", text: t.lv("Hãy viết một câu hoàn chỉnh (ít nhất 4 từ).")) }
    }
    @ViewBuilder private var feedback: some View {
        if case .graded(let ok, _, let answer, let typo)? = state.outcome {
            if ok {
                SkillNote(icon: "checkmark.circle.fill", text: typo != nil ? t.lv("Gần đúng – sửa chính tả: ") + (typo ?? []).map(\.w).joined(separator: " ") : t.lv("Chính xác!"), tint: LKColor.success)
            } else {
                SkillNote(icon: "xmark.circle.fill", text: t.lv("Đáp án: <b>{a}</b>", ["a": answer]).replacingOccurrences(of: "<b>", with: "").replacingOccurrences(of: "</b>", with: ""), tint: LKColor.error)
            }
            if !drill.s("ex").isEmpty { Text(verbatim: drill.s("ex")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
        }
    }
}
