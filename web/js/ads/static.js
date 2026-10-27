/* Quảng cáo trên trang tĩnh (blog / trang từ điển) – chỉ được build-blog.mjs / scripts/dict/build.mjs chèn khi ADS_CONFIG bật + có mã ô 'blog' / 'blog_mid' / 'dict' (docs/ADS.md §1).
 * Ô kích thước cố định đã có sẵn trong HTML (0 CLS). Script này: đọc cờ từ xa (/api/config, đệm 1 giờ chung với app) → tải policy + run
 * lúc rảnh; cờ tắt / công tắc khẩn cấp / lớp học → ô giữ nguyên chỗ nhưng trống (không xê dịch bố cục). */
(function (g) {
  const d = document, ls = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const cfg = () => { try { const c = JSON.parse(ls('lk.cfg') || 'null'); if (c && Date.now() - c.at < 3600e3) return Promise.resolve(c.v); } catch (e) { /* bỏ qua */ } return fetch('/api/config').then(r => (r.ok ? r.json() : {})).then(v => { try { localStorage.setItem('lk.cfg', JSON.stringify({ at: Date.now(), v })); } catch (e) { /* bỏ qua */ } return v; }); };
  const one = src => new Promise((y, n) => { const s = d.createElement('script'); s.src = src; s.onload = y; s.onerror = n; d.head.appendChild(s); });
  const go = () => cfg().then(v => {
    if (!v || v.ads_kill === '1' || v.ads_web !== '1' || ls('lk.edu') === '1' || ls('lk.u13') === '1') return;
    return one('/js/ads/config.js').then(() => one('/js/ads/policy.js')).then(() => one('/js/ads/run.js')).then(() => g.AdsRun && g.AdsRun.start());
  }).catch(() => {});
  g.addEventListener('load', () => (g.requestIdleCallback || setTimeout)(go, 3000));
})(self);
