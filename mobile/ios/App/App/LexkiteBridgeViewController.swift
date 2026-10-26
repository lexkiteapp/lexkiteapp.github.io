// Bridge riêng của Lexkite: đăng ký plugin nội bộ (không phải gói npm) – hiện có WidgetBridge cho widget màn hình chính/khóa.
import UIKit
import Capacitor

class LexkiteBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(WidgetBridgePlugin())
        bridge?.registerPluginInstance(WordWidgetPlugin()) // widget "Từ mỗi giờ"
        bridge?.registerPluginInstance(LexAIPlugin()) // AI có sẵn trên máy (Foundation Models/Translation/NaturalLanguage) – web/js/ai-local.js
    }
}
