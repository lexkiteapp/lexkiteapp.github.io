// 🧭 Danh sách màn Stitch v2 + dữ liệu mẫu + cách lái bài học – DÙNG CHUNG cho stitch-diff.mjs (bám mẫu) và final-qc.mjs (QC cuối 1-1).
// Thêm màn mới: SCREENS (khóa → route) + V2REF (khóa → tên màn Stitch v2) + DRIVE (nếu cần lái tới trạng thái) + FINAL (13 màn chủ duyệt).
import fs from 'node:fs'; import path from 'node:path';
export const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
// Phục vụ thẳng web/ trên https://lk.test (hermetic: chặn mọi host khác, /api/* = {})
export const serve = (ctx, ROOT) => ctx.route('**/*', r => { const u = new URL(r.request().url()); const prod = /^(www\.)?lexkite\.com$/.test(u.hostname); if (u.hostname !== 'lk.test' && !prod) return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, headers: { 'access-control-allow-origin': '*' }, body: '' }); r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
// Dữ liệu mẫu chung (bối cảnh Stitch): IELTS mục tiêu 7.5, 1 lần thi thử có điểm 4 kỹ năng, chặng 3
export const SEED = async () => { localStorage.setItem('lk.lcard', '0'); /* đo độ bám khuôn Stitch của tấm phản hồi; thẻ kết quả (slot extra) có cổng riêng: contrast, ux1-guard, lcard-shots */ localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings();
  await Core.Store.set('mocks', [{ at: Date.now() - 3 * 864e5, bands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 6.5 }, overall: 7 }]); localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 })); };
// Bảng giải đấu mẫu giống Stitch (hạng 5 = mình): đặt lại sau mỗi lần tải lại trang (Sync.league là hàm thật cần đăng nhập → thay bằng dữ liệu mẫu)
// MỌI màn (đầu trang Stitch: lửa 14 · 820 XP · 14/20; Chuỗi; Hoàn thành bài ô Streak 14): chuỗi 14 ngày liên tiếp, hôm nay 14/20 (như mẫu "14 day streak!") – chỉ nạp khi vào màn này (không đổi dữ liệu các màn khác)
// Đồng hồ cố định cho MỌI màn (stitch-diff + final-qc gọi ngay khi mở trang; màn Chuỗi cần nhất): mẫu Stitch = thứ Sáu (T2–T5 lửa, T6 ✓ hôm nay, "5 of 7") → chụp/QC luôn cùng lịch tuần, không trôi theo ngày chạy CI
export const STREAK_NOW = '2026-10-30T12:00:00Z';
export const FIX_CLOCK = page => page.clock.setFixedTime(new Date(STREAK_NOW));
export const SEED_STREAK = async () => { const k = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const days = {}; for (let i = 1; i < 14; i++) days[k(i)] = 5; days[k(0)] = 14; App.state.stats.days = Object.assign(App.state.stats.days || {}, days); App.state.game = App.state.game || {}; App.state.game.xp = Math.max(App.state.game.xp || 0, 820); App.state.settings.dailyGoal = 20; await App.saveSettings(); await Core.Store.set('stats', App.state.stats); };
// Sổ lỗi sai mẫu giống Stitch (3 thẻ: ngữ pháp · từ vựng · khác) – chỉ nạp khi vào màn này (không đổi dữ liệu các màn khác)
export const SEED_MISTAKES = async () => { const now = Date.now(), D = 864e5;
  await Core.Store.set('mistakes', [
    { kind: 'grammar', q: 'I like ___ to music on my daily commute.', answer: 'listening', given: 'listen', explain: 'Preference verbs (like, love, enjoy, avoid) almost always take the -ing form.', ref: 'tenses', key: 'sg1', n: 3, at: now - D, fixed: false },
    { kind: 'vocab', q: 'The budget cut will severely ___ laboratory research.', answer: 'affect', given: 'effect', explain: 'Affect is a verb, effect is a noun.', ref: 'affect', key: 'sv1', n: 2, at: now - 6 * D, fixed: false },
    { kind: 'reading', q: 'I am confident that she is good ___ data analysis.', answer: 'at', given: 'in', explain: "Say 'good at' for subjects, skills and sports.", ref: '', key: 'sr1', n: 2, at: now - 8 * D, fixed: false }]); };
// Tiến độ mẫu (#/stats, như mẫu Stitch: cấp ~7, 1.420 lượt ôn, lịch 4 tháng có hoạt động, 30 từ ở đủ 5 cấp nhớ, 6 huy hiệu đã mở) – chỉ nạp khi vào màn này
export const SEED_STATS = async () => { const D = 864e5, now = Date.now(), k = d => Core.todayKey(new Date(now - d * D)), g = App.state.game, st = App.state.stats;
  g.xp = Math.max(g.xp || 0, 2340); g.total = Object.assign(g.total || {}, { reviews: 1420, quizzes: 94, spoken: 386, readings: 42 });
  for (let i = 0; i < 120; i++) { if (i % 3 === 2 && i > 14) continue; const x = g.days[k(i)] || (g.days[k(i)] = {}); x.xp = (x.xp || 0) + 20 + (i * 7) % 60; x.reviews = (x.reviews || 0) + 10 + (i * 5) % 30; x.newWords = (x.newWords || 0) + i % 4; x.quizzes = (x.quizzes || 0) + i % 2; st.days[k(i)] = (st.days[k(i)] || 0) + 10 + (i * 5) % 30; }
  g.badges = Object.assign({ first: now - 50 * D, streak3: now - 20 * D, streak7: now - 10 * D, words50: now - 5 * D, reader: now - 3 * D, level5: now - D }, g.badges || {});
  for (const [i, w] of IELTS_DATA.TOPICS[0].words.slice(0, 30).entries()) { await App.addWord(w, null, { silent: true }); const c = App.state.cards[w.word.toLowerCase()], iv = [0.5, 2, 6, 15, 40][i % 5];
    if (c) c.srs = Object.assign(c.srs || {}, { reps: 1 + i % 5, interval: iv, last: now - iv * D, due: now + ((i % 7) - 1) * D, S: iv, D: 5 }); } };
// Màn Chuỗi (mẫu Stitch streak-v5, 5/11): kịch bản RIÊNG đúng như mẫu – thứ Bảy 14/11/2026, chuỗi 14 ngày (31/10→13/11), thứ Năm 12/11 đóng băng, hôm nay chưa học,
//   còn 1/2 lượt băng, 1 rương chưa mở (mốc 3/7/14 đã chúc mừng), sự kiện thu 2/5 mảnh. Chỉ áp cho màn streak (các màn khác giữ STREAK_NOW thứ Sáu).
export const STREAK_V5_NOW = '2026-11-14T12:00:00Z';
export const SEED_STREAK_V5 = async () => { const k = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const days = {}; for (let i = 1; i <= 14; i++) if (i !== 2) days[k(i)] = 5; App.state.stats.days = days; const g = App.state.game = App.state.game || {};
  g.days = {}; g.frozen = { [k(2)]: 1 }; g.freezes = 1; g.ret = { ms: { 3: 1, 7: 1, 14: 1 }, opened: 2, ev: { autumn26: [k(4), k(3)] } }; App.state.settings.dailyGoal = 20; await App.saveSettings(); await Core.Store.set('stats', App.state.stats); };
// Thư viện phát âm: đã học vài âm như mẫu (tick ở /iː/ /ɪ/ /e/ /ɑː/ /p/ /b/); âm kế tiếp chưa học = ô hổ phách
export const SEED_PRON = () => { App.state.game = App.state.game || {}; App.state.game.pronDone = { 'iː': 100, 'ɪ': 92, e: 88, 'ɑː': 100, p: 95, b: 90, 'final-consonants': 80 }; };
export const SEED_GRAMMAR = () => { App.state.game = App.state.game || {}; App.state.game.grammarDone = { 'be-am-is-are': 95, 'present-simple': 90, 'present-continuous': 60, 'past-simple': 85, 'articles': 88, 'passive-voice': 82, 'conditionals-0-1': 70 }; }; // hub Ngữ pháp có tiến độ như mẫu (xanh ≥ 80, đỏ < 80, bài kế dở)
export const SEED_SETTINGS = () => { const S = App.state.settings; S.theme = 'auto'; S.dailyNew = 20; S.accent = 'en-GB'; S.ttsRate = 0.92; S.reminderOn = true; S.reminderAuto = false; S.reminderTime = '20:00'; }; // Cài đặt: giá trị hàng mục lục cố định (mẫu: Tự động · 20 từ/ngày · UK 0.92× · nhắc 20:00)
// Từ điển: lịch sử tra như mẫu (8 từ ở "Recent searches")
export const SEED_DICT = async () => { await Core.Store.set('recent', ['ambiguous', 'feasible', 'mitigate', 'diligent', 'concur', 'went', 'coherent', 'pinnacle']); };
export const SEED_DAY = async () => { await App.need('pathx'); const d = (await DayPath.days())[0]; if (d) await Core.Store.set('pathDays', { [d.key]: { s: ['learn', 'match'] } }); }; // Ngày 1: đã xong 2 bước (xong / tiếp theo / chưa làm cùng lúc)
export const SEED_SCREEN = async (page, k) => { if (k === 'settings') { await page.evaluate(SEED_SETTINGS); await page.evaluate(() => App.route()); await page.waitForTimeout(600); return; } if (k === 'day') { await page.evaluate(SEED_DAY); await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(1500); return; } if (k === 'dict') { await page.evaluate(SEED_DICT); await page.evaluate(() => App.route()); await page.waitForTimeout(600); return; } if (k === 'mistakes' || k === 'stats') { await page.evaluate(k === 'stats' ? SEED_STATS : SEED_MISTAKES); await page.evaluate(() => App.route()); await page.waitForTimeout(900); return; } if (k === 'grammar') { await page.evaluate(SEED_GRAMMAR); await page.evaluate(() => App.route()); await page.waitForTimeout(600); return; } if (k === 'pron-hub') { await page.evaluate(SEED_PRON); await page.evaluate(() => App.route()); await page.waitForTimeout(600); return; } if (k !== 'streak') return; await page.clock.setFixedTime(new Date(STREAK_V5_NOW)); await page.evaluate(SEED_STREAK_V5); await page.evaluate(() => App.route()); await page.waitForTimeout(600); };
export const SEED_LEAGUE = () => {
  const names = ['An Nguyen', 'Linh Khanh', 'Marcus Roy', 'Tariq Chen', 'You Lexkite', 'Sara Hansen', 'Daiki Kato'], xps = [1420, 1280, 1150, 980, 820, 760, 690]; // bảng giải đấu mẫu giống Stitch (hạng 5 = mình)
  window.Sync = window.Sync || {}; Sync.user = { uid: 'u1', displayName: 'You Lexkite' }; Sync.authed = async () => Sync.user;
  Sync.league = async () => ({ member: { nick: 'You', tier: 3, xp: 820 }, week: { end: Date.now() + 3 * 864e5 }, rules: { up: 3, down: 2, maxTier: 5 }, board: names.map((n, i) => ({ rank: i + 1, nick: n, xp: xps[i], me: i === 4, zone: i < 3 ? 'up' : i >= 5 ? 'down' : '' })) });
};
export const SCREENS = {
  call: 'call/coffee',
  complete: 'lesson/go?demo=1',
  day: 'day/1',
  deck: 'deck',
  dict: 'dict',
  feedback: 'lesson/go?demo=1',
  'feedback-wrong': 'lesson/go?demo=1',
  grammar: 'grammar',
  home: 'home',
  leagues: 'league',
  lesson: 'lesson/go?demo=1',
  library: 'library?g=all',
  me: 'me',
  mistakes: 'mistakes',
  'onb-goal': 'welcome/setup',
  'onb-level': 'welcome/setup?s=level',
  'onb-pace': 'welcome/setup?s=pace',
  'onb-ready': 'welcome/setup?s=ready',
  'onb-target': 'welcome/setup?s=target',
  practice: 'train',
  'pron-hub': 'pron',
  readiness: 'goal',
  review: 'review?hub=1',
  score: 'score',
  settings: 'settings',
  skills: 'skills',
  'speak-drill': 'speak/cafe/drill',
  'speak-sit': 'speak/cafe',
  stats: 'stats',
  story: 'lesson/go?demo=1',
  streak: 'streak',
  'today-new': 'home',
  topic: 'topic/education',
  'vocab-hub': 'vocab',
  welcome: 'welcome',
  'welcome-desk': 'welcome',
}; // home = Hôm nay v2 (người đang học, lộ trình đầy đủ trong khối Your path) · today-new = người mới (DRIVE đặt về trạng thái chưa học)
// Mẫu so sánh: ảnh vẽ từ HTML Stitch v2 (scripts/test/stitch-render.mjs, cùng job CI → out/stitch-v2/png) theo tên màn v2; chưa có thì JPG cũ brand/stitch/
export const V2REF = {
  call: 'teacher-call',
  complete: 'lesson-complete',
  day: 'day',
  deck: 'deck',
  diary: 'say-front', // 🎙️ Nhật ký giọng nói (web/cpack/diary-app/diary.js): cùng khung Stitch say-front như màn score, thân riêng
  dict: 'dict',
  feedback: 'feedback-correct',
  'feedback-wrong': 'feedback-wrong',
  grammar: 'grammar',
  home: 'today',
  leagues: 'leagues',
  lesson: 'lesson-question',
  library: 'library',
  me: 'me',
  mistakes: 'mistakes',
  'onb-goal': 'onb-goal',
  'onb-level': 'onb-level',
  'onb-pace': 'onb-pace',
  'onb-ready': 'onb-ready',
  'onb-target': 'onb-target',
  practice: 'practice',
  'pron-hub': 'pron-hub',
  readiness: 'exam-readiness',
  review: 'review',
  score: 'say-front', // Thử thách nói 30 giây (web/cpack/score-app/score30.js): cùng khung Stitch say-front (thanh trên + tab), thân riêng
  settings: 'settings',
  skills: 'skills',
  'speak-drill': 'pas-drill',
  'speak-sit': 'pas-sit',
  stats: 'stats',
  story: 'story-duo',
  streak: 'streak',
  'today-new': 'today-new',
  topic: 'topic',
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
// Chia việc theo màn cho CI (stitch-diff.yml matrix, 19/11: một job 30 phút bị huỷ – "So với mẫu Stitch" 1136 s + "QC cuối" 507 s): SHARD="i/n" (i từ 0) → mỗi shard chỉ xử lý
// các màn có chỉ số (theo thứ tự khai báo trong SCREENS) ≡ i (mod n); bỏ SHARD = chạy đủ (như cũ). Mục không gắn màn (k=null) và gallery chỉ shard 0. stitch-diff.mjs và final-qc.mjs
// dùng CHUNG phép chia này nên final-qc của shard i luôn thấy scores.json của chính shard i.
const [SH_I, SH_N] = (process.env.SHARD || '0/1').split('/').map(Number);
export const SHARD = { i: SH_I, n: SH_N };
export const inShard = k => (k == null ? SH_I === 0 : Object.keys(SCREENS).indexOf(k) % SH_N === SH_I);
export const shardScreens = () => Object.entries(SCREENS).filter(([k]) => inShard(k));
export const FINAL = [
  { stitch: 'today', k: 'home', ready: ':is(.v2-today, .v2-today-desk) [data-blk="path"] :is([data-cur], [data-pv])' /* một component PathTrail [data-pv] ở cả today (điện thoại) và today-desk (≥ 1024): thu gọn = chặng hiện tại, mở rộng chỉ thêm hàng */, teacher: ['happy', 'talk', 'point'] /* happy = vòng nghỉ Chars.idle (chủ 3/11: cô sống ở Hôm nay) */ }, { stitch: 'today-new', k: 'today-new', ready: '.v2-today-new [data-step]', teacher: ['wave'] }, { stitch: 'review', k: 'review', teacher: null }, { stitch: 'practice', k: 'practice', teacher: null },
  { stitch: 'leagues', k: 'leagues', teacher: null }, { stitch: 'me', k: 'me', teacher: null }, { stitch: 'streak', k: 'streak', teacher: ['encourage'] },
  { stitch: 'exam-readiness', k: 'readiness', teacher: null }, { stitch: 'teacher-call', k: 'call', ready: '.tch', teacher: ['talk', 'listen'], speaks: true },
  { stitch: 'lesson-question', k: 'lesson', ready: '.lsn-opts .lsn-opt', teacher: ['listen', 'talk'], speaks: true }, { stitch: 'feedback-correct', k: 'feedback', ready: '.lsn-fv2.ok', teacher: ['cheer'], sfx: ['correct'] },
  { stitch: 'feedback-wrong', k: 'feedback-wrong', ready: '.lsn-fv2.bad', teacher: ['concern'], sfx: ['wrong'] }, { stitch: 'lesson-complete', k: 'complete', ready: '.lsn-end', teacher: ['cheer'], sfx: ['win'] },
  { stitch: 'story-duo', k: 'story', ready: '.lsn-qblk ~ #lsnBody .lsn-opt, .lsn-qblk + #lsnBody .lsn-opt', teacher: ['talk', 'listen'], duo: true, speaks: true },
  { stitch: 'library', k: 'library', teacher: null }, { stitch: 'topic', k: 'topic', teacher: null }, // nhóm B (31/10)  { stitch: 'stats', k: 'stats', teacher: ['encourage'] },
  { stitch: 'deck', k: 'deck', teacher: null }, { stitch: 'mistakes', k: 'mistakes', teacher: ['thinking'] },
];
export const READY = Object.fromEntries(FINAL.filter(f => f.k && f.ready).map(f => [f.k, f.ready]));
Object.assign(READY, { diary: '.vd .txt', score: '.s30 .txt', 'speak-sit': '.v2s-pas-sit', 'speak-drill': '.v2s-pas-drill', 'onb-goal': '.v2s-onb-goal', 'onb-level': '.v2s-onb-level', 'onb-target': '.v2s-onb-target', 'onb-pace': '.v2s-onb-pace', 'onb-ready': '.v2s-onb-ready', welcome: ':is(.v2s-welcome, .v2s-welcome-desk)', 'welcome-desk': ':is(.v2s-welcome, .v2s-welcome-desk)' }); // welcome: điện thoại/máy tính cùng route, chọn khung theo độ rộng // 2 màn Nói (cờ lk.speak=1): trang lỗi/không tải gói = ĐỎ, không xanh giả

