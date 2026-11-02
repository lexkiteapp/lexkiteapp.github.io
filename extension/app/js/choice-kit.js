// ChoiceKit – logic dùng chung cho trắc nghiệm & phòng thi (tải lười cùng qengine/cbt; CSS do U3 làm):
//   • Phím tắt: A–D hoặc 1–4 chọn đáp án của câu đang làm (câu đang focus → câu vừa bấm → câu chưa làm đầu tiên đang thấy trên màn hình); không bắt khi đang gõ chữ.
//   • Gạch đáp án loại trừ: chuột phải (máy tính) hoặc nhấn giữ 0,5 s (điện thoại) lên một đáp án → class "struck"; nhớ theo lượt thi (sessionStorage),
//     tự gắn lại khi màn câu hỏi vẽ lại (MutationObserver).
//   • Kéo chia cột bài đọc/câu hỏi (split): thanh role="separator" kéo bằng chuột/cảm ứng hoặc phím ←/→; nhớ tỉ lệ (localStorage).
//   • Điền từ (accept/hint) + xếp câu (tiles): bộ tương tác chung cho mọi màn học – docs/specs/learn-flow-nav.md.
(function (g) {
  const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem(k) || 'null'); } catch (e) { return null; } }, set(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* riêng tư / đầy */ } } };
  const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } } };
  const typing = el => !!el && (el.isContentEditable || /^(TEXTAREA|SELECT)$/.test(el.tagName) || (el.tagName === 'INPUT' && !/^(radio|checkbox|button|submit)$/.test(el.type)));
  const groupsOf = root => { const m = new Map(); root.querySelectorAll('input[type=radio]').forEach(i => { if (!m.has(i.name)) m.set(i.name, []); m.get(i.name).push(i); }); return m; };
  const visible = el => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < (g.innerHeight || 800) && r.height > 0; };

  function attach(root, opt = {}) {
    if (!root || root.__ck) return root && root.__ck;
    const key = 'ck:' + (opt.key || (g.location && g.location.hash) || 'x');
    const struck = ss.get(key) || {}; // { tênNhóm: [giá trị, …] }
    let last = '';
    const save = () => ss.set(key, struck);
    const labelOf = i => i.closest('label') || i.parentElement;
    const paint = () => root.querySelectorAll('input[type=radio]').forEach(i => { const on = (struck[i.name] || []).includes(i.value), l = labelOf(i); if (l && l.classList.contains('struck') !== on) { l.classList.toggle('struck', on); l.setAttribute('data-struck', on ? '1' : ''); const b = l.querySelector('[data-strike]'); if (b) b.setAttribute('aria-pressed', String(on)); } });
    const toggle = i => { const a = struck[i.name] || (struck[i.name] = []), k = a.indexOf(i.value); if (k >= 0) a.splice(k, 1); else a.push(i.value); if (!a.length) delete struck[i.name]; save(); paint(); };
    const current = groups => {
      const a = document.activeElement;
      if (a && a.type === 'radio' && groups.has(a.name)) return a.name;
      if (last && groups.has(last)) return last;
      for (const [n, ins] of groups) if (!ins.some(x => x.checked) && !ins[0].disabled && visible(ins[0])) return n;
      for (const [n, ins] of groups) if (visible(ins[0])) return n;
      return '';
    };
    const onKey = e => {
      if (!root.isConnected) return detach();
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || typing(e.target)) return;
      // Alt/⌥ + phím: macOS đổi e.key thành ký tự đặc biệt (¡, å…) → dùng e.code (Digit1/Numpad1/KeyA) cho tổ hợp Alt
      const c = e.altKey ? /^(?:Digit|Numpad)([1-9])$|^Key([A-I])$/.exec(e.code || '') : null;
      const k = e.altKey ? (c ? (c[1] ? +c[1] - 1 : c[2].charCodeAt(0) - 65) : -1)
        : /^[1-9]$/.test(e.key) ? +e.key - 1 : /^[a-iA-I]$/.test(e.key) ? e.key.toLowerCase().charCodeAt(0) - 97 : -1;
      if (k < 0) return;
      const groups = groupsOf(root), n = current(groups), ins = n && groups.get(n);
      if (!ins || !ins[k] || ins[k].disabled) return;
      e.preventDefault();
      if (e.altKey) { toggle(ins[k]); return; } // Alt + phím: gạch / bỏ gạch phương án loại trừ
      if ((struck[n] || []).includes(ins[k].value)) toggle(ins[k]); // chọn lại đáp án đã gạch → bỏ gạch
      ins[k].click();
      const names = [...groups.keys()], nx = names.slice(names.indexOf(n) + 1).find(m => !groups.get(m).some(x => x.checked));
      last = nx || n;
      const el = nx && groups.get(nx)[0];
      if (el && !visible(el) && el.scrollIntoView) { let rm = false; try { rm = g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* bỏ qua */ } el.scrollIntoView({ block: 'center', behavior: rm ? 'auto' : 'smooth' }); }
    };
    const target = e => { const l = e.target.closest && e.target.closest('label'); const i = l && root.contains(l) && l.querySelector('input[type=radio]'); return i && !i.disabled ? i : null; };
    const onCtx = e => { const i = target(e); if (!i) return; e.preventDefault(); toggle(i); };
    let timer = 0, held = false;
    const onDown = e => { if (e.pointerType !== 'touch') return; const i = target(e); if (!i) return; held = false; clearTimeout(timer); timer = setTimeout(() => { held = true; toggle(i); if (navigator.vibrate) navigator.vibrate(15); }, 500); };
    const cancel = () => clearTimeout(timer);
    const onClick = e => {
      const btn = e.target.closest && e.target.closest('[data-strike]');
      if (btn && root.contains(btn)) {
        e.preventDefault(); e.stopPropagation();
        const l = btn.closest('label') || btn.parentElement;
        const i = l && l.querySelector('input[type=radio]');
        if (i && !i.disabled) toggle(i);
        return;
      }
      if (held) { held = false; e.preventDefault(); e.stopPropagation(); }
    }; // nhấn giữ hoặc bấm nút gạch để loại trừ
    const onTouch = e => { const i = e.target.closest && e.target.closest('input[type=radio]'); if (i) last = i.name; };
    const mo = g.MutationObserver ? new MutationObserver(() => paint()) : null;
    document.addEventListener('keydown', onKey);
    root.addEventListener('contextmenu', onCtx);
    root.addEventListener('pointerdown', onDown); root.addEventListener('pointerup', cancel); root.addEventListener('pointercancel', cancel); root.addEventListener('pointermove', cancel);
    root.addEventListener('click', onClick, true); root.addEventListener('change', onTouch);
    if (mo) mo.observe(root, { childList: true, subtree: true });
    paint();
    function detach() { document.removeEventListener('keydown', onKey); if (mo) mo.disconnect(); clearTimeout(timer); root.__ck = null; }
    root.__ck = { detach, paint, toggle, struck: () => JSON.parse(JSON.stringify(struck)), clear() { for (const k in struck) delete struck[k]; save(); paint(); } };
    return root.__ck;
  }

  // Kéo chia 2 cột: body là lưới 2 cột (vd .cbt-body), a = cột trái. Tỉ lệ 25–75 %, nhớ theo storeKey. Màn hẹp (1 cột) thì ẩn thanh.
  function split(body, a, storeKey = 'ck-split') {
    if (!body || !a || body.querySelector(':scope > .ck-split')) return;
    const bar = document.createElement('div');
    bar.className = 'ck-split'; bar.setAttribute('role', 'separator'); bar.setAttribute('aria-orientation', 'vertical'); bar.tabIndex = 0;
    bar.setAttribute('aria-label', g.t ? g.t('Kéo để đổi độ rộng cột') : 'Resize columns');
    a.after(bar);
    const set = p => { p = Math.min(75, Math.max(25, Math.round(p))); body.style.gridTemplateColumns = `minmax(0, ${p}fr) 10px minmax(0, ${100 - p}fr)`; bar.setAttribute('aria-valuenow', String(p)); ls.set(storeKey, String(p)); };
    const narrow = () => { try { return !!(g.matchMedia && g.matchMedia('(max-width: 900px)').matches); } catch (e) { return false; } };
    const apply = () => { if (narrow()) { body.style.gridTemplateColumns = ''; bar.hidden = true; } else { bar.hidden = false; set(+ls.get(storeKey) || 50); } };
    bar.addEventListener('pointerdown', e => {
      e.preventDefault(); bar.setPointerCapture && bar.setPointerCapture(e.pointerId); bar.classList.add('drag');
      const r = body.getBoundingClientRect();
      const mv = ev => set(((ev.clientX - r.left) / r.width) * 100);
      const up = () => { bar.classList.remove('drag'); bar.removeEventListener('pointermove', mv); bar.removeEventListener('pointerup', up); bar.removeEventListener('pointercancel', up); };
      bar.addEventListener('pointermove', mv); bar.addEventListener('pointerup', up); bar.addEventListener('pointercancel', up);
    });
    bar.addEventListener('keydown', e => { const p = +bar.getAttribute('aria-valuenow') || 50; if (e.key === 'ArrowLeft') { e.preventDefault(); set(p - 5); } else if (e.key === 'ArrowRight') { e.preventDefault(); set(p + 5); } else if (e.key === 'Home') { e.preventDefault(); set(50); } });
    bar.addEventListener('dblclick', () => set(50));
    try { const mq = g.matchMedia && g.matchMedia('(max-width: 900px)'); if (mq && mq.addEventListener) mq.addEventListener('change', apply); else if (mq && mq.addListener) mq.addListener(apply); } catch (e) { /* trình duyệt cũ: bỏ theo dõi đổi cỡ */ }
    apply();
  }

  // ── Điền từ: chấp nhận biến thể đúng (docs/specs/learn-flow-nav.md § Bộ tương tác) ──
  // Hoa/thường, nháy cong ’ ‘ `, khoảng trắng, dấu câu cuối, viết tắt (don't = do not, I'm = I am, can't = cannot…) → đúng.
  // Sai ≤ 1 ký tự ở từ ≥ 5 chữ (o.typo) → đúng kèm cờ typo để màn gạch chân chỗ sửa. Không đoán nghĩa: chỉ biến thể viết.
  const CONTR = [[/\bcan't\b/g, 'cannot'], [/\bcan not\b/g, 'cannot'], [/\bwon't\b/g, 'will not'], [/\bshan't\b/g, 'shall not'], [/\bain't\b/g, 'is not'], [/n't\b/g, ' not'],
    [/\bi'm\b/g, 'i am'], [/'re\b/g, ' are'], [/'ve\b/g, ' have'], [/'ll\b/g, ' will'], [/\blet's\b/g, 'let us'], [/\b(it|he|she|that|there|what|who|where|here)'s\b/g, '$1 is'], [/'d\b/g, ' would']];
  const canon = s => {
    let x = String(s == null ? '' : s).normalize('NFC').toLowerCase().replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim();
    x = x.replace(/^["'(]+|["')]+$/g, '').replace(/[.!?,;:…]+$/, '').replace(/\s+([.,!?;:])/g, '$1').trim();
    for (const [re, to] of CONTR) x = x.replace(re, to);
    return x.replace(/\s+/g, ' ').trim();
  };
  // Khoảng cách sửa (Damerau rút gọn: đổi chỗ 2 chữ liền nhau = 1 lỗi, vd. becuase)
  const lev = (a, b) => {
    if (Math.abs(a.length - b.length) > 1) return 2;
    const D = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i ? (j ? 0 : i) : j)));
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) {
      D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) D[i][j] = Math.min(D[i][j], D[i - 2][j - 2] + 1);
    }
    return D[a.length][b.length];
  };
  /** accept(gõ, đáp án, { alts: [đáp án khác], typo: true }) → { ok, how: 'exact'|'variant'|'typo'|'', want } */
  function accept(given, answer, o = {}) {
    const want = [answer, ...(o.alts || [])].filter(x => x != null && String(x).trim());
    const raw = String(given == null ? '' : given).trim();
    if (!raw) return { ok: false, how: '', want: want[0] || '' };
    for (const w of want) if (raw === String(w).trim()) return { ok: true, how: 'exact', want: w };
    const c = canon(raw);
    for (const w of want) if (c === canon(w)) return { ok: true, how: 'variant', want: w };
    if (o.typo) for (const w of want) {
      const A = c.split(' '), B = canon(w).split(' ');
      if (A.length !== B.length) continue;
      let slips = 0;
      const fine = B.every((b, i) => A[i] === b || (b.replace(/[^a-z]/g, '').length >= 5 && lev(A[i], b) === 1 && ++slips));
      if (fine && slips) return { ok: true, how: 'typo', want: w };
    }
    return { ok: false, how: '', want: want[0] || '' };
  }
  /** Gợi ý chữ đầu cho ô điền: hint('because', 1) → 'b' (+ số ký tự để màn hiện "b… (7)") */
  const hint = (answer, n = 1) => { const s = String(answer || '').trim(); return { head: s.slice(0, Math.max(1, n)), len: s.length }; };

  // ── Xếp câu / xếp từ: ngân hàng thẻ ↔ hàng đáp án (docs/specs/learn-flow-nav.md § Bộ tương tác) ──
  // • Chạm thẻ ngân hàng → bay lên hàng đáp án; chạm thẻ đã đặt → bay về ĐÚNG ô cũ trong ngân hàng (ô cũ giữ chỗ, bố cục không nhảy).
  // • Kéo (pointer events – chuột + cảm ứng iOS/Android): thả vào hàng đáp án ở vị trí bất kỳ (chèn/đổi chỗ), kéo ra ngoài để gỡ.
  // • Bàn phím: phím số 1–9 đặt thẻ thứ n của ngân hàng · Backspace gỡ thẻ cuối · ←/→ trên thẻ đã đặt đổi chỗ (theo RTL) · Delete gỡ thẻ đó.
  // • aria-live đọc vị trí mới; prefers-reduced-motion → không bay. Hình (thẻ) do màn vẽ: o.draw() vẽ lại theo o.get().
  const MOVE = 6; // px: dưới ngưỡng = chạm
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
  const reduced = () => { try { return !!(g.matchMedia && g.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
  // Hoạt ảnh FLIP: phần tử mới "bay" từ hộp cũ tới chỗ mới
  const fly = (el, from) => { if (!el || !from || reduced() || !el.animate) return; const r = el.getBoundingClientRect(), dx = from.left - r.left, dy = from.top - r.top; if (!dx && !dy) return; el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' }); };

  /** o = { ans, bank, sel = '.lsn-tile', get: () => mảng chỉ số thẻ đã đặt, set: thứ tự mới, draw: () => vẽ lại, locked: () => đã chấm?,
   *        word: i => chữ thẻ i, say: chuỗi → aria-live, t, onChange } · thẻ ngân hàng mang data-i, thẻ đã đặt mang data-a */
  function tiles(o) {
    const T = (k, v) => (o.t || g.t || (s => s))(k, v), sel = o.sel || '.lsn-tile';
    const rtl = () => { try { return getComputedStyle(o.ans).direction === 'rtl'; } catch (e) { return false; } };
    const placed = () => [...o.ans.querySelectorAll(sel)];
    const bankEl = i => o.bank.querySelector(`${sel}[data-i="${i}"]`), ansEl = i => o.ans.querySelector(`${sel}[data-a="${i}"]`);
    const at = (nx, tile) => { const k = nx.indexOf(tile); return k < 0 ? T('Đã gỡ {w}', { w: o.word(tile) }) : T('{w}: vị trí {n}/{m}', { w: o.word(tile), n: k + 1, m: nx.length }); };
    const commit = (nx, tile, from) => { o.set(nx); o.draw(); const el = nx.includes(tile) ? ansEl(tile) : bankEl(tile); fly(el, from); if (o.say) o.say(at(nx, tile)); if (o.onChange) o.onChange(nx); return el; };
    const place = (tile, idx) => { if (o.locked() || o.get().includes(tile)) return null; const b = bankEl(tile), r = b && b.getBoundingClientRect(); return commit(insertAt(o.get(), tile, idx == null ? o.get().length : idx), tile, r); };
    const remove = tile => { if (o.locked() || !o.get().includes(tile)) return null; const a = ansEl(tile), r = a && a.getBoundingClientRect(); return commit(o.get().filter(x => x !== tile), tile, r); };
    let d = null, skip = false;
    const end = () => { if (!d) return; if (d.ghost) d.ghost.remove(); if (d.caret) d.caret.remove(); if (d.el) d.el.classList.remove('lsn-dragsrc'); o.ans.classList.remove('lsn-dropok'); d = null; };
    const near = (x, y, pad) => { const r = o.ans.getBoundingClientRect(); return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad; };
    const down = e => {
      const el = e.target.closest && e.target.closest(sel); if (!el || o.locked() || (e.button != null && e.button > 0)) return;
      const fromAns = o.ans.contains(el), tile = fromAns ? +el.dataset.a : +el.dataset.i;
      if (!fromAns && o.get().includes(tile)) return; // ô giữ chỗ trong ngân hàng
      d = { el, tile, fromAns, x0: e.clientX, y0: e.clientY, on: false, id: e.pointerId, idx: -1 };
    };
    const move = e => {
      if (!d || e.pointerId !== d.id) return;
      if (!d.on) {
        if (Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < MOVE) return;
        d.on = true; const r = d.el.getBoundingClientRect(); d.dx = d.x0 - r.left; d.dy = d.y0 - r.top; d.from = r;
        d.ghost = d.el.cloneNode(true); d.ghost.removeAttribute('id'); d.ghost.classList.add('lsn-ghost'); d.ghost.setAttribute('aria-hidden', 'true'); d.ghost.style.width = r.width + 'px'; document.body.appendChild(d.ghost);
        d.el.classList.add('lsn-dragsrc');
        d.caret = document.createElement('span'); d.caret.className = 'lsn-caret'; d.caret.setAttribute('aria-hidden', 'true');
        try { d.el.setPointerCapture(d.id); } catch (err) { /* bỏ qua */ }
      }
      e.preventDefault();
      d.ghost.style.transform = `translate(${e.clientX - d.dx}px, ${e.clientY - d.dy}px)`;
      const inAns = near(e.clientX, e.clientY, 24);
      o.ans.classList.toggle('lsn-dropok', inAns); d.ghost.classList.toggle('lsn-out', !inAns && d.fromAns);
      if (inAns) { const els = placed().filter(x => x !== d.el), i = slotIndex(els.map(x => x.getBoundingClientRect()), e.clientX, e.clientY, rtl()); d.idx = i; if (els[i]) o.ans.insertBefore(d.caret, els[i]); else o.ans.appendChild(d.caret); }
      else { d.idx = -1; d.caret.remove(); }
    };
    const up = e => {
      if (!d || e.pointerId !== d.id) return;
      const w = d, gr = w.ghost && w.ghost.getBoundingClientRect(); end();
      if (!w.on) return; // chạm → click xử lý
      skip = true; setTimeout(() => { skip = false; }, 0);
      if (w.idx >= 0) commit(insertAt(o.get(), w.tile, w.idx), w.tile, gr);
      else if (w.fromAns) commit(o.get().filter(x => x !== w.tile), w.tile, gr);
    };
    const click = e => {
      if (skip) { e.stopPropagation(); e.preventDefault(); skip = false; return; }
      const el = e.target.closest && e.target.closest(sel); if (!el || o.locked()) return;
      e.stopPropagation();
      if (o.ans.contains(el)) { const k = placed().indexOf(el), f = remove(+el.dataset.a); const n = placed()[Math.min(k, placed().length - 1)]; if (f && e.detail === 0) (n || f).focus(); }
      else { const f = place(+el.dataset.i); if (f && e.detail === 0) el.focus(); }
    };
    const typing = el => !!el && (el.isContentEditable || /^(TEXTAREA|SELECT|INPUT)$/.test(el.tagName));
    const key = e => {
      if (!o.ans.isConnected) return destroy();
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || o.locked() || typing(e.target)) return;
      const el = e.target.closest && e.target.closest(sel), cur = o.get();
      if (el && o.ans.contains(el) && /^(ArrowLeft|ArrowRight|Delete|Backspace)$/.test(e.key)) {
        const tile = +el.dataset.a, i = cur.indexOf(tile); if (i < 0) return;
        e.preventDefault();
        if (e.key === 'Delete' || e.key === 'Backspace') { remove(tile); const n = placed()[Math.min(i, placed().length - 1)] || bankEl(tile); if (n) n.focus(); return; }
        const j = i + ((e.key === 'ArrowLeft') !== rtl() ? -1 : 1); if (j < 0 || j >= cur.length) return;
        const f = commit(insertAt(cur, tile, j), tile, el.getBoundingClientRect()); if (f) f.focus(); return;
      }
      if (/^[1-9]$/.test(e.key)) { const b = [...o.bank.querySelectorAll(sel)][+e.key - 1]; if (b && !cur.includes(+b.dataset.i)) { e.preventDefault(); place(+b.dataset.i); } return; }
      if (e.key === 'Backspace' && cur.length) { e.preventDefault(); remove(cur[cur.length - 1]); }
    };
    [o.ans, o.bank].forEach(c => { c.addEventListener('pointerdown', down); c.addEventListener('click', click, true); });
    document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', end); document.addEventListener('keydown', key);
    if (o.ans.setAttribute) o.ans.setAttribute('aria-description', T('Chạm thẻ để đặt hoặc gỡ; kéo để đổi chỗ; phím số đặt thẻ, Backspace gỡ thẻ cuối'));
    function destroy() { end(); [o.ans, o.bank].forEach(c => { c.removeEventListener('pointerdown', down); c.removeEventListener('click', click, true); }); document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', end); document.removeEventListener('keydown', key); }
    return { place, remove, destroy };
  }

  // ── Thang gợi ý dùng chung (Call, nói, viết, điền từ, xếp câu – chủ 2/11, docs/specs/learn-flow-nav.md) ──
  // Mặc định ẩn: chỉ nút 💡 "Cần gợi ý?" mờ. Bậc 1 (bấm, hoặc im lặng quietMs – A1 sớm, B2+ muộn) = câu mở đầu/từ khoá; bậc 2 (bấm lần nữa) = câu mẫu đầy đủ.
  // Dùng gợi ý → o.onUse(bậc) để màn ghi "có trợ giúp" (giảm nhẹ XP, đưa câu vào ôn). Phím H = bậc kế (không bắt khi đang gõ). o.activity() reset đồng hồ im lặng.
  const QUIET = { A1: 5000, A2: 6000, B1: 7000, B2: 8500, C1: 10000, C2: 10000 };
  function hints(host, o = {}) {
    if (!host) return null;
    const T = (k, v) => (o.t || g.t || (s => s))(k, v), steps = [o.opener, o.full].filter(x => x && String(x).trim());
    let lvl = 0, timer = 0;
    host.classList.add('ck-hints');
    host.innerHTML = '<button type="button" class="ck-hint-btn" aria-expanded="false"></button><div class="ck-hint-out" aria-live="polite"></div>';
    const btn = host.querySelector('.ck-hint-btn'), out = host.querySelector('.ck-hint-out');
    const paint = () => {
      btn.textContent = '💡 ' + (lvl === 0 ? T('Cần gợi ý?') : T('Thêm gợi ý'));
      btn.hidden = lvl >= steps.length; btn.setAttribute('aria-expanded', String(lvl > 0)); btn.classList.toggle('ck-dim', lvl === 0);
      out.innerHTML = steps.slice(0, lvl).map((s, i) => `<p class="ck-hint-l${i + 1}" lang="en" dir="auto"></p>`).join('');
      out.querySelectorAll('p').forEach((p, i) => { p.textContent = steps[i]; });
    };
    const more = () => { if (lvl >= steps.length) return; lvl++; clearTimeout(timer); paint(); if (o.onUse) o.onUse(lvl); };
    const arm = () => { clearTimeout(timer); if (lvl === 0 && steps.length && o.auto !== false) timer = setTimeout(() => { if (host.isConnected) more(); }, o.quietMs || QUIET[String(o.level || 'B1').toUpperCase()] || 7000); };
    const key = e => { if (!host.isConnected) return destroy(); if ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.metaKey && !e.altKey && !e.defaultPrevented && !typing(e.target)) { e.preventDefault(); more(); } };
    const typing = el => !!el && (el.isContentEditable || /^(TEXTAREA|SELECT|INPUT)$/.test(el.tagName));
    btn.onclick = more; document.addEventListener('keydown', key);
    paint(); arm();
    function destroy() { clearTimeout(timer); document.removeEventListener('keydown', key); }
    return { more, level: () => lvl, used: () => lvl > 0, activity: arm, destroy };
  }
  // Dòng dịch tiếng mẹ đẻ dưới câu giáo viên: ẩn mặc định, chạm để hiện/ẩn (như Duolingo), nhớ lựa chọn (localStorage lk.gloss)
  function gloss(el, o = {}) {
    if (!el) return null;
    const T = (k, v) => (o.t || g.t || (s => s))(k, v), K = o.key || 'lk.gloss';
    const set = on => { el.classList.toggle('ck-gloss-on', on); el.setAttribute('aria-pressed', String(on)); el.setAttribute('aria-label', on ? T('Ẩn bản dịch') : T('Hiện bản dịch')); };
    el.setAttribute('role', 'button'); el.tabIndex = 0; el.classList.add('ck-gloss');
    set(ls.get(K) === '1');
    const flip = () => { const on = !el.classList.contains('ck-gloss-on'); ls.set(K, on ? '1' : '0'); set(on); };
    el.addEventListener('click', flip); el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flip(); } });
    return { flip, on: () => el.classList.contains('ck-gloss-on') };
  }

  g.ChoiceKit = { attach, split, accept, canon, hint, tiles, insertAt, slotIndex, hints, gloss };
})(typeof window !== 'undefined' ? window : globalThis);
