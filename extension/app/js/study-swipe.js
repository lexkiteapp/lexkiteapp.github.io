/* 👆 Vuốt thẻ ôn tập + 🐦 Kit mini theo ngữ cảnh (G2) – tải lười khi mở #/review (App.need('swipe')), ngoài khung app.
   StudySwipe.attach(thẻ, { flipped, graded, commit, labels }) · StudySwipe.kit(el, cảm xúc). Trái = Quên, phải = Nhớ (cả LTR lẫn RTL). */
(function () {
  const CSS = `.flash { touch-action: pan-y; will-change: transform; position: relative; } .flash.swiping { transition: none !important; cursor: grabbing; user-select: none; } .flash.spring-back { transition: transform .24s cubic-bezier(0.175, 0.885, 0.32, 1.275); } .flash.fly { transition: transform .22s ease-out, opacity .22s; opacity: 0; } .flash.sw-good .flash-inner { box-shadow: 0 0 0 4px var(--good) inset, var(--shadow-lg, 0 10px 30px rgba(0,0,0,.12)); } .flash.sw-again .flash-inner { box-shadow: 0 0 0 4px var(--again) inset, var(--shadow-lg, 0 10px 30px rgba(0,0,0,.12)); } .sw-badge { position: absolute; top: 1.25rem; padding: .35rem .85rem; border-radius: 8px; font-size: 1.15rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; pointer-events: none; opacity: 0; transform: scale(0.85); transition: opacity .15s ease, transform .15s ease; z-index: 10; display: inline-flex; align-items: center; gap: .35rem; } .sw-badge-good { right: 1.25rem; color: var(--good); border: 3px solid var(--good); background: rgba(46, 204, 113, 0.14); transform: rotate(10deg); } .sw-badge-again { left: 1.25rem; color: var(--again); border: 3px solid var(--again); background: rgba(235, 87, 87, 0.14); transform: rotate(-10deg); } .flash.sw-good .sw-badge-good { opacity: 1; transform: rotate(10deg) scale(1); } .flash.sw-again .sw-badge-again { opacity: 1; transform: rotate(-10deg) scale(1); } @media (prefers-reduced-motion: reduce) { .flash.fly { transition: none !important; opacity: 1; } .flash.spring-back { transition: none !important; } .sw-badge-good, .sw-badge-again { transform: none !important; } .flash.sw-good .sw-badge-good, .flash.sw-again .sw-badge-again { transform: none !important; } } .study-kit-mini { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; flex-shrink: 0; cursor: pointer; transition: transform .18s ease; border-radius: 50%; background: var(--surface-2, rgba(255, 255, 255, 0.08)); } .study-kit-mini:hover { transform: scale(1.08); } .study-kit-mini svg { width: 34px; height: 34px; display: block; }`;
  const RM = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const style = () => { if (document.getElementById('swipeCss')) return; const s = document.createElement('style'); s.id = 'swipeCss'; s.textContent = CSS; document.head.appendChild(s); };
  const kit = (el, mood) => { if (el && el.isConnected && window.Kit && Kit.svg) el.innerHTML = Kit.svg(mood, 38, !RM()); };
  function attach(fc, o) {
    if (!fc || fc._sw || !window.PointerEvent) return; fc._sw = 1; style();
    const badge = (cls, txt) => { const b = document.createElement('div'); b.className = 'sw-badge ' + cls; b.setAttribute('aria-hidden', 'true'); b.textContent = txt; fc.prepend(b); };
    badge('sw-badge-good', '✓ ' + o.labels[1]); badge('sw-badge-again', '↺ ' + o.labels[0]);
    let x0 = 0, y0 = 0, dx = 0, dy = 0, t0 = 0, pid = null, drag = false, moved = false, axis = null, buzzed = false, done = false;
    const W = () => fc.offsetWidth || 340;
    const passed = () => { const a = Math.abs(dx); return a >= W() * 0.3 || (a >= 40 && a / Math.max(1, Date.now() - t0) > 0.5); };
    const rel = () => { try { if (pid != null && fc.hasPointerCapture && fc.hasPointerCapture(pid)) fc.releasePointerCapture(pid); } catch (_) { /* bỏ qua */ } pid = null; };
    const reset = () => { fc.classList.remove('swiping', 'sw-good', 'sw-again'); fc.style.transform = ''; };
    fc.addEventListener('pointerdown', e => {
      // chỉ vuốt khi đã lật, chưa chấm, nút chính; bỏ qua 24 px sát mép (cử chỉ back iOS/Android)
      if (done || drag || !e.isPrimary || o.graded() || !o.flipped() || (e.button !== undefined && e.button !== 0)) return;
      if (e.target.closest('button, details, textarea, input, a, [data-note], [data-mnem], [data-shadow]')) return;
      const vw = window.innerWidth || document.documentElement.clientWidth || 360;
      if (e.clientX < 24 || e.clientX > vw - 24) return;
      drag = true; moved = false; axis = null; buzzed = false; x0 = e.clientX; y0 = e.clientY; dx = dy = 0; t0 = Date.now(); pid = e.pointerId;
      fc.classList.remove('fly', 'spring-back');
      try { fc.setPointerCapture(pid); } catch (_) { /* bỏ qua */ }
    });
    fc.addEventListener('pointermove', e => {
      if (!drag || e.pointerId !== pid) return;
      dx = e.clientX - x0; dy = e.clientY - y0;
      if (!axis) {
        if (Math.hypot(dx, dy) < 10) return; // khóa trục sau 10 px
        if (Math.abs(dy) > Math.abs(dx)) { axis = 'y'; drag = false; rel(); reset(); return; } // cuộn dọc → nhường trình duyệt (touch-action: pan-y)
        axis = 'x'; fc.classList.add('swiping');
      }
      if (e.cancelable) e.preventDefault();
      moved = true;
      fc.style.transform = `translate3d(${dx}px, ${Math.min(0, dy) * 0.25}px, 0) rotate(${RM() ? 0 : dx / 18}deg)`;
      fc.classList.toggle('sw-good', dx > 40); fc.classList.toggle('sw-again', dx < -40);
      if (!buzzed && passed()) { buzzed = true; try { if (navigator.vibrate) navigator.vibrate(15); } catch (_) { /* bỏ qua */ } }
    });
    const end = e => {
      if (!drag || (e && e.pointerId !== pid)) return;
      drag = false; rel();
      if (axis !== 'x') return reset();
      if (!passed() || o.graded()) { // chưa đủ ngưỡng → bật về
        fc.classList.remove('swiping', 'sw-good', 'sw-again'); fc.classList.add('spring-back'); fc.style.transform = '';
        return setTimeout(() => fc.classList.remove('spring-back'), 240);
      }
      done = true; const good = dx > 0;
      if (RM()) reset();
      else { fc.classList.remove('swiping'); fc.classList.add('fly'); fc.style.transform = `translate3d(${good ? 120 : -120}vw, 0, 0) rotate(${good ? 25 : -25}deg)`; }
      o.commit(good ? 2 : 0); // chấm NGAY (khóa phím/nút/hoàn tác đồng bộ) – study.js chờ hết 220 ms bay rồi mới sang thẻ
    };
    fc.addEventListener('pointerup', end);
    fc.addEventListener('pointercancel', e => { if (e.pointerId !== pid) return; drag = false; rel(); reset(); });
    fc.addEventListener('lostpointercapture', e => { if (drag && e.pointerId === pid) { drag = false; pid = null; reset(); } });
    fc.addEventListener('click', e => { if (moved) { e.stopImmediatePropagation(); moved = false; } }, true); // kéo thì không tính là bấm lật
  }
  window.StudySwipe = { attach, kit };
})();
