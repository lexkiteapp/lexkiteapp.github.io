// 🛡️ Lõi dùng chung của gác bố cục: phục vụ web/ không mạng (page.route) + hàm quét chạy trong trang.
// Dùng bởi scripts/test/ux-guard.mjs (giao diện cũ) và scripts/test/ux1-guard.mjs (ux1 + bài học + giữ chuỗi).
import fs from 'node:fs'; import path from 'node:path';
export const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm' };

// https://lk.test/<p> → ROOT/<p>; /api/* → {} ; mọi host khác bị chặn (0 lượt chạm prod)
export async function serve(ctx, ROOT) {
  await ctx.route('**/*', r => { const u = new URL(r.request().url()); if (u.hostname !== 'lk.test') return r.abort(); let p = decodeURIComponent(u.pathname); if (p.startsWith('/api/')) return r.fulfill({ status: 200, body: '{}', contentType: 'application/json' }); if (p.endsWith('/')) p += 'index.html'; const f = path.join(ROOT, p); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: MIME[path.extname(f)] || 'application/octet-stream' }); });
}

// Chạy trong trang. o.roots: các khung cần quét · o.layers: so chồng lấn trong từng lớp fixed/sticky (thanh dưới, chân bài học, cột phải)
// · luôn: #view không được hẹp hơn min(560, màn − 48) px · o.cover: cuộn tới cuối rồi tìm nút/ô bị thanh cố định phía dưới che mất (không bao giờ bấm được).
export function scan(o = {}) {
  const ROOTS = o.roots || ['#view'], LAYERS = !!o.layers, COVER = !!o.cover;
  const W = innerWidth, out = { overlap: [], clip: [], spill: [], dup: [], cover: [], squeeze: [] };
  // khung nội dung bị ép hẹp (vd. lưới 3 cột ẩn thanh bên nhưng vẫn giữ cột 232 px → bài học/Ôn rơi vào cột hẹp)
  const VW = document.getElementById('view'); if (VW && !document.querySelector('#modal:not([hidden])')) { const w = VW.getBoundingClientRect().width; if (w < Math.min(560, W - 48)) out.squeeze.push(`#view rộng ${Math.round(w)} px / màn ${W} px`); }
  const lab = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ` "${(el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`;
  const cs = el => getComputedStyle(el);
  const shown = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = cs(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; if (e.matches('[data-ov-ok], .flash .face, .skel, [aria-hidden="true"], details:not([open]) > :not(summary)')) return false; } return true; };
  const fixedish = e => /fixed|sticky/.test(cs(e).position);
  // lớp = tổ tiên fixed/sticky gần nhất (kể cả chính nó) trong khung; không có → chính khung
  const layerOf = (el, root) => { for (let e = el; e && e !== root; e = e.parentElement) if (fixedish(e)) return e; return root; };
  const visRect = el => {
    const b = el.getBoundingClientRect(); let r = { l: b.left, t: b.top, r: b.right, b: b.bottom }, cut = null;
    for (let e = el.parentElement; e && e !== document.documentElement; e = e.parentElement) {
      const s = cs(e); if (s.overflowX === 'visible' && s.overflowY === 'visible') continue;
      const p = e.getBoundingClientRect(), scroll = /auto|scroll/.test(s.overflowX + s.overflowY);
      const n = { l: Math.max(r.l, p.left), t: Math.max(r.t, p.top), r: Math.min(r.r, p.right), b: Math.min(r.b, p.bottom) };
      if (!scroll && !cut && (n.r - n.l < r.r - r.l - 2 || n.b - n.t < r.b - r.t - 2) && n.r > n.l && n.b > n.t) cut = e;
      r = n;
    }
    return { r, cut, full: b };
  };
  const SEL = '.card, .btn, button, a.chip, .chip, input, select, textarea, .icon-btn, h1, h2, h3, .tabs, .quest-line, .hub-card'
    + (LAYERS ? ', #bnav a, #nav a, .lsn-opt, .lsn-tile, .lsn-dot, .lsn-bub, .lsn-fb, .lsn-in, .lsn-pic, .ux1-tile, .ux1-chip, .ux1-unit, .ux1-lbl, .ret-tile, .ret-ice, .ret-chip, .ret-day' : '');
  const modal = document.querySelector('#modal:not([hidden])');
  const roots = (modal ? ['#modal'] : ROOTS).map(s => document.querySelector(s)).filter(r => r && shown(r));
  const els = [];
  for (const root of roots) for (const el of root.querySelectorAll('*')) {
    if (!el.matches(SEL) || !shown(el)) continue;
    const ly = layerOf(el, root);
    if (!LAYERS && ly !== root) continue; // chế độ cũ: bỏ qua mọi thứ fixed/sticky
    const v = visRect(el); if (v.r.r - v.r.l > 1 && v.r.b - v.r.t > 1) els.push({ el, root, ly, ...v });
  }
  const badge = x => x.full.width < 48 && x.full.height < 48 && /absolute/.test(cs(x.el).position);
  for (const x of els) {
    const s = cs(x.el);
    if (x.cut && !badge(x)) out.clip.push(`${lab(x.el)} cắt bởi ${lab(x.cut)}`);
    let inScroll = false; for (let e = x.el.parentElement; e && e !== document.body; e = e.parentElement) if (/auto|scroll/.test(cs(e).overflowX)) { inScroll = true; break; }
    if (!inScroll && (x.full.left < -1 || x.full.right > W + 1)) out.clip.push(`${lab(x.el)} ra ngoài màn hình ${Math.round(x.full.left)}..${Math.round(x.full.right)}`);
    if (x.el.matches('button, .btn, .chip, a.chip, .quest-line, .tabs button, .lsn-opt, .lsn-tile, .ux1-chip, #bnav a') && s.overflow === 'visible') {
      const rg = document.createRange(); rg.selectNodeContents(x.el); const tb = rg.getBoundingClientRect();
      if (tb.width && (tb.left < x.full.left - 2 || tb.right > x.full.right + 2)) out.spill.push(`${lab(x.el)} chữ ${Math.round(tb.width)} > hộp ${Math.round(x.full.width)}`);
    }
  }
  // chồng lấn: cùng lớp; riêng nội dung chính ↔ cột phải ux1 cũng phải tách rời (bố cục 3 cột)
  const pair = (a, b) => a.ly === b.ly || (LAYERS && [a.root.id, b.root.id].sort().join() === 'ux1Rail,view' && (a.ly === a.root || a.ly.id === 'ux1Rail') && (b.ly === b.root || b.ly.id === 'ux1Rail'));
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j]; if (a.el.contains(b.el) || b.el.contains(a.el) || !pair(a, b)) continue;
    const ix = Math.min(a.r.r, b.r.r) - Math.max(a.r.l, b.r.l), iy = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t);
    if (ix <= 4 || iy <= 4 || badge(a) || badge(b)) continue;
    out.overlap.push(`${lab(a.el)} ✕ ${lab(b.el)} ${Math.round(ix)}×${Math.round(iy)}`);
  }
  // cùng IPA / loa của cùng một từ 2 lần trong một khối
  for (const root of roots) for (const blk of root.querySelectorAll('.card, section, .sheet, .lsn-fb, .modal-box')) {
    if (blk.closest('.flash') || blk.querySelector('.card, section')) continue;
    const ipa = [...blk.querySelectorAll('.ipa, .sipa')].filter(shown).map(e => e.textContent.trim()).filter(Boolean);
    const say = [...blk.querySelectorAll('[data-speak], [data-speak-text], [data-sayw]')].filter(shown).map(e => (e.dataset.speak || e.dataset.speakText || '#sayw').toLowerCase());
    if (new Set(ipa).size < ipa.length || new Set(say).size < say.length) out.dup.push(`${lab(blk)} IPA ${ipa.length} · loa ${say.length}`);
  }
  // bị che: ở cuối trang mà nút vẫn nằm dưới thanh cố định phía dưới → không cách nào bấm được
  if (COVER && !modal) {
    const se = document.scrollingElement; se.scrollTop = se.scrollHeight;
    const V = document.getElementById('view'); if (V) V.scrollTop = V.scrollHeight;
    for (const root of roots) for (const el of root.querySelectorAll('button, a[href], input, select, textarea, .lsn-opt, .lsn-tile')) {
      if (!shown(el) || layerOf(el, root) !== root) continue;
      const b = el.getBoundingClientRect(); if (b.width < 2 || b.height < 2) continue;
      const cx = Math.min(Math.max(b.left + b.width / 2, 1), W - 1), cy = b.top + b.height / 2; if (cy < 0 || cy > innerHeight) continue;
      const hit = document.elementFromPoint(cx, cy); if (!hit || el.contains(hit) || hit.contains(el) || hit.closest('.toast, #toast')) continue;
      let ly = null; for (let e = hit; e && e !== document.body; e = e.parentElement) if (fixedish(e)) { ly = e; break; }
      if (ly && ly.getBoundingClientRect().top > innerHeight / 2) out.cover.push(`${lab(el)} bị ${lab(ly)} che`);
    }
    se.scrollTop = 0; if (V) V.scrollTop = 0;
  }
  for (const k in out) out[k] = [...new Set(out[k])].slice(0, 15);
  return out;
}
