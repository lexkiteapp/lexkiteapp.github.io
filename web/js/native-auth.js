/* Đăng nhập gốc trong app iOS/Android – tải lười từ sync.js, CHỈ khi chạy trong app và LK_NATIVE_AUTH[nền tảng] = true
 * (scripts/mobile-auth-config.mjs bật cờ khi có GoogleService-Info.plist / google-services.json).
 * Google chặn OAuth trong WebView → đăng nhập bằng SDK gốc qua plugin @capacitor-firebase/authentication (skipNativeAuth = false):
 * SDK Firebase gốc giữ phiên, cấp Firebase ID token của dự án lexkite-app → /api/sync, /api/account dùng y như trên web.
 * Không tải Firebase JS SDK trong app (App Store 2.5.2). Đối tượng người dùng mô phỏng phần firebase.User mà app dùng:
 * uid, displayName, email, photoURL, providerData, getIdToken(force), delete().
 * Apple (chỉ iOS): lưu authorizationCode mới nhất để thu hồi token Apple khi xóa tài khoản (yêu cầu của Apple). */
(function (w) {
  const FA = w.Capacitor && w.Capacitor.Plugins && w.Capacitor.Plugins.FirebaseAuthentication;
  let cur = null, lastUid, cb = null, appleCode = '', appleAt = 0;
  const wrap = u => u ? {
    uid: u.uid, displayName: u.displayName || '', email: u.email || '', photoURL: u.photoUrl || '',
    providerData: (u.providerData || []).map(p => ({ providerId: p.providerId })),
    getIdToken: force => FA.getIdToken({ forceRefresh: !!force }).then(r => r.token),
    delete: () => FA.deleteUser(),
  } : null;
  // Báo cho sync.js khi đổi người dùng (đăng nhập/đăng xuất) – bỏ lượt trùng (sự kiện plugin + getCurrentUser lúc mở app)
  const emit = u => { cur = wrap(u); const id = cur ? cur.uid : null; if (id === lastUid) return; lastUid = id; if (cb) cb(cur); };
  const provider = () => { const p = cur && cur.providerData.find(x => x.providerId === 'apple.com' || x.providerId === 'google.com'); return p && p.providerId === 'apple.com' ? 'apple' : 'google'; };
  const cancelled = e => /cancel|1001|12501|-5\b/i.test(String((e && (e.code || '')) + ' ' + (e && e.message || '')));

  async function signIn(via) {
    const r = via === 'apple' ? await FA.signInWithApple({ scopes: ['email', 'name'] }) : await FA.signInWithGoogle();
    if (via === 'apple' && r.credential && r.credential.authorizationCode) { appleCode = r.credential.authorizationCode; appleAt = Date.now(); }
    emit(r.user);
    return cur;
  }
  const NativeAuth = {
    ok: !!FA,
    cancelled,
    current: () => cur,
    provider,
    onChange(fn) {
      cb = fn;
      FA.addListener('authStateChange', e => emit(e && e.user));
      FA.getCurrentUser().then(r => emit(r && r.user)).catch(() => emit(null));
    },
    signIn,
    signOut: () => FA.signOut().then(() => emit(null)),
    // Đăng nhập lại cùng nhà cung cấp (máy chủ chỉ cho xóa tài khoản khi vừa đăng nhập ≤ 10 phút) – phải đúng tài khoản cũ
    async reauth() {
      const uid = cur && cur.uid; if (!uid) throw new Error('auth');
      const u = await signIn(provider());
      if (!u || u.uid !== uid) throw Object.assign(new Error('Đã chọn tài khoản khác'), { code: 'auth/user-mismatch' });
      return u.getIdToken(true);
    },
    // Thu hồi token Sign in with Apple trước khi xóa tài khoản (authorizationCode chỉ dùng được ~5 phút sau khi đăng nhập)
    async revokeApple() {
      if (provider() !== 'apple' || !appleCode || Date.now() - appleAt > 280e3) return false;
      await FA.revokeAccessToken({ token: appleCode }); appleCode = '';
      return true;
    },
  };
  w.NativeAuth = NativeAuth;
})(window);
