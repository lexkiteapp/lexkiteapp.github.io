// Test (jsdom) đua điều hướng: chuyển trang rất nhanh (#/home ↔ #/practice/learn…) không được để lượt vẽ cũ (async) vẽ đè trang mới
// hay làm mất phiên học đang chạy. Kiểm: App.route dùng token tăng dần, App.nav* (App.need có bảo vệ) bỏ kết quả cũ.
// Chạy: node scripts/test/route-race.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';
const require = createRequire(import.meta.url);
const { JSDOM } = jsdom;
const WEB = 'web';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const css = fs.readFileSync(path.join(WEB, 'css/style.css'), 'utf8');
const vc = new jsdom.VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) console.error(e.message); });
const dom = new JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, '').replace('</head>', `<style>${css}</style></head>`), { url: 'https://lexkite.test/app/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, errors = [];
w.addEventListener('error', e => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = (s, r = w.document) => r.querySelector(s);
const go = async (h, ms = 150) => { w.location.hash = h; await tick(ms); };
// Chờ lượt điều hướng CUỐI vẽ xong (tín hiệu App.drawn: token mới nhất + đúng hash), rồi thêm ms để lượt cũ nào về muộn cũng kịp lộ ra.
// Không đoán bằng thời gian cố định: máy bận (CI/chạy song song) làm trang chậm hơn 260 ms → báo sai “vẽ đè”.
const settle = async (ms) => { const t0 = Date.now(); await tick(0); while (Date.now() - t0 < 8000) { const d = w.App.drawn(); if (d.tok === w.App.routeToken() && d.hash === w.location.hash) break; await tick(10); } await tick(ms); };
w.UI.speak = () => {}; w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [], pause() {}, resume() {} };
w.SpeechSynthesisUtterance = function (t) { this.text = t; };
w.Audio = function () { return { play: async () => {}, pause() {}, load() {}, addEventListener() {}, removeEventListener() {}, setAttribute() {}, removeAttribute() {}, style: {} }; };

await tick(300); await go('#/welcome/setup'); for (let i = 0; i < 60 && !$('#go'); i++) { if ($('#obNext')) $('#obNext').click(); await tick(100); } if ($('#go')) $('#go').click(); await tick(1500); // thiết lập từng bước (onboard.js): Tiếp tục tới màn cuối rồi Bắt đầu
const { IELTS_DATA } = w;
const ALL = IELTS_DATA.TOPICS.flatMap(t => t.words).filter(x => x.vi && x.level && !/\s/.test(x.word));
for (const x of ['live', 'house', 'water', 'family']) { const e = ALL.find(y => y.word === x); if (e && !w.App.inDeck(x)) await w.App.addWord(e, null, { silent: true }); }
const deckAll = w.App.state.cards; w.App.state.cards = Object.fromEntries(['live', 'house', 'water', 'family'].map(k => [k, deckAll[k]]));

// 1) Token điều hướng: mỗi lần route() tăng 1; App.routeStale(t) đúng khi đã có lượt mới hơn
ok(typeof w.App.routeToken === 'function' && typeof w.App.routeStale === 'function', 'App.routeToken / App.routeStale có sẵn');
{ await go('#/home', 100); const t0 = w.App.routeToken(); ok(!w.App.routeStale(t0), 'token hiện tại chưa cũ'); await go('#/stats', 100); ok(w.App.routeStale(t0), 'sau khi đổi trang, token cũ bị đánh dấu cũ'); }

// 2) Đua: home → learn rất nhanh (0–40ms), phiên học không được bị vẽ lại
const sig = () => `${($('.wi-word') || {}).textContent || ''}|${($('#fi') || {}).id || ''}`;
for (const gap of [0, 5, 20, 40, 90, 160]) {
  for (let r = 0; r < 4; r++) {
    await go('#/home', 100);
    w.location.hash = '#/practice/learn?src=deck'; await tick(gap);
    w.location.hash = '#/home'; await tick(gap);
    w.location.hash = '#/practice/learn?src=deck'; await tick(700);
    const el = $('#fi'), s0 = sig();
    ok(w.location.hash.startsWith('#/practice/learn') && !!$('.learn-bar, .study-wrap'), `gap ${gap}ms #${r}: trang cuối là phiên học`);
    ok(!$('.today-head'), `gap ${gap}ms #${r}: không còn khối trang Hôm nay vẽ đè`);
    await tick(600);
    ok($('#fi') === el && sig() === s0, `gap ${gap}ms #${r}: phiên học không bị vẽ đè/làm mới muộn (${s0})`);
  }
}
// 3) Rời phiên rồi quay lại trang khác: trang cuối thắng
for (const h of ['#/stats', '#/vocab', '#/settings']) {
  await go('#/practice/learn?src=deck', 30); w.location.hash = h; await tick(0); w.location.hash = '#/home'; await tick(0); w.location.hash = h; await tick(900);
  ok(w.location.hash === h && !$('.learn-bar') && !$('.today-head'), `học → ${h} → home → ${h}: trang cuối ${h} giữ nguyên`);
}
// 4) Tổng quát: MỌI route trong bảng App.routes — đi tới R rồi chuyển ngay sang #/stats (và ngược lại) ở nhiều độ trễ; trang cuối phải giống hệt khi vào thẳng, không có lượt cũ vẽ đè.
{
  const view = () => $('#view'), snap = () => ((view() || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) + '|' + ((view() || {}).children.length);
  const names = Object.keys(w.App.routes).filter(k => !['call', 'handoff', 'welcome', 'report'].includes(k));
  ok(typeof w.App.drawn === 'function', 'App.drawn() báo lượt vẽ đã xong');
  ok(names.length > 40, 'bảng route có ' + names.length + ' trang');
  // Làm chậm đọc dữ liệu (Store.get/App.need) 40 ms để lượt vẽ cũ về MUỘN hơn lượt mới — nếu không, đọc tức thì xong trước khi lượt sau bắt đầu và race không bao giờ xảy ra.
  const slow = o => { if (!o || !o.get) return; const g0 = o.get.bind(o); o.get = (...a) => new Promise(r => setTimeout(r, 40)).then(() => g0(...a)); };
  slow(w.Store); slow(w.Core && w.Core.Store);
  const solo = {}, stable = {}; await go('#/stats', 0); await settle(150); solo.stats = snap();
  for (const r of names) { await go('#/' + r, 0); await settle(180); solo[r] = snap(); await go('#/stats', 0); await settle(60); await go('#/' + r, 0); await settle(180); stable[r] = snap() === solo[r]; } // trang có nội dung ngẫu nhiên (quick, paraphrase…) chỉ kiểm "không phải stats"
  for (const [i, r] of names.entries()) {
    const gap = i % 2 ? 0 : 15; // xen kẽ độ trễ để giữ test < 1 phút
    await go('#/home', 50); w.location.hash = '#/' + r; await tick(gap); w.location.hash = '#/stats'; await settle(260);
    ok(snap() === solo.stats, `route "${r}" → stats (gap ${gap}ms): trang cuối là stats, không bị "${r}" vẽ đè`);
    w.location.hash = '#/stats'; await tick(5); w.location.hash = '#/' + r; await tick(gap); w.location.hash = '#/stats'; await tick(10); w.location.hash = '#/' + r; await settle(260);
    ok(stable[r] ? snap() === solo[r] : snap() !== solo.stats, `stats → "${r}" (gap ${gap}ms): trang cuối là "${r}" như khi vào thẳng`);
  }
}
ok(!errors.some(e => !/Not implemented/.test(e)), 'không lỗi JS: ' + errors.slice(0, 3).join(' | '));
console.log(fails ? `✗ route-race: ${fails}/${n} lỗi` : `✓ route-race: ${n} kiểm tra đạt`); process.exit(fails ? 1 : 0);
