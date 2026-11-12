import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// Card surface of the Listening / Reading screens: the Kit tactile card on the warm "highest" surface (never white on cream).
struct SkillCard<Content: View>: View {
    let content: Content
    init(@ViewBuilder content: () -> Content) { self.content = content() }
    var body: some View { LKCard(fill: LKColor.surfaceContainerHighest) { content } }
}

/// A thin progress bar (answered questions · part k of 4).
struct SkillProgress: View {
    let value: Double
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(LKColor.outlineVariant.resolve(scheme))
                Capsule().fill(LKColor.secondary.resolve(scheme)).frame(width: g.size.width * min(1, max(0, value)))
            }
        }
        .frame(height: 8)
        .accessibilityHidden(true)
    }
}

/// A text button that never clips: wraps onto more lines with Dynamic Type, ≥ 44 pt.
struct SkillAction: View {
    let title: String
    var icon: String?
    var primary = false
    var enabled = true
    let action: () -> Void
    private var button: some View {
        Button(action: action) {
            HStack(spacing: LKSpacing.spaceXs) {
                if let icon { Image(systemName: icon).accessibilityHidden(true) }
                Text(verbatim: title).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
            }
        }
        .disabled(!enabled)
    }
    @ViewBuilder var body: some View {
        if primary { button.buttonStyle(PrimaryButtonStyle()) } else { button.buttonStyle(StudyOutlineButtonStyle()) }
    }
}

/// English content (lines, passage, answers) reads left to right inside the Arabic interface too; digits stay Latin (`verbatim`).
struct EnglishText: View {
    let text: String
    var style: LKTextStyle = LKType.bodyMd
    var color: LKDynamicColor = LKColor.onSurface
    var body: some View { Text(verbatim: text).studyText(style, color).englishText().fixedSize(horizontal: false, vertical: true) }
}

/// A small label line: icon + text (state of the player, notes)
struct SkillNote: View {
    let icon: String, text: String
    var tint: LKDynamicColor = LKColor.onSurfaceVariant
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
            Image(systemName: icon).font(.system(size: 14, weight: .bold)).foregroundStyle(tint.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: text).studyText(LKType.bodySm, tint).fixedSize(horizontal: false, vertical: true)
        }
    }
}

// MARK: - questions

/// The question groups of a part (web `QE.questionsHtml` + `QE.mark`): gap fill, multiple choice, matching, "choose 2", TRUE/FALSE/NOT GIVEN.
/// After the check every question shows ✓ / ✗ with the right answer (never colour alone), the over-limit note, the explanation and, for the listening part, the evidence button.
struct QuestionsView: View {
    let part: JSON
    let answers: QAnswers
    var results: [Int: QResult]?
    /// retake: the questions already right are hidden
    var hide: Set<Int> = []
    var tips = false
    var onEvidence: ((Int) -> Void)?
    let setOne: (Int, String) -> Void
    let toggle: (Int, String) -> Void
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    static let tipKeys: [String: L10nKey] = [
        "tfng": .skillQtTrueBaiNoiDung, "ynng": .skillQtCauHoiVeQuan, "mcq": .skillQtGachChanTuKhoa, "multi": .skillQtChonDu2Dap, "headings": .skillQtDocDanhSachTieu,
        "info": .skillQtDapAnKhongTheo, "features": .skillQtTimVaDanhDau, "endings": .skillQtDocPhanDauCau, "map": .skillQtTruocKhiNgheXac, "lmatch": .skillQtDocDanhSachLua,
        "notes": .skillQtDungThoiGianTruoc, "rnotes": .skillQtTieuDeGhiChu, "summary": .skillQtDocLuotCaDoan, "sentence": .skillQtDocCaCauVa, "p1": .skillQtNhinAnhTruocKhi,
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            ForEach(Array(part.list("groups").enumerated()), id: \.offset) { gi, g in group(gi, g) }
        }
    }

    private func shown(_ g: JSON) -> [(offset: Int, element: JSON)] { Array(g.list("items").enumerated()).filter { !hide.contains($0.element.i("n")) } }
    @ViewBuilder private func group(_ gi: Int, _ g: JSON) -> some View {
        if g.s("type") == "multi" ? !hide.contains(g.list("n").first.map { Int(JSON.orZero($0)) } ?? 0) : !shown(g).isEmpty { groupBody(gi, g) }
    }
    private func groupBody(_ gi: Int, _ g: JSON) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            VStack(alignment: .leading, spacing: 4) {
                if g.t("title") { EnglishText(text: g.s("title"), style: LKType.titlePill) }
                EnglishText(text: g.s("instr"), style: LKType.bodySm, color: LKColor.onSurfaceVariant).italic()
            }
            .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
            .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainerHighest.resolve(scheme)))
            if tips, let k = Self.tipKeys[QE.kindOf(g)] {
                SkillNote(icon: "lightbulb.fill", text: t(k), tint: LKColor.tertiary)
            }
            switch g.s("type") {
            case "mcq": ForEach(shown(g), id: \.offset) { _, it in mcq(it) }
            case "tfng", "ynng": ForEach(shown(g), id: \.offset) { _, it in tf(it, g.s("type")) }
            case "match": match(g)
            case "multi": multi(gi, g)
            default: ForEach(shown(g), id: \.offset) { _, it in gap(it) }
            }
        }
    }

    // MARK: kinds
    private func stem(_ n: Int, _ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
            Text(verbatim: String(n)).studyText(LKType.labelMetric, LKColor.onSecondary)
                .padding(.horizontal, 8).padding(.vertical, 3).background(Capsule().fill(LKColor.secondary.resolve(scheme)))
            EnglishText(text: text, style: LKType.bodyMd)
        }
    }
    private func gap(_ it: JSON) -> some View {
        let n = it.i("n"), r = results?[n]
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            stem(n, it.s("text").replacingOccurrences(of: "___", with: "_____"))
            TextField(String(n), text: Binding(get: { answers.one[n] ?? "" }, set: { setOne(n, $0) }))
                .textInputAutocapitalization(.never).autocorrectionDisabled().englishText()
                .disabled(r != nil)
                .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 48)
                .tactile(fill: LKColor.surfaceContainerHigh, line: LKColor.outlineVariant, radius: 14)
            feedback(r, it)
        }
    }
    private func mcq(_ it: JSON) -> some View {
        let n = it.i("n"), r = results?[n], right = it.i("a")
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            stem(n, it.s("q"))
            ForEach(Array(it.strs("options").enumerated()), id: \.offset) { k, o in
                LessonOption(letter: QE.letters[min(k, 7)], text: o, state: state(marked: r != nil, chosen: answers.one[n] == String(k), right: k == right), action: { setOne(n, String(k)) }).disabled(r != nil)
            }
            feedback(r, it)
        }
    }
    private func tf(_ it: JSON, _ type: String) -> some View {
        let n = it.i("n"), r = results?[n]
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            stem(n, it.s("text"))
            FlowLayout {
                ForEach(Array((QE.tf[type] ?? []).enumerated()), id: \.offset) { k, v in
                    SkillChip(text: v, number: k + 1, on: answers.one[n] == v, right: r != nil && v == it.s("a")) { setOne(n, v) }.disabled(r != nil)
                }
            }
            feedback(r, it)
        }
    }
    private func match(_ g: JSON) -> some View {
        let opts = g.strs("options")
        return VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            if opts.contains(where: { !QE.label($0).isEmpty }) {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(opts.enumerated()), id: \.offset) { _, o in EnglishText(text: QE.code(o) + "  " + QE.label(o), style: LKType.bodySm) }
                }
                .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
            }
            ForEach(shown(g), id: \.offset) { _, it in
                let n = it.i("n"), r = results?[n]
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    stem(n, it.s("text"))
                    Menu {
                        ForEach(opts, id: \.self) { o in Button(QE.code(o)) { setOne(n, QE.code(o)) } }
                    } label: {
                        HStack { Text(verbatim: (answers.one[n] ?? "").isEmpty ? "–" : answers.one[n]!).studyText(LKType.titlePill); Spacer(minLength: 0); Image(systemName: "chevron.up.chevron.down").font(.system(size: 12, weight: .bold)).accessibilityHidden(true) }
                            .padding(.horizontal, LKSpacing.spaceSm).frame(maxWidth: .infinity, minHeight: 48, alignment: .leading)
                            .tactile(fill: LKColor.surfaceContainerHigh, radius: 14)
                    }
                    .disabled(r != nil)
                    feedback(r, it)
                }
            }
        }
    }
    private func multi(_ gi: Int, _ g: JSON) -> some View {
        let ns = g.list("n").map { Int(JSON.orZero($0)) }, picked = answers.multi[gi] ?? [], r = ns.first.flatMap { results?[$0] }
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            stem(ns.first ?? 0, g.s("q"))
            ForEach(Array(g.strs("options").enumerated()), id: \.offset) { _, o in
                let c = QE.code(o)
                LessonOption(letter: c, text: QE.label(o), state: state(marked: r != nil, chosen: picked.contains(c), right: g.strs("a").contains(c)), action: { toggle(gi, c) }).disabled(r != nil)
            }
            if let r { resultLine(ok: ns.compactMap { results?[$0] }.allSatisfy(\.ok), answer: r.answer, over: false, cue: g.s("cue"), n: ns.first ?? 0, explain: "") }
        }
    }

    // MARK: marking
    private func state(marked: Bool, chosen: Bool, right: Bool) -> LessonOption.State {
        if !marked { return chosen ? .selected : .idle }
        if right { return .correct }
        return chosen ? .wrong : .dim
    }
    @ViewBuilder private func feedback(_ r: QResult?, _ it: JSON) -> some View {
        if let r { resultLine(ok: r.ok, answer: r.answer, over: r.over, cue: r.cue, n: r.n, explain: it.s("explain")) }
    }
    private func resultLine(ok: Bool, answer: String, over: Bool, cue: String, n: Int, explain: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle.fill").foregroundStyle((ok ? LKColor.success : LKColor.error).resolve(scheme)).accessibilityHidden(true)
                Text(StudyText.rich(t(.skillQeDapAnA, ["a": answer]))).studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
            }
            if over { SkillNote(icon: "exclamationmark.triangle.fill", text: t(.skillQeVuotQuaSoTu), tint: LKColor.error) }
            if !explain.isEmpty { SkillNote(icon: "lightbulb.fill", text: explain, tint: LKColor.onSurfaceVariant) }
            if let onEvidence, !cue.isEmpty { SkillAction(title: t(.skillListenNgheDoanCoDap), icon: "magnifyingglass") { onEvidence(n) } }
        }
        .padding(.top, 2)
        .accessibilityElement(children: .contain)
    }
}

/// TRUE / FALSE / NOT GIVEN style chip: number badge + word, ≥ 44 pt.
struct SkillChip: View {
    let text: String, number: Int
    let on: Bool, right: Bool
    let action: () -> Void
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(verbatim: String(number)).studyText(LKType.labelMetric, on || right ? LKColor.onSecondary : LKColor.onSurface)
                    .frame(width: 26, height: 26).background(Circle().fill((on || right ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                Text(verbatim: text).studyText(LKType.titlePill).englishText()
                if right { Image(systemName: "checkmark").font(.system(size: 12, weight: .bold)).foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true) }
            }
            .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
            .tactile(fill: LKColor.surfaceContainerHigh, line: on || right ? LKColor.secondary : LKColor.outlineVariant, ledge: on || right ? LKColor.secondary : LKColor.outlineVariant, radius: 14)
        }
        .buttonStyle(LKPressStyle())
        .accessibilityAddTraits(on ? .isSelected : [])
    }
}

// MARK: - transcript

/// The transcript card (web `transcriptHtml`): narrator lines in italics, speaker lines with their words tappable, the question numbers after the submit.
/// Blurred while the live switch is off; a tap on a line plays from it, a tap on a word opens the popup.
struct TranscriptView: View {
    let rows: [Transcript.Row]
    let blurred: Bool
    let now: Int
    var onLine: (Int) -> Void
    var onWord: (String, String) -> Void
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            ForEach(rows, id: \.i) { r in row(r).id(r.i) }
        }
        .blur(radius: blurred ? 6 : 0)
        .allowsHitTesting(!blurred)
        .accessibilityHidden(blurred)
    }

    @ViewBuilder private func row(_ r: Transcript.Row) -> some View {
        let isNow = r.i == now
        VStack(alignment: .leading, spacing: 2) {
            if let say = r.say {
                EnglishText(text: say, style: LKType.bodySm, color: LKColor.onSurfaceVariant).italic()
            } else {
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: r.speaker).studyText(LKType.labelBadge, LKColor.secondary).englishText()
                    ForEach(r.ev, id: \.self) { n in
                        Text(t(.usageQ, ["n": n])).studyText(LKType.labelBadge, LKColor.onTertiaryContainer)
                            .padding(.horizontal, 6).padding(.vertical, 2).background(Capsule().fill(LKColor.tertiaryContainer.resolve(scheme)))
                    }
                }
                WordFlow(pieces: r.tokens) { w in onWord(w, ReaderPage.plain(r.tokens)) }
            }
        }
        .padding(LKSpacing.spaceXs)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(isNow ? LKColor.secondaryFixed.resolve(scheme).opacity(scheme == .dark ? 0.18 : 0.45) : .clear))
        .contentShape(Rectangle())
        .onTapGesture { onLine(r.i) }
    }
}

/// A line of text as tokens: words are tappable (and styled by their classes), the rest is plain. Wraps like text.
struct WordFlow: View {
    let pieces: [Lexis.Piece]
    var activeWord: Int?
    var highlights: [String] = []
    let onWord: (String) -> Void
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        FlowLayout(spacing: 0) {
            ForEach(Array(pieces.enumerated()), id: \.offset) { i, p in
                switch p {
                case .text(let s): Text(verbatim: s).studyText(LKType.bodyMd).englishText()
                case .word(let shown, let w, let cls, _):
                    Button { onWord(w) } label: {
                        Text(verbatim: shown).studyText(LKType.bodyMd).englishText()
                            .padding(.vertical, 2)
                            .overlay(alignment: .bottom) { if mark(cls) != nil { Rectangle().fill(mark(cls)!.resolve(scheme)).frame(height: 2) } }
                            .background(i == activeWord ? LKColor.secondaryFixed.resolve(scheme).opacity(0.4) : .clear)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(shown)
                }
            }
        }
        .englishText()
    }
    private func on(_ cls: String, _ k: String) -> Bool { highlights.isEmpty ? false : highlights.contains(k) && cls.split(separator: " ").contains { $0 == Substring(k) || ($0 == "col" && k == "link") } }
    private func mark(_ cls: String) -> LKDynamicColor? {
        if on(cls, "kw") { return LKColor.primary }
        if on(cls, "link") { return LKColor.secondary }
        if on(cls, "awl") { return LKColor.tertiary }
        if on(cls, "mine") { return LKColor.success }
        return nil
    }
}

// MARK: - the word popup

/// Bottom sheet of a tapped word: the word with part of speech / level, IPA + speaker, the meaning, the sentence with the word in bold, "+ Lưu flashcard" (or "Thêm ngữ cảnh"), "Chi tiết".
struct WordPopupView: View {
    let model: WordPopupModel
    var onDetails: ((String) -> Void)?
    var onClose: () -> Void
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack(alignment: .top) {
                title
                Spacer(minLength: 0)
                Button(action: onClose) { Image(systemName: "xmark").font(.system(size: 16, weight: .bold)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap) }
                    .buttonStyle(.plain).accessibilityLabel(t(.actionClose))
            }
            switch model.stage {
            case .loading: Text(t(.lessonStoryLookup, ["w": model.word])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            case .notFound(let tr):
                Text(t(.lessonStoryNotFound, ["w": model.word])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
                if let tr { Text(StudyText.rich(t(.skillReadDichVi, ["vi": tr]))).studyText(LKType.bodyMd) }
            case .found(let f): found(f)
            }
        }
        .padding(LKSpacing.spaceMd)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(LKColor.surfaceContainerHighest.resolve(scheme).ignoresSafeArea())
    }

    @ViewBuilder private var title: some View {
        if case .found(let f) = model.stage {
            VStack(alignment: .leading, spacing: 4) {
                Text(verbatim: f.word).studyText(LKType.headlineMd).englishText()
                HStack(spacing: LKSpacing.spaceXs) {
                    if !f.pos.isEmpty { StudyChip(text: f.pos) }
                    if !f.level.isEmpty { StudyChip(text: f.level, tint: LKColor.tertiary) }
                }
            }
        } else { Text(verbatim: model.word).studyText(LKType.headlineMd).englishText() }
    }

    @ViewBuilder private func found(_ f: WordPopup.Found) -> some View {
        HStack(spacing: LKSpacing.spaceXs) {
            if !f.ipa.isEmpty { Text(verbatim: f.ipa).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).englishText() }
            StudySpeak(label: f.word) { model.speak() }
        }
        if !f.mean.isEmpty { Text(verbatim: f.mean).studyText(LKType.headlineSm, LKColor.secondary) }
        if !f.def.isEmpty { EnglishText(text: f.def, style: LKType.bodySm, color: LKColor.onSurfaceVariant) }
        if !f.sentence.isEmpty {
            Text(Self.bold(f.sentence, f.ctxWord)).studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
                .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
        }
        HStack(spacing: LKSpacing.spaceSm) {
            if model.saved {
                SkillNote(icon: "checkmark.circle.fill", text: t(.skillListenDaLuuKemNgu), tint: LKColor.success)
            } else {
                SkillAction(title: "+ " + t(WordPopup.saveLabel(f)), primary: true, enabled: !model.saving) { Task { await model.save() } }
            }
            if let onDetails { SkillAction(title: t(.skillReadChiTiet)) { onDetails(f.word) } }
        }
    }
    /// the sentence with the tapped word in bold
    static func bold(_ s: String, _ w: String) -> AttributedString {
        var a = AttributedString(s)
        if let r = s.range(of: w, options: [.caseInsensitive, .diacriticInsensitive]), let ar = Range(r, in: a) { a[ar].inlinePresentationIntent = .stronglyEmphasized }
        return a
    }
}


/// Bidi isolation for the Skills screens only: numeric runs ("1–10", "21/40", "62%", "+20 XP") and English labels keep their left-to-right order inside Arabic text.
enum Bidi {
    static let lri = "\u{2066}", pdi = "\u{2069}"
    static func ltr(_ s: String) -> String { lri + s + pdi }
    private static let run = try! NSRegularExpression(pattern: "\\+?\\d+(?:[.,]\\d+)?(?:\\s?[–\\-/]\\s?\\d+(?:[.,]\\d+)?)?(?:\\s?%|\\s?XP)?")
    static func isolate(_ s: String) -> String {
        let ns = s as NSString
        var out = "", last = 0
        for m in run.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
            out += ns.substring(with: NSRange(location: last, length: m.range.location - last)) + ltr(ns.substring(with: m.range))
            last = m.range.location + m.range.length
        }
        return out + ns.substring(from: last)
    }
}
