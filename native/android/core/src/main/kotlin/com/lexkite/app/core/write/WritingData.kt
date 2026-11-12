package com.lexkite.app.core.write

import com.lexkite.app.core.vocab.JsLit
import com.lexkite.app.core.vocab.gs
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

/**
 * The writing content the web ships as scripts, read as data: ideas (`cpack/write/ideas.js`), letters (`js/write/gt-letters.js`), paraphrase pairs (`js/lib/paraphrase-data.js`),
 * annotated model answers (`cpack/write/models.js` + `cpack/write/models2..5.js + task1-more.js` + the model blocks of gt-letters/task2-more/task1-more*.js), Task 2 prompts (`js/write.js` + `WRITE_MORE`)
 * and Task 1 chart sets (`js/task1.js` + `TASK1_MORE`). Pass the texts in the order the web loads them.
 */
class WritingData(
    val ideas: List<JsonObject>, val letters: List<JsonObject>, val paraphrase: List<Pair<String, String>>, val models: List<JsonObject>, val prompts: List<JsonObject>, val task1: List<JsonObject>,
) {
    companion object {
        private fun arrayAt(t: String, i: Int): List<JsonElement> = (JsLit(t, i).value() as? JsonArray) ?: emptyList()
        private fun objs(l: List<JsonElement>) = l.mapNotNull { it as? JsonObject }

        fun ideas(text: String): List<JsonObject> { val i = text.indexOf("IDEAS = "); return if (i < 0) emptyList() else objs(arrayAt(text, i + 8)) }
        fun paraphrase(text: String): List<Pair<String, String>> {
            val i = text.indexOf("PARAPHRASE = "); if (i < 0) return emptyList()
            return arrayAt(text, i + 13).mapNotNull { r -> (r as? JsonArray)?.let { a -> (a.getOrNull(0)?.let { (it as? kotlinx.serialization.json.JsonPrimitive)?.content } ?: "") to ((a.getOrNull(1) as? kotlinx.serialization.json.JsonPrimitive)?.content ?: "") } }
        }
        /** `X = (X || []).concat([ … ])` / `X = X.concat([ … ])` / `X = [ … ].concat(X || [])` blocks of one script, applied to `cur` the way the web evaluates them. */
        fun concatInto(name: String, cur: List<JsonObject>, text: String): List<JsonObject> {
            var out = cur
            for (m in Regex("\\b$name = ").findAll(text)) {
                val i = m.range.last + 1
                if (text[i] == '[') { val p = JsLit(text, i); val own = objs((p.value() as? JsonArray) ?: emptyList()); out = if (text.startsWith(".concat(", p.i)) own + out else own }
                else { val k = text.indexOf(".concat(", i); if (k >= 0) out = out + objs(arrayAt(text, k + 8)) }
            }
            return out
        }
        /** Task 2 prompts: `T('id','type','topic','text')` rows of write.js, then `WRITE_MORE` rows `[id,type,topic,text]` (ids already present are skipped). */
        fun prompts(writeJs: String, moreScripts: List<String>): List<JsonObject> {
            val out = ArrayList<JsonObject>(); val ids = HashSet<String>()
            fun add(a: List<JsonElement>) { val id = a.getOrNull(0)?.let { (it as? kotlinx.serialization.json.JsonPrimitive)?.content } ?: return; if (ids.add(id)) out.add(com.lexkite.app.core.vocab.jo("id" to id, "type" to a.getOrNull(1), "topic" to a.getOrNull(2), "text" to a.getOrNull(3))) }
            for (m in Regex("\\bT\\((?=')").findAll(writeJs)) add(JsLit(writeJs, m.range.last + 1).args())
            for (t in moreScripts) { val i = t.indexOf("WRITE_MORE = "); if (i < 0) continue; val k = t.indexOf(".concat(", i); if (k >= 0) arrayAt(t, k + 8).forEach { (it as? JsonArray)?.let { r -> add(r.toList()) } } }
            return out
        }
        /** Task 1 sets: `const SETS = [ … ]` of task1.js + `TASK1_MORE` blocks (duplicates by id skipped). */
        fun task1(task1Js: String, moreScripts: List<String>): List<JsonObject> {
            val i = task1Js.indexOf("const SETS = ["); var out = if (i < 0) emptyList() else objs(arrayAt(task1Js, i + 13))
            var more: List<JsonObject> = emptyList()
            for (t in moreScripts) more = concatInto("TASK1_MORE", more, t)
            val ids = out.map { it.gs("id") }.toMutableSet()
            out = out + more.filter { ids.add(it.gs("id")) }
            return out
        }
        /** Build everything from script texts. `modelScripts` = the files that define MODELS / GT_LETTERS in web load order. */
        fun fromScripts(ideasJs: String, paraphraseJs: String, modelScripts: List<String>, writeJs: String, writeMore: List<String>, task1Js: String, task1More: List<String>): WritingData {
            var models: List<JsonObject> = emptyList(); var letters: List<JsonObject> = emptyList()
            for (t in modelScripts) { models = concatInto("MODELS", models, t); letters = concatInto("GT_LETTERS", letters, t) }
            return WritingData(ideas(ideasJs), letters, paraphrase(paraphraseJs), models, prompts(writeJs, writeMore), task1(task1Js, task1More))
        }
    }
}
