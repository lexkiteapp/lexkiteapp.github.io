// Bản debug: dựng đúng RemoteViews của widget (LexkiteWidget.build) với dữ liệu mẫu để CI chụp ảnh trên emulator.
// adb shell am start -n com.lexkite.app/com.vocaband.app.WidgetPreviewActivity --es lang ar
package com.vocaband.app

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.widget.FrameLayout
import android.widget.LinearLayout
import org.json.JSONObject

class WidgetPreviewActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val ar = intent.getStringExtra("lang") == "ar"
        val now = System.currentTimeMillis()
        val snap = JSONObject(
            if (ar) """{"v":2,"at":$now,"due":12,"streak":7,"rtl":true,"words":[{"w":"resilient","ipa":"/rɪˈzɪliənt/","m":"مرن، قادر على التعافي","lv":"B2","due":0}],
                "l":{"title":"بطاقات اليوم","streak":"أيام متتالية","review":"راجع الآن","n":"{n} للمراجعة"}}"""
            else """{"v":2,"at":$now,"due":12,"streak":7,"rtl":false,"words":[{"w":"meticulous","ipa":"/məˈtɪkjələs/","m":"tỉ mỉ, kỹ lưỡng","lv":"C1","due":0}],
                "l":{"title":"Thẻ đến hạn hôm nay","streak":"Chuỗi ngày","review":"Ôn ngay","n":"{n} thẻ ôn lại"}}"""
        )
        val dp = resources.displayMetrics.density
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding((24 * dp).toInt(), (64 * dp).toInt(), (24 * dp).toInt(), 0); setBackgroundColor(Color.parseColor("#3A4A5A")) }
        listOf(false to 170, true to 170).forEach { (medium, h) ->
            val frame = FrameLayout(this)
            frame.addView(LexkiteWidget.build(this, snap, medium, 0, now).apply(this, frame))
            col.addView(frame, LinearLayout.LayoutParams(((if (medium) 340 else 170) * dp).toInt(), (h * dp).toInt()).apply { bottomMargin = (24 * dp).toInt() })
        }
        setContentView(col)
    }
}
