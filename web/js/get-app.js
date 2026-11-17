/* Nút "Tải app" một chạm – dùng chung: landing (nội tuyến lúc build, scripts/build-landing.mjs) + web app (nạp lười: menu bên, trang Tôi, nút 📲 Android).
   [data-get-app="<nơi>"] mặc định hidden; đích theo nền tảng:
     Chrome/Edge máy tính → Chrome Web Store (LK_EXT.store; ẩn khi add-on đã cài – LKExt của js/ext-cta.js) · Android → Google Play (LK_APPS.play)
     iPhone/iPad → App Store (LK_APPS.ios; hướng dẫn Thêm vào MH chính chỉ dự phòng khi nguồn để rỗng, hiện không xảy ra) · Safari Mac ≥ 17 → hướng dẫn Thêm vào Dock
     Firefox/Edge máy tính → listing riêng nếu đã điền LK_APPS.firefox/edge (chưa có: Edge → Chrome Web Store, Firefox → web app)
     còn lại (Firefox…) → web app, chỉ phần tử có data-web="<url>" (landing). Ẩn khi đang chạy như app (PWA, app gốc, add-on).
   [data-ch="<ios|play|cws|edge|firefox>"] data-from="<nơi>" = liệt kê đủ kênh (khu Cài của landing, chân trang, trang Tôi), để máy tính cũng lấy được link điện thoại:
     kênh chưa có link → ẩn; đang chạy như app → ẩn hết (cả [data-install]); đã cài add-on → chỉ ẩn kênh add-on; kênh hợp nền tảng đang dùng lên đầu.
   Link cửa hàng gắn nguồn để đếm lượt cài (CWS utm_* · Play referrer=utm_* · App Store ct=); bấm → /api/hit { t:'q', ev:'app_<nơi>_<đích>' }.
   Hướng dẫn cài: js/get-app-guide.js, chỉ nạp khi bấm (landing giữ ≤ 16 KB gzip). Đường dẫn cửa hàng: js/ext-config.js, sinh từ infra/install-links.json (nguồn duy nhất). */
(function (W, D) {
  if (W.LKGetApp) return;
  var A = W.LK_APPS || {}, N = navigator, u = N.userAgent, E = W.LKExt, S = 'utm_source=lexkite.com&utm_medium=get_app&utm_campaign=';
  var ios = /iPhone|iPad|iPod/.test(u) || /Mac/.test(u) && N.maxTouchPoints > 1, v = u.match(/Version\/(\d+)[\d.]* Safari/);
  var mac = !ios && /Mac/.test(u) && v && v[1] >= 17 && !/Chrom|Edg\/|Firefox|OPR/.test(u), ready = !(E && E.eligible());
  var q = function (h) { return h + (h.indexOf('?') < 0 ? '?' : '&'); };
  function asApp() {
    try { return !!(/^(chrome-extension|capacitor):/.test(location.protocol) || N.standalone || W.VBNative && W.VBNative.is || W.Capacitor && W.Capacitor.isNativePlatform && W.Capacitor.isNativePlatform() || matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; }
  }
  var LINK = { cws: W.LK_EXT && W.LK_EXT.store, play: A.play, ios: A.ios, edge: A.edge, firefox: A.firefox };
  function kind() {
    if (asApp()) return '';
    if (/Android/.test(u)) return A.play ? 'play' : '';
    if (ios) return A.ios ? 'ios' : 'a2hs';
    if (/Firefox\//.test(u) && A.firefox) return 'firefox';
    if (/Edg\//.test(u) && A.edge) return E && E.installed() ? '' : 'edge';
    if (E && E.eligible()) return E.installed() ? '' : 'cws';
    return mac ? 'dock' : 'web';
  }
  function href(k, p, w) {
    return k === 'cws' || k === 'edge' || k === 'firefox' ? q(LINK[k]) + S + p : k === 'play' ? q(A.play) + 'referrer=' + encodeURIComponent(S + p) : k === 'ios' ? q(A.ios) + 'ct=get_app_' + p : k === 'web' ? q(w) + 'src=get_app_' + p : '#';
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
      if (LINK[k]) { el.target = '_blank'; el.rel = 'noopener'; } else el.removeAttribute('target');
      if (k === 'a2hs' || k === 'dock') el.setAttribute('role', 'button');
    }
    var app = asApp(), r = root || D, xs = r.querySelectorAll('[data-install],a[href="#install"]'), cs = r.querySelectorAll('[data-ch]');
    for (i = 0; i < xs.length; i++) xs[i].hidden = app;
    for (i = 0; i < cs.length; i++) {
      el = cs[i]; w = el.getAttribute('data-ch');
      el.hidden = app || !LINK[w] || (w === 'cws' || w === 'edge') && !!E && ready && E.installed();
      if (el.hidden) continue;
      if (el.tagName === 'A') el.href = href(w, el.getAttribute('data-from') || 'inst');
      el.style.order = w === k ? -1 : '';
    }
  }
  function go(p, k) {
    try { N.sendBeacon('/api/hit', JSON.stringify({ t: 'q', ev: 'app_' + p + '_' + k })); } catch (e) { /* bỏ qua */ }
    if (k !== 'a2hs' && k !== 'dock') return;
    if (W.LKGetAppGuide) return W.LKGetAppGuide(k);
    var sc = D.createElement('script'); sc.src = '/js/get-app-guide.js'; sc.onload = function () { W.LKGetAppGuide(k); }; D.head.appendChild(sc);
  }
  D.addEventListener('click', function (e) {
    var c = e.target.closest && e.target.closest('[data-ch]'), a, k;
    if (c) return go(c.getAttribute('data-from') || 'inst', c.getAttribute('data-ch'));
    a = e.target.closest && e.target.closest('[data-get-app]');
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
  // /get trên máy tính → landing?to=install: cuộn sau khi nạp xong CSS trễ (dùng #install thì đang đứng giữa trang lúc CSS áp vào, CLS ≈ 1)
  if (/[?&]to=install\b/.test(location.search)) { var toI = function () { var x = D.getElementById('install'); if (x) x.scrollIntoView(); }; if (D.readyState === 'complete') toI(); else W.addEventListener('load', toI); }
  W.LKGetApp = { kind: kind, scan: scan, open: open };
})(window, document);
