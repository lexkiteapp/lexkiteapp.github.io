/* Nút "Tải app" một chạm – dùng chung: landing (nội tuyến lúc build, scripts/build-landing.mjs) + web app (nạp lười: menu bên, trang Tôi, nút 📲 Android).
   [data-get-app="<nơi>"] mặc định hidden; đích theo nền tảng:
     Chrome/Edge máy tính → Chrome Web Store (LK_EXT.store; ẩn khi add-on đã cài – LKExt của js/ext-cta.js) · Android → Google Play (LK_APPS.play)
     iPhone/iPad → App Store nếu có LK_APPS.ios, chưa có → hướng dẫn Thêm vào MH chính · Safari Mac ≥ 17 → hướng dẫn Thêm vào Dock
     còn lại (Firefox…) → web app, chỉ phần tử có data-web="<url>" (landing). Ẩn khi đang chạy như app (PWA, app gốc, add-on).
   Link cửa hàng gắn nguồn để đếm lượt cài (CWS utm_* · Play referrer=utm_* · App Store ct=); bấm → /api/hit { t:'q', ev:'app_<nơi>_<đích>' }.
   Hướng dẫn cài: js/get-app-guide.js, chỉ nạp khi bấm (landing giữ ≤ 16 KB gzip). Đường dẫn cửa hàng: js/ext-config.js (nguồn duy nhất). */
(function (W, D) {
  if (W.LKGetApp) return;
  var A = W.LK_APPS || {}, N = navigator, u = N.userAgent, E = W.LKExt, S = 'utm_source=lexkite.com&utm_medium=get_app&utm_campaign=';
  var ios = /iPhone|iPad|iPod/.test(u) || /Mac/.test(u) && N.maxTouchPoints > 1, v = u.match(/Version\/(\d+)[\d.]* Safari/);
  var mac = !ios && /Mac/.test(u) && v && v[1] >= 17 && !/Chrom|Edg\/|Firefox|OPR/.test(u), ready = !(E && E.eligible());
  var q = function (h) { return h + (h.indexOf('?') < 0 ? '?' : '&'); };
  function kind() {
    try { if (/^(chrome-extension|capacitor):/.test(location.protocol) || N.standalone || W.VBNative && W.VBNative.is || W.Capacitor && W.Capacitor.isNativePlatform && W.Capacitor.isNativePlatform() || matchMedia('(display-mode: standalone)').matches) return ''; } catch (e) { /* bỏ qua */ }
    if (/Android/.test(u)) return A.play ? 'play' : '';
    if (ios) return A.ios ? 'ios' : 'a2hs';
    if (E && E.eligible()) return E.installed() ? '' : 'cws';
    return mac ? 'dock' : 'web';
  }
  function href(k, p, w) {
    return k === 'cws' ? W.LK_EXT.store + '?' + S + p : k === 'play' ? q(A.play) + 'referrer=' + encodeURIComponent(S + p) : k === 'ios' ? q(A.ios) + 'ct=get_app_' + p : k === 'web' ? q(w) + 'src=get_app_' + p : '#';
  }
  function scan(root) {
    var k = kind(), els = (root || D).querySelectorAll('[data-get-app]'), i, el, w;
    for (i = 0; i < els.length; i++) {
      el = els[i]; w = el.getAttribute('data-web');
      if (k === 'cws' && !ready) { el.hidden = true; continue; } // chờ biết add-on đã cài chưa; CSS .dc giữ chỗ
      el.hidden = !k || k === 'web' && !w;
      if (el.hidden) { el.setAttribute('data-off', ''); continue; }
      el.removeAttribute('data-off'); el.setAttribute('data-kind', k);
      if (el.tagName !== 'A') continue;
      el.href = href(k, el.getAttribute('data-get-app'), w);
      if (/cws|play|ios/.test(k)) { el.target = '_blank'; el.rel = 'noopener'; } else el.removeAttribute('target');
      if (k === 'a2hs' || k === 'dock') el.setAttribute('role', 'button');
    }
  }
  function go(p, k) {
    try { N.sendBeacon('/api/hit', JSON.stringify({ t: 'q', ev: 'app_' + p + '_' + k })); } catch (e) { /* bỏ qua */ }
    if (k !== 'a2hs' && k !== 'dock') return;
    if (W.LKGetAppGuide) return W.LKGetAppGuide(k);
    var sc = D.createElement('script'); sc.src = '/js/get-app-guide.js'; sc.onload = function () { W.LKGetAppGuide(k); }; D.head.appendChild(sc);
  }
  D.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-get-app]'), k;
    if (!a) return;
    k = a.getAttribute('data-kind') || kind();
    if (k === 'a2hs' || k === 'dock') e.preventDefault();
    go(a.getAttribute('data-get-app'), k);
  }, true);
  // Mở đích từ nút do trang tự vẽ (vd. nút 📲 trong app trên Android)
  function open(p) {
    var k = kind();
    if (!k || k === 'web') return false;
    go(p, k);
    if (k !== 'a2hs' && k !== 'dock') W.open(href(k, p), '_blank', 'noopener');
    return true;
  }
  scan();
  if (!ready) { // Chrome máy tính: js/ext-cta.js cần ~0,9 s để biết add-on đã cài chưa → quét lại
    var later = function () { setTimeout(function () { ready = true; scan(); }, 1000); };
    if (D.readyState === 'complete') later(); else W.addEventListener('load', later);
    W.addEventListener('message', function (e) { if (ready && e.source === W && e.data && e.data.lkBridge) setTimeout(scan, 50); });
  }
  W.LKGetApp = { kind: kind, scan: scan, open: open };
})(window, document);
