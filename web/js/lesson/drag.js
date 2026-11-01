/* Kéo-thả ô chữ cho bài xếp câu (build/tr) – docs/specs/sentence-builder.md.
 * Chạm vẫn như cũ (click do ui.js xử lý); kéo (pointer events: chuột + cảm ứng) để chèn vào vị trí bất kỳ, đổi chỗ, kéo ra ngoài để gỡ.
 * Bàn phím trên ô đã xếp: ←/→ đổi chỗ, Delete/Backspace gỡ; thông báo qua vùng aria-live. Tôn trọng prefers-reduced-motion (CSS). */
(function (g) {
  const MOVE = 6; // px: dưới ngưỡng = chạm, không phải kéo
  /** Đặt ô `tile` vào vị trí `idx` của thứ tự (bỏ chỗ cũ nếu đã có) */
  function insertAt(order, tile, idx) {
    const o = order.filter(x => x !== tile), i = Math.max(0, Math.min(o.length, idx));
    o.splice(i, 0, tile); return o;
  }
  /** Vị trí chèn theo tọa độ con trỏ: rects = [{left, top, width, height}] của các ô đã xếp (theo thứ tự, đã bỏ ô đang kéo) */
  function slotIndex(rects, x, y) {
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i], midX = r.left + r.width / 2;
      if (y < r.top) return i; // dòng trên dòng của ô này
      if (y <= r.top + r.height && x < midX) return i;
    }
    return rects.length;
  }
  function near(el, x, y, pad) { const r = el.getBoundingClientRect(); return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; }

  /** o = { ans, bank, get: () => thứ tự hiện tại (mảng chỉ số ô), set: thứ tự mới → vẽ lại, locked: () => đã chấm?, word: i => chữ của ô i, say: chuỗi → aria-live, t } */
  function bind(o) {
    let d = null, skipClick = false;
    const tiles = () => [...o.ans.querySelectorAll('.lsn-tile')];
    const end = () => { if (!d) return; if (d.ghost) d.ghost.remove(); if (d.caret) d.caret.remove(); if (d.el) d.el.classList.remove('lsn-dragsrc'); o.ans.classList.remove('lsn-dropok'); d = null; };
    const down = e => {
      const el = e.target.closest('.lsn-tile'); if (!el || o.locked() || (e.button != null && e.button > 0)) return;
      const fromAns = o.ans.contains(el), tile = fromAns ? +el.dataset.a : +el.dataset.i;
      if (!fromAns && o.get().includes(tile)) return; // ô đã dùng trong ngân hàng
      d = { el, tile, fromAns, x0: e.clientX, y0: e.clientY, on: false, id: e.pointerId };
    };
    const move = e => {
      if (!d || e.pointerId !== d.id) return;
      if (!d.on) {
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < MOVE) return;
        d.on = true; const r = d.el.getBoundingClientRect();
        d.dx = d.x0 - r.left; d.dy = d.y0 - r.top;
        d.ghost = d.el.cloneNode(true); d.ghost.removeAttribute('id'); d.ghost.classList.add('lsn-ghost'); d.ghost.setAttribute('aria-hidden', 'true');
        d.ghost.style.width = r.width + 'px'; document.body.appendChild(d.ghost);
        d.el.classList.add('lsn-dragsrc');
        d.caret = document.createElement('span'); d.caret.className = 'lsn-caret'; d.caret.setAttribute('aria-hidden', 'true');
        try { d.el.setPointerCapture(d.id); } catch (err) { /* bỏ qua */ }
      }
      e.preventDefault();
      d.ghost.style.transform = `translate(${e.clientX - d.dx}px, ${e.clientY - d.dy}px)`;
      const inAns = near(o.ans, e.clientX, e.clientY, 24);
      o.ans.classList.toggle('lsn-dropok', inAns); d.ghost.classList.toggle('lsn-out', !inAns && d.fromAns);
      if (inAns) {
        const els = tiles().filter(x => x !== d.el), i = slotIndex(els.map(x => x.getBoundingClientRect()), e.clientX, e.clientY);
        d.idx = i; if (els[i]) o.ans.insertBefore(d.caret, els[i]); else o.ans.appendChild(d.caret);
      } else { d.idx = -1; d.caret.remove(); }
    };
    const up = e => {
      if (!d || e.pointerId !== d.id) return;
      const was = d; end();
      if (!was.on) return; // chạm → để click xử lý như cũ
      skipClick = true; setTimeout(() => { skipClick = false; }, 0);
      const cur = o.get();
      if (was.idx >= 0) { o.set(insertAt(cur, was.tile, was.idx)); o.say(o.t('{w}: vị trí {n}/{m}', { w: o.word(was.tile), n: insertAt(cur, was.tile, was.idx).indexOf(was.tile) + 1, m: insertAt(cur, was.tile, was.idx).length })); }
      else if (was.fromAns) { o.set(cur.filter(x => x !== was.tile)); o.say(o.t('Đã gỡ {w}', { w: o.word(was.tile) })); }
    };
    const click = e => { if (skipClick) { e.stopPropagation(); e.preventDefault(); skipClick = false; } };
    const key = e => {
      const el = e.target.closest('.lsn-tile'); if (!el || o.locked()) return;
      const tile = +el.dataset.a, cur = o.get(), i = cur.indexOf(tile); if (i < 0) return;
      let nx = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const j = i + ((e.key === 'ArrowLeft') !== (getComputedStyle(o.ans).direction === 'rtl') ? -1 : 1); if (j < 0 || j >= cur.length) return; nx = insertAt(cur, tile, j); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { nx = cur.filter(x => x !== tile); }
      else return;
      e.preventDefault(); o.set(nx);
      const at = nx.indexOf(tile);
      o.say(at < 0 ? o.t('Đã gỡ {w}', { w: o.word(tile) }) : o.t('{w}: vị trí {n}/{m}', { w: o.word(tile), n: at + 1, m: nx.length }));
      const f = at < 0 ? (o.ans.querySelectorAll('.lsn-tile')[Math.min(i, nx.length - 1)] || o.bank.querySelector('.lsn-tile:not(.used)')) : o.ans.querySelector(`.lsn-tile[data-a="${tile}"]`);
      if (f) f.focus();
    };
    [o.ans, o.bank].forEach(c => { c.addEventListener('pointerdown', down); c.addEventListener('click', click, true); });
    document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', end);
    o.ans.addEventListener('keydown', key);
    return { destroy() { end(); document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', end); } };
  }
  g.TileDrag = { bind, insertAt, slotIndex };
})(typeof self !== 'undefined' ? self : globalThis);
