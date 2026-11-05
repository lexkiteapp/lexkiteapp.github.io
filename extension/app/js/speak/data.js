/* TỰ SINH bởi scripts/speak/build.mjs từ content/situations/*.json – KHÔNG sửa tay. */
self.SPK_IDX = {"ask-directions":{"g":"travel","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"cafe":{"g":"food","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"cinema-tickets":{"g":"leisure","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"emergency-room":{"g":"health","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"flat-viewing":{"g":"housing","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"gym-signup":{"g":"services","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"landlord-repair":{"g":"housing","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"lost-luggage":{"g":"travel","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"noisy-neighbour":{"g":"housing","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"party-invite":{"g":"social","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"phone-plan":{"g":"services","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"police-report":{"g":"services","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"shop-return":{"g":"shopping","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"tour-booking":{"g":"travel","c":"B2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"}};
self.SPK_fill = function SPK_fill(base, arr, lang) {
  let i = 0;
  const w = o => {
    if (Array.isArray(o)) return o.map(w);
    if (!o || typeof o !== 'object') return o;
    const k = Object.keys(o);
    if (k.length === 1 && k[0] === 'en' && typeof o.en === 'string') { const v = arr[i++], r = { en: o.en }; if (typeof v === 'string') r[lang] = v; return r; }
    const r = {}; for (const x of k) r[x] = w(o[x]); return r;
  };
  return w(base);
};
