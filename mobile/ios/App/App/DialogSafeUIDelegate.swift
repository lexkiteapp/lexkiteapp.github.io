// Lưới an toàn hộp thoại JS gốc (alert/confirm/prompt) trên iOS: WKWebView BẮT BUỘC completionHandler được gọi đúng 1 lần, nếu không
// WebKit ném NSInternalInconsistencyException ("Completion handler passed to … was not called") → app crash (Crashlytics, com.lexkite.app).
// Web đã bỏ hộp gốc (web/js/dialog.js, scripts/test/no-native-dialogs.mjs); lớp này che nốt bản web cũ/mã bên thứ ba: khi không thể hiện hộp
// (app ở nền, đã có hộp khác đang hiện, view chưa trong cửa sổ) thì trả mặc định (alert: xong · confirm: false · prompt: nil) thay vì bỏ rơi handler.
import UIKit
import WebKit

final class DialogSafeUIDelegate: NSObject, WKUIDelegate {
    private let inner: WKUIDelegate
    private weak var host: UIViewController?

    init(wrapping inner: WKUIDelegate, host: UIViewController) {
        self.inner = inner
        self.host = host
    }

    /// Hiện được hộp thoại gốc ngay lúc này?
    private var canPresent: Bool {
        guard UIApplication.shared.applicationState == .active, let host = host, host.viewIfLoaded?.window != nil else { return false }
        return host.presentedViewController == nil
    }

    // Mọi phương thức WKUIDelegate khác (mở cửa sổ, quyền camera/mic…) chuyển nguyên cho bộ xử lý của Capacitor.
    override func responds(to aSelector: Selector!) -> Bool { super.responds(to: aSelector) || inner.responds(to: aSelector) }
    override func forwardingTarget(for aSelector: Selector!) -> Any? { inner.responds(to: aSelector) ? inner : super.forwardingTarget(for: aSelector) }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        guard canPresent, inner.responds(to: #selector(WKUIDelegate.webView(_:runJavaScriptAlertPanelWithMessage:initiatedByFrame:completionHandler:))) else { completionHandler(); return }
        inner.webView?(webView, runJavaScriptAlertPanelWithMessage: message, initiatedByFrame: frame, completionHandler: completionHandler)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        guard canPresent, inner.responds(to: #selector(WKUIDelegate.webView(_:runJavaScriptConfirmPanelWithMessage:initiatedByFrame:completionHandler:))) else { completionHandler(false); return }
        inner.webView?(webView, runJavaScriptConfirmPanelWithMessage: message, initiatedByFrame: frame, completionHandler: completionHandler)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        // Capacitor dùng prompt() làm kênh đồng bộ cho cookie (JSON {"type":"CapacitorCookies.get|set"}) – trả lời ngay, không hiện hộp → luôn chuyển cho bộ xử lý gốc.
        let isBridgeCall = prompt.hasPrefix("{") && prompt.contains("\"type\"") && prompt.contains("CapacitorCookies.")
        guard isBridgeCall || canPresent, inner.responds(to: #selector(WKUIDelegate.webView(_:runJavaScriptTextInputPanelWithPrompt:defaultText:initiatedByFrame:completionHandler:))) else { completionHandler(nil); return }
        inner.webView?(webView, runJavaScriptTextInputPanelWithPrompt: prompt, defaultText: defaultText, initiatedByFrame: frame, completionHandler: completionHandler)
    }
}
