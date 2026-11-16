package com.lexkite.app.i18n

import android.content.Context
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.i18n.generated.L10nLangs
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.text.NumberFormat
import java.util.Locale

/** Runtime strings for the 15 UI languages (C10); same semantics as web t(): `{name}` placeholders, fallback → en → key. */
class L10n(val lang: String, private val table: Map<String, String>, private val fallback: Map<String, String>, private val viTable: Map<String, String> = emptyMap(), private val westernDigits: Boolean = false) {
    val isRtl get() = lang in L10nLangs.RTL
    val locale: Locale get() = Locale.forLanguageTag(lang)
    operator fun invoke(key: L10nKey, vars: Map<String, Any> = emptyMap()): String {
        var s = table[key.id] ?: fallback[key.id] ?: key.id
        for ((k, v) in vars) s = s.replace("{$k}", if (v is Number) num(v) else v.toString())
        return s
    }
    fun has(key: L10nKey) = table.containsKey(key.id)
    /** Vietnamese source text (the key a web `t()` call receives) -> id, built once from the Vietnamese table. */
    private val sourceIndex: Map<String, String> by lazy { HashMap<String, String>().also { m -> for ((k, v) in viTable) m.putIfAbsent(v, k) } }
    /** A stored Vietnamese source text in the UI language; null when no id carries that text (same as iOS L10n.translate(source:)). */
    fun translate(source: String): String? = sourceIndex[source]?.let { table[it] ?: fallback[it] }
    /** [translate], unknown keys stay as they are. */
    fun src(source: String): String = translate(source) ?: source
    /** Like web fmtInt / toLocaleString(lang): ar → Arabic-Indic digits, grouping per locale ([western] = Latin digits). */
    fun num(n: Number): String = NumberFormat.getIntegerInstance(if (westernDigits) Locale.forLanguageTag(lang + "-u-nu-latn") else locale).format(n)
    /** Same strings with Latin digits: the word / writing screens interpolate plain Latin digits ("3/10") as iOS does; one screen must not mix two digit styles. */
    fun western(): L10n = if (westernDigits || lang != "ar") this else westernCopy
    private val westernCopy by lazy { L10n(lang, table, fallback, viTable, true) }
    /** Language picker label: the language's own name, from the platform (no hand-written names). */
    fun nativeName(code: String): String = Locale.forLanguageTag(code).let { l -> l.getDisplayLanguage(l).replaceFirstChar { it.titlecase(l) } }

    companion object {
        fun preferred(language: String?): String = language?.take(2)?.lowercase()?.let { if (it == "in") "id" else it }?.takeIf { it in L10nLangs.ALL } ?: "en"
        fun parse(json: String): Map<String, String> = (Json.parseToJsonElement(json) as JsonObject).mapValues { it.value.jsonPrimitive.content }
        fun load(ctx: Context, lang: String): L10n {
            val l = if (lang in L10nLangs.ALL) lang else "en"
            fun read(x: String) = parse(ctx.assets.open("strings/$x.json").bufferedReader().use { it.readText() })
            val own = read(l)
            return L10n(l, own, if (l == "en") emptyMap() else read("en"), if (l == "vi") own else read("vi"))
        }
    }
}
