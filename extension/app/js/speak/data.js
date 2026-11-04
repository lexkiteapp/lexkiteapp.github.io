/* TỰ SINH bởi scripts/speak/build.mjs từ content/situations/*.json – KHÔNG sửa tay. */
self.SPK_IDX = {"cafe":{"g":"food","c":"A2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"client-complaint":{"g":"work","c":"B2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"deadline-extension":{"g":"work","c":"B2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"group-project":{"g":"study","c":"B2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"it-helpdesk":{"g":"work","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"job-interview":{"g":"work","c":"B2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"library":{"g":"study","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"office-hours":{"g":"study","c":"B2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"office-intro":{"g":"work","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"presentation-qa":{"g":"work","c":"B2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"salary-talk":{"g":"work","c":"B2","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"team-meeting":{"g":"work","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"university-enrol":{"g":"study","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"},"video-call-tech":{"g":"work","c":"B1","l":"vi es pt fr de id th zh ja ko hi ar ru tr"}};
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
