// Plugin Capacitor nội bộ cho widget "Từ mỗi giờ": WordWidget.setWords({ items, intervalMin, startHour, endHour, showMean, rtl, l })
// ghi JSON vào App Group (group.com.lexkite.app) rồi làm mới mọi widget; WordWidget.reload() chỉ làm mới.
// Gọi từ web/js/widget-feed.js (chỉ trong app gốc). Không gọi mạng, không thông báo.
import Foundation
import Capacitor
import WidgetKit

@objc(WordWidgetPlugin)
public class WordWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WordWidgetPlugin"
    public let jsName = "WordWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setWords", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "reload", returnType: CAPPluginReturnPromise),
    ]

    @objc func setWords(_ call: CAPPluginCall) {
        var obj: [String: Any] = [:]
        for (k, v) in call.options ?? [:] { if let key = k.base as? String { obj[key] = v } }
        obj["v"] = 1
        obj["at"] = Date().timeIntervalSince1970 * 1000
        guard let items = obj["items"] as? [Any], items.count <= 200,
              JSONSerialization.isValidJSONObject(obj),
              let data = try? JSONSerialization.data(withJSONObject: obj), data.count < 96_000,
              let json = String(data: data, encoding: .utf8), WordFeed.decode(json) != nil else {
            call.reject("invalid words"); return
        }
        LexShared.defaults.set(json, forKey: WordShared.key)
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
        call.resolve(["count": items.count])
    }

    @objc func reload(_ call: CAPPluginCall) {
        if #available(iOS 14.0, *) { WidgetCenter.shared.reloadAllTimelines() }
        call.resolve()
    }
}
