package com.lexkite.app.core.vocab

import com.lexkite.app.core.sync.Js
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** #/mistakes: the mistake notebook. Port of web/js/plan.js (logMistake, migrate, mistakeView, list/tabs/retry/settle). The list lives in Store 'mistakes' (device only). */
object Mistakes {
    const val LISTEN_Q = "Gõ lại từ bạn nghe được"
    const val MEANING_Q = "Nghĩa của “{word}”?"
    val KINDS = listOf("vocab", "grammar", "reading", "listening")
    private val LZ = listOf("q", "given", "explain")
    /** Templates of old records that stored translated text (plan.js MK). */
    private val MK = listOf("{title} – câu {n}: {q}", "{title} – Câu {n}: {q}", "Test {t} – Câu {n}: {q}", "Thi thử – câu {n}: {q}", "Từ tiếng Anh nghĩa là “{vi}”?", "Điền từ: {sentence}", "Nghĩa của “{word}”?", "Gõ lại từ bạn nghe được", "(bỏ trống)", "Nghe: “…{cue}…”", "Tham khảo: “…{cue}…”")

    private fun vars(v: Any?): Map<String, String>? = (v as? JsonObject)?.mapValues { it.value.s() }
    private fun tr(x: JsonObject, f: String, t: Tx): String { val k = x[f + "K"] as? JsonObject; return if (Js.truthy(k)) t.t(k.gs("k"), vars(k?.get("v"))) else x.gs(f) }

    /** App.logMistake(m): same key -> updated in place (n+1, at=now, reopened), new key -> first; list cut to 300. `q/given/explain` may be `{k,v}` objects (stored as `<f>K` + translated text). */
    fun log(list: List<JsonObject>, m0: JsonObject, now: Long, t: Tx = Tx.RAW): List<JsonObject> {
        var m = m0
        for (f in LZ) { val x = m0[f]; if (x is JsonObject) m = m.cp(f + "K" to x, f to t.t(x.gs("k"), vars(x["v"]))) }
        val qk = m["qK"] as? JsonObject
        val key = m.gs("kind") + "|" + (if (qk != null) qk.gs("k") + (qk["v"]?.let { Js.stringify(it) } ?: "undefined") else if (m["q"] == null) "undefined" else m.gs("q"))
        val out = ArrayList(list)
        val i = out.indexOfFirst { it.gs("key") == key }
        if (i >= 0) { val o = out[i]; out[i] = o.cp("n" to (if (o.gt("n")) o.gn("n") else 1.0) + 1, "at" to now, "fixed" to false) }
        else out.add(0, m.cp("key" to key, "n" to 1, "at" to now, "fixed" to false))
        return out.take(300)
    }

    private fun isEn(s: String) = Regex("[a-z]{2}", RegexOption.IGNORE_CASE).containsMatchIn(s) && Regex("^[\\x20-\\x7E‘’“”–—…]+$").matches(s) && !Regex("_{2,}").containsMatchIn(s)
    private fun normS(s: String?) = WS_RUN.replace((s ?: "").lowercase(), " ").jsTrim()

    class View(val q: String, val qSay: String, val qIpa: String, val given: String, val ans: String, val ansSay: String, val ansIpa: String, val tip: String) {
        fun json() = jo("q" to q, "qSay" to qSay, "qIpa" to qIpa, "given" to given, "ans" to ans, "ansSay" to ansSay, "ansIpa" to ansIpa, "tip" to tip)
    }
    /** App.mistakeView(x): what one card shows - one IPA + one speaker per word, the answer row, and the explanation minus what is already shown. */
    fun view(x: JsonObject, t: Tx = Tx.RAW): View {
        val ref = x.gs("ref")
        val word = if (x.gs("kind") == "vocab" && ref.isNotEmpty() && Regex("^[a-z][a-z' .-]*$", RegexOption.IGNORE_CASE).matches(ref)) ref else ""
        val ans = x.gs("answer").jsTrim()
        var q = tr(x, "q", t); val qkObj = x["qK"] as? JsonObject; var qK = qkObj?.gs("k")
        val qW = if (qK == MEANING_Q) qkObj.go("v").gs("word") else ""
        if (qW.isNotEmpty() && normS(qW) == normS(ans)) { qK = LISTEN_Q; q = t.t(LISTEN_Q, null) }
        var qSay = ""; var qIpa = ""; var ansSay = ""; var ansIpa = ""
        val given = if (x.gt("given")) tr(x, "given", t) else ""
        val en = ans.isNotEmpty() && isEn(ans); val short = x.gs("kind") == "vocab" && WS_RUN.split(ans).size <= 3
        if (qK == LISTEN_Q) { qSay = word.ifEmpty { if (en) ans else "" }; if (en && short) ansIpa = ans }
        else if (qW.isNotEmpty()) { qSay = qW; qIpa = qW }
        else if (en) { ansSay = ans; if (short) ansIpa = ans }
        var tip = tr(x, "explain", t).jsTrim()
        val auto = if (word.isNotEmpty()) Regex("^" + Regex.escape(word) + "\\s*(/[^/]*/)?\\s*=\\s*([\\s\\S]+)$", RegexOption.IGNORE_CASE).find(tip) else null
        if (auto != null) tip = auto.groupValues[2].jsTrim()
        val shown = normS(listOf(q, given, ans).joinToString(" | "))
        if (tip.isNotEmpty() && (normS(tip) == normS(ans) || (auto != null && shown.contains(normS(tip))))) tip = ""
        return View(q, qSay, qIpa, given, ans, ansSay, ansIpa, tip)
    }

    /** plan.js unkey: recover `{k,v}` from translated text. `patternsOf(k)` = the known spellings of template k in other languages (the template itself is always tried first). */
    fun unkey(s: String, patternsOf: (String) -> List<String> = { emptyList() }): JsonObject? {
        for (k in MK) for (pat in (listOf(k) + patternsOf(k)).distinct()) {
            val names = ArrayList<String>(); val sb = StringBuilder("^"); var pos = 0
            for (m in Regex("\\{(\\w+)\\}").findAll(pat)) { sb.append(Regex.escape(pat.substring(pos, m.range.first))); names.add(m.groupValues[1]); sb.append("([\\s\\S]*?)"); pos = m.range.last + 1 }
            sb.append(Regex.escape(pat.substring(pos))).append("$")
            val mt = Regex(sb.toString()).find(s) ?: continue
            val v = LinkedHashMap<String, String>(); names.forEachIndexed { i, n -> v[n] = mt.groupValues[i + 1] }
            return jo("k" to k, "v" to v)
        }
        return null
    }
    /** Fill missing `<f>K` of legacy records. Returns the new list and the changed records (the caller writes the list back when non-empty). */
    fun migrate(list: List<JsonObject>, patternsOf: (String) -> List<String> = { emptyList() }): Pair<List<JsonObject>, List<JsonObject>> {
        val changed = ArrayList<JsonObject>()
        val out = list.map { x ->
            var o = x
            for (f in LZ) { val v = o[f]; if (v is JsonPrimitive && v.isString && !Js.truthy(o[f + "K"])) { val u = unkey(v.content, patternsOf); if (u != null) o = o.cp(f + "K" to u) } }
            if (o !== x) changed.add(o)
            o
        }
        return out to changed
    }

    fun openOnes(list: List<JsonObject>) = list.filter { !it.gt("fixed") }
    /** Tab counts: key "all" + one per kind. */
    fun counts(open: List<JsonObject>): Map<String, Int> = linkedMapOf("all" to open.size).also { m -> for (k in KINDS) m[k] = open.count { it.gs("kind") == k } }
    /** Rows of one tab (kind "" = all). Retry mode: most-failed first (stable). */
    fun rows(open: List<JsonObject>, kind: String, retry: Boolean): List<JsonObject> {
        val r = open.filter { kind.isEmpty() || it.gs("kind") == kind }
        return if (retry) r.sortedByDescending { if (it.gt("n")) it.gn("n") else 1.0 } else r
    }
    /** Retry mode shows a text box when the answer has <= 4 words, else a reveal button. */
    fun shortAnswer(x: JsonObject) = WS_RUN.split(x.gs("answer")).size <= 4
    /** Typed retry check: QE.norm when the exam engine is loaded (native always). */
    fun typedOk(typed: String, answer: String) = Qe.norm(typed) == Qe.norm(answer)

    /** settle(card, key, ok): ok -> fixed (+3 XP) else n+1. Returns the new list and the XP to reward. */
    fun settle(list: List<JsonObject>, key: String, ok: Boolean): Pair<List<JsonObject>, Int> =
        list.map { x -> if (x.gs("key") != key) x else if (ok) x.cp("fixed" to true) else x.cp("n" to (if (x.gt("n")) x.gn("n") else 1.0) + 1) }.let { it to (if (ok && list.any { x -> x.gs("key") == key }) 3 else 0) }
    /** "Đã hiểu": fixed (+2 XP). */
    fun fix(list: List<JsonObject>, key: String): Pair<List<JsonObject>, Int> = list.map { x -> if (x.gs("key") == key) x.cp("fixed" to true) else x } to 2
    fun clearFixed(list: List<JsonObject>) = list.filter { !it.gt("fixed") }
}
