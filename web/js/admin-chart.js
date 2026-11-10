// Biểu đồ dùng chung cho mọi trang quản trị (cột 1–n chuỗi, đường) – HTML + CSS, không SVG co giãn theo viewBox:
// chữ luôn đúng cỡ px (trục 12 px, số 12 px) ở mọi bề rộng, cột tối đa 40 px, nhãn ngày tự giãn khi hẹp (container query), có lưới + trạng thái trống.
// Kiểu ở css/admin.css (.ach*). Gác tự động: scripts/test/admin-guard.mjs.
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nice = m => { if (!(m > 0)) return 1; const p = Math.pow(10, Math.floor(Math.log10(m))), f = m / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; };
  const num = v => (+v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  // rows: mảng dữ liệu · o.keys: [{ k, c?, l? }] (hoặc o.key) · o.x(r): nhãn trục ngang · o.tip(r): chú thích khi di chuột · o.fmt(v): định dạng số
  // o.aria: mô tả cho trình đọc màn hình · o.empty: chữ khi không có dữ liệu · o.h: chiều cao vùng vẽ (px, mặc định 200) · o.type: 'bar' | 'line'
  function chart(rows, o = {}) {
    rows = rows || []; const keys = o.keys || [{ k: o.key || 'n', c: 'var(--primary)' }], fmt = o.fmt || num, x = o.x || (r => r.day || ''), n = rows.length;
    const val = (r, k) => Math.max(0, +r[k.k] || 0), mx = Math.max(0, ...rows.flatMap(r => keys.map(k => val(r, k))));
    if (!n || !(mx > 0)) return `<div class="ach-empty" role="note">${esc(o.empty || '–')}</div>`;
    const top = nice(mx), pct = v => Math.round(v / top * 1000) / 10, kw = Math.ceil(n / 10), kn = Math.ceil(n / 5);
    const tip = r => esc(o.tip ? o.tip(r) : x(r) + ': ' + keys.map(k => (k.l ? k.l + ' ' : '') + fmt(val(r, k))).join(' · '));
    // số trên cột: chỉ cột cao nhất + cột cuối (nếu ≥ 3 cột cách nhau); ≤ 14 cột & đủ rộng thì hiện hết (CSS)
    const tot = r => Math.max(...keys.map(k => val(r, k))), iMax = rows.reduce((b, r, i) => (tot(r) > tot(rows[b]) ? i : b), 0), iLast = n - 1;
    const key = i => i === iMax || (i === iLast && iLast - iMax >= 3);
    const line = o.type === 'line';
    const grid = [1, .5, 0].map(f => `<span class="ach-gl" style="bottom:${f * 100}%"><em>${esc(fmt(top * f))}</em></span>`).join('');
    const cols = rows.map((r, i) => {
      const t = tot(r), xl = x(r), cls = (i % kw === 0 ? ' xw' : '') + (i % kn === 0 ? ' xn' : '');
      const bars = line ? (keys.length === 1 ? `<i class="ach-dot" style="bottom:${pct(t)}%"></i>` : '') : keys.map(k => `<i style="height:${pct(val(r, k))}%;background:${k.c || 'var(--primary)'}"></i>`).join('');
      const v = keys.length === 1 && !line ? `<b class="ach-v${key(i) ? ' k' : ''}${n <= 14 ? ' f' : ''}" style="bottom:${pct(t)}%">${esc(fmt(t))}</b>` : '';
      return `<div class="ach-c" title="${tip(r)}"><div class="ach-b">${bars}${v}</div><span class="ach-x${cls}">${esc(xl)}</span></div>`;
    }).join('');
    const svg = line ? `<svg class="ach-ln" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${keys.map(k => `<polyline fill="none" stroke="${k.c || 'var(--primary)'}" vector-effect="non-scaling-stroke" points="${rows.map((r, i) => `${((i + .5) / n * 100).toFixed(2)},${(100 - pct(val(r, k))).toFixed(2)}`).join(' ')}"/>`).join('')}</svg>` : '';
    const leg = keys.length > 1 || keys[0].l ? `<div class="ach-leg">${keys.map(k => `<span><i style="background:${k.c || 'var(--primary)'}"></i>${esc(k.l || '')}</span>`).join('')}</div>` : '';
    return `<figure class="ach${line ? ' line' : ''}" role="img" aria-label="${esc(o.aria || '')}" style="--ach-h:${o.h || 200}px"><div class="ach-p"><div class="ach-g" aria-hidden="true">${grid}</div>${svg}<div class="ach-cs" aria-hidden="true">${cols}</div></div>${leg}</figure>`;
  }
  // Meter dùng chung (#998 hạn mức YouTube · #ads sẵn sàng): o.fmt định dạng số; mặc định là HẠN MỨC (≥ 70 % vàng, ≥ 90 % đỏ), o.goal = MỤC TIÊU (đủ = xanh, chưa đủ = vàng). Kiểu .vx-m*/.vx-mb ở css/admin.css.
  function meter(label, used, limit, unit = '', o = {}) {
    const f = o.fmt || num, u = +used || 0, lim = +limit || 0, p = lim ? Math.min(100, u / lim * 100) : 0, tail = f(lim) + (unit ? ' ' + unit : '');
    const tone = o.goal ? (p >= 100 ? ' ok' : ' warn') : p >= 90 ? ' bad' : p >= 70 ? ' warn' : '';
    return `<div class="vx-m"><div class="vx-m-h"><span>${esc(label)}</span><span class="vx-m-v"><b>${esc(f(u))}</b> / ${esc(tail)}</span></div><div class="vx-mb${tone}" role="meter" aria-label="${esc(label)}" aria-valuemin="0" aria-valuemax="${lim}" aria-valuenow="${Math.min(u, lim)}" aria-valuetext="${esc(f(u) + ' / ' + tail)}"><i style="width:${u ? Math.max(1, p).toFixed(1) : 0}%"></i></div></div>`;
  }
  window.AdminChart = { chart, bars: (rows, o) => chart(rows, o), line: (rows, o) => chart(rows, { ...o, type: 'line' }), nice, meter };
})();
