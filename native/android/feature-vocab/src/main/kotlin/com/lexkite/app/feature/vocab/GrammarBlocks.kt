package com.lexkite.app.feature.vocab

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.write.DrillOutcome
import com.lexkite.app.core.write.GrammarCore
import com.lexkite.app.core.write.lArr
import com.lexkite.app.core.write.lInt
import com.lexkite.app.core.write.lList
import com.lexkite.app.core.write.lNum
import com.lexkite.app.core.write.lStr
import com.lexkite.app.core.write.lStrs
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.toCompose
import com.lexkite.app.i18n.generated.L10nKey
import kotlinx.serialization.json.JsonObject

/** The lesson blocks of #/grammar (web grammar.js `R`): timeline · formula · uses · signals · table · tip · mistake · ielts · diagram · scale · sort. */
internal fun partTone(c: String, k: com.lexkite.app.design.LKColors): Color = when (c) { "subj" -> k.primary; "verb" -> k.success; "aux" -> k.tertiary; "obj" -> k.secondary; "neg" -> k.error; else -> k.onSurfaceVariant }

/** "…[[target]]…" -> bold + marker on the target structure */
@Composable
private fun hl(s: String, prefix: String = ""): androidx.compose.ui.text.AnnotatedString {
    val mark = LocalLKColors.current.secondary.copy(alpha = 0.18f)
    return buildAnnotatedString {
        append(prefix)
        var rest = s
        while (true) {
            val a = rest.indexOf("[["); val b = if (a >= 0) rest.indexOf("]]", a + 2) else -1
            if (a < 0 || b < 0) break
            append(rest.substring(0, a))
            withStyle(SpanStyle(fontWeight = FontWeight.Bold, background = mark)) { append(rest.substring(a + 2, b)) }
            rest = rest.substring(b + 2)
        }
        append(rest)
    }
}

@Composable
private fun SayLine(s: String, plain: String, speak: (String) -> Unit, prefix: String = "") {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
        Ltr { androidx.compose.material3.Text(hl(s, prefix), style = LKType.bodyMd.toCompose(), color = c.onSurface, modifier = Modifier.weight(1f)) }
        VSpeak(t(L10nKey.vocabPronounce)) { speak(plain) }
    }
}

@Composable
fun GrammarBlock(b: JsonObject, speak: (String) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    when (b.lStr("type")) {
        "timeline" -> LKCard { GTimeline(b); if (b.lStr("caption").isNotEmpty()) VMuted(b.lStr("caption")) }
        "formula" -> LKCard {
            VTitle("🧮 " + t.lv("Công thức"))
            b.lList("rows").forEach { r ->
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    VText(r.lStr("label"), LKType.titlePill)
                    VFlow { r.lList("parts").forEachIndexed { k, p -> if (k > 0) VMuted("+"); LPill(p.lStr("t"), partTone(p.lStr("c"), c)) } }
                    if (r.lStr("ex").isNotEmpty()) SayLine(r.lStr("ex"), GrammarCore.plain(r.lStr("ex")), speak, "➜ ")
                }
            }
            VFlow { LPill(t.lv("Chủ ngữ"), partTone("subj", c)); LPill(t.lv("Trợ động từ"), partTone("aux", c)); LPill(t.lv("Động từ"), partTone("verb", c)); LPill(t.lv("Phủ định"), partTone("neg", c)); LPill(t.lv("Tân ngữ"), partTone("obj", c)); LPill(t.lv("Thời gian"), partTone("time", c)) }
        }
        "uses" -> LKCard {
            VTitle("🎯 " + t.lv("Khi nào dùng?"))
            b.lList("items").forEachIndexed { i, u ->
                Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.Top) {
                    VBadge((i + 1).toString(), c.secondary, c.onSecondary)
                    Column(Modifier.weight(1f)) { VText(u.lStr("title"), LKType.titlePill); SayLine(u.lStr("ex"), GrammarCore.plain(u.lStr("ex")), speak); VMuted(u.lStr("vi")) }
                }
            }
        }
        "signals" -> LKCard { VTitle("🚦 " + t.lv("Dấu hiệu nhận biết")); VFlow { b.lStrs("words").forEach { VBadge(it) } } }
        "table" -> LKCard {
            val head = b.lStrs("head"); val rows = b.lArr("rows").map { it.lStrs() }
            Column(Modifier.horizontalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { head.forEach { VMuted(it, Modifier.width(150.dp)) } }
                rows.forEach { r -> Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { r.forEach { VText(it, LKType.bodySm, modifier = Modifier.width(150.dp)) } } }
            }
        }
        "tip" -> LKCard { LNote("💡 " + b.lStr("text")) }
        "mistake" -> LKCard {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { VText("✗", LKType.titlePill, c.error); Ltr { androidx.compose.material3.Text(b.lStr("wrong"), style = LKType.bodyMd.toCompose().copy(textDecoration = TextDecoration.LineThrough), color = c.error) } }
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { VText("✓", LKType.titlePill, c.success); Column(Modifier.weight(1f)) { SayLine("[[" + b.lStr("right") + "]]", b.lStr("right"), speak) } }
            VMuted(b.lStr("why"))
        }
        "ielts" -> LKCard { VText("🎓 " + t.lv("Trong IELTS:"), LKType.titlePill); VText(b.lStr("text"), LKType.bodyMd); if (b.lStr("ex").isNotEmpty()) SayLine(b.lStr("ex"), GrammarCore.plain(b.lStr("ex")), speak, "“") }
        "diagram" -> LKCard {
            VFlow { b.lList("steps").forEachIndexed { k, s -> if (k > 0) VMuted("→"); LPill(s.lStr("t"), when (s.lStr("c")) { "active" -> c.primary; "passive", "result" -> c.success; "if" -> c.tertiary; else -> c.onSurfaceVariant }) } }
            if (b.lStr("caption").isNotEmpty()) VMuted(b.lStr("caption"))
        }
        "scale" -> LKCard {
            b.lList("items").sortedByDescending { it.lInt("v") }.forEach { i ->
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Ltr { VText(i.lStr("t"), LKType.labelMetric, modifier = Modifier.width(96.dp)) }
                    Column(Modifier.weight(1f)) { LBar(i.lInt("v") / 100f, tint = if (i.lInt("v") >= 66) c.success else if (i.lInt("v") >= 33) c.tertiary else c.error) }
                    VMuted("${i.lInt("v")}%", Modifier.width(40.dp))
                }
            }
            if (b.lStr("caption").isNotEmpty()) VMuted(b.lStr("caption"))
        }
        "sort" -> LKCard {
            b.lList("groups").forEach { g -> VText((if (g.lStr("emoji").isEmpty()) "" else g.lStr("emoji") + " ") + g.lStr("title"), LKType.titlePill); VFlow { g.lStrs("items").forEach { VBadge(it) } } }
            if (b.lStr("caption").isNotEmpty()) VMuted(b.lStr("caption"))
        }
    }
}

/** the SVG timeline of the web drawn on a Canvas (720 x 110 units); the labels are listed under it */
@Composable
private fun GTimeline(b: JsonObject) {
    val c = LocalLKColors.current; val t = LocalL10n.current.western()
    val marks = b.lList("marks")
    Canvas(Modifier.fillMaxWidth().aspectRatio(720f / 110f).semantics { contentDescription = b.lStr("caption").ifEmpty { t.lv("Dòng thời gian") } }) {
        val k = size.width / 720f
        fun x(v: Double) = ((40 + v * 6.4) * k).toFloat()
        drawLine(c.outlineVariant, Offset(30f * k, 60f * k), Offset(700f * k, 60f * k), 4f * k, StrokeCap.Round)
        for (m in marks) when (m.lStr("kind")) {
            "now" -> drawLine(c.error, Offset(x(50.0), 22f * k), Offset(x(50.0), 98f * k), 2f * k, pathEffect = PathEffect.dashPathEffect(floatArrayOf(4f * k, 3f * k)))
            "point" -> drawCircle(c.secondary, 9f * k, Offset(x(m["at"].lNum() ?: 0.0), 60f * k))
            "range" -> { val a = x(m["from"].lNum() ?: 0.0); val e = x(m["to"].lNum() ?: 0.0); drawRoundRect(c.secondary.copy(alpha = 0.75f), Offset(a, 50f * k), Size(e - a, 20f * k), CornerRadius(10f * k)) }
            "arrow" -> {
                val a = x(m["from"].lNum() ?: 0.0); val e = x(m["to"].lNum() ?: 0.0)
                drawLine(c.primary, Offset(a, 60f * k), Offset(e - 8f * k, 60f * k), 5f * k, StrokeCap.Round)
                val h = Path(); h.moveTo(e, 60f * k); h.lineTo(e - 12f * k, 52f * k); h.lineTo(e - 12f * k, 68f * k); h.close(); drawPath(h, c.primary)
            }
            "repeat" -> { val f = m["from"].lNum() ?: 0.0; val e = m["to"].lNum() ?: 0.0; for (i in 0 until 6) drawCircle(c.tertiary, 6f * k, Offset(x(f + (e - f) * i / 5), 60f * k)) }
        }
    }
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { VMuted(t.lv("QUÁ KHỨ")); VMuted(t.lv("TƯƠNG LAI")) }
    val labels = marks.mapNotNull { it.lStr("label").takeIf { l -> l.isNotEmpty() } }
    if (labels.isNotEmpty()) Ltr { VMuted(labels.joinToString("  ·  ")) }
}

/** the state of one drill (verb / form / fill / rewrite / combine / error / own) */
class DrillState(val input: String = "", val picked: Int? = null, val outcome: DrillOutcome? = null, val note: Boolean = false)

@Composable
fun DrillCard(d: JsonObject, st: DrillState, setInput: (String) -> Unit, check: (Int?) -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    val locked = st.outcome != null
    val kind = when (d.lStr("t")) { "verb" -> "🔤 " + t.lv("Chia động từ"); "form" -> "🧬 " + t.lv("Dạng đúng của từ"); "rewrite" -> "🔁 " + t.lv("Viết lại câu"); "combine" -> "🔗 " + t.lv("Nối câu"); "error" -> "🕵️ " + t.lv("Tìm lỗi sai"); "own" -> "💬 " + t.lv("Tự đặt câu"); else -> "✏️ " + t.lv("Điền từ") }
    Column(verticalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp)) {
        VBadge(kind)
        if (d.lStr("t") == "error") {
            VMuted(t.lv("Bấm vào phần sai."))
            VFlow { d.lStrs("parts").forEachIndexed { j, p -> VChip(p + " " + ('A' + minOf(j, 25)), { if (!locked) check(j) }, selected = locked && (j == d.lInt("w") || j == st.picked)) } }
        } else {
            val long = d.lStr("t") in listOf("rewrite", "combine", "own")
            Ltr { VText(d.lStr("q") + (if (d.lStr("hint").isEmpty() || d.lStr("t") == "own") "" else " (" + d.lStr("hint") + ")"), LKType.bodyMd) }
            if (d.lStr("t") == "own" && d.lStr("hint").isNotEmpty()) Ltr { VMuted(t.lv("Gợi ý") + ": " + d.lStr("hint")) }
            VField(st.input, { if (!locked) setInput(it) }, if (long) t.lv("Viết câu của bạn…") else t.lv("Điền từ"), singleLine = !long, lines = if (long) 3 else 1, onGo = { check(null) })
            if (!locked) LAction(t.lv("Kiểm tra"), { check(null) })
            if (st.note) LNote(t.lv("Hãy viết một câu hoàn chỉnh (ít nhất 4 từ)."))
        }
        (st.outcome as? DrillOutcome.Graded)?.let { o ->
            if (o.ok) LNote("✓ " + (if (o.typo != null) t.lv("Đúng rồi – chỉ sai chính tả nhỏ") + " – " + t.lv("Viết đúng là: {a}", "a" to o.typo!!.joinToString(" ") { it.w }) else t.lv("Chính xác!")), c.success)
            else LNote("✗ " + t.lv("Đáp án: <b>{a}</b>", "a" to o.answer).noTags(), c.error)
            if (d.lStr("ex").isNotEmpty()) VMuted(d.lStr("ex"))
        }
    }
}
