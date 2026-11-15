import XCTest
import SwiftUI
@testable import LKFeatures
@testable import LKSync
@testable import LKStore
import LKStrings
import LKDesign
import LKCore

/// Parity gate for M1 (native/shared/parity.json; scripts/test/native-parity.mjs requires testParity<ID> in Swift).
/// C02 / C03 live in LKSyncTests (vectors). Each test checks the behaviour of the live app, not just that code exists.
@MainActor
final class ParityTests: XCTestCase {

    // MARK: P01 – app frame
    func testParityP01() {
        let tabs = LKFrame.shared.tabs
        XCTAssertEqual(tabs.map(\.k), ["home", "vocab", "skills", "tests", "me"])
        XCTAssertEqual(tabs.map(\.label), ["tab.today", "tab.vocab", "tab.skills", "tab.tests", "tab.me"])
        XCTAssertGreaterThanOrEqual(LKFrame.shared.minTap, 44, "Back/X ≥ 44 pt")
        XCTAssertEqual(LKFrame.shared.width, 390)

        let r = AppRouter()
        r.open(AppRoute("dict", arg: "curriculum"))          // inner screen → push on the owning tab
        XCTAssertEqual(r.tab, "vocab"); XCTAssertEqual(r.paths["vocab"]?.last, AppRoute("dict", arg: "curriculum"))
        r.open(AppRoute("skill", arg: "listening"))
        XCTAssertEqual(r.tab, "skills")
        XCTAssertEqual(r.paths["vocab"]?.count, 1, "each tab keeps its own stack when switching")
        r.reselect("vocab"); XCTAssertEqual(r.tab, "vocab"); XCTAssertEqual(r.paths["vocab"]?.count, 1)
        r.reselect("vocab"); XCTAssertEqual(r.paths["vocab"], [], "tapping the selected tab pops to root")
        r.open(AppRoute("lesson", arg: "go"))                // focus flow → full screen with X
        XCTAssertEqual(r.focus?.name, "lesson"); XCTAssertEqual(AppRoute("lesson").presentation, .focus)
        r.closeFocus(); XCTAssertNil(r.focus)
        XCTAssertEqual(AppRoute("me").presentation, .tabRoot)
        // every web route of the parity list has an owning tab
        for (route, tab) in AppRoute.tabOf { XCTAssertTrue(tabs.contains { $0.k == tab }, route) }
    }

    // MARK: P02 – Today numbers (web definitions) + copy
    func testParityP02() throws {
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "UTC")!
        let now = Date(timeIntervalSince1970: 1_772_366_400)        // 2026-03-01 12:00 UTC (Sunday)
        let ms = 1_772_366_400_000.0
        let card = { (reps: Int, last: Double?, due: Double, vi: String) -> JSON in
            ["word": "w", "vi": .string(vi), "srs": ["reps": .number(Double(reps)), "last": last.map { .number($0) } ?? .null, "due": .number(due)]]
        }
        let doc = SyncDoc(cards: ["a": card(2, ms - 864e5, ms - 1000, "x"),          // due
                                  "b": card(1, ms - 864e5, ms + 3 * 864e5, "x"),     // not due
                                  "c": card(0, nil, ms, ""), "d": card(0, nil, ms, ""), "e": card(0, nil, ms, "")],   // 3 new
                          stats: ["days": ["2026-03-01": 7, "2026-02-28": 3], "newToday": ["day": "2026-03-01", "n": 1]],
                          game: ["xp": 1520, "days": ["2026-02-27": ["xp": 10]], "frozen": ["2026-02-26": 1]],
                          settings: ["dailyGoal": 30, "dailyNew": 2, "examTarget": "6.5"])
        let s = TodaySnapshot.compute(doc: doc, mistakes: 4, now: now, calendar: cal)
        XCTAssertEqual(s.due, 1)
        XCTAssertEqual(s.newCount, 1, "min(newAvail 3, dailyNew 2 − introduced 1)")
        XCTAssertEqual(s.total, 2)
        XCTAssertEqual(s.reviewsToday, 7); XCTAssertEqual(s.dailyGoal, 30)
        XCTAssertEqual(s.streak, 4, "27th XP + 26th frozen + 28th/1st reviews")
        XCTAssertEqual(s.xp, 1520); XCTAssertEqual(s.target, "6.5"); XCTAssertEqual(s.mistakes, 4)
        XCTAssertEqual(s.week.count, 7)
        XCTAssertEqual(s.week.first?.key, "2026-02-23", "Monday-first week")
        XCTAssertEqual(s.week.last?.state, .now)
        XCTAssertEqual(s.weekDone, 4, "26 frozen, 27 XP, 28 + 1 reviews")

        let en = L10n(lang: "en")
        var morning = s; morning.hour = 9
        XCTAssertEqual(TodayView.say(morning, TodayContent(), t: en), en(.todaySayDue, ["g": en(.todayGreetMorning), "b": 2]))
        var empty = TodaySnapshot(); empty.hour = 20
        XCTAssertEqual(TodayView.say(empty, TodayContent(), t: en), en(.todaySayDone, ["g": en(.todayGreetEvening)]))
        for l in L10nLangs.all { XCTAssertFalse(TodayView.say(morning, TodayContent(), t: L10n(lang: l)).contains("{"), "\(l): placeholder left") }

        // Today renders from local data without crashing (guest, empty store)
        let host = UIHostingController(rootView: TodayView().environment(AppServices.preview(snapshot: s)).environment(\.l10n, en))
        host.view.frame = CGRect(x: 0, y: 0, width: 390, height: 844)
        host.view.layoutIfNeeded()
    }

    /// Today numbers from the real SwiftData repository after a migration-style import (end to end).
    func testTodayFromRepository() async throws {
        let repo = try LKRepository.inMemory()
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "UTC")!
        let now = Date(timeIntervalSince1970: 1_772_366_400)
        let export: JSON = ["kind": "lexkite-capacitor-export", "v": 1, "prefix": "ielts.", "at": 1,
                            "idb": ["lexkite": ["ielts.cards": ["hello": ["word": "hello", "vi": "xin chào", "srs": ["reps": 1, "last": 1_772_000_000_000, "due": 1_772_300_000_000]]]]],
                            "ls": ["ielts.mistakes": #"[{"w":"a"},{"w":"b","fixed":true}]"#, "ielts.game": #"{"xp":42}"#]]
        try await repo.importLegacy(try MigrationImport(export: export, now: 1_772_366_400_000), now: 1)
        let s = try await repo.today(now: now, calendar: cal)
        XCTAssertEqual(s.due, 1); XCTAssertEqual(s.mistakes, 1); XCTAssertEqual(s.xp, 42)
    }

    // MARK: C01 – auth (guest by default, Firebase behind LKAuth, privacy of crash reports)
    func testParityC01() async throws {
        let guest = AuthModel(auth: GuestAuth(), engine: nil)
        XCTAssertNil(guest.user, "guest mode works without an account")
        await guest.signIn(.apple, t: L10n(lang: "en"))
        XCTAssertNotNil(guest.errorMessage, "no Firebase in this build → readable error, no crash")

        let crash = MemoryCrash()
        let auth = TestAuth(uid: "abc123")
        let m = AuthModel(auth: auth, engine: nil, crash: crash)
        let task = Task { await m.observe() }
        // observe() runs in its own task: wait (≤ 3 s) until it has delivered, never a fixed 50 ms nap (red on slow simulators, P08 / #1001)
        for _ in 0..<150 where m.user == nil || crash.userID == nil { try await Task.sleep(nanoseconds: 20_000_000) }
        XCTAssertEqual(m.user?.uid, "abc123")
        XCTAssertEqual(crash.userID, LKCrashPrivacy.hashedUserID("abc123"))
        XCTAssertNotEqual(crash.userID, "abc123", "only a hash of the uid reaches crash reports")
        XCTAssertEqual(crash.userID?.count, 32)
        task.cancel()
        // cancelling the system sheet is not an error
        auth.signInError = LKAuthError.cancelled
        await m.signIn(.google, t: L10n(lang: "en"))
        XCTAssertNil(m.errorMessage)
        // crash logs never carry e-mail addresses; opt-out honoured
        crash.log("sync failed for test.user@example.com")
        XCTAssertFalse(crash.logs.joined().contains("@example.com"))
        XCTAssertFalse(LKCrashPrivacy.enabled(settings: ["crashOptOut": true]))
        XCTAssertTrue(LKCrashPrivacy.enabled(settings: nil))
    }

    /// Account deletion: reauth requested by the server → re-authenticate once and retry; local wipe optional.
    func testAccountDeletionFlow() async throws {
        let http = ScriptedHTTP([(200, ["error": "reauth"]), (200, ["ok": true, "firebase": "deleted"])])
        let auth = TestAuth(uid: "u1")
        let store = MemoryStore(SyncDoc(cards: ["a": ["word": "a"]], stats: SyncDoc.emptyStats))
        let engine = SyncEngine(auth: auth, store: store, http: http)
        let steps = StepLog()
        try await AccountDeletion(auth: auth, http: http, engine: engine, store: store).run(wipeLocal: true) { await steps.add($0) }
        let log = await steps.items, calls = await http.calls, cards = try await store.snapshot().cards
        XCTAssertEqual(log, [.deleting, .reauth, .deleting, .done])
        XCTAssertEqual(calls, 2)
        XCTAssertTrue(auth.reauthed)
        XCTAssertTrue(cards.isEmpty, "local study data wiped when asked")
    }

    // MARK: C08 – deep links + universal links
    func testParityC08() {
        func r(_ s: String) -> AppRoute? { DeepLink.route(for: URL(string: s)!) }
        XCTAssertEqual(r("lexkite://review"), AppRoute("review"))
        XCTAssertEqual(r("lexkite://review?w=hello"), AppRoute("review", query: ["w": "hello"]))
        XCTAssertEqual(r("lexkite://word/curriculum"), AppRoute("dict", arg: "curriculum"))
        XCTAssertEqual(r("lexkite://word/caf%C3%A9"), AppRoute("dict", arg: "café"))
        XCTAssertNil(r("lexkite://word/"))
        XCTAssertEqual(r("https://lexkite.com/app/#/skill/listening"), AppRoute("skill", arg: "listening"))
        XCTAssertEqual(r("https://www.lexkite.com/app/#/review?w=a%20b"), AppRoute("review", query: ["w": "a b"]))
        XCTAssertEqual(r("https://lexkite.com/app/"), AppRoute("home"))
        XCTAssertNil(r("https://lexkite.com/blog/#/review"), "only /app/ is the app")
        XCTAssertNil(r("https://evil.example/app/#/review"))
        let router = AppRouter()
        XCTAssertTrue(router.open(url: URL(string: "lexkite://review")!))
        XCTAssertEqual(router.focus?.name, "review")
        XCTAssertTrue(router.open(url: URL(string: "lexkite://word/hello")!))
        XCTAssertEqual(router.tab, "vocab")
        XCTAssertFalse(router.open(url: URL(string: "mailto:x@y.z")!))
    }

    // MARK: C09 – haptics
    func testParityC09() {
        XCTAssertEqual(LKHaptic.correct.feedback, .success)
        XCTAssertEqual(LKHaptic.wrong.feedback, .error)
        XCTAssertEqual(LKHaptic.select.feedback, .selection)
        for h in LKHaptic.allCases { XCTAssertNil(h.feedback(enabled: false), "in-app switch off → silent"); XCTAssertNotNil(h.feedback(enabled: true)) }
        XCTAssertTrue(EnvironmentValues().lkHapticsEnabled)
    }

    // MARK: C10 – 15 languages + RTL
    func testParityC10() {
        XCTAssertEqual(L10nLangs.all.count, 15)
        for l in L10nLangs.all {
            let t = L10n(lang: l)
            for k in L10nKey.allCases {
                XCTAssertTrue(t.has(k), "\(l): \(k.rawValue)")
                let s = t(k, ["n": 3, "a": 1, "b": 2, "m": 1, "g": "G", "p": 40, "s": "6.5", "msg": "x"])
                XCTAssertFalse(s.contains("{n}") || s.contains("{a}") || s.contains("{b}"), "\(l): \(k.rawValue) placeholder")
            }
            XCTAssertEqual(t.isRTL, l == "ar")
        }
        XCTAssertEqual(L10n.preferred(["zh-Hans-CN"]), "zh")
        XCTAssertEqual(L10n.preferred(["pt-BR", "en"]), "pt")
        XCTAssertEqual(L10n.preferred(["xx"]), "en")
        let p = AppServices.preview(snapshot: TodaySnapshot(), lang: "ar")
        XCTAssertTrue(p.l10n.isRTL); XCTAssertEqual(p.uiLang, "ar")
    }

    // MARK: C11 – theme from tokens: light/dark/system + contrast ≥ 4.5:1 on every text pair the screens use
    func testParityC11() {
        func lum(_ c: UInt32) -> Double {
            func lin(_ shift: UInt32) -> Double {
                let v: Double = Double((c >> shift) & 0xFF) / 255.0
                if v <= 0.03928 { return v / 12.92 }
                return pow((v + 0.055) / 1.055, 2.4)
            }
            let r: Double = lin(24), g: Double = lin(16), b: Double = lin(8)
            return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
        func cr(_ a: UInt32, _ b: UInt32) -> Double { let x = lum(a), y = lum(b); return (max(x, y) + 0.05) / (min(x, y) + 0.05) }
        let pairs: [(String, LKDynamicColor, LKDynamicColor)] = [
            ("onSurface/background", LKColor.onSurface, LKColor.background), ("onSurface/surfaceContainer", LKColor.onSurface, LKColor.surfaceContainer),
            ("onSurfaceVariant/surfaceContainer", LKColor.onSurfaceVariant, LKColor.surfaceContainer), ("onSurfaceVariant/background", LKColor.onSurfaceVariant, LKColor.background),
            ("onPrimary/primary", LKColor.onPrimary, LKColor.primary), ("onSecondary/secondary", LKColor.onSecondary, LKColor.secondary),
            ("secondary/surfaceContainer", LKColor.secondary, LKColor.surfaceContainer), ("primary/surfaceContainer", LKColor.primary, LKColor.surfaceContainer),
            ("error/surfaceContainer", LKColor.error, LKColor.surfaceContainer), ("onError/error", LKColor.onError, LKColor.error),
            ("onSurface/surfaceContainerHigh", LKColor.onSurface, LKColor.surfaceContainerHigh), ("tertiary/surfaceContainerHigh", LKColor.tertiary, LKColor.surfaceContainerHigh),
        ]
        for (n, f, b) in pairs {
            XCTAssertGreaterThanOrEqual(cr(f.light, b.light), 4.5, "light \(n)")
            XCTAssertGreaterThanOrEqual(cr(f.dark, b.dark), 4.5, "dark \(n)")
        }
        // review banner: fixed white text on the banner colour, banner2 text on the white pill (both schemes)
        XCTAssertGreaterThanOrEqual(cr(LKColor.onSecondary.light, LKColor.banner.dark), 4.5)
        XCTAssertGreaterThanOrEqual(cr(LKColor.banner2.dark, LKColor.surfaceBright.light), 4.5)
        let s = AppServices.preview(snapshot: TodaySnapshot(), theme: "dark")
        XCTAssertEqual(s.colorScheme, .dark)
        s.theme = "light"; XCTAssertEqual(s.colorScheme, .light)
        s.theme = "auto"; XCTAssertNil(s.colorScheme, "follow system")
        XCTAssertNotEqual(LKColor.background.light, LKColor.background.dark)
    }

    /// Reduce Motion: the press animation is disabled (no movement) – checked on the style used by every CTA.
    // MARK: C17 – first-run onboarding (splash → Welcome → language → goal → level → pace → Ready → Today; never blog/web)
    func testParityC17() async throws {
        let suite = "lk.test.c17." + UUID().uuidString
        let defaults = UserDefaults(suiteName: suite)!
        defer { defaults.removePersistentDomain(forName: suite) }
        let repo = try LKRepository.inMemory()

        // first launch: empty store → onboarding from Welcome; the only screens are the 6 native steps (no blog / web page exists in the flow)
        let flow = OnboardingFlow(defaults: defaults)
        XCTAssertEqual(flow.phase, .undecided, "splash while the local store is read")
        await flow.decide(repo: repo)
        XCTAssertEqual(flow.phase, .onboarding); XCTAssertEqual(flow.step, .welcome)
        XCTAssertEqual(OnboardingStep.allCases, [.welcome, .language, .goal, .level, .pace, .ready])

        // Back + Skip on every step except Ready (Back only); Welcome is the entry
        for st in [OnboardingStep.language, .goal, .level, .pace] { XCTAssertTrue(st.canBack, "\(st)"); XCTAssertTrue(st.canSkip, "\(st)") }
        XCTAssertTrue(OnboardingStep.ready.canBack); XCTAssertFalse(OnboardingStep.ready.canSkip)
        XCTAssertFalse(OnboardingStep.welcome.canBack)
        XCTAssertEqual(OnboardingStep.allCases.compactMap(\.barIndex), [0, 1, 2, 3, 4], "progress bar covers language … ready")
        flow.back(); XCTAssertEqual(flow.step, .welcome, "no Back before Welcome")
        flow.next(); XCTAssertEqual(flow.step, .language)
        for expect in [OnboardingStep.goal, .level, .pace, .ready] { flow.skip(); XCTAssertEqual(flow.step, expect) }
        flow.skip(); XCTAssertEqual(flow.step, .ready, "Ready has no Skip")
        for expect in [OnboardingStep.pace, .level, .goal, .language, .welcome] { flow.back(); XCTAssertEqual(flow.step, expect) }
        XCTAssertTrue(flow.pick == OnboardingPick(), "Skip writes nothing")
        XCTAssertEqual(OnboardingSettings.apply(nil, pick: OnboardingPick(), now: 1), ["onboarded": true])

        // choices use the SAME settings keys as web/js/onboard.js + tracks.js startSetup
        var pick = OnboardingPick(); pick.track = "toeic"; pick.level = "toeic2"; pick.pace = 40
        let s = OnboardingSettings.apply(["theme": "dark"], pick: pick, now: 1_000)
        XCTAssertEqual(s["theme"]?.string, "dark", "other settings are kept")
        XCTAssertEqual(s["exam"]?.string, "toeic"); XCTAssertEqual(s["examTarget"]?.string, "650"); XCTAssertNil(s["targetBand"])
        XCTAssertEqual(s["pace"]?.double, 40); XCTAssertEqual(s["dailyGoal"]?.double, 40); XCTAssertEqual(s["dailyNew"]?.double, 20)
        XCTAssertEqual(s["onboarded"], true)
        XCTAssertEqual(s["tracks"]?["cur"]?.string, "toeic"); XCTAssertEqual(s["tracks"]?["legacy"]?.string, "toeic")
        XCTAssertEqual(s["tracks"]?["lv"]?["toeic"]?["s"]?.string, "toeic2"); XCTAssertEqual(s["tracks"]?["v"]?["toeic"]?.string, "lr")
        var ie = OnboardingPick(); ie.track = "ielts"; ie.level = "test"
        let si = OnboardingSettings.apply(nil, pick: ie, now: 1)
        XCTAssertEqual(si["exam"]?.string, "ielts"); XCTAssertEqual(si["targetBand"]?.string, "7.0")
        XCTAssertEqual(si["tracks"]?["lv"]?.object?.count, 0, "placement test: level decided later by the test")

        // finish → saved with those keys, phase done, notification ask is only RAISED (shown after the first lesson), placement test opens its route
        let services = AppServices(auth: AuthModel(auth: GuestAuth(), engine: nil), today: TodayModel(repo: repo), repo: repo, engine: nil, crash: nil)
        let live = OnboardingFlow(defaults: defaults)
        await live.decide(repo: repo)
        live.pick = ie
        await live.finish(services: services)
        XCTAssertEqual(live.phase, .done)
        XCTAssertTrue(live.notificationAskPending, "hook for the post-first-lesson notification ask")
        XCTAssertEqual(services.router.focus?.name, "placement")
        let saved = try await repo.snapshot().settings
        XCTAssertEqual(saved?["onboarded"], true); XCTAssertEqual(saved?["exam"]?.string, "ielts")

        // relaunch → straight to Today, with the flag AND (flag lost) from the stored settings
        let again = OnboardingFlow(defaults: defaults)
        await again.decide(repo: repo)
        XCTAssertEqual(again.phase, .done)
        let other = UserDefaults(suiteName: suite + ".b")!
        defer { other.removePersistentDomain(forName: suite + ".b") }
        let noFlag = OnboardingFlow(defaults: other)
        await noFlag.decide(repo: repo)
        XCTAssertEqual(noFlag.phase, .done)

        // users migrated from the Capacitor app with data never see onboarding
        let migrated = try LKRepository.inMemory()
        _ = try await migrated.mutate { doc in doc.cards["hello"] = ["word": "hello", "vi": "xin chào"] }
        let m = UserDefaults(suiteName: suite + ".m")!
        defer { m.removePersistentDomain(forName: suite + ".m") }
        let mf = OnboardingFlow(defaults: m)
        await mf.decide(repo: migrated)
        XCTAssertEqual(mf.phase, .done)
        XCTAssertFalse(OnboardingGate.isFresh(SyncDoc(game: ["xp": 120])))
        XCTAssertFalse(OnboardingGate.isFresh(SyncDoc(settings: ["exam": "toeic"])))
        XCTAssertTrue(OnboardingGate.isFresh(SyncDoc()))

        // signing in during onboarding with an account that brings data leaves onboarding; an empty account stays
        let signIn = try LKRepository.inMemory()
        let sf = OnboardingFlow(defaults: UserDefaults(suiteName: suite + ".s")!)
        defer { UserDefaults(suiteName: suite + ".s")?.removePersistentDomain(forName: suite + ".s") }
        await sf.decide(repo: signIn)
        await sf.reevaluate(repo: signIn); XCTAssertEqual(sf.phase, .onboarding)
        _ = try await signIn.mutate { doc in doc.cards["a"] = ["word": "a"] }
        await sf.reevaluate(repo: signIn); XCTAssertEqual(sf.phase, .done)

        // language list: 15 UI languages, searchable by own name or code
        XCTAssertEqual(OnbLanguage.list(matching: "").count, 15)
        XCTAssertEqual(OnbLanguage.list(matching: "tiếng"), ["vi"]); XCTAssertEqual(OnbLanguage.list(matching: "AR"), ["ar"])
        // reduce motion: no animation for the step/progress changes
        XCTAssertNil(LKMotionPolicy.progressAnimation(reduce: true))
    }

    // MARK: C17 – starter deck parity: finishing onboarding creates exactly the deck web builds (vectors/starter-deck.json = real web Core.Cards.make)
    func testParityC17StarterDeck() async throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("../../../../shared/gen/vectors/starter-deck.json").standardized
        let vec = try JSON.parse(try Data(contentsOf: url))
        let nowMs = try XCTUnwrap(vec["now"]?.double)
        let decks = try XCTUnwrap(vec["decks"]?.object)
        let packs = try XCTUnwrap(vec["packs"]?.array)
        XCTAssertGreaterThanOrEqual(packs.count, 6)
        let pack = try XCTUnwrap(StarterDeck.bundled(), "starter.json must be bundled with LKStore")

        func assertDeck(_ cards: [String: JSON], exam: String, _ label: String) throws {
            let want = try XCTUnwrap(decks[exam], label)
            let keys = (want["keys"]?.array ?? []).compactMap(\.string)
            XCTAssertEqual(Set(cards.keys), Set(keys), "\(label): same words as web")
            XCTAssertEqual(cards.count, Int(want["count"]?.double ?? -1), label)
            for (k, c) in want["cards"]?.object ?? [:] { XCTAssertEqual(cards[k], c, "\(label): card \(k) equals web Cards.make + mod") }
        }
        // pure builder: every exam, web order
        for p in packs {
            let track = p["track"]?.string, variant = p["variant"]?.string ?? "", exam = try XCTUnwrap(p["exam"]?.string)
            XCTAssertEqual(StarterDeck.exam(track: track, variant: variant), exam, "pack \(track ?? "-")/\(variant) → exam")
            let built = StarterDeck.cards(exam: exam, pack: pack, now: nowMs)
            XCTAssertEqual(built.map(\.key), (decks[exam]?["keys"]?.array ?? []).compactMap(\.string), "insertion order = web")
            try assertDeck(Dictionary(uniqueKeysWithValues: built.map { ($0.key, $0.card) }), exam: exam, "\(exam) builder")
        }
        // the real thing: choose a track, press the Ready button → the repository holds exactly that deck (+ the settings web writes)
        for tid in ["comm", "ielts", "toeic", "toefl", "work"] {
            let exam = OnbTrack.find(tid).exam
            let suite = "lk.test.c17deck." + UUID().uuidString
            let defaults = UserDefaults(suiteName: suite)!
            defer { defaults.removePersistentDomain(forName: suite) }
            let repo = try LKRepository.inMemory()
            let services = AppServices(auth: AuthModel(auth: GuestAuth(), engine: nil), today: TodayModel(repo: repo), repo: repo, engine: nil, crash: nil)
            let flow = OnboardingFlow(defaults: defaults)
            await flow.decide(repo: repo)
            flow.pick.track = tid; flow.pick.pace = 20
            await flow.finish(services: services, date: Date(timeIntervalSince1970: nowMs / 1000))
            let doc = try await repo.snapshot()
            try assertDeck(doc.cards, exam: exam, "finish(\(tid))")
            XCTAssertEqual(doc.settings?["onboarded"], true); XCTAssertEqual(doc.settings?["exam"]?.string, exam)
        }
        // Skipping every step still ends on Ready with web's default pack (IELTS) → its deck; words already in the deck are never touched
        let repo = try LKRepository.inMemory()
        _ = try await repo.mutate { doc in doc.cards["curriculum"] = ["word": "curriculum", "vi": "mine", "note": "keep"] }
        var doc = try await repo.snapshot()
        StarterDeck.add(to: &doc, exam: "ielts", pack: pack, now: nowMs)
        XCTAssertEqual(doc.cards["curriculum"]?["note"]?.string, "keep", "an existing card is not replaced")
        XCTAssertEqual(doc.cards.count, Int(decks["ielts"]?["count"]?.double ?? -1))
    }

    func testReduceMotionStyles() {
        // \.accessibilityReduceMotion is a read-only SwiftUI environment key (cannot be overridden): the style is laid out under the system setting
        let v = Button("") {}.buttonStyle(PrimaryButtonStyle())
        let host = UIHostingController(rootView: v)
        host.view.frame = CGRect(x: 0, y: 0, width: 390, height: 60)
        host.view.layoutIfNeeded()
        // reduce = true → nothing moves; reduce = false → real motion
        XCTAssertNil(LKMotionPolicy.animation(response: 0.25, damping: 0.6, reduce: true))
        XCTAssertNil(LKMotionPolicy.progressAnimation(reduce: true))
        XCTAssertEqual(LKMotionPolicy.pressOffset(pressed: true, reduce: true, rest: 4, down: 1), 4)
        XCTAssertEqual(LKMotionPolicy.pressOffset(pressed: true, reduce: true, down: 3), 0)
        XCTAssertEqual(LKMotionPolicy.pressScale(pressed: true, reduce: true, down: 0.98), 1)
        XCTAssertNotNil(LKMotionPolicy.animation(response: 0.25, damping: 0.6, reduce: false))
        XCTAssertNotNil(LKMotionPolicy.progressAnimation(reduce: false))
        XCTAssertEqual(LKMotionPolicy.pressOffset(pressed: true, reduce: false, rest: 4, down: 1), 1)
        XCTAssertEqual(LKMotionPolicy.pressScale(pressed: true, reduce: false, down: 0.98), 0.98)
        XCTAssertEqual(LKMotionPolicy.pressScale(pressed: false, reduce: false, down: 0.98), 1)
        XCTAssertLessThanOrEqual(LKMotion.fadeMs, 200, "animations ≤ 200 ms")
    }

    /// Frame-time budget: laying out Today (all blocks) stays far below one 120 Hz frame on CI (8.3 ms) on average.
    func testTodayLayoutPerformance() {
        var s = TodaySnapshot(); s.due = 12; s.streak = 9; s.xp = 2400; s.mistakes = 3; s.target = "7.0"
        var c = TodayContent()
        c.lesson = .init(unitNo: 1, unitName: "Everyday English", at: 1, of: 6, title: "Fix common mistakes", words: ["borrow", "lend"], minutes: 3, level: "A2")
        c.path = (0..<6).map { .init(id: $0, label: "\($0 + 1)", state: $0 == 0 ? .done : $0 == 1 ? .next : .lock) }
        let services = AppServices.preview(snapshot: s, content: c)
        let host = UIHostingController(rootView: TodayView().environment(services).environment(\.l10n, L10n(lang: "de")))
        host.view.frame = CGRect(x: 0, y: 0, width: 390, height: 844)
        let opts = XCTMeasureOptions(); opts.iterationCount = 10
        measure(metrics: [XCTClockMetric()], options: opts) {
            host.view.setNeedsLayout(); host.view.layoutIfNeeded()
        }
    }
}

// MARK: - fakes
final class TestAuth: LKAuth, @unchecked Sendable {
    var user: LKUser?, signInError: Error = LKAuthError.cancelled, reauthed = false
    init(uid: String) { user = LKUser(uid: uid, displayName: "T", email: "t@example.com", providers: ["google.com"]) }
    func currentUser() async -> LKUser? { user }
    func userChanges() -> AsyncStream<LKUser?> { let u = user; return AsyncStream { $0.yield(u) } }
    @MainActor func signIn(_ method: LKSignInMethod) async throws -> LKUser { throw signInError }
    func signOut() async throws { user = nil }
    func idToken(forceRefresh: Bool) async throws -> String { "tok" }
    func driveAccessToken(interactive: Bool) async throws -> String? { nil }
    @MainActor func reauthenticate() async throws -> String { reauthed = true; return "tok2" }
    func deleteUser() async throws { user = nil }
}
actor ScriptedHTTP: LKHTTP {
    var queue: [(Int, JSON)], calls = 0
    init(_ q: [(Int, JSON)]) { queue = q }
    nonisolated func send(_ request: URLRequest) async throws -> (Data, HTTPURLResponse) { try await next(request) }
    func next(_ r: URLRequest) throws -> (Data, HTTPURLResponse) {
        calls += 1
        let (s, j) = queue.isEmpty ? (500, JSON.object([:])) : queue.removeFirst()
        return (j.data, HTTPURLResponse(url: r.url!, statusCode: s, httpVersion: nil, headerFields: nil)!)
    }
}
actor StepLog { var items: [AccountDeletion.Step] = []; func add(_ s: AccountDeletion.Step) { items.append(s) } }
