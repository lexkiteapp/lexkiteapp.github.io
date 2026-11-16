package com.lexkite.app.core.rig

/** One mood reaction: event [type] → teacher [pose] and its emotion [emo] (`poseEmo[pose] ?? pose`). */
data class MoodOut(val type: String, val pose: String, val emo: String)

/**
 * Port of `TeacherMood.machine()` (web/js/teacher-mood.js line 4–5): answer ok → cheer · wrong → concern, from the 2nd wrong in a row → encourage ·
 * streak → laugh · streakLost → empathy · idle → encourage · unknown type → null. Pose → emotion via rig.json `poseEmo`.
 */
class TeacherMood(private val poseEmo: Map<String, String>) {
    var ok = 0
        private set
    var bad = 0
        private set

    /** [ok] is the `answer` event's `data.ok` (ignored by the other types). */
    fun feed(type: String, ok: Boolean = false): MoodOut? {
        val pose = when (type) {
            ANSWER -> if (ok) { this.ok++; bad = 0; CHEER } else { bad++; this.ok = 0; if (bad > 1) ENCOURAGE else CONCERN }
            STREAK -> LAUGH
            STREAK_LOST -> EMPATHY
            IDLE -> ENCOURAGE
            else -> return null
        }
        return MoodOut(type, pose, poseEmo[pose] ?: pose)
    }

    private companion object {
        const val ANSWER = "answer"; const val STREAK = "streak"; const val STREAK_LOST = "streakLost"; const val IDLE = "idle"
        const val CHEER = "cheer"; const val CONCERN = "concern"; const val ENCOURAGE = "encourage"; const val LAUGH = "laugh"; const val EMPATHY = "empathy"
    }
}
