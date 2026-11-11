package com.lexkite.app.core.speak

import com.lexkite.app.core.audio.AudioLogic
import com.lexkite.app.core.skills.Reward
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gn
import com.lexkite.app.core.vocab.go
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.sync.Js
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** A masked or plain alternative phrase of a Say card: "don't say" / "say instead". */
class SayAlt(j: JsonObject?) { val text = j.gs("text"); val reg = j.gs("reg"); val masked = Js.truthy(j?.get("masked")) }
/** One Say card (web/data/say.json item): the line, its IPA, register, easy definition, meaning per language, when to use, the line to avoid and the better one. */
class SayCard(j: JsonObject) {
    val id = j.gs("id"); val say = j.gs("say"); val ipa = j.gs("ipa"); val reg = j.gs("reg"); val def = j.gs("def"); val mean = j.gs("mean"); val whenText = j.gs("when"); val pose = j.gs("pose")
    val swap: SayAlt? = j.go("swap")?.let { SayAlt(it) }; val dont: SayAlt? = j.go("dont")?.let { SayAlt(it) }
    private val m = j.go("m")
    fun meaningIn(lang: String): String = m?.gs(lang)?.takeIf { it.isNotEmpty() && lang != "en" } ?: mean
}
class SaySeries(j: JsonObject) { val id = j.gs("id"); val title = j.gs("title"); val teacher = j.gs("teacher"); val items = j.ga("items").map { SayCard(it as JsonObject) } }
/** `https://lexkite.com/data/say.json`. */
class SayData(root: JsonObject) { val series = root.ga("series").map { SaySeries(it as JsonObject) }; fun series(id: String?) = series.find { it.id == id }
    companion object { fun parse(text: String): SayData? = runCatching { SayData(kotlinx.serialization.json.Json.parseToJsonElement(text) as JsonObject).takeIf { it.series.isNotEmpty() } }.getOrNull() } }

/** #/say (web say.js): the series list, the two faces of a card, the mic feedback and the share text. */
object SayLogic {
    const val KEY = "lk.say.seen"; const val SITE = "https://lexkite.com/app/#/say"
    private val REG = mapOf("polite" to "Lịch sự", "neutral" to "Sắc thái trung tính", "casual" to "Thân mật", "blunt" to "Cộc lốc", "rude" to "Thô lỗ")
    private val REACT = mapOf("polite" to "Khéo lắm! Không ai phật lòng.", "neutral" to "Rõ ràng mà vẫn thân thiện.", "casual" to "Thoải mái – hợp nói với bạn bè.")
    private val WHY = mapOf("blunt" to "Nghe gay gắt", "rude" to "Xúc phạm người nghe", "polite" to "Giữ hòa khí", "neutral" to "Tự nhiên, dễ nghe", "casual" to "Gần gũi")
    fun regLabel(r: String): Tr = Tr(REG[r] ?: r)
    /** The teacher's display name (Chars.name): "ama" → "Ama". */
    fun teacherName(id: String) = id.replaceFirstChar { it.titlecase() }
    /** The Kokoro voice of the series teacher (ama = af_heart, carlos = am_michael). */
    fun voiceOf(teacher: String): String? = AudioLogic.voiceOf(teacher)

    class Row(val series: SaySeries, val firstCard: SayCard, val progress: Tr, val pct: Int, val n: Int)
    /** The list: per series the first card not yet seen (all seen ⇒ the first card), "n/total thẻ · với name", bar = round(100·seen/total). [seen] = `lk.say.seen`. */
    fun list(d: SayData, seen: Set<String>): List<Row> = d.series.map { s ->
        val n = s.items.count { (s.id + "/" + it.id) in seen }
        Row(s, s.items.firstOrNull { (s.id + "/" + it.id) !in seen } ?: s.items[0], Tr("{n}/{total} thẻ · với {name}", mapOf("n" to n, "total" to s.items.size, "name" to teacherName(s.teacher))), jsRound(100.0 * n / s.items.size), n)
    }
    /** What `#/say/<arg>` shows: the list, a redirect to the first card, or the card [index] of [series]. */
    class Route(val list: Boolean, val replace: String?, val series: SaySeries?, val index: Int)
    fun route(d: SayData, arg: String?): Route {
        val parts = (arg ?: "").split('/'); val s = d.series(parts[0]) ?: return Route(true, null, null, 0)
        val iid = parts.getOrNull(1).orEmpty(); val i = maxOf(0, s.items.indexOfFirst { it.id == iid })
        return if (iid.isEmpty() || s.items[i].id != iid) Route(false, "say/" + s.id + "/" + s.items[i].id, s, i) else Route(false, null, s, i)
    }
    class Front(val series: Tr, val step: Tr, val ipa: String, val pct: Double, val n: Int, val total: Int, val regLbl: Tr)
    fun front(s: SaySeries, i: Int): Front { val it = s.items[i]; val total = s.items.size
        return Front(Tr(s.title + " · " + (i + 1) + "/" + total), Tr("Thẻ {n}/{total}", mapOf("n" to i + 1, "total" to total)), if (it.ipa.isNotEmpty()) "/" + it.ipa.replace(Regex("^/|/$"), "") + "/" else "", Math.floor((i + 1.0) / total * 1000 + 0.5) / 10, i + 1, total, regLabel(it.reg)) }
    class Back(val react: Tr?, val def: String, val meaningLabel: Tr, val mLang: String, val meaning: String, val real: Tr?, val whenText: String, val dont: String, val dontReg: Tr?, val dontWhy: Tr?, val dontAria: Tr?, val dontMasked: Boolean, val swap: String, val swapReg: Tr?, val swapWhy: Tr?, val next: String)
    /** The back face: reaction by register, meaning in the learner language ([langName] = its name in the UI language), the line to avoid (a rude one is masked and never read aloud). */
    fun back(s: SaySeries, i: Int, learn: String, langName: (String) -> String): Back {
        val it = s.items[i]; val meaning = it.meaningIn(learn); val mLang = if (meaning == it.mean) "en" else learn
        val d = it.dont; val w = it.swap
        return Back(REACT[it.reg]?.let { k -> Tr(k) }, it.def, if (mLang == "en") Tr("Nghĩa dễ hiểu") else Tr("Nghĩa ({lang})", mapOf("lang" to langName(learn))), mLang, meaning,
            if (mLang == "en") null else Tr("Thực ra là: {s}", mapOf("s" to it.mean)), it.whenText, d?.text.orEmpty(), d?.let { x -> regLabel(x.reg) }, d?.let { x -> WHY[x.reg]?.let { k -> Tr(k) } },
            d?.let { x -> if (x.masked) Tr("Câu thô lỗ – đã che") else Tr(x.text) }, d?.masked == true, w?.text.orEmpty(), w?.let { x -> regLabel(x.reg) }, w?.let { x -> WHY[x.reg]?.let { k -> Tr(k) } }, nextId(s, i)) }
    fun nextId(s: SaySeries, i: Int) = "say/" + s.id + "/" + s.items[(i + 1) % s.items.size].id
    fun link(s: SaySeries, c: SayCard) = SITE + "/" + s.id + "/" + c.id
    fun shareText(s: SaySeries, c: SayCard): Tr = Tr("“{s}” – nói như người bản xứ cùng Lexkite: {url}", mapOf("s" to c.say, "url" to link(s, c)))
    fun fileName(c: SayCard, tall: Boolean) = "lexkite-say-" + c.id + "-" + (if (tall) "4x5" else "1x1") + ".png"
    /** Mic feedback: ≥ 85 native-like, ≥ 60 close, else try again; followed by what was heard. */
    fun micText(score: Int, heard: String): Pair<Tr, String> = (if (score >= 85) Tr("Chuẩn như người bản xứ! {p}%", mapOf("p" to score)) else if (score >= 60) Tr("Gần đúng rồi – {p}%. Nghe lại và thử lần nữa nhé.", mapOf("p" to score)) else Tr("Chưa giống lắm ({p}%). Nghe từ tốn rồi nói lại nhé.", mapOf("p" to score))) to (if (heard.isNotEmpty()) " · “$heard”" else "")
    fun micError(code: String): Tr = when (code) { "not-allowed" -> Tr("Hãy cho phép dùng micro để luyện nói"); "unsupported" -> Tr("Trình duyệt này chưa hỗ trợ nhận giọng nói"); else -> Tr("Không nghe rõ – thử lại nhé") }
    fun seenSet(j: JsonElement?): Set<String> = (j as? JsonObject)?.keys ?: emptySet()
    fun seenWith(j: JsonElement?, key: String): JsonElement = JsonObject(LinkedHashMap((j as? JsonObject) ?: JsonObject(emptyMap())).also { it[key] = JsonPrimitive(1) })
}

/** #/reflex (web reflex.js): the 60-second game – pool of sentences, word colouring, the end result. */
object Reflex {
    const val SECONDS = 60; const val POOL_MAX = 40; const val YT_MS = 5600L; const val MAX_MISS = 3
    class Item(val kind: String, val text: String, val id: String = "", val t: Int = 0, val key: String = "")
    private val SP = Regex("\\s+"); private val NON = Regex("[^a-z0-9' ]+")
    /** reflex.js norm (keeps apostrophes, collapses spaces); NOT the same as Speak.norm. */
    fun norm(s: String?): String = (s ?: "").lowercase().replace('’', '\'').replace(NON, " ").replace(SP, " ").trim()
    private fun words(s: String?) = norm(s).split(' ').size
    /** A YouTube context of a saved card: id [\w-]{6,15} and the start second (`t`, `?t=65s`), or null. */
    fun ytOf(src: String?): Pair<String, Int>? {
        if (src == null) return null
        val m = Regex("^https?://([^/?#]+)([^?#]*)(?:\\?([^#]*))?").find(src) ?: return null
        val host = m.groupValues[1]; val path = m.groupValues[2]; val q = m.groupValues[3].split('&').filter { it.contains('=') }.associate { it.substringBefore('=') to it.substringAfter('=') }
        val id = if (Regex("youtu\\.be$").containsMatchIn(host)) path.removePrefix("/") else q["v"] ?: return null
        val t = Regex("^\\d+").find(q["t"].orEmpty().replace(Regex("s$"), ""))?.value?.toIntOrNull() ?: 0
        return if (Regex("^[\\w-]{6,15}$").matches(id)) id to t else null
    }
    /** The candidates in source order (before the shuffle): saved YouTube contexts, library examples with a clip (4–14 words), reading sentences (5–14 words, when fewer than 40). */
    fun sources(contexts: List<Pair<String, String>>, examples: List<String>, readings: List<String>, hasClip: (String) -> Boolean, clipKey: (String) -> String): List<Item> {
        val out = ArrayList<Item>()
        for ((text, src) in contexts) { val y = ytOf(src); val n = words(text); if (y != null && n in 3..16) out.add(Item("yt", text, y.first, y.second)) }
        for (ex in examples) { val n = words(ex); val k = if (n in 4..14) clipKey(ex) else ""; if (k.isNotEmpty() && hasClip(k)) out.add(Item("audio", ex, key = k)) }
        if (out.size < POOL_MAX) for (sen in readings) { val n = words(sen); val k = if (n in 5..14) clipKey(sen) else ""; if (k.isNotEmpty() && hasClip(k)) out.add(Item("audio", sen, key = k)) }
        return out
    }
    fun pool(src: List<Item>, rnd: () -> Double): List<Item> { val a = ArrayList(src); for (i in a.size - 1 downTo 1) { val j = Math.floor(rnd() * (i + 1)).toInt(); val t = a[i]; a[i] = a[j]; a[j] = t }; return a.take(POOL_MAX) }

    class Colored(val words: List<Pair<String, Boolean>>, val pct: Int, val shown: String)
    /** Words left→right: a target word counts when it appears within the next 4 heard words after the last match (order matters, apostrophes are kept). */
    fun colorize(target: String, heard: String): Colored {
        val want = norm(target).split(' '); val got = norm(heard).split(' '); var j = 0; var ok = 0
        val shown = target.split(SP).mapIndexed { i, tok -> val w = want.getOrElse(i) { "" }; var hit = false
            var k = j; while (k < minOf(got.size, j + 4)) { if (got[k] == w) { hit = true; j = k + 1; break }; k++ }
            if (hit) ok++; tok to hit }
        return Colored(shown, jsRound(ok.toDouble() / maxOf(1, want.size) * 100), heard.ifEmpty { "…" })
    }
    fun good(pct: Int) = pct >= 80
    class End(val n: Int, val avg: Int, val reward: Reward?) { val final = listOf(Tr("🏁"), Tr("Hết giờ!"), Tr("{n} câu · trung bình {p}%", mapOf("n" to n, "p" to avg))) }
    fun end(score: Int, done: Int): End = End(done, if (done != 0) jsRound(score.toDouble() / done) else 0, if (done != 0) Reward(mapOf("spoken" to done), 5 + done * 2) else null)
}
