import XCTest
import SwiftUI
import SnapshotTesting
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// C17 first-run onboarding: splash + 6 steps, light/dark × en/vi/ar(RTL) at 390 pt = 42 images.
/// References live in __Snapshots__; CI records missing ones (SNAPSHOT_RECORD=missing, all with =1) and verifies after.
@MainActor
final class OnboardingSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let langs = ["en", "vi", "ar"]
    static let schemes: [ColorScheme] = [.light, .dark]

    func host<V: View>(_ v: V, lang: String, scheme: ColorScheme, pick: OnboardingPick = OnboardingPick()) -> UIViewController {
        let services = AppServices.preview(snapshot: TodaySnapshot(), lang: lang)
        services.onboarding.pick = pick
        let root = v.environment(services).environment(\.l10n, services.l10n)
            .environment(\.layoutDirection, services.l10n.isRTL ? .rightToLeft : .leftToRight)
            .environment(\.locale, Locale(identifier: lang))
            .environment(\.colorScheme, scheme)
        let vc = UIHostingController(rootView: root)
        vc.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
        return vc
    }

    static var chosen: OnboardingPick {
        var p = OnboardingPick(); p.track = "ielts"; p.level = "s1"; p.pace = 20
        return p
    }

    /// `testName` is forwarded: assertSnapshot inside a helper would otherwise name every image after the helper ("shoot-_-pick") and the 7 tests overwrite each other.
    func shoot<V: View>(_ make: () -> V, pick: OnboardingPick = OnboardingPick(), testName: String = #function) {
        for lang in Self.langs {
            for scheme in Self.schemes {
                assertSnapshot(of: host(make(), lang: lang, scheme: scheme, pick: pick), as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98),
                               named: "\(lang)-\(scheme == .dark ? "dark" : "light")", testName: testName)
            }
        }
    }

    func testSplash() { shoot { OnbSplashView() } }
    func testWelcome() { shoot { OnbWelcomeStep() } }
    func testLanguage() { shoot { OnbLanguageStep() } }
    func testGoal() { shoot({ OnbGoalStep() }, pick: Self.chosen) }
    func testLevel() { shoot({ OnbLevelStep() }, pick: Self.chosen) }
    func testPace() { shoot({ OnbPaceStep() }, pick: Self.chosen) }
    func testReady() { shoot({ OnbReadyStep() }, pick: Self.chosen) }
}
