package com.lexkite.app.core.interpret

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import java.text.BreakIterator
import java.util.Locale

/** Interpreter (#/interpret) pure core – a port of web/cpack/interpret/core.js (same rules, same stored shape `lk.interp.v1`). No Android, no network: JVM-testable. */
object Interpret {
    /** UI language → recogniser / voice locale (web `LOC`). */
    val LOC: Map<String, String> = linkedMapOf("en" to "en-US", "vi" to "vi-VN", "es" to "es-ES", "pt" to "pt-BR", "fr" to "fr-FR", "de" to "de-DE", "id" to "id-ID", "th" to "th-TH", "zh" to "zh-CN", "ja" to "ja-JP", "ko" to "ko-KR", "hi" to "hi-IN", "ar" to "ar-SA", "ru" to "ru-RU", "tr" to "tr-TR")
    val CODES: List<String> = LOC.keys.toList()
    const val MAX_CONV = 30
    const val MAX_TURN = 200
    /** A detected language this sure (or more) decides who spoke. */
    const val SURE = 0.6

    fun base(l: String?): String = l.orEmpty().lowercase().substringBefore('-').let { if (it == "iw") "he" else if (it == "in") "id" else it }
    fun ok(l: String?): Boolean = base(l) in CODES
    fun rtl(l: String?): Boolean = base(l) == "ar"

    /** The pair of the two people: [a] sits at the bottom, [b] at the top (turned 180°). */
    data class Pair2(val a: String, val b: String)
    fun defaultPair(me: String): Pair2 { val a = if (ok(me)) base(me) else "en"; return Pair2(a, if (a == "en") "es" else "en") }
    /** A stored / picked pair → a valid one (both known, different); anything else → [defaultPair]. */
    fun fixPair(a: String?, b: String?, me: String): Pair2 = if (ok(a) && ok(b) && base(a) != base(b)) Pair2(base(a), base(b)) else defaultPair(me)
    /** Picking [lang] for [side] ("a"|"b"): when it equals the other side's, the two swap (web `onchange`). */
    fun pick(p: Pair2, side: String, lang: String): Pair2 {
        val l = base(lang); if (!ok(l)) return p
        return if (side == "a") (if (l == p.b) Pair2(l, p.a) else Pair2(l, p.b)) else (if (l == p.a) Pair2(p.b, l) else Pair2(p.a, l))
    }
    fun other(side: String) = if (side == "a") "b" else "a"
    fun lang(p: Pair2, side: String) = if (side == "a") p.a else p.b

    data class Detected(val lang: String, val confidence: Double)
    /** Who spoke? [side] = whose mic was tapped; a sure detection that belongs to exactly one side of the pair names the speaker (the other person borrowed the mic). */
    fun speaker(det: Detected?, p: Pair2, side: String): String {
        val d = det?.let { base(it.lang) }; val c = det?.confidence ?: 0.0
        if (!d.isNullOrEmpty() && c >= SURE) { if (d == base(p.a)) return "a"; if (d == base(p.b)) return "b" }
        return side
    }

    data class Turn(val from: String, val src: String, val dst: String, val tx: String, val ts: Long)
    data class Conv(val id: String, val t: Long, val a: String, val b: String, val turns: List<Turn> = emptyList())
    data class History(val convs: List<Conv> = emptyList())

    /** Stored shape = the web's `lk.interp.v1`: {convs:[{id,t,a,b,turns:[{from,src,dst,tx,ts}]}]}; anything unreadable = empty. */
    fun parse(s: String?): History = runCatching {
        History((Json.parseToJsonElement(s.orEmpty()).jsonObject["convs"] as JsonArray).map { e -> val c = e.jsonObject
            Conv(c.getValue("id").jsonPrimitive.content, c.getValue("t").jsonPrimitive.long, c.getValue("a").jsonPrimitive.content, c.getValue("b").jsonPrimitive.content,
                (c["turns"] as? JsonArray).orEmpty().map { x -> val o = x.jsonObject; Turn(o.getValue("from").jsonPrimitive.content, o.getValue("src").jsonPrimitive.content, o.getValue("dst").jsonPrimitive.content, o.getValue("tx").jsonPrimitive.content, o.getValue("ts").jsonPrimitive.long) }) })
    }.getOrDefault(History())
    fun encode(h: History): String = JsonObject(mapOf("convs" to JsonArray(h.convs.map { c ->
        JsonObject(mapOf("id" to JsonPrimitive(c.id), "t" to JsonPrimitive(c.t), "a" to JsonPrimitive(c.a), "b" to JsonPrimitive(c.b), "turns" to JsonArray(c.turns.map { t ->
            JsonObject(mapOf("from" to JsonPrimitive(t.from), "src" to JsonPrimitive(t.src), "dst" to JsonPrimitive(t.dst), "tx" to JsonPrimitive(t.tx), "ts" to JsonPrimitive(t.ts))) }))) }))).toString()

    /** Adds [turn] to conversation [id] (created first when new): newest conversation first, ≤ [MAX_CONV] conversations × [MAX_TURN] turns. */
    fun addTurn(h: History, id: String, p: Pair2, turn: Turn): History {
        val c = h.convs.find { it.id == id } ?: Conv(id, turn.ts, base(p.a), base(p.b))
        val turns = (c.turns + turn).let { if (it.size > MAX_TURN) it.drop(it.size - MAX_TURN) else it }
        val rest = h.convs.filter { it.id != id }
        // an existing conversation keeps its place (web mutates in place); a new one goes first
        val list = if (h.convs.any { it.id == id }) h.convs.map { if (it.id == id) c.copy(turns = turns) else it } else listOf(c.copy(turns = turns)) + rest
        return History(list.take(MAX_CONV))
    }

    /** Words worth learning from [texts] in [lang]: ≥ 4 letters (CJK / Thai: ≥ 2), no repeats of known words, most frequent then longest first. */
    fun keyWords(texts: List<String>, lang: String, n: Int = 8, known: Set<String> = emptySet()): List<String> {
        val l = base(lang); val seg = l in setOf("zh", "ja", "th"); val cnt = LinkedHashMap<String, Int>()
        for (tx in texts) {
            val ws = if (seg) segment(tx, l) else Regex("[\\p{L}\\p{M}]+").findAll(tx.lowercase()).map { it.value }.toList()
            for (w in ws) { if (w.codePointCount(0, w.length) < (if (seg) 2 else 4) || w in known) continue; cnt[w] = (cnt[w] ?: 0) + 1 }
        }
        return cnt.entries.withIndex().sortedWith(compareBy<IndexedValue<Map.Entry<String, Int>>>({ -it.value.value }, { -it.value.key.codePointCount(0, it.value.key.length) }, { it.index })).map { it.value.key }.take(n)
    }
    private fun segment(s: String, l: String): List<String> {
        val it = BreakIterator.getWordInstance(Locale.forLanguageTag(l)); it.setText(s); val out = ArrayList<String>(); var a = it.first(); var b = it.next()
        while (b != BreakIterator.DONE) { val w = s.substring(a, b); if (w.any { c -> Character.isLetterOrDigit(c) }) out.add(w); a = b; b = it.next() }
        return out
    }

    /** A card of the recap: [word] = the foreign phrase, [def] = its meaning in the learner's language, [lang] = the foreign language. */
    data class Card(val word: String, val def: String, val lang: String)
    /** The turns whose phrase is in a language OTHER than [me] (the learner's), with the meaning in [me]; no repeats. */
    fun cards(conv: Conv, me: String): List<Card> {
        val m = base(me); val out = ArrayList<Card>(); val seen = HashSet<String>()
        for (t in conv.turns) {
            val srcL = if (t.from == "a") conv.a else conv.b; val dstL = if (t.from == "a") conv.b else conv.a
            val (w, d, wl) = if (srcL == m) Triple(t.tx, t.src, dstL) else Triple(t.src, t.tx, srcL)
            if (wl == m || w.isEmpty() || !seen.add(w)) continue
            out.add(Card(w, d, wl))
        }
        return out
    }

    /** Pronunciation score 0..100 of the learner's say-back: the best of the recogniser's alternatives vs [expected] (Unicode-aware, any script: letters/digits only, case-folded, Levenshtein over code points). */
    fun score(expected: String, heard: List<String>): Pair<Int, String> {
        val best = heard.maxByOrNull { sim(it, expected) } ?: return 0 to ""
        return Math.floor(sim(best, expected) * 100 + 0.5).toInt() to best
    }
    private fun clean(s: String): IntArray = s.lowercase().codePoints().filter { Character.isLetterOrDigit(it) }.toArray()
    fun sim(a: String, b: String): Double {
        val x = clean(a); val y = clean(b)
        if (x.isEmpty() && y.isEmpty()) return 1.0
        var prev = IntArray(y.size + 1) { it }
        for (i in 1..x.size) { val cur = IntArray(y.size + 1); cur[0] = i; for (j in 1..y.size) cur[j] = minOf(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + if (x[i - 1] == y[j - 1]) 0 else 1); prev = cur }
        return 1.0 - prev[y.size].toDouble() / maxOf(x.size, y.size)
    }

    /** Travel phrasebook (generated native/shared/gen/interpret/phrases.json from web/cpack/interpret/phrases.js): groups in [order]; each item = the same sentence in every language. */
    class Phrases(val order: List<String>, val items: List<Pair<String, Map<String, String>>>) {
        fun group(g: String) = items.filter { it.first == g }.map { it.second }
    }
    fun parsePhrases(s: String): Phrases? = runCatching {
        val o = Json.parseToJsonElement(s).jsonObject
        Phrases(o["order"]!!.jsonArray.map { it.jsonPrimitive.content }, o["items"]!!.jsonArray.map { e -> val a: JsonArray = e.jsonArray; a[0].jsonPrimitive.content to (a[1] as JsonObject).mapValues { it.value.jsonPrimitive.content } })
    }.getOrNull()
}
