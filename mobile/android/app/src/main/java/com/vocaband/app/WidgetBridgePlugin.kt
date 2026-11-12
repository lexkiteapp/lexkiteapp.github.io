// Plugin Capacitor tối thiểu cho widget: WidgetBridge.update({ json }) – ghi snapshot vào SharedPreferences rồi vẽ lại widget.
// Gọi từ web/js/native.js (chỉ trong app gốc). Snapshot ≤ 20 từ đến hạn + số thẻ + chuỗi ngày; widget đọc offline, không gọi mạng.
package com.vocaband.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject

@CapacitorPlugin(name = "WidgetBridge")
class WidgetBridgePlugin : Plugin() {
    @PluginMethod
    fun update(call: PluginCall) {
        val json = call.getString("json")
        if (json == null || json.length > 64_000 || runCatching { JSONObject(json) }.isFailure) {
            call.reject("invalid snapshot"); return
        }
        LexkiteWidget.save(context, json)
        call.resolve()
    }
}
