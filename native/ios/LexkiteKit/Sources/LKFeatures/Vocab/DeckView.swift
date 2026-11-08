import SwiftUI
import UniformTypeIdentifiers
import LKDesign
import LKStrings
import LKStore
import LKSync

/// #/deck – the learner's word book (list with filters) or a shared deck preview (`?share=`).
struct DeckView: View {
    @State var model: DeckModel
    var query: [String: String]
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    init(model: DeckModel, query: [String: String] = [:], onRoute: @escaping (AppRoute) -> Void = { _ in }) {
        _model = State(initialValue: model); self.query = query; self.onRoute = onRoute
    }

    var body: some View {
        StudyPage(title: model.phase == .shared ? t(.vocabSharedDeck) : t(.vocabMyWords)) {
            switch model.phase {
            case .loading: ProgressView().frame(maxWidth: .infinity, minHeight: 200)
            case .badShare:
                StudyEmpty(icon: "link.badge.plus", title: t(.vocabInvalidDeckLink), action: (t(.vocabBackToMyWords), { onRoute(AppRoute("deck")) }))
            case .shared: sharedPreview
            case .list: list
            }
        }
        .task { if model.phase == .loading { await model.load(query: query) } }
        .sheet(isPresented: Binding(get: { model.editing != nil }, set: { if !$0 { model.editing = nil } })) {
            if let w = model.editing, let c = model.card(w) { DeckEditSheet(model: model, card: c).environment(\.l10n, t) }
        }
        .sheet(isPresented: Binding(get: { model.shareLink != nil }, set: { if !$0 { model.shareLink = nil } })) {
            if let link = model.shareLink { DeckShareSheet(link: link, count: model.shareCount).environment(\.l10n, t) }
        }
        .sheet(item: Binding(get: { model.ankiTab }, set: { model.ankiTab = $0 })) { tab in
            AnkiSheet(model: AnkiModel(deck: model, tab: tab), onRoute: onRoute).environment(\.l10n, t)
        }
        .fileImporter(isPresented: Binding(get: { model.showImporter }, set: { model.showImporter = $0 }),
                      allowedContentTypes: [.json, .plainText, .commaSeparatedText, .tabSeparatedText]) { r in
            if case .success(let url) = r { Task { await model.importFile(url) } } else { model.clearNotice() }
        }
        .lkHaptic(.tap, trigger: model.tick)
        .accessibilityIdentifier("inner-deck")
    }

    // MARK: list
    @ViewBuilder private var list: some View {
        if let n = model.notice { noticeBanner(n) }
        if model.cards.isEmpty {
            StudyEmpty(icon: "tray", title: t(.vocabMyWords), message: StudyText.plain(t(.vocabNoWordsYetAdd)),
                       action: (t(.revOpenLibrary), { onRoute(AppRoute("library")) }), secondary: (t(.todayLookUp), { onRoute(AppRoute("dict")) }))
            importExport
        } else {
            let rows = model.shown, total = model.matched.count
            VStack(alignment: .leading, spacing: 2) {
                Text(verbatim: t(.vocabWordsMastered, ["n": model.cards.count, "k": model.mastered])).studyText(LKType.headlineMd).accessibilityAddTraits(.isHeader)
            }
            actions
            filters
            if rows.isEmpty {
                Text(verbatim: t(.vocabNoWordsMatchThese)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).frame(maxWidth: .infinity).padding(.vertical, LKSpacing.spaceLg)
            } else {
                LazyVStack(spacing: LKSpacing.spaceSm) {
                    ForEach(rows, id: \.self) { c in DeckRowView(model: model, c: c, onRoute: onRoute) }
                }
                if total > DeckEngine.maxRows { Text(verbatim: t(.vocabShowing400OfWords, ["n": total])).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
            }
            importExport
        }
    }

    private func noticeBanner(_ n: DeckModel.Notice) -> some View {
        let text: String, ok: Bool
        switch n {
        case .imported(let k): text = t(.vocabImportedCards, ["n": k]); ok = true
        case .added(let k): text = t(.vocabAddedWordsToYour, ["n": k]); ok = true
        case .invalidFile: text = t(.vocabInvalidFile); ok = false
        }
        return Label { Text(verbatim: text).studyText(LKType.bodyMd, ok ? LKColor.success : LKColor.error) } icon: {
            Image(systemName: ok ? "checkmark.circle.fill" : "exclamationmark.triangle.fill").foregroundStyle((ok ? LKColor.success : LKColor.error).resolve(scheme))
        }
        .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
        .task(id: text) { try? await Task.sleep(nanoseconds: 3_000_000_000); model.clearNotice() }
        .accessibilityElement(children: .combine)
    }

    private var actions: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            Button(t(.vocabLearn)) { onRoute(AppRoute("practice", arg: "learn", query: ["src": "deck"])) }.buttonStyle(StudyOutlineButtonStyle())
            Button(t(.revTest)) { onRoute(AppRoute("practice", arg: "test", query: ["src": "deck"])) }.buttonStyle(StudyOutlineButtonStyle())
        }
    }

    private var importExport: some View {
        let stamp = Self.stamp(model.core.now())
        return VStack(spacing: LKSpacing.spaceXs) {
            HStack(spacing: LKSpacing.spaceXs) {
                Button(t(.vocabShareDeck)) { model.share() }.buttonStyle(StudyOutlineButtonStyle()).disabled(model.matched.isEmpty)
                ShareLink(item: model.backupFile(stamp), preview: SharePreview(t(.vocabExport))) { Text(verbatim: t(.vocabExport)).frame(maxWidth: .infinity) }
                    .buttonStyle(StudyOutlineButtonStyle()).disabled(model.cards.isEmpty)
                Button(t(.vocabImport)) { model.showImporter = true }.buttonStyle(StudyOutlineButtonStyle())
            }
            HStack(spacing: LKSpacing.spaceXs) {
                Button(t(.vocabExportToAnki)) { model.ankiTab = .export }.buttonStyle(StudyOutlineButtonStyle())
                Button(t(.vocabImportFromAnki)) { model.ankiTab = .importing }.buttonStyle(StudyOutlineButtonStyle())
            }
        }
    }
    static func stamp(_ ms: Int64) -> String {
        let c = Calendar(identifier: .gregorian).dateComponents(in: TimeZone(identifier: "UTC") ?? .current, from: Date(timeIntervalSince1970: Double(ms) / 1000))
        return String(format: "%04d%02d%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    }

    // MARK: filters
    private var filters: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            HStack(spacing: LKSpacing.spaceXs) {
                Image(systemName: "magnifyingglass").foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).accessibilityHidden(true)
                ZStack(alignment: .leading) {
                    if model.filter.q.isEmpty { Text(t(.vocabSearchWordsOrMeanings)).studyText(LKType.bodyLg, LKColor.onSurfaceVariant).lineLimit(2).fixedSize(horizontal: false, vertical: true).allowsHitTesting(false).accessibilityHidden(true) }
                    TextField(t(.vocabSearchWordsOrMeanings), text: Binding(get: { model.filter.q }, set: { model.filter.q = $0 }))
                        .textInputAutocapitalization(.never).autocorrectionDisabled().submitLabel(.search)
                        .studyText(LKType.bodyLg)
                }
            }
            .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 52)
            .tactile(fill: LKColor.surfaceContainerHigh, radius: 16)
            ScrollView(.horizontal) {
                HStack(spacing: LKSpacing.spaceXs) {
                    menu(label: topicLabel(model.filter.topic), selected: !model.filter.topic.isEmpty) {
                        Button { model.filter.topic = "" } label: { Text(verbatim: t(.vocabAllSets)) }
                        Button { model.filter.topic = "mine" } label: { Text(verbatim: t(.vocabAddedByMe)) }
                        ForEach(model.topicOptions, id: \.id) { o in Button { model.filter.topic = o.id } label: { Text(verbatim: o.name) } }
                        ForEach(model.deckNames, id: \.self) { n in Button { model.filter.topic = "deck:" + n } label: { Text(verbatim: t(.vocabSWordList, ["n": n])) } }
                    }
                    menu(label: sourceLabel(model.filter.from), selected: !model.filter.from.isEmpty) {
                        Button { model.filter.from = "" } label: { Text(verbatim: t(.vocabAllSources)) }
                        ForEach(Vocab.originKeys, id: \.self) { k in Button { model.filter.from = k } label: { Text(verbatim: StudySourceName.origin(k, t)) } }
                        Button { model.filter.from = "forget" } label: { Text(verbatim: t(.vocabFading)) }
                    }
                    menu(label: levelLabel(model.filter.m), selected: !model.filter.m.isEmpty) {
                        ForEach(DeckFilter.masteryValues, id: \.self) { v in Button { model.filter.m = v } label: { Text(verbatim: levelLabel(v)) } }
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
    }
    private func menu<M: View>(label: String, selected: Bool, @ViewBuilder _ items: () -> M) -> some View {
        Menu { items() } label: {
            HStack(spacing: 4) {
                Text(verbatim: label).lkTextSafe(LKType.labelMetric).lineLimit(1)
                Image(systemName: "chevron.down").font(.system(size: 11, weight: .bold))
            }
            .foregroundStyle((selected ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
            .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: LKFrame.shared.minTap)
            .background(Capsule().fill((selected ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
        }
    }
    private func topicLabel(_ v: String) -> String {
        if v.isEmpty { return t(.vocabChooseAWordSet) }
        if v == "mine" { return t(.vocabAddedByMe) }
        if v.hasPrefix("deck:") { return t(.vocabSWordList, ["n": String(v.dropFirst(5))]) }
        return model.bundle.catalog.topic(v)?.name ?? v
    }
    private func sourceLabel(_ v: String) -> String {
        if v.isEmpty { return t(.vocabAllSources) }
        return v == "forget" ? t(.vocabFading) : StudySourceName.origin(v, t)
    }
    private func levelLabel(_ v: String) -> String {
        switch v {
        case "0": return t(.vocabNotStarted)
        case "12": return t(.vocabInTraining)
        case "1": return t(.pathLearning)
        case "2": return t(.vocabFamiliar)
        case "3": return t(.vocabMastered)
        default: return t(.vocabAllLevels)
        }
    }

    // MARK: shared deck preview
    @ViewBuilder private var sharedPreview: some View {
        if let s = model.shared {
            let fresh = model.sharedFresh.count
            VStack(alignment: .leading, spacing: 4) {
                Label { Text(verbatim: t(.vocabSharedDeck)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase) } icon: { Image(systemName: "link").foregroundStyle(LKColor.secondary.resolve(scheme)) }
                Text(verbatim: s.name).studyText(LKType.headlineLg)
                Text(verbatim: t(.vocabWordsNewToYou, ["n": s.words.count, "k": fresh])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            Button(model.adding ? t(.vocabAdding) : t(.vocabAddToMyFsrs)) { Task { await model.addShared() } }
                .buttonStyle(PrimaryButtonStyle()).disabled(fresh == 0 || model.adding)
            LKCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    ForEach(Array(s.words.enumerated()), id: \.offset) { _, w in
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: 6) {
                                    Text(verbatim: w.s("word")).studyText(LKType.titlePill).englishText()
                                    if w.t("ipa") { Text(verbatim: w.s("ipa")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                                }
                                Text(verbatim: Vocab.meanOf(w)).studyText(LKType.bodyMd, LKColor.secondary)
                            }
                            Spacer(minLength: 0)
                            if model.card(w.s("word")) != nil { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true) }
                        }
                        .accessibilityElement(children: .combine)
                    }
                }
            }
        }
    }
}

// MARK: - a row
private struct DeckRowView: View {
    let model: DeckModel
    let c: JSON
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let r = model.row(c)
        LKCard(padding: LKSpacing.spaceSm) {
            HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                StudyThumb(emoji: r.hasImage ? c.s("emoji") : r.thumb, image: r.hasImage ? r.thumb : "", size: 52)
                VStack(alignment: .leading, spacing: 3) {
                    Button { onRoute(AppRoute("dict", arg: r.word)) } label: {
                        Text(verbatim: r.word).studyText(LKType.titlePill, LKColor.secondary).englishText().frame(minHeight: 28, alignment: .leading)
                    }
                    .buttonStyle(.plain)
                    if !r.ipa.isEmpty { Text(verbatim: r.ipa).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                    Text(verbatim: r.mean).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                    if let cx = r.contextText, !cx.isEmpty {
                        Text(verbatim: "“" + cx + (r.contextCut ? "…" : "") + "”").studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().lineLimit(3)
                    } else if !r.definition.isEmpty {
                        Text(verbatim: r.definition).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().lineLimit(3)
                    }
                    HStack(spacing: LKSpacing.spaceXs) {
                        StudyDots(level: r.mastery)
                        if let p = r.retentionPercent {
                            Label { Text(verbatim: StudyFmt.percent(p, lang: t.lang)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant) } icon: { Image(systemName: "brain").font(.system(size: 11)).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
                        }
                    }
                }
                Spacer(minLength: 0)
                VStack(spacing: 0) {
                    StudySpeak(label: t(.vocabPronounce)) { model.speak(r.word) }
                    LessonIconButton(system: "pencil", label: t(.vocabEdit)) { model.editing = r.word }
                }
            }
        }
        .accessibilityElement(children: .contain)
    }
}

// MARK: - edit card
struct DeckEditSheet: View {
    let model: DeckModel
    let card: JSON
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    @State private var vi = ""
    @State private var ipa = ""
    @State private var ex = ""
    @State private var note = ""
    @State private var image = ""
    @State private var askDelete = false

    var body: some View {
        let w = card.s("word")
        VStack(spacing: 0) {
            HStack {
                Text(verbatim: t(.vocabEdit2, ["w": w])).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                Spacer()
                Button { dismiss() } label: { Image(systemName: "xmark").font(.system(size: 17, weight: .bold)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle()) }
                    .foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityLabel(t(.actionClose))
            }
            .padding(.horizontal, LKFrame.shared.gutter).frame(minHeight: 56)
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    field(.vocabMeaning, $vi)
                    field(.vocabIpa, $ipa, english: true)
                    field(.vocabExampleSentence, $ex, english: true, axis: true)
                    field(.vocabNotesMemoryTip, $note, hint: t(.vocabEGAssociationsWord), axis: true)
                    field(.vocabImageUrlLeaveBlank, $image, label: t(.vocabImageUrlLeaveBlank, ["e": card.s("emoji")]), english: true)
                    Button(t(.vocabSave)) { model.save(w, vi: vi, ipa: ipa, ex: ex, note: note, image: image); dismiss() }.buttonStyle(PrimaryButtonStyle())
                    VStack(alignment: .leading, spacing: 4) {
                        Button(t(.vocabRelearn)) { model.relearn(w); dismiss() }.buttonStyle(StudyOutlineButtonStyle())
                        Text(verbatim: t(.vocabThisCardWillBe)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    }
                    Button(t(.vocabDelete)) { askDelete = true }.buttonStyle(StudyOutlineButtonStyle(tint: LKColor.error))
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.bottom, LKSpacing.spaceLg)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .onAppear { vi = card.s("vi"); ipa = card.s("ipa"); ex = card.s("ex"); note = card.s("note"); image = card.s("image") }
        .alert(t(.vocabRemoveFromYourWords, ["w": w]), isPresented: $askDelete) {
            Button(t(.actionCancel), role: .cancel) {}
            Button(t(.vocabDelete), role: .destructive) { model.delete(w); dismiss() }
        }
        .presentationDetents([.large])
    }

    private func field(_ k: L10nKey, _ text: Binding<String>, label: String? = nil, hint: String = "", english: Bool = false, axis: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: label ?? t(k)).studyText(LKType.labelBadge, LKColor.secondary)
            TextField(hint, text: text, axis: axis ? .vertical : .horizontal)
                .lineLimit(axis ? 1...4 : 1...1)
                .textInputAutocapitalization(.never).autocorrectionDisabled(english)
                .studyText(LKType.bodyLg)
                .padding(.horizontal, LKSpacing.spaceMd).padding(.vertical, LKSpacing.spaceSm).frame(minHeight: 52, alignment: .topLeading)
                .tactile(fill: LKColor.surfaceContainerHigh, radius: 16)
        }
    }
}

// MARK: - share link sheet
struct DeckShareSheet: View {
    let link: String
    let count: Int
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    @State private var copied = false
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
            HStack {
                Text(verbatim: t(.vocabShareDeck)).studyText(LKType.headlineSm)
                Spacer()
                Button { dismiss() } label: { Image(systemName: "xmark").font(.system(size: 17, weight: .bold)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle()) }
                    .foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityLabel(t(.actionClose))
            }
            Text(verbatim: t(.vocabWordsRecipientsCanPreview, ["n": count])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            Text(verbatim: link).studyText(LKType.bodySm, LKColor.onSurfaceVariant).lineLimit(3).englishText()
                .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
                .textSelection(.enabled)
            if let url = URL(string: link) {
                ShareLink(item: url, subject: Text(verbatim: t(.vocabShareDeck)), message: Text(verbatim: t(.vocabVocabularyDeckOnLexkite, ["n": ""]))) {
                    Text(verbatim: t(.vocabShareDeck)).frame(maxWidth: .infinity)
                }
                .buttonStyle(PrimaryButtonStyle())
            }
            Button(copied ? t(.vocabLinkCopied) : t(.vocabCopyLink)) { UIPasteboard.general.string = link; copied = true }.buttonStyle(StudyOutlineButtonStyle())
            Spacer(minLength: 0)
        }
        .padding(LKFrame.shared.gutter)
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .presentationDetents([.medium])
    }
}
