import SwiftUI
import UIKit
@testable import LKFeatures
import LKStore
import LKSync

/// Shared by the package snapshot suite and the app-hosted one (native/ios/AppTests, project.yml target LexkiteSnapshots):
/// one fixed learner state + one environment wrapper, so both render the same data.
@MainActor
enum SnapshotFixtures {
    static let langs = ["en", "vi", "ar", "de"]
    static let schemes: [ColorScheme] = [.light, .dark]
    /// P07 image budget (PR cap 20 MB): the main screen of every Stitch template (+ pas-sit, pas-drill, say-list/front/back) in four variants (en-light, vi-light, ar-light RTL, de-dark);
    /// every other state (empty, error, blocked, intermediate) in en-light only. Every state test still runs.
    static let speakMain: Set<String> = ["testSpeakSituationHub", "testSpeakDrillListen", "testSayList", "testSayFront", "testSayBack", "testSpeakingHubPart1", "testSpeakingRecording", "testSpeakingResult",
        "testPronHub", "testPronSoundVowel", "testPronPairsRound", "testPronSayRight", "testPronRhythmGreat", "testReflexRunSpeaking", "testReflexResult", "testRtypeHub", "testRtypeRun", "testRtypeResult",
        "testRoleplayList", "testRoleplayBrief", "testRoleplayChatTyping", "testRoleplayResult", "testHandsfreePlaying"]
    static func speakVariants(_ testName: String) -> [(String, ColorScheme)] {
        let all: [(String, ColorScheme)] = [("en", .light), ("vi", .light), ("ar", .light), ("de", .dark)]
        return speakMain.contains(testName.replacingOccurrences(of: "()", with: "")) ? all : [all[0]]
    }
    /// the 23 main screens are shot at 1.5× (vi-light, the text-fit variant, at 1×); the other states (en-light only) at 1× to keep the image pack small
    /// the five screens reused from the web templates (pas-sit, pas-drill, say-list/front/back) are also shot at 1× in ar-light (RTL check; image budget)
    static let speakAr1x: Set<String> = ["testSpeakSituationHub", "testSpeakDrillListen", "testSayList", "testSayFront", "testSayBack"]
    static func speakScale(_ testName: String, _ lang: String) -> CGFloat {
        let n = testName.replacingOccurrences(of: "()", with: "")
        return speakMain.contains(n) && lang != "vi" && !(lang == "ar" && speakAr1x.contains(n)) ? 1.5 : 1.0 }
    /// M4 P08 (#/call): all six states in the four variants; en-light and de-dark at 1.5×, vi-light and ar-light at 1× (the whole PR's images stay small)
    static func callVariants(_ testName: String) -> [(String, ColorScheme)] { [("en", .light), ("vi", .light), ("ar", .light), ("de", .dark)] }
    static func callScale(_ testName: String, _ lang: String) -> CGFloat { lang == "vi" || lang == "ar" ? 1.0 : 1.5 }
    static func name(_ lang: String, _ scheme: ColorScheme) -> String { "\(lang)-\(scheme == .dark ? "dark" : "light")" }

    /// Fixed, realistic learner state (no clock, no network): computed with the web definitions from a fixed document.
    static func sample(hour: Int = 9) -> TodaySnapshot {
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "UTC")!
        let ms = 1_772_366_400_000.0
        var cards: [String: JSON] = [:]
        for i in 0..<8 { cards["w\(i)"] = ["word": .string("w\(i)"), "vi": "x", "srs": ["reps": 2, "last": .number(ms - 864e5), "due": .number(ms - 1000)]] }
        let doc = SyncDoc(cards: cards, stats: ["days": ["2026-03-01": 12, "2026-02-28": 20, "2026-02-27": 9], "newToday": ["day": "2026-03-01", "n": 10]],
                          game: ["xp": 2240], settings: ["dailyGoal": 20, "examTarget": "6.5"])
        var s = TodaySnapshot.compute(doc: doc, mistakes: 5, now: Date(timeIntervalSince1970: ms / 1000), calendar: cal)
        s.hour = hour
        return s
    }

    static func host<V: View>(_ v: V, lang: String, scheme: ColorScheme, theme: String = "auto") -> UIViewController {
        let services = AppServices.preview(snapshot: sample(), lang: lang, theme: theme)
        let root = v.environment(services).environment(\.l10n, services.l10n)
            .environment(\.layoutDirection, services.l10n.isRTL ? .rightToLeft : .leftToRight)
            .environment(\.locale, Locale(identifier: lang))
            .environment(\.colorScheme, scheme)
            .environment(\.liveContent, false)
        let vc = UIHostingController(rootView: root)
        vc.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
        return vc
    }
}
