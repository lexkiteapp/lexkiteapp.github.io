// 🧭 Danh sách màn Stitch v2 + dữ liệu mẫu + cách lái bài học – DÙNG CHUNG cho stitch-diff.mjs (bám mẫu) và final-qc.mjs (QC cuối 1-1).
// Thêm màn mới: SCREENS (khóa → route) + V2REF (khóa → tên màn Stitch v2) + DRIVE (nếu cần lái tới trạng thái) + FINAL (13 màn chủ duyệt).
import fs from 'node:fs'; import path from 'node:path';
export const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.mp4': 'video/mp4', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };
// Phục vụ thẳng web/ trên https://lk.test (hermetic: chặn mọi host khác, /api/* = {})
export const serve = (ctx, ROOT) => ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
// Dữ liệu mẫu chung (bối cảnh Stitch): IELTS mục tiêu 7.5, 1 lần thi thử có điểm 4 kỹ năng, chặng 3
export const SEED = async () => { localStorage.setItem('lk.ux1', '1'); localStorage.setItem('lk.onb', '1'); App.state.settings.onboarded = true; App.state.settings.exam = 'ielts'; App.state.settings.examTarget = '7.5'; await App.saveSettings();
  await Core.Store.set('mocks', [{ at: Date.now() - 3 * 864e5, bands: { listening: 7.5, reading: 7.5, writing: 6.5, speaking: 6.5 }, overall: 7 }]); localStorage.setItem('lk.lsn.path', '3'); localStorage.setItem('lk.ux1.st', JSON.stringify({ 0: 3, 1: 3, 2: 2 })); };
// Bảng giải đấu mẫu giống Stitch (hạng 5 = mình): đặt lại sau mỗi lần tải lại trang (Sync.league là hàm thật cần đăng nhập → thay bằng dữ liệu mẫu)
// Màn Chuỗi: chuỗi 14 ngày liên tiếp, hôm nay 14/20 (như mẫu "14 day streak!") – chỉ nạp khi vào màn này (không đổi dữ liệu các màn khác)
export const SEED_STREAK = async () => { const k = d => { const x = new Date(); x.setDate(x.getDate() - d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
  const days = {}; for (let i = 1; i < 14; i++) days[k(i)] = 5; days[k(0)] = 14; App.state.stats.days = Object.assign(App.state.stats.days || {}, days); App.state.settings.dailyGoal = 20; await App.saveSettings(); await Core.Store.set('stats', App.state.stats); };
export const SEED_LEAGUE = () => {
  const names = ['An Nguyen', 'Linh Khanh', 'Marcus Roy', 'Tariq Chen', 'You Lexkite', 'Sara Hansen', 'Daiki Kato'], xps = [1420, 1280, 1150, 980, 820, 760, 690]; // bảng giải đấu mẫu giống Stitch (hạng 5 = mình)
  window.Sync = window.Sync || {}; Sync.user = { uid: 'u1', displayName: 'You Lexkite' }; Sync.authed = async () => Sync.user;
  Sync.league = async () => ({ member: { nick: 'You', tier: 3, xp: 820 }, week: { end: Date.now() + 3 * 864e5 }, rules: { up: 3, down: 2, maxTier: 5 }, board: names.map((n, i) => ({ rank: i + 1, nick: n, xp: xps[i], me: i === 4, zone: i < 3 ? 'up' : i >= 5 ? 'down' : '' })) });
};
export const SCREENS = { home: 'home', complete: 'lesson/go?demo=1', lesson: 'lesson/go?demo=1', feedback: 'lesson/go?demo=1', 'feedback-wrong': 'lesson/go?demo=1', readiness: 'goal', review: 'review?hub=1', practice: 'train', leagues: 'league', me: 'me', streak: 'streak', call: 'call/coffee', story: 'lesson/go?demo=1' };
// Mẫu so sánh: ảnh vẽ từ HTML Stitch v2 (scripts/test/stitch-render.mjs, cùng job CI → out/stitch-v2/png) theo tên màn v2; chưa có thì JPG cũ brand/stitch/
export const V2REF = { home: 'path', lesson: 'lesson-question', feedback: 'feedback-correct', 'feedback-wrong': 'feedback-wrong', complete: 'lesson-complete', readiness: 'exam-readiness', review: 'review', practice: 'practice', leagues: 'leagues', me: 'me', streak: 'streak', call: 'teacher-call', story: 'story-duo' };
// Bài thử: trả lời ĐÚNG (App._lsn) tới câu trắc nghiệm đầu tiên – giống bối cảnh mẫu Stitch (câu 3/5, đã chọn đáp án đúng); feedback = bấm Kiểm tra
// màn cần lái tới trạng thái (bài học/phản hồi/kết quả/truyện/cuộc gọi) – stitch-diff và final-qc dùng CHUNG (từng chỉ lái lesson/feedback → chụp nhầm câu đầu)
export const DRIVEN = /^(lesson|feedback|complete|story|call)/;
export const DRIVE = async k => { const nz = v => String(v).trim().replace(/[.,!?;:]+$/, '').toLowerCase(), q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)], w = ms => new Promise(r => setTimeout(r, ms));
  const pick = it => { const o = qa('.lsn-opts .lsn-opt').find(b => b.dataset.o === String(it.answer)); if (o) o.click(); return !!o; };
  if (k === 'story') { // nút Truyện của bản đồ thử (chỉ số 3 của chặng ux1): vào khung story-duo, câu thoại đầu đang phát (Ama nói, Carlos nghe)
    localStorage.setItem('lk.lsn.path.demo', '3'); localStorage.removeItem('lk.lsn.s.story.demo'); await App.routes.lesson('go'); await w(1200); const g = q('#lsnGo'); if (g) { g.click(); await w(900); } /* 2 bong bóng như mẫu */ if (document.activeElement) document.activeElement.blur(); scrollTo(0, 0); return; }
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
  { stitch: 'path', k: 'home', teacher: null }, { stitch: 'review', k: 'review', teacher: null }, { stitch: 'practice', k: 'practice', teacher: null },
  { stitch: 'leagues', k: 'leagues', teacher: null }, { stitch: 'me', k: 'me', teacher: null }, { stitch: 'streak', k: 'streak', teacher: ['encourage'] },
  { stitch: 'exam-readiness', k: 'readiness', teacher: null }, { stitch: 'teacher-call', k: 'call', ready: '.tch', teacher: ['talk', 'listen'], speaks: true },
  { stitch: 'lesson-question', k: 'lesson', ready: '.lsn-opts .lsn-opt', teacher: ['listen', 'talk'], speaks: true }, { stitch: 'feedback-correct', k: 'feedback', ready: '.lsn-fv2.ok', teacher: ['cheer'], sfx: ['correct'] },
  { stitch: 'feedback-wrong', k: 'feedback-wrong', ready: '.lsn-fv2.bad', teacher: ['concern'], sfx: ['wrong'] }, { stitch: 'lesson-complete', k: 'complete', ready: '.lsn-end', teacher: ['cheer'], sfx: ['win'] },
  { stitch: 'story-duo', k: 'story', ready: '.lsn-duo2 ~ * #lsnChat > *:nth-child(2), .lsn-duo2 + * #lsnChat > *:nth-child(2), #lsnChat > *:nth-child(2)', teacher: ['talk', 'listen'], duo: true, speaks: true },
];
export const READY = Object.fromEntries(FINAL.filter(f => f.k && f.ready).map(f => [f.k, f.ready]));
