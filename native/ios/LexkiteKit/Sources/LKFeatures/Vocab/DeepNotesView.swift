import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

private struct LiveContentKey: EnvironmentKey { static let defaultValue = true }
extension EnvironmentValues {
    /// false in snapshots / fixtures: screens never start a download
    var liveContent: Bool { get { self[LiveContentKey.self] } set { self[LiveContentKey.self] = newValue } }
}

/// The hand-written notes of a word (`js/notes/<letter>.json`), downloaded like the web does and cached on disk by `LessonRemote`.
public actor DeepNotesRemote {
    public static let shared = DeepNotesRemote()
    private let source: LessonTextSource
    private var files: [String: JSON] = [:]
    public init(source: LessonTextSource = LessonRemote.shared) { self.source = source }
    public func note(for word: String) async -> JSON? {
        let f = DeepNotes.file(for: word)
        if files[f] == nil {
            guard let text = await source.text("js/notes/\(f).json"), let j = try? JSON.parse(text) else { return nil }
            files[f] = j
        }
        return files[f].flatMap { DeepNotes.note($0, word: word) }
    }
}

/// "Hiểu sâu" block (web WordCard.notes): memory aid · common mistakes (✕ wrong / ✓ right) · use in the exam · word family.
/// Shown on the dictionary page, the review card back and the new-word card of practice; hidden when the word has no note.
struct DeepNotesView: View {
    let word: String
    var preset: JSON? = nil
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.liveContent) private var live
    @AppStorage("lk.wcOpen") private var openRaw = "m"
    @State private var loaded: JSON?

    private var note: JSON? { preset ?? loaded }
    private func isOpen(_ k: String) -> Binding<Bool> {
        Binding(get: { openRaw.split(separator: ",").contains(Substring(k)) },
                set: { on in
                    var s = Set(openRaw.split(separator: ",").map(String.init)); if on { s.insert(k) } else { s.remove(k) }
                    openRaw = s.sorted().joined(separator: ",")
                })
    }
    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }

    var body: some View {
        Group {
            if let n = note, n.t("m") || n.t("e") || n.t("u") || n.t("f") { card(n) }
        }
        .task(id: word) {
            guard live, preset == nil else { return }
            loaded = await DeepNotesRemote.shared.note(for: word)
        }
    }

    private func card(_ n: JSON) -> some View {
        WritingCard {
            WritingHeading(t(.dictGoDeeper), icon: "brain.head.profile")
            if n.t("m") { section("m", "lightbulb.fill", t(.dictMnemonic), "") { Text(n.s("m")).lkTextSafe(LKType.bodyMd).foregroundStyle(ink) } }
            if n.t("e") {
                let errs = DeepNotes.parseErrors(n.s("e"))
                section("e", "exclamationmark.triangle.fill", t(.modelCommonMistakes), errs.pairs.isEmpty ? "" : String(errs.pairs.count)) { mistakes(errs) }
            }
            if n.t("u") { section("u", "target", t(.dictInTheExam), "") { usage(DeepNotes.parseUsage(n.s("u"))) } }
            if n.t("f") {
                let fam = DeepNotes.parseFamily(n.s("f"), head: word)
                if !fam.isEmpty { section("f", "tree", t(.usageWordFamily), String(fam.filter { $0.word != nil }.count)) { family(fam) } }
            }
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel(Text(verbatim: t(.dictGoDeeper)))
    }

    private func section<C: View>(_ k: String, _ icon: String, _ title: String, _ meta: String, @ViewBuilder _ body: () -> C) -> some View {
        let content = body()
        return DisclosureGroup(isExpanded: isOpen(k)) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) { content }.padding(.top, LKSpacing.spaceXs)
        } label: {
            HStack(spacing: LKSpacing.spaceXs) {
                Image(systemName: icon).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                Text(verbatim: title).lkTextSafe(LKType.titlePill).foregroundStyle(ink)
                if !meta.isEmpty { Text(verbatim: meta).lkTextSafe(LKType.labelBadge).foregroundStyle(dim) }
            }
            .frame(minHeight: LKFrame.shared.minTap, alignment: .leading)
        }
        .tint(LKColor.secondary.resolve(scheme))
    }

    @ViewBuilder private func mistakes(_ e: DeepNotes.Errors) -> some View {
        ForEach(Array(e.pairs.enumerated()), id: \.offset) { _, p in
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                    Image(systemName: "xmark.circle.fill").foregroundStyle(LKColor.error.resolve(scheme)).accessibilityLabel(Text(verbatim: t(.usageWrong)))
                    (Text(verbatim: p.wrong).strikethrough().foregroundStyle(dim) + Text(verbatim: p.wrongNote.isEmpty ? "" : " " + p.wrongNote).foregroundStyle(dim)).lkTextSafe(LKType.bodyMd)
                }
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                    Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityLabel(Text(verbatim: t(.usageRight)))
                    (Text(verbatim: p.right).bold().foregroundStyle(ink) + Text(verbatim: p.rightNote.isEmpty ? "" : " " + p.rightNote).foregroundStyle(dim)).lkTextSafe(LKType.bodyMd)
                }
            }
            .accessibilityElement(children: .combine)
        }
        ForEach(Array(e.notes.enumerated()), id: \.offset) { _, line in Text(verbatim: line).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
    }
    @ViewBuilder private func usage(_ items: [DeepNotes.Usage]) -> some View {
        ForEach(Array(items.enumerated()), id: \.offset) { _, x in
            HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                if !x.tag.isEmpty { WritingTag(text: x.tag, tint: LKColor.tertiary).englishText() }
                Text(verbatim: x.text).lkTextSafe(LKType.bodyMd).foregroundStyle(ink)
            }
        }
    }
    private func family(_ items: [DeepNotes.Family]) -> some View {
        FlowLayout {
            ForEach(Array(items.enumerated()), id: \.offset) { _, x in
                if let w = x.word {
                    (Text(verbatim: w).foregroundStyle(ink) + Text(verbatim: x.pos.isEmpty ? "" : " " + x.pos).foregroundStyle(dim)).lkTextSafe(LKType.bodyMd).englishText()
                        .padding(.horizontal, LKSpacing.spaceXs).padding(.vertical, 6)
                        .background(Capsule().fill(LKColor.surfaceContainerHigh.resolve(scheme)))
                } else {
                    Text(verbatim: x.text).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
                }
            }
        }
    }
}
