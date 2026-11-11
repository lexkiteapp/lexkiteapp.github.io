import SwiftUI
import LKDesign
import LKStrings
import LKCore

/// Bottom sheet after Check (Stitch feedback-correct / feedback-wrong): result + XP + streak, the right answer when wrong, the word card
/// (word · IPA · meaning), "Why?" (gold bank, 0 AI) with the score booster, Continue. The teacher above it holds cheer / concern.
struct LessonFeedbackSheet: View {
    let model: LessonModel, item: LessonItem
    let streak: Int
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    private var ok: Bool { model.lastOK }
    private var tint: LKDynamicColor { ok ? LKColor.success : LKColor.error }

    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack(spacing: LKSpacing.spaceXs) {
                Image(systemName: ok ? "checkmark.circle.fill" : "xmark.circle.fill").font(.system(size: 26, weight: .bold)).foregroundStyle(tint.resolve(scheme))
                Text(ok ? t(.lessonGreat) : (item.type == "match" ? t(.lessonPairWrong) : t(.lessonWrong)))
                    .lkText(LKType.headlineMd).foregroundStyle(tint.resolve(scheme)).accessibilityAddTraits(.isHeader)
                Spacer(minLength: 0)
                if ok && item.retry == 0 { LessonChip(text: "+2 \(t(.todayXp))", icon: "bolt.fill", tint: LKColor.tertiary) }
            }
            HStack(spacing: LKSpacing.spaceXs) {
                if streak > 0 { LessonChip(text: t(.lessonStreakDays, ["n": streak]), icon: "flame.fill", tint: LKColor.tertiary) }
                if model.lastCombo >= 3 { LessonChip(text: t(.lessonCombo, ["n": model.lastCombo]), icon: "bolt.fill", tint: LKColor.secondary) }
            }
            if !ok, item.type != "match", let a = item.answer, !a.isEmpty {
                VStack(alignment: .leading, spacing: 2) {
                    Text(t(.lessonAnswer)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                    Text(a).lkText(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                }
            }
            if let c = item.card { wordCard(c) }
            if model.showWhy, let c = item.card { WhyPanel(card: c, gold: model.gold) }
            Button(t(.actionContinue)) { model.next() }
                .buttonStyle(PrimaryButtonStyle())
                .padding(.top, LKSpacing.space2xs)
        }
        .padding(LKSpacing.spaceMd)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background {
            UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28, style: .continuous)
                .fill((ok ? LKColor.surfaceContainerHigh : LKColor.errorContainer).resolve(scheme))
                .overlay(alignment: .top) { Rectangle().fill(tint.resolve(scheme)).frame(height: 3) }
                .clipShape(UnevenRoundedRectangle(topLeadingRadius: 28, topTrailingRadius: 28, style: .continuous))
                .ignoresSafeArea(edges: .bottom)
        }
    }

    private func wordCard(_ c: LessonCard) -> some View {
        HStack(alignment: .top, spacing: LKSpacing.spaceSm) {
            VStack(alignment: .leading, spacing: 2) {
                Text(c.word).lkText(LKType.headlineSm).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                let ipa = c.ipaUS.isEmpty ? c.ipa : c.ipaUS
                if !ipa.isEmpty { Text(ipa).lkText(LKType.bodyMd).foregroundStyle(LKColor.secondary.resolve(scheme)).englishText() }
                let m = LessonQuestionView.meaning(c)
                if !m.isEmpty { Text(m).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
            }
            Spacer(minLength: 0)
            LessonIconButton(system: "speaker.wave.2.fill", label: t(.lessonReplay)) { model.voice.speakWord(c.word) }
            Button { model.toggleWhy() } label: {
                Text(t(.lessonWhy)).lkText(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme))
                    .padding(.horizontal, LKSpacing.spaceSm).frame(minHeight: LKFrame.shared.minTap)
            }
            .buttonStyle(.plain)
            .accessibilityAddTraits(model.showWhy ? .isSelected : [])
        }
    }
}

/// "Why?": stress, UK/US difference, gold-bank explanations (why · wrong → right · memory tip), definition + examples. Works offline from the card.
struct WhyPanel: View {
    let card: LessonCard, gold: LessonGold?
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let entries = gold?.entries(for: card.word) ?? []
        VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
            if let s = LessonEngine.stress(card.ipaUS.isEmpty ? card.ipa : card.ipaUS) { line(t(.lessonStress, ["n": s.syl, "m": s.of])) }
            if let u = LessonEngine.usuk(card) { line("\(t(.lessonUsuk)) UK \(u.uk) · US \(u.us)") }
            ForEach(Array(entries.enumerated()), id: \.offset) { _, e in
                Text(e.why).lkText(LKType.bodyLg).bold().foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                if let w = e.w, let r = e.r, !w.isEmpty {
                    (Text("✗ ") + Text(w).strikethrough() + Text("\n✓ ") + Text(r)).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurface.resolve(scheme)).englishText()
                }
                if let m = e.mem, !m.isEmpty { line("\(t(.lessonGoldMnemonic)) \(m)") }
            }
            if entries.isEmpty, !card.def.isEmpty { line("\(t(.lessonGoldDefinition)) \(card.def)") }
            let ex = (entries.first?.ex ?? []) + (card.ex.isEmpty ? [] : [card.ex])
            let uniq = ex.reduce(into: [String]()) { if !$1.isEmpty, !$0.contains($1) { $0.append($1) } }.prefix(2)
            if !uniq.isEmpty { line("\(t(.lessonGoldExample)) " + uniq.joined(separator: " · ")) }
            if entries.isEmpty && card.def.isEmpty && uniq.isEmpty { line(t(.lessonGoldNone)) }
            if let b = gold?.booster(for: card.word) { booster(b) }
        }
        .padding(LKSpacing.spaceSm)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(LKColor.surfaceContainerLow.resolve(scheme)))
    }
    private func line(_ s: String) -> some View { Text(s).lkText(LKType.bodyMd).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
    private func booster(_ b: LessonGold.Entry) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(t(.lessonBoostTitle)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.tertiary.resolve(scheme))
            Text("✗ \(b.w ?? "")").lkText(LKType.bodyMd).foregroundStyle(LKColor.error.resolve(scheme)).englishText()
            Text("✓ \(b.r ?? "")").lkText(LKType.bodyMd).foregroundStyle(LKColor.success.resolve(scheme)).englishText()
        }
    }
}
