package com.lexkite.app

import androidx.test.core.app.ApplicationProvider
import com.lexkite.app.feature.vocab.AnkiKit
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import java.io.File
import java.util.TimeZone

/** F: the Anki package round trip - what Lexkite exports (.apkg: SQLite collection in a ZIP) is read back, column-mapped and planned; bad files are refused. */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [35])
class AnkiKitTest {
    private val tmp: File get() = File(ApplicationProvider.getApplicationContext<android.content.Context>().cacheDir, "anki-test")
    private val now = 1_760_000_000_000L
    private fun items() = listOf(
        AnkiKit.Item("meticulous", "/məˈtɪk.jə.ləs/", "tỉ mỉ", "very careful", "She is meticulous about records.", "Cô ấy tỉ mỉ.", listOf("meticulous planning"), listOf("lexkite", "ielts")),
        AnkiKit.Item("resilient", "", "kiên cường", "", "", "", emptyList(), listOf("lexkite")),
        AnkiKit.Item("Meticulous", "", "duplicate in other case", "", "", "", emptyList(), emptyList()),
    )

    @Test fun roundTrip() {
        val built = AnkiKit.buildApkg(items(), tmp, "My words", now = now, tz = TimeZone.getTimeZone("UTC"))
        assertEquals(2, built.count)   // the repeated word is dropped
        val set = AnkiKit.parsePackage(built.bytes, tmp)
        assertEquals("My words", set.deck)
        assertEquals(AnkiKit.FIELDS, set.columns)
        assertEquals(2, set.rows.size)
        val map = AnkiKit.guessMap(set.columns)
        assertEquals(0, map.word); assertEquals(2, map.mean); assertEquals(4, map.ex); assertEquals(1, map.ipa)
        val plan = AnkiKit.plan(set, map, setOf("resilient"))
        assertEquals(listOf("meticulous"), plan.entries.map { (it["word"] as JsonPrimitive).content })
        assertEquals(1, plan.duplicates)
        assertEquals("tỉ mỉ", (plan.entries[0]["vi"] as JsonPrimitive).content)
        assertEquals("She is meticulous about records.", (plan.entries[0]["ex"] as JsonPrimitive).content)
    }

    @Test fun refusesWhatIsNotAnki() {
        for (bad in listOf("hello".toByteArray(), ByteArray(0))) {
            val k = runCatching { AnkiKit.parsePackage(bad, tmp) }.exceptionOrNull() as? AnkiKit.Failure
            assertTrue(k != null)
        }
    }

    @Test fun csvAndText() {
        val csv = AnkiKit.csv(items())
        assertTrue(csv.startsWith("﻿Word,IPA,Meaning"))
        assertEquals("Hello world", AnkiKit.htmlToText("<div>Hello&nbsp;<b>world</b>[sound:x.mp3]</div>"))
        assertEquals("a · b", AnkiKit.htmlToText("a<br>b"))
    }

    @Test fun progressIsKept() {
        val srs = JsonObject(mapOf("reps" to JsonPrimitive(3), "lapses" to JsonPrimitive(1), "interval" to JsonPrimitive(9), "due" to JsonPrimitive(now + 3 * 86_400_000L), "last" to JsonPrimitive(now - 86_400_000L), "S" to JsonPrimitive(9.5), "D" to JsonPrimitive(5.0)))
        val s = AnkiKit.sched(srs, now, 1, 0.9, TimeZone.getTimeZone("UTC"))
        assertEquals(2, s.type); assertEquals(9, s.ivl); assertEquals(4, s.reps); assertEquals(1, s.lapses)
        assertEquals(AnkiKit.CRT_BACK + 3, s.due)
        assertEquals(0, AnkiKit.sched(null, now, 7, 0.9, TimeZone.getTimeZone("UTC")).type)
    }

    /** I: a highlight made on the web ({v, h} with <mark class="uhl">) shows in native as the sentences it covers. */
    @Test fun webHighlightShowsInNative() {
        val sents = listOf("The line graph shows a trend.", "Overall, gas stayed dominant.", "However, growth accelerated.")
        val h = """<p>The line graph shows a trend. <mark class="uhl">Overall, <span class="an-lk">gas</span> stayed dominant.</mark> <mark class="uhl">growth</mark> accelerated.</p>"""
        assertEquals(setOf(1, 2), com.lexkite.app.feature.vocab.hlFromHtml(h, sents))
        assertEquals(emptySet<Int>(), com.lexkite.app.feature.vocab.hlFromHtml("<p>nothing marked</p>", sents))
    }
}
