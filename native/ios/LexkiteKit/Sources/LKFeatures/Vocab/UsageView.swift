import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/usage (landing), #/usage?c=<prep|verb|adv|struct|pair> (one topic list + quick practice) and #/usage/<word> (everything the app knows
/// about how a word is used + quick practice). Logic = `UsageStore` (port of usage-core.js); data = the web DSL files (`WritingRemoteContent`).
struct UsageView: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var store: UsageStore?
    @State private var failed = false
    @State private var q = ""
    @State private var sub = ""
    @State private var filter = ""
    @State private var prep = ""
    @State private var voice = LKVoicePlayer()
    @State private var saved: Set<String> = []
    @State private var notes: JSON?
    @FocusState private var focused: Bool
    let fixedSeed: Double?

    static let popular = "interested depend good arrive responsible stop remember suggest hard late affect despite".split(separator: " ").map(String.init)
    struct Cat: Identifiable { let id: String, kind: String, icon: String }
    static let cats = [Cat(id: "prep", kind: "p", icon: "arrow.triangle.merge"), Cat(id: "verb", kind: "v", icon: "puzzlepiece"), Cat(id: "adv", kind: "a", icon: "mappin.and.ellipse"),
                       Cat(id: "struct", kind: "s", icon: "building.2"), Cat(id: "pair", kind: "c", icon: "arrow.left.arrow.right")]
    struct KindGroup: Identifiable { let id: String; let es: [JSON] }
    private func uniq(_ a: [String]) -> [String] { var seen = Set<String>(); return a.filter { seen.insert($0).inserted } }
    /// verb-pattern code → formula (English study content, not translated)
    static let formula = ["to": "+ to-V", "ing": "+ V-ing", "oto": "+ O + to-V", "obare": "+ O + V", "bare": "+ V", "that": "+ that-clause", "sub": "+ that + S + (should) V",
                          "oing": "+ O + V-ing", "ov3": "+ O + V3", "wh": "+ how/what… + to-V", "pass": "be + V3 + to-V", "ping": "+ preposition + V-ing", "oo": "+ O + O", "o": "+ O"]

    init(route: AppRoute, store: UsageStore? = nil, seed: Double? = nil) {
        self.route = route; fixedSeed = seed
        _store = State(initialValue: store)
        _q = State(initialValue: route.arg ?? "")
    }

    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }
    private var accent: Color { LKColor.secondary.resolve(scheme) }
    private var vi: Bool { services.uiLang == "vi" }
    /// meaning text in the learner's language: Vietnamese notes for Vietnamese, the English ones otherwise
    private func mean(_ x: JSON) -> String { let a = vi ? x.s("vi") : x.s("en"); return a.isEmpty ? (vi ? x.s("en") : "") : a }

    var body: some View {
        WritingPage(title: t(.dictUsage)) {
            VStack(alignment: .leading, spacing: 4) {
                Text(t(.usageDependentPrepositionsVerbPatterns)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            }
            if let U = store {
                searchBox(U)
                if let arg = route.arg { wordPage(U, arg) }
                else if let c = route.query["c"], let cat = Self.cats.first(where: { $0.id == c }) { category(U, cat) }
                else { landing(U) }
            } else if failed {
                WritingNotice(icon: "wifi.slash", text: t(.dictCheckTheSpellingOr), action: (t(.actionRetry), { failed = false; Task { await load() } }))
            } else { WritingSkeleton(rows: 5) }
        }
        .task { if store == nil { await load() } }
        .onDisappear { voice.stop() }
    }
    private func load() async {
        if let u = await WritingRemoteContent.shared.usage() { store = u } else { failed = true }
    }

    // MARK: labels
    private func kindName(_ k: String) -> String {
        switch k { case "p": return t(.usagePreposition); case "v": return t(.usageVerbPattern); case "a": return t(.usageAdverb); case "s": return t(.usageStructure); default: return t(.usageConfusing) }
    }
    private func catText(_ id: String) -> (String, String) {
        switch id {
        case "prep": return (t(.usageDependentPreposition), t(.usageAdjectivesVerbsAndNouns))
        case "verb": return (t(.usageVerbToVV), t(.usageEnjoyDoingDecideTo))
        case "adv": return (t(.usageAdverbsPosition), t(.usageHardHardlyLateLately))
        case "struct": return (t(.usageUsefulSentenceStructuresIelts), t(.usageItIsAdjTo))
        default: return (t(.usageConfusingWords), t(.usageAffectEffectSayTell))
        }
    }
    private func prepSub(_ s: String) -> String { s == "a" ? t(.usageAdjectivePreposition) : s == "v" ? t(.usageVerbPreposition) : t(.usageNounPreposition) }
    private func advSub(_ s: String) -> String {
        switch s { case "irr": return t(.usageSpecialForms); case "freq": return t(.usageFrequency); case "deg": return t(.usageDegree); case "focus": return t(.usageFocus)
        case "view": return t(.usagePosition); case "man": return t(.usageManner); default: return s }
    }
    private func patternName(_ c: String) -> String {
        switch c {
        case "to": return t(.usageToInfinitive); case "ing": return t(.usageGerundVIng); case "oto": return t(.usageObjectToV); case "obare": return t(.usageObjectBareInfinitiveNo)
        case "bare": return t(.usageBareInfinitiveNoTo); case "that": return t(.usageThatClause); case "sub": return t(.usageThatSubjectBaseVerb); case "oing": return t(.usageObjectVIng)
        case "ov3": return t(.usageObjectV3SomeoneElse); case "wh": return t(.usageQuestionWordToV); case "pass": return t(.usagePassiveForm); case "ping": return t(.usagePrepositionVIng)
        case "oo": return t(.usageTwoObjects); default: return t(.usageDirectObjectNoPreposition)
        }
    }
    private func position(_ p: String) -> (String, String)? {
        switch p {
        case "front": return (t(.usageFront), t(.usageBeforeTheSubjectOften))
        case "mid": return (t(.usageMid), t(.usageBeforeMainVerbsAfter))
        case "end": return (t(.usageEnd), t(.usageAfterTheVerbAnd))
        default: return nil
        }
    }
    private func register(_ r: String) -> String { r == "academic" ? t(.usageAcademicGoodForIelts) : r == "spoken" ? t(.usageSpoken) : r == "neutral" ? t(.usageNeutral) : r }

    // MARK: search
    private func go(_ v: String, _ U: UsageStore) {
        let s = v.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty else { return }
        focused = false
        services.router.open(AppRoute("usage", arg: U.resolve(s) ?? s.lowercased()))
    }
    private func searchBox(_ U: UsageStore) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: LKSpacing.spaceXs) {
                WritingSearchField(placeholder: t(.usageTypeAWordE), clearLabel: t(.actionClose), text: $q, onSubmit: { go(q, U) }).focused($focused).accessibilityLabel(t(.usageFindHowAWord))
                Button(t(.usageShow)) { go(q, U) }.buttonStyle(WritingSecondaryButtonStyle())
            }
            let list = focused ? U.suggest(q, 8) : []
            if !list.isEmpty {
                VStack(spacing: 0) {
                    ForEach(list, id: \.self) { w in
                        Button { go(w, U) } label: {
                            HStack { Text(w).lkTextSafe(LKType.headlineSm).foregroundStyle(ink).englishText(); Spacer(minLength: 0) }
                                .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .accessibilityLabel(t(.usageWordSuggestions))
                .padding(.vertical, 4)
                .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
                .padding(.top, 6)
            }
        }
    }

    // MARK: landing
    @ViewBuilder private func landing(_ U: UsageStore) -> some View {
        WritingHeading(t(.verbMostSearched), icon: "star.fill")
        FlowLayout { ForEach(Self.popular, id: \.self) { w in WritingChip(text: w, english: true) { services.router.open(AppRoute("usage", arg: w)) } } }
        WritingHeading(t(.usageTopics), icon: "books.vertical")
        ForEach(Self.cats) { c in
            let (name, desc) = catText(c.id)
            Button { services.router.open(AppRoute("usage", query: ["c": c.id])) } label: {
                HStack(spacing: LKSpacing.spaceSm) {
                    Image(systemName: c.icon).font(.system(size: 20, weight: .bold)).foregroundStyle(accent).frame(width: 32)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(name).lkTextSafe(LKType.titlePill).foregroundStyle(ink).multilineTextAlignment(.leading)
                        Text(desc).lkTextSafe(LKType.bodySm).foregroundStyle(dim).multilineTextAlignment(.leading)
                        Text(t(.usageEntries, ["n": U.list(c.kind).count])).lkTextSafe(LKType.labelMetric).foregroundStyle(accent)
                    }
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.forward").foregroundStyle(dim)
                }
                .padding(LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap + 24).frame(maxWidth: .infinity, alignment: .leading)
                .tactile(fill: LKColor.surfaceContainer, radius: 16).padding(.bottom, 4)
            }
            .buttonStyle(LKPressStyle())
            .accessibilityElement(children: .combine)
        }
        WritingCard {
            WritingHeading(t(.usageHowToRememberWord), icon: "lightbulb")
            ForEach([t(.usageLearnWholeChunksNot), t(.usageReadTheExamplesAloud), t(.usageSavePhrasesToYour), t(.usageDoTheQuickPractice)], id: \.self) { line in
                Label { Text(line).lkTextSafe(LKType.bodyMd).foregroundStyle(ink) } icon: { Image(systemName: "checkmark.circle").foregroundStyle(accent) }
            }
        }
    }
    // MARK: category
    @ViewBuilder private func category(_ U: UsageStore, _ cat: Cat) -> some View {
        let (name, desc) = catText(cat.id)
        let all = U.list(cat.kind)
        Button { services.router.open(AppRoute("usage")) } label: { Label(t(.usageAllTopics), systemImage: "chevron.backward") }.buttonStyle(WritingSecondaryButtonStyle())
        WritingHeading(name, icon: cat.icon)
        Text(desc).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
        if cat.kind == "a" { posExplainer }
        let filters = subFilters(cat.kind)
        if filters.count > 1 {
            FlowLayout { ForEach(filters, id: \.0) { f in WritingChip(text: f.1, selected: sub == f.0) { sub = f.0 } } }.accessibilityLabel(t(.usageFilterByGroup))
        }
        WritingSearchField(placeholder: t(.verbQuickFilter), clearLabel: t(.actionClose), text: $filter).accessibilityLabel(t(.usageFilterTheList))
        if cat.kind == "p" {
            FlowLayout { ForEach(["in", "on", "at", "for", "to", "of", "with", "about", "from"], id: \.self) { p in WritingChip(text: p, selected: prep == p, english: true) { prep = prep == p ? "" : p } } }
                .accessibilityLabel(t(.usageFilterByPreposition))
        }
        let kept = all.filter { keep($0, cat.kind) }
        let rows = cat.kind == "s" || cat.kind == "c" ? kept : kept.sorted { $0.s("key").localizedCompare($1.s("key")) == .orderedAscending }
        Text(t(.usageEntries, ["n": rows.count])).lkTextSafe(LKType.bodySm).foregroundStyle(dim).accessibilityAddTraits(.updatesFrequently)
        if rows.isEmpty { WritingNotice(icon: "text.magnifyingglass", text: t(.usageNoMatchingEntries)) }
        LazyVStack(spacing: 0) {
            ForEach(Array(rows.prefix(300).enumerated()), id: \.offset) { _, e in
                Button { services.router.open(AppRoute("usage", arg: e.s("key"))) } label: { row(e, cat.kind) }.buttonStyle(.plain)
                Divider().overlay(LKColor.outlineVariant.resolve(scheme))
            }
        }
        quiz(U, all, title: t(.usageQuickPracticeWholeTopic))
    }
    private func subFilters(_ k: String) -> [(String, String)] {
        let all = (String(), t(.vocabAll))
        switch k {
        case "p": return [all, ("a", prepSub("a")), ("v", prepSub("v")), ("n", prepSub("n"))]
        case "v": return [all, ("to", "+ to-V"), ("ing", "+ V-ing"), ("both", t(.usageBothMeaningChanges)), ("oto", "+ O + to-V"), ("obare", "+ O + V"), ("that", "+ that"), ("o", t(.usageNoPreposition))]
        case "a": return [all] + UsageStore.subs["a"]!.map { ($0, advSub($0)) }
        case "s": return [all, ("ielts", t(.usageGoodForIeltsWriting))]
        default: return [all]
        }
    }
    private func keep(_ e: JSON, _ k: String) -> Bool {
        let items = e.list("items")
        if k == "p", !sub.isEmpty, e.s("sub") != sub { return false }
        if k == "p", !prep.isEmpty, !items.contains(where: { UsageStore.norm($0.s("h")).split(separator: " ").last.map(String.init) == prep }) { return false }
        if k == "v", !sub.isEmpty {
            let codes = Set(items.map { $0.s("h") })
            let ok = sub == "both" ? (codes.contains("to") && codes.contains("ing") && !e.list("notes").isEmpty) : codes.contains(sub)
            if !ok { return false }
        }
        if k == "a", !sub.isEmpty, e.s("sub") != sub { return false }
        if k == "s", sub == "ielts", !e.list("reg").contains(where: { $0.s("r") == "academic" }) { return false }
        let f = UsageStore.norm(filter)
        if !f.isEmpty {
            let hay = UsageStore.norm(([e.s("key"), e.s("f")] + items.map { $0.s("h") } + e.strs("k")).joined(separator: " "))
            if !hay.contains(f) { return false }
        }
        return true
    }
    private func headOf(_ h: String) -> String { h.replacingOccurrences(of: "\\s*\\([^)]*\\)\\s*$", with: "", options: .regularExpression) }
    private func posOf(_ h: String) -> String {
        guard let re = try? NSRegularExpression(pattern: "\\(([^)]+)\\)\\s*$"), let m = re.firstMatch(in: h, range: NSRange(h.startIndex..., in: h)), let r = Range(m.range(at: 1), in: h) else { return "" }
        return String(h[r])
    }
    private func rowText(_ e: JSON, _ k: String) -> (title: String, subtitle: String) {
        let items = e.list("items")
        let heads = uniq(items.map { $0.s("h") })
        let title: String, subtitle: String
        switch k {
        case "p": title = e.s("key") + " " + heads.joined(separator: " / "); subtitle = items.prefix(2).map { mean($0) }.joined(separator: " · ")
        case "v": title = e.s("key"); subtitle = heads.compactMap { Self.formula[$0] }.joined(separator: "  ·  ")
        case "a": title = heads.joined(separator: " / "); subtitle = items.first.map { mean($0) } ?? ""
        case "s": title = e.s("f"); subtitle = e.list("notes").first.map { mean($0) } ?? ""
        default: title = items.map { headOf($0.s("h")) }.joined(separator: " ↔ "); subtitle = items.map { mean($0) }.joined(separator: " · ")
        }
        return (title, subtitle)
    }
    private func row(_ e: JSON, _ k: String) -> some View {
        let (title, subtitle) = rowText(e, k)
        return rowBody(title, subtitle)
    }
    private func rowBody(_ title: String, _ subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText().frame(maxWidth: .infinity, alignment: .leading)
            if !subtitle.isEmpty { Text(subtitle).lkTextSafe(LKType.bodySm).foregroundStyle(dim).lineLimit(2).frame(maxWidth: .infinity, alignment: .leading) }
        }
        .padding(.horizontal, LKSpacing.spaceXs).padding(.vertical, 6).frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
    }
    private var posExplainer: some View {
        WritingCard {
            WritingHeading(t(.usageWhereDoAdverbsGo), icon: "mappin.and.ellipse")
            ForEach([("front", "[Fortunately], nobody was hurt."), ("mid", "She [always] walks to work."), ("end", "Read the instructions [carefully].")], id: \.0) { p, ex in
                if let (n, d) = position(p) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(n).lkTextSafe(LKType.titlePill).foregroundStyle(ink)
                        Text(d).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
                        example(ex)
                    }
                }
            }
            Text(t(.usageDonTPutAn)).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.error.resolve(scheme))
        }
    }

    // MARK: word page
    @ViewBuilder private func wordPage(_ U: UsageStore, _ arg: String) -> some View {
        let key = U.resolve(arg), raw = UsageStore.norm(arg)
        if let key, case let found = entries(U, key), !found.isEmpty {
            let sections = found
            let all = sections.flatMap(\.es)
            WritingCard {
                HStack(alignment: .firstTextBaseline) {
                    Text(key).lkTextSafe(LKType.displayHeroMobile).foregroundStyle(ink).englishText().minimumScaleFactor(0.6).lineLimit(2)
                    Spacer(minLength: 0)
                    WritingSayButton(text: key, label: t(.usagePlaySentence), voice: voice, word: true)
                }
                FlowLayout { ForEach(sections) { g in WritingTag(text: kindName(g.id)) } }
                FlowLayout {
                    Button { services.router.open(AppRoute("dict", arg: key)) } label: { Label(t(.verbSeeMeaning), systemImage: "book") }.buttonStyle(WritingSecondaryButtonStyle())
                    if let v = verbBase(key) { Button { services.router.open(AppRoute("verb", arg: v)) } label: { Label(t(.dictVerbForms), systemImage: "textformat.abc") }.buttonStyle(WritingSecondaryButtonStyle()) }
                    saveButton(key, vi: "", en: "", ex: "")
                }
            }
            ForEach(sections) { g in kindSection(g.id, g.es, current: key) }
            collocations(all)
            registers(all.flatMap { $0.list("reg") })
            mistakes(all.flatMap { $0.list("mis") })
            family(key)
            if let n = notes {
                // mnemonic + exam use (+ common mistakes when the entries carry none), the same note the review card shows
                DeepNotesView(word: key, preset: .obj([("m", n["m"] ?? ""), ("u", n["u"] ?? ""), ("e", all.contains { !$0.list("mis").isEmpty } ? "" : (n["e"] ?? ""))]))
            }
            let lessons = Array(Set(all.flatMap { $0.strs("lessons") })).sorted(), rel = uniq(all.flatMap { $0.strs("rel") }.filter { $0 != key })
            if !lessons.isEmpty || !rel.isEmpty {
                WritingCard {
                    WritingHeading(t(.usageSeeDetails), icon: "graduationcap")
                    FlowLayout { ForEach(lessons, id: \.self) { l in WritingChip(text: l, system: "graduationcap", english: true) { services.router.open(AppRoute("grammar", arg: l)) } } }
                    if !rel.isEmpty { Text(t(.usageRelatedWords)).lkTextSafe(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim); FlowLayout { ForEach(rel, id: \.self) { w in WritingChip(text: w, english: true) { services.router.open(AppRoute("usage", arg: w)) } } } }
                }
            }
            quiz(U, all, title: t(.usageQuickPractice))
        } else {
            fallback(U, raw)
        }
    }
    /// the entries covering a word per kind; a structure / pair id (no word index entry) is looked up by id
    private func entries(_ U: UsageStore, _ key: String) -> [KindGroup] {
        let r = U.lookup(key)
        var out = UsageStore.kinds.map { KindGroup(id: $0, es: r.list($0)) }.filter { !$0.es.isEmpty }
        if out.isEmpty { out = U.chunksOf(key).map { String($0) }.compactMap { k in U.byId(k, key).map { KindGroup(id: k, es: [$0]) } } }
        return out
    }
    private func verbBase(_ key: String) -> String? {
        guard let V = WritingVerbs.shared, key.range(of: "^[a-z]+$", options: .regularExpression) != nil, let r = V.resolve(key), !r.t("unknown"), !r.t("guess") else { return nil }
        return r.s("base")
    }

    @ViewBuilder private func fallback(_ U: UsageStore, _ w: String) -> some View {
        let near = U.near(w, 6), sug = U.suggest(w, 6).filter { !near.contains($0) }
        WritingCard {
            HStack { Text(w.isEmpty ? "—" : w).lkTextSafe(LKType.displayHeroMobile).foregroundStyle(ink).englishText(); Spacer(minLength: 0); if !w.isEmpty { WritingSayButton(text: w, label: t(.usagePlaySentence), voice: voice, word: true) } }
            Text(t(.usageThereAreNoUsage, ["w": w])).lkTextSafe(LKType.bodyMd).foregroundStyle(ink)
            Button { services.router.open(AppRoute("dict", arg: w)) } label: { Label(t(.verbSeeMeaning), systemImage: "book") }.buttonStyle(WritingSecondaryButtonStyle())
        }
        if !near.isEmpty || !sug.isEmpty {
            WritingHeading(t(.usageYouMightBeLooking), icon: "magnifyingglass")
            FlowLayout { ForEach(near + sug, id: \.self) { x in WritingChip(text: x, english: true) { services.router.open(AppRoute("usage", arg: x)) } } }
        }
        WritingHeading(t(.usageTopics), icon: "books.vertical")
        FlowLayout { ForEach(Self.cats) { c in WritingChip(text: catText(c.id).0, system: c.icon) { services.router.open(AppRoute("usage", query: ["c": c.id])) } } }
    }

    // MARK: sections
    private func example(_ src: String) -> some View {
        let x = UsageStore.example(src), a = x.s("ans")
        var s = AttributedString(x.s("pre"))
        var hl = AttributedString(a); hl.foregroundColor = accent; hl.inlinePresentationIntent = .stronglyEmphasized
        s += hl; s += AttributedString(x.s("post"))
        return HStack(alignment: .top) {
            Text(s).lkTextSafe(LKType.bodyLg).foregroundStyle(ink).englishText().frame(maxWidth: .infinity, alignment: .leading)
            WritingSayButton(text: x.s("text"), label: t(.verbPlayExample), voice: voice)
        }
    }
    private func tipBox(_ text: String) -> some View {
        Label { Text(text).lkTextSafe(LKType.bodyMd).foregroundStyle(ink) } icon: { Image(systemName: "lightbulb.fill").foregroundStyle(LKColor.tertiary.resolve(scheme)) }
    }
    @ViewBuilder private func kindSection(_ k: String, _ es: [JSON], current: String) -> some View {
        let notes = es.flatMap { $0.list("notes") }
        switch k {
        case "p":
            WritingHeading(t(.usageDependentPreposition), icon: "arrow.triangle.merge")
            Text(t(.usageChangeThePrepositionAnd)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            ForEach(Array(es.enumerated()), id: \.offset) { _, e in
                ForEach(Array(e.list("items").enumerated()), id: \.offset) { _, x in
                    let phrase = e.s("key") + " " + x.s("h")
                    WritingCard {
                        HStack(alignment: .top) { Text(phrase).lkTextSafe(LKType.headlineSm).foregroundStyle(ink).englishText().frame(maxWidth: .infinity, alignment: .leading)
                            WritingSayButton(text: phrase, label: t(.usagePlaySentence), voice: voice) }
                        FlowLayout { WritingTag(text: prepSub(e.s("sub"))); saveButton(phrase, vi: x.s("vi"), en: x.s("en"), ex: x.strs("ex").first.map { UsageStore.example($0).s("text") } ?? "") }
                        Text(mean(x)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
                        ForEach(x.strs("ex"), id: \.self) { example($0) }
                    }
                }
                ForEach(e.strs("ex"), id: \.self) { example($0) }
            }
        case "v":
            WritingHeading(t(.usageVerbPatterns), icon: "puzzlepiece")
            Text(t(.usageWhatFollowsThisVerb)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            ForEach(Array(es.enumerated()), id: \.offset) { _, e in
                ForEach(Array(e.list("items").enumerated()), id: \.offset) { _, x in
                    WritingCard {
                        Text(e.s("key") + " " + (Self.formula[x.s("h")] ?? x.s("h"))).lkTextSafe(LKType.headlineSm).foregroundStyle(accent).englishText()
                        Text(patternName(x.s("h"))).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
                        if !mean(x).isEmpty { Text(mean(x)).lkTextSafe(LKType.bodyMd).foregroundStyle(ink) }
                        ForEach(x.strs("ex"), id: \.self) { example($0) }
                    }
                }
                ForEach(e.strs("ex"), id: \.self) { example($0) }
            }
        case "a":
            WritingHeading(t(.usageAdverbsFormPosition), icon: "mappin.and.ellipse")
            ForEach(Array(es.enumerated()), id: \.offset) { _, e in
                WritingCard {
                    ForEach(Array(e.list("items").enumerated()), id: \.offset) { _, x in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(x.s("h")).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                            Text(mean(x)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
                            ForEach(x.strs("ex"), id: \.self) { example($0) }
                        }
                    }
                    FlowLayout { WritingTag(text: advSub(e.s("sub"))); ForEach(e.strs("pos"), id: \.self) { p in if let (n, _) = position(p) { WritingTag(text: n, tint: LKColor.tertiary) } } }
                    ForEach(e.strs("pos"), id: \.self) { p in if let (n, d) = position(p) { Text(n + ": " + d).lkTextSafe(LKType.bodySm).foregroundStyle(dim) } }
                    ForEach(e.strs("ex"), id: \.self) { example($0) }
                }
            }
        case "s":
            WritingHeading(t(.usageSentenceStructures), icon: "building.2")
            ForEach(Array(es.enumerated()), id: \.offset) { _, e in
                WritingCard {
                    Text(e.s("f")).lkTextSafe(LKType.headlineSm).foregroundStyle(accent).englishText()
                    ForEach(Array(e.list("items").enumerated()), id: \.offset) { _, x in
                        Text(x.s("h")).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                        if !mean(x).isEmpty { Text(mean(x)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim) }
                        ForEach(x.strs("ex"), id: \.self) { example($0) }
                    }
                    ForEach(Array(e.list("notes").enumerated()), id: \.offset) { _, n in Text(mean(n)).lkTextSafe(LKType.bodyMd).foregroundStyle(ink) }
                    ForEach(e.strs("ex"), id: \.self) { example($0) }
                    FlowLayout {
                        if e.s("key") != current { Button(t(.usageSeeDetails)) { services.router.open(AppRoute("usage", arg: e.s("key"))) }.buttonStyle(WritingSecondaryButtonStyle()) }
                        ForEach(e.strs("lessons"), id: \.self) { l in WritingChip(text: l, system: "graduationcap", english: true) { services.router.open(AppRoute("grammar", arg: l)) } }
                    }
                }
            }
        default:
            WritingHeading(current.isEmpty ? t(.usageComparison) : t(.usageOftenConfusedWith), icon: "arrow.left.arrow.right")
            ForEach(Array(es.enumerated()), id: \.offset) { _, e in
                WritingCard {
                    ForEach(Array(e.list("items").enumerated()), id: \.offset) { _, x in
                        VStack(alignment: .leading, spacing: 4) {
                            HStack(spacing: 4) {
                                Text(headOf(x.s("h"))).lkTextSafe(LKType.titlePill).foregroundStyle(accent).englishText()
                                if !posOf(x.s("h")).isEmpty { Text("(" + posOf(x.s("h")) + ")").lkTextSafe(LKType.bodySm).foregroundStyle(dim).englishText() }
                            }
                            Text(mean(x)).lkTextSafe(LKType.bodyMd).foregroundStyle(ink)
                            ForEach(x.strs("ex"), id: \.self) { example($0) }
                        }
                    }
                    ForEach(Array(e.list("notes").enumerated()), id: \.offset) { _, n in tipBox(mean(n)) }
                    if e.s("key") != current { Button(t(.usageSeeDetails)) { services.router.open(AppRoute("usage", arg: e.s("key"))) }.buttonStyle(WritingSecondaryButtonStyle()) }
                }
            }
        }
        if k != "c" && k != "s" { ForEach(Array(notes.enumerated()), id: \.offset) { _, n in tipBox(mean(n)) } }
    }

    @ViewBuilder private func collocations(_ all: [JSON]) -> some View {
        let cols = uniq(all.flatMap { $0.strs("col") }).prefix(16)
        if !cols.isEmpty {
            WritingHeading(t(.usageCollocationsWordsThatGo), icon: "link")
            Text(t(.usageTapToListen)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            FlowLayout { ForEach(Array(cols), id: \.self) { c in WritingChip(text: c, system: "speaker.wave.2.fill", english: true) { voice.speak(c, who: "ama") } } }
        }
    }
    @ViewBuilder private func registers(_ list: [JSON]) -> some View {
        if !list.isEmpty {
            WritingHeading(t(.usageRegisterIelts), icon: "graduationcap")
            ForEach(Array(list.enumerated()), id: \.offset) { _, r in
                HStack(alignment: .top, spacing: LKSpacing.spaceXs) { WritingTag(text: register(r.s("r")), tint: LKColor.tertiary); Text(mean(r)).lkTextSafe(LKType.bodyMd).foregroundStyle(ink) }
            }
        }
    }
    @ViewBuilder private func mistakes(_ all: [JSON]) -> some View {
        let list = unique(all)
        if !list.isEmpty {
            WritingHeading(t(.modelCommonMistakes), icon: "exclamationmark.triangle.fill")
            Text(t(.usageMistakesLearnersOftenMake)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            ForEach(Array(list.enumerated()), id: \.offset) { _, m in
                WritingCard {
                    HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(LKColor.error.resolve(scheme)).accessibilityLabel(t(.usageWrong))
                        Text(m.s("w")).lkTextSafe(LKType.bodyLg).strikethrough().foregroundStyle(dim).englishText()
                    }
                    HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityLabel(t(.usageRight))
                        Text(m.s("r")).lkTextSafe(LKType.bodyLg).fontWeight(.bold).foregroundStyle(ink).englishText().frame(maxWidth: .infinity, alignment: .leading)
                        WritingSayButton(text: m.s("r"), label: t(.usagePlaySentence), voice: voice)
                    }
                    if !mean(m).isEmpty { Text(mean(m)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim) }
                }
            }
        }
    }
    private func unique(_ all: [JSON]) -> [JSON] { var seen = Set<String>(); return all.filter { seen.insert($0.s("w")).inserted } }
    /// "Họ từ": other parts of speech of the word (js/notes/<letter>.json, field `f`: "dependent (adj), dependence (n)")
    @ViewBuilder private func family(_ key: String) -> some View {
        let fam = (notes?.s("f") ?? "").split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }.filter { !$0.isEmpty }
        Color.clear.frame(height: 0).task(id: key) { if fixedSeed == nil { notes = await UsageNotes.load(key) } }
        if !fam.isEmpty {
            WritingHeading(t(.usageWordFamily), icon: "tree")
            Text(t(.usageOtherPartsOfSpeech)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            FlowLayout {
                ForEach(fam, id: \.self) { f in
                    let w = headOf(f).split(separator: "/").first.map { $0.trimmingCharacters(in: .whitespaces) } ?? f
                    WritingChip(text: f, english: true) { services.router.open(AppRoute(store?.resolve(w) != nil ? "usage" : "dict", arg: store?.resolve(w) ?? w)) }
                }
            }
        }
    }

    // MARK: save a phrase
    @ViewBuilder private func saveButton(_ phrase: String, vi viText: String, en: String, ex: String) -> some View {
        let done = saved.contains(phrase)
        Button {
            Task {
                let entry = JSON.obj([("word", .string(phrase.replacingOccurrences(of: "\\bsb\\b ", with: "", options: .regularExpression))), ("vi", .string(self.vi ? viText : "")), ("def", .string(self.vi ? "" : en)),
                                      ("pos", "phrase"), ("ex", .string(ex)), ("emoji", "🧩"), ("topic", "phrases")])
                if await WritingCards.add(entry, services: services) { saved.insert(phrase) }
            }
        } label: { Label(done ? t(.revSaved) : t(.usageSaveToMyWords), systemImage: done ? "checkmark" : "plus") }
        .buttonStyle(WritingSecondaryButtonStyle()).disabled(done).fixedSize()
        .accessibilityLabel(done ? t(.usageSavedToYourWords, ["w": phrase]) : t(.usageSaveToMyWords))
    }

    // MARK: quick practice
    @ViewBuilder private func quiz(_ U: UsageStore, _ entries: [JSON], title: String) -> some View {
        UsageQuiz(store: U, entries: entries, title: title, voice: voice, seed: fixedSeed)
    }
}

/// js/notes/<letter>.json → the note of one word (word family). Cached on disk by `LessonRemote`.
enum UsageNotes {
    static func load(_ w: String) async -> JSON? {
        let c = w.first.map { $0.isASCII && $0.isLetter ? String($0) : "_" } ?? "_"
        guard let text = await LessonRemote.shared.text("js/notes/\(c).json"), let j = try? JSON.parse(text) else { return nil }
        return j[w]
    }
}

/// "Luyện nhanh": 5 fill-in-the-blank questions with 2–4 choices, instant result, score + "another set".
struct UsageQuiz: View {
    let store: UsageStore, entries: [JSON], title: String, voice: LKVoicePlayer
    @State private var seed: Double
    @State private var chosen: [Int: String] = [:]
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    init(store: UsageStore, entries: [JSON], title: String, voice: LKVoicePlayer, seed: Double?) {
        self.store = store; self.entries = entries; self.title = title; self.voice = voice
        _seed = State(initialValue: seed ?? Double(Int(Date().timeIntervalSince1970) % 100_000))
    }
    var body: some View {
        let qs = store.quiz(entries, n: 5, seed: seed)
        if qs.count >= 3 {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                WritingHeading(title, icon: "target")
                Text(t(.usageChooseTheCorrectAnswer)).lkTextSafe(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                ForEach(Array(qs.enumerated()), id: \.offset) { i, q in question(i, q) }
                if chosen.count == qs.count { score(qs) }
            }
        }
    }
    private func state(_ q: JSON, _ c: String, _ pick: String?) -> LessonOption.State {
        guard let pick else { return .idle }
        if c == q.s("ans") { return .correct }
        return c == pick ? .wrong : .dim
    }
    private func question(_ i: Int, _ q: JSON) -> some View {
        let pick = chosen[i]
        return WritingCard {
            Text(t(.usageQ, ["n": i + 1])).lkTextSafe(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            (Text(q.s("pre")) + Text(pick == nil ? " ____ " : q.s("ans")).bold() + Text(q.s("post"))).lkTextSafe(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                .accessibilityLabel(q.s("pre") + t(.usageBlank) + q.s("post"))
            ForEach(Array(q.strs("choices").enumerated()), id: \.offset) { j, c in
                LessonOption(letter: ["A", "B", "C", "D"][min(j, 3)], text: c, state: state(q, c, pick)) {
                    guard chosen[i] == nil else { return }
                    chosen[i] = c
                    voice.speak(q.s("pre") + q.s("ans") + q.s("post"), who: "ama")
                }
                .disabled(pick != nil)
            }
            if let pick {
                let ok = pick == q.s("ans")
                Text(ok ? t(.lessonAwesome) : t(.usageNotQuite) + " " + t(.usageAnswer) + " " + q.s("ans")).lkTextSafe(LKType.titlePill)
                    .foregroundStyle((ok ? LKColor.success : LKColor.error).resolve(scheme)).englishText()
            }
        }
    }
    private func score(_ qs: [JSON]) -> some View {
        let right = qs.indices.filter { chosen[$0] == qs[$0].s("ans") }.count
        return WritingCard(fill: LKColor.surfaceContainerHigh) {
            Text("\(right)/\(qs.count)").lkTextSafe(LKType.headlineLg).foregroundStyle(LKColor.onSurface.resolve(scheme))
            Text(right == qs.count ? t(.usageExcellentYouVeGot) : right >= qs.count - 1 ? t(.usageVeryGoodTakeAnother) : t(.usageReadTheExamplesAbove)).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            Button(t(.usageTryANewSet)) { seed += 1; chosen = [:] }.buttonStyle(WritingSecondaryButtonStyle())
        }
    }
}
