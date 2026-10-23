/* Quản trị → Hạn mức (tải lười): top dùng nhiều hôm nay, nhà cung cấp so với trần miễn phí, khóa/mở khóa, sửa hạn mức, danh sách không giới hạn, nhật ký.
 * Gọi /api/quota (functions/api/quota.js, chỉ quản trị). admin.js chỉ gọi AdminQuota.render(container, L, { esc, num, when, lang }).
 * Chữ tiếng Anh trong bảng EN riêng (không đụng bảng EN của admin.js). Mọi dữ liệu hiển thị đều qua esc(). Tài liệu: docs/QUOTAS.md */
(function () {
  const EN = {
    '🗓️ Lịch việc nền': '🗓️ Background job schedule', 'Việc': 'Job', 'Ưu tiên': 'Priority', 'Tài nguyên': 'Resources', 'Hôm nay': 'Today', 'D1 nội bộ': 'Internal D1', 'D1 chính': 'Main D1', 'dòng đọc': 'rows read',
    'Việc nặng thuê tài nguyên độc quyền; đang có việc khác giữ hoặc ngân sách D1 gần cạn → bỏ qua tới khung kế (lý do hiện ở cột cuối). Nguồn: docs/JOBS.md.': 'Heavy jobs lease exclusive resources; if another job holds them or the D1 budget is low they skip to the next slot (reason in the last column). Source: docs/JOBS.md.',
    '🗄️ D1 hôm nay': '🗄️ D1 today', 'Dòng đọc': 'Rows read', 'Dòng ghi': 'Rows written', '(chỉ phần Kho Drive – thêm CF_ANALYTICS_TOKEN + CF_ACCOUNT_ID để thấy cả tài khoản)': '(Drive storage only – add CF_ANALYTICS_TOKEN + CF_ACCOUNT_ID to see the whole account)',
    'Cảnh báo (thư + chuông) ở 60%; việc nền (Kho Drive, archive, verify) tự dừng khi ≥ 50% hạn mức đọc – người học không bị ảnh hưởng.': 'Alert (mail + bell) at 60%; background jobs (Drive storage, archive, verify) stop at ≥ 50% of the read limit – learners are never affected.', 'đang chặn việc nền': 'background jobs blocked',
    'Hạn mức': 'Quotas', 'Đang tải…': 'Loading…', 'Không tải được': 'Could not load', 'Làm mới': 'Refresh',
    '⚡ Nhà cung cấp hôm nay': '⚡ Providers today', 'Cầu dao ở {p}% trần: gần trần → tự hạ cấp (Workers AI thay Gemini, lưu tin chưa gửi thư) hoặc báo bận.': 'Breaker at {p}% of the cap: near the cap → auto-degrade (Workers AI instead of Gemini, store messages without mailing) or report busy.',
    '🔥 Dùng nhiều nhất hôm nay': '🔥 Top consumers today', 'Tính năng': 'Feature', 'Lượt': 'Uses', 'Chưa có dữ liệu': 'No data yet', 'Khóa': 'Block', 'Mở khóa': 'Unblock',
    'Chỉ tính năng đếm ở D1 (ai, chat, handoff, contact). Đồng bộ/thống kê/ảnh đếm ở biên – xem mục gắn cờ.': 'Only D1-counted features (ai, chat, handoff, contact). Sync/analytics/images are counted at the edge – see flags.',
    '🚫 Đang khóa': '🚫 Blocked', 'Đến': 'Until', 'Vô thời hạn': 'Forever', 'Lý do': 'Reason', 'Bởi': 'By',
    'id (u:/d:/i:), email hoặc IP': 'id (u:/d:/i:), email or IP', 'Số phút (0 = vô thời hạn)': 'Minutes (0 = forever)',
    '🤖 Gắn cờ tự động (7 ngày)': '🤖 Auto-flagged (7 days)', 'Lỗi': 'Strikes', 'Lần khóa': 'Bans', 'Lần cuối': 'Last', 'Khóa đến': 'Banned until',
    '♾️ Không giới hạn': '♾️ Unlimited', 'Ngoài danh sách này: ADMIN_EMAILS và UNLIMITED_EMAILS (biến môi trường Cloudflare Pages).': 'Also unlimited: ADMIN_EMAILS and UNLIMITED_EMAILS (Cloudflare Pages env vars).',
    'Ghi chú': 'Note', 'Thêm': 'Add', 'Gỡ': 'Remove',
    '🎚️ Hạn mức theo tính năng': '🎚️ Limits per feature', 'Khách /phút': 'Guest /min', 'Khách /ngày': 'Guest /day', 'Đăng nhập /phút': 'Signed-in /min', 'Đăng nhập /ngày': 'Signed-in /day',
    '× IP': '× IP', 'Đếm': 'Store', 'Lưu': 'Save', 'Mặc định': 'Default', 'đã chỉnh': 'custom',
    'Trần theo IP = hệ số × mức cao nhất (chặn xoay mã thiết bị). Thay đổi áp dụng trong ≤ 1 phút.': 'Per-IP cap = factor × the highest tier limit (stops device-id rotation). Changes apply within 1 minute.',
    '📝 Nhật ký thay đổi': '📝 Change log', 'Lúc': 'At', 'Thao tác': 'Action', 'Đối tượng': 'Target', '✓ Đã lưu': '✓ Saved', 'Lỗi: {e}': 'Error: {e}',
  };
  async function qapi(op, body = {}) {
    const u = firebase.auth().currentUser; if (!u) throw new Error('auth');
    const r = await fetch('/api/quota', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'HTTP ' + r.status); return j;
  }
  function render(box, L, { esc, num, when, lang }) {
    const Q = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); const s = EN[vi]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const tab = document.querySelector('#tabs [data-tab="quota"] .nav-l'); if (tab) tab.textContent = Q('Hạn mức');
    const NODATA = `<p class="small muted">${Q('Chưa có dữ liệu')}</p>`;
    const till = t => (t ? when(t) : Q('Vô thời hạn'));
    const hm = t => new Date(t).toISOString().slice(11, 16);
    function jobsView(jt) {
      const ran = new Map(); for (const r of jt.runs) ran.set(r.job, [...(ran.get(r.job) || []), r]);
      const bud = Object.entries(jt.budget || {}).map(([w, u]) => `${w === 'b' ? Q('D1 nội bộ') : Q('D1 chính')}: ${num(u.reads)} ${Q('dòng đọc')} (${Math.round(u.ratio * 100)}%)`).join(' · ');
      const rows = jt.jobs.map(j => { const rs = ran.get(j.id) || [], last = rs[rs.length - 1];
        const st = !last ? '<span class="muted">—</span>' : last.status === 'ok' ? '✓ ' + hm(last.started) : last.status === 'running' ? '⏳ ' + hm(last.started) : last.status === 'skipped' ? '⏭ ' + esc(last.reason || '') : last.status === 'expired' ? '⌛ ' + hm(last.started) : '✗ ' + hm(last.started) + (last.reason ? ' ' + esc(last.reason) : '');
        return `<tr><td><code>${esc(j.id)}</code></td><td class="small">${esc(j.cron.join(' | '))}</td><td class="small">${esc(j.priority)}</td><td class="small">${esc(j.resources.join(', '))}</td><td class="small">${st}</td></tr>`; }).join('');
      const held = (jt.leases || []).map(l => `${esc(l.resource)} ← ${esc(l.job)}`).join(' · ');
      return `<p class="small" style="margin:.2rem 0">${esc(jt.day)} UTC · ${bud || '—'}</p>${held ? `<p class="small">🔒 ${held}</p>` : ''}<div style="overflow-x:auto"><table class="tbl"><thead><tr><th>${Q('Việc')}</th><th>cron (UTC)</th><th>${Q('Ưu tiên')}</th><th>${Q('Tài nguyên')}</th><th>${Q('Hôm nay')}</th></tr></thead><tbody>${rows}</tbody></table></div><p class="tiny muted">${Q('Việc nặng thuê tài nguyên độc quyền; đang có việc khác giữ hoặc ngân sách D1 gần cạn → bỏ qua tới khung kế (lý do hiện ở cột cuối). Nguồn: docs/JOBS.md.')}</p>`;
    }
    async function act(op, body) { try { await qapi(op, body); await load(); } catch (e) { alert(Q('Lỗi: {e}', { e: e.message })); } }
    async function load() {
      box.innerHTML = `<p class="small muted">${Q('Đang tải…')}</p>`;
      let jt = null; try { jt = await qapi('jobs'); } catch (e) { jt = null; }
      let s; try { s = await qapi('state'); } catch (e) { box.innerHTML = `<p class="bad-t">✗ ${Q('Không tải được')}: ${esc(e.message)}</p>`; return; }
      const blockBtn = id => `<button class="btn sm ghost danger" data-block="${esc(id)}">${Q('Khóa')}</button>`;
      const prov = s.providers.map(p => `<div class="meter ${p.pct >= 80 ? 'crit' : p.pct >= 60 ? 'warn' : ''}"><div class="row between small"><b>${esc(p.p)} <span class="muted">(${esc(p.unit)})</span></b><span>${num(p.used)} / ${num(p.cap)} · <b>${p.pct}%</b></span></div><div class="bar"><i style="width:${Math.min(100, p.pct)}%"></i></div></div>`).join('');
      const tops = Object.entries(s.top).map(([f, rows]) => `<h4 style="margin:.8rem 0 .3rem">${esc(f)}</h4><table class="tbl"><tbody>${rows.map(r => `<tr><td><code>${esc(r.id)}</code>${r.email ? ` <span class="small muted">${esc(r.email)}</span>` : ''}</td><td>${num(r.n)}</td><td>${blockBtn(r.id)}</td></tr>`).join('')}</tbody></table>`).join('') || NODATA;
      const blocks = s.blocks.length ? `<table class="tbl"><thead><tr><th>id</th><th>${Q('Đến')}</th><th>${Q('Lý do')}</th><th>${Q('Bởi')}</th><th></th></tr></thead><tbody>${s.blocks.map(b => `<tr><td><code>${esc(b.id)}</code></td><td>${esc(till(b.until))}</td><td>${esc(b.reason)}</td><td class="small">${esc(b.by)}</td><td><button class="btn sm ghost" data-unblock="${esc(b.id)}">${Q('Mở khóa')}</button></td></tr>`).join('')}</tbody></table>` : NODATA;
      const flags = s.flags.length ? `<table class="tbl"><thead><tr><th>id</th><th>${Q('Tính năng')}</th><th>${Q('Lỗi')}</th><th>${Q('Lần khóa')}</th><th>${Q('Lần cuối')}</th><th>${Q('Khóa đến')}</th><th></th></tr></thead><tbody>${s.flags.map(f => `<tr><td><code>${esc(f.id)}</code></td><td>${esc(f.feature)}</td><td>${num(f.strikes)}</td><td>${num(f.bans)}</td><td class="small">${esc(when(f.last))}</td><td class="small">${f.until > Date.now() ? esc(when(f.until)) : '–'}</td><td>${f.until > Date.now() ? `<button class="btn sm ghost" data-unblock="${esc(f.id)}">${Q('Mở khóa')}</button>` : blockBtn(f.id)}</td></tr>`).join('')}</tbody></table>` : NODATA;
      const allow = s.allow.length ? `<table class="tbl"><tbody>${s.allow.map(a => `<tr><td><code>${esc(a.id)}</code></td><td>${esc(a.note)}</td><td class="small">${esc(a.by)}</td><td><button class="btn sm ghost" data-unallow="${esc(a.id)}">${Q('Gỡ')}</button></td></tr>`).join('')}</tbody></table>` : NODATA;
      const inp = (f, k, i, v) => `<input type="number" min="0" style="width:6.5rem" data-f="${esc(f)}" data-k="${k}" data-i="${i}" value="${+v}">`;
      const feats = `<table class="tbl"><thead><tr><th>${Q('Tính năng')}</th><th>${Q('Khách /phút')}</th><th>${Q('Khách /ngày')}</th><th>${Q('Đăng nhập /phút')}</th><th>${Q('Đăng nhập /ngày')}</th><th>${Q('× IP')}</th><th>${Q('Đếm')}</th><th></th></tr></thead><tbody>${s.features.map(f => `<tr><td><b>${esc(f.feature)}</b>${f.custom ? ` <span class="pill warn">${Q('đã chỉnh')}</span>` : ''}</td><td>${inp(f.feature, 'anon', 0, f.anon[0])}</td><td>${inp(f.feature, 'anon', 1, f.anon[1])}</td><td>${inp(f.feature, 'free', 0, f.free[0])}</td><td>${inp(f.feature, 'free', 1, f.free[1])}</td><td>${inp(f.feature, 'ipx', 0, f.ipx)}</td><td class="small">${esc(f.store)}</td><td><button class="btn sm primary" data-save="${esc(f.feature)}">${Q('Lưu')}</button>${f.custom ? ` <button class="btn sm ghost" data-reset="${esc(f.feature)}">${Q('Mặc định')}</button>` : ''}</td></tr>`).join('')}</tbody></table>`;
      const audit = s.audit.length ? `<table class="tbl"><thead><tr><th>${Q('Lúc')}</th><th>${Q('Bởi')}</th><th>${Q('Thao tác')}</th><th>${Q('Đối tượng')}</th><th>${Q('Ghi chú')}</th></tr></thead><tbody>${s.audit.map(a => `<tr><td class="small">${esc(when(a.at))}</td><td class="small">${esc(a.email)}</td><td>${esc(a.op)}</td><td><code>${esc(a.target)}</code></td><td class="small">${esc(a.detail)}</td></tr>`).join('')}</tbody></table>` : NODATA;
      box.innerHTML = `<div class="row between"><h3 class="sec-t">${Q('Hạn mức')} · ${esc(s.day)}</h3><button class="btn sm ghost" id="qRe">↻ ${Q('Làm mới')}</button></div>
        <div class="card"><h3>${Q('🗄️ D1 hôm nay')}</h3>${s.d1 ? `<p class="small" style="margin:.3rem 0"><b>${Q('Dòng đọc')}</b>: ${num(s.d1.reads)} / ${num(s.d1.limitReads)} (${Math.round(s.d1.reads / s.d1.limitReads * 100)}%) ${s.d1.source === 'own' ? '<span class="tiny muted">' + esc(Q('(chỉ phần Kho Drive – thêm CF_ANALYTICS_TOKEN + CF_ACCOUNT_ID để thấy cả tài khoản)')) + '</span>' : ''}</p>${s.d1.writes != null ? `<p class="small" style="margin:.3rem 0"><b>${Q('Dòng ghi')}</b>: ${num(s.d1.writes)} / ${num(s.d1.limitWrites)} (${Math.round(s.d1.writes / s.d1.limitWrites * 100)}%)</p>` : ''}<div class="track" style="height:8px"><div class="fill" style="width:${Math.min(100, Math.round(s.d1.ratio * 100))}%;${s.d1.alert ? 'background:var(--danger,#c0392b)' : ''}"></div></div><p class="tiny muted">${Q('Cảnh báo (thư + chuông) ở 60%; việc nền (Kho Drive, archive, verify) tự dừng khi ≥ 50% hạn mức đọc – người học không bị ảnh hưởng.')}${s.d1.block ? ' ⛔ ' + esc(Q('đang chặn việc nền')) : ''}</p>` : '<p class="tiny muted">—</p>'}</div>
        <div class="card"><h3>${Q('⚡ Nhà cung cấp hôm nay')}</h3>${prov}<p class="tiny muted">${Q('Cầu dao ở {p}% trần: gần trần → tự hạ cấp (Workers AI thay Gemini, lưu tin chưa gửi thư) hoặc báo bận.', { p: Math.round(s.breaker * 100) })}</p></div>
        <div class="card" style="margin-top:1rem"><h3>${Q('🗓️ Lịch việc nền')}</h3>${jt ? jobsView(jt) : NODATA}</div>
        <div class="card" style="margin-top:1rem"><h3>${Q('🔥 Dùng nhiều nhất hôm nay')}</h3><p class="tiny muted">${Q('Chỉ tính năng đếm ở D1 (ai, chat, handoff, contact). Đồng bộ/thống kê/ảnh đếm ở biên – xem mục gắn cờ.')}</p>${tops}</div>
        <div class="card" style="margin-top:1rem"><h3>${Q('🚫 Đang khóa')}</h3><div class="tools" style="margin:.5rem 0"><input id="qbT" placeholder="${esc(Q('id (u:/d:/i:), email hoặc IP'))}" style="min-width:16rem"><input id="qbM" type="number" min="0" value="60" title="${esc(Q('Số phút (0 = vô thời hạn)'))}" style="width:6rem"><input id="qbR" placeholder="${esc(Q('Lý do'))}"><button class="btn sm primary" id="qbAdd">${Q('Khóa')}</button></div><p class="tiny muted">${Q('Số phút (0 = vô thời hạn)')}</p>${blocks}</div>
        <div class="card" style="margin-top:1rem"><h3>${Q('🤖 Gắn cờ tự động (7 ngày)')}</h3>${flags}</div>
        <div class="card" style="margin-top:1rem"><h3>${Q('♾️ Không giới hạn')}</h3><p class="tiny muted">${Q('Ngoài danh sách này: ADMIN_EMAILS và UNLIMITED_EMAILS (biến môi trường Cloudflare Pages).')}</p><div class="tools" style="margin:.5rem 0"><input id="qaT" placeholder="${esc(Q('id (u:/d:/i:), email hoặc IP'))}" style="min-width:16rem"><input id="qaN" placeholder="${esc(Q('Ghi chú'))}"><button class="btn sm primary" id="qaAdd">${Q('Thêm')}</button></div>${allow}</div>
        <div class="card" style="margin-top:1rem"><h3>${Q('🎚️ Hạn mức theo tính năng')}</h3><p class="tiny muted">${Q('Trần theo IP = hệ số × mức cao nhất (chặn xoay mã thiết bị). Thay đổi áp dụng trong ≤ 1 phút.')}</p><div style="overflow-x:auto">${feats}</div></div>
        <div class="card" style="margin-top:1rem"><h3>${Q('📝 Nhật ký thay đổi')}</h3>${audit}</div>`;
      const $ = sel => box.querySelector(sel);
      $('#qRe').onclick = load;
      $('#qbAdd').onclick = () => act('blockSet', { target: $('#qbT').value, minutes: +$('#qbM').value || 0, reason: $('#qbR').value });
      $('#qaAdd').onclick = () => act('allowSet', { target: $('#qaT').value, note: $('#qaN').value });
      box.querySelectorAll('[data-block]').forEach(b => b.onclick = () => { const reason = prompt(Q('Lý do'), ''); if (reason !== null) act('blockSet', { target: b.dataset.block, minutes: 60, reason }); });
      box.querySelectorAll('[data-unblock]').forEach(b => b.onclick = () => act('blockDelete', { id: b.dataset.unblock }));
      box.querySelectorAll('[data-unallow]').forEach(b => b.onclick = () => act('allowDelete', { id: b.dataset.unallow }));
      box.querySelectorAll('[data-reset]').forEach(b => b.onclick = () => act('configReset', { feature: b.dataset.reset }));
      box.querySelectorAll('[data-save]').forEach(b => b.onclick = () => {
        const f = b.dataset.save, v = { anon: [0, 0], free: [0, 0], ipx: 1 };
        box.querySelectorAll(`input[data-f="${f}"]`).forEach(i => { const n = Math.max(0, Math.floor(+i.value || 0)); if (i.dataset.k === 'ipx') v.ipx = Math.max(1, n); else v[i.dataset.k][+i.dataset.i] = n; });
        act('configSet', { feature: f, v });
      });
    }
    load();
  }
  window.AdminQuota = { render };
})();
