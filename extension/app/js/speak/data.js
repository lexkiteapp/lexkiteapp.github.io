/* TỰ SINH bởi scripts/speak/build.mjs từ content/situations/*.json – KHÔNG sửa tay. */
self.SPK_IDX = {"bank":{"g":"money","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"cafe":{"g":"food","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"dentist":{"g":"health","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"hairdresser":{"g":"services","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"pharmacy":{"g":"health","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"post-office":{"g":"services","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"restaurant-order":{"g":"food","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"supermarket":{"g":"shopping","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"taxi":{"g":"transport","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"}};
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
