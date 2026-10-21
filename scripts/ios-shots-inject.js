// CHỈ dùng cho bản build chụp ảnh App Store (.github/workflows/ios-shots.yml chép file này vào mobile/www) – KHÔNG có trong app phát hành.
// Điều khiển app gốc trên Simulator: workflow ghi lệnh "<số thứ tự> <route>[?hl=xx][&flip=1]" vào máy chủ nhỏ http://127.0.0.1:8765/cmd,
// script này hỏi mỗi giây (không dùng simctl openurl vì iOS hiện hộp "Open in Lexkite?" chặn deep link).
//   hl=xx  → nạp lại app với ?sandbox=1&demo=1&hl=xx (dữ liệu mẫu tách riêng, giống ảnh Google Play)
//   flip=1 → lật thẻ ôn (#flipBtn) để hiện các nút chấm FSRS
(function () {
  // Ảnh App Store không được dính hộp "Would Like to Send You Notifications" của iOS (simctl không cấp sẵn quyền thông báo):
  // bản chụp ảnh thay plugin LocalNotifications bằng bản giả "đã từ chối" → app không xin quyền khi xong bước thiết lập.
  function muteLN() {
    try {
      var P = window.Capacitor && window.Capacitor.Plugins; if (!P || !P.LocalNotifications || P.LocalNotifications.__muted) return;
      var ok = function (v) { return function () { return Promise.resolve(v); }; };
      var fake = { __muted: true, checkPermissions: ok({ display: 'denied' }), requestPermissions: ok({ display: 'denied' }), cancel: ok(), schedule: ok(), getPending: ok({ notifications: [] }), addListener: ok({ remove: function () {} }) };
      try { P.LocalNotifications = fake; } catch (e) { /* chỉ đọc */ }
      if (!P.LocalNotifications.__muted) Object.defineProperty(P, 'LocalNotifications', { value: fake, configurable: true });
    } catch (e) { /* không có Capacitor */ }
  }
  muteLN(); document.addEventListener('DOMContentLoaded', muteLN);
  var HIDE = '#toast,.install-nudge,#installBtn,.lk-rep,#lkRep{display:none!important}';
  document.addEventListener('DOMContentLoaded', function () {
    var s = document.createElement('style'); s.textContent = HIDE; document.head.appendChild(s);
    // Lần mở đầu có thể vào màn chào → đi qua bước thiết lập như scripts/play-shots.mjs
    setTimeout(function () {
      if (/demo=1/.test(location.search) && /^#\/welcome/.test(location.hash)) {
        location.hash = '#/welcome/setup';
        setTimeout(function () { var g = document.getElementById('go'); if (g) g.click(); }, 2500);
      }
    }, 4000);
  });
  function go(url) {
    var m = /^lexkite:\/\/go\/([^?#]*)(?:\?([^#]*))?/i.exec(url || ''); if (!m) return;
    var q = new URLSearchParams(m[2] || ''), route = m[1] || 'home', hl = q.get('hl');
    if (hl && !new RegExp('[?&]hl=' + hl + '(&|$)').test(location.search)) {
      location.replace(location.pathname + '?sandbox=1&demo=1&hl=' + hl + '#/' + route); return;
    }
    location.hash = '#/' + route;
    setTimeout(function () { scrollTo(0, 0); }, 1500);
    if (q.get('flip')) setTimeout(function () { var b = document.getElementById('flipBtn'); if (b) b.click(); }, 2500);
  }
  // Kênh lệnh qua localhost (bản chụp ảnh bật NSAllowsLocalNetworking); số thứ tự giữ qua lần nạp lại bằng sessionStorage
  setInterval(function () {
    fetch('http://127.0.0.1:8765/cmd?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) {
      var m = /^(\d+) (\S+)/.exec((t || '').trim()); if (!m) return;
      var last = sessionStorage.getItem('lkShotSeq');
      if (last === m[1]) return;
      sessionStorage.setItem('lkShotSeq', m[1]); go('lexkite://go/' + m[2]);
    }).catch(function () { /* máy chủ chưa chạy */ });
  }, 1000);
  (function hook() {
    var A = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
    if (!A) { setTimeout(hook, 300); return; }
    A.addListener('appUrlOpen', function (e) { go(e && e.url); });
  })();
})();
