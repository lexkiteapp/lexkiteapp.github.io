import XCTest
@testable import LKFeatures

/// Same vectors as native/shared/review-prompt.json (kept in sync by scripts/test/rate-prompt.mjs).
final class ReviewPolicyTests: XCTestCase {
    private let now = Date(timeIntervalSince1970: 1_800_000_000), day: TimeInterval = 86_400
    private func ask(_ acc: Int, _ lessons: Int, _ install: Double, _ last: Double?, _ asks: Int) -> Bool {
        ReviewPolicy.shouldAsk(accuracy: acc, lessons: lessons, now: now, firstUse: now.addingTimeInterval(-install * day), lastAsk: last.map { now.addingTimeInterval(-$0 * day) }, asks: asks)
    }
    func testVectors() {
        XCTAssertTrue(ask(90, 5, 4, nil, 0))
        XCTAssertFalse(ask(95, 4, 10, nil, 0))
        XCTAssertFalse(ask(95, 9, 2.9, nil, 0))
        XCTAssertFalse(ask(79, 9, 10, nil, 0))
        XCTAssertTrue(ask(80, 9, 10, nil, 0))
        XCTAssertFalse(ask(100, 20, 60, 30, 1))
        XCTAssertTrue(ask(100, 20, 120, 90, 1))
        XCTAssertTrue(ask(100, 60, 300, 120, 2))
        XCTAssertFalse(ask(100, 90, 500, 200, 3))
    }
    func testLedgerAsksOnceThenWaits() {
        let d = UserDefaults(suiteName: "lk.rate.test.\(UUID().uuidString)")!
        let l = ReviewLedger(d), t0 = now.addingTimeInterval(-10 * day)
        for i in 0..<4 { XCTAssertFalse(l.lessonFinished(accuracy: 95, now: t0.addingTimeInterval(Double(i) * 60))) }  // lessons 1–4: too few
        XCTAssertFalse(l.lessonFinished(accuracy: 95, now: t0.addingTimeInterval(300)))   // lesson 5 but installed < 3 days ago
        XCTAssertTrue(l.lessonFinished(accuracy: 95, now: now))                          // lesson 6, 10 days on
        XCTAssertFalse(l.lessonFinished(accuracy: 95, now: now.addingTimeInterval(60)))  // never twice in a row
    }
}
