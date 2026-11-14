package com.lexkite.app.feature.lesson

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import com.google.android.play.core.review.ReviewManagerFactory
import kotlinx.coroutines.delay

/**
 * In-app rating prompt policy (native/shared/review-prompt.json – constants checked by scripts/test/rate-prompt.mjs).
 * Happy moment = lesson-complete screen with accuracy ≥ 80. Never in the first days, never after a weak lesson, ≥ 90 days apart, ≤ 3 times in total.
 * Google Play decides whether the dialog really shows (its own quota); no custom "rate us" gate, nothing rewarded for a rating.
 */
object ReviewPolicy {
    const val MIN_ACCURACY = 80
    const val MIN_LESSONS = 5
    const val MIN_DAYS_SINCE_INSTALL = 3.0
    const val GAP_DAYS = 90.0
    const val MAX_ASKS = 3
    private const val DAY_MS = 86_400_000.0

    fun shouldAsk(accuracy: Int, lessons: Int, nowMs: Long, firstUseMs: Long, lastAskMs: Long?, asks: Int): Boolean {
        if (accuracy < MIN_ACCURACY || lessons < MIN_LESSONS || asks >= MAX_ASKS) return false
        if (nowMs - firstUseMs < MIN_DAYS_SINCE_INSTALL * DAY_MS) return false
        if (lastAskMs != null && nowMs - lastAskMs < GAP_DAYS * DAY_MS) return false
        return true
    }
}

/** Device-only counters (SharedPreferences): finished lessons, first-use time, last ask, number of asks. */
class ReviewLedger(private val prefs: android.content.SharedPreferences) {
    /** Call once per finished lesson. True when the system review flow should be requested now (the ask is recorded). */
    fun lessonFinished(accuracy: Int, nowMs: Long = System.currentTimeMillis(), installMs: Long = nowMs): Boolean {
        val lessons = prefs.getInt("lessons", 0) + 1
        val first = if (prefs.contains("first")) prefs.getLong("first", installMs) else installMs
        val last = if (prefs.contains("last")) prefs.getLong("last", 0) else null
        val asks = prefs.getInt("asks", 0)
        val ask = ReviewPolicy.shouldAsk(accuracy, lessons, nowMs, first, last, asks)
        prefs.edit().putInt("lessons", lessons).putLong("first", first).apply {
            if (ask) { putLong("last", nowMs); putInt("asks", asks + 1) }
        }.apply()
        return ask
    }
}

object ReviewPrompt {
    private tailrec fun Context.activity(): Activity? = when (this) { is Activity -> this; is ContextWrapper -> baseContext.activity(); else -> null }

    /** Called when the lesson-complete screen is shown. No-op outside a real Activity (previews, snapshot tests). */
    suspend fun consider(ctx: Context, accuracy: Int) {
        val act = ctx.activity() ?: return
        val installMs = runCatching { act.packageManager.getPackageInfo(act.packageName, 0).firstInstallTime }.getOrDefault(System.currentTimeMillis())
        if (!ReviewLedger(act.getSharedPreferences("lk_review", Context.MODE_PRIVATE)).lessonFinished(accuracy, installMs = installMs)) return
        delay(1_800)
        val m = ReviewManagerFactory.create(act)
        m.requestReviewFlow().addOnSuccessListener { info -> if (!act.isFinishing) m.launchReviewFlow(act, info) }
    }
}
