package com.lexkite.app.i18n

import android.content.Context
import com.lexkite.app.i18n.generated.L10nKey
import com.lexkite.app.i18n.generated.L10nLangs
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Runtime strings for the 15 UI languages; same semantics as web t(): `{name}` placeholders, fallback → en → key. */
class L10n(val lang: String, private val table: Map<String, String>, private val fallback: Map<String, String>) {
    val isRtl get() = lang in L10nLangs.RTL
    operator fun invoke(key: L10nKey, vars: Map<String, Any> = emptyMap()): String {
        var s = table[key.id] ?: fallback[key.id] ?: key.id
        for ((k, v) in vars) s = s.replace("{$k}", v.toString())
        return s
    }
    fun has(key: L10nKey) = table.containsKey(key.id)

    companion object {
        fun preferred(language: String?): String = language?.take(2)?.lowercase()?.takeIf { it in L10nLangs.ALL } ?: "en"
        fun parse(json: String): Map<String, String> = (Json.parseToJsonElement(json) as JsonObject).mapValues { it.value.jsonPrimitive.content }
        fun load(ctx: Context, lang: String): L10n {
            val l = if (lang in L10nLangs.ALL) lang else "en"
            fun read(x: String) = parse(ctx.assets.open("strings/$x.json").bufferedReader().use { it.readText() })
            return L10n(l, read(l), if (l == "en") emptyMap() else read("en"))
        }
    }
}
