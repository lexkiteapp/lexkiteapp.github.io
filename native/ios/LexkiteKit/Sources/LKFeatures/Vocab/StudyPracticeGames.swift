import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync
import LKCore

/// Score ring (percent) – the colour is never the only signal: the number is inside.
struct StudyRing: View {
    let percent: Int
    var tint: LKDynamicColor = LKColor.secondary
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        ZStack {
            Circle().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 10)
            Circle().trim(from: 0, to: CGFloat(max(0, min(100, percent))) / 100).stroke(tint.resolve(scheme), style: StrokeStyle(lineWidth: 10, lineCap: .round)).rotationEffect(.degrees(-90))
            Text(verbatim: "\(percent)").studyText(LKType.headlineLg)
        }
        .frame(width: 112, height: 112)
        .accessibilityElement(children: .ignore)
        .accessibilityValue(Text(verbatim: "\(percent)%"))
    }
}

/// Link chips to #/dict/<word>.
private struct WordChips: View {
    let words: [String]
    var onTap: (String) -> Void
    var body: some View {
        FlowLayout {
            ForEach(words, id: \.self) { w in
                Button { onTap(w) } label: { StudyChip(text: w, tint: LKColor.onSurface).englishText().frame(minHeight: LKFrame.shared.minTap) }.buttonStyle(.plain)
            }
        }
    }
}

// MARK: - learn: introduction card of a new word
struct PracticeIntro: View {
    let model: StudyPracticeModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        if let w = model.intro {
            VStack(spacing: 0) {
                PracticeColumn {
                    LKCard {
                        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                            HStack {
                                StudyChip(text: t(.revNewWords), icon: "sparkles", tint: LKColor.tertiary)
                                Spacer()
                                if w.t("image") || w.t("emoji") { StudyThumb(emoji: w.s("emoji"), image: w.s("image"), size: 72) }
                            }
                            HStack(spacing: LKSpacing.spaceXs) {
                                Text(verbatim: w.s("word")).studyText(LKType.headlineLg).englishText()
                                StudySpeak(label: t(.vocabPronounce)) { model.speakWord() }
                                StudySpeak(label: t(.lessonSlowShort), slow: true) { model.core.speak(w.s("word"), settings: model.settings, slow: true) }
                            }
                            HStack(spacing: LKSpacing.spaceXs) {
                                if w.t("ipa") { Text(verbatim: w.s("ipa")).studyText(LKType.bodyLg, LKColor.onSurfaceVariant).englishText() }
                                if w.t("pos") { StudyChip(text: w.s("pos")) }
                                if w.t("level") { StudyChip(text: w.s("level"), tint: LKColor.tertiary) }
                            }
                            Text(verbatim: w.s("vi")).studyText(LKType.headlineSm, LKColor.secondary)
                            if w.t("def") && w.s("def") != w.s("vi") { block(.revDefinition) { Text(verbatim: w.s("def")).studyText(LKType.bodyMd).englishText() } }
                            if w.t("ex") {
                                block(.revExample) {
                                    HStack(alignment: .top) {
                                        Text(StudyHighlight.attributed(w.s("ex"), word: w.s("word"), color: LKColor.secondary.resolve(scheme))).studyText(LKType.bodyMd).englishText()
                                        Spacer(minLength: 0)
                                        StudySpeak(label: t(.revPlaySentence)) { model.speakText(w.s("ex")) }
                                    }
                                }
                            }
                            chips(.revGoesWith, w.strs("col"))
                            chips(.revSynonyms, w.strs("syn"))
                        }
                    }
                    DeepNotesView(word: w.s("word"))
                }
                VStack(spacing: LKSpacing.spaceXs) {
                    Button(t(.actionContinue)) { model.introContinue() }.buttonStyle(PrimaryButtonStyle())
                    Button { model.introKnown() } label: { Text(verbatim: t(.revIAlreadyKnowThisWord)).lkTextSafe(LKType.titlePill).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(maxWidth: .infinity, minHeight: LKFrame.shared.minTap) }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.bottom, LKSpacing.spaceSm)
                .frame(maxWidth: LKFrame.shared.width)
            }
        }
    }
    private func block<V: View>(_ k: L10nKey, @ViewBuilder _ body: () -> V) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: t(k)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
            body()
        }
    }
    @ViewBuilder private func chips(_ k: L10nKey, _ items: [String]) -> some View {
        if !items.isEmpty {
            block(k) { FlowLayout { ForEach(items.prefix(4), id: \.self) { StudyChip(text: $0, tint: LKColor.onSurfaceVariant).englishText() } } }
        }
    }
}

// MARK: - results
struct PracticeQuizDone: View {
    let model: StudyPracticeModel
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let r = model.result
        PracticeColumn {
            Image(systemName: (r?.percent ?? 0) >= 80 ? "trophy.fill" : (r?.percent ?? 0) >= 50 ? "hand.thumbsup.fill" : "flame.fill")
                .font(.system(size: 52, weight: .bold)).foregroundStyle(LKColor.tertiary.resolve(scheme)).accessibilityHidden(true)
            StudyRing(percent: r?.percent ?? 0, tint: (r?.percent ?? 0) >= 80 ? LKColor.success : (r?.percent ?? 0) >= 50 ? LKColor.tertiary : LKColor.error)
            Text(verbatim: t(.revCorrect, ["score": Fmt.int(r?.score ?? 0, t.lang), "total": Fmt.int(r?.total ?? 0, t.lang)])).studyText(LKType.headlineLg).multilineTextAlignment(.center)
            if let b = r?.band { StudyChip(text: t(.revEstimatedVocabularyLevelBand, ["band": b]).replacingOccurrences(of: "<b>", with: "").replacingOccurrences(of: "</b>", with: ""), icon: "graduationcap.fill", tint: LKColor.tertiary) }
            StudyChip(text: "+" + Fmt.int(r?.xp ?? 0, t.lang) + " " + t(.todayXp), icon: "bolt.fill", tint: LKColor.star)
            if model.wrong.isEmpty {
                Label { Text(verbatim: t(.revNoMistakesExcellent)).studyText(LKType.titlePill) } icon: { Image(systemName: "star.fill").foregroundStyle(LKColor.star.resolve(scheme)) }
            } else {
                LKCard {
                    VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                        Text(verbatim: t(.revReviewThese)).studyText(LKType.labelBadge, LKColor.secondary).textCase(.uppercase)
                        WordChips(words: model.wrong.map { $0.s("word") }) { onRoute(AppRoute("dict", arg: $0)) }
                        if model.wrong.contains(where: { !model.inDeck($0.s("word")) }) && !model.wrongAdded {
                            Button(t(.revAddMissedWordsToFlashcards)) { model.addWrongToDeck() }.buttonStyle(StudyOutlineButtonStyle())
                        } else if model.wrongAdded {
                            Label { Text(verbatim: t(.revAddedToFlashcards)).studyText(LKType.bodyMd, LKColor.success) } icon: { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)) }
                        }
                    }
                }
            }
            Button(t(.revNewRound)) { model.start(model.mode ?? "mcq") }.buttonStyle(PrimaryButtonStyle())
            Button(t(.revChangeMode)) { model.backToHub() }.buttonStyle(StudyOutlineButtonStyle())
        }
    }
}

struct PracticeLearnDone: View {
    let model: StudyPracticeModel
    var onRoute: (AppRoute) -> Void
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let items = model.learn?.items ?? []
        PracticeColumn {
            Image(systemName: "brain.head.profile").font(.system(size: 52, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: t(.revYouVeLearnedWords, ["n": Fmt.int(items.count, t.lang)])).studyText(LKType.headlineLg).multilineTextAlignment(.center)
            StudyChip(text: t(.revBonusXp, ["xp": Fmt.int(PracticeRun.xpLearnDone, t.lang)]), icon: "bolt.fill", tint: LKColor.star)
            WordChips(words: items.map { $0.s("word") }) { onRoute(AppRoute("dict", arg: $0)) }
            if !model.learnNotInDeck.isEmpty && !model.learnAdded {
                Button(t(.revAddWordsToFlashcardsFor, ["n": model.learnNotInDeck.count])) { model.addLearned() }.buttonStyle(PrimaryButtonStyle())
            } else if model.learnAdded {
                Label { Text(verbatim: t(.revAddedToFlashcards)).studyText(LKType.bodyMd, LKColor.success) } icon: { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)) }
            } else if model.learnNotInDeck.isEmpty {
                Text(verbatim: t(.revTheseWordsAreAlreadyIn)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
            }
            HStack(spacing: LKSpacing.spaceXs) {
                Button(t(.revLearnTheNext8Words)) { model.start("learn") }.buttonStyle(StudyOutlineButtonStyle())
                Button(t(.revMatch)) { model.start("match") }.buttonStyle(StudyOutlineButtonStyle())
            }
            Button(t(.revChangeMode)) { model.backToHub() }.buttonStyle(StudyOutlineButtonStyle())
        }
    }
}

// MARK: - match
struct PracticeMatch: View {
    let model: StudyPracticeModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        PracticeColumn {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: t(.revMatch)).studyText(LKType.titlePill)
                    Text(verbatim: t(.revMatchEachWordWithIts)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    Text(verbatim: t(.revEachWrongMatchAddsA)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                }
                Spacer()
                TimelineView(.periodic(from: .now, by: 0.1)) { _ in
                    Text(verbatim: StudyFmt.seconds(model.elapsed() + Double(model.misses), lang: t.lang)).studyText(LKType.labelMetric, LKColor.secondary).monospacedDigit()
                }
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: LKSpacing.spaceXs), count: 3), spacing: LKSpacing.spaceXs) {
                ForEach(model.tiles) { tile in
                    let gone = model.gone.contains(tile.id), sel = model.selected == tile.id, bad = model.bad.contains(tile.id)
                    Button { model.tap(tile.id) } label: {
                        Text(verbatim: tile.label).studyText(LKType.bodyMd, bad ? LKColor.onErrorContainer : LKColor.onSurface).multilineTextAlignment(.center)
                            .lineLimit(4).minimumScaleFactor(0.75).englishTextIf(tile.isEnglish)
                            .frame(maxWidth: .infinity, minHeight: 84).padding(6)
                            .tactile(fill: bad ? LKColor.errorContainer : sel ? LKColor.surfaceContainerHigh : LKColor.surfaceContainer,
                                     line: bad ? LKColor.error : sel ? LKColor.secondary : LKColor.outlineVariant, ledge: bad ? LKColor.error : sel ? LKColor.secondary : LKColor.outlineVariant, radius: 16)
                            .opacity(gone ? 0.15 : 1)
                    }
                    .buttonStyle(LKPressStyle())
                    .disabled(gone)
                    .accessibilityAddTraits(sel ? .isSelected : [])
                    .animation(reduceMotion ? nil : .easeOut(duration: 0.18), value: gone)
                }
            }
        }
    }
}

extension View {
    /// English words keep left-to-right inside an RTL interface; translations follow the interface direction.
    @ViewBuilder func englishTextIf(_ on: Bool) -> some View { if on { englishText() } else { self } }
}

struct PracticeMatchDone: View {
    let model: StudyPracticeModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        PracticeColumn {
            Image(systemName: "bolt.fill").font(.system(size: 52, weight: .bold)).foregroundStyle(LKColor.star.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: StudyFmt.seconds(model.matchTime, lang: t.lang)).studyText(LKType.displayHeroMobile)
            if model.newRecord { StudyChip(text: t(.revNewRecord), icon: "medal.fill", tint: LKColor.tertiary) }
            else if let b = model.matchBest { Text(verbatim: t(.revYourRecordS, ["best": StudyFmt.seconds(b, lang: t.lang)])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant) }
            if model.misses > 0 { Text(verbatim: t(.revMistakes, ["n": Fmt.int(model.misses, t.lang)])).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
            StudyChip(text: "+" + Fmt.int(model.matchXP, t.lang) + " " + t(.todayXp), icon: "bolt.fill", tint: LKColor.star)
            LKCard {
                VStack(alignment: .leading, spacing: 6) {
                    ForEach(model.matchItems, id: \.self) { w in
                        HStack { Text(verbatim: w.s("word")).studyText(LKType.titlePill).englishText(); Text(verbatim: "=").studyText(LKType.bodyMd, LKColor.onSurfaceVariant); Text(verbatim: w.s("vi")).studyText(LKType.bodyMd) }
                            .accessibilityElement(children: .combine)
                    }
                }
            }
            Button(t(.revPlayAgain)) { model.start("match") }.buttonStyle(PrimaryButtonStyle())
            Button(t(.revOtherModes)) { model.backToHub() }.buttonStyle(StudyOutlineButtonStyle())
        }
    }
}

// MARK: - speak
struct PracticeSpeak: View {
    let model: StudyPracticeModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        if let w = model.speakCurrent {
            PracticeColumn {
                HStack {
                    Text(verbatim: Fmt.int(model.si + 1, t.lang) + "/" + Fmt.int(model.total, t.lang)).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
                    Spacer()
                    Label { Text(verbatim: Fmt.int(model.good, t.lang)).studyText(LKType.labelMetric) } icon: { Image(systemName: "target").foregroundStyle(LKColor.success.resolve(scheme)) }
                        .accessibilityElement(children: .combine)
                }
                VStack(spacing: LKSpacing.spaceSm) {
                    if w.t("image") || w.t("emoji") { StudyThumb(emoji: w.s("emoji"), image: w.s("image"), size: 96) }
                    Text(verbatim: w.s("word")).studyText(LKType.displayHeroMobile).englishText()
                    if w.t("ipa") { Text(verbatim: w.s("ipa")).studyText(LKType.bodyLg, LKColor.onSurfaceVariant).englishText() }
                    if w.t("vi") { Text(verbatim: w.s("vi")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).multilineTextAlignment(.center) }
                    HStack(spacing: LKSpacing.spaceXs) {
                        StudySpeak(label: t(.revPlayModel)) { model.speakWord() }
                        StudySpeak(label: t(.lessonSlowShort), slow: true) { model.speakWord(slow: true) }
                    }
                    if !w.t("ipa") { Text(verbatim: t(.revNoTranscriptionYetPlayThe)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center) }
                }
                .frame(maxWidth: .infinity, minHeight: 220)
                .padding(LKSpacing.spaceLg)
                .tactile(fill: LKColor.surfaceContainer, radius: 28)
                mic
                status
                if let s = model.speakScore { result(s) }
                HStack(spacing: LKSpacing.spaceXs) {
                    Button(t(.onbCommonSkip)) { model.nextSpeak() }.buttonStyle(StudyOutlineButtonStyle())
                    if model.speakScore != nil { Button(t(.revNextWord)) { model.nextSpeak() }.buttonStyle(PrimaryButtonStyle()) }
                }
            }
        }
    }
    private var mic: some View {
        Button { Task { await model.listen() } } label: {
            Image(systemName: model.listening ? "waveform" : "mic.fill").font(.system(size: 34, weight: .bold))
                .foregroundStyle(LKColor.onPrimary.resolve(scheme))
                .frame(width: 88, height: 88)
                .background(Circle().fill((model.listening ? LKColor.error : LKColor.primary).resolve(scheme)))
        }
        .buttonStyle(LKPressStyle())
        .accessibilityLabel(t(.revTapAndSpeak))
    }
    @ViewBuilder private var status: some View {
        if model.listening { Text(verbatim: t(.revListeningSpeakLoudAndClear)).studyText(LKType.bodyMd, LKColor.error) }
        else if model.speakNotice == .unsupported { Text(verbatim: t(.lessonNoVoice)).studyText(LKType.bodyMd, LKColor.error).multilineTextAlignment(.center) }
        else if model.speakNotice == .noSpeech { Text(verbatim: t(.lessonUnclear)).studyText(LKType.bodyMd, LKColor.tertiary) }
        else if model.speakScore == nil { Text(verbatim: t(.revTapTheMicAndSay)).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
    }
    private func result(_ s: Int) -> some View {
        VStack(spacing: LKSpacing.spaceXs) {
            StudyRing(percent: s, tint: s >= PracticeRun.speakGreat ? LKColor.success : s >= PracticeRun.speakGood ? LKColor.tertiary : LKColor.error)
            Text(verbatim: s >= PracticeRun.speakGreat ? t(.revExcellent) : s >= PracticeRun.speakGood ? t(.revPrettyGoodListenToThe) : t(.revNotQuiteListenSlowlyTo)).studyText(LKType.titlePill)
            Text(verbatim: t(.revHeard, ["heard": model.heard.isEmpty ? "…" : model.heard])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).englishText()
        }
    }
}

struct PracticeSpeakDone: View {
    let model: StudyPracticeModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        PracticeColumn {
            Image(systemName: "mic.fill").font(.system(size: 52, weight: .bold)).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: t(.lessonDone)).studyText(LKType.headlineLg)
            StudyRing(percent: Vocab.round(Double(model.good) / Double(max(1, model.total)) * 100))
            Text(verbatim: Fmt.int(model.good, t.lang) + "/" + Fmt.int(model.total, t.lang)).studyText(LKType.headlineMd)
            Text(verbatim: t(.revPronouncedWordsWell, ["good": Fmt.int(model.good, t.lang), "total": Fmt.int(model.total, t.lang)])).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
            Text(verbatim: t(.revPracticeDailyToMakeYour)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
            StudyChip(text: "+" + Fmt.int(PracticeRun.xpSpeakDone, t.lang) + " " + t(.todayXp), icon: "bolt.fill", tint: LKColor.star)
            Button(t(.revPlayAgain)) { model.start("speak") }.buttonStyle(PrimaryButtonStyle())
            Button(t(.revOtherModes)) { model.backToHub() }.buttonStyle(StudyOutlineButtonStyle())
        }
    }
}
