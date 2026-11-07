// 🌟 Hành trình Welcome + thiết lập lần đầu trên trình duyệt thật (Playwright, CI: journey-e2e.yml job web, không chạy trên Mac): từng dòng của docs/specs/welcome.md.
// Hermetic: serve() chặn mọi host ngoài, ?sandbox=1 / tài khoản giả, không tài khoản thật. Phần logic chạy nhanh trong npm test: welcome-flow.mjs.
// Chạy: node scripts/test/welcome-journey.mjs [--root dist]
import { chromium } from 'playwright';
import { serve } from './stitch-screens.mjs';
import { waitFn } from '../lib/pw-wait.mjs';

const A = process.argv.slice(2), ROOT = A.includes('--root') ? A[A.indexOf('--root') + 1] : 'web', O = 'https://lk.test', Q = '/app/?sandbox=1&hl=vi';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0, n = 0; const ok = (c, m) => { n++; console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const browser = await chromium.launch();
const open = async (hash, { q = Q, seed = {}, init } = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' });
  await serve(ctx, ROOT);
  await ctx.addInitScript(s => { try { if (!sessionStorage.getItem('__wj')) { sessionStorage.setItem('__wj', '1'); for (const k in s) localStorage.setItem(k, s[k]); } } catch (e) { /* bỏ qua */ } }, seed);
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(String(e.message).slice(0, 160)));
  await page.goto(O + q + hash, { waitUntil: 'load' });
  return { ctx, page, errs, hash: () => page.evaluate(() => location.hash), ready: () => waitFn(page, () => window.App && App.routeToken && App.routeToken() > 0 && App.drawn().tok > 0, null, { timeout: 30000 }) };
};
const ONB = { 'sbx.settings': JSON.stringify({ onboarded: true }) };
const see = (page, s, timeout = 15000) => page.waitForSelector(s, { state: 'visible', timeout }).then(() => true).catch(() => false);
const hashIs = (page, re, timeout = 8000) => waitFn(page, r => new RegExp(r).test(location.hash), re.source, { timeout }).then(() => true).catch(() => false);
const steps = async page => { for (let i = 0; i < 8 && !(await page.$('#go')); i++) { await page.click('#obNext'); await sleep(200); } };
const answerPlacement = async page => { await page.click('#go'); for (let i = 0; i < 30 && !(await page.$('.pl-result')); i++) { const o = page.locator('.pl-wrap .option[data-k]:not([data-k="-1"])'); if (await o.count()) await o.nth(i % 2).click().catch(() => {}); await sleep(450); } };

// ---- 0. App iOS/Android (Capacitor) mở lần đầu: Welcome, không bao giờ vào/hiện blog (chủ 5/11) ----
{
  const nav = []; const P = await open('', { init: () => { window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: {} }; } });
  P.page.on('framenavigated', f => nav.push(f.url())); P.page.on('request', r => { if (/\/blog\//.test(r.url()) && r.isNavigationRequest()) nav.push(r.url()); });
  ok(await see(P.page, '#wCard'), 'app (Capacitor) mở lần đầu → Welcome');
  ok(await P.hash() === '#/welcome', 'app: hash = #/welcome');
  await sleep(1500);
  ok(!nav.some(u => /\/blog\//.test(u)), 'app: không điều hướng vào blog lúc mở đầu');
  ok(await P.page.evaluate(() => { const a = document.querySelector('.w-nav a[data-blog]'); return !a || a.hidden || !a.getClientRects().length; }), 'app: Welcome không hiện lối vào blog');
  await P.ctx.close();
}

// ---- 1. Người mới: / → Welcome → đủ các bước → Hôm nay ----
{
  const P = await open('', {});
  ok(await see(P.page, '#wCard'), 'người mới mở /app/ → Welcome');
  ok(await P.hash() === '#/welcome', 'hash = #/welcome');
  await P.page.click('.w-cta a[href="#/welcome/setup"]');
  ok(await see(P.page, '#obNext'), 'Bắt đầu → thiết lập');
  ok(/s=goal/.test(await P.hash()), 'bước 1 có hash riêng');
  await P.page.click('[data-track]'); await sleep(300);
  await P.page.click('#obNext'); await see(P.page, '[data-lv]');
  await P.page.click('[data-lv]:not([data-lv="test"])');
  await steps(P.page); await P.page.click('#go');
  ok(await hashIs(P.page, /^#\/day/, 15000), 'xong thiết lập → Ngày 1');
  ok(await P.page.evaluate(() => sessionStorage.getItem('lk.onbPick') === null), 'xóa lk.onbPick');
  // Back hệ thống ngay sau thiết lập: một lần là ra khỏi luồng, không đi qua hash các bước, không kẹt Welcome (docs/specs/welcome.md)
  await P.page.goBack({ waitUntil: 'load' }).catch(() => {}); await sleep(700);
  ok(!/welcome/.test(await P.page.evaluate(() => location.href)), 'Back từ Ngày 1: không về thiết lập/Welcome');
  await P.page.goForward({ waitUntil: 'load' }).catch(() => {}); await sleep(800);
  await P.page.evaluate(() => { location.hash = '#/home'; }); await sleep(800);
  ok(await P.page.locator('#view h1, #view .card, #view [data-blk]').count() > 0 && !/welcome/.test(await P.hash()), 'Hôm nay vẽ được');
  ok(!P.errs.length, 'không lỗi JS: ' + P.errs.join(' | '));
  await P.ctx.close();
}
// ---- 2. Đã đăng nhập, có dữ liệu ----
for (const [h, to] of [['#/welcome', /^#\/home/], ['#/start', /^#\/home/], ['#/signup', /^#\/home/], ['#/setup', /^#\/home/], ['#/welcome/setup', /^#\/home/]]) {
  const P = await open(h, { seed: ONB });
  ok(await hashIs(P.page, to), `có dữ liệu: ${h} → #/home`);
  ok(await P.page.evaluate(() => history.length) <= 2, `${h}: thay bằng replace, không chồng lịch sử`);
  await P.ctx.close();
}
{
  const P = await open('#/home', { seed: ONB }); await P.ready();
  await P.page.evaluate(() => { App.state.user = { uid: 'fake' }; location.hash = '#/welcome/login'; }); // tài khoản giả chỉ trong bộ nhớ
  ok(await hashIs(P.page, /^#\/me/), 'đã đăng nhập + có dữ liệu: /login → #/me');
  await P.ctx.close();
}
// ---- 3. Có tiến độ, chưa đăng nhập ----
{
  const P = await open('#/welcome/login', { seed: ONB });
  ok(await see(P.page, '#wCard') && /welcome\/login/.test(await P.hash()), 'có tiến độ, chưa đăng nhập: /login → Welcome');
  ok(await P.page.locator('#loginH.hl, #loginW.hl').count() === 1 && await P.page.evaluate(() => document.activeElement && /^login/.test(document.activeElement.id)), 'nút Đăng nhập nổi + có focus');
  await P.ctx.close();
}
// ---- 4. Deep link người mới ----
for (const h of ['#/tests', '#/dict/hello']) {
  const P = await open(h);
  await sleep(1500);
  ok(await P.hash() === h, 'deep link giữ nguyên ' + h);
  await P.ctx.close();
}
// ---- 5. Đổi ngôn ngữ giữa chừng + Back/Esc ----
{
  const P = await open('#/welcome/setup');
  await see(P.page, '#obNext');
  await P.page.click('[data-track=toeic]'); await sleep(300);
  await P.page.click('#obNext'); await see(P.page, '[data-lv]');
  await P.page.click('[data-lv]:not([data-lv="test"])'); await sleep(150);
  await P.page.click('#obNext'); await see(P.page, '#bandT');
  await P.page.click('#bandT button:last-child'); await sleep(150);
  const before = await P.page.evaluate(() => JSON.parse(sessionStorage.getItem('lk.onbPick')));
  await Promise.all([P.page.waitForNavigation({ waitUntil: 'load' }), P.page.evaluate(() => I18N.set('en'))]);
  await see(P.page, '#bandT');
  const after = await P.page.evaluate(() => JSON.parse(sessionStorage.getItem('lk.onbPick')));
  ok(/s=target/.test(await P.hash()) && await P.page.evaluate(() => I18N.lang()) === 'en', 'đổi ngôn ngữ: về đúng bước, đúng tiếng');
  ok(after.track === 'toeic' && after.target === before.target && after.lv === before.lv, 'giữ đủ lựa chọn sau tải lại');
  // Back hệ thống / Esc / nút lùi: mỗi lần đúng 1 bước. Tải lại làm history.state còn nguyên nên Back vẫn về bước trước
  await P.page.goBack(); ok(await hashIs(P.page, /s=level/) && await see(P.page, '[data-lv]'), 'Back hệ thống lùi 1 bước');
  await P.page.keyboard.press('Escape'); ok(await hashIs(P.page, /s=goal/) && await see(P.page, '[data-track=toeic]'), 'Esc lùi 1 bước');
  await P.page.click('#onbBack'); ok(await hashIs(P.page, /^#\/welcome\/?(\?|$)/) && await see(P.page, '#wCard'), 'Back ở bước đầu → Welcome');
  await P.ctx.close();
}
// ---- 6. Bài đầu vào từ Welcome → thiết lập, trình độ ghi sẵn ----
{
  const P = await open('#/welcome');
  await see(P.page, 'a[href="#/placement"]');
  await P.page.click('a[href="#/placement"]:visible'); await see(P.page, '#go');
  await P.page.click('#go'); await see(P.page, '.pl-wrap .option');
  await P.page.click('#plX'); ok(await hashIs(P.page, /^#\/welcome/), 'thoát bài đầu vào (chưa trả lời) → về Welcome');
  await P.page.click('a[href="#/placement"]:visible'); await see(P.page, '#go');
  await answerPlacement(P.page);
  ok(await see(P.page, '.pl-result a[href="#/welcome/setup"]', 30000), 'kết quả: nút cuối đi #/welcome/setup');
  ok(await P.page.evaluate(() => !App.state.game.xp && App.state.settings.plXpDue === 1), 'chưa thiết lập: XP hoãn (chưa thành "có dữ liệu")');
  await P.page.click('.pl-result a[href="#/welcome/setup"]');
  ok(await see(P.page, '#obNext') && /welcome\/setup/.test(await P.hash()), 'vào thiết lập, không bị đẩy về Home');
  await P.page.click('[data-track=ielts]').catch(() => {}); await sleep(250);
  await P.page.click('#obNext'); await see(P.page, '[data-lv]');
  const stage = await P.page.evaluate(() => App.state.settings.placement.stage);
  ok(await P.page.locator(`[data-lv=${stage}][aria-checked=true]`).count() === 1, 'trình độ ghi sẵn từ kết quả: ' + stage);
  await P.page.click('#obNext'); ok(await see(P.page, '#bandT'), 'không hỏi lại: Tiếp tục đi thẳng bước sau');
  await steps(P.page); await P.page.click('#go');
  ok(await hashIs(P.page, /^#\/day/, 15000), 'xong thiết lập → Ngày 1');
  await sleep(500);
  ok(await P.page.evaluate(() => App.state.game.xp >= 20 && !App.state.settings.plXpDue), 'XP bài đầu vào cộng sau khi thiết lập');
  await P.ctx.close();
}
// ---- 6b. Lời mời bài đầu vào trong thiết lập (chưa chọn trình độ): Bỏ qua / làm xong → Hôm nay ----
for (const done of [false, true]) {
  const P = await open('#/welcome/setup');
  await see(P.page, '#obNext'); await P.page.click('[data-track]'); await sleep(250);
  await steps(P.page); await P.page.click('#go');
  ok(await hashIs(P.page, /^#\/placement/, 15000) && await see(P.page, '#plSkip') && await see(P.page, '.pl-inv .tslot'), 'chưa chọn trình độ → lời mời 5 phút có Ama + Bỏ qua');
  if (done) {
    await answerPlacement(P.page);
    ok(await see(P.page, '.pl-result a[href="#/home"]', 30000), 'làm xong: kết quả có nút về Hôm nay');
    ok(await P.page.evaluate(() => { const s = App.state.settings, T = window.Tracks; return !!(s.placement && T && T.start(T.TR[s.tracks.cur])); }), 'kết quả gán chặng của gói');
    await P.page.click('.pl-result a[href="#/home"]');
  } else await P.page.click('#plSkip');
  ok(await hashIs(P.page, /^#\/home$/, 8000) && await P.page.locator('#view h1, #view .card, #view [data-blk]').count() > 0, (done ? 'làm xong' : 'Bỏ qua') + ' → Hôm nay vẽ được');
  ok(await P.page.evaluate(() => Object.keys(App.state.cards).length > 0 && !sessionStorage.getItem('lk.plInv')), 'có bộ thẻ, lời mời đã xóa');
  ok(!P.errs.length, 'không lỗi JS: ' + P.errs.join(' | '));
  await P.ctx.close();
}
// ---- 7. #/style: Back về Welcome ----
{
  const P = await open('#/welcome');
  await see(P.page, 'a[href="#/style"]');
  await P.page.click('a[href="#/style"]:visible'); ok(await hashIs(P.page, /^#\/style/), 'mở #/style');
  await P.page.goBack(); ok(await hashIs(P.page, /^#\/welcome/) && await see(P.page, '#wCard'), '#/style: Back về Welcome');
  await P.ctx.close();
}
// ---- 8. Thẻ thử nhanh ----
{
  const P = await open('#/welcome');
  await see(P.page, '#wFront');
  await P.page.click('#wFront:visible'); ok(await see(P.page, '#wBack'), 'lật thẻ');
  await P.page.click('[data-wg=good]:visible'); ok(await see(P.page, '#wDone'), 'chấm → #wDone');
  await P.page.click('#wDone a[href="#/welcome/setup"]:visible'); ok(await see(P.page, '#obNext'), '#wDone → thiết lập');
  await P.ctx.close();
}
// ---- 9. Canh khởi động: indexedDB.open không bao giờ trả lời (không sandbox: dữ liệu thật đi qua IndexedDB) ----
{
  const P = await open('', { q: '/app/?hl=vi', init: () => { IDBFactory.prototype.open = () => ({}); } });
  ok(await see(P.page, '#view .err-state [data-retry]', 12000), '8 s chưa vẽ → thẻ lỗi có Thử lại');
  ok(await P.page.locator('#view .err-state a[href="#/home"]').count() === 0, 'không có lối về vô dụng khi app chưa khởi động');
  await Promise.all([P.page.waitForNavigation({ waitUntil: 'load', timeout: 15000 }).catch(() => {}), P.page.click('[data-retry]')]);
  ok(await P.page.evaluate(() => performance.getEntriesByType('navigation')[0].type === 'reload'), 'Thử lại = tải lại trang');
  await P.ctx.close();
}
await browser.close();
console.log(fails ? `✗ welcome-journey: ${fails}/${n} đỏ` : `✓ welcome-journey: ${n} kiểm`);
process.exit(fails ? 1 : 0);
