/* Quản trị › Thông báo › thẻ "⏰ Nhắc học" (tải lười): tỉ lệ đồng ý, đã gửi, đã hiện, đã mở, CTR theo mẫu, hủy đăng ký – 30 ngày.
 * Nguồn: /api/push {op:'stats'} = bảng đếm ntf_daily (D1 nội bộ, đọc theo khóa ngày – không quét). docs/REMINDERS.md */
(function () {
  const EN = {
    '⏰ Nhắc học (30 ngày)': '⏰ Study reminders (30 days)', 'Tỉ lệ đồng ý': 'Opt-in rate', 'Đã gửi (máy chủ)': 'Sent (server)', 'Đã hiện': 'Shown', 'Đã mở': 'Opened', 'Hủy đăng ký': 'Unsubscribes',
    'Mẫu': 'Template', 'CTR': 'CTR', 'Đăng ký mới': 'New subscriptions', 'Nhóm Web Push: {p}% thiết bị · FCM: {f}': 'Web Push cohort: {p}% of devices · FCM: {f}', 'bật': 'on', 'tắt': 'off',
    'Theo loại tin': 'By message type', 'Theo giờ địa phương': 'By local hour', 'Loại': 'Type', 'Giờ': 'Hour', 'Nhắc hằng ngày kèm thẻ/từ': 'Daily (cards / words)', 'Mốc quay lại 3/7 ngày': 'Come-back (3 / 7 days)', 'Lời cuối ngày 14': 'Final (day 14)', 'Khác': 'Other',
    'Chưa có dữ liệu': 'No data yet', 'Không tải được': 'Could not load', 'Hỏi mềm: {y} đồng ý / {n} để sau': 'Soft ask: {y} yes / {n} later',
  };
  async function load() {
    const u = firebase.auth().currentUser; if (!u) throw new Error('auth');
    const r = await fetch('/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: '{"op":"stats"}' });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j;
  }
  function render(main, L, { esc, num, lang }) {
    const Q = (k, v) => { let s = lang && lang() === 'en' ? EN[k] || k : k; for (const [a, b] of Object.entries(v || {})) s = s.split('{' + a + '}').join(b); return s; };
    const box = document.createElement('div'); box.className = 'card'; box.style.marginBottom = '1rem'; box.innerHTML = `<h3>${Q('⏰ Nhắc học (30 ngày)')}</h3><p class="small muted">…</p>`;
    main.prepend(box);
    load().then(d => {
      const sum = {}; for (const r of d.rows || []) sum[r.k] = (sum[r.k] || 0) + (+r.n || 0);
      const pick = re => Object.entries(sum).filter(([k]) => re.test(k)).reduce((a, [, n]) => a + n, 0);
      const yes = pick(/^ask_yes(:|$)/), no = pick(/^ask_no(:|$)/), optin = pick(/^optin/), optout = pick(/^optout/) + (sum.unsub || 0) + (sum.gone || 0);
      const tpl = {}; for (const [k, n] of Object.entries(sum)) { const m = /^(shown|open):(\w+)$/.exec(k); if (m) (tpl[m[2]] = tpl[m[2]] || { shown: 0, open: 0 })[m[1]] += n; }
      // Theo loại tin (nhóm mẫu → loại) và theo GIỜ ĐỊA PHƯƠNG lúc hiện/mở (máy chủ đo bằng múi giờ của yêu cầu – functions/api/push.js ev)
      const GRP = id => /^bk[37]/.test(id) ? 'Mốc quay lại 3/7 ngày' : /^(ms|r_miss)/.test(id) ? 'Lời cuối ngày 14' : /^(due|word|st|cf|wk|gl|ls|gs|gen|r_back)/.test(id) ? 'Nhắc hằng ngày kèm thẻ/từ' : 'Khác';
      const grp = {}; for (const [k, v] of Object.entries(tpl)) { const g = GRP(k), o = grp[g] = grp[g] || { shown: 0, open: 0 }; o.shown += v.shown; o.open += v.open; }
      const hr = {}; for (const [k, n] of Object.entries(sum)) { const m = /^(shown|open)_h:(\d\d?)$/.exec(k); if (m) (hr[+m[2]] = hr[+m[2]] || { shown: 0, open: 0 })[m[1]] += n; }
      const ctr = v => v.shown ? Math.round(v.open / v.shown * 1000) / 10 + '%' : '–';
      const tbl = (head, list) => list.length ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>${head}</th><th>${Q('Đã hiện')}</th><th>${Q('Đã mở')}</th><th>${Q('CTR')}</th></tr></thead><tbody>${list.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${num(v.shown)}</td><td>${num(v.open)}</td><td>${ctr(v)}</td></tr>`).join('')}</tbody></table></div>` : '';
      const kpi = (l, v) => `<div class="kpi"><b>${v}</b><span class="tiny muted">${esc(l)}</span></div>`;
      const rows = Object.entries(tpl).sort((a, b) => b[1].shown - a[1].shown).map(([k, v]) => `<tr><td><code>${esc(k)}</code></td><td>${num(v.shown)}</td><td>${num(v.open)}</td><td>${v.shown ? Math.round(v.open / v.shown * 1000) / 10 + '%' : '–'}</td></tr>`).join('');
      box.innerHTML = `<h3>${Q('⏰ Nhắc học (30 ngày)')}</h3>
        <p class="tiny muted">${esc(Q('Nhóm Web Push: {p}% thiết bị · FCM: {f}', { p: d.pct || 0, f: Q(d.fcm ? 'bật' : 'tắt') }))} · ${esc(Q('Hỏi mềm: {y} đồng ý / {n} để sau', { y: yes, n: no }))}</p>
        <div class="kpis" style="display:flex;gap:1rem;flex-wrap:wrap">${kpi(Q('Tỉ lệ đồng ý'), yes + no ? Math.round(yes / (yes + no) * 100) + '%' : '–')}${kpi(Q('Đăng ký mới'), num(optin))}${kpi(Q('Đã gửi (máy chủ)'), num(sum.sent || 0))}${kpi(Q('Đã hiện'), num(pick(/^shown/)))}${kpi(Q('Đã mở'), num(pick(/^open/)))}${kpi(Q('Hủy đăng ký'), num(optout))}</div>
        ${rows ? `<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>${Q('Mẫu')}</th><th>${Q('Đã hiện')}</th><th>${Q('Đã mở')}</th><th>${Q('CTR')}</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="small muted">${Q('Chưa có dữ liệu')}</p>`}
        ${tbl(Q('Loại'), Object.entries(grp).map(([k, v]) => [Q(k), v])).replace('<table', `<h4 class="tiny muted">${Q('Theo loại tin')}</h4><table`)}
        ${tbl(Q('Giờ'), Object.entries(hr).sort((a, b) => a[0] - b[0]).map(([h, v]) => [String(h).padStart(2, '0') + ':00', v])).replace('<table', `<h4 class="tiny muted">${Q('Theo giờ địa phương')}</h4><table`)}`;
    }).catch(e => { box.innerHTML = `<h3>${Q('⏰ Nhắc học (30 ngày)')}</h3><p class="small muted">✗ ${esc(Q('Không tải được'))}: ${esc(e.message)}</p>`; });
  }
  window.AdminPush = { render };
})();
