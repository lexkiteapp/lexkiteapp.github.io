// Plugin Capacitor nội bộ cho widget "Từ mỗi giờ": WordWidget.setWords({ items, intervalMin, startHour, endHour, showMean, rtl, l })
// ghi JSON vào SharedPreferences rồi vẽ lại widget + hẹn lần đổi từ kế tiếp; WordWidget.reload() chỉ vẽ lại.
// Gọi từ web/js/widget-feed.js (chỉ trong app gốc). Không gọi mạng, không thông báo.
package com.vocaband.app

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject

@CapacitorPlugin(name = "WordWidget")
class WordWidgetPlugin : Plugin() {
    @PluginMethod
    fun setWords(call: PluginCall) {
        val items = call.data.optJSONArray("items")
        if (items == null || items.length() > 200) { call.reject("invalid words"); return }
        val obj = JSONObject(call.data.toString()).put("v", 1).put("at", System.currentTimeMillis())
        val json = obj.toString()
        if (json.length > 96_000) { call.reject("too large"); return }
        WordWidget.save(context, json)
        call.resolve(JSObject().put("count", items.length()))
    }

    @PluginMethod
    fun reload(call: PluginCall) {
        WordWidget.refresh(context)
        call.resolve()
    }
}
