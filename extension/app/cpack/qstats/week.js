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
    return `<div class="card" style="margin-bottom:1rem"><h3 style="margin:0">⏱ ${t('Ôn 10 phút: dạng yếu nhất của bạn')}</h3><p class="small"><span translate="no">${esc(g.QT.SKILL()[w.sk][1])} · ${esc(N[w.k] || w.k)}</span> – ${t('đúng {p}% ({n} câu). Dành 10 phút luyện riêng dạng này.', { p, n: w.v.t })}</p><a class="btn" data-mini href="${g.QT.practiceLink(w.sk, w.k)}">${t('Bắt đầu ôn 10 phút')}</a></div>`; };
  // Đồng hồ 10 phút: chip nổi ở body (sống qua các route SPA), không âm thanh/không ép; hết giờ chỉ hiện lời nhắn + link xem tiến bộ
  const mini = () => { const old = document.getElementById('qsMini'); if (old) old.remove(); const end = Date.now() + 6e5, el = document.createElement('div'); el.id = 'qsMini'; el.className = 'qs-mini';
    el.innerHTML = `<b>⏱ <span id="qsMiniT">10:00</span></b><button type="button" aria-label="${esc(t('Dừng đếm giờ'))}">✕</button>`; document.body.appendChild(el);
    const tick = () => { const left = Math.max(0, Math.round((end - Date.now()) / 1e3)); if (!el.isConnected) return clearInterval(iv); if (!left) { clearInterval(iv); el.setAttribute('role', 'status'); el.innerHTML = `<a href="#/qstats">${t('Hết 10 phút! Xem tiến bộ của bạn')} →</a><button type="button" aria-label="${esc(t('Dừng đếm giờ'))}">✕</button>`; el.querySelector('button').onclick = () => el.remove(); return; } el.firstChild.lastChild.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); };
    const iv = setInterval(tick, 1e3); el.querySelector('button').onclick = () => { clearInterval(iv); el.remove(); }; };
  st.textContent += '.qs-mini{position:fixed;right:12px;bottom:calc(12px + env(safe-area-inset-bottom));z-index:60;display:flex;gap:.5rem;align-items:center;padding:.45rem .7rem;border-radius:999px;background:var(--surface,#fff);color:var(--text,inherit);border:1px solid var(--line);box-shadow:0 2px 10px rgba(0,0,0,.18);font-variant-numeric:tabular-nums}.qs-mini button{border:0;background:none;color:inherit;cursor:pointer;min-width:32px;min-height:32px;font-size:1rem}';
  g.QWK = { draw: root => { root.querySelectorAll('[id^=wk-]').forEach(n => { n.outerHTML = html(n.id.slice(3)); }); const c = card(), grid = root.querySelector('.qs-grid'); if (c && grid) { grid.insertAdjacentHTML('beforebegin', c); const b = root.querySelector('[data-mini]'); if (b) b.addEventListener('click', mini); } } };
})(typeof self !== 'undefined' ? self : this);
