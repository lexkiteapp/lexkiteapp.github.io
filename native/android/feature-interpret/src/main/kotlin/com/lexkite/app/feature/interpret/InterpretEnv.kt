package com.lexkite.app.feature.interpret

import com.lexkite.app.core.interpret.Interpret
import com.lexkite.app.feature.lesson.SpeechInput
import com.lexkite.app.feature.vocab.VocabEnv
import com.lexkite.app.feature.vocab.WordEnv
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** A translation and where it came from: [local] = the on-device model (works offline, audio and text never leave the phone). */
data class Translated(val text: String, val local: Boolean)

/** On-device translation (ML Kit). A pack is downloaded ONLY by [download], which the UI calls from a tap (Wi-Fi only); [translate] never downloads. */
interface Translator {
    /** null = not possible now (no pack for the pair, unsupported language, error). */
    suspend fun translate(text: String, from: String, to: String): Translated?
    /** Both directions of the pair ready (true) or not (false); Wi-Fi only. */
    suspend fun download(a: String, b: String): Boolean
}
/** Language id (ML Kit, bundled model). */
interface LangId { suspend fun detect(text: String): Interpret.Detected? }
/** Text to speech in the language of the text ([lang] = UI language code). */
interface Voice { fun speak(text: String, lang: String, rate: Float = 1f, done: () -> Unit = {}); fun stop() }

/** Everything the Interpreter needs from the app graph (fakes in tests: no microphone, no model, no network). */
class InterpretEnv(
    val vocab: VocabEnv, val word: WordEnv, val me: String, val speech: SpeechInput, val translator: Translator, val langId: LangId, val voice: Voice,
    private val loadPhrases: suspend () -> Interpret.Phrases?,
    val now: () -> Long = System::currentTimeMillis,
) {
    suspend fun phrases(): Interpret.Phrases? = loadPhrases()

    // ---------- device storage (web localStorage keys, never synced) ----------
    suspend fun history(): Interpret.History = Interpret.parse((vocab.store.get(HISTORY) as? JsonPrimitive)?.content)
    suspend fun saveHistory(h: Interpret.History) { vocab.store.put(mapOf(HISTORY to JsonPrimitive(Interpret.encode(h))), local = false) }
    suspend fun clearHistory() { vocab.store.put(mapOf(HISTORY to null), local = false) }
    suspend fun pair(): Interpret.Pair2 {
        val o = runCatching { kotlinx.serialization.json.Json.parseToJsonElement((vocab.store.get(PAIR) as? JsonPrimitive)?.content.orEmpty()) as? JsonObject }.getOrNull()
        return Interpret.fixPair((o?.get("a") as? JsonPrimitive)?.content, (o?.get("b") as? JsonPrimitive)?.content, me)
    }
    suspend fun savePair(p: Interpret.Pair2) { vocab.store.put(mapOf(PAIR to JsonPrimitive("""{"a":"${p.a}","b":"${p.b}"}""")), local = false) }

    /** Sổ từ: the foreign phrase with its meaning in the learner's language (pos "phrase", topic "interpret"), no per-word enrichment. */
    suspend fun saveCards(list: List<Interpret.Card>) {
        for (c in list) word.addWord(JsonObject(mapOf("word" to JsonPrimitive(c.word), "def" to JsonPrimitive(c.def), "pos" to JsonPrimitive("phrase"), "emoji" to JsonPrimitive("🗣️"), "topic" to JsonPrimitive("interpret"))),
            JsonObject(mapOf("text" to JsonPrimitive(c.def), "title" to JsonPrimitive("interpret"))), silent = true)
    }
    /** Known words of the learner's deck (lower-case keys) so the recap does not list them as new. */
    suspend fun known(): Set<String> = word.cards().keys

    companion object { const val HISTORY = "lk.interp.v1"; const val PAIR = "lk.interp.pair" }
}
