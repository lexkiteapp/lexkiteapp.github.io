package com.lexkite.app.core.lesson

import com.lexkite.app.core.Answer

/**
 * Speech check for the lesson "say" exercise (native approximation of web UI.recognize's 0–100 score; the full pronunciation engine arrives with P07).
 * Score = longest common word sequence between what was heard and the target, over the target's words (0..1). Best of the recognizer's alternatives.
 */
object Speaking {
    fun score(expected: String, heard: List<String>): Double {
        val e = Answer.norm(expected).split(' ').filter { it.isNotEmpty() }
        if (e.isEmpty()) return 0.0
        return heard.maxOfOrNull { h ->
            val w = Answer.norm(h).split(' ').filter { it.isNotEmpty() }
            val dp = Array(e.size + 1) { IntArray(w.size + 1) }
            for (i in 1..e.size) for (j in 1..w.size) dp[i][j] = if (e[i - 1] == w[j - 1]) dp[i - 1][j - 1] + 1 else maxOf(dp[i - 1][j], dp[i][j - 1])
            dp[e.size][w.size].toDouble() / e.size
        } ?: 0.0
    }
}
