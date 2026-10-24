/* Ảnh minh họa từ vựng theo NGHĨA (dual coding) – tải lười, KHÔNG nằm trong khung app (shell +0 byte).
 * Nguồn: kho từ vựng một nguồn → content/lexicon/img.json → build-lexicon → js/lexicon-img.json v2 {v:2, base, sv, m:{từ#loại: h}, x:[khóa có @2x]}
 * (bản chép add-on: extension/app/js/). Mọi bề mặt (thẻ từ, SRS, câu đố, tra từ, thẻ tab mới add-on, trang tĩnh /words/) gọi VImg.* – không tự giữ bản sao.
 * Cờ: config công khai `vocab_img` (Quản trị › Cài đặt, mặc định TẮT) hoặc localStorage 'lk.vimg' = '1' (thử). Tắt → mọi hàm trả rỗng, không tải gì.
 * Ảnh: media.lexkite.com/vimg/<h>.avif + <h>.webp (384 px, ≤ 6 KB, immutable); <h>@2x.* (768 px) chỉ khi mục img.json có x2 = true
 * VÀ bề mặt hiển thị rộng hơn 192 px CSS. <picture> AVIF → WebP, <img lazy async crossorigin> trong hộp CỐ ĐỊNH (vuông, rộng theo bề mặt) → CLS = 0.
 * Hộp chỉ được chèn khi chỉ mục ĐÃ về (VImg.ready()) và nghĩa có ảnh – slot() đồng bộ, không bao giờ chèn hộp rỗng rồi đổi cỡ.
 * Quy tắc tích hợp (docs/LEXICON.md § Quy tắc tích hợp hình): cỡ theo VAI bề mặt (SIZE), hiện sau decode() + mờ dần 150 ms (giảm chuyển động → không mờ),
 * tệp CDN thiếu → hộp ẩn (giữ chỗ: CLS 0, không icon vỡ), chế độ tối chỉ hiện ảnh nền trong suốt (a) hoặc ảnh chụp, ảnh CẢNH luôn kèm câu ví dụ (s), tiết kiệm dữ liệu/2g → tắt,
 * máy yếu (≤ 2 GB) → không @2x, tải trước ảnh 3 thẻ kế lúc rảnh (prefetch). SW lưu khi xem (lk-vimg, LRU 800). alt = từ + nghĩa theo ngôn ngữ giao diện (người gọi truyền gloss đã dịch – từ gói nghĩa 15 ngôn ngữ). */
(function (g) {
  // cùng quy tắc normPos của scripts/lexicon/lib.mjs (+ tên loại từ tiếng Việt của thẻ người dùng)
  const POS = p => { p = String(p || '').toLowerCase().trim(); return /^(n|noun)\b|^danh/.test(p) ? 'n' : /^(phr ?v|phrasal)|^cụm động/.test(p) ? 'phrv' : /^(v|verb)\b|^động/.test(p) ? 'v' : /^adj|^tính/.test(p) ? 'adj' : /^adv|^trạng/.test(p) ? 'adv' : p; };
  const KEY = (w, pos) => String(w || '').trim().toLowerCase() + '#' + POS(pos);
  let idx = null, loading = null;
  // 1 = bật, 0 = tắt, -1 = TỰ ĐỘNG theo chỉ mục (on = đủ ≥ 150 ảnh đã qua giám khảo – build-lexicon). Ghi đè: localStorage lk.vimg, rồi config vocab_img true/false.
  const nav = (typeof navigator !== 'undefined' && navigator) || {};
  const conn = nav.connection || {};
  const lean = () => !!conn.saveData || /(^|-)2g$/.test(String(conn.effectiveType || ''));   // tiết kiệm dữ liệu / mạng 2g → tắt ảnh
  const low = () => +nav.deviceMemory > 0 && +nav.deviceMemory <= 2;                       // máy yếu → ảnh nhỏ (không @2x)
  // VAI bề mặt → cỡ CSS cố định (một nguồn): thẻ học 120 · mặt sau ôn 128 · phản hồi câu đố 64 · tra từ 160 · trang /words/ 256
  const SIZE = { card: 120, back: 128, quiz: 64, dict: 160, words: 256 };
  function mode() {
    if (lean()) return 0;
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
      loading = fetch(u).then(r => (r.ok ? r.json() : null)).catch(() => null).then(j => (idx = { on: !!(j && j.on), base: (j && j.base) || '', m: (j && j.m) || {}, x: new Set((j && j.x) || []), w: new Set((j && j.w) || []), a: new Set((j && j.a) || []), s: new Set((j && j.s) || []), p: (j && j.p) || {}, pw: new Set((j && j.pw) || []) }));
    }
    return loading;
  }
  /** Tải trước chỉ mục (cờ bật) → Promise<VImg | null>. Bề mặt chờ ready() rồi mới vẽ để slot() có hộp ngay từ lần vẽ đầu. */
  const ready = () => (mode() === 0 ? Promise.resolve(null) : load().then(() => (enabled() ? api : null)));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  /** Markup thuần (dùng chung app/add-on/trang tĩnh build-seo-pages): hộp vuông rộng w px CSS cố định (số hoặc vai SIZE), 2x chỉ khi x2 và w > 192 (máy yếu: không);
   *  noAvif → chỉ WebP (AVIF 404 sẽ không tự lùi về <img>); o.a = nền trong suốt/ảnh chụp (hiện cả ở chế độ tối); o.ex = câu ví dụ hiện NGAY DƯỚI ảnh cảnh. */
  function pic(base, h, x2, alt, w, noAvif, o) {
    o = o || {}; w = SIZE[w] || w;
    const W = Math.max(32, Math.round(+w || 160)), u = esc(base + h), two = !!x2 && W > 192 && !low();
    return `<span class="vimg" style="display:block;width:${W}px;max-width:100%;aspect-ratio:1/1;margin:0 auto;flex:none;border-radius:var(--radius-sm,12px);overflow:hidden"${o.a ? ' data-a="1"' : ''}><picture>`
      + (noAvif ? '' : `<source type="image/avif" srcset="${u}.avif${two ? `, ${u}@2x.avif 2x` : ''}">`)
      + `<img src="${u}.webp"${two ? ` srcset="${u}.webp 1x, ${u}@2x.webp 2x"` : ''} width="${W}" height="${W}" alt="${esc(alt || '')}" loading="lazy" decoding="async" crossorigin="anonymous" style="display:block;width:100%;height:100%;object-fit:contain">`
      + '</picture></span>' + (o.ex ? `<span class="vimg-ex" style="display:block;max-width:${Math.max(W, 220)}px;margin:.35rem auto 0;font-size:.85em;line-height:1.35;text-align:center;opacity:.85">${esc(o.ex)}</span>` : '');
  }
  const altOf = (word, gloss) => (gloss ? `${word} – ${gloss}` : String(word));
  /** Đồng bộ: '' khi cờ tắt / chỉ mục chưa về / nghĩa không có ảnh (đúng từ#loại – không lấy ảnh của loại từ khác).
   *  w = px CSS, vai (SIZE) hoặc {w, photo}: photo = true CHỈ ở trang từ điển (tra từ) – ưu tiên ảnh Wikimedia (p) rồi mới tới icon/minh họa (m); thẻ học không bao giờ lấy p.
   *  ex = câu ví dụ của NGHĨA đang dạy: ảnh CẢNH (khóa trong s) chỉ hiện khi có câu (luôn hiện câu dưới ảnh), không có câu → không hộp. */
  function slot(word, pos, gloss, w, ex) {
    if (!idx || !enabled()) return '';
    const o = typeof w === 'object' && w ? w : { w }, k = KEY(word, pos), ph = o.photo ? idx.p[k] : '';
    if (ph) return pic(idx.base, ph, false, altOf(word, gloss), o.w, idx.pw.has(k), { a: true });
    const h = idx.m[k]; if (!h) return '';
    const scene = idx.s.has(k); if (scene && !ex) return '';
    return pic(idx.base, h, idx.x.has(k), altOf(word, gloss), o.w, idx.w.has(k), { a: idx.a.has(k), ex: scene ? String(ex) : '' });
  }
  /** tải trước ảnh của vài thẻ kế tiếp lúc RẢNH (không chặn tương tác): list = [[từ, loại], …] (≤ 3) */
  function prefetch(list) {
    if (!idx || !enabled() || typeof Image === 'undefined') return;
    const run = () => (list || []).slice(0, 3).forEach(([wd, ps]) => { const h = idx.m[KEY(wd, ps)]; if (h) { const im = new Image(); im.decoding = 'async'; im.crossOrigin = 'anonymous'; im.src = idx.base + h + '.webp'; } });
    (g.requestIdleCallback ? g.requestIdleCallback(run, { timeout: 2000 }) : setTimeout(run, 300));
  }
  // hiện sau decode() + mờ 150 ms; lỗi tải (CDN thiếu tệp / mạng) → ẨN hộp, GIỮ chỗ (không icon vỡ, CLS 0 – gỡ hộp sẽ làm xê dịch bố cục).
  // Chế độ tối: ảnh nền kem (không data-a) không hiện (display:none áp từ đầu → không xê dịch).
  const D = g.document && g.document.documentElement ? g.document : null;
  if (D && D.addEventListener && !D.__vimg) {
    D.__vimg = 1;
    try {
      const st = D.createElement('style');
      st.textContent = '.vimg-js .vimg img{opacity:0;transition:opacity .15s ease}.vimg-js .vimg img.on{opacity:1}.vimg.gone{visibility:hidden}'
        + '@media (prefers-reduced-motion:reduce){.vimg-js .vimg img{transition:none}}'
        + ':root[data-theme="dark"] .vimg:not([data-a]){display:none}@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .vimg:not([data-a]){display:none}}';
      (D.head || D.documentElement).appendChild(st); D.documentElement.classList.add('vimg-js');
    } catch (e) { /* bỏ qua */ }
    const show = i => { i.classList.add('on'); };
    D.addEventListener('load', e => { const i = e.target; if (i && i.tagName === 'IMG' && i.closest && i.closest('.vimg')) (i.decode ? i.decode().then(() => show(i), () => show(i)) : show(i)); }, true);
    D.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.closest) { const b = t.closest('.vimg'); if (b) b.classList.add('gone'); } }, true);
  }
  const has = (word, pos) => !!(idx && enabled() && idx.m[KEY(word, pos)]);
  /** → Promise<{ url (webp), avif, url2x?, alt, key, x2 } | null> */
  function get(word, pos, gloss) {
    if (mode() === 0) return Promise.resolve(null);
    const k = KEY(word, pos);
    return load().then(j => { if (!enabled()) return null; const h = j.m[k]; if (!h) return null; const u = j.base + h, x2 = j.x.has(k); return { url: u + '.webp', avif: j.w.has(k) ? '' : u + '.avif', url2x: x2 ? u + '@2x.webp' : '', alt: altOf(word, gloss), key: k, x2 }; });
  }
  const api = { enabled, mode, ready, get, slot, has, pic, prefetch, SIZE, key: KEY, pos: POS, _reset: () => { idx = null; loading = null; } };
  g.VImg = api;
})(typeof self !== 'undefined' ? self : this);
