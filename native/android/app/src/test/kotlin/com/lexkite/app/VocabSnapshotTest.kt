package com.lexkite.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.vocab.Mistakes
import com.lexkite.app.core.vocab.Practice
import com.lexkite.app.core.vocab.Review
import com.lexkite.app.design.LKTheme
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.feature.vocab.CtxLine
import com.lexkite.app.feature.vocab.DeckActions
import com.lexkite.app.feature.vocab.DeckRowUi
import com.lexkite.app.feature.vocab.DeckScreen
import com.lexkite.app.feature.vocab.DeckUi
import com.lexkite.app.feature.vocab.LibSection
import com.lexkite.app.feature.vocab.LibraryActions
import com.lexkite.app.feature.vocab.LibraryScreen
import com.lexkite.app.feature.vocab.LibraryUi
import com.lexkite.app.feature.vocab.MistRow
import com.lexkite.app.feature.vocab.MistakesActions
import com.lexkite.app.feature.vocab.MistakesScreen
import com.lexkite.app.feature.vocab.MistakesUi
import com.lexkite.app.feature.vocab.Opt
import com.lexkite.app.feature.vocab.PracticeActions
import com.lexkite.app.feature.vocab.PracticeScreen
import com.lexkite.app.feature.vocab.PracticeUi
import com.lexkite.app.feature.vocab.ReviewActions
import com.lexkite.app.feature.vocab.ReviewCard
import com.lexkite.app.feature.vocab.ReviewScreen
import com.lexkite.app.feature.vocab.ReviewUi
import com.lexkite.app.feature.vocab.SetCard
import com.lexkite.app.feature.vocab.SrcRow
import com.lexkite.app.feature.vocab.StudyTx
import com.lexkite.app.feature.vocab.TopicScreen
import com.lexkite.app.feature.vocab.TopicUi
import com.lexkite.app.feature.vocab.TopicWord
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * M3 vocabulary snapshot gate at 390 dp: review (front · answer with the four grades), practice hub, mistakes, deck, library, topic,
 * each in en-light · vi-light · ar-light (RTL) · de-dark  (src/test/snapshots/vocab-*). Fixed data, no clock, no network;
 * CI records the references on the first run (recordRoborazziDebug), then verifies.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class VocabSnapshotTest {
    @get:Rule val rule = createComposeRule()

    // ---- fixed inputs ----
    private val front = ReviewCard(
        word = "meticulous", ipa = "/məˈtɪk.jə.ləs/", ipaUs = "", pos = "adj", level = "C1", mean = "tỉ mỉ, kỹ lưỡng", def = "showing great attention to detail; very careful and precise",
        ex = "She is meticulous about keeping accurate records.", emoji = "🧐", image = "", contexts = emptyList(), sentences = emptyList(), col = emptyList(), syn = emptyList(), note = "",
        retention = null, lapses = 0, isNew = true, reverse = false, mode = "flip", options = emptyList(), right = -1,
        previews = listOf(Review.Preview("min", 1.0), Review.Preview("min", 6.0), Review.Preview("min", 10.0), Review.Preview("day", 4.0)),
    )
    private val back = ReviewCard(
        word = "meticulous", ipa = "/məˈtɪk.jə.ləs/", ipaUs = "/məˈtɪk.jə.ləs/", pos = "adj", level = "C1", mean = "tỉ mỉ, kỹ lưỡng", def = "showing great attention to detail; very careful and precise",
        ex = "She is meticulous about keeping accurate records.", emoji = "🧐", image = "", contexts = listOf(CtxLine("Academic research demands meticulous planning.", null, "IELTS Reading")),
        sentences = listOf("He is meticulous about his work." to "Anh ấy rất tỉ mỉ trong công việc."), col = listOf("meticulous planning", "meticulous attention"), syn = listOf("careful", "thorough"), note = "",
        retention = 72, lapses = 3, isNew = false, reverse = false, mode = "flip", options = emptyList(), right = -1,
        previews = listOf(Review.Preview("min", 1.0), Review.Preview("day", 2.0), Review.Preview("day", 9.0), Review.Preview("month", 1.0)),
    )

    /** Rows labelled the way the app builds them (Practice.Source through StudyTx), so every language shows its real translation. */
    @Composable private fun practice(): PracticeUi.Hub {
        val tx = StudyTx.of(LocalL10n.current, Fixtures.t("vi"))
        fun row(value: String, emoji: String, key: String, n: Int, vars: Map<String, String>? = null) = SrcRow(value, Practice.Source(value, emoji, key, vars).label(tx), n)
        val deck = row("deck", "📒", "Sổ từ của tôi ({n})", 124, mapOf("n" to "124"))
        return PracticeUi.Hub(listOf(deck, row("due", "🔁", "Thẻ đến hạn hôm nay", 12), row("forgetting", "⚠️", "Từ sắp quên (độ nhớ < 85%)", 4)), deck, false, 124)
    }

    private fun mist(key: String, kind: String, v: Mistakes.View, n: Int, qIpa: String, ref: String, short: Boolean) = MistRow(key, kind, v, n, qIpa, "", ref, false, short)
    private val mistakes = MistakesUi(
        "all", mapOf("all" to 3, "vocab" to 1, "grammar" to 1, "reading" to 0, "listening" to 1),
        listOf(
            mist("a", "vocab", Mistakes.View("Meaning of “reluctant”?", "reluctant", "reluctant", "eager", "unwilling", "", "", ""), 2, "/rɪˈlʌk.tənt/", "reluctant", true),
            mist("b", "grammar", Mistakes.View("Choose the correct form: Neither of the candidates ___ ready.", "", "", "were", "was", "", "", "“Neither of” takes a singular verb."), 1, "", "subject-verb", true),
            mist("c", "listening", Mistakes.View("Type what you hear", "itinerary", "", "", "itinerary", "", "", ""), 1, "", "t1", true),
        ),
        false, true, true,
    )

    private val deck = DeckUi(
        loading = false, total = 124, mastered = 38, shown = 3, matched = 3,
        rows = listOf(
            DeckRowUi("resilient", "/rɪˈzɪl.i.ənt/", "kiên cường", "📌 “The local supply chain proved remarkably resilient.”", 92, 3, "💪", false),
            DeckRowUi("meticulous", "/məˈtɪk.jə.ləs/", "tỉ mỉ", "showing great attention to detail", 74, 2, "🧐", false),
            DeckRowUi("pragmatic", "/præɡˈmæt.ɪk/", "thực dụng", "dealing with things sensibly and realistically", 48, 1, "🛠️", false),
        ),
        topics = listOf(Opt("", ""), Opt("mine", "")), froms = listOf(Opt("", ""), Opt("forget", "")), levels = listOf(Opt("", "")),
    )

    private val library = LibraryUi(
        loading = false, tabs = listOf(Opt("all", ""), Opt("core", "Core"), Opt("topics", "Topics"), Opt("mine", "")), tab = "all",
        sections = listOf(
            LibSection("core", "Core vocabulary", "Foundations", listOf(
                SetCard("verbs", "🌱", "Everyday verbs", "High-frequency actions in context", 24, 40, "A2–B1"),
                SetCard("top500", "⚡", "High-frequency 500", "Essential backbone for comprehension", 48, 50, "A1–A2")), null, emptyList(), false),
            LibSection("topics", "Curated topics", "Contextual", listOf(
                SetCard("travel", "✈️", "Travel essentials", "Airports, hotels, customs", 12, 40, "A2–B1"),
                SetCard("office", "💼", "Office small talk", "Meetings and email", 14, 40, "B1–B2")), 12, emptyList(), false),
        ),
        words = 1840, sets = 96,
    )
    private val topic = TopicUi(
        id = "travel", emoji = "✈️", name = "Travel essentials", desc = "Core words for airports, hotels and customs.", total = 40, added = 12, missing = 28,
        levels = listOf("A1", "A2", "B1"), lv = "", counts = mapOf("A1" to 14, "A2" to 16, "B1" to 10),
        words = listOf(
            TopicWord("boarding pass", "ˈbɔː.dɪŋ ˌpɑːs", "noun", "A2", "thẻ lên máy bay", "", "Please have your boarding pass ready.", listOf("issue a boarding pass"), true),
            TopicWord("layover", "ˈleɪˌoʊ.vər", "noun", "B1", "thời gian quá cảnh", "a short stop between two flights", "We had a four-hour layover in Doha.", listOf("brief layover"), false),
        ),
    )

    private val image: @Composable (String, String, Modifier) -> Unit = { _, _, mod -> Box(mod.background(LocalLKColors.current.surfaceContainerHighest)) }

    @Composable private fun screen(name: String) {
        when (name) {
            "review-front" -> ReviewScreen(ReviewUi.Card(front, false, null, 3, 12, 9, false), ReviewActions(), image)
            "review-answer" -> ReviewScreen(ReviewUi.Card(back, true, null, 4, 12, 8, true), ReviewActions(), image)
            "practice" -> PracticeScreen(practice(), PracticeActions())
            "practice-hard" -> PracticeScreen(PracticeUi.HardOffer(8), PracticeActions())
            "mistakes" -> MistakesScreen(mistakes, MistakesActions())
            "deck" -> DeckScreen(deck, DeckActions(image = image))
            "library" -> LibraryScreen(library, LibraryActions())
            else -> TopicScreen(topic, LibraryActions())
        }
    }

    private fun shot(name: String, lang: String, dark: Boolean) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark, reduceMotion = true) { Box(Modifier.background(LocalLKColors.current.background)) { screen(name) } } }
        rule.onRoot().captureRoboImage("src/test/snapshots/vocab-$name-$lang-${if (dark) "dark" else "light"}.png")
    }

    @Test fun reviewFrontEnLight() = shot("review-front", "en", false)
    @Test fun reviewFrontViLight() = shot("review-front", "vi", false)
    @Test fun reviewFrontArLight() = shot("review-front", "ar", false)
    @Test fun reviewFrontDeDark() = shot("review-front", "de", true)

    @Test fun reviewAnswerEnLight() = shot("review-answer", "en", false)
    @Test fun reviewAnswerViLight() = shot("review-answer", "vi", false)
    @Test fun reviewAnswerArLight() = shot("review-answer", "ar", false)
    @Test fun reviewAnswerDeDark() = shot("review-answer", "de", true)

    @Test fun practiceEnLight() = shot("practice", "en", false)
    @Test fun practiceViLight() = shot("practice", "vi", false)
    @Test fun practiceArLight() = shot("practice", "ar", false)
    @Test fun practiceDeDark() = shot("practice", "de", true)

    @Test fun practiceHardEnLight() = shot("practice-hard", "en", false)
    @Test fun practiceHardViLight() = shot("practice-hard", "vi", false)
    @Test fun practiceHardArLight() = shot("practice-hard", "ar", false)
    @Test fun practiceHardDeDark() = shot("practice-hard", "de", true)

    @Test fun mistakesEnLight() = shot("mistakes", "en", false)
    @Test fun mistakesViLight() = shot("mistakes", "vi", false)
    @Test fun mistakesArLight() = shot("mistakes", "ar", false)
    @Test fun mistakesDeDark() = shot("mistakes", "de", true)

    @Test fun deckEnLight() = shot("deck", "en", false)
    @Test fun deckViLight() = shot("deck", "vi", false)
    @Test fun deckArLight() = shot("deck", "ar", false)
    @Test fun deckDeDark() = shot("deck", "de", true)

    @Test fun libraryEnLight() = shot("library", "en", false)
    @Test fun libraryViLight() = shot("library", "vi", false)
    @Test fun libraryArLight() = shot("library", "ar", false)
    @Test fun libraryDeDark() = shot("library", "de", true)

    @Test fun topicEnLight() = shot("topic", "en", false)
    @Test fun topicViLight() = shot("topic", "vi", false)
    @Test fun topicArLight() = shot("topic", "ar", false)
    @Test fun topicDeDark() = shot("topic", "de", true)
}
