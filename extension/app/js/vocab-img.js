/* Ảnh minh họa từ vựng theo NGHĨA (dual coding) – tải lười, KHÔNG nằm trong khung app (shell +0 byte).
 * Nguồn: kho từ vựng một nguồn → content/lexicon/img.json → build-lexicon → js/lexicon-img.json v2 {v:2, base, sv, m:{từ#loại: h}, x:[khóa có @2x]}
 * (bản chép add-on: extension/app/js/). Mọi bề mặt (thẻ từ, SRS, câu đố, tra từ, thẻ tab mới add-on, trang tĩnh /words/) gọi VImg.* – không tự giữ bản sao.
 * Cờ: config công khai `vocab_img` (Quản trị › Cài đặt, mặc định TẮT) hoặc localStorage 'lk.vimg' = '1' (thử). Tắt → mọi hàm trả rỗng, không tải gì.
 * Ảnh: media.lexkite.com/vimg/<h>.avif + <h>.webp (384 px, ≤ 6 KB, immutable); <h>@2x.* (768 px) chỉ khi mục img.json có x2 = true
 * VÀ bề mặt hiển thị rộng hơn 192 px CSS. <picture> AVIF → WebP, <img lazy async crossorigin> trong hộp CỐ ĐỊNH (vuông, rộng theo bề mặt) → CLS = 0.
 * Hộp chỉ được chèn khi chỉ mục ĐÃ về (VImg.ready()) và nghĩa có ảnh – slot() đồng bộ, không bao giờ chèn hộp rỗng rồi đổi cỡ.
 * SW lưu khi xem (lk-vimg, LRU 800). alt = từ + nghĩa theo ngôn ngữ giao diện (người gọi truyền gloss đã dịch – từ gói nghĩa 15 ngôn ngữ). */
(function (g) {
  // cùng quy tắc normPos của scripts/lexicon/lib.mjs (+ tên loại từ tiếng Việt của thẻ người dùng)
  const POS = p => { p = String(p || '').toLowerCase().trim(); return /^(n|noun)\b|^danh/.test(p) ? 'n' : /^(phr ?v|phrasal)|^cụm động/.test(p) ? 'phrv' : /^(v|verb)\b|^động/.test(p) ? 'v' : /^adj|^tính/.test(p) ? 'adj' : /^adv|^trạng/.test(p) ? 'adv' : p; };
  const KEY = (w, pos) => String(w || '').trim().toLowerCase() + '#' + POS(pos);
  let idx = null, loading = null;
  // 1 = bật, 0 = tắt, -1 = TỰ ĐỘNG theo chỉ mục (on = đủ ≥ 150 ảnh đã qua giám khảo – build-lexicon). Ghi đè: localStorage lk.vimg, rồi config vocab_img true/false.
  function mode() {
    try { const f = localStorage.getItem('lk.vimg'); if (f === '1') return 1; if (f === '0') return 0; } catch (e) { /* bỏ qua */ }
    try { const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.vocab_img; if (v === true) return 1; if (v === false) return 0; } catch (e) { /* bỏ qua */ }
    return -1;
  }
  function enabled() { const m = mode(); return m === 1 || (m === -1 && !!(idx && idx.on)); }
  const src = (typeof document !== 'undefined' && document.currentScript && document.currentScript.src) || '';
  function load() {
    if (idx) return Promise.resolve(idx);
    if (!loading) {
      const base = src || (g.location && g.location.href) || '';
      const u = new URL('lexicon-img.json', /\/js\//.test(base) ? base : new URL('js/', base)).href;
      loading = fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => (idx = { on: !!(j && j.on), base: (j && j.base) || '', m: (j && j.m) || {}, x: new Set((j && j.x) || []), w: new Set((j && j.w) || []) }));
    }
    return loading;
  }
  /** Tải trước chỉ mục (cờ bật) → Promise<VImg | null>. Bề mặt chờ ready() rồi mới vẽ để slot() có hộp ngay từ lần vẽ đầu. */
  const ready = () => (mode() === 0 ? Promise.resolve(null) : load().then(() => (enabled() ? api : null)));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** Markup thuần (dùng chung app/add-on/trang tĩnh build-seo-pages): hộp vuông rộng w px CSS cố định, 2x chỉ khi x2 và w > 192; noAvif → chỉ WebP (AVIF 404 sẽ không tự lùi về <img>). */
  function pic(base, h, x2, alt, w, noAvif) {
    const W = Math.max(32, Math.round(+w || 160)), u = esc(base + h), two = !!x2 && W > 192;
    return `<span class="vimg" style="display:block;width:${W}px;max-width:100%;aspect-ratio:1/1;margin:0 auto;flex:none"><picture>`
      + (noAvif ? '' : `<source type="image/avif" srcset="${u}.avif${two ? `, ${u}@2x.avif 2x` : ''}">`)
      + `<img src="${u}.webp"${two ? ` srcset="${u}.webp 1x, ${u}@2x.webp 2x"` : ''} width="${W}" height="${W}" alt="${esc(alt || '')}" loading="lazy" decoding="async" crossorigin="anonymous" style="display:block;width:100%;height:100%;object-fit:contain">`
      + '</picture></span>';
  }
  const altOf = (word, gloss) => (gloss ? `${word} – ${gloss}` : String(word));
  /** Đồng bộ: '' khi cờ tắt / chỉ mục chưa về / nghĩa không có ảnh (đúng từ#loại – không lấy ảnh của loại từ khác). w = rộng CSS của bề mặt. */
  function slot(word, pos, gloss, w) {
    if (!idx || !enabled()) return '';
    const k = KEY(word, pos), h = idx.m[k];
    return h ? pic(idx.base, h, idx.x.has(k), altOf(word, gloss), typeof w === 'object' && w ? w.w : w, idx.w.has(k)) : '';
  }
  const has = (word, pos) => !!(idx && enabled() && idx.m[KEY(word, pos)]);
  /** → Promise<{ url (webp), avif, url2x?, alt, key, x2 } | null> */
  function get(word, pos, gloss) {
    if (mode() === 0) return Promise.resolve(null);
    const k = KEY(word, pos);
    return load().then(j => { if (!enabled()) return null; const h = j.m[k]; if (!h) return null; const u = j.base + h, x2 = j.x.has(k); return { url: u + '.webp', avif: j.w.has(k) ? '' : u + '.avif', url2x: x2 ? u + '@2x.webp' : '', alt: altOf(word, gloss), key: k, x2 }; });
  }
  const api = { enabled, mode, ready, get, slot, has, pic, key: KEY, pos: POS, _reset: () => { idx = null; loading = null; } };
  g.VImg = api;
})(typeof self !== 'undefined' ? self : this);
