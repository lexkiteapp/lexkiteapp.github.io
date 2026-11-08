package com.lexkite.app.feature.vocab

import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.core.sync.WebCards
import com.lexkite.app.core.vocab.CardMath
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Files the deck screen reads and writes: the JSON backup (`{cards, stats, game}`, read back by Deck.importBackup) and the Anki text / CSV formats of web/js/anki.js. */
internal object DeckIo {
    fun backupJson(d: SyncDoc, now: Long): String = Json.encodeToString(JsonElement.serializer(),
        obj("v" to 1, "exported" to now, "cards" to JsonObject(d.cards), "stats" to d.stats, "game" to d.game))

    private fun esc(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    private fun clean(s: String) = s.replace(Regex("[\\t\\r\\n]+"), " ").trim()
    private fun cell(s: String, sep: String) = if (Regex("[\"\\n\\r]").containsMatchIn(s) || s.contains(sep) || Regex("^\\s|\\s$").containsMatchIn(s)) "\"" + s.replace("\"", "\"\"") + "\"" else s

    /** Anki "Basic" text import: Front / Back / Tags, tab separated, with the `#` header lines Anki understands. */
    fun ankiText(cards: Collection<JsonObject>, deckName: String): String {
        val rows = cards.filter { it.gt("word") }.map { c ->
            val front = "<b>" + esc(clean(c.gs("word"))) + "</b>" + (if (c.gt("ipa")) "<br><span>" + esc(clean(c.gs("ipa"))) + "</span>" else "")
            val back = listOf(c.gs("vi").takeIf { it.isNotEmpty() }?.let { "<b>" + esc(clean(it)) + "</b>" }, c.gs("def").takeIf { it.isNotEmpty() && it != c.gs("vi") }?.let { esc(clean(it)) },
                c.gs("ex").takeIf { it.isNotEmpty() }?.let { "<i>" + esc(clean(it)) + "</i>" }).filterNotNull().joinToString("<br>")
            val tags = listOf("lexkite", c.gs("topic").takeIf { it.isNotEmpty() && it != "mine" }, c.gs("level").takeIf { it.isNotEmpty() }).filterNotNull().joinToString(" ") { it.replace(Regex("\\s+"), "_") }
            listOf(front, back, tags).joinToString("\t") { cell(it, "\t") }
        }
        return "#separator:tab\n#html:true\n#notetype:Basic\n#deck:" + clean(deckName) + "\n#columns:Front\tBack\tTags\n#tags column:3\n" + rows.joinToString("\n") + "\n"
    }

    class Parsed(val rows: List<List<String>>, val deck: String, val hasHeader: Boolean)
    private val SEPS = mapOf("comma" to ',', "semicolon" to ';', "tab" to '\t', "space" to ' ', "pipe" to '|', "colon" to ':')

    /** Delimited text with Anki's `#key:value` header lines, quoted cells and a guessed separator (tab · ; · , · |). */
    fun parse(text0: String): Parsed {
        val text = text0.removePrefix("﻿"); var pos = 0; var sep: Char? = null; var deck = ""; var cols = false
        while (pos < text.length && text[pos] == '#') {
            val end = text.indexOf('\n', pos).let { if (it < 0) text.length else it }
            val line = text.substring(pos + 1, end).trimEnd('\r'); val m = Regex("^([a-z ]+):(.*)$", RegexOption.IGNORE_CASE).find(line)
            if (m != null) { val k = m.groupValues[1].trim().lowercase(); val v = m.groupValues[2]
                if (k == "separator") sep = SEPS[v.trim().lowercase()] ?: v.trim().firstOrNull() else if (k == "deck") deck = v.trim() else if (k == "columns") cols = true }
            pos = minOf(text.length, end + 1)
        }
        val body = text.substring(pos)
        if (sep == null) {
            val sample = body.take(8000).replace(Regex("\"(?:[^\"]|\"\")*\""), "").split(Regex("\\r?\\n")).filter { it.isNotBlank() }.take(20)
            var best = '\t'; var bestScore = 0
            for (c in listOf('\t', ';', ',', '|')) { val counts = sample.map { l -> l.count { it == c } }; val hit = counts.count { it > 0 }; val score = hit * 10 - counts.toSet().size; if (hit > 0 && score > bestScore) { best = c; bestScore = score } }
            sep = best
        }
        val rows = ArrayList<List<String>>(); var row = ArrayList<String>(); val f = StringBuilder(); var q = false; var start = true; var i = 0
        while (i < body.length) {
            val ch = body[i]
            if (q) { if (ch == '"') { if (i + 1 < body.length && body[i + 1] == '"') { f.append('"'); i++ } else q = false } else f.append(ch); i++; continue }
            if (ch == '"' && start) { q = true; start = false; i++; continue }
            if (ch == sep) { row.add(f.toString()); f.clear(); start = true; i++; continue }
            if (ch == '\n' || ch == '\r') { if (ch == '\r' && i + 1 < body.length && body[i + 1] == '\n') i++; row.add(f.toString()); rows.add(row); row = ArrayList(); f.clear(); start = true; i++; continue }
            f.append(ch); start = false; i++
        }
        if (f.isNotEmpty() || row.isNotEmpty()) { row.add(f.toString()); rows.add(row) }
        val data = rows.filter { r -> r.any { it.isNotBlank() } }
        val head = data.firstOrNull()?.firstOrNull().orEmpty().trim().lowercase()
        val header = !cols && Regex("^(word|words|term|front|vocab|vocabulary|english|từ|từ vựng)$").matches(head)
        return Parsed(if (header) data.drop(1) else data, deck, header)
    }

    private fun plain(html: String): List<String> = html.replace(Regex("<br\\s*/?>|</div>|</p>", RegexOption.IGNORE_CASE), "\n").replace(Regex("<[^>]*>"), "")
        .replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">").replace("&amp;", "&").lines().map { it.trim() }.filter { it.isNotEmpty() }

    /** New cards from an Anki text / CSV file: column 1 = word (second line = phonetic), column 2 = meaning (then definition, example); existing words are skipped. */
    class Imported(val cards: Map<String, JsonObject>, val duplicates: Int, val deck: String)
    fun importText(text: String, fileName: String, existing: Map<String, JsonObject>, now: Long): Imported {
        val p = parse(text)
        val deck = (p.deck.ifEmpty { fileName.substringBeforeLast('.') }).substringAfterLast("::").trim().take(60).ifEmpty { "Anki" }
        val out = LinkedHashMap<String, JsonObject>(); var dup = 0
        p.rows.forEachIndexed { i, r ->
            val front = plain(r.getOrElse(0) { "" }); val back = plain(r.getOrElse(1) { "" })
            val word = front.firstOrNull().orEmpty().take(60); if (word.isEmpty()) return@forEachIndexed
            val key = CardMath.keyOf(word)
            if (existing.containsKey(key) || out.containsKey(key)) { dup++; return@forEachIndexed }
            val ipa = front.getOrElse(1) { "" }.takeIf { it.startsWith("/") || it.startsWith("[") }.orEmpty().trim('/', '[', ']')
            val entry = obj("word" to word, "ipa" to ipa, "vi" to back.firstOrNull().orEmpty(), "def" to back.getOrElse(1) { "" }, "ex" to back.getOrElse(2) { "" }, "topic" to "anki")
            out[key] = WebCards.make(entry, now, mapOf("deck" to JsonPrimitive(deck), "added" to JsonPrimitive(now - p.rows.size + i)))
        }
        return Imported(out, dup, deck)
    }
}
