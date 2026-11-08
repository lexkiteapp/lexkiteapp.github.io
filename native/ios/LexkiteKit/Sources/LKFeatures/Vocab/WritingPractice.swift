import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// The five practice modes generated from a model answer (web phrases-model.js `EX`): fill the phrases · fix the planted errors ·
/// fill the linking words · retype the whole model · rebuild sentences from base words. Each one reports `(right, total)` to the model screen.
struct WritingPracticeContext {
    let model: JSON
    let vi: Bool
    let voice: LKVoicePlayer
    let seed: UInt64?
    let finish: (_ kind: String, _ right: Int, _ total: Int) -> Void
}

private func paragraphs(_ text: String) -> [String] {
    text.replacingOccurrences(of: "\\n\\s*\\n", with: "\u{1}", options: .regularExpression).components(separatedBy: "\u{1}")
        .map { $0.trimmingCharacters(in: .whitespacesAndNewlines).replacingOccurrences(of: "\\s*\\n\\s*", with: " ", options: .regularExpression) }.filter { !$0.isEmpty }
}

private func stripRole(_ p: String) -> String { p.replacingOccurrences(of: "<<[^>]*>>\\s*", with: "", options: .regularExpression) }
private func roleOf(_ p: String) -> String {
    guard let re = try? NSRegularExpression(pattern: "<<([^>]*)>>"), let m = re.firstMatch(in: p, range: NSRange(p.startIndex..., in: p)), let r = Range(m.range(at: 1), in: p) else { return "" }
    return String(p[r])
}
private func matches(_ s: String, _ pattern: String) -> [String] {
    guard let re = try? NSRegularExpression(pattern: pattern) else { return [] }
    return re.matches(in: s, range: NSRange(s.startIndex..., in: s)).compactMap { Range($0.range, in: s).map { String(s[$0]) } }
}

/// field with the look of the Stitch input (outlined, tinted by right / wrong)
private struct PracticeFieldStyle: ViewModifier {
    let mark: Bool?
    @Environment(\.colorScheme) private var scheme
    func body(content: Content) -> some View {
        let line = mark == nil ? LKColor.outlineVariant : (mark == true ? LKColor.success : LKColor.error)
        content.lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
            .textInputAutocapitalization(.never).autocorrectionDisabled()
            .padding(.horizontal, 8).frame(minHeight: LKFrame.shared.minTap)
            .background(RoundedRectangle(cornerRadius: 10, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
            .overlay(RoundedRectangle(cornerRadius: 10, style: .continuous).strokeBorder(line.resolve(scheme), lineWidth: 2))
    }
}
private extension View { func practiceField(_ mark: Bool?) -> some View { modifier(PracticeFieldStyle(mark: mark)) } }

// MARK: - gaps: phrases (vocab) and linking words (link)

struct WritingGapPractice: View {
    enum Tok: Hashable { case word(String), gap(Int, String) }
    let ctx: WritingPracticeContext
    let kind: String
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var paras: [[Tok]] = []
    @State private var answers: [String] = []
    @State private var inputs: [String] = []
    @State private var marks: [Bool?] = []
    @State private var bank: [String] = []
    @State private var hints = true
    @FocusState private var focus: Int?

    var body: some View {
        WritingCard {
            Text(kind == "vocab" ? t.rich(.modelFillTheGapsWith) : t.rich(.modelFillEachGapWith)).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            if kind == "vocab", ctx.vi { Toggle(t(.modelShowMeaningHintsNext), isOn: $hints).lkTextSafe(LKType.bodyMd).frame(minHeight: LKFrame.shared.minTap).tint(LKColor.secondary.resolve(scheme)) }
            FlowLayout { ForEach(Array(bank.enumerated()), id: \.offset) { _, w in WritingChip(text: w, selected: false, english: true) { fill(w) }.opacity(used(w) ? 0.4 : 1) } }
            ForEach(Array(paras.enumerated()), id: \.offset) { _, p in
                FlowLayout(spacing: 6) {
                    ForEach(Array(p.enumerated()), id: \.offset) { _, tok in
                        switch tok {
                        case .word(let w): Text(w).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                        case .gap(let i, let hint):
                            VStack(alignment: .leading, spacing: 0) {
                                TextField("", text: Binding(get: { i < inputs.count ? inputs[i] : "" }, set: { if i < inputs.count { inputs[i] = $0; marks[i] = nil } }))
                                    .focused($focus, equals: i).practiceField(i < marks.count ? marks[i] : nil)
                                    .frame(width: CGFloat(max(76, min(220, (i < answers.count ? answers[i].count : 8) * 10 + 28))))
                                    .accessibilityLabel(t(.usageBlank) + " " + String(i + 1))
                                if hints, ctx.vi, !hint.isEmpty { Text(hint).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).lineLimit(1) }
                            }
                        }
                    }
                }
            }
            Button(t(.actionCheck)) { check() }.buttonStyle(PrimaryButtonStyle())
            FlowLayout {
                Button(t(.modelShowAnswers)) { inputs = answers; marks = Array(repeating: nil, count: answers.count) }.buttonStyle(WritingSecondaryButtonStyle())
                Button(t(.modelClearAll)) { inputs = Array(repeating: "", count: answers.count); marks = Array(repeating: nil, count: answers.count) }.buttonStyle(WritingSecondaryButtonStyle())
            }
        }
        .task(id: kind + ctx.model.s("id")) { build() }
    }

    private func build() {
        var ans: [String] = [], out: [[Tok]] = []
        for para in WritingEngine.annotated(ctx.model.s("text")) {
            var toks: [Tok] = []
            func words(_ s: String) { for w in s.split(whereSeparator: { $0.isWhitespace }) { toks.append(.word(String(w))) } }
            for seg in para.segments {
                switch seg {
                case .text(let s): words(s)
                case .role: break
                case .chunk(let en, let vi): if kind == "vocab" { toks.append(.gap(ans.count, vi)); ans.append(en) } else { words(en) }
                case .linker(let l): if kind == "link" { toks.append(.gap(ans.count, "")); ans.append(l) } else { words(l) }
                }
            }
            out.append(toks)
        }
        var rng = ctx.seed.map { WritingRNG(seed: $0) } ?? WritingRNG.timeSeeded()
        var seen = Set<String>()
        paras = out; answers = ans; inputs = Array(repeating: "", count: ans.count); marks = Array(repeating: nil, count: ans.count)
        bank = rng.shuffled(ans.filter { seen.insert($0).inserted })
    }
    private func used(_ w: String) -> Bool { inputs.contains { WritingSimilarity.norm($0) == WritingSimilarity.norm(w) && !$0.isEmpty } }
    private func fill(_ w: String) {
        let i = focus ?? inputs.firstIndex(of: "") ?? 0
        guard i < inputs.count else { return }
        inputs[i] = w; marks[i] = nil
        focus = inputs.firstIndex(of: "")
    }
    private func check() {
        let g = WritingEngine.Gap(model: ctx.model.s("text"), kind: kind)
        let r = g.check(inputs)
        marks = r.marks.count == answers.count ? r.marks.map { Optional($0) } : answers.enumerated().map { Optional(WritingSimilarity.norm(inputs[$0.offset]) == WritingSimilarity.norm($0.element)) }
        ctx.finish(kind, marks.filter { $0 == true }.count, answers.count)
    }
}

// MARK: - planted grammar errors (gram)

struct WritingErrPractice: View {
    struct Slot: Hashable { var idx: Int, pre: String, post: String, ans: String, wrong: String, why: String }
    enum Tok: Hashable { case word(String), slot(Int) }
    static let forms: [[String]] = [["rise", "rose", "risen", "rising", "rises"], ["fall", "fell", "fallen", "falling", "falls"], ["increase", "increased", "increasing", "increases"], ["decrease", "decreased", "decreasing", "decreases"],
        ["decline", "declined", "declining", "declines"], ["grow", "grew", "grown", "growing", "grows"], ["remain", "remained", "remaining", "remains"], ["show", "shows", "showed", "shown"], ["see", "saw", "seen", "sees"],
        ["have", "has", "had", "having"], ["is", "are", "was", "were", "be", "been"], ["reach", "reached", "reaches", "reaching"], ["become", "became", "becomes", "becoming"], ["spend", "spent", "spends", "spending"],
        ["lead", "led", "leads", "leading"], ["make", "made", "makes", "making"], ["take", "took", "taken", "takes", "taking"], ["give", "gave", "given", "gives"], ["believe", "believes", "believed", "believing"],
        ["argue", "argues", "argued", "arguing"], ["provide", "provides", "provided", "providing"], ["encourage", "encourages", "encouraged", "encouraging"], ["reduce", "reduces", "reduced", "reducing"],
        ["country", "countries"], ["student", "students"], ["household", "households"], ["figure", "figures"], ["people", "person"], ["a", "an", "the"], ["much", "many"], ["less", "fewer"], ["high", "higher", "highest"],
        ["low", "lower", "lowest"], ["large", "larger", "largest"], ["significant", "significantly"], ["dramatic", "dramatically"], ["steady", "steadily"], ["sharp", "sharply"], ["slight", "slightly"]]

    let ctx: WritingPracticeContext
    @Environment(\.l10n) private var t
    @Environment(\.liveContent) private var live
    @Environment(\.colorScheme) private var scheme
    @State private var paras: [[Tok]] = []
    @State private var slots: [Slot] = []
    @State private var inputs: [String] = []
    @State private var marks: [Bool?] = []
    @State private var selectMode = false
    @State private var round = 0
    @FocusState private var focus: Int?

    var body: some View {
        WritingCard {
            if selectMode { Text(t.rich(.modelChooseTheCorrectForm)).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
            else { Text(t.rich(.modelTheModelAnswerNow, ["n": slots.count])).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
            ForEach(Array(paras.enumerated()), id: \.offset) { _, p in
                FlowLayout(spacing: 6) {
                    ForEach(Array(p.enumerated()), id: \.offset) { _, tok in
                        switch tok {
                        case .word(let w): Text(w).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                        case .slot(let k): slotView(k)
                        }
                    }
                }
            }
            Button(t(.actionCheck)) { check() }.buttonStyle(PrimaryButtonStyle())
            FlowLayout {
                Button(t(.modelShowAnswers)) { inputs = slots.map(\.ans); marks = slots.map { _ in nil } }.buttonStyle(WritingSecondaryButtonStyle())
                Button(selectMode ? t(.modelShuffleGaps) : t(.modelNewSetOfErrors)) { round += 1; build() }.buttonStyle(WritingSecondaryButtonStyle())
            }
        }
        .task(id: ctx.model.s("id")) { if live { _ = await WordCatalogRemote.shared.catalog() }; build() }
    }

    @ViewBuilder private func slotView(_ k: Int) -> some View {
        if k < slots.count {
            let s = slots[k]
            HStack(spacing: 2) {
                if !s.pre.isEmpty { Text(s.pre).lkTextSafe(LKType.bodyLg).englishText() }
                if !selectMode, !s.wrong.isEmpty { Text(s.wrong).lkTextSafe(LKType.bodyLg).underline().foregroundStyle(LKColor.error.resolve(scheme)).englishText() }
                if selectMode {
                    Menu {
                        ForEach(options(s), id: \.self) { o in Button(o) { inputs[k] = o; marks[k] = nil } }
                    } label: {
                        Text(inputs[k].isEmpty ? "…" : inputs[k]).lkTextSafe(LKType.bodyLg).practiceField(marks[k]).frame(minWidth: 76)
                    }
                } else {
                    TextField(s.wrong.isEmpty ? "+" : "", text: Binding(get: { k < inputs.count ? inputs[k] : "" }, set: { if k < inputs.count { inputs[k] = $0; marks[k] = nil } }))
                        .focused($focus, equals: k).practiceField(marks[k]).frame(width: CGFloat(max(60, min(200, s.ans.count * 10 + 28))))
                        .accessibilityLabel(t(.usageBlank) + " " + String(k + 1))
                }
                if !s.post.isEmpty { Text(s.post).lkTextSafe(LKType.bodyLg).englishText() }
            }
            if marks[k] == false { Text(s.why.isEmpty ? s.ans : s.why + ": " + s.ans).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.error.resolve(scheme)) }
        }
    }
    private func options(_ s: Slot) -> [String] {
        guard let f = Self.forms.first(where: { $0.contains(s.ans.lowercased()) }) else { return [s.ans] }
        let cap = s.ans.first?.isUppercase ?? false
        return f.map { cap ? $0.prefix(1).uppercased() + $0.dropFirst() : $0 }
    }

    private func build() {
        var rng = ctx.seed.map { WritingRNG(seed: $0 &+ UInt64(round)) } ?? WritingRNG.timeSeeded()
        let plainParas = paragraphs(ctx.model.s("text")).map { WritingEngine.plain(stripRole($0)) }
        let allWords = Set(plainParas.flatMap { matches($0, "[A-Za-z]+") }.map { $0.lowercased() })
        let lem = WritingLemmas.make(known: allWords)
        // candidate errors
        var cand: [(para: Int, tok: Int, slot: Slot)] = []
        for (pi, p) in plainParas.enumerated() {
            for (ti, raw) in p.split(separator: " ").map(String.init).enumerated() {
                guard let (pre, w, post) = splitToken(raw) else { continue }
                let l = w.lowercased()
                var wrong: String?, why = ""
                if ["the", "a", "an"].contains(l), rng.next() < 0.5 { wrong = ""; why = t(.modelMissingArticle) }
                else if let r = WritingVerbs.shared?.resolve(l), r.s("from") == "past", r.s("base") != l, !r.t("guess"), !["was", "were", "had", "did"].contains(l) { wrong = r.s("base"); why = t(.modelWrongTensePastNeeded) }
                else if l == "was" || l == "were" { wrong = l == "was" ? "were" : "was"; why = t(.modelSubjectVerbAgreement) }
                else if l.hasSuffix("ed"), lem.lemma(l) != l, WritingVerbs.shared?.isKnown(lem.lemma(l)) == true { wrong = lem.lemma(l); why = t(.modelWrongTenseMissingEd) }
                else if l.hasSuffix("ly"), l.count > 5, allWords.contains(String(l.dropLast(2))) || (WritingVerbs.shared?.isKnown(String(l.dropLast(2))) ?? false) {
                    let c = l.replacingOccurrences(of: "ily$", with: "y", options: .regularExpression).replacingOccurrences(of: "ally$", with: "al", options: .regularExpression).replacingOccurrences(of: "ly$", with: "", options: .regularExpression)
                    if allWords.contains(c) { wrong = c; why = t(.modelAdverbNeededLy) }
                } else if l.range(of: "[^s]s$", options: .regularExpression) != nil, lem.lemma(l) != l, allWords.contains(lem.lemma(l)), WritingVerbs.shared?.isKnown(lem.lemma(l)) != true { wrong = lem.lemma(l); why = t(.modelPluralNoun) }
                else if l.range(of: "(er|est)$", options: .regularExpression) != nil, lem.lemma(l) != l, allWords.contains(lem.lemma(l)), l.count > 4 { wrong = lem.lemma(l); why = t(.modelMissingComparativeSuperlative) }
                if let wrong, wrong != l {
                    let cap = w.first?.isUppercase ?? false
                    cand.append((pi, ti, Slot(idx: 0, pre: pre, post: post, ans: w, wrong: cap && !wrong.isEmpty ? wrong.prefix(1).uppercased() + wrong.dropFirst() : wrong, why: why)))
                }
            }
        }
        var pick: [(para: Int, tok: Int, slot: Slot)] = []
        for c in rng.shuffled(cand) where pick.count < 12 && !pick.contains(where: { $0.para == c.para && abs($0.tok - c.tok) < 6 }) { pick.append(c) }
        selectMode = pick.count < 5
        if selectMode { pick = selectCandidates(plainParas, &rng) }
        pick.sort { ($0.para, $0.tok) < ($1.para, $1.tok) }
        slots = pick.enumerated().map { var s = $0.element.slot; s.idx = $0.offset; return s }
        inputs = Array(repeating: "", count: slots.count); marks = Array(repeating: nil, count: slots.count)
        var out: [[Tok]] = []
        for (pi, p) in plainParas.enumerated() {
            var row: [Tok] = []
            for (ti, raw) in p.split(separator: " ").map(String.init).enumerated() {
                if let k = pick.firstIndex(where: { $0.para == pi && $0.tok == ti }) { row.append(.slot(k)) } else { row.append(.word(raw)) }
            }
            out.append(row)
        }
        paras = out
    }
    private func splitToken(_ raw: String) -> (String, String, String)? {
        guard let re = try? NSRegularExpression(pattern: "^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$"), let m = re.firstMatch(in: raw, range: NSRange(raw.startIndex..., in: raw)),
              let a = Range(m.range(at: 1), in: raw), let b = Range(m.range(at: 2), in: raw), let c = Range(m.range(at: 3), in: raw) else { return nil }
        return (String(raw[a]), String(raw[b]), String(raw[c]))
    }
    /// web `gramExercise`: up to 12 words that have a family of forms, each turned into a choice
    private func selectCandidates(_ plain: [String], _ rng: inout WritingRNG) -> [(para: Int, tok: Int, slot: Slot)] {
        var out: [(para: Int, tok: Int, slot: Slot)] = []
        for (pi, p) in plain.enumerated() {
            for (ti, raw) in p.split(separator: " ").map(String.init).enumerated() {
                guard out.count < 12, let (pre, w, post) = splitToken(raw), Self.forms.contains(where: { $0.contains(w.lowercased()) }), rng.next() >= 0.45 else { continue }
                out.append((pi, ti, Slot(idx: 0, pre: pre, post: post, ans: w, wrong: "", why: "")))
            }
        }
        return out
    }
    private func check() {
        marks = slots.enumerated().map { Optional(WritingSimilarity.norm(inputs[$0.offset]) == WritingSimilarity.norm($0.element.ans)) }
        ctx.finish("gram", marks.filter { $0 == true }.count, slots.count)
    }
}

// MARK: - retype the whole model (copy)

struct WritingSlotPractice: View {
    struct Item: Hashable { var text: String, slot: Int? }
    struct Block: Hashable { var role: String, items: [Item] }
    let ctx: WritingPracticeContext
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var blocks: [Block] = []
    @State private var answers: [String] = []
    @State private var inputs: [String] = []
    @State private var marks: [Bool?] = []
    @State private var hint = false
    @FocusState private var focus: Int?

    var body: some View {
        WritingCard {
            Text(t.rich(.modelRetypeTheWholeModel)).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            Toggle(t(.modelFirstLetterHints), isOn: $hint).lkTextSafe(LKType.bodyMd).frame(minHeight: LKFrame.shared.minTap).tint(LKColor.secondary.resolve(scheme))
            ForEach(Array(blocks.enumerated()), id: \.offset) { _, b in
                VStack(alignment: .leading, spacing: 4) {
                    if !b.role.isEmpty { WritingTag(text: b.role, tint: LKColor.tertiary) }
                    FlowLayout(spacing: 4) {
                        ForEach(Array(b.items.enumerated()), id: \.offset) { _, it in
                            if let i = it.slot {
                                TextField("", text: Binding(get: { i < inputs.count ? inputs[i] : "" }, set: { set(i, $0) }), prompt: hint && i < answers.count ? Text(String(answers[i].prefix(1))) : nil)
                                    .focused($focus, equals: i).practiceField(i < marks.count ? marks[i] : nil)
                                    .frame(width: CGFloat(max(44, min(180, it.text.count * 10 + 24)))).submitLabel(.next).onSubmit { focus = i + 1 }
                                    .accessibilityLabel(String(i + 1))
                            } else {
                                Text(it.text).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                            }
                        }
                    }
                }
            }
            Text(t(.modelWords, ["done": inputs.filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }.count, "n": answers.count])).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityAddTraits(.updatesFrequently)
            Button(t(.actionCheck)) { check() }.buttonStyle(PrimaryButtonStyle())
            Button(t(.modelClearAll)) { inputs = Array(repeating: "", count: answers.count); marks = Array(repeating: nil, count: answers.count); focus = 0 }.buttonStyle(WritingSecondaryButtonStyle())
        }
        .task(id: ctx.model.s("id")) { build() }
    }

    private func set(_ i: Int, _ v: String) {
        guard i < inputs.count else { return }
        if v.contains(" ") || v.contains("\n") { inputs[i] = v.trimmingCharacters(in: .whitespacesAndNewlines); focus = i + 1 } else { inputs[i] = v }
        marks[i] = nil
    }
    private func build() {
        var bs: [Block] = [], ans: [String] = []
        for p in paragraphs(ctx.model.s("text")) {
            let toks = matches(WritingEngine.plain(stripRole(p)), "[A-Za-z][A-Za-z'’-]*|\\d+(?:[.,]\\d+)*%?|[^\\sA-Za-z\\d]")
            var items: [Item] = []
            for tok in toks {
                if tok.range(of: "^[^A-Za-z\\d]$", options: .regularExpression) != nil { items.append(Item(text: tok, slot: nil)) }
                else { items.append(Item(text: tok, slot: ans.count)); ans.append(tok) }
            }
            bs.append(Block(role: roleOf(p), items: items))
        }
        blocks = bs; answers = ans; inputs = Array(repeating: "", count: ans.count); marks = Array(repeating: nil, count: ans.count)
    }
    private func check() {
        marks = answers.enumerated().map { Optional(WritingSimilarity.norm(inputs[$0.offset]) == WritingSimilarity.norm($0.element)) }
        ctx.finish("copy", marks.filter { $0 == true }.count, answers.count)
    }
}

// MARK: - rebuild sentences from base words (write)

struct WritingLemmaPractice: View {
    struct Line: Hashable { var sentence: String, role: String, prompt: String }
    let ctx: WritingPracticeContext
    @Environment(\.l10n) private var t
    @Environment(\.liveContent) private var live
    @Environment(\.colorScheme) private var scheme
    @State private var lines: [Line] = []
    @State private var inputs: [String] = []
    @State private var results: [Int: Double] = [:]
    @State private var shown = false

    var body: some View {
        WritingCard {
            Text(t.rich(.modelEachSentenceIsGiven)).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            ForEach(Array(lines.enumerated()), id: \.offset) { i, l in
                VStack(alignment: .leading, spacing: 4) {
                    if !l.role.isEmpty { WritingTag(text: l.role, tint: LKColor.tertiary) }
                    Text(l.prompt).lkTextSafe(LKType.titlePill).foregroundStyle(LKColor.secondary.resolve(scheme)).englishText().frame(maxWidth: .infinity, alignment: .leading)
                    TextField(t(.modelWriteTheFullSentence), text: Binding(get: { i < inputs.count ? inputs[i] : "" }, set: { if i < inputs.count { inputs[i] = $0; results[i] = nil } }), axis: .vertical)
                        .lineLimit(1...4).practiceField(results[i].map { $0 >= 0.95 })
                    if let sc = results[i] {
                        if WritingSimilarity.norm(inputs[i]) == WritingSimilarity.norm(l.sentence) {
                            Label(t(.modelCorrect), systemImage: "checkmark.circle.fill").lkTextSafe(LKType.titlePill).foregroundStyle(LKColor.success.resolve(scheme))
                        } else {
                            Text(t(.modelMatch, ["n": Int((sc * 100).rounded())])).lkTextSafe(LKType.titlePill).foregroundStyle((sc >= 0.85 ? LKColor.tertiary : LKColor.error).resolve(scheme))
                        }
                    }
                    if shown || results[i] != nil && results[i]! < 0.95 {
                        Text(t(.modelModelSentence) + " " + l.sentence).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).englishText().frame(maxWidth: .infinity, alignment: .leading)
                    }
                }
            }
            Button(t(.modelCheckAll)) { check() }.buttonStyle(PrimaryButtonStyle())
            Button(t(.modelShowModelSentences)) { shown = true }.buttonStyle(WritingSecondaryButtonStyle())
        }
        .task(id: ctx.model.s("id")) { if live { _ = await WordCatalogRemote.shared.catalog() }; build() }
    }

    private func build() {
        var ls: [Line] = []
        let all = paragraphs(ctx.model.s("text")).flatMap { matches(WritingEngine.plain(stripRole($0)), "[^.!?]+[.!?]+") }
        let known = Set(all.flatMap { matches($0, "[A-Za-z]+") }.map { $0.lowercased() })
        let lem = WritingLemmas.make(known: known)
        for p in paragraphs(ctx.model.s("text")) {
            let role = roleOf(p)
            for (si, s) in matches(WritingEngine.plain(stripRole(p)), "[^.!?]+[.!?]+").enumerated() {
                let ts = matches(s.trimmingCharacters(in: .whitespaces), "[A-Za-z][A-Za-z'’-]*|\\d+(?:[.,]\\d+)*%?|[^\\sA-Za-z\\d]")
                let prompt = ts.enumerated().map { (k, tok) -> String in
                    guard tok.first?.isLetter == true else { return tok }
                    if tok.first?.isUppercase == true && k > 0 && tok != "I" { return tok }
                    if tok.contains("'") || tok.contains("’") {
                        return tok.split(whereSeparator: { $0 == "'" || $0 == "’" }).enumerated().map { (j, x) in j > 0 ? "'" + String(x) : lem.lemma(String(x)) }.joined(separator: " / ")
                    }
                    return lem.lemma(tok)
                }.joined(separator: " / ")
                ls.append(Line(sentence: s.trimmingCharacters(in: .whitespaces), role: si == 0 ? role : "", prompt: prompt))
            }
        }
        lines = ls; inputs = Array(repeating: "", count: ls.count)
    }
    private func check() {
        var right = 0
        var res: [Int: Double] = [:]
        for (i, l) in lines.enumerated() where !inputs[i].trimmingCharacters(in: .whitespaces).isEmpty {
            let exact = WritingSimilarity.norm(inputs[i]) == WritingSimilarity.norm(l.sentence)
            let sc = WritingSimilarity.ratio(WritingSimilarity.norm(inputs[i]), WritingSimilarity.norm(l.sentence))
            res[i] = exact ? 1 : sc
            if exact || sc >= 0.95 { right += 1 }
        }
        results = res
        ctx.finish("write", right, lines.count)
    }
}
