import Foundation
import SnapshotTesting

/// One record switch for every snapshot suite (CI passes it as TEST_RUNNER_SNAPSHOT_RECORD → SNAPSHOT_RECORD in the test process):
/// "1" re-records all, "missing" records only references that do not exist yet (new tests), anything else verifies.
func snapshotRecordMode() -> SnapshotTestingConfiguration.Record {
    switch ProcessInfo.processInfo.environment["SNAPSHOT_RECORD"] {
    case "1": return .all
    case "missing": return .missing
    default: return .never
    }
}
