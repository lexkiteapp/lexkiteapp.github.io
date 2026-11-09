package com.lexkite.app

import com.lexkite.app.core.lesson.LItem
import com.lexkite.app.core.lesson.LessonEngine
import com.lexkite.app.core.lesson.LessonWriter
import com.lexkite.app.core.lesson.Off
import com.lexkite.app.core.lesson.Speaking
import com.lexkite.app.core.rig.Cue
import com.lexkite.app.core.rig.RigDef
import com.lexkite.app.core.rig.RigMachine
import com.lexkite.app.core.rig.TeacherSignal
import com.lexkite.app.core.sync.Js
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.feature.lesson.LessonController
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File
import java.util.TimeZone

/** M2 parity gate (P03 lesson player behaviour, C05 teacher rig behaviour). The numeric/exact parity of the ports lives in LessonVectorsTest · AudioVectorsTest · RigVectorsTest. */
class ParityM2Test {
    private val v = Json.parseToJsonElement(javaClass.classLoader!!.getResource("lesson.json")!!.readText()).jsonObject
    private val cards = v.getValue("inputs").jsonObject.getValue("cards").jsonArray.map { it.jsonObject }
    private val starter = v.getValue("inputs").jsonObject.getValue("starter").jsonArray.map { it.jsonObject }
    private val now = v.getValue("now").jsonPrimitive.long

    private fun lesson(seed: Long = 7, off: Off = Off(), only: List<String>? = null, offState: () -> Off = { off }): LessonController {
        val picks = LessonEngine.pickWords(cards, 6, now, null, starter)
        val items = LessonEngine.build(picks, LessonEngine.BuildOpts(seed, cards + starter, off, only, mean = { c -> (c["vi"] as? JsonPrimitive)?.content.orEmpty() }), now)
        return LessonController(items, picks, cards, seed = 1, now = { now }, offState = offState)
    }
    private fun LessonController.item() = sess.cur!!

    /** Plays the current exercise the way a learner would: right, or deliberately wrong. */
    private fun LessonController.play(right: Boolean) {
        val it = item()
        when (it.type) {
            "gap", "mean", "q", "pic" -> if (it.type == "pic" && it.choice != true) { spoke(if (right) 0.95 else 0.1, "x"); if (!right) spoke(0.1, "x") } else pick(if (right) it.answer else it.options!!.first { o -> !LessonEngine.same(o, it.answer) })
            "build", "tr" -> { val words = it.answer.split(" "); (if (right) words else words.reversed()).forEach { w -> placeTile(it.tiles!!.indices.first { i -> i !in st.tiles && LessonEngine.same(it.tiles!![i], w) }) }; check() } // one tile at a time: a repeated word takes the next free tile
            "type" -> { type(if (right) it.answer else "zzz"); check() }
            "say" -> { spoke(if (right) 0.95 else 0.1, "x"); if (!right) spoke(0.1, "x") }
            "match" -> { val n = it.pairs!!.size; for (i in 0 until n) { matchTap(true, i); matchTap(false, if (right) i else (i + 1) % n) }; if (!right) for (i in 0 until n) { matchTap(true, i); matchTap(false, i) } }
            "line" -> lineContinue()
        }
        if (it.type == "gap" || it.type == "mean" || it.type == "q" || (it.type == "pic" && it.choice == true)) check()
    }

    @Test fun parity_P03() {
        val c = lesson()
        val first = c.item(); val total = c.sess.total
        // Check is disabled until something is chosen, the segmented bar starts empty, exit needs no confirm yet
        assertFalse(c.ui().exitNeedsConfirm); assertEquals(0f, c.ui().progress, 0f)
        if (first.type in listOf("gap", "mean", "q")) assertFalse(c.st.ready(first))
        // a wrong answer: feedback sheet shows, combo stays 0, progress does not move, the item comes back later (requeued with retry + 1)
        c.play(false); var fb = c.feedback
        assertNotNull(fb); assertFalse(fb!!.ok); assertEquals(0, c.sess.combo); assertEquals(total + 0, c.sess.total)
        assertTrue("wrong answer is requeued", fb.requeued && c.sess.q.any { it.id == first.id && it.retry == 1 })
        assertTrue(c.ui().exitNeedsConfirm)
        assertEquals("the answered question stays on screen under its feedback", first.id, c.ui().cur?.id)
        c.next(); assertNull(c.feedback)
        // right answers build the COMBO and XP is only for first-time rights
        var guard = 0
        while (c.finish == null && guard++ < 80) {
            val cur = c.item(); c.play(true); fb = c.feedback
            if (cur.type != "line" && cur.type != "match") { assertNotNull(fb); assertTrue("right answer to ${cur.type} '${cur.answer}' must pass", fb!!.ok); assertEquals(if (cur.retry == 0) LessonController.XP_PER_RIGHT else 0, fb.xp); c.next() }
            else if (cur.type == "match") { assertNotNull(fb); c.next() }
        }
        val f = c.finish!!
        assertTrue(c.sess.done); assertEquals(1f, c.ui().progress, 0f); assertFalse(c.ui().exitNeedsConfirm)
        assertEquals(LessonWriter.xpOf(c.sess), f.xp); assertEquals(10 + c.sess.ok1 * 2, f.xp) // a wrong answer happened → no perfect bonus
        assertFalse(f.perfect); assertTrue(f.weak.isNotEmpty() && f.best >= 1)
        // result → FSRS: the word answered wrong first is reviewed as Again (lapse, back to learning steps) and the day's XP is written
        val res = c.results(); val wrongWord = res.first { it.grade == 0 }
        val doc = SyncDoc(LinkedHashMap(cards.associateBy { (it["word"] as JsonPrimitive).content.lowercase() }), emptyMap(), null, null, null, null)
        val out = LessonWriter.apply(doc, res, f.xp, c.spoken, f.perfect, now, TimeZone.getTimeZone("UTC"))
        val srs = out.cards.getValue(wrongWord.word.lowercase())["srs"]!!.jsonObject
        assertEquals(0.0, Js.num(srs["reps"]), 0.0); assertEquals(now + 60_000, Js.num(srs["due"]).toLong())
        assertEquals(f.xp.toDouble(), Js.num(Js.prop(out.game, "xp")), 0.0)
        assertEquals(now, Js.num(out.cards.getValue(wrongWord.word.lowercase())["mod"]).toLong())
    }

    /** A lesson whose current exercise is of [type]: played on (right answers) from the start until it comes up – the engine puts the rarest kind of the first word first,
     *  so gap / build / say only appear later in the lesson. Input state is fresh because every answered exercise is followed by next(). */
    private fun lessonStartingWith(type: String, offState: () -> Off = { Off() }): LessonController {
        for (s in 1L..300L) {
            val c = lesson(s, offState = offState); var guard = 0
            while (c.finish == null && c.item().type != type && guard++ < 80) { c.play(true); if (c.feedback != null) c.next() }
            if (c.finish == null && c.item().type == type) return c
        }
        error("no lesson reaches $type")
    }

    @Test fun lessonHintsSkipsAndSpeech() {
        // fifty-fifty drops exactly one wrong option (never the answer)
        val g = lessonStartingWith("gap"); val it0 = g.item()
        assertEquals("fifty", g.hint()); assertEquals(1, g.st.removed.size); assertFalse(it0.answer in g.st.removed)
        // "first" places the next correct tile of the sentence
        val b = lessonStartingWith("build"); val it1 = b.item(); assertEquals("first", b.hint()); assertTrue(LessonEngine.same(it1.tiles!![b.st.tiles.single()], it1.answer.split(" ").first()))
        // type: letters reveal one by one, the letter bank replaces the keyboard
        val c = lessonStartingWith("type")
        assertEquals("letter", c.hint()); assertEquals(c.item().answer.take(1), c.st.typed); assertEquals("letter", c.hint()); assertEquals(c.item().answer.take(2), c.st.typed)
        c.useBank(); assertTrue(c.st.bankMode); c.bankTap(0); assertEquals(1, c.st.typed.length); c.bankBack(); assertEquals("", c.st.typed)
        // match: one pair is matched for free
        var m: LessonController? = null
        for (s in 1L..60L) { val l = lesson(s); while (l.finish == null && l.item().type != "match") { l.play(true); if (l.feedback != null) l.next() }; if (l.finish == null) { m = l; break } }
        assertNotNull(m); assertEquals("pair", m!!.hint()); assertEquals(1, m.st.matched.size)
        // "can't speak now": the say exercise becomes the stand-in (gap / mean), never a dead end
        var off = Off(); val sp = lessonStartingWith("say") { off }
        off = Off(listen = false, speak = true); sp.adaptAll(); assertTrue(sp.item().type == "gap" || sp.item().type == "mean"); assertEquals(true, sp.item().spoke)
        // recognition: an unclear first try asks again (not graded), the second is graded
        val s2 = lessonStartingWith("say"); s2.spoke(0.3, "x"); assertTrue(s2.st.unclear); assertNull(s2.feedback); s2.spoke(0.3, "x"); assertNotNull(s2.feedback); assertFalse(s2.feedback!!.ok)
        val s3 = lessonStartingWith("say"); s3.spoke(0.9, "x"); assertTrue(s3.feedback!!.ok)
        assertEquals(1.0, Speaking.score("Most of the students passed", listOf("most of the students passed")), 1e-9)
        assertEquals(0.39, Speaking.score("one two three four", listOf("one two", "uh")), 1e-9) // Levenshtein 11/18 → 39 %
        assertEquals("best alternative wins", "one two three four", Speaking.best("one two three four", listOf("one two", "one two three four")).first)
        assertEquals(0.0, Speaking.score("one two", emptyList()), 0.0)
    }

    @Test fun parity_C05() {
        val def = RigDef.parse(File("../../shared/gen/teach/rig.json").readText())
        val rig = Json.parseToJsonElement(javaClass.classLoader!!.getResource("rig.json")!!.readText()).jsonObject
        for (who in listOf("ama", "carlos")) {
            val person = def.people.getValue(who)
            // the speaking face really lip-syncs: mouth shapes follow the line's cues and the rig only talks while the audio is playing
            val src = rig.getValue("sources").jsonObject.entries.first().value.jsonObject
            val dur = src.getValue("dur").jsonPrimitive.content.toDouble(); val cs = src.getValue("cues").jsonArray
            val cues = cs.mapIndexed { i, x -> Cue(x.jsonArray[0].jsonPrimitive.content.toDouble(), if (i < cs.size - 1) cs[i + 1].jsonArray[0].jsonPrimitive.content.toDouble() else dur, x.jsonArray[1].jsonPrimitive.content) }
            val m = RigMachine(def, who, false, person.seed, person::has)
            var clock = 0.0; var playing = false
            val shapes = HashSet<String>(); var t = 0.0
            m.step(t); t += 1 / 60.0
            m.speak({ clock }, { playing }, cues, null, null, dur, "line")
            playing = true
            while (clock < dur) { m.step(t); shapes.add(m.last!!.shape); t += 1 / 60.0; clock += 1 / 60.0 }
            assertTrue("$who: several mouth shapes while speaking: $shapes", shapes.size >= 3)
            playing = false; repeat(30) { m.step(t); t += 1 / 60.0 }
            assertEquals("$who: mouth closes when the audio stops", "X", m.last!!.shape)
            // emotions and gestures move the face; the bundled cheer pose fades in (never a half-transparent person: faceW + poseW = 1)
            m.gesture("cheer", t); repeat(30) { m.step(t); t += 1 / 60.0 }
            val f = m.last!!; assertEquals(1.0, f.faceW + f.poseW, 1e-9)
            // reduced motion = calm rig: no tilt / nod / sway, but it still blinks and talks
            val calm = RigMachine(def, who, true, person.seed, person::has); var maxMove = 0.0
            for (i in 0 until 600) { calm.step(i / 60.0); val k = calm.last!!; maxMove = maxOf(maxMove, Math.abs(k.tilt), Math.abs(k.nod), Math.abs(k.sway)) }
            assertEquals("$who calm: no head motion", 0.0, maxMove, 0.0)
        }
        // the lesson → teacher channel is a queue the view drains once per frame
        val s = TeacherSignal(); s.pose("cheer"); s.speak("Hi", 1.0, { 0.0 }, { true }); assertTrue(s.pending)
        assertTrue(s.poll() is TeacherSignal.Cmd.Pose); assertTrue(s.poll() is TeacherSignal.Cmd.Speak); assertNull(s.poll())
    }

    // ------------------------------------------------------------------ M3 (P04 review & practice, P05 vocabulary)
    private fun appleEntry() = JsonObject(mapOf("word" to JsonPrimitive("apple"), "ipa" to JsonPrimitive("ˈæpəl"), "pos" to JsonPrimitive("n"), "vi" to JsonPrimitive("quả táo"),
        "def" to JsonPrimitive("a round fruit"), "ex" to JsonPrimitive("I eat an apple."), "level" to JsonPrimitive("A1"), "emoji" to JsonPrimitive("🍎")))

    /** P04: grade a due card (the FSRS state is written), grade it Again, then undo - the card, the queue and the counters are back. */
    @Test fun parity_P04() {
        val t0 = 1_760_000_000_000L
        val st = com.lexkite.app.core.vocab.WordBook.add(com.lexkite.app.core.vocab.WordBook.Store(emptyMap(), emptyMap()), appleEntry(), null, t0)
        val card0 = st.cards.getValue("apple")
        val cards = st.cards.toMutableMap()
        val s = com.lexkite.app.core.vocab.Review.Session(listOf("apple"), cards, JsonObject(emptyMap()))
        val r = s.grade(2, t0)!!
        val srs = cards.getValue("apple")["srs"] as JsonObject
        assertTrue("last review is written", Js.truthy(srs["last"]))
        assertTrue("next due is in the future", Js.num(srs["due"]) > t0)
        assertEquals(1, r.reviews); assertEquals(1, s.done); assertTrue(s.canUndo)
        val back = s.undo(t0 + 1)!!
        assertEquals(r.xp, back.xp)
        assertEquals(card0["srs"], cards.getValue("apple")["srs"])
        assertEquals(listOf("apple"), s.queue); assertEquals(0, s.done); assertEquals(false, s.canUndo)
        // Again puts the card back in the queue and counts the miss
        s.grade(0, t0)
        assertEquals(1, s.again); assertEquals(listOf("apple"), s.queue)
    }

    /** P05: look a word up in the dictionary, save it with an own sentence, and it is in the deck list with its meaning. */
    @Test fun parity_P05() = kotlinx.coroutines.runBlocking {
        val t0 = 1_760_000_000_000L
        val index = mapOf("apple" to appleEntry())
        val dict = com.lexkite.app.core.dict.Dict(com.lexkite.app.core.dict.DictNet { _, _ -> null }, com.lexkite.app.core.dict.Lex(com.lexkite.app.core.dict.IndexLexSource(index)), index, com.lexkite.app.core.dict.DictCfg(), clock = { t0 })
        val e = dict.lookup("Apple")!!
        assertEquals("apple", (e["word"] as JsonPrimitive).content)
        val ctx = JsonObject(mapOf("text" to JsonPrimitive("An apple a day."), "source" to JsonPrimitive(""), "title" to JsonPrimitive("Ghi chú của bạn")))
        val st = com.lexkite.app.core.vocab.WordBook.add(com.lexkite.app.core.vocab.WordBook.Store(emptyMap(), emptyMap()), e, ctx, t0)
        val rows = com.lexkite.app.core.vocab.Deck.rows(st.cards.values, com.lexkite.app.core.vocab.Deck.Filter(), t0)
        assertEquals(listOf("apple"), rows.map { (it["word"] as JsonPrimitive).content })
        val row = com.lexkite.app.core.vocab.Deck.row(rows[0], t0)
        assertEquals("apple", row.word); assertTrue(row.note.contains("An apple a day."))
        // saving the same word again keeps one card
        val again = com.lexkite.app.core.vocab.WordBook.add(st, e, null, t0 + 1)
        assertEquals(1, again.cards.size)
    }
}
