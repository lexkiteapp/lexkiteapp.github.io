package com.lexkite.app.core

/** Answer checking – port of web/js/lesson/engine.js norm/check, verified by the shared conformance vectors. */
object Answer {
    fun norm(s: String): String {
        val x = s.lowercase().replace('’', '\'').replace('‘', '\'')
        val kept = buildString { for (c in x) append(if (c in 'a'..'z' || c in '0'..'9' || c == '\'' || c == ' ' || c == '-') c else ' ') }
        return kept.replace('-', ' ').split(' ').filter { it.isNotEmpty() }.joinToString(" ")
    }
    fun same(a: String, b: String) = norm(a) == norm(b)

    sealed interface Given { data class Text(val s: String) : Given; data class Words(val w: List<String>) : Given; data class Score(val v: Double) : Given; data class Matched(val m: Boolean) : Given }
    data class Item(val type: String, val answer: String, val choice: Boolean = false)

    fun check(it: Item, ans: Given): Boolean = when {
        it.type == "say" || (it.type == "pic" && !it.choice) -> when (ans) { is Given.Score -> ans.v >= 0.7; is Given.Text -> same(ans.s, it.answer); else -> false }
        it.type == "build" || it.type == "tr" -> when (ans) { is Given.Words -> same(ans.w.joinToString(" "), it.answer); is Given.Text -> same(ans.s, it.answer); else -> false }
        it.type == "match" -> ans is Given.Matched && ans.m
        else -> ans is Given.Text && same(ans.s, it.answer)
    }
}
