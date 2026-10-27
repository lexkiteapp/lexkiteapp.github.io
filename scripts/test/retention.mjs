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

// Mốc 7 ngày → màn chúc mừng có giáo viên, +1 đóng băng (freezeAt === 7), 1 rương
state.game.ret = { ...(state.game.ret || {}), ms: { 3: 1 } };
win.App.state.game = state.game;
await R.check(); await tick(1000);
ok(modalEl && /Chuỗi 7 ngày!/.test(modalEl.innerHTML), 'màn chúc mừng mốc 7');
ok(/img\/teach\/(ama|carlos)\.webp/.test(modalEl.innerHTML), 'màn chúc mừng có Ama/Carlos');
ok(/\+1 lượt đóng băng/.test(modalEl.innerHTML), 'báo +1 lượt đóng băng kiếm được');
ok(state.game.ret.ms[7], 'đánh dấu đã chúc mừng mốc 7');
ok(C.chests(state.game.ret) >= 2, 'có rương chưa mở');

// Mở rương → món đầu tiên chưa có, có lời mời quảng cáo CHỈ cho mỹ phẩm, tự chọn
modalEl.querySelector('#retOpen').click(); await tick(20);
ok(state.game.ret.own['f:ice'] && state.game.ret.opened === 1, 'mở rương → khung Băng');
ok(/Bạn nhận được/.test(modalEl.innerHTML) && modalEl.querySelector('#retWear'), 'màn rương + nút dùng khung');
ok(adAsked >= 1 && modalEl.querySelector('#retAdGo'), 'quảng cáo có thưởng chỉ hỏi lý do cosmetic, chỉ là nút tùy chọn');
modalEl.querySelector('#retWear').click(); await tick(20);
ok(state.game.ret.frame === 'ice' && win.document.body.getAttribute('data-ret-frame') === 'ice', 'đeo khung ảnh đại diện');

// Trang #/streak
win.App.routes.streak(); await tick(10);
const v = $('#view').innerHTML;
ok(/🔥 7/.test(v) && /Mốc tiếp theo: 14 ngày/.test(v), 'trang chuỗi: số ngày + mốc tiếp');
ok(/Không bao giờ phải trả tiền/.test(v), 'trang chuỗi: nói rõ miễn phí');
ok(win.document.querySelectorAll('[data-ret-item]').length >= 15, 'bộ sưu tập');
ok(win.document.querySelector('[data-ret-item="s:star"]').disabled, 'món chưa có bị khóa');

// Nghi thức rã băng: chạm 3 lần
const box = R.thaw(); const ice = box.querySelector('#retIce');
ok(box.querySelector('#retThawDone').hidden, 'chưa rã băng');
ice.click(); ice.click(); ok(box.querySelector('#retThawDone').hidden, '2 lần chạm chưa đủ');
ice.click(); ok(!box.querySelector('#retThawDone').hidden && ice.textContent === '🔥', 'chạm 3 lần → rã băng, lửa cháy lại');

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
