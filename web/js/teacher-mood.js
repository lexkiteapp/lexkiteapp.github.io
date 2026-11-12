/* 🎭 TeacherMood – một trạng thái cảm xúc giáo viên cho cả app (spec upgrade-2026-11 Đợt 2 #3, cổng scripts/test/teacher-mood.mjs). Tư thế Chars + Chars.POSE_EMO.
 * Đứng yên ≥ 45 s trên màn có giáo viên → gợi ý chữ 1 lần/màn, ≤ 3/ngày, không tiếng, không khi tab ẩn/hộp thoại/đang gõ; lớp cố định → CLS 0. */
(function (g) {
  const RULES = { answer: (s, d) => (d.ok ? (s.ok++, (s.bad = 0), 'cheer') : (s.bad++, (s.ok = 0), s.bad > 1 ? 'encourage' : 'concern')), streak: () => 'laugh', streakLost: () => 'empathy', idle: () => 'encourage' };
  const machine = () => { const s = { ok: 0, bad: 0 }; return { feed(type, d = {}) { const r = RULES[type]; if (!r) return null; const p = r(s, d); return { type, pose: p, emo: ((g.Chars || {}).POSE_EMO || {})[p] || p }; }, state: () => ({ ...s }) }; };
  const M = machine(), subs = new Set(), tell = m => subs.forEach(f => { try { f(m); } catch (e) { /* bỏ qua */ } });
  const emit = (type, d) => { const m = M.feed(type, d); if (m) tell(m); return m; };
  const api = g.TeacherMood = { machine, emit, on: f => (subs.add(f), () => subs.delete(f)), state: M.state, IDLE: 45000 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  const D = g.document; if (!D || !g.addEventListener) return;
  const day = () => new Date().toDateString(), seen = new Set(); let tm = 0, el = null, hideT = 0;
  const used = () => { try { const v = JSON.parse(localStorage.getItem('lk.moodHint') || '{}'); return v.d === day() ? v.n : 0; } catch (e) { return 0; } };
  const busy = () => D.hidden || D.querySelector('#modal:not([hidden]), dialog[open]') || (/^(INPUT|TEXTAREA)$/.test((D.activeElement || {}).tagName) && D.activeElement.value);
  const hide = () => { clearTimeout(hideT); if (el && !el.hidden) { el.hidden = true; tell({ type: 'calm' }); } };
  function fire() {
    const k = (g.location.hash || '#/').split('?')[0]; if (seen.has(k) || !D.querySelector('#view .tslot, #view .tch') || busy() || used() >= 3) return;
    seen.add(k); try { localStorage.setItem('lk.moodHint', JSON.stringify({ d: day(), n: used() + 1 })); } catch (e) { /* bỏ qua */ }
    if (!el) { el = D.createElement('div'); el.className = 'tm-hint'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); D.body.appendChild(el);
      D.head.insertAdjacentHTML('beforeend', '<style>.tm-hint{position:fixed;z-index:60;left:50%;top:calc(env(safe-area-inset-top,0px) + 72px);transform:translateX(-50%);max-width:min(92vw,420px);padding:10px 16px;border-radius:16px;background:var(--surface-2);color:var(--text);border:1px solid var(--line-2);box-shadow:0 6px 20px rgb(0 0 0/.16);font:600 14px/1.4 inherit;text-align:center;pointer-events:none}.tm-hint[hidden]{display:none}@media (prefers-reduced-motion:no-preference){.tm-hint{animation:tm-in .2s ease-out both}@keyframes tm-in{from{opacity:0}}}</style>'); }
    el.textContent = '💡 ' + (g.t ? g.t('Cần giúp không? Cứ thử nhé – sai cũng không sao, mình học từ đó.') : ''); el.hidden = false; emit('idle'); hideT = setTimeout(hide, 8000);
  }
  const arm = () => { clearTimeout(tm); hide(); if (!D.hidden) tm = setTimeout(fire, api.IDLE); };
  for (const e of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'input']) g.addEventListener(e, arm, { capture: true, passive: true });
  g.addEventListener('hashchange', arm); D.addEventListener('visibilitychange', arm); api.arm = arm; arm();
})(typeof self !== 'undefined' ? self : this);
