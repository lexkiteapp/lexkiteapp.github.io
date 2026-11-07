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
class L10n(val lang: String, private val table: Map<String, String>, private val fallback: Map<String, String>) {
    val isRtl get() = lang in L10nLangs.RTL
    val locale: Locale get() = Locale.forLanguageTag(lang)
    operator fun invoke(key: L10nKey, vars: Map<String, Any> = emptyMap()): String {
        var s = table[key.id] ?: fallback[key.id] ?: key.id
        for ((k, v) in vars) s = s.replace("{$k}", if (v is Number) num(v) else v.toString())
        return s
    }
    fun has(key: L10nKey) = table.containsKey(key.id)
    /** Like web fmtInt / toLocaleString(lang): ar → Arabic-Indic digits, grouping per locale. */
    fun num(n: Number): String = NumberFormat.getIntegerInstance(locale).format(n)
    /** Language picker label: the language's own name, from the platform (no hand-written names). */
    fun nativeName(code: String): String = Locale.forLanguageTag(code).let { l -> l.getDisplayLanguage(l).replaceFirstChar { it.titlecase(l) } }

    companion object {
        fun preferred(language: String?): String = language?.take(2)?.lowercase()?.let { if (it == "in") "id" else it }?.takeIf { it in L10nLangs.ALL } ?: "en"
        fun parse(json: String): Map<String, String> = (Json.parseToJsonElement(json) as JsonObject).mapValues { it.value.jsonPrimitive.content }
        fun load(ctx: Context, lang: String): L10n {
            val l = if (lang in L10nLangs.ALL) lang else "en"
            fun read(x: String) = parse(ctx.assets.open("strings/$x.json").bufferedReader().use { it.readText() })
            return L10n(l, read(l), if (l == "en") emptyMap() else read("en"))
        }
    }
}
