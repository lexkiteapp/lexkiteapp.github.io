import SwiftUI
import LKDesign
import LKStore
import LKSync
import LKCore
import LKStrings

/// The sections of the summary, top to bottom (fixtures start a shot at one of them to show it inside the small frame)
enum CallSummarySection: Int, Comparable {
    case top, words, notes, transcript, phrases, actions
    static func < (a: CallSummarySection, b: CallSummarySection) -> Bool { a.rawValue < b.rawValue }
}

/// Call summary · Stitch call-result: the score ring and band, how many answers were spoken, the topic words used, fluency notes, the transcript with
/// gentle fixes, sound pairs, the model sentences, the phrases to remember, then retry the weak lines · add to cards · call again · other calls.
struct CallSummaryView: View {
    let model: CallSummaryModel
    let flow: CallFlowModel
    var onRoute: (AppRoute) -> Void = { _ in }
    /// fixtures only: the sections before this one are left out so the shot shows the one under test
    var startAt: CallSummarySection = .top
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    private var r: CallRecap { model.recap }
    private var script: CallScript { model.script }

    var body: some View {
        StudyPage(title: t(.callUiTongKetCuocGoi), onBack: { flow.toList() }) {
            if startAt <= .top { header; scoreCard }
            if startAt <= .words, !r.target.isEmpty { topicWords }
            if startAt <= .notes { notes }
            if startAt <= .transcript { transcript }
            if startAt <= .phrases { phrases }
            actions
        }
        .accessibilityIdentifier("call-summary")
    }

    // MARK: header + score
    private var callName: String {
        let k = flow.nameKey(script)
        return k.isEmpty ? script.title : SpeakText.render(.string(k), t)
    }
    private var header: some View {
        var parts = [script.em + " " + callName]
        if script.retry { parts.append(t(.speakPronLuyenLai)) }
        parts.append(Bidi.isolate(t(.skillQtMPhutSGiay, ["m": model.summary.secs / 60, "s": model.summary.secs % 60])))
        parts.append("+\(model.summary.xp) XP")
        return Text(verbatim: parts.joined(separator: " · ")).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
    }
    private var answeredText: String {
        var line = t(.callUiBanDaTraLoi, ["n": r.turns.count, "s": model.summary.voiced])
        if r.words > 0 { line += " · " + t(.vocabWords, ["n": r.words]) }
        return Bidi.isolate(line)
    }
    private var scoreCard: some View {
        SkillCard {
            HStack(spacing: LKSpacing.spaceMd) {
                ZStack {
                    Circle().stroke(LKColor.outlineVariant.resolve(scheme), lineWidth: 10)
                    Circle().trim(from: 0, to: Double(r.score) / 100).stroke(LKColor.secondary.resolve(scheme), style: StrokeStyle(lineWidth: 10, lineCap: .round)).rotationEffect(.degrees(-90))
                    Text(verbatim: String(r.score)).studyText(LKType.headlineMd)
                }
                .frame(width: 92, height: 92).accessibilityElement(children: .ignore).accessibilityLabel(Text(verbatim: "\(r.score)/100"))
                VStack(alignment: .leading, spacing: 4) {
                    Text(verbatim: t(r.band.key)).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
                    Text(verbatim: answeredText).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: 0)
                SpeakStill(who: script.who, pose: "happy").frame(width: 56, height: 68).accessibilityHidden(true)
            }
        }
    }

    // MARK: topic words · fluency notes
    private func head(_ icon: String, _ text: String) -> some View {
        HStack(spacing: LKSpacing.spaceXs) {
            Image(systemName: icon).foregroundStyle(LKColor.secondary.resolve(scheme)).accessibilityHidden(true)
            Text(verbatim: text).studyText(LKType.headlineSm).fixedSize(horizontal: false, vertical: true)
        }
        .accessibilityAddTraits(.isHeader)
    }
    private var topicWords: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            head("puzzlepiece.fill", Bidi.isolate(t(.callUiBanDaDungN, ["n": r.used.count, "k": r.target.count])))
            FlowLayout(spacing: 8) {
                ForEach(r.target, id: \.self) { w in
                    let used = r.used.contains(w)
                    HStack(spacing: 4) {
                        Image(systemName: used ? "checkmark.circle.fill" : "circle").font(.system(size: 12, weight: .bold)).accessibilityHidden(true)
                        Text(verbatim: w).studyText(LKType.labelMetric, used ? LKColor.success : LKColor.onSurface).englishText()
                    }
                    .foregroundStyle((used ? LKColor.success : LKColor.onSurfaceVariant).resolve(scheme))
                    .padding(.horizontal, LKSpacing.spaceSm).padding(.vertical, 6)
                    .background(Capsule().fill((used ? LKColor.success : LKColor.surfaceContainerHighest).resolve(scheme).opacity(used ? 0.14 : 1)))
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }
    private var notes: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            head("chart.line.uptrend.xyaxis", t(.callUiNhanXetDoTroi))
            ForEach(Array(r.notes.enumerated()), id: \.offset) { _, n in
                HStack(alignment: .firstTextBaseline, spacing: LKSpacing.spaceXs) {
                    Text(verbatim: "•").studyText(LKType.bodyMd, LKColor.secondary).accessibilityHidden(true)
                    Text(verbatim: Bidi.isolate(n.text(t))).studyText(LKType.bodyMd).fixedSize(horizontal: false, vertical: true)
                }
            }
        }
    }

    // MARK: transcript
    private var transcript: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            head("text.bubble.fill", t(.callUiLoiThoaiSuaLoi))
            if r.turns.isEmpty { Text(verbatim: t(.callUiChuaCoLuotNao)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant) }
            ForEach(Array(r.turns.enumerated()), id: \.offset) { _, x in turn(x) }
        }
    }
    private func turn(_ x: CallTurn) -> some View {
        SkillCard {
            VStack(alignment: .leading, spacing: 6) {
                Text(verbatim: script.teacherName + ": " + (x.m ?? "")).studyText(LKType.bodySm, LKColor.onSurfaceVariant).englishText().fixedSize(horizontal: false, vertical: true)
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    (Text(verbatim: x.weak ? "↻ " : "") + Text(verbatim: t(.speakRpBan) + ": ").fontWeight(.bold) + Text(verbatim: x.text))
                        .studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
                    if x.picked { StudyChip(text: t(.callUiGoiY)) }
                }
                if let f = x.fix {
                    VStack(alignment: .leading, spacing: 2) {
                        (Text(verbatim: f.bad).strikethrough() + Text(verbatim: " → ") + Text(verbatim: f.good).fontWeight(.bold)).studyText(LKType.bodySm).englishText().fixedSize(horizontal: false, vertical: true)
                        Text(verbatim: t(f.why)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    }
                }
                ForEach(Array(x.slips.enumerated()), id: \.offset) { _, sl in slip(sl) }
                if x.fl.short { Text(verbatim: "↻ " + t(.callUiTraLoiDayDu)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true) }
                if x.weak || x.picked, !x.model.isEmpty { modelLine(x.model) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .accessibilityElement(children: .contain)
    }
    private func slip(_ s: CallSlip) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                Text(verbatim: "👂").accessibilityHidden(true)
                Text(verbatim: s.meant).studyText(LKType.bodySm).fontWeight(.bold).englishText()
                LessonIconButton(system: "speaker.wave.2.fill", label: t(.lessonKindListen) + ": " + s.meant) { model.sayWord(s.meant) }.padding(.vertical, -10)
                Text(verbatim: "≠").studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                Text(verbatim: s.said).studyText(LKType.bodySm).englishText()
                LessonIconButton(system: "speaker.wave.2.fill", label: t(.lessonKindListen) + ": " + s.said) { model.sayWord(s.said) }.padding(.vertical, -10)
            }
            Button { onRoute(AppRoute("pron", arg: s.skill)) } label: {
                Text(verbatim: t(.callUiLuyenCapAmNay)).studyText(LKType.labelMetric, LKColor.secondary).frame(minHeight: 44, alignment: .leading)
            }
            .buttonStyle(.plain)
        }
    }
    private func modelLine(_ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 4) {
            (Text(verbatim: t(.callUiCauMau) + ": ").foregroundColor(LKColor.onSurfaceVariant.resolve(scheme)) + Text(verbatim: text))
                .studyText(LKType.bodySm).englishText().fixedSize(horizontal: false, vertical: true)
            LessonIconButton(system: "speaker.wave.2.fill", label: t(.lessonKindListen)) { model.say(text) }.padding(.vertical, -10)
            LessonIconButton(system: "tortoise.fill", label: t(.lessonKindListen) + " 0.7×") { model.say(text, slow: true) }.padding(.vertical, -10)
        }
    }

    // MARK: phrases + the four buttons
    private var phrases: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            head("quote.bubble.fill", t(.callUiCumTuNenNho))
            ForEach(Array(script.phrases.enumerated()), id: \.offset) { _, p in
                (Text(verbatim: p.phrase).fontWeight(.bold) + Text(verbatim: " – ") + Text(verbatim: p.meaning).foregroundColor(LKColor.onSurfaceVariant.resolve(scheme)))
                    .studyText(LKType.bodyMd).englishText().fixedSize(horizontal: false, vertical: true)
            }
        }
    }
    @ViewBuilder private var actions: some View {
        let nWeak = r.weak.count
        VStack(spacing: LKSpacing.spaceXs) {
            if nWeak > 0 { SkillAction(title: "↻ " + t(.callUiLuyenLaiNCau, ["n": nWeak]), primary: true) { flow.retryWeak() } }
            SkillAction(title: saveTitle, primary: nWeak == 0, enabled: model.savedCount == nil && !model.saving) { Task { await model.save() } }
            SkillAction(title: "📞 " + t(.callUiGoiLai)) { flow.callAgain() }
            SkillAction(title: t(.callUiCuocGoiKhac)) { flow.toList() }
            Text(verbatim: t(.callUiLoiBanNoiChi)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                .frame(maxWidth: .infinity, alignment: .leading).padding(.top, LKSpacing.spaceXs)
        }
    }
    private var saveTitle: String {
        if let n = model.savedCount { return "✓ " + t(.callUiDaThemNThe, ["n": n]) }
        return "+ " + t(.callUiThemVaoTheOn)
    }
}
