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
await go('#/home', '.ux1-pick, .ux1-home, .v2-today-new');
const tabs = $$('#bnav a');
ok(tabs.length === 5 && tabs.map(a => a.dataset.tab).join(',') === 'learn,review,train,league,me' && tabs.map(a => a.getAttribute('href')).join(',') === '#/home,#/review,#/train,#/league,#/me', 'thanh dưới đúng 5 tab: Học · Ôn · Luyện · Giải đấu · Tôi');
ok($$('#nav a').length === 5 && $$('#nav a').map(a => a.dataset.route).join(',') === 'learn,review,train,league,me', 'menu bên (máy tính) gọn = cùng 5 mục');
ok(w.document.body.classList.contains('ux1') && $('#ux1Rail'), 'body.ux1 + cột phải');
ok($('#bnav a[data-tab="review"] [data-due]'), 'tab Ôn có chấm thẻ đến hạn');
// Lần đầu: chọn mục tiêu 1 chạm → bản đồ
// Home v2 (docs/HOME-V2.md): người mới (chưa xong bài, 0 XP) → "Hôm nay" trống: Ama (Chars, nguyên khung) + 3 bước; bước 1 = chọn mục tiêu (màn chọn 1 chạm cũ)
if ($('.v2-today-new')) {
  const steps = $$('.v2-today-new [data-step]');
  ok(steps.map(a => a.dataset.step).join(',') === 'goal,level,lesson' && steps[0].getAttribute('href') === '#/lesson?pick=1' && steps[1].getAttribute('href') === '#/placement' && /^#\/lesson\/go/.test(steps[2].getAttribute('href')) && steps[0].getAttribute('aria-current') === 'step', 'người mới: 3 bước mục tiêu → kiểm tra trình độ → bài đầu, bước đang làm nổi bật');
  ok($('.v2-today-new [data-tch] img[src*="teach/ama/still-"]') && !$('.v2-today-new [data-tch]').textContent.trim() && $('.v2-today-new [data-cont][data-href="#/lesson?pick=1"]'), 'người mới: ô giáo viên = Ama (Chars.img still) thay ô giữ chỗ; Bắt đầu → bước đang làm');
  ok(['#/lesson/go', '#/review', '#/quick', '#/call'].every(h => $(`.v2-today-new a[href="${h}"]`)) && $('.v2-today-new a[href^="#/lesson/go?story="], .v2-today-new a[href="#/lesson/go"]') && $('.v2-today-new a[href="#/mock"], .v2-today-new a[href="#/toeic"], .v2-today-new a[href="#/toefl"], .v2-today-new a[href="#/placement"]'), 'người mới: 6 ô Bài học · Ôn · Luyện nhanh · Thi thử · Truyện · Gọi giáo viên mở route có sẵn');
  ok($('.v2-today-new nav a[data-tab="learn"][aria-current="page"]') && !$('.v2-today-new [data-show="0"]') && $('.v2-today-new [data-act="lang"]'), 'người mới: thanh tab chung (Học đang chọn) + nút ngôn ngữ; khối không dữ liệu đã gỡ');
  $('.v2-today-new [data-act="lang"]').click(); await tick(60);
  ok($('#modalBox [data-lang-select], #modalBox [data-lang-pick]'), 'nút ngôn ngữ mở App.langPicker');
  if (w.UI && w.UI.closeModal) w.UI.closeModal();
  await go('#/lesson?pick=1', '.ux1-pick');
}
ok($('.ux1-pick') && $$('.ux1-pick [data-pk="ielts"]').length && $$('.ux1-pick [data-pk="toeic"]').length && $$('.ux1-pick [data-pk="toefl"]').length && $$('.ux1-pick [data-pk="general"]').length, 'lần đầu: chọn mục tiêu IELTS / TOEIC / TOEFL / Giao tiếp');
$('.ux1-pk-tg [data-pk="toeic"][data-tg="750"]').click(); await tick(150);
for (let i = 0; i < 60 && !$('.v2-path, .ux1-home'); i++) await tick(50); // chọn xong → về #/home (Hôm nay v2 / bản đồ)
ok(App.state.settings.exam === 'toeic' && App.state.settings.examTarget === '750' && App.state.settings.goalPick && App.state.settings.goalPick.target === 750, 'chạm 1: lưu kỳ thi + điểm mục tiêu vào settings sẵn có');
// Màn Học = khung Stitch v2 (web/js/st/v2/path.js): kiểm cùng các ý như bản cũ trên khung mới
const V2 = !!$('.v2-path');
if (V2) {
  const starts = [...new Set($$('.v2 [data-cur][data-href]').map(b => b.getAttribute('data-href')))];
  ok(starts.length === 1 && starts[0] === '#/lesson/go', 'chạm 2: MỘT đích Bắt đầu tới bài đầu tiên (≤ 2 chạm)');
  ok($('.v2 nav a[data-tab="learn"][aria-current="page"]') && !w.document.body.classList.contains('focus'), 'tab Học đang chọn (thanh tab Stitch), bản đồ giữ thanh điều hướng');
  const nodes = $$('.v2 [data-st]');
  ok(nodes.length === 6 && nodes.every(b => (b.getAttribute('aria-label') || '').trim()) && $('.v2-path img[src*="teach/ama"]') && $$('.v2 [data-st="lock"][aria-disabled="true"]').length, 'nút có nhãn (aria), nút hiện tại có giáo viên Ama (Chars), nút khóa bị khóa');
  ok(nodes.some(b => /TOEIC/.test(b.getAttribute('aria-label') || '')), 'nút kiểm tra kỹ năng thi theo mục tiêu (TOEIC)');
  ok(($('.v2-path h1') || {}).textContent && /%/.test(($('.v2-path [role="progressbar"]') || { getAttribute: () => '' }).getAttribute('style') || ''), 'băng chặng: tên chủ đề + thanh tiến độ thật');
  $('.v2 [data-act="guide"]').click(); await tick(80);
  const mb = ($('#modalBox') || {}).textContent || '';
  ok(/Bạn sẽ|You'll/.test(mb) && /TOEIC · 750/.test(mb) && $('#modalBox a[href="#/toeic"]'), 'nút Guide: câu "Bạn sẽ…" + thẻ kỳ thi + mục tiêu + 1 chạm thi thử (không mất tính năng cũ)');
  if (w.UI && w.UI.closeModal) w.UI.closeModal();
  if ($('.v2-today-new')) ok($('.v2-today-new [data-step="goal"]') && /✓/.test($('.v2-today-new [data-step="goal"]').textContent) && $('.v2-today-new [data-step="level"][aria-current="step"]'), 'người mới: chọn mục tiêu xong → bước 1 ✓, bước kiểm tra trình độ nổi bật, lộ trình đầy đủ hiện bên dưới');
  // Người đang học (đã qua ≥ 1 nút): "Hôm nay" đủ khối từ dữ liệu thật + lộ trình ĐẦY ĐỦ trong khối "Your path"
  w.localStorage.setItem('lk.lsn.path', '2');
  await go('#/home', '.v2-today');
  const T = $('.v2-today');
  ok(T && $('.v2-today [data-cont][data-href="#/lesson/go"]') && /TOEIC/.test($('.v2-today [data-blk="exam"]').textContent) && $('.v2-today [data-blk="exam"] button[data-href="#/toeic"]'), 'Hôm nay: thẻ Tiếp tục → bài hiện tại; thẻ kỳ thi TOEIC + thi thử #/toeic');
  ok($('.v2-today [data-tch] img[src*="teach/ama/still-"]') && !$('.v2-today [data-tch]').textContent.trim() && /\d/.test($('.v2-today [data-tch] + div p').textContent), 'Hôm nay: Ama (Chars) đứng trong ô giáo viên, bong bóng nói số liệu thật');
  ok($$('.v2-today [data-blk="path"] .v2-path [data-st]').length === 6 && $('.v2-today [data-blk="path"] [data-cur][data-href="#/lesson/go"]') && $('.v2-today [data-blk="path"] [data-act="guide"]') && $$('.v2-today [data-st="done"]').length === 2, 'Hôm nay: khối "Lộ trình" chứa ĐỦ 6 nút (xong/đang học/khóa/kiểm tra) + nút Hướng dẫn chặng');
  $('.v2-today [data-act="guide"]').click(); await tick(80);
  ok(/TOEIC · 750/.test(($('#modalBox') || {}).textContent || '') && $('#modalBox a[href="#/lesson?pick=1"]'), 'Hôm nay: Hướng dẫn chặng mở bảng cũ (thẻ kỳ thi, đổi mục tiêu)');
  if (w.UI && w.UI.closeModal) w.UI.closeModal();
  ok(!$('.v2-today [data-show="0"]') && !$('.v2-today [data-blk="due"]') === !w.Core.Cards.dueCount(App.state.cards, App.state.settings, App.state.stats).total, 'Hôm nay: khối không có dữ liệu bị ẩn (nhắc ôn chỉ khi có thẻ đến hạn)');
  ok(['#/mistakes', '#/mistakes?retry=1'].some(h => $(`.v2-today a[href="${h}"]`)) && $('.v2-today a[href="#/listening"]') && $('.v2-today a[href="#/pron"]') && $('.v2-today a[href="#/train"]') && $$('.v2-today [data-blk="week"] [title]').length === 7, 'Hôm nay: luyện nhanh (lỗi sai · từ · nghe · nói) + chuỗi 7 ngày thật');
  ok($('.v2-today nav a[data-tab="learn"][aria-current="page"]') && !$('.v2-today a[href="#vocab"], .v2-today a[href="#"]'), 'Hôm nay: thanh tab chung, không còn liên kết giả của mẫu');
  { App.state.cards.zz = { word: 'zz', vi: 'zz', topic: 'mine', contexts: [], col: [], syn: [], ant: [], examples: [], added: Date.now(), srs: { ef: 2.5, interval: 3, reps: 2, lapses: 0, due: Date.now() - 1000, last: Date.now() - 4e8 } };
    await go('#/home', '.v2-today'); ok($('.v2-today [data-blk="due"] button[data-href="#/review"]'), 'Hôm nay: có thẻ đến hạn → hiện nhắc ôn'); delete App.state.cards.zz; }
  { const sid = ($$('.v2-today [data-blk="stories"] a[href^="#/lesson/go?story="]')[1] || { getAttribute: () => '' }).getAttribute('href').split('story=')[1]; // thẻ THỨ 2 (khác truyện đến lượt) → chứng minh mở đúng truyện được chọn
    ok(sid && $$('.v2-today [data-blk="stories"] a[href^="#/lesson/go?story="]').length === 2, 'Hôm nay: 2 thẻ truyện thật (LESSON_STORIES) mở đúng truyện');
    const st = (w.LESSON_STORIES || []).find(x => x.id === sid), cur = (w.LESSON_STORIES || []).filter(x => x.kind === st.kind)[0];
    w.location.hash = '#/lesson/go?story=' + sid; await tick(10); await App.routes.lesson('go'); await tick(300);
    const vt = w.document.getElementById('view').textContent;
    ok(st && vt.includes(st.lines[0].en.slice(0, 18)) && (st === cur || !vt.includes(cur.lines[0].en.slice(0, 18))) && w.localStorage.getItem('lk.lsn.path') === '2', 'thẻ truyện (?story=) mở đúng truyện đó (không theo vòng xoay), không đẩy nút lộ trình');
    w.location.hash = '#/home'; await tick(10); }
  w.localStorage.setItem('lk.lsn.path', '0');
} else {
const start = $$('.ux1-home .lsn-start');
ok($('.ux1-home') && start.length === 1 && start[0].getAttribute('href') === '#/lesson/go', 'chạm 2: MỘT nút Bắt đầu tới bài đầu tiên (≤ 2 chạm)');
ok($('#bnav a[data-tab="learn"]').getAttribute('aria-current') === 'page' && !w.document.body.classList.contains('focus'), 'tab Học đang chọn, bản đồ giữ thanh điều hướng');
const unitTx = ($('.ux1-unit') || {}).textContent || '';
ok(/Bạn sẽ|You'll/.test(unitTx) && $('.ux1-unit h1') && /\bu-(primary|accent|good|gold|again)\b/.test($('.ux1-unit').className), 'băng chặng: tên chủ đề + câu "Bạn sẽ…" + màu riêng');
ok($$('.ux1-n').length === 6 && $$('.ux1-n .ux1-lbl').every(l => l.textContent.trim()) && $('.ux1-n.next .ux1-tch') && $$('.ux1-n.lock .ux1-lk').length, 'nút có nhãn (không cột icon trơn), nút hiện tại có giáo viên, nút khóa có ổ khóa');
ok(/TOEIC/.test(($('.ux1-n.cp') || {}).textContent || ''), 'nút kiểm tra kỹ năng thi theo mục tiêu (TOEIC)');
ok($('.ux1-exam') && /TOEIC · 750/.test($('.ux1-exam').textContent) && $('.ux1-exam a[href="#/toeic"]'), 'thẻ kỳ thi: kỳ thi + mục tiêu + 1 chạm thi thử');
}
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
const V2T = !!$('.v2-practice');
const firstG = V2T ? $('.v2 [data-grp]:has(a[href="#/mock"])') : $('.ux1-gh'), big = V2T ? null : $('.ux1-tiles.big'), examG = V2T ? $$('.v2 [data-grp]').filter(x => x.dataset.grp === firstG.dataset.grp) : [];
ok(firstG && /Luyện thi|Exam prep/.test(V2T ? firstG.dataset.grp : firstG.textContent) && (V2T ? ['#/mock', '#/toeic', '#/toefl', '#/tests', '#/placement', '#/criteria'].every(h => examG.some(x => x.querySelector(`a[href="${h}"]`))) : big && ['#/mock', '#/toeic', '#/toefl', '#/tests', '#/placement', '#/criteria'].every(h => big.querySelector(`a[href="${h}"]`))), 'Luyện: nhóm "Luyện thi" đầu tiên (IELTS · TOEIC · TOEFL · Thi thử · CEFR · tiêu chí)');
if (V2T) { // khung Stitch v2: thẻ kỳ thi, nước rút, 8 mô-đun kỹ năng, hàng thi thử – và ĐỦ mọi mục của nhóm Kỹ năng
  ok($('.v2-practice [role=progressbar]') && $('.v2-practice button[data-href]') && ['#/skill/listening', '#/skill/reading', '#/skill/writing', '#/skill/speaking', '#/grammar', '#/pron', '#/call'].every(h => $('.v2-practice a[href="' + h + '"]')), 'Luyện (Stitch v2): nước rút + 7 mô-đun kỹ năng đều mở được');
  ok($('.v2-practice button[data-href="#/mock"], .v2-practice button[data-href="#/toeic"], .v2-practice button[data-href="#/toefl"], .v2-practice button[data-href="#/placement"]'), 'Luyện (Stitch v2): hàng thi thử đầy đủ mở đúng bài thi của mục tiêu');
}
const hub = new Set($$('#view a[href^="#/"]').map(a => a.getAttribute('href')));
await go('#/me', '.me-head, .v2-me');
ok($('#bnav a[data-tab="me"]').getAttribute('aria-current') === 'page', 'tab Tôi đang chọn');
const me = new Set($$('#view a[href^="#/"]').map(a => a.getAttribute('href')));
const tabH = new Set(tabs.map(a => a.getAttribute('href')));
const lost = OLD.filter(h => !hub.has(h) && !me.has(h) && !tabH.has(h));
ok(OLD.length >= 20 && !lost.length, `không cắt: ${OLD.length} lối vào cũ đều tới được qua 5 tab / Luyện / Tôi` + (lost.length ? ' – thiếu: ' + lost.join(' ') : ''));
for (const h of ['#/goal', '#/stats', '#/mistakes', '#/settings']) ok(me.has(h), 'Tôi có ' + h);
if ($('.v2-me')) { // Tôi (Stitch v2): MỌI mục trang Tôi cũ còn tới được + công tắc/giá trị bám cài đặt thật
  const hrefs = new Set($$('.v2-me a[href]').map(a => a.getAttribute('href'))), acts = new Set($$('.v2-me [data-act]').map(b => b.getAttribute('data-act')));
  ok(['#/tracks', '#/goal', '#/stats', '#/league', '#/class', '#/mistakes', '#/settings', '#/method', '#/resources', '#/review?src=forgetting'].every(h => hrefs.has(h)) && (hrefs.has('#/deck') || hrefs.has('#/path')), 'Tôi (v2): mọi lối vào cũ (Gói học, Mục tiêu, Tiến độ, Giải đấu, Lớp học, Sổ lỗi sai, Cài đặt, Cách nhớ lâu, Tài nguyên, sổ từ, thời điểm vàng) đều có');
  ok(['theme', 'lang', 'exam', 'notif', 'sfx', 'acct', 'out'].every(a => acts.has(a)) || ['theme', 'lang', 'exam', 'notif', 'sfx', 'out'].every(a => acts.has(a)), 'Tôi (v2): Chế độ màu · Ngôn ngữ · Kỳ thi · Nhắc học · Âm thanh · Đăng xuất/Đăng nhập là nút thật');
  ok($('.v2-me a[href="#/goal"]') && /IELTS|TOEIC|TOEFL|General/.test($('.v2-me a[href="#/goal"]').closest('[data-row]').textContent), 'Tôi (v2): hàng mục tiêu thi → #/goal, hiện kỳ thi');
  const sw = a => $(`.v2-me button[role=switch][data-act="${a}"]`), st0 = App.state.settings;
  ok(sw('notif') && sw('sfx') && sw('notif').getAttribute('aria-checked') === String(!!st0.reminderOn) && sw('sfx').getAttribute('aria-checked') === String(st0.sfx !== false), 'Tôi (v2): công tắc Nhắc học/Âm thanh là role=switch, aria-checked đúng cài đặt thật');
  const was = !!st0.reminderOn; sw('notif').click(); await tick(120);
  ok(!!App.state.settings.reminderOn === !was && sw('notif').getAttribute('aria-checked') === String(!was), 'Tôi (v2): bấm công tắc Nhắc học đổi cài đặt thật + aria-checked');
  const wasS = st0.sfx !== false; sw('sfx').click(); await tick(120);
  ok((App.state.settings.sfx !== false) === !wasS && sw('sfx').getAttribute('aria-checked') === String(!wasS), 'Tôi (v2): công tắc Âm thanh đổi cài đặt thật (s.sfx)');
  const th0 = App.state.settings.theme || 'auto'; $('.v2-me [data-act="theme"]').click(); await tick(120);
  ok((App.state.settings.theme || 'auto') !== th0 && $('.v2-me [data-row="theme"]'), 'Tôi (v2): hàng Chế độ màu xoay auto → sáng → tối bằng cài đặt thật');
  { const u0 = App.state.user, ui0 = w.Sync.ui, si0 = w.Sync.signIn; let outs = 0, ins = 0; w.Sync.ui = k => { if (k === 'out') outs++; }; w.Sync.signIn = () => { ins++; };
    App.state.user = { displayName: 'Khách Test', email: 'k@example.com' }; await go('#/me', '.v2-me'); $('.v2-me [data-act="out"]').click();
    App.state.user = null; await go('#/me', '.v2-me'); const lo = $('.v2-me [data-act="out"]'); lo && lo.click();
    ok(outs === 1 && ins === 1, 'Tôi (v2): Đăng xuất (đã đăng nhập) → hộp xác nhận cũ Sync.ui("out"); chưa đăng nhập → nút Đăng nhập gọi Sync.signIn');
    w.Sync.ui = ui0; w.Sync.signIn = si0; App.state.user = u0; }
  App.state.settings.theme = th0; w.document.documentElement.removeAttribute('data-theme');
  ok($('.v2-me').textContent.includes(String(App.streak())) && $$('.v2-me a[href="#/stats"]').length >= 3, 'Tôi (v2): ô chuỗi ngày/XP/từ đã lưu + huy hiệu dẫn tới #/stats, #/deck');
}
// Ôn (Stitch v2): vào bằng thanh tab → màn hub; nút Bắt đầu mở phiên ôn THẬT; lối cũ (#/review trần, ?ahead=, ?src=) vẫn vào thẳng phiên ôn
{ App.state.cards.hello = { word: 'hello', vi: 'xin chào', topic: 'mine', contexts: [], col: [], syn: [], ant: [], examples: [], added: Date.now(), srs: { ef: 2.5, interval: 3, reps: 2, lapses: 0, due: Date.now() - 1000, last: Date.now() - 4e8 } };
  if (V2T) {
    await go('#/review?hub=1', '.v2-review');
    ok($('.v2-review') && $('.v2 nav a[data-tab="review"][aria-current="page"]') && !w.document.body.classList.contains('focus'), 'Ôn (Stitch v2): hub có thanh tab Stitch, tab Ôn đang chọn');
    ok($('.v2-review button[data-href="#/review"], .v2-review button[data-href="#/review?ahead=2"]') && $('.v2-review [role=progressbar], .v2-review svg circle'), 'Ôn (Stitch v2): nút Bắt đầu → phiên ôn thật; vòng thẻ đến hạn');
    ok($('.v2-review a[href^="#/deck?from="]') && $('.v2-review button[data-href="#/deck"]'), 'Ôn (Stitch v2): bộ thẻ theo nguồn + Quản lý → #/deck');
    ok($('.v2-review button[data-href^="#/review"][aria-label]'), 'Ôn (Stitch v2): chip thẻ sắp quên → #/review?src=forgetting (hoặc phiên ôn)');
    await go('#/review?ahead=2');
    ok(!$('.v2-review'), 'Ôn: ?ahead= vẫn vào thẳng phiên ôn (không qua hub)');
  }
  delete App.state.cards.hello; }
// Trang cũ vẫn chạy (không 404), có đường dẫn ngược về tab mới
for (const h of ['#/skills', '#/tests', '#/vocab', '#/home?all=1', '#/skill/listening']) { await go(h); ok(!/Không tìm thấy trang|Page not found/.test(w.document.getElementById('view').textContent) && w.document.getElementById('view').children.length, 'trang cũ vẫn mở: ' + h); }
await go('#/skill/listening');
ok($('.crumb a[href="#/train"]'), 'trang con: đường dẫn ngược "Luyện ›"');
ok(W.tabOf('mock') === 'train' && W.tabOf('goal') === 'me' && W.tabOf('lesson') === 'learn' && W.tabOf('review') === 'review', 'tab của mọi trang (mock → Luyện, goal → Tôi)');
// Cột phải máy tính
wide = true; await go('#/home', '.ux1-home');
ok(($('#ux1Rail .ux1-exam') || $('#ux1Rail .v2-today-rail [data-blk="exam"]')) && ($('#ux1Rail .ux1-today') || $('#ux1Rail .v2-today-rail a[href="#/review"]')) && $('#ux1Rail #ux1League') && $('#ux1Rail .ux1-promo') && (!(w.ST2 && w.ST2['today-rail']) || ($('#ux1Rail .v2-today-rail') && $$('#ux1Rail [data-blk="week"] [title]').length === 7 && $('#ux1Rail [data-blk="exam"] button[data-href]'))), 'máy tính ≥ 1024 px: cột phải chuỗi · mục tiêu hôm nay · giải đấu · app/add-on');
wide = false; await go('#/home', '.ux1-home');
ok(!$('#ux1Rail').innerHTML, 'điện thoại: không vẽ cột phải');
// Xem trước 1 phiên
w.localStorage.removeItem('lk.ux1'); w.location.hash = '#/home?ux1=1';
ok(App.ux1On() && w.sessionStorage.getItem('lk.ux1.pv') === '1', 'xem trước: #/home?ux1=1 bật cho phiên này');
w.sessionStorage.removeItem('lk.ux1.pv'); w.location.hash = '#/home';
ok(!App.ux1On(), 'hết xem trước → tắt');
// i18n: nhãn 5 tab có bản dịch tay cả 15 ngôn ngữ
const fx = JSON.parse(fs.readFileSync('scripts/i18n-fixed.json', 'utf8'));
// ---------- Sẵn sàng thi #/goal (Stitch v2.1 exam-readiness): khung mới giữ đủ ý trang cũ ----------
{
  w.localStorage.setItem('lk.ux1', '1'); App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; delete App.state.settings.goal;
  await w.Core.Store.set('mocks', []); const P = w.document;
  await go('#/goal', '.v2-exam-readiness');
  ok($('.v2-exam-readiness') && $('#bnav a[data-tab="me"]').getAttribute('aria-current') === 'page', 'goal (v2): khung Stitch exam-readiness, tab Tôi đang chọn');
  ok($('.v2-exam-readiness svg[role="img"]') && $('#start-drill-btn').getAttribute('data-href') === '#/mock' && !$$('.v2-exam-readiness [role="list"] > a').length, 'goal (v2): chưa có điểm thật → trạng thái trống mời thi thử (không bịa số), không ô kỹ năng');
  ok(['gExam', 'gTarget', 'gDate', 'gSave'].every(i => P.getElementById(i)) && /Lập kế hoạch|Make plan|Set plan|plan/i.test($('#gSave').textContent) && $('#view h1'), 'goal (v2): form kỳ thi · điểm mục tiêu · ngày thi · lưu + tiêu đề h1 còn đủ');
  const hrefs = new Set($$('#view a[href]').map(a => a.getAttribute('href')));
  ok(['#/review', '#/listening', '#/reading', '#/write', '#/speaking', '#/grammar', '#/mock'].every(h => hrefs.has(h)), 'goal (v2): chỉ tiêu tuần (6 mục, bấm học ngay) + thi thử + cập nhật điểm còn đủ liên kết');
  ok($$('#view .v2-exam-readiness span').some(x => /^Lần 1|Time 1|1:/.test(x.textContent)) || $$('#view .v2-exam-readiness span').some(x => /\d{1,4}/.test(x.textContent) && /\//.test(x.textContent)), 'goal (v2): lịch thi thử gợi ý + chỉ tiêu tuần x/y hiển thị');
  ok(!!$('#view') && $('#gExam').options.length === 5, 'goal (v2): chọn đủ 5 kỳ thi');
  await w.Core.Store.set('mocks', [{ overall: 6.5, bands: { listening: 7, reading: 7, writing: 6, speaking: 5.5 } }]);
  await go('#/goal', '.v2-exam-readiness [role="list"] > a');
  const sk = $$('.v2-exam-readiness [role="list"] > a');
  ok(sk.length === 4 && sk.every(a => /^#\/skill\//.test(a.getAttribute('href')) && a.getAttribute('aria-label')), 'goal (v2): điểm thật từ thi thử → 4 ô kỹ năng (liên kết #/skill/…, nhãn đọc màn hình đủ trạng thái)');
  ok($('#start-drill-btn').getAttribute('data-href') === '#/skill/speaking' && /5/.test($('#start-drill-btn').textContent), 'goal (v2): nút chính = luyện kỹ năng yếu nhất (Nói)');
  ok(/6\.5/.test($('.v2-exam-readiness').textContent) && $$('.v2-exam-readiness svg path').length >= 2, 'goal (v2): vòng điểm hiện 6.5 + cung tiến độ');
  P.getElementById('gDate').value = new Date(Date.now() + 60 * 864e5).toISOString().slice(0, 10); P.getElementById('gTarget').value = '8';
  P.getElementById('gSave').click(); await tick(150);
  ok(App.state.settings.goal && App.state.settings.goal.target === 8 && App.state.settings.examTarget === '8' && w.location.hash === '#/path', 'goal (v2): Lập kế hoạch lưu mục tiêu thật + chuyển vào lộ trình');
  await go('#/goal', '.v2-exam-readiness');
  ok(/Cập nhật kế hoạch|Update plan/.test($('#gSave').textContent) && $$('#view a').some(a => a.getAttribute('href') === '#/path'), 'goal (v2): đã có kế hoạch → nút Cập nhật + "Tiếp tục học lộ trình"');
  const ex = P.getElementById('gExam'); ex.value = 'general'; ex.dispatchEvent(new w.Event('change')); await tick(30);
  ok(P.getElementById('gTarget').tagName === 'SELECT' && /input/.test(P.getElementById('gDate').tagName.toLowerCase()), 'goal (v2): đổi sang CEFR → điểm mục tiêu thành ô chọn A1–C2');
  delete App.state.settings.goal;
}
// ---------- Gọi giáo viên #/call (Stitch v2.1 teacher-call): khung mới giữ đủ ý trang Gọi cũ ----------
{
  w.localStorage.setItem('lk.ux1', '1'); const P = w.document;
  await go('#/call', '.call-card');
  const cards = $$('.call-card'), CL = w.CALLS;
  ok(cards.length === CL.length && cards.every(a => /^#\/call\/[\w-]+$/.test(a.getAttribute('href'))) && !$$('#view img').some(i => /img\/call\//.test(i.getAttribute('src'))), 'call (v2): danh sách đủ ' + CL.length + ' cuộc gọi, ảnh giáo viên qua Chars (không img/call/mia)');
  const E = w.CallEngine, C0 = E.prep(CL[0]), WHO = C0.who, NM = w.Chars.name(WHO), N0 = C0.nodes[C0.start]; // giáo viên theo kịch bản (c.who Ama/Carlos – CallEngine #194)
  await go('#/call/' + CL[0].id, '#callGo');
  ok($('#callGo') && new RegExp('teach/' + WHO + '/').test($('#view img').getAttribute('src')) && $('#view').textContent.includes(NM) && !/Mia/.test($('#view').textContent), 'call (v2): màn nhấc máy hiện ' + NM + ' (c.who, không Mia)');
  $('#callGo').click(); await tick(300);
  const R = $('.v2-teacher-call');
  ok(R && !$('.call-ov') && $('#cEnd') && $('#cEnd2') && $('#cMic') && $('#cSpk') && $('#cOptTog') && $('#cT') && $('#cBar') && $('#cL1'), 'call (v2): khung Stitch teacher-call thay lớp phủ cũ, đủ nút (cúp máy ×2, mic, nghe lại, thu gọn gợi ý, đồng hồ, tiến độ)');
  ok($('#cTch.tch img') && new RegExp('teach/' + WHO + '/').test($('#cTch img').getAttribute('src')) && !R.innerHTML.includes('img/call/') && !R.querySelector('.call-av'), 'call (v2): giáo viên ' + NM + ' qua Chars/LessonTeacher, đứng trong phòng (không vòng/khung Mia)');
  ok($('#cTch').getAttribute('aria-hidden') === 'true' && ($('#cL1').textContent || '').trim() === N0.m && $('#cL1').getAttribute('lang') === 'en', 'call (v2): ' + NM + ' nói câu đầu, phụ đề tiếng Anh đúng kịch bản');
  ok($('#cPrivB') && ($('#cPriv').textContent || '').length > 10 && $('#cTypeW').hidden && ($('#cKb').click(), !$('#cTypeW').hidden && $('#cIn')) && ($('#cKb').click(), $('#cTypeW').hidden) && $('#cSt[role=status]'), 'call (v2): quyền riêng tư (🔒 + chữ cho trình đọc màn hình), nút ✏️ mở/đóng ô gõ, trạng thái lượt lời role=status');
  const op0 = $$('#cOpts button');
  ok(op0.length === N0.o.length && op0.every(b => b.getAttribute('lang') === 'en' && b.textContent.trim()), 'call (v2): gợi ý trả lời đủ ' + op0.length + ' chip');
  ok(Array.from(R.querySelectorAll('button')).every(b => b.getAttribute('aria-label') || b.textContent.trim()), 'call (v2): mọi nút có nhãn');
  // thu gọn / mở gợi ý
  $('#cOptTog').click(); ok($('#cOpts').hidden && $('#cOptTog').getAttribute('aria-expanded') === 'false', 'call (v2): caret thu gọn gợi ý'); $('#cOptTog').click();
  // trả lời bằng chip → giáo viên đáp tiếp theo nhánh, tiến độ tăng
  const r1 = E.step(C0, C0.start, N0.o[0]), n1 = C0.nodes[r1.next], pc1 = n1 ? Math.min(95, Math.round(1 / Math.max(1, E.depth(C0)) * 100)) : 100;
  op0[0].click(); await tick(100);
  ok(($('#cPct').textContent || '') === pc1 + '%' && $('#cBar').style.width === pc1 + '%' && ($('#cL1').textContent || '').includes(n1 ? n1.m : C0.end), 'call (v2): chọn chip → tiến độ % tăng + ' + NM + ' nói câu kế (nhánh CallEngine)');
  // sửa lỗi tế nhị qua CallEngine.correct vẫn chạy
  const fx = E.correct('I very like coffee', 'What do you want?');
  ok(fx && /really/.test(fx.good), 'call: sửa lỗi tế nhị (CallEngine.correct) còn nguyên');
  // cúp máy: có trả lời → tổng kết
  $('#cEnd').click(); await tick(100);
  ok(/Tổng kết|Call summary|summary/i.test($('#view h1').textContent) && $('#cSave') && $$('#view a[href^="#/call"]').length >= 2 && !$('.v2-teacher-call'), 'call (v2): cúp máy → tổng kết, thêm vào thẻ ôn, gọi lại / cuộc gọi khác');
  w.localStorage.removeItem('lk.ux1');
}

ok(['Ôn', 'Luyện', 'Giải đấu', 'Luyện thi', 'Bạn học để làm gì?'].every(k => fx[k] && Object.keys(fx[k]).length === 13), 'nhãn mới có bản dịch tay 13 ngôn ngữ (+ vi gốc, en)');
ok(!consoleErr.length, '0 lỗi console' + (consoleErr.length ? ': ' + consoleErr.slice(0, 3).join(' | ') : ''));

console.log(`\n${total - fails}/${total} ux1`);
w.close(); process.exit(fails ? 1 : 0);
