// 🌍 Probe hành trình cho bảng World (docs/WORLD-SCORECARD.md): đo bằng máy trên dist phục vụ CỤC BỘ (scripts/quality/serve.mjs, /api/* giả lập),
// mọi host ngoài = rỗng → 0 lượt chạm prod. CHỈ chạy trên CI (Playwright). Ghi reports/world/probe.json; thoát 1 khi hành trình không tới đích.
//   firstRun: mở trang giới thiệu → bấm nút chính → thiết lập (giữ mặc định) → tới bài đầu → câu trả lời được chấp nhận đầu tiên (giây máy + số chạm)
//   today: người đã thiết lập mở /app/ → số chạm tới màn học của bài hôm nay
// Dùng: node scripts/world/probe.mjs --root dist [--lang en] [--out reports/world/probe.json]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { serve } from '../quality/serve.mjs';

if (!process.env.CI && !process.argv.includes('--local')) { console.error('probe chỉ chạy trên CI (Playwright) – docs/METHODS.md §4'); process.exit(75); }
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const ROOT = path.resolve(arg('root', 'dist')), LANG = arg('lang', 'en'), OUT = arg('out', 'reports/world/probe.json');
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS ||= '1'; // chặn cả fetch từ SW (giống journey-e2e)
const srv = await serve(ROOT, 0), O = srv.origin;
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['Pixel 7'], locale: 'en-US' });
await ctx.route('**/*', r => { const u = new URL(r.request().url()); return u.origin === O ? r.fallback() : r.fulfill({ status: 204, body: '' }); });
const page = await ctx.newPage(), errs = [];
page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const vis = async sel => { const l = page.locator(sel).first(); return (await l.count()) && (await l.isVisible().catch(() => false)) ? l : null; };
// một "chạm" = một click người dùng; trail ghi bộ chọn để soi khi số chạm tăng
function counter() { const c = { taps: 0, trail: [] }; c.tap = async (sel, wait = 300) => { const l = await vis(sel); if (!l) return false; await l.click(); c.taps++; c.trail.push(sel); await sleep(wait); return true; }; return c; }
// nút chính hero trang giới thiệu (khung Stitch: data-cta=start, trỏ #/welcome/setup) – scripts/test/probe-cta.mjs khóa nó khớp landing dựng thật, cùng bộ chọn với journey-e2e
const CTA = '[data-cta=start], .ctas a.btn.lg';
const ANSWER = ['#known', '#gotIt', '.option[data-k]:not([data-k="-1"])', '.choice:not([disabled])'];
const NEXT = ['a.path-cta', 'ol.day-steps a[data-step="learn"]:not(.ok)', 'ol.day-steps a[data-step]:not(.ok)', '#view a.btn.primary', '#view button.btn.primary'];
async function answered() { // màn học có câu trả lời được chấp nhận (thẻ "đã biết"/đáp án đúng/qua thẻ kế)
  return page.evaluate(() => !!document.querySelector('.option.correct, .choice.correct, .study-wrap .celebrate') || (window.__lkAns || 0) > 0).catch(() => false);
}
// tới màn học = thấy nút trả lời (ANSWER) hoặc màn học đã mở (thẻ cần lật / khung .study-wrap – vd. #/practice/learn); chờ tới 4 s sau mỗi chạm
const ARRIVE = [...ANSWER, '.study-wrap #flipBtn', '.study-wrap'];
async function arrived(list) { for (const s of list) if (await vis(s)) return s; return null; }
async function toLesson(c, { list = ANSWER, max = 8 } = {}) {
  for (let i = 0; i < max; i++) {
    const hit = await arrived(list); if (hit) return hit;
    let moved = false; for (const s of NEXT) if (await c.tap(s, 300)) { moved = true; break; }
    await page.waitForSelector(list.join(', '), { state: 'visible', timeout: moved ? 4000 : 1500 }).catch(() => {});
  }
  return arrived(list);
}

const PICK = '[data-track]';
const res = { at: new Date().toISOString(), lang: LANG, device: 'Pixel 7', firstRun: { ok: false }, today: { ok: false }, errors: errs };
try {
  const c = counter(), t0 = Date.now();
  await page.route(/\/app\/\?hl=/, r => r.request().isNavigationRequest() && !/sandbox=1/.test(r.request().url()) ? r.fulfill({ status: 302, headers: { location: r.request().url().replace('/app/?', '/app/?sandbox=1&') } }) : r.fallback());
  await page.goto(`${O}/${LANG === 'vi' ? '' : LANG + '/'}`, { waitUntil: 'load' });
  if (!(await c.tap(CTA, 1200))) throw new Error('không thấy nút chính trang giới thiệu');
  // bước đầu thiết lập = chọn mục tiêu ([data-track]: thẻ radio ở s=goal, nút .trk-opt ở chọn lộ trình) – cùng bộ chọn với journey-e2e
  // (09/11: bộ chọn cũ 'button.trk-opt' không còn ở s=goal → World scorecard đỏ 10 lượt). Khoá bởi scripts/test/probe-cta.mjs
  await page.waitForSelector(`${PICK}, #noAcct`, { timeout: 15000 });
  await c.tap('#noAcct'); await c.tap(PICK); await c.tap('#obNext', 250);
  await c.tap('.trk-lv [data-lv]:not([data-lv="test"])');
  for (let i = 0; i < 8 && !(await vis('#go')); i++) if (!(await c.tap('#obNext', 250))) await sleep(300);
  if (!(await c.tap('#go', 1500))) throw new Error('không tới nút Bắt đầu (#go)');
  const sel = await toLesson(c); if (!sel) throw new Error('không tới màn học sau thiết lập: ' + page.url().replace(O, ''));
  await page.evaluate(() => { window.__lkAns = 0; document.addEventListener('click', e => { if (e.target.closest('#known,#gotIt,.option,.choice')) setTimeout(() => window.__lkAns++, 0); }, true); });
  await c.tap(sel, 600);
  for (let i = 0; i < 10 && !(await answered()); i++) await sleep(300);
  if (!(await answered())) throw new Error('bấm trả lời nhưng màn không ghi nhận');
  res.firstRun = { ok: true, seconds: Math.round((Date.now() - t0) / 100) / 10, taps: c.taps, trail: c.trail };
} catch (e) { res.firstRun.err = String(e.message || e).slice(0, 200); res.firstRun.url = page.url().replace(O, ''); }
try {
  const c = counter();
  await page.goto(`${O}/app/?sandbox=1&hl=${LANG}#/home`, { waitUntil: 'load' }); await sleep(2500);
  if (/welcome/.test(page.url())) throw new Error('đã thiết lập nhưng /app/ quay về màn chào');
  const sel = await toLesson(c, { list: ARRIVE }); if (!sel) throw new Error('không tới bài hôm nay từ ' + page.url().replace(O, ''));
  res.today = { ok: true, taps: c.taps, trail: c.trail, at: sel, route: page.url().replace(O, '') };
} catch (e) { res.today.err = String(e.message || e).slice(0, 200); }
await browser.close(); srv.close();
fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(res, null, 1) + '\n');
console.log(JSON.stringify({ firstRun: res.firstRun, today: res.today, errors: errs.length }));
process.exit(res.firstRun.ok && res.today.ok ? 0 : 1);
