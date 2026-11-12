/* Lời mời "Thêm vào Chrome" cho add-on Lexkite – dùng chung: landing + blog (nội tuyến lúc build) và web app (nạp lười).
   - Phần tử [data-ext-cta="<nơi>"] mặc định có thuộc tính hidden; chỉ hiện trên Chromium máy tính (Chrome/Edge/Brave/Opera),
     ẩn trên di động, Safari, Firefox, trong app Capacitor và trong chính add-on (chrome-extension:).
   - Ẩn khi add-on đã cài: content script đặt <html data-lexkite-ext="phiên bản"> (từ 2.6.431) hoặc trả lời cầu nối lkBridge (mọi bản).
   - Đếm lượt bấm ẩn danh qua /api/hit { t:'q', ev:'ext_<nơi>' } (chỉ đếm số, không gửi gì khác).
   - LKExt.lookup(txt): web app gọi sau mỗi lần tra từ → từ lần tra thứ 3, gợi ý (toast đóng được) tối đa 1 lần / 7 ngày.
   Đường dẫn cửa hàng: self.LK_EXT (js/ext-config.js). */
(function (W, D) {
  if (W.LKExt) return;
  var X = W.LK_EXT || {}, R = D.documentElement, inst = false, ready = false, CSS = 0;
  var ls = function (k, v) { try { if (v === undefined) return W.localStorage.getItem(k); W.localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } return null; };
  var elig = (function () {
    try {
      if (!X.store || !/^https?:$/.test(location.protocol) || (W.Capacitor && (!W.Capacitor.isNativePlatform || W.Capacitor.isNativePlatform()))) return false;
      var u = navigator.userAgent || '', d = navigator.userAgentData;
      if (/Mobile|Android|CriOS|FxiOS|EdgiOS|iPhone|iPad|SamsungBrowser|YaBrowser|wv\)/.test(u)) return false;
      if (d && d.brands) return !d.mobile && d.platform !== 'Android' && d.brands.some(function (b) { return /Chromium/.test(b.brand); });
      return /Chrome\/\d/.test(u) && !/Firefox|Version\/[\d.]+ Safari/.test(u);
    } catch (e) { return false; }
  })();
  var has = function () { return inst || !!R.getAttribute('data-lexkite-ext'); };
  var show = function () { return elig && ready && !has(); };
  function scan(root) {
    var on = show(), els = (root || D).querySelectorAll('[data-ext-cta]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.tagName === 'A' && X.store) { el.href = X.store; el.target = '_blank'; el.rel = 'noopener'; }
      el.hidden = !on;
    }
    if (!on) { var t = D.getElementById('lk-xn'); if (t) t.remove(); }
  }
  function mark() { if (inst) return; inst = true; scan(); }
  W.addEventListener('message', function (e) {
    var m = e.data;
    if (e.source === W && m && (m.lkBridge === 'hello' || (m.lkBridge === 'res' && m.id === 'lkx'))) mark();
  });
  D.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('[data-ext-cta]');
    if (!a || a.tagName !== 'A') return;
    try { var b = JSON.stringify({ t: 'q', ev: 'ext_' + a.getAttribute('data-ext-cta') }); if (navigator.sendBeacon) navigator.sendBeacon('/api/hit', b); } catch (x) { /* bỏ qua */ }
    if (a.closest('#lk-xn')) { ls('lk.extNudge', String(Date.now())); var t = D.getElementById('lk-xn'); if (t) t.remove(); }
  }, true);
  // Chờ content script (document_idle) kịp đặt dấu/trả lời rồi mới hiện → không nháy nút với người đã cài
  function start() {
    if (!elig) return;
    try { W.postMessage({ lkBridge: 'req', op: 'diag', id: 'lkx' }, location.origin); } catch (e) { /* bỏ qua */ }
    setTimeout(function () { ready = true; scan(); }, 900);
  }
  if (D.readyState === 'complete') start(); else W.addEventListener('load', start);

  // <nudge> (chỉ web app – landing/blog dựng sẵn bỏ đoạn này cho nhẹ)
  function nudge(txt) {
    if (!show() || D.getElementById('lk-xn') || !txt) return;
    if (!CSS) {
      CSS = D.createElement('style');
      CSS.textContent = '#lk-xn{position:fixed;inset-inline-end:16px;bottom:16px;z-index:9000;max-width:min(360px,calc(100vw - 32px));display:flex;gap:12px;align-items:flex-start;background:#0F3D3E;color:#fff;border-radius:16px;padding:14px 14px 14px 16px;box-shadow:0 16px 40px rgba(0,0,0,.28);font-size:14px;line-height:1.45}'
        + '#lk-xn p{margin:0 0 10px}#lk-xn a{display:inline-block;background:#FFC94A;color:#0F3D3E;font-weight:700;border-radius:999px;padding:7px 14px;text-decoration:none}#lk-xn a:focus-visible,#lk-xn button:focus-visible{outline:2px solid #FFB054;outline-offset:2px}'
        + '#lk-xn button{flex:none;background:none;border:0;color:#fff;opacity:.8;font-size:20px;line-height:1;cursor:pointer;padding:2px 4px}#lk-xn .k{flex:none;font-size:22px}'
        + '@media (prefers-reduced-motion:no-preference){#lk-xn{animation:lkxn .35s ease-out}@keyframes lkxn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}}';
      D.head.appendChild(CSS);
    }
    var d = D.createElement('div');
    d.id = 'lk-xn'; d.setAttribute('role', 'status');
    d.innerHTML = '<span class="k" aria-hidden="true">🧩</span><div><p></p><a data-ext-cta="nudge"></a></div><button type="button"></button>';
    d.querySelector('p').textContent = txt.text; d.querySelector('a').textContent = txt.btn;
    var x = d.querySelector('button'); x.textContent = '×'; x.setAttribute('aria-label', txt.close || '×');
    x.onclick = function () { ls('lk.extNudge', String(Date.now())); d.remove(); };
    D.body.appendChild(d); scan(d);
  }
  function lookup(txt) {
    if (!elig || has()) return;
    var n = (+ls('lk.extN') || 0) + 1, last = +ls('lk.extNudge') || 0;
    ls('lk.extN', String(n));
    if (n >= 3 && Date.now() - last > 6048e5) { ls('lk.extN', '0'); ls('lk.extNudge', String(Date.now())); setTimeout(function () { nudge(txt); }, 1200); }
  }
  // </nudge>
  W.LKExt = { eligible: function () { return elig; }, installed: has, scan: scan, lookup: typeof lookup === 'function' ? lookup : function () {} };
})(window, document);
