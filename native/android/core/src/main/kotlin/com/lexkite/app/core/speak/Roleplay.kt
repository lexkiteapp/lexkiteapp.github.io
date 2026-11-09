package com.lexkite.app.core.speak

import com.lexkite.app.core.lesson.Speaking
import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.gs
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** #/roleplay (web roleplay.js): hub, brief, the conversation engine (AI server → scripted branches), the local scorer and the AI-report validation. Randomness and time are inputs. */
object Roleplay {
    const val STORE_LEVEL = "vb.rp.level"; const val STORE_DAY = "vb.rp.day"; const val UNLIMITED = 99
    private val WORDS = Regex("[A-Za-z][A-Za-z'’-]*")
    fun words(s: String?): Int = WORDS.findAll(s ?: "").count()

    // ---------- hub / brief ----------
    /** The level stored in localStorage `vb.rp.level` (0–2, anything else ⇒ 1). */
    fun level(stored: JsonElement?): Int { val v = (stored as? JsonPrimitive)?.content?.toDoubleOrNull(); return if (v == 0.0 || v == 1.0 || v == 2.0) v.toInt() else 1 }
    class Hub(val everyday: List<RpScript>, val work: List<RpScript>, val level: Int, val dailyLevels: List<String>, val workLevels: List<String>)
    fun hub(pack: SpeakPack, level: Int): Hub {
        val list = pack.scripts; val daily = list.filter { it.daily }
        return Hub(daily, list.filter { !it.daily }, level, daily.firstOrNull()?.levels ?: listOf("A1", "A2", "B1"), pack.rpLevels)
    }
    /** "A1 / B1": the level button label (everyday level / work level). */
    fun levelButton(h: Hub, i: Int) = h.dailyLevels.getOrElse(i) { "" } + " / " + h.workLevels.getOrElse(i) { "" }
    /** The scenario name: the translated name key when the pack has one, else the English title. */
    fun name(pack: SpeakPack, s: RpScript): Tr = pack.rpNames[s.id]?.let { Tr(it) } ?: Tr(s.title)
    fun footnote(pack: SpeakPack, signedIn: Boolean): Tr = if (signedIn) Tr("AI trên máy (Chrome) hoặc AI miễn phí của Lexkite sẽ đóng vai. Hết lượt AI thì dùng kịch bản soạn sẵn.")
        else Tr("Khách: {n} hội thoại có AI mỗi ngày, sau đó dùng kịch bản soạn sẵn. Đăng nhập để luyện với AI nhiều hơn.", mapOf("n" to pack.guestAiPerDay))
    /** A vocabulary chip saved to the flashcards: the entry and its context (web brief). */
    class SaveVocab(val entry: JsonObject, val context: JsonObject)
    fun saveVocab(s: RpScript, i: Int): SaveVocab { val (w, d) = s.vocab[i]
        return SaveVocab(JsonObject(mapOf("word" to JsonPrimitive(w), "def" to JsonPrimitive(d), "emoji" to JsonPrimitive(s.em), "topic" to JsonPrimitive("roleplay"))), JsonObject(mapOf("text" to JsonPrimitive(d), "title" to JsonPrimitive("Roleplay: " + s.title)))) }

    // ---------- AI budget ----------
    /** `vb.rp.day` = `{d, n}`: AI conversations started today. */
    class Day(val d: String, val n: Int)
    fun dayOf(j: JsonElement?): Day? = (j as? JsonObject)?.let { Day(it.gs("d"), it.gn("n").toInt()) }
    fun aiLeft(pack: SpeakPack, signedIn: Boolean, day: Day?, today: String): Int = if (signedIn) UNLIMITED else pack.guestAiPerDay - (if (day != null && day.d == today) day.n else 0)
    fun useAi(day: Day?, today: String): Day = Day(today, (if (day != null && day.d == today) day.n else 0) + 1)
    fun dayJson(d: Day): JsonElement = JsonObject(mapOf("d" to JsonPrimitive(d.d), "n" to JsonPrimitive(d.n)))
    /** The conversation brain: server (guests with AI left today, online) → script; the on-device AI of the web is not ported. */
    fun mode(aiLeft: Int, online: Boolean): String = if (aiLeft > 0 && online) "server" else "script"
    fun modeLabel(mode: String): Tr = if (mode == "server") Tr("AI miễn phí của Lexkite") else Tr("Kịch bản soạn sẵn")
    fun modeEmoji(mode: String) = if (mode == "server") "☁️" else "📜"

    // ---------- prompts ----------
    private fun descOf(s: RpScript, L: Int) = (if (s.daily) listOf("very short, simple sentences with the most common words", "short, simple sentences with common everyday words", "natural everyday English")
        else listOf("short simple sentences, common words", "natural everyday business English", "fluent, idiomatic professional English"))[L]
    fun systemPrompt(s: RpScript, L: Int): String {
        val lv = s.levels[L]
        return "You are role-playing ${if (s.daily) "an everyday" else "a workplace"} English conversation to help a $lv English learner practise speaking.\n" +
            "Your character: ${s.aiName}, ${s.aiRole}. Personality: ${s.aiPersona}. Your goal: ${s.aiGoal}.\n" +
            "Scenario: ${s.title}. The learner's goal: ${s.you}\n" +
            "Rules: stay in character; speak natural spoken English at $lv level (${descOf(s, L)}); never correct the learner during the conversation; never mention you are an AI; keep each reply under 45 words."
    }
    class Bubble(val who: String, val text: String, val turn: Int)
    fun transcript(hist: List<Bubble>, s: RpScript) = hist.joinToString("\n") { (if (it.who == "ai") s.aiName else "Learner") + ": " + it.text }
    fun turnPrompt(s: RpScript, L: Int, hist: List<Bubble>, i: Int): String {
        val next = s.turns.getOrNull(i + 1); val beat = if (next != null) next.a[L] else s.end[L]
        return "Conversation so far:\n${transcript(hist, s)}\n\n" +
            (if (next != null) "Next point you must cover (say it in your own words, same meaning): \"$beat\"" else "This is the end: close the conversation politely, similar to: \"$beat\"") +
            "\nIf the learner's last reply is unclear, off-topic or too short to understand, ask them to clarify instead and set \"advance\" to false (only once per point).\n" +
            "JSON: {\"reply\": string (what ${s.aiName} says next, under 45 words), \"advance\": boolean}"
    }
    fun scoringPrompt(s: RpScript, L: Int, hist: List<Bubble>, langNameEn: String): String =
        "${if (s.daily) "Everyday" else "Workplace"} role-play for a ${s.levels[L]} English learner. Scenario: ${s.title}. Learner's goal: ${s.you}\nTranscript:\n${transcript(hist, s)}\n\n" +
            "Assess ONLY the learner's lines. Return JSON: {\"natural\": 0-100, \"polite\": 0-100, \"clarity\": 0-100, \"grammar\": 0-100, \"summary\": string (2 sentences of feedback written in $langNameEn), " +
            "\"rewrites\": [ {\"you\": exact learner line, \"better\": a sharper, more natural and professional version in English (keep their idea, ${s.levels[minOf(2, L + 1)]} level), " +
            "\"why\": string (1-2 sentences in $langNameEn explaining what improved), \"meaning\": string (translation of \"better\" into $langNameEn)} ] exactly 3 items, choosing the learner lines that would improve most}"
    fun scoringSystem(s: RpScript) = "You are a strict but encouraging ${if (s.daily) "everyday" else "business"} English coach. Be accurate: very short or off-topic answers get low scores. Return JSON only."

    // ---------- the conversation ----------
    /** What the AI says next and whether the turn advances. */
    class Reply(val text: String, val advance: Boolean)
    /** The scripted brain: < 3 words the first time ⇒ ask for more; else the first matching reaction (or a random acknowledgement) + the next line. */
    fun scripted(pack: SpeakPack, s: RpScript, L: Int, i: Int, reply: String, retried: Boolean, rnd: () -> Double): Reply {
        val next = s.turns.getOrNull(i + 1)
        if (!retried && words(reply) < 3) return Reply(listOf("Sorry, can you say a little more?", "Sorry, could you tell me a bit more?", "Could you expand on that a little?")[L], false)
        var react = ""
        for ((re, say) in s.turns[i].br) { val hit = runCatching { Regex("\\b($re)", RegexOption.IGNORE_CASE).containsMatchIn(reply) || (re.contains("\\?") && reply.contains('?')) }.getOrDefault(false); if (hit) { react = say; break } }
        if (react.isEmpty() && rnd() < 0.5) react = pack.rpAck[L][Math.floor(rnd() * 3).toInt()]
        val line = if (next != null) next.a[L] else s.end[L]
        return Reply(if (react.isNotEmpty()) "$react $line" else line, true)
    }
    /** A reply from the server (`{reply, advance}`): the line is cut at 400 chars; advance = retried || advance !== false. null = unusable ⇒ the caller falls back to the script. */
    fun serverReply(out: JsonObject?, retried: Boolean): Reply? { val r = out?.get("reply") as? JsonPrimitive ?: return null; if (r.content.isEmpty()) return null
        val adv = (out?.get("advance") as? JsonPrimitive)?.content; return Reply(r.content.take(400), retried || adv != "false") }

    /** One conversation: the bubbles, the turn counter, hints used and the brain mode (a server problem switches to the script for the rest of the chat). */
    class Chat(val pack: SpeakPack, val s: RpScript, val L: Int, var mode: String) {
        val hist = ArrayList<Bubble>(); var i = 0; var retried = false; var hints = 0; var busy = false
        val rate get() = pack.rpRate.getOrElse(L) { 1.0 }
        val turnIndex get() = minOf(i, s.turns.size - 1)
        val turnLabel get() = Tr("Lượt {i}/{n}", mapOf("i" to minOf(i + 1, s.turns.size), "n" to s.turns.size))
        val done get() = i >= s.turns.size
        fun bubble(who: String, text: String) { hist.add(Bubble(who, text, minOf(i, s.turns.size - 1))) }
        fun open() { bubble("ai", s.turns[0].a[L]) }
        /** The learner's line was accepted (cleaned of extra spaces); false = ignore (empty, busy or the chat is over). */
        fun begin(text: String): String? { val t = text.replace(Regex("\\s+"), " ").trim(); if (t.isEmpty() || busy || done) return null; busy = true; bubble("me", t); return t }
        fun answer(r: Reply) { if (r.advance) { i++; retried = false } else retried = true; bubble("ai", r.text); busy = false }
        fun downgrade() { mode = "script" }
        fun hint(): Pair<Tr?, String> { hints++; val tr = s.turns[turnIndex]; return (if (tr.tip.isNotEmpty()) Tr(tr.tip) else null) to tr.h[L] }
        /** "Giúp tôi nói": the hint line is spoken slowly (rate 0.72) and put in the input box. */
        fun help(): String { hints++; return s.turns[turnIndex].h[L] }
        fun modelLine(): String = s.turns[turnIndex].h[L]
    }
    const val HELP_RATE = 0.72

    // ---------- the report ----------
    class Rewrite(val you: String, val better: String, val why: Tr?, val whyText: String, val meaning: String)
    class Scores(val natural: Int, val polite: Int, val clarity: Int, val grammar: Int, val summary: String, val rewrites: List<Rewrite>)
    private fun clamp(x: Double) = maxOf(20, minOf(98, jsRound(x)))
    /** The local estimate (no AI): length, contractions, politeness, grammar patterns; null when the learner said nothing. */
    fun localScore(pack: SpeakPack, s: RpScript, L: Int, hist: List<Bubble>): Scores? {
        val mine = hist.filter { it.who == "me" }; if (mine.isEmpty()) return null
        val avgW = mine.sumOf { words(it.text) }.toDouble() / mine.size
        val sim = mine.map { Speaking.similarity(it.text.lowercase(), s.turns[it.turn].h[L].lowercase()) }
        val polite = mine.count { pack.rpPolite.containsMatchIn(it.text) }.toDouble() / mine.size
        val contractions = mine.count { Regex("\\b\\w+'(m|re|s|ll|ve|d|t)\\b", RegexOption.IGNORE_CASE).containsMatchIn(it.text) }.toDouble() / mine.size
        val errs = mine.map { m -> pack.rpErrors.count { it.containsMatchIn(m.text) } }; val errSum = errs.sum()
        val lenOk = if (avgW >= 6 && avgW <= 35) 1.0 else if (avgW >= 4) 0.6 else 0.25
        val natural = clamp(45 + contractions * 25 + lenOk * 15 + sim.sum() / sim.size * 25)
        val pol = clamp(45 + polite * 55); val clarity = clamp(35 + lenOk * 40 + minOf(1.0, mine.size.toDouble() / s.turns.size) * 25); val grammar = clamp(96 - errSum.toDouble() / mine.size * 30)
        val order = mine.mapIndexed { n, m -> Triple(m, n, sim[n] - errs[n] * 0.3 - (if (words(m.text) < 4) 0.3 else 0.0)) }.sortedBy { it.third }.take(3)
        val rewrites = order.map { (m, n, _) ->
            val better = s.turns[m.turn].h[minOf(2, L + 1)]
            val why = if (words(m.text) < 4) "Câu trả lời quá ngắn – thêm một lý do hoặc chi tiết cụ thể để ý rõ hơn." else if (errs[n] != 0) "Có lỗi ngữ pháp cơ bản – câu viết lại đúng ngữ pháp và tự nhiên hơn."
                else if (!pack.rpPolite.containsMatchIn(m.text)) "Thêm từ lịch sự (could, would, please, I'm afraid…) để lời nói mềm và chuyên nghiệp hơn." else if (s.daily) "Cách nói này rõ ý và tự nhiên hơn." else "Cách nói này rõ ý hơn và đúng phong cách công sở hơn."
            Rewrite(m.text, better, Tr(why), "", "") }
        return Scores(natural, pol, clarity, grammar, "", rewrites)
    }
    /** An AI report is usable only when the four criteria are numbers and `rewrites` is an array; a rewrite without `better` is dropped, at most 3 are kept. */
    fun aiScore(out: JsonObject?): Scores? {
        if (out == null) return null
        val keys = listOf("natural", "polite", "clarity", "grammar")
        val v = keys.map { k -> (out[k] as? JsonPrimitive)?.takeIf { !it.isString }?.content?.toDoubleOrNull() ?: return null }
        val rw = out["rewrites"] as? JsonArray ?: return null
        val rewrites = rw.mapNotNull { (it as? JsonObject)?.takeIf { o -> o.gs("better").isNotEmpty() } }.take(3).map { Rewrite(it.gs("you"), it.gs("better"), null, it.gs("why"), it.gs("meaning")) }
        return Scores(jsRound(v[0]), jsRound(v[1]), jsRound(v[2]), jsRound(v[3]), out.gs("summary"), rewrites)
    }
    class Report(val scores: Scores, val ai: Boolean, val ring: Int, val meters: List<Pair<Tr, Int>>, val reward: Reward, val xp: Int, val source: Tr)
    /** The final report: [ai] when valid, else the local estimate; avg of the four clamped values; reward {spoken, xp: max(5, 10 + 3·spoken − min(hints, spoken))}. */
    fun report(pack: SpeakPack, s: RpScript, L: Int, hist: List<Bubble>, hints: Int, ai: Scores?): Report? {
        val spoken = hist.count { it.who == "me" }; if (spoken == 0) return null
        val sc = ai ?: localScore(pack, s, L, hist) ?: return null
        val c = { x: Int -> maxOf(0, minOf(100, x)) }
        val avg = jsRound((c(sc.natural) + c(sc.polite) + c(sc.clarity) + c(sc.grammar)) / 4.0)
        val xp = 10 + spoken * 3 - minOf(hints, spoken)
        return Report(sc, ai != null, avg, listOf(Tr("Độ tự nhiên") to c(sc.natural), Tr("Mức lịch sự") to c(sc.polite), Tr("Độ rõ ý") to c(sc.clarity), Tr("Ngữ pháp") to c(sc.grammar)), Reward(mapOf("spoken" to spoken), maxOf(5, xp)), maxOf(5, xp),
            if (ai != null) Tr("Chấm bởi AI") else Tr("Ước lượng nhanh trên máy (không có AI)."))
    }
    /** The Confidence-course lesson linked at the end of a conversation (`#/confidence/<lesson>`), if the scenario has one. */
    fun confidence(pack: SpeakPack, s: RpScript): String? = pack.rpConfidence[s.id]
    /** The flashcard a rewrite becomes. */
    fun saveRewrite(s: RpScript, r: Rewrite): SaveVocab = SaveVocab(JsonObject(mapOf("word" to JsonPrimitive(r.better), "vi" to JsonPrimitive(r.meaning), "pos" to JsonPrimitive("phrase"), "ex" to JsonPrimitive(r.better), "emoji" to JsonPrimitive(s.em), "topic" to JsonPrimitive("roleplay"))),
        JsonObject(mapOf("text" to JsonPrimitive(r.better), "title" to JsonPrimitive("Roleplay: " + s.title))))
}
