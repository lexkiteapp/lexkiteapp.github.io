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
        // --ez ret true → lớp giữ thói quen (cờ ret): giáo viên Ama/Carlos + ✓ đã học hôm nay (--es who carlos, --ez done false → chưa học)
        if (intent.getBooleanExtra("ret", false)) {
            val cal = java.util.Calendar.getInstance()
            val today = String.format(java.util.Locale.US, "%04d-%02d-%02d", cal.get(java.util.Calendar.YEAR), cal.get(java.util.Calendar.MONTH) + 1, cal.get(java.util.Calendar.DAY_OF_MONTH))
            snap.put("tch", JSONObject().put("who", intent.getStringExtra("who") ?: "ama").put("sd", if (intent.getBooleanExtra("done", true)) today else "2000-01-01")
                .put("ok", if (ar) "تعلّمت اليوم" else "Hôm nay đã học").put("risk", if (ar) "حافظ على سلسلتك اليوم!" else "Giữ chuỗi hôm nay nhé!"))
        }
        val dp = resources.displayMetrics.density
        val col = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL; setPadding((24 * dp).toInt(), (64 * dp).toInt(), (24 * dp).toInt(), 0); setBackgroundColor(Color.parseColor("#3A4A5A")) }
        // --es kind word → widget "Từ mỗi giờ" (WordWidget.build): 4×2 có ví dụ, 2×2, 4×1 gọn; --ez quiz true = ẩn nghĩa
        if (intent.getStringExtra("kind") == "word") {
            val quiz = intent.getBooleanExtra("quiz", false)
            val feed = JSONObject(
                if (ar) """{"items":[{"w":"resilient","ipa":"/rɪˈzɪliənt/","mean":"مرن، قادر على التعافي","ex":"Children are often more resilient than adults.","id":"resilient"}],
                    "intervalMin":60,"startHour":0,"endHour":24,"showMean":${!quiz},"rtl":true,"l":{"title":"كلمة كل ساعة","tap":"اضغط لرؤية المعنى"}}"""
                else """{"items":[{"w":"meticulous","ipa":"/məˈtɪkjələs/","mean":"tỉ mỉ, kỹ lưỡng","ex":"She keeps meticulous notes of every lesson.","id":"meticulous"}],
                    "intervalMin":60,"startHour":0,"endHour":24,"showMean":${!quiz},"rtl":false,"l":{"title":"Từ mỗi giờ","tap":"Chạm để xem nghĩa"}}"""
            )
            listOf(Triple(false, true, 340 to 170), Triple(false, false, 170 to 170), Triple(true, true, 340 to 80)).forEach { (compact, wide, size) ->
                val frame = FrameLayout(this)
                frame.addView(WordWidget.build(this, feed, compact, wide, 0, now).apply(this, frame))
                col.addView(frame, LinearLayout.LayoutParams((size.first * dp).toInt(), (size.second * dp).toInt()).apply { bottomMargin = (20 * dp).toInt() })
            }
            setContentView(col)
            return
        }
        listOf(false to 170, true to 170).forEach { (medium, h) ->
            val frame = FrameLayout(this)
            frame.addView(LexkiteWidget.build(this, snap, medium, 0, now).apply(this, frame))
            col.addView(frame, LinearLayout.LayoutParams(((if (medium) 340 else 170) * dp).toInt(), (h * dp).toInt()).apply { bottomMargin = (24 * dp).toInt() })
        }
        setContentView(col)
    }
}
