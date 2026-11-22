package com.lexkite.app.core.settings

import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.SyncDoc
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlin.math.roundToLong

/** One slider of the settings "study" / "sound" pages: the web `<input type="range">` bounds (web/js/settings.js). */
data class SettingRange(val min: Double, val max: Double, val step: Double) {
    /** Clamp + snap to the step from [min], like a browser range input. NaN → [min]. */
    fun snap(v: Double): Double {
        if (v.isNaN()) return min
        val n = ((v.coerceIn(min, max) - min) / step).roundToLong()
        return (min + n * step).coerceIn(min, max).let { Math.round(it * 100.0) / 100.0 }
    }
    val steps: Int get() = Math.round((max - min) / step).toInt()
}

/**
 * P11 – the synced learner settings the native settings pages edit, read from the shared `settings` document
 * with the web defaults (core.js DEFAULT_SETTINGS + app.js load: sfx true, retention 0.9, ttsRate 0.92).
 * Device-only choices (UI language, theme, haptics) live in [AppPrefs], never here.
 */
data class LearnSettings(
    val dailyNew: Int = 10,
    val dailyGoal: Int = 20,
    val sessionCap: Int = 50,
    val retention: Double = 0.9,
    val accent: String = "en-GB",
    val ttsRate: Double = 0.92,
    val autoSpeak: Boolean = true,
    val sfx: Boolean = true,
) {
    companion object {
        val DAILY_NEW = SettingRange(0.0, 50.0, 1.0)
        val DAILY_GOAL = SettingRange(5.0, 200.0, 5.0)
        val SESSION_CAP = SettingRange(0.0, 200.0, 10.0)
        val RETENTION = SettingRange(0.8, 0.95, 0.01)
        val TTS_RATE = SettingRange(0.6, 1.2, 0.02)

        /** Missing / wrong-typed keys fall back to the web default; `0`/`false` stored by web are kept (only `retention`/`ttsRate` use `||` like web). */
        fun from(settings: JsonElement?): LearnSettings {
            val o = settings as? JsonObject ?: return LearnSettings()
            val d = LearnSettings()
            fun num(k: String): Double? = (o[k] as? JsonPrimitive)?.takeIf { !it.isString }?.let { Js.num(it) }?.takeIf { !it.isNaN() }
            fun bool(k: String, def: Boolean): Boolean = (o[k] as? JsonPrimitive)?.let { p -> if (p.isString) def else p.content == "true" || (p.content != "false" && Js.truthy(p)) } ?: def
            return LearnSettings(
                dailyNew = num("dailyNew")?.toInt() ?: d.dailyNew,
                dailyGoal = num("dailyGoal")?.toInt()?.takeIf { it > 0 } ?: d.dailyGoal,
                sessionCap = num("sessionCap")?.toInt() ?: d.sessionCap,
                retention = num("retention")?.takeIf { it > 0 } ?: d.retention,
                accent = (o["accent"] as? JsonPrimitive)?.content?.takeIf { it == "en-US" } ?: "en-GB",
                ttsRate = num("ttsRate")?.takeIf { it > 0 } ?: d.ttsRate,
                autoSpeak = bool("autoSpeak", d.autoSpeak),
                sfx = bool("sfx", d.sfx),
            )
        }

        /** Writes one web key into the document (other keys kept) and stamps `settingsAt` so sync carries it (web saveSettings). */
        fun put(doc: SyncDoc, key: String, value: JsonElement, now: Long): SyncDoc =
            doc.copy(settings = JsonObject(Js.spread(doc.settings) + (key to value)), settingsAt = JsonPrimitive(now))

    }
}
