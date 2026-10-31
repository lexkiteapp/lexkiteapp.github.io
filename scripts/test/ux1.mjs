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
// ---------- Thư viện #/library (Stitch v2.1 library): khung mới giữ đủ ý trang cũ (tab nhóm, CEFR, lọc, Anki, Xem cả, Đang học + Thư viện của tôi) ----------
{
  w.localStorage.setItem('lk.ux1', '1'); const P = w.document, A0 = App.anki, calls = []; App.anki = m => { calls.push(m); };
  await go('#/library?g=all', '.v2-library');
  ok($('.v2-library') && $('#bnav a[data-tab="train"]').getAttribute('aria-current') === 'page', 'library (v2): khung Stitch, tab Luyện đang chọn');
  ok($('#libTabs [data-g="all"].on') && $('#libTabs [data-g="all"]').getAttribute('aria-pressed') === 'true' && $$('#libTabs [data-g]').length === w.IELTS_DATA.GROUPS.length + 2 && $('#libTabs [data-g="mine"]'), 'library (v2): #libTabs đủ nhóm + Tất cả + Đang học, .on/aria-pressed');
  ok($$('.v2-library main section').length >= 3 && $$('.v2-library main section a[href^="#/topic/"]').length >= 6 && $('.v2-library [data-go-g]'), 'library (v2): mỗi nhóm thẻ bộ từ thật → #/topic/…, nhóm dài có "Xem cả n bộ" [data-go-g]');
  ok($$('[data-lvf]').length === 7 && $('#libQ') && $('#libAnkiOut') && $('#libAnkiIn') && $('#libNewSet'), 'library (v2): 7 nút CEFR + ô lọc + Anki xuất/nhập + Tạo bộ từ');
  $('#libAnkiOut').click(); $('#libAnkiIn').click(); $('#libNewSet').click();
  ok(calls.join() === 'export,import,import', 'library (v2): Anki xuất/nhập + "Tạo bộ từ của bạn" gọi App.anki thật');
  $('[data-lvf="B2"]').click(); await tick(30);
  ok($('[data-lvf="B2"]').getAttribute('aria-pressed') === 'true' && $('[data-lvf="B2"]').classList.contains('on') && /lv=B2/.test(w.location.hash) && $$('.v2-library a[href*="?lv=B2"]').length > 0, 'library (v2): lọc CEFR B2 → aria-pressed, URL lv=B2, thẻ mở #/topic/…?lv=B2');
  $('[data-lvf=""]').click(); await tick(30);
  const qi = $('#libQ'); qi.value = 'zzzqqxx'; qi.dispatchEvent(new w.Event('input')); await tick(30);
  ok($('[data-lib-empty]') && !$$('.v2-library main section a[href^="#/topic/"]').length && P.activeElement === $('#libQ') && $('#libQ').value === 'zzzqqxx', 'library (v2): lọc không khớp → thẻ trống, ô lọc giữ chữ + con trỏ');
  $('#libQ').value = ''; $('#libQ').dispatchEvent(new w.Event('input')); await tick(30);
  const gg = $('.v2-library [data-go-g]').getAttribute('data-go-g'); $('.v2-library [data-go-g]').click(); await tick(30);
  ok($(`#libTabs [data-g="${gg}"]`).classList.contains('on') && new RegExp('g=' + gg + '$').test(w.location.hash) && $$('.v2-library main section').length === 1, 'library (v2): "Xem cả" chuyển sang tab nhóm đó, URL g=…');
  const tp = w.IELTS_DATA.TOPICS[0]; await App.addWord(tp.words[0], { src: 'lookup' }, { silent: true });
  await go('#/library?g=mine', '.v2-library');
  ok($('#libTabs [data-g="mine"].on') && $(`.v2-library a[href="#/topic/${tp.id}"]`) && $('.v2-library a[href^="#/deck?from="]'), 'library (v2): tab Đang học = Thư viện của tôi (#/deck?from=…) + bộ đang học');
  ok(!/display:none/.test($('.v2-library main > div').getAttribute('style') || '') && $$('.v2-library main > div button[data-href^="#/topic/"]').length === 1, 'library (v2): thẻ Gợi ý = bộ thật đang học dở → #/topic/…');
  w.localStorage.setItem('lk.ux1', '0'); await go('#/library', '#libBody');
  ok($('#libBody') && !$('.v2-library'), 'library: cờ tắt → trang cũ nguyên vẹn');
  w.localStorage.setItem('lk.ux1', '1'); App.anki = A0;
}
// ---------- Bộ từ #/topic/:id (Stitch v2.1 topic): khung mới giữ đủ ý trang cũ ----------
{
  w.localStorage.setItem('lk.ux1', '1'); const A0 = App.anki, calls = []; App.anki = (m, o) => { calls.push(m + ':' + (o && o.name)); };
  const tp = App.topicOf('education'), lvs = [...new Set(tp.words.map(x => x.level).filter(Boolean))];
  await go('#/topic/education', '.v2-topic');
  ok($('.v2-topic') && $('#bnav a[data-tab="train"]').getAttribute('aria-current') === 'page' && $('.v2-topic a[href="#/library?g=topics"]'), 'topic (v2): khung Stitch, tab Luyện, quay lại #/library?g=nhóm');
  ok(['learn', 'match', 'test'].every(m => $(`.v2-topic a[href="#/practice/${m}?src=topic:education"]`)) && $('.v2-topic a[href="#/handsfree/education"]'), 'topic (v2): 4 chế độ luyện (Học/Ghép thẻ/Kiểm tra/Rảnh tay) theo bộ');
  $('#tpAnki').click(); ok(calls[0] === 'export:' + tp.name, 'topic (v2): #tpAnki xuất Anki đúng bộ');
  const rows = () => $$('#wordList article');
  ok(rows().length === Math.min(20, tp.words.length) && rows().every(a => a.querySelector('a.w[href^="#/dict/"]') && a.querySelector('[data-speak]')), 'topic (v2): #wordList – từ → #/dict/…, nút [data-speak]');
  ok(lvs.length < 2 || ($$('#lvTabs [data-lv]').length === lvs.length + 1 && $('#lvTabs [data-lv=""].on')), 'topic (v2): #lvTabs đủ cấp CEFR + Tất cả (.on)');
  { const big = w.IELTS_DATA.TOPICS.find(x => x.words.length > 20 && new Set(x.words.map(y => y.level)).size < 2) || w.IELTS_DATA.TOPICS.find(x => x.words.length > 20); await go('#/topic/' + big.id, '.v2-topic');
    const n0 = rows().length, vis0 = !/display:none/.test($('#tpMore').parentElement.getAttribute('style') || ''); $('#tpMore').click(); await tick(20);
    ok(n0 === 20 && vis0 && rows().length === big.words.filter(x => !$('#lvTabs [data-lv].on') || !$('#lvTabs [data-lv].on').dataset.lv || x.level === $('#lvTabs [data-lv].on').dataset.lv).length && /display:none/.test($('#tpMore').parentElement.getAttribute('style') || ''), 'topic (v2): bộ > 20 từ → 20 đầu + "Xem cả n từ" hiện đủ mọi từ');
    await go('#/topic/education', '.v2-topic'); }
  if (lvs.length > 1) { const L = lvs[0]; $(`#lvTabs [data-lv="${L}"]`).click(); await tick(20); ok($(`#lvTabs [data-lv="${L}"]`).classList.contains('on') && rows().length === Math.min(20, tp.words.filter(x => x.level === L).length), 'topic (v2): lọc CEFR chỉ còn từ cấp đó'); $('#lvTabs [data-lv=""]').click(); await tick(20); }
  const seed = $('#wordList [data-add-seed][data-topic="education"]'), sw = seed && seed.getAttribute('data-add-seed');
  if (seed) { seed.click(); for (let i = 0; i < 20 && !App.inDeck(sw); i++) await tick(30); await tick(50); }
  ok(seed && App.inDeck(sw) && $(`#wordList [data-added="${sw}"]`) && $(`#wordList [data-added="${sw}"]`).disabled && /\d/.test($('#tCount').textContent), 'topic (v2): [data-add-seed] thêm 1 từ → hàng thành Đã thêm, #tCount cập nhật');
  $('#addAll').click(); for (let i = 0; i < 60 && !tp.words.every(x => App.inDeck(x.word)); i++) await tick(30); await tick(50);
  ok(tp.words.every(x => App.inDeck(x.word)) && $('#addAll').disabled && $('.v2-topic').textContent.includes('100%'), 'topic (v2): #addAll thêm mọi từ còn thiếu → nút tắt, 100%');
  w.localStorage.setItem('lk.ux1', '0'); await go('#/topic/education', '#wordList');
  ok($('#wordList') && !$('.v2-topic') && $('#addAll'), 'topic: cờ tắt → trang cũ nguyên vẹn');
  w.localStorage.setItem('lk.ux1', '1'); App.anki = A0;
}
// ---------- Sổ từ #/deck (Stitch v2.1 deck): khung mới giữ đủ ý trang cũ (tìm, 3 bộ lọc, ?from=, Học/Kiểm tra, chia sẻ, xuất/nhập, Anki, sửa thẻ, phát âm, 400 thẻ, trống) ----------
{
  w.localStorage.setItem('lk.ux1', '1'); const P = w.document, A0 = App.anki, X0 = App.xport, S0 = App.shareDeck, E0 = App.editCard, calls = [];
  App.anki = (m, o) => { calls.push('anki:' + m + ':' + (o && o.shown ? o.shown.length : '-')); }; App.xport = o => { calls.push('xport:' + o.shown.length + ':' + o.name); }; App.shareDeck = (n, l) => { calls.push('share:' + l.length); }; App.editCard = (wd, after) => { calls.push('edit:' + wd); after && after(); };
  const now = Date.now(), mk = (wd, vi, o) => Object.assign({ word: wd, vi, ipa: '/x/', emoji: '🧪', topic: 'mine', contexts: [], col: [], syn: [], ant: [], examples: [], added: now, srs: { ef: 2.5, interval: 0, reps: 0, lapses: 0, due: now + 864e5 } }, o);
  const keep = { ...App.state.cards };
  Object.assign(App.state.cards, { zzalpha: mk('zzalpha', 'thử một', { contexts: [{ text: 'the zzalpha test sentence', source: 'https://www.youtube.com/watch?v=1' }], added: now - 10 }),
    zzbeta: mk('zzbeta', 'thử hai', { def: 'beta definition', srs: { ef: 2.5, interval: 30, reps: 5, lapses: 0, due: now - 1000, last: now - 40 * 864e5, S: 30, D: 5 } }) });
  const N = Object.keys(App.state.cards).length;
  await go('#/deck', '.v2-deck');
  const R = $('.v2-deck'), row = wd => $$('#deckList [data-edit]').find(b => b.dataset.edit === wd);
  ok(R && $('#bnav a[data-tab="train"]').getAttribute('aria-current') === 'page' && R.textContent.includes(String(N)) && $('.v2-deck [data-href="#/train"]'), 'deck (v2): khung Stitch, tab Luyện, đầu trang n từ đã lưu + quay lại');
  ok($('#dkLearn').getAttribute('data-href') === '#/practice/learn?src=deck' && $('#dkTest').getAttribute('data-href') === '#/practice/test?src=deck', 'deck (v2): Học / Kiểm tra ?src=deck');
  ok(['#shareBtn', '#exportBtn', '#importBtn', '#importFile', '#ankiOut', '#ankiIn', '#filterQ', '#filterTopic', '#filterFrom', '#filterM', '#deckList', '#dkFind', '#dkMic'].every(s => $(s)), 'deck (v2): đủ móc cũ (chia sẻ, xuất, nhập, Anki ×2, tìm, 3 bộ lọc, danh sách) + kính lúp + micro');
  ok($$('#deckList [data-edit]').length === N && $$('#deckList [data-speak]').length === N && $(`#deckList a[href="#/dict/zzalpha"]`) && R.textContent.includes(App.meanOf(App.state.cards.zzalpha)) && $('#deckList').innerHTML.includes('zzalpha</span> test sentence'), 'deck (v2): mỗi thẻ: từ → #/dict/…, nghĩa, ngữ cảnh tô từ, [data-speak], [data-edit]');
  ok(row('zzbeta').closest('#deckList > div').querySelector('.dk-due') && !row('zzalpha').closest('#deckList > div').querySelector('.dk-due') && /\d+%/.test(row('zzbeta').closest('#deckList > div').textContent), 'deck (v2): thẻ đến hạn = khuôn "Ôn hôm nay", có % nhớ FSRS');
  ok($$('#filterTopic option').some(o => o.value === 'mine') && $$('#filterFrom option').some(o => o.value === 'forget') && $$('#filterM option').length === 5, 'deck (v2): bộ lọc bộ từ (Từ tự thêm), nguồn (+ Sắp quên), mức độ (5 lựa chọn)');
  const q = $('#filterQ'); q.value = 'thử hai'; q.dispatchEvent(new w.Event('input')); await tick(20);
  ok($$('#deckList [data-edit]').length === 1 && row('zzbeta') && P.activeElement === $('#filterQ') && $('#filterQ').value === 'thử hai', 'deck (v2): tìm theo nghĩa → chỉ còn thẻ khớp, ô tìm giữ chữ + con trỏ');
  $('#exportBtn').click(); $('#shareBtn').click(); $('#ankiOut').click(); $('#ankiIn').click();
  ok(calls.join() === 'xport:1:Sổ từ,share:1,anki:export:1,anki:import:-', 'deck (v2): xuất / chia sẻ / Anki xuất theo phần đang hiện + Anki nhập');
  q.value = 'zzqqnone'; q.dispatchEvent(new w.Event('input')); await tick(20);
  ok($('[data-deck-empty]') && !$$('#deckList [data-edit]').length, 'deck (v2): lọc không khớp → thông điệp trống');
  $('#filterQ').value = ''; $('#filterQ').dispatchEvent(new w.Event('input')); await tick(20);
  const fm = $('#filterM'); fm.value = '0'; fm.dispatchEvent(new w.Event('change')); await tick(20);
  ok(row('zzalpha') && !row('zzbeta') && $('#filterM').value === '0' && P.activeElement === $('#filterM') && $('#filterM').closest('label').textContent.includes(w.t('Chưa học')) && $('#filterM').closest('label').querySelector('.animate-pulse'), 'deck (v2): lọc mức độ Chưa học → viên lọc tô (khuôn đang lọc) + hiện giá trị, giữ focus');
  fm.value = ''; fm.dispatchEvent(new w.Event('change')); await tick(20);
  const ft = $('#filterTopic'); ft.value = 'mine'; ft.dispatchEvent(new w.Event('change')); await tick(20);
  ok(row('zzalpha') && row('zzbeta') && $$('#deckList [data-edit]').every(b => App.state.cards[b.dataset.edit].topic === 'mine'), 'deck (v2): lọc bộ từ "Từ tự thêm"');
  ft.value = ''; ft.dispatchEvent(new w.Event('change')); await tick(20);
  row('zzalpha').click(); await tick(20);
  ok(calls.includes('edit:zzalpha') && $('.v2-deck'), 'deck (v2): [data-edit] mở hộp Sửa cũ (App.editCard), xong dựng lại khung');
  let clicked = 0; $('#importFile').click = () => { clicked++; }; $('#importBtn').click(); ok(clicked === 1 && $('#importFile').getAttribute('accept') === 'application/json', 'deck (v2): Nhập → chọn file .json (#importFile)');
  await go('#/deck?from=youtube', '.v2-deck');
  ok($('#filterFrom').value === 'youtube' && row('zzalpha') && !row('zzbeta'), 'deck (v2): ?from=youtube lọc sẵn theo nguồn (link từ Thư viện của tôi / Ôn)');
  w.localStorage.setItem('lk.ux1', '0'); await go('#/deck', '#deckList');
  ok($('#deckList') && !$('.v2-deck') && $('#filterQ') && $('#ankiOut'), 'deck: cờ tắt → trang cũ nguyên vẹn');
  App.state.cards = keep; App.anki = A0; App.xport = X0; App.shareDeck = S0; App.editCard = E0; w.localStorage.setItem('lk.ux1', '1');
}
// ---------- Sổ lỗi sai #/mistakes (Stitch v2.1 mistakes): khung mới giữ đủ ý trang cũ ----------
{
  w.localStorage.setItem('lk.ux1', '1'); const S = w.Core.Store, now = Date.now(), D = 864e5;
  const M = [
    { kind: 'vocab', q: 'Nghĩa của “compulsory”?', qK: { k: 'Nghĩa của “{word}”?', v: { word: 'compulsory' } }, answer: 'bắt buộc', given: 'tùy chọn', explain: 'compulsory /kəmˈpʌlsəri/ = bắt buộc', ref: 'compulsory', key: 'mv1', n: 1, at: now, fixed: false },
    { kind: 'vocab', q: 'Từ tiếng Anh nghĩa là “bắt buộc”?', qK: { k: 'Từ tiếng Anh nghĩa là “{vi}”?', v: { vi: 'bắt buộc' } }, answer: 'mandatory', given: 'optional', explain: 'mandatory /ˈmændətəri/ = bắt buộc', ref: 'mandatory', key: 'mv2', n: 4, at: now - D, fixed: false },
    { kind: 'grammar', q: 'She ___ here since 2010.', answer: 'has lived', given: 'lives', explain: 'Hiện tại hoàn thành', ref: 'g1', key: 'mg1', n: 2, at: now - 2 * D, fixed: false },
    { kind: 'reading', q: 'Bài 1: Q3', answer: 'The writer suggests that urban farms will feed most cities within ten years', given: 'x', explain: '', ref: 'r1', key: 'mr1', n: 1, at: now - 3 * D, fixed: false },
    { kind: 'listening', q: 'Part 1: Q2', answer: 'Tuesday', given: 'Thursday', explain: '', ref: 'p1', key: 'ml1', n: 1, at: now - 4 * D, fixed: false },
    { kind: 'vocab', q: 'Điền từ: x', answer: 'old', given: 'x', explain: '', ref: 'old', key: 'mx', n: 1, at: now, fixed: true }];
  await S.set('mistakes', M);
  await go('#/mistakes', '.v2-mistakes');
  const R = () => $('.v2-mistakes'), cards = () => $$('#mList [data-mk]'), card = k => $(`#mList [data-mk="${k}"]`);
  ok(R() && $('#bnav a[data-tab="me"]').getAttribute('aria-current') === 'page' && $('.v2-mistakes header button[data-href="#/me"]') && /Sổ lỗi sai|Mistakes/.test($('.v2-mistakes h1').textContent), 'mistakes (v2): khung Stitch, tab Tôi, quay lại #/me, tiêu đề Sổ lỗi sai');
  const tImg = $('.v2-mistakes [data-m-teacher] img');
  ok(tImg && /teach\/ama\/still-thinking\.webp/.test(tImg.getAttribute('src')) && !/Coach Ama/.test(R().textContent) && /ghi lại tự động|recorded automatically/i.test($('.v2-mistakes [data-m-teacher]').textContent), 'mistakes (v2): cô Ama tư thế thinking (Chars) ở chỗ giáo viên, lời thoại = mô tả cũ, không còn chỗ giữ Stitch');
  ok($('#mRetry').getAttribute('data-href') === '#/mistakes?retry=1' && $('#mForget').getAttribute('data-href') === '#/practice/learn?src=forgetting' && $('#clearFixed') && /\b5\b/.test($('.v2-mistakes header p').textContent), 'mistakes (v2): Làm lại lỗi sai · Ôn từ sắp quên · Dọn lỗi đã sửa · đếm 5 lỗi chưa sửa');
  ok($$('#mTabs [data-k]').length === 5 && $('#mTabs [data-k=""].on') && $('#mTabs [data-k="vocab"]').textContent.includes('2') && $('#mTabs [data-k="grammar"]').textContent.includes('1'), 'mistakes (v2): #mTabs Tất cả (.on) + 4 loại có đếm');
  ok(cards().length === 5 && !card('mx') && $$('#mList [data-fix]').length === 5, 'mistakes (v2): #mList đủ 5 lỗi chưa sửa (bỏ lỗi đã sửa), mỗi thẻ có [data-fix] Đã hiểu');
  ok(cards().every(c => c.querySelectorAll('[data-speak],[data-speak-text]').length <= 1 && c.querySelectorAll('.ipa').length <= 1 && !c.querySelector('[data-row="no"] [data-speak],[data-row="no"] [data-speak-text]') && !c.querySelector('[data-qsay],[data-asay]') && [...c.querySelectorAll('button')].filter(b => !/display:none/.test(b.getAttribute('style') || '')).every(b => b.getAttribute('aria-label') || b.textContent.trim())), 'mistakes (v2): mỗi thẻ ≤ 1 loa + ≤ 1 IPA, câu trả lời sai không có loa, không còn nút loa rỗng, mọi nút có nhãn');
  const v1 = card('mv1'), v2 = card('mv2'), g1 = card('mg1');
  ok(v1.querySelector('[data-speak="compulsory"]') && v1.querySelector('.ipa, [data-ipa-lazy]') && v1.querySelector('[data-row="ok"]').textContent.includes('bắt buộc') && /display:none/.test(v1.querySelector('[data-tip]').getAttribute('style') || ''), 'mistakes (v2): "Nghĩa của X?" – loa + IPA ở câu hỏi, đáp án là nghĩa, giải thích lặp → ẩn');
  ok(v2.querySelector('[data-row="ok"] [data-speak="mandatory"]') && !v2.children[2].querySelector('[data-speak],[data-speak-text]'), 'mistakes (v2): "Từ tiếng Anh nghĩa là…" – loa ở đáp án, câu hỏi không lộ đáp án');
  ok(g1.querySelector('[data-row="ok"] [data-speak="has lived"]') && g1.querySelector('[data-tip]').textContent.includes('Hiện tại hoàn thành') && g1.querySelector('[data-row="no"]').textContent.includes('lives'), 'mistakes (v2): ngữ pháp – Câu trả lời của bạn ✗, Đáp án ✓ có loa, giải thích hiện');
  ok(g1.querySelector('a[href="#/grammar/g1"]') && v1.querySelector('a[href="#/dict/compulsory"]') && cards().filter(c => c.dataset.kind === 'vocab').every(c => { const r = c.querySelector('a[href^="#/dict/"]').getAttribute('href').slice(7), b = c.querySelector('[data-add-seed]'); return App.inDeck(decodeURIComponent(r)) ? /display:none/.test(b.getAttribute('style') || '') : b.getAttribute('data-add-seed') === decodeURIComponent(r); }) && card('mr1').querySelector('a[href="#/read/r1"]') && card('ml1').querySelector('a[href="#/listen/p1"]'), 'mistakes (v2): Xem lại bài · Tra lại từ + Flashcard · Đọc lại bài · Nghe lại phần này');
  $('#mTabs [data-k="grammar"]').click(); await tick(20);
  ok(cards().length === 1 && card('mg1') && $('#mTabs [data-k="grammar"]').classList.contains('on') && $('#mTabs [data-k="grammar"]').getAttribute('aria-pressed') === 'true', 'mistakes (v2): lọc theo loại (.on, aria-pressed)');
  $('#mTabs [data-k=""]').click(); await tick(20);
  card('mg1').querySelector('[data-fix]').click(); for (let i = 0; i < 20 && !(await S.get('mistakes', [])).find(x => x.key === 'mg1').fixed; i++) await tick(20);
  ok((await S.get('mistakes', [])).find(x => x.key === 'mg1').fixed && !card('mg1'), 'mistakes (v2): [data-fix] Đã hiểu → đánh dấu đã sửa, thẻ biến mất');
  $('#clearFixed').click(); for (let i = 0; i < 20 && (await S.get('mistakes', [])).some(x => x.fixed); i++) await tick(20);
  ok(!(await S.get('mistakes', [])).some(x => x.fixed) && (await S.get('mistakes', [])).length === 4, 'mistakes (v2): #clearFixed dọn lỗi đã sửa');
  await go('#/mistakes?retry=1', '[data-rt]');
  ok($('#mRetry').getAttribute('data-href') === '#/mistakes' && cards()[0].dataset.mk === 'mv2' && cards().every(c => c.querySelector('[data-rt]') && c.querySelectorAll('[data-ans]').length && [...c.querySelectorAll('[data-ans]')].every(a => a.hidden)), 'mistakes (v2): làm lại – Xem danh sách, sai nhiều nhất lên trước, đáp án [data-ans] ẩn tới khi trả lời');
  const c2 = card('mv2'); c2.querySelector('[data-in]').value = 'Mandatory'; c2.querySelector('[data-chk]').click();
  for (let i = 0; i < 20 && !(await S.get('mistakes', [])).find(x => x.key === 'mv2').fixed; i++) await tick(20);
  ok((await S.get('mistakes', [])).find(x => x.key === 'mv2').fixed && !c2.querySelector('[data-row="ok"]').closest('[data-ans]').hidden && c2.querySelector('[data-self]').hidden, 'mistakes (v2): gõ đúng đáp án → hiện đáp án, gỡ khỏi sổ (+3 XP)');
  const cr = card('mr1'); ok(cr.querySelector('[data-show]') && !cr.querySelector('[data-in]'), 'mistakes (v2): đáp án dài → nút Hiện đáp án');
  cr.querySelector('[data-show]').click(); ok(!cr.querySelector('[data-self]').hidden && cr.querySelector('[data-rt]').hidden, 'mistakes (v2): Hiện đáp án → tự chấm Mình làm đúng / Vẫn sai');
  cr.querySelector('[data-no]').click(); for (let i = 0; i < 20 && (await S.get('mistakes', [])).find(x => x.key === 'mr1').n < 2; i++) await tick(20);
  ok((await S.get('mistakes', [])).find(x => x.key === 'mr1').n === 2 && cr.querySelector('[data-self]').hidden, 'mistakes (v2): Vẫn sai → +1 lần sai');
  await S.set('mistakes', []); await go('#/mistakes', '[data-m-empty]');
  ok($('[data-m-empty]') && /display:none/.test($('#mRetry').getAttribute('style') || '') && !cards().length, 'mistakes (v2): sổ trống → thẻ "Không có lỗi sai nào cần xem lại", ẩn Làm lại');
  await S.set('mistakes', M); w.localStorage.setItem('lk.ux1', '0'); await go('#/mistakes?x=1', '#mList .card');
  ok($('#mList .card') && !R() && $('#mTabs') && $('#clearFixed'), 'mistakes: cờ tắt → trang cũ nguyên vẹn');
  w.localStorage.setItem('lk.ux1', '1'); await S.set('mistakes', []);
}
// ---------- Từ điển #/dict (Stitch v2.1 dictionary): khung mới giữ đủ ý trang cũ ----------
{
  w.localStorage.setItem('lk.ux1', '1'); const S = w.Core.Store, F0 = w.fetch, SP0 = App.savePhraseDialog; let spd = null;
  const NOTES = JSON.parse(fs.readFileSync(path.join(WEB, 'js/notes/m.json'), 'utf8'));
  w.fetch = async u => { u = String(u); const j = v => ({ ok: true, status: 200, json: async () => v, text: async () => JSON.stringify(v) });
    if (/js\/notes\/m\.json/.test(u)) return j(NOTES); if (/rel_jjb=mitigate/.test(u)) return j([{ word: 'severe', score: 900 }]); if (/rel_ant=mitigate/.test(u)) return j([{ word: 'aggravate', score: 500 }]);
    if (/ml=mitigate/.test(u)) return j([{ word: 'alleviate', score: 900, tags: ['f:5'] }]); return F0(u); };
  App.savePhraseDialog = o => { spd = o; };
  await S.set('recent', []); delete App.state.cards.mitigate;
  await go('#/dict', '.v2-dictionary [data-d-empty]');
  const R = () => $('.v2-dictionary');
  ok(R() && $('#bnav a[data-tab="train"]').getAttribute('aria-current') === 'page' && $('#searchForm #q') && $('#searchForm button[type=submit]') && $$('[data-d-samples] a[href^="#/dict/"]').length === 6 && /display:none/.test($('#dEntry').getAttribute('style')), 'dict (v2): khung Stitch, tab Luyện, ô tra #searchForm/#q, thẻ trống + 6 từ mẫu, ẩn mục từ');
  ok($('.v2-dictionary h1') && $('.v2-dictionary h1').textContent.trim() === w.t('Từ điển Anh – Việt') && $('.v2-dictionary [data-ext-cta="app"]') && $('#dBack') && $('.v2-dictionary button[data-href="#/deck"]'), 'dict (v2): tiêu đề + mô tả cũ, nút quay lại, Sổ từ (#/deck), thẻ add-on [data-ext-cta]');
  $('#q').value = 'mitigate'; $('#searchForm').dispatchEvent(new w.Event('submit', { cancelable: true })); await tick(20);
  ok(w.location.hash === '#/dict/mitigate', 'dict (v2): Tra từ → #/dict/<từ>');
  await go('#/dict/mitigate', '#saveCard[style=""]'); await tick(150);
  const E = $('#dEntry');
  ok(R() && $('#dWord').textContent.trim() === 'mitigate' && !/display:none/.test(E.getAttribute('style')) && !$('[data-d-empty]'), 'dict (v2): mục từ thật (mitigate) – thẻ trống biến mất');
  ok(E.querySelector('[data-speak="mitigate"][data-accent="en-GB"]') && E.querySelector('[data-speak="mitigate"][data-accent="en-US"]') && E.textContent.includes('/ˈmɪtɪɡeɪt/') && E.querySelector('[data-slow="mitigate"]'), 'dict (v2): 2 giọng UK/US có IPA + loa [data-accent], [data-slow] nghe chậm');
  ok((w.I18N.meanLang() === 'en' ? /display:none/.test($('#dVi').parentElement.getAttribute('style')) : $('#dVi').textContent.includes(App.meanOf(w.IELTS_DATA.INDEX.mitigate))) && E.textContent.includes('to make something less harmful') && /C1/.test(E.textContent), 'dict (v2): nghĩa (ngôn ngữ nghĩa; en thuần → ẩn dòng như trang cũ) + định nghĩa + CEFR');
  const tch = $('[data-d-teacher="ama"]');
  ok(tch && !/display:none/.test(tch.getAttribute('style')) && /teach\/ama\/still-explain/.test(tch.querySelector('img').getAttribute('src')) && !tch.textContent.includes('Live Tutor') && /Writing Task 2/.test($('#dNote').textContent), 'dict (v2): cô Ama (Chars still explain) thay chỗ giữ người + ghi chú "Dùng khi thi" thật');
  ok($('#quickSave') && !$('#quickSave').disabled && $('.v2-dictionary [data-href="#/practice/speak?w=mitigate"]') && $('#dEx [data-speak-text]') && $('#dEx').textContent.includes('mitigate the effects of climate change'), 'dict (v2): #quickSave, Luyện phát âm, ví dụ + [data-speak-text]');
  ok($('#dCol [data-wc-say="mitigate the effects"]') && $('#dCol [data-wc-say="reduce"]') && $('#dCol a[href="#/dict/aggravate"]') && $('#dCol a[href="#/dict/severe"]') && $('#related a[href="#/dict/alleviate"]'), 'dict (v2): Hay đi với / Đồng nghĩa [data-wc-say] + Datamuse (đi kèm, trái nghĩa, #related gần nghĩa) → #/dict');
  const nk = $$('#dNotes [data-wn]').map(x => x.dataset.wn).join(',');
  ok(nk === 'm,e,u,f' && $('#dNotes [data-wn="e"] [data-wn-b] .line-through') && $('#dNotes [data-wn="f"] [data-wc-say="mitigation"]') && $('#dNotes [data-wn-b]').getAttribute('translate') === 'yes', 'dict (v2): Hiểu sâu = Mẹo nhớ · Lỗi hay gặp (sai/đúng) · Dùng khi thi · Họ từ');
  const hu = $('#dNotes [data-wn-h="u"]'), bu = $('#dNotes [data-wn-b="u"]'); const c0 = /display:\s*none/.test(bu.getAttribute('style')); hu.click();
  ok(c0 && !/none/.test(bu.style.display) && hu.getAttribute('aria-expanded') === 'true', 'dict (v2): bấm mục Hiểu sâu → mở/đóng (aria-expanded)');
  ok($('#dPos') && $('#dPos').textContent.includes('to make something less harmful') && $('#ctx') && $('#ctxVi') && $('#trCtx') && $('#saveWord') && $('#phraseBox') && $('#addPhr'), 'dict (v2): Nghĩa theo từ loại, #saveCard (#ctx #ctxVi #trCtx #saveWord), #phraseBox + #addPhr');
  ok((await S.get('recent', [])).includes('mitigate'), 'dict (v2): lưu "Gần đây"');
  $('#addPhr').click(); ok(spd && spd.phrase === 'mitigate ', 'dict (v2): #addPhr mở hộp lưu cụm của bạn');
  $('#ctx').value = 'We must mitigate the risk.'; $('#saveWord').click();
  for (let i = 0; i < 40 && !(App.state.cards.mitigate && $('#quickSave') && $('#quickSave').disabled); i++) await tick(50);
  const cm = App.state.cards.mitigate;
  ok(cm && cm.contexts.some(c => c.text === 'We must mitigate the risk.') && $('#quickSave').disabled && !/display:none/.test($('#saveCard > div > div').getAttribute('style')), 'dict (v2): #saveWord lưu thẻ + ngữ cảnh → Đã có trong flashcard, chấm mức thuộc');
  await go('#/dict', '[data-d-empty]');
  ok($('.v2-dictionary a[href="#/dict/mitigate"][lang="en"]') && !/display:none/.test($('#searchForm').nextElementSibling.getAttribute('style') || ''), 'dict (v2): hàng Gần đây có từ vừa tra');
  w.localStorage.setItem('lk.ux1', '0'); await go('#/dict/mitigate', '#result .entry-word');
  ok($('#result .entry-word') && !R() && $('#searchForm') && $('#saveCard'), 'dict: cờ tắt → trang cũ nguyên vẹn');
  w.fetch = F0; App.savePhraseDialog = SP0; delete App.state.cards.mitigate; w.localStorage.setItem('lk.ux1', '1');
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
