import XCTest
@testable import LKFeatures

/// Entry test route (#/placement, part of P10): a Tests-tab FOCUS route handled by the Skills host (full screen, progress bar, no tab bar).
@MainActor
final class PlacementRouteTests: XCTestCase {
    func testPlacementRoute() {
        let r = AppRoute("placement")
        XCTAssertEqual(r.tab, "tests")
        XCTAssertEqual(r.presentation, .focus)
        XCTAssertTrue(SkillsRoutes.handlesFocus("placement"))
        XCTAssertFalse(SkillsRoutes.handlesInner("placement"))
    }
}
