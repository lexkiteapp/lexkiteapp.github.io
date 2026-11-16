package com.lexkite.app.core.verbs

import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/** Example-sentence and common-mistake content of web/js/verbs-core.js (OBJ, COMP, TIME, SUBJ, MIS, MODAL_MIS), read from the generated verbs.json (never typed here). */
internal class VerbText(private val o: JsonObject) {
    private fun strs(k: String): Map<String, String> = o.getValue(k).jsonObject.mapValues { it.value.jsonPrimitive.content }
    private fun triple(e: kotlinx.serialization.json.JsonElement) = e.jsonArray.let { Triple(it[0].jsonPrimitive.content, it[1].jsonPrimitive.content, it[2].jsonPrimitive.content) }
    val OBJ: Map<String, String> = strs("OBJ")
    val COMP: Map<String, String> = strs("COMP")
    val TIME: Map<String, String> = strs("TIME")
    val SUBJ: Map<String, Pair<String, String>> = o.getValue("SUBJ").jsonObject.mapValues { (_, v) -> v.jsonArray.let { it[0].jsonPrimitive.content to it[1].jsonPrimitive.content } }
    /** base -> (wrong, right, code) */
    val MIS: Map<String, List<Triple<String, String, String>>> = o.getValue("MIS").jsonObject.mapValues { (_, v) -> v.jsonArray.map { triple(it) } }
    val MODAL_MIS: List<Triple<String, String, String>> = o.getValue("MODAL_MIS").jsonArray.map { triple(it) }
}
