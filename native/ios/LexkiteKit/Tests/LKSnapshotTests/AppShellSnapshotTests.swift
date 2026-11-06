import XCTest
import SwiftUI
import SnapshotTesting
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// Snapshot gate at 390 pt: light/dark × en/vi/ar(RTL)/de(+40 % text) for the Today screen, Me (guest) and the top bars.
/// References live in __Snapshots__; CI records missing ones (SNAPSHOT_RECORD=missing, all with =1) and verifies after.
@MainActor
final class AppShellSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let langs = SnapshotFixtures.langs
    static let schemes = SnapshotFixtures.schemes

    func host<V: View>(_ v: V, lang: String, scheme: ColorScheme, theme: String = "auto") -> UIViewController {
        SnapshotFixtures.host(v, lang: lang, scheme: scheme, theme: theme)
    }

    // testAppShell (the 5-tab frame, 8 images in __Snapshots__/AppShellSnapshotTests) runs in the app-hosted suite
    // native/ios/AppTests/AppShellHostedSnapshotTests.swift: the iOS 26 TabView (Liquid Glass) only draws in a real key window,
    // layer.render here gave an empty body + white bar (#721).

    func testToday() {
        for lang in Self.langs {
            for scheme in Self.schemes {
                assertSnapshot(of: host(NavigationStack { TodayView() }, lang: lang, scheme: scheme),
                               as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98),
                               named: "\(lang)-\(scheme == .dark ? "dark" : "light")")
            }
        }
    }

    func testMeGuest() {
        for scheme in Self.schemes {
            let tab = LKFrameTabs.me
            assertSnapshot(of: host(MeHub(tab: tab), lang: "en", scheme: scheme), as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98),
                           named: scheme == .dark ? "dark" : "light")
        }
    }

    func testTopBarVariants() {
        for scheme in Self.schemes {
            let v = VStack(spacing: 0) {
                TopBar(variant: .hub, title: "Lexkite")
                TopBar(variant: .inner, title: L10n(lang: "en")(.meProgress))
                TopBar(variant: .focus(progress: 0.4), title: "")
            }.frame(width: 390, height: 180, alignment: .top)
                .background(LKColor.background.resolve(scheme))   // page colour behind the bars, as in the app (no transparent PNG)
                .environment(\.l10n, L10n(lang: "en")).environment(\.colorScheme, scheme)
            let vc = UIHostingController(rootView: v)
            vc.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
            assertSnapshot(of: vc, as: .image(size: CGSize(width: 390, height: 180)), named: scheme == .dark ? "dark" : "light")
        }
    }
}

enum LKFrameTabs { static var me: LKFrame.Tab { LKFrame.shared.tabs.first { $0.k == "me" }! } }
