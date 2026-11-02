/* 🧑‍🏫 Gia sư 1-1 hằng ngày – LÕI THUẦN (docs/specs/tutor-daily.md). Không DOM, không mạng, không lưu trữ: mọi quyết định chạy trên máy người học.
 * Tutor.session(ctx) → "Buổi học hôm nay" 5–15 phút: khởi động thắng nhanh → sửa lỗi cũ → ôn FSRS → 1 bài mới theo lộ trình → ôn tiếp → 1 lượt nói (kết vui).
 * Tutor.line(ctx)    → lời gia sư {id, k, v, who, voice, say}: mẫu câu soạn sẵn có biến (khóa tiếng Việt → I18N), không lặp mẫu trong 7 ngày, không gây tội lỗi.
 * Tutor.week(ctx)    → báo cáo tuần ngắn: giỏi lên ở đâu, tuần tới tập trung gì.
 * Tutor.nudge(ctx)   → nội dung lời nhắc giọng gia sư cho Remind.plan (giờ, ≤ 1/ngày, giãn cách vẫn do remind.js quyết).
 * Tutor.dayKey(ts, tz) → ngày địa phương theo múi giờ IANA (đúng qua mốc đổi giờ). */
(function (g) {
  'use strict';
  const DAY = 864e5, NOREP = 7;
  // Ước lượng thời gian (giây) – thay bằng số đo thật của người học khi có (ctx.sec)
  const SEC = { review: 9, fix: 25, speak: 75 };
  const PACE = { 10: 5, 20: 10, 40: 15 }, MINS = [5, 10, 15];
  const LOW = 0.7, HIGH = 0.92; // giữ tỉ lệ đúng quanh ~80–85 % (Wilson et al. 2019)
  const VOICE = { ama: 'female', carlos: 'male' };

  // Mẫu câu: [id, khóa hiển thị (tiếng Việt → I18N, biến {name} {w} {n} {m} {s} {d} {k}), câu nói tiếng Anh ngắn (Kokoro sinh sẵn; {w} = clip từ có sẵn)]
  const TPL = {
    morning: [['gm1', 'Chào buổi sáng, {name}! Mình bắt đầu nhé?', 'Good morning! Ready for today?'], ['gm2', 'Sáng nay mình học cùng nhau nhé, {name}.', 'Morning! Let’s learn together.']],
    noon: [['gn1', 'Chào {name}! Nghỉ trưa học vài phút nhé.', 'Hi! A few minutes now?'], ['gn2', 'Buổi chiều vui vẻ, {name}! Sẵn sàng chưa?', 'Good afternoon! Ready?']],
    evening: [['ge1', 'Chào buổi tối, {name}! Buổi học nhẹ nhàng thôi.', 'Good evening! Let’s keep it light.'], ['ge2', 'Tối nay mình ôn cùng nhau nhé, {name}.', 'Evening! Let’s review together.']],
    late: [['gl1', 'Muộn rồi, {name} – mình làm thật gọn nhé.', 'It’s late. Let’s keep it short.']],
    back: [['gb1', 'Mừng {name} quay lại! Mình bắt đầu thật nhẹ nhàng.', 'Welcome back! Let’s start easy.'], ['gb2', 'Gặp lại {name} vui quá! Vài phút thôi là đủ.', 'So good to see you! Just a few minutes.']],
    first: [['gf1', 'Chào {name}, mình là gia sư của bạn! Mỗi ngày một buổi ngắn thôi.', 'Hi! I’m your tutor. One short session a day.']],
    recall: [['rc1', 'Hôm qua “{w}” hơi khó. Mình thử lại trước nhé!', 'Yesterday’s tricky one first: {w}.'], ['rc2', 'Còn nhớ “{w}” không? Lần này chắc chắn được!', 'Remember this one? {w}.']],
    praise: {
      acc: [['pa1', 'Tuần này bạn đúng nhiều hơn {d}% – tiến bộ thật sự!', 'You’re more accurate this week!']],
      mastered: [['pm1', 'Bạn đã nhớ chắc {n} từ trong tuần này.', 'You really know more words now!']],
      fixed: [['pf1', 'Bạn đã sửa xong {n} lỗi cũ. Giỏi lắm!', 'You fixed old mistakes. Great job!']],
      streak: [['ps1', '{s} ngày học liền – thói quen đang thành hình!', 'Your habit is growing!']],
      speak: [['pk1', 'Phát âm “{w}” của bạn đã rõ hơn hẳn.', 'Your {w} sounds much clearer!']],
      effort: [['pe1', 'Mỗi ngày một chút là đủ – bạn đang làm rất tốt.', 'A little every day. You’re doing great.'], ['pe2', 'Cảm ơn bạn đã dành thời gian hôm nay.', 'Thanks for showing up today.']],
    },
    goal: [['gg1', 'Hôm nay: {n} thẻ ôn + 1 bài mới, khoảng {m} phút.', 'Today: a short review and one new lesson.'], ['gg2', 'Mục tiêu nhỏ: {m} phút, kết thúc bằng một câu nói.', 'Small goal today, then we talk.'], ['gg3', 'Chỉ {m} phút – ôn nhanh rồi nói cùng mình.', 'Just a few minutes, then we chat.']],
    done: [['dn1', 'Xong buổi hôm nay! Mai mình gặp lại nhé.', 'All done! See you tomorrow.'], ['dn2', 'Tuyệt vời! Ngày mai mình tập trung vào {k}.', 'Great work! Tomorrow we focus on {k}.']],
  };
  // Từ cấm trong lời gia sư (không gây tội lỗi / áp lực) – test kiểm mọi mẫu
  const BAN = /nguy|mất chuỗi|đừng để|thất vọng|lười|bỏ cuộc|cuối cùng|danger|lose|lost|lazy|disappoint|last chance|hurry/i;

  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  function dayKey(ts, tz) {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: tz || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ts)); }
    catch (e) { const d = new Date(ts); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  }
  const hourIn = (ts, tz) => { try { return +new Intl.DateTimeFormat('en-GB', { timeZone: tz || undefined, hour: '2-digit', hourCycle: 'h23' }).format(new Date(ts)); } catch (e) { return new Date(ts).getHours(); } };
  const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / DAY); // khóa ngày YYYY-MM-DD

  // Thời lượng buổi theo mục tiêu người học đã chọn (onboard pace 10/20/40 → 5/10/15 phút) hoặc chỉnh tay trong Cài đặt
  function minutes(s) { s = s || {}; if (MINS.includes(+s.tutorMins)) return +s.tutorMins; return PACE[s.pace] || 10; }

  // ctx: { now, tz, settings, due:[{id, r}], mistakes:[{key, w, kind, at, fixed}], next:{href, mins, kind}|null, speak:{href, w}|null, acc, sec }
  function session(ctx) {
    const c = ctx || {}, now = c.now || Date.now(), tz = c.tz, mins = c.mins || minutes(c.settings), sec = Object.assign({}, SEC, c.sec);
    const acc = c.acc == null ? 0.85 : c.acc, mode = acc < LOW ? 'easy' : acc > HIGH ? 'stretch' : 'normal';
    let left = mins * 60; const steps = [];
    const speak = c.speak ? { kind: 'speak', href: c.speak.href, w: c.speak.w, n: 1, est: sec.speak } : null;
    if (speak) left -= speak.est; // lượt nói luôn có (kết buổi vui – peak-end)
    const due = (c.due || []).slice().sort((a, b) => a.r - b.r); // nguy cơ quên cao trước (R thấp)
    // Sửa lỗi: ưu tiên lỗi hôm qua, rồi lỗi gần nhất; tối đa 3 (dễ nản nếu dồn nhiều lỗi)
    const today = dayKey(now, tz), yest = dayKey(now - DAY, tz);
    const fixes = (c.mistakes || []).filter(m => !m.fixed).sort((a, b) => ((dayKey(b.at, tz) === yest) - (dayKey(a.at, tz) === yest)) || b.at - a.at).slice(0, mode === 'easy' ? 2 : 3);
    // Sửa lỗi trước bài mới: ít nhất 1 lỗi nếu có, tối đa ~25 % thời gian
    const nFix = Math.min(fixes.length, Math.max(fixes.length ? 1 : 0, Math.floor(left * 0.25 / sec.fix)));
    left -= nFix * sec.fix;
    // Bài mới: bỏ khi người học đang hụt (easy) mà vẫn còn thẻ đến hạn – củng cố trước, độ khó vừa sức
    const newEst = c.next ? Math.min((c.next.mins || 6) * 60, Math.max(150, left * 0.55)) : 0;
    const fresh = c.next && (mode !== 'easy' || !due.length) ? { kind: 'new', href: c.next.href, lesson: c.next.kind || 'lesson', n: 1, est: newEst, stretch: mode === 'stretch' } : null;
    const room = n => Math.max(0, Math.min(due.length, Math.floor(n / sec.review)));
    let nRev = room(left - (fresh ? fresh.est : 0));
    if (mode === 'easy') nRev = Math.min(nRev, Math.max(5, Math.round(room(left - newEst) * 0.8))); // buổi ngắn hơn bình thường, nhiều lần đúng hơn
    // Khởi động: 2 thẻ R cao nhất (thắng nhanh), phần còn lại theo R thấp trước, chia 2 khối kẹp bài mới → xen kẽ dạng bài
    const pick = due.slice(0, nRev), warm = pick.length >= 2 ? pick.splice(pick.length - (pick.length > 4 ? 2 : 1)).reverse() : [];
    const half = Math.ceil(pick.length / 2), A = pick.slice(0, half), B = pick.slice(half);
    const rev = (list, tag) => list.length && steps.push({ kind: 'review', tag, ids: list.map(x => x.id), n: list.length, est: list.length * sec.review });
    rev(warm, 'warm');
    if (nFix) steps.push({ kind: 'fix', keys: fixes.slice(0, nFix).map(m => m.key), n: nFix, est: nFix * sec.fix });
    rev(fresh ? A : pick, 'due');
    if (fresh) { steps.push(fresh); rev(B, 'due'); }
    if (speak) steps.push(speak);
    const est = steps.reduce((s, x) => s + x.est, 0);
    return { day: today, mins, mode, est: Math.round(est), steps, left: { due: due.length - nRev, fix: fixes.length - nFix } };
  }

  // Chọn mẫu không lặp trong 7 ngày (hist: [{id, day}]), cố định theo ngày → mở lại app trong ngày vẫn cùng câu
  function choose(list, hist, day, salt) {
    const recent = new Set((hist || []).filter(h => h.day && daysBetween(h.day, day) < NOREP && daysBetween(h.day, day) >= 0 && h.day !== day).map(h => h.id));
    const pool = list.filter(x => !recent.has(x[0])); const p = pool.length ? pool : list;
    return p[hash(day + '|' + salt) % p.length];
  }
  const teacher = (s, day) => (s && VOICE[s.teacher] ? s.teacher : hash(day) % 2 ? 'carlos' : 'ama');
  const mk = (row, v, who) => ({ id: row[0], k: row[1], v, who, voice: VOICE[who], say: row[2].replace('{w}', v.w || '').replace('{k}', v.k || '') });

  // ctx: { now, tz, settings:{name, teacher}, slot:'hello'|'goal'|'done', lastDay, first, yMistake:{w}, wk:{accDelta, mastered, fixed}, streak, plan, focus, hist }
  function line(ctx) {
    const c = ctx || {}, now = c.now || Date.now(), day = dayKey(now, c.tz), s = c.settings || {}, who = teacher(s, day);
    const name = s.name || null, slot = c.slot || 'hello', h = c.hist;
    if (slot === 'goal') { const p = c.plan || { mins: minutes(s), steps: [] }; const n = p.steps.filter(x => x.kind === 'review').reduce((a, x) => a + x.n, 0); return mk(choose(n ? TPL.goal : TPL.goal.slice(1), h, day, 'goal'), { n, m: p.mins }, who); }
    if (slot === 'done') return c.focus ? mk(TPL.done[1], { k: c.focus }, who) : mk(TPL.done[0], {}, who);
    if (slot === 'recall') return c.yMistake && c.yMistake.w ? mk(choose(TPL.recall, h, day, 'rc'), { w: c.yMistake.w }, who) : null;
    if (slot === 'praise') {
      const w = c.wk || {}, P = TPL.praise;
      if (w.accDelta >= 5) return mk(P.acc[0], { d: Math.round(w.accDelta) }, who);
      if (w.speakW) return mk(P.speak[0], { w: w.speakW }, who);
      if (w.mastered >= 5) return mk(P.mastered[0], { n: w.mastered }, who);
      if (w.fixed >= 3) return mk(P.fixed[0], { n: w.fixed }, who);
      if ([3, 7, 14, 30, 50, 100, 180, 365].includes(c.streak)) return mk(P.streak[0], { s: c.streak }, who);
      return mk(choose(P.effort, h, day, 'pe'), {}, who);
    }
    // hello: lần đầu → giới thiệu; nghỉ ≥ 2 ngày → chào mừng quay lại (không nhắc chuỗi đã mất); còn lại theo giờ địa phương
    const gap = c.lastDay ? daysBetween(c.lastDay, day) : 0, hr = hourIn(now, c.tz);
    const set = c.first ? TPL.first : gap >= 2 ? TPL.back : hr >= 22 || hr < 4 ? TPL.late : hr < 11 ? TPL.morning : hr < 17 ? TPL.noon : TPL.evening;
    return mk(choose(set, h, day, 'hello'), { name }, who);
  }

  // Báo cáo tuần: by = { kỹ năng: { ok, n } } tuần này (cur) và tuần trước (prev); mistakes theo kỹ năng tuần này
  function week(ctx) {
    const c = ctx || {}, cur = c.cur || {}, prev = c.prev || {}, a = x => (x && x.n ? x.ok / x.n : null);
    let up = null, weak = null;
    for (const k of Object.keys(cur)) {
      const now = a(cur[k]), was = a(prev[k]);
      if (cur[k].n >= 10 && was != null && prev[k].n >= 10) { const d = Math.round((now - was) * 100); if (d >= 3 && (!up || d > up.d)) up = { k, d }; }
      if (cur[k].n >= 5 && (!weak || now < weak.acc)) weak = { k, acc: now };
    }
    const mk2 = c.mistakes || {}, most = Object.keys(mk2).sort((x, y) => mk2[y] - mk2[x])[0];
    const focus = weak && weak.acc < 0.8 ? weak.k : most || (weak && weak.k) || null;
    return { days: c.days || 0, mins: Math.round(c.mins || 0), up, focus: up && focus === up.k && most && most !== up.k ? most : focus, words: c.mastered || 0 };
  }

  // Lời nhắc giọng gia sư: ưu tiên lỗi hôm qua (cụ thể) → số thẻ đến hạn → lời mời chung. Không bao giờ "chuỗi sắp mất".
  const NUDGE = [['tn1', '{who}: Hôm qua “{w}” hơi khó – thử lại 1 phút nhé?', 'recall'], ['tn2', '{who}: Buổi {m} phút hôm nay đã sẵn sàng.', 'ready'], ['tn3', '{who}: Mình để dành cho bạn {n} thẻ ôn nhanh.', 'due']];
  function nudge(ctx) {
    const c = ctx || {}, day = dayKey(c.now || Date.now(), c.tz), who = teacher(c.settings, day), Who = who === 'ama' ? 'Ama' : 'Carlos';
    const row = c.yMistake && c.yMistake.w ? NUDGE[0] : c.due ? NUDGE[2] : NUDGE[1];
    return { id: row[0], kind: row[2], k: row[1], v: { who: Who, w: c.yMistake && c.yMistake.w, n: c.due, m: minutes(c.settings) }, who, route: '#/tutor' };
  }

  const all = () => { const out = []; const walk = o => Array.isArray(o) ? (Array.isArray(o[0]) ? o.forEach(r => out.push(r)) : out.push(o)) : Object.values(o).forEach(walk); walk(TPL); NUDGE.forEach(r => out.push(r)); return out; };
  g.Tutor = { session, line, week, nudge, minutes, dayKey, hourIn, TPL, NUDGE, BAN, VOICE, SEC, all };
})(typeof self !== 'undefined' ? self : this);
