package com.lexkite.app.feature.vocab

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import com.lexkite.app.core.write.Essay
import com.lexkite.app.core.write.FixEngine
import com.lexkite.app.core.write.FixIssue
import com.lexkite.app.core.write.lStr
import com.lexkite.app.design.LKCard
import com.lexkite.app.design.LocalL10n
import com.lexkite.app.design.LocalLKColors
import com.lexkite.app.design.generated.LKSpacing
import com.lexkite.app.design.generated.LKType
import com.lexkite.app.design.tactile
import com.lexkite.app.design.toCompose
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.serialization.json.JsonPrimitive

/** Session state of #/fix kept while the app runs (web sessionStorage): ignored issues and the type filter. */
private object FixSession { val ignored = HashSet<String>(); val off = HashSet<String>() }

/** What the page shows – hoisted so the layout is a pure function of it (snapshots, previews). */
class FixUi(val engine: FixEngine, val text: String, val issues: List<FixIssue>, val off: Set<String>, val sel: Int?, val canUndo: Boolean, val notice: String, val stale: Boolean = false)
class FixActions(
    val text: (String) -> Unit = {}, val toggle: (String) -> Unit = {}, val pick: (Int?) -> Unit = {}, val step: (Int) -> Unit = {}, val apply: (FixIssue, String) -> Unit = { _, _ -> },
    val all: () -> Unit = {}, val ignore: () -> Unit = {}, val undo: () -> Unit = {}, val sample: () -> Unit = {}, val clear: () -> Unit = {}, val copy: () -> Unit = {}, val open: (String) -> Unit = {},
)

/** #/fix – "Sửa ngữ pháp": the draft lives on this device (web Store `fixDraft`), the rules run offline (`FixEngine` = web `LK_WRITE.check`). */
@Composable
fun FixRoute(env: WordEnv, onExit: () -> Unit, open: (String) -> Unit) {
    val engine = remember { env.learn().fix } ?: run { VScreen(LocalL10n.current.lv("Sửa ngữ pháp"), onExit) { VNotice(LocalL10n.current.lv("Không tải được bộ soát lỗi – thử tải lại trang.")) }; return }
    val clip = LocalClipboardManager.current
    var text by remember { mutableStateOf("") }
    var checked by remember { mutableStateOf("") }
    var loaded by remember { mutableStateOf(false) }
    var ver by remember { mutableStateOf(0) }
    var sel by remember { mutableStateOf<Int?>(null) }
    var notice by remember { mutableStateOf("") }
    var off by remember { mutableStateOf<Set<String>>(FixSession.off.toSet()) }
    val undo = remember { mutableStateListOf<String>() }
    LaunchedEffect(Unit) { val d = (env.kv("fixDraft") as? JsonPrimitive)?.content.orEmpty(); text = d.take(engine.maxLen); checked = text; loaded = true }
    LaunchedEffect(text) { if (loaded) { delay(280); checked = text } }
    LaunchedEffect(text, loaded) { if (loaded) { delay(500); env.putKv("fixDraft", JsonPrimitive(text.take(engine.maxLen))) } }
    val issues by remember(checked, ver) { derivedStateOf { engine.check(checked).filter { engine.key(it, checked) !in FixSession.ignored } } }
    val visible = issues.filter { it.type !in off }
    val selIssue = sel?.let { s -> issues.getOrNull(s)?.takeIf { it.type !in off } }
    fun push() { if (text.isNotEmpty()) { undo.add(text); if (undo.size > 30) undo.removeAt(0) } }
    fun replace(newText: String) { text = newText.take(engine.maxLen); checked = text; sel = null; ver++ }
    val a = FixActions(
        text = { text = it.take(engine.maxLen); notice = "" }, toggle = { k -> off = if (k in off) off - k else off + k; FixSession.off.clear(); FixSession.off.addAll(off) },
        pick = { sel = it; notice = "" },
        step = { d -> val p = visible.indexOf(selIssue); val n = visible.getOrNull(p + d); if (n != null) sel = issues.indexOf(n) },
        apply = { x, rep ->
            push(); replace(FixEngine.apply(text, listOf(x to rep)))
            val fresh = engine.check(text).filter { engine.key(it, text) !in FixSession.ignored }
            sel = fresh.firstOrNull { it.type !in off && it.s >= x.s }?.let { fresh.indexOf(it) }; notice = "fixed1"
        },
        all = { val list = visible.filter { it.safe }; if (list.isNotEmpty()) { push(); replace(FixEngine.apply(text, list.map { it to it.reps[0] })); notice = "fixed" + list.size } },
        ignore = { selIssue?.let { FixSession.ignored.add(engine.key(it, checked)); sel = null; ver++; notice = "ignored" } },
        undo = { undo.removeLastOrNull()?.let { replace(it) } },
        sample = { push(); replace(engine.sample) }, clear = { if (text.isNotEmpty()) { push(); replace("") } },
        copy = { clip.setText(AnnotatedString(FixEngine.fixed(text, visible))); notice = "copied" }, open = open,
    )
    FixLayout(FixUi(engine, text, issues, off, sel, undo.isNotEmpty(), notice, stale = checked != text), a, onExit)
}

@Composable
fun FixLayout(ui: FixUi, a: FixActions, onExit: () -> Unit) {
    val t = LocalL10n.current.western(); val c = LocalLKColors.current
    val visible = ui.issues.filter { it.type !in ui.off }
    val sel = ui.sel?.let { ui.issues.getOrNull(it) }?.takeIf { it.type !in ui.off }
    fun tone(type: String): Color = when (type) { "spelling" -> c.error; "grammar" -> c.tertiary; "punct" -> c.success; else -> c.primary }
    fun typeName(k: String) = t.lv(ui.engine.types.firstOrNull { it.first == k }?.second ?: k)
    val blank = ui.text.isBlank()
    VScreen(t.lv("Sửa ngữ pháp"), onExit) {
        VMuted(t.lv("Dán hoặc gõ đoạn văn tiếng Anh – lỗi được gạch chân ngay. Bộ soát chạy hoàn toàn trên máy bạn, không gửi chữ đi đâu."))
        LKCard {
            VField(ui.text, a.text, t.lv("Dán đoạn văn tiếng Anh vào đây…"), singleLine = false, lines = 8)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                VMuted(t.lv("{n} từ", "n" to Essay.words(ui.text)), Modifier.weight(1f))
                VChip(t.lv("Đoạn mẫu"), a.sample); VChip(t.lv("Xóa"), a.clear)
            }
            VFlow { ui.engine.types.forEach { (k, _) -> VChip(typeName(k) + " " + ui.issues.count { it.type == k }, { a.toggle(k) }, selected = k !in ui.off) } }
        }
        LKCard {
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceSm), verticalAlignment = Alignment.CenterVertically) {
                VText(visible.size.toString(), LKType.headlineLg, if (visible.isNotEmpty()) c.error else c.success)
                androidx.compose.foundation.layout.Column(Modifier.weight(1f)) {
                    VText(if (blank) t.lv("Chưa có nội dung") else if (visible.isNotEmpty()) t.lv("{n} lỗi cần xem", "n" to visible.size) else t.lv("Không thấy lỗi nào"), LKType.titlePill)
                    VMuted(t.lv("Bấm vào chữ gạch chân hoặc chọn trong danh sách."))
                }
            }
            LAction(t.lv("Sửa nhanh {n} lỗi an toàn", "n" to visible.count { it.safe }), a.all, primary = true, enabled = visible.any { it.safe })
            Row(horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs)) {
                LAction(t.lv("Sao chép bản đã sửa"), a.copy, enabled = !blank, modifier = Modifier.weight(1f))
                LAction(t.lv("Hoàn tác"), a.undo, enabled = ui.canUndo, modifier = Modifier.weight(1f))
            }
            if (ui.notice.isNotEmpty()) LNote(when { ui.notice == "ignored" -> t.lv("Đã bỏ qua"); ui.notice == "copied" -> t.lv("Đã sao chép bản đã sửa"); ui.notice == "fixed1" -> t.lv("Đã sửa"); else -> t.lv("Đã sửa {n} lỗi", "n" to ui.notice.removePrefix("fixed")) }, c.success)
        }
        if (!blank && !ui.stale && visible.isNotEmpty()) LKCard {
            Ltr {
                androidx.compose.material3.Text(buildAnnotatedString {
                    var at = 0
                    for (x in visible) {
                        if (x.s < at || x.e > ui.text.length) continue
                        append(ui.text.substring(at, x.s))
                        val col = tone(x.type)
                        withStyle(SpanStyle(textDecoration = TextDecoration.Underline, background = col.copy(alpha = if (x == sel) 0.32f else 0.13f))) { append(ui.text.substring(x.s, x.e).ifEmpty { " " }) }
                        at = x.e
                    }
                    if (at < ui.text.length) append(ui.text.substring(at))
                }, style = LKType.bodyLg.toCompose(), color = c.onSurface)
            }
        }
        if (sel != null) {
            val wrong = ui.text.substring(sel.s, minOf(sel.e, ui.text.length)).ifBlank { "␣" }
            val pos = visible.indexOf(sel)
            LKCard {
                VFlow { VBadge(typeName(sel.type), tone(sel.type).copy(alpha = 0.18f), c.onSurface); VText(t.lv(sel.title), LKType.titlePill) }
                Ltr { androidx.compose.material3.Text(wrong, style = LKType.bodyLg.toCompose().copy(textDecoration = TextDecoration.LineThrough), color = c.error) }
                VFlow {
                    sel.reps.forEachIndexed { k, r ->
                        val label = (if (r.isEmpty()) t.lv("(xóa)") else r) + (sel.levels?.getOrNull(k)?.takeIf { it.isNotEmpty() }?.let { "  $it" } ?: "")
                        VChip(label, { a.apply(sel, r) }, selected = k == 0)
                    }
                }
                VText(t.lv(sel.why), LKType.bodySm)
                VFlow {
                    if (sel.lesson.isNotEmpty()) VChip(t.lv("Học bài ngữ pháp liên quan"), { a.open("grammar/" + sel.lesson) })
                    VChip(t.lv("Bỏ qua lỗi này"), a.ignore)
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    VChip("‹ " + t.lv("Lỗi trước"), { a.step(-1) }); VMuted("${pos + 1}/${visible.size}"); VChip(t.lv("Lỗi sau") + " ›", { a.step(1) })
                }
            }
        } else if (!blank && visible.isEmpty() && !ui.stale) LKCard {
            VTitle(t.lv("Không thấy lỗi nào")); VMuted(t.lv("Bộ soát offline bắt các lỗi hay gặp của người học – vẫn nên đọc lại một lượt."))
        }
        if (visible.isNotEmpty()) LKCard {
            visible.forEach { x ->
                val o = ui.text.substring(x.s, minOf(x.e, ui.text.length)).ifBlank { "␣" }
                Row(Modifier.fillMaxWidth().heightIn(min = 44.dp).tactile({ a.pick(ui.issues.indexOf(x)) }).padding(vertical = 4.dp), horizontalArrangement = Arrangement.spacedBy(LKSpacing.spaceXs), verticalAlignment = Alignment.CenterVertically) {
                    VText("●", LKType.labelBadge, tone(x.type))
                    Ltr { VText(t.lv(x.title) + " · " + o + " → " + (x.reps.firstOrNull()?.ifEmpty { t.lv("(xóa)") } ?: ""), LKType.bodySm, if (x == sel) c.secondary else c.onSurface, Modifier.weight(1f)) }
                }
            }
        }
    }
}
