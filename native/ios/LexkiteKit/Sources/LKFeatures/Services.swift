import SwiftUI
import Observation
import SwiftData
import LKSync
import LKStore
import LKStrings
import LKDesign

/// Signed-in state for views (guest = `user == nil`, everything still works offline).
@MainActor @Observable
public final class AuthModel {
    public private(set) var user: LKUser?
    public private(set) var busy: LKSignInMethod?
    public var errorMessage: String?
    public private(set) var syncStatus: SyncStatus = .idle

    let auth: LKAuth
    let engine: SyncEngine?
    let crash: LKCrash?
    private var observing = false

    public init(auth: LKAuth, engine: SyncEngine?, crash: LKCrash? = nil) { self.auth = auth; self.engine = engine; self.crash = crash }

    /// Follow Firebase auth state; start/stop sync; tag crash reports with the HASHED uid only.
    public func observe() async {
        guard !observing else { return }
        observing = true
        if let engine {
            Task { [weak self] in for await s in await engine.statusUpdates() { self?.syncStatus = s } }
        }
        for await u in auth.userChanges() {
            let changed = u?.uid != user?.uid
            user = u
            crash?.setUserID(u.map { LKCrashPrivacy.hashedUserID($0.uid) })
            guard changed else { continue }
            if u != nil { await engine?.start() } else { await engine?.signedOut() }
        }
    }

    public func signIn(_ m: LKSignInMethod, t: L10n) async {
        guard busy == nil else { return }
        busy = m; errorMessage = nil
        defer { busy = nil }
        do { _ = try await auth.signIn(m) }
        catch LKAuthError.cancelled { /* user closed the sheet – not an error */ }
        catch {
            crash?.record(error, context: "signIn")
            errorMessage = t(.authFailed, ["msg": Self.describe(error)])
        }
    }
    public func signOut() async {
        await engine?.flush()
        try? await auth.signOut()
    }
    static func describe(_ e: Error) -> String {
        if case LKAuthError.failed(let m) = e { return m }
        return (e as NSError).localizedDescription
    }
}

/// Today data: local numbers (TodaySnapshot) + content-driven blocks (lesson focus, plan, path, stories, readiness, league)
/// that M2/M3 feed from the content API (LessonEngine port). Blocks without data are not drawn – same rule as the web (data-show=0 → pruned).
public struct TodayContent: Sendable, Equatable {
    public struct Lesson: Sendable, Equatable {
        public var unitNo: Int, unitName: String, at: Int, of: Int, title: String, words: [String], minutes: Int, level: String
        public init(unitNo: Int, unitName: String, at: Int, of: Int, title: String, words: [String], minutes: Int, level: String) {
            self.unitNo = unitNo; self.unitName = unitName; self.at = at; self.of = of; self.title = title; self.words = words; self.minutes = minutes; self.level = level
        }
    }
    public struct PlanItem: Sendable, Equatable, Identifiable {
        public var id: String { route.id }
        public var title: String, minutes: Int, done: Bool, route: AppRoute
        public init(title: String, minutes: Int, done: Bool, route: AppRoute) { self.title = title; self.minutes = minutes; self.done = done; self.route = route }
    }
    public struct PathNode: Sendable, Equatable, Identifiable {
        public enum State: Sendable { case done, next, lock }
        public var id: Int, label: String, state: State, checkpoint: Bool, stars: Int
        public init(id: Int, label: String, state: State, checkpoint: Bool = false, stars: Int = 0) { self.id = id; self.label = label; self.state = state; self.checkpoint = checkpoint; self.stars = stars }
    }
    public struct Story: Sendable, Equatable, Identifiable {
        public var id: String, title: String, minutes: Int, cefr: String
        public init(id: String, title: String, minutes: Int, cefr: String) { self.id = id; self.title = title; self.minutes = minutes; self.cefr = cefr }
    }
    public struct Readiness: Sendable, Equatable { public var title: String, percent: Int?, predicted: String?; public init(title: String, percent: Int?, predicted: String?) { self.title = title; self.percent = percent; self.predicted = predicted } }

    public var lesson: Lesson?
    public var plan: [PlanItem] = []
    public var path: [PathNode] = []
    public var stories: [Story] = []
    public var readiness: Readiness?
    public var xpToCheckpoint = 0
    public init() {}
    public var planLeft: Int { plan.filter { !$0.done }.count }
}

public protocol TodayContentSource: Sendable {
    func today(snapshot: TodaySnapshot) async -> TodayContent
}
/// M1: no lesson content bundled yet (scripts/native/content-pack.mjs + LessonEngine vectors land with M2).
public struct EmptyTodayContent: TodayContentSource { public init() {}; public func today(snapshot: TodaySnapshot) async -> TodayContent { TodayContent() } }

@MainActor @Observable
public final class TodayModel {
    public private(set) var snapshot: TodaySnapshot
    public private(set) var content: TodayContent
    public private(set) var loaded = false
    /// Module order from the signed `today` document (last valid cache), else the web order.
    public var modules: [TodayModule] = TodayModule.webOrder
    let repo: LKRepository?
    let source: TodayContentSource
    let clock: @Sendable () -> Date

    public init(repo: LKRepository?, source: TodayContentSource = EmptyTodayContent(), snapshot: TodaySnapshot = TodaySnapshot(), content: TodayContent = TodayContent(),
                clock: @escaping @Sendable () -> Date = { Date() }) {
        self.repo = repo; self.source = source; self.snapshot = snapshot; self.content = content; self.clock = clock
        loaded = repo == nil
    }
    public func refresh() async {
        guard let repo else { return }
        let now = clock()
        if let s = try? await repo.today(now: now) {
            if s != snapshot { snapshot = s }
            let c = await source.today(snapshot: s)
            if c != content { content = c }
        }
        loaded = true
    }
}

/// Everything the views need, injected once at the root (`.environment(services)`).
@MainActor @Observable
public final class AppServices {
    public let router: AppRouter
    public let auth: AuthModel
    public let today: TodayModel
    public let repo: LKRepository?
    public let engine: SyncEngine?
    public let crash: LKCrash?
    public let remote: LKRemoteConfig
    public let content: ContentStore?
    /// Tab order / hidden tabs from the signed `modules` document (Today is never hidden); default = frame.json order.
    public var tabOrder: [String] = LKFrame.shared.tabs.map(\.k)
    public var hiddenTabs: Set<String> = []
    public var signInSheet = false
    /// C17 first-run onboarding state (splash → onboarding → app); decided after the Capacitor migration, from local data only.
    public let onboarding = OnboardingFlow()
    public var deleteSheet = false
    /// UI language (15 languages, C10): the 1.x choice (`vb.uiLang`) migrated, else the device language.
    public private(set) var uiLang: String
    /// Strings for `uiLang` (loaded once per language change, not per render)
    public private(set) var l10n: L10n
    /// C11: settings.theme = auto | light | dark (same key as web)
    public var theme = "auto"
    public var colorScheme: ColorScheme? { theme == "light" ? .light : theme == "dark" ? .dark : nil }
    public static let langKey = "lk.uiLang"
    public var accountSwitchPrompt: (old: String, new: String, answer: CheckedContinuation<Bool, Never>)?

    public init(router: AppRouter? = nil, auth: AuthModel, today: TodayModel, repo: LKRepository?, engine: SyncEngine?, crash: LKCrash?,
                remote: LKRemoteConfig = DefaultRemoteConfig(), content: ContentStore? = nil) {
        self.router = router ?? AppRouter(); self.auth = auth; self.today = today; self.repo = repo; self.engine = engine; self.crash = crash
        self.remote = remote; self.content = content
        let l = UserDefaults.standard.string(forKey: Self.langKey).flatMap { L10nLangs.all.contains($0) ? $0 : nil } ?? L10n.preferred()
        uiLang = l; l10n = L10n(lang: l)
    }

    /// Load language + theme + crash opt-out from local data (after the C03 migration has run).
    public func loadPreferences() async {
        await loadStoredPreferences()
        await onboarding.decide(repo: repo)
    }
    private func loadStoredPreferences() async {
        guard let repo else { return }
        let settings = try? await repo.snapshot().settings
        let th = settings?["theme"]?.string ?? "auto"
        theme = ["light", "dark"].contains(th) ? th : "auto"
        if UserDefaults.standard.string(forKey: Self.langKey) == nil, let l = await repo.legacy("ls:vb.uiLang")?.string, L10nLangs.all.contains(l) {
            UserDefaults.standard.set(l, forKey: Self.langKey); applyLang(l)
        }
        crash?.setCollectionEnabled(LKCrashPrivacy.enabled(settings: settings))
    }
    /// Apply the signed server documents (cached first, then refreshed): Today module order + tab order. Invalid → defaults stay.
    public func loadContent() async {
        guard let content else { return }
        apply(today: await content.cached("today"), modules: await content.cached("modules"))
        await remote.refresh()
        apply(today: await content.refresh("today"), modules: await content.refresh("modules"))
    }
    func apply(today t: SignedContent.Result?, modules m: SignedContent.Result?) {
        let order = TodayModule.order(from: t?.value)
        if order != today.modules { today.modules = order }
        if let v = m?.value {
            let known = LKFrame.shared.tabs.map(\.k)
            let o = (v["order"]?.array ?? []).compactMap(\.string).filter { known.contains($0) }
            tabOrder = o + known.filter { !o.contains($0) }
            hiddenTabs = Set((v["hidden"]?.array ?? []).compactMap(\.string).filter { $0 != "home" })
        }
    }

    public func setLanguage(_ l: String) {
        guard L10nLangs.all.contains(l) else { return }
        UserDefaults.standard.set(l, forKey: Self.langKey); applyLang(l)
    }
    func applyLang(_ l: String) { guard l != uiLang || l10n.lang != l else { return }; uiLang = l; l10n = L10n(lang: l) }

    /// The real app wiring: SwiftData on disk, D1/Drive sync, given auth + crash implementations (Firebase from the app target).
    public static func live(auth: LKAuth, crash: LKCrash?, remote: LKRemoteConfig = DefaultRemoteConfig(), config: SyncConfig = SyncConfig(),
                            content: ContentStore.Config? = nil, inMemory: Bool = false) throws -> AppServices {
        let container = try LKSchema.container(inMemory: inMemory)
        let repo = LKRepository(modelContainer: container)
        let box = PromptBox()
        var cfg = config; cfg.apply(remote)
        let engine = SyncEngine(auth: auth, store: repo, config: cfg, crash: crash, accountSwitch: { old, new in await box.ask(old, new) })
        let dir = (FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first ?? FileManager.default.temporaryDirectory)
            .appendingPathComponent("content", isDirectory: true)
        let store = content.map { ContentStore(config: $0, dir: dir, remote: remote) }
        let s = AppServices(auth: AuthModel(auth: auth, engine: engine, crash: crash), today: TodayModel(repo: repo), repo: repo, engine: engine, crash: crash,
                            remote: remote, content: store)
        box.services = s
        return s
    }

    /// Previews / snapshot tests: in-memory data, guest auth, fixed numbers.
    public static func preview(snapshot: TodaySnapshot, content: TodayContent = TodayContent(), user: LKUser? = nil, lang: String = "en", theme: String = "auto") -> AppServices {
        let a = AuthModel(auth: GuestAuth(), engine: nil)
        if let user { a.setPreviewUser(user) }
        let s = AppServices(auth: a, today: TodayModel(repo: nil, snapshot: snapshot, content: content), repo: nil, engine: nil, crash: nil)
        s.applyLang(lang); s.theme = theme
        return s
    }

    /// Local data changed (review saved, settings edited) → refresh Today and batch a sync push.
    public func localChange() {
        Task { await today.refresh(); await engine?.markDirty() }
    }
}

extension AuthModel { func setPreviewUser(_ u: LKUser) { user = u } }

/// Bridges the engine's account-switch question to an alert on the main actor.
@MainActor final class PromptBox: Sendable {
    weak var services: AppServices?
    nonisolated init() {}
    nonisolated func ask(_ old: String, _ new: String) async -> Bool {
        await withCheckedContinuation { c in
            Task { @MainActor in
                guard let s = self.services else { c.resume(returning: true); return }
                s.accountSwitchPrompt = (old, new, c)
            }
        }
    }
}
