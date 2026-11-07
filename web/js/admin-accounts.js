/* Quản trị → Sổ tài khoản & khóa (tải lười): mọi dịch vụ/khóa/tài khoản dịch vụ thuộc email nào, tài khoản nào, giữ ở đâu (TÊN biến – không bao giờ giá trị),
 * phạm vi, hạn + nhắc trước 14 ngày, link quản lý. Gọi /api/admin-accounts (functions/api/admin-accounts.js, chỉ admin; xem/sửa đều ghi nhật ký).
 * AdminAccounts.render(container, L, { esc, when, lang }). Dùng chung mọi admin: admin khác sửa → tự làm mới + "Vừa cập nhật bởi …" (admin-sync.js). Spec: docs/ACCOUNTS-LEDGER.md */
(function () {
  const EN = {
    '🗂️ Sổ tài khoản & khóa': '🗂️ Accounts & keys', 'Chỉ hiện TÊN biến và nơi lưu – không bao giờ hiện giá trị. Email chủ và hạn nhập tay ở đây, dùng chung mọi admin.': 'Shows variable NAMES and where they live – never values. Owner email and expiry are entered here and shared by every admin.',
    'Đang tải…': 'Loading…', 'Lỗi: {e}': 'Error: {e}', 'Làm mới': 'Refresh', 'Dịch vụ': 'Service', 'Email chủ': 'Owner email', 'Tài khoản': 'Account', 'Nơi lưu & tên': 'Stored in & names', 'Phạm vi': 'Scope', 'Hết hạn': 'Expires', 'Quản lý': 'Manage',
    'Sửa': 'Edit', 'Lưu': 'Save', 'Hủy': 'Cancel', '✓ Đã lưu': '✓ Saved', 'chưa nhập': 'not set', 'Mở trang quản lý': 'Open management page', 'còn {d} ngày': '{d} days left', 'đã hết hạn {d} ngày': 'expired {d} days ago',
    'Cần gia hạn trong 14 ngày': 'Renew within 14 days', 'có': 'set', 'thiếu': 'missing', 'chưa rõ': 'unknown', 'tệp máy': 'local file',
    'Cloudflare Pages': 'Cloudflare Pages', 'GitHub Actions': 'GitHub Actions', 'Tệp trên máy chủ dự án': 'File on the project machine',
    'GitHub chưa đọc được tên secret (token thiếu quyền Secrets: read) – cột trạng thái ghi "chưa rõ".': 'GitHub secret names could not be read (token lacks Secrets: read) – status shows "unknown".',
    'Có trên GitHub nhưng chưa đăng ký trong sổ: {n}': 'On GitHub but not in the ledger: {n}', 'Email chủ (tùy chọn)': 'Owner email (optional)', 'Hạn (YYYY-MM-DD)': 'Expiry (YYYY-MM-DD)', 'Ghi chú (không dán khóa)': 'Note (do not paste keys)',
    'Không dán khóa vào ô này': 'Do not paste keys here', 'Email không hợp lệ': 'Invalid email', 'Hạn không hợp lệ': 'Invalid date', 'Vừa cập nhật bởi {who}': 'Just updated by {who}',
  };
  const syncJs = () => window.AdminSync ? Promise.resolve() : new Promise(y => { const sc = document.createElement('script'); sc.src = 'js/admin-sync.js'; sc.onload = y; sc.onerror = y; document.head.appendChild(sc); });
  async function api(op, body = {}) {
    const u = firebase.auth().currentUser; if (!u) throw new Error('auth');
    const r = await fetch('/api/admin-accounts', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: JSON.stringify({ op, ...body }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) { const e = new Error(j.error || 'HTTP ' + r.status); e.code = j.error; throw e; } return j;
  }
  const ERR = { owner: 'Email không hợp lệ', expires: 'Hạn không hợp lệ', 'secret-in-text': 'Không dán khóa vào ô này' };
  let gen = 0;
  function render(box, L, h) {
    const esc = h.esc, lang = h.lang || (() => 'vi'), my = ++gen;
    const S = (vi, vars) => { if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars); const s = EN[vi]; return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s; };
    const STORE = { pages: 'Cloudflare Pages', github: 'GitHub Actions', local: 'Tệp trên máy chủ dự án' }, STL = { set: ['ok', 'có'], missing: ['bad', 'thiếu'], unknown: ['muted', 'chưa rõ'], local: ['muted', 'tệp máy'] };
    let D = null, edit = '';
    const safeUrl = u => (/^https:\/\//.test(u || '') ? u : '#');
    const dleft = r => (r.days == null ? '' : r.days >= 0 ? S('còn {d} ngày', { d: r.days }) : S('đã hết hạn {d} ngày', { d: -r.days }));
    function draw() {
      const rows = D.rows.map(r => {
        const names = r.names.map(n => { const [c, t] = STL[n.state] || STL.unknown; return `<li><code>${esc(n.n)}</code> <span class="chip ${c}">${esc(S(t))}</span></li>`; }).join('');
        const ed = edit === r.id;
        const tail = ed ? `<td colspan="2"><form data-f="${esc(r.id)}" class="acc-form" style="display:grid;gap:.4rem;max-width:30rem">
            <label>${esc(S('Email chủ (tùy chọn)'))}<input class="inp" name="owner" type="email" maxlength="120" autocomplete="off" value="${esc(r.owner)}"></label>
            <label>${esc(S('Tài khoản'))}<input class="inp" name="account" maxlength="120" value="${esc(r.account)}"></label>
            <label>${esc(S('Hạn (YYYY-MM-DD)'))}<input class="inp" name="expires" maxlength="10" placeholder="2027-01-31" value="${esc(r.expires)}"></label>
            <label>${esc(S('Ghi chú (không dán khóa)'))}<input class="inp" name="note" maxlength="300" autocomplete="off" value="${esc(r.note)}"></label>
            <p class="small bad-t" data-err role="alert" hidden></p><div><button class="btn primary sm" type="submit">${esc(S('Lưu'))}</button> <button class="btn ghost sm" type="button" data-x>${esc(S('Hủy'))}</button></div></form></td>`
          : `<td>${r.owner ? esc(r.owner) : `<span class="muted">${esc(S('chưa nhập'))}</span>`}<br><span class="tiny muted">${esc(r.account)}</span></td>
          <td>${r.expires ? `<span class="${r.due ? 'bad-t' : ''}">${esc(r.expires)}</span><br><span class="tiny ${r.due ? 'bad-t' : 'muted'}">${esc(dleft(r))}</span>` : '–'}<br><button class="btn ghost sm" data-e="${esc(r.id)}">${esc(S('Sửa'))}</button></td>`;
        return `<tr${r.due ? ' class="acc-due-row"' : ''}><td><b>${esc(r.service)}</b>${r.scope ? `<br><span class="tiny muted">${esc(r.scope)}</span>` : ''}${r.note ? `<br><span class="tiny muted">${esc(r.note)}</span>` : ''}</td>
          <td><span class="tiny muted">${esc(S(STORE[r.store] || r.store))}</span><ul class="tiny" style="margin:.2rem 0 0;padding-left:1rem;list-style:none">${names}</ul></td>${tail}
          <td><a href="${esc(safeUrl(r.manage))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(S('Mở trang quản lý'))}: ${esc(r.service)}">↗</a></td></tr>`;
      }).join('');
      const due = D.due.length ? `<div class="acc-due" role="alert"><b>⏰ ${esc(S('Cần gia hạn trong 14 ngày'))}</b><span>${D.due.map(d => `${esc(d.service)} (${esc(d.expires)})`).join(' · ')}</span></div>` : '';
      const gh = !D.gh.ok ? `<p class="tiny muted">${esc(S('GitHub chưa đọc được tên secret (token thiếu quyền Secrets: read) – cột trạng thái ghi "chưa rõ".'))}</p>` : '';
      const extra = D.extra.length ? `<p class="tiny bad-t">${esc(S('Có trên GitHub nhưng chưa đăng ký trong sổ: {n}', { n: D.extra.join(', ') }))}</p>` : '';
      box.innerHTML = `<div class="card"><div class="acc-h"><h2 class="sr-only">${esc(S('🗂️ Sổ tài khoản & khóa'))}</h2><p class="small muted">${esc(S('Chỉ hiện TÊN biến và nơi lưu – không bao giờ hiện giá trị. Email chủ và hạn nhập tay ở đây, dùng chung mọi admin.'))}</p><button class="btn ghost sm" id="accR">↻ ${esc(S('Làm mới'))}</button></div>${due}${gh}${extra}
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${esc(S('Dịch vụ'))}</th><th>${esc(S('Nơi lưu & tên'))}</th><th>${esc(S('Email chủ'))} / ${esc(S('Tài khoản'))}</th><th>${esc(S('Hết hạn'))}</th><th>${esc(S('Quản lý'))}</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
      box.querySelector('#accR').onclick = () => load(true);
      box.querySelectorAll('[data-e]').forEach(b => { b.onclick = () => { edit = b.dataset.e; draw(); }; });
      const f = box.querySelector('.acc-form');
      if (f) {
        f.querySelector('[data-x]').onclick = () => { edit = ''; draw(); };
        f.onsubmit = async ev => { ev.preventDefault(); const v = Object.fromEntries(new FormData(f)), er = f.querySelector('[data-err]');
          try { await api('set', { id: f.dataset.f, ...v }); edit = ''; await load(); } catch (e) { er.hidden = false; er.textContent = S(ERR[e.code] || 'Lỗi: {e}', { e: e.code || e.message }); } };
      }
    }
    const load = force => api('list', force ? { force: true } : {}).then(d => { if (my !== gen) return; D = d; draw(); }).catch(e => { if (my === gen) box.innerHTML = `<div class="card"><p class="small bad-t">${esc(S('Lỗi: {e}', { e: e.code || e.message }))}</p></div>`; });
    box.innerHTML = `<div class="card" aria-busy="true" aria-label="${esc(S('Đang tải…'))}"><span class="sk" style="height:1rem;width:60%"></span><span class="sk sk-block" style="height:220px"></span></div>`; // khung xương cao gần bằng bảng thật → không co/giãn
    load();
    syncJs().then(() => { if (my === gen && window.AdminSync) AdminSync.watch(['accounts'], () => (my === gen && !edit ? load() : null), { box, S }); });
  }
  window.AdminAccounts = { render, _api: api };
})();
