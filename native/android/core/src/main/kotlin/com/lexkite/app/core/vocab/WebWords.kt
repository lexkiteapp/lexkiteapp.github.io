package com.lexkite.app.core.vocab

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Tolerant reader of the JS literals the web word packs use (strings, numbers, arrays, `null`, and `() => t('…')` / `t('…')` call wrappers). */
internal class JsLit(private val s: String, var i: Int = 0, private val consts: Map<String, JsonElement> = emptyMap()) {
    private fun ws() {
        while (i < s.length) {
            val c = s[i]
            if (c.isWhitespace()) i++
            else if (s.startsWith("//", i)) { val e = s.indexOf('\n', i); i = if (e < 0) s.length else e + 1 }
            else if (s.startsWith("/*", i)) { val e = s.indexOf("*/", i + 2); i = if (e < 0) s.length else e + 2 }
            else break
        }
    }
    private fun str(): String {
        val q = s[i++]; val sb = StringBuilder()
        while (i < s.length && s[i] != q) {
            var c = s[i++]
            if (c == '\\') {
                c = s[i++]
                when (c) {
                    'n' -> sb.append('\n'); 't' -> sb.append('\t'); 'r' -> sb.append('\r')
                    'u' -> { sb.append(s.substring(i, i + 4).toInt(16).toChar()); i += 4 }
                    else -> sb.append(c)
                }
            } else sb.append(c)
        }
        i++
        return sb.toString()
    }
    private fun key(): String {
        ws()
        if (s[i] == '\'' || s[i] == '"') return str()
        val st = i; while (i < s.length && (s[i].isLetterOrDigit() || s[i] == '_' || s[i] == '$')) i++
        return s.substring(st, i)
    }
    fun value(): JsonElement {
        ws()
        val c = s[i]
        return when {
            c == '\'' || c == '"' || c == '`' -> JsonPrimitive(str())
            c == '{' -> { i++; val m = LinkedHashMap<String, JsonElement>(); while (true) { ws(); if (s[i] == '}') { i++; break }; val k = key(); ws(); i++ /* : */; m[k] = value(); ws(); if (s[i] == ',') i++ }; JsonObject(m) }
            c == '[' -> { i++; val out = ArrayList<JsonElement>(); while (true) { ws(); if (s[i] == ']') { i++; break }; val at = i; out.add(value()); check(i > at) { "JS literal: stuck at ${s.substring(at, minOf(s.length, at + 30))}" }; ws(); if (s[i] == ',') i++ }; JsonArray(out) }
            c == '(' -> { i = s.indexOf("=>", i) + 2; value() } // () => t('…')
            c == '-' || c.isDigit() -> { val st = i; i++; while (i < s.length && (s[i].isDigit() || s[i] == '.')) i++; s.substring(st, i).let { n -> if (n.contains('.')) JsonPrimitive(n.toDouble()) else JsonPrimitive(n.toLong()) } }
            else -> { // identifier: null | undefined | true | false | t('…')
                val st = i; while (i < s.length && (s[i].isLetterOrDigit() || s[i] == '_')) i++
                val id = s.substring(st, i)
                when (id) {
                    "null", "undefined" -> JsonNull
                    "true" -> JsonPrimitive(true); "false" -> JsonPrimitive(false)
                    else -> if (s[i] == '[' && consts[id] is JsonArray) { // NAME[0] of a `const NAME = [...]` of the same file (the lib files keep one description there)
                        i++; val idx = value(); ws(); i++
                        (consts[id] as JsonArray).getOrNull((idx as? JsonPrimitive)?.content?.toIntOrNull() ?: -1) ?: JsonNull
                    } else { ws(); if (s[i] == '(') { i++; val a = value(); ws(); while (s[i] != ')') { i++; ws(); value(); ws() }; i++; a } else JsonNull }
                }
            }
        }
    }
    /** Arguments of a call whose `(` is already consumed; stops after `)`. */
    fun args(): List<JsonElement> {
        val out = ArrayList<JsonElement>()
        while (true) { ws(); if (s[i] == ')') { i++; break }; val at = i; out.add(value()); check(i > at) { "JS literal: stuck at ${s.substring(at, minOf(s.length, at + 30))}" }; ws(); if (s[i] == ',') i++ }
        return out
    }
}

/** One vocabulary set (web IELTS_DATA.TOPICS item). `name`/`desc` are the web's Vietnamese source keys; the UI translates them. */
class Topic(val id: String, val name: String, val emoji: String, val desc: String, var group: String, val words: List<JsonObject>)
class WordGroup(val id: String, val name: String, val emoji: String, val desc: String)

/**
 * The web word library as native data: `web/js/data.js` + `web/js/lib/` files rows -> topics, groups and the INDEX (lower-case word -> entry, the
 * set with the smallest group rank wins, ties load order). Native loads the same files as the web (cached by path); injectable text source.
 */
class WebWords(val topics: List<Topic>, val groups: List<WordGroup>) {
    val index: Map<String, JsonObject> by lazy {
        val rank = mapOf("topics" to 0, "writing" to 1, "speaking" to 2, "awl" to 3, "core" to 4, "office" to 5, "toeic" to 6, "domain" to 7, "exam" to 8, "nawl" to 9, "bsl" to 10)
        val rankOf = HashMap<String, Int>(); val out = HashMap<String, JsonObject>()
        for (t in topics) {
            val r = rank[t.group] ?: 99; rankOf[t.id] = r
            for (w in t.words) { val k = w.gs("word").lowercase(); val cur = out[k]; if (cur == null || r < (rankOf[cur.gs("topic")] ?: 99)) out[k] = w }
        }
        out
    }
    private val byId: Map<String, Topic> by lazy { LinkedHashMap<String, Topic>().also { m -> for (t in topics) if (!m.containsKey(t.id)) m[t.id] = t } }
    fun topic(id: String): Topic? = byId[id]

    companion object {
        private fun row(r: List<JsonElement>, id: String): JsonObject {
            fun g(n: Int): String = r.getOrNull(n).s()
            fun list(n: Int): List<String> = if (g(n).isEmpty()) emptyList() else g(n).split("|")
            return jo("word" to g(0), "ipa" to g(1), "pos" to g(2), "vi" to g(3), "def" to g(4), "ex" to g(5), "col" to list(6), "syn" to list(7), "level" to g(8), "emoji" to g(9), "ipaUS" to g(10), "topic" to id)
        }
        private val CALL = Regex("(?m)^[ \\t]*(add|T)\\(")
        /** `const NAME = ['text', ...];` - only arrays of plain strings (the lib files keep their description there); code-like arrays are not touched. */
        private val CONST = Regex("(?m)^[ \\t]*const (\\w+) = (\\[\\s*(?:'[^'\\n]*'|\"[^\"\\n]*\")(?:\\s*,\\s*(?:'[^'\\n]*'|\"[^\"\\n]*\"))*\\s*,?\\s*\\]);")

        /** Topics declared in one script (`T(...)` in data.js, `add(...)` in js/lib/ files), in file order. */
        fun parseTopics(text: String): List<Topic> {
            val out = ArrayList<Topic>()
            val consts = HashMap<String, JsonElement>()
            for (m in CONST.findAll(text)) consts[m.groupValues[1]] = JsLit(m.groupValues[2]).value()
            for (m in CALL.findAll(text)) {
                val a = JsLit(text, m.range.last + 1, consts).args()
                val id = a[0].s(); val rows = (a.getOrNull(4) as? JsonArray) ?: continue
                var group = a.getOrNull(5).s().ifEmpty { "topics" }
                if (m.groupValues[1] == "T" && (id == "task1" || id == "task2")) group = "writing"
                out.add(Topic(id, a[1].s(), a[2].s(), a[3].s(), group, rows.map { row((it as JsonArray).toList(), id) }))
            }
            return out
        }

        private val GROUP_LINE = Regex("(?m)^\\{ id: '(\\w+)'.*$")
        private val G_NAME = Regex("name(?:\\(\\) \\{ return t\\('((?:\\\\'|[^'])*)'\\); \\}|: '([^']*)')")
        private val G_DESC = Regex("desc\\(\\) \\{ return t\\('((?:\\\\'|[^'])*)'\\); \\}")
        private val G_EMOJI = Regex("emoji: '([^']+)'")
        /** GROUPS of data.js (id, name key, emoji, description key). */
        fun parseGroups(dataJs: String): List<WordGroup> = GROUP_LINE.findAll(dataJs).map { m ->
            val line = m.value
            val n = G_NAME.find(line); val d = G_DESC.find(line)
            WordGroup(m.groupValues[1], (n?.groupValues?.get(1)?.takeIf { it.isNotEmpty() } ?: n?.groupValues?.get(2) ?: "").replace("\\'", "'"), G_EMOJI.find(line)?.groupValues?.get(1) ?: "", (d?.groupValues?.get(1) ?: "").replace("\\'", "'"))
        }.toList()

        /** Build from the script texts (data.js first, then the lib files in the order the app loads them; later duplicates of an id are ignored like `add`). */
        fun fromScripts(dataJs: String, libs: List<String>): WebWords {
            val all = ArrayList<Topic>(parseTopics(dataJs))
            val seen = HashSet<String>(all.map { it.id })
            for (l in libs) for (t in parseTopics(l)) if (seen.add(t.id)) all.add(t)
            return WebWords(all, parseGroups(dataJs))
        }
    }
}
