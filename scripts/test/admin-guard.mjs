// 🛡️ Gác bố cục MỌI trang quản trị (owner 28/10: "nhiều phần giao diện lỗi chồng chéo" ở #video/overview – biểu đồ phóng to, cột trống, thẻ bị cắt).
// Khung thật web/admin.html + js/admin.js, Firebase giả + /api/* = dữ liệu mẫu (scripts/test/fixtures/admin-fx.mjs) → 0 tài khoản thật, 0 mạng.
// Mọi mục thanh bên + 7 mục con Trung tâm video · 1280/1440/1736/1920 (máy tính) · 820 (máy tính bảng) · 390 (điện thoại) · sáng/tối · VI/EN.
// FAIL khi (lõi chung scripts/lib/layout-scan.mjs): chồng nhau > 4 px, bị cắt/ra ngoài màn hình, chữ tràn nút, chữ SVG phóng/co theo viewBox,
//           tràn ngang trang, nội dung không lấp khung (khoảng trống > 48 px giữa thanh bên và nội dung, hoặc hụt bề rộng).
// Dùng: node scripts/test/admin-guard.mjs [web=web] [out=out/admin-guard] [tag=after]   (tag=before: chỉ chụp ảnh, không fail)
//       node scripts/test/admin-guard.mjs --compare out/admin-guard → sheet-*.jpg (TRƯỚC | SAU, thu nhỏ)   CI: .github/workflows/admin-guard.yml
import fs from 'node:fs'; import path from 'node:path';
import { scan, ADMIN_SEL } from '../lib/layout-scan.mjs';
import { FX, BFX, VFX, VIT, NOW } from './fixtures/admin-fx.mjs';
import { buildRows, readFixture, unitMap } from '../ads/report.mjs';
import { stats, guardOf, revPack } from '../../functions/api/_ads.js';
let pw; try { pw = await import('playwright'); } catch (e) { console.log('admin-guard: playwright chưa cài – bỏ qua'); process.exit(0); }
const browser = await pw.chromium.launch();
const SHOTS = [['video/overview', 1736, 'dark'], ['video/overview', 390, 'light'], ['overview', 1440, 'dark'], ['analytics', 1280, 'light'], ['ads', 1920, 'light'], ['growth', 820, 'dark']];

if (process.argv[2] === '--compare') { // TRƯỚC | SAU cạnh nhau, thu nhỏ để soát nhanh
  const OUT = process.argv[3] || 'out/admin-guard', made = [];
  for (const [r, w, th] of SHOTS) {
    const n = `${r.replace(/\//g, '_')}-${w}-${th}.jpg`, fb = path.join(OUT, 'before-' + n), fa = path.join(OUT, 'after-' + n); if (!fs.existsSync(fb) || !fs.existsSync(fa)) continue;
    const img = f => 'data:image/jpeg;base64,' + fs.readFileSync(f).toString('base64'), cw = Math.min(w, 960);
    const page = await browser.newPage({ viewport: { width: cw * 2 + 48, height: 400 } });
    await page.setContent(`<body style="margin:0;background:#777;font:600 18px system-ui;color:#fff;display:flex;gap:16px;padding:16px;align-items:flex-start">${[['TRƯỚC', fb], ['SAU', fa]].map(([t, f]) => `<figure style="margin:0;width:${cw}px"><figcaption style="padding:0 0 8px">${t} · #${r} · ${w}px ${th}</figcaption><img style="width:100%;display:block" src="${img(f)}"></figure>`).join('')}</body>`);
    await page.waitForTimeout(150); const f = path.join(OUT, 'sheet-' + n); await page.screenshot({ path: f, fullPage: true, type: 'jpeg', quality: 70 }); made.push(f); await page.close();
  }
  await browser.close(); console.log(made.join('\n') || 'không có cặp ảnh'); process.exit(0);
}

const [WEB = 'web', OUT = 'out/admin-guard', TAG = 'after'] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const J = x => JSON.parse(JSON.stringify(x)), iso = d => new Date(NOW + d * 864e5).toISOString().slice(0, 10) + 'T05:00:00Z';
// Ca của owner: dữ liệu thưa – 3 ngày có video (115, 9, 1) trong 30 ngày → trước đây SVG viewBox 76 px kéo rộng = chữ ~90 px, ngày đè "10-210-22"
const VIDEO = { ...VFX, items: [...VFX.items, ...Array.from({ length: 125 }, (_, i) => VIT('s' + i, { created: iso(i < 115 ? -6 : i < 124 ? -5 : -3), title: 'Sparse ' + i }))] };
// Quảng cáo: cùng cách dựng số mẫu như admin-ads-shots.mjs (fixture báo cáo AdSense/AdMob + sự kiện 30 ngày)
const ADS = (() => {
  const today = iso(0).slice(0, 10), sh = (d, n) => new Date(Date.parse(d + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10), { rows } = buildRows(readFixture('scripts/test/fixtures/ads-report'), unitMap());
  const ev = []; for (let i = 1; i <= 30; i++) { const d = sh(today, -i); ev.push({ day: d, kind: 'ad:imp:web:home', n: 900 + i * 7 }, { day: d, kind: 'ad:req:web:home', n: 1000 }, { day: d, kind: 'ad:show:android:inter', n: 120 }, { day: d, kind: 'adc:a:ses', n: 300 }, { day: d, kind: 'adc:a:n1', n: 40 }, { day: d, kind: 'adc:h:n1', n: 40 }, { day: d, kind: 'adc:a:r1', n: 14 }, { day: d, kind: 'adc:h:r1', n: 15 }); }
  const ecpm = { web: 2, android: 6, ios: 6 };
  return { at: NOW, today, ...stats(ev, today, ecpm), guard: guardOf(ev, today, { prev: 1 }), ecpm, real: revPack(rows, { at: NOW, srcs: ['adsense', 'admob'] }, { balance: '$42.17', last: { amount: '$118.40', date: '2026-09-21' } }, ev, ecpm, today, today), reporting: { connected: true } };
})();
const GROW = { events: Array.from({ length: 30 }, (_, i) => ({ day: iso(i - 29).slice(0, 10), install: 3 + (i % 6), uninstall: i % 3 })), daily: Array.from({ length: 14 }, (_, i) => ({ day: iso(i - 13).slice(0, 10), dau: 40 + i * 3, lookup: 120 + i * 9, save: 30 + i, popup: 50, newtab: 12 })) };
// Hạn mức (/api/quota): đủ trường admin-quota.js đọc (nhà cung cấp, top, chặn, cờ, cho phép, tính năng, nhật ký)
const QUOTA = { day: iso(0).slice(0, 10), breaker: 0.8, providers: [{ p: 'gemini', unit: 'req', used: 640, cap: 1000, pct: 64 }, { p: 'cf-ai', unit: 'neurons', used: 2100, cap: 10000, pct: 21 }],
  top: { lookup: [{ id: 'u1', email: 'learner@example.com', n: 42 }, { id: 'ip:ab12', n: 17 }] }, blocks: [{ id: 'ip:ff00', until: NOW + 864e5, reason: 'abuse', by: 'admin@example.com' }],
  flags: [{ id: 'u9', feature: 'explain', strikes: 2, last: NOW }], allow: [{ id: 'u1', note: 'tester', by: 'admin@example.com', at: NOW }],
  features: [{ feature: 'explain', free: 20, anon: 5, store: 'kv', custom: false, ipx: 3, bans: 0 }, { feature: 'tts', free: 50, anon: 10, store: 'kv', custom: true, ipx: 2, bans: 1 }],
  audit: [{ at: NOW, by: 'admin@example.com', op: 'block', target: 'ip:ff00', detail: '24h' }] };
const CONFIGS = [[1280, 'light', 'vi'], [1440, 'dark', 'vi'], [1736, 'dark', 'vi'], [1920, 'light', 'en'], [820, 'dark', 'vi'], [390, 'light', 'en']];
const FB = `window.firebase = { initializeApp() {}, auth: Object.assign(() => window.__AUTH, { GoogleAuthProvider: function () { this.setCustomParameters = () => {}; } }) };
  const U = { uid: 'guard', email: 'admin@example.com', displayName: 'Guard', photoURL: '', getIdToken: async () => 'x' };
  window.__AUTH = { currentUser: U, onAuthStateChanged: cb => setTimeout(() => cb(U), 0), signOut: async () => {}, signInWithPopup: async () => {} };`;
const api = (pathn, b) => {
  if (pathn === '/api/admin-shorts') return b.op === 'list' ? VIDEO : { error: 'needs-token' };
  if (pathn === '/api/admin-prefs') return b.op === 'get' ? { ok: true, pref: { tab: 'overview', lang: 'vi', theme: 'auto', autoLogoutMin: 0, alertTypes: ['js_error'], jsErrorThreshold: 10, quotaThresholdPct: 70 } } : { ok: true, rows: [] };
  if (pathn === '/api/admin') return FX[b.op] || (b.op === 'adsStats' ? ADS : /^(growth|ext)/i.test(b.op) ? GROW : { ok: true, rows: [] });
  if (pathn === '/api/backlinks') return BFX[b.op] || { ok: true };
  if (pathn === '/api/drive') return { alerts: [] };
  if (pathn === '/api/quota') return b.op === 'state' ? QUOTA : { day: QUOTA.day, jobs: [], runs: [], leases: [], budget: {} };
  return { ok: true, rows: [] };
};
const found = {}, errs = [], add = (k, v) => { (found[k] ||= []).push(v); };
for (const [width, scheme, lang] of CONFIGS) {
  const vp = width < 768 ? { viewport: { width, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width, height: 900 } };
  const ctx = await browser.newContext({ ...vp, colorScheme: scheme, serviceWorkers: 'block' });
  await ctx.addInitScript(([l, th]) => { try { localStorage.setItem('lk.admLang', l); localStorage.setItem('lk.admTheme', th); } catch (e) { /* bỏ qua */ } }, [lang, scheme]);
  await ctx.route('**/*', r => {
    const req = r.request(), u = new URL(req.url());
    if (u.hostname === 'www.gstatic.com' && /firebase-app-compat/.test(u.pathname)) return r.fulfill({ contentType: 'text/javascript', body: FB });
    if (u.hostname === 'www.gstatic.com') return r.fulfill({ contentType: 'text/javascript', body: '' });
    if (u.hostname !== 'lk.test') return r.abort();
    if (u.pathname.startsWith('/api/')) { let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (e) { /* bỏ qua */ } return r.fulfill({ contentType: 'application/json', body: JSON.stringify(J(api(u.pathname, b))) }); }
    const f = path.join(WEB, decodeURIComponent(u.pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' });
  });
  const page = await ctx.newPage(), tag = `${width}-${scheme}-${lang}`;
  let cur = 'overview'; page.on('pageerror', e => errs.push(`${tag} #${cur}: ${e.message}`));
  await page.goto('https://lk.test/admin.html#overview', { waitUntil: 'load' });
  await page.waitForSelector('body.adm-in #tabs a[data-tab]', { state: 'attached', timeout: 15000 }); await page.waitForTimeout(800);
  const tabs = await page.$$eval('#tabs a[data-tab]', a => a.map(x => x.dataset.tab));
  const routes = [...tabs, ...['overview', 'review', 'library', 'qc', 'scripts', 'channels', 'archive'].map(s => 'video/' + s)];
  for (const r of routes) {
    cur = r;
    await page.evaluate(h => { location.hash = h; }, r); await page.waitForTimeout(r.startsWith('video/') ? 900 : 700);
    await page.waitForFunction(() => !document.querySelector('#main [aria-busy="true"], #main .sk'), null, { timeout: 5000 }).catch(() => {});
    const res = await page.evaluate(scan, { root: '.adm-content', sel: ADMIN_SEL, okScroll: '.tbl-x, .cl-vp, .vx-nav' }).catch(e => ({ err: [e.message] }));
    // khung: tràn ngang trang, nội dung lấp khung (không cột trống giữa thanh bên và nội dung)
    res.shell = await page.evaluate(() => {
      const o = [], over = document.scrollingElement.scrollWidth - innerWidth;
      if (over > 1) { const sc = e => { for (let p = e.parentElement; p; p = p.parentElement) if (/auto|scroll|hidden|clip/.test(getComputedStyle(p).overflowX) && p.getBoundingClientRect().right <= innerWidth + 1) return true; return false; };
        const who = [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !sc(e)).slice(-3).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 2).join('.') + ' "' + (e.textContent || '').trim().slice(0, 20) + '"');
        o.push(`trang tràn ngang ${over} px (${who.join(', ')})`); }
      const side = document.querySelector('#side'), main = document.querySelector('#main'), cont = document.querySelector('.adm-content');
      if (innerWidth > 900 && side && !side.hidden) {
        const sr = side.getBoundingClientRect(), mr = main.getBoundingClientRect(), cr = cont.getBoundingClientRect(), pad = parseFloat(getComputedStyle(cont).paddingLeft) + parseFloat(getComputedStyle(cont).paddingRight);
        if (mr.left - sr.right > 48) o.push(`khoảng trống ${Math.round(mr.left - sr.right)} px giữa thanh bên và nội dung`);
        if (mr.width < Math.min(1600, cr.width - pad) - 2) o.push(`nội dung chỉ rộng ${Math.round(mr.width)}/${Math.round(cr.width - pad)} px`);
      }
      return o;
    });
    let bad = false; for (const [k, v] of Object.entries(res)) if (v.length) { bad = true; add(k, `${tag} #${r}: ${v.join(' | ')}`); }
    const sh = SHOTS.find(([sr, w, th]) => sr === r && w === width && th === scheme);
    if (sh) await page.screenshot({ path: path.join(OUT, `${TAG}-${r.replace(/\//g, '_')}-${width}-${scheme}.jpg`), type: 'jpeg', quality: 70, fullPage: true });
    else if (bad && TAG !== 'before') await page.screenshot({ path: path.join(OUT, `fail-${tag}-${r.replace(/\//g, '_')}.jpg`), type: 'jpeg', quality: 55, fullPage: true });
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, TAG + '.json'), JSON.stringify({ found, errs }, null, 1));
for (const [k, v] of Object.entries(found)) { console.log(`\n✗ ${k}: ${v.length}`); for (const x of v.slice(0, 60)) console.log('  ' + x); }
console.log(`\nlỗi JS (chỉ báo): ${errs.length}`, JSON.stringify(errs.slice(0, 8)));
if (TAG === 'before') process.exit(0);
if (Object.keys(found).length) process.exit(1);
console.log(`✓ admin-guard: mọi trang quản trị × ${CONFIGS.length} cấu hình – không chồng lấn, không cắt, không tràn, biểu đồ đúng cỡ chữ, nội dung lấp khung`);
