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
w.UI.speak = () => {}; w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [], pause() {}, resume() {} };
w.SpeechSynthesisUtterance = function (t) { this.text = t; };
w.Audio = function () { return { play: async () => {}, pause() {}, addEventListener() {} }; };

await tick(300); await go('#/welcome/setup'); if ($('#go')) $('#go').click(); await tick(1500);
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
ok(!errors.some(e => !/Not implemented/.test(e)), 'không lỗi JS: ' + errors.slice(0, 3).join(' | '));
console.log(fails ? `✗ route-race: ${fails}/${n} lỗi` : `✓ route-race: ${n} kiểm tra đạt`); process.exit(fails ? 1 : 0);
