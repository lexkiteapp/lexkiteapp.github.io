/* Dải tỉ lệ đúng 8 tuần + ước tính band cho #/qstats – tải lười (gói 'qwk'), dựng vào chỗ giữ .qs-wk-slot do qtips.js để lại. */
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
  g.QWK = { draw: root => root.querySelectorAll('[id^=wk-]').forEach(n => { n.outerHTML = html(n.id.slice(3)); }) };
})(typeof self !== 'undefined' ? self : this);
