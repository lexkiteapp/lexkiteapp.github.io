import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/model/<id>: one band-8 model answer – annotated reading (phrases, linking words, sentence roles, tap to save, free highlight, read aloud),
/// the phrase / linker side lists, outline · vocabulary · pitfalls · band-6 comparison, and the five generated practice modes.
struct WritingModelView: View {
    let route: AppRoute
    let source: WritingContentSource
    let seed: UInt64?
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var index: WritingModelIndex?
    @State private var mode: String
    @State private var annot: Set<String>
    @State private var highlight = false
    @State private var marked: Set<String> = []
    @State private var done: Set<String> = []
    @State private var cards: [JSON] = []
    @State private var pending: (phrase: String, vi: String, sentence: String)?
    @State private var result: (kind: String, right: Int, total: Int)?
    @State private var note: String?
    @State private var reading = false
    @State private var voice = LKVoicePlayer()

    static let modeIcons = ["read": "doc.text", "vocab": "puzzlepiece", "gram": "wrench.and.screwdriver", "link": "link", "copy": "keyboard", "write": "square.and.pencil"]

    init(route: AppRoute, source: WritingContentSource = WritingRemoteContent.shared, index: WritingModelIndex? = nil, mode: String = "read", seed: UInt64? = nil, cards: [JSON] = [],
         done: Set<String> = []) {
        self.route = route; self.source = source; self.seed = seed
        _index = State(initialValue: index); _mode = State(initialValue: mode); _cards = State(initialValue: cards); _done = State(initialValue: done)
        let saved = UserDefaults.standard.string(forKey: "lk.annot2") ?? "ch gl lk role"
        _annot = State(initialValue: Set(saved.split(separator: " ").map(String.init)))
    }

    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }
    private var accent: Color { LKColor.secondary.resolve(scheme) }
    private var vi: Bool { services.uiLang == "vi" }
    private func modeName(_ k: String) -> String {
        switch k { case "read": return t(.modelReadModel); case "vocab": return t(.modelFillInPhrases); case "gram": return t(.modelFixGrammarErrors); case "link": return t(.modelLinkingWords)
        case "copy": return t(.modelTypeTheWholeEssay); default: return t(.modelBuildFromBaseWords) }
    }

    var body: some View {
        WritingPage(title: t(.modelAnnotatedModelAnswer)) {
            if let ix = index {
                if let m = ix.model(route.arg ?? "") { page(m, ix) } else { WritingNotice(icon: "doc.questionmark", text: t(.modelThisModelAnswerIsn)) }
            } else { WritingSkeleton(rows: 6) }
        }
        .task {
            if index == nil { index = await WritingModelIndex.load(source) }
            if services.repo != nil { cards = await WritingCards.cards(services) }
            let d = WritingLocal.dict(WritingLocal.doneKey)[route.arg ?? ""] ?? ""
            if done.isEmpty { done = Set(d.split(separator: ",").map(String.init)) }
            await loadMarks(route.arg ?? "")
        }
        .sheet(isPresented: Binding(get: { pending != nil }, set: { if !$0 { pending = nil } })) {
            if let p = pending {
                WritingPhraseSheet(phrase: p.phrase, meaning: p.vi, sentence: p.sentence, showMeaning: vi, contextTitle: "") { entry, ctx in
                    Task { _ = await WritingCards.add(entry, context: ctx, services: services); cards = await WritingCards.cards(services) }
                }
                .environment(\.l10n, t)
            }
        }
        .onDisappear { voice.stop() }
    }

    // MARK: page
    @ViewBuilder private func page(_ m: JSON, _ ix: WritingModelIndex) -> some View {
        let task = m["task"]?.jsToString ?? ""
        let letter = task == "gt" ? ix.letter(m) : nil, set1 = task == "1" ? ix.set(m) : nil, p2 = task == "2" ? ix.prompt(m) : nil
        let kind: String = letter.map { $0.s("tone") == "formal" ? t(.lettersFormal) : $0.s("tone") == "semi-formal" ? t(.lettersSemiFormal) : t(.lettersInformal) }
            ?? (task == "1" ? (set1.map { typeName($0.s("type")) } ?? "Task 1") : (p2?.s("type") ?? "Task 2"))
        let back = AppRoute.parseHash(WritingEngine.modelBack(m))
        header(m, kind, back, task)
        prompt(m, task: task, letter: letter, set: set1, p2: p2)
        modeTabs(m)
        if mode == "read" { readingPane(m) } else { practice(m) }
    }

    private func typeName(_ k: String) -> String {
        switch k { case "line": return t(.modelLineGraph); case "bar": return t(.modelBarChart); case "pie": return t(.modelPieChart); case "table": return t(.modelTable); case "process": return t(.modelProcess); case "map": return t(.modelMap); default: return k }
    }

    private func header(_ m: JSON, _ kind: String, _ back: AppRoute?, _ task: String) -> some View {
        WritingCard {
            FlowLayout { WritingTag(text: WritingEngine.modelBadge(m)); WritingTag(text: kind, tint: LKColor.onSurfaceVariant); WritingTag(text: "Band " + (m["band"]?.jsToString ?? ""), tint: LKColor.success) }
            FlowLayout {
                if m.t("words") { WritingTag(text: t(.vocabWords, ["n": m.i("words")]), tint: LKColor.onSurfaceVariant) }
                Button { toggleRead(m) } label: { Label(t(.modelListenToEssay), systemImage: reading ? "stop.fill" : "speaker.wave.2.fill") }.buttonStyle(WritingSecondaryButtonStyle())
                if let back { Button { services.router.open(back) } label: { Label(t(.modelWriteThisTaskYourself), systemImage: "square.and.pencil") }.buttonStyle(WritingSecondaryButtonStyle()) }
            }
            if let back { Button { services.router.open(back) } label: { Label(t(.modelBackToTheTask), systemImage: "chevron.backward") }.buttonStyle(WritingSecondaryButtonStyle()) }
        }
    }
    private func toggleRead(_ m: JSON) {
        if reading { voice.stop(); reading = false } else { reading = true; voice.speak(WritingEngine.plain(m.s("text")), who: "ama") { reading = false } }
    }

    private func prompt(_ m: JSON, task: String, letter: JSON?, set: JSON?, p2: JSON?) -> some View {
        WritingCard(fill: LKColor.surfaceContainerHigh) {
            Text(t(.modelTask)).lkTextSafe(LKType.labelBadge).foregroundStyle(dim)
            if let l = letter {
                WritingEnglish(text: l.s("situation"), style: LKType.bodyMd)
                ForEach(l.strs("bullets"), id: \.self) { b in HStack(alignment: .top, spacing: LKSpacing.spaceXs) { Text("•").foregroundStyle(accent); WritingEnglish(text: b, style: LKType.bodyMd) } }
            } else if task == "1" {
                WritingEnglish(text: (set?.s("title") ?? "Task 1 · " + m.s("ref")) + " Summarise the information by selecting and reporting the main features, and make comparisons where relevant.", style: LKType.bodyMd)
                if let set {
                    DisclosureGroup {
                        Task1ChartView(figure: set).padding(.top, LKSpacing.spaceXs)
                        Button { services.router.open(AppRoute("task1", arg: m.s("ref"))) } label: { Label(t(.modelViewChart), systemImage: "chart.bar") }.buttonStyle(WritingSecondaryButtonStyle())
                    } label: {
                        Label(t(.modelViewChart), systemImage: "chart.bar").lkTextSafe(LKType.titlePill).foregroundStyle(ink).frame(minHeight: LKFrame.shared.minTap, alignment: .leading)
                    }
                    .tint(accent)
                }
            } else {
                WritingEnglish(text: p2?.s("text") ?? "Task 2 · " + m.s("ref"), style: LKType.bodyMd)
            }
        }
    }

    private func modeTabs(_ m: JSON) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: LKSpacing.spaceXs) {
                ForEach(WritingEngine.modelModes, id: \.self) { k in
                    WritingChip(text: modeName(k) + (done.contains(k) ? " ✓" : ""), selected: mode == k, system: Self.modeIcons[k]) { mode = k; result = nil }
                        .accessibilityValue(done.contains(k) ? t(.modelCompleted) : "")
                }
            }
        }
    }

    // MARK: reading
    private func chunkSentence(_ m: JSON, _ en: String) -> String { WritingEngine.sentence(containing: en, in: m.s("text")) }

    @ViewBuilder private func readingPane(_ m: JSON) -> some View {
        let paras = WritingEngine.annotated(m.s("text"))
        let chunks = WritingEngine.chunks(m.s("text")), linkers = WritingEngine.linkers(m.s("text"))
        WritingCard {
            FlowLayout {
                toggleChip("ch", t(.modelUsefulPhrases)); toggleChip("gl", t(.modelMeaningsUnderPhrases)); toggleChip("lk", t(.modelLinkingWords)); toggleChip("role", t(.modelSentenceRoles))
                WritingChip(text: t(.modelHighlight), selected: highlight, system: "highlighter") { highlight.toggle(); note = highlight ? t(.modelSelectTextInThe2) : t(.modelHighlightingOff) }
                WritingChip(text: t(.modelClearAllYourHighlights), system: "arrow.counterclockwise") { marked = []; saveMarks(m); note = t(.modelHighlightsCleared) }
            }
            if let note { Text(note).lkTextSafe(LKType.bodySm).foregroundStyle(dim).accessibilityAddTraits(.updatesFrequently) }
            ForEach(Array(paras.enumerated()), id: \.offset) { pi, p in
                let start = chunkOffset(paras, pi)
                VStack(alignment: .leading, spacing: 4) {
                    if let head = p.head, annot.contains("role") { WritingTag(text: t.src(head), tint: LKColor.tertiary) }
                    Text(attributed(p, pi: pi, firstChunk: start)).lkTextSafe(LKType.bodyLg).foregroundStyle(ink).lineSpacing(6).englishText()
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            Text(t(.modelHoverOverOrTap)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
        }
        .environment(\.openURL, OpenURLAction { url in handle(url, m, chunks) })
        WritingCard {
            HStack {
                WritingHeading(t(.modelUsefulPhrases) + " (" + String(chunks.count) + ")", icon: "puzzlepiece")
                Spacer(minLength: 0)
            }
            Button(t(.modelSaveAll)) { Task { await saveAll(m, chunks) } }.buttonStyle(WritingSecondaryButtonStyle()).disabled(chunks.allSatisfy { WritingCards.has($0.en, in: cards) })
            ForEach(Array(chunks.enumerated()), id: \.offset) { _, c in
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 0) {
                        Text(c.en).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                        if vi { Text(c.vi).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                    }
                    Spacer(minLength: 0)
                    let have = WritingCards.has(c.en, in: cards)
                    Button { if !have { Task { await save(m, c.en, c.vi) } } } label: {
                        Image(systemName: have ? "checkmark" : "plus").font(.system(size: 15, weight: .bold)).foregroundStyle(have ? LKColor.success.resolve(scheme) : accent)
                            .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle())
                    }
                    .accessibilityLabel(t(.modelSaveToPhrasebook))
                }
            }
        }
        if !linkers.isEmpty {
            WritingCard {
                WritingHeading(t(.modelLinkingWordsCohesion), icon: "link")
                FlowLayout { ForEach(linkers, id: \.self) { l in WritingTag(text: l, tint: LKColor.tertiary) } }
            }
        }
        extras(m)
    }

    private func toggleChip(_ k: String, _ title: String) -> some View {
        WritingChip(text: title, selected: annot.contains(k)) {
            if annot.contains(k) { annot.remove(k) } else { annot.insert(k) }
            UserDefaults.standard.set(["ch", "gl", "lk", "role"].filter { annot.contains($0) }.joined(separator: " "), forKey: "lk.annot2")
        }
    }
    private func chunkOffset(_ paras: [WritingEngine.Paragraph], _ pi: Int) -> Int {
        paras.prefix(pi).reduce(0) { n, p in n + p.segments.filter { if case .chunk = $0 { return true }; return false }.count }
    }

    /// One paragraph as a styled string: phrases tinted + tappable (save), glosses under them, linkers underlined, roles as small inline labels,
    /// and in highlight mode every sentence is a tappable mark.
    private func attributed(_ p: WritingEngine.Paragraph, pi: Int, firstChunk: Int) -> AttributedString {
        var out = AttributedString()
        var ci = firstChunk, si = 0
        func plain(_ s: String) {
            if highlight || !marked.isEmpty {
                var rest = Substring(s)
                while !rest.isEmpty {
                    let end = rest.firstIndex { ".!?".contains($0) }.map { rest.index(after: $0) } ?? rest.endIndex
                    let piece = String(rest[rest.startIndex..<end]); rest = rest[end...]
                    var a = AttributedString(piece)
                    let key = "\(pi).\(si)"
                    if marked.contains(key) { a.backgroundColor = LKColor.tertiaryContainer.resolve(scheme).opacity(0.55) }
                    if highlight, let u = URL(string: "lkhl:\(key)") { a.link = u }
                    out += a
                    if piece.contains(where: { ".!?".contains($0) }) { si += 1 }
                }
            } else { out += AttributedString(s) }
        }
        for seg in p.segments {
            switch seg {
            case .text(let s): plain(s)
            case .role(let r):
                if annot.contains("role") { var a = AttributedString(" [" + t.src(r) + "] "); a.font = LKType.bodySm.font; a.foregroundColor = LKColor.tertiary.resolve(scheme); out += a }
            case .linker(let l):
                var a = AttributedString(l)
                if annot.contains("lk") { a.underlineStyle = .single; a.foregroundColor = LKColor.tertiary.resolve(scheme); a.inlinePresentationIntent = .stronglyEmphasized }
                out += a
            case .chunk(let en, let vi):
                var a = AttributedString(en)
                if annot.contains("ch") {
                    a.foregroundColor = LKColor.secondary.resolve(scheme); a.inlinePresentationIntent = .stronglyEmphasized
                    a.backgroundColor = LKColor.secondaryContainer.resolve(scheme).opacity(0.35)
                }
                if !highlight, let u = URL(string: "lkchunk:\(ci)") { a.link = u }
                out += a
                if annot.contains("gl"), self.vi { var g = AttributedString(" (" + vi + ")"); g.font = LKType.bodySm.font; g.foregroundColor = LKColor.onSurfaceVariant.resolve(scheme); out += g }
                ci += 1
            }
        }
        return out
    }

    /// Free highlight is kept per model answer under the web's device key `uhl:<id>` (Store). The web keeps DOM ranges (`{v, h}`); native keeps the marked sentences
    /// (`{v: "n:<length>", s: ["paragraph.sentence"…]}`): the version differs, so each side ignores the other's record and never reads it wrongly.
    private func marksVersion(_ m: JSON) -> String { "n:" + String(m.s("text").utf16.count) }
    private func loadMarks(_ id: String) async {
        guard let repo = services.repo, let m = index?.model(id) else { return }
        if let sv = await repo.legacyStore("uhl:" + id), sv.s("v") == marksVersion(m) { marked = Set(sv.strs("s")) }
    }
    private func saveMarks(_ m: JSON) {
        guard let repo = services.repo else { return }
        let value: JSON = marked.isEmpty ? .null : .obj([("v", .string(marksVersion(m))), ("s", .strings(marked.sorted()))])
        let key = "uhl:" + m.s("id")
        Task { await repo.storeLegacy(key, value) }
    }

    private func handle(_ url: URL, _ m: JSON, _ chunks: [(en: String, vi: String)]) -> OpenURLAction.Result {
        let s = url.absoluteString
        if s.hasPrefix("lkchunk:"), let i = Int(s.dropFirst(8)), i < chunks.count {
            let c = chunks[i]
            pending = (c.en, vi ? c.vi : "", chunkSentence(m, c.en))
            return .handled
        }
        if s.hasPrefix("lkhl:") {
            let key = String(s.dropFirst(5))
            if marked.contains(key) { marked.remove(key) } else { marked.insert(key) }
            saveMarks(m)
            return .handled
        }
        return .discarded
    }

    private func save(_ m: JSON, _ en: String, _ viText: String) async {
        let sent = chunkSentence(m, en)
        let r = WritingEngine.phraseEntry(en: en, vi: vi ? viText : "", sentence: sent, task: m["task"]?.jsToString ?? "")
        _ = await WritingCards.add(r.entry, context: r.context, services: services)
        cards = await WritingCards.cards(services)
    }
    private func saveAll(_ m: JSON, _ chunks: [(en: String, vi: String)]) async {
        var n = 0
        for c in chunks where !WritingCards.has(c.en, in: cards) { await save(m, c.en, c.vi); n += 1 }
        note = t(.modelSavedPhrasesToYour, ["n": n])
    }

    @ViewBuilder private func extras(_ m: JSON) -> some View {
        if let outline = m["outline"]?.array, !outline.isEmpty {
            WritingCard {
                WritingHeading(t(.modelOutline), icon: "list.number")
                ForEach(Array(outline.enumerated()), id: \.offset) { i, o in HStack(alignment: .top) { Text("\(i + 1).").foregroundStyle(accent); WritingEnglish(text: o.jsToString, style: LKType.bodyMd) } }
            }
        }
        if let vocab = m["vocab"]?.array, !vocab.isEmpty {
            WritingCard {
                WritingHeading(t(.modelTopicVocabulary), icon: "character.book.closed")
                ForEach(Array(vocab.enumerated()), id: \.offset) { _, w in
                    let a = w.array ?? []
                    VStack(alignment: .leading, spacing: 0) {
                        Text(a.first?.jsToString ?? "").lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                        if vi, a.count > 1 { Text(a[1].jsToString).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                    }
                }
            }
        }
        if let pit = m["pitfalls"]?.array, !pit.isEmpty {
            WritingCard {
                WritingHeading(t(.modelCommonMistakes), icon: "exclamationmark.triangle.fill")
                ForEach(Array(pit.enumerated()), id: \.offset) { _, x in HStack(alignment: .top) { Text("•").foregroundStyle(accent); WritingEnglish(text: x.jsToString, style: LKType.bodyMd) } }
            }
        }
        if let b6 = m["band6"], b6.t("text") {
            DisclosureGroup {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    WritingEnglish(text: b6.s("text"), style: LKType.bodyMd)
                    Text(t(.modelWhyItOnlyReaches)).lkTextSafe(LKType.titlePill).foregroundStyle(ink)
                    ForEach([("TR", "Task Response"), ("CC", "Coherence & Cohesion"), ("LR", "Lexical Resource"), ("GRA", "Grammatical Range & Accuracy")], id: \.0) { k, n in
                        if let note = b6["notes"]?[k]?.string, !note.isEmpty { WritingEnglish(text: k + " · " + n + ": " + note, style: LKType.bodySm, color: LKColor.onSurfaceVariant) }
                    }
                }.padding(.top, 4)
            } label: { Text(t(.modelBand6EssayFor)).lkTextSafe(LKType.titlePill).foregroundStyle(ink).frame(minHeight: LKFrame.shared.minTap, alignment: .leading) }
            .tint(accent)
        }
    }

    // MARK: practice
    @ViewBuilder private func practice(_ m: JSON) -> some View {
        let ctx = WritingPracticeContext(model: m, vi: vi, voice: voice, seed: seed) { kind, right, total in finish(m, kind, right, total) }
        switch mode {
        case "vocab", "link": WritingGapPractice(ctx: ctx, kind: mode)
        case "gram": WritingErrPractice(ctx: ctx)
        case "copy": WritingSlotPractice(ctx: ctx)
        default: WritingLemmaPractice(ctx: ctx)
        }
        if let r = result { resultCard(r) }
    }

    private func finish(_ m: JSON, _ kind: String, _ right: Int, _ total: Int) {
        let r = WritingEngine.modelFinish(right: right, total: total)
        result = (kind, right, total)
        if r.markDone && !done.contains(kind) {
            done.insert(kind)
            WritingLocal.setDict(WritingLocal.doneKey, m.s("id"), done.sorted().joined(separator: ","))
        }
        Task { await WritingReward.xp(r.xp, services: services) }
    }
    private func resultCard(_ r: (kind: String, right: Int, total: Int)) -> some View {
        let f = WritingEngine.modelFinish(right: r.right, total: r.total)
        let modes = WritingEngine.modelModes
        let next = modes.firstIndex(of: r.kind).flatMap { $0 + 1 < modes.count ? modes[$0 + 1] : nil }
        return WritingCard(fill: LKColor.surfaceContainerHigh) {
            Text(t(.paraCorrect, ["right": r.right, "total": r.total, "pct": f.percent])).lkTextSafe(LKType.headlineSm).foregroundStyle((f.percent >= 70 ? LKColor.success : LKColor.error).resolve(scheme))
            Text("+\(f.xp) XP").lkTextSafe(LKType.labelMetric).foregroundStyle(dim)
            if f.markDone, let next { Button(t(.modelNextMode) + " → " + modeName(next)) { mode = next; result = nil }.buttonStyle(WritingSecondaryButtonStyle()) }
        }
        .accessibilityAddTraits(.updatesFrequently)
    }
}
