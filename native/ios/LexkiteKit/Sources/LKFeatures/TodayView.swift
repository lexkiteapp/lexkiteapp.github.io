import SwiftUI
import LKDesign
import LKStrings
import LKStore
import LKSync

/// P02 – the Today hub. Port of the Stitch "Lexkite Kit" Today screen (brand/stitch/v2/today-*.html → web/js/st/v2/today.js, data from
/// web/js/ux1.js home2/homeBase). Same blocks in the same order: stats row · teacher bubble · today's focus · plan · review banner ·
/// quick practice · readiness · stories · 7-day streak · your path. Blocks without data are not drawn (web prunes data-show=0).
public struct TodayView: View {
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    public init() {}

    public var body: some View {
        let s = services.today.snapshot, c = services.today.content
        ScrollView {
            LazyVStack(alignment: .leading, spacing: LKSpacing.spaceMd) {
                // order = signed server document (SignedContent / TodayModule), else the web order; only native components
                ForEach(services.today.modules, id: \.self) { m in module(m, s, c) }
            }
            .padding(.horizontal, LKFrame.shared.gutter)
            .padding(.top, LKSpacing.spaceSm)
            .padding(.bottom, LKSpacing.space2xl)
            .frame(maxWidth: LKFrame.shared.width)
            .frame(maxWidth: .infinity)
        }
        .scrollIndicators(.hidden)
        .safeAreaInset(edge: .top, spacing: 0) { TodayTopBar() }
        .background(LKColor.background.resolve(scheme).ignoresSafeArea())
        .refreshable { await services.today.refresh(); await services.engine?.syncNow(); await services.today.refresh() }
        .task { await services.today.refresh() }
    }

    @ViewBuilder func module(_ m: TodayModule, _ s: TodaySnapshot, _ c: TodayContent) -> some View {
        switch m {
        case .stats: TodayStatsRow(s: s)
        case .bubble: TodayBubble(text: say(s, c), xpReady: c.xpToCheckpoint)
        case .focus: TodayFocusCard(lesson: c.lesson)
        case .plan: if !c.plan.isEmpty { TodayPlanCard(items: c.plan) }
        case .review: if s.total > 0 { TodayReviewBanner(due: s.total) }
        case .quick: TodayQuickPractice(s: s)
        case .readiness: if let r = c.readiness { TodayReadinessCard(r: r) }
        case .stories: if !c.stories.isEmpty { TodayStories(stories: c.stories) }
        case .streak: TodayStreakCard(s: s)
        case .path: if !c.path.isEmpty { TodayPathCard(nodes: c.path, unitName: c.lesson?.unitName) }
        }
    }

    /// ux1.js home2 `say`: greeting by hour + what is left today.
    func say(_ s: TodaySnapshot, _ c: TodayContent) -> String { Self.say(s, c, t: t) }
    public static func say(_ s: TodaySnapshot, _ c: TodayContent, t: L10n) -> String {
        let g = s.hour < 12 ? t(.todayGreetMorning) : s.hour < 18 ? t(.todayGreetAfternoon) : t(.todayGreetEvening)
        let left = c.planLeft, due = s.total
        if left > 0 { return due > 0 ? t(.todaySayPlanDue, ["g": g, "a": left, "b": due]) : t(.todaySayPlan, ["g": g, "a": left]) }
        return due > 0 ? t(.todaySayDue, ["g": g, "b": due]) : t(.todaySayDone, ["g": g])
    }
}

// MARK: - building blocks (Stitch tactile card: 2 pt outline + 3 pt bottom ledge)

struct LKCard<Content: View>: View {
    var fill: LKDynamicColor = LKColor.surfaceContainer
    var padding: CGFloat = LKSpacing.spaceMd
    let content: Content
    @Environment(\.colorScheme) private var scheme
    init(fill: LKDynamicColor = LKColor.surfaceContainer, padding: CGFloat = LKSpacing.spaceMd, @ViewBuilder content: () -> Content) {
        self.fill = fill; self.padding = padding; self.content = content()
    }
    var body: some View {
        // one card for the whole builder: modifiers on a multi-view builder would give every child its own card
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) { content }
            .padding(padding)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background {
                RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous).fill(LKColor.outlineVariant.resolve(scheme)).offset(y: 3)
                RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous).fill(fill.resolve(scheme))
                RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2)
            }
    }
}

/// Press feedback for tappable cards/tiles: small press-down (off with Reduce Motion) + soft haptic.
struct LKPressStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .contentShape(Rectangle())
            .offset(y: LKMotionPolicy.pressOffset(pressed: configuration.isPressed, reduce: reduceMotion, down: 2))
            .scaleEffect(LKMotionPolicy.pressScale(pressed: configuration.isPressed, reduce: reduceMotion, down: 0.985))
            .animation(LKMotionPolicy.animation(response: 0.22, damping: 0.7, reduce: reduceMotion), value: configuration.isPressed)
            .lkHaptic(.tap, trigger: configuration.isPressed, when: { $0 })
    }
}

enum Fmt {
    static func int(_ n: Int, _ lang: String) -> String { n.formatted(.number.locale(Locale(identifier: lang))) }
}

struct TodayTopBar: View {
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        HStack(spacing: LKSpacing.spaceSm) {
            Text(t(.tabToday)).lkText(LKType.headlineMd).accessibilityAddTraits(.isHeader)
            Spacer(minLength: 0)
            Button { services.router.open(AppRoute("dict")) } label: {
                Image(systemName: "magnifyingglass").font(.system(size: 17, weight: .bold))
                    .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Circle())
            }
            .accessibilityLabel(t(.todayLookUp))
            Button {
                if services.auth.user == nil { services.signInSheet = true } else { services.router.open(AppRoute("me")) }
            } label: {
                Text(services.auth.user?.initial ?? "L")
                    .lkText(LKType.titlePill)
                    .foregroundStyle(LKColor.onSecondary.resolve(scheme))
                    .frame(width: 36, height: 36)
                    .background(Circle().fill(LKColor.secondary.resolve(scheme)))
                    .frame(width: LKFrame.shared.minTap, height: LKFrame.shared.minTap).contentShape(Circle())
            }
            .accessibilityLabel(services.auth.user == nil ? t(.authSignIn) : t(.meAccount))
        }
        .foregroundStyle(LKColor.onSurface.resolve(scheme))
        .padding(.horizontal, LKFrame.shared.gutter)
        .frame(minHeight: 56)
        .background(LKColor.background.resolve(scheme).ignoresSafeArea(edges: .top))
        .overlay(alignment: .bottom) { Rectangle().fill(LKColor.outlineVariant.resolve(scheme)).frame(height: 2) }
    }
}

struct TodayStatsRow: View {
    let s: TodaySnapshot
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    var body: some View {
        HStack(spacing: LKSpacing.spaceXs) {
            chip(icon: "target", tint: LKColor.secondary, value: s.target.isEmpty ? "–" : s.target, label: s.target.isEmpty ? t(.todaySetGoal) : t(.todayTarget)) { services.router.open(AppRoute("goal")) }
            chip(icon: "flame.fill", tint: LKColor.primaryContainer, value: Fmt.int(s.streak, t.lang), label: t(.todayStreakDays)) { services.router.open(AppRoute("streak")) }
            chip(icon: "bolt.fill", tint: LKColor.star, value: Fmt.int(s.xp, t.lang), label: t(.todayXp)) { services.router.open(AppRoute("stats")) }
            GoalChip(done: min(s.reviewsToday, s.dailyGoal), goal: s.dailyGoal, progress: s.goalProgress, label: t(.todayDailyGoal)) { services.router.open(AppRoute("review")) }
        }
    }
    func chip(icon: String, tint: LKDynamicColor, value: String, label: String, action: @escaping () -> Void) -> some View {
        Button(action: action) { StatChip(icon: icon, tint: tint, value: value, label: label) }.buttonStyle(LKPressStyle())
            .accessibilityElement(children: .ignore).accessibilityLabel("\(label) \(value)").accessibilityAddTraits(.isButton)
    }
}

struct StatChip: View {
    let icon: String, tint: LKDynamicColor, value: String, label: String
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(spacing: 2) {
            HStack(spacing: 4) {
                Image(systemName: icon).font(.system(size: 13, weight: .bold)).foregroundStyle(tint.resolve(scheme))
                Text(value).lkText(LKType.headlineSm).lineLimit(1).minimumScaleFactor(0.7)
            }
            Text(label).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).lineLimit(1).minimumScaleFactor(0.75)
        }
        .foregroundStyle(LKColor.onSurface.resolve(scheme))
        .frame(maxWidth: .infinity, minHeight: 64)
        .padding(.vertical, LKSpacing.space2xs)
        .background {
            RoundedRectangle(cornerRadius: LKRadius.xl + 4, style: .continuous).fill(LKColor.outlineVariant.resolve(scheme)).offset(y: 2)
            RoundedRectangle(cornerRadius: LKRadius.xl + 4, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme))
            RoundedRectangle(cornerRadius: LKRadius.xl + 4, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2)
        }
    }
}

struct GoalChip: View {
    let done: Int, goal: Int, progress: Double, label: String, action: () -> Void
    @Environment(\.colorScheme) private var scheme
    @Environment(\.l10n) private var t
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                ZStack {
                    Circle().stroke(LKColor.trail.resolve(scheme), lineWidth: 4)
                    Circle().trim(from: 0, to: progress).stroke(LKColor.success.resolve(scheme), style: StrokeStyle(lineWidth: 4, lineCap: .round)).rotationEffect(.degrees(-90))
                        .animation(LKMotionPolicy.progressAnimation(reduce: reduceMotion), value: progress)
                    Text("\(Fmt.int(done, t.lang))/\(Fmt.int(goal, t.lang))").lkText(LKType.labelBadge).minimumScaleFactor(0.6).lineLimit(1).padding(3)
                }
                .frame(width: 38, height: 38)
                Text(label).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).lineLimit(1).minimumScaleFactor(0.75)
            }
            .foregroundStyle(LKColor.onSurface.resolve(scheme))
            .frame(maxWidth: .infinity, minHeight: 64)
            .padding(.vertical, LKSpacing.space2xs)
            .background {
                RoundedRectangle(cornerRadius: LKRadius.xl + 4, style: .continuous).fill(LKColor.outlineVariant.resolve(scheme)).offset(y: 2)
                RoundedRectangle(cornerRadius: LKRadius.xl + 4, style: .continuous).fill(LKColor.surfaceContainer.resolve(scheme))
                RoundedRectangle(cornerRadius: LKRadius.xl + 4, style: .continuous).strokeBorder(LKColor.outlineVariant.resolve(scheme), lineWidth: 2)
            }
        }
        .buttonStyle(LKPressStyle())
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(label) \(Fmt.int(done, t.lang))/\(Fmt.int(goal, t.lang))")
        .accessibilityAddTraits(.isButton)
    }
}

/// Teacher + speech bubble. The teacher itself (Ama, Rive 2D, C05) arrives in M2; its slot keeps the layout stable.
struct TodayBubble: View {
    let text: String, xpReady: Int
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        LKCard(fill: LKColor.surfaceContainerHigh) {
            VStack(alignment: .leading, spacing: LKSpacing.spaceXs) {
                Text(t(.todayFocus)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.secondary.resolve(scheme))
                Text("“\(text)”").lkText(LKType.bodyLg).foregroundStyle(LKColor.onSurface.resolve(scheme)).fixedSize(horizontal: false, vertical: true)
                if xpReady > 0 {
                    Label { Text("+\(Fmt.int(xpReady, t.lang)) \(t(.todayXp))").lkText(LKType.labelMetric) } icon: { Image(systemName: "bolt.fill") }
                        .foregroundStyle(LKColor.tertiary.resolve(scheme))
                }
            }
        }
        .accessibilityElement(children: .combine)
    }
}

struct TodayFocusCard: View {
    let lesson: TodayContent.Lesson?
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        LKCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                if let l = lesson {
                    HStack {
                        Text("\(t(.todayUnitN, ["n": l.unitNo])) · \(l.unitName)").lkText(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme)).lineLimit(1)
                        Spacer(minLength: LKSpacing.spaceXs)
                        Text(t(.todayLessonOf, ["a": l.at, "b": l.of])).lkText(LKType.labelMetric).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                    }
                    Text(l.title).lkText(LKType.headlineLg).foregroundStyle(LKColor.onSurface.resolve(scheme))
                    if !l.words.isEmpty {
                        Text(l.words.joined(separator: ", ")).lkText(LKType.bodyMd).foregroundStyle(LKColor.secondary.resolve(scheme))
                    }
                    HStack(spacing: LKSpacing.spaceXs) {
                        pill(icon: "clock", text: t(.todayMinutes, ["n": l.minutes]))
                        if !l.level.isEmpty { pill(icon: "chart.bar.fill", text: l.level) }
                    }
                } else {
                    Text(t(.pathLesson)).lkText(LKType.headlineLg).foregroundStyle(LKColor.onSurface.resolve(scheme))
                }
                Button(t(.actionContinue)) { services.router.open(AppRoute("lesson", arg: "go")) }
                    .buttonStyle(PrimaryButtonStyle())
                    .padding(.top, LKSpacing.space2xs)
            }
        }
    }
    func pill(icon: String, text: String) -> some View {
        Label { Text(text).lkText(LKType.labelMetric) } icon: { Image(systemName: icon).font(.system(size: 12, weight: .bold)) }
            .padding(.horizontal, LKSpacing.spaceXs).padding(.vertical, 4)
            .foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            .background(Capsule().fill(LKColor.surfaceVariant.resolve(scheme)))
    }
}

struct TodayPlanCard: View {
    let items: [TodayContent.PlanItem]
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let done = items.filter(\.done).count, first = items.firstIndex { !$0.done }
        LKCard {
            VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                HStack {
                    Text(t(.todayPlan)).lkText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                    Spacer()
                    Text("\(Fmt.int(done, t.lang))/\(Fmt.int(items.count, t.lang))").lkText(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme))
                }
                Text(t(.todayGoalsN, ["n": items.count])).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                ForEach(Array(items.enumerated()), id: \.element.id) { i, it in
                    Button { services.router.open(it.route) } label: {
                        HStack(spacing: LKSpacing.spaceSm) {
                            Image(systemName: it.done ? "checkmark.circle.fill" : i == first ? "play.circle.fill" : "circle")
                                .font(.system(size: 22, weight: .bold))
                                .foregroundStyle((it.done ? LKColor.success : i == first ? LKColor.primary : LKColor.outline).resolve(scheme))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(it.title).lkText(LKType.titlePill).foregroundStyle(LKColor.onSurface.resolve(scheme))
                                Text(it.done ? t(.pathDone) : i == first ? "\(t(.todayInProgress)) · \(t(.todayMinutes, ["n": it.minutes]))" : t(.todayMinutes, ["n": it.minutes]))
                                    .lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                            }
                            Spacer(minLength: 0)
                            if i == first { Text(t(.todayCurrent)).lkText(LKType.labelBadge).foregroundStyle(LKColor.primary.resolve(scheme)) }
                        }
                        .frame(minHeight: LKFrame.shared.minTap)
                    }
                    .buttonStyle(LKPressStyle())
                }
            }
        }
    }
}

struct TodayReviewBanner: View {
    let due: Int
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        // Stitch today-*.html "review nudge": warm tertiary card + tertiary border, teal pill (same tokens as Android ReviewNudge) – no off-token white.
        let shape = RoundedRectangle(cornerRadius: LKRadius.xl * 2, style: .continuous)
        Button { services.router.open(AppRoute("review")) } label: {
            HStack(spacing: LKSpacing.spaceSm) {
                Image(systemName: "rectangle.on.rectangle.angled").font(.system(size: 24, weight: .bold))
                    .foregroundStyle(LKColor.onSurface.resolve(scheme))
                VStack(alignment: .leading, spacing: 2) {
                    Text(t(.todayFading, ["n": Fmt.int(due, t.lang)])).lkText(LKType.titlePill)
                        .foregroundStyle(LKColor.onSurface.resolve(scheme))
                    Text(t(.todayReviewNow, ["m": max(1, Int((Double(due) / 6).rounded(.up)))])).lkText(LKType.bodySm)
                        .foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                }
                Spacer(minLength: 0)
                Text(t(.todayReview)).lkText(LKType.labelMetric)
                    .padding(.horizontal, LKSpacing.spaceMd).frame(minHeight: LKFrame.shared.minTap)
                    .background(Capsule().fill(LKColor.secondaryContainer.resolve(scheme)))
                    .foregroundStyle(LKColor.onSecondaryContainer.resolve(scheme))
            }
            .padding(LKSpacing.spaceSm)
            .background(shape.fill(LKColor.tertiaryContainer.resolve(scheme).opacity(scheme == .dark ? 0.35 : 0.25)))
            .overlay(shape.strokeBorder(LKColor.tertiary.resolve(scheme), lineWidth: 2))
        }
        .buttonStyle(LKPressStyle())
    }
}

struct TodayQuickPractice: View {
    let s: TodaySnapshot
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack {
                Text(t(.todayQuick)).lkText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                Spacer()
                Button(t(.todayAllDrills)) { services.router.open(AppRoute("skills")) }
                    .lkText(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap)
            }
            Grid(horizontalSpacing: LKSpacing.spaceSm, verticalSpacing: LKSpacing.spaceSm) {
                GridRow {
                    tile("exclamationmark.triangle.fill", LKColor.primaryContainer, t(.todayMistakes), t(.todayToFix, ["n": Fmt.int(s.mistakes, t.lang)]),
                         AppRoute("mistakes", query: s.mistakes > 0 ? ["retry": "1"] : [:]))
                    tile("rectangle.stack.fill", LKColor.secondary, t(.todayWords), t(.todayDueN, ["n": Fmt.int(s.total, t.lang)]),
                         s.total > 0 ? AppRoute("review") : AppRoute("quick"))
                }
                GridRow {
                    tile("headphones", LKColor.tertiary, t(.todayListening), t(.todayAudioSprint), AppRoute("skill", arg: "listening"))
                    tile("mic.fill", LKColor.success, t(.todaySpeaking), t(.todayPronDrill), AppRoute("pron"))
                }
            }
        }
    }
    func tile(_ icon: String, _ tint: LKDynamicColor, _ title: String, _ sub: String, _ r: AppRoute) -> some View {
        Button { services.router.open(r) } label: {
            LKCard(padding: LKSpacing.spaceSm) {
                VStack(alignment: .leading, spacing: LKSpacing.space2xs) {
                    Image(systemName: icon).font(.system(size: 20, weight: .bold)).foregroundStyle(tint.resolve(scheme))
                        .frame(width: 36, height: 36).background(Circle().fill(tint.resolve(scheme).opacity(0.14)))
                    Text(title).lkText(LKType.titlePill).foregroundStyle(LKColor.onSurface.resolve(scheme)).lineLimit(2)
                    Text(sub).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)).lineLimit(2)
                }
            }
        }
        .buttonStyle(LKPressStyle())
    }
}

struct TodayReadinessCard: View {
    let r: TodayContent.Readiness
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button { services.router.open(AppRoute("goal")) } label: {
            LKCard {
                HStack(spacing: LKSpacing.spaceMd) {
                    ZStack {
                        Circle().stroke(LKColor.trail.resolve(scheme), lineWidth: 6)
                        Circle().trim(from: 0, to: Double(r.percent ?? 0) / 100).stroke(LKColor.secondary.resolve(scheme), style: StrokeStyle(lineWidth: 6, lineCap: .round)).rotationEffect(.degrees(-90))
                        Text(r.percent.map { "\(Fmt.int($0, t.lang))%" } ?? "–").lkText(LKType.labelMetric)
                    }
                    .frame(width: 56, height: 56)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(r.title).lkText(LKType.headlineSm)
                        Text(t(.todayReadinessLevel)).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                        Text(r.percent.map { t(.todayReady, ["p": $0]) } ?? t(.todayNoPrediction)).lkText(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme))
                    }
                    Spacer(minLength: 0)
                }
                .foregroundStyle(LKColor.onSurface.resolve(scheme))
            }
        }
        .buttonStyle(LKPressStyle())
    }
}

struct TodayStories: View {
    let stories: [TodayContent.Story]
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
            HStack {
                Text(t(.todayStories)).lkText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                Spacer()
                Button(t(.todayViewLibrary)) { services.router.open(AppRoute("library")) }
                    .lkText(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap)
            }
            ForEach(stories) { st in
                Button { services.router.open(AppRoute("lesson", arg: "go", query: ["story": st.id])) } label: {
                    LKCard(padding: LKSpacing.spaceSm) {
                        HStack {
                            Image(systemName: "book.pages.fill").foregroundStyle(LKColor.tertiary.resolve(scheme))
                            Text(st.title).lkText(LKType.titlePill)
                            Spacer()
                            Text("\(t(.todayMinutes, ["n": st.minutes])) · \(st.cefr)").lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                        }
                        .foregroundStyle(LKColor.onSurface.resolve(scheme))
                    }
                }
                .buttonStyle(LKPressStyle())
            }
        }
    }
}

struct TodayStreakCard: View {
    let s: TodaySnapshot
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        Button { services.router.open(AppRoute("streak")) } label: {
            LKCard {
                VStack(alignment: .leading, spacing: LKSpacing.spaceSm) {
                    HStack {
                        Image(systemName: "flame.fill").foregroundStyle(LKColor.primaryContainer.resolve(scheme))
                        Text(s.streak > 0 ? t(.todayStreakOn) : t(.todayStreakStart)).lkText(LKType.titlePill)
                        Spacer()
                        Text(t(.todayWeekDone, ["a": Fmt.int(s.weekDone, t.lang)])).lkText(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme))
                    }
                    HStack(spacing: 0) {
                        ForEach(s.week, id: \.key) { d in
                            VStack(spacing: 4) {
                                ZStack {
                                    Circle().fill((d.active ? LKColor.success : d.state == .now ? LKColor.tertiaryContainer : LKColor.surfaceVariant).resolve(scheme))
                                    Image(systemName: d.active ? "checkmark" : "bolt.fill").font(.system(size: 12, weight: .heavy))
                                        .foregroundStyle((d.active ? LKColor.onPrimary : LKColor.onSurfaceVariant).resolve(.light))
                                }
                                .frame(width: 30, height: 30)
                                .overlay { if d.state == .now { Circle().strokeBorder(LKColor.tertiary.resolve(scheme), lineWidth: 2) } }
                                Text(Self.letter(d.date, t.lang)).lkText(LKType.labelBadge).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
                            }
                            .frame(maxWidth: .infinity)
                            .accessibilityElement(children: .ignore)
                            .accessibilityLabel(Self.full(d.date, t.lang) + (d.active ? " ✓" : ""))
                        }
                    }
                }
                .foregroundStyle(LKColor.onSurface.resolve(scheme))
            }
        }
        .buttonStyle(LKPressStyle())
    }
    static func letter(_ d: Date, _ lang: String) -> String { d.formatted(.dateTime.weekday(.narrow).locale(Locale(identifier: lang))) }
    static func full(_ d: Date, _ lang: String) -> String { d.formatted(.dateTime.weekday(.wide).locale(Locale(identifier: lang))) }
}

/// "Your path" – snake of lesson nodes (web path frame). Nodes arrive with the lesson content (M2).
struct TodayPathCard: View {
    let nodes: [TodayContent.PathNode], unitName: String?
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    static let snake: [CGFloat] = [24, -32, 0, 32, -24, 0]   // SNAKE offsets (translate-x-6 / -8 / 0 / 8 / -6 / 0)
    var body: some View {
        LKCard {
            VStack(spacing: LKSpacing.spaceMd) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(t(.todayPath)).lkText(LKType.headlineSm).accessibilityAddTraits(.isHeader)
                        if let unitName { Text(unitName).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme)) }
                    }
                    Spacer()
                    Button(t(.todayToCurrent)) { services.router.open(AppRoute("path")) }
                        .lkText(LKType.labelMetric).foregroundStyle(LKColor.secondary.resolve(scheme)).frame(minHeight: LKFrame.shared.minTap)
                }
                ForEach(Array(nodes.enumerated()), id: \.element.id) { i, n in
                    PathNodeView(node: n).offset(x: Self.snake[i % Self.snake.count])
                }
            }
            .foregroundStyle(LKColor.onSurface.resolve(scheme))
        }
    }
}

struct PathNodeView: View {
    let node: TodayContent.PathNode
    @Environment(AppServices.self) private var services
    @Environment(\.l10n) private var t
    @Environment(\.colorScheme) private var scheme
    var body: some View {
        let fill: LKDynamicColor = node.state == .lock ? LKColor.lipLock : node.checkpoint ? LKColor.tertiaryContainer : LKColor.lipPrimary
        let state = node.state == .done ? t(.pathDone) : node.state == .next ? t(.pathLearning) : t(.pathLocked)
        Button { if node.state != .lock { services.router.open(AppRoute("lesson", arg: "go")) } } label: {
            VStack(spacing: 4) {
                if node.state == .next { Text(t(.todayStart)).lkText(LKType.labelBadge).textCase(.uppercase).foregroundStyle(LKColor.primary.resolve(scheme)) }
                ZStack {
                    Circle().fill(fill.resolve(scheme).opacity(0.75)).offset(y: 5)
                    Circle().fill(fill.resolve(scheme))
                    Image(systemName: node.state == .lock ? "lock.fill" : node.checkpoint ? "flag.fill" : node.state == .done ? "checkmark" : "star.fill")
                        .font(.system(size: 26, weight: .heavy)).foregroundStyle((node.state == .lock ? LKColor.outline : LKColor.onPrimary).resolve(.light))
                }
                .frame(width: 72, height: 66)
                if node.stars > 0 {
                    HStack(spacing: 2) { ForEach(0..<min(3, node.stars), id: \.self) { _ in Image(systemName: "star.fill").font(.system(size: 10)).foregroundStyle(LKColor.star.resolve(scheme)) } }
                }
                Text(node.label).lkText(LKType.bodySm).foregroundStyle(LKColor.onSurfaceVariant.resolve(scheme))
            }
        }
        .buttonStyle(LKPressStyle())
        .disabled(node.state == .lock)
        .accessibilityLabel("\(node.label) – \(state)")
    }
}
