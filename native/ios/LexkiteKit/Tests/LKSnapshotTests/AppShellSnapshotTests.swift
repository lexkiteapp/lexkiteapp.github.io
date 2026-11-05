import XCTest
import SwiftUI
import SnapshotTesting
@testable import LKFeatures
import LKStrings

/// Snapshot gate for the app frame at 390 pt: light/dark × en/vi/ar(RTL)/de(+40 %).
/// References live in __Snapshots__; CI records them on first run (SNAPSHOT_RECORD=1) and verifies after.
final class AppShellSnapshotTests: XCTestCase {
    override func invokeTest() {
        let record = ProcessInfo.processInfo.environment["SNAPSHOT_RECORD"] == "1"
        withSnapshotTesting(record: record ? .all : .never) { super.invokeTest() }
    }

    @MainActor func testAppShell() {
        for lang in ["en", "vi", "ar", "de"] {
            for scheme in [ColorScheme.light, .dark] {
                let v = AppShell().environment(\.l10n, L10n(lang: lang)).environment(\.colorScheme, scheme)
                let vc = UIHostingController(rootView: v)
                vc.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
                assertSnapshot(of: vc, as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98),
                               named: "\(lang)-\(scheme == .dark ? "dark" : "light")")
            }
        }
    }

    @MainActor func testTopBarVariants() {
        for scheme in [ColorScheme.light, .dark] {
            let v = VStack(spacing: 0) {
                TopBar(variant: .hub, title: "Lexkite")
                TopBar(variant: .inner, title: L10n(lang: "en")(.meProgress))
                TopBar(variant: .focus(progress: 0.4), title: "")
            }.frame(width: 390).environment(\.l10n, L10n(lang: "en")).environment(\.colorScheme, scheme)
            let vc = UIHostingController(rootView: v)
            vc.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
            assertSnapshot(of: vc, as: .image(size: CGSize(width: 390, height: 180)), named: scheme == .dark ? "dark" : "light")
        }
    }
}
