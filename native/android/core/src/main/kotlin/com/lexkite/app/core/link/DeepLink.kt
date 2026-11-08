package com.lexkite.app.core.link

import java.net.URLDecoder

/**
 * C08 – one route table for `lexkite://…` (kept from the live app) and app links `https://lexkite.com/app/#/…` (same hash routes as
 * web). [tab] is one of the 5 frame tabs (frame.json `k`), [route] the destination inside it (empty = the tab hub).
 */
data class DeepLink(val tab: String, val route: String = "", val arg: String = "") {
    /** Raw query string (`story=s-cafe`); not part of equality so route comparisons ignore tracking parameters. */
    var query: String = ""
    companion object {
        const val HOME = "home"; const val VOCAB = "vocab"; const val SKILLS = "skills"; const val TESTS = "tests"; const val ME = "me"
        private val TAB_OF = mapOf(
            "" to HOME, "home" to HOME, "today" to HOME, "lesson" to HOME, "path" to HOME, "streak" to HOME,
            "practice" to VOCAB, "deck" to VOCAB, "library" to VOCAB, "topic" to VOCAB,
            "vocab" to VOCAB, "review" to VOCAB, "word" to VOCAB, "words" to VOCAB, "dict" to VOCAB, "mistakes" to VOCAB,
            "verb" to VOCAB, "usage" to VOCAB, "phrases" to VOCAB, "letters" to SKILLS, "ideas" to SKILLS, "paraphrase" to SKILLS, "models" to SKILLS, "model" to SKILLS,
            "skills" to SKILLS, "train" to SKILLS, "listen" to SKILLS, "speak" to SKILLS, "write" to SKILLS, "grammar" to SKILLS, "read" to SKILLS,
            "tests" to TESTS, "mock" to TESTS, "toeic" to TESTS, "toefl" to TESTS, "exam" to TESTS,
            "me" to ME, "stats" to ME, "settings" to ME, "account" to ME, "goal" to ME, "notif" to ME, "search" to VOCAB,
        )

        /** Parses `lexkite://review`, `lexkite://word/<w>`, `https://lexkite.com/app/#/word/<w>?x=1`; null = not ours. */
        fun parse(uri: String?): DeepLink? {
            val u = uri?.trim() ?: return null
            val path: String = when {
                u.startsWith("lexkite://", ignoreCase = true) -> u.substring("lexkite://".length)
                Regex("^https://(www\\.)?lexkite\\.com/app/?", RegexOption.IGNORE_CASE).containsMatchIn(u) -> u.substringAfter('#', "").removePrefix("/")
                else -> return null
            }
            val clean = path.substringBefore('?').substringBefore('#').trim('/')
            val parts = clean.split('/').filter { it.isNotEmpty() }
            val head = parts.firstOrNull()?.lowercase() ?: ""
            val arg = parts.drop(1).joinToString("/").let { runCatching { URLDecoder.decode(it.replace("+", "%2B"), "UTF-8") }.getOrDefault(it) }
            val tab = TAB_OF[head] ?: return DeepLink(HOME)
            val route = if (head == tab || head == "" || head == "today") "" else head
            return DeepLink(tab, route, arg).also { it.query = path.substringAfter('?', "").substringBefore('#') }
        }
    }
}
