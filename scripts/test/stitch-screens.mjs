// 🧭 Danh sách màn Stitch v2 + dữ liệu mẫu + cách lái bài học – DÙNG CHUNG cho stitch-diff.mjs (bám mẫu) và final-qc.mjs (QC cuối 1-1).
// Thêm màn mới: SCREENS (khóa → route) + V2REF (khóa → tên màn Stitch v2) + DRIVE (nếu cần lái tới trạng thái) + FINAL (13 màn chủ duyệt).
import fs from 'node:fs'; import path from 'node:path';
export const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
// Phục vụ thẳng web/ trên https://lk.test (hermetic: chặn mọi host khác, /api/* = {})
export const serve = (ctx, ROOT) => ctx.route('**/*', r => { const u = new URL(r.request().url()); const prod = /^(www\.)?lexkite\.com$/.test(u.hostname); if (u.hostname !== 'lk.test' && !prod) return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '' }); r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
// Dữ liệu mẫu chung (bối cảnh Stitch): IELTS mục tiêu 7.5, 1 lần thi thử có điểm 4 kỹ năng, chặng 3
export const SEED = async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings();
  await Core.Store.set('mocks', [{ at: Date.now() - 3 * 864e5, bands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 6.5 }, overall: 7 }]); localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 })); };
// Bảng giải đấu mẫu giống Stitch (hạng 5 = mình): đặt lại sau mỗi lần tải lại trang (Sync.league là hàm thật cần đăng nhập → thay bằng dữ liệu mẫu)
// MỌI màn (đầu trang Stitch: lửa 14 · 820 XP · 14/20; Chuỗi; Hoàn thành bài ô Streak 14): chuỗi 14 ngày liên tiếp, hôm nay 14/20 (như mẫu "14 day streak!") – chỉ nạp khi vào màn này (không đổi dữ liệu các màn khác)
// Đồng hồ cố định cho MỌI màn (stitch-diff + final-qc gọi ngay khi mở trang; màn Chuỗi cần nhất): mẫu Stitch = thứ Sáu (T2–T5 lửa, T6 ✓ hôm nay, "5 of 7") → chụp/QC luôn cùng lịch tuần, không trôi theo ngày chạy CI
export const STREAK_NOW = '2026-10-30T12:00:00Z';
export const FIX_CLOCK = page => page.clock.setFixedTime(new Date(STREAK_NOW));
export const SEED_STREAK = async () => { const k = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const days = {}; for (let i = 1; i < 14; i++) days[k(i)] = 5; days[k(0)] = 14; App.state.stats.days = Object.assign(App.state.stats.days || {}, days); App.state.game = App.state.game || {}; App.state.game.xp = Math.max(App.state.game.xp || 0, 820); App.state.settings.dailyGoal = 20; await App.saveSettings(); await Core.Store.set('stats', App.state.stats); };
// Màn Chuỗi (mẫu Stitch streak-v5, 5/11): kịch bản RIÊNG đúng như mẫu – thứ Bảy 14/11/2026, chuỗi 14 ngày (31/10→13/11), thứ Năm 12/11 đóng băng, hôm nay chưa học,
//   còn 1/2 lượt băng, 1 rương chưa mở (mốc 3/7/14 đã chúc mừng), sự kiện thu 2/5 mảnh. Chỉ áp cho màn streak (các màn khác giữ STREAK_NOW thứ Sáu).
export const STREAK_V5_NOW = '2026-11-14T12:00:00Z';
export const SEED_STREAK_V5 = async () => { const k = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const days = {}; for (let i = 1; i <= 14; i++) if (i !== 2) days[k(i)] = 5; App.state.stats.days = days; const g = App.state.game = App.state.game || {};
  g.days = {}; g.frozen = { [k(2)]: 1 }; g.freezes = 1; g.ret = { ms: { 3: 1, 7: 1, 14: 1 }, opened: 2, ev: { autumn26: [k(4), k(3)] } }; App.state.settings.dailyGoal = 20; await App.saveSettings(); await Core.Store.set('stats', App.state.stats); };
export const SEED_SCREEN = async (page, k) => { if (k !== 'streak') return; await page.clock.setFixedTime(new Date(STREAK_V5_NOW)); await page.evaluate(SEED_STREAK_V5); await page.evaluate(() => App.route()); await page.waitForTimeout(600); };
export const SEED_LEAGUE = () => {
  const names = ['An Nguyen', 'Linh Khanh', 'Marcus Roy', 'Tariq Chen', 'You Lexkite', 'Sara Hansen', 'Daiki Kato'], xps = [1420, 1280, 1150, 980, 820, 760, 690]; // bảng giải đấu mẫu giống Stitch (hạng 5 = mình)
  window.Sync = window.Sync || {}; Sync.user = { uid: 'u1', displayName: 'You Lexkite' }; Sync.authed = async () => Sync.user;
  Sync.league = async () => ({ member: { nick: 'You', tier: 3, xp: 820 }, week: { end: Date.now() + 3 * 864e5 }, rules: { up: 3, down: 2, maxTier: 5 }, board: names.map((n, i) => ({ rank: i + 1, nick: n, xp: xps[i], me: i === 4, zone: i < 3 ? 'up' : i >= 5 ? 'down' : '' })) });
};
export const SCREENS = {
  call: 'call/coffee',
  complete: 'lesson/go?demo=1',
  feedback: 'lesson/go?demo=1',
  'feedback-wrong': 'lesson/go?demo=1',
  grammar: 'grammar',
  home: 'home',
  leagues: 'league',
  lesson: 'lesson/go?demo=1',
  me: 'me',
  'onb-goal': 'welcome/setup',
  'onb-level': 'welcome/setup?s=level',
  'onb-pace': 'welcome/setup?s=pace',
  'onb-ready': 'welcome/setup?s=ready',
  'onb-target': 'welcome/setup?s=target',
  practice: 'train',
  readiness: 'goal',
  review: 'review?hub=1',
  skills: 'skills',
  'speak-drill': 'speak/cafe/drill',
  'speak-sit': 'speak/cafe',
  story: 'lesson/go?demo=1',
  streak: 'streak',
  'today-new': 'home',
  'vocab-hub': 'vocab',
  welcome: 'welcome',
  'welcome-desk': 'welcome',
}; // home = Hôm nay v2 (người đang học, lộ trình đầy đủ trong khối Your path) · today-new = người mới (DRIVE đặt về trạng thái chưa học)
// Mẫu so sánh: ảnh vẽ từ HTML Stitch v2 (scripts/test/stitch-render.mjs, cùng job CI → out/stitch-v2/png) theo tên màn v2; chưa có thì JPG cũ brand/stitch/
export const V2REF = {
  call: 'teacher-call',
  complete: 'lesson-complete',
  feedback: 'feedback-correct',
  'feedback-wrong': 'feedback-wrong',
  grammar: 'grammar',
  home: 'today',
  leagues: 'leagues',
  lesson: 'lesson-question',
  me: 'me',
  'onb-goal': 'onb-goal',
  'onb-level': 'onb-level',
  'onb-pace': 'onb-pace',
  'onb-ready': 'onb-ready',
  'onb-target': 'onb-target',
  practice: 'practice',
  readiness: 'exam-readiness',
  review: 'review',
  skills: 'skills',
  'speak-drill': 'pas-drill',
  'speak-sit': 'pas-sit',
  story: 'story-duo',
  streak: 'streak',
  'today-new': 'today-new',
  'vocab-hub': 'vocab-hub',
  welcome: 'welcome',
  'welcome-desk': 'welcome-desk',
};
// Bài thử: trả lời ĐÚNG (App._lsn) tới câu trắc nghiệm đầu tiên – giống bối cảnh mẫu Stitch (câu 3/5, đã chọn đáp án đúng); feedback = bấm Kiểm tra
// màn cần lái tới trạng thái (bài học/phản hồi/kết quả/truyện/cuộc gọi) – stitch-diff và final-qc dùng CHUNG (từng chỉ lái lesson/feedback → chụp nhầm câu đầu)
export const DRIVEN = /^(lesson|feedback|complete|story|call|today-new|onb-|welcome)/;
export const DRIVE = async k => { const nz = v => String(v).trim().replace(/[.,!?;:]+$/, '').toLowerCase(), q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], w = ms => new Promise(r => setTimeout(r, ms));
  if (/^(lesson|feedback|complete)/.test(k) && window.PathTrail) { PathTrail.wordsOf = () => null; await App.routes.lesson('go'); await w(1200); } // ĐỀ QC như story bên dưới: giữ bộ từ thử mà mẫu Stitch vẽ để so như-với-như (nút Lộ trình có từ riêng; bố cục câu dài do ux1-guard + 360 px canh)
  if (/^(onb-|welcome)/.test(k)) { const S = App.state, sel = k === 'welcome' || k === 'welcome-desk' ? ':is(.v2s-welcome, .v2s-welcome-desk)' : '.v2s-' + k; S.settings.onboarded = false; S.cards = {}; S.game.xp = 0; location.hash = /^welcome/.test(k) ? '#/welcome' : '#/welcome/setup?s=' + k.slice(4); for (let i = 0; i < 60 && !q(sel); i++) await w(100); return; } // người có dữ liệu bị chuyển về Hôm nay (docs/specs/welcome.md) → người mới, chỉ trong bộ nhớ
  if (k === 'today-new') { // người mới như mẫu: chưa chọn mục tiêu, 0 XP, chưa học ngày nào (chỉ trong bộ nhớ – lượt tải lại sau đọc lại dữ liệu mẫu) → khung today-new
    localStorage.setItem('lk.lsn.path', '0'); localStorage.removeItem('lk.ux1.pk'); const g = App.state.game || {}; g.xp = 0; g.days = {}; g.frozen = {}; App.state.stats.days = {}; ['examTarget', 'goalPick', 'goal'].forEach(x => delete App.state.settings[x]);
    await App.route(); await w(900); localStorage.setItem('lk.lsn.path', '3'); scrollTo(0, 0); return; }
  const pick = it => { const o = qa('.lsn-opts .lsn-opt').find(b => b.dataset.o === String(it.answer)); if (o) o.click(); return !!o; };
  if (k === 'story') { // nút Truyện của bản đồ thử (chỉ số 3 của chặng ux1): vào khung story-duo, câu thoại đầu đang phát (Ama nói, Carlos nghe)
    localStorage.setItem('lk.lsn.path.demo', '3'); localStorage.removeItem('lk.lsn.s.story.demo'); await App.need('lesson'); // ĐỀ QC = đúng nội dung mẫu Stitch story-duo (2 bong bóng + câu hỏi + A/B/C) để so như-với-như; dữ liệu bài thật giữ nguyên
    window.LESSON_STORIES = [{ id: 's-qc', kind: 'story', cefr: 'B1', em: '🚆', title: 'Train timetable', lines: [{ who: 'ama', en: 'Did the new train timetable affect your morning commute?' }, { who: 'carlos', en: 'Yes, it had a huge impact on my schedule!' }], checks: [{ at: 1, type: 'q', q: 'What did the new timetable do to Carlos?', options: ['It altered his daily routine', 'It canceled his train tickets', 'It did not change anything'], answer: 0, keep: 1 }] }];
    await App.routes.lesson('go'); await w(1200);
    for (let n = 0; n < 30; n++) { const qb = q('.lsn-qblk'); if (qb && qb.style.display !== 'none' && q('#lsnBody .lsn-opt')) break; // tới bước kiểm giữa truyện: 2 bong bóng + câu hỏi + thẻ A/B/C trên MỘT màn (như mẫu)
      const it = App._lsn && App._lsn.sess.cur; if (!it) break;
      if (q('#lsnGo')) { q('#lsnGo').click(); await w(500); continue; }
      if (q('#lsnBank')) { const used = new Set(); for (const x of String(it.answer).split(/\s+/)) { const b = qa('#lsnBank .lsn-tile').find(t => !used.has(t) && nz(t.textContent) === nz(x)); if (b) { used.add(b); b.click(); } } }
      else if (q('.lsn-match')) { for (const a of qa('.lsn-match [data-s="w"]')) { a.click(); const b = q(`.lsn-match [data-s="m"][data-m="${a.dataset.m}"]`); if (b) b.click(); await w(60); } }
      await w(150); if (q('#lsnCheck') && !q('#lsnCheck').disabled) q('#lsnCheck').click(); await w(500); if (q('#lsnNext')) q('#lsnNext').click(); await w(500); }
    const sc = App._lsn && App._lsn.sess.cur, bx = qa('#lsnBody .lsn-opt').find(b => sc && b.dataset.o === String(sc.answer)) || qa('#lsnBody .lsn-opt')[0]; if (bx) bx.click(); await w(200); if (document.activeElement) document.activeElement.blur(); scrollTo(0, 0); return; }
  if (k === 'complete') { // bài thử: trả lời ĐÚNG mọi câu (chọn / xếp / gõ / ghép) tới khi hiện màn kết quả
    for (let n = 0; n < 40 && !q('.lsn-end'); n++) { const it = App._lsn && App._lsn.sess.cur; if (!it) break;
      if (q('#lsnGo')) { q('#lsnGo').click(); await w(300); continue; }
      if (q('.lsn-opts .lsn-opt')) pick(it);
      else if (q('#lsnBank')) { const used = new Set(); for (const x of String(it.answer).split(/\s+/)) { const b = qa('#lsnBank .lsn-tile').find(t => !used.has(t) && nz(t.textContent) === nz(x)); if (b) { used.add(b); b.click(); } } }
      else if (q('#lsnIn')) { q('#lsnIn').value = it.answer; q('#lsnIn').dispatchEvent(new Event('input')); }
      else if (q('.lsn-match')) { for (const a of qa('.lsn-match [data-s="w"]')) { a.click(); const b = q(`.lsn-match [data-s="m"][data-m="${a.dataset.m}"]`); if (b) b.click(); await w(60); } }
      else if (q('#lsnNoS')) { q('#lsnNoS').click(); await w(300); continue; }
      await w(150); if (q('#lsnCheck') && !q('#lsnCheck').disabled) q('#lsnCheck').click(); await w(500); if (q('#lsnNext')) q('#lsnNext').click(); await w(500); }
    if (document.activeElement) document.activeElement.blur(); scrollTo(0, 0); return; }
  for (let n = 0; n < 10 && !q('.lsn-opts .lsn-opt'); n++) { const it = App._lsn && App._lsn.sess.cur; if (!it) break;
    if (q('#lsnGo')) { q('#lsnGo').click(); await w(300); continue; }
    if (q('#lsnBank')) { const used = new Set(); for (const x of String(it.answer).split(/\s+/)) { const b = qa('#lsnBank .lsn-tile').find(t => !used.has(t) && nz(t.textContent) === nz(x)); if (b) { used.add(b); b.click(); } } }
    else if (q('#lsnIn')) { q('#lsnIn').value = it.answer; q('#lsnIn').dispatchEvent(new Event('input')); }
    else if (q('.lsn-match')) { for (const a of qa('.lsn-match [data-s="w"]')) { a.click(); const b = q(`.lsn-match [data-s="m"][data-m="${a.dataset.m}"]`); if (b) b.click(); await w(60); } }
    else if (q('#lsnNoS')) { q('#lsnNoS').click(); await w(300); continue; }
    await w(120); if (q('#lsnCheck') && !q('#lsnCheck').disabled) q('#lsnCheck').click(); await w(500); if (q('#lsnNext')) q('#lsnNext').click(); await w(400); }
  const it = App._lsn && App._lsn.sess.cur; if (it) pick(it); await w(150);
  if (k === 'feedback-wrong') { const bad = qa('.lsn-opts .lsn-opt').find(b => b.dataset.o !== String(it && it.answer)); if (bad) bad.click(); await w(150); } // sai: bấm một đáp án KHÁC đáp án đúng
  if (k === 'feedback' || k === 'feedback-wrong') { const c = q('#lsnCheck'); if (c && !c.disabled) c.click(); await w(900); if (document.activeElement) document.activeElement.blur(); }
  if (k === 'call') { const g = q('#callGo'); if (g) g.click(); await w(1500); } // Gọi ngay → vào cuộc gọi (khung teacher-call, Carlos nói câu đầu)
  scrollTo(0, 0); };

// 13 màn chủ duyệt (v2.1) → khóa trong SCREENS (null = chưa port/chưa chụp → QC cuối ĐỎ). teacher: tư thế mong đợi theo trạng thái (teacher-pose-map), null = màn không có giáo viên;
// ready: bộ chọn chứng tỏ đã lái TỚI đúng trạng thái (chụp khi chưa tới = ĐỎ ở stitch-diff + final-qc); speaks: giáo viên phải nói (kiểm giọng == giáo viên + khớp miệng); sfx: âm hiệu ứng phải phát; duo: 2 giáo viên cùng màn. Màn port xong: điền k + SCREENS/V2REF/DRIVE.
export const FINAL = [
  { stitch: 'today', k: 'home', ready: ':is(.v2-today, .v2-today-desk) [data-blk="path"] :is([data-cur], [data-pv])' /* một component PathTrail [data-pv] ở cả today (điện thoại) và today-desk (≥ 1024): thu gọn = chặng hiện tại, mở rộng chỉ thêm hàng */, teacher: ['happy', 'talk', 'point'] /* happy = vòng nghỉ Chars.idle (chủ 3/11: cô sống ở Hôm nay) */ }, { stitch: 'today-new', k: 'today-new', ready: '.v2-today-new [data-step]', teacher: ['wave'] }, { stitch: 'review', k: 'review', teacher: null }, { stitch: 'practice', k: 'practice', teacher: null },
  { stitch: 'leagues', k: 'leagues', teacher: null }, { stitch: 'me', k: 'me', teacher: null }, { stitch: 'streak', k: 'streak', teacher: ['encourage'] },
  { stitch: 'exam-readiness', k: 'readiness', teacher: null }, { stitch: 'teacher-call', k: 'call', ready: '.tch', teacher: ['talk', 'listen'], speaks: true },
  { stitch: 'lesson-question', k: 'lesson', ready: '.lsn-opts .lsn-opt', teacher: ['listen', 'talk'], speaks: true }, { stitch: 'feedback-correct', k: 'feedback', ready: '.lsn-fv2.ok', teacher: ['cheer'], sfx: ['correct'] },
  { stitch: 'feedback-wrong', k: 'feedback-wrong', ready: '.lsn-fv2.bad', teacher: ['concern'], sfx: ['wrong'] }, { stitch: 'lesson-complete', k: 'complete', ready: '.lsn-end', teacher: ['cheer'], sfx: ['win'] },
  { stitch: 'story-duo', k: 'story', ready: '.lsn-qblk ~ #lsnBody .lsn-opt, .lsn-qblk + #lsnBody .lsn-opt', teacher: ['talk', 'listen'], duo: true, speaks: true },
];
export const READY = Object.fromEntries(FINAL.filter(f => f.k && f.ready).map(f => [f.k, f.ready]));
Object.assign(READY, { 'speak-sit': '.v2s-pas-sit', 'speak-drill': '.v2s-pas-drill', 'onb-goal': '.v2s-onb-goal', 'onb-level': '.v2s-onb-level', 'onb-target': '.v2s-onb-target', 'onb-pace': '.v2s-onb-pace', 'onb-ready': '.v2s-onb-ready', welcome: ':is(.v2s-welcome, .v2s-welcome-desk)', 'welcome-desk': ':is(.v2s-welcome, .v2s-welcome-desk)' }); // welcome: điện thoại/máy tính cùng route, chọn khung theo độ rộng // 2 màn Nói (cờ lk.speak=1): trang lỗi/không tải gói = ĐỎ, không xanh giả

