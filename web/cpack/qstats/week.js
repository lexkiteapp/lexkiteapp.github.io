/* Thẻ 'ôn 10 phút dạng yếu nhất' + dải tỉ lệ đúng 8 tuần + ước tính band cho #/qstats – tải lười (gói 'qwk'), dựng vào chỗ giữ .qs-wk-slot do qtips.js để lại. */
(function (g) {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const st = document.createElement('style');
  st.textContent = '.qs-wk-box{margin:.6rem 0}.qs-wk{display:flex;align-items:flex-end;gap:4px;height:44px;margin:.25rem 0}.qs-wk i{flex:1;border-radius:3px 3px 0 0;background:var(--primary)}.qs-wk i.e{background:var(--line)}';
  document.head.appendChild(st);
  // qwk[kỹ năng][tuần] = {r,t}; chỉ vẽ khi đã có lịch sử tuần. Band: chỉ IELTS Listening/Reading (40 câu ≈ tỉ lệ đúng × 40), ghi rõ là ước tính.
  const html = sk => {
    const W = ((g.App.state.game || {}).qwk || {})[sk]; if (!W) return '';
    const now = Math.floor(Date.now() / 6048e5), cols = Array.from({ length: 8 }, (_, i) => W[now - 7 + i]), cur = cols[7]; if (!cols.some(Boolean)) return '';
    const band = cur && cur.t >= 10 && g.QE && (sk === 'il' || sk === 'ir') ? g.QE.bandOf(Math.round(cur.r / cur.t * 40), sk === 'il' ? 'listening' : 'reading') : 0;
    return `<div class="qs-wk-box"><div class="tiny muted">${t('Tỉ lệ đúng 8 tuần gần nhất')}</div><div class="qs-wk" role="img" aria-label="${esc(t('Tỉ lệ đúng 8 tuần gần nhất'))}">${cols.map(c => `<i style="height:${c && c.t ? Math.max(6, Math.round(c.r / c.t * 100)) : 4}%" class="${c && c.t ? '' : 'e'}" title="${c && c.t ? Math.round(c.r / c.t * 100) + '%' : '–'}"></i>`).join('')}</div>${band ? `<div class="tiny muted">${t('Ước tính band tuần này ≈ {b} (không phải điểm thi chính thức)', { b: band })}</div>` : ''}</div>`;
  };
  // Dạng yếu nhất (đã làm ≥3 câu, <75% đúng) trong mọi kỹ năng → thẻ đầu trang với nút ôn 10 phút
  const weakest = () => { let w; for (const [key, v] of Object.entries(((g.App.state.game || {}).qstat) || {})) { const [sk, k] = key.split(':'); if (!g.QT.SKILL()[sk] || v.t < 3 || v.r / v.t >= .75) continue; if (!w || v.r / v.t < w.v.r / w.v.t) w = { sk, k, v }; } return w; };
  const card = () => { const w = weakest(); if (!w) return ''; const p = Math.round(w.v.r / w.v.t * 100), N = g.QT.NAME;
    return `<div class="card" style="margin-bottom:1rem"><h3 style="margin:0">⏱ ${t('Ôn 10 phút: dạng yếu nhất của bạn')}</h3><p class="small"><span translate="no">${esc(g.QT.SKILL()[w.sk][1])} · ${esc(N[w.k] || w.k)}</span> – ${t('đúng {p}% ({n} câu). Dành 10 phút luyện riêng dạng này.', { p, n: w.v.t })}</p><a class="btn" href="${g.QT.practiceLink(w.sk, w.k)}">${t('Bắt đầu ôn 10 phút')}</a></div>`; };
  g.QWK = { draw: root => { root.querySelectorAll('[id^=wk-]').forEach(n => { n.outerHTML = html(n.id.slice(3)); }); const c = card(), grid = root.querySelector('.qs-grid'); if (c && grid) grid.insertAdjacentHTML('beforebegin', c); } };
})(typeof self !== 'undefined' ? self : this);
