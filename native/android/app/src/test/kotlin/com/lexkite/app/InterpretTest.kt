package com.lexkite.app

import com.lexkite.app.core.interpret.Interpret
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Interpreter (#/interpret) logic: the same rules as web/cpack/interpret/core.js, on the shared phrasebook. No microphone, no model, no network. */
class InterpretTest {
    private val p = Interpret.Pair2("vi", "en")
    private fun phrases() = Interpret.parsePhrases(File(Fixtures.gen, "interpret/phrases.json").readText())!!

    @Test fun speakerFollowsASureDetection() {
        assertEquals("b", Interpret.speaker(Interpret.Detected("en", 0.9), p, "a")) // the foreign person borrowed the learner's mic
        assertEquals("a", Interpret.speaker(Interpret.Detected("vi-VN", 0.8), p, "b"))
        assertEquals("a", Interpret.speaker(Interpret.Detected("en", 0.4), p, "a")) // unsure → the mic that was tapped
        assertEquals("b", Interpret.speaker(Interpret.Detected("fr", 0.99), p, "b")) // a language outside the pair → the tapped mic
        assertEquals("a", Interpret.speaker(null, p, "a"))
    }

    @Test fun pairRules() {
        assertEquals(Interpret.Pair2("vi", "en"), Interpret.defaultPair("vi")); assertEquals(Interpret.Pair2("en", "es"), Interpret.defaultPair("en")); assertEquals(Interpret.Pair2("en", "es"), Interpret.defaultPair("xx"))
        assertEquals(Interpret.Pair2("de", "en"), Interpret.fixPair("de", "en", "vi")); assertEquals(Interpret.Pair2("vi", "en"), Interpret.fixPair("en", "en", "vi")); assertEquals(Interpret.Pair2("vi", "en"), Interpret.fixPair(null, "zz", "vi"))
        assertEquals(Interpret.Pair2("en", "vi"), Interpret.pick(p, "a", "en")) // picking the other side's language swaps the two
        assertEquals(Interpret.Pair2("vi", "fr"), Interpret.pick(p, "b", "fr")); assertEquals(Interpret.Pair2("vi", "en"), Interpret.pick(p, "b", "xx"))
        assertTrue(Interpret.rtl("ar-SA")); assertFalse(Interpret.rtl("en")); assertEquals(15, Interpret.CODES.size)
    }

    @Test fun historyKeepsTheLastConversationsAndTurns() {
        var h = Interpret.History()
        for (i in 1..Interpret.MAX_TURN + 5) h = Interpret.addTurn(h, "c1", p, Interpret.Turn("a", "s$i", "en", "t$i", 1_000L + i))
        assertEquals(1, h.convs.size); assertEquals(Interpret.MAX_TURN, h.convs[0].turns.size); assertEquals("s6", h.convs[0].turns.first().src); assertEquals("vi", h.convs[0].a)
        for (i in 2..Interpret.MAX_CONV + 3) h = Interpret.addTurn(h, "c$i", p, Interpret.Turn("b", "x", "vi", "y", 9_000L + i))
        assertEquals(Interpret.MAX_CONV, h.convs.size); assertEquals("c${Interpret.MAX_CONV + 3}", h.convs[0].id) // newest first
        assertEquals(h, Interpret.parse(Interpret.encode(h))); assertEquals(Interpret.History(), Interpret.parse("not json"))
        // an older conversation keeps its place when it gets another turn
        val k = h.convs[5].id; assertEquals(k, Interpret.addTurn(h, k, p, Interpret.Turn("a", "z", "en", "z", 1)).convs[5].id)
    }

    @Test fun recapCardsAreTheForeignPhrases() {
        val conv = Interpret.Conv("c", 1, "vi", "en", listOf(
            Interpret.Turn("a", "Cảm ơn", "en", "Thank you", 1), Interpret.Turn("b", "Where is the station?", "vi", "Nhà ga ở đâu?", 2), Interpret.Turn("a", "Cảm ơn", "en", "Thank you", 3)))
        assertEquals(listOf(Interpret.Card("Thank you", "Cảm ơn", "en"), Interpret.Card("Where is the station?", "Nhà ga ở đâu?", "en")), Interpret.cards(conv, "vi"))
        assertEquals(listOf(Interpret.Card("Cảm ơn", "Thank you", "vi"), Interpret.Card("Nhà ga ở đâu?", "Where is the station?", "vi")), Interpret.cards(conv, "en"))
        assertTrue(Interpret.cards(Interpret.Conv("d", 1, "en", "en", listOf(Interpret.Turn("a", "x", "en", "x", 1))), "en").isEmpty())
    }

    @Test fun keyWordsFavourRepeatedLongWords() {
        assertEquals(listOf("station", "where", "pharmacy"), Interpret.keyWords(listOf("Where is the station?", "The station is near the pharmacy", "where is it"), "en", 3, setOf("near")))
        assertEquals(listOf("station"), Interpret.keyWords(listOf("station station"), "en")) // ≥ 4 letters, no repeats of a word
        assertTrue(Interpret.keyWords(listOf("a an the"), "en").isEmpty())
        assertTrue("known words are skipped", "pharmacy" !in Interpret.keyWords(listOf("pharmacy pharmacy hotel"), "en", 8, setOf("pharmacy")))
    }

    @Test fun sayBackScoreIsUnicodeAware() {
        assertEquals(100 to "dónde está la farmacia", Interpret.score("¿Dónde está la farmacia?", listOf("dónde está la farmacia")))
        assertEquals(0, Interpret.score("hello", emptyList()).first); assertTrue(Interpret.score("thank you very much", listOf("thank you", "tank you very much")).first >= 90)
        assertEquals(100, Interpret.score("ありがとうございます", listOf("ありがとうございます")).first)
    }

    @Test fun phrasebookHasEveryGroupInEveryLanguage() {
        val b = phrases(); assertEquals(listOf("hi", "go", "eat", "stay", "sos"), b.order)
        for (g in b.order) { assertTrue(g, b.group(g).isNotEmpty()); for (o in b.group(g)) for (l in Interpret.CODES) assertTrue("$g $l", !o[l].isNullOrBlank()) }
    }

    /** P14: a face-to-face talk – the foreign person borrows the learner's mic, both turns are kept, and the recap offers only the foreign phrases for the word list. */
    @Test fun parity_P14() {
        val b = phrases(); val q = b.group("go").first(); val me = "vi"; val pair = Interpret.fixPair("vi", "en", me)
        // the learner taps ITS mic and says Vietnamese → translated into English for the other half
        var h = Interpret.addTurn(Interpret.History(), "c1", pair, Interpret.Turn(Interpret.speaker(Interpret.Detected("vi", 0.95), pair, "a"), q.getValue("vi"), "en", q.getValue("en"), 1_000))
        // the foreign person answers into the learner's mic: language id says English → the speaker is side "b"
        val who = Interpret.speaker(Interpret.Detected("en", 0.9), pair, "a"); assertEquals("b", who)
        h = Interpret.addTurn(h, "c1", pair, Interpret.Turn(who, q.getValue("en"), "vi", q.getValue("vi"), 2_000))
        val conv = h.convs.single(); assertEquals(2, conv.turns.size)
        val cards = Interpret.cards(conv, me); assertEquals(listOf(q.getValue("en")), cards.map { it.word }); assertEquals(q.getValue("vi"), cards.single().def); assertEquals("en", cards.single().lang)
        assertNotNull(Interpret.LOC["en"])
    }
}
