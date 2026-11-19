// Chụp MỌI màn chính (trừ luồng bài học) để soát giao diện bằng mắt: 375 & 1440 × sáng/tối × en. Chạy trên CI (ui-audit-shots.yml).
// Dùng: node scripts/test/ui-audit-shots.mjs <base> <out> [vi|en]  → <out>/sheets/*.jpg (tờ ghép 6 màn/tờ), <out>/metrics.json (cao trang, nút chính có thấy không cuộn, vùng chạm <44, lỗi JS)
import { chromium } from 'playwright';
import { noProd } from './lib/no-prod.mjs';
import fs from 'fs';
const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, '');
const OUT = process.argv[3] || 'uiaudit-out', LANG = process.argv[4] || 'en';
fs.mkdirSync(OUT + '/shots', { recursive: true }); fs.mkdirSync(OUT + '/sheets', { recursive: true });
const ROUTES = ['welcome/setup', 'home', 'vocab', 'skills', 'tests', 'me', 'path', 'day/1', 'review', 'practice', 'dict/hello', 'dict/zzqxv', 'deck', 'library', 'grammar', 'grammar/ed-s-endings', 'courses', 'course', 'speaking', 'call', 'roleplay', 'say', 'speak', 'pron', 'listening', 'dictation', 'reading', 'write', 'paraphrase', 'cbt', 'qstats', 'quick', 'stats', 'streak', 'league', 'goal', 'settings', 'mistakes', 'toeic', 'toefl', 'resources', 'placement', 'contact', 'zzz-not-found'];
const STATES = [['home', 'toast'], ['home', 'modal'], ['me', 'signed']];
const VPS = { m: { width: 375, height: 812, isMobile: true, hasTouch: true }, d: { width: 1440, height: 900 } };
const metrics = [], shots = [];
const still = '*,*::before,*::after{animation:none!important;transition:none!important}';
const safe = s => s.replace(/[^a-z0-9]+/gi, '_');
async function measure(page) {
  return page.evaluate(() => {
    const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden' && +cs.opacity > 0 ? r : null; };
    const H = innerHeight, prim = [...document.querySelectorAll('#view .btn.primary, #view .btn.pri, #view button.primary, #view .cta')].filter(vis);
    const first = prim[0], r = first && first.getBoundingClientRect();
    const small = [...document.querySelectorAll('button,a[href],[role=button]')].filter(e => vis(e) && !e.closest('[aria-hidden=true]')).filter(e => { const q = e.getBoundingClientRect(); return Math.min(q.width, q.height) < 44 && q.top < H; }).length;
    const v = document.getElementById('view'), vr = v && v.getBoundingClientRect();
    return { docH: document.documentElement.scrollHeight, vh: H, primary: prim.length, primaryInFold: first ? r.bottom <= H : null, small44: small, contentW: vr ? Math.round(vr.width) : null, empty: v ? v.innerText.trim().length < 20 : true, text: v ? v.innerText.replace(/\s+/g, ' ').trim().slice(0, 140) : '' };
  }).catch(() => ({}));
}
const browser = await chromium.launch();
for (const [vn, vp] of Object.entries(VPS)) for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, colorScheme: scheme, locale: LANG, reducedMotion: 'reduce' });
  await noProd(ctx);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 100)));
  await page.goto(`${BASE}/app/?sandbox=1&hl=${LANG}#/welcome/setup`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForSelector('#obNext, #go', { timeout: 8000 }).catch(() => {});
  // chụp từng bước Welcome rồi hoàn tất
  for (let i = 0; i < 8; i++) {
    const f = `${OUT}/shots/${vn}-${scheme}-welcome_step${i}.jpg`; await page.addStyleTag({ content: still }).catch(() => {});
    await page.screenshot({ path: f, type: 'jpeg', quality: 70 }).catch(() => {}); shots.push({ vn, scheme, name: 'welcome step ' + i, f });
    // chữ bị nút dính (CTA) che khi đã cuộn tới đáy: mỗi bước Welcome không được có chữ bị che
    const cov = await page.evaluate(() => { scrollTo(0, 1e6); const out = []; for (const e of document.querySelectorAll('body *')) { if (![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 3)) continue; const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.bottom < 0 || r.top > innerHeight) continue; const x = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 2), y = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 2), t = document.elementFromPoint(x, y); if (t && !e.contains(t) && !t.contains(e) && !/toast|sandbox/i.test(t.className + ' ' + (t.closest('[class*=toast]') ? 'toast' : ''))) out.push((e.textContent || '').trim().slice(0, 40) + ' ← ' + t.tagName.toLowerCase() + '.' + String(t.className).slice(0, 30)); } scrollTo(0, 0); return out; }).catch(() => []);
    if (cov.length) metrics.push({ vn, scheme, route: 'welcome step ' + i, covered: cov.slice(0, 5) });
    if ((await page.$('#go')) || !(await page.$('#obNext'))) break; await page.click('#obNext').catch(() => {}); await page.waitForTimeout(200);
  }
  const go = await page.$('#go'); if (go) { await go.click().catch(() => {}); await page.waitForTimeout(1800); }
  const list = [...ROUTES.slice(1).map(r => [r, null]), ...STATES];
  for (const [r, st] of list) {
    errs.length = 0;
    try {
      await page.keyboard.press('Shift').catch(() => {});
      await page.evaluate(h => { location.hash = h; scrollTo(0, 0); }, '#/' + r); await page.waitForTimeout(1100);
      await page.addStyleTag({ content: still }).catch(() => {});
      if (st) await page.evaluate(async k => { const U = window.UI || {}; if (k === 'toast' && U.toast) U.toast('Saved to your deck — a longer notification text to check wrapping', 15000); if (k === 'modal' && U.modal) U.modal('<h3>Locked day</h3><p>Complete the previous day first to unlock this day.</p><button class="btn primary">OK</button>'); if (k === 'signed' && window.Sync) { window.Sync.user = window.Sync.user || { uid: 'ua', displayName: 'Audit Learner', email: 'audit@example.com' }; const h = location.hash; location.hash = '#/home'; await new Promise(q => setTimeout(q, 300)); location.hash = h; await new Promise(q => setTimeout(q, 1000)); } }, st).catch(() => {});
      if (st) await page.waitForTimeout(600);
      const name = r + (st ? '+' + st : ''), f = `${OUT}/shots/${vn}-${scheme}-${safe(name)}.jpg`;
      await page.screenshot({ path: f, type: 'jpeg', quality: 70 }); shots.push({ vn, scheme, name, f });
      metrics.push({ vn, scheme, route: name, ...(await measure(page)), errs: [...errs] });
    } catch (e) { metrics.push({ vn, scheme, route: r, fail: String(e.message).slice(0, 80) }); }
  }
  await ctx.close();
}
fs.writeFileSync(OUT + '/metrics.json', JSON.stringify(metrics, null, 1));
// tờ ghép: 6 màn/tờ (mobile 6 cột, desktop 3 cột), có nhãn
const sheetCtx = await browser.newContext({ viewport: { width: 1500, height: 900 } }); const sp = await sheetCtx.newPage();
let n = 0;
for (const vn of ['m', 'd']) for (const scheme of ['light', 'dark']) {
  const arr = shots.filter(s => s.vn === vn && s.scheme === scheme), per = vn === 'm' ? 6 : 6;
  for (let i = 0; i < arr.length; i += per) {
    const chunk = arr.slice(i, i + per);
    const html = `<body style="margin:0;background:#888;font:14px sans-serif"><div style="display:grid;grid-template-columns:repeat(${vn === 'm' ? 6 : 3},1fr);gap:6px;padding:6px">${chunk.map(s => `<figure style="margin:0;background:#fff"><figcaption style="background:#000;color:#fff;padding:2px 4px">${s.name}</figcaption><img style="width:100%;display:block" src="data:image/jpeg;base64,${fs.readFileSync(s.f).toString('base64')}"></figure>`).join('')}</div>`;
    await sp.setContent(html); await sp.screenshot({ path: `${OUT}/sheets/${vn}-${scheme}-${String(++n).padStart(2, '0')}.jpg`, type: 'jpeg', quality: 72, fullPage: true });
  }
}
await browser.close();
console.log('✓', shots.length, 'ảnh,', metrics.length, 'dòng số liệu');
