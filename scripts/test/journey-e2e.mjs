// 🧭 journey-e2e: hành trình người dùng THẬT, đầu-cuối (Playwright) trên dist phục vụ cục bộ – docs/JOURNEY-E2E.md
// Mỗi hành trình × ngôn ngữ (vi/en/ar) × thiết bị (máy tính/điện thoại) kiểm thêm: 0 lỗi console/promise, không lớp nổi chồng nhau
// (hỏi nhắc học × màn "Tiếp theo" × toast × popover "Xem thêm"), không hỏi 2 lần, focus đúng, trạng thái còn sau tải lại, chạy tiếp khi mất mạng.
// Hermetic: mọi /api/* = giả lập trong tiến trình (đồng bộ, lớp học, cấu hình cờ TẮT), mọi host ngoài = rỗng → 0 lượt chạm prod, 0 tài khoản thật.
// Dùng: node scripts/test/journey-e2e.mjs --root dist [--lang vi,en,ar] [--device desktop,mobile] [--only 1,2,3] [--out je-out] [--ext]
//   --ext: chạy thêm hành trình 7 (add-on, cần bash scripts/build-extension.sh trước).
import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { serve } from '../quality/serve.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', 'dist')), OUT = path.resolve(arg('out', 'je-out'));
const LANGS = arg('lang', 'vi,en,ar').split(','), DEVS = arg('device', 'desktop,mobile').split(',');
const ONLY = arg('only', '1,2,3,4,5,6').split(',').map(Number), EXT = process.argv.includes('--ext');
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT + '/shots', { recursive: true });
const CHECKS = fs.readFileSync(new URL('./journey-e2e/checks.js', import.meta.url), 'utf8');
const VP = { desktop: { viewport: { width: 1280, height: 820 } }, mobile: { ...devices['Pixel 7'] } };
const LOCALE = { vi: 'vi-VN', en: 'en-US', ar: 'ar-SA' };
const results = [];
const srv = await serve(ROOT, 0), O = srv.origin;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

// ---------- máy chủ API giả lập (mỗi hành trình 1 trạng thái) ----------
function mockApi(st) {
  return (url, body) => {
    const p = url.pathname, j = (() => { try { return JSON.parse(body || '{}'); } catch { return {}; } })();
    if (p === '/api/config') return st.config || {};
    if (p === '/api/sync') {
      const D = st.sync || (st.sync = { docs: {}, push: 0, pull: 0 });
      if (j.op === 'pull') { D.pull++; const docs = {}; for (const [k, d] of Object.entries(D.docs)) if ((j.have || {})[k] !== d.h) docs[k] = JSON.parse(d.body); return { docs }; }
      if (j.op === 'push') { D.push++; for (const [k, d] of Object.entries(j.docs || {})) { D.docs[k] = { h: d.h, body: d.body, x: d.x }; } return { ok: true, n: Object.keys(j.docs || {}).length }; }
      return {};
    }
    if (p === '/api/class') {
      const C = st.cls || (st.cls = { joined: false });
      if (j.op === 'join') { C.joined = true; return { cls: { id: 'c1', name: 'Class 9A', code: j.code } }; }
      if (j.op === 'mine') return { teach: [], learn: C.joined ? [{ id: 'c1', name: 'Class 9A', me: 'Student', tasks: [], prog: [] }] : [] };
      if (j.op === 'progress') { C.progress = (C.progress || 0) + 1; return { n: 1 }; }
      return {};
    }
    return {};
  };
}
const FIREBASE_STUB = () => {
  const u = { uid: 'e2e-user', email: 'e2e@example.test', displayName: 'E2E', photoURL: '', getIdToken: async () => 'e2e-token' };
  const auth = { currentUser: u, onAuthStateChanged: cb => { setTimeout(() => cb(u), 50); return () => {}; }, signInWithPopup: async () => ({ user: u }), signOut: async () => {} };
  window.firebase = { initializeApp: () => ({}), auth: Object.assign(() => auth, { GoogleAuthProvider: class { setCustomParameters() {} } }) };
};
// Thông báo hệ thống: 'default' (chưa hỏi) – requestPermission = người dùng từ chối ở hộp hệ thống
const INIT = ({ ask, webdriverOff, seed }) => {
  try {
    class N { constructor() { (window.__notes = window.__notes || []).push([...arguments]); } static get permission() { return N._p; } static requestPermission() { N._p = 'denied'; (window.__perm = (window.__perm || 0) + 1); return Promise.resolve('denied'); } }
    N._p = 'default'; Object.defineProperty(window, 'Notification', { configurable: true, writable: true, value: N });
  } catch { /* */ }
  if (webdriverOff) try { Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }); } catch { /* */ }
  try { if (ask) localStorage.setItem('lk.e2e', '1'); for (const [k, v] of Object.entries(seed || {})) if (localStorage.getItem(k) == null) localStorage.setItem(k, v); } catch { /* */ }
  window.__cls = 0; window.__rej = [];
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true }); } catch { /* */ }
  addEventListener('unhandledrejection', e => window.__rej.push(String((e.reason && (e.reason.stack || e.reason.message)) || e.reason).slice(0, 200)));
};

// ---------- khung 1 lượt chạy ----------
async function journey(id, name, lang, dev, fn, opts = {}) {
  const st = { config: opts.config || {} }, api = mockApi(st), tag = `j${id}-${lang}-${dev}`;
  const ctx = await browser.newContext({ ...VP[dev], locale: LOCALE[lang], reducedMotion: 'reduce', serviceWorkers: 'allow' });
  await ctx.addInitScript(INIT, { ask: !!opts.ask, webdriverOff: !!opts.webdriverOff, seed: opts.seed || {} });
  if (opts.firebase) await ctx.addInitScript(FIREBASE_STUB);
  await ctx.addInitScript(CHECKS);
  const fails = [], notes = [], reqs = [];
  const fail = m => { fails.push(m); console.log(`  ✗ [${tag}] ${m}`); };
  const ok = (c, m) => { if (!c) fail(m); return !!c; };
  await ctx.route('**/*', async r => {
    const u = new URL(r.request().url()); reqs.push(u.pathname + (u.origin === O ? '' : ' @' + u.host));
    if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(u, r.request().postData())) });
    if (u.origin === O) return r.continue();
    const t = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: t === 'script' ? 'text/javascript' : t === 'stylesheet' ? 'text/css' : t === 'image' ? 'image/gif' : 'text/plain', body: t === 'image' ? Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') : '' });
  });
  const page = await ctx.newPage();
  const errs = [];
  const watch = p => {
    p.on('pageerror', e => errs.push('pageerror: ' + String(e.message).slice(0, 200)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|net::ERR_INTERNET_DISCONNECTED|ERR_FAILED/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
  };
  watch(page); ctx.on('page', watch);
  const h = {
    lang, dev, page, ctx, st, fail, ok, notes, reqs, mobile: dev === 'mobile', q: opts.q ?? 'sandbox=1',
    url: (hash, q = 'sandbox=1') => `${O}/app/?${q ? q + '&' : ''}hl=${lang}#${hash}`,
    async boot(hash, q = h.q) { await page.goto(h.url(hash, q), { waitUntil: 'load', timeout: 45000 }); await h.ready(); },
    async ready() { await page.waitForFunction(() => window.App && document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 30000 }); await sleep(700); },
    async go(hash) { await page.evaluate(x => { location.hash = x; }, hash); await sleep(900); },
    async click(sel, o = {}) { const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: o.timeout || 10000 }); await l.scrollIntoViewIfNeeded().catch(() => {}); await l.click({ timeout: 8000 }); await sleep(o.wait ?? 400); },
    has: (sel) => page.locator(sel).first().isVisible().catch(() => false),
    async wait(sel, ms = 10000) { return page.locator(sel).first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false); },
    async audit(step) { const bad = await page.evaluate(s => window.LKJC ? LKJC.audit(s) : [{ t: 'probe', msg: 'không nạp được đầu dò' }], step).catch(e => [{ t: 'probe', msg: e.message }]); for (const b of bad) fail(b.t + ': ' + b.msg); return bad; },
    async shot(n) { await page.screenshot({ path: `${OUT}/shots/${tag}-${n}.png` }).catch(() => {}); },
    async reload() { await page.reload({ waitUntil: 'load' }); await h.ready(); },
    async swReady() { return page.evaluate(async () => { if (!navigator.serviceWorker) return false; const r = await Promise.race([navigator.serviceWorker.ready, new Promise(y => setTimeout(() => y(null), 20000))]); return !!r; }); },
    /** Mất mạng giữa chừng → tải lại → app vẫn mở được + trạng thái cũ còn (check(page) → bool) */
    async offline(hash, check, label) {
      if (!(await h.swReady())) return fail('offline: service worker không sẵn sàng sau 20 s');
      await h.reload(); // lần tải đầu do SW kiểm soát
      await ctx.setOffline(true);
      try { await page.goto(h.url(hash, h.q), { waitUntil: 'load', timeout: 30000 }); await h.ready(); ok(await check(), `offline: ${label}`); }
      catch (e) { fail('offline: không mở được app khi mất mạng – ' + String(e.message).slice(0, 120)); }
      await ctx.setOffline(false);
    },
    ls: k => page.evaluate(k => localStorage.getItem(k), k),
  };
  const t0 = Date.now();
  try { await fn(h); } catch (e) { fail('kịch bản dừng: ' + String(e.message).split('\n')[0].slice(0, 220)); await h.shot('crash'); }
  const rej = await page.evaluate(() => window.__rej || []).catch(() => []);
  for (const e of [...new Set([...errs, ...rej.map(x => 'unhandledrejection: ' + x)])]) fail(e);
  if (fails.length) await h.shot('end');
  results.push({ id, name, lang, dev, ok: !fails.length, fails, notes, ms: Date.now() - t0 });
  console.log(`${fails.length ? '✗' : '✓'} J${id} ${name} [${lang}/${dev}] ${Math.round((Date.now() - t0) / 1000)} s`);
  await ctx.close();
}

// ---------- các bước dùng chung ----------
async function setup(h, { test = false } = {}) {
  await h.boot('/welcome/setup', h.q);
  if (await h.has('#noAcct')) await h.click('#noAcct');
  await h.click('button.trk-opt');
  await h.click(test ? '[data-lv="test"]' : '.trk-lv [data-lv]:not([data-lv="test"])');
  await h.click('#go', { wait: 1500 });
}
async function learnLesson(h) { // bài học thật nhanh nhất: "Học từ mới" – bấm "Mình đã biết từ này" cho từng từ
  for (let i = 0; i < 14 && !(await h.has('.study-wrap .celebrate')); i++) {
    if (await h.has('#known')) await h.click('#known', { wait: 450 });
    else if (await h.has('#gotIt')) await h.click('#gotIt', { wait: 450 });
    else await sleep(600);
  }
  return h.wait('.study-wrap .celebrate', 6000);
}
const softAskShown = h => h.has('#modal:not([hidden]) #raY');

// ---------- 1. Lần đầu: giới thiệu → app → kiểm tra đầu vào → bài đầu tiên → hỏi nhắc học ĐÚNG 1 lần sau bài → từ chối → không bao giờ hỏi lại ----------
async function j1(h) {
  const { page, lang } = h;
  await page.goto(`${O}/${lang === 'vi' ? '' : lang + '/'}`, { waitUntil: 'load' });
  const cta = page.locator('.ctas a.btn.lg').first();
  const href = await cta.getAttribute('href');
  h.ok(href && href.startsWith(`/app/?hl=${lang}#/welcome/setup`), `trang giới thiệu: nút chính trỏ ${href}`);
  // giữ ?sandbox=1 khi bấm vào app (dữ liệu tách riêng)
  await page.route(/\/app\/\?hl=/, r => r.request().isNavigationRequest() && !/sandbox=1/.test(r.request().url()) ? r.fulfill({ status: 302, headers: { location: r.request().url().replace('/app/?', '/app/?sandbox=1&') } }) : r.fallback());
  await cta.click(); await h.ready();
  h.ok(/#\/welcome\/setup/.test(page.url()), 'bấm "Bắt đầu" → màn thiết lập, đang ở ' + page.url().replace(O, ''));
  await sleep(2500);
  h.ok(!(await softAskShown(h)), 'KHÔNG hỏi nhắc học lúc mở app lần đầu');
  await h.audit('first-load');
  if (await h.has('#noAcct')) await h.click('#noAcct');
  await h.click('button.trk-opt'); await h.click('[data-lv="test"]'); await h.click('#go', { wait: 1500 });
  h.ok(/#\/placement/.test(page.url()), 'chọn "kiểm tra đầu vào" → #/placement');
  await h.click('#go', { wait: 600 });
  for (let i = 0; i < 26 && !(await h.has('.pl-result')); i++) { const o = page.locator('.pl-wrap .option[data-k]:not([data-k="-1"])'); if (await o.count()) { await o.nth(i % 2).click().catch(() => {}); } await sleep(520); }
  h.ok(await h.wait('.pl-result', 8000), 'kiểm tra đầu vào có kết quả');
  h.ok(!(await softAskShown(h)), 'không hỏi nhắc học ngay sau kiểm tra đầu vào (chưa phải bài học)');
  await h.click('.pl-result a[href="#/path"]', { wait: 1200 });
  await h.click('a.path-cta', { wait: 1200 });
  await h.click('ol.day-steps a[data-step="learn"]', { wait: 1200 });
  h.ok(await learnLesson(h), 'xong bài học đầu tiên (Học từ mới)');
  if (!h.mobile && await h.has('details.sf-more > summary')) await page.locator('details.sf-more > summary').click().catch(() => {}); // người dùng đang mở "⋯ Xem thêm" đúng lúc hỏi
  const asked = await h.wait('#modal:not([hidden]) #raY', 6000);
  h.ok(asked, 'hỏi nhắc học (soft-ask) xuất hiện sau bài học đầu tiên');
  await h.audit('soft-ask'); await h.shot('soft-ask');
  if (asked) {
    await h.click('#raN', { wait: 500 });
    h.ok(await page.locator('#modal').isHidden(), '"Để sau" đóng hộp');
    h.ok(await page.evaluate(() => document.activeElement && document.activeElement !== document.body), 'focus được trả về (không rơi về <body>) sau khi đóng hộp');
    h.ok(+(await h.ls('lk.reask')) > 0, 'đã ghi lk.reask (không hỏi lại)');
    h.ok(!(await page.evaluate(() => window.__perm || 0)), 'từ chối → KHÔNG gọi hộp quyền của trình duyệt');
  }
  // bài thứ 2 (cùng phiên) + sau khi tải lại → không bao giờ hỏi lại
  if (await h.has('#again')) { await h.click('#again', { wait: 900 }); await learnLesson(h); await sleep(3500); h.ok(!(await softAskShown(h)), 'bài thứ 2: không hỏi lại'); }
  await h.reload();
  h.ok(!/welcome/.test(page.url()), 'tải lại: không quay về màn chào (đã lưu onboarded)');
  await h.go('#/day/1'); await h.click('ol.day-steps a[data-step="learn"]', { wait: 1000 }); await learnLesson(h); await sleep(3500);
  h.ok(!(await softAskShown(h)), 'sau tải lại + bài mới: không hỏi lại');
  await h.audit('after-reload');
  await h.offline('/day/1', () => page.locator('ol.day-steps a[data-step="learn"].ok').count().then(n => n > 0), 'Ngày 1 vẫn ghi "Học từ mới" đã xong');
}

// ---------- 2. Học viên quay lại: home → ngày lộ trình có ngữ pháp + phát âm → xong → "Tiếp theo" → bài tự tin B2 → nhập vai B2 ----------
async function j2(h) {
  const { page } = h;
  await setup(h);
  await h.reload(); await h.go('#/home');
  h.ok(!/welcome/.test(page.url()) && await h.has('#view h1, #view .card'), 'quay lại: vào thẳng trang chủ');
  await h.audit('home');
  await h.go('#/day/1');
  const gl = await page.locator('ol.day-steps a[data-step="gl"]').count(), pr = await page.locator('ol.day-steps a[data-step="pr"]').count();
  h.ok(gl === 1, 'Ngày 1 có bước ngữ pháp (gl)'); h.ok(pr === 1, 'Ngày 1 có bước phát âm (pr)');
  if (gl) {
    await h.click('ol.day-steps a[data-step="gl"]', { wait: 1200 });
    const u = new URL(page.url()); if (!/view=full/.test(u.hash)) await h.go(u.hash.split('?')[0] + '?view=full');
    const items = page.locator('#gQuiz .q-item');
    for (let i = 0; i < await items.count(); i++) { await items.nth(i).locator('.opts button').first().click().catch(() => {}); await sleep(250); }
    await h.audit('grammar');
    await h.go('#/day/1'); await sleep(600);
    h.ok(await page.locator('ol.day-steps a[data-step="gl"].ok').count(), 'bước ngữ pháp được đánh dấu xong');
  }
  if (pr) {
    await h.click('ol.day-steps a[data-step="pr"]', { wait: 1200 });
    const items = page.locator('.q-item');
    for (let i = 0; i < await items.count(); i++) { await items.nth(i).locator('.opts button').first().click().catch(() => {}); await sleep(250); }
    await h.audit('pron');
    await h.go('#/day/1'); await sleep(600);
    h.ok(await page.locator('ol.day-steps a[data-step="pr"].ok').count(), 'bước phát âm được đánh dấu xong');
  }
  await h.click('ol.day-steps a[data-step="learn"]', { wait: 1000 });
  h.ok(await learnLesson(h), 'xong bước Học từ mới');
  h.ok(await h.wait('.celebrate .path-reward', 6000), 'màn "Tiếp theo" (path-reward) hiện');
  const next = await page.locator('.path-reward a.btn.primary').first().getAttribute('href').catch(() => null);
  h.ok(next && next.startsWith('#/'), '"Tiếp theo" có nút bước kế tiếp: ' + next);
  await sleep(2500); await h.audit('whats-next'); await h.shot('whats-next');
  // bài tự tin B2
  await h.go('#/confidence');
  h.ok(await page.locator('a.cf-unit[href="#/confidence/salary"]').count(), 'danh sách bài tự tin có bài B2 (salary)');
  await h.go('#/confidence/salary');
  await h.click('#cfGo', { wait: 700 });
  for (let i = 0; i < 8 && !(await h.has('#cfRp')); i++) { if (await h.has('#cfSkip')) await h.click('#cfSkip', { wait: 500 }); else if (await h.has('#cfNext')) await h.click('#cfNext', { wait: 500 }); else await sleep(500); }
  if (h.ok(await h.has('#cfRp'), 'bài tự tin đi tới bước nhập vai')) { await h.click('#cfRp', { wait: 1500 }); h.ok(/\bB2\b/.test(await page.locator('#view').innerText()), 'nhập vai từ bài tự tin hiển thị mức B2'); }
  await h.audit('confidence');
  await h.go('#/roleplay/salary');
  const lv = await page.locator('.rp-seg button[aria-pressed="true"]').first().innerText().catch(() => '');
  h.ok(/B2/.test(lv), 'nhập vai: mức chọn sẵn B2 (' + lv + ')');
  await h.click('#rpGo', { wait: 1200 });
  h.ok(/\bB2\b/.test(await page.locator('.page-head').first().innerText().catch(() => '')), 'phòng chat nhập vai ghi B2');
  if (await h.has('#rpIn')) {
    const n0 = await page.locator('#view .bubble, #view [class*="msg"]').count();
    await page.fill('#rpIn', 'I would like to discuss my salary, please.'); await h.click('#rpSend', { wait: 2500 });
    h.ok((await page.locator('#view .bubble, #view [class*="msg"]').count()) > n0, 'nhập vai: gửi câu → có phản hồi');
  }
  await h.audit('roleplay');
  await h.reload(); await h.go('#/day/1');
  h.ok(await page.locator('ol.day-steps a.ok').count() >= 1 + (gl ? 1 : 0) + (pr ? 1 : 0), 'tải lại: tiến độ Ngày 1 còn nguyên');
  await h.offline('/day/1', () => page.locator('ol.day-steps a.ok').count().then(n => n >= 1), 'tiến độ Ngày 1 còn khi mất mạng');
}

// ---------- 3. Ôn tập trộn lật/gõ/nghe + thẻ "câu của bạn" (từ add-on) → điểm lưu → đồng bộ khứ hồi (giả lập) ----------
const DAY = 864e5, NOW = Date.now();
const card = (word, vi, extra = {}) => ({ word, vi, pos: 'noun', ex: '', contexts: [], added: NOW - 9 * DAY, mod: NOW - 2 * DAY, srs: { ef: 2.5, interval: 3, reps: 3, lapses: 0, due: NOW - DAY, last: NOW - 4 * DAY, step: 0, S: 3, D: 4 }, ...extra });
const SEED = {
  resilience: card('resilience', 'khả năng phục hồi', { ctx: 'Dense canopies improve the resilience of neighbourhoods during heatwaves.', src: 'bbc.com', contexts: [{ text: 'Dense canopies improve the resilience of neighbourhoods during heatwaves.', source: 'https://www.bbc.com/', title: 'Why cities are planting forests', at: NOW - 3 * DAY }] }),
  sustainable: card('sustainable', 'bền vững'), negotiate: card('negotiate', 'đàm phán', { pos: 'verb' }), budget: card('budget', 'ngân sách'), deadline: card('deadline', 'hạn chót'),
};
async function j3(h) {
  const { page } = h;
  await h.boot('/review');
  const ctx = page.locator('figure.rctx.own').first();
  await sleep(800);
  const modes = ['flip', 'type', 'audio', 'flip', 'type'], seen = new Set();
  let ownSeen = false;
  for (let i = 0; i < 12 && !(await h.has('.rev-done')); i++) {
    const m = modes[i % modes.length];
    if (await h.has('#rmSel')) { await page.selectOption('#rmSel', m).catch(() => {}); await sleep(500); }
    if (await ctx.isVisible().catch(() => false)) { ownSeen = true; const src = await page.locator('figure.rctx.own .rctx-src').first().innerText().catch(() => ''); h.ok(/bbc\.com/.test(src), 'thẻ "câu của bạn" ghi nguồn bbc.com (' + src + ')'); await h.audit('ctx-card'); }
    if (await h.has('#typeIn')) { seen.add('type'); await page.fill('#typeIn', 'zzz'); await page.press('#typeIn', 'Enter'); await sleep(600); }
    else if (await h.has('[data-opt="0"]')) { seen.add('audio'); await h.click('[data-opt="0"]', { wait: 600 }); }
    else if (await h.has('#flipBtn')) { seen.add('flip'); await h.click('#flipBtn', { wait: 400 }); }
    if (await h.has('[data-grade].suggest')) await h.click('[data-grade].suggest', { wait: 700 });
    else if (await h.has('[data-grade="2"]')) await h.click('[data-grade="2"]', { wait: 700 });
    else await sleep(500);
    await h.audit('review-' + i);
  }
  h.ok(ownSeen, 'thẻ "câu của bạn" (figure.rctx.own) hiện cho từ lưu từ add-on');
  h.ok(seen.size === 3, 'đã ôn đủ 3 kiểu lật/gõ/nghe: ' + [...seen].join(','));
  h.ok(await h.wait('.rev-done', 6000), 'xong phiên ôn');
  await sleep(2500); await h.audit('review-done');
  await h.reload();
  const after = await page.evaluate(async () => { const c = await Core.Cards.all(); return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, { reps: v.srs.reps, last: v.srs.last, due: v.srs.due, ctx: v.ctx || '' }])); });
  for (const w of Object.keys(SEED)) h.ok(after[w] && after[w].last > NOW - 60e3 && after[w].due > Date.now(), `điểm ôn của "${w}" được lưu sau tải lại`);
  h.ok(after.resilience && /canopies/.test(after.resilience.ctx), 'câu ngữ cảnh của thẻ add-on còn nguyên');
  await h.offline('/review', () => page.locator('#view').innerText().then(t => t.trim().length > 20), 'mở ôn tập khi mất mạng');
  h.notes.push(JSON.stringify(after).slice(0, 300));
  h.result = after;
}
// đồng bộ khứ hồi: máy A (đăng nhập giả, không sandbox) đẩy lên → máy B mới kéo về đúng điểm + câu ngữ cảnh
async function j3sync(h) {
  const { page, st } = h;
  await h.boot('/home', '');
  for (let i = 0; i < 40 && !(st.sync && st.sync.push); i++) await sleep(500);
  h.ok(st.sync && st.sync.push > 0, 'máy A: đẩy dữ liệu lên /api/sync (giả lập)');
  const docs = (st.sync && st.sync.docs) || {};
  h.ok(Object.values(docs).some(d => d.x === 1), 'gói thẻ có câu ngữ cảnh gắn cờ x:1 (máy chủ làm sạch ctx)');
  // máy B: hồ sơ trống, cùng tài khoản
  const ctxB = await browser.newContext({ ...VP[h.dev], locale: LOCALE[h.lang] });
  await ctxB.addInitScript(INIT, { seed: { 'ielts.settings': JSON.stringify({ onboarded: true }) } }); await ctxB.addInitScript(FIREBASE_STUB);
  const api = mockApi(st);
  await ctxB.route('**/*', r => { const u = new URL(r.request().url()); if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(api(u, r.request().postData())) }); return u.origin === O ? r.continue() : r.fulfill({ status: 200, body: '' }); });
  const pb = await ctxB.newPage(); const errB = []; pb.on('pageerror', e => errB.push(e.message));
  await pb.goto(`${O}/app/?hl=${h.lang}#/home`, { waitUntil: 'load' });
  let got = null;
  for (let i = 0; i < 40; i++) { got = await pb.evaluate(async () => window.Core ? Core.Cards.all() : {}).catch(() => ({})); if (got && got.resilience) break; await sleep(500); }
  h.ok(got && got.resilience, 'máy B: kéo về thẻ "resilience"');
  if (got && got.resilience) { h.ok(/canopies/.test(got.resilience.ctx || (got.resilience.contexts || [])[0]?.text || ''), 'máy B: câu ngữ cảnh đi theo thẻ'); h.ok(got.resilience.srs && got.resilience.srs.due > Date.now() - DAY / 2, 'máy B: lịch ôn mới (đã chấm ở máy A)'); }
  for (const e of errB) h.fail('máy B pageerror: ' + e.slice(0, 160));
  await ctxB.close();
}

// ---------- 4. Tra từ → trang từ → liên kết "song sinh" SEO → quay lại; ô ảnh từ vựng KHÔNG có khi cờ TẮT, không xê dịch bố cục ----------
async function j4(h) {
  const { page, lang } = h;
  await h.boot('/dict');
  await page.fill('#q', 'sustainable'); await page.press('#q', 'Enter');
  h.ok(await h.wait('.entry-word', 15000), 'tra "sustainable" có kết quả');
  await sleep(1500);
  const cls = await page.evaluate(() => window.__cls);
  h.ok(cls < 0.1, `CLS trang từ ${cls.toFixed(3)} < 0.1`);
  h.ok(!(await page.locator('.vimg').count()), 'không có ô ảnh từ vựng (cờ vocab_img TẮT)');
  h.ok(!h.reqs.some(r => /lexicon-img\.json/.test(r)), 'không tải chỉ mục ảnh khi cờ TẮT');
  h.ok(h.reqs.some(r => /^\/data\/lex/.test(r)), 'tra từ dùng mảnh từ điển /data/lex*');
  await h.audit('dict');
  await page.addScriptTag({ url: '/js/seo-twin.js' }); // trên lexkite.com notices.js tự nạp
  const tw = await h.wait('#lk-twin a', 6000);
  const href = tw ? await page.locator('#lk-twin a').getAttribute('href') : '';
  h.ok(tw && href.startsWith(`/${lang}/words/`), 'liên kết song sinh SEO: ' + href);
  if (tw) {
    await page.locator('#lk-twin a').click(); await page.waitForLoadState('load');
    const r = await page.evaluate(() => ({ h1: (document.querySelector('h1') || {}).innerText || '', path: location.pathname }));
    h.ok(/sustainable/i.test(r.h1) && r.path === href.replace(/\/?$/, r.path.endsWith('/') ? '/' : ''), 'trang tĩnh song sinh mở đúng từ: ' + r.path + ' · ' + r.h1.slice(0, 40));
    await h.audit('twin-static');
    await page.goBack({ waitUntil: 'load' }); await h.ready();
    h.ok(/#\/dict/.test(page.url()), 'quay lại → về app ' + page.url().replace(O, ''));
  }
}

// ---------- 5. Cài đặt nhắc học → tải lại → còn; cờ quảng cáo TẮT → không ô quảng cáo ở đâu cả ----------
async function j5(h) {
  const { page } = h;
  await h.boot('/settings');
  if (!(await page.locator('#sRem').isChecked())) await page.locator('#sRem').check();
  const set = async (sel, v) => { await page.locator(sel).fill(v); await page.locator(sel).dispatchEvent('change'); await sleep(250); };
  await set('#sTime', '07:30'); await set('#sQ1', '23:00'); await set('#sQ2', '06:30');
  if (await page.locator('#sTy_week').isChecked()) { await page.locator('#sTy_week').uncheck(); await sleep(250); }
  await h.audit('settings');
  await h.reload(); await h.go('#/settings');
  const v = await page.evaluate(() => ({ t: document.querySelector('#sTime').value, a: document.querySelector('#sQ1').value, b: document.querySelector('#sQ2').value, w: document.querySelector('#sTy_week').checked, d: document.querySelector('#sTy_due').checked, on: document.querySelector('#sRem').checked }));
  h.ok(v.on && v.t === '07:30' && v.a === '23:00' && v.b === '06:30' && !v.w && v.d, 'cài đặt nhắc học còn sau tải lại: ' + JSON.stringify(v));
  const plan = await page.evaluate(() => (JSON.parse(localStorage.getItem('lk.remp') || '[]')).length);
  h.notes.push('lk.remp ' + plan);
}
async function j5ads(h) { // không sandbox, navigator.webdriver = false → chỉ cờ quyết định
  const { page, lang } = h;
  await h.boot('/home', '');
  for (const r of ['/home', '/dict/sustainable', '/review', '/path', '/settings', '/vocab']) { await h.go('#' + r); await sleep(500); await h.audit('ads' + r); }
  await page.goto(`${O}/${lang}/blog/`, { waitUntil: 'load' }); await sleep(3800); await h.audit('ads-blog');
  h.ok(!h.reqs.some(r => /\/js\/ads\/(run|policy|config)\.js|googlesyndication|doubleclick/.test(r)), 'không tải mã quảng cáo khi cờ TẮT');
}

// ---------- 6. Học sinh lớp học: không quảng cáo, không hỏi nhắc học ----------
async function j6(h) {
  const { page, st } = h;
  await h.boot('/class/join/K7M2QX', '');
  await sleep(1500);
  if (await h.has('#crName')) await page.fill('#crName', 'Student');
  if (await h.has('#crCode') && !(await page.inputValue('#crCode'))) await page.fill('#crCode', 'K7M2QX');
  await h.click('#crJoin button[type="submit"], #crJoin .btn.primary', { wait: 1500 });
  h.ok(st.cls && st.cls.joined, 'vào lớp bằng mã (API giả lập)');
  h.ok((await h.ls('lk.edu')) === '1', 'đánh dấu tài khoản lớp học (lk.edu)');
  await h.go('#/day/1'); await h.click('ol.day-steps a[data-step="learn"]', { wait: 1000 });
  h.ok(await learnLesson(h), 'học sinh làm xong 1 bài');
  await sleep(4000);
  h.ok(!(await softAskShown(h)), 'học sinh lớp học: KHÔNG hỏi nhắc học');
  h.ok(!(await h.has('#prRem')), 'học sinh lớp học: không dải mời nhắc học trong màn thưởng');
  await h.go('#/home'); await sleep(1200);
  await h.audit('class-home'); // ô quảng cáo (cờ BẬT ở /api/config giả lập – lk.edu phải chặn)
  h.ok(!h.reqs.some(r => /\/js\/ads\/run\.js/.test(r)), 'học sinh: không tải mã quảng cáo dù cờ BẬT');
}

// ---------- 7. Add-on: tra từ → lưu kèm câu → thẻ tab mới → mở app ----------
async function j7(lang) {
  const tag = `j7-${lang}`, fails = [], t0 = Date.now(), fail = m => { fails.push(m); console.log(`  ✗ [${tag}] ${m}`); }, ok = (c, m) => (c || fail(m), !!c);
  const EXTD = path.resolve('extension'), prof = fs.mkdtempSync(path.join(os.tmpdir(), 'lkj7-'));
  const ctx = await chromium.launchPersistentContext(prof, { channel: 'chromium', headless: true, locale: LOCALE[lang], viewport: { width: 1280, height: 860 }, args: [`--disable-extensions-except=${EXTD}`, `--load-extension=${EXTD}`, `--lang=${LOCALE[lang]}`] });
  const errs = [];
  try {
    const ART = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Why cities are planting forests</title></head><body style="font:18px/1.7 Georgia;max-width:760px;margin:30px auto"><h1>Why cities are planting forests</h1><p>Urban planners argue that trees are infrastructure. Dense canopies improve the <span id="w">resilience</span> of neighbourhoods during heatwaves.</p></body></html>`;
    await ctx.route('https://news.example.test/**', r => r.fulfill({ contentType: 'text/html', body: ART }));
    await ctx.route(/lexkite\.com|googleapis|dictionaryapi|tatoeba|wiktionary|datamuse|mymemory|wikimedia/, r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    ctx.on('page', p => p.on('pageerror', e => errs.push('pageerror ' + p.url().slice(0, 50) + ': ' + e.message.slice(0, 160))));
    let [sw] = ctx.serviceWorkers(); if (!sw) sw = await ctx.waitForEvent('serviceworker');
    const base = `chrome-extension://${new URL(sw.url()).host}/`;
    await sw.evaluate(l => chrome.storage.local.set({ uiLang: l }), lang);
    await sw.evaluate(() => chrome.storage.local.get('settings').then(({ settings }) => chrome.storage.local.set({ settings: { ...(settings || {}), selectMode: 'icon', dblclickOn: true } })));
    await sleep(1500); for (const p of ctx.pages()) if (p.url().startsWith(base)) await p.close().catch(() => {});
    const pg = await ctx.newPage(); await pg.goto('https://news.example.test/article'); await sleep(1200);
    await pg.locator('#w').dblclick(); await sleep(6000);
    const pop = () => pg.evaluate(() => { const r = document.querySelector('ielts-lexi-popup')?.shadowRoot; return r ? { box: !!(r.querySelector('.box') && !r.querySelector('.box').hidden), ctx: (r.querySelector('.ctx') || {}).innerText || '', save: !!r.querySelector('#save'), saved: !!(r.querySelector('#save') || {}).disabled } : null; });
    const p1 = await pop();
    ok(p1 && p1.box, 'add-on: nhấp đúp → bảng tra hiện');
    ok(p1 && /canopies/.test(p1.ctx), 'add-on: bảng tra kèm câu ngữ cảnh sẽ lưu');
    await pg.evaluate(() => document.querySelector('ielts-lexi-popup').shadowRoot.querySelector('#save').click()); await sleep(1500);
    const c = await sw.evaluate(() => chrome.storage.local.get('cards').then(o => (o.cards || {}).resilience || null));
    ok(c && /canopies/.test(c.ctx || '') && c.src === 'news.example.test', 'add-on: thẻ lưu kèm ctx + src: ' + JSON.stringify(c && { ctx: (c.ctx || '').slice(0, 30), src: c.src }));
    await pg.screenshot({ path: `${OUT}/shots/${tag}-popup.png` }).catch(() => {});
    const nt = await ctx.newPage(); await nt.goto(base + 'newtab.html'); await sleep(1500);
    for (let i = 0; i < 15 && !/resilience/i.test(await nt.locator('.nt-word').first().innerText().catch(() => '')); i++) { await nt.keyboard.press('n'); await sleep(400); }
    ok(/resilience/i.test(await nt.locator('.nt-word').first().innerText().catch(() => '')), 'tab mới: thẻ "resilience"');
    ok(/canopies/.test(await nt.locator('#ntEx').innerText().catch(() => '')), 'tab mới: hiện câu ngữ cảnh đã lưu');
    await nt.screenshot({ path: `${OUT}/shots/${tag}-newtab.png` }).catch(() => {});
    const [app] = await Promise.all([ctx.waitForEvent('page', { timeout: 10000 }), nt.click('#ntOpen')]);
    await app.waitForLoadState('load'); await app.waitForFunction(() => document.querySelector('#view') && document.querySelector('#view').children.length, null, { timeout: 20000 }).catch(() => {});
    ok(app.url().startsWith(base + 'app/'), 'tab mới → "Mở app" mở app trong add-on: ' + app.url().replace(base, ''));
    await app.evaluate(() => { location.hash = '#/vocab'; }); await sleep(1500);
    ok(/resilience/i.test(await app.locator('#view').innerText().catch(() => '')), 'app (add-on) có từ vừa lưu');
  } catch (e) { fail('kịch bản dừng: ' + String(e.message).split('\n')[0].slice(0, 200)); }
  for (const e of errs) fail(e);
  results.push({ id: 7, name: 'add-on', lang, dev: 'desktop', ok: !fails.length, fails, notes: [], ms: Date.now() - t0 });
  console.log(`${fails.length ? '✗' : '✓'} J7 add-on [${lang}] ${Math.round((Date.now() - t0) / 1000)} s`);
  await ctx.close();
}

// ---------- chạy ----------
const ONB = { 'sbx.settings': JSON.stringify({ onboarded: true }) };
for (const lang of LANGS) for (const dev of DEVS) {
  if (ONLY.includes(1)) await journey(1, 'lần đầu → bài đầu → hỏi nhắc 1 lần', lang, dev, j1, { ask: true });
  if (ONLY.includes(2)) await journey(2, 'quay lại → ngày ngữ pháp+phát âm → Tiếp theo → B2', lang, dev, j2, { ask: true, seed: { 'lk.reask': String(Date.now()) } });
  if (ONLY.includes(3)) {
    await journey(3, 'ôn trộn lật/gõ/nghe + câu của bạn', lang, dev, j3, { seed: { ...ONB, 'sbx.cards': JSON.stringify(SEED) } });
    await journey(3, 'đồng bộ khứ hồi (giả lập)', lang, dev, j3sync, { q: '', firebase: true, seed: { 'ielts.settings': JSON.stringify({ onboarded: true }), 'ielts.cards': JSON.stringify(SEED) } });
  }
  if (ONLY.includes(4)) await journey(4, 'tra từ → song sinh SEO → quay lại', lang, dev, j4, { seed: ONB });
  if (ONLY.includes(5)) {
    await journey(5, 'cài đặt nhắc học còn sau tải lại', lang, dev, j5, { seed: ONB });
    await journey(5, 'cờ quảng cáo TẮT → không ô quảng cáo', lang, dev, j5ads, { q: '', webdriverOff: true, config: { ads_web: '0', ads_kill: '0' }, seed: { 'ielts.settings': JSON.stringify({ onboarded: true }) } });
  }
  if (ONLY.includes(6)) await journey(6, 'học sinh lớp học: không QC, không hỏi nhắc', lang, dev, j6, { q: '', ask: true, firebase: true, webdriverOff: true, config: { ads_web: '1' }, seed: { 'ielts.settings': JSON.stringify({ onboarded: true }) } });
}
if (EXT) for (const lang of LANGS) await j7(lang);
await browser.close(); srv.close();

// ---------- báo cáo ----------
const bad = results.filter(r => !r.ok);
fs.writeFileSync(OUT + '/results.json', JSON.stringify(results, null, 1));
const md = [`## 🧭 journey-e2e: ${results.length - bad.length}/${results.length} lượt đạt`, '', '| # | Hành trình | Ngôn ngữ | Thiết bị | Kết quả |', '|---|---|---|---|---|',
  ...results.map(r => `| ${r.id} | ${r.name} | ${r.lang} | ${r.dev} | ${r.ok ? '✅' : '❌ ' + r.fails.slice(0, 4).join(' · ').replace(/\|/g, '/')} |`)].join('\n');
fs.writeFileSync(OUT + '/summary.md', md + '\n');
console.log('\n' + md);
process.exit(bad.length ? 1 : 0);
