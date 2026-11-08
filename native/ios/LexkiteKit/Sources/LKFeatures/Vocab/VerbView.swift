import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/verb (search + irregular-verb table) and #/verb/<verb> (5 forms, spelling, endings, the tense table with passive, learner mistakes).
/// Logic = `Verbs` (port of verbs-core.js, tables from the generated verbs.json); this file only draws it.
struct VerbView: View {
    let route: AppRoute
    /// false in fixtures: no network (usage index lookup)
    let live: Bool
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.layoutDirection) private var dir
    @AppStorage("lk.verb.region") private var region = "UK"
    @State private var q: String
    @State private var group = "present"
    @State private var passive = false
    @State private var polarity = "aff"
    @State private var open: Set<String> = ["ps", "pas", "fs", "m-should"]
    @State private var pattern = ""
    @State private var filter = ""
    @State private var hasUsage = false
    /// the library meaning of the verb (web `meaning()`), shown under the headword
    @State private var meaning = ""
    @State private var voice = LKVoicePlayer()
    @FocusState private var focused: Bool

    static let popular = "be have do go get make take come see know think say give find tell".split(separator: " ").map(String.init)
    static let confusing = "lie lay rise raise learn dream can must study stop panic travel".split(separator: " ").map(String.init)
    static let pairs = ["lie": "lay", "lay": "lie", "rise": "raise", "raise": "rise", "say": "tell", "tell": "say", "lend": "borrow", "borrow": "lend", "sit": "set", "set": "sit",
                        "fall": "feel", "feel": "fall", "bring": "take", "take": "bring", "learn": "teach", "teach": "learn", "see": "look", "look": "see", "hear": "listen",
                        "listen": "hear", "do": "make", "make": "do"]

    init(route: AppRoute, live: Bool = true) { self.route = route; self.live = live; _q = State(initialValue: route.arg ?? "") }

    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }

    var body: some View {
        WritingPage(title: t(.verbEnglishVerbConjugator)) {
            if let V = WritingVerbs.shared {
                VStack(alignment: .leading, spacing: 4) {
                    Text(t(.verbThe5VerbForms)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
                }
                searchBox(V)
                if let arg = route.arg, let r = V.resolve(arg) {
                    if r.t("modal") { modalPage(V, r.s("base")) } else { verbPage(V, r) }
                } else { landing(V) }
            } else {
                WritingNotice(icon: "exclamationmark.triangle", text: t(.dictCheckTheSpellingOr))
            }
        }
        .task(id: route.id) {
            hasUsage = false; meaning = ""
            guard live, let arg = route.arg, let r = WritingVerbs.shared?.resolve(arg) else { return }
            let entry = await WordCatalogRemote.shared.catalog().index[r.s("base")]
            if let w = entry, w.s("pos").range(of: "^v\\b|verb", options: .regularExpression) != nil { meaning = t.lang == "vi" ? w.s("vi") : w.s("def") }
            hasUsage = await WritingRemoteContent.shared.usage().map { !$0.chunksOf(arg.lowercased()).isEmpty } ?? false
        }
        .onDisappear { voice.stop() }
    }

    // MARK: search
    private func go(_ v: String, _ V: Verbs) {
        guard let r = V.resolve(v) else { return }
        focused = false
        let arg = r.t("modal") ? r.s("base") : r.s("base") + (r.t("tail") ? " " + r.s("tail") : "")
        services.router.open(AppRoute("verb", arg: arg))
    }
    private func searchBox(_ V: Verbs) -> some View {
        VStack(spacing: 0) {
            WritingSearchField(placeholder: t(.verbTypeAVerbE), clearLabel: t(.actionClose), text: $q, onSubmit: { go(q, V) }).focused($focused)
                .accessibilityLabel(t(.verbSearchForAVerb))
            let list = focused ? (V.suggest(q, 8).array ?? []) : []
            if !list.isEmpty {
                VStack(spacing: 0) {
                    ForEach(Array(list.enumerated()), id: \.offset) { _, x in
                        Button { go(x.s("base"), V) } label: {
                            HStack(spacing: LKSpacing.spaceXs) {
                                Text(x.s("base")).lkTextSafe(LKType.headlineSm).foregroundStyle(ink).englishText()
                                if x.t("via") { Text(x.s("via") + " → " + x.s("base")).lkTextSafe(LKType.bodySm).foregroundStyle(dim).englishText() }
                                Spacer(minLength: 0)
                                if V.isIrregular(x.s("base")) { WritingTag(text: t(.verbIrregular), tint: LKColor.tertiary) }
                            }
                            .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
                .accessibilityLabel(t(.verbVerbSuggestions))
                .padding(.vertical, 4).padding(.top, 2)
                .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
                .padding(.top, 6)
            }
        }
    }

    // MARK: landing
    @ViewBuilder private func landing(_ V: Verbs) -> some View {
        WritingHeading(t(.verbMostSearched), icon: "star.fill")
        FlowLayout { ForEach(Self.popular, id: \.self) { w in WritingChip(text: w, english: true) { services.router.open(AppRoute("verb", arg: w)) } } }
        WritingHeading(t(.verbEasyToConfuse), icon: "arrow.left.arrow.right")
        FlowLayout { ForEach(Self.confusing, id: \.self) { w in WritingChip(text: w, english: true) { services.router.open(AppRoute("verb", arg: w)) } } }
        let all = V.irregularList().array ?? []
        let rows = all.filter { x in
            let f = filter.trimmingCharacters(in: .whitespaces).lowercased()
            return (pattern.isEmpty || x.s("pattern") == pattern) && (f.isEmpty || ([x.s("base")] + x.list("past").map { $0.s("w") } + x.list("pp").map { $0.s("w") }).contains { $0.hasPrefix(f) })
        }
        WritingHeading(t(.verbTableOfIrregularVerbs, ["n": all.count]), icon: "tablecells")
        WritingSearchField(placeholder: t(.verbQuickFilter), clearLabel: t(.actionClose), text: $filter).accessibilityLabel(t(.verbFilterIrregularVerbs))
        FlowLayout {
            WritingChip(text: t(.vocabAll), selected: pattern.isEmpty) { pattern = "" }
            ForEach(["AAA", "ABB", "ABA", "ABC"], id: \.self) { p in WritingChip(text: p, selected: pattern == p, english: true) { pattern = p } }
        }
        .accessibilityLabel(t(.verbFilterByPattern))
        Text(t(.verbVerbs, ["n": rows.count])).lkTextSafe(LKType.bodySm).foregroundStyle(dim).accessibilityAddTraits(.updatesFrequently)
        if rows.isEmpty { WritingNotice(icon: "text.magnifyingglass", text: t(.verbNoMatchingVerbs)) }
        LazyVStack(spacing: 0) {
            ForEach(Array(rows.prefix(400).enumerated()), id: \.offset) { _, x in
                Button { services.router.open(AppRoute("verb", arg: x.s("base"))) } label: {
                    HStack(spacing: LKSpacing.spaceXs) {
                        Text(x.s("base")).lkTextSafe(LKType.titlePill).foregroundStyle(ink).frame(maxWidth: .infinity, alignment: .leading)
                        Text(x.list("past").map { $0.s("w") }.joined(separator: "/")).lkTextSafe(LKType.bodyMd).foregroundStyle(dim).frame(maxWidth: .infinity, alignment: .leading)
                        Text(x.list("pp").map { $0.s("w") }.joined(separator: "/")).lkTextSafe(LKType.bodyMd).foregroundStyle(dim).frame(maxWidth: .infinity, alignment: .leading)
                    }
                    .englishText().padding(.horizontal, LKSpacing.spaceXs).frame(minHeight: LKFrame.shared.minTap).contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                Divider().overlay(LKColor.outlineVariant.resolve(scheme))
            }
        }
    }

    // MARK: modal
    @ViewBuilder private func modalPage(_ V: Verbs, _ base: String) -> some View {
        let m = V.modal(base) ?? []
        WritingCard {
            HStack { Text(base).lkTextSafe(LKType.displayHeroMobile).foregroundStyle(ink).englishText(); Spacer(minLength: 0); WritingSayButton(text: base, label: t(.verbPlayExample), voice: voice, word: true) }
            WritingTag(text: t(.verbModalVerb), tint: LKColor.tertiary)
            Text(t(.verbModalVerbsDoNot)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
            modalRow(t(.verbAffirmative), base == "ought to" ? "You ought to rest." : "You \(base) go.")
            if m.count > 0 { modalRow(t(.verbNegative), m[0] + (m.count > 1 && !m[1].isEmpty ? " / " + m[1] : "")) }
            modalRow(t(.verbQuestion), (base.split(separator: " ").first.map { $0.prefix(1).uppercased() + $0.dropFirst() } ?? "") + " I …?")
            if m.count > 2, !m[2].isEmpty { modalRow(t(.verbPastConditional), m[2]) }
            if m.count > 3, !m[3].isEmpty { modalRow(t(.verbUsedInsteadInOther), m[3]) }
        }
        mistakes(V, base)
    }
    private func modalRow(_ title: String, _ text: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title).lkTextSafe(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim)
            WritingEnglish(text: text, style: LKType.bodyLg)
        }
    }

    // MARK: verb page
    @ViewBuilder private func verbPage(_ V: Verbs, _ r: JSON) -> some View {
        let base = r.s("base"), tail = r.t("tail") ? " " + r.s("tail") : ""
        let f = V.forms(base, region: region), full = base + tail
        if r.s("from") != "base", let first = r.s("input").split(separator: " ").first, String(first) != base {
            let form = t(VerbLabels.from(r.s("from")) ?? .verbPresentForm)
            Text((dir == .rightToLeft ? "\u{200F}" : "") + t(.verbIsTheOf, ["w": String(first), "form": form, "b": base])).lkTextSafe(LKType.bodyMd).foregroundStyle(ink)
                .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
                .accessibilityAddTraits(.updatesFrequently)
        }
        let alts = r.list("alts").filter { $0.s("base") != base }
        if !alts.isEmpty {
            HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                Text(t(.verbOrDidYouMean)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
                FlowLayout { ForEach(alts.map { $0.s("base") }, id: \.self) { a in WritingChip(text: a, english: true) { services.router.open(AppRoute("verb", arg: a)) } } }
            }
        }
        WritingCard {
            HStack(alignment: .firstTextBaseline) {
                Text(full).lkTextSafe(LKType.displayHeroMobile).foregroundStyle(ink).englishText().minimumScaleFactor(0.6).lineLimit(2)
                Spacer(minLength: 0)
                WritingSayButton(text: full, label: t(.verbPlayExample), voice: voice, word: true)
            }
            if !meaning.isEmpty { Text(meaning).lkTextSafe(LKType.bodyMd).foregroundStyle(dim) }
            FlowLayout {
                if f.t("irregular") { WritingTag(text: t(.verbIrregular), tint: LKColor.tertiary) } else { WritingTag(text: t(.verbRegular), tint: LKColor.success) }
                if f.t("partial") { WritingTag(text: t(.verbAlsoHasAnEd)) }
                if f.t("stative") { WritingTag(text: t(.verbStativeVerb)) }
                if !f.t("transitive") { WritingTag(text: t(.verbIntransitive)) }
                if r.t("unknown") || r.t("guess") { WritingTag(text: t(.verbNotInOurList), tint: LKColor.error) }
            }
            FlowLayout {
                HStack(spacing: 0) {
                    ForEach(["UK", "US"], id: \.self) { k in
                        Button { region = k } label: {
                            Text(k).lkTextSafe(LKType.labelMetric).foregroundStyle((region == k ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
                                .frame(minWidth: 56, minHeight: LKFrame.shared.minTap)
                                .background(Capsule().fill(region == k ? LKColor.secondary.resolve(scheme) : Color.clear))
                        }
                        .buttonStyle(.plain).accessibilityAddTraits(region == k ? .isSelected : [])
                    }
                }
                .background(Capsule().fill(LKColor.surfaceContainerHighest.resolve(scheme)))
                .accessibilityElement(children: .contain).accessibilityLabel(t(.verbBritishOrAmericanEnglish))
                Button(t(.verbSeeMeaning)) { services.router.open(AppRoute("dict", arg: full)) }.buttonStyle(WritingSecondaryButtonStyle())
                if hasUsage { Button(t(.verbUsagePatterns)) { services.router.open(AppRoute("usage", arg: full)) }.buttonStyle(WritingSecondaryButtonStyle()) }
            }
        }
        formsGrid(f, tail)
        if (f.list("past") + f.list("pp")).contains(where: { $0.t("tag") }) { Text(t(.verbUkBritishUsageUs)).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
        infoBoxes(V, f)
        tensesSection(V, r, f)
        mistakes(V, base)
        if let p = Self.pairs[base] {
            WritingHeading(t(.verbOftenConfusedWith), icon: "arrow.left.arrow.right")
            FlowLayout { WritingChip(text: p, english: true) { services.router.open(AppRoute("verb", arg: p)) } }
        }
    }

    private func formsGrid(_ f: JSON, _ tail: String) -> some View {
        let boxes: [(String, [JSON])] = [(t(.verbV1BaseForm), [.obj([("w", .string(f.s("base")))])]), (t(.verbV2PastSimple), f.list("past")), (t(.verbV3PastParticiple), f.list("pp")),
                                         ("V-ing", f.list("ing")), (t(.verbVSEsHe), f.list("s"))]
        return VStack(spacing: LKSpacing.spaceXs) {
            ForEach(Array(boxes.enumerated()), id: \.offset) { _, b in
                let words = b.1.map { $0.s("w") + tail }
                HStack(alignment: .center, spacing: LKSpacing.spaceSm) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(b.0).lkTextSafe(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim)
                        ForEach(Array(b.1.enumerated()), id: \.offset) { i, x in
                            HStack(spacing: 4) {
                                Text(words[i]).lkTextSafe(LKType.headlineSm).foregroundStyle(ink).englishText()
                                if x.t("tag") { WritingTag(text: x.s("tag"), tint: LKColor.onSurfaceVariant) }
                            }
                        }
                    }
                    Spacer(minLength: 0)
                    WritingSayButton(text: words.joined(separator: ", "), label: words.joined(separator: ", "), voice: voice, word: true)
                }
                .padding(.horizontal, LKSpacing.spaceSm).padding(.vertical, 4).frame(maxWidth: .infinity, alignment: .leading)
                .tactile(fill: LKColor.surfaceContainer, radius: 16).padding(.bottom, 4)
                .accessibilityElement(children: .combine)
            }
        }
    }

    private func infoBoxes(_ V: Verbs, _ f: JSON) -> some View {
        let rules = f["rules"]
        let anyRule = ["ed", "ing", "s"].contains { !(rules?.s($0) ?? "").isEmpty }
        let ed = f["ed"], sz = f["sz"]
        return VStack(spacing: LKSpacing.spaceSm) {
            WritingCard {
                WritingHeading(t(.verbSpellingRules), icon: "pencil.line")
                if !anyRule {
                    Text(f.t("irregular") && !f.t("partial") ? t(.verbIrregularVerbLearnV2) : t(.verbJustAddEdIng)).lkTextSafe(LKType.bodyMd).foregroundStyle(ink)
                } else {
                    ForEach(Array(Set(["ed", "ing", "s"].compactMap { rules?.s($0) }.filter { VerbLabels.rule($0) != nil })).sorted(), id: \.self) { k in
                        if let rule = VerbLabels.rule(k) {
                            VStack(alignment: .leading, spacing: 2) {
                                if let title = rule.title { Text(t(title)).lkTextSafe(LKType.titlePill).foregroundStyle(ink) }
                                else if let formula = VerbLabels.ruleFormula(k) { Text(verbatim: formula).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText() }
                                Text(t(rule.body)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .accessibilityElement(children: .combine)
                        }
                    }
                }
            }
            WritingCard {
                WritingHeading(t(.verbPronouncingTheEndings), icon: "waveform")
                if let ed, ed != .null {
                    let end = V.endIpa(ed.s("end"))
                    HStack(spacing: LKSpacing.spaceXs) {
                        Text(verbatim: "-ed").lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                        Text(ed.s("ipa")).lkTextSafe(LKType.headlineSm).foregroundStyle(LKColor.secondary.resolve(scheme)).englishText()
                        if !end.isEmpty { Text(t(.verbFinalSound, ["s": end])).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                    }
                    if let why = VerbLabels.edWhy(ed.s("why")) { Text(t(why)).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                } else {
                    Text(t(.verbNoEdEndingIrregular)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
                }
                if let sz {
                    HStack(spacing: LKSpacing.spaceXs) {
                        Text(verbatim: "-s").lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                        Text(sz.s("ipa")).lkTextSafe(LKType.headlineSm).foregroundStyle(LKColor.secondary.resolve(scheme)).englishText()
                    }
                    if let why = VerbLabels.sWhy(sz.s("why")) { Text(t(why)).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                }
                Button(t(.verbLessonPronouncingEdAnd)) { services.router.open(AppRoute("grammar", arg: "ed-s-endings")) }.buttonStyle(WritingSecondaryButtonStyle())
            }
        }
    }

    // MARK: tenses
    @ViewBuilder private func tensesSection(_ V: Verbs, _ r: JSON, _ f: JSON) -> some View {
        let groups = V.table(resolved: r, region: region)?.array ?? []
        let canPassive = f.t("passive") && !r.t("tail")
        WritingHeading(t(.verbConjugationByTense), icon: "tablecells")
        FlowLayout {
            ForEach(groups.map { $0.s("id") }, id: \.self) { g in WritingChip(text: VerbLabels.group(g).map { t($0) } ?? g, selected: group == g) { group = g } }
        }
        .accessibilityLabel(t(.verbTenseGroups))
        if canPassive {
            FlowLayout {
                WritingChip(text: t(.verbActive), selected: !passive) { passive = false }
                WritingChip(text: t(.verbPassive), selected: passive) { passive = true }
            }
            .accessibilityLabel(t(.verbVoice))
        }
        FlowLayout {
            ForEach([("aff", t(.verbAffirmative)), ("neg", t(.verbNegative)), ("q", t(.verbQuestion))], id: \.0) { k, l in WritingChip(text: l, selected: polarity == k) { polarity = k } }
        }
        .accessibilityLabel(t(.verbSentenceType))
        let current = groups.first { $0.s("id") == group } ?? groups.first
        ForEach(Array((current?.list("tenses") ?? []).enumerated()), id: \.offset) { _, x in tense(x, pas: passive && canPassive) }
    }

    private func tense(_ x: JSON, pas: Bool) -> some View {
        let id = x.s("id")
        let isOpen = Binding(get: { open.contains(id) }, set: { if $0 { open.insert(id) } else { open.remove(id) } })
        let rowsJSON = pas ? x["passive"] : x["rows"]
        let rows = rowsJSON?.array
        let example = (pas ? x["example"]?.s("passive") : x["example"]?.s("en")) ?? ""
        let formula = pas && x.t("formulaP") ? x.s("formulaP") : x.s("formula")
        return DisclosureGroup(isExpanded: isOpen) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                if let use = VerbLabels.use(id) { Text(t(use)).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                if x.t("rare") { note("info.circle", t(.verbAlmostNeverUsedIn)) }
                else if pas && rows == nil { note("info.circle", t(.verbThePassiveIsRare)) }
                else if let rows {
                    tenseTable(rows)
                    if !example.isEmpty {
                        HStack(alignment: .top) { WritingEnglish(text: example, style: LKType.bodyLg); WritingSayButton(text: example, label: t(.verbPlayExample), voice: voice) }
                    }
                    if x.t("stative") && !pas { note("exclamationmark.triangle", t(.verbStativeVerbUsuallyNot)) }
                    if x.t("dual") && !pas { note("lightbulb", t(.verbContinuousFormsAreFine)) }
                    if x.t("mustNote") { note("lightbulb", t(.verbTheNegativeOfMust)) }
                }
                FlowLayout {
                    if let rows, !rows.isEmpty {
                        let listen = rows.map { $0.s("aff") }.joined(separator: ". ")
                        Button { voice.speak(listen, who: "ama", accent: region == "US" ? "en-US" : "en-GB") } label: { Label(t(.verbPlayTheWholeTable), systemImage: "speaker.wave.2.fill") }.buttonStyle(WritingSecondaryButtonStyle())
                    }
                    Button { services.router.open(AppRoute("grammar", arg: x.s("lesson"))) } label: { Label(t(.verbStudyThisTense), systemImage: "graduationcap") }.buttonStyle(WritingSecondaryButtonStyle())
                }
            }
            .padding(.top, LKSpacing.spaceXs)
        } label: {
            VStack(alignment: .leading, spacing: 2) {
                Text(x.s("en")).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                if let name = VerbLabels.tense(id) { Text(t(name)).lkTextSafe(LKType.labelBadge).foregroundStyle(LKColor.secondary.resolve(scheme)) }
                Text(formula).lkTextSafe(LKType.bodySm).foregroundStyle(dim).englishText()
            }
            .frame(minHeight: LKFrame.shared.minTap, alignment: .leading)
        }
        .tint(LKColor.secondary.resolve(scheme))
        .padding(LKSpacing.spaceSm)
        .tactile(fill: LKColor.surfaceContainer, radius: 16).padding(.bottom, 4)
    }

    private func tenseTable(_ rows: [JSON]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(rows.enumerated()), id: \.offset) { i, x in
                let cells: [(String, String)] = {
                    switch polarity {
                    case "neg": return [(x.s("neg"), x.s("negC"))]
                    case "q": return [(x.s("q"), "")]
                    default: return [(x.s("aff"), x.s("affC"))]
                    }
                }()
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Text(x.s("subj")).lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(width: 78, alignment: .leading)
                    VStack(alignment: .leading, spacing: 0) {
                        Text(cells[0].0.isEmpty ? "—" : cells[0].0).lkTextSafe(LKType.bodyMd).foregroundStyle(ink)
                        if !cells[0].1.isEmpty { Text(cells[0].1).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                    }
                    Spacer(minLength: 0)
                }
                .englishText().padding(.vertical, 6)
                if i < rows.count - 1 { Divider().overlay(LKColor.outlineVariant.resolve(scheme)) }
            }
        }
    }
    private func note(_ icon: String, _ text: String) -> some View {
        Label { Text(text).lkTextSafe(LKType.bodySm).foregroundStyle(dim) } icon: { Image(systemName: icon).foregroundStyle(LKColor.tertiary.resolve(scheme)) }
    }

    // MARK: mistakes
    @ViewBuilder private func mistakes(_ V: Verbs, _ base: String) -> some View {
        let ms = V.mistakes(base).array ?? []
        if !ms.isEmpty {
            WritingHeading(t(.verbCommonLearnerMistakes), icon: "exclamationmark.triangle.fill")
            ForEach(Array(ms.enumerated()), id: \.offset) { _, m in
                WritingCard {
                    HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                        Image(systemName: "xmark.circle.fill").foregroundStyle(LKColor.error.resolve(scheme)).accessibilityHidden(true)
                        Text(m.s("wrong")).lkTextSafe(LKType.bodyLg).strikethrough().foregroundStyle(dim).englishText()
                    }
                    HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                        Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true)
                        Text(m.s("right")).lkTextSafe(LKType.bodyLg).fontWeight(.bold).foregroundStyle(ink).englishText()
                    }
                    if let why = VerbLabels.mistake(m.s("code").hasPrefix("sp-") ? "sp" : m.s("code")) { Text(t(why)).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
                }
            }
        }
    }
}
