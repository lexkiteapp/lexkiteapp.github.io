// Quét bố cục trong trang (chạy qua page.evaluate) – lõi chung của gác bố cục: thuật toán của scripts/test/ux-guard.mjs (PR #179), tham số hóa
// gốc quét + bộ chọn để dùng cho app học lẫn trang quản trị. Trả về { overlap, clip, spill, dup, svgtext }:
//  overlap: thẻ/nút/ô chữ chồng nhau > 4 px · clip: bị khung overflow:hidden hoặc mép màn hình cắt (khung CUỘN ngang thì được)
//  spill: chữ tràn khỏi nút/chip · dup: cùng IPA/loa 2 lần trong một khối · svgtext: chữ trong SVG bị phóng/co theo viewBox (cao > 24 px hoặc < 7 px)
//  box (khi truyền boxes): phần tử/chữ lòi ra ngoài viền thẻ cha (không nằm trong vùng cuộn ngang) – ca bảng Nền tảng owner 3/11
//  trunc (khi truyền boxes): chữ bị cắt "…"/line-clamp mà không có title/aria-label → mất thông tin (ca tên nước "CN · C…")
//  stack · cell · orphan (luôn chạy, owner 5/11 bảng #users): chữ xếp dọc từng ký tự · ô bảng display≠table-cell / cột rộng thừa · nhãn tách khỏi control hoặc nhóm lọc trộn kiểu nhãn
//  – tự kiểm: scripts/lib/layout-scan-selftest.mjs (web-sweep chạy trước khi quét)
// Ngoại lệ có chủ đích: badge/chấm định vị tuyệt đối < 48 px, mặt sau thẻ lật (.flash .face), [data-ov-ok], phần tử fixed/sticky.
export const APP_SEL = '.card, .btn, button, a.chip, .chip, input, select, textarea, .icon-btn, h1, h2, h3, .tabs, .quest-line, .hub-card';
export const ADMIN_SEL = APP_SEL + ', .kpi, .vid-box, .vid-row, .ach-x.xw, .ach-v, .ach-gl em, .pg-t, .side-a, table';

export function scan({ root = '#view', sel = APP_SEL, okScroll = '', boxes = '' } = {}) {
  const W = innerWidth, out = { overlap: [], clip: [], spill: [], dup: [], svgtext: [], ...(boxes ? { box: [], trunc: [] } : {}) };
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
  if (boxes) {
    const scrolls = (e, stop) => { for (let p = e.parentElement; p && p !== stop; p = p.parentElement) if (/auto|scroll|hidden|clip/.test(cs(p).overflowX) || (okScroll && p.matches(okScroll))) return true; return false; };
    const pop = e => e.closest('dialog, [popover], [role="tooltip"], [role="menu"], [role="listbox"], .sr-only, .visually-hidden');
    const own = [...new Set(scope.flatMap(s => [...s.querySelectorAll(boxes)]))].filter(b => shown(b) && !floating(b));
    for (const b of own) {
      const br = b.getBoundingClientRect(); if (br.width < 2) continue;
      const kids = [...b.querySelectorAll('*')].filter(e => !e.closest('svg') || e.tagName === 'svg');
      for (const e of kids) {
        if (e.closest(boxes) !== b || pop(e) || !shown(e) || floating(e) || scrolls(e, b)) continue;
        const s = cs(e), r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
        if (/absolute/.test(s.position) && r.width < 48 && r.height < 48) continue;
        if (r.right > br.right + 1 || r.left < br.left - 1) out.box.push(`${lab(e)} lòi ra ngoài ${lab(b)} ${Math.round(r.left - br.left)}..${Math.round(r.right - br.right)} px`);
        const tip = () => { for (let p = e; p && p !== b.parentElement; p = p.parentElement) if (p.getAttribute('title') || p.getAttribute('aria-label') || p.getAttribute('data-tip')) return true; return false; };
        const ell = s.textOverflow === 'ellipsis' && /hidden|clip/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 1;
        const clamp = s.webkitLineClamp && s.webkitLineClamp !== 'none' && e.scrollHeight > e.clientHeight + 1;
        if ((ell || clamp) && e.textContent.trim() && !tip()) out.trunc.push(`${lab(e)} bị cắt chữ (${e.scrollWidth}/${e.clientWidth} px) không có title`);
      }
      const tw = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      for (let t; (t = tw.nextNode());) {
        const pe = t.parentElement; if (!t.textContent.trim() || !pe || pe.closest(boxes) !== b || pe.closest('svg') || pop(pe) || !shown(pe) || floating(pe) || scrolls({ parentElement: pe }, b)) continue;
        const rg = document.createRange(); rg.selectNodeContents(t); const r = rg.getBoundingClientRect();
        if (r.width && (r.right > br.right + 1 || r.left < br.left - 1)) out.box.push(`chữ "${t.textContent.trim().slice(0, 24)}" (${lab(pe)}) lòi ra ngoài ${lab(b)} ${Math.round(r.right - br.right)} px`);
      }
    }
  }
  // ── Lỗi ẩn loại "bảng/lọc vỡ" (owner 5/11, #users 1900 px: tên xếp dọc từng chữ, cột ô chọn rộng trống, badge lệch hàng, nhãn "to" tách khỏi ô ngày).
  // Gốc thường gặp: min-width nhắm nhầm cột, overflow-wrap:anywhere cho min-content ≈ 1 ký tự, td display:flex (không còn là ô bảng), nhãn đổi hướng giữa nhóm lọc.
  //  stack: chữ xếp dọc – ≥ 3 dòng, ≤ 3 ký tự/dòng, số dòng > 2 × số từ (CJK câu thường ≥ 5 ký tự/dòng nên không dính)
  //  cell:  ô td/th trong bảng thật mà display ≠ table-cell · cột rộng thừa (rộng/nội dung gấp ≥ 3 lần trung vị các cột khác và dư > 120 px)
  //  orphan: chữ nhãn cách xa control (> 24 px) / nằm ở dòng khác mà không ngay trên control · nhóm lọc trộn kiểu nhãn bên cạnh với nhãn bên trên
  const hid = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { if (e.matches('.sr-only, .visually-hidden, [data-ov-ok]')) return true; const s = cs(e); if (s.clip !== 'auto' && s.clip !== '' && /absolute|fixed/.test(s.position)) return true; if (/vertical/.test(s.writingMode)) return true; } return false; };
  const lineTops = rects => { const ts = [...rects].filter(x => x.width > 0 && x.height > 0).map(x => x.top).sort((a, b) => a - b), o = []; for (const t of ts) if (!o.length || t - o[o.length - 1] > 2) o.push(t); return o.length; };
  out.stack = []; out.cell = []; out.orphan = [];
  for (const s of scope) {
    const tw = document.createTreeWalker(s, NodeFilter.SHOW_TEXT);
    for (let t; (t = tw.nextNode());) {
      const txt = t.textContent.trim(), pe = t.parentElement; if (txt.length < 6 || !pe || pe.closest('svg, script, style') || !shown(pe) || hid(pe)) continue;
      const rg = document.createRange(); rg.selectNodeContents(t); const lines = lineTops(rg.getClientRects()), words = txt.split(/\s+/).length;
      if (lines >= 3 && txt.length / lines <= 3 && lines > words * 2) out.stack.push(`${lab(pe)} chữ xếp dọc "${txt.slice(0, 18)}" ${lines} dòng / ${words} từ (rộng ${Math.round(pe.getBoundingClientRect().width)} px)`);
    }
  }
  const tables = [...new Set(scope.flatMap(s => [...s.querySelectorAll('table')]))].filter(t => shown(t) && !hid(t) && cs(t).display === 'table' && t.getBoundingClientRect().width > 1);
  for (const t of tables) {
    const tl = lab(t).split(' "')[0], rows = [...t.rows].filter(r => cs(r).display === 'table-row' && shown(r));
    for (const r of rows) for (const c of r.cells) { const d = cs(c).display; if (d !== 'table-cell' && d !== 'none') { out.cell.push(`${tl} hàng ${r.rowIndex} ô ${c.cellIndex} display:${d} – không còn là ô bảng (lệch hàng/cột)`); break; } }
    const full = rows.filter(r => [...r.cells].every(c => c.colSpan === 1)), n = Math.max(0, ...full.map(r => r.cells.length)); if (n < 3) continue;
    const cols = [];
    for (let i = 0; i < n; i++) {
      let w = 0, content = 0;
      for (const r of full) {
        const c = r.cells[i]; if (!c) continue; const b = c.getBoundingClientRect(), p = cs(c); w = Math.max(w, b.width - parseFloat(p.paddingLeft) - parseFloat(p.paddingRight));
        // bề rộng nội dung = khoảng từ mép trái nhất tới mép phải nhất của chữ/phần tử con (khối con lấp ô → coi như đầy, không báo)
        const rg = document.createRange(); rg.selectNodeContents(c); let l = Infinity, rr = -Infinity;
        for (const x of rg.getClientRects()) if (x.width > 0 && x.height > 0) { l = Math.min(l, x.left); rr = Math.max(rr, x.right); }
        if (rr > l) content = Math.max(content, rr - l);
      }
      cols.push({ i, w, content: Math.max(content, 1) });
    }
    const ratio = cols.map(c => c.w / c.content);
    for (const c of cols) {
      const others = ratio.filter((_, j) => j !== c.i).sort((a, b) => a - b), med = others[others.length >> 1] || 1;
      if (c.w - c.content > 120 && c.w / c.content >= 3 * Math.max(1, med)) out.cell.push(`${tl} cột ${c.i} rộng ${Math.round(c.w)} px cho nội dung ${Math.round(c.content)} px (cột khác ×${med.toFixed(1)}) – cột thừa, cột khác bị bóp`);
    }
  }
  const ctlOf = l => l.control || (l.htmlFor && document.getElementById(l.htmlFor)) || l.querySelector('input, select, textarea');
  const textRect = (l, ctl) => { let r = null; const tw = document.createTreeWalker(l, NodeFilter.SHOW_TEXT); for (let t; (t = tw.nextNode());) { if (!t.textContent.trim() || (ctl && ctl.contains(t)) || t.parentElement.closest('select, option, .sr-only, .visually-hidden') || !shown(t.parentElement)) continue; const rg = document.createRange(); rg.selectNodeContents(t); let b = rg.getBoundingClientRect(); const pe = t.parentElement, ps = cs(pe); if (ps.overflowX !== 'visible') { const q = pe.getBoundingClientRect(); b = { left: Math.max(b.left, q.left), top: b.top, right: Math.min(b.right, q.right), bottom: b.bottom, width: Math.min(b.right, q.right) - Math.max(b.left, q.left) }; } if (!(b.width > 0)) continue; r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) } : { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; } return r; };
  const groups = new Map();
  for (const l of new Set(scope.flatMap(s => [...s.querySelectorAll('label')]))) {
    const ctl = ctlOf(l); if (!ctl || !shown(l) || !shown(ctl) || hid(l) || floating(l) || /checkbox|radio|hidden/.test(ctl.type || '')) continue;
    // control nằm ngoài nhãn (label for=…): so KHỐI chứa nhãn với KHỐI chứa control dưới tổ tiên chung (vd. nhãn + chip ở .fld-top, thanh trượt + ô số ở .range-row)
    let tr = textRect(l, ctl), cb = ctl.getBoundingClientRect();
    if (!l.contains(ctl)) { let a = l.parentElement; while (a && !a.contains(ctl)) a = a.parentElement; const kid = e => { while (e && e.parentElement !== a) e = e.parentElement; return e; }; const lb = kid(l), kb = kid(ctl); if (a && lb && kb && lb !== kb) { const q = lb.getBoundingClientRect(); if (tr) tr = { left: tr.left, top: q.top, right: tr.right, bottom: q.bottom }; cb = kb.getBoundingClientRect(); } }
    if (!tr || !cb.width) continue;
    const vOver = Math.min(tr.bottom, cb.bottom) - Math.max(tr.top, cb.top), hOver = Math.min(tr.right, cb.right) - Math.max(tr.left, cb.left);
    const name = `nhãn "${(l.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 20)}"`;
    let kind;
    if (vOver > 2) { kind = 'side'; const gap = tr.right <= cb.left ? cb.left - tr.right : tr.left - cb.right; if (gap > 24) out.orphan.push(`${name} cách control ${Math.round(gap)} px`); }
    else if (tr.bottom <= cb.top + 2 && hOver > -8 && tr.left >= cb.left - 8) { kind = 'above'; if (cb.top - tr.bottom > 24) out.orphan.push(`${name} cách control ${Math.round(cb.top - tr.bottom)} px phía trên`); }
    else { out.orphan.push(`${name} tách khỏi control (chữ ${Math.round(tr.left)},${Math.round(tr.top)} · control ${Math.round(cb.left)},${Math.round(cb.top)})`); continue; }
    const g = l.parentElement; if (!groups.has(g)) groups.set(g, []); groups.get(g).push([kind, name]);
  }
  for (const [g, ls] of groups) {
    if (ls.length < 3) continue; const side = ls.filter(x => x[0] === 'side'), above = ls.filter(x => x[0] === 'above');
    if (side.length && above.length) { const few = side.length < above.length ? side : above; out.orphan.push(`${lab(g).split(' "')[0]}: nhóm lọc trộn kiểu nhãn (${side.length} bên cạnh · ${above.length} bên trên) – lệch: ${few.map(x => x[1]).join(', ').slice(0, 80)}`); }
  }
  for (const k in out) out[k] = [...new Set(out[k])].slice(0, 15);
  return out;
}
