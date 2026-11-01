// Quét bố cục trong trang (chạy qua page.evaluate) – lõi chung của gác bố cục: thuật toán của scripts/test/ux-guard.mjs (PR #179), tham số hóa
// gốc quét + bộ chọn để dùng cho app học lẫn trang quản trị. Trả về { overlap, clip, spill, dup, svgtext }:
//  overlap: thẻ/nút/ô chữ chồng nhau > 4 px · clip: bị khung overflow:hidden hoặc mép màn hình cắt (khung CUỘN ngang thì được)
//  spill: chữ tràn khỏi nút/chip · dup: cùng IPA/loa 2 lần trong một khối · svgtext: chữ trong SVG bị phóng/co theo viewBox (cao > 24 px hoặc < 7 px)
// Ngoại lệ có chủ đích: badge/chấm định vị tuyệt đối < 48 px, mặt sau thẻ lật (.flash .face), [data-ov-ok], phần tử fixed/sticky.
export const APP_SEL = '.card, .btn, button, a.chip, .chip, input, select, textarea, .icon-btn, h1, h2, h3, .tabs, .quest-line, .hub-card';
export const ADMIN_SEL = APP_SEL + ', .kpi, .vid-box, .vid-row, .ach-x.xw, .ach-v, .ach-gl em, .pg-t, .side-a, table';

export function scan({ root = '#view', sel = APP_SEL, okScroll = '' } = {}) {
  const W = innerWidth, out = { overlap: [], clip: [], spill: [], dup: [], svgtext: [] };
  const lab = el => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ` "${(el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24)}"`;
  const cs = el => getComputedStyle(el);
  const shown = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const s = cs(e); if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < .05) return false; if (e.matches('[data-ov-ok], .flash .face, .skel, details:not([open]) > :not(summary)') || (e !== el && e.matches('[aria-hidden="true"]:not(.ach-cs):not(.ach-g)'))) return false; } return true; };
  const floating = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = cs(e).position; if (p === 'fixed' || p === 'sticky') return true; } return false; };
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
  const scope = [...document.querySelectorAll(root)];
  const all = scope.flatMap(s => [...s.querySelectorAll('*')]);
  const els = all.filter(el => el.matches(sel) && shown(el) && !floating(el)).map(el => ({ el, ...visRect(el) })).filter(x => x.r.r - x.r.l > 1 && x.r.b - x.r.t > 1);
  const inScroll = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) if (/auto|scroll/.test(cs(e).overflowX) || (okScroll && e.matches(okScroll))) return true; return false; };
  for (const x of els) {
    const s = cs(x.el), small = x.full.width < 48 && x.full.height < 48 && /absolute/.test(s.position);
    if (x.cut && !small) out.clip.push(`${lab(x.el)} cắt bởi ${lab(x.cut)}`);
    if (!inScroll(x.el) && (x.full.left < -1 || x.full.right > W + 1)) out.clip.push(`${lab(x.el)} ra ngoài màn hình ${Math.round(x.full.left)}..${Math.round(x.full.right)}`);
    if (x.el.matches('button, .btn, .chip, a.chip, .quest-line, .tabs button') && s.overflow === 'visible') {
      const rg = document.createRange(); rg.selectNodeContents(x.el); const tb = rg.getBoundingClientRect();
      if (tb.width && (tb.left < x.full.left - 2 || tb.right > x.full.right + 2)) out.spill.push(`${lab(x.el)} chữ ${Math.round(tb.width)} > hộp ${Math.round(x.full.width)}`);
    }
  }
  const badge = x => x.full.width < 48 && x.full.height < 48 && /absolute/.test(cs(x.el).position) && !x.el.matches('.ach-x, .ach-v, .ach-gl em');
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i], b = els[j]; if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
    const ix = Math.min(a.r.r, b.r.r) - Math.max(a.r.l, b.r.l), iy = Math.min(a.r.b, b.r.b) - Math.max(a.r.t, b.r.t);
    if (ix <= 4 || iy <= 4) continue;
    if (badge(a) || badge(b)) continue;
    out.overlap.push(`${lab(a.el)} ✕ ${lab(b.el)} ${Math.round(ix)}×${Math.round(iy)}`);
  }
  for (const s of scope) for (const blk of s.querySelectorAll('.card, section, .sheet')) {
    if (blk.closest('.flash') || blk.querySelector('.card, section')) continue;
    const ipa = [...blk.querySelectorAll('.ipa, .sipa')].filter(shown).map(e => e.textContent.trim()).filter(Boolean);
    const say = [...blk.querySelectorAll('[data-speak], [data-speak-text], [data-sayw]')].filter(shown).map(e => (e.dataset.speak || e.dataset.speakText || '#sayw').toLowerCase());
    if (new Set(ipa).size < ipa.length || new Set(say).size < say.length) out.dup.push(`${lab(blk)} IPA ${ipa.length} · loa ${say.length}`);
  }
  // chữ SVG co giãn theo viewBox (vd. viewBox 76 px kéo rộng 600 px → chữ 10 px thành 80 px, ngày đè nhau)
  for (const t of all.filter(e => e.tagName === 'text' && e.textContent.trim() && shown(e))) {
    const h = t.getBoundingClientRect().height; if (h > 24 || (h > 0 && h < 7)) out.svgtext.push(`${lab(t.closest('svg') || t)} chữ "${t.textContent.trim().slice(0, 10)}" cao ${Math.round(h)} px`);
  }
  for (const k in out) out[k] = [...new Set(out[k])].slice(0, 15);
  return out;
}
