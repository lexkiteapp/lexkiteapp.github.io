import SwiftUI
import Observation
import UIKit
import LKDesign
import LKStore
import LKSync
import LKStrings

// MARK: - #/qstats

/// #/qstats: progress per skill and question type, read from `game.qstat` (written by the listening / reading / TOEIC / TOEFL practice).
@MainActor @Observable
final class QStatsModel {
    let ctx: SkillsContext
    private(set) var pack = WritePack()
    private(set) var cards: [Essay.QCard] = []
    private(set) var loaded = false
    init(ctx: SkillsContext) { self.ctx = ctx }
    func load() async {
        guard !loaded else { return }
        await ctx.reload()
        pack = await WriteContentStore.shared.pack() ?? WritePack()
        cards = Essay.qstatCards(ctx.game, order: pack.skills.map { $0.id })
        loaded = true
    }
    /// fixed state for snapshots
    static func fixture(ctx: SkillsContext, pack: WritePack, game: JSON) -> QStatsModel {
        let m = QStatsModel(ctx: ctx)
        m.pack = pack; m.cards = Essay.qstatCards(game, order: pack.skills.map { $0.id }); m.loaded = true
        return m
    }
    func route(skill: String, kind: String) -> AppRoute? {
        let h = Essay.practiceRoute(skill: skill, kind: kind, skills: Dictionary(uniqueKeysWithValues: pack.skills.map { ($0.id, [$0.icon, $0.name, $0.link]) }), rtype: pack.rtype, named: SkillsConsts.current.names[kind] != nil)
        return AppRoute.parseHash(h)
    }
}

struct QStatsView: View {
    let model: QStatsModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        StudyPage(title: t(.skillQtTienBoTheoKy)) {
            Text(t.rich(.skillQtTongHopTuCac)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            if model.loaded && model.cards.isEmpty {
                SkillCard { StudyEmpty(icon: "tray", title: t(.skillQtChuaCoDuLieu)) }
            }
            ForEach(model.cards, id: \.skill) { card in cardView(card) }
            FlowLayout {
                WritingChip(text: t(.skillQtLuyenReadingTheoDang), system: "scope") { onRoute(AppRoute("rtype")) }
                WritingChip(text: "IELTS Listening", system: "headphones", english: true) { onRoute(AppRoute("listening")) }
                WritingChip(text: "TOEIC", system: "briefcase.fill", english: true) { onRoute(AppRoute("toeic")) }
                WritingChip(text: "TOEFL iBT", system: "graduationcap.fill", english: true) { onRoute(AppRoute("toefl")) }
            }
        }
        .task { await model.load() }
        .accessibilityIdentifier("qstats")
    }

    private func secs(_ s: Int) -> String { s >= 60 ? t(.skillQtMPhutSGiay, ["m": s / 60, "s": s % 60]) : t(.skillQtSGiay, ["s": s]) }
    private func tone(_ r: Essay.QRow) -> LKDynamicColor { r.tone == .good ? LKColor.success : r.tone == .again ? LKColor.error : LKColor.secondary }
    private func kpi(_ v: String, _ label: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(verbatim: v).studyText(LKType.headlineSm).environment(\.layoutDirection, .leftToRight)
            Text(verbatim: label).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
        }.accessibilityElement(children: .combine)
    }

    private func cardView(_ c: Essay.QCard) -> some View {
        let info = model.pack.skill(c.skill)
        return SkillCard {
            Text(verbatim: (info?.icon ?? "") + " " + (info?.name ?? c.skill)).studyText(LKType.headlineSm).environment(\.layoutDirection, .leftToRight)
            HStack(alignment: .top, spacing: LKSpacing.spaceMd) {
                kpi("\(c.pct)%", t(.skillQtTiLeDung)); kpi(String(c.total), t(.skillQtCauDaLam))
                if let s = c.secsEach { kpi(secs(s), t(.skillQtMoiCauUocTinh)) }
            }
            ForEach(c.rows, id: \.kind) { r in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Button { if let ro = model.route(skill: c.skill, kind: r.kind) { onRoute(ro) } } label: {
                            Text(verbatim: SkillsConsts.current.names[r.kind] ?? r.kind).studyText(LKType.titlePill, LKColor.secondary).environment(\.layoutDirection, .leftToRight)
                        }.frame(minHeight: LKFrame.shared.minTap, alignment: .leading)
                        Text(verbatim: "· " + t(.skillQtNCau, ["n": r.total])).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                        Spacer(minLength: 0)
                        Text(verbatim: "\(r.pct)%").studyText(LKType.titlePill).environment(\.layoutDirection, .leftToRight)
                        Text(verbatim: r.secsEach.map { secs($0) } ?? "–").studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                    }
                    GeometryReader { g in
                        ZStack(alignment: .leading) {
                            Capsule().fill(LKColor.outlineVariant.resolve(scheme))
                            Capsule().fill(tone(r).resolve(scheme)).frame(width: g.size.width * CGFloat(min(100, r.pct)) / 100)
                        }
                    }.frame(height: 6).accessibilityHidden(true)
                }
                .accessibilityElement(children: .combine)
            }
            if let w = c.weak {
                SkillNote(icon: "target", text: t(.skillQtNenLuyenTiep) + " " + (SkillsConsts.current.names[w] ?? w), tint: LKColor.tertiary)
                if let k = QuestionsView.tipKeys[w] { SkillNote(icon: "lightbulb.fill", text: t(k)) }
            }
        }
    }
}

// MARK: - #/criteria

/// #/criteria: the four IELTS Writing / Speaking criteria (band 4–9), three model answers with their critique, and the jump-a-band roadmap. Data = `write-pack.json` `criteria`.
@MainActor @Observable
final class CriteriaModel {
    let ctx: SkillsContext
    private(set) var pack = WritePack()
    private(set) var loaded = false
    var skill: String
    var bandFilter = "all"
    var modelBand = "6.5"
    init(ctx: SkillsContext, route: AppRoute) {
        self.ctx = ctx
        let sk = route.arg ?? route.query["skill"] ?? ""
        skill = sk == "speaking" || sk == "speak" ? "speaking" : "writing"
    }
    private(set) var failed = false
    func load() async {
        guard !loaded else { return }
        if let p = await WriteContentStore.shared.pack() { pack = p; loaded = true; failed = false } else { failed = true }
    }
    /// fixed state for snapshots
    static func fixture(ctx: SkillsContext, pack: WritePack, skill: String, bandFilter: String = "all", modelBand: String = "6.5") -> CriteriaModel {
        let m = CriteriaModel(ctx: ctx, route: AppRoute("criteria", arg: skill))
        m.pack = pack; m.bandFilter = bandFilter; m.modelBand = modelBand; m.loaded = true
        return m
    }
    var data: JSON { pack.criteria[skill] ?? .null }
    var isWriting: Bool { skill == "writing" }
    func pick(skill s: String) { skill = s; modelBand = "6.5" }
    var model: JSON { data["models"]?[modelBand] ?? data["models"]?["6.5"] ?? .null }
    var modelText: String { model.s(isWriting ? "essay" : "transcript") }
    var scoreKeys: [String] { pack.scoreKeys[skill] ?? [] }
    func copy() { UIPasteboard.general.string = modelText }
    func speak() { ctx.core.voice.speak(model.s("transcript"), who: "ama", accent: "en-GB") }
}

struct CriteriaView: View {
    let model: CriteriaModel
    var onRoute: (AppRoute) -> Void = { _ in }
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    private let bands = ["all", "4", "5", "6", "7", "8", "9"], modelBands = ["5.0", "6.5", "8.0"]

    var body: some View {
        StudyPage(title: t(.writeCriteriaTieuChiChamIelts)) {
            if model.failed { SkillCard { StudyEmpty(icon: "wifi.slash", title: t(.syncOffline), action: (t(.actionRetry), { Task { await model.load() } })) } }
            else if !model.loaded { WritingSkeleton(rows: 5) }
            else { content }
        }
        .task { await model.load() }
        .accessibilityIdentifier("criteria")
    }

    private func color(_ id: String) -> LKDynamicColor {
        switch id { case "tr", "fc": return LKColor.secondary; case "lr": return LKColor.tertiary; case "gra": return LKColor.success; default: return LKColor.primary }
    }
    private func bandColor(_ b: Double) -> LKDynamicColor { b >= 8 ? LKColor.secondary : b >= 6.5 ? LKColor.success : LKColor.tertiary }

    @ViewBuilder private var content: some View {
        Text(t(.writeCriteriaNamVung4Tieu)).studyText(LKType.bodyMd, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        Text(t(.writeCriteriaDienGiaiTuBang)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        FlowLayout {
            WritingChip(text: t(.revWritingRoom), system: "pencil.line") { onRoute(AppRoute("write")) }
            WritingChip(text: t(.revSpeakingRoom), system: "bubble.left.fill") { onRoute(AppRoute("speaking")) }
        }
        FlowLayout {
            WritingChip(text: t(.writeCriteriaIeltsWriting), selected: model.isWriting, system: "pencil.line") { model.pick(skill: "writing") }
            WritingChip(text: t(.writeCriteriaIeltsSpeaking), selected: !model.isWriting, system: "bubble.left.fill") { model.pick(skill: "speaking") }
        }
        Text(t(.writeCriteriaLocBand)).studyText(LKType.labelMetric, LKColor.onSurfaceVariant)
        FlowLayout(spacing: 6) { ForEach(bands, id: \.self) { b in WritingChip(text: b == "all" ? t(.vocabAll) : b, selected: model.bandFilter == b) { model.bandFilter = b } } }
        Text(model.isWriting ? t(.writeCriteria4TieuChiIelts) : t(.writeCriteria4TieuChiIelts2)).studyText(LKType.headlineMd)
        Text(verbatim: t.src(model.data.s("desc"))).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
        ForEach(model.data.list("criteria"), id: \.self) { c in criterion(c) }
        modelCard
        roadmap
        SkillCard {
            Text(t(.writeCriteriaSanSangApDung)).studyText(LKType.headlineSm)
            Text(t(.writeCriteriaApDungNgayLuyen)).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            SkillAction(title: t(.writeCriteriaThucHanhVietTask), icon: "pencil.line", primary: true) { onRoute(AppRoute("write")) }
            SkillAction(title: t(.writeCriteriaLuyenNoiSpeakingNgay), icon: "bubble.left.fill") { onRoute(AppRoute("speaking")) }
            SkillAction(title: t(.writeCriteriaLuyenTask1Bieu), icon: "chart.line.uptrend.xyaxis") { onRoute(AppRoute("task1")) }
        }
    }

    private func criterion(_ c: JSON) -> some View {
        let col = color(c.s("id"))
        return SkillCard {
            HStack {
                Text(verbatim: c.s("icon")).font(.system(size: 24)).accessibilityHidden(true)
                Spacer(minLength: 0)
                StudyChip(text: c.s("short") + " · " + c.s("weight"), tint: col)
            }
            EnglishText(text: c.s("name"), style: LKType.headlineSm)
            Text(verbatim: t.src(c.s("desc"))).studyText(LKType.bodySm, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
            ForEach(model.bands(of: c), id: \.0) { b, item in
                let bc = bandColor(Double(b) ?? 0)
                VStack(alignment: .leading, spacing: 4) {
                    HStack { Text(verbatim: "Band " + b).studyText(LKType.titlePill, bc); Spacer(minLength: 0) }
                    Text(verbatim: t.src(item.s("summary"))).studyText(LKType.labelMetric, LKColor.onSurfaceVariant).fixedSize(horizontal: false, vertical: true)
                    Text(verbatim: t.src(item.s("details"))).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
                    SkillNote(icon: "exclamationmark.triangle.fill", text: t(.writeCriteriaBayCanTranh) + " " + t.src(item.s("pitfall")), tint: LKColor.error)
                }
                .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
                .overlay(alignment: .leading) { Rectangle().fill(bc.resolve(scheme)).frame(width: 3).clipShape(RoundedRectangle(cornerRadius: 2)) }
            }
        }
    }

    private var modelCard: some View {
        let m = model.model
        return SkillCard {
            StudyChip(text: t(.writeCriteriaDeMauBaiMau))
            Text(verbatim: model.data["prompt"]?.s("topic") ?? "").studyText(LKType.headlineSm).environment(\.layoutDirection, .leftToRight)
            Text(verbatim: t.src(model.data["prompt"]?.s("type") ?? "")).studyText(LKType.bodySm, LKColor.onSurfaceVariant)
            FlowLayout(spacing: 6) { ForEach(modelBands, id: \.self) { b in WritingChip(text: "Band " + b, selected: model.modelBand == b, english: true) { model.modelBand = b } } }
            EnglishText(text: "📌 " + (model.data["prompt"]?.s("text") ?? ""), style: LKType.bodyMd)
            HStack {
                Text(model.isWriting ? t(.writeCriteriaNoiDungBaiViet) : t(.writeCriteriaBanGhiAmLoi)).studyText(LKType.titlePill)
                Text(verbatim: "(" + t(.vocabWords, ["n": model.modelText.split(whereSeparator: { $0.isWhitespace }).count]) + ")").studyText(LKType.bodySm, LKColor.onSurfaceVariant)
                Spacer(minLength: 0)
                StudyChip(text: m.s("band"))
            }
            EnglishText(text: model.modelText, style: LKType.bodyMd)
            FlowLayout {
                WritingChip(text: t(.writeCriteriaSaoChep), system: "doc.on.doc") { model.copy() }
                if !model.isWriting { WritingChip(text: t(.vocabPronounce), system: "speaker.wave.2.fill") { model.speak() } }
            }
            Text(t(.writeCriteriaPhanTichDiemSo)).studyText(LKType.titlePill)
            ForEach(model.scoreKeys, id: \.self) { k in
                let score = JSON.orZero(m["scores"]?[k]), bc = bandColor(score)
                HStack(spacing: LKSpacing.spaceXs) {
                    Text(verbatim: k.uppercased()).studyText(LKType.labelMetric).frame(width: 70, alignment: .leading).environment(\.layoutDirection, .leftToRight)
                    GeometryReader { g in
                        ZStack(alignment: .leading) {
                            Capsule().fill(LKColor.outlineVariant.resolve(scheme))
                            Capsule().fill(bc.resolve(scheme)).frame(width: g.size.width * CGFloat(score / 9))
                        }
                    }.frame(height: 10).accessibilityHidden(true)
                    Text(verbatim: score == score.rounded() ? String(Int(score)) : String(score)).studyText(LKType.labelMetric, bc).frame(width: 36, alignment: .trailing).environment(\.layoutDirection, .leftToRight)
                }
                .accessibilityElement(children: .combine)
            }
            ForEach(m.list("critique"), id: \.self) { c in
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: t.src(c.s("title"))).studyText(LKType.titlePill, LKColor.secondary).fixedSize(horizontal: false, vertical: true)
                    Text(verbatim: t.src(c.s("text"))).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true)
                }
                .padding(LKSpacing.spaceSm).frame(maxWidth: .infinity, alignment: .leading)
                .background(RoundedRectangle(cornerRadius: 12, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme)))
            }
        }
    }

    private var roadmap: some View {
        SkillCard {
            Text(t(.writeCriteriaLoTrinhButPha)).studyText(LKType.headlineSm)
            ForEach(model.data.list("jumpTips"), id: \.self) { j in
                VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                    HStack { StudyChip(text: "Band \(j.s("from")) ➔ Band \(j.s("to"))"); Spacer(minLength: 0); Text(t(.writeCriteriaBuocNhayVot)).studyText(LKType.bodySm, LKColor.onSurfaceVariant) }
                    Text(verbatim: t.src(j.s("title"))).studyText(LKType.titlePill).fixedSize(horizontal: false, vertical: true)
                    ForEach(j.strs("steps"), id: \.self) { s in Text(verbatim: "• " + t.src(s)).studyText(LKType.bodySm).fixedSize(horizontal: false, vertical: true) }
                }
            }
        }
    }
}

extension CriteriaModel {
    /// the band rows of one criterion that the band filter lets through, ascending
    func bands(of c: JSON) -> [(String, JSON)] {
        let all = (c["bands"]?.object ?? [:]).sorted { (Int($0.key) ?? 0) < (Int($1.key) ?? 0) }
        return all.filter { bandFilter == "all" || bandFilter == $0.key }.map { ($0.key, $0.value) }
    }
}
