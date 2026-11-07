// Gác bảng + màu bản đồ quản trị (owner 4/11: #users cột tên 1 ký tự, ô chọn lệch, ô trạng thái lệch; #analytics nước 0 khách trùng màu nhóm 1).
// tableScan chạy trong trang (page.evaluate) cho MỌI bảng dạng bảng ở .adm-content; hàm màu thuần để dùng cả trong test tĩnh admin-map-colors.mjs.
export function tableScan() {
  const out = [], vis = e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
  for (const t of document.querySelectorAll('.adm-content table:not(.tbl-cards)')) {
    if (!vis(t) || !t.tHead || !t.tBodies[0]) continue;
    const head = t.tHead.rows[t.tHead.rows.length - 1], name = t.className || t.closest('[id]')?.id || 'table', strict = t.matches('.u-tbl');
    const rows = [...t.tBodies[0].rows].filter(r => [...r.cells].every(c => c.colSpan === 1));
    if (rows.length && [...head.cells].some(c => c.colSpan > 1)) continue;
    for (const r of rows) {
      const rb = r.getBoundingClientRect();
      [...r.cells].forEach((c, i) => {
        const h = head.cells[i], cb = c.getBoundingClientRect(), lab = `${name} hàng ${r.rowIndex} cột ${i}`; if (!h || !vis(c)) return;
        const hb = h.getBoundingClientRect(), d = getComputedStyle(c).display;
        if (d !== 'table-cell') out.push(`${lab}: ô display:${d} (không còn là ô bảng, lệch cột và lệch nền)`);
        else if (Math.abs(cb.height - rb.height) > 2) out.push(`${lab}: ô cao ${Math.round(cb.height)}/${Math.round(rb.height)} px của hàng`);
        if (Math.abs(cb.left - hb.left) > 1.5 || Math.abs(cb.width - hb.width) > 1.5) out.push(`${lab}: lệch tiêu đề (ô ${Math.round(cb.left)}+${Math.round(cb.width)}, tiêu đề ${Math.round(hb.left)}+${Math.round(hb.width)})`);
        // chữ xếp dọc: nhiều dòng, mỗi dòng vài ký tự, số dòng hơn số từ (tức là từ bị bẻ giữa chừng)
        const tw = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
        for (let n; (n = tw.nextNode());) {
          const txt = n.textContent.trim(); if (txt.length < 8) continue;
          const rg = document.createRange(); rg.selectNodeContents(n);
          const lines = new Set([...rg.getClientRects()].filter(x => x.width > 0).map(x => Math.round(x.top))).size;
          if (lines >= 3 && txt.length / lines <= 4 && lines > txt.split(/\s+/).length) { out.push(`${lab}: chữ xếp dọc "${txt.slice(0, 16)}…" (${lines} dòng)`); break; }
        }
      });
      if (strict && rb.height > 120) out.push(`${name} hàng ${r.rowIndex}: cao ${Math.round(rb.height)} px (> 120)`);
    }
    if (!strict || !rows.length) continue;
    // Bảng Người dùng: ô chọn thẳng tâm ô tiêu đề, chữ tiêu đề thẳng mép nội dung ô, tên dài cắt "…" có title
    const mid = e => { const b = e.getBoundingClientRect(); return b.left + b.width / 2; }, hc = head.querySelector('input'), first = rows[0];
    const ck = first.querySelector('input'); if (hc && ck && Math.abs(mid(hc) - mid(ck)) > 1.5) out.push(`${name}: ô chọn lệch tiêu đề ${Math.round(mid(ck) - mid(hc))} px`);
    if (t.querySelector('td.u-ckc') && t.querySelector('td.u-ckc').getBoundingClientRect().width > 72) out.push(`${name}: cột ô chọn rộng ${Math.round(t.querySelector('td.u-ckc').getBoundingClientRect().width)} px`);
    const hu = head.cells[1].querySelector('button, span') || head.cells[1], cu = first.querySelector('.u-who');
    if (cu && Math.abs(hu.getBoundingClientRect().left - cu.getBoundingClientRect().left) > 2) out.push(`${name}: tiêu đề Người dùng lệch ô tên ${Math.round(hu.getBoundingClientRect().left - cu.getBoundingClientRect().left)} px`);
    for (const c of t.tBodies[0].querySelectorAll('td')) if (c.scrollWidth > c.clientWidth + 1 && !c.title) out.push(`${name}: ô "${c.textContent.trim().slice(0, 16)}" tràn cột ${Math.round(c.scrollWidth - c.clientWidth)} px`);
    for (const e of t.querySelectorAll('.u-nm, .u-em')) { if (e.getBoundingClientRect().height > 28) out.push(`${name}: tên/email xuống dòng (cao ${Math.round(e.getBoundingClientRect().height)} px)`); if (e.scrollWidth > e.clientWidth + 1 && !e.title) out.push(`${name}: "${e.textContent.slice(0, 16)}" bị cắt mà không có title`); }
  }
  // Hàng lọc Người dùng: ô cùng cao, thẳng cột
  const tools = [...document.querySelectorAll('.adm-content .u-tools:not(.fsheet) > .u-sel')].filter(vis);
  if (tools.length) {
    const hs = tools.map(e => e.getBoundingClientRect().height), xs = new Set(tools.map(e => Math.round(e.getBoundingClientRect().left)));
    if (Math.max(...hs) - Math.min(...hs) > 2) out.push(`hàng lọc: ô cao lệch ${Math.round(Math.min(...hs))}–${Math.round(Math.max(...hs))} px`);
    if (xs.size > 8) out.push(`hàng lọc: ${xs.size} mép trái khác nhau (không thẳng cột)`);
    for (const e of tools) if (e.scrollWidth > e.clientWidth + 1) out.push(`hàng lọc: "${e.textContent.trim().slice(0, 14)}" tràn ô`);
  }
  return out;
}

const rgb = x => { const m = /^#([0-9a-f]{6})$/i.exec(x); if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16)); const n = String(x).match(/[\d.]+/g); return n ? n.slice(0, 3).map(Number) : [0, 0, 0]; };
const lin = v => { const c = v / 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; };
export const lum = x => { const [r, g, b] = rgb(x).map(lin); return .2126 * r + .7152 * g + .0722 * b; };
export const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };
const lab = x => { const [r, g, b] = rgb(x).map(lin), f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116, X = f((.4124 * r + .3576 * g + .1805 * b) / .95047), Y = f(.2126 * r + .7152 * g + .0722 * b), Z = f((.0193 * r + .1192 * g + .9505 * b) / 1.08883); return [116 * Y - 16, 500 * (X - Y), 200 * (Y - Z)]; };
export const deltaE = (a, b) => { const [p, q] = [lab(a), lab(b)]; return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
// colors[0] = nước 0 khách, colors[1…5] = 5 nhóm tăng dần. Mỗi màu ≥ 3:1 với nền, đôi một ΔE ≥ 15, độ sáng các nhóm đơn điệu (vẫn đọc được khi mù màu)
export function checkMapColors(colors, bg, tag = '') {
  const o = [], ls = colors.slice(1).map(c => lab(c)[0]);
  colors.forEach((c, i) => { const r = contrast(c, bg); if (r < 3) o.push(`${tag} màu ${i} ${c} chỉ ${r.toFixed(2)}:1 với nền ${bg}`); });
  for (let i = 0; i < colors.length; i++) for (let j = i + 1; j < colors.length; j++) { const d = deltaE(colors[i], colors[j]); if (d < 15) o.push(`${tag} màu ${i} ${colors[i]} và ${j} ${colors[j]} gần nhau (ΔE ${d.toFixed(1)})`); }
  ls.slice(1).forEach((l, i) => { if (ls[i] - l < 5) o.push(`${tag} nhóm ${i + 1}→${i + 2} độ sáng không giảm đủ (${ls[i].toFixed(0)}→${l.toFixed(0)})`); });
  return o;
}
