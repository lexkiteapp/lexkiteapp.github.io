/* Quảng cáo – phần chạy thật (TẢI LƯỜI bởi js/ads.js, chỉ khi cờ từ xa bật cho nền tảng này). Thiết kế: docs/ADS.md.
 * Web: AdSense trong ô cố định (0 CLS), chỉ sau khi CMP của Google (TCF v2.2 / luật bang Mỹ) trả lời; DNT/GPC → không cá nhân hóa + hạn chế xử lý dữ liệu.
 * App: AdMob (@capacitor-community/admob) + UMP; banner chỉ ở tab Hôm nay, toàn màn hình cuối phiên (giới hạn tần suất), có thưởng do người dùng chọn.
 * Đo lường: 1 beacon /api/hit { t:'ad' } mỗi phiên (lúc ẩn/rời trang) – số đếm, nhóm a/h (đối chứng 10 %), đồng ý theo vùng (máy chủ suy từ mã nước). Không PII. */
(function (g) {
  const P = g.AdsPolicy, C = g.ADS_CONFIG || {}, d = document;
  if (!P) return;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* bỏ qua */ } } };
  const t = (s, v) => (g.t ? g.t(s, v) : s);
  const remote = () => { try { return (JSON.parse(ls.get('lk.cfg') || '{}').v) || {}; } catch (e) { return {}; } };
  const cap = g.Capacitor, capP = cap && cap.getPlatform ? cap.getPlatform() : '';
  const plat = capP === 'ios' || capP === 'android' ? capP : 'web', native = plat !== 'web';
  const route = () => (location.hash.replace(/^#\/?/, '').split(/[/?]/)[0] || 'home');
  const vid = ls.get('lk.vid') || '';
  const ctx = () => ({ plat, route: route(), path: location.pathname, proto: location.protocol, edu: ls.get('lk.edu') === '1', u13: ls.get('lk.u13') === '1', sandbox: /[?&](sandbox|demo)=/.test(location.search), bot: !!navigator.webdriver, vid });
  const F = () => P.flags(remote(), C);
  const BASE = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com';
  const iso = (x = Date.now()) => { const z = new Date(x); return z.getFullYear() + '-' + String(z.getMonth() + 1).padStart(2, '0') + '-' + String(z.getDate()).padStart(2, '0'); };
  const dayDiff = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

  // ---------- trạng thái trên máy (không đồng bộ, không PII) ----------
  let st = {}; try { st = JSON.parse(ls.get('lk.ads') || '{}') || {}; } catch (e) { st = {}; }
  const save = () => ls.set('lk.ads', JSON.stringify(st));
  if (!st.firstAt) st.firstAt = Date.now();

  // ---------- đo lường ----------
  const coh = P.cohort(vid), ev = {}, m = { ses: 1 }; let consentK = '';
  const bump = (k, n = 1) => { ev[k] = (ev[k] || 0) + n; };
  const today = iso();
  if (!st.c0) { st.c0 = today; m.n1 = 1; }
  else { const dd = dayDiff(st.c0, today); if (dd === 1 && !st.r1) { st.r1 = 1; m.r1 = 1; } if (dd === 7 && !st.r7) { st.r7 = 1; m.r7 = 1; } }
  save();
  let vis = d.visibilityState === 'visible' ? Date.now() : 0, dur = 0, sent = false;
  const noTrack = ls.get('lk.noTrack') === '1';
  const flush = () => {
    if (vis) { dur += (Date.now() - vis) / 1000; vis = 0; }
    if (noTrack) return;
    const body = { t: 'ad', plat, c: coh, ev: { ...ev }, m: sent ? { dur: Math.round(dur) } : { ...m, dur: Math.round(dur) }, k: sent ? undefined : consentK || undefined };
    sent = true; dur = 0; Object.keys(ev).forEach(k => delete ev[k]);
    try { navigator.sendBeacon ? navigator.sendBeacon(BASE + '/api/hit', JSON.stringify(body)) : fetch(BASE + '/api/hit', { method: 'POST', body: JSON.stringify(body), keepalive: true }); } catch (e) { /* bỏ qua */ }
  };
  d.addEventListener('visibilitychange', () => { if (d.visibilityState === 'hidden') flush(); else vis = Date.now(); });
  g.addEventListener('pagehide', flush);

  // ---------- Web: AdSense + CMP ----------
  const sig = { dnt: navigator.doNotTrack || g.doNotTrack || '', gpc: navigator.globalPrivacyControl === true };
  let adsP = null;
  const consent = () => new Promise(res => { // CMP Google (AdSense › Privacy & messaging) gắn __tcfapi khi cần hỏi; ngoài EEA/UK/CH gdprApplies = false
    let done = false, n = 0;
    const fin = v => { if (!done) { done = true; res(v); } };
    const poll = () => {
      if (typeof g.__tcfapi === 'function') return g.__tcfapi('addEventListener', 2, (tc, ok) => {
        if (!ok || !tc) return fin('deny');
        if (tc.gdprApplies === false) return fin(P.npa(sig) ? 'npa' : 'na');
        if (tc.eventStatus === 'tcloaded' || tc.eventStatus === 'useractioncomplete') { const c = tc.purpose && tc.purpose.consents || {}; fin(!c[1] ? 'deny' : c[3] && c[4] && !P.npa(sig) ? 'pa' : 'npa'); }
      });
      if (++n > 15) return fin('npa'); // không có CMP sau ~3 s → chỉ quảng cáo không cá nhân hóa
      setTimeout(poll, 200);
    };
    poll();
  });
  const loadAdSense = () => adsP || (adsP = new Promise(res => {
    const q = g.adsbygoogle = g.adsbygoogle || [];
    q.pauseAdRequests = 1; // KHÔNG gửi yêu cầu quảng cáo cho tới khi CMP trả lời
    const s = d.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(C.web.client);
    s.onerror = () => res(false);
    s.onload = () => consent().then(k => {
      consentK = k;
      if (k === 'deny') return res(false); // EEA từ chối lưu trữ/truy cập → không gọi quảng cáo
      if (k !== 'pa') { q.requestNonPersonalizedAds = 1; if (sig.gpc || sig.dnt === '1') q.push({ params: { google_restrict_data_processing: 1 } }); }
      q.pauseAdRequests = 0; res(true);
    });
    d.head.appendChild(s);
  }));
  const fillWeb = () => {
    const f = F(), c = ctx();
    d.querySelectorAll('.ad-slot[data-ad]:not([data-done])').forEach(el => {
      const place = el.dataset.ad, unit = ((C.web || {}).slots || {})[place];
      el.dataset.done = '1';
      const extra = place === 'done' ? { done: true, pct: el.dataset.pct === undefined ? 100 : +el.dataset.pct, ageH: (Date.now() - st.firstAt) / 3600e3 } : {};
      if (!unit || !C.web.client || !P.slot({ ...c, ...extra, route: place === 'blog' ? 'blog' : c.route }, f, place)) { el.hidden = true; return; }
      el.classList.add('on'); bump('req:' + place);
      el.insertAdjacentHTML('beforeend', `<ins class="adsbygoogle" style="display:inline-block;width:300px;height:250px" data-ad-client="${C.web.client}" data-ad-slot="${unit}"></ins>`);
      const ins = el.querySelector('ins');
      new MutationObserver((_, o) => { const s = ins.getAttribute('data-ad-status'); if (!s) return; o.disconnect(); if (s === 'filled') bump('imp:' + place); else { bump('nofill:' + place); el.classList.add('empty'); } }).observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] });
      loadAdSense().then(ok => { if (!ok) { el.classList.add('empty'); return; } try { (g.adsbygoogle = g.adsbygoogle || []).push({}); } catch (e) { /* bỏ qua */ } });
    });
  };
  // Bấm quảng cáo (iframe): cửa sổ mất focus trong khi phần tử đang focus là iframe quảng cáo
  g.addEventListener('blur', () => setTimeout(() => { const a = d.activeElement; if (a && a.tagName === 'IFRAME' && a.closest && a.closest('.ad-slot')) bump('click:' + a.closest('.ad-slot').dataset.ad); }, 0));

  // ---------- App: AdMob + UMP ----------
  const AM = () => cap && cap.Plugins && cap.Plugins.AdMob;
  const testing = !!(C.native && C.native.testing);
  const unit = k => ((testing ? C.native : (C.native || {}).live || {})[plat] || {})[k] || ''; // testing → mã thử của Google, không bao giờ mã thật
  let initP = null;
  const init = () => initP || (initP = (async () => {
    const A = AM(); if (!A) return false;
    try {
      await A.initialize({ initializeForTesting: testing, tagForChildDirectedTreatment: false, tagForUnderAgeOfConsent: false, maxAdContentRating: 'General' });
      let ci = await A.requestConsentInfo().catch(() => null);
      if (ci && ci.isConsentFormAvailable && ci.status === 'REQUIRED') { await A.showConsentForm().catch(() => {}); ci = await A.requestConsentInfo().catch(() => ci); }
      if (plat === 'ios' && A.trackingAuthorizationStatus) { const tr = await A.trackingAuthorizationStatus().catch(() => null); if (tr && tr.status === 'notDetermined' && A.requestTrackingAuthorization) await A.requestTrackingAuthorization().catch(() => {}); }
      consentK = !ci ? 'na' : ci.status === 'OBTAINED' ? 'pa' : ci.status === 'NOT_REQUIRED' ? 'na' : 'npa';
      if (ci && ci.canRequestAds === false) { consentK = 'deny'; return false; } // UMP: chưa được phép → không gọi quảng cáo
      try {
        A.addListener('bannerAdLoaded', () => bump('imp:home')); A.addListener('bannerAdFailedToLoad', () => bump('nofill:home')); A.addListener('bannerAdOpened', () => bump('click:home'));
      } catch (e) { /* bản plugin cũ */ }
      return true;
    } catch (e) { return false; }
  })());
  let bannerOn = false;
  const syncBanner = async () => {
    const want = P.slot(ctx(), F(), 'home') && !!unit('banner');
    if (want === bannerOn) return;
    const A = AM(); if (!A || !(await init())) return;
    if (want) { bannerOn = true; bump('req:home'); d.documentElement.classList.add('has-banner'); A.showBanner({ adId: unit('banner'), adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 64, isTesting: testing }).catch(() => { bannerOn = false; d.documentElement.classList.remove('has-banner'); }); }
    else { bannerOn = false; d.documentElement.classList.remove('has-banner'); A.hideBanner().catch(() => {}); }
  };
  // Cuối phiên: study.js / qtips.js báo xong 1 lượt → chờ người dùng VỀ tab chính rồi mới xét quảng cáo toàn màn hình
  const ended = e => { const x = (e && e.detail) || {}; if (x.second) return; const pct = typeof x.pct === 'number' ? x.pct : x.t ? Math.round(x.r / x.t * 100) : undefined; st.sessions = (st.sessions || 0) + 1; st.pending = 1; if (pct !== undefined) st.lastPct = pct; save(); };
  g.addEventListener('lexkite:practice-done', ended); g.addEventListener('lexkite:test-done', ended);
  const maybeInter = async () => {
    if (!P.interstitial(ctx(), F(), st, Date.now()) || !unit('interstitial')) return;
    const A = AM(); if (!A || !(await init())) return;
    st.pending = 0; save(); bump('req:inter');
    try { await A.prepareInterstitial({ adId: unit('interstitial'), isTesting: testing }); await A.showInterstitial(); st.lastAt = Date.now(); st.sessions = 0; save(); bump('show:inter'); } catch (e) { bump('nofill:inter'); }
  };

  // ---------- Có thưởng (người dùng tự chọn) ----------
  // Có video để mời không (chưa tải gì) – dùng để chọn nút "▶ Xem video" hay phương án miễn phí (js/ad-offers.js)
  // Web: Google Publisher Tag, ô OutOfPage REWARDED (Ad Manager). testing → ô demo công khai của Google
  const W = C.web || {}, rwUnit = !native && (W.testing ? W.DEMO : W.rewarded) || '';
  const rctx = () => ({ ...ctx(), rwUnit });
  let gptP = null;
  const loadGpt = () => gptP || (gptP = consent().then(k => { // cùng cổng CMP như AdSense: từ chối → không tải, không yêu cầu
    consentK = consentK || k;
    if (k === 'deny') return false;
    return new Promise(res => {
      const gt = g.googletag = g.googletag || { cmd: [] };
      gt.cmd.push(() => {
        const pa = gt.pubads();
        if (k !== 'pa') pa.setPrivacySettings({ nonPersonalizedAds: true, restrictDataProcessing: !!(sig.gpc || sig.dnt === '1') });
        gt.enableServices(); res(true);
      });
      const s = d.createElement('script'); s.async = true; s.crossOrigin = 'anonymous';
      s.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js'; s.onerror = () => res(false);
      d.head.appendChild(s);
    });
  }));
  // → true = được thưởng; false = không có quảng cáo (10 s), bị chặn, hoặc đóng trước khi đủ
  const webRewarded = () => loadGpt().then(ok => !ok ? false : new Promise(res => {
    const gt = g.googletag;
    gt.cmd.push(() => {
      const slot = gt.defineOutOfPageSlot(rwUnit, gt.enums.OutOfPageFormat.REWARDED);
      if (!slot) return res(false); // trang/trình duyệt không hỗ trợ định dạng có thưởng
      const pa = gt.pubads(); let got = false, live = true;
      const end = v => { if (!live) return; live = false; clearTimeout(to); try { gt.destroySlots([slot]); } catch (e) { /* bỏ qua */ } res(v); };
      const to = setTimeout(() => { bump('nofill:rew'); end(false); }, 10e3);
      const on = (n, f) => pa.addEventListener(n, e => { if (live && e.slot === slot) f(e); });
      on('rewardedSlotReady', e => { clearTimeout(to); bump('show:rew'); e.makeRewardedVisible(); });
      on('rewardedSlotGranted', () => { got = true; });
      on('rewardedSlotClosed', () => end(got));
      on('slotRenderEnded', e => { if (e.isEmpty) { bump('nofill:rew'); end(false); } });
      slot.addService(pa); gt.display(slot);
    });
  }));
  const canReward = reason => P.rewarded(rctx(), F(), reason) && (native ? !!unit('rewarded') && !!AM() : true) && P.rewLeft(st, reason, iso()) > 0;
  const counted = reason => { const day = iso(); if (!st.rw || st.rw.d !== day) st.rw = { d: day, n: {} }; st.rw.n[reason] = (st.rw.n[reason] || 0) + 1; st.rewAt = Date.now(); save(); };
  async function rewarded(reason) {
    const c = rctx(), f = F();
    if (!native) {
      if (!P.rewarded(c, f, reason) || P.rewLeft(st, reason, iso()) <= 0) return reason === 'streak';
      bump('req:rew'); const r = await webRewarded().catch(() => false);
      if (r) { bump('rewok:rew'); bump('rewok:' + reason); counted(reason); }
      return r || reason === 'streak'; // không có quảng cáo web: cứu chuỗi vẫn được như trước
    }
    if (!P.rewarded(c, f, reason) || !unit('rewarded') || P.rewLeft(st, reason, iso()) <= 0 || !(await init())) return reason === 'streak'; // không có quảng cáo: cứu chuỗi vẫn được như trước, lượt AI/cơ hội 2/x2 XP thì không
    const A = AM(), uid = g.Sync && g.Sync.user && g.Sync.user.uid;
    bump('req:rew');
    try {
      await A.prepareRewardVideoAd({ adId: unit('rewarded'), isTesting: testing, ssv: { userId: (g.UI && g.UI.dev && g.UI.dev()) || '', customData: reason + (uid ? '|' + uid : '') } });
      bump('show:rew'); const r = await A.showRewardVideoAd();
      if (r) { bump('rewok:rew'); bump('rewok:' + reason); counted(reason); }
      return !!r;
    } catch (e) { bump('nofill:rew'); return false; }
  }
  // Hết lượt AI (UI.quota) → mời xem 1 video để có thêm lượt (máy chủ cộng qua SSV: functions/api/ads-reward.js)
  const I18N_P = { p: null };
  const strings = () => I18N_P.p || (I18N_P.p = new Promise(res => {
    const l = g.I18N ? g.I18N.lang() : 'en', one = src => new Promise(r => { const s = d.createElement('script'); s.src = src; s.onload = s.onerror = () => r(); d.head.appendChild(s); });
    one('js/i18n/en/ads.js').then(() => (l !== 'en' && l !== 'vi' ? one(`js/i18n/${l}/ads.js`) : null)).then(res);
  }));
  async function quota(j) {
    const feat = j && j.feature, n = { ai: 3, chat: 10 }[feat];
    if (!n || !j || j.msg !== 'quota.daily' || !P.rewarded(ctx(), F(), feat) || !g.UI || !g.UI.modal) return;
    await strings();
    const box = g.UI.modal(`<div class="center"><p>${t('Hết lượt hôm nay? Xem 1 video ngắn để nhận thêm {n} lượt.', { n })}</p>
      <div class="row center" style="gap:.6rem;margin-top:1rem;flex-wrap:wrap"><button class="btn primary" type="button" data-rw>▶ ${t('Xem video')}</button><button class="btn ghost" type="button" data-close>${t('Để sau')}</button></div></div>`);
    box.querySelector('[data-rw]').onclick = async () => { const ok = await rewarded(feat); g.UI.closeModal(); if (ok) g.UI.toast(t('Đã cộng thêm lượt – thử lại sau vài giây.'), 4000); };
  }

  // ---------- khởi động ----------
  function start() {
    if (native) { syncBanner(); g.addEventListener('hashchange', () => setTimeout(() => { syncBanner(); maybeInter(); }, 60)); return; }
    const v = d.getElementById('view');
    fillWeb();
    if (v) new MutationObserver(fillWeb).observe(v, { childList: true, subtree: true });
  }
  g.AdsRun = { start, rewarded, canReward, quota, inter: maybeInter, _st: () => st, _ev: () => ev, _consent: () => consentK };
})(typeof self !== 'undefined' ? self : this);
