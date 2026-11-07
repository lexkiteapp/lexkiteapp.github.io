package com.lexkite.app.core.sync

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import java.math.BigDecimal

/**
 * JavaScript value semantics over kotlinx JSON, so the sync merge is a line-by-line port of web/js/sync.js.
 * Convention: Kotlin `null` = JS `undefined` (absent key); [JsonNull] = JS `null`.
 */
object Js {
    val ZERO: JsonPrimitive = JsonPrimitive(0)
    val EMPTY = JsonObject(emptyMap())

    fun prop(e: JsonElement?, k: String): JsonElement? = (e as? JsonObject)?.get(k)
    fun obj(e: JsonElement?): JsonObject? = e as? JsonObject
    /** `{ ...e }` – spreading undefined/null/primitives gives `{}`. */
    fun spread(e: JsonElement?): LinkedHashMap<String, JsonElement> = LinkedHashMap((e as? JsonObject) ?: EMPTY)
    fun entries(e: JsonElement?): Set<Map.Entry<String, JsonElement>> = ((e as? JsonObject) ?: EMPTY).entries

    fun isNumber(e: JsonElement?) = e is JsonPrimitive && e !is JsonNull && !e.isString && e.booleanOrNull == null
    fun isString(e: JsonElement?) = e is JsonPrimitive && e.isString

    fun truthy(e: JsonElement?): Boolean = when (e) {
        null, JsonNull -> false
        is JsonPrimitive -> when {
            e.isString -> e.content.isNotEmpty()
            e.booleanOrNull != null -> e.booleanOrNull!!
            else -> { val d = e.content.toDouble(); d != 0.0 && !d.isNaN() }
        }
        else -> true
    }
    /** `e || d` */
    fun or(e: JsonElement?, d: JsonElement?): JsonElement? = if (truthy(e)) e else d

    /** JS ToNumber (unary `+`). */
    fun num(e: JsonElement?): Double = when (e) {
        null -> Double.NaN
        JsonNull -> 0.0
        is JsonPrimitive -> when {
            e.isString -> { val s = e.content.trim(); if (s.isEmpty()) 0.0 else if (s.last().isLetter() && !s.endsWith("Infinity")) Double.NaN else s.toDoubleOrNull() ?: Double.NaN }
            e.booleanOrNull != null -> if (e.booleanOrNull!!) 1.0 else 0.0
            else -> e.content.toDouble()
        }
        is JsonArray -> if (e.isEmpty()) 0.0 else if (e.size == 1) num(e[0]) else Double.NaN
        else -> Double.NaN
    }

    /** A JS number as JSON (NaN/±Infinity serialise as null, like JSON.stringify). */
    fun number(d: Double): JsonElement = when {
        d.isNaN() || d.isInfinite() -> JsonNull
        d == kotlin.math.floor(d) && kotlin.math.abs(d) < 9.0e15 -> JsonPrimitive(d.toLong())
        else -> JsonPrimitive(d)
    }

    /** `Math.max(a, b)` keeping the original JSON literal when one operand wins (byte-identical output). */
    fun max(a: JsonElement?, b: JsonElement?): JsonElement = pick(a, b, java.lang.Math.max(num(a), num(b)))
    fun min(a: JsonElement?, b: JsonElement?): JsonElement = pick(a, b, java.lang.Math.min(num(a), num(b)))
    private fun pick(a: JsonElement?, b: JsonElement?, r: Double): JsonElement = when {
        r.isNaN() -> JsonNull
        isNumber(a) && num(a) == r -> a!!
        isNumber(b) && num(b) == r -> b!!
        else -> number(r)
    }

    /** JS `x > y` for JSON operands (strings compare by UTF-16 units, else numerically; NaN → false). */
    fun gt(x: JsonElement?, y: JsonElement?): Boolean {
        if (isString(x) && isString(y)) return (x as JsonPrimitive).content > (y as JsonPrimitive).content
        val a = num(x); val b = num(y); return a > b
    }
    fun ge(x: JsonElement?, y: JsonElement?): Boolean {
        if (isString(x) && isString(y)) return (x as JsonPrimitive).content >= (y as JsonPrimitive).content
        val a = num(x); val b = num(y); return a >= b
    }

    /** JS `===` for JSON values (objects/arrays: identity – never equal across two parsed documents unless same instance). */
    fun strictEq(x: JsonElement?, y: JsonElement?): Boolean = when {
        x == null || y == null -> x == null && y == null
        x === y -> true
        x is JsonNull || y is JsonNull -> x is JsonNull && y is JsonNull
        x is JsonPrimitive && y is JsonPrimitive -> when {
            x.isString || y.isString -> x.isString && y.isString && x.content == y.content
            x.booleanOrNull != null || y.booleanOrNull != null -> x.booleanOrNull == y.booleanOrNull
            else -> { val a = x.content.toDouble(); val b = y.content.toDouble(); a == b }
        }
        else -> false
    }

    /** JS Number.prototype.toString (shortest round-trip, JS exponent rules). */
    fun numStr(d: Double): String {
        if (d.isNaN()) return "NaN"
        if (d.isInfinite()) return if (d > 0) "Infinity" else "-Infinity"
        if (d == 0.0) return "0"
        if (d < 0) return "-" + numStr(-d)
        val bd = BigDecimal(d.toString()).stripTrailingZeros()
        val digits = bd.unscaledValue().toString()
        val k = digits.length
        val n = k - bd.scale() // decimal point position
        return when {
            n in k..21 -> digits + "0".repeat(n - k)
            n in 1..21 -> digits.substring(0, n) + "." + digits.substring(n)
            n in -5..0 -> "0." + "0".repeat(-n) + digits
            else -> { val e = n - 1; val es = (if (e >= 0) "+" else "-") + kotlin.math.abs(e); if (k == 1) digits + "e" + es else digits[0] + "." + digits.substring(1) + "e" + es }
        }
    }

    /** JSON.stringify. `sortKeys` = the `stable()` replacer of web/js/sync.js (keys sorted, then JS property order). */
    fun stringify(e: JsonElement?, sortKeys: Boolean = false): String = StringBuilder().also { write(it, e, sortKeys) }.toString()

    private fun write(sb: StringBuilder, e: JsonElement?, sort: Boolean) {
        when (e) {
            null, JsonNull -> sb.append("null")
            is JsonPrimitive -> when {
                e.isString -> quote(sb, e.content)
                e.booleanOrNull != null -> sb.append(e.content)
                else -> { val d = e.content.toDouble(); sb.append(if (d.isNaN() || d.isInfinite()) "null" else numStr(d)) }
            }
            is JsonArray -> { sb.append('['); e.forEachIndexed { i, x -> if (i > 0) sb.append(','); write(sb, x, sort) }; sb.append(']') }
            is JsonObject -> {
                sb.append('{'); var first = true
                for (k in order(e.keys.toList(), sort)) { if (!first) sb.append(','); first = false; quote(sb, k); sb.append(':'); write(sb, e[k], sort) }
                sb.append('}')
            }
        }
    }

    /** JS own-property order: array-index keys ascending first, then the others in insertion order. */
    fun order(keys: List<String>, sort: Boolean): List<String> {
        val ks = if (sort) keys.sorted() else keys
        val (idx, rest) = ks.partition { isIndex(it) }
        return idx.sortedBy { it.toLong() } + rest
    }
    private fun isIndex(k: String) = k.isNotEmpty() && k.length <= 10 && k.all { it in '0'..'9' } && (k == "0" || k[0] != '0') && k.toLong() < 4294967295L

    private fun quote(sb: StringBuilder, s: String) {
        sb.append('"')
        var i = 0
        while (i < s.length) {
            val c = s[i]
            when {
                c == '"' -> sb.append("\\\"")
                c == '\\' -> sb.append("\\\\")
                c == '\b' -> sb.append("\\b")
                c == '\u000C' -> sb.append("\\f")
                c == '\n' -> sb.append("\\n")
                c == '\r' -> sb.append("\\r")
                c == '\t' -> sb.append("\\t")
                c < ' ' -> sb.append("\\u").append(String.format("%04x", c.code))
                c.isHighSurrogate() && i + 1 < s.length && s[i + 1].isLowSurrogate() -> { sb.append(c).append(s[i + 1]); i++ }
                c.isSurrogate() -> sb.append("\\u").append(String.format("%04x", c.code))
                else -> sb.append(c)
            }
            i++
        }
        sb.append('"')
    }

    /** UTF-16 string compare (JS `<`/`>` on strings). */
    fun less(a: String, b: String) = a < b
}
