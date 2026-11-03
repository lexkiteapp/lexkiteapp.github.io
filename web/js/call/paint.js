/* 🖌️ LipPaint – vẽ lớp mặt LipFace lên MỘT <canvas> (Path2D) thay vì vá DOM SVG mỗi khung (docs/LESSON-ENGINE.md §Khớp miệng §fps).
 * Gốc fps thấp cũ: mỗi khung đổi nút/thuộc tính SVG trong #view → tính lại style + mọi MutationObserver của app chạy (ui.js toastLift, app.js edgeFade…).
 * Canvas: 0 thay đổi DOM mỗi khung → không style/layout, không observer; chỉ vẽ lại khi trạng thái đổi thấy được.
 * Hình học giữ MỘT nguồn: LipFace.parts()/LipMouth.svg() (chuỗi SVG – cũng dùng cho bảng duyệt, drawn_frames.mjs, video). Ở đây chỉ dịch tập con SVG mà
 * chính các hàm đó sinh ra (g/clipPath/path/ellipse/circle/rect, fill/stroke/opacity/display/transform translate) → lệnh canvas; biên dịch 1 lần mỗi chuỗi (đệm LRU nhỏ).
 * Thuần trừ draw(): compile() chạy được trong Node (scripts/test/lipsync.mjs so khớp tập lệnh). */
(function (g) {
  const TAG = /<(\/?)([a-zA-Z]+)((?:\s+[a-zA-Z-]+="[^"]*")*)\s*(\/?)>/g, ATTR = /([a-zA-Z-]+)="([^"]*)"/g;
  const attrs = s => { const o = {}; let m; ATTR.lastIndex = 0; while ((m = ATTR.exec(s))) o[m[1]] = m[2]; return o; };
  const P2 = typeof Path2D !== 'undefined' ? Path2D : null;
  // hình → mô tả đường (Path2D dựng lười khi vẽ – Node không có Path2D)
  const shape = (t, a) => t === 'path' ? { d: a.d || '' } : t === 'ellipse' ? { e: [+a.cx || 0, +a.cy || 0, +a.rx || 0, +a.ry || 0] } : t === 'circle' ? { e: [+a.cx || 0, +a.cy || 0, +a.r || 0, +a.r || 0] }
    : t === 'rect' ? { r: [+a.x || 0, +a.y || 0, +a.width || 0, +a.height || 0] } : null;
  /** Chuỗi SVG (tập con LipFace) → danh sách lệnh: {op:'save'|'restore'|'clip'|'tr'|'fill'|'stroke', …}. Bỏ qua nhánh display="none". */
  function compile(svg) {
    const ops = [], clips = {}, stack = []; let m, skip = 0, inClip = null; TAG.lastIndex = 0;
    while ((m = TAG.exec(svg))) {
      const [, close, t, as, self] = m;
      if (close) { // </g> | </clipPath>
        if (t === 'clipPath') { inClip = null; continue; }
        if (t === 'g') { if (skip) { skip--; continue; } if (stack.pop()) ops.push({ op: 'restore' }); }
        continue;
      }
      const a = attrs(as);
      if (skip) { if (t === 'g' && !self) skip++; continue; }
      if (t === 'clipPath') { inClip = clips[a.id] = []; continue; }
      if (inClip) { const s = shape(t, a); if (s) inClip.push(s); continue; }
      if (a.display === 'none') { if (t === 'g' && !self) skip = 1; continue; }
      if (t === 'g') {
        if (self) continue;
        const cl = /url\(#([^)]+)\)/.exec(a['clip-path'] || ''), tr = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(a.transform || '');
        const need = !!(cl || tr); stack.push(need);
        if (need) { ops.push({ op: 'save' }); if (tr) ops.push({ op: 'tr', x: +tr[1], y: +tr[2] }); if (cl) ops.push({ op: 'clip', s: clips[cl[1]] || [] }); }
        continue;
      }
      const s = shape(t, a); if (!s) continue;
      const al = a.opacity != null ? +a.opacity : 1;
      if (a.fill && a.fill !== 'none') ops.push({ op: 'fill', s, c: a.fill, al });
      if (a.stroke && a.stroke !== 'none') ops.push({ op: 'stroke', s, c: a.stroke, w: +a['stroke-width'] || 1, cap: a['stroke-linecap'] || 'butt', join: a['stroke-linejoin'] || 'miter', al });
    }
    return ops;
  }
  const path = s => { if (s.p) return s.p; const p = new P2(); if (s.d != null) p.addPath(new P2(s.d)); else if (s.e) p.ellipse(s.e[0], s.e[1], s.e[2], s.e[3], 0, 0, Math.PI * 2); else if (s.r) p.rect(s.r[0], s.r[1], s.r[2], s.r[3]); return (s.p = p); };
  const cache = new Map(), MAX = 400;
  const get = svg => { let o = cache.get(svg); if (o) return o; o = compile(svg); if (cache.size >= MAX) cache.delete(cache.keys().next().value); cache.set(svg, o); return o; };
  /** Vẽ chuỗi SVG lên ctx (hệ tọa độ hiện tại = tọa độ chuỗi). */
  function draw(ctx, svg) {
    for (const o of get(svg)) {
      if (o.op === 'save') ctx.save();
      else if (o.op === 'restore') ctx.restore();
      else if (o.op === 'tr') ctx.translate(o.x, o.y);
      else if (o.op === 'clip') { const p = new P2(); for (const s of o.s) p.addPath(path(s)); ctx.clip(p); }
      else { ctx.globalAlpha = o.al; if (o.op === 'fill') { ctx.fillStyle = o.c; ctx.fill(path(o.s)); } else { ctx.strokeStyle = o.c; ctx.lineWidth = o.w; ctx.lineCap = o.cap; ctx.lineJoin = o.join; ctx.stroke(path(o.s)); } ctx.globalAlpha = 1; }
    }
  }
  const api = { compile, draw };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else g.LipPaint = api;
})(typeof window !== 'undefined' ? window : globalThis);
