// 🔥 Lớp giữ thói quen (web/js/retention.js, docs/RETENTION.md): lõi thuần + giao diện trên JSDOM bằng dữ liệu giả (không tài khoản thật).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';

const SRC = fs.readFileSync('web/js/retention.js', 'utf8');
const key = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const ago = n => { const d = new Date(); d.setDate(d.getDate() - n); return key(d); };
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };

// ---------- 1. Lõi thuần (Node, không DOM) ----------
const ctx = { console }; ctx.self = ctx; vm.createContext(ctx); vm.runInContext(SRC, ctx);
const C = ctx.Ret.core;
ok(C.MILESTONES.join() === '3,7,14,30,50,100,180,365', 'mốc 3/7/14/30…');
const days = new Set([ago(0), ago(1), ago(2), ago(3), ago(4), ago(5), ago(6)]);
ok(C.streak(days) === 7, 'chuỗi 7 ngày');
ok(C.streak(new Set([ago(1), ago(2)])) === 2, 'hôm nay chưa học vẫn giữ chuỗi');
ok(C.pending({}, 7) === 7 && C.pending({ ms: { 3: 1, 7: 1 } }, 9) === 0, 'mốc chưa chúc mừng');
ok(C.pending({}, 40) === 30, 'nhảy nhiều mốc (đồng bộ) → chỉ 1 màn mốc cao nhất');
ok(C.next(7) === 14 && C.next(365) === 400, 'mốc tiếp theo');
const w = C.week(days, { [ago(1)]: 1 }, Date.now());
ok(w.length === 7 && w[0].dow === 0 && w.some(x => x.st === 'frozen'), 'lịch tuần 7 ô, Thứ 2 đầu tuần, có ô đóng băng');
ok(!w.some(x => x.k > key(new Date()) && x.st !== 'future'), 'ngày tương lai = future');
ok(C.event('2026-10-27').id === 'autumn26' && C.event('2026-12-01') === null && C.event('2027-01-01').id === 'winter26', 'sự kiện theo ngày');
ok(C.EVENTS.every(e => e.need === 5 && C.FRAMES[e.frame]), 'sự kiện gom 5 mảnh, có khung riêng');
ok(C.chests({ ms: { 3: 1, 7: 1 }, evDone: { autumn26: 1 }, opened: 1 }) === 2, 'rương = mốc + sự kiện − đã mở');
ok(C.nextPrize({}) === 'f:ice' && C.nextPrize({ own: { 'f:ice': 1 } }) === 's:star', 'rương ra món đầu chưa có (không may rủi)');
ok(C.nextPrize({ own: Object.fromEntries(C.POOL.map(p => [p, 1])) }) === '', 'đủ bộ → hết quà');
ok(C.POOL.every(p => (p[0] === 'f' ? C.FRAMES : C.STICKERS)[p.slice(2)]), 'mọi món trong rương đều có hình');

// ---------- 2. Luật gộp đồng bộ (sync.js mergeRet) ----------
const sync = fs.readFileSync('web/js/sync.js', 'utf8');
const fn = sync.slice(sync.indexOf('  function mergeRet('), sync.indexOf('  function mergeGame0('));
const mergeRet = vm.runInNewContext('(' + fn.trim().replace(/^function mergeRet/, 'function') + ')');
const A = { ms: { 3: 10 }, own: { 'f:ice': 1 }, ev: { autumn26: ['2026-10-27', '2026-10-28'] }, opened: 1, frame: 'ice', frameAt: 5 };
const B = { ms: { 7: 20 }, own: { 's:star': 2 }, ev: { autumn26: ['2026-10-28', '2026-10-30'] }, opened: 2, frame: 'fire', frameAt: 9 };
const M = mergeRet(A, B);
ok(M.ms[3] && M.ms[7] && M.own['f:ice'] && M.own['s:star'], 'gộp: hợp mốc + đồ');
ok(M.ev.autumn26.join() === '2026-10-27,2026-10-28,2026-10-30', 'gộp: hợp mảnh sự kiện, không trùng');
ok(M.opened === 2 && M.frame === 'fire', 'gộp: rương đã mở = max, khung = chọn sau cùng');
ok(mergeRet(A, null) === A && mergeRet(null, B) === B, 'gộp: một phía rỗng');
ok(/ret: mergeRet\(a\.ret, b\.ret\)/.test(sync), 'mergeGame0 gộp game.ret');

// ---------- 3. Giao diện (JSDOM, dữ liệu giả) ----------
const dom = new JSDOM(`<!DOCTYPE html><html><body><span id="streakPill">7</span><div id="view"><section id="todayPlan"></section></div><div id="modal" hidden></div></body></html>`, { url: 'https://lexkite.com/app/#/home', runScripts: 'outside-only' });
const win = dom.window;
win.t = (k, p) => { let s = String(k); if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b); return s; };
let modalEl = null, toasts = [];
win.UI = { modal: h => { modalEl = win.document.getElementById('modal'); modalEl.innerHTML = h; modalEl.hidden = false; return modalEl; }, closeModal: () => { modalEl.hidden = true; modalEl.innerHTML = ''; }, toast: m => toasts.push(m) };
const today = key(new Date());
const state = { user: { displayName: 'Lan' }, stats: { days: {} }, game: { xp: 100, days: Object.fromEntries([...days].map(k => [k, { xp: 10 }])), frozen: {}, freezes: 1, freezeAt: 7 } };
win.Game = { mutate: async f => { const s = JSON.parse(JSON.stringify(state.game)); await f(s); return s; } };
win.App = { retOn: () => true, state, routes: {}, activeDays: () => C.activeDays(state), streak: () => C.streak(C.activeDays(state)) };
let adAsked = 0; win.Ads = { rewarded: async (r, q) => { if (r !== 'cosmetic') throw new Error('sai lý do quảng cáo: ' + r); adAsked++; return q ? true : true; } };
win.matchMedia = () => ({ matches: true });
win.eval(fs.readFileSync('web/js/characters.js', 'utf8')); // Chars (khung app nạp trước retention.js – web/app/index.html)
win.eval(SRC);
const R = win.Ret, $ = s => win.document.querySelector(s), tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

ok(typeof win.App.routes.streak === 'function', 'đăng ký trang #/streak');
R.home(); await tick(10);
ok($('.ret-week') && win.document.querySelectorAll('.ret-d').length === 7, 'thẻ lịch tuần trên trang chủ');
ok($('.ret-week').getAttribute('href') === '#/streak', 'chạm lịch → trang chuỗi');

// Sự kiện: hôm nay có học → nhận mảnh (chỉ 1 lần/ngày)
const evNow = C.event(today);
if (evNow) {
  ok(((state.game.ret || {}).ev || {})[evNow.id] === undefined || true, 'trước khi nhận');
  await R.check(); await tick(5);
  ok(state.game.ret.ev[evNow.id].includes(today), 'nhận 1 mảnh sự kiện hôm nay');
  const n1 = state.game.ret.ev[evNow.id].length; await R.check(); await tick(5);
  ok(state.game.ret.ev[evNow.id].length === n1, 'không nhận 2 mảnh cùng ngày');
}

// Mốc 7 ngày → màn chúc mừng kiểu trò chơi: giáo viên, chữ ngắn, +1 🧊, ô rương chạm-để-mở, ĐÚNG 1 nút lớn "Bài tiếp theo"
state.game.ret = { ...(state.game.ret || {}), ms: { 3: 1 } };
win.App.todayPlan = async () => [{ href: '#/review', done: true }, { href: '#/lesson/1', done: false }];
await R.check(); await tick(1000);
ok(modalEl && /7 ngày! 🔥/.test(modalEl.innerHTML), 'màn chúc mừng mốc 7');
ok(/teach\/(ama|carlos)\/avatar\.webp/.test(modalEl.innerHTML) && !/img\/teach\//.test(modalEl.innerHTML), "màn chúc mừng có Ama/Carlos (avatar 2D registry, không ảnh 3D cũ)");
ok(/🧊 \+1/.test(modalEl.innerHTML), 'báo +1 lượt đóng băng kiếm được');
ok(modalEl.querySelectorAll('.btn.primary').length === 1 && modalEl.querySelector('#retNext'), 'đúng 1 nút chính: Bài tiếp theo');
ok(modalEl.querySelector('.ret-say').textContent.split(/\s+/).length <= 7, 'lời giáo viên ngắn (≤ 7 chữ)');
ok(state.game.ret.ms[7], 'đánh dấu đã chúc mừng mốc 7');
ok(C.chests(state.game.ret) >= 2, 'có rương chưa mở');

// Chạm ô rương → mở ngay trong màn: món đầu tiên chưa có, khung tự đeo; quảng cáo chỉ là liên kết phụ cho mỹ phẩm
modalEl.querySelector('#retChestTile').click(); await tick(30);
ok(state.game.ret.own['f:ice'] && state.game.ret.opened === 1, 'mở rương → khung Băng');
ok(state.game.ret.frame === 'ice' && win.document.body.getAttribute('data-ret-frame') === 'ice', 'khung mới tự đeo');
ok(modalEl.querySelector('.ret-tile.open') && !modalEl.querySelector('#retChestTile'), 'quà hiện ngay tại chỗ');
ok(adAsked >= 1 && modalEl.querySelector('#retAdGo') && !modalEl.querySelector('#retAdGo').classList.contains('primary'), 'quảng cáo có thưởng: lý do cosmetic, nút phụ tùy chọn');
modalEl.querySelector('#retNext').click(); await tick(30);
ok(win.location.hash === '#/lesson/1', 'Bài tiếp theo → bước chưa xong đầu tiên của kế hoạch');
win.App.nextNode = async () => ({ href: '#/lesson/7' });
await win.App.routes.streak(); await tick(10);
// Trang #/streak
win.App.routes.streak(); await tick(10);
const v = $('#view').innerHTML;
ok(/🔥 7/.test(v) && /Mốc tiếp theo: 14 ngày/.test(v), 'trang chuỗi: số ngày + mốc tiếp');
ok(/miễn phí/.test(v), 'trang chuỗi: nói rõ miễn phí');
ok(win.document.querySelectorAll('[data-ret-item]').length >= 15, 'bộ sưu tập');
ok(win.document.querySelector('[data-ret-item="s:star"]').disabled, 'món chưa có bị khóa');

// Nghi thức rã băng: chạm 3 lần
const box = R.thaw(); const ice = box.querySelector('#retIce');
ok(box.querySelector('#retThawDone').hidden, 'chưa rã băng');
ice.click(); ice.click(); ok(box.querySelector('#retThawDone').hidden, '2 lần chạm chưa đủ');
ice.click(); ok(!box.querySelector('#retThawDone').hidden && ice.textContent === '🔥', 'chạm 3 lần → rã băng, lửa cháy lại');
box.querySelector('#retNext').click(); await tick(30); ok(win.location.hash === '#/lesson/7', 'sau rã băng: Bài tiếp theo → App.nextNode (lộ trình #155)');

// ---------- 3b. CÙNG các ý trên khung Stitch v2 (cờ ux1 bật + khung tự sinh web/js/st/v2/streak.js) ----------
{
  win.ST = { esc: x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]) };
  win.I18N = { lang: () => 'en' }; win.App.ux1On = () => true;
  win.eval(fs.readFileSync('web/js/st/v2/runtime.js', 'utf8')); win.eval(fs.readFileSync('web/js/st/v2/streak.js', 'utf8'));
  state.settings = { dailyGoal: 20 }; let savedAt = 0; win.App.saveSettings = async () => { savedAt++; };
  // màn chúc mừng mốc: cùng khung Stitch trong hộp thoại
  state.game.ret = { ms: { 3: 1 } }; win.UI.closeModal && modalEl && win.UI.closeModal(); win.location.hash = '#/home'; adAsked = 0;
  await R.check(); await tick(1000);
  ok(modalEl && !modalEl.hidden && /7 ngày! 🔥/.test(modalEl.innerHTML) && /v2-streak/.test(modalEl.innerHTML), 'v2: màn chúc mừng mốc 7 (khung Stitch)');
  ok(modalEl.querySelector('[data-goal]') && modalEl.querySelectorAll('[role=listitem]').length === 7, 'v2: có lịch tuần 7 ô + nhóm mục tiêu');
  ok(/teach\/(ama|carlos)\//.test(modalEl.innerHTML) && !/img\/teach\//.test(modalEl.innerHTML), 'v2: có Ama/Carlos (Chars registry, không ảnh 3D cũ)');
  ok(/🧊 \+1/.test(modalEl.innerHTML), 'v2: báo +1 lượt đóng băng kiếm được');
  ok(modalEl.querySelectorAll('#retNext').length === 1 && modalEl.querySelectorAll('button.btn.primary').length === 0 && modalEl.querySelector('#retNext').tagName === 'BUTTON', 'v2: đúng 1 nút chính: #retNext (Tiếp tục)');
  ok(modalEl.querySelector('[data-ret-say]').textContent.split(/\s+/).length <= 7, 'v2: lời giáo viên ngắn (≤ 7 chữ)');
  ok(state.game.ret.ms[7], 'v2: đánh dấu đã chúc mừng mốc 7');
  modalEl.querySelector('#retChestTile').click(); await tick(30);
  ok(state.game.ret.own['f:ice'] && state.game.ret.opened === 1 && state.game.ret.frame === 'ice', 'v2: mở rương → khung Băng, tự đeo');
  ok(modalEl.querySelector('.ret-tile.open') && !modalEl.querySelector('#retChestTile'), 'v2: quà hiện ngay tại chỗ');
  ok(adAsked >= 1 && modalEl.querySelector('#retAdGo') && !modalEl.querySelector('#retAdGo').classList.contains('primary'), 'v2: quảng cáo có thưởng cosmetic, nút phụ');
  const goalBtn = modalEl.querySelector('[data-goal="50"]'); goalBtn.click(); await tick(10);
  ok(state.settings.dailyGoal === 50 && savedAt === 1 && goalBtn.getAttribute('aria-checked') === 'true', 'v2: chọn mục tiêu 50 → lưu vào cài đặt thật (dailyGoal)');
  modalEl.querySelector('#retNext').click(); await tick(30);
  ok(win.location.hash === '#/lesson/7', 'v2: Tiếp tục → App.nextNode (lộ trình #155)');
  // trang #/streak
  state.game.ret = { ...state.game.ret, opened: 0 }; state.settings.dailyGoal = 20;
  win.App.routes.streak(); await tick(10);
  const V = $('#view'), vh = V.innerHTML;
  ok(V.querySelector('.v2-streak') || /v2-streak/.test(vh), 'v2: trang chuỗi dùng khung Stitch');
  ok(V.querySelector('header [data-href="#/home"]') && !V.querySelector('nav'), 'v2: đầu trang × có sẵn, không thanh tab');
  ok(/>7</.test(vh) && /Chuỗi 7 ngày!/.test(vh) && /Mốc tiếp theo: 14 ngày/.test(vh), 'v2: số ngày + mốc tiếp');
  ok(/miễn phí/.test(vh), 'v2: nói rõ miễn phí');
  ok(V.querySelectorAll('[role=listitem]').length === 7 && V.querySelectorAll('[role=listitem][aria-label*="Hôm nay"], [role=listitem][aria-label*="Đã học"]').length >= 1, 'v2: lịch tuần 7 ô có nhãn trạng thái');
  ok(V.querySelector('[data-goal="20"]').getAttribute('aria-checked') === 'true' && V.querySelector('[data-goal="10"]').getAttribute('aria-checked') === 'false', 'v2: mục tiêu đang dùng lấy từ cài đặt thật');
  ok(V.querySelector('[role=progressbar][aria-valuemax="20"]'), 'v2: vòng mục tiêu ngày có aria');
  ok(V.querySelectorAll('[data-ret-item]').length >= 15, 'v2: bộ sưu tập');
  ok(V.querySelector('[data-ret-item="s:star"]').disabled, 'v2: món chưa có bị khóa');
  ok(V.querySelector('[data-ret-item="f:ice"]') && !V.querySelector('[data-ret-item="f:ice"]').disabled, 'v2: món đã có đeo được');
  ok(/🧊/.test(vh), 'v2: số lượt đóng băng hiện trên trang');
  ok(V.querySelector('#retChest'), 'v2: có rương chưa mở → nút Mở rương');
  V.querySelector('#retChest').click(); await tick(40);
  ok(modalEl.querySelector('.ret-tile.open') || modalEl.querySelector('#retChestTile'), 'v2: Mở rương từ trang chuỗi');
  win.UI.closeModal();
  V.querySelector('[data-ret-item="f:ice"]').click(); await tick(20);
  ok(state.game.ret.frame === 'ice', 'v2: bấm món → đeo khung');
  win.App.ux1On = () => false;
}

// Widget: dữ liệu giáo viên + ngày học gần nhất (đổi biểu cảm khi qua ngày)
const wd = R.widget(state);
ok(['ama', 'carlos'].includes(wd.who) && wd.sd === today && wd.ok && wd.risk, 'snapshot widget tch');

// Cờ tắt mà gói bị nạp kèm: không ghi gì, không đổi đối tượng state.game
{ const before = state.game, snap = JSON.stringify(state.game.ret); win.App.retOn = () => false; await R.check(); await tick(1100);
  ok(state.game === before && JSON.stringify(state.game.ret) === snap, 'cờ tắt → check() không làm gì'); win.App.retOn = () => true; }
// Không có Ads (web/add-on) → không lời mời
ok(/cosmetic: 1/.test(fs.readFileSync('web/js/ads/policy.js', 'utf8')), 'policy có lý do cosmetic (1/ngày)');

// Gắn đúng: gói lười + cờ, không vào khung app
const app = fs.readFileSync('web/js/app.js', 'utf8');
ok(/ret: \['js\/i18n\/en\/ret\.js', 'js\/retention\.js'\]/.test(app) && /streak: \['streak', 'ret'\]/.test(app), 'gói lười ret + route (streak-ui chỉ ở gói streak)');
ok(/App\.retOn\(\)\) App\.lazy\('streak', 'ret'\)/.test(app), 'trang chủ chỉ tải khi cờ bật');
ok(!/retention\.js/.test(fs.readFileSync('web/app/index.html', 'utf8')), 'không nằm trong khung app');
// Cổng bật dần + đo D7 (app.js retOn/retArm/retTrack) – chạy đúng mã thật trong môi trường giả
{
  const lines = app.split('\n'), from = lines.findIndex(l => l.includes('const retCfg = ')), to = lines.findIndex(l => l.includes('App.retTrack = '));
  const code = lines.slice(from, to + 1).join('\n');
  const run = (cfg, rb, q = '', marks = {}) => {
    const store = { 'lk.cfg': JSON.stringify({ v: cfg }), ...(rb == null ? {} : { 'lk.rb': String(rb) }), ...marks }, sent = [];
    const env = { App: {}, location: { search: q, hostname: 'lexkite.com' }, localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, navigator: { sendBeacon: (u, d) => sent.push(JSON.parse(d).ev) }, JSON, Math, isNaN, String };
    vm.runInNewContext(code, env); return { A: env.App, store, sent };
  };
  ok(run({}, 3).A.retOn() === false, 'chưa đặt cờ → tắt');
  ok(run({ ret_pct: '10' }, 3).A.retOn() === true && run({ ret_pct: '10' }, 10).A.retOn() === false, 'ret_pct 10: nhóm 0–9 bật');
  ok(run({ ret_pct: '10', ret: '0' }, 3).A.retOn() === false && run({ ret: '1' }, 99).A.retOn() === true, 'ret 0 tắt khẩn / 1 bật hết');
  ok(run({ ret_pct: '10' }, 99, '?ret=1').A.retOn() === true, '?ret=1 thử trên máy');
  ok(run({ ret_pct: '10' }, 3).A.retArm() === 'on' && run({ ret_pct: '10' }, 55).A.retArm() === 'off' && run({ ret_pct: '10' }, 30).A.retArm() === '', 'nhóm bật / đối chứng cùng cỡ / ngoài thử nghiệm');
  ok(run({ ret: '1', ret_pct: '10' }, 3).A.retArm() === '', 'bật hết → hết thử nghiệm, không gửi');
  const r1 = run({ ret_pct: '10' }, 55); r1.A.retTrack(3); r1.A.retTrack(8); r1.A.retTrack(9);
  ok(r1.sent.join() === 'ret_off_seen,ret_off_d7', 'mỗi sự kiện 1 lần/máy');
  const r2 = run({ ret_pct: '10' }, 3, '', { 'lk.noTrack': '1' }); r2.A.retTrack(9); ok(!r2.sent.length, 'máy quản trị không gửi');
  const r3 = run({ ret_pct: '10' }, null); r3.A.retOn(); ok(/^\d+$/.test(r3.store['lk.rb']), 'tự tạo nhóm lk.rb cố định');
}
console.log(`✓ retention: ${pass} kiểm tra đạt`);
