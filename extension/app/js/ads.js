/* Quảng cáo Lexkite – 1 API cho mọi nền tảng (cấu hình: js/ads-config.js)
 *   Ads.slot('home')            → chỗ đặt quảng cáo hiển thị (web: AdSense responsive; app: dùng banner AdMob chung → ô trống tự ẩn)
 *   Ads.interstitial('mock')    → quảng cáo toàn màn hình ở điểm nghỉ tự nhiên (app), có giới hạn tần suất
 *   Ads.rewarded('unlock')      → quảng cáo có thưởng (app) → Promise<true/false>; web/không cấu hình → true (không chặn tính năng)
 * Nguyên tắc: tắt hoàn toàn khi chưa cấu hình; không bao giờ hiện trong lúc học/làm bài; add-on không có quảng cáo. */
(function (g) {
  const C = g.ADS_CONFIG || { enabled: false };
  const isExt = !!(g.chrome && g.chrome.runtime && g.chrome.runtime.id && location.protocol === 'chrome-extension:');
  const native = !!(g.VBNative && g.VBNative.is);
  const sandbox = /[?&]sandbox=1/.test(location.search);
  const on = () => C.enabled && !isExt && !sandbox;
  const route = () => (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'home');
  const quiet = () => (C.rules && C.rules.quietRoutes || []).includes(route()) || document.body.classList.contains('bare');
  const store = { get: k => { try { return +localStorage.getItem('vb.ads.' + k) || 0; } catch (e) { return 0; } }, set: (k, v) => { try { localStorage.setItem('vb.ads.' + k, v); } catch (e) { /* bỏ qua */ } } };
  if (!store.get('first')) store.set('first', Date.now());

  // ---------- Web: AdSense ----------
  let adsLoaded = null;
  const loadAdSense = () => adsLoaded || (adsLoaded = new Promise(res => {
    const s = document.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = '?client=' + encodeURIComponent(C.web.client);
    s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s);
  }));
  const fill = () => {
    if (!on() || native || !C.web || !C.web.client) return;
    document.querySelectorAll('.ad-slot[data-ad]:not([data-done])').forEach(el => {
      el.dataset.done = 1; const unit = C.web.slots && C.web.slots[el.dataset.ad];
      if (!unit || quiet()) { el.remove(); return; }
      el.classList.add('on');
      el.innerHTML = `<div class="ad-label">${g.t ? g.t('Quảng cáo') : 'Quảng cáo'}</div><ins class="adsbygoogle" style="display:block" data-ad-client="${C.web.client}" data-ad-slot="${unit}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
      loadAdSense().then(ok => { if (ok) try { (g.adsbygoogle = g.adsbygoogle || []).push({}); } catch (e) { /* bỏ qua */ } else el.remove(); });
    });
  };

  // ---------- App: AdMob ----------
  const AM = () => native && g.Capacitor && g.Capacitor.Plugins && g.Capacitor.Plugins.AdMob;
  const unitOf = k => { const p = (g.Capacitor && g.Capacitor.getPlatform && g.Capacitor.getPlatform()) || 'android'; return ((C.native || {})[p] || {})[k] || ''; };
  let nativeReady = null, bannerOn = false;
  const initNative = () => nativeReady || (nativeReady = (async () => {
    const A = AM(); if (!A || !on()) return false;
    try {
      await A.initialize({ initializeForTesting: !!C.native.testing });
      // Đồng ý quảng cáo cá nhân hóa (GDPR/UMP) – chỉ hiện ở nơi pháp luật yêu cầu
      try { const ci = await A.requestConsentInfo(); if (ci && ci.isConsentFormAvailable && ci.status === 'REQUIRED') await A.showConsentForm(); } catch (e) { /* bỏ qua */ }
      return true;
    } catch (e) { return false; }
  })());
  const syncBanner = async () => {
    const A = AM(); if (!A || !(await initNative())) return;
    const want = !quiet() && !!unitOf('banner');
    if (want && !bannerOn) { bannerOn = true; document.documentElement.classList.add('has-banner'); A.showBanner({ adId: unitOf('banner'), adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 64, isTesting: !!C.native.testing }).catch(() => { bannerOn = false; document.documentElement.classList.remove('has-banner'); }); }
    else if (!want && bannerOn) { bannerOn = false; document.documentElement.classList.remove('has-banner'); A.hideBanner().catch(() => {}); }
  };

  g.Ads = {
    slot: k => on() && !native && C.web && C.web.client && (C.web.slots || {})[k] ? `<div class="ad-slot" data-ad="${k}" aria-label="Quảng cáo"></div>` : '',
    async interstitial(reason) {
      const A = AM(); if (!A || !unitOf('interstitial') || !(await initNative())) return false;
      const R = C.rules || {}, now = Date.now();
      if (now - store.get('first') < (R.interstitialAfterDays || 1) * 864e5) return false;
      if (now - store.get('lastFull') < (R.interstitialGapMin || 4) * 60e3) return false;
      try { await A.prepareInterstitial({ adId: unitOf('interstitial'), isTesting: !!C.native.testing }); await A.showInterstitial(); store.set('lastFull', now); return true; } catch (e) { return false; }
    },
    async rewarded(reason) {
      const A = AM(); if (!A || !unitOf('rewarded') || !(await initNative())) return true; // không có quảng cáo → không chặn người học
      try { await A.prepareRewardVideoAd({ adId: unitOf('rewarded'), isTesting: !!C.native.testing }); const r = await A.showRewardVideoAd(); return !!r; } catch (e) { return true; }
    },
  };
  if (!on()) return;
  const view = () => document.getElementById('view');
  const watch = () => { const v = view(); if (!v) return setTimeout(watch, 300); new MutationObserver(fill).observe(v, { childList: true, subtree: true }); fill(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
  if (native) { g.addEventListener('hashchange', () => setTimeout(syncBanner, 50)); g.addEventListener('load', () => setTimeout(syncBanner, 1500)); }
})(typeof self !== 'undefined' ? self : this);
