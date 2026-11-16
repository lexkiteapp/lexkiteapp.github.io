package com.lexkite.app.feature.vocab

import android.database.sqlite.SQLiteDatabase
import com.lexkite.app.core.vocab.CardMath
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.security.MessageDigest
import java.util.Calendar
import java.util.TimeZone
import java.util.zip.ZipEntry
import java.util.zip.ZipInputStream
import java.util.zip.ZipOutputStream
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Anki interchange (port of the core of web/js/anki.js, same as the iOS AnkiKit): a real `.apkg` (SQLite "collection.anki2", schema 11, in a ZIP) with the branded "Lexkite (EN)"
 * note type, and reading `.apkg` / `.colpkg` / loose `collection.anki2`. Everything stays on the device. The note type id and the field list never change (a later export updates
 * the same notes); guids are fixed per word, so exporting again only updates the cards in Anki.
 */
object AnkiKit {
    class Failure(val kind: Kind) : Exception(kind.name) { enum class Kind { NotAnki, NewFormat, Damaged, TooBig } }

    const val MODEL_ID = 1_729_000_000_101L
    val FIELDS = listOf("Word", "IPA", "Meaning", "Definition", "Example", "ExampleMeaning", "Collocations", "Audio")
    /** The collection was "created" 10 years ago, so "today" = day 3650 and overdue cards keep a positive due. */
    const val CRT_BACK = 3650
    private const val FOUR_H = 4 * 3_600_000L

    /** One card prepared for export. */
    class Item(val word: String, val ipa: String = "", val meaning: String = "", val def: String = "", val ex: String = "", val exMeaning: String = "",
               val col: List<String> = emptyList(), val tags: List<String> = emptyList(), val srs: JsonObject? = null)

    /** Web `itemOf`: a saved card -> the fields of the Anki note ([viMeanings]: the learner's meaning language is Vietnamese). */
    fun item(c: JsonObject, viMeanings: Boolean): Item {
        val meaning = CardMath.meanOf(c)
        val ctx = c.ga("contexts").firstOrNull { (it as? JsonObject).gt("text") } as? JsonObject
        val sent = c.ga("sentences").firstOrNull() as? JsonObject
        var ex = ""; var exMeaning = ""
        if (ctx != null) { val t = ctx.gs("text"); ex = if (t.length > 300) t.take(300) + "…" else t; exMeaning = if (viMeanings) ctx.gs("vi") else "" }
        else if (c.gt("ex")) { ex = c.gs("ex"); exMeaning = if (viMeanings && sent.gs("en") == ex) sent.gs("vi") else "" }
        else if (sent != null && sent.gt("en")) { ex = sent.gs("en"); exMeaning = if (viMeanings) sent.gs("vi") else "" }
        val topic = c.gs("topic")
        val tags = listOf("lexkite", if (topic != "mine") topic else "", c.gs("level"), if (c.gt("deck")) "anki:" + c.gs("deck") else "").filter { it.isNotEmpty() }
        return Item(c.gs("word"), c.gs("ipa"), meaning, if (c.gt("def") && c.gs("def") != meaning) c.gs("def") else "", ex, exMeaning, c.ga("col").map { it.vs() }, tags, c.go("srs"))
    }

    // ---- small helpers ----
    private fun esc(s: String) = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;")
    private fun fnv(s: String, seed: Long = 0x811c9dc5L): Long { var h = seed; for (ch in s) { h = h xor ch.code.toLong(); h = (h * 0x01000193L) and 0xFFFFFFFFL }; return h }
    private fun b62(n0: Long): String {
        val t = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"; var n = n0; val sb = StringBuilder()
        do { sb.insert(0, t[(n % 62).toInt()]); n /= 62 } while (n > 0)
        return sb.toString()
    }
    fun guid(key: String) = "lk" + b62(fnv(key)) + b62(fnv(key, 0x9747b28cL))
    private fun deckId(name: String) = 1_600_000_000_000L + fnv("deck:$name")
    private fun tagSafe(s: String) = s.trim().replace(Regex("\\s+"), "_").replace("\"", "").take(60)
    private fun highlight(ex: String, word: String): String {
        val e = esc(ex)
        if (word.isEmpty()) return e
        return Regex("\\b(" + Regex.escape(esc(word)) + "\\w*)", RegexOption.IGNORE_CASE).replace(e, "<b>$1</b>")
    }
    private fun checksum(s: String): Long { val h = MessageDigest.getInstance("SHA-1").digest(s.toByteArray(Charsets.UTF_8)); return ((h[0].toLong() and 0xFF) shl 24) or ((h[1].toLong() and 0xFF) shl 16) or ((h[2].toLong() and 0xFF) shl 8) or (h[3].toLong() and 0xFF) }
    /** Days since 1970 of the Anki day (a new day starts at 04:00 local time). */
    private fun ankiDay(ms: Long, tz: TimeZone): Int {
        val c = Calendar.getInstance(tz).apply { timeInMillis = ms - FOUR_H }
        val utc = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply { clear(); set(c.get(Calendar.YEAR), c.get(Calendar.MONTH), c.get(Calendar.DAY_OF_MONTH)) }
        return (utc.timeInMillis / 86_400_000L).toInt()
    }

    class Sched(val type: Int = 0, val queue: Int = 0, val due: Int = 0, val ivl: Int = 0, val factor: Int = 0, val reps: Int = 0, val lapses: Int = 0, val data: String = "")
    /** Lexkite review state -> Anki card. A card still in learning steps (not yet in the day schedule) stays a new card. */
    fun sched(srs: JsonObject?, now: Long, pos: Int, retention: Double, tz: TimeZone): Sched {
        if (srs == null) return Sched(due = pos)
        val c = CardMath.srsCard(srs, now)
        fun r4(x: Double) = Math.round(x * 1e4) / 1e4
        val mem = if (c.S != null && c.D != null) obj("s" to r4(c.S!!), "d" to r4(c.D!!), "dr" to retention).toString() else ""
        if (c.reps > 0 || (c.lapses > 0 && c.S != null)) {
            val today = ankiDay(now, tz); val dueDay = if (c.reps > 0) ankiDay(if (c.due != 0L) c.due else now, tz) else today
            val base = if (c.reps > 0) (if (c.interval > 0) c.interval.toDouble() else (c.S ?: 1.0)) else max(1.0, c.S ?: 1.0)
            val ef = c.D?.let { 1.3 + (10 - it) / 5 } ?: (if (c.ef > 0) c.ef else 2.5)
            return Sched(2, 2, CRT_BACK + (dueDay - today), max(1, base.roundToInt()), (min(3.1, max(1.3, ef)) * 1000).roundToInt(), c.reps + c.lapses, c.lapses, mem)
        }
        return Sched(due = pos)
    }

    // ---- export ----
    private const val CSS = ".card{font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,\"Helvetica Neue\",Arial,sans-serif;font-size:20px;line-height:1.5;text-align:center;color:rgb(23,24,39);background:rgb(255,247,234);margin:0;padding:12px}\n" +
        ".lk-card,.lk-back{max-width:560px;margin:12px auto;background:rgb(255,255,255);border-radius:22px;box-shadow:0 10px 30px rgba(15,61,62,.12);box-sizing:border-box}\n" +
        ".lk-card{padding:22px 20px 18px;border-top:6px solid rgb(15,61,62)}\n" +
        ".lk-brand{font-size:.62em;font-weight:800;letter-spacing:.04em;color:rgb(15,61,62);opacity:.6;margin-bottom:8px}.lk-brand b{color:rgb(204,63,28)}\n" +
        ".lk-word{font-size:2.1em;font-weight:800;color:rgb(15,61,62);line-height:1.15;word-break:break-word}\n" +
        ".lk-ipa{font-family:\"Lucida Sans Unicode\",\"Arial Unicode MS\",\"Segoe UI\",sans-serif;color:rgb(78,82,107);margin-top:6px;font-size:.95em}\n" +
        ".lk-audio{margin-top:8px}\nhr#answer{border:0;height:0;margin:0}\n.lk-back{padding:18px 20px;text-align:start}\n" +
        ".lk-meaning{font-size:1.3em;font-weight:800;color:rgb(176,55,24);text-align:center;word-break:break-word}\n" +
        ".lk-def{color:rgb(78,82,107);font-size:.82em;text-align:center;margin-top:4px}\n" +
        ".lk-ex{margin-top:14px;padding:10px 14px;border-left:4px solid rgb(255,176,84);background:rgb(255,247,234);border-radius:10px;font-size:.88em}\n" +
        ".lk-ex-en{font-style:italic}.lk-ex-en b{color:rgb(13,105,100);font-style:normal}\n.lk-ex-tr{color:rgb(78,82,107);margin-top:4px;font-size:.92em}\n.lk-col{margin-top:12px;font-size:.84em}\n" +
        ".lk-lbl{display:inline-block;font-size:.72em;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:rgb(13,105,100);background:rgb(221,241,238);padding:2px 9px;border-radius:99px;margin-right:6px;vertical-align:1px}\n" +
        ".nightMode.card,.night_mode.card,.nightMode .card,.night_mode .card{background:rgb(16,25,27);color:rgb(243,248,248)}\n" +
        ".nightMode .lk-card,.night_mode .lk-card,.nightMode .lk-back,.night_mode .lk-back{background:rgb(23,36,39);box-shadow:none;border-color:rgb(95,208,196)}\n" +
        ".nightMode .lk-word,.night_mode .lk-word,.nightMode .lk-brand,.night_mode .lk-brand{color:rgb(95,208,196)}\n.nightMode .lk-brand b,.night_mode .lk-brand b{color:rgb(255,132,102)}\n" +
        ".nightMode .lk-ipa,.night_mode .lk-ipa,.nightMode .lk-def,.night_mode .lk-def,.nightMode .lk-ex-tr,.night_mode .lk-ex-tr{color:rgb(163,185,183)}\n.nightMode .lk-meaning,.night_mode .lk-meaning{color:rgb(255,132,102)}\n" +
        ".nightMode .lk-ex,.night_mode .lk-ex{background:rgb(30,47,51)}\n.nightMode .lk-ex-en b,.night_mode .lk-ex-en b{color:rgb(95,208,196)}\n.nightMode .lk-lbl,.night_mode .lk-lbl{color:rgb(95,208,196);background:rgb(30,47,51)}\n"
    private const val QFMT = "<div class=\"lk-card\"><div class=\"lk-brand\">lex<b>kite</b></div><div class=\"lk-word\">{{Word}}</div>{{#IPA}}<div class=\"lk-ipa\">{{IPA}}</div>{{/IPA}}<div class=\"lk-audio\">{{#Audio}}{{Audio}}{{/Audio}}{{^Audio}}{{tts en_GB:Word}}{{/Audio}}</div></div>"
    private fun afmt(label: String) = "{{FrontSide}}<hr id=\"answer\"><div class=\"lk-back\"><div class=\"lk-meaning\">{{Meaning}}</div>{{#Definition}}<div class=\"lk-def\">{{Definition}}</div>{{/Definition}}{{#Example}}<div class=\"lk-ex\"><div class=\"lk-ex-en\">{{Example}}</div>{{#ExampleMeaning}}<div class=\"lk-ex-tr\">{{ExampleMeaning}}</div>{{/ExampleMeaning}}</div>{{/Example}}{{#Collocations}}<div class=\"lk-col\"><span class=\"lk-lbl\">" + esc(label) + "</span>{{Collocations}}</div>{{/Collocations}}</div>"

    class Built(val bytes: ByteArray, val count: Int)

    /** The `.apkg` bytes. [tmp] = a writable folder for the SQLite file; [progress] is called with 0..1. */
    fun buildApkg(items: List<Item>, tmp: File, deckName: String = "Lexkite", keepProgress: Boolean = false, retention: Double = 0.9, collocationsLabel: String = "Collocations",
                  now: Long, tz: TimeZone = TimeZone.getDefault(), progress: ((Double) -> Unit)? = null): Built {
        val sec = now / 1000; val did = deckId(deckName)
        val crtCal = Calendar.getInstance(tz).apply { timeInMillis = now - FOUR_H; add(Calendar.DAY_OF_MONTH, -CRT_BACK); set(Calendar.HOUR_OF_DAY, 12); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0) }
        val seen = HashSet<String>(); var id = now - items.size * 2L - 10
        val notes = ArrayList<Array<Any?>>(); val cards = ArrayList<Array<Any?>>()
        items.forEachIndexed { i, it ->
            val word = it.word.trim(); val key = word.lowercase()
            if (word.isEmpty() || !seen.add(key)) return@forEachIndexed
            val flds = listOf(esc(word), esc(it.ipa), esc(it.meaning), esc(it.def), highlight(it.ex, word), esc(it.exMeaning), it.col.joinToString(" · ") { c -> esc(c) }, "")
            id++; val nid = id; id++; val cid = id
            val tags = ArrayList<String>(); for (t in it.tags.map { x -> tagSafe(x) }) if (t.isNotEmpty() && t !in tags) tags.add(t)
            notes.add(arrayOf(nid, guid(key), MODEL_ID, sec, -1L, if (tags.isEmpty()) "" else " " + tags.joinToString(" ") + " ", flds.joinToString("\u001F"), word, checksum(word), 0L, ""))
            val sc = sched(if (keepProgress) it.srs else null, now, notes.size, retention, tz)
            cards.add(arrayOf(cid, nid, did, 0L, sec, -1L, sc.type.toLong(), sc.queue.toLong(), sc.due.toLong(), sc.ivl.toLong(), sc.factor.toLong(), sc.reps.toLong(), sc.lapses.toLong(), 0L, 0L, 0L, 0L, sc.data))
            if (i % 500 == 0) progress?.invoke(i.toDouble() / max(1, items.size))
        }
        val conf = obj("activeDecks" to listOf(did), "curDeck" to did, "newSpread" to 0, "collapseTime" to 1200, "timeLim" to 0, "estTimes" to true, "dueCounts" to true, "curModel" to MODEL_ID,
            "nextPos" to notes.size + 1, "sortType" to "noteFld", "sortBackwards" to false, "addToCur" to true, "schedVer" to 2, "sched2021" to true, "rollover" to 4,
            "creationOffset" to -tz.getOffset(crtCal.timeInMillis) / 60000, "localOffset" to -tz.getOffset(sec * 1000) / 60000)
        val flds = FIELDS.mapIndexed { ord, name -> obj("name" to name, "ord" to ord, "sticky" to false, "rtl" to false, "font" to "Arial", "size" to 20, "media" to emptyList<Any>(), "description" to "") }
        val tmpl = obj("name" to "Word → Meaning", "ord" to 0, "qfmt" to QFMT, "afmt" to afmt(collocationsLabel), "bqfmt" to "", "bafmt" to "", "did" to null, "bfont" to "", "bsize" to 0)
        val model = obj("id" to MODEL_ID, "name" to "Lexkite (EN)", "type" to 0, "mod" to sec, "usn" to -1, "sortf" to 0, "did" to did, "tags" to emptyList<Any>(), "vers" to emptyList<Any>(),
            "req" to listOf(listOf(0, "any", listOf(0))), "latexsvg" to false,
            "latexPre" to "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
            "latexPost" to "\\end{document}", "flds" to flds, "tmpls" to listOf(tmpl), "css" to CSS)
        fun deck(i: Long, name: String) = obj("id" to i, "name" to name, "mod" to sec, "usn" to -1, "lrnToday" to listOf(0, 0), "revToday" to listOf(0, 0), "newToday" to listOf(0, 0), "timeToday" to listOf(0, 0),
            "collapsed" to false, "browserCollapsed" to false, "desc" to "", "dyn" to 0, "conf" to 1, "extendNew" to 0, "extendRev" to 0)
        val dconf = obj("1" to obj("id" to 1, "name" to "Default", "mod" to 0, "usn" to 0, "maxTaken" to 60, "autoplay" to true, "timer" to 0, "replayq" to true, "dyn" to false,
            "new" to obj("delays" to listOf(1, 10), "ints" to listOf(1, 4, 0), "initialFactor" to 2500, "order" to 1, "perDay" to 20, "bury" to false),
            "lapse" to obj("delays" to listOf(10), "mult" to 0, "minInt" to 1, "leechFails" to 8, "leechAction" to 1),
            "rev" to obj("perDay" to 200, "ease4" to 1.3, "ivlFct" to 1, "maxIvl" to 36500, "bury" to false, "hardFactor" to 1.2)))
        val decks = obj("1" to deck(1, "Default"), did.toString() to deck(did, deckName))
        tmp.mkdirs(); val file = File(tmp, "lk-" + System.nanoTime() + ".anki2")
        try {
            val db = SQLiteDatabase.openOrCreateDatabase(file, null)
            try {
                db.beginTransaction()
                db.execSQL("CREATE TABLE col (id integer primary key, crt integer not null, mod integer not null, scm integer not null, ver integer not null, dty integer not null, usn integer not null, ls integer not null, conf text not null, models text not null, decks text not null, dconf text not null, tags text not null)")
                db.execSQL("CREATE TABLE notes (id integer primary key, guid text not null, mid integer not null, mod integer not null, usn integer not null, tags text not null, flds text not null, sfld integer not null, csum integer not null, flags integer not null, data text not null)")
                db.execSQL("CREATE TABLE cards (id integer primary key, nid integer not null, did integer not null, ord integer not null, mod integer not null, usn integer not null, type integer not null, queue integer not null, due integer not null, ivl integer not null, factor integer not null, reps integer not null, lapses integer not null, left integer not null, odue integer not null, odid integer not null, flags integer not null, data text not null)")
                db.execSQL("CREATE TABLE revlog (id integer primary key, cid integer not null, usn integer not null, ease integer not null, ivl integer not null, lastIvl integer not null, factor integer not null, time integer not null, type integer not null)")
                db.execSQL("CREATE TABLE graves (usn integer not null, oid integer not null, type integer not null)")
                db.execSQL("INSERT INTO col VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)", arrayOf<Any?>(1L, crtCal.timeInMillis / 1000, now, now, 11L, 0L, 0L, 0L, conf.toString(), obj(MODEL_ID.toString() to model).toString(), decks.toString(), dconf.toString(), "{}"))
                for (n in notes) db.execSQL("INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)", n)
                for (c in cards) db.execSQL("INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", c)
                db.setTransactionSuccessful()
            } finally { runCatching { db.endTransaction() }; db.close() }
            progress?.invoke(1.0)
            val bytes = file.readBytes()
            val out = ByteArrayOutputStream()
            ZipOutputStream(out).use { z -> z.putNextEntry(ZipEntry("collection.anki2")); z.write(bytes); z.closeEntry(); z.putNextEntry(ZipEntry("media")); z.write("{}".toByteArray()); z.closeEntry() }
            return Built(out.toByteArray(), notes.size)
        } catch (e: Failure) { throw e } catch (e: Exception) { throw Failure(Failure.Kind.Damaged) } finally { file.delete() }
    }

    /** CSV for spreadsheets (BOM so Excel reads UTF-8). */
    fun csv(items: List<Item>, head: List<String>? = null): String {
        fun cell(s: String) = if (s.any { it == '"' || it == ',' || it == '\n' || it == '\r' } || s != s.trim()) "\"" + s.replace("\"", "\"\"") + "\"" else s
        val h = head ?: listOf("Word", "IPA", "Meaning", "Definition", "Example", "Example meaning", "Collocations", "Tags")
        val rows = items.filter { it.word.isNotEmpty() }.map { listOf(it.word, it.ipa, it.meaning, it.def, it.ex, it.exMeaning, it.col.joinToString("; "), it.tags.joinToString(" ") { t -> tagSafe(t) }).joinToString(",") { c -> cell(c) } }
        return "\uFEFF" + h.joinToString(",") { cell(it) } + "\r\n" + rows.joinToString("\r\n") + "\r\n"
    }

    // ---- import ----
    class Row(val cells: List<String>, val tags: List<String>, val deck: String)
    /** Notes of an Anki collection, ready for column mapping ([columns] = field names of the most common note type). */
    class NoteSet(val deck: String, val columns: List<String>, val rows: List<Row>)

    private fun readZip(zip: ByteArray, names: Set<String>): Map<String, ByteArray>? {
        val out = HashMap<String, ByteArray>()
        return try {
            ZipInputStream(ByteArrayInputStream(zip)).use { z ->
                var e = z.nextEntry; var any = false
                while (e != null) { any = true; if (e.name in names) out[e.name] = z.readBytes(); e = z.nextEntry }
                if (!any) null else out
            }
        } catch (ex: Exception) { null }
    }

    fun parsePackage(data: ByteArray, tmp: File): NoteSet {
        val raw: ByteArray
        if (data.size >= 6 && String(data, 0, 6, Charsets.ISO_8859_1) == "SQLite") raw = data
        else {
            val z = readZip(data, setOf("collection.anki21b", "collection.anki21", "collection.anki2")) ?: throw Failure(Failure.Kind.NotAnki)
            raw = z["collection.anki21"] ?: z["collection.anki2"] ?: if (z.containsKey("collection.anki21b")) throw Failure(Failure.Kind.NewFormat) else throw Failure(Failure.Kind.NotAnki)
        }
        tmp.mkdirs(); val file = File(tmp, "lk-" + System.nanoTime() + ".anki2")
        try {
            file.writeBytes(raw)
            val db = try { SQLiteDatabase.openDatabase(file.path, null, SQLiteDatabase.OPEN_READONLY) } catch (e: Exception) { throw Failure(Failure.Kind.Damaged) }
            try {
                fun rows(sql: String): List<List<String>> = try {
                    db.rawQuery(sql, null).use { c -> val out = ArrayList<List<String>>(); while (c.moveToNext()) out.add((0 until c.columnCount).map { i -> c.getString(i) ?: "" }); out }
                } catch (e: Exception) { emptyList() }
                if ("notes" !in rows("SELECT name FROM sqlite_master WHERE type='table'").map { it[0] }) throw Failure(Failure.Kind.NotAnki)
                val models = HashMap<Long, List<String>>(); val decks = HashMap<Long, String>()
                rows("SELECT models, decks FROM col").firstOrNull()?.takeIf { it.size == 2 }?.let { col ->
                    (runCatching { Json.parseToJsonElement(col[0]) as? JsonObject }.getOrNull())?.forEach { (_, v) ->
                        val m = v as? JsonObject ?: return@forEach; val id = m.gs("id").toLongOrNull() ?: return@forEach
                        models[id] = m.ga("flds").mapNotNull { it as? JsonObject }.sortedBy { it.gn("ord") }.map { it.gs("name") }
                    }
                    (runCatching { Json.parseToJsonElement(col[1]) as? JsonObject }.getOrNull())?.forEach { (_, v) ->
                        val d = v as? JsonObject ?: return@forEach; val id = d.gs("id").toLongOrNull() ?: return@forEach; decks[id] = d.gs("name")
                    }
                }
                val deckOfNote = HashMap<Long, Long>()
                for (r in rows("SELECT nid, did, odid FROM cards")) if (r.size == 3) { val nid = r[0].toLongOrNull() ?: continue; if (nid !in deckOfNote) { val odid = r[2].toLongOrNull() ?: 0L; deckOfNote[nid] = if (odid != 0L) odid else (r[1].toLongOrNull() ?: 0L) } }
                val perModel = HashMap<Long, Int>(); val perDeck = HashMap<String, Int>(); val out = ArrayList<Row>()
                for (n in rows("SELECT id, mid, tags, flds FROM notes")) {
                    if (n.size != 4) continue
                    val nid = n[0].toLongOrNull() ?: 0L; val mid = n[1].toLongOrNull() ?: 0L
                    perModel[mid] = (perModel[mid] ?: 0) + 1
                    val dn = deckOfNote[nid]?.let { decks[it] } ?: ""
                    if (dn.isNotEmpty()) perDeck[dn] = (perDeck[dn] ?: 0) + 1
                    out.add(Row(n[3].split("\u001F"), n[2].split(Regex("\\s+")).filter { it.isNotEmpty() }, dn))
                }
                val main = perModel.maxByOrNull { it.value }?.key
                val fields = main?.let { models[it] } ?: emptyList()
                val width = max(fields.size, out.take(500).maxOfOrNull { it.cells.size } ?: 0)
                val deck = perDeck.filter { it.key != "Default" }.maxByOrNull { it.value }?.key ?: ""
                return NoteSet(deck, (0 until width).map { fields.getOrElse(it) { "" } }, out)
            } finally { db.close() }
        } catch (e: Failure) { throw e } catch (e: Exception) { throw Failure(Failure.Kind.Damaged) } finally { file.delete() }
    }

    /** Which column holds the word / meaning / example / IPA (names first, then the first free columns). */
    class ColumnMap(val word: Int = -1, val mean: Int = -1, val ex: Int = -1, val ipa: Int = -1)
    fun guessMap(columns: List<String>): ColumnMap {
        val cols = columns.map { it.lowercase() }
        fun find(re: String): Int { val r = Regex(re); return cols.indexOfFirst { r.containsMatchIn(it) } }
        var word = find("^(word|words|term|front|vocab|vocabulary|english|expression|headword|từ|từ vựng|单词|単語|단어)$"); if (word < 0) word = find("word|front|term|vocab|expression|từ")
        var mean = find("^(meaning|meanings|back|definition|translation|nghĩa|vietnamese|tiếng việt)$"); if (mean < 0) mean = find("mean|back|defin|transl|nghĩa")
        var ex = find("example|sentence|context|ví dụ|câu")
        var ipa = find("^(ipa|pronunciation|phonetic|phonetics|reading|phiên âm)$")
        fun free(): Int = cols.indices.firstOrNull { it != word && it != mean && it != ex && it != ipa } ?: -1
        if (word < 0) word = free()
        if (mean < 0) mean = free()
        if (word == mean) mean = -1
        if (ex == word || ex == mean) ex = -1
        if (ipa == word || ipa == mean) ipa = -1
        return ColumnMap(word, mean, ex, ipa)
    }

    /** Card HTML -> plain text (tags, sounds and cloze marks removed; line breaks become " · "). */
    fun htmlToText(s0: String, sep: String = " · "): String {
        var s = s0.take(20_000)
        fun rx(re: String, w: String) { s = Regex(re, RegexOption.IGNORE_CASE).replace(s, w) }
        rx("<(script|style|template|iframe|object|svg|math|noscript|head|title)\\b[\\s\\S]*?</\\1\\s*>", " ")
        rx("<!--[\\s\\S]*?(-->|$)", " ")
        rx("<br\\s*/?>|</(div|p|li|tr|h[1-6]|blockquote)\\s*>|<(li|tr)\\b[^>]*>", "\n")
        rx("</?[a-z!/?][^>]*>", ""); rx("<[a-z!/?][^>]*$", "")
        rx("\\[sound:[^\\]]*\\]", "")
        rx("\\{\\{c\\d+::([\\s\\S]*?)(?:::[\\s\\S]*?)?\\}\\}", "$1")
        for ((a, b) in listOf("&nbsp;" to " ", "&amp;" to "&", "&lt;" to "‹", "&gt;" to "›", "&quot;" to "\"", "&#39;" to "'", "&apos;" to "'")) s = s.replace(a, b)
        return s.lines().map { it.trim().split(Regex("\\s+")).filter { w -> w.isNotEmpty() }.joinToString(" ") }.filter { it.isNotEmpty() }.joinToString(sep)
    }

    class Plan(val entries: List<JsonObject>, val duplicates: Int, val invalid: Int)
    /** The words that would be imported (web `planImport`): valid, not yet saved, not repeated in the file. */
    fun plan(set: NoteSet, map: ColumnMap, existing: Set<String>, limit: Int = 20_000): Plan {
        val out = ArrayList<JsonObject>(); val seen = HashSet<String>(); var dup = 0; var bad = 0
        fun cell(r: Row, k: Int) = if (k >= 0 && k < r.cells.size) htmlToText(r.cells[k]) else ""
        for (r in set.rows) {
            val word = cell(r, map.word).split(" · ").firstOrNull()?.trim().orEmpty()
            if (word.isEmpty() || word.length > 80 || !Regex("[a-z]", RegexOption.IGNORE_CASE).containsMatchIn(word)) { bad++; continue }
            val key = CardMath.keyOf(word)
            if (key in existing || key in seen) { dup++; continue }
            if (out.size >= limit) { bad++; continue }
            seen.add(key)
            out.add(obj("word" to word, "vi" to cell(r, map.mean).take(300), "ex" to cell(r, map.ex).take(400), "ipa" to cell(r, map.ipa).take(80), "topic" to "anki", "deck" to set.deck))
        }
        return Plan(out, dup, bad)
    }
}
