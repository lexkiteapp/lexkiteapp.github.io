package com.lexkite.app.core.speak

import com.lexkite.app.core.skills.Lexis
import com.lexkite.app.core.skills.Reward

/** ui.js wordRegex: a word with its inflections (recruit → recruited) or a whole phrase (the first word may inflect). */
object WordMatch {
    private fun reEsc(s: String) = s.replace(Regex("[.*+?^\${}()|\\[\\]\\\\]")) { "\\" + it.value }
    fun regex(word: String): Regex {
        val w = word.lowercase().trim()
        if (Regex("[\\s-]").containsMatchIn(w)) {
            val parts = w.split(Regex("\\s+")); val p0 = parts[0]
            val first = if (p0.length > 3) reEsc(p0.replace(Regex("(e|y)$"), "")) + "[a-z]*" else reEsc(p0)
            return Regex("\\b(" + (listOf(first) + parts.drop(1).map { reEsc(it) }).joinToString("\\s+") + ")\\b", RegexOption.IGNORE_CASE)
        }
        val stem = if (w.length > 4) w.replace(Regex("(e|y|s)$"), "") else w
        return Regex("\\b(" + reEsc(stem) + "[a-z]*)\\b", RegexOption.IGNORE_CASE)
    }
}

/** #/speaking (web speaking.js): Part 1 / 2 / 3 room – page state, the clocks, the analysis of an answer and the sample-answer shadowing. Time is an input. */
object SpeakingRoom {
    const val READ_DELAY_MS = 400L; const val TICK_MS = 250L; const val SHADOW_DEFAULT_RATE = 0.95; const val SLOW_RATE = 0.7
    const val P2_MAX_SECONDS = 120.0

    class Page(val part: String, val index: Int, val topic: SpeakTopic, val info: SpeakPart, val questions: List<String>) { val hash get() = "#/speaking/$part/$index" }
    /** `#/speaking/<p1|p2|p3>/<topic index>`; an unknown part ⇒ p1, a bad / out of range index ⇒ 0. */
    fun page(pack: SpeakPack, arg: String?): Page {
        val seg = (arg ?: "").split('/'); val part = if (seg.getOrNull(0) in pack.parts.keys) seg[0] else "p1"
        val ti = seg.getOrNull(1)?.takeIf { it.isNotEmpty() && it.all { c -> c in '0'..'9' } }?.toIntOrNull()?.takeIf { it < pack.bank.size } ?: 0
        val tp = pack.bank[ti]
        return Page(part, ti, tp, pack.parts.getValue(part), tp.questions(part))
    }
    /** What the examiner says: the question, or the cue card with its points. */
    fun askText(p: Page, qi: Int): String = if (p.part == "p2") p.topic.p2q + " You should say: " + p.topic.p2points.joinToString(", ") + "." else p.questions[qi % p.questions.size]
    fun nextQuestion(p: Page, qi: Int) = (qi + 1) % p.questions.size
    /** "🎲": a random topic different from the current one (when there is more than one). */
    fun randomTopic(p: Page, size: Int, random: () -> Double): Int { var r = p.index; if (size > 1) while (r == p.index) r = Math.floor(random() * size).toInt(); return r }
    fun clock(secs: Double): String { val s = Math.floor(secs).toInt(); return "%02d:%02d".format(s / 60, s % 60) }
    /** "good" from the target minimum, "again" above the maximum, "" below. */
    fun clockColor(p: Page, secs: Double): String = if (secs > p.info.hi) "again" else if (secs >= p.info.lo) "good" else ""
    fun hintTarget(p: Page): Tr = Tr("Mục tiêu: {a}–{b} giây", mapOf("a" to p.info.lo, "b" to p.info.hi))
    fun hintRecord(p: Page): Tr = Tr(if (p.part == "p2") "Bấm micro để trả lời (sẽ có 1 phút chuẩn bị)" else "Bấm micro để trả lời")
    fun tips(pack: SpeakPack, part: String): List<Tr> = (pack.speakingTips[part] ?: emptyList()).map { Tr(it) }

    class Chip(val kind: String, val text: String)
    class Analysis(val seconds: Int, val wpm: Int, val words: Int, val fillers: Int, val notes: List<Tr>, val chips: List<Chip>, val reward: Reward?, val hasText: Boolean)
    private val WORDS = Regex("[A-Za-z][A-Za-z'’-]*")
    /** The analysis of one answer: [text] = final + interim transcript, [secs] = recording time; [topicWords] = the words of the topic set to look for (✓ chips). */
    fun analyse(pack: SpeakPack, p: Page, text: String, secs: Double, lexis: Lexis, topicWords: List<String> = emptyList()): Analysis {
        val words = WORDS.findAll(text).count(); val wpm = if (secs > 3) jsRound(words / (secs / 60)) else 0
        val fillers = pack.fillers.findAll(text).count()
        val a = if (text.isNotEmpty()) lexis.analyze(text) else null
        val notes = ArrayList<Tr>()
        if (text.isEmpty()) notes.add(Tr("Không nhận được chữ nào – thử nói to, rõ hơn hoặc dùng Chrome/Edge để bật chuyển giọng nói thành chữ."))
        if (secs < p.info.lo) notes.add(Tr("Câu trả lời hơi ngắn ({s} giây). Hãy mở rộng: <b>nêu ý → giải thích lý do → ví dụ cụ thể</b>.", mapOf("s" to jsRound(secs))))
        if (secs > p.info.hi + 15 && p.part != "p2") notes.add(Tr("Câu trả lời khá dài – ở phần này nên trả lời gọn, đi thẳng vào ý."))
        if (wpm != 0 && wpm < 90) notes.add(Tr("Tốc độ {wpm} từ/phút hơi chậm – luyện nói liền mạch hơn, bớt ngắt quãng (mức tự nhiên ~110–160 từ/phút).", mapOf("wpm" to wpm)))
        if (wpm > 180) notes.add(Tr("Tốc độ {wpm} từ/phút khá nhanh – nói chậm lại để phát âm rõ và nhấn trọng âm đúng.", mapOf("wpm" to wpm)))
        if (fillers >= 3) notes.add(Tr("Dùng {n} từ đệm (um, uh, like, you know…) – thay bằng cụm câu giờ tự nhiên: <i>“That's an interesting question…”, “Let me think…”</i>", mapOf("n" to fillers)))
        if (a != null && a.link.size < 2 && words > 30) notes.add(Tr("Thêm từ nối để mạch lạc: <i>Firstly, On top of that, For example, As a result…</i>"))
        if (a != null && a.phrases.isEmpty() && words > 30) notes.add(Tr("Thử dùng 1–2 collocation hoặc idiom tự nhiên để tăng điểm Lexical Resource."))
        if (notes.isEmpty()) notes.add(Tr("Rất tốt! Độ dài, tốc độ và từ vựng đều ổn – hãy thử câu khác hoặc chủ đề khác."))
        val chips = ArrayList<Chip>()
        for (w in topicWords) if (WordMatch.regex(w).containsMatchIn(text)) chips.add(Chip("ok", w))
        if (a != null) { for (w in a.awl.keys) chips.add(Chip("lv", w)); for (w in a.link.keys) chips.add(Chip("link", w)) }
        val reward = if (words >= 10) Reward(mapOf("spoken" to minOf(10, jsRound(words / 10.0)), "quizzes" to 1), 15) else null
        return Analysis(jsRound(secs), wpm, words, fillers, notes, chips, reward, text.isNotEmpty())
    }

    /** The sample answer (band 7.5–8) split into sentences for listening and shadowing; the key is the question (Part 2: the cue-card text). */
    fun sample(pack: SpeakPack, p: Page, qi: Int): SpeakSample? = pack.samples[if (p.part == "p2") p.topic.p2q else p.questions[qi % p.questions.size]]
    fun sentences(s: SpeakSample): List<String> = com.lexkite.app.core.audio.AudioLogic.split(s.a)
    /** The sentence in the phrase saver: the first sentence containing the first word of the phrase. */
    fun savePhraseSentence(sents: List<String>, phrase: String): String { val first = phrase.lowercase().split(' ')[0]; return sents.firstOrNull { it.lowercase().contains(first) } ?: "" }
    /** Shadowing score colour: ≥ 80 good, ≥ 60 medium, else again. */
    fun shadowColor(score: Int) = if (score >= 80) "good" else if (score >= 60) "medium" else "again"
    class ShadowDone(val pct: Int, val reward: Reward)
    /** Finishing the sample: average = sum of scores / number of sentences (skipped ones add nothing); the reward is flat. */
    fun shadowDone(scores: List<Int>, sentences: Int): ShadowDone = ShadowDone(jsRound(scores.sum().toDouble() / sentences), Reward(mapOf("spoken" to 3), 10))
}
