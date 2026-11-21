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
  ['đầu trang: tài khoản', '.v2 header a[href="#/me"]', '#/me', 'menu'], // avatar mở menu tài khoản (app.js App.accountMenu: sáng/tối, kỳ thi, XP) → mục "Tài khoản" sang #/me
  ['Bắt đầu ôn', '#start-review-btn', '#/review'],
  ['chip sắp quên', '.v2-review main button[data-href^="#/review"][aria-label]:not(#start-review-btn)', ['#/practice/learn?src=forgetting', '#/review']], // có thẻ sắp quên → học nhanh nhóm sắp quên; không có → phiên ôn
  ['chip quen', '.v2-review main a[href^="#/review"][aria-label]', '#/review'],
  ['ô Thẻ sẵn sàng', '.v2-review main .grid > a:nth-child(1)', '#/review'],
  ['ô Đang luyện', '.v2-review main .grid > a:nth-child(2)', '#/deck?m=12'],
  ['ô Nhớ lâu', '.v2-review main .grid > a:nth-child(3)', '#/deck?m=3'],
  ['Quản lý', '.v2-review main button[data-href="#/deck"]', '#/deck'],
  ['tab Hôm nay', '.v2 nav a[data-tab="home"]', '#/home'],
  ['tab Từ vựng', '.v2 nav a[data-tab="vocab"]', '#/vocab'],
  ['tab Kỹ năng', '.v2 nav a[data-tab="skills"]', '#/skills'],
  ['tab Thi', '.v2 nav a[data-tab="tests"]', '#/tests'],
  ['tab Tôi', '.v2 nav a[data-tab="me"]', '#/me'],
];
// thẻ bộ (theo nguồn): chạm giữa thẻ VÀ chạm vào chip "n đến hạn" đều mở bộ đó
const DECK = '.v2-review main a[href^="#/deck?from="]';

const seed = async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.plSkip = 1; await App.saveSettings(); /* plSkip: không hiện hộp mời kiểm tra trình độ (ux1 levelInvite) đè lên trang */
  const now = Date.now(), mk = (w, srs, web) => ({ word: w, vi: w + ' (vi)', ipa: '', topic: web ? 'mine' : 'ielts', added: now - 1e6, contexts: web ? [{ text: 'a ' + w, source: 'https://example.com/a', at: now }] : [], col: [], syn: [], ant: [], examples: [],
    srs: Object.assign({ ef: 2.5, interval: 0, reps: 0, lapses: 0, due: now, last: 0 }, srs) });
  const map = { hello: mk('hello', { interval: 3, reps: 2, due: now - 1000, last: now - 4e8 }, true), world: mk('world', { interval: 30, reps: 5, due: now + 9e8, last: now - 1e8 }, true), focus: mk('focus', { interval: 5, reps: 3, due: now + 5e8, last: now - 2e8 }, true) };
  for (let i = 0; i < 12; i++) map['word' + i] = mk('word' + i, {}, false);
  await Core.Cards.save(map); App.state.cards = await Core.Cards.all(); };

// Chữ trong vòng (số + "Cần ôn hôm nay") nằm trọn trong lòng tròn (r 50, nét 9 / viewBox 120 → r trong 45.5): từng dòng chữ, cả 4 góc
const RING = () => { const svg = document.querySelector('.v2-review main svg[viewBox="0 0 120 120"]'), sp = svg && svg.parentElement.querySelectorAll('span'); if (!sp || sp.length < 2) return null;
  const s = svg.getBoundingClientRect(), r = s.width * 45.5 / 120, cx = s.left + s.width / 2, cy = s.top + s.height / 2, out = [];
  for (const el of [sp[0], sp[1]]) { const rg = document.createRange(); rg.selectNodeContents(el); for (const q of rg.getClientRects()) if (q.width) out.push(q); }
  const worst = Math.max(...out.flatMap(q => [[q.left, q.top], [q.right, q.top], [q.left, q.bottom], [q.right, q.bottom]].map(([x, y]) => Math.hypot(x - cx, y - cy))));
  return { inside: worst <= r + 0.5, over: +(worst - r).toFixed(1), lines: out.length - 1, text: sp[1].textContent.trim() }; };
const ringCheck = async (page, tag) => { const f = await page.evaluate(RING);
  ok(f && f.inside, `${tag}: chữ "${f ? f.text : 'Cần ôn hôm nay'}" nằm trọn trong lòng vòng tròn${f ? ` (${f.lines} dòng${f.inside ? '' : ', lố ' + f.over + 'px'})` : ' – không thấy vòng'}`); return f; };
const LANGS = ['vi', 'en', ...fs.readFileSync(path.resolve(ROOT, '../scripts/i18n-langs.txt'), 'utf8').split('\n').map(x => x.trim()).filter(x => /^[a-z]{2}$/.test(x))];

async function run(type, name, opts, scheme) {
  const browser = await type.launch(), ctx = await browser.newContext({ ...opts, colorScheme: scheme, serviceWorkers: 'block' }); await serve(ctx, ROOT);
  const page = await ctx.newPage(), errs = []; page.on('pageerror', e => errs.push(e.message));
  // Đếm request đang bay: chuyển trang khi fetch (lex-index.json, packs/<lang>.json) còn dở làm WebKit báo "access control checks" (không phải lỗi app) → chỉ đi tiếp khi mạng đã lặng.
  let inflight = 0; page.on('request', () => inflight++); page.on('requestfinished', () => inflight--); page.on('requestfailed', () => inflight--);
  const quiet = async () => { for (let q = 0, end = Date.now() + 15000; q < 3 && Date.now() < end;) { await page.waitForTimeout(150); q = inflight === 0 ? q + 1 : 0; } };
  const tag = `${name}/${scheme}`;
  // Chờ bằng tín hiệu thật của app, không đoán thời gian: lượt điều hướng CUỐI đã vẽ xong (App.drawn: token mới nhất + đúng hash),
  // rồi mọi hiệu ứng hữu hạn trong #view (mờ-trồi khi đổi trang) chạy xong → toạ độ chạm ổn định.
  // (waitForFunction KHÔNG chờ lời hứa: hàm async luôn trả Promise = "đúng" ngay → điều kiện đồng bộ chờ riêng, hiệu ứng chờ bằng evaluate, rồi kiểm lại)
  const drawnOk = w => { const d = App.drawn(); return d.tok === App.routeToken() && d.hash === location.hash && (!w || (location.hash === w && !!document.querySelector('#view .v2-review'))); };
  const settle = async (want, timeout = 15000) => { const end = Date.now() + timeout;
    while (Date.now() < end) {
      if (!(await page.waitForFunction(drawnOk, want, { timeout: Math.max(1, end - Date.now()) }).then(() => true, () => false))) return false;
      await page.evaluate(() => { const v = document.getElementById('view'); return Promise.all((v ? v.getAnimations({ subtree: true }) : []).filter(a => (a.effect && a.effect.getTiming().iterations) !== Infinity).map(a => a.finished.catch(() => {}))).then(() => 0); });
      if (await page.evaluate(drawnOk, want)) return true; } // trong lúc chờ hiệu ứng lại có lượt điều hướng mới → chờ tiếp
    return false; };
  const diag = () => page.evaluate(() => { const d = App.drawn(), v = document.getElementById('view'), f = v && v.firstElementChild;
    return `hash ${location.hash}, vẽ xong ${d.hash} (lượt ${d.tok}/${App.routeToken()}), #view: ${f ? f.tagName + '.' + String(f.className).slice(0, 60) : 'trống'}`; });
  let shot = 0; const hub = async () => { await page.evaluate(h => { location.hash = h; }, HUB); if (await settle(HUB)) return true;
    ok(false, `${tag}: màn Ôn không vẽ lại khi về ${HUB} (${await diag()})`); await page.screenshot({ path: path.join(OUT, `fail-${name}-${scheme}-${++shot}.png`) }).catch(() => {});
    await page.evaluate(() => { location.hash = '#/home'; }); await settle(null); await page.evaluate(h => { location.hash = h; }, HUB); return settle(HUB); }; // gỡ kẹt để kiểm tiếp các nút còn lại
  await page.goto('https://lk.test/app/?sandbox=1#/home', { waitUntil: 'load' }); await page.waitForFunction(() => window.App && App.state && App.saveSettings && window.Core, null, { timeout: 30000 });
  await page.evaluate(seed); await page.goto('https://lk.test/app/?sandbox=1' + HUB, { waitUntil: 'load' }); await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('.v2-review', { timeout: 30000 }); ok(await settle(HUB, 30000), `${tag}: màn Ôn vẽ xong lúc mở (${await diag()})`);
  ok(!(await page.evaluate(() => document.body.classList.contains('focus'))), `${tag}: màn Ôn không ở chế độ tập trung (thanh tab hiện)`);
  await page.screenshot({ path: path.join(OUT, `hub-${name}-${scheme}.png`) });
  await ringCheck(page, tag);
  // Kiểm 1 phần tử: cuộn vào giữa, không bị đè, vùng chạm ≥ 44 px, chạm → đúng trang
  const check = async (label, sel, want, nth = 0, inner = null, via = null) => {
    if (!(await hub())) return; const loc = page.locator(sel).nth(nth); if (!(await loc.count())) { ok(false, `${tag}: ${label} – không có phần tử (${sel})`); return; }
    const pt = await loc.evaluate((el, inner) => { const t = inner ? el.closest('.relative').querySelector(inner) : el; if (!t) return { miss: 'không thấy ' + inner };
      if (!el.closest('header, nav')) t.scrollIntoView({ block: 'center' }); const r = t.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const slip = [], hit = (x, y) => { const h = document.elementFromPoint(x, y), k = !!h && (h === el || el.contains(h)); if (!k) slip.push(`(${Math.round(x)},${Math.round(y)})→${h ? h.tagName + '.' + String(h.className).slice(0, 40) : 'ngoài màn'}`); return k; }, top = document.elementFromPoint(cx, cy);
      return { x: cx, y: cy, w: r.width, h: r.height, center: hit(cx, cy), by: top && !(top === el || el.contains(top)) ? `${top.tagName}.${String(top.className).slice(0, 50)}` : '',
        tall: hit(cx, cy - 21) & hit(cx, cy + 21), wide: hit(cx - 21, cy) & hit(cx + 21, cy), slip }; }, inner);
    if (pt.miss) { ok(false, `${tag}: ${label} – ${pt.miss}`); return; }
    ok(pt.center, `${tag}: ${label} – không bị lớp nào đè${pt.by ? ' (bị ' + pt.by + ' đè)' : ''}`);
    ok(pt.tall && pt.wide, `${tag}: ${label} – vùng chạm ≥ 44×44 px (hộp ${Math.round(pt.w)}×${Math.round(pt.h)}${pt.tall && pt.wide ? '' : '; trượt ' + pt.slip.join(' ')})`);
    if (want === null) return;
    const before = await page.evaluate(() => location.hash); await page.touchscreen.tap(pt.x, pt.y);
    if (via === 'menu') { // qua menu tài khoản: phải mở, có mục sáng/tối, chạm mục "Tài khoản" → trang đích
      const mi = await page.waitForFunction(() => { const m = document.querySelector('.ux1-menu'), a = m && m.querySelector('a[data-m="x"]'), r = a && a.getBoundingClientRect(); /* 12/11 (#1138 bottom sheet): hộp thoại trượt lên .28 s – chỉ lấy toạ độ khi mọi hoạt ảnh đã xong, không thì chạm trượt vào lớp phủ */ return !!m && !!m.querySelector('[data-m="theme"]') && r && r.height > 0 && document.getAnimations().every(x => x.playState !== 'running') ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : false; }, null, { timeout: 5000 }).then(h => h.jsonValue()).catch(() => null);
      ok(!!mi, `${tag}: ${label} – chạm mở menu tài khoản có mục sáng/tối + "Tài khoản"`); if (!mi) return; await page.touchscreen.tap(mi.x, mi.y); }
    const got = await page.waitForFunction(([b, w]) => location.hash !== b && [].concat(w).some(x => location.hash.startsWith(x)) ? location.hash : false, [before, want], { timeout: 5000 }).then(h => h.jsonValue()).catch(() => null);
    ok(!!got, `${tag}: ${label} – chạm → ${want}${got ? '' : ' (vẫn ở ' + (await page.evaluate(() => location.hash)) + ')'}`);
    if (got) ok(await settle(null), `${tag}: ${label} – trang đích vẽ xong (${await diag()})`); }; // về màn Ôn khi trang đích đã vẽ xong (cả lối chuyển tiếp ?src=forgetting → học nhanh)
  for (const [label, sel, want, via] of TARGETS) await check(label, sel, want, 0, null, via);
  if (!(await hub())) { await browser.close(); return; } const decks = await page.locator(DECK).count(); ok(decks >= 2, `${tag}: có ≥ 2 thẻ bộ (web + thư viện), thấy ${decks}`);
  for (const href of await page.locator(DECK).evaluateAll(as => as.map(a => a.getAttribute('href')))) { const sel = `${DECK.split('[')[0]}[href="${href}"]`; // lấy href trước (thứ tự bộ có thể đổi sau khi mở phiên ôn)
    await check(`thẻ bộ ${href}`, sel, href); await check(`chip đến hạn của ${href}`, sel, href, 0, ':scope > div:last-child > span:first-child'); }
  if (scheme === 'dark') { // sweep 15 ngôn ngữ giao diện (Đức/Nga/Hindi dài hơn, Ả Rập phải-sang-trái): chữ trong vòng không tràn
    const seen = new Set(); for (const L of LANGS) { await quiet(); await page.goto(`https://lk.test/app/?sandbox=1&hl=${L}${HUB}`, { waitUntil: 'load' }); await page.waitForSelector('.v2-review', { timeout: 30000 }); await page.waitForTimeout(700); await page.evaluate(() => App.loadPack()); // gói nghĩa của ngôn ngữ này (app tự gọi sau 1,5 s) → tải xong rồi mới đi tiếp, không bị cắt giữa chừng
      const f = await ringCheck(page, `${tag}/${L}`); if (f) seen.add(f.text); if (L === 'de' || L === 'ru') await page.screenshot({ path: path.join(OUT, `ring-${name}-${L}.png`), clip: { x: 0, y: 40, width: 375, height: 330 } }); }
    ok(seen.size >= 12, `${tag}: nhãn vòng đã dịch theo ngôn ngữ (${seen.size} bản khác nhau / ${LANGS.length})`);
    await quiet(); await page.goto(`https://lk.test/app/?sandbox=1&hl=vi${HUB}`, { waitUntil: 'load' }); await quiet(); }
  await quiet();
  ok(!errs.length, `${tag}: không lỗi JS${errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''}`);
  await browser.close(); }

const PHONE = { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const iPhone = { ...devices['iPhone 13'], viewport: { width: 375, height: 812 } };
for (const scheme of ['dark', 'light']) {
  await run(webkit, 'webkit-iphone', iPhone, scheme);
  await run(chromium, 'chromium-android', PHONE, scheme); }
console.log(`${fails ? '✗' : '✓'} review-taps: ${total - fails}/${total}`);
process.exit(fails ? 1 : 0);
