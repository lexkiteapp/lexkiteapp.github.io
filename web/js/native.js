/* Cầu nối app gốc (Android/iOS qua Capacitor). Chỉ chạy khi mở trong app – web & add-on bỏ qua hoàn toàn.
 * – Nhắc học hằng ngày bằng thông báo cục bộ (không cần máy chủ, miễn phí)
 * – Rung phản hồi (Haptics) thay cho navigator.vibrate
 * – Không dùng service worker trong app (tài nguyên đã nằm sẵn trong gói cài đặt) */
(function (g) {
  const Cap = g.Capacitor;
  const native = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  g.VBNative = { is: native, platform: native ? Cap.getPlatform() : 'web' };
  if (!native) return;
  const P = Cap.Plugins || {};
  document.documentElement.classList.add('native', 'native-' + Cap.getPlatform());

  // Gỡ service worker nếu lỡ đăng ký (tránh giữ bản cũ sau khi cập nhật app)
  try { navigator.serviceWorker && navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())); } catch (e) { /* bỏ qua */ }

  // Rung: dùng Haptics của hệ điều hành
  if (P.Haptics) {
    try { Object.defineProperty(navigator, 'vibrate', { configurable: true, value: p => { const ms = Array.isArray(p) ? p[0] : p; P.Haptics.vibrate({ duration: Math.max(10, ms || 15) }).catch(() => {}); return true; } }); } catch (e) { /* bỏ qua */ }
  }

  // Nhắc học hằng ngày theo giờ người học chọn trong Cài đặt (mặc định 20:00)
  // opts.ask: chỉ xin quyền thông báo khi người dùng chủ động (lưu cài đặt/thiết lập) – KHÔNG hỏi ngay lúc mở app (trải nghiệm & yêu cầu App Store)
  async function scheduleReminder(opts = {}) {
    const LN = P.LocalNotifications; if (!LN || !g.Core) return;
    try {
      const s = await g.Core.Store.get('settings', {});
      await LN.cancel({ notifications: [{ id: 1 }] }).catch(() => {});
      if (s.reminderOn === false) return;
      const perm = await LN.checkPermissions();
      if (perm.display !== 'granted') { if (!opts.ask) return; const r = await LN.requestPermissions(); if (r.display !== 'granted') return; }
      const [hh, mm] = String(s.reminderTime || '20:00').split(':').map(Number);
      const tt = (k, en) => (typeof g.t === 'function' ? g.t(k) : en); // đúng ngôn ngữ giao diện (15 ngôn ngữ)
      await LN.schedule({ notifications: [{
        id: 1,
        ...(g.App && g.App.kitNudge ? g.App.kitNudge() : { title: tt('Lexkite – đến giờ học rồi!', 'Lexkite – time to study!') + ' 📚', body: tt('Học vài từ mới để giữ chuỗi ngày học nhé', 'Review a few cards to keep your streak') + ' 🔥' }),
        schedule: { on: { hour: hh || 20, minute: mm || 0 }, repeats: true, allowWhileIdle: true },
        extra: { route: '#/review' },
      }] });
    } catch (e) { /* thiết bị không hỗ trợ */ }
  }
  // Bấm thông báo → mở thẳng trang ôn tập
  if (P.LocalNotifications) P.LocalNotifications.addListener('localNotificationActionPerformed', a => { const r = a && a.notification && a.notification.extra && a.notification.extra.route; if (r) location.hash = r; });
  // Nút Back của Android: đóng hộp thoại/ô tra từ trước, rồi lùi trang; ở trang chủ thì thu nhỏ app (không thoát mất trạng thái)
  if (P.App) P.App.addListener('backButton', ({ canGoBack }) => {
    const m = document.getElementById('modal');
    if (m && !m.hidden) { if (g.UI && g.UI.closeModal) g.UI.closeModal(); else m.hidden = true; return; }
    const open = document.querySelector('.drawer.open, .sheet.open, [data-sheet]:not([hidden])');
    if (open) { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return; }
    if (canGoBack && !/^#?\/?(home)?$/.test(location.hash)) history.back();
    else P.App.minimizeApp().catch(() => P.App.exitApp());
  });
  // Thanh trạng thái theo giao diện sáng/tối của app
  const syncBar = () => {
    const SB = P.StatusBar; if (!SB) return;
    const th = document.documentElement.getAttribute('data-theme');
    const dark = th ? th === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    SB.setStyle({ style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (Cap.getPlatform() === 'android' && /^#[0-9a-f]{6}$/i.test(bg)) SB.setBackgroundColor({ color: bg }).catch(() => {});
  };
  new MutationObserver(syncBar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncBar);
  window.addEventListener('load', syncBar);
  g.VBNative.scheduleReminder = scheduleReminder;
  window.addEventListener('load', () => setTimeout(() => scheduleReminder({ ask: false }), 3000));
})(typeof self !== 'undefined' ? self : this);
