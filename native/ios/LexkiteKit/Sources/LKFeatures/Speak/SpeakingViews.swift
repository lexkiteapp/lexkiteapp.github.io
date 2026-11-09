import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync
import LKCore

/// #/speaking: Stitch `speaking-hub` (parts, topic, question card, examiner, mic + clock, sample, words, tips), `speaking-record` (Part 2 preparation / recording)
/// and `speaking-result` (stats, transcript, chips, feedback, shadowing of the sample).
struct SpeakingView: View {
    let model: SpeakingModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t

    var body: some View {
        Group {
            if model.stage == .recording || model.stage == .prep { recordPage }
            else if model.stage == .result, let a = model.analysis { resultPage(a) }
            else { hubPage }
        }
        .task { await model.load() }
        .onDisappear { model.stop() }
        .accessibilityIdentifier("inner-speaking")
    }

    private func key(_ k: String) -> String { SpeakText.render(.string(k), t) }
    private func limits(_ k: L10nKey, _ p: Speaking.Part) -> String { Bidi.isolate(t(k, ["a": p.lo, "b": p.hi])) }

    // MARK: hub + result
    private var hubPage: some View {
        StudyPage(title: t(.speakSpkPhongLuyenSpeaking)) {
            Text(t(.speakSpkGiamKhaoDocCau)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            tabs
            topicRow
            Text(verbatim: Bidi.isolate(t(.speakSpkNChuDe, ["n": model.bank.count]))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            examiner
            if let s = model.sample { sampleCard(s) }
            micCard
            suggestionsCard
            tipsCard
        }
    }

    /// Stitch speaking-result: an inner screen of its own (back to the hub, the coach, the summary tiles, transcript, feedback, the sample, record again)
    private func resultPage(_ a: Speaking.Analysis) -> some View {
        StudyPage(title: t(.speakSpkKetQua), onBack: { model.closeResult() }) {
            PronCoachCard(controller: model.teacher, text: t(.speakSpkBamMicroDeTra3))
            resultCard(a)
            if let s = model.sample { sampleCard(s) }
            micCard
        }
    }

    private var tabs: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            ForEach(model.parts, id: \.id) { p in
                let on = p.id == model.partId
                Button { model.select(part: p.id) } label: {
                    Text(verbatim: key(p.name)).lkTextSafe(LKType.labelMetric).multilineTextAlignment(.center)
                        .foregroundStyle((on ? LKColor.onSecondary : LKColor.onSurface).resolve(scheme))
                        .padding(.horizontal, 6).frame(maxWidth: .infinity, minHeight: 48)
                        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill((on ? LKColor.secondary : LKColor.surfaceContainerHighest).resolve(scheme)))
                }
                .buttonStyle(.plain)
                .accessibilityAddTraits(on ? .isSelected : [])
            }
        }
    }

    private var topicRow: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            Menu {
                ForEach(Array(model.bank.enumerated()), id: \.offset) { i, b in
                    Button(key(b.s("title"))) { model.select(topic: i) }
                }
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "text.book.closed").accessibilityHidden(true)
                    Text(verbatim: key(model.topic.s("title"))).lineLimit(1)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.up.chevron.down").font(.system(size: 12, weight: .bold)).accessibilityHidden(true)
                }
                .studyText(LKType.titlePill).padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: 48)
                .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerHighest.resolve(scheme)))
            }
            .accessibilityLabel(t(.speakSpkChuDe))
            Button { model.randomTopic() } label: {
                Image(systemName: "dice.fill").font(.system(size: 18, weight: .bold)).foregroundStyle(LKColor.onSecondary.resolve(scheme))
                    .frame(width: 48, height: 48).background(Circle().fill(LKColor.secondary.resolve(scheme)))
            }
            .accessibilityLabel(t(.speakSpkChuDeNgauNhien))
        }
    }

    private var examiner: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack(alignment: .top) {
                    StudyChip(text: key(model.part.desc), icon: "info.circle")
                    Spacer(minLength: 0)
                    if model.questions.count > 1 { Text(verbatim: Bidi.isolate(t(.speakSpkCauIN, ["i": model.qi + 1, "n": model.questions.count]))).studyText(LKType.labelMetric, LKColor.onSurfaceVariant) }
                }
                HStack(alignment: .bottom, spacing: LKSpacing.spaceSm) {
                    SpeakTeacher(controller: model.teacher, size: CGSize(width: 70, height: 84))
                    questionBox
                }
                HStack(spacing: LKSpacing.spaceXs) {
                    SkillAction(title: t(.speakSpkNgheGiamKhaoHoi), icon: "speaker.wave.2.fill") { model.hear() }
                    if model.questions.count > 1 { SkillAction(title: t(.speakSpkCauKhac) + " →", icon: "forward.fill") { model.nextQuestion() } }
                }
            }
        }
    }
    @ViewBuilder private var questionBox: some View {
        if model.partId == "p2" {
            VStack(alignment: .leading, spacing: 4) {
                EnglishText(text: model.topic["p2"]?.s("q") ?? "", style: LKType.titlePill)
                EnglishText(text: "You should say:", style: LKType.bodySm, color: LKColor.onSurfaceVariant)
                ForEach(Array(model.cuePoints.enumerated()), id: \.offset) { _, p in
                    HStack(alignment: .firstTextBaseline, spacing: 6) { Text(verbatim: "•").accessibilityHidden(true); EnglishText(text: p, style: LKType.bodyMd) }
                }
            }
        } else {
            EnglishText(text: model.question, style: LKType.headlineSm)
        }
    }

    private var micCard: some View {
        SkillCard {
            VStack(spacing: LKSpacing.spaceSm) {
                Text(verbatim: model.clockText).studyText(LKType.headlineLg).environment(\.layoutDirection, .leftToRight)
                Text(verbatim: limits(.speakSpkMucTieuAB, model.part)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                SpeakMic(state: .idle, label: t(.speakSpkBatDauDungGhi)) { model.micTapped() }
                Text(model.analysis != nil ? t(.speakSpkBamMicroDeTra3) : (model.partId == "p2" ? t(.speakSpkBamMicroDeTra) : t(.speakSpkBamMicroDeTra2))).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
                if let n = model.micNotice { SkillNote(icon: "exclamationmark.triangle.fill", text: n, tint: LKColor.error) }
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: result
    private func resultCard(_ a: Speaking.Analysis) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Text(t(.speakSpkKetQua)).studyText(LKType.headlineSm)
                VStack(spacing: LKSpacing.spaceXs) {   // Stitch: 2 × 2 stat tiles
                    HStack(spacing: LKSpacing.spaceXs) { stat(t(.speakSpkThoiLuong), "\(a.seconds)s"); stat(t(.speakSpkTuPhut), Speaking.wpmShown(a)) }
                    HStack(spacing: LKSpacing.spaceXs) { stat(t(.speakSpkSoTu), String(a.words)); stat(t(.speakSpkTuDem), String(a.fillers)) }
                }
                if !a.transcript.isEmpty {
                    Text(t(.speakSpkBanChuMayNhan)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                    WordFlow(pieces: model.transcriptPieces(a.transcript), highlights: ["link", "awl", "mine"]) { _ in }
                }
                if !a.chips.isEmpty {
                    FlowLayout(spacing: 6) { ForEach(Array(a.chips.enumerated()), id: \.offset) { _, c in chip(c) } }
                }
                Text(t(.speakSpkNhanXet)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                ForEach(Array(a.notes.enumerated()), id: \.offset) { i, n in   // Stitch: stacked coloured feedback cards (green = all good, then amber / blue)
                    let good = a.notes.count == 1 && n.s("k").hasPrefix("Rất tốt"); let tint = good ? LKColor.success : (i % 2 == 0 ? LKColor.tertiary : LKColor.secondary)
                    HStack(alignment: .top, spacing: LKSpacing.spaceXs) {
                        Image(systemName: good ? "checkmark.circle.fill" : "lightbulb.fill").font(.system(size: 16)).foregroundStyle(tint.resolve(scheme)).accessibilityHidden(true)
                        Text(StudyText.rich(SpeakText.render(n, t))).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                        Spacer(minLength: 0)
                    }
                    .padding(LKSpacing.spaceSm)
                    .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(tint.resolve(scheme).opacity(0.14)))
                    .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous).stroke(tint.resolve(scheme).opacity(0.4), lineWidth: 1))
                }
                Text(t(.speakSpkPhanTichTuDong)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            }
        }
    }
    private func stat(_ label: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(verbatim: label).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.leading).lineLimit(2).minimumScaleFactor(0.8)
            Text(verbatim: value).studyText(LKType.headlineMd).environment(\.layoutDirection, .leftToRight)
        }
        .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
        .accessibilityElement(children: .combine)
    }
    private func chip(_ c: Speaking.Chip) -> some View {
        let icon = c.kind == "ok" ? "checkmark" : (c.kind == "lv" ? "graduationcap.fill" : "link")
        return StudyChip(text: c.text, icon: icon, tint: c.kind == "ok" ? LKColor.success : (c.kind == "lv" ? LKColor.tertiary : LKColor.secondary)).englishText()
    }

    // MARK: sample + shadowing
    private func sampleCard(_ s: (sentences: [String], vocab: [(en: String, vi: String)], text: String)) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                Button { model.sampleOpen.toggle() } label: {
                    HStack {
                        Image(systemName: "doc.text").accessibilityHidden(true)
                        VStack(alignment: .leading, spacing: 2) {
                            Text(t(.speakSpkCauTraLoiMau)).studyText(LKType.titlePill)
                            Text(t(.speakSpkXemSauKhiDa)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                        }
                        Spacer(minLength: 0)
                        Image(systemName: model.sampleOpen ? "chevron.up" : "chevron.down").accessibilityHidden(true)
                    }
                    .frame(minHeight: 44)
                }
                .buttonStyle(.plain)
                if model.sampleOpen {
                    EnglishText(text: s.text, style: LKType.bodyMd)
                    if !s.vocab.isEmpty {
                        FlowLayout(spacing: 6) {
                            ForEach(Array(s.vocab.enumerated()), id: \.offset) { _, v in
                                Button { Task { await model.save(phrase: v.en, vi: v.vi, title: t(.speakSpkSpeakingMau)) } } label: {
                                    StudyChip(text: "+ " + v.en).englishText().frame(minHeight: 44)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    HStack(spacing: LKSpacing.spaceXs) {
                        SkillAction(title: t(.speakSpkLuyenShadowing), icon: "repeat", primary: true) { model.startShadow() }
                        LessonIconButton(system: "speaker.wave.2.fill", label: t(.speakSpkNgheGiamKhaoHoi)) { model.playSample() }
                    }
                    if let sh = model.shadow { shadowBox(sh) }
                }
            }
        }
    }
    @ViewBuilder private func shadowBox(_ sh: Speaking.Shadow) -> some View {
        if let avg = model.shadowDone {
            SkillNote(icon: "checkmark.seal.fill", text: t(.speakSpkHoanThanhShadowingTrung, ["pct": avg]), tint: LKColor.success)
        } else if !sh.finished {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(verbatim: Bidi.isolate(t(.speakSpkCauINNghe, ["i": sh.k + 1, "n": sh.sentences.count]))).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                EnglishText(text: sh.current, style: LKType.bodyLg)
                HStack(spacing: LKSpacing.spaceXs) {
                    LessonIconButton(system: "speaker.wave.2.fill", label: t(.speakSpNgheCauMau)) { model.saySentence() }
                    LessonIconButton(system: "tortoise.fill", label: t(.speakSpNgheCauMau)) { model.saySentence(slow: true) }
                    SpeakMic(state: model.shadowListening ? .listening : .idle, label: t(.speakSpkNoiLai)) { Task { await model.shadowSpeak() } }
                    SkillAction(title: t(.actionContinue) + " →") { Task { await model.shadowSkip() } }
                }
                if model.shadowListening { SkillNote(icon: "waveform", text: t(.speakSpkDangNghe), tint: LKColor.error) }
                if let e = model.shadowError { SkillNote(icon: "exclamationmark.triangle.fill", text: e, tint: LKColor.error) }
                if let r = model.shadowLast {
                    let tone: LKDynamicColor = Speaking.verdict(r.score) == .good ? LKColor.success : (Speaking.verdict(r.score) == .medium ? LKColor.tertiary : LKColor.error)
                    SkillNote(icon: Speaking.verdict(r.score) == .good ? "checkmark.circle.fill" : "exclamationmark.circle.fill", text: t(.speakSpkScoreGiongMau, ["score": r.score]) + " · " + t(.speakSpkMayNgheHeard, ["heard": r.heard]), tint: tone)
                    SkillAction(title: t(.actionContinue) + " →", primary: true) { Task { await model.shadowNext() } }
                }
            }
        }
    }

    // MARK: words + tips
    private var suggestionsCard: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(t(.speakSpkTuVungNenDung)).studyText(LKType.titlePill)
                ForEach(Array(model.suggestions.enumerated()), id: \.offset) { _, w in
                    HStack(spacing: LKSpacing.spaceXs) {
                        VStack(alignment: .leading, spacing: 0) {
                            Text(verbatim: w.s("word")).studyText(LKType.titlePill).englishText()
                            Text(verbatim: Vocab.meanOf(w, meanLang: model.ctx.lang)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).lineLimit(2)
                        }
                        Spacer(minLength: 0)
                        LessonIconButton(system: "speaker.wave.2.fill", label: w.s("word")) { model.ctx.core.speak(w.s("word"), settings: model.ctx.settings) }
                        if !model.inDeck(w.s("word")) { LessonIconButton(system: "plus", label: t(.speakSpkThemVaoFlashcard)) { Task { await model.save(word: w) } } }
                    }
                }
            }
        }
    }
    private var tipsCard: some View {
        SkillCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(t(.speakSpkMeoPart, ["part": key(model.part.name).components(separatedBy: " · ").first ?? ""])).studyText(LKType.titlePill)
                ForEach(Array(model.tips.enumerated()), id: \.offset) { i, tip in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(verbatim: String(i + 1)).studyText(LKType.labelMetric, LKColor.onSecondary).frame(width: 22, height: 22).background(Circle().fill(LKColor.secondary.resolve(scheme)))
                        Text(StudyText.rich(key(tip))).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    // MARK: recording (Stitch speaking-record)
    private var recordPage: some View {
        let p = model.part
        return VStack(spacing: 0) {
            TopBar(variant: .focus(progress: min(1, model.seconds / Double(max(1, p.hi)))), title: "", onExit: { model.discard() })
            ScrollView {
                VStack(spacing: LKSpacing.spaceMd) {
                    HStack(spacing: LKSpacing.spaceXs) {
                        StudyChip(text: key(p.name).components(separatedBy: " · ").first ?? "", icon: model.stage == .recording ? "record.circle.fill" : "pencil", tint: model.stage == .recording ? LKColor.error : LKColor.secondary)
                        Text(verbatim: limits(model.partId == "p2" ? .speakSpkMucTieuAB2 : .speakSpkMucTieuAB, p)).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    }
                    SkillCard {
                        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                            questionBox
                        }.frame(maxWidth: .infinity, alignment: .leading)
                    }
                    clock(p)
                    if model.stage == .prep { prepBox } else { liveBox }
                }
                .padding(.horizontal, LKFrame.shared.gutter).padding(.top, LKSpacing.spaceXs).padding(.bottom, LKSpacing.space2xl)
                .frame(maxWidth: LKFrame.shared.width).frame(maxWidth: .infinity)
            }
            .scrollIndicators(.hidden)
        }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
    }
    private func clock(_ p: Speaking.Part) -> some View {
        let color: LKDynamicColor = model.tone == .again ? LKColor.error : (model.tone == .good ? LKColor.success : LKColor.onSurface)
        return HStack(alignment: .firstTextBaseline, spacing: 6) {
            Text(verbatim: model.clockText).studyText(LKType.headlineLg, color)
            Text(verbatim: "/ " + Speaking.clock(Double(p.hi))).studyText(LKType.bodyMd, LKColor.onSurfaceVariant)
        }
        .environment(\.layoutDirection, .leftToRight)
        .accessibilityElement(children: .combine)
    }
    private var prepBox: some View {
        let hint = t(.speakSpkThoiGianChuanBi)
        let parts = Self.prepSplit(hint)
        return VStack(spacing: LKSpacing.spaceSm) {
            Text(verbatim: "📝 " + parts.text).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
            SkillAction(title: parts.link, icon: "mic.fill", primary: true) { model.skipPrep() }
        }
    }
    /// the preparation hint carries a link (`<a id="skipPrep">start speaking now</a>`): text before it, and the link as a button
    static func prepSplit(_ s: String) -> (text: String, link: String) {
        guard let a = s.range(of: "<a"), let open = s.range(of: ">", range: a.upperBound..<s.endIndex), let close = s.range(of: "</a>", range: open.upperBound..<s.endIndex) else { return (StudyText.plain(s), StudyText.plain(s)) }
        let text = String(s[..<a.lowerBound]).trimmingCharacters(in: CharacterSet(charactersIn: " ·"))
        return (StudyText.plain(text), StudyText.plain(String(s[open.upperBound..<close.lowerBound])))
    }
    private var liveBox: some View {
        VStack(spacing: LKSpacing.spaceSm) {
            SpeakMic(state: .listening, label: t(.speakSpkBatDauDungGhi)) { model.finishRecording() }
            Text(t(.speakSpkDangGhiAmVa)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).multilineTextAlignment(.center)
            if !model.live.isEmpty { Text(verbatim: model.live).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).italic().englishText().frame(maxWidth: .infinity, alignment: .leading) }
            if model.seconds > 3 {
                let wpm = Vocab.round(Double(Speaking.wordCount(model.live)) / (model.seconds / 60))
                if wpm > 0 { SkillNote(icon: "waveform", text: t(.speakSpNTuPhut, ["n": wpm])) }
            }
            SkillAction(title: t(.speakSpkKetQua), icon: "stop.circle.fill", primary: true) { model.finishRecording() }
        }
    }
}

struct SpeakingScreen: View {
    let route: AppRoute
    @Environment(AppServices.self) private var services
    var body: some View {
        let go: (AppRoute) -> Void = { StudyRoutes.go($0, services: services) }
        SkillsHost(make: { SpeakingModel(ctx: $0, io: .live(voice: $0.core.voice), arg: route.arg) }) { SpeakingView(model: $0, onRoute: go) }
    }
}
