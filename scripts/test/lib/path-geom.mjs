// 🛤 Gác hình học khối Lộ trình trong trình duyệt thật (lỗi 13/11: đường gãy + khe hở, zigzag lệch, giáo viên cắt mép màn / đè thẻ, thẻ cuối bị thanh tab che).
// pathGeom chạy TRONG trang (page.evaluate, lộ trình đã mở rộng) và trả mảng lỗi; dùng ở ux1-guard (360/375/390/412/máy tính × sáng/tối × en/vi/ar RTL). Số đo theo toạ độ màn (getScreenCTM) → đúng cả khi đường bị lật RTL.
export function pathGeom() {
  const E = [], R = e => e.getBoundingClientRect(), vw = document.documentElement.clientWidth, pv = document.querySelector(':is(.v2-today, .v2-today-desk) [data-pv]');
  if (!pv) return ['không có khối lộ trình [data-pv]'];
  const rtl = getComputedStyle(pv).direction === 'rtl', rows = [...pv.querySelectorAll(':scope > [data-pr]')];
  const pt = (p, end) => { const q = p.getPointAtLength(end ? p.getTotalLength() : 0); return new DOMPoint(q.x, q.y).matrixTransform(p.getScreenCTM()); };
  if (document.documentElement.scrollWidth > vw + 1) E.push(`trang tràn ngang (${document.documentElement.scrollWidth} > ${vw})`);
  rows.forEach((r, i) => { const id = r.getAttribute('data-pr'), rr = R(r), svg = r.querySelector(':scope > svg'), [pin, pout] = svg.querySelectorAll('path'), sr = R(svg), btn = r.querySelector(':scope > button'), br = R(btn);
    if (Math.abs(sr.top - rr.top) > .5 || Math.abs(sr.height - rr.height) > .5) E.push(`${id}: svg đường lệch hàng (top ${Math.round(sr.top - rr.top)}, cao ${Math.round(sr.height - rr.height)})`);
    if (Math.abs(pt(pin, false).y - rr.top) > .5 || Math.abs(pt(pout, true).y - rr.bottom) > .5) E.push(`${id}: đường không chạm mép trên/dưới hàng`);
    if (Math.abs(pt(pin, true).x - (br.left + br.width / 2)) > 1 || Math.abs(pt(pin, true).y - (br.top + br.height / 2)) > 1) E.push(`${id}: nút không nằm trên đường`);
    const nx = r.nextElementSibling; if (nx && nx.hasAttribute('data-pr')) { const [pin2] = nx.querySelectorAll(':scope > svg > path'), a = pt(pout, true), b = pt(pin2, false);
      if (Math.abs(R(nx).top - rr.bottom) > .5) E.push(`${id}→${nx.getAttribute('data-pr')}: khe hở giữa hai hàng ${(R(nx).top - rr.bottom).toFixed(1)} px`);
      if (Math.abs(a.x - b.x) > .5 || Math.abs(a.y - b.y) > .5) E.push(`${id}→${nx.getAttribute('data-pr')}: đường không khớp tại mối nối (${a.x.toFixed(1)},${a.y.toFixed(1)} ≠ ${b.x.toFixed(1)},${b.y.toFixed(1)})`); }
    const tx = r.querySelector(':scope > [data-ptx], :scope > [data-pcard]'), xr = R(tx), ext = [btn, ...btn.querySelectorAll('*')].map(R);
    const edge = rtl ? Math.min(...ext.map(x => x.left)) : Math.max(...ext.map(x => x.right)), g = rtl ? edge - xr.right : xr.left - edge;
    if (g < 12) E.push(`${id}: nút sát/đè cột chữ (${Math.round(g)} px, cần ≥ 12)`);
    if (xr.left < -.5 || xr.right > vw + .5 || Math.min(...ext.map(x => x.left)) < -.5 || Math.max(...ext.map(x => x.right)) > vw + .5) E.push(`${id}: nút/cột chữ vượt mép màn`);
    if (rr.height < 1) E.push(`${id}: hàng cao 0`); });
  const card = pv.querySelector('[data-pcard]'), slot = card && card.querySelector('.tslot');
  if (card) { const cr = R(card), row = card.parentElement, rr = R(row), sr = slot && R(slot);
    if (!slot) E.push('thẻ hiện tại không có giáo viên');
    else { if (sr.left < cr.left - .5 || sr.right > cr.right + .5 || sr.top < cr.top - .5 || sr.bottom > cr.bottom + .5) E.push(`giáo viên ra ngoài thẻ (slot ${Math.round(sr.left)}..${Math.round(sr.right)} × ${Math.round(sr.top)}..${Math.round(sr.bottom)}, thẻ ${Math.round(cr.left)}..${Math.round(cr.right)} × ${Math.round(cr.top)}..${Math.round(cr.bottom)})`);
      if (sr.left < 0 || sr.right > vw) E.push(`giáo viên cắt mép màn (${Math.round(sr.left)}..${Math.round(sr.right)} / ${vw})`);
      const fig = slot.querySelector('.tslot-ledge'), led = fig && getComputedStyle(fig), cs = getComputedStyle(card); if (led && cs.backgroundColor !== led.backgroundColor) E.push(`bệ giáo viên ${led.backgroundColor} ≠ mặt thẻ ${cs.backgroundColor} (lộ bệ xám)`);
      for (const t of card.querySelectorAll(':scope > span, :scope > p, :scope > div:not(:has(.tslot)) button, :scope > div:not(:has(.tslot))')) { const tr = R(t); if (tr.width && tr.height && Math.min(tr.right, sr.right) - Math.max(tr.left, sr.left) > 1 && Math.min(tr.bottom, sr.bottom) - Math.max(tr.top, sr.top) > 1) E.push(`giáo viên đè lên ${t.tagName.toLowerCase()} "${(t.textContent || '').trim().slice(0, 20)}"`); } }
    if (cr.top < rr.top - .5 || cr.bottom > rr.bottom + .5) E.push('thẻ hiện tại tràn ra ngoài hàng của nó (đè hàng khác)');
    if (cr.left < 0 || cr.right > vw) E.push('thẻ hiện tại vượt mép màn');
    const kids = [...card.querySelectorAll(':scope > span, :scope > p, button')]; if (kids.some(k => R(k).bottom > cr.bottom + .5)) E.push('chữ/nút trong thẻ tràn đáy thẻ (HC thấp quá cho 2 dòng tiêu đề)'); }
  // phần tử cuối của lộ trình (nút "Xem toàn bộ"/"Thu gọn") không bị thanh tab cố định che khi cuộn hết trang
  const nav = document.querySelector('#bnav') || document.querySelector(':is(.v2-today, .v2-today-desk) nav'), px = document.querySelector(':is(.v2-today, .v2-today-desk) [data-act="pathx"]');
  if (nav && px && getComputedStyle(nav).position === 'fixed') { window.scrollTo(0, document.documentElement.scrollHeight); const n = R(nav), p = R(px); if (p.height && p.bottom > n.top + .5 && p.top < n.bottom) E.push(`nút mở/thu gọn lộ trình bị thanh tab che (đáy ${Math.round(p.bottom)} > đỉnh thanh ${Math.round(n.top)})`); window.scrollTo(0, 0); }
  return E;
}
