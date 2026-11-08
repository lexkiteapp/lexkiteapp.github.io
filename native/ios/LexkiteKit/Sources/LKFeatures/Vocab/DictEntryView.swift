import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// The word card (Stitch word-card): headword · pronunciation UK/US with slow playback · meaning · main example · actions (save, practise,
/// conjugate, usage) · collocations / synonyms · meanings by part of speech · bilingual sentences · save-with-context box · phrases · related words.
struct DictEntryView: View {
    @Bindable var model: DictModel
    let voice: LKVoicePlayer
    let onOpen: (String) -> Void
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @State private var usage: UsageStore?
    @State private var phraseSheet = false

    var body: some View {
        if let e = model.entry {
            let meanLang = services.uiLang == "vi" ? "vi" : "en"
            let page = DictPage.model(e, saved: model.card != nil, uiLang: services.uiLang, meanLang: meanLang, verbs: WritingVerbs.shared,
                                      hasUsage: { w in usage.map { !$0.chunksOf(w).isEmpty } ?? false })
            head(e, page, meanLang)
            actions(e, page)
            chips(e)
            posBlocks(e, page)
            if page.extraMeanings > 0 { extra(e) }
            if !page.bilingual.isEmpty { bilingual(e, page) }
            DeepNotesView(word: e.s("word"))
            if model.isFinal {
                saveBox(e)
                phrasesAndRelated(e)
            } else if model.busy {
                WritingCard { Text(t(.dictLookingUp, ["q": model.word])).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)); WritingSkeleton(rows: 3) }
            }
            Color.clear.frame(height: 0)
                .task(id: model.isFinal) { if model.live, model.isFinal, usage == nil { usage = await WritingRemoteContent.shared.usage() } }
        }
    }

    private var ink: Color { LKColor.onSurface.resolve(scheme) }
    private var dim: Color { LKColor.onSurfaceVariant.resolve(scheme) }
    private var accent: Color { LKColor.secondary.resolve(scheme) }

    // MARK: header
    private func head(_ e: JSON, _ page: DictPage.Model, _ meanLang: String) -> some View {
        let word = e.s("word"), ipa = e.s("ipa"), ipaUS = e.s("ipaUS").isEmpty ? ipa : e.s("ipaUS")
        return WritingCard {
            HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                Text(word).lkTextSafe(LKType.displayHeroMobile).foregroundStyle(ink).englishText().minimumScaleFactor(0.6).lineLimit(2)
                if !e.s("pos").isEmpty { WritingTag(text: e.s("pos")) }
                if !e.s("level").isEmpty { WritingTag(text: e.s("level"), tint: LKColor.tertiary) }
                Spacer(minLength: 0)
            }
            if !e.s("from").isEmpty {
                WritingTag(text: e.s("from") + " → " + word, tint: LKColor.onSurfaceVariant).environment(\.layoutDirection, .leftToRight)
            }
            let uk = "UK", us = "US"
            pron(uk, ipa, "en-GB", word)
            if !ipaUS.isEmpty { pron(us, ipaUS, "en-US", word) }
            VStack(alignment: .leading, spacing: 6) {
                if meanLang == "vi", !page.meaning.isEmpty { Text(page.meaning).lkTextSafe(LKType.headlineSm).foregroundStyle(accent) }
                if !page.def.isEmpty { WritingEnglish(text: page.def, style: LKType.bodyMd) }
            }
            if let ex = page.example {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(t(.revExample)).lkTextSafe(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim)
                        Spacer(minLength: 0)
                        WritingSayButton(text: ex, label: t(.revPlaySentence), voice: voice)
                    }
                    Text(WritingText.highlight(ex, word, accent)).lkTextSafe(LKType.bodyLg).foregroundStyle(ink).englishText().frame(maxWidth: .infinity, alignment: .leading)
                    if let tr = page.exampleTranslation {
                        Text(tr.vi).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
                        HStack {
                            WritingTag(text: tr.auto ? t(.dictOxfordMachineTranslated) : "Tatoeba", tint: LKColor.onSurfaceVariant)
                            if model.isFinal { Button(t(.dictUseAsContext)) { model.useSentence(en: ex, vi: tr.vi) }.buttonStyle(WritingSecondaryButtonStyle()) }
                        }
                    }
                }
                .padding(LKSpacing.spaceSm)
                .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerHigh.resolve(scheme)))
            }
            if e.s("image").hasPrefix("http"), let url = URL(string: e.s("image")) {
                AsyncImage(url: url) { img in img.resizable().scaledToFit() } placeholder: { Color.clear.frame(height: 120) }
                    .frame(maxWidth: .infinity, maxHeight: 220).clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous)).accessibilityHidden(true)
                if let credit = e["imageCredit"]?.object?["text"]?.string, !credit.isEmpty { Text(credit).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
            }
        }
    }

    private func pron(_ label: String, _ ipa: String, _ accent: String, _ word: String) -> some View {
        HStack(spacing: LKSpacing.spaceXs) {
            WritingTag(text: label, tint: LKColor.onSurfaceVariant)
            Text(ipa.hasPrefix("/") ? ipa : "/" + ipa + "/").lkTextSafe(LKType.headlineSm).foregroundStyle(ink).englishText()
            Spacer(minLength: 0)
            WritingSayButton(text: word, label: label, voice: voice, accent: accent, word: true)
            WritingSayButton(text: word, label: t(.lessonSlowShort), voice: voice, accent: accent, slow: true, word: true)
        }
    }

    // MARK: actions
    private func actions(_ e: JSON, _ page: DictPage.Model) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            if page.saved {
                Label(t(.dictInYourFlashcards), systemImage: "checkmark.circle.fill").lkTextSafe(LKType.titlePill).foregroundStyle(LKColor.success.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap)
            } else {
                Button(t(.dictSaveFlashcard)) { Task { await model.save() } }.buttonStyle(PrimaryButtonStyle()).disabled(model.saving)
            }
            FlowLayout {
                Button { services.router.open(AppRoute("practice", arg: "speak", query: ["w": model.word])) } label: { Label(t(.revPronunciation), systemImage: "mic.fill") }
                    .buttonStyle(WritingSecondaryButtonStyle())
                if let v = page.verb {
                    Button { services.router.open(AppRoute("verb", arg: String(v.dropFirst("#/verb/".count)).removingPercentEncoding)) } label: { Label(t(.dictVerbForms), systemImage: "textformat.abc") }
                        .buttonStyle(WritingSecondaryButtonStyle())
                }
                if page.usage != nil {
                    Button { services.router.open(AppRoute("usage", arg: model.word.lowercased())) } label: { Label(t(.dictUsage), systemImage: "text.book.closed") }
                        .buttonStyle(WritingSecondaryButtonStyle())
                }
            }
        }
    }

    private func chips(_ e: JSON) -> some View {
        let col = e.list("col").map(\.jsToString).filter { !$0.isEmpty }, syn = e.strs("syn")
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            if !col.isEmpty { Text(t(.revGoesWith)).lkTextSafe(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim); FlowLayout { ForEach(col, id: \.self) { c in WritingChip(text: c, english: true) { onOpen(c) } } } }
            if !syn.isEmpty { Text(t(.revSynonyms)).lkTextSafe(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim); FlowLayout { ForEach(syn, id: \.self) { c in WritingChip(text: c, english: true) { onOpen(c) } } } }
        }
    }

    // MARK: meanings
    @ViewBuilder private func posBlocks(_ e: JSON, _ page: DictPage.Model) -> some View {
        if !page.posBlocks.isEmpty {
            WritingHeading(t(.dictMeaningsByPartOf), icon: "list.number")
            ForEach(Array(page.posBlocks.enumerated()), id: \.offset) { _, b in
                WritingCard {
                    HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                        WritingTag(text: b.viName ?? b.pos)
                        if !b.vi.isEmpty { Text(b.vi.joined(separator: ", ")).lkTextSafe(LKType.titlePill).foregroundStyle(accent) }
                    }
                    ForEach(Array(b.defs.enumerated()), id: \.offset) { i, d in
                        HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                            Text("\(i + 1)").lkTextSafe(LKType.labelMetric).foregroundStyle(dim).frame(minWidth: 18, alignment: .leading)
                            VStack(alignment: .leading, spacing: 4) {
                                WritingEnglish(text: d.def, style: LKType.bodyMd)
                                if !d.ex.isEmpty {
                                    HStack(alignment: .top) {
                                        Text(WritingText.highlight(d.ex, model.word, accent)).lkTextSafe(LKType.bodySm).foregroundStyle(dim).englishText().frame(maxWidth: .infinity, alignment: .leading)
                                        WritingSayButton(text: d.ex, label: t(.revPlaySentence), voice: voice)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            Text(t(.dictSourcesOxfordLanguagesVia)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
        }
    }

    private func extra(_ e: JSON) -> some View {
        DisclosureGroup {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                ForEach(Array(e.list("meanings").enumerated()), id: \.offset) { _, m in
                    WritingTag(text: m.s("pos"))
                    ForEach(Array(m.list("defs").enumerated()), id: \.offset) { _, d in WritingEnglish(text: d.s("def"), style: LKType.bodyMd) }
                }
            }.padding(.top, LKSpacing.spaceXs)
        } label: { Text(t(.dictMoreDefinitions)).lkTextSafe(LKType.titlePill).foregroundStyle(ink).frame(minHeight: LKFrame.shared.minTap, alignment: .leading) }
    }

    private func bilingual(_ e: JSON, _ page: DictPage.Model) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            WritingHeading(t(.dictBilingualExamples), icon: "text.bubble")
            ForEach(Array(page.bilingual.enumerated()), id: \.offset) { _, s in
                WritingCard {
                    HStack(alignment: .top) {
                        Text(WritingText.highlight(s.en, model.word, accent)).lkTextSafe(LKType.bodyLg).foregroundStyle(ink).englishText().frame(maxWidth: .infinity, alignment: .leading)
                        WritingSayButton(text: s.en, label: t(.revPlaySentence), voice: voice)
                    }
                    Text(s.vi).lkTextSafe(LKType.bodyMd).foregroundStyle(dim)
                    HStack {
                        WritingTag(text: s.auto ? t(.dictOxfordMachineTranslated) : "Tatoeba", tint: LKColor.onSurfaceVariant)
                        if model.isFinal { Button(t(.dictUseAsContext)) { model.useSentence(en: s.en, vi: s.vi) }.buttonStyle(WritingSecondaryButtonStyle()) }
                    }
                }
            }
        }
    }

    // MARK: save with context
    private func saveBox(_ e: JSON) -> some View {
        let saved = model.card
        return WritingCard {
            WritingHeading(saved != nil ? t(.dictAddContextToThis) : t(.dictSaveAsAFlashcard), icon: "pin.fill")
            Text(t(.dictTheSentenceWhereYou)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            ZStack(alignment: .topLeading) {
                TextEditor(text: $model.ctx).lkTextSafe(LKType.bodyLg).foregroundStyle(ink).scrollContentBackground(.hidden).englishText()
                    .frame(minHeight: 96).padding(4)
                if model.ctx.isEmpty {
                    Text(t(.dictPasteASentenceContaining, ["w": e.s("word")])).lkTextSafe(LKType.bodyLg).foregroundStyle(dim).padding(.horizontal, 9).padding(.vertical, 12).allowsHitTesting(false)
                }
            }
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerLowest.resolve(scheme)))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2))
            if model.translating { Text(t(.dictTranslating)).lkTextSafe(LKType.bodyMd).foregroundStyle(dim) }
            else if model.translateFailed { Text(t(.dictCouldnTTranslateThis)).lkTextSafe(LKType.bodyMd).foregroundStyle(LKColor.error.resolve(scheme)) }
            else if !model.ctxVi.isEmpty { Text(model.ctxVi).lkTextSafe(LKType.bodyMd).foregroundStyle(dim) }
            FlowLayout {
                Button { Task { await model.translateContext() } } label: { Label(t(.dictTranslateSentence), systemImage: "globe") }
                    .buttonStyle(WritingSecondaryButtonStyle()).disabled(model.ctx.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || model.translating)
                Button(saved != nil ? t(.dictAddContext) : t(.dictSaveToFlashcards)) { Task { await model.save() } }
                    .buttonStyle(WritingSecondaryButtonStyle()).disabled(model.saving)
            }
            if let c = saved { Text(t(.dictContexts, ["n": c.list("contexts").count])).lkTextSafe(LKType.bodySm).foregroundStyle(dim) }
            if let note = model.savedNote {
                Text(note == "updated" ? t(.dictCardUpdated) : t(.dictSavedToFlashcards, ["w": e.s("word")])).lkTextSafe(LKType.titlePill).foregroundStyle(LKColor.success.resolve(scheme)).accessibilityAddTraits(.updatesFrequently)
            }
        }
    }

    // MARK: phrases + related words
    @ViewBuilder private func phrasesAndRelated(_ e: JSON) -> some View {
        let word = e.s("word")
        WritingCard {
            WritingHeading(t(.dictPhrasesStructuresWith, ["w": word]), icon: "puzzlepiece.extension")
            if model.phrases.isEmpty {
                Text(t.rich(.dictNoPhrasesInThe)).lkTextSafe(LKType.bodySm).foregroundStyle(dim)
            }
            ForEach(Array(model.phrases.enumerated()), id: \.offset) { _, p in
                let have = WritingCards.has(p.s("word"), in: model.cards)
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .firstTextBaseline) {
                        Text(p.s("word")).lkTextSafe(LKType.titlePill).foregroundStyle(ink).englishText()
                        if !p.s("vi").isEmpty && services.uiLang == "vi" { Text(p.s("vi")).lkTextSafe(LKType.bodyMd).foregroundStyle(accent) }
                    }
                    if !p.s("ex").isEmpty { Text(WritingText.highlight(p.s("ex"), p.s("word"), accent)).lkTextSafe(LKType.bodySm).foregroundStyle(dim).englishText().frame(maxWidth: .infinity, alignment: .leading) }
                    HStack {
                        WritingSayButton(text: p.s("word"), label: t(.revPlaySentence), voice: voice)
                        if have { Label(t(.revSaved), systemImage: "checkmark").lkTextSafe(LKType.labelMetric).foregroundStyle(LKColor.success.resolve(scheme)) }
                        else { Button(t(.dictSavePhrase)) { Task { await model.savePhrase(p) } }.buttonStyle(WritingSecondaryButtonStyle()) }
                    }
                }
                .accessibilityElement(children: .contain)
            }
            Button { phraseSheet = true } label: { Label(t(.dictSaveYourOwnPhrase), systemImage: "plus") }.buttonStyle(WritingSecondaryButtonStyle())
            if let r = model.related, !r.isEmpty { related(r, word) }
        }
        .sheet(isPresented: $phraseSheet) {
            WritingPhraseSheet(phrase: word + " ", meaning: "", sentence: e.s("ex"), showMeaning: services.uiLang == "vi", contextTitle: "") { entry, ctx in
                Task { await model.saveCard(entry, ctx); await model.refreshCards() }
            }
            .environment(\.l10n, t)
        }
    }

    @ViewBuilder private func related(_ r: DictRelated.Result, _ word: String) -> some View {
        if !r.jjb.isEmpty { relatedRow(t(.dictAdjectivesOftenUsedWith, ["w": word]), r.jjb) }
        if !r.jja.isEmpty { relatedRow(t(.dictNounsThatOftenFollow), r.jja) }
        if !r.ant.isEmpty { relatedRow(t(.dictAntonyms), r.ant) }
        if !r.syn.isEmpty || r.down {
            relatedRow(t(.dictSimilarWords), r.syn)
            if r.down { Button { Task { await model.retryRelated() } } label: { Label(t(.actionRetry), systemImage: "arrow.clockwise") }.buttonStyle(WritingSecondaryButtonStyle()) }
        }
    }
    private func relatedRow(_ title: String, _ words: [String]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title).lkTextSafe(LKType.labelBadge).textCase(.uppercase).foregroundStyle(dim)
            FlowLayout { ForEach(words, id: \.self) { w in WritingChip(text: w, english: true) { onOpen(w) } } }
        }
    }
}
