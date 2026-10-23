/* Ảnh minh hoạ từ vựng theo NGHĨA (dual coding) – tải lười, KHÔNG nằm trong khung app (shell +0 byte).
 * Nguồn: kho từ vựng một nguồn → content/lexicon/img.json → build-lexicon → js/lexicon-img.json (bản chép add-on: extension/app/js/).
 * Mọi bề mặt (thẻ từ, SRS, câu đố, tra từ, add-on, thẻ tab mới) gọi VImg.* – không tự giữ bản sao.
 * Cờ: config công khai `vocab_img` (Quản trị › Cài đặt, mặc định TẮT) hoặc localStorage 'lk.vimg' = '1' (thử). Tắt → mọi hàm trả rỗng, không tải gì.
 * Ảnh: media.lexkite.com/vimg/<h>.webp (384 px, ~12 KB, immutable), <img loading="lazy" decoding="async">; SW lưu khi xem (lk-vimg, trần VIMG_MAX).
 * alt = từ + nghĩa theo ngôn ngữ giao diện (người gọi truyền gloss đã dịch – từ gói nghĩa 15 ngôn ngữ). */
(function (g) {
  const KEY = (w, pos) => String(w || '').trim().toLowerCase() + '#' + String(pos || '').trim();
  let idx = null, loading = null;
  function enabled() {
    try { if (localStorage.getItem('lk.vimg') === '1') return true; if (localStorage.getItem('lk.vimg') === '0') return false; } catch (e) { /* bỏ qua */ }
    try { const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'); return !!(c && c.v && c.v.vocab_img === true); } catch (e) { return false; }
  }
  function load() {
    if (idx) return Promise.resolve(idx);
    if (!loading) {
      const base = (document.currentScript && document.currentScript.src) || (g.location && g.location.href) || '';
      const u = new URL('lexicon-img.json', /\/js\//.test(base) ? base : new URL('js/', base)).href;
      loading = fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => (idx = j && j.m ? j : { m: {}, base: '' }));
    }
    return loading;
  }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** → Promise<{ url, alt, key } | null> */
  function get(word, pos, gloss) {
    if (!enabled()) return Promise.resolve(null);
    const k = KEY(word, pos);
    return load().then(j => { const h = j.m[k]; return h ? { url: j.base + h + '.webp', alt: gloss ? `${word} – ${gloss}` : String(word), key: k } : null; });   // đúng nghĩa (từ#loại) – không lấy ảnh của loại từ khác
  }
  /** chỗ giữ chỗ đồng bộ: <span data-vimg="từ#loại" data-alt="…"> → fill(root) thay bằng <img> khi có ảnh */
  const slot = (word, pos, gloss) => (enabled() ? `<span class="vimg" data-vimg="${esc(KEY(word, pos))}" data-alt="${esc(gloss ? word + ' – ' + gloss : word)}"></span>` : '');
  function fill(root) {
    if (!enabled()) return Promise.resolve(0);
    const els = (root || document).querySelectorAll('[data-vimg]:not([data-vimg-done])'); if (!els.length) return Promise.resolve(0);
    return load().then(j => {
      let n = 0;
      els.forEach(el => {
        el.setAttribute('data-vimg-done', '1'); const h = j.m[el.getAttribute('data-vimg')]; if (!h) return;
        el.innerHTML = `<img src="${esc(j.base + h + '.webp')}" alt="${esc(el.getAttribute('data-alt') || '')}" width="192" height="192" loading="lazy" decoding="async" crossorigin="anonymous">`; n++;
      });
      return n;
    });
  }
  g.VImg = { enabled, get, slot, fill, key: KEY, _reset: () => { idx = null; loading = null; } };
})(typeof self !== 'undefined' ? self : this);
