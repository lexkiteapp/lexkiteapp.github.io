package com.lexkite.app.feature.skills

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.platform.testTag
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.skills.Dictation
import com.lexkite.app.core.skills.ListenHub
import com.lexkite.app.core.skills.ListenPage
import com.lexkite.app.core.skills.ListenTest
import com.lexkite.app.core.skills.Lexis
import com.lexkite.app.core.skills.Part
import com.lexkite.app.core.skills.Qx
import com.lexkite.app.core.skills.Reader
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LKProgress
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.PillShape
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.feature.vocab.Body
import com.lexkite.app.feature.vocab.Chip
import com.lexkite.app.feature.vocab.Confirm
import com.lexkite.app.feature.vocab.EmptyState
import com.lexkite.app.feature.vocab.EnLtr
import com.lexkite.app.feature.vocab.Flow
import com.lexkite.app.feature.vocab.GhostButton
import com.lexkite.app.feature.vocab.Muted
import com.lexkite.app.feature.vocab.Notice
import com.lexkite.app.feature.vocab.RichBody
import com.lexkite.app.feature.vocab.SpeakButton
import com.lexkite.app.feature.vocab.StudyField
import com.lexkite.app.feature.vocab.StudyPage
import com.lexkite.app.feature.vocab.Tag
import com.lexkite.app.feature.vocab.t
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

private fun JsonObject?.str(k: String) = (this?.get(k) as? JsonPrimitive)?.content.orEmpty()
private fun n(x: Number) = mapOf("n" to x)

// ---------------------------------------------------------------- tap-a-word popup
/** The dictionary popup under a transcript / passage: looking up · found · not found. */
data class PopupUi(val word: String, val sentence: String, val loading: Boolean = false, val entry: JsonObject? = null, val translation: String = "", val saved: Boolean = false, val done: Boolean = false, val details: Boolean = false)

@Composable
internal fun PopupCard(p: PopupUi, onClose: () -> Unit, onSave: () -> Unit, onSpeak: () -> Unit, onDetails: () -> Unit) {
    val c = LocalLKColors.current
    LKCard(fill = c.surfaceContainerHighest) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Body(p.entry.str("word").ifEmpty { p.word }, style = LKType.headlineSm, modifier = Modifier.weight(1f))
            if (p.entry != null) SpeakButton(onSpeak)
            GhostButton("✕", onClose)
        }
        val e = p.entry
        when {
            p.loading -> Muted(t(L10nKey.lessonStoryLookup, mapOf("w" to p.word)))
            e == null -> { Body(t(L10nKey.lessonStoryNotFound, mapOf("w" to p.word))); if (p.translation.isNotEmpty()) RichBody(t(L10nKey.skillReadDichVi, mapOf("vi" to p.translation))) }
            else -> {
                val ipa = e.str("ipa"); val pos = e.str("pos"); val lv = e.str("level")
                if (pos.isNotEmpty() || lv.isNotEmpty()) Flow { if (pos.isNotEmpty()) Tag(pos); if (lv.isNotEmpty()) Tag(lv) }
                if (ipa.isNotEmpty()) EnLtr { Muted(ipa) }
                if (p.translation.isNotEmpty()) Body(p.translation, style = LKType.bodyLg)
                if (p.details && e.str("def").isNotEmpty() && e.str("def") != p.translation) EnLtr { Muted(e.str("def")) }
                EnLtr { Text(buildAnnotatedString { for ((i, part) in p.sentence.split(p.word, ignoreCase = true).withIndex()) { if (i > 0) withStyle(SpanStyle(fontWeight = FontWeight.Bold)) { append(p.word) }; append(part) } }, style = LKType.bodyMd.toCompose(), color = c.onSurface) }
                Flow {
                    GhostButton(if (p.done) "✓ " + t(L10nKey.skillListenDaLuuKemNgu) else "+ " + t(if (p.saved) L10nKey.dictAddContext else L10nKey.dictSaveFlashcard), onSave, enabled = !p.done)
                    if (p.details) GhostButton(t(L10nKey.skillReadChiTiet), onDetails)
                }
            }
        }
    }
}

// ---------------------------------------------------------------- #/listening hub
class HubUi(val hub: ListenHub.Hub?, val lang: String)
class HubActions(val open: (String) -> Unit = {}, val test: (Int) -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun ListenHubScreen(ui: HubUi, a: HubActions) {
    val c = LocalLKColors.current; val h = ui.hub
    StudyPage(t(L10nKey.skillListenLuyenNgheIelts), a.exit) {
        Muted(t(L10nKey.skillListenDeTuBienSoan))
        if (h == null || h.empty) EmptyState("🎧", t(L10nKey.skillListenDangCapNhatDe)) else {
            if (h.tabs.isNotEmpty()) Flow { for (tab in h.tabs) Chip("Test ${tab.n}" + if (tab.done) " ✓" else "", tab.selected, { a.test(tab.n) }) }
            LKCard {
                Flow { Body("Test ${h.selected}", style = LKType.headlineSm); h.band?.let { Tag("Band ${if (it == Math.floor(it)) it.toInt() else it}", c.success) } }
                LKPrimaryButton(t(L10nKey.skillListenThiThu40Cau), { a.open(h.fullTest.orEmpty()) })
            }
            for (p in h.parts) LKCard(fill = c.surfaceContainerHighest) {
                Flow { Tag("Part ${p.part} · " + t(PART_NAME.getValue(p.part))); if (p.best != null) Tag("✓ ${p.best}/10", c.success) }
                Body(p.title, style = LKType.titlePill); Muted(p.sub); SpeakerChips(p.speakers)
                Flow { GhostButton(t(L10nKey.skillListenLuyenTap), { a.open(p.actions[0]) }); GhostButton(t(L10nKey.skillListenNghe1Lan), { a.open(p.actions[1]) }); GhostButton(t(L10nKey.skillListenChepChinhTa), { a.open(p.actions[2]) }) }
            }
        }
        LKCard {
            Body(t(L10nKey.skillListenMeoLamBaiListening), style = LKType.titlePill)
            for (k in listOf(L10nKey.skillListenDocTruocCauHoi, L10nKey.skillListenCanThanBayDoi, L10nKey.skillListenParaphraseCauHoiHiem, L10nKey.skillListenGioiHanTuOne, L10nKey.skillListenChepChinhTa10)) RichBody("• " + t(k), style = LKType.bodySm)
        }
    }
}

// ---------------------------------------------------------------- #/listen/<part>
data class ListenUi(
    val page: ListenPage.Page, val answers: Map<String, Any?> = emptyMap(), val playing: Boolean = false, val plays: Int = 0, val line: Int = -1, val ended: Boolean = false, val blocked: Boolean = false,
    val live: Boolean = false, val rows: List<ListenPage.Row> = emptyList(), val submit: ListenPage.Submit? = null, val popup: PopupUi? = null, val saved: Set<Int> = emptySet(), val confirmSubmit: Boolean = false,
    val retake: Boolean = false, val recheck: Map<Int, Qx.Res>? = null, val showAll: Boolean = false,
)
class ListenActions(
    val play: () -> Unit = {}, val back: () -> Unit = {}, val rate: (Double) -> Unit = {}, val live: (Boolean) -> Unit = {}, val answer: (String, Any?) -> Unit = { _, _ -> }, val submit: () -> Unit = {}, val confirm: (Boolean) -> Unit = {},
    val again: () -> Unit = {}, val line: (Int) -> Unit = {}, val word: (String, String) -> Unit = { _, _ -> }, val closePopup: () -> Unit = {}, val savePopup: () -> Unit = {}, val speakWord: () -> Unit = {}, val hear: (Int) -> Unit = {},
    val saveVocab: (Int) -> Unit = {}, val retake: () -> Unit = {}, val recheck: () -> Unit = {}, val showAll: () -> Unit = {}, val switchMode: () -> Unit = {}, val open: (String) -> Unit = {}, val exit: () -> Unit = {},
)

/** The player bar: play / pause, previous line, speed, live-transcript switch (practice) or the one-listen note (exam). */
@Composable
private fun PlayerBar(ui: ListenUi, a: ListenActions) {
    val p = ui.page.part; val exam = ui.page.exam; val submitted = ui.submit != null; val l = p.script.getOrNull(ui.line)
    LKCard {
        LKPrimaryButton(when {
            exam && !submitted && ui.plays > 0 -> if (ui.playing) "🔊 " + t(L10nKey.skillListenDangPhat) else "✓ " + t(L10nKey.skillListenDaNgheXong)
            ui.playing -> "⏸ " + t(L10nKey.skillListenTamDung); ui.ended && !exam -> "↺ " + t(L10nKey.skillListenNgheLaiTuDau); exam && submitted -> "▶ " + t(L10nKey.lessonReplay)
            ui.plays > 0 -> "▶ " + t(L10nKey.skillListenNgheTiep); else -> "▶ " + t(L10nKey.lessonKindListen) }, a.play, enabled = !(exam && !submitted && ui.plays > 0))
        if (ui.blocked) Notice(t(L10nKey.skillListenChamDeNghe), ok = false)
        if (exam) Muted(t(if (submitted) L10nKey.skillListenDaNopBaiGio else L10nKey.skillListenCheDoThiThat2))
        else {
            Flow {
                GhostButton("⏪ " + t(L10nKey.skillListenCauTruoc), a.back)
                for (r in ui.page.rates) Chip(r.label?.let { it } ?: t(L10nKey.skillListenChuan), r.selected, { a.rate(r.v) })
            }
            SwitchRow(t(L10nKey.skillListenHienLoiThoaiKhi), ui.live || submitted, enabled = !submitted) { a.live(it) }
        }
        val now = if (l == null) (if (exam && ui.ended && !submitted) t(L10nKey.skillListenHetBaiNgheKiem) else "") else if (l.pause != null) "… (" + t(L10nKey.skillListenKhoangLang) + ")" else if (l.say != null) "🎙️ " + t(L10nKey.skillListenLoiDan) else "🗣️ " + p.speakerName(l.s)
        if (now.isNotEmpty()) Muted(now)
    }
}

@Composable
internal fun Transcript(ui: ListenUi, a: ListenActions) {
    val c = LocalLKColors.current; val show = ui.live || ui.submit != null
    LKCard(fill = c.surfaceContainerHighest) {
        Body("📜 " + t(L10nKey.skillListenLoiThoai), style = LKType.titlePill); Muted(t(L10nKey.skillListenBamDongDeNghe))
        for (r in ui.rows) {
            val on = r.line.i == ui.line
            val sent = r.tokens.orEmpty().joinToString("") { if (it is Lexis.Tok) it.text else it.toString() }
            Column(Modifier.fillMaxWidth().clip(androidx.compose.foundation.shape.RoundedCornerShape(16.dp)).background(if (on) c.secondaryContainer else c.surfaceContainerHighest).clickable(enabled = show) { a.line(r.line.i) }.heightIn(min = 44.dp).padding(LKSpacing.spaceXs)) {
                if (r.line.say != null) { if (show) EnLtr { Muted(r.line.say.orEmpty()) } else Muted("• • • • •") } else {
                    Muted(ui.page.part.speakerName(r.line.s))
                    if (!show) Muted("• • • • •") else EnLtr { TokenText(listOf(TokSent(r.tokens.orEmpty(), sent)), LKType.bodyMd.toCompose().copy(color = c.onSurface), { tk -> androidx.compose.ui.text.SpanStyle(color = if ("awl" in tk.cls) c.secondary else c.onSurface) }, c.secondaryContainer, { tk, snt -> a.word(tk.w, snt) }) }
                    if (r.ev.isNotEmpty()) Flow { for (e in r.ev) Tag(t(L10nKey.usageQ, mapOf("n" to e.toString()))) }
                }
            }
        }
    }
}

@Composable
fun ListenScreen(ui: ListenUi, a: ListenActions) {
    val c = LocalLKColors.current; val pg = ui.page; val p = pg.part; val s = ui.submit
    val answered = p.qNums.count { n -> val v = ui.answers[n.toString()]; (v as? String)?.isNotBlank() == true }
    StudyPage(t(if (pg.toeic) L10nKey.skillListenHoiThoai else PART_NAME.getValue(p.part)), a.exit, bottom = {
        ui.popup?.let { PopupCard(it, a.closePopup, a.savePopup, a.speakWord, {}) }
        if (s == null) LKPrimaryButton(t(L10nKey.skillListenNopBaiXemDap), a.submit)
    }) {
        GhostButton(t(if (pg.exam) L10nKey.skillListenCheDoLuyenTap else L10nKey.skillListenCheDoThiThat), a.switchMode)
        LKProgress(if (p.qNums.isEmpty()) 0f else answered / p.qNums.size.toFloat(), label = t(L10nKey.skillListenCauAB, mapOf("a" to p.qFrom, "b" to p.qTo)), track = c.surfaceContainerHighest)
        Muted(Bidi.ltr("Test ${p.test} · Part ${p.part}") + " · " + t(PART_NAME.getValue(p.part)) + " · " + Bidi.isolate(t(L10nKey.skillListenCauAB, mapOf("a" to p.qFrom, "b" to p.qTo))))
        Body(p.title, style = LKType.headlineMd); Muted(p.context); SpeakerChips(ListenHub.speakers(p))
        PlayerBar(ui, a)
        if (!pg.exam || s != null) Transcript(ui, a)
        val shown = if (ui.retake) ui.recheck else s?.res
        if (s != null && ui.retake) Box(Modifier.testTag("skills-retake")) { LKCard { Flow { if (ui.recheck == null) LKPrimaryButton(t(L10nKey.actionCheck), a.recheck) else Body(t(L10nKey.skillQeLamLaiDungRight, mapOf("right" to ui.recheck.values.count { it.ok }, "total" to ui.recheck.size)), style = LKType.titlePill)
            GhostButton(t(L10nKey.skillQeHienTatCaCau), a.showAll) } } }
        QuestionGroups(p, ui.answers, shown, pg.tipsOn, a.answer, a.hear, if (ui.retake && !ui.showAll && s != null) s.res.filterValues { it.ok }.keys else emptySet())
        if (s != null && !ui.retake) StatsCard(s.res.values, a.retake)
        if (s != null) {
            LKCard(fill = if (s.ok) c.surfaceContainerHighest else c.errorContainer) {
                Body(t(L10nKey.skillListenABCauDung, mapOf("a" to s.right, "b" to s.total)) + " · +${s.xp} XP", style = LKType.headlineSm)
                Body(t(when { s.right >= 9 -> L10nKey.skillListenXuatSacMucBand; s.right >= 7 -> L10nKey.skillListenTotXemLaiCac; else -> L10nKey.skillListenMoLoiThoaiBen }))
                Flow { GhostButton(t(L10nKey.skillListenChepChinhTaPhan), { a.open("#/dictation/${p.id}") }); GhostButton("↺ " + t(L10nKey.revTryAgain), a.again) }
            }
            if (p.vocab.isNotEmpty()) LKCard {
                Body("📚 " + t(L10nKey.skillListenTuVungDangHoc), style = LKType.titlePill)
                p.vocab.forEachIndexed { k, (w, vi) -> Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                    Column(Modifier.weight(1f)) { EnLtr { Body(w, style = LKType.titlePill) }; Muted(vi) }
                    GhostButton(if (k in ui.saved) "✓" else "+ " + t(L10nKey.vocabSave), { a.saveVocab(k) }, enabled = k !in ui.saved) } }
            }
        }
    }
    if (ui.confirmSubmit) Confirm(t(L10nKey.skillListenBaiNgheChuaPhat), t(L10nKey.skillListenNopBai), t(L10nKey.actionCancel), { a.confirm(true) }, { a.confirm(false) })
}

// ---------------------------------------------------------------- #/listen-test/<n>
/** Phases of the 40-question mock: intro -> four parts (read time, one listen) -> result. */
data class TestUi(
    val test: Int, val phase: Phase, val part: Part? = null, val partIdx: Int = 0, val parts: Int = 4, val left: Int = ListenTest.READ_SECONDS, val started: Boolean = false, val sounding: Boolean = false, val ended: Boolean = false,
    val blocked: Boolean = false, val nextOpen: Boolean = false, val line: Int = -1, val answers: Map<String, Any?> = emptyMap(), val done: ListenTest.Done? = null, val sheet: List<Triple<Int, Qx.Res, Boolean>> = emptyList(),
    val partIds: List<String> = emptyList(), val confirmNext: Boolean = false,
) { enum class Phase { INTRO, PART, RESULT } }
class TestActions(val start: () -> Unit = {}, val skipRead: () -> Unit = {}, val tap: () -> Unit = {}, val answer: (String, Any?) -> Unit = { _, _ -> }, val next: () -> Unit = {}, val confirm: (Boolean) -> Unit = {}, val open: (String) -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun ListenTestScreen(ui: TestUi, a: TestActions) {
    val c = LocalLKColors.current
    when (ui.phase) {
        TestUi.Phase.INTRO -> StudyPage("IELTS Listening – Test ${ui.test}", a.exit) {
            EmptyState("🎧", "IELTS Listening – Test ${ui.test}", t(L10nKey.skillListen4Phan40Cau).replace(Regex("<[^>]+>"), ""), t(L10nKey.skillListenBatDauThi), a.start, t(L10nKey.actionLater), a.exit)
        }
        TestUi.Phase.PART -> { val p = ui.part!!; val last = ui.partIdx == ui.parts - 1
            StudyPage(Bidi.ltr("Test ${ui.test} · Part ${p.part}/${ui.parts}") + " · " + Bidi.isolate(t(L10nKey.skillListenCauAB, mapOf("a" to p.qFrom, "b" to p.qTo))), a.exit, bottom = {
                LKPrimaryButton((if (last) t(L10nKey.skillListenNopBai) else t(L10nKey.skillListenSangPhanTiep) + " " + forwardArrow()), a.next, enabled = ui.nextOpen)
                if (!ui.nextOpen) Muted(t(L10nKey.skillListenNgheHetPhanNay))
            }) {
                LKProgress(ui.partIdx / ui.parts.toFloat(), track = c.surfaceContainerHighest)
                LKCard {
                    val l = p.script.getOrNull(ui.line)
                    if (!ui.blocked) Body(when { ui.ended -> "✓ " + t(L10nKey.skillListenHetPhanNgheKiem); ui.sounding -> "🔊 " + t(L10nKey.skillListenDangPhatChiNghe); ui.started -> "⏳ " + t(L10nKey.actionLoading); else -> "⏳ " + Bidi.isolate(t(L10nKey.skillListenNGiayDocCau, n(ui.left))) }, style = LKType.titlePill)
                    if (!ui.started) GhostButton(t(L10nKey.skillListenBatDauNgheNgay), a.skipRead)
                    if (ui.blocked) { LKPrimaryButton("▶ " + t(L10nKey.skillListenChamDeNghe), a.tap); Muted(t(L10nKey.skillListenAmThanhChuaPhat)) }
                    if (l != null && !ui.ended) Muted(if (l.say != null) "🎙️ " + t(L10nKey.skillListenLoiDan) else if (l.pause != null) "" else "🗣️ " + p.speakerName(l.s))
                }
                QuestionGroups(p, ui.answers, null, false, a.answer)
            }
            if (ui.confirmNext) Confirm(t(L10nKey.skillListenPhanNgheChuaPhat), t(L10nKey.actionContinue), t(L10nKey.actionCancel), { a.confirm(true) }, { a.confirm(false) }) }
        TestUi.Phase.RESULT -> { val d = ui.done!!
            StudyPage(Bidi.ltr("Band ${d.band.let { if (it == Math.floor(it)) it.toInt().toString() else it.toString() }}"), a.exit) {
                LKCard(fill = c.surfaceContainerHighest) {
                    Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm)) {
                        Text(if (d.band >= 7) "🎉" else "🎧", style = LKType.headlineMd.toCompose())
                        Body(Bidi.ltr("Band ${d.band.let { if (it == Math.floor(it)) it.toInt().toString() else it.toString() }}") + " · " + Bidi.isolate(t(L10nKey.skillListenABCauDung, mapOf("a" to d.raw, "b" to 40))), style = LKType.headlineMd, align = androidx.compose.ui.text.style.TextAlign.Center)
                        Muted(t(L10nKey.skillListenQuyDoiTheoThang))
                    }
                }
                for ((k, id) in ui.partIds.withIndex()) LKCard(onClick = { a.open("#/listen/$id") }) {
                    Body(Bidi.ltr("Part ${k + 1} · ${d.byPart[k]}/10"), style = LKType.titlePill); LKProgress(d.byPart[k] / 10f, track = c.surfaceContainerHighest); Muted(t(L10nKey.skillListenBamDeLuyenLai))
                }
                StatsCard(ui.sheet.map { it.second })
                LKCard {
                    Body("📋 " + t(L10nKey.skillListenBangDapAn), style = LKType.titlePill)
                    for ((q, r, _) in ui.sheet) EnLtr { Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                        Body("$q", Modifier.width(28.dp), style = LKType.labelMetric); Body(if (r.ok) "✓" else "✗", color = if (r.ok) c.success else c.error)
                        Column(Modifier.weight(1f)) { Body(r.answer); if (!r.ok && r.given.isNotEmpty()) Muted(t(L10nKey.skillListenBanA, mapOf("a" to r.given))) } } }
                }
                Flow { LKPrimaryButton(t(L10nKey.skillListenVeLuyenNghe), { a.open("#/listening") }); GhostButton(t(L10nKey.skillListenXemSoLoiSai), { a.open("#/mistakes") }) }
            } }
    }
}

// ---------------------------------------------------------------- #/dictation/<part>
/** The line being copied and its cells (plain words and boxes). */
class DictLine(val line: com.lexkite.app.core.skills.Line, val cells: List<Dictation.Cell>)

/** One line of the dictation: boxes (mid / hard) or a text area (full); [check] != null = checked. */
data class DictUi(
    val part: Part, val mode: String, val k: Int, val total: Int, val line: DictLine, val typed: List<String> = emptyList(), val full: String = "", val check: Dictation.Check? = null,
    val auto: Boolean = false, val fin: Dictation.Fin? = null, val trOpen: Boolean = false, val tr: List<String> = emptyList(), val shown: Int = 0,
)
class DictActions(
    val mode: (String) -> Unit = {}, val say: (Boolean) -> Unit = {}, val prev: () -> Unit = {}, val next: () -> Unit = {}, val typed: (Int, String) -> Unit = { _, _ -> }, val full: (String) -> Unit = {}, val check: () -> Unit = {},
    val answer: () -> Unit = {}, val clear: () -> Unit = {}, val auto: (Boolean) -> Unit = {}, val tr: (Boolean) -> Unit = {}, val open: (String) -> Unit = {}, val exit: () -> Unit = {},
)

@Composable
fun DictationScreen(ui: DictUi, a: DictActions) {
    val c = LocalLKColors.current; val fin = ui.fin
    if (fin != null) return StudyPage(t(L10nKey.skillListenChepChinhTa), a.exit) {
        EmptyState("⌨️", t(L10nKey.skillListenChinhXacP, mapOf("p" to fin.pct)), t(L10nKey.skillListenNCauDaChep, n(fin.count)), t(L10nKey.skillListenLamCauHoiPhan), { a.open(fin.links[0]) })
        GhostButton(t(L10nKey.skillListenThuMucKhoHon), { a.open(fin.links[1]) }, Modifier.fillMaxWidth()); GhostButton(t(L10nKey.skillListenVeLuyenNghe), { a.open(fin.links[2]) }, Modifier.fillMaxWidth())
    }
    val l = ui.line.line; val ck = ui.check
    StudyPage(t(L10nKey.skillListenChepChinhTa) + " · ${ui.k + 1}/${ui.total}", a.exit, bottom = {
        LKPrimaryButton(if (ck == null) t(L10nKey.actionCheck) else t(L10nKey.skillListenCauTiep) + " ↵", a.check)
        Flow { GhostButton(t(L10nKey.lessonAnswer), a.answer); GhostButton(t(L10nKey.modelClearAll), a.clear) }
    }) {
        LKProgress(ui.k / ui.total.toFloat(), track = c.surfaceContainerHighest)
        Flow { for ((m, key) in listOf("mid" to L10nKey.skillListenDienTuTrungBinh, "hard" to L10nKey.skillListenDienTuKho, "full" to L10nKey.skillListenChepCaCau)) Chip(t(key), ui.mode == m, { a.mode(m) }) }
        Muted(ui.part.title + " · " + ui.part.speakerName(l.s))
        // Stitch audio dock: previous · big Listen · labelled slow · next, always one row
        val dPrev = t(L10nKey.skillListenCauTruoc); val dSlow = t(L10nKey.lessonSlowShort); val dNext = t(L10nKey.skillListenCauSau)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
            GhostButton("‹", a.prev, Modifier.semantics { contentDescription = dPrev }.widthIn(min = 48.dp))
            LKPrimaryButton("🔊 " + t(L10nKey.lessonKindListen), { a.say(false) }, Modifier.weight(1f))
            GhostButton("🐢 0.75x", { a.say(true) }, Modifier.semantics { contentDescription = dSlow })
            GhostButton("›", a.next, Modifier.semantics { contentDescription = dNext }.widthIn(min = 48.dp))
        }
        LKCard(fill = c.surfaceContainerHighest) {
            if (ui.mode == "full") {
                StudyField(ui.full, a.full, t(L10nKey.skillListenGoLaiCaCau), singleLine = false, minHeight = 96.dp, enabled = ck == null)
                ck?.diff?.let { d ->
                    Body(t(L10nKey.skillListenPChinhXac, mapOf("p" to d.rounded)), style = LKType.titlePill, color = if (d.ok) c.success else c.error)
                    EnLtr { Flow { for ((cls, w) in d.items) Text(when (cls) { "ok" -> "✓ "; "miss" -> "− "; else -> "+ " } + w, Modifier.clip(PillShape).background(c.card).padding(horizontal = 8.dp, vertical = 2.dp), style = LKType.bodyMd.toCompose(), color = when (cls) { "ok" -> c.success; "miss" -> c.error; else -> c.tertiary }) } }
                    Flow { Tag("✓ " + t(L10nKey.skillListenDung), c.success); Tag("− " + t(L10nKey.skillListenBoSot), c.error); Tag("+ " + t(L10nKey.skillListenThuaSai), c.tertiary) }
                }
            } else {
                var hole = 0
                EnLtr { Flow { for (cell in ui.line.cells) if (!cell.hole) Body(cell.word) else { val j = hole++
                    if (ck == null) Row(verticalAlignment = Alignment.CenterVertically) { if (cell.pre.isNotEmpty()) Body(cell.pre); StudyField(ui.typed.getOrElse(j) { "" }, { v -> a.typed(j, v) }, "", Modifier.width((cell.size * 11 + 40).dp)); if (cell.post.isNotEmpty()) Body(cell.post) }
                    else { val ok = ck.cells[j].first; Body((if (ok) "✓ " else "✗ ") + cell.word, color = if (ok) c.success else c.error) } } } }
                if (ck != null) { Body(t(L10nKey.skillListenABODung, mapOf("a" to ck.right, "b" to ck.of)), style = LKType.titlePill, color = if (ck.ok) c.success else c.error); EnLtr { Muted(l.t.orEmpty()) } }
            }
        }
        SwitchRow(t(L10nKey.skillListenTuDongPhatLai), ui.auto) { a.auto(it) }
        LKCard {
            Flow { Chip(if (ui.trOpen) "▾" else "▸", ui.trOpen, { a.tr(!ui.trOpen) }); Body("📜 " + t(L10nKey.skillListenTranscriptBanDich), style = LKType.titlePill) }
            if (ui.trOpen) { val lines = Dictation.lines(ui.part); for ((n, x) in lines.withIndex()) EnLtr { Muted(ui.part.speakerName(x.s) + " · " + if (n <= ui.k) x.t.orEmpty() else t(L10nKey.skillListenChepXongCauNay)) }; for (v in ui.tr) Muted(v) }
        }
    }
}

// ---------------------------------------------------------------- #/reading
class ReadingUi(val model: Reader.ListModel)
class ReadingActions(val level: (String) -> Unit = {}, val open: (String) -> Unit = {}, val exit: () -> Unit = {})

@Composable
fun ReadingListScreen(ui: ReadingUi, a: ReadingActions) {
    val c = LocalLKColors.current; val m = ui.model
    StudyPage(t(L10nKey.skillReadBaiDocIelts), a.exit) {
        Muted(t(L10nKey.skillReadDocBaiTheoPhong))
        if (m.tabs.isNotEmpty()) Flow { for (tab in m.tabs) Chip((if (tab.lv == "all") t(L10nKey.vocabAll) else tab.lv) + " ${tab.n}", tab.selected, { a.level(tab.lv) }) }
        if (m.cards.isEmpty()) EmptyState("📖", t(L10nKey.skillListenDangCapNhatDe))
        for (k in m.cards) LKCard(onClick = { a.open("#/read/${k.r.id}") }, fill = c.surfaceContainerHighest) {
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) { Text(k.r.emoji, style = LKType.headlineMd.toCompose()); Tag(k.r.level) }
            Body(k.r.title, style = LKType.titlePill); Muted(k.shown)
            Flow { Tag(t(L10nKey.todayMinutes, n(k.r.minutes))); Tag(t(L10nKey.skillReadNCauHoi, n(k.r.questions.size))); k.done?.let { Tag("✓ $it", c.success) } }
        }
    }
}

// ---------------------------------------------------------------- #/read/<id>
data class ReaderUi(
    val r: com.lexkite.app.core.skills.Reading, val summary: String, val passage: Reader.Passage, val on: Set<String> = Reader.HL.toSet(), val active: String? = null, val popup: PopupUi? = null, val picks: Map<Int, String> = emptyMap(),
    val graded: Reader.Graded? = null, val reading: Int = -1, val saved: Boolean = false, val confirm: Boolean = false, val playing: Boolean = false,
)
class ReaderActions(
    val toggle: (String) -> Unit = {}, val word: (String, String) -> Unit = { _, _ -> }, val keyword: (String) -> Unit = {}, val saveAll: () -> Unit = {}, val readAloud: () -> Unit = {}, val pick: (Int, String) -> Unit = { _, _ -> },
    val grade: () -> Unit = {}, val confirm: (Boolean) -> Unit = {}, val closePopup: () -> Unit = {}, val savePopup: () -> Unit = {}, val speakWord: () -> Unit = {}, val details: () -> Unit = {}, val open: (String) -> Unit = {}, val exit: () -> Unit = {},
)

@Composable
fun ReaderScreen(ui: ReaderUi, a: ReaderActions) {
    val c = LocalLKColors.current; val r = ui.r; val g = ui.graded
    StudyPage(t(L10nKey.skillReadTatCaBaiDoc), a.exit, bottom = { ui.popup?.let { PopupCard(it, a.closePopup, a.savePopup, a.speakWord, a.details) } }) {
        Flow { Tag(r.level); Tag("${r.emoji} ${r.topic}"); GhostButton("🔊 " + t(if (ui.playing) L10nKey.skillReadDungDoc else L10nKey.skillReadNgheCaBai), a.readAloud) }
        Body(r.title, style = LKType.headlineMd); Muted(ui.summary)
        Muted(t(L10nKey.skillReadToSang))
        Flow { for ((k, key) in listOf("kw" to L10nKey.skillReadTuKhoa, "awl" to L10nKey.skillReadHocThuatAwl, "link" to L10nKey.skillReadTuNoiCum, "mine" to L10nKey.skillReadTuCuaToi)) Chip(t(key) + " ${ui.passage.counts[k]}", k in ui.on, { a.toggle(k) }) }
        LKCard(fill = c.surfaceContainerHighest) {
            for ((pi, para) in ui.passage.paras.withIndex()) EnLtr {
                TokenText(para.mapIndexed { si, s -> TokSent(s, ui.passage.sentenceText(s).replace(Regex("\\s+"), " ").trim(), hot = ui.passage.paras.take(pi).sumOf { it.size } + si == ui.reading) },
                    LKType.bodyLg.toCompose().copy(color = c.onSurface),
                    { tk -> val cls = tk.cls.split(' ').filter { it in ui.on }
                        androidx.compose.ui.text.SpanStyle(color = if ("awl" in cls) c.secondary else c.onSurface,
                            background = when { ui.active == tk.w -> c.secondaryContainer; "kw" in cls -> c.tertiaryContainer.copy(alpha = 0.55f); cls.isNotEmpty() && "mine" !in cls -> c.tertiaryContainer.copy(alpha = 0.25f); "mine" in cls -> c.surfaceContainerHighest; else -> androidx.compose.ui.graphics.Color.Unspecified },
                            textDecoration = if ("link" in cls || "col" in cls) androidx.compose.ui.text.style.TextDecoration.Underline else null) },
                    c.secondaryContainer, { tk, snt -> a.word(tk.w, snt) }) }
            Muted(t(L10nKey.skillReadChamVaoTuDe))
        }
        LKCard {
            Body("🔑 " + t(L10nKey.skillReadTuKhoa), style = LKType.titlePill)
            Flow { for (k in r.keywords) Chip(k, false, { a.keyword(k) }) }
            GhostButton(if (ui.saved) "✓ " + t(L10nKey.revSaved) else "+ " + t(L10nKey.skillReadLuuTatCaTu), a.saveAll, enabled = !ui.saved)
        }
        Body(t(L10nKey.skillReadCauHoi), style = LKType.headlineSm); Muted(t(L10nKey.skillReadNCauTrueFalse, n(r.questions.size)))
        r.questions.forEachIndexed { i, q -> LKCard {
            Body("${i + 1}. ${q.q}", style = LKType.titlePill)
            val item = g?.items?.getOrNull(i)
            q.picks.forEachIndexed { k, v -> val on = ui.picks[i] == v
                Opt(if (q.isTfng) "${k + 1}" else "ABCD"[k].toString(), q.optionText(v), on, if (item != null && (on || v == item.right)) v == item.right else null, if (g == null) ({ a.pick(i, v) }) else null) }
            if (item != null) Muted((if (item.wrong) "❌ " else "✓ ") + q.explain)
        } }
        if (g == null) LKPrimaryButton(t(L10nKey.skillReadChamDiem), a.grade) else LKCard(fill = if (g.ok) c.surfaceContainerHighest else c.errorContainer) {
            Body(Bidi.isolate(t(L10nKey.skillReadKetQuaScoreN, mapOf("score" to g.score, "n" to g.n, "pct" to g.pct)) + " · +${g.xp} XP"), style = LKType.headlineSm)
            Flow { GhostButton(t(L10nKey.skillReadBaiDocKhac), { a.open("#/reading") }); GhostButton("🧠 " + t(L10nKey.skillReadHocCacTuVua), { a.open("#/practice/learn?src=deck") }) }
        }
    }
    if (ui.confirm) Confirm(t(L10nKey.skillReadBanChuaTraLoi), t(L10nKey.skillReadChamDiem), t(L10nKey.actionCancel), { a.confirm(true) }, { a.confirm(false) })
}
