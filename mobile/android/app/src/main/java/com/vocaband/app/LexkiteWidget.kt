// App Widget màn hình chính của Lexkite (RemoteViews): 1 từ đến hạn ôn (từ, phiên âm, nghĩa, CEFR) + số thẻ hôm nay + chuỗi 🔥.
// Đọc snapshot do WidgetBridgePlugin ghi; đổi từ mỗi giờ (updatePeriodMillis); chạm → lexkite://review?w=từ → app mở #/review?w=từ.
// Màu theo docs/BRAND-RULES.md (values/ + values-night/ widget_colors.xml); RTL theo ngôn ngữ giao diện của app (ar).
package com.vocaband.app

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

class LexkiteWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { render(context, manager, it) }
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, newOptions: Bundle) {
        render(context, manager, id)
    }

    companion object {
        private const val PREFS = "lexkite_widget"
        private const val KEY = "snap"

        fun save(context: Context, json: String) {
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
            val manager = AppWidgetManager.getInstance(context)
            manager.getAppWidgetIds(ComponentName(context, LexkiteWidget::class.java)).forEach { render(context, manager, it) }
        }

        fun snapshot(context: Context): JSONObject =
            runCatching { JSONObject(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null) ?: "{}") }.getOrDefault(JSONObject())

        private fun label(s: JSONObject, key: String, en: String): String = s.optJSONObject("l")?.optString(key)?.takeIf { it.isNotBlank() } ?: en

        /** Số thẻ cần ôn + các từ đã đến hạn ở thời điểm `now`; qua ngày mới mà chưa mở app vẫn đúng (days[i], newDay). */
        fun stateAt(s: JSONObject, now: Long): Pair<Int, List<JSONObject>> {
            val tz = java.util.Calendar.getInstance()
            fun dayStart(ms: Long): Long = tz.apply { timeInMillis = ms; set(java.util.Calendar.HOUR_OF_DAY, 0); set(java.util.Calendar.MINUTE, 0); set(java.util.Calendar.SECOND, 0); set(java.util.Calendar.MILLISECOND, 0) }.timeInMillis
            val today = dayStart(now)
            val end = tz.apply { timeInMillis = today; add(java.util.Calendar.DAY_OF_YEAR, 1) }.timeInMillis
            val k = Math.max(0, Math.round((today - dayStart(s.optLong("at", now))) / 86_400_000.0).toInt())
            val arr = s.optJSONArray("words")
            val words = (0 until (arr?.length() ?: 0)).mapNotNull { arr!!.optJSONObject(it) }.filter { it.optLong("due", 0) <= end }
            val days = s.optJSONArray("days")
            if (k == 0 || days == null || days.length() == 0) return Pair(s.optInt("due", 0), words)
            return Pair(days.optInt(Math.min(k, days.length() - 1)) + Math.max(0, s.optInt("newDay", 0)), words)
        }

        fun render(context: Context, manager: AppWidgetManager, id: Int) {
            val minW = manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
            manager.updateAppWidget(id, build(context, snapshot(context), minW >= 220, id, System.currentTimeMillis()))
        }

        fun build(context: Context, s: JSONObject, medium: Boolean, id: Int, now: Long): RemoteViews {
            val (due, words) = stateAt(s, now)
            // Từ đổi mỗi giờ, xoay vòng trong ≤ 20 từ đến hạn
            val word = if (words.isNotEmpty()) words[((now / 3_600_000L) % words.size).toInt()] else null
            val streak = s.optInt("streak", 0)
            val v = RemoteViews(context.packageName, if (medium) R.layout.widget_medium else R.layout.widget_small)

            v.setInt(R.id.widget_root, "setLayoutDirection", if (s.optBoolean("rtl")) View.LAYOUT_DIRECTION_RTL else View.LAYOUT_DIRECTION_LTR)
            val countText = if (due > 0) label(s, "n", "{n} to review").replace("{n}", due.toString()) else label(s, "none", "No cards due")
            v.setTextViewText(R.id.widget_streak, "🔥 $streak")
            v.setContentDescription(R.id.widget_streak, "${label(s, "streak", "Day streak")} $streak")
            // Lớp giữ thói quen (cờ ret): giáo viên phản ứng – ✓ đã học hôm nay, ⏳ từ 18 giờ mà chưa học (tự đổi khi qua ngày, không cần mở app)
            val tch = s.optJSONObject("tch")
            if (tch != null) {
                val cal = java.util.Calendar.getInstance().apply { timeInMillis = now }
                val today = String.format(java.util.Locale.US, "%04d-%02d-%02d", cal.get(java.util.Calendar.YEAR), cal.get(java.util.Calendar.MONTH) + 1, cal.get(java.util.Calendar.DAY_OF_MONTH))
                val done = tch.optString("sd") == today
                val risk = !done && streak > 0 && cal.get(java.util.Calendar.HOUR_OF_DAY) >= 18
                v.setTextViewText(R.id.widget_streak, "🔥 $streak" + if (done) " ✓" else if (risk) " ⏳" else "")
                val say = if (done) tch.optString("ok") else if (risk) tch.optString("risk") else ""
                v.setContentDescription(R.id.widget_streak, "${label(s, "streak", "Day streak")} $streak" + if (say.isNotBlank()) ". $say" else "")
                if (medium) {
                    v.setImageViewResource(R.id.widget_teacher, if (tch.optString("who") == "carlos") R.drawable.teach_carlos else R.drawable.teach_ama)
                    v.setViewVisibility(R.id.widget_teacher, View.VISIBLE)
                }
            } else if (medium) v.setViewVisibility(R.id.widget_teacher, View.GONE)
            val w = word?.optString("w").orEmpty()
            val lv = word?.optString("lv").orEmpty()
            val ipa = word?.optString("ipa").orEmpty()
            v.setTextViewText(R.id.widget_word, w.ifEmpty { "Lexkite" })
            v.setTextViewText(R.id.widget_ipa, ipa)
            v.setViewVisibility(R.id.widget_ipa, if (ipa.isEmpty()) View.GONE else View.VISIBLE)
            v.setTextViewText(R.id.widget_meaning, word?.optString("m")?.takeIf { it.isNotBlank() } ?: label(s, "done", "You’re all caught up for today!"))
            v.setTextViewText(R.id.widget_level, lv)
            v.setViewVisibility(R.id.widget_level, if (lv.isEmpty()) View.GONE else View.VISIBLE)
            if (medium) {
                v.setTextViewText(R.id.widget_due, due.toString())
                v.setTextViewText(R.id.widget_title, label(s, "title", "Cards due today"))
                v.setTextViewText(R.id.widget_cta, if (due > 0) label(s, "review", "Review now") else label(s, "done", "All caught up"))
            } else {
                v.setTextViewText(R.id.widget_count, countText)
            }

            val uri = Uri.parse("lexkite://review" + if (w.isNotEmpty()) "?w=" + Uri.encode(w) else "")
            val intent = Intent(Intent.ACTION_VIEW, uri, context, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            v.setOnClickPendingIntent(R.id.widget_root, PendingIntent.getActivity(context, id, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
            return v
        }
    }
}
