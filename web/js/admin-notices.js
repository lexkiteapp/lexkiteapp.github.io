/* Quản trị Thông báo người dùng (js/admin-notices.js – tải lười khi mở tab 📣 Thông báo)
 * Soạn thông báo đẹp chuẩn thương hiệu #0F3D3E/#E5502F, xem trước sáng/tối, chọn đối tượng (tất cả / lọc / từng người),
 * hẹn giờ, thu hồi và thống kê lượt đọc / bấm nút CTA.
 */
(() => {
  'use strict';

  function renderMarkdown(md) {
    if (!md) return '';
    // XSS safety: escape HTML first
    let s = String(md)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    // Bold: **text**
    s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic: *text*
    s = s.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Links: [text](https://... or /#/...)
    s = s.replace(/\[([^\]]+)\]\((#[^)]+|\/#\/[^)]+|https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // Newlines
    s = s.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
    return `<p>${s}</p>`;
  }

  function kindBadge(k, L) {
    if (k === 'important') return `<span class="pill" style="background:#fee2e2;color:#991b1b;font-weight:700">⚠️ ${L('Quan trọng')}</span>`;
    if (k === 'event') return `<span class="pill" style="background:#fef3c7;color:#92400e;font-weight:700">🎉 ${L('Sự kiện')}</span>`;
    return `<span class="pill" style="background:#e0f2fe;color:#075985;font-weight:700">ℹ️ ${L('Tin tức')}</span>`;
  }

  window.AdminNotices = {
    async render(container, api, L, { esc, num, when, lang }) {
      container.innerHTML = `<div class="adm-header-bar">
        <div>
          <h2>📣 ${L('Thông báo người dùng')}</h2>
          <p class="muted">${L('Gửi thông báo tới người học trong app – chọn từng người, theo nhóm hoặc toàn hệ thống.')}</p>
        </div>
        <div class="row" style="gap:.5rem">
          <button class="btn" id="nRefresh">🔄 ${L('Làm mới')}</button>
        </div>
      </div>
      <div class="kpi-grid" id="nKpis">
        <div class="card kpi"><div class="l">${L('📊 Tổng thông báo')}</div><div class="v">–</div></div>
        <div class="card kpi"><div class="l">${L('🟢 Đang phát')}</div><div class="v">–</div></div>
        <div class="card kpi"><div class="l">${L('👁️ Lượt đọc')}</div><div class="v">–</div></div>
        <div class="card kpi"><div class="l">${L('👆 Lượt nhấp nút')}</div><div class="v">–</div></div>
      </div>

      <div class="grid g2" style="gap:1.5rem;align-items:start;margin-top:1.5rem">
        <!-- Form Soạn thông báo -->
        <div class="card" id="nComposeCard">
          <h3 style="margin-bottom:1rem">✍️ ${L('Soạn thông báo mới')}</h3>
          <form id="nForm" class="form2" onsubmit="return false">
            <label>
              <b>${L('Tiêu đề thông báo')} *</b>
              <input type="text" id="nTitle" required maxlength="200" placeholder="${L('VD: Cập nhật giao diện phòng thi IELTS mới 🎉')}">
            </label>

            <div class="row" style="gap:1rem;flex-wrap:wrap">
              <label style="flex:1;min-width:140px">
                <b>${L('Loại thông báo')}</b>
                <select id="nKind">
                  <option value="info">ℹ️ ${L('Tin tức (thông thường)')}</option>
                  <option value="event">🎉 ${L('Sự kiện & Khuyến mãi')}</option>
                  <option value="important">⚠️ ${L('Quan trọng (hiện hộp nổi 1 lần)')}</option>
                </select>
              </label>

              <label style="flex:1;min-width:140px">
                <b>${L('Ngôn ngữ đích')}</b>
                <select id="nLang">
                  <option value="all">${L('Tất cả ngôn ngữ')}</option>
                  <option value="vi">Tiếng Việt (vi)</option>
                  <option value="en">English (en)</option>
                  <option value="es">Español (es)</option>
                  <option value="fr">Français (fr)</option>
                  <option value="de">Deutsch (de)</option>
                  <option value="id">Bahasa Indonesia (id)</option>
                  <option value="th">ไทย (th)</option>
                  <option value="zh">中文 (zh)</option>
                  <option value="ja">日本語 (ja)</option>
                  <option value="ko">한국어 (ko)</option>
                  <option value="hi">हिन्दी (hi)</option>
                  <option value="ar">العربية (ar)</option>
                  <option value="ru">Русский (ru)</option>
                  <option value="tr">Türkçe (tr)</option>
                </select>
              </label>
            </div>

            <!-- Đối tượng nhận -->
            <fieldset style="border:1px solid var(--line);border-radius:10px;padding:1rem;margin:.5rem 0">
              <legend style="font-weight:700;padding:0 .5rem;color:var(--text)">🎯 ${L('Đối tượng người nhận')}</legend>
              <div class="row" style="gap:1.2rem;margin-bottom:.8rem;flex-wrap:wrap">
                <label style="display:inline-flex;align-items:center;gap:.4rem;cursor:pointer">
                  <input type="radio" name="nTargetType" value="all" checked> ${L('Tất cả người học')}
                </label>
                <label style="display:inline-flex;align-items:center;gap:.4rem;cursor:pointer">
                  <input type="radio" name="nTargetType" value="filter"> ${L('Theo bộ lọc')}
                </label>
                <label style="display:inline-flex;align-items:center;gap:.4rem;cursor:pointer">
                  <input type="radio" name="nTargetType" value="users"> ${L('Chọn từng người')}
                </label>
              </div>

              <!-- Bộ lọc -->
              <div id="nFilterBox" style="display:none;background:var(--surface-2);padding:.8rem;border-radius:8px">
                <div class="row" style="gap:.8rem;flex-wrap:wrap">
                  <label style="flex:1;min-width:140px">
                    <span class="small">${L('Nền tảng:')}</span>
                    <select id="nFPlat">
                      <option value="">${L('Tất cả nền tảng')}</option>
                      <option value="web">Web browser</option>
                      <option value="pwa">PWA</option>
                      <option value="android">Android App</option>
                      <option value="ios">iOS App</option>
                      <option value="ext">Chrome Extension</option>
                    </select>
                  </label>
                  <label style="flex:1;min-width:140px">
                    <span class="small">${L('Không hoạt động:')}</span>
                    <select id="nFInactive">
                      <option value="0">${L('Không lọc theo ngày')}</option>
                      <option value="3">&gt; 3 ${L('ngày')}</option>
                      <option value="7">&gt; 7 ${L('ngày')}</option>
                      <option value="14">&gt; 14 ${L('ngày')}</option>
                      <option value="30">&gt; 30 ${L('ngày')}</option>
                    </select>
                  </label>
                  <label style="flex:1;min-width:140px">
                    <span class="small">${L('Mới đăng ký:')}</span>
                    <select id="nFNew">
                      <option value="0">${L('Không lọc theo đăng ký')}</option>
                      <option value="3">&le; 3 ${L('ngày')}</option>
                      <option value="7">&le; 7 ${L('ngày')}</option>
                      <option value="14">&le; 14 ${L('ngày')}</option>
                    </select>
                  </label>
                </div>
              </div>

              <!-- Chọn từng người -->
              <div id="nUsersBox" style="display:none;background:var(--surface-2);padding:.8rem;border-radius:8px">
                <label>
                  <span class="small">${L('Danh sách UID người nhận (cách nhau bằng dấu phẩy hoặc xuống dòng):')}</span>
                  <textarea id="nUserIds" rows="2" placeholder="VD: u_123, u_456..."></textarea>
                </label>
                <div id="nTargetUserHint" class="small muted" style="margin-top:.4rem"></div>
              </div>
            </fieldset>

            <label>
              <b>${L('Nội dung chi tiết')} *</b>
              <textarea id="nBody" required rows="5" maxlength="4000" placeholder="${L('Hỗ trợ định dạng: **in đậm**, [văn bản liên kết](https://...), xuống dòng...') }"></textarea>
            </label>

            <label>
              <b>${L('Ảnh banner tùy chọn (URL https://...)')}</b>
              <input type="url" id="nImg" placeholder="https://lexkite.com/images/banner.png">
            </label>

            <div class="row" style="gap:1rem;flex-wrap:wrap">
              <label style="flex:1;min-width:140px">
                <b>${L('Nhãn nút hành động (CTA)')}</b>
                <input type="text" id="nCtaLabel" maxlength="60" placeholder="${L('VD: Luyện thi ngay →')}">
              </label>

              <label style="flex:2;min-width:180px">
                <b>${L('Đường dẫn nút (URL /#/… hoặc https://…)')}</b>
                <input type="text" id="nCtaUrl" placeholder="/#/skills hoặc https://...">
              </label>
            </div>

            <div class="row" style="gap:1rem;flex-wrap:wrap">
              <label style="flex:1;min-width:140px">
                <b>${L('Hẹn giờ phát (để trống = phát ngay)')}</b>
                <input type="datetime-local" id="nSendAt">
              </label>

              <label style="flex:1;min-width:140px">
                <b>${L('Hạn hiển thị (để trống = vĩnh viễn)')}</b>
                <input type="datetime-local" id="nExpireAt">
              </label>
            </div>

            <div class="row" style="gap:.8rem;margin-top:1rem;justify-content:flex-end">
              <button type="button" class="btn" id="nPreviewBtn">👁️ ${L('Xem trước')}</button>
              <button type="submit" class="btn primary" id="nSubmitBtn">🚀 ${L('Phát thông báo')}</button>
            </div>
            <div id="nMsg" class="small" style="text-align:right"></div>
          </form>
        </div>

        <!-- Danh sách & Lịch sử -->
        <div class="card" id="nListCard">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem">
            <h3>📜 ${L('Lịch sử thông báo đã gửi')}</h3>
            <span class="small muted" id="nListCount"></span>
          </div>
          <div class="tbl-wrap" id="nTableWrap">
            <p class="small muted">${L('Đang tải danh sách…')}</p>
          </div>
        </div>
      </div>

      <!-- Modal Xem trước Thương hiệu -->
      <dialog id="nPreviewModal" class="modal-box" style="max-width:540px;border-radius:18px;border:1px solid var(--line);padding:0;overflow:hidden">
        <div style="padding:.9rem 1.2rem;background:#0F3D3E;color:#fff;display:flex;justify-content:space-between;align-items:center">
          <div style="display:flex;align-items:center;gap:.6rem">
            <span style="font-size:1.2rem">🔔</span>
            <b style="font-size:1.05rem">${L('Xem trước thông báo')}</b>
          </div>
          <div style="display:flex;align-items:center;gap:.5rem">
            <button type="button" class="btn ghost sm" id="nToggleTheme" style="color:#fff;border-color:rgba(255,255,255,.3)">🌓 ${L('Sáng/Tối')}</button>
            <button type="button" class="btn ghost sm" id="nClosePreview" style="color:#fff;border-color:rgba(255,255,255,.3)">✕</button>
          </div>
        </div>
        <div id="nPreviewSurface" style="padding:1.4rem;background:#fff;color:#1e293b;transition:all .2s ease">
          <div id="nPreviewCard" style="border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:1.2rem;background:inherit;box-shadow:0 4px 14px rgba(0,0,0,.04)">
            <div id="nPreviewImgBox" style="margin:-1.2rem -1.2rem 1rem -1.2rem;border-radius:14px 14px 0 0;overflow:hidden;display:none">
              <img id="nPreviewImg" src="" alt="Banner" style="width:100%;max-height:220px;object-fit:cover;display:block">
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
              <span id="nPreviewKind"></span>
              <span class="small muted" id="nPreviewTime">${L('Vừa xong')}</span>
            </div>
            <h4 id="nPreviewTitle" style="margin:.3rem 0 .7rem;font-size:1.15rem;line-height:1.35;color:inherit"></h4>
            <div id="nPreviewBody" style="font-size:.95rem;line-height:1.6;margin-bottom:1rem;color:inherit"></div>
            <div id="nPreviewCtaBox" style="display:none;margin-top:1rem">
              <a id="nPreviewCta" href="#" target="_blank" class="btn primary" style="background:#E5502F;border:0;color:#fff;font-weight:700;display:inline-block;padding:.6rem 1.2rem;border-radius:10px;text-decoration:none"></a>
            </div>
          </div>
          <p class="small muted" style="text-align:center;margin-top:1rem;margin-bottom:0">${L('Người học sẽ thấy thông báo này trong ngăn chuông 🔔 và popup (nếu chọn Quan trọng).')}</p>
        </div>
      </dialog>`;

      // Xử lý kiểm tra pre-filled target user từ sessionStorage (nút 📣 Gửi tin ở tab Người dùng)
      try {
        const stored = sessionStorage.getItem('adm.targetUser');
        if (stored) {
          const uObj = JSON.parse(stored);
          sessionStorage.removeItem('adm.targetUser');
          if (uObj && uObj.uid) {
            const rad = container.querySelector('input[name="nTargetType"][value="users"]');
            if (rad) rad.checked = true;
            container.querySelector('#nUsersBox').style.display = 'block';
            container.querySelector('#nFilterBox').style.display = 'none';
            container.querySelector('#nUserIds').value = uObj.uid;
            container.querySelector('#nTargetUserHint').textContent = `🎯 ${L('Đã chọn gửi cho:')} ${uObj.email || uObj.uid}`;
          }
        }
      } catch (e) { /* ignore */ }

      // Chuyển đổi loại đối tượng
      container.querySelectorAll('input[name="nTargetType"]').forEach(r => {
        r.onchange = () => {
          const v = r.value;
          container.querySelector('#nFilterBox').style.display = v === 'filter' ? 'block' : 'none';
          container.querySelector('#nUsersBox').style.display = v === 'users' ? 'block' : 'none';
        };
      });

      // Tải số liệu thống kê & danh sách
      const loadData = async () => {
        try {
          const [stats, list] = await Promise.all([
            api('noticeStats').catch(() => ({ total: 0, active: 0, reads: 0, clicks: 0 })),
            api('noticeList', { limit: 50, offset: 0 }).catch(() => ({ rows: [] }))
          ]);

          // KPI
          const kpis = container.querySelectorAll('#nKpis .v');
          if (kpis.length >= 4) {
            kpis[0].textContent = num(stats.total || 0);
            kpis[1].textContent = num(stats.active || 0);
            kpis[2].textContent = num(stats.reads || 0);
            kpis[3].textContent = num(stats.clicks || 0);
          }

          // List
          const rows = list.rows || [];
          container.querySelector('#nListCount').textContent = L('{n} thông báo gần nhất', { n: rows.length });
          if (!rows.length) {
            container.querySelector('#nTableWrap').innerHTML = `<p class="muted" style="padding:1.5rem 0;text-align:center">${L('Chưa có thông báo nào được tạo. Hãy tạo thông báo đầu tiên ở biểu mẫu bên trái!')}</p>`;
            return;
          }

          const now = Date.now();
          container.querySelector('#nTableWrap').innerHTML = `<table class="tbl" style="width:100%;font-size:.88rem">
            <thead>
              <tr>
                <th>${L('Tiêu đề & Loại')}</th>
                <th>${L('Đối tượng')}</th>
                <th class="num">${L('Lượt xem')}</th>
                <th class="num">${L('Nhấp CTA')}</th>
                <th>${L('Thời gian')}</th>
                <th>${L('Trạng thái')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => {
                const isRevoked = r.revoked === 1;
                const isExpired = r.expire_at && r.expire_at <= now;
                const isScheduled = r.send_at && r.send_at > now;
                let statusBadge = '<span class="pill" style="background:#dcfce7;color:#166534">🟢 ' + L('Đang phát') + '</span>';
                if (isRevoked) statusBadge = '<span class="pill" style="background:#fee2e2;color:#991b1b">⛔ ' + L('Đã thu hồi') + '</span>';
                else if (isExpired) statusBadge = '<span class="pill" style="background:#f1f5f9;color:#64748b">⏱️ ' + L('Đã hết hạn') + '</span>';
                else if (isScheduled) statusBadge = '<span class="pill" style="background:#fef3c7;color:#92400e">⏳ ' + L('Hẹn giờ') + '</span>';

                let targetStr = L('Tất cả');
                if (r.target && r.target.type === 'users') {
                  const cnt = (r.target.uids || []).length;
                  targetStr = L('{n} người dùng', { n: cnt });
                } else if (r.target && r.target.type === 'filter') {
                  targetStr = L('Bộ lọc');
                }

                return `<tr>
                  <td>
                    <b>${esc(r.title)}</b><br>
                    <span class="small" style="display:inline-block;margin-top:.2rem">${kindBadge(r.kind, L)} <span class="muted">· ${esc(r.lang || 'all')}</span></span>
                  </td>
                  <td>${targetStr}</td>
                  <td class="num font-mono"><b>${num(r.reads || 0)}</b></td>
                  <td class="num font-mono"><b>${num(r.clicks || 0)}</b></td>
                  <td class="small">
                    ${L('Gửi:')} ${when(r.send_at || r.at)}<br>
                    ${r.expire_at ? `<span class="muted">${L('Hạn:')} ${when(r.expire_at)}</span>` : ''}
                  </td>
                  <td>${statusBadge}</td>
                  <td class="nowrap" style="text-align:right">
                    ${!isRevoked ? `<button class="btn ghost sm danger" data-revoke="${esc(r.id)}">${L('Thu hồi')}</button>` : ''}
                  </td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>`;

          // Gán sự kiện Thu hồi
          container.querySelectorAll('[data-revoke]').forEach(btn => {
            btn.onclick = async () => {
              const id = btn.dataset.revoke;
              if (confirm(L('Bạn có chắc chắn muốn thu hồi thông báo này? Người học sẽ không còn thấy thông báo nữa.'))) {
                btn.disabled = true;
                btn.textContent = L('Đang thu hồi…');
                try {
                  await api('noticeRevoke', { id });
                  await loadData();
                } catch (e) {
                  alert(L('Lỗi: {e}', { e: e.message }));
                  btn.disabled = false;
                  btn.textContent = L('Thu hồi');
                }
              }
            };
          });
        } catch (err) {
          container.querySelector('#nTableWrap').innerHTML = `<p class="bad-t">${esc(err.message)}</p>`;
        }
      };

      await loadData();
      container.querySelector('#nRefresh').onclick = loadData;

      // Xử lý nút Xem trước
      const modal = container.querySelector('#nPreviewModal');
      const previewSurface = container.querySelector('#nPreviewSurface');
      let previewDark = false;

      container.querySelector('#nToggleTheme').onclick = () => {
        previewDark = !previewDark;
        if (previewDark) {
          previewSurface.style.background = '#0f172a';
          previewSurface.style.color = '#f8fafc';
        } else {
          previewSurface.style.background = '#ffffff';
          previewSurface.style.color = '#1e293b';
        }
      };

      container.querySelector('#nClosePreview').onclick = () => modal.close();

      container.querySelector('#nPreviewBtn').onclick = () => {
        const title = container.querySelector('#nTitle').value.trim() || L('(Chưa có tiêu đề)');
        const body = container.querySelector('#nBody').value.trim() || L('(Chưa có nội dung)');
        const kind = container.querySelector('#nKind').value;
        const img = container.querySelector('#nImg').value.trim();
        const ctaLabel = container.querySelector('#nCtaLabel').value.trim();

        container.querySelector('#nPreviewTitle').textContent = title;
        container.querySelector('#nPreviewBody').innerHTML = renderMarkdown(body);
        container.querySelector('#nPreviewKind').innerHTML = kindBadge(kind, L);

        const imgBox = container.querySelector('#nPreviewImgBox');
        if (img && /^https:\/\//i.test(img)) {
          container.querySelector('#nPreviewImg').src = img;
          imgBox.style.display = 'block';
        } else {
          imgBox.style.display = 'none';
        }

        const ctaBox = container.querySelector('#nPreviewCtaBox');
        if (ctaLabel) {
          const ctaBtn = container.querySelector('#nPreviewCta');
          ctaBtn.textContent = ctaLabel;
          ctaBox.style.display = 'block';
        } else {
          ctaBox.style.display = 'none';
        }

        modal.showModal();
      };

      // Xử lý gửi Form phát thông báo
      container.querySelector('#nForm').onsubmit = async (e) => {
        e.preventDefault();
        const btn = container.querySelector('#nSubmitBtn');
        const msg = container.querySelector('#nMsg');
        btn.disabled = true;
        btn.textContent = L('⏳ Đang phát thông báo…');
        msg.textContent = '';

        try {
          const title = container.querySelector('#nTitle').value.trim();
          const body = container.querySelector('#nBody').value.trim();
          const kind = container.querySelector('#nKind').value;
          const lang = container.querySelector('#nLang').value;
          const img = container.querySelector('#nImg').value.trim() || null;
          const cta_label = container.querySelector('#nCtaLabel').value.trim() || null;
          const cta_url = container.querySelector('#nCtaUrl').value.trim() || null;

          const targetType = container.querySelector('input[name="nTargetType"]:checked').value;
          let target = { type: 'all' };

          if (targetType === 'filter') {
            const plat = container.querySelector('#nFPlat').value || undefined;
            const inactiveDays = +container.querySelector('#nFInactive').value || undefined;
            const newDays = +container.querySelector('#nFNew').value || undefined;
            target = { type: 'filter', plat, inactiveDays, newDays };
          } else if (targetType === 'users') {
            const rawUsers = container.querySelector('#nUserIds').value;
            const uids = rawUsers.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
            if (!uids.length) throw new Error(L('Vui lòng nhập ít nhất 1 UID người nhận'));
            target = { type: 'users', uids };
          }

          const sendVal = container.querySelector('#nSendAt').value;
          const expireVal = container.querySelector('#nExpireAt').value;
          const send_at = sendVal ? new Date(sendVal).getTime() : undefined;
          const expire_at = expireVal ? new Date(expireVal).getTime() : undefined;

          if (expire_at && send_at && expire_at <= send_at) {
            throw new Error(L('Hạn hiển thị phải sau thời gian phát sóng'));
          }

          const res = await api('noticeCreate', {
            title,
            body,
            kind,
            lang,
            img,
            cta_label,
            cta_url,
            target,
            send_at,
            expire_at
          });

          if (res.error) throw new Error(res.error);

          msg.style.color = 'var(--ok, #16a34a)';
          msg.textContent = L('✓ Phát thông báo thành công! ID: {id}', { id: res.id });
          container.querySelector('#nForm').reset();
          container.querySelector('#nFilterBox').style.display = 'none';
          container.querySelector('#nUsersBox').style.display = 'none';
          container.querySelector('#nTargetUserHint').textContent = '';

          await loadData();
        } catch (err) {
          msg.style.color = 'var(--bad, #dc2626)';
          msg.textContent = L('✗ Lỗi: {e}', { e: err.message });
        } finally {
          btn.disabled = false;
          btn.textContent = L('🚀 Phát thông báo');
        }
      };
    }
  };
})();
