/* Gamification kiểu Duolingo: XP, cấp độ, nhiệm vụ ngày, huy hiệu, hiệu ứng & âm thanh. */
(function (g) {
  const t = (typeof self !== 'undefined' && self.t) || ((s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s));
  const { Store, todayKey } = g.Core;

  // ---------- Cấp độ ----------
  // Cần 100, 150, 200... XP cho mỗi cấp tiếp theo
  const LEVEL_TITLES = () => [t('Người mới'), t('Tập sự'), t('Chăm chỉ'), t('Tiến bộ'), t('Vững vàng'), 'Band 6.0', 'Band 6.5', 'Band 7.0', 'Band 7.5', 'Band 8.0', 'Band 8.5', t('Bậc thầy'), t('Huyền thoại')];
  function levelOf(xp) {
    let lvl = 1, need = 100, rest = xp;
    while (rest >= need) { rest -= need; lvl++; need += 50; }
    const L = LEVEL_TITLES();
    return { level: lvl, into: rest, need, title: L[Math.min(lvl - 1, L.length - 1)] };
  }

  // ---------- Nhiệm vụ ngày (đổi theo ngày) ----------
  const QUEST_POOL = [
    { id: 'review20', icon: '🃏', get text() { return t('Ôn 20 thẻ flashcard'); }, metric: 'reviews', goal: 20, xp: 30 },
    { id: 'review40', icon: '🔥', get text() { return t('Ôn 40 thẻ flashcard'); }, metric: 'reviews', goal: 40, xp: 50 },
    { id: 'new5', icon: '✨', get text() { return t('Học 5 từ mới'); }, metric: 'newWords', goal: 5, xp: 25 },
    { id: 'new10', icon: '🌱', get text() { return t('Học 10 từ mới'); }, metric: 'newWords', goal: 10, xp: 40 },
    { id: 'quiz', icon: '🎯', get text() { return t('Hoàn thành 1 bài luyện tập'); }, metric: 'quizzes', goal: 1, xp: 20 },
    { id: 'perfect', icon: '💯', get text() { return t('Đạt 100% một bài luyện tập'); }, metric: 'perfect', goal: 1, xp: 40 },
    { id: 'match', icon: '⚡', get text() { return t('Chơi Ghép thẻ 2 lần'); }, metric: 'matches', goal: 2, xp: 25 },
    { id: 'speak', icon: '🎙️', get text() { return t('Luyện phát âm 10 từ'); }, metric: 'spoken', goal: 10, xp: 30 },
    { id: 'read', icon: '📖', get text() { return t('Đọc xong 1 bài đọc'); }, metric: 'readings', goal: 1, xp: 30 },
    { id: 'lookup', icon: '🔎', get text() { return t('Tra 5 từ trong từ điển'); }, metric: 'lookups', goal: 5, xp: 15 },
    { id: 'xp100', icon: '⭐', get text() { return t('Kiếm 100 XP trong ngày'); }, metric: 'xp', goal: 100, xp: 30 },
  ];
  function questsFor(day) {
    // Chọn 3 nhiệm vụ cố định theo ngày (luôn có 1 nhiệm vụ ôn tập)
    let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const pick = [QUEST_POOL[h % 2]];
    const rest = QUEST_POOL.slice(2);
    while (pick.length < 3) { h = (h * 1103515245 + 12345) >>> 0; const q = rest[h % rest.length]; if (!pick.includes(q)) pick.push(q); }
    return pick;
  }

  // ---------- Huy hiệu ----------
  const BADGES = [
    { id: 'first', icon: '🐣', get name() { return t('Khởi đầu'); }, get desc() { return t('Ôn thẻ đầu tiên'); }, test: s => s.total.reviews >= 1 },
    { id: 'words50', icon: '📗', get name() { return t('Sổ tay 50'); }, get desc() { return t('Có 50 từ trong sổ'); }, test: (s, c) => c.cards >= 50 },
    { id: 'words200', icon: '📚', get name() { return t('Thư viện nhỏ'); }, get desc() { return t('Có 200 từ trong sổ'); }, test: (s, c) => c.cards >= 200 },
    { id: 'words500', icon: '🏛️', get name() { return t('Bách khoa'); }, get desc() { return t('Có 500 từ trong sổ'); }, test: (s, c) => c.cards >= 500 },
    { id: 'master10', icon: '🧠', get name() { return t('Trí nhớ tốt'); }, get desc() { return t('Thuộc 10 từ'); }, test: (s, c) => c.mastered >= 10 },
    { id: 'master100', icon: '🏆', get name() { return t('Trăm từ vững'); }, get desc() { return t('Thuộc 100 từ'); }, test: (s, c) => c.mastered >= 100 },
    { id: 'streak3', icon: '🔥', get name() { return t('Lửa nhỏ'); }, get desc() { return t('Chuỗi 3 ngày'); }, test: (s, c) => c.streak >= 3 },
    { id: 'streak7', icon: '🌋', get name() { return t('Một tuần bền bỉ'); }, get desc() { return t('Chuỗi 7 ngày'); }, test: (s, c) => c.streak >= 7 },
    { id: 'streak30', icon: '💎', get name() { return t('Kim cương'); }, get desc() { return t('Chuỗi 30 ngày'); }, test: (s, c) => c.streak >= 30 },
    { id: 'rev500', icon: '🚀', get name() { return t('Cỗ máy ôn tập'); }, get desc() { return t('Ôn 500 lượt'); }, test: s => s.total.reviews >= 500 },
    { id: 'perfect5', icon: '💯', get name() { return t('Hoàn hảo'); }, get desc() { return t('5 bài luyện tập đạt 100%'); }, test: s => s.total.perfect >= 5 },
    { id: 'speaker', icon: '🎙️', get name() { return t('Phát âm chuẩn'); }, get desc() { return t('Phát âm đúng 50 từ'); }, test: s => s.total.spoken >= 50 },
    { id: 'reader', icon: '📖', get name() { return t('Mọt sách'); }, get desc() { return t('Đọc xong 5 bài đọc'); }, test: s => s.total.readings >= 5 },
    { id: 'speed', icon: '⚡', get name() { return t('Tia chớp'); }, get desc() { return t('Ghép thẻ dưới 25 giây'); }, test: s => s.best.match && s.best.match < 25 },
    { id: 'night', icon: '🦉', get name() { return t('Cú đêm'); }, get desc() { return t('Học sau 22 giờ trong 5 ngày'); }, test: s => (s.total.night || 0) >= 5 },
    { id: 'early', icon: '🐦', get name() { return t('Chim sớm'); }, get desc() { return t('Học trước 7 giờ sáng trong 5 ngày'); }, test: s => (s.total.early || 0) >= 5 },
    { id: 'hunter', icon: '🏹', get name() { return t('Thợ săn từ'); }, get desc() { return t('Học 50 từ mới trong một ngày'); }, test: s => Object.values(s.days).some(x => (x.newWords || 0) >= 50) },
    { id: 'level5', icon: '🎖️', get name() { return t('Cấp 5'); }, get desc() { return t('Đạt cấp độ 5'); }, test: s => levelOf(s.xp).level >= 5 },
    { id: 'level10', icon: '👑', get name() { return t('Cấp 10'); }, get desc() { return t('Đạt cấp độ 10'); }, test: s => levelOf(s.xp).level >= 10 },
  ];

  const EMPTY = () => ({ xp: 0, days: {}, total: { reviews: 0, newWords: 0, quizzes: 0, perfect: 0, matches: 0, spoken: 0, readings: 0, lookups: 0 }, best: {}, badges: {}, questsDone: {} });

  let gameLock = Promise.resolve();
  const Game = {
    LEVEL_TITLES, BADGES, levelOf, questsFor,
    async get() { const s = await Store.get('game', null); return s ? { ...EMPTY(), ...s, total: { ...EMPTY().total, ...s.total } } : EMPTY(); },

    // Ghi nhận hoạt động: Game.track({ reviews: 1, xp: 10 })
    // Mọi thay đổi trạng thái game đi qua một hàng đợi → không mất XP khi gọi đồng thời
    track(delta, ctx) { return (gameLock = gameLock.then(() => Game._track(delta, ctx), () => Game._track(delta, ctx))); },
    mutate(fn) { return (gameLock = gameLock.then(async () => { const s = await Game.get(); await fn(s); await Store.set('game', s); return s; })); },
    async _track(delta, ctx) {
      const s = await Game.get();
      const k = todayKey();
      const d = s.days[k] = s.days[k] || {};
      for (const [m, v] of Object.entries(delta)) {
        if (m === 'xp') continue;
        d[m] = (d[m] || 0) + v;
        if (m in s.total) s.total[m] += v;
      }
      let gained = delta.xp || 0;
      const events = [];
      // Nhiệm vụ
      const done = s.questsDone[k] = s.questsDone[k] || [];
      d.xp = (d.xp || 0) + gained;
      for (const q of questsFor(k)) {
        if (!done.includes(q.id) && (d[q.metric] || 0) >= q.goal) {
          done.push(q.id); gained += q.xp; d.xp += q.xp;
          events.push({ type: 'quest', quest: q });
        }
      }
      const before = levelOf(s.xp).level;
      s.xp += gained;
      const after = levelOf(s.xp).level;
      if (after > before) events.push({ type: 'level', level: after, title: levelOf(s.xp).title });
      if (delta.matchTime && (!s.best.match || delta.matchTime < s.best.match)) s.best.match = delta.matchTime;
      // Thói quen theo giờ học (đếm tối đa 1 lần/ngày): cú đêm 22h–4h, chim sớm 4h–7h
      if (gained > 0) { const h = new Date().getHours(); if ((h >= 22 || h < 4) && !d.night) { d.night = 1; s.total.night = (s.total.night || 0) + 1; } if (h >= 4 && h < 7 && !d.early) { d.early = 1; s.total.early = (s.total.early || 0) + 1; } }
      // Huy hiệu
      if (ctx) for (const b of BADGES) if (!s.badges[b.id] && b.test(s, ctx)) { s.badges[b.id] = Date.now(); events.push({ type: 'badge', badge: b }); }
      // giữ 400 ngày gần nhất
      const keys = Object.keys(s.days).sort(); while (keys.length > 400) delete s.days[keys.shift()];
      Object.keys(s.questsDone).forEach(x => { if (x !== k) delete s.questsDone[x]; });
      await Store.set('game', s);
      return { state: s, gained, events };
    },
  };

  // ---------- Âm thanh (Web Audio, không cần file) ----------
  let actx = null;
  const isMuted = () => (g.Core && g.Core.sfxOff) || (g.App && g.App.state && g.App.state.settings && g.App.state.settings.sfx === false);
  function tone(freqs, dur = 0.09, type = 'sine', vol = 0.08) {
    try {
      if (isMuted()) return;
      actx = actx || new (g.AudioContext || g.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume().catch(() => {});
      let t = actx.currentTime;
      for (const f of freqs) {
        const o = actx.createOscillator(), gn = actx.createGain();
        o.type = type; o.frequency.value = f;
        gn.gain.setValueAtTime(vol, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(gn).connect(actx.destination); o.start(t); o.stop(t + dur);
        t += dur * 0.75;
      }
    } catch (e) { /* trình duyệt chặn âm thanh */ }
  }
  // Rung nhẹ khi trả lời (điện thoại Android) – phản hồi xúc giác như app gốc; tắt cùng hiệu ứng âm thanh
  const rm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const buzz = p => { try { if (navigator.vibrate && matchMedia('(pointer: coarse)').matches && !isMuted() && !rm()) navigator.vibrate(p); } catch (e) { /* bỏ qua */ } };
  const Sfx = {
    correct: () => { tone([660, 880], 0.1, 'triangle'); buzz(35); },
    wrong: () => { tone([294, 247], 0.12, 'sine', 0.05); buzz([50, 40, 50]); }, // sai: âm trầm mềm (sine), không gắt
    flip: () => tone([520], 0.05, 'sine', 0.04),
    win: () => tone([523, 659, 784, 1047], 0.12, 'triangle'),
    pop: () => tone([900], 0.04, 'square', 0.03),
  };
  // Hiệu ứng thêm (tap/streak/shimmer/combo) nạp lười trong streak-ui.js qua Sfx.extend; trước khi nạp xong gọi là không làm gì
  for (const k of ['tap', 'streak', 'shimmer', 'combo']) Sfx[k] = () => {};
  Sfx.extend = f => { const o = f(tone, buzz); for (const k of Sfx.locked || []) delete o[k]; Object.assign(Sfx, o); }; // khóa: lớp game feel đã giữ âm này
  // 🎮 Lớp "game feel" (PILOT sau cờ, mặc định TẮT – docs/GAME-FEEL.md): ?feel=1 bật / ?feel=0 tắt, nhớ trong vb.feel; chỉ khi bật mới nạp js/feel.js
  try {
    const m = /[?&#]feel=([01])/.exec(g.location.search + g.location.hash);
    if (m) g.localStorage.setItem('vb.feel', m[1]);
    if (g.localStorage.getItem('vb.feel') === '1' && g.document) { const s = g.document.createElement('script'), me = g.document.querySelector('script[src*="js/game.js"]'); s.src = (me ? me.getAttribute('src').replace(/game\.js.*$/, '') : 'js/') + 'feel.js'; s.defer = true; g.document.head.appendChild(s); }
  } catch (e) { /* không có localStorage → giữ tiếng bíp cũ */ }

  // ---------- Phản hồi trả lời dùng chung cho MỌI bề mặt luyện tập (một chỗ duy nhất, không chép lại) ----------
  // Sfx.answer(ok, { el, answer, badge, exam }) → âm + rung (tắt cùng cài đặt âm thanh) + nảy/rung nhẹ el (tắt khi giảm chuyển động)
  //   + đọc cho trình đọc màn hình (aria-live) + chuỗi đúng liền 3/5/10/15… (Sfx.combo + huy hiệu nhỏ, gói lười streak+lfx). exam: im lặng.
  // Sfx.finish({ pct, xp, el, ms, good, exam }) → âm thắng + pháo giấy (≥ good, mặc định 80%) + 4 thẻ số liệu (độ chính xác, XP, thời gian, chuỗi ngày) vào el.
  let run = 0, t0 = Date.now(), at = '';
  const tt = (k, v) => (g.t ? g.t(k, v) : k);
  const route = () => { const h = g.location ? String(g.location.hash).split('?')[0] : ''; if (h !== at) { at = h; run = 0; t0 = Date.now(); } };
  const say = m => {
    if (typeof document === 'undefined' || !document.body) return;
    let r = document.getElementById('fxLive');
    if (!r) { r = document.createElement('div'); r.id = 'fxLive'; r.className = 'sr-only'; r.setAttribute('aria-live', 'polite'); r.setAttribute('role', 'status'); document.body.appendChild(r); }
    r.textContent = ''; setTimeout(() => { r.textContent = m; }, 40);
  };
  const lazy = (...b) => (g.App && g.App.need ? g.App.need(...b) : Promise.resolve());
  Sfx.answer = (ok, o = {}) => {
    if (o.exam) return 0;
    route(); ok ? Sfx.correct() : Sfx.wrong();
    const el = o.el, c = ok ? 'ans-bounce' : 'ans-shake';
    if (el && el.classList && !rm()) { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); setTimeout(() => el.classList.remove(c), 500); }
    say(ok ? tt('Chính xác!') : o.answer ? `${tt('Chưa đúng')}. ${tt('Đáp án')}: ${o.answer}` : tt('Chưa đúng'));
    run = ok ? run + 1 : 0;
    const n = run;
    if (ok && (n === 3 || n === 5 || (n >= 10 && n % 5 === 0))) lazy('streak', 'lfx').then(() => { Sfx.combo(n); if (o.badge !== false && g.LessonFx && g.LessonFx.comboBadge) g.LessonFx.comboBadge(n, el); }).catch(() => {});
    return n;
  };
  Sfx.finish = (o = {}) => {
    route(); const ms = Date.now() - t0; run = 0; t0 = Date.now();
    if (o.exam) return;
    if (o.pct >= (o.good || 80)) { Sfx.win(); confetti(o.pct >= 100 ? 140 : 90); }
    if (o.el) lazy('lfx').then(() => g.LessonFx && g.LessonFx.stats && g.LessonFx.stats(o.el, { ms, ...o })).catch(() => {});
  };

  // ---------- Pháo giấy ----------
  function confetti(n = 120) {
    if (typeof document === 'undefined') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { // giảm chuyển động: KHÔNG pháo giấy bay – chỉ Kit "win" đứng yên hiện/mờ (đổi độ mờ, không dịch chuyển) cho mốc lớn
      if (n < 80 || !g.Kit) return;
      const k = document.createElement('div'); k.className = 'cele-still'; k.setAttribute('aria-hidden', 'true'); k.innerHTML = g.Kit.svg('win', 88, false);
      document.body.appendChild(k); requestAnimationFrame(() => k.classList.add('on')); setTimeout(() => k.classList.remove('on'), 1100); setTimeout(() => k.remove(), 1500);
      return;
    }
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
    document.body.appendChild(c);
    let ctx = null; try { ctx = c.getContext('2d'); } catch (e) { /* không có canvas */ }
    if (!ctx) { c.remove(); return; }
    const W = c.width = innerWidth * devicePixelRatio, H = c.height = innerHeight * devicePixelRatio;
    const colors = (g.Kit && g.Kit.palette) || ['#E5502F', '#FFB054', '#FFC94A', '#2FBF71', '#FF8FA3', '#17595A']; // màu thương hiệu từ kit.js (không còn tím/xanh dương lạ)
    const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 26, vy: -Math.random() * 30 - 8, s: (Math.random() * 6 + 5) * devicePixelRatio, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: colors[Math.floor(Math.random() * colors.length)] }));
    let f = 0;
    (function step() {
      ctx.clearRect(0, 0, W, H);
      for (const p of ps) {
        p.vy += 1.1; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
      }
      if (++f < 110) requestAnimationFrame(step); else c.remove();
    })();
  }

  g.Game = Game; g.Sfx = Sfx; g.confetti = confetti;
})(typeof self !== 'undefined' ? self : this);
