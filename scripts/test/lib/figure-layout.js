/* Bộ dò lỗi bố cục hình đề (chạy TRONG trình duyệt thật – Playwright trên CI, không chạy trên Mac).
 * FigureLayout.check(root) → [{ kind, detail }] cho mọi <svg> + khối HTML trong root:
 *  - clip     phần tử tràn khỏi khung SVG (bị cắt) hoặc tràn khỏi khung hình HTML
 *  - overlap  chữ đè chữ (hộp bao giao nhau)
 *  - straddle chữ nằm vắt qua mép một khối/lát/đường (tràn khối hoặc đè khối khác)
 *  - blocks   hai khối chữ nhật chồng một phần lên nhau
 *  - tiny     chữ hiển thị < 9 px
 *  - contrast chữ trên nền thật < 4,5:1 (chữ lớn < 3:1)
 * Dùng chung được cho mọi hình đề vẽ bằng SVG/HTML (Task 1, sau này TOEIC/Reading nếu có hình vẽ). */
(function () {
  const parse = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ''); if (!m) return null; const p = m[1].split(/[\s,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p[3] == null ? 1 : p[3]]; };
  const lum = c => c.slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }).reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const over = (top, under) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + under[i] * (1 - a)).concat(1); };
  const bgOf = el => { // nền HTML thật phía sau (trộn các lớp bán trong suốt)
    const layers = []; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; } }
    let col = [255, 255, 255, 1]; for (let i = layers.length - 1; i >= 0; i--) col = over(layers[i], col); return col;
  };
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const label = el => { const t = (el.textContent || '').trim().replace(/\s+/g, ' '); return `<${el.tagName.toLowerCase()}${t ? ` "${t.slice(0, 30)}"` : ''}>`; };
  const visible = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0; };

  function checkSvg(svg, out) {
    const vb = svg.viewBox.baseVal, sr = svg.getBoundingClientRect();
    if (!vb || !vb.width || !sr.width) return;
    const scale = sr.width / vb.width;
    const all = [...svg.querySelectorAll('text,rect,circle,ellipse,path,polygon,polyline,line')].filter(e => !e.closest('defs,title') && visible(e));
    const texts = all.filter(e => e.tagName === 'text');
    const shapes = all.filter(e => e.tagName !== 'text').map(e => {
      const cs = getComputedStyle(e), sw = parseFloat(cs.strokeWidth) || 0;
      const fill = cs.fill !== 'none' && !['line', 'polyline'].includes(e.tagName) ? parse(cs.fill) : null;
      const thick = sw >= 3 && cs.stroke !== 'none'; // đường dày (đường dữ liệu, con đường) là vật cản; lưới mảnh thì không
      return { e, fill, thick, op: +cs.opacity * (+cs.fillOpacity || 1) };
    }).filter(s => s.fill || s.thick);
    const pad = 0.5;
    // 1) tràn khung SVG (overflow mặc định = hidden → bị cắt)
    for (const e of all) {
      const r = e.getBoundingClientRect(); if (!r.width && !r.height) continue;
      const dx = Math.max(sr.left - r.left, r.right - sr.right), dy = Math.max(sr.top - r.top, r.bottom - sr.bottom);
      if (dx > pad || dy > pad) out.push({ kind: 'clip', detail: `${label(e)} tràn khung SVG ${Math.round(Math.max(dx, dy))} px` });
    }
    // 2) chữ đè chữ
    const tr = texts.map(e => e.getBoundingClientRect());
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = inter(tr[i], tr[j]); if (a > 2) out.push({ kind: 'overlap', detail: `${label(texts[i])} đè ${label(texts[j])} (${Math.round(a)} px²)` });
    }
    // 3) chữ vắt qua mép khối / đè đường dày; 5) cỡ chữ; 6) tương phản với nền thật bên dưới
    const svgBg = bgOf(svg);
    for (const t of texts) {
      const bb = t.getBBox(), m = t.getScreenCTM(); if (!m || !bb.width) continue;
      const ix = Math.min(1.5, bb.width / 4), iy = Math.min(2.5, bb.height / 4);
      const pts = [];
      for (const fx of [0, 0.5, 1]) for (const fy of [0, 0.5, 1]) pts.push(new DOMPoint(bb.x + ix + (bb.width - 2 * ix) * fx, bb.y + iy + (bb.height - 2 * iy) * fy).matrixTransform(m));
      const under = [];
      for (const s of shapes) {
        const im = s.e.getScreenCTM(); if (!im) continue; const inv = im.inverse();
        const local = pts.map(p => { const q = p.matrixTransform(inv), sp = svg.createSVGPoint(); sp.x = q.x; sp.y = q.y; return sp; }); // Chromium cũ chỉ nhận SVGPoint
        const hit = local.map(p => (s.fill && s.e.isPointInFill(p)) || (s.thick && s.e.isPointInStroke(p)));
        const k = hit.filter(Boolean).length;
        if (s.thick && k) out.push({ kind: 'straddle', detail: `${label(t)} đè đường ${label(s.e)}` });
        else if (k && k < hit.length) out.push({ kind: 'straddle', detail: `${label(t)} vắt qua mép ${label(s.e)} (${k}/${hit.length} điểm trong)` });
        else if (k === hit.length && s.fill && (s.e.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING)) under.push(s);
      }
      const cs = getComputedStyle(t), px = parseFloat(cs.fontSize) * scale, bold = +cs.fontWeight >= 700;
      if (px < 9) out.push({ kind: 'tiny', detail: `${label(t)} chỉ ${px.toFixed(1)} px` });
      const fg = parse(cs.fill); if (!fg) continue;
      let bg = svgBg; for (const s of under) bg = over([...s.fill.slice(0, 3), s.fill[3] * s.op], bg);
      const need = px >= 24 || (bold && px >= 18.66) ? 3 : 4.5, r = ratio(over(fg, bg), bg);
      if (r < need) out.push({ kind: 'contrast', detail: `${label(t)} ${r.toFixed(2)}:1 < ${need}:1` });
    }
    // 4) khối chữ nhật chồng một phần (khối chứa trọn khối khác – khung/nền – thì hợp lệ)
    const rects = shapes.filter(s => s.e.tagName === 'rect' && s.fill).map(s => ({ e: s.e, r: s.e.getBoundingClientRect() }));
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i].r, b = rects[j].r, ar = inter(a, b); if (ar <= 1) continue;
      const inside = (x, y) => x.left >= y.left - pad && x.right <= y.right + pad && x.top >= y.top - pad && x.bottom <= y.bottom + pad;
      if (!inside(a, b) && !inside(b, a)) out.push({ kind: 'blocks', detail: `${label(rects[i].e)} chồng ${label(rects[j].e)} (${Math.round(ar)} px²)` });
    }
  }
  function checkHtml(root, out) {
    const rr = root.getBoundingClientRect();
    for (const e of root.querySelectorAll('*')) {
      if (e.closest('svg') || !visible(e)) continue;
      let scroller = null; for (let p = e.parentElement; p && p !== root.parentElement; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll') { scroller = p; break; } }
      if (scroller) continue; // bảng rộng được cuộn ngang có chủ đích
      const r = e.getBoundingClientRect(); if (!r.width) continue;
      if (r.left < rr.left - 0.5 || r.right > rr.right + 0.5) out.push({ kind: 'clip', detail: `${label(e)} tràn khung hình ${Math.round(Math.max(rr.left - r.left, r.right - rr.right))} px` });
      if (e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible') out.push({ kind: 'clip', detail: `${label(e)} chữ bị cắt trong ô` });
    }
  }
  // Quy trình: mỗi mũi tên phải chỉ về bước kế tiếp (→ khi bước kế bên phải cùng hàng, ↓ khi bước kế ở dưới);
  // mũi tên cuối hàng chỉ vào khoảng trống (bước kế đã xuống dòng) cũng tính lỗi
  function checkFlow(root, out) {
    root.querySelectorAll('.proc').forEach(proc => {
      [...proc.querySelectorAll('.parrow')].forEach(ar => {
        const prev = ar.previousElementSibling, next = ar.nextElementSibling; if (!prev || !next) return;
        const a = ar.getBoundingClientRect(), p = prev.getBoundingClientRect(), n = next.getBoundingClientRect();
        const m = new DOMMatrix(getComputedStyle(ar).transform === 'none' ? undefined : getComputedStyle(ar).transform);
        const down = Math.abs(m.b) > 0.7; // xoay ~90° → chỉ xuống
        const nextRight = n.left >= p.right - 1 && Math.abs((n.top + n.bottom) / 2 - (p.top + p.bottom) / 2) < p.height / 2;
        const nextBelow = n.top >= p.bottom - 1;
        if (nextRight && down) out.push({ kind: 'flow', detail: `mũi tên sau ${label(prev)} chỉ xuống nhưng bước kế ở bên phải` });
        else if (!nextRight && nextBelow && !down) out.push({ kind: 'flow', detail: `mũi tên sau ${label(prev)} chỉ ngang nhưng bước kế ở dòng dưới` });
        if (a.width && (a.right > proc.getBoundingClientRect().right + 0.5)) out.push({ kind: 'clip', detail: `mũi tên sau ${label(prev)} tràn khung` });
      });
    });
  }
  window.FigureLayout = {
    check(root) { const out = []; root.querySelectorAll('svg[viewBox]').forEach(s => checkSvg(s, out)); checkHtml(root, out); checkFlow(root, out); return out; },
  };
})();
