package com.lexkite.app

import androidx.compose.runtime.Composable
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onRoot
import com.github.takahirom.roborazzi.captureRoboImage
import com.lexkite.app.core.dict.DictPage
import com.lexkite.app.core.usage.Usage
import com.lexkite.app.core.verbs.VerbData
import com.lexkite.app.core.verbs.Verbs
import com.lexkite.app.core.write.Ideas
import com.lexkite.app.core.write.Letters
import com.lexkite.app.core.write.Models
import com.lexkite.app.core.write.Paraphrase
import com.lexkite.app.core.write.WritingData
import com.lexkite.app.design.LKTheme
import com.lexkite.app.feature.vocab.CtxUi
import com.lexkite.app.feature.vocab.DictActions
import com.lexkite.app.feature.vocab.DictScreen
import com.lexkite.app.feature.vocab.DictSuggest
import com.lexkite.app.feature.vocab.DictUi
import com.lexkite.app.feature.vocab.DictView
import com.lexkite.app.feature.vocab.IdeasActions
import com.lexkite.app.feature.vocab.IdeasScreen
import com.lexkite.app.feature.vocab.LetterRow
import com.lexkite.app.feature.vocab.LettersActions
import com.lexkite.app.feature.vocab.LettersListScreen
import com.lexkite.app.feature.vocab.ModelActions
import com.lexkite.app.feature.vocab.ModelScreen
import com.lexkite.app.feature.vocab.ModelTools
import com.lexkite.app.feature.vocab.ModelUi
import com.lexkite.app.feature.vocab.ModelsActions
import com.lexkite.app.feature.vocab.ModelsScreen
import com.lexkite.app.feature.vocab.ParaActions
import com.lexkite.app.feature.vocab.ParaUi
import com.lexkite.app.feature.vocab.ParaphraseScreen
import com.lexkite.app.feature.vocab.PhrasesActions
import com.lexkite.app.feature.vocab.PhrasesScreen
import com.lexkite.app.feature.vocab.RelatedUi
import com.lexkite.app.feature.vocab.UsageActions
import com.lexkite.app.feature.vocab.UsageQuiz
import com.lexkite.app.feature.vocab.UsageScreen
import com.lexkite.app.feature.vocab.UsageUi
import com.lexkite.app.feature.vocab.VerbActions
import com.lexkite.app.feature.vocab.VerbPageData
import com.lexkite.app.feature.vocab.VerbScreen
import com.lexkite.app.feature.vocab.VerbUi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonObject
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode
import java.io.File

/**
 * M3 vocabulary / writing screens at 390 dp, 2x: dictionary input, word card, verb page, usage word page (with quick practice), letters, ideas, paraphrase, phrase book,
 * model list and model page. Each state is rendered in exactly 4 variants (hdpi, PR image budget): en-light, vi-light, ar-light (RTL), de-dark (+40 % text) = 50 images
 * (src/test/snapshots/word-*). Fixed data (the web scripts + verbs.json, a hand-written dictionary entry), no clock, no network.
 */
@RunWith(RobolectricTestRunner::class)
@GraphicsMode(GraphicsMode.Mode.NATIVE)
@Config(sdk = [35], qualifiers = "w390dp-h844dp-hdpi")
class WordSnapshotTest {
    @get:Rule val rule = createComposeRule()

    private val web = File("../../../web")
    private val gen = File("../../shared/gen")
    private fun text(p: String) = File(web, p).readText()

    private val verbs: Verbs by lazy { Verbs(VerbData.parse(File(gen, "verbs.json").readText())) }
    private val usage: Usage by lazy {
        val files = File(web, "js/usage").listFiles()!!.sortedBy { it.name }.map { it.readText() }
        Usage.fromScripts(files, text("js/usage-index.js"), verbs)
    }
    private val writing: WritingData by lazy {
        WritingData.fromScripts(text("cpack/write/ideas.js"), text("js/lib/paraphrase-data.js"),
            listOf("js/models.js", "cpack/write/models2.js", "cpack/write/models3.js", "cpack/write/models4.js", "cpack/write/models5.js", "js/write/gt-letters.js", "cpack/write/task2-more.js", "js/write/task1-more.js", "js/write/task1-more2.js").map { text(it) },
            text("js/write.js"), listOf(text("cpack/write/task2-more.js")), text("js/task1.js"), listOf(text("js/write/task1-more.js"), text("js/write/task1-more2.js")))
    }

    private fun shot(state: String, lang: String, dark: Boolean, content: @Composable () -> Unit) {
        val t = Fixtures.t(lang)
        rule.setContent { LKTheme(t, dark) { content() } }
        rule.onRoot().captureRoboImage("src/test/snapshots/word-$state-$lang-${if (dark) "dark" else "light"}.png")
    }

    // ---------------- fixed data ----------------
    private val entry: JsonObject = Json.parseToJsonElement("""{
      "word":"resilient","ipa":"/rɪˈzɪl.i.ənt/","ipaUS":"/rɪˈzɪl.jənt/","pos":"adjective","level":"C1","vi":"kiên cường, có khả năng phục hồi",
      "def":"able to recover quickly after difficulties","ex":"Children are often more resilient than adults expect.",
      "senses":[{"pos":"adjective","terms":["kiên cường","dẻo dai","đàn hồi"]}],
      "oxford":[{"pos":"adjective","defs":[{"def":"(of a person) able to recover quickly after something unpleasant","ex":"Small businesses proved resilient during the crisis."},{"def":"(of a substance) able to return to its shape after being bent or stretched","ex":""}]}],
      "meanings":[],"syn":["tough","flexible"],
      "sentences":[{"en":"Children are often more resilient than adults expect.","vi":"Trẻ em thường kiên cường hơn người lớn nghĩ.","auto":true},{"en":"A resilient economy can recover from shocks.","vi":"Một nền kinh tế kiên cường có thể phục hồi sau các cú sốc."}],
      "found":true}""").jsonObject


    // ---------------- screens ----------------
    @Composable private fun dictInputContent() = DictScreen(
        DictUi.Input(listOf("ambiguous", "feasible", "mitigate", "diligent", "concur", "went"), listOf(DictSuggest("reluctant", "miễn cưỡng"), DictSuggest("reluctance", "sự miễn cưỡng"), DictSuggest("reluctantly", "một cách miễn cưỡng"))),
        "reluct", DictActions(), {},
    )

    @Composable private fun wordCardContent() {
        val lang = com.lexkite.app.design.LocalL10n.current.lang
        val model = DictPage.model(entry, null, if (lang == "vi") "vi" else "en", { null }, { true })
        val phrases = DictPage.Phrases(listOf(Json.parseToJsonElement("""{"word":"resilient to change","vi":"có khả năng chống chịu thay đổi","ex":""}""").jsonObject), emptyList())
        val related = DictPage.Related(listOf("remarkably", "highly", "incredibly"), emptyList(), listOf("fragile"), listOf("tough", "robust", "adaptable"), false)
        DictScreen(DictUi.Found(DictView(entry, model, false, "UK", lang, phrases, RelatedUi.Ready(related), CtxUi("The economy proved resilient.", "Nền kinh tế tỏ ra kiên cường.", count = 1))), "resilient", DictActions(), {})
    }

    @Composable private fun verbContent() = VerbScreen(VerbUi.Page(VerbPageData.of(verbs, "went", "UK")!!, "UK", "ps", "aff", "act"), VerbActions(), {})

    @Composable private fun usageContent() {
        val key = usage.resolve("interested")!!
        val look = usage.lookup(key)
        val all = Usage.KINDS.flatMap { look.byKind[it] ?: emptyList() }
        val qs = usage.quiz(all, 5, 7L)
        UsageScreen(UsageUi.Word(look, key, UsageQuiz(qs, if (qs.isEmpty()) emptyMap() else mapOf(0 to qs[0].ans)), setOf("interested in"), null), UsageActions(), {})
    }

    @Composable private fun lettersContent() = LettersListScreen(
        "all", Letters.tabs(writing.letters), Letters.list(writing.letters, "all").take(4).mapIndexed { i, l -> LetterRow(l, if (i == 0) 87 else null) }, LettersActions(), {},
    )

    @Composable private fun ideasContent() {
        val cur = Ideas.pick(writing.ideas, "education")!!
        val first = Ideas.ideasOf((cur["issues"] as kotlinx.serialization.json.JsonArray).first() as JsonObject, "for").first()
        IdeasScreen(writing.ideas, cur, setOf(0), setOf(Ideas.chunk((first["chunks"] as kotlinx.serialization.json.JsonArray).first().let { (it as kotlinx.serialization.json.JsonPrimitive).content }).first), Ideas.prompts(writing.prompts, cur), IdeasActions(), {})
    }

    @Composable private fun paraphraseContent() {
        val round = Paraphrase.Round(Paraphrase.pairs(writing.paraphrase), null)
        val q = round.question()
        ParaphraseScreen(ParaUi.Question(0, round.items.size, q, null), ParaActions(), {})
    }

    @Composable private fun phrasesContent() {
        val cards = listOf(
            """{"word":"widen access to higher education","vi":"mở rộng cơ hội học đại học","ex":"Free tuition would widen access to higher education."}""",
            """{"word":"a highly skilled workforce","vi":"lực lượng lao động tay nghề cao","ex":""}""",
            """{"word":"be saddled with debt","vi":"gánh nặng nợ nần","ex":""}""",
            """{"word":"on the other hand","vi":"mặt khác","ex":""}""",
        ).map { Json.parseToJsonElement(it).jsonObject }
        PhrasesScreen(cards, writing.models.size, false, "", "", null, PhrasesActions(), {})
    }

    @Composable private fun modelsContent() {
        val rows = Models.rows(writing.models, writing.prompts, writing.task1, writing.letters)
        ModelsScreen("2", mapOf("2" to Models.tabCount(rows, "2"), "1" to Models.tabCount(rows, "1"), "gt" to Models.tabCount(rows, "gt")), "", Models.list(rows, "2", "").take(6), ModelsActions(), {})
    }

    @Composable private fun modelContent() {
        val m = writing.models.firstOrNull { (it["task"] as? kotlinx.serialization.json.JsonPrimitive)?.content == "2" } ?: writing.models.first()
        val page = Models.page(m, writing.prompts, writing.task1, writing.letters)
        ModelScreen(page, ModelUi(done = listOf("vocab"), saved = setOf(page.chunks.first().first)), ModelTools(), ModelActions(), {})
    }

    // ---------------- 10 states x 4 variants ----------------
    @Test fun dictInputEn() = shot("dictInput", "en", false) { dictInputContent() }
    @Test fun dictInputVi() = shot("dictInput", "vi", false) { dictInputContent() }
    @Test fun dictInputAr() = shot("dictInput", "ar", false) { dictInputContent() }
    @Test fun dictInputDeDark() = shot("dictInput", "de", true) { dictInputContent() }
    @Test fun wordCardEn() = shot("wordCard", "en", false) { wordCardContent() }
    @Test fun wordCardVi() = shot("wordCard", "vi", false) { wordCardContent() }
    @Test fun wordCardAr() = shot("wordCard", "ar", false) { wordCardContent() }
    @Test fun wordCardDeDark() = shot("wordCard", "de", true) { wordCardContent() }
    @Test fun verbEn() = shot("verb", "en", false) { verbContent() }
    @Test fun verbVi() = shot("verb", "vi", false) { verbContent() }
    @Test fun verbAr() = shot("verb", "ar", false) { verbContent() }
    @Test fun verbDeDark() = shot("verb", "de", true) { verbContent() }
    @Test fun usageEn() = shot("usage", "en", false) { usageContent() }
    @Test fun usageVi() = shot("usage", "vi", false) { usageContent() }
    @Test fun usageAr() = shot("usage", "ar", false) { usageContent() }
    @Test fun usageDeDark() = shot("usage", "de", true) { usageContent() }
    @Test fun lettersEn() = shot("letters", "en", false) { lettersContent() }
    @Test fun lettersVi() = shot("letters", "vi", false) { lettersContent() }
    @Test fun lettersAr() = shot("letters", "ar", false) { lettersContent() }
    @Test fun lettersDeDark() = shot("letters", "de", true) { lettersContent() }
    @Test fun ideasEn() = shot("ideas", "en", false) { ideasContent() }
    @Test fun ideasVi() = shot("ideas", "vi", false) { ideasContent() }
    @Test fun ideasAr() = shot("ideas", "ar", false) { ideasContent() }
    @Test fun ideasDeDark() = shot("ideas", "de", true) { ideasContent() }
    @Test fun paraphraseEn() = shot("paraphrase", "en", false) { paraphraseContent() }
    @Test fun paraphraseVi() = shot("paraphrase", "vi", false) { paraphraseContent() }
    @Test fun paraphraseAr() = shot("paraphrase", "ar", false) { paraphraseContent() }
    @Test fun paraphraseDeDark() = shot("paraphrase", "de", true) { paraphraseContent() }
    @Test fun phrasesEn() = shot("phrases", "en", false) { phrasesContent() }
    @Test fun phrasesVi() = shot("phrases", "vi", false) { phrasesContent() }
    @Test fun phrasesAr() = shot("phrases", "ar", false) { phrasesContent() }
    @Test fun phrasesDeDark() = shot("phrases", "de", true) { phrasesContent() }
    @Test fun modelsEn() = shot("models", "en", false) { modelsContent() }
    @Test fun modelsVi() = shot("models", "vi", false) { modelsContent() }
    @Test fun modelsAr() = shot("models", "ar", false) { modelsContent() }
    @Test fun modelsDeDark() = shot("models", "de", true) { modelsContent() }
    @Test fun modelEn() = shot("model", "en", false) { modelContent() }
    @Test fun modelVi() = shot("model", "vi", false) { modelContent() }
    @Test fun modelAr() = shot("model", "ar", false) { modelContent() }
    @Test fun modelDeDark() = shot("model", "de", true) { modelContent() }
}
