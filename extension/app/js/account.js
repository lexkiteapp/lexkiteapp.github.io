/* Menu tài khoản – tải lười khi bấm avatar (sync.js → Sync.ui). Máy tính: dropdown cạnh nút; điện thoại (≤ 900 px): bottom sheet.
 * Bàn phím: ↑/↓/Home/End di chuyển, Tab/Shift+Tab vòng trong menu, Esc đóng & trả focus về nút; bấm ra ngoài để đóng.
 * Đăng xuất luôn hỏi lại (hộp nhỏ): dữ liệu học ở lại máy này và đã sao lưu trong tài khoản.
 * Không có tùy chọn "đăng xuất và xóa dữ liệu trên máy": nếu lần đẩy cuối lỗi/tạm nghỉ, xóa sẽ mất dữ liệu chưa sao lưu (xóa dữ liệu có ở Cài đặt).
 */
(function () {
  const { esc } = UI;
  let pop = null, back = null, anchor = null;
  const CSS = `.acct-pop{position:fixed;z-index:70;width:300px;max-width:calc(100vw - 16px);background:var(--surface);color:var(--text);border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow-lg);padding:.6rem}
.acct-pop.sheet-m{left:0!important;right:0!important;bottom:0!important;top:auto!important;width:auto;max-width:none;border-radius:22px 22px 0 0;padding:1rem 1rem calc(1rem + env(safe-area-inset-bottom));animation:sheetUp .25s ease}
.acct-back{position:fixed;inset:0;z-index:69;background:rgba(10,10,30,.45)}
.acct-head{display:flex;gap:.7rem;align-items:center;padding:.4rem .5rem .6rem}.acct-head b,.acct-head .small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:210px}
.acct-st{padding:.5rem .6rem;border-radius:10px;background:var(--surface-2);margin:0 .2rem .4rem}
.acct-pop [role=menuitem]{display:flex;gap:.6rem;align-items:center;width:100%;min-height:44px;padding:.55rem .7rem;border:0;border-radius:10px;background:none;color:var(--text);font:inherit;font-weight:600;text-align:start;cursor:pointer;text-decoration:none}
.acct-pop [role=menuitem]:hover,.acct-pop [role=menuitem]:focus-visible{background:var(--primary-soft);outline:2px solid var(--primary);outline-offset:-2px}
.acct-pop [role=separator]{height:1px;background:var(--line);margin:.35rem .2rem}
.acct-pop .acct-out{color:var(--primary)}
.acct-ok{display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;margin-top:1rem}`;
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);

  const items = () => pop ? [...pop.querySelectorAll('[role=menuitem]')] : [];
  function html() {
    const u = Sync.user || (() => { try { return JSON.parse(localStorage.getItem('lk.acct')) || {}; } catch (e) { return {}; } })(), err = Sync.status === 'error';
    return `<div class="acct-head"><span class="avatar">${Sync.av(u)}</span><div class="grow"><b title="${esc(u.displayName || '')}">${esc(Sync.nice ? Sync.nice(u.displayName || t('Bạn')) : u.displayName || t('Bạn'))}</b><span class="small muted" dir="ltr" title="${esc(u.email || '')}">${esc(u.email || '')}</span></div></div>
      <div class="acct-st small" role="status">${Sync.stText() || t('Dữ liệu học được tự động sao lưu và đồng bộ giữa các thiết bị.')}</div>
      <div role="menu" id="acctMenu" aria-label="${esc(t('Tài khoản'))}">
        <button type="button" role="menuitem" data-a="sync"><span aria-hidden="true">🔄</span>${err ? t('Thử lại') : t('Đồng bộ ngay')}</button>
        <a role="menuitem" href="#/me"><span aria-hidden="true">👤</span>${t('Hồ sơ')}</a>
        <a role="menuitem" href="#/settings"><span aria-hidden="true">⚙️</span>${t('Cài đặt')}</a>
        <div role="separator"></div>
        <button type="button" role="menuitem" data-a="out" class="acct-out"><span aria-hidden="true">↪</span>${t('Đăng xuất')}</button>
      </div>`;
  }
  function place() {
    const m = matchMedia('(max-width: 900px)').matches;
    pop.classList.toggle('sheet-m', m); back.hidden = !m;
    if (m) return;
    const r = anchor.getBoundingClientRect(), W = pop.offsetWidth || 300;
    const left = r.left + r.width / 2 < innerWidth / 2 ? r.left : r.right - W; // nút bên trái (thẻ thanh bên) → mở sang phải, ngược lại canh mép phải
    pop.style.left = Math.max(8, Math.min(left, innerWidth - W - 8)) + 'px';
    if (r.top > innerHeight / 2) { pop.style.top = 'auto'; pop.style.bottom = (innerHeight - r.top + 8) + 'px'; } // thẻ dưới đáy thanh bên → mở lên trên
    else { pop.style.bottom = 'auto'; pop.style.top = (r.bottom + 8) + 'px'; }
  }
  function open(el) {
    anchor = el;
    back = document.createElement('div'); back.className = 'acct-back'; back.hidden = true;
    pop = document.createElement('div'); pop.className = 'acct-pop'; pop.id = 'acctPop';
    pop.innerHTML = html();
    document.body.append(back, pop);
    el.setAttribute('aria-expanded', 'true'); el.setAttribute('aria-controls', 'acctMenu');
    place();
    (items()[0] || pop).focus();
  }
  function close(refocus = true) {
    if (!pop) return;
    pop.remove(); back.remove(); pop = back = null;
    if (anchor) { anchor.setAttribute('aria-expanded', 'false'); if (refocus && document.body.contains(anchor)) anchor.focus(); }
  }
  function confirmOut() {
    close(false);
    UI.modal(`<h2>${t('Đăng xuất khỏi Lexkite?')}</h2><p class="muted">${t('Dữ liệu học vẫn ở lại trên máy này và đã được sao lưu trong tài khoản. Đăng nhập lại bất cứ lúc nào để đồng bộ tiếp.')}</p>
      <div class="acct-ok"><button type="button" class="btn ghost" data-close>${t('Hủy')}</button><button type="button" class="btn primary" id="acctOutOk">${t('Đăng xuất')}</button></div>`);
    const ok = document.getElementById('acctOutOk');
    ok.onclick = async () => { ok.disabled = true; UI.closeModal(); await Sync.signOut(); };
  }
  document.addEventListener('click', e => {
    if (!pop) return;
    const it = e.target.closest('#acctPop [role=menuitem]');
    if (it) { if (it.dataset.a === 'sync') { e.preventDefault(); Sync.now(); return; } if (it.dataset.a === 'out') { e.preventDefault(); return confirmOut(); } return close(false); }
    if (!e.target.closest('#acctPop') && !(anchor && anchor.contains(e.target))) close(false); // bấm ra ngoài
  }, true);
  document.addEventListener('keydown', e => {
    if (!pop) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); return close(); }
    const L = items(), i = L.indexOf(document.activeElement);
    const go = n => { e.preventDefault(); L[(n + L.length) % L.length].focus(); };
    if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i < 0 ? -1 : i - 1);
    else if (e.key === 'Home') go(0); else if (e.key === 'End') go(-1);
    else if (e.key === 'Tab') go(e.shiftKey ? i - 1 : i + 1); // giữ focus trong menu
  }, true);
  window.addEventListener('hashchange', () => close(false));
  window.addEventListener('resize', () => { if (pop) place(); });

  window.Account = {
    toggle: el => { if (pop) return close(); if (!Sync.user && Sync.ready) return Sync.signIn(); open(el); }, // chưa sẵn sàng (đang kết nối) → vẫn mở menu với tài khoản nhớ lần trước
    confirmOut,
    close,
    isOpen: () => !!pop,
    // Trạng thái đồng bộ/đăng nhập đổi → cập nhật menu đang mở (đăng xuất → đóng)
    refresh: () => { if (!pop) return; if (!Sync.user) return close(false); const f = items().indexOf(document.activeElement); pop.innerHTML = html(); const L = items(); if (f >= 0 && L[f]) L[f].focus(); },
  };
})();
