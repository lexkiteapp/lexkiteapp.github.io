package com.lexkite.app.core.audio

/**
 * C04 pure audio logic – port of web/js/audio.js (genderOf, kokoro, genderFor, voiceScore, rank, pickVoice, fnv36), the CDN block of
 * web/js/ui.js (AUDIO_BASES, audioUrls, ttsClean), web/js/listen/kvoice.js (lineKey, split). Verified by vectors/audio.json.
 */
object AudioLogic {
    /** Origins in priority order (web AUDIO_BASES). */
    val BASES = listOf("https://audio.lexkite.com/audio/l/", "https://lexkiteapp.github.io/lexkite-media-2/audio/l/", "https://lexkiteapp.github.io/audio/l/")
    /** Whisper-checked single-word files carry this key suffix (web WAV). */
    const val WORD_SUFFIX = "|s3"
    const val TIMEOUT_MS = 7000L
    const val SENT_GAP_MS = 280L

    private val VOICES = mapOf("ama" to "af_heart", "carlos" to "am_michael")
    fun voiceOf(who: String): String? = VOICES[who]

    /** FNV-1a 32-bit over UTF-16 code units, base 36 (web fnv36 / KVoice hash). */
    fun fnv36(s: String): String {
        var h = 0x811c9dc5.toInt()
        for (c in s) h = (h xor c.code) * 0x01000193
        return java.lang.Long.toString(h.toLong() and 0xFFFFFFFFL, 36)
    }
    fun lineKey(voice: String, text: String) = fnv36(voice + "|" + text.trim())
    fun wordKey(voice: String, headword: String) = fnv36(voice + "|" + headword.trim() + WORD_SUFFIX)
    /** Default Kokoro voice for a single word per accent (web Target.wordVoice). */
    fun wordVoice(accent: String) = if (accent == "en-US") "af_heart" else "bf_emma"

    /** URLs to try, in order: bases from `min(2, fails >> 1)`; kind `l` = sentence (maybe `-s2`), `w` = word. */
    fun urls(key: String, kind: String = "l", fails: Int = 0, s2: Set<String> = emptySet()): List<String> {
        val at = minOf(BASES.size - 1, fails shr 1)
        val k = if (kind == "l" && key in s2) "$key-s2" else key
        return BASES.drop(at).map { b -> (if (kind == "w") b.removeSuffix("l/") + "w/" else b) + k + ".mp3" }
    }

    // ---- splitting (KVoice.split) ----
    private val SENT = Regex("[^.!?;:]+[.!?;:]+[\"”’)]*|[^.!?;:]+\\z")
    fun split(text: String): List<String> {
        val parts = SENT.findAll(jsCollapse(text)).map { it.value }.toList().ifEmpty { listOf(text) }
        val out = ArrayList<String>()
        for (raw in parts) {
            var p = raw.trim(); if (p.isEmpty()) continue
            while (p.length > 220) {
                val comma = p.lastIndexOf(',', 200)
                var cut = if (comma > 60) comma + 1 else p.lastIndexOf(' ', 200)
                if (cut <= 0) cut = 200
                out.add(p.substring(0, cut).trim()); p = p.substring(cut).trim()
            }
            out.add(p)
        }
        return out
    }

    // ---- ttsClean (ui.js) ----
    private val WS = Regex("[\\s\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\uFEFF]+")
    private fun jsCollapse(s: String) = WS.replace(s, " ")
    private const val M = "\u0001"
    private val IPA = Regex("(^|\\s)/[^\\s/](?:[^/\\n]{0,78}[^\\s/])?/(?=[\\s,.;:!?)]|$)")
    private const val POS = "n|v|adj|adv|det|prep|pron|conj|int|num|aux|modal|phr\\.? ?v|noun|verb|adjective|adverb|determiner|preposition|pronoun|conjunction|phrasal verb|idiom"
    private val LBL = listOf("Ví dụ", "Example", "Câu ví dụ", "Câu của bạn", "Your sentence", "Ngữ cảnh của bạn", "Định nghĩa", "Definition")
    private fun lb(l: List<String>) = l.joinToString("|") { Regex.escape(it) }
    private val LABEL_SPLIT = Regex("$M\\s*(?:${lb(LBL.take(5))})\\s*:?", RegexOption.IGNORE_CASE)
    private val TAG = Regex("$M\\s*(?:UK|US|BrE|AmE|(?:$POS)\\.?|${lb(LBL)})(?=[\\s:.,$M]|$)\\s*:?", RegexOption.IGNORE_CASE)
    private val SPACE_PUNCT = Regex("\\s+([,.;:!?])")
    private val EDGE = Regex("^[\\s,.;:·•|–—-]+|[\\s,;:·•|–—-]+$")

    /** Extended_Pictographic + regional indicators / skin tones / variation selectors / ZWJ / keycap (ICU property classes are not on API 24). */
    private fun isEmoji(cp: Int) = cp in 0x1F300..0x1FAFF || cp in 0x1F000..0x1F2FF || cp in 0x2600..0x27BF || cp in 0x2300..0x23FF || cp in 0x2B00..0x2BFF ||
        cp in 0x1F1E6..0x1F1FF || cp in 0x1F3FB..0x1F3FF || cp == 0xFE0E || cp == 0xFE0F || cp == 0x200D || cp == 0x20E3 ||
        cp == 0xA9 || cp == 0xAE || cp == 0x203C || cp == 0x2049 || cp == 0x2122 || cp == 0x2139 || cp in 0x2194..0x21AA || cp == 0x24C2 ||
        cp in 0x25AA..0x25FE || cp in 0x2934..0x2935 || cp == 0x3030 || cp == 0x303D || cp == 0x3297 || cp == 0x3299

    private fun hasEmoji(s: String): Boolean { var i = 0; while (i < s.length) { val cp = s.codePointAt(i); if (isEmoji(cp)) return true; i += Character.charCount(cp) }; return false }
    private fun replaceEmojiRuns(s: String): String {
        val sb = StringBuilder(); var i = 0; var inRun = false
        while (i < s.length) {
            val cp = s.codePointAt(i)
            if (isEmoji(cp)) { if (!inRun) { sb.append(' ').append(M).append(' '); inRun = true } } else { inRun = false; sb.appendCodePoint(cp) }
            i += Character.charCount(cp)
        }
        return sb.toString()
    }

    /** Cleans text before reading it aloud: drops emoji, /ipa/, UK/US, part-of-speech and section labels. Plain sentences are returned unchanged. */
    fun ttsClean(text: String?): String {
        var s = jsCollapse(text ?: "").trim()
        if (s.isEmpty() || !(hasEmoji(s) || IPA.containsMatchIn(s))) return s
        s = replaceEmojiRuns(s)
        s = IPA.replace(s) { m -> m.groupValues[1] + M + " " }
        val parts = LABEL_SPLIT.split(s)
        if (parts.size > 1 && parts.last().any { it in 'A'..'Z' || it in 'a'..'z' }) s = parts.last()
        var i = 0
        while (i < 16 && TAG.containsMatchIn(s)) { s = TAG.replaceFirst(s, M); i++ }
        s = jsCollapse(s.split(M).joinToString(" "))
        s = SPACE_PUNCT.replace(s, "$1")
        return EDGE.replace(s, "").trim()
    }

    // ---- system voices (audio.js) ----
    private val FEM = Regex("\\b(Female|Samantha|Ava|Allison|Susan|Zoe|Serena|Kate|Martha|Libby|Sonia|Jenny|Aria|Ana|Karen|Moira|Tessa|Fiona|Victoria|Joanna|Salli|Kimberly|Ivy|Kendra|Emma|Amy|Hazel|Zira|Catherine|Nicky|Stephanie|Michelle|Emily|Olivia|Sara|Nancy|Heather|Jane|Ashley|Cora|Elizabeth|Maisie|Bella|Abbi|Hollie|Shelley|Sandy|Flo|Grandma|Kathy|Vicki)\\b", RegexOption.IGNORE_CASE)
    private val MALE = Regex("\\b(Male|Daniel|Oliver|Arthur|Tom|Evan|Alex|Fred|Ryan|Guy|Davis|Christopher|Eric|Brian|Matthew|Joey|Justin|George|David|Mark|James|Aaron|Rishi|Reed|Rocko|Eddy|Gordon|Lee|Nathan|Thomas|Andrew|Roger|Steffan|Tony|Jason|Ralph|Albert|Junior|Grandpa|Alfie|Elliot|Noah|Ethan|William|Jacob|Bruce)\\b", RegexOption.IGNORE_CASE)
    private val FEMALE_WORD = Regex("Female", RegexOption.IGNORE_CASE)
    private val MALE_WORD = Regex("Male", RegexOption.IGNORE_CASE)

    /** 'f' | 'm' | '' from a system voice name. */
    fun genderOf(name: String?): String {
        val n = name ?: ""; val f = FEM.containsMatchIn(n); val m = MALE.containsMatchIn(n)
        return if (f && !m) "f" else if (m && !f) "m" else if (FEMALE_WORD.containsMatchIn(n)) "f" else if (MALE_WORD.containsMatchIn(n)) "m" else ""
    }
    data class Kokoro(val accent: String, val gender: String)
    private val KOKORO = Regex("^([ab])([fm])_")
    fun kokoro(id: String?): Kokoro? = KOKORO.find(id ?: "")?.let { Kokoro(if (it.groupValues[1] == "a") "en-US" else "en-GB", it.groupValues[2]) }
    /** Speaker (ama/carlos, Kokoro id or 'f'/'m') → wanted gender. */
    fun genderFor(who: String?): String {
        if (who == "f" || who == "m") return who
        kokoro(who)?.let { return it.gender }
        return when (who) { "carlos" -> "m"; "ama" -> "f"; else -> "" }
    }

    class SysVoice(val name: String, val lang: String, val localService: Boolean? = null)
    private val NEURAL = Regex("Natural|Neural|Online", RegexOption.IGNORE_CASE)
    private val GOOGLE = Regex("^Google (UK|US) English", RegexOption.IGNORE_CASE)
    private val PREMIUM = Regex("Premium|Enhanced|Siri", RegexOption.IGNORE_CASE)
    private val NICE = Regex("Daniel|Serena|Kate|Oliver|Arthur|Martha|Samantha|Ava|Evan|Zoe|Allison|Tom|Susan", RegexOption.IGNORE_CASE)
    private val NOVELTY = Regex("Fred|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Zarvox|Trinoids|Whisper|Junior|Ralph|Kathy|Jester|Organ|Superstar|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley", RegexOption.IGNORE_CASE)

    /** Rank score for a system voice (-1 = reject). English accents only (the app has no other target tables). */
    fun voiceScore(v: SysVoice, accent: String, gender: String): Int {
        var s = 0
        val n = v.name; val lang = v.lang.replaceFirst('_', '-')
        if (lang == accent) s += 100 else if (lang.startsWith("en")) s += 10 else return -1
        if (NEURAL.containsMatchIn(n)) s += 60
        if (GOOGLE.containsMatchIn(n)) s += 50
        if (PREMIUM.containsMatchIn(n)) s += 45
        if (NICE.containsMatchIn(n)) s += 20
        if (NOVELTY.containsMatchIn(n)) s -= 200
        if (v.localService == false) s += 5
        if (gender.isNotEmpty()) { val gv = genderOf(n); if (gv == gender) s += 150 else if (gv.isNotEmpty()) s -= 150 }
        return s
    }
    fun rank(voices: List<SysVoice>, accent: String, gender: String): List<SysVoice> =
        voices.map { it to voiceScore(it, accent, gender) }.filter { it.second > 0 }.sortedByDescending { it.second }.map { it.first }
    /** The voice the user chose in Settings if it matches the requested gender, else the best-scoring one. */
    fun pickVoice(voices: List<SysVoice>, accent: String, gender: String, want: String? = null): SysVoice? {
        val list = rank(voices, accent, gender)
        val mine = if (want.isNullOrEmpty()) null else list.find { it.name == want }
        return (if (mine != null && (gender.isEmpty() || genderOf(mine.name).isEmpty() || genderOf(mine.name) == gender)) mine else null) ?: list.firstOrNull()
    }
}
