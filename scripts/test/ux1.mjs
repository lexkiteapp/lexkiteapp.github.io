// Test UX1 "Một app duy nhất" (cờ ux1, docs/LEARNING-PATH.md): lõi chặng (unitPlan · nextKind · calm · ease) + jsdom chạy app thật:
// cờ mặc định TẮT (giao diện cũ nguyên vẹn) · bật → 5 tab, trang chủ = chọn mục tiêu 1 chạm → bản đồ (≤ 2 chạm tới bài đầu), Luyện "Luyện thi" đầu tiên,
// mọi lối vào cũ (menu bên + thanh dưới) vẫn tới được qua Hôm nay/Từ vựng/Kỹ năng/Thi/Tôi, nút kiểm tra kỹ năng thi mở module thi có sẵn.
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
{ const c = { word: 'hello', vi: 'x', srs: { reps: 1, interval: 1, lapses: 0, due: 0, last: 0, S: 1, D: 5 } }, s = w => ({ word: w, vi: w }), p = E.pickWords({ a: { word: 'apple', vi: 'x', srs: c.srs }, h: c }, { now: Date.now(), n: 2, fixed: true, starter: [s('Hello'), s('name'), s('friend')] }); ok(p.length === 2 && p[0].card.word === 'hello' && p[0].why === 'due' && p[1].card.word === 'name' && p[1].why === 'start', 'pickWords fixed: đúng từ nút đã chốt theo thứ tự, không chen từ đến hạn khác; thẻ sẵn có được dùng lại'); }
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
ok(tabs.length === 5 && tabs.map(a => a.dataset.tab).join(',') === 'home,vocab,skills,tests,me' && tabs.map(a => a.getAttribute('href')).join(',') === '#/home,#/vocab,#/skills,#/tests,#/me', 'thanh dưới đúng 5 tab §5d: Hôm nay · Từ vựng · Kỹ năng · Thi · Tôi');
ok($$('#nav a').length === 5 && $$('#nav a').map(a => a.dataset.route).join(',') === 'home,vocab,skills,tests,me', 'menu bên (máy tính) gọn = cùng 5 mục');
ok(w.document.body.classList.contains('ux1') && $('#ux1Rail'), 'body.ux1 + cột phải');
ok($('#bnav a[data-tab="vocab"] [data-due]'), 'tab Từ vựng có chấm thẻ đến hạn');
// Deep link cũ vẫn chạy + đánh dấu đúng tab; Giải đấu thuộc Hôm nay
for (const [r, k] of [['league', 'home'], ['review', 'vocab'], ['train', 'skills'], ['say', 'skills'], ['mock', 'tests'], ['placement', 'tests'], ['stats', 'me'], ['deck', 'vocab'], ['home', 'home']]) ok(App.navOf(r)[0] === k, `navOf(${r}) → ${k}`);
// Lần đầu: chọn mục tiêu 1 chạm → bản đồ
// Home v2 (docs/HOME-V2.md): người mới (chưa xong bài, 0 XP) → "Hôm nay" trống: Ama (Chars, nguyên khung) + 3 bước; bước 1 = chọn mục tiêu (màn chọn 1 chạm cũ)
if ($('.v2-today-new')) {
  const steps = $$('.v2-today-new [data-step]');
  ok(steps.map(a => a.dataset.step).join(',') === 'goal,level,lesson' && steps[0].getAttribute('href') === '#/lesson?pick=1' && steps[1].getAttribute('href') === '#/placement' && /^#\/lesson\/go/.test(steps[2].getAttribute('href')) && steps[0].getAttribute('aria-current') === 'step', 'người mới: 3 bước mục tiêu → kiểm tra trình độ → bài đầu, bước đang làm nổi bật');
  ok($('.v2-today-new [data-tch] img[src*="teach/ama/still-"]') && !$('.v2-today-new [data-tch]').textContent.trim() && $('.v2-today-new [data-cont][data-href="#/lesson?pick=1"]'), 'người mới: ô giáo viên = Ama (Chars.img still) thay ô giữ chỗ; Bắt đầu → bước đang làm');
  ok(['#/lesson/go', '#/review', '#/quick', '#/call'].every(h => $(`.v2-today-new a[href="${h}"]`)) && $('.v2-today-new a[href^="#/lesson/go?story="], .v2-today-new a[href="#/lesson/go"]') && $('.v2-today-new a[href="#/mock"], .v2-today-new a[href="#/toeic"], .v2-today-new a[href="#/toefl"], .v2-today-new a[href="#/placement"]'), 'người mới: 6 ô Bài học · Ôn · Luyện nhanh · Thi thử · Truyện · Gọi giáo viên mở route có sẵn');
  ok($('.v2-today-new nav a[data-tab="home"][aria-current="page"]') && !$('.v2-today-new [data-show="0"]') && $('.v2-today-new [data-act="lang"]'), 'người mới: thanh tab chung (Hôm nay đang chọn) + nút ngôn ngữ; khối không dữ liệu đã gỡ');
  $('.v2-today-new [data-act="lang"]').click(); await tick(60);
  ok($('#modalBox [data-lang-select], #modalBox [data-lang-pick]'), 'nút ngôn ngữ mở App.langPicker');
  if (w.UI && w.UI.closeModal) w.UI.closeModal();
  await go('#/lesson?pick=1', '.ux1-pick');
}
ok($('.ux1-pick') && $$('.ux1-pick [data-pk="ielts"]').length && $$('.ux1-pick [data-pk="toeic"]').length && $$('.ux1-pick [data-pk="toefl"]').length && $$('.ux1-pick [data-pk="general"]').length, 'lần đầu: chọn mục tiêu IELTS / TOEIC / TOEFL / Giao tiếp');
$('.ux1-pk-tg [data-pk="toeic"][data-tg="750"]').click(); await tick(150);
for (let i = 0; i < 60 && !$('.v2-path, .ux1-home'); i++) await tick(50); // chọn xong → về #/home (Hôm nay v2 / bản đồ)
ok($('#lvlSkip'), 'chọn kỳ thi: mời kiểm tra trình độ ngay'); if (w.UI && w.UI.closeModal) w.UI.closeModal();
ok(App.state.settings.exam === 'toeic' && App.state.settings.examTarget === '750' && App.state.settings.goalPick && App.state.settings.goalPick.target === 750, 'chạm 1: lưu kỳ thi + điểm mục tiêu vào settings sẵn có');
// Màn Học = khung Stitch v2 (web/js/st/v2/path.js): kiểm cùng các ý như bản cũ trên khung mới
const V2 = !!$('.v2-path');
if (V2) {
  const starts = [...new Set($$('.v2 [data-cur][data-href]').map(b => b.getAttribute('data-href')))];
  ok(starts.length === 1 && starts[0] === '#/lesson/go', 'chạm 2: MỘT đích Bắt đầu tới bài đầu tiên (≤ 2 chạm)');
  ok($('.v2 nav a[data-tab="home"][aria-current="page"]') && !w.document.body.classList.contains('focus'), 'tab Hôm nay đang chọn (thanh tab Stitch), bản đồ giữ thanh điều hướng');
  const nodes = $$('.v2 [data-pr] button[aria-haspopup="dialog"]'); // ô truyện rỗng ẩn nút → 5 hoặc 6
  ok(nodes.length >= 5 && nodes.length <= 6 && nodes.every(b => (b.getAttribute('aria-label') || '').trim()) && $('.v2-path img[src*="teach/ama"]') && nodes.some(b => /Locked|Đã khóa/.test(b.getAttribute('aria-label'))), 'nút có nhãn (aria), nút hiện tại có giáo viên Ama (Chars), nút khóa nói rõ đã khóa');
  ok(nodes.every(b => !/^(Lesson|Listen|Speak|Story|Review|Check|Bài học|Nghe|Nói|Truyện|Ôn|Kiểm tra)\b( –| -|$)/.test(b.getAttribute('aria-label'))), 'tiêu đề nút là nội dung thật, không phải tên loại bài');
  ok(($('.v2-path p') || {}).textContent && /\d+\/\d+/.test(($('.v2-path [role="progressbar"]') || { getAttribute: () => '' }).getAttribute('aria-label') || '') && /width:\d+%/.test($('.v2-path [role="progressbar"]').getAttribute('style') || ''), 'băng chặng: tên chủ đề + thanh tiến độ thật + chữ x/y bài');
  $('.v2 [data-act="guide"]').click(); await tick(80);
  const mb = ($('#modalBox') || {}).textContent || '';
  ok(/Bạn sẽ|You'll/.test(mb) && /TOEIC · 750/.test(mb) && $('#modalBox a[href="#/toeic"]'), 'nút Guide: câu "Bạn sẽ…" + thẻ kỳ thi + mục tiêu + 1 chạm thi thử (không mất tính năng cũ)');
  if (w.UI && w.UI.closeModal) w.UI.closeModal();
  if ($('.v2-today-new')) ok($('.v2-today-new [data-step="goal"]') && /✓/.test($('.v2-today-new [data-step="goal"]').textContent) && $('.v2-today-new [data-step="level"][aria-current="step"]'), 'người mới: chọn mục tiêu xong → bước 1 ✓, bước kiểm tra trình độ nổi bật, lộ trình đầy đủ hiện bên dưới');
  // Người đang học (đã qua ≥ 1 nút): "Hôm nay" đủ khối từ dữ liệu thật + lộ trình ĐẦY ĐỦ trong khối "Your path"
  w.localStorage.setItem('lk.lsn.path', '2');
  await go('#/home', '.v2-today');
  const T = $('.v2-today');
  ok($$('.v2-today .ux1-go.lsn-start').length >= 1 && $$('.v2-today .ux1-go').every(x => x.getAttribute('data-href') === '#/lesson/go'), 'Hôm nay: nút Bắt đầu chính mang móc chung .lsn-start.ux1-go (lesson-embed/gác bố cục bấm đúng nút, không bấm nhầm thẻ truyện)');
  ok(T && $('.v2-today [data-cont][data-href="#/lesson/go"]') && /TOEIC/.test($('.v2-today [data-blk="exam"]').textContent) && $('.v2-today [data-blk="exam"] button[data-href="#/toeic"]'), 'Hôm nay: thẻ Tiếp tục → bài hiện tại; thẻ kỳ thi TOEIC + thi thử #/toeic');
  ok($('.v2-today [data-tch] img[src*="teach/ama/still-"]') && !$('.v2-today [data-tch]').textContent.trim() && /\d/.test($('.v2-today [data-tch] + div p').textContent), 'Hôm nay: Ama (Chars) đứng trong ô giáo viên, bong bóng nói số liệu thật');
  const px = $('.v2-today [data-act="pathx"]'), pv = () => $('.v2-today [data-pv]'), rows = () => $$('.v2-today [data-pv] [data-pr]'), heads = () => $$('.v2-today [data-pv] [role="progressbar"]').length, nb = id => $(`.v2-today [data-pr="${id}"] button[aria-haspopup="dialog"]`);
  const n0 = rows().length;
  ok(px && px.tagName === 'BUTTON' && px.getAttribute('aria-expanded') === 'false' && pv() && heads() === 1 && n0 >= 5 && n0 <= 6 && $$('.v2-today [data-pv] [data-cur][data-href="#/lesson/go"]').length === 1 && $$('.v2-today [data-pv] .tslot').length === 1 && !!$('.v2-today [data-pv] svg path').getAttribute('d'), 'Hôm nay: khối Lộ trình thu gọn = chặng hiện tại (đúng 1 đầu chặng, 5–6 nút, 1 nút đang học + Ama, đường nối thật)');
  const list0 = pv(); px.click(); await tick(50);
  ok(px.getAttribute('aria-expanded') === 'true' && pv() === list0 && heads() > 1 && rows().length > n0 && !$('.v2-today [data-pathfull]'), 'Xem toàn bộ lộ trình: mở TẠI CHỖ cùng một component (chỉ thêm hàng, không có bản thứ hai)');
  ok($$('.v2-today [data-blk="path"] [data-cur][data-href="#/lesson/go"]').length === 1 && $('.v2-today [data-blk="path"] [data-act="guide"]') && $$('.v2-today [data-pv] polyline').length >= 2, 'Hôm nay: khối "Lộ trình" mở rộng vẫn một nút đang học, có nút đã xong + Hướng dẫn chặng');
  $('.v2-today [data-act="guide"]').click(); await tick(80);
  ok(/TOEIC · 750/.test(($('#modalBox') || {}).textContent || '') && $('#modalBox a[href="#/lesson?pick=1"]'), 'Hôm nay: Hướng dẫn chặng mở bảng cũ (thẻ kỳ thi, đổi mục tiêu)');
  if (w.UI && w.UI.closeModal) w.UI.closeModal();
  // Bấm nút nào cũng có phản hồi: tấm chi tiết (đang học / đã xong / khoá)
  const sheetOf = async b => { b.click(); await tick(120); const g = $('#modalBox [data-act="pgo"]'); const out = g && { scoped: !!$('#modalBox .v2s-path-sheet .v2-path-sheet'), txt: $('#modalBox').textContent, go: g.textContent, dis: g.disabled, href: g.getAttribute('data-href') }; if (w.UI && w.UI.closeModal) w.UI.closeModal(); await tick(30); return out; };
  { const cur = await sheetOf(nb('n2')); ok(cur && cur.scoped && /Start|Bắt đầu/.test(cur.go) && !cur.dis && cur.href === '#/lesson/go' && /\d/.test(cur.txt), 'tấm chi tiết nút đang học: nội dung + phút + Bắt đầu vào đúng bài');
    const done = await sheetOf(nb('n0')); ok(done && /Practise again|Ôn lại/.test(done.go) && !done.dis && /[?&]redo=0\b/.test(done.href), 'tấm chi tiết nút đã xong: Ôn lại → ?redo=<nút đó>');
    const lk = await sheetOf(nb('n3')); ok(lk && /Finish .+ to unlock|Hoàn thành .+ để mở/.test(lk.go) && lk.dis && !lk.href, 'nút khoá: tấm nói điều kiện "Hoàn thành X để mở", không có đích bấm'); }
  { const xp0 = App.state.game.xp; App.state.game.xp = 5; // đã học (không bị mời kiểm tra trình độ)
    w.location.hash = '#/lesson/go?redo=0'; await tick(10); await App.routes.lesson('go'); await tick(300); App.state.game.xp = xp0; }
  ok(w.document.querySelector('.lsn, .lsn-v2') && w.localStorage.getItem('lk.lsn.path') === '2', 'Ôn lại (?redo=) mở bài của nút đó và không đẩy tiến độ lộ trình');
  await go('#/home', '.v2-today');
  { const px2 = $('.v2-today [data-act="pathx"]'); px2.click(); await tick(30); px2.click(); await tick(30);
    ok(px2.getAttribute('aria-expanded') === 'false' && $$('.v2-today [data-pv] [role="progressbar"]').length === 1 && $$('.v2-today [data-pv] [data-pr]').length === n0, 'Thu gọn lộ trình: về đúng chặng hiện tại'); }
  // 🛤 Hình học đường lộ trình (lỗi 13/11: đường gãy + khe hở giữa nút, zigzag lệch, thẻ giáo viên đè) – số đo thật từ DOM đã vẽ (mở rộng = nhiều hàng/chặng)
  { $('.v2-today [data-act="pathx"]').click(); await tick(50); const lst = $('.v2-today [data-pv]'), num = (e, a) => parseFloat((e.getAttribute('style') || '').match(new RegExp(a + ':\\s*(-?[\\d.]+)px'))[1]), BTN = b => { const c = b.getAttribute('class'); return /(?:^|\s)w-14(?:\s|$)/.test(c) ? 28 : +(c.match(/(?:^|\s)w-\[(\d+)px\]/) || [0, NaN])[1] / 2; } /* nửa cỡ nút: w-14 = 28; nút hiện tại w-[72px] = 36 (chứa trọn vòng tiến độ – lỗi spill 13/11) */;
    const seq = [...lst.children], nodeRows = seq.filter(e => e.hasAttribute('data-pr')), end = d => d.trim().split(/\s+/).slice(-2).map(Number), start = d => d.trim().slice(1).split(/\s+/).slice(0, 2).map(Number);
    const info = r => { const [pin, pout] = [...r.querySelectorAll(':scope > svg > path')].map(p => p.getAttribute('d')), svg = r.querySelector(':scope > svg'), h = num(r, 'height'), b = r.querySelector(':scope > button'); return { r, pin, pout, svg, h, cx: num(b, 'inset-inline-start') + BTN(b), cy: num(b, 'top') + BTN(b) }; };
    const I = nodeRows.map(info), pairs = I.slice(1).map((n, i) => [I[i], n]).filter(([a, b]) => a.r.nextElementSibling === b.r); // cặp liền nhau trong cùng chặng (đầu chặng xen giữa → đường ngắt có chủ ý)
    ok(I.length > 8 && pairs.length > 6, 'hình học đường: mở rộng đủ hàng để đo (≥ 2 chặng, ≥ 7 cặp nút liền nhau)');
    ok(pairs.every(([a, b]) => end(a.pout)[0] === start(b.pin)[0]) && I.every(n => start(n.pin)[1] === 0 && end(n.pout)[1] === n.h && end(n.pin)[0] === n.cx && end(n.pin)[1] === n.cy && start(n.pout)[0] === n.cx && start(n.pout)[1] === n.cy), 'đường liền một nét: pout hàng trên kết thúc đúng x nơi pin hàng dưới bắt đầu, pin bắt đầu y=0 · pout kết thúc y=cao hàng · hai đoạn gặp nhau đúng tâm nút (không gãy, không hở)');
    ok(I.every(n => n.svg.getAttribute('height') === String(n.h) && n.svg.getAttribute('viewBox').split(' ')[3] === String(n.h) && /(^|\s)top-0(\s|$)/.test(n.svg.getAttribute('class')) && /(^|\s)start-0(\s|$)/.test(n.svg.getAttribute('class'))), 'svg đường cao đúng bằng hàng, neo mép trên-đầu hàng (không lệch theo viền)');
    ok(I.every(n => !/(^|\s)(lt:|dk:)?(border(-[btxylrse])?|bg-\[[^\]]+\]|divide-\S+)(\s|$)/.test(n.r.getAttribute('class') || '')), 'hàng lộ trình: KHÔNG viền ngang, KHÔNG nền dải (một đường liền, không thành danh sách)');
    const H0 = I.filter(n => !n.r.querySelector('[data-cur]')); ok(H0.every(n => n.h === H0[0].h && n.cy === n.h / 2) && new Set(pairs.filter(([a, b]) => !a.r.querySelector('[data-cur]') && !b.r.querySelector('[data-cur]')).map(([a, b]) => a.h - a.cy + b.cy)).size === 1, 'hàng đã xong/khóa/kiểm tra cùng một chiều cao, nút đặt giữa hàng → khoảng cách nút đều');
    const xs = I.map(n => n.cx), lo = Math.min(...xs), hi = Math.max(...xs), mid = (lo + hi) / 2, A = (hi - lo) / 2;
    ok(A > 0 && xs.every(x => [0, A].includes(Math.abs(x - mid))) && pairs.every(([a, b]) => Math.abs(b.cx - a.cx) === A) && new Set(xs).size === 3, 'zigzag đều: biên độ không đổi và đối xứng quanh trục đường (|x − trục| ∈ {0, A}), mỗi bước giữa hai nút liền nhau lệch đúng A');
    const col = r => { const t = r.querySelector('[data-ptx], [data-pcard]'); return +(t.getAttribute('class').match(/(?:^|\s)start-\[(\d+)px\]/) || [])[1]; }, wOf = r => Math.max(...[...r.querySelectorAll('button, button *')].map(e => +((e.getAttribute('class') || '').match(/(?:^|\s)w-(\d+)(?:\s|$)/) || [0, 0])[1] * 4));
    ok(I.every(n => { const half = wOf(n.r) / 2, c = col(n.r); return half >= 22 && n.cx - half >= 0 && n.cx + half <= c - 12; }), 'nút lộ trình (kể cả vòng 64 px của nút hiện tại) nằm trọn cột đường, cách cột chữ/thẻ ≥ 12 px ở mọi vị trí zigzag');
    const cur = $('.v2-today [data-pv] [data-pcard]'), tch = cur && cur.querySelector('.tslot'), holder = tch && tch.parentElement, meOf = el => el ? +(el.getAttribute('class').match(/(?:^|\s)me-\[(\d+)px\]/) || [])[1] : 0, padE = cur ? +(cur.getAttribute('class').match(/(?:^|\s)px-3\.5(?:\s|$)/) ? 14 : 0) : 0, sub = cur && cur.querySelector(':scope > p:nth-of-type(2)'), btnBox = cur && cur.querySelector(':scope > div.mt-auto'), hw = holder && +(holder.getAttribute('class').match(/w-\[(\d+)px\]/) || [])[1];
    ok(cur && cur.querySelectorAll('.tslot').length === 1 && tch.getAttribute('data-ground') === '0' && hw >= Math.round(w.TeacherSlot.SIZES.m * .9) && /(?:^|\s)end-1(?:\s|$)/.test(holder.getAttribute('class')) && padE === 14 && [sub, btnBox].every(el => meOf(el) >= hw + 4 - padE + 4) && ![sub, btnBox].some(el => /(?:^|\s)m-0(?:\s|$)/.test(el.getAttribute('class'))) && !/(?:^|\s)pe-\[/.test(cur.getAttribute('class')) && [...cur.parentElement.parentElement.querySelectorAll('[data-pr] > button > span')].filter(x => x.querySelector('svg circle')).every(x => /(?:^|\s)shrink-0(?:\s|$)/.test(x.getAttribute('class'))), 'giáo viên nằm TRONG thẻ hiện tại (bệ cùng màu thẻ: ground:false), phụ đề + nút chừa lề cuối ≥ chỗ giáo viên + 4 px, phụ đề lùi bằng MARGIN, không kèm m-0 (.v2s-today .m-0 tải sau đè mất me-[…]) (padding vẫn để hộp chữ dưới giáo viên – lỗi CI 13/11), vòng tiến độ shrink-0 đồng tâm ô (không lệch phải 16 px), tiêu đề dùng hết bề ngang thẻ (không cắt “…” như 13/11) → không đè chữ/nút');
    const T = JSON.parse(fs.readFileSync('brand/tokens.json', 'utf8')), cc = cur.getAttribute('class');
    ok(/(?:^|\s)\[--bg:var\(--surface\)\](?:\s|$)/.test(cc) && /overflow-hidden/.test(cc) && T.roles['surface-container'] === '--surface' && cc.includes(`lt:bg-[${T.light['--surface'].toUpperCase()}]`) && cc.includes(`dk:bg-[${T.dark['--surface'].toUpperCase()}]`) && /\[data-ground="0"\] \.tslot-ledge\{background:var\(--bg\)/.test(fs.readFileSync(path.join(WEB, 'js/teacher-slot.js'), 'utf8')), 'bệ giáo viên = màu mặt thẻ ở cả sáng/tối (thẻ đặt --bg = --surface, mặt thẻ = vai trò surface) → không còn bệ xám lệch màu, thẻ xén phần tràn của khung ảnh');
    ok(/rtl:-scale-x-100/.test(I[0].svg.getAttribute('class')) && !I.some(n => /(^|\s)(left|right)-\S+/.test(n.r.querySelector(':scope > [data-ptx], :scope > [data-pcard]').getAttribute('class'))) && I.every(n => /inset-inline-start/.test(n.r.querySelector(':scope > button').getAttribute('style'))) && /rtl\\:-scale-x-100/.test(fs.readFileSync(path.join(WEB, 'css/st-v2-path.css'), 'utf8')), 'RTL (ar): đường, nút, cột chữ dùng thuộc tính logic (start/end, inset-inline-start) + svg lật bằng rtl:-scale-x-100 có trong CSS dựng sẵn → cả cột đường đổi sang bên phải'); $('.v2-today [data-act="pathx"]').click(); await tick(30); }
  // 🔒 Tương phản nút khóa (lỗi 13/11: ô khóa nhạt như hỏng) – màu THẬT trong mẫu Stitch sáng + tối (sau khi gom bảng màu)
  { const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; }, cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
    for (const th of ['light', 'dark']) { const src = fs.readFileSync(`brand/stitch/v2/path-${th}.html`, 'utf8'), main = src.slice(src.indexOf('<main'), src.indexOf('</main>')), page = main.match(/^<main[^>]*bg-\[(#[0-9A-Fa-f]{6})\]/)[1];
      const row = main.split('\n').find(l => l.includes('aria-label="Story: the new neighbour"')), g = (re, s = row) => (s.match(re) || [])[1], tile = g(/<div class="w-11 h-11[^"]*?\bbg-\[(#[0-9A-Fa-f]{6})\]/), edge = g(/<div class="w-11 h-11[^"]*?\bborder-\[(#[0-9A-Fa-f]{6})\]/), icon = g(/<svg class="stroke-\[(#[0-9A-Fa-f]{6})\]" fill="none" height="22"/), title = g(/line-clamp-2 text-\[(#[0-9A-Fa-f]{6})\]/), sub = g(/truncate text-xs font-bold text-\[(#[0-9A-Fa-f]{6})\]/), todo = g(/<path class="stroke-\[(#[0-9A-Fa-f]{6})\]"/);
      ok(tile && edge && icon && title && sub && todo && cr(icon, tile) >= 4.5 && cr(edge, page) >= 2.5 && cr(title, page) >= 4.5 && cr(sub, page) >= 4.5 && cr(todo, page) >= 1.5, `nút khóa (${th}): icon/ô ≥ 4.5:1 (${cr(icon, tile).toFixed(1)}), viền ô/nền trang ≥ 2.5:1 (${cr(edge, page).toFixed(1)}), chữ tiêu đề + phụ ≥ 4.5:1, đường chưa tới thấy rõ ≥ 1.5:1`); } }
  // Ô truyện rỗng: ẩn nút, tự bỏ qua vị trí đó
  { const PT = w.PathTrail, U = w.LESSON_PATH_NODES.units, id = Object.keys(U).find(k => { const s = U[k].nodes.find(x => x.slot === 'story'); return s && !s.story; }), unitAt = () => ({ id, no: 2, words: [] });
    ok(id && PT.hidden({ id }, 3) && !PT.hidden({ id }, 2) && PT.skip(3, unitAt) === 4 && PT.skip(2, unitAt) === 2, 'chặng có ô truyện rỗng: ẩn đúng nút đó, tiến độ tự bỏ qua vị trí đó'); }
  // Nút ôn chen chỗ đầu chặng (lỗi 13/11: cùng tên + cùng 4 từ với bài 5 cuối chặng) → nhãn riêng, KHÔNG mượn ô cố định (ôn thẻ đến hạn của người học)
  { const PT = w.PathTrail, U = w.LESSON_PATH_NODES.units, id = Object.keys(U).find(k => U[k].nodes.some(x => x.slot === 'review' && x.words.length) && U[k].nodes.some(x => x.slot === 'story' && x.story)), unitAt = () => ({ id, no: 1, name: 'X', words: [] });
    const P = ['review', 'listen', 'speak', 'story', 'review', 'exam'].map(kind => ({ kind })), o = { P, at: 0, n: 0, Q: '', unitAt, check: () => ({ href: '#/toeic' }), can: {}, kmin: {}, tch: () => '' };
    const B = PT.build(o, false), nodes = B.rows.filter(r => r.id), sw = nodes[0], cell = U[id].nodes.find(x => x.slot === 'review');
    ok(id && nodes.length === 6 && new Set(nodes.map(r => r.label)).size === nodes.length, 'đầu chặng là ôn chen chỗ: nhãn các nút trong chặng đều khác nhau (không còn 2 nút "Ôn:" trùng tên)');
    ok(sw.label === w.t('Ôn lỗi trước bài mới') && sw.sub === w.t('Những từ bạn hay quên') && PT.wordsOf(0, unitAt, 'review') === null && B.by[sw.id].words.length === 0 && nodes[4].label === w.t(cell.title) && PT.wordsOf(4, unitAt, 'review').length === cell.words.length, 'nút ôn chen chỗ: tên riêng "Ôn lỗi trước bài mới", không có ô cố định (wordsOf = null, ôn thẻ đến hạn) · nút ôn cuối chặng giữ nội dung riêng của nó'); }
  await go('#/home?at=path', '.v2-today');
  for (let i = 0; i < 40 && !$('.v2-today [data-pv] [data-cur]'); i++) await tick(50); // home2 vẽ bất đồng bộ
  ok($('.v2-today [data-act="pathx"]') && $('.v2-today [data-act="pathx"]').getAttribute('aria-expanded') === 'true' && $$('.v2-today [data-pv] [role="progressbar"]').length > 1 && $('.v2-today [data-pv] [data-cur][data-href="#/lesson/go"]') && $('.v2-today [data-pv] [data-act="guide"]'), 'liên kết cũ #/home?at=path: lộ trình đầy đủ mở sẵn, có nút đang học + Hướng dẫn chặng');
  $('.v2-today [data-pv] [data-act="guide"]').click(); await tick(80);
  ok(/TOEIC · 750/.test(($('#modalBox') || {}).textContent || ''), '?at=path: Hướng dẫn chặng trong khối đã mở vẫn mở bảng');
  if (w.UI && w.UI.closeModal) w.UI.closeModal();
  // Nút kiểm tra đã xong: Ôn lại vẫn mở module thi theo mục tiêu (TOEIC)
  { const k0 = w.localStorage.getItem('lk.lsn.path'); w.localStorage.setItem('lk.lsn.path', '6'); await go('#/home', '.v2-today'); $('.v2-today [data-act="pathx"]').click(); await tick(50); const ex = $('.v2-today [data-pr="n5"] button[aria-haspopup="dialog"]'); ex.click(); await tick(120); ok(($('#modalBox [data-act="pgo"]') || { getAttribute: () => '' }).getAttribute('data-href') === '#/toeic', 'nút kiểm tra kỹ năng thi theo mục tiêu mở #/toeic'); if (w.UI && w.UI.closeModal) w.UI.closeModal(); w.localStorage.setItem('lk.lsn.path', k0); }
  await go('#/home', '.v2-today');
  ok(!$('.v2-today [data-show="0"]') && !$('.v2-today [data-blk="due"]') === !w.Core.Cards.dueCount(App.state.cards, App.state.settings, App.state.stats).total, 'Hôm nay: khối không có dữ liệu bị ẩn (nhắc ôn chỉ khi có thẻ đến hạn)');
  ok(['#/mistakes', '#/mistakes?retry=1'].some(h => $(`.v2-today a[href="${h}"]`)) && $('.v2-today a[href="#/listening"]') && $('.v2-today a[href="#/pron"]') && $('.v2-today a[href="#/train"]') && $$('.v2-today [data-blk="week"] [title]').length === 7, 'Hôm nay: luyện nhanh (lỗi sai · từ · nghe · nói) + chuỗi 7 ngày thật');
  ok($('.v2-today nav a[data-tab="home"][aria-current="page"]') && !$('.v2-today a[href="#vocab"], .v2-today a[href="#"]'), 'Hôm nay: thanh tab chung, không còn liên kết giả của mẫu');
  { App.state.cards.zz = { word: 'zz', vi: 'zz', topic: 'mine', contexts: [], col: [], syn: [], ant: [], examples: [], added: Date.now(), srs: { ef: 2.5, interval: 3, reps: 2, lapses: 0, due: Date.now() - 1000, last: Date.now() - 4e8 } };
    await go('#/home', '.v2-today'); ok($('.v2-today [data-blk="due"] button[data-href="#/review"]') || $('.v2-today [data-blk="plan"] [data-href="#/review"], .v2-today [data-blk="plan"] a[href="#/review"]'), 'Hôm nay: có thẻ đến hạn → có đúng một lối nhắc ôn (khối riêng, hoặc dòng #/review ngay trong kế hoạch – không hiện cả hai)'); ok(!($('.v2-today [data-blk="due"]') && $('.v2-today [data-blk="plan"] [data-href="#/review"], .v2-today [data-blk="plan"] a[href="#/review"]')), 'Hôm nay: một lối nhắc ôn, không lặp khối riêng + dòng kế hoạch'); delete App.state.cards.zz; }
  { const sid = ($$('.v2-today [data-blk="stories"] a[href^="#/lesson/go?story="]')[1] || { getAttribute: () => '' }).getAttribute('href').split('story=')[1]; // thẻ THỨ 2 (khác truyện đến lượt) → chứng minh mở đúng truyện được chọn
    ok(sid && $$('.v2-today [data-blk="stories"] a[href^="#/lesson/go?story="]').length === 2, 'Hôm nay: 2 thẻ truyện thật (LESSON_STORIES) mở đúng truyện');
    const st = (w.LESSON_STORIES || []).find(x => x.id === sid), cur = (w.LESSON_STORIES || []).filter(x => x.kind === st.kind)[0];
    w.location.hash = '#/lesson/go?story=' + sid; await tick(10); await App.routes.lesson('go'); await tick(300);
    const vt = w.document.getElementById('view').textContent;
    ok(st && vt.includes(st.lines[0].en.slice(0, 18)) && (st === cur || !vt.includes(cur.lines[0].en.slice(0, 18))) && w.localStorage.getItem('lk.lsn.path') === '2', 'thẻ truyện (?story=) mở đúng truyện đó (không theo vòng xoay), không đẩy nút lộ trình');
    w.location.hash = '#/home'; await tick(10); }
  { // Học xong truyện mở từ Hôm nay: "Bài khác" phải sang bài mới, Hôm nay không mời lại truyện vừa xong
    const zz = { id: 'zz-next', kind: 'story', cefr: 'A1', title: 'ZZ', lines: [{ who: 'ama', en: 'Zebra line one here.' }, { who: 'carlos', en: 'Zebra line two here.' }], checks: [] }; w.LESSON_STORIES.unshift(zz); const p0 = w.localStorage.getItem('lk.lsn.path');
    w.location.hash = '#/lesson/go?story=zz-next'; await tick(10); await App.routes.lesson('go'); await tick(300);
    for (let i = 0; i < 40 && !$('#lsnAgain'); i++) { const o = $('#lsnBody .lsn-opt'), c = $('#lsnCheck'), g = $('#lsnNext') || $('#lsnGo'); if (g) g.click(); else if (c && c.disabled && o) o.click(); else if (c) c.click(); await tick(260); }
    ok($('#lsnAgain'), 'truyện từ Hôm nay: học hết tới màn kết');
    ok(JSON.parse(w.localStorage.getItem('lk.lsn.sd') || '[]').includes('zz-next') && w.localStorage.getItem('lk.lsn.path') === p0, 'xong truyện: ghi đã học, không đẩy nút lộ trình');
    $('#lsnAgain').click(); await tick(400);
    ok(w.location.hash === '#/lesson/go' && !w.document.getElementById('view').textContent.includes('Zebra line'), `"Bài khác" sang bài mới, không học lại truyện vừa xong (hash ${w.location.hash})`);
    await go('#/home', '.v2-today'); const first = ($('.v2-today [data-blk="stories"] a[href^="#/lesson/go?story="]') || { getAttribute: () => '' }).getAttribute('href'); ok(first && !first.includes('zz-next'), `Hôm nay: thẻ truyện đầu không phải truyện vừa học (${first})`);
    w.LESSON_STORIES.shift(); w.localStorage.removeItem('lk.lsn.sd'); }
  w.localStorage.setItem('lk.lsn.path', '0');
} else {
const start = $$('.ux1-home .lsn-start');
ok($('.ux1-home') && start.length === 1 && start[0].getAttribute('href') === '#/lesson/go', 'chạm 2: MỘT nút Bắt đầu tới bài đầu tiên (≤ 2 chạm)');
ok($('#bnav a[data-tab="home"]').getAttribute('aria-current') === 'page' && !w.document.body.classList.contains('focus'), 'tab Hôm nay đang chọn, bản đồ giữ thanh điều hướng');
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
// Chọn kỳ thi, chưa rõ trình độ: bài đầu mời kiểm tra 5 phút, có Bỏ qua, không ép; bỏ qua thì vào học và không hỏi lại
const xp0 = App.state.game.xp; App.state.game.xp = 0; delete App.state.settings.plSkip;
ok(W.needLevel(), 'đã chọn kỳ thi + chưa có kết quả/tự chọn trình độ → cần mời');
await App.routes.lesson('go'); await tick(30);
ok($('#lvlGo') && $('#lvlGo').getAttribute('href') === '#/placement' && $('#lvlSkip'), 'bài đầu: mời kiểm tra trình độ, có nút Bỏ qua');
$('#lvlSkip').click(); await tick(60);
ok(App.state.settings.plSkip && !W.needLevel() && w.document.getElementById('modal').hidden, 'Bỏ qua: lưu lựa chọn, đóng hộp, không hỏi lại');
App.state.settings.placement = { v: 2, band: 6 }; delete App.state.settings.plSkip; ok(!W.needLevel(), 'đã có kết quả kiểm tra → không mời'); delete App.state.settings.placement; App.state.settings.exam = 'general'; ok(!W.needLevel(), 'Giao tiếp → không mời'); App.state.settings.exam = 'toeic'; App.state.settings.plSkip = 1; App.state.game.xp = xp0;
// Nút kiểm tra kỹ năng → module thi có sẵn
w.localStorage.setItem('lk.lsn.path', '5');
await App.routes.lesson('go'); await tick(30);
ok(w.location.hash === '#/toeic' && w.localStorage.getItem('lk.lsn.path') === '6', 'nút kiểm tra kỹ năng thi mở #/toeic và đánh dấu xong');
w.localStorage.setItem('lk.lsn.path', '0');
// Luyện: "Luyện thi" đầu tiên, mọi tính năng
await go('#/train');
ok($('#bnav a[data-tab="skills"]').getAttribute('aria-current') === 'page', '#/train thuộc tab Kỹ năng');
const V2T = !!$('.v2-practice');
const firstG = V2T ? $('.v2 [data-grp]:has(a[href="#/mock"])') : $('.ux1-gh'), big = V2T ? null : $('.ux1-tiles.big'), examG = V2T ? $$('.v2 [data-grp]').filter(x => x.dataset.grp === firstG.dataset.grp) : [];
ok(firstG && /Luyện thi|Exam prep/.test(V2T ? firstG.dataset.grp : firstG.textContent) && (V2T ? ['#/mock', '#/toeic', '#/toefl', '#/tests', '#/placement', '#/criteria'].every(h => examG.some(x => x.querySelector(`a[href="${h}"]`))) : big && ['#/mock', '#/toeic', '#/toefl', '#/tests', '#/placement', '#/criteria'].every(h => big.querySelector(`a[href="${h}"]`))), 'Luyện: nhóm "Luyện thi" đầu tiên (IELTS · TOEIC · TOEFL · Thi thử · CEFR · tiêu chí)');
if (V2T) { // khung Stitch v2: thẻ kỳ thi, nước rút, 8 mô-đun kỹ năng, hàng thi thử – và ĐỦ mọi mục của nhóm Kỹ năng
  ok($('.v2-practice [role=progressbar]') && $('.v2-practice button[data-href]') && ['#/skill/listening', '#/skill/reading', '#/skill/writing', '#/skill/speaking', '#/grammar', '#/pron', '#/call'].every(h => $('.v2-practice a[href="' + h + '"]')), 'Luyện (Stitch v2): nước rút + 7 mô-đun kỹ năng đều mở được');
  ok($('.v2-practice button[data-href="#/mock"], .v2-practice button[data-href="#/toeic"], .v2-practice button[data-href="#/toefl"], .v2-practice button[data-href="#/placement"]'), 'Luyện (Stitch v2): hàng thi thử đầy đủ mở đúng bài thi của mục tiêu');
}
const hub = new Set($$('#view a[href^="#/"]').filter(a => !a.closest('.v2 > header')).map(a => a.getAttribute('href')));
await go('#/me', '.me-head, .v2-me');
ok($('#bnav a[data-tab="me"]').getAttribute('aria-current') === 'page', 'tab Tôi đang chọn');
const me = new Set($$('#view a[href^="#/"]').filter(a => !a.closest('.v2 > header')).map(a => a.getAttribute('href')));
const tabH = new Set(tabs.map(a => a.getAttribute('href')));
const tabHubs = new Set(); for (const r of ['vocab', 'skills', 'tests']) { await go('#/' + r, '.hub-grid, .hub-hero, [class*="v2-hub"], .v2-skills'); $$('#view a[href^="#/"]').forEach(a => tabHubs.add(a.getAttribute('href').replace('?hub=1', ''))); }
const lost = OLD.filter(h => !hub.has(h) && !me.has(h) && !tabH.has(h) && !tabHubs.has(h));
ok(OLD.length >= 20 && !lost.length, `không cắt: ${OLD.length} lối vào cũ đều tới được qua 5 tab (Từ vựng, Kỹ năng, Thi) / Luyện / Tôi` + (lost.length ? ' – thiếu: ' + lost.join(' ') : ''));
for (const h of ['#/goal', '#/stats', '#/mistakes', '#/settings']) ok(me.has(h), 'Tôi có ' + h);
if ($('.v2-me')) { // Tôi (Stitch v2): MỌI mục trang Tôi cũ còn tới được + công tắc/giá trị bám cài đặt thật
  const hrefs = new Set($$('.v2-me main a[href]').map(a => a.getAttribute('href'))), acts = new Set($$('.v2-me [data-act]').map(b => b.getAttribute('data-act')));
  ok(['#/tracks', '#/goal', '#/stats', '#/league', '#/class', '#/mistakes', '#/settings', '#/method', '#/resources', '#/review?src=forgetting'].every(h => hrefs.has(h)) && (hrefs.has('#/deck') || hrefs.has('#/path')), 'Tôi (v2): mọi lối vào cũ (Gói học, Mục tiêu, Tiến độ, Giải đấu, Lớp học, Sổ lỗi sai, Cài đặt, Cách nhớ lâu, Tài nguyên, sổ từ, thời điểm vàng) đều có');
  ok(['theme', 'lang', 'exam', 'notif', 'sfx', 'acct', 'out'].every(a => acts.has(a)) || ['theme', 'lang', 'exam', 'notif', 'sfx', 'out'].every(a => acts.has(a)), 'Tôi (v2): Chế độ màu · Ngôn ngữ · Kỳ thi · Nhắc học · Âm thanh · Đăng xuất/Đăng nhập là nút thật');
  ok($('.v2-me main a[href="#/goal"]') && /IELTS|TOEIC|TOEFL|General/.test($('.v2-me main a[href="#/goal"]').closest('[data-row]').textContent), 'Tôi (v2): hàng mục tiêu thi → #/goal, hiện kỳ thi');
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
  ok($('.v2-me').textContent.includes(String(App.streak())) && $$('.v2-me main a[href="#/stats"]').length >= 3, 'Tôi (v2): ô chuỗi ngày/XP/từ đã lưu + huy hiệu dẫn tới #/stats, #/deck');
}
// Ôn (Stitch v2): vào bằng thanh tab → màn hub; nút Bắt đầu mở phiên ôn THẬT; lối cũ (#/review trần, ?ahead=, ?src=) vẫn vào thẳng phiên ôn
{ App.state.cards.hello = { word: 'hello', vi: 'xin chào', topic: 'mine', contexts: [], col: [], syn: [], ant: [], examples: [], added: Date.now(), srs: { ef: 2.5, interval: 3, reps: 2, lapses: 0, due: Date.now() - 1000, last: Date.now() - 4e8 } };
  if (V2T) {
    await go('#/review?hub=1', '.v2-review');
    ok($('.v2-review') && $('.v2 nav a[data-tab="vocab"][aria-current="page"]') && !w.document.body.classList.contains('focus'), 'Ôn (Stitch v2): hub có thanh tab Stitch, thuộc tab Từ vựng');
    ok($('.v2-review button[data-href="#/review"], .v2-review button[data-href="#/review?ahead=2"]') && $('.v2-review [role=progressbar], .v2-review svg circle'), 'Ôn (Stitch v2): nút Bắt đầu → phiên ôn thật; vòng thẻ đến hạn');
    ok($('.v2-review a[href^="#/deck?from="]') && $('.v2-review button[data-href="#/deck"]'), 'Ôn (Stitch v2): bộ thẻ theo nguồn + Quản lý → #/deck');
    ok($('.v2-review button[data-href^="#/review"][aria-label]'), 'Ôn (Stitch v2): chip thẻ sắp quên → #/review?src=forgetting (hoặc phiên ôn)');
    { const hd = ['exam', 'streak', 'xp', 'goal'].map(k => $(`.v2 header a[data-hdr="${k}"]`)), tl = $$('.v2-review main .grid > a[href]'); // chủ báo 1/11: viên số đầu trang + ô số liệu + chip "quen" là div/span → chạm không có tác dụng
      ok(hd.every(a => a && /^#\/(goal|streak|league|stats)$/.test(a.getAttribute('href')) && a.getAttribute('aria-label')), 'Ôn (Stitch v2): 4 viên số đầu trang là link (kỳ thi → #/goal, chuỗi → #/streak, XP → #/league, mục tiêu → #/stats)');
      ok(tl.length === 3 && /^#\/review/.test(tl[0].getAttribute('href')) && tl[1].getAttribute('href') === '#/deck?m=12' && tl[2].getAttribute('href') === '#/deck?m=3', 'Ôn (Stitch v2): 3 ô số liệu là link (sẵn sàng → phiên ôn, đang luyện → #/deck?m=12, nhớ lâu → #/deck?m=3)');
      ok($('.v2-review main a[href^="#/review"][aria-label]'), 'Ôn (Stitch v2): chip "quen" là link → phiên ôn');
      ok(!$$('.v2-review main *').some(e => /active:translate-y/.test(e.getAttribute('class') || '') && !e.closest('a[href], button') && !e.querySelector('a[href][class*="after:inset-0"]')), 'Ôn (Stitch v2): mọi khối có hiệu ứng nhấn (active:translate-y) đều là link/nút (hoặc phủ kín bởi link, như thẻ bộ)'); }
    { // số liệu nhất quán (chủ báo 1/11: vòng "11" nhưng chip "0 sắp quên / 1 quen", các bộ cộng lại 1): vòng = sắp quên + quen + mới = tổng "đến hạn" các bộ
      for (let i = 0; i < 3; i++) App.state.cards['nw' + i] = { word: 'nw' + i, vi: 'mới ' + i, topic: 'ielts', contexts: [], col: [], syn: [], ant: [], examples: [], added: Date.now() - i, srs: { ef: 2.5, interval: 0, reps: 0, lapses: 0, due: Date.now(), last: 0 } };
      await go('#/review?ahead=0'); await go('#/review?hub=1', '.v2-review');
      const num = s => (String(s).match(/\d+/g) || []).map(Number), ring = +$('.v2-review main svg[viewBox="0 0 120 120"]').parentElement.querySelector('span').textContent.trim();
      const chips = [...$('#start-review-btn').previousElementSibling.children].flatMap(c => num(c.textContent)), decks = $$('.v2-review main a[href^="#/deck?from="]').map(a => num(a.closest('.relative').lastElementChild.firstElementChild.textContent)[0]);
      const dc = w.Core.Cards.dueCount(App.state.cards, App.state.settings, App.state.stats);
      const nw = +(($('.v2-review main').textContent.match(/·\s*(\d+) (?:thẻ mới|new)/) || [])[1] || 0); // số thẻ mới ở dòng "Ước tính ~m phút · n thẻ mới" (giữ hàng chip như mẫu Stitch)
      ok(ring === dc.total && chips.length === 2 && chips[0] + chips[1] + nw === ring && nw === dc.newCount && decks.reduce((a, b) => a + b, 0) === ring && dc.newCount > 0, `Ôn (Stitch v2): số liệu nhất quán – vòng ${ring} = chip ${chips.join('+')} + mới ${nw} = các bộ ${decks.join('+')} (đến hạn ${dc.due} + mới ${dc.newCount})`);
      for (let i = 0; i < 3; i++) delete App.state.cards['nw' + i]; }
    await go('#/review?ahead=2');
    ok(!$('.v2-review'), 'Ôn: ?ahead= vẫn vào thẳng phiên ôn (không qua hub)');
  }
  delete App.state.cards.hello; }
// Trang cũ vẫn chạy (không 404), có đường dẫn ngược về tab mới
for (const h of ['#/skills', '#/tests', '#/vocab', '#/home?all=1', '#/skill/listening']) { await go(h); ok(!/Không tìm thấy trang|Page not found/.test(w.document.getElementById('view').textContent) && w.document.getElementById('view').children.length, 'trang cũ vẫn mở: ' + h); }
await go('#/skill/listening');
ok($('.crumb a[href="#/skills"]'), 'trang con: đường dẫn ngược "Kỹ năng ›"');
ok(W.tabOf('mock') === 'tests' && W.tabOf('goal') === 'me' && W.tabOf('lesson') === 'home' && W.tabOf('review') === 'vocab' && W.tabOf('league') === 'home', 'tab của mọi trang (mock → Thi, goal → Tôi, Giải đấu → Hôm nay)');
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
  const cards = $$('.call-card'), CL = w.CALLS.filter(c => !c.tl); // ngôn ngữ học = en → chỉ cuộc gọi tiếng Anh (cuộc gọi es có tl:'es', lọc theo Target.cur)
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

ok(['Hôm nay', 'Từ vựng', 'Kỹ năng', 'Thi', 'Tham gia ngay', 'Ôn', 'Luyện', 'Giải đấu', 'Luyện thi', 'Bạn học để làm gì?'].every(k => fx[k] && Object.keys(fx[k]).length === 13), 'nhãn mới có bản dịch tay 13 ngôn ngữ (+ vi gốc, en)');
ok(!consoleErr.length, '0 lỗi console' + (consoleErr.length ? ': ' + consoleErr.slice(0, 3).join(' | ') : ''));

console.log(`\n${total - fails}/${total} ux1`);
// Lõi lộ trình v3 (PathV3) chạy cùng bộ ux1 cho tới khi package.json gắn thẳng scripts/test/path3.mjs (docs/specs/play-and-speak-path.md §8)
const p3 = (await import('node:child_process')).spawnSync(process.execPath, ['scripts/test/path3.mjs'], { encoding: 'utf8' });
if (p3.status !== 0) { process.stderr.write((p3.stdout || '') + (p3.stderr || '')); fails++; } else console.log('✓ path3:', (p3.stdout || '').trim().split('\n').pop());
w.close(); process.exit(fails ? 1 : 0);
