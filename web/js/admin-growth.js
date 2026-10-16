/* Quản trị → Phân tích: "Tăng trưởng & giữ chân", "Add-on Chrome", "Phễu chuyển đổi" (op 'growth' – functions/api/growth.js).
 * Tách riêng khỏi admin.js: admin.js chỉ gọi AdminGrowth.render(container, api, L, { esc, num, lang }).
 * Chữ tiếng Anh nằm trong bảng EN riêng ở đây (không đụng bảng EN của admin.js). Mọi dữ liệu hiển thị đều qua esc(). */
(function () {
  const EN = {
    '📊 Tăng trưởng & giữ chân': '📊 Growth & retention', 'Kỳ': 'Period', '{n} ngày': '{n} days', 'so với {n} ngày trước đó': 'vs the previous {n} days',
    'Đang tải số liệu tăng trưởng…': 'Loading growth metrics…', 'Không tải được số liệu tăng trưởng': 'Could not load growth metrics',
    '🧠 Phân tích': '🧠 Insights', 'Chưa đủ dữ liệu để rút ra nhận định – cần thêm vài ngày số liệu.': 'Not enough data for insights yet – a few more days of data are needed.',
    'Tổng người dùng': 'Total users', '+{n} mới trong kỳ': '+{n} new this period', 'Người dùng mới (đăng ký)': 'New users (sign-ups)', 'Khách mới': 'New visitors', 'thiết bị lần đầu ghé': 'first-time devices',
    'Hoạt động TB/ngày (DAU)': 'Avg daily actives (DAU)', 'Hoạt động 7 ngày (WAU)': '7-day actives (WAU)', 'Hoạt động 30 ngày (MAU)': '30-day actives (MAU)', 'Độ gắn bó DAU/MAU': 'Stickiness DAU/MAU',
    'khách + add-on, tính tới cuối kỳ': 'visitors + add-on, as of period end',
    'Add-on: cài mới': 'Add-on: installs', 'Add-on: gỡ': 'Add-on: uninstalls', 'Add-on: cài ròng': 'Add-on: net installs', 'Tỉ lệ gỡ': 'Uninstall rate', 'cài − gỡ': 'installs − uninstalls', '% số lượt cài': '% of installs',
    'Người dùng mới theo nền tảng': 'New users by platform', 'Nền tảng': 'Platform', 'Kỳ này': 'This period', 'Kỳ trước': 'Previous', 'Thay đổi': 'Change',
    'Chưa có người dùng mới': 'No new users yet', '(nền tảng lần đồng bộ gần nhất)': '(platform of latest sync)',
    '🔁 Giữ chân': '🔁 Retention', 'Khách ẩn danh': 'Anonymous visitors', 'Người dùng đăng nhập': 'Signed-in users', 'Nhóm': 'Group', 'Số người': 'People',
    'D1 (ngày +1)': 'D1 (day +1)', 'D2–7': 'D2–7', 'D8–30': 'D8–30', 'chưa đủ tuổi': 'not mature yet',
    'Tỉ lệ quay lại học': 'Return-to-study rate', 'hoạt động ≥ 2 ngày trong 7 ngày qua': 'active on ≥ 2 days in the last 7 days', 'Rời bỏ': 'Churn',
    'hoạt động kỳ trước nhưng không quay lại kỳ này': 'active last period but not this period', 'khách': 'visitors', 'người dùng': 'users',
    'Thuần tập theo tuần': 'Weekly cohorts', 'Tuần bắt đầu': 'Start week', 'Tuần {n}': 'Week {n}', 'Chưa có dữ liệu thuần tập': 'No cohort data yet',
    'Mỗi hàng: nhóm có lần đầu ghé (hoặc đăng ký) trong tuần đó; ô = % còn hoạt động ở tuần thứ n.': 'Each row: people who first visited (or signed up) that week; cell = % still active in week n.',
    '🧩 Add-on Chrome': '🧩 Chrome add-on', 'Cài đặt 30 ngày': 'Installs (30 days)', 'Gỡ 30 ngày': 'Uninstalls (30 days)', 'Đang dùng hôm nay': 'Active today', 'Đang dùng 7 ngày': 'Active (7 days)',
    'Tra từ hôm nay': 'Lookups today', 'Lưu thẻ hôm nay': 'Cards saved today', '{n} trong 14 ngày': '{n} in 14 days', 'mới': 'new', 'cập nhật: {n}': 'updates: {n}',
    'Cài / gỡ theo ngày (30 ngày)': 'Installs / uninstalls per day (30 days)', 'Cài': 'Installs', 'Gỡ': 'Uninstalls', 'Máy dùng add-on theo ngày (14 ngày)': 'Active add-on devices per day (14 days)',
    'Tra từ & lưu thẻ theo ngày (14 ngày)': 'Lookups & saves per day (14 days)', 'Tra từ': 'Lookups', 'Lưu thẻ': 'Saves', 'Mở popup': 'Popup opens', 'Tab mới': 'New tab',
    'Phiên bản đang dùng (7 ngày)': 'Versions in use (7 days)', 'Lý do gỡ (90 ngày)': 'Uninstall reasons (90 days)', 'Chưa có dữ liệu': 'No data yet',
    'Mình không còn dùng nữa': 'No longer used', 'Popup/gạch chân gây phiền': 'Popups/underlines annoying', 'Lỗi hoặc chậm': 'Bugs or slow', 'Lo ngại quyền riêng tư': 'Privacy concerns', 'Chuyển công cụ khác': 'Switched tools', 'Lý do khác': 'Other',
    'Add-on gửi 1 lượt/ngày/máy (chỉ số đếm, không từ đã tra hay URL). Bản cài thử trên máy phát triển không tính cài/cập nhật.': 'The add-on sends 1 ping/day/device (counts only, no looked-up words or URLs). Developer (unpacked) installs are not counted as installs/updates.',
    '🔻 Phễu chuyển đổi': '🔻 Conversion funnel', 'Tất cả': 'All', 'Khách': 'Visitors', 'Dùng thử': 'Tried', 'Đăng ký': 'Signed up', 'Học đều 7 ngày': 'Kept learning 7 days',
    'thiết bị có phiên trong kỳ': 'devices with a session this period', '≥ 2 trang, ≥ 60 giây hoặc tra từ trong add-on': '≥ 2 pages, ≥ 60 s or an add-on lookup', 'đăng ký trong kỳ, gắn với thiết bị': 'signed up this period, linked to a device', 'còn dùng ≥ 7 ngày sau đăng ký hoặc ≥ 5 lần vào': 'still active ≥ 7 days after sign-up or ≥ 5 visits',
    '{p} từ bước trước': '{p} of previous step', 'Đăng ký chỉ tính thiết bị đã đồng bộ sau bản cập nhật này (gắn mã khách ẩn danh với tài khoản 1 lần/máy).': 'Sign-ups count only devices that synced after this update (anonymous visitor id linked to the account once per device).',
    // Nhận định tự động
    'Người dùng mới {d} so với {n} ngày trước ({a} → {b}).': 'New users {d} vs the previous {n} days ({a} → {b}).', 'Khách mới {d} so với {n} ngày trước ({a} → {b}).': 'New visitors {d} vs the previous {n} days ({a} → {b}).',
    'Tỉ lệ gỡ add-on tăng {x} điểm ({a}% → {b}%) – xem lý do gỡ.': 'Add-on uninstall rate up {x} pts ({a}% → {b}%) – check uninstall reasons.', 'Tỉ lệ gỡ add-on giảm {x} điểm ({a}% → {b}%).': 'Add-on uninstall rate down {x} pts ({a}% → {b}%).',
    'Add-on đang cài ròng âm: gỡ nhiều hơn cài ({n}).': 'Add-on net installs are negative: more uninstalls than installs ({n}).',
    'Giữ chân {k} của khách thấp hơn kỳ trước ({a}% → {b}%).': 'Visitor {k} retention is lower than last period ({a}% → {b}%).', 'Giữ chân {k} của khách cao hơn kỳ trước ({a}% → {b}%).': 'Visitor {k} retention is higher than last period ({a}% → {b}%).',
    'Độ gắn bó DAU/MAU tốt: {p}%.': 'Good DAU/MAU stickiness: {p}%.', 'Độ gắn bó DAU/MAU thấp: {p}% – người dùng ghé thưa.': 'Low DAU/MAU stickiness: {p}% – visits are infrequent.',
    'Rời bỏ cao: {p}% khách hoạt động kỳ trước không quay lại.': 'High churn: {p}% of last period’s active visitors did not return.',
    'Bước rơi nhiều nhất trong phễu: {a} → {b} (chỉ {p}).': 'Biggest funnel drop: {a} → {b} (only {p}).',
  };
  const REASON = { notuse: 'Mình không còn dùng nữa', noisy: 'Popup/gạch chân gây phiền', bugs: 'Lỗi hoặc chậm', privacy: 'Lo ngại quyền riêng tư', alt: 'Chuyển công cụ khác', other: 'Lý do khác' };
  const PLAT = { web: '🌐 Web', pwa: '📲 PWA', ext: '🧩 Add-on', ios: '🍎 iOS', android: '🤖 Android', app: '📱 App' };
  const CSS = `.g-d{font-size:.74rem;font-weight:700;margin-left:.35rem;white-space:nowrap}.g-up{color:var(--good,#15803d)}.g-down{color:var(--again,#dc2626)}.g-eq{color:var(--muted)}
.g-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:.7rem;margin:.6rem 0}.g-tiles .kpi .v{font-size:1.5rem}
.g-ins{list-style:none;padding:0;margin:.4rem 0 0}.g-ins li{display:flex;gap:.5rem;align-items:flex-start;padding:.3rem 0;font-size:.9rem}.g-ins i{flex:0 0 10px;height:10px;border-radius:50%;margin-top:.35rem;background:var(--muted)}
.g-ins i.ok{background:var(--good,#16a34a)}.g-ins i.warn{background:var(--gold,#d97706)}.g-ins i.bad{background:var(--again,#dc2626)}
.g-tbl{width:100%;border-collapse:collapse;font-size:.86rem}.g-tbl th,.g-tbl td{padding:.35rem .4rem;text-align:right;border-bottom:1px solid var(--line)}.g-tbl th:first-child,.g-tbl td:first-child{text-align:left}
.g-heat td.c{text-align:center;font-weight:600;font-feature-settings:"tnum";min-width:44px}.g-wrap{overflow-x:auto}
.g-fun .st{margin:.55rem 0}.g-fun .hd{display:flex;justify-content:space-between;gap:.5rem;font-size:.88rem}.g-fun .tr{height:26px;border-radius:8px;background:var(--surface-2,rgba(127,127,127,.12));overflow:hidden;margin-top:.25rem}
.g-fun .tr i{display:block;height:100%;background:var(--primary);border-radius:8px;min-width:2px}.g-fun small{color:var(--muted)}
.g-mini{width:100%;height:auto;display:block}.g-mini text{font-size:10px;fill:var(--muted)}.g-leg{font-size:.78rem;color:var(--muted);display:flex;gap:.8rem;flex-wrap:wrap;margin-top:.2rem}.g-leg b{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:.3rem;vertical-align:-1px}
.g-chips{display:flex;gap:.35rem;flex-wrap:wrap;margin:.3rem 0 .6rem}`;

  let gen = 0; // chống ghi đè khi đổi kỳ / rời tab giữa chừng
  function render(box, api, L, h) {
    const esc = h.esc, num = h.num, lang = h.lang || (() => 'vi');
    const G = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); const s = EN[vi]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    if (!document.getElementById('admGrowthCss')) { const st = document.createElement('style'); st.id = 'admGrowthCss'; st.textContent = CSS; document.head.appendChild(st); }
    let P = 30; try { P = [7, 30, 90].includes(+sessionStorage.getItem('adm.gdays')) ? +sessionStorage.getItem('adm.gdays') : 30; } catch (e) { /* bỏ qua */ }
    let fp = 'all', cv = 'visitors', data = null;
    const pct1 = (a, b) => (b ? Math.round(a / b * 1000) / 10 : null);
    const fmtP = x => (x == null ? '–' : x.toLocaleString(lang() === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 }) + '%');
    // Mũi tên so sánh: bad = tăng là xấu (gỡ, tỉ lệ gỡ, rời bỏ); pts = so sánh theo điểm % thay vì % thay đổi
    const delta = (cur, prev, o = {}) => {
      if (cur == null || prev == null) return '';
      const tip = esc(G('Kỳ trước') + ': ' + (o.pts ? fmtP(prev) : num(Math.round(prev * 10) / 10)));
      const diff = o.pts ? Math.round((cur - prev) * 10) / 10 : prev ? Math.round((cur - prev) / prev * 1000) / 10 : cur ? null : 0;
      if (diff === 0 || (o.pts && Math.abs(diff) < 0.1)) return `<span class="g-d g-eq" title="${tip}">=</span>`;
      if (diff == null) return `<span class="g-d ${o.bad ? 'g-down' : 'g-up'}" title="${tip}">▲ ${G('mới')}</span>`; // kỳ trước = 0
      const up = diff > 0, good = o.bad ? !up : up, txt = (up ? '+' : '−') + Math.abs(diff).toLocaleString(lang() === 'en' ? 'en-US' : 'vi-VN', { maximumFractionDigits: 1 }) + (o.pts ? (lang() === 'en' ? ' pts' : ' điểm') : '%');
      return `<span class="g-d ${good ? 'g-up' : 'g-down'}" title="${tip}">${up ? '▲' : '▼'} ${txt}</span>`;
    };
    const tile = (label, val, d = '', sub = '') => `<div class="card kpi"><div class="l">${label}</div><div class="v">${val}${d}</div>${sub ? `<div class="s">${sub}</div>` : ''}</div>`;
    const hb = (rows, label) => !rows || !rows.length ? `<p class="small muted">${G('Chưa có dữ liệu')}</p>` : (() => { const max = Math.max(1, ...rows.map(r => +r.n || 0)), tot = rows.reduce((a, r) => a + (+r.n || 0), 0) || 1; return `<div class="hbars">${rows.map(r => `<div class="row2"><span class="k" title="${esc(label(r))}">${esc(label(r))}</span><span class="track"><i style="width:${(+r.n || 0) / max * 100}%"></i></span><span class="v">${num(r.n)}<small> · ${Math.round((+r.n || 0) / tot * 100)}%</small></span></div>`).join('')}</div>`; })();
    // Biểu đồ cột nhỏ nhiều chuỗi (cột cạnh nhau), di chuột xem số
    const mini = (rows, keys) => {
      if (!rows || !rows.length) return `<p class="small muted">${G('Chưa có dữ liệu')}</p>`;
      const W = 600, H = 120, B = 16, n = rows.length, gw = W / n, bw = Math.max(1, (gw - 2) / keys.length), max = Math.max(1, ...rows.flatMap(r => keys.map(k => +r[k.k] || 0)));
      const dd = d => (lang() === 'en' ? d.slice(5, 7) + '/' + d.slice(8) : d.slice(8) + '/' + d.slice(5, 7));
      return `<svg class="g-mini" viewBox="0 0 ${W} ${H + B}" role="img">${rows.map((r, i) => `<g>${keys.map((k, j) => { const v = +r[k.k] || 0, bh = v / max * H; return `<rect x="${(i * gw + 1 + j * bw).toFixed(1)}" y="${(H - bh).toFixed(1)}" width="${Math.max(bw - 1, 1).toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5" fill="${k.c}"/>`; }).join('')}<title>${esc(dd(r.day) + ' · ' + keys.map(k => G(k.l) + ': ' + num(r[k.k])).join(' · '))}</title><rect x="${(i * gw).toFixed(1)}" y="0" width="${gw.toFixed(1)}" height="${H}" fill="transparent"/></g>`).join('')}
        <text x="0" y="${H + 12}">${esc(dd(rows[0].day))}</text><text x="${W}" y="${H + 12}" text-anchor="end">${esc(dd(rows[n - 1].day))}</text><text x="2" y="10">${num(max)}</text></svg>
        <div class="g-leg">${keys.map(k => `<span><b style="background:${k.c}"></b>${G(k.l)}</span>`).join('')}</div>`;
    };
    const C1 = 'var(--primary)', C2 = 'var(--again, #dc2626)', C3 = 'var(--gold, #d97706)', C4 = 'var(--muted)';

    const insights = g => {
      const out = [], P = g.days, u = g.users, v = g.newVisitors, a = g.addon, rv = g.retention.visitors;
      const chg = (cur, prev) => (prev ? Math.round((cur - prev) / prev * 100) : null), sg = x => (x > 0 ? '+' : '−') + Math.abs(x) + '%';
      const c1 = chg(u.cur, u.prev); if (c1 != null && u.prev >= 3 && Math.abs(c1) >= 10) out.push([c1 > 0 ? 'ok' : 'bad', G('Người dùng mới {d} so với {n} ngày trước ({a} → {b}).', { d: sg(c1), n: P, a: num(u.prev), b: num(u.cur) })]);
      const c2 = chg(v.cur, v.prev); if (c2 != null && v.prev >= 10 && Math.abs(c2) >= 10) out.push([c2 > 0 ? 'ok' : 'bad', G('Khách mới {d} so với {n} ngày trước ({a} → {b}).', { d: sg(c2), n: P, a: num(v.prev), b: num(v.cur) })]);
      const ur = pct1(a.cur.uninstall, a.cur.install), urp = pct1(a.prev.uninstall, a.prev.install);
      if (ur != null && urp != null && a.cur.install >= 10 && a.prev.install >= 10 && Math.abs(ur - urp) >= 2) out.push(ur > urp ? ['warn', G('Tỉ lệ gỡ add-on tăng {x} điểm ({a}% → {b}%) – xem lý do gỡ.', { x: Math.round(ur - urp), a: urp, b: ur })] : ['ok', G('Tỉ lệ gỡ add-on giảm {x} điểm ({a}% → {b}%).', { x: Math.round(urp - ur), a: urp, b: ur })]);
      if (a.cur.install + a.cur.uninstall >= 5 && a.cur.uninstall > a.cur.install) out.push(['bad', G('Add-on đang cài ròng âm: gỡ nhiều hơn cài ({n}).', { n: num(a.cur.install - a.cur.uninstall) })]);
      for (const [k, lab] of [['r7', 'D2–7'], ['r1', 'D1']]) {
        const c = rv.cur[k], p = rv.prev[k]; if (c.n < 20 || p.n < 20) continue;
        const x = pct1(c.r, c.n), y = pct1(p.r, p.n); if (Math.abs(x - y) >= 3) { out.push([x < y ? 'warn' : 'ok', G(x < y ? 'Giữ chân {k} của khách thấp hơn kỳ trước ({a}% → {b}%).' : 'Giữ chân {k} của khách cao hơn kỳ trước ({a}% → {b}%).', { k: lab, a: y, b: x })]); break; }
      }
      const st = g.active.mau.cur >= 20 ? pct1(g.active.dau.cur, g.active.mau.cur) : null;
      if (st != null && st >= 20) out.push(['ok', G('Độ gắn bó DAU/MAU tốt: {p}%.', { p: st })]); else if (st != null && st < 10) out.push(['warn', G('Độ gắn bó DAU/MAU thấp: {p}% – người dùng ghé thưa.', { p: st })]);
      const hv = g.habit.visitors || {}; if (hv.prevAct >= 20 && hv.churn / hv.prevAct > 0.6) out.push(['warn', G('Rời bỏ cao: {p}% khách hoạt động kỳ trước không quay lại.', { p: Math.round(hv.churn / hv.prevAct * 100) })]);
      const f = g.funnel.all || {}, steps = [['Khách', f.visitors], ['Dùng thử', f.tried], ['Đăng ký', f.signed], ['Học đều 7 ngày', f.kept]];
      let worst = null; for (let i = 1; i < steps.length; i++) { const b = steps[i - 1][1] || 0; if (b >= 10) { const r = (steps[i][1] || 0) / b; if (!worst || r < worst.r) worst = { r, a: steps[i - 1][0], b: steps[i][0] }; } }
      if (worst && worst.r < 0.5) out.push(['warn', G('Bước rơi nhiều nhất trong phễu: {a} → {b} (chỉ {p}).', { a: G(worst.a), b: G(worst.b), p: fmtP(Math.round(worst.r * 1000) / 10) })]);
      return out.length ? `<ul class="g-ins">${out.map(([c, s]) => `<li><i class="${c}"></i><span>${esc(s)}</span></li>`).join('')}</ul>` : `<p class="small muted">${G('Chưa đủ dữ liệu để rút ra nhận định – cần thêm vài ngày số liệu.')}</p>`;
    };

    const growthHtml = g => {
      const u = g.users, a = g.addon, ac = g.active, ur = pct1(a.cur.uninstall, a.cur.install), urp = pct1(a.prev.uninstall, a.prev.install);
      const st = pct1(ac.dau.cur, ac.mau.cur), stp = pct1(ac.dau.prev, ac.mau.prev), dau = x => Math.round(x * 10) / 10;
      const plats = (u.byPlat || []).filter(r => r.cur || r.prev);
      const retRow = (lab, r) => `<tr><td>${lab}</td><td>${num(r.cur.n)}</td>${['r1', 'r7', 'r30'].map(k => { const c = r.cur[k], p = r.prev[k], x = pct1(c.r, c.n), y = pct1(p.r, p.n); return `<td>${c.n ? fmtP(x) + (p.n ? delta(x, y, { pts: true }) : '') : `<small class="muted">${G('chưa đủ tuổi')}</small>`}</td>`; }).join('')}</tr>`;
      const hab = (lab, x) => { x = x || {}; const r = pct1(x.r7, x.a7), rp = pct1(x.pr7, x.pa7), c = pct1(x.churn, x.prevAct), cp = pct1(x.pchurn, x.pprevAct); return [tile(G('Tỉ lệ quay lại học') + ` · ${lab}`, fmtP(r), x.pa7 ? delta(r, rp, { pts: true }) : '', G('hoạt động ≥ 2 ngày trong 7 ngày qua') + ` (${num(x.r7)}/${num(x.a7)})`), tile(G('Rời bỏ') + ` · ${lab}`, fmtP(c), x.pprevAct ? delta(c, cp, { pts: true, bad: true }) : '', G('hoạt động kỳ trước nhưng không quay lại kỳ này') + ` (${num(x.churn)}/${num(x.prevAct)})`)].join(''); };
      const coh = g.cohorts[cv] || [];
      const heat = coh.length ? `<div class="g-wrap"><table class="g-tbl g-heat"><tr><th>${G('Tuần bắt đầu')}</th><th>${G('Số người')}</th>${Array.from({ length: 8 }, (_, k) => `<th style="text-align:center">${G('Tuần {n}', { n: k })}</th>`).join('')}</tr>
        ${coh.map(r => { const age = Math.floor((Date.parse(g.cur) + (g.days - 1) * 864e5 - Date.parse(r.wk)) / (7 * 864e5)); return `<tr><td>${esc(r.wk)}</td><td>${num(r.size)}</td>${r.w.map((n, k) => { if (k > age) return '<td class="c"></td>'; const p = r.size ? n / r.size * 100 : 0; return `<td class="c" style="background:color-mix(in srgb, var(--primary) ${Math.round(p * 0.85)}%, transparent);${p > 55 ? 'color:#fff' : ''}" title="${num(n)}/${num(r.size)}">${r.size ? Math.round(p) + '%' : '–'}</td>`; }).join('')}</tr>`; }).join('')}</table></div>` : `<p class="small muted">${G('Chưa có dữ liệu thuần tập')}</p>`;
      return `<div class="card" style="margin-bottom:.8rem"><h3 style="margin:0">${G('🧠 Phân tích')}</h3>${insights(g)}</div>
        <div class="g-tiles">
          ${tile(G('Tổng người dùng'), num(u.total), delta(u.total, u.total - u.cur), G('+{n} mới trong kỳ', { n: num(u.cur) }))}
          ${tile(G('Người dùng mới (đăng ký)'), num(u.cur), delta(u.cur, u.prev))}
          ${tile(G('Khách mới'), num(g.newVisitors.cur), delta(g.newVisitors.cur, g.newVisitors.prev), G('thiết bị lần đầu ghé'))}
          ${tile(G('Hoạt động TB/ngày (DAU)'), num(dau(ac.dau.cur)), delta(dau(ac.dau.cur), dau(ac.dau.prev)))}
          ${tile(G('Hoạt động 7 ngày (WAU)'), num(ac.wau.cur), delta(ac.wau.cur, ac.wau.prev), G('khách + add-on, tính tới cuối kỳ'))}
          ${tile(G('Hoạt động 30 ngày (MAU)'), num(ac.mau.cur), delta(ac.mau.cur, ac.mau.prev))}
          ${tile(G('Độ gắn bó DAU/MAU'), fmtP(st), st != null && stp != null ? delta(st, stp, { pts: true }) : '')}
          ${tile(G('Add-on: cài mới'), num(a.cur.install), delta(a.cur.install, a.prev.install))}
          ${tile(G('Add-on: gỡ'), num(a.cur.uninstall), delta(a.cur.uninstall, a.prev.uninstall, { bad: true }))}
          ${tile(G('Add-on: cài ròng'), num(a.cur.install - a.cur.uninstall), delta(a.cur.install - a.cur.uninstall, a.prev.install - a.prev.uninstall), G('cài − gỡ'))}
          ${tile(G('Tỉ lệ gỡ'), fmtP(ur), ur != null && urp != null ? delta(ur, urp, { pts: true, bad: true }) : '', G('% số lượt cài'))}
        </div>
        <div class="adm-grid">
          <div class="card"><h3>${G('Người dùng mới theo nền tảng')}</h3>${plats.length ? `<table class="g-tbl"><tr><th>${G('Nền tảng')}</th><th>${G('Kỳ này')}</th><th>${G('Kỳ trước')}</th></tr>${plats.map(r => `<tr><td>${esc(PLAT[r.k] || r.k)}</td><td>${num(r.cur)}${delta(r.cur, r.prev)}</td><td>${num(r.prev)}</td></tr>`).join('')}</table><p class="small muted">${G('(nền tảng lần đồng bộ gần nhất)')}</p>` : `<p class="small muted">${G('Chưa có người dùng mới')}</p>`}</div>
          <div class="card span2"><h3>${G('🔁 Giữ chân')}</h3><div class="g-wrap"><table class="g-tbl"><tr><th>${G('Nhóm')}</th><th>${G('Số người')}</th><th>${G('D1 (ngày +1)')}</th><th>${G('D2–7')}</th><th>${G('D8–30')}</th></tr>${retRow(G('Khách ẩn danh'), g.retention.visitors)}${retRow(G('Người dùng đăng nhập'), g.retention.users)}</table></div></div>
        </div>
        <div class="g-tiles">${hab(G('khách'), g.habit.visitors)}${hab(G('người dùng'), g.habit.users)}</div>
        <div class="card"><div class="row between"><h3 style="margin:0">${G('Thuần tập theo tuần')}</h3><span class="g-chips" style="margin:0">${[['visitors', 'Khách ẩn danh'], ['users', 'Người dùng đăng nhập']].map(([k, l]) => `<button class="chip-f ${cv === k ? 'on' : ''}" data-gcv="${k}">${G(l)}</button>`).join('')}</span></div>${heat}<p class="small muted">${G('Mỗi hàng: nhóm có lần đầu ghé (hoặc đăng ký) trong tuần đó; ô = % còn hoạt động ở tuần thứ n.')}</p></div>`;
    };

    const addonHtml = g => {
      const a = g.addon, td = a.today || {};
      return `<h3 class="sec-t">${G('🧩 Add-on Chrome')}</h3>
        <div class="g-tiles">
          ${tile(G('Cài đặt 30 ngày'), num(a.i30), '', G('cập nhật: {n}', { n: num((a.events || []).reduce((s, r) => s + (r.update || 0), 0)) }))}
          ${tile(G('Gỡ 30 ngày'), num(a.u30), '', a.i30 ? fmtP(pct1(a.u30, a.i30)) + ' ' + G('% số lượt cài') : '')}
          ${tile(G('Đang dùng hôm nay'), num(td.dau))}
          ${tile(G('Đang dùng 7 ngày'), num(a.wau), '', 'MAU ' + num(a.mau))}
          ${tile(G('Tra từ hôm nay'), num(td.lookup), '', G('{n} trong 14 ngày', { n: num((a.daily || []).reduce((s, r) => s + r.lookup, 0)) }))}
          ${tile(G('Lưu thẻ hôm nay'), num(td.save))}
        </div>
        <div class="adm-grid">
          <div class="card span2"><h3>${G('Cài / gỡ theo ngày (30 ngày)')}</h3>${mini(a.events, [{ k: 'install', l: 'Cài', c: C1 }, { k: 'uninstall', l: 'Gỡ', c: C2 }])}</div>
          <div class="card"><h3>${G('Máy dùng add-on theo ngày (14 ngày)')}</h3>${mini(a.daily, [{ k: 'dau', l: 'Đang dùng hôm nay', c: C1 }])}</div>
          <div class="card span2"><h3>${G('Tra từ & lưu thẻ theo ngày (14 ngày)')}</h3>${mini(a.daily, [{ k: 'lookup', l: 'Tra từ', c: C1 }, { k: 'save', l: 'Lưu thẻ', c: C3 }, { k: 'popup', l: 'Mở popup', c: C4 }, { k: 'newtab', l: 'Tab mới', c: C2 }])}</div>
          <div class="card"><h3>${G('Phiên bản đang dùng (7 ngày)')}</h3>${hb(a.versions, r => 'v' + r.k)}<h3 style="margin-top:1rem">${G('Lý do gỡ (90 ngày)')}</h3>${hb(a.reasons, r => G(REASON[r.k] || r.k))}</div>
        </div>
        <p class="small muted">${G('Add-on gửi 1 lượt/ngày/máy (chỉ số đếm, không từ đã tra hay URL). Bản cài thử trên máy phát triển không tính cài/cập nhật.')}</p>`;
    };

    const funnelHtml = g => {
      const f = fp === 'all' ? g.funnel.all || {} : (g.funnel.plats || {})[fp] || {};
      const st = [['Khách', f.visitors, 'thiết bị có phiên trong kỳ'], ['Dùng thử', f.tried, '≥ 2 trang, ≥ 60 giây hoặc tra từ trong add-on'], ['Đăng ký', f.signed, 'đăng ký trong kỳ, gắn với thiết bị'], ['Học đều 7 ngày', f.kept, 'còn dùng ≥ 7 ngày sau đăng ký hoặc ≥ 5 lần vào']];
      const top = Math.max(1, +st[0][1] || 0);
      return `<h3 class="sec-t">${G('🔻 Phễu chuyển đổi')} <small class="muted">· ${G('{n} ngày', { n: g.days })}</small></h3>
        <div class="card"><div class="g-chips">${['all', 'web', 'pwa', 'ext', 'ios', 'android'].map(k => `<button class="chip-f ${fp === k ? 'on' : ''}" data-gfp="${k}">${k === 'all' ? G('Tất cả') : esc(PLAT[k])}</button>`).join('')}</div>
        <div class="g-fun">${st.map(([l, n, d], i) => { n = +n || 0; const p = i ? pct1(n, +st[i - 1][1] || 0) : null; return `<div class="st"><div class="hd"><span><b>${G(l)}</b> <small>· ${G(d)}</small></span><span><b>${num(n)}</b>${i ? ` <small>· ${G('{p} từ bước trước', { p: fmtP(p) })}</small>` : ''}</span></div><div class="tr"><i style="width:${n / top * 100}%"></i></div></div>`; }).join('')}</div>
        <p class="small muted">${G('Đăng ký chỉ tính thiết bị đã đồng bộ sau bản cập nhật này (gắn mã khách ẩn danh với tài khoản 1 lần/máy).')}</p></div>`;
    };

    const paint = () => {
      if (!data) return;
      box.querySelector('#gBody').innerHTML = growthHtml(data) + addonHtml(data) + funnelHtml(data);
      box.querySelectorAll('[data-gfp]').forEach(b => b.onclick = () => { fp = b.dataset.gfp; paint(); });
      box.querySelectorAll('[data-gcv]').forEach(b => b.onclick = () => { cv = b.dataset.gcv; paint(); });
    };
    const load = async () => {
      const my = ++gen;
      box.innerHTML = `<h3 class="sec-t">${G('📊 Tăng trưởng & giữ chân')}</h3>
        <div class="tools"><b>${G('Kỳ')}</b>${[7, 30, 90].map(d => `<button class="btn sm ${d === P ? 'primary' : ''}" data-gp="${d}">${G('{n} ngày', { n: d })}</button>`).join('')}<span class="small muted">${G('so với {n} ngày trước đó', { n: P })}</span></div>
        <div id="gBody"><p class="small muted">${G('Đang tải số liệu tăng trưởng…')}</p></div>`;
      box.querySelectorAll('[data-gp]').forEach(b => b.onclick = () => { P = +b.dataset.gp; try { sessionStorage.setItem('adm.gdays', P); } catch (e) { /* bỏ qua */ } load(); });
      try { const g = await api('growth', { days: P }); if (my !== gen || !box.isConnected) return; data = g; paint(); }
      catch (e) { if (my === gen && box.isConnected) box.querySelector('#gBody').innerHTML = `<p class="bad-t">✗ ${G('Không tải được số liệu tăng trưởng')}: ${esc(e.message)}</p>`; }
    };
    load();
  }
  window.AdminGrowth = { render };
})();
