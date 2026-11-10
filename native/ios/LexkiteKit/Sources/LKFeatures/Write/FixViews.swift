import SwiftUI
import Observation
import UIKit
import LKDesign
import LKStore
import LKSync
import LKStrings

/// #/fix – "Sửa ngữ pháp": paste or type English, the offline rule engine (`FixEngine` = web `LK_WRITE.check`) marks mistakes by type, one tap applies a fix.
/// The draft lives per device (web Store `fixDraft`); ignored issues and the type filter last for the session (web sessionStorage).
@MainActor @Observable
final class FixModel {
    enum Notice: Equatable { case ignored, fixed(Int), copied }
    static let draftKey = "lk.fixDraft"
    private static var ignoredSession = Set<String>()
    private static var offSession = Set<String>()
    let engine: FixEngine?
    private let defaults: UserDefaults
    private let live: Bool
    private var suppress = false
    private var checkTask: Task<Void, Never>?
    private var saveTask: Task<Void, Never>?
    var text = "" { didSet { if text != oldValue && !suppress { textChanged() } } }
    private(set) var issues: [FixIssue] = []
    private(set) var sel: Int?
    private(set) var undo: [String] = []
    private(set) var notice: Notice?
    private(set) var off: Set<String> = FixModel.offSession

    init(engine: FixEngine? = LearnContent.shared.fix, defaults: UserDefaults = .standard, live: Bool = true) {
        self.engine = engine; self.defaults = defaults; self.live = live
        if live {
            suppress = true
            text = Vocab.prefix(EssayStore.read(Self.draftKey, defaults)?.string ?? "", engine?.maxLen ?? 20000)
            suppress = false
            recheck()
        }
    }
    /// fixed state for snapshots
    static func fixture(text: String, selected: Int? = nil, off: Set<String> = []) -> FixModel {
        let m = FixModel(live: false)
        m.suppress = true; m.text = text; m.suppress = false
        m.off = off; m.recheck(); m.sel = selected
        return m
    }

    var visible: [FixIssue] { issues.filter { !off.contains($0.type) } }
    var safeCount: Int { visible.filter(\.safe).count }
    var words: Int { Essay.words(text) }
    var types: [(String, String)] { engine?.types ?? [] }
    func count(_ type: String) -> Int { issues.filter { $0.type == type }.count }
    var selected: FixIssue? { sel.flatMap { $0 < issues.count ? issues[$0] : nil }.flatMap { off.contains($0.type) ? nil : $0 } }
    var fixedText: String { FixEngine.fixed(text, visible) }

    private func textChanged() {
        checkTask?.cancel()
        checkTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 280_000_000)
            guard !Task.isCancelled else { return }
            self?.recheck()
        }
        guard live else { return }
        saveTask?.cancel()
        let at = text
        saveTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 500_000_000)
            guard !Task.isCancelled else { return }
            self?.saveDraft(at)
        }
    }
    private func saveDraft(_ t: String) { if live { EssayStore.write(Self.draftKey, .string(Vocab.prefix(t, engine?.maxLen ?? 20000)), defaults) } }
    func flush() { saveTask?.cancel(); saveDraft(text) }

    /// re-run the rules; the selection follows the same rule at the same place
    func recheck() {
        let prev = selected
        issues = (engine?.check(text) ?? []).filter { !Self.ignoredSession.contains(FixEngine.key($0, text)) }
        sel = prev.flatMap { p in issues.firstIndex { $0.rule == p.rule && $0.s == p.s } }
    }
    func toggle(_ type: String) {
        if off.contains(type) { off.remove(type) } else { off.insert(type) }
        Self.offSession = off
    }
    func pick(_ i: Int?) { sel = i; notice = nil }
    func step(_ d: Int) {
        let v = visible
        guard let s = selected, let p = v.firstIndex(of: s), p + d >= 0, p + d < v.count, let i = issues.firstIndex(of: v[p + d]) else { return }
        pick(i)
    }
    func apply(_ list: [(FixIssue, String)], selectNext: Bool) {
        guard !list.isEmpty else { return }
        undo.append(text); if undo.count > 30 { undo.removeFirst() }
        let at = list.map { $0.0.s }.min() ?? 0
        suppress = true; text = FixEngine.apply(text, list); suppress = false
        sel = nil; saveTask?.cancel(); saveDraft(text); recheck()
        if selectNext, let nx = visible.first(where: { $0.s >= at }), let i = issues.firstIndex(of: nx) { sel = i }
        notice = list.count > 1 ? .fixed(list.count) : .fixed(1)
    }
    func applyAll() { apply(visible.filter(\.safe).map { ($0, $0.reps[0]) }, selectNext: false) }
    func ignore() {
        guard let x = selected else { return }
        Self.ignoredSession.insert(FixEngine.key(x, text)); sel = nil; recheck(); notice = .ignored
    }
    func undoLast() {
        guard let p = undo.popLast() else { return }
        suppress = true; text = p; suppress = false
        sel = nil; saveDraft(text); recheck()
    }
    func loadSample() {
        if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { undo.append(text) }
        suppress = true; text = engine?.sample ?? ""; suppress = false
        sel = nil; saveDraft(text); recheck()
    }
    func clear() {
        guard !text.isEmpty else { return }
        undo.append(text)
        suppress = true; text = ""; suppress = false
        sel = nil; saveDraft(text); recheck()
    }
    func copy() { UIPasteboard.general.string = fixedText; notice = .copied }
}

struct FixView: View {
    let model: FixModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @FocusState private var editing: Bool

    private func tone(_ type: String) -> LKDynamicColor {
        switch type { case "spelling": return LKColor.error; case "grammar": return LKColor.tertiary; case "punct": return LKColor.success; default: return LKColor.primary }
    }
    private func pattern(_ type: String) -> Text.LineStyle.Pattern {
        switch type { case "spelling": return .dot; case "grammar": return .solid; case "punct": return .dashDot; default: return .dash }
    }
    private func typeName(_ k: String) -> String { t.lv(model.types.first { $0.0 == k }?.1 ?? k) }

    var body: some View {
        StudyPage(title: t.lv("Sửa ngữ pháp")) {
            if model.engine == nil {
                SkillCard { StudyEmpty(icon: "exclamationmark.triangle", title: t.lv("Không tải được bộ soát lỗi – thử tải lại trang.")) }
            } else { page }
        }
        .onDisappear { model.flush() }
        .accessibilityIdentifier("fix")
    }

    @ViewBuilder private var page: some View {
        Text(t.lv("Dán hoặc gõ đoạn văn tiếng Anh – lỗi được gạch chân ngay. Bộ soát chạy hoàn toàn trên máy bạn, không gửi chữ đi đâu.")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        editorCard
        summaryCard
        if !model.issues.isEmpty || !model.text.isEmpty { markedCard }
        if let x = model.selected { issueCard(x) } else if !model.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && model.visible.isEmpty { okCard }
        if !model.visible.isEmpty { list }
    }

    private var editorCard: some View {
        SkillCard {
            ZStack(alignment: .topLeading) {
                TextEditor(text: Bindable(model).text).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).scrollContentBackground(.hidden).englishText()
                    .focused($editing).frame(minHeight: 200).padding(4).accessibilityLabel(t.lv("Đoạn văn cần kiểm tra"))
                if model.text.isEmpty {
                    Text(verbatim: t.lv("Dán đoạn văn tiếng Anh vào đây…")).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).englishText()
                        .padding(.horizontal, 9).padding(.vertical, 12).allowsHitTesting(false)
                }
            }
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
            HStack {
                Text(verbatim: t.lv("{n} từ", ["n": model.words])).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                Spacer(minLength: 0)
                WritingChip(text: t.lv("Đoạn mẫu"), system: "doc.text") { model.loadSample() }
                WritingChip(text: t.lv("Xóa"), system: "trash") { model.clear() }
            }
            FlowLayout(spacing: 6) {
                ForEach(model.types, id: \.0) { k, _ in
                    WritingChip(text: typeName(k) + " " + String(model.count(k)), selected: !model.off.contains(k)) { model.toggle(k) }
                        .accessibilityValue(model.off.contains(k) ? "" : "✓")
                }
            }
            .accessibilityElement(children: .contain).accessibilityLabel(t.lv("Lọc theo loại lỗi"))
        }
    }

    private var summaryCard: some View {
        let n = model.visible.count
        return SkillCard {
            HStack(spacing: LKSpacing.spaceSm) {
                Text(verbatim: String(n)).studyText(LKType.headlineLg, n > 0 ? LKColor.error : LKColor.success).environment(\.layoutDirection, .leftToRight)
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: model.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? t.lv("Chưa có nội dung") : n > 0 ? t.lv("{n} lỗi cần xem", ["n": n]) : t.lv("Không thấy lỗi nào")).studyText(LKType.titlePill)
                    Text(verbatim: t.lv("Bấm vào chữ gạch chân hoặc chọn trong danh sách.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                }
            }
            .accessibilityElement(children: .combine)
            SkillAction(title: t.lv("Sửa nhanh {n} lỗi an toàn", ["n": model.safeCount]), icon: "sparkles", primary: true, enabled: model.safeCount > 0) { model.applyAll() }
            HStack(spacing: LKSpacing.spaceXs) {
                SkillAction(title: t.lv("Sao chép bản đã sửa"), icon: "doc.on.doc", enabled: !model.text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) { model.copy() }
                SkillAction(title: t.lv("Hoàn tác"), icon: "arrow.uturn.backward", enabled: !model.undo.isEmpty) { model.undoLast() }
            }
            if let nt = model.notice {
                SkillNote(icon: "checkmark.circle.fill", text: { switch nt { case .ignored: return t.lv("Đã bỏ qua"); case .copied: return t.lv("Đã sao chép bản đã sửa"); case .fixed(let c): return c > 1 ? t.lv("Đã sửa {n} lỗi", ["n": c]) : t.lv("Đã sửa") } }(), tint: LKColor.success)
            }
        }
    }

    /// the text with every visible issue underlined (pattern + colour: not colour alone)
    private var marked: AttributedString {
        let ns = model.text as NSString
        var out = AttributedString(), at = 0
        for x in model.visible where x.s >= at && x.e <= ns.length {
            out += AttributedString(ns.substring(with: NSRange(location: at, length: x.s - at)))
            var a = AttributedString(ns.substring(with: NSRange(location: x.s, length: x.e - x.s)).isEmpty ? " " : ns.substring(with: NSRange(location: x.s, length: x.e - x.s)))
            let c = tone(x.type).resolve(scheme)
            a.underlineStyle = Text.LineStyle(pattern: pattern(x.type), color: c)
            let on = model.selected == x
            a.backgroundColor = c.opacity(on ? 0.32 : 0.13)
            out += a; at = x.e
        }
        if at < ns.length { out += AttributedString(ns.substring(from: at)) }
        return out
    }
    private var markedCard: some View {
        SkillCard {
            Text(marked).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText().fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityHidden(true)
    }

    private var okCard: some View {
        SkillCard {
            VStack(spacing: LKSpacing.spaceXs) {
                Image(systemName: "party.popper.fill").font(.system(size: 40)).foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true)
                Text(verbatim: t.lv("Không thấy lỗi nào")).studyText(LKType.headlineSm)
                Text(verbatim: t.lv("Bộ soát offline bắt các lỗi hay gặp của người học – vẫn nên đọc lại một lượt.")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            }.frame(maxWidth: .infinity)
        }
    }

    private func issueCard(_ x: FixIssue) -> some View {
        let ns = model.text as NSString
        let wrong = ns.substring(with: NSRange(location: x.s, length: min(x.e, ns.length) - x.s))
        let v = model.visible, pos = v.firstIndex(of: x) ?? 0
        return SkillCard {
            HStack(spacing: 6) {
                StudyChip(text: typeName(x.type), tint: tone(x.type))
                Text(verbatim: t.lv(x.title)).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
            }
            Text(verbatim: wrong.trimmingCharacters(in: .whitespaces).isEmpty ? "␣" : wrong).studyText(LKType.bodyLg, LKColor.error).strikethrough().englishText()
            FlowLayout(spacing: 6) {
                ForEach(Array(x.reps.enumerated()), id: \.offset) { k, r in
                    repButton(x, k, r)
                }
            }
            Text(verbatim: t.lv(x.why)).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
            FlowLayout(spacing: 6) {
                if !x.lesson.isEmpty { WritingChip(text: t.lv("Học bài ngữ pháp liên quan"), system: "ruler") { onRoute(AppRoute("grammar", arg: x.lesson)) } }
                WritingChip(text: t.lv("Bỏ qua lỗi này"), system: "eye.slash") { model.ignore() }
            }
            HStack {
                SkillAction(title: "‹ " + t.lv("Lỗi trước"), enabled: pos > 0) { model.step(-1) }
                Text(verbatim: "\(pos + 1)/\(v.count)").studyText(LKType.bodySm, LKColor.onSurfaceVariant).environment(\.layoutDirection, .leftToRight)
                SkillAction(title: t.lv("Lỗi sau") + " ›", enabled: pos < v.count - 1) { model.step(1) }
            }
        }
    }

    @ViewBuilder private func repButton(_ x: FixIssue, _ k: Int, _ r: String) -> some View {
        let label = HStack(spacing: 4) {
            Text(verbatim: r.isEmpty ? t.lv("(xóa)") : r).englishText()
            if let lv = x.levels, k < lv.count, !lv[k].isEmpty { Text(verbatim: lv[k]).font(.system(size: 11, weight: .bold)).opacity(0.8).englishText() }
        }
        if k == 0 {
            Button { model.apply([(x, r)], selectNext: true) } label: { label }.buttonStyle(PrimaryButtonStyle()).accessibilityLabel(t.lv("Áp dụng: {r}", ["r": r.isEmpty ? t.lv("(xóa)") : r]))
        } else {
            Button { model.apply([(x, r)], selectNext: true) } label: { label }.buttonStyle(StudyOutlineButtonStyle()).accessibilityLabel(t.lv("Áp dụng: {r}", ["r": r.isEmpty ? t.lv("(xóa)") : r]))
        }
    }

    private var list: some View {
        SkillCard {
            ForEach(Array(model.visible.enumerated()), id: \.offset) { _, x in
                let i = model.issues.firstIndex(of: x) ?? 0
                let ns = model.text as NSString
                let o = ns.substring(with: NSRange(location: x.s, length: min(x.e, ns.length) - x.s))
                Button { model.pick(i) } label: {
                    HStack(spacing: 8) {
                        Circle().fill(tone(x.type).resolve(scheme)).frame(width: 10, height: 10).accessibilityHidden(true)
                        (Text(verbatim: t.lv(x.title)).fontWeight(.bold) + Text(verbatim: " · ") + Text(verbatim: o.trimmingCharacters(in: .whitespaces).isEmpty ? "␣" : o).strikethrough() + Text(verbatim: " → ") + Text(verbatim: x.reps.first.map { $0.isEmpty ? t.lv("(xóa)") : $0 } ?? ""))
                            .lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.onSurface.resolve(scheme)).lineLimit(2).multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                    }
                    .frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(model.selected == x ? .isSelected : [])
            }
        }
        .accessibilityLabel(t.lv("Danh sách lỗi"))
    }
}
