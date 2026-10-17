/* Quản trị → "Kho Drive": Kho Google Drive riêng của Lexkite (sao lưu nguồn 2 cho kho dựng video – docs/ASSET-LIBRARY.md §8.6).
 * Tải lười khi mở tab (admin.js). AdminDrive.render(container, dapi, L, { esc, when, lang }) – dapi(op, body) → /api/drive (functions/api/drive.js).
 * Nút "Kết nối Google Drive" (OAuth scope drive.file – app chỉ thấy file do chính nó tạo), danh sách Drive: email, thanh dung lượng
 * (cảnh báo 80/90/95 %), trọng số chọn Drive, rút (drain) / ngắt kết nối có xác nhận, tổng dung lượng. Thiếu cấu hình → hướng dẫn cài đặt.
 * Không bao giờ nhận/hiện token: máy chủ chỉ trả email + số liệu. Chữ tiếng Anh ở bảng EN. */
(function () {
  const EN = {
    '🗄️ Kho Drive riêng': '🗄️ Private Drive storage', 'Sao lưu bản gốc, clip và bản dựng của kho tài nguyên vào Google Drive của chính bạn (nguồn sao lưu 2). App chỉ thấy file do nó tạo (quyền drive.file).': 'Back up originals, clips and renders of the asset library to your own Google Drive (backup source 2). The app only sees files it created (drive.file scope).',
    '➕ Kết nối Google Drive': '➕ Connect Google Drive', '🔄 Tải lại': '🔄 Reload', 'Đang mở Google…': 'Opening Google…', 'Tổng dung lượng': 'Total capacity', 'Đã dùng': 'Used', 'Còn trống': 'Free', '{n} Drive': ['{n} Drive', '{n} Drives'],
    'Chưa nối Drive nào. Bấm "Kết nối Google Drive" và đăng nhập tài khoản Google muốn dùng.': 'No Drive connected yet. Click "Connect Google Drive" and sign in with the Google account to use.',
    'Đang nhận file': 'Accepting files', 'Đang rút (không nhận file mới)': 'Draining (no new files)', 'Mất quyền – cần nối lại': 'Access lost – reconnect', '{n} file · {b}': ['{n} file · {b}', '{n} files · {b}'], 'Kiểm tra gần nhất: {t}': 'Last check: {t}',
    '⚠️ Đã dùng {p}% – sắp đầy': '⚠️ {p}% used – nearly full', '⛔ Đã dùng {p}% – nối thêm Drive': '⛔ {p}% used – connect another Drive', '🟡 Đã dùng {p}%': '🟡 {p}% used', 'không giới hạn': 'unlimited',
    'Trọng số (0–100)': 'Weight (0–100)', 'Lưu': 'Save', 'Drive có chỗ trống × trọng số lớn nhất nhận file mới; 0 = không nhận.': 'The Drive with the largest free space × weight gets new files; 0 = none.',
    'Cập nhật dung lượng': 'Refresh quota', 'Rút': 'Drain', 'Nhận file lại': 'Resume', 'Ngắt kết nối': 'Disconnect',
    'Rút Drive {e}? Drive sẽ không nhận file mới (file cũ vẫn giữ, vẫn tải được).': 'Drain {e}? It will stop receiving new files (existing files stay and can still be downloaded).',
    'Ngắt kết nối {e}?\nLexkite thu hồi quyền ở Google và xóa bản ghi {n} file khỏi danh sách (file trong Drive của bạn KHÔNG bị xóa).\nGõ lại email để xác nhận:': 'Disconnect {e}?\nLexkite revokes access at Google and removes {n} file record(s) from the list (files in your Drive are NOT deleted).\nType the email to confirm:',
    'Email không khớp – chưa ngắt gì.': 'Email does not match – nothing was disconnected.', '✓ Đã ngắt kết nối': '✓ Disconnected', '✓ Đã lưu': '✓ Saved', '✓ Đã cập nhật': '✓ Updated', 'Lỗi: {e}': 'Error: {e}',
    '✓ Đã nối Google Drive': '✓ Google Drive connected', 'Đã hủy kết nối ở Google': 'Connection cancelled at Google', 'Liên kết hết hạn hoặc không hợp lệ – bấm Kết nối lại': 'Link expired or invalid – click Connect again', 'Google không cấp quyền drive.file – thử lại và tích chọn quyền': 'Google did not grant drive.file – try again and tick the permission', 'Google không trả refresh token – vào myaccount.google.com/permissions gỡ Lexkite rồi nối lại': 'Google returned no refresh token – remove Lexkite at myaccount.google.com/permissions and reconnect', 'Kết nối lỗi – thử lại': 'Connection failed – try again',
    // Hướng dẫn
    '⚙️ Chưa cấu hình Kho Drive': '⚙️ Drive storage is not set up', 'Còn thiếu: {k}': 'Missing: {k}', 'Cài đặt 1 lần (khoảng 10 phút, miễn phí):': 'One-time setup (about 10 minutes, free):',
    'Mở {a} bằng tài khoản chính thức của dự án → chọn (hoặc tạo) project Lexkite.': 'Open {a} with the project\'s official account → select (or create) the Lexkite project.',
    '<b>APIs &amp; Services → Library</b> → tìm "Google Drive API" → <b>Enable</b>.': '<b>APIs &amp; Services → Library</b> → search "Google Drive API" → <b>Enable</b>.',
    '<b>Google Auth Platform → Branding</b> (màn hình đồng ý OAuth): User type <b>External</b>, tên app "Lexkite", email hỗ trợ, domain lexkite.com.': '<b>Google Auth Platform → Branding</b> (OAuth consent screen): User type <b>External</b>, app name "Lexkite", support email, domain lexkite.com.',
    '<b>Data Access → Add or remove scopes</b>: chỉ thêm {s} (không nhạy cảm – không cần Google thẩm định) + openid, email.': '<b>Data Access → Add or remove scopes</b>: add only {s} (non-sensitive – no Google verification needed) + openid, email.',
    '<b>Audience</b>: thêm chính bạn vào <b>Test users</b>, hoặc bấm <b>Publish app</b> (chỉ có drive.file nên không cần thẩm định). Ở chế độ Testing, Google tự thu hồi quyền sau 7 ngày.': '<b>Audience</b>: add yourself under <b>Test users</b>, or click <b>Publish app</b> (drive.file only, so no verification needed). In Testing mode Google revokes access after 7 days.',
    '<b>Clients → Create client</b> → Web application → <b>Authorized redirect URIs</b>: {u} → Create → chép Client ID + Client secret.': '<b>Clients → Create client</b> → Web application → <b>Authorized redirect URIs</b>: {u} → Create → copy the Client ID + Client secret.',
    'Cloudflare → Pages → lexkite → Settings → <b>Variables and Secrets</b> (Production) thêm 3 secret: {v}. DRIVE_ENC_KEY tạo bằng {c}.': 'Cloudflare → Pages → lexkite → Settings → <b>Variables and Secrets</b> (Production) add 3 secrets: {v}. Generate DRIVE_ENC_KEY with {c}.',
    'Tùy chọn cho CLI/CI: secret {k} (≥ 24 ký tự) ở cả Pages và GitHub Actions, máy: ~/.config/lexkite/drive-cli-key.': 'Optional for CLI/CI: secret {k} (≥ 24 chars) on both Pages and GitHub Actions; local: ~/.config/lexkite/drive-cli-key.',
    'Triển khai lại Pages rồi tải lại trang này → bấm "Kết nối Google Drive".': 'Redeploy Pages, reload this page → click "Connect Google Drive".',
    'Sao chép': 'Copy', '✓ Đã chép': '✓ Copied', 'CLI/CI: đã có khóa': 'CLI/CI: key set', 'CLI/CI: chưa có LEXKITE_DRIVE_CLI_KEY (CI sẽ dùng GrabCast)': 'CLI/CI: no LEXKITE_DRIVE_CLI_KEY yet (CI falls back to GrabCast)',
  };
  const BACK = { ok: '✓ Đã nối Google Drive', denied: 'Đã hủy kết nối ở Google', 'bad-state': 'Liên kết hết hạn hoặc không hợp lệ – bấm Kết nối lại', replay: 'Liên kết hết hạn hoặc không hợp lệ – bấm Kết nối lại', scope: 'Google không cấp quyền drive.file – thử lại và tích chọn quyền', 'no-refresh': 'Google không trả refresh token – vào myaccount.google.com/permissions gỡ Lexkite rồi nối lại' };
  let gen = 0;
  function render(box, dapi, L, h) {
    const esc = h.esc, lang = h.lang || (() => 'vi'), when = h.when || (t => (t ? new Date(t).toLocaleString() : '–')), my = ++gen;
    const S = (vi, vars) => {
      if (lang() !== 'en' || !Object.prototype.hasOwnProperty.call(EN, vi)) return L(vi, vars);
      let s = EN[vi]; if (Array.isArray(s)) s = s[vars && +vars.n === 1 ? 0 : 1];
      return vars ? s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? String(vars[k]) : m)) : s;
    };
    const GB = b => (b == null ? '–' : b >= 1099511627776 ? (b / 1099511627776).toFixed(2) + ' TB' : b >= 1073741824 ? (b / 1073741824).toFixed(1) + ' GB' : (b / 1048576).toFixed(0) + ' MB');
    const reload = () => render(box, dapi, L, h);
    // thông báo sau khi Google trả về (?drive=…), rồi xóa khỏi địa chỉ
    let note = '';
    try { const q = new URLSearchParams(location.search).get('drive'); if (q) { note = S(BACK[q] || 'Kết nối lỗi – thử lại'); history.replaceState(null, '', location.pathname + '#drive'); } } catch (e) { /* bỏ qua */ }
    box.innerHTML = `<div class="card"><p class="small muted">${S('Đang tải…')}</p></div>`;
    dapi('list').then(d => { if (my !== gen) return; draw(d); }).catch(e => { box.innerHTML = `<div class="card"><p class="small">${esc(S('Lỗi: {e}', { e: e.message }))}</p></div>`; });

    function draw(d) {
      const c = d.configured || {}, ready = c.client && c.secret && c.key;
      const miss = [!c.client && 'GOOGLE_DRIVE_CLIENT_ID', !c.secret && 'GOOGLE_DRIVE_CLIENT_SECRET', !c.key && 'DRIVE_ENC_KEY (32 byte base64)'].filter(Boolean);
      const pct = d.total ? Math.round(d.used / d.total * 100) : 0;
      const code = s => `<code style="word-break:break-all">${esc(s)}</code>`;
      const guide = `<div class="card" style="margin-top:1rem;border-left:4px solid #d97706"><h3 style="margin-top:0">${S('⚙️ Chưa cấu hình Kho Drive')}</h3>
        <p class="small">${S('Còn thiếu: {k}', { k: miss.map(code).join(', ') })}</p><p class="small"><b>${S('Cài đặt 1 lần (khoảng 10 phút, miễn phí):')}</b></p>
        <ol class="small" style="padding-left:1.2rem;line-height:1.6">
          <li>${S('Mở {a} bằng tài khoản chính thức của dự án → chọn (hoặc tạo) project Lexkite.', { a: '<a href="https://console.cloud.google.com/" target="_blank" rel="noopener">console.cloud.google.com</a>' })}</li>
          <li>${S('<b>APIs &amp; Services → Library</b> → tìm "Google Drive API" → <b>Enable</b>.')}</li>
          <li>${S('<b>Google Auth Platform → Branding</b> (màn hình đồng ý OAuth): User type <b>External</b>, tên app "Lexkite", email hỗ trợ, domain lexkite.com.')}</li>
          <li>${S('<b>Data Access → Add or remove scopes</b>: chỉ thêm {s} (không nhạy cảm – không cần Google thẩm định) + openid, email.', { s: code('.../auth/drive.file') })}</li>
          <li>${S('<b>Audience</b>: thêm chính bạn vào <b>Test users</b>, hoặc bấm <b>Publish app</b> (chỉ có drive.file nên không cần thẩm định). Ở chế độ Testing, Google tự thu hồi quyền sau 7 ngày.')}</li>
          <li>${S('<b>Clients → Create client</b> → Web application → <b>Authorized redirect URIs</b>: {u} → Create → chép Client ID + Client secret.', { u: code(d.redirect || 'https://lexkite.com/api/drive/callback') + ` <button class="btn ghost sm" data-copy="${esc(d.redirect || 'https://lexkite.com/api/drive/callback')}">${S('Sao chép')}</button>` })}</li>
          <li>${S('Cloudflare → Pages → lexkite → Settings → <b>Variables and Secrets</b> (Production) thêm 3 secret: {v}. DRIVE_ENC_KEY tạo bằng {c}.', { v: ['GOOGLE_DRIVE_CLIENT_ID', 'GOOGLE_DRIVE_CLIENT_SECRET', 'DRIVE_ENC_KEY'].map(code).join(', '), c: code('openssl rand -base64 32') })}</li>
          <li>${S('Tùy chọn cho CLI/CI: secret {k} (≥ 24 ký tự) ở cả Pages và GitHub Actions, máy: ~/.config/lexkite/drive-cli-key.', { k: code('LEXKITE_DRIVE_CLI_KEY') })}</li>
          <li>${S('Triển khai lại Pages rồi tải lại trang này → bấm "Kết nối Google Drive".')}</li>
        </ol></div>`;
      const band = p => (p >= 95 ? 'crit' : p >= 90 ? 'crit' : p >= 80 ? 'warn' : '');
      const warnTxt = p => (p >= 95 ? S('⛔ Đã dùng {p}% – nối thêm Drive', { p }) : p >= 90 ? S('⚠️ Đã dùng {p}% – sắp đầy', { p }) : p >= 80 ? S('🟡 Đã dùng {p}%', { p }) : '');
      const stTxt = st => (st === 'ok' ? S('Đang nhận file') : st === 'draining' ? S('Đang rút (không nhận file mới)') : S('Mất quyền – cần nối lại'));
      const card = x => {
        const p = x.quota_total ? Math.round(x.quota_used / x.quota_total * 100) : 0, w = warnTxt(p);
        return `<div class="card drv-card" data-id="${x.id}">
          <div class="row between" style="gap:.5rem;flex-wrap:wrap"><b style="word-break:break-all">${esc(x.email)}</b><span class="small ${x.status === 'ok' ? '' : 'muted'}">${x.status === 'ok' ? '🟢' : x.status === 'draining' ? '⏸️' : '🔴'} ${esc(stTxt(x.status))}</span></div>
          <div class="meter ${band(p)}"><div class="row between small"><span>${GB(x.quota_used)} / ${x.quota_total ? GB(x.quota_total) : S('không giới hạn')}</span><b>${x.quota_total ? p + '%' : ''}</b></div><div class="track"><div class="fill" style="width:${Math.min(100, p)}%"></div></div>${w ? `<div class="tiny">${esc(w)}</div>` : ''}</div>
          <p class="tiny muted" style="margin:.2rem 0">${esc(S('{n} file · {b}', { n: x.files, b: GB(x.bytes) }))} · ${esc(S('Kiểm tra gần nhất: {t}', { t: when(x.last_ok) }))}${x.err ? ' · ' + esc(x.err) : ''}</p>
          <label class="small" style="display:flex;gap:.4rem;align-items:center;flex-wrap:wrap;margin:.4rem 0">${S('Trọng số (0–100)')} <input type="number" min="0" max="100" step="1" value="${+x.weight}" data-w style="width:5rem"> <button class="btn ghost sm" data-act="weight">${S('Lưu')}</button></label>
          <div class="tools" style="display:flex;gap:.4rem;flex-wrap:wrap"><button class="btn ghost sm" data-act="quota">🔄 ${S('Cập nhật dung lượng')}</button>${x.status === 'draining' ? `<button class="btn ghost sm" data-act="resume">▶️ ${S('Nhận file lại')}</button>` : `<button class="btn ghost sm" data-act="drain" ${x.status === 'ok' ? '' : 'disabled'}>⏸️ ${S('Rút')}</button>`}<button class="btn ghost sm" data-act="disconnect" style="color:var(--again,#d1343a)">🔌 ${S('Ngắt kết nối')}</button></div>
          <p class="tiny muted" data-msg></p></div>`;
      };
      box.innerHTML = `<div class="card"><div class="row between" style="gap:.6rem;flex-wrap:wrap"><div style="min-width:0"><h3 style="margin:0">${S('🗄️ Kho Drive riêng')}</h3><p class="small muted" style="margin:.3rem 0 0">${S('Sao lưu bản gốc, clip và bản dựng của kho tài nguyên vào Google Drive của chính bạn (nguồn sao lưu 2). App chỉ thấy file do nó tạo (quyền drive.file).')}</p></div>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap"><button class="btn primary" id="drvConnect" ${ready ? '' : 'disabled'}>${S('➕ Kết nối Google Drive')}</button><button class="btn ghost" id="drvReload">${S('🔄 Tải lại')}</button></div></div>
          ${note ? `<p class="small" role="status" style="margin:.6rem 0 0"><b>${esc(note)}</b></p>` : ''}
          ${d.drives.length ? `<div class="meter ${band(pct)}" style="margin-top:1rem"><div class="row between small"><b>${S('Tổng dung lượng')} · ${esc(S('{n} Drive', { n: d.drives.length }))}</b><span>${S('Đã dùng')} ${GB(d.used)} / ${GB(d.total)} · ${S('Còn trống')} <b>${GB(d.free)}</b></span></div><div class="track"><div class="fill" style="width:${Math.min(100, pct)}%"></div></div></div>` : ''}
          <p class="tiny muted" style="margin:.4rem 0 0">${c.cli ? S('CLI/CI: đã có khóa') : S('CLI/CI: chưa có LEXKITE_DRIVE_CLI_KEY (CI sẽ dùng GrabCast)')}</p></div>
        ${ready ? '' : guide}
        ${d.drives.length ? `<p class="small muted" style="margin:1rem 0 .4rem">${S('Drive có chỗ trống × trọng số lớn nhất nhận file mới; 0 = không nhận.')}</p><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:.9rem">${d.drives.map(card).join('')}</div>`
          : ready ? `<div class="card" style="margin-top:1rem"><p class="small muted">${S('Chưa nối Drive nào. Bấm "Kết nối Google Drive" và đăng nhập tài khoản Google muốn dùng.')}</p></div>` : ''}`;
      const $ = s => box.querySelector(s);
      $('#drvReload').onclick = reload;
      const cb = $('#drvConnect'); if (cb) cb.onclick = async () => { cb.disabled = true; cb.textContent = S('Đang mở Google…'); try { const r = await dapi('connect'); location.href = r.url; } catch (e) { cb.disabled = false; cb.textContent = S('➕ Kết nối Google Drive'); alert(S('Lỗi: {e}', { e: e.message })); } };
      box.querySelectorAll('[data-copy]').forEach(b => { b.onclick = () => { try { navigator.clipboard.writeText(b.dataset.copy); b.textContent = S('✓ Đã chép'); } catch (e) { /* bỏ qua */ } }; });
      box.querySelectorAll('.drv-card').forEach(el => {
        const id = +el.dataset.id, x = d.drives.find(r => r.id === id), msg = el.querySelector('[data-msg]');
        const act = async (fn, ok) => { try { await fn(); msg.textContent = ok; setTimeout(reload, 600); } catch (e) { msg.textContent = S('Lỗi: {e}', { e: e.code || e.message }); } };
        el.querySelectorAll('[data-act]').forEach(b => {
          b.onclick = () => {
            const a = b.dataset.act;
            if (a === 'weight') return act(() => dapi('set_weight', { id, weight: +el.querySelector('[data-w]').value }), S('✓ Đã lưu'));
            if (a === 'quota') return act(() => dapi('refresh_quota', { id }), S('✓ Đã cập nhật'));
            if (a === 'drain') { if (confirm(S('Rút Drive {e}? Drive sẽ không nhận file mới (file cũ vẫn giữ, vẫn tải được).', { e: x.email }))) act(() => dapi('drain', { id }), S('✓ Đã lưu')); return; }
            if (a === 'resume') return act(() => dapi('drain', { id, on: false }), S('✓ Đã lưu'));
            if (a === 'disconnect') {
              const t = prompt(S('Ngắt kết nối {e}?\nLexkite thu hồi quyền ở Google và xóa bản ghi {n} file khỏi danh sách (file trong Drive của bạn KHÔNG bị xóa).\nGõ lại email để xác nhận:', { e: x.email, n: x.files }));
              if (t == null) return;
              if (t.trim().toLowerCase() !== x.email.toLowerCase()) { alert(S('Email không khớp – chưa ngắt gì.')); return; }
              act(() => dapi('disconnect', { id }), S('✓ Đã ngắt kết nối'));
            }
          };
        });
      });
    }
  }
  window.AdminDrive = { render };
})();
