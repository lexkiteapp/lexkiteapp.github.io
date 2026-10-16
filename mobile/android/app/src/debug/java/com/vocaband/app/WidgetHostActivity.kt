// Bản debug: màn chủ widget (AppWidgetHost) gắn widget LexkiteWidget THẬT như launcher – để CI kiểm thử tự động trên emulator:
// dữ liệu đổi → widget vẽ lại, chạm widget → PendingIntent → app mở #/review?w=từ (scripts/test/widget-e2e-android.mjs).
// Cần quyền gắn widget: adb shell appwidget grantbind --package com.lexkite.app
package com.vocaband.app

import android.app.Activity
import android.appwidget.AppWidgetHost
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.graphics.Color
import android.os.Bundle
import android.util.Log
import android.widget.FrameLayout
import android.widget.TextView

class WidgetHostActivity : Activity() {
    private lateinit var host: AppWidgetHost

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        host = AppWidgetHost(applicationContext, 4242)
        val mgr = AppWidgetManager.getInstance(this)
        val prefs = getSharedPreferences("widget_host_test", MODE_PRIVATE)
        var id = prefs.getInt("id", -1)
        if (id < 0 || mgr.getAppWidgetInfo(id) == null) {
            id = host.allocateAppWidgetId()
            if (!mgr.bindAppWidgetIdIfAllowed(id, ComponentName(this, LexkiteWidget::class.java))) {
                Log.e("LexWidgetTest", "BIND_FAILED"); setContentView(TextView(this).apply { text = "BIND_FAILED" }); return
            }
            prefs.edit().putInt("id", id).apply()
        }
        val dp = resources.displayMetrics.density
        val view = host.createView(applicationContext, id, mgr.getAppWidgetInfo(id))
        val root = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#3A4A5A")); setPadding((24 * dp).toInt(), (80 * dp).toInt(), 0, 0) }
        root.addView(view, FrameLayout.LayoutParams((180 * dp).toInt(), (180 * dp).toInt()))
        setContentView(root)
        Log.i("LexWidgetTest", "BOUND $id")
    }

    override fun onStart() { super.onStart(); host.startListening() }
    override fun onStop() { super.onStop(); host.stopListening() }
}
