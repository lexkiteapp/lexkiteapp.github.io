import SwiftUI
import Observation
import UniformTypeIdentifiers
import LKDesign
import LKStrings
import LKStore
import LKSync

/// Which tab of the Anki dialog opens
enum AnkiTab: String, Identifiable { case export, importing; var id: String { rawValue } }

/// State of the Anki dialog (export: options → file → steps for the learner's device · import: pick a file → check the columns → import). Logic = `AnkiKit` (LKStore).
@MainActor @Observable
final class AnkiModel {
    enum Format: String, CaseIterable { case apkg, txt, csv }
    enum Failure: Equatable { case notAnki, newFormat, damaged, tooBig, failed }
    enum ExportState: Equatable { case form, building, ready, failed }
    enum ImportState: Equatable { case pick, reading, failed(Failure), review, importing, done, cancelled }

    let deck: DeckModel
    var tab: AnkiTab
    // export
    var format: Format = .apkg
    var onlyShown = false
    var keepProgress = true
    var exportState: ExportState = .form
    private(set) var file: URL?
    private(set) var fileCount = 0
    var device = "ankimobile"
    // import
    var importState: ImportState = .pick
    private(set) var set: AnkiKit.NoteSet?
    private(set) var textEntries: [JSON] = []
    var map = AnkiKit.ColumnMap()
    var deckName = ""
    private(set) var plan = AnkiKit.Plan(entries: [], duplicates: 0, invalid: 0)
    private(set) var imported = 0
    private(set) var done = 0
    private(set) var total = 0
    private(set) var rowCount = 0

    init(deck: DeckModel, tab: AnkiTab) { self.deck = deck; self.tab = tab }

    var all: [JSON] { deck.cards }
    var shown: [JSON] { deck.matched }
    var canChooseScope: Bool { shown.count != all.count && !shown.isEmpty }
    var list: [JSON] { onlyShown && canChooseScope ? shown : all }

    // MARK: export
    func create(deckTitle: String, collocations: String, viMeanings vi: Bool) async {
        guard !list.isEmpty, exportState != .building else { return }
        exportState = .building
        let cards = list, fmt = format, keep = keepProgress, now = deck.core.now()
        let stamp = DeckView.stamp(now)
        let result: (URL, Int)? = await Task.detached(priority: .userInitiated) { () -> (URL, Int)? in
            let items = cards.map { AnkiKit.item($0, viMeanings: vi) }
            let data: Data, count: Int
            switch fmt {
            case .apkg:
                guard let r = try? AnkiKit.buildApkg(items, deckName: deckTitle, keepProgress: keep, collocationsLabel: collocations, now: now) else { return nil }
                data = r.data; count = r.count
            case .txt: data = Data(DeckTransfer.ankiText(cards: cards, deck: deckTitle).utf8); count = cards.count
            case .csv: data = Data(AnkiKit.csv(items).utf8); count = items.count
            }
            let url = FileManager.default.temporaryDirectory.appendingPathComponent("lexkite-" + stamp + "." + fmt.rawValue)
            guard (try? data.write(to: url, options: .atomic)) != nil else { return nil }
            return (url, count)
        }.value
        if let result { file = result.0; fileCount = result.1; exportState = .ready } else { exportState = .failed }
    }

    // MARK: import
    func load(_ url: URL) async {
        importState = .reading
        let ok = url.startAccessingSecurityScopedResource()
        defer { if ok { url.stopAccessingSecurityScopedResource() } }
        guard let data = try? Data(contentsOf: url) else { importState = .failed(.damaged); return }
        await load(data: data, name: url.deletingPathExtension().lastPathComponent)
    }
    func load(data: Data, name: String) async {
        importState = .reading
        let isPackage = data.starts(with: [0x50, 0x4B]) || data.starts(with: Array("SQLite".utf8))
        if !isPackage && data.count > 50 * 1_048_576 { importState = .failed(.tooBig); return }
        let parsed: Result<(AnkiKit.NoteSet?, [JSON]), AnkiKit.Failure> = await Task.detached(priority: .userInitiated) { () -> Result<(AnkiKit.NoteSet?, [JSON]), AnkiKit.Failure> in
            if isPackage {
                do { return .success((try AnkiKit.parsePackage(data), [])) } catch { return .failure((error as? AnkiKit.Failure) ?? .damaged) }
            }
            return .success((nil, DeckTransfer.parseAnki(String(decoding: data, as: UTF8.self), defaultDeck: name)))
        }.value
        switch parsed {
        case .failure(let f):
            importState = .failed(f == .newFormat ? .newFormat : f == .notAnki ? .notAnki : f == .tooBig ? .tooBig : .damaged)
        case .success(let (s, entries)):
            set = s; textEntries = entries
            deckName = s?.deck.isEmpty == false ? s?.deck ?? name : (entries.first?.s("deck") ?? name)
            if deckName.isEmpty { deckName = name }
            rowCount = s?.rows.count ?? entries.count
            if let s { map = AnkiKit.guessMap(s.columns) }
            replan()
            importState = rowCount == 0 ? .failed(.notAnki) : .review
        }
    }
    var existing: Set<String> { Set(deck.cards.map { Vocab.cardKey($0) }) }
    func replan() {
        if let s = set { plan = AnkiKit.plan(s, map: map, existing: existing); return }
        var seen = Set<String>(), out: [JSON] = [], dup = 0
        let have = existing
        for e in textEntries { let k = Vocab.keyOf(e.s("word")); if have.contains(k) || !seen.insert(k).inserted { dup += 1 } else { out.append(e) } }
        plan = AnkiKit.Plan(entries: out, duplicates: dup, invalid: 0)
    }
    var skipped: Int { plan.invalid }
    func runImport() async {
        let entries = plan.entries
        guard !entries.isEmpty, importState == .review else { return }
        total = entries.count; done = 0; importState = .importing
        let name = deckName.trimmingCharacters(in: .whitespacesAndNewlines)
        imported = await deck.addEntries(entries, deck: name.isEmpty ? "Anki" : name) { [self] n in done = n }
        importState = .done
    }
    func reset() { importState = .pick; set = nil; textEntries = []; plan = AnkiKit.Plan(entries: [], duplicates: 0, invalid: 0) }
    func columnLabel(_ i: Int) -> String {
        let n = set?.columns[safe: i] ?? ""
        return n.isEmpty ? "#\(i + 1)" : n
    }
}

private extension Array { subscript(safe i: Int) -> Element? { indices.contains(i) ? self[i] : nil } }

struct AnkiSheet: View {
    @State var model: AnkiModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.dismiss) private var dismiss
    @State private var picking = false

    var body: some View {
        VStack(spacing: 0) {
            header
            ScrollView {
                VStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                    switch model.tab {
                    case .export: exportBody
                    case .importing: importBody
                    }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.vertical, LKSpacing.spaceSm)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .onChange(of: model.map) { model.replan() }
        .fileImporter(isPresented: $picking, allowedContentTypes: [.data, .plainText, .commaSeparatedText, .tabSeparatedText, .zip]) { r in
            if case .success(let url) = r { Task { await model.load(url) } }
        }
        .accessibilityIdentifier("anki-sheet")
    }

    private var header: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            HStack {
                Text(verbatim: t(model.tab == .export ? .vocabExportToAnki : .vocabImportFromAnki)).studyText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                Spacer()
                Button { dismiss() } label: { Image(systemName: "xmark").font(.system(size: 17, weight: .bold)).frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Rectangle()) }
                    .foregroundStyle(LKColor.onSurface.resolve(scheme)).accessibilityLabel(t(.actionClose))
            }
            Picker("", selection: $model.tab) {
                Text(verbatim: t(.vocabExport)).tag(AnkiTab.export)
                Text(verbatim: t(.vocabImport)).tag(AnkiTab.importing)
            }
            .pickerStyle(.segmented)
        }
        .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceSm).padding(.bottom, LKSpacing.spaceXs)
    }

    // MARK: export
    @ViewBuilder private var exportBody: some View {
        switch model.exportState {
        case .form, .failed: exportForm
        case .building: HStack(spacing: LKSpacing.spaceXs) { ProgressView(); Text(verbatim: t(.vocabCreatingFile)).studyText(LKType.bodyMd) }.frame(maxWidth: .infinity, minHeight: 160)
        case .ready: exportDone
        }
    }

    private var preview: some View {
        let c = model.list.first, item = c.map { AnkiKit.item($0, viMeanings: t.lang == "vi") }
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            Text(verbatim: t(.vocabYourCardsWillLookLike)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
            HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                side(t(.vocabFront), [item?.word ?? "", item?.ipa ?? ""])
                side(t(.vocabBack), [item?.meaning ?? "", item?.def ?? "", item?.ex ?? "", item?.exMeaning ?? "", (item?.col ?? []).joined(separator: " · ")])
            }
        }
    }
    private func side(_ title: String, _ lines: [String]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(verbatim: title).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            ForEach(Array(lines.filter { !$0.isEmpty }.enumerated()), id: \.offset) { i, l in Text(verbatim: l).studyText(i == 0 ? LKType.titlePill : LKType.bodySm, i == 0 ? LKColor.onSurface : LKColor.onSurfaceVariant).englishText() }
        }
        .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
    }

    @ViewBuilder private var exportForm: some View {
        Text(verbatim: t(.vocabUseYourLexkiteWordsIn)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
        if model.all.isEmpty {
            Text(verbatim: t(.vocabThereAreNoWordsTo)).studyText(LKType.bodyMd)
        } else {
            preview
            if model.canChooseScope {
                Text(verbatim: t(.vocabWhichWordsToExport)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
                option(t(.vocabAll) + " (" + Fmt.int(model.all.count, t.lang) + ")", nil, selected: !model.onlyShown) { model.onlyShown = false }
                option(t(.vocabOnlyTheFilteredWords) + " (" + Fmt.int(model.shown.count, t.lang) + ")", nil, selected: model.onlyShown) { model.onlyShown = true }
            }
            Text(verbatim: t(.vocabFormat)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
            option(t(.vocabAnkiPackageApkg), t(.vocabBeautifulCardsWithIpaAudio), badge: t(.vocabRecommended), selected: model.format == .apkg) { model.format = .apkg }
            option(t(.vocabTextForAnkiTxt), t(.vocabImportWithFileImportAs), selected: model.format == .txt) { model.format = .txt }
            option(t(.vocabSpreadsheetCsv), t(.vocabOpenInExcelOrGoogle), selected: model.format == .csv) { model.format = .csv }
            if model.format == .apkg {
                Toggle(isOn: $model.keepProgress) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(verbatim: t(.vocabKeepMyReviewProgressFsrs)).studyText(LKType.titlePill)
                        Text(verbatim: t(.vocabWordsAlreadyInReviewKeep)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    }
                }
                .tint(LKColor.secondary.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap)
            }
            if model.exportState == .failed { Text(verbatim: t(.vocabCouldNotCreateTheFile)).studyText(LKType.bodyMd, LKColor.error) }
            Button(t(.vocabCreateFile)) { Task { await model.create(deckTitle: t(.vocabMyWords), collocations: t(.vocabCollocations), viMeanings: t.lang == "vi") } }.buttonStyle(PrimaryButtonStyle())
        }
    }

    private func option(_ title: String, _ sub: String?, badge: String? = nil, selected: Bool, _ pick: @escaping () -> Void) -> some View {
        Button(action: pick) {
            HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                Image(systemName: selected ? "largecircle.fill.circle" : "circle").foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 2) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(verbatim: title).studyText(LKType.titlePill).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                        if let badge { StudyChip(text: badge, tint: LKColor.success) }
                    }
                    if let sub { Text(verbatim: sub).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.leading) }
                }
                Spacer(minLength: 0)
            }
            .padding(LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap)
            .tactile(fill: selected ? LKColor.surfaceContainerHigh : LKColor.surfaceContainer, line: selected ? LKColor.secondary : LKColor.outlineVariant, ledge: selected ? LKColor.secondary : LKColor.outlineVariant, radius: 16)
        }
        .buttonStyle(LKPressStyle())
        .accessibilityAddTraits(selected ? .isSelected : [])
    }

    @ViewBuilder private var exportDone: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 44)).foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: t(.vocabYourFileIsReady)).studyText(LKType.headlineSm)
            Text(verbatim: t(.vocabCards, ["n": Fmt.int(model.fileCount, t.lang), "f": model.file?.lastPathComponent ?? ""])).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
        }
        .frame(maxWidth: .infinity)
        if let url = model.file {
            ShareLink(item: url) { Text(verbatim: t(model.format == .apkg ? .vocabSendToTheAnkiApp : .vocabDownloadAgain)).frame(maxWidth: .infinity) }.buttonStyle(PrimaryButtonStyle())
        }
        Text(verbatim: t(.vocabDevice)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
        HStack(spacing: LKSpacing.spaceXs) {
            ForEach([("computer", t(.vocabComputer)), ("ankidroid", "AnkiDroid"), ("ankimobile", "AnkiMobile")], id: \.0) { k, l in
                Button { model.device = k } label: { Text(verbatim: l).lineLimit(1).minimumScaleFactor(0.7).frame(maxWidth: .infinity) }
                    .buttonStyle(StudyOutlineButtonStyle(tint: model.device == k ? LKColor.secondary : LKColor.onSurface, fill: model.device == k ? LKColor.surfaceContainerHigh : LKColor.surfaceContainer))
                    .accessibilityAddTraits(model.device == k ? .isSelected : [])
            }
        }
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array(steps.enumerated()), id: \.offset) { i, s in
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: Fmt.int(i + 1, t.lang)).studyText(LKType.labelMetric, LKColor.onSecondary).frame(width: 24, height: 24).background(Circle().fill(LKColor.secondary.resolve(scheme)))
                    Text(verbatim: s).studyText(LKType.bodyMd)
                }
                .accessibilityElement(children: .combine)
            }
        }
        if model.format == .apkg {
            Text(verbatim: t(.vocabExportingAgainLaterOnlyUpdates)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            Text(verbatim: t(.vocabPronunciationUsesYourDeviceS)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
        }
        Button(t(.vocabDone)) { dismiss() }.buttonStyle(StudyOutlineButtonStyle())
    }
    private var steps: [String] {
        switch model.format {
        case .txt: return [t(.vocabOpenAnkiOnYourComputer), t(.vocabChooseFileImportAndPick), t(.vocabCheckThatTheNoteType)]
        case .csv: return [t(.vocabOpenTheFileInExcel), t(.vocabForAnkiFileImportChoose)]
        case .apkg:
            let name = t(.vocabMyWords)
            switch model.device {
            case "computer": return [t(.vocabOpenAnkiOnYourComputer), t(.vocabDoubleClickTheDownloadedFile), t(.vocabTheDeckAppearsInYour, ["d": name])]
            case "ankidroid": return [t(.vocabInstallAnkidroidFreeOnGoogle), t(.vocabTapSendToTheAnki), t(.vocabOrInAnkidroidImportChoose), t(.vocabTheDeckAppearsInYour, ["d": name])]
            default: return [t(.vocabInstallAnkimobileFromTheApp), t(.vocabTapSendToTheAnkiApp), t(.vocabOpenTheFilesAppDownloads), t(.vocabChooseImportTheDeckAppears)]
            }
        }
    }

    // MARK: import
    @ViewBuilder private var importBody: some View {
        switch model.importState {
        case .pick: pickFile
        case .reading: HStack(spacing: LKSpacing.spaceXs) { ProgressView(); Text(verbatim: t(.vocabReadingFile)).studyText(LKType.bodyMd) }.frame(maxWidth: .infinity, minHeight: 160)
        case .failed(let f):
            Text(verbatim: failText(f)).studyText(LKType.bodyMd, LKColor.error)
            Button(t(.vocabChooseAnotherFile)) { model.reset() }.buttonStyle(StudyOutlineButtonStyle())
        case .review: review
        case .importing:
            VStack(spacing: LKSpacing.spaceSm) {
                ProgressView(value: Double(model.done), total: Double(max(1, model.total))).tint(LKColor.secondary.resolve(scheme)).accessibilityLabel(Text(verbatim: t(.vocabImportProgress)))
                Text(verbatim: t(.vocabImportingWords, ["i": Fmt.int(model.done, t.lang), "n": Fmt.int(model.total, t.lang)])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            }
            .frame(maxWidth: .infinity, minHeight: 160)
        case .done: importDone
        case .cancelled:
            Text(verbatim: t(.vocabCancelledNoWordsWereImported)).studyText(LKType.bodyMd)
            Button(t(.vocabChooseAnotherFile)) { model.reset() }.buttonStyle(StudyOutlineButtonStyle())
        }
    }
    private func failText(_ f: AnkiModel.Failure) -> String {
        switch f {
        case .notAnki: return t(.vocabNoAnkiDeckWasFound)
        case .newFormat: return t(.vocabThisFileUsesANewer)
        case .tooBig: return t(.vocabTheFileIsTooLarge)
        case .damaged: return t(.vocabTheFileIsDamagedOr)
        case .failed: return t(.vocabTheImportFailedPleaseTry)
        }
    }
    @ViewBuilder private var pickFile: some View {
        Text(verbatim: t(.vocabHowDoIGetA)).studyText(LKType.titlePill)
        VStack(alignment: .leading, spacing: 6) {
            ForEach(Array([t(.vocabInAnkiSelectTheDeck), t(.vocabChooseAnkiDeckPackageApkg), t(.vocabChooseThatFileHereAudio)].enumerated()), id: \.offset) { i, s in
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: Fmt.int(i + 1, t.lang)).studyText(LKType.labelMetric, LKColor.onSecondary).frame(width: 24, height: 24).background(Circle().fill(LKColor.secondary.resolve(scheme)))
                    Text(verbatim: s).studyText(LKType.bodyMd)
                }
                .accessibilityElement(children: .combine)
            }
        }
        Button { picking = true } label: { Label(t(.vocabChooseFile), systemImage: "doc.badge.plus").frame(maxWidth: .infinity) }.buttonStyle(PrimaryButtonStyle())
    }
    @ViewBuilder private var review: some View {
        Text(verbatim: t(.vocabCardsInTheFile, ["n": Fmt.int(model.rowCount, t.lang)])).studyText(LKType.titlePill)
        Text(verbatim: t(.vocabWordSetNameInLexkite)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
        TextField(t(.vocabWordSetNameInLexkite), text: $model.deckName).studyText(LKType.bodyLg).padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: 52)
            .tactile(fill: LKColor.surfaceContainerHigh, radius: 16)
        if let set = model.set {
            columnPicker(t(.vocabEnglishWord), set, $model.map.word)
            columnPicker(t(.usageMeaning), set, $model.map.mean)
            columnPicker(t(.revExample), set, $model.map.ex)
            columnPicker(t(.vocabIpa), set, $model.map.ipa)
        }
        Text(verbatim: t(.vocabPreviewOfTheFirst10)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
        let have = model.existing
        VStack(spacing: 0) {
            ForEach(Array(previewRows.enumerated()), id: \.offset) { _, w in
                let known = have.contains(Vocab.keyOf(w))
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: w).studyText(LKType.titlePill).englishText().frame(maxWidth: .infinity, alignment: .leading)
                    Text(verbatim: known ? t(.vocabAlreadySaved2) : t(.vocabWillImport)).studyText(LKType.labelBadge, known ? LKColor.onSurfaceVariant : LKColor.success)
                }
                .padding(.vertical, 6)
                Divider().overlay(LKColor.outlineVariant.resolve(scheme))
            }
        }
        HStack(spacing: LKSpacing.spaceXs) {
            StudyChip(text: t(.vocabAlreadySaved, ["n": Fmt.int(model.plan.duplicates, t.lang)]), tint: LKColor.onSurfaceVariant)
            if model.skipped > 0 { StudyChip(text: t(.vocabSkipped, ["n": Fmt.int(model.skipped, t.lang)]), tint: LKColor.onSurfaceVariant) }
        }
        Text(verbatim: t(.vocabNewWordsAreAddedTo)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
        if model.plan.entries.isEmpty {
            Text(verbatim: t(.vocabNoNewWordsToImport)).studyText(LKType.bodyMd)
        } else {
            Button(model.plan.entries.count == 1 ? t(.vocabImport) : t(.vocabImportWords, ["n": Fmt.int(model.plan.entries.count, t.lang)])) { Task { await model.runImport() } }.buttonStyle(PrimaryButtonStyle())
        }
        Button(t(.vocabChooseAnotherFile)) { model.reset() }.buttonStyle(StudyOutlineButtonStyle())
    }
    private var previewRows: [String] {
        if let set = model.set {
            let k = model.map.word
            return set.rows.prefix(10).map { r in AnkiKit.htmlToText(k >= 0 && k < r.cells.count ? r.cells[k] : "").components(separatedBy: " · ").first ?? "" }.filter { !$0.isEmpty }
        }
        return model.textEntries.prefix(10).map { $0.s("word") }
    }
    private func columnPicker(_ title: String, _ set: AnkiKit.NoteSet, _ sel: Binding<Int>) -> some View {
        HStack {
            Text(verbatim: title).studyText(LKType.bodyMd)
            Spacer()
            Picker(title, selection: sel) {
                Text(verbatim: t(.vocabNotUsed)).tag(-1)
                ForEach(0..<set.columns.count, id: \.self) { i in Text(verbatim: set.columns[i].isEmpty ? t(.vocabColumn, ["n": Fmt.int(i + 1, t.lang)]) : set.columns[i]).tag(i) }
            }
            .pickerStyle(.menu)
        }
        .frame(minHeight: LKFrame.shared.minTap)
    }
    @ViewBuilder private var importDone: some View {
        VStack(spacing: LKSpacing.spaceXs) {
            Image(systemName: "checkmark.circle.fill").font(.system(size: 44)).foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: t(.vocabImportedWordsInto, ["n": Fmt.int(model.imported, t.lang), "d": model.deckName])).studyText(LKType.headlineSm).multilineTextAlignment(.center)
            let skipped = model.plan.duplicates + model.skipped
            if skipped > 0 { Text(verbatim: t(.vocabSkippedWordsThatWereAlready, ["k": Fmt.int(skipped, t.lang)])).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
            Text(verbatim: t(.vocabTheNewWordsAreIn)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        Button(t(.vocabStart)) { dismiss(); onRoute(AppRoute("practice", arg: "learn", query: ["src": "deck"])) }.buttonStyle(PrimaryButtonStyle())
        Button(t(.vocabSeeInMyWords)) { dismiss(); onRoute(AppRoute("deck")) }.buttonStyle(StudyOutlineButtonStyle())
    }
}
