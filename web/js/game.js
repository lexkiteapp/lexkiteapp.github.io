/* Gamification kiểu Duolingo: XP, cấp độ, nhiệm vụ ngày, huy hiệu, hiệu ứng & âm thanh. */
(function (g) {
  const t = (typeof self !== 'undefined' && self.t) || ((s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => (v[k] != null ? v[k] : m)) : s));
  const { Store, todayKey } = g.Core;

  const LEVEL_TITLES = () => [t('Người mới'), t('Tập sự'), t('Chăm chỉ'), t('Tiến bộ'), t('Vững vàng'), 'Band 6.0', 'Band 6.5', 'Band 7.0', 'Band 7.5', 'Band 8.0', 'Band 8.5', t('Bậc thầy'), t('Huyền thoại')];
  function levelOf(xp) {
    let lvl = 1, need = 100, rest = xp;
    while (rest >= need) { rest -= need; lvl++; need += 50; }
    const L = LEVEL_TITLES();
    return { level: lvl, into: rest, need, title: L[Math.min(lvl - 1, L.length - 1)] };
  }

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
    let h = 0; for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const pick = [QUEST_POOL[h % 2]];
    const rest = QUEST_POOL.slice(2);
    while (pick.length < 3) { h = (h * 1103515245 + 12345) >>> 0; const q = rest[h % rest.length]; if (!pick.includes(q)) pick.push(q); }
    return pick;
  }

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

  const XPR = { pick: 2, type: 3, write: 4, say: 3, hard: 3, set: 10, exam: 40, sec: 30, perfect: 5, min: 5, talk: 10, essay: 20, learn: 20, day: 15, step: 2, card: [2, 5, 8], great: 85, pass: 65, cap: 150, game: 40 };
  function xpFor(kind, r = {}) {
    const n = Math.max(0, r.right | 0), tot = r.total | 0, per = XPR[r.mode] || XPR.pick, h = Math.min(r.hints | 0, n), sc = r.score;
    const full = tot >= 3 && n >= tot ? XPR.perfect : 0;
    const x = kind === 'answer' ? per + (r.hard ? XPR.hard : 0)
      : kind === 'say' ? (sc == null ? XPR.say : sc >= XPR.great ? 5 : sc >= XPR.pass ? 3 : 0)
      : kind === 'card' ? XPR.card[r.again ? 0 : r.isNew ? 2 : 1]
      : kind === 'talk' ? Math.max(XPR.min, XPR.talk + XPR.say * n - h)
      : kind === 'essay' || kind === 'learn' || kind === 'day' ? XPR[kind]
      : kind === 'output' ? Math.min(60, Math.round((+r.words || 0) / 5))
      : kind === 'exam' ? XPR.exam + per * n + XPR.sec * (r.sections | 0) + full
      : kind === 'set' || kind === 'game' ? Math.max(XPR.min, XPR.set + (r.paid ? 0 : per * n) + full - h)
      : XPR.step;
    return Math.min(kind === 'game' ? XPR.game : XPR.cap, Math.max(0, Math.round(x))); // game: trần 40
  }
  /** Tuần này (thứ 2 → CN) cho thẻ chuỗi ngày: `on[i]` = đã học ngày i (hôm nay tính luôn vì bài vừa xong), `today` = chỉ số hôm nay, `n` = số ngày học trong tuần,
   *  `days` = Date từng ngày (màn kết gắn nhãn thứ; dùng chung bài học + game-end.js). Khác `streak` (chuỗi LIỀN tới hôm nay): 2/7 ngày học trong tuần có thể là chuỗi 1 – hai số tách nhãn, không mâu thuẫn. */
  function weekDots(act, now, keyOf) {
    const d0 = new Date(now), mon = new Date(d0); mon.setDate(d0.getDate() - ((d0.getDay() + 6) % 7));
    const days = [], on = [];
    for (let i = 0; i < 7; i++) { const x = new Date(mon); x.setDate(mon.getDate() + i); days.push(x); on.push(keyOf(x) === keyOf(d0) || !!(act && act.has(keyOf(x)))); }
    return { on, days, today: (d0.getDay() + 6) % 7, n: on.filter(Boolean).length };
  }
  /** Chuỗi liền kết thúc hôm nay (hôm nay tính nếu vừa học) trong tập ngày học – dùng khi App.streak() chưa cập nhật */
  const runOf = (act, now, keyOf) => { let n = 0; const d = new Date(now); while (n < 4000 && (n === 0 || (act && act.has(keyOf(d))))) { n++; d.setDate(d.getDate() - 1); if (!(act && act.has(keyOf(d)))) break; } return n; };
  const repCut = (x, c) => (c >= 5 ? Math.min(x, XPR.step) : c >= 3 ? Math.round(x / 2) : x);

  const EMPTY = () => ({ xp: 0, days: {}, total: { reviews: 0, newWords: 0, quizzes: 0, perfect: 0, matches: 0, spoken: 0, readings: 0, lookups: 0 }, best: {}, badges: {}, questsDone: {} });

  let gameLock = Promise.resolve();
  const Game = {
    LEVEL_TITLES, BADGES, levelOf, questsFor, XPR, xpFor, repCut, weekDots, runOf,
    async get() { const s = await Store.get('game', null); return s ? { ...EMPTY(), ...s, total: { ...EMPTY().total, ...s.total } } : EMPTY(); },

    track(delta, ctx) { return (gameLock = gameLock.then(() => Game._track(delta, ctx), () => Game._track(delta, ctx))); },
    mutate(fn) { return (gameLock = gameLock.then(async () => { const s = await Game.get(); await fn(s); await Store.set('game', s); return s; })); },
    async _track(delta, ctx) {
      const s = await Game.get();
      const k = todayKey();
      const d = s.days[k] = s.days[k] || {};
      for (const [m, v] of Object.entries(delta)) {
        if (m === 'xp' || m === 'src') continue;
        d[m] = (d[m] || 0) + v;
        if (m in s.total) s.total[m] += v;
      }
      let gained = delta.xp || 0;
      if (delta.src && gained) {
        const rp = await Store.get('xprep', null), q = rp && rp.k === k ? rp : { k, m: {} }, c = q.m[delta.src] = (q.m[delta.src] || 0) + 1;
        gained = delta.xp = repCut(gained, c); await Store.set('xprep', q); // sửa delta.xp → App.reward hiện số đã cắt
      }
      const events = [];
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
      if (delta.blitzScore && delta.blitzScore > (s.best.blitz || 0)) s.best.blitz = delta.blitzScore;
      if (gained > 0) { const h = new Date().getHours(); if ((h >= 22 || h < 4) && !d.night) { d.night = 1; s.total.night = (s.total.night || 0) + 1; } if (h >= 4 && h < 7 && !d.early) { d.early = 1; s.total.early = (s.total.early || 0) + 1; } }
      if (ctx) for (const b of BADGES) if (!s.badges[b.id] && b.test(s, ctx)) { s.badges[b.id] = Date.now(); events.push({ type: 'badge', badge: b }); }
      const keys = Object.keys(s.days).sort(); while (keys.length > 400) delete s.days[keys.shift()];
      Object.keys(s.questsDone).forEach(x => { if (x !== k) delete s.questsDone[x]; });
      await Store.set('game', s);
      return { state: s, gained, events };
    },
  };

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
  const rm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const hapOn = () => { try { return g.localStorage.getItem('vb.haptics') !== '0'; } catch (e) { return true; } };
  const buzz = p => { try { if (navigator.vibrate && hapOn() && matchMedia('(pointer: coarse)').matches && !isMuted() && !rm()) navigator.vibrate(p); } catch (e) { /* bỏ qua */ } };
  const HAPTIC = { tap: 8, soft: 12, swipe: 15, correct: 35, wrong: [50, 40, 50], streak: [30, 40, 70], done: [30, 40, 70, 60, 110], badge: [20, 30, 50] };
  const daypart = () => { try { const h = new Date().getHours(), d = h < 11 ? 'morning' : h < 18 ? 'noon' : 'evening'; if (g.document.documentElement.dataset.daypart !== d) g.document.documentElement.dataset.daypart = d; return d; } catch (e) { return 'noon'; } };
  daypart(); try { g.document.addEventListener('visibilitychange', () => { if (!g.document.hidden) daypart(); }); } catch (e) { /* bỏ qua */ }
  const Sfx = {
    correct: () => { tone([660, 880], 0.1, 'triangle'); buzz(35); },
    wrong: () => { tone([294, 247], 0.12, 'sine', 0.05); buzz([50, 40, 50]); },
    flip: () => tone([520], 0.05, 'sine', 0.04),
    win: () => { tone([523, 659, 784, 1047], 0.12, 'triangle'); buzz(HAPTIC.done); },
    pop: () => tone([900], 0.04, 'square', 0.03),
  };
  for (const k of ['tap', 'streak', 'shimmer', 'combo']) Sfx[k] = () => {};
  Sfx.haptic = ev => buzz(HAPTIC[ev] || HAPTIC.soft);
  Sfx.muted = isMuted;
  Sfx.bubble = () => { if (isMuted()) return; try { const a = new Audio('sfx/pop.mp3'); a.dataset.lkMix = '1'; a.volume = 0.6; const p = a.play(); if (p && p.catch) p.catch(() => {}); } catch (e) { /* chặn tự phát */ } };
  Sfx.haptics = on => { if (on === undefined) return hapOn(); try { g.localStorage.setItem('vb.haptics', on ? '1' : '0'); } catch (e) { /* bỏ qua */ } if (on) buzz(HAPTIC.correct); return !!on; };
  Sfx.HAPTIC = HAPTIC; Sfx.daypart = daypart;
  Sfx.extend = f => { const o = f(tone, buzz); for (const k of Sfx.locked || []) delete o[k]; Object.assign(Sfx, o); };
  const feelGet = () => { try { return g.localStorage.getItem('vb.feel') !== '0'; } catch (e) { return true; } };
  const feelLoad = () => { if (g.Feel || !g.document || !g.document.createElement || !g.document.head || !g.document.getElementById || g.document.getElementById('feelJs')) return; const s = g.document.createElement('script'), me = g.document.querySelector('script[src*="js/game.js"]'); s.id = 'feelJs'; s.src = (me ? me.getAttribute('src').replace(/game\.js.*$/, '') : 'js/') + 'feel.js'; s.defer = true; g.document.head.appendChild(s); };
  Sfx.feel = on => {
    if (on === undefined) return feelGet();
    try { g.localStorage.setItem('vb.feel', on ? '1' : '0'); } catch (e) { /* bỏ qua */ }
    if (g.Feel) g.Feel.set(!!on); else if (on) feelLoad();
    return !!on;
  };
  try { const m = g.location && /[?&#]feel=([01])/.exec(g.location.search + g.location.hash); if (m) g.localStorage.setItem('vb.feel', m[1]); } catch (e) { /* bỏ qua */ }
  if (feelGet()) feelLoad();

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

  function confetti(n = 120) {
    if (typeof document === 'undefined') return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
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
    const colors = (g.Kit && g.Kit.palette) || ['#E5502F', '#FFB054', '#FFC94A', '#2FBF71', '#FF8FA3', '#17595A'];
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
