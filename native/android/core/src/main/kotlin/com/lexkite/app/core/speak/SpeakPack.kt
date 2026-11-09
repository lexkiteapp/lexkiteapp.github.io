package com.lexkite.app.core.speak

import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.strs
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/** One speaking topic of the question bank (web speaking.js BANK + SPEAK_MORE). */
class SpeakTopic(j: JsonObject) {
    val topic = j.gs("topic"); val title = j.gs("title"); val p1 = j.strs("p1"); val p3 = j.strs("p3")
    val p2q = j.go("p2").gs("q"); val p2points = j.go("p2").strs("points")
    /** The questions of a part: Part 2 has the one cue card. */
    fun questions(part: String): List<String> = when (part) { "p2" -> listOf(p2q); "p3" -> p3; else -> p1 }
}
/** A band 7.5–8 sample answer (+ phrases worth saving as `(english, vietnamese)`). */
class SpeakSample(j: JsonObject) { val a = j.gs("a"); val vocab: List<Pair<String, String>> = j.ga("vocab").map { it.strList().let { p -> p.getOrElse(0) { "" } to p.getOrElse(1) { "" } } } }
/** Part card: name (key), target seconds range, preparation seconds (Part 2 only), description (key). */
class SpeakPart(j: JsonObject) { val name = j.gs("name"); val lo = j.ga("target").getOrNull(0).num().toInt(); val hi = j.ga("target").getOrNull(1).num().toInt(); val prep = if (j["prep"] != null) j.gn("prep").toInt() else 0; val desc = j.gs("desc") }

/** The mouth description of a vowel / the place + manner of a consonant. */
class MouthSpec(j: JsonObject) { val lips = j.gs("lips"); val jaw = j.gs("jaw"); val tongue = j.gs("tongue"); val place = j.gs("place"); val manner = j.gs("manner")
    val voiced: Boolean? = (j["voiced"] as? kotlinx.serialization.json.JsonPrimitive)?.content?.let { it == "true" }
    val long: Boolean = (j["long"] as? kotlinx.serialization.json.JsonPrimitive)?.content == "true"
    val hasShape get() = lips.isNotEmpty() }
class LessonWord(j: JsonObject) { val w = j.gs("w"); val ipa = j.gs("ipa"); val note = j.gs("note") }
class LessonRule(j: JsonObject) { val label = j.gs("label"); val whenText = j.gs("when"); val ex = j.strs("ex") }
class LessonQuiz(j: JsonObject) { val q = j.gs("q"); val options = j.strs("options"); val answer = j.gn("answer").toInt(); val explain = j.gs("explain") }
/** One pronunciation lesson (web PRON item): a sound or a Vietnamese-learner topic. All prose is Vietnamese only. */
class PronLesson(j: JsonObject) {
    val id = j.gs("id"); val group = j.gs("group"); val ipa = j.gs("ipa"); val title = j.gs("title"); val emoji = j.gs("emoji"); val level = j.gs("level"); val how = j.gs("how"); val vn = j.gs("vn"); val tip = j.gs("tip")
    val mouth: MouthSpec? = j.go("mouth")?.let { MouthSpec(it) }
    val words = j.ga("words").map { LessonWord(it.obj()) }; val rules = j.ga("rules").map { LessonRule(it.obj()) }
    val pairs: List<Pair<String, String>> = j.ga("pairs").map { it.strList().let { p -> p.getOrElse(0) { "" } to p.getOrElse(1) { "" } } }
    val sentences = j.strs("sentences"); val quiz = j.ga("quiz").map { LessonQuiz(it.obj()) }
}
/** A rhythm sentence of the coach; [w] = custom stressed words. */
class CoachSentence(j: JsonObject) { val s = j.gs("s"); val lv = j.gs("lv"); val w: List<String>? = if (j["w"] != null) j.strs("w") else null }
class Contrast(j: JsonObject) { val id = j.gs("id"); val a = j.gs("a"); val b = j.gs("b"); val skills = j.strs("skills"); val pairs = j.gs("pairs") }

/** A roleplay turn: AI line, learner model line and tip per level, reactions `br` = (regex, reply). */
class RpTurn(j: JsonObject) { val a = j.strs("a"); val h = j.strs("h"); val tip = j.gs("tip"); val br: List<Pair<String, String>> = j.ga("br").map { it.strList().let { p -> p.getOrElse(0) { "" } to p.getOrElse(1) { "" } } } }
class RpScript(j: JsonObject, defaultLevels: List<String>) {
    val id = j.gs("id"); val em = j.gs("em"); val title = j.gs("title"); val you = j.gs("you"); val cando = j.gs("cando"); val kind = j.gs("kind")
    val aiName = j.go("ai").gs("name"); val aiRole = j.go("ai").gs("role"); val aiPersona = j.go("ai").gs("persona"); val aiGoal = j.go("ai").gs("goal")
    val vocab: List<Pair<String, String>> = j.ga("vocab").map { it.strList().let { p -> p.getOrElse(0) { "" } to p.getOrElse(1) { "" } } }
    val turns = j.ga("turns").map { RpTurn(it.obj()) }; val end = j.strs("end")
    val levels: List<String> = if (j["lv"] != null) j.strs("lv") else defaultLevels
    val daily get() = kind == "everyday"
}

/**
 * The downloaded speaking pack `https://lexkite.com/data/speak-pack.json` (bundled `content-pack/speak-starter.json` offline): question bank, sample answers, 56 pronunciation lessons,
 * minimal-pair + rhythm data, roleplay scripts and the constants of the web code (WEAK forms, pass calibration). Nothing here is typed in Kotlin.
 */
class SpeakPack(val root: JsonObject) {
    private val sp = root.go("speaking"); private val pr = root.go("pron"); private val rp = root.go("roleplay"); private val consts = root.go("consts")
    val version = root.gs("v")
    val bank: List<SpeakTopic> = sp.ga("bank").map { SpeakTopic(it.obj()) }
    val samples: Map<String, SpeakSample> = sp.go("samples")?.mapValues { SpeakSample(it.value.obj()) } ?: emptyMap()
    val parts: Map<String, SpeakPart> = sp.go("parts")?.mapValues { SpeakPart(it.value.obj()) } ?: emptyMap()
    val fillers: Regex = jsRegex(sp.gs("fillers").ifEmpty { "(?!)" }, "i")
    val speakingTips: Map<String, List<String>> = sp.go("tips")?.mapValues { it.value.strList() } ?: emptyMap()

    val lessons: List<PronLesson> = pr.ga("lessons").map { PronLesson(it.obj()) }
    fun lesson(id: String?) = lessons.find { it.id == id }
    val contrasts: List<Contrast> = pr.go("pairs").ga("contrasts").map { Contrast(it.obj()) }
    val ipa: Map<String, String> = pr.go("pairs").go("ipa")?.mapValues { it.value.str() } ?: emptyMap()
    val hom: Map<String, List<String>> = pr.go("pairs").go("hom")?.mapValues { it.value.strList() } ?: emptyMap()
    val num: Map<String, String> = pr.go("pairs").go("num")?.mapValues { it.value.str() } ?: emptyMap()
    val pairTips: Map<String, List<String>> = pr.go("pairs").go("tips")?.mapValues { it.value.strList() } ?: emptyMap()
    val pairLabels: Map<String, String> = pr.go("pairs").go("labels")?.mapValues { it.value.str() } ?: emptyMap()
    val coachSentences: List<CoachSentence> = pr.go("coach").ga("sentences").map { CoachSentence(it.obj()) }
    val light: Set<String> = pr.go("coach").strs("light").toSet()
    /** WEAK forms `{word: [UK, US, example, non-weak part of speech]}` (ui.js WEAK; pack `consts.weak`). */
    val weak: Map<String, List<String>> = (consts.go("weak") ?: pr.go("weak"))?.mapValues { it.value.strList() } ?: emptyMap()

    val rpLevels: List<String> = rp.strs("levels")
    val scripts: List<RpScript> = rp.ga("scripts").map { RpScript(it.obj(), rpLevels) }
    fun script(id: String?) = scripts.find { it.id == id }
    val rpNames: Map<String, String> = rp.go("names")?.mapValues { it.value.str() } ?: emptyMap()
    val rpConfidence: Map<String, String> = rp.go("confidence")?.mapValues { it.value.str() } ?: emptyMap()
    val rpRate: List<Double> = rp.ga("rate").map { it.num() }
    val guestAiPerDay: Int = rp.gn("guestAiPerDay", 2.0).toInt()
    val rpAck: List<List<String>> = rp.ga("ack").map { it.strList() }
    val rpPolite: Regex = jsRegex(rp?.get("polite"))
    val rpErrors: List<Regex> = rp.ga("errors").map { jsRegex(it) }

    init { SpeakScore.install(consts) }
    val ok get() = lessons.isNotEmpty() && scripts.isNotEmpty() && bank.isNotEmpty()

    companion object {
        fun parse(text: String): SpeakPack? = runCatching { SpeakPack(kotlinx.serialization.json.Json.parseToJsonElement(text) as JsonObject).takeIf { it.ok } }.getOrNull()
    }
}

/** The pronunciation lesson groups in the order of the hub (web pron.js GROUPS): id, title key, description key, emoji, drawn as an IPA chart. */
object PronGroups {
    class Group(val id: String, val name: String, val desc: String, val emoji: String, val chart: Boolean)
    val ALL = listOf(
        Group("vowels", "Nguyên âm đơn", "12 nguyên âm – phân biệt âm dài/ngắn (ship – sheep)", "🅰️", true),
        Group("diphthongs", "Nguyên âm đôi", "8 nguyên âm đôi – trượt từ âm này sang âm kia", "🔀", true),
        Group("consonants", "Phụ âm", "24 phụ âm – vô thanh/hữu thanh, vị trí cấu âm", "🅱️", true),
        Group("vn", "Sửa lỗi người Việt", "Âm cuối, đuôi -ed/-s, /θ ð/, /ʃ s/, cụm phụ âm", "🇻🇳", false),
        Group("stress", "Trọng âm & ngữ điệu", "Trọng âm từ, câu, ngữ điệu, nối âm – điểm Pronunciation band 7+", "🎵", false))
    /** Lessons that carry the rhythm / shadowing coach. */
    val RHYTHM = setOf("weak-forms", "word-stress", "stress-shift", "connected-speech", "chunking", "intonation")
}

/** JsonArray → list helper used by the logic files. */
internal fun List<JsonElement>.asJsonArray() = JsonArray(this)
