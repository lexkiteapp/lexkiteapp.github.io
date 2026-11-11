import SwiftUI
import LKDesign
import LKStore
import LKCore
import LKStrings
import LKSync

// M4 P07 – #/pron screens (Stitch pron-hub, pron-sound, pron-pairs, pron-result, pron-rhythm). Kit tokens only; chrome text is L10nKey `speak.*`,
// lesson data is shown as the web shows it (Vietnamese lesson text; English words, IPA and sentences always left to right).

// MARK: - entry

struct PronScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        if let id = route.arg, SpeakContentStore.pack.pron.list("lessons").contains(where: { $0.s("id") == id }),
           let lesson = SpeakContentStore.pack.pron.list("lessons").first(where: { $0.s("id") == id }) {
            SkillsHost(make: { PronLessonModel(ctx: $0, lesson: lesson, io: .live(voice: $0.core.voice)) }) { PronLessonView(model: $0, onRoute: go) }
        } else {
            SkillsHost(make: { PronHubModel(ctx: $0) }) { PronHubView(model: $0, onRoute: go) }   // unknown lesson → the hub, like the web
        }
    }
}

private func pronText(_ s: String, _ t: L10n) -> String { SpeakText.render(.string(s), t) }

// MARK: - hub

struct PronHubView: View {
    let model: PronHubModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        StudyPage(title: t(.speakPronThuVienPhatAm)) {
            header
            if model.hub.groupList.isEmpty {
                StudyEmpty(icon: "character.book.closed", title: t(.speakPronDangCapNhatBai))
            } else {
                ForEach(model.hub.groupList, id: \.id) { g in group(g) }
            }
            Text(verbatim: t(.speakPronOVienXamNhat)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        }
        .task { await model.load() }
        .accessibilityIdentifier("pron-hub")
    }
    private var header: some View {
        HStack(alignment: .center, spacing: LKSpacing.spaceMd) {
            Text(verbatim: t(.speakPronLuyenNhuElsaHoc)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            PronRing(percent: model.hub.ring, label: model.hub.ringLabel)
        }
    }
    private func group(_ g: PronHub.Group) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            HStack(spacing: LKSpacing.spaceXs) {
                Text(verbatim: g.emoji).accessibilityHidden(true)
                Text(verbatim: pronText(g.titleKey, t)).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
            }
            Text(verbatim: pronText(g.descKey, t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            if g.chart { tiles(g) } else { cards(g) }
        }
    }
    private func tiles(_ g: PronHub.Group) -> some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 76), spacing: LKSpacing.spaceXs)], spacing: LKSpacing.spaceXs) {
            ForEach(g.lessons, id: \.self) { id in
                if let l = model.lesson(id) { tile(l, done: g.done[id] != nil, unvoiced: g.unvoiced.contains(id)) }
            }
        }
    }
    private func tile(_ l: JSON, done: Bool, unvoiced: Bool) -> some View {
        let id = l.s("id")
        return Button { onRoute(AppRoute("pron", arg: id)) } label: {
            VStack(spacing: 2) {
                Text(verbatim: l.s("ipa").replacingOccurrences(of: "/", with: "")).studyText(LKType.headlineSm, done ? LKColor.onSecondaryContainer : LKColor.onSurface).englishText()
                Text(verbatim: l.list("words").first?.s("w") ?? "").studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().lineLimit(1)
                if done { Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(LKColor.success.resolve(scheme)).accessibilityLabel(Text(verbatim: t(.pathDone))) }
            }
            .frame(maxWidth: .infinity, minHeight: 64)
            .padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill((done ? LKColor.secondaryContainer : LKColor.surfaceContainerHighest).resolve(scheme)))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).strokeBorder(LKColor.outline.resolve(scheme), style: StrokeStyle(lineWidth: unvoiced ? 1.5 : 0, dash: [4, 3])))
        }
        .buttonStyle(LKPressStyle())
        .accessibilityLabel(Text(verbatim: l.s("title")))
    }
    private func cards(_ g: PronHub.Group) -> some View {
        VStack(spacing: LKSpacing.spaceXs) {
            ForEach(g.lessons, id: \.self) { id in
                if let l = model.lesson(id) { card(l, best: g.done[id]) }
            }
        }
    }
    private func card(_ l: JSON, best: Int?) -> some View {
        let how = l.s("how"), short = how.count > 110 ? String(how.prefix(110)) + "…" : how
        return Button { onRoute(AppRoute("pron", arg: l.s("id"))) } label: {
            SkillCard {
                VStack(alignment: .leading, spacing: 6) {
                    HStack {
                        Text(verbatim: l.s("emoji")).font(.system(size: 26)).accessibilityHidden(true)
                        Spacer(minLength: 0)
                        if let best { StudyChip(text: "✓ \(best)%", tint: LKColor.success) } else { StudyChip(text: l.s("ipa")) }
                    }
                    Text(verbatim: pronText(l.s("title"), t)).studyText(LKType.titlePill).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                    Text(verbatim: short).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.leading).fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .buttonStyle(LKPressStyle())
    }
}

/// progress ring: lessons done ÷ all lessons, "n/N" inside
struct PronRing: View {
    let percent: Int, label: String
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        ZStack {
            Circle().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 8)
            Circle().trim(from: 0, to: CGFloat(min(100, max(0, percent))) / 100).stroke(LKColor.success.resolve(scheme), style: StrokeStyle(lineWidth: 8, lineCap: .round)).rotationEffect(.degrees(-90))
            Text(verbatim: label).studyText(LKType.labelMetric)
        }
        .frame(width: 76, height: 76)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(verbatim: label))
    }
}

// MARK: - lesson

struct PronLessonView: View {
    let model: PronLessonModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.dismiss) private var dismiss
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Group {
            if let pg = model.pairGame, pg.started { PronPairsFocus(model: pg, lesson: model.lesson, onClose: { pg.quit() }) }
            else if let say = model.say, say.phase == .running || say.phase == .done { PronSayFocus(model: say, onClose: { say.quit() }) }
            else { page }
        }
        .task { await model.load() }
        .onDisappear { model.stop() }
        .accessibilityIdentifier("pron-lesson")
    }
    private var page: some View {
        StudyPage(title: t(.speakPronThuVienPhatAm)) {
            PronLessonHeader(lesson: model.lesson, mouth: model.mouth)
            PronRulesCards(lesson: model.lesson)
            PronMistakeTip(lesson: model.lesson)
            PronWordsCard(model: model)
            if let say = model.say { PronSayCard(model: say) }
            if let rh = model.rhythm { PronRhythmCard(model: rh, onRoute: onRoute) }
            if let pg = model.pairGame { PronPairsCard(model: pg, lesson: model.lesson) }
            PronSentencesCard(model: model)
            PronQuizCard(model: model)
            nav
        }
    }
    private var nav: some View {
        HStack(spacing: LKSpacing.spaceSm) {
            if let p = model.prev { SkillAction(title: "← " + p.s("ipa"), action: { onRoute(AppRoute("pron", arg: p.s("id"))) }) }
            if let n = model.next { SkillAction(title: n.s("ipa") + " →", primary: true, action: { onRoute(AppRoute("pron", arg: n.s("id"))) }) }
            else { SkillAction(title: t(.speakPronVeThuVien), primary: true, action: { dismiss() }) }
        }
    }
}

/// IPA, title, how, chips and the mouth figure (pron-sound top)
struct PronLessonHeader: View {
    let lesson: JSON, mouth: PronMouthShape?
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: LKSpacing.spaceSm) {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
                        Text(verbatim: lesson.s("ipa")).studyText(LKType.displayHeroMobile, LKColor.secondary).englishText().minimumScaleFactor(0.6).lineLimit(2)
                        Text(verbatim: pronText(lesson.s("title"), t)).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
                    }
                    FlowLayout(spacing: 6) {
                        ForEach(PronLessonRules.chips(lesson["mouth"] ?? .null), id: \.self) { StudyChip(text: pronText($0, t)) }
                    }
                    Text(verbatim: pronText(lesson.s("how"), t)).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            if let mouth { PronMouthFigure(shape: mouth) } else { Text(verbatim: lesson.s("emoji")).font(.system(size: 56)).accessibilityHidden(true) }
        }
    }
}

struct PronRulesCards: View {
    let lesson: JSON
    @Environment(\.l10n) private var t
    var body: some View {
        if !lesson.list("rules").isEmpty {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    Text(verbatim: "📋 " + t(.speakPronQuyTac)).studyText(LKType.headlineSm)
                    ForEach(Array(lesson.list("rules").enumerated()), id: \.offset) { _, r in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(verbatim: r.s("label")).studyText(LKType.titlePill).englishText()
                            Text(verbatim: pronText(r.s("when"), t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

struct PronMistakeTip: View {
    let lesson: JSON
    @Environment(\.l10n) private var t
    var body: some View {
        VStack(spacing: LKSpacing.spaceSm) {
            SkillCard {
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: "🇻🇳 " + t(.modelCommonMistakes)).studyText(LKType.titlePill)
                    Text(verbatim: pronText(lesson.s("vn"), t)).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            SkillNote(icon: "lightbulb.fill", text: pronText(lesson.s("tip"), t), tint: LKColor.tertiary)
        }
    }
}

/// word list: 🔊 hear · 🐢 slow · 🎙 say → score (colour + number)
struct PronWordsCard: View {
    let model: PronLessonModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(verbatim: "🗣️ " + t(.speakPronLuyenTuN, ["n": model.words.count])).studyText(LKType.headlineSm)
                Text(verbatim: t(.speakPronBamNgheMauNoi)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                ForEach(Array(model.words.enumerated()), id: \.offset) { k, w in row(k, w) }
                hint
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
    private func row(_ k: Int, _ w: JSON) -> some View {
        HStack(spacing: 4) {
            VStack(alignment: .leading, spacing: 0) {
                Text(verbatim: w.s("w")).studyText(LKType.titlePill).englishText()
                Text(verbatim: w.s("ipa")).studyText(LKType.bodySm, LKColor.secondary).englishText()
            }
            Spacer(minLength: 0)
            if let s = model.scores[k] { PronScore(score: s) }
            LessonIconButton(system: "speaker.wave.2.fill", label: t(.revPlayModel)) { model.hear(w.s("w")) }
            LessonIconButton(system: "tortoise.fill", label: t(.lessonSlowShort)) { model.hear(w.s("w"), slow: true) }
            SpeakMic(state: model.listening == "w\(k)" ? .listening : .idle, label: t(.speakPronNoiChamDiem)) { Task { await model.micWord(k) } }.scaleEffect(0.6).frame(width: 48, height: 48)
        }
        .frame(minHeight: 48)
    }
    @ViewBuilder private var hint: some View {
        switch model.hint {
        case .none: EmptyView()
        case .heard(let h): SkillNote(icon: "ear", text: t(.revHeard, ["heard": h]))
        case .error(let c): SkillNote(icon: "exclamationmark.triangle.fill", text: SpeakErrors.message(c, t), tint: LKColor.error)
        }
    }
}

/// a 0…100 score with its tone: number + icon + colour (never colour alone)
struct PronScore: View {
    let score: Int
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let tone = PronLessonRules.tone(score)
        let color: LKDynamicColor = tone == .good ? LKColor.success : (tone == .hard ? LKColor.tertiary : LKColor.error)
        let icon = tone == .good ? "checkmark.circle.fill" : (tone == .hard ? "minus.circle.fill" : "arrow.counterclockwise.circle.fill")
        HStack(spacing: 3) {
            Image(systemName: icon).font(.system(size: 13, weight: .bold)).accessibilityHidden(true)
            Text(verbatim: String(score)).studyText(LKType.labelMetric, color)
        }
        .foregroundStyle(color.resolve(scheme))
    }
}

struct PronSentencesCard: View {
    let model: PronLessonModel
    @Environment(\.l10n) private var t
    var body: some View {
        if !model.sentences.isEmpty {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: "📢 " + t(.speakPronLuyenCau)).studyText(LKType.headlineSm)
                    ForEach(Array(model.sentences.enumerated()), id: \.offset) { k, s in
                        HStack(spacing: 4) {
                            EnglishText(text: s)
                            Spacer(minLength: 0)
                            if let sc = model.sentenceScores[k] { PronScore(score: sc) }
                            LessonIconButton(system: "speaker.wave.2.fill", label: t(.revPlayModel)) { model.hear(s) }
                            SpeakMic(state: model.listening == "s\(k)" ? .listening : .idle, label: t(.speakPronNoiChamDiem)) { Task { await model.micSentence(k) } }.scaleEffect(0.6).frame(width: 48, height: 48)
                        }
                        .frame(minHeight: 48)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}

struct PronQuizCard: View {
    let model: PronLessonModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let qs = model.lesson.list("quiz")
        if !qs.isEmpty {
            SkillCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    Text(verbatim: "✏️ " + t(.speakPronKiemTraNhanh)).studyText(LKType.headlineSm)
                    ForEach(Array(qs.enumerated()), id: \.offset) { q, item in question(q, item) }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
    private func question(_ q: Int, _ item: JSON) -> some View {
        let picked = model.quiz.picked[q], answer = model.quiz.answers[q]
        return VStack(alignment: .leading, spacing: 6) {
            Text(verbatim: "\(q + 1). " + pronText(item.s("q"), t)).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
            ForEach(Array(item.strs("options").enumerated()), id: \.offset) { j, o in
                let right = picked != nil && j == answer, wrong = picked == j && j != answer
                Button { Task { await model.pick(q, j) } } label: {
                    HStack {
                        Text(verbatim: o).studyText(LKType.bodyMd).englishText().multilineTextAlignment(.leading)
                        Spacer(minLength: 0)
                        if right { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true) }
                        if wrong { Image(systemName: "xmark.circle.fill").foregroundStyle(LKColor.error.resolve(scheme)).accessibilityHidden(true) }
                    }
                    .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 44)
                    .tactile(fill: LKColor.surfaceContainerHigh, line: right ? LKColor.success : (wrong ? LKColor.error : LKColor.outlineVariant), ledge: LKColor.outlineVariant, radius: 14)
                }
                .buttonStyle(LKPressStyle())
                .disabled(picked != nil)
            }
            if picked != nil { Text(verbatim: (picked == answer ? "✅ " : "❌ ") + pronText(item.s("explain"), t)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
        }
    }
}

// MARK: - pair listening game

struct PronPairsCard: View {
    let model: PronPairGameModel
    let lesson: JSON
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(verbatim: "👂 " + t(.speakPronNghePhanBietCap)).studyText(LKType.headlineSm)
                if let f = model.finished { result(f) }
                else if let r = model.current { round(r) }
                else { intro }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityIdentifier("pron-pairs")
    }
    private var intro: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            Text(verbatim: t(.speakPronNgheMotTuTrong)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            FlowLayout(spacing: 6) {
                ForEach(Array(model.pairs.enumerated()), id: \.offset) { _, p in StudyChip(text: p.joined(separator: " ↔ ")) }
            }
            SkillAction(title: "▶️ " + t(.speakPronBatDauNLuot, ["n": PronLessonRules.rounds]), primary: true) { model.start() }
        }
    }
    private func round(_ r: PronLessonRules.Round) -> some View {
        VStack(spacing: LKSpacing.spaceSm) {
            SkillProgress(value: Double(model.index) / Double(max(1, model.rounds.count)))
            SkillAction(title: t(.speakPronNgheLaiIN, ["i": model.index + 1, "n": model.rounds.count]), icon: "speaker.wave.2.fill") { model.play() }
            HStack(spacing: LKSpacing.spaceSm) {
                ForEach(Array(r.options.enumerated()), id: \.offset) { k, w in option(k, w, r) }
            }
        }
    }
    private func option(_ k: Int, _ w: String, _ r: PronLessonRules.Round) -> some View {
        let locked = model.picked != nil
        let right = locked && k == r.answer, wrong = model.picked == k && k != r.answer
        let line: LKDynamicColor = right ? LKColor.success : (wrong ? LKColor.error : LKColor.outlineVariant)
        return Button { model.pick(k) } label: {
            HStack(spacing: 6) {
                Text(verbatim: w).studyText(LKType.headlineSm).englishText()
                if right { Image(systemName: "checkmark.circle.fill").foregroundStyle(LKColor.success.resolve(scheme)).accessibilityHidden(true) }
                if wrong { Image(systemName: "xmark.circle.fill").foregroundStyle(LKColor.error.resolve(scheme)).accessibilityHidden(true) }
            }
            .frame(maxWidth: .infinity, minHeight: 64)
            .tactile(fill: LKColor.surfaceContainerHigh, line: line, ledge: line, radius: 16)
        }
        .buttonStyle(LKPressStyle())
        .disabled(locked)
    }
    private func result(_ f: (pct: Int, good: Bool, ok: Int)) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            Text(verbatim: t(.speakPronNgheDungOkN, ["ok": f.ok, "n": model.rounds.count]) + " – " + (f.good ? t(.speakPronTaiBanDaPhan) : t(.speakPronNgheChamLaiTung))).studyText(LKType.titlePill, f.good ? LKColor.success : LKColor.tertiary).fixedSize(horizontal: false, vertical: true)
            SkillAction(title: "↺ " + t(.revPlayAgain)) { model.start() }
        }
    }
}

// MARK: - "Nói thử"

struct PronSayCard: View {
    let model: PronSayModel
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(verbatim: "🎙️ " + t(.speakPronLuyenNoiCapTu)).studyText(LKType.headlineSm)
                switch model.phase {
                case .intro: intro
                case .running: running
                case .blocked(let code): blocked(code)
                case .done: done
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityIdentifier("pron-say")
    }
    private func label(_ c: PronContrast) -> String { pronText(model.pairs.label(c), t) }
    private var weakBlock: some View { PronSayWeak(model: model) }
    private var intro: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            Text(verbatim: t(.speakPronNhinTuNgheMau)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            FlowLayout(spacing: 6) {
                ForEach(model.contrasts, id: \.id) { StudyChip(text: label($0)) }
                StudyChip(text: t(.speakPronNCap, ["n": model.total]))
            }
            weakBlock
            SkillAction(title: t(.speakPronBatDauNoiN, ["n": PronSaySession.size]), icon: "mic.fill", primary: true) { model.start() }
        }
    }
    @ViewBuilder private var running: some View {
        if let s = model.session, let it = model.item {
            VStack(spacing: LKSpacing.spaceSm) {
                HStack {
                    Text(verbatim: model.pairs.contrast(it.c).map(label) ?? "").studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    if it.retry { StudyChip(text: t(.actionRetry)) }
                    Spacer(minLength: 0)
                    Text(verbatim: s.progress).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
                }
                SkillProgress(value: Double(s.i) / Double(PronSaySession.size))
                Text(verbatim: it.target).studyText(LKType.displayHeroMobile).englishText().minimumScaleFactor(0.6).lineLimit(1)
                Text(verbatim: it.ipa[it.side]).studyText(LKType.bodyMd, LKColor.secondary).englishText()
                Text(verbatim: "≠ " + it.other).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText()
                HStack(spacing: LKSpacing.spaceSm) {
                    SkillAction(title: t(.revPlayModel), icon: "waveform") { model.hear() }
                    SkillAction(title: t(.lessonSlowShort), icon: "tortoise.fill") { model.hear(slow: true) }
                }
                SpeakMic(state: model.listening ? .listening : .idle, label: t(.speakPronBamDeNoi)) { Task { await model.tapMic() } }
                feedback(it)
            }
            .frame(maxWidth: .infinity)
        }
    }
    private func feedback(_ it: PronItem) -> some View { PronSayFeedback(model: model, it: it) }
    private func blocked(_ code: String) -> some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            SkillNote(icon: "info.circle.fill", text: code == "unsupported" ? t(.speakPronThietBiNayChua) : t(.speakMicDeniedNative))
            HStack(spacing: LKSpacing.spaceSm) {
                SkillAction(title: t(.skillListenLuyenNghe), icon: "headphones", primary: true) { model.onFallback() }
                SkillAction(title: t(.actionRetry), icon: "arrow.clockwise") { model.retryFromBlocked() }
            }
        }
    }
    private var done: some View { PronSayDone(model: model) }
}

/// the feedback under the microphone: listening · right · the other word + tip · retry · skip, and (inline only) the next-word button
struct PronSayFeedback: View {
    let model: PronSayModel
    let it: PronItem
    var inlineNext = true
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        if model.listening {
            Text(verbatim: t(.speakSpkDangNghe)).studyText(LKType.bodyMd)
        } else if let st = model.step {
            VStack(spacing: LKSpacing.spaceXs) {
                switch st.kind {
                case .good: Text(verbatim: "✅ " + t(.modelCorrect)).studyText(LKType.titlePill, LKColor.success)
                case .other:
                    Text(verbatim: "❌ " + t(.speakPronMayNgheThanhHeard, ["heard": it.other])).studyText(LKType.titlePill, LKColor.error).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                    if let tip = st.tip { SkillNote(icon: "lightbulb.fill", text: tip, tint: LKColor.tertiary) }
                case .retry:
                    Text(verbatim: t(.speakPronChuaNgheRoThu)).studyText(LKType.bodyMd).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                    if !st.heard.isEmpty { Text(verbatim: t(.revHeard, ["heard": st.heard])).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText() }
                case .skip: Text(verbatim: t(.speakPronVanChuaRoChuyen)).studyText(LKType.bodyMd).multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
                case .blocked: EmptyView()
                }
                if st.nextButton, inlineNext { SkillAction(title: t(.speakPronTuTiepTheo), primary: true) { Task { await model.next() } } }
            }
        } else {
            Text(verbatim: t(.speakPronBamDeNoi)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
        }
    }
}

/// the result of a finished session (score line, chips per contrast, weak sounds, practise again)
struct PronSayDone: View {
    let model: PronSayModel
    var showAgain = true
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {

        if let s = model.summary {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(verbatim: t(.speakPronNoiDungOkN, ["ok": s.ok, "n": s.n])).studyText(LKType.titlePill, s.good ? LKColor.success : LKColor.tertiary)
                FlowLayout(spacing: 6) {
                    ForEach(Array(s.chips.enumerated()), id: \.offset) { _, c in StudyChip(text: pronText(c.label, t) + " \(c.ok)/\(c.n)", tint: c.ok == c.n ? LKColor.success : LKColor.secondary) }
                }
                PronSayWeak(model: model)
                if showAgain { SkillAction(title: t(.speakPronLuyenLai), icon: "arrow.clockwise", primary: true) { model.start() } }
            }
        }
    }
}

/// the practised sounds, weakest first (or a hint when there is no data yet)
struct PronSayWeak: View {
    let model: PronSayModel
    @Environment(\.l10n) private var t
    private func label(_ c: PronContrast) -> String { pronText(model.pairs.label(c), t) }
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if model.weakIds.isEmpty {
                Text(verbatim: t(.speakPronChuaCoDuLieu)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            } else {
                Text(verbatim: "🎯 " + t(.speakPronAmCanLuyenThem)).studyText(LKType.titlePill)
                FlowLayout(spacing: 6) {
                    ForEach(model.weakIds, id: \.self) { id in
                        if let c = model.pairs.contrast(id), let s = model.stats[id] {
                            let pct = Vocab.round((s.acc ?? 0) * 100)
                            StudyChip(text: label(c) + " \(pct)%", tint: pct >= 80 ? LKColor.success : LKColor.tertiary)
                        }
                    }
                }
            }
        }
    }
}

// MARK: - rhythm & shadowing

struct PronRhythmCard: View {
    let model: PronRhythmModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack {
                    Text(verbatim: t(.speakPronNhipCauShadowing)).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: 0)
                    StudyChip(text: model.accent == "en-US" ? t(.speakPronGiongMy) : t(.speakPronGiongAnh))
                }
                Text(verbatim: t(.speakPronTuInToDuoc)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                picker
                sentence
                HStack(spacing: LKSpacing.spaceSm) {
                    SkillAction(title: t(.revPlayModel), icon: "speaker.wave.2.fill") { model.hear() }
                    SkillAction(title: t(.lessonSlowShort), icon: "tortoise.fill") { model.hear(slow: true) }
                }
                SkillAction(title: t(.speakPronShadowing), icon: "mic.fill", primary: true, enabled: model.phase != .model && model.phase != .listening) { Task { await model.shadow() } }
                status
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityIdentifier("pron-rhythm")
    }
    private var picker: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(verbatim: t(.speakPronChonCau)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            FlowLayout(spacing: 6) {
                ForEach(model.content.coach.sentences.indices, id: \.self) { i in
                    let on = i == model.k, done = (model.best[i] ?? 0) >= 85
                    Button { model.pick(i) } label: {
                        Text(verbatim: done ? "✓" : String(i + 1)).studyText(LKType.labelMetric, on ? LKColor.onSecondary : LKColor.onSurface)
                            .frame(minWidth: 44, minHeight: 44)
                            .background(Capsule().fill((on ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(Text(verbatim: t(.usageQ, ["n": i + 1])))
                    .accessibilityAddTraits(on ? .isSelected : [])
                }
            }
        }
    }
    /// stressed words big and bold with a bar above; small words light with their weak-form IPA
    private var sentence: some View {
        FlowLayout(spacing: 8) {
            ForEach(Array(model.plan.enumerated()), id: \.offset) { _, p in
                VStack(spacing: 0) {
                    if p.stress {
                        Rectangle().fill(LKColor.secondary.resolve(scheme)).frame(height: 3)
                        Text(verbatim: p.w).studyText(LKType.headlineSm).englishText()
                    } else {
                        Text(verbatim: p.w).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText()
                        if !p.weak.isEmpty { Text(verbatim: p.weak).studyText(LKType.labelBadge, LKColor.secondary).englishText() }
                    }
                }
            }
        }
        .environment(\.layoutDirection, .leftToRight)
    }
    @ViewBuilder private var status: some View {
        switch model.phase {
        case .idle: EmptyView()
        case .model: SkillNote(icon: "speaker.wave.2.fill", text: t(.speakPronNgheMau))
        case .listening: SkillNote(icon: "mic.fill", text: t(.speakPronNoiTheoNgayBay), tint: LKColor.secondary)
        case .error(let c): SkillNote(icon: "exclamationmark.triangle.fill", text: SpeakErrors.message(c, t), tint: LKColor.error)
        case .result(let r): result(r)
        }
    }
    private func result(_ r: PronRhythmModel.Result) -> some View {
        let verdict = r.band == .great ? t(.speakPronRatGiongGiongMau) : (r.band == .close ? t(.speakPronGanRoiNgheLai) : t(.speakPronChuaSaoNgheCham))
        return VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            HStack(spacing: 6) {
                PronScore(score: r.score)
                Text(verbatim: "/100 · " + verdict).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
            }
            Text(verbatim: t(.speakPronMayNgheDuoc) + ": “" + (r.heard.isEmpty ? "…" : r.heard) + "”").studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText()
            if !r.missingContent.isEmpty { SkillNote(icon: "lightbulb.fill", text: t(.speakPronNhanRoHonCac, ["w": r.missingContent.joined(separator: ", ")]), tint: LKColor.tertiary) }
            else if !r.missingWeak.isEmpty { SkillNote(icon: "lightbulb.fill", text: t(.speakPronMayNgheSotTu, ["w": r.missingWeak.joined(separator: ", ")]), tint: LKColor.tertiary) }
            Text(verbatim: t(.speakPronLuyenTiep)).studyText(LKType.labelBadge, LKColor.onSurfaceVariant)
            FlowLayout(spacing: 6) {
                ForEach(Array(r.suggestions.enumerated()), id: \.offset) { _, s in suggestion(s) }
            }
        }
    }
    @ViewBuilder private func suggestion(_ s: PronSuggestion) -> some View {
        switch s {
        case .rhythm(let k): SkillAction(title: t(.usageQ, ["n": k + 1])) { model.pick(k) }
        case .skill(let id): SkillAction(title: lessonTitle(id)) { onRoute(AppRoute("pron", arg: id)) }
        case .pair(_, let skill): SkillAction(title: lessonTitle(skill)) { onRoute(AppRoute("pron", arg: skill)) }
        }
    }
    private func lessonTitle(_ id: String) -> String { model.content.lesson(id).map { pronText($0.s("title"), t) } ?? t(.speakPronBaiLienQuan) }
}
