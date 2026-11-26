package com.lexkite.app

import com.lexkite.app.core.settings.LearnSettings
import com.lexkite.app.core.sync.SyncDoc
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

/** P11: settings read with the web defaults (core.js DEFAULT_SETTINGS + app.js load) and written as web keys + settingsAt. Same cases as iOS SettingsModelTests. */
class LearnSettingsTest {
    private fun of(s: String) = LearnSettings.from(Json.parseToJsonElement(s))

    @Test fun defaultsMatchWeb() {
        assertEquals(LearnSettings(10, 20, 50, 0.9, "en-GB", 0.92, autoSpeak = true, sfx = true), LearnSettings.from(null))
        assertEquals(LearnSettings(), of("{}"))
    }

    @Test fun storedValuesKeptIncludingZeroAndFalse() {
        val s = of("""{"dailyNew":0,"dailyGoal":35,"sessionCap":0,"retention":0.85,"accent":"en-US","ttsRate":1.1,"autoSpeak":false,"sfx":false}""")
        assertEquals(LearnSettings(0, 35, 0, 0.85, "en-US", 1.1, autoSpeak = false, sfx = false), s)
    }

    @Test fun badValuesFallBack() {
        val s = of("""{"dailyGoal":0,"retention":0,"ttsRate":"fast","accent":"uk","dailyNew":"x"}""")
        assertEquals(20, s.dailyGoal); assertEquals(0.9, s.retention, 0.0); assertEquals(0.92, s.ttsRate, 0.0); assertEquals("en-GB", s.accent); assertEquals(10, s.dailyNew)
    }

    @Test fun slidersSnapLikeRangeInputs() {
        assertEquals(50.0, LearnSettings.DAILY_NEW.snap(80.0), 0.0)
        assertEquals(5.0, LearnSettings.DAILY_GOAL.snap(1.0), 0.0)
        assertEquals(25.0, LearnSettings.DAILY_GOAL.snap(23.0), 0.0)
        assertEquals(60.0, LearnSettings.SESSION_CAP.snap(57.0), 0.0)
        assertEquals(0.93, LearnSettings.RETENTION.snap(0.927), 0.0)
        assertEquals(0.92, LearnSettings.TTS_RATE.snap(0.921), 0.0)
        assertEquals(1.2, LearnSettings.TTS_RATE.snap(9.0), 0.0)
        assertEquals(39, LearnSettings.DAILY_GOAL.steps)
    }

    @Test fun putKeepsOtherKeysAndStamps() {
        val d = SyncDoc(settings = Json.parseToJsonElement("""{"onboarded":true,"dailyNew":10}"""))
        val out = LearnSettings.put(d, "dailyNew", JsonPrimitive(25), 1234L)
        val o = out.settings as JsonObject
        assertEquals(JsonPrimitive(true), o["onboarded"]); assertEquals(JsonPrimitive(25), o["dailyNew"]); assertEquals(JsonPrimitive(1234L), out.settingsAt)
        assertFalse(o.containsKey("theme"))
    }
}
