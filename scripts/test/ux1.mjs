// Test UX1 "Một app duy nhất" (cờ ux1, docs/LEARNING-PATH.md): lõi chặng (unitPlan · nextKind · calm · ease) + jsdom chạy app thật:
// cờ mặc định TẮT (giao diện cũ nguyên vẹn) · bật → 5 tab, trang chủ = chọn mục tiêu 1 chạm → bản đồ (≤ 2 chạm tới bài đầu), Luyện "Luyện thi" đầu tiên,
// mọi lối vào cũ (menu bên + thanh dưới) vẫn tới được qua Học/Ôn/Luyện/Giải đấu/Tôi, nút kiểm tra kỹ năng thi mở module thi có sẵn.
// Chạy: node scripts/test/ux1.mjs  (fixture, không tài khoản thật, không mạng)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';

const require = createRequire(import.meta.url);
const WEB = 'web';
let total = 0, fails = 0;
const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };

// ---------- A. Lõi chặng ----------
const ctx = { self: {} }; ctx.globalThis = ctx.self; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(WEB, 'js/lesson/engine.js'), 'utf8'), ctx);
const E = ctx.self.LessonEngine;
{
  const now = Date.now(), card = (w, due, lapses = 0) => ({ word: w, vi: w, srs: { reps: 2, interval: 3, lapses, due, last: now - 4e8, S: 3, D: 5 } });
  const kinds = p => p.map(x => x.kind).join(',');
  ok(kinds(E.unitPlan([], now, { exam: true })) === 'lesson,listen,speak,lesson,review,exam', 'unitPlan: từ mới → nghe → nói → (truyện/radio) → ôn → kiểm tra kỹ năng thi');
  ok(kinds(E.unitPlan([], now, { exam: true, story: 1, radio: 1 })).split(',')[3] === 'story' && kinds(E.unitPlan([], now, { exam: true, story: 1, radio: 1, odd: true })).split(',')[3] === 'radio', 'unitPlan: chặng chẵn Truyện, chặng lẻ Radio');
  ok(E.unitPlan([card('a', now - 1), card('b', now - 1), card('c', now - 1)], now, {})[0].kind === 'review', 'unitPlan: nhiều thẻ đến hạn → mở chặng bằng Ôn lỗi');
  ok(E.nextKind('speak', { acc: 40 }) === 'review' && E.nextKind('radio', { acc: 55 }) === 'review', 'nextKind: bài trước < 60 % → nút dễ hơn (Ôn lỗi)');
  ok(E.nextKind('review', { acc: 100, due: 0 }) === 'lesson' && E.nextKind('review', { acc: 100, due: 3 }) === 'review', 'nextKind: đã thuộc hết → không bắt ôn lại (không chán)');
  ok(E.nextKind('speak', { acc: null }) === 'speak' && E.nextKind('listen', { acc: 30 }) === 'listen', 'nextKind: chưa có dữ liệu / nút nhẹ → giữ nguyên');
  const it = (type, i) => ({ id: i, type, word: 'w' + i });
  const c = E.calm(['build', 'type', 'tr', 'gap', 'build', 'type', 'mean'].map(it));
  ok(!c.some((x, i) => i >= 2 && E.HARD(x) && E.HARD(c[i - 1]) && E.HARD(c[i - 2])) && c.length === 7, 'calm: không 3 bài khó liền nhau (đủ số bài)');
  const S = new E.Session(['build', 'type', 'build', 'gap', 'mean'].map(it), { ease: true });
  S.answer(false); S.answer(false);
  ok(!E.HARD(S.cur), 'Session ease: sai 2 câu liền → câu kế tiếp dạng dễ (chọn đáp án)');
  const S0 = new E.Session(['build', 'type', 'build', 'gap'].map(it)); S0.answer(false); S0.answer(false);
  ok(S0.cur.type === 'build', 'Session mặc định (cờ tắt) không đổi thứ tự');
}

// ---------- B. jsdom: app thật ----------
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(); const consoleErr = [];
vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) consoleErr.push(e.message); });
vc.on('error', e => consoleErr.push(String(e)));
const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''),
  { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window;
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
let wide = false;
w.matchMedia = q => ({ matches: /min-width:\s*1024/.test(q) ? wide : false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
const $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
// Lối vào cũ (trước khi cờ đổi gì): menu bên + thanh dưới
const OLD = [...new Set($$('#nav a[href^="#/"], #bnav a[href^="#/"]').map(a => a.getAttribute('href')))];
const OLD_TABS = $$('#bnav a').map(a => a.dataset.tab).join(',');
const errors = [];
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
await tick(200);
ok(!errors.length, 'nạp mã + mọi bundle (có ux1) không lỗi' + (errors.length ? ': ' + errors.join(' | ') : ''));
const { App } = w;
w.I18N.whenReady = () => Promise.resolve(); // từ điển en đã nạp sẵn trong khung – không chờ 6 s mạng giả
const go = async (h, sel) => { w.location.hash = h; await tick(10); await App.route(); for (let i = 0; i < 60; i++) { await tick(50); if (!sel || $(sel)) break; } await tick(50); };

// Cờ TẮT (mặc định): giao diện cũ nguyên vẹn
w.localStorage.removeItem('lk.ux1'); w.sessionStorage.removeItem('lk.ux1.pv');
ok(App.ux1On() === false && App.lessonOn() === false, 'cờ ux1 mặc định TẮT (lesson_mix cũng tắt)');
await go('#/home');
ok(!w.document.body.classList.contains('ux1') && $$('#bnav a').map(a => a.dataset.tab).join(',') === OLD_TABS && $('#todayPlan'), 'cờ tắt: thanh dưới cũ + trang chủ Hôm nay như cũ');
ok(JSON.stringify(App.navOf('vocab')) === '["vocab","vocab"]', 'cờ tắt: bản đồ điều hướng cũ');

// Cờ BẬT
w.localStorage.setItem('lk.ux1', '1');
ok(App.ux1On() && App.lessonOn(), 'bật bằng localStorage lk.ux1=1 (kéo theo bản đồ chặng)');
await go('#/home', '.ux1-pick, .ux1-home');
const tabs = $$('#bnav a');
ok(tabs.length === 5 && tabs.map(a => a.dataset.tab).join(',') === 'learn,review,train,league,me' && tabs.map(a => a.getAttribute('href')).join(',') === '#/home,#/review,#/train,#/league,#/me', 'thanh dưới đúng 5 tab: Học · Ôn · Luyện · Giải đấu · Tôi');
ok($$('#nav a').length === 5 && $$('#nav a').map(a => a.dataset.route).join(',') === 'learn,review,train,league,me', 'menu bên (máy tính) gọn = cùng 5 mục');
ok(w.document.body.classList.contains('ux1') && $('#ux1Rail'), 'body.ux1 + cột phải');
ok($('#bnav a[data-tab="review"] [data-due]'), 'tab Ôn có chấm thẻ đến hạn');
// Lần đầu: chọn mục tiêu 1 chạm → bản đồ
ok($('.ux1-pick') && $$('.ux1-pick [data-pk="ielts"]').length && $$('.ux1-pick [data-pk="toeic"]').length && $$('.ux1-pick [data-pk="toefl"]').length && $$('.ux1-pick [data-pk="general"]').length, 'lần đầu: chọn mục tiêu IELTS / TOEIC / TOEFL / Giao tiếp');
$('.ux1-pk-tg [data-pk="toeic"][data-tg="750"]').click(); await tick(150);
ok(App.state.settings.exam === 'toeic' && App.state.settings.examTarget === '750' && App.state.settings.goalPick && App.state.settings.goalPick.target === 750, 'chạm 1: lưu kỳ thi + điểm mục tiêu vào settings sẵn có');
const start = $$('.ux1-home .lsn-start');
ok($('.ux1-home') && start.length === 1 && start[0].getAttribute('href') === '#/lesson/go', 'chạm 2: MỘT nút Bắt đầu tới bài đầu tiên (≤ 2 chạm)');
ok($('#bnav a[data-tab="learn"]').getAttribute('aria-current') === 'page' && !w.document.body.classList.contains('focus'), 'tab Học đang chọn, bản đồ giữ thanh điều hướng');
const unitTx = ($('.ux1-unit') || {}).textContent || '';
ok(/Bạn sẽ|You'll/.test(unitTx) && $('.ux1-unit h1') && /\bu-(primary|accent|good|gold|again)\b/.test($('.ux1-unit').className), 'băng chặng: tên chủ đề + câu "Bạn sẽ…" + màu riêng');
ok($$('.ux1-n').length === 6 && $$('.ux1-n .ux1-lbl').every(l => l.textContent.trim()) && $('.ux1-n.next .ux1-tch') && $$('.ux1-n.lock .ux1-lk').length, 'nút có nhãn (không cột icon trơn), nút hiện tại có giáo viên, nút khóa có ổ khóa');
ok(/TOEIC/.test(($('.ux1-n.cp') || {}).textContent || ''), 'nút kiểm tra kỹ năng thi theo mục tiêu (TOEIC)');
ok($('.ux1-exam') && /TOEIC · 750/.test($('.ux1-exam').textContent) && $('.ux1-exam a[href="#/toeic"]'), 'thẻ kỳ thi: kỳ thi + mục tiêu + 1 chạm thi thử');
// Thứ tự chặng theo mục tiêu + trình độ
const W = w.Ux1;
ok(W.units('toeic', 2)[0].id === 'start' && W.units('toeic', 2)[1].id === 'work' && W.units('ielts', 2)[1].id === 'education', 'chặng theo mục tiêu: TOEIC → Công việc, IELTS → Giáo dục');
ok(W.units('ielts', 4)[0].id !== 'start', 'đã kiểm tra trình độ ≥ B1 → bỏ chặng khởi động (không quá dễ)');
const ws = W.words(6, 6);
ok(ws.length === 4 && ws.every(x => x.word && x.def), 'từ chủ đề vừa sức cho bài (i+1)');
// Nút kiểm tra kỹ năng → module thi có sẵn
w.localStorage.setItem('lk.lsn.path', '5');
await App.routes.lesson('go'); await tick(30);
ok(w.location.hash === '#/toeic' && w.localStorage.getItem('lk.lsn.path') === '6', 'nút kiểm tra kỹ năng thi mở #/toeic và đánh dấu xong');
w.localStorage.setItem('lk.lsn.path', '0');
// Luyện: "Luyện thi" đầu tiên, mọi tính năng
await go('#/train');
ok($('#bnav a[data-tab="train"]').getAttribute('aria-current') === 'page', 'tab Luyện đang chọn');
const firstG = $('.ux1-gh'), big = $('.ux1-tiles.big');
ok(firstG && /Luyện thi|Exam prep/.test(firstG.textContent) && big && ['#/mock', '#/toeic', '#/toefl', '#/tests', '#/placement', '#/criteria'].every(h => big.querySelector(`a[href="${h}"]`)), 'Luyện: nhóm "Luyện thi" đầu tiên (IELTS · TOEIC · TOEFL · Thi thử · CEFR · tiêu chí)');
const hub = new Set($$('#view a[href^="#/"]').map(a => a.getAttribute('href')));
await go('#/me', '.me-head');
ok($('#bnav a[data-tab="me"]').getAttribute('aria-current') === 'page', 'tab Tôi đang chọn');
const me = new Set($$('#view a[href^="#/"]').map(a => a.getAttribute('href')));
const tabH = new Set(tabs.map(a => a.getAttribute('href')));
const lost = OLD.filter(h => !hub.has(h) && !me.has(h) && !tabH.has(h));
ok(OLD.length >= 20 && !lost.length, `không cắt: ${OLD.length} lối vào cũ đều tới được qua 5 tab / Luyện / Tôi` + (lost.length ? ' – thiếu: ' + lost.join(' ') : ''));
for (const h of ['#/goal', '#/stats', '#/mistakes', '#/settings']) ok(me.has(h), 'Tôi có ' + h);
// Trang cũ vẫn chạy (không 404), có đường dẫn ngược về tab mới
for (const h of ['#/skills', '#/tests', '#/vocab', '#/home?all=1', '#/skill/listening']) { await go(h); ok(!/Không tìm thấy trang|Page not found/.test(w.document.getElementById('view').textContent) && w.document.getElementById('view').children.length, 'trang cũ vẫn mở: ' + h); }
await go('#/skill/listening');
ok($('.crumb a[href="#/train"]'), 'trang con: đường dẫn ngược "Luyện ›"');
ok(W.tabOf('mock') === 'train' && W.tabOf('goal') === 'me' && W.tabOf('lesson') === 'learn' && W.tabOf('review') === 'review', 'tab của mọi trang (mock → Luyện, goal → Tôi)');
// Cột phải máy tính
wide = true; await go('#/home', '.ux1-home');
ok($('#ux1Rail .ux1-exam') && $('#ux1Rail .ux1-today') && $('#ux1Rail #ux1League') && $('#ux1Rail .ux1-promo'), 'máy tính ≥ 1024 px: cột phải chuỗi · mục tiêu hôm nay · giải đấu · app/add-on');
wide = false; await go('#/home', '.ux1-home');
ok(!$('#ux1Rail').innerHTML, 'điện thoại: không vẽ cột phải');
// Xem trước 1 phiên
w.localStorage.removeItem('lk.ux1'); w.location.hash = '#/home?ux1=1';
ok(App.ux1On() && w.sessionStorage.getItem('lk.ux1.pv') === '1', 'xem trước: #/home?ux1=1 bật cho phiên này');
w.sessionStorage.removeItem('lk.ux1.pv'); w.location.hash = '#/home';
ok(!App.ux1On(), 'hết xem trước → tắt');
// i18n: nhãn 5 tab có bản dịch tay cả 15 ngôn ngữ
const fx = JSON.parse(fs.readFileSync('scripts/i18n-fixed.json', 'utf8'));
ok(['Ôn', 'Luyện', 'Giải đấu', 'Luyện thi', 'Bạn học để làm gì?'].every(k => fx[k] && Object.keys(fx[k]).length === 13), 'nhãn mới có bản dịch tay 13 ngôn ngữ (+ vi gốc, en)');
ok(!consoleErr.length, '0 lỗi console' + (consoleErr.length ? ': ' + consoleErr.slice(0, 3).join(' | ') : ''));

console.log(`\n${total - fails}/${total} ux1`);
w.close(); process.exit(fails ? 1 : 0);
