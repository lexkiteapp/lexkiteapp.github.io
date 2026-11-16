package com.lexkite.app

import com.lexkite.app.feature.lesson.ReviewPolicy
import org.junit.Assert.assertEquals
import org.junit.Test

/** Same vectors as native/shared/review-prompt.json (kept in sync by scripts/test/rate-prompt.mjs). */
class ReviewPolicyTest {
    private val now = 1_800_000_000_000L
    private val day = 86_400_000.0
    private fun ask(acc: Int, lessons: Int, install: Double, last: Double?, asks: Int) =
        ReviewPolicy.shouldAsk(acc, lessons, now, now - (install * day).toLong(), last?.let { now - (it * day).toLong() }, asks)

    @Test fun vectors() {
        assertEquals(true, ask(90, 5, 4.0, null, 0))
        assertEquals(false, ask(95, 4, 10.0, null, 0))
        assertEquals(false, ask(95, 9, 2.9, null, 0))
        assertEquals(false, ask(79, 9, 10.0, null, 0))
        assertEquals(true, ask(80, 9, 10.0, null, 0))
        assertEquals(false, ask(100, 20, 60.0, 30.0, 1))
        assertEquals(true, ask(100, 20, 120.0, 90.0, 1))
        assertEquals(true, ask(100, 60, 300.0, 120.0, 2))
        assertEquals(false, ask(100, 90, 500.0, 200.0, 3))
    }
}
