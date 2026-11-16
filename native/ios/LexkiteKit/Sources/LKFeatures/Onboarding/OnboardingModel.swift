import Foundation
import Observation
import LKSync
import LKStore
import LKStrings

// C17 – first-run onboarding (docs/specs/native-apps.md "Lần mở đầu"). Model + persistence; views are in OnboardingViews.swift.
// Flow: splash (while the local store is read, no network) → Welcome → native language → goal → level → pace → Ready → Today.
// Choices are saved through the repository with the SAME settings keys as web (web/js/onboard.js): exam, examTarget, targetBand,
// tracks{cur,on,legacy,lv,v,goals}, pace, dailyGoal, dailyNew, onboarded → sync carries them.

public enum OnboardingStep: Int, CaseIterable, Sendable {
    case welcome, language, goal, level, pace, ready
    /// Progress bar covers language … ready.
    public static let barCount = 5
    public var barIndex: Int? { self == .welcome ? nil : rawValue - 1 }
    /// Welcome is the entry (no Back/Skip); every later step has Back; Ready has Back only.
    public var canBack: Bool { self != .welcome }
    public var canSkip: Bool { self == .language || self == .goal || self == .level || self == .pace }
    public var next: OnboardingStep? { OnboardingStep(rawValue: rawValue + 1) }
    public var previous: OnboardingStep? { OnboardingStep(rawValue: rawValue - 1) }
}

/// What the learner picked. nil / empty = not chosen (Skip) → nothing is written for it.
public struct OnboardingPick: Sendable, Equatable {
    public var track: String?
    /// stage id of the track (e.g. "comm2", "s1") or "test" = quick placement test
    public var level = ""
    /// web `pace` value: 10 · 20 · 40
    public var pace: Int?
    public init() {}
}

struct OnbStage: Equatable {
    let id: String, cefr: String, band: String
    /// Same labels as web Tracks.lvBtns: IELTS "CEFR · Band", others "CEFR x".
    func label(ielts: Bool) -> String { ielts ? cefr + " · " + band : "CEFR " + cefr }
}

/// The 5 learning tracks of web `tracks.js` (ids, exams, stage ids). Names / benefits are L10nKey (web strings) except brand names.
struct OnbTrack: Identifiable {
    let id: String, symbol: String, exam: String
    let brandName: String?, nameKey: L10nKey?, subKey: L10nKey?, subText: String?
    let stages: [OnbStage]
    static func stage(_ tid: String, _ i: Int, _ cefr: String) -> OnbStage { OnbStage(id: tid + String(i + 1), cefr: cefr, band: "") }
    static let ielts: [OnbStage] = [
        OnbStage(id: "s0", cefr: "A1 – B1", band: "Band 4.0 – 5.0"), OnbStage(id: "s1", cefr: "B1 – B2", band: "Band 5.5 – 6.0"),
        OnbStage(id: "s2", cefr: "B2", band: "Band 6.5"), OnbStage(id: "s3", cefr: "C1", band: "Band 7.0"), OnbStage(id: "s4", cefr: "C1 – C2", band: "Band 7.5+"),
    ]
    static let all: [OnbTrack] = [
        OnbTrack(id: "comm", symbol: "bubble.left.and.bubble.right.fill", exam: "general", brandName: nil, nameKey: .onbTrackComm, subKey: .onbTrackCommSub, subText: nil,
                 stages: [stage("comm", 0, "A1 – A2"), stage("comm", 1, "A2 – B1"), stage("comm", 2, "B1 – B2"), stage("comm", 3, "B2 – C1")]),
        OnbTrack(id: "ielts", symbol: "graduationcap.fill", exam: "ielts", brandName: "IELTS", nameKey: nil, subKey: .onbTrackIeltsSub, subText: nil, stages: ielts),
        OnbTrack(id: "toeic", symbol: "briefcase.fill", exam: "toeic", brandName: "TOEIC", nameKey: nil, subKey: .onbTrackToeicSub, subText: nil,
                 stages: [stage("toeic", 0, "A2 – B1"), stage("toeic", 1, "B1"), stage("toeic", 2, "B2"), stage("toeic", 3, "B2 – C1")]),
        // web keeps the TOEFL benefit in English on purpose (official task names)
        OnbTrack(id: "toefl", symbol: "building.columns.fill", exam: "toefl", brandName: "TOEFL 2026", nameKey: nil, subKey: nil,
                 subText: "Complete the Words · Build a Sentence · Listen and Choose a Response",
                 stages: [stage("toefl", 0, "B1"), stage("toefl", 1, "B2"), stage("toefl", 2, "C1")]),
        OnbTrack(id: "work", symbol: "building.2.fill", exam: "general", brandName: nil, nameKey: .onbTrackWork, subKey: .onbTrackWorkSub, subText: nil,
                 stages: [stage("work", 0, "A2 – B1"), stage("work", 1, "B1"), stage("work", 2, "B2"), stage("work", 3, "C1")]),
    ]
    static func find(_ id: String?) -> OnbTrack { all.first { $0.id == id } ?? all[1] }   // web default track = IELTS
    func name(_ t: L10n) -> String { brandName ?? nameKey.map { t($0) } ?? id }
    func sub(_ t: L10n) -> String { subKey.map { t($0) } ?? subText ?? "" }
}

struct OnbPace: Identifiable {
    let value: Int, newWords: Int, title: L10nKey, sub: L10nKey, symbol: String
    var id: Int { value }
    static let all: [OnbPace] = [
        OnbPace(value: 10, newWords: 5, title: .onbPaceEasy, sub: .onbPaceEasySub, symbol: "leaf.fill"),
        OnbPace(value: 20, newWords: 10, title: .onbPaceSteady, sub: .onbPaceSteadySub, symbol: "flame.fill"),
        OnbPace(value: 40, newWords: 20, title: .onbPaceFast, sub: .onbPaceFastSub, symbol: "bolt.fill"),
    ]
    static let defaultValue = 20
    static func find(_ v: Int?) -> OnbPace { all.first { $0.value == (v ?? defaultValue) } ?? all[1] }
}

/// The 15 UI languages with their own names (endonyms are data, never translated).
enum OnbLanguage {
    static let names: [String: String] = [
        "vi": "Tiếng Việt", "en": "English", "es": "Español", "pt": "Português", "fr": "Français", "de": "Deutsch", "id": "Bahasa Indonesia",
        "th": "ไทย", "zh": "中文", "ja": "日本語", "ko": "한국어", "hi": "हिन्दी", "ar": "العربية", "ru": "Русский", "tr": "Türkçe",
    ]
    static func list(matching q: String) -> [String] {
        let needle = q.trimmingCharacters(in: .whitespaces).lowercased()
        return L10nLangs.all.filter { code in
            if needle.isEmpty { return true }
            let name = (names[code] ?? code).lowercased()
            return name.contains(needle) || code.contains(needle)
        }
    }
}

/// Writes the choices with the web key names. Pure so the tests can compare with what web stores.
public enum OnboardingSettings {
    static let newOf: [Int: Int] = [10: 5, 20: 10, 40: 20]
    static let defaultTarget: [String: String] = ["ielts": "7.0", "toeic": "650", "toefl": "4.5", "general": "B1"]

    public static func apply(_ base: JSON?, pick: OnboardingPick, now: Double) -> JSON {
        var s = JSON.spread(base)
        if pick.track != nil || !pick.level.isEmpty {
            let tr = OnbTrack.find(pick.track)
            let target = defaultTarget[tr.exam] ?? "B1"
            s["exam"] = .string(tr.exam)
            s["examTarget"] = .string(target)
            if tr.exam == "ielts" { s["targetBand"] = .string(target) }
            var lv: [String: JSON] = [:]
            if !pick.level.isEmpty && pick.level != "test" {
                var entry: [String: JSON] = [:]
                entry["s"] = .string(pick.level); entry["at"] = .number(now)
                lv[tr.id] = .object(entry)
            }
            var variants: [String: JSON] = [:]
            variants["ielts"] = .string("ac"); variants["toeic"] = .string("lr")
            var tracks: [String: JSON] = [:]
            tracks["cur"] = .string(tr.id); tracks["on"] = .array([.string(tr.id)]); tracks["legacy"] = .string(tr.id)
            tracks["lv"] = .object(lv); tracks["v"] = .object(variants); tracks["goals"] = .object([:])
            s["tracks"] = .object(tracks)
        }
        if let p = pick.pace, let n = newOf[p] {
            s["pace"] = .number(Double(p)); s["dailyGoal"] = .number(Double(p)); s["dailyNew"] = .number(Double(n))
        }
        s["onboarded"] = .bool(true)
        return .object(s)
    }
}

/// "Has data" = same idea as web `fresh` at boot (settings.onboarded, cards, XP) plus a chosen exam/track or any studied day.
/// Users migrated from the Capacitor app with data therefore never see onboarding.
public enum OnboardingGate {
    public static func isFresh(_ doc: SyncDoc) -> Bool {
        let s = doc.settings
        if JSON.truthy(s?["onboarded"]) { return false }
        if !doc.cards.isEmpty { return false }
        if JSON.orZero(doc.game?["xp"]) > 0 { return false }
        if !(doc.stats?["days"]?.object ?? [:]).isEmpty { return false }
        for k in ["exam", "examTarget", "placement", "tracks"] where JSON.truthy(s?[k]) { return false }
        return true
    }
}

@MainActor @Observable
public final class OnboardingFlow {
    public enum Phase: Equatable, Sendable { case undecided, onboarding, done }
    /// undecided = splash (local store being read); onboarding = the flow; done = the app (Today).
    public private(set) var phase: Phase = .undecided
    public private(set) var step: OnboardingStep = .welcome
    public var pick = OnboardingPick()
    public var langQuery = ""

    /// UserDefaults flag set when onboarding is finished: relaunch → straight to Today without waiting for the store.
    public static let doneKey = "lk.onb.done"
    /// HOOK (notifications-ux): finishing onboarding raises this; the notification soft-ask is shown after the FIRST LESSON, never here.
    public static let askNotificationsAfterFirstLessonKey = "lk.onb.askNotifAfterFirstLesson"
    let defaults: UserDefaults

    public init(defaults: UserDefaults = UserDefaults.standard) { self.defaults = defaults }

    public var notificationAskPending: Bool { defaults.bool(forKey: Self.askNotificationsAfterFirstLessonKey) }
    public func notificationAskHandled() { defaults.set(false, forKey: Self.askNotificationsAfterFirstLessonKey) }

    /// Reads local data only (no network). Called once after the Capacitor migration + preferences are loaded.
    public func decide(repo: LKRepository?) async {
        guard phase == .undecided else { return }
        if defaults.bool(forKey: Self.doneKey) { phase = .done; return }
        var fresh = true
        if let repo {
            if let doc = try? await repo.snapshot() { fresh = OnboardingGate.isFresh(doc) }
            if fresh, let flag = await repo.legacy("ls:lk.onb"), flag.truthy { fresh = false }
        }
        if fresh { step = .welcome; phase = .onboarding } else { markDone() }
    }
    /// Signed in during onboarding: if the account brought data, leave onboarding (web: signed-in with data → home). An empty account stays.
    public func reevaluate(repo: LKRepository?) async {
        guard phase == .onboarding, let repo, let doc = try? await repo.snapshot() else { return }
        if !OnboardingGate.isFresh(doc) { markDone() }
    }
    func markDone() { defaults.set(true, forKey: Self.doneKey); phase = .done }

    public func next() { if let n = step.next { step = n } }
    public func back() { if step.canBack, let p = step.previous { step = p } }
    /// Skip keeps whatever was already chosen and moves on; nothing is written for the skipped step.
    public func skip() { if step.canSkip { next() } }

    /// Last step: save the choices (same keys as web) and the starter deck (web adds the first 3 topics of the exam at the end of setup, `StarterDeck`),
    /// mark done, hand over to Today. A quick placement test goes to the web `placement` route.
    public func finish(services: AppServices, date: Date = Date()) async {
        guard phase == .onboarding else { return }
        let chosen = pick
        let now = date.timeIntervalSince1970 * 1000
        let deck = StarterDeck.bundled()
        let exam = OnbTrack.find(chosen.track).exam
        if let repo = services.repo {
            _ = try? await repo.mutate { doc in
                doc.settings = OnboardingSettings.apply(doc.settings, pick: chosen, now: now)
                doc.settingsAt = now
                if let deck { StarterDeck.add(to: &doc, exam: exam, pack: deck, now: now) }
            }
        }
        defaults.set(true, forKey: Self.askNotificationsAfterFirstLessonKey)
        markDone()
        services.localChange()
        if chosen.level == "test" { services.router.open(AppRoute("placement")) }
    }
}
