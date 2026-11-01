/* Xóa tài khoản – tải lười từ Sync.deleteAccount() (nút "Xóa tài khoản" ở thẻ tài khoản; liên kết web #/settings?delete=account).
 * Bắt buộc: Google Play (User Data – Account deletion) và App Store 5.1.1(v) khi app cho tạo tài khoản.
 * Luồng: hộp xác nhận (liệt kê dữ liệu bị xóa, ô "không thể hoàn tác") → dừng đồng bộ → POST /api/account {op:'delete'}
 *   → máy chủ báo 'reauth' (đăng nhập > 10 phút) thì đăng nhập lại bằng popup rồi gửi lại 1 lần
 *   → máy chủ xóa D1 + tài khoản Firebase (REST); nếu không xóa được Firebase thì máy khách gọi user.delete()
 *   → đăng xuất; tùy chọn xóa luôn dữ liệu học trên máy này. Máy chủ: functions/api/account.js. */
(function (w, d) {
  const { esc, toast } = UI;
  const I = w.I18N;
  let dictP;
  const have = l => w.I18N_DICT && w.I18N_DICT[l] && w.I18N_DICT[l]['Xóa tài khoản Lexkite?'];
  const dict = () => dictP || (dictP = (!I || I.lang() === 'vi' || (have('en') && (I.lang() === 'en' || have(I.lang())))) ? Promise.resolve() : new Promise(r => {
    const l = I.lang(), loadOne = src => new Promise(res => { const s = d.createElement('script'); s.src = src; s.onload = s.onerror = () => res(); d.head.appendChild(s); });
    loadOne('js/i18n/en/account.js').then(() => (l !== 'en' && l !== 'vi' ? loadOne(`js/i18n/${l}/account.js`) : null)).then(r);
  }));

  // Đăng nhập lại cùng nhà cung cấp (Google/Apple) – máy chủ chỉ cho xóa khi vừa đăng nhập trong 10 phút
  const reauth = async () => {
    if (Sync.reauth) return Sync.reauth();
    const u = firebase.auth().currentUser; if (!u) throw new Error('auth');
    const apple = ((u.providerData || [])[0] || {}).providerId === 'apple.com';
    const p = apple ? new firebase.auth.OAuthProvider('apple.com') : new firebase.auth.GoogleAuthProvider();
    if (!apple) p.setCustomParameters({ prompt: 'select_account', login_hint: u.email || '' });
    await u.reauthenticateWithPopup(p);
    return u.getIdToken(true);
  };

  const isApple = () => ((Sync.user && Sync.user.providerData) || []).some(p => p.providerId === 'apple.com');

  async function call(token) {
    const r = await fetch(Sync.api.replace('/api/sync', '/api/account'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ op: 'delete', confirm: 'DELETE' }) });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, ...j };
  }

  async function run(wipeLocal, setMsg) {
    const u = Sync.user;
    Sync.deleting = true;
    try {
      // App iOS, tài khoản Sign in with Apple: đăng nhập lại để có mã ủy quyền mới → thu hồi token Apple trước khi xóa (yêu cầu của Apple).
      // Thu hồi lỗi (Firebase chưa cấu hình khóa Apple) không chặn việc xóa tài khoản.
      if (Sync.native && w.NativeAuth && NativeAuth.provider() === 'apple') {
        setMsg(t('Để bảo mật, hãy đăng nhập lại một lần nữa để xác nhận.'));
        await reauth();
        await NativeAuth.revokeApple().catch(e => console.warn('apple revoke', e));
        setMsg(t('Đang xóa…'));
      }
      let res = await call(await u.getIdToken());
      if (res.error === 'reauth') { setMsg(t('Để bảo mật, hãy đăng nhập lại một lần nữa để xác nhận.')); res = await call(await reauth()); }
      if (!res.ok) throw new Error(res.error || 'server');
      if (res.firebase !== 'deleted') { try { await u.delete(); } catch (e) { if (e && e.code === 'auth/requires-recent-login') { await reauth(); await u.delete(); } else throw e; } }
      // Bản sao trong Google Drive appDataFolder của người học (docs/SYNC-DRIVE.md): xóa tệp khi còn token; không chặn việc xóa tài khoản
      if (w.SyncDrive) await SyncDrive.wipe(u.uid).catch(() => {});
      await Sync.afterDelete();
      if (wipeLocal) {
        const S = Core.Store;
        await S.set('cards', {}); await S.set('stats', { days: {}, newToday: { day: '', n: 0 } }); await S.set('game', null);
      }
      return true;
    } finally { Sync.deleting = false; }
  }

  async function open() {
    await dict();
    if (!w.Sync || !Sync.user) return toast(t('Hãy đăng nhập để xóa tài khoản.'));
    UI.modal(`<h2>${t('Xóa tài khoản Lexkite?')}</h2>
      <p class="small" dir="ltr" style="margin:.2rem 0 .6rem;overflow-wrap:anywhere"><b>${esc(Sync.user.email || '')}</b></p>
      <p>${t('Những gì sẽ bị xóa vĩnh viễn trên máy chủ:')}</p>
      <ul class="small" style="margin:.3rem 0 .6rem;padding-inline-start:1.2rem;display:grid;gap:.25rem">
        <li>${t('Dữ liệu học đã đồng bộ (flashcard, tiến độ, XP, chuỗi ngày học)')}</li>
        <li>${t('Hồ sơ tài khoản (tên, email) và tài khoản đăng nhập Lexkite')}</li>
        <li>${t('Dữ liệu bảng xếp hạng')}</li>
      </ul>
      <p class="small muted">${isApple() ? t('Báo lỗi bạn đã gửi được giữ lại ở dạng ẩn danh (gỡ email và tài khoản). Tài khoản Apple của bạn không bị ảnh hưởng.') : t('Báo lỗi bạn đã gửi được giữ lại ở dạng ẩn danh (gỡ email và tài khoản). Tài khoản Google của bạn không bị ảnh hưởng.')}</p>
      <label class="row" style="gap:.5rem;align-items:flex-start;margin:.7rem 0 .3rem;min-height:44px"><input type="checkbox" id="adWipe" style="margin-top:.2rem"> <span>${t('Xóa cả dữ liệu học trên máy này')}</span></label>
      <label class="row" style="gap:.5rem;align-items:flex-start;margin:.3rem 0;min-height:44px"><input type="checkbox" id="adSure" style="margin-top:.2rem"> <span><b>${t('Tôi hiểu thao tác này không thể hoàn tác')}</b></span></label>
      <p id="adMsg" class="small" role="status" aria-live="polite" style="min-height:1.2em;margin:.3rem 0"></p>
      <div class="row" style="gap:.5rem;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn ghost" data-close>${t('Hủy')}</button><button type="button" class="btn danger" id="adGo" disabled>${t('Xóa vĩnh viễn')}</button></div>`);
    const go = d.getElementById('adGo'), sure = d.getElementById('adSure'), msg = d.getElementById('adMsg');
    const setMsg = s => { msg.textContent = s; };
    sure.onchange = () => { go.disabled = !sure.checked; };
    go.onclick = async () => {
      if (!navigator.onLine) return setMsg(t('Bạn cần kết nối mạng để xóa tài khoản.'));
      const wipe = d.getElementById('adWipe').checked;
      go.disabled = sure.disabled = true; go.setAttribute('aria-busy', 'true'); setMsg(t('Đang xóa…'));
      try {
        await run(wipe, setMsg);
        UI.closeModal(); toast(t('Đã xóa tài khoản của bạn.'));
        if (wipe) setTimeout(() => location.reload(), 900);
        else if (/[?&]delete=account\b/.test(location.hash)) location.hash = '#/settings';
      } catch (e) {
        console.warn('account-delete', e);
        setMsg(t('Không xóa được tài khoản. Vui lòng thử lại hoặc liên hệ hỗ trợ.'));
        go.disabled = sure.disabled = false; go.removeAttribute('aria-busy');
      }
    };
  }
  w.AccountDelete = { open, run };
})(window, document);
