package com.lexkite.app.feature.vocab

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.skills.Qx
import com.lexkite.app.core.vocab.Tx
import com.lexkite.app.core.vocab.ga
import com.lexkite.app.core.vocab.gs
import com.lexkite.app.core.vocab.strs
import com.lexkite.app.core.write.Essay
import com.lexkite.app.core.write.WritePack
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LKPillButton
import com.lexkite.app.design.LKPrimaryButton
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive

/** Question-type tips (qtips.js TIP) by question kind – shared by the question screens (:feature-skills) and #/qstats. */
val QUESTION_TIPS: Map<String, L10nKey> = mapOf("tfng" to L10nKey.skillQtTrueBaiNoiDung, "ynng" to L10nKey.skillQtCauHoiVeQuan, "mcq" to L10nKey.skillQtGachChanTuKhoa, "multi" to L10nKey.skillQtChonDu2Dap, "headings" to L10nKey.skillQtDocDanhSachTieu,
    "info" to L10nKey.skillQtDapAnKhongTheo, "features" to L10nKey.skillQtTimVaDanhDau, "endings" to L10nKey.skillQtDocPhanDauCau, "map" to L10nKey.skillQtTruocKhiNgheXac, "lmatch" to L10nKey.skillQtDocDanhSachLua,
    "notes" to L10nKey.skillQtDungThoiGianTruoc, "rnotes" to L10nKey.skillQtTieuDeGhiChu, "summary" to L10nKey.skillQtDocLuotCaDoan, "sentence" to L10nKey.skillQtDocCaCauVa)

private fun JsonObject?.sub(k: String): JsonObject? = this?.get(k) as? JsonObject

// ---------------------------------------------------------------- #/qstats
/** `#/qstats`: progress per skill and question type, read from `game.qstat`. */
@Composable
fun QStatsRoute(env: WordEnv, onExit: () -> Unit, open: (String) -> Unit) {
    val state by produceState<Pair<WritePack?, List<Essay.QCard>>?>(null, env) {
        val pack = env.writePack()
        value = pack to (if (pack == null) emptyList() else Essay.qstatCards(env.game(), pack.skills.map { it[0] }))
    }
    QStatsLayout(state?.first, state?.second ?: emptyList(), state != null, open, onExit)
}

@Composable
fun QStatsLayout(pack: WritePack?, cards: List<Essay.QCard>, loaded: Boolean, open: (String) -> Unit, onExit: () -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    VScreen(t(L10nKey.skillQtTienBoTheoKy), onExit) {
        RichBody(t(L10nKey.skillQtTongHopTuCac), color = c.onSurfaceVariant, style = LKType.bodyMd)
        if (loaded && cards.isEmpty()) VNotice(t(L10nKey.skillQtChuaCoDuLieu))
        fun secs(s: Int) = if (s >= 60) t.s(L10nKey.skillQtMPhutSGiay, "m" to s / 60, "s" to s % 60) else t.s(L10nKey.skillQtSGiay, "s" to s)
        cards.forEach { card ->
            val info = pack?.skill(card.skill)
            LKCard {
                Ltr { VTitle((info?.getOrNull(0) ?: "") + " " + (info?.getOrNull(1) ?: card.skill)) }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceMd)) {
                    Column { Ltr { VTitle("${card.pct}%") }; VMuted(t(L10nKey.skillQtTiLeDung)) }
                    Column { Ltr { VTitle(card.total.toString()) }; VMuted(t(L10nKey.skillQtCauDaLam)) }
                    card.secsEach?.let { s -> Column { Ltr { VTitle(secs(s)) }; VMuted(t(L10nKey.skillQtMoiCauUocTinh)) } }
                }
                card.rows.forEach { r ->
                    val col = when (r.tone) { Essay.Tone.GOOD -> c.success; Essay.Tone.AGAIN -> c.error; else -> c.secondary }
                    val route = Essay.practiceRoute(card.skill, r.kind, pack?.skillTable ?: emptyMap(), pack?.rtype ?: emptyMap(), Qx.kindName(r.kind) != r.kind)
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                            VChip(Qx.kindName(r.kind), { open(route.removePrefix("#/")) }, modifier = Modifier.weight(1f, fill = false))
                            VMuted("· " + t.s(L10nKey.skillQtNCau, "n" to r.total))
                            Box(Modifier.weight(1f))
                            Ltr { VText("${r.pct}%", LKType.titlePill, c.onSurface) }
                            VMuted(r.secsEach?.let { secs(it) } ?: "–")
                        }
                        Box(Modifier.fillMaxWidth().height(6.dp).background(c.outlineVariant, CircleShape)) { Box(Modifier.fillMaxWidth(minOf(100, r.pct) / 100f).height(6.dp).background(col, CircleShape)) }
                    }
                }
                card.weak?.let { w ->
                    VText(t(L10nKey.skillQtNenLuyenTiep) + " " + Qx.kindName(w), LKType.bodySm, c.tertiary)
                    QUESTION_TIPS[w]?.let { VMuted(t(it)) }
                }
            }
        }
        VFlow {
            VChip(t(L10nKey.skillQtLuyenReadingTheoDang), { open("rtype") }); VChip("IELTS Listening", { open("listening") }); VChip("TOEIC", { open("toeic") }); VChip("TOEFL iBT", { open("toefl") })
        }
    }
}

// ---------------------------------------------------------------- #/criteria
/** `#/criteria[/<skill>][?skill=]`: the four IELTS Writing / Speaking criteria, three model answers with critique, the jump-a-band roadmap. */
@Composable
fun CriteriaRoute(env: WordEnv, arg: String, query: String, onExit: () -> Unit, open: (String) -> Unit) {
    var reload by remember { mutableIntStateOf(0) }
    val state by produceState<Pair<Boolean, WritePack?>>(false to null, env, reload) { value = true to env.writePack() }
    val sk = arg.ifEmpty { parseQuery(query)["skill"] ?: "" }
    CriteriaLayout(state.second, state.first, env.tx, if (sk == "speaking" || sk == "speak") "speaking" else "writing", { env.speak(it) }, { reload++ }, open, onExit)
}

@Composable
fun CriteriaLayout(pack: WritePack?, loaded: Boolean, tx: Tx, skill0: String, speak: (String) -> Unit, retry: () -> Unit, open: (String) -> Unit, onExit: () -> Unit, band0: String = "all", model0: String = "6.5") {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    var skill by remember { mutableStateOf(skill0) }
    var bandFilter by remember { mutableStateOf(band0) }
    var modelBand by remember { mutableStateOf(model0) }
    val clip = LocalClipboardManager.current
    VScreen(t(L10nKey.writeCriteriaTieuChiChamIelts), onExit) {
        if (pack == null) { VNotice(if (loaded) t(L10nKey.syncOffline) else t(L10nKey.actionLoading), retry); return@VScreen }
        val d = pack.criteria.sub(skill) ?: return@VScreen
        val isW = skill == "writing"; fun tr(k: String) = tx.t(k, null)
        fun bandColor(b: Double): Color = if (b >= 8) c.secondary else if (b >= 6.5) c.success else c.tertiary
        fun critColor(id: String): Color = when (id) { "tr", "fc" -> c.secondary; "lr" -> c.tertiary; "gra" -> c.success; else -> c.primary }
        VMuted(t(L10nKey.writeCriteriaNamVung4Tieu)); VMuted(t(L10nKey.writeCriteriaDienGiaiTuBang))
        VFlow { VChip(t(L10nKey.revWritingRoom), { open("write") }); VChip(t(L10nKey.revSpeakingRoom), { open("speaking") }) }
        VFlow {
            VChip(t(L10nKey.writeCriteriaIeltsWriting), { skill = "writing"; modelBand = "6.5" }, selected = isW)
            VChip(t(L10nKey.writeCriteriaIeltsSpeaking), { skill = "speaking"; modelBand = "6.5" }, selected = !isW)
        }
        VText(t(L10nKey.writeCriteriaLocBand), LKType.labelMetric, c.onSurfaceVariant)
        VFlow { listOf("all", "4", "5", "6", "7", "8", "9").forEach { b -> VChip(if (b == "all") t(L10nKey.vocabAll) else b, { bandFilter = b }, selected = bandFilter == b) } }
        VText(if (isW) t(L10nKey.writeCriteria4TieuChiIelts) else t(L10nKey.writeCriteria4TieuChiIelts2), LKType.headlineMd, c.onSurface)
        VMuted(tr(d.gs("desc")))
        d.ga("criteria").forEach { ce ->
            val cr = ce as JsonObject; val col = critColor(cr.gs("id"))
            LKCard {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { VText(cr.gs("icon"), LKType.headlineSm, c.onSurface); Box(Modifier.weight(1f)); VBadge(cr.gs("short") + " · " + cr.gs("weight"), c.surfaceContainerHighest, col) }
                Ltr { VTitle(cr.gs("name")) }
                VMuted(tr(cr.gs("desc")))
                (cr["bands"] as? JsonObject)?.entries?.sortedBy { it.key.toIntOrNull() ?: 0 }?.filter { bandFilter == "all" || bandFilter == it.key }?.forEach { (b, item) ->
                    val it = item as JsonObject; val bc = bandColor(b.toDouble())
                    Column(Modifier.fillMaxWidth().background(c.cardHigh, androidx.compose.foundation.shape.RoundedCornerShape(12.dp)).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        VText("Band $b", LKType.titlePill, bc); VText(tr(it.gs("summary")), LKType.labelMetric, c.onSurfaceVariant); VText(tr(it.gs("details")), LKType.bodySm, c.onSurface)
                        VText("⚠️ " + t(L10nKey.writeCriteriaBayCanTranh) + " " + tr(it.gs("pitfall")), LKType.bodySm, c.error)
                    }
                }
            }
        }
        val prompt = d.sub("prompt"); val m = d.sub("models").sub(modelBand) ?: d.sub("models").sub("6.5")
        LKCard {
            VBadge(t(L10nKey.writeCriteriaDeMauBaiMau), c.secondaryContainer, c.onSecondaryContainer)
            Ltr { VTitle(prompt.gs("topic")) }; VMuted(tr(prompt.gs("type")))
            VFlow { listOf("5.0", "6.5", "8.0").forEach { b -> VChip("Band $b", { modelBand = b }, selected = modelBand == b) } }
            Ltr { VText("📌 " + prompt.gs("text"), LKType.bodyMd, c.onSurface) }
            val body = m.gs(if (isW) "essay" else "transcript")
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                VText(if (isW) t(L10nKey.writeCriteriaNoiDungBaiViet) else t(L10nKey.writeCriteriaBanGhiAmLoi), LKType.titlePill, c.onSurface)
                VMuted("(" + t.s(L10nKey.vocabWords, "n" to body.trim().split(Regex("\\s+")).count { it.isNotEmpty() }) + ")")
                Box(Modifier.weight(1f)); VBadge(m.gs("band"))
            }
            Ltr { VText(body, LKType.bodyMd, c.onSurface) }
            VFlow { VChip(t(L10nKey.writeCriteriaSaoChep), { clip.setText(AnnotatedString(body)) }); if (!isW) VChip(t(L10nKey.vocabPronounce), { speak(body) }) }
            VText(t(L10nKey.writeCriteriaPhanTichDiemSo), LKType.titlePill, c.onSurface)
            (pack.scoreKeys[skill] ?: emptyList()).forEach { k ->
                val score = ((m.sub("scores")?.get(k) as? JsonPrimitive)?.content?.toDoubleOrNull()) ?: 0.0; val bc = bandColor(score)
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                    Ltr { VText(k.uppercase(), LKType.labelMetric, c.onSurface, Modifier.width(70.dp)) }
                    Box(Modifier.weight(1f).height(10.dp).background(c.outlineVariant, CircleShape)) { Box(Modifier.fillMaxWidth((score / 9).toFloat().coerceIn(0f, 1f)).height(10.dp).background(bc, CircleShape)) }
                    Ltr { VText(Essay.bandText(score), LKType.labelMetric, bc, Modifier.width(36.dp)) }
                }
            }
            m.ga("critique").forEach { ce -> val x = ce as JsonObject
                Column(Modifier.fillMaxWidth().background(c.cardHigh, androidx.compose.foundation.shape.RoundedCornerShape(12.dp)).padding(LKSpacing.spaceSm), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    VText(tr(x.gs("title")), LKType.titlePill, c.secondary); VText(tr(x.gs("text")), LKType.bodySm, c.onSurface)
                }
            }
        }
        LKCard {
            VTitle(t(L10nKey.writeCriteriaLoTrinhButPha))
            d.ga("jumpTips").forEach { je -> val j = je as JsonObject
                Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { VBadge("Band ${j.gs("from")} ➔ Band ${j.gs("to")}"); Box(Modifier.weight(1f)); VMuted(t(L10nKey.writeCriteriaBuocNhayVot)) }
                    VText(tr(j.gs("title")), LKType.titlePill, c.onSurface)
                    j.strs("steps").forEach { VText("• " + tr(it), LKType.bodySm, c.onSurface) }
                }
            }
        }
        LKCard {
            VTitle(t(L10nKey.writeCriteriaSanSangApDung)); VMuted(t(L10nKey.writeCriteriaApDungNgayLuyen))
            LKPrimaryButton(t(L10nKey.writeCriteriaThucHanhVietTask), { open("write") })
            LKPillButton(t(L10nKey.writeCriteriaLuyenNoiSpeakingNgay), { open("speaking") })
            LKPillButton(t(L10nKey.writeCriteriaLuyenTask1Bieu), { open("task1") })
        }
    }
}
