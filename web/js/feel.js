/* 🎮 Lớp "game feel" (PILOT, sau cờ – mặc định TẮT; bật: thêm ?feel=1 vào URL, tắt: ?feel=0). Tài liệu + cách duyệt: docs/GAME-FEEL.md
 * Nạp lười bởi game.js chỉ khi cờ bật → 0 byte vào khung app. Một module duy nhất cho:
 * (1) Âm thanh thật từ web/sfx/*.mp3 (tự tổng hợp, CC0, ~22 KB cả gói, tải sau lần chạm đầu) thay tiếng bíp – vẫn qua Sfx.* nên MỌI bề mặt cùng
 *     tắt theo settings.sfx; chưa giải mã xong thì dùng tiếng bíp cũ (không bao giờ im lặng sai chỗ). Rung giữ nguyên buzz() của game.js.
 * (2) Chuyển động (Web Animations, ≤ 200 ms cho chuyển màn): Feel.count (XP đếm lên) · Feel.fill (thanh tiến độ chạy) · Feel.swap (chuyển màn)
 *     · Feel.combo (nhịp combo). prefers-reduced-motion → nhảy thẳng tới giá trị cuối, không dịch chuyển/không nảy (chỉ đổi độ mờ ≤ 120 ms). */
(function (g) {
  'use strict';
  const Sfx = g.Sfx; if (!Sfx || g.Feel) return;
  const rm = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const muted = () => (g.Core && g.Core.sfxOff) || (g.App && g.App.state && g.App.state.settings && g.App.state.settings.sfx === false);
  const NAMES = ['tap', 'correct', 'wrong', 'combo', 'complete', 'streak'], VOL = { tap: 0.35, wrong: 0.6, complete: 0.8 };
  const base = (() => { const s = g.document && g.document.querySelector('script[src*="js/game.js"]'); return s ? s.getAttribute('src').replace(/js\/game\.js.*$/, '') : ''; })();
  let ctx = null, bus = null, loading = null; const bufs = {};

  function load() {
    if (loading) return loading;
    try { ctx = new (g.AudioContext || g.webkitAudioContext)(); bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(ctx.destination); } catch (e) { return (loading = Promise.resolve()); }
    loading = Promise.all(NAMES.map(n => fetch(base + 'sfx/' + n + '.mp3').then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
      .then(a => new Promise((ok, no) => ctx.decodeAudioData(a, ok, no))).then(b => { bufs[n] = b; }).catch(() => {})));
    return loading;
  }
  // Tải sau lần chạm đầu (trình duyệt chỉ cho phát âm sau cử chỉ người dùng) – không tốn băng thông khi chưa ai bấm
  const kick = () => { load(); if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {}); };
  g.addEventListener('pointerdown', kick, { once: true, capture: true, passive: true });
  g.addEventListener('keydown', kick, { once: true, capture: true });

  function play(n, o = {}) {
    if (muted()) return true;               // tắt tiếng = coi như đã xử lý (không rơi về tiếng bíp)
    const b = bufs[n]; if (!b || !ctx) return false;
    try {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const s = ctx.createBufferSource(), v = ctx.createGain();
      s.buffer = b; s.playbackRate.value = o.rate || 1; v.gain.value = (o.vol == null ? VOL[n] || 0.7 : o.vol);
      s.connect(v).connect(bus); s.start(); return true;
    } catch (e) { return false; }
  }

  // Ghi đè âm của Sfx: phát file; chưa giải mã xong → tiếng bíp cũ (cùng công thức game.js/streak-ui.js). Rung giữ nguyên.
  // Sfx.locked: streak-ui.js nạp sau không được ghi đè lại các khóa này.
  const semi = n => Math.pow(2, Math.min(7, Math.max(0, ((n || 3) - 3) / 2)) / 12); // combo càng dài cao độ càng lên (tối đa +7 bán cung)
  Sfx.extend((tone, buzz) => {
    const MAP = {
      correct: ['correct', 35, () => tone([660, 880], 0.1, 'triangle')],
      wrong: ['wrong', [50, 40, 50], () => tone([294, 247], 0.12, 'sine', 0.05)],
      win: ['complete', 0, () => tone([523, 659, 784, 1047], 0.12, 'triangle')],
      tap: ['tap', 8, () => tone([480], 0.04, 'sine', 0.03)],
      combo: ['combo', 10, () => tone([660, 825], 0.08, 'triangle', 0.05), semi],
      streak: ['streak', 0, () => tone([523, 659, 784, 1047], 0.08, 'triangle', 0.06)],
    };
    const out = {};
    for (const k in MAP) { const [n, p, fb, rate] = MAP[k]; out[k] = (...a) => { if (!play(n, { rate: rate ? rate(...a) : 1 })) fb(); if (p) buzz(p); }; }
    return out;
  });
  Sfx.locked = ['correct', 'wrong', 'win', 'tap', 'combo', 'streak'];

  // ---------- Chuyển động ----------
  const EASE = 'cubic-bezier(.2,.9,.3,1)', OUT = 'cubic-bezier(.2,0,0,1)';
  const anim = (el, k, o) => (el && el.animate ? el.animate(k, o) : null);
  const fmt = v => { try { return Math.round(v).toLocaleString(g.document.documentElement.lang || undefined); } catch (e) { return String(Math.round(v)); } };
  const Feel = {
    on: true, play, load,
    // XP đếm lên (ví dụ +12 → 1 240 → 1 252). Trình đọc màn hình chỉ nghe số cuối (aria-live không đổi liên tục).
    count(el, to, o = {}) {
      if (!el) return Promise.resolve();
      const from = o.from == null ? parseFloat(String(el.textContent).replace(/[^\d.-]/g, '')) || 0 : o.from, ms = o.ms || 700, pre = o.prefix || '', end = () => { el.textContent = pre + fmt(to); };
      if (rm() || from === to) { end(); return Promise.resolve(); }
      el.setAttribute('aria-hidden', 'true'); const t0 = performance.now();
      return new Promise(res => {
        const step = now => { const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = pre + fmt(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); else { end(); el.removeAttribute('aria-hidden'); if (o.pop !== false) anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }], { duration: 180, easing: EASE }); res(); } };
        requestAnimationFrame(step);
      });
    },
    // Thanh tiến độ chạy tới pct (0–100). Dùng scaleX trên lớp tô (không đổi layout); bar giữ role/aria-valuenow đúng ngay lập tức.
    fill(bar, pct, o = {}) {
      if (!bar) return null; const v = Math.max(0, Math.min(100, pct)), fillEl = o.fill || bar.firstElementChild || bar, prev = parseFloat(fillEl.style.width) || 0;
      if (bar.hasAttribute('aria-valuenow')) bar.setAttribute('aria-valuenow', String(Math.round(v)));
      fillEl.style.width = v + '%';
      if (rm() || !prev) return null;
      return anim(fillEl, [{ transform: `scaleX(${prev / (v || 1)})`, transformOrigin: 'left' }, { transform: 'scaleX(1)', transformOrigin: 'left' }], { duration: o.ms || 400, easing: EASE });
    },
    // Chuyển màn ≤ 200 ms: dùng View Transitions khi có (cùng tài liệu), nếu không thì mờ-ra/mờ-vào bằng Web Animations
    swap(update, el) {
      const d = g.document;
      if (rm()) { if (!el) return Promise.resolve(update()); return Promise.resolve(update()).then(() => anim(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 120 })); }
      if (d.startViewTransition && !el) return d.startViewTransition(update).finished.catch(() => {});
      const box = el || d.querySelector('main') || d.body;
      return Promise.resolve(update()).then(() => anim(box, [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 180, easing: OUT }));
    },
    // Combo: thẻ nảy + vòng sáng tỏa ra; n càng lớn vòng càng đậm. Âm đã do Sfx.combo phát.
    combo(el, n) {
      if (!el || rm()) return;
      anim(el, [{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 200, easing: EASE });
      const r = g.document.createElement('span'), cs = getComputedStyle(el);
      r.setAttribute('aria-hidden', 'true');
      r.style.cssText = `position:absolute;inset:0;border-radius:${cs.borderRadius};pointer-events:none;box-shadow:0 0 0 3px var(--color-primary,#FFB054)`;
      if (cs.position === 'static') el.style.position = 'relative';
      el.appendChild(r);
      const a = anim(r, [{ opacity: Math.min(1, 0.5 + n / 20), transform: 'scale(1)' }, { opacity: 0, transform: 'scale(1.18)' }], { duration: 450, easing: OUT });
      if (a) a.onfinish = () => r.remove(); else r.remove();
    },
  };
  g.Feel = Feel;
})(self);
