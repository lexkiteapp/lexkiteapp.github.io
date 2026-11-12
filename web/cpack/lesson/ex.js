/* 🧩 Bài tập có hình (gói lười lesson, sau ST2 ex-frame/ex-match; lesson/ui.js chỉ gọi). Khung + khuôn ô: mẫu Stitch 4/11 (brand/stitch/v2/ex-frame, ex-match) – ở đây chỉ gắn dữ liệu + hành vi.
 * Ghép cặp: ảnh thật word#pos / icon · loa trên ô tiếng Anh · mỗi cặp đúng 1 màu + dây nối qua khe giữa 2 cột · sai = đỏ + "Chưa phải" tự trả về · đếm cặp.
 * Dạng khác: giáo viên cạnh bong bóng (không thẻ nào che), ô hình trong thẻ đề bài, loa trên đáp án tiếng Anh, ô chữ cho bài gõ, khay + ô trống + thẻ bay cho xếp câu.
 * Móc test giữ nguyên: .lsn-match .lsn-opt[data-s][data-m], #lsnAns, #lsnBank, .lsn-tile[data-a|data-i]. Xếp câu kéo-chèn thuộc word-arrange.js (#337): có WordArrange thì nó lo chuyển động. */
(function (g) {
  const P = () => g.ST2.P['ex-match'](g.t, g.ST.esc), F = () => g.ST2.P['ex-frame'](g.t, g.ST.esc);
  const tidy = h => h.replace(/>\s+/g, '>').replace(/\s+</g, '<'); // khuôn Stitch giữ khoảng trắng quanh chữ → textContent phải đúng chữ (móc test, chấm)
  const calm = () => { try { return g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const ICON = { gap: 'edit', build: 'route', tr: 'menu_book', type: 'edit', say: 'mic', q: 'lightbulb', mean: 'menu_book', match: 'menu_book' };
  const icon = (n, c) => `<span class="material-symbols-outlined ${c || 'text-[24px]'}" aria-hidden="true">${n}</span>`;
  const pic = (src, ic) => (src ? `<img class="w-full h-full object-cover block" src="${g.ST.esc(src)}" alt="" loading="lazy" decoding="async" data-ic="${ic}">` : icon(ic));
  const css = () => {}; // CSS khung nằm ở css/lesson-ex.css (js/app.js BCSS nạp cùng gói lesson)
  const usable = () => !!(g.ST2 && g.ST2.P && g.ST2.P['ex-match'] && g.ST2.P['ex-frame'] && g.ST2['ex-frame']);
  // Chỗ giáo viên: đứng trên bệ cạnh bong bóng – bệ che đường cắt hông (docs/CHARACTERS.md §Chỗ giáo viên), không thẻ nào đè lên người
  const teacher = () => { css(); return '<div class="lsn-tchw ex-seat" aria-hidden="true"><div id="lsnTch"></div><i class="ss-floor" aria-hidden="true"></i></div>'; };
  // Mục tiêu chỉ hiện khi đúng thang của kỳ thi (TOEIC 10–990, TOEFL 0–120, IELTS 1–9): settings cũ đổi kỳ thi vẫn giữ "7.0" → "TOEIC · Mục tiêu 7.0" sai
  const targetOk = (ex, tg) => { const n = parseFloat(tg); if (!tg) return false; if (/^ielts/.test(ex)) return n >= 1 && n <= 9; if (ex === 'toeic') return n >= 100 && n <= 990; if (ex === 'toefl') return n >= 10 && n <= 120; return true; };
  const KIND = it => ({ match: 'Từ vựng', mean: 'Từ vựng', pic: 'Từ vựng', gap: 'Từ vựng', type: 'Từ vựng', build: 'Ngữ pháp', tr: 'Ngữ pháp', say: 'Nói', q: 'Đọc' }[it.type] || '');
  const label = (short, it) => { const k = KIND(it); return short ? short + (k ? ' · ' + g.t(k) : '') : (k ? g.t(k) : ''); };

  /* ---------- Ghép cặp ---------- */
  const cellW = (x, st) => tidy((st === 'sel' ? P().wordSel : st === 'done' ? P().wordDone : P().wordIdle)({ t: x.t, pic: pic(x.pic, x.ic) }));
  const cellM = (x, st) => tidy((st === 'done' ? P().meanDone : st === 'bad' ? P().meanBad : P().meanIdle)({ t: x.t }));
  // Đổi trạng thái NGAY TRÊN nút (giữ nguyên phần tử: handler, focus, danh sách ô của test/screen reader)
  const shape = (b, html, sel) => { const tp = document.createElement('template'); tp.innerHTML = html; const n = tp.content.firstElementChild; b.className = n.className + (sel ? ' lsn-xsel' : ''); b.innerHTML = n.innerHTML; };
  function match(L1, L2) { css();
    const rows = L1.map((a, i) => { const m = L2[i];
      return `<div class="lsn-xcell">${cellW(a, 'idle').replace('<button ', `<button data-m="${a.i}" data-s="w" `)}${tidy(P().say({ label: g.t('Nghe {w}', { w: a.t }) })).replace('<button ', `<button data-say="${g.ST.esc(a.t)}" `)}</div><div class="lsn-xcell">${cellM(m, 'idle').replace('<button ', `<button data-m="${m.i}" data-s="m" `)}</div>`; }).join('');
    return `<div class="lsn-match v2s-ex-match"><svg class="lsn-wires" aria-hidden="true"></svg>${rows}</div>`; }
  function wires(box, pairs, fresh) { const svg = box.querySelector('.lsn-wires'), R = box.getBoundingClientRect(); if (!svg) return; const k = pairs.length;
    svg.innerHTML = pairs.map((p, i) => { const a = box.querySelector(`[data-s=w][data-m="${p.m}"]`).getBoundingClientRect(), b = box.querySelector(`[data-s=m][data-m="${p.m}"]`).getBoundingClientRect();
      const [l, r] = a.left < b.left ? [a, b] : [b, a], x1 = l.right - R.left, x2 = r.left - R.left, y1 = l.top + l.height / 2 - R.top, y2 = r.top + r.height / 2 - R.top, lane = (x1 + x2) / 2 + (i - (k - 1) / 2) * 4;
      return `<g data-p="${p.tone}" class="${p.m === fresh ? 'new' : ''}"><path pathLength="1" d="M${x1},${y1} C${lane},${y1} ${lane},${y2} ${x2},${y2}"/><circle cx="${x1}" cy="${y1}" r="4"/><circle cx="${x2}" cy="${y2}" r="4"/></g>`; }).join(''); }
  function matchBind(it, c, words, means) {
    const box = document.querySelector('.lsn-match'), chips = document.querySelector('.lsn-qchips'), total = it.pairs.length, done = [], timers = new Map(); let sel = null, miss = 0;
    const count = () => { const e = document.getElementById('lsnPairs'), txt = g.t('{a}/{b} cặp', { a: done.length, b: total }); if (e) e.textContent = txt; else if (chips) chips.insertAdjacentHTML('beforeend', `<span class="v2s-ex-match contents lsn-xpairs">${tidy(P().pairs({ t: txt }))}</span>`); };
    const data = b => (b.dataset.s === 'w' ? words : means)[+b.dataset.m];
    const paint = (b, st) => { if (timers.has(b)) { clearTimeout(timers.get(b)); timers.delete(b); } const d = data(b); if (b.dataset.s === 'w') shape(b, cellW(d, st)); else shape(b, cellM(d, st === 'sel' ? 'idle' : st), st === 'sel'); b.setAttribute('aria-pressed', String(st === 'sel')); };
    count();
    box.querySelectorAll('.lsn-opt').forEach(b => { b.setAttribute('aria-pressed', 'false'); b.onclick = () => {
      if (c.checked() || b.disabled) return;
      if (!sel || sel.dataset.s === b.dataset.s) { if (sel === b) { paint(b, 'idle'); sel = null; return; } if (sel) paint(sel, 'idle'); sel = b; paint(b, 'sel'); if (b.dataset.s === 'w') c.say(data(b).t); return; }
      if (sel.dataset.m === b.dataset.m) { const tone = done.length % 4; [sel, b].forEach(x => { paint(x, 'done'); x.dataset.p = tone; x.disabled = true; x.setAttribute('aria-pressed', 'false'); });
        done.push({ m: b.dataset.m, tone }); wires(box, done, b.dataset.m); count(); if (g.Sfx && Sfx.pop) Sfx.pop();
        if (done.length === total) setTimeout(() => c.submit(miss === 0), 250);
      } else { miss++; const pair = [sel, b]; pair.forEach(x => { paint(x, x.dataset.s === 'm' ? 'bad' : 'idle'); const id = setTimeout(() => { timers.delete(x); if (!x.disabled && x !== sel) paint(x, 'idle'); }, 900); timers.set(x, id); }); }
      if (sel && (sel.dataset.m === b.dataset.m || sel !== b)) sel = null;
    }; });
    box.querySelectorAll('.lsn-msay').forEach(s => { s.onclick = () => c.say(s.dataset.say); });
    if (g.ResizeObserver) { const ro = new ResizeObserver(() => { if (!box.isConnected) return ro.disconnect(); if (done.length) wires(box, done, null); }); ro.observe(box); }
  }

  /* ---------- Thẻ đề bài + đáp án ---------- */
  function decorate(it, c) { css();
    const root = document.querySelector('.lsn-xframe'); if (!root) return;
    const say = root.querySelector('#lsnSay'), chip = root.querySelector('.lsn-xchip'), card = root.querySelector('.lsn-qcard'), bub = root.querySelector('#lsnBub'), tr = root.querySelector('.lsn-xtr');
    root.querySelectorAll('.lsn-xpairs').forEach(x => x.remove()); const bd = root.querySelector('#lsnBody'); if (bd) bd.classList.add('v2s-lesson-question'); // thẻ A–D giữ CSS của khuôn lesson-question
    if (say) say.textContent = c.title; if (chip) { const l = label(c.short, it); chip.textContent = l; chip.hidden = !l; }
    if (bub) { [...bub.childNodes].forEach(n => { if (n.nodeType === 3 && n.textContent.trim() === c.title) { const s = document.createElement('span'); s.className = 'sr-only'; s.textContent = c.title; n.replaceWith(s); } }); }
    if (tr) tr.hidden = !(it.type === 'tr' || (it.type === 'build' && it.prompt));
    if (card) { card.hidden = it.type === 'match';
      const col = bub && bub.parentElement, old = card.querySelector('.lsn-xtile'); if (old) old.remove();
      if (it.type !== 'match' && it.type !== 'pic' && col) { const row = card.firstElementChild; let w = row.querySelector('.lsn-xprompt'); if (!w) { w = document.createElement('div'); w.className = 'lsn-xprompt'; col.before(w); w.appendChild(col); }
        const cd = it.card || {}, src = cd.word ? c.img(cd.word, cd.pos) : (it.word && it.word[0] !== '#' ? c.img(it.word, cd.pos) : ''), ic = ICON[it.type] || 'menu_book';
        w.insertAdjacentHTML('afterbegin', `<span class="lsn-xtile" aria-hidden="true">${pic(src, ic)}</span>`); const im = w.querySelector('.lsn-xtile img'); if (im) im.onerror = () => { im.outerHTML = icon(ic); }; } }
    if (it.type === 'type') slots(it);
    if (it.type === 'build' || it.type === 'tr') board(it);
  }
  // Bài gõ: ô chữ theo độ dài từ (chữ đầu có sẵn làm gợi ý, gõ tới đâu hiện tới đó)
  function slots(it) { const inp = document.getElementById('lsnIn'); if (!inp) return; const n = it.len || String(it.answer).length, wrap = document.createElement('div'); wrap.className = 'lsn-slots'; wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = Array.from({ length: n }, () => tidy(F().slot({}))).join(''); inp.before(wrap); inp.classList.add('mt-3');
    const paint = () => { const v = inp.value || it.first || ''; [...wrap.children].forEach((s, i) => { s.innerHTML = v[i] ? `<b>${g.ST.esc(v[i])}</b>` : '<span class="w-1.5 h-1.5 rounded-full bg-current opacity-40"></span>'; }); };
    inp.addEventListener('input', paint); paint(); }
  // Loa trên đáp án tiếng Anh (nút riêng cạnh thẻ, không lồng nút)
  const optSay = (og, b, o, c, it) => { if (!(it.type === 'mean' || it.type === 'gap' || (it.type === 'pic' && it.choice))) return og.appendChild(b); css();
    const w = document.createElement('div'); w.className = 'lsn-xoptw v2s-ex-match'; w.appendChild(b); w.insertAdjacentHTML('beforeend', tidy(P().say({ label: g.t('Nghe {w}', { w: o }) }))); w.lastElementChild.onclick = () => c.say(o); og.appendChild(w); };

  /* ---------- Xếp câu: khay có ô trống + thẻ bay ---------- */
  const useFrame = () => !!document.querySelector('.lsn-xframe');
  function override() { const S = g.ST, t0 = S.lsnTile, b0 = S.lsnBuild;
    S.lsnTile = (txt, attr) => (useFrame() ? tidy((/data-a/.test(attr) ? F().placed : F().tile)({ t: txt })).replace('<button ', `<button ${attr} `) : t0(txt, attr));
    S.lsnBuild = tiles => { if (!useFrame()) return b0(tiles); const bank = tidy(F().bank({})), tp = tiles.map((w, i) => S.lsnTile(w, `data-i="${i}"`)).join(''); return tidy(F().tray({})) + bank.replace(/(id="lsnBank"[^>]*>)/, '$1' + tp); }; }
  function board(it) { const ans = document.getElementById('lsnAns'), bank = document.getElementById('lsnBank'); if (!ans || !bank) return;
    const need = String(it.answer || '').split(/\s+/).filter(Boolean).length, ghost = tidy(F().slot({}));
    const sync = () => { const n = ans.querySelectorAll('.lsn-tile').length, want = Math.max(0, need - n), cur = ans.querySelectorAll('.lsn-slot'); if (cur.length === want && (!want || ans.lastElementChild.classList.contains('lsn-slot'))) return; cur.forEach(x => x.remove()); ans.insertAdjacentHTML('beforeend', ghost.repeat(want)); };
    new MutationObserver(sync).observe(ans, { childList: true }); sync();
    if (g.WordArrange) return; // #337 đã có FLIP + kéo chèn
    let pre = null; const snap = from => { pre = { from, tiles: new Map([...ans.querySelectorAll('.lsn-tile')].map(e => [e.dataset.a, e.getBoundingClientRect()])) }; };
    const fly = (e, r) => { if (!e || !r || calm() || !e.animate) return; const n = e.getBoundingClientRect(), dx = r.left - n.left, dy = r.top - n.top; if (dx || dy) e.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' }); };
    bank.addEventListener('click', e => { const b = e.target.closest('.lsn-tile'); if (b) { snap(b.getBoundingClientRect()); pre.i = b.dataset.i; } }, true);
    ans.addEventListener('click', e => { if (e.target.closest('.lsn-tile')) snap(null); }, true);
    new MutationObserver(() => { if (!pre) return; const p = pre; pre = null; ans.querySelectorAll('.lsn-tile').forEach(e => fly(e, e.dataset.a === p.i ? p.from : p.tiles.get(e.dataset.a))); }).observe(ans, { childList: true });
  }

  g.LessonEx = { usable, teacher, targetOk, match, matchBind, decorate, optSay };
  if (g.ST && usable()) override();
})(self);
