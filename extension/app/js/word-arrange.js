/* Xếp câu / xếp từ: một component cho mọi màn (bài học build/tr, ngữ pháp, TOEFL Build a Sentence) – docs/specs/learn-flow-nav.md § Bộ tương tác.
 * • Chạm thẻ ngân hàng → nối cuối câu; chạm thẻ đã đặt → về ĐÚNG ô cũ (ô giữ chỗ).
 * • Kéo (pointer events: chuột + cảm ứng): thả vào GIỮA câu, đổi chỗ, kéo ra để gỡ; Esc hủy. Lúc kéo: bóng thẻ nổi trên điểm thả, vạch chèn + các thẻ hai bên dạt ra bằng transform, không đổi bố cục nên 60 fps và không giật dòng.
 * • Hàng đáp án giữ sẵn chiều cao đủ cho mọi thẻ → thả/gỡ không làm ngân hàng nhảy. Thả xong FLIP mọi thẻ về chỗ mới.
 * • Bàn phím: Enter/Space đặt thẻ rồi focus sang thẻ đó · ←/→ đổi chỗ (theo RTL) · Home/End đầu/cuối · Delete gỡ · Backspace gỡ thẻ cuối · số 1–9 đặt thẻ thứ n · Ctrl/⌘+Z hoàn tác; aria-live đọc vị trí.
 * Hình thẻ do màn vẽ: o.draw() vẽ thẻ đã đặt theo o.get(); thẻ ngân hàng mang data-i, thẻ đã đặt mang data-a. Không đụng logic chấm: màn chỉ đọc o.get(). */
(function (g) {
  const MOVE = 6, NUDGE = 7, EDGE = 56, PAD = 32, HIST = 30, LIFT = 36, OVER = 6; // px: ngưỡng kéo · thẻ dạt · vùng tự cuộn · vùng bắt thả rộng ra quanh hàng đáp án · số bước hoàn tác · bóng nổi trên điểm thả (không che vạch, không bị ngón tay che) · vạch dài quá dòng
  /** Đặt thẻ `tile` vào vị trí `idx` của thứ tự (bỏ chỗ cũ nếu đã có) */
  function insertAt(order, tile, idx) { const a = order.filter(x => x !== tile), i = Math.max(0, Math.min(a.length, idx)); a.splice(i, 0, tile); return a; }
  /** Vị trí chèn theo tọa độ con trỏ: rects = hộp các thẻ đã đặt (theo thứ tự, đã bỏ thẻ đang kéo) */
  function slotIndex(rects, x, y, rtl) {
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i], mid = r.left + r.width / 2;
      if (y < r.top) return i;
      if (y <= r.top + r.height && (rtl ? x > mid : x < mid)) return i;
    }
    return rects.length;
  }
  /** Gom thẻ theo dòng (hàng tự xuống dòng): [{ top, height, ids: [chỉ số trong rects] }] */
  function rowsOf(rects) {
    const rows = [];
    rects.forEach((r, i) => { const l = rows[rows.length - 1]; if (l && Math.abs(l.top - r.top) < r.height / 2) { l.ids.push(i); l.height = Math.max(l.height, r.height); } else rows.push({ top: r.top, height: r.height, ids: [i] }); });
    return rows;
  }
  const reduced = () => { try { return !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  const fly = (el, from) => { if (!el || !from || reduced() || !el.animate) return; const r = el.getBoundingClientRect(), dx = from.left - r.left, dy = from.top - r.top; if (!dx && !dy) return; el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }); };
  const CSS = `.wa-ans{position:relative;align-content:flex-start;--wa-accent:rgb(var(--st-primary))}
.wa-ans [data-a],.wa-bank [data-i]{min-height:44px;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;transition:transform .16s cubic-bezier(.2,.8,.2,1)}
.wa-bank [data-i].used{color:transparent!important;background:rgb(127 127 127/.14)!important;border-color:transparent!important;box-shadow:none!important;cursor:default;pointer-events:none}
.lsn-dragsrc{opacity:.3}
.lsn-ghost{position:fixed;left:0;top:0;z-index:1000;margin:0;pointer-events:none;transition:opacity .12s;cursor:grabbing;box-shadow:0 10px 24px rgb(0 0 0/.3)}
.lsn-ghost.lsn-out{opacity:.55}
.lsn-caret{position:absolute;left:0;top:0;width:4px;border-radius:2px;background:var(--wa-accent,var(--primary));pointer-events:none;transition:transform .1s cubic-bezier(.2,.8,.2,1)}
.wa-live{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.wa-ans [data-a],.wa-bank [data-i],.lsn-ghost,.lsn-caret{transition:none}}`;
  const css = () => { if (document.getElementById('waCss')) return; const s = document.createElement('style'); s.id = 'waCss'; s.textContent = CSS; document.head.appendChild(s); };
  const typing = el => !!el && (el.isContentEditable || /^(TEXTAREA|SELECT|INPUT)$/.test(el.tagName));
  const scrollerOf = el => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) return p; } return null; };

  /** o = { ans, bank, sel = '.lsn-tile', get: () => mảng chỉ số thẻ đã đặt, set: thứ tự mới, draw: () => vẽ lại thẻ đã đặt, locked: () => đã chấm?, word: i => chữ thẻ i,
   *        t, say: chuỗi → aria-live (mặc định vùng riêng), onPlace: thẻ vừa vào câu, onChange: thứ tự mới, scope: nơi bắt phím (mặc định document; nhiều bài trên một trang → khung từng bài),
   *        ltr: false nếu nội dung thẻ không phải tiếng Anh (thẻ tiếng Anh luôn đọc trái → phải, kể cả giao diện RTL) } */
  function bind(o) {
    css();
    const T = (k, v) => (o.t || g.t || (s => s))(k, v), sel = o.sel || '.lsn-tile', scope = o.scope || document, hist = [];
    const rtl = () => { try { return getComputedStyle(o.ans).direction === 'rtl'; } catch (e) { return false; } };
    const placed = () => [...o.ans.querySelectorAll(sel)];
    const bankEl = i => o.bank.querySelector(`${sel}[data-i="${i}"]`), ansEl = i => o.ans.querySelector(`${sel}[data-a="${i}"]`);
    let live = null;
    const say = s => { if (o.say) return o.say(s); if (!live) { live = document.createElement('p'); live.className = 'wa-live'; live.setAttribute('aria-live', 'polite'); o.ans.after(live); } live.textContent = s; };
    const at = (nx, tile) => { const k = nx.indexOf(tile); return k < 0 ? T('Đã gỡ {w}', { w: o.word(tile) }) : T('{w}: vị trí {n}/{m}', { w: o.word(tile), n: k + 1, m: nx.length }); };
    const syncBank = () => { const cur = o.get(); o.bank.querySelectorAll(sel).forEach(b => { const u = cur.includes(+b.dataset.i); b.classList.toggle('used', u); b.disabled = u; }); };
    const render = () => { o.draw(); syncBank(); };
    // Đổi thứ tự + FLIP: mọi thẻ đổi chỗ trượt từ chỗ cũ, thẻ vừa đặt/gỡ bay từ `from`
    const apply = (nx, tile, from) => {
      const before = new Map(placed().map(el => [+el.dataset.a, el.getBoundingClientRect()]));
      o.set(nx); render();
      placed().forEach(el => { if (+el.dataset.a !== tile) fly(el, before.get(+el.dataset.a)); });
      const el = nx.includes(tile) ? ansEl(tile) : bankEl(tile); fly(el, from || before.get(tile));
      say(at(nx, tile)); if (o.onChange) o.onChange(nx); return el;
    };
    const commit = (nx, tile, from) => { hist.push({ order: o.get().slice(), tile }); if (hist.length > HIST) hist.shift(); return apply(nx, tile, from); };
    const place = (tile, idx) => { if (o.locked() || o.get().includes(tile)) return null; const b = bankEl(tile), r = b && b.getBoundingClientRect(); const el = commit(insertAt(o.get(), tile, idx == null ? o.get().length : idx), tile, r); if (o.onPlace) o.onPlace(tile); return el; };
    const remove = tile => { if (o.locked() || !o.get().includes(tile)) return null; const a = ansEl(tile), r = a && a.getBoundingClientRect(); return commit(o.get().filter(x => x !== tile), tile, r); };
    const undo = () => { const h = hist.pop(); if (!h || o.locked()) return null; return apply(h.order, h.tile); };

    // Giữ sẵn chiều cao đủ cho mọi thẻ: thêm/gỡ/kéo không đẩy ngân hàng đi (đo một lần, đo lại khi đổi bề rộng / font tải xong); align-content giữ dòng không giãn theo chiều cao này
    let lastW = -1;
    const reserve = () => {
      const w = o.ans.offsetWidth; if (!o.ans.isConnected || !w || !o.ans.parentNode) return; lastW = w;
      const c = o.ans.cloneNode(false); c.removeAttribute('id'); c.setAttribute('aria-hidden', 'true'); c.style.cssText = `position:absolute;visibility:hidden;left:0;top:0;width:${w}px;min-height:0;height:auto`;
      [...o.ans.children].forEach(x => { if (!x.matches(sel) && !x.matches('.lsn-caret')) c.appendChild(x.cloneNode(true)); });
      o.bank.querySelectorAll(sel).forEach(b => { const n = b.cloneNode(true); n.classList.remove('used'); n.disabled = false; n.removeAttribute('data-i'); c.appendChild(n); });
      o.ans.parentNode.appendChild(c); const h = c.offsetHeight; c.remove(); if (h) o.ans.style.minHeight = h + 'px';
    };
    let roRaf = 0; // đo lại ở khung kế (ngoài lượt gọi của RO): đổi minHeight của chính phần tử đang quan sát ngay trong callback gây "ResizeObserver loop completed with undelivered notifications"
    const ro = g.ResizeObserver ? new ResizeObserver(() => { if (o.ans.offsetWidth !== lastW && !d && !roRaf) roRaf = requestAnimationFrame(() => { roRaf = 0; if (o.ans.offsetWidth !== lastW && !d) reserve(); }); }) : null;

    let d = null, skip = false;
    const off = () => { document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel); document.removeEventListener('contextmenu', noMenu); document.removeEventListener('keydown', esc, true); g.removeEventListener('blur', cancel); };
    const end = () => {
      if (!d) return; off(); if (d.raf) cancelAnimationFrame(d.raf);
      if (d.ghost) d.ghost.remove(); if (d.caret) d.caret.remove(); if (d.el) d.el.classList.remove('lsn-dragsrc');
      if (d.els) d.els.forEach(x => { x.style.transform = ''; });
      o.ans.classList.remove('lsn-dropok'); d = null;
    };
    function cancel() { end(); }
    function noMenu(e) { if (d) e.preventDefault(); }
    function esc(e) { if (e.key !== 'Escape' || !d || !d.on) return; e.preventDefault(); e.stopPropagation(); end(); skip = true; document.addEventListener('pointerup', () => setTimeout(() => { skip = false; }, 60), { once: true }); }
    // Ảnh chụp vị trí các thẻ, tính theo gốc hàng đáp án: kéo chỉ dùng transform nên hộp không đổi; tự cuộn chỉ dời gốc → không đo lại, không giật
    const snap = () => {
      const A = o.ans.getBoundingClientRect(); d.els = placed().filter(x => x !== d.el);
      d.rects = d.els.map(x => { const r = x.getBoundingClientRect(); return { left: r.left - A.left, top: r.top - A.top, width: r.width, height: r.height, right: r.right - A.left, bottom: r.bottom - A.top }; });
      d.rows = rowsOf(d.rects); d.rtl = rtl(); d.key = '';
    };
    // Vạch chèn nằm giữa hai thẻ, đúng dòng con trỏ (cuối dòng trên và đầu dòng dưới là cùng một vị trí, vạch đi theo tay)
    const showCaret = (x, top, height) => {
      const c = d.caret, fresh = !c.isConnected, tr = `translate(${x - 2 - o.ans.clientLeft}px,${top - OVER - o.ans.clientTop}px)`;
      if (fresh) { c.style.transition = 'none'; o.ans.appendChild(c); }
      c.style.height = height + OVER * 2 + 'px'; c.style.transform = tr;
      if (fresh) { void c.offsetWidth; c.style.transition = ''; }
    };
    const update = (x, y) => {
      d.ghost.style.transform = `translate(${Math.max(6, Math.min((g.innerWidth || 1e4) - d.w - 6, x - d.dx))}px,${y - d.dy - LIFT}px) scale(1.06)`; // sát mép màn: bóng vẫn đọc được
      const A = o.ans.getBoundingClientRect(), inAns = x >= A.left - PAD && x <= A.right + PAD && y >= A.top - PAD && y <= A.bottom + PAD;
      o.ans.classList.toggle('lsn-dropok', inAns); d.ghost.classList.toggle('lsn-out', !inAns && d.fromAns);
      const R = d.rects, S = d.rtl ? -1 : 1;
      if (!inAns) { d.idx = -1; d.caret.remove(); if (d.key) { d.els.forEach(el => { el.style.transform = ''; }); d.key = ''; } return; }
      if (!R.length) { d.idx = 0; showCaret(d.rtl ? o.ans.clientWidth - 6 : 6, 6, 44); return; }
      const px = x - A.left, py = y - A.top; let row = d.rows[0];
      d.rows.forEach(r => { if (Math.abs(r.top + r.height / 2 - py) < Math.abs(row.top + row.height / 2 - py)) row = r; });
      const i = slotIndex(R, px, row.top + row.height / 2, d.rtl), last = row.ids[row.ids.length - 1], key = row.ids[0] + ':' + i; d.idx = i;
      if (key === d.key) return; d.key = key;
      // thẻ cùng dòng dạt sang hai bên vạch; thẻ dòng khác đứng yên
      d.els.forEach((el, k) => { el.style.transform = k < row.ids[0] || k > last ? '' : `translateX(${(k < i ? -S : S) * NUDGE}px)`; });
      const edge = (r, side) => (side > 0) === !d.rtl ? r.right : r.left; // mép cuối thẻ (side > 0) hoặc mép đầu thẻ theo chiều đọc
      const cx = i <= row.ids[0] ? edge(R[row.ids[0]], -1) - S : i > last ? edge(R[last], 1) + S : (edge(R[i - 1], 1) + edge(R[i], -1)) / 2;
      showCaret(cx, row.top, row.height);
    };
    const tick = () => {
      if (!d || !d.on) return; d.raf = requestAnimationFrame(tick);
      const y = d.y, h = g.innerHeight || 0, v = y < EDGE ? (y - EDGE) / 5 : y > h - EDGE ? (y - h + EDGE) / 5 : 0; if (!v) return;
      if (d.scr) d.scr.scrollTop += v; else g.scrollBy(0, v);
      update(d.x, d.y);
    };
    function move(e) {
      if (!d || e.pointerId !== d.id) return;
      if (!d.on) {
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < MOVE) return;
        d.on = true; const r = d.el.getBoundingClientRect(); d.dx = d.x0 - r.left; d.dy = d.y0 - r.top; d.w = r.width; snap();
        d.ghost = d.el.cloneNode(true); d.ghost.removeAttribute('id'); d.ghost.classList.add('lsn-ghost'); d.ghost.setAttribute('aria-hidden', 'true'); d.ghost.style.width = r.width + 'px'; document.body.appendChild(d.ghost);
        d.el.classList.add('lsn-dragsrc');
        d.caret = document.createElement('span'); d.caret.className = 'lsn-caret'; d.caret.setAttribute('aria-hidden', 'true');
        try { d.el.setPointerCapture(d.id); } catch (err) { /* bỏ qua */ }
        d.scr = scrollerOf(o.ans); if (g.requestAnimationFrame) d.raf = requestAnimationFrame(tick);
      }
      e.preventDefault(); d.x = e.clientX; d.y = e.clientY; update(d.x, d.y);
    }
    function up(e) {
      if (!d || e.pointerId !== d.id) return;
      const w = d, gr = w.ghost && w.ghost.getBoundingClientRect(); end();
      if (!w.on) return; // chạm → click xử lý
      skip = true; setTimeout(() => { skip = false; }, 60);
      if (o.locked()) return;
      const cur = o.get();
      if (w.idx >= 0) {
        const nx = insertAt(cur, w.tile, w.idx); if (nx.join() === cur.join()) return;
        commit(nx, w.tile, gr); if (!w.fromAns && o.onPlace) o.onPlace(w.tile);
      } else if (w.fromAns) commit(cur.filter(x => x !== w.tile), w.tile, gr);
    }
    const down = e => {
      const el = e.target.closest && e.target.closest(sel); if (d || !el || el.disabled || o.locked() || (e.button != null && e.button > 0)) return;
      const fromAns = o.ans.contains(el), tile = fromAns ? +el.dataset.a : +el.dataset.i;
      if (!fromAns && o.get().includes(tile)) return; // ô giữ chỗ trong ngân hàng
      d = { el, tile, fromAns, x0: e.clientX, y0: e.clientY, on: false, id: e.pointerId, idx: -1 };
      document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancel); document.addEventListener('contextmenu', noMenu); document.addEventListener('keydown', esc, true); g.addEventListener('blur', cancel);
    };
    const click = e => {
      if (skip) { e.stopPropagation(); e.preventDefault(); skip = false; return; }
      const el = e.target.closest && e.target.closest(sel); if (!el || o.locked()) return;
      e.stopPropagation();
      if (o.ans.contains(el)) { const k = placed().indexOf(el), f = remove(+el.dataset.a); const n = placed()[Math.min(k, placed().length - 1)]; if (f && e.detail === 0) (n || f).focus(); }
      else { const f = place(+el.dataset.i); if (f && e.detail === 0) f.focus(); } // bàn phím: focus sang thẻ vừa đặt để ←/→ đưa nó vào giữa ngay
    };
    const key = e => {
      if (!o.ans.isConnected) return destroy();
      if (e.defaultPrevented || e.altKey || o.locked() || typing(e.target)) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && String(e.key).toLowerCase() === 'z' && hist.length) { e.preventDefault(); const f = undo(); if (f && !f.disabled && e.target !== document.body) f.focus(); return; }
      if (e.ctrlKey || e.metaKey) return;
      const el = e.target.closest && e.target.closest(sel), cur = o.get();
      if (el && o.ans.contains(el) && /^(ArrowLeft|ArrowRight|Home|End|Delete|Backspace)$/.test(e.key)) {
        const tile = +el.dataset.a, i = cur.indexOf(tile); if (i < 0) return;
        e.preventDefault();
        if (e.key === 'Delete' || e.key === 'Backspace') { remove(tile); const n = placed()[Math.min(i, placed().length - 1)] || bankEl(tile); if (n) n.focus(); return; }
        const j = e.key === 'Home' ? 0 : e.key === 'End' ? cur.length - 1 : i + ((e.key === 'ArrowLeft') !== rtl() ? -1 : 1); if (j < 0 || j >= cur.length || j === i) return;
        const f = commit(insertAt(cur, tile, j), tile, el.getBoundingClientRect()); if (f) f.focus(); return;
      }
      if (/^[1-9]$/.test(e.key)) { const b = [...o.bank.querySelectorAll(sel)][+e.key - 1]; if (b && !cur.includes(+b.dataset.i)) { e.preventDefault(); place(+b.dataset.i); } return; }
      if (e.key === 'Backspace' && cur.length) { e.preventDefault(); remove(cur[cur.length - 1]); }
    };
    [o.ans, o.bank].forEach(c => { c.addEventListener('pointerdown', down); c.addEventListener('click', click, true); });
    scope.addEventListener('keydown', key);
    o.ans.classList.add('wa-ans'); o.bank.classList.add('wa-bank');
    if (o.ltr !== false) { o.ans.dir = 'ltr'; o.bank.dir = 'ltr'; }
    if (o.ans.setAttribute) o.ans.setAttribute('aria-description', T('Chạm thẻ để thêm vào cuối câu hoặc gỡ; kéo thẻ vào giữa để chèn; phím mũi tên đổi chỗ, Delete gỡ, Ctrl+Z hoàn tác'));
    syncBank(); reserve();
    if (ro) ro.observe(o.ans);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!d) reserve(); });
    function destroy() { end(); if (roRaf) cancelAnimationFrame(roRaf); if (ro) ro.disconnect(); [o.ans, o.bank].forEach(c => { c.removeEventListener('pointerdown', down); c.removeEventListener('click', click, true); }); scope.removeEventListener('keydown', key); if (live) { live.remove(); live = null; } }
    return { place, remove, undo, destroy, reserve() { if (!d) reserve(); }, reset() { hist.length = 0; render(); } };
  }
  g.WordArrange = { bind, insertAt, slotIndex, rowsOf };
})(typeof self !== 'undefined' ? self : globalThis);
