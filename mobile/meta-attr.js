/* 📣 Đo cài + bài đầu tiên cho quảng cáo cài app Meta (docs/META-ADS.md): chỉ Android, không SDK; native.js chỉ nạp khi referrer là của Meta. Công tắc lk.metaAds: '1' bật · '0' tắt · trống = chưa chọn. */
(function (g) {
  const L = localStorage, get = k => { try { return L.getItem(k); } catch (e) { return null; } }, set = (k, v) => { try { L.setItem(k, v); } catch (e) { /* bỏ qua */ } };
  const iid = () => { let v = get('lk.iid'); if (!/^[a-f0-9]{32}$/.test(v || '')) { v = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join(''); set('lk.iid', v); } return v; };
  const consent = () => { const v = get('lk.metaAds'); return v === '1' ? 'y' : v === '0' ? '' : 'u'; };
  const off = () => !consent() || get('lk.noTrack') === '1' || /[?&](sandbox|demo)=/.test(location.search) || navigator.webdriver;
  async function ref() { // Install Referrer đọc 1 lần, nhớ ở lk.ir ('-' = không phải Meta)
    let r = get('lk.ir');
    if (r == null) {
      const P = g.Capacitor && g.Capacitor.Plugins && g.Capacitor.Plugins.InstallReferrer; if (!P) return '';
      try { r = String((await P.get()).referrer || '').slice(0, 600); } catch (e) { return ''; }
      if (!/facebook|instagram|fb4a|ig4a|utm_source=(?:fb|ig|meta)/i.test(r)) r = '-'; // khớp parseReferrer (functions/api/_meta_capi.js)
      set('lk.ir', r);
    }
    return r === '-' ? '' : r;
  }
  const post = b => { try { return !!navigator.sendBeacon && navigator.sendBeacon('https://lexkite.com/api/hit', JSON.stringify({ t: 'ma', iid: iid(), c: consent(), ...b })); } catch (e) { return false; } };
  async function install() { // 1 lần; bật đồng ý muộn (đã gửi ở 'u') → gửi lại với c:'y'
    const c = consent(), done = get('lk.ma') || ''; if (off() || done === 'y' || (done === 'u' && c === 'u')) return;
    const r = await ref(); if (r && post({ ev: 'install', ref: r })) set('lk.ma', c);
  }
  async function activate() { // xong bài học đầu tiên (lexkite:first-win, remind.js)
    if (off() || get('lk.ma.a')) return;
    const r = await ref(); if (!r) return;
    await install(); if (post({ ev: 'activate', ref: r })) set('lk.ma.a', '1');
  }
  g.MetaAttr = { install, activate };
})(window);
