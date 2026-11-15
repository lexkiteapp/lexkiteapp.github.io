import XCTest
import SwiftUI
import SnapshotTesting
@testable import LKFeatures
import LKDesign

/// C05 teacher rig (frozen, deterministic machine states) on the page background token, light/dark, framed tight to the rig canvas
/// (390 × 338 pt = the 1108 × 960 art at column width) – a full-screen device shot was 10× the bytes for the same pixels of the teacher:
/// 2 teachers × 5 states (rest, speaking D, speaking E, pose cheer, pose concern) × 2 schemes = 20 images.
/// References live in __Snapshots__; CI records missing ones (SNAPSHOT_RECORD=missing, all with =1) and verifies after.
@MainActor
final class TeacherSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let schemes: [ColorScheme] = [.light, .dark]
    static let frame = ViewImageConfig(safeArea: .zero, size: CGSize(width: 390, height: (390 * 960 / 1108.0).rounded()))
    /// The render scale comes from the `traits:` argument of `.image(on:)`; a displayScale inside ViewImageConfig is ignored (images stayed 3×).
    static let scale2 = UITraitCollection(displayScale: 2)
    static let states: [(name: String, shape: String, pose: String?)] = [
        ("rest", "X", nil), ("speak-D", "D", nil), ("speak-E", "E", nil), ("pose-cheer", "X", "cheer"), ("pose-concern", "X", "concern"),
    ]

    func host<V: View>(_ v: V, scheme: ColorScheme) -> UIViewController {
        let root = ZStack(alignment: .bottom) {
            LKColor.background.resolve(scheme).ignoresSafeArea()
            v.frame(maxWidth: .infinity).aspectRatio(1108.0 / 960.0, contentMode: .fit)
        }
        .environment(\.colorScheme, scheme)
        let vc = UIHostingController(rootView: root)
        vc.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
        return vc
    }

    /// `testName` is forwarded so both tests keep their own image names.
    func shoot(_ who: String, testName: String = #function) {
        for st in Self.states {
            for scheme in Self.schemes {
                assertSnapshot(of: host(TeacherView(controller: .frozen(who: who, shape: st.shape, pose: st.pose)), scheme: scheme),
                               as: .image(on: Self.frame, precision: 0.99, perceptualPrecision: 0.98, traits: Self.scale2),
                               named: "\(st.name)-\(scheme == .dark ? "dark" : "light")", testName: testName)
            }
        }
    }

    func testAma() { shoot("ama") }
    func testCarlos() { shoot("carlos") }
}
