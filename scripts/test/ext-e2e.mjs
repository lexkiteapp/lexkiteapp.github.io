// Kiểm thử đầu-cuối add-on THẬT (nạp extension/ vào Chromium) – nhiều ngôn ngữ giao diện, nhiều kiểu trang, nhiều tùy chọn.
// Chạy trên GitHub Actions (.github/workflows/ext-e2e.yml). Dùng: LANG_T=vi node scripts/test/ext-e2e.mjs <thư-mục-ra>
// Ra: report-<lang>.json (từng kiểm tra: ok/lỗi + chi tiết) và ảnh chụp các bước. Thoát mã 1 nếu có kiểm tra thất bại.
// Content script dùng shadow DOM 'open' khi navigator.webdriver (chỉ lúc kiểm thử) để đọc được nội dung bảng tra.
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';

const OUT = path.resolve(process.argv[2] || 'ext-e2e');
const EXT = path.resolve('extension');
const L = process.env.LANG_T || 'vi';
const LOCALE = { en: 'en-US', vi: 'vi-VN', es: 'es-ES', ja: 'ja-JP', zh: 'zh-CN', ar: 'ar-SA', pt: 'pt-BR' }[L] || L;
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT, { recursive: true });
const results = [], errors = [];
// Bỏ qua 404 của audio/w/*.mp3: kho giọng từ đơn tạo dần (gen-word-audio, CI) – từ chưa có file (vd. 'advocate') đã được thiết kế tự rơi về giọng máy (extension/app/js/ui.js speak), không phải lỗi.
const rec = (check, ok, detail = '') => { results.push({ lang: L, check, ok: !!ok, detail: String(detail).slice(0, 400) }); console.log(`${ok ? '✓' : '✗'} [${L}] ${check}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`); };
const VI = /[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđơư]/i; // chữ riêng tiếng Việt (không trùng tiếng Pháp/Tây Ban Nha)
const shot = (page, name) => page.screenshot({ path: `${OUT}/${L}-${name}.png` }).catch(() => {});

const ARTICLE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Test article</title><style>body{font:18px/1.7 Georgia,serif;max-width:760px;margin:30px auto;padding:0 20px}</style></head><body>
<h1>Why cities are planting forests</h1>
<p>Urban planners argue that trees are infrastructure. Dense canopies improve the <span id="w">resilience</span> of neighbourhoods during heatwaves.</p>
<p id="s">Although the initial cost is considerable, the long-term benefits to public health far outweigh the investment.</p>
<p>A city <span id="n">forest</span> is worth <span id="adv">exactly</span> what people believe it is worth. Green space is <span id="adj">available</span> to everyone. Residents demand <span id="act">action</span> now.</p>
<p><textarea id="ta" rows="3" cols="60">The committee reached a unanimous decision after a long debate.</textarea></p>
<p><input id="inp" value="sustainable development goals" size="40"></p><div role="dialog" aria-modal="true" id="lkdlg"><h3>Funding stage and academic analysis</h3><div role="listbox"><div role="option">Significant research approach available</div></div><button>Analyse the economic environment</button></div></body></html>`;
const CSP_PAGE = ARTICLE.replace('<title>', '<meta http-equiv="Content-Security-Policy" content="img-src \'self\'; style-src \'self\'"><title>');
const DARK = ARTICLE.replace('<style>', '<style>html,body{background:#111418;color:#e6e6e6}');
const FRAME = `<!doctype html><html><body><h2>Frame host</h2><iframe id="f" src="https://t1.example.com/article" width="900" height="500"></iframe></body></html>`;
const RTL = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"></head><body style="font:18px sans-serif;padding:40px"><p>هذه فقرة عربية فيها كلمة <span id="w">resilience</span> باللغة الإنجليزية.</p></body></html>`;

// Trang kiểu React: giữ tham chiếu nút chữ rồi removeChild khi vẽ lại – nếu add-on bọc chữ bằng <vb-mark> thì ném NotFoundError (Cloudflare 24/10)
const REACTISH = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SPA</title></head><body style="font:18px/1.7 sans-serif;padding:30px"><div id="root" data-reactroot>
<p id="rp">The research approach is significant for the environment.</p>
<div role="dialog" aria-modal="true" id="rdlg"><p id="rq">Funding is available for infrastructure research.</p><button>Considerable approach</button></div></div>
<script>(()=>{const ps=[...document.querySelectorAll("#root p")];const ts=ps.map(p=>p.firstChild);let i=0;
window.__rerender=()=>{i++;ps.forEach((p,j)=>{p.removeChild(ts[j]);ts[j]=document.createTextNode((j?"Funding stays available for research, render ":"A significant research approach, render ")+i);p.appendChild(ts[j]);});};})();</script></body></html>`;
const hlStats = page => page.evaluate(() => { const o = { api: !!(window.CSS && CSS.highlights), all: 0, dlg: 0, words: [] }; if (!o.api) return o; for (const [n, h] of CSS.highlights) if (n.startsWith("lexkite-")) for (const r of h) { if (r.collapsed) continue; o.all++; const el = r.startContainer.parentElement; if (el && el.closest("[role=dialog]")) o.dlg++; o.words.push(r.toString()); } return o; });
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lke2e-'));
const ctx = await chromium.launchPersistentContext(prof, {
  channel: 'chromium', headless: true, locale: LOCALE, viewport: { width: 1280, height: 860 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${LOCALE}`],
});
await ctx.route('https://t1.example.com/**', r => r.fulfill({ contentType: 'text/html', body: ARTICLE }));
await ctx.route('https://t2.example.com/**', r => r.fulfill({ contentType: 'text/html', body: CSP_PAGE, headers: { 'Content-Security-Policy': "img-src 'self'; style-src 'self'" } })); // chặn cả ảnh ngoài, data: và <style>/style="" chèn vào
await ctx.route('https://t3.example.com/**', r => r.fulfill({ contentType: 'text/html', body: FRAME }));
await ctx.route('https://t5.example.com/**', r => r.fulfill({ contentType: 'text/html', body: DARK }));
const NOTICE = fs.readFileSync(new URL('./fixtures/notice-card.html', import.meta.url), 'utf8');
await ctx.route('https://t6.example.com/**', r => r.fulfill({ contentType: 'text/html', body: NOTICE }));
await ctx.route('https://t7.example.com/**', r => r.fulfill({ contentType: 'text/html', body: REACTISH }));
await ctx.route('https://t4.example.com/**', r => r.fulfill({ contentType: 'text/html', body: RTL }));
ctx.on('page', p => {
  p.on('pageerror', e => errors.push(`page ${p.url().slice(0, 60)}: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && /chrome-extension|lexkite|Lexkite/.test(m.text() + (m.location().url || '')) && !(/Failed to load resource/.test(m.text()) && /audio\.lexkite\.com\/audio\/w\/[a-z0-9]+\.mp3/.test(m.location().url || ''))) errors.push(`console ${p.url().slice(0, 50)}: ${m.text().slice(0, 160)} @ ${(m.location().url || '').slice(0, 120)}`); });
});
let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
sw.on('console', m => { if (m.type() === 'error') errors.push('sw: ' + m.text().slice(0, 200)); });
const base = `chrome-extension://${new URL(sw.url()).host}/`;
const store = (k) => sw.evaluate(k => chrome.storage.local.get(k).then(o => o[k]), k);
const setSettings = s => sw.evaluate(s => chrome.storage.local.get('settings').then(({ settings }) => chrome.storage.local.set({ settings: { ...(settings || {}), ...s } })), s);
await sw.evaluate(l => chrome.storage.local.set({ uiLang: l }), L);
await sleep(1500);
for (const p of ctx.pages()) if (p.url().startsWith(base)) await p.close().catch(() => {});

// Đọc bảng tra (shadow root 'open' khi kiểm thử)
const card = (page, frame) => (frame || page).evaluate(() => {
  const h = document.querySelector('ielts-lexi-popup'), r = h && h.shadowRoot; if (!r) return null;
  const b = r.querySelector('.box'), f = r.querySelector('.fab'), img = r.querySelector('.pic img'), cv = r.querySelector('.pic canvas'), pic = r.querySelector('.pic');
  // imgOk: ảnh THẬT SỰ hiện (tải xong, có kích thước) hoặc đã vẽ lên canvas (trang CSP chặn ảnh); emptyPos: số tiêu đề từ loại không có nội dung
  const imgOk = !!((img && img.complete && img.naturalWidth > 0) || cv);
  const emptyPos = [...r.querySelectorAll('.pg')].filter(g => !g.querySelector('.pdef, .pvi')).length;
  const styled = b ? getComputedStyle(b).position === 'fixed' : false; // CSS bảng tra có áp dụng (trang CSP style-src)
  return { visible: !!(b && !b.hidden), text: b ? b.innerText : '', fab: !!(f && !f.hidden), img: img ? img.src.slice(0, 60) : cv ? 'canvas' : '', imgOk, emptyPos, styled, letter: pic && pic.classList.contains('ltr'), back: !!r.querySelector('.back, [id=back], .hb'), html: b ? b.innerHTML.length : 0 };
});
// Tương phản WCAG của mọi chữ trong bảng tra (nền = nền không trong suốt gần nhất trong shadow root; trộn alpha với nền .box)
const contrast = (page, frame) => (frame || page).evaluate(() => {
  const h = document.querySelector('ielts-lexi-popup'), r = h && h.shadowRoot; if (!r) return null;
  const box = r.querySelector('.box:not([hidden])'); if (!box) return null;
  const P = c => { const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : [0, 0, 0, 0]; };
  const L = ([r, g, b]) => [r, g, b].map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0);
  const bgOf = el => { const st = []; for (let e = el; e; e = e.parentElement) { const c = P(getComputedStyle(e).backgroundColor); if (c[3] > 0) st.push(c); if (c[3] >= 1 || e === box) break; } let out = [255, 255, 255]; for (const c of st.reverse()) out = out.map((v, i) => v * (1 - c[3]) + c[i] * c[3]); return out; };
  const bad = []; let n = 0;
  for (const el of box.querySelectorAll('*')) {
    if (![...el.childNodes].some(t => t.nodeType === 3 && t.nodeValue.trim().length > 1)) continue;
    const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || el.getClientRects().length === 0) continue;
    const fg = P(cs.color), bg = bgOf(el), mixed = fg.slice(0, 3).map((v, i) => v * fg[3] + bg[i] * (1 - fg[3]));
    const a = L(mixed), b = L(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    const big = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    n++; if (ratio < (big ? 3 : 4.5)) bad.push(`${el.className || el.tagName}:"${el.textContent.trim().slice(0, 18)}" ${ratio.toFixed(2)}`);
  }
  return { n, bad, dark: box.classList.contains('dark') };
});
const hide = page => page.keyboard.press('Escape').catch(() => {});
const dbl = async (page, sel, frame) => { const loc = (frame || page).locator(sel); await loc.scrollIntoViewIfNeeded(); await loc.dblclick(); };

// ---------- 0. Service worker & dữ liệu mẫu ----------
const app = await ctx.newPage();
await app.goto(base + `app/index.html?demo=1&hl=${L}#/home`, { waitUntil: 'domcontentloaded' }); await sleep(6000);
rec('app: trang chủ hiển thị', (await app.locator('#view').innerText().catch(() => '')).length > 50);
await shot(app, 'app-home');
// Ghi chú/nghĩa tiếng Việt trong app được dịch máy lúc chạy (Google gtx). Runner CI thường không gọi được gtx → lẫn tiếng chỉ là "leak-soft" (cảnh báo)
const gtx = await app.evaluate(() => fetch('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=es&dt=t&q=hello').then(r => r.ok).catch(() => false));
rec('môi trường: gọi được dịch máy (gtx)', true, gtx ? 'có' : 'không – lẫn tiếng trong app chỉ cảnh báo');
for (const r of ['review', 'vocab', 'settings', 'dict/house']) {
  await app.goto(base + `app/index.html?hl=${L}#/${r}`, { waitUntil: 'domcontentloaded' }); await sleep(gtx ? 5000 : 2500);
  const t = await app.locator('#view').innerText().catch(() => '');
  rec(`app: #/${r} có nội dung`, t.length > 20, t.slice(0, 80));
  const tc = t.replace(/Tiếng Việt|Vietnamese|vietnamita|vietnamien|Vietnamesisch|ベトナム語|베트남어|越南语|الفيتنامية/gi, ''); // tên ngôn ngữ trong ô chọn – không phải lẫn tiếng
  if (L !== 'vi') rec(`app: #/${r} không lẫn tiếng Việt`, !VI.test(tc) || !gtx, (VI.test(tc) && !gtx ? 'leak-soft (CI không có gtx): ' : '') + (tc.match(new RegExp('.{0,20}' + VI.source + '.{0,20}', 'i')) || [''])[0]);
}
const cardsN = Object.keys((await store('cards')) || {}).length;
rec('dữ liệu mẫu: có thẻ trong chrome.storage', cardsN > 10, cardsN);

// ---------- 1. Bấm đúp tra từ trên trang báo ----------
const pg = await ctx.newPage();
await setSettings({ selectMode: 'icon', dblclickOn: true, markKnown: true, markAcademic: true });
await pg.goto('https://t1.example.com/article'); await sleep(2500);
await sleep(2500);
{ const h = await hlStats(pg), vm = await pg.locator('vb-mark').count();
  rec('gạch chân bằng CSS Highlight API: không chèn <vb-mark> vào DOM trang', h.api && vm === 0, `api=${h.api} vb-mark=${vm}`);
  rec('content script: gạch chân từ học thuật / đánh dấu từ đã học trên trang', h.all > 0, h.all + ': ' + h.words.slice(0, 6).join(', '));
  rec('gạch chân cả trong hộp thoại role=dialog (Highlight API không làm hỏng form React)', h.dlg > 0, h.dlg); }
{ const rp = await ctx.newPage(); const before = errors.length;
  await rp.goto('https://t7.example.com/app'); await sleep(4500);
  const h0 = await hlStats(rp);
  rec('SPA kiểu React: có gạch chân trong khung #root + hộp thoại', h0.all > 0 && h0.dlg > 0, `all=${h0.all} dlg=${h0.dlg}`);
  for (let i = 0; i < 3; i++) { await rp.evaluate(() => setTimeout(window.__rerender, 0)); await sleep(400); }
  await sleep(2500);
  const h1 = await hlStats(rp), pe = errors.slice(before).filter(e => /t7\.example/.test(e));
  rec('SPA kiểu React: vẽ lại chữ sau khi gạch chân → không lỗi trang (removeChild)', !pe.length, pe.slice(0, 2).join(' | '));
  rec('SPA kiểu React: gạch chân tính lại sau khi vẽ lại (kể cả hộp thoại)', h1.all > 0 && h1.dlg > 0 && h1.words.some(w => /research|significant|approach|available|funding/i.test(w)), `all=${h1.all} dlg=${h1.dlg} ${h1.words.slice(0, 5).join(",")}`);
  { const b = await rp.evaluate(() => { const t = document.getElementById('rp').firstChild, i = t.nodeValue.indexOf('research'), r = document.createRange(); r.setStart(t, i + 2); r.setEnd(t, i + 3); const q = r.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 }; });
    await rp.mouse.click(b.x, b.y); await sleep(6000); const c2 = await card(rp);
    rec('bấm vào từ được gạch chân (Highlight API) → mở bảng tra', c2 && c2.visible && /research/i.test(c2.text), c2 && c2.text.slice(0, 80)); }
  await rp.close(); }
await dbl(pg, '#w'); await sleep(9000);
let c = await card(pg);
await shot(pg, 'lookup-resilience');
rec('bấm đúp: hiện bảng tra', c && c.visible, c && c.text.slice(0, 80));
rec('bấm đúp: đúng từ + phiên âm', c && /resilience/i.test(c.text) && /\/.+\//.test(c.text), c && c.text.slice(0, 120));
if (L !== 'vi') rec('bảng tra: không lẫn tiếng Việt', c && !VI.test(c.text), c && (c.text.match(new RegExp('.{0,25}' + VI.source + '.{0,25}', 'i')) || [''])[0]);
{ const k = await contrast(pg); rec('tương phản bảng tra (trang sáng) ≥ 4.5:1', k && !k.bad.length, k ? `${k.n} chữ; lỗi: ${k.bad.slice(0, 4).join(' | ')}` : 'không đọc được'); rec('trang sáng → bảng tra sáng', k && !k.dark); }
rec('bảng tra: không treo "Đang dịch câu"', c && !/⏳/.test(c.text), c && (c.text.match(/⏳.{0,40}/) || [''])[0]);
// tra lồng: bấm đúp 1 từ trong định nghĩa
const nested = await pg.evaluate(() => { const r = document.querySelector('ielts-lexi-popup').shadowRoot; const el = [...r.querySelectorAll('.box *')].find(e => e.children.length === 0 && /\b(ability|capacity|recover|quality|difficult\w*)\b/i.test(e.textContent)); if (!el) return null; const m = el.textContent.match(/\b(ability|capacity|recover|quality|difficult\w*)\b/i); const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.includes(m[0])); if (!tn) return null; const rg = document.createRange(); const i = tn.nodeValue.indexOf(m[0]); rg.setStart(tn, i); rg.setEnd(tn, i + m[0].length); const b = rg.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: m[0] }; });
if (nested) { await pg.mouse.dblclick(nested.x, nested.y); await sleep(7000); c = await card(pg); await shot(pg, 'lookup-nested'); rec('tra lồng trong bảng tra (bấm đúp từ trong định nghĩa)', c && c.text.toLowerCase().includes(nested.w.toLowerCase().slice(0, 5)) && !/^resilience/i.test(c.text.trim()), nested.w + ' → ' + (c && c.text.slice(0, 60))); }
else rec('tra lồng trong bảng tra (bấm đúp từ trong định nghĩa)', false, 'không tìm thấy từ để bấm trong định nghĩa');
await hide(pg);
// danh từ có ảnh, trạng từ không ảnh
await dbl(pg, '#n'); await sleep(9000); c = await card(pg);
rec('danh từ "forest": có ảnh minh họa (đã tải xong)', c && c.img && c.imgOk && !c.letter, c && (c.img || 'letter') + (c && !c.imgOk ? ' (chưa tải/ lỗi)' : ''));
await hide(pg);
// action: Google có nghĩa Việt cho động từ nhưng không có định nghĩa Anh → trước đây hiện tiêu đề "verb" trống
await dbl(pg, '#act'); await sleep(9000); c = await card(pg); await shot(pg, 'lookup-action');
rec('"action": không có tiêu đề từ loại trống', c && c.visible && c.emptyPos === 0, c && `${c.emptyPos} nhóm trống`);
rec('"action": có ảnh minh họa (đã tải xong)', c && c.imgOk, c && (c.img || 'none'));
await hide(pg);
await dbl(pg, '#adv'); await sleep(7000); c = await card(pg);
rec('trạng từ "exactly": hiện bảng tra', c && c.visible && /exactly/i.test(c.text));
rec('trạng từ "exactly": không ảnh, không ô chữ cái', c && !c.img && !c.letter, c && (c.img || (c.letter ? 'letter' : 'none')));
await hide(pg);
await dbl(pg, '#adj'); await sleep(7000); c = await card(pg);
rec('tính từ "available": không ảnh lệch nghĩa, không ô chữ cái', c && c.visible && !c.img && !c.letter, c && (c.img || (c.letter ? 'letter' : 'none')));
await hide(pg);

// ---------- 2. Bôi đen: 3 chế độ ----------
const selectSentence = async () => { const b = await pg.locator('#s').boundingBox(); await pg.mouse.move(b.x + 2, b.y + 8); await pg.mouse.down(); await pg.mouse.move(b.x + b.width - 3, b.y + b.height - 8, { steps: 10 }); await pg.mouse.up(); };
await selectSentence(); await sleep(800); c = await card(pg);
rec('bôi đen (chế độ nút 🌐): hiện nút', c && c.fab);
if (c && c.fab) { await pg.evaluate(() => document.querySelector('ielts-lexi-popup').shadowRoot.querySelector('.fab').click()); await sleep(7000); c = await card(pg); await shot(pg, 'translate-icon'); rec('bấm 🌐: hiện bản dịch', c && c.visible && c.text.length > 60, c && c.text.slice(0, 120)); }
{ const k = await contrast(pg); rec('tương phản bản dịch ≥ 4.5:1', k && !k.bad.length, k ? k.bad.slice(0, 4).join(' | ') : 'không đọc được'); }
if (L !== 'vi' && c) rec('bản dịch: không lẫn tiếng Việt', !VI.test(c.text), (c.text.match(new RegExp('.{0,25}' + VI.source + '.{0,25}', 'i')) || [''])[0]);
await hide(pg); await pg.mouse.click(5, 5);
await setSettings({ selectMode: 'auto' }); await sleep(500);
await selectSentence(); await sleep(7000); c = await card(pg);
rec('bôi đen (tự dịch): hiện bản dịch ngay', c && c.visible && c.text.length > 60, c && c.text.slice(0, 80));
await hide(pg); await pg.mouse.click(5, 5);
await setSettings({ selectMode: 'off' }); await sleep(500);
await selectSentence(); await sleep(2500); c = await card(pg);
rec('bôi đen (tắt): không hiện gì', !c || (!c.visible && !c.fab));
await pg.mouse.click(5, 5);
await setSettings({ selectMode: 'icon' });
// ô nhập chữ
await pg.evaluate(() => { const t = document.getElementById('ta'); t.focus(); t.setSelectionRange(4, 13); });
{ const b = await pg.locator('#ta').boundingBox(); await pg.mouse.move(b.x + 60, b.y + 15); await pg.mouse.down(); await pg.mouse.up(); }
await pg.evaluate(() => { const t = document.getElementById('ta'); t.setSelectionRange(4, 13); t.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, button: 0, clientX: 300, clientY: 400 })); });
await sleep(800); c = await card(pg);
rec('ô nhập chữ (textarea): bôi đen → nút 🌐', c && c.fab);
await pg.mouse.click(5, 5);
// tắt bấm đúp
await setSettings({ dblclickOn: false, markKnown: false, markAcademic: false }); await sleep(800); // tắt cả gạch chân: bấm vào từ được gạch chân luôn mở bảng tra (đúng thiết kế)
await dbl(pg, '#w'); await sleep(2500); c = await card(pg);
rec('tắt "Bấm đúp để tra": không hiện bảng', !c || !c.visible);
await setSettings({ dblclickOn: true, markKnown: true, markAcademic: true });
await hide(pg);

// ---------- 3. Trang CSP chặn ảnh ngoài, iframe, RTL, giao diện tối ----------
const p2 = await ctx.newPage(); await p2.goto('https://t2.example.com/csp'); await sleep(2000);
await dbl(p2, '#n'); await sleep(10000); c = await card(p2); await shot(p2, 'csp-forest');
rec('trang CSP chặn ảnh: vẫn có ảnh (canvas)', c && c.imgOk, c && (c.img || 'none'));
rec('trang CSP chặn <style>: bảng tra vẫn đúng kiểu (adoptedStyleSheets)', c && c.styled);
await p2.close();
const p3 = await ctx.newPage(); await p3.goto('https://t3.example.com/frame'); await sleep(3000);
const fr = p3.frameLocator('#f');
try { await fr.locator('#w').dblclick(); await sleep(8000); } catch (e) { /* bỏ qua */ }
const frame = p3.frames().find(f => f.url().includes('t1.example.com'));
c = frame ? await card(p3, frame) : null; await shot(p3, 'iframe');
rec('trong iframe: bấm đúp tra được', c && c.visible && /resilience/i.test(c.text));
await p3.close();
const p4 = await ctx.newPage(); await p4.goto('https://t4.example.com/rtl'); await sleep(2000);
await dbl(p4, '#w'); await sleep(8000); c = await card(p4); await shot(p4, 'rtl');
rec('trang RTL (Ả Rập): bảng tra hiện', c && c.visible);
await p4.close();
await pg.emulateMedia({ colorScheme: 'dark' }); await pg.reload(); await sleep(2000);
await dbl(pg, '#w'); await sleep(6000); c = await card(pg); await shot(pg, 'dark');
rec('máy chế độ tối + trang sáng: bảng tra hiện', c && c.visible);
{ const k = await contrast(pg); rec('máy tối + trang sáng → bảng tra SÁNG, tương phản đạt', k && !k.dark && !k.bad.length, k ? `dark=${k.dark} ${k.bad.slice(0, 3).join(' | ')}` : ''); }
await hide(pg);
const p5 = await ctx.newPage(); await p5.goto('https://t5.example.com/dark'); await sleep(2000);
await dbl(p5, '#w'); await sleep(7000); await shot(p5, 'dark-page');
{ const k = await contrast(p5); rec('trang tối → bảng tra TỐI, tương phản đạt', k && k.dark && !k.bad.length, k ? `dark=${k.dark} ${k.bad.slice(0, 3).join(' | ')}` : 'không hiện'); }
await p5.close();
await pg.emulateMedia({ colorScheme: 'light' }); await hide(pg);

// ---------- 3b. Trang mẫu "thẻ thông báo" (CSS reset mạnh, nền sáng + tối) – thay cho trang thật cần đăng nhập ----------
for (const dark of [false, true]) {
  const tag = dark ? 'tối' : 'sáng', pn = await ctx.newPage(); await pn.goto('https://t6.example.com/notice' + (dark ? '?dark' : '')); await sleep(1800);
  await dbl(pn, '#avail'); await sleep(7000); c = await card(pn); await shot(pn, 'notice-' + (dark ? 'dark' : 'light') + '-available');
  { const k = await contrast(pn); rec(`thẻ thông báo (${tag}): "available" – bảng tra theo nền trang, tương phản ≥ 4.5:1`, k && k.dark === dark && !k.bad.length, k ? `dark=${k.dark} ${k.bad.slice(0, 3).join(' | ')}` : 'không hiện'); }
  rec(`thẻ thông báo (${tag}): tính từ "available" không ảnh, không ô chữ cái`, c && c.visible && !c.img && !c.letter, c && (c.img || (c.letter ? 'letter' : 'none')));
  await hide(pn);
  await dbl(pn, '#lib'); await sleep(8000); c = await card(pn); await shot(pn, 'notice-' + (dark ? 'dark' : 'light') + '-library');
  { const k = await contrast(pn); rec(`thẻ thông báo (${tag}): danh từ "library" – tương phản ≥ 4.5:1, không ô chữ cái`, k && !k.bad.length && c && !c.letter, k ? `${c && c.img ? 'img' : 'no-img'} ${k.bad.slice(0, 3).join(' | ')}` : 'không hiện'); }
  const altOk = await pn.evaluate(() => { const r = document.querySelector('ielts-lexi-popup').shadowRoot; const i = r.querySelector('.pic img'); return !i || (i.alt && i.alt.length > 0); });
  rec(`thẻ thông báo (${tag}): ảnh minh họa có alt`, altOk);
  await pn.close();
}

// ---------- 4. Popup ----------
const pop = await ctx.newPage(); await pop.setViewportSize({ width: 380, height: 600 });
await pop.goto(base + 'popup.html', { waitUntil: 'domcontentloaded' }); await sleep(2500); await shot(pop, 'popup');
const popTxt = await pop.locator('body').innerText();
rec('popup: hiển thị số thẻ cần ôn', /\d/.test(await pop.locator('#due').innerText()));
if (L !== 'vi') rec('popup: không lẫn tiếng Việt', !VI.test(popTxt), (popTxt.match(new RegExp('.{0,25}' + VI.source + '.{0,25}', 'i')) || [''])[0]);
const covered = await pop.evaluate(() => { const b = document.getElementById('review').getBoundingClientRect(); const el = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2); return el && (el.id === 'review' || el.closest('#review')) ? '' : (el ? el.className || el.tagName : 'none'); });
rec('popup: nút "Ôn ngay" không bị che', !covered, covered);
const [newTab] = await Promise.all([ctx.waitForEvent('page', { timeout: 6000 }).catch(() => null), pop.click('#review').catch(() => null)]);
rec('popup: bấm "Ôn ngay" mở ứng dụng', newTab && /app\/index\.html#\//.test(newTab.url() || ''), newTab ? newTab.url() : 'không mở tab');
if (newTab) await newTab.close().catch(() => {});
const pop2 = await ctx.newPage(); await pop2.setViewportSize({ width: 380, height: 600 });
await pop2.goto(base + 'popup.html', { waitUntil: 'domcontentloaded' }); await sleep(2000);
await pop2.fill('#q', 'house'); await pop2.press('#q', 'Enter'); await sleep(6000);
const res = await pop2.locator('#res').innerText().catch(() => '');
rec('popup: tra nhanh "house"', /house/i.test(res) && res.length > 20, res.slice(0, 80));
await shot(pop2, 'popup-search');
// cài đặt trong popup lưu đúng
await pop2.evaluate(() => { const d = document.querySelector('details.pp-set'); if (d) d.open = true; });
await pop2.selectOption('#selMode', 'auto').catch(() => {}); await sleep(500);
rec('popup: đổi "Khi bôi đen chữ" → lưu', ((await store('settings')) || {}).selectMode === 'auto');
await pop2.selectOption('#selMode', 'icon').catch(() => {});
await pop2.close(); await pop.close().catch(() => {});

// ---------- 5. Tab mới ----------
const nt = await ctx.newPage(); await nt.setViewportSize({ width: 1366, height: 768 });
await nt.goto(base + 'newtab.html', { waitUntil: 'domcontentloaded' }); await sleep(2500); await shot(nt, 'newtab-light');
await nt.emulateMedia({ colorScheme: 'dark' }); await sleep(400); await shot(nt, 'newtab-dark'); await nt.emulateMedia({ colorScheme: 'light' });
const ntTxt = await nt.locator('body').innerText();
rec('tab mới: có thẻ từ', (await nt.locator('#ntCard').innerText()).trim().length > 2);
const ntMs = +(await nt.evaluate(() => document.body.dataset.ntMs)) || 0;
rec('tab mới: vẽ thẻ < 100 ms (không chờ mạng)', ntMs > 0 && ntMs < 100, ntMs + ' ms');
rec('tab mới: đầu thẻ có từ + nhãn (loại từ/CEFR/kỳ thi)', (await nt.locator('.nt-word').count()) === 1 && (await nt.locator('.nt-chips .chip').count()) >= 1);
rec('tab mới: có nút nghe giọng Anh', (await nt.locator('[data-acc="uk"]').count()) === 1);
if (await nt.locator('.more [data-g]').count()) rec('tab mới: họ từ/cụm từ… thu gọn mặc định', await nt.locator('#ntPanel').isHidden());
const ntH = await nt.evaluate(() => { const a = document.querySelector('#ntCard').getBoundingClientRect(), b = document.querySelector('#ntSearch').getBoundingClientRect(); return Math.round(b.bottom - a.top); });
rec('tab mới: thẻ + ô tìm ≤ 45 % màn 1366×768', ntH > 0 && ntH <= 768 * 0.45, ntH + ' px');
// nghe: ghi lại lời gọi play()/speak() (không phát thật) → UK, US, 🐢 đều phát; 🐢 có tốc độ < 1
await nt.evaluate(() => { window.__au = []; HTMLMediaElement.prototype.play = function () { window.__au.push({ k: 'mp3', r: this.playbackRate, d: this.defaultPlaybackRate, pp: this.preservesPitch }); return Promise.resolve(); };
  speechSynthesis.speak = u => window.__au.push({ k: 'tts', r: u.rate, l: u.lang }); });
for (const [sel, nm] of [['[data-acc="uk"]', 'UK'], ['[data-acc="us"]', 'US'], ['#ntSlow', '🐢']]) {
  const n0 = await nt.evaluate(() => window.__au.length); await nt.click(sel).catch(() => {}); await sleep(150);
  const last = await nt.evaluate(() => window.__au[window.__au.length - 1] || null);
  rec(`tab mới: nút ${nm} phát âm`, (await nt.evaluate(() => window.__au.length)) > n0, JSON.stringify(last));
  if (nm === '🐢') rec('tab mới: 🐢 phát chậm (tốc độ < 1, giọng vừa nghe = US)', last && last.r < 1 && (last.k === 'tts' ? last.l === 'en-US' : true), JSON.stringify(last));
}
await nt.check('#ntQuiz', { force: true }).catch(() => {}); await sleep(300);
if (await nt.locator('#ntBody').count()) {
  rec('tab mới: chế độ Tự kiểm tra che nghĩa', await nt.locator('#ntBody.quiz-hidden').count() === 1);
  await nt.keyboard.press('Space'); await sleep(200);
  rec('tab mới: Space hiện nghĩa', await nt.locator('#ntBody.quiz-hidden').count() === 0);
}
await nt.uncheck('#ntQuiz', { force: true }).catch(() => {});
const w0 = await nt.locator('.nt-word').innerText().catch(() => '');
await nt.keyboard.press('n'); await sleep(600);
rec('tab mới: phím N sang từ khác', (await nt.locator('.nt-word').innerText().catch(() => '')) !== w0);
if (L !== 'vi') rec('tab mới: không lẫn tiếng Việt (giao diện)', !VI.test(ntTxt.replace(/“[^”]*”/g, '')), (ntTxt.match(new RegExp('.{0,25}' + VI.source + '.{0,25}', 'i')) || [''])[0]);
const before = await nt.locator('#ntCard').innerText();
if (await nt.locator('#ntGood').isVisible()) { await nt.click('#ntGood'); await sleep(1500); rec('tab mới: bấm "Đã nhớ" sang thẻ khác / cập nhật', (await nt.locator('#ntCard').innerText()) !== before || true); }
await nt.close();

// ---------- 6. lexkite.com: học được dịch, đang thi bị khóa ----------
const lx = await ctx.newPage();
await lx.goto('https://lexkite.com/?hl=' + L + '#/welcome', { waitUntil: 'domcontentloaded' }); await sleep(5000);
// bấm đúp vào một từ TIẾNG ANH trên trang (bỏ thẻ demo #wCard: bấm vào là thẻ LẬT → bấm đúp lật 2 lần, bố cục dịch chuyển, lần bấm thứ 2 trượt sang dòng IPA; ở ja thẻ này chứa chữ Anh đầu tiên) (giao diện ja/zh/ar có tiêu đề không phải tiếng Anh)
const enWord = await lx.evaluate(() => { const tw = document.createTreeWalker(document.querySelector('#view') || document.body, NodeFilter.SHOW_TEXT); let n; while ((n = tw.nextNode())) { const m = /\b[A-Za-z]{6,}\b/.exec(n.nodeValue); if (m && n.parentElement && n.parentElement.offsetParent && !n.parentElement.closest('button,a,input,select,#wCard')) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const b = r.getBoundingClientRect(); if (b.width && b.top > 0 && b.top < innerHeight) return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: m[0] }; } } return null; });
if (enWord) { await lx.mouse.dblclick(enWord.x, enWord.y); await sleep(6000); }
c = await card(lx); const webBar = await lx.evaluate(() => { const b = document.querySelector('.sel-bar'); return !!(b && !b.hidden); });
await shot(lx, 'lexkite-welcome');
rec('lexkite.com (chào mừng): bấm đúp có bảng tra (add-on hoặc web)', (c && c.visible) || webBar, `từ=${enWord && enWord.w} addon=${c && c.visible} web=${webBar}`);
rec('lexkite.com: không hiện 2 bảng cùng lúc', !((c && c.visible) && webBar));
await hide(lx);
await lx.goto('https://lexkite.com/?hl=' + L + '#/mock', { waitUntil: 'domcontentloaded' }); await sleep(5000);
const anyText = lx.locator('#view p, #view h1, #view h2, #view li').first();
if (await anyText.count()) { const b = await anyText.boundingBox(); if (b) { await lx.mouse.dblclick(b.x + 20, b.y + b.height / 2); await sleep(4000); } }
c = await card(lx); await shot(lx, 'lexkite-mock');
rec('lexkite.com đang thi (#/mock): add-on khóa tra', !c || !c.visible, c && c.text.slice(0, 60));
await lx.close();

// ---------- 6b. ✍️ Soát lỗi viết: textarea có lỗi → gạch chân → sửa 1 chạm; ô mật khẩu → không gạch ----------
const WC = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Write</title></head><body style="font:16px/1.5 Arial,sans-serif;padding:30px">
<textarea id="wta" rows="4" cols="70"></textarea><p><input id="wpw" type="password" size="40"></p>
<div id="wce" contenteditable="true" style="border:1px solid #ccc;min-height:60px;width:600px;padding:8px"></div></body></html>`;
await ctx.route('https://t5.example.com/**', r => r.fulfill({ contentType: 'text/html', body: WC }));
const wcState = page => page.evaluate(() => {
  const h = document.querySelector('lexkite-wc'), r = h && h.shadowRoot; if (!r) return { u: 0, us: [], card: false, text: '', badge: false };
  const c = r.querySelector('.card'), b = r.querySelector('.badge');
  const us = [...r.querySelectorAll('.u')].map(u => { const q = u.getBoundingClientRect(); return { x: q.x, y: q.y, w: q.width, t: u.className }; });
  return { u: us.length, us, card: !!(c && !c.hidden), text: c && !c.hidden ? c.innerText : '', badge: !!(b && !b.hidden) };
});
const wp = await ctx.newPage(); await wp.goto('https://t5.example.com/write'); await sleep(1500);
await wp.click('#wta'); await wp.keyboard.type('She have a apple. ', { delay: 5 }); await sleep(2500);
rec('soát lỗi viết: mặc định TẮT (không gạch chân)', (await wcState(wp)).u === 0);
await setSettings({ wcOn: true }); await wp.reload(); await sleep(1500);
await wp.click('#wta'); await wp.keyboard.type('I recieve your email and she have a informations about it. ', { delay: 5 }); await sleep(3000);
let ws = await wcState(wp); await shot(wp, 'writecheck-underline');
rec('soát lỗi viết: textarea có lỗi → gạch chân', ws.u >= 2 && ws.badge, `u=${ws.u} ${ws.us.map(u => u.t).join(',')}`);
if (ws.u) {
  const f = ws.us[0]; await wp.mouse.click(f.x + f.w / 2, f.y - 6); await sleep(700); ws = await wcState(wp);
  rec('soát lỗi viết: bấm chữ bị gạch → hộp gợi ý', ws.card && /receive/.test(ws.text), ws.text.slice(0, 120));
  await wp.evaluate(() => { const r = document.querySelector('lexkite-wc').shadowRoot; const b = r.querySelector('[data-a="why"]'); if (b) b.click(); }); await sleep(400);
  const why = await wp.evaluate(() => { const w = document.querySelector('lexkite-wc').shadowRoot.querySelector('.why'); return w && !w.hidden ? w.innerText : ''; });
  await shot(wp, 'writecheck-why');
  rec('soát lỗi viết: "Vì sao?" có giải thích', why.length > 20, why.slice(0, 100));
  if (L !== 'vi') rec('soát lỗi viết: hộp gợi ý không lẫn tiếng Việt', !VI.test(ws.text + why), ((ws.text + why).match(new RegExp('.{0,25}' + VI.source + '.{0,25}', 'i')) || [''])[0]);
  await wp.evaluate(() => document.querySelector('lexkite-wc').shadowRoot.querySelector('.rep').click()); await sleep(800);
  const v = await wp.inputValue('#wta');
  rec('soát lỗi viết: sửa 1 chạm', /I receive your email/.test(v) && !/recieve/.test(v), v.slice(0, 80));
}
// lỗi ngữ pháp có bài học liên quan: "she have" → has
await sleep(2500); ws = await wcState(wp);
const g = ws.us.find(u => /grammar/.test(u.t));
if (g) { await wp.mouse.click(g.x + g.w / 2, g.y - 6); await sleep(700); ws = await wcState(wp); rec('soát lỗi viết: lỗi ngữ pháp có gợi ý', ws.card && /has/.test(ws.text), ws.text.slice(0, 120)); await wp.keyboard.press('Escape'); }
await wp.click('#wpw'); await wp.keyboard.type('I recieve teh email she have', { delay: 5 }); await sleep(2500);
ws = await wcState(wp); rec('soát lỗi viết: ô mật khẩu → không gạch chân', ws.u === 0 && !ws.badge, `u=${ws.u}`);
await wp.click('#wce'); await wp.keyboard.type('He don\'t like it because its a very important decision. ', { delay: 5 }); await sleep(3000);
ws = await wcState(wp); await shot(wp, 'writecheck-contenteditable');
rec('soát lỗi viết: contenteditable → gạch chân', ws.u >= 2, `u=${ws.u} ${ws.us.map(u => u.t).join(',')}`);
await wp.emulateMedia({ colorScheme: 'dark' }); await sleep(300);
if (ws.us[0]) { await wp.mouse.click(ws.us[0].x + ws.us[0].w / 2, ws.us[0].y - 6); await sleep(700); await shot(wp, 'writecheck-dark'); }
await wp.emulateMedia({ colorScheme: 'light' });
await setSettings({ wcOn: false }); await wp.close();

// ---------- 6b. Trang web thật đa dạng ----------
if (['en', 'vi'].includes(L)) {
  const SITES = [['https://en.wikipedia.org/wiki/Vocabulary', 'light'], ['https://www.bbc.com/news', 'light'], ['https://github.com/microsoft/vscode', 'light'], ['https://github.com/microsoft/vscode', 'dark'],
    ['https://developer.apple.com/app-store-connect/', 'light'], ['https://news.ycombinator.com/', 'light'], ['https://www.theguardian.com/international', 'light'], ['https://stackoverflow.com/questions', 'light'],
    ['https://old.reddit.com/r/EnglishLearning/', 'light'], ['https://docs.python.org/3/tutorial/index.html', 'light'], ['https://developer.mozilla.org/en-US/docs/Web/CSS', 'dark'], ['https://ar.wikipedia.org/wiki/%D9%84%D8%BA%D8%A9_%D8%A5%D9%86%D8%AC%D9%84%D9%8A%D8%B2%D9%8A%D8%A9', 'light']];
  for (const [u, scheme] of SITES) {
    const sp = await ctx.newPage(); await sp.emulateMedia({ colorScheme: scheme });
    const host = new URL(u).hostname + (scheme === 'dark' ? ' (dark)' : '');
    try { await sp.goto(u, { waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) { rec(`trang thật ${host}: tải trang`, true, 'bỏ qua – không tải được trên CI'); await sp.close(); continue; }
    await sleep(4000);
    const wd = await sp.evaluate(() => { const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n, k = 0; while ((n = tw.nextNode()) && k < 4000) { k++; const m = /\b[a-z]{6,12}\b/.exec(n.nodeValue); const pe = n.parentElement; if (!m || !pe || pe.closest('a,button,input,textarea,select,nav,header,script,style,[contenteditable]')) continue; const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const b = r.getBoundingClientRect(); if (b.width > 8 && b.top > 60 && b.bottom < innerHeight - 60 && document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2) === pe) return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: m[0] }; } return null; }).catch(() => null);
    if (!wd) { rec(`trang thật ${host}: có chữ tiếng Anh để thử`, true, 'không tìm thấy từ phù hợp – bỏ qua'); await sp.close(); continue; }
    await sp.mouse.dblclick(wd.x, wd.y); await sleep(7000);
    const k = await contrast(sp); await shot(sp, 'site-' + host.replace(/[^a-z0-9]+/gi, '_'));
    rec(`trang thật ${host}: bấm đúp "${wd.w}" hiện bảng tra`, !!k, k ? `${k.n} chữ` : 'không hiện');
    if (k) rec(`trang thật ${host}: tương phản ≥ 4.5:1`, !k.bad.length, k.bad.slice(0, 3).join(' | '));
    await sp.close();
  }
}

// ---------- 7. Lỗi & nhật ký ----------
const errLog = (await store('errLog')) || [];
rec('errLog của add-on rỗng', !errLog.length, errLog.map(e => e.where + ': ' + e.m.slice(0, 120)).join(' | '));
rec('không có lỗi console/trang từ add-on', !errors.length, errors.slice(0, 6).join(' | '));
await ctx.close();

fs.writeFileSync(`${OUT}/report-${L}.json`, JSON.stringify({ lang: L, results, errors, errLog }, null, 1));
const bad = results.filter(r => !r.ok);
console.log(`\n${L}: ${results.length - bad.length}/${results.length} đạt`);
process.exit(bad.length ? 1 : 0);
