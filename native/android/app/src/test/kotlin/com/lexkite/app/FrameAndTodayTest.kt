package com.lexkite.app

import androidx.activity.ComponentActivity
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsSelected
import androidx.compose.ui.test.assertWidthIsAtLeast
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollTo
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.core.today.TodayModel
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.ui.EXIT_TAG
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.util.TimeZone

/** P01 frame + P02 Today behaviour (Robolectric, no emulator). */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-xxhdpi")
class FrameAndTodayTest {
    @get:Rule val rule = createAndroidComposeRule<ComponentActivity>()

    @Test fun parity_P01() {
        val t = Fixtures.t("en")
        rule.setContent { Fixtures.Shell("en", false) }
        // 5 tabs from frame.json, Today selected; switching keeps the frame
        for (k in listOf("home", "vocab", "skills", "tests", "me")) rule.onNodeWithTag("tab-$k").assertIsDisplayed()
        rule.onNodeWithTag("tab-home").assertIsSelected()
        rule.onNodeWithTag("tab-skills").performClick(); rule.onNodeWithTag("tab-skills").assertIsSelected()
        rule.onNodeWithTag("tab-home").performClick()
        // a focus screen: no tabs, X ≥ 44 dp, X and system Back both leave it
        rule.onNodeWithText(t(L10nKey.actionContinue).uppercase(t.locale)).performClick()
        rule.onNodeWithTag(EXIT_TAG).assertWidthIsAtLeast(44.dp).assertHeightIsAtLeast(44.dp)
        assertTrue(rule.onAllNodesWithTagCount("tab-home") == 0)
        rule.onNodeWithTag(EXIT_TAG).performClick()
        rule.onNodeWithTag("tab-home").assertIsDisplayed()
        rule.onAllNodesWithText(t(L10nKey.todayReview))[0].performScrollTo().performClick() // plan row → review focus
        rule.onNodeWithTag(EXIT_TAG).assertIsDisplayed()
        rule.runOnUiThread { rule.activity.onBackPressedDispatcher.onBackPressed() }
        rule.onNodeWithTag("tab-home").assertIsDisplayed()
    }

    private fun androidx.compose.ui.test.junit4.AndroidComposeTestRule<*, *>.onAllNodesWithTagCount(tag: String) =
        onAllNodes(androidx.compose.ui.test.hasTestTag(tag)).fetchSemanticsNodes().size

    @Test fun parity_P02() {
        val tz = TimeZone.getTimeZone("UTC")
        val now = 1772366400000L // 2026-03-01 12:00 UTC (Sunday)
        val doc = SyncDoc.from(Json.parseToJsonElement("""{
          "cards": {
            "due1": {"word":"due1","srs":{"reps":2,"last":1772000000000,"due":1772300000000}},
            "late": {"word":"late","srs":{"reps":1,"last":1772000000000,"due":1772500000000}},
            "new1": {"word":"new1","srs":{"reps":0,"last":null,"due":1772366400000}},
            "new2": {"word":"new2"}
          },
          "deleted": {},
          "stats": {"days": {"2026-03-01": 4, "2026-02-28": 9, "2026-02-27": 1}, "newToday": {"day":"2026-03-01","n":9}},
          "game": {"xp": 220, "days": {"2026-02-26": {"xp": 30}}, "frozen": {"2026-02-25": 1}},
          "settings": {"dailyGoal": 15, "dailyNew": 10, "examTarget": "6.5"}, "settingsAt": 0 }""") as JsonObject)
        val s = TodayModel.compute(doc, Json.parseToJsonElement("""[{"w":"a"},{"w":"b","fixed":true}]"""), now, tz)
        assertEquals(5, s.streak)               // 25 (frozen) · 26 (xp) · 27 · 28 · 1 (stats)
        assertEquals(220L, s.xp); assertEquals(4, s.reviewedToday); assertEquals(15, s.dailyGoal); assertEquals("6.5", s.target)
        assertEquals(1 + 1, s.due)              // due1 + 1 new (10 daily − 9 introduced); "late" not due yet
        assertEquals(1, s.mistakes)
        assertEquals(7, s.week.size); assertTrue(s.week.last().today) // Sunday is the last of a Monday-first week
        assertEquals(TodayModel.dayKey(now, tz), "2026-03-01")
        val empty = TodayModel.compute(SyncDoc(), null, now, tz)
        assertEquals(0, empty.due); assertEquals(0, empty.streak); assertEquals("", empty.target)
        // Today renders the review nudge with the due count in the UI language
        val t = Fixtures.t("en")
        rule.setContent { Fixtures.Shell("en", false) }
        rule.onNodeWithText(t(L10nKey.todayFading, mapOf("n" to Fixtures.today.due))).assertIsDisplayed()
    }
}
