package com.lexkite.app.core.lesson

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/** Web ships these two data files as `self.NAME = <json>;` scripts (cpack/lesson/stories.js, js/lesson/gold.js): the native app reads the JSON part. */
object LessonData {
    const val STORIES_URL = "https://lexkite.com/cpack/lesson/stories.js"
    const val GOLD_URL = "https://lexkite.com/js/lesson/gold.js"

    fun jsAssignment(text: String): JsonElement? {
        val a = text.indexOf("= ", text.indexOf("self.")).takeIf { it >= 0 } ?: return null
        val body = text.substring(a + 1).trim().removeSuffix(";").trim()
        return runCatching { Json.parseToJsonElement(body) }.getOrNull()
    }
    fun stories(text: String): List<JsonObject> = (jsAssignment(text) as? JsonArray)?.mapNotNull { it as? JsonObject } ?: emptyList()

    /** One entry of the gold bank: why · wrong → right phrase · memory tip · examples. */
    class Gold(val why: String, val w: String, val r: String, val mem: String, val ex: List<String>)
    fun gold(text: String): Map<String, List<Gold>> {
        val o = jsAssignment(text) as? JsonObject ?: return emptyMap()
        fun s(e: JsonObject, k: String) = (e[k] as? kotlinx.serialization.json.JsonPrimitive)?.content.orEmpty()
        return o.mapValues { (_, v) -> (v as? JsonArray).orEmpty().mapNotNull { it as? JsonObject }.map { g ->
            Gold(s(g, "why"), s(g, "w"), s(g, "r"), s(g, "mem"), (g["ex"] as? JsonArray).orEmpty().map { (it as kotlinx.serialization.json.JsonPrimitive).content })
        } }
    }
}
