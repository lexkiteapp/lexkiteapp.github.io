import XCTest
import SwiftUI
import SnapshotTesting
@testable import LKFeatures
import LKStrings
import LKStore
import LKSync
import LKDesign

/// Snapshot gate at 390 pt: light/dark × en/vi/ar(RTL)/de(+40 % text) for the app frame and the Today screen.
/// References live in __Snapshots__; CI records missing ones (SNAPSHOT_RECORD=missing, all with =1) and verifies after.
@MainActor
final class AppShellSnapshotTests: XCTestCase {
    override func invokeTest() {
        withSnapshotTesting(record: snapshotRecordMode()) { super.invokeTest() }
    }

    static let langs = ["en", "vi", "ar", "de"]
    static let schemes: [ColorScheme] = [.light, .dark]

    /// Fixed, realistic learner state (no clock, no network): computed with the web definitions from a fixed document.
    static func sample(hour: Int = 9) -> TodaySnapshot {
        var cal = Calendar(identifier: .gregorian); cal.timeZone = TimeZone(identifier: "UTC")!
        let ms = 1_772_366_400_000.0
        var cards: [String: JSON] = [:]
        for i in 0..<8 { cards["w\(i)"] = ["word": .string("w\(i)"), "vi": "x", "srs": ["reps": 2, "last": .number(ms - 864e5), "due": .number(ms - 1000)]] }
        let doc = SyncDoc(cards: cards, stats: ["days": ["2026-03-01": 12, "2026-02-28": 20, "2026-02-27": 9], "newToday": ["day": "2026-03-01", "n": 10]],
                          game: ["xp": 2240], settings: ["dailyGoal": 20, "examTarget": "6.5"])
        var s = TodaySnapshot.compute(doc: doc, mistakes: 5, now: Date(timeIntervalSince1970: ms / 1000), calendar: cal)
        s.hour = hour
        return s
    }

    func host<V: View>(_ v: V, lang: String, scheme: ColorScheme, theme: String = "auto") -> UIViewController {
        let services = AppServices.preview(snapshot: Self.sample(), lang: lang, theme: theme)
        let root = v.environment(services).environment(\.l10n, services.l10n)
            .environment(\.layoutDirection, services.l10n.isRTL ? .rightToLeft : .leftToRight)
            .environment(\.locale, Locale(identifier: lang))
            .environment(\.colorScheme, scheme)
        let vc = UIHostingController(rootView: root)
        vc.overrideUserInterfaceStyle = scheme == .dark ? .dark : .light
        return vc
    }

    func testAppShell() {
        for lang in Self.langs {
            for scheme in Self.schemes {
                // TabView (iOS 26) attaches tab content + LazyVStack rows one runloop after the window: snapshot after it, not the empty first pass
                assertSnapshot(of: host(AppShell(), lang: lang, scheme: scheme), as: .wait(for: 0.5, on: .image(on: .iPhone13, precision: 0.99, perceptualPrecision: 0.98)),
                               named: "\(lang)-\(scheme == .dark ? "dark" : "light")")
            }
        }
    }

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
