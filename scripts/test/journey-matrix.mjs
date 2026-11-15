// 🧩 journey-matrix: hành trình người dùng trên thanh 5 tab (lk.ux1=1) theo các trục 390/1440 px × sáng/tối × Back/Esc/X × mạng chậm × ngoại tuyến × trạng thái rỗng × 15 ngôn ngữ.
// Mỗi màn: 0 lỗi console/pageerror, LKJC.visual + LKJC.audit sạch, nút chính/tab/nút thoát ≥ 44 px, đúng tab đang chọn, đúng giao diện. Đầu ra: <out>/summary.md, results.json, shots/ (ảnh lỗi).
// Hermetic: dist cục bộ, /api/* giả lập trong tiến trình, host ngoài = rỗng, ?sandbox=1 hoặc tài khoản Firebase GIẢ → 0 lượt chạm prod, 0 tài khoản thật. Chỉ chạy trên CI (docs/QUALITY-SWEEP.md).
// Dùng: node scripts/test/journey-matrix.mjs --root dist --shard phone|desktop|edge|all [--only <regex tên kịch bản>] [--out jm-out] [--workers 3]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../quality/serve.mjs';
import { CARDS, DAY, EMPTY, GAME, GOAL, GOAL_N, LEARNER, NEWBIE, NOW, STATS, TODAY_DONE, XP, card, dayKey, seedOf, today, yest } from './lib/seeds.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', 'dist')), OUT = path.resolve(arg('out', 'jm-out')), SHARD = arg('shard', 'all'), ONLY = arg('only', ''), WORKERS = +arg('workers', 3);
if (!['phone', 'desktop', 'edge', 'all'].includes(SHARD)) { console.error('✗ shard không hợp lệ: ' + SHARD); process.exit(2); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT + '/shots', { recursive: true });
const CHECKS = fs.readFileSync(new URL('./journey-e2e/checks.js', import.meta.url), 'utf8'), PROBE = fs.readFileSync(new URL('./journey-matrix/probe.js', import.meta.url), 'utf8');
const DEV = {
  m390: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } },
  d1440: { viewport: { width: 1440, height: 900 } },
};
const THEMES = ['light', 'dark'], TABS = ['home', 'vocab', 'skills', 'tests', 'me'];
const LANGS = ['vi', 'en', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh'];
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ||= '1'; // không có cờ này fetch() TỪ service worker lọt qua ctx.route (journey-e2e.mjs)
const srv = await serve(ROOT, 0), O = srv.origin;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const results = [], warns = new Set();
let STEPS = 0, SCREENS = 0;

// ---------- dữ liệu thử ----------

// ---------- API giả lập ----------
const LG_WEEK = { key: 'W', start: NOW - DAY, end: NOW + 3 * DAY };
const lgBoard = () => Array.from({ length: 12 }, (_, i) => ({ rank: i + 1, nick: i === 3 ? 'Mai E2E' : 'Learner ' + (i + 1), xp: 500 - i * 30, me: i === 3, zone: i < 7 ? 'up' : '' }));
function api(u, body, st) {
  const p = u.pathname, j = (() => { try { return JSON.parse(body || '{}'); } catch { return {}; } })();
  if (p === '/api/config') return { ux1: '1' };
  if (p === '/api/league') { st.lg = (st.lg || 0) + 1; return st.joined ? { member: { nick: 'Mai E2E', tier: 1, xp: 410 }, week: LG_WEEK, board: lgBoard(), last: null, rules: { group: 30, up: 7, down: 5, maxTier: 5 } } : { member: null, week: LG_WEEK }; }
  if (p === '/api/sync') return j.op === 'pull' ? { docs: {} } : { ok: true };
  return {};
}
const FIREBASE_STUB = ({ signedIn }) => { // tài khoản GIẢ (cùng cách journey-e2e.mjs)
  const u = signedIn ? { uid: 'e2e-user', email: 'e2e@example.test', displayName: 'Mai E2E', photoURL: '', getIdToken: async () => 'e2e-token' } : null;
  const auth = { currentUser: u, onAuthStateChanged: cb => { setTimeout(() => cb(u), 50); return () => {}; }, signInWithPopup: async () => ({ user: u }), signOut: async () => {} };
  window.firebase = { initializeApp: () => ({}), auth: Object.assign(() => auth, { GoogleAuthProvider: class { setCustomParameters() {} } }) };
};
const INIT = seed => {
  try { for (const [k, v] of Object.entries(seed || {})) if (localStorage.getItem(k) == null) localStorage.setItem(k, v); } catch { /* */ }
  window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String((e.reason && (e.reason.stack || e.reason.message)) || e.reason).slice(0, 220)));
};
const NET_NOISE = /Failed to load resource|net::ERR_|ERR_INTERNET_DISCONNECTED|ERR_FAILED/;

// ---------- khung 1 kịch bản ----------
async function scenario(name, { dev = 'm390', theme = 'light', lang = 'vi', seed = LEARNER, q = 'sandbox=1', sw = 'block', firebase = null, joined = false, timeout = 170000 } = {}, fn) {
  const tag = `${name}-${lang}-${dev}-${theme}`.replace(/[^\w-]+/g, '_'), fails = [], t0 = Date.now(); let steps = 0, screens = 0, shots = 0;
  const st = { joined };
  const ctx = await browser.newContext({ ...DEV[dev], colorScheme: theme, locale: lang === 'vi' ? 'vi-VN' : lang, reducedMotion: 'reduce', serviceWorkers: sw });
  await ctx.addInitScript(INIT, seedOf(q ? 'sbx.' : 'ielts.', seed));
  if (firebase) await ctx.addInitScript(FIREBASE_STUB, firebase);
  await ctx.addInitScript(CHECKS); await ctx.addInitScript(PROBE);
  await ctx.route('**/*', async r => {
    const u = new URL(r.request().url());
    if (u.pathname.startsWith('/api/')) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(api(u, r.request().postData(), st)) }).catch(() => {});
    if (u.origin === O) return r.continue().catch(() => {});
    const t = r.request().resourceType();
    return r.fulfill({ status: 200, contentType: t === 'script' ? 'text/javascript' : t === 'stylesheet' ? 'text/css' : t === 'image' ? 'image/gif' : 'text/plain', body: t === 'image' ? Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') : '' }).catch(() => {});
  });
  const page = await ctx.newPage(), errs = [], dialogs = [];
  let dialogMode = 'accept';
  page.on('dialog', d => { dialogs.push(d.message()); return d[dialogMode]().catch(() => {}); });
  page.on('pageerror', e => errs.push('pageerror: ' + String(e.message).slice(0, 160) + ' @ ' + String(e.stack || '').split('\n').slice(1, 3).map(x => x.trim().replace(/https?:\/\/[^/]+/, '')).join(' < ').slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error' && !NET_NOISE.test(m.text())) errs.push('console: ' + m.text().slice(0, 220)); });
  const fail = m => { if (!fails.includes(m)) { fails.push(m); console.log(`  ✗ [${tag}] ${m}`); } };
  const shot = async n => { if (shots++ < 4) await page.screenshot({ path: `${OUT}/shots/${tag}-${String(n).replace(/[^\w-]+/g, '_').slice(0, 40)}.png` }).catch(() => {}); };
  const h = {
    page, ctx, st, name, dev, theme, lang, dialogs, mobile: dev === 'm390', q, setDialog: m => { dialogMode = m; },
    url: hash => `${O}/app/?${q ? q + '&' : ''}hl=${lang}#${hash}`,
    ok: (c, m) => { if (!c) fail(m); return !!c; },
    fail,
    async boot(hash = '/home') {
      await page.goto(h.url(hash), { waitUntil: 'load', timeout: 60000 }); await h.ready();
      // Chế độ thử nghiệm (?sandbox=1) có toast báo sau 800 ms: lớp của môi trường test, không phải lỗi của màn
      if (q) { await page.waitForFunction(() => { const t = document.querySelector('#toast.show'); return t && /🧪/.test(t.textContent || ''); }, null, { timeout: 2000 }).catch(() => {}); await page.evaluate(() => { const t = document.querySelector('#toast.show'); if (t && /🧪/.test(t.textContent || '')) t.classList.remove('show'); }); }
    },
    async ready() { await page.waitForFunction(() => window.App && window.App.route && document.querySelector('#view') && document.querySelector('#view').children.length > 0 && !document.querySelector('#lkHero'), null, { timeout: 45000 }); await h.settle(); }, // #lkHero = màn chào vẽ sẵn trước khi app chạy
    /** Chờ route vẽ xong: hết khung chờ. Treo quá 20 s = lỗi. */
    async settle(ms = 20000) { await page.waitForFunction(() => { const v = document.querySelector('#view'); return v && v.children.length > 0 && !v.querySelector(':scope > .skel-page, :scope > .skel-study'); }, null, { timeout: ms }).catch(() => fail(`khung chờ/màn trống quá ${ms / 1000} s ở ${page.url().replace(O, '')}`)); await sleep(350); },
    async go(hash) { await page.evaluate(x => { location.hash = x; }, hash); await sleep(120); await h.settle(); },
    locator: s => page.locator(s).first(),
    has: s => page.locator(s).first().isVisible().catch(() => false),
    wait: (s, ms = 12000) => page.locator(s).first().waitFor({ state: 'visible', timeout: ms }).then(() => true, () => false),
    async click(s, { wait = 150, timeout = 12000 } = {}) { const l = page.locator(s).first(); await l.waitFor({ state: 'visible', timeout }); await l.scrollIntoViewIfNeeded().catch(() => {}); await l.click({ timeout }); await sleep(wait); await h.settle(); },
    hash: () => page.evaluate(() => location.hash),
    /** Mở tab bằng thao tác thật (thanh dưới trên điện thoại, menu trái trên máy tính) */
    async tab(k) { await h.click(h.mobile ? `a[data-tab="${k}"]:visible` : `#nav a[data-route="${k}"]`); },
    /** Mỗi bước độc lập: lỗi 1 bước vẫn chạy tiếp để 1 lượt CI thấy đủ lỗi */
    async step(label, f) { steps++; STEPS++; try { await f(); } catch (e) { fail(`[${label}] dừng bước: ${String(e.message).split('\n')[0].slice(0, 200)}`); await shot(label); } },
    /** Kiểm toàn màn. o.tab = tab phải được đánh dấu · o.focus = màn tập trung (ẩn thanh tab) · o.noLeakCheck */
    async screen(label, o = {}) {
      screens++; SCREENS++; const n0 = fails.length, pre = `[${label} ${(await h.hash())}] `;
      const r = await page.evaluate(async ({ label, lang, reachOn }) => ({
        audit: window.LKJC ? LKJC.audit(label) : [{ t: 'probe', msg: 'không nạp được LKJC' }], visual: window.LKJC ? LKJC.visual(label) : { fail: ['không nạp được LKJC'], warn: [] },
        taps: LKJM.taps(), font: await LKJM.iconFont(), tabs: LKJM.tabs(), theme: LKJM.theme(), paint: LKJM.painted(), reach: reachOn ? await LKJM.reach() : null, leak: LKJM.leak(lang), rej: (window.__rej || []).splice(0),
      }), { label, lang, reachOn: h.mobile && !o.focus }).catch(e => ({ crash: e.message }));
      if (r.crash) return fail(pre + 'đầu dò lỗi: ' + r.crash.slice(0, 160));
      for (const b of r.audit) fail(pre + b.t + ': ' + b.msg);
      // Thanh tab Stitch (nav.fixed) là khung app như .bottom-nav: nội dung cuộn dưới nó không phải "lớp nổi đè nút" – phần cuối trang kiểm riêng bằng LKJM.reach
      for (const f of r.visual.fail) if (!/^\(a\) .*\bnav\.fixed\b[^«]*«/.test(f)) fail(pre + 'visual ' + f);
      // (f) nút chính < 44 px: LKJM.taps bao trùm và đo đúng vùng chạm (span.btn trong thẻ link = cả thẻ); icon: khung ô chữ của phông ligature không phải chữ bị cắt
      for (const w of r.visual.warn) if (!/^\(f\)/.test(w) && !/material-symbols/.test(w)) warns.add(`${lang}/${dev}/${theme} ${w}`);
      if (r.font) fail(pre + 'phông icon không nạp được: ' + r.font);
      for (const t of r.taps) fail(pre + 'vùng chạm < 44 px: ' + t);
      if (r.reach) fail(pre + 'cuối trang bị thanh tab che: ' + r.reach);
      if (!o.noLeakCheck) for (const l of r.leak) fail(pre + l);
      h.ok(r.paint.view > 0 && r.paint.viewText > 0 || o.allowBlank, pre + 'màn trắng (#view rỗng)');
      if (!o.errOk) h.ok(!r.paint.err, pre + 'hiện màn lỗi "Không tải được"');
      for (const x of r.rej) fail(pre + 'unhandledrejection: ' + x);
      for (const e of errs.splice(0)) fail(pre + e);
      // Giao diện: nền phải khớp sáng/tối (bỏ qua khi nền trong suốt)
      const L = r.theme.body ?? r.theme.html;
      if (L != null) h.ok(theme === 'dark' ? L < 0.3 : L > 0.5, pre + `nền không khớp giao diện ${theme}: độ sáng ${L.toFixed(2)}`);
      if (o.tab) {
        const T = r.tabs;
        if (T.focus || o.focus) h.ok(T.domCur === o.tab, pre + `tab đánh dấu ${T.domCur} ≠ ${o.tab}`);
        else if (h.mobile) { h.ok(T.bar.map(x => x.k).join() === TABS.join(), pre + 'thanh tab phải đúng 5 tab: ' + T.bar.map(x => x.k).join()); h.ok(T.bar.filter(x => x.cur).map(x => x.k).join() === o.tab, pre + `tab đánh dấu [${T.bar.filter(x => x.cur).map(x => x.k)}] ≠ ${o.tab}`); }
        else { h.ok(T.side.map(x => x.k).join() === TABS.join(), pre + 'menu trái phải đúng 5 mục: ' + T.side.map(x => x.k).join()); h.ok(T.side.filter(x => x.cur).map(x => x.k).join() === o.tab, pre + `mục đánh dấu [${T.side.filter(x => x.cur).map(x => x.k)}] ≠ ${o.tab}`); h.ok(!T.bar.length, pre + `máy tính vẫn hiện ${T.bar.length} tab dưới`); }
      }
      if (fails.length > n0) await shot(label);
    },
    /** Xong kịch bản: lỗi còn lại chưa gắn với màn nào */
    flush() { for (const e of errs.splice(0)) fail('[cuối kịch bản] ' + e); },
    text: async (s = '#view') => (await page.locator(s).first().innerText().catch(() => '')).replace(/\s+/g, ' '),
  };
  const end = sleep(timeout).then(() => 'timeout');
  const res = await Promise.race([fn(h).catch(e => fail('kịch bản dừng: ' + String(e.message).split('\n')[0].slice(0, 200))), end]);
  if (res === 'timeout') { fail(`kịch bản quá ${timeout / 1000} s`); await shot('timeout'); }
  h.flush(); if (!steps) fail('0 bước đã chạy');
  const rejLeft = await page.evaluate(() => (window.__rej || []).splice(0)).catch(() => []); for (const x of rejLeft) fail('unhandledrejection: ' + x);
  results.push({ name, lang, dev, theme, ok: !fails.length, fails, steps, screens, ms: Date.now() - t0 });
  console.log(`${fails.length ? '✗' : '✓'} ${name} [${lang}/${dev}/${theme}] ${steps} bước, ${screens} màn, ${Math.round((Date.now() - t0) / 1000)} s`);
  await ctx.close().catch(() => {});
}

// ---------- hành trình ----------
// Người mới: Hôm nay (3 bước) → chọn kỳ thi → mời kiểm tra đầu vào có Bỏ qua → bài đầu
async function jNewbie(h) {
  await h.step('Hôm nay người mới', async () => { await h.boot('/home'); h.ok(await h.wait('.v2s-today-new'), 'người mới: Hôm nay phải là khung 3 bước (.v2s-today-new)'); await h.screen('hôm nay mới', { tab: 'home' }); });
  await h.step('chọn kỳ thi', async () => { await h.click('[data-href="#/lesson?pick=1"]'); h.ok(await h.wait('.ux1-pick'), 'bước 1 phải mở màn chọn mục tiêu'); await h.screen('chọn mục tiêu', { tab: 'home' }); await h.click('.ux1-pk-main[data-pk="ielts"]', { wait: 400 }); });
  await h.step('mời kiểm tra đầu vào', async () => {
    h.ok(await h.wait('#modal:not([hidden]) #lvlSkip'), 'chọn kỳ thi: phải mời kiểm tra đầu vào, có nút Bỏ qua');
    h.ok((await h.locator('#lvlGo').getAttribute('href')) === '#/placement', 'nút kiểm tra trỏ #/placement');
    await h.screen('mời kiểm tra', {});
    if (h.theme === 'light') { // Esc đóng hộp, không nhốt; vào bài đầu → được mời lại đúng 1 lần
      await h.page.keyboard.press('Escape'); await sleep(250); h.ok(await h.page.locator('#modal').isHidden(), 'Esc phải đóng hộp mời kiểm tra');
      await h.go('/lesson/go'); h.ok(await h.wait('#modal:not([hidden]) #lvlSkip'), 'bài đầu khi chưa chọn: phải mời lại');
    }
    await h.click('#lvlSkip', { wait: 500 }); h.ok(await h.page.locator('#modal').isHidden(), 'Bỏ qua phải đóng hộp');
  });
  await h.step('bài đầu', async () => {
    if (h.theme !== 'light') { await h.screen('sau Bỏ qua', { tab: 'home' }); const cta = h.page.locator('[data-href="#/lesson/go"]:visible, a[href="#/lesson/go"]:visible').first(); h.ok(await cta.count(), 'Hôm nay sau Bỏ qua phải có nút vào bài đầu'); await cta.click(); await sleep(200); await h.settle(); }
    h.ok(await h.wait('#lsnBody', 25000), 'phải vào được bài học đầu tiên (#lsnBody), đang ở ' + await h.hash());
    h.ok(!(await h.has('#modal:not([hidden]) #lvlSkip')), 'đã Bỏ qua thì không mời lại');
    h.ok(await h.has('[data-exit]'), 'bài đầu phải có nút thoát');
    await h.screen('bài đầu', { tab: 'home', focus: true });
    for (let i = 0; i < 3; i++) {
      const opt = h.page.locator('#lsnBody .lsn-opt:visible').first(); if (await opt.count()) { await opt.click({ timeout: 4000 }).catch(() => {}); await sleep(150); }
      for (const s of ['#lsnCheck:visible:not([disabled])', '#lsnNext:visible', '#lsnGo:visible']) { const b = h.page.locator(s).first(); if (await b.count()) { await b.click({ timeout: 4000 }).catch(() => {}); await sleep(300); break; } }
    }
    await h.screen('trong bài đầu', { tab: 'home', focus: true });
  });
}
// Người đang học: Hôm nay đúng số, không trùng
async function jLearner(h) {
  const xp = XP.toLocaleString('vi');
  await h.step('Hôm nay đúng số', async () => {
    await h.boot('/home'); const main = h.mobile ? '.v2s-today' : '.v2s-today-desk';
    h.ok(await h.wait(main), `đang học: khung ${main}`); await h.screen('hôm nay', { tab: 'home' });
    if (!h.mobile) await h.wait('#ux1Rail .v2s-today-rail', 10000);
    const total = await h.page.evaluate(() => { const { Cards } = Core, s = App.state; return Cards.dueCount(s.cards, s.settings, s.stats).total; });
    h.ok(total === 5, `lõi: 5 thẻ đến hạn, thực tế ${total}`);
    const all = await h.page.evaluate(() => [document.querySelector('#view'), document.querySelector('#ux1Rail')].filter(Boolean).map(e => e.innerText).join(' \n ').replace(/\s+/g, ' '));
    // Một lối nhắc ôn (ux1.js oneReview): Lộ trình còn việc ôn → Hôm nay gỡ khối "N từ đang phai dần" + số "N đến hạn", chỉ còn lối #/review trong Lộ trình; chưa có việc ôn → phải ghi đúng N.
    const planRev = await h.page.evaluate(() => [...document.querySelectorAll('#view [href="#/review"], #ux1Rail [href="#/review"]')].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }));
    h.ok(new RegExp(`\\b${total} từ đang phai dần`).test(all) || planRev, `Hôm nay phải ghi đúng "${total} từ đang phai dần" hoặc có lối ôn #/review trong Lộ trình: ` + all.slice(0, 120));
    h.ok(all.includes(xp), `Hôm nay phải có đúng XP ${xp}`); h.ok(all.includes(`${TODAY_DONE}/${GOAL_N}`), `Hôm nay phải có tiến độ ngày ${TODAY_DONE}/${GOAL_N}`);
    h.ok(new RegExp(`\\b${total} đến hạn`).test(all) || planRev, `ô nhanh phải ghi "${total} đến hạn" (hoặc Lộ trình giữ lối ôn #/review)`);
    // không trùng: cùng 1 khối, cùng 1 tiêu đề, cùng 1 lối vào giải đấu không xuất hiện 2 lần
    const dup = await h.page.evaluate(() => { const vs = e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none'; }, count = {}, roots = [document.querySelector('#view'), document.querySelector('#ux1Rail')].filter(Boolean);
      for (const r of roots) { for (const e of r.querySelectorAll('[data-blk]')) if (vs(e)) count['blk:' + e.dataset.blk] = (count['blk:' + e.dataset.blk] || 0) + 1; for (const e of r.querySelectorAll('h1,h2,h3')) if (vs(e) && e.textContent.trim()) { const k = 'h:' + e.textContent.trim(); count[k] = (count[k] || 0) + 1; } for (const e of r.querySelectorAll('a[href="#/league"],[data-href="#/league"]')) if (vs(e)) count.league = (count.league || 0) + 1; }
      return Object.entries(count).filter(([, n]) => n > 1).map(([k, n]) => k + '×' + n); });
    h.ok(!dup.length, 'Hôm nay có khối/tiêu đề trùng: ' + dup.join(', '));
    const xpN = (all.match(new RegExp(xp.replace('.', '\\.'), 'g')) || []).length; h.ok(xpN === 1, `XP hiện ${xpN} lần (phải đúng 1)`);
  });
  await h.step('badge thẻ đến hạn', async () => { const b = await h.page.evaluate(() => { const e = document.querySelector('#bnav [data-due]'); return e ? { hidden: e.hidden, t: e.textContent } : null; }); if (b && !b.hidden) h.ok(b.t.trim() === '5', 'chấm tab Từ vựng phải là 5: ' + b.t); });
}
// Ôn tập: #/review?hub=1 → phiên → xong
async function jReview(h) {
  await h.step('hub Ôn', async () => { await h.boot('/review?hub=1'); h.ok(await h.wait('.v2s-review'), 'hub Ôn (.v2s-review)'); await h.screen('hub ôn', { tab: 'vocab' }); h.ok(/\b5\b/.test(await h.text('.v2s-review')), 'hub Ôn phải có số 5 thẻ'); });
  await h.step('vào phiên', async () => { await h.click('.v2s-review [data-href="#/review"]'); h.ok(await h.wait('#flipBtn, #typeIn, [data-opt="0"]'), 'phiên ôn phải có thẻ'); await h.screen('phiên ôn', { tab: 'vocab', focus: true }); });
  await h.step('xong phiên', async () => {
    for (let i = 0; i < 14 && !(await h.has('.rev-done')); i++) {
      if (await h.has('#typeIn')) { await h.page.fill('#typeIn', 'zzz'); await h.page.press('#typeIn', 'Enter'); await sleep(350); }
      else if (await h.has('[data-opt="0"]')) { await h.page.locator('[data-opt="0"]').first().click(); await sleep(350); }
      else if (await h.has('#flipBtn')) { await h.page.locator('#flipBtn').first().click(); await sleep(250); }
      if (await h.has('[data-grade="2"]')) { await h.page.locator('[data-grade="2"]').first().click(); await sleep(450); } else await sleep(350);
    }
    h.ok(await h.wait('.rev-done', 6000), 'phải xong phiên ôn (.rev-done)'); await h.screen('xong phiên', { tab: 'vocab', focus: true });
    const left = await h.page.evaluate(() => Core.Cards.dueCount(App.state.cards, App.state.settings, App.state.stats).total); h.ok(left === 0, 'sau phiên: còn ' + left + ' thẻ đến hạn');
  });
  await h.step('quay về', async () => { await h.go('/home'); const tx = await h.text(); h.ok(!/\b5 từ đang phai dần/.test(tx), 'Hôm nay còn báo 5 từ sau khi đã ôn hết'); await h.screen('Hôm nay sau ôn', { tab: 'home' }); });
}
// Luyện: #/skills → #/train → 1 bài
async function jTrain(h) {
  await h.step('tab Kỹ năng', async () => { await h.boot('/home'); await h.tab('skills'); h.ok(/^#\/skills/.test(await h.hash()), 'tab Kỹ năng → #/skills'); await h.screen('kỹ năng', { tab: 'skills' }); });
  await h.step('Luyện', async () => { await h.click('#view a[href="#/train"]'); h.ok(await h.wait('.v2s-practice'), '#/train phải là màn Luyện'); await h.screen('luyện', { tab: 'skills' }); });
  await h.step('1 bài', async () => {
    await h.click('#view a[href="#/grammar"]'); h.ok(await h.wait('a[data-grow][href^="#/grammar/"]'), 'Ngữ pháp phải có bài'); await h.screen('ngữ pháp', { tab: 'skills' });
    await h.click('a[data-grow][href^="#/grammar/"]:not([href*="mix"])'); const u = await h.hash(); await h.go(u.split('?')[0].slice(1) + '?view=full');
    h.ok(await h.wait('#gQuiz .q-item', 15000), 'bài ngữ pháp phải có câu hỏi'); const it = h.page.locator('#gQuiz .q-item'), n = await it.count();
    for (let i = 0; i < n; i++) { await it.nth(i).locator('.opts button').first().click({ timeout: 4000 }).catch(() => {}); await sleep(120); }
    await h.page.waitForFunction(() => !document.querySelector('#toast.show'), null, { timeout: 8000 }).catch(() => {}); // toast thưởng (lên cấp) tự tắt sau vài giây: thông báo tạm, không phải lớp phủ của màn
    await h.screen('làm bài', { tab: 'skills', focus: true });
    const g = await h.page.evaluate(() => (App.state.game || {}).xp || 0); h.ok(n > 0 && g >= XP, 'XP không được giảm sau bài: ' + g);
  });
}
// Thi thử: #/tests → #/mock mở đề + thoát có hỏi
async function jMock(h) {
  await h.step('tab Thi', async () => { await h.boot('/home'); await h.tab('tests'); h.ok(/^#\/tests/.test(await h.hash()), 'tab Thi → #/tests'); await h.screen('thi', { tab: 'tests' }); });
  await h.step('#/mock', async () => { await h.click('#view a[href="#/mock"]'); h.ok(await h.wait('#mkGo', 25000), '#/mock có nút Bắt đầu'); await h.screen('thi thử', { tab: 'tests' }); });
  await h.step('mở đề', async () => { await h.click('#mkGo', { wait: 500 }); h.ok(/^#\/mock\/run/.test(await h.hash()), 'mở đề → #/mock/run'); h.ok(await h.wait('#mkQuit, #mkStart', 20000), 'đề thi phải có nút thoát hoặc bắt đầu'); if (await h.has('#mkStart')) await h.click('#mkStart', { wait: 400 }); h.ok(await h.wait('#mkQuit', 15000), 'đề thi đang làm phải có nút thoát #mkQuit'); await h.screen('đề thi', { tab: 'tests', focus: true }); });
  await h.step('thoát có hỏi', async () => {
    const d0 = h.dialogs.length; await h.click('#mkQuit', { wait: 300 });
    h.ok(h.dialogs.length === d0, 'thoát đề phải hỏi nhẹ trong app, không dùng hộp hệ thống'); h.ok(await h.has('#modal:not([hidden]) [data-exit-go]'), 'thoát đề đang làm phải hỏi'); await h.screen('hỏi thoát đề', { tab: 'tests', focus: true });
    await h.click('#modal:not([hidden]) [data-exit-stay]', { wait: 250 }); h.ok(/^#\/mock\/run/.test(await h.hash()) && await h.has('#mkQuit'), 'Tiếp tục → vẫn ở đề');
    await h.click('#mkQuit', { wait: 250 }); await h.click('#modal:not([hidden]) [data-exit-go]', { wait: 300 });
    h.ok((await h.hash()).startsWith('#/mock') && !/run/.test(await h.hash()), 'đồng ý → về #/mock, đang ở ' + await h.hash());
    h.ok(await h.wait('#mkGo', 15000), 'về lại màn chọn đề'); await h.screen('sau thoát', { tab: 'tests' });
  });
}
// Giải đấu: thẻ trên Hôm nay → #/league; khách và đã tham gia (API giả lập, tài khoản Firebase GIẢ)
const leagueEntry = '#view a[href="#/league"]:visible, #ux1Rail a[href="#/league"]:visible';
async function jLeagueGuest(h) {
  await h.step('thẻ Hôm nay', async () => { await h.boot('/home'); h.ok(await h.wait(leagueEntry, 12000), 'Hôm nay phải có lối vào Giải đấu cả khi chưa tham gia'); const c = h.page.locator(leagueEntry).first(); await c.click(); await sleep(200); await h.settle(); h.ok((await h.hash()) === '#/league', 'thẻ → #/league'); });
  await h.step('màn khách', async () => { h.ok(await h.wait('#leagueSignInBtn', 15000), 'khách: có nút đăng nhập để tham gia'); await h.screen('giải đấu khách', { tab: 'home' }); });
}
async function jLeagueJoined(h) {
  await h.step('thẻ Hôm nay', async () => { await h.boot('/home'); h.ok(await h.wait(leagueEntry, 12000), 'Hôm nay phải có lối vào Giải đấu'); await h.page.waitForFunction(() => /#\d+\/\d+/.test(document.querySelector('[data-lg="rank"]')?.textContent || ''), null, { timeout: 10000 }).catch(() => h.fail('thẻ giải đấu phải hiện hạng thật (mock #4/12)')); const rk = await h.page.locator('[data-lg="rank"]').first().textContent().catch(() => ''); h.ok(/#4\/12/.test(rk || ''), 'thẻ: đúng hạng #4/12, thực tế ' + rk); await h.screen('hôm nay có giải', { tab: 'home' }); await h.page.locator(leagueEntry).first().click(); await sleep(200); await h.settle(); h.ok((await h.hash()) === '#/league', 'thẻ → #/league'); });
  await h.step('bảng xếp hạng', async () => { h.ok(await h.wait('.v2s-leagues', 15000), 'đã tham gia: bảng xếp hạng Stitch'); h.ok((await h.text()).includes('Mai E2E'), 'bảng có biệt danh của mình'); await h.screen('bảng xếp hạng', { tab: 'home' }); });
  await h.step('quy tắc + thoát', async () => { const b = h.page.locator('.v2s-leagues [data-act="rules"]').first(); if (await b.count()) { await b.click(); h.ok(await h.wait('#modal:not([hidden]) [data-close]'), 'bảng quy tắc mở'); await h.screen('quy tắc', {}); await h.page.keyboard.press('Escape'); await sleep(250); h.ok(await h.page.locator('#modal').isHidden(), 'Esc đóng bảng quy tắc'); } else h.fail('thiếu nút Quy tắc'); await h.page.goBack(); await sleep(300); await h.settle(); h.ok(/^#\/home|^$/.test(await h.hash()), 'Back từ Giải đấu → Hôm nay, đang ở ' + await h.hash()); });
}
// Tôi: #/me → cài đặt
async function jMe(h) {
  await h.step('tab Tôi', async () => { await h.boot('/home'); await h.tab('me'); h.ok(/^#\/me/.test(await h.hash()), 'tab Tôi → #/me'); await h.screen('tôi', { tab: 'me' }); });
  await h.step('cài đặt', async () => { await h.click('#view a[href="#/settings"]'); h.ok(await h.wait('a.set-go[data-go="remind"]', 15000), 'cài đặt có lối vào mục nhắc học'); await h.screen('cài đặt', { tab: 'me' }); /* Cài đặt = danh mục + trang con (#/settings/<mục>) */ await h.click('a.set-go[data-go="remind"]'); h.ok(await h.wait('#sRem', 15000), 'trang Nhắc học có công tắc bật nhắc'); await h.screen('cài đặt nhắc học', { tab: 'me' }); await h.page.goBack(); await sleep(300); await h.page.goBack(); await sleep(300); await h.settle(); h.ok(/^#\/me/.test(await h.hash()), 'Back từ cài đặt → #/me'); });
}
// 5 tab + deep link cũ
const DEEP = [['/train', '#/train', 'skills', '.v2s-practice', {}], ['/league', '#/league', 'home', '#leagueBody, .league-wrap, .v2s-leagues', {}], ['/leagues', '#/league', 'home', '#leagueBody, .league-wrap, .v2s-leagues', {}], ['/review', '#/review', 'vocab', '#flipBtn, #typeIn, [data-opt="0"], .rev-done', { focus: true }], ['/review?hub=1', '#/review?hub=1', 'vocab', '.v2s-review', {}]];
async function jTabs(h) {
  await h.step('boot', async () => { await h.boot('/home'); await h.screen('tab home', { tab: 'home' }); });
  for (const k of TABS) await h.step('tab ' + k, async () => { await h.tab(k); h.ok((await h.hash()).startsWith('#/' + k), `tab ${k} → #/${k}, đang ở ` + await h.hash()); await h.screen('tab ' + k, { tab: k }); });
  for (const [from, to, tab, sel, o] of DEEP) await h.step('deep ' + from, async () => {
    await h.page.goto(h.url(from), { waitUntil: 'load', timeout: 60000 }); await h.ready();
    h.ok((await h.hash()) === to, `deep link #${from} phải tới ${to}, đang ở ` + await h.hash()); h.ok(await h.wait(sel, 15000), `deep link #${from} phải hiện ${sel}`);
    h.ok(!(await h.has('.err-state')), `deep link #${from} không được lỗi`); await h.screen('deep ' + from, { tab, ...o });
  });
}
// Back / Esc / X: mọi màn học thoát được, không bị nhốt; đang làm dở → hỏi nhẹ
async function jExit(h) {
  let gram = '/grammar/x';
  await h.step('chuẩn bị', async () => { await h.boot('/home'); await h.go('/grammar'); const a = await h.locator('a[data-grow][href^="#/grammar/"]:not([href*="mix"])').getAttribute('href'); gram = a.slice(1); });
  const scr = [['/review', 'ôn'], ['/placement', 'kiểm tra đầu vào'], ['/lesson/go', 'bài học'], [gram, 'ngữ pháp'], ['/quick', 'chơi nhanh'], ['/mock/run?s=reading&r=1', 'thi thử']];
  const left = async (start, label) => {
    const go = h.page.locator('#modal:not([hidden]) [data-exit-go]'); if (await go.isVisible().catch(() => false)) { await go.click(); await sleep(200); }
    await sleep(350); await h.settle();
    const s = await h.page.evaluate(() => ({ hash: location.hash, learn: document.body.classList.contains('lk-learn'), modal: !!document.querySelector('#modal:not([hidden])'), filled: document.querySelector('#view').children.length > 0, navOk: !document.body.classList.contains('focus') }));
    h.ok(s.hash !== '#' + start && !s.learn && s.filled && !s.modal && s.navOk, `${label}: phải rời ${start}, thực tế ` + JSON.stringify(s));
  };
  for (const [r, n] of scr) for (const via of ['x', 'esc', 'back']) await h.step(`${n} ${via}`, async () => {
    await h.go('/home'); await h.go(r); if (r.includes('/mock/run') && await h.has('#mkStart')) await h.click('#mkStart', { wait: 300 });
    h.ok(await h.wait('[data-exit], #mkQuit', 20000), `${n}: phải có nút thoát`);
    if (via === 'x') { await h.screen(n, { focus: true, tab: null }); const x = h.page.locator('[data-exit]:visible, #mkQuit:visible').first(); const b = await x.boundingBox(); h.ok(b && b.width >= 43.5 && b.height >= 43.5, `${n}: nút thoát < 44 px`); await x.click(); }
    else if (via === 'esc') await h.page.keyboard.press('Escape');
    else await h.page.goBack();
    await left(r, `${n} ${via}`);
  });
  await h.step('gõ: Esc', async () => {
    await h.go('/home'); await h.go('/review'); await h.wait('#rmSel', 8000); await h.page.selectOption('#rmSel', 'type'); h.ok(await h.wait('#typeIn'), 'phiên ôn kiểu gõ có ô nhập');
    await h.page.fill('#typeIn', 'abc'); await h.page.press('#typeIn', 'Escape'); await sleep(300); h.ok(/^#\/review/.test(await h.hash()), 'đang gõ: Esc không được rời bài');
    await h.go('/home'); await h.go('/review'); h.ok(await h.wait('#typeIn'), 'kiểu gõ giữ trong phiên'); await h.page.locator('#typeIn').focus(); await h.page.keyboard.press('Escape'); await left('/review', 'ô trống: Esc');
    await h.go('/review'); if (await h.wait('#rmSel', 8000)) await h.page.selectOption('#rmSel', 'flip'); await sleep(250);
  });
  await h.step('dở dang: hỏi nhẹ', async () => {
    await h.go('/home'); await h.go('/review'); h.ok(await h.wait('#flipBtn, #typeIn, [data-opt="0"]'), 'phiên ôn có thẻ');
    if (await h.has('#flipBtn')) await h.page.locator('#flipBtn').first().click(); else if (await h.has('#typeIn')) await h.page.fill('#typeIn', 'zzz'); else await h.page.locator('[data-opt="0"]').first().click();
    await sleep(250); await h.page.keyboard.press('Escape'); await sleep(350);
    const asked = await h.has('#modal:not([hidden]) [data-exit-go]');
    if (asked) { await h.screen('hỏi thoát', { focus: true, tab: null }); await h.page.keyboard.press('Escape'); await sleep(250); h.ok(/^#\/review/.test(await h.hash()), 'Esc trên hộp hỏi = ở lại'); await h.page.goBack(); await sleep(350); }
    await left('/review', 'dở dang');
  });
}
// Mạng chậm: JS/CSS trễ → không trắng màn, có khung chờ, không lỗi
async function jSlow(h) {
  await h.ctx.route(new RegExp('^' + O.replace(/[.]/g, '\\.') + '/(app/)?(js|css)/'), async r => { await sleep(350); return r.fallback().catch(() => {}); });
  await h.step('nạp đầu chậm', async () => {
    const started = h.page.goto(h.url('/home'), { waitUntil: 'load', timeout: 90000 });
    await h.page.waitForSelector('body', { timeout: 30000 }).catch(() => {}); await sleep(1200);
    const p = await h.page.evaluate(() => (window.LKJM ? LKJM.painted() : null)).catch(() => null);
    h.ok(p && p.body > 0, 'mạng chậm: 1,2 s đầu không được trắng màn: ' + JSON.stringify(p));
    await started; await h.ready(); await h.screen('hôm nay chậm', { tab: 'home' });
  });
  await h.step('route lười chậm', async () => {
    for (const [r, tab] of [['/mock', 'tests'], ['/grammar', 'skills']]) {
      await h.page.evaluate(() => { LKJM.state.skel = 0; });
      await h.page.evaluate(x => { location.hash = x; }, r); await sleep(250);
      const view = await h.page.evaluate(() => LKJM.painted()); h.ok(view.view > 0, `${r}: chờ gói mà #view rỗng`);
      await h.settle(30000); h.ok(await h.page.evaluate(() => LKJM.state.skel > 0), `${r}: phải có khung chờ khi tải gói chậm`);
      await h.screen('chậm ' + r, { tab });
    }
  });
}
// Ngoại tuyến sau khi đã nạp: màn đã có vẫn mở, báo nhẹ, không lỗi JS
async function jOffline(h) {
  const seen = [['/home', 'home'], ['/vocab', 'vocab'], ['/review?hub=1', 'vocab'], ['/tests', 'tests'], ['/me', 'me']];
  await h.step('nạp + service worker', async () => {
    await h.boot('/home');
    h.ok(await h.page.evaluate(async () => { if (!navigator.serviceWorker) return false; return !!(await Promise.race([navigator.serviceWorker.ready, new Promise(y => setTimeout(() => y(null), 25000))])); }), 'service worker phải sẵn sàng');
    await h.page.reload({ waitUntil: 'load' }); await h.ready(); for (const [r] of seen) await h.go(r); await sleep(1200);
  });
  await h.step('mất mạng: báo nhẹ', async () => {
    await h.go('/home'); await h.ctx.setOffline(true); await sleep(500);
    h.ok(await h.page.evaluate(() => document.body.classList.contains('offline') && !navigator.onLine), 'phải đánh dấu body.offline');
    h.ok(await h.page.evaluate(() => !!LKJM.state.netToast), 'phải báo nhẹ "Mất kết nối" (toast)');
    await h.screen('vừa mất mạng', { tab: 'home' }); await sleep(3500); // chờ toast tắt rồi mới soi các màn sau
  });
  for (const [r, tab] of seen) await h.step('ngoại tuyến ' + r, async () => { await h.go(r); h.ok(!(await h.has('.err-state')), `${r}: màn đã có phải mở được khi mất mạng`); await h.screen('offline ' + r, { tab }); });
  await h.step('tải lại khi mất mạng', async () => { await h.go('/home'); await h.page.reload({ waitUntil: 'load', timeout: 30000 }); await h.ready(); await h.screen('offline tải lại', { tab: 'home' }); });
  await h.step('màn chưa có khi mất mạng', async () => { await h.go('/mock'); const p = await h.page.evaluate(() => LKJM.painted()); h.ok(p.viewText > 0, 'màn chưa nạp khi mất mạng: phải có thông báo, không trắng'); if (p.err) { h.ok(await h.has('[data-retry]'), 'màn lỗi phải có nút Thử lại'); } await h.screen('offline chưa có', { errOk: true, tab: 'tests' }); });
  await h.step('có mạng lại', async () => { await h.ctx.setOffline(false); await sleep(500); h.ok(await h.page.evaluate(() => !document.body.classList.contains('offline')), 'có mạng lại: bỏ dấu offline'); });
}
// Trạng thái rỗng: có lời dẫn + nút đi tiếp, không số giả
const EMPTY_SCR = [
  ['/review?hub=1', 'vocab', 'ôn 0 thẻ', /(^|\D)[1-9]\d* (thẻ|đến hạn|sắp quên|quen)|~[1-9]\d* phút/i],
  ['/review', 'vocab', 'phiên 0 thẻ', /Hoàn thành [1-9]|\+[1-9]\d* XP|đã ôn hết/i, { focus: true }],
  ['/mistakes', 'me', '0 lỗi sai', /(^|\D)[1-9]\d* (cần sửa|lỗi)/i],
  ['/tests', 'tests', 'chưa có kết quả thi', /Band \d/i],
  ['/mock', 'tests', 'chưa có thi thử', /So với lần đầu|Band \d/i],
  ['/deck', 'vocab', 'sổ từ rỗng', /(^|\D)[1-9]\d* từ(\s|$)/i],
  ['/stats', 'me', 'thống kê rỗng', /[1-9]\d* (thẻ|từ) đã/i],
  ['/home', 'home', 'Hôm nay 0 thẻ', /[1-9]\d* từ đang phai dần|[1-9]\d* đến hạn/i],
  ['/vocab', 'vocab', 'tab Từ vựng 0 thẻ', /Ôn [1-9]\d* thẻ|(^|\D)[1-9]\d* từ (·|đã)/i],
  ['/me', 'me', 'Tôi chưa học', /[1-9]\d* từ đã thuộc/i],
];
async function jEmpty(h) {
  await h.step('boot', async () => { await h.boot('/home'); });
  for (const [r, tab, n, fake, o] of EMPTY_SCR) await h.step(n, async () => {
    await h.go(r); await sleep(400); const tx = await h.text();
    h.ok(tx.trim().length >= 20, `${n}: phải có lời dẫn, thực tế «${tx.slice(0, 60)}»`);
    h.ok(!fake.test(tx), `${n}: số giả: «${(tx.match(fake) || [''])[0]}»`);
    const cta = await h.page.evaluate(() => [...document.querySelectorAll('#view a[href^="#/"], #view [data-href], #view button')].filter(e => LKJM.vis(e) && !e.closest('nav, .crumb, header') && !e.matches('[data-exit], .icon-btn')).map(e => (e.getAttribute('href') || e.getAttribute('data-href') || e.id || e.textContent.trim()).slice(0, 30)));
    h.ok(cta.length > 0, `${n}: phải có nút đi tiếp`);
    await h.screen(n, { tab, ...o });
  });
}
// 15 ngôn ngữ (bản rút): 5 tab, không chữ Việt/thiếu dịch ở ngôn ngữ khác vi, không tràn ngang, RTL ar đúng
async function jLang(h) {
  await h.step('boot', async () => {
    await h.boot('/home'); await h.page.evaluate(() => (window.I18N && I18N.whenReady ? I18N.whenReady() : null));
    const L = await h.page.evaluate(() => ({ html: document.documentElement.lang, dir: document.documentElement.dir || getComputedStyle(document.body).direction, cur: window.I18N && I18N.lang && I18N.lang() }));
    h.ok(L.cur === h.lang, `I18N.lang = ${L.cur} ≠ ${h.lang}`); h.ok((L.dir === 'rtl') === (h.lang === 'ar'), `hướng chữ ${L.dir} sai với ${h.lang}`);
    await h.screen('tab home', { tab: 'home' });
  });
  for (const k of TABS) await h.step('tab ' + k, async () => {
    await h.tab(k); h.ok((await h.hash()).startsWith('#/' + k), `tab ${k}: đang ở ` + await h.hash()); await h.screen('tab ' + k, { tab: k });
    if (h.lang !== 'ar') return;
    const x = await h.page.evaluate(() => { const rect = s => { const e = [...document.querySelectorAll(s)].find(LKJM.vis); return e ? e.getBoundingClientRect() : null; }, a = rect('a[data-tab="home"]'), b = rect('a[data-tab="me"]'), sb = rect('.sidebar'); return { a: a && a.left, b: b && b.left, sb: sb && sb.left, sw: sb && sb.width, vw: innerWidth }; });
    if (h.mobile) h.ok(x.a != null && x.b != null && x.a > x.b, 'RTL: tab đầu phải nằm bên phải tab cuối ' + JSON.stringify(x));
    else h.ok(x.sb != null && x.sb > x.vw / 2, 'RTL: menu trái phải sang phải ' + JSON.stringify(x));
  });
}

// ---------- ma trận → shard ----------
const J = [['người mới', jNewbie, { seed: NEWBIE }], ['đang học', jLearner, {}], ['ôn tập', jReview, {}], ['luyện', jTrain, {}], ['thi thử', jMock, {}], ['giải đấu khách', jLeagueGuest, { q: '', firebase: { signedIn: false } }], ['giải đấu đã tham gia', jLeagueJoined, { q: '', firebase: { signedIn: true }, joined: true, seed: { ...LEARNER, 'lk.acct': JSON.stringify({ displayName: 'Mai E2E', email: 'e2e@example.test' }) } }], ['tôi', jMe, {}], ['5 tab + deep link', jTabs, {}]];
const plan = [];
const add = (shard, name, fn, o) => { if ((SHARD === 'all' || SHARD === shard) && (!ONLY || new RegExp(ONLY).test(name))) plan.push(() => scenario(name, o, fn)); };
for (const [n, f, o] of J) for (const theme of THEMES) { add('phone', n, f, { ...o, dev: 'm390', theme }); add('desktop', n, f, { ...o, dev: 'd1440', theme }); }
add('edge', 'Back-Esc-X', jExit, { dev: 'm390', theme: 'light', timeout: 300000 }); add('edge', 'Back-Esc-X', jExit, { dev: 'd1440', theme: 'dark', timeout: 300000 });
add('edge', 'mạng chậm', jSlow, { dev: 'm390', theme: 'dark', timeout: 240000 }); add('edge', 'mạng chậm', jSlow, { dev: 'd1440', theme: 'light', timeout: 240000 });
add('edge', 'ngoại tuyến', jOffline, { dev: 'm390', theme: 'light', sw: 'allow' }); add('edge', 'ngoại tuyến', jOffline, { dev: 'd1440', theme: 'dark', sw: 'allow' });
for (const dev of ['m390', 'd1440']) for (const theme of THEMES) add('edge', 'rỗng', jEmpty, { dev, theme, seed: EMPTY });
for (const lang of LANGS) add('edge', 'ngôn ngữ', jLang, { dev: 'm390', lang, timeout: 120000 });
for (const lang of ['ar', 'de', 'zh']) add('edge', 'ngôn ngữ', jLang, { dev: 'd1440', theme: 'dark', lang, timeout: 120000 });

const t00 = Date.now();
await Promise.all(Array.from({ length: WORKERS }, async () => { while (plan.length) await plan.shift()(); }));
await browser.close(); srv.close();

// ---------- báo cáo ----------
const bad = results.filter(r => !r.ok), secs = Math.round((Date.now() - t00) / 1000);
fs.writeFileSync(OUT + '/results.json', JSON.stringify({ shard: SHARD, steps: STEPS, screens: SCREENS, secs, warns: [...warns], results }, null, 1));
const md = [`## 🧩 journey-matrix [${SHARD}]: ${results.length - bad.length}/${results.length} kịch bản đạt · ${STEPS} bước · ${SCREENS} màn · ${secs} s`, '',
  '| Kịch bản | Ngôn ngữ | Khổ | Giao diện | Bước/màn | Kết quả |', '|---|---|---|---|---|---|',
  ...results.map(r => `| ${r.name} | ${r.lang} | ${r.dev} | ${r.theme} | ${r.steps}/${r.screens} | ${r.ok ? '✅' : '❌ ' + r.fails.slice(0, 5).join(' · ').replace(/\|/g, '/').slice(0, 900)} |`)];
if (warns.size) md.push('', `### 👁️ Kiểm hình – cảnh báo (${warns.size})`, ...[...warns].slice(0, 40).map(x => '- ' + x.replace(/\|/g, '/')));
fs.writeFileSync(OUT + '/summary.md', md.join('\n') + '\n');
console.log('\n' + md.join('\n'));
if (!STEPS || !SCREENS) { console.error('✗ 0 bước/màn đã chạy – coi là đỏ'); process.exit(1); }
process.exit(bad.length ? 1 : 0);
