/* Quản trị: Cài đặt nâng cao tài khoản quản trị (web/js/admin-prefs.js).
 * Khối "🛡️ Tài khoản quản trị":
 * - Tab mặc định khi mở, ngôn ngữ & giao diện mặc định (đồng bộ D1 config qua /api/admin-prefs).
 * - Chọn loại cảnh báo nhận qua email & ngưỡng (lỗi JS/24h, dung lượng D1 %).
 * - Tự đăng xuất sau N phút không thao tác (0, 15, 30, 60, 120 phút).
 * - Xuất nhật ký quản trị CSV & xem các thao tác gần đây của tài khoản.
 */
(() => {
  'use strict';

  const EN = {
    'Tài khoản quản trị': 'Admin account',
    'Cài đặt cá nhân hóa cho tài khoản quản trị: tab mặc định, thông báo cảnh báo và bảo mật phiên.': 'Personalized settings for admin account: default tab, alert notifications, and session security.',
    'Tab mặc định khi mở': 'Default tab on open',
    'Ngôn ngữ mặc định': 'Default language',
    'Tiếng Việt': 'Vietnamese',
    'Tiếng Anh': 'English',
    'Giao diện mặc định': 'Default theme',
    'Tự động theo hệ thống': 'Auto (system)',
    'Sáng': 'Light',
    'Tối': 'Dark',
    'Tự đăng xuất khi không thao tác': 'Auto logout on inactivity',
    'Không tự đăng xuất': 'Disabled (never)',
    '{n} phút': '{n} minutes',
    'Nhận cảnh báo qua email': 'Receive email alerts',
    'Chọn các loại cảnh báo gửi về email quản trị:': 'Select alert types sent to admin email:',
    'Lỗi JavaScript người dùng': 'User JavaScript errors',
    'Tác vụ GitHub tự động thất bại': 'Automated GitHub workflow failures',
    'Tin nhắn liên hệ mới': 'New contact messages',
    'Cảnh báo chất lượng / bài thi': 'Quality / exam alerts',
    'Thiếu bản dịch / nghi sai nghĩa': 'Missing translations / translation flags',
    'Dung lượng D1 / AI sắp đầy': 'D1 storage / AI quota warnings',
    'Ngưỡng cảnh báo lỗi JS / 24h': 'JS error threshold / 24h',
    'Ngưỡng dung lượng D1 (%)': 'D1 storage threshold (%)',
    'Lưu cài đặt tài khoản': 'Save account settings',
    'Đang lưu…': 'Saving…',
    'Đã lưu cài đặt tài khoản': 'Saved account settings',
    'Không lưu được': 'Could not save',
    '⬇ Xuất nhật ký quản trị (CSV)': '⬇ Export admin audit log (CSV)',
    'Đang xuất CSV…': 'Exporting CSV…',
    'Đã xuất {n} dòng nhật ký': 'Exported {n} log rows',
    'Lỗi xuất CSV': 'Error exporting CSV',
    'Lịch sử thao tác của bạn': 'Your recent activity',
    'Các thao tác gần đây được ghi lại từ tài khoản này.': 'Recent actions recorded from this account.',
    'Chưa có thao tác nào': 'No recent actions recorded',
    'Thao tác': 'Action',
    'Lúc': 'Time',
    'Kết quả': 'Result',
    'Thành công': 'Success',
    'Thất bại': 'Failed',
    'IP': 'IP',
    'Quốc gia': 'Country',
    'Tổng quan': 'Overview',
    'Phân tích': 'Analytics',
    'Trực tiếp': 'Live',
    'Người dùng': 'Users',
    'Hộp thư': 'Inbox',
    'Cảnh báo': 'Alerts',
    'Báo cáo': 'Reports',
    'Chất lượng': 'Quality',
    'Dịch vụ': 'Services',
    'Tăng trưởng': 'Growth',
    'Video & Social': 'Video & Social',
    'Kênh & phân phối': 'Distribution',
    'Video Studio': 'Video Studio',
    'Thư viện video': 'Video Library',
    'Backlink & Thương hiệu': 'Backlinks & Brand',
    'Kho Drive': 'Drive Storage',
    'Khóa API': 'API Keys',
    'Hạn mức': 'Quotas',
    'Thông báo': 'Notices',
    'Cài đặt': 'Settings'
  };

  let curLang = 'vi';
  const P = (k, o = {}) => {
    let s = (curLang === 'en' && EN[k]) || k;
    if (o) Object.entries(o).forEach(([p, v]) => { s = s.replace(new RegExp('\\{' + p + '\\}', 'g'), String(v)); });
    return s;
  };

  const TAB_OPTIONS = [
    ['overview', 'Tổng quan'],
    ['analytics', 'Phân tích'],
    ['live', 'Trực tiếp'],
    ['users', 'Người dùng'],
    ['inbox', 'Hộp thư'],
    ['alerts', 'Cảnh báo'],
    ['reports', 'Báo cáo'],
    ['quality', 'Chất lượng'],
    ['services', 'Dịch vụ'],
    ['growth', 'Tăng trưởng'],
    ['social', 'Video & Social'],
    ['dist', 'Kênh & phân phối'],
    ['studio', 'Video Studio'],
    ['video', 'Thư viện video'],
    ['backlinks', 'Backlink & Thương hiệu'],
    ['drive', 'Kho Drive'],
    ['keys', 'Khóa API'],
    ['quota', 'Hạn mức'],
    ['notices', 'Thông báo'],
    ['settings', 'Cài đặt']
  ];

  const ALERT_DEFS = [
    ['js_error', 'Lỗi JavaScript người dùng'],
    ['workflow_fail', 'Tác vụ GitHub tự động thất bại'],
    ['inbox_new', 'Tin nhắn liên hệ mới'],
    ['quality_alert', 'Cảnh báo chất lượng / bài thi'],
    ['i18n_missing', 'Thiếu bản dịch / nghi sai nghĩa'],
    ['quota_warning', 'Dung lượng D1 / AI sắp đầy']
  ];

  async function render(box, ctx) {
    if (!box || !ctx) return;
    curLang = typeof ctx.lang === 'function' ? ctx.lang() : 'vi';
    const { api, toast, esc, dataTable, rel } = ctx;

    let pref = {
      tab: 'overview',
      lang: curLang,
      theme: 'auto',
      autoLogoutMin: 0,
      alertTypes: ['js_error', 'workflow_fail', 'inbox_new', 'quality_alert', 'i18n_missing', 'quota_warning'],
      jsErrorThreshold: 10,
      quotaThresholdPct: 70
    };

    let logs = [];
    try {
      const [pRes, lRes] = await Promise.all([
        api('get').catch(() => null),
        api('logs', { mine: true, limit: 50 }).catch(() => null)
      ]);
      if (pRes && pRes.pref) pref = { ...pref, ...pRes.pref };
      if (lRes && lRes.rows) logs = lRes.rows;
    } catch (e) {
      /* dùng giá trị mặc định */
    }

    const alertSet = new Set(pref.alertTypes || []);

    box.innerHTML = `
      <section class="card set-card adm-pref-section" id="admPrefCard">
        <div class="card-h">
          <div>
            <h2 class="h3">🛡️ ${P('Tài khoản quản trị')}</h2>
            <p class="muted">${P('Cài đặt cá nhân hóa cho tài khoản quản trị: tab mặc định, thông báo cảnh báo và bảo mật phiên.')}</p>
          </div>
        </div>

        <div class="adm-pref-grid">
          <div class="fld">
            <label for="admPrefTab">${P('Tab mặc định khi mở')}</label>
            <select id="admPrefTab" class="adm-select">
              ${TAB_OPTIONS.map(([t, l]) => `<option value="${t}" ${pref.tab === t ? 'selected' : ''}>${P(l)}</option>`).join('')}
            </select>
          </div>

          <div class="fld">
            <label for="admPrefLang">${P('Ngôn ngữ mặc định')}</label>
            <select id="admPrefLang" class="adm-select">
              <option value="vi" ${pref.lang === 'vi' ? 'selected' : ''}>${P('Tiếng Việt')}</option>
              <option value="en" ${pref.lang === 'en' ? 'selected' : ''}>${P('Tiếng Anh')}</option>
            </select>
          </div>

          <div class="fld">
            <label for="admPrefTheme">${P('Giao diện mặc định')}</label>
            <select id="admPrefTheme" class="adm-select">
              <option value="auto" ${pref.theme === 'auto' ? 'selected' : ''}>${P('Tự động theo hệ thống')}</option>
              <option value="light" ${pref.theme === 'light' ? 'selected' : ''}>${P('Sáng')}</option>
              <option value="dark" ${pref.theme === 'dark' ? 'selected' : ''}>${P('Tối')}</option>
            </select>
          </div>

          <div class="fld">
            <label for="admPrefLogout">${P('Tự đăng xuất khi không thao tác')}</label>
            <select id="admPrefLogout" class="adm-select">
              <option value="0" ${pref.autoLogoutMin === 0 ? 'selected' : ''}>${P('Không tự đăng xuất')}</option>
              <option value="15" ${pref.autoLogoutMin === 15 ? 'selected' : ''}>${P('{n} phút', { n: 15 })}</option>
              <option value="30" ${pref.autoLogoutMin === 30 ? 'selected' : ''}>${P('{n} phút', { n: 30 })}</option>
              <option value="60" ${pref.autoLogoutMin === 60 ? 'selected' : ''}>${P('{n} phút', { n: 60 })}</option>
              <option value="120" ${pref.autoLogoutMin === 120 ? 'selected' : ''}>${P('{n} phút', { n: 120 })}</option>
            </select>
          </div>
        </div>

        <div class="adm-pref-alerts mt">
          <span class="fld-lbl"><b>${P('Nhận cảnh báo qua email')}</b></span>
          <p class="small muted">${P('Chọn các loại cảnh báo gửi về email quản trị:')}</p>
          <div class="adm-alert-group">
            ${ALERT_DEFS.map(([k, label]) => `
              <label class="adm-alert-chk-label">
                <input type="checkbox" class="adm-alert-chk" value="${k}" ${alertSet.has(k) ? 'checked' : ''}>
                <span>${P(label)}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="adm-pref-grid mt">
          <div class="fld">
            <label for="admPrefJsLim">${P('Ngưỡng cảnh báo lỗi JS / 24h')}</label>
            <input type="number" id="admPrefJsLim" min="1" max="1000" step="1" value="${esc(String(pref.jsErrorThreshold || 10))}">
          </div>
          <div class="fld">
            <label for="admPrefQuotaPct">${P('Ngưỡng dung lượng D1 (%)')}</label>
            <input type="number" id="admPrefQuotaPct" min="50" max="95" step="1" value="${esc(String(pref.quotaThresholdPct || 70))}">
          </div>
        </div>

        <div class="row between mt adm-pref-actions">
          <button type="button" class="btn primary sm" id="admPrefSave">${P('Lưu cài đặt tài khoản')}</button>
          <button type="button" class="btn sm" id="admLogCsv">${P('⬇ Xuất nhật ký quản trị (CSV)')}</button>
        </div>

        <hr class="adm-divider">

        <div class="card-h">
          <div>
            <h3 class="h4">${P('Lịch sử thao tác của bạn')}</h3>
            <p class="small muted">${P('Các thao tác gần đây được ghi lại từ tài khoản này.')}</p>
          </div>
        </div>
        <div id="admLogTable" class="tbl-wrap"></div>
      </section>
    `;

    const saveBtn = box.querySelector('#admPrefSave');
    saveBtn.onclick = async () => {
      saveBtn.disabled = true;
      const oldTxt = saveBtn.textContent;
      saveBtn.textContent = P('Đang lưu…');

      const alertTypes = [...box.querySelectorAll('.adm-alert-chk:checked')].map(c => c.value);
      const nextPref = {
        tab: box.querySelector('#admPrefTab').value,
        lang: box.querySelector('#admPrefLang').value,
        theme: box.querySelector('#admPrefTheme').value,
        autoLogoutMin: Number(box.querySelector('#admPrefLogout').value) || 0,
        alertTypes,
        jsErrorThreshold: Number(box.querySelector('#admPrefJsLim').value) || 10,
        quotaThresholdPct: Number(box.querySelector('#admPrefQuotaPct').value) || 70
      };

      try {
        const r = await api('set', { pref: nextPref });
        if (r && r.ok) {
          toast(P('Đã lưu cài đặt tài khoản'));
          if (typeof ctx.onPrefSaved === 'function') ctx.onPrefSaved(r.pref || nextPref);
          if (nextPref.lang !== curLang && typeof ctx.setLang === 'function') {
            await ctx.setLang(nextPref.lang);
          }
        } else {
          toast(P('Không lưu được') + ': ' + (r && r.error || 'error'), 'bad');
        }
      } catch (err) {
        toast(P('Không lưu được') + ': ' + err.message, 'bad');
      }
      saveBtn.disabled = false;
      saveBtn.textContent = oldTxt;
    };

    const csvBtn = box.querySelector('#admLogCsv');
    csvBtn.onclick = async () => {
      csvBtn.disabled = true;
      const oldTxt = csvBtn.textContent;
      csvBtn.textContent = P('Đang xuất CSV…');

      try {
        const r = await api('logs', { mine: false, limit: 500 });
        const rows = (r && r.rows) || [];
        const cell = v => {
          let x = String(v == null ? '' : v);
          if (/^[=+\-@\t\r]/.test(x)) x = "'" + x;
          return /[",\n\r;]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x;
        };
        const iso = t => (t ? new Date(t).toISOString() : '');
        const lines = [
          ['Time', 'Email', 'Operation', 'Status', 'IP', 'Country'],
          ...rows.map(x => [iso(x.at), x.email, x.op, x.ok ? 'OK' : 'DENIED', x.ip, x.country])
        ].map(row => row.map(cell).join(','));

        const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lexkite-admin-audit-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast(P('Đã xuất {n} dòng nhật ký', { n: rows.length }));
      } catch (err) {
        toast(P('Lỗi xuất CSV'), 'bad');
      }
      csvBtn.disabled = false;
      csvBtn.textContent = oldTxt;
    };

    if (dataTable && box.querySelector('#admLogTable')) {
      dataTable(
        box.querySelector('#admLogTable'),
        [
          { k: 'at', label: P('Lúc'), sort: r => r.at || 0, cls: 'small nowrap', html: r => (rel ? rel(r.at) : String(r.at)) },
          { k: 'op', label: P('Thao tác'), sort: r => r.op || '', html: r => esc(r.op || '') },
          {
            k: 'ok',
            label: P('Kết quả'),
            sort: r => (r.ok ? 1 : 0),
            html: r => `<span class="chip ${r.ok ? 'ok' : 'bad'}">${r.ok ? P('Thành công') : P('Thất bại')}</span>`
          },
          { k: 'ip', label: P('IP'), cls: 'small muted', html: r => esc(r.ip || '') },
          { k: 'country', label: P('Quốc gia'), sort: r => r.country || '', cls: 'small', html: r => esc(r.country || '') }
        ],
        logs,
        {
          sort: ['at', 'desc'],
          pageSize: 20,
          rowCls: r => (r.ok ? '' : 'bad-row'),
          empty: [P('Chưa có thao tác nào')]
        }
      );
    }
  }

  window.AdminPrefs = { render };
})();
