package com.lexkite.app.core.dict

/**
 * The "Hiểu sâu" block of a word (web/js/wordcard.js): hand-written notes `js/notes/<letter>.json` -> `{m: mnemonic, e: mistakes, u: exam use, f: family}`.
 * Port of the parsers: wrong -> right pairs, family chips, exam-tagged lines. The explanations are Vietnamese learning content shown as authored.
 */
object DeepNotes {
    class Pair(val wrong: String, val right: String, val wrongNote: String, val rightNote: String)
    class Errors(val pairs: List<Pair>, val notes: List<String>)
    /** [word] null = plain text chip ([text]). */
    class Family(val word: String?, val pos: String, val text: String)
    class Usage(val tag: String, val text: String)

    private val VI = Regex("[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]", RegexOption.IGNORE_CASE)
    fun isVi(s: String) = VI.containsMatchIn(s)

    private const val WRONG = "(?:(?:phát âm|nhấn(?: âm)?|viết|chính tả|dùng|ngữ pháp)\\s+)?sai|nhầm|wrong|incorrect|mistake|✗|❌|×"
    private const val RIGHT = "đúng|thường dùng|nên dùng|nên nói|right|correct|better|✓|✅"
    private val LBL = Regex("(^|[\\s.;!?(])(?:$WRONG)\\s*:", RegexOption.IGNORE_CASE)
    private val WL = Regex("^(?:$WRONG)\\s*:\\s*", RegexOption.IGNORE_CASE)
    private val RL = Regex("^(?:$RIGHT)\\s*:\\s*", RegexOption.IGNORE_CASE)
    private val ARROW = Regex("\\s*(?:→|->|=>|⇒)\\s*")
    private val TAIL = Regex("^(.*\\S)\\s*(\\([^()]*\\))$")
    private val EXAM = Regex("^((?:IELTS|TOEIC|TOEFL|VSTEP)?\\s*(?:(?:Academic |General )?(?:Writing|Speaking|Listening|Reading)(?:\\s+(?:Task|Part)\\s*\\d(?:\\s*[/&-]\\s*\\d)?)?|Part\\s*\\d|Task\\s*\\d)|IELTS|TOEIC|TOEFL|VSTEP)\\s*[:–-]?\\s*", RegexOption.IGNORE_CASE)

    /** "analyse the data (không dùng about)" -> ("analyse the data", "(không dùng about)") */
    internal fun tail(s0: String): kotlin.Pair<String, String> {
        val s = s0.trim()
        TAIL.find(s)?.let { m -> val a = m.groupValues[1]; val b = m.groupValues[2]; if (isVi(b) && !isVi(a)) return a to b }
        return s to ""
    }
    internal fun sentences(s: String): List<String> =
        s.replace(Regex("([.!?])\\s+"), "$1\u0000").split('\u0000').map { it.trim().replace(Regex("^[.;,\\s]+"), "") }.filter { it.replace(Regex("[.;\\s]"), "").length > 1 }

    /** End of the correct sentence inside [s] (the rest is a Vietnamese explanation). */
    internal fun rightEnd(s: String): Int {
        var d = 0; var i = 0
        while (i < s.length) {
            val ch = s[i]
            if (ch == '(') d++ else if (ch == ')') d = maxOf(0, d - 1)
            else if (d == 0 && ch in ".?!…;") {
                var j = i; while (j < s.length && s[j] in ".?!…;") j++
                if (j < s.length && !s[j].isWhitespace()) { i = j; continue }
                val next = s.substring(j).trimStart()
                val abbr = Regex("(?:^|\\s)(?:Mr|Mrs|Ms|Dr|St|vs|etc|e\\.g|i\\.e)$", RegexOption.IGNORE_CASE).containsMatchIn(s.substring(0, i))
                val firstChunk = next.split(Regex("[.?!]"))[0]
                if (ch == ';' || (!abbr && (Regex("^[A-ZĐ]").containsMatchIn(next) || isVi(firstChunk)))) return if (ch == ';' || (ch == '.' && j - i == 1)) i else j
                i = j; continue
            }
            i++
        }
        return s.length
    }
    private fun unq(s: String) = s.replace(Regex("^[\"'“‘]|[\"'”’]$"), "")

    fun parseErrors(text: String): Errors {
        val s = text.trim(); val pairs = ArrayList<Pair>(); val notes = ArrayList<String>()
        if (s.isEmpty()) return Errors(pairs, notes)
        val cuts = LBL.findAll(s).map { it.range.first + it.groupValues[1].length }.toList()
        if (cuts.isEmpty()) return Errors(emptyList(), listOf(s))
        notes += sentences(s.substring(0, cuts[0]))
        cuts.forEachIndexed { i, c ->
            val raw = s.substring(c, if (i + 1 < cuts.size) cuts[i + 1] else s.length)
            val seg = raw.replace(WL, "")
            val a = ARROW.find(seg)
            if (a == null) { notes += sentences(raw); return@forEachIndexed }
            val rest = seg.substring(a.range.last + 1).replace(RL, "")
            val e = minOf(rightEnd(rest), rest.length)
            var rt = rest.substring(0, e).trim { it.isWhitespace() || it == ';' }
            if (rt.endsWith(".") && !rt.endsWith("..")) rt = rt.dropLast(1)
            val (w, wn) = tail(seg.substring(0, a.range.first)); val (r, rn) = tail(rt)
            if (w.isEmpty() || r.isEmpty()) { notes += sentences(raw); return@forEachIndexed }
            pairs.add(Pair(unq(w), unq(r), wn, rn))
            notes += sentences(rest.substring(e))
        }
        return if (pairs.isEmpty()) Errors(emptyList(), listOf(s)) else Errors(pairs, notes)
    }

    /** "curriculum (n), curricula (pl)" -> chips; commas inside brackets do not split. */
    fun parseFamily(text: String, head: String): List<Family> {
        val parts = ArrayList<String>(); var cur = StringBuilder(); var depth = 0
        for (ch in text) {
            if (ch == '(') depth++
            if (ch == ')') depth = maxOf(0, depth - 1)
            if ((ch == ',' || ch == ';') && depth == 0) { parts.add(cur.toString()); cur = StringBuilder() } else cur.append(ch)
        }
        parts.add(cur.toString())
        val h = head.lowercase(); val re = Regex("^(.+?)\\s*(?:\\(([^()]*)\\))?\\.?$")
        val out = ArrayList<Family>()
        parts.forEachIndexed { idx, p0 ->
            val p = p0.trim(); if (p.isEmpty()) return@forEachIndexed
            var f = Family(null, "", p)
            re.find(p)?.let { m -> val w = m.groupValues[1].trim(); if (!isVi(w) && w.length <= 40) f = Family(w, m.groupValues[2].trim(), "") }
            if (idx == 0 && f.word != null && f.word!!.lowercase() == h) return@forEachIndexed
            out.add(f)
        }
        return out
    }

    fun parseUsage(text: String): List<Usage> = sentences(text).map { x ->
        val m = EXAM.find(x)
        if (m != null && m.groupValues[1].trim().isNotEmpty() && x.length > m.value.length) Usage(m.groupValues[1].trim(), x.substring(m.value.length)) else Usage("", x)
    }

    /** Which letter file (`js/notes/<c>.json`) holds a word. */
    fun file(word: String): String { val c = word.lowercase().firstOrNull(); return if (c != null && c in 'a'..'z') c.toString() else "_" }
}
