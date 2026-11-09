package com.lexkite.app.core.speak

import com.lexkite.app.core.skills.Part
import com.lexkite.app.core.skills.Qx
import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.skills.SkillsGame
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.vocab.Mistakes
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.jo
import com.lexkite.app.core.vocab.strs
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** One question group of a reading passage, to be done on its own (web rtype.js `units`). */
class RtypeUnit(val testId: String, val passageNo: Int, val title: String, val paras: List<Pair<String, String>>, val group: JsonObject, val gi: Int, val kind: String) {
    val id get() = "$testId:$passageNo:$gi"
    /** The group as a grading unit (the P06 grader takes a part-shaped object). */
    val part: Part = Part(jo("id" to id, "test" to 0, "part" to 0, "title" to title, "groups" to listOf(group)))
    val size get() = part.qNums.size
}

/** #/rtype (web rtype.js): practise one reading question type across all the tests. The reading-test pack is injected (P09 pack shape: `{tests:[{id, passages:[{n, title, paras:[{k,t}], groups}]}], explain:{<test>:{<n>:{why}}}}`). */
object Rtype {
    const val GOAL = 75
    class Kind(val id: String, val emoji: String, val title: Tr, val tip: Tr)
    val KINDS = listOf(
        Kind("completion", "✏️", Tr("Điền từ (summary/sentence/note/table)"), Tr("Đọc câu hỏi, đoán loại từ cần điền, tìm từ khóa đồng nghĩa trong bài; chép đúng chính tả và giới hạn số từ.")),
        Kind("tfng", "✔️", Tr("TRUE / FALSE / NOT GIVEN"), Tr("FALSE = bài nói NGƯỢC lại; NOT GIVEN = bài KHÔNG nhắc tới. Đừng dùng hiểu biết bên ngoài.")),
        Kind("ynng", "💭", Tr("YES / NO / NOT GIVEN"), Tr("Giống TFNG nhưng hỏi về QUAN ĐIỂM của tác giả – chú ý từ thể hiện thái độ.")),
        Kind("mcq", "🔘", Tr("Trắc nghiệm A–D"), Tr("Loại trừ phương án dùng từ y hệt bài nhưng sai nghĩa; đáp án đúng thường là paraphrase.")),
        Kind("multi", "☑️", Tr("Chọn 2 đáp án"), Tr("Đọc kỹ cả 5 phương án; 2 đáp án thường nằm ở các câu gần nhau trong bài.")),
        Kind("headings", "🏷️", Tr("Nối tiêu đề (Matching headings)"), Tr("Đọc câu chủ đề + câu cuối mỗi đoạn; chọn tiêu đề khái quát ý CHÍNH, không phải chi tiết.")),
        Kind("info", "📍", Tr("Tìm đoạn chứa thông tin"), Tr("Thông tin có thể nằm ở bất kỳ đâu, một đoạn có thể dùng nhiều lần – quét từ khóa cụ thể (số, tên, ví dụ).")),
        Kind("features", "👤", Tr("Nối đặc điểm (người/nhóm ↔ nhận định)"), Tr("Gạch chân tên riêng trong bài trước, rồi đọc kỹ quanh mỗi tên.")))
    fun kind(id: String?) = KINDS.find { it.id == id }
    fun kindOf(g: JsonObject): String { val t = g.gs("type")
        if (t == "tfng" || t == "ynng" || t == "mcq" || t == "multi") return t
        if (t == "match") { val opts = g.strs("options"); return if (opts.map { Qx.code(it) }.any { Regex("^[ivx]+$", RegexOption.IGNORE_CASE).matches(it) }) "headings" else if (opts.all { Qx.label(it).isEmpty() }) "info" else "features" }
        return "completion" }

    class Pack(val units: List<RtypeUnit>, val explain: JsonObject) {
        fun of(kind: String) = units.filter { it.kind == kind }
        companion object {
            fun parse(root: JsonObject): Pack = Pack(root.ga("tests").flatMap { t -> val to = t as JsonObject; to.ga("passages").flatMap { p -> val po = p as JsonObject
                po.ga("groups").mapIndexed { gi, g -> RtypeUnit(to.gs("id"), po.gn("n").toInt(), po.gs("title"), po.ga("paras").map { x -> (x as JsonObject).let { it.gs("k") to it.gs("t") } }, g as JsonObject, gi, kindOf(g)) } } }, root.go("explain") ?: JsonObject(emptyMap()))
        }
    }
    class Card(val kind: Kind, val chip: Tr, val reached: Boolean, val size: Tr, val bar: Int, val note: Tr)
    private fun stat(game: JsonElement?, kind: String): Pair<Int, Int> { val s = ((game as? JsonObject)?.get("rtype") as? JsonObject)?.go(kind); return s.gn("r").toInt() to s.gn("t").toInt() }
    /** The hub: one card per kind that has groups; % = right / total of `game.rtype[kind]`, goal 75 %. */
    fun hub(pack: Pack, game: JsonElement?): List<Card> = KINDS.mapNotNull { k ->
        val n = pack.of(k.id); if (n.isEmpty()) return@mapNotNull null
        val (r, t) = stat(game, k.id); val pct = if (t != 0) jsRound(r * 100.0 / t) else null
        Card(k, if (pct != null) Tr("{pct}% đúng", mapOf("pct" to pct)) else Tr("Chưa làm"), pct != null && pct >= GOAL, Tr("{q} câu · {g} nhóm", mapOf("q" to n.sumOf { it.size }, "g" to n.size)), pct ?: 0,
            if (pct == null) Tr("Bắt đầu luyện") else if (pct >= GOAL) Tr("Đã đạt mục tiêu – chuyển dạng tiếp theo") else Tr("Mục tiêu 75%"))
    }
    fun position(i: Int, n: Int) = Tr("Nhóm {i}/{n}", mapOf("i" to i + 1, "n" to n))
    val FINISHED_TITLE = "Đã làm hết dạng “{k}”"
    fun finished(kind: Kind): Tr = Tr(FINISHED_TITLE, mapOf("k" to kind.title))

    class Checked(val res: Map<Int, Qx.Res>, val right: Int, val total: Int, val pct: Int, val ok: Boolean, val result: Tr, val game: JsonElement, val mistakes: List<JsonObject>, val reward: Reward)
    /** "Kiểm tra": grade the group, add to `game.rtype[kind]` and `game.qstat["ir:<type>"]`, log the wrong ones, pay 5 + 2·right XP. */
    fun check(u: RtypeUnit, answers: Map<String, Any?>, game: JsonElement?, mistakes: List<JsonObject>, explain: JsonObject, now: Long, tx: Tx = Tx.RAW): Checked {
        val res = Qx.collect(u.part, answers); val right = res.values.count { it.ok }; val tot = res.size
        var g = SkillsGame.put(game, "rtype") { m -> val cur = m[u.kind] as? JsonObject; m[u.kind] = jo("r" to cur.gn("r").toInt() + right, "t" to cur.gn("t").toInt() + tot) }
        g = SkillsGame.qstat(g, "ir", Qx.tally(res.values), now)
        var list = mistakes
        for ((n, r) in res) if (!r.ok) list = Mistakes.log(list, jo("kind" to "reading", "q" to Tr("{title} – câu {n}: {q}", mapOf("title" to u.title, "n" to n.toString(), "q" to r.q)).json(), "answer" to r.answer,
            "given" to (if (r.given.isEmpty()) jo("k" to "(bỏ trống)") else r.given), "explain" to explain.go(u.testId).go(n.toString()).gs("why"), "ref" to ""), now, tx)
        val (cr, ct) = stat(g, u.kind); val pct = jsRound(cr * 100.0 / ct)
        return Checked(res, right, tot, pct, right.toDouble() / tot >= 0.75, Tr("<b>{r}/{n} câu đúng</b> · tỉ lệ tích lũy dạng này: {p}%", mapOf("r" to right, "n" to tot, "p" to pct)), g, list, Reward(mapOf("quizzes" to 1, "readings" to 1), 5 + right * 2))
    }
    /** The explanation of question [n] of a unit (`why`, paragraph letter, key phrases), or null. */
    fun explanation(pack: Pack, u: RtypeUnit, n: Int): JsonObject? = pack.explain.go(u.testId).go(n.toString())
}
