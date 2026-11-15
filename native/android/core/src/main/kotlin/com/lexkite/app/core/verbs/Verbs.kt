package com.lexkite.app.core.verbs

import com.lexkite.app.core.vocab.Absent
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.jo
import com.lexkite.app.core.vocab.s
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** The conjugation tables of web/js/verbs-core.js, exported once to `native/shared/gen/verbs.json` (Android asset `verbs.json`). */
class VerbData internal constructor(
    val irr: String, val common: List<String>, val modals: Map<String, List<String>>, val intrans: Set<String>, val stative: Set<String>, val dual: Set<String>, val double: Set<String>,
    val lBoth: Set<String>, val lNone: Set<String>, val lUkx: Set<String>, val noPass: Set<String>, val ukDouble: Set<String>, val seS: Set<String>, val ghF: Set<String>, val kEnd: Set<String>,
    internal val text: VerbText,
    /** web `VI_TYPO` (hỏi/ngã fixes of Google's Vietnamese) → `DictCfg.viTypo` */
    val viTypo: Map<String, String>,
    /** phrases.js lemmatizer tables `{IRR, BASE_EXTRA, KEEP}` → `Lemmatizer` (write package) */
    val lemma: JsonObject,
    /** phrase-model grammar exercise: families of forms (rise/rose/risen…) */
    val forms: List<List<String>>,
) {
    companion object {
        fun parse(text: String): VerbData {
            val o = Json.parseToJsonElement(text).jsonObject
            fun set(k: String) = o.getValue(k).jsonArray.map { it.jsonPrimitive.content }.toSet()
            return VerbData(o.getValue("IRR").jsonPrimitive.content, o.getValue("COMMON").jsonArray.map { it.jsonPrimitive.content },
                o.getValue("MODALS").jsonObject.mapValues { (_, v) -> v.jsonArray.map { it.jsonPrimitive.content } },
                set("INTRANS"), set("STATIVE"), set("DUAL"), set("DOUBLE"), set("L_BOTH"), set("L_NONE"), set("L_UKX"), set("NOPASS"), set("UK_DOUBLE"), set("SE_S"), set("GH_F"), set("K_END"),
                VerbText(o), o.getValue("VI_TYPO").jsonObject.mapValues { it.value.jsonPrimitive.content }, o.getValue("LEMMA").jsonObject,
                o.getValue("FORMS").jsonArray.map { r -> r.jsonArray.map { it.jsonPrimitive.content } })
        }
    }
}

/** One spelling of a verb form, with an optional UK/US tag. */
class Var(val w: String, val tag: String? = null) { fun json() = jo("w" to w, "tag" to (tag ?: Absent)) }
private class Sfx(val list: List<Var>, val rule: String)
private class Snd(val ipa: String, val why: String, val end: String) { fun json() = jo("ipa" to ipa, "why" to why, "end" to end) }

/** Result of [Verbs.forms]: the five forms + spelling rules + pronunciation of -ed/-s + usage flags. `P/PP/ING/S` are the picks for the chosen region (used in the tables). */
class Forms(
    val base: String, val irregular: Boolean, val partial: Boolean, val past: List<Var>, val pp: List<Var>, val ing: List<Var>, val s: List<Var>,
    val ruleEd: String, val ruleIng: String, val ruleS: String, val P: String, val PP: String, val ING: String, val S: String,
    internal val ed: Any?, internal val sz: Any?, val transitive: Boolean, val passive: Boolean, val stative: Boolean, val dual: Boolean, val known: Boolean, val region: String,
) {
    fun json() = jo("base" to base, "irregular" to irregular, "partial" to partial, "past" to past.map { it.json() }, "pp" to pp.map { it.json() }, "ing" to ing.map { it.json() }, "s" to s.map { it.json() },
        "rules" to jo("ed" to ruleEd, "ing" to ruleIng, "s" to ruleS), "P" to P, "PP" to PP, "ING" to ING, "S" to S, "ed" to (ed as? Snd)?.json(), "sz" to (sz as Snd).json(),
        "transitive" to transitive, "passive" to passive, "stative" to stative, "dual" to dual, "known" to known, "region" to region)
    /** Pronunciation of the -ed ending: (ipa, why, end) or null when the verb has no regular past. */
    val edSound: Triple<String, String, String>? get() = (ed as? Snd)?.let { Triple(it.ipa, it.why, it.end) }
    val sSound: Triple<String, String, String> get() = (sz as Snd).let { Triple(it.ipa, it.why, it.end) }
}

/** English verb engine: resolve a typed form to its base, the five forms, tense tables, common mistakes, search suggestions. Port of web/js/verbs-core.js. */
class Verbs(private val d: VerbData) {
    private class Tense(val id: String, val g: String, val en: String, val lesson: String, val fa: String, val fp: String?, val act: (String, Forms) -> List<String>, val simple: String? = null,
                        val pas: ((String) -> List<String>)? = null, val cont: Boolean = false, val modal: String? = null)

    // ---------- tables ----------
    private val irreg = LinkedHashMap<String, Pair<List<Var>, List<Var>>>()
    private val rev = HashMap<String, MutableList<String>>()
    private val extra = HashSet<String>()
    private val order: List<String>
    private val known0: Set<String>
    private fun parseVar(s: String) = s.split("/").map { x -> val i = x.indexOf(':'); if (i >= 0) Var(x.substring(0, i), x.substring(i + 1)) else Var(x) }
    init {
        for (row in d.irr.split("|")) {
            val p = row.split(" "); val b = p[0]; val past = parseVar(p[1]); val pp = parseVar(p[2])
            irreg[b] = past to pp
            for (v in past + pp) if (v.w != b) { val l = rev.getOrPut(v.w) { ArrayList() }; if (!l.contains(b)) l.add(b) }
        }
        known0 = (d.common + irreg.keys).toSet()
        order = (d.common + irreg.keys).distinct()
    }
    private fun known(w: String) = known0.contains(w) || extra.contains(w)
    /** Add verbs from the word library (lower-case a-z words) so unknown forms resolve better. */
    fun addKnown(list: Collection<String>) { for (w in list) { val x = w.lowercase(); if (Regex("^[a-z]+$").matches(x) && x.length > 1) extra.add(x) } }
    val modals get() = d.modals
    fun modal(b: String): List<String>? = d.modals[b]
    fun isIrregular(b: String) = irreg.containsKey(b)
    fun knownVerb(w: String) = known(w) || irreg.containsKey(w) || d.modals.containsKey(w)

    // ---------- spelling ----------
    private fun cvc(w: String) = Regex("(^|[^aeiou]|qu)[aeiou][^aeiouwxy]$").containsMatchIn(w) && !Regex("(^|[^q])[aeiou]{2}[^aeiou]$").containsMatchIn(w)
    private fun syllables(w: String) = (Regex("[aeiouy]+").findAll(w.replace(Regex("e$"), "").replace("qu", "q")).count()).let { if (it == 0) 1 else it }
    private fun doubling(b: String): String {
        if (d.double.contains(b)) return "both"
        if (d.lUkx.contains(b)) return "uk"
        if (!cvc(b)) return ""
        if (b.endsWith("l")) { if (d.lNone.contains(b)) return ""; if (syllables(b) == 1 || d.lBoth.contains(b)) return "both"; return "uk" }
        if (d.ukDouble.contains(b)) return "uk"
        return if (syllables(b) == 1) "both" else ""
    }
    private fun suffix(b: String, suf: String): Sfx {
        val ed = suf == "ed"
        if (b == "be") return Sfx(listOf(Var(if (ed) "been" else "being")), "")
        if (b.endsWith("ic")) return Sfx(listOf(Var(b + "k" + suf)), "ic")
        if (ed) {
            if (b.endsWith("e")) return Sfx(listOf(Var(b + "d")), "e")
            if (Regex("[^aeiou]y$").containsMatchIn(b)) return Sfx(listOf(Var(b.dropLast(1) + "ied")), "y")
        } else {
            if (b.endsWith("ie")) return Sfx(listOf(Var(b.dropLast(2) + "ying")), "ie")
            if (Regex("(ee|oe|ye)$").containsMatchIn(b) || Regex("^(singe|whinge|swinge|tinge)$").matches(b)) return Sfx(listOf(Var(b + "ing")), "keep-e")
            if (b == "age") return Sfx(listOf(Var("ageing", "UK"), Var("aging", "US")), "e")
            if (b == "queue") return Sfx(listOf(Var("queuing"), Var("queueing")), "e")
            if (b.endsWith("e")) return Sfx(listOf(Var(b.dropLast(1) + "ing")), "e")
        }
        return when (doubling(b)) {
            "both" -> Sfx(listOf(Var(b + b.last() + suf)), "double")
            "uk" -> Sfx(listOf(Var(b + b.last() + suf, "UK"), Var(b + suf, "US")), "double-uk")
            else -> Sfx(listOf(Var(b + suf)), "")
        }
    }
    private fun third(b: String): Sfx {
        if (b == "be") return Sfx(listOf(Var("is")), "irr")
        if (b == "have") return Sfx(listOf(Var("has")), "irr")
        if (Regex("^(quiz|whiz)$").matches(b)) return Sfx(listOf(Var(b + "zes")), "es")
        if (Regex("[^aeiou]y$").containsMatchIn(b)) return Sfx(listOf(Var(b.dropLast(1) + "ies")), "y")
        if (Regex("(s|sh|ch|x|z)$").containsMatchIn(b) && b != "stomach") return Sfx(listOf(Var(b + "es")), "es")
        if (Regex("[^aeiou]o$").containsMatchIn(b)) return Sfx(listOf(Var(b + "es")), "es")
        return Sfx(listOf(Var(b + "s")), "")
    }

    // ---------- sounds ----------
    private fun finalSound(b: String): String {
        if (d.kEnd.contains(b)) return "k"
        val m = listOf("tch$|ch$" to "ch", "sh$" to "sh", "dge$|ge$" to "j", "ce$" to "s", "the$" to "th1", "th$" to "th0", "gh$" to (if (d.ghF.contains(b)) "f" else "voiced"), "ph$" to "f", "que$" to "k", "(ze|zz|z)$" to "z", "x$" to "s", "ss$" to "s")
        for ((re, s) in m) if (Regex(re).containsMatchIn(b)) return s
        if (b.endsWith("se")) { if (d.seS.contains(b)) return "s"; if (Regex("[^aeiouwy]se$").containsMatchIn(b) && b != "cleanse") return "s"; return "z" }
        if (b.endsWith("s")) return "s"
        if (Regex("(ff|fe|f)$").containsMatchIn(b)) return "f"
        if (b.endsWith("ve")) return "v"
        if (Regex("(pe|p)$").containsMatchIn(b)) return "p"
        if (Regex("(ke|ck|k|c)$").containsMatchIn(b)) return "k"
        if (Regex("(te|tt|t)$").containsMatchIn(b)) return "t"
        if (Regex("(de|dd|d)$").containsMatchIn(b)) return "d"
        return "voiced"
    }
    private fun edSound(b: String): Snd { val s = finalSound(b); return if (s == "t" || s == "d") Snd("/ɪd/", "td", s) else if (Regex("^(s|sh|ch|p|k|f|th0)$").matches(s)) Snd("/t/", "vl", s) else Snd("/d/", "vd", s) }
    private val SAY_S = mapOf("says" to "/sez/", "does" to "/dʌz/", "has" to "/hæz/", "is" to "/ɪz/")
    private fun sSound(b: String): Snd { val s = finalSound(b); return if (Regex("^(s|z|sh|ch|j)$").matches(s)) Snd("/ɪz/", "sib", s) else if (Regex("^(p|t|k|f|th0)$").matches(s)) Snd("/s/", "vl", s) else Snd("/z/", "vd", s) }
    private val IPA_END = mapOf("t" to "/t/", "d" to "/d/", "s" to "/s/", "z" to "/z/", "sh" to "/ʃ/", "ch" to "/tʃ/", "j" to "/dʒ/", "p" to "/p/", "k" to "/k/", "f" to "/f/", "th0" to "/θ/", "th1" to "/ð/", "v" to "/v/", "voiced" to "")
    fun endIpa(f: String) = IPA_END[f] ?: ""

    // ---------- resolving ----------
    private val BE = mapOf("am" to "be", "is" to "be", "are" to "be", "was" to "be", "were" to "be", "been" to "be", "being" to "be", "isn't" to "be", "aren't" to "be", "wasn't" to "be", "weren't" to "be")
    private val AUX = mapOf("has" to "have", "had" to "have", "having" to "have", "hasn't" to "have", "haven't" to "have", "hadn't" to "have", "does" to "do", "did" to "do", "doing" to "do", "done" to "do", "don't" to "do", "doesn't" to "do", "didn't" to "do",
        "can't" to "can", "cannot" to "can", "couldn't" to "could", "won't" to "will", "wouldn't" to "would", "shouldn't" to "should", "mustn't" to "must", "shan't" to "shall", "ought" to "ought to")
    private fun clean(s: String?) = Regex("\\s+").replace((s ?: "").lowercase().replace(Regex("[’`]"), "'").replace(Regex("[^a-z' -]"), " "), " ").trim().replace(Regex("^to "), "")

    private class Alt(val base: String, val from: String) { fun json() = jo("base" to base, "from" to from) }
    private class Lemma(val base: String, val from: String, val alts: List<Alt>? = null, val guess: Boolean = false, val unknown: Boolean = false)
    private fun fromOf(b: String, w: String) = if (irreg.getValue(b).first.any { it.w == w }) "past" else "pp"

    private fun lemma(w: String): Lemma {
        BE[w]?.let { return Lemma("be", if (w == "been") "pp" else if (w == "being") "ing" else if (Regex("^(was|were)").containsMatchIn(w)) "past" else "present") }
        AUX[w]?.let { return Lemma(it, if (Regex("^(had|did)").containsMatchIn(w)) "past" else if (w.endsWith("ing")) "ing" else if (w == "done") "pp" else if (Regex("^(has|does)").containsMatchIn(w)) "s" else "base") }
        if (d.modals.containsKey(w)) return Lemma(w, "base")
        val rv = rev[w]
        if (known(w) && !(rv != null && !irreg.containsKey(w))) return Lemma(w, "base", rv?.map { Alt(it, fromOf(it, w)) } ?: emptyList())
        if (rv != null) { val b = rv[0]; val alts = rv.drop(1).map { Alt(it, fromOf(it, w)) }.toMutableList(); if (known(w)) alts.add(Alt(w, "base")); return Lemma(b, fromOf(b, w), alts) }
        val tries = ArrayList<Pair<String, String>>()
        var m: MatchResult? = null
        fun t(b: String, f: String) { tries.add(b to f) }
        if (Regex("^(.+)ies$").find(w).also { m = it } != null) { t(m!!.groupValues[1] + "y", "s"); t(m!!.groupValues[1] + "ie", "s") }
        else if (Regex("^(.+)es$").find(w).also { m = it } != null) { val g = m!!.groupValues[1]; t(g + "e", "s"); t(g, "s"); t(g.replace(Regex("zz$"), "z"), "s") }
        else if (Regex("^(.+[^s'])s$").find(w).also { m = it } != null) t(m!!.groupValues[1], "s")
        if (Regex("^(.+)ied$").find(w).also { m = it } != null) { t(m!!.groupValues[1] + "y", "past"); t(m!!.groupValues[1] + "ie", "past") }
        else if (Regex("^(.+)cked$").find(w).also { m = it } != null) { t(m!!.groupValues[1] + "c", "past"); t(m!!.groupValues[1] + "ck", "past") }
        else if (Regex("^(.+)ed$").find(w).also { m = it } != null) { val s = m!!.groupValues[1]; t(s + "e", "past"); t(s, "past"); if (Regex("([bdfgklmnprstvz])\\1$").containsMatchIn(s)) t(s.dropLast(1), "past") }
        if (Regex("^(.+)ying$").find(w).also { m = it } != null) { t(m!!.groupValues[1] + "ie", "ing"); t(m!!.groupValues[1] + "y", "ing") }
        else if (Regex("^(.+)cking$").find(w).also { m = it } != null) { t(m!!.groupValues[1] + "c", "ing"); t(m!!.groupValues[1] + "ck", "ing") }
        else if (Regex("^(.+)ing$").find(w).also { m = it } != null) {
            val s = m!!.groupValues[1]
            if (Regex("([bdfgklmnprstvz])\\1$").containsMatchIn(s)) { t(s.dropLast(1), "ing"); t(s, "ing") }
            else if (cvc(s) && syllables(s) == 1) { t(s + "e", "ing"); t(s, "ing") }
            else { t(s, "ing"); t(s + "e", "ing") }
        }
        for ((b, from) in tries) if (known(b)) return Lemma(b, from)
        if (tries.isNotEmpty()) {
            val (b0, from) = tries[0]; val guessE = Regex("(v|z|[^aeiou]c|dg|u|[bcdfgkptz]l)$")
            var b = b0
            if (from == "ing" || from == "past") {
                val s = if (from == "ing") w.dropLast(3) else w.replace(Regex("e?d$"), "")
                b = if (Regex("([bdgmnprt])\\1$").containsMatchIn(s)) s.dropLast(1) else if (guessE.containsMatchIn(s) || (cvc(s) && syllables(s) == 1)) s + "e" else s
                if (from == "past" && Regex("[^aeiou]i$").containsMatchIn(w.dropLast(2))) b = w.dropLast(3) + "y"
            }
            if (from == "s") b = if (Regex("(s|sh|ch|x|z|[^aeiou]o)es$").containsMatchIn(w)) w.dropLast(2) else if (Regex("[^aeiou]ies$").containsMatchIn(w)) w.dropLast(3) + "y" else w.dropLast(1)
            return Lemma(b, from, guess = true)
        }
        return Lemma(w, "base", unknown = !known(w))
    }

    /** resolve('went') = `{base:'go', from:'past', alts:[…], tail:'', modal:false, input:'went'}`; null for empty input. Flags `guess`/`unknown` mark spelling-rule guesses. */
    fun resolve(input: String?): JsonObject? {
        val s = clean(input); if (s.isEmpty()) return null
        if (d.modals.containsKey(s)) return jo("base" to s, "from" to "base", "modal" to true, "tail" to "")
        val parts = s.split(" "); val head = if (parts[0] == "ought") "ought to" else parts[0]
        if (head == "ought to") return jo("base" to "ought to", "from" to "base", "modal" to true, "tail" to "")
        val r = lemma(head)
        return jo("alts" to (r.alts ?: emptyList()).map { it.json() }, "tail" to parts.drop(1).joinToString(" "), "base" to r.base, "from" to r.from, "guess" to (if (r.guess) true else Absent), "unknown" to (if (r.unknown) true else Absent), "modal" to d.modals.containsKey(r.base), "input" to s)
    }

    // ---------- forms ----------
    private fun pickReg(list: List<Var>, region: String) = (list.firstOrNull { it.tag == null || it.tag == region } ?: list[0]).w
    fun forms(base: String, region: String = "UK"): Forms {
        val reg0 = if (region == "US") "US" else "UK"
        val irr = irreg[base]; val ing = suffix(base, "ing"); val s3 = third(base); val reg = suffix(base, "ed")
        fun isReg(x: Var) = reg.list.any { it.w == x.w }
        val past = irr?.first ?: reg.list; val pp = irr?.second ?: reg.list
        val irregular = base == "be" || (irr != null && (past.any { !isReg(it) } || pp.any { !isReg(it) }))
        val hasReg = irr == null || past.any { isReg(it) }
        return Forms(base, irregular, irregular && hasReg && base != "be", past, pp, ing.list, s3.list, if (hasReg && base != "be") reg.rule else "", ing.rule, s3.rule,
            pickReg(past, reg0), pickReg(pp, reg0), pickReg(ing.list, reg0), pickReg(s3.list, reg0),
            if (hasReg && base != "be") edSound(base) else null, SAY_S[s3.list[0].w]?.let { Snd(it, "irr", "") } ?: sSound(base),
            !d.intrans.contains(base) && base != "be" && !d.modals.containsKey(base), !d.intrans.contains(base) && !d.noPass.contains(base) && base != "be",
            d.stative.contains(base), d.dual.contains(base), known(base) || irr != null, reg0)
    }

    // ---------- tense tables ----------
    private val P = listOf("I" to "1s", "you" to "2", "he" to "3s", "we" to "1p", "they" to "3p")
    private val BE_PRES = mapOf("1s" to "am", "2" to "are", "3s" to "is", "1p" to "are", "3p" to "are")
    private val BE_PAST = mapOf("1s" to "was", "2" to "were", "3s" to "was", "1p" to "were", "3p" to "were")
    private fun have(p: String) = if (p == "3s") "has" else "have"
    private val NEG = mapOf("is" to "isn't", "are" to "aren't", "was" to "wasn't", "were" to "weren't", "have" to "haven't", "has" to "hasn't", "had" to "hadn't", "will" to "won't", "would" to "wouldn't", "can" to "can't", "could" to "couldn't", "should" to "shouldn't", "must" to "mustn't", "might" to "", "may" to "", "shall" to "shan't", "do" to "don't", "does" to "doesn't", "did" to "didn't")
    private val CON = mapOf("am" to "'m", "is" to "'s", "are" to "'re", "have" to "'ve", "has" to "'s", "had" to "'d", "will" to "'ll", "would" to "'d")
    private val TENSES: List<Tense> = listOf(
        Tense("ps", "present", "Present simple", "present-simple", "S + V(s/es)", "S + am/is/are + V3", { p, v -> if (v.base == "be") listOf(BE_PRES.getValue(p)) else listOf(if (p == "3s") v.S else v.base) }, "pres", { p -> listOf(BE_PRES.getValue(p)) }),
        Tense("pc", "present", "Present continuous", "present-continuous", "S + am/is/are + V-ing", "S + am/is/are + being + V3", { p, v -> listOf(BE_PRES.getValue(p), v.ING) }, null, { p -> listOf(BE_PRES.getValue(p), "being") }, cont = true),
        Tense("pp", "present", "Present perfect", "present-perfect", "S + have/has + V3", "S + have/has + been + V3", { p, v -> listOf(have(p), v.PP) }, null, { p -> listOf(have(p), "been") }),
        Tense("ppc", "present", "Present perfect continuous", "present-perfect-continuous", "S + have/has + been + V-ing", null, { p, v -> listOf(have(p), "been", v.ING) }, null, null, cont = true),
        Tense("pas", "past", "Past simple", "past-simple", "S + V2/-ed", "S + was/were + V3", { p, v -> if (v.base == "be") listOf(BE_PAST.getValue(p)) else listOf(v.P) }, "past", { p -> listOf(BE_PAST.getValue(p)) }),
        Tense("pac", "past", "Past continuous", "past-continuous", "S + was/were + V-ing", "S + was/were + being + V3", { p, v -> listOf(BE_PAST.getValue(p), v.ING) }, null, { p -> listOf(BE_PAST.getValue(p), "being") }, cont = true),
        Tense("pap", "past", "Past perfect", "past-perfect", "S + had + V3", "S + had + been + V3", { _, v -> listOf("had", v.PP) }, null, { _ -> listOf("had", "been") }),
        Tense("papc", "past", "Past perfect continuous", "past-perfect-continuous", "S + had + been + V-ing", null, { _, v -> listOf("had", "been", v.ING) }, null, null, cont = true),
        Tense("fs", "future", "Future simple", "future-forms", "S + will + V", "S + will + be + V3", { _, v -> listOf("will", v.base) }, null, { _ -> listOf("will", "be") }),
        Tense("gt", "future", "be going to", "future-forms", "S + am/is/are + going to + V", "S + am/is/are + going to + be + V3", { p, v -> listOf(BE_PRES.getValue(p), "going to", v.base) }, null, { p -> listOf(BE_PRES.getValue(p), "going to", "be") }),
        Tense("fc", "future", "Future continuous", "future-continuous-perfect", "S + will + be + V-ing", null, { _, v -> listOf("will", "be", v.ING) }, null, null, cont = true),
        Tense("fp", "future", "Future perfect", "future-continuous-perfect", "S + will + have + V3", "S + will + have + been + V3", { _, v -> listOf("will", "have", v.PP) }, null, { _ -> listOf("will", "have", "been") }),
        Tense("fpc", "future", "Future perfect continuous", "future-continuous-perfect", "S + will + have + been + V-ing", null, { _, v -> listOf("will", "have", "been", v.ING) }, null, null, cont = true),
        Tense("fip", "future", "Future in the past (would)", "future-in-past", "S + would + V", "S + would + be + V3", { _, v -> listOf("would", v.base) }, null, { _ -> listOf("would", "be") }),
        Tense("fipg", "future", "Future in the past (was going to)", "future-in-past", "S + was/were + going to + V", "S + was/were + going to + be + V3", { p, v -> listOf(BE_PAST.getValue(p), "going to", v.base) }, null, { p -> listOf(BE_PAST.getValue(p), "going to", "be") }),
    ) + listOf("should", "could", "would", "might", "may", "must").map { m ->
        Tense("m-$m", "modal", m[0].uppercaseChar() + m.substring(1) + " have + V3", if (m == "must" || m == "might" || m == "may" || m == "could") "modals-deduction" else if (m == "would") "conditionals-2-3" else "modals-obligation-advice",
            "S + $m + have + V3", "S + $m + have + been + V3", { _, v -> listOf(m, "have", v.PP) }, null, { _ -> listOf(m, "have", "been") }, modal = m)
    }
    val GROUPS = listOf("present", "past", "future", "modal")
    /** (id, group, English name) of every tense. */
    fun tenseList(): List<Triple<String, String, String>> = TENSES.map { Triple(it.id, it.g, it.en) }

    private fun cap(s: String) = if (s.isEmpty()) s else s[0].uppercaseChar() + s.substring(1)
    private fun join(a: List<String>) = Regex("\\s+").replace(a.filter { it.isNotEmpty() }.joinToString(" "), " ").trim()
    private class Sent(val aff: String, val affC: String?, val neg: String, val negC: String?, val q: String)
    private fun sentence(subj: String, p: String, chain: List<String>, base: String, simple: String?, tail: String): Sent {
        val t = if (tail.isNotEmpty()) " $tail" else ""
        var aux = chain.dropLast(1); var main = chain.last()
        if (chain.size == 1 && base == "be" && simple != null) { aux = chain; main = "" }
        if (aux.isEmpty()) {
            val dd = if (simple == "past") "did" else if (p == "3s") "does" else "do"
            return Sent(join(listOf(subj, main)) + t, null, join(listOf(subj, dd, "not", base)) + t, join(listOf(subj, NEG.getValue(dd), base)) + t, join(listOf(cap(dd), subj, base)) + t + "?")
        }
        val op = aux[0]; val rest = aux.drop(1)
        val affC = CON[op]?.let { join(listOf(subj + it) + rest + main) + t }
        val neg = join(listOf(subj, op, "not") + rest + main) + t
        val negC = if (op == "am") join(listOf("$subj'm", "not") + rest + main) + t else NEG[op]?.takeIf { it.isNotEmpty() }?.let { join(listOf(subj, it) + rest + main) + t }
        return Sent(join(listOf(subj) + aux + main) + t, affC, neg, negC, join(listOf(cap(op), subj) + rest + main) + t + "?")
    }
    private fun row(sj: String, p: String, s: Sent, q: String? = null, negC: String? = null) =
        jo("p" to p, "subj" to (if (sj == "he") "he/she/it" else sj), "aff" to s.aff, "affC" to (s.affC ?: Absent), "neg" to s.neg, "negC" to (negC ?: s.negC ?: Absent), "q" to (q ?: s.q))

    /** table('take', 'US'): 4 groups × tenses × 5 persons × affirmative/negative/question (+ passive); null for modals / empty input. `input` = typed text. */
    fun table(input: String, region: String = "UK"): JsonArray? = table(resolve(input), region)
    fun table(r: JsonObject?, region: String = "UK"): JsonArray? {
        if (r == null || r["modal"] == JsonPrimitive(true)) return null
        val v = forms(r.gs("base"), region); val tail = r.gs("tail")
        val passiveOk = v.passive && tail.isEmpty()
        return JsonArray(GROUPS.map { gid ->
            jo("id" to gid, "tenses" to TENSES.filter { it.g == gid }.map { x ->
                if (v.base == "be" && Regex("^(ppc|papc|fc|fpc)$").matches(x.id)) return@map jo("id" to x.id, "en" to x.en, "lesson" to x.lesson, "formula" to x.fa, "formulaP" to "", "rare" to true, "rows" to emptyList<Any>(), "passive" to null, "example" to jo("en" to "", "passive" to ""))
                val rows = P.map { (sj, p) ->
                    val s = sentence(sj, p, x.act(p, v), v.base, x.simple, tail)
                    when (x.modal) { "must" -> row(sj, p, s, q = "", negC = s.neg.replace("must not", "can't")); "may" -> row(sj, p, s, q = ""); else -> row(sj, p, s) }
                }
                val passive: Any? = if (passiveOk) (if (x.pas != null) P.map { (sj, p) -> row(sj, p, sentence(sj, p, x.pas.invoke(p) + v.PP, "be", null, "")) } else "rare") else null
                jo("id" to x.id, "en" to x.en, "lesson" to x.lesson, "formula" to x.fa, "formulaP" to (x.fp ?: ""), "cont" to x.cont, "stative" to (x.cont && v.stative), "dual" to (x.cont && v.dual && !v.stative && v.base != "be"),
                    "mustNote" to (x.modal == "must"), "rows" to rows, "passive" to passive, "example" to example(x, v, tail))
            })
        })
    }

    private fun example(x: Tense, v: Forms, tail: String): JsonObject {
        val (sj, p) = d.text.SUBJ.getValue(x.id); val b = v.base
        val obj = if (tail.isNotEmpty()) tail else if (v.transitive) (d.text.OBJ[b]?.ifEmpty { null } ?: d.text.COMP[b]?.ifEmpty { null } ?: "it") else (d.text.COMP[b] ?: "")
        val chain = x.act(p, v); val s = sentence(sj, p, chain, b, x.simple, "")
        var core = join(listOf(s.aff, obj))
        if (b == "be" && x.cont) core = join(listOf(sj) + chain + "very careful")
        val time = d.text.TIME[x.id] ?: ""
        val en = when (x.id) { "fip" -> "She said $core${if (time.isNotEmpty()) " $time" else ""}."; "fipg" -> "$core, but there was no time."; "m-would" -> "$core if I had known."; else -> "$core${if (time.isNotEmpty()) " $time" else ""}." }
        var pas = ""
        if (v.passive && tail.isEmpty() && x.pas != null && (d.text.OBJ[b]?.isNotEmpty() == true || d.text.COMP[b].isNullOrEmpty())) {
            val o = d.text.OBJ[b]?.ifEmpty { null } ?: "it"; val subj = if (o == "it") "It" else cap(o)
            val plural = Regex("[^su]s$").containsMatchIn(o) && !Regex("news$").containsMatchIn(o) && o != "maths"
            val pp = if (plural) "3p" else "3s"; val ps = sentence(subj, pp, x.pas.invoke(pp) + v.PP, "be", null, "")
            val first = Regex("^\\S+").replace(ps.aff) { it.value.lowercase() }
            pas = when (x.id) { "fip" -> "She said $first${if (time.isNotEmpty()) " $time" else ""}."; "fipg" -> "${ps.aff}, but there was no time."; "m-would" -> "${ps.aff} if I had known."; else -> "${ps.aff}${if (time.isNotEmpty()) " $time" else ""}." }
        }
        fun tidy(s: String) = Regex("\\s+([,.?])").replace(Regex("\\s+").replace(s, " "), "$1")
        return jo("en" to tidy(en), "passive" to pas)
    }

    // ---------- mistakes ----------
    /** Typical learner errors `{wrong, right, code, arg?}` (the UI translates the codes). */
    fun mistakes(base: String): JsonArray {
        if (d.modals.containsKey(base)) return JsonArray(d.text.MODAL_MIS.map { (w, r, c) -> jo("wrong" to w, "right" to r, "code" to c) })
        val f = forms(base); val out = ArrayList<JsonObject>(); val irr = irreg[base]
        fun add(wrong: String, right: String, code: String, arg: String? = null) { if (wrong != right && out.none { it.gs("wrong") == wrong }) out.add(jo("wrong" to wrong, "right" to right, "code" to code, "arg" to (arg ?: Absent))) }
        (d.text.MIS[base] ?: emptyList()).forEach { (w, r, c) -> add(w, r, c) }
        if (base == "be") return JsonArray(out)
        val reg = suffix(base, "ed").list[0].w
        if (irr != null && irr.first.none { it.w == reg }) add("Yesterday I $reg …", "Yesterday I ${f.past[0].w} …", "overreg", reg)
        if (d.stative.contains(base)) add("I am ${f.ING} …", "I $base …", "stative")
        if (irr != null && f.P != f.PP && base != "have") add("I have ${f.P} …", "I have ${f.PP} …", "have-v2")
        if (irr == null && (f.ruleEd == "double" || f.ruleEd == "y")) add(base + "ed", f.past[0].w, "sp-" + f.ruleEd)
        val si = when (f.ruleIng) { "e", "double", "ic" -> base + "ing"; "ie" -> base.replace(Regex("e$"), "") + "eing"; else -> null }
        if (si != null) add(si, f.ing[0].w, "sp-" + f.ruleIng)
        if (f.ruleS == "y") add(base + "s", f.s[0].w, "sp-ys")
        if (f.P != base) add("Did you ${f.P} …?", "Did you $base …?", "did-v2")
        if (base != "have") add("He doesn't ${f.S} …", "He doesn't $base …", "doesnt-s")
        return JsonArray(out.take(6))
    }

    // ---------- lists & suggestions ----------
    private fun pattern(b: String): String { val r = irreg.getValue(b); val p = r.first[0].w; val pp = r.second[0].w; return if (p == b && pp == b) "AAA" else if (p == pp) "ABB" else if (pp == b) "ABA" else "ABC" }
    /** Irregular verbs for the landing table: `{base, past:[{w,tag?}], pp, pattern: AAA|ABB|ABA|ABC}`. */
    fun irregularList(): List<JsonObject> = irreg.keys.filter { forms(it).irregular }.map { b -> jo("base" to b, "past" to irreg.getValue(b).first.map { it.json() }, "pp" to irreg.getValue(b).second.map { it.json() }, "pattern" to pattern(b)) }
    /** Landing-table filter: pattern chip (AAA/ABB/ABA/ABC or "" = all) AND base/any past/pp form starting with `prefix`. */
    fun irregularFilter(pattern: String, prefix: String): List<String> = irregularList().filter { x ->
        (pattern.isEmpty() || x.gs("pattern") == pattern) && (prefix.isEmpty() || (listOf(x.gs("base")) + x.ga("past").map { (it as JsonObject).gs("w") } + x.ga("pp").map { (it as JsonObject).gs("w") }).any { it.startsWith(prefix) })
    }.map { it.gs("base") }
    /** Search-box suggestions: `{base, via}`. */
    fun suggest(q: String?, n: Int = 8): JsonArray {
        val s = clean(q); if (s.isEmpty()) return JsonArray(emptyList())
        val out = ArrayList<JsonObject>(); val seen = HashSet<String>()
        fun push(base: String, via: String?) { if (seen.add(base) && out.size < n) out.add(jo("base" to base, "via" to (via ?: Absent))) }
        val r = resolve(s)
        if (r != null && r.gs("base") != s.split(" ")[0] && (known(r.gs("base")) || d.modals.containsKey(r.gs("base")))) push(r.gs("base"), s.split(" ")[0])
        for (m in d.modals.keys) if (m.startsWith(s)) push(m, null)
        for (v in order) if (v.startsWith(s)) push(v, null)
        for (v in extra) if (v.startsWith(s)) push(v, null)
        return JsonArray(out)
    }
    /** Is this dictionary entry a verb? -> base to open the conjugation page (went -> go, give up -> give up), else "". */
    fun verbOf(e: JsonObject?): String {
        if (e == null || !e.containsKey("word")) return ""
        val w = clean(e.gs("word")); if (w.isEmpty() || w.split(" ").size > 3) return ""
        val pos = (listOf(e.gs("pos")) + listOf("oxford", "meanings", "senses").flatMap { k -> e.ga(k).map { (it as? JsonObject).gs("pos") } }).joinToString(" ").lowercase()
        val r = resolve(w) ?: return ""
        if (r["modal"] == JsonPrimitive(true)) return r.gs("base")
        if (Regex("(^|[^a-z])(v|verb)([^a-z]|$)|động từ").containsMatchIn(pos) || (r.gs("from") != "base" && known(r.gs("base")))) return r.gs("base") + (if (r.gs("tail").isNotEmpty()) " " + r.gs("tail") else "")
        return ""
    }
}
