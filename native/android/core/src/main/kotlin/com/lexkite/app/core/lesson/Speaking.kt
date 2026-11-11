package com.lexkite.app.core.lesson

/**
 * Speech check of the lesson "say" exercise – port of web/js/ui.js `similarity` (vectors: lesson.json `similarity`).
 * Lower-case, keep only [a-z ], trim; both empty → 1; else 1 − Levenshtein / longer length. Pass at 70 %; the second miss is submitted anyway (LessonController).
 */
object Speaking {
    const val PASS = 70

    private fun clean(s: String) = s.lowercase().filter { it in 'a'..'z' || it == ' ' }.trim()

    fun similarity(a: String, b: String): Double {
        val x = clean(a); val y = clean(b)
        if (x.isEmpty() && y.isEmpty()) return 1.0
        var prev = IntArray(y.length + 1) { it }
        for (i in 1..x.length) {
            val cur = IntArray(y.length + 1); cur[0] = i
            for (j in 1..y.length) cur[j] = minOf(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + if (x[i - 1] == y[j - 1]) 0 else 1)
            prev = cur
        }
        return 1.0 - prev[y.length].toDouble() / maxOf(x.length, y.length)
    }

    /** Percent as the web shows it: Math.round(sim · 100). */
    fun percent(sim: Double): Int = Math.floor(sim * 100 + 0.5).toInt()

    /** Best of the recognizer's alternatives: (alternative, score 0..1 rounded to whole percent). */
    fun best(expected: String, heard: List<String>): Pair<String, Double> {
        val h = heard.maxByOrNull { similarity(it, expected) } ?: return "" to 0.0
        return h to percent(similarity(h, expected)) / 100.0
    }
    fun score(expected: String, heard: List<String>): Double = best(expected, heard).second
}
