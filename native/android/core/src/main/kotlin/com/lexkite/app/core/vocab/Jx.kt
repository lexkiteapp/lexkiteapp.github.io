package com.lexkite.app.core.vocab

import com.lexkite.app.core.sync.Js
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Marks a key that is absent (JS `undefined`) when building objects with [jo]. */
internal object Absent

/** Kotlin value -> JSON (integral doubles become integers so `3.0` prints as `3`). */
internal fun je(x: Any?): JsonElement = when (x) {
    null -> JsonNull
    is JsonElement -> x
    is String -> JsonPrimitive(x)
    is Boolean -> JsonPrimitive(x)
    is Int -> JsonPrimitive(x)
    is Long -> JsonPrimitive(x)
    is Double -> if (x.isFinite() && x == Math.floor(x) && Math.abs(x) < 1e15) JsonPrimitive(x.toLong()) else JsonPrimitive(x)
    is Map<*, *> -> JsonObject(LinkedHashMap<String, JsonElement>().also { m -> for ((k, v) in x) if (v !== Absent) m[k.toString()] = je(v) })
    is Iterable<*> -> JsonArray(x.map { je(it) })
    is Array<*> -> JsonArray(x.map { je(it) })
    else -> JsonPrimitive(x.toString())
}

internal fun jo(vararg p: Pair<String, Any?>): JsonObject = JsonObject(LinkedHashMap<String, JsonElement>().also { m -> for ((k, v) in p) if (v !== Absent) m[k] = je(v) })
internal fun JsonObject.cp(vararg p: Pair<String, Any?>): JsonObject = JsonObject(LinkedHashMap(this).also { m -> for ((k, v) in p) if (v === Absent) m.remove(k) else m[k] = je(v) })

/** JS `String(x ?? '')` for a JSON value (objects/arrays give ""). */
internal fun JsonElement?.s(): String = when (this) { null, is JsonNull -> ""; is JsonPrimitive -> content; else -> "" }
internal fun JsonObject?.gs(k: String): String = this?.get(k).s()
internal fun JsonObject?.gn(k: String, d: Double = 0.0): Double { val e = this?.get(k); return if (e == null || e is JsonNull) d else Js.num(e).let { if (it.isNaN()) d else it } }
internal fun JsonObject?.ga(k: String): List<JsonElement> = (this?.get(k) as? JsonArray) ?: emptyList()
internal fun JsonObject?.go(k: String): JsonObject? = this?.get(k) as? JsonObject
internal fun JsonObject?.gt(k: String): Boolean = Js.truthy(this?.get(k))
internal fun JsonObject?.gl(k: String): Long? { val e = this?.get(k); return if (e == null || e is JsonNull || !Js.truthy(e)) null else Js.num(e).toLong() }
internal fun JsonObject?.strs(k: String): List<String> = ga(k).map { it.s() }

/** JS whitespace class (String.prototype.trim / \s). */
internal const val JSWS = "[\\s\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000\\ufeff]"
internal val WS_RUN = Regex("$JSWS+")
internal fun String.jsTrim(): String = trim { it.isWhitespace() || it == '﻿' || it == ' ' }

/**
 * UI translation seam: key (the web's Vietnamese source string) + `{name}` variables -> text. Default = the web fallback
 * (variables substituted into the key itself), so JVM tests and logic need no L10n.
 */
fun interface Tx { fun t(key: String, vars: Map<String, String>?): String
    companion object {
        val RAW = Tx { k, v -> var s = k; if (v != null) for ((a, b) in v) s = s.replace("{$a}", b); s }
    }
}
