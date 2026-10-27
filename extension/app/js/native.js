/* Cầu nối app gốc (Android/iOS qua Capacitor). Chỉ chạy khi mở trong app – web & add-on bỏ qua hoàn toàn.
 * – Nhắc học hằng ngày bằng thông báo cục bộ (không cần máy chủ, miễn phí)
 * – Rung phản hồi (Haptics) thay cho navigator.vibrate
 * – Không dùng service worker trong app (tài nguyên đã nằm sẵn trong gói cài đặt)
 * – Widget màn hình chính/khóa: plugin WidgetBridge (mobile/ios/App/App/WidgetBridgePlugin.swift, mobile/android/.../WidgetBridgePlugin.java) */
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

  // Nhắc học: lập lịch 7+ ngày cục bộ ở js/remind.js (tải lười, docs/REMINDERS.md). opts.ask: chỉ xin quyền khi người dùng chủ động
  const scheduleReminder = (opts = {}) => P.LocalNotifications && g.App && g.App.need ? g.App.need('remind').then(() => g.Remind.native(P.LocalNotifications, opts)).catch(() => {}) : 0;
  // Bấm thông báo → mở thẳng trang ôn tập
  if (P.LocalNotifications) P.LocalNotifications.addListener('localNotificationActionPerformed', a => { const x = (a && a.notification && a.notification.extra) || {}; if (x.tpl) try { localStorage.setItem('lk.remo', JSON.stringify(x.tpl)); } catch (e) { /* bỏ qua */ } if (x.route) location.hash = x.route; });
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
  // Widget màn hình chính/khóa (iOS WidgetKit, Android App Widget): ghi snapshot nhỏ cho widget đọc offline, không gọi mạng.
  // Gọi từ App.updateChrome (mở app, sau phiên ôn, sau đồng bộ) – gom lại 1,5 giây; ghi ngay khi app xuống nền.
  let wTimer = 0, wLast = '', wArgs = null;
  function widgetSnapshot(state, streakN) {
    const C = g.Core, cards = Object.values((state && state.cards) || {}), end = C.endOfToday();
    const { total } = C.Cards.dueCount(state.cards, state.settings, state.stats);
    const due = cards.filter(c => (c.srs.reps > 0 || c.srs.last) && c.srs.due <= end).sort((a, b) => a.srs.due - b.srs.due);
    const fresh = cards.filter(c => c.srs.reps === 0 && !c.srs.last).sort((a, b) => a.added - b.added);
    const L = g.I18N ? g.I18N.learnLang() : 'vi', tt = k => (typeof g.t === 'function' ? g.t(k) : k);
    const gloss = c => { // nghĩa theo ngôn ngữ người học: tiếng Việt → .vi; ngôn ngữ khác → gói nghĩa bản địa, không có thì định nghĩa tiếng Anh
      let m = g.App && g.App.meanOf ? g.App.meanOf(c) : (L === 'vi' ? c.vi : c.def) || ''; // = App.meanOf (thẻ, danh sách)
      m = String(m || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      return m.length > 90 ? m.slice(0, 88).trim() + '…' : m;
    };
    // Widget tự tính khi qua ngày mà chưa mở app: days[i] = số thẻ ôn đến hạn hết ngày thứ i (0 = hôm nay), newDay = thẻ mới mỗi ngày
    const rev = cards.filter(c => c.srs.reps > 0 || c.srs.last), days = [0, 1, 2, 3, 4, 5, 6].map(i => rev.filter(c => c.srs.due <= end + i * C.DAY).length);
    const newDay = Math.min(fresh.length, +((state.settings || C.DEFAULT_SETTINGS).dailyNew) || 0);
    const soon = rev.filter(c => c.srs.due > end && c.srs.due <= end + 7 * C.DAY).sort((a, b) => a.srs.due - b.srs.due);
    const pick = [...due, ...fresh.slice(0, Math.max(total - due.length, 0)), ...soon].slice(0, 20); // từ đến hạn hôm nay trước, rồi từ sắp đến hạn
    const words = pick.map(c => ({ w: c.word, ipa: ((state.settings || {}).accent === 'en-US' ? c.ipaUS || c.ipa : c.ipa || c.ipaUS) || '', m: gloss(c), lv: String(c.level || '').toUpperCase().slice(0, 2), due: (c.srs.reps > 0 || c.srs.last) ? (c.srs.due || 0) : 0 }));
    return { v: 2, at: Date.now(), due: total, days, newDay, streak: streakN || 0, ...(g.Ret && g.Ret.widget ? { tch: g.Ret.widget(state) } : {}), // tch: giáo viên phản ứng theo chuỗi (lớp giữ thói quen, cờ ret)
      lang: g.I18N ? g.I18N.lang() : 'vi', rtl: !!(g.I18N && g.I18N.rtl), words,
      l: { title: tt('Thẻ đến hạn hôm nay'), streak: tt('Chuỗi ngày'), review: tt('Ôn ngay'), done: tt('Hôm nay bạn đã ôn hết!'), none: tt('Không còn thẻ đến hạn'), n: tt('{n} thẻ ôn lại') } };
  }
  function widgetFlush() {
    clearTimeout(wTimer); wTimer = 0;
    feedPush();
    const WB = P.WidgetBridge; if (!WB || !wArgs || !g.Core) return;
    try {
      const snap = widgetSnapshot(wArgs[0], wArgs[1]), key = JSON.stringify({ ...snap, at: 0 });
      if (key === wLast) return; wLast = key; // không đổi gì → khỏi ghi, khỏi làm mới widget (tiết kiệm pin)
      WB.update({ json: JSON.stringify(snap) }).catch(() => {});
    } catch (e) { /* bỏ qua */ }
  }
  g.VBNative.widget = (state, streakN) => { wArgs = [state, streakN]; clearTimeout(wTimer); wTimer = setTimeout(widgetFlush, 1500); };
  // Widget "Từ mỗi giờ": nạp lười js/widget-feed.js (gói 'wfeed') rồi đẩy ~48 từ sang plugin WordWidget (tự bỏ qua nếu không đổi)
  function feedPush() {
    if (!P.WordWidget || !wArgs || !g.App || !g.App.need) return;
    const st = wArgs[0];
    g.App.need('wfeed').then(() => g.WidgetFeed && g.WidgetFeed.push(st)).catch(() => {});
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && wTimer) widgetFlush(); else if (!document.hidden) feedPush(); });
  // Chạm widget → lexkite://review?w=từ → mở đúng thẻ đó trong phiên ôn (#/review?w=từ)
  // Widget "Từ mỗi giờ" → lexkite://word/<từ> → thẻ từ #/dict/<từ> (chế độ đố: nghĩa hiện ở đây)
  const openDeep = url => {
    const w = /^lexkite:\/\/word\/([^?#/]+)/i.exec(url || '');
    if (w) { let id = w[1]; try { id = encodeURIComponent(decodeURIComponent(id)); } catch (e) { /* giữ nguyên */ } location.hash = '#/dict/' + id; return; }
    const m = /^lexkite:\/\/review\/?(?:\?w=([^&#]*))?/i.exec(url || ''); if (m) location.hash = '#/review' + (m[1] ? '?w=' + m[1] : '');
  };
  if (P.App) {
    P.App.addListener('appUrlOpen', e => openDeep(e && e.url));
    window.addEventListener('load', () => { P.App.getLaunchUrl && P.App.getLaunchUrl().then(r => openDeep(r && r.url)).catch(() => {}); });
  }
  // window.open(url ngoài) trong WKWebView của Capacitor iOS KHÔNG làm gì (đã kiểm E2E: Chính sách, Điều khoản, blog, lexkite.com…).
  // Chuyển trang chính sang url ngoài → Capacitor chặn lại và mở bằng trình duyệt hệ thống, app giữ nguyên trang đang xem.
  const wOpen = g.open;
  g.open = function (u) {
    const s = String(u || '');
    if (/^https?:\/\//i.test(s) && !/^https?:\/\/localhost[:/]/i.test(s)) { location.href = s; return null; }
    return wOpen ? wOpen.apply(this, arguments) : null;
  };
  g.VBNative.scheduleReminder = scheduleReminder;
  g.VBNative.openDeep = openDeep; // kiểm thử E2E (simctl openurl bị hộp "Mở bằng Lexkite?" của hệ thống chặn)
  // OTA + nhắc cập nhật app (js/ota.js, docs/OTA.md): báo bản web chạy được NGAY (không báo → plugin tự quay về bản trước); phần còn lại nạp lười
  if (P.CapacitorUpdater) P.CapacitorUpdater.notifyAppReady().catch(() => {});
  if (P.CapacitorUpdater || P.AppUpdate) window.addEventListener('load', () => setTimeout(() => g.App && g.App.need('ota').then(() => g.VBOta.start()).catch(() => {}), 8000));
  window.addEventListener('load', () => setTimeout(() => scheduleReminder({ ask: false }), 3000));
})(typeof self !== 'undefined' ? self : this);
