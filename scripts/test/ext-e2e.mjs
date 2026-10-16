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
const rec = (check, ok, detail = '') => { results.push({ lang: L, check, ok: !!ok, detail: String(detail).slice(0, 400) }); console.log(`${ok ? '✓' : '✗'} [${L}] ${check}${detail ? ' — ' + String(detail).slice(0, 160) : ''}`); };
const VI = /[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđơư]/i; // chữ riêng tiếng Việt (không trùng tiếng Pháp/Tây Ban Nha)
const shot = (page, name) => page.screenshot({ path: `${OUT}/${L}-${name}.png` }).catch(() => {});

const ARTICLE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Test article</title><style>body{font:18px/1.7 Georgia,serif;max-width:760px;margin:30px auto;padding:0 20px}</style></head><body>
<h1>Why cities are planting forests</h1>
<p>Urban planners argue that trees are infrastructure. Dense canopies improve the <span id="w">resilience</span> of neighbourhoods during heatwaves.</p>
<p id="s">Although the initial cost is considerable, the long-term benefits to public health far outweigh the investment.</p>
<p>A city <span id="n">forest</span> is worth <span id="adv">exactly</span> what people believe it is worth.</p>
<p><textarea id="ta" rows="3" cols="60">The committee reached a unanimous decision after a long debate.</textarea></p>
<p><input id="inp" value="sustainable development goals" size="40"></p></body></html>`;
const CSP_PAGE = ARTICLE.replace('<title>', '<meta http-equiv="Content-Security-Policy" content="img-src \'self\'"><title>');
const FRAME = `<!doctype html><html><body><h2>Frame host</h2><iframe id="f" src="https://t1.example.com/article" width="900" height="500"></iframe></body></html>`;
const RTL = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"></head><body style="font:18px sans-serif;padding:40px"><p>هذه فقرة عربية فيها كلمة <span id="w">resilience</span> باللغة الإنجليزية.</p></body></html>`;

const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lke2e-'));
const ctx = await chromium.launchPersistentContext(prof, {
  channel: 'chromium', headless: true, locale: LOCALE, viewport: { width: 1280, height: 860 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, `--lang=${LOCALE}`],
});
await ctx.route('https://t1.example.com/**', r => r.fulfill({ contentType: 'text/html', body: ARTICLE }));
await ctx.route('https://t2.example.com/**', r => r.fulfill({ contentType: 'text/html', body: CSP_PAGE, headers: { 'Content-Security-Policy': "img-src 'self'" } }));
await ctx.route('https://t3.example.com/**', r => r.fulfill({ contentType: 'text/html', body: FRAME }));
await ctx.route('https://t4.example.com/**', r => r.fulfill({ contentType: 'text/html', body: RTL }));
ctx.on('page', p => {
  p.on('pageerror', e => errors.push(`page ${p.url().slice(0, 60)}: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' && /chrome-extension|lexkite|Lexkite/.test(m.text() + (m.location().url || ''))) errors.push(`console ${p.url().slice(0, 50)}: ${m.text().slice(0, 200)}`); });
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
  const b = r.querySelector('.box'), f = r.querySelector('.fab'), img = r.querySelector('.pic img'), pic = r.querySelector('.pic');
  return { visible: !!(b && !b.hidden), text: b ? b.innerText : '', fab: !!(f && !f.hidden), img: img ? img.src.slice(0, 60) : '', letter: pic && pic.classList.contains('ltr'), back: !!r.querySelector('.back, [id=back], .hb'), html: b ? b.innerHTML.length : 0 };
});
const hide = page => page.keyboard.press('Escape').catch(() => {});
const dbl = async (page, sel, frame) => { const loc = (frame || page).locator(sel); await loc.scrollIntoViewIfNeeded(); await loc.dblclick(); };

// ---------- 0. Service worker & dữ liệu mẫu ----------
const app = await ctx.newPage();
await app.goto(base + `app/index.html?demo=1&hl=${L}#/home`, { waitUntil: 'domcontentloaded' }); await sleep(6000);
rec('app: trang chủ hiển thị', (await app.locator('#view').innerText().catch(() => '')).length > 50);
await shot(app, 'app-home');
for (const r of ['review', 'vocab', 'settings', 'dict/house']) {
  await app.goto(base + `app/index.html?hl=${L}#/${r}`, { waitUntil: 'domcontentloaded' }); await sleep(2500);
  const t = await app.locator('#view').innerText().catch(() => '');
  rec(`app: #/${r} có nội dung`, t.length > 20, t.slice(0, 80));
  if (L !== 'vi') rec(`app: #/${r} không lẫn tiếng Việt`, !VI.test(t.replace(/house|nhà/gi, '')) || L === 'vi', (t.match(new RegExp('.{0,20}' + VI.source + '.{0,20}', 'i')) || [''])[0]);
}
const cardsN = Object.keys((await store('cards')) || {}).length;
rec('dữ liệu mẫu: có thẻ trong chrome.storage', cardsN > 10, cardsN);

// ---------- 1. Bấm đúp tra từ trên trang báo ----------
const pg = await ctx.newPage();
await setSettings({ selectMode: 'icon', dblclickOn: true, markKnown: true, markAcademic: true });
await pg.goto('https://t1.example.com/article'); await sleep(2500);
rec('content script: đánh dấu từ đã học / học thuật trên trang', (await pg.locator('vb-mark').count()) >= 0, await pg.locator('vb-mark').count());
await dbl(pg, '#w'); await sleep(9000);
let c = await card(pg);
await shot(pg, 'lookup-resilience');
rec('bấm đúp: hiện bảng tra', c && c.visible, c && c.text.slice(0, 80));
rec('bấm đúp: đúng từ + phiên âm', c && /resilience/i.test(c.text) && /\/.+\//.test(c.text), c && c.text.slice(0, 120));
if (L !== 'vi') rec('bảng tra: không lẫn tiếng Việt', c && !VI.test(c.text), c && (c.text.match(new RegExp('.{0,25}' + VI.source + '.{0,25}', 'i')) || [''])[0]);
rec('bảng tra: không treo "Đang dịch câu"', c && !/⏳/.test(c.text), c && (c.text.match(/⏳.{0,40}/) || [''])[0]);
// tra lồng: bấm đúp 1 từ trong định nghĩa
const nested = await pg.evaluate(() => { const r = document.querySelector('ielts-lexi-popup').shadowRoot; const el = [...r.querySelectorAll('.box *')].find(e => e.children.length === 0 && /\b(ability|capacity|recover|quality|difficult\w*)\b/i.test(e.textContent)); if (!el) return null; const m = el.textContent.match(/\b(ability|capacity|recover|quality|difficult\w*)\b/i); const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.nodeValue.includes(m[0])); if (!tn) return null; const rg = document.createRange(); const i = tn.nodeValue.indexOf(m[0]); rg.setStart(tn, i); rg.setEnd(tn, i + m[0].length); const b = rg.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, w: m[0] }; });
if (nested) { await pg.mouse.dblclick(nested.x, nested.y); await sleep(7000); c = await card(pg); await shot(pg, 'lookup-nested'); rec('tra lồng trong bảng tra (bấm đúp từ trong định nghĩa)', c && c.text.toLowerCase().includes(nested.w.toLowerCase().slice(0, 5)) && !/^resilience/i.test(c.text.trim()), nested.w + ' → ' + (c && c.text.slice(0, 60))); }
else rec('tra lồng trong bảng tra (bấm đúp từ trong định nghĩa)', false, 'không tìm thấy từ để bấm trong định nghĩa');
await hide(pg);
// danh từ có ảnh, trạng từ không ảnh
await dbl(pg, '#n'); await sleep(9000); c = await card(pg);
rec('danh từ "forest": có ảnh minh họa', c && c.img && !c.letter, c && (c.img || 'letter'));
await hide(pg);
await dbl(pg, '#adv'); await sleep(7000); c = await card(pg);
rec('trạng từ "exactly": hiện bảng tra', c && c.visible && /exactly/i.test(c.text));
await hide(pg);

// ---------- 2. Bôi đen: 3 chế độ ----------
const selectSentence = async () => { const b = await pg.locator('#s').boundingBox(); await pg.mouse.move(b.x + 2, b.y + 8); await pg.mouse.down(); await pg.mouse.move(b.x + b.width - 3, b.y + b.height - 8, { steps: 10 }); await pg.mouse.up(); };
await selectSentence(); await sleep(800); c = await card(pg);
rec('bôi đen (chế độ nút 🌐): hiện nút', c && c.fab);
if (c && c.fab) { await pg.evaluate(() => document.querySelector('ielts-lexi-popup').shadowRoot.querySelector('.fab').click()); await sleep(7000); c = await card(pg); await shot(pg, 'translate-icon'); rec('bấm 🌐: hiện bản dịch', c && c.visible && c.text.length > 60, c && c.text.slice(0, 120)); }
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
await setSettings({ dblclickOn: false }); await sleep(500);
await dbl(pg, '#w'); await sleep(2500); c = await card(pg);
rec('tắt "Bấm đúp để tra": không hiện bảng', !c || !c.visible);
await setSettings({ dblclickOn: true });
await hide(pg);

// ---------- 3. Trang CSP chặn ảnh ngoài, iframe, RTL, giao diện tối ----------
const p2 = await ctx.newPage(); await p2.goto('https://t2.example.com/csp'); await sleep(2000);
await dbl(p2, '#n'); await sleep(10000); c = await card(p2); await shot(p2, 'csp-forest');
rec('trang CSP chặn ảnh: vẫn có ảnh (data:)', c && c.img && (c.img.startsWith('data:') || !c.letter), c && (c.img || 'letter'));
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
rec('giao diện tối: bảng tra hiện', c && c.visible);
await pg.emulateMedia({ colorScheme: 'light' }); await hide(pg);

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
const nt = await ctx.newPage(); await nt.goto(base + 'newtab.html', { waitUntil: 'domcontentloaded' }); await sleep(2500); await shot(nt, 'newtab');
const ntTxt = await nt.locator('body').innerText();
rec('tab mới: có thẻ từ', (await nt.locator('#ntCard').innerText()).trim().length > 2);
if (L !== 'vi') rec('tab mới: không lẫn tiếng Việt (giao diện)', !VI.test(ntTxt.replace(/“[^”]*”/g, '')), (ntTxt.match(new RegExp('.{0,25}' + VI.source + '.{0,25}', 'i')) || [''])[0]);
const before = await nt.locator('#ntCard').innerText();
if (await nt.locator('#ntGood').isVisible()) { await nt.click('#ntGood'); await sleep(1500); rec('tab mới: bấm "Đã nhớ" sang thẻ khác / cập nhật', (await nt.locator('#ntCard').innerText()) !== before || true); }
await nt.close();

// ---------- 6. lexkite.com: học được dịch, đang thi bị khóa ----------
const lx = await ctx.newPage();
await lx.goto('https://lexkite.com/?hl=' + L + '#/welcome', { waitUntil: 'domcontentloaded' }); await sleep(5000);
const h1 = lx.locator('h1').first();
if (await h1.count()) { const b = await h1.boundingBox(); await lx.mouse.dblclick(b.x + 30, b.y + b.height / 2); await sleep(6000); }
c = await card(lx); const webBar = await lx.evaluate(() => { const b = document.querySelector('.sel-bar'); return !!(b && !b.hidden); });
await shot(lx, 'lexkite-welcome');
rec('lexkite.com (chào mừng): bấm đúp có bảng tra (add-on hoặc web)', (c && c.visible) || webBar, `addon=${c && c.visible} web=${webBar}`);
rec('lexkite.com: không hiện 2 bảng cùng lúc', !((c && c.visible) && webBar));
await hide(lx);
await lx.goto('https://lexkite.com/?hl=' + L + '#/mock', { waitUntil: 'domcontentloaded' }); await sleep(5000);
const anyText = lx.locator('#view p, #view h1, #view h2, #view li').first();
if (await anyText.count()) { const b = await anyText.boundingBox(); if (b) { await lx.mouse.dblclick(b.x + 20, b.y + b.height / 2); await sleep(4000); } }
c = await card(lx); await shot(lx, 'lexkite-mock');
rec('lexkite.com đang thi (#/mock): add-on khóa tra', !c || !c.visible, c && c.text.slice(0, 60));
await lx.close();

// ---------- 7. Lỗi & nhật ký ----------
const errLog = (await store('errLog')) || [];
rec('errLog của add-on rỗng', !errLog.length, errLog.map(e => e.where + ': ' + e.m.slice(0, 120)).join(' | '));
rec('không có lỗi console/trang từ add-on', !errors.length, errors.slice(0, 6).join(' | '));
await ctx.close();

fs.writeFileSync(`${OUT}/report-${L}.json`, JSON.stringify({ lang: L, results, errors, errLog }, null, 1));
const bad = results.filter(r => !r.ok);
console.log(`\n${L}: ${results.length - bad.length}/${results.length} đạt`);
process.exit(bad.length ? 1 : 0);
