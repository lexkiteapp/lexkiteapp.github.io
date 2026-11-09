package com.lexkite.app.feature.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.Icon
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.lexkite.app.core.vocab.CardMath
import com.lexkite.app.core.sync.WebCards
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.MinTap
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import java.io.File

/**
 * State of the Anki dialog (web App.anki): export = options -> file -> steps for the learner's device; import = pick a file -> check the columns -> import.
 * Logic = [AnkiKit]. [cards] = every saved card, [shown] = the ones the deck filters match; [reload] re-reads the deck after an import.
 */
class AnkiFlow(
    private val env: VocabEnv, private val scope: CoroutineScope, private val platform: DeckPlatform,
    private val cards: () -> List<JsonObject>, private val shown: () -> List<JsonObject>, private val reload: suspend () -> Unit,
) {
    enum class Format(val ext: String, val mime: String) { Apkg("apkg", "application/octet-stream"), Txt("txt", "text/plain"), Csv("csv", "text/csv") }
    enum class Export { Form, Building, Ready, Failed }
    enum class Import { Pick, Reading, Failed, Review, Importing, Done }
    enum class Fail { NotAnki, NewFormat, Damaged, TooBig, Failed }

    var open by mutableStateOf<String?>(null)              // null = closed · "export" · "import"
    var format by mutableStateOf(Format.Apkg); var onlyShown by mutableStateOf(false); var keepProgress by mutableStateOf(true)
    var exportState by mutableStateOf(Export.Form); var fileName by mutableStateOf(""); var fileCount by mutableIntStateOf(0); var device by mutableStateOf("ankimobile")
    private var fileBytes: ByteArray = ByteArray(0)
    var importState by mutableStateOf(Import.Pick); var fail by mutableStateOf(Fail.Failed)
    var set by mutableStateOf<AnkiKit.NoteSet?>(null); private var textCards: Map<String, JsonObject> = emptyMap(); private var textDup = 0
    var map by mutableStateOf(AnkiKit.ColumnMap()); var deckName by mutableStateOf(""); var plan by mutableStateOf(AnkiKit.Plan(emptyList(), 0, 0))
    var imported by mutableIntStateOf(0); var done by mutableIntStateOf(0); var total by mutableIntStateOf(0); var rowCount by mutableIntStateOf(0)

    val all: List<JsonObject> get() = cards()
    val shownCards: List<JsonObject> get() = shown()
    val canChooseScope: Boolean get() = shown().size != all.size && shown().isNotEmpty()
    val list: List<JsonObject> get() = if (onlyShown && canChooseScope) shown() else all
    private val tmp: File get() = File(env.cacheDir, "anki")
    private fun existing(): Set<String> = all.map { CardMath.keyOf(it.gs("word")) }.toSet()

    fun show(tab: String) { open = tab; exportState = Export.Form; importState = Import.Pick }
    fun close() { open = null }

    // ---- export ----
    fun create(deckTitle: String, collocations: String, viMeanings: Boolean) {
        if (list.isEmpty() || exportState == Export.Building) return
        exportState = Export.Building
        val src = list; val fmt = format; val keep = keepProgress; val now = env.now()
        scope.launch {
            val r = withContext(Dispatchers.Default) {
                runCatching {
                    val items = src.map { AnkiKit.item(it, viMeanings) }
                    val stamp = java.text.SimpleDateFormat("yyyyMMdd-HHmm", java.util.Locale.US).format(java.util.Date(now))
                    val name = "lexkite-$stamp.${fmt.ext}"
                    when (fmt) {
                        Format.Apkg -> AnkiKit.buildApkg(items, tmp, deckTitle, keep, collocationsLabel = collocations, now = now).let { Triple(name, it.bytes, it.count) }
                        Format.Txt -> Triple(name, DeckIo.ankiText(src, deckTitle).toByteArray(Charsets.UTF_8), src.size)
                        Format.Csv -> Triple(name, AnkiKit.csv(items).toByteArray(Charsets.UTF_8), items.size)
                    }
                }.getOrNull()
            }
            if (r == null) exportState = Export.Failed else { fileName = r.first; fileBytes = r.second; fileCount = r.third; exportState = Export.Ready }
        }
    }
    fun save() { platform.saveBytes(fileName, format.mime, fileBytes) }

    // ---- import ----
    fun pick() { platform.pickBytes { bytes, name -> load(bytes, name.substringBeforeLast('.')) } }
    fun load(data: ByteArray, name: String) {
        importState = Import.Reading
        val isPackage = data.size > 1 && data[0] == 'P'.code.toByte() && data[1] == 'K'.code.toByte() || (data.size >= 6 && String(data, 0, 6, Charsets.ISO_8859_1) == "SQLite")
        if (!isPackage && data.size > 50 * 1_048_576) { fail = Fail.TooBig; importState = Import.Failed; return }
        scope.launch {
            val res = withContext(Dispatchers.Default) {
                runCatching<Pair<AnkiKit.NoteSet?, DeckIo.Imported?>> {
                    if (isPackage) AnkiKit.parsePackage(data, tmp) to null
                    else null to DeckIo.importText(String(data, Charsets.UTF_8), name, emptyMap(), env.now())
                }
            }
            val ok = res.getOrNull()
            if (ok == null) {
                val k = (res.exceptionOrNull() as? AnkiKit.Failure)?.kind
                fail = when (k) { AnkiKit.Failure.Kind.NewFormat -> Fail.NewFormat; AnkiKit.Failure.Kind.NotAnki -> Fail.NotAnki; AnkiKit.Failure.Kind.TooBig -> Fail.TooBig; else -> Fail.Damaged }
                importState = Import.Failed; return@launch
            }
            val (s, text) = ok
            set = s; textCards = text?.cards ?: emptyMap()
            deckName = (s?.deck?.takeIf { it.isNotEmpty() } ?: text?.deck ?: name).ifEmpty { name }
            rowCount = s?.rows?.size ?: textCards.size + (text?.duplicates ?: 0)
            if (s != null) map = AnkiKit.guessMap(s.columns)
            replan()
            if (rowCount == 0) { fail = Fail.NotAnki; importState = Import.Failed } else importState = Import.Review
        }
    }
    fun pickColumn(field: String, i: Int) {
        map = when (field) { "word" -> AnkiKit.ColumnMap(i, map.mean, map.ex, map.ipa); "mean" -> AnkiKit.ColumnMap(map.word, i, map.ex, map.ipa); "ex" -> AnkiKit.ColumnMap(map.word, map.mean, i, map.ipa); else -> AnkiKit.ColumnMap(map.word, map.mean, map.ex, i) }
        replan()
    }
    private fun replan() {
        val have = existing()
        val s = set
        plan = if (s != null) AnkiKit.plan(s, map, have)
        else { val fresh = textCards.values.filter { CardMath.keyOf(it.gs("word")) !in have }; AnkiKit.Plan(fresh, textCards.size - fresh.size + textDup, 0) }
    }
    fun runImport() {
        val entries = plan.entries
        if (entries.isEmpty() || importState != Import.Review) return
        total = entries.size; done = 0; importState = Import.Importing
        val name = deckName.trim().ifEmpty { "Anki" }
        scope.launch {
            var added = 0; val now = env.now()
            for (chunk in entries.chunked(200)) {
                val made = LinkedHashMap<String, JsonObject>()
                for (e in chunk) {
                    val key = CardMath.keyOf(e.gs("word"))
                    made[key] = if (e.gt("srs") || e.gt("added")) e.with("deck" to name) else WebCards.make(e, now, mapOf("deck" to JsonPrimitive(name), "added" to JsonPrimitive(now)))
                }
                env.write(changed = made); added += made.size; done = added
                kotlinx.coroutines.yield()
            }
            imported = added; reload(); importState = Import.Done
        }
    }
    fun reset() { importState = Import.Pick; set = null; textCards = emptyMap(); plan = AnkiKit.Plan(emptyList(), 0, 0) }
    fun columnLabel(i: Int): String = set?.columns?.getOrNull(i)?.takeIf { it.isNotEmpty() } ?: ""
    fun previewRows(): List<String> {
        val s = set ?: return textCards.values.take(10).map { it.gs("word") }
        val k = map.word
        return s.rows.take(10).map { r -> AnkiKit.htmlToText(if (k >= 0 && k < r.cells.size) r.cells[k] else "").split(" · ").firstOrNull().orEmpty() }.filter { it.isNotEmpty() }
    }
}

// ---------------------------------------------------------------- UI
/** The step-by-step Anki dialog (export · import) over the deck page. */
@Composable
internal fun AnkiDialog(f: AnkiFlow, open: (String) -> Unit) {
    val tab = f.open ?: return
    val c = LocalLKColors.current
    Dialog(onDismissRequest = f::close, properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false)) {
        Column(Modifier.fillMaxSize().background(c.background)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                Text(t(if (tab == "export") L10nKey.vocabExportToAnki else L10nKey.vocabImportFromAnki), Modifier.weight(1f), style = LKType.headlineSm.toCompose(), color = c.onSurface)
                Box(Modifier.size(MinTap).clip(CircleShape).tactile(f::close, t(L10nKey.actionClose)), contentAlignment = Alignment.Center) { Icon(Icons.Filled.Close, null, tint = c.onSurface) }
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = LKSpacing.gutter), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Chip(t(L10nKey.vocabExport), tab == "export", { f.show("export") }, Modifier.weight(1f))
                Chip(t(L10nKey.vocabImport), tab == "import", { f.show("import") }, Modifier.weight(1f))
            }
            Column(Modifier.weight(1f).fillMaxWidth().verticalScroll(rememberScrollState()).padding(horizontal = LKSpacing.gutter, vertical = LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd)) {
                if (tab == "export") ExportBody(f) else ImportBody(f, open)
            }
        }
    }
}

@Composable
private fun Option(title: String, sub: String?, selected: Boolean, badge: String? = null, onPick: () -> Unit) {
    val c = LocalLKColors.current
    LKCard(onClick = onPick, label = title, fill = if (selected) c.surfaceContainerHighest else c.card) {
        Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.Top) {
            Text(if (selected) "◉" else "○", style = LKType.titlePill.toCompose(), color = c.secondary)
            Column(Modifier.weight(1f)) {
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) { Body(title, Modifier.weight(1f, fill = false), style = LKType.titlePill); if (badge != null) Tag(badge, c.success) }
                if (sub != null) Muted(sub)
            }
        }
    }
}

@Composable
private fun Steps(steps: List<String>) {
    val c = LocalLKColors.current
    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
        steps.forEachIndexed { i, s ->
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.Top) {
                Box(Modifier.size(24.dp).clip(CircleShape).background(c.secondary), contentAlignment = Alignment.Center) { Text(t.num(i + 1), style = LKType.labelMetric.toCompose(), color = c.onSecondary) }
                Body(s, Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun ExportBody(f: AnkiFlow) {
    val c = LocalLKColors.current
    when (f.exportState) {
        AnkiFlow.Export.Building -> Box(Modifier.fillMaxWidth().heightIn(min = 160.dp), contentAlignment = Alignment.Center) { Muted(t(L10nKey.vocabCreatingFile)) }
        AnkiFlow.Export.Ready -> ExportDone(f)
        else -> {
            Muted(t(L10nKey.vocabUseYourLexkiteWordsIn))
            if (f.all.isEmpty()) { Body(t(L10nKey.vocabThereAreNoWordsTo)); return }
            val item = f.list.firstOrNull()?.let { AnkiKit.item(it, t.lang == "vi") }
            Label(t(L10nKey.vocabYourCardsWillLookLike), color = c.secondary)
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                PreviewSide(t(L10nKey.vocabFront), listOf(item?.word ?: "", item?.ipa ?: ""), Modifier.weight(1f))
                PreviewSide(t(L10nKey.vocabBack), listOf(item?.meaning ?: "", item?.def ?: "", item?.ex ?: "", item?.exMeaning ?: "", (item?.col ?: emptyList()).joinToString(" · ")), Modifier.weight(1f))
            }
            if (f.canChooseScope) {
                Label(t(L10nKey.vocabWhichWordsToExport), color = c.secondary)
                Option(t(L10nKey.vocabAll) + " (" + t.num(f.all.size) + ")", null, !f.onlyShown) { f.onlyShown = false }
                Option(t(L10nKey.vocabOnlyTheFilteredWords) + " (" + t.num(f.shownCards.size) + ")", null, f.onlyShown) { f.onlyShown = true }
            }
            Label(t(L10nKey.vocabFormat), color = c.secondary)
            Option(t(L10nKey.vocabAnkiPackageApkg), t(L10nKey.vocabBeautifulCardsWithIpaAudio), f.format == AnkiFlow.Format.Apkg, t(L10nKey.vocabRecommended)) { f.format = AnkiFlow.Format.Apkg }
            Option(t(L10nKey.vocabTextForAnkiTxt), t(L10nKey.vocabImportWithFileImportAs), f.format == AnkiFlow.Format.Txt) { f.format = AnkiFlow.Format.Txt }
            Option(t(L10nKey.vocabSpreadsheetCsv), t(L10nKey.vocabOpenInExcelOrGoogle), f.format == AnkiFlow.Format.Csv) { f.format = AnkiFlow.Format.Csv }
            if (f.format == AnkiFlow.Format.Apkg) Row(Modifier.fillMaxWidth().heightIn(min = MinTap), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                Column(Modifier.weight(1f)) { Body(t(L10nKey.vocabKeepMyReviewProgressFsrs), style = LKType.titlePill); Muted(t(L10nKey.vocabWordsAlreadyInReviewKeep)) }
                Switch(f.keepProgress, { f.keepProgress = it })
            }
            if (f.exportState == AnkiFlow.Export.Failed) Notice(t(L10nKey.vocabCouldNotCreateTheFile), false)
            val deckTitle = t(L10nKey.vocabMyWords); val col = t(L10nKey.vocabCollocations); val vi = t.lang == "vi"
            LKPrimaryButton(t(L10nKey.vocabCreateFile), { f.create(deckTitle, col, vi) })
        }
    }
}

@Composable
private fun PreviewSide(title: String, lines: List<String>, modifier: Modifier) {
    val c = LocalLKColors.current
    Column(modifier.clip(androidx.compose.foundation.shape.RoundedCornerShape(14.dp)).background(c.surfaceContainerHighest).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Label(title)
        lines.filter { it.isNotEmpty() }.forEachIndexed { i, l -> EnLtr { Body(l, style = if (i == 0) LKType.titlePill else LKType.bodySm, color = if (i == 0) c.onSurface else c.onSurfaceVariant) } }
    }
}

@Composable
private fun ExportDone(f: AnkiFlow) {
    val c = LocalLKColors.current
    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Text("✅", style = LKType.displayHero.toCompose())
        Body(t(L10nKey.vocabYourFileIsReady), style = LKType.headlineSm)
        Muted(t(L10nKey.vocabCards, mapOf("n" to t.num(f.fileCount), "f" to f.fileName)), align = TextAlign.Center)
    }
    LKPrimaryButton(t(if (f.format == AnkiFlow.Format.Apkg) L10nKey.vocabSendToTheAnkiApp else L10nKey.vocabDownloadAgain), f::save)
    val d = t(L10nKey.vocabMyWords)
    val steps = when (f.format) {
        AnkiFlow.Format.Txt -> listOf(t(L10nKey.vocabOpenAnkiOnYourComputer), t(L10nKey.vocabChooseFileImportAndPick), t(L10nKey.vocabCheckThatTheNoteType))
        AnkiFlow.Format.Csv -> listOf(t(L10nKey.vocabOpenTheFileInExcel), t(L10nKey.vocabForAnkiFileImportChoose))
        AnkiFlow.Format.Apkg -> when (f.device) {
            "computer" -> listOf(t(L10nKey.vocabOpenAnkiOnYourComputer), t(L10nKey.vocabDoubleClickTheDownloadedFile), t(L10nKey.vocabTheDeckAppearsInYour, mapOf("d" to d)))
            "ankidroid" -> listOf(t(L10nKey.vocabInstallAnkidroidFreeOnGoogle), t(L10nKey.vocabTapSendToTheAnki), t(L10nKey.vocabOrInAnkidroidImportChoose), t(L10nKey.vocabTheDeckAppearsInYour, mapOf("d" to d)))
            else -> listOf(t(L10nKey.vocabInstallAnkimobileFromTheApp), t(L10nKey.vocabTapSendToTheAnkiApp), t(L10nKey.vocabOpenTheFilesAppDownloads), t(L10nKey.vocabChooseImportTheDeckAppears))
        }
    }
    Label(t(L10nKey.vocabDevice), color = c.secondary)
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        listOf("computer" to t(L10nKey.vocabComputer), "ankidroid" to "AnkiDroid", "ankimobile" to "AnkiMobile").forEach { (k, l) -> Chip(l, f.device == k, { f.device = k }, Modifier.weight(1f)) }
    }
    Steps(steps)
    if (f.format == AnkiFlow.Format.Apkg) { Muted(t(L10nKey.vocabExportingAgainLaterOnlyUpdates)); Muted(t(L10nKey.vocabPronunciationUsesYourDeviceS)) }
    GhostButton(t(L10nKey.vocabDone), f::close, Modifier.fillMaxWidth())
}

@Composable
private fun ImportBody(f: AnkiFlow, open: (String) -> Unit) {
    val c = LocalLKColors.current
    when (f.importState) {
        AnkiFlow.Import.Pick -> {
            Body(t(L10nKey.vocabHowDoIGetA), style = LKType.titlePill)
            Steps(listOf(t(L10nKey.vocabInAnkiSelectTheDeck), t(L10nKey.vocabChooseAnkiDeckPackageApkg), t(L10nKey.vocabChooseThatFileHereAudio)))
            LKPrimaryButton(t(L10nKey.vocabChooseFile), f::pick)
        }
        AnkiFlow.Import.Reading -> Box(Modifier.fillMaxWidth().heightIn(min = 160.dp), contentAlignment = Alignment.Center) { Muted(t(L10nKey.vocabReadingFile)) }
        AnkiFlow.Import.Failed -> {
            Notice(t(when (f.fail) {
                AnkiFlow.Fail.NotAnki -> L10nKey.vocabNoAnkiDeckWasFound; AnkiFlow.Fail.NewFormat -> L10nKey.vocabThisFileUsesANewer; AnkiFlow.Fail.TooBig -> L10nKey.vocabTheFileIsTooLarge
                AnkiFlow.Fail.Damaged -> L10nKey.vocabTheFileIsDamagedOr; AnkiFlow.Fail.Failed -> L10nKey.vocabTheImportFailedPleaseTry }), false)
            GhostButton(t(L10nKey.vocabChooseAnotherFile), f::reset, Modifier.fillMaxWidth())
        }
        AnkiFlow.Import.Review -> {
            Body(t(L10nKey.vocabCardsInTheFile, mapOf("n" to t.num(f.rowCount))), style = LKType.titlePill)
            Label(t(L10nKey.vocabWordSetNameInLexkite), color = c.secondary)
            StudyField(f.deckName, { f.deckName = it }, t(L10nKey.vocabWordSetNameInLexkite))
            f.set?.let { s ->
                ColumnPicker(t(L10nKey.vocabEnglishWord), f, s, f.map.word) { f.pickColumn("word", it) }
                ColumnPicker(t(L10nKey.usageMeaning), f, s, f.map.mean) { f.pickColumn("mean", it) }
                ColumnPicker(t(L10nKey.revExample), f, s, f.map.ex) { f.pickColumn("ex", it) }
                ColumnPicker(t(L10nKey.vocabIpa), f, s, f.map.ipa) { f.pickColumn("ipa", it) }
            }
            Label(t(L10nKey.vocabPreviewOfTheFirst10), color = c.secondary)
            val have = remember(f.importState) { f.all.map { CardMath.keyOf(it.gs("word")) }.toSet() }
            f.previewRows().forEach { w ->
                val known = CardMath.keyOf(w) in have
                Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    EnLtr { Body(w, Modifier.weight(1f), style = LKType.titlePill) }
                    Text(t(if (known) L10nKey.vocabAlreadySaved2 else L10nKey.vocabWillImport), style = LKType.labelBadge.toCompose(), color = if (known) c.onSurfaceVariant else c.success)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Tag(t(L10nKey.vocabAlreadySaved, mapOf("n" to t.num(f.plan.duplicates))), c.onSurfaceVariant)
                if (f.plan.invalid > 0) Tag(t(L10nKey.vocabSkipped, mapOf("n" to t.num(f.plan.invalid))), c.onSurfaceVariant)
            }
            Muted(t(L10nKey.vocabNewWordsAreAddedTo))
            if (f.plan.entries.isEmpty()) Body(t(L10nKey.vocabNoNewWordsToImport))
            else LKPrimaryButton(t(L10nKey.vocabImportWords, mapOf("n" to t.num(f.plan.entries.size))), f::runImport)
            GhostButton(t(L10nKey.vocabChooseAnotherFile), f::reset, Modifier.fillMaxWidth())
        }
        AnkiFlow.Import.Importing -> Column(Modifier.fillMaxWidth().heightIn(min = 160.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Box(Modifier.fillMaxWidth().height(8.dp).clip(androidx.compose.foundation.shape.RoundedCornerShape(4.dp)).background(c.surfaceContainerHighest)) {
                Box(Modifier.fillMaxWidth((f.done.toFloat() / maxOf(1, f.total)).coerceIn(0f, 1f)).fillMaxHeight().background(c.secondary))
            }
            Muted(t(L10nKey.vocabImportingWords, mapOf("i" to t.num(f.done), "n" to t.num(f.total))))
        }
        AnkiFlow.Import.Done -> {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                Text("✅", style = LKType.displayHero.toCompose())
                Body(t(L10nKey.vocabImportedWordsInto, mapOf("n" to t.num(f.imported), "d" to f.deckName)), style = LKType.headlineSm, align = TextAlign.Center)
                val skipped = f.plan.duplicates + f.plan.invalid
                if (skipped > 0) Muted(t(L10nKey.vocabSkippedWordsThatWereAlready, mapOf("k" to t.num(skipped))), align = TextAlign.Center)
                Muted(t(L10nKey.vocabTheNewWordsAreIn), align = TextAlign.Center)
            }
            LKPrimaryButton(t(L10nKey.vocabStart), { f.close(); open("practice/learn?src=deck") })
            GhostButton(t(L10nKey.vocabSeeInMyWords), f::close, Modifier.fillMaxWidth())
        }
    }
}

@Composable
private fun ColumnPicker(title: String, f: AnkiFlow, s: AnkiKit.NoteSet, sel: Int, onPick: (Int) -> Unit) {
    var pick by remember { mutableStateOf(false) }
    val name = if (sel < 0) t(L10nKey.vocabNotUsed) else f.columnLabel(sel).ifEmpty { t(L10nKey.vocabColumn, mapOf("n" to t.num(sel + 1))) }
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
        Body(title, Modifier.weight(1f))
        GhostButton(name, { pick = true })
    }
    if (pick) PickerDialog(title, listOf("-1" to t(L10nKey.vocabNotUsed)) + s.columns.indices.map { it.toString() to (f.columnLabel(it).ifEmpty { t(L10nKey.vocabColumn, mapOf("n" to t.num(it + 1))) }) }, sel.toString(), { onPick(it.toInt()); pick = false }, { pick = false })
}
