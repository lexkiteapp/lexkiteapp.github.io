import XCTest
@testable import LKFeatures
import LKCore

/// teach/cues.json (web LK_CUES): bundled in LKDesign, lookup by line key → LipSync.unpack.
final class CueTableTests: XCTestCase {
    func testBundledTableResolvesAndUnpacks() throws {
        let table = try XCTUnwrap(TeacherCueStore.table, "teach/cues.json missing from LKDesign")
        XCTAssertGreaterThan(table.count, 0)
        XCTAssertFalse(table.dictText.isEmpty)
        XCTAssertNil(table.unpacked("no-such-key"))
        let key = try XCTUnwrap(table.keys.sorted().first)
        let u = try XCTUnwrap(table.unpacked(key))
        XCTAssertGreaterThan(u.cues.count, 0)
        XCTAssertGreaterThanOrEqual(u.cues[0].start, 0)
        XCTAssertGreaterThan(u.dur, 0)
        XCTAssertNotNil(TeacherCueStore.lip)
    }
}
