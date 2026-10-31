/* 🤖 qa-bot – đầu dò lỗi giao diện ẨN, chạy TRONG trang (docs/QA-BOT.md). Không phụ thuộc thư viện.
 * window.QAB.scan(o) → [{k, sev, sig, msg}]  (sev: 'fail' | 'warn'; sig = chữ ký ổn định để so baseline)
 *   hscroll   trang cuộn ngang (scrollWidth > clientWidth)
 *   clip      khung overflow≠visible có nội dung tràn ngang (chữ/link bị cắt) – trừ dải cuộn ngang cố ý (scroll-snap, data-hscroll, tên *scroll|carousel|chips|rail|strip|tabs*)
 *   spill     phần tử trong luồng tràn ra ngoài khung chứa nó (aside/nav/header/footer/.card/.sidebar) > 2 px
 *   offscreen phần tử bấm được nằm ngoài màn hình
 *   covered   phần tử bấm được bị phần tử khác đè lên tâm (chồng lấn)
 *   align     các hàng cùng cột (o.align) lệch mép trái nội dung > 4 px
 *   indicator vạch/chấm "đang chọn" (::before/::after hoặc .indicator) tách rời khỏi viên thuốc của mục đang chọn > 2 px
 *   tap       vùng chạm < o.tap px (mặc định 44) – trừ link nằm trong đoạn văn
 *   wrap      nút/biểu tượng rớt xuống đứng một mình ở dòng cuối · lone  nhãn ≤ 3 ký tự đứng trơ cả hàng · nolabel  ô chọn/nhập không có nhãn nhìn thấy
 * window.QAB.perf.*  CLS / long task / INP (Event Timing) / FPS – đo từ lúc nạp trang (gắn bằng addInitScript). */
(function (W) {
  'use strict';
  const D = document;
  const P = W.__qabPerf = W.__qabPerf || { cls: 0, clsSrc: [], long: [], ev: [] };
  try {
    new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) { P.cls += e.value; const n = e.sources && e.sources[0] && e.sources[0].node; P.clsSrc.push((n && n.nodeType === 1 ? lab(n) : '?') + ' ' + e.value.toFixed(3)); } }).observe({ type: 'layout-shift', buffered: true });
  } catch (e) { /* trình duyệt không hỗ trợ */ }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) P.long.push({ t: Math.round(e.startTime), d: Math.round(e.duration) }); }).observe({ type: 'longtask', buffered: true }); } catch (e) { /* */ }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.interactionId) P.ev.push({ n: e.name, d: Math.round(e.duration), t: Math.round(e.startTime) }); }).observe({ type: 'event', buffered: true, durationThreshold: 16 }); } catch (e) { /* */ }

  function lab(e) {
    if (!e || e.nodeType !== 1) return '?';
    const parts = [];
    for (let x = e, i = 0; x && x.nodeType === 1 && x !== D.body && i < 3; x = x.parentElement, i++) {
      let s = x.tagName.toLowerCase();
      if (x.id) { parts.unshift(s + '#' + x.id); break; }
      const c = [...x.classList].filter(c => !/^(on|active|show|open|is-|has-|ok|bad|sel|cur|done|next|hover|focus|pop|talk|nod|shake)/.test(c)).slice(0, 2);
      if (c.length) s += '.' + c.join('.');
      const r = x.getAttribute('data-route') || x.getAttribute('data-l') || x.getAttribute('data-tab'); if (r) s += `[${r}]`;
      parts.unshift(s);
    }
    return parts.join('>');
  }
  const txt = e => (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
  function vis(e) {
    if (!e || !e.getBoundingClientRect) return null;
    const r = e.getBoundingClientRect(); if (r.width <= 1 || r.height <= 1) return null; // 1×1 = chữ chỉ cho trình đọc màn hình (sr-only)
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
      if (x.parentElement && x.parentElement.tagName === 'DETAILS' && !x.parentElement.open && x.tagName !== 'SUMMARY') return null; // nội dung <details> đang đóng
      const c = getComputedStyle(x); if (c.clipPath === 'inset(50%)' || /rect\(0(px)?,? 0(px)?/.test(c.clip)) return null; const cs = getComputedStyle(x); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return null; if (x.hasAttribute('inert')) return null; }
    return r;
  }
  const INTER = 'a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=link],[role=menuitem],[role=radio],[role=checkbox],[role=switch],[tabindex]:not([tabindex="-1"])';
  const scrollerCls = /scroll|carousel|chips|rail|strip|tabs|track|marquee|swiper|ticker|row-x/i;
  const deliberateScroller = e => e.hasAttribute('data-hscroll') || getComputedStyle(e).scrollSnapType !== 'none' || scrollerCls.test(e.className && e.className.baseVal == null ? e.className : '') || e.getAttribute('role') === 'tablist';
  const clipsX = cs => cs.overflowX !== 'visible';
  // mép trái NỘI DUNG (chữ hoặc biểu tượng đầu tiên) – để so thẳng hàng
  function contentLeft(e) {
    let m = Infinity;
    const w = D.createTreeWalker(e, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let n = w.currentNode; n; n = w.nextNode()) {
      if (n.nodeType === 3) { if (!n.textContent.trim()) continue; const rg = D.createRange(); rg.selectNodeContents(n); for (const r of rg.getClientRects()) if (r.width > 0) m = Math.min(m, r.left); }
      else if (/^(svg|img|i|picture|canvas)$/i.test(n.tagName) || n.classList.contains('ic')) { const r = vis(n); if (r && r.width >= 8) m = Math.min(m, r.left); }
    }
    return m;
  }
  function pseudoRect(e, which) {
    const cs = getComputedStyle(e, which);
    if (!cs || cs.content === 'none' || cs.content === 'normal' || cs.display === 'none') return null;
    if (cs.position !== 'absolute' && cs.position !== 'fixed') return null;
    const bg = cs.backgroundColor, painted = (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) || cs.backgroundImage !== 'none' || parseFloat(cs.borderLeftWidth) > 0;
    if (!painted) return null;
    const w = parseFloat(cs.width), h = parseFloat(cs.height); if (!(w > 0) || !(h > 0)) return null;
    // khối chứa: chính phần tử nếu position≠static, không thì tổ tiên gần nhất có position≠static
    let cb = e; while (cb && cb !== D.body && getComputedStyle(cb).position === 'static') cb = cb.parentElement;
    const R = (cb || D.body).getBoundingClientRect(), bl = parseFloat(getComputedStyle(cb || D.body).borderLeftWidth) || 0, bt = parseFloat(getComputedStyle(cb || D.body).borderTopWidth) || 0;
    const L = parseFloat(cs.left), T = parseFloat(cs.top), Rr = parseFloat(cs.right);
    const x = !isNaN(L) ? R.left + bl + L : !isNaN(Rr) ? R.right - Rr - w : R.left;
    const y = !isNaN(T) ? R.top + bt + T : R.top;
    return { left: x, right: x + w, top: y, bottom: y + h, width: w, height: h };
  }
  const gap = (a, b) => Math.max(0, Math.max(a.left, b.left) - Math.min(a.right, b.right), Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom));

  function scan(o = {}) {
    const out = [], TAP = o.tap || 44, IW = D.documentElement.clientWidth, IH = innerHeight;
    const add = (k, sev, el, msg) => out.push({ k, sev, sig: k + '|' + (typeof el === 'string' ? el : lab(el)), msg: (typeof el === 'string' ? el : lab(el)) + ' – ' + msg });
    const modal = D.querySelector('#modal:not([hidden]) #modalBox, dialog[open]');
    // 1) trang cuộn ngang
    const sw = D.documentElement.scrollWidth; if (sw > IW + 1) add('hscroll', 'fail', 'html', `trang rộng ${sw}px > ${IW}px (cuộn ngang)`);
    const all = [...D.querySelectorAll('body *')].filter(e => !/^(script|style|template|noscript|br|option|path|use|defs|symbol|g)$/i.test(e.tagName));
    for (const e of all) {
      const cs = getComputedStyle(e);
      // 2) khung cắt nội dung ngang
      if (clipsX(cs) && e.clientWidth > 0 && e.scrollWidth > e.clientWidth + 2 && !deliberateScroller(e) && e !== D.documentElement && e !== D.body) {
        const r = vis(e); if (!r) continue;
        if (cs.textOverflow === 'ellipsis') { add('clip', 'warn', e, `chữ bị cắt "…" (${e.scrollWidth}>${e.clientWidth}px)`); continue; }
        const cut = [...e.querySelectorAll('*')].filter(c => { const q = vis(c); return q && q.right > r.right + 1 && (c.children.length === 0 || /^(a|button|bdi|span|b|small)$/i.test(c.tagName)); }).slice(0, 3).map(c => `"${txt(c) || lab(c)}"`);
        add('clip', 'fail', e, `nội dung tràn ngang ${e.scrollWidth - e.clientWidth}px bị cắt${cut.length ? ': ' + cut.join(', ') : ''}`);
      }
    }
    // 3) tràn khỏi khung chứa (landmark/thẻ) – chỉ phần tử trong luồng
    for (const box of D.querySelectorAll('aside, nav, header, footer, .sidebar, .card, .side-foot')) {
      const B = vis(box); if (!B) continue;
      for (const c of box.querySelectorAll('a, button, bdi, span, p, h1, h2, h3, li, details, summary, img, svg')) {
        const cs = getComputedStyle(c); if (cs.position === 'absolute' || cs.position === 'fixed') continue;
        if (c.closest('[data-hscroll]') || [...(function* () { for (let x = c.parentElement; x && x !== box; x = x.parentElement) yield x; })()].some(x => getComputedStyle(x).position === 'absolute' || getComputedStyle(x).position === 'fixed' || deliberateScroller(x))) continue;
        const q = vis(c); if (!q) continue;
        const over = Math.max(q.right - B.right, B.left - q.left);
        if (over > 2) { add('spill', 'fail', c, `"${txt(c)}" lòi ra ngoài ${lab(box)} ${Math.round(over)}px`); break; }
      }
    }
    // 4–5) phần tử bấm được: ngoài màn hình / bị đè / vùng chạm nhỏ
    const inter = [...D.querySelectorAll(INTER)].map(e => [e, vis(e)]).filter(([, r]) => r);
    for (const [e, r] of inter) {
      if (modal && !modal.contains(e)) continue;
      const scr = (function () { for (let x = e.parentElement; x; x = x.parentElement) { if (x === D.body) return null; if (clipsX(getComputedStyle(x)) && deliberateScroller(x)) return x; } return null; })();
      if (!scr && (r.right > IW + 1 || r.left < -1) && getComputedStyle(e).position !== 'fixed') add('offscreen', 'fail', e, `"${txt(e)}" nằm ngoài màn hình (x ${Math.round(r.left)}…${Math.round(r.right)} / ${IW})`);
      // bị đè: điểm tâm (trong vùng nhìn thấy) phải trúng chính nó/con/cha-nhãn
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx > 0 && cx < IW && cy > 0 && cy < IH && !scr) {
        const hit = D.elementFromPoint(cx, cy);
        if (hit && hit !== e && !e.contains(hit) && !hit.contains(e) && !(hit.closest && hit.closest('label') && hit.closest('label').contains(e))) {
          const hs = getComputedStyle(hit);
          // nội dung cuộn nằm sau thanh cố định (thanh tab đáy, đầu trang dính) = bình thường ở vị trí cuộn này; chỉ báo khi 2 thứ cùng lớp hoặc lớp nổi đè lên thanh cố định
          const layer = x => { for (let y = x; y && y !== D.body; y = y.parentElement) { const p = getComputedStyle(y).position; if (p === 'fixed' || p === 'sticky') return y; } return null; };
          const lh = layer(hit), le = layer(e);
          if (hs.pointerEvents !== 'none' && !/^(html|body)$/i.test(hit.tagName) && !(lh && !le)) add('covered', 'fail', e, `"${txt(e)}" bị ${lab(hit)} đè lên`);
        }
      }
      // vùng chạm: link chữ nằm giữa đoạn văn được miễn (WCAG 2.5.8 ngoại lệ "inline")
      const inline = e.tagName === 'A' && getComputedStyle(e).display === 'inline' && e.parentElement && /^(p|li|span|small|label|td|figcaption|blockquote)$/i.test(e.parentElement.tagName) && e.parentElement.textContent.trim().length > txt(e).length + 8;
      const small = /^input$/i.test(e.tagName) ? !/checkbox|radio|range/.test(e.type) && r.height < TAP - 0.5 : r.width < TAP - 0.5 || r.height < TAP - 0.5;
      if (!inline && small && !e.closest('[aria-hidden="true"]')) add('tap', 'fail', e, `"${txt(e)}" vùng chạm ${Math.round(r.width)}×${Math.round(r.height)} < ${TAP}px`);
    }
    // 6a) "rớt dòng mồ côi": hàng nút/biểu tượng/chip xuống dòng mà dòng cuối chỉ còn 1 phần tử nhỏ (vd. nút loa UK rớt khỏi hàng phiên âm)
    for (const box of D.querySelectorAll('#view *, .sidebar *, .bottom-nav *')) {
      const kids = [...box.children].filter(c => { const q = vis(c); if (!q) return false; const p = getComputedStyle(c).position; return p !== 'absolute' && p !== 'fixed'; });
      if (kids.length < 3) continue;
      const cs = getComputedStyle(box), flexWrap = /flex/.test(cs.display) && cs.flexWrap !== 'nowrap' && cs.flexDirection.startsWith('row');
      const inl = kids.every(c => /inline/.test(getComputedStyle(c).display));
      if (!flexWrap && !inl) continue;
      const rows = []; for (const c of kids) { const q = c.getBoundingClientRect(); const r = rows.find(r => Math.abs(r.top - q.top) < q.height / 2); if (r) r.items.push([c, q]); else rows.push({ top: q.top, items: [[c, q]] }); }
      if (rows.length < 2) continue;
      const last = rows[rows.length - 1], B = box.getBoundingClientRect();
      if (last.items.length === 1 && rows[rows.length - 2].items.length >= 2 && last.items[0][1].width < B.width * 0.3 && last.items[0][0].matches(INTER + ',.chip,.badge,.ic,svg,img')) add('wrap', 'fail', last.items[0][0], `"${txt(last.items[0][0]) || lab(last.items[0][0])}" rớt xuống đứng một mình ở dòng cuối của ${lab(box)}`);
    }
    // 6b) chip/nhãn rất ngắn đứng trơ một mình cả hàng (vd. "n" dưới phiên âm): ≤ 3 ký tự, không anh em nhìn thấy, khung cha rộng gấp ≥ 5 lần
    for (const e of D.querySelectorAll('#view span, #view i, #view b, #view small, #view em, #view div')) {
      if (e.children.length || e.closest('button, a, label, [role=button], .badge, svg')) continue;
      const t = (e.textContent || '').trim(); if (!t || t.length > 3 || /^\d+%?$/.test(t)) continue;
      const q = vis(e); if (!q || q.width > 60) continue;
      const par = e.parentElement, sib = [...par.children].filter(c => c !== e && vis(c)), P = par.getBoundingClientRect();
      const alone = !sib.length && (par.textContent || '').trim() === t && P.width > q.width * 5;
      if (alone) add('lone', 'fail', e, `nhãn "${t}" đứng trơ một mình cả hàng (khung ${Math.round(P.width)}px)`);
    }
    // 6c) ô chọn / ô nhập không có nhãn NHÌN THẤY (aria-label không đủ cho người nhìn): <label>, placeholder (ô nhập) hoặc chữ ngay trước trong cùng hàng
    for (const e of D.querySelectorAll('#view select, #view input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=range]), #view textarea')) {
      const r = vis(e); if (!r) continue;
      const lbl = (e.labels && [...e.labels].some(l => vis(l) && l.textContent.trim())) || (e.placeholder && e.tagName !== 'SELECT');
      const prev = e.previousElementSibling, near = prev && vis(prev) && prev.textContent.trim().length > 1 && Math.abs(prev.getBoundingClientRect().top - r.top) < 40;
      const parTxt = e.parentElement && e.parentElement !== D.querySelector('#view') && (e.parentElement.textContent || '').replace(e.tagName === 'SELECT' ? e.textContent : '', '').trim().length > 1;
      if (!lbl && !near && !parTxt) add('nolabel', 'fail', e, `${e.tagName.toLowerCase()} "${e.tagName === 'SELECT' ? (e.selectedOptions[0] || {}).textContent || '' : e.value}" không có nhãn nhìn thấy – người học không biết ô này để làm gì`);
    }
    // 6) thẳng hàng theo cột: o.align = [{name, items:[selector…]}] – mép trái nội dung của các hàng phải trùng nhau ± 4px
    for (const g of o.align || []) {
      const rows = g.items.flatMap(s => [...D.querySelectorAll(s)]).filter(vis).map(e => [e, contentLeft(e)]).filter(([, x]) => isFinite(x));
      if (rows.length < 2) continue;
      const ref = rows[0][1], bad = rows.filter(([, x]) => Math.abs(x - ref) > 4);
      const seen = new Set();
      for (const [e, x] of bad) { const k = lab(e).replace(/\[[^\]]*\]/g, ''); if (seen.has(k)) continue; seen.add(k); add('align', 'fail', `${g.name}:${k}`, `"${txt(e)}" lệch ${Math.round(x - ref)}px so với ${lab(rows[0][0])} (mép trái nội dung)`); }
    }
    // 7) vạch "đang chọn" tách khỏi mục đang chọn
    for (const e of D.querySelectorAll('nav .active, nav [aria-current="page"], [role=tablist] [aria-selected="true"], .bottom-nav .active, #nav .active')) {
      const r = vis(e); if (!r) continue;
      const inds = [pseudoRect(e, '::before'), pseudoRect(e, '::after')].filter(Boolean);
      for (const c of e.querySelectorAll('.indicator, .ind, [class*="indicator"]')) { const q = vis(c); if (q && getComputedStyle(c).position === 'absolute') inds.push(q); }
      for (const q of inds) {
        const g = gap(q, r);
        if (g > 2) add('indicator', 'fail', e, `vạch đang chọn cách mục "${txt(e)}" ${Math.round(g)}px (x ${Math.round(q.left)} – mục ${Math.round(r.left)}…${Math.round(r.right)})`);
      }
    }
    return out;
  }

  // FPS trong lúc chuyển cảnh: đếm khung trong ms (rAF) – trả {fps, worst}
  function fps(ms) {
    return new Promise(res => { const t0 = performance.now(); let n = 0, last = t0, worst = 0; const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res({ fps: Math.round(n * 1000 / (t - t0)), worst: Math.round(worst) }); }; requestAnimationFrame(f); });
  }
  function storage() {
    let ls = 0; const keys = {};
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k) || ''; const b = (k.length + v.length) * 2; ls += b; keys[k] = b; } } catch (e) { /* */ }
    return (navigator.storage && navigator.storage.estimate ? navigator.storage.estimate() : Promise.resolve({})).then(est => ({ ls, keys, usage: est.usage || 0, idb: (est.usageDetails && est.usageDetails.indexedDB) || 0 }));
  }
  W.QAB = { scan, lab, fps, storage, perf: () => ({ cls: +P.cls.toFixed(4), clsSrc: P.clsSrc.slice(-6), long: P.long.slice(), inp: P.ev.reduce((m, e) => Math.max(m, e.d), 0), ev: P.ev.slice(-20) }), reset: () => { P.cls = 0; P.clsSrc = []; P.long = []; P.ev = []; } };
})(window);
