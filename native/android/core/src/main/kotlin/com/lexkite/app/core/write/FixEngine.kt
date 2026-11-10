package com.lexkite.app.core.write

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.util.regex.Matcher
import java.util.regex.Pattern

// Small public JSON readers shared by the P09 part-2 code (the :core ones are module-internal). `l` = "learn".
fun JsonElement?.lStr(): String = if (this is JsonPrimitive && this !is JsonNull) content else ""
fun JsonElement?.lInt(): Int = (this as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content?.toDoubleOrNull()?.let { if (it.isFinite()) it.toInt() else 0 } ?: 0
fun JsonElement?.lNum(): Double? = (this as? JsonPrimitive)?.takeIf { it !is JsonNull }?.content?.toDoubleOrNull()
fun JsonElement?.lTrue(): Boolean = when (this) { null, is JsonNull -> false; is JsonPrimitive -> if (isString) content.isNotEmpty() else content != "false" && content != "0" && content != "0.0"; else -> true }
fun JsonElement?.lArr(): List<JsonElement> = (this as? JsonArray) ?: emptyList()
fun JsonElement?.lObj(): JsonObject = (this as? JsonObject) ?: JsonObject(emptyMap())
fun JsonElement?.lStrs(): List<String> = lArr().map { it.lStr() }
fun JsonObject?.lStr(k: String): String = this?.get(k).lStr()
fun JsonObject?.lInt(k: String): Int = this?.get(k).lInt()
fun JsonObject?.lNum(k: String): Double? = this?.get(k).lNum()
fun JsonObject?.lTrue(k: String): Boolean = this?.get(k).lTrue()
fun JsonObject?.lArr(k: String): List<JsonElement> = this?.get(k).lArr()
fun JsonObject?.lList(k: String): List<JsonObject> = lArr(k).mapNotNull { it as? JsonObject }
fun JsonObject?.lStrs(k: String): List<String> = this?.get(k).lStrs()
fun JsonObject?.lObj(k: String): JsonObject = this?.get(k).lObj()

/** One finding of #/fix: [s, e) in UTF-16 units of the text, like the web's `LK_WRITE.check`. */
class FixIssue(val s: Int, val e: Int, val type: String, val reps: List<String>, val levels: List<String>?, val rule: String, val title: String, val why: String, val lesson: String) {
    /** one tap applies it ("Sửa nhanh"): exactly one replacement and not a style hint */
    val safe: Boolean get() = reps.size == 1 && type != "style"
    override fun equals(other: Any?): Boolean = other is FixIssue && other.s == s && other.e == e && other.rule == rule
    override fun hashCode(): Int = (s * 31 + e) * 31 + rule.hashCode()
}

/**
 * M4 P09 - #/fix: the offline rule engine `LK_WRITE.check` of web/js/writecheck-rules.js. The rule table (regex source, flags, type, title, why, lesson) and the word tables come from
 * `content-pack/learn-content.json` (`fix`, generated from the web file); only the per-rule replacement functions are ported here. Verified against vectors/learn.json `fix` (LearnVectorsTest).
 */
class FixEngine(private val j: JsonObject) {
    private class Rule(val id: String, val re: Pattern, val type: String, val title: String, val why: String, val lesson: String)
    private class Hit(val s: Int, val e: Int, val reps: List<String>, val levels: List<String>? = null)
    private class M(val m: Matcher, val text: String) {
        val index get() = m.start()
        val end get() = m.end()
        fun g(i: Int): String = m.group(i) ?: ""
        val all get() = m.group(0) ?: ""
    }
    private val rules: List<Rule> = j.lList("rules").map { r ->
        Rule(r.lStr("id"), Pattern.compile(r.lStr("re"), if (r.lStr("flags").contains('i')) Pattern.CASE_INSENSITIVE else 0), r.lStr("type"), r.lStr("title"), r.lStr("why"), r.lStr("lesson"))
    }
    private fun table(k: String): Map<String, String> = j.lObj(k).mapValues { it.value.lStr() }
    private val spell = table("spell"); private val v3 = table("v3"); private val base = table("base")
    private val upg: Map<String, List<List<String>>> = j.lObj("upg").mapValues { (_, v) -> v.lArr().map { it.lStrs() } }
    val types: List<Pair<String, String>> = j.lArr("types").map { it.lStrs().let { a -> (a.firstOrNull() ?: "") to (a.lastOrNull() ?: "") } }
    val sample: String = j.lStr("sample")
    val maxLen: Int = j.lInt("maxLen").coerceAtLeast(1)
    val ruleCount: Int get() = rules.size

    companion object {
        private val cache = HashMap<String, Pattern>()
        private fun rx(p: String, ci: Boolean = false): Pattern = synchronized(cache) { cache.getOrPut((if (ci) "i:" else "s:") + p) { Pattern.compile(p, if (ci) Pattern.CASE_INSENSITIVE else 0) } }
        private fun test(p: String, s: String, ci: Boolean = false): Boolean = rx(p, ci).matcher(s).find()
        /** `s.replace(/p/, with)`: first match only (the patterns are anchored with `$`) */
        private fun sub(s: String, p: String, with: String): String { val m = rx(p).matcher(s); return if (m.find()) s.substring(0, m.start()) + expand(m, with) + s.substring(m.end()) else s }
        private fun expand(m: Matcher, tpl: String): String { val sb = StringBuilder(); var i = 0; while (i < tpl.length) { val c = tpl[i]; if (c == '$' && i + 1 < tpl.length && tpl[i + 1].isDigit()) { sb.append(m.group(tpl[i + 1] - '0') ?: ""); i += 2 } else { sb.append(c); i++ } }; return sb.toString() }
        /** JS `t.slice(a, b)` */
        private fun slice(t: String, a: Int, b: Int? = null): String {
            val n = t.length
            val from = if (a < 0) maxOf(0, n + a) else minOf(a, n)
            val to = if (b == null) n else if (b < 0) maxOf(0, n + b) else minOf(b, n)
            return if (from < to) t.substring(from, to) else ""
        }
        private fun cap(src: String, rep: String): String = if (src.isNotEmpty() && src[0] in 'A'..'Z' && rep.isNotEmpty()) rep[0].uppercaseChar() + rep.substring(1) else rep
        private fun ing(v0: String): String {
            val v = v0.lowercase()
            if (test("ie$", v)) return slice(v, 0, -2) + "ying"
            if (test("[^aeiou]e$", v) && v != "be") return slice(v, 0, -1) + "ing"
            if (test("^(stop|run|swim|get|sit|plan|shop|put|cut|set|begin|travel)$", v)) return v + (if (v == "travel") "ling" else v.last().toString() + "ing")
            return v + "ing"
        }
        private fun s3(v0: String): String {
            val v = v0.lowercase()
            if (v == "have") return "has"
            if (v == "be") return "is"
            if (v == "do" || v == "go") return v + "es"
            if (test("[^aeiou]y$", v)) return slice(v, 0, -1) + "ies"
            if (test("(s|sh|ch|x|z|o)$", v)) return v + "es"
            return v + "s"
        }
        private val PRIO = mapOf("spelling" to 0, "grammar" to 1, "punct" to 2, "style" to 3)
        /** replace several issues (from the end, so earlier offsets stay valid) */
        fun apply(text: String, list: List<Pair<FixIssue, String>>): String {
            var s = text
            for ((x, rep) in list.sortedByDescending { it.first.s }) if (x.e <= s.length) s = s.substring(0, x.s) + rep + s.substring(x.e)
            return s
        }
        /** what "Sửa nhanh" writes: every safe issue's first replacement */
        fun fixed(text: String, issues: List<FixIssue>): String = apply(text, issues.filter { it.safe }.map { it to it.reps[0] })
    }

    private fun fn(id: String, m: M, t: String): Hit? {
        val a0 = m.all; val end = m.end; val i = m.index
        fun whole(reps: List<String>) = Hit(i, end, reps)
        fun tail(n: Int, reps: List<String>, keep: Int? = null): Hit { val s = end - n; return Hit(s, if (keep != null) s + keep else end, reps) }
        when (id) {
            "spell" -> { val w = spell[a0.lowercase()] ?: return null; return whole(listOf(cap(a0, w))) }
            "i-lower" -> { val s = i + m.g(1).length; if (test("^i\\.e\\b", slice(t, s), true)) return null; return Hit(s, s + 1, listOf("I")) }
            "a-an" -> {
                val art = m.g(1).lowercase(); val w = m.g(2).lowercase()
                if (test("^[A-Z]{2,}", m.g(2)) || w.length < 2 || test("^(informations|advices|equipments|furnitures|knowledges|evidences|homeworks)$", w)) return null
                val silentH = test("^(hour|honest|honou?r|heir)", w); val yu = test("^(uni|use|usu|uti|ura|ure|eu|ewe|one\\b|once|ubiq|ukr|ufo)", w)
                val vowel = silentH || (test("^[aeiou]", w) && !yu)
                if (art == "a" && vowel) return Hit(i, i + m.g(1).length, listOf(cap(m.g(1), "an")))
                if (art == "an" && !vowel) return Hit(i, i + m.g(1).length, listOf(cap(m.g(1), "a")))
                return null
            }
            "dup" -> return if (test("^(had|that|is|do|very|bye|so|ha|no|knock|tut|bla|blah|can|will)$", m.g(1), true)) null else whole(listOf(m.g(1)))
            "sva-3" -> {
                if (test("\\b(does|did|will|would|can|could|should|must|may|might|to|let|make|help|see|hear|watch)\\s+$", slice(t, maxOf(0, i - 12), i), true)) return null
                val v = m.g(2).lowercase(); val r = mapOf("are" to "is", "were" to "was", "don't" to "doesn't")[v] ?: s3(v)
                return tail(m.g(2).length, listOf(r))
            }
            "sva-pl" -> {
                val v = m.g(2).lowercase()
                val r = mapOf("is" to "are", "was" to "were", "has" to "have", "does" to "do", "doesn't" to "don't", "goes" to "go")[v] ?: sub(sub(v, "ies$", "y"), "s$", "")
                return tail(m.g(2).length, listOf(r))
            }
            "sva-i" -> {
                val v = m.g(1); val r = mapOf("is" to "am", "has" to "have", "does" to "do", "was not" to "was not", "goes" to "go")[v] ?: sub(v, "s$", "")
                if (r == v) return null
                val s = i + 2; return Hit(s, s + v.length, listOf(r))
            }
            "sva-every" -> { val r = mapOf("are" to "is", "have" to "has", "were" to "was", "do" to "does")[m.g(2).lowercase()] ?: ""; val s = end - m.g(2).length; return Hit(s, s + m.g(2).length, listOf(r)) }
            "modal-to" -> return whole(listOf(m.g(1) + " "))
            "modal-s" -> {
                val v = m.g(3).lowercase()
                val r = mapOf("goes" to "go", "has" to "have", "does" to "do", "is" to "be", "was" to "be", "went" to "go", "did" to "do", "came" to "come")[v] ?: sub(v, "s$", "")
                return tail(m.g(3).length, listOf(r), v.length)
            }
            "modal-of" -> return tail(2, listOf("have"), 2)
            "perf-v2" -> { val v = m.g(3).lowercase(); return tail(m.g(3).length, listOf(v3[v] ?: ""), v.length) }
            "did-v2" -> {
                if (test("^(did|does)$", m.g(1), true) && !test("[?]", slice(t, i, i + 80))) return null
                val v = m.g(2).lowercase(); val r = base[v] ?: mapOf("goes" to "go", "has" to "have")[v] ?: sub(v, "s$", "")
                return tail(m.g(2).length, listOf(r), v.length)
            }
            "do-subj-s" -> {
                val v = m.g(3).lowercase()
                val r = base[v] ?: mapOf("goes" to "go", "has" to "have", "studied" to "study")[v] ?: sub(sub(sub(sub(v, "ied$", "y"), "(liv|lik)ed$", "$1e"), "ed$", ""), "s$", "")
                return tail(m.g(3).length, listOf(r), v.length)
            }
            "make-to" -> return tail(3, listOf(""), 3)
            "ger" -> {
                if (test("^(the|a|an|my|your|his|her|our|their|this|that|me|him|them|us|it)$", m.g(3), true)) return null
                return Hit(end - m.g(3).length - 3, end, listOf(ing(m.g(3))))
            }
            "look-fwd" -> return tail(m.g(2).length, listOf(ing(m.g(2))))
            "be-agree" -> return whole(listOf(m.g(2)))
            "if-will" -> {
                val p = m.g(2).lowercase(); val v = m.g(3).lowercase(); val third = test("^(he|she|it)$", p)
                val r = if (v == "be") (if (p == "i") "am" else if (third) "is" else "are") else if (third) s3(v) else v
                return Hit(end - m.g(3).length - 5, end, listOf(r))
            }
            "uncount" -> return whole(listOf(cap(a0, sub(sub(a0.lowercase(), "ies$", "y"), "s$", ""))))
            "more-er" -> return whole(listOf(m.g(2)))
            "then-than" -> {
                val w = m.g(1)
                if (test("^(other|rather|more|less|better|worse)$", w, true)) return null
                if (test("er$", w, true) && !test("^(after|never|whether|ever|over|under|together|however|either|neither|order|offer|enter|answer|consider|remember|wonder|matter|number|water|paper|later|layer|player|teacher|user|power|computer)$", w, true)) return Hit(end - 4, end, listOf("than"))
                return null
            }
            "since-for" -> return Hit(i, i + 5, listOf(cap(a0, "for")))
            "discuss-about" -> {
                val v = m.g(1).lowercase(); val p = m.g(2).lowercase()
                if (test("^(enter|entered)$", v) && p != "to") return null
                if (test("^marr", v) && p != "with") return null
                if (test("^lack", v) && p != "of") return null
                if (test("^reach", v) && p != "to") return null
                if (test("^mention", v) && p != "about") return null
                if (test("^discuss", v) && p != "about") return null
                if (test("^lack", v) && test("\\b(a|the)\\s+$", slice(t, maxOf(0, i - 6), i), true)) return null
                return Hit(i + m.g(1).length, end, listOf(""))
            }
            "dep-prep" -> {
                val w0 = m.g(1).lowercase()
                val v = if (test("^(interested|famous|married|responsible|different|similar|good)$", w0)) w0 else sub(sub(w0, "(s|ed|ing)$", ""), "^arriv$", "arrive")
                val p = m.g(2).lowercase()
                val ok = mapOf("depend" to listOf("on"), "interested" to listOf("in"), "famous" to listOf("for"), "responsible" to listOf("for", "to"), "married" to listOf("to"), "different" to listOf("from", "to"),
                    "similar" to listOf("to"), "consist" to listOf("of", "in"), "arrive" to listOf("at", "in"), "good" to listOf("at"))[v] ?: return null
                if (p in ok || v == "good") return null
                return Hit(end - m.g(2).length, end, listOf(ok[0]))
            }
            "other-hand" -> return Hit(i, i + 2, listOf(cap(a0, "on")))
            "despite-of" -> return Hit(i + 7, end, listOf(""))
            "although-but" -> return Hit(i + a0.lastIndexOf(',') + 1, end, listOf(""))
            "because-so" -> { if (test("^(as|since)$", m.g(1), true)) return null; return Hit(i + a0.lastIndexOf(',') + 1, end, listOf("")) }
            "explain-me" -> return Hit(i + m.g(1).length + 1, end, listOf("to " + m.g(2)))
            "your-welcome" -> return Hit(i, i + 4, listOf(cap(a0, "you're")))
            "its-a" -> return Hit(i, i + 3, listOf(cap(a0, "it's")))
            "there-their" -> return Hit(i, i + 5, listOf(cap(a0, "their")))
            "sp-before" -> {
                val nx = if (end < t.length) t[end].toString() else ""
                if (test("[A-Za-z]", nx)) return if (test("[,;!?]", m.g(3)) && test("[A-Za-z]", m.g(1))) Hit(i + 1, end, listOf(m.g(3) + " ")) else null
                if ((m.g(3) == "." && test("\\.\\s*$", m.g(1))) || (test("[:;]", m.g(3)) && test("[=(]", nx))) return null
                return Hit(i + 1, i + 1 + m.g(2).length, listOf(""))
            }
            "sp-after" -> { val s = i + m.g(1).length; return Hit(s, s + 1, listOf(m.g(2) + " ")) }
            "dbl-space" -> return Hit(i + 1, i + 1 + m.g(2).length, listOf(" "))
            "cap-start" -> {
                val s = i + m.g(1).length
                val before = slice(t, maxOf(0, i - 6), i + 1).trim()
                if (m.g(1).isNotEmpty() && (test("\\b(e\\.g|i\\.e|etc|vs|Mr|Mrs|Ms|Dr|St|No|approx|p|pp|cf|al|fig|ca)\\.$", before, true) || test("\\.\\.\\.?$", before) || test("\\d\\.$", before))) return null
                if (m.g(1).isEmpty() && i != 0) return null
                fun ch(k: Int): String = if (k >= 0 && k < t.length) t[k].toString() else ""
                if (ch(s + 1 + m.g(3).length) == "." && m.g(3).length < 3) return null
                if (test("^(http|www|https)$", m.g(2) + m.g(3), true) || test("[@/:]", ch(s + m.g(2).length + m.g(3).length))) return null
                return Hit(s, s + 1, listOf(m.g(2).uppercase()))
            }
            "linker-comma" -> { val s = end - m.g(2).length; return Hit(s, end, listOf(m.g(2) + ",")) }
            "redund" -> {
                val k = sub(a0.lowercase(), ",", "")
                val tbl = mapOf("return back" to "return", "repeat again" to "repeat", "revert back" to "revert", "in my opinion i think" to "in my opinion", "i personally think" to "I think", "free gift" to "gift", "end result" to "result",
                    "past history" to "history", "future plans" to "plans", "each and every" to "every", "join together" to "join", "combine together" to "combine", "true fact" to "fact", "final conclusion" to "conclusion", "still continue" to "continue")
                val r = tbl[k] ?: return null
                return whole(listOf(cap(a0, r)))
            }
            "upgrade" -> {
                val k = a0.lowercase().split(Regex("\\s+")).filter { it.isNotEmpty() }.joinToString(" ")
                val opts = upg[k]?.takeIf { it.isNotEmpty() } ?: return null
                return Hit(i, end, opts.map { cap(a0, it.firstOrNull() ?: "") }, opts.map { if (it.size > 1) it[1] else "" })
            }
        }
        return null
    }

    /** `LK_WRITE.check(text)`: issues sorted by position, overlaps resolved (spelling > grammar > punctuation > style, then the earlier one) */
    fun check(text0: String): List<FixIssue> {
        val text = if (text0.length > maxLen) text0.substring(0, maxLen) else text0
        val out = ArrayList<FixIssue>()
        for (r in rules) {
            val m = r.re.matcher(text); var guard = 0
            while (guard++ < 400 && m.find()) {
                if (m.end() == m.start()) continue
                val x = fn(r.id, M(m, text), text) ?: continue
                if (x.e <= x.s || x.s < 0) continue
                if (x.reps.size == 1 && x.reps[0] == slice(text, x.s, x.e)) continue
                out.add(FixIssue(x.s, x.e, r.type, x.reps, x.levels, "lk:" + r.id, r.title, r.why, r.lesson))
            }
        }
        val sorted = out.sortedWith(compareBy<FixIssue>({ PRIO[it.type] ?: 9 }, { it.s }))
        val keep = ArrayList<FixIssue>()
        for (x in sorted) if (keep.none { x.s < it.e && it.s < x.e }) keep.add(x)
        return keep.sortedBy { it.s }
    }

    /** the key of an ignored issue: rule + the wrong text, lower-case */
    fun key(x: FixIssue, text: String): String = x.rule + "|" + slice(text, x.s, x.e).lowercase()
}
