import XCTest
import SwiftUI
import SnapshotTesting
import UIKit
@testable import LKFeatures
import LKStore
import LKDesign

/// P11 snapshot gate at 390 pt: settings index + look · study · sound · data · help, light/dark × en/vi/ar(RTL)/de(+40 %) = 48 images.
/// State = LearnSettings(dailyNew 15, sessionCap 0), guest, theme dark in the dark variants else auto. References live in __Snapshots__; CI records missing ones.
@MainActor
final class SettingsSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    func shoot(_ section: String, testName: String = #function) {
        for lang in SnapshotFixtures.langs {
            for scheme in SnapshotFixtures.schemes {
                let state = SettingsState(learn: LearnSettings(dailyNew: 15, sessionCap: 0), lang: lang, theme: scheme == .dark ? "dark" : "auto", haptics: true, user: nil)
                assertSnapshot(of: SnapshotFixtures.host(SettingsView(section: section, state: state), lang: lang, scheme: scheme),
                               as: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98),
                               named: SnapshotFixtures.name(lang, scheme), testName: testName)
            }
        }
    }

    func testIndex() { shoot("") }
    func testLook() { shoot("look") }
    func testStudy() { shoot("study") }
    func testSound() { shoot("sound") }
    func testData() { shoot("data") }
    func testHelp() { shoot("help") }
}
