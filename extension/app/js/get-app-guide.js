/* Hộp hướng dẫn cài Lexkite như app (js/get-app.js nạp file này khi bấm "Tải app" trên iPhone/iPad hoặc Safari Mac).
   Chữ: self.LK_GETAPP_T = đối tượng | hàm trả đối tượng (web app, t()) | URL JSON /js/get-app/<lang>.json (landing, scripts/build-landing.mjs)
   { iph:[tiêu đề, b1, b2, b3], ipad:[tiêu đề, b1], mac:[tiêu đề, b1, b2], ok }. Màu chỉ từ bảng màu thương hiệu (docs/BRAND-RULES.md). */
(function (W, D) {
  var css = 0;
  function guide(k) {
    var T = W.LK_GETAPP_T, u = navigator.userAgent, ipad = /iPad/.test(u) || /Mac/.test(u) && navigator.maxTouchPoints > 1 && k !== 'dock', s, d, b;
    if (typeof T === 'string') { // landing: nạp chữ khi cần; lỗi mạng → mở web app (app có hướng dẫn riêng)
      fetch(T).then(function (r) { return r.json(); }).then(function (o) { W.LK_GETAPP_T = o; guide(k); }).catch(function () { location.href = '/app/'; });
      return;
    }
    T = (typeof T === 'function' ? T() : T) || {};
    s = k === 'dock' ? T.mac : ipad && T.ipad ? T.ipad.concat(T.iph.slice(2)) : T.iph;
    if (!s || !s[0]) return;
    if (!css) {
      css = D.createElement('style');
      css.textContent = '#lk-ga{border:0;border-radius:20px;padding:22px 22px 18px;max-width:min(420px,calc(100vw - 32px));background:#FFF7EA;color:#0F3D3E;box-shadow:0 24px 60px rgba(15,61,62,.35);font:16px/1.5 system-ui,sans-serif}'
        + '#lk-ga[open]{position:fixed;inset:0;margin:auto;height:fit-content;z-index:9001}#lk-ga::backdrop{background:rgba(15,61,62,.55)}#lk-ga h2{margin:0 0 10px;font-size:20px;line-height:1.3}'
        + '#lk-ga ol{margin:0 0 16px;padding-inline-start:1.3em;line-height:1.9}#lk-ga button{display:block;width:100%;min-height:48px;border:0;border-radius:999px;background:#0F3D3E;color:#FFF7EA;font:inherit;font-weight:700;cursor:pointer}'
        + '#lk-ga button:focus-visible{outline:3px solid #FFB054;outline-offset:2px}@media (prefers-color-scheme:dark){#lk-ga{background:#0F3D3E;color:#FFF7EA}#lk-ga button{background:#FFC94A;color:#0F3D3E}}';
      D.head.appendChild(css);
    }
    d = D.getElementById('lk-ga');
    if (d) d.remove();
    d = D.createElement('dialog');
    d.id = 'lk-ga'; d.setAttribute('aria-labelledby', 'lk-ga-h');
    d.innerHTML = '<h2 id="lk-ga-h"></h2><ol></ol><button type="button"></button>';
    d.querySelector('h2').textContent = '📲 ' + s[0];
    d.querySelector('ol').innerHTML = s.slice(1).map(function (x) { return '<li>' + x + '</li>'; }).join(''); // chuỗi giao diện tin cậy (có <b>)
    b = d.querySelector('button'); b.textContent = T.ok || 'OK';
    b.onclick = function () { if (d.close) d.close(); d.remove(); };
    d.addEventListener('close', function () { d.remove(); });
    D.body.appendChild(d);
    if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    b.focus();
  }
  W.LKGetAppGuide = guide;
})(window, document);
