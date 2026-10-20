// CHỈ dùng cho bản build chụp ảnh App Store (.github/workflows/ios-shots.yml chép file này vào mobile/www) – KHÔNG có trong app phát hành.
// Điều khiển app gốc trên Simulator bằng deep link: xcrun simctl openurl <máy> "lexkite://go/<route>[?hl=xx][&flip=1]"
//   hl=xx  → nạp lại app với ?sandbox=1&demo=1&hl=xx (dữ liệu mẫu tách riêng, giống ảnh Google Play)
//   flip=1 → lật thẻ ôn (#flipBtn) để hiện các nút chấm FSRS
(function () {
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
  (function hook() {
    var A = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.App;
    if (!A) { setTimeout(hook, 300); return; }
    A.addListener('appUrlOpen', function (e) { go(e && e.url); });
  })();
})();
