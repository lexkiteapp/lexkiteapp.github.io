// 👆 Màn Ôn (Stitch v2, #/review?hub=1): MỌI nút trên điện thoại phải bấm được (chạm thật) và có tác dụng – chặn tái phát lỗi chủ báo 1/11
// ("nhiều nút click ko dc" trên iPhone Safari, giao diện tối). Chạy trên WebKit (iPhone) + Chromium (Android), 375×812, tối và sáng.
// Mỗi nút: không bị lớp nào đè (elementFromPoint ở tâm), vùng chạm ≥ 44 px (đo bằng điểm chạm cách tâm 21 px – tính cả ::after nới vùng chạm),
// chạm (touchscreen.tap) → đổi đúng trang. Hermetic: phục vụ web/ trên https://lk.test, chặn mọi host khác.
// Chạy: node scripts/test/review-taps.mjs [web] [thư-mục-ảnh]   (CI: .github/workflows/review-taps.yml; cần playwright + chromium/webkit)
import fs from 'node:fs'; import path from 'node:path';
import { chromium, webkit, devices } from 'playwright';
import { serve } from './stitch-screens.mjs';
const ROOT = path.resolve(process.argv[2] || 'web'), OUT = process.argv[3] || 'out/review-taps'; fs.mkdirSync(OUT, { recursive: true });
let fails = 0, total = 0; const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const HUB = '#/review?hub=1';
// [nhãn, bộ chọn, trang mong đợi (tiền tố hash) | null = tab đang mở (chỉ kiểm chạm tới được)]
const TARGETS = [
  ['đầu trang: kỳ thi', '.v2 header a[data-hdr="exam"]', '#/goal'],
  ['đầu trang: chuỗi ngày', '.v2 header a[data-hdr="streak"]', '#/streak'],
  ['đầu trang: XP', '.v2 header a[data-hdr="xp"]', '#/league'],
  ['đầu trang: mục tiêu hôm nay', '.v2 header a[data-hdr="goal"]', '#/stats'],
  ['đầu trang: tài khoản', '.v2 header a[href="#/me"]', '#/me'],
  ['Bắt đầu ôn', '#start-review-btn', '#/review'],
  ['chip sắp quên', '.v2-review main button[data-href^="#/review"][aria-label]:not(#start-review-btn)', '#/review'],
  ['chip quen', '.v2-review main a[href^="#/review"][aria-label]', '#/review'],
  ['ô Thẻ sẵn sàng', '.v2-review main .grid > a:nth-child(1)', '#/review'],
  ['ô Đang luyện', '.v2-review main .grid > a:nth-child(2)', '#/deck?m=12'],
  ['ô Nhớ lâu', '.v2-review main .grid > a:nth-child(3)', '#/deck?m=3'],
  ['Quản lý', '.v2-review main button[data-href="#/deck"]', '#/deck'],
  ['tab Học', '.v2 nav a[data-tab="learn"]', '#/home'],
  ['tab Ôn (đang mở)', '.v2 nav a[data-tab="review"]', null],
  ['tab Luyện', '.v2 nav a[data-tab="train"]', '#/train'],
  ['tab Giải đấu', '.v2 nav a[data-tab="league"]', '#/league'],
  ['tab Tôi', '.v2 nav a[data-tab="me"]', '#/me'],
];
// thẻ bộ (theo nguồn): chạm giữa thẻ VÀ chạm vào chip "n đến hạn" đều mở bộ đó
const DECK = '.v2-review main a[href^="#/deck?from="]';

const seed = async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; await App.saveSettings();
  const now = Date.now(), mk = (w, srs, web) => ({ word: w, vi: w + ' (vi)', ipa: '', topic: web ? 'mine' : 'ielts', added: now - 1e6, contexts: web ? [{ text: 'a ' + w, source: 'https://example.com/a', at: now }] : [], col: [], syn: [], ant: [], examples: [],
    srs: Object.assign({ ef: 2.5, interval: 0, reps: 0, lapses: 0, due: now, last: 0 }, srs) });
  const map = { hello: mk('hello', { interval: 3, reps: 2, due: now - 1000, last: now - 4e8 }, true), world: mk('world', { interval: 30, reps: 5, due: now + 9e8, last: now - 1e8 }, true), focus: mk('focus', { interval: 5, reps: 3, due: now + 5e8, last: now - 2e8 }, true) };
  for (let i = 0; i < 12; i++) map['word' + i] = mk('word' + i, {}, false);
  await Core.Cards.save(map); App.state.cards = await Core.Cards.all(); };

async function run(type, name, opts, scheme) {
  const browser = await type.launch(), ctx = await browser.newContext({ ...opts, colorScheme: scheme, serviceWorkers: 'block' }); await serve(ctx, ROOT);
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  const tag = `${name}/${scheme}`, hub = async () => { await page.evaluate(h => { location.hash = h; }, HUB); await page.waitForSelector('.v2-review', { timeout: 15000 }); await page.waitForTimeout(250); };
  await page.goto('https://lk.test/app/?sandbox=1#/home', { waitUntil: 'load' }); await page.waitForFunction(() => window.App && App.state && App.saveSettings && window.Core, null, { timeout: 30000 });
  await page.evaluate(seed); await page.goto('https://lk.test/app/?sandbox=1' + HUB, { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.v2-review', { timeout: 30000 }); await page.waitForTimeout(800);
  ok(!(await page.evaluate(() => document.body.classList.contains('focus'))), `${tag}: màn Ôn không ở chế độ tập trung (thanh tab hiện)`);
  await page.screenshot({ path: path.join(OUT, `hub-${name}-${scheme}.png`) });
  { const f = await page.evaluate(() => { const svg = document.querySelector('.v2-review main svg[viewBox="0 0 120 120"]'), lab = svg && svg.parentElement.querySelectorAll('span')[1]; if (!lab) return null; // vòng: r 50 nét 9 (viewBox 120) → lòng tròn r 45.5
      const s = svg.getBoundingClientRect(), r = s.width * 45.5 / 120, cx = s.left + s.width / 2, cy = s.top + s.height / 2, L = lab.getBoundingClientRect(), ws = [], rg = document.createRange(); rg.selectNodeContents(lab);
      for (const q of rg.getClientRects()) ws.push(q); const inside = ws.every(q => [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]].every(([x, y]) => Math.hypot(x - cx, y - cy) <= r + 0.5));
      return { inside, w: Math.round(L.width), lines: ws.length }; });
    ok(f && f.inside, `${tag}: chữ "Cần ôn hôm nay" nằm trọn trong lòng vòng tròn${f ? ` (rộng ${f.w}px, ${f.lines} dòng)` : ''}`); }
  // Kiểm 1 phần tử: cuộn vào giữa, không bị đè, vùng chạm ≥ 44 px, chạm → đúng trang
  const check = async (label, sel, want, nth = 0, inner = null) => {
    await hub(); const loc = page.locator(sel).nth(nth); if (!(await loc.count())) { ok(false, `${tag}: ${label} – không có phần tử (${sel})`); return; }
    const pt = await loc.evaluate((el, inner) => { const t = inner ? el.closest('.relative').querySelector(inner) : el; if (!t) return { miss: 'không thấy ' + inner };
      if (!el.closest('header, nav')) t.scrollIntoView({ block: 'center' }); const r = t.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const hit = (x, y) => { const h = document.elementFromPoint(x, y); return !!h && (h === el || el.contains(h)); }, top = document.elementFromPoint(cx, cy);
      return { x: cx, y: cy, w: r.width, h: r.height, center: hit(cx, cy), by: top && !(top === el || el.contains(top)) ? `${top.tagName}.${String(top.className).slice(0, 50)}` : '',
        tall: hit(cx, cy - 21) && hit(cx, cy + 21), wide: hit(cx - 21, cy) && hit(cx + 21, cy) }; }, inner);
    if (pt.miss) { ok(false, `${tag}: ${label} – ${pt.miss}`); return; }
    ok(pt.center, `${tag}: ${label} – không bị lớp nào đè${pt.by ? ' (bị ' + pt.by + ' đè)' : ''}`);
    ok(pt.tall && pt.wide, `${tag}: ${label} – vùng chạm ≥ 44×44 px (hộp ${Math.round(pt.w)}×${Math.round(pt.h)})`);
    if (want === null) return;
    const before = await page.evaluate(() => location.hash); await page.touchscreen.tap(pt.x, pt.y);
    const got = await page.waitForFunction(([b, w]) => location.hash !== b && location.hash.startsWith(w) ? location.hash : false, [before, want], { timeout: 5000 }).then(h => h.jsonValue()).catch(() => null);
    ok(!!got, `${tag}: ${label} – chạm → ${want}${got ? '' : ' (vẫn ở ' + (await page.evaluate(() => location.hash)) + ')'}`); };
  for (const [label, sel, want] of TARGETS) await check(label, sel, want);
  await hub(); const decks = await page.locator(DECK).count(); ok(decks >= 2, `${tag}: có ≥ 2 thẻ bộ (web + thư viện), thấy ${decks}`);
  for (let i = 0; i < decks; i++) { const href = await page.locator(DECK).nth(i).getAttribute('href');
    await check(`thẻ bộ ${href}`, DECK, href, i); await check(`chip đến hạn của ${href}`, DECK, href, i, ':scope > div:last-child > span:first-child'); }
  ok(!errs.length, `${tag}: không lỗi JS${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await browser.close(); }

const PHONE = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const iPhone = { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } };
for (const scheme of ['dark', 'light']) {
  await run(webkit, 'webkit-iphone', iPhone, scheme);
  await run(chromium, 'chromium-android', PHONE, scheme); }
console.log(`${fails ? '✗' : '✓'} review-taps: ${total - fails}/${total}`);
process.exit(fails ? 1 : 0);
