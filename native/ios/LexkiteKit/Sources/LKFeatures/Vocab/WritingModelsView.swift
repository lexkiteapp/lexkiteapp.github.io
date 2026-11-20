import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// Everything the model-answer screens need from the content files, resolved once: prompts (Task 2), chart sets (Task 1), letters (General Training).
struct WritingModelIndex: Sendable {
    var models: [JSON] = [], prompts: [JSON] = [], task1: [JSON] = [], letters: [JSON] = []
    static func load(_ s: WritingContentSource) async -> WritingModelIndex {
        async let m = s.models(), p = s.prompts(), t1 = s.task1(), l = s.letters()
        return WritingModelIndex(models: await m, prompts: await p, task1: await t1, letters: await l)
    }
    func model(_ id: String) -> JSON? { models.first { $0.s("id") == id } }
    func prompt(_ m: JSON) -> JSON? { prompts.first { $0.s("id") == m.s("ref") } }
    func set(_ m: JSON) -> JSON? { task1.first { $0.s("id") == m.s("ref") } }
    func letter(_ m: JSON) -> JSON? { letters.first { $0.s("id") == m.s("ref") } }
}

/// #/models: model answers by Task 2 / Task 1 chart / Task 1 letter, searchable.
struct WritingModelsView: View {
    let route: AppRoute
    let source: WritingContentSource
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var index: WritingModelIndex?
    @State private var tab: String
    @State private var query = ""

    init(route: AppRoute, source: WritingContentSource = WritingRemoteContent.shared, index: WritingModelIndex? = nil, exam: String = "ielts") {
        self.route = route; self.source = source
        _index = State(initialValue: index)
        _tab = State(initialValue: WritingEngine.modelsTab(query: route.query["t"], exam: exam))
    }

    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }

    private func typeName(_ k: String) -> String {
        switch k { case "line": return t(.modelLineGraph); case "bar": return t(.modelBarChart); case "pie": return t(.modelPieChart); case "table": return t(.modelTable); case "process": return t(.modelProcess); case "map": return t(.modelMap); default: return k }
    }
    private func toneName(_ k: String) -> String { k == "formal" ? t(.lettersFormal) : k == "semi-formal" ? t(.lettersSemiFormal) : k == "informal" ? t(.lettersInformal) : k }

    var body: some View {
        WritingPage(title: t(.modelBand8ModelAnswers)) {
            VStack(alignment: .leading, spacing: 4) {
                Text(t(.modelOriginalModelAnswersWith)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            }
            if let ix = index {
                let counts = ["2", "1", "gt"].map { k in (k, ix.models.filter { $0["task"]?.jsToString == k }.count) }
                FlowLayout {
                    ForEach(counts, id: \.0) { k, n in
                        WritingChip(text: (k == "2" ? "Task 2" : k == "1" ? t(.modelTask1Charts) : t(.modelTask1Letters)) + " " + String(n), selected: tab == k) { tab = k }
                    }
                }
                WritingSearchField(placeholder: t(.modelSearchByTopicOr), clearLabel: t(.actionClose), text: $query)
                let rows = WritingEngine.models(ix.models, tab: tab, q: query) { m in info(m, ix) }
                if rows.isEmpty { WritingNotice(icon: "doc.text.magnifyingglass", text: t(.modelNoMatchingModelAnswers)) }
                ForEach(Array(rows.enumerated()), id: \.offset) { _, r in
                    Button { services.router.open(AppRoute("model", arg: r.id)) } label: {
                        HStack(spacing: LKSpacing.spaceSm) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(r.title).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText().multilineTextAlignment(.leading).lineLimit(3)
                                Text([r.kind, r.topic, r.words.map { t(.vocabWords, ["n": $0]) } ?? ""].filter { !$0.isEmpty }.joined(separator: " · ")).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
                            }
                            Spacer(minLength: 0)
                            WritingTag(text: "Band " + r.band, tint: LKColor.success)
                        }
                        .padding(LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap + 12).frame(maxWidth: .infinity, alignment: .leading)
                        .tactile(fill: LKColor.surfaceContainer, radius: 16).padding(.bottom, 4)
                    }
                    .buttonStyle(LKPressStyle())
                }
            } else { WritingSkeleton(rows: 5) }
        }
        .task { if index == nil { index = await WritingModelIndex.load(source) } }
    }

    private func info(_ m: JSON, _ ix: WritingModelIndex) -> (title: String, kind: String, topic: String) {
        if m["task"]?.jsToString == "1" { let d = ix.set(m); return (d?.s("title") ?? m.s("ref"), d.map { typeName($0.s("type")) } ?? "Task 1", "") }
        if m["task"]?.jsToString == "gt" { let l = ix.letter(m); return (l.map { $0.t("titleVi") ? (t.translate(source: $0.s("titleVi")) ?? (services.uiLang == "vi" ? $0.s("titleVi") : $0.s("topic"))) : $0.s("topic") } ?? m.s("ref"), l.map { toneName($0.s("tone")) } ?? t(.modelLetter), "") }
        let p = ix.prompt(m)
        return (p?.s("text") ?? m.s("ref"), p?.s("type") ?? "Task 2", p?.s("topic") ?? "")
    }
}
