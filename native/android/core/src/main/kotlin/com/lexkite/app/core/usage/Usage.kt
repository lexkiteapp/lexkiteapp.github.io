package com.lexkite.app.core.usage

import com.lexkite.app.core.verbs.Verbs
import com.lexkite.app.core.vocab.Absent
import com.lexkite.app.core.vocab.jo
import com.lexkite.app.core.vocab.s
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class UItem(val h: String, val vi: String, val en: String, val ex: MutableList<String>) { fun json() = jo("h" to h, "vi" to vi, "en" to en, "ex" to ex) }
class UNote(val vi: String, val en: String)
class UMis(val w: String, val r: String, val vi: String, val en: String)
class UReg(val r: String, val vi: String, val en: String)
/** One parsed entry of the "Cách dùng từ" data (kind p/v/a/s/c). */
class UEntry(val kind: String, val sub: String, val key: String) {
    val items = ArrayList<UItem>(); val ex = ArrayList<String>(); val notes = ArrayList<UNote>(); val mis = ArrayList<UMis>(); val col = ArrayList<String>(); val lessons = ArrayList<String>()
    val reg = ArrayList<UReg>(); val quiz = ArrayList<String>(); val k = ArrayList<String>(); val pos = ArrayList<String>(); val rel = ArrayList<String>(); var f = ""
    fun json() = jo("kind" to kind, "sub" to sub, "key" to key, "items" to items.map { it.json() }, "ex" to ex, "notes" to notes.map { jo("vi" to it.vi, "en" to it.en) },
        "mis" to mis.map { jo("w" to it.w, "r" to it.r, "vi" to it.vi, "en" to it.en) }, "col" to col, "lessons" to lessons, "reg" to reg.map { jo("r" to it.r, "vi" to it.vi, "en" to it.en) },
        "quiz" to quiz, "k" to k, "pos" to pos, "rel" to rel, "f" to f)
}
/** `She stopped [to buy|buying|buy] water.` -> pre / answer / distractors / post. */
class UExample(val pre: String, val ans: String, val alts: List<String>, val post: String, val text: String, val raw: String) {
    fun json() = jo("pre" to pre, "ans" to ans, "alts" to alts, "post" to post, "text" to text, "raw" to raw)
}
class UQuiz(val pre: String, val ans: String, val post: String, val choices: List<String>, val key: String, val kind: String, val item: UItem?) {
    fun json() = jo("pre" to pre, "ans" to ans, "post" to post, "choices" to choices, "key" to key, "kind" to kind, "item" to (item?.json()))
}
class ULookup(val key: String, val byKind: Map<String, List<UEntry>>) { val count get() = byKind.values.sumOf { it.size } }

/**
 * "Cách dùng từ" engine (port of web/js/usage-core.js): the hand-written data in a tiny line DSL, word resolution (inflections -> index key), suggestions,
 * fuzzy matches and the quick practice quiz (seeded LCG so results are reproducible). `src[kind]` = the DSL text, `wordIdx`/`idIdx` = web usage-index.js.
 */
class Usage(private val src: Map<String, String>, private val wordIdx: Map<String, String>, private val idIdx: Map<String, String>, private val verbs: Verbs? = null) {
    companion object {
        val KINDS = listOf("p", "v", "a", "s", "c")
        val SUBS = mapOf("p" to listOf("a", "v", "n"), "v" to listOf("v"), "a" to listOf("irr", "freq", "deg", "time", "link", "focus", "view", "man"), "s" to listOf("s"), "c" to listOf("c"))
        val PREPS = listOf("in", "on", "at", "for", "to", "of", "with", "about", "from", "by", "into", "against", "over", "towards", "between", "among", "after")
        private val QUIZ_PREPS = listOf("in", "on", "at", "for", "to", "of", "with", "about", "from", "by")
        val VCODES = listOf("to", "ing", "oto", "obare", "bare", "that", "sub", "oing", "ov3", "wh", "pass", "ping", "oo", "o")
        private val SPLIT = Regex("\\s+\\|\\s+")
        fun norm(s: String?): String = Regex("\\s+").replace((s ?: "").lowercase().replace("’", "'"), " ").trim()
        private fun split(s: String) = s.split(SPLIT).map { it.trim() }

        /** Build from the web script texts: `src` files (`LK_USAGE_SRC.<kind> = (… ) + \`…\``) in load order and usage-index.js. */
        fun fromScripts(srcFiles: List<String>, indexJs: String, verbs: Verbs?): Usage {
            val srcs = LinkedHashMap<String, StringBuilder>()
            for (t in srcFiles) {
                val kind = Regex("S\\.([a-z]) = \\(S\\.[a-z] \\|\\| ''\\)").find(t)?.groupValues?.get(1) ?: continue
                val a = t.indexOf('`'); val b = t.lastIndexOf('`'); if (a < 0 || b <= a) continue
                srcs.getOrPut(kind) { StringBuilder() }.append(t.substring(a + 1, b))
            }
            val i = indexJs.indexOf("LK_USAGE_IDX = ") + "LK_USAGE_IDX = ".length; val j = indexJs.lastIndexOf("};")
            val o = Json.parseToJsonElement(indexJs.substring(i, j + 1)).jsonObject
            fun m(k: String) = (o[k] as? JsonObject)?.entries?.associateTo(LinkedHashMap()) { it.key to it.value.jsonPrimitive.content } ?: emptyMap()
            return Usage(srcs.mapValues { it.value.toString() }, m("w"), m("id"), verbs)
        }
        fun example(src: String?): UExample {
            val s = src ?: ""; val a = s.indexOf('['); val b = if (a < 0) -1 else s.indexOf(']', a)
            if (a < 0 || b < 0) return UExample(s, "", emptyList(), "", s, s)
            val parts = s.substring(a + 1, b).split("|").map { it.trim() }
            val pre = s.substring(0, a); val post = s.substring(b + 1)
            return UExample(pre, parts[0], parts.drop(1).filter { it.isNotEmpty() }, post, pre + parts[0] + post, s)
        }
        /** Parse one data text. Errors are collected, never thrown. */
        fun parse(kind: String, text: String?): Pair<List<UEntry>, List<String>> {
            val out = ArrayList<UEntry>(); val errors = ArrayList<String>(); var cur: UEntry? = null; var item: UItem? = null
            (text ?: "").split("\n").forEachIndexed { i, line ->
                val l = line.trim(); if (l.isEmpty() || l.startsWith("//")) return@forEachIndexed
                val tag = l[0]; val rest = l.substring(1).trim()
                fun err(m: String) { errors.add("$kind:${i + 1}: $m") }
                if (tag == '@') {
                    val m = Regex("^(\\S+)\\s+(.+)$").find(rest) ?: run { err("thiếu khóa"); return@forEachIndexed }
                    val e = UEntry(kind, m.groupValues[1], m.groupValues[2].trim()); cur = e; item = null; out.add(e)
                    if (SUBS.getValue(kind).none { it == e.sub }) err("loại không hợp lệ: " + e.sub)
                    return@forEachIndexed
                }
                val c = cur ?: run { err("dòng nằm ngoài mục"); return@forEachIndexed }
                when (tag) {
                    '+' -> { val p = split(rest); val it = UItem(p[0], p.getOrElse(1) { "" }, p.getOrElse(2) { "" }, p.getOrNull(3)?.takeIf { x -> x.isNotEmpty() }?.let { x -> mutableListOf(x) } ?: mutableListOf()); item = it; c.items.add(it) }
                    'x' -> (item?.ex ?: c.ex).add(rest)
                    '#' -> { val p = split(rest); c.notes.add(UNote(p[0], p.getOrElse(1) { "" })) }
                    '!' -> { val p = split(rest); val wr = p[0].split(Regex("\\s*=>\\s*")); if (wr.getOrNull(1).isNullOrEmpty()) err("lỗi thiếu =>"); c.mis.add(UMis(wr[0], wr.getOrNull(1) ?: "", p.getOrElse(1) { "" }, p.getOrElse(2) { "" })) }
                    '=' -> c.col.addAll(rest.split(Regex("\\s*,\\s*")).filter { it.isNotEmpty() })
                    '>' -> c.lessons.addAll(rest.split(Regex("\\s*,\\s*")).filter { it.isNotEmpty() })
                    '~' -> { val p = split(rest); c.reg.add(UReg(p[0], p.getOrElse(1) { "" }, p.getOrElse(2) { "" })) }
                    '?' -> c.quiz.add(rest)
                    'f' -> c.f = rest
                    'k' -> c.k.addAll(rest.split(Regex("\\s*,\\s*")).map { norm(it) }.filter { it.isNotEmpty() })
                    '^' -> c.pos.addAll(rest.split(Regex("[\\s,]+")).filter { it.isNotEmpty() })
                    '&' -> c.rel.addAll(rest.split(Regex("\\s*,\\s*")).map { norm(it) }.filter { it.isNotEmpty() })
                    else -> err("ký hiệu lạ: $tag")
                }
            }
            return out to errors
        }
    }

    private val cache = HashMap<String, List<UEntry>>()
    fun has(kind: String) = src.containsKey(kind)
    fun load(kind: String): List<UEntry> { cache[kind]?.let { return it }; if (!has(kind)) return emptyList(); return parse(kind, src[kind]).first.also { cache[kind] = it } }
    fun list(kind: String, sub: String? = null): List<UEntry> = load(kind).filter { sub.isNullOrEmpty() || it.sub == sub }
    fun byId(kind: String, id: String): UEntry? = load(kind).firstOrNull { it.key == id }
    /** Words an entry covers: its key + item heads (adverbs, pairs) + structure keywords. */
    fun words(e: UEntry): List<String> {
        val w = LinkedHashSet<String>()
        if (e.kind == "p" || e.kind == "v" || e.kind == "a") w.add(norm(e.key))
        if (e.kind == "a") e.items.forEach { x -> val h = norm(x.h); if (Regex("^[a-z][a-z' -]*$").matches(h) && h.split(" ").size <= 2) w.add(h) }
        if (e.kind == "c") e.items.forEach { x -> w.add(norm(x.h.replace(Regex("\\s*\\(.*\\)$"), ""))) }
        if (e.kind == "s") w.addAll(e.k)
        return w.toList()
    }
    /** Is the word covered by the data (drives the "Cách dùng" button of the dictionary page)? */
    fun hasWord(word: String): Boolean = wordIdx.containsKey(word)
    fun chunksOf(key: String): String = (wordIdx[key] ?: "") + (idIdx[key] ?: "")
    fun counts(): Map<String, Pair<Int, Int>> = KINDS.associateWith { k -> val es = load(k); es.size to es.sumOf { it.items.size } }
    val indexSizes get() = wordIdx.size to idIdx.size

    /** Inflected/typed form -> an index key (interests -> interest, relied -> rely, "depend on" -> depend); null = not covered. */
    fun resolve(q: String?): String? {
        val s = norm(q).replace(Regex("^to\\s+"), "").replace(Regex("[.?!,;:\"“”]+$"), "")
        if (s.isEmpty()) return null
        if (wordIdx.containsKey(s) || idIdx.containsKey(s)) return s
        val cands = ArrayList<String>()
        fun add(x: String) { if (x.isNotEmpty()) cands.add(x) }
        if (verbs != null && Regex("^[a-z]+$").matches(s)) { val r = verbs.resolve(s); val b = r?.get("base")?.s(); if (!b.isNullOrEmpty()) cands.add(b) }
        if (s.endsWith("ies")) add(s.dropLast(3) + "y")
        if (s.endsWith("ied")) add(s.dropLast(3) + "y")
        if (s.endsWith("es")) add(s.dropLast(2))
        if (s.endsWith("s")) add(s.dropLast(1))
        if (s.endsWith("ed")) { add(s.dropLast(2)); add(s.dropLast(1)); if (Regex("(.)\\1ed$").containsMatchIn(s)) add(s.dropLast(3)) }
        if (s.endsWith("ing")) { add(s.dropLast(3)); add(s.dropLast(3) + "e"); if (Regex("(.)\\1ing$").containsMatchIn(s)) add(s.dropLast(4)) }
        if (Regex("\\s").containsMatchIn(s)) { val f = s.split(" ")[0]; add(f); if (f.endsWith("s")) add(f.dropLast(1)); if (f.endsWith("ed")) { add(f.dropLast(2)); add(f.dropLast(1)) } }
        for (c in cands) if (wordIdx.containsKey(c) || idIdx.containsKey(c)) return c
        return null
    }
    fun suggest(q: String?, n: Int = 8): List<String> {
        val s = norm(q); if (s.isEmpty()) return emptyList()
        val keys = wordIdx.keys; val r = resolve(s)
        val a = keys.filter { it.startsWith(s) }.sortedWith { x, y -> if (x.length != y.length) x.length - y.length else x.compareTo(y) }
        val b = keys.filter { !it.startsWith(s) && it.contains(s) }.sortedBy { it.length }
        return LinkedHashSet<String>().apply { if (r != null && wordIdx.containsKey(r)) add(r); addAll(a); addAll(b) }.toList().take(n)
    }
    /** Typo-tolerant matches: edit distance <= 2, closest first. */
    fun near(q: String?, n: Int = 6): List<String> {
        val s = norm(q)
        fun d(a: String, b: String): Int {
            if (Math.abs(a.length - b.length) > 2) return 9
            val m = Array(a.length + 1) { IntArray(b.length + 1) }
            for (i in 0..a.length) m[i][0] = i
            for (j in 0..b.length) m[0][j] = j
            for (i in 1..a.length) for (j in 1..b.length) m[i][j] = minOf(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (if (a[i - 1] == b[j - 1]) 0 else 1))
            return m[a.length][b.length]
        }
        return wordIdx.keys.map { it to d(s, it) }.filter { it.second <= 2 }.sortedBy { it.second }.take(n).map { it.first }
    }
    fun lookup(key: String?): ULookup {
        val k = norm(key)
        return ULookup(k, KINDS.associateWith { kind -> load(kind).filter { e -> norm(e.key) == k || words(e).contains(k) } })
    }

    // ---------- quick quiz ----------
    private fun lastWord(h: String) = norm(h).split(" ").last()
    private fun verbAlts(code: String, ans: String): List<String>? {
        val v = verbs ?: return null; val a = norm(ans)
        if ((code == "to" || code == "oto") && Regex("^to [a-z]+$").matches(a)) { val b = a.substring(3); return listOf(v.forms(b).ing[0].w, b) }
        if (code == "ing" && Regex("^[a-z]+ing$").matches(a)) { val r = v.resolve(a); if (r == null || r["from"].s() != "ing") return null; return listOf("to " + r["base"].s(), r["base"].s()) }
        if ((code == "obare" || code == "bare") && Regex("^[a-z]+$").matches(a)) { val f = v.forms(a); return listOf("to $a", f.ing[0].w) }
        return null
    }
    /** Every practice question of an entry: from `[answer|alts]` examples; prepositions get generated distractors; hand-written `?` lines. */
    fun quizItems(e: UEntry): List<UQuiz> {
        val out = ArrayList<UQuiz>(); val codes = e.items.map { it.h }.toSet()
        val amb = mapOf("to" to listOf("ing", "bare"), "ing" to listOf("to"), "bare" to listOf("to", "oto"), "oto" to listOf("obare", "oing"), "obare" to listOf("oto", "oing"))
        fun push(ex: UExample, item: UItem?, alts: List<String>?) {
            if (ex.ans.isEmpty() || alts.isNullOrEmpty()) return
            val ch = (listOf(ex.ans) + alts).distinct(); if (ch.size < 2) return
            out.add(UQuiz(ex.pre, ex.ans, ex.post, ch, e.key, e.kind, item))
        }
        e.items.forEach { item -> item.ex.forEach { s ->
            val ex = example(s)
            if (ex.alts.isNotEmpty()) { push(ex, item, ex.alts); return@forEach }
            if (e.kind == "p") { val own = e.items.map { lastWord(it.h) }.toSet(); push(ex, item, QUIZ_PREPS.filter { !own.contains(it) && it != norm(ex.ans) }.take(6)); return@forEach }
            if (e.kind == "v" && (amb[item.h] ?: emptyList()).none { codes.contains(it) }) push(ex, item, verbAlts(item.h, ex.ans))
        } }
        (e.ex + e.quiz).forEach { s -> val ex = example(s); if (ex.alts.isNotEmpty()) push(ex, null, ex.alts) }
        return out
    }
    /** JS `x = (x * 1664525 + 1013904223) >>> 0; x / 2^32` */
    class Rng(seed: Long) { private var x: Long = (seed and 0xFFFFFFFFL).let { if (it == 0L) 1L else it }
        fun next(): Double { x = (x * 1664525L + 1013904223L) and 0xFFFFFFFFL; return x / 4294967296.0 } }
    private fun <T> shuffle(arr: List<T>, r: Rng): List<T> { val a = arr.toMutableList(); for (i in a.size - 1 downTo 1) { val j = Math.floor(r.next() * (i + 1)).toInt(); val t = a[i]; a[i] = a[j]; a[j] = t }; return a }
    /** `n` questions spread across the entries, answers + 3 shuffled distractors (reproducible for a given seed). */
    fun quiz(entries: List<UEntry>, n: Int = 5, seed: Long = System.currentTimeMillis()): List<UQuiz> {
        val r = Rng(seed); val all = ArrayList<UQuiz>()
        for (e in entries) all.addAll(quizItems(e))
        val picked = ArrayList<UQuiz>(); val seen = HashSet<String>()
        for (q in shuffle(all, r)) { val k = q.key + "|" + q.pre + q.ans; if (!seen.add(k)) continue; picked.add(q) }
        val byKey = LinkedHashMap<String, MutableList<UQuiz>>(); picked.forEach { byKey.getOrPut(it.key) { ArrayList() }.add(it) }
        val res = ArrayList<UQuiz>(); var round = 0
        while (res.size < n && byKey.values.any { it.size > round }) { for (l in byKey.values) if (l.size > round && res.size < n) res.add(l[round]); round++ }
        return res.map { q -> UQuiz(q.pre, q.ans, q.post, shuffle(listOf(q.ans) + shuffle(q.choices.filter { it != q.ans }, r).take(3), r), q.key, q.kind, q.item) }
    }
    /** Stable id of a question -> its explanation file. */
    fun xid(q: UQuiz): String = "${q.kind}|${q.key}|${q.item?.h ?: ("@" + q.ans)}"
}
