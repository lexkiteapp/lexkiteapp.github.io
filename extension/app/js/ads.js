/* Vỏ quảng cáo (docs/ADS.md): js/ads/* chỉ tải lười khi cờ từ xa bật. Tắt = 0 tải, 0 DOM. */
(function (g) {
  const ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const c = () => { try { return JSON.parse(ls('lk.cfg') || '{}').v || {}; } catch (e) { return {}; } };
  const cp = g.Capacitor, pf = cp && cp.getPlatform ? cp.getPlatform() : '', plat = pf === 'ios' || pf === 'android' ? pf : 'web';
  const on = () => { const v = c(); return v.ads_kill !== '1' && v['ads_' + plat] === '1' && !/^(chrome|moz)-extension:/.test(location.protocol) && ls('lk.edu') !== '1' && ls('lk.u13') !== '1' && !/[?&](sandbox|demo)=/.test(location.search) && !navigator.webdriver; };
  let p = null;
  const load = () => p || (p = ['config', 'policy', 'run'].reduce((q, f) => q.then(() => new Promise((y, n) => { const s = document.createElement('script'); s.src = 'js/ads/' + f + '.js'; s.onload = y; s.onerror = n; document.head.appendChild(s); })), Promise.resolve()).then(() => g.AdsRun));
  g.Ads = {
    on,
    slot: k => (k === 'home' && plat === 'web' && on() ? ((l) => `<aside class="ad-slot" data-ad="home" aria-label="${l}"><div class="ad-label" aria-hidden="true">${l}</div></aside>`)(g.t ? g.t('Quảng cáo') : 'Advertisement') : ''),
    rewarded: r => (on() ? load().then(a => a.rewarded(r), () => r === 'streak') : Promise.resolve(r === 'streak')),
    quota: j => { if (on()) load().then(a => a.quota(j)).catch(() => {}); },
  };
  if (on()) g.addEventListener('load', () => (g.requestIdleCallback || setTimeout)(() => load().then(a => a.start()).catch(() => {}), 3000));
})(typeof self !== 'undefined' ? self : this);
