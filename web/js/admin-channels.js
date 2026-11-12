/* Quản trị → Phân tích: "Kênh & mã bài" – phễu theo nguồn/chiến dịch/mã (op 'channels' – functions/api/_funnel.js, spec docs/specs/funnel.md).
 * Trang đích (/go) → quiz → bấm vào app → máy mới vào app → xong bài đầu → quay lại D1 / D7+. Tóm tắt hôm qua so với hôm kia ở đầu.
 * Tách riêng khỏi admin.js: admin.js chỉ gọi AdminChannels.render(container, api, L, { esc, num, lang }). Mọi dữ liệu hiển thị đi qua esc(). */
(function () {
  const EN = {
    '🎯 Kênh & mã bài (UTM)': '🎯 Channels & post codes (UTM)', 'Hôm qua': 'Yesterday', 'so với hôm kia': 'vs the day before',
    'Đang tải phễu theo kênh…': 'Loading channel funnel…', 'Không tải được phễu theo kênh': 'Could not load the channel funnel',
    'Chưa có lượt nào gắn UTM. Link bài đăng dạng lexkite.com/go/en/?utm_source=tiktok&utm_campaign=reel&c=<mã bài>.': 'No tagged visits yet. Post links look like lexkite.com/go/en/?utm_source=tiktok&utm_campaign=reel&c=<post code>.',
    'Nguồn': 'Source', 'Chiến dịch': 'Campaign', 'Mã bài': 'Post code', 'Vào trang': 'Landing views', 'Làm quiz': 'Started quiz', 'Xong quiz': 'Finished quiz', 'Bấm vào app': 'Tapped CTA',
    'Máy mới vào app': 'New app devices', 'Xong bài đầu': 'First lesson done', 'D1': 'D1', 'D7+': 'D7+', 'Tổng': 'Total', '(trực tiếp)': '(direct)',
    'Vào app (máy mới)': 'App visits (new devices)', 'D1 = quay lại đúng ngày kế; D7+ = quay lại từ ngày thứ 7 trở đi (chỉ tính nhóm đã đủ tuổi). Chỉ tính người thật: loại bot/CI/quản trị; không IP, không dữ liệu cá nhân trong link.': 'D1 = came back the next day; D7+ = came back on day 7 or later (mature cohorts only). Real people only: bots/CI/admin excluded; no IP and no personal data in links.',
    'Kỳ': 'Period', '{n} ngày': '{n} days',
  };
  const CSS = '.ch-sum{display:flex;gap:.8rem;flex-wrap:wrap;margin:.4rem 0 .8rem}.ch-sum .kpi{min-width:150px}.ch-tbl{width:100%;border-collapse:collapse;font-size:.85rem}.ch-tbl th,.ch-tbl td{padding:.35rem .4rem;text-align:right;border-bottom:1px solid var(--line);white-space:nowrap}.ch-tbl th:nth-child(-n+3),.ch-tbl td:nth-child(-n+3){text-align:left}.ch-tbl small{color:var(--muted)}.ch-wrap{overflow-x:auto}.ch-tot td{font-weight:700}';
  let gen = 0;
  function render(box, api, L, h) {
    const esc = h.esc, num = h.num, lang = h.lang || (() => 'vi');
    const G = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); const s = EN[vi]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    if (!document.getElementById('admChCss')) { const st = document.createElement('style'); st.id = 'admChCss'; st.textContent = CSS; document.head.appendChild(st); }
    let P = 30; try { P = [7, 30, 90].includes(+sessionStorage.getItem('adm.gdays')) ? +sessionStorage.getItem('adm.gdays') : 30; } catch (e) { /* bỏ qua */ }
    const fmtP = x => (x == null ? '–' : String(x).replace('.', lang() === 'en' ? '.' : ',') + '%');
    const arrow = (a, b) => (a == null || b == null ? '' : a > b ? ' <small style="color:var(--good,#15803d)">▲</small>' : a < b ? ' <small style="color:var(--again,#dc2626)">▼</small>' : '');
    const cell = (n, p) => `${num(n || 0)}${p != null ? ` <small>${fmtP(p)}</small>` : ''}`;
    const tile = (l, a, b, sub) => `<div class="kpi"><div class="l">${esc(l)}</div><div class="v">${num(a || 0)}${arrow(a, b)}</div><div class="s small muted">${esc(sub || G('so với hôm kia') + ': ' + num(b || 0))}</div></div>`;
    const body = d => {
      const s = d.summary, t = d.total || {};
      if (!d.rows.length) return `<p class="small muted">${G('Chưa có lượt nào gắn UTM. Link bài đăng dạng lexkite.com/go/en/?utm_source=tiktok&utm_campaign=reel&c=<mã bài>.')}</p>`;
      const rows = d.rows.map(r => `<tr><td>${esc(r.src || G('(trực tiếp)'))}</td><td>${esc(r.camp || '–')}</td><td>${esc(r.code || '–')}</td><td>${num(r.go_view)}</td><td>${cell(r.go_start, r.startPct)}</td><td>${cell(r.go_done, r.donePct)}</td><td>${cell(r.go_cta, r.ctaPct)}</td><td>${num(r.app)}</td><td>${cell(r.fl, r.flPct)}</td><td>${cell(r.d1, r.d1Pct)}</td><td>${cell(r.d7, r.d7Pct)}</td></tr>`).join('');
      return `<div class="ch-sum">${tile(G('Hôm qua') + ': ' + G('Vào trang'), s.views, s.prevViews)}${tile(G('Hôm qua') + ': ' + G('Vào app (máy mới)'), s.app, s.prevApp)}${tile(G('Hôm qua') + ': ' + G('Xong bài đầu'), s.fl, s.prevFl)}</div>
        <div class="card ch-wrap"><table class="ch-tbl"><thead><tr><th>${G('Nguồn')}</th><th>${G('Chiến dịch')}</th><th>${G('Mã bài')}</th><th>${G('Vào trang')}</th><th>${G('Làm quiz')}</th><th>${G('Xong quiz')}</th><th>${G('Bấm vào app')}</th><th>${G('Máy mới vào app')}</th><th>${G('Xong bài đầu')}</th><th>${G('D1')}</th><th>${G('D7+')}</th></tr></thead><tbody>${rows}
        <tr class="ch-tot"><td colspan="3">${G('Tổng')}</td><td>${num(t.go_view)}</td><td>${num(t.go_start)}</td><td>${num(t.go_done)}</td><td>${num(t.go_cta)}</td><td>${num(t.app)}</td><td>${cell(t.fl, t.flPct)}</td><td>${cell(t.d1, t.d1Pct)}</td><td>${cell(t.d7, t.d7Pct)}</td></tr></tbody></table></div>
        <p class="small muted">${G('D1 = quay lại đúng ngày kế; D7+ = quay lại từ ngày thứ 7 trở đi (chỉ tính nhóm đã đủ tuổi). Chỉ tính người thật: loại bot/CI/quản trị; không IP, không dữ liệu cá nhân trong link.')}</p>`;
    };
    const load = async () => {
      const my = ++gen;
      box.innerHTML = `<h3 class="sec-t">${G('🎯 Kênh & mã bài (UTM)')} </h3><div class="tools"><b>${G('Kỳ')}</b>${[7, 30, 90].map(d => `<button class="btn sm ${d === P ? 'primary' : ''}" data-chp="${d}">${G('{n} ngày', { n: d })}</button>`).join('')}</div><div id="chBody"><p class="small muted">${G('Đang tải phễu theo kênh…')}</p></div>`;
      box.querySelectorAll('[data-chp]').forEach(b => b.onclick = () => { P = +b.dataset.chp; try { sessionStorage.setItem('adm.gdays', P); } catch (e) { /* bỏ qua */ } load(); });
      try { const d = await api('channels', { days: P }); if (my === gen && box.isConnected) box.querySelector('#chBody').innerHTML = body(d); }
      catch (e) { if (my === gen && box.isConnected) box.querySelector('#chBody').innerHTML = `<p class="bad-t">✗ ${G('Không tải được phễu theo kênh')}: ${esc(e.message)}</p>`; }
    };
    load();
  }
  window.AdminChannels = { render };
})();
