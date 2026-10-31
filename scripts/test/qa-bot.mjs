// 🤖 qa-bot – bot QA tự động trên CI (docs/QA-BOT.md). KHÔNG chạy trên máy Mac của anh chủ.
// 1) Hành trình học thật với người dùng sandbox mới (?sandbox=1, không tài khoản thật): thiết lập → bài học (đúng + sai, bỏ qua, nghe, làm lại)
//    → ôn thẻ đến hạn → luyện → thi thử → tôi/cài đặt → đổi giao diện sáng/tối → quay lại (back). Kiểm: 0 lỗi console/exception, 0 request
//    cùng nguồn hỏng, không màn trống/kẹt, XP/chuỗi ngày cập nhật đúng, back hoạt động.
// 2) Đầu dò lỗi giao diện ẩn (qa-bot/detect.js) × 390/768/1440 × sáng/tối: tràn ngang, chữ bị cắt, chồng lấn, lệch hàng, vạch "đang chọn" rời,
//    vùng chạm < 44, tương phản (axe color-contrast – cùng động cơ với contrast.mjs), CLS.
// 3) Hiệu năng: long task, INP (Event Timing), FPS khi chuyển tab. 4) Dung lượng localStorage/IndexedDB sau N bài (ngân sách).
// Lỗi giao diện đã biết nằm trong baseline (scripts/test/qa-bot-baseline.json) – chỉ được BỚT, lỗi MỚI → đỏ. Hành trình/hiệu năng/dung lượng: không baseline.
// Dùng: node scripts/test/qa-bot.mjs [--root dist | --base https://lexkite.com] [--out out/qa-bot] [--only journeys,ui,perf,storage]
//        [--widths 390,768,1440] [--themes light,dark] [--lessons 3] [--baseline scripts/test/qa-bot-baseline.json] [--write-baseline f.json]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { serve } from '../quality/serve.mjs';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(arg('out', 'out/qa-bot')), ONLY = arg('only', 'journeys,ui,perf,storage').split(',');
const WIDTHS = arg('widths', '390,768,1440').split(',').map(Number), THEMES = arg('themes', 'light,dark').split(',');
const LESSONS = +arg('lessons', '3'), BASELINE = arg('baseline', 'scripts/test/qa-bot-baseline.json'), WRITE_BL = arg('write-baseline', '');
// Ngân sách (chỉ được siết, không nới – docs/QA-BOT.md §Ngân sách)
const BUDGET = { cls: 0.1, inpFail: 500, inpWarn: 200, longFail: 500, longWarn: 200, fpsFail: 30, fpsWarn: 50, lsTotal: 2.5e6, lsPerLesson: 32e3, idbPerLesson: 256e3 };
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(OUT + '/shots', { recursive: true });
const DETECT = fs.readFileSync(new URL('./qa-bot/detect.js', import.meta.url), 'utf8');
const AXE = (() => { try { return fs.readFileSync(createRequire(import.meta.url).resolve('axe-core'), 'utf8'); } catch { return ''; } })();

let srv = null, O = arg('base', '');
if (!O) { srv = await serve(arg('root', 'dist'), 0); O = srv.origin; }
O = O.replace(/\/$/, '');
const LOCAL = !!srv, HOST = new URL(O).host;
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ||= '1';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const R = { base: O, at: new Date().toISOString(), journeys: [], ui: [], perf: [], storage: null, errors: [] };

// ---------- dữ liệu mẫu (sandbox: khoá sbx.*) ----------
const DAY = 864e5, NOW = Date.now();
const card = (word, vi, pos = 'noun') => ({ word, vi, pos, ex: '', contexts: [], added: NOW - 9 * DAY, mod: NOW - 2 * DAY, srs: { ef: 2.5, interval: 3, reps: 3, lapses: 0, due: NOW - DAY, last: NOW - 4 * DAY, step: 0, S: 3, D: 4 } });
const CARDS = Object.fromEntries([['sustainable', 'bền vững'], ['negotiate', 'đàm phán', 'verb'], ['budget', 'ngân sách'], ['deadline', 'hạn chót'], ['resilience', 'khả năng phục hồi']].map(([w, v, p]) => [w, card(w, v, p)]));
const settings = theme => JSON.stringify({ onboarded: true, theme });
// Trạng thái chụp + quét (dùng chung cho trước/sau). ux1: bật cờ "Một app" (Học/Ôn/Luyện/Giải đấu/Tôi) như bản live đang chạy.
const STATES = [
  ['home', '/home'], ['vocab', '/vocab'], ['review', '/review'], ['practice', '/practice'], ['skills', '/skills'], ['tests', '/tests'],
  ['me', '/me'], ['settings', '/settings'], ['stats', '/stats'], ['lesson', '/lesson/go?demo=1'],
  ['ux1-home', '/home', { ux1: 1 }], ['ux1-train', '/train', { ux1: 1 }], ['ux1-me', '/me', { ux1: 1 }],
];
// Cột trái máy tính: mép trái nội dung của mục menu, khối tiến độ và chân thanh bên phải thẳng một hàng
const ALIGN = [{ name: 'sidebar', items: ['.sidebar #nav > a', '.sidebar #nav > details > summary', '.sidebar .side-foot > :first-child'] }];

const vp = w => w <= 430 ? { ...devices['Pixel 7'], viewport: { width: w, height: 844 }, screen: { width: w, height: 844 } } : { viewport: { width: w, height: w >= 1200 ? 900 : 1024 }, deviceScaleFactor: 1 };
const INIT = ({ seed, theme }) => {
  try { for (const [k, v] of Object.entries(seed || {})) if (localStorage.getItem(k) == null) localStorage.setItem(k, v); } catch { /* */ }
  window.__rej = []; addEventListener('unhandledrejection', e => window.__rej.push(String((e.reason && (e.reason.stack || e.reason.message)) || e.reason).slice(0, 200)));
};

async function context(w, theme, { seed = {}, ux1 = 0 } = {}) {
  const ctx = await browser.newContext({ ...vp(w), colorScheme: theme, locale: 'en-US', reducedMotion: 'no-preference', serviceWorkers: 'block' });
  const s = { 'sbx.settings': settings(theme), 'sbx.cards': JSON.stringify(CARDS), ...seed }; if (ux1) s['lk.ux1'] = '1';
  await ctx.addInitScript(INIT, { seed: s, theme });
  await ctx.addInitScript(DETECT);
  const errs = [], bad = [];
  await ctx.route('**/*', r => {
    const u = new URL(r.request().url());
    if (LOCAL && u.origin !== O) { const t = r.request().resourceType(); return r.fulfill({ status: 200, contentType: t === 'script' ? 'text/javascript' : t === 'stylesheet' ? 'text/css' : t === 'image' ? 'image/gif' : 'text/plain', body: t === 'image' ? Buffer.from('R0lGODlhAQABAAAAACw=', 'base64') : '' }); }
    return r.continue();
  });
  const watch = p => {
    p.on('pageerror', e => errs.push('exception: ' + String(e.message).slice(0, 180)));
    p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 200)); });
    p.on('response', res => { const u = new URL(res.url()); if (u.host === HOST && res.status() >= 400 && !(LOCAL && u.pathname.startsWith('/api/'))) bad.push(`${res.status()} ${u.pathname}`); });
    p.on('requestfailed', rq => { const u = new URL(rq.url()), f = (rq.failure() || {}).errorText || ''; if (u.host === HOST && !/ABORTED|ERR_BLOCKED/.test(f)) bad.push(`${f} ${u.pathname}`); });
  };
  ctx.on('page', watch);
  const page = await ctx.newPage();
  return { ctx, page, errs, bad, take: async () => { const rej = await page.evaluate(() => window.__rej.splice(0)).catch(() => []); const out = [...new Set([...errs.splice(0), ...rej.map(x => 'unhandledrejection: ' + x), ...bad.splice(0).map(x => 'request: ' + x)])]; return out; } };
}
const appUrl = hash => `${O}/app/?sandbox=1&hl=en#${hash}`;
async function ready(page) { await page.waitForFunction(() => window.App && document.querySelector('#view') && document.querySelector('#view').children.length > 0, null, { timeout: 30000 }); await sleep(900); }
async function boot(page, hash) { await page.goto(appUrl(hash), { waitUntil: 'load', timeout: 45000 }); await ready(page); }
async function go(page, hash) { await page.evaluate(x => { location.hash = x; }, hash); await sleep(1100); }
// màn không trống / không kẹt: #view có nội dung và không còn vòng quay/khung chờ sau 8 s
async function alive(page) {
  return page.evaluate(async () => {
    const v = document.querySelector('#view'); if (!v) return 'không có #view';
    for (let i = 0; i < 16; i++) { const busy = [...document.querySelectorAll('.spinner, .skeleton, [aria-busy="true"], .loading')].some(e => e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== 'hidden'); if (!busy) break; if (i === 15) return 'kẹt ở màn chờ > 8 s'; await new Promise(r => setTimeout(r, 500)); }
    const txt = v.innerText.trim().length, media = v.querySelectorAll('img, svg, canvas, video').length;
    return txt > 20 || media > 2 ? '' : `màn trống (chữ ${txt}, hình ${media})`;
  });
}
const game = page => page.evaluate(async () => { const g = window.Game ? await Game.get() : null; if (!g) return null; const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); const today = g.days[k] || Object.values(g.days).pop() || {}; return { xp: g.xp, todayXp: today.xp || 0, days: Object.keys(g.days).length }; });

// Lái 1 bài học tới màn kết thúc: luân phiên đáp ĐÚNG / SAI (App._lsn.sess.cur.answer), bấm nghe 1 lần, bỏ qua 1 lần nếu có
const PLAY = async ({ wrongEvery = 2, maxSteps = 60 } = {}) => {
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], w = ms => new Promise(r => setTimeout(r, ms)), nz = s => String(s || '').trim().toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, '');
  const seen = { right: 0, wrong: 0, skip: 0, audio: 0, steps: 0 };
  for (let n = 0; n < maxSteps && !q('.lsn-end'); n++) {
    const it = window.App && App._lsn && App._lsn.sess && App._lsn.sess.cur; if (!it) { if (n === 3 && window.App && App.need) { await App.need('lesson'); await App.routes.lesson('go'); } await w(400); continue; }
    seen.steps++;
    if (q('#lsnGo')) { q('#lsnGo').click(); await w(400); continue; }
    if (!seen.audio && q('#lsnPlay')) { q('#lsnPlay').click(); seen.audio++; await w(300); }
    if (!seen.skip && (q('#lsnNoL') || q('#lsnNoS'))) { (q('#lsnNoL') || q('#lsnNoS')).click(); seen.skip++; await w(500); continue; }
    const wrong = (seen.right + seen.wrong) % wrongEvery === 1;
    if (q('.lsn-opts .lsn-opt')) { const os = qa('.lsn-opts .lsn-opt'); const o = wrong ? os.find(b => b.dataset.o !== String(it.answer)) : os.find(b => b.dataset.o === String(it.answer)); (o || os[0]).click(); }
    else if (q('#lsnBank')) { const used = new Set(), ws = String(it.answer).split(/\s+/); if (wrong) ws.reverse(); for (const x of ws) { const b = qa('#lsnBank .lsn-tile').find(t => !used.has(t) && nz(t.textContent) === nz(x)); if (b) { used.add(b); b.click(); await w(40); } } }
    else if (q('#lsnIn')) { q('#lsnIn').value = wrong ? 'zzz' : it.answer; q('#lsnIn').dispatchEvent(new Event('input', { bubbles: true })); }
    else if (q('.lsn-match')) { for (const a of qa('.lsn-match [data-s="w"]')) { a.click(); const b = q(`.lsn-match [data-s="m"][data-m="${a.dataset.m}"]`); if (b) b.click(); await w(60); } }
    else if (q('#lsnNoS')) { q('#lsnNoS').click(); await w(400); continue; }
    await w(150);
    if (q('#lsnCheck') && !q('#lsnCheck').disabled) { q('#lsnCheck').click(); wrong ? seen.wrong++ : seen.right++; }
    await w(500); if (q('#lsnNext')) q('#lsnNext').click(); await w(500);
  }
  return { ...seen, end: !!q('.lsn-end'), again: !!q('#lsnAgain') };
};

// ---------- 1) Hành trình học ----------
async function journey(w, theme) {
  const tag = `journey@${w}${theme[0]}`, fails = [], steps = [];
  const { ctx, page, take } = await context(w, theme, { ux1: 1, seed: { 'sbx.settings': JSON.stringify({ theme }) } }); // chưa onboarded → đi qua thiết lập; ux1 = như bản live (cờ ux1=1) – #/lesson/go cần ux1
  const ok = (c, m) => { if (!c) { fails.push(m); console.log(`  ✗ [${tag}] ${m}`); } return !!c; };
  const step = async (name, fn) => {
    const t0 = Date.now();
    try { await fn(); } catch (e) { ok(false, `${name}: kịch bản dừng – ${String(e.message).split('\n')[0].slice(0, 200)}`); }
    const a = await alive(page).catch(e => 'đầu dò lỗi ' + e.message); ok(!a, `${name}: ${a}`);
    for (const e of await take()) ok(false, `${name}: ${e}`);
    await page.screenshot({ path: `${OUT}/shots/${tag}-${name}.png` }).catch(() => {});
    steps.push({ name, ms: Date.now() - t0 });
  };
  // hộp "Lên cấp N!" bật trễ sau khi cộng XP → che nút đang bấm; người dùng thật bấm "Awesome!" rồi đi tiếp
  const levelUp = async () => { const b = page.locator('#modal:not([hidden]) #modalBox button[data-close]').first(); if (await b.isVisible().catch(() => false)) { await b.click().catch(() => {}); await sleep(400); } };
  const click = async (sel, wait = 450) => { await levelUp(); const l = page.locator(sel).first(); await l.waitFor({ state: 'visible', timeout: 10000 }); await l.click({ timeout: 8000 }); await sleep(wait); };
  const has = sel => page.locator(sel).first().isVisible().catch(() => false);

  await step('onboarding', async () => {
    await boot(page, '/welcome/setup');
    if (await has('#noAcct')) await click('#noAcct');
    await click('button.trk-opt'); await click('#obNext', 300);
    await click('.trk-lv [data-lv]:not([data-lv="test"])');
    for (let i = 0; i < 8 && !(await has('#go')); i++) await click('#obNext', 300);
    await click('#go', 1500);
    ok(!/welcome/.test(page.url()), 'thiết lập xong → rời màn chào (' + page.url().replace(O, '') + ')');
    ok(JSON.parse(await page.evaluate(() => localStorage.getItem('sbx.settings')) || '{}').onboarded, 'đã lưu onboarded trong sandbox');
  });
  let g0 = null;
  await step('lesson', async () => {
    g0 = await game(page);
    await go(page, '/lesson/go'); await sleep(800);
    const r = await page.evaluate(PLAY, {});
    ok(r.end, `bài học tới màn kết thúc (${JSON.stringify(r)})`);
    ok(r.right > 0 && r.wrong > 0, `đã trả lời cả đúng (${r.right}) và sai (${r.wrong})`);
    const g1 = await game(page);
    ok(g0 && g1 && g1.xp > g0.xp, `XP tăng sau bài học (${g0 && g0.xp} → ${g1 && g1.xp})`);
    ok(g1 && g1.todayXp > 0, 'XP hôm nay > 0 (chuỗi ngày được tính)');
    const ui = await page.locator('.lsn-end').innerText().catch(() => '');
    ok(/\d/.test(ui), 'màn kết thúc có số liệu (XP/điểm)');
    if (r.again) { await click('#lsnAgain', 900); ok(await page.evaluate(() => !!(App._lsn && App._lsn.sess && App._lsn.sess.cur) && !document.querySelector('.lsn-end')), 'làm lại → bài mới bắt đầu'); }
    await page.goBack(); await sleep(900);
    ok(!/lesson\/go/.test(page.url()) || !(await has('.lsn-end')), 'back thoát khỏi bài học');
  });
  await step('review', async () => {
    const due0 = await page.evaluate(async () => Object.values(await Core.Cards.all()).filter(c => c.srs && c.srs.due <= Date.now()).length);
    await go(page, '/review');
    for (let i = 0; i < 24 && !(await has('.rev-done')); i++) {
      if (await has('#typeIn')) { await page.fill('#typeIn', i % 2 ? 'zzz' : ''); await page.press('#typeIn', 'Enter'); await sleep(500); }
      else if (await has('[data-opt="0"]')) await click('[data-opt="0"]', 500);
      else if (await has('#flipBtn')) await click('#flipBtn', 350);
      if (await has('[data-grade="2"]')) await click('[data-grade="2"]', 600); else await sleep(400);
    }
    ok(await has('.rev-done'), 'xong phiên ôn thẻ đến hạn');
    const due1 = await page.evaluate(async () => Object.values(await Core.Cards.all()).filter(c => c.srs && c.srs.due <= Date.now()).length);
    ok(due0 > 0 && due1 < due0, `số thẻ đến hạn giảm (${due0} → ${due1})`);
  });
  await step('practice', async () => {
    await go(page, '/practice');
    const start = page.locator('#view .btn.primary, #view a.btn.lg').first();
    if (await start.isVisible().catch(() => false)) { await start.click().catch(() => {}); await sleep(900); }
    for (let i = 0; i < 6; i++) { const o = page.locator('#view .option, #view .lsn-opt, #view [data-opt]').first(); if (!(await o.isVisible().catch(() => false))) break; await o.click().catch(() => {}); await sleep(700); }
  });
  await step('skills', async () => { await go(page, '/skills'); ok(await page.locator('#view a[href^="#/"]').count() >= 3, 'trang Kỹ năng có ≥ 3 lối vào'); });
  await step('tests', async () => {
    await go(page, '/tests'); ok(await page.locator('#view a[href^="#/"]').count() >= 2, 'trang Thi thử có lối vào bài thi');
    await go(page, '/placement'); if (await has('#go')) await click('#go', 600);
    let n = 0; for (; n < 6; n++) { const o = page.locator('.pl-wrap .option[data-k]:not([data-k="-1"])'); if (!(await o.count())) break; await o.nth(n % 2).click().catch(() => {}); await sleep(450); }
    ok(n >= 3, `kiểm tra trình độ: trả lời được ${n} câu`);
  });
  await step('me', async () => { await go(page, '/me'); await go(page, '/stats'); });
  await step('theme', async () => {
    await go(page, '/settings');
    const lum = () => page.evaluate(() => { const c = getComputedStyle(document.body).backgroundColor.match(/\d+(\.\d+)?/g).map(Number); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; });
    await click('#sTheme button[data-v="dark"]', 600);
    ok(await page.evaluate(() => document.documentElement.getAttribute('data-theme')) === 'dark', 'chọn Tối → html[data-theme=dark]');
    const d = await lum(); ok(d < 0.35, `nền tối thật sự tối (độ sáng ${d.toFixed(2)})`);
    await page.screenshot({ path: `${OUT}/shots/${tag}-theme-dark.png` }).catch(() => {});
    await click('#sTheme button[data-v="light"]', 600);
    const l = await lum(); ok(l > 0.6, `nền sáng thật sự sáng (độ sáng ${l.toFixed(2)})`);
    ok(JSON.parse(await page.evaluate(() => localStorage.getItem('sbx.settings')) || '{}').theme === 'light', 'đã lưu lựa chọn giao diện');
  });
  await step('back', async () => {
    await go(page, '/vocab'); await go(page, '/skills'); await go(page, '/me');
    await page.goBack(); await sleep(900); ok(/#\/skills/.test(page.url()), 'back 1 → #/skills (' + page.url().split('#')[1] + ')');
    await page.goBack(); await sleep(900); ok(/#\/vocab/.test(page.url()), 'back 2 → #/vocab (' + page.url().split('#')[1] + ')');
    await page.reload({ waitUntil: 'load' }); await ready(page);
    ok(!/welcome/.test(page.url()), 'tải lại: không quay về màn chào');
  });
  R.journeys.push({ tag, ok: !fails.length, fails, steps });
  console.log(`${fails.length ? '✗' : '✓'} ${tag} (${steps.length} bước)`);
  await ctx.close();
}

// ---------- 2) Quét giao diện + chụp (dùng cho trước/sau) ----------
async function ui(w, theme) {
  for (const ux of [0, 1]) {
    const list = STATES.filter(s => !!(s[2] && s[2].ux1) === !!ux); if (!list.length) continue;
    const { ctx, page, take } = await context(w, theme, { ux1: ux });
    if (AXE) await ctx.addInitScript(AXE);
    for (const [name, hash] of list) {
      const ctxKey = `${name}@${w}${theme[0]}`, rec = { state: name, w, theme, key: ctxKey, issues: [], cls: 0, errors: [] };
      try {
        await page.goto('about:blank'); await boot(page, hash);
        await page.evaluate(() => { scrollTo(0, 0); if (document.activeElement) document.activeElement.blur(); });
        await sleep(600);
        rec.issues = await page.evaluate(o => QAB.scan(o), { tap: 44, align: w >= 901 ? ALIGN : [] });
        const pf = await page.evaluate(() => QAB.perf()); rec.cls = pf.cls;
        if (pf.cls > BUDGET.cls) rec.issues.push({ k: 'cls', sev: 'fail', sig: 'cls|' + name, msg: `CLS ${pf.cls} > ${BUDGET.cls} (${pf.clsSrc.join(', ')})` });
        if (AXE) {
          const cc = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: ['color-contrast'], resultTypes: ['violations'] }); return r.violations.flatMap(v => v.nodes.map(n => ({ t: n.target.join(' '), m: (n.any[0] || {}).message || '' }))); }).catch(e => { rec.errors.push('axe không chạy được: ' + String(e.message).slice(0, 120)); return []; });
          for (const c of cc.slice(0, 20)) rec.issues.push({ k: 'contrast', sev: 'fail', sig: 'contrast|' + c.t.replace(/:nth-child\(\d+\)/g, '').slice(0, 120), msg: `${c.t} – ${c.m.slice(0, 140)}` });
        }
        await page.screenshot({ path: `${OUT}/shots/${ctxKey}.png` });
      } catch (e) { rec.errors.push('quét dừng: ' + String(e.message).split('\n')[0].slice(0, 200)); }
      rec.errors.push(...await take());
      R.ui.push(rec);
      const nf = rec.issues.filter(i => i.sev === 'fail').length;
      console.log(`${nf || rec.errors.length ? '•' : '✓'} ${ctxKey}: ${nf} lỗi giao diện, ${rec.errors.length} lỗi JS/request`);
    }
    await ctx.close();
  }
}

// ---------- 3) Hiệu năng: chuyển tab → FPS, long task, INP ----------
async function perf(w) {
  const { ctx, page, take } = await context(w, 'light');
  const rec = { w, fps: [], long: 0, inp: 0, fails: [], warns: [] };
  try {
    await boot(page, '/home'); await sleep(1500);
    await page.evaluate(() => QAB.reset());
    const tabs = w >= 901 ? '.sidebar #nav a[href^="#/"]:visible, .sidebar #nav summary:visible' : '#bnav a[href^="#/"]:visible';
    const n = Math.min(await page.locator(tabs).count(), 6);
    for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) {
      const el = page.locator(tabs).nth(i); if (!(await el.isVisible().catch(() => false))) continue;
      const f = page.evaluate(() => QAB.fps(700)); await el.click({ timeout: 5000 }).catch(() => {}); rec.fps.push(await f); await sleep(250);
    }
    const p = await page.evaluate(() => QAB.perf());
    rec.long = p.long.reduce((m, x) => Math.max(m, x.d), 0); rec.inp = p.inp; rec.cls = p.cls;
    const avg = rec.fps.length ? Math.round(rec.fps.reduce((s, x) => s + x.fps, 0) / rec.fps.length) : 0, worst = Math.max(0, ...rec.fps.map(x => x.worst));
    rec.avgFps = avg; rec.worstFrame = worst;
    if (!rec.fps.length) rec.fails.push('không bấm được tab nào để đo');
    if (rec.inp > BUDGET.inpFail) rec.fails.push(`INP ${rec.inp} ms > ${BUDGET.inpFail}`); else if (rec.inp > BUDGET.inpWarn) rec.warns.push(`INP ${rec.inp} ms > ${BUDGET.inpWarn}`);
    if (rec.long > BUDGET.longFail) rec.fails.push(`long task ${rec.long} ms > ${BUDGET.longFail}`); else if (rec.long > BUDGET.longWarn) rec.warns.push(`long task ${rec.long} ms > ${BUDGET.longWarn}`);
    if (rec.fps.length && avg < BUDGET.fpsFail) rec.fails.push(`FPS chuyển tab ${avg} < ${BUDGET.fpsFail}`); else if (avg < BUDGET.fpsWarn) rec.warns.push(`FPS chuyển tab ${avg} < ${BUDGET.fpsWarn}`);
  } catch (e) { rec.fails.push('đo dừng: ' + String(e.message).split('\n')[0].slice(0, 200)); }
  for (const e of await take()) rec.fails.push(e);
  R.perf.push(rec); console.log(`${rec.fails.length ? '✗' : '✓'} perf@${w}: FPS ${rec.avgFps} (khung tệ nhất ${rec.worstFrame} ms) · INP ${rec.inp} ms · long ${rec.long} ms`);
  await ctx.close();
}

// ---------- 4) Dung lượng sau N bài ----------
async function storage() {
  const { ctx, page, take } = await context(390, 'light');
  const rec = { lessons: LESSONS, points: [], fails: [] };
  try {
    await boot(page, '/home'); await sleep(1200);
    rec.points.push(await page.evaluate(() => QAB.storage()));
    for (let i = 0; i < LESSONS; i++) {
      await go(page, '/home'); await go(page, '/lesson/go'); await sleep(800);
      const r = await page.evaluate(PLAY, { wrongEvery: 3 }); if (!r.end) rec.fails.push(`bài ${i + 1} không tới màn kết thúc`);
      await sleep(1500); rec.points.push(await page.evaluate(() => QAB.storage()));
    }
    const a = rec.points[0], b = rec.points[rec.points.length - 1];
    rec.lsGrowth = Math.round((b.ls - a.ls) / LESSONS); rec.idbGrowth = Math.round((b.idb - a.idb) / LESSONS); rec.lsTotal = b.ls;
    rec.topKeys = Object.entries(b.keys).map(([k, v]) => [k, v - (a.keys[k] || 0)]).sort((x, y) => y[1] - x[1]).slice(0, 5);
    if (rec.lsTotal > BUDGET.lsTotal) rec.fails.push(`localStorage ${rec.lsTotal} B > ${BUDGET.lsTotal}`);
    if (rec.lsGrowth > BUDGET.lsPerLesson) rec.fails.push(`localStorage tăng ${rec.lsGrowth} B/bài > ${BUDGET.lsPerLesson} (${rec.topKeys.map(x => x.join('+')).join(', ')})`);
    if (rec.idbGrowth > BUDGET.idbPerLesson) rec.fails.push(`IndexedDB tăng ${rec.idbGrowth} B/bài > ${BUDGET.idbPerLesson}`);
  } catch (e) { rec.fails.push('đo dừng: ' + String(e.message).split('\n')[0].slice(0, 200)); }
  for (const e of await take()) rec.fails.push(e);
  rec.points.forEach(p => delete p.keys);
  R.storage = rec; console.log(`${rec.fails.length ? '✗' : '✓'} storage: +${rec.lsGrowth} B/bài localStorage, +${rec.idbGrowth} B/bài IDB, tổng LS ${rec.lsTotal} B`);
  await ctx.close();
}

try {
  if (ONLY.includes('journeys')) { await journey(390, 'light'); await journey(1440, 'dark'); }
  if (ONLY.includes('ui')) for (const w of WIDTHS) for (const t of THEMES) await ui(w, t);
  if (ONLY.includes('perf')) for (const w of [390, 1440]) await perf(w);
  if (ONLY.includes('storage')) await storage();
} catch (e) { R.errors.push('bot dừng: ' + e.message); }
await browser.close(); if (srv) srv.close();

// ---------- kết luận + baseline ----------
const bl = (() => { try { return JSON.parse(fs.readFileSync(BASELINE, 'utf8')).known || {}; } catch { return {}; } })();
const seen = {}, fresh = [];
for (const u of R.ui) for (const i of u.issues.filter(i => i.sev === 'fail')) { (seen[i.sig] = seen[i.sig] || []).push(u.key); if (!bl[i.sig]) fresh.push({ ...i, key: u.key }); }
const stale = ONLY.includes('ui') && WIDTHS.length === 3 && THEMES.length === 2 ? Object.keys(bl).filter(s => !seen[s]) : [];
if (WRITE_BL) fs.writeFileSync(WRITE_BL, JSON.stringify({ note: 'Lỗi giao diện đã biết (qa-bot). Chỉ được XOÁ dòng khi đã sửa – không thêm dòng để làm xanh. docs/QA-BOT.md', known: Object.fromEntries(Object.entries(seen).sort().map(([k, v]) => [k, [...new Set(v)].slice(0, 6)])) }, null, 1) + '\n');
const jsErr = R.ui.flatMap(u => u.errors.map(e => `${u.key}: ${e}`));
const fails = [...R.journeys.flatMap(j => j.fails.map(f => `${j.tag}: ${f}`)), ...jsErr, ...fresh.map(i => `${i.key}: [${i.k}] ${i.msg}`), ...R.perf.flatMap(p => p.fails.map(f => `perf@${p.w}: ${f}`)), ...(R.storage ? R.storage.fails.map(f => 'storage: ' + f) : []), ...R.errors, ...stale.map(s => `baseline cũ: "${s}" không còn tái hiện → xoá dòng này khỏi ${BASELINE} (ratchet)`)];
R.fresh = fresh; R.stale = stale; R.fails = fails; R.counts = Object.fromEntries(['hscroll', 'clip', 'spill', 'offscreen', 'covered', 'align', 'indicator', 'tap', 'contrast', 'cls'].map(k => [k, R.ui.reduce((s, u) => s + u.issues.filter(i => i.k === k && i.sev === 'fail').length, 0)]));
fs.writeFileSync(OUT + '/report.json', JSON.stringify(R, null, 1));
const md = [`## 🤖 qa-bot – ${O}`, '', fails.length ? `❌ **${fails.length} lỗi**` : '✅ **xanh**', '',
  '| Hành trình | Kết quả |', '|---|---|', ...R.journeys.map(j => `| ${j.tag} | ${j.ok ? '✅' : '❌ ' + j.fails.length} |`), '',
  '| Đầu dò (lỗi fail, mọi cỡ × giao diện) | Số | ', '|---|---|', ...Object.entries(R.counts).map(([k, v]) => `| ${k} | ${v} |`), '',
  `Lỗi giao diện MỚI (ngoài baseline): **${fresh.length}** · baseline đã biết: ${Object.keys(bl).length} · baseline cũ cần xoá: ${stale.length}`, '',
  ...R.perf.map(p => `- perf@${p.w}: FPS ${p.avgFps}, khung tệ nhất ${p.worstFrame} ms, INP ${p.inp} ms, long task ${p.long} ms ${p.fails.length ? '❌' : p.warns.length ? '⚠️ ' + p.warns.join('; ') : '✅'}`),
  R.storage ? `- dung lượng sau ${R.storage.lessons} bài: +${R.storage.lsGrowth} B/bài localStorage, +${R.storage.idbGrowth} B/bài IndexedDB, tổng ${R.storage.lsTotal} B ${R.storage.fails.length ? '❌' : '✅'}` : '', '',
  fails.length ? '<details open><summary>Chi tiết lỗi</summary>\n\n' + fails.slice(0, 80).map(f => '- ' + f.replace(/\|/g, '\\|')).join('\n') + (fails.length > 80 ? `\n- … +${fails.length - 80}` : '') + '\n</details>' : ''];
fs.writeFileSync(OUT + '/summary.md', md.join('\n') + '\n');
console.log(md.join('\n'));
process.exit(fails.length ? 1 : 0);
