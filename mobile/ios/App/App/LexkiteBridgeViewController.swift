// Bridge riêng của Lexkite: đăng ký plugin nội bộ (không phải gói npm) – hiện có WidgetBridge cho widget màn hình chính/khóa.
import UIKit
import Capacitor

class LexkiteBridgeViewController: CAPBridgeViewController {
    // Nền trước khi web vẽ (--bg của brand/tokens.json, sinh bởi scripts/build-tokens.mjs) theo sáng/tối hệ thống → không chớp kem/trắng khi mở app ở chế độ tối
    /*@tokens*/ static let bgLight: UInt32 = 0xFBF7F1, bgDark: UInt32 = 0x0E191C /*@end*/
    private func themeBackground() -> UIColor {
        UIColor { tc in
            let h = tc.userInterfaceStyle == .dark ? LexkiteBridgeViewController.bgDark : LexkiteBridgeViewController.bgLight
            return UIColor(red: CGFloat((h >> 16) & 0xFF) / 255, green: CGFloat((h >> 8) & 0xFF) / 255, blue: CGFloat(h & 0xFF) / 255, alpha: 1)
        }
    }

    override open func viewDidLoad() {
        super.viewDidLoad()
        let bg = themeBackground()
        view.backgroundColor = bg
        webView?.isOpaque = false
        webView?.backgroundColor = bg
        webView?.scrollView.backgroundColor = bg
    }

    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(WordWidgetPlugin()) // widget "Từ mỗi giờ"
        bridge?.registerPluginInstance(LexAIPlugin()) // AI có sẵn trên máy (Foundation Models/Translation/NaturalLanguage) – web/js/ai-local.js
    }
}
