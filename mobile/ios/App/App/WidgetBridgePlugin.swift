// Plugin Capacitor tối thiểu cho widget: WidgetBridge.update({ json }) – ghi snapshot vào App Group rồi làm mới widget.
// Gọi từ web/js/native.js (chỉ trong app gốc). Snapshot ≤ 20 từ đến hạn + số thẻ + chuỗi ngày; widget đọc offline.
import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridgePlugin"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise)]

    @objc func update(_ call: CAPPluginCall) {
        guard let json = call.getString("json"), json.utf8.count < 64_000, LexSnapshot.decode(json) != nil else {
            call.reject("invalid snapshot"); return
        }
        LexShared.defaults.set(json, forKey: LexShared.key)
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadTimelines(ofKind: LexShared.widgetKind) }
        call.resolve()
    }
}
