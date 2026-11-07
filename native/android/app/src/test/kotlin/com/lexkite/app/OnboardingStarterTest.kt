package com.lexkite.app

import com.lexkite.app.core.sync.StarterDeck
import com.lexkite.app.core.sync.SyncDoc
import com.lexkite.app.feature.onboarding.OnbChoice
import com.lexkite.app.feature.onboarding.OnbExit
import com.lexkite.app.feature.onboarding.OnbStarter
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * C17 starter deck parity with web: finishing onboarding creates exactly the deck web builds for the chosen pack.
 * Expected values = vectors/starter-deck.json, produced by running the REAL web Core.Cards.make over the web word data (scripts/native/starter.mjs);
 * the pack under test is the bundled content-pack/starter.json (also generated from web).
 */
class OnboardingStarterTest {
    private fun res(name: String) = javaClass.classLoader!!.getResource(name)!!.readText()
    private val vec = Json.parseToJsonElement(res("starter-deck.json")).jsonObject
    private val pack = StarterDeck.parse(res("starter.json"))
    private val now = vec["now"]!!.jsonPrimitive.content.toLong()
    private val decks = vec["decks"]!!.jsonObject

    private fun assertDeck(cards: Map<String, JsonObject>, exam: String, label: String) {
        val want = decks[exam]!!.jsonObject
        val keys = want["keys"]!!.jsonArray.map { it.jsonPrimitive.content }
        assertEquals("$label: same words as web", keys.toSet(), cards.keys)
        assertEquals("$label: count", want["count"]!!.jsonPrimitive.content.toInt(), cards.size)
        for ((k, c) in want["cards"]!!.jsonObject) assertEquals("$label: card $k equals web Cards.make + mod", c, cards[k])
    }

    @Test fun parity_C17_starterDeck() {
        val packs = vec["packs"]!!.jsonArray
        assertTrue(packs.size >= 6)
        for (p in packs) {
            val o = p.jsonObject
            val choice = OnbChoice(track = o["track"]!!.jsonPrimitive.content, variant = o["variant"]!!.jsonPrimitive.content)
            val exam = o["exam"]!!.jsonPrimitive.content
            assertEquals("pack ${choice.track}/${choice.variant} → exam", exam, choice.exam)
            // what the host does when the learner presses the last button
            val doc = OnbStarter.apply(SyncDoc(), choice, OnbExit.START, pack, now)
            assertDeck(doc.cards, exam, "finish(${choice.track}/${choice.variant})")
            val built = StarterDeck.cards(exam, pack, now)
            assertEquals("insertion order = web", decks[exam]!!.jsonObject["keys"]!!.jsonArray.map { it.jsonPrimitive.content }, built.map { it.first })
        }
    }

    @Test fun parity_C17_starterDeck_onlyWhenFinished() {
        val choice = OnbChoice(track = "toeic")
        assertTrue("skip the whole setup adds nothing", OnbStarter.apply(SyncDoc(), null, OnbExit.SKIP_ALL, pack, now).cards.isEmpty())
        assertTrue("I already have an account adds nothing", OnbStarter.apply(SyncDoc(), null, OnbExit.HAVE_ACCOUNT, pack, now).cards.isEmpty())
        assertTrue("missing pack never crashes", OnbStarter.apply(SyncDoc(), choice, OnbExit.START, null, now).cards.isEmpty())
        // words already in the deck are never touched (web `if (!D.inDeck(w.word))`), the rest of the deck is added
        val mine = Json.parseToJsonElement("""{"word":"curriculum","vi":"mine","note":"keep"}""").jsonObject
        val doc = OnbStarter.apply(SyncDoc(cards = mapOf("curriculum" to mine)), OnbChoice(track = "ielts"), OnbExit.START, pack, now)
        assertEquals(mine, doc.cards["curriculum"])
        assertEquals(decks["ielts"]!!.jsonObject["count"]!!.jsonPrimitive.content.toInt(), doc.cards.size)
    }
}
