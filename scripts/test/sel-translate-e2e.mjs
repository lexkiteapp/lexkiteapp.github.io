// E2E (Playwright, CI sel-translate-e2e.yml) bảng bôi đen → "Dịch" – lỗi chủ báo 01/11 (trang từ "promotion", mục VÍ DỤ):
//   bảng "⏳ Đang dịch “…”…" treo rất lâu và che mất ĐỊNH NGHĨA phía trên.
// Không mạng thật: Google gtx / MyMemory bị chặn hoặc làm chậm từng nguồn bằng page.route; kho dịch sẵn phục vụ từ web/packs/tr (máy chủ tĩnh của job).
//   node scripts/test/sel-translate-e2e.mjs <base-url> <thư mục ra> <before|after> [--gate]
//   --gate: đo & chặn – câu có sẵn p95 ≤ 300 ms, câu tự do p95 ≤ 2,5 s, mọi nguồn chặn → "Thử lại" ≤ 3 s, bảng không che định nghĩa,
//           không tràn ngang 390/1280, sáng/tối, Esc/bấm ngoài đóng bảng, không lỗi JS. Không --gate: chỉ chụp ảnh (bản "trước").
import { chromium } from 'playwright';
import fs from 'node:fs';
const [BASE, OUT, TAG] = process.argv.slice(2), GATE = process.argv.includes('--gate');
fs.mkdirSync(OUT, { recursive: true });
const STILL = '*,*::before,*::after{animation:none!important;transition:none!important}#toast,body>canvas{display:none!important}';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) fails++; console.log(c ? '✓' : '✗', m); };
const p95 = a => { const s = [...a].sort((x, y) => x - y); return s[Math.ceil(s.length * 0.95) - 1]; };
const FREE = ['My neighbour quietly repaired the old bicycle yesterday.', 'The museum will reopen after the long winter break.', 'She forgot her umbrella at the busy train station.', 'Our team finally solved the tricky puzzle together.', 'Fresh bread smells wonderful early in the morning.'];
const browser = await chromium.launch();

// Mạng giả cho từng nguồn: { gtx: ms | 'block', mm: ms | 'block' }
async function net(ctx, cfg) {
  for (const u of ['**/translate.googleapis.com/**', '**/api/dictlookup?src=gtx*', '**/api.mymemory.translated.net/**']) await ctx.unroute(u).catch(() => {});
  const fake = (kind) => async route => {
    const c = cfg[kind]; if (c === 'block') return route.abort('connectionfailed');
    await new Promise(r => setTimeout(r, typeof c === 'function' ? c() : c || 0));
    const q = new URL(route.request().url()).searchParams.get('q') || '', tr = `[${kind}] ${q.split(' ').reverse().join(' ')}`;
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(kind === 'gtx' ? { sentences: [{ trans: tr }], src: 'en' } : { responseData: { translatedText: tr } }) }).catch(() => {});
  };
  await ctx.route('**/translate.googleapis.com/**', fake('gtx'));
  await ctx.route('**/api/dictlookup?src=gtx*', fake('gtx')); // web/app gọi Google qua proxy /api/dictlookup (#379)
  await ctx.route('**/api.mymemory.translated.net/**', fake('mm'));
}

async function open(vp, scheme, lang = 'vi') {
  const ctx = await browser.newContext({ viewport: vp, isMobile: vp.width < 600, hasTouch: vp.width < 600, locale: lang, colorScheme: scheme, reducedMotion: 'reduce' });
  await net(ctx, { gtx: 'block', mm: 'block' });
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(`  [console ${m.type()}] ${m.text().slice(0, 200)}`); });
  await ctx.addInitScript(() => { window.__errs = []; addEventListener('unhandledrejection', e => window.__errs.push('UR ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason).slice(0, 300))); });
  await page.goto(`${BASE}/app/?sandbox=1&hl=${lang}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {});
  for (let i = 0; i < 8 && !(await page.$('#go')) && (await page.$('#obNext')); i++) { await page.click('#obNext').catch(() => {}); await page.waitForTimeout(150); }
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1200); }
  await page.evaluate(() => { try { localStorage.setItem('vb.learnLang', 'vi'); } catch (e) { /* */ } location.hash = '#/dict/promotion'; });
  await page.waitForSelector('.example-box', { timeout: 20000 }).catch(() => {});
  await page.addStyleTag({ content: STILL });
  return { ctx, page, errs };
}
// Bôi đen câu ví dụ (hoặc một đoạn tự do chèn vào trang) rồi bấm 🌐 Dịch; trả mốc thời gian bấm
async function selectAndTranslate(page, free) {
  await page.keyboard.press('Escape');
  const okSel = await page.evaluate(free => {
    const box = document.querySelector('.example-box'); if (!box) return false;
    let target = box;
    if (free) { let p = document.getElementById('e2eFree'); if (!p) { p = document.createElement('p'); p.id = 'e2eFree'; box.after(p); } p.textContent = free; target = p; }
    const r = document.createRange();
    if (free) r.selectNodeContents(target); else { const lab = box.firstElementChild, btn = box.querySelector('button'); r.setStartAfter(lab); r.setEndBefore(btn); }
    target.scrollIntoView({ block: 'center' });
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); return true;
  }, free || '');
  if (!okSel) return null;
  const b = await page.waitForSelector('.sel-bar:not([hidden]) [data-act=tr]', { timeout: 3000 }).catch(() => null); if (!b) return null;
  await page.waitForTimeout(120); // thanh nút vừa hiện (app nạp sẵn mảnh kho ở đây)
  return page.evaluate(() => { const t0 = performance.now(); window.__trT0 = t0; document.querySelector('.sel-bar [data-act=tr]').click(); return t0; });
}
// Thời gian (ms) từ lúc bấm tới khi bảng có CHỮ DỊCH thật (không còn khung tạm) – hoặc tới khi hiện "Thử lại"
const waitResult = (page, ms = 6000) => page.evaluate(ms => new Promise(res => {
  const t0 = window.__trT0, end = t0 + ms;
  const tick = () => { const p = document.querySelector('.sel-pop'), box = p && !p.hidden && p.querySelector('[data-tr]');
    if (box && !box.hasAttribute('data-busy')) return res({ ms: performance.now() - t0, retry: !!box.querySelector('[data-retry]'), text: box.textContent.trim().slice(0, 120) });
    if (performance.now() > end) return res({ ms: Infinity, retry: false, text: p ? p.textContent.trim().slice(0, 120) : '' });
    requestAnimationFrame(tick); };
  tick();
}), ms);
const firstPaint = page => page.evaluate(() => { const p = document.querySelector('.sel-pop'); return !!(p && !p.hidden && (p.querySelector('[data-busy]') || p.querySelector('[data-tr]'))); });
const geom = page => page.evaluate(() => {
  const p = document.querySelector('.sel-pop'), pr = p.getBoundingClientRect(), vw = document.documentElement.clientWidth;
  const def = [...document.querySelectorAll('#view *')].find(e => e.children.length === 0 && /a move to a more important job/i.test(e.textContent)) || null, dr = def && def.getBoundingClientRect();
  const sel = getSelection().rangeCount ? getSelection().getRangeAt(0).getBoundingClientRect() : null;
  const hit = (a, b) => a && b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  return { pop: [pr.left, pr.top, pr.right, pr.bottom].map(Math.round), defR: dr ? [dr.top, dr.bottom].map(Math.round) : null, defTag: def ? def.tagName + '.' + def.className + '@' + (def.closest('[id]') || {}).id : null, selR: sel ? [sel.top, sel.bottom, sel.width].map(Math.round) : null, vw, sw: document.documentElement.scrollWidth, defFound: !!def, coversDef: hit(pr, dr), coversSel: hit(pr, sel), defAbove: !!(dr && sel && dr.bottom <= sel.top) };
});

const matrix = [[{ width: 390, height: 844 }, 'light'], [{ width: 390, height: 844 }, 'dark'], [{ width: 1280, height: 800 }, 'light'], [{ width: 1280, height: 800 }, 'dark']];
for (const [vp, scheme] of matrix) {
  const tag = `${vp.width}-${scheme}`, { ctx, page, errs } = await open(vp, scheme);
  if (!(await page.$('.example-box'))) { ok(false, `[${tag}] mở được trang từ promotion (${(await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').slice(0, 160)})`); await ctx.close(); continue; }
  // Ảnh chính (trước/sau): mạng Google chậm 6 s (như máy chủ của chủ), chụp sau 1,2 s – bản cũ còn "⏳ Đang dịch", bản mới đã có bản dịch dịch sẵn
  await net(ctx, { gtx: 6000, mm: 6000 });
  await selectAndTranslate(page); await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${TAG}-${tag}.png` });
  if (!GATE) { await ctx.close(); continue; }
  // Chẩn đoán khi bảng còn kẹt khung tạm: từng bước của đường dịch (tải tr-fast.js, kho, App.need) có thời gian riêng
  if (await page.evaluate(() => !!document.querySelector('.sel-pop [data-busy]'))) console.log('  chẩn đoán:', JSON.stringify(await page.evaluate(async () => {
    const T = ms => new Promise(r => setTimeout(() => r('TIMEOUT'), ms)), t = async (name, p) => { const t0 = performance.now(); try { const v = await Promise.race([p, T(5000)]); return name + '=' + JSON.stringify(v && v.text !== undefined ? { text: String(v.text).slice(0, 40), src: v.src } : v).slice(0, 80) + ' ' + Math.round(performance.now() - t0) + 'ms'; } catch (e) { return name + ' THROW ' + e.message; } };
    return [typeof TrFast, typeof App.trFast, await t('trFast', App.trFast('Hard work does not always guarantee promotion', 'vi')), await t('get', window.TrFast ? TrFast.get('Hard work does not always guarantee promotion', 'vi') : null), typeof VBStruct, I18N.learnLang(), (window.__errs || []).join('|')];
  })), errs.join(' | '));
  const g0 = await geom(page);
  ok(g0.defFound && g0.defAbove, `[${tag}] định nghĩa nằm trên câu ví dụ (bố cục trang từ)${g0.defFound && g0.defAbove ? '' : ' – đo: ' + JSON.stringify({ def: g0.defR, defTag: g0.defTag, sel: g0.selR, pop: g0.pop })}`);
  ok(!g0.coversDef, `[${tag}] bảng KHÔNG che định nghĩa (bảng ${g0.pop})`);
  ok(!g0.coversSel, `[${tag}] bảng không che câu đang chọn`);
  ok(g0.pop[0] >= 7.5 && g0.pop[2] <= g0.vw - 7.5 && g0.sw <= g0.vw, `[${tag}] không tràn ngang (bảng ${g0.pop[0]}–${g0.pop[2]} / ${g0.vw}, trang ${g0.sw})`);
  const contrast = await page.evaluate(() => { const p = document.querySelector('.sel-pop'), cs = getComputedStyle(p); return [cs.color, cs.backgroundColor]; });
  ok(contrast[0] !== contrast[1], `[${tag}] chữ/nền bảng khác màu (${contrast.join(' / ')})`);
  if (vp.width === 390 && scheme === 'light') {
    // (a) Câu có sẵn (kho dịch sẵn) – 20 lượt, bộ nhớ phiên xóa mỗi lượt; mạng dịch bị chặn hẳn để chắc không gọi mạng
    await net(ctx, { gtx: 'block', mm: 'block' });
    const T = [];
    for (let i = 0; i < 20; i++) { await page.evaluate(() => window.TrFast && TrFast._mem.clear()); if (await selectAndTranslate(page) == null) break; const r = await waitResult(page, 3000); T.push(r.ms); if (i === 0) ok(!r.retry && r.text.length > 5, `câu có sẵn → bản dịch sẵn: "${r.text.slice(0, 60)}"`); }
    ok(T.length === 20 && p95(T) <= 300, `câu có sẵn: p95 tới chữ dịch ${Math.round(p95(T))} ms ≤ 300 ms (${T.length} lượt)`);
    // (b) Câu tự do – từng nguồn chậm/chặn; p95 ≤ 2,5 s
    const F = [], cases = [['gtx 0,2–2 s, MyMemory chặn', { gtx: () => 200 + Math.random() * 1800, mm: 'block' }], ['gtx chặn, MyMemory 0,1–1,2 s', { gtx: 'block', mm: () => 100 + Math.random() * 1100 }], ['gtx 5 s, MyMemory 0,5 s', { gtx: 5000, mm: 500 }]];
    for (const [ci, [name, cfg]] of cases.entries()) { await net(ctx, cfg); for (const s of FREE) {
      await page.evaluate(() => window.TrFast && TrFast._mem.clear());
      const t0 = await selectAndTranslate(page, s + ' Case ' + 'abc'[ci]); // đuôi ASCII: câu có chữ Việt bị app bỏ qua (không phải câu tiếng Anh) if (t0 == null) { F.push(Infinity); ok(false, `[${name}] thanh nút Dịch không hiện`); continue; }
      const painted = await firstPaint(page), r = await waitResult(page, 6000); F.push(r.ms);
      if (s === FREE[0]) { ok(painted, `[${name}] khung tạm hiện ngay khi bấm`); ok(!r.retry && /\[(gtx|mm)\]/.test(r.text), `[${name}] có bản dịch (${Math.round(r.ms)} ms): ${r.text.slice(0, 50)}`); }
    } }
    ok(p95(F) <= 2500, `câu tự do: p95 tới chữ dịch ${Math.round(p95(F))} ms ≤ 2500 ms (${F.length} lượt)`);
    // (c) Mọi nguồn chặn → "Thử lại" rõ ràng, không treo; (d) chậm hơn ngân sách → "Thử lại" rồi bản muộn tự thay
    await net(ctx, { gtx: 'block', mm: 'block' });
    await selectAndTranslate(page, FREE[1] + ' blocked'); let r = await waitResult(page, 4000);
    ok(r.retry && r.ms <= 3000, `mọi nguồn chặn → nghĩa từng từ + Thử lại sau ${Math.round(r.ms)} ms (≤ 3 s), không treo`);
    await net(ctx, { gtx: 3500, mm: 'block' });
    await page.evaluate(() => TrFast._mem.clear()); await selectAndTranslate(page, FREE[2] + ' late'); r = await waitResult(page, 4000);
    ok(r.retry && r.ms <= 3000, `gtx 3,5 s > ngân sách → Thử lại đúng hạn (${Math.round(r.ms)} ms)`);
    const late = await page.waitForFunction(() => { const b = document.querySelector('.sel-pop [data-tr]'); return b && /\[gtx\]/.test(b.textContent) && !b.querySelector('[data-retry]'); }, null, { timeout: 4000 }).then(() => true, () => false);
    ok(late, 'bản dịch đến muộn tự thay "Thử lại"');
    await page.screenshot({ path: `${OUT}/${TAG}-${tag}-late.png` });
    // (e) Đóng: Esc · bấm ra ngoài
    await page.keyboard.press('Escape'); ok(await page.evaluate(() => document.querySelector('.sel-pop').hidden), 'Esc → đóng bảng');
    await net(ctx, { gtx: 4000, mm: 'block' }); await selectAndTranslate(page, FREE[3] + ' outside');
    { const b = await page.evaluate(() => { const d = [...document.querySelectorAll('#view *')].find(e => e.children.length === 0 && /a move to a more important job/i.test(e.textContent)); const r = (d || document.querySelector('#view')).getBoundingClientRect(); return [r.left + 4, r.top + r.height / 2]; }); await page.mouse.click(b[0], b[1]); } // chỗ trống trong trang (định nghĩa), không trúng thanh tab/liên kết
    await page.waitForTimeout(150);
    ok(await page.evaluate(() => document.querySelector('.sel-pop').hidden), 'bấm ra ngoài → đóng bảng');
    // (f) Câu sát mép dưới màn hình → bảng tự lật lên, vẫn trong khung
    await page.evaluate(() => { const b = document.querySelector('.example-box'); b.scrollIntoView({ block: 'end' }); window.scrollBy(0, 0); });
    await net(ctx, { gtx: 'block', mm: 'block' });
    await page.evaluate(() => { const box = document.querySelector('.example-box'), r = document.createRange(); r.setStartAfter(box.firstElementChild); r.setEndBefore(box.querySelector('button')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })); });
    await page.waitForSelector('.sel-bar:not([hidden]) [data-act=tr]', { timeout: 3000 }).catch(() => {}); await page.click('.sel-bar [data-act=tr]').catch(() => {}); await page.waitForTimeout(400);
    const g1 = await geom(page); ok(!g1.coversSel && g1.pop[1] >= 7.5 && g1.pop[3] <= vp.height - 7.5, `sát mép dưới → bảng lật lên/thu gọn, không che câu, trong khung (${g1.pop})`);
  }
  ok(!errs.length, `[${tag}] không lỗi JS: ${errs.slice(0, 2).join(' | ')}`);
  await ctx.close();
}
await browser.close();
const shots = fs.readdirSync(OUT).filter(f => f.startsWith(TAG)).length;
console.log(`ảnh ${TAG}: ${shots}`); if (!shots) process.exit(1);
if (GATE) { console.log(fails ? `✗ sel-translate-e2e: ${fails}/${n} lỗi` : `✓ sel-translate-e2e: ${n} kiểm tra đạt`); process.exit(fails ? 1 : 0); }
