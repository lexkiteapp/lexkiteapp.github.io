import XCTest
import SwiftUI
import SnapshotTesting
@testable import LKFeatures

/// App frame (5 tabs) at light/dark × en/vi/ar(RTL)/de, hosted by the Lexkite app (project.yml target LexkiteSnapshots):
/// the iOS 26 TabView (Liquid Glass, portal layers) only draws through drawHierarchy in a real key window; the package
/// suite's layer.render produced an empty body and a white tab bar (#721). Images keep their place and names
/// (LKSnapshotTests/__Snapshots__/AppShellSnapshotTests/testAppShell.<lang>-<scheme>.png) so the visual gate reads one folder.
@MainActor
final class AppShellHostedSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let dir = URL(fileURLWithPath: #filePath).deletingLastPathComponent()
        .appendingPathComponent("../LexkiteKit/Tests/LKSnapshotTests/__Snapshots__/AppShellSnapshotTests").standardized.path

    func testAppShell() {
        for lang in SnapshotFixtures.langs {
            for scheme in SnapshotFixtures.schemes {
                let vc = SnapshotFixtures.host(AppShell(), lang: lang, scheme: scheme)
                // tab content + LazyVStack rows attach one runloop after the window: snapshot after it, not the empty first pass
                let failure = verifySnapshot(of: vc, as: .wait(for: 0.5, on: .image(drawHierarchyInKeyWindow: true, precision: 0.99, perceptualPrecision: 0.98,
                                                                                       size: CGSize(width: 390, height: 844))),
                                             named: SnapshotFixtures.name(lang, scheme), snapshotDirectory: Self.dir, testName: "testAppShell")
                if let failure { XCTFail(failure) }
            }
        }
    }
}
