// App Widget "Từ mỗi giờ" (Word of the hour): 1 từ (từ, phiên âm, nghĩa, ví dụ) đổi theo nhịp người học chọn (30 phút/1/2/3 giờ)
// trong khung giờ hoạt động; ngoài khung giữ từ cuối. Dữ liệu do WordWidgetPlugin ghi (web/js/widget-feed.js), đọc offline.
// Đổi từ: AlarmManager.set (KHÔNG chính xác, không đánh thức máy, không cần quyền đặc biệt) + updatePeriodMillis làm lưới an toàn.
// Không gửi thông báo. Chạm → lexkite://word/<id> → app mở thẻ từ (#/dict/<từ>). Màu theo docs/BRAND-RULES.md (widget_colors.xml + values-night).
package com.vocaband.app

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar
import java.util.TimeZone

class WordWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { render(context, manager, it) }
        scheduleNext(context)
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, newOptions: Bundle) {
        render(context, manager, id)
    }

    override fun onDisabled(context: Context) {
        alarm(context)?.cancel(tickIntent(context))
    }

    companion object {
        private const val PREFS = "lexkite_word_widget"
        private const val KEY = "feed"
        private val INTERVALS = setOf(30, 60, 120, 180)

        fun save(context: Context, json: String) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
            refresh(context)
        }

        fun refresh(context: Context) {
            val manager = AppWidgetManager.getInstance(context)
            val ids = manager.getAppWidgetIds(ComponentName(context, WordWidget::class.java))
            ids.forEach { render(context, manager, it) }
            if (ids.isNotEmpty()) scheduleNext(context)
        }

        fun feed(context: Context): JSONObject =
            runCatching { JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: "{}") }.getOrDefault(JSONObject())

        fun interval(f: JSONObject): Int = f.optInt("intervalMin", 60).let { if (it in INTERVALS) it else 60 }

        /** Khung giờ hợp lệ [start, end); start ≥ end → cả ngày. */
        fun window(f: JSONObject): Pair<Int, Int> {
            val s = f.optInt("startHour", 7).coerceIn(0, 23)
            val e = f.optInt("endHour", 22).coerceIn(1, 24)
            return if (s < e) Pair(s, e) else Pair(0, 24)
        }

        private fun dayStart(ms: Long, tz: TimeZone): Long = Calendar.getInstance(tz).apply {
            timeInMillis = ms; set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
        }.timeInMillis

        /** Số thứ tự nhịp ở thời điểm `now` (giống WordFeed.slot trên iOS và pickSlot trong web/js/widget-feed.js). */
        fun slot(f: JSONObject, now: Long, tz: TimeZone = TimeZone.getDefault()): Long {
            val (s, e) = window(f)
            val iv = interval(f)
            val per = Math.max(1, Math.ceil((e - s) * 60.0 / iv).toInt()).toLong()
            val d0 = dayStart(now, tz)
            val dayN = Math.floorDiv(d0 + tz.getOffset(d0), 86_400_000L)
            val mins = ((now - d0) / 60_000L).toInt()
            return when {
                mins < s * 60 -> dayN * per - 1
                mins >= e * 60 -> dayN * per + per - 1
                else -> dayN * per + (mins - s * 60) / iv
            }
        }

        /** Mốc đổi từ kế tiếp sau `now` (hôm nay hoặc ngày mai lúc bắt đầu khung giờ). */
        fun nextChange(f: JSONObject, now: Long, tz: TimeZone = TimeZone.getDefault()): Long {
            val (s, e) = window(f)
            val iv = interval(f)
            var d0 = dayStart(now, tz)
            repeat(3) {
                var m = s * 60
                while (m < e * 60) {
                    val t = Calendar.getInstance(tz).apply { timeInMillis = d0; add(Calendar.MINUTE, m) }.timeInMillis
                    if (t > now) return t
                    m += iv
                }
                d0 = Calendar.getInstance(tz).apply { timeInMillis = d0; add(Calendar.DAY_OF_YEAR, 1) }.timeInMillis
            }
            return now + iv * 60_000L
        }

        fun item(f: JSONObject, now: Long): JSONObject? {
            val arr = f.optJSONArray("items") ?: return null
            val n = arr.length()
            if (n == 0) return null
            return arr.optJSONObject(Math.floorMod(slot(f, now), n.toLong()).toInt())
        }

        private fun alarm(context: Context): AlarmManager? = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager

        private fun tickIntent(context: Context): PendingIntent {
            val ids = AppWidgetManager.getInstance(context).getAppWidgetIds(ComponentName(context, WordWidget::class.java))
            val i = Intent(context, WordWidget::class.java).setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE)
                .putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
            return PendingIntent.getBroadcast(context, 7101, i, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }

        /** Báo thức KHÔNG chính xác (RTC, không đánh thức máy): không cần SCHEDULE_EXACT_ALARM, hệ thống gom lại để tiết kiệm pin. */
        fun scheduleNext(context: Context) {
            val f = feed(context)
            val at = nextChange(f, System.currentTimeMillis())
            runCatching { alarm(context)?.set(AlarmManager.RTC, at, tickIntent(context)) }
        }

        fun render(context: Context, manager: AppWidgetManager, id: Int) {
            val o = manager.getAppWidgetOptions(id)
            val h = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT, 0)
            val w = o.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
            manager.updateAppWidget(id, build(context, feed(context), h in 1..99, w == 0 || w >= 250, id, System.currentTimeMillis()))
        }

        fun build(context: Context, f: JSONObject, compact: Boolean, wide: Boolean, id: Int, now: Long): RemoteViews {
            val cur = item(f, now)
            val v = RemoteViews(context.packageName, if (compact) R.layout.widget_word_compact else R.layout.widget_word)
            v.setInt(R.id.word_root, "setLayoutDirection", if (f.optBoolean("rtl")) View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR)
            val labels = f.optJSONObject("l")
            val word = cur?.optString("w").orEmpty().ifEmpty { "Lexkite" }
            val ipa = cur?.optString("ipa").orEmpty()
            val showMean = f.optBoolean("showMean", true)
            val mean = if (showMean) cur?.optString("mean").orEmpty() else ""
            val tap = labels?.optString("tap")?.takeIf { s -> s.isNotBlank() } ?: context.getString(R.string.word_widget_tap)
            v.setTextViewText(R.id.word_word, word)
            v.setTextViewText(R.id.word_ipa, ipa)
            v.setViewVisibility(R.id.word_ipa, if (ipa.isEmpty() || (!compact && !wide)) View.GONE else View.VISIBLE) // 2×2: chừa chỗ cho từ
            v.setTextViewText(R.id.word_mean, mean.ifEmpty { tap })
            v.setTextColor(R.id.word_mean, context.getColor(if (mean.isEmpty()) R.color.lex_widget_accent else R.color.lex_widget_ink))
            if (!compact) {
                labels?.optString("title")?.takeIf { s -> s.isNotBlank() }?.let { s -> v.setTextViewText(R.id.word_title, s) }
                val ex = cur?.optString("ex").orEmpty()
                v.setTextViewText(R.id.word_ex, if (ex.isEmpty()) "" else "“$ex”")
                v.setViewVisibility(R.id.word_ex, if (ex.isEmpty() || !wide) View.GONE else View.VISIBLE)
            }
            val key = cur?.optString("id").orEmpty().ifEmpty { cur?.optString("w").orEmpty() }.lowercase()
            val uri = Uri.parse("lexkite://word" + if (key.isNotEmpty()) "/" + Uri.encode(key) else "")
            val intent = Intent(Intent.ACTION_VIEW, uri, context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            v.setOnClickPendingIntent(R.id.word_root, PendingIntent.getActivity(context, 7200 + id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            return v
        }
    }
}
