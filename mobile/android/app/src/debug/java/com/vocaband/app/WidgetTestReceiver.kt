// Bản debug: đổi dữ liệu widget từ adb (cùng đường ghi với WidgetBridgePlugin → LexkiteWidget.save) để CI kiểm widget tự vẽ lại.
// adb shell am broadcast -a com.lexkite.app.WIDGET_TEST -n com.lexkite.app/com.vocaband.app.WidgetTestReceiver --es word quokka
package com.vocaband.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject

class WidgetTestReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val word = intent.getStringExtra("word") ?: return
        val snap = JSONObject().put("v", 2).put("at", System.currentTimeMillis()).put("due", intent.getIntExtra("due", 3)).put("streak", 4)
            .put("words", JSONArray().put(JSONObject().put("w", word).put("m", "test").put("lv", "B1").put("due", 0)))
        LexkiteWidget.save(context, snap.toString())
    }
}
