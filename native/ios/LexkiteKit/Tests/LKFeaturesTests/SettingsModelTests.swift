import XCTest
import LKSync
import LKStore

/// P11: settings read with the web defaults (core.js DEFAULT_SETTINGS + app.js load) and written as web keys + settingsAt. Same cases as Android LearnSettingsTest.
final class SettingsModelTests: XCTestCase {
    private func of(_ s: String) throws -> LearnSettings { LearnSettings.from(try JSON.parse(s)) }

    func testDefaultsMatchWeb() throws {
        XCTAssertEqual(LearnSettings(dailyNew: 10, dailyGoal: 20, sessionCap: 50, retention: 0.9, accent: "en-GB", ttsRate: 0.92, autoSpeak: true, sfx: true), LearnSettings.from(nil))
        XCTAssertEqual(LearnSettings(), try of("{}"))
    }

    func testStoredValuesKeptIncludingZeroAndFalse() throws {
        let s = try of(#"{"dailyNew":0,"dailyGoal":35,"sessionCap":0,"retention":0.85,"accent":"en-US","ttsRate":1.1,"autoSpeak":false,"sfx":false}"#)
        XCTAssertEqual(LearnSettings(dailyNew: 0, dailyGoal: 35, sessionCap: 0, retention: 0.85, accent: "en-US", ttsRate: 1.1, autoSpeak: false, sfx: false), s)
    }

    func testBadValuesFallBack() throws {
        let s = try of(#"{"dailyGoal":0,"retention":0,"ttsRate":"fast","accent":"uk","dailyNew":"x"}"#)
        XCTAssertEqual(s.dailyGoal, 20); XCTAssertEqual(s.retention, 0.9); XCTAssertEqual(s.ttsRate, 0.92); XCTAssertEqual(s.accent, "en-GB"); XCTAssertEqual(s.dailyNew, 10)
    }

    func testSlidersSnapLikeRangeInputs() {
        XCTAssertEqual(LearnSettings.dailyNewRange.snap(80), 50)
        XCTAssertEqual(LearnSettings.dailyGoalRange.snap(1), 5)
        XCTAssertEqual(LearnSettings.dailyGoalRange.snap(23), 25)
        XCTAssertEqual(LearnSettings.sessionCapRange.snap(57), 60)
        XCTAssertEqual(LearnSettings.retentionRange.snap(0.927), 0.93)
        XCTAssertEqual(LearnSettings.ttsRateRange.snap(0.921), 0.92)
        XCTAssertEqual(LearnSettings.ttsRateRange.snap(9), 1.2)
        XCTAssertEqual(LearnSettings.dailyGoalRange.steps, 39)
    }

    func testPutKeepsOtherKeysAndStamps() throws {
        let d = SyncDoc(settings: try JSON.parse(#"{"onboarded":true,"dailyNew":10}"#))
        let out = LearnSettings.put(d, key: "dailyNew", value: .number(25), now: 1234)
        XCTAssertEqual(out.settings?["onboarded"], .bool(true)); XCTAssertEqual(out.settings?["dailyNew"], .number(25)); XCTAssertEqual(out.settingsAt, 1234)
        XCTAssertNil(out.settings?["theme"])
    }
}
