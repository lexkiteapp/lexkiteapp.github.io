// XCTest chạy BÊN TRONG app trên simulator (CI ios.yml): kiểm widget Lexkite toàn trình phía iOS.
// 1) JS thật (VBNative.widget trong WKWebView) → plugin WidgetBridge → snapshot trong App Group mà widget đọc
// 2) Timeline: đổi từ mỗi giờ, qua nửa đêm tự tính số thẻ (days[], newDay); URL chạm widget đúng dạng
// 3) Deep link lexkite://review?w=từ (đường đi giống chạm widget: Capacitor openURL → App plugin) → location.hash = #/review?w=từ
// Chạm widget thật trên màn hình chính không tự động hóa được ổn định trên simulator → kiểm URL widgetURL + đường mở URL.
import XCTest
import UIKit
import WebKit

final class WidgetTests: XCTestCase {
    // MARK: Logic (không cần app)
    func testWidgetURL() {
        XCTAssertEqual(lexReviewURL(LexWord(w: "take off")).absoluteString, "lexkite://review?w=take%20off")
        XCTAssertEqual(lexReviewURL(nil).absoluteString, "lexkite://review")
    }

    func testStateRollsOverMidnight() {
        let cal = Calendar.current, now = Date(), ms = now.timeIntervalSince1970 * 1000
        let s = LexSnapshot(v: 2, at: ms, due: 3, days: [2, 5, 9], newDay: 1, streak: 1,
                            words: [LexWord(w: "a", due: ms - 1), LexWord(w: "n", due: 0), LexWord(w: "b", due: ms + 86_400_000 * 1.5)])
        let today = s.state(at: now)
        XCTAssertEqual(today.count, 3); XCTAssertEqual(today.words.map(\.w), ["a", "n"])
        let tomorrow = s.state(at: cal.date(byAdding: .day, value: 2, to: cal.startOfDay(for: now))!.addingTimeInterval(-60))
        XCTAssertEqual(tomorrow.count, 6); XCTAssertEqual(tomorrow.words.map(\.w), ["a", "n", "b"])
        XCTAssertEqual(s.state(at: now.addingTimeInterval(86_400 * 30)).count, 10)
    }

    func testWordRotatesHourly() {
        let ws = (0..<5).map { LexWord(w: "w\($0)") }
        XCTAssertEqual(LexSnapshot.pick(ws, slot: 7)?.w, "w2")
        XCTAssertNotEqual(LexSnapshot.pick(ws, slot: 7)?.w, LexSnapshot.pick(ws, slot: 8)?.w)
        XCTAssertNil(LexSnapshot.pick([], slot: 3))
    }

    // MARK: Toàn trình trong app
    @MainActor private func webView() -> WKWebView? {
        func find(_ v: UIView) -> WKWebView? { if let w = v as? WKWebView { return w }; for s in v.subviews { if let w = find(s) { return w } }; return nil }
        for case let scene as UIWindowScene in UIApplication.shared.connectedScenes { for w in scene.windows { if let v = find(w) { return v } } }
        return nil
    }

    @MainActor private func eval(_ js: String) async -> Any? {
        guard let wv = webView() else { return nil }
        return try? await wv.evaluateJavaScript(js)
    }

    @MainActor private func waitFor(_ timeout: TimeInterval, _ cond: () async -> Bool) async -> Bool {
        let end = Date().addingTimeInterval(timeout)
        while Date() < end { if await cond() { return true }; try? await Task.sleep(nanoseconds: 500_000_000) }
        return false
    }

    @MainActor func testJSWritesSnapshotAndDeepLinkOpensReview() async throws {
        let ready = await waitFor(90) { (await self.eval("!!(window.VBNative && window.Core && document.readyState === 'complete')") as? Bool) == true }
        XCTAssertTrue(ready, "web app chưa nạp xong")
        LexShared.defaults.removeObject(forKey: LexShared.key)

        _ = await eval("""
        (function () { const now = Date.now();
          const cards = { zephyr: { word: 'zephyr', ipa: '/ˈzef.ər/', vi: 'gió tây nhẹ', level: 'c2', srs: { reps: 2, last: now - 864e5, due: now - 1000 } } };
          VBNative.widget({ cards, settings: Core.DEFAULT_SETTINGS, stats: { days: {}, newToday: { day: '', n: 0 } } }, 9); return 'ok'; })()
        """)
        let wrote = await waitFor(15) { LexSnapshot.load()?.list.first?.w == "zephyr" }
        XCTAssertTrue(wrote, "plugin WidgetBridge chưa ghi snapshot vào App Group")
        let snap = try XCTUnwrap(LexSnapshot.load())
        XCTAssertEqual(snap.streakDays, 9)
        XCTAssertEqual(snap.dueCount, 1)
        XCTAssertEqual(snap.list.first?.lv, "C2")
        XCTAssertEqual(snap.list.first?.ipa, "/ˈzef.ər/")
        XCTAssertEqual(snap.state(at: Date()).count, 1)

        // Chạm widget mở widgetURL → iOS gọi scene(openURLContexts:) → Capacitor phát thông báo này → App plugin → JS appUrlOpen
        let url = lexReviewURL(snap.list.first)
        NotificationCenter.default.post(name: Notification.Name("CapacitorOpenURLNotification"), object: ["url": url, "options": [String: Any?]()] as [String: Any?])
        let opened = await waitFor(15) { (await self.eval("location.hash") as? String) == "#/review?w=zephyr" }
        XCTAssertTrue(opened, "deep link chưa mở #/review?w=zephyr – hash hiện tại: \(String(describing: await eval("location.hash")))")
    }
}
